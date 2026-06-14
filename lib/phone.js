function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function phoneLookupVariants(phone) {
  const normalized = normalizePhone(phone);
  const trimmed = String(phone || "").trim();
  const variants = new Set();

  if (trimmed) variants.add(trimmed);
  if (normalized) variants.add(normalized);

  if (normalized.length === 11 && normalized.startsWith("8")) {
    variants.add(`7${normalized.slice(1)}`);
  }

  if (normalized.length === 11 && normalized.startsWith("7")) {
    variants.add(`8${normalized.slice(1)}`);
  }

  return [...variants];
}

function phonesMatch(left, right) {
  const leftVariants = phoneLookupVariants(left);
  const rightVariants = phoneLookupVariants(right);
  return leftVariants.some((value) => rightVariants.includes(value));
}

module.exports = {
  normalizePhone,
  phoneLookupVariants,
  phonesMatch,
};
