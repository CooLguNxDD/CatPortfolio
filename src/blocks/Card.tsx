/**
 * Generic portfolio card — OD matrix chrome (accent bar, domain tint, lift).
 */

import type { CSSProperties } from "react";
import type { PropsOf } from "@/render/registry";
import { BadgeCloud } from "./primitives/BadgeCloud";
import { MarkdownText } from "./primitives/MarkdownText";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  solid: "",
  outline: "bg-transparent!",
  ghost: "bg-transparent! border-transparent! shadow-none!",
} as const;

/** First-class card block for matrix project tiles and agent-authored cards. */
export function Card(props: PropsOf<"card">) {
  const {
    title,
    eyebrow,
    body,
    media,
    metrics,
    tags,
    links,
    badges,
    tech,
    domain,
    accent,
    variant = "solid",
  } = props;

  const accentStyle: CSSProperties | undefined =
    accent && !domain
      ? ({
          ["--card-accent" as string]: `var(--accent-${accent}, var(--amber))`,
        } as CSSProperties)
      : undefined;

  // Tech bag for matrix filter: explicit prop, else join tags.
  const techBag =
    tech?.trim() ||
    (tags?.length ? tags.map((t) => t.replace(/\s+/g, "-")).join(" ") : undefined);

  return (
    <article
      data-domain={domain}
      data-tech={techBag}
      style={accentStyle}
      className={cn(
        "mx-card flex h-full flex-col",
        VARIANT_CLASS[variant] ?? VARIANT_CLASS.solid,
      )}
    >
      {media?.src ? (
        media.kind === "image" || !media.kind ? (
          <img
            src={media.src}
            alt={media.alt ?? ""}
            className="mb-3 max-h-36 w-full rounded-[var(--radius)] border border-(--hairline) object-cover"
          />
        ) : media.kind === "icon" ? (
          <div className="mb-2 text-2xl" aria-hidden>
            {media.src}
          </div>
        ) : null
      ) : null}

      {eyebrow ? (
        <div className="text-[0.72rem] font-mono uppercase tracking-[0.16em] text-(--fg-subtle)">
          {eyebrow}
        </div>
      ) : null}

      {title ? (
        <h3 className="mt-1 text-[1.15rem] font-bold leading-snug tracking-tight text-(--fg)">
          {title}
        </h3>
      ) : null}

      {body ? (
        <div className="mt-2 text-[0.92rem] text-(--fg-muted) [&_.prose]:text-sm">
          <MarkdownText markdown={body} />
        </div>
      ) : null}

      {metrics && metrics.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {metrics.map((m, i) => (
            <div key={`${m.label}-${i}`} className="font-mono text-xs">
              <span className="uppercase tracking-wider text-(--fg-subtle) mr-1.5">
                {m.label}
              </span>
              <span className="font-semibold text-[var(--card-accent,var(--amber))]">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {tags && tags.length > 0 ? (
        <div className="mt-3">
          <BadgeCloud items={tags} />
        </div>
      ) : null}

      {badges && badges.length > 0 ? (
        <div className="badge-row">
          {badges.map((b, i) => {
            const cls = cn("v-badge", b.tone === "amber" && "amber");
            return b.href ? (
              <a
                key={`${b.label}-${i}`}
                className={cls}
                href={b.href}
                target="_blank"
                rel="noreferrer"
              >
                {b.label}
              </a>
            ) : (
              <span key={`${b.label}-${i}`} className={cls}>
                {b.label}
              </span>
            );
          })}
        </div>
      ) : null}

      {links && links.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-4 border-t border-(--hairline)">
          {links.map((link, i) => (
            <Button key={`${link.href}-${i}`} variant="outline" size="sm" asChild>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
