import "server-only";

import { randomUUID } from "node:crypto";
import { pgQuery } from "@/lib/db/postgres";
import { getFeatures } from "@/lib/features";
import { postSystemMessage } from "@/lib/portal/chat";
import { filesByIds, type PortalFileItem } from "@/lib/portal/files";
import { publishBoth } from "@/lib/portal/realtime";
import { HttpError } from "@/lib/server/http";

/**
 * Project progress for active clients: milestones with dates, site photos and comments.
 * Progress is worked out from the milestones (each can weigh more than others); in-progress counts half.
 */
import { progressOf, type ClientProject, type Milestone, type MilestoneStatus, type ProjectStatus } from "@/lib/portal/projects-shared";

export { progressOf };
export type { ClientProject, Milestone, MilestoneStatus, ProjectStatus };

type ProjectRow = { id: string; client_id: string; title: string; location: string; summary: string; status: ProjectStatus; start_date: string | null; target_date: string | null; cover_file_id: string; created_at: Date; updated_at: Date };
type MilestoneRow = { id: string; project_id: string; title: string; description: string; due_date: string | null; status: MilestoneStatus; weight: number; photo_ids: string[]; sort_order: number; completed_at: Date | null };
type CommentRow = { id: string; milestone_id: string; author_type: "client" | "staff"; author_name: string; body: string; created_at: Date };

const day = (value: Date | string | null) => (!value ? null : typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10));
const date = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
const words = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);


export async function listProjects({ clientId }: { clientId?: string }): Promise<ClientProject[]> {
  const projects = await pgQuery<ProjectRow & { client_name: string }>(
    `SELECT p.*, cl.name AS client_name FROM pcg_client_projects p JOIN pcg_clients cl ON cl.id = p.client_id ${clientId ? "WHERE p.client_id = $1" : ""} ORDER BY (p.status = 'completed'), p.updated_at DESC`,
    clientId ? [clientId] : [],
  );
  if (!projects.rows.length) return [];
  const ids = projects.rows.map((row) => row.id);
  const milestones = await pgQuery<MilestoneRow>("SELECT * FROM pcg_milestones WHERE project_id = ANY($1) ORDER BY sort_order, created_at", [ids]);
  const comments = await pgQuery<CommentRow>("SELECT * FROM pcg_milestone_comments WHERE milestone_id = ANY($1) ORDER BY created_at", [milestones.rows.map((row) => row.id)]);
  const result: ClientProject[] = [];
  for (const project of projects.rows) {
    const own = milestones.rows.filter((row) => row.project_id === project.id);
    const photoIds = [...new Set([...own.flatMap((row) => row.photo_ids), project.cover_file_id].filter(Boolean))];
    const files = new Map((await filesByIds(photoIds, project.client_id)).map((file) => [file.id, file]));
    const list: Milestone[] = own.map((row) => ({
      id: row.id, title: row.title, description: row.description, dueDate: day(row.due_date), status: row.status, weight: row.weight, completedAt: row.completed_at?.toISOString() || null,
      photos: row.photo_ids.map((id) => files.get(id)).filter((file): file is PortalFileItem => Boolean(file)),
      comments: comments.rows.filter((comment) => comment.milestone_id === row.id).map((comment) => ({ id: comment.id, authorType: comment.author_type, authorName: comment.author_name, body: comment.body, createdAt: comment.created_at.toISOString() })),
    }));
    result.push({
      id: project.id, clientId: project.client_id, clientName: project.client_name, title: project.title, location: project.location, summary: project.summary, status: project.status,
      startDate: day(project.start_date), targetDate: day(project.target_date), progress: project.status === "completed" ? 100 : progressOf(list),
      cover: files.get(project.cover_file_id) || list.flatMap((item) => item.photos).at(-1) || null, milestones: list, updatedAt: project.updated_at.toISOString(),
    });
  }
  return result;
}

async function projectRow(id: string) {
  const result = await pgQuery<ProjectRow>("SELECT * FROM pcg_client_projects WHERE id = $1", [id]);
  if (!result.rows[0]) throw new HttpError(404, "Project not found.");
  return result.rows[0];
}

const touch = (id: string) => pgQuery("UPDATE pcg_client_projects SET updated_at = NOW() WHERE id = $1", [id]);

