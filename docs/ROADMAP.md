# Prajzo roadmap

Last updated: 23 October 2026 (end of Phase 4)

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

Estimates are in 4-hour working sessions. They're rough: Phases 1–3 each took about one session, which was faster than first estimated, but the phases ahead are larger.

**Build order (chosen 23 October 2026, Option A, [D-036](DECISIONS.md)):** the main website first, then the template engine, builder and demos. Phases 4–7 finish the main website and put it online. Phases 8–14 add the demos and the builder.

| # | Phase | At the end you can… | Sessions | Gate |
|---|---|---|---|---|
| 0 | Discovery and plan | Read this plan | 1 (done) | Your approval |
| 1 | Foundation | Run the app shell and the API locally; run every check with one command | 1 (done, approved 18 Oct) | Approval |
| 2 | Public website and service catalogue | Browse Home, Services (15 categories), How It Works, Pricing, About, Contact (working form), Privacy, Terms | 1 (done, awaiting approval) | Approval |
| 3 | Accounts and access control | Register, log in, log out, reset a password; log in as an admin created by a setup script | 1 (done, awaiting approval) | Approval |
| 4 | Project requests and customer dashboard | Send a project from the Start a Project form, get a reference number, follow it in My Projects, cancel it while it's early | 1 (done, awaiting approval) | Approval |
| 5 | Admin dashboard | Review requests, send quotes, set delivery dates, change statuses, read contact messages; customers accept quotes and ask for revisions | 5–6 | Approval |
| 6 | Hardening and quality | Run the full test suite; security, accessibility, performance, SEO and code-protection passes done | 3–4 | Approval |
| 7 | Deployment | **The main website live on your domain** (needs your hosting, email and domain accounts) | 2–3 | Approval |
| 8 | Template engine + Demo 1: Portfolio | Open `/demo/portfolio`; see it on the Templates and Live Demos page | 5–6 | **Demo approval** |
| 9 | Website builder (core) | Click "Customize This Design", edit the portfolio, preview desktop/tablet/mobile, save it | 7–9 | Approval |
| 10 | Demo 2: Business | Open `/demo/business` and customize it | 3–4 | **Demo approval** |
| 11 | Demo 3: College and Event | Open `/demo/event`, register for the demo event, customize it | 3–4 | **Demo approval** |
| 12 | Demo 4: Product Catalogue | Open `/demo/catalogue`, filter products, request a quote, customize it | 3–4 | **Demo approval** |
| 13 | Demo 5: Forms and Quick Solutions | Open `/demo/forms`, submit each form, customize it | 2–3 | **Demo approval** |
| 14 | Submit a design as a project | Customize a template, submit it, follow it in My Projects | 1 | Approval |

Remaining: Phases 5–7 (main website online) about 10–13 sessions, Phases 8–14 (builder and demos) about 24–31. That is roughly 34–44 sessions, or 8–10 weeks at one session a day, five days a week, not counting time spent waiting for approvals.

**Not a numbered phase:** the protection of the website's code (D-037), added on request on 23 October 2026. See the checklist.

## Why the builder comes right after the first demo

Once the main website is live, the demos and the builder come next. Every demo needs a working "Customize This Design" button, and that button opens the builder. If all five demos came first, they would sit unfinished until the builder existed. We would also learn late whether the template format actually works for editing, after five templates had been built on it.

So the order is:

1. **Phase 8** builds the template engine and the Portfolio demo.
2. **Phase 9** builds the builder against that real template.
3. **Phases 10–13** each deliver one demo completely, including its builder integration, before you approve it.
4. **Phase 14** lets customers submit a design as a project.

If you'd rather see all five demos before the builder, say so and Phases 9–13 will be reordered (decision Q4).

**Update (23 October 2026):** you chose Option A (D-036): project requests, the admin dashboard, hardening and going live come before the demos and the builder. Phases are numbered in build order; D-036 lists the numbers used in earlier versions of these documents.

## Which phase builds which page

