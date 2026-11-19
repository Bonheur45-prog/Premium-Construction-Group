import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/site-content/store";

/** Split-screen layout for sign in, sign up and password pages. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const content = await getSiteContent();
  const { brand } = content.siteSettings;
  return (
    <div className="portal-auth">
      <aside className="portal-auth__art">
        <div className="portal-auth__photo" style={{ backgroundImage: `url(${JSON.stringify(content.projects.hero.image)})` }} aria-hidden="true" />
        <div className="portal-auth__veil" aria-hidden="true" />
        <Link className="portal-brand portal-brand--light" href="/">
          <span className="portal-brand__mark"><Image src={brand.logo} alt="" width={122} height={77} unoptimized /></span>
          <span className="portal-brand__name"><strong>{brand.primaryName}</strong><span>{brand.secondaryName}</span></span>
        </Link>
        <div className="portal-auth__pitch">
          <p className="portal-eyebrow">Client portal</p>
          <h2>Your project,<br /><em>in one place.</em></h2>
          <ul>
            <li>Follow every stage, from first brief to handover</li>
            <li>Message the team and get answers in writing</li>
            <li>Share plans and receive quotes, drawings and reports</li>
          </ul>
        </div>
      </aside>
      <main className="portal-auth__panel" id="main-content">{children}</main>
    </div>
  );
}
