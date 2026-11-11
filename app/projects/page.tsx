import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProjectGallery } from "@/components/project-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore the commercial, residential, and infrastructure categories represented in the Premium Construction Group portfolio.",
};

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

export default function ProjectsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="projects-page">
        <section className="projects-hero shell" id="top" aria-labelledby="projects-title">
          <div className="projects-hero__copy">
            <p className="eyebrow"><span /> Selected work</p>
            <h1 id="projects-title">
              A portfolio<br />
              <em>with purpose.</em>
            </h1>
            <p className="projects-hero__intro">
              Every place begins with an idea and the people it is meant to serve.
              Explore the types of projects that shape our portfolio.
            </p>
            <div className="projects-hero__actions">
              <Link className="button button--primary" href="#portfolio">
                Explore categories <Arrow diagonal />
              </Link>
              <Link className="text-link" href="/contact">
                Tell us what you&apos;re planning <Arrow />
              </Link>
            </div>
          </div>
          <div className="projects-hero__visual">
            <Image
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=90"
              alt="Contemporary commercial buildings beneath a clear sky"
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 52vw"
            />
            <div className="projects-hero__image-label">
              <span>Places for work and growth</span>
              <span>PCG / 03</span>
            </div>
            <div className="projects-hero__note">
              <span>Built around people</span>
              <strong>Good spaces make room for what matters.</strong>
            </div>
          </div>
          <div className="projects-hero__index">03 <span>/ Selected work</span></div>
        </section>

        <section className="portfolio-section section-pad" id="portfolio" aria-labelledby="portfolio-title">
          <div className="shell">
            <div className="portfolio-section__heading">
              <div>
                <p className="section-kicker"><span>Project portfolio</span><span className="section-kicker__rule" /></p>
                <h2 id="portfolio-title">Different places.<br /><em>One considered approach.</em></h2>
              </div>
              <p>
                Browse by project category. Each category can grow into its own
                collection as approved project details are added.
              </p>
            </div>

            <ProjectGallery />

            <p className="image-note portfolio-section__note">
              The images and category copy shown here are illustrative references, not verified Premium Construction Group projects.
            </p>
          </div>
        </section>

        <section className="project-belief" aria-label="Our perspective">
          <div className="shell project-belief__inner">
            <span>Made with purpose.</span>
            <p>Places shaped by clear thinking, careful choices, and the people who will use them.</p>
          </div>
        </section>

        <section className="closing-cta shell projects-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> Start with a conversation</p>
            <h2>Have a project<br />in mind?</h2>
            <p>Tell us what you want to create and what matters most to you.</p>
          </div>
          <Link className="button button--dark" href="/contact">
            Talk to our team <Arrow diagonal />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
