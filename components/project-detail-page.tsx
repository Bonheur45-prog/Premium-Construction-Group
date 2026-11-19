/* eslint-disable @next/next/no-img-element -- project images come from the media library (any URL) */
import Link from "next/link";
import { ProjectLightboxGallery } from "@/components/project-lightbox-gallery";
import { ProjectShowcase, type ShowcaseProject } from "@/components/project-showcase";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { PROJECT_STAGES, projectParagraphs, type Project } from "@/lib/projects/store";

/** A single portfolio project: cover, "title block" of key facts, story, gallery and related work. */
export function ProjectDetailPage({ project, categoryLabel, related, sheetNumber }: { project: Project; categoryLabel: string; related: ShowcaseProject[]; sheetNumber: string }) {
  const paragraphs = projectParagraphs(project.body);
  const sheet = [
    ["Project", project.title],
    ["Category", categoryLabel],
    ["Location", project.location],
    ["Year", project.year],
    ["Stage", PROJECT_STAGES[project.stage]],
    ["Client", project.client],
    ...project.facts.map((fact) => [fact.label, fact.value] as [string, string]),
  ].filter(([, value]) => value);

  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="project-detail">
        <section className="project-detail__hero" id="top" aria-labelledby="project-title">
          <img className="project-detail__cover" src={project.cover} alt={project.coverAlt || project.title} />
          <div className="project-detail__veil" aria-hidden="true" />
          <div className="shell project-detail__hero-inner">
            <nav className="project-detail__crumbs" aria-label="Breadcrumb">
              <Link href="/projects">Projects</Link>
              {project.category && <><span aria-hidden="true">/</span><Link href={`/projects/${project.category}`}>{categoryLabel}</Link></>}
            </nav>
            <ScrollReveal>
              <p className="project-detail__stage"><span className={`project-tile__stage project-tile__stage--${project.stage}`}>{PROJECT_STAGES[project.stage]}</span>{[project.location, project.year].filter(Boolean).join(" · ")}</p>
              <h1 id="project-title">{project.title}</h1>
              <p className="project-detail__summary">{project.summary}</p>
            </ScrollReveal>
          </div>
        </section>

        <section className="shell project-detail__body section-pad">
          <ScrollReveal as="aside" className="project-sheet" aria-label="Project data sheet">
            <header><span>Project data sheet</span><span>{sheetNumber}</span></header>
            <dl>
              {sheet.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <footer>
              <Link href={`/contact`} className="project-sheet__cta">Start a similar project <span aria-hidden="true">↗</span></Link>
            </footer>
          </ScrollReveal>
          <div className="project-detail__story">
            {paragraphs.length ? paragraphs.map((paragraph, index) => (
              <ScrollReveal key={index} as="p" delay={index * 40} className={index === 0 ? "project-detail__lead" : ""}>{paragraph}</ScrollReveal>
            )) : <p className="project-detail__lead">{project.summary}</p>}
          </div>
        </section>

        {project.gallery.length > 0 && (
          <section className="project-detail__gallery section-pad" aria-labelledby="project-gallery-title">
            <div className="shell">
              <ScrollReveal className="project-detail__section-head">
                <p className="section-kicker"><span>On site</span><span className="section-kicker__rule" /></p>
                <h2 id="project-gallery-title">Inside the <em>project.</em></h2>
              </ScrollReveal>
              <ProjectLightboxGallery images={project.gallery} title={project.title} />
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="section-pad project-detail__related" aria-labelledby="project-related-title">
            <div className="shell">
              <ScrollReveal className="project-detail__section-head">
                <p className="section-kicker"><span>Keep exploring</span><span className="section-kicker__rule" /></p>
                <h2 id="project-related-title">More {categoryLabel ? categoryLabel.toLowerCase() : ""} <em>work.</em></h2>
              </ScrollReveal>
              <ProjectShowcase projects={related} showFilters={false} />
            </div>
          </section>
        )}

        <ScrollReveal as="section" className="closing-cta shell" delay={80}>
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> Your project next</p>
            <h2>Planning something<br />like this?</h2>
            <p>Tell us about the place you want to build. We&apos;ll start with the purpose, the people and the questions in front of you.</p>
          </div>
          <Link className="button button--dark" href="/contact">Start a conversation <span aria-hidden="true">↗</span></Link>
        </ScrollReveal>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
