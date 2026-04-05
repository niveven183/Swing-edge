"""Agent 9: Order execution logic."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from models.schemas import ExecutionPlan


class ExecutionManager(BaseAgent):
    name = "execution_manager"

    def run(self, context: dict[str, Any]) -> list[ExecutionPlan]:
        setups = context.get("setups", [])
        sizes = {s.ticker: s for s in context.get("sizes", [])}
        self.log.info("Building execution plans for %d setups", len(setups))
        plans: list[ExecutionPlan] = []
        for s in setups:
            size = sizes.get(s.ticker)
            if not size or size.shares <= 0:
                continue
            plans.append(
                ExecutionPlan(
                    ticker=s.ticker,
                    order_type="limit",
                    limit_price=s.entry,
                    stop_price=s.stop,
                    shares=size.shares,
                    time_in_force="DAY",
                )
            )
        return plans
