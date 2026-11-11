import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin-workspace";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function ReservationsAdminPage() {
  return <AdminWorkspace initialTab="reservations" />;
}
