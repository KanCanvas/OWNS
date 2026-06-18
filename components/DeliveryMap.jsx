"use client";

import { useEffect, useRef } from "react";
import styles from "./DeliveryMap.module.css";

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

  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "";

    loadYmaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !mapRef.current) return;

        const center = [
          Number.isFinite(courierLat) ? courierLat : destLat,
          Number.isFinite(courierLng) ? courierLng : destLng,
        ];

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new ymaps.Map(
            mapRef.current,
            {
              center,
              zoom: 13,
              controls: ["zoomControl", "geolocationControl"],
            },
            {
              suppressMapOpenBlock: true,
            }
          );

          destMarkRef.current = new ymaps.Placemark(
            [destLat, destLng],
            { balloonContent: destLabel },
            { preset: "islands#redFoodIcon" }
          );

          courierMarkRef.current = new ymaps.Placemark(
            [courierLat || destLat, courierLng || destLng],
            { balloonContent: "Курьер" },
            { preset: "islands#orangeDeliveryIcon" }
          );

          mapInstanceRef.current.geoObjects.add(destMarkRef.current);
          mapInstanceRef.current.geoObjects.add(courierMarkRef.current);
        }

        if (courierMarkRef.current && Number.isFinite(courierLat) && Number.isFinite(courierLng)) {
          courierMarkRef.current.geometry.setCoordinates([courierLat, courierLng]);
        }

        if (destMarkRef.current && Number.isFinite(destLat) && Number.isFinite(destLng)) {
          destMarkRef.current.geometry.setCoordinates([destLat, destLng]);
          destMarkRef.current.properties.set("balloonContent", destLabel);
        }

        if (
          Number.isFinite(courierLat) &&
          Number.isFinite(courierLng) &&
          Number.isFinite(destLat) &&
          Number.isFinite(destLng)
        ) {
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
  }, [destLat, destLng, destLabel, courierLat, courierLng]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className={`${styles.wrap} ${className}`}>
      <div ref={mapRef} className={styles.map} aria-label="Карта доставки" />
    </div>
  );
}
