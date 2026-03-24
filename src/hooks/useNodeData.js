import { useState, useEffect, useRef, useCallback } from 'react';
import { useNodes } from './useNodes.js';
import simulateFlow, { CONSECUTIVE_TICKS_THRESHOLD } from '../utils/simulateFlow.js';
import pipeEdges from '../data/pipeEdges.json';
import { validateNodes } from '../utils/schema.js';

const SIMULATE_INTERVAL_MS = 3000;
const LIVE_POLL_INTERVAL_MS = 5000;
const API_URL = '/api/nodes';

// Unified data layer for node state.
// mode: 'simulate' — runs the local DW simulation on a 3 s interval.
// mode: 'live'     — polls GET /api/nodes every 5 s; on error, retains the
//                    last known node state and surfaces the message via `error`.
//
// Returns { nodes, error, lastUpdated, tick }
//   tick() — triggers one immediate update in whichever mode is active
//             (one simulation step, or one fetch).
export function useNodeData(mode, { flagThreshold = CONSECUTIVE_TICKS_THRESHOLD } = {}) {
  const { nodes: initialNodes } = useNodes();

  const [nodes, setNodes]           = useState(initialNodes);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Keeps the interval callback reading current node state without
  // rebuilding the interval every render.
  const nodesRef = useRef(initialNodes);

  // Always holds the current mode's immediate-update function so that
  // the returned tick() reference stays stable across renders.
  const tickRef = useRef(() => {});

  // Stable helper — sets nodes, clears any error, and stamps lastUpdated.
  const applyNodes = useCallback((incoming) => {
    nodesRef.current = incoming;
    setNodes(incoming);
    setError(null);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (mode === 'simulate') {
      const runTick = () =>
        applyNodes(
          simulateFlow({ nodes: nodesRef.current, edges: pipeEdges, consecutiveTicks: flagThreshold })
        );

      tickRef.current = runTick;
      runTick(); // apply computed state immediately on mount / mode change
      const id = setInterval(runTick, SIMULATE_INTERVAL_MS);
      return () => clearInterval(id);
    }

    if (mode === 'live') {
      // cancelled prevents state updates after the effect is torn down
      // (handles React StrictMode double-invocation cleanly).
      let cancelled = false;

      const fetchOnce = async () => {
        try {
          const res = await fetch(API_URL);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.json();
          if (cancelled) return;
          applyNodes(validateNodes(raw));
        } catch (err) {
          if (cancelled) return;
          // Retain last known nodes — only surface the error.
          setError(err instanceof Error ? err.message : 'Failed to fetch node data');
        }
      };

      tickRef.current = fetchOnce;
      fetchOnce();
      const id = setInterval(fetchOnce, LIVE_POLL_INTERVAL_MS);
      return () => { cancelled = true; clearInterval(id); };
    }
  }, [mode, flagThreshold, applyNodes]);

  const tick = useCallback(() => tickRef.current(), []);

  return { nodes, error, lastUpdated, tick };
}
