import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminWorkspace } from "@/components/admin-workspace";
import { COLLECTIONS, isCollectionId } from "@/lib/cms/collections";

type Props = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  return { title: isCollectionId(collection) ? COLLECTIONS[collection].label : "Not found", robots: { index: false, follow: false } };
}

/** The list screen of a content section: /admin/services, /admin/projects, /admin/insights … */
export default async function AdminCollectionPage({ params }: Props) {
  const { collection } = await params;
  if (!isCollectionId(collection)) notFound();
  return <AdminWorkspace initialTab={collection} />;
}
