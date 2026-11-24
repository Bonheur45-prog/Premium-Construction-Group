import { route, staffViewer } from "@/lib/portal/api";
import { getQuote, saveQuoteDraft, sendQuote, withdrawQuote } from "@/lib/portal/quotes";
import { logActivity } from "@/lib/server/activity";
import { HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  await staffViewer(request);
  const { id } = await context.params;
  return { quote: await getQuote(id, { forStaff: true }) };
});

/** Saves the working version (title, items, notes, VAT, valid until). */
export const PUT = route(async (request: Request, context: Context) => {
  await staffViewer(request, true);
  const { id } = await context.params;
  return { quote: await saveQuoteDraft(id, await readJsonBody(request, 400_000)) };
});

/** { action: send | withdraw } */
export const POST = route(async (request: Request, context: Context) => {
  const { actor, user } = await staffViewer(request, true);
  const { id } = await context.params;
  const { action } = await readJsonBody<{ action?: unknown }>(request);
  if (action === "send") {
    const quote = await sendQuote(id, actor, publicOrigin(request));
    await logActivity({ type: "staff", id: user.id, name: user.username }, "quote.send", `sent ${quote.ref} (revision ${quote.revision}) to ${quote.clientName}`, { type: "quote", id });
    return { quote };
  }
  if (action === "withdraw") {
    await withdrawQuote(id);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "quote.withdraw", "withdrew a quote", { type: "quote", id });
    return { quote: await getQuote(id, { forStaff: true }) };
  }
  throw new HttpError(400, "Unknown action.");
});
