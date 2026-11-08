# Running Prajzo: backups, restores, crashes and accounts

This is the how-to for looking after the running website. Settings are in [ENVIRONMENT.md](ENVIRONMENT.md), first-time setup in [SETUP.md](SETUP.md), and the reasons behind each choice in [DECISIONS.md](DECISIONS.md).

Two files in the project folder can be **double-clicked** instead of typing commands:

| File | What it does |
|---|---|
| `Create admin account.cmd` | Creates an administrator, or sets a new password for one |
| `Back up the database.cmd` | Makes a backup in `apps/api/backups/` |
| `Set up email.cmd` | Turns on real email sending through contact@prajzo.com (section 6) |
| `Change database password.cmd` | Puts a new Atlas password into this computer's settings, after checking it connects |
| `Prepare staging settings.cmd`, `Prepare live settings.cmd` | Make the settings files to paste into Hostinger ([DEPLOYMENT.md](DEPLOYMENT.md)) |

## 1. Backups (D-059)

A backup is a folder with one compressed file per collection and a `manifest.json` that lists each collection's document count, indexes and a checksum. Dates, ids and numbers are kept with their exact types.

```
npm run db:backup -w @prajzo/api
npm run db:backup -w @prajzo/api -- --out D:\prajzo-backups\before-launch
```

- Without `--out` the folder is `apps/api/backups/<database>-<India date and time>`. Git ignores that folder.
- **A backup holds every customer's personal data and their sign-in sessions.** Keep it somewhere only you can reach (not a shared drive, not email, never git), and delete old ones. The Privacy Policy promises that data is deleted after a time; old backups count.
- It works on any MongoDB, including Atlas's free tier, and needs nothing installed beyond the project.
- The database is read while the website keeps running. A change made during the backup may or may not be in it.

Atlas also keeps its own backups on paid tiers. The free tier (M0) does not, so this command is the backup until the hosting is set up (Phase 7 schedules it).

## 2. Restoring

```
npm run db:restore -w @prajzo/api -- <backup folder> --into <database name>
```

- It always checks every file against the manifest first. A changed, damaged or missing file stops it before anything is written.
- **Safe by default:** it refuses to write into a collection that already has data. Restore into a new name first (for example `--into prajzo-restored`), look at it, and only then decide to replace the live one.
- To replace the live database: **stop the website first** (`npm run host:stop`, or stop the app on the host), then add `--replace`:

  ```
  npm run db:restore -w @prajzo/api -- <backup folder> --into prajzo --replace
  ```

  The collections in the backup are dropped and written again; collections that aren't in the backup are left alone. After a restore everyone who signed in after the backup was made has to sign in again, and anything sent after it (project requests, messages) is gone. Then start the website again.

## 3. Rehearsing (do this once, and after big changes)

A backup you have never restored is a hope, not a backup.

```
npm run db:rehearse -w @prajzo/api
```

It backs up the database in `apps/api/.env` into a temporary folder, restores it into a separate database `<name>-restore-rehearsal`, compares every document and index, and then deletes both. The real database is only read. The database user needs the Atlas role "Read and write to any database" (the default) to create and remove the rehearsal database.

**Done on 27 October 2026** against the Atlas database `prajzo`: 9 collections, 22 documents, identical after restoring.

If only `sessions` differs, someone used the website during the rehearsal: run it again.

## 4. When something breaks (D-058)

- **The API crashed:** it writes one `fatal` line ("The API crashed and is stopping") with the error and its stack, then exits so the host starts it again. Locally the log is `apps/api/logs/local-host.log`; start it again with `npm run host:local`.
- **A page broke for a visitor:** look for `A visitor's browser reported an error` (a warning) in the log. It has the error, the page's path, the browser type and the request id.
- **A visitor reports an error with a reference:** every response carries an `X-Request-Id`, and every log line written while answering it has the same id (`req.id`). Search the log for it.
- **"Atlas did not answer" / the health check says the database is disconnected:** Atlas is refusing this computer's address. In Atlas, open **Network Access → Add IP Address → Add Current IP Address**. A phone hotspot's address changes often.

## 5. Administrator accounts

- Create one, or set a new password: double-click `Create admin account.cmd`, or run `npm run admin:create -w @prajzo/api` in a terminal window. The password stays invisible while you type it.
- Administrators are signed out after 8 hours idle and 24 hours in total (D-051).
- There is no sign-up page for administrators and no "forgot password" for them; this command is the only way.

## 6. Email (D-060)

- **Turn on real sending:** double-click `Set up email.cmd` (or `npm run mail:setup -w @prajzo/api`). Give the mailbox (Enter for contact@prajzo.com), Enter for Hostinger's server, then the mailbox password (invisible while you type). It checks the password with Hostinger before saving, and can send you a test email. Restart the website afterwards.
- **Changed the mailbox password in Hostinger?** Run it again, or the website stops sending.
- **Check it is working:** the log says `Email sending is ready` at startup. `Email sending is NOT working` names what to check.
- **Turn sending off again:** set `MAIL_TRANSPORT=console` in `apps/api/.env`.
- **Spam:** prajzo.com already has SPF, DKIM and DMARC for Hostinger Mail. After a few weeks of real mail, DMARC can be tightened from `p=none` to `p=quarantine` in Hostinger's DNS settings.
