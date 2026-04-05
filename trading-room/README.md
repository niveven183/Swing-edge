# Trading Room

A multi-agent trading analysis pipeline with 10 specialized agents that collaborate to research, screen, size, and approve swing-trade ideas.

## Architecture

The pipeline runs agents in sequence through "gates" that filter opportunities:

1. **Macro Analyst** – assesses the macro environment (rates, VIX, breadth).
2. **Sector Scanner** – identifies leading/lagging sectors and rotation.
3. **Technical Screener** – screens the universe for candidates.
4. **Sentiment Analyst** – checks news, flow, and social sentiment.
5. **Deep Technical** – performs deep TA on short-list candidates.
6. **Risk Sizing** – calculates position size & stop placement.
7. **Portfolio Monitor** – checks correlation/exposure against open book.
8. **Thesis Builder** – composes the full trade thesis.
9. **Execution Manager** – formulates entry plan (limit/stop orders).
10. **Chief Risk Officer** – final approval / veto.

## Setup (Beginner-Friendly)

### 1. Prerequisites

- Python 3.10+ installed
- A terminal (Mac/Linux/WSL) or PowerShell (Windows)

### 2. Clone & enter the project

```bash
cd trading-room
```

### 3. Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate   # Mac/Linux
.venv\Scripts\activate      # Windows
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys. Market data uses **Yahoo Finance** (free, no key needed), so you can start immediately.

### 6. Run the pipeline

```bash
python -m orchestrator.pipeline --tickers AAPL,MSFT,NVDA
```

Outputs (logs, reports, trade cards) are written to `outputs/`.

### 7. Run tests

```bash
pytest tests/
```

## Project Structure

```
trading-room/
├── agents/          # 10 specialized agents
├── orchestrator/    # Pipeline & gate logic
├── data/            # Market data + cache
├── models/          # Pydantic schemas
├── config/          # Central settings
├── utils/           # Logging & helpers
├── outputs/         # Trade logs & reports
└── tests/           # Basic tests
```

## Notes

- Market data is fetched via `yfinance` (free).
- Caching is done to simple JSON files under `data/cache/` to avoid rate limits.
- All agent inputs and outputs are strongly typed via Pydantic models.
