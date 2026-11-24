import { getFeatures } from "@/lib/features";
import { pushConfigured } from "@/lib/portal/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The public half of the notification key (safe to share). Empty when alerts aren't set up. */
export async function GET() {
  const enabled = pushConfigured() && (await getFeatures()).push.enabled;
  return Response.json({ key: enabled ? process.env.VAPID_PUBLIC_KEY : "" }, { headers: { "Cache-Control": "no-store" } });
}
