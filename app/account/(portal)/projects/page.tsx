import { notFound } from "next/navigation";
import { ProjectsView } from "@/components/portal/projects-view";
import { getFeatures } from "@/lib/features";

export const metadata = { title: "Progress" };

export default async function ProjectsPage() {
  const features = await getFeatures();
  if (!features.progress.enabled) notFound();
  return <ProjectsView allowComments={features.progress.clientComments} />;
}
