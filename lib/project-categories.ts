export type ProjectCategoryId = "commercial" | "residential" | "infrastructure";

export type ProjectCategory = {
  id: ProjectCategoryId;
  type: string;
  title: string;
  summary: string;
  image: string;
  alt: string;
  className: string;
};

// These are portfolio categories and illustrative references, not verified PCG projects.
export const projectCategories: ProjectCategory[] = [
  {
    id: "commercial",
    type: "Commercial",
    title: "Places to work and grow",
    summary: "Workplaces and shared environments shaped around the people who use them.",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85",
    alt: "Modern glass and steel commercial buildings",
    className: "project-card--tall",
  },
  {
    id: "residential",
    type: "Residential",
    title: "Made for everyday living",
    summary: "Homes shaped around daily life, comfort, and a sense of belonging.",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    alt: "A calm, contemporary residential interior",
    className: "",
  },
  {
    id: "infrastructure",
    type: "Infrastructure",
    title: "Built for what comes next",
    summary: "Foundational spaces designed to serve people and communities over time.",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85",
    alt: "Sculptural modern architecture viewed from below",
    className: "",
  },
];
