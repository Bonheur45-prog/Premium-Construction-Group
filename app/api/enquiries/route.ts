import { ENQUIRY_PROJECT_TYPES, createEnquiry, setEnquiryDelivery } from "@/lib/enquiries/store";
import { sendEnquiryNotifications } from "@/lib/enquiries/email";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { logActivity } from "@/lib/server/activity";
import { cleanEmail, cleanText, clientIp, errorResponse, HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/enquiries — the website contact form. Responds with success only once the enquiry is saved. */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified. Refresh the page and try again.");
    const body = await readJsonBody(request, 20_000);

    // Bots fill hidden fields; people never see this one.
    if (cleanText(body.website, 200)) return Response.json({ ok: true });

    const ip = clientIp(request);
    if (!(await verifyTurnstile(body.turnstileToken, ip))) throw new HttpError(400, "We couldn't confirm you're human. Refresh the page and try again.");

    const firstName = cleanText(body.firstName, 80);
    const lastName = cleanText(body.lastName, 80);
    const email = cleanEmail(body.email);
    const enquiryType = body.enquiryType === "company" ? "company" : "personal";
    const company = enquiryType === "company" ? cleanText(body.company, 160) : "";
    const projectType = cleanText(body.projectType, 40);
    const message = cleanText(body.message, 5_000);
    const phone = cleanText(body.phone, 30).replace(/[^\d+()\s-]/g, "");

    if (!firstName || !lastName) throw new HttpError(400, "Please enter your first and last name.");
    if (!email) throw new HttpError(400, "Please enter a valid email address.");
    if (enquiryType === "company" && !company) throw new HttpError(400, "Please enter your company name.");
    if (!ENQUIRY_PROJECT_TYPES[projectType]) throw new HttpError(400, "Please choose what you're looking to build.");
    if (message.length < 10) throw new HttpError(400, "Please tell us a little more about your project.");

    if (!(await takeRateLimit("enquiry-ip", ip, 6, 3600)) || !(await takeRateLimit("enquiry-email", email, 3, 3600))) {
      throw new HttpError(429, "You've sent several enquiries in a short time. Please wait a little, or contact us directly.");
    }

    const enquiry = await createEnquiry({ name: `${firstName} ${lastName}`, email, phone, enquiryType, company, projectType, message });
    const delivery = await sendEnquiryNotifications(enquiry, publicOrigin(request));
    await setEnquiryDelivery(enquiry.id, delivery.staff, delivery.sender);
    await logActivity({ type: "visitor", name: enquiry.name }, "enquiry.new", `sent an enquiry about ${enquiry.projectTypeLabel.toLowerCase()}`, { type: "enquiry", id: enquiry.id });

    return Response.json({ ok: true, acknowledged: delivery.sender }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Your enquiry couldn't be sent. Please try again, or contact us directly.");
  }
}
