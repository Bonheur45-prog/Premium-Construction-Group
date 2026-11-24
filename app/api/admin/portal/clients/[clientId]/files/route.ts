import { route, staffViewer } from "@/lib/portal/api";
import { createUpload, listFiles } from "@/lib/portal/files";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ clientId: string }> };

/** A client's file space as the team sees it. */
export const GET = route(async (request: Request, context: Context) => {
  await staffViewer(request);
  const { clientId } = await context.params;
  return listFiles(clientId);
});

/** The team sends a file into a client's space (it never counts against the client's storage). */
export const POST = route(async (request: Request, context: Context) => {
  const { actor } = await staffViewer(request, true);
  const { clientId } = await context.params;
  const body = await readJsonBody<{ name?: unknown; size?: unknown; originalSize?: unknown; encoding?: unknown; folderId?: unknown; replaceFamilyId?: unknown; conversationId?: unknown; purpose?: unknown }>(request);
  const meta: Record<string, unknown> = {};
  if (typeof body.conversationId === "string" && body.conversationId) meta.conversationId = body.conversationId;
  if (body.purpose === "voice") meta.voice = true;
  if (body.purpose === "photo") meta.sitePhoto = true;
  return createUpload({ clientId, actor, ...body, meta });
});
