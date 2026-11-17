import { homeHeroSlides, type HomeHeroSlide } from "@/lib/home-hero-slides";
import { projectCategories } from "@/lib/project-categories";

export type HomePageContent = {
  theme: {
    bodyFont: string;
    headingFont: string;
    colors: {
      ink: string;
      inkSoft: string;
      night: string;
      nightDeep: string;
      blue: string;
      teal: string;
      tealPale: string;
      amber: string;
      paper: string;
      white: string;
      line: string;
    };
  };
  hero: { enabled: boolean; scrollLabel: string; scrollHref: string; slides: HomeHeroSlide[] };
  belief: { enabled: boolean; statement: string; details: string[] };
  intro: {
    enabled: boolean;
    kicker: string;
    headline: { lead: string; accent: string };
    paragraph: string;
    action: { label: string; href: string };
    image: { src: string; alt: string; number: string; label: string };
  };
  services: {
    enabled: boolean;
    kicker: string;
    headline: { lead: string; accent: string };
    aside: string;
    capabilities: { id: string; number: string; title: string; text: string; icon: string }[];
    action: { label: string; href: string };
  };
  projects: {
    enabled: boolean;
    kicker: string;
    headline: { lead: string; accent: string };
    aside: string;
    action: { label: string; href: string };
    cards: { id: string; type: string; title: string; image: string; alt: string; href: string; size: string }[];
  };
  approach: {
    enabled: boolean;
    kicker: string;
    headline: { lead: string; accent: string };
    paragraph: string;
    action: { label: string; href: string };
    steps: { number: string; title: string; text: string }[];
  };
  closing: {
    enabled: boolean;
    eyebrow: string;
    headline: { lead: string; accent: string };
    paragraph: string;
    action: { label: string; href: string };
    mark: string;
  };
};

export const bodyFontOptions = [
  { label: "Ubuntu", value: '"Ubuntu", sans-serif' },
];

export const headingFontOptions = [
  { label: "Roboto Bold", value: '"Roboto", sans-serif' },
];

