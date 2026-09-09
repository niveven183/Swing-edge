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

## רוטציית `BACKUP_PASSPHRASE` — שלושה צעדים, באותה ישיבה

> ⚠️ **רוטציה של המפתח הופכת כל גיבוי קיים לבלתי-ניתן לפענוח.** ההצפנה החדשה חלה
> על גיבויים **עתידיים** בלבד; הארטיפקטים שכבר קיימים הוצפנו במפתח הישן, ואחרי
> הרוטציה הוא איננו. עד שירוץ `backup.yml` הבא (ראשון 03:00 UTC) **יכולת השחזור
> בפועל היא אפס** — ושום דשבורד לא יאמר את זה. ראה `docs/INCIDENTS.md` #10.

הרוטציה אינה מסתיימת בהחלפת הסוד. שלושת הצעדים הם יחידה אחת:

1. **החלף את הסוד** — GitHub → Settings → Secrets → Actions → `BACKUP_PASSPHRASE`.
   (ניב בלבד. Claude Code לעולם לא מריץ `gh secret set` — `CLAUDE.md` §12.)
2. **הרץ גיבוי ידני מיד** — Actions → **Backup** → Run workflow. זהו הארטיפקט
   הראשון שהמפתח החדש פותח. אל תחכה ל-cron.
3. **הרץ Restore Drill מיד אחריו** — Actions → **Restore Drill** → Run workflow.
   ירוק = הוכחה שהמפתח החדש באמת מפענח. בלי הצעד הזה החלפת סוד ותקווה.

**אין "אעשה את 2–3 מחר".** החלון בין צעד 1 לצעד 3 הוא חלון שבו אין שחזור.

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

---

## התקנת git hooks (clone חדש)

מתי: אחרי `git clone`, או אם הופיע קומיט עם `HANDOFF*.md` / התאפשר force-push.

`core.hooksPath` הוא הגדרה **מקומית** ואינה עוברת ב-`clone`. clone בלי הפקודה הזו
רץ בלי שום הגנה, **בשקט**.

```bash
git config core.hooksPath .githooks
chmod +x .githooks/*
```

אימות שההתקנה תפסה:

```bash
git config --get core.hooksPath     # חייב להחזיר: .githooks
ls -l .githooks                     # שני הקבצים חייבים להיות -rwxr-xr-x
```

⚠️ **hook שאינו executable מדולג בשקט** — כלומר fail-open בלי שום סימן. ה-`chmod` אינו אופציונלי.

### מה כל hook חוסם

| hook | חוסם | הערה |
|------|-------|------|
| `pre-commit` | `HANDOFF*.md` ב-staging | `D` (מחיקה) מוחרג — הסרת HANDOFF מעוקב מותרת |
| `pre-push` | push שאינו fast-forward אל `main`, ומחיקת `main` המרוחק | ענפים אחרים, תגיות ו-push ראשון של ענף חדש — עוברים |

### בדיקת ה-hooks בלי לסכן את main

`pre-push` קורא מ-stdin `<local_ref> <local_sha> <remote_ref> <remote_sha>`, ולכן
אפשר לבדוק אותו ישירות — **לא מריצים `--force` על הענף החי בשביל בדיקה**:

```bash
HEAD_SHA=$(git rev-parse HEAD); OLD_SHA=$(git rev-parse HEAD~1)
# מקרה חוסם (לא-FF) — מצופה exit 1:
echo "refs/heads/main $OLD_SHA refs/heads/main $HEAD_SHA" | .githooks/pre-push origin url; echo $?
# מקרה עובר (FF תקין) — מצופה exit 0:
echo "refs/heads/main $HEAD_SHA refs/heads/main $OLD_SHA" | .githooks/pre-push origin url; echo $?
```

### עקיפה

`git commit --no-verify` / `git push --no-verify` — **חירום בלבד, ומתעדים ב-`docs/INCIDENTS.md`**.

מקרה שייראה כמו תקלה אבל אינו: `git commit --amend` על קומיט שכבר נדחף מייצר push
שאינו fast-forward ולכן ייחסם. זו התנהגות נכונה — ה-amend באמת משכתב היסטוריה שפורסמה.

מקרה fail-open מכוון: אם ה-commit המרוחק לא קיים מקומית, ה-hook מנסה `fetch` שקט
ואם עדיין חסר — **מזהיר וממשיך**. השרת דוחה non-FF בעצמו; חסימה כאן הייתה
false-positive בכל פעם ש-`origin/main` זז בלי fetch, ומאמנת להקליד `--no-verify` רפלקסיבית.

---

