# SwingEdge — תוכנית אב (עדכון: 2026-07-05)

## סטטוס שלבים
| שלב | פריט | מצב |
|---|---|---|
| 0 | דומיין swing-edge.com + DNS + SSL | ✅ |
| 0 | Vercel Analytics · Sentry alert · GitHub Secrets | ✅ |
| 1.1 | Build gate (כל push) | ✅ |
| 1.2 | ניקוי src/vision + tesseract | ✅ |
| 1.3 | Playwright smoke (יומי + push) | ✅ |
| 1.4 | Health endpoint + מוניטור 30 דק' | ✅ |
| 1.5 | Lighthouse CI שבועי | 🔵 בתור |
| 1.6 | גיבוי Supabase שבועי מוצפן | ✅ |
| + | UptimeRobot חיצוני (5 דק') | ✅ |
| 2 | Mobile audit + PWA | 🔵 |
| 3 | סוכנים: Sentry→Issue → Daily Digest → Auto-Fix → Dependabot →
      Improvement → Recap (ראה AGENTS.md) | 🔵 הבא |
| + | Rate limiting על /api/quote + /api/ocr | 🔵 לפני משתמשים זרים |
| + | RLS audit ב-Supabase | 🔵 לפני משתמשים זרים |
| 4 | Legal: עמודים+consent+דיסקליימר | ✅ (ליטוש עו"ד לפני סקייל) |
| 4 | Waitlist · GA4 · Stripe (אחרי עו"ד) | ⏸️ |
| 5 | תוכן: Weekly Recap מנתוני Market Overview · glossary posts | ⏸️ |

## מוצר — בוצע
#5 צילום→OCR · #7 Market Overview (TwelveData+CoinGecko, LKG accumulator) ·
#8 טווחי 1D/1W/1M · לוגואים בחיפוש · sparkline fix · backlog sweep (A1 בוצע;
B1/B3/B4 אומתו; C1 הופרך; D1 קיים) · Legal מלא.

## מוצר — פתוח
#6 הכוונה: הדרכת ציור Long/Short Position tool + צילום (tooltip+מדיה) בכל 4
המיקומים, ×5 שפות (כולל D2 מה-backlog הישן).

## סדר עבודה
session אחד בכל רגע · Plan Mode לכל דבר משמעותי · תוכנית→ביקורת בצ'אט→אישור ·
אימות production אחרי deploy · docs/ = מקור האמת.
