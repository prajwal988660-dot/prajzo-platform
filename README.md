# Prajzo

Prajzo is a web development studio and website customization platform. Customers will be able to explore website categories and five live demo websites, customize a template in a visual builder, preview it on desktop, tablet and mobile, save it to their account, submit it as a project request, and follow the project's status. Prajzo's administrators review each request, confirm scope, price and delivery date, and move the project through a defined workflow.

## Status (17 October 2026)

| Item | State |
|---|---|
| Phase 0: discovery and plan | Done. Waiting for your approval. |
| Platform code | Not started. Nothing has been installed. |
| Earlier static marketing site | Still in this folder, unchanged. Runs at http://localhost:1234/ |

Start with [docs/ROADMAP.md](docs/ROADMAP.md).

## Documents

| File | Purpose |
|---|---|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases in order, what each delivers, approval gates, estimates, risks, open decisions |
| [docs/CHECKLIST.md](docs/CHECKLIST.md) | Task checklist, ticked only when work is finished and its tests have run |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the web app, API, database, templates and builder fit together; data model; API; security; testing |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Technical decisions and the reasons for them |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variables and how secrets are handled |
| [docs/SETUP.md](docs/SETUP.md) | Tools on this machine, what to install first, how to run things |

## What is in this folder today

This is the earlier static site, built before the platform plan. It stays exactly where it is until Phase 1. Then, with your approval, it gets a git baseline commit and moves to `legacy/static-site/` (see Q1 in the roadmap).

| Path | What it is |
|---|---|
| `index.html` | Single-file marketing site: HTML, CSS and JavaScript, 3,465 lines |
| `samples/` | 2 sample landing pages: `clinic-booking.html`, `invoicing-saas.html` |
| `logo.png` | Transparent 800 × 147 crop of the logo, used by the site |
| `Prajzo logo.png` | Original logo: 2752 × 1536 PNG, 3.8 MB, near-white (not transparent) background |
| `hero-work.jpg`, `hero-work-800.jpg` | Unsplash photo by Christopher Gower; no longer used by the site |
| `hero-bg.jpg`, `hero-bg-mobile.jpg` | Photos no longer used by the site; source not recorded |

Known issues in the static site, recorded so nothing is lost. They won't be fixed unless you ask, because the platform replaces this site:

- 4 of the 6 "View sample site" links return 404. `ceramics-store`, `fitness-app`, `contract-assistant` and `retreat-website` are not in `samples/`.
- The sign-in popup is a front-end demo only. No account is created.
- The proposal form needs a Web3Forms key that was never set, so it falls back to copying the brief.
- The WhatsApp number (`15550100123`), the contact email (`hello@prajzo.com`) and the social links are placeholders.
- A copy of the site is published as a private claude.ai artifact. Its last republish is still pending.

## Running the static site

```
python -m http.server 1234 --directory C:\dev\mine\prajzo
```

Then open http://localhost:1234/.
