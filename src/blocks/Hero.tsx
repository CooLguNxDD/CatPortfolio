import type { Layout } from "@/content/schema";
import heroImg from "@/assets/hero.png";
import { Button } from "@/components/ui/button";

type HeroProps = Extract<Layout["blocks"][number], { type: "hero" }>["props"];

export function Hero({ name, tagline, pitch, links }: HeroProps) {
  return (
    <div
      className="mx-card featured w-full flex flex-col-reverse md:flex-row justify-between items-center gap-8 py-6 md:py-8"
      data-domain="platform"
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
        {links && links.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {links.map((link, idx) => (
              <Button
                key={idx}
                variant={idx === links.length - 1 ? "default" : "outline"}
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
      <div className="w-36 h-36 md:w-44 md:h-44 shrink-0 rounded-xl overflow-hidden border border-(--hairline) bg-(--bg-sunken) p-2 flex items-center justify-center">
        <img
          src={heroImg}
          alt={name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    </div>
  );
}
