import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ExpandedDetailPage } from "@/components/expanded-detail-page";
import { buildSeoMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

type ServiceDetailProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServiceDetailProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const service = content.services.services.find((item) => item.id === slug) || null;
  if (!service) return { title: "Service not found", robots: { index: false, follow: false } };
  return buildSeoMetadata(content, {
    path: `/services/${service.id}`,
    title: `${service.title} | Services`,
    description: service.description,
    socialImage: service.image,
    imageAlt: service.imageAlt,
  });
}

export default async function ServiceDetailPage({ params }: ServiceDetailProps) {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const service = content.services.services.find((item) => item.id === slug);
  if (!service) notFound();

  const copy = content.detailPages.services[service.id];
  const sections = copy?.sections ?? service.points.map((point) => ({ title: point.title, body: point.text }));
  const focus = copy?.focus ?? service.points;
  const related = content.services.services
    .filter((item) => item.id !== service.id)
    .map((item) => ({ href: `/services/${item.id}`, title: item.title, description: item.description }));

  return (
    <ExpandedDetailPage
      kind="service"
      eyebrow={service.category}
      title={service.title}
      accent={copy?.accent ?? service.headline}
      intro={service.description}
      image={service.image}
      imageAlt={service.imageAlt}
      imageLabel={copy?.imageLabel ?? service.imageCaption}
      index={service.number}
      sections={sections}
      focus={focus}
      related={related}
      closing={content.detailPages.closing}
    />
  );
}
