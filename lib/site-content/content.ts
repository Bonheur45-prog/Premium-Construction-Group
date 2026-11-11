import { insights as starterInsights } from "@/lib/insights";
import { projectCategories } from "@/lib/project-categories";

export const defaultSiteContent = {
  about: {
    hero: {
      eyebrow: "Who we are",
      title: "Built with purpose.",
      accent: "Made to last.",
      intro: "We believe the best construction begins with understanding what matters: the people, the place, and the purpose behind every project.",
      primaryLabel: "Talk to our team",
      primaryHref: "/contact",
      secondaryLabel: "Get to know us",
      secondaryHref: "#our-story",
      image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1600&q=85",
      imageAlt: "Modern building facade in warm natural light",
      imageLabel: "Considered in every detail",
      noteLabel: "Our point of view",
      noteText: "Good work starts with good questions.",
      index: "01",
    },
    story: {
      kicker: "01 / Our story",
      title: "Construction is more than the structure",
      accent: "left behind.",
      paragraphs: [
        "Premium Construction Group Ltd is here to make the building process more thoughtful, connected, and purposeful. We start by listening, work through the choices together, and keep the long view in sight.",
        "A clear plan and open communication help turn ideas into places that feel right to use—and continue to serve well over time.",
      ],
    },
    purpose: {
      kicker: "02 / Our purpose",
      title: "A clear purpose",
      accent: "for every place.",
      missionLabel: "Our mission",
      missionTitle: "Bring good ideas to life.",
      missionText: "Deliver thoughtful construction experiences and lasting spaces through considered planning, careful delivery, and care in every detail.",
      visionLabel: "Our vision",
      visionTitle: "Build for the lives lived there.",
      visionText: "Contribute to enduring places that support the people and communities who use them, today and into the future.",
    },
    values: {
      kicker: "03 / What guides us",
      title: "Principles that shape",
      accent: "the work.",
      intro: "Our objectives are to keep the process clear, bring the right people together, and create places with lasting value.",
      items: [
        { number: "01", title: "People first", text: "Listen closely to the people who will shape, build, and use each place." },
        { number: "02", title: "Purposeful planning", text: "Ask the right questions early and make decisions with the whole project in mind." },
        { number: "03", title: "Integrity in every detail", text: "Keep communication clear, expectations grounded, and commitments considered." },
        { number: "04", title: "A lasting view", text: "Consider how a space will serve people long after the build is complete." },
      ],
    },
    strengths: {
      kicker: "04 / How we help",
      title: "Considered at",
      accent: "every stage.",
      intro: "Good outcomes grow from aligned people, clear decisions, and steady attention from start to finish.",
      items: [
        { number: "01", slug: "construction-delivery", title: "Construction delivery", text: "A thoughtful, coordinated path from the first conversation through to the finishing details." },
        { number: "02", slug: "design-coordination", title: "Design coordination", text: "Bringing plans, people, and practical decisions together around a shared purpose." },
        { number: "03", slug: "project-management", title: "Project management", text: "Clear priorities and steady communication to help every part of the process move forward." },
      ],
    },
    closing: { eyebrow: "The next step is yours", title: "Let's build", accent: "something that matters.", body: "Tell us what you're looking to build. We'll start with a conversation.", action: "Start a conversation", href: "/contact" },
  },
  approach: {
    hero: {
      eyebrow: "Our approach",
      title: "A better build",
      accent: "begins with trust.",
      intro: "Good collaboration makes room for big ideas and the small decisions that bring them to life. We listen, plan with intention, and deliver with care.",
      primaryLabel: "Let's talk about your project",
      primaryHref: "/contact",
      secondaryLabel: "See how we work",
      secondaryHref: "#approach-process",
      image: {
        src: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=2000&q=85",
        alt: "Architectural forms reveal the balance of light, material, and space",
        label: "Considered in every detail",
        number: "PCG / 01",
      },
      noteLabel: "What guides the work",
      noteText: "People first",
      indexLead: "A considered process",
      indexAccent: "Built around people",
    },
    process: {
      kicker: "How we work",
      title: "From first questions",
      accent: "to lasting places.",
      intro: "Every project is different. A considered process helps people stay aligned as the work takes shape.",
      steps: [
        { number: "01", title: "Listen first", text: "Understand the brief, the people, and the purpose behind each project." },
        { number: "02", title: "Plan with intention", text: "Make thoughtful choices early, so the whole team can move forward with clarity." },
        { number: "03", title: "Deliver with care", text: "Bring the work together with focus, communication, and respect for every detail." },
      ],
    },
    principles: {
      kicker: "Our principles",
      title: "Principles that shape",
      accent: "the work.",
      intro: "Our objectives are to keep the process clear, bring the right people together, and create places with lasting value.",
      items: [
        { number: "01", title: "People first", text: "Listen closely to the people who will shape, build, and use each place." },
        { number: "02", title: "Purposeful planning", text: "Ask the right questions early and make decisions with the whole project in mind." },
        { number: "03", title: "Integrity in every detail", text: "Keep communication clear, expectations grounded, and commitments considered." },
        { number: "04", title: "A lasting view", text: "Consider how a space will serve people long after the build is complete." },
      ],
    },
    capabilities: {
      kicker: "Our capabilities",
      title: "Good work,",
      accent: "connected.",
      intro: "The right support depends on the project. We shape the team and the work around what it needs.",
    },
    closing: { eyebrow: "The next step is yours", title: "Let's build", accent: "something that matters.", body: "Tell us what you're looking to build. We'll start with a conversation.", action: "Start a conversation", href: "/contact" },
  },
  services: {
    hero: {
      eyebrow: "What we do", title: "Considered work.", accent: "Clear delivery.",
      intro: "Thoughtful construction takes more than a good plan. It takes connected decisions, clear communication, and care at every stage.",
      primaryLabel: "Discuss your project", primaryHref: "/contact", secondaryLabel: "Explore our services", secondaryHref: "#service-list",
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=90",
      imageAlt: "Construction professionals coordinating work on site", imageLabel: "Premium Construction Group", noteLabel: "Our approach",
      noteText: "Good work starts with good questions.", index: "02",
    },
    index: { label: "Our capabilities", text: "Three ways to help move your project forward." },
    services: [
      {
        id: "construction-delivery", number: "01", category: "Delivery", title: "Construction delivery", headline: "Bring the work together.",
        description: "A considered build depends on many moving parts working toward the same result. We bring people, plans, materials, and site decisions into a clearer sequence from the first conversation to the finishing details.",
        image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=85", imageAlt: "Construction professionals working together on a building site", imageCaption: "Coordination from the ground up", tone: "dark",
        actionLabel: "Talk to our team", actionHref: "/contact",
        points: [
          { title: "A clear sequence", text: "Keep the work and the decisions around it moving in a considered order." },
          { title: "Connected people", text: "Help everyone involved understand the shared direction and next steps." },
          { title: "Care through completion", text: "Keep attention on the details that make a space feel finished and ready to use." },
        ],
      },
      {
        id: "design-coordination", number: "02", category: "Design", title: "Design coordination", headline: "Keep the vision and the practical in conversation.",
        description: "Good design needs room to become real. We help connect design intent with the people, plans, and practical choices that shape a build, so important decisions stay visible as the work develops.",
        image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=85", imageAlt: "Architectural plans spread out for a design discussion", imageCaption: "Turning ideas into workable decisions", tone: "light",
        actionLabel: "Talk to our team", actionHref: "/contact",
        points: [
          { title: "Design intent", text: "Keep the purpose and character of the original idea in view." },
          { title: "Practical choices", text: "Bring build considerations into the conversation early and clearly." },
          { title: "Joined-up decisions", text: "Help the right people make informed choices together." },
        ],
      },
      {
        id: "project-management", number: "03", category: "Management", title: "Project management", headline: "Clarity from brief to handover.",
        description: "A well-managed project gives people a better view of what is happening and what needs attention. We keep priorities, progress, and communication connected as the project moves forward.",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85", imageAlt: "Contemporary commercial building representing a completed project", imageCaption: "Keep the long view in sight", tone: "paper",
        actionLabel: "Talk to our team", actionHref: "/contact",
        points: [
          { title: "Planning and priorities", text: "Set a clear direction for the work and the choices ahead." },
          { title: "Progress in view", text: "Make the status of the work easier to understand as it develops." },
          { title: "Steady communication", text: "Keep conversations focused on the details that move the project forward." },
        ],
      },
    ],
    process: {
      kicker: "How we work", title: "A clear path", accent: "from start to finish.",
      intro: "Every project is different. A considered process helps people stay aligned as the work takes shape.",
      steps: [
        { number: "01", title: "Understand", text: "Start with the people, purpose, place, and priorities behind the project." },
        { number: "02", title: "Align", text: "Bring the plans and decisions into focus so everyone can move forward together." },
        { number: "03", title: "Deliver", text: "Keep the work connected, the communication clear, and the long view in sight." },
      ],
      imageNote: "Photography is shown as visual direction until Premium Construction Group's approved service imagery is available.",
    },
    closing: { eyebrow: "The next step is yours", title: "Tell us what", accent: "you're planning.", body: "Start with the project, the people, and what matters most to you.", action: "Start a conversation", href: "/contact" },
  },
  projects: {
    hero: {
      eyebrow: "Selected work", title: "A portfolio", accent: "with purpose.",
      intro: "Every place begins with an idea and the people it is meant to serve. Explore the types of projects that shape our portfolio.",
      primaryLabel: "Explore categories", primaryHref: "#portfolio", secondaryLabel: "Tell us what you're planning", secondaryHref: "/contact",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=90", imageAlt: "Contemporary commercial buildings beneath a clear sky",
      imageLabel: "Places for work and growth", noteLabel: "Built around people", noteText: "Good spaces make room for what matters.", index: "03",
    },
    portfolio: { kicker: "Project portfolio", title: "Different places.", accent: "One considered approach.", intro: "Browse by project category. Each category can grow into its own collection as approved project details are added.", note: "The images and category copy shown here are illustrative references, not verified Premium Construction Group projects." },
    categories: projectCategories.map((category) => ({
      id: category.id,
      type: category.type,
      title: category.title,
      summary: category.summary,
      image: category.image,
      alt: category.alt,
      actionLabel: `Discuss a project in ${category.type.toLowerCase()}`,
      href: "/contact",
    })),
    belief: { title: "Made with purpose.", text: "Places shaped by clear thinking, careful choices, and the people who will use them." },
    closing: { eyebrow: "Start with a conversation", title: "Have a project", accent: "in mind?", body: "Tell us what you want to create and what matters most to you.", action: "Talk to our team", href: "/contact" },
  },
  insights: {
    hero: {
      eyebrow: "Ideas & perspective", title: "Clear thinking", accent: "builds better.",
      intro: "Notes on the questions, decisions, and details that shape a thoughtful build—from the first conversation to the life of a place.",
      primaryLabel: "Explore insights", primaryHref: "#latest-insights", secondaryLabel: "Bring us a question", secondaryHref: "/contact",
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=90", imageAlt: "Construction team talking through work on site",
      imageLabel: "Perspective for the work ahead", noteLabel: "Field notes", noteText: "Good questions make space for better answers.", index: "04",
    },
    library: { kicker: "Thoughts for the build", title: "Ideas to take", accent: "into the work.", intro: "Practical perspectives on the choices that help projects move forward and places serve people well.", note: "Articles generated from feeds or with AI are saved as drafts. Review and approve each article before it appears publicly." },
    reading: { kicker: "Longer reads", title: "A little more", accent: "to consider.", intro: "Explore each idea in more detail. Select a story above to jump directly to it." },
    articles: starterInsights.map((insight) => ({ ...insight, paragraphs: [...insight.paragraphs], status: "published" as "published" | "draft", sourceUrl: "" })),
    feedUrls: [] as string[],
    closing: { eyebrow: "Every project starts somewhere", title: "Have a question", accent: "about what comes next?", body: "Tell us what you're planning and what you'd like to understand.", action: "Start a conversation", href: "/contact" },
  },
  contact: {
    hero: { eyebrow: "Reach out", title: "Let's talk about", accent: "what comes next.", intro: "A good project begins with a conversation. Tell us a little about what you're planning and we'll take it from there.", reserveLabel: "Reserve a meeting" },
    enquiry: { kicker: "Start a conversation", title: "Tell us about", accent: "your project.", index: "01 / 02" },
    next: {
      topline: "A thoughtful start", title: "Good work starts with", accent: "good questions.", intro: "Every project is different. We'll begin by understanding what matters to you.",
      steps: [
        { number: "01", title: "Tell us what you have in mind", text: "A few details are enough to help us understand where you are starting from." },
        { number: "02", title: "We take the time to listen", text: "We'll look over your brief and get back to you to learn more about the project." },
        { number: "03", title: "We shape the next steps together", text: "When the fit is right, we'll talk through a clear way forward." },
      ],
      closingLine: "Considered construction.", closingAccent: "Enduring value.",
    },
    reservation: {
      kicker: "Reserve a meeting", title: "Make time for", accent: "your next step.",
      intro: "Choose a time to meet with a Premium Construction Group expert. We'll send a confirmation as soon as your reservation is saved.",
      duration: "60", durationLabel: "minutes", daysLabel: "Weekdays", timezone: "SAST", jumpLabel: "Choose a meeting time", step: "01 / Schedule", cardTitle: "Book a conversation.",
    },
  },
};

