"use client";

/* eslint-disable @next/next/no-img-element -- portfolio images come from the media library (any URL) */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

export type ShowcaseProject = {
  slug: string; title: string; category: string; categoryLabel: string; stage: "completed" | "ongoing" | "upcoming";
  location: string; year: string; summary: string; cover: string; coverAlt: string; featured: boolean;
};

const STAGE_LABEL = { completed: "Completed", ongoing: "In progress", upcoming: "Upcoming" } as const;

/** Grid of portfolio projects with category and stage filters. */
export function ProjectShowcase({ projects, showFilters = true }: { projects: ShowcaseProject[]; showFilters?: boolean }) {
  const [category, setCategory] = useState("all");
  const [stage, setStage] = useState("all");
  const categories = useMemo(() => [...new Map(projects.filter((p) => p.category).map((p) => [p.category, p.categoryLabel])).entries()], [projects]);
  const stages = useMemo(() => [...new Set(projects.map((p) => p.stage))], [projects]);
  const visible = projects.filter((p) => (category === "all" || p.category === category) && (stage === "all" || p.stage === stage));

  if (!projects.length) return null;
  return (
    <div className="project-showcase">
      {showFilters && (categories.length > 1 || stages.length > 1) && (
        <div className="project-showcase__filters">
          {categories.length > 1 && (
            <div className="portfolio-filter" role="group" aria-label="Filter projects by category">
              <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => setCategory("all")}>All work</button>
              {categories.map(([id, label]) => <button key={id} type="button" className={category === id ? "is-active" : ""} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}
            </div>
          )}
          {stages.length > 1 && (
            <div className="project-showcase__stages" role="group" aria-label="Filter projects by stage">
              {["all", ...stages].map((value) => (
                <button key={value} type="button" className={stage === value ? "is-active" : ""} aria-pressed={stage === value} onClick={() => setStage(value)}>
                  {value === "all" ? "Any stage" : STAGE_LABEL[value as keyof typeof STAGE_LABEL]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="project-showcase__grid">
        {visible.map((project, index) => (
          <ScrollReveal as="article" key={project.slug} delay={(index % 3) * 70} className={`project-tile${project.featured && index === 0 && category === "all" && stage === "all" ? " project-tile--hero" : ""}`}>
            <Link href={`/projects/${project.slug}`}>
              <span className="project-tile__media">
                <img src={project.cover} alt={project.coverAlt || project.title} loading={index < 3 ? "eager" : "lazy"} />
                <span className={`project-tile__stage project-tile__stage--${project.stage}`}>{STAGE_LABEL[project.stage]}</span>
              </span>
              <span className="project-tile__body">
                <span className="project-tile__meta">{[project.categoryLabel, project.location, project.year].filter(Boolean).join(" · ")}</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <span className="project-tile__more">View project <span aria-hidden="true">↗</span></span>
              </span>
            </Link>
          </ScrollReveal>
        ))}
      </div>
      {!visible.length && <p className="project-showcase__empty">No projects match these filters yet.</p>}
    </div>
  );
}
