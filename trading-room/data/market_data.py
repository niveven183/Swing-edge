"""Market data fetching via yfinance (free)."""
from __future__ import annotations

import pandas as pd
import yfinance as yf

from data import cache
from utils.logger import get_logger

log = get_logger("data.market")


def get_history(ticker: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    key = f"hist:{ticker}:{period}:{interval}"
    cached = cache.get(key)
    if cached is not None:
        try:
            return pd.read_json(cached, orient="split")
        except ValueError:
            pass

    log.info("Fetching %s history (%s/%s)", ticker, period, interval)
    df = yf.Ticker(ticker).history(period=period, interval=interval, auto_adjust=True)
    if df.empty:
        log.warning("No data for %s", ticker)
        return df
    cache.set(key, df.to_json(orient="split"))
    return df


def get_quote(ticker: str) -> dict:
    df = get_history(ticker, period="5d", interval="1d")
    if df.empty:
        return {"ticker": ticker, "price": None}
    last = df.iloc[-1]
    return {
        "ticker": ticker,
        "price": float(last["Close"]),
        "volume": int(last["Volume"]),
        "high": float(last["High"]),
        "low": float(last["Low"]),
    }
