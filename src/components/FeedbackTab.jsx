import { useState, useRef, useId } from "react";
import emailjs from "@emailjs/browser";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Heart,
  HelpCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { getTranslations, isRTLLang, LANGUAGES } from "../i18n.js";

const EMAILJS_SERVICE_ID = "service_jxkivjs";
const EMAILJS_TEMPLATE_ID = "template_q0u4f7c";
const EMAILJS_PUBLIC_KEY = "ZAh-yUGwSDqZztQOE";

const MAX_LEN = 2000;
const COUNTER_THRESHOLD = 1700; // show the counter only when near the limit

// Injected by Vite (see vite.config.js `define`); falls back in raw dev.
const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const FEEDBACK_TYPES = [
  { value: "bug", Icon: Bug, labelKey: "fb_type_bug" },
  { value: "idea", Icon: Lightbulb, labelKey: "fb_type_idea" },
  { value: "love", Icon: Heart, labelKey: "fb_type_love" },
  { value: "question", Icon: HelpCircle, labelKey: "fb_type_question" },
];

// Map a tab id (from the app shell) to its i18n label key.
const TAB_LABEL_KEYS = {
  dashboard: "dashboard",
  journal: "journal",
  tools: "tools",
  analytics: "analytics",
  intel: "marketIntel",
  feedback: "feedback",
  notebook: "notebookTab",
  weeklyReview: "weeklyReviewTab",
  settings: "settings",
};

function parseUA() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  let browser = "Unknown";
  let m;
  if ((m = ua.match(/Edg\/(\d+)/))) browser = `Edge ${m[1]}`;
  else if ((m = ua.match(/OPR\/(\d+)/))) browser = `Opera ${m[1]}`;
  else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua))
    browser = `Chrome ${ua.match(/Chrome\/(\d+)/)[1]}`;
  else if ((m = ua.match(/Version\/(\d+)[.\d]* Safari/))) browser = `Safari ${m[1]}`;
  else if ((m = ua.match(/Firefox\/(\d+)/))) browser = `Firefox ${m[1]}`;

  let os = "Unknown";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os };
}

