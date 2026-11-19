import { requireClient } from "@/lib/clients/guard";
import { updateClientProfile } from "@/lib/clients/store";
import { cleanText, errorResponse, HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const client = await requireClient(request, { write: true });
    const body = await readJsonBody(request, 4_000);
    const name = cleanText(body.name, 120);
    if (name.length < 2) throw new HttpError(400, "Please enter your full name.");
    const updated = await updateClientProfile(client.id, {
      name,
      phone: cleanText(body.phone, 30).replace(/[^\d+()\s-]/g, ""),
      company: cleanText(body.company, 160),
      notifyEmail: body.notifyEmail !== false,
    });
    return Response.json({ client: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
