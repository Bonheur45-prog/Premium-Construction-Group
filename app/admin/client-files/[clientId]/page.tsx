import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminWorkspace } from "@/components/admin-workspace";
import { adminPortalContext } from "@/lib/portal/admin-context";

export const metadata: Metadata = { title: "Client files", robots: { index: false, follow: false } };

/** One client's file space, as the team sees it (upload into it, see versions, open anything). */
export default async function AdminClientFilesPage({ params }: { params: Promise<{ clientId: string }> }) {
  await connection();
  const { clientId } = await params;
  return <AdminWorkspace initialTab="client-files" portal={await adminPortalContext({ clientId })} />;
}
