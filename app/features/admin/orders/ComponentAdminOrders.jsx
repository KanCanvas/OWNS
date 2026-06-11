"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { modelAdminOrders } from "./modelAdminOrders";
import styles from "./ComponentAdminOrders.module.css";
import { modelProcessingOrder } from "./processing/modelProcessingOrder";
import axios from "axios";

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

function isUserOrderFullyTaken(userId, processingList) {
  const userRows = processingList.filter(
    (item) => String(item.userId) === String(userId) && item.take === true
  );

  return userRows.length > 0 && userRows.every((item) => item.take === true);
}

function isUserOrderTakenFalse(userId, processingList) {
  const userRows = processingList.filter(
    (item) => String(item.userId) === String(userId)
  );

  return userRows.every((item) => item.take === true);
}

function isNotComplete(items) {
  return items.some((item) => item.complete === false);
}

const funJSXTakeTrue = (order, processingOrders, processingOrdersComplete) => {
  const take = isUserOrderFullyTaken(order.userId, processingOrders);
  const notComplete = isNotComplete(order.items);

  // Фильтр суммы цены пицц ищем по take: false суммируем их потом чтобы отнять 
  // общую сумму от общей суммы которые нашли по take: false
  const takenTrueTotal = order.items
   .filter((item) => item.take === false)
   .reduce((sum, item) => sum + Number(item.total), 0);

  const finalTrueTotal = Number(order.total) - takenTrueTotal; 

  const hasIncomplete = order.items.some(
    item => item.take === true && item.complete === false
  );

  // возвращаем JSX разметку по take: true получаем JSX разметку карточек всех пицц товаров которые нашли
  return take === true && notComplete === true?
    hasIncomplete && (
      <article key={order.id} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.orderId}>{order.userName}</span>
        <time className={styles.date} dateTime={order.createdAt}>
          Последний: {formatDate(order.createdAt)}
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
          item.take === true && item.complete === false? 
          <div key={item.id} className={styles.item}>
            <p className={styles.itemName}>{item.pizzaName}</p>
            <p className={styles.itemMeta}>
              {formatDate(item.createdAt)} ·{" "}
              {paymentLabels[item.paymentMethod] || item.paymentMethod}
            </p>
            <p className={styles.itemMeta}>
              {item.pizzaSize ? `${item.pizzaSize} · ` : ""}
              {item.count} шт. · {formatPrice(item.pizzaPrice)} за шт.
            </p>
            <p className={styles.itemMeta}>Сумма: {formatPrice(finalTrueTotal)}</p>
          </div>: null
        ))} 
      </div>
      <div className={styles.footer}>
        <span className={styles.total}>Итого: {formatPrice(finalTrueTotal)}</span>
        <button type="button" onClick={() => processingOrdersComplete()}>Завершить</button>
        <span className={styles.payment}>{order.items.length} поз.</span>
      </div>
    </article>
    ): null;
}

const funJSXTakeFalse = (order, processingOrders, handleProcessingOrder) => {
  const take = isUserOrderTakenFalse(order.userId, processingOrders);

  // Фильтр суммы цены пицц ищем по take: true суммируем их потом чтобы отнять 
  // общую сумму от общей суммы которые нашли по take: true
  const takenFalseTotal = order.items
   .filter((item) => item.take === true)
   .reduce((sum, item) => sum + Number(item.total), 0);

  const finalFalseTotal = Number(order.total) - takenFalseTotal;
  
  // возвращаем JSX разметку по take: false получаем JSX разметку карточек всех пицц товаров которые нашли
  return take === false ?
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.orderId}>{order.userName}</span>
        <time className={styles.date} dateTime={order.createdAt}>
          Последний: {formatDate(order.createdAt)}
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
          item.take === false ? 
          <div key={item.id} className={styles.item}>
            <p className={styles.itemName}>{item.pizzaName}</p>
            <p className={styles.itemMeta}>
              {formatDate(item.createdAt)} ·{" "}
              {paymentLabels[item.paymentMethod] || item.paymentMethod}
            </p>
            <p className={styles.itemMeta}>
              {item.pizzaSize ? `${item.pizzaSize} · ` : ""}
              {item.count} шт. · {formatPrice(item.pizzaPrice)} за шт.
            </p>
            <p className={styles.itemMeta}>Сумма: {formatPrice(item.total)}</p>
          </div>: null
        ))} 
        <p className={styles.itemMeta}>Сумма: {formatPrice(finalFalseTotal)}</p>
      </div>
      <div className={styles.footer}>
        <span className={styles.total}>Итого: {formatPrice(finalFalseTotal)}</span>
        {take ? (
          <button type="button">Завершить</button>
        ) : (
          <button type="button" onClick={() => handleProcessingOrder(order.id)} disabled={take}>Взять</button>
        )}
      </div>
    </article>: null;
}

export default function ComponentAdminOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingOrders, setProcessingOrders] = useState([]);

  const [triggerProcessing, setTriggerProcessing] = useState(false);

useEffect(() => {
  const token = localStorage.getItem("token");
  axios
    .get("/api/admin/orders/processing", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => {
      if (res.data.ok) setProcessingOrders(res.data.orders);
    });
}, [triggerProcessing]); // перезапрос после «взять»

  const handleProcessingOrder = async (orderId) => {
    try{
      const response = await modelProcessingOrder(orderId);
      if (response) {
        setTriggerProcessing((prev) => !prev);
      }
    }catch (error){
      console.error("Failed to process order:", error);
      throw error;
    }
  }
  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await modelAdminOrders();
        if (isMounted) {
          setOrders(Array.isArray(data) ? data : []);
          const StatusOrder = () => {
            const status = [];        
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Не удалось загрузить заказы.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [processingOrders]);


  const processingOrdersComplete = async (orderID) => {
    try {
      const token = localStorage.getItem("token");
      const response = axios.post("/api/admin/orders/complete", {orderID}, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
    } catch {
      console.log("ERROR");
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <h1>Заказы пользователей</h1>
          <p>Все оформленные заказы в виде карточек</p>
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
        <div className={styles.stateCard}>Пока нет заказов от пользователей.</div>
      ) : (
        <div className={styles.grid}>
          {orders.map((order) => {
            return (
             funJSXTakeTrue(order, processingOrders, () => processingOrdersComplete(order.userId))
            );
          })}
          {orders.map(order => {
            return (
              funJSXTakeFalse(order, processingOrders, handleProcessingOrder)
            )         
          })}
        </div>
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
