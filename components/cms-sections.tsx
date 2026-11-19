/* eslint-disable @next/next/no-img-element -- client-uploaded images and logos of any size */
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { PublicInsight, PublicPartner, PublicTeamMember, PublicTestimonial } from "@/lib/cms/public";

/**
 * Website sections fed by the CMS lists (Testimonials, Partners & clients, Team, Blog).
 * Each renders nothing until something has been published, so the site never shows empty or invented content.
 */

function Kicker({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={`section-kicker${light ? " section-kicker--light" : ""}`}><span>{children}</span><span className="section-kicker__rule" /></p>;
}

export function TestimonialsSection({ items, title = "In their", accent = "own words." }: { items: PublicTestimonial[]; title?: string; accent?: string }) {
  if (!items.length) return null;
  return (
    <section className="cms-testimonials section-pad" aria-labelledby="testimonials-title">
      <div className="shell">
        <ScrollReveal className="cms-section-head">
          <Kicker light>What clients say</Kicker>
          <h2 id="testimonials-title">{title} <em>{accent}</em></h2>
        </ScrollReveal>
        <div className={`cms-testimonials__grid cms-testimonials__grid--${Math.min(items.length, 3)}`}>
          {items.map((item, index) => (
            <ScrollReveal as="figure" className="cms-testimonial" key={item.id} delay={index * 80}>
              <span className="cms-testimonial__mark" aria-hidden="true">“</span>
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                {item.photo ? <img src={item.photo} alt={item.photoAlt || ""} loading="lazy" /> : <span className="cms-testimonial__initial" aria-hidden="true">{item.name.slice(0, 1)}</span>}
                <span><strong>{item.name}</strong>{(item.role || item.company) && <small>{[item.role, item.company].filter(Boolean).join(", ")}</small>}</span>
              </figcaption>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnersStrip({ items, label = "Trusted by" }: { items: PublicPartner[]; label?: string }) {
  if (!items.length) return null;
  return (
    <section className="cms-partners" aria-label={label}>
      <div className="shell cms-partners__inner">
        <p className="cms-partners__label">{label}</p>
        <ul className="cms-partners__list">
          {items.map((item) => (
            <li key={item.id}>
              {item.website
                ? <a href={item.website} target="_blank" rel="noopener noreferrer" title={item.name}><img src={item.logo} alt={item.name} loading="lazy" /></a>
                : <img src={item.logo} alt={item.name} title={item.name} loading="lazy" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TeamSection({ items }: { items: PublicTeamMember[] }) {
  if (!items.length) return null;
  return (
    <section className="cms-team section-pad" id="team" aria-labelledby="team-title">
      <div className="shell">
        <ScrollReveal className="cms-section-head">
          <Kicker>Our people</Kicker>
          <h2 id="team-title">The team <em>behind the work.</em></h2>
        </ScrollReveal>
        <div className="cms-team__grid">
          {items.map((member, index) => (
            <ScrollReveal as="article" className="cms-team-card" key={member.id} delay={index * 70}>
              <div className="cms-team-card__photo">
                {member.photo ? <img src={member.photo} alt={member.photoAlt || member.name} loading="lazy" /> : <span aria-hidden="true">{member.name.slice(0, 1)}</span>}
              </div>
              <h3>{member.name}</h3>
              <p className="cms-team-card__role">{member.role}</p>
              {member.bio && <p className="cms-team-card__bio">{member.bio}</p>}
              {(member.linkedin || member.email) && (
                <p className="cms-team-card__links">
                  {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}
                  {member.email && <a href={`mailto:${member.email}`}>Email</a>}
                </p>
              )}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LatestArticles({ items }: { items: PublicInsight[] }) {
  if (!items.length) return null;
  return (
    <section className="cms-latest section-pad" id="insights" aria-labelledby="latest-title">
      <div className="shell">
        <ScrollReveal className="cms-section-head cms-section-head--split">
          <div>
            <Kicker>From the blog</Kicker>
            <h2 id="latest-title">Ideas for <em>the work ahead.</em></h2>
          </div>
          <Link className="text-link" href="/insights">All articles <span aria-hidden="true">→</span></Link>
        </ScrollReveal>
        <div className="insight-card-grid">
          {items.map((insight, index) => (
            <ScrollReveal as="article" className="insight-card card-clickable" key={insight.slug} delay={index * 80}>
              <div className="insight-card__image">
                <img src={insight.image} alt="" loading="lazy" />
                <span className="insight-card__number">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="insight-card__meta">{insight.topic && <span>{insight.topic}</span>}<span>{insight.readTime}</span></div>
              <h3><Link className="card-clickable__link" href={`/insights/${insight.slug}`}>{insight.title}</Link></h3>
              <p>{insight.excerpt}</p>
              <span className="insight-card__link" aria-hidden="true">Read the article <span>→</span></span>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
