import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { InsightSubscribeForm } from "@/components/insight-subscribe-form";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import type { SiteInsight } from "@/lib/site-content/content";
import { getSiteContent } from "@/lib/site-content/store";

const sectionTitles: Record<string, string[]> = {
  "a-better-build-starts-before-site": ["Set the brief around outcomes", "Bring priorities and constraints together", "Let the plan guide the next decision"],
  "clear-communication-is-part-of-the-build": ["Make the work visible to everyone", "Give every update a clear purpose", "Keep decisions and ownership connected"],
  "designing-for-the-life-of-a-place": ["Start with everyday use", "Consider the care a place needs", "Leave room for change"],
};

const articleQuestions: Record<string, string[]> = {
  "a-better-build-starts-before-site": [
    "What must the finished place make possible?",
    "Which needs are fixed, and which choices are still open?",
    "Who will use the space and what will they need from it?",
  ],
  "clear-communication-is-part-of-the-build": [
    "What changed since the last update?",
    "Which decision is needed next, and who owns it?",
    "Where should the team record the agreed outcome?",
  ],
  "designing-for-the-life-of-a-place": [
    "How will people move through and use the space day to day?",
    "What will need regular attention or maintenance?",
    "Could the place adapt if the people or routines change?",
  ],
};

async function findPublishedInsight(slug: string) {
  const content = await getSiteContent();
  return content.insights.articles.find((insight) => insight.slug === slug && insight.status === "published") || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const insight = await findPublishedInsight(slug);
  if (!insight) return { title: "Insight not found | Insights" };
  return {
    title: `${insight.title} | Insights`,
    description: insight.excerpt,
    openGraph: { title: insight.title, description: insight.excerpt, images: [insight.image] },
  };
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"} fill="none">
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3 10h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

function InsightArticle({ insight, related }: { insight: SiteInsight; related: SiteInsight[] }) {
  const headings = sectionTitles[insight.slug] || ["Understand the idea", "Consider the choices", "Make it practical"];
  const questions = articleQuestions[insight.slug] || [
    "What matters most to the people involved?",
    "Which decision would be useful to make next?",
    "What should the team keep in view as work progresses?",
  ];

  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="insight-detail-page">
        <nav className="insight-detail-breadcrumb shell" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/insights">Insights</Link><span aria-hidden="true">/</span><span aria-current="page">{insight.title}</span>
        </nav>

        <section className="insight-detail-hero shell" aria-labelledby="insight-detail-title">
          <ScrollReveal className="insight-detail-hero__copy">
            <p className="eyebrow"><span /> {insight.topic} <i aria-hidden="true">·</i> {insight.readTime}</p>
            <h1 id="insight-detail-title">{insight.title}</h1>
            <p className="insight-detail-hero__intro">{insight.excerpt}</p>
            <Link className="text-link" href="#full-insight">Explore the full insight <Arrow /></Link>
          </ScrollReveal>
          <ScrollReveal className="insight-detail-hero__image" delay={120}>
            <Image src={insight.image} alt={insight.imageAlt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 56vw" />
            <span>{insight.number} / {insight.topic}</span>
          </ScrollReveal>
        </section>

        <section className="insight-detail-reading section-pad" id="full-insight" aria-label="Full insight">
          <div className="shell insight-detail-reading__grid">
            <ScrollReveal className="insight-detail-aside">
              <span className="insight-detail-aside__label">The central idea</span>
              <blockquote>{insight.takeaway}</blockquote>
              <Link href="/services" className="insight-detail-service-link">How PCG can help <Arrow /></Link>
            </ScrollReveal>
            <div className="insight-detail-prose">
              {insight.paragraphs.map((paragraph, index) => (
                <ScrollReveal as="section" className="insight-detail-section" key={`${index}-${paragraph.slice(0, 32)}`} delay={index * 70}>
                  <span className="insight-detail-section__number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h2>{headings[index] || `A closer look ${String(index + 1).padStart(2, "0")}`}</h2>
                    <p>{paragraph}</p>
                  </div>
                </ScrollReveal>
              ))}

              <ScrollReveal className="insight-detail-questions" delay={90}>
                <p className="section-kicker"><span>Put it into practice</span><span className="section-kicker__rule" /></p>
                <h2>Questions to take<br /><em>into the conversation.</em></h2>
                <ul>{questions.map((question) => <li key={question}>{question}</li>)}</ul>
              </ScrollReveal>

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

function RelatedInsights({ related }: { related: SiteInsight[] }) {
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
            <ScrollReveal as="article" className="insight-detail-related-card" key={insight.slug} delay={index * 90}>
              <Link href={`/insights/${insight.slug}`} className="insight-detail-related-card__image">
                <Image src={insight.image} alt={insight.imageAlt} fill unoptimized sizes="(max-width: 760px) 100vw, 50vw" />
              </Link>
              <p>{insight.topic} <span>·</span> {insight.readTime}</p>
              <h3><Link href={`/insights/${insight.slug}`}>{insight.title}</Link></h3>
              <Link className="insight-card__link" href={`/insights/${insight.slug}`}>Read insight <span aria-hidden="true">→</span></Link>
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
  const content = await getSiteContent();
  const insight = content.insights.articles.find((article) => article.slug === slug && article.status === "published") || null;
  if (!insight) notFound();
  const published = content.insights.articles.filter((article) => article.status === "published" && article.slug !== insight.slug);
  const related = [...published.filter((article) => article.topic === insight.topic), ...published.filter((article) => article.topic !== insight.topic)].slice(0, 2);
  return <InsightArticle insight={insight} related={related} />;
}
