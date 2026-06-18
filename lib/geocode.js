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

// Ограничение поиска адреса районом Петропавловска
const DEFAULT_BBOX =
  process.env.DELIVERY_GEO_BBOX || "68.9,54.75~69.35,55.05";

function buildGeocodeQuery(address) {
  const text = String(address || "").trim();
  if (!text) return "";

  const lower = text.toLowerCase();
  const hasCity =
    lower.includes("петропавловск") ||
    lower.includes("petropavl") ||
    lower.includes("северо-казахстан");

  if (hasCity) {
    return `${text}, Казахстан`;
  }

  return `${text}, ${DELIVERY_CITY}, Казахстан`;
}

function pseudoGeocode(address) {
  const text = String(address || "").trim();
  if (!text) return { ...DEFAULT_CENTER };

  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash + text.charCodeAt(i) * (i + 1)) % 1000;
  }

  return {
    lat: DEFAULT_CENTER.lat + ((hash % 100) - 50) * 0.0012,
    lng: DEFAULT_CENTER.lng + (((hash / 100) % 100) - 50) * 0.0012,
  };
}

function isNearDeliveryCity(lat, lng) {
  const maxDelta = 0.45;
  return (
    Math.abs(lat - DEFAULT_CENTER.lat) < maxDelta &&
    Math.abs(lng - DEFAULT_CENTER.lng) < maxDelta
  );
}

async function geocodeAddress(address) {
  const normalized = String(address || "").trim();
  if (!normalized) return { ...DEFAULT_CENTER };

  const apiKey =
    process.env.YANDEX_GEOCODER_API_KEY ||
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("[geocode] API key missing, using fallback coords for:", normalized);
    return pseudoGeocode(normalized);
  }

  try {
    const query = encodeURIComponent(buildGeocodeQuery(normalized));
    const bbox = encodeURIComponent(DEFAULT_BBOX);
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${query}&format=json&results=1&bbox=${bbox}&rspn=1`
    );

    if (!response.ok) {
      console.warn("[geocode] API error", response.status, "for:", normalized);
      return pseudoGeocode(normalized);
    }

    const payload = await response.json();
    const pos =
      payload?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point
        ?.pos;

    if (!pos) {
      console.warn("[geocode] No result for:", normalized);
      return pseudoGeocode(normalized);
    }

    const [lng, lat] = String(pos).split(" ").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return pseudoGeocode(normalized);
    }

    if (!isNearDeliveryCity(lat, lng)) {
      console.warn(
        "[geocode] Result outside Petropavlovsk area, using fallback:",
        normalized,
        lat,
        lng
      );
      return pseudoGeocode(normalized);
    }

    return { lat, lng };
  } catch (error) {
    console.warn("[geocode] Failed for:", normalized, error?.message);
    return pseudoGeocode(normalized);
  }
}

function getPizzeriaCoords() {
  return { ...DEFAULT_CENTER };
}

module.exports = {
  geocodeAddress,
  getPizzeriaCoords,
  buildGeocodeQuery,
  DEFAULT_CENTER,
  DELIVERY_CITY,
  PIZZERIA_ADDRESS,
};
