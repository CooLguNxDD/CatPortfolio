/**
 * useLayoutDag — Open Design level-row lighting, viewport-aligned.
 *
 * Lighting is driven by which level row is closest to the viewport focus line
 * (≈ 35% from top, under sticky chrome) — not only global scroll fraction.
 * That keeps is-lit / is-current aligned with what the user actually sees.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout } from "@/content/schema";

export type DagLevelView = {
  level: number;
  label: string;
  at: number;
  nodes: string[];
  /** Peer columns in this band; omit = auto from node count. */
  cols?: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Normalize layout.meta.dag into levels with default `at` thresholds. */
export function normalizeDagLevels(
  layout: Layout | null | undefined,
): DagLevelView[] {
  const raw = layout?.meta?.dag?.levels;
  if (!raw?.length) return [];
  const maxL = Math.max(1, raw.length - 1);
  return raw.map((L, idx) => ({
    level: L.level,
    label: L.label || `L${L.level}`,
    at: L.at != null ? L.at : idx === 0 ? 0 : idx / maxL,
    nodes: Array.isArray(L.nodes) ? [...L.nodes] : [],
    cols:
      typeof L.cols === "number" && L.cols >= 1 && L.cols <= 4
        ? L.cols
        : undefined,
  }));
}

/**
 * Pick the active level index from live DOM geometry.
 * Focus line sits under sticky header+minimap so triggers match on-screen rows.
 *
 * Queries `.dag-level[data-dag-level]` once (not once per level) — this runs
 * on every scroll/resize rAF tick, so per-level querySelector calls thrash
 * the DOM under heavy scrolling.
 */
function measureActiveIndex(): {
  activeIdx: number;
  progress: number;
} {
  if (typeof window === "undefined") {
    return { activeIdx: 0, progress: 0 };
  }
  const nodes = document.querySelectorAll<HTMLElement>(
    ".dag-level[data-dag-level]",
  );
  if (nodes.length === 0) {
    return { activeIdx: 0, progress: 0 };
  }
  // Focus line sits just under sticky app header + matrix chrome.
  const chrome = document.querySelector(
    ".matrix-sticky-chrome",
  ) as HTMLElement | null;
  const chromeBottom = chrome
    ? chrome.getBoundingClientRect().bottom
    : 56;
  const focusY = chromeBottom + 24;

  let best = 0;
  // Highest level whose top has crossed the focus line wins (story unlock).
  nodes.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    // Level is "reached" once its header crosses under chrome focus.
    if (r.top <= focusY + 40) best = i;
  });

  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const max = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const progress = Math.max(0, Math.min(1, scrollTop / max));
  return { activeIdx: best, progress };
}

/** Scroll-linked DAG lighting — viewport geometry is the source of truth. */
export function useLayoutDag(layout: Layout | null | undefined) {
  const levels = useMemo(() => normalizeDagLevels(layout), [layout]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (!levels.length) return;

    let raf = 0;
    const tick = () => {
      const m = measureActiveIndex();
      setActiveIdx((prev) => (prev === m.activeIdx ? prev : m.activeIdx));
      setProgress((prev) =>
        Math.abs(prev - m.progress) < 0.005 ? prev : m.progress,
      );
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    // Initial measure after paint so level nodes exist.
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Re-measure when level nodes resize (charts/mermaid).
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onScroll)
        : null;
    document.querySelectorAll("[data-dag-level]").forEach((el) => {
      ro?.observe(el);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [levels]);

  const litLevels = useMemo(() => {
    if (reduced) return new Set(levels.map((_, i) => i));
    const lit = new Set<number>();
    for (let i = 0; i <= activeIdx; i++) lit.add(i);
    return lit;
  }, [activeIdx, levels, reduced]);

  // Pending settle-timer/listener from a prior jumpToLevel — cleared on the
  // next jump and on unmount so a scroll-settle callback never fires (and
  // sets state) after the component is gone.
  const settleCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => settleCleanupRef.current?.();
  }, []);

  const jumpToLevel = useCallback(
    (level: number) => {
      settleCleanupRef.current?.();
      settleCleanupRef.current = null;

      const el = document.querySelector(
        `[data-dag-level="${level}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      // Offset for app header + sticky matrix chrome so the band lands on the
      // same focus line used by measureActiveIndex (not under sticky UI).
      const chrome =
        document.querySelector(".matrix-sticky-chrome") as HTMLElement | null;
      const header = 56;
      const chromeH = chrome?.offsetHeight ?? 0;
      const top =
        window.scrollY +
        el.getBoundingClientRect().top -
        header -
        chromeH -
        12;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: reduced ? "auto" : "smooth",
      });
      // Optimistic current index, then remeasure when scroll settles.
      const idx = Math.max(
        0,
        [...document.querySelectorAll(".dag-level")].findIndex(
          (n) => n.getAttribute("data-dag-level") === String(level),
        ),
      );
      setActiveIdx(idx);
      const settle = () => {
        const m = measureActiveIndex();
        setActiveIdx(m.activeIdx);
        setProgress(m.progress);
        settleCleanupRef.current = null;
      };
      if (typeof window !== "undefined" && "onscrollend" in window) {
        const controller = new AbortController();
        window.addEventListener("scrollend", settle, {
          once: true,
          signal: controller.signal,
        });
        settleCleanupRef.current = () => controller.abort();
      } else {
        const handle = globalThis.setTimeout(settle, reduced ? 0 : 450);
        settleCleanupRef.current = () => globalThis.clearTimeout(handle);
      }
    },
    [reduced],
  );

  return {
    levels,
    progress,
    activeIdx,
    litLevels,
    currentLevel: levels[activeIdx]?.level ?? 0,
    jumpToLevel,
    enabled: levels.length > 0,
  };
}
