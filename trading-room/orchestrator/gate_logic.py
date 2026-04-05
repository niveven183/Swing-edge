"""Gate mechanisms between pipeline layers."""
from __future__ import annotations

from models.schemas import MacroView, PortfolioCheck, TechnicalSetup


def macro_gate(macro: MacroView) -> bool:
    """Allow pipeline to continue unless macro is clearly hostile."""
    return not (macro.bias == "bearish" and macro.vix > 30)


def setup_gate(setup: TechnicalSetup, min_rr: float = 1.5) -> bool:
    return setup.risk_reward >= min_rr and setup.confidence >= 0.5


def portfolio_gate(check: PortfolioCheck) -> bool:
    return check.passes
