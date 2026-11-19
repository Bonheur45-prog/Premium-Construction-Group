import "server-only";

import type { ShowcaseProject } from "@/components/project-showcase";
import { listProjects, type Project } from "@/lib/projects/store";
import type { SiteContent } from "@/lib/site-content/content";

/** Published projects shaped for the public showcase grid. */
export async function publicShowcase(content: SiteContent, filter?: (project: Project) => boolean): Promise<ShowcaseProject[]> {
  const labels = new Map<string, string>(content.projects.categories.map((category) => [category.id, category.type]));
  return (await listProjects({ publishedOnly: true }))
    .filter((project) => project.cover && (!filter || filter(project)))
    .map((project) => ({
      slug: project.slug,
      title: project.title,
      category: project.category,
      categoryLabel: labels.get(project.category) || "",
      stage: project.stage,
      location: project.location,
      year: project.year,
      summary: project.summary,
      cover: project.cover,
      coverAlt: project.coverAlt,
      featured: project.featured,
    }));
}
