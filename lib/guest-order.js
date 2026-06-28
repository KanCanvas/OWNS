const { formatPhoneForStorage, normalizePhone } = require("./phone");

const GUEST_SMS_CODE = 0;

function isGuestAccount(user) {
  return Boolean(user && !user.telegramId && user.smsCode === GUEST_SMS_CODE);
}

function validateGuestCheckout({ name, phone, address, entrance, apartment }) {
  const trimmedName = String(name || "").trim();
  const storedPhone = formatPhoneForStorage(phone);
  const normalized = normalizePhone(phone);
  const trimmedAddress = String(address || "").trim();
  const trimmedEntrance = String(entrance || "").trim();
  const trimmedApartment = String(apartment || "").trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { ok: false, error: "Укажите имя для заказа." };
  }

  if (!storedPhone || normalized.length < 10) {
    return { ok: false, error: "Укажите корректный номер телефона." };
  }

  if (!trimmedAddress && !trimmedEntrance && !trimmedApartment) {
    return { ok: false, error: "Укажите адрес доставки." };
  }

  return { ok: true };
}

async function resolveGuestCustomer(
  prisma,
  findUserByPhone,
  { name, phone, address, entrance, apartment, addressLat, addressLng }
) {
  const validation = validateGuestCheckout({
    name,
    phone,
    address,
    entrance,
    apartment,
  });

  if (!validation.ok) {
    return validation;
  }

  const storedPhone = formatPhoneForStorage(phone);
  const trimmedName = String(name || "").trim();
  const parsedLat = Number(addressLat);
  const parsedLng = Number(addressLng);

  const addressData = {
    homeaddress: String(address || "").trim(),
    homeentrance: String(entrance || "").trim(),
    homeapartment: String(apartment || "").trim(),
  };

  if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
    addressData.homeLat = parsedLat;
    addressData.homeLng = parsedLng;
  }

  let user = await findUserByPhone(storedPhone);

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: trimmedName,
        phone: storedPhone,
        smsCode: GUEST_SMS_CODE,
        ...addressData,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: trimmedName,
        ...addressData,
      },
    });
  }

  return { ok: true, user, isGuest: isGuestAccount(user) };
}

module.exports = {
  GUEST_SMS_CODE,
  isGuestAccount,
  validateGuestCheckout,
  resolveGuestCustomer,
};
