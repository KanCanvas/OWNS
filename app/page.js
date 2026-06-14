"use client";

import { useEffect, useMemo, useState, useContext } from "react";
import axios from "axios";
import { CartContext } from "./context/CartProvider";
import { useSearch } from "./context/SearchProvider";
import ProductModal from "../components/ProductModal";
import styles from "./page.module.css";
import { formatPrice } from "../lib/formatPrice";
import { notifyCartChange } from "../lib/cart-storage";
import { drinks, filterDrinks } from "../lib/drinks";

const CATALOGS = {
  PIZZAS: "pizzas",
  DRINKS: "drinks",
};

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
  const [activeCatalog, setActiveCatalog] = useState(CATALOGS.PIZZAS);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [ingredientsError, setIngredientsError] = useState("");
  const { cartItem } = useContext(CartContext);
  const [cartItems, setCartItems] = useState({});

  const filteredDrinks = useMemo(
    () => filterDrinks(searchQuery),
    [searchQuery]
  );

  const catalogProducts = useMemo(() => {
    return activeCatalog === CATALOGS.DRINKS ? filteredDrinks : filteredPizzas;
  }, [activeCatalog, filteredDrinks, filteredPizzas]);

  const catalogTitle =
    activeCatalog === CATALOGS.DRINKS ? "Напитки" : "Пиццы";

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

  const getProductCount = (productId) => {
    const rawCount = cartItems[productId]?.count ?? 0;
    const safeCount = Number(rawCount);
    if (!Number.isFinite(safeCount) || safeCount <= 0) return 0;
    return safeCount > 10 ? 10 : safeCount;
  };

  const setProductCount = (product, nextCount) => {
    setCartItems((prev) => {
      const safeCount = Math.max(0, Math.min(10, Number(nextCount) || 0));

      if (safeCount <= 0) {
        const nextItems = { ...prev };
        delete nextItems[product.id];
        return nextItems;
      }

      return {
        ...prev,
        [product.id]: {
          ...product,
          count: safeCount,
        },
      };
    });
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

  useEffect(() => {
    const savedCart = getWithExpiry("cartItems");
    if (!savedCart || typeof savedCart !== "object" || Array.isArray(savedCart)) {
      return;
    }

    const productById = Object.fromEntries(
      [...pizzas, ...drinks].map((product) => [product.id, product])
    );
    const nextCart = {};

    for (const [productId, savedItem] of Object.entries(savedCart)) {
      const product = productById[productId];
      if (!product) continue;

      const savedCount = Number(savedItem?.count ?? 0);
      if (!Number.isFinite(savedCount) || savedCount <= 0) continue;

      nextCart[productId] = {
        ...product,
        count: savedCount > 10 ? 10 : savedCount,
      };
    }

    setCartItems(nextCart);
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

    notifyCartChange();
  }, [cartItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (Object.keys(cartItem).length !== 0) {
      setCartItems({});
      localStorage.removeItem("cartElements");
      localStorage.removeItem("cartItems");
      notifyCartChange();
    }
  }, [cartItem]);

  return (
    <section className="home-mock">
      <h1 className="home-title">{catalogTitle}</h1>

      <div className={`chips ${styles.catalogTabs}`}>
        <button
          type="button"
          className={`chip ${activeCatalog === CATALOGS.PIZZAS ? "active" : ""}`}
          onClick={() => setActiveCatalog(CATALOGS.PIZZAS)}
        >
          Пиццы
        </button>
        <button
          type="button"
          className={`chip ${activeCatalog === CATALOGS.DRINKS ? "active" : ""}`}
          onClick={() => setActiveCatalog(CATALOGS.DRINKS)}
        >
          Напитки
        </button>
        {activeCatalog === CATALOGS.PIZZAS ? (
          <button
            className="tiny-action tiny-action-accent chips-constructor-btn"
            type="button"
            onClick={openConstructorModal}
          >
            Собрать
          </button>
        ) : null}
      </div>

      <div className={styles.grid}>
        {catalogProducts.length > 0 ? (
          catalogProducts.map((product) => {
            const count = getProductCount(product.id);
            const isDrink = product.category === "drinks";

            return (
              <article
                key={product.id}
                className={`${styles.card} ${isDrink ? styles.cardDrink : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => openProductModal(product)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openProductModal(product);
                  }
                }}
              >
                <div className={styles.imageBlock}>
                  <img src={product.image} alt={product.name} />
                  {count > 0 ? (
                    <span className={styles.cartBadge}>×{count}</span>
                  ) : null}
                </div>
                <div className={styles.body}>
                  <h3>{product.name}</h3>
                  {product.size ? (
                    <p className={styles.size}>{product.size}</p>
                  ) : null}
                  <p>{product.description}</p>
                  <div className={styles.bottom}>
                    <strong>{formatPrice(product.price)} ₸</strong>
                    <span className={styles.openHint}>Подробнее</span>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className={styles.emptySearch}>
            По запросу «{searchQuery}» ничего не найдено.
          </p>
        )}
      </div>

      <ProductModal
        product={selectedProduct}
        initialCount={
          selectedProduct ? getProductCount(selectedProduct.id) : 0
        }
        onClose={closeProductModal}
        onChangeCount={setProductCount}
      />

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
