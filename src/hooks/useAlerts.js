import { useEffect, useRef } from 'react';

/**
 * Fires onAlert(nodeId, node) exactly once each time a node transitions
 * into a flagged state. Does not fire on the initial render, and does not
 * re-fire while a node remains continuously flagged.
 *
 * A node that recovers (flagged → false) and is later re-flagged will
 * produce a new alert, because that is a new flagging event.
 *
 * The alert destination (email, SMS, push) is not implemented here;
 * the caller supplies the callback.
 *
 * @param {Record<string, object>} nodes  - current nodes map from useNodeData
 * @param {(nodeId: string, node: object) => void} onAlert - alert callback
 */
export function useAlerts(nodes, onAlert) {
  // Wrap onAlert in a ref so changing the callback reference never
  // triggers the effect or causes missed / duplicate alerts.
  const onAlertRef = useRef(onAlert);
  useEffect(() => { onAlertRef.current = onAlert; }, [onAlert]);

  // Tracks the set of node IDs that are currently known to be flagged.
  // Populated on first run without firing, then diffed on every subsequent run.
  const flaggedIds  = useRef(new Set());
  const isFirstRun  = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      // Seed the set from initial state so we don't fire for pre-existing flags.
      for (const [id, node] of Object.entries(nodes)) {
        if (node.flagged) flaggedIds.current.add(id);
      }
      isFirstRun.current = false;
      return;
    }

    for (const [id, node] of Object.entries(nodes)) {
      if (node.flagged && !flaggedIds.current.has(id)) {
        // New flagging event — fire and record.
        flaggedIds.current.add(id);
        onAlertRef.current(id, node);
      } else if (!node.flagged && flaggedIds.current.has(id)) {
        // Node recovered — clear so a future re-flagging is treated as new.
        flaggedIds.current.delete(id);
      }
    }
  }, [nodes]);
}
