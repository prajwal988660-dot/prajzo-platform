# Putting Prajzo online (Render + Hostinger + Atlas)

Decided 27 October 2026 (D-061): the website runs on **Render**, the domain, DNS and email stay at **Hostinger**, and the database stays on **MongoDB Atlas**. Hostinger's Premium plan has "No Web Apps", so it can't run the site itself.

| | Staging (test copy) | Live |
|---|---|---|
| Address | https://staging.prajzo.com | https://prajzo.com (and www) |
| Render service | `prajzo-staging`, free plan | `prajzo-live`, Starter plan (always on) |
| Database | `prajzo-staging` | `prajzo-live` |
| Who can see it | Only people with the staging user name and password | Everyone |
| Settings file | `Prepare staging settings.cmd` | `Prepare live settings.cmd` |

The free plan sleeps after 15 minutes without visitors, and the next visit waits about a minute. That is fine for staging and not for the live site.

Every setting is explained in [ENVIRONMENT.md](ENVIRONMENT.md); day-to-day running in [OPERATIONS.md](OPERATIONS.md).

## How Render builds and runs the site

These are set on each Render service (done for you when the service is created):

- Region: Singapore (closest to India)
- Build command: `npm ci --include=dev && npm run build` (the build needs the development tools; `npm run build` also checks the result has no source maps or development code)
- Start command: `npm start`
- Health check: `/api/health`
- `NODE_VERSION=24`, matching `.nvmrc`
- `MONGOMS_DISABLE_POSTINSTALL=1`: the test database (700+ MB) is a test tool and is not downloaded on Render

Everything else, including every secret, comes from the settings file you paste in (below).

## Step by step

### 1. Change the database password (once, before anything goes online)

The current password was once pasted into a chat, so it is changed before the database is opened to Render.

1. Double-click **`Change database password.cmd`**. It shows what to click in Atlas: Security, Database Access, Edit, Edit Password, Autogenerate, Copy, Update User.
2. Paste the new password into the window (right-click or Ctrl+V; nothing shows) and press Enter. It connects to check the password, then saves it.

### 2. Turn on email (optional for staging, needed for live)

Double-click **`Set up email.cmd`** and give the contact@prajzo.com password. See OPERATIONS.md, section 6.

### 3. Let Render read the repository

The repository is private. In Render: **Account settings, then Git providers** (or "New, then Web Service" and "Configure account" under GitHub). Give Render access to `prajwal988660-dot/prajzo-platform`. If your Render account is linked to a different GitHub account, add the `prajwal988660-dot` account too.

### 4. Staging

1. The `prajzo-staging` service is created (Claude does this with your OK).
2. Double-click **`Prepare staging settings.cmd`**. Write down the staging user name and password it shows.
3. Open `apps\api\.env.render-staging` in Notepad, select all, copy. In Render: `prajzo-staging`, **Environment**, **Add from .env**, paste, **Save, rebuild and deploy**.
4. Let Render reach the database. In Render: `prajzo-staging`, **Connect**, **Outbound**: copy each IP range. In Atlas: **Security, Network Access, Add IP Address**, one entry per range, comment "Render Singapore".
5. Custom address. In Render: `prajzo-staging`, **Settings, Custom Domains, Add**: `staging.prajzo.com`. In Hostinger: **Domains, prajzo.com, DNS / Nameservers**, add a **CNAME** record: name `staging`, target the `....onrender.com` address Render shows. Render then issues the HTTPS certificate by itself (a few minutes to an hour).
6. Open https://staging.prajzo.com, give the staging user name and password, and check it. Create the staging administrator with `npm run admin:create -w @prajzo/api` against the staging database (Claude can do this with you).

### 5. Live (only after you approve staging)

1. Back up the WordPress site in Hostinger if you want a copy (hPanel, Websites, prajzo.com, Backups). It only holds the sample post.
2. The `prajzo-live` service is created on the **Starter** plan (paid; Claude asks first).
3. Double-click **`Prepare live settings.cmd`**, paste `apps\api\.env.render-live` into `prajzo-live`, **Environment**, **Add from .env**. The Atlas IP ranges from step 4 already cover it if it's in the same region.
4. In Render: `prajzo-live`, **Custom Domains**: add `prajzo.com` and `www.prajzo.com`. Render shows the records to use.
5. In Hostinger DNS for prajzo.com:
   - Change the **A** record for `@` to the address Render shows, and **delete the other A record**.
   - **Delete both AAAA records** (they point at the WordPress server; if they stay, visitors with IPv6 still see WordPress).
   - Change the `www` record to a **CNAME** to the address Render shows.
   - **Do not touch the MX, TXT (SPF, DMARC) or `_domainkey` records.** They are the email; changing them stops contact@prajzo.com.
6. Wait for Render to show the domains as verified with certificates, then open https://prajzo.com.
7. Create your live administrator account against `prajzo-live`.
8. Run the smoke test (Claude runs it): every page opens, sign-up and sign-in work, a project request and a contact message arrive, and the emails really come.

### Afterwards

- Delete `apps\api\.env.render-staging` and `.env.render-live` once Render has the settings (Render keeps them). Making them again gives new secrets and signs everyone out.
- Hostinger's Premium plan is still needed for the domain's DNS and the mailbox. The WordPress files can be deleted later in hPanel.
