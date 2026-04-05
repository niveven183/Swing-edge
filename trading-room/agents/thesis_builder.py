"""Agent 8: Trade thesis construction."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from models.schemas import TradeThesis


class ThesisBuilder(BaseAgent):
    name = "thesis_builder"

    def run(self, context: dict[str, Any]) -> list[TradeThesis]:
        setups = context.get("setups", [])
        self.log.info("Building theses for %d setups", len(setups))
        theses: list[TradeThesis] = []
        for s in setups:
            theses.append(
                TradeThesis(
                    ticker=s.ticker,
                    direction="long",
                    summary=(
                        f"{s.ticker} in trend continuation: entry {s.entry}, "
                        f"stop {s.stop}, target {s.target} (RR {s.risk_reward})."
                    ),
                    catalysts=["macro tailwind", "sector leadership"],
                    invalidation=f"Close below {s.stop}",
                    time_horizon_days=10,
                )
            )
        return theses
