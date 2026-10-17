# Prajzo setup

## This machine (checked 17 October 2026)

| Tool | Found | Notes |
|---|---|---|
| Windows 11 Pro | 10.0.26200 | |
| Node.js | 24.17.0 | LTS line; meets Vite 8 and Mongoose 9 (Node ≥ 20.19) |
| npm | 11.13.0 | Workspaces built in |
| corepack | 0.35.0 | Not needed (no pnpm or yarn) |
| Git | 2.54.0 | **`user.name` and `user.email` are not set**; see step 1 below |
| GitHub CLI | 2.95.0 | Logged in, with repo and workflow access; useful later for a private repo and CI |
| Python | 3.14.6 (with Pillow) | Serves the current static site; used for image checks |
| winget | 1.29.380 | Can install MongoDB (see step 2) |
| Google Chrome, Microsoft Edge | Installed | Playwright end-to-end tests can use Chrome |
| MongoDB server, mongosh | **Not installed** | See step 2 |
| Docker | Not installed | Not required |
| Hardware | 15.7 GB RAM, 8 logical CPUs, 42.6 GB free on C: | Enough for the dev servers, in-memory test databases and Playwright |
| Ports | 4000, 5173, 27017 free; 1234 in use | 1234 is the static-site server |

## Before Phase 1

### 1. Set your git identity

Commits need your name and email. They aren't set on this machine yet.

```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 2. Choose a development database (Q2)

**Option A (recommended): MongoDB Community Server on this machine.**

```
winget install --id MongoDB.Server --exact
```

- This currently installs MongoDB 9.0.2 as a Windows service, and Windows will ask for administrator permission.
- **Optional:** install MongoDB Compass, a visual tool for viewing your data, with `winget install --id MongoDB.Compass.Community --exact`.
- **Connection string:** `MONGODB_URI=mongodb://127.0.0.1:27017/prajzo`

**Option B: a free MongoDB Atlas cluster in the cloud.**

1. Create an Atlas account.
2. Create a free cluster.
3. Create a database user.
4. Allow your current IP address.
5. Copy the connection string into `MONGODB_URI`.

This needs internet whenever the API runs.

**Either way, tests don't use this database.** They start their own in-memory MongoDB.

## The current static site

Already running on port 1234. To start it again after a restart:

```
python -m http.server 1234 --directory C:\dev\mine\prajzo
```

Then open http://localhost:1234/. In Phase 1 it moves to `legacy/static-site/`, and this command changes to match.

## Platform commands (available from Phase 1)

These commands are planned and don't exist yet. This section will be updated as each one becomes real.

| Command | What it does |
|---|---|
| `npm install` | Installs everything for all workspaces |
| `npm run dev` | Starts the web app (http://localhost:5173) and the API (http://localhost:4000) together |
| `npm run check` | Type check, lint, unit and integration tests, production build; must pass at the end of every phase |
| `npm test` | Unit, integration and component tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run seed -w apps/api` | Loads categories, packages and template catalogue entries into the database (Phase 2 onward) |
| `npm run admin:create -w apps/api` | Creates an admin account interactively (Phase 3 onward) |
| `npm run capture:previews` | Captures template preview images from the live demos (Phase 4 onward) |
