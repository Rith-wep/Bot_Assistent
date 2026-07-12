export default function SectionCard({ title, description, children, danger = false }) {
  return (
    <div
      className={`rounded-xl border bg-white p-6 ${danger ? "border-error/30" : "border-gray-200"}`}
    >
      <h2 className={`font-heading font-bold ${danger ? "text-error" : "text-ink"}`}>{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
