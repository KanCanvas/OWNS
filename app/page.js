const categories = ["Все", "Мясные", "Острые", "Вегетарианские", "С курицей"];

const pizzas = [
  {
    name: "Сырный цыпленок",
    description:
      "Цыпленок, сырный соус, сыры чеддер и пармезан, орегано, соус томатный.",
    price: 1500,
    image: "/img/pizza 1.png",
    action: "Собрать"
  },
  {
    name: "Диабло",
    description:
      "Острая чоризо, острый перец халапеньо, соус барбекю, томаты, моцарелла.",
    price: 1500,
    image: "/img/pizza 2.png",
    action: "Добавить"
  },
  {
    name: "Чизбургер-пицца",
    description:
      "Мясной соус болоньезе бургер, моцарелла и фирменный томатный соус.",
    price: 1500,
    image: "/img/pizza 3.png",
    counter: 1
  },
  {
    name: "Сырный цыпленок",
    description:
      "Цыпленок, шампиньоны, сыры чеддер и пармезан, томатный соус.",
    price: 1500,
    image: "/img/pizza 4.png",
    action: "Собрать"
  }
];

export default function HomePage() {
  return (
    <section className="home-mock">
      <h1 className="home-title">Все пиццы</h1>

      <div className="chips">
        {categories.map((category, index) => (
          <button
            key={category}
            type="button"
            className={`chip ${index === 0 ? "active" : ""}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="home-grid">
        {pizzas.map((pizza) => (
          <article key={pizza.name + pizza.image} className="pizza-tile">
            <div className="pizza-image-wrap">
              <img
                src={pizza.image}
                alt={pizza.name}
                className="pizza-image"
              />
            </div>
            <h3>{pizza.name}</h3>
            <p>{pizza.description}</p>
            <div className="pizza-bottom">
              <strong>от {pizza.price}</strong>
              {pizza.counter ? (
                <div className="counter">
                  <button type="button">-</button>
                  <span>{pizza.counter}</span>
                  <button type="button">+</button>
                </div>
              ) : (
                <button className="tiny-action" type="button">
                  {pizza.action}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="pagination">
        <button type="button" className="page-arrow">
          {"<"}
        </button>
        <button type="button" className="page-btn active">
          1
        </button>
        <button type="button" className="page-btn">
          2
        </button>
        <button type="button" className="page-btn">
          3
        </button>
        <button type="button" className="page-arrow">
          {">"}
        </button>
        <span className="page-total">10 из 65</span>
      </div>
    </section>
  );
}
