# Prajzo — Website Customization Platform

> A web-development studio platform where customers browse template categories and live demos,
> customize a template in a visual builder, preview it across desktop / tablet / mobile, and
> submit it as a tracked project request — while administrators manage each project through a
> defined workflow.

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white">
</p>

---

## ✨ Highlights

- **TypeScript monorepo** — a React + Vite web app (`apps/web`) and an Express + MongoDB API (`apps/api`) share schemas and validation rules through a common `packages/shared`, so the front-end and back-end agree by construction.
- **Visual builder & multi-device preview** — customers customize a template and preview it on desktop, tablet, and mobile before saving it to their account.
- **Project request workflow** — submitted requests move through a defined admin workflow (review, scope, price, delivery date, status tracking).
- **Quality gate on every commit** — a single `npm run check` runs type-checking, linting, format-checking, the full test suite, and a production build; GitHub CI runs the exact same command on every pull request.
- **Documented engineering** — roadmap, architecture, decisions, environment, and setup are all version-controlled under `docs/`.

## 🧰 Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React, Vite, TypeScript |
| **Backend** | Node.js, Express, MongoDB (Atlas) |
| **Shared** | TypeScript schemas & validation (`packages/shared`) |
| **Tooling** | npm workspaces (monorepo), ESLint, Prettier, Vitest, GitHub Actions CI |

## 🚀 Quick Start

```bash
npm install
npm run dev
```

| Address | What it is |
|---|---|
| http://localhost:5173 | The web app |
| http://localhost:4000/api/health/ready | API readiness (including the database) |

> Requires Node.js 24 and a MongoDB Atlas connection string — see [`docs/SETUP.md`](docs/SETUP.md).

Full roadmap, architecture, and setup documentation are below.

---

<details>
<summary><strong>📖 Full documentation</strong> (click to expand)</summary>


Prajzo is a web development studio and website customization platform. Customers will be able to explore website categories and five live demo websites, customize a template in a visual builder, preview it on desktop, tablet and mobile, save it to their account, submit it as a project request, and follow the project's status. Prajzo's administrators review each request, confirm scope, price and delivery date, and move the project through a defined workflow.

Private repository: https://github.com/prajwal988660-dot/prajzo-platform

## Status (17 October 2026)

| Phase | State |
|---|---|
| 0: Discovery and plan | Done and approved |
| 1: Foundation | **Done. Waiting for your approval** (pull request `phase-1-foundation`) |
| 2: Public website and service catalogue | Next, after your approval and your MongoDB Atlas connection string |

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

</details>
