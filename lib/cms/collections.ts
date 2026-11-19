/**
 * Every content type the CMS manages, described once. The list screen, the editor form, the save/publish
 * rules and the public lookups are all generated from these definitions — adding a new section is
 * a matter of adding an entry here (plus where it appears on the website).
 *
 * Safe to import in browser code (no server-only imports).
 */

export type Option = { value: string; label: string };

export type FieldType =
  | "text" | "textarea" | "richtext" | "image" | "gallery" | "select" | "lines" | "pairs" | "toggle" | "date" | "url" | "email";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  max?: number;
  rows?: number;
  /** Must be filled before the item can be published. */
  requiredToPublish?: boolean;
  /** For select fields. "projectCategories" is filled in from Pages → Projects at runtime. */
  options?: Option[] | "projectCategories";
  /** For "pairs" lists: the two columns. */
  pair?: { a: { key: string; label: string; max?: number }; b: { key: string; label: string; max?: number; multiline?: boolean }; itemLabel: string; maxItems?: number };
  /** For "lines" lists. */
  itemLabel?: string;
  maxItems?: number;
  /** For "image" fields: the companion description field. */
  altKey?: string;
  /** Wide fields span both columns of the form grid. */
  wide?: boolean;
};

export type Fieldset = { legend: string; description?: string; fields: FieldDef[] };

export type CollectionDef = {
  id: CollectionId;
  label: string;
  singular: string;
  /** One sentence telling the editor where these items appear. */
  description: string;
  icon: string;
  titleLabel: string;
  createPlaceholder: string;
  /** Public web address of one item, or null when items have no page of their own. */
  publicPath: ((slug: string) => string) | null;
  /** The list page that shows the items on the website. */
  sitePath: string;
  /** Field shown as the thumbnail in lists. */
  thumbKey?: string;
  /** Short line under the title in lists. */
  subtitle: (data: Record<string, unknown>) => string;
  /** Label of the "show_on_home" switch, or null to hide it. */
  homeToggle: string | null;
  homeDefault?: boolean;
  fieldsets: Fieldset[];
  seo: boolean;
  /** Plain-language explanation shown when the list is empty. */
  emptyHint: string;
};

export const COLLECTION_IDS = ["services", "projects", "insights", "testimonials", "partners", "team", "jobs"] as const;
export type CollectionId = (typeof COLLECTION_IDS)[number];

export const SEO_FIELDSET: Fieldset = {
  legend: "Search engines & sharing",
  description: "How this page looks on Google and when shared on WhatsApp, LinkedIn or Facebook. Leave empty to use the title, summary and main photo.",
  fields: [
    { key: "seoTitle", label: "Title on Google", type: "text", max: 70, hint: "Up to 70 characters." },
    { key: "metaDescription", label: "Description on Google", type: "textarea", rows: 3, max: 170, hint: "One or two sentences, up to about 160 characters." },
    { key: "socialImage", label: "Photo when shared", type: "image", hint: "Optional. Empty = the main photo." },
  ],
};

const s = (value: unknown) => (typeof value === "string" ? value : "");
const join = (...parts: unknown[]) => parts.map(s).filter(Boolean).join(" · ");

export const PROJECT_STAGES: Option[] = [
  { value: "completed", label: "Completed" },
  { value: "ongoing", label: "In progress" },
  { value: "upcoming", label: "Upcoming" },
];

