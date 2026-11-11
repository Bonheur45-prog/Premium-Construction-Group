import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultHomePageContent, normalizeHomePageContent, type HomePageContent } from "@/lib/homepage/content";
import { postgresEnabled, pgQuery, runOnceMigration } from "@/lib/db/postgres";

function contentPath() {
  return process.env.HOME_PAGE_CONTENT_PATH || join(process.cwd(), "data", "homepage-content.json");
}

function readHomePageFile(): HomePageContent {
  try {
    return normalizeHomePageContent(JSON.parse(readFileSync(/*turbopackIgnore: true*/ contentPath(), "utf8")));
  } catch {
    return normalizeHomePageContent(defaultHomePageContent);
  }
}

export async function getHomePageContent(): Promise<HomePageContent> {
  if (postgresEnabled()) {
    await runOnceMigration("legacy_homepage_content_v1", async (client) => {
      const content = readHomePageFile();
      await client.query("INSERT INTO pcg_homepage_content (id, content) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [content]);
    });
    const result = await pgQuery<{ content: unknown }>("SELECT content FROM pcg_homepage_content WHERE id = 1");
    return normalizeHomePageContent(result.rows[0]?.content ?? defaultHomePageContent);
  }
  return readHomePageFile();
}

export async function saveHomePageContent(value: unknown) {
  const content = normalizeHomePageContent(value);
  if (postgresEnabled()) {
    await pgQuery(
      "INSERT INTO pcg_homepage_content (id, content, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()",
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
