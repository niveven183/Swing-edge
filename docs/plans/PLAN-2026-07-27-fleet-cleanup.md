# PLAN — ניקוי מאוחד: אבטחה, חוסן, ונראות הצי
תאריך: 2026-07-27 · **מאושר עם 6 תיקונים** (ראו "תיקוני האישור" למטה)

## Context

דוח Architecture Auditor (26.07) העלה 3 חולשות high בתלויות ושני endpoints ללא הגנת כשל (rate limiter שיכול להפיל את ה-endpoint שהוא אמור להגן עליו; קריאה חיצונית ל-Cloudflare בלי timeout). במקביל התגלה פער נראות בצי: 7 מתוך 15 workflows מדווחים רק במייל (לתיבה עם 7,380 הודעות שלא נקראות), ואחד שקט לגמרי — Supabase Backup, שרץ שבועית ומצפין נתוני production בלי שום דיווח הצלחה. סוכן שמדווח לאן שאיש לא מסתכל שווה כמו סוכן שלא רץ. המטרה: לסגור את שלוש הבעיות באותה מחזור עבודה, בלי לגעת בלוגיקת ה-workflows או בקוד האפליקציה.

---

## ניתוח השלכות (CLAUDE.md §8)

**רמה 1:** "רץ אוטומטית בפרודקשן?" → **כן** → טבלה מלאה:

| ציר | תשובה |
|-----|-------|
| משתמשים | ניב בלבד |
| נתונים | הפיך לגמרי — git revert סטנדרטי, אין מיגרציה |
| עלות | $0 תוספת — שימוש חוזר ב-`SENTINEL_DISCORD_WEBHOOK` הקיים |
| אבטחה | **מוסיף סוד? לא** |
| תחזוקה | מקטין עבודה ידנית (לא צריך לחפור בתיבת מייל כדי לגלות שגיבוי נכשל) |
| הפיכות | מיידית |
| כשל שקט | כל צעד Discord: `continue-on-error: true` + שער runtime על קיום ה-secret (ראה תיקון 1) — כשל בדיווח לעולם לא מפיל job |

**פסק דין: ✅ בצע.**

---

## משימה 1 — תלויות פגיעות

`npm audit` (פלט מלא):
```
brace-expansion  <=5.0.7 — Severity: high — DoS via unbounded expansion length
fix available via `npm audit fix`
node_modules/brace-expansion  (מ-@sentry/vite-plugin → glob → minimatch — devDependency, build-time בלבד)

react-router  7.12.0 - 8.2.0 — Severity: high — RSC Mode CSRF Bypass
fix available via `npm audit fix --force` → react-router-dom@7.11.0 (breaking, dependency ישיר)

3 high severity vulnerabilities
```
**פעולה:** `npm audit fix` (בלי `--force`) — מתקן `brace-expansion` בלבד.
**react-router — לא מורידים גרסה (תיקון 6):** ה-CVE הוא RSC Mode CSRF Bypass. `src/main.jsx:3,63` משתמש ב-`BrowserRouter` הדקלרטיבי — אין RSC, אין framework mode, אין `createBrowserRouter`. הפגיעות אינה ישימה. שורה נוספת ל-`docs/DECISIONS.md`.
`package-lock.json` נכנס לקומיט.

---

## משימה 2 — חוסן שני endpoints

### 2.1 `api/_lib/rateLimit.js`
`rateLimit()` (שורות 30-48) סינכרונית וטהורה — Map בזיכרון, אין קריאה חיצונית. עוטפים את הגוף ב-try/catch, fail-open, `console.error` בלבד:
```js
export function rateLimit(key, { windowMs, max }) {
  try {
    const now = Date.now();
    if (buckets.size > SWEEP_THRESHOLD) sweep(now);
    const entry = buckets.get(key) || { hits: [], windowMs };
    entry.windowMs = windowMs;
    entry.hits = entry.hits.filter((t) => now - t < windowMs);
    if (entry.hits.length >= max) {
      buckets.set(key, entry);
      const oldest = entry.hits[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { allowed: false, retryAfter };
    }
    entry.hits.push(now);
    buckets.set(key, entry);
    return { allowed: true, retryAfter: 0 };
  } catch (err) {
    console.error(`[rateLimit] fail-open: ${err?.message || err}`);
    return { allowed: true, retryAfter: 0 };
  }
}
```
צורת ההחזרה זהה — אפס שינוי בחתימה/happy-path. `clientIp()` לא משתנה.

