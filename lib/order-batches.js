function getOrderBatchKey(order) {
  const date = new Date(order.createdAt);
  return [
    order.userId,
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ].join(":");
}

function groupOrdersByBatch(orders, usersById) {
  const grouped = new Map();

  for (const order of orders) {
    const batchKey = getOrderBatchKey(order);
    const customer = usersById[order.userId];

    if (!grouped.has(batchKey)) {
      grouped.set(batchKey, {
        id: batchKey,
        batchKey,
        userId: order.userId,
        userName: customer?.name || "Неизвестный пользователь",
        userPhone: customer?.phone || "—",
        homeaddress: customer?.homeaddress || null,
        homeentrance: customer?.homeentrance || null,
        homeapartment: customer?.homeapartment || null,
        createdAt: order.createdAt,
        orderIds: [],
        items: [],
        total: 0,
      });
    }

    const group = grouped.get(batchKey);

    if (new Date(order.createdAt) > new Date(group.createdAt)) {
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
    group.total += order.total;
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

module.exports = {
  getOrderBatchKey,
  groupOrdersByBatch,
};
