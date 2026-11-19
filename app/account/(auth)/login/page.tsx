import { redirect } from "next/navigation";
import { LoginForm } from "@/components/portal/auth-forms";
import { getCurrentClient } from "@/lib/clients/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentClient()) redirect(next?.startsWith("/account") ? next : "/account");
  return (
    <div className="portal-auth__card">
      <h1>Welcome <em>back.</em></h1>
      <p className="portal-muted">Sign in to follow your requests with Premium Construction Group.</p>
      <LoginForm next={next} />
    </div>
  );
}