### 2.2 `api/verify-turnstile.js`
**פער מול התיאור, מאומת:** קריאה חיצונית **אחת** בלבד (`fetch(SITEVERIFY_URL, ...)`, שורה 74) — לא שתיים. מאמצים `fetchWithTimeout` מ-`api/ocr.js:29-33` (מועתק זהה כבר ב-5 קבצים אחרים, לא מיוצא — משכפלים מקומית, תואם מוסכמה קיימת):
```js
const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};
```
הוספה אחרי `SITEVERIFY_URL` (שורה 17); שורה 74 הופכת ל-`fetchWithTimeout(SITEVERIFY_URL, {...}, 8000)`. שאר ה-try/catch (fail-open ל-502) לא משתנה.

---

## משימה 3 — Discord ל-7 סוכנים (מייל + Discord, לא במקום)

**דפוס ה-gate (תיקון 1, מחייב, מילה במילה כמו `sentinel.yml:165-185`):**
- `env:` **ברמת הצעד** (לא ה-job): `DISCORD_WEBHOOK: ${{ secrets.SENTINEL_DISCORD_WEBHOOK }}` (+ כל output דינמי כמשתנה `env` נפרד — תיקון 4).
- שורה ראשונה בתוך `run:`:
  ```bash
  if [ -z "${DISCORD_WEBHOOK:-}" ]; then
    echo "::warning::SENTINEL_DISCORD_WEBHOOK not set — skipping Discord."
    exit 0
  fi
  ```
- ה-`if:` של הצעד = **רק** content-gate (למשל `outputs != ''`) — **לא** בדיקת הסוד. צעד שנעלם לגמרי כשהסוד חסר הוא כשל שקט (CLAUDE.md §2).
- `continue-on-error: true`.
- **אפס `${{ }}` בתוך `run:`** (תיקון 4): כל ערך דינמי (outputs, github.*) עובר קודם דרך `env:` של הצעד ומופנה כ-`$VAR` בתוך ה-shell. טקסט עברי שנוצר ע"י Claude יכול לשבור/להריץ קוד אם מודבק ישירות לתוך YAML-אל-shell.
- צבעים כמו סנטינל: GREEN=`3066993`, AMBER=`15844367`, RED=`15158332`.
- תקציר: כותרת + 2-3 שורות + חותמת. לא גוף המייל.

| קובץ | job | content-gate | title/צבע |
|---|---|---|---|
| `analyst.yml` | `analyst` | `steps.analyst.outputs.email_he != ''` | 🧠 Analyst / GREEN |
| `arch-auditor.yml` | `auditor` | `steps.audit.outputs.findings != '0'` | 🏗️ Architecture Auditor / AMBER |
| `daily-digest.yml` | `digest` | (אין — תמיד) | ☀️ Daily Digest / GREEN |
| `data-guardian.yml` | `guardian` | `steps.guard.outputs.findings != '0'` | 🛡️ Data Guardian / AMBER |
| `restore-drill.yml` | `drill` | שני צעדים: success / failure(`always()`) | ✅/🚨 Restore Drill — GREEN/RED |
| `triage.yml` | `triage` | (אין — job רץ רק על כשל/dispatch) | 🔍 Triage / AMBER |
| `failure-alert.yml` | `alert` | (אין — job רץ רק על conclusion==failure) | 🚨 Failure Alert / RED — **הקריטי מכולם** |

