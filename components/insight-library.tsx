"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { SiteContent } from "@/lib/site-content/content";

export function InsightLibrary({ insights }: { insights: SiteContent["insights"]["articles"] }) {
  const topics = ["All insights", ...Array.from(new Set(insights.map((insight) => insight.topic)))];
  const [activeTopic, setActiveTopic] = useState("All insights");
  const filteredInsights = insights.filter(
    (insight) => activeTopic === "All insights" || insight.topic === activeTopic,
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
          {filteredInsights.length} {filteredInsights.length === 1 ? "insight" : "insights"}
        </p>
      </div>

      <div className="insight-card-grid">
        {filteredInsights.map((insight, index) => (
          <article className="insight-card" key={insight.slug}>
            <Link className="insight-card__image" href={`/insights/${insight.slug}`} aria-label={`Read: ${insight.title}`}>
              <Image
                src={insight.image}
                alt={insight.imageAlt}
                fill
                unoptimized
                sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw"
              />
              <span className="insight-card__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="insight-card__read">Read insight <span aria-hidden="true">↗</span></span>
            </Link>
            <div className="insight-card__meta">
              <span>{insight.topic}</span>
              <span>{insight.readTime}</span>
            </div>
            <h3><Link href={`/insights/${insight.slug}`}>{insight.title}</Link></h3>
            <p>{insight.excerpt}</p>
            <Link className="insight-card__link" href={`/insights/${insight.slug}`}>
              Read the full insight <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
      {filteredInsights.length === 0 && <p className="insights-empty">There are no published insights yet.</p>}
    </>
  );
}
