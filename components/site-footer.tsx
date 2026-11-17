import Image from "next/image";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content/store";

export async function SiteFooter({ showInvitation = true }: { showInvitation?: boolean }) {
  const { brand, footer } = (await getSiteContent()).siteSettings;
  return (
    <footer className="site-footer">
      {showInvitation && <div className="site-footer__invitation">
        <div className="shell site-footer__invitation-inner">
          <div className="site-footer__invitation-copy">
            <p className="site-footer__eyebrow"><span /> {footer.invitationEyebrow}</p>
            <h2>{footer.invitationLead}<br /><em>{footer.invitationAccent}</em></h2>
          </div>
          <div className="site-footer__invitation-action">
            <p>{footer.invitationBody}</p>
            <Link className="site-footer__project-link" href={footer.invitationHref}>
              {footer.invitationAction} <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <span className="site-footer__watermark" aria-hidden="true">PCG</span>
        </div>
      </div>}

      <div className="shell site-footer__main">
        <div className="site-footer__identity">
          <Link className="brand brand--footer" href="/" aria-label={`${brand.legalName} home`}>
            <span className="brand__mark">
              <Image src={brand.logo} alt="" width={122} height={77} unoptimized />
            </span>
            <span className="brand__name">
              <strong>{brand.primaryName}</strong>
              <span>{brand.secondaryName}</span>
            </span>
          </Link>
          <p className="site-footer__description">{brand.footerDescription}</p>
        </div>

        <nav className="site-footer__links" aria-label="Explore Premium Construction Group">
          <h3>{footer.exploreTitle}</h3>
          {footer.exploreLinks.map((link) => (
            <Link href={link.href} key={link.id}>{link.label}</Link>
          ))}
        </nav>

        <nav className="site-footer__links" aria-label="Our capabilities">
          <h3>{footer.capabilitiesTitle}</h3>
          {footer.capabilityLinks.map((link) => (
            <Link href={link.href.startsWith("/services#") ? `/services/${link.id}` : link.href} key={link.id}>{link.label}</Link>
          ))}
        </nav>

        <div className="site-footer__contact">
          <h3>{footer.contactTitle}</h3>
          <p>{footer.contactBody}</p>
          <Link href={footer.contactHref} className="site-footer__contact-link">
            {footer.contactAction} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>

      <div className="shell site-footer__bottom">
        <span>© {new Date().getFullYear()} {brand.legalName}</span>
        <span>{footer.bottomTagline}</span>
        <Link href="/#top">{footer.backToTopLabel} <span aria-hidden="true">↑</span></Link>
      </div>
    </footer>
  );
}
