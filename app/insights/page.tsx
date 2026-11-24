import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { InsightLibrary } from "@/components/insight-library";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getSiteContent } from "@/lib/site-content/store";
import { getInsights, sectionOn } from "@/lib/cms/public";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("insights"); }

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

export default async function InsightsPage() {
  if (!(await sectionOn("blog"))) notFound();
  await connection();
  const content = (await getSiteContent()).insights;
  const { hero, library, closing } = content;
  const publishedArticles = await getInsights();
  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="insights-page">
        <section className="insights-hero shell" id="top" aria-labelledby="insights-title">
          <div className="insights-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="insights-title">{hero.title}<br /><em>{hero.accent}</em></h1>
            <p className="insights-hero__intro">{hero.intro}</p>
            <div className="insights-hero__actions">
              <Link className="button button--primary" href={hero.primaryHref}>
                {hero.primaryLabel} <Arrow diagonal />
              </Link>
              <Link className="text-link" href={hero.secondaryHref}>
                {hero.secondaryLabel} <Arrow />
              </Link>
            </div>
          </div>
          <div className="insights-hero__visual">
            <Image
              src={hero.image}
              alt={hero.imageAlt}
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 52vw"
            />
            <div className="insights-hero__image-label">
              <span>{hero.imageLabel}</span>
              <span>PCG / {hero.index}</span>
            </div>
            <div className="insights-hero__note">
              <span>{hero.noteLabel}</span>
              <strong>{hero.noteText}</strong>
            </div>
          </div>
          <div className="insights-hero__index">{hero.index} <span>/ {hero.eyebrow}</span></div>
        </section>

        <section className="insights-library section-pad" id="latest-insights" aria-labelledby="latest-insights-title">
          <div className="shell">
            <div className="insights-library__heading">
              <div>
                <p className="section-kicker"><span>{library.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="latest-insights-title">{library.title}<br /><em>{library.accent}</em></h2>
              </div>
              <p>{library.intro}</p>
            </div>
            <InsightLibrary insights={publishedArticles} />
          </div>
        </section>

        <section className="closing-cta shell insights-cta">
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
