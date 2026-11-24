import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminWorkspace } from "@/components/admin-workspace";
import { adminPortalContext } from "@/lib/portal/admin-context";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

/** Opens one conversation directly (links in alerts and emails to the team). */
export default async function AdminConversationPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return <AdminWorkspace initialTab="messages" entryId={id} portal={await adminPortalContext()} />;
}
