const {
  geocodeAddress,
  buildDeliveryAddress,
  getPizzeriaCoords,
} = require("./geocode");

async function resolveDestinationCoords(streetAddress) {
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
  { userId, courierId, streetAddress, entrance, apartment }
) {
  const destAddress = buildDeliveryAddress({
    streetAddress,
    entrance,
    apartment,
  });
  const destination = await resolveDestinationCoords(streetAddress);
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

async function refreshTrackingDestination(prisma, tracking) {
  if (!tracking?.destAddress) return tracking;

  const streetOnly = String(tracking.destAddress).split(",")[0].trim();
  const destination = await resolveDestinationCoords(streetOnly);

  if (
    destination.lat === tracking.destLat &&
    destination.lng === tracking.destLng
  ) {
    return tracking;
  }

  return prisma.deliveryTracking.update({
    where: { id: tracking.id },
    data: {
      destLat: destination.lat,
      destLng: destination.lng,
    },
  });
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
  refreshTrackingDestination,
  updateCourierLocation,
  stopDeliveryTracking,
  getActiveTrackingForUser,
  getActiveTrackingForCourier,
  serializeTracking,
};
