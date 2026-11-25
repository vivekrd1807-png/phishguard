export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-white/65">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
