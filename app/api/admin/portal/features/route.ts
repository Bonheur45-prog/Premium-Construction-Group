import { getFeatures, saveFeatures } from "@/lib/features";
import { route, staffViewer } from "@/lib/portal/api";
import { pushConfigured } from "@/lib/portal/notify";
import { r2Configured } from "@/lib/media/r2";
import { emailConfigured } from "@/lib/email/send";
import { logActivity } from "@/lib/server/activity";
import { readJsonBody } from "@/lib/server/http";
import { getSiteContent, saveSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Feature switches plus the online-booking switch (kept with the booking settings in the site content). */
export const GET = route(async (request: Request) => {
  await staffViewer(request, false, true);
  const content = await getSiteContent();
  return {
    features: await getFeatures(),
    booking: { enabled: content.reservations.booking.enabled },
    services: { r2: r2Configured("private"), push: pushConfigured(), email: emailConfigured() },
    whatsappFallback: content.siteSettings.contact.whatsapp,
  };
});

export const PUT = route(async (request: Request) => {
  const { user } = await staffViewer(request, true, true);
  const body = await readJsonBody<{ features?: unknown; booking?: { enabled?: unknown } }>(request, 100_000);
  const before = await getFeatures();
  const features = await saveFeatures(body.features);
  if (typeof body.booking?.enabled === "boolean") {
    const content = await getSiteContent();
    if (content.reservations.booking.enabled !== body.booking.enabled) {
      await saveSiteContent({ ...content, reservations: { ...content.reservations, booking: { ...content.reservations.booking, enabled: body.booking.enabled } } });
    }
  }
  const changed = (Object.keys(features) as Array<keyof typeof features>).filter((key) => JSON.stringify(features[key]) !== JSON.stringify(before[key]));
  await logActivity({ type: "staff", id: user.id, name: user.username }, "features.update", changed.length ? `changed feature settings: ${changed.join(", ")}` : "saved feature settings", { type: "settings" });
  const content = await getSiteContent();
  return { features, booking: { enabled: content.reservations.booking.enabled } };
});
