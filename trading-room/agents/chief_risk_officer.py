"""Agent 10: Final approval / veto."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from config.settings import MAX_PORTFOLIO_HEAT_PCT
from models.schemas import TradeCard


class ChiefRiskOfficer(BaseAgent):
    name = "chief_risk_officer"

    def run(self, context: dict[str, Any]) -> list[TradeCard]:
        cards: list[TradeCard] = context.get("cards", [])
        macro = context.get("macro")
        self.log.info("CRO reviewing %d cards", len(cards))

        total_heat = sum(c.size.account_risk_pct for c in cards)
        for card in cards:
            reasons: list[str] = []
            if card.setup.risk_reward < 1.5:
                reasons.append("RR < 1.5")
            if macro and macro.bias == "bearish" and card.thesis.direction == "long":
                reasons.append("macro bearish vs long bias")
            if total_heat > MAX_PORTFOLIO_HEAT_PCT:
                reasons.append(f"portfolio heat {total_heat:.1f}% > cap")

            if reasons:
                card.cro_verdict = "reject"
                card.cro_notes = "; ".join(reasons)
            else:
                card.cro_verdict = "approve"
                card.cro_notes = "ok"
        return cards
