const { buildOrderItemsWithGift } = require("./promo");

async function placePizzaOrders(prisma, { userId, pizza, paymentMethod }) {
  const allowedMethods = new Set(["CASH", "KASPI"]);
  const normalizedMethod = String(paymentMethod || "").toUpperCase();

  if (!allowedMethods.has(normalizedMethod)) {
    return {
      ok: false,
      error: "Выберите способ оплаты: наличные или Kaspi.",
    };
  }

  if (!Array.isArray(pizza) || pizza.length === 0) {
    return {
      ok: false,
      error: "Корзина пуста или данные некорректны.",
    };
  }

  const orderItems = buildOrderItemsWithGift(pizza);
  const orders = [];

  for (let i = 0; i < orderItems.length; i++) {
    const item = orderItems[i];
    if (!item) continue;

    const itemCount = Number(item.count);
    if (!Number.isFinite(itemCount) || itemCount <= 0) continue;

    const pizzaPrice = item.isGift
      ? 0
      : typeof item.price === "number" && Number.isFinite(item.price)
        ? Math.round(item.price)
        : null;

    const itemTotal = item.isGift ? 0 : pizzaPrice !== null ? pizzaPrice * itemCount : 0;

    const order = await prisma.order.create({
      data: {
        pizzaId:
          typeof item.id === "number" && Number.isFinite(item.id) ? item.id : null,
        userId: String(userId),
        pizzaName: item.isGift
          ? `${String(item.name || "Подарок")} 🎁`
          : String(item.name || "Без названия"),
        pizzaSize: item.size ? String(item.size) : null,
        pizzaPrice,
        count: itemCount,
        total: itemTotal,
        paymentMethod: normalizedMethod,
      },
    });
    orders.push(order);
  }

  if (orders.length === 0) {
    return {
      ok: false,
      error: "Корзина пуста или данные некорректны.",
    };
  }

  return { ok: true, orders, paymentMethod: normalizedMethod };
}

module.exports = { placePizzaOrders };
