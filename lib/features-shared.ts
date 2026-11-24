/**
 * Company feature switches (CMS → Administration → Features). Isomorphic: the defaults and the
 * shape are shared by the server, the CMS screen and the portal. Turning a feature off hides it
 * everywhere at once; nothing is ever deleted.
 */
export type EstimatorType = { id: string; label: string; ratePerM2: number };
export type EstimatorFinish = { id: string; label: string; multiplier: number; description: string };

export type Features = {
  signup: { enabled: boolean };
  chat: { enabled: boolean; voiceNotes: boolean; videoCalls: boolean; editMinutes: number };
  files: { enabled: boolean; quotaMb: number; maxFileMb: number; compressImages: boolean };
  quotes: { enabled: boolean; currency: string; vatRate: number; validityDays: number };
  progress: { enabled: boolean; clientComments: boolean };
  portalMeetings: { enabled: boolean };
  push: { enabled: boolean; appName: string };
  estimator: { enabled: boolean; types: EstimatorType[]; finishes: EstimatorFinish[]; spread: number; disclaimer: string };
  whatsapp: { enabled: boolean; number: string; message: string };
  sections: { blog: boolean; testimonials: boolean; partners: boolean; team: boolean; careers: boolean };
};

export const DEFAULT_FEATURES: Features = {
  signup: { enabled: true },
  chat: { enabled: true, voiceNotes: true, videoCalls: true, editMinutes: 15 },
  files: { enabled: true, quotaMb: 100, maxFileMb: 100, compressImages: true },
  quotes: { enabled: true, currency: "RWF", vatRate: 18, validityDays: 30 },
  progress: { enabled: true, clientComments: true },
  portalMeetings: { enabled: true },
  push: { enabled: true, appName: "PCG Client Space" },
  estimator: {
    // Off until the company enters its real prices — these figures are placeholders only.
    enabled: false,
    types: [
      { id: "house", label: "Family house", ratePerM2: 450_000 }, // TODO: real rate from the company
      { id: "apartments", label: "Apartment building", ratePerM2: 520_000 }, // TODO: real rate from the company
      { id: "commercial", label: "Office / commercial building", ratePerM2: 600_000 }, // TODO: real rate from the company
      { id: "warehouse", label: "Warehouse / industrial", ratePerM2: 300_000 }, // TODO: real rate from the company
      { id: "renovation", label: "Renovation", ratePerM2: 220_000 }, // TODO: real rate from the company
    ],
    finishes: [
      { id: "standard", label: "Standard", multiplier: 1, description: "Durable, well-made finishes chosen for value." },
      { id: "premium", label: "Premium", multiplier: 1.3, description: "Higher-grade materials, fittings and detailing." }, // TODO: confirm multiplier
      { id: "luxury", label: "Luxury", multiplier: 1.7, description: "Bespoke finishes and specialist craftsmanship." }, // TODO: confirm multiplier
    ],
    spread: 12,
    disclaimer: "This is an indicative range only, not a quotation. Your real price depends on the site, design and specification — we confirm it after a conversation.",
  },
  whatsapp: { enabled: false, number: "", message: "Hello, I'd like to talk about a project." },
  sections: { blog: true, testimonials: true, partners: true, team: true, careers: true },
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
};
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const text = (value: unknown, fallback: string, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : fallback);
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Cleans stored or submitted switches; anything missing or invalid falls back to the default. */
export function normalizeFeatures(input: unknown): Features {
  const raw = record(input);
  const d = DEFAULT_FEATURES;
  const chat = record(raw.chat), files = record(raw.files), quotes = record(raw.quotes), progress = record(raw.progress);
  const estimator = record(raw.estimator), whatsapp = record(raw.whatsapp), sections = record(raw.sections), push = record(raw.push);
  const types = Array.isArray(estimator.types)
    ? estimator.types.map(record).map((item, index) => ({ id: slug(text(item.id, "", 40) || text(item.label, `type-${index}`, 60)) || `type-${index}`, label: text(item.label, "", 60), ratePerM2: clampNumber(item.ratePerM2, 0, 0, 100_000_000) })).filter((item) => item.label).slice(0, 12)
    : d.estimator.types;
  const finishes = Array.isArray(estimator.finishes)
    ? estimator.finishes.map(record).map((item, index) => ({ id: slug(text(item.id, "", 40) || text(item.label, `finish-${index}`, 60)) || `finish-${index}`, label: text(item.label, "", 40), multiplier: clampNumber(item.multiplier, 1, 0.1, 10), description: text(item.description, "", 160) })).filter((item) => item.label).slice(0, 6)
    : d.estimator.finishes;
  return {
    signup: { enabled: bool(record(raw.signup).enabled, d.signup.enabled) },
    chat: { enabled: bool(chat.enabled, d.chat.enabled), voiceNotes: bool(chat.voiceNotes, d.chat.voiceNotes), videoCalls: bool(chat.videoCalls, d.chat.videoCalls), editMinutes: clampNumber(chat.editMinutes, d.chat.editMinutes, 0, 1440) },
    files: { enabled: bool(files.enabled, d.files.enabled), quotaMb: clampNumber(files.quotaMb, d.files.quotaMb, 10, 10_000), maxFileMb: clampNumber(files.maxFileMb, d.files.maxFileMb, 1, 10_000), compressImages: bool(files.compressImages, d.files.compressImages) },
    quotes: { enabled: bool(quotes.enabled, d.quotes.enabled), currency: text(quotes.currency, d.quotes.currency, 6).toUpperCase() || "RWF", vatRate: clampNumber(quotes.vatRate, d.quotes.vatRate, 0, 50), validityDays: clampNumber(quotes.validityDays, d.quotes.validityDays, 1, 365) },
    progress: { enabled: bool(progress.enabled, d.progress.enabled), clientComments: bool(progress.clientComments, d.progress.clientComments) },
    portalMeetings: { enabled: bool(record(raw.portalMeetings).enabled, d.portalMeetings.enabled) },
    push: { enabled: bool(push.enabled, d.push.enabled), appName: text(push.appName, d.push.appName, 40) || d.push.appName },
    estimator: { enabled: bool(estimator.enabled, d.estimator.enabled), types: types.length ? types : d.estimator.types, finishes: finishes.length ? finishes : d.estimator.finishes, spread: clampNumber(estimator.spread, d.estimator.spread, 0, 50), disclaimer: text(estimator.disclaimer, d.estimator.disclaimer, 400) },
    whatsapp: { enabled: bool(whatsapp.enabled, d.whatsapp.enabled), number: text(whatsapp.number, d.whatsapp.number, 20).replace(/[^\d]/g, ""), message: text(whatsapp.message, d.whatsapp.message, 200) },
    sections: Object.fromEntries(Object.entries(d.sections).map(([key, value]) => [key, bool(sections[key], value)])) as Features["sections"],
  };
}

/** What the portal needs to know (never includes estimator prices or anything staff-only). */
export type PortalFeatures = Pick<Features, "chat" | "files" | "quotes" | "progress" | "portalMeetings" | "push">;
export const portalFeatures = (features: Features): PortalFeatures => ({ chat: features.chat, files: features.files, quotes: features.quotes, progress: features.progress, portalMeetings: features.portalMeetings, push: features.push });
