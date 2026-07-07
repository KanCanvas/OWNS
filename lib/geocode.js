const DELIVERY_CITY =
  process.env.DELIVERY_CITY ||
  "Петропавловск, Северо-Казахстанская область";

const PIZZERIA_ADDRESS =
  process.env.PIZZERIA_ADDRESS ||
  "ул. Жамбыла Жабаева 44/1, Петропавловск";

const DEFAULT_CENTER = {
  lat: Number(process.env.PIZZERIA_LAT) || 54.853633,
  lng: Number(process.env.PIZZERIA_LNG) || 69.111996,
};

const SEARCH_CENTER = {
  ll: `${DEFAULT_CENTER.lng},${DEFAULT_CENTER.lat}`,
  spn: process.env.DELIVERY_GEO_SPN || "0.25,0.25",
};

const KIND_PRIORITY = {
  house: 0,
  street: 1,
  district: 2,
  metro: 3,
  locality: 4,
  area: 5,
};

function buildGeocodeQuery(streetAddress) {
  const street = String(streetAddress || "").trim();
  if (!street) return [];

  const lower = street.toLowerCase();
  const hasCity =
    lower.includes("петропавловск") ||
    lower.includes("petropavl") ||
    lower.includes("северо-казахстан");

  if (hasCity) {
    return [
      `${street}, Казахстан`,
      street,
    ];
  }

  return [
    `${DELIVERY_CITY}, ${street}, Казахстан`,
    `Петропавловск, ${street}, Казахстан`,
    `${street}, ${DELIVERY_CITY}, Казахстан`,
  ];
}

function buildDeliveryAddress({ streetAddress, entrance, apartment }) {
  const street = String(streetAddress || "").trim();
  if (!street) return "";

  const parts = [street];
  if (entrance) parts.push(`подъезд ${entrance}`);
  if (apartment) parts.push(`кв. ${apartment}`);
  return parts.join(", ");
}

function isNearDeliveryCity(lat, lng) {
  const maxDelta = 0.45;
  return (
    Math.abs(lat - DEFAULT_CENTER.lat) < maxDelta &&
    Math.abs(lng - DEFAULT_CENTER.lng) < maxDelta
  );
}

function parseCoords(pos) {
  const [lng, lat] = String(pos || "").split(" ").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function pickBestResult(featureMembers = []) {
  const ranked = [...featureMembers].sort((left, right) => {
    const leftKind =
      left?.GeoObject?.metaDataProperty?.GeocoderMetaData?.kind || "other";
    const rightKind =
      right?.GeoObject?.metaDataProperty?.GeocoderMetaData?.kind || "other";

    return (
      (KIND_PRIORITY[leftKind] ?? 99) - (KIND_PRIORITY[rightKind] ?? 99)
    );
  });

  for (const member of ranked) {
    const coords = parseCoords(member?.GeoObject?.Point?.pos);
    if (!coords) continue;

    const label =
      member?.GeoObject?.metaDataProperty?.GeocoderMetaData?.text || "unknown";

    if (isNearDeliveryCity(coords.lat, coords.lng)) {
      return { ...coords, label };
    }

    console.warn("[geocode] Skipping out-of-area result:", label, coords);
  }

  return null;
}

async function requestGeocode(apiKey, geocodeQuery, { restrict = true } = {}) {
  const params = new URLSearchParams({
    apikey: apiKey,
    geocode: geocodeQuery,
    format: "json",
    lang: "ru_RU",
    results: "7",
  });

  if (restrict) {
    params.set("ll", SEARCH_CENTER.ll);
    params.set("spn", SEARCH_CENTER.spn);
    params.set("rspn", "1");
  }

  const endpoints = [
    `https://geocode-maps.yandex.ru/v1/?${params.toString()}`,
    `https://geocode-maps.yandex.ru/1.x/?${params.toString()}`,
  ];

  for (const url of endpoints) {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("[geocode] API error", response.status, "for:", geocodeQuery, url);
      continue;
    }

    const payload = await response.json();
    const members =
      payload?.response?.GeoObjectCollection?.featureMember || [];
    const best = pickBestResult(members);

    if (best) {
      console.info("[geocode] Resolved:", geocodeQuery, "->", best.label, best.lat, best.lng);
      return best;
    }
  }

  return null;
}

async function geocodeAddress(streetAddress) {
  const street = String(streetAddress || "").trim();
  if (!street) {
    console.warn("[geocode] Empty street address");
    return { ...DEFAULT_CENTER, label: PIZZERIA_ADDRESS, source: "fallback-empty" };
  }

  const apiKey =
    process.env.YANDEX_GEOCODER_API_KEY ||
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("[geocode] API key missing for:", street);
    return { ...DEFAULT_CENTER, label: street, source: "fallback-no-key" };
  }

  const queries = buildGeocodeQuery(street);

  try {
    for (const query of queries) {
      let result = await requestGeocode(apiKey, query, { restrict: true });
      if (result) {
        return { ...result, source: "yandex-restricted" };
      }

      result = await requestGeocode(apiKey, query, { restrict: false });
      if (result) {
        return { ...result, source: "yandex" };
      }
    }

    console.warn("[geocode] No valid result for:", street);
    return { ...DEFAULT_CENTER, label: street, source: "fallback-not-found" };
  } catch (error) {
    console.warn("[geocode] Failed for:", street, error?.message);
    return { ...DEFAULT_CENTER, label: street, source: "fallback-error" };
  }
}

function getPizzeriaCoords() {
  return { ...DEFAULT_CENTER };
}

module.exports = {
  geocodeAddress,
  buildDeliveryAddress,
  buildGeocodeQuery,
  getPizzeriaCoords,
  DEFAULT_CENTER,
  DELIVERY_CITY,
  PIZZERIA_ADDRESS,
};
