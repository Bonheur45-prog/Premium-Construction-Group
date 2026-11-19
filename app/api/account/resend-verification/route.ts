import { requireClient } from "@/lib/clients/guard";
import { issueClientToken } from "@/lib/clients/store";
import { sendVerificationEmail } from "@/lib/requests/email";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { errorResponse, HttpError, publicOrigin } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const client = await requireClient(request, { write: true });
    if (client.verified) return Response.json({ ok: true, alreadyVerified: true });
    if (!(await takeRateLimit("verify-resend", client.id, 3, 3600))) throw new HttpError(429, "We've sent a few links already. Check your spam folder, or try again in an hour.");
    const sent = await sendVerificationEmail(client, await issueClientToken(client.id, "verify"), publicOrigin(request));
    if (!sent) throw new HttpError(502, "The email couldn't be sent right now. Please try again later.");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
