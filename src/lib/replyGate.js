// The three-step gate on a feedback reply: pick a template → dry run → send.
//
// Pure and dependency-free ON PURPOSE. The invariant it carries — "send is
// unreachable until a clean dry run for THIS template" — is the human
// verification point the whole endpoint was built around (api/notify.js:113-117:
// feedback.user_email is caller-asserted on rows written before S2, so the
// masked address on screen is the last thing standing between an admin's click
// and a branded email to a stranger). An invariant that only exists inside JSX
// cannot be asserted in `verify`: AdminPanel.jsx pulls recharts, lucide and
// supabaseClient and will not load in node, and test:smoke does not block a push.
// Living here, it is covered by scripts/notify-handle-test.mjs.
//
// canSend keys on verifiedFor, not on a boolean flag: dry-running one template
// and sending another is the failure this shape makes unrepresentable rather
// than merely unlikely.
//
// ⚠️ 2026-08-08 — THE SAME ARGUMENT NOW APPLIES TO THE TEXT. Until the seven
// skeletons landed, a dry run verified a FILE: the template key was the whole
// identity of the letter, and the admin could read the file in the repo. Now the
// middle of the letter is a string the admin typed, so the key no longer
// identifies what will be delivered. verifiedBody carries the rest of it, and
// canSend requires BOTH to still match — otherwise the preview shows one letter
// and the send delivers another, which is the one failure this module exists for.

export function initialState() {
  return {
    step: "idle",
    template: "",
    verifiedFor: "",
    body: "",
    bodyRequired: false,
    verifiedBody: "",
    dry: null,
    error: "",
    result: null,
  };
}

export function reduce(state, event) {
  switch (event.type) {
    case "template":
      // Any change of template revokes the verification, including re-picking
      // the same key — a fresh pick means a fresh look. The core is cleared with
      // it: text written for "the bug is fixed" is not text for "we declined".
      return {
        ...initialState(),
        step: event.key ? "picked" : "idle",
        template: event.key || "",
        // Served by GET /api/notify. ⛔ The panel never decides this itself.
        bodyRequired: !!event.bodyRequired,
      };

    case "body": {
      const body = event.text || "";
      if (body === state.body) return state;
      // Mid-flight edits do not rewind the step — the request already left. The
      // verification is revoked either way, so the response cannot license it.
      const inFlight = state.step === "checking" || state.step === "sending";
      return {
        ...state,
        body,
        verifiedFor: "",
        verifiedBody: "",
        dry: inFlight ? state.dry : null,
        error: inFlight ? state.error : "",
        result: inFlight ? state.result : null,
        step: inFlight ? state.step : state.template ? "picked" : "idle",
      };
    }

    case "checking":
      return { ...state, step: "checking", dry: null, error: "", result: null };

    case "checked": {
      if (!event.ok) {
        return { ...state, step: "failed", error: event.error || "unknown", verifiedFor: "", verifiedBody: "" };
      }
      const payload = event.payload || {};
      if (payload.reason === "already_sent") {
        return { ...state, step: "already_sent", dry: payload, error: "", verifiedFor: "", verifiedBody: "" };
      }
      // Fail closed: only an explicit dry_run acknowledgement licenses a send.
      if (payload.dry_run !== true) {
        return {
          ...state,
          step: "failed",
          error: "התשובה אינה הרצה יבשה מאושרת",
          verifiedFor: "",
          verifiedBody: "",
        };
      }
      return {
        ...state,
        step: "verified",
        dry: payload,
        error: "",
        verifiedFor: state.template,
        // The letter the admin just read, pinned. Not payload.body_text: the
        // verification is of what THIS panel will send next, and that is state.body.
        verifiedBody: state.body,
      };
    }

    case "sending":
      return { ...state, step: "sending", error: "" };

    case "sent":
      return event.ok
        ? { ...state, step: "sent", result: event.payload || {}, error: "", verifiedFor: "", verifiedBody: "" }
        : { ...state, step: "failed", error: event.error || "unknown", verifiedFor: "", verifiedBody: "" };

    default:
      return state;
  }
}

// A dry run on an empty core is not a dry run of anything: the server rejects it
// with body_text_required, and the admin gets a red box instead of a preview.
// Blocking here turns a 400 into a disabled button.
export function canCheck(state) {
  if (!state.template) return false;
  if (state.bodyRequired && !state.body.trim()) return false;
  return state.step !== "checking" && state.step !== "sending";
}

export function canSend(state) {
  return (
    state.step === "verified" &&
    !!state.template &&
    state.verifiedFor === state.template &&
    state.verifiedBody === state.body
  );
}

// Pass-through by design. A template added to api/notify.js must reach the
// picker without a second edit here — a client-side allowlist would reintroduce
// the drift the GET endpoint exists to remove, in the opposite direction.
export function templatesFrom(json) {
  return Array.isArray(json?.templates) ? json.templates : [];
}
