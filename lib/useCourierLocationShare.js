"use client";

import { useEffect } from "react";

function getTrackingSocketUrl(token) {
  if (typeof window === "undefined") return "";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/tracking?token=${encodeURIComponent(token)}`;
}

export function useCourierLocationShare(activeDeliveries = []) {
  const deliveryKey = activeDeliveries.map((delivery) => delivery.userId).join(",");

  useEffect(() => {
    if (!deliveryKey) return;
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(getTrackingSocketUrl(token));
    let watchId = null;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "register_courier" }));

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;

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
        },
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );
    };

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.close();
    };
  }, [deliveryKey, activeDeliveries]);
}
