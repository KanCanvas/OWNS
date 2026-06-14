const { PIZZA_SIZE } = require("./promo");

const pizzas = [
  {
    id: "pizza-own",
    name: "OWN фирменная",
    size: PIZZA_SIZE,
    description:
      "Белый соус, моцарелла, ветчина, шампиньоны, помидоры, оливки, полукопчёные колбаски.",
    price: 2390,
    image: encodeURI("/img/OWN pizza фирменная.png"),
    action: "Добавить",
  },
  {
    id: "pizza-1",
    name: "Маргарита",
    size: PIZZA_SIZE,
    description:
      "Томатный соус, моцарелла, свежий базилик, оливковое масло.",
    price: 1790,
    image: "/img/margarita.png",
    action: "Добавить",
  },
  {
    id: "pizza-2",
    name: "Пепперони",
    size: PIZZA_SIZE,
    description:
      "Томатный соус, моцарелла, пепперони, oregano.",
    price: 1890,
    image: "/img/pepperoni.png",
    action: "Добавить",
  },
  {
    id: "pizza-3",
    name: "Пепперони фреш",
    size: PIZZA_SIZE,
    description:
      "Томатный соус, моцарелла, пепперони, свежие томаты, руккола.",
    price: 1890,
    image: "/img/pepperoni-fresh.png",
    action: "Добавить",
  },
  {
    id: "pizza-4",
    name: "Ветчина и грибы",
    size: PIZZA_SIZE,
    description:
      "Сливочный соус, моцарелла, ветчина, шампиньоны, сыр пармезан.",
    price: 1890,
    image: "/img/ham-mushrooms.png",
    action: "Добавить",
  },
  {
    id: "pizza-5",
    name: "4 сезона",
    size: PIZZA_SIZE,
    description:
      "Томатный соус, моцарелла, ветчина, грибы, артишоки, oливки.",
    price: 2190,
    image: "/img/four-seasons.png",
    action: "Добавить",
  },
];

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesPizzaName(pizza, query) {
  if (!query) return true;
  return pizza.name.toLowerCase().includes(query);
}

function filterPizzas(query) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return pizzas;

  const exactMatches = pizzas.filter(
    (pizza) => pizza.name.toLowerCase() === normalizedQuery
  );
  if (exactMatches.length === 1) return exactMatches;

  return pizzas.filter((pizza) => matchesPizzaName(pizza, normalizedQuery));
}

function getSearchSuggestions(query, limit = 6) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  return pizzas
    .filter((pizza) => pizza.name.toLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}

module.exports = {
  pizzas,
  normalizeSearch,
  filterPizzas,
  getSearchSuggestions,
};
