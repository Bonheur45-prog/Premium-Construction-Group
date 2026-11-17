"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { SiteProjectCategory } from "@/lib/site-content/content";

export function ProjectGallery({ categories }: { categories: SiteProjectCategory[] }) {
  const filters = [{ id: "all", label: "All categories" }, ...categories.map((category) => ({ id: category.id, label: category.type }))];
  const [activeFilter, setActiveFilter] = useState("all");
  const visibleCategories = categories.filter(
    (category) => activeFilter === "all" || category.id === activeFilter,
  );

  return (
    <>
      <ScrollReveal className="portfolio-filter-wrap">
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
      </ScrollReveal>

      <div className={`portfolio-category-grid portfolio-category-grid--${visibleCategories.length}`}>
        {visibleCategories.map((category, index) => (
          <ScrollReveal as="article" className="portfolio-category" id={category.id} key={category.id} delay={index * 90}>
            <Link className="portfolio-category__card-link" href={`/projects/${category.id}`} aria-label={`Explore ${category.title}`}>
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
                <span className="portfolio-category__link" aria-hidden="true">
                <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </>
  );
}
