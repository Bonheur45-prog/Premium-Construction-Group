import { redirect } from "next/navigation";
import { SignupForm } from "@/components/portal/auth-forms";
import { getCurrentClient } from "@/lib/clients/session";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await getCurrentClient()) redirect("/account");
  const { email } = await searchParams;
  return (
    <div className="portal-auth__card">
      <h1>Create your <em>account.</em></h1>
      <p className="portal-muted">Free for anyone planning a project with us. Takes a minute.</p>
      <SignupForm email={typeof email === "string" ? email.slice(0, 254) : ""} />
    </div>
  );
}
