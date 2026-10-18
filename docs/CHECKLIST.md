# Prajzo task checklist

A box is ticked only after the work is done and its tests have run. Phase descriptions and exit criteria are in [ROADMAP.md](ROADMAP.md).

Last updated: 18 October 2026 (end of Phase 2)

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
- [ ] **(gate)** Approval for Phase 3: merge the `phase-2-public-site` pull request

## Phase 3: Accounts and access control

- [ ] User model with `customer` and `admin` roles; passwords hashed with argon2id
- [ ] Register, log in, log out, "who am I"; sessions stored in MongoDB with an httpOnly cookie
- [ ] Password reset by email (printed to the console in development); change password; profile
- [ ] Server guards for signed-in users, admins and record ownership; matching page guards in the app
- [ ] Rate limits on login, registration and password reset
- [ ] `npm run admin:create` setup script; no public admin registration
- [ ] Pages: Customer Registration, Customer Login, Admin Login
- [ ] Shells for the customer and admin dashboards, with honest empty states
- [ ] Tests:
  - [ ] Duplicate email and wrong password
  - [ ] Rate limits
  - [ ] Expired session and logout
  - [ ] A customer calling admin APIs is refused
  - [ ] The admin setup script
  - [ ] End to end: register → log in → dashboard → log out
- [ ] **(gate)** Approval for Phase 4

## Phase 4: Template engine + Demo 1 (Portfolio, `/demo/portfolio`)

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
- [ ] Home: the featured templates and demo projects sections switch on; the "Explore Templates" button appears
- [ ] Tests:
  - [ ] Configuration validation (unit)
  - [ ] Key sections (component)
  - [ ] Form states
  - [ ] End to end: Templates → View Live Demo → contact form
- [ ] Responsive check at 390, 768 and 1280 px; keyboard check
- [ ] Summary with the tests that ran
- [ ] **(gate)** Demo approval before Phase 5

## Phase 5: Website builder (core)

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
- [ ] "Customize This Design" button live on Templates, Template Details and `/demo/portfolio`; it loads the portfolio defaults
- [ ] Home: the "Build Your Website" button appears
- [ ] Tests:
  - [ ] End to end: Customize → edit → preview → save → reload
  - [ ] Invalid configuration and unknown template are rejected
  - [ ] Ownership rules
  - [ ] Upload type and size limits
- [ ] **(gate)** Approval for Phase 6

## Phase 6: Demo 2 (Business, `/demo/business`)

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

## Phase 7: Demo 3 (College and Event, `/demo/event`)

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

## Phase 8: Demo 4 (Product Catalogue, `/demo/catalogue`)

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

## Phase 9: Demo 5 (Forms and Quick Solutions, `/demo/forms`)

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

## Phase 10: Project requests and customer dashboard

- [ ] Builder step 9: review summary → confirm → project request
- [ ] Server re-validates the configuration, stores a frozen snapshot, issues a unique reference number, records "Request Received"
- [ ] Start a Project page for custom work
- [ ] Confirmation emails to the customer and to Prajzo
- [ ] Customer dashboard:
  - [ ] Welcome section
  - [ ] Saved configurations and a new-project button
  - [ ] My Projects
  - [ ] Project details with status timeline, quote, confirmed date and revisions
  - [ ] Account settings
- [ ] Customer actions: accept or decline a quote, provide information, request a revision (workflow rules enforced on the server)
- [ ] Tests:
  - [ ] Ownership
  - [ ] Refused fields: price, date and status
  - [ ] Invalid status changes
  - [ ] Reference numbers unique when requests arrive at the same moment
  - [ ] End to end: customize → submit → My Projects
- [ ] **(gate)** Approval for Phase 11

## Phase 11: Admin dashboard

- [ ] Overview with real counts by status and recent activity
- [ ] Project requests:
  - [ ] Filter, search, pagination
  - [ ] Details with a read-only render of the design
  - [ ] Scope, quote and confirmed delivery date
  - [ ] Status changes with notes; internal notes; status history
- [ ] Customers list and details
- [ ] Templates management: publish, featured, order, text, categories, preview image
- [ ] Categories management; packages and prices management
- [ ] Inbox for contact messages and demo submissions
- [ ] Audit log of admin actions; status-change emails
- [ ] Tests:
  - [ ] Every admin endpoint refuses non-admins
  - [ ] Every status transition, allowed and refused, with history recorded
  - [ ] End to end: an admin takes a project from "Request Received" to "Completed"
- [ ] **(gate)** Approval for Phase 12

## Phase 12: Hardening and quality

- [ ] Security review:
  - [ ] Security headers and content security policy
  - [ ] Cookies and sessions
  - [ ] Rate limits
  - [ ] Uploads
  - [ ] `npm audit`
- [ ] Full end-to-end suite green
- [ ] Every page checked at 390, 768 and 1280 px
- [ ] Automated accessibility checks (axe) plus a manual keyboard pass
- [ ] Performance: code splitting, image sizes, Lighthouse check
- [ ] SEO titles and descriptions, Open Graph images, favicons
- [ ] Error logging; database backup and restore rehearsed
- [ ] **(gate)** Approval for Phase 13

## Phase 13: Deployment

- [ ] Your choices and accounts: domain, hosting, MongoDB Atlas, image storage, email provider
- [ ] Production settings documented; secrets set only on the host
- [ ] Production build deployed; HTTPS working; health checks passing
- [ ] Email domain records (SPF, DKIM) verified
- [ ] Backups scheduled; monitoring and alerts on
- [ ] Live smoke test passed on the real address
- [ ] Known limitations and remaining manual tasks listed
