export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
