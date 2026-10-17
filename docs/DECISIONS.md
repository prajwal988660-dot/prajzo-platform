# Prajzo decision log

This file records each important technical decision: what was decided, why, and what else was considered. New decisions are added at the end. A changed decision is not deleted; it is marked **Replaced by D-0xx**.

Every decision below was proposed in Phase 0 (17 October 2026). Each one becomes **Accepted** when you approve the plan.

---

### D-001: One repository with npm workspaces

- **Decision:** one repository with `apps/web`, `apps/api` and `packages/shared`, managed with npm workspaces.
- **Why:**
  - one install and one set of scripts
  - the browser and the server share the same validation code
  - npm is already installed, so no extra tool is needed
- **Considered:** separate repositories, which would make sharing validation awkward and versions drift; pnpm or Turborepo, which would be another tool to install and learn.

### D-002: Keep the existing static site

- **Decision:** before anything moves, run `git init` and commit the current static site as a baseline. Then move it to `legacy/static-site/` in Phase 1, where it stays and keeps working.
- **Why:** nothing is lost, its history is kept, and the platform gets a clean root folder.
- **Considered:** building the platform in a new sibling folder and leaving this one untouched. That's safe too, but splits the project in two. You choose (Q1).

### D-003: Current stable versions, TypeScript held at 6.0

- **Decision:** use the current stable releases checked on npm on 17 October 2026: React 19.3, Vite 8.3, Tailwind 4.3, React Router 8.4, Express 5.3, Mongoose 9.11, Zod 4.6, Vitest 5.0. Pin **TypeScript to 6.0.x**. The lockfile fixes exact versions.
- **Why:** typescript-eslint (8.71.2) supports TypeScript below 6.1, while npm's `latest` TypeScript is 7.0.2.
- **Revisit:** move to TypeScript 7 when the lint tooling supports it.
- **Considered:** TypeScript 7, which would break type-aware linting; older major versions, which would mean a migration soon.

### D-004: One shared website configuration format

- **Decision:** a website design is one JSON configuration (pages, sections, content and design settings). It is described by Zod schemas in `packages/shared`.
- **Where it's used:**
  - the builder, the preview, the live demos and the admin review all read it
  - the API validates it again on every save and every submission
- **Why:** one source of truth, and the server never trusts the browser.
- **Considered:** a separate format per template, which would duplicate validation and editors.

### D-005: Template designs live in code; admins manage the catalogue

- **Decision:** each template's design (React sections and styling) and its definition are written by developers and stored in the repository. Admins control the catalogue entry: publish or hide, featured, order, text, categories and preview image.
- **Why:** template code is reviewed, tested and versioned. Uploading arbitrary code through an admin panel would be a security risk.
- **Consequence:** a brand-new template design needs a developer.

### D-006: The preview runs in a same-site frame

- **Decision:** the builder shows `/preview` in an iframe and sends it the current configuration with `postMessage` (same origin only). The same site renderer powers `/demo/:key`.
- **Why:** the frame really is 390, 768 or 1280 px wide, so mobile and tablet layouts behave exactly as on real devices. Styles can't leak between the builder and the preview.
- **Considered:** rendering inside the builder page with CSS container queries. It's lighter, but every template would have to avoid viewport units and fixed positioning, and fidelity would be easier to break.

### D-007: The five demos are the first five templates

- **Decision:** each demo route renders its template's default configuration, and "Customize This Design" starts the builder from that same configuration.
- **Why:** the demo and the starting point of customization can never drift apart, and there's no duplicated demo code.

### D-008: Build order

- **Decision:** the order is:
  1. the template engine and the Portfolio demo
  2. the builder core
  3. Business, Event, Catalogue and Forms, each finished completely, including its builder integration, before your approval
- **Why:** every demo needs a working "Customize This Design" button, and the template format gets tested by the builder early.
- **Considered:** all five demos first, then the builder. The demos would sit incomplete for longer, and problems with the template format would show up late. You choose (Q4).

### D-009: Sessions stored on the server

