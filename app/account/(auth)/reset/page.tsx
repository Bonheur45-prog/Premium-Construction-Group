import { ResetForm } from "@/components/portal/auth-forms";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="portal-auth__card">
      <h1>Choose a new <em>password.</em></h1>
      <p className="portal-muted">You&apos;ll be signed in once it&apos;s saved, and signed out everywhere else.</p>
      <ResetForm token={typeof token === "string" ? token : ""} />
    </div>
  );
}
