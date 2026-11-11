import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultHomePageContent, normalizeHomePageContent, type HomePageContent } from "@/lib/homepage/content";

function contentPath() {
  return process.env.HOME_PAGE_CONTENT_PATH || join(process.cwd(), "data", "homepage-content.json");
}

export function getHomePageContent(): HomePageContent {
  try {
    return normalizeHomePageContent(JSON.parse(readFileSync(contentPath(), "utf8")));
  } catch {
    return normalizeHomePageContent(defaultHomePageContent);
  }
}

export function saveHomePageContent(value: unknown) {
  const content = normalizeHomePageContent(value);
  const path = contentPath();
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
  return content;
}
