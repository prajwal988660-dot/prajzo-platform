# Prajzo roadmap

Last updated: 17 October 2026 (end of Phase 0)

This document covers the order in which Prajzo gets built, what each phase delivers, and how we'll know each phase is done. Every phase ends with a short summary and a pause for your approval before the next one starts.

## Working agreement

1. **One phase at a time.** Each phase ends with:
   - what works
   - which tests ran, with their results
   - how you can check it yourself
   - an updated [checklist](CHECKLIST.md)

   Then work stops until you approve the next phase.
2. **Showcase demos one by one.** The order is Portfolio, Business, Event, Catalogue, Forms. Each demo gets a test pass and your approval before the next one starts.
3. **Nothing fake.** That means:
   - no buttons that do nothing
   - no hard-coded dashboard numbers
   - no success message unless the server confirmed it
4. **No links to unbuilt features.** A link or button appears only once what it opens works.
5. **Ask first** before any of these:
   - a major architecture change
   - anything that costs money
   - deleting or moving your files
   - growing the scope
6. **"Tested" means the tests actually ran** and the results were checked. If something wasn't run, the summary says so.
7. **The project stays runnable.** At the end of every phase, `npm run check` must pass. It runs the type check, lint, tests and production build.

## Phases at a glance

Estimates are in 4-hour working sessions. They're rough and will be recalibrated after Phase 1.

| # | Phase | At the end you can… | Sessions | Gate |
|---|---|---|---|---|
| 0 | Discovery and plan | Read this plan | 1 (done) | Your approval |
| 1 | Foundation | Run the app shell and the API locally; run every check with one command | 2–3 | Approval |
| 2 | Public website and service catalogue | Browse Home, Services (15 categories), How It Works, Pricing, About, Contact (working form), Privacy, Terms | 4–5 | Approval |
| 3 | Accounts and access control | Register, log in, log out, reset a password; log in as an admin created by a setup script | 3–4 | Approval |
| 4 | Template engine + Demo 1: Portfolio | Open `/demo/portfolio`; see it on the Templates and Live Demos page | 5–6 | **Demo approval** |
| 5 | Website builder (core) | Click "Customize This Design", edit the portfolio, preview desktop/tablet/mobile, save it | 7–9 | Approval |
| 6 | Demo 2: Business | Open `/demo/business` and customize it | 3–4 | **Demo approval** |
| 7 | Demo 3: College and Event | Open `/demo/event`, register for the demo event, customize it | 3–4 | **Demo approval** |
| 8 | Demo 4: Product Catalogue | Open `/demo/catalogue`, filter products, request a quote, customize it | 3–4 | **Demo approval** |
| 9 | Demo 5: Forms and Quick Solutions | Open `/demo/forms`, submit each form, customize it | 2–3 | **Demo approval** |
| 10 | Project requests and customer dashboard | Submit a design as a project, get a reference number, follow its status | 4–5 | Approval |
| 11 | Admin dashboard | Review requests, send quotes, set delivery dates, change statuses, manage templates, categories and prices | 5–6 | Approval |
| 12 | Hardening and quality | Run the full test suite; security, accessibility, performance and SEO passes done | 3–4 | Approval |
| 13 | Deployment | Prajzo live on your domain (needs your hosting, database, email and storage accounts) | 2–3 | Approval |

Total: about 46–60 sessions. At one session a day, five days a week, that is roughly 9–12 weeks, not counting time spent waiting for approvals.

## Why the builder comes right after the first demo

Every demo needs a working "Customize This Design" button, and that button opens the builder. If all five demos came first, they would sit unfinished until the builder existed. We would also learn late whether the template format actually works for editing, after five templates had been built on it.

So the order is:

1. **Phase 4** builds the template engine and the Portfolio demo.
2. **Phase 5** builds the builder against that real template.
3. **Phases 6–9** each deliver one demo completely, including its builder integration, before you approve it.

If you'd rather see all five demos before the builder, say so and Phases 5–9 will be reordered (decision Q4).

## Which phase builds which page

