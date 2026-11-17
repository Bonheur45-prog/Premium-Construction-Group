import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ExpandedDetailPage } from "@/components/expanded-detail-page";
import { projectDetailCopy } from "@/lib/site-content/expanded-details";
import { getSiteContent } from "@/lib/site-content/store";

type ProjectDetailProps = { params: Promise<{ slug: string }> };

async function findProjectCategory(slug: string) {
  return (await getSiteContent()).projects.categories.find((category) => category.id === slug) || null;
}

export async function generateMetadata({ params }: ProjectDetailProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const category = await findProjectCategory(slug);
  if (!category) return { title: "Project category not found", robots: { index: false, follow: false } };
  return { title: `${category.title} | Projects`, description: category.summary };
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const category = content.projects.categories.find((item) => item.id === slug);
  if (!category) notFound();

  const copy = projectDetailCopy[category.id];
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
    />
  );
}
