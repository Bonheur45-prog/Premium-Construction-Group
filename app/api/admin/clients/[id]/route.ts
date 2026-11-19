import { requireStaff } from "@/lib/admin/guard";
import { getClientById, issueClientToken, setClientStatus } from "@/lib/clients/store";
import { sendVerificationEmail } from "@/lib/requests/email";
import { listClientRequests } from "@/lib/requests/store";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, HttpError, noStore, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireStaff(request);
    const { id } = await context.params;
    const client = await getClientById(id);
    if (!client) throw new HttpError(404, "This client no longer exists.");
    return Response.json({ client, requests: await listClientRequests(id) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST { action: "suspend" | "activate" | "resend-verification" } */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const { action } = await readJsonBody(request, 1_000);
    if (action === "resend-verification") {
      const client = await getClientById(id);
      if (!client) throw new HttpError(404, "This client no longer exists.");
      if (client.verified) throw new HttpError(400, "This client has already confirmed their email.");
      if (!(await sendVerificationEmail(client, await issueClientToken(id, "verify"), publicOrigin(request)))) throw new HttpError(502, "The email couldn't be sent. Check the Brevo settings.");
      return Response.json({ client });
    }
    if (action !== "suspend" && action !== "activate") throw new HttpError(400, "Unknown action.");
    if (user.role !== "admin") throw new HttpError(403, "Only administrators can pause or restore client accounts.");
    const client = await setClientStatus(id, action === "suspend" ? "suspended" : "active");
    await logActivity({ type: "staff", id: user.id, name: user.username }, "client.status", `${action === "suspend" ? "paused" : "restored"} ${client.name}'s account`, { type: "client", id });
    return Response.json({ client });
  } catch (error) {
    return errorResponse(error);
  }
}
