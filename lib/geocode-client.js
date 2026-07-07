"use client";

const DELIVERY_CITY = "Петропавловск, Северо-Казахстанская область";
const PIZZERIA = { lat: 54.853633, lng: 69.111996 };
const SEARCH_BOUNDS = [[54.7, 68.8], [55.1, 69.4]];

let ymapsPromise = null;

function loadYmaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if (window.ymaps?.geocode) {
    return Promise.resolve(window.ymaps);
  }

  if (!ymapsPromise) {
    ymapsPromise = new Promise((resolve, reject) => {
      const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "";
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

function isNearPetropavlovsk(lat, lng) {
  return (
    Math.abs(lat - PIZZERIA.lat) < 0.45 && Math.abs(lng - PIZZERIA.lng) < 0.45
  );
}

function buildQueries(street) {
  const text = String(street || "").trim();
  if (!text) return [];

  const lower = text.toLowerCase();
  if (lower.includes("петропавловск") || lower.includes("petropavl")) {
    return [text, `${text}, Казахстан`];
  }

  return [
    `${DELIVERY_CITY}, ${text}`,
    `Петропавловск, ${text}`,
    `${text}, Петропавловск, Казахстан`,
  ];
}

function pickBestGeoObject(collection) {
  const kindPriority = { house: 0, street: 1, district: 2, locality: 3 };

  const items = [];
  for (let i = 0; i < collection.getLength(); i += 1) {
    items.push(collection.get(i));
  }

  items.sort((left, right) => {
    const leftKind =
      left.properties.get("metaDataProperty.GeocoderMetaData.kind") || "other";
    const rightKind =
      right.properties.get("metaDataProperty.GeocoderMetaData.kind") || "other";
    return (kindPriority[leftKind] ?? 99) - (kindPriority[rightKind] ?? 99);
  });

  for (const item of items) {
    const coords = item.geometry.getCoordinates();
    const [lat, lng] = coords;
    if (!isNearPetropavlovsk(lat, lng)) continue;

    return {
      lat,
      lng,
      label:
        item.getAddressLine?.() ||
        item.properties.get("text") ||
        item.properties.get("name") ||
        "",
    };
  }

  return null;
}

export async function geocodeDeliveryAddress(streetAddress) {
  const street = String(streetAddress || "").trim();
  if (!street) return null;

  const ymaps = await loadYmaps();
  const queries = buildQueries(street);

  for (const query of queries) {
    const result = await ymaps.geocode(query, {
      results: 10,
      boundedBy: SEARCH_BOUNDS,
      strictBounds: false,
    });

    const best = pickBestGeoObject(result.geoObjects);
    if (best) return best;
  }

  return null;
}
