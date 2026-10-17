# Prajzo task checklist

A box is ticked only after the work is done and its tests have run. Phase descriptions and exit criteria are in [ROADMAP.md](ROADMAP.md).

Last updated: 17 October 2026

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
- [ ] **(gate)** Your approval of the plan, plus answers to Q1–Q4

## Phase 1: Foundation

- [ ] Git identity set; `git init`; `.gitignore`; baseline commit of the static site
- [ ] Static site moved to `legacy/static-site/`; local static server restarted from there
- [ ] Root `package.json` with npm workspaces and scripts: `dev`, `check`, `test`, `build`
- [ ] Shared strict TypeScript 6.0 config; ESLint with typescript-eslint; Prettier
- [ ] `packages/shared` skeleton with Zod
- [ ] `apps/api`:
  - [ ] Express 5 with settings validation, logging and security headers
  - [ ] Error handler and 404 handling
  - [ ] Health endpoints
  - [ ] MongoDB connection with graceful shutdown
- [ ] `apps/web`:
  - [ ] Vite, React, Tailwind and React Router
  - [ ] Design tokens taken from the logo
  - [ ] Base UI components
  - [ ] Header with mobile menu, footer, 404 page
- [ ] Vite proxy `/api` → API in development; `npm run dev` starts both
- [ ] Test setup: Vitest projects, in-memory MongoDB helper, Testing Library
- [ ] First tests: health endpoints, settings validation, button and form-field components
- [ ] `npm run check` passes; the app opens at http://localhost:5173
- [ ] SETUP, ENVIRONMENT and this checklist updated
- [ ] **(gate)** Approval for Phase 2

## Phase 2: Public website and service catalogue

- [ ] Your real contact details and pricing choice (see open decisions)
- [ ] Category, package and contact-message models; seed script (15 categories, 3 packages)
- [ ] API endpoints:
  - [ ] List categories
  - [ ] List packages
  - [ ] Submit a contact message: validated, rate-limited, stored, notification printed to the console
- [ ] Home page:
  - [ ] Header, hero, delivery highlights with their conditions
  - [ ] Categories, how it works, customization feature
  - [ ] Packages, why Prajzo, FAQ
  - [ ] Final call to action, footer
- [ ] Services page: 15 categories with icon, description, use cases, delivery category and a call to action
- [ ] How It Works, Pricing and Plans, About Us and Contact Us pages
- [ ] Privacy Policy and Terms and Conditions drafts, flagged for legal review
- [ ] Loading, empty and error states for every section that uses the API
- [ ] Tests:
  - [ ] API: valid, invalid and rate-limited submissions
  - [ ] Contact form component
  - [ ] End to end: navigation and contact form
- [ ] Responsive check at 390, 768 and 1280 px; keyboard and colour-contrast check
- [ ] **(gate)** Approval for Phase 3

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
