# Prajzo architecture

**Status:** proposed in Phase 0 (17 October 2026). This becomes the reference once you approve it. Later changes are recorded in [DECISIONS.md](DECISIONS.md).

## 1. The big picture

Prajzo is one web application made of three parts in one repository:

- **Web app** (`apps/web`) is everything people see in the browser:
  - public pages and the template catalogue
  - the five live demos
  - the website builder
  - the customer dashboard and the admin dashboard
- **API** (`apps/api`) is the server. It checks every request, enforces who may do what, and reads and writes the database.
- **Shared package** (`packages/shared`) holds the rules both sides must agree on:
  - the website configuration format
  - the template definitions
  - the project status workflow
  - the validation schemas for every form and request

```
 Browser
 ┌───────────────────────────────────────────────────────────────────┐
 │ apps/web  (React single-page app)                                 │
 │                                                                   │
 │  Public pages   Templates & Live Demos   /demo/:key (live demos)  │
 │  Builder /build ── postMessage(config) ──► preview frame /preview │
 │  Customer dashboard        Admin dashboard                        │
 └───────────────┬───────────────────────────────────────────────────┘
                 │  JSON over HTTPS  /api/v1/...   (session cookie, same address)
 ┌───────────────▼───────────────────────────────────────────────────┐
 │ apps/api  (Express)                                               │
 │  validate input (shared schemas) → check session, role, ownership │
 │  → service → Mongoose model                                       │
 │  Mailer: console in development, SMTP in production               │
 │  File storage: local disk in development, cloud bucket in prod.   │
 └───────────────┬───────────────────────────────────────────────────┘
                 │
 ┌───────────────▼───────────────────────────────────────────────────┐
 │ MongoDB: users, sessions, categories, templates, packages,        │
 │ configurations, projectRequests, assets, counters,                │
 │ contactMessages, demoSubmissions, auditLog                        │
 └───────────────────────────────────────────────────────────────────┘

 packages/shared is imported by both apps/web and apps/api
```

In production the API also serves the built web app, so the browser only ever talks to one address. That keeps cookies simple and removes the need for cross-site (CORS) settings.

## 2. Technology

Versions are the current stable releases on npm, checked on 17 October 2026. Each library is added in the phase that needs it, not all at once, and exact versions are fixed by the lockfile.

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24.17.0 installed (LTS line) |
| Packages | npm workspaces | npm 11.13.0 |
| Language | TypeScript | **6.0.3, pinned**: typescript-eslint 8.71.2 supports TypeScript below 6.1, and npm's `latest` is 7.0.2 (see D-003) |
| UI | React, React DOM | 19.3.1 |
| Build and dev server | Vite, @vitejs/plugin-react | 8.3.4, 6.1.2 |
| Styling | Tailwind CSS, @tailwindcss/vite | 4.3.3 |
| Routing | React Router | 8.4.0 (needs React ≥ 19.2.7) |
| Forms and validation | React Hook Form, @hookform/resolvers, Zod | 7.90.0, 5.9.2, 4.6.7 |
| Icons | lucide-react | 1.59.0 |
| API | Express | 5.3.0 |
| Database | MongoDB server, Mongoose | 9.0 via winget, or Atlas; Mongoose 9.11.2 (driver 7.7) |
| Sessions | express-session, connect-mongo | 1.19.0, 6.0.0 |
| Passwords | argon2 (argon2id) | 0.45.1 (prebuilt binaries, N-API 8) |
| Security | helmet, express-rate-limit | 8.3.0, 8.7.1 |
| Uploads | multer, file-type, sharp | 2.4.0, 22.2.0 (ESM only), 0.35.5 |
| Email | Nodemailer | 10.1.2 |
| Logging | pino, pino-http | 10.4.0, 11.0.0 |
| Dev tools | tsx, concurrently | 4.23.15, 10.0.6 |
| Tests | Vitest, Testing Library (React), jsdom, Supertest, mongodb-memory-server | 5.0.5, 16.3.3, 30.1.3, 7.3.1, 11.3.0 |
| End to end | Playwright, @axe-core/playwright | 1.64.1, 4.14.0 (runs on the installed Chrome) |
| Code quality | ESLint, typescript-eslint, Prettier | 10.13.0, 8.71.2, 3.9.10 |
| Fonts | Inter and Sora, self-hosted with @fontsource-variable packages | 5.3.0 (D-021) |
| API bundling | esbuild (production bundle of the API) | 0.28.2 (D-022) |

