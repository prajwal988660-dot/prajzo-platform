# Prajzo decision log

This file records each important technical decision: what was decided, why, and what else was considered. New decisions are added at the end. A changed decision is not deleted; it is marked **Replaced by D-0xx**.

D-001 to D-020 were proposed in Phase 0 and **accepted** when you approved the plan on 17 October 2026. The exceptions are D-008, which you changed (see D-025), and D-020, which you confirmed on 23 October 2026 ("workflow OK"). D-021 onwards were made during Phase 1.

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
- **Done (Phase 1):** baseline commit `45c8d7c`, then the move in `2588cee`. The original logo files are in `assets/brand/`.

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

### D-008: Build order (Replaced by D-025)

- **Decision (original proposal):** the order is:
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
- **Storage:** behind one interface, with local disk in development and a cloud bucket in production (chosen in Phase 9, with the builder).
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
- **Status:** **confirmed** by you on 23 October 2026 ("workflow OK"). Phase 4 used its first status and the cancellation rows; Phase 5 builds the rest. Small additions made while building Phase 5 are recorded in D-043.

---

## Phase 1 decisions (17 October 2026)

### D-021: Fonts are Inter and Sora

- **Decision:** Inter (variable) for interface and body text, Sora (variable) for headings. Both are self-hosted through `@fontsource-variable` packages (see D-019).
- **Why:**
  - Inter stays clear at small sizes in forms and dashboards.
  - Sora's geometric shapes suit the logo's technical style.
  - Both come as variable fonts, so each is one file per character set.
- **Considered:** Plus Jakarta Sans, Manrope, Space Grotesk.
- **Changing it later:** one line each in `apps/web/src/styles/index.css` (`--font-sans`, `--font-display`) plus the font package.

### D-022: How the code is built and run

- **Decision:**
  - `packages/shared` is used as TypeScript source, with no build step.
  - Vite builds the web app.
  - In development the API runs with `tsx watch`, which restarts it when a file changes.
  - For production, esbuild bundles the API into one file, `apps/api/dist/server.js`. The shared package is bundled in; npm packages stay external.
  - TypeScript only type-checks (`noEmit`).
- **Why:** there's no build order to remember, edits to shared rules show up instantly in both apps, and the production output is small (11 KB).
- **Considered:**
  - TypeScript project references with compiled packages: an extra build step, plus `.js` extensions in imports.
  - Node's built-in TypeScript support: it restricts syntax, and it still prints experimental warnings.

### D-023: Repository and review workflow

- **Decision:**
  - **Repository:** the code lives in the private GitHub repository `prajwal988660-dot/prajzo-platform`. The existing public `prajzo` repository is a different, older project and isn't touched.
  - **Approval gate:** each phase is built on its own branch and opened as a pull request. **Approving a phase means merging its pull request into `main`.**
  - **CI:** GitHub Actions runs `npm run check` on every pull request and on `main`.
  - **Commit author:** commits use your name and your GitHub no-reply address. This is set for this repository only, not globally.
- **Why:**
  - `main` only ever contains approved, tested work.
  - Each phase's changes can be reviewed in one place.
  - CI proves the build on a clean Linux machine, not just on this PC.
- **Note:** private repositories get 2,000 free GitHub Actions minutes a month. One CI run takes a few minutes.

### D-024: Development database and startup behaviour

