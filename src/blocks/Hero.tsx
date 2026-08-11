/**
 * Portfolio hero — programmer-first skim: mono eyebrow, stream chips,
 * motion entrance, featured glass surface (open cat grok prototype 1.0).
 */

import type { Layout } from "@/content/schema";
import heroImg from "@/assets/hero.png";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "motion/react";

type HeroProps = Extract<Layout["blocks"][number], { type: "hero" }>["props"];

const ease = [0.16, 1, 0.3, 1] as const;

/** Hero with entrance motion, stream chips, and featured matrix chrome. */
export function Hero({ name, tagline, pitch, links }: HeroProps) {
  const reduced = useReducedMotion();
  const enter = reduced
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 12 };

  return (
    <motion.div
      className="mx-card featured mx-hero w-full flex flex-col-reverse md:flex-row justify-between items-center gap-8 py-6 md:py-8"
      data-domain="platform"
      initial={enter}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      <div className="flex-1 space-y-4 min-w-0">
        <div className="text-[0.72rem] font-mono uppercase tracking-[0.16em] text-(--fg-subtle)">
          OpenCat · Systems &amp; AI
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-(--fg) leading-[1.1]">
          {name}
        </h1>
        <p className="text-lg md:text-xl font-medium text-(--fg-muted)">
          {tagline}
        </p>
        {pitch && (
          <p className="text-base text-(--fg-muted) max-w-2xl leading-relaxed">
            {pitch}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-0.5" aria-label="Work streams">
          <span className="mx-chip mx-chip--job">WelTel · job</span>
          <span className="mx-chip mx-chip--oss">OpenCat · OSS</span>
          <span className="mx-chip mx-chip--accent">MCP · GOAP · GenUI</span>
        </div>

        {links && links.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {links.map((link, idx) => (
              <Button
                key={idx}
                variant={idx === 0 ? "default" : "outline"}
                asChild
              >
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </div>

      <motion.div
        className="mx-hero-avatar w-36 h-36 md:w-44 md:h-44 shrink-0 rounded-xl overflow-hidden border border-(--hairline) bg-(--bg-sunken) p-2 flex items-center justify-center"
        initial={reduced ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: reduced ? 0 : 0.08, ease }}
        whileHover={reduced ? undefined : { y: -3, transition: { duration: 0.2 } }}
      >
        <img
          src={heroImg}
          alt={name}
          className="w-full h-full object-cover rounded-lg"
        />
      </motion.div>
    </motion.div>
  );
}
