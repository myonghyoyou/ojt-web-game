export function Notice({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      {title && <h1 className="font-display text-3xl text-brand-deep">{title}</h1>}
      {children && <p className="text-lg text-muted">{children}</p>}
    </div>
  );
}
