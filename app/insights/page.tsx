import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InsightLibrary } from "@/components/insight-library";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { insights } from "@/lib/insights";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Ideas and practical perspectives on planning, project delivery, and creating places with lasting value.",
};

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

export default function InsightsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="insights-page">
        <section className="insights-hero shell" id="top" aria-labelledby="insights-title">
          <div className="insights-hero__copy">
            <p className="eyebrow"><span /> Ideas &amp; perspective</p>
            <h1 id="insights-title">Clear thinking<br /><em>builds better.</em></h1>
            <p className="insights-hero__intro">
              Notes on the questions, decisions, and details that shape a thoughtful build—from the first conversation to the life of a place.
            </p>
            <div className="insights-hero__actions">
              <Link className="button button--primary" href="#latest-insights">
                Explore insights <Arrow diagonal />
              </Link>
              <Link className="text-link" href="/contact">
                Bring us a question <Arrow />
              </Link>
            </div>
          </div>
          <div className="insights-hero__visual">
            <Image
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=90"
              alt="Construction team talking through work on site"
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 52vw"
            />
            <div className="insights-hero__image-label">
              <span>Perspective for the work ahead</span>
              <span>PCG / 04</span>
            </div>
            <div className="insights-hero__note">
              <span>Field notes</span>
              <strong>Good questions make space for better answers.</strong>
            </div>
          </div>
          <div className="insights-hero__index">04 <span>/ Ideas &amp; perspective</span></div>
        </section>

        <section className="insights-library section-pad" id="latest-insights" aria-labelledby="latest-insights-title">
          <div className="shell">
            <div className="insights-library__heading">
              <div>
                <p className="section-kicker"><span>Thoughts for the build</span><span className="section-kicker__rule" /></p>
                <h2 id="latest-insights-title">Ideas to take<br /><em>into the work.</em></h2>
              </div>
              <p>
                Practical perspectives on the choices that help projects move forward and places serve people well.
              </p>
            </div>
            <InsightLibrary />
            <p className="image-note insights-library__note">
              These articles are starter editorial content for the future custom CMS and should be reviewed and approved by Premium Construction Group before publication.
            </p>
          </div>
        </section>

        <section className="insight-reading section-pad" aria-labelledby="insight-reading-title">
          <div className="shell">
            <div className="insight-reading__heading">
              <div>
                <p className="section-kicker section-kicker--light"><span>Longer reads</span><span className="section-kicker__rule" /></p>
                <h2 id="insight-reading-title">A little more<br /><em>to consider.</em></h2>
              </div>
              <p>Explore each idea in more detail. Select a story above to jump directly to it.</p>
            </div>
            <div className="insight-reading__list">
              {insights.map((insight) => (
                <article className="insight-article" id={insight.slug} key={insight.slug}>
                  <div className="insight-article__aside">
                    <span>{insight.number} / {insight.topic}</span>
                    <span>{insight.readTime}</span>
                  </div>
                  <div className="insight-article__body">
                    <h3>{insight.title}</h3>
                    {insight.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    <blockquote>{insight.takeaway}</blockquote>
                    <Link className="insight-article__service" href="/services">
                      Explore how we help <Arrow />
                    </Link>
                  </div>
                  <Link className="insight-article__image" href="#latest-insights" aria-label="Back to all insights">
                    <Image
                      src={insight.image}
                      alt={insight.imageAlt}
                      fill
                      unoptimized
                      sizes="(max-width: 760px) 100vw, 34vw"
                    />
                    <span>Back to all insights ↑</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-cta shell insights-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> Every project starts somewhere</p>
            <h2>Have a question<br />about what comes next?</h2>
            <p>Tell us what you&apos;re planning and what you&apos;d like to understand.</p>
          </div>
          <Link className="button button--dark" href="/contact">
            Start a conversation <Arrow diagonal />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
