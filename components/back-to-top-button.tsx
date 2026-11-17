"use client";

import { useEffect, useState } from "react";

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 420);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!isVisible) return null;

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  return (
    <button
      className="home-back-to-top"
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollToTop}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="M12 19V5m-7 7 7-7 7 7" />
      </svg>
    </button>
  );
}