Compatibility checked: @vitejs/plugin-react 6 needs Vite 8; @tailwindcss/vite 4.3 and Vitest 5 support Vite 8; @hookform/resolvers 5.9 supports Zod 4; connect-mongo 6 works with express-session 1.19 and the MongoDB driver Mongoose uses; Vite 8 and Mongoose 9 need Node ≥ 20.19.

## 3. Folder structure

```
prajzo/
├─ apps/
│  ├─ web/                        React + Vite: everything in the browser
│  │  ├─ public/                  brand logo, demo images, captured preview images
│  │  └─ src/
│  │     ├─ app/                  router, layouts, providers, page guards
│  │     ├─ components/ui/        design-system parts: Button, Field, Card, Badge, Alert…
│  │     ├─ features/
│  │     │  ├─ marketing/         Home, Services, How It Works, Pricing, About, Contact, legal
│  │     │  ├─ catalogue/         Templates & Live Demos, Template Details, Our Projects
│  │     │  ├─ builder/           wizard steps, editors, preview frame, drafts
│  │     │  ├─ auth/              registration, login, password reset
│  │     │  ├─ account/           customer dashboard, configurations, projects, settings
│  │     │  └─ admin/             admin dashboard and management screens
│  │     ├─ site-renderer/        draws a website configuration
│  │     │  ├─ sections/          shared sections: Header, Hero, Contact, Footer…
│  │     │  └─ templates/         per-template composition and styling (5 templates)
│  │     ├─ lib/                  API client, formatting, hooks
│  │     └─ test/                 test setup and helpers
│  └─ api/                        Express API
│     ├─ scripts/build.mjs        production bundle (esbuild)
│     └─ src/
│        ├─ app.ts, server.ts     the Express app, and the process that runs it
│        ├─ config/               settings loading and validation
│        ├─ db/                   connection, models, seed data
│        ├─ modules/              one folder per area: auth, catalogue, templates,
│        │                        configurations, uploads, project-requests, admin,
│        │                        contact, demo-submissions, health
│        │                        (each holds its routes, service, schemas and tests)
│        ├─ middleware/           guards, validation, rate limits, errors, headers
│        ├─ services/             mailer, file storage (from Phase 2)
│        ├─ lib/                  logger, error types
│        ├─ web/                  serves the built web app in production
│        ├─ test/                 test helpers (in-memory MongoDB, test settings)
│        └─ scripts/              seed, admin:create (later phases)
├─ packages/
│  └─ shared/                     used by BOTH web and api (no React, no Express)
│     └─ src/
│        ├─ config/               website configuration schema and validation
│        ├─ templates/            template definitions + default (demo) configurations
│        ├─ workflow/             project statuses and allowed transitions
│        └─ schemas/              request schemas (auth, contact, project requests…)
├─ e2e/                           Playwright end-to-end tests
├─ docs/                          roadmap, checklist, architecture, decisions, environment, setup
├─ legacy/static-site/            the earlier static marketing site (kept; see Q1)
├─ assets/brand/                  original logo files
├─ .github/workflows/ci.yml       runs `npm run check` on every pull request
└─ package.json                   workspaces and root scripts
```

## 4. How the parts work together

### 4.1 Any request

1. The browser calls `/api/v1/...`, sending the session cookie.
2. The API validates the input with the shared schema. If it's invalid, the API returns `400` with a message for each field.
3. The API checks the session and the role:
   - `401` if not signed in
   - `403` for the wrong role
   - `404` for a record owned by someone else, so the response doesn't reveal that it exists
