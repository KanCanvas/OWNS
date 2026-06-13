"use client";

import { useEffect, useMemo, useState, useContext } from "react";
import axios from "axios";
import { CartContext } from "./context/CartProvider";
import { useSearch } from "./context/SearchProvider";
import styles from "./page.module.css";
import { formatPrice } from "../lib/formatPrice";

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

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return item.value;
}

export default function HomePage() {
  const { filteredPizzas, pizzas, searchQuery } = useSearch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [ingredientsError, setIngredientsError] = useState("");
  const { cartItem } = useContext(CartContext);

  const [cartItems, setCartItems] = useState({});

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

  const getPizzaCount = (pizzaId) => {
    const rawCount = cartItems[pizzaId]?.count ?? 0;
    const safeCount = Number(rawCount);
    if (!Number.isFinite(safeCount) || safeCount <= 0) return 0;
    return safeCount > 10 ? 10 : safeCount;
  };

  const getPizzaLocal = (pizzaId) => {
    if (typeof window === "undefined") return 0;
    const rawCount =
      JSON.parse(localStorage.getItem("cartElements") || "{}")[pizzaId]?.count ??
      0;
    const safeCount = Number(rawCount);
    if (!Number.isFinite(safeCount) || safeCount <= 0) return 0;
    return safeCount > 10 ? 10 : safeCount;
  };

  const incrementPizza = (pizza) => {
    setCartItems((prev) => {
      const currentCount = Number(prev[pizza.id]?.count ?? 0);
      const safeCurrent =
        Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
      const nextCount = safeCurrent >= 10 ? 10 : safeCurrent + 1;

      return {
        ...prev,
        [pizza.id]: {
          ...pizza,
          count: nextCount,
        },
      };
    });
  };

  const decrementPizza = (pizza) => {
    setCartItems((prev) => {
      const currentCount = Number(prev[pizza.id]?.count ?? 0);
      const safeCurrent =
        Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
      const nextCount = safeCurrent <= 0 ? 0 : safeCurrent - 1;

      if (nextCount <= 0) {
        const nextItems = { ...prev };
        delete nextItems[pizza.id];
        return nextItems;
      }

      return {
        ...prev,
        [pizza.id]: {
          ...pizza,
          count: nextCount,
        },
      };
    });
  };

  useEffect(() => {
    const savedCart = getWithExpiry("cartItems");
    if (savedCart && typeof savedCart === "object" && !Array.isArray(savedCart)) {
      const nextCart = {};

      for (const pizza of pizzas) {
        const savedItem = savedCart[pizza.id];
        if (!savedItem) continue;

        const savedCount = Number(savedItem.count ?? 0);
        if (!Number.isFinite(savedCount) || savedCount <= 0) continue;

        nextCart[pizza.id] = {
          ...pizza,
          count: savedCount > 10 ? 10 : savedCount,
        };
      }

      setCartItems(nextCart);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setWithExpiry("cartItems", cartItems, 60 * 60 * 1000);

    if (Object.keys(cartItems).length > 0) {
      localStorage.setItem("cartElements", JSON.stringify(cartItems));
      setTimeout(() => {
        localStorage.removeItem("cartElements");
        localStorage.removeItem("cartItems");
        setCartItems({});
      }, 500000);
    }
  }, [cartItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (Object.keys(cartItem).length !== 0) {
      setCartItems({});
      localStorage.removeItem("cartElements");
      localStorage.removeItem("cartItems");
    }
  }, [cartItem]);

  return (
    <section className="home-mock">
      <h1 className="home-title">Все пиццы</h1>

      <div className="chips">
        <button
          className="tiny-action tiny-action-accent chips-constructor-btn"
          type="button"
          onClick={openConstructorModal}
        >
          Собрать
        </button>
      </div>

      <div className={styles.grid}>
        {filteredPizzas.length > 0 ? (
          filteredPizzas.map((pizza) => (
          <article key={pizza.id} className={styles.card}>
            <div className={styles.imageBlock}>
              <img src={pizza.image} alt={pizza.name} />
            </div>
            <div className={styles.body}>
              <h3>{pizza.name}</h3>
              <p className={styles.size}>{pizza.size}</p>
              <p>{pizza.description}</p>
              <div className={styles.bottom}>
                <strong>{formatPrice(pizza.price)} ₸</strong>
                <div className="counter">
                  <button type="button" onClick={() => decrementPizza(pizza)}>
                    -
                  </button>
                  <span>
                    {getPizzaCount(pizza.id) === 0
                      ? getPizzaLocal(pizza.id)
                      : getPizzaCount(pizza.id)}
                  </span>
                  <button
                    type="button"
                    disabled={getPizzaCount(pizza.id) >= 10}
                    onClick={() => incrementPizza(pizza)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </article>
          ))
        ) : (
          <p className={styles.emptySearch}>
            По запросу «{searchQuery}» ничего не найдено.
          </p>
        )}
      </div>

      {isModalOpen && (
        <div
          className="constructor-modal-backdrop"
          onClick={closeConstructorModal}
        >
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
                  <div className="constructor-preview-pizza">Твоя пицца</div>
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
                        const isActive =
                          selectedIngredients.includes(ingredient);
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
