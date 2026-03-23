import { useMemo } from 'react';
import sampleNodes from '../data/sampleNodes.json';
import { validateNodes } from '../utils/schema.js';
import { NODES_KEY } from '../utils/storageKeys.js';

// Loads and validates the initial node state from localStorage, falling back
// to sampleNodes if storage is empty, corrupt, or schema-incompatible.
// Structured as a hook so async data sources (fetch, WebSocket) can be
// swapped in here without touching App.jsx.
export function useNodes() {
  return useMemo(() => {
    try {
      const stored = localStorage.getItem(NODES_KEY);
      const raw = stored ? JSON.parse(stored) : sampleNodes;
      return { nodes: validateNodes(raw) };
    } catch {
      // Corrupt or outdated storage — discard and use defaults
      try { localStorage.removeItem(NODES_KEY); } catch { /* ignore */ }
      return { nodes: validateNodes(sampleNodes) };
    }
  }, []);
}