| Page | Phase | | Page | Phase |
|---|---|---|---|---|
| Custom 404 | 1 | | Build Your Website | 5 |
| Home | 2 (template and builder sections in 4–5) | | Saved Configurations | 5 |
| Services | 2 | | Start a Project | 10 |
| How It Works | 2 | | My Projects | 10 |
| Pricing and Plans | 2 | | Project Details and Status | 10 |
| About Us | 2 | | Customer Dashboard | 3 (shell), 10 (complete) |
| Contact Us | 2 | | Admin Dashboard | 3 (shell), 11 (complete) |
| Privacy Policy | 2 | | Admin Project Management | 11 |
| Terms and Conditions | 2 | | Admin Template Management | 11 |
| Customer Registration | 3 | | Live Demos `/demo/*` | 4, 6, 7, 8, 9 |
| Customer Login | 3 | | Templates and Live Demos | 4 (grows to 5 demos in 6–9) |
| Admin Login | 3 | | Template Details | 4 |
| | | | Our Projects | 4 (grows in 6–9) |

## Phase details

### Phase 0: Discovery and plan (done)

Inspected the folder, the assets, the installed tools and current package versions, then wrote these documents. Findings are in [README](../README.md) and [SETUP](SETUP.md), and in the risk list below.

### Phase 1: Foundation

**Goal:** a clean, runnable, tested skeleton that everything else builds on.

- **Safety first** (needs your OK, decision Q1):
  - run `git init`
  - commit the current static site as a baseline
  - move the static site to `legacy/static-site/`, where it keeps working
- **Repository layout:** a monorepo with npm workspaces: `apps/web`, `apps/api` and `packages/shared`.
- **Web app:**
  - React, Vite, TypeScript, Tailwind CSS and React Router
  - Prajzo design tokens taken from the logo
  - base components: buttons, form fields with error messages, cards, badges, alerts, spinner, empty state
  - app shell with header, mobile menu, footer and a custom 404 page
- **API:**
  - Express with TypeScript
  - settings checked at startup; the API refuses to start if one is missing or invalid
  - request logging, security headers and consistent JSON errors
  - `/api/health`, plus `/api/health/ready`, which also checks the database
- **Database:** the MongoDB connection, plus a test helper that runs an in-memory MongoDB so tests never touch your data.
- **Commands:** `npm run dev` starts the web app and the API together. `npm run check` runs the type check, lint, tests and production build.

**Done when:**

- the shell opens at http://localhost:5173 with working navigation and the 404 page
- `/api/health/ready` reports the database as connected
- the first tests pass (health endpoints, settings validation, a UI component)
- `npm run check` passes

### Phase 2: Public website and service catalogue

**Goal:** the public Prajzo site, with real data from the API.

- **Data:** database collections and a seed script for the 15 website categories and the 3 packages (Quick Launch, Professional Website, Advanced Development).
- **Pages:** Home, Services, How It Works, Pricing and Plans, About Us, Contact Us, Privacy Policy, Terms and Conditions.
- **Home page:**
  - Sections: header; hero ("Your Idea. Your Design. Our Development."); delivery highlights with their conditions; categories; how it works; the customization feature; packages; why Prajzo; FAQ; final call to action; footer.
  - The featured templates and demo projects sections switch on in Phase 4.
  - The hero buttons "Explore Templates" and "Build Your Website" switch on in Phases 4 and 5. Until then the hero shows a working "Contact us" button.
- **Services page:**
  - Each category shows its icon, description, use cases and delivery category.
  - Each category has a button: "Start a project" (goes to Contact until Phase 10), plus "View templates" once a template exists for that category.
- **Pricing page:** prices come from the database and show "Request a quote" until you set them.
- **Contact form:**
  - validated in the browser and again on the server
  - rate-limited and saved to the database
  - the notification email is printed to the API console in development
- **Quality:** a responsive and accessibility pass on every page.

**Done when:**

- pages show real API data
- the contact form shows success only after the server confirms, and a clear error otherwise
- API tests cover valid, invalid and rate-limited submissions
- screenshots at 390, 768 and 1280 px widths have been checked

### Phase 3: Accounts and access control

