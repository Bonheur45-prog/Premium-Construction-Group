import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Premium Construction Group Ltd, our purpose, values, and considered approach to construction.",
};

const values = [
  {
    number: "01",
    title: "People first",
    text: "Listen closely to the people who will shape, build, and use each place.",
  },
  {
    number: "02",
    title: "Purposeful planning",
    text: "Ask the right questions early and make decisions with the whole project in mind.",
  },
  {
    number: "03",
    title: "Integrity in every detail",
    text: "Keep communication clear, expectations grounded, and commitments considered.",
  },
  {
    number: "04",
    title: "A lasting view",
    text: "Consider how a space will serve people long after the build is complete.",
  },
];

const strengths = [
  {
    number: "01",
    slug: "construction-delivery",
    title: "Construction delivery",
    text: "A thoughtful, coordinated path from the first conversation through to the finishing details.",
  },
  {
    number: "02",
    slug: "design-coordination",
    title: "Design coordination",
    text: "Bringing plans, people, and practical decisions together around a shared purpose.",
  },
  {
    number: "03",
    slug: "project-management",
    title: "Project management",
    text: "Clear priorities and steady communication to help every part of the process move forward.",
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

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="about-page">
        <section className="about-hero shell" id="top" aria-labelledby="about-title">
          <div className="about-hero__copy">
            <p className="eyebrow"><span /> Who we are</p>
            <h1 id="about-title">
              Built with purpose.
              <em>Made to last.</em>
            </h1>
            <p className="about-hero__intro">
              We believe the best construction begins with understanding what matters:
              the people, the place, and the purpose behind every project.
            </p>
            <div className="about-hero__actions">
              <Link className="button button--primary" href="/contact">
                Talk to our team <Arrow diagonal />
              </Link>
              <Link className="text-link" href="#our-story">
                Get to know us <Arrow />
              </Link>
            </div>
          </div>
          <div className="about-hero__visual">
            <div className="about-hero__image">
              <Image
                src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1600&q=85"
                alt="Modern building facade in warm natural light"
                fill
                priority
                unoptimized
                sizes="(max-width: 760px) 100vw, 52vw"
              />
              <div className="about-hero__image-label">
                <span>Considered in every detail</span>
                <span>PCG / 01</span>
              </div>
            </div>
            <div className="about-hero__note">
              <span>Our point of view</span>
              <strong>Good work starts with good questions.</strong>
            </div>
          </div>
          <div className="about-hero__index">01 <span>/ Who we are</span></div>
        </section>

        <section className="about-story section-pad" id="our-story" aria-labelledby="story-title">
          <div className="shell about-story__grid">
            <div className="section-kicker">
              <span>01 / Our story</span><span className="section-kicker__rule" />
            </div>
            <div className="about-story__content">
              <h2 id="story-title">Construction is more than the structure <em>left behind.</em></h2>
              <div className="about-story__body">
                <p>
                  Premium Construction Group Ltd is here to make the building process
                  more thoughtful, connected, and purposeful. We start by listening,
                  work through the choices together, and keep the long view in sight.
                </p>
                <p>
                  A clear plan and open communication help turn ideas into places that
                  feel right to use—and continue to serve well over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-purpose section-pad" aria-labelledby="purpose-title">
          <div className="shell">
            <div className="section-kicker section-kicker--light">
              <span>02 / Our purpose</span><span className="section-kicker__rule" />
            </div>
            <h2 className="about-purpose__heading" id="purpose-title">
              A clear purpose<br />for every <em>place.</em>
            </h2>
            <div className="about-purpose__grid">
              <article>
                <span className="about-purpose__label">Our mission</span>
                <h3>Bring good ideas to life.</h3>
                <p>
                  Deliver thoughtful construction experiences and lasting spaces
                  through considered planning, careful delivery, and care in every detail.
                </p>
              </article>
              <article>
                <span className="about-purpose__label">Our vision</span>
                <h3>Build for the lives lived there.</h3>
                <p>
                  Contribute to enduring places that support the people and communities
                  who use them, today and into the future.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-values shell section-pad" id="values" aria-labelledby="values-title">
          <div className="about-values__heading">
            <div>
              <div className="section-kicker">
                <span>03 / What guides us</span><span className="section-kicker__rule" />
              </div>
              <h2 id="values-title">Principles that shape <em>the work.</em></h2>
            </div>
            <p>
              Our objectives are to keep the process clear, bring the right people
              together, and create places with lasting value.
            </p>
          </div>
          <div className="about-values__grid">
            {values.map((value) => (
              <article key={value.number}>
                <span className="about-values__number">{value.number}</span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-strengths section-pad" aria-labelledby="strengths-title">
          <div className="shell">
            <div className="about-strengths__heading">
              <div>
                <div className="section-kicker section-kicker--light">
                  <span>04 / How we help</span><span className="section-kicker__rule" />
                </div>
                <h2 id="strengths-title">Considered at<br /><em>every stage.</em></h2>
              </div>
              <p>
                Good outcomes grow from aligned people, clear decisions, and steady
                attention from start to finish.
              </p>
            </div>
            <div className="about-strengths__grid">
              {strengths.map((strength) => (
                <article key={strength.number}>
                  <span>{strength.number}</span>
                  <h3>{strength.title}</h3>
                  <p>{strength.text}</p>
                  <Link href={`/services#${strength.slug}`} aria-label={`Explore ${strength.title}`}>
                    <Arrow diagonal />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-cta shell about-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> The next step is yours</p>
            <h2>Let&apos;s build<br />something that matters.</h2>
            <p>Tell us what you&apos;re looking to build. We&apos;ll start with a conversation.</p>
          </div>
          <Link className="button button--dark" href="/contact">
            Start a conversation <Arrow diagonal />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
