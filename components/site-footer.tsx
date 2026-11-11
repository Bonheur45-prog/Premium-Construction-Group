import Image from "next/image";
import Link from "next/link";

const companyLinks = [
  { label: "About us", href: "/about" },
  { label: "Our approach", href: "/approach" },
  { label: "Selected work", href: "/projects" },
  { label: "Insights", href: "/insights" },
  { label: "What we do", href: "/services" },
];

const serviceLinks = [
  { label: "Construction delivery", href: "/services#construction-delivery" },
  { label: "Design coordination", href: "/services#design-coordination" },
  { label: "Project management", href: "/services#project-management" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__invitation">
        <div className="shell site-footer__invitation-inner">
          <div className="site-footer__invitation-copy">
            <p className="site-footer__eyebrow"><span /> A good place to start</p>
            <h2>Every good build<br /><em>begins with a conversation.</em></h2>
          </div>
          <div className="site-footer__invitation-action">
            <p>Tell us what you&apos;re planning. We&apos;ll take the time to understand what matters.</p>
            <Link className="site-footer__project-link" href="/contact">
              Start a project <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <span className="site-footer__watermark" aria-hidden="true">PCG</span>
        </div>
      </div>

      <div className="shell site-footer__main">
        <div className="site-footer__identity">
          <Link className="brand brand--footer" href="/" aria-label="Premium Construction Group home">
            <span className="brand__mark">
              <Image src="/premium-mark.png" alt="" width={122} height={77} />
            </span>
            <span className="brand__name">
              <strong>Premium</strong>
              <span>Construction Group</span>
            </span>
          </Link>
          <p>Thoughtful construction.<br />Clear communication.<br />Made to last.</p>
        </div>

        <nav className="site-footer__links" aria-label="Explore Premium Construction Group">
          <h3>Explore</h3>
          {companyLinks.map((link) => (
            <Link href={link.href} key={link.label}>{link.label}</Link>
          ))}
        </nav>

        <nav className="site-footer__links" aria-label="Our capabilities">
          <h3>Capabilities</h3>
          {serviceLinks.map((link) => (
            <Link href={link.href} key={link.label}>{link.label}</Link>
          ))}
        </nav>

        <div className="site-footer__contact">
          <h3>Have something in mind?</h3>
          <p>Start with a conversation about your project and where you want it to go.</p>
          <Link href="/contact" className="site-footer__contact-link">
            Talk to our team <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>

      <div className="shell site-footer__bottom">
        <span>© {new Date().getFullYear()} Premium Construction Group Ltd</span>
        <span>Considered construction. Enduring value.</span>
        <Link href="/#top">Back to top <span aria-hidden="true">↑</span></Link>
      </div>
    </footer>
  );
}
