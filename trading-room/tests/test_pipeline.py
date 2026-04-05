"""Basic pipeline tests (no network required)."""
from __future__ import annotations

from models.schemas import (
    ExecutionPlan,
    MacroView,
    PortfolioCheck,
    PositionSize,
    TechnicalSetup,
    TradeCard,
    TradeThesis,
)
from orchestrator.gate_logic import macro_gate, portfolio_gate, setup_gate


def _setup(rr: float = 2.0, conf: float = 0.7) -> TechnicalSetup:
    return TechnicalSetup(
        ticker="TEST",
        pattern="breakout",
        entry=100.0,
        stop=98.0,
        target=106.0,
        risk_reward=rr,
        confidence=conf,
    )


def test_macro_gate_blocks_bearish_high_vix():
    hostile = MacroView(bias="bearish", vix=35, rates_trend="up", breadth_score=20)
    friendly = MacroView(bias="bullish", vix=15, rates_trend="flat", breadth_score=70)
    assert macro_gate(hostile) is False
    assert macro_gate(friendly) is True


def test_setup_gate():
    assert setup_gate(_setup(rr=2.0, conf=0.7)) is True
    assert setup_gate(_setup(rr=1.0, conf=0.7)) is False
    assert setup_gate(_setup(rr=2.0, conf=0.3)) is False


def test_portfolio_gate():
    assert portfolio_gate(PortfolioCheck(ticker="X", passes=True)) is True
    assert portfolio_gate(PortfolioCheck(ticker="X", passes=False)) is False


def test_trade_card_roundtrip():
    card = TradeCard(
        ticker="TEST",
        thesis=TradeThesis(
            ticker="TEST",
            direction="long",
            summary="t",
            invalidation="x",
            time_horizon_days=5,
        ),
        setup=_setup(),
        size=PositionSize(ticker="TEST", shares=10, dollar_risk=20, account_risk_pct=1),
        execution=ExecutionPlan(
            ticker="TEST", order_type="limit", limit_price=100, stop_price=98, shares=10
        ),
    )
    data = card.model_dump()
    assert data["ticker"] == "TEST"
    assert data["cro_verdict"] == "hold"
