import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { InsightSubscribeForm } from "@/components/insight-subscribe-form";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { formatLongDate } from "@/lib/cms/format";
import { getInsights, redirectOrNotFound, type PublicInsight } from "@/lib/cms/public";
import { buildArticleStructuredData, buildSeoMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const [content, insights] = await Promise.all([getSiteContent(), getInsights()]);
  const insight = insights.find((article) => article.slug === slug);
  if (!insight) return { title: "Article not found", robots: { index: false, follow: false } };
  return buildSeoMetadata(content, {
    path: `/insights/${insight.slug}`,
    title: insight.seoTitle || `${insight.title} | Blog`,
    description: insight.metaDescription || insight.excerpt,
    keywords: insight.keywords,
    canonicalUrl: insight.canonicalUrl,
    socialImage: insight.socialImage || insight.image,
    imageAlt: insight.imageAlt,
    noIndex: insight.noIndex,
    type: "article",
    publishedAt: insight.publishedAt,
    updatedAt: insight.updatedAt,
    author: insight.author,
  });
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"} fill="none">
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3 10h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

function InsightArticle({ insight, related, structuredData }: { insight: PublicInsight; related: PublicInsight[]; structuredData: ReturnType<typeof buildArticleStructuredData> }) {
  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="insight-detail-page">
        {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
        <nav className="insight-detail-breadcrumb shell" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/insights">Blog</Link><span aria-hidden="true">/</span><span aria-current="page">{insight.title}</span>
        </nav>

        <section className="insight-detail-hero shell" aria-labelledby="insight-detail-title">
          <ScrollReveal className="insight-detail-hero__copy">
            <p className="eyebrow"><span /> {[insight.topic, insight.readTime].filter(Boolean).join(" · ")}</p>
            <h1 id="insight-detail-title">{insight.title}</h1>
            <p className="insight-detail-hero__intro">{insight.excerpt}</p>
            <p className="insight-detail-byline">{[insight.author, formatLongDate(insight.publishedAt)].filter(Boolean).join(" · ")}</p>
            <Link className="text-link" href="#full-insight">Read the article <Arrow /></Link>
          </ScrollReveal>
          <ScrollReveal className="insight-detail-hero__image" delay={120}>
            <Image src={insight.image} alt={insight.imageAlt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 56vw" />
            <span>{insight.number}{insight.topic ? ` / ${insight.topic}` : ""}</span>
          </ScrollReveal>
        </section>

        <section className="insight-detail-reading section-pad" id="full-insight" aria-label="Full insight">
          <div className="shell insight-detail-reading__grid">
            <aside className="insight-detail-aside">
              {insight.takeaway && <><span className="insight-detail-aside__label">The central idea</span><blockquote>{insight.takeaway}</blockquote></>}
              {insight.toc.length > 1 && (
                <nav className="insight-detail-toc" aria-label="In this article">
                  <span className="insight-detail-aside__label">In this article</span>
                  <ol>{insight.toc.map((item) => <li key={item.id} className={item.level === 3 ? "is-sub" : ""}><a href={`#${item.id}`}>{item.text}</a></li>)}</ol>
                </nav>
              )}
              <Link href="/services" className="insight-detail-service-link">How PCG can help <Arrow /></Link>
            </aside>
            <div className="insight-detail-prose">
              <div className="article-body" dangerouslySetInnerHTML={{ __html: insight.bodyHtml }} />

              {insight.questions.length > 0 && <ScrollReveal className="insight-detail-questions" delay={90}>
                <p className="section-kicker"><span>Put it into practice</span><span className="section-kicker__rule" /></p>
                <h2>Questions to take<br /><em>into the conversation.</em></h2>
                <ul>{insight.questions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ul>
              </ScrollReveal>}

              {insight.sourceUrl && <p className="insight-detail-source">Source material: <a href={insight.sourceUrl} target="_blank" rel="noreferrer">Read the original ↗</a></p>}
            </div>
          </div>
        </section>

        <div className="shell insight-detail-subscribe-wrap">
          <InsightSubscribeForm sourceInsight={insight.slug} />
        </div>

        <RelatedInsights related={related} />

        <section className="closing-cta shell insight-detail-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> Every project starts somewhere</p>
            <h2>Have a question<br />about your next build?</h2>
            <p>Bring your priorities and questions. We’ll help you explore a clear next step.</p>
          </div>
          <Link className="button button--dark" href="/contact">Start a conversation <Arrow diagonal /></Link>
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}

function RelatedInsights({ related }: { related: PublicInsight[] }) {
  if (!related.length) return null;

  return (
    <section className="insight-detail-related section-pad" aria-labelledby="insight-detail-related-title">
      <div className="shell">
        <ScrollReveal className="insight-detail-related__heading">
          <p className="section-kicker"><span>Keep exploring</span><span className="section-kicker__rule" /></p>
          <h2 id="insight-detail-related-title">More ideas for<br /><em>the work ahead.</em></h2>
        </ScrollReveal>
        <div className="insight-detail-related__grid">
          {related.map((insight, index) => (
            <ScrollReveal as="article" className="insight-detail-related-card card-clickable" key={insight.slug} delay={index * 90}>
              <div className="insight-detail-related-card__image">
                <Image src={insight.image} alt="" fill unoptimized sizes="(max-width: 760px) 100vw, 50vw" />
              </div>
              <p>{[insight.topic, insight.readTime].filter(Boolean).join(" · ")}</p>
              <h3><Link className="card-clickable__link" href={`/insights/${insight.slug}`}>{insight.title}</Link></h3>
              <span className="insight-card__link" aria-hidden="true">Read the article <span>→</span></span>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function InsightDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const [content, insights] = await Promise.all([getSiteContent(), getInsights()]);
  const insight = insights.find((article) => article.slug === slug);
  if (!insight) return redirectOrNotFound(`/insights/${slug}`);
  const others = insights.filter((article) => article.slug !== insight.slug);
  const related = [...others.filter((article) => insight.topic && article.topic === insight.topic), ...others.filter((article) => !insight.topic || article.topic !== insight.topic)].slice(0, 2);
  return <InsightArticle insight={insight} related={related} structuredData={buildArticleStructuredData(content, insight)} />;
}
