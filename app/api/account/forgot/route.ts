import { getClientRowByEmail, issueClientToken } from "@/lib/clients/store";
import { sendPasswordResetEmail } from "@/lib/requests/email";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { cleanEmail, clientIp, errorResponse, HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Always answers the same way, so the form can't be used to find out who has an account. */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified.");
    const body = await readJsonBody(request, 4_000);
    const email = cleanEmail(body.email);
    if (!email) throw new HttpError(400, "Enter the email address you signed up with.");
    if (!(await verifyTurnstile(body.turnstileToken, clientIp(request)))) throw new HttpError(400, "We couldn't confirm you're human. Refresh the page and try again.");
    if ((await takeRateLimit("reset-ip", clientIp(request), 8, 3600)) && (await takeRateLimit("reset-email", email, 3, 3600))) {
      const row = await getClientRowByEmail(email);
      if (row && row.status === "active") await sendPasswordResetEmail(row, await issueClientToken(row.id, "reset"), publicOrigin(request));
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
