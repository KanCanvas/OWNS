const FREE_DELIVERY_THRESHOLD = 5000;
const DELIVERY_FEE = 1000;

function calcCartSubtotal(items) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((sum, item) => {
    if (!item || item.isGift) return sum;

    const price = typeof item.price === "number" ? item.price : 0;
    const count = Number(item.count);

    if (!Number.isFinite(count) || count <= 0) return sum;

    return sum + price * count;
  }, 0);
}

function getDeliveryFee(subtotal) {
  const safe = Number(subtotal) || 0;

  if (safe <= 0) return 0;

  return safe >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

function getOrderTotal(subtotal) {
  const safe = Number(subtotal) || 0;

  return safe + getDeliveryFee(safe);
}

function qualifiesForFreeDelivery(subtotal) {
  return (Number(subtotal) || 0) >= FREE_DELIVERY_THRESHOLD;
}

function amountUntilFreeDelivery(subtotal) {
  const safe = Number(subtotal) || 0;

  if (safe >= FREE_DELIVERY_THRESHOLD) return 0;

  return FREE_DELIVERY_THRESHOLD - safe;
}

module.exports = {
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  calcCartSubtotal,
  getDeliveryFee,
  getOrderTotal,
  qualifiesForFreeDelivery,
  amountUntilFreeDelivery,
};
