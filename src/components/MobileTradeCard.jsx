import { memo } from "react";
import { MessageCircle } from "lucide-react";
import TickerLogo from "./TickerLogo";
import { calcTradeMetrics, fmt$, fmtR } from "../utils";

function MobileTradeCardImpl({
  trade,
  onClick,
  onClose,
  onDelete,
  isSelected,
  onToggleSelect,
  mentorNotes,
  isRTL,
}) {
  const { pnl, rMultiple } = calcTradeMetrics(trade);
  const isOpen = trade.status === "OPEN";
  const win = !isOpen && pnl > 0;

  const sideClasses = trade.side === "LONG"
    ? "bg-[#00C076]/10 text-[#00C076] border border-[#00C076]/20"
    : "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20";

  const pnlColorClass = isOpen
    ? "text-slate-500"
    : win ? "text-[#00C076]" : "text-[#F43F5E]";

  const borderStartClass = isOpen
    ? "border-s-[#06b6d4]/40"
    : win ? "border-s-[#00C076]" : "border-s-[#F43F5E]";

  const rColorClass = rMultiple >= 0 ? "text-[#06b6d4]" : "text-[#F43F5E]";

  const hasActions = Boolean(onClose || onDelete);
  const hasCheckbox = typeof isSelected === "boolean";

  const handleCardClick = (e) => {
    if (e.target.closest("[data-card-noclick]")) return;
    onClick?.(trade);
  };

  return (
    <article
      onClick={onClick ? handleCardClick : undefined}
      className={`relative bg-[var(--v3-bg-panel)] border border-[var(--v3-line)] rounded-xl py-3 px-4 flex flex-col gap-2 border-s-[3px] ${borderStartClass} ${onClick ? "cursor-pointer active:opacity-80 transition-opacity" : ""} ${isSelected ? "bg-[#06b6d4]/[0.06]" : ""}`}
    >
      <div className="flex items-center gap-2">
        {hasCheckbox && (
          <input
            data-card-noclick
            type="checkbox"
            aria-label={isRTL ? "בחר עסקה" : "Select trade"}
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onToggleSelect?.(trade.id, e.target.checked)}
            className="w-3.5 h-3.5 rounded border border-white/20 bg-white/5 accent-[var(--v3-info)]"
          />
        )}
        <TickerLogo ticker={trade.ticker} size={18} />
        <span className="font-bold font-mono text-[var(--v3-text-hi)]">{trade.ticker}</span>
        {trade.isDemo && (
          <span className="text-[10px] bg-slate-700 text-slate-400 px-1 py-0.5 rounded font-normal">DEMO</span>
        )}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sideClasses}`}>
          {trade.side}
        </span>
        <span className="ms-auto text-[11px] font-mono text-[var(--v3-text-lo)]">{trade.date}</span>
      </div>

      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-slate-300">${trade.entry}</span>
        <span className="text-[var(--v3-text-lo)]">→</span>
        <span className="text-slate-300">{trade.exit ? `$${trade.exit}` : "–"}</span>
        <span className={`ms-auto font-bold text-sm ${pnlColorClass}`}>
          {isOpen ? "OPEN" : fmt$(Math.round(pnl))}
        </span>
        {!isOpen && rMultiple != null && (
          <span className={`text-[11px] ${rColorClass}`}>{fmtR(rMultiple)}</span>
        )}
      </div>

      {(trade.setup || (mentorNotes && mentorNotes.length > 0)) && (
        <div className="flex flex-col gap-1">
          {trade.setup && (
            <span className="self-start text-[10px] px-2 py-0.5 rounded bg-[#A78BFA]/10 text-[var(--v3-purple)] border border-[#A78BFA]/20 whitespace-nowrap">
              {trade.setup}
            </span>
          )}
          {(mentorNotes || []).map((n) => (
            <div key={n.id} className="flex items-start gap-1 text-[10px] leading-snug text-[var(--v3-accent)] bg-[var(--v3-accent-glow)] border border-[var(--v3-accent)]/20 rounded px-1.5 py-1 whitespace-normal break-words">
              <MessageCircle size={10} className="mt-0.5 shrink-0" />
              <span className="break-words">{n.note}</span>
            </div>
          ))}
        </div>
      )}

      {hasActions && (
        <div
          data-card-noclick
          className="flex items-center gap-1.5 pt-2 border-t border-[var(--v3-line)]/60"
          onClick={(e) => e.stopPropagation()}
        >
          {isOpen && onClose && (
            <button
              onClick={() => onClose(trade)}
              className="text-[10px] px-2 py-1 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] hover:opacity-80 transition"
            >
              Close
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(trade.id)}
              className="ms-auto text-[10px] px-1.5 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition"
              title={isRTL ? "מחיקה" : "Delete"}
              aria-label={isRTL ? "מחיקה" : "Delete"}
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default memo(MobileTradeCardImpl);
