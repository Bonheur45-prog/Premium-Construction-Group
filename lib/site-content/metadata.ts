import type { Metadata } from "next";
import { connection } from "next/server";
import type { SiteContent, SiteInsight } from "@/lib/site-content/content";
import { getSiteContent } from "@/lib/site-content/store";

export type ManagedPageKey = keyof SiteContent["siteSettings"]["seo"]["pages"];

const managedPagePaths: Record<ManagedPageKey, string> = {
  home: "/",
  about: "/about",
  approach: "/approach",
  services: "/services",
  projects: "/projects",
  insights: "/insights",
  contact: "/contact",
  reservations: "/reservations",
  careers: "/careers",
};

export function getSiteOrigin(content: SiteContent): URL | null {
  const configuredUrl = content.siteSettings.seo.siteUrl.trim();
  const candidate = configuredUrl || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return new URL(parsed.origin);
  } catch {
    return null;
  }
}

export function toAbsoluteSeoUrl(value: string | undefined, content: SiteContent): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const parsed = new URL(value, getSiteOrigin(content) || undefined);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    if (!/^https?:\/\//i.test(value) && !getSiteOrigin(content)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export type SeoMetadataOptions = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  socialImage?: string;
  imageAlt?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  absoluteTitle?: boolean;
};

export function buildSeoMetadata(content: SiteContent, options: SeoMetadataOptions): Metadata {
  const { seo, brand } = content.siteSettings;
  const title = options.title.trim() || brand.legalName;
  const description = options.description.trim();
  const canonical = toAbsoluteSeoUrl(options.canonicalUrl || options.path, content);
  const image = toAbsoluteSeoUrl(options.socialImage || seo.defaultImage || brand.logo, content);
  const index = seo.robots.index && !options.noIndex;
  const follow = seo.robots.follow;
  const siteName = `${brand.primaryName} ${brand.secondaryName}`.trim();
  const openGraph = options.type === "article"
    ? {
      type: "article" as const,
      title,
      description,
      siteName,
      locale: "en_ZA",
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [{ url: image, ...(options.imageAlt ? { alt: options.imageAlt } : {}) }] } : {}),
      ...(options.publishedAt ? { publishedTime: options.publishedAt } : {}),
      ...(options.updatedAt ? { modifiedTime: options.updatedAt } : {}),
      ...(options.author ? { authors: [options.author] } : {}),
    }
    : {
      type: "website" as const,
      title,
      description,
      siteName,
      locale: "en_ZA",
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [{ url: image, ...(options.imageAlt ? { alt: options.imageAlt } : {}) }] } : {}),
    };
  const handle = seo.twitterHandle.trim();

  return {
    title: options.absoluteTitle ? { absolute: title } : title,
    description,
    applicationName: siteName,
    ...(options.keywords?.length ? { keywords: options.keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: {
      index,
      follow,
      googleBot: {
        index,
        follow,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
      ...(handle ? { site: handle.startsWith("@") ? handle : `@${handle}` } : {}),
    },
  };
}

export function buildRootMetadata(content: SiteContent): Metadata {
  const { seo, brand } = content.siteSettings;
  const home = seo.pages.home;
  const siteName = `${brand.primaryName} ${brand.secondaryName}`.trim();
  const metadata = buildSeoMetadata(content, {
    path: "/",
    title: home.seoTitle || home.title,
    description: home.description,
    keywords: home.keywords,
    canonicalUrl: home.canonicalUrl,
    socialImage: home.socialImage,
    noIndex: home.noIndex,
  });

  return {
    ...metadata,
    ...(getSiteOrigin(content) ? { metadataBase: getSiteOrigin(content)! } : {}),
    title: {
      default: home.seoTitle || home.title,
      template: seo.titleTemplate.trim() || `%s | ${siteName}`,
    },
    verification: {
      ...(seo.verification.google.trim() ? { google: seo.verification.google.trim() } : {}),
      ...(seo.verification.bing.trim() ? { other: { bing: seo.verification.bing.trim() } } : {}),
    },
  };
}

export function buildSiteStructuredData(content: SiteContent) {
  const origin = getSiteOrigin(content);
  if (!origin) return null;
  const { brand, seo } = content.siteSettings;
  const siteName = `${brand.primaryName} ${brand.secondaryName}`.trim();
  const organizationId = `${origin.toString()}#organization`;
  const logo = toAbsoluteSeoUrl(brand.logo || seo.defaultImage, content);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        legalName: brand.legalName,
        url: origin.toString(),
        ...(logo ? { logo: { "@type": "ImageObject", url: logo } } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${origin.toString()}#website`,
        name: siteName,
        url: origin.toString(),
        publisher: { "@id": organizationId },
        inLanguage: "en-ZA",
      },
    ],
  };
}

export type ArticleForStructuredData = Pick<SiteInsight, "slug" | "title" | "excerpt" | "metaDescription" | "image" | "socialImage" | "publishedAt" | "updatedAt" | "author" | "canonicalUrl">;

export function buildArticleStructuredData(content: SiteContent, article: ArticleForStructuredData) {
  const origin = getSiteOrigin(content);
  if (!origin) return null;
  const brand = content.siteSettings.brand;
  const url = toAbsoluteSeoUrl(article.canonicalUrl || `/insights/${article.slug}`, content);
  const image = toAbsoluteSeoUrl(article.socialImage || article.image || content.siteSettings.seo.defaultImage, content);
  const publishedAt = article.publishedAt && !Number.isNaN(Date.parse(article.publishedAt)) ? new Date(article.publishedAt).toISOString() : undefined;
  const updatedAt = article.updatedAt && !Number.isNaN(Date.parse(article.updatedAt)) ? new Date(article.updatedAt).toISOString() : publishedAt;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription || article.excerpt,
    ...(image ? { image: [image] } : {}),
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    author: { "@type": "Organization", name: article.author || brand.legalName },
    publisher: {
      "@type": "Organization",
      name: `${brand.primaryName} ${brand.secondaryName}`.trim(),
      ...(toAbsoluteSeoUrl(brand.logo, content) ? { logo: { "@type": "ImageObject", url: toAbsoluteSeoUrl(brand.logo, content) } } : {}),
    },
    ...(url ? { mainEntityOfPage: { "@type": "WebPage", "@id": url } } : {}),
  };
}

export async function getManagedPageMetadata(pageKey: ManagedPageKey): Promise<Metadata> {
  await connection();
  const content = await getSiteContent();
  const page = content.siteSettings.seo.pages[pageKey];
  return buildSeoMetadata(content, {
    path: managedPagePaths[pageKey],
    title: page.seoTitle || page.title,
    description: page.description,
    keywords: page.keywords,
    canonicalUrl: page.canonicalUrl,
    socialImage: page.socialImage,
    noIndex: page.noIndex,
    absoluteTitle: pageKey === "home",
  });
}