דוגמה מלאה מתוקנת (analyst.yml — שאר הקבצים לפי אותו תבנית):
```yaml
      - name: Report to Discord
        if: ${{ steps.analyst.outputs.email_he != '' }}
        continue-on-error: true
        env:
          DISCORD_WEBHOOK: ${{ secrets.SENTINEL_DISCORD_WEBHOOK }}
          A_DATE: ${{ steps.analyst.outputs.date }}
          A_PROPOSAL: ${{ steps.analyst.outputs.has_proposal }}
        run: |
          if [ -z "${DISCORD_WEBHOOK:-}" ]; then
            echo "::warning::SENTINEL_DISCORD_WEBHOOK not set — skipping Discord."
            exit 0
          fi
          if [ "$A_PROPOSAL" = "1" ]; then
            LINE2="הצעת כיול בביטחון גבוה נפתחה כ-PR — ממתינה לאישור ניב."
          else
            LINE2="אין הצעת כיול הפעם (מתחת לסף הביטחון)."
          fi
          DESC="$(printf '%s\n' "ניתוח שבועי הושלם ($A_DATE)" "$LINE2" "פירוט מלא נשלח במייל.")"
          payload="$(jq -n --arg u "SwingEdge Analyst" --arg t "🧠 Analyst" --arg d "$DESC" --argjson c 3066993 \
            '{username:$u, embeds:[{title:$t, description:$d, color:$c}]}')"
          curl -sS -o /dev/null -w 'discord POST -> HTTP %{http_code}\n' \
            -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK"
```
שאר 6 הקבצים: אותה מתכונת בדיוק (env ברמת הצעד, שער runtime, `if:` = content-gate בלבד, `${{ }}` רק ב-`env:`), עם ה-outputs/צבעים/כותרות מהטבלה למעלה.

---

## משימה 4 — הסוכן השקט: `backup.yml` בלבד

**smoke.yml יוצא מהמשימה (תיקון 2):** `smoke.yml` רץ גם על `push: branches:[main]` — צעד `always()` היה יורה בדיסקורד על כל קומיט ל-main. **לא נוגעים ב-smoke.yml בכלל מלבד עדכון upload-artifact (משימה 5).**

**backup.yml — הצלחה בלבד (תיקון 3):** `triage.yml` כבר מאזין ל-"Supabase Backup" ומדווח על כשל — `always()` היה יוצר כפילות. משתמשים ב-`if: success()` בלבד:
```yaml
      - name: Report success to Discord
        if: ${{ success() }}
        continue-on-error: true
        env:
          DISCORD_WEBHOOK: ${{ secrets.SENTINEL_DISCORD_WEBHOOK }}
          B_DATE: ${{ env.BACKUP_DATE }}
          B_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          if [ -z "${DISCORD_WEBHOOK:-}" ]; then
            echo "::warning::SENTINEL_DISCORD_WEBHOOK not set — skipping Discord."
            exit 0
          fi
          DESC="$(printf '%s\n' "תאריך: $B_DATE" "ריצה: $B_RUN_URL")"
          payload="$(jq -n --arg u "SwingEdge Backup" --arg t "💾 Supabase Backup ✅" --arg d "$DESC" --argjson c 3066993 \
            '{username:$u, embeds:[{title:$t, description:$d, color:$c}]}')"
          curl -sS -o /dev/null -w 'discord POST -> HTTP %{http_code}\n' \
            -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK"
```
`env.BACKUP_DATE` כבר נקבע ב-`$GITHUB_ENV` (שורה 39 הקיימת), זמין כאן ללא שינוי נוסף.

**אישור triage.yml (כיסוי כשל):** `triage.yml` מאזין ל-`["Smoke Tests", "Build", "Supabase Backup"]` — שמות מדויקים תואמים (נבדק). `failure-alert.yml` מחריג במפורש את שלושת אלה + Restore Drill — אין כפילות דיווח.

---

## משימה 5 — עדכון זוג ה-artifact actions (תיקון 5)

`actions/download-artifact@v7` **קיים** (אומת מול GitHub releases API). מעדכנים את הזוג במלואו, לא רק upload:

