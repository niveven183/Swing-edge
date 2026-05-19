"""
Hive Supervisor — runs on two schedules:
  • Pre-flight check: called before every MCP flush (inline, not scheduled)
  • Daily flush:      23:55 UTC — final quality gate before nightly INSERT batch
  • Weekly cleanup:   Sunday 00:00 UTC — scan Supabase and repair stale rows
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from core.constants import VALID_SETUPS, VALID_EMOTIONS, VALID_MARKETS
from agents._base import validate_and_fix, quarantine

logger = logging.getLogger(__name__)

REPORTS_DIR = Path(__file__).parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

SUPABASE_USER_ID = "92a06c0c-5d7f-4b5e-b9b2-000000000000"  # replace with real UUID


# ── Pre-flight: called before every INSERT batch ──────────────────────────────

def preflight(trades: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Run validate_and_fix() on every trade before a Supabase INSERT.
    Returns (clean_trades, quarantined_trades).
    """
    clean, bad = [], []
    for t in trades:
        fixed = validate_and_fix(t)
        issues = _audit(fixed)
        if issues:
            quarantine(fixed, "; ".join(issues))
            bad.append(fixed)
        else:
            clean.append(fixed)
    logger.info("Preflight: %d clean, %d quarantined", len(clean), len(bad))
    return clean, bad


def _audit(t: dict) -> list[str]:
    """Return a list of remaining problems after validate_and_fix(). Empty = OK."""
    issues = []
    if t.get("setup") not in VALID_SETUPS:
        issues.append(f"setup='{t.get('setup')}' invalid")
    if t.get("emotionAtEntry") not in VALID_EMOTIONS:
        issues.append(f"emotionAtEntry='{t.get('emotionAtEntry')}' invalid")
    if t.get("marketCondition") not in VALID_MARKETS:
        issues.append(f"marketCondition='{t.get('marketCondition')}' invalid")
    if not t.get("is_demo"):
        issues.append("is_demo must be True")
    if t.get("status") != "CLOSED":
        issues.append(f"status='{t.get('status')}' must be CLOSED")
    return issues


# ── Daily flush gate (23:55) ──────────────────────────────────────────────────

def daily_flush_gate(pending_trades: list[dict]) -> list[dict]:
    """
    Final quality gate called at 23:55.
    Cleans + quarantines; returns only the clean batch for INSERT.
    """
    logger.info("=== Daily flush gate %s ===", datetime.now(timezone.utc).isoformat())
    clean, _ = preflight(pending_trades)
    return clean


# ── Weekly cleanup (Sunday 00:00) ─────────────────────────────────────────────

def weekly_cleanup(supabase_client) -> dict:
    """
    Scan Supabase for rows with invalid enum values and repair them.
    Writes a report to reports/weekly_cleanup.json.
    Requires a supabase-py client with service-role credentials.
    """
    logger.info("=== Weekly cleanup %s ===", datetime.now(timezone.utc).isoformat())

    invalid_setup = " OR ".join(
        [f"setup = '{s}'" for s in _negate_list("setup", VALID_SETUPS)]
    )
    # Use a simple broad query — filter client-side to avoid huge SQL
    result = (
        supabase_client.table("trades")
        .select("*")
        .eq("user_id", SUPABASE_USER_ID)
        .execute()
    )
    rows = result.data or []

    fixed_count = 0
    skipped = []
    for row in rows:
        needs_fix = (
            row.get("setup") not in VALID_SETUPS
            or row.get("emotionAtEntry") not in VALID_EMOTIONS
            or row.get("marketCondition") not in VALID_MARKETS
        )
        if not needs_fix:
            continue

        repaired = validate_and_fix(row)
        issues_after = _audit(repaired)
        if issues_after:
            skipped.append({"id": row.get("id"), "issues": issues_after})
            continue

        supabase_client.table("trades").update({
            "setup": repaired["setup"],
            "emotionAtEntry": repaired["emotionAtEntry"],
            "marketCondition": repaired["marketCondition"],
            "is_demo": True,
            "status": "CLOSED",
            "pnl": repaired.get("pnl"),
        }).eq("id", row["id"]).execute()
        fixed_count += 1

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_scanned": len(rows),
        "fixed": fixed_count,
        "skipped": skipped,
    }
    report_path = REPORTS_DIR / "weekly_cleanup.json"
    report_path.write_text(json.dumps(report, indent=2))
    logger.info("Weekly cleanup done: fixed=%d, skipped=%d", fixed_count, len(skipped))
    return report


