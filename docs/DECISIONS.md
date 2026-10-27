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

---

## Phase 5 decisions (24 and 25 October 2026)

### D-043: Three more steps ask for a note

- **Decision:** the workflow you confirmed ("workflow OK") is unchanged, apart from what an admin must write when making these moves:
  - **To Awaiting Customer Information**, from Under Review or from In Development: the question, or what is needed. The customer sees it on their project page and in an email, and answers there.
  - **To Revision Requested, when an admin records it for the customer**: what the customer asked to change.
  - Two things already needed a note and still do: recording a quote the customer accepted another way ("Accepted on WhatsApp on 24 Oct"), and cancelling a project that is further along.
- **Why:** a customer should never be moved to "we need something from you" without being told what.
- **Cost:** a sentence of typing for the admin on those moves.
- **Done:** the workflow table in [ARCHITECTURE.md §8](ARCHITECTURE.md#8-project-status-workflow) marks the rows.

### D-044: Quotes are versions, in whole rupees

- **Decision:**
  - Each quote is a version (1, 2…) with a price in whole rupees (₹1 to ₹1 crore, kept in paise), a description of what the price includes, and the rounds of changes it includes. Old versions are kept for ever.
  - Changing a quote means going back to Under Review and sending a new version; the form starts from the last one.
  - The customer accepts or declines the version they were shown. If a newer one has been sent since they opened the page, the server refuses and the page shows them the new quote.
  - Accepting fixes how many rounds of changes are included. Each request for changes counts as one. Going past that number is allowed, and the admin is shown a warning ("Over the included changes"); the customer is told further changes may be quoted separately.
  - The number of rounds has no default: the admin types it for every quote.
- **Why:** a price the customer agreed to must never change under them, and a dispute should be answerable from the record.
- **Your decisions, not the site's:** whether a quote should expire, how many rounds you usually include, and what extra changes cost. The site only records and flags them. Quotes don't expire for now.

### D-045: What a customer can do, and who has to act next

- **Decision:**
  - A customer can cancel (as before), accept or decline a quote, answer a question (as often as needed), ask for changes, and say "it looks good".
  - **"It looks good" tells Prajzo; it doesn't complete the project.** Only an admin completes it, as the workflow says. The admin is told it is now their turn.
  - The server decides which of these are allowed at any moment and tells the website; a button is shown only when it will work (as in D-040). Each action is one conditional database step, so two at once can't both succeed.
  - The server also says **who has to act next**: the customer after a question, a quote or a finished project, Prajzo otherwise. A customer's answer or "it looks good" hands the project back to Prajzo. The admin lists show "Needs you" or "Waiting for customer" and the overview counts what needs doing.
  - One customer can do at most 60 of these an hour (`PROJECT_ACTION_RATE_LIMIT_MAX`).
- **Why:** nothing should depend on the admin remembering to look, and no button should ever fail on a customer.

### D-046: The admin area is safe by construction

- **Decision:**
  - The "must be an administrator" check sits at the top of the admin routes, before any route, so a new admin route can't forget it. A test finds every admin route by itself and checks that visitors get 401 and customers 403.
  - A customer can't use the admin API even on their own project.
  - Internal notes are for admins only: never in a customer's page, in the API's reply to a customer, or in an email. A browser test follows a project from start to finish and checks this.
  - If a page is out of date (someone else moved the project first), the server refuses with a clear reason, and the page loads the project again and says why nothing changed.
  - Final moves (Completed and Cancelled) need a tick in a box first, because they can't be undone.
- **Not built in this phase:** disabling an account, deleting anything, bulk actions. Nothing is deleted from the admin area; things are archived or hidden.

### D-047: Emails about a project

- **Decision:**
  - **The customer** is emailed on every status change (with the quote or the question when there is one) and when the delivery date is confirmed or changed, each with a link to the project.
  - **Prajzo** is emailed when a customer accepts or declines a quote, answers a question, asks for changes, says it looks good, or cancels. Replies go to the customer. They go to `ADMIN_NOTIFY_EMAIL`, or contact@prajzo.com if that isn't set.
  - Until real email is set up in Phase 7 they are printed in the API log. A failed email never fails the action, and the website never says "we've emailed you".
- **Why:** the same as D-041: the work is saved first, and an email problem shouldn't lose it.

### D-048: An activity log

- **Decision:**
  - The log records what admins do (status changes, quotes, dates, notes, message status, catalogue edits) and what customers do to their projects. Each entry says who, what, to what and when, in plain words written at the time. Entries are only ever added.
  - It is shown on the Activity page (filtered by kind) and as "Recent activity" on the overview. It does not record sign-ins or page views.
- **Needs a decision with the Privacy Policy:** how long to keep entries. They hold people's names and project references, and are kept indefinitely for now.

### D-049: Contact messages are answered from your own email app

- **Decision:** messages from the contact form go through New, Read and Archived. "Reply by email" opens your own email app with the sender's address and a subject filled in. Nothing is sent from the site.
- **Why:** there is no sending domain until Phase 7, the replies stay in the mailbox the studio already uses, and the site can never claim a reply was sent that wasn't.
- **Cost:** the site doesn't know whether you replied.

### D-050: Catalogue management

- **Decision:**
  - Admins can edit, add and hide website types and packages, including prices. Prices are typed in rupees and kept in paise. A "Request a quote" package has no price; the others must have one.
  - Keys (such as `online-shop`) can't be changed once made. Nothing is deleted: a hidden item disappears from the website but stays in the admin area, and projects that already use it are not affected, because each project keeps its own copy of the names.
  - Order is a number ("lower comes first"), not drag and drop.
  - The public catalogue is cached for 60 seconds, so a change reaches the website within about a minute.
- **Considered and not done:** deleting (it would break old projects' links), and drag-and-drop ordering (more code than a number is worth for a handful of items).

### D-051: The sign-in cookie, and how long a sign-in can last

- **Decision:**
  - In production the cookie is called `__Host-prajzo.sid`. A browser only accepts a cookie with that prefix if it is `Secure`, covers the whole site and has no `Domain`, so another address of the site (a subdomain, a forgotten test site) can't plant a cookie that this site would believe. It is still `HttpOnly` and `SameSite=Lax`. On your own computer it keeps the plain name, `prajzo.sid`. Signing out deletes it with the same attributes.
  - A sign-in now ends after a fixed total time however often it is used: customers 60 days (`SESSION_MAX_DAYS`), administrators 24 hours (`ADMIN_SESSION_MAX_HOURS`). The existing "not used for 14 days / 8 hours" limits still apply. When a sign-in ends, its stored session is deleted and the browser is told to forget the cookie.
- **Why:** a session that is renewed every time it is used never ended, so a stolen or forgotten sign-in could live for ever.
- **Cost:** administrators sign in at least once a day, customers about every two months. Sessions made before this change have no start time and are ended, so everyone signs in once more after the upgrade.
- **Checked:** unit tests with a moved clock, and in a real Chrome on the production build (attributes, what the browser keeps, that a cookie planted under the old name signs nobody in, that sign-out deletes it).

### D-052: Secrets are scanned for

- **Decision:** `npm run scan:secrets` (also the first step of `npm run check`, and in GitHub with the whole history) looks for a real `.env` being tracked, well-known secret formats, database addresses with a real password in them, and **the actual values in your own local `.env` files** (the database password, the session secret) in every tracked file, every new file, and with `--history` every commit on every branch. It prints only names and places, never a secret, so its output can be pasted anywhere.
- **Result when it was added:** 310 files and all 34 commits on every branch were clean. The real database password and session secret appear nowhere in git.
- **Invented passwords** used by tests (to prove a password is hidden in error messages) are listed in the script as a deliberate decision. Never add a real one.
- **Limits:** it can't see GitHub pull request text or a chat. The database password that was pasted into a chat early on should still be changed before the site goes live (Phase 7).

### D-053: What search engines and link previews are told

- **Decision:**
  - One table (`packages/shared/src/site-pages.ts`) says what each page is called, how it is described and whether it may be listed. The server writes it into each page's HTML (title, description, canonical address, Open Graph and Twitter details, and for the home page the business's name, logo, email, phone and Instagram as structured data), and the web app uses the same table when a visitor moves between pages. A test compares the app's routes with the table, in both directions.
  - `robots.txt` and `sitemap.xml` are written from the public address (`APP_ORIGIN`). The sitemap lists only the nine public pages and invents no "last changed" dates. `robots.txt` blocks `/api/` and does not name `/admin` or `/account`.
  - Sign-in pages and private areas (`/account`, `/admin`) are marked "do not list", with a header and a tag. An address that is nothing now answers **404** (the app still starts and shows its own "Page not found" page); before it answered 200.
- **Why:** link previews (WhatsApp, LinkedIn, X) and many crawlers don't run JavaScript, so the details have to be in the HTML the server sends. One table means the page, the sitemap and the server can't disagree.
- **Needs:** `APP_ORIGIN` must be the real address in production, or canonical addresses and the sitemap point at the wrong place.
- **Not done on purpose:** no address, opening hours, ratings or prices in the structured data (the site doesn't state them), and no per-page sharing pictures (one picture for the whole site).

### D-054: Brand images, typefaces and the logo

- **Decision:**
  - Every icon (tab, iPhone and iPad home screen, install, maskable) and the 1200x630 sharing picture are made from the original artwork by `npm run brand:images`, and can be made again whenever the artwork changes. The build fails if the page shell, an icon, the manifest or the sharing picture is missing or the wrong size.
  - The header logo is a 320 px WebP (9.5 KB), imported so its name carries a content hash and it is cached for a year. It was an 800 px PNG (90 KB) shown 150 px wide.
  - Only the Latin parts of the two typefaces are loaded, and both are preloaded. The rupee sign is drawn by the visitor's system font instead of an 85 KB download (the "Latin extended" file exists in the typeface only for that one character here).
- **Result (Lighthouse, mobile, production build, same five pages before and after):** the home page's layout shift went from 0.124 to 0.000 and image savings from 86 KiB to 7 KiB; performance 83 to 92 became 89 to 94 and first paint about 0.4 s earlier, measured before the layout fixes in D-057.
- **Cost:** the rupee sign looks slightly different from the surrounding digits.

### D-055: Overall rate limits, and the proxy setting

- **Decision:**
  - An overall limit on the API: 600 requests a minute per connection, checked before the request body is read. The plain "is it running" health check is exempt: a flood must never be able to make a host think the site is down and restart it. The readiness check, which asks the database, is limited like everything else.
  - A limit on the admin area: 1200 requests per 15 minutes **per administrator**, applied after the administrator check, so people who aren't signed in as an administrator can't use up an administrator's allowance.
  - Both limits depend on seeing each visitor's real address, which depends on `TRUST_PROXY`. Both mistakes are silent (everyone sharing one allowance behind a proxy with it off; visitors able to claim any address with it on and no proxy), so in production the first request that shows the setting is wrong is logged once.
- **Why:** the existing limits protect sign-in, forms and project actions, but nothing stopped one address using up the database with ordinary requests.

### D-056: The production build is checked in a real browser

- **Decision:** `npm run test:production` (and a GitHub job) builds the site and runs the **built** server in production mode, twice: once behind the staging password and once open. It checks that every file, page and API route needs the password and nothing leaks without it, that every page of every kind (visitor, customer, administrator) opens with no browser complaint, the security headers and cookies, compression, caching, no source maps or development code, and that right-click blocking leaves form fields and the keyboard alone.
- **What it found and fixed the first time it ran** (the development servers hide all of these):
  1. The staging password's guess limit counted every error the site answered a signed-in tester, so twenty broken links locked a tester out for 15 minutes. Now only wrong guesses count (20 per address in 15 minutes; after that even the right password is refused for a while).
  2. Every page reported a content security policy violation: the form library tried to build faster checkers with `new Function`. It is now switched off in browsers.
  3. A missing file (`/.env`, `/missing.png`) was answered with the web app and "200 OK". It is now a real 404.
  4. Pages, scripts and styles were not compressed. Now Brotli or gzip (several times smaller).
  5. API answers were kept or not by accident: the catalogue's "keep for a minute" overwrote the staging site's "never keep". The API now says "never keep" by default, and only the catalogue says otherwise, and not on staging.

### D-057: Moving around the site, and text people type

- **Decision:**
  - After a visitor moves to another page, keyboard focus (and a screen reader) goes to the new page's main heading; after Previous or Next on a list, to the list. Typing in a filter box keeps its focus. Tested with the keyboard alone, on a computer and a phone-sized screen.
  - Text that people type (a name, a project title, a message) can hold a long word or web address with no spaces. One rule on the page content area lets it break at any letter when there is nowhere else to, and boxes in a row or grid may shrink around it, so it can never stretch a page sideways. This covers pages added later.
  - Every page is opened at 320, 390, 768 and 1280 px, with deliberately long text in every field a visitor can fill, and fails if the page scrolls sideways or anything sticks out of the screen.
- **What that found:** the header's "Start a Project" button was meant to be hidden on small phones, but its own display style beat `hidden`, so at 320 px it pushed every page 48 px sideways; a contact message with one long web address made the admin messages page 2,600 px wide; and the current section of the admin menu was half hidden on a phone.
- **Right-click blocking and the keyboard:** blocking works on the browser's "context menu" event, which the keyboard's Menu key also produces, so it is blocked on page content too. Form fields keep their menu in both cases.

### D-058: Crashes are logged, in the API and in visitors' browsers

- **Decision:**
  - An error nothing caught, or a promise rejection nothing handled, is written to the API's log as **fatal** (with the error and its stack), the log is flushed, and the process exits with code 1 so the host (or `npm run host:local`) starts it again. Continuing after such an error would leave the server in an unknown state. If flushing hangs, it exits after two seconds anyway.
  - In production builds the website sends crashes in a visitor's browser to `POST /api/v1/client-errors`: errors nothing caught, promise rejections nothing handled, and pages that crash while drawing (the router catches those, so they are reported from the "Something went wrong" page). Each becomes one warning in the server log with the request id and browser type. Nothing is stored in the database.
  - A report holds the error, its stack, the script and line, and the page's **path only**: never the query string or `#` part (a password-reset link carries its token there), never form contents or cookies. The server refuses anything else.
  - Limits: each distinct error is sent once per page load, at most 5 per page load; the endpoint takes 20 reports per connection every 15 minutes (`CLIENT_ERROR_RATE_LIMIT_MAX`), plus the origin check and the overall API limit.
  - Errors from scripts on other websites ("Script error." with no details) are skipped.
- **Request ids:** every log line written while answering a request carries that request's id (also sent to the browser as `X-Request-Id`), including these reports and every 500 error. A test checks it.
- **Privacy:** the Privacy Policy says that a broken page sends a short error report and what it contains.
- **Why:** before this, a page that broke for a visitor left no trace anywhere Prajzo could see, and a crash of the API reached only standard error as a bare stack, outside the structured log.

### D-059: Database backups without mongodump

- **Decision:** `npm run db:backup`, `db:restore` and `db:rehearse` (in `@prajzo/api`) use the MongoDB driver the API already has, not `mongodump`, which is not installed on this PC and isn't available on shared hosting. A backup is a folder: one gzipped file per collection, one document per line in canonical Extended JSON (so dates, ObjectIds, Decimal128 and 64-bit numbers keep their exact types), and a `manifest.json` with each collection's count, options, indexes and SHA-256.
- **Safety:**
  - A restore checks every checksum before writing anything, and every count after.
  - It refuses to write into a collection that already has data unless `--replace` is given, and always needs `--into <database>`, so the database being restored is always named, never assumed.
  - A backup never overwrites an existing folder. The manifest can't point at files outside its folder.
  - `apps/api/backups/` is ignored by git; the how-to says a backup holds personal data and old ones must be deleted.
- **Proof:** a test builds realistic data through the API (two customers, a quote accepted, a contact message, sessions, the activity log) plus every awkward BSON type, backs it up, restores it into another database, and compares every document and index. The same rehearsal (`db:rehearse`) passed on the real Atlas database on 27 October 2026 (9 collections, 22 documents).
- **Not yet:** scheduled backups and where they are kept are part of Phase 7 (hosting). Atlas's free tier keeps no backups of its own.
- **How-to:** [OPERATIONS.md](OPERATIONS.md).

---

## Phase 7 decisions (27 October 2026)

### D-060: Email is sent through the contact@prajzo.com mailbox

- **Found:** prajzo.com's email is on Hostinger Mail, and its records are already right: SPF (`include:_spf.mail.hostinger.com`), three DKIM keys (`hostingermail-a/b/c`) and DMARC (`p=none`). Mail sent through Hostinger's own server as contact@prajzo.com passes those checks, so it is far less likely to land in spam than mail from the web server.
- **Decision:** the API sends through SMTP (`nodemailer`) as the mailbox: `smtp.hostinger.com`, port 465, signed in as contact@prajzo.com. `MAIL_TRANSPORT=console` (the default) keeps printing emails to the log, so development and tests never send by accident.
- **Safety:**
  - The connection is always encrypted (465 from the start, 587 only with STARTTLS); the server's certificate is always checked; port 25 and plain text are refused by the settings check. A test proves the password is never sent to a server that can't encrypt.
  - At startup the API signs in once without sending, and logs "Email sending is ready" or exactly which settings to check. A failed email never fails what the person did (it was already so: each caller logs it).
  - `npm run mail:setup` (or **Set up email.cmd**) asks for the password with the typing hidden, checks it with the mail server, and only then writes it to `apps/api/.env`. The password never goes through chat, the screen or a log. The secret scan already covers any setting named `*PASSWORD*`.
- **Later:** DMARC can move from `p=none` to `quarantine` once real mail has been seen passing for a few weeks (a DNS change in Hostinger; noted in OPERATIONS.md).

### D-061: The website runs on Render; domain, DNS and email stay at Hostinger

- **Found:** the Hostinger plan is **Premium Web Hosting**, which says "No Web Apps": it runs PHP (the WordPress now at prajzo.com) but not a Node.js app.
- **Your choice (27 October 2026):** option A of three (A: Render for the app; B: upgrade Hostinger to Business; C: a Hostinger VPS), and the new site **replaces the WordPress site** at prajzo.com.
- **Decision:**
  - Two Render services in Singapore: `prajzo-staging` (free plan, behind the staging password, at staging.prajzo.com) and `prajzo-live` (Starter plan, always on, at prajzo.com and www). Nothing is created on the paid plan without asking.
  - Separate databases on the same Atlas cluster: `prajzo-staging` and `prajzo-live`. Development keeps `prajzo`.
  - Secrets never pass through chat: `Prepare staging/live settings.cmd` writes a file with new random secrets (session secret, staging password) that is pasted into Render's "Add from .env". The files are ignored by git.
  - The database password is changed before the database is opened to Render (`Change database password.cmd`), and Atlas allows **Render's outbound IP ranges** rather than everywhere (0.0.0.0/0).
  - DNS stays at Hostinger. Going live changes only the web records (A, AAAA, www); the email records are left alone.
- **Why Render:** made for apps like this one (automatic restarts, health checks, logs, deploys from GitHub without downtime), and Claude has a direct connection to the account, so setting it up needs few steps from you. About US$7 a month for the live site.
- **How-to:** [DEPLOYMENT.md](DEPLOYMENT.md).

### D-062: Hosting paused; the demos and builder come next

- **Your choice (28 October 2026):** "skip this phase of hosting and keep building the remaining phases". Still open: Render (needs a read-only GitHub invite for the account Render is linked to, and a card that accepts a monthly charge in US dollars) or upgrading Hostinger to Business (Node.js apps, billed in rupees, connects to prajwal988660-dot directly).
- **What stays ready:** real email (D-060), the hosting settings and password tools and DEPLOYMENT.md (D-061). They work for either host; only the final steps in DEPLOYMENT.md change if Hostinger Business is chosen.
- **Order now:** Phase 8 (template engine and the Portfolio demo), then 9 (builder), 10 to 13 (the other demos), 14 (submit a design as a project), then back to Phase 7 to go live with everything. Each phase keeps its own branch, pull request and your approval; each demo's design brief is approved before its code.
- **prajzo.com** keeps showing the empty WordPress site until then.

### D-063: How the live demos are built and shown

- **One renderer, layouts by the site's own width.** Every design is drawn by `apps/web/src/site-renderer`. Layouts change with the width of the site itself (CSS container queries), not the browser window, so the builder's phone, tablet and computer previews (Phase 9) show exactly what those devices show. Checked at 320, 390, 768 and 1280 px like every other page.
- **Kept out of search results.** The demos are listed (`noindex`) nowhere: the people in them are made up, and someone searching for a name should never land on one. The Templates page, which presents them, is listed instead.
- **Light for the rest of the site.** Templates have their own import path (`@prajzo/shared/templates`) and each demo typeface is loaded only when a design uses it, so the main website downloads none of it. Checked in the build: the demo's content is only in the demo page's file.
- **Nothing contacts anyone.** Email, phone, WhatsApp, social and outside links on a demo are buttons that say what would happen on a real site. The contact form really sends, to the demo inbox only (D-014).
- **The Portfolio design brief** (Daylight, Night Shift, Botanical; Tara Vaidya; nine sections) was built while waiting for your choice of starting look, which is a one-line change. Two accent colours were darkened slightly so small accent text meets WCAG AA in every look.
