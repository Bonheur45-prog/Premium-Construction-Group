"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { SiteProjectCategory } from "@/lib/site-content/content";

export function ProjectGallery({ categories }: { categories: SiteProjectCategory[] }) {
  const filters = [{ id: "all", label: "All categories" }, ...categories.map((category) => ({ id: category.id, label: category.type }))];
  const [activeFilter, setActiveFilter] = useState("all");
  const visibleCategories = categories.filter(
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
                href={category.href}
                aria-label={category.actionLabel}
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
