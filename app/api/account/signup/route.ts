import { getFeatures } from "@/lib/features";
import { clientSessionCookie, createClientSessionToken } from "@/lib/clients/session";
import { createClient, issueClientToken, validatePassword } from "@/lib/clients/store";
import { sendVerificationEmail } from "@/lib/requests/email";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { logActivity } from "@/lib/server/activity";
import { cleanEmail, cleanText, clientIp, errorResponse, HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open sign-up for the client portal. Signs the new client in and emails a confirmation link. */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified. Refresh the page and try again.");
    if (!(await getFeatures()).signup.enabled) throw new HttpError(403, "New accounts aren't open at the moment. Please contact us and we'll help you directly.");
    const body = await readJsonBody(request, 8_000);
    if (cleanText(body.website, 100)) throw new HttpError(400, "Your account couldn't be created.");
    const ip = clientIp(request);
    if (!(await verifyTurnstile(body.turnstileToken, ip))) throw new HttpError(400, "We couldn't confirm you're human. Refresh the page and try again.");
    if (!(await takeRateLimit("signup-ip", ip, 5, 3600))) throw new HttpError(429, "Too many sign-ups from this connection. Please try again later.");

    const name = cleanText(body.name, 120);
    const email = cleanEmail(body.email);
    const phone = cleanText(body.phone, 30).replace(/[^\d+()\s-]/g, "");
    const company = cleanText(body.company, 160);
    const password = validatePassword(body.password);
    if (name.length < 2) throw new HttpError(400, "Please enter your full name.");
    if (!email) throw new HttpError(400, "Please enter a valid email address.");
    if (body.acceptTerms !== true) throw new HttpError(400, "Please accept the terms to create an account.");

    const client = await createClient({ name, email, phone, company, password });
    const token = await issueClientToken(client.id, "verify");
    const emailed = await sendVerificationEmail(client, token, publicOrigin(request));
    await logActivity({ type: "client", id: client.id, name: client.name }, "client.signup", "created a client account", { type: "client", id: client.id });
    return Response.json(
      { ok: true, verificationSent: emailed },
      { status: 201, headers: { "Set-Cookie": clientSessionCookie(createClientSessionToken(client)), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, "Your account couldn't be created. Please try again.");
  }
}
