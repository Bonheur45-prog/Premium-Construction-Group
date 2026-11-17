import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ReservationBookingForm } from "@/components/reservation-booking-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getSiteContent } from "@/lib/site-content/store";
import { reservationSystemConfigured } from "@/lib/reservations/email";
import { getReservationSettings } from "@/lib/reservations/settings";
import { getManagedPageMetadata } from "@/lib/site-content/metadata";

export async function generateMetadata(): Promise<Metadata> { return getManagedPageMetadata("reservations"); }

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={diagonal ? "arrow-icon arrow-icon--diagonal" : "arrow-icon"}
      fill="none"
    >
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3 10h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

export default async function ReservationsPage() {
  await connection();
  const { hero, booking, preparation, closing } = (await getSiteContent()).reservations;
  const schedule = await getReservationSettings();
  const enabled = await reservationSystemConfigured();

  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="reservations-page">
        <section className="reservations-hero shell" id="top" aria-labelledby="reservations-title">
          <div className="reservations-hero__copy">
            <p className="eyebrow"><span /> {hero.eyebrow}</p>
            <h1 id="reservations-title">{hero.title}<em>{hero.accent}</em></h1>
            <p className="reservations-hero__intro">{hero.intro}</p>
            <div className="reservations-hero__actions">
              <Link className="button button--primary" href={hero.primaryHref}>{hero.primaryLabel} <Arrow diagonal /></Link>
              <Link className="text-link" href={hero.secondaryHref}>{hero.secondaryLabel} <Arrow /></Link>
            </div>
          </div>
          <div className="reservations-hero__visual">
            <Image src={hero.image} alt={hero.imageAlt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 52vw" />
            <div className="reservations-hero__image-label"><span>{hero.imageLabel}</span><span>PCG / {hero.index}</span></div>
            <div className="reservations-hero__note"><span>{hero.noteLabel}</span><strong>{hero.noteText}</strong></div>
          </div>
          <div className="reservations-hero__index">{hero.index} <span>/ A useful first step</span></div>
        </section>

        <section className="reservation-section reservations-booking" id="reservation-booking" aria-labelledby="reservation-title">
          <div className="shell reservation-section__grid">
            <div className="reservation-section__intro">
              <p className="section-kicker"><span>{booking.kicker}</span><span className="section-kicker__rule" /></p>
              <h2 id="reservation-title">{booking.title}<br /><em>{booking.accent}</em></h2>
              <p>{booking.intro}</p>
              <div className="reservation-section__facts">
                <span><strong>{booking.duration}</strong> {booking.durationLabel}</span>
                <i />
                <span>{schedule.daysLabel}</span>
                <i />
                <span>{booking.timezone}</span>
              </div>
              <p className="reservations-booking__hours">Meeting times: <strong>{schedule.hoursLabel}</strong></p>
              <Link className="reservation-section__jump" href="/contact">Prefer to send a project enquiry? <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="booking-card" id="meeting-form">
              <div className="booking-card__header">
                <div><span className="booking-card__step">{booking.step}</span><h3>{booking.cardTitle}</h3></div>
                <span className="booking-card__symbol" aria-hidden="true">↗</span>
              </div>
              <ReservationBookingForm enabled={enabled} windowDays={booking.windowDays} durationMinutes={booking.duration} daysLabel={schedule.daysLabel} hoursLabel={schedule.hoursLabel} timezoneLabel={booking.timezone} />
            </div>
          </div>
        </section>

        <section className="reservation-preparation section-pad" aria-labelledby="reservation-preparation-title">
          <div className="shell">
            <div className="reservation-preparation__heading">
              <div>
                <p className="section-kicker section-kicker--light"><span>{preparation.kicker}</span><span className="section-kicker__rule" /></p>
                <h2 id="reservation-preparation-title">{preparation.title}<br /><em>{preparation.accent}</em></h2>
              </div>
              <p>{preparation.intro}</p>
            </div>
            <div className="reservation-preparation__grid">
              {preparation.steps.map((step, index) => (
                <article key={`${step.number}-${index}`}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-cta shell reservations-cta">
          <div className="closing-cta__mark" aria-hidden="true">PCG<span>.</span></div>
          <div className="closing-cta__copy">
            <p className="eyebrow"><span /> {closing.eyebrow}</p>
            <h2>{closing.title}<br />{closing.accent}</h2>
            <p>{closing.body}</p>
          </div>
          <Link className="button button--dark" href={closing.href}>{closing.action} <Arrow diagonal /></Link>
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