## 🐤 תרגיל הקנרית — לאמת שרשת ההתראות **מוסרת**

**למה זה קיים.** מצב היציבות של `failure-alert.yml` הוא **שתיקה**, ושתיקה
בלתי-ניתנת להבחנה מ-webhook מבוטל, מסוד SMTP שפג, או מ-`curl` שהדפיס «HTTP 401»
ויצא 0. נמדד 15.08: **1,460 ריצות `Failure Alert`, 299/300 מהאחרונות `skipped`,
התראה אמיתית אחת ב-7 ימים.** רשת שיורה פעם בשבוע ⛔ אינה ניתנת לאימות בהמתנה.

**T-A — התרגיל (חייבת להגיע התראה):**
1. Actions → `🐤 Canary Drill — התראת-בדיקה` → Run workflow → `mode=fail`.
2. הריצה נכשלת **בכוונה**. זו ⛔ אינה תקלה — ההודעה עצמה אומרת זאת.
3. תוך ~15 שניות חייבים להגיע **שניהם**: הודעת דיסקורד, **ומייל** שנושאו נושא
   את התג 🐤 (הנושא נבנה מ-`github.event.workflow_run.name`).
4. בריצת ה-`Failure Alert` שנוצרה, צעד `Delivery gate` חייב להדפיס
   **`channels delivered: 2/2`**.

**T-B — הבקרה השלילית (⛔ אסור שתיווצר התראה):**
מריצים שוב עם `mode=pass`. הריצה מסתיימת ירוקה, וריצת ה-`Failure Alert`
המתאימה חייבת להיות **`skipped` עם 0 צעדים**. ⚠️ **שער שיורה על ירוק גרוע
משער שקט**, כי הוא מאמן להתעלם. אם T-A עברה ו-T-B הפיקה הודעה — **עצור.**

### 🔴 מה עושים אם T-A ⛔ **לא** הגיעה

⚠️ **זו תקלת פרודקשן חיה, ⛔ לא באג בקנרית.** משמעותה: כשל אמיתי שקרה עד היום
⛔ לא דווח לאיש. ⛔ **אל תתקן את הקנרית כדי ש"תעבור".**

1. פותחים את ריצת ה-`Failure Alert` שנוצרה (Actions → Failure Alert → העליונה).
   **⛔ לא נוצרה ריצה כלל?** ⇒ ה-`workflow_run` לא ירה: בדוק שהשם ב-
   `.github/workflows/canary.yml` (`name:`) **זהה בית-בית** לשם ברשימה
   `workflows: [...]` שב-`failure-alert.yml`. אימוג'י או מקף שונה = אין התאמה.
2. **`Delivery gate` הדפיס `0/2`** ⇒ שני הערוצים מתים. בדוק לפי הצעדים:
   · `Report to Discord` עם `HTTP 401/404` ⇒ **`SENTINEL_DISCORD_WEBHOOK` בוטל**
     — צור webhook חדש בדיסקורד והחלף את הסוד (**ניב בלבד**, §12).
   · `Email failure alert` אדום/דילג ⇒ `MAIL_USERNAME`/`MAIL_PASSWORD`. סיסמת
     האפליקציה של Gmail פגה או בוטלה ⇒ הנפק חדשה והחלף (**ניב בלבד**).
3. **`1/2`** ⇒ ערוץ אחד חי. ⛔ אל תסתפק — תקן את השני; שתי שכבות, ⛔ לא אחת.
4. אחרי כל תיקון סוד — **הרץ T-A שוב**. תיקון ⛔ אינו מאומת עד שהודעה הגיעה.
5. תעד ב-`docs/INCIDENTS.md` **באותו קומיט** של התיקון.

**מתי מריצים:** `C-026` — חודשי, **ובכל** נגיעה ב-`failure-alert.yml`,
ב-`canary.yml`, או בסודות `MAIL_*` / `SENTINEL_DISCORD_WEBHOOK`.

⛔ **אין ל-`canary.yml` `schedule:` ואין `push:` — `workflow_dispatch` בלבד.**
טריגר אוטומטי יהפוך את הריפו למתריע-על-עצמו בטיימר, וזה נשקל ונפסל.

---

## 📡 ערוצי התראה — מי חי, מה מוכיח זאת, ומי מת בסיבוב

**למה זה קיים.** `B-309` מדד ששלוש תצורות ניטור קריטיות חיות **בקונסולה של ספק**
⇒ ⛔ אין דיף · ⛔ אין כשל · ⛔ אין מה לקרוא בתחילת סשן. הסעיף הזה הוא ה**הצהרה
הנכתבת בריפו** על מה שמוגדר בחוץ. ⛔ **הוא תיעוד ו⛔ לא אכיפה** — ⛔ אף שער ⛔ אינו
קורא אותו, ולכן הוא סוגר את `B-309` **חלקית בלבד**.

