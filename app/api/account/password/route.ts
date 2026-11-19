import { requireClient } from "@/lib/clients/guard";
import { clientSessionCookie, createClientSessionToken } from "@/lib/clients/session";
import { checkPassword, getClientRowByEmail, setClientPassword, validatePassword } from "@/lib/clients/store";
import { errorResponse, HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

/** Change password while signed in (needs the current one). Other devices are signed out. */
export async function POST(request: Request) {
  try {
    const client = await requireClient(request, { write: true });
    const body = await readJsonBody(request, 4_000);
    const row = await getClientRowByEmail(client.email);
    if (!checkPassword(row, typeof body.current === "string" ? body.current : "")) throw new HttpError(400, "Your current password isn't correct.");
    const updated = await setClientPassword(client.id, validatePassword(body.password));
    return Response.json({ ok: true }, { headers: { "Set-Cookie": clientSessionCookie(createClientSessionToken(updated)) } });
  } catch (error) {
    return errorResponse(error);
  }
}