| Page | Phase | | Page | Phase |
|---|---|---|---|---|
| Custom 404 | 1 | | Build Your Website | 9 |
| Home | 2 (template and builder sections in 8–9) | | Saved Configurations | 9 |
| Services | 2 | | Start a Project | 4 |
| How It Works | 2 | | My Projects | 4 |
| Pricing and Plans | 2 | | Project Details and Status | 4 (quote and revisions in 5) |
| About Us | 2 | | Customer Dashboard | 3 (shell), 4 (complete) |
| Contact Us | 2 | | Admin Dashboard | 3 (shell), 5 (complete) |
| Privacy Policy | 2 | | Admin Project Management | 5 |
| Terms and Conditions | 2 | | Admin Template Management | 8 |
| Customer Registration | 3 | | Live Demos `/demo/*` | 8, 10, 11, 12, 13 |
| Customer Login | 3 | | Templates and Live Demos | 8 (grows to 5 demos in 10–13) |
| Admin Login | 3 | | Template Details | 8 |
| | | | Our Projects | 8 (grows in 10–13) |

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
  - The featured templates and demo projects sections switch on in Phase 8.
  - The hero buttons "Explore Templates" and "Build Your Website" switch on in Phases 8 and 9. Until then the hero shows a working "Contact us" button.
- **Services page:**
  - Each category shows its icon, description, use cases and delivery category.
  - Each category has a button: "Start a project" (goes to Contact until Phase 4), plus "View templates" once a template exists for that category.
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

### Phase 4: Project requests and customer dashboard

**Goal:** customers can send Prajzo a project and follow it.

- **Start a Project page** (`/start-project`):
  - Open to everyone. It explains the steps. Signed-in customers get the form; visitors are asked to sign in or create an account first, then come straight back to the form.
  - The form asks for: a project name, the type of website (the 15 categories), a package or "not sure", a description of the idea, features and integrations from checklists, a preferred date (a wish, not a promise), how you'd like to be contacted, and notes. It is validated in the browser and again on the server.
- **On submission, the server:**
  - re-checks everything, and that the chosen category and package really exist
  - creates the project request with a reference number (for example `PRZ-2026-0001`) and the status "Request Received"
  - records the first entry of the status history
  - sends a confirmation to the customer and a notification to Prajzo (printed to the API console until real email is set up in Phase 7)
- **Customer dashboard:**
  - the account page shows a welcome, the latest projects and a "Start a project" button
  - **My Projects:** every project, newest first, with its reference number and status
  - **Project details:** what was requested, the current status, a timeline of status changes, and what happens next at this status
  - **Cancel** a project while it is still early (Request Received, Awaiting Customer Information or Quote Sent)
- **Admin overview:** real counts of project requests. The review screens come in Phase 5.
- **Navigation:** the header's "Start a Project" button and the Services page buttons open the new page (until now they open Contact).
- **Not yet, and no buttons for them:** the quote, the confirmed delivery date, revisions and the customer's actions on a quote need the admin side, so they arrive in Phase 5. Submitting a builder design is Phase 14.

**Done when:**

- tests prove that customers see only their own projects and can't set a price, a delivery date or a status
- invalid status changes are refused
- reference numbers stay unique even when many requests arrive at the same moment
- an end-to-end test passes: sign up → start a project → My Projects → details → cancel

### Phase 5: Admin dashboard

- **Overview:** real counts by status and recent activity.
- **Project requests:**
  - filter, search and pagination
  - details with the customer's full request
  - scope, quote and confirmed delivery date
  - status changes with notes
  - internal admin notes, never shown to customers
  - the full status history
- **The customer's side of the workflow** (built here because it can only be tested together with the admin side): accept or decline a quote, answer a question from Prajzo, request a revision. Project details gain the quote, the confirmed delivery date and the revisions, and each button appears only when the workflow allows it.
- **Customers:** list and details.
- **Category, package and price management.**
- **Inbox for contact messages:** read, mark handled, archive.
- **Audit trail:** a log of admin actions, plus emails to customers on status changes (printed to the console until Phase 7).
- **Moved to Phase 8:** template management and the inbox for demo submissions, because they need templates and demos to exist.

**Done when:**

- every admin API refuses non-admins (tested)
- every allowed and refused status change is tested, and each one is recorded with who made it and when
- an end-to-end admin test moves a project from "Request Received" to "Completed", with the customer accepting the quote on the way

### Phase 6: Hardening and quality

- **Security review:**
  - security headers and the content security policy
  - session settings and rate limits
  - a dependency audit
