"""Agent 1: Macro environment analysis."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from data.market_data import get_history
from models.schemas import MacroView


class MacroAnalyst(BaseAgent):
    name = "macro_analyst"

    def run(self, context: dict[str, Any]) -> MacroView:
        self.log.info("Assessing macro environment")
        spy = get_history("SPY", period="3mo", interval="1d")
        vix = get_history("^VIX", period="1mo", interval="1d")

        vix_level = float(vix["Close"].iloc[-1]) if not vix.empty else 20.0

        bias: str = "neutral"
        if not spy.empty:
            sma20 = spy["Close"].rolling(20).mean().iloc[-1]
            last = spy["Close"].iloc[-1]
            if last > sma20 and vix_level < 20:
                bias = "bullish"
            elif last < sma20 and vix_level > 22:
                bias = "bearish"

        breadth = 50.0
        if not spy.empty:
            rets = spy["Close"].pct_change().tail(20)
            breadth = float((rets > 0).mean() * 100)

        return MacroView(
            bias=bias,  # type: ignore[arg-type]
            vix=vix_level,
            rates_trend="unknown",
            breadth_score=breadth,
            notes=f"VIX={vix_level:.1f}, breadth={breadth:.0f}%",
        )