- **Decision:** express-session with connect-mongo. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Passwords are hashed with argon2id.
- **Why:** sessions can be ended immediately (logout, password change, a disabled account), and page scripts can't read the cookie.
- **Considered:** JWTs in localStorage, which any injected script could read; JWTs in cookies, which are harder to revoke.

### D-010: One address in production

- **Decision:** the Express service also serves the built web app.
- **Why:** there are no cross-site (CORS) rules to maintain, cookies stay simple, and there's one deployment to manage.
- **Considered:** a separate static host plus an API host. That needs CORS and careful cross-site cookie settings.

### D-011: Admin accounts only from a setup script

- **Decision:** there is no public admin registration. `npm run admin:create` asks for the email and password interactively (the password is hidden), and no credentials are stored in code or in committed files.
- **Why:** the brief requires it, and it removes a whole class of privilege-escalation bugs.

### D-012: Image uploads

- **Decision:** uploads have these rules:
  - signed-in users only
  - JPEG, PNG or WebP only, at most 5 MB
  - the type is checked from the file's content
  - images are re-encoded with sharp, which also strips location data
  - files get random names
  - SVG is refused
- **Storage:** behind one interface, with local disk in development and a cloud bucket in production (chosen in Phase 13).
- **Why:** this blocks disguised files and script-carrying images, and keeps storage costs predictable.

### D-013: Email

- **Decision:** Nodemailer. A console mailer in development, a capturing mailer in tests, and SMTP through a provider in production.
- **Why:** it works with any provider, and development and tests don't depend on an outside service.

### D-014: How live demos behave

- **Decision:**
  - Every demo shows a persistent "Demo website by Prajzo" bar.
  - All names, companies and products are fictional.
  - Addresses use `example.com`.
  - No real person's photo stands in for a fictional person.
  - Testimonials and sample products are labelled.
  - Demo forms really submit to `/api/v1/demo-submissions` (validated and rate-limited). They show success only after the server confirms, and an error otherwise.
  - Demo submissions are deleted automatically after 7 days.
  - Email, phone and WhatsApp buttons show what would happen instead of contacting anyone.
- **Why:** the demos are genuinely functional without misleading anyone, and without sending messages to real numbers.

### D-015: Prices and delivery targets

- **Decision:**
  - Packages are stored in the database with admin-editable prices, shown as "Request a quote" until you set them.
  - The 24-hour, 3-day and 7-day delivery targets are always shown with their conditions: scope, content readiness, integrations, testing and approval.
  - A confirmed delivery date exists only after an admin sets it.
- **Why:** the brief says not to invent prices or promise dates before a review.

### D-016: Features appear only when they work

- **Decision:** navigation links and buttons are added in the phase in which their destination works. Until then, Home shows a working "Contact us" button in place of "Build Your Website" and "Explore Templates".
- **Why:** there are never any dead links or placeholder buttons, even during development.

### D-017: Test tools

- **Decision:**
  - Vitest for unit, integration and component tests, with Supertest, mongodb-memory-server and Testing Library
  - Playwright with axe for end-to-end, responsive and accessibility checks, using the installed Chrome
- **Why:** there's one test runner across the repository, and tests run against a real (in-memory) MongoDB, so your data is never touched.

### D-018: Money and time

- **Decision:** amounts are stored as whole paise (`INR`). Times are stored in UTC and shown in India Standard Time.
- **Why:** no rounding errors and no time-zone confusion.

### D-019: Self-hosted fonts

- **Decision:** the Prajzo interface fonts and the fonts offered in the builder are self-hosted (@fontsource), not loaded from Google Fonts.
- **Why:** visitors' IP addresses aren't sent to a third party, the content security policy stays simple, and tests work offline.

### D-020: Project status workflow

- **Decision:** the 11 statuses and the transition table in [ARCHITECTURE.md §8](ARCHITECTURE.md#8-project-status-workflow), enforced on the server, with a history entry (who and when) for every change.
- **Status:** proposed; to be confirmed with you before Phase 10.
