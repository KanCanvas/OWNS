export const CART_CHANGE_EVENT = "ownpizza:cart-change";

function getWithExpiry(key) {
  if (typeof window === "undefined") return null;

  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return item.value;
  } catch {
    return null;
  }
}

export function readCartItems() {
  if (typeof window === "undefined") return [];

  const rawCart = getWithExpiry("cartItems");
  if (!rawCart || typeof rawCart !== "object" || Object.keys(rawCart).length === 0) {
    const rawCartLocal = JSON.parse(localStorage.getItem("cartElements") || "{}");
    return Object.values(rawCartLocal)
      .map((item) => {
        const count = Number(item?.count ?? 0);
        if (!Number.isFinite(count) || count <= 0) return null;
        return { ...item, count };
      })
      .filter(Boolean);
  }

  return Object.values(rawCart)
    .map((item) => {
      const count = Number(item?.count ?? 0);
      if (!Number.isFinite(count) || count <= 0) return null;
      return { ...item, count };
    })
    .filter(Boolean);
}

export function getCartSummary() {
  const items = readCartItems();
  const count = items.reduce((sum, item) => sum + item.count, 0);
  const total = items.reduce(
    (sum, item) => sum + (typeof item.price === "number" ? item.price * item.count : 0),
    0
  );

  return { count, total, items };
}

export function notifyCartChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
}
