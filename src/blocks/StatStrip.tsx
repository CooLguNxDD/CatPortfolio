import type { Layout } from "@/content/schema";

type StatStripProps = Extract<Layout["blocks"][number], { type: "statStrip" }>["props"];

export function StatStrip({ stats }: StatStripProps) {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="w-full py-6 flex flex-wrap gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex-1 min-w-[200px] p-4 rounded-xl border border-(--hairline) bg-card flex flex-col justify-between gap-1"
        >
          <span className="text-3xl font-mono font-bold tracking-tight text-(--amber) tabular-nums">
            {stat.value}
          </span>
          <span className="font-mono uppercase tracking-[0.16em] text-xs text-(--fg-subtle)">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
