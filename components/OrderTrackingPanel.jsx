"use client";

import { useEffect, useMemo, useState } from "react";
import DeliveryMap from "./DeliveryMap";
import styles from "./OrderTrackingPanel.module.css";
import { geocodeDeliveryAddress } from "../lib/geocode-client";

function getTrackingSocketUrl(token) {
  if (typeof window === "undefined") return "";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/tracking?token=${encodeURIComponent(token)}`;
}

export default function OrderTrackingPanel({ autoLoad = true, onActiveChange }) {
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
      address: tracking?.destination?.address,
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
          onActiveChange?.(true);
        } else {
          setTracking(null);
          onActiveChange?.(false);
        }
      })
      .catch(() => {
        setTracking(null);
        onActiveChange?.(false);
      })
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
            onActiveChange?.(true);
          } else {
            setTracking(null);
            onActiveChange?.(false);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => setIsConnected(false);

    return () => socket.close();
  }, [tracking?.isActive, tracking?.userId]);

  useEffect(() => {
    if (!tracking?.isActive || !tracking?.destination?.address) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const streetOnly = String(tracking.destination.address).split(",")[0].trim();
    if (!streetOnly) return;

    let cancelled = false;

    geocodeDeliveryAddress(streetOnly)
      .then(async (geo) => {
        if (cancelled || !geo) return;

        const currentLat = Number(tracking.destination.lat);
        const currentLng = Number(tracking.destination.lng);
        const latDiff = Math.abs(geo.lat - currentLat);
        const lngDiff = Math.abs(geo.lng - currentLng);

        if (latDiff < 0.0003 && lngDiff < 0.0003) return;

        setTracking((prev) =>
          prev
            ? {
                ...prev,
                destination: {
                  ...prev.destination,
                  lat: geo.lat,
                  lng: geo.lng,
                },
              }
            : prev
        );

        await fetch("/api/delivery/tracking/destination", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: geo.lat,
            lng: geo.lng,
            address: tracking.destination.address,
          }),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [tracking?.isActive, tracking?.destination?.address, tracking?.destination?.lat, tracking?.destination?.lng]);

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
      <div className={styles.mapShell}>
        <div className={styles.head}>
          <div>
            <p className={styles.badge}>Курьер в пути</p>
            <h3 className={styles.title}>Отслеживание заказа</h3>
            <p className={styles.subtitle}>
              {destinationCoords.address
                ? `Доставка: ${destinationCoords.address}`
                : isConnected
                  ? "Положение курьера обновляется в реальном времени"
                  : "Подключаемся к карте..."}
            </p>
          </div>
          <span className={styles.liveDot} aria-hidden />
        </div>

        <DeliveryMap
          destination={destinationCoords}
          courier={courierCoords}
          size="large"
        />

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDotCourier} aria-hidden />
            Курьер
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDotDest} aria-hidden />
            Адрес доставки
          </span>
        </div>
      </div>
    </section>
  );
}
