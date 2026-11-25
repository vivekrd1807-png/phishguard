export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 grid size-10 place-items-center rounded-md bg-secondary text-navy">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
