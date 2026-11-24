import { notFound } from "next/navigation";
import { QuotesList } from "@/components/portal/quotes-view";
import { getFeatures } from "@/lib/features";

export const metadata = { title: "Quotes" };

export default async function QuotesPage() {
  if (!(await getFeatures()).quotes.enabled) notFound();
  return <QuotesList />;
}