- **Code protection** (D-037): confirm on the real production build that there are no source maps and no development code, that the staging password covers every file, and that right-click blocking leaves form fields working.
- **Testing:** the full end-to-end suite, and responsive checks of every page at 3 widths.
- **Accessibility:** automated checks plus a keyboard pass, including what right-click blocking does to keyboard users.
- **Performance:** code splitting and image sizes.
- **Discoverability:** SEO titles and descriptions, social previews, favicons.
- **Operations:** error logging, and a rehearsal of a database backup and restore.

### Phase 7: Deployment

This phase needs your accounts, plus your approval for anything paid.

- **Production settings.**
- **Hosting:** the recommendation is one Node service that serves both the API and the built site.
- **Staging first:** the site goes up first at a private address (for example `staging.prajzo.com`) behind the staging password (D-037). You, and anyone you give the password to, can try the real thing; nobody else can even fetch its CSS. When it passes the smoke test, the live domain is switched over and the staging password is removed from the live site.
- **Database:** MongoDB Atlas.
- **Email:** a provider set up with your domain's SPF and DKIM records, so account emails, project confirmations and status updates really are sent.
- **Domain, HTTPS and backups.**
- **Monitoring and health checks.**
- **A live smoke test.** Prajzo is called "live" only after this test passes on the real address.
- **Not yet at this point:** image storage for uploads comes with the builder (Phase 9).

### Phase 8: Template engine + Demo 1 (Portfolio)

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
- **For admins** (moved here from the admin dashboard phase, D-036): template management (publish or hide, featured, order, text, categories, preview image; the designs themselves stay in code) and an inbox for demo submissions.
- **Protected like the rest of the site** (D-037): the demo bar says the demo is for evaluation only, and the right-click and image-drag blocking and the staging password apply to it as to every other page.

**Done when:**

- the demo works at 390, 768 and 1280 px, and with a keyboard alone
- every link and button works
- form validation, success and error states are tested
- the configuration validation has unit tests
- an end-to-end test goes Templates → View Live Demo → contact form

**Stop here:** a summary and the tests run, then your approval before Phase 9.

### Phase 9: Website builder (core)

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
- **Going online:** the builder is deployed to the live site, and the image storage it needs in production (a cloud bucket) is chosen and set up here, not at the first deployment.
- **"Customize This Design" goes live** on the Templates page, Template Details and the Portfolio demo. It opens the builder with the Portfolio template and its default configuration loaded.
- **Not yet:** Step 9 (submit as a project) comes in Phase 14, so there is no submit button until then.

**Done when:**

- an end-to-end test passes: Templates → Customize This Design → the builder shows the portfolio defaults → change the heading and a colour → the preview updates → save → reload → the changes are still there
- the API rejects invalid configurations and configurations for unknown templates
- one customer can't read another customer's configuration
- uploads reject the wrong file types and files that are too large

