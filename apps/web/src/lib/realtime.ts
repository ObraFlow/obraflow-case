import { io } from "socket.io-client";
import { REALTIME_ERRORS, REALTIME_EVENTS, type PoNotification } from "@dokimos/shared";

// connectRealtime: opens the best-effort hint channel for one session and returns its
// disconnect function. The token travels in the handshake `auth`, never in the URL.
// Hints only say "something changed"; the REST API stays the source of truth.
export function connectRealtime(token: string, onNotification: (event: PoNotification) => void): () => void {
  // Same origin as the page: Vite proxies /socket.io in development and nginx in Docker.
  const socket = io({ transports: ["websocket"], auth: { token } });
  socket.on(REALTIME_EVENTS.PO_NOTIFICATION, onNotification);
  // A rejected token will not become valid by retrying; other failures reconnect with backoff.
  socket.on("connect_error", (error) => {
    if (error.message === REALTIME_ERRORS.UNAUTHENTICATED) socket.disconnect();
  });
  return () => {
    socket.off();
    socket.disconnect();
  };
}
