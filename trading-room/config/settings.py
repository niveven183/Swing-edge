"""Central configuration for the trading-room pipeline."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = ROOT_DIR / "outputs"
CACHE_DIR = ROOT_DIR / "data" / "cache"

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# API keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
FINNHUB_KEY = os.getenv("FINNHUB_KEY", "")

# Pipeline config
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

# Risk config (defaults - may be overridden per-trade)
MAX_RISK_PER_TRADE_PCT = 1.0   # % of account
MAX_PORTFOLIO_HEAT_PCT = 6.0   # % of account
DEFAULT_ACCOUNT_SIZE = 100_000.0

# Default universe (SPY components subset for quick start)
DEFAULT_UNIVERSE = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
    "JPM", "XOM", "UNH", "V", "MA", "HD", "PG", "COST",
]
