"""Pydantic models for all agent inputs and outputs."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Bias = Literal["bullish", "bearish", "neutral"]
Verdict = Literal["approve", "reject", "hold"]


class MacroView(BaseModel):
    bias: Bias
    vix: float
    rates_trend: str
    breadth_score: float = Field(ge=0, le=100)
    notes: str = ""


class SectorView(BaseModel):
    leaders: list[str] = []
    laggards: list[str] = []
    rotation_notes: str = ""


class ScreenCandidate(BaseModel):
    ticker: str
    score: float
    reason: str = ""


class SentimentView(BaseModel):
    ticker: str
    score: float = Field(ge=-1, le=1)
    headlines: list[str] = []


class TechnicalSetup(BaseModel):
    ticker: str
    pattern: str
    entry: float
    stop: float
    target: float
    risk_reward: float
    confidence: float = Field(ge=0, le=1)


class PositionSize(BaseModel):
    ticker: str
    shares: int
    dollar_risk: float
    account_risk_pct: float


class PortfolioCheck(BaseModel):
    ticker: str
    passes: bool
    correlation_warnings: list[str] = []
    exposure_notes: str = ""


class TradeThesis(BaseModel):
    ticker: str
    direction: Literal["long", "short"]
    summary: str
    catalysts: list[str] = []
    invalidation: str
    time_horizon_days: int


class ExecutionPlan(BaseModel):
    ticker: str
    order_type: Literal["market", "limit", "stop"]
    limit_price: float | None = None
    stop_price: float | None = None
    shares: int
    time_in_force: str = "DAY"


class TradeCard(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ticker: str
    thesis: TradeThesis
    setup: TechnicalSetup
    size: PositionSize
    execution: ExecutionPlan
    cro_verdict: Verdict = "hold"
    cro_notes: str = ""
