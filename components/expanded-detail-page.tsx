import Image from "next/image";
import Link from "next/link";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import type { ExpandedDetailFocus, ExpandedDetailSection } from "@/lib/site-content/expanded-details";

type RelatedDetail = {
  href: string;
  title: string;
  description: string;
};

type ExpandedDetailPageProps = {
  kind: "service" | "project";
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  image: string;
  imageAlt: string;
  imageLabel: string;
  index: string;
  sections: ExpandedDetailSection[];
  focus: ExpandedDetailFocus[];
  related: RelatedDetail[];
  /** Extra content shown before "Keep exploring" (e.g. the projects in a category). */
  children?: React.ReactNode;
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"} fill="none">
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3 10h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

export function ExpandedDetailPage({
  kind,
  eyebrow,
  title,
  accent,
  intro,
  image,
  imageAlt,
  imageLabel,
  index,
  sections,
  focus,
  related,
  children,
}: ExpandedDetailPageProps) {
  const collectionHref = kind === "service" ? "/services" : "/projects";
  const collectionLabel = kind === "service" ? "Services" : "Projects";
  const detailLabel = kind === "service" ? "Service detail" : "Project category";
  const relatedHeading = kind === "service" ? "Explore more services" : "Explore other project types";

  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="expanded-detail-page">
        <section className="expanded-detail-hero shell" id="top" aria-labelledby="expanded-detail-title">
          <ScrollReveal className="expanded-detail-hero__copy">
            <nav className="expanded-detail-hero__breadcrumb" aria-label="Breadcrumb">
              <Link href={collectionHref}>{collectionLabel}</Link><span aria-hidden="true">/</span><span>{title}</span>
            </nav>
            <p className="eyebrow"><span /> {eyebrow}</p>
            <h1 id="expanded-detail-title">{title}<em>{accent}</em></h1>
            <p className="expanded-detail-hero__intro">{intro}</p>
            <div className="expanded-detail-hero__actions">
              <Link className="button button--primary" href="#detail-explanation">Explore the details <Arrow diagonal /></Link>
              <Link className="text-link" href="/contact">Discuss your plans <Arrow /></Link>
            </div>
          </ScrollReveal>
          <ScrollReveal className="expanded-detail-hero__visual" delay={120}>
            <Image src={image} alt={imageAlt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 52vw" />
            <div className="expanded-detail-hero__image-label"><span>{imageLabel}</span><span>PCG / {index}</span></div>
            <div className="expanded-detail-hero__note">
              <span>{detailLabel}</span>
              <strong>{kind === "service" ? "Clear thinking at every stage." : "Consider the people and purpose first."}</strong>
            </div>
          </ScrollReveal>
          <div className="expanded-detail-hero__index">{index}<span> / {detailLabel}</span></div>
        </section>

        <section className="expanded-detail-explanation section-pad" id="detail-explanation" aria-labelledby="expanded-detail-explanation-title">
          <div className="shell">
            <ScrollReveal className="expanded-detail-explanation__heading">
              <div>
                <p className="section-kicker"><span>{kind === "service" ? "Inside the service" : "A closer look"}</span><span className="section-kicker__rule" /></p>
                <h2 id="expanded-detail-explanation-title">A little more<br /><em>about the work.</em></h2>
              </div>
              <p>{kind === "service"
                ? "The best way forward depends on the brief. These are the connected questions and decisions that help shape the work."
                : "Every brief is different. These considerations help turn the needs of a place and the people it serves into a clearer plan."}</p>
            </ScrollReveal>

            <div className="expanded-detail-explanation__grid">
              {sections.map((section, sectionIndex) => (
                <ScrollReveal as="article" key={section.title} delay={sectionIndex * 90}>
                  <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal className="expanded-detail-focus" delay={100}>
              <div>
                <p className="section-kicker"><span>{kind === "service" ? "What we keep in view" : "Questions worth asking"}</span></p>
                <h2>{kind === "service" ? "The details that help the project move." : "Start with what matters most."}</h2>
              </div>
              <ul>
                {focus.map((item) => (
                  <li key={item.title}><span aria-hidden="true">+</span><div><strong>{item.title}</strong><p>{item.text}</p></div></li>
                ))}
              </ul>
            </ScrollReveal>

          </div>
        </section>

        {children}

        {related.length > 0 && (
          <section className="expanded-detail-related section-pad" aria-labelledby="expanded-detail-related-title">
            <div className="shell">
              <ScrollReveal className="expanded-detail-related__heading">
                <p className="section-kicker"><span>Keep exploring</span><span className="section-kicker__rule" /></p>
                <h2 id="expanded-detail-related-title">{relatedHeading}</h2>
              </ScrollReveal>
              <div className="expanded-detail-related__grid">
                {related.map((item, itemIndex) => (
                  <ScrollReveal as="article" key={item.href} delay={itemIndex * 80}>
                    <Link href={item.href}>
                      <span>{collectionLabel} / {String(itemIndex + 1).padStart(2, "0")}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <i aria-hidden="true"><Arrow diagonal /></i>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )}

        <ScrollReveal as="section" className="closing-cta shell expanded-detail-cta" delay={80}>
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> A considered next step</p>
            <h2>Have a project<br />in mind?</h2>
            <p>Tell us what you are planning. We can start with the purpose, the people, and the questions in front of you.</p>
          </div>
          <Link className="button button--dark" href="/contact">Start a conversation <Arrow diagonal /></Link>
        </ScrollReveal>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
