import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getSiteContent } from "@/lib/site-content/store";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";
import { getPartners, getTeam, getTestimonials } from "@/lib/cms/public";
import { PartnersStrip, TeamSection, TestimonialsSection } from "@/components/cms-sections";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("about"); }

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

export default async function AboutPage() {
  await connection();
  const [content, team, testimonials, partners] = await Promise.all([getSiteContent().then((site) => site.about), getTeam(), getTestimonials(), getPartners()]);
  const { hero, story, purpose, values, strengths, closing } = content;
  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="about-page">
        <section className="about-hero shell" id="top" aria-labelledby="about-title">
          <div className="about-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="about-title">{hero.title}<em>{hero.accent}</em></h1>
            <p className="about-hero__intro">{hero.intro}</p>
            <div className="about-hero__actions">
              <Link className="button button--primary" href={hero.primaryHref}>
                {hero.primaryLabel} <Arrow diagonal />
              </Link>
              <Link className="text-link" href={hero.secondaryHref}>
                {hero.secondaryLabel} <Arrow />
              </Link>
            </div>
          </div>
          <div className="about-hero__visual">
            <div className="about-hero__image">
              <Image
                src={hero.image}
                alt={hero.imageAlt}
                fill
                priority
                unoptimized
                sizes="(max-width: 760px) 100vw, 52vw"
              />
              <div className="about-hero__image-label">
                <span>{hero.imageLabel}</span>
                <span>{hero.index}</span>
              </div>
            </div>
            <div className="about-hero__note">
              <span>{hero.noteLabel}</span>
              <strong>{hero.noteText}</strong>
            </div>
          </div>
          <div className="about-hero__index">{hero.index} <span>/ {hero.eyebrow}</span></div>
        </section>

        <section className="about-story section-pad" id="our-story" aria-labelledby="story-title">
          <div className="shell about-story__grid">
            <div className="section-kicker">
              <span>{story.kicker}</span><span className="section-kicker__rule" />
            </div>
            <div className="about-story__content">
              <h2 id="story-title">{story.title} <em>{story.accent}</em></h2>
              <div className="about-story__body">
                {story.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)}
              </div>
            </div>
          </div>
        </section>

        <section className="about-purpose section-pad" aria-labelledby="purpose-title">
          <div className="shell">
            <div className="section-kicker section-kicker--light">
              <span>{purpose.kicker}</span><span className="section-kicker__rule" />
            </div>
            <h2 className="about-purpose__heading" id="purpose-title">
              {purpose.title}<br /><em>{purpose.accent}</em>
            </h2>
            <div className="about-purpose__grid">
              <article>
                <span className="about-purpose__label">{purpose.missionLabel}</span>
                <h3>{purpose.missionTitle}</h3>
                <p>{purpose.missionText}</p>
              </article>
              <article>
                <span className="about-purpose__label">{purpose.visionLabel}</span>
                <h3>{purpose.visionTitle}</h3>
                <p>{purpose.visionText}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-values shell section-pad" id="values" aria-labelledby="values-title">
          <div className="about-values__heading">
            <div>
              <div className="section-kicker">
                <span>{values.kicker}</span><span className="section-kicker__rule" />
              </div>
              <h2 id="values-title">{values.title} <em>{values.accent}</em></h2>
            </div>
            <p>{values.intro}</p>
          </div>
          <div className="about-values__grid">
            {values.items.map((value, index) => (
              <article key={`${value.number}-${index}`}>
                <span className="about-values__number">{value.number}</span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-strengths section-pad" aria-labelledby="strengths-title">
          <div className="shell">
            <div className="about-strengths__heading">
              <div>
                <div className="section-kicker section-kicker--light">
                  <span>{strengths.kicker}</span><span className="section-kicker__rule" />
                </div>
                <h2 id="strengths-title">{strengths.title}<br /><em>{strengths.accent}</em></h2>
              </div>
              <p>{strengths.intro}</p>
            </div>
            <div className="about-strengths__grid">
            {strengths.items.map((strength, index) => (
              <article key={`${strength.slug}-${index}`}>
                  <span>{strength.number}</span>
                  <h3>{strength.title}</h3>
                  <p>{strength.text}</p>
                  <Link href={`/services/${strength.slug}`} aria-label={`Explore ${strength.title}`}>
                    <Arrow diagonal />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <TeamSection items={team} />
        <TestimonialsSection items={testimonials} />
        <PartnersStrip items={partners} label="Clients and partners" />

        <section className="closing-cta shell about-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> {closing.eyebrow}</p>
            <h2>{closing.title}<br />{closing.accent}</h2>
            <p>{closing.body}</p>
          </div>
          <Link className="button button--dark" href={closing.href}>
            {closing.action} <Arrow diagonal />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
