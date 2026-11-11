import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { homeHeroSlides } from "@/lib/home-hero-slides";
import { projectCategories } from "@/lib/project-categories";

const capabilities = [
  {
    number: "01",
    slug: "construction-delivery",
    title: "Construction delivery",
    text: "Careful coordination and a steady hand from the first conversation through to the final detail.",
    icon: "structure",
  },
  {
    number: "02",
    slug: "design-coordination",
    title: "Design coordination",
    text: "Bringing the right people, plans, and practical decisions together around a shared vision.",
    icon: "lines",
  },
  {
    number: "03",
    slug: "project-management",
    title: "Project management",
    text: "Clear priorities and considered communication to keep every part of the process moving.",
    icon: "compass",
  },
];

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

function CapabilityIcon({ name }: { name: string }) {
  if (name === "structure") {
    return (
      <svg aria-hidden="true" viewBox="0 0 40 40" fill="none">
        <path d="M7 33V18L20 9l13 9v15M14 33V22h12v11M4 33h32" />
        <path d="M20 9V5m-3 0h6" />
      </svg>
    );
  }
  if (name === "lines") {
    return (
      <svg aria-hidden="true" viewBox="0 0 40 40" fill="none">
        <path d="M8 8h24M8 16h16M8 24h24M8 32h16" />
        <circle cx="29" cy="16" r="3" />
        <circle cx="27" cy="32" r="3" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="13" />
      <path d="M20 7v13l9 9M20 13v7h7M20 3v4m17 13h-4M20 37v-4M3 20h4" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HeroSlideshow slides={homeHeroSlides} />

        <section className="belief-band" aria-label="Our promise">
          <div className="shell belief-band__inner">
            <span>We believe good construction begins with good questions.</span>
            <span className="belief-band__detail">Intentional design <i /> Clear process <i /> Lasting quality</span>
          </div>
        </section>

        <section className="intro-section shell section-pad" id="about">
          <div className="section-kicker">
            <span>01 / Who we are</span>
            <span className="section-kicker__rule" />
          </div>
          <div className="intro-section__grid">
            <h2>Good work starts<br />with <em>understanding.</em></h2>
            <div className="intro-section__body">
              <p className="lead">
                Every great space begins with a clear idea of what it needs to
                become. We bring care, craft, and considered thinking to the
                process of bringing that idea to life.
              </p>
              <a className="text-link" href="#approach">
                Get to know our approach <Arrow />
              </a>
            </div>
          </div>
          <div className="intro-image">
            <Image
              src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=2000&q=85"
              alt="Architectural forms reveal the balance of light, material, and space"
              fill
              unoptimized
              sizes="(max-width: 800px) 100vw, 90vw"
            />
            <div className="intro-image__label">
              <span className="intro-image__label-number">PCG / 01</span>
              <span>Considered in every detail</span>
            </div>
          </div>
        </section>

        <section className="services-section section-pad" id="services">
          <div className="shell">
            <div className="section-heading">
              <div>
                <div className="section-kicker section-kicker--light">
                  <span>02 / What we do</span><span className="section-kicker__rule" />
                </div>
                <h2>Built around<br /><em>what matters.</em></h2>
              </div>
              <p className="section-heading__aside">
                From the first plan to the finishing touch, every stage deserves
                the same care and attention.
              </p>
            </div>
            <div className="capability-grid">
              {capabilities.map((capability) => (
                <article className="capability-card" key={capability.number}>
                  <div className="capability-card__top">
                    <span className="capability-card__number">{capability.number}</span>
                    <span className="capability-card__icon"><CapabilityIcon name={capability.icon} /></span>
                  </div>
                  <h3>{capability.title}</h3>
                  <p>{capability.text}</p>
                  <Link className="capability-card__link" href={`/services#${capability.slug}`} aria-label={`Learn about ${capability.title}`}>
                    <Arrow diagonal />
                  </Link>
                </article>
              ))}
            </div>
            <div className="services-footnote">
              <span>Every project is different.</span>
              <Link className="text-link text-link--light" href="/services">Find the right fit <Arrow /></Link>
            </div>
          </div>
        </section>

        <section className="projects-section shell section-pad" id="projects">
          <div className="projects-header">
            <div>
              <div className="section-kicker"><span>03 / Selected work</span><span className="section-kicker__rule" /></div>
              <h2>Spaces with<br /><em>something to say.</em></h2>
            </div>
            <div className="projects-header__aside">
              <p>We believe the best work is made to serve the people who use it, today and for years to come.</p>
              <a className="text-link" href="/projects">View all projects <Arrow /></a>
            </div>
          </div>
          <div className="project-grid">
              {projectCategories.map((project, index) => (
                <Link className={`project-card ${project.className}`} href={`/projects#${project.id}`} key={project.id}>
                <div className="project-card__image">
                  <Image src={project.image} alt={project.alt} fill unoptimized sizes="(max-width: 720px) 100vw, 40vw" />
                  <span className="project-card__count">0{index + 1}</span>
                  <span className="project-card__arrow"><Arrow diagonal /></span>
                </div>
                  <div className="project-card__meta">
                    <span>{project.type}</span>
                    <h3>{project.title}</h3>
                  </div>
                </Link>
            ))}
          </div>
          <p className="image-note">Architecture imagery shown as a visual direction. Project photography and details can be added as they are approved.</p>
        </section>

        <section className="approach-section" id="approach">
          <div className="shell approach-section__grid section-pad">
            <div className="approach-section__intro">
              <div className="section-kicker"><span>04 / The way forward</span><span className="section-kicker__rule" /></div>
              <h2>A better build<br />begins with <em>trust.</em></h2>
              <p>Good collaboration makes room for both big ideas and the small decisions that bring them to life.</p>
              <a className="button button--outline" href="/contact">Let&apos;s talk about your project <Arrow diagonal /></a>
            </div>
            <div className="approach-list">
              <article>
                <span className="approach-list__number">01</span>
                <div><h3>Listen first</h3><p>Understand the brief, the people, and the purpose behind each project.</p></div>
                <span className="approach-list__symbol">+</span>
              </article>
              <article>
                <span className="approach-list__number">02</span>
                <div><h3>Plan with intention</h3><p>Make thoughtful choices early, so the whole team can move forward with clarity.</p></div>
                <span className="approach-list__symbol">+</span>
              </article>
              <article>
                <span className="approach-list__number">03</span>
                <div><h3>Deliver with care</h3><p>Bring the work together with focus, communication, and respect for every detail.</p></div>
                <span className="approach-list__symbol">+</span>
              </article>
            </div>
          </div>
        </section>

        <section className="closing-cta shell" id="contact">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> The next step is yours</p>
            <h2>Have a place<br />in mind?</h2>
            <p>Tell us what you&apos;re looking to build. We&apos;ll start with a conversation.</p>
          </div>
          <a className="button button--dark" href="/contact">Start a conversation <Arrow diagonal /></a>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
