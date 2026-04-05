"""Agent 3: Stock screening & filtering."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from data.market_data import get_history
from models.schemas import ScreenCandidate


class TechnicalScreener(BaseAgent):
    name = "technical_screener"

    def run(self, context: dict[str, Any]) -> list[ScreenCandidate]:
        universe: list[str] = context.get("universe", [])
        self.log.info("Screening %d tickers", len(universe))
        candidates: list[ScreenCandidate] = []

        for ticker in universe:
            df = get_history(ticker, period="3mo", interval="1d")
            if df.empty or len(df) < 50:
                continue
            close = df["Close"]
            sma20 = close.rolling(20).mean().iloc[-1]
            sma50 = close.rolling(50).mean().iloc[-1]
            last = close.iloc[-1]
            # Simple trend-following filter
            if last > sma20 > sma50:
                score = float((last - sma50) / sma50 * 100)
                candidates.append(
                    ScreenCandidate(
                        ticker=ticker,
                        score=score,
                        reason="price>SMA20>SMA50",
                    )
                )

        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates[:10]
