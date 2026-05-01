export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Coming next.</p>
    </div>
  );
}
