/** App routes that embed an id. The id is encoded here, once. */
export const orderPath = (id: string) => `/purchase-orders/${encodeURIComponent(id)}`;
export const projectPath = (id: string) => `/admin/projects/${encodeURIComponent(id)}`;

/** A path inside this app to go back to, or `fallback`. Anything pointing to another origin is refused. */
export function internalPath(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const url = new URL(value, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : fallback;
}
