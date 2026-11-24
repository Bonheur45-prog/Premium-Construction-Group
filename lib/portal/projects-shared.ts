import type { PortalFileItem } from "@/lib/portal/files";

/** Types and the progress formula for client projects — shared by the server and the browser. */
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type MilestoneStatus = "upcoming" | "in_progress" | "done";

export type Milestone = {
  id: string; title: string; description: string; dueDate: string | null; status: MilestoneStatus; weight: number; photos: PortalFileItem[]; completedAt: string | null;
  comments: Array<{ id: string; authorType: "client" | "staff"; authorName: string; body: string; createdAt: string }>;
};
export type ClientProject = {
  id: string; clientId: string; clientName: string; title: string; location: string; summary: string; status: ProjectStatus; startDate: string | null; targetDate: string | null;
  progress: number; cover: PortalFileItem | null; milestones: Milestone[]; updatedAt: string;
};


export function progressOf(milestones: Array<Pick<Milestone, "status" | "weight">>) {
  const total = milestones.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return 0;
  const done = milestones.reduce((sum, item) => sum + (item.status === "done" ? item.weight : item.status === "in_progress" ? item.weight / 2 : 0), 0);
  return Math.round((done / total) * 100);
}
