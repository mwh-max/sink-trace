const HISTORY_STORE_CAP = 100;
const keyFor = nodeId => `sinktrace-history-${nodeId}`;

function load(nodeId) {
  try {
    const raw = localStorage.getItem(keyFor(nodeId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(nodeId, entries) {
  try {
    localStorage.setItem(keyFor(nodeId), JSON.stringify(entries));
  } catch {
    // Quota exceeded or storage unavailable — fail silently.
  }
}

/**
 * Appends a pressure reading for a node.
 * Caps stored entries at HISTORY_STORE_CAP (100), dropping the oldest.
 *
 * @param {string} nodeId
 * @param {number} pressure
 * @param {number} [timestamp] - ms since epoch; defaults to Date.now()
 */
export function appendHistory(nodeId, pressure, timestamp = Date.now()) {
  const entries = load(nodeId);
  entries.push({ pressure, timestamp });
  if (entries.length > HISTORY_STORE_CAP) {
    entries.splice(0, entries.length - HISTORY_STORE_CAP);
  }
  save(nodeId, entries);
}

/**
 * Returns the last `limit` readings for a node, oldest-first.
 * Returns all stored readings when limit is omitted.
 *
 * @param {string} nodeId
 * @param {number} [limit]
 * @returns {{ pressure: number, timestamp: number }[]}
 */
export function getHistory(nodeId, limit) {
  const entries = load(nodeId);
  return limit === undefined ? entries : entries.slice(-limit);
}

/**
 * Removes all stored readings for a node.
 *
 * @param {string} nodeId
 */
export function clearHistory(nodeId) {
  try {
    localStorage.removeItem(keyFor(nodeId));
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
