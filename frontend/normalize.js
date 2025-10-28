/**
 * Small normalization helpers for API responses.
 * Ensure callers can rely on predictable shapes (arrays or objects).
 */

export function ensureArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  // common wrappers
  if (Array.isArray(payload.data)) return payload.data;
  // try to find first array-valued property
  for (const k of Object.keys(payload)) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  return [];
}

export function ensureObject(payload, defaults = {}) {
  if (!payload) return { ...defaults };
  if (typeof payload !== 'object' || Array.isArray(payload)) return { ...defaults };
  return { ...defaults, ...payload };
}

export function normalizeSavingsPayload(payload) {
  // expected shape: { savings: [...], total: number } or payload itself could be array
  if (!payload) return { savings: [], total: 0 };
  if (Array.isArray(payload)) return { savings: payload, total: 0 };
  const savings = Array.isArray(payload.savings) ? payload.savings : (Array.isArray(payload.data) ? payload.data : []);
  const total = Number(payload.total ?? 0);
  return { savings, total };
}
