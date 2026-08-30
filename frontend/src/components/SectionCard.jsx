export default function SectionCard({ title, description, children, danger = false, flush = false }) {
  return (
    <div
      className={`${flush ? "" : "rounded-xl border bg-white p-4 shadow-sm sm:p-6"} ${danger ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}
    >
      {title && <h2 className={`font-heading font-bold ${danger ? "text-red-700" : "text-gray-900"}`}>{title}</h2>}
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
