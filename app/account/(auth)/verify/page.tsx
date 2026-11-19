import { VerifyRunner } from "@/components/portal/auth-forms";

export const metadata = { title: "Confirm your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="portal-auth__card">
      <h1>Confirming your <em>email.</em></h1>
      <VerifyRunner token={typeof token === "string" ? token : ""} />
    </div>
  );
}
