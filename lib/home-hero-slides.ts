export type HomeHeroMedia =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; poster: string; alt: string };

export type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  headline: { lead: string; accent: string };
  intro: string;
  primaryAction: { label: string; href: string };
  secondaryAction: { label: string; href: string };
  media: HomeHeroMedia;
  caption: string;
};

// Starting homepage content for the admin editor. A video slide uses
// { type: "video", src, poster, alt }.
export const homeHeroSlides: HomeHeroSlide[] = [
  {
    id: "built-with-intent",
    eyebrow: "Built with intent",
    headline: { lead: "The future takes", accent: "shape here." },
    intro:
      "Thoughtful construction. Clear communication. A lasting sense of place. Let's make something that matters.",
    primaryAction: { label: "Tell us what you're building", href: "/contact" },
    secondaryAction: { label: "Explore our work", href: "#projects" },
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2400&q=90",
      alt: "Construction professionals at work on a building site",
    },
    caption: "Thoughtful from the ground up",
  },
  {
    id: "spaces-with-purpose",
    eyebrow: "Spaces with purpose",
    headline: { lead: "Made for the", accent: "way forward." },
    intro:
      "Considered design and careful delivery come together to create places people are proud to call their own.",
    primaryAction: { label: "Start a conversation", href: "/contact" },
    secondaryAction: { label: "See selected work", href: "#projects" },
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=90",
      alt: "Modern commercial buildings reaching into the sky",
    },
    caption: "Thoughtfully shaped for people",
  },
  {
    id: "built-to-last",
    eyebrow: "Made to last",
    headline: { lead: "Good work begins", accent: "with trust." },
    intro:
      "A clear process, capable partners, and care in every detail make better builds possible.",
    primaryAction: { label: "Talk about your project", href: "/contact" },
    secondaryAction: { label: "Our approach", href: "/approach" },
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=2400&q=90",
      alt: "Sculptural contemporary architecture viewed from below",
    },
    caption: "Crafted for the long view",
  },
];
