export function normalizeQueryParam(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return String(value[0] ?? '').trim() || null;
  return String(value).trim() || null;
}