export const JOB_TYPES: Option[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

export const CARD_TONES: Option[] = [
  { value: "dark", label: "Dark blue" },
  { value: "light", label: "Light" },
  { value: "paper", label: "Warm paper" },
];

export const COLLECTIONS: Record<CollectionId, CollectionDef> = {
  services: {
    id: "services",
    label: "Services",
    singular: "service",
    description: "What Premium Construction Group offers. Each published service has its own page and appears on the Services page; switch on “Show on the home page” to list it there too.",
    icon: "layers",
    titleLabel: "Service name",
    createPlaceholder: "Name of a new service, e.g. Renovations",
    publicPath: (slug) => `/services/${slug}`,
    sitePath: "/services",
    thumbKey: "image",
    subtitle: (d) => join(d.category, d.headline),
    homeToggle: "Show on the home page",
    homeDefault: true,
    seo: true,
    emptyHint: "Add your first service. It will get its own page and appear on the Services page.",
    fieldsets: [
      {
        legend: "Texts",
        fields: [
          { key: "title", label: "Service name", type: "text", max: 120, requiredToPublish: true },
          { key: "category", label: "Small label above the name", type: "text", max: 40, placeholder: "e.g. Delivery" },
          { key: "headline", label: "Headline", type: "text", max: 140, hint: "A short promise shown on the card, e.g. “Bring the work together.”" },
          { key: "description", label: "Short description", type: "textarea", rows: 4, max: 600, requiredToPublish: true, hint: "Shown on cards and at the top of the service page." },
          { key: "accent", label: "Highlighted words on the service page", type: "text", max: 80, hint: "Optional, e.g. “Planned with care.”" },
        ],
      },
      {
        legend: "Key points",
        description: "Three short points work best. They appear on the service card and page.",
        fields: [
          { key: "points", label: "Points", type: "pairs", pair: { a: { key: "title", label: "Point", max: 80 }, b: { key: "text", label: "Explanation", max: 240, multiline: true }, itemLabel: "point", maxItems: 6 } },
        ],
      },
      {
        legend: "Service page",
        description: "The longer explanation on the service's own page.",
        fields: [
          { key: "sections", label: "Sections", type: "pairs", pair: { a: { key: "title", label: "Section title", max: 100 }, b: { key: "body", label: "Text", max: 1500, multiline: true }, itemLabel: "section", maxItems: 8 } },
          { key: "focus", label: "What we focus on", type: "pairs", pair: { a: { key: "title", label: "Focus", max: 80 }, b: { key: "text", label: "Explanation", max: 300, multiline: true }, itemLabel: "focus point", maxItems: 6 } },
        ],
      },
      {
        legend: "Photo",
        fields: [
          { key: "image", label: "Main photo", type: "image", altKey: "imageAlt", requiredToPublish: true, hint: "Used on the card and at the top of the service page." },
          { key: "imageCaption", label: "Caption on the photo", type: "text", max: 120 },
          { key: "tone", label: "Card colour", type: "select", options: CARD_TONES },
        ],
      },
    ],
  },

  projects: {
    id: "projects",
    label: "Projects",
    singular: "project",
    description: "Completed and ongoing work. Published projects appear on the Projects page and their category page, each with its own page and photo gallery.",
    icon: "building",
    titleLabel: "Project name",
    createPlaceholder: "Name of a new project, e.g. Kacyiru office pavilion",
    publicPath: (slug) => `/projects/${slug}`,
    sitePath: "/projects",
    thumbKey: "cover",
    subtitle: (d) => join(d.location, d.year),
    homeToggle: "Feature this project (shown first and larger)",
    seo: true,
    emptyHint: "Add your first project with a cover photo and a short summary, then publish it to start the portfolio.",
    fieldsets: [
      {
        legend: "Texts",
        fields: [
          { key: "title", label: "Project name", type: "text", max: 160, requiredToPublish: true },
          { key: "summary", label: "Short summary", type: "textarea", rows: 3, max: 600, requiredToPublish: true, hint: "One or two sentences for cards and search results." },
          { key: "body", label: "The story", type: "richtext", hint: "The brief, the challenge, how the team delivered it, and the result." },
        ],
      },
      {
        legend: "Details",
        fields: [
          { key: "category", label: "Category", type: "select", options: "projectCategories", hint: "Categories are managed in Pages → Projects." },
          { key: "stage", label: "Stage", type: "select", options: PROJECT_STAGES },
          { key: "location", label: "Location", type: "text", max: 160, placeholder: "e.g. Kigali, Rwanda" },
          { key: "year", label: "Year", type: "text", max: 20, placeholder: "e.g. 2025 or 2024–2026" },
          { key: "client", label: "Client (optional)", type: "text", max: 160, hint: "Leave empty to keep the client private." },
        ],
      },
      {
        legend: "Key facts",
        description: "Shown in the project's data sheet, e.g. Floor area · 2,400 m².",
        fields: [
          { key: "facts", label: "Facts", type: "pairs", pair: { a: { key: "label", label: "Fact", max: 60 }, b: { key: "value", label: "Value", max: 160 }, itemLabel: "fact", maxItems: 12 } },
        ],
      },
      {
        legend: "Photos",
        fields: [
          { key: "cover", label: "Cover photo", type: "image", altKey: "coverAlt", requiredToPublish: true },
          { key: "gallery", label: "Gallery", type: "gallery", maxItems: 40, hint: "Progress shots, finished spaces and details. Reorder with the arrows." },
        ],
      },
    ],
  },

  insights: {
    id: "insights",
    label: "Blog",
    singular: "article",
    description: "Articles on the website's Insights (blog) page. Each published article has its own page, appears in the RSS feed, and can be emailed to subscribers when first published.",
    icon: "newspaper",
    titleLabel: "Article title",
    createPlaceholder: "Title of a new article",
    publicPath: (slug) => `/insights/${slug}`,
    sitePath: "/insights",
    thumbKey: "image",
    subtitle: (d) => join(d.topic, d.author),
    homeToggle: "Show on the home page",
    homeDefault: true,
    seo: true,
    emptyHint: "Write your first article. Use the editor's headings, lists and photos — it saves as a draft until you publish.",
    fieldsets: [
      {
        legend: "Article",
        fields: [
          { key: "title", label: "Title", type: "text", max: 160, requiredToPublish: true },
          { key: "excerpt", label: "Short summary", type: "textarea", rows: 3, max: 400, requiredToPublish: true, hint: "Shown under the title and on article cards." },
          { key: "body", label: "Article", type: "richtext", requiredToPublish: true },
          { key: "takeaway", label: "The central idea", type: "textarea", rows: 2, max: 300, hint: "One sentence shown beside the article." },
          { key: "questions", label: "Questions to take into the conversation", type: "lines", itemLabel: "question", maxItems: 6, hint: "Optional. Shown at the end of the article." },
        ],
      },
      {
        legend: "Details",
        fields: [
          { key: "topic", label: "Topic", type: "text", max: 40, placeholder: "e.g. Planning", hint: "Articles with the same topic are suggested together." },
          { key: "author", label: "Author", type: "text", max: 120, placeholder: "Premium Construction Group" },
          { key: "publishedAt", label: "Publication date", type: "date", hint: "Empty = the day you publish." },
          { key: "sourceUrl", label: "Source link (optional)", type: "url", hint: "If the article is based on another publication." },
        ],
      },
      {
        legend: "Photo",
        fields: [{ key: "image", label: "Cover photo", type: "image", altKey: "imageAlt", requiredToPublish: true }],
      },
    ],
  },

  testimonials: {
    id: "testimonials",
    label: "Testimonials",
    singular: "testimonial",
    description: "Words from real clients. Published testimonials appear on the home page and the About page.",
    icon: "quote",
    titleLabel: "Client name",
    createPlaceholder: "Name of the client who gave the testimonial",
    publicPath: null,
    sitePath: "/about#testimonials",
    thumbKey: "photo",
    subtitle: (d) => join(d.role, d.company),
    homeToggle: "Show on the home page",
    homeDefault: true,
    seo: false,
    emptyHint: "Add what a client said about working with Premium Construction Group. Only publish testimonials the client agreed to share.",
    fieldsets: [
      {
        legend: "Testimonial",
        fields: [
          { key: "quote", label: "What they said", type: "textarea", rows: 5, max: 700, requiredToPublish: true },
          { key: "title", label: "Client name", type: "text", max: 120, requiredToPublish: true },
          { key: "role", label: "Role", type: "text", max: 120, placeholder: "e.g. Managing Director" },
          { key: "company", label: "Company or project", type: "text", max: 160 },
        ],
      },
      { legend: "Photo", fields: [{ key: "photo", label: "Photo (optional)", type: "image", altKey: "photoAlt" }] },
    ],
  },

  partners: {
    id: "partners",
    label: "Partners",
    singular: "partner",
    description: "Companies and organisations you work with. Published logos appear in a strip on the home page and the About page.",
    icon: "handshake",
    titleLabel: "Company name",
    createPlaceholder: "Name of a partner or client company",
    publicPath: null,
    sitePath: "/about#partners",
    thumbKey: "logo",
    subtitle: (d) => s(d.website).replace(/^https?:\/\//, ""),
    homeToggle: "Show on the home page",
    homeDefault: true,
    seo: false,
    emptyHint: "Add a partner with their logo. Logos on a transparent or white background look best.",
    fieldsets: [
      {
        legend: "Partner",
        fields: [
          { key: "title", label: "Company name", type: "text", max: 120, requiredToPublish: true },
          { key: "logo", label: "Logo", type: "image", requiredToPublish: true, hint: "PNG or WebP with a transparent background works best." },
          { key: "website", label: "Website (optional)", type: "url", hint: "The logo links here." },
        ],
      },
    ],
  },

  team: {
    id: "team",
    label: "Team",
    singular: "team member",
    description: "The people behind the work. Published team members appear on the About page in the order you set.",
    icon: "users",
    titleLabel: "Full name",
    createPlaceholder: "Full name of a team member",
    publicPath: null,
    sitePath: "/about#team",
    thumbKey: "photo",
    subtitle: (d) => s(d.role),
    homeToggle: null,
    seo: false,
    emptyHint: "Add a team member with a photo and their role. Use the order number to arrange them.",
    fieldsets: [
      {
        legend: "Team member",
        fields: [
          { key: "title", label: "Full name", type: "text", max: 120, requiredToPublish: true },
          { key: "role", label: "Role", type: "text", max: 120, requiredToPublish: true, placeholder: "e.g. Project Manager" },
          { key: "bio", label: "Short bio", type: "textarea", rows: 4, max: 600 },
          { key: "linkedin", label: "LinkedIn profile (optional)", type: "url" },
          { key: "email", label: "Email (optional)", type: "email", hint: "Shown publicly." },
        ],
      },
      { legend: "Photo", fields: [{ key: "photo", label: "Photo", type: "image", altKey: "photoAlt", requiredToPublish: true, hint: "A square or portrait photo works best." }] },
    ],
  },

  jobs: {
    id: "jobs",
    label: "Careers",
    singular: "job opening",
    description: "Open positions. Published jobs appear on the Careers page, each with its own page and an apply button.",
    icon: "briefcase",
    titleLabel: "Job title",
    createPlaceholder: "Title of a new job, e.g. Site Engineer",
    publicPath: (slug) => `/careers/${slug}`,
    sitePath: "/careers",
    subtitle: (d) => join(d.location, JOB_TYPES.find((type) => type.value === d.type)?.label, d.deadline ? `apply by ${s(d.deadline)}` : ""),
    homeToggle: null,
    seo: true,
    emptyHint: "Add a job opening. Set a closing date and it disappears from the website automatically after that day.",
    fieldsets: [
      {
        legend: "The job",
        fields: [
          { key: "title", label: "Job title", type: "text", max: 120, requiredToPublish: true },
          { key: "summary", label: "Short summary", type: "textarea", rows: 3, max: 400, requiredToPublish: true, hint: "Shown on the Careers page." },
          { key: "body", label: "Job description", type: "richtext", requiredToPublish: true, hint: "Responsibilities, requirements and what you offer." },
        ],
      },
      {
        legend: "Details",
        fields: [
          { key: "location", label: "Location", type: "text", max: 120, placeholder: "e.g. Kigali" },
          { key: "type", label: "Type", type: "select", options: JOB_TYPES },
          { key: "department", label: "Team", type: "text", max: 80, placeholder: "e.g. Site operations" },
          { key: "deadline", label: "Closing date", type: "date", hint: "The job is hidden from the website after this day." },
        ],
      },
      {
        legend: "How to apply",
        description: "Fill in at least one. Applicants see an Apply button.",
        fields: [
          { key: "applyEmail", label: "Send applications to (email)", type: "email" },
          { key: "applyUrl", label: "Or apply on this web page", type: "url" },
        ],
      },
    ],
  },
};

export function isCollectionId(value: unknown): value is CollectionId {
  return typeof value === "string" && (COLLECTION_IDS as readonly string[]).includes(value);
}

/** All fields of a collection, including SEO ones. */
export function allFields(def: CollectionDef): FieldDef[] {
  return [...def.fieldsets, ...(def.seo ? [SEO_FIELDSET] : [])].flatMap((set) => set.fields);
}

export const SOCIAL_PLATFORMS: Option[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "pinterest", label: "Pinterest" },
  { value: "threads", label: "Threads" },
];
