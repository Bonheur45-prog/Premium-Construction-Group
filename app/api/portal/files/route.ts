import { getFeatures } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";
import { createUpload, listFiles } from "@/lib/portal/files";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The client's files, folders and storage use. */
export const GET = route(async (request: Request) => {
  const { client } = await clientViewer(request);
  if (!(await getFeatures()).files.enabled) throw new HttpError(404, "The file space is switched off at the moment.");
  return listFiles(client.id);
});

/** Step 1 of an upload: reserve the space and get where to send the file. */
export const POST = route(async (request: Request) => {
  const { client, actor } = await clientViewer(request, true);
  if (!(await takeRateLimit("file-upload", client.id, 300, 3600))) throw new HttpError(429, "You've uploaded a lot of files in a short time. Please wait a little.");
  const body = await readJsonBody<{ name?: unknown; size?: unknown; originalSize?: unknown; encoding?: unknown; folderId?: unknown; replaceFamilyId?: unknown; conversationId?: unknown; purpose?: unknown }>(request);
  const meta: Record<string, unknown> = {};
  if (typeof body.conversationId === "string" && body.conversationId) meta.conversationId = body.conversationId;
  if (body.purpose === "voice") meta.voice = true;
  return createUpload({ clientId: client.id, actor, ...body, meta });
});
