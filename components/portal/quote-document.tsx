import { Fragment } from "react";
import type { QuoteDetail, QuoteRevision } from "@/lib/portal/quotes";

/**
 * A quote or change order laid out as a document — shared by the client page, the staff editor
 * preview and the print / save-as-PDF page.
 */
export const quoteMoney = (value: number, currency: string) => `${currency} ${Math.round(value).toLocaleString("en-US")}`;
export const QUOTE_STATUS: Record<QuoteDetail["status"], string> = {
  draft: "Draft", sent: "Awaiting your answer", accepted: "Accepted & signed", changes_requested: "Changes requested", declined: "Declined", withdrawn: "Withdrawn",
};
export const QUOTE_STATUS_STAFF: Record<QuoteDetail["status"], string> = {
  draft: "Draft", sent: "Sent — waiting for client", accepted: "Accepted & signed", changes_requested: "Client asked for changes", declined: "Declined", withdrawn: "Withdrawn",
};
/** Calendar dates ("2026-12-31") are shown as that day everywhere, whatever the viewer's time zone. */
export const calendarDate = (value: string | null, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value).toLocaleDateString("en-GB", { ...options, timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : "Africa/Kigali" }) : "";
const longDate = (iso: string | null) => calendarDate(iso);

export function QuoteDocument({ quote, revision, company }: { quote: Pick<QuoteDetail, "ref" | "kind" | "title" | "currency" | "clientName" | "clientCompany" | "clientEmail">; revision: QuoteRevision; company: { name: string; email: string; phone: string; address: string } }) {
  const sections = [...new Set(revision.items.map((item) => item.section))];
  return (
    <article className="qdoc">
      <header className="qdoc__head">
        <div>
          <p className="qdoc__kind">{quote.kind === "quote" ? "Quotation" : "Change order"}</p>
          <h2>{quote.title}</h2>
        </div>
        <dl className="qdoc__meta">
          <div><dt>Reference</dt><dd>{quote.ref}{revision.revision > 1 ? ` · rev. ${revision.revision}` : ""}</dd></div>
          {revision.sentAt && <div><dt>Issued</dt><dd>{longDate(revision.sentAt)}</dd></div>}
          {revision.validUntil && <div><dt>Valid until</dt><dd>{longDate(revision.validUntil)}</dd></div>}
        </dl>
      </header>
      <div className="qdoc__parties">
        <div><span>From</span><strong>{company.name}</strong><small>{[company.email, company.phone].filter(Boolean).join(" · ")}</small>{company.address && <small>{company.address}</small>}</div>
        <div><span>For</span><strong>{quote.clientName}</strong>{quote.clientCompany && <small>{quote.clientCompany}</small>}<small>{quote.clientEmail}</small></div>
      </div>
      <table className="qdoc__table">
        <thead><tr><th>Description</th><th className="num">Qty</th><th>Unit</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section || "main"}>
              {section && <tr className="qdoc__section"><td colSpan={5}>{section}</td></tr>}
              {revision.items.filter((item) => item.section === section).map((item, index) => (
                <tr key={`${section}-${index}`}>
                  <td>{item.description}</td>
                  <td className="num">{item.quantity.toLocaleString("en-US")}</td>
                  <td>{item.unit}</td>
                  <td className="num">{Math.round(item.unitPrice).toLocaleString("en-US")}</td>
                  <td className="num">{Math.round(item.quantity * item.unitPrice).toLocaleString("en-US")}</td>
                </tr>
              ))}
            </Fragment>
          ))}
          {!revision.items.length && <tr><td colSpan={5} className="qdoc__empty">No lines yet.</td></tr>}
        </tbody>
        <tfoot>
          <tr><td colSpan={4}>Subtotal</td><td className="num">{quoteMoney(revision.subtotal, quote.currency)}</td></tr>
          <tr><td colSpan={4}>VAT ({revision.vatRate}%)</td><td className="num">{quoteMoney(revision.vat, quote.currency)}</td></tr>
          <tr className="qdoc__total"><td colSpan={4}>Total</td><td className="num">{quoteMoney(revision.total, quote.currency)}</td></tr>
        </tfoot>
      </table>
      {revision.notes && <div className="qdoc__notes"><span>Notes & conditions</span><p>{revision.notes}</p></div>}
      {revision.response === "accepted" && (
        <div className="qdoc__signed">
          <span className="qdoc__stamp">Accepted</span>
          <div>
            <p className="qdoc__signature">{revision.signedName}</p>
            <small>Signed online on {new Date(revision.respondedAt || "").toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kigali" })} (Kigali time)</small>
            <small className="qdoc__hash">Record fingerprint: {revision.signatureHash.slice(0, 16)}…{revision.signatureHash.slice(-8)}</small>
          </div>
        </div>
      )}
    </article>
  );
}