export async function saveProject(input: { id?: unknown; clientId?: unknown; title?: unknown; location?: unknown; summary?: unknown; status?: unknown; startDate?: unknown; targetDate?: unknown; coverFileId?: unknown }) {
  if (!(await getFeatures()).progress.enabled) throw new HttpError(404, "Project progress is switched off.");
  const title = words(input.title, 140);
  if (title.length < 3) throw new HttpError(400, "Give the project a name.");
  const status: ProjectStatus = ["planning", "active", "on_hold", "completed"].includes(String(input.status)) ? (input.status as ProjectStatus) : "planning";
  const values = [title, words(input.location, 120), String(input.summary ?? "").trim().slice(0, 1500), status, date(input.startDate), date(input.targetDate), typeof input.coverFileId === "string" ? input.coverFileId : ""];
  if (typeof input.id === "string" && input.id) {
    const row = await projectRow(input.id);
    await pgQuery("UPDATE pcg_client_projects SET title=$2, location=$3, summary=$4, status=$5, start_date=$6, target_date=$7, cover_file_id=$8, updated_at=NOW() WHERE id=$1", [input.id, ...values]);
    publishBoth(row.client_id, { type: "project", projectId: input.id });
    return input.id;
  }
  const clientId = String(input.clientId || "");
  const client = await pgQuery("SELECT id FROM pcg_clients WHERE id = $1", [clientId]);
  if (!client.rows[0]) throw new HttpError(404, "Choose a client.");
  const id = randomUUID();
  await pgQuery("INSERT INTO pcg_client_projects (id, client_id, title, location, summary, status, start_date, target_date, cover_file_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id, clientId, ...values]);
  publishBoth(clientId, { type: "project", projectId: id });
  return id;
}

export async function deleteProject(id: string) {
  const row = await projectRow(id);
  await pgQuery("DELETE FROM pcg_client_projects WHERE id = $1", [id]);
  publishBoth(row.client_id, { type: "project", projectId: id });
}

export async function saveMilestone(projectId: string, input: { id?: unknown; title?: unknown; description?: unknown; dueDate?: unknown; status?: unknown; weight?: unknown; photoIds?: unknown }, origin: string) {
  const project = await projectRow(projectId);
  const title = words(input.title, 140);
  if (title.length < 2) throw new HttpError(400, "Give the milestone a name, for example “Foundations”.");
  const status: MilestoneStatus = ["upcoming", "in_progress", "done"].includes(String(input.status)) ? (input.status as MilestoneStatus) : "upcoming";
  const weight = Math.min(Math.max(Math.round(Number(input.weight) || 1), 1), 10);
  const photoIds = Array.isArray(input.photoIds) ? input.photoIds.filter((id): id is string => typeof id === "string").slice(0, 40) : [];
  const valid = new Set((await filesByIds(photoIds, project.client_id)).map((file) => file.id));
  const photos = photoIds.filter((id) => valid.has(id));
  let id = typeof input.id === "string" && input.id ? input.id : "";
  let becameDone = false;
  if (id) {
    const before = await pgQuery<{ status: MilestoneStatus }>("SELECT status FROM pcg_milestones WHERE id = $1 AND project_id = $2", [id, projectId]);
    if (!before.rows[0]) throw new HttpError(404, "Milestone not found.");
    becameDone = before.rows[0].status !== "done" && status === "done";
    await pgQuery(
      `UPDATE pcg_milestones SET title=$3, description=$4, due_date=$5, status=$6, weight=$7, photo_ids=$8,
        completed_at = CASE WHEN $6 = 'done' THEN COALESCE(completed_at, NOW()) ELSE NULL END WHERE id=$1 AND project_id=$2`,
      [id, projectId, title, String(input.description ?? "").trim().slice(0, 2000), date(input.dueDate), status, weight, JSON.stringify(photos)],
    );
  } else {
    id = randomUUID();
    becameDone = status === "done";
    const order = await pgQuery<{ next: number }>("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pcg_milestones WHERE project_id = $1", [projectId]);
    await pgQuery(
      "INSERT INTO pcg_milestones (id, project_id, title, description, due_date, status, weight, photo_ids, sort_order, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $6 = 'done' THEN NOW() END)",
      [id, projectId, title, String(input.description ?? "").trim().slice(0, 2000), date(input.dueDate), status, weight, JSON.stringify(photos), order.rows[0].next],
    );
  }
  await touch(projectId);
  if (becameDone) {
    await postSystemMessage(project.client_id, { kind: "milestone", body: `Milestone completed: ${title} — ${project.title}`, meta: { projectId, milestoneId: id, title, project: project.title, photos: photos.length }, origin, subject: project.title }).catch(() => undefined);
  }
  publishBoth(project.client_id, { type: "project", projectId });
  return id;
}

export async function deleteMilestone(projectId: string, milestoneId: string) {
  const project = await projectRow(projectId);
  await pgQuery("DELETE FROM pcg_milestones WHERE id = $1 AND project_id = $2", [milestoneId, projectId]);
  await touch(projectId);
  publishBoth(project.client_id, { type: "project", projectId });
}

export async function reorderMilestones(projectId: string, ids: unknown) {
  const project = await projectRow(projectId);
  if (!Array.isArray(ids)) return;
  for (const [index, id] of ids.entries()) if (typeof id === "string") await pgQuery("UPDATE pcg_milestones SET sort_order = $3 WHERE id = $1 AND project_id = $2", [id, projectId, index + 1]);
  publishBoth(project.client_id, { type: "project", projectId });
}

export async function addMilestoneComment(milestoneId: string, author: { type: "client" | "staff"; name: string; clientId?: string }, body: unknown) {
  const features = await getFeatures();
  if (author.type === "client" && !features.progress.clientComments) throw new HttpError(403, "Comments are switched off.");
  const owner = await pgQuery<{ client_id: string; project_id: string }>("SELECT p.client_id, p.id AS project_id FROM pcg_milestones m JOIN pcg_client_projects p ON p.id = m.project_id WHERE m.id = $1", [milestoneId]);
  const row = owner.rows[0];
  if (!row || (author.clientId && author.clientId !== row.client_id)) throw new HttpError(404, "Milestone not found.");
  const text = String(body ?? "").trim().slice(0, 2000);
  if (!text) throw new HttpError(400, "Write a comment.");
  await pgQuery("INSERT INTO pcg_milestone_comments (id, milestone_id, author_type, author_name, body) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), milestoneId, author.type, author.name.slice(0, 80), text]);
  publishBoth(row.client_id, { type: "project", projectId: row.project_id });
}
