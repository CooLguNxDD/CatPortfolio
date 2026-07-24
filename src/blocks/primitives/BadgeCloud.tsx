/** Tag / badge cloud. */
export function BadgeCloud({ items = [] }: { items?: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs text-(--fg-muted)"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
