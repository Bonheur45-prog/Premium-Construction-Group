import { requireStaff } from "@/lib/admin/guard";
import { listCmsUsers } from "@/lib/admin/users";
import { getClientRowByEmail } from "@/lib/clients/store";
import { pgQuery } from "@/lib/db/postgres";
import { getEnquiry, updateEnquiry } from "@/lib/enquiries/store";
import { CATEGORY_LABEL } from "@/lib/portal/constants";
import { notifyRequestOpened } from "@/lib/requests/email";
import { createRequest, listStaffRequests } from "@/lib/requests/store";
import { logActivity } from "@/lib/server/activity";
import { cleanEmail, cleanText, errorResponse, HttpError, noStore, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENQUIRY_TO_CATEGORY: Record<string, string> = { "new-build": "new_build", renovation: "renovation", design: "design", management: "management", other: "other" };

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const params = new URL(request.url).searchParams;
    const [requests, staff, counts] = await Promise.all([
      listStaffRequests({ status: params.get("status") || undefined, search: params.get("q") || undefined, assigned: params.get("assigned") || undefined }),
      listCmsUsers(),
      pgQuery<{ status: string; count: string }>("SELECT status, COUNT(*)::text AS count FROM pcg_requests GROUP BY status"),
    ]);
    return Response.json({
      requests,
      staff: staff.map((user) => user.username),
      counts: Object.fromEntries(counts.rows.map((row) => [row.status, Number(row.count)])),
    }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST { enquiryId } to open a request from an enquiry, or { contactName, contactEmail, category, title, … } to open one for a client. */
export async function POST(request: Request) {
  try {
    const user = await requireStaff(request, { write: true });
    const body = await readJsonBody(request, 20_000);
    const origin = publicOrigin(request);
    let input;
    let enquiryId = "";
    if (typeof body.enquiryId === "string" && body.enquiryId) {
      const enquiry = await getEnquiry(body.enquiryId);
      if (!enquiry) throw new HttpError(404, "This enquiry no longer exists.");
      if (enquiry.status === "converted" && enquiry.requestId) throw new HttpError(409, "This enquiry already has a request.");
      enquiryId = enquiry.id;
      input = {
        contactName: enquiry.name, contactEmail: enquiry.email, contactPhone: enquiry.phone, company: enquiry.company,
        category: ENQUIRY_TO_CATEGORY[enquiry.projectType] || "other",
        title: `${enquiry.projectTypeLabel}${enquiry.company ? ` for ${enquiry.company}` : ""}`,
        description: enquiry.message, location: "", budget: "", timeline: "", source: "enquiry" as const, sourceId: enquiry.id,
      };
    } else {
      const contactEmail = cleanEmail(body.contactEmail);
      const contactName = cleanText(body.contactName, 120);
      const category = cleanText(body.category, 40);
      const title = cleanText(body.title, 160);
      if (!contactName || !contactEmail) throw new HttpError(400, "Enter the client's name and email.");
      if (!CATEGORY_LABEL[category]) throw new HttpError(400, "Choose a request type.");
      if (title.length < 3) throw new HttpError(400, "Give the request a title.");
      input = {
        contactName, contactEmail, contactPhone: cleanText(body.contactPhone, 30), company: cleanText(body.company, 160), category, title,
        description: cleanText(body.description, 8_000), location: cleanText(body.location, 160), budget: "", timeline: "", source: "staff" as const,
      };
    }
    const account = await getClientRowByEmail(input.contactEmail);
    const linkedClient = account && account.verified && account.status === "active" ? account : null;
    const created = await createRequest({ ...input, clientId: linkedClient?.id || null, createdBy: { type: "staff", id: user.id, name: user.username } });
    if (enquiryId) await updateEnquiry(enquiryId, { status: "converted", requestId: created.id });
    const emailed = body.notify === false ? false : await notifyRequestOpened({ email: input.contactEmail, name: input.contactName, ref: created.ref, title: input.title, hasAccount: Boolean(linkedClient) }, origin);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "request.open", `opened ${created.ref} for ${input.contactName}`, { type: "request", id: created.id });
    return Response.json({ id: created.id, ref: created.ref, linkedToAccount: Boolean(linkedClient), emailed }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
