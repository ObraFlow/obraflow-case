import type { FastifyInstance } from "fastify";
import { REALTIME_ERRORS, REALTIME_EVENTS } from "@dokimos/shared";
import { Server, type Socket } from "socket.io";
import { dataSource } from "../db/data-source.js";
import type { PoTransport } from "../modules/purchase-orders/notifier.js";
import { findUser } from "../modules/users/repository.js";
import { socketIdentity, type SocketIdentity } from "./socket-auth.js";

declare module "fastify" {
  interface FastifyInstance {
    realtime: PoTransport & { disconnectUser(userId: string): void };
  }
}

// Each user has one server-owned room; clients never choose rooms.
const roomOf = (userId: string) => `user:${userId}`;

// isSameOrigin: WebSocket does not enforce CORS, so reject browser origins that differ
// from Host. Clients that send no Origin (non-browser) are allowed; they still need a token.
function isSameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// disconnectAtExpiry: ends the connection when its token expires. setTimeout cannot
// wait longer than 2^31-1 ms, so a longer remainder is waited out in steps.
function disconnectAtExpiry(socket: Socket, expiresAt: number): void {
  let timer: ReturnType<typeof setTimeout>;
  const check = () => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      socket.disconnect(true);
      return;
    }
    timer = setTimeout(check, Math.min(remaining, 2147483647));
    timer.unref();
  };
  socket.once("disconnect", () => clearTimeout(timer));
  check();
}

// disconnectIfInactive: closes the handshake/deactivation race. The socket has already
// joined its room, so a user deactivated mid-handshake is dropped here, not missed.
function disconnectIfInactive(socket: Socket, userId: string): void {
  void findUser(dataSource.manager, userId)
    .then((user) => {
      if (!user?.isActive) socket.disconnect(true);
    })
    .catch(() => socket.disconnect(true));
}

// registerRealtime: Socket.IO on the API's HTTP server, used only for best-effort hints
// that an order needs attention. REST stays the source of truth, so a missed hint is
// harmless. Exposes `app.realtime` for routes and closes sockets on shutdown.
export function registerRealtime(app: FastifyInstance): void {
  let closing = false;
  const io = new Server(app.server, {
    transports: ["websocket"],
    allowRequest: (request, callback) => {
      callback(null, !closing && isSameOrigin(request.headers.origin, request.headers.host));
    },
  });

  // Socket.IO middleware: verify the handshake token and store the identity for later use. Any
  io.use((socket, next) => {
    void socketIdentity(app, socket.handshake.auth.token)
      .then((identity) => {
        if (closing || identity.expiresAt <= Date.now()) return next(new Error(REALTIME_ERRORS.UNAUTHENTICATED));
        socket.data.identity = identity;
        next();
      })
      .catch(() => next(new Error(REALTIME_ERRORS.UNAUTHENTICATED)));
  });

  io.on("connection", (socket) => {
    const identity = socket.data.identity as SocketIdentity;
    if (closing) {
      socket.disconnect(true);
      return;
    }
    void socket.join(roomOf(identity.id));
    disconnectAtExpiry(socket, identity.expiresAt);
    disconnectIfInactive(socket, identity.id);
  });

  app.decorate("realtime", {
    sendToUser(userId, event) {
      const room = roomOf(userId);
      // Enforce exp even if the event loop has not run an overdue expiry timer yet.
      for (const id of io.sockets.adapter.rooms.get(room) ?? []) {
        const socket = io.sockets.sockets.get(id);
        if (socket && socket.data.identity.expiresAt <= Date.now()) socket.disconnect(true);
      }
      io.to(room).emit(REALTIME_EVENTS.PO_NOTIFICATION, event);
    },
    disconnectUser(userId) {
      io.in(roomOf(userId)).disconnectSockets(true);
    },
  } satisfies FastifyInstance["realtime"]);

  app.addHook("preClose", async () => {
    closing = true;
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });
}

// disconnectDeactivatedUser: closes a deactivated user's sockets after the commit; a
// failure is logged because the deactivation itself already succeeded.
export function disconnectDeactivatedUser(app: FastifyInstance, userId: string): void {
  try {
    app.realtime.disconnectUser(userId);
  } catch {
    app.log.warn("Socket disconnection failed after deactivation commit");
  }
}
