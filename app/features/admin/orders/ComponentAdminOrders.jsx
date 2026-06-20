"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { modelAdminOrders } from "./modelAdminOrders";
import styles from "./ComponentAdminOrders.module.css";
import { modelProcessingOrder } from "./processing/modelProcessingOrder";

const paymentLabels = {
  CASH: "Наличные",
  KASPI: "Kaspi",
};

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₸`;
}

function sumBatchTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

function isNewBatch(order) {
  return order.items.every((item) => !item.take);
}

function isProcessingBatch(order) {
  return (
    order.items.every((item) => item.take) &&
    order.items.some((item) => !item.complete)
  );
}

function OrderBatchCard({ order, actionLabel, onAction, actionDisabled = false }) {
  const batchTotal = sumBatchTotal(order.items);

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.orderId}>{order.userName}</span>
        <time className={styles.date} dateTime={order.createdAt}>
          {formatDate(order.createdAt)}
        </time>
      </div>

      <div className={styles.customer}>
        <CustomerRow label="Клиент" value={order.userName} />
        <CustomerRow label="Телефон" value={order.userPhone} />
        <CustomerRow label="ID пользователя" value={order.userId} />
        <CustomerRow label="Адрес" value={order.homeaddress} />
      </div>

      <div className={styles.items}>
        {order.items.map((item) => (
          <div key={item.id} className={styles.item}>
            <p className={styles.itemName}>{item.pizzaName}</p>
            <p className={styles.itemMeta}>
              {paymentLabels[item.paymentMethod] || item.paymentMethod}
            </p>
            <p className={styles.itemMeta}>
              {item.pizzaSize ? `${item.pizzaSize} · ` : ""}
              {item.count} шт. · {formatPrice(item.pizzaPrice)} за шт.
            </p>
            <p className={styles.itemMeta}>Сумма: {formatPrice(item.total)}</p>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.total}>Итого: {formatPrice(batchTotal)}</span>
        <button type="button" onClick={onAction} disabled={actionDisabled}>
          {actionLabel}
        </button>
        <span className={styles.payment}>{order.items.length} поз.</span>
      </div>
    </article>
  );
}

export default function ComponentAdminOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadOrders = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await modelAdminOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Не удалось загрузить заказы.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [reloadKey]);

  const handleProcessingOrder = async (order) => {
    try {
      const response = await modelProcessingOrder(order.orderIds);
      if (response) {
        setReloadKey((prev) => prev + 1);
      }
    } catch (processError) {
      console.error("Failed to process order:", processError);
      throw processError;
    }
  };

  const handleCompleteOrder = async (order) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/admin/orders/complete",
        { orderIds: order.orderIds },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReloadKey((prev) => prev + 1);
    } catch (completeError) {
      console.error("Failed to complete order:", completeError);
    }
  };

  const newOrders = orders.filter(isNewBatch);
  const processingOrders = orders.filter(isProcessingBatch);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <h1>Заказы пользователей</h1>
          <p>Актуальные заказы по каждому оформлению</p>
        </div>
        <Link href="/account" className={styles.backLink}>
          Назад в аккаунт
        </Link>
      </div>

      {isLoading ? (
        <div className={styles.stateCard}>Загружаем заказы...</div>
      ) : error ? (
        <div className={styles.stateCard}>
          <p className={styles.error}>{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.stateCard}>Пока нет активных заказов.</div>
      ) : (
        <>
          {newOrders.length > 0 ? (
            <div className={styles.grid}>
              {newOrders.map((order) => (
                <OrderBatchCard
                  key={order.id}
                  order={order}
                  actionLabel="Взять"
                  onAction={() => handleProcessingOrder(order)}
                />
              ))}
            </div>
          ) : null}

          {processingOrders.length > 0 ? (
            <div className={styles.grid}>
              {processingOrders.map((order) => (
                <OrderBatchCard
                  key={order.id}
                  order={order}
                  actionLabel="Завершить"
                  onAction={() => handleCompleteOrder(order)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function CustomerRow({ label, value }) {
  return (
    <div className={styles.customerRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
