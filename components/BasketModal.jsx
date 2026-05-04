"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";

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

export default function BasketModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

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
        className="basket-modal-backdrop"
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div
        className="basket-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="basket-modal-header">
          <h2 id={titleId} className="basket-modal-title">
            Корзина
          </h2>
          <button
            type="button"
            className="basket-modal-close"
            onClick={() => setOpen(false)}
            aria-label="Закрыть корзину"
          >
            ×
          </button>
        </div>
        <div className="basket-modal-body">
          <p className="basket-modal-empty">
            Пока пусто — добавьте пиццу из меню.
          </p>
          {getWithExpiry("countPizza") > 0 && (
            <p className="basket-modal-empty">
              {getWithExpiry("countPizza")} пицц в корзине
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
        onClick={() => setOpen(true)}
      >
        🛒
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
