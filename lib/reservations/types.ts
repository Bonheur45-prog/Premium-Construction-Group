export type ReservationStatus = "confirmed" | "cancelled";

export type Reservation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  enquiryType: "personal" | "company";
  company: string;
  projectType: string;
  message: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: ReservationStatus;
  customerEmailSent: boolean;
  adminEmailSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReservationInput = Pick<
  Reservation,
  "name" | "email" | "phone" | "enquiryType" | "company" | "projectType" | "message" | "date" | "time"
>;

export const PROJECT_TYPES = [
  "New build",
  "Renovation or extension",
  "Design coordination",
  "Project management",
  "Construction delivery",
  "Something else",
] as const;
