import { orderPath } from "@/lib/paths";
import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

/** Opens an order from outside its page (notifications). Navigating to the URL already shown
 * changes nothing, so the navigation carries a refresh request that the detail page honors by
 * re-reading the order; from any other page the normal load happens on arrival. The returned
 * function is stable, so realtime subscriptions are not recreated on every route change. */
export function useOpenOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const latest = useRef({ navigate, location });
  latest.current = { navigate, location };
  return useCallback((orderId: string) => {
    const { navigate: go, location: here } = latest.current;
    const to = orderPath(orderId);
    // Re-opening the order on screen must not add a duplicate history entry.
    void go(to, { replace: here.pathname === to, state: { refreshOrder: Date.now() } });
  }, []);
}