export default function FeedbackTab({ user, lang = "he", originTab = "dashboard" }) {
  const t = getTranslations(lang);
  const isRTL = isRTLLang(lang);
  const uid = useId();

  const [selectedType, setSelectedType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [attachContext, setAttachContext] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null); // { msg, detail }
  const [sent, setSent] = useState(false);

  const radioRefs = useRef([]);
  const successRef = useRef(null);

  // Context values — shown verbatim to the user and attached on submit.
  const { browser, os } = parseUA();
  const screenLabel = t[TAB_LABEL_KEYS[originTab]] || originTab;
  const browserLabel = `${browser} · ${os}`;
  const langName = LANGUAGES.find((l) => l.code === lang)?.nativeName || lang;
  const viewport =
    typeof window !== "undefined"
      ? `${window.innerWidth}×${window.innerHeight}`
      : "";

  const contextItems = [
    { key: "fb_ctx_app_version", value: `v${APP_VERSION}` },
    { key: "fb_ctx_screen", value: screenLabel },
    { key: "fb_ctx_browser", value: browserLabel },
    { key: "fb_ctx_language", value: langName },
    { key: "fb_ctx_viewport", value: viewport },
  ];

  const remaining = MAX_LEN - feedbackText.length;
  const showCounter = feedbackText.length >= COUNTER_THRESHOLD;

  const onTypeKeyDown = (e, index) => {
    const count = FEEDBACK_TYPES.length;
    const forward = isRTL ? -1 : 1;
    let next = null;
    switch (e.key) {
      case "ArrowRight":
        next = index + forward;
        break;
      case "ArrowLeft":
        next = index - forward;
        break;
      case "ArrowDown":
        next = index + 1;
        break;
      case "ArrowUp":
        next = index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    next = (next + count) % count;
    setSelectedType(FEEDBACK_TYPES[next].value);
    radioRefs.current[next]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = feedbackText.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);

    const ctx = attachContext
      ? {
          app_version: APP_VERSION,
          screen: screenLabel,
          browser: browserLabel,
          locale: lang,
          viewport,
        }
      : null;

    const footer = ctx
      ? `\n\n— context —\napp v${ctx.app_version} · screen: ${ctx.screen} · ${ctx.browser} · lang: ${ctx.locale} · ${ctx.viewport}`
      : "";

    const payload = {
      user_id: user?.id || null,
      user_email: user?.email || "anonymous",
      type: selectedType,
      message: message + footer,
    };

    let supabaseOk = false;
    let emailOk = false;
    let detail = "";

    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        supabaseOk = true;
      } else if (resp.status === 429) {
        detail = t.fb_rate_limited;
      } else {
        const body = await resp.json().catch(() => null);
        detail = body?.error || resp.statusText;
      }
    } catch (err) {
      detail = err?.message || String(err);
    }

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          user_email: payload.user_email,
          type: selectedType,
          message,
          date: new Date().toLocaleString(),
          ...(ctx || {}),
        },
        EMAILJS_PUBLIC_KEY
      );
      emailOk = true;
    } catch (err) {
      if (!detail) detail = err?.message || String(err);
    }

    setSending(false);

    if (supabaseOk || emailOk) {
      setSent(true);
      setFeedbackText("");
      setSelectedType("bug");
      requestAnimationFrame(() => successRef.current?.focus());
    } else {
      setError({ msg: t.fb_error, detail });
    }
  };

  // ── Success state (replaces the form) ──────────────────────────────────────
  if (sent) {
    return (
      <div className="mx-auto w-full max-w-2xl animate-fade-in">
        <div className="rounded-2xl border border-[var(--border-subtle)] dark:border-white/[0.08] bg-[var(--bg-elevated)] dark:bg-[#0d1424]/60 p-8 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 ring-1 ring-emerald-500/25">
            <CheckCircle2
              size={30}
              strokeWidth={2}
              className="text-emerald-400"
              aria-hidden="true"
            />
          </div>
          <h2
            ref={successRef}
            tabIndex={-1}
            className="text-lg font-semibold text-[var(--text-primary)] focus:outline-none"
          >
            {t.fb_success}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-tertiary)]">
            {t.fb_success_sub}
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 dark:border-white/[0.12]"
          >
            {t.fb_send_another}
          </button>
        </div>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <MessageSquare size={20} className="text-emerald-400" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
            {t.fb_hero_title}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-tertiary)]">
            {t.fb_hero_body}
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        data-tour="feedback"
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-[var(--border-subtle)] dark:border-white/[0.08] bg-[var(--bg-elevated)] dark:bg-[#0d1424]/60 p-5 sm:p-6"
      >
        {/* Type — radiogroup */}
        <div>
          <label
            id={`${uid}-type`}
            className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]"
          >
            {t.fb_type_label}
          </label>
          <div
            role="radiogroup"
            aria-labelledby={`${uid}-type`}
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {FEEDBACK_TYPES.map((type, i) => {
              const active = selectedType === type.value;
              const Icon = type.Icon;
              return (
                <button
                  key={type.value}
                  ref={(el) => (radioRefs.current[i] = el)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelectedType(type.value)}
                  onKeyDown={(e) => onTypeKeyDown(e, i)}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/[0.08] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-white/20 hover:bg-white/[0.04] dark:border-white/[0.08]"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={2}
                    className={
                      active
                        ? "text-emerald-400"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                    }
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium">{t[type.labelKey]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div>
          <label
            htmlFor={`${uid}-text`}
            className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]"
          >
            {t.fb_describe}
          </label>
          <textarea
            id={`${uid}-text`}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={6}
            maxLength={MAX_LEN}
            placeholder={t.fb_placeholder}
            aria-describedby={`${uid}-help${showCounter ? ` ${uid}-counter` : ""}`}
            className="w-full resize-y rounded-xl border border-[var(--border-subtle)] dark:border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] transition placeholder:text-[var(--text-muted)] focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            required
          />
          <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px]">
            <span id={`${uid}-help`} className="text-[var(--text-muted)]">
              {t.fb_sent_to_team}
            </span>
            {showCounter && (
              <span
                id={`${uid}-counter`}
                aria-live="polite"
                className={`font-mono tabular-nums ${
                  remaining <= 0
                    ? "text-rose-400"
                    : remaining <= 300
                    ? "text-amber-400"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {t.fb_chars_remaining.replace("{n}", Math.max(0, remaining))}
              </span>
            )}
          </div>
        </div>

        {/* Context — privacy-transparent auto-attach */}
        <div className="rounded-xl border border-[var(--border-subtle)] dark:border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-3.5 py-3 dark:border-white/[0.06]">
            <ShieldCheck
              size={16}
              className="shrink-0 text-emerald-400/80"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {t.fb_context_title}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
                {t.fb_context_desc}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={attachContext}
              aria-label={t.fb_context_toggle}
              onClick={() => setAttachContext((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                attachContext ? "bg-emerald-500" : "bg-white/15"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  attachContext
                    ? "ltr:translate-x-4 rtl:-translate-x-4"
                    : "ltr:translate-x-0.5 rtl:-translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <dl
            className={`grid grid-cols-1 gap-x-5 gap-y-1.5 px-3.5 py-3 transition-opacity sm:grid-cols-2 ${
              attachContext ? "" : "opacity-40"
            }`}
          >
            {contextItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <dt className="text-[var(--text-muted)]">{t[item.key]}</dt>
                <dd className="truncate font-mono text-[var(--text-secondary)]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Sender */}
        {user?.email && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] dark:border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px]">
            <span className="text-[var(--text-muted)]">{t.fb_sent_from}</span>
            <span className="truncate font-mono text-emerald-300/90">
              {user.email}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-rose-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="leading-relaxed">{error.msg}</p>
              {error.detail && (
                <p className="mt-1 break-words font-mono text-[11px] text-rose-300/70">
                  {t.fb_error_detail}: {error.detail}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!feedbackText.trim() || sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={15} aria-hidden="true" />
            )}
            {sending ? t.fb_sending : t.fb_send}
          </button>
        </div>
      </form>
    </div>
  );
}
