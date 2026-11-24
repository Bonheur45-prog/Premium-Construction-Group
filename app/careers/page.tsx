import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getJobs, sectionOn } from "@/lib/cms/public";
import { formatLongDate as formatDeadline, jobTypeLabel } from "@/lib/cms/format";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("careers"); }

/** Careers: the open positions published in CMS → Careers. Closed (past deadline) jobs disappear on their own. */
export default async function CareersPage() {
  if (!(await sectionOn("careers"))) notFound();
  await connection();
  const [content, jobs] = await Promise.all([getSiteContent(), getJobs()]);
  const { hero, openings, empty } = content.careers;
  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="careers-page">
        <section className="careers-hero shell" aria-labelledby="careers-title">
          <ScrollReveal>
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="careers-title">{hero.title} <em>{hero.accent}</em></h1>
            <p className="careers-hero__intro">{hero.intro}</p>
          </ScrollReveal>
        </section>

        <section className="careers-openings section-pad" aria-labelledby="openings-title">
          <div className="shell">
            <ScrollReveal className="cms-section-head cms-section-head--split">
              <div>
                <p className="section-kicker"><span>{openings.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="openings-title">{openings.title} <em>{openings.accent}</em></h2>
              </div>
              {jobs.length > 0 && <p className="careers-count">{jobs.length} open {jobs.length === 1 ? "position" : "positions"}</p>}
            </ScrollReveal>
            {jobs.length ? (
              <ul className="careers-list">
                {jobs.map((job, index) => (
                  <ScrollReveal as="li" className="careers-job card-clickable" key={job.id} delay={index * 60}>
                    <span className="careers-job__number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="careers-job__main">
                      <h3><Link className="card-clickable__link" href={`/careers/${job.slug}`}>{job.title}</Link></h3>
                      <p>{job.summary}</p>
                    </div>
                    <dl className="careers-job__facts">
                      {job.department && <div><dt>Team</dt><dd>{job.department}</dd></div>}
                      {job.location && <div><dt>Location</dt><dd>{job.location}</dd></div>}
                      {jobTypeLabel(job.type) && <div><dt>Type</dt><dd>{jobTypeLabel(job.type)}</dd></div>}
                      {formatDeadline(job.deadline) && <div><dt>Apply by</dt><dd>{formatDeadline(job.deadline)}</dd></div>}
                    </dl>
                    <span className="careers-job__go" aria-hidden="true">↗</span>
                  </ScrollReveal>
                ))}
              </ul>
            ) : (
              <div className="careers-empty">
                <h3>{empty.title}</h3>
                <p>{empty.body}</p>
                <Link className="button button--dark" href={empty.href}>{empty.action}</Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
