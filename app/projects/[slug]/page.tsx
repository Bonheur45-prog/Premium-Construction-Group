import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ExpandedDetailPage } from "@/components/expanded-detail-page";
import { buildSeoMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import { ProjectDetailPage as ProjectDetailView } from "@/components/project-detail-page";
import { ProjectShowcase } from "@/components/project-showcase";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getProjectBySlug } from "@/lib/projects/store";
import { publicShowcase } from "@/lib/projects/public";

type ProjectDetailProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProjectDetailProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const category = content.projects.categories.find((item) => item.id === slug) || null;
  if (!category) {
    const project = await getProjectBySlug(slug);
    if (!project) return { title: "Project not found", robots: { index: false, follow: false } };
    return buildSeoMetadata(content, {
      path: `/projects/${project.slug}`,
      title: `${project.title} | Projects`,
      description: project.summary,
      socialImage: project.cover,
      imageAlt: project.coverAlt || project.title,
    });
  }
  return buildSeoMetadata(content, {
    path: `/projects/${category.id}`,
    title: `${category.title} | Projects`,
    description: category.summary,
    socialImage: category.image,
    imageAlt: category.alt,
  });
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const category = content.projects.categories.find((item) => item.id === slug);
  if (!category) {
    const project = await getProjectBySlug(slug);
    if (!project) notFound();
    const labels = new Map<string, string>(content.projects.categories.map((item) => [item.id, item.type]));
    const all = await publicShowcase(content);
    const related = all.filter((item) => item.slug !== project.slug && (!project.category || item.category === project.category)).slice(0, 3);
    const position = all.findIndex((item) => item.slug === project.slug);
    return <ProjectDetailView project={project} categoryLabel={labels.get(project.category) || ""} related={related} sheetNumber={`PCG-P-${String(Math.max(position, 0) + 1).padStart(2, "0")}`} copy={content.detailPages.projectPage} />;
  }
  const categoryProjects = await publicShowcase(content, (project) => project.category === category.id);

  const copy = content.detailPages.projectCategories[category.id];
  const sections = copy?.sections ?? [
    { title: "Start with the purpose", body: `Every ${category.type.toLowerCase()} brief begins with the people it is intended to serve and the role the place needs to play.` },
    { title: "Shape a practical response", body: "Bring the important requirements, site conditions, and design choices into a clear conversation before work moves ahead." },
    { title: "Keep the longer view in sight", body: "Consider how the finished place will be used, maintained, and adapted as needs change over time." },
  ];
  const focus = copy?.focus ?? [
    { title: "People and purpose", text: `Understand the needs behind this ${category.type.toLowerCase()} category.` },
    { title: "Site and constraints", text: "Make room for the practical conditions that shape the brief." },
    { title: "Long-term use", text: "Consider durability, care, and future needs from the outset." },
  ];
  const related = content.projects.categories
    .filter((item) => item.id !== category.id)
    .map((item) => ({ href: `/projects/${item.id}`, title: item.title, description: item.summary }));
  const index = String(content.projects.categories.findIndex((item) => item.id === category.id) + 1).padStart(2, "0");

  return (
    <ExpandedDetailPage
      kind="project"
      eyebrow={category.type}
      title={category.title}
      accent={copy?.accent ?? "Shaped around its purpose."}
      intro={category.summary}
      image={category.image}
      imageAlt={category.alt}
      imageLabel={copy?.imageLabel ?? `${category.type} / illustrative category image`}
      index={index}
      sections={sections}
      focus={focus}
      related={related}
      closing={content.detailPages.closing}
    >
      {categoryProjects.length > 0 && (
        <section className="section-pad project-category-work" aria-labelledby="category-work-title">
          <div className="shell">
            <ScrollReveal className="project-detail__section-head">
              <p className="section-kicker"><span>{category.type} portfolio</span><span className="section-kicker__rule" /></p>
              <h2 id="category-work-title">Selected <em>{category.type.toLowerCase()} work.</em></h2>
            </ScrollReveal>
            <ProjectShowcase projects={categoryProjects} showFilters={false} />
          </div>
        </section>
      )}
    </ExpandedDetailPage>
  );
}
