"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProductModal.module.css";
import { formatPrice } from "../lib/formatPrice";

const MAX_COUNT = 10;

export default function ProductModal({
  product,
  initialCount = 0,
  onClose,
  onChangeCount,
}) {
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCount(initialCount);
  }, [product, initialCount]);

  useEffect(() => {
    if (!product) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  if (!product || !mounted) return null;

  const unitPrice = Number(product.price) || 0;
  const totalPrice = unitPrice * count;

  const applyCount = (nextCount) => {
    const safeCount = Math.max(0, Math.min(MAX_COUNT, nextCount));
    setCount(safeCount);
    onChangeCount?.(product, safeCount);
  };

  return createPortal(
    <div
      className="app-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`app-modal ${styles.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className={styles.imageWrap}>
          <img src={product.image} alt={product.name} className={styles.image} />
        </div>

        <div className={styles.content}>
          <p className={styles.category}>
            {product.category === "drinks" ? "Напиток" : "Пицца"}
          </p>
          <h2 id="product-modal-title" className={styles.title}>
            {product.name}
          </h2>
          {product.size ? (
            <p className={styles.size}>{product.size}</p>
          ) : null}
          {product.description ? (
            <p className={styles.description}>{product.description}</p>
          ) : null}
        </div>

        <div className={styles.footer}>
          <div className={styles.prices}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Цена</span>
              <strong className={styles.unitPrice}>
                {formatPrice(unitPrice)} ₸
              </strong>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Итого</span>
              <strong className={styles.totalPrice}>
                {formatPrice(totalPrice)} ₸
              </strong>
            </div>
          </div>

          <div className={styles.counter}>
            <button
              type="button"
              className={styles.minusBtn}
              onClick={() => applyCount(count - 1)}
              disabled={count <= 0}
              aria-label="Уменьшить количество"
            >
              −
            </button>
            <span className={styles.countValue} aria-live="polite">
              {count}
            </span>
            <button
              type="button"
              className={styles.plusBtn}
              onClick={() => applyCount(count + 1)}
              disabled={count >= MAX_COUNT}
              aria-label="Увеличить количество"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