export type SiteContent = typeof defaultSiteContent;
export type SiteInsight = SiteContent["insights"]["articles"][number];
export type SiteProjectCategory = SiteContent["projects"]["categories"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeHref(value: string) {
  return (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#") || /^https:\/\//i.test(value) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

function isSafeMedia(value: string) {
  return (value.startsWith("/") && !value.startsWith("//")) || /^https:\/\//i.test(value);
}

function normalizeValue(template: unknown, value: unknown, path: string): unknown {
  if (typeof template === "string") {
    if (typeof value !== "string") return template;
    const cleaned = value.slice(0, path.includes("paragraphs") ? 12_000 : 5_000);
    if (path.endsWith("sourceUrl")) return !cleaned || /^https?:\/\//i.test(cleaned) ? cleaned : template;
    if (/(href|url)$/i.test(path)) return isSafeHref(cleaned) ? cleaned : template;
    if (/(image|src)$/i.test(path) && !isSafeMedia(cleaned)) return template;
    if (path.endsWith(".id") || path.endsWith(".slug")) {
      const slug = cleaned.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
      return slug || template;
    }
    if (path.endsWith(".tone") && !["dark", "light", "paper"].includes(cleaned)) return template;
    if (path.endsWith(".status") && !["published", "draft"].includes(cleaned)) return template;
    if (path.endsWith(".topic") && !["Planning", "Project delivery", "Long-term value"].includes(cleaned)) return template;
    return cleaned;
  }
  if (typeof template === "boolean") return typeof value === "boolean" ? value : template;
  if (Array.isArray(template)) {
    if (path === "insights.feedUrls") {
      return Array.isArray(value) ? value.slice(0, 12).filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url) && url.length <= 2_000) : [];
    }
    if (!Array.isArray(value)) return template;
    const limit = path.endsWith("paragraphs") || path === "approach.process.steps" || path === "approach.principles.items"
      ? 12
      : path.endsWith("articles") ? 100 : path.endsWith("categories") ? 30 : path.endsWith("services") ? 20 : 30;
    const itemTemplate = template[0];
    if (itemTemplate === undefined) return [];
    return value.slice(0, limit).map((item) => normalizeValue(itemTemplate, item, `${path}[]`));
  }
  if (isRecord(template)) {
    const source = isRecord(value) ? value : {};
    return Object.fromEntries(Object.entries(template).map(([key, child]) => [key, normalizeValue(child, source[key], path ? `${path}.${key}` : key)]));
  }
  return template;
}

export function normalizeSiteContent(value: unknown): SiteContent {
  return normalizeValue(defaultSiteContent, value, "") as SiteContent;
}
