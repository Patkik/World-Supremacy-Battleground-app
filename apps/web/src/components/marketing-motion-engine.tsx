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
        intro
          .from("[data-hero-line]", {
            yPercent: 108,
            rotate: 2,
            duration: 1.05,
            stagger: 0.12,
            clearProps: "all",
          }, 0)
          .from("[data-hero-reveal]", {
            y: 24,
            opacity: 0.25,
            duration: 0.9,
            stagger: 0.1,
            clearProps: "all",
          }, 0.15);

        const stamp = gsap.to(".hero-stamp", {
          y: -9,
          rotation: 3,
          duration: 2.7,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        });
        ScrollTrigger.create({
          trigger: ".hero",
          start: "top bottom",
          end: "bottom top",
          onToggle: self => (self.isActive ? stamp.play() : stamp.pause()),
        });

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

        gsap.fromTo(
          ".movement-number",
          { xPercent: -6, rotation: -12 },
          {
            xPercent: 5,
            rotation: -5,
            ease: "none",
            scrollTrigger: { trigger: ".movement-section", start: "top bottom", end: "bottom top", scrub: 0.7 },
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
