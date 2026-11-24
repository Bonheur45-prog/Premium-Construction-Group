import "server-only";

import { cache } from "react";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";
import { DEFAULT_FEATURES, normalizeFeatures, type Features } from "@/lib/features-shared";
import { HttpError } from "@/lib/server/http";

/** The company's feature switches, read once per request. Without a database the defaults apply. */
export const getFeatures = cache(async (): Promise<Features> => {
  if (!postgresEnabled()) return DEFAULT_FEATURES;
  const result = await pgQuery<{ value: string }>("SELECT value FROM pcg_cms_meta WHERE key = 'features'").catch(() => null);
  if (!result?.rows[0]) return DEFAULT_FEATURES;
  try { return normalizeFeatures(JSON.parse(result.rows[0].value)); } catch { return DEFAULT_FEATURES; }
});

export async function saveFeatures(input: unknown): Promise<Features> {
  if (!postgresEnabled()) throw new HttpError(503, "Feature switches need the database.");
  const features = normalizeFeatures(input);
  await pgQuery(
    `INSERT INTO pcg_cms_meta (key, value, updated_at) VALUES ('features', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(features)],
  );
  return features;
}

/** Throws a friendly 404-style error when a portal feature has been switched off. */
export async function requireFeature(name: "chat" | "files" | "quotes" | "progress" | "portalMeetings" | "push") {
  const features = await getFeatures();
  if (!features[name].enabled) throw new HttpError(404, "This part of your client space is switched off at the moment.");
  return features;
}
