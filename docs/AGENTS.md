# צוות הסוכנים — ארכיטקטורה

הבית: GitHub. ריצות=Actions · דוחות=Issues · תיקונים=PRs · התראות=מייל.
עיקרון ברזל: סוכן לא נוגע ב-main — PR בלבד, עובר את אותם gates. Kill switch =
Disable workflow.

## חי היום
| Workflow | תפקיד | תדירות |
|---|---|---|
| Build | build gate על כל push/PR | push |
| Health Monitor | 4 שירותים חיצוניים, 503=אדום+מייל | 30 דק' |
| Supabase Backup | pg_dump→gzip→AES-256→artifact 30 יום | שבועי א' 03:00 |
| Smoke | Playwright נגד production | יומי 04:00 + push |
| UptimeRobot (חיצוני) | /api/health מבחוץ | 5 דק' |

## בתור (סדר הקמה)
Sentry→Issue bridge → Daily Ops Digest (07:00, סיכום Claude בעברית) →
Lighthouse שבועי → Auto-Fix (issue מתויג agent-fix → PR) → Dependabot →
Weekly Improvement → Weekly Market Recap (שיווק, מנתוני /api/quote history).

עלויות: Actions בחינם בטווח הנוכחי; Claude API לפי שימוש (ANTHROPIC_API_KEY
ב-Secrets). BACKUP_PASSPHRASE = המפתח היחיד לגיבויים — במנהל סיסמאות של ניב.
