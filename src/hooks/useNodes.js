import { useState } from 'react';
import sampleNodes from '../data/sampleNodes.json';
import { validateNodes } from '../utils/schema.js';

const STORAGE_KEY = 'sinktrace-nodes';

// Loads and validates the initial node state from localStorage, falling back
// to sampleNodes if storage is empty, corrupt, or schema-incompatible.
// Structured as a hook so async data sources (fetch, WebSocket) can be
// swapped in here without touching App.jsx.
export function useNodes() {
  const [result] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const raw = stored ? JSON.parse(stored) : sampleNodes;
      return { nodes: validateNodes(raw), error: null };
    } catch {
      // Corrupt or outdated storage — discard and use defaults
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return { nodes: validateNodes(sampleNodes), error: null };
    }
  });
  return result;
}
