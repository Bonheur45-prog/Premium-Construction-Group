import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { getHomePageContent } from "@/lib/homepage/store";

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

function CapabilityIcon({ name }: { name: string }) {
  if (name === "structure") {
    return <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M7 33V18L20 9l13 9v15M14 33V22h12v11M4 33h32" /><path d="M20 9V5m-3 0h6" /></svg>;
  }
  if (name === "lines") {
    return <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M8 8h24M8 16h16M8 24h24M8 32h16" /><circle cx="29" cy="16" r="3" /><circle cx="27" cy="32" r="3" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="13" /><path d="M20 7v13l9 9M20 13v7h7M20 3v4m17 13h-4M20 37v-4M3 20h4" /></svg>;
}

export default async function HomePage() {
  await connection();
  const home = getHomePageContent();
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
    "--home-body-font": home.theme.bodyFont,
    "--home-heading-font": home.theme.headingFont,
  } as CSSProperties;

  return (
    <div className="home-page" style={homeThemeStyle}>
      <SiteHeader />
      <main id="main-content">
        {home.hero.enabled && <HeroSlideshow slides={home.hero.slides} scrollLabel={home.hero.scrollLabel} scrollHref={scrollHref} />}

        {home.belief.enabled && (
          <section className="belief-band" aria-label="Our promise">
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
          <section className="intro-section shell section-pad" id="about">
            <div className="section-kicker">
              <span>{home.intro.kicker}</span>
              <span className="section-kicker__rule" />
            </div>
            <div className="intro-section__grid">
              <h2>{home.intro.headline.lead}<br /><em>{home.intro.headline.accent}</em></h2>
              <div className="intro-section__body">
                <p className="lead">{home.intro.paragraph}</p>
                <Link className="text-link" href={home.intro.action.href}>
                  {home.intro.action.label} <Arrow />
                </Link>
              </div>
            </div>
            <div className="intro-image">
              <Image src={home.intro.image.src} alt={home.intro.image.alt} fill unoptimized sizes="(max-width: 800px) 100vw, 90vw" />
              <div className="intro-image__label">
                <span className="intro-image__label-number">{home.intro.image.number}</span>
                <span>{home.intro.image.label}</span>
              </div>
            </div>
          </section>
        )}

        {home.services.enabled && (
          <section className="services-section section-pad" id="services">
            <div className="shell">
              <div className="section-heading">
                <div>
                  <div className="section-kicker section-kicker--light">
                    <span>{home.services.kicker}</span><span className="section-kicker__rule" />
                  </div>
                  <h2>{home.services.headline.lead}<br /><em>{home.services.headline.accent}</em></h2>
                </div>
                <p className="section-heading__aside">{home.services.aside}</p>
              </div>
              <div className="capability-grid">
                {home.services.capabilities.map((capability) => (
                  <article className="capability-card" key={capability.id}>
                    <div className="capability-card__top">
                      <span className="capability-card__number">{capability.number}</span>
                      <span className="capability-card__icon"><CapabilityIcon name={capability.icon} /></span>
                    </div>
                    <h3>{capability.title}</h3>
                    <p>{capability.text}</p>
                    <Link className="capability-card__link" href={`/services#${capability.id}`} aria-label={`Learn about ${capability.title}`}>
                      <Arrow diagonal />
                    </Link>
                  </article>
                ))}
              </div>
              <div className="services-footnote">
                <span>{home.services.note}</span>
                <Link className="text-link text-link--light" href={home.services.action.href}>{home.services.action.label} <Arrow /></Link>
              </div>
            </div>
          </section>
        )}

        {home.projects.enabled && (
          <section className="projects-section shell section-pad" id="projects">
            <div className="projects-header">
              <div>
                <div className="section-kicker"><span>{home.projects.kicker}</span><span className="section-kicker__rule" /></div>
                <h2>{home.projects.headline.lead}<br /><em>{home.projects.headline.accent}</em></h2>
              </div>
              <div className="projects-header__aside">
                <p>{home.projects.aside}</p>
                <Link className="text-link" href={home.projects.action.href}>{home.projects.action.label} <Arrow /></Link>
              </div>
            </div>
            <div className="project-grid">
              {home.projects.cards.map((project, index) => (
                <Link className={`project-card${project.size === "tall" ? " project-card--tall" : ""}`} href={project.href} key={project.id}>
                  <div className="project-card__image">
                    <Image src={project.image} alt={project.alt} fill unoptimized sizes="(max-width: 720px) 100vw, 40vw" />
                    <span className="project-card__count">{String(index + 1).padStart(2, "0")}</span>
                    <span className="project-card__arrow"><Arrow diagonal /></span>
                  </div>
                  <div className="project-card__meta">
                    <span>{project.type}</span>
                    <h3>{project.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
            <p className="image-note">{home.projects.note}</p>
          </section>
        )}

        {home.approach.enabled && (
          <section className="approach-section" id="approach">
            <div className="shell approach-section__grid section-pad">
              <div className="approach-section__intro">
                <div className="section-kicker"><span>{home.approach.kicker}</span><span className="section-kicker__rule" /></div>
                <h2>{home.approach.headline.lead}<br /><em>{home.approach.headline.accent}</em></h2>
                <p>{home.approach.paragraph}</p>
                <Link className="button button--outline" href={home.approach.action.href}>{home.approach.action.label} <Arrow diagonal /></Link>
              </div>
              <div className="approach-list">
                {home.approach.steps.map((step, index) => (
                  <article key={`${step.number}-${index}`}>
                    <span className="approach-list__number">{step.number}</span>
                    <div><h3>{step.title}</h3><p>{step.text}</p></div>
                    <span className="approach-list__symbol">+</span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {home.closing.enabled && (
          <section className="closing-cta shell" id="contact">
            <div className="closing-cta__mark" aria-hidden="true">{home.closing.mark}<span>.</span></div>
            <div className="closing-cta__copy">
              <p className="eyebrow"><span /> {home.closing.eyebrow}</p>
              <h2>{home.closing.headline.lead}<br />{home.closing.headline.accent}</h2>
              <p>{home.closing.paragraph}</p>
            </div>
            <Link className="button button--dark" href={home.closing.action.href}>{home.closing.action.label} <Arrow diagonal /></Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
