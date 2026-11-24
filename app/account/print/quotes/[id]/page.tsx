import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/portal/print-button";
import { QuoteDocument } from "@/components/portal/quote-document";
import { getCurrentClient } from "@/lib/clients/session";
import { getFeatures } from "@/lib/features";
import { companyDetails } from "@/lib/portal/company";
import { getQuote } from "@/lib/portal/quotes";

export const metadata = { title: "Quote" };

/** A clean, print-ready copy of a quote — the browser's “Save as PDF” turns it into a PDF file. */
export default async function PrintQuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ revision?: string }> }) {
  await connection();
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  if (!(await getFeatures()).quotes.enabled) notFound();
  const { id } = await params;
  const { revision } = await searchParams;
  const quote = await getQuote(id, { clientId: client.id, forStaff: false }).catch(() => null);
  if (!quote) notFound();
  const chosen = quote.revisions.find((item) => String(item.revision) === revision) || quote.revisions[0];
  return (
    <main className="qprint">
      <div className="qprint__bar"><span>{quote.ref}</span><PrintButton /></div>
      <QuoteDocument quote={quote} revision={chosen} company={await companyDetails()} />
    </main>
  );
}