### Phases 10–13: Showcase demos 2 to 5

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
| 10 | Business | `/demo/business` | Navigation; hero; company introduction; services; feature highlights; projects or gallery; testimonials labelled as demonstration content; contact form; footer; working calls to action |
| 11 | College and Event | `/demo/event` | Event banner; date, time and location; schedule; event categories; guidelines; registration form with validation (saved; confirmation only after the server confirms); contact information; footer |
| 12 | Product Catalogue | `/demo/catalogue` | Hero; category filters; product cards; product details; enquiry or quotation request; WhatsApp enquiry (in the demo it shows the message it would send; on a customer's own site it opens WhatsApp to their number); sample products labelled; no payments |
| 13 | Forms and Quick Solutions | `/demo/forms` | Contact, registration, enquiry and feedback forms with validation, success and error states, saved on the server |

Every demo must:

- have its own distinct design
- be responsive and keyboard-friendly
- use clearly fictional content
- have no broken links
- show the "for evaluation only" note in its demo bar and carry the code protections of D-037
- have its full "Customize This Design" path tested end to end

### Phase 14: Submit a design as a project

- **Builder step 9:** a review summary, then confirm. The summary covers category, template, pages and sections, design, content, features, integrations, notes and the requested delivery category.
- **On submission, the server:**
  - re-checks the saved configuration (it must belong to this customer)
  - freezes a copy of it
  - creates the project request exactly as in Phase 4, with source "builder"
- **Customer dashboard:** saved designs get a "Submit as a project" button.
- **Admin:** project details show the design rendered read-only, by the same renderer as the demos.

**Done when:**

- a customer can't submit someone else's design (tested)
- an end-to-end test passes: customize → submit → My Projects

## Risks and how we handle them

| Risk | Impact | How we handle it |
|---|---|---|
| The scope is large for 4 hours a day | Slips, half-finished features | Small phases with approval gates; each phase finishes completely; extras go on a "later" list |
| Builder complexity | The biggest single piece of work | Predefined templates and sections only (no drag-and-drop); editors generated from the template definition; built against a real template early |
| Template format changes after customers save designs | Saved designs break | Version numbers on configurations and templates, with upgrade functions; the format settles during Phases 8–13, before the builder opens to customers |
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
| Free hosting sleeps when idle | Slow first visit | A small paid instance is recommended for launch (your call in Phase 7) |
| Someone copies the site's or a demo's code | Lost work and revenue | Nothing can hide front-end code from a visitor, so we reduce casual copying (minified files, no source maps, right-click blocking), keep staging behind a password, hand over full code only after payment, and say so in the Terms (D-037) |
| A working session ends mid-task | Lost context | Docs and checklist kept current; a commit at every green step |

## Open decisions

### Answered on 17 October 2026

| Question | Your answer | What was done |
|---|---|---|
| Q1: Existing site and repository | Continue in this folder | Baseline commit, then the static site moved to `legacy/static-site/` (D-002); new private GitHub repo `prajzo-platform` (D-023) |
| Q2: Development database | The free database | MongoDB Atlas free cluster; setup steps in [SETUP.md](SETUP.md) (D-024) |
| Q3: Git identity | Your GitHub account | Commits use "Prajwal S" and your GitHub no-reply address, set for this repository only |
| Q4: Build order | Main website first, demos after | Phases 1–3 unchanged; the rest was confirmed on 23 October 2026 as Option A (D-036) |

### Answered on 18 October 2026

| Question | Your answer |
|---|---|
| Development database | Your MongoDB Atlas free cluster, connected and working |
| Contact details | contact@prajzo.com; +91 98866 07720 for phone and WhatsApp; Instagram @prajzoo |
| Prices | "Low range": starting from ₹2,999, ₹7,999 and ₹19,999 (D-026) |
| Hosting and domain | Hostinger, domain prajzo.com. Which Hostinger plan you have is still open (see below) |

### Answered on 23 October 2026

| Question | Your answer | What was done |
|---|---|---|
| What to build next | "Go with option A": the main website first | Phases renumbered into build order (D-036) |
| Protecting the website's and demos' code | "Disable right-click and CSS assets on staging, minify, bundle, password-protected staging … for our website and the demo site" | Staging password, a build that checks itself, right-click and image-drag blocking, a Terms clause; and a plain statement of what none of it can do (D-037) |
| Approval of Phases 2 and 3 | "Continue" and "go with option A". Pull requests #2 and #3 are still open on GitHub for you to merge | Work continues stacked on them |

### Decisions still needed

| When | Decision |
|---|---|
| Before Phase 5 | Confirm the status workflow (who may move a project from which state to which) in [ARCHITECTURE.md §8](ARCHITECTURE.md#8-project-status-workflow). Phase 4 uses only its first status and the cancellation rows |
| Before Phase 7 | Your Hostinger plan type (Business or Cloud can run Prajzo; Single or Premium can't run Node.js apps; VPS needs manual setup), whether anything is live on prajzo.com today, and whether the contact@prajzo.com mailbox exists |
| Phase 7 | Email provider, any paid plans |
| Phase 8 | Confirm that demo form submissions are stored and then deleted after 7 days |
| Phase 9 | Image storage for the builder's uploads |

## Later (not in this plan unless you approve it)

- Online payments
- Drag-and-drop editing
- Generating a site's source code from a configuration
- Publishing customers' sites automatically
- Multiple admin roles
- Two-factor sign-in for admins
- Real client case studies on Our Projects
- Password-protected preview links for customers' projects in progress, so a customer can review the work without being able to download it (reuses the staging password code from D-037)
