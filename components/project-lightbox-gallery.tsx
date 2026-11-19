"use client";

/* eslint-disable @next/next/no-img-element -- gallery images come from the media library (any URL) */
import { useCallback, useEffect, useState } from "react";

type Shot = { src: string; alt: string; caption: string };

/** Project gallery with a keyboard-friendly full-screen viewer. */
export function ProjectLightboxGallery({ images, title }: { images: Shot[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((direction: number) => setOpen((current) => (current === null ? null : (current + direction + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open, close, step]);

  if (!images.length) return null;
  const current = open === null ? null : images[open];

  return (
    <>
      <ul className="project-gallery-grid">
        {images.map((image, index) => (
          <li key={`${image.src}-${index}`} className={index % 5 === 0 ? "is-wide" : ""}>
            <button type="button" onClick={() => setOpen(index)} aria-label={`Open image ${index + 1} of ${images.length}${image.alt ? `: ${image.alt}` : ""}`}>
              <img src={image.src} alt={image.alt || `${title}, image ${index + 1}`} loading="lazy" />
              <span className="project-gallery-grid__index">{String(index + 1).padStart(2, "0")}</span>
            </button>
            {image.caption && <p aria-hidden="true">{image.caption}</p>}
          </li>
        ))}
      </ul>
      {current && open !== null && (
        <div className="project-lightbox" role="dialog" aria-modal="true" aria-label={`${title} gallery`} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <button type="button" className="project-lightbox__close" onClick={close} aria-label="Close">×</button>
          {images.length > 1 && <button type="button" className="project-lightbox__nav project-lightbox__nav--prev" onClick={() => step(-1)} aria-label="Previous image">←</button>}
          <figure>
            <img src={current.src} alt={current.alt || title} />
            <figcaption><span>{String(open + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span>{current.caption || current.alt}</figcaption>
          </figure>
          {images.length > 1 && <button type="button" className="project-lightbox__nav project-lightbox__nav--next" onClick={() => step(1)} aria-label="Next image">→</button>}
        </div>
      )}
    </>
  );
}
