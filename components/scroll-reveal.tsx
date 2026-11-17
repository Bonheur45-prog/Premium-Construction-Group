"use client";

import { createElement, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

type ScrollRevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
  "aria-label"?: string;
};

export function ScrollReveal({ as = "div", children, className = "", delay = 0, id, "aria-label": ariaLabel }: ScrollRevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const revealNow = () => {
      element.classList.add("is-ready", "is-visible");
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      revealNow();
      return;
    }

    element.classList.add("is-ready");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("is-visible");
          observer.unobserve(element);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref: elementRef,
      className: `scroll-reveal${className ? ` ${className}` : ""}`,
      id,
      "aria-label": ariaLabel,
      style: { "--reveal-delay": `${delay}ms` } as CSSProperties,
    },
    children,
  );
}

export function PageScrollProgress() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const range = document.documentElement.scrollHeight - window.innerHeight;
        const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
        progressRef.current?.style.setProperty("--page-progress", `${progress * 100}%`);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <div ref={progressRef} className="page-scroll-progress" aria-hidden="true"><span /></div>;
}
