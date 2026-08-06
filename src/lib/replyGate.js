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

export function initialState() {
  return { step: "idle", template: "", verifiedFor: "", dry: null, error: "", result: null };
}

export function reduce(state, event) {
  switch (event.type) {
    case "template":
      // Any change of template revokes the verification, including re-picking
      // the same key — a fresh pick means a fresh look.
      return { ...initialState(), step: event.key ? "picked" : "idle", template: event.key || "" };

    case "checking":
      return { ...state, step: "checking", dry: null, error: "", result: null };

    case "checked": {
      if (!event.ok) {
        return { ...state, step: "failed", error: event.error || "unknown", verifiedFor: "" };
      }
      const payload = event.payload || {};
      if (payload.reason === "already_sent") {
        return { ...state, step: "already_sent", dry: payload, error: "", verifiedFor: "" };
      }
      // Fail closed: only an explicit dry_run acknowledgement licenses a send.
      if (payload.dry_run !== true) {
        return {
          ...state,
          step: "failed",
          error: "התשובה אינה הרצה יבשה מאושרת",
          verifiedFor: "",
        };
      }
      return { ...state, step: "verified", dry: payload, error: "", verifiedFor: state.template };
    }

    case "sending":
      return { ...state, step: "sending", error: "" };

    case "sent":
      return event.ok
        ? { ...state, step: "sent", result: event.payload || {}, error: "", verifiedFor: "" }
        : { ...state, step: "failed", error: event.error || "unknown", verifiedFor: "" };

    default:
      return state;
  }
}

export function canCheck(state) {
  return !!state.template && state.step !== "checking" && state.step !== "sending";
}

export function canSend(state) {
  return state.step === "verified" && !!state.template && state.verifiedFor === state.template;
}

// Pass-through by design. A template added to api/notify.js must reach the
// picker without a second edit here — a client-side allowlist would reintroduce
// the drift the GET endpoint exists to remove, in the opposite direction.
export function templatesFrom(json) {
  return Array.isArray(json?.templates) ? json.templates : [];
}
