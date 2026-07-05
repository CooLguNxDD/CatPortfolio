import type { Layout } from "@/content/schema";
import heroImg from "@/assets/hero.png";
import { Button } from "@/components/ui/button";

type HeroProps = Extract<Layout["blocks"][number], { type: "hero" }>["props"];

export function Hero({ name, tagline, pitch, links }: HeroProps) {
  return (
    <div className="w-full flex flex-col-reverse md:flex-row justify-between items-center gap-8 py-8 md:py-12 border-b border-(--hairline)">
      <div className="flex-1 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-(--fg)">
          {name}
        </h1>
        <p className="text-xl md:text-2xl font-medium text-(--fg-muted)">
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
              <Button key={idx} variant="outline" asChild>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="w-40 h-40 md:w-48 md:h-48 shrink-0 rounded-xl overflow-hidden border border-(--hairline) bg-(--bg-sunken) p-2 flex items-center justify-center">
        <img
          src={heroImg}
          alt={name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    </div>
  );
}
