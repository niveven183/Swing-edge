export function validateSetup(ticker, entry, stop, target, side, livePrice = null) {
  const issues = [];
  let confidence = 100;

  if (!ticker || ticker.length < 1 || ticker.length > 6) {
    issues.push('TICKER_INVALID');
    confidence -= 30;
  }

  const e = parseFloat(entry);
  const s = parseFloat(stop);
  const t = parseFloat(target);

  if (isNaN(e) || isNaN(s) || isNaN(t)) {
    issues.push('PRICES_INVALID');
    confidence -= 50;
  } else {
    if (side === 'LONG') {
      if (s >= e) { issues.push('LONG_STOP_ABOVE_ENTRY'); confidence -= 40; }
      if (t <= e) { issues.push('LONG_TARGET_BELOW_ENTRY'); confidence -= 40; }
    } else {
      if (s <= e) { issues.push('SHORT_STOP_BELOW_ENTRY'); confidence -= 40; }
      if (t >= e) { issues.push('SHORT_TARGET_ABOVE_ENTRY'); confidence -= 40; }
    }

    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);
    const rr = reward / risk;

    if (rr < 0.5) { issues.push('RR_TOO_LOW'); confidence -= 20; }
    if (rr > 10) { issues.push('RR_SUSPICIOUS'); confidence -= 15; }

    if (livePrice && livePrice > 0) {
      const distFromLive = (Math.abs(e - livePrice) / livePrice) * 100;
      if (distFromLive > 15) {
        issues.push('ENTRY_FAR_FROM_LIVE');
        confidence -= 25;
      }
    }
  }

  return {
    valid: issues.length === 0,
    confidence: Math.max(0, confidence),
    issues,
  };
}
