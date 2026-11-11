import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultSiteContent, normalizeSiteContent } from "@/lib/site-content/content";
import { postgresEnabled, pgQuery, runOnceMigration } from "@/lib/db/postgres";

function contentPath() {
  return process.env.SITE_CONTENT_PATH || join(process.cwd(), "data", "site-content.json");
}

function readSiteContentFile() {
  try {
    return normalizeSiteContent(JSON.parse(readFileSync(/*turbopackIgnore: true*/ contentPath(), "utf8")));
  } catch {
    return normalizeSiteContent(defaultSiteContent);
  }
}

export async function getSiteContent() {
  if (postgresEnabled()) {
    await runOnceMigration("legacy_site_content_v1", async (client) => {
      const content = readSiteContentFile();
      await client.query("INSERT INTO pcg_site_content (id, content) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [content]);
    });
    const result = await pgQuery<{ content: unknown }>("SELECT content FROM pcg_site_content WHERE id = 1");
    return normalizeSiteContent(result.rows[0]?.content ?? defaultSiteContent);
  }
  return readSiteContentFile();
}

export async function saveSiteContent(value: unknown) {
  const content = normalizeSiteContent(value);
  if (postgresEnabled()) {
    await pgQuery(
      "INSERT INTO pcg_site_content (id, content, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()",
      [content],
    );
    return content;
  }
  const path = contentPath();
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
  return content;
}
