"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const categories = ["Все", "Мясные", "Острые", "Вегетарианские", "С курицей"];

const pizzas = [
  {
    name: "Сырный цыпленок",
    description:
      "Цыпленок, сырный соус, сыры чеддер и пармезан, орегано, соус томатный.",
    price: 1500,
    image: "/img/pizza 1.png",
    action: "Добавить"
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
    action: "Добавить"
  }
];

function setWithExpiry(key, value, ttl) {
  if (typeof window === "undefined") return;
  const now = new Date();

  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };

  localStorage.setItem(key, JSON.stringify(item));
}

function getWithExpiry(key) {
  if (typeof window === "undefined") return null;
  const itemStr = localStorage.getItem(key);

  if (!itemStr) return null;

  const item = JSON.parse(itemStr);
  const now = new Date();

  // если время истекло
  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return item.value;
}

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [ingredientsError, setIngredientsError] = useState("");

    const [countPizza, setCountPizza] = useState(() => {
      const savedCount = getWithExpiry("countPizza");
      return savedCount > 0 ? Number(savedCount) : 0;
    });

  const selectedPreview = useMemo(
    () => selectedIngredients.join(", "),
    [selectedIngredients]
  );

  const normalizeIngredients = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload?.ingredients && Array.isArray(payload.ingredients)) {
      return payload.ingredients;
    }

    return [];
  };

  const openConstructorModal = async () => {
    setIsModalOpen(true);
    setIsLoadingIngredients(true);
    setIngredientsError("");

    try {
      const response = await axios.get("/constructorpizza");
      const normalized = normalizeIngredients(response.data).map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.name || item?.title || "Без названия";
      });

      setIngredients(normalized);
      setSelectedIngredients([]);
    } catch {
      setIngredients([]);
      setIngredientsError(
        "Не удалось загрузить ингредиенты. Попробуйте еще раз."
      );
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const closeConstructorModal = () => {
    setIsModalOpen(false);
  };

  const toggleIngredient = (ingredient) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((item) => item !== ingredient)
        : [...prev, ingredient]
    );
  };

  useEffect(() => {
    if(countPizza > 0) {
      setWithExpiry("countPizza", countPizza, 60 * 60 * 1000);
    }
  }, [countPizza]);

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
        <button
          className="tiny-action tiny-action-accent chips-constructor-btn"
          type="button"
          onClick={openConstructorModal}
        >
          Собрать
        </button>
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
              <strong>от {pizza.price} ₸</strong>
              {pizza.counter ? (
                <div className="counter">
                  <button type="button" onClick={() => { getWithExpiry("countPizza") === null? setCountPizza(0) : setCountPizza(prev => prev - 1)}}>-</button>
                  <span>{getWithExpiry("countPizza") === null? 0 : countPizza < 0 ? 0: countPizza < 11 ? countPizza : 10}</span>
                  {getWithExpiry("countPizza") === null? <button type="button" onClick={() => {setCountPizza(1); localStorage.setItem("pizza", JSON.stringify(pizza))}}>+</button> : countPizza < 10 && <button type="button" onClick={() => {setCountPizza(prev => prev + 1)}}>+</button>}
                </div>
              ) : (
                <div className="pizza-actions">
                  <button className="tiny-action" type="button">
                    {pizza.action}
                  </button>
                  <button
                    className="tiny-action tiny-action-accent"
                    type="button"
                    onClick={openConstructorModal}
                  >
                    Собрать
                  </button>
                </div>
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

      {isModalOpen && (
        <div className="constructor-modal-backdrop" onClick={closeConstructorModal}>
          <div
            className="constructor-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="constructor-modal-head">
              <span className="constructor-modal-title">Конструктор</span>
              <button
                type="button"
                className="constructor-close"
                onClick={closeConstructorModal}
              >
                ✕
              </button>
            </div>

            <div className="constructor-layout">
              <div className="constructor-preview">
                <div className="constructor-preview-plate">
                  <div className="constructor-preview-pizza">
                    Твоя пицца
                  </div>
                </div>
                <p className="constructor-preview-note">
                  Здесь будет отображаться картинка собранной пиццы.
                </p>
              </div>

              <div className="constructor-panel">
                <h2>Собери свою пиццу</h2>
                <p className="constructor-subtitle">
                  Выбери ингредиенты, и мы приготовим пиццу по твоему вкусу.
                </p>

                {isLoadingIngredients && (
                  <p className="constructor-state">Загружаем ингредиенты...</p>
                )}

                {!isLoadingIngredients && ingredientsError && (
                  <p className="constructor-error">{ingredientsError}</p>
                )}

                {!isLoadingIngredients && !ingredientsError && (
                  <>
                    <div className="ingredients-grid">
                      {ingredients.map((ingredient) => {
                        const isActive = selectedIngredients.includes(ingredient);
                        return (
                          <button
                            key={ingredient}
                            type="button"
                            className={`ingredient-chip ${isActive ? "active" : ""}`}
                            onClick={() => toggleIngredient(ingredient)}
                          >
                            {ingredient}
                          </button>
                        );
                      })}
                    </div>
                    <p className="constructor-selected">
                      {selectedIngredients.length
                        ? `Выбрано: ${selectedPreview}`
                        : "Пока ничего не выбрано"}
                    </p>
                  </>
                )}

                <button type="button" className="constructor-order-btn">
                  Заказать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
