/** Simple icon + label tile (icon is a short string / emoji / lucide name). */
export function IconTile({
  icon,
  label,
}: {
  icon?: string;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius)] border border-(--hairline) bg-(--card) px-3 py-2">
      <span className="text-lg leading-none" aria-hidden>
        {icon || "◆"}
      </span>
      {label ? <span className="text-sm text-(--fg)">{label}</span> : null}
    </div>
  );
}
