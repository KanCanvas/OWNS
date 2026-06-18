const DEFAULT_CENTER = {
  lat: Number(process.env.PIZZERIA_LAT) || 43.238949,
  lng: Number(process.env.PIZZERIA_LNG) || 76.889709,
};

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

async function geocodeAddress(address) {
  const normalized = String(address || "").trim();
  if (!normalized) return { ...DEFAULT_CENTER };

  const apiKey =
    process.env.YANDEX_GEOCODER_API_KEY ||
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  if (!apiKey) {
    return pseudoGeocode(normalized);
  }

  try {
    const query = encodeURIComponent(`${normalized}, Казахстан`);
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${query}&format=json&results=1`
    );

    if (!response.ok) {
      return pseudoGeocode(normalized);
    }

    const payload = await response.json();
    const pos =
      payload?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point
        ?.pos;

    if (!pos) {
      return pseudoGeocode(normalized);
    }

    const [lng, lat] = String(pos).split(" ").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return pseudoGeocode(normalized);
    }

    return { lat, lng };
  } catch {
    return pseudoGeocode(normalized);
  }
}

function getPizzeriaCoords() {
  return { ...DEFAULT_CENTER };
}

module.exports = {
  geocodeAddress,
  getPizzeriaCoords,
  DEFAULT_CENTER,
};
