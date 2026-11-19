import "server-only";

import { getClientFromRequest } from "@/lib/clients/session";
import type { Client } from "@/lib/clients/store";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { HttpError } from "@/lib/server/http";

/** Guard for client-portal API routes. */
export async function requireClient(request: Request, { write = false, verified = false }: { write?: boolean; verified?: boolean } = {}): Promise<Client> {
  if (write && !isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified. Refresh the page and try again.");
  const client = await getClientFromRequest(request);
  if (!client) throw new HttpError(401, "Please sign in to continue.");
  if (verified && !client.verified) throw new HttpError(403, "Please confirm your email address first. We sent you a link when you signed up.");
  return client;
}
