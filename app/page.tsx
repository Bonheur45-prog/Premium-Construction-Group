import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import { BackToTopButton } from "@/components/back-to-top-button";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getHomePageContent } from "@/lib/homepage/store";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return getManagedPageMetadata("home");
}

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

export default async function HomePage() {
  await connection();
  const [home, content] = await Promise.all([getHomePageContent(), getSiteContent()]);
  const colors = home.theme.colors;
  const visibleSectionTargets = [
    home.intro.enabled ? "#about" : "",
    home.services.enabled ? "#services" : "",
    home.projects.enabled ? "#projects" : "",
    home.approach.enabled ? "#approach" : "",
    home.closing.enabled ? "#contact" : "",
  ].filter(Boolean);
  const scrollHref = home.hero.scrollHref.startsWith("#") && !visibleSectionTargets.includes(home.hero.scrollHref)
    ? visibleSectionTargets[0] || "#top"
    : home.hero.scrollHref;
  const homeThemeStyle = {
    "--ink": colors.ink,
    "--ink-soft": colors.inkSoft,
    "--night": colors.night,
    "--night-deep": colors.nightDeep,
    "--blue": colors.blue,
    "--teal": colors.teal,
    "--teal-pale": colors.tealPale,
    "--amber": colors.amber,
    "--paper": colors.paper,
    "--white": colors.white,
    "--line": colors.line,
  } as CSSProperties;
  const services = content.services.services;
  const reasons = content.about.strengths.items;

  return (
    <div className="home-page" style={homeThemeStyle}>
      <SiteHeader />
      <main id="main-content">
        {home.hero.enabled && (
          <HeroSlideshow
            slides={home.hero.slides}
            scrollLabel={home.hero.scrollLabel}
            scrollHref={scrollHref}
          />
        )}

        {home.belief.enabled && (
          <section className="belief-band home-proof-strip" aria-label="Our promise">
            <div className="shell belief-band__inner">
              <span>{home.belief.statement}</span>
              <span className="belief-band__detail">
                {home.belief.details.map((detail, index) => (
                  <span className="belief-band__item" key={`${detail}-${index}`}>
                    {index > 0 && <i aria-hidden="true" />}{detail}
                  </span>
                ))}
              </span>
            </div>
          </section>
        )}

        {home.intro.enabled && (
          <section className="home-intro section-pad" id="about" aria-labelledby="home-intro-title">
            <div className="shell">
              <div className="home-intro__heading">
                <div>
                  <p className="section-kicker"><span>{home.intro.kicker}</span><span className="section-kicker__rule" /></p>
                  <h2 id="home-intro-title">{home.intro.headline.lead}<br /><em>{home.intro.headline.accent}</em></h2>
                </div>
                <div className="home-intro__copy">
                  <p>{home.intro.paragraph}</p>
                  <Link className="text-link" href={home.intro.action.href}>
                    {home.intro.action.label}<Arrow />
                  </Link>
                </div>
              </div>
              <div className="home-intro__visual">
                <Image src={home.intro.image.src} alt={home.intro.image.alt} fill unoptimized sizes="(max-width: 760px) 100vw, 90vw" />
                <span className="home-intro__image-label"><b>{home.intro.image.number}</b>{home.intro.image.label}</span>
              </div>
            </div>
          </section>
        )}

        {home.services.enabled && (
          <section className="home-services section-pad" id="services" aria-labelledby="home-services-title">
            <div className="shell">
              <div className="home-section-heading">
                <p className="section-kicker"><span>{home.services.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="home-services-title">{home.services.headline.lead} <em>{home.services.headline.accent}</em></h2>
                <p className="home-section-heading__intro">{home.services.aside}</p>
              </div>
              <div className="home-service-grid">
                {services.map((service, index) => (
                  <Link className="home-service-card" href={`/services/${service.id}`} key={service.id}>
                    <Image src={service.image} alt={service.imageAlt} fill unoptimized sizes="(max-width: 720px) 100vw, 33vw" />
                    <span className="home-service-card__number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="home-service-card__content">
                      <span className="home-service-card__category">{service.category}</span>
                      <strong>{service.title}</strong>
                      <span className="home-service-card__link">Learn more <Arrow diagonal /></span>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="home-services__footer">
                <Link className="button button--primary" href={home.services.action.href}>{home.services.action.label}<Arrow /></Link>
              </div>
            </div>
          </section>
        )}

        {home.projects.enabled && (
          <section className="home-projects section-pad" id="projects" aria-labelledby="home-projects-title">
            <div className="shell">
              <div className="home-projects__heading">
                <div>
                  <p className="section-kicker"><span>{home.projects.kicker}</span><span className="section-kicker__rule" /></p>
                  <h2 id="home-projects-title">{home.projects.headline.lead}<br /><em>{home.projects.headline.accent}</em></h2>
                </div>
                <div>
                  <p>{home.projects.aside}</p>
                  <Link className="text-link" href={home.projects.action.href}>{home.projects.action.label}<Arrow /></Link>
                </div>
              </div>
              <div className="home-project-grid">
                {home.projects.cards.map((project, index) => (
                  <Link className={`home-project-card${index === 0 ? " home-project-card--featured" : ""}`} href={`/projects/${project.id}`} key={project.id}>
                    <div className="home-project-card__image">
                      <Image src={project.image} alt={project.alt} fill unoptimized sizes="(max-width: 760px) 100vw, 50vw" />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <i aria-hidden="true"><Arrow diagonal /></i>
                    </div>
                    <div className="home-project-card__meta"><span>{project.type}</span><h3>{project.title}</h3></div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {home.approach.enabled && (
          <section className="home-trust section-pad" id="approach" aria-labelledby="home-trust-title">
            <div className="shell home-trust__grid">
              <div className="home-trust__copy">
                <p className="section-kicker section-kicker--light"><span>{content.about.strengths.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="home-trust-title">{home.approach.headline.lead}<br /><em>{home.approach.headline.accent}</em></h2>
                <p className="home-trust__intro">{home.approach.paragraph}</p>
                <div className="home-trust__reasons">
                  {reasons.map((reason, index) => (
                    <article key={reason.slug}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><h3>{reason.title}</h3><p>{reason.text}</p></div>
                    </article>
                  ))}
                </div>
                <Link className="button button--outline home-trust__action" href={home.approach.action.href}>{home.approach.action.label}<Arrow diagonal /></Link>
              </div>
              <div className="home-trust__image">
                <Image src={content.about.hero.image} alt={content.about.hero.imageAlt} fill unoptimized sizes="(max-width: 760px) 100vw, 44vw" />
                <span>{content.about.hero.imageLabel}</span>
              </div>
            </div>
          </section>
        )}

        {home.closing.enabled && (
          <section className="home-cta" id="contact" aria-labelledby="home-cta-title">
            <div className="shell home-cta__inner">
              <div>
                <p className="section-kicker section-kicker--light"><span>{home.closing.eyebrow}</span><span className="section-kicker__rule" /></p>
                <h2 id="home-cta-title">{home.closing.headline.lead}<br /><em>{home.closing.headline.accent}</em></h2>
                <p className="home-cta__copy">{home.closing.paragraph}</p>
              </div>
              <Link className="button button--primary" href={home.closing.action.href}>{home.closing.action.label}<Arrow diagonal /></Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter showInvitation={false} />
      <BackToTopButton />
    </div>
  );
}
