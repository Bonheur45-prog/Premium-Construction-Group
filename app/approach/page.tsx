import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getSiteContent } from "@/lib/site-content/store";
import { getServices } from "@/lib/cms/public";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("approach"); }

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"}
      fill="none"
    >
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3 10h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

export default async function ApproachPage() {
  await connection();
  const content = await getSiteContent();
  const { hero, process, principles, capabilities: capabilityHeading, closing } = content.approach;
  const capabilities = await getServices();

  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="approach-page">
        <section className="approach-hero shell" id="top" aria-labelledby="approach-title">
          <div className="approach-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="approach-title">{hero.title}<em>{hero.accent}</em></h1>
            <p className="approach-hero__intro">{hero.intro}</p>
            <div className="approach-hero__actions">
              <Link className="button button--primary" href={hero.primaryHref}>
                {hero.primaryLabel} <Arrow diagonal />
              </Link>
              <Link className="text-link" href={hero.secondaryHref}>
                {hero.secondaryLabel} <Arrow />
              </Link>
            </div>
          </div>
          <div className="approach-hero__visual">
            <Image src={hero.image.src} alt={hero.image.alt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 52vw" />
            <div className="approach-hero__image-label">
              <span>{hero.image.label}</span>
              <span>{hero.image.number}</span>
            </div>
            <div className="approach-hero__note">
              <span>{hero.noteLabel}</span>
              <strong>{hero.noteText}</strong>
            </div>
          </div>
          <div className="approach-hero__index">{hero.indexLead} <span>/ {hero.indexAccent}</span></div>
        </section>

        <section className="approach-method section-pad" id="approach-process" aria-labelledby="approach-process-title">
          <div className="shell">
            <div className="approach-method__heading">
              <div>
                <p className="section-kicker"><span>{process.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="approach-process-title">{process.title}<br /><em>{process.accent}</em></h2>
              </div>
              <p>{process.intro}</p>
            </div>
            <div className="approach-method__grid">
              {process.steps.map((step, index) => (
                <article key={`${step.number}-${index}`}>
                  <span className="approach-method__number">{step.number}</span>
                  <span className="approach-method__rule" aria-hidden="true" />
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="approach-principles section-pad" aria-labelledby="approach-principles-title">
          <div className="shell">
            <div className="approach-principles__heading">
              <div>
                <p className="section-kicker section-kicker--light"><span>{principles.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="approach-principles-title">{principles.title} <em>{principles.accent}</em></h2>
              </div>
              <p>{principles.intro}</p>
            </div>
            <div className="approach-principles__grid">
              {principles.items.map((value, index) => (
                <article key={`${value.number}-${index}`}>
                  <span>{value.number}</span>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="approach-capabilities section-pad" aria-labelledby="approach-capabilities-title">
          <div className="shell">
            <div className="approach-capabilities__heading">
              <div>
                <p className="section-kicker"><span>{capabilityHeading.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="approach-capabilities-title">{capabilityHeading.title} <em>{capabilityHeading.accent}</em></h2>
              </div>
              <p>{capabilityHeading.intro}</p>
            </div>
            <div className="approach-capabilities__grid">
              {capabilities.map((capability) => (
                <Link className="approach-capability" href={`/services/${capability.slug}`} key={capability.id}>
                  <span>{capability.number} / {capability.category}</span>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                  <span className="approach-capability__link">Explore this capability <Arrow diagonal /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-cta shell approach-cta">
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
