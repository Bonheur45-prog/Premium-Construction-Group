import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/portal/profile-form";
import { getCurrentClient } from "@/lib/clients/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  return (
    <div className="portal-narrow">
      <p className="portal-eyebrow">Your account</p>
      <h1 className="portal-title">Profile &amp; <em>settings.</em></h1>
      <ProfileForm initial={{ name: client.name, email: client.email, phone: client.phone, company: client.company, notifyEmail: client.notifyEmail }} />
    </div>
  );
}
