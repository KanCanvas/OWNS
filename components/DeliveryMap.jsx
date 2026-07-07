"use client";

import { useCallback, useEffect, useRef } from "react";
import styles from "./DeliveryMap.module.css";

const PIZZERIA_CENTER = [54.853633, 69.111996];

let ymapsPromise = null;

function loadYmaps(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if (window.ymaps?.Map) {
    return Promise.resolve(window.ymaps);
  }

  if (!ymapsPromise) {
    ymapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const keyPart = apiKey ? `apikey=${apiKey}&` : "";
      script.src = `https://api-maps.yandex.ru/2.1/?${keyPart}lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        window.ymaps.ready(() => resolve(window.ymaps));
      };
      script.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));
      document.head.appendChild(script);
    });
  }

  return ymapsPromise;
}

export default function DeliveryMap({
  destination,
  courier,
  className = "",
  size = "default",
  enableDeviceLocate = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const courierMarkRef = useRef(null);
  const destMarkRef = useRef(null);
  const routeRef = useRef(null);

  const destLat = Number(destination?.lat);
  const destLng = Number(destination?.lng);
  const destLabel = destination?.address || "Адрес доставки";
  const courierLat = Number(courier?.lat);
  const courierLng = Number(courier?.lng);

  const hasCourierCoords = Number.isFinite(courierLat) && Number.isFinite(courierLng);
  const hasDestCoords = Number.isFinite(destLat) && Number.isFinite(destLng);

  const centerOnCourier = useCallback(() => {
    if (!mapInstanceRef.current || !hasCourierCoords) return;
    mapInstanceRef.current.setCenter([courierLat, courierLng], 16, {
      duration: 300,
    });
  }, [courierLat, courierLng, hasCourierCoords]);

  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "";

    loadYmaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !mapRef.current) return;

        const center = hasCourierCoords
          ? [courierLat, courierLng]
          : hasDestCoords
            ? [destLat, destLng]
            : PIZZERIA_CENTER;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new ymaps.Map(
            mapRef.current,
            {
              center,
              zoom: 14,
              controls: ["zoomControl"],
            },
            {
              suppressMapOpenBlock: true,
            }
          );

          destMarkRef.current = new ymaps.Placemark(
            hasDestCoords ? [destLat, destLng] : PIZZERIA_CENTER,
            { balloonContent: destLabel },
            { preset: "islands#redFoodIcon" }
          );

          courierMarkRef.current = new ymaps.Placemark(
            hasCourierCoords ? [courierLat, courierLng] : PIZZERIA_CENTER,
            { balloonContent: enableDeviceLocate ? "Вы (курьер)" : "Курьер" },
            { preset: "islands#orangeDeliveryIcon" }
          );

          mapInstanceRef.current.geoObjects.add(destMarkRef.current);
          mapInstanceRef.current.geoObjects.add(courierMarkRef.current);
        }

        if (courierMarkRef.current && hasCourierCoords) {
          courierMarkRef.current.geometry.setCoordinates([courierLat, courierLng]);
        }

        if (destMarkRef.current && hasDestCoords) {
          destMarkRef.current.geometry.setCoordinates([destLat, destLng]);
          destMarkRef.current.properties.set("balloonContent", destLabel);
        }

        if (hasCourierCoords && hasDestCoords) {
          if (routeRef.current) {
            mapInstanceRef.current.geoObjects.remove(routeRef.current);
          }

          routeRef.current = new ymaps.Polyline(
            [
              [courierLat, courierLng],
              [destLat, destLng],
            ],
            {},
            {
              strokeColor: "#ff6b2c",
              strokeWidth: 4,
              strokeOpacity: 0.85,
            }
          );

          mapInstanceRef.current.geoObjects.add(routeRef.current);
          mapInstanceRef.current.setBounds(
            routeRef.current.geometry.getBounds(),
            { checkZoomRange: true, zoomMargin: 40 }
          );
        } else if (hasCourierCoords) {
          mapInstanceRef.current.setCenter([courierLat, courierLng], 15);
        }
      })
      .catch(() => {
        if (mapRef.current) {
          mapRef.current.innerHTML =
            '<p class="delivery-map-fallback">Карта временно недоступна. Добавьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY.</p>';
        }
      });

    return () => {
      cancelled = true;
    };
  }, [destLat, destLng, destLabel, courierLat, courierLng, hasCourierCoords, hasDestCoords]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className={`${styles.wrap} ${size === "large" ? styles.wrapLarge : ""} ${className}`}>
      {enableDeviceLocate ? (
        <button
          type="button"
          className={styles.locateBtn}
          onClick={centerOnCourier}
          disabled={!hasCourierCoords}
          aria-label="Показать моё GPS-положение"
          title="Моё GPS-положение"
        >
          ◎
        </button>
      ) : null}
      <div ref={mapRef} className={styles.map} aria-label="Карта доставки" />
    </div>
  );
}
