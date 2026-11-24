import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/portal/print-button";
import { QuoteDocument } from "@/components/portal/quote-document";
import { companyDetails } from "@/lib/portal/company";
import { getQuote } from "@/lib/portal/quotes";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/reservations/auth";
import "@/app/account/space.css";

export const metadata: Metadata = { title: "Quote", robots: { index: false, follow: false } };

/** Print-ready copy of a quote for the team (the latest revision, as the client sees it). */
export default async function AdminPrintQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (!(await verifyAdminSessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value))) redirect("/admin");
  const { id } = await params;
  const quote = await getQuote(id, { forStaff: true }).catch(() => null);
  if (!quote) notFound();
  return (
    <main className="qprint cms" style={{ background: "#fff", minHeight: "100vh" }}>
      <div className="qprint__bar"><span>{quote.ref} · {quote.status === "draft" ? "DRAFT — not sent" : quote.status}</span><PrintButton /></div>
      <QuoteDocument quote={quote} revision={quote.revisions[0]} company={await companyDetails()} />
    </main>
  );
}
