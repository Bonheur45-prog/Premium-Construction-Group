import { requireClient } from "@/lib/clients/guard";
import { BUDGET_RANGES, CATEGORY_LABEL, TIMELINES } from "@/lib/portal/constants";
import { postToRequest } from "@/lib/requests/actions";
import { notifyStaff } from "@/lib/requests/email";
import { filesFromForm, MAX_FILE_BYTES } from "@/lib/requests/files";
import { createRequest, listClientRequests, upcomingMeetingsForEmail } from "@/lib/requests/store";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, HttpError, noStore, publicOrigin } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const client = await requireClient(request);
    const [requests, meetings] = await Promise.all([client.verified ? listClientRequests(client.id) : [], upcomingMeetingsForEmail(client.email)]);
    return Response.json({ client, requests, meetings }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Multipart: category, title, description, location, budget, timeline, file[] (optional). */
export async function POST(request: Request) {
  try {
    const client = await requireClient(request, { write: true, verified: true });
    if (Number(request.headers.get("content-length") || 0) > MAX_FILE_BYTES * 5 + 100_000) throw new HttpError(413, "Attachments are too large. Send larger files afterwards in the request's messages.");
    if (!(await takeRateLimit("client-request", client.id, 8, 86400))) throw new HttpError(429, "You've opened several requests today. Please add to an existing one, or contact us.");
    const form = await request.formData().catch(() => { throw new HttpError(400, "The request couldn't be read. Please try again."); });
    const category = cleanText(form.get("category"), 40);
    const title = cleanText(form.get("title"), 160);
    const description = cleanText(form.get("description"), 8_000);
    const budget = cleanText(form.get("budget"), 60);
    const timeline = cleanText(form.get("timeline"), 60);
    if (!CATEGORY_LABEL[category]) throw new HttpError(400, "Choose what kind of request this is.");
    if (title.length < 3) throw new HttpError(400, "Give your request a short title.");
    if (description.length < 10) throw new HttpError(400, "Tell us a little more about what you need.");
    const files = filesFromForm(form).slice(0, 5);

    const created = await createRequest({
      clientId: client.id, contactName: client.name, contactEmail: client.email, contactPhone: client.phone, company: client.company,
      category, title, description,
      location: cleanText(form.get("location"), 160),
      budget: (BUDGET_RANGES as readonly string[]).includes(budget) ? budget : "",
      timeline: (TIMELINES as readonly string[]).includes(timeline) ? timeline : "",
      source: "portal", createdBy: { type: "client", id: client.id, name: client.name },
    });
    if (files.length) {
      await postToRequest({ requestId: created.id, author: { type: "client", id: client.id, name: client.name }, body: "", files, category: cleanText(form.get("fileCategory"), 30) || "drawings", visibility: "client", kind: "message" });
    }
    await notifyStaff(created.id, "new", { clientName: client.name, message: description, fileCount: files.length }, publicOrigin(request));
    await logActivity({ type: "client", id: client.id, name: client.name }, "request.new", `opened ${created.ref} · ${title}`, { type: "request", id: created.id });
    return Response.json({ ref: created.ref }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Your request couldn't be sent. Please try again.");
  }
}