4. A service function does the work through a Mongoose model.
5. The response contains only what the caller may see. It never includes password hashes or session data, and customers never see internal admin notes.

### 4.2 Templates, live demos and the builder

This is the heart of Prajzo, and it's why the five demos and the builder share one engine.

- **A template definition** (in `packages/shared`) describes what a template supports: pages, sections, layout variants, colour themes, fonts, button styles and spacing. It also contains the template's **default configuration**, a complete website.
- **The live demo** at `/demo/portfolio` renders that default configuration with the site renderer. What you see in the demo *is* the default configuration.
- **"Customize This Design"** opens `/build?template=portfolio`. The builder takes a copy of the same default configuration as the starting draft, so the builder starts exactly where the demo is.
- **Editing:** every change updates the draft in the browser. The draft is checked with the shared schema and sent to the preview frame.
- **The preview** is a same-site page (`/preview`) shown in a frame. It receives the draft by `postMessage` and only accepts messages from the same origin. It draws the draft with the same site renderer, at 1280 px (desktop), 768 px (tablet) or 390 px (mobile), scaled to fit. Because the frame really is that wide, the mobile layout behaves as it does on a phone.
- **Saving:**
  - A signed-in customer clicks Save, which sends `POST` or `PATCH /api/v1/configurations`. The API validates the configuration again against the template definition and stores it under the customer's account.
  - A visitor without an account keeps the draft in this browser only, and is offered sign-up to keep it.

### 4.3 Submitting and running a project (Phases 10–11)

1. The customer reviews the summary and confirms. The browser sends `POST /api/v1/project-requests` with the ID of the saved configuration, plus notes, the requested delivery category and the integrations they need.
2. The API takes the configuration **from the database, not from the browser**. It validates the configuration again and stores a frozen copy with the request. It then creates a reference number (for example `PRZ-2026-0001`), records "Request Received" in the status history and sends confirmation emails.
3. The admin opens the request and sees the design rendered read-only by the same renderer. The admin sets scope, quote and the confirmed delivery date, and moves the status along the allowed transitions (section 8).
4. The customer sees every change in their dashboard and can take only the actions the workflow allows them.

## 5. Website configuration and templates

### 5.1 Configuration (one website design)

Proposed shape. The exact types are written in Phase 4.

```ts
type WebsiteConfig = {
  schemaVersion: 1;
  template: { key: 'portfolio' | 'business' | 'event' | 'catalogue' | 'forms'; version: number };
  site: { name: string; tagline?: string; logo?: ImageRef };
  design: {
    theme: string;                                    // one of the template's colour themes
    colors: { primary: Hex; accent: Hex; background: Hex; surface: Hex; text: Hex };
    fonts: { heading: FontId; body: FontId };         // from a curated list
    buttonStyle: 'pill' | 'rounded' | 'square';
    spacing: 'compact' | 'comfortable' | 'spacious';
  };
  pages: Array<{
    id: string; type: PageType; title: string; slug: string;
    enabled: boolean; showInNav: boolean;
    sections: Array<{
      id: string; type: SectionType; variant: string; enabled: boolean;
      layout?: { imagePosition?: 'left' | 'right' | 'top' | 'background' };
      content: SectionContent;                        // shape depends on the section type
    }>;
  }>;
  contact: { email?: string; phone?: string; whatsapp?: string; address?: string };
  social: Array<{ network: SocialNetwork; url: string }>;
  features: FeatureKey[];                             // e.g. 'contact-form', 'whatsapp-button'
};
type ImageRef = { src: string; alt: string; assetId?: string };
```

### 5.2 Template definition

