# Restoring a Supabase backup

Weekly backups are produced by [`.github/workflows/backup.yml`](workflows/backup.yml)
and stored as **encrypted GitHub Actions artifacts** (30-day retention). Each
artifact holds one file: `supabase-backup-YYYY-MM-DD.pgcustom.gz.enc`
(Postgres custom-format dump → gzip → AES-256-CBC / PBKDF2).

## 1. Download

GitHub → **Actions** → **Supabase Backup** → open a run → download the artifact,
then unzip it to get the `.enc` file.

## 2. Decrypt + restore (one line)

Needs the same `BACKUP_PASSPHRASE` the workflow used, the `pg_restore` client
(PostgreSQL 17), and a target session-pooler URL (port 5432).

```bash
export BACKUP_PASSPHRASE='<the passphrase>'
openssl enc -d -aes-256-cbc -pbkdf2 -in supabase-backup-YYYY-MM-DD.pgcustom.gz.enc -pass env:BACKUP_PASSPHRASE \
  | gunzip \
  | pg_restore --no-owner --clean --if-exists --dbname "$TARGET_DB_URL"
```

Prefer a two-step restore if the pipe is unreliable on your machine:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in supabase-backup-YYYY-MM-DD.pgcustom.gz.enc -pass env:BACKUP_PASSPHRASE | gunzip > dump.pgcustom
pg_restore --no-owner --clean --if-exists --dbname "$TARGET_DB_URL" dump.pgcustom
```

Drop `--clean --if-exists` when restoring into a fresh, empty database.

> The passphrase is the **only** key to these backups. If it is lost, the dumps
> are unrecoverable — keep it in a password manager.
