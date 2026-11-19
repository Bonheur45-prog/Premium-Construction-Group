import "server-only";

import { FILE_CATEGORY_LABEL } from "@/lib/portal/constants";
import { storeRequestFile } from "@/lib/requests/files";
import { addEvent, addFileRecord, linkFilesToEvent } from "@/lib/requests/store";
import { HttpError } from "@/lib/server/http";

/**
 * Posts a message, update or internal note on a request, with optional attachments.
 * Files are stored first so a failed upload never leaves a message pointing at nothing.
 */
export async function postToRequest({ requestId, author, body, files, category, visibility, kind }: {
  requestId: string;
  author: { type: "client" | "staff"; id: string; name: string };
  body: string;
  files: File[];
  category: string;
  visibility: "client" | "internal";
  kind: "message" | "update" | "note";
}) {
  if (!body.trim() && !files.length) throw new HttpError(400, "Write a message or attach a file.");
  const fileCategory = FILE_CATEGORY_LABEL[category] ? category : "other";
  const stored = [];
  for (const file of files) stored.push(await storeRequestFile(file, requestId));
  const eventKind = !body.trim() && files.length ? "file" : kind;
  const eventId = await addEvent(requestId, { kind: eventKind, authorType: author.type, authorId: author.id, authorName: author.name, body: body.trim(), visibility });
  const fileIds = [];
  for (const file of stored) {
    fileIds.push(await addFileRecord({ requestId, eventId, uploadedByType: author.type, uploadedById: author.id, uploadedByName: author.name, category: fileCategory, visibility, ...file }));
  }
  await linkFilesToEvent(eventId, fileIds);
  return { eventId, fileCount: fileIds.length };
}
