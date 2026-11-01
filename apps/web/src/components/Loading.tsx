/** Initial reads only; background refreshes keep their existing content. */
export function Loading({ message = "Carregando…", compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      aria-label={message}
      className={compact ? "w-32 max-w-full" : "space-y-3 rounded-lg border p-5"}
      data-testid="loading-skeleton"
    >
      <span className="sr-only">{message}</span>
      {(compact ? ["w-full"] : ["w-2/5", "w-full", "w-4/5"]).map((width, index) => (
        <div key={index} aria-hidden="true" className={`h-5 rounded bg-muted motion-safe:animate-pulse ${width}`} />
      ))}
    </div>
  );
}
