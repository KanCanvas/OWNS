const PAYMENT_LABELS = {
  CASH: "Наличные",
  KASPI: "Kaspi перевод",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatAddress({ address, entrance, apartment }) {
  const parts = [address];

  if (entrance) {
    parts.push(`подъезд ${entrance}`);
  }

  if (apartment) {
    parts.push(`кв. ${apartment}`);
  }

  return parts.filter(Boolean).join(", ");
}

function formatOrderNotification({
  user,
  orders,
  paymentMethod,
  address,
  entrance,
  apartment,
}) {
  const orderIds = orders.map((order) => order.id).join(", ");
  const grandTotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const itemsText = orders
    .map((order) => {
      const sizePart = order.pizzaSize ? ` (${order.pizzaSize})` : "";
      return `• ${escapeHtml(order.pizzaName)}${escapeHtml(sizePart)} × ${order.count} — ${Number(order.total || 0).toLocaleString("ru-RU")} ₸`;
    })
    .join("\n");

  return [
    "🍕 <b>Новый заказ</b>",
    `<b>№</b> ${escapeHtml(orderIds)}`,
    "",
    `<b>Клиент:</b> ${escapeHtml(user?.name || "—")}`,
    `<b>Телефон:</b> ${escapeHtml(user?.phone || "—")}`,
    `<b>Адрес:</b> ${escapeHtml(formatAddress({ address, entrance, apartment }))}`,
    "",
    "<b>Состав:</b>",
    itemsText,
    "",
    `<b>Оплата:</b> ${escapeHtml(PAYMENT_LABELS[paymentMethod] || paymentMethod)}`,
    `<b>Итого:</b> ${grandTotal.toLocaleString("ru-RU")} ₸`,
  ].join("\n");
}

async function sendTelegramMessage(text) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    const missing = [
      !token ? "BOT_TOKEN" : null,
      !chatId ? "TELEGRAM_ADMIN_CHAT_ID" : null,
    ].filter(Boolean);

    console.warn(
      `Telegram notify skipped: missing env on Web Service: ${missing.join(", ")}`
    );
    return false;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${payload}`);
  }

  return true;
}

async function notifyAdminAboutOrder(payload) {
  try {
    const text = formatOrderNotification(payload);
    await sendTelegramMessage(text);
    console.log("Telegram order notification sent.");
    return true;
  } catch (error) {
    console.error("Failed to send Telegram order notification:", error);
    return false;
  }
}

module.exports = {
  notifyAdminAboutOrder,
  formatOrderNotification,
};
