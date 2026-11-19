import "server-only";

import type { ShowcaseProject } from "@/components/project-showcase";
import { getProjects, type PublicProject } from "@/lib/cms/public";
import type { SiteContent } from "@/lib/site-content/content";

/** Published projects (CMS → Projects) shaped for the public showcase grid, featured first. */
export async function publicShowcase(content: SiteContent, filter?: (project: PublicProject) => boolean): Promise<ShowcaseProject[]> {
  const labels = new Map<string, string>(content.projects.categories.map((category) => [category.id, category.type]));
  return (await getProjects())
    .filter((project) => !filter || filter(project))
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
