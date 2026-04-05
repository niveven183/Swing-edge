"""Main pipeline orchestrating the 10 agents."""
from __future__ import annotations

import argparse
import json
from typing import Any

from agents.chief_risk_officer import ChiefRiskOfficer
from agents.deep_technical import DeepTechnical
from agents.execution_manager import ExecutionManager
from agents.macro_analyst import MacroAnalyst
from agents.portfolio_monitor import PortfolioMonitor
from agents.risk_sizing import RiskSizing
from agents.sector_scanner import SectorScanner
from agents.sentiment_analyst import SentimentAnalyst
from agents.technical_screener import TechnicalScreener
from agents.thesis_builder import ThesisBuilder
from config.settings import DEFAULT_UNIVERSE, OUTPUTS_DIR
from models.schemas import TradeCard
from orchestrator.gate_logic import macro_gate, portfolio_gate, setup_gate
from utils.helpers import now_iso
from utils.logger import get_logger

log = get_logger("pipeline")


def run_pipeline(universe: list[str]) -> list[TradeCard]:
    ctx: dict[str, Any] = {"universe": universe, "open_positions": []}

    ctx["macro"] = MacroAnalyst().run(ctx)
    log.info("Macro: %s", ctx["macro"].bias)
    if not macro_gate(ctx["macro"]):
        log.warning("Macro gate failed - halting pipeline")
        return []

    ctx["sectors"] = SectorScanner().run(ctx)
    ctx["candidates"] = TechnicalScreener().run(ctx)
    log.info("Screener produced %d candidates", len(ctx["candidates"]))
    if not ctx["candidates"]:
        return []

    ctx["sentiment"] = SentimentAnalyst().run(ctx)
    ctx["setups"] = [s for s in DeepTechnical().run(ctx) if setup_gate(s)]
    log.info("%d setups passed gate", len(ctx["setups"]))
    if not ctx["setups"]:
        return []

    ctx["sizes"] = RiskSizing().run(ctx)
    checks = PortfolioMonitor().run(ctx)
    allowed = {c.ticker for c in checks if portfolio_gate(c)}
    ctx["setups"] = [s for s in ctx["setups"] if s.ticker in allowed]

    theses = {t.ticker: t for t in ThesisBuilder().run(ctx)}
    plans = {p.ticker: p for p in ExecutionManager().run(ctx)}
    sizes = {s.ticker: s for s in ctx["sizes"]}

    cards: list[TradeCard] = []
    for setup in ctx["setups"]:
        if setup.ticker not in plans:
            continue
        cards.append(
            TradeCard(
                ticker=setup.ticker,
                thesis=theses[setup.ticker],
                setup=setup,
                size=sizes[setup.ticker],
                execution=plans[setup.ticker],
            )
        )

    ctx["cards"] = cards
    cards = ChiefRiskOfficer().run(ctx)

    _write_report(cards)
    return cards


def _write_report(cards: list[TradeCard]) -> None:
    path = OUTPUTS_DIR / f"run_{now_iso().replace(':', '-')}.json"
    payload = [json.loads(c.model_dump_json()) for c in cards]
    path.write_text(json.dumps(payload, indent=2, default=str))
    log.info("Wrote %d cards to %s", len(cards), path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tickers",
        type=str,
        default=",".join(DEFAULT_UNIVERSE),
        help="Comma-separated tickers to screen",
    )
    args = parser.parse_args()
    universe = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    cards = run_pipeline(universe)
    approved = [c for c in cards if c.cro_verdict == "approve"]
    print(f"\n=== Pipeline complete: {len(approved)}/{len(cards)} approved ===")
    for c in approved:
        print(f"  {c.ticker}: {c.thesis.summary}")


if __name__ == "__main__":
    main()
