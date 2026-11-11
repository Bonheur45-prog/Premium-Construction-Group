import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Explore construction delivery, design coordination, and project management from Premium Construction Group Ltd.",
};

const services = [
  {
    id: "construction-delivery",
    number: "01",
    category: "Delivery",
    title: "Construction delivery",
    headline: "Bring the work together.",
    description:
      "A considered build depends on many moving parts working toward the same result. We bring people, plans, materials, and site decisions into a clearer sequence from the first conversation to the finishing details.",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Construction professionals working together on a building site",
    imageCaption: "Coordination from the ground up",
    tone: "dark",
    points: [
      {
        title: "A clear sequence",
        text: "Keep the work and the decisions around it moving in a considered order.",
      },
      {
        title: "Connected people",
        text: "Help everyone involved understand the shared direction and next steps.",
      },
      {
        title: "Care through completion",
        text: "Keep attention on the details that make a space feel finished and ready to use.",
      },
    ],
  },
  {
    id: "design-coordination",
    number: "02",
    category: "Design",
    title: "Design coordination",
    headline: "Keep the vision and the practical in conversation.",
    description:
      "Good design needs room to become real. We help connect design intent with the people, plans, and practical choices that shape a build, so important decisions stay visible as the work develops.",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Architectural plans spread out for a design discussion",
    imageCaption: "Turning ideas into workable decisions",
    tone: "light",
    points: [
      {
        title: "Design intent",
        text: "Keep the purpose and character of the original idea in view.",
      },
      {
        title: "Practical choices",
        text: "Bring build considerations into the conversation early and clearly.",
      },
      {
        title: "Joined-up decisions",
        text: "Help the right people make informed choices together.",
      },
    ],
  },
  {
    id: "project-management",
    number: "03",
    category: "Management",
    title: "Project management",
    headline: "Clarity from brief to handover.",
    description:
      "A well-managed project gives people a better view of what is happening and what needs attention. We keep priorities, progress, and communication connected as the project moves forward.",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Contemporary commercial building representing a completed project",
    imageCaption: "Keep the long view in sight",
    tone: "paper",
    points: [
      {
        title: "Planning and priorities",
        text: "Set a clear direction for the work and the choices ahead.",
      },
      {
        title: "Progress in view",
        text: "Make the status of the work easier to understand as it develops.",
      },
      {
        title: "Steady communication",
        text: "Keep conversations focused on the details that move the project forward.",
      },
    ],
  },
];

const processSteps = [
  {
    number: "01",
    title: "Understand",
    text: "Start with the people, purpose, place, and priorities behind the project.",
  },
  {
    number: "02",
    title: "Align",
    text: "Bring the plans and decisions into focus so everyone can move forward together.",
  },
  {
    number: "03",
    title: "Deliver",
    text: "Keep the work connected, the communication clear, and the long view in sight.",
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

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="services-page">
        <section className="services-hero shell" id="top" aria-labelledby="services-title">
          <div className="services-hero__copy">
            <p className="eyebrow"><span /> What we do</p>
            <h1 id="services-title">
              Considered work.
              <em>Clear delivery.</em>
            </h1>
            <p className="services-hero__intro">
              Thoughtful construction takes more than a good plan. It takes
              connected decisions, clear communication, and care at every stage.
            </p>
            <div className="services-hero__actions">
              <Link className="button button--primary" href="/contact">
                Discuss your project <Arrow diagonal />
              </Link>
              <Link className="text-link" href="#service-list">
                Explore our services <Arrow />
              </Link>
            </div>
          </div>
          <div className="services-hero__visual">
            <Image
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=90"
              alt="Construction professionals coordinating work on site"
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 52vw"
            />
            <div className="services-hero__image-label">
              <span>Premium Construction Group</span>
              <span>PCG / 02</span>
            </div>
            <div className="services-hero__note">
              <span>Our approach</span>
              <strong>Good work starts with good questions.</strong>
            </div>
          </div>
          <div className="services-hero__index">02 <span>/ What we do</span></div>
        </section>

        <section className="service-index" id="service-list" aria-label="Services at a glance">
          <div className="shell service-index__inner">
            <div className="service-index__intro">
              <span>Our capabilities</span>
              <p>Three ways to help move your project forward.</p>
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
                <span className="service-detail__image-number">{service.number} / 03</span>
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
                <Link className="service-detail__link" href="/contact">
                  Talk to our team <Arrow diagonal />
                </Link>
              </div>
            </div>
          </section>
        ))}

        <section className="service-process section-pad" aria-labelledby="service-process-title">
          <div className="shell">
            <div className="service-process__heading">
              <div>
                <p className="section-kicker"><span>How we work</span><span className="section-kicker__rule" /></p>
                <h2 id="service-process-title">A clear path<br /><em>from start to finish.</em></h2>
              </div>
              <p>
                Every project is different. A considered process helps people
                stay aligned as the work takes shape.
              </p>
            </div>
            <div className="service-process__grid">
              {processSteps.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
            <p className="service-image-note">
              Photography is shown as visual direction until Premium Construction Group&apos;s approved service imagery is available.
            </p>
          </div>
        </section>

        <section className="closing-cta shell services-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> The next step is yours</p>
            <h2>Tell us what<br />you&apos;re planning.</h2>
            <p>Start with the project, the people, and what matters most to you.</p>
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