```ts
export const portfolio = defineTemplate({
  key: 'portfolio',
  version: 1,
  name: 'Portfolio',
  categories: ['personal-portfolio', 'resume-cv'],
  pages: [{ type: 'home', required: true,
            sections: ['header', 'hero', 'about', 'skills', 'projects', 'experience', 'contact', 'footer'] }],
  sections: {
    header: { required: true, variants: ['minimal', 'centered'] },
    hero:   { required: true, variants: ['split', 'centered'] },
    skills: { required: false, variants: ['chips', 'bars'], maxItems: 24 },
    // …
  },
  design: { themes: [/* … */], fonts: [/* … */], buttonStyles: [/* … */], spacing: [/* … */] },
  defaultConfig,  // the complete demo website: exactly what /demo/portfolio shows
});
```

The five demos are the first five templates:

| Key | Demo route | Main categories |
|---|---|---|
| `portfolio` | `/demo/portfolio` | Personal Portfolio Websites; Resume and CV Websites |
| `business` | `/demo/business` | Business Websites; Printing and Service Websites |
| `event` | `/demo/event` | College and Educational Websites; Event and Conference Websites |
| `catalogue` | `/demo/catalogue` | E-commerce Websites (catalogue and enquiries, no payments) |
| `forms` | `/demo/forms` | Forms and Landing Pages; Appointment and Booking Systems (enquiry-based) |

Categories with no template yet (Restaurant, Travel and Booking, Admin Dashboards, Custom Web Applications, Digital Notice Boards, Custom Website Development) say so honestly and offer "Start a project". More templates can be added later.

### 5.3 Validation, in three layers

1. **Structure.** Types, lengths and required fields; colour format. Links must be safe, meaning only `https:`, `http:`, `mailto:`, `tel:` and in-page links are allowed. This blocks `javascript:` links.
2. **Template rules:**
   - pages, sections, variants, themes and fonts must be ones the template supports
   - required sections must be present and turned on
   - page addresses must be unique
   - navigation labels can't be empty
   - lists must stay within their limits
3. **Advice** (in the builder only; it never blocks saving): low colour contrast, missing image descriptions, empty optional sections.

The API runs layers 1 and 2 on every save and again on submission. It never trusts the browser's copy.

### 5.4 Rendering rules

- **Modes:** the site renderer takes a configuration and a mode.
  - `demo` (live demos):
    - forms send to the demo-submission API
    - email, phone and WhatsApp actions show what would happen instead of contacting anyone
    - a demo bar is shown
  - `preview` (builder): forms validate but don't send, with a note that they work on the live site.
  - `review` (admin): read-only.
- **Theme values** (colours, fonts, spacing, button style) become CSS variables on the site's root element. Changing a colour never needs a new component.
- **Content is always rendered as text.** HTML from a configuration is never inserted into the page.
- **Multi-page templates** use `/demo/:key/:page` on live demos. In the preview, pages switch inside the frame.

### 5.5 Versions

Every configuration stores `schemaVersion` and the template's `version`. When a template changes in a way that affects saved designs, an upgrade function converts older configurations as they load, and each upgrade has a test.

## 6. Data model (MongoDB collections)

