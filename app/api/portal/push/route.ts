import { clientViewer, route } from "@/lib/portal/api";
import { removeSubscription, saveSubscription } from "@/lib/portal/notify";
import { HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turns phone / desktop alerts on for this browser. */
export const POST = route(async (request: Request) => {
  const { client } = await clientViewer(request, true);
  const body = await readJsonBody<{ subscription?: unknown }>(request);
  if (!(await saveSubscription({ type: "client", id: client.id }, body.subscription))) throw new HttpError(400, "This browser didn't allow notifications.");
  return { ok: true };
});

export const DELETE = route(async (request: Request) => {
  const { client } = await clientViewer(request, true);
  await removeSubscription((await readJsonBody<{ endpoint?: unknown }>(request)).endpoint);
  return { ok: true };
});
