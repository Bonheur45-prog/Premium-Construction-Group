import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { buildSeoMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

type CustomPageProps = { params: Promise<{ slug: string }> };

async function findPublishedPage(slug: string) {
  return (await getSiteContent()).customPages.find((page) => page.slug === slug && page.status === "published") || null;
}

export async function generateMetadata({ params }: CustomPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const page = content.customPages.find((item) => item.slug === slug && item.status === "published") || null;
  if (!page) return { title: "Page not found", robots: { index: false, follow: false } };
  return buildSeoMetadata(content, {
    path: `/${page.slug}`,
    title: page.seoTitle || page.title,
    description: page.metaDescription || page.hero.intro,
    keywords: page.keywords,
    canonicalUrl: page.canonicalUrl,
    socialImage: page.socialImage || page.hero.image,
    imageAlt: page.hero.imageAlt,
    noIndex: page.noIndex,
  });
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="arrow-icon arrow-icon--diagonal" fill="none">
      <path d="M5 15 15 5M6 5h9v9" />
    </svg>
  );
}

export default async function CustomSitePage({ params }: CustomPageProps) {
  await connection();
  const { slug } = await params;
  const page = await findPublishedPage(slug);
  if (!page) notFound();

  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="custom-site-page">
        <section className="custom-page-hero shell" id="top" aria-labelledby="custom-page-title">
          <div className="custom-page-hero__copy">
            <p className="eyebrow"><span /> {page.hero.eyebrow}</p>
            <h1 id="custom-page-title">{page.hero.title}<em>{page.hero.accent}</em></h1>
            <p>{page.hero.intro}</p>
            <Link className="button button--primary" href="#page-content">Explore this page <Arrow /></Link>
          </div>
          <div className="custom-page-hero__image">
            <Image src={page.hero.image} alt={page.hero.imageAlt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 52vw" />
            <span>{page.title}</span>
          </div>
        </section>

        <section className="custom-page-content section-pad" id="page-content" aria-label={page.title}>
          <div className="shell custom-page-content__inner">
            {page.sections.map((section, index) => (
              <article key={`${section.title}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h2>{section.title}</h2><p>{section.body}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="closing-cta shell custom-page-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> Premium Construction Group</p>
            <h2>{page.closing.title}</h2>
            <p>{page.closing.body}</p>
          </div>
          <Link className="button button--dark" href={page.closing.href}>{page.closing.action} <Arrow /></Link>
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
