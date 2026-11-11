import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin-workspace";

export const metadata: Metadata = {
  title: "CMS Users",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return <AdminWorkspace initialTab="users" />;
}
