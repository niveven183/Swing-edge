"""Agent 5: Deep technical analysis."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from data.market_data import get_history
from models.schemas import TechnicalSetup


class DeepTechnical(BaseAgent):
    name = "deep_technical"

    def run(self, context: dict[str, Any]) -> list[TechnicalSetup]:
        candidates = context.get("candidates", [])
        self.log.info("Running deep TA on %d candidates", len(candidates))
        setups: list[TechnicalSetup] = []

        for c in candidates:
            df = get_history(c.ticker, period="6mo", interval="1d")
            if df.empty or len(df) < 20:
                continue
            close = df["Close"]
            high = df["High"]
            low = df["Low"]

            atr = (high - low).rolling(14).mean().iloc[-1]
            entry = float(close.iloc[-1])
            stop = float(entry - 1.5 * atr)
            target = float(entry + 3.0 * atr)
            rr = (target - entry) / max(entry - stop, 0.01)

            setups.append(
                TechnicalSetup(
                    ticker=c.ticker,
                    pattern="trend-continuation",
                    entry=round(entry, 2),
                    stop=round(stop, 2),
                    target=round(target, 2),
                    risk_reward=round(rr, 2),
                    confidence=0.6,
                )
            )
        return setups
