"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { projectCategories, type ProjectCategoryId } from "@/lib/project-categories";

const filters: { id: "all" | ProjectCategoryId; label: string }[] = [
  { id: "all", label: "All categories" },
  { id: "commercial", label: "Commercial" },
  { id: "residential", label: "Residential" },
  { id: "infrastructure", label: "Infrastructure" },
];

export function ProjectGallery() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visibleCategories = projectCategories.filter(
    (category) => activeFilter === "all" || category.id === activeFilter,
  );

  return (
    <>
      <div className="portfolio-filter-wrap">
        <div className="portfolio-filter" role="group" aria-label="Filter portfolio categories">
          {filters.map((filter) => (
            <button
              className={activeFilter === filter.id ? "is-active" : ""}
              key={filter.id}
              type="button"
              aria-pressed={activeFilter === filter.id}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="portfolio-filter__count" aria-live="polite">
          {visibleCategories.length} {visibleCategories.length === 1 ? "category" : "categories"}
        </p>
      </div>

      <div className={`portfolio-category-grid portfolio-category-grid--${visibleCategories.length}`}>
        {visibleCategories.map((category, index) => (
          <article className="portfolio-category" id={category.id} key={category.id}>
            <div className="portfolio-category__image">
              <Image
                src={category.image}
                alt={category.alt}
                fill
                unoptimized
                sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 40vw"
              />
              <span className="portfolio-category__number">0{index + 1}</span>
              <span className="portfolio-category__type">{category.type}</span>
            </div>
            <div className="portfolio-category__body">
              <div>
                <span className="portfolio-category__label">Portfolio category</span>
                <h3>{category.title}</h3>
                <p>{category.summary}</p>
              </div>
              <Link
                className="portfolio-category__link"
                href="/contact"
                aria-label={`Discuss a project in the ${category.type.toLowerCase()} category`}
              >
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
