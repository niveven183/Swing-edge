# Hive Architecture — SwingEdge AI Trading System

## סקירה כללית

מערכת Hive מורכבת מ-5 סוכנים (S1-S5) שמייצרים עסקאות דמו ושולחים אותן ל-Supabase דרך MCP.
כל עסקה עוברת שכבת ולידציה אוטומטית לפני כל INSERT — אין צורך בתיקון ידני.

---

## שכבות המערכת

```
S1 / S2 / S3 / S4 / S5
       ↓
  simulate_trade()          ← BaseAgent (agents/_base.py)
       ↓
  validate_and_fix()        ← תיקון אוטומטי של כל שדה
       ↓
  preflight()               ← Supervisor (core/supervisor.py)
       ↓
  Supabase INSERT  ─── אם נכשל → quarantine/
```

---

## Auto-Heal Pipeline

**מעכשיו — כל עסקה עוברת `validate_and_fix()` לפני INSERT.
אין צורך בתיקון ידני. הכל אוטומטי.**

### Pre-flight Quality Check (לפני כל MCP flush)

`core/supervisor.py → preflight(trades)`

בודק ומתקן כל עסקה לפני INSERT:

| שדה | בדיקה | תיקון |
|-----|-------|-------|
| `setup` | ∈ VALID_SETUPS | map_to_valid / "Other" |
| `emotionAtEntry` | ∈ VALID_EMOTIONS | map_to_valid / "Neutral" |
| `marketCondition` | ∈ VALID_MARKETS | map_to_valid / "Normal" |
| `pnl` | shares × (exit−entry) × mult | חישוב מחדש תמיד |
| `status` | = "CLOSED" | מאלץ |
| `is_demo` | = True | מאלץ |
| stop/target | LONG: stop<entry, target>entry | אזהרה בלוג |
| stop/target | SHORT: stop>entry, target<entry | אזהרה בלוג |

עסקה שלא עוברת גם אחרי תיקון → `quarantine/<timestamp>.json` + לוג.

### Daily Flush Gate (23:55 UTC)

`core/supervisor.py → daily_flush_gate(pending_trades)`

שער איכות אחרון לפני ה-INSERT הלילי. מחזיר רק עסקאות תקינות.

### Weekly Cleanup (ראשון 00:00 UTC)

`core/supervisor.py → weekly_cleanup(supabase_client)`

```sql
SELECT * FROM trades WHERE user_id = '92a06c0c...'
```

סורק את כל הרשומות, מריץ `validate_and_fix()`, ומעדכן שורות פגומות דרך UPDATE.
מדווח ב-`reports/weekly_cleanup.json`:
```json
{
  "timestamp": "...",
  "total_scanned": 120,
  "fixed": 3,
  "skipped": []
}
```

---

## Single Source of Truth — core/constants.py

כל הרשימות התקניות מוגדרות **פעם אחת** ב-`core/constants.py`:

- `VALID_SETUPS` — כל ה-setups המותרים
- `VALID_EMOTIONS` — כל ה-emotions המותרים  
- `VALID_MARKETS` — כל תנאי השוק המותרים
- `SETUP_ALIASES` / `EMOTION_ALIASES` / `MARKET_ALIASES` — מיפוי וריאנטים

**כל שינוי ב-`constants.py` מתפשט אוטומטית לכל הסוכנים ו-Supervisor.**

---

## מבנה קבצים

```
core/
  constants.py      ← VALID_SETUPS, VALID_EMOTIONS, VALID_MARKETS (source of truth)
  supervisor.py     ← preflight, daily_flush_gate, weekly_cleanup
  __init__.py

agents/
  _base.py          ← BaseAgent, validate_and_fix(), quarantine()
  __init__.py
  s1_agent.py       ← (Agent S1 — יירש מ-BaseAgent)
  s2_agent.py
  s3_agent.py
  s4_agent.py
  s5_agent.py

quarantine/         ← עסקאות שנכשלו ולידציה (JSON, לבדיקה ידנית)
reports/
  weekly_cleanup.json
```

---

## איך להוסיף סוכן חדש

```python
from agents._base import BaseAgent

class S1Agent(BaseAgent):
    name = "S1"

    def simulate_trade_impl(self, trade: dict) -> dict:
        # הלוגיקה הספציפית של הסוכן
        # trade כבר עבר validate_and_fix() — בטוח להשתמש
        return trade
```

`validate_and_fix()` רץ אוטומטית ב-`simulate_trade()` של BaseAgent לפני הקריאה ל-`simulate_trade_impl()`.

---

## לוג והתראות

- כל תיקון → `WARNING` בלוג עם הסבר
- כל quarantine → `WARNING` + קובץ JSON ב-`quarantine/`
- Weekly cleanup → קובץ `reports/weekly_cleanup.json`