**Goal:** real accounts, protected on the server.

- **Customer accounts:** registration, login, logout, "who am I", password reset by email (printed to the console in development), change password, profile.
- **Sessions:** stored in MongoDB, with a cookie that scripts on the page can't read.
- **Access rules:**
  - Server-side guards for customer-only and admin-only routes.
  - Matching page guards in the app, for convenience only; the server is what enforces access.
- **Admins:**
  - an admin login page
  - admin accounts created only by a setup script (`npm run admin:create`)
  - no public admin registration
- **Dashboards:** shells for the customer and admin dashboards, each with an honest empty state.
- **Rate limits** on login, registration and password reset.

**Done when:**

- tests pass for:
  - duplicate email
  - wrong password
  - rate limiting
  - expired sessions
  - logout
  - a customer calling admin APIs (refused)
  - the admin setup script
- an end-to-end test registers, logs in, opens the dashboard and logs out

### Phase 4: Template engine + Demo 1 (Portfolio)

**Goal:** the first complete showcase demo, built on the shared template engine that every later demo and the builder use.

- **Website configuration format:** the shared format for pages, sections, content and design settings, plus its validation. The app and the API use the same code.
- **Template definition format:** each definition lists the pages and sections a template supports, its layout variants, colour themes, fonts, button styles and spacing, and holds the template's full default configuration, the demo itself.
- **Site renderer:** shared section components that draw any configuration. The live demos, the builder preview and the admin review screen all use it.
- **Design brief first:** a short brief for the Portfolio demo (colours, fonts, layout), approved by you before any code.
- **Portfolio template:** its own design, with realistic and clearly fictional content. Sections: navigation, hero, profile introduction, skills, projects, experience and education, contact form, social links, footer.
- **Live demo:** `/demo/portfolio`, with a slim "Demo website by Prajzo" bar.
- **Demo contact form:**
  - saves to the database; demo submissions are deleted automatically after 7 days (decision D-014)
  - shows success only after the server confirms, and a clear error otherwise
- **Templates and Live Demos page** (`/templates`). Each entry shows:
  - a representative preview
  - category, description and features included
  - a "View Live Demo" button
- **Template Details page:** `/templates/portfolio`.
- **Our Projects page:** the demo presented as a case study, labelled as a demonstration project.
- **Preview images:** screenshots of the real demo, made by a script, so they never drift from what the demo actually shows.

**Done when:**

- the demo works at 390, 768 and 1280 px, and with a keyboard alone
- every link and button works
- form validation, success and error states are tested
- the configuration validation has unit tests
- an end-to-end test goes Templates → View Live Demo → contact form

**Stop here:** a summary and the tests run, then your approval before Phase 5.

### Phase 5: Website builder (core)

**Goal:** the core feature. Customize a template and see the result immediately.

