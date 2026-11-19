import { clientSessionCookie, createClientSessionToken } from "@/lib/clients/session";
import { consumeClientToken, verifyClientEmail } from "@/lib/clients/store";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { token } — confirms the email address, links earlier requests with the same email, and signs the client in. */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified.");
    const body = await readJsonBody(request, 2_000);
    const clientId = await consumeClientToken(body.token, "verify");
    if (!clientId) throw new HttpError(400, "This confirmation link is invalid or has expired. Sign in and ask for a new one.");
    const { client, claimedRefs } = await verifyClientEmail(clientId);
    await logActivity({ type: "client", id: client.id, name: client.name }, "client.verify", claimedRefs.length ? `confirmed their email and linked ${claimedRefs.join(", ")}` : "confirmed their email", { type: "client", id: client.id });
    return Response.json({ ok: true, linked: claimedRefs }, { headers: { "Set-Cookie": clientSessionCookie(createClientSessionToken(client)), "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
