import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultSiteContent, normalizeSiteContent } from "@/lib/site-content/content";

function contentPath() {
  return process.env.SITE_CONTENT_PATH || join(process.cwd(), "data", "site-content.json");
}

export function getSiteContent() {
  try {
    return normalizeSiteContent(JSON.parse(readFileSync(contentPath(), "utf8")));
  } catch {
    return normalizeSiteContent(defaultSiteContent);
  }
}

export function saveSiteContent(value: unknown) {
  const content = normalizeSiteContent(value);
  const path = contentPath();
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
  return content;
}
