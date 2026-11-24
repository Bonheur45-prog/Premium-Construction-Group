import { notFound, redirect } from "next/navigation";
import { QuoteView } from "@/components/portal/quotes-view";
import { getCurrentClient } from "@/lib/clients/session";
import { getFeatures } from "@/lib/features";
import { companyDetails } from "@/lib/portal/company";

export const metadata = { title: "Quote" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  if (!(await getFeatures()).quotes.enabled) notFound();
  const { id } = await params;
  return <QuoteView id={id} company={await companyDetails()} clientName={client.name} />;
}