- **The `/build` wizard:**
  1. Category
  2. Template
  3. Pages
  4. Sections (required ones can't be removed)
  5. Content
  6. Design
  7. Live preview
  8. Save
- **Content editors** for every section type the template uses: text, buttons and links, lists (skills, projects, services…) and images.
- **Design settings:** the template's colour themes, custom brand colours (with a warning if text becomes hard to read), font pairs, button style, spacing, layout variants and image position.
- **Live preview:** desktop, tablet and mobile sizes, updated as you type, using the same renderer as the live demos.
- **Saving:**
  - Signed-in customers save to their account, and can open, rename, duplicate and delete saved designs.
  - Visitors without an account keep a draft in this browser only, with a clear prompt to sign up to keep it.
- **Safety and states:** a warning before leaving with unsaved changes; loading, empty and error states throughout.
- **Image upload** (signed-in customers only): JPEG, PNG or WebP up to 5 MB, checked and re-encoded on the server.
- **"Customize This Design" goes live** on the Templates page, Template Details and the Portfolio demo. It opens the builder with the Portfolio template and its default configuration loaded.
- **Not yet:** Step 9 (submit as a project) comes in Phase 10, so there is no submit button until then.

**Done when:**

- an end-to-end test passes: Templates → Customize This Design → the builder shows the portfolio defaults → change the heading and a colour → the preview updates → save → reload → the changes are still there
- the API rejects invalid configurations and configurations for unknown templates
- one customer can't read another customer's configuration
- uploads reject the wrong file types and files that are too large

### Phases 6–9: Showcase demos 2 to 5

Each demo phase delivers, for one demo:

- a short design brief (colours, fonts, layout), approved by you before coding
- the template definition and its default content
- any new section types
- the live demo route
- the builder integration
- a preview image and entries on Templates, Template Details and Our Projects
- tests, then a pause for your approval

| Phase | Demo | Route | Must include |
|---|---|---|---|
| 6 | Business | `/demo/business` | Navigation; hero; company introduction; services; feature highlights; projects or gallery; testimonials labelled as demonstration content; contact form; footer; working calls to action |
| 7 | College and Event | `/demo/event` | Event banner; date, time and location; schedule; event categories; guidelines; registration form with validation (saved; confirmation only after the server confirms); contact information; footer |
| 8 | Product Catalogue | `/demo/catalogue` | Hero; category filters; product cards; product details; enquiry or quotation request; WhatsApp enquiry (in the demo it shows the message it would send; on a customer's own site it opens WhatsApp to their number); sample products labelled; no payments |
| 9 | Forms and Quick Solutions | `/demo/forms` | Contact, registration, enquiry and feedback forms with validation, success and error states, saved on the server |

Every demo must:

- have its own distinct design
- be responsive and keyboard-friendly
- use clearly fictional content
- have no broken links
- have its full "Customize This Design" path tested end to end

### Phase 10: Project requests and customer dashboard

- **Builder step 9:** a review summary, then confirm. The summary covers category, template, pages and sections, design, content, features, integrations, notes and the requested delivery category.
- **On submission, the server:**
  - re-checks the saved configuration
  - freezes a copy of it
  - creates a project request with a reference number (for example `PRZ-2026-0001`) and the status "Request Received"
- **Start a Project page:** for custom work that doesn't start from a template.
- **Confirmation emails** to the customer and to Prajzo.
- **Customer dashboard:**
  - a welcome section
  - saved configurations and a new-project button
  - My Projects, with reference numbers and statuses
  - project details: confirmed scope, quote, confirmed delivery date once set, status timeline and revisions
  - account settings
- **Customer actions,** limited to what the workflow allows: accept or decline a quote, provide requested information, request a revision.

**Done when:**

- tests prove that customers:
  - see only their own records
  - can't set prices, delivery dates or admin-only statuses
- invalid status changes are refused
- reference numbers stay unique even when two requests arrive at the same moment
- an end-to-end test passes: customize → submit → My Projects

### Phase 11: Admin dashboard

- **Overview:** real counts by status and recent activity.
- **Project requests:**
  - filter, search and pagination
  - details with the customer's design rendered read-only
  - scope, quote and confirmed delivery date
  - status changes with notes
  - internal admin notes, never shown to customers
  - the full status history
- **Customers:** list and details.
- **Template management:** publish or hide, featured, order, text, categories and preview image. Template designs stay in code.
- **Category, package and price management.**
- **Inbox** for contact messages and demo submissions.
- **Audit trail:** a log of admin actions, plus emails to customers on status changes.

**Done when:**

- every admin API refuses non-admins (tested)
- every allowed and refused status change is tested, and each one is recorded with who made it and when
- an end-to-end admin test moves a project from "Request Received" to "Completed"

### Phase 12: Hardening and quality

- **Security review:**
  - security headers and the content security policy
  - session settings and rate limits
  - the upload path
  - a dependency audit
- **Testing:** the full end-to-end suite, and responsive checks of every page at 3 widths.
- **Accessibility:** automated checks plus a keyboard pass.
- **Performance:** code splitting and image sizes.
- **Discoverability:** SEO titles and descriptions, social previews, favicons.
- **Operations:** error logging, and a rehearsal of a database backup and restore.

### Phase 13: Deployment

This phase needs your accounts, plus your approval for anything paid.

- **Production settings.**
- **Hosting:** the recommendation is one Node service that serves both the API and the built site.
- **Database:** MongoDB Atlas.
- **Image storage.**
- **Email:** a provider set up with your domain's SPF and DKIM records.
- **Domain, HTTPS and backups.**
- **Monitoring and health checks.**
- **A live smoke test.** Prajzo is called "live" only after this test passes on the real address.

## Risks and how we handle them

| Risk | Impact | How we handle it |
|---|---|---|
| The scope is large for 4 hours a day | Slips, half-finished features | Small phases with approval gates; each phase finishes completely; extras go on a "later" list |
| Builder complexity | The biggest single piece of work | Predefined templates and sections only (no drag-and-drop); editors generated from the template definition; built against a real template early |
| Template format changes after customers save designs | Saved designs break | Version numbers on configurations and templates, with upgrade functions; the format settles during Phases 4–9, before launch |
| Five demos look generic | A weak showcase | A design brief per demo, approved by you before coding |
| Preview differs from the real site on mobile | Customers are surprised | The preview runs in a real frame at device width, using the same renderer |
| Unsafe uploads; storage costs | Security, money | Images only; size limits; server-side checks and re-encoding; signed-in users only |
| Delivery targets read as promises | Disputes | Shown as conditional targets; a delivery date exists only after an admin confirms it |
| Demo content mistaken for real | Trust, legal | A demo banner on every demo; fictional names; `example.com` addresses; no real person's photo used for a fictional persona; testimonials labelled |
| Personal data (India's Digital Personal Data Protection Act, 2023) | Legal | Collect the minimum; demo submissions deleted automatically; Privacy and Terms drafted, with a lawyer to review them before launch |
| Very new package versions | Tooling breaks | Pinned versions and a committed lockfile; TypeScript held at 6.0.x until the lint tooling supports version 7 |
| Native modules on Windows (argon2, sharp) | Install failures | Both ship prebuilt Windows binaries; checked at install time; fallbacks exist |
| No MongoDB on this machine yet | The API can't run | Install it locally or use Atlas (Q2); tests use in-memory MongoDB either way |
| Email deliverability | Missed notifications | Console email in development; a real provider plus SPF/DKIM before launch |
| Free hosting sleeps when idle | Slow first visit | A small paid instance is recommended for launch (your call in Phase 13) |
| A working session ends mid-task | Lost context | Docs and checklist kept current; a commit at every green step |

## Open decisions

### Needed before Phase 1

- **Q1: Existing site and repository.**
  - Recommended: make this folder the platform repository. First run `git init` and commit the static site exactly as it is, then move it to `legacy/static-site/`, where it keeps working.
  - Alternative: build the platform in a new sibling folder and leave this folder untouched.
- **Q2: Development database.**
  - Recommended: MongoDB Community Server installed locally (`winget install MongoDB.Server`; needs an admin prompt).
  - Alternative: a free MongoDB Atlas cluster, which needs an account and an internet connection.
  - Tests use an in-memory database either way.
- **Q3: Git identity.** Your name and email for commits. They aren't set on this machine yet.
- **Q4: Build order.** Recommended: the builder right after the Portfolio demo, as explained above.

### Needed later

| When | Decision |
|---|---|
| Phase 2 | Real contact details: email, phone, WhatsApp number, city or address, social links. The static site's are placeholders. |
| Phase 2 | Prices: keep "Request a quote" for now, or start with the ₹ prices from the static site as editable defaults |
| Phase 4 | Confirm that demo form submissions are stored and then deleted after 7 days |
| Phase 10 | Confirm the status workflow (who may move a project between which states) in [ARCHITECTURE.md §8](ARCHITECTURE.md#8-project-status-workflow) |
| Phase 13 | Domain (is prajzo.com yours?), hosting, image storage, email provider, any paid plans |

## Later (not in this plan unless you approve it)

- Online payments
- Drag-and-drop editing
- Generating a site's source code from a configuration
- Publishing customers' sites automatically
- Multiple admin roles
- Two-factor sign-in for admins
- Real client case studies on Our Projects
