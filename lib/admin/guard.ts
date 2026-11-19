import "server-only";

import { getAdminSessionUserFromRequest, isSameOriginRequest } from "@/lib/reservations/auth";
import type { CmsUserSummary } from "@/lib/admin/users";
import { HttpError } from "@/lib/server/http";

/**
 * Guard for CMS API routes. Returns the signed-in staff user or throws an HttpError (401/403).
 * `write` also enforces the same-origin check; `adminOnly` restricts to administrators.
 */
export async function requireStaff(request: Request, { write = false, adminOnly = false }: { write?: boolean; adminOnly?: boolean } = {}): Promise<CmsUserSummary> {
  if (write && !isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified.");
  const user = await getAdminSessionUserFromRequest(request);
  if (!user) throw new HttpError(401, "Your session has ended. Sign in again to continue.");
  if (adminOnly && user.role !== "admin") throw new HttpError(403, "Only administrators can do this.");
  return user;
}
