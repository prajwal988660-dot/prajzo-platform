# Putting Prajzo online (Hostinger Business + Atlas)

Decided 7 November 2026 (D-065, replacing D-061): the website runs on **Hostinger Business**, as a
Node.js web app in hPanel, next to the domain, DNS and mailbox you already have there. The database
stays on **MongoDB Atlas**. Billing is in rupees, and no card in US dollars is needed.

> **Before any of this: upgrade the plan.** Hostinger **Premium cannot run the site** — it has "No
> Web Apps". Everything below needs **Business Web Hosting** (or a Cloud plan). Nothing here can be
> done until the upgrade is on the account. Tell Claude once it is.

| | Staging (test copy) | Live |
|---|---|---|
| Address | https://staging.prajzo.com | https://prajzo.com (and www) |
| Hostinger web app | `prajzo-staging` | `prajzo-live` |
| Database | `prajzo-staging` | `prajzo-live` |
| Who can see it | Only people with the staging user name and password | Everyone |
| Settings file | `Prepare staging settings.cmd` | `Prepare live settings.cmd` |

Each plan includes a set number of web apps. Business includes enough for both, but if hPanel says
the limit is reached, remove an unused app first.

Every setting is explained in [ENVIRONMENT.md](ENVIRONMENT.md); day-to-day running in
[OPERATIONS.md](OPERATIONS.md).

## How Hostinger builds and runs the site

Set these in the **Deploy** panel when the app is created:

| Field in hPanel | Value |
|---|---|
| Framework preset | **Other** (this is a plain Express server, not Next.js) |
| Branch | `main` (only after the phase branches are merged; until then, the branch you are putting online) |
| Node.js version | **22** (LTS). `.nvmrc` says 24, which Hostinger also offers; 22 is the safer default and the code runs on both. |
| Package manager | **npm** (detected from `package-lock.json`) |
| Build command | `npm ci --include=dev && npm run build` |
| Entry file | `apps/api/dist/server.js` |
| Output directory | leave empty — this is a server app, not a static site |

Why the build command needs `--include=dev`: the build uses TypeScript, Vite and esbuild, which are
development dependencies. `npm run build` also checks the result has no source maps and no
development code (D-037).

Two things to know about how Hostinger runs it:

- **The port comes from the environment.** The server already listens on `process.env.PORT` and binds
  to every interface, so it works without a code change. If a build goes green but the site does not
  answer, this is the first thing Hostinger support will ask about.
- **The app sleeps when nobody visits.** After a quiet period the process is stopped, and the next
  visit starts it again (a few seconds). That is fine for both sites here. It also means
  **nothing may rely on a background timer**: the hourly jobs are started by requests, not by a
  clock, and the 7-day deletion of demo messages is done by the database's own expiry, not by us.

## Step by step

### 1. Upgrade to Business

hPanel, **Hosting**, **Change plan**. Done by you; everything below waits for it.

### 2. Change the database password (once, before anything goes online)

The current password was once pasted into a chat, so it is changed before the database is opened to
the internet.

1. Double-click **`Change database password.cmd`**. It shows what to click in Atlas: Security,
   Database Access, Edit, Edit Password, Autogenerate, Copy, Update User.
2. Paste the new password into the window (right-click or Ctrl+V; nothing shows) and press Enter. It
   connects to check the password, then saves it.

### 3. Turn on email (optional for staging, needed for live)

Double-click **`Set up email.cmd`** and give the contact@prajzo.com password. See OPERATIONS.md,
section 6. The mailbox is already on Hostinger, so nothing about email changes when the site moves.

### 4. Let Hostinger read the repository

The repository is private. In hPanel: **Websites**, **Add Website**, **Node.js web app**, then
**Connect with GitHub**. Install the Hostinger GitHub App and give it access to
`prajwal988660-dot/prajzo-platform` only.

### 5. Staging

1. Create the app as above, named `prajzo-staging`, with the settings from the table.
2. Double-click **`Prepare staging settings.cmd`**. Write down the staging user name and password it
   shows.
3. Open `apps\api\.env.render-staging` in Notepad, select all, copy. In hPanel, open the app's
   **Environment variables** and paste them in. Hostinger rebuilds the app so the values take
   effect.
4. Let Hostinger reach the database. Atlas must allow the server's address: in hPanel find the
   website's **IP address**, then in Atlas go to **Security, Network Access, Add IP Address** and
   add it with the comment "Hostinger". (Shared hosting addresses are stable, unlike your home
   connection.)
5. Custom address: in hPanel attach `staging.prajzo.com` to the app. Hostinger issues the HTTPS
   certificate itself.
6. Open https://staging.prajzo.com, give the staging user name and password, and check it. Create
   the staging administrator with `npm run admin:create -w @prajzo/api` against the staging database
   (Claude can do this with you).

### 6. Live (only after you approve staging)

1. Back up the WordPress site in Hostinger if you want a copy (hPanel, Websites, prajzo.com,
   Backups). It only holds the sample post.
2. **The domain is already used by the WordPress site.** hPanel expects a free slot for the domain,
   so remove that website first (after the backup). This is the step that takes prajzo.com down for
   a few minutes, so do it when a short gap does not matter.
3. Create the `prajzo-live` app the same way, with `prajzo.com` as its address.
4. Double-click **`Prepare live settings.cmd`** and paste `apps\api\.env.render-live` into the live
   app's **Environment variables**.
5. The Atlas entry from step 5.4 usually covers the live app too (same server). If the live app
   shows a different IP address, add that one as well.
6. DNS: because the app is on Hostinger, attaching the domain in hPanel sets the web records for
   you. Check in **Domains, prajzo.com, DNS / Nameservers** that `@` and `www` point at the app, and
   that there is **no leftover AAAA record** for the old WordPress server (visitors on IPv6 would
   still see WordPress).
   **Do not touch the MX, TXT (SPF, DMARC) or `_domainkey` records.** They are the email; changing
   them stops contact@prajzo.com.
7. Open https://prajzo.com, then create your live administrator account against `prajzo-live`.
8. Run the smoke test (Claude runs it): every page opens, sign-up and sign-in work, a project
   request and a contact message arrive, and the emails really come.

## Known gap: uploaded pictures

The builder lets a customer upload pictures (D-012), and they are written to the server's own disk
(`UPLOAD_DIR`). **A redeploy replaces the app's files, so uploads made before it would be lost.**
This does not block going live — the main website and the demos do not depend on it — but it must be
settled before customers are invited to save designs with their own pictures. The options, cheapest
first:

1. Keep them in MongoDB Atlas (GridFS), which is already backed up (D-059).
2. A Hostinger folder outside the app's own directory, if hPanel allows the app to write there.
3. An object store (Cloudflare R2, Backblaze B2), both of which have free tiers.

Option 1 needs no new account and is the likely answer; it is a change to `STORAGE_DRIVER`.

## Afterwards

- Delete `apps\api\.env.render-staging` and `.env.render-live` once Hostinger has the settings.
  Making them again gives new secrets and signs everyone out.
- The WordPress files can be deleted in hPanel once the new site has been live for a while.
- The settings files are still named `.env.render-*`; the contents suit either host, so they were
  left alone rather than renamed while PRs are open.
