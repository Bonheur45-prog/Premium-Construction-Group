# Premium Construction Group website

The public website is being built page by page with the Next.js App Router. The home, About, Services, Projects, and Insights pages share a responsive visual system.

## Run locally

```bash
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Home page content

The supplied brand mark and colors guide the visual system. Service descriptions, About page mission/vision/values, portfolio categories, and Insights articles are starting copy; replace them with Premium Construction Group's approved company information. The Projects page uses illustrative categories and reference images, not verified company projects. Service, About, Projects, and Insights photos are visual references until approved company photography is available. A founding timeline, verified company statistics, client testimonials, contact details, and social links were not included in the supplied materials and should be added when provided.

The custom CMS and PostgreSQL backend are planned for a later implementation phase. The site will not use Payload CMS.

The home page hero slides are configured in `lib/home-hero-slides.ts`. Each slide can use image media (`type: "image"`, `src`, `alt`) or video media (`type: "video"`, `src`, `poster`, `alt`). Video plays muted and inline; the poster is used when reduced motion is enabled. The typed media format is ready to be supplied by the custom CMS in the later CMS phase.
