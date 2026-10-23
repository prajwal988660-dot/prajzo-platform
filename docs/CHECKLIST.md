# Prajzo task checklist

A box is ticked only after the work is done and its tests have run. Phase descriptions and exit criteria are in [ROADMAP.md](ROADMAP.md).

Last updated: 23 October 2026 (end of Phase 4)

Legend: `[x]` done and verified · `[ ]` to do · **(gate)** needs your approval

## Phase 0: Discovery and plan

- [x] Inspect the project folder, files and assets
- [x] Inspect the logo (size, format, background, colours)
- [x] Check installed tools: Node, npm, Git, GitHub CLI, Python, browsers, winget, MongoDB, Docker
- [x] Check current package versions and their compatibility on npm
- [x] Propose the architecture and folder structure ([ARCHITECTURE.md](ARCHITECTURE.md))
- [x] Write the roadmap with phases, gates, estimates and risks ([ROADMAP.md](ROADMAP.md))
- [x] Write the decision log ([DECISIONS.md](DECISIONS.md)), environment variables ([ENVIRONMENT.md](ENVIRONMENT.md)) and setup guide ([SETUP.md](SETUP.md))
- [x] Add the showcase-demo requirement to the roadmap: 5 demo routes, the Templates and Live Demos page, Customize This Design, one demo at a time
- [x] **(gate)** Your approval of the plan, plus answers to Q1–Q4 (17 October 2026; see [ROADMAP.md](ROADMAP.md#open-decisions))

## Phase 1: Foundation

- [x] Git identity set (this repository only); `git init`; `.gitattributes` (LF line endings) and `.gitignore`; baseline commit of the static site (`45c8d7c`)
- [x] Private GitHub repository `prajwal988660-dot/prajzo-platform` created; Phase 1 work on branch `phase-1-foundation`
- [x] Static site moved to `legacy/static-site/` (`2588cee`); local static server restarted from there and checked (200)
- [x] Root `package.json` with npm workspaces and scripts: `dev`, `check`, `test`, `build`, `start`, `format`
- [x] Shared strict TypeScript 6.0.3 config; ESLint 10 with type-aware typescript-eslint and React Hooks rules; Prettier
- [x] `packages/shared` with Zod: API error format, health and readiness responses
- [x] `apps/api`:
  - [x] Express 5 with settings validation (refuses to start with a missing or invalid setting, never prints secret values)
  - [x] Logging with request IDs and redaction
  - [x] Security headers: content security policy, HSTS in production, `nosniff`, no `X-Powered-By`
  - [x] Error handler (JSON errors, no internal details leaked) and JSON 404 for unknown API routes
  - [x] Health endpoints `/api/health` and `/api/health/ready`
  - [x] MongoDB connection with retry, credential-safe error logs and graceful shutdown
  - [x] Serves the built web app in production; production bundle with esbuild
- [x] `apps/web`:
  - [x] Vite 8, React 19, Tailwind 4 and React Router 8
  - [x] Design tokens taken from the logo; Inter and Sora fonts, self-hosted
  - [x] Base UI components: button, button link, text field, text area, select, checkbox, card, badge, alert, spinner, empty state, section heading
  - [x] Header with accessible mobile menu, footer, skip link, 404 page, crash page
  - [x] Favicon and app icon cut from the logo's arrow mark
  - [x] Development-only UI gallery at `/dev/ui` with a live API connection check (left out of production builds)
- [x] Vite proxy `/api` → API in development; `npm run dev` starts both
- [x] Test setup: Vitest projects, in-memory MongoDB helper, Testing Library
- [x] Tests: 58 passing in 11 files (settings validation, health and readiness with a real in-memory database, error responses, production web serving, credential redaction, buttons, form fields, header and mobile menu, routes and 404, API client)
- [x] `npm run check` passes (type check, lint, format, tests, production build)
- [x] Checked by hand:
  - [x] the app runs at http://localhost:5173 with the API connected to a database
  - [x] screenshots at 1280 px and 390 px
  - [x] production bundle smoke-tested
- [x] CI workflow on GitHub runs `npm run check` for every pull request
- [x] Atlas connection made reliable on Windows:
  - [x] optional `DNS_SERVERS` setting, because Node 24 on this PC can't look up `mongodb+srv://` addresses (confirmed)
  - [x] clear startup and connection messages for a wrong format, a leftover `<placeholder>`, a wrong password and a blocked IP
- [x] README, SETUP, ENVIRONMENT, DECISIONS (D-021 to D-025), ROADMAP and this checklist updated
- [x] **Your action:** create the free MongoDB Atlas cluster and put its connection string in `apps/api/.env` ([SETUP.md](SETUP.md), step 1). Connected on 18 October 2026; the app reports "API ready · database connected"
- [ ] Recommended: change the Atlas database password, because it was shared in a chat (Atlas → Database Access → Edit → Edit Password), then update `apps/api/.env`
- [ ] **(gate)** Approval for Phase 2: merge the `phase-1-foundation` pull request

## Phase 2: Public website and service catalogue

- [x] Your contact details: contact@prajzo.com, +91 98866 07720 (phone and WhatsApp), Instagram @prajzoo
- [x] Your pricing choice: low starting prices of ₹2,999, ₹7,999 and ₹19,999 (D-026)
- [x] Category, package and contact-message models
- [x] Default catalogue (15 categories, 3 packages):
  - [x] loaded automatically into an empty database when the API starts
  - [x] `npm run seed -w @prajzo/api` refreshes it
- [x] API endpoints:
  - [x] `GET /api/v1/categories` and `GET /api/v1/packages` (active items only, in order)
  - [x] `POST /api/v1/contact`:
    - [x] validated with the shared rules, including that the chosen website type and package exist
    - [x] spam trap; 5 messages per 15 minutes per connection
    - [x] saved with the consent time
    - [x] notification printed to the console in development
- [x] Home page:
  - [x] Header, hero with a website-preview illustration, delivery highlights with their conditions
  - [x] Categories, how it works, customization feature
  - [x] Packages, why Prajzo, FAQ
  - [x] Final call to action, footer
- [x] Services page: 15 categories with icon, description, use cases, delivery category and a "Start a project" link
- [x] How It Works, Pricing and Plans, About Us and Contact Us pages
- [x] Contact page:
  - [x] form with browser and server validation
  - [x] pre-selection from Services and Pricing links
  - [x] success shown only after the server saves the message; errors kept with the typed text
  - [x] direct contact options
- [x] Privacy Policy and Terms and Conditions (written for India's DPDP Act 2023; **have a lawyer review them before launch**)
- [x] Header "Start a Project" button (opens Contact until Phase 10), floating WhatsApp button, footer with contact details
- [x] Loading, empty and error states (with "Try again") for every section that uses the API
- [x] Each page's code loads only when it is opened; slim loading bar during page changes
- [x] Tests: 110 unit, API and component tests, plus 38 end-to-end runs (19 tests × desktop and phone):
  - [x] API: catalogue order, inactive items, defaults not overwriting edits, valid, invalid and unknown choices, spam trap, failed email, rate limit
  - [x] Contact form: missing details, cleaned-up data sent, server field errors, network failure (never a false success), pre-selection
  - [x] End to end: navigation (desktop and mobile menu), contact form, Get a quote → Contact, footer, 404, no sideways scrolling
  - [x] Accessibility (axe, WCAG 2.2 AA rules): no serious or critical problems on any of the 9 pages, on desktop or phone
- [x] Screenshots checked at 390, 768 and 1280 px
- [x] CI runs the end-to-end tests on every pull request
- [x] Local hosting (D-030), requested on 18 October:
  - [x] `npm run host:local` builds, then runs the website and API together in the background on http://localhost:8080 and prints your phone-friendly network address
  - [x] `npm run host:stop` stops only the process that really listens on that port; a stale saved process number pointing at another program is ignored and left alone (checked with a decoy program)
  - [x] second start reports "already running"; restart replaces the old copy; log is kept under 5 MB
  - [x] the log explains a lost database connection (usually a changed internet address) in one line, and recognises Atlas's "SSL alert number 80" rejection
  - [x] tests for the production-style serving and the connection messages
  - [x] while the database is unreachable, database-backed requests answer at once with a clear 503 "temporarily unavailable" message instead of hanging for 10 seconds; failed contact attempts during an outage don't use up the visitor's message allowance
- [ ] **(gate)** Approval for Phase 3: merge the `phase-2-public-site` pull request

## Phase 3: Accounts and access control

- [x] Accounts:
  - [x] user model with `customer` and `admin` roles; passwords stored only as argon2id hashes (64 MiB, 3 passes, 4 lanes)
  - [x] password rules: 10–128 characters, at least 5 different characters, not one of a list of very common passwords; administrators need 12 or more. There are no "must contain a capital, number and symbol" rules
  - [x] register (consent to Terms and Privacy recorded), sign in, sign out, "who am I"
  - [x] profile (name, phone), change password (needs the current one; signs out other devices)
  - [x] forgot and reset password: emailed link, single-use, expires in 1 hour, only a hash of it is stored, all devices signed out after a reset (the email is printed in the API log until real email sending is set up)
- [x] Sessions stored in MongoDB; cookie `prajzo.sid` is HttpOnly, SameSite=Lax, Secure in production; a new session ID at every sign-in; 14 days for customers, 8 hours for administrators
- [x] Server-side protection:
  - [x] every private route checks the person on the server, fresh from the database each time, so disabling an account or changing a role takes effect at once
  - [x] a customer asking for admin data gets 403; a visitor gets 401 (while the database is unreachable, every private request instead gets an instant 503 "temporarily unavailable")
  - [x] requests that change data must come from this website (blocks forged requests from other sites)
  - [x] rate limits on sign-in (per connection and per email address), sign-up and password reset
  - [x] "wrong password" and "unknown email" give the identical answer and take similar time
- [x] Administrators:
  - [x] sign in on their own page (`/admin/login`) with their own endpoint; customers and administrators cannot use each other's sign-in
  - [x] no web sign-up for administrators; `npm run admin:create` asks in your own terminal, hides the password, and also resets a forgotten administrator password
- [x] Pages: Customer Registration, Customer Login, Forgot and Reset Password, Admin Login, Customer Dashboard (details, password, honest empty lists), Admin Dashboard (real counts)
- [x] Page guards in the website (convenience only; the server is what protects): signed-out visitors go to sign-in and come back; customers are turned away from admin pages; admins are sent to their area; unsafe "next" addresses are ignored
- [x] Header shows Sign in, or My account and Sign out; sign-out failures are reported instead of pretending
- [x] While the database is unreachable, visitors who aren't signed in browse normally; sign-in routes answer at once with "temporarily unavailable"
- [x] Tests (all run):
  - [x] server: duplicate email, wrong password, unknown email, disabled account, session ID changes, cookie flags, expired session, sign-out, profile, password change, password reset (single use, expiry, hashed), rate limits, forged requests, admin access rules, admin setup flow
  - [x] website: forms, error messages, redirects, guards, sign-out, header, account and admin pages
  - [x] browser: register → sign out → sign in; reload; wrong password; return to the page you wanted; duplicate email; change name; change password; full password-reset by email link; admin sign-in and sign-out; customer turned away from admin; HttpOnly cookie; forged request refused
  - [x] accessibility (axe) on 14 pages you can open without signing in (including the administrator sign-in and the not-found page), the signed-in pages, and pages showing error messages
- [x] 269 automated tests pass locally; browser tests passed 90 of 90 once after the last change (two repeat runs were cut short by low computer memory)
- [ ] **Your action:** create your administrator account: `npm run admin:create -w @prajzo/api` in a terminal ([SETUP.md](SETUP.md), section 3)
- [x] Order of the next phases chosen: Option A, the main website first (23 October 2026, [D-036](DECISIONS.md))
- [ ] **(gate)** Approval for Phase 4: merge pull requests #2 (Phase 2) and #3 (Phase 3). Work on the next phases continues meanwhile, stacked on them

## Add-on: protecting the website's code (requested 23 October 2026, [D-037](DECISIONS.md))

- [x] Staging password: when `STAGING_PASSWORD` is set, every page, file and API request asks for a username and password; only `/api/health` stays open; search engines are told not to index; nothing is stored by shared caches; wrong guesses are rate-limited (20 per 15 minutes per connection); the setting is validated at startup
- [x] The production build is minified and bundled with content-hashed files, with no source maps and no development-only code; every build checks this and fails if it isn't true
- [x] Right-click and image dragging are blocked on the website and the demos, but never in form fields; text can still be selected and copied; one switch (`VITE_PROTECT_CONTENT`)
- [x] Terms: previews, drafts and demos stay Prajzo's until a project is fully paid (draft wording; needs the lawyer's review with the rest of the Terms)
- [x] Tests (all run):
  - [x] Staging password, 15 tests: refused without it (pages, CSS, scripts, images, every API route, changes to data), accepted with it, passwords with colons, health check open, wrong guesses limited, not cached, not indexed, off when not set, settings validated
  - [x] Build check, 11 tests: catches a source map, a pointer to one, development code, the development gallery, unminified files and missing content hashes; and it was seen failing on a planted problem in the real build
  - [x] Right-click: 8 unit tests, plus 5 real-browser checks on desktop and phone (blocked on content, allowed in form fields, images can't be dragged, text selectable with the mouse)
  - [x] Checked by hand on the real production build behind a password (23 October): the browser without the password can't load the page; with it, right-click is cancelled on content and allowed in fields; no source maps referenced or served; the server log never contained the password
- [x] The limits are written down: a visitor can still view the source, use developer tools and save files ([D-037](DECISIONS.md), [SETUP.md](SETUP.md) section 6)
- [ ] **(gate)** Your approval (merging the pull request)

## Phase 4: Project requests and customer dashboard

- [x] Shared rules (the browser and the server use the same ones): the Start a Project form, the 11 statuses with plain-language meanings, and the table of allowed status changes, every possible change checked against a separately written copy of the table
- [x] Database: project requests, and a counter for reference numbers (`PRZ-2026-0001`) that stay unique even when requests arrive together (checked with 40 at once)
- [x] API: send a request; list your own (a page at a time); read your own (someone else's, or a made-up reference, gets the same "not found"); cancel while it's early (Request Received, Awaiting Customer Information or Quote Sent)
- [x] Start a Project page: explains the steps; a form for signed-in customers; visitors sign in or create an account first and come straight back to the form, with their chosen service or package kept
- [x] Confirmation to the customer and notification to Prajzo (printed to the API log until Phase 7); a failed email never fails or delays the request
- [x] Customer dashboard: latest projects on the account page; My Projects (a page at a time); Project page with what was asked for, the status and what happens next, the timeline, and cancel with a question first
- [x] Admin overview: real project-request counts
- [x] Every "Start a Project" button (header, home, services, pricing, call to action) opens the new page; the Contact page is now for questions
- [x] Privacy Policy and Terms brought up to date (accounts, project requests, the sign-in cookie)
- [x] Fixed on the way: a signed-in customer no longer sees a flash of "Sign in to send your project" while the server is still being asked; form boxes no longer stretch when a neighbouring field has a hint
- [x] Tests (all run):
  - [x] Shared rules, 68 in total: every status change, the form rules (field by field, and all problems at once), India-time dates, page numbers
  - [x] Server, 196 in total (47 new for projects): ownership; fields customers can't set are dropped; who may send one (visitor 401, administrator 403, disabled account 401, other websites 403); per-customer hourly limit; reference numbers unique with 40 simultaneous calls and with 12 customers at once; reference numbers restart each year in India time; cancelling allowed in exactly 3 statuses and refused in the other 8; two cancellations at once, one wins; a failing email doesn't fail the request; nothing internal in any response
  - [x] Website, 188 in total: the Start a Project page for a visitor, an administrator and a customer (validation, exact request sent, double click sends once, server messages beside fields, down-time keeps what was typed, reference shown); My projects (paging, empty, error, retry); Project page (details, timeline in India time, cancel flow, conflicts); the account page's project list
  - [x] Real browser, on desktop and phone: send, email, follow and cancel a project, with a reload in between; a form with mistakes sends nothing; a visitor signs up and is brought back to the form; one customer can't see another's project on the page or in the API; the administrator overview counts requests. That is 14 checks for these journeys (7 on desktop, 7 on phone), plus 14 for the site's pages and 44 accessibility checks (axe) on every page including the new ones, empty and with error messages. The whole browser suite runs again on GitHub
  - [x] Looked at by eye at 390, 768 and 1280 px (form, errors, list, project page, cancel question, cancelled project, account page)
- [x] Docs updated; summary with the tests that ran
- [ ] **Your action:** confirm the status workflow ([ARCHITECTURE.md §8](ARCHITECTURE.md#8-project-status-workflow)): who may move a project from which status to which. Phase 5 builds on it
- [ ] **(gate)** Approval for Phase 5

## Phase 5: Admin dashboard

- [ ] Overview with real counts by status and recent activity
- [ ] Project requests:
  - [ ] Filter, search, pagination
  - [ ] Details with the customer's full request
  - [ ] Scope, quote and confirmed delivery date
  - [ ] Status changes with notes; internal notes; status history
- [ ] The customer's side of the workflow, shown only when the workflow allows it: accept or decline a quote, answer a question, request a revision
- [ ] Customers list and details
- [ ] Categories management; packages and prices management
- [ ] Inbox for contact messages: read, handled, archive
- [ ] Audit log of admin actions; status-change emails (printed to the console until Phase 7)
- [ ] Tests:
  - [ ] Every admin endpoint refuses non-admins
  - [ ] Every status transition, allowed and refused, with history recorded
  - [ ] End to end: an admin takes a project from "Request Received" to "Completed", with the customer accepting the quote
- [ ] **(gate)** Approval for Phase 6

## Phase 6: Hardening and quality

- [ ] Security review:
  - [ ] Security headers and content security policy
  - [ ] Cookies and sessions
  - [ ] Rate limits
  - [ ] `npm audit`
- [ ] Code protection checked on the real production build: no source maps, no development code, the staging password covers every file, right-click blocking leaves form fields working
- [ ] Full end-to-end suite green
- [ ] Every page checked at 390, 768 and 1280 px
- [ ] Automated accessibility checks (axe) plus a manual keyboard pass
- [ ] Performance: code splitting, image sizes, Lighthouse check
- [ ] SEO titles and descriptions, Open Graph images, favicons
- [ ] Error logging; database backup and restore rehearsed
- [ ] **(gate)** Approval for Phase 7

## Phase 7: Deployment

- [ ] Your choices and accounts: domain, hosting, MongoDB Atlas, email provider
- [ ] Production settings documented; secrets set only on the host
- [ ] Staging site deployed behind the staging password and checked on the real host
- [ ] Production build deployed; HTTPS working; health checks passing; no staging password on the live site
- [ ] Email domain records (SPF, DKIM) verified; account and project emails really sent
- [ ] Backups scheduled; monitoring and alerts on
- [ ] Live smoke test passed on the real address
- [ ] Known limitations and remaining manual tasks listed
- [ ] **(gate)** Approval for Phase 8: the main website is online

## Phase 8: Template engine + Demo 1 (Portfolio, `/demo/portfolio`)

- [ ] Website configuration schema and its validation, shared by web and API
- [ ] Template definition format with pages, sections, variants, design options and a default configuration
- [ ] Site renderer with demo, preview and review modes; theme values applied as CSS variables
- [ ] Demo-submission API: validated, rate-limited, deleted automatically after 7 days
- [ ] Your approval of the Portfolio design brief
- [ ] Portfolio template:
  - [ ] Navigation, hero, profile introduction
  - [ ] Skills, projects, experience and education
  - [ ] Contact form, social links, footer
- [ ] Clearly fictional demo content; demo bar on the live demo
- [ ] Contact form shows success only after the server confirms, and a clear error state otherwise
- [ ] Templates and Live Demos page, showing the preview, category, description, features and "View Live Demo"
- [ ] Template Details page and Our Projects page
- [ ] Template catalogue model and public API; preview-image capture script
- [ ] For admins (moved here from the admin dashboard phase): template management and the demo-submissions inbox
- [ ] Demo bar says "for evaluation only"; the code protections of [D-037](DECISIONS.md) apply
- [ ] Home: the featured templates and demo projects sections switch on; the "Explore Templates" button appears
- [ ] Tests:
  - [ ] Configuration validation (unit)
  - [ ] Key sections (component)
  - [ ] Form states
  - [ ] End to end: Templates → View Live Demo → contact form
- [ ] Responsive check at 390, 768 and 1280 px; keyboard check
- [ ] Summary with the tests that ran
- [ ] **(gate)** Demo approval before Phase 9

## Phase 9: Website builder (core)

- [ ] `/build` wizard steps 1–8:
  - [ ] Category, template, pages
  - [ ] Sections, with required sections enforced
  - [ ] Content
  - [ ] Design
  - [ ] Preview
  - [ ] Save
- [ ] Content editors for text, links and buttons, repeatable lists, and images
- [ ] Design controls: themes, custom colours with a contrast warning, fonts, button style, spacing, layout variants, image position
- [ ] Preview frame at desktop, tablet and mobile widths, updated as you type; same renderer as the demos
- [ ] Configuration API: create, list, read, update, delete and duplicate; owner-only; re-validated on the server
- [ ] Saved Configurations page: open, rename, duplicate, delete
- [ ] Anonymous draft kept in this browser, with a prompt to create an account
- [ ] Unsaved-changes warning; loading, empty and error states
- [ ] Image upload:
  - [ ] Signed-in users only; JPEG, PNG or WebP up to 5 MB
  - [ ] File content checked and re-encoded on the server
  - [ ] Local storage driver for development
- [ ] Builder deployed to the live site; production image storage (cloud bucket) chosen and set up
- [ ] "Customize This Design" button live on Templates, Template Details and `/demo/portfolio`; it loads the portfolio defaults
- [ ] Home: the "Build Your Website" button appears
- [ ] Tests:
  - [ ] End to end: Customize → edit → preview → save → reload
  - [ ] Invalid configuration and unknown template are rejected
  - [ ] Ownership rules
  - [ ] Upload type and size limits
- [ ] **(gate)** Approval for Phase 10

## Phase 10: Demo 2 (Business, `/demo/business`)

- [ ] Your approval of the design brief
- [ ] Template definition and default content: fictional, with testimonials labelled as demonstration content
- [ ] Sections: navigation, hero, company introduction, services, feature highlights, projects or gallery, testimonials, contact form, footer
- [ ] Calls to action work; contact form saved, with honest success and error states
- [ ] Builder integration: defaults load, every section is editable, the preview updates
- [ ] Preview image; Templates, Template Details and Our Projects entries
- [ ] Tests:
  - [ ] Template validation and section components
  - [ ] Form states
  - [ ] End to end: live demo
  - [ ] End to end: Customize This Design
- [ ] Responsive check at 390, 768 and 1280 px; keyboard check
- [ ] Summary with the tests that ran
- [ ] **(gate)** Demo approval

## Phase 11: Demo 3 (College and Event, `/demo/event`)

- [ ] Your approval of the design brief
- [ ] Template definition and default content: a fictional college and event
- [ ] Sections: event banner; date, time and location; introduction; schedule; event categories; guidelines; registration form; contact information; footer
- [ ] Registration:
  - [ ] Every field validated
  - [ ] Saved on the server
  - [ ] Confirmation shown only after the server succeeds; error state otherwise
- [ ] Builder integration; preview image; catalogue entries
- [ ] Tests:
  - [ ] Validation, including invalid registrations
  - [ ] Section components
  - [ ] End to end: live demo
  - [ ] End to end: Customize This Design
- [ ] Responsive check at 390, 768 and 1280 px; keyboard check
- [ ] Summary with the tests that ran
- [ ] **(gate)** Demo approval

## Phase 12: Demo 4 (Product Catalogue, `/demo/catalogue`)

- [ ] Your approval of the design brief
- [ ] Template definition and default content, with sample products labelled as demonstration content
- [ ] Hero; category filters kept in the URL; product cards; product details; empty state when a filter matches nothing
- [ ] Enquiry and quotation request, saved on the server with honest success and error states
- [ ] WhatsApp enquiry: in demo mode it shows the message it would send; on a customer's site it opens their number. No payments.
- [ ] Builder integration, including editing the product list; preview image; catalogue entries
- [ ] Tests:
  - [ ] Filters
  - [ ] Product details
  - [ ] Enquiry form states
  - [ ] End to end: live demo
  - [ ] End to end: Customize This Design
- [ ] Responsive check at 390, 768 and 1280 px; keyboard check
- [ ] Summary with the tests that ran
- [ ] **(gate)** Demo approval

## Phase 13: Demo 5 (Forms and Quick Solutions, `/demo/forms`)

- [ ] Your approval of the design brief
- [ ] Contact, registration, enquiry and feedback forms with validation
- [ ] Every form saved on the server; success only after confirmation; error state when the request fails
- [ ] Builder integration: choose forms and fields; preview image; catalogue entries
- [ ] Tests:
  - [ ] Each form valid and invalid
  - [ ] Server failure shows the error state
  - [ ] End to end: live demo
  - [ ] End to end: Customize This Design
- [ ] Responsive check at 390, 768 and 1280 px; keyboard check
- [ ] Summary with the tests that ran
- [ ] **(gate)** Demo approval
- [ ] The Templates page and the Customize flow tested end to end across all 5 demos

## Phase 14: Submit a design as a project

- [ ] Builder step 9: review summary → confirm → project request (source "builder")
- [ ] The server re-validates the configuration (it must be the customer's own) and stores a frozen copy
- [ ] Saved designs on the dashboard get a "Submit as a project" button
- [ ] Admin project details show the design rendered read-only
- [ ] Tests: ownership; end to end: customize → submit → My Projects
- [ ] Known limitations and remaining manual tasks listed
