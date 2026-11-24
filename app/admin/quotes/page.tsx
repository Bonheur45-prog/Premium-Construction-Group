import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminWorkspace } from "@/components/admin-workspace";
import { adminPortalContext } from "@/lib/portal/admin-context";

export const metadata: Metadata = { title: "Quotes", robots: { index: false, follow: false } };

export default async function AdminPage() {
  await connection();
  return <AdminWorkspace initialTab="quotes" portal={await adminPortalContext()} />;
}
