import { clientViewer, route } from "@/lib/portal/api";
import { liveStream } from "@/lib/portal/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The client's live connection: new messages, read ticks, typing and team presence. */
export const GET = route(async (request: Request) => {
  const { client } = await clientViewer(request);
  return liveStream(request, `client:${client.id}`);
});