export const defaultHomePageContent: HomePageContent = {
  theme: {
    bodyFont: bodyFontOptions[0].value,
    headingFont: headingFontOptions[0].value,
    colors: {
      ink: "#151b2b",
      inkSoft: "#5a6170",
      night: "#111a32",
      nightDeep: "#0c1429",
      blue: "#f36b2f",
      teal: "#f36b2f",
      tealPale: "#edf0f4",
      amber: "#f36b2f",
      paper: "#f5f6f8",
      white: "#ffffff",
      line: "#d8dbe2",
    },
  },
  hero: { enabled: true, scrollLabel: "Scroll to explore", scrollHref: "#about", slides: homeHeroSlides },
  belief: {
    enabled: true,
    statement: "We believe good construction begins with good questions.",
    details: ["Intentional design", "Clear process", "Lasting quality"],
  },
  intro: {
    enabled: true,
    kicker: "01 / Who we are",
    headline: { lead: "Good work starts", accent: "with understanding." },
    paragraph:
      "Every great space begins with a clear idea of what it needs to become. We bring care, craft, and considered thinking to the process of bringing that idea to life.",
    action: { label: "Get to know our approach", href: "/approach" },
    image: {
      src: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=2000&q=85",
      alt: "Architectural forms reveal the balance of light, material, and space",
      number: "PCG / 01",
      label: "Considered in every detail",
    },
  },
  services: {
    enabled: true,
    kicker: "02 / What we do",
    headline: { lead: "Built around", accent: "what matters." },
    aside: "From the first plan to the finishing touch, every stage deserves the same care and attention.",
    capabilities: [
      {
        id: "construction-delivery",
        number: "01",
        title: "Construction delivery",
        text: "Careful coordination and a steady hand from the first conversation through to the final detail.",
        icon: "structure",
      },
      {
        id: "design-coordination",
        number: "02",
        title: "Design coordination",
        text: "Bringing the right people, plans, and practical decisions together around a shared vision.",
        icon: "lines",
      },
      {
        id: "project-management",
        number: "03",
        title: "Project management",
        text: "Clear priorities and considered communication to keep every part of the process moving.",
        icon: "compass",
      },
    ],
    action: { label: "Find the right fit", href: "/services" },
  },
  projects: {
    enabled: true,
    kicker: "03 / Selected work",
    headline: { lead: "Spaces with", accent: "something to say." },
    aside: "We believe the best work is made to serve the people who use it, today and for years to come.",
    action: { label: "View all projects", href: "/projects" },
    cards: projectCategories.map((project, index) => ({
      id: project.id,
      type: project.type,
      title: project.title,
      image: project.image,
      alt: project.alt,
      href: `/projects/${project.id}`,
      size: index === 0 ? "tall" : "normal",
    })),
  },
  approach: {
    enabled: true,
    kicker: "04 / The way forward",
    headline: { lead: "A better build", accent: "begins with trust." },
    paragraph: "Good collaboration makes room for both big ideas and the small decisions that bring them to life.",
    action: { label: "Let's talk about your project", href: "/contact" },
    steps: [
      { number: "01", title: "Listen first", text: "Understand the brief, the people, and the purpose behind each project." },
      { number: "02", title: "Plan with intention", text: "Make thoughtful choices early, so the whole team can move forward with clarity." },
      { number: "03", title: "Deliver with care", text: "Bring the work together with focus, communication, and respect for every detail." },
    ],
  },
  closing: {
    enabled: true,
    eyebrow: "The next step is yours",
    headline: { lead: "Have a place", accent: "in mind?" },
    paragraph: "Tell us what you're looking to build. We'll start with a conversation.",
    action: { label: "Start a conversation", href: "/contact" },
    mark: "PCG",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeHref(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ||
    value.startsWith("#") ||
    /^https:\/\//i.test(value) ||
    /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

function isSafeMediaSource(value: string) {
  return value.startsWith("/") && !value.startsWith("//") || /^https:\/\//i.test(value);
}

function normalizeValue(template: unknown, value: unknown, path: string): unknown {
  if (path.endsWith(".media") && isRecord(value) && value.type === "video" && isRecord(template) && template.type !== "video") {
    return normalizeValue(
      {
        type: "video",
        src: typeof template.src === "string" ? template.src : "",
        poster: typeof template.src === "string" ? template.src : "",
        alt: typeof template.alt === "string" ? template.alt : "",
      },
      value,
      path,
    );
  }
  if (typeof template === "string") {
    if (typeof value !== "string") return template;
    const clean = value.slice(0, 5_000);
    if (path.endsWith(".href") || path.endsWith(".scrollHref")) return isSafeHref(clean) ? clean : template;
    if (path.endsWith(".src") || path.endsWith(".poster") || path.endsWith(".image")) return isSafeMediaSource(clean) ? clean : template;
    if (path.startsWith("theme.colors.") && !/^#[\da-f]{6}$/i.test(clean)) return template;
    if (path === "theme.bodyFont" && !bodyFontOptions.some((option) => option.value === clean)) return template;
    if (path === "theme.headingFont" && !headingFontOptions.some((option) => option.value === clean)) return template;
    if (path.endsWith(".media.type") && clean !== "image" && clean !== "video") return template;
    if (path.endsWith(".icon") && !["structure", "lines", "compass"].includes(clean)) return template;
    if (path.endsWith(".size") && !["normal", "tall"].includes(clean)) return template;
    return clean;
  }
  if (typeof template === "boolean") return typeof value === "boolean" ? value : template;
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return template;
    const limits: Record<string, number> = {
      "hero.slides": 8,
      "belief.details": 6,
      "services.capabilities": 12,
      "projects.cards": 16,
      "approach.steps": 12,
    };
    const limit = limits[path] ?? 20;
    const itemTemplate = template[0];
    return itemTemplate === undefined ? [] : value.slice(0, limit).map((item) => normalizeValue(itemTemplate, item, `${path}[]`));
  }
  if (isRecord(template)) {
    const source = isRecord(value) ? value : {};
    return Object.fromEntries(
      Object.entries(template).map(([key, child]) => [key, normalizeValue(child, source[key], path ? `${path}.${key}` : key)]),
    );
  }
  return template;
}

export function normalizeHomePageContent(value: unknown): HomePageContent {
  return normalizeValue(defaultHomePageContent, value, "") as HomePageContent;
}
