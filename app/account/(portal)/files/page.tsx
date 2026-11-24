import { notFound, redirect } from "next/navigation";
import { FilesSpace } from "@/components/portal/files-space";
import { getCurrentClient } from "@/lib/clients/session";
import { getFeatures } from "@/lib/features";

export const metadata = { title: "Files" };

export default async function FilesPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  const features = await getFeatures();
  if (!features.files.enabled) notFound();
  if (!client.verified) return <div className="ps-page"><div className="portal-callout"><strong>Confirm your email to store files.</strong><p>We sent you a link when you signed up.</p></div></div>;
  return <div className="ps-page"><FilesSpace side="client" compressImages={features.files.compressImages} maxFileMb={features.files.maxFileMb} /></div>;
}
