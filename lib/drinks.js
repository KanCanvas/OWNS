const drinks = [
  {
    id: "drink-cola-1l",
    name: "Кола 1 л",
    size: "1 л",
    description: "Освежающий газированный напиток. Идеально к пицце.",
    price: 790,
    image: "/img/cola.png",
    category: "drinks",
  },
];

function filterDrinks(query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return drinks;

  return drinks.filter((drink) =>
    drink.name.toLowerCase().includes(normalizedQuery)
  );
}

module.exports = {
  drinks,
  filterDrinks,
};
