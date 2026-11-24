import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BudgetEstimator } from "@/components/budget-estimator";
import { PageScrollProgress, ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { getFeatures } from "@/lib/features";
import { buildSeoMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [content, features] = await Promise.all([getSiteContent(), getFeatures()]);
  if (!features.estimator.enabled) return { title: "Not found", robots: { index: false, follow: false } };
  return buildSeoMetadata(content, { path: "/estimate", title: "Budget estimator | Premium Construction Group", description: "Get an indicative budget for your build in Rwanda — choose the project type, size and finish." });
}

/** Budget estimator — only reachable while it's switched on under CMS → Features. */
export default async function EstimatePage() {
  await connection();
  const features = await getFeatures();
  if (!features.estimator.enabled) notFound();
  const { types, finishes, spread, disclaimer } = features.estimator;
  return (
    <SitePageTheme>
      <SiteHeader />
      <PageScrollProgress />
      <main id="main-content" className="estimate-page">
        <section className="careers-hero shell" aria-labelledby="estimate-title">
          <ScrollReveal>
            <p className="eyebrow"><span /> Budget estimator</p>
            <h1 id="estimate-title">What could <em>your project cost?</em></h1>
            <p className="careers-hero__intro">Three questions, one honest range. It&apos;s a starting point for a conversation — not a quotation.</p>
          </ScrollReveal>
        </section>
        <section className="shell section-pad estimate-page__tool">
          <BudgetEstimator types={types} finishes={finishes} spread={spread} disclaimer={disclaimer} accountsOpen={features.signup.enabled} />
        </section>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
