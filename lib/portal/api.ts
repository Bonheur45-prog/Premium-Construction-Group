import "server-only";

import { requireStaff } from "@/lib/admin/guard";
import { requireClient } from "@/lib/clients/guard";
import type { Viewer } from "@/lib/portal/chat";
import type { Actor } from "@/lib/portal/files";
import { errorResponse } from "@/lib/server/http";

/** Small helpers shared by the client-space API routes (/api/portal/…) and the staff ones (/api/admin/portal/…). */
export async function clientViewer(request: Request, write = false) {
  const client = await requireClient(request, { write, verified: write });
  const actor: Actor = { type: "client", id: client.id, name: client.name };
  const viewer: Viewer = { side: "client", client };
  return { client, actor, viewer };
}

export async function staffViewer(request: Request, write = false, adminOnly = false) {
  const user = await requireStaff(request, { write, adminOnly });
  const actor: Actor = { type: "staff", id: user.id, name: user.username };
  const viewer: Viewer = { side: "staff", actor };
  return { user, actor, viewer };
}

/** Wraps a route handler: JSON in, JSON out, friendly errors, never cached. */
export function route<Context>(handler: (request: Request, context: Context) => Promise<unknown>, fallback?: string) {
  return async (request: Request, context: Context) => {
    try {
      const result = await handler(request, context);
      if (result instanceof Response) return result;
      return Response.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return errorResponse(error, fallback);
    }
  };
}
