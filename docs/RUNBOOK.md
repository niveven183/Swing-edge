# Runbook

Operational procedures for emergencies. Keep steps exact and copy-pasteable.

---

## שחזור DB מגיבוי (חירום)

מתי: ה-DB ב-Supabase אבד/נפגם ויש לשחזר מהגיבוי המוצפן השבועי.

הגיבוי מיוצר על ידי `.github/workflows/backup.yml` (ראשון ב-03:00 UTC): `pg_dump`
בפורמט custom → gzip → הצפנת `openssl aes-256-cbc -pbkdf2`. כל ארטיפקט מכיל שני
קבצים: `supabase-backup-<date>.pgcustom.gz.enc` וקובץ `manifest.json` (ספירת שורות
לכל טבלה + רשימת אינדקסים, מאותו רגע של הגיבוי).

תרגיל השחזור הרבעוני (`restore-drill.yml`) מוודא אוטומטית שהתהליך הזה עובד. אם צריך
לשחזר באמת — עקוב אחרי הצעדים הבאים.

### דרישות מקדימות
- `gh` CLI מחובר (`gh auth status`).
- לקוח PostgreSQL **17** (`pg_restore`, `psql`) — חייב `>=` גרסת השרת (Supabase = 17.x).
  ב-macOS: `brew install postgresql@17`. אל תשתמש ב-`pg_restore` v16 — ייכשל.
- `openssl` (מותקן ב-macOS).
- הסוד `BACKUP_PASSPHRASE` (מ-GitHub → Settings → Secrets → Actions). **לעולם אל תדפיס
  אותו למסך/לוג.** העבר אותו דרך משתנה סביבה בלבד.

### 1. הורד את הגיבוי הירוק האחרון
```bash
RUN_ID="$(gh run list --workflow=backup.yml --status=success --branch=main \
  --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run download "$RUN_ID" --dir restore-tmp
ENC="$(find restore-tmp -name '*.pgcustom.gz.enc' | head -n1)"
MAN="$(find restore-tmp -name 'manifest.json' | head -n1)"
cat "$MAN"          # בסיס ההשוואה: כמה שורות/אילו אינדקסים מצופים
```

### 2. פענח ופרוס (bez הדפסת ה-passphrase)
```bash
export BACKUP_PASSPHRASE='...'   # הדבק מ-Secrets; לא נשמר ל-history אם יש רווח מוביל
openssl enc -d -aes-256-cbc -pbkdf2 -in "$ENC" -out dump.pgcustom.gz -pass env:BACKUP_PASSPHRASE
gunzip dump.pgcustom.gz          # -> dump.pgcustom
unset BACKUP_PASSPHRASE
```

### 3. שחזר ל-DB **חדש ומבודד** — לעולם לא מעל `public` הקיים
> ⚠️ אזהרה: אל תריץ `pg_restore` אל תוך ה-DB הפרודקשן הקיים או מעל schema `public`
> חי. שחזר תמיד ל-database נקי חדש, בדוק, ורק אז החלט על cutover. שחזור מעל נתונים
> קיימים עלול למחוק/לשכפל.

אופציה א — Postgres מקומי ב-Docker (מומלץ לאימות):
```bash
docker run -d --name pg-restore -e POSTGRES_PASSWORD=pw -p 5433:5432 postgres:17
psql "postgresql://postgres:pw@localhost:5433/postgres" -c "CREATE DATABASE restored;"
pg_restore --no-owner --no-privileges \
  --dbname "postgresql://postgres:pw@localhost:5433/restored" dump.pgcustom
```
הערה: שגיאות על תוספים/תפקידים ייחודיים ל-Supabase (roles/policies/extensions שלא
קיימים ב-Postgres רגיל) הן **לא-קטלניות** — נתוני `public` והאינדקסים משוחזרים בכל זאת.

אופציה ב — שחזור חזרה ל-Supabase (רק אחרי אימות אופציה א): צור פרויקט/DB נקי, ואז
`pg_restore --no-owner --dbname "<SUPABASE_DB_URL של היעד החדש>" dump.pgcustom`.

