import { notFound, redirect } from "next/navigation";
import { PortalRequestView } from "@/components/portal/request-view";
import { getCurrentClient } from "@/lib/clients/session";
import { getRequestDetail, markSeen } from "@/lib/requests/store";

export const metadata = { title: "Request" };

export default async function RequestPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ new?: string }> }) {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  if (!client.verified) redirect("/account");
  const { ref } = await params;
  const detail = await getRequestDetail({ ref }, { type: "client", clientId: client.id });
  if (!detail) notFound();
  await markSeen(detail.id, "client");
  return <PortalRequestView initial={detail} justCreated={Boolean((await searchParams).new)} />;
}
