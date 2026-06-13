"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./modalUserModals.module.css";

const paymentLabels = {
  CASH: "Наличные",
  KASPI: "Kaspi"
};

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₸`;
}

function getOrderStatus(order) {
  if (order.complete) {
    return { label: "Выполнен", className: styles.statusDone };
  }
  if (order.take) {
    return { label: "В обработке", className: styles.statusProcessing };
  }
  return { label: "Оформлен", className: styles.statusNew };
}

export function ModalUserModals({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem("token");
    (async () => {
      const res = await fetch("/user/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    })();
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

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
        aria-labelledby="user-orders-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
        <div className={styles.head}>
          <h2 id="user-orders-modal-title" className={styles.title}>
            Заказы
          </h2>
          <p className={styles.subtitle}>
            {orders.length > 0
              ? `Всего заказов: ${orders.length}`
              : "История ваших заказов"}
          </p>
        </div>
        <div className={styles.body}>
          {orders.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden>
                🍕
              </span>
              <p className={styles.emptyTitle}>Пока нет заказов</p>
              <p className={styles.emptyText}>
                Оформите пиццу на главной — она появится здесь.
              </p>
            </div>
          ) : (
            <ul className={styles.ordersList}>
              {orders.map((order) => {
                const status = getOrderStatus(order);

                return (
                  <li key={order.id} className={styles.orderCard}>
                    <div className={styles.orderTop}>
                      <span className={styles.orderNumber}>№ {order.id}</span>
                      <span className={`${styles.status} ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className={styles.orderMain}>
                      <h3 className={styles.pizzaName}>{order.pizzaName}</h3>
                      {order.pizzaSize ? (
                        <p className={styles.orderMeta}>Размер: {order.pizzaSize}</p>
                      ) : null}
                      <p className={styles.orderMeta}>
                        {order.count} шт. × {formatPrice(order.pizzaPrice)}
                      </p>
                    </div>

                    <div className={styles.orderDetails}>
                      <div className={styles.detailRow}>
                        <span>Дата</span>
                        <time dateTime={order.createdAt}>
                          {formatDate(order.createdAt)}
                        </time>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Оплата</span>
                        <strong>
                          {paymentLabels[order.paymentMethod] || order.paymentMethod}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.orderFooter}>
                      <span className={styles.orderTotal}>
                        {formatPrice(order.total)}
                      </span>
                      <span className={styles.paymentBadge}>
                        {paymentLabels[order.paymentMethod] || order.paymentMethod}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** @deprecated используй ModalUserModals */
export const modalUserModals = ModalUserModals;
