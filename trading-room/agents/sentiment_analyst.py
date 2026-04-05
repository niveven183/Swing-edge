"""Agent 4: Sentiment & flow analysis (stub)."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from models.schemas import SentimentView


class SentimentAnalyst(BaseAgent):
    name = "sentiment_analyst"

    def run(self, context: dict[str, Any]) -> list[SentimentView]:
        candidates = context.get("candidates", [])
        self.log.info("Reading sentiment for %d candidates", len(candidates))
        # Stub: neutral sentiment; wire up NewsAPI/Finnhub here.
        return [SentimentView(ticker=c.ticker, score=0.0, headlines=[]) for c in candidates]
