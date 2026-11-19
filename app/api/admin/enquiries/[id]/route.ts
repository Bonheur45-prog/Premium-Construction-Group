import { requireStaff } from "@/lib/admin/guard";
import { sendEnquiryReply } from "@/lib/enquiries/email";
import { ENQUIRY_STATUSES, deleteEnquiry, getEnquiry, updateEnquiry, type EnquiryStatus } from "@/lib/enquiries/store";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH { status } — mark as read, archived, etc. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const body = await readJsonBody(request, 2_000);
    const status = String(body.status || "") as EnquiryStatus;
    if (!(ENQUIRY_STATUSES as readonly string[]).includes(status) || status === "converted") throw new HttpError(400, "Choose a valid status.");
    const enquiry = await updateEnquiry(id, { status });
    if (status === "archived") await logActivity({ type: "staff", id: user.id, name: user.username }, "enquiry.archive", `archived the enquiry from ${enquiry.name}`, { type: "enquiry", id });
    return Response.json({ enquiry });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST { message } — email a reply to the person who enquired; marks it replied only if the email was delivered. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const body = await readJsonBody(request, 20_000);
    const message = cleanText(body.message, 8_000);
    if (message.length < 2) throw new HttpError(400, "Write a reply first.");
    const enquiry = await getEnquiry(id);
    if (!enquiry) throw new HttpError(404, "This enquiry no longer exists.");
    const sent = await sendEnquiryReply(enquiry, message, user.username);
    if (!sent) throw new HttpError(502, "The reply could not be emailed. Check the Brevo settings, or reply from your own inbox.");
    const updated = await updateEnquiry(id, { status: "replied" });
    await logActivity({ type: "staff", id: user.id, name: user.username }, "enquiry.reply", `replied to ${enquiry.name}`, { type: "enquiry", id });
    return Response.json({ enquiry: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true, adminOnly: true });
    const { id } = await context.params;
    await deleteEnquiry(id);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "enquiry.delete", "deleted an enquiry", { type: "enquiry", id });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
