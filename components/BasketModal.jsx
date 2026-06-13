"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useState } from "react";
import styles from "./BasketModal.module.css";
import { getStoredUser } from "../lib/auth-storage";
import { CartContext } from "@/app/context/CartProvider";
import { useContext } from "react";
import modelUserAddress from "../app/features/userData/userAddress/modelUserAddres"
import {
  PROMO_COLA_GIFT,
  PROMO_MIN_PIZZAS,
  buildOrderItemsWithGift,
  qualifiesForColaGift,
} from "../lib/promo";


function getWithExpiry(key) {
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

function pizzaWord(n) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "пицц";
  if (last > 1 && last < 5) return "пиццы";
  if (last === 1) return "пицца";
  return "пицц";
}

function DeliveryField({ id, label, name, value, onChange, placeholder, disabled }) {
  return (
    <div className={styles.deliveryFieldGroup}>
      <label htmlFor={id} className={styles.deliveryFieldLabel}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={styles.deliveryInput}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export default function BasketModal({ onRequireLogin }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [deliveryPlace, setDeliveryPlace] = useState("HOME");
  const { cartItem, setCartItem } = useContext(CartContext);
  const [trigger, setTrigger] = useState(false);

  const [deliveryData, setDeliveryData] = useState({
    homeAddress: "",
    homeEntrance: "",
    homeApartment: "",
  
    officeAddress: "",
    officeOrganization: "",
    officeFloor: "",
    officeRoom: "",
  });

  const handleDeliveryChange = (e) => {
    const { name, value } = e.target;
  
    setDeliveryData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const titleId = useId();
  const deliveryFieldsId = useId();

  useEffect(() => setMounted(true), []);

  const syncCartFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const rawCart = getWithExpiry("cartItems");
    if (!rawCart || typeof rawCart !== "object" || Object.keys(rawCart).length === 0) {
      const rawCartLocal = JSON.parse(localStorage.getItem("cartElements") || "{}");
      const items = Object.values(rawCartLocal)
      .map((item) => {
        const count = Number(item?.count ?? 0);
        if (!Number.isFinite(count) || count <= 0) return null;
        return {
          ...item,
          count
        };
      })
      .filter(Boolean);

      setCartItems(items);
      return;
    }
    const items = Object.values(rawCart)
      .map((item) => {
        const count = Number(item?.count ?? 0);
        if (!Number.isFinite(count) || count <= 0) return null;
        return {
          ...item,
          count
        };
      })
      .filter(Boolean);

    setCartItems(items);
  }, []);

  useEffect(() => {
    if (!open) return;
    syncCartFromStorage();
  }, [open, syncCartFromStorage]);

  const openBasket = () => {
    syncCartFromStorage();
    setOrderError("");
    setOrderSuccess("");
    setOpen(true);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.count, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + (typeof item.price === "number" ? item.price * item.count : 0),
    0
  );
  const hasColaGift = qualifiesForColaGift(cartItems);

  const handleOrder = async () => {
    if (cartItems.length === 0 || cartCount <= 0) {
      setOrderError("Корзина пуста. Добавьте пиццу перед заказом.");
      setOrderSuccess("");
      return;
    }

    if (!getStoredUser()) {
      setOrderError("");
      setOrderSuccess("");
      setOpen(false);
      onRequireLogin?.();
      return;
    }

    if (paymentMethod !== "CASH" && paymentMethod !== "KASPI") {
      setOrderError("Выберите способ оплаты: наличные или Kaspi.");
      setOrderSuccess("");
      return;
    }

    setIsOrdering(true);
    setOrderError("");
    setOrderSuccess("");

    try {
      setCartItem(cartItems);
      const token = localStorage.getItem("token");
      const orderItems = buildOrderItemsWithGift(cartItems);
      const response = await fetch("/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          pizza: orderItems,
          count: cartCount,
          total: cartTotal,
          paymentMethod,
          createdAt: new Date().toISOString(),
          address: deliveryData.homeAddress,
          entrance: deliveryData.homeEntrance,
          apartment: deliveryData.homeApartment,
        }),
      });

      setTrigger(true);

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        const message =
          payload?.error || `Сервер ответил ${response.status} ${payload.message}.`;
        throw new Error(message);
      }

      setOrderSuccess(
        (hasColaGift ? "Заказ отправлен. Кола 1 л добавлена в подарок! " : "") +
          (paymentMethod === "KASPI"
            ? "Оплата через Kaspi при получении."
            : "Оплата наличными при получении.")
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось отправить заказ. Попробуйте еще раз.";
      setOrderError(message);
    } finally {
      setIsOrdering(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      const userAddres = await modelUserAddress(token);
      setDeliveryData((prev) => ({
        ...prev,
        homeAddress: userAddres?.address?.homeaddress || "",
        homeEntrance: userAddres?.address?.homeentrance || "",
        homeApartment: userAddres?.address?.homeapartment || ""
      }))
    }
    fetchData()
  }, [])

  const modal = open && (
    <div
      className="app-modal-backdrop"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className={`app-modal ${styles.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headline}>
            <h2 id={titleId} className={styles.title}>
              Корзина
            </h2>
            {cartCount > 0 ? (
              <span
                className={styles.countBadge}
                aria-label={`${cartCount} ${pizzaWord(cartCount)}`}
              >
                {cartCount}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Закрыть корзину"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          {cartCount <= 0 ? (
            <p className={styles.empty}>
              Пока пусто — добавьте пиццу из меню.
            </p>
          ) : (
            <>
              {cartItems.map((item) => (
                <article key={item.id || item.name} className={styles.card}>
                  <div className={styles.cardMain}>
                    <div className={styles.thumb} aria-hidden>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className={styles.thumbImg}
                        />
                      ) : (
                        <span className={styles.thumbPlaceholder}>🍕</span>
                      )}
                    </div>
                    <div className={styles.info}>
                      <div className={styles.titleRow}>
                        <h3 className={styles.itemTitle}>{item.name}</h3>
                        <span className={styles.qty}>×{item.count}</span>
                      </div>
                      {item.size ? (
                        <p className={styles.meta}>{item.size}</p>
                      ) : null}
                      {item.description ? (
                        <p className={styles.desc}>{item.description}</p>
                      ) : null}
                      {typeof item.price === "number" ? (
                        <p className={styles.meta}>
                          {item.price.toLocaleString("ru-RU")} ₸ × {item.count}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}

              {hasColaGift ? (
                <article className={`${styles.card} ${styles.giftCard}`}>
                  <div className={styles.cardMain}>
                    <div className={`${styles.thumb} ${styles.giftThumb}`} aria-hidden>
                      <img
                        src={PROMO_COLA_GIFT.image}
                        alt=""
                        className={styles.thumbImg}
                      />
                    </div>
                    <div className={styles.info}>
                      <div className={styles.titleRow}>
                        <h3 className={styles.itemTitle}>{PROMO_COLA_GIFT.name}</h3>
                        <span className={styles.giftBadge}>Подарок</span>
                      </div>
                      <p className={styles.desc}>
                        Бесплатно при заказе от {PROMO_MIN_PIZZAS} пицц 30 см
                      </p>
                      <p className={styles.meta}>0 ₸</p>
                    </div>
                  </div>
                </article>
              ) : cartCount === 1 ? (
                <p className={styles.promoHint}>
                  Добавьте ещё одну пиццу — получите {PROMO_COLA_GIFT.name} бесплатно!
                </p>
              ) : null}
              <article className={styles.card}>
                <div className={styles.total}>
                  <span>Итого</span>
                  <strong>{cartTotal.toLocaleString("ru-RU")} ₸</strong>
                </div>
              </article>
            </>
          )}

          {cartCount > 0 && cartItems.length > 0 ? (
            <section className={styles.delivery} aria-label="Адрес доставки">
              <h3 className={styles.deliveryTitle}>Адрес доставки</h3>

              <div
                className={styles.deliveryTabs}
                role="radiogroup"
                aria-label="Тип адреса доставки"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={deliveryPlace === "HOME"}
                  className={`${styles.deliveryTab} ${
                    deliveryPlace === "HOME" ? styles.deliveryTabActive : ""
                  }`}
                  onClick={() => setDeliveryPlace("HOME")}
                  disabled={isOrdering}
                >
                  Дом
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={deliveryPlace === "OFFICE"}
                  className={`${styles.deliveryTab} ${
                    deliveryPlace === "OFFICE" ? styles.deliveryTabActive : ""
                  }`}
                  onClick={() => setDeliveryPlace("OFFICE")}
                  disabled={isOrdering}
                >
                  Офис
                </button>
              </div>

              <div className={styles.deliveryPanel}>
              <div className={styles.deliveryFields}>
                {deliveryPlace === "HOME" ? (
                  <>
                    <DeliveryField
                      id={`${deliveryFieldsId}-home-address`}
                      label="Адрес"
                      name="homeAddress"
                      placeholder="ул. Абая, 10"
                      disabled={isOrdering}
                      value={deliveryData.homeAddress}
                      onChange={handleDeliveryChange}
                    />
                    <div className={styles.deliveryRow}>
                      <DeliveryField
                        id={`${deliveryFieldsId}-home-entrance`}
                        label="Подъезд"
                        name="homeEntrance"
                        placeholder="3"
                        disabled={isOrdering}
                        value={deliveryData.homeEntrance}
                        onChange={handleDeliveryChange}
                      />
                      <DeliveryField
                        id={`${deliveryFieldsId}-home-apartment`}
                        label="Квартира"
                        name="homeApartment"
                        placeholder="42"
                        disabled={isOrdering}
                        value={deliveryData.homeApartment}
                        onChange={handleDeliveryChange}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <DeliveryField
                      id={`${deliveryFieldsId}-office-address`}
                      label="Адрес"
                      name="officeAddress"
                      placeholder="ул. Достык, 28"
                      disabled={isOrdering}
                    />
                    <DeliveryField
                      id={`${deliveryFieldsId}-office-org`}
                      label="Организация"
                      name="officeOrganization"
                      placeholder='ТОО «Компания»'
                      disabled={isOrdering}
                    />
                    <div className={styles.deliveryRow}>
                      <DeliveryField
                        id={`${deliveryFieldsId}-office-floor`}
                        label="Этаж"
                        name="officeFloor"
                        placeholder="5"
                        disabled={isOrdering}
                      />
                      <DeliveryField
                        id={`${deliveryFieldsId}-office-room`}
                        label="Кабинет"
                        name="officeRoom"
                        placeholder="512"
                        disabled={isOrdering}
                      />
                    </div>
                  </>
                )}
              </div>
              </div>
            </section>
          ) : null}

          {cartCount > 0 && cartItems.length > 0 ? (
            <div
              className={styles.payment}
              role="radiogroup"
              aria-label="Способ оплаты при получении"
            >
              <span className={styles.paymentLabel}>Оплата при получении:</span>
              <div className={styles.paymentOptions}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === "CASH"}
                  className={`${styles.payBtn} ${
                    paymentMethod === "CASH" ? styles.payBtnActive : ""
                  }`}
                  onClick={() => setPaymentMethod("CASH")}
                  disabled={isOrdering}
                >
                  Наличные
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === "KASPI"}
                  className={`${styles.payBtn} ${
                    paymentMethod === "KASPI" ? styles.payBtnActive : ""
                  }`}
                  onClick={() => setPaymentMethod("KASPI")}
                  disabled={isOrdering}
                >
                  Kaspi перевод
                </button>
              </div>
            </div>
          ) : null}

          {orderError ? <p className={styles.orderError}>{orderError}</p> : null}
          {orderSuccess ? <p className={styles.orderSuccess}>{orderSuccess}</p> : null}

          <button
            type="button"
            className={styles.orderBtn}
            onClick={() => handleOrder()}
            disabled={isOrdering || cartCount <= 0 || cartItems.length === 0}
          >
            {isOrdering ? "Отправляем..." : "Заказать"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="outline-button icon-only"
        aria-label="Открыть корзину"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openBasket}
      >
        🛒
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
