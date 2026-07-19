# SwingEdge Agents Blueprint — Cowork Fleet

**Claude ביצע, ניב אישר.**

מסמך זה מתעד את צי סוכני ה-**Cowork** (משימות מתוזמנות שרצות מתוך Claude
Desktop/Cowork, לא GitHub Actions). לצי הסוכנים המבוסס GitHub Actions
(Build/Health Monitor/Supabase Backup/Smoke/UptimeRobot וכו') ראו
`docs/AGENTS.md` — שני המסמכים משלימים זה את זה ואינם כפולים.

## סוכני Cowork — חי היום

| סוכן | תפקיד | תדירות | מקור נתונים | מגבלה ידועה |
|---|---|---|---|---|
| **Dispatcher** | טריאז' מיילים/באגים נכנסים | כל שעה | Gmail | פספס מיילי DOWN מ-UptimeRobot ב-19.7 (ראו AGENTS-AUDIT #3) — ניתוב/labels טרם נבדקו |
| **Cost Watchdog** | ניטור usage מול tier limits (Vercel/Supabase/Finnhub) | יומי, 06:15 | Vercel MCP, Supabase MCP, Gmail | לא עוקב אחרי צריכת המשאבים של הסוכנים עצמם (AGENTS-AUDIT #11) |
| **Growth Pulse** | waitlist + funnel + פילוח ערוצי גיוס | יומי, 06:30 | Supabase, read-only SELECT בלבד | קריאות SELECT מקבילות עלולות להחזיר reads מיושנים — חובה לאמת מול `count(*)` בודד לפני דיווח |
| **Weekly Vitals** | דוח בריאות שבועי (uptime/errors/deploys/agents/growth) | שבועי, ראשון 07:45 | UptimeRobot/Gmail, Sentry, Vercel, Supabase | תלוי ב-Mac ער ומחובר (AGENTS-AUDIT #1) — עלול לפספס את שעת הריצה או לא לרוץ כלל |
| **Architecture Auditor** | סקירת קוד/ארכיטקטורה שבועית | שבועי | קוד הריפו (origin/source) | הפיק false positives מחוסר אימות מול המקור בפועל (AGENTS-AUDIT #4-5) |
| **Performance Auditor** | ניתוח ביצועי מסחר (win rate, R:R) | שבועי | טבלת `trades` ב-Supabase | תוקן ב-19.07 — איסור טאוטולוגיות, חיתוך תאים לפי planned R:R בלבד (לא realized) |

**כפוף לפרוטוקול צי הסוכנים (docs/AGENTS-AUDIT-2026-07-19.md).**

כל סוכן חדש שנוסף לצי ה-Cowork חייב להתווסף לטבלה הזו באותה ריצה שבה הוא
מוגדר — כדי שהמסמך לא יתיישן שוב (ראו AGENTS-AUDIT #7).
