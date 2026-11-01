import type { Location } from "react-router";

const listParams = ["projectId", "status", "actionableByMe", "page", "pageSize"];

/**
 * Where "Voltar" leads: the order list as the person left it. Only list context is retained, never an arbitrary
 * external return URL. `projectId` is the project the list was filtered to, if any.
 */
export function listReturn(location: Pick<Location, "state" | "search">) {
  const source =
    typeof location.state?.returnTo === "string" ? location.state.returnTo : `/purchase-orders${location.search}`;
  const url = new URL(
    source.startsWith("/purchase-orders?") || source === "/purchase-orders" ? source : "/purchase-orders",
    window.location.origin,
  );
  const params = new URLSearchParams();
  for (const key of listParams) if (url.searchParams.has(key)) params.set(key, url.searchParams.get(key)!);
  return {
    returnTo: `/purchase-orders${params.size ? `?${params}` : ""}`,
    projectId: params.get("projectId"),
  };
}
