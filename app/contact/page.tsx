import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { ContactEnquiryForm } from "@/components/contact-enquiry-form";
import { ReservationBookingForm } from "@/components/reservation-booking-form";
import { reservationSystemConfigured } from "@/lib/reservations/email";
import { getSiteContent } from "@/lib/site-content/store";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Start a conversation with Premium Construction Group about the place you want to build.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  await connection();
  const { hero, enquiry, next, reservation } = getSiteContent().contact;
  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="contact-page">
        <section className="contact-hero shell" aria-labelledby="contact-title">
          <div className="contact-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="contact-title">{hero.title}<br /><em>{hero.accent}</em></h1>
            <p className="contact-hero__intro">{hero.intro}</p>
            <a className="button button--primary contact-hero__reserve" href="#reserve">
              {hero.reserveLabel} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="contact-hero__aside" aria-hidden="true">
            <span className="contact-hero__aside-index">PCG / CONTACT</span>
            <span className="contact-hero__aside-mark">Let&apos;s<br />build<br /><em>well.</em></span>
            <span className="contact-hero__aside-line" />
          </div>
        </section>

        <section className="contact-section" aria-label="Send us a project enquiry">
          <div className="shell contact-grid">
            <div className="contact-form-card">
              <div className="contact-form-card__heading">
                <div>
                  <p className="section-kicker"><span>{enquiry.kicker}</span><span className="section-kicker__rule" /></p>
                  <h2>{enquiry.title}<br /><em>{enquiry.accent}</em></h2>
                </div>
                <span className="contact-form-card__index">{enquiry.index.slice(0, 2)} <i>/ {enquiry.index.slice(-2)}</i></span>
              </div>
              <ContactEnquiryForm />
            </div>

            <aside className="contact-next" aria-labelledby="contact-next-title">
              <div className="contact-next__topline"><span /> {next.topline}</div>
              <h2 id="contact-next-title">{next.title} <em>{next.accent}</em></h2>
              <p className="contact-next__intro">{next.intro}</p>
              <div className="contact-next__steps">
                {next.steps.map((step, index) => (
                  <article className="contact-next__step" key={`${step.number}-${index}`}>
                    <span className="contact-next__number">{step.number}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="contact-next__foot">
                <span className="contact-next__foot-mark" aria-hidden="true">PCG<span>.</span></span>
                <span>{next.closingLine}<br />{next.closingAccent}</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="reservation-section" id="reserve" aria-labelledby="reservation-title">
          <div className="shell reservation-section__grid">
            <div className="reservation-section__intro">
              <p className="section-kicker"><span>{reservation.kicker}</span><span className="section-kicker__rule" /></p>
              <h2 id="reservation-title">{reservation.title}<br /><em>{reservation.accent}</em></h2>
              <p>{reservation.intro}</p>
              <div className="reservation-section__facts">
                <span><strong>{reservation.duration}</strong> {reservation.durationLabel}</span>
                <i />
                <span>{reservation.daysLabel}</span>
                <i />
                <span>{reservation.timezone}</span>
              </div>
              <a className="reservation-section__jump" href="#meeting-form">{reservation.jumpLabel} <span aria-hidden="true">↓</span></a>
            </div>
            <div className="booking-card" id="meeting-form">
              <div className="booking-card__header">
                <div><span className="booking-card__step">{reservation.step}</span><h3>{reservation.cardTitle}</h3></div>
                <span className="booking-card__symbol" aria-hidden="true">↗</span>
              </div>
              <ReservationBookingForm enabled={reservationSystemConfigured()} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
