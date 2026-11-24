import { route, staffViewer } from "@/lib/portal/api";
import { createQuote, listQuotes } from "@/lib/portal/quotes";
import { logActivity } from "@/lib/server/activity";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await staffViewer(request);
  const clientId = new URL(request.url).searchParams.get("client") || undefined;
  return { quotes: await listQuotes({ clientId, forStaff: true }) };
});

/** { clientId, kind: quote | change_order, title, conversationId?, projectId? } — creates a draft. */
export const POST = route(async (request: Request) => {
  const { actor, user } = await staffViewer(request, true);
  const id = await createQuote(actor, await readJsonBody(request));
  await logActivity({ type: "staff", id: user.id, name: user.username }, "quote.create", "started a new quote", { type: "quote", id });
  return { id };
});
