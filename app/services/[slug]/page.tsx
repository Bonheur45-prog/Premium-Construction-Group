import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ExpandedDetailPage } from "@/components/expanded-detail-page";
import { serviceDetailCopy } from "@/lib/site-content/expanded-details";
import { getSiteContent } from "@/lib/site-content/store";

type ServiceDetailProps = { params: Promise<{ slug: string }> };

async function findService(slug: string) {
  return (await getSiteContent()).services.services.find((service) => service.id === slug) || null;
}

export async function generateMetadata({ params }: ServiceDetailProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const service = await findService(slug);
  if (!service) return { title: "Service not found", robots: { index: false, follow: false } };
  return { title: `${service.title} | Services`, description: service.description };
}

export default async function ServiceDetailPage({ params }: ServiceDetailProps) {
  await connection();
  const { slug } = await params;
  const content = await getSiteContent();
  const service = content.services.services.find((item) => item.id === slug);
  if (!service) notFound();

  const copy = serviceDetailCopy[service.id];
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
    />
  );
}
