/** Shared by the client portal and the CMS (safe to import in browser code). */

export const REQUEST_STATUS_FLOW = [
  { id: "received", label: "Received", client: "We have your request and will review it shortly." },
  { id: "reviewing", label: "Under review", client: "Our team is studying your brief and may ask a few questions." },
  { id: "site_visit", label: "Site visit", client: "We're arranging or carrying out a visit to the site." },
  { id: "quote_sent", label: "Quote sent", client: "Your proposal is ready. Look for it in the documents below." },
  { id: "approved", label: "Approved", client: "The proposal is approved and we're preparing to start." },
  { id: "in_progress", label: "In progress", client: "Work is under way. Updates and photos will appear here." },
  { id: "completed", label: "Completed", client: "The work is complete. Thank you for building with us." },
] as const;

export const REQUEST_SIDE_STATUSES = [
  { id: "on_hold", label: "On hold", client: "This request is paused for now. We'll update you when it resumes." },
  { id: "closed", label: "Closed", client: "This request is closed." },
] as const;

export type RequestStatus = (typeof REQUEST_STATUS_FLOW)[number]["id"] | (typeof REQUEST_SIDE_STATUSES)[number]["id"];
export const ALL_REQUEST_STATUSES = [...REQUEST_STATUS_FLOW, ...REQUEST_SIDE_STATUSES];
export const STATUS_LABEL = Object.fromEntries(ALL_REQUEST_STATUSES.map((status) => [status.id, status.label])) as Record<RequestStatus, string>;
export const STATUS_CLIENT_TEXT = Object.fromEntries(ALL_REQUEST_STATUSES.map((status) => [status.id, status.client])) as Record<RequestStatus, string>;
export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && value in STATUS_LABEL;
}
export function statusStep(status: RequestStatus) {
  return REQUEST_STATUS_FLOW.findIndex((step) => step.id === status);
}

export const REQUEST_CATEGORIES = [
  { id: "new_build", label: "New build" },
  { id: "renovation", label: "Renovation or extension" },
  { id: "design", label: "Design coordination" },
  { id: "management", label: "Project management" },
  { id: "quote", label: "Quotation" },
  { id: "site_visit", label: "Site visit or inspection" },
  { id: "maintenance", label: "Maintenance or repairs" },
  { id: "other", label: "Something else" },
] as const;
export const CATEGORY_LABEL = Object.fromEntries(REQUEST_CATEGORIES.map((category) => [category.id, category.label])) as Record<string, string>;

export const BUDGET_RANGES = ["Not sure yet", "Under RWF 20M", "RWF 20M – 50M", "RWF 50M – 150M", "RWF 150M – 500M", "Over RWF 500M"] as const;
export const TIMELINES = ["As soon as possible", "Within 3 months", "3 – 6 months", "6 – 12 months", "More than a year", "Flexible"] as const;

export const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
] as const;
export type RequestPriority = (typeof PRIORITIES)[number]["id"];

export const FILE_CATEGORIES = [
  { id: "drawings", label: "Drawings & plans" },
  { id: "photos", label: "Site photos" },
  { id: "quote", label: "Quotation" },
  { id: "invoice", label: "Invoice" },
  { id: "contract", label: "Contract" },
  { id: "permit", label: "Permits & approvals" },
  { id: "report", label: "Report" },
  { id: "other", label: "Other" },
] as const;
export const FILE_CATEGORY_LABEL = Object.fromEntries(FILE_CATEGORIES.map((category) => [category.id, category.label])) as Record<string, string>;
/** Categories a client may choose when uploading (quotes, invoices and contracts come from the company). */
export const CLIENT_FILE_CATEGORIES = ["drawings", "photos", "permit", "report", "other"] as const;

/** Business documents accepted in the portal. */
export const PORTAL_FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf,.zip";
export const PORTAL_FILE_MAX_MB = 25;

export type PortalEvent = {
  id: string;
  kind: "message" | "update" | "note" | "status" | "file" | "system";
  authorType: "client" | "staff" | "system";
  authorName: string;
  body: string;
  visibility: "client" | "internal";
  meta: { from?: string; to?: string; fileIds?: string[]; progress?: number };
  createdAt: string;
};

export type PortalFile = {
  id: string;
  eventId: string;
  uploadedByType: "client" | "staff";
  uploadedByName: string;
  category: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  visibility: "client" | "internal";
  createdAt: string;
};

export type PortalRequestSummary = {
  id: string;
  ref: string;
  title: string;
  category: string;
  status: RequestStatus;
  progress: number;
  location: string;
  createdAt: string;
  updatedAt: string;
  unread: number;
  lastActivity: string;
};

export type PortalRequestDetail = PortalRequestSummary & {
  description: string;
  budget: string;
  timeline: string;
  priority: RequestPriority;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string;
  clientId: string | null;
  assignedTo: string;
  source: string;
  events: PortalEvent[];
  files: PortalFile[];
};
