const PROMO_MIN_PIZZAS = 2;
const PIZZA_SIZE = "30 см";

const PROMO_COLA_GIFT = {
  id: "gift-cola-1l",
  name: "Кола 1 л",
  size: "1 л",
  price: 0,
  image: "/img/cola.png",
  description: "Подарок при заказе от 2 пицц",
  isGift: true,
};

function countPizzasInOrder(items) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((sum, item) => {
    if (!item || item.isGift) return sum;
    const count = Number(item.count);
    if (!Number.isFinite(count) || count <= 0) return sum;
    return sum + count;
  }, 0);
}

function qualifiesForColaGift(items) {
  return countPizzasInOrder(items) >= PROMO_MIN_PIZZAS;
}

function buildOrderItemsWithGift(items) {
  const pizzas = (items || []).filter((item) => item && !item.isGift);
  if (!qualifiesForColaGift(pizzas)) return pizzas;

  return [...pizzas, { ...PROMO_COLA_GIFT, count: 1 }];
}

module.exports = {
  PROMO_MIN_PIZZAS,
  PIZZA_SIZE,
  PROMO_COLA_GIFT,
  countPizzasInOrder,
  qualifiesForColaGift,
  buildOrderItemsWithGift,
};
