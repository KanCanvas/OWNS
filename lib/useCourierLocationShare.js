"use client";

import { useCallback, useEffect, useState } from "react";

function getTrackingSocketUrl(token) {
  if (typeof window === "undefined") return "";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/tracking?token=${encodeURIComponent(token)}`;
}

const geoOptions = {
  enableHighAccuracy: true,
  maximumAge: 3000,
  timeout: 20000,
};

export function useCourierLocationShare(activeDeliveries = []) {
  const deliveryKey = activeDeliveries.map((delivery) => delivery.userId).join(",");
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [geoDenied, setGeoDenied] = useState(false);
  const [geoRetryKey, setGeoRetryKey] = useState(0);

  const retryGeoLocation = useCallback(() => {
    setGeoError("");
    setGeoDenied(false);
    setGeoRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!deliveryKey) {
      setCoords(null);
      setGeoError("");
      setGeoDenied(false);
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("Геолокация недоступна в этом браузере.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(getTrackingSocketUrl(token));
    let watchId = null;

    const sendLocation = (lat, lng) => {
      setCoords({ lat, lng });
      setGeoError("");
      setGeoDenied(false);

      if (socket.readyState !== WebSocket.OPEN) return;

      for (const delivery of activeDeliveries) {
        socket.send(
          JSON.stringify({
            type: "courier_location",
            customerUserId: delivery.userId,
            lat,
            lng,
          })
        );
      }
    };

    const onGeoError = (error) => {
      const denied = error?.code === 1;
      setGeoDenied(denied);
      setGeoError(
        denied
          ? "Нужен доступ к геолокации, чтобы клиент видел вас на карте."
          : "Не удалось определить GPS-позицию курьера. Попробуйте ещё раз на улице."
      );
      console.warn("[courier-gps]", error?.message);
    };

    const startGeoWatch = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocation(position.coords.latitude, position.coords.longitude);
        },
        onGeoError,
        geoOptions
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          sendLocation(position.coords.latitude, position.coords.longitude);
        },
        onGeoError,
        geoOptions
      );
    };

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "register_courier" }));
      startGeoWatch();
    };

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.close();
    };
  }, [deliveryKey, activeDeliveries, geoRetryKey]);

  return { coords, geoError, geoDenied, retryGeoLocation };
}