### 4. אמת מול ה-manifest
```bash
DB="postgresql://postgres:pw@localhost:5433/restored"
for t in $(jq -r '.tables | keys[]' "$MAN"); do
  echo "$t: manifest=$(jq -r --arg k "$t" '.tables[$k]' "$MAN") restored=$(psql "$DB" -tAc "SELECT count(*) FROM public.\"$t\"")"
done
for i in $(jq -r '.indexes[]' "$MAN"); do
  psql "$DB" -tAc "SELECT '$i', count(*) FROM pg_indexes WHERE schemaname='public' AND indexname='$i'"
done
```
הספירות חייבות להיות זהות ל-manifest, וכל אינדקס חייב להחזיר 1. (נכון להיום:
`trades`=75, `feedback`=3; אינדקסים `idx_trades_user_date`, `idx_trades_user_created`.)

### 5. Cutover ונקיון
- רק לאחר אימות מלא — הפנה את האפליקציה ל-DB המשוחזר (עדכן `SUPABASE_DB_URL` / הגדרות).
- שים לב: מדיניות RLS ותפקידי Supabase אינם חלק מאימות ה-drill — ודא ידנית שהרשאות
  ה-RLS הנדרשות קיימות ביעד לפני חשיפה למשתמשים.
- נקה: `docker rm -f pg-restore; rm -rf restore-tmp dump.pgcustom`.

### 6. תעד אירוע
כל אובדן/שחזור בפרודקשן = רשומה ב-`docs/INCIDENTS.md` (סימפטום, שורש, תיקון, מניעה),
באותו commit של התיקון.

---

## שליחת קמפיין מייל (Email Campaign)

מריצים ידנית מ-GitHub → Actions → **Email Campaign** → Run workflow. שולח **רק**
לנמענים מאושרים (`waitlist.approved_at IS NOT NULL`) ומדלג על מי שכבר קיבל את
הקמפיין (dedup מול `public.email_campaign_log`). דורש שהמיגרציה
`supabase/migrations/*_email_campaign_log.sql` תרוץ תחילה (אחרת ה-fetch מציג
`::warning` ומסיים ירוק בלי לשלוח).

Inputs: `campaign` (מפתח הקמפיין, למשל `waitlist_launch`) · `subject` (שורת נושא) ·
`template` (נתיב ל-HTML, ברירת מחדל `emails/waitlist_launch.html`) ·
`dry_run` (**ברירת מחדל TRUE** — תצוגה מקדימה בלבד, לא שולח) · `limit` (תקרת
נמענים לריצה, ברירת מחדל 10). לשליחה אמיתית: הרץ עם `dry_run=false`. אף כתובת
מייל אינה מודפסת במלואה, ו-SMTP secrets לעולם לא נחשפים בלוג.

### הזרימה המלאה (מנרשם ועד מייל)
1. משתמש נרשם בטופס ב-landing → שורה ב-`public.waitlist`, `approved_at=null`.
2. Fleet Daily מדווח בדיסקורד: "N ממתינים לאישור".
3. ניב נכנס ל-AdminPanel → טבלת Waitlist → מסמן ממתינים → **"אשר נבחרים"** →
   `approved_at=now()`. **שלב זה לא שולח שום מייל.**
4. GitHub → Actions → **Email Campaign** → Run workflow → `dry_run=true` (אימות
   מספר נמענים) → ואז שוב עם `dry_run=false` (שליחה בפועל).
5. אימות: דוח 📧 בדיסקורד + שורות ב-`email_campaign_log`.

### מלכודות ותקלות נפוצות
- **`limit` ברירת המחדל הוא 10** — לקמפיין גדול יותר יש לשנות ידנית (למשל 50),
  אחרת רק 10 הראשונים יקבלו והשאר יישארו בתור.
- **קמפיין חדש = ערך `campaign` חדש.** שימוש חוזר בשם קיים גורם ל-dedup לדלג על
  כל מי שכבר קיבל אותו.
- **ביטול רישום שגוי ב-log** (אם נרשמה שליחה שלא קרתה):
  `delete from public.email_campaign_log where campaign = '<שם>';` — אינו נוגע
  ב-`waitlist` ובאישורים.
- **Supabase SQL Editor מציג "Potential issue detected"** על כל `delete`/`drop` —
  אזהרה לגיטימית. לקרוא את השאילתה לפני אישור.
- **הרצת מיגרציה:** לפתוח את קובץ ה-raw ב-GitHub בדפדפן ולהעתיק את התוכן. הדבקת
  ה-URL עצמו ל-SQL Editor תיכשל. אם המיגרציה כוללת בלוק TEARDOWN בהערות — להריץ
  רק את החלק הפעיל.
- **מגבלת Gmail:** ~300-500 נמענים ליום. מעבר לכך נדרש שולח ייעודי (Resend) עם
  דומיין מאומת — החלפה של הגדרות ה-SMTP בלבד.
