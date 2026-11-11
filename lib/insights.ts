export type InsightTopic = "Planning" | "Project delivery" | "Long-term value";

export type Insight = {
  slug: string;
  number: string;
  topic: InsightTopic;
  title: string;
  excerpt: string;
  readTime: string;
  image: string;
  imageAlt: string;
  paragraphs: [string, string, string];
  takeaway: string;
};

// Starter editorial content for the future custom CMS. Replace with approved PCG articles.
export const insights: Insight[] = [
  {
    slug: "a-better-build-starts-before-site",
    number: "01",
    topic: "Planning",
    title: "A better build starts before the first site meeting",
    excerpt:
      "The most useful early conversations bring the purpose, priorities, and practical limits of a project into the same room.",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1500&q=85",
    imageAlt: "Construction team reviewing plans on site",
    paragraphs: [
      "Before the first material is selected, a project has already begun taking shape. The brief, the budget, the site, and the people who will use the finished place all influence the decisions that follow.",
      "Start by making those priorities visible. What must the space do? Which decisions are fixed, and where is there room to explore? Bringing these questions together early gives everyone a shared point of reference as the work develops.",
      "A useful plan can evolve as new information appears. Its purpose is to help the team understand what matters, see the choices ahead, and make the next decision with the whole project in view.",
    ],
    takeaway: "Clarity at the beginning gives better decisions somewhere to start.",
  },
  {
    slug: "clear-communication-is-part-of-the-build",
    number: "02",
    topic: "Project delivery",
    title: "Clear communication is part of the build",
    excerpt:
      "Good project communication turns updates into understanding, keeping decisions visible as plans meet the realities of delivery.",
    readTime: "4 min read",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1500&q=85",
    imageAlt: "Building work progressing on a construction site",
    paragraphs: [
      "A project brings together people with different responsibilities and different views of the work. Shared information helps each person see how their decisions connect to the wider plan.",
      "Regular updates are most useful when they make the next steps plain: what has changed, what needs a decision, who is involved, and when the team will revisit it. That rhythm makes it easier to raise questions while there is still room to respond.",
      "The tools can be simple. A clear record of decisions, named points of contact, and agreed check-in moments can help reduce confusion and make conversations more productive throughout delivery.",
    ],
    takeaway: "Make the next decision easy to see, understand, and own.",
  },
  {
    slug: "designing-for-the-life-of-a-place",
    number: "03",
    topic: "Long-term value",
    title: "Designing for the life of a place",
    excerpt:
      "A finished building is only the beginning. Consider how people will move through it, care for it, and adapt it over time.",
    readTime: "6 min read",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1500&q=85",
    imageAlt: "Contemporary building framed by mature trees",
    paragraphs: [
      "A place keeps working long after the construction team leaves. The routines, maintenance needs, and changing priorities of the people who use it become part of its real performance.",
      "Thinking about those everyday patterns early can help shape practical choices. Where do people enter and gather? Which areas will need regular care? Could the space support different needs as the years pass?",
      "No brief can predict everything about the future. But asking how a place might be used, cared for, and adapted encourages decisions that support its purpose beyond opening day.",
    ],
    takeaway: "The long view begins with the everyday life of a place.",
  },
];
