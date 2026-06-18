"use client";

import { useEffect, useMemo, useState } from "react";
import DeliveryMap from "./DeliveryMap";
import styles from "./OrderTrackingPanel.module.css";

function getTrackingSocketUrl(token) {
  if (typeof window === "undefined") return "";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/tracking?token=${encodeURIComponent(token)}`;
}

export default function OrderTrackingPanel({ autoLoad = true }) {
  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isConnected, setIsConnected] = useState(false);

  const courierCoords = useMemo(
    () => ({
      lat: tracking?.courier?.lat,
      lng: tracking?.courier?.lng,
    }),
    [tracking]
  );

  const destinationCoords = useMemo(
    () => ({
      lat: tracking?.destination?.lat,
      lng: tracking?.destination?.lng,
    }),
    [tracking]
  );

  useEffect(() => {
    if (!autoLoad) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch("/api/delivery/tracking", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.tracking?.isActive) {
          setTracking(data.tracking);
        } else {
          setTracking(null);
        }
      })
      .catch(() => setTracking(null))
      .finally(() => setIsLoading(false));
  }, [autoLoad]);

  useEffect(() => {
    if (!tracking?.isActive) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(getTrackingSocketUrl(token));

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: "subscribe_customer" }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === "courier_location" ||
          payload.type === "tracking_state"
        ) {
          if (payload.tracking?.isActive) {
            setTracking(payload.tracking);
          } else {
            setTracking(null);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => setIsConnected(false);

    return () => socket.close();
  }, [tracking?.isActive, tracking?.userId]);

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <p className={styles.loading}>Загружаем карту доставки...</p>
      </div>
    );
  }

  if (!tracking?.isActive) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <p className={styles.badge}>Курьер в пути</p>
          <h3 className={styles.title}>Отслеживание заказа</h3>
          <p className={styles.subtitle}>
            {isConnected
              ? "Положение курьера обновляется в реальном времени"
              : "Подключаемся к карте..."}
          </p>
        </div>
        <span className={styles.liveDot} aria-hidden />
      </div>

      <DeliveryMap destination={destinationCoords} courier={courierCoords} />
    </section>
  );
}
