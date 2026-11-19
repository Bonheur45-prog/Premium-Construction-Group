import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { formatLongDate as formatDeadline, jobTypeLabel } from "@/lib/cms/format";
import { getJobs, redirectOrNotFound } from "@/lib/cms/public";
import { buildSeoMetadata, getSiteOrigin } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const [content, jobs] = await Promise.all([getSiteContent(), getJobs()]);
  const job = jobs.find((item) => item.slug === slug);
  if (!job) return { title: "Position not found", robots: { index: false, follow: false } };
  return buildSeoMetadata(content, {
    path: `/careers/${job.slug}`,
    title: job.seoTitle || `${job.title} | Careers`,
    description: job.metaDescription || job.summary,
    socialImage: job.socialImage,
  });
}

/** One job opening, with an apply button (email and/or online form, as set in the CMS). */
export default async function JobPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const [content, jobs] = await Promise.all([getSiteContent(), getJobs()]);
  const job = jobs.find((item) => item.slug === slug);
  if (!job) return redirectOrNotFound(`/careers/${slug}`);
  const apply = content.careers.apply;
  const fallbackEmail = content.siteSettings.contact.email;
  const email = job.applyEmail || (!job.applyUrl ? fallbackEmail : "");
  const origin = getSiteOrigin(content);
  const structuredData = origin ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.bodyHtml || job.summary,
    datePosted: job.publishedAt ? job.publishedAt.slice(0, 10) : undefined,
    ...(job.deadline ? { validThrough: job.deadline } : {}),
    hiringOrganization: { "@type": "Organization", name: content.siteSettings.brand.legalName, sameAs: origin.origin },
    ...(job.location ? { jobLocation: { "@type": "Place", address: job.location } } : {}),
  } : null;

  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="careers-page job-page">
        {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
        <nav className="insight-detail-breadcrumb shell" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/careers">Careers</Link><span aria-hidden="true">/</span><span aria-current="page">{job.title}</span>
        </nav>
        <section className="careers-hero shell" aria-labelledby="job-title">
          <ScrollReveal>
            <p className="eyebrow"><span /> {[job.department, jobTypeLabel(job.type)].filter(Boolean).join(" · ") || "Open position"}</p>
            <h1 id="job-title">{job.title}</h1>
            <p className="careers-hero__intro">{job.summary}</p>
          </ScrollReveal>
        </section>
        <section className="shell job-page__grid section-pad">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: job.bodyHtml }} />
          <aside className="job-apply">
            <dl className="careers-job__facts">
              {job.location && <div><dt>Location</dt><dd>{job.location}</dd></div>}
              {jobTypeLabel(job.type) && <div><dt>Type</dt><dd>{jobTypeLabel(job.type)}</dd></div>}
              {formatDeadline(job.deadline) && <div><dt>Apply by</dt><dd>{formatDeadline(job.deadline)}</dd></div>}
            </dl>
            <h2>{apply.title}</h2>
            <p>{apply.body}</p>
            <div className="job-apply__actions">
              {job.applyUrl && <a className="button button--primary" href={job.applyUrl} target="_blank" rel="noopener noreferrer">{apply.urlLabel} ↗</a>}
              {email && <a className={`button ${job.applyUrl ? "button--outline" : "button--primary"}`} href={`mailto:${email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>{apply.emailLabel}</a>}
              {!email && !job.applyUrl && <Link className="button button--primary" href="/contact">Contact us to apply</Link>}
            </div>
          </aside>
        </section>
        <div className="shell"><Link className="text-link" href="/careers">← All open positions</Link></div>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
