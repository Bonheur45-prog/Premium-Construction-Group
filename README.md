# Premium Construction Group website

The public website is being built page by page with the Next.js App Router. The home, About, Approach, Services, Projects, Insights, Contact, and Reservations pages share a responsive visual system.

## Run locally

```bash
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Client meeting reservations

The Reservations page and Contact page provide a configurable meeting calendar. The CMS controls whether online booking is open, meeting length, the advance booking window, working days, hours, and all page copy. The combined admin dashboard is at `/admin`; sign in once to edit the homepage and all site pages, create draft or published custom pages with their own URLs, manage CMS users, and review, reschedule, and cancel reservations. The `/admin/home`, `/admin/pages`, `/admin/reservations`, and `/admin/users` routes open the matching dashboard section. New reservations and schedule changes send separate notices to the client and admin inbox.

To enable reservations and the CMS locally, copy `.env.example` to `.env.local` in the project root and replace its placeholders. Set a Brevo API key (`BREVO_API_KEY`), a sender verified in Brevo (`MAIL_FROM_EMAIL`), the company notification inbox (`STAFF_NOTIFY_EMAIL`), a unique `ADMIN_DASHBOARD_PASSWORD` of at least 12 characters, and a random `RESERVATION_SESSION_SECRET` of at least 32 characters. The first CMS username defaults to `admin`; set `ADMIN_DASHBOARD_USERNAME` to choose another. Optional: Cloudflare R2 keys for media (otherwise uploads stay on the server), Turnstile keys for spam protection, and `OPENAI_API_KEY` for AI article drafting. Every variable is described in `.env.example`. Keep `.env.local` private, then restart `pnpm dev`.

For a local preview, leave `DATABASE_URL` blank. For shared or production CMS data, set it to the PostgreSQL connection string. The app creates its tables automatically and imports the existing local site content, homepage settings, admin accounts, and SQLite reservations once into the connected database. Keep the connection string private. The application uses a pooled PostgreSQL connection; see the [node-postgres connection guide](https://node-postgres.com/features/connecting) and [transaction guide](https://node-postgres.com/features/transactions) for hosting and operations details.

On the first successful sign-in, the CMS saves the bootstrap account as a salted password hash. Administrators can create additional editor or administrator accounts from the **Users** dashboard tab. Editors can manage website content and reservations; only administrators can manage CMS accounts. The bootstrap username and password are used only while no CMS users exist; changing them later does not overwrite saved accounts.

Generate a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. The booking form stays disabled until email and admin settings are present. If an email provider request fails after a time is saved, the dashboard still records the reservation and shows which notices were delivered.

With `DATABASE_URL`, reservations use PostgreSQL and enforce one active reservation per time slot. Without it, local preview bookings use Node's built-in SQLite module at `data/reservations.sqlite`; run the local app with Node.js 24. Uploaded images and videos are stored under `public/uploads/home/`, so production hosting should provide persistent shared media storage or an object-storage adapter.

## Home page content

The supplied brand mark and colors guide the visual system. Service descriptions, About page mission/vision/values, portfolio categories, and Insights articles are starting copy; replace them with Premium Construction Group's approved company information. The Projects page uses illustrative categories and reference images, not verified company projects. Service, About, Projects, and Insights photos are visual references until approved company photography is available. A founding timeline, verified company statistics, client testimonials, contact details, and social links were not included in the supplied materials and should be added when provided.

The Website section manages the hero slideshow (including image or muted video slides), text and buttons in every home page section, project and service cards, section visibility, the site's shared colors, and body and heading fonts. The Pages section also includes Site settings for the logo, brand text, navigation, footer, and search titles and descriptions. The Reservations section provides the meeting management tools. The same CMS accounts can access each dashboard section.

The Pages section manages the editable copy, images, links, and repeatable content for all fixed pages, the Reservations page, and custom pages. For Insights, add RSS or Atom feed URLs, load feed items, and use **Create AI draft** to generate an original article draft for review. Drafts remain hidden until changed to Published and saved. RSS importing works without an AI key. To enable AI drafting, add `OPENAI_API_KEY` to `.env.local` (optionally set `OPENAI_MODEL`, which defaults to `gpt-6-luna`) and restart `pnpm dev`. The AI feature uses OpenAI's [Responses API](https://developers.openai.com/api/docs/guides/text); all generated posts require admin review before publication.

Homepage edits and fixed/custom page content are stored in PostgreSQL when `DATABASE_URL` is configured, or in local JSON files for preview. Use the editor's “View live homepage” link after saving to preview changes.

## Deploying to the VPS (GitHub Actions + PM2 + Caddy)

The `Build and deploy` workflow builds the standalone Next.js app on GitHub (so the VPS spends no memory on builds) and uploads it to the VPS as a new release. A push to `master` deploys automatically; it can also be started from the Actions tab.

| Path on the VPS | What |
| --- | --- |
| `/var/www/premium-construction/current` | Link to the running release |
| `/var/www/premium-construction/releases/` | Last 3 releases (for quick rollback) |
| `/var/www/premium-construction/shared/uploads` | CMS images and videos (served directly by Caddy at `/uploads/...`). Back this up. |
| `/var/www/premium-construction/.env` | Site secrets (not in git, not in GitHub) |

The app runs under PM2 as `premium-construction` on `127.0.0.1:3040`. All CMS content, users and reservations are in the PostgreSQL database named in `DATABASE_URL`. Config files: `deploy/ecosystem.config.cjs` and `deploy/Caddyfile.premium-construction`.

Repository secrets (Settings → Secrets and variables → Actions): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

Rollback: `ln -sfn releases/<older-release> /var/www/premium-construction/current && pm2 reload premium-construction`.

## The CMS (`/admin`)

| Section | What it manages |
| --- | --- |
| Overview | Key numbers, clients waiting for a reply, upcoming meetings, setup checklist, recent activity |
| Home page | Hero slides, home sections and colours |
| Pages & insights | Every page's copy and images, insights (draft → publish, subscriber emails, RSS import), **Detail pages** (service and project-category pages, closing messages), **Site settings** (brand, navigation, footer, contact details, social links, Google Analytics, SEO), custom pages |
| Projects portfolio | Projects with cover, gallery, key facts, stage, featured/draft/live — shown on `/projects` and `/projects/<slug>` |
| Media library | Every image and video, alt text, reuse via the **Library** button on any image field |
| Requests | Client requests: pipeline, stages, assignee, priority, progress, client messages, internal notes, documents |
| Client accounts | Everyone with a portal account; resend confirmation, pause/restore |
| Enquiries | Contact-form messages; reply by email, archive, or **Open as client request** |
| Meetings | Booked meetings, availability, rescheduling |
| Team & access, Activity log | CMS users and roles (admins); full audit trail (admins) |

Press **Ctrl + K** anywhere in the CMS to jump to a section.

## The client portal (`/account`)

Anyone can sign up. After confirming their email, a client can open requests, follow each one through seven stages (Received → Under review → Site visit → Quote sent → Approved → In progress → Completed), message the team, and share or download documents. Requests opened from an enquiry with the same email appear in their account automatically.

Documents (PDF, images, Word, Excel, PowerPoint, DWG/DXF, ZIP; 25 MB each) are stored privately — in the `R2_PRIVATE_BUCKET`, or in `/var/www/premium-construction/shared/data/private-files` when R2 isn't set up — and are only served through `/api/files/<id>` after a permission check. Internal notes and internal files are never shown to clients.

## Insights feed

`/insights/feed.xml` is an RSS feed of published insights with a large image per item (`enclosure` and `media:content`), suitable for Zapier → LinkedIn.

## Going live checklist

1. **Brevo** — verify the sending domain or sender, create an API key, then set `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `STAFF_NOTIFY_EMAIL`.
2. **Cloudflare R2** — create two buckets: a public one for website media (connect a custom domain such as `media.<domain>` or enable the r2.dev URL) and a private one for client documents. Create an R2 API token with *Object Read & Write* on both, then set the `R2_*` variables.
3. **Turnstile** — add the site in Cloudflare → Turnstile, then set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
4. **CMS → Pages → Site settings** — public site URL, contact details, social links, Google Analytics ID.
5. Restart: `pm2 reload premium-construction --update-env`. The Overview's setup checklist shows what's still missing.
