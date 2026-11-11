# Premium Construction Group website

The public website is being built page by page with the Next.js App Router. The home, About, Services, Projects, and Insights pages share a responsive visual system.

## Run locally

```bash
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Client meeting reservations

The Contact page includes one-hour expert meetings on weekdays from 09:00 to 17:00 South Africa time. Clients can choose an available start time up to 90 days ahead. The admin dashboard is at `/admin/reservations`; it requires a password and lets the team view, reschedule, or cancel reservations. New reservations and schedule changes send a separate notice to the client and the admin inbox.

To enable reservations locally:

1. Copy `.env.example` to `.env.local`.
2. Add a Resend API key, a sender address verified in Resend, the admin notification inbox, a unique dashboard password of at least 12 characters, and a random session secret. Keep `.env.local` private.
3. Restart `pnpm dev`.

Generate a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. The booking form stays disabled until email and admin settings are present. If an email provider request fails after a time is saved, the dashboard still records the reservation and shows which notices were delivered.

Reservations are stored in a local SQLite database at `data/reservations.sqlite`. The booking API uses Node's built-in SQLite module, so run it with Node.js 24. This file is ignored by Git. For production hosting, place it on persistent storage and ensure only one app instance writes to it, or replace the local store with a shared database. Ephemeral serverless filesystems do not preserve this database across deployments.

## Home page content

The supplied brand mark and colors guide the visual system. Service descriptions, About page mission/vision/values, portfolio categories, and Insights articles are starting copy; replace them with Premium Construction Group's approved company information. The Projects page uses illustrative categories and reference images, not verified company projects. Service, About, Projects, and Insights photos are visual references until approved company photography is available. A founding timeline, verified company statistics, client testimonials, contact details, and social links were not included in the supplied materials and should be added when provided.

The custom CMS and PostgreSQL backend are planned for a later implementation phase. The site will not use Payload CMS.

The home page hero slides are configured in `lib/home-hero-slides.ts`. Each slide can use image media (`type: "image"`, `src`, `alt`) or video media (`type: "video"`, `src`, `poster`, `alt`). Video plays muted and inline; the poster is used when reduced motion is enabled. The typed media format is ready to be supplied by the custom CMS in the later CMS phase.
