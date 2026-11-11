"use client";

import Image from "next/image";
import { useEffect, useState, type FocusEvent } from "react";
import type { HomeHeroMedia, HomeHeroSlide } from "@/lib/home-hero-slides";

function SlideMedia({
  media,
  active,
  reducedMotion,
  priority,
}: {
  media: HomeHeroMedia;
  active: boolean;
  reducedMotion: boolean;
  priority: boolean;
}) {
  if (media.type === "video" && active && !reducedMotion) {
    return (
      <video
        className="hero-slide-media__asset"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={media.poster}
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={media.src} />
      </video>
    );
  }

  const imageSrc = media.type === "video" ? media.poster : media.src;

  return (
    <Image
      className="hero-slide-media__asset"
      src={imageSrc}
      alt={media.alt}
      fill
      priority={priority}
      unoptimized
      sizes="100vw"
    />
  );
}

export function HeroSlideshow({ slides }: { slides: HomeHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setIsReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (
      slides.length < 2 ||
      !isPlaying ||
      isReducedMotion ||
      isHovered ||
      hasFocus ||
      !isDocumentVisible
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 7200);

    return () => window.clearInterval(interval);
  }, [
    hasFocus,
    isDocumentVisible,
    isHovered,
    isPlaying,
    isReducedMotion,
    slides.length,
  ]);

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
    setIsPlaying(false);
  }

  function leaveFocus(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setHasFocus(false);
    }
  }

  return (
    <section
      className="hero hero-carousel"
      id="top"
      aria-label="Featured construction stories"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={leaveFocus}
    >
      <div className="hero__backdrop" aria-hidden="true">
        {slides.map((slide, index) => {
          const active = index === activeIndex;

          return (
            <div
              className={`hero-slide-media${active ? " is-active" : ""}`}
              key={slide.id}
              aria-hidden={!active}
              inert={!active}
            >
              <SlideMedia
                media={slide.media}
                active={active}
                reducedMotion={isReducedMotion}
                priority={index === 0}
              />
            </div>
          );
        })}
      </div>
      <div className="hero__shade" aria-hidden="true" />

      <div className="hero__inner shell">
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          const Heading = index === 0 ? "h1" : "h2";

          return (
            <div
              className={`hero-slide__content${active ? " is-active" : ""}`}
              key={slide.id}
              aria-hidden={!active}
              inert={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}`}
            >
              <p className="hero-slide__eyebrow">
                <span /> {slide.eyebrow}
              </p>
              <Heading className="hero-slide__title">
                <span>{slide.headline.lead}</span>
                <em>{slide.headline.accent}</em>
              </Heading>
              <p className="hero-slide__intro">{slide.intro}</p>
              <div className="hero-slide__actions">
                <a className="button button--primary" href={slide.primaryAction.href}>
                  {slide.primaryAction.label}
                  <span aria-hidden="true">↗</span>
                </a>
                <a className="button hero-slide__secondary" href={slide.secondaryAction.href}>
                  {slide.secondaryAction.label}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
              <p className="hero-slide__caption">
                <span>Premium Construction Group Ltd</span>
                <span>{slide.caption}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="hero-carousel__footer shell">
        <a className="hero-carousel__scroll" href="#about">
          <span /> Scroll to explore
        </a>
        <div className="hero-carousel__controls" aria-label="Slideshow controls">
          <span className="hero-carousel__count" aria-hidden="true">
            {String(activeIndex + 1).padStart(2, "0")}
            <span> / {String(slides.length).padStart(2, "0")}</span>
          </span>
          <div className="hero-carousel__pagination" aria-label="Choose a slide">
            {slides.map((slide, index) => (
              <button
                className={`hero-carousel__indicator${index === activeIndex ? " is-active" : ""}`}
                key={slide.id}
                type="button"
                aria-label={`Show slide ${index + 1}: ${slide.eyebrow}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => showSlide(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            className="hero-carousel__toggle"
            type="button"
            aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            onClick={() => setIsPlaying((playing) => !playing)}
          >
            <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
          </button>
          <div className="hero-carousel__arrows">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => showSlide(activeIndex - 1)}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => showSlide(activeIndex + 1)}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
