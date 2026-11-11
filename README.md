# Premium Construction Group website

The public website is being built page by page with the Next.js App Router. The home, About, Services, Projects, and Insights pages share a responsive visual system.

## Run locally

```bash
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Client meeting reservations

The Contact page includes one-hour expert meetings on weekdays from 09:00 to 17:00 South Africa time. Clients can choose an available start time up to 90 days ahead. The combined admin dashboard is at `/admin`; sign in once to manage website content, edit About, Services, Projects, Insights, and Contact pages, or review, reschedule, and cancel reservations. The `/admin/home`, `/admin/pages`, and `/admin/reservations` routes open the matching dashboard section. New reservations and schedule changes send a separate notice to the client and the admin inbox.

To enable reservations locally, create `.env.local` in the project root and add a Resend API key, a sender address verified in Resend, the admin notification inbox, a unique dashboard password of at least 12 characters, and a random session secret. Keep `.env.local` private, then restart `pnpm dev`.

Generate a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. The booking form stays disabled until email and admin settings are present. If an email provider request fails after a time is saved, the dashboard still records the reservation and shows which notices were delivered.

Reservations are stored in a local SQLite database at `data/reservations.sqlite`. The booking API uses Node's built-in SQLite module, so run it with Node.js 24. This file is ignored by Git. For production hosting, place it on persistent storage and ensure only one app instance writes to it, or replace the local store with a shared database. Ephemeral serverless filesystems do not preserve this database across deployments.

## Home page content

The supplied brand mark and colors guide the visual system. Service descriptions, About page mission/vision/values, portfolio categories, and Insights articles are starting copy; replace them with Premium Construction Group's approved company information. The Projects page uses illustrative categories and reference images, not verified company projects. Service, About, Projects, and Insights photos are visual references until approved company photography is available. A founding timeline, verified company statistics, client testimonials, contact details, and social links were not included in the supplied materials and should be added when provided.

The Website section in the combined admin dashboard shares the password and session secret configured for reservations. It manages the hero slideshow (including image or muted video slides), text and buttons in every home page section, project and service cards, section visibility, the site's homepage colors, and body and heading fonts. The Reservations section provides the meeting management tools.

The Pages section manages the editable copy, images, links, and repeatable content for the About, Services, Projects, Insights, and Contact pages. Content is stored locally in `data/site-content.json`, and uploaded page images share `public/uploads/home/`. For Insights, add RSS or Atom feed URLs, load feed items, and use **Create AI draft** to generate an original article draft for review. Drafts remain hidden until changed to Published and saved. RSS importing works without an AI key. To enable AI drafting, add `OPENAI_API_KEY` to `.env.local` (optionally set `OPENAI_MODEL`, which defaults to `gpt-6-luna`) and restart `pnpm dev`. The AI feature uses OpenAI's [Responses API](https://developers.openai.com/api/docs/guides/text); all generated posts require admin review before publication.

Homepage edits are saved locally in `data/homepage-content.json`; uploaded media is saved in `public/uploads/home/`. These generated content and upload paths are ignored by Git. Use the editor's “View live homepage” link after saving to preview changes. On hosting, provide persistent writable storage for both paths or replace the local file store before deploying; ephemeral serverless filesystems do not preserve these edits or uploads across deployments.