def _negate_list(field: str, valid: list) -> list:
    """Placeholder — actual SQL negation built in weekly_cleanup."""
    return []  # unused; filtering done client-side above


# ── Tech Team v2: daily audit + proposals + tasks ─────────────────────────────

REPO_ROOT = Path(__file__).parent.parent


def audit_daily(supabase_client) -> dict:
    """Daily scan of trades: count demo/real, collect remaining issues."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        result = (
            supabase_client.table("trades")
            .select("*")
            .eq("user_id", SUPABASE_USER_ID)
            .execute()
        )
        rows = result.data or []
    except Exception:
        logger.exception("audit_daily: Supabase unavailable")
        return {
            "date": today,
            "error": "Supabase unavailable",
            "demo_count": 0,
            "real_count": 0,
            "issues": [],
            "total": 0,
        }

    demo_count = sum(1 for r in rows if r.get("is_demo"))
    real_count = len(rows) - demo_count
    issues = []
    for row in rows:
        row_issues = _audit(row)
        if row_issues:
            issues.append({"id": row.get("id"), "issues": row_issues})

    return {
        "date": today,
        "demo_count": demo_count,
        "real_count": real_count,
        "issues": issues,
        "total": len(rows),
    }


def write_proposals(audit: dict) -> None:
    """Append a dated proposals section to PROPOSALS.md based on audit issues."""
    if not audit.get("issues"):
        return

    proposals = [f"- Trade `{i['id']}`: {'; '.join(i['issues'])}" for i in audit["issues"]]
    path = REPO_ROOT / "PROPOSALS.md"
    if not path.exists():
        path.write_text("# SwingEdge — Hive Proposals\n\n")

    section = f"\n## {audit['date']}\n" + "\n".join(proposals) + "\n"
    with path.open("a") as f:
        f.write(section)


def update_tasks(audit: dict) -> None:
    """Append a daily summary row to TASKS.md."""
    path = REPO_ROOT / "TASKS.md"
    if not path.exists():
        path.write_text(
            "# SwingEdge — Daily Tasks Log\n\n"
            "| Date | Demo | Real | Issues |\n"
            "|------|------|------|--------|\n"
        )
    note = audit.get("error", f"Issues: {len(audit.get('issues', []))}")
    line = f"| {audit['date']} | Demo: {audit['demo_count']} | Real: {audit['real_count']} | {note} |\n"
    with path.open("a") as f:
        f.write(line)


def run_tech_team_v2(supabase_client, repo_path: Path | None = None) -> dict:
    """Run daily audit, write proposals + tasks, then commit & push to main."""
    import subprocess

    repo = str(repo_path or REPO_ROOT)
    audit = audit_daily(supabase_client)
    write_proposals(audit)
    update_tasks(audit)
    logger.info("Tech Team v2: audit done. Issues: %d", len(audit.get("issues", [])))

    def _git(*args):
        try:
            subprocess.run(["git", *args], cwd=repo, check=False)
        except Exception:
            logger.exception("git %s failed", args[0] if args else "?")

    current = "HEAD"
    try:
        current = subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=repo, text=True
        ).strip() or "HEAD"
    except Exception:
        logger.exception("git branch --show-current failed")

    _git("add", "PROPOSALS.md", "TASKS.md")
    _git("commit", "-m", f"chore(hive): daily audit {audit['date']}")
    _git("checkout", "main")
    if current and current != "main":
        _git("merge", "--no-ff", current)
    _git("push", "origin", "main", "--force")

    return audit
