function createEmptyGroup(userId, customer, phase) {
  return {
    id: `${userId}-${phase}`,
    phase,
    userId,
    userName: customer?.name || "Неизвестный пользователь",
    userPhone: customer?.phone || "—",
    homeaddress: customer?.homeaddress || null,
    homeentrance: customer?.homeentrance || null,
    homeapartment: customer?.homeapartment || null,
    createdAt: null,
    orderIds: [],
    items: [],
    total: 0,
  };
}

function appendOrderToGroup(group, order) {
  if (!group.createdAt || new Date(order.createdAt) > new Date(group.createdAt)) {
    group.createdAt = order.createdAt;
  }

  group.orderIds.push(order.id);
  group.items.push({
    id: order.id,
    pizzaName: order.pizzaName,
    pizzaSize: order.pizzaSize,
    pizzaPrice: order.pizzaPrice,
    count: order.count,
    total: order.total,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    take: order.take,
    complete: order.complete,
    ComplDelevery: order.ComplDelevery,
  });
  group.total += Number(order.total || 0);
}

/**
 * Группировка для админки:
 * - pending: все позиции клиента с take=false копятся в одну карточку
 * - processing: все позиции с take=true и complete=false — отдельная карточка
 */
function groupOrdersByBatch(orders, usersById) {
  const pendingByUser = new Map();
  const processingByUser = new Map();

  for (const order of orders) {
    const userId = String(order.userId);
    const customer = usersById[userId];

    if (!order.take) {
      if (!pendingByUser.has(userId)) {
        pendingByUser.set(userId, createEmptyGroup(userId, customer, "pending"));
      }
      appendOrderToGroup(pendingByUser.get(userId), order);
      continue;
    }

    if (!order.complete) {
      if (!processingByUser.has(userId)) {
        processingByUser.set(userId, createEmptyGroup(userId, customer, "processing"));
      }
      appendOrderToGroup(processingByUser.get(userId), order);
    }
  }

  const groups = [
    ...pendingByUser.values(),
    ...processingByUser.values(),
  ];

  return groups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  groupOrdersByBatch,
};
