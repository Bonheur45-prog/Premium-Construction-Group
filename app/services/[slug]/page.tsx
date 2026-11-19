import type { Metadata } from "next";
import { connection } from "next/server";
import { ExpandedDetailPage } from "@/components/expanded-detail-page";
import { getServices, redirectOrNotFound } from "@/lib/cms/public";
import { buildSeoMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

type ServiceDetailProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServiceDetailProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const [content, services] = await Promise.all([getSiteContent(), getServices()]);
  const service = services.find((item) => item.slug === slug);
  if (!service) return { title: "Service not found", robots: { index: false, follow: false } };
  return buildSeoMetadata(content, {
    path: `/services/${service.slug}`,
    title: service.seoTitle || `${service.title} | Services`,
    description: service.metaDescription || service.description,
    socialImage: service.socialImage || service.image,
    imageAlt: service.imageAlt,
  });
}

export default async function ServiceDetailPage({ params }: ServiceDetailProps) {
  await connection();
  const { slug } = await params;
  const [content, services] = await Promise.all([getSiteContent(), getServices()]);
  const service = services.find((item) => item.slug === slug);
  if (!service) return redirectOrNotFound(`/services/${slug}`);

  const sections = service.sections.length ? service.sections : service.points.map((point) => ({ title: point.title, body: point.text }));
  const focus = service.focus.length ? service.focus : service.points;
  const related = services
    .filter((item) => item.id !== service.id)
    .map((item) => ({ href: `/services/${item.slug}`, title: item.title, description: item.description }));

  return (
    <ExpandedDetailPage
      kind="service"
      eyebrow={service.category}
      title={service.title}
      accent={service.accent || service.headline}
      intro={service.description}
      image={service.image}
      imageAlt={service.imageAlt}
      imageLabel={service.imageCaption}
      index={service.number}
      sections={sections}
      focus={focus}
      related={related}
      closing={content.detailPages.closing}
    />
  );
}
