import { requireStaff } from "@/lib/admin/guard";
import { COLLECTIONS } from "@/lib/cms/collections";
import { deleteForever, discardChanges, getEntry, listVersions, restoreEntry, saveEntry, selectOptionLabels, trashEntry, versionData, type SaveMode } from "@/lib/cms/entries";
import { sendInsightPublication } from "@/lib/insights/email";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, HttpError, noStore, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function editorPayload(id: string) {
  const entry = await getEntry(id);
  if (!entry) throw new HttpError(404, "This item no longer exists.");
  const { __slug: pendingSlug, ...data } = entry.data as Record<string, unknown> & { __slug?: string };
  return { entry: { ...entry, data, pendingSlug: typeof pendingSlug === "string" ? pendingSlug : null }, versions: await listVersions(id), options: await selectOptionLabels() };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireStaff(request);
    const { id } = await context.params;
    return Response.json(await editorPayload(id), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT { values, slug, sortOrder, showOnHome, mode: "draft" | "publish" | "unpublish" } */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const body = await readJsonBody(request, 900_000);
    const mode: SaveMode = body.mode === "publish" || body.mode === "unpublish" ? body.mode : "draft";
    const values = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? (body.values as Record<string, unknown>) : {};
    const { entry, firstPublish } = await saveEntry(id, {
      values, mode,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      showOnHome: typeof body.showOnHome === "boolean" ? body.showOnHome : undefined,
    }, user.username);
    const def = COLLECTIONS[entry.collection];

    // First publication of an article: email the insight subscribers (when email is set up).
    let notified: { enabled: boolean; total: number; sent: number } | null = null;
    if (firstPublish && entry.collection === "insights") {
      const data = entry.data;
      notified = await sendInsightPublication({ slug: entry.slug, title: entry.title, excerpt: String(entry.data.excerpt || "") }, publicOrigin(request));
    }
    const verb = mode === "publish" ? (firstPublish ? "published" : "updated") : mode === "unpublish" ? "unpublished" : "saved a draft of";
    await logActivity({ type: "staff", id: user.id, name: user.username }, "page.entry", `${verb} the ${def.singular} “${entry.title}”`, { type: entry.collection, id });
    return Response.json({ ...(await editorPayload(id)), notified });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST { action: "discard" | "trash" | "restore" | "load-version", versionId? } */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const body = await readJsonBody(request, 2_000);
    switch (body.action) {
      case "discard":
        await discardChanges(id);
        return Response.json(await editorPayload(id));
      case "load-version":
        return Response.json({ data: await versionData(id, String(body.versionId || "")) });
      case "trash": {
        const entry = await trashEntry(id, user.username);
        await logActivity({ type: "staff", id: user.id, name: user.username }, "page.trash", `moved the ${COLLECTIONS[entry.collection].singular} “${entry.title}” to the trash`, { type: entry.collection, id });
        return Response.json({ ok: true, collection: entry.collection });
      }
      case "restore": {
        const entry = await restoreEntry(id);
        await logActivity({ type: "staff", id: user.id, name: user.username }, "page.restore", `restored the ${COLLECTIONS[entry.collection].singular} “${entry.title}”`, { type: entry.collection, id });
        return Response.json({ ok: true, entry });
      }
      default:
        throw new HttpError(400, "Unknown action.");
    }
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE — permanently removes an item that is already in the trash (administrators). */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true, adminOnly: true });
    const { id } = await context.params;
    const title = await deleteForever(id);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "page.delete", `deleted “${title}” for good`, { type: "entry", id });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
