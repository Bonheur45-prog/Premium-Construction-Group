import { requireFeature } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";
import { getQuote } from "@/lib/portal/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request);
  await requireFeature("quotes");
  const { id } = await context.params;
  return { quote: await getQuote(id, { clientId: client.id, forStaff: false }) };
});