| Collection | Main fields | Indexes and notes |
|---|---|---|
| `users` | email, name, phone, passwordHash, role (`customer` / `admin`), status (`active` / `disabled`), lastLoginAt, timestamps | email unique, stored lowercase; passwordHash is never returned |
| `sessions` | managed by connect-mongo | expires automatically |
| `passwordResetTokens` | userId, tokenHash, expiresAt, usedAt | expiry index; only a hash of the token is stored |
| `categories` | key, title, description, icon, useCases[], deliveryTier (`quick` / `professional` / `advanced` / `custom`), sortOrder, active | key unique |
| `templates` | key (matches a template definition), title, summary, description, features[], categoryKeys[], previewImage, status (`draft` / `published` / `archived`), featured, sortOrder | key unique; admins edit this catalogue entry, while the design lives in code |
| `packages` | key, name, targetDelivery (label, hours), scope[], priceMode (`quote` / `fixed` / `from`), priceAmountPaise, active, sortOrder | key unique; prices stay "Request a quote" until set |
| `configurations` | ownerId, name, templateKey, templateVersion, schemaVersion, config, timestamps | { ownerId, updatedAt } |
| `projectRequests` | reference, customerId, source (`builder` / `start-form`), configurationId, configSnapshot, categoryKey, templateKey, requestedPackage, features[], integrations[], notes, contact, status, statusHistory[], quote, confirmedDeliveryDate, revisions (included / used), adminNotes[], timestamps | reference unique; { customerId, createdAt }; { status, updatedAt }. adminNotes are never sent to customers |
| `assets` | ownerId, storageKey, url, mimeType, bytes, width, height, sha256, createdAt | { ownerId, createdAt } |
| `counters` | `_id` (e.g. `projectRequest:2026`), seq | atomic increment produces reference numbers |
| `contactMessages` | name, email, phone, message, status (`new` / `read` / `archived`), createdAt | { status, createdAt } |
| `demoSubmissions` | demoKey, formType, payload, createdAt | expiry index: deleted after 7 days |
| `auditLog` | actorId, action, targetType, targetId, details, at | { at }; { targetType, targetId } |

Relationships:

- One user has many configurations and many project requests.
- A project request points to its configuration and also keeps a frozen copy of it.
- A catalogue entry in `templates` is linked to its template definition in code by `key`.
- Categories and templates are linked many-to-many through `categoryKeys`.

## 7. API outline

All routes are under `/api/v1` except the health checks. List endpoints take `?page=1&limit=20` (at most 50) and return `{ items, page, limit, total }`. Errors look like `{ "error": { "code": "VALIDATION_FAILED", "message": "…", "fields": { "email": "Enter a valid email address" } } }`.

| Who | Method and path | Purpose |
|---|---|---|
| Anyone | `GET /api/health`, `GET /api/health/ready` | Liveness; readiness including the database |
| Anyone | `GET /categories`, `GET /packages` | Service catalogue and packages |
| Anyone | `GET /templates`, `GET /templates/:key` | Published templates |
| Anyone | `POST /contact` | Contact message (rate-limited) |
| Anyone | `POST /demo-submissions` | Form submissions from live demos (rate-limited, auto-deleted) |
| Anyone | `POST /auth/register`, `POST /auth/login`, `POST /auth/password/forgot`, `POST /auth/password/reset` | Accounts (rate-limited) |
| Signed in | `POST /auth/logout`, `GET /auth/me`, `PATCH /me`, `POST /me/password` | Session and profile |
| Customer (own records) | `GET`, `POST /configurations`; `GET`, `PATCH`, `DELETE /configurations/:id`; `POST /configurations/:id/duplicate` | Saved designs |
| Customer | `POST /uploads` | Image upload |
| Customer (own records) | `GET`, `POST /project-requests`; `GET /project-requests/:reference`; `POST /project-requests/:reference/actions` | Project requests and allowed customer actions |
| Admin | `GET /admin/overview` | Real counts and recent activity |
| Admin | `GET /admin/project-requests`; `GET`, `PATCH /admin/project-requests/:reference`; `POST …/status`; `POST …/notes` | Review, quote, date, status, notes |
| Admin | `GET /admin/customers`, `GET /admin/customers/:id` | Customers |
| Admin | `GET`, `POST`, `PATCH /admin/templates…`, `/admin/categories…`, `/admin/packages…` | Catalogue management |
| Admin | `GET`, `PATCH /admin/contact-messages…`; `GET /admin/demo-submissions`; `GET /admin/audit-log` | Inbox and audit |

## 8. Project status workflow

The rules live in `packages/shared/workflow` and the API enforces them. Every change adds a history entry recording the old status, the new status, who made the change, their role, an optional note and the time.

