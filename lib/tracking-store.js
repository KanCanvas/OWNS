const {
  geocodeAddress,
  buildDeliveryAddress,
  getPizzeriaCoords,
  DEFAULT_CENTER,
} = require("./geocode");

function hasValidCoords(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

async function resolveDestinationCoords(streetAddress, preferredCoords = null) {
  if (
    preferredCoords &&
    hasValidCoords(preferredCoords.lat, preferredCoords.lng)
  ) {
    return {
      lat: Number(preferredCoords.lat),
      lng: Number(preferredCoords.lng),
      label: preferredCoords.label || streetAddress,
      source: preferredCoords.source || "profile",
    };
  }

  const result = await geocodeAddress(streetAddress);
  return {
    lat: result.lat,
    lng: result.lng,
    label: result.label || streetAddress,
    source: result.source || "unknown",
  };
}

async function startDeliveryTracking(
  prisma,
  { userId, courierId, streetAddress, entrance, apartment, destLat, destLng }
) {
  const destAddress = buildDeliveryAddress({
    streetAddress,
    entrance,
    apartment,
  });

  const destination = await resolveDestinationCoords(streetAddress, {
    lat: destLat,
    lng: destLng,
    label: destAddress,
    source: "profile",
  });

  const pizzeria = getPizzeriaCoords();

  const tracking = await prisma.deliveryTracking.upsert({
    where: { userId: String(userId) },
    create: {
      userId: String(userId),
      courierId: String(courierId),
      destAddress,
      destLat: destination.lat,
      destLng: destination.lng,
      courierLat: pizzeria.lat,
      courierLng: pizzeria.lng,
      isActive: true,
    },
    update: {
      courierId: String(courierId),
      destAddress,
      destLat: destination.lat,
      destLng: destination.lng,
      courierLat: pizzeria.lat,
      courierLng: pizzeria.lng,
      isActive: true,
    },
  });

  console.info(
    "[tracking] Started for user",
    userId,
    "address:",
    destAddress,
    "coords:",
    destination.lat,
    destination.lng,
    "source:",
    destination.source
  );

  return tracking;
}

async function updateTrackingDestinationCoords(
  prisma,
  userId,
  { lat, lng, address }
) {
  if (!hasValidCoords(lat, lng)) return null;

  const tracking = await prisma.deliveryTracking.findFirst({
    where: {
      userId: String(userId),
      isActive: true,
    },
  });

  if (!tracking) return null;

  return prisma.deliveryTracking.update({
    where: { id: tracking.id },
    data: {
      destLat: Number(lat),
      destLng: Number(lng),
      ...(address ? { destAddress: address } : {}),
    },
  });
}

async function refreshTrackingDestination(prisma, tracking) {
  if (!tracking) return tracking;

  const user = await prisma.user.findUnique({
    where: { id: Number(tracking.userId) },
    select: {
      homeLat: true,
      homeLng: true,
      homeaddress: true,
    },
  });

  if (hasValidCoords(user?.homeLat, user?.homeLng)) {
    if (
      user.homeLat !== tracking.destLat ||
      user.homeLng !== tracking.destLng
    ) {
      return prisma.deliveryTracking.update({
        where: { id: tracking.id },
        data: {
          destLat: user.homeLat,
          destLng: user.homeLng,
        },
      });
    }
    return tracking;
  }

  if (!tracking.destAddress) return tracking;

  const streetOnly = String(tracking.destAddress).split(",")[0].trim();
  const destination = await resolveDestinationCoords(streetOnly);

  const looksLikeFallback =
    Math.abs(tracking.destLat - DEFAULT_CENTER.lat) < 0.00001 &&
    Math.abs(tracking.destLng - DEFAULT_CENTER.lng) < 0.00001 &&
    destination.source !== "profile";

  if (
    looksLikeFallback ||
    destination.lat !== tracking.destLat ||
    destination.lng !== tracking.destLng
  ) {
    if (
      destination.lat !== tracking.destLat ||
      destination.lng !== tracking.destLng
    ) {
      return prisma.deliveryTracking.update({
        where: { id: tracking.id },
        data: {
          destLat: destination.lat,
          destLng: destination.lng,
        },
      });
    }
  }

  return tracking;
}

async function updateCourierLocation(prisma, { userId, courierId, lat, lng }) {
  const tracking = await prisma.deliveryTracking.findFirst({
    where: {
      userId: String(userId),
      courierId: String(courierId),
      isActive: true,
    },
  });

  if (!tracking) return null;

  return prisma.deliveryTracking.update({
    where: { id: tracking.id },
    data: {
      courierLat: lat,
      courierLng: lng,
    },
  });
}

async function stopDeliveryTracking(prisma, userId) {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { userId: String(userId) },
  });

  if (!tracking) return null;

  return prisma.deliveryTracking.update({
    where: { id: tracking.id },
    data: { isActive: false },
  });
}

async function getActiveTrackingForUser(prisma, userId, { refresh = true } = {}) {
  const tracking = await prisma.deliveryTracking.findFirst({
    where: {
      userId: String(userId),
      isActive: true,
    },
  });

  if (!tracking || !refresh) return tracking;

  return refreshTrackingDestination(prisma, tracking);
}

async function getActiveTrackingForCourier(prisma, courierId) {
  return prisma.deliveryTracking.findMany({
    where: {
      courierId: String(courierId),
      isActive: true,
    },
  });
}

function serializeTracking(tracking) {
  if (!tracking) return null;

  return {
    userId: tracking.userId,
    courierId: tracking.courierId,
    destination: {
      lat: tracking.destLat,
      lng: tracking.destLng,
      address: tracking.destAddress || null,
    },
    courier: {
      lat: tracking.courierLat,
      lng: tracking.courierLng,
    },
    isActive: tracking.isActive,
    updatedAt: tracking.updatedAt,
  };
}

module.exports = {
  startDeliveryTracking,
  updateTrackingDestinationCoords,
  refreshTrackingDestination,
  updateCourierLocation,
  stopDeliveryTracking,
  getActiveTrackingForUser,
  getActiveTrackingForCourier,
  serializeTracking,
};
