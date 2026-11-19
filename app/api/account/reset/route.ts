import { clientSessionCookie, createClientSessionToken } from "@/lib/clients/session";
import { consumeClientToken, setClientPassword, validatePassword } from "@/lib/clients/store";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { token, password } — sets a new password, signs out other devices, signs this one in. */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified.");
    const body = await readJsonBody(request, 4_000);
    const password = validatePassword(body.password);
    const clientId = await consumeClientToken(body.token, "reset");
    if (!clientId) throw new HttpError(400, "This reset link is invalid or has expired. Ask for a new one.");
    const client = await setClientPassword(clientId, password);
    await logActivity({ type: "client", id: client.id, name: client.name }, "client.reset", "reset their password", { type: "client", id: client.id });
    return Response.json({ ok: true }, { headers: { "Set-Cookie": clientSessionCookie(createClientSessionToken(client)), "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
