import type { Metadata } from "next";
import { AdminReservationsConsole } from "@/components/admin-reservations-console";

export const metadata: Metadata = {
  title: "Reservation Dashboard",
  robots: { index: false, follow: false },
};

export default function ReservationsAdminPage() {
  return <AdminReservationsConsole />;
}
