"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function MarketingMotionEngine({
  root,
}: {
  root: RefObject<HTMLDivElement | null>;
}) {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        // The white lines land at .52s; the slash follows before EVENT appears.
        intro
          .from("[data-hero-line]", {
            yPercent: 115,
            duration: 0.42,
            stagger: 0.1,
            ease: "power4.out",
            clearProps: "transform",
          }, 0)
          .from("[data-hero-highlight]", {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.22,
            ease: "power2.inOut",
            clearProps: "transform,transformOrigin",
          }, 0.52)
          .from("[data-hero-event]", {
            yPercent: 115,
            opacity: 0,
            duration: 0.3,
            clearProps: "transform,opacity",
          }, 0.62)
          .from("[data-hero-sticker]", {
            scale: 1.4,
            rotation: -9,
            opacity: 0,
            duration: 0.32,
            stagger: 0.1,
            ease: "back.out(1.8)",
            clearProps: "transform,opacity",
          }, 0.72)
          .from("[data-hero-frame]", {
            y: -42,
            scale: 1.1,
            opacity: 0,
            duration: 0.5,
            ease: "power4.out",
            clearProps: "transform,opacity",
          }, 0.2)
          // Frame lands at .70s; its orange backing kicks out 80ms later.
          .from("[data-hero-frame-offset]", {
            x: 0,
            y: 0,
            duration: 0.18,
            ease: "back.out(1.6)",
            clearProps: "transform",
          }, 0.78)
          .from("[data-hero-reveal]", {
            y: 12,
            opacity: 0,
            duration: 0.35,
            stagger: 0.06,
            clearProps: "transform,opacity",
          }, 0.85);

        const sections = root.current?.querySelectorAll<HTMLElement>("[data-motion-section]") ?? [];
        const tape = root.current?.querySelector<HTMLElement>(".motion-tape-track");
        const tapeObserver = new IntersectionObserver(([entry]) => {
          if (tape) tape.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
        });
        if (tape) tapeObserver.observe(tape);

        sections.forEach(section => {
          const title = section.querySelector("[data-motion-title]");
          if (title) {
            gsap.from(title, {
              y: 44,
              opacity: 0.25,
              duration: 0.9,
              clearProps: "all",
              scrollTrigger: { trigger: section, start: "top 87%", once: true },
            });
          }
          const rows = section.querySelectorAll("[data-motion-row]");
          if (rows.length) {
            gsap.from(rows, {
              x: 24,
              opacity: 0.2,
              stagger: 0.09,
              duration: 0.75,
              clearProps: "all",
              scrollTrigger: { trigger: rows[0], start: "top 91%", once: true },
            });
          }
        });

        const movement = root.current?.querySelector(".movement-number");
        const movementSection = root.current?.querySelector(".movement-section");
        if (movement && movementSection) gsap.fromTo(
          movement,
          { xPercent: -6, rotation: -12 },
          {
            xPercent: 5,
            rotation: -5,
            ease: "none",
            scrollTrigger: { trigger: movementSection, start: "top bottom", end: "bottom top", scrub: 0.7 },
          },
        );

        const pointer = window.matchMedia("(pointer:fine) and (min-width:1024px)");
        if (!pointer.matches) return () => tapeObserver.disconnect();

        const lenis = new Lenis({ duration: 0.9, smoothWheel: true, anchors: true });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        return () => {
          tapeObserver.disconnect();
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      },
      root,
    );
    return () => media.revert();
  }, { scope: root, revertOnUpdate: true });

  return null;
}
