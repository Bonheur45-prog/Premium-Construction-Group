"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PublicInsight } from "@/lib/cms/public";

export function InsightLibrary({ insights }: { insights: Pick<PublicInsight, "slug" | "title" | "image" | "imageAlt" | "topic" | "readTime" | "excerpt">[] }) {
  const topics = ["All articles", ...Array.from(new Set(insights.map((insight) => insight.topic).filter(Boolean)))];
  const [activeTopic, setActiveTopic] = useState("All articles");
  const filteredInsights = insights.filter(
    (insight) => activeTopic === "All articles" || insight.topic === activeTopic,
  );

  return (
    <>
      <div className="insights-controls">
        <div className="insights-filter" role="group" aria-label="Filter insights by topic">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              aria-pressed={activeTopic === topic}
              onClick={() => setActiveTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
        <p className="insights-count" aria-live="polite">
          {filteredInsights.length} {filteredInsights.length === 1 ? "article" : "articles"}
        </p>
      </div>

      <div className="insight-card-grid">
        {filteredInsights.map((insight, index) => (
          <article className="insight-card card-clickable" key={insight.slug}>
            <Link className="insight-card__image" href={`/insights/${insight.slug}`} tabIndex={-1} aria-hidden="true">
              <Image
                src={insight.image}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw"
              />
              <span className="insight-card__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="insight-card__read">Read insight <span aria-hidden="true">↗</span></span>
            </Link>
            <div className="insight-card__meta">
              {insight.topic && <span>{insight.topic}</span>}
              <span>{insight.readTime}</span>
            </div>
            <h3><Link className="card-clickable__link" href={`/insights/${insight.slug}`}>{insight.title}</Link></h3>
            <p>{insight.excerpt}</p>
            <span className="insight-card__link" aria-hidden="true">
              Read the full article <span>→</span>
            </span>
          </article>
        ))}
      </div>
      {filteredInsights.length === 0 && <p className="insights-empty">No articles have been published yet.</p>}
    </>
  );
}
