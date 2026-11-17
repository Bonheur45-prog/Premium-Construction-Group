export type ExpandedDetailSection = {
  title: string;
  body: string;
};

export type ExpandedDetailFocus = {
  title: string;
  text: string;
};

export type ExpandedDetailCopy = {
  accent: string;
  imageLabel: string;
  sections: ExpandedDetailSection[];
  focus: ExpandedDetailFocus[];
};

export const serviceDetailCopy: Record<string, ExpandedDetailCopy> = {
  "construction-delivery": {
    accent: "Planned with care.",
    imageLabel: "Construction delivery / visual direction",
    sections: [
      {
        title: "Set a clear sequence",
        body: "Before work moves forward, the brief, priorities, responsibilities, and key decisions need to be visible. A clear sequence helps people understand what needs to happen first and what depends on it.",
      },
      {
        title: "Connect the moving parts",
        body: "Construction brings together people, materials, plans, and changing site conditions. Coordinating those conversations helps the team respond to practical questions while keeping the shared direction in view.",
      },
      {
        title: "Carry attention through completion",
        body: "The final details shape how a place feels and works. We keep the close-out stage connected to the original brief, so outstanding decisions and finishing work have a clear path to resolution.",
      },
    ],
    focus: [
      { title: "A shared brief", text: "Make the purpose, priorities, and expectations clear to the people involved." },
      { title: "Visible decisions", text: "Keep open questions and next steps easy to understand as work develops." },
      { title: "A considered finish", text: "Give the final details the same attention as the start of the build." },
    ],
  },
  "design-coordination": {
    accent: "Ideas made workable.",
    imageLabel: "Design coordination / visual direction",
    sections: [
      {
        title: "Keep the design intent visible",
        body: "A useful design brief captures what the place should do and how it should feel. Keeping those aims in view helps the team make practical choices without losing sight of the idea behind them.",
      },
      {
        title: "Bring practical questions forward",
        body: "Materials, dimensions, services, sequencing, and site conditions can all affect a design. Raising those questions early gives the people involved more room to compare options and make informed decisions.",
      },
      {
        title: "Help decisions stay connected",
        body: "When plans change, it helps to understand what else may be affected. Clear coordination keeps the relevant people working from the same information as a project develops.",
      },
    ],
    focus: [
      { title: "Purpose and character", text: "Protect the reasons the design matters to the people who will use the place." },
      { title: "Build considerations", text: "Bring practical questions into the conversation while choices are still open." },
      { title: "Joined-up information", text: "Help decisions reach the people and plans they affect." },
    ],
  },
  "project-management": {
    accent: "Clarity at every stage.",
    imageLabel: "Project management / visual direction",
    sections: [
      {
        title: "Give the project a clear frame",
        body: "A project benefits from shared priorities, responsibilities, and an understanding of the decisions ahead. Establishing that frame makes it easier to see what needs attention and how one step relates to the next.",
      },
      {
        title: "Make progress easier to read",
        body: "Regular, focused communication helps people understand what has moved forward, what is still open, and where a decision is needed. The right level of visibility depends on the brief and the people involved.",
      },
      {
        title: "Keep the next step in view",
        body: "As circumstances change, priorities may need to be reviewed. Keeping decisions and next actions connected helps the team respond thoughtfully and continue working toward the intended outcome.",
      },
    ],
    focus: [
      { title: "Planning and priorities", text: "Create a shared view of the work, the sequence, and the choices ahead." },
      { title: "Progress and decisions", text: "Make updates and open questions easier for the team to follow." },
      { title: "Steady communication", text: "Keep conversations connected to the decisions that move work forward." },
    ],
  },
};

export const projectDetailCopy: Record<string, ExpandedDetailCopy> = {
  commercial: {
    accent: "Designed around people.",
    imageLabel: "Commercial / illustrative category image",
    sections: [
      {
        title: "Start with the people and the work",
        body: "A commercial place should support the people who use it and the work they come to do. Understanding those routines helps shape useful spaces for focus, collaboration, visitors, and shared services.",
      },
      {
        title: "Make room for change",
        body: "Teams and businesses evolve. Circulation, adaptable layouts, daylight, and access to essential services are among the considerations that can help a workplace remain useful as needs change.",
      },
      {
        title: "Coordinate decisions early",
        body: "Commercial projects bring together many design and delivery choices. Keeping requirements, plans, and practical constraints in the same conversation helps people make clearer decisions as the brief develops.",
      },
    ],
    focus: [
      { title: "How people use the space", text: "Understand daily routines, collaboration needs, and visitor journeys." },
      { title: "Comfort and access", text: "Consider movement, daylight, shared facilities, and inclusive access." },
      { title: "Adaptability", text: "Think about how the space may need to support future teams and uses." },
    ],
  },
  residential: {
    accent: "Made for everyday life.",
    imageLabel: "Residential / illustrative category image",
    sections: [
      {
        title: "Design around daily routines",
        body: "A home is shaped by the way people move through it, gather, rest, and find privacy. Those everyday patterns can guide the layout and help each space feel purposeful.",
      },
      {
        title: "Balance character and practicality",
        body: "Materials, storage, light, and circulation all affect how a home feels to live in. Considering them together helps personal character work alongside durability and ease of use.",
      },
      {
        title: "Take a longer view",
        body: "Households and needs can change over time. Thinking about maintenance, flexibility, and the life of the materials can support choices that continue to make sense well beyond handover.",
      },
    ],
    focus: [
      { title: "Comfort and privacy", text: "Shape spaces around the needs and rhythms of the people who live there." },
      { title: "Light and movement", text: "Make everyday circulation feel natural and bring attention to how rooms connect." },
      { title: "Enduring choices", text: "Consider materials and details for how they will be used and cared for." },
    ],
  },
  infrastructure: {
    accent: "Built to serve over time.",
    imageLabel: "Infrastructure / illustrative category image",
    sections: [
      {
        title: "Begin with the people who rely on it",
        body: "Infrastructure supports daily movement and essential community needs. Understanding who depends on a place, how they reach it, and what it must help them do gives the brief a strong starting point.",
      },
      {
        title: "Coordinate the systems around it",
        body: "Access, utilities, structures, and surrounding spaces need to work together. Bringing those considerations into the same planning conversation can help reveal dependencies before they become difficult to resolve.",
      },
      {
        title: "Think about performance over time",
        body: "A lasting place needs to keep serving people after the initial build. Durability, maintainability, safety, and the demands of the local context all matter when shaping decisions for the longer term.",
      },
    ],
    focus: [
      { title: "Access and movement", text: "Understand how people arrive, move through, and rely on the place." },
      { title: "Connected requirements", text: "Coordinate the physical and service needs that shape the design." },
      { title: "Long-term use", text: "Consider durability, maintenance, and the demands of the wider context." },
    ],
  },
};
