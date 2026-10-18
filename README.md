# Prajzo

Prajzo is a web development studio and website customization platform. Customers will be able to explore website categories and five live demo websites, customize a template in a visual builder, preview it on desktop, tablet and mobile, save it to their account, submit it as a project request, and follow the project's status. Prajzo's administrators review each request, confirm scope, price and delivery date, and move the project through a defined workflow.

Private repository: https://github.com/prajwal988660-dot/prajzo-platform

## Status (18 October 2026)

| Phase | State |
|---|---|
| 0: Discovery and plan | Done and approved |
| 1: Foundation | Done and approved (merged 18 October 2026) |
| 2: Public website and service catalogue | **Done. Waiting for your approval** (pull request `phase-2-public-site`) |
| 3: Accounts and access control | Next, after your approval |

Plan and progress: [docs/ROADMAP.md](docs/ROADMAP.md) · [docs/CHECKLIST.md](docs/CHECKLIST.md)

## Quick start

You need Node.js 24 and a MongoDB Atlas connection string. Setting up the free database takes about 10 minutes; see [docs/SETUP.md](docs/SETUP.md).

```
npm install
npm run dev
```

| Address | What it is |
|---|---|
| http://localhost:5173 | The web app |
| http://localhost:5173/dev/ui | Design-system gallery and API connection check (development only) |
| http://localhost:4000/api/health/ready | API readiness, including the database |

Before every commit, and at the end of every phase:

```
npm run check
```

This runs the type check, lint, format check, all tests and the production build. GitHub runs the same command on every pull request.

## Repository layout

| Path | What it is |
|---|---|
| `apps/web` | React + Vite web app: public site, demos, builder and dashboards (as phases land) |
| `apps/api` | Express API with MongoDB |
| `packages/shared` | Schemas and rules shared by the web app and the API |
| `docs/` | Roadmap, checklist, architecture, decisions, environment, setup |
| `assets/brand/` | Original logo files |
| `legacy/static-site/` | The earlier single-file marketing site, kept unchanged |
| `.github/workflows/ci.yml` | Continuous integration: `npm run check` on every pull request |

## Documents

| File | Purpose |
|---|---|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases in order, what each delivers, approval gates, estimates, risks, decisions |
| [docs/CHECKLIST.md](docs/CHECKLIST.md) | Task checklist, ticked only when work is finished and its tests have run |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the web app, API, database, templates and builder fit together |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Technical decisions and the reasons for them |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variables and secrets |
| [docs/SETUP.md](docs/SETUP.md) | Machine setup, the database, commands, troubleshooting |

## The earlier static site

The site that existed before this platform now lives in `legacy/static-site/`, exactly as it was. It is no longer developed. To view it:

```
python -m http.server 1234 --directory C:\dev\mine\prajzo\legacy\static-site
```

Known issues there, kept for the record: 4 of its 6 "View sample site" links return 404; its sign-in popup is a front-end demo; its contact details and Web3Forms key are placeholders.
