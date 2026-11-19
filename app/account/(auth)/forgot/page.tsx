import { ForgotForm } from "@/components/portal/auth-forms";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <div className="portal-auth__card">
      <h1>Forgot your <em>password?</em></h1>
      <p className="portal-muted">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotForm />
    </div>
  );
}
