import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminWorkspace } from "@/components/admin-workspace";
import { COLLECTIONS, isCollectionId } from "@/lib/cms/collections";

type Props = { params: Promise<{ collection: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params;
  return { title: isCollectionId(collection) ? `Edit ${COLLECTIONS[collection].singular}` : "Not found", robots: { index: false, follow: false } };
}

/** The editor of one item: /admin/services/<id>, /admin/insights/<id> … */
export default async function AdminEntryPage({ params }: Props) {
  const { collection, id } = await params;
  if (!isCollectionId(collection) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <AdminWorkspace key={id} initialTab={collection} entryId={id} />;
}
