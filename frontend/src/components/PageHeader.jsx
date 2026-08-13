export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex w-full flex-col gap-4 border-b border-gray-200 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
