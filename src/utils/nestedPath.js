// =====================================================================
// Immutable nested path helpers (no lodash needed).
// =====================================================================

/**
 * Set value at path immutably.
 *   setPath({a:{b:1}}, "a.c", 2) → {a:{b:1,c:2}}
 */
export const setPath = (obj, path, value) => {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  if (keys.length === 0) return value;
  const [head, ...rest] = keys;
  return {
    ...(obj || {}),
    [head]: rest.length === 0 ? value : setPath(obj?.[head], rest, value),
  };
};

/**
 * Get value at path with fallback.
 *   getPath({a:{b:1}}, "a.b") → 1
 */
export const getPath = (obj, path, fallback = undefined) => {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return fallback;
    cur = cur[k];
  }
  return cur === undefined ? fallback : cur;
};

/**
 * Deep merge plain objects. Used to merge stored Firestore data
 * onto the schema defaults so newly-added fields don't crash.
 */
export function mergeDeep(target, source) {
  if (!isPlainObject(source)) return source ?? target;
  const out = { ...(target || {}) };
  for (const k of Object.keys(source)) {
    out[k] = isPlainObject(target?.[k]) && isPlainObject(source[k])
      ? mergeDeep(target[k], source[k])
      : source[k];
  }
  return out;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}