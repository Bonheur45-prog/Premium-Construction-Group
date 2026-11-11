import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ContactEnquiryForm } from "@/components/contact-enquiry-form";
import { ReservationBookingForm } from "@/components/reservation-booking-form";
import { reservationSystemConfigured } from "@/lib/reservations/email";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Start a conversation with Premium Construction Group about the place you want to build.",
};

export const dynamic = "force-dynamic";

const nextSteps = [
  {
    number: "01",
    title: "Tell us what you have in mind",
    text: "A few details are enough to help us understand where you are starting from.",
  },
  {
    number: "02",
    title: "We take the time to listen",
    text: "We’ll look over your brief and get back to you to learn more about the project.",
  },
  {
    number: "03",
    title: "We shape the next steps together",
    text: "When the fit is right, we’ll talk through a clear way forward.",
  },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="contact-page">
        <section className="contact-hero shell" aria-labelledby="contact-title">
          <div className="contact-hero__copy">
            <p className="eyebrow"><span /> Reach out</p>
            <h1 id="contact-title">Let&apos;s talk about<br /><em>what comes next.</em></h1>
            <p className="contact-hero__intro">
              A good project begins with a conversation. Tell us a little about
              what you&apos;re planning and we&apos;ll take it from there.
            </p>
            <a className="button button--primary contact-hero__reserve" href="#reserve">
              Reserve a meeting <span aria-hidden="true">↓</span>
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
                  <p className="section-kicker"><span>Start a conversation</span><span className="section-kicker__rule" /></p>
                  <h2>Tell us about<br /><em>your project.</em></h2>
                </div>
                <span className="contact-form-card__index">01 <i>/ 02</i></span>
              </div>
              <ContactEnquiryForm />
            </div>

            <aside className="contact-next" aria-labelledby="contact-next-title">
              <div className="contact-next__topline"><span /> A thoughtful start</div>
              <h2 id="contact-next-title">Good work starts with <em>good questions.</em></h2>
              <p className="contact-next__intro">
                Every project is different. We&apos;ll begin by understanding what matters to you.
              </p>
              <div className="contact-next__steps">
                {nextSteps.map((step) => (
                  <article className="contact-next__step" key={step.number}>
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
                <span>Considered construction.<br />Enduring value.</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="reservation-section" id="reserve" aria-labelledby="reservation-title">
          <div className="shell reservation-section__grid">
            <div className="reservation-section__intro">
              <p className="section-kicker"><span>Reserve a meeting</span><span className="section-kicker__rule" /></p>
              <h2 id="reservation-title">Make time for<br /><em>your next step.</em></h2>
              <p>
                Choose a time to meet with a Premium Construction Group expert.
                We&apos;ll send a confirmation as soon as your reservation is saved.
              </p>
              <div className="reservation-section__facts">
                <span><strong>60</strong> minutes</span>
                <i />
                <span>Weekdays</span>
                <i />
                <span>SAST</span>
              </div>
              <a className="reservation-section__jump" href="#meeting-form">Choose a meeting time <span aria-hidden="true">↓</span></a>
            </div>
            <div className="booking-card" id="meeting-form">
              <div className="booking-card__header">
                <div><span className="booking-card__step">01 / Schedule</span><h3>Book a conversation.</h3></div>
                <span className="booking-card__symbol" aria-hidden="true">↗</span>
              </div>
              <ReservationBookingForm enabled={reservationSystemConfigured()} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
