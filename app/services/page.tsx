import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getSiteContent } from "@/lib/site-content/store";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("services"); }

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"}
      fill="none"
    >
      {diagonal ? (
        <path d="M5 15 15 5M6 5h9v9" />
      ) : (
        <path d="M3 10h13m-5-5 5 5-5 5" />
      )}
    </svg>
  );
}

export default async function ServicesPage() {
  await connection();
  const content = (await getSiteContent()).services;
  const { hero, index: serviceIndex, services, process, closing } = content;
  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="services-page">
        <section className="services-hero shell" id="top" aria-labelledby="services-title">
          <div className="services-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="services-title">{hero.title}<em>{hero.accent}</em></h1>
            <p className="services-hero__intro">{hero.intro}</p>
            <div className="services-hero__actions">
              <Link className="button button--primary" href={hero.primaryHref}>
                {hero.primaryLabel} <Arrow diagonal />
              </Link>
              <Link className="text-link" href={hero.secondaryHref}>
                {hero.secondaryLabel} <Arrow />
              </Link>
            </div>
          </div>
          <div className="services-hero__visual">
            <Image
              src={hero.image}
              alt={hero.imageAlt}
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 52vw"
            />
            <div className="services-hero__image-label">
              <span>{hero.imageLabel}</span>
              <span>PCG / {hero.index}</span>
            </div>
            <div className="services-hero__note">
              <span>{hero.noteLabel}</span>
              <strong>{hero.noteText}</strong>
            </div>
          </div>
          <div className="services-hero__index">{hero.index} <span>/ {hero.eyebrow}</span></div>
        </section>

        <section className="service-index" id="service-list" aria-label="Services at a glance">
          <div className="shell service-index__inner">
            <div className="service-index__intro">
              <span>{serviceIndex.label}</span>
              <p>{serviceIndex.text}</p>
            </div>
            <nav className="service-index__links" aria-label="Jump to a service">
              {services.map((service) => (
                <Link href={`#${service.id}`} key={service.id}>
                  <span>{service.number}</span>
                  <strong>{service.title}</strong>
                  <Arrow diagonal />
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {services.map((service, index) => (
          <section
            className={`service-detail service-detail--${service.tone}`}
            id={service.id}
            key={service.id}
            aria-labelledby={`${service.id}-title`}
          >
            <div className={`shell service-detail__inner${index % 2 === 1 ? " is-reversed" : ""}`}>
              <div className="service-detail__visual">
                <Image
                  src={service.image}
                  alt={service.imageAlt}
                  fill
                  unoptimized
                  sizes="(max-width: 760px) 100vw, 48vw"
                />
                <span className="service-detail__image-label">{service.imageCaption}</span>
                <span className="service-detail__image-number">{service.number} / {String(services.length).padStart(2, "0")}</span>
              </div>
              <div className="service-detail__copy">
                <p className="service-detail__eyebrow">
                  <span>{service.number}</span> {service.category}
                </p>
                <h2 id={`${service.id}-title`}>{service.title}</h2>
                <h3>{service.headline}</h3>
                <p className="service-detail__description">{service.description}</p>
                <ul className="service-detail__points">
                  {service.points.map((point) => (
                    <li key={point.title}>
                      <span aria-hidden="true">+</span>
                      <div>
                        <strong>{point.title}</strong>
                        <p>{point.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link className="service-detail__link" href={service.actionHref}>
                  {service.actionLabel} <Arrow diagonal />
                </Link>
              </div>
            </div>
          </section>
        ))}

        <section className="service-process section-pad" aria-labelledby="service-process-title">
          <div className="shell">
            <div className="service-process__heading">
              <div>
                <p className="section-kicker"><span>{process.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="service-process-title">{process.title}<br /><em>{process.accent}</em></h2>
              </div>
              <p>{process.intro}</p>
            </div>
            <div className="service-process__grid">
              {process.steps.map((step, index) => (
                <article key={`${step.number}-${index}`}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
            <p className="service-image-note">{process.imageNote}</p>
          </div>
        </section>

        <section className="closing-cta shell services-cta">
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