| From | To | Who may do it |
|---|---|---|
| Request Received | Under Review | Admin |
| Under Review | Awaiting Customer Information | Admin |
| Under Review | Quote Sent | Admin (a quote amount and scope are required) |
| Awaiting Customer Information | Under Review | Admin, after the customer has replied |
| Quote Sent | Approved | Customer (accepts the quote), or Admin (records an acceptance received another way, with a note) |
| Quote Sent | Under Review | Admin (revising the quote) |
| Approved | In Development | Admin (a confirmed delivery date is required) |
| In Development | Testing | Admin |
| In Development | Awaiting Customer Information | Admin |
| Testing | In Development | Admin |
| Testing | Awaiting Customer Review | Admin |
| Awaiting Customer Review | Revision Requested | Customer or Admin (counts one revision) |
| Awaiting Customer Review | Completed | Admin, after the customer signs off |
| Revision Requested | In Development | Admin |
| Request Received, Awaiting Customer Information, Quote Sent | Cancelled | Customer or Admin |
| Any other non-final status | Cancelled | Admin, with a note |
| Completed, Cancelled | (none) | Final |

The workflow also enforces these rules:

- Customers can never set a price, a delivery date or an admin-only status.
- Accepting a quote is the customer's own decision. It doesn't approve anything on the admin's behalf.
- These transitions are a proposal, to be confirmed with you before Phase 10.

## 9. Security and privacy

- **Sessions:**
  - stored in MongoDB
  - cookie `prajzo.sid` is `HttpOnly`, `SameSite=Lax`, and `Secure` in production
  - a new session ID is issued at login
  - logging out destroys the session
  - a password change or reset ends the user's other sessions
  - admin sessions are shorter
- **Forged requests (CSRF):** blocked by four measures together:
  - everything is served from the same address
  - cookies are `SameSite=Lax`
  - the `Origin` header is checked on every request that changes data
  - the API accepts JSON bodies only, apart from the upload endpoint
- **Passwords:** argon2id; 10 to 128 characters; generic messages that don't reveal whether an email is registered.
- **Access control:**
  - every protected route has a server-side guard
  - queries for owned records always include the owner (`{ _id, ownerId }`)
  - the role always comes from the session, never from the request
- **Input:**
  - every request body, query and route parameter is validated with Zod
  - unknown fields are dropped
  - Mongoose `sanitizeFilter` blocks query-operator injection
- **Rate limits:** login, registration, password reset, contact, demo submissions and uploads.
- **Headers:** helmet sets HSTS in production, `nosniff`, and a content security policy without inline scripts. Framing is limited to the same site, for the preview.
- **Uploads:**
  - JPEG, PNG and WebP only, at most 5 MB
  - the real file type is checked from the file's content
  - every image is re-encoded with sharp, which also removes location and camera data
  - files get random names
  - SVG is refused
  - signed-in users only
- **Secrets:** environment variables only. `.env` is never committed, `.env.example` lists the keys, and the API refuses to start with bad settings.
- **Logs:** request IDs; passwords, cookies and tokens are redacted.
- **Errors:** safe messages only; no stack traces in production.
- **Personal data:**
  - collect the minimum
  - demo submissions are deleted after 7 days
  - admin notes stay internal
  - Privacy and Terms are drafts until a lawyer reviews them
- **Honest limits:** passing tests doesn't make the platform "fully secure". Online payments are out of scope. Get a professional security review before handling payments or sensitive data.

## 10. Uploads and email

- **File storage:** one interface, `put`, `get`, `delete` and `url`.
  - Development: the local disk driver (`apps/api/storage/`, git-ignored).
  - Production: an S3-compatible bucket (for example Cloudflare R2) or Cloudinary, chosen in Phase 13.
- **Email:** one interface, `send`.
  - Development and tests: a console mailer, plus a capturing mailer in tests.
  - Production: SMTP through a provider you pick, with SPF and DKIM on your domain.
- **Emails sent:**
  - password reset
  - project request received (to the customer and to Prajzo)
  - quote sent
  - status changes
  - new contact message (to Prajzo)

## 11. Testing

