import type { PropsOf } from "@/render/registry";

/** Comparison / tradeoff table. */
export function Comparison(props: PropsOf<"comparison">) {
  const columns = props.columns ?? [];
  const rows = props.rows ?? [];
  return (
    <section className="overflow-x-auto rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card)">
      {props.title ? (
        <h3 className="border-b border-(--hairline) px-[var(--pad-card)] py-3 text-sm font-medium text-(--fg)">
          {props.title}
        </h3>
      ) : null}
      <table className="w-full min-w-[280px] text-left text-sm">
        <thead>
          <tr className="border-b border-(--hairline) text-(--fg-subtle)">
            <th className="px-3 py-2 font-normal" />
            {columns.map((c, i) => (
              <th key={i} className="px-3 py-2 font-medium text-(--fg-muted)">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const cells = row.cells ?? [];
            const paddedCells = [
              ...cells,
              ...Array(Math.max(0, columns.length - cells.length)).fill(""),
            ];
            return (
              <tr key={i} className="border-b border-(--hairline) last:border-0">
                <th className="px-3 py-2 font-medium text-(--fg)">{row.label}</th>
                {paddedCells.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-(--fg-muted)">
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