| קובץ | שורה | לפני | אחרי |
|---|---|---|---|
| `backup.yml` | 91 | `actions/upload-artifact@v4` | `actions/upload-artifact@v7` |
| `smoke.yml` | 34 | `actions/upload-artifact@v4` | `actions/upload-artifact@v7` |
| `sentinel.yml` | 93 | `actions/upload-artifact@v4` | `actions/upload-artifact@v7` |
| `sentinel.yml` | 117 | `actions/download-artifact@v4` | `actions/download-artifact@v7` |

v7 מוסיף פיצ'ר אופציונלי בלבד (`archive: false`, לא בשימוש) ועובר ל-ESM פנימית — לא שובר `name`/`path`/`retention-days`/`if-no-files-found`/`compression-level`. אין סיכון שארי לתעד — הזוג תואם.

---

## קבצים שישתנו

```
package.json, package-lock.json           — npm audit fix
api/_lib/rateLimit.js                      — try/catch fail-open
api/verify-turnstile.js                    — fetchWithTimeout (8s)
.github/workflows/analyst.yml              — Discord step
.github/workflows/arch-auditor.yml         — Discord step
.github/workflows/daily-digest.yml         — Discord step
.github/workflows/data-guardian.yml        — Discord step
.github/workflows/restore-drill.yml        — 2 Discord steps
.github/workflows/triage.yml               — Discord step
.github/workflows/failure-alert.yml        — Discord step
.github/workflows/backup.yml               — Discord step (success-only) + upload-artifact@v7
.github/workflows/smoke.yml                — upload-artifact@v7 בלבד (אין Discord)
.github/workflows/sentinel.yml             — upload-artifact@v7 + download-artifact@v7
docs/DECISIONS.md                          — שורת react-router
docs/STATE.md                              — לפי הוראות הסיום
```

**לא ייגע:** `SwingEdge_App.jsx`, `src/`, `api/` (מעבר לשני הקבצים), `tests-sentinel/`, שום לוגיקת workflow קיימת, שום תדירות cron, שום secret חדש.

---

## אימות לפני push

1. `npm run verify` — פלט מלא מודבק, לא סיכום.
2. `python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]"`.
3. `grep -c 'steps\.'` על 7 קבצי ה-Discord בתוך בלוקי `run:` — חייב 0 (אכיפת תיקון 4).
4. עדכון `docs/STATE.md`: 🔴 עכשיו → "Watchdog + ספים + פידבק→דיסקורד" · ✅ נסגר השבוע → ניקוי מאוחד · הסרת שורת הסיכון S2.3 + הסייג "טרם אומת בפרודקשן" · הוספת 2 שורות סיכון (smoke.yml ללא דיווח הצלחה; artifact v7 טרם אומת בריצה חיה).
5. `git add` מפורש לכל קובץ (לא `-A`).
6. `git commit -m "chore(fleet): audit fix, endpoint hardening, Discord reporting for 8 silent agents"`.
7. `git push origin main` — פלט מלא כולל `..HEAD -> main`.

---

## תיקוני האישור (6, מחייבים — מתועדים כאן לצורך מעקב)

1. דפוס gate של Discord: `env:` ברמת הצעד + שער runtime (`if [ -z ... ]; exit 0`), לא `if: env.* != ''`.
2. `smoke.yml` יוצא מהמשימה — רץ גם על push ל-main, `always()` היה יורה על כל קומיט.
3. `backup.yml`: `if: success()` בלבד, לא `always()` — נמנע כפילות עם triage.yml.
4. אפס `${{ }}` בתוך `run:` — כל ערך דרך `env:`.
5. עדכון זוג ה-artifact המלא (upload+download ב-sentinel.yml) ל-v7, לא רק upload.
6. react-router: לא מורידים גרסה — ה-CVE (RSC Mode) לא ישים על `BrowserRouter` הדקלרטיבי בשימוש. שורה ב-DECISIONS.md.
