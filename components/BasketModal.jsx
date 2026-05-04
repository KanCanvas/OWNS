"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useState } from "react";
import styles from "./BasketModal.module.css";

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

function readStoredPizza() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pizza");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

function pizzaWord(n) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "пицц";
  if (last > 1 && last < 5) return "пиццы";
  if (last === 1) return "пицца";
  return "пицц";
}

export default function BasketModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartPizza, setCartPizza] = useState(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const syncCartFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const rawCount = getWithExpiry("countPizza");
    const n = Number(rawCount);
    setCartCount(Number.isFinite(n) && n > 0 ? n : 0);
    setCartPizza(readStoredPizza());
  }, []);

  useEffect(() => {
    if (!open) return;
    syncCartFromStorage();
  }, [open, syncCartFromStorage]);

  const openBasket = () => {
    syncCartFromStorage();
    setOpen(true);
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

  const modal = open && (
    <>
      <div
        className={styles.backdrop}
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
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
          ) : cartPizza ? (
            <article className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.thumb} aria-hidden>
                  {cartPizza.image ? (
                    <img
                      src={cartPizza.image}
                      alt=""
                      className={styles.thumbImg}
                    />
                  ) : (
                    <span className={styles.thumbPlaceholder}>🍕</span>
                  )}
                </div>
                <div className={styles.info}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.itemTitle}>{cartPizza.name}</h3>
                    <span className={styles.qty}>×{cartCount}</span>
                  </div>
                  {cartPizza.description ? (
                    <p className={styles.desc}>{cartPizza.description}</p>
                  ) : null}
                  {typeof cartPizza.price === "number" ? (
                    <p className={styles.meta}>
                      {cartPizza.price.toLocaleString("ru-RU")} ₽ × {cartCount}
                    </p>
                  ) : null}
                </div>
              </div>
              {typeof cartPizza.price === "number" ? (
                <div className={styles.total}>
                  <span>Итого</span>
                  <strong>
                    {(cartPizza.price * cartCount).toLocaleString("ru-RU")} ₽
                  </strong>
                </div>
              ) : null}
            </article>
          ) : (
            <p className={`${styles.empty} ${styles.emptyMuted}`}>
              Данные о пицце не найдены. Добавьте позицию ещё раз.
            </p>
          )}
        </div>
      </div>
    </>
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
