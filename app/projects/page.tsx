import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ProjectGallery } from "@/components/project-gallery";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getSiteContent } from "@/lib/site-content/store";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("projects"); }

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"}
      fill="none"
    >
      {diagonal ? (
        <path d="M5 15 15 5M6 5h9v9" />
      ) : (
        <path d="M3 10h13m-5-5 5 5-5 5" />
      )}
    </svg>
  );
}

export default async function ProjectsPage() {
  await connection();
  const content = (await getSiteContent()).projects;
  const { hero, portfolio, categories, belief, closing } = content;
  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="projects-page">
        <section className="projects-hero shell" id="top" aria-labelledby="projects-title">
          <ScrollReveal className="projects-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="projects-title">{hero.title}<br /><em>{hero.accent}</em></h1>
            <p className="projects-hero__intro">{hero.intro}</p>
            <div className="projects-hero__actions">
              <Link className="button button--primary" href={hero.primaryHref}>
                {hero.primaryLabel} <Arrow diagonal />
              </Link>
              <Link className="text-link" href={hero.secondaryHref}>
                {hero.secondaryLabel} <Arrow />
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal className="projects-hero__visual" delay={120}>
            <Image
              src={hero.image}
              alt={hero.imageAlt}
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 52vw"
            />
            <div className="projects-hero__image-label">
              <span>{hero.imageLabel}</span>
              <span>PCG / {hero.index}</span>
            </div>
            <div className="projects-hero__note">
              <span>{hero.noteLabel}</span>
              <strong>{hero.noteText}</strong>
            </div>
          </ScrollReveal>
          <div className="projects-hero__index">{hero.index} <span>/ {hero.eyebrow}</span></div>
        </section>

        <section className="portfolio-section section-pad" id="portfolio" aria-labelledby="portfolio-title">
          <div className="shell">
            <ScrollReveal className="portfolio-section__heading">
              <div>
                <p className="section-kicker"><span>{portfolio.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="portfolio-title">{portfolio.title}<br /><em>{portfolio.accent}</em></h2>
              </div>
              <p>{portfolio.intro}</p>
            </ScrollReveal>

            <ProjectGallery categories={categories} />

          </div>
        </section>

        <section className="project-belief" aria-label="Our perspective">
          <ScrollReveal className="shell project-belief__inner">
          <span>{belief.title}</span>
          <p>{belief.text}</p>
          </ScrollReveal>
        </section>

        <ScrollReveal as="section" className="closing-cta shell projects-cta" delay={80}>
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> {closing.eyebrow}</p>
            <h2>{closing.title}<br />{closing.accent}</h2>
            <p>{closing.body}</p>
          </div>
          <Link className="button button--dark" href={closing.href}>
            {closing.action} <Arrow diagonal />
          </Link>
        </ScrollReveal>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
