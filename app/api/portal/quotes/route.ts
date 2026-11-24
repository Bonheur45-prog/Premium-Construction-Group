import { requireFeature } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";
import { listQuotes } from "@/lib/portal/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const { client } = await clientViewer(request);
  await requireFeature("quotes");
  return { quotes: await listQuotes({ clientId: client.id, forStaff: false }) };
});
