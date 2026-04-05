// ─── LOCAL AI ENGINE ──────────────────────────────────────────────────────────
// Rule-based trade analysis. No external API required.
//
// Scoring logic:
//   - R/R > 2 AND stop distance < 3%  → GO
//   - R/R 1.5-2 OR stop distance 3-5%  → WAIT
//   - R/R < 1.5 OR stop distance > 5%  → SKIP

/**
 * Analyze a trade using local rules.
 * @param {object} p - { entry, stop, target, side, capital, shares? }
 * @returns {object} { recommendation, entry_score, stop_logic, rr_assessment, explanation, metrics }
 */
export const analyzeTradeLocal = (p) => {
  const entry = Number(p.entry) || 0;
  const stop = Number(p.stop) || 0;
  const target = Number(p.target) || 0;
  const side = p.side || "LONG";
  const capital = Number(p.capital) || 0;
  const shares = Number(p.shares) || 0;

  if (!entry || !stop) {
    return { error: "Missing entry or stop price." };
  }

  const riskPerShare = Math.abs(entry - stop);
  const rewardPerShare = target > 0 ? Math.abs(target - entry) : 0;
  const rr = riskPerShare > 0 && rewardPerShare > 0 ? rewardPerShare / riskPerShare : 0;
  const stopPct = entry > 0 ? (riskPerShare / entry) * 100 : 0;
  const dollarRisk = riskPerShare * shares;
  const portfolioRiskPct = capital > 0 && shares > 0 ? (dollarRisk / capital) * 100 : 0;

  // Sanity checks on stop direction
  let directionOk = true;
  if (side === "LONG" && stop >= entry) directionOk = false;
  if (side === "SHORT" && stop <= entry) directionOk = false;

  // Scoring
  let recommendation = "WAIT";
  let entry_score = 3;

  if (!directionOk) {
    recommendation = "SKIP";
    entry_score = 1;
  } else if (rr >= 2 && stopPct < 3) {
    recommendation = "GO";
    entry_score = rr >= 3 ? 5 : 4;
  } else if (rr >= 1.5 && stopPct <= 5) {
    recommendation = "WAIT";
    entry_score = 3;
  } else if (rr < 1.5 || stopPct > 5) {
    recommendation = "SKIP";
    entry_score = stopPct > 7 ? 1 : 2;
  }

  // Stop logic text
  let stop_logic;
  if (!directionOk) {
    stop_logic = side === "LONG"
      ? "Stop must be BELOW entry for LONG positions."
      : "Stop must be ABOVE entry for SHORT positions.";
  } else if (stopPct < 1.5) {
    stop_logic = `Tight stop (${stopPct.toFixed(2)}% from entry) — low risk, but watch for noise.`;
  } else if (stopPct < 3) {
    stop_logic = `Reasonable stop (${stopPct.toFixed(2)}% from entry) — fits swing-trade risk.`;
  } else if (stopPct <= 5) {
    stop_logic = `Medium stop (${stopPct.toFixed(2)}% from entry) — acceptable but keep size small.`;
  } else {
    stop_logic = `Wide stop (${stopPct.toFixed(2)}% from entry) — consider a tighter invalidation.`;
  }

  // R/R assessment text
  let rr_assessment;
  if (target === 0 || rewardPerShare === 0) {
    rr_assessment = "No target set — define one to validate R/R.";
  } else if (rr >= 3) {
    rr_assessment = `Excellent R/R of ${rr.toFixed(2)}:1 — asymmetric payoff.`;
  } else if (rr >= 2) {
    rr_assessment = `Strong R/R of ${rr.toFixed(2)}:1 — passes 2:1 minimum.`;
  } else if (rr >= 1.5) {
    rr_assessment = `Marginal R/R of ${rr.toFixed(2)}:1 — below 2:1 preferred threshold.`;
  } else {
    rr_assessment = `Poor R/R of ${rr.toFixed(2)}:1 — not worth the risk.`;
  }

  // Portfolio risk warning
  let portfolioNote = "";
  if (portfolioRiskPct > 0) {
    if (portfolioRiskPct > 2) portfolioNote = ` Portfolio risk ${portfolioRiskPct.toFixed(2)}% is above 1% target — reduce size.`;
    else if (portfolioRiskPct > 1.2) portfolioNote = ` Portfolio risk ${portfolioRiskPct.toFixed(2)}% slightly above 1% — acceptable.`;
    else portfolioNote = ` Portfolio risk ${portfolioRiskPct.toFixed(2)}% within 1% rule.`;
  }

  // Explanation
  let explanation;
  if (recommendation === "GO") {
    explanation = `Setup qualifies: R/R ${rr.toFixed(2)}:1 and stop ${stopPct.toFixed(2)}% from entry.${portfolioNote}`;
  } else if (recommendation === "WAIT") {
    explanation = `Setup is borderline: R/R ${rr.toFixed(2)}:1, stop ${stopPct.toFixed(2)}%. Wait for cleaner entry or tighter invalidation.${portfolioNote}`;
  } else {
    explanation = `Pass on this trade: ${!directionOk ? "stop on wrong side of entry." : rr < 1.5 ? `R/R ${rr.toFixed(2)}:1 is below 1.5.` : `stop ${stopPct.toFixed(2)}% exceeds 5% threshold.`}${portfolioNote}`;
  }

  return {
    recommendation,
    entry_score,
    stop_logic,
    rr_assessment,
    explanation,
    metrics: {
      rr: Number(rr.toFixed(2)),
      stopPct: Number(stopPct.toFixed(2)),
      riskPerShare: Number(riskPerShare.toFixed(2)),
      rewardPerShare: Number(rewardPerShare.toFixed(2)),
      dollarRisk: Number(dollarRisk.toFixed(2)),
      portfolioRiskPct: Number(portfolioRiskPct.toFixed(2)),
    },
  };
};

/**
 * Compact text form for inline display inside the trade form.
 */
export const analyzeTradeLocalText = (p) => {
  const a = analyzeTradeLocal(p);
  if (a.error) return a.error;
  const rec = a.recommendation === "GO" ? "GO ✅" : a.recommendation === "WAIT" ? "WAIT ⚠️" : "SKIP ❌";
  return [
    `📊 Local Analysis`,
    `Entry Strength: ${"★".repeat(a.entry_score)}${"☆".repeat(5 - a.entry_score)} (${a.entry_score}/5)`,
    `Stop Logic: ${a.stop_logic}`,
    `R/R: ${a.rr_assessment}`,
    `Recommendation: ${rec}`,
    a.explanation,
  ].join("\n\n");
};
