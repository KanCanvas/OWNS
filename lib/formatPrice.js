function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("ru-RU");
}

function formatPriceWithCurrency(value) {
  return `${formatPrice(value)} ₸`;
}

module.exports = {
  formatPrice,
  formatPriceWithCurrency,
};