- **Decision:**
  - Development uses a free MongoDB Atlas cluster (your answer to Q2).
  - If `MONGODB_URI` or another required setting is missing, the API refuses to start and names the setting.
  - If the database is only unreachable (for example, your IP address isn't allowed in Atlas), the API starts anyway. It reports "not ready" on `/api/health/ready` and retries every 10 seconds, logging what to check.
  - Tests never use Atlas; they use an in-memory MongoDB.
- **Why:** configuration mistakes fail loudly, while network problems recover by themselves without a restart.

### D-025: Build order, main website first (replaces D-008)

- **Decision:** your answer to Q4 was to build the main website first and the demos after. Phases 1–3 (foundation, public website, accounts) come first, as already planned.
- **Resolved on 23 October 2026:** you chose to finish and launch the main website first (D-036).

---

## Phase 2 decisions (18 October 2026)

### D-026: Low starting prices

- **Decision:** at your request ("make price in low range"), the packages start from:
  - **₹2,999** for Quick Launch
  - **₹7,999** for Professional Website
  - **₹19,999** for Advanced Development
- **How they're shown:** as "Starting from" prices. The final price is always confirmed in a written quote.
- **Where they live:** in the database, loaded from `apps/api/src/modules/catalogue/catalogue.defaults.ts`. Admins will edit them in Phase 5; until then, change that file and run `npm run seed -w @prajzo/api`.
- **Note:** at these prices, the delivery targets only work for projects whose content is ready. The quote stays the place to set the real price and date.

### D-027: Contact details and the "Start a Project" button

- **Decision:**
  - The public contact details live in one place, `packages/shared/src/site.ts`: contact@prajzo.com, +91 98866 07720 (phone and WhatsApp), Instagram @prajzoo.
  - Contact-form notifications go to the same email unless `ADMIN_NOTIFY_EMAIL` says otherwise.
  - Until the Start a Project page exists (Phase 4), the header's "Start a Project" button opens the Contact page.
- **Why:** the button is working and honest today. The Contact form is how projects start for now.

### D-028: Contact form protection

- **Decision:** the form has four protections:
  - a hidden spam-trap field
  - a limit of 5 messages per 15 minutes per connection
  - server-side checks that the chosen website type and package really exist
  - a saved consent time
- **If the email fails:** the message is still saved and the visitor sees a real success, because it was stored. The email failure is logged.

### D-029: Pages load on demand; browser tests in CI

- **Decision:** every page except Home loads its code only when it's opened, which cut the first download from 526 KB to about 260 KB (before compression). A thin progress bar shows while a page loads.
- **Testing:** Playwright end-to-end tests, including axe accessibility checks and a no-sideways-scrolling check, run on desktop and phone sizes in CI for every pull request.

### D-030: Local hosting before online hosting

- **Decision:** at your request ("host locally first"), Prajzo can run on your own computer the way a real server does:
  - `npm run host:local` builds it and starts one background Node process that serves the website and the API together on port 8080.
  - `npm run host:stop` stops it.
  - `SERVE_WEB_APP=true` (set by that command) makes the API serve the built website outside production. Production behaves as before.
- **Safety:** the saved process number is trusted only if that process is really the one listening on the port. After a restart of the computer an old number may belong to another program, and `host:stop` must never end that program.
- **Why on the same address:** the same setup is what Hostinger will run, so problems with the built site, cookies and routing show up here first.
- **Known limit:** your Atlas database only accepts internet addresses it knows. A phone hotspot changes address often, so the site will sometimes show "database disconnected" until the new address is added. The log says so. See [SETUP.md](SETUP.md), section 5.

---

## Phase 3 decisions (23 October 2026)

### D-031: Sessions, and separate sign-in for administrators

- **Decision:**
  - Sign-ins are server-side sessions stored in MongoDB. The browser holds only a random session ID in the cookie `prajzo.sid`: HttpOnly (page scripts can't read it), SameSite=Lax (not sent along with requests started by other sites), and Secure (https only) in production.
  - A **new session ID is issued at every sign-in**, so an old or planted ID can't be reused.
  - Sessions last 14 days since the last visit for customers and **8 hours** for administrators (`SESSION_TTL_DAYS`, `ADMIN_SESSION_TTL_HOURS`).
  - Administrators sign in only through `/admin/login` (their own endpoint), and customers only through `/login`. Each is refused on the other's route, with the same message as a wrong password.
  - Visitors who aren't signed in get no session and cause no database work.
- **Why:** a session can be ended on the spot (sign-out, password change, a disabled account), and splitting the two kinds of account removes a whole class of "customer becomes admin" mistakes.
- **Considered:** tokens kept in the browser's storage, which any injected script could read.

### D-032: Passwords

- **Decision:**
  - Passwords are stored only as **argon2id** hashes (64 MiB memory, 3 passes, 4 lanes).
  - Customers choose 10–128 characters, with at least 5 different ones (so "aaaaaaaaaa" is refused), and not one of a short list of very common passwords. There are deliberately no "must contain a capital, a number and a symbol" rules. Administrators need 12 or more.
  - Spaces are allowed, and passwords are never trimmed.
  - Signing in doesn't re-apply these rules, so older passwords still work.
  - Unknown emails take the same time as wrong passwords (a decoy hash is checked).
  - **Tests use cheaper hashing**, switched on explicitly by test code only. The real server never calls that switch, and a test proves the real settings stay strong.
- **Why:** this follows current guidance (length matters more than complexity rules), and hashing that is expensive on purpose slows down anyone who steals the database. Tests that hash hundreds of passwords in parallel made the browser tests time out.

### D-033: Protection against guessing and forged requests

- **Decision:**
  - **Rate limits** (default 10 per 15 minutes, `AUTH_RATE_LIMIT_MAX`): failed sign-ins are counted per connection and also per email address, so changing connection doesn't help a guesser. Successful sign-ins aren't counted. Sign-up and password-reset requests are limited too.
  - Requests that change data must carry an `Origin` header naming this website (the address it was reached on, or the public address). Requests with no Origin (tools like curl) can't ride on anyone's cookies, so they pass.
  - The "database unreachable" check runs before the limiters, so failed attempts during an outage never use up a visitor's allowance.
- **Why:** it stops password guessing and cross-site request forgery without extra tokens in every form.

### D-034: Recovering a forgotten password

- **Decision:**
  - **Customers:** an emailed link with a random token. Only its SHA-256 hash is stored. It works once, expires after 1 hour, and a newer link cancels older ones. Using it signs the person out everywhere. The page says the same thing whether or not the email has an account.
  - **Administrators:** no emailed link (their email would become the key to the admin area). A forgotten admin password is reset by running `npm run admin:create` again with the same email.
  - Emails are printed in the API log until real email sending is set up.
- **Why:** this is the usual safe flow for customers, and it keeps the admin area out of reach of anyone who only controls an email inbox.

### D-035: Browser tests and the database library

- **Decision:**
  - The browser tests run against a throw-away server with a test administrator whose password is invented fresh for every run, never written to a file, and a test-only route to read the "emails" it sent.
  - One copy of the MongoDB driver is installed for the whole project (`overrides` in `package.json`), because the session library and Mongoose each brought their own and their types disagreed.
- **Why:** end-to-end tests can follow a real password-reset link without any real email, and a single driver version avoids subtle differences between copies.

---

## Plan decisions (23 October 2026)

### D-036: Build order, Option A (completes D-025)

- **Decision:** on 23 October 2026 you chose to finish and launch the main website first ("go with option A"). The order is now:
  1. project requests and the customer dashboard (Phase 4)
  2. the admin dashboard (Phase 5)
  3. hardening (Phase 6)
  4. deployment, so the main website is online (Phase 7)
  5. then the template engine and Portfolio demo (8), the builder (9), the other four demos (10–13) and submitting a design as a project (14)
- **Renumbering:** phases are numbered in build order, so "next" always means the next number. The numbers used in earlier versions of these documents map like this:

| Earlier number | Now |
|---|---|
| 4: template engine and Portfolio demo | 8 |
| 5: builder | 9 |
| 6–9: demos 2 to 5 | 10–13 |
| 10: project requests and customer dashboard | 4 (its "submit a builder design" part is the new Phase 14) |
| 11: admin dashboard | 5 |
| 12: hardening | 6 |
| 13: deployment | 7 |

- **Adjustments that follow from the new order:**
  - The customer's actions on a quote (accept, decline, answer, ask for a revision) move to the admin phase, because they can only be tested end to end once an admin can send a quote. Phase 4 has the one action that works from the start: cancelling an early request. No button appears before what it does can work.
  - Template management and the demo-submissions inbox move to Phase 8, where the first template and demo appear.
  - Production image storage is set up with the builder (Phase 9), not at the first deployment.
  - The status workflow (D-020) must be confirmed before Phase 5. Phase 4 uses only its first status and the cancellation rows.
- **Why:** the main website can take real projects and enquiries sooner, and the demos and the builder, the largest and riskiest pieces, follow once there is a live site.
- **Cost:** the builder and the demos arrive later. Everything the project phases show has to work without them, so the "Saved designs" area of the dashboard stays an honest empty state until Phase 9.

### D-037: Protecting the website's and the demos' code

- **Your request (23 October):** disable right-click, minify and bundle the code, and use a password-protected staging deployment, so that clients can't simply copy the raw HTML and CSS from the browser's developer tools. For the website and for the demo site.
- **What can't be done:** hide front-end code from a visitor who can load the page. The browser has to receive the HTML, CSS and scripts to draw the page, so "View source", the developer tools, saving the page, or a script that downloads it will always work, and blocking right-click or keyboard shortcuts doesn't change that. Anything described below reduces casual copying; none of it makes copying impossible.
- **Decision:**
  1. **Staging password (real protection).** When `STAGING_PASSWORD` is set, every request except `/api/health` needs the username (`STAGING_USER`, default `preview`) and that password (HTTP Basic authentication): pages, CSS, scripts, images and the API alike, so outsiders get nothing to copy. Responses tell search engines not to index them and shared caches not to store them. Wrong guesses are rate-limited. It is set only on staging; the live site has none.
  2. **A production build that checks itself (real hygiene).** Files are minified and bundled with content-hashed names, with no source maps and no development-only code. Every build runs a check and fails if any of that stops being true.
  3. **Right-click and image-drag blocking (a speed bump).** On the website and the demos. It is on in production builds and off in development, and it never applies to form fields, so paste and spelling help keep working. Text can still be selected and copied. `VITE_PROTECT_CONTENT=false` at build time turns it off; `true` forces it on.
  4. **Terms (real protection, in law).** Previews, drafts and demos remain Prajzo's until a project is fully paid, and may not be copied or reused. This needs the lawyer's review together with the rest of the Terms.
  5. **Delivery.** A customer gets the full code and files only after payment (the Terms' Ownership section already says so).
- **Demos:** every demo built in Phases 8 and 10–13 follows these rules, says "for evaluation only" in its demo bar, and gets the same checks.
- **Costs:** blocking right-click removes "Open in new tab", "Copy link" and "Save image" from the context menu, and the keyboard's menu key; people can still use Ctrl/Cmd+click and the middle mouse button. Staging pages aren't cached by the browser, so staging loads a little slower.
- **Considered and not done:**
  - obfuscating the JavaScript (it slows the site and gains very little)
  - blocking F12 and Ctrl+U, or detecting open developer tools (unreliable, hostile to visitors, and in the way of assistive tools)
  - disabling text selection (hurts accessibility)
  - showing demos as images (defeats a live demo)
- **Idea for later:** the same password gate could protect a customer's project preview while it's being built (see the "Later" list in the roadmap).

---

## Phase 4 decisions (23 October 2026)

### D-038: Start a Project is its own page, and needs an account

- **Decision:**
  - `/start-project` is open to everyone to read. The form is for signed-in customers.
  - A visitor is asked to create a free account or sign in, and is brought straight back to the form with their chosen service or package kept.
  - The Contact page stays for questions, with no account needed.
  - Administrators aren't offered the form; they use a customer account to try it.
- **Why:** a project belongs to an account so the customer can follow it, read a quote and reply, and so the server can make sure nobody else sees it.
- **Cost:** one extra step for a first-time customer, about a minute. Someone who'd rather not register can still send a message.
- **Also changed:** the Contact page's heading is now "Talk to us", since "Start a project" has its own page.

### D-039: Reference numbers, and what a request keeps

- **Decision:**
  - References look like `PRZ-2026-0001` and restart each year (by India time). The next number is taken from a counter in the database in one step, so two requests at the same moment can never get the same number.
  - A number is used up even if the request then fails, so there can be gaps, but never duplicates. Past 9999 the number simply gets longer (`PRZ-2026-10000`).
  - A request keeps a copy of the customer's name, email and phone, and of the type and package names as they were when it was sent, so it stays readable if the account or the catalogue changes later.
  - A customer can't set the status, owner, reference, price or delivery date: those fields in a request are dropped.
- **Why:** the reference is what customer and studio quote to each other, so it must be short, unique and never reused.

### D-040: What a customer can do to a project in Phase 4

- **Decision:**
  - Only one thing: **cancel**, and only while the status is Request Received, Awaiting Customer Information or Quote Sent.
  - The server decides what is allowed and tells the app (`allowedActions`), so the rule lives in one place and a button only shows when it will work.
  - Cancelling is a single database step that fails if the status changed in the meantime; two cancellations at once cannot both succeed.
  - One customer can send at most 10 requests an hour (`PROJECT_REQUEST_RATE_LIMIT_MAX`).
- **Why:** accepting a quote, answering a question and asking for a revision need an admin to send the quote or the question first, so they are built and tested together in Phase 5 (D-036).
- **Still open:** the rest of the status table ([ARCHITECTURE.md §8](ARCHITECTURE.md#8-project-status-workflow)) is a proposal. Please confirm it before Phase 5.

### D-041: Emails about a request

- **Decision:**
  - Each new request sends a **confirmation to the customer** (the reference number, a link to the project, what happens next, no promised timings) and a **notification to Prajzo** (everything needed to start the review).
  - They go through the mailer, so until real email is set up in Phase 7 they are printed in the API log.
  - A failed email never fails or delays the request, and the website never says "we've emailed you".
- **Why:** the request is the important thing and it is already saved; an email problem shouldn't lose the customer's work.

### D-042: The policies follow the product

- **Decision:** the Privacy Policy and Terms are updated whenever what the site collects changes. The Privacy Policy now covers accounts (name, email, phone, a password stored only in scrambled form, and sign-in times), project requests, and the one sign-in cookie.
- **Needs a lawyer:** the draft keeps requests that don't go ahead for up to 24 months (like contact messages) and accounts until deletion is requested. Please have these periods confirmed with the rest of the policy.
