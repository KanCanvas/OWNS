const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const {
  updateCourierLocation,
  getActiveTrackingForUser,
  serializeTracking,
} = require("./tracking-store");

function parseToken(url) {
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.searchParams.get("token");
  } catch {
    return null;
  }
}

let broadcastToCustomerRef = null;

function initTrackingWs(httpServer, { jwtSecret, prisma }) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/tracking" });
  const customerRooms = new Map();
  const courierSockets = new Map();

  function addToRoom(roomId, socket) {
    if (!customerRooms.has(roomId)) {
      customerRooms.set(roomId, new Set());
    }
    customerRooms.get(roomId).add(socket);
  }

  function removeFromRooms(socket) {
    for (const [, sockets] of customerRooms) {
      sockets.delete(socket);
    }
    courierSockets.delete(socket);
  }

  function broadcastToCustomer(userId, payload) {
    const room = customerRooms.get(String(userId));
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const socket of room) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  broadcastToCustomerRef = broadcastToCustomer;

  wss.on("connection", async (socket, request) => {
    const token = parseToken(request.url);
    if (!token || !jwtSecret) {
      socket.close(4401, "Unauthorized");
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      socket.close(4401, "Unauthorized");
      return;
    }

    const authUserId = String(decoded.userId || "");
    if (!authUserId) {
      socket.close(4401, "Unauthorized");
      return;
    }

    socket.authUserId = authUserId;
    socket.isCourier = false;

    socket.on("message", async (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (message.type === "subscribe_customer") {
        addToRoom(authUserId, socket);

        const tracking = await getActiveTrackingForUser(prisma, authUserId);
        if (tracking && socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "tracking_state",
              tracking: serializeTracking(tracking),
            })
          );
        }
        return;
      }

      if (message.type === "register_courier") {
        socket.isCourier = true;
        courierSockets.set(socket, authUserId);
        return;
      }

      if (message.type === "courier_location") {
        if (!socket.isCourier) return;

        const customerUserId = String(message.customerUserId || "");
        const lat = Number(message.lat);
        const lng = Number(message.lng);

        if (!customerUserId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }

        const tracking = await updateCourierLocation(prisma, {
          userId: customerUserId,
          courierId: authUserId,
          lat,
          lng,
        });

        if (!tracking) return;

        broadcastToCustomer(customerUserId, {
          type: "courier_location",
          tracking: serializeTracking(tracking),
        });
      }
    });

    socket.on("close", () => {
      removeFromRooms(socket);
    });
  });

  return wss;
}

function notifyCustomerTracking(userId, tracking) {
  if (!broadcastToCustomerRef) return;

  broadcastToCustomerRef(String(userId), {
    type: "tracking_state",
    tracking: serializeTracking(tracking),
  });
}

module.exports = { initTrackingWs, notifyCustomerTracking };
