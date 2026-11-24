import { requireFeature } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";
import { respondToQuote } from "@/lib/portal/quotes";
import { logActivity } from "@/lib/server/activity";
import { clientIp, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** { response: accepted | changes_requested | declined, note, signedName } — accepting is signed with the client's full name. */
export const POST = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  await requireFeature("quotes");
  const { id } = await context.params;
  const body = await readJsonBody<{ response?: unknown; note?: unknown; signedName?: unknown }>(request);
  const quote = await respondToQuote(id, client.id, { ...body, ip: clientIp(request), agent: request.headers.get("user-agent") || "", origin: publicOrigin(request), clientName: client.name });
  await logActivity({ type: "client", id: client.id, name: client.name }, `quote.${String(body.response)}`, `${body.response === "accepted" ? "accepted and signed" : body.response === "declined" ? "declined" : "asked for changes to"} ${quote.ref}`, { type: "quote", id });
  return { quote };
});
