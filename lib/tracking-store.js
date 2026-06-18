const { geocodeAddress, getPizzeriaCoords } = require("./geocode");

async function startDeliveryTracking(prisma, { userId, courierId, address }) {
  const destination = await geocodeAddress(address);
  const pizzeria = getPizzeriaCoords();

  const tracking = await prisma.deliveryTracking.upsert({
    where: { userId: String(userId) },
    create: {
      userId: String(userId),
      courierId: String(courierId),
      destLat: destination.lat,
      destLng: destination.lng,
      courierLat: pizzeria.lat,
      courierLng: pizzeria.lng,
      isActive: true,
    },
    update: {
      courierId: String(courierId),
      destLat: destination.lat,
      destLng: destination.lng,
      courierLat: pizzeria.lat,
      courierLng: pizzeria.lng,
      isActive: true,
    },
  });

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

async function getActiveTrackingForUser(prisma, userId) {
  return prisma.deliveryTracking.findFirst({
    where: {
      userId: String(userId),
      isActive: true,
    },
  });
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
  updateCourierLocation,
  stopDeliveryTracking,
  getActiveTrackingForUser,
  getActiveTrackingForCourier,
  serializeTracking,
};
