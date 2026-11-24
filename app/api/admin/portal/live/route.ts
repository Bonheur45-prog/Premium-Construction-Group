import { route, staffViewer } from "@/lib/portal/api";
import { onlineClientIds, liveStream } from "@/lib/portal/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The team's live connection: every client conversation, presence and file activity. */
export const GET = route(async (request: Request) => {
  await staffViewer(request);
  return liveStream(request, "staff", { onlineClients: onlineClientIds() });
});
