import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin-workspace";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminWorkspace initialTab="projects" />;
}
