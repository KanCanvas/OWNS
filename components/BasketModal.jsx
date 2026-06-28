"use client";

import { createPortal } from "react-dom";
import { useCallback, useContext, useEffect, useId, useState } from "react";
import styles from "./BasketModal.module.css";
import { getStoredUser } from "../lib/auth-storage";
import {
  CART_CHANGE_EVENT,
  getCartSummary,
  notifyCartChange,
  readCartItems,
} from "../lib/cart-storage";
import { CartContext } from "@/app/context/CartProvider";
import modelUserAddress from "../app/features/userData/userAddress/modelUserAddres";
import {
  PROMO_COLA_GIFT,
  PROMO_MIN_PIZZAS,
  buildOrderItemsWithGift,
  qualifiesForColaGift,
} from "../lib/promo";
import { geocodeDeliveryAddress } from "../lib/geocode-client";
import {
  DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  amountUntilFreeDelivery,
  getDeliveryFee,
  getOrderTotal,
  qualifiesForFreeDelivery,
} from "../lib/delivery";

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

const EMPTY_DELIVERY = {
  homeAddress: "",
  homeEntrance: "",
  homeApartment: "",
  officeAddress: "",
  officeOrganization: "",
  officeFloor: "",
  officeRoom: "",
};

export default function BasketModal({ onRequireLogin }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [deliveryPlace, setDeliveryPlace] = useState("HOME");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestContact, setGuestContact] = useState({ name: "", phone: "" });
  const { cartItem, setCartItem } = useContext(CartContext);
  const [trigger, setTrigger] = useState(false);

  const [deliveryData, setDeliveryData] = useState({ ...EMPTY_DELIVERY });

  const handleGuestContactChange = (e) => {
    const { name, value } = e.target;
    setGuestContact((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
    const items = readCartItems();
    setCartItems(items);
    return items;
  }, []);

  const refreshCartSummary = useCallback(() => {
    const { count, total } = getCartSummary();
    setCartCount(count);
    setCartTotal(total);
  }, []);

  useEffect(() => {
    refreshCartSummary();

    const onCartChange = () => refreshCartSummary();
    window.addEventListener(CART_CHANGE_EVENT, onCartChange);
    window.addEventListener("storage", onCartChange);

    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, onCartChange);
      window.removeEventListener("storage", onCartChange);
    };
  }, [refreshCartSummary]);

  useEffect(() => {
    if (!open) return;
    syncCartFromStorage();
  }, [open, syncCartFromStorage]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (cartCount > 0 && !open) {
      document.body.classList.add("has-floating-cart");
    } else {
      document.body.classList.remove("has-floating-cart");
    }

    return () => {
      document.body.classList.remove("has-floating-cart");
    };
  }, [cartCount, open]);

  const openBasket = () => {
    syncCartFromStorage();
    refreshCartSummary();
    setOrderError("");
    setOrderSuccess("");

    const loggedIn = Boolean(getStoredUser());
    setIsLoggedIn(loggedIn);

    if (!loggedIn) {
      setGuestContact({ name: "", phone: "" });
      setDeliveryData({ ...EMPTY_DELIVERY });
    }

    setOpen(true);
  };

  useEffect(() => {
    if (open) return;
    refreshCartSummary();
  }, [open, refreshCartSummary]);

  const cartCountInModal = cartItems.reduce((sum, item) => sum + item.count, 0);
  const cartSubtotalInModal = cartItems.reduce(
    (sum, item) => sum + (typeof item.price === "number" ? item.price * item.count : 0),
    0
  );
  const deliveryFeeInModal = getDeliveryFee(cartSubtotalInModal);
  const orderTotalInModal = getOrderTotal(cartSubtotalInModal);
  const amountForFreeDelivery = amountUntilFreeDelivery(cartSubtotalInModal);
  const hasFreeDelivery = qualifiesForFreeDelivery(cartSubtotalInModal);
  const hasColaGift = qualifiesForColaGift(cartItems);
  const floatingDeliveryFee = getDeliveryFee(cartTotal);
  const floatingOrderTotal = getOrderTotal(cartTotal);

  const handleOrder = async () => {
    if (cartItems.length === 0 || cartCountInModal <= 0) {
      setOrderError("Корзина пуста. Добавьте пиццу перед заказом.");
      setOrderSuccess("");
      return;
    }

    if (paymentMethod !== "CASH" && paymentMethod !== "KASPI") {
      setOrderError("Выберите способ оплаты: наличные или Kaspi.");
      setOrderSuccess("");
      return;
    }

    const loggedIn = Boolean(getStoredUser());
    setIsLoggedIn(loggedIn);

    if (!loggedIn) {
      const guestName = guestContact.name.trim();
      const guestPhone = guestContact.phone.trim();

      if (!guestName) {
        setOrderError("Укажите имя для заказа.");
        setOrderSuccess("");
        return;
      }

      if (!guestPhone) {
        setOrderError("Укажите номер телефона для связи.");
        setOrderSuccess("");
        return;
      }

      const hasAddress =
        deliveryData.homeAddress.trim() ||
        deliveryData.homeEntrance.trim() ||
        deliveryData.homeApartment.trim();

      if (!hasAddress) {
        setOrderError("Укажите адрес доставки.");
        setOrderSuccess("");
        return;
      }
    }

    setIsOrdering(true);
    setOrderError("");
    setOrderSuccess("");

    try {
      setCartItem(cartItems);
      const orderItems = buildOrderItemsWithGift(cartItems);

      let addressLat = null;
      let addressLng = null;

      if (deliveryPlace === "HOME" && deliveryData.homeAddress.trim()) {
        try {
          const geo = await geocodeDeliveryAddress(deliveryData.homeAddress);
          if (geo) {
            addressLat = geo.lat;
            addressLng = geo.lng;
          }
        } catch (geoError) {
          console.warn("[order] Client geocode failed:", geoError);
        }
      }

      const orderPayload = {
        pizza: orderItems,
        count: cartCountInModal,
        total: orderTotalInModal,
        paymentMethod,
        createdAt: new Date().toISOString(),
        address: deliveryData.homeAddress,
        entrance: deliveryData.homeEntrance,
        apartment: deliveryData.homeApartment,
        addressLat,
        addressLng,
      };

      let response;

      if (loggedIn) {
        const token = localStorage.getItem("token");
        response = await fetch("/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderPayload),
        });
      } else {
        response = await fetch("/order/guest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...orderPayload,
            name: guestContact.name.trim(),
            phone: guestContact.phone.trim(),
          }),
        });
      }

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
      notifyCartChange();
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
      const user = getStoredUser();
      setIsLoggedIn(Boolean(user));
      if (!user) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      const userAddres = await modelUserAddress(token);
      setDeliveryData((prev) => ({
        ...prev,
        homeAddress: userAddres?.address?.homeaddress || "",
        homeEntrance: userAddres?.address?.homeentrance || "",
        homeApartment: userAddres?.address?.homeapartment || "",
      }));
    };
    fetchData();
  }, []);

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
            {cartCountInModal > 0 ? (
              <span
                className={styles.countBadge}
                aria-label={`${cartCountInModal} ${pizzaWord(cartCountInModal)}`}
              >
                {cartCountInModal}
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
          {cartCountInModal <= 0 ? (
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
              ) : cartCountInModal === 1 ? (
                <p className={styles.promoHint}>
                  Добавьте ещё одну пиццу — получите {PROMO_COLA_GIFT.name} бесплатно!
                </p>
              ) : null}

              {!hasFreeDelivery && cartSubtotalInModal > 0 ? (
                <p className={styles.deliveryHint}>
                  Закажите на сумму от {FREE_DELIVERY_THRESHOLD.toLocaleString("ru-RU")} ₸ и
                  выше — доставка бесплатно!
                  {amountForFreeDelivery > 0 ? (
                    <>
                      {" "}
                      Добавьте ещё на {amountForFreeDelivery.toLocaleString("ru-RU")} ₸.
                    </>
                  ) : null}
                </p>
              ) : null}

              <article className={styles.card}>
                <div className={styles.summaryBlock}>
                  <div className={styles.summaryRow}>
                    <span>Товары</span>
                    <strong>{cartSubtotalInModal.toLocaleString("ru-RU")} ₸</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Доставка</span>
                    <strong className={deliveryFeeInModal === 0 ? styles.deliveryFree : ""}>
                      {deliveryFeeInModal === 0
                        ? "Бесплатно"
                        : `${DELIVERY_FEE.toLocaleString("ru-RU")} ₸`}
                    </strong>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                    <span>Итого к оплате</span>
                    <strong>{orderTotalInModal.toLocaleString("ru-RU")} ₸</strong>
                  </div>
                </div>
              </article>
            </>
          )}

          {cartCountInModal > 0 && cartItems.length > 0 && !isLoggedIn ? (
            <section className={styles.guestContact} aria-label="Контактные данные">
              <h3 className={styles.deliveryTitle}>Ваши данные</h3>
              <div className={styles.deliveryFields}>
                <DeliveryField
                  id={`${deliveryFieldsId}-guest-name`}
                  label="Имя"
                  name="name"
                  placeholder="Как к вам обращаться"
                  disabled={isOrdering}
                  value={guestContact.name}
                  onChange={handleGuestContactChange}
                />
                <DeliveryField
                  id={`${deliveryFieldsId}-guest-phone`}
                  label="Телефон"
                  name="phone"
                  placeholder="87001234567"
                  disabled={isOrdering}
                  value={guestContact.phone}
                  onChange={handleGuestContactChange}
                />
              </div>
              <p className={styles.guestHint}>
                Уже есть аккаунт?{" "}
                <button
                  type="button"
                  className={styles.guestLoginLink}
                  onClick={() => {
                    setOpen(false);
                    onRequireLogin?.();
                  }}
                  disabled={isOrdering}
                >
                  Войти или зарегистрироваться
                </button>
              </p>
            </section>
          ) : null}

          {cartCountInModal > 0 && cartItems.length > 0 ? (
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
                      placeholder="ул. Назарбаева, 12"
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

          {cartCountInModal > 0 && cartItems.length > 0 ? (
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
            disabled={isOrdering || cartCountInModal <= 0 || cartItems.length === 0}
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
      {mounted && cartCount > 0 && !open
        ? createPortal(
            <button
              type="button"
              className={styles.floatingBar}
              onClick={openBasket}
              aria-label={`Корзина: ${cartCount} ${pizzaWord(cartCount)}, ${floatingOrderTotal.toLocaleString("ru-RU")} тенге`}
            >
              <span className={styles.floatingMain}>
                <span className={styles.floatingCount} aria-hidden>
                  {cartCount}
                </span>
                <span className={styles.floatingLabel}>Корзина</span>
              </span>
              <span className={styles.floatingTotal}>
                {floatingOrderTotal.toLocaleString("ru-RU")} ₸
                {floatingDeliveryFee > 0 ? (
                  <span className={styles.floatingDeliveryNote}>
                    {" "}
                    с доставкой
                  </span>
                ) : null}
              </span>
            </button>,
            document.body
          )
        : null}
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
