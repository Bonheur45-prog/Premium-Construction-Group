import { redirect } from "next/navigation";
import { SignupForm } from "@/components/portal/auth-forms";
import Link from "next/link";
import { getCurrentClient } from "@/lib/clients/session";
import { getFeatures } from "@/lib/features";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await getCurrentClient()) redirect("/account");
  const { email } = await searchParams;
  if (!(await getFeatures()).signup.enabled) {
    return (
      <div className="portal-auth__card">
        <h1>New accounts are <em>closed for now.</em></h1>
        <p className="portal-muted">Already working with us? Sign in below. Otherwise, send us a message and we&apos;ll set you up.</p>
        <p><Link className="button button--dark" href="/account/login">Sign in</Link> <Link className="portal-link" href="/contact">Contact us</Link></p>
      </div>
    );
  }
  return (
    <div className="portal-auth__card">
      <h1>Create your <em>account.</em></h1>
      <p className="portal-muted">Free for anyone planning a project with us. Takes a minute.</p>
      <SignupForm email={typeof email === "string" ? email.slice(0, 254) : ""} />
    </div>
  );
}
