import Link from "next/link";
import { redirect } from "next/navigation";
import { NewRequestForm } from "@/components/portal/new-request-form";
import { getCurrentClient } from "@/lib/clients/session";

export const metadata = { title: "New request" };

export default async function NewRequestPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  return (
    <div className="portal-narrow">
      <Link className="portal-back" href="/account">← All requests</Link>
      <p className="portal-eyebrow">New request</p>
      <h1 className="portal-title">What are you <em>planning?</em></h1>
      <p className="portal-lede">Tell us as much as you know. It&apos;s fine if details are still open — we&apos;ll reply with questions and next steps.</p>
      {client.verified ? <NewRequestForm /> : <p className="portal-callout">Please confirm your email address first — check your inbox for the link we sent.</p>}
    </div>
  );
}