⛔ **⛔ נכתב כאן URL, טוקן או webhook — שם · ערוץ · תאריך בלבד.**

| ערוץ | איפה הקונפיג חי | מה מוכיח שהוא חי | אימות אחרון | מי מת אם מסובבים |
|------|------------------|-------------------|--------------|-------------------|
| **דיסקורד — CI** (בוט `swing edge`) | **GitHub → Repo Secrets** · `SENTINEL_DISCORD_WEBHOOK` | תרגיל הקנרית T-A (§🐤) ⇒ `channels delivered: 2/2` | 🔴 **⛔ נמדד ב-`D-076`.** הבוט **נצפה פעיל מ-27.07**; ההרצה האחרונה של הקנרית ⛔ אינה מתועדת ⇒ `C-026` | **14 workflows** — `sentinel` · `failure-alert` · `watchdog` · `daily-digest` · `fleet-daily` · `fleet-weekly` · `backup` · `restore-drill` · `triage` · `analyst` · `arch-auditor` · `data-guardian` · `email-campaign` · `user-analytics` |
| **דיסקורד — דפדפן המשתמש** (בוט `SwingEdge Boundary`) | **Vercel → Project Env** · `SENTINEL_DISCORD_WEBHOOK` (Production) | `POST /api/alert` ⇒ `200 {"ok":true,"discord":204}` **וגם** הודעה **שנראתה בעין** בערוץ. 🔴 **`204` לבדו ⛔ אינו הוכחה** — הוא מודד את המשגר (`C-026`) | ✅ **09.09** — נצפה בעין ב-`#general` (`D-076`) | `api/alert.js` בלבד ⇒ **כל 5 גבולות הפאנלים** מאבדים את הערוץ לאדם; Sentry ממשיך לתייק |
| **מייל כשל CI** | **GitHub → Repo Secrets** · `MAIL_USERNAME` · `MAIL_PASSWORD` | קנרית T-A ⇒ מייל שנושאו נושא 🐤 | 🔴 **⛔ נמדד ב-`D-076`** ⇒ `C-026` | `failure-alert.yml` — הערוץ ה**שני** של כל 14 ה-workflows |
| **Sentry** | **קונסולת הספק** + DSN בבנדל | ⛔ **⛔ ניתן לאימות מהריפו** — `B-309` | ⛔ — | כל תיוק השגיאות מהדפדפן |
| **UptimeRobot** | **קונסולת הספק** | ⛔ **⛔ ניתן לאימות מהריפו** — `B-309` | ⛔ — | ניטור הדומיין |

### 🔴 לפני שמסובבים את `SENTINEL_DISCORD_WEBHOOK` — קרא את זה

🔴 **אותו שם משתנה נושא כיום שני ערכים נפרדים בשתי מערכות סודות** (GitHub Actions
**וגם** Vercel Project Env). ⇒ **סיבוב במערכת אחת משאיר את השנייה מתה בשקט**,
והשקט ⛔ אינו ניתן להבחנה מ«אין תקלות» — `B-310`.

**סדר הפעולות, ⛔ בלי דילוג (ניב בלבד, §12):**

1. צור webhook חדש בדיסקורד.
2. החלף אותו **בשתי** המערכות — GitHub Repo Secrets **וגם** Vercel Project Env.
3. **Vercel דורש פריסה מחדש** — הסוד נקרא ב-module scope (`api/alert.js:32`)
   ונצרב בפונקציה; החלפה בלי פריסה ⛔ אינה מגיעה לקוד הרץ.
4. אמת **את שניהם בעין**, ⛔ אחד: קנרית T-A ל-Actions · `POST /api/alert` ל-Vercel.
   ⛔ **`1/2` ⛔ אינו סיום** — זו בדיוק התבנית ש-`B-310` מתאר.
5. תעד ב-`docs/INCIDENTS.md` באותו קומיט.

⚠️ **ואם `POST /api/alert` מחזיר `500 config_error`** — המשתנה ⛔ הגיע לפריסה.
נמדד 09.09: זה קרה, והענף **ירה בקול** (`console.error` גריפ-אבל) ⛔ ולא בשקט.
הסיבות המייצרות בדיוק את התסמין: הסוד הוגדר ל-Preview/Development ⛔ ולא
ל-Production · פריסה מחדש שרצה ממטמון build · הדומיין מצביע לפריסה קודמת.