| Level | Tools | What it covers |
|---|---|---|
| Unit | Vitest | Configuration and template validation, status transitions, formatting helpers |
| API integration | Vitest, Supertest, mongodb-memory-server | Every route, both successes and failures: invalid input, duplicate email, not signed in, wrong role, someone else's record, unknown template, wrong file type, oversized file, expired session, database errors |
| Components | Vitest, Testing Library, jsdom | Form validation and messages, builder editors, renderer sections drawing a configuration |
| End to end | Playwright on the installed Chrome | Navigation; contact form; Templates → Live Demo; Customize This Design → edit → preview → save; demo forms; register and login; submit a project; admin status changes |
| Responsive and accessibility | Playwright screenshots at 390, 768 and 1280 px; axe | Every page and every demo |
| Build | `npm run check` | Type check, lint, unit and integration tests, production build |

Tests use an in-memory MongoDB that is created and thrown away for each test file, so they never touch your data. A feature is reported as passing only after its tests have actually run.

## 12. Environments and deployment

| Environment | Web | API | Database | Email | Files |
|---|---|---|---|---|---|
| Development | Vite on 5173 (proxies `/api` to 4000) | Node on 4000 (`tsx watch`) | MongoDB Atlas free cluster (D-024) | Console | Local disk |
| Test | Vite build or dev server | In-process | In-memory MongoDB | Captured | Temporary folder |
| Production | Built files served by the API | Node (one service) | MongoDB Atlas | SMTP provider | Cloud bucket |

Production is set up in Phase 13. That includes HTTPS from the host, a health check on `/api/health/ready`, daily database backups (Atlas), error logging, and your domain with email records. Development and production settings are separate, and production secrets are only ever set on the host.

## 13. Design system

**Brand colours, sampled from the logo** (`Prajzo logo.png`):

| Role | Colour |
|---|---|
| Navy (text, wordmark) | `#0A1B46` / `#081944` |
| Cyan | `#04BBFF` / `#01DCF8` |
| Blue | `#0072F6` |
| Indigo | `#364CDD` |
| Violet | `#8B28C0` |
| Magenta | `#D02BDF` / `#B029A1` |

**How they're used:**

- **Backgrounds:** white and very light cool greys, with subtle borders and soft shadows.
- **Gradient:** the brand gradient (cyan → blue → violet → magenta) is used sparingly: the logo, the main call to action and small highlights. Large gradient areas, heavy glass effects and decorative animation are avoided, as the brief asks.
- **Logo:** `logo.png` (a transparent crop) is used on light backgrounds; the original file is kept unchanged. A vector (SVG) logo would be sharper and smaller. One won't be created unless you ask.
- **Typography:** Inter for interface and body text, Sora for headings, both self-hosted (D-021). See them, along with every base component, at http://localhost:5173/dev/ui while `npm run dev` is running.
- **Accessible colour use:** blue `#0072F6` is 4.4:1 on white, so it is used for focus rings, icons and large text only. Normal-size accent text and links use indigo `#364CDD` (6.5:1). Magenta is decoration only.

The current static site uses an indigo (`#4338E0`) that doesn't come from the logo. The platform uses the logo's colours instead.

## 14. Conventions

- **Dates:** stored in UTC; shown in India Standard Time (Asia/Kolkata) unless a page says otherwise.
- **Money:** whole paise (integers), currency `INR`, formatted with en-IN grouping (₹1,20,000).
- **Identifiers:** MongoDB ObjectIds internally; readable references (`PRZ-2026-0001`) for project requests.
- **File names:** React components in `PascalCase.tsx`; other modules in `kebab-case.ts`; tests next to the code as `*.test.ts(x)`; end-to-end tests in `e2e/`.
- **API paths:** plural nouns in kebab-case, for example `/project-requests`. Actions that aren't plain create, read, update or delete get their own sub-path, for example `/actions` and `/status`.
- **Feature visibility:** a link or button is added only when what it opens works (D-016).
