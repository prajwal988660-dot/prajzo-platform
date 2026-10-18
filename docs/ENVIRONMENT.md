# Prajzo environment variables

Secrets and settings live in environment variables, never in code.

## Rules

- **The API reads its settings from `apps/api/.env`.** That file is never committed: `.gitignore` excludes it from Phase 1 on.
- **`apps/api/.env.example` is committed.** It lists every key with a safe placeholder value. You copy it to `.env` and fill it in.
- **The API checks every setting at startup** and refuses to start if a required one is missing or invalid. The error names the bad setting but never prints its value.
- **The web app has no secrets.** In development, Vite forwards `/api` to the API, so the browser needs no API address either.
- **Production values are set only in the hosting provider's dashboard,** never in a file in the repository.

## Minimum for local development (Phases 1–3)

| Variable | Example | Required | Notes |
|---|---|---|---|
| `NODE_ENV` | `development` | Yes | `development`, `test` or `production` |
| `PORT` | `4000` | Yes | Port the API listens on |
| `APP_ORIGIN` | `http://localhost:5173` | Yes | Address of the web app; used for links in emails and the `Origin` check |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/prajzo` | Yes | Local server, or your Atlas connection string (Q2) |
| `SESSION_SECRET` | 64 random hex characters | Yes | Generate one with the command below; use a different value in production |
| `LOG_LEVEL` | `info` | No | `debug`, `info`, `warn` or `error` |
| `TRUST_PROXY` | `false` | No | Set to `true` only behind a hosting provider's proxy (production) |
| `WEB_DIST_DIR` | (unset) | No | Production only: where the built web app is. Defaults to `apps/web/dist` |
| `DNS_SERVERS` | `1.1.1.1,8.8.8.8` | No | DNS servers for looking up `mongodb+srv://` addresses. Only needed when the API log shows `querySrv ECONNREFUSED` (a known Node.js-on-Windows problem; set on this PC) |

On this machine `apps/api/.env` already exists, with a generated `SESSION_SECRET`. `MONGODB_URI` stays empty until you add your Atlas connection string ([SETUP.md](SETUP.md), step 1).

If a variable is set both in the real environment and in `.env`, the real environment wins. That makes it easy to try a different database for one run without editing the file.

To generate a secret, run:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Added in later phases

| Phase | Variables | Purpose |
|---|---|---|
| 2 (added) | `ADMIN_NOTIFY_EMAIL` (default: contact@prajzo.com) | Where contact-form notifications go. In development they are printed to the API console, not sent |
| 2 (added) | `CONTACT_RATE_LIMIT_MAX` (default `5`) | Contact-form messages allowed per connection every 15 minutes |
| Later | `MAIL_TRANSPORT` (`console` / `smtp`), `MAIL_FROM` | Real email sending through your provider |
| 3 | `SESSION_TTL_HOURS`, `ADMIN_SESSION_TTL_HOURS` | Session lifetimes (sensible defaults built in) |
| 4 | `DEMO_SUBMISSION_TTL_DAYS` (default `7`) | How long demo form submissions are kept |
| 5 | `STORAGE_DRIVER` (`local`), `UPLOAD_DIR`, `MAX_UPLOAD_MB` (default `5`) | Image uploads in development |
| 13 | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Real email through your provider |
| 13 | `STORAGE_DRIVER` (`s3`), `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `PUBLIC_ASSET_BASE_URL` | Cloud image storage (or `CLOUDINARY_URL` if Cloudinary is chosen) |
| 13 | `TRUST_PROXY` (`true`) | Correct client IPs behind the host's proxy, needed for rate limits and secure cookies |

## Production checklist (Phase 13)

- `NODE_ENV=production`
- `APP_ORIGIN` set to your real address, for example `https://prajzo.com`
- A new, long `SESSION_SECRET` that has never been used in development
- `MONGODB_URI` for the Atlas production cluster, with its own database user and a strong password
- SMTP and storage credentials from your providers
- `TRUST_PROXY=true`

## Things that are not environment variables

- **Admin credentials.** Admins are created with `npm run admin:create`, which asks interactively. No admin email or password is ever stored in a file.
- **Test settings.** Tests start their own in-memory MongoDB and use built-in test values. `npm install` downloads the MongoDB binary they use (about 75 MB, cached in `node_modules/.cache`), which needs internet once.
