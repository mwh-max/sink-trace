import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useAlerts } from './useAlerts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const node = (flagged, overrides = {}) => ({ pressure: 50, flagged, ...overrides });

// Renders the hook with an initial nodes map and returns helpers for
// advancing state and inspecting the mock callback.
function setup(initialNodes) {
  const onAlert = vi.fn();
  const { rerender } = renderHook(
    ({ nodes }) => useAlerts(nodes, onAlert),
    { initialProps: { nodes: initialNodes } },
  );
  const update = (nodes) => act(() => rerender({ nodes }));
  return { onAlert, update };
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------
describe('useAlerts – initial load', () => {
  it('does not fire for nodes that are already flagged on first render', () => {
    const { onAlert } = setup({ a: node(true), b: node(false) });
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('does not fire when no nodes are flagged on first render', () => {
    const { onAlert } = setup({ a: node(false), b: node(false) });
    expect(onAlert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Transition: unflagged → flagged
// ---------------------------------------------------------------------------
describe('useAlerts – new flagging event', () => {
  it('fires onAlert when a node transitions to flagged', () => {
    const { onAlert, update } = setup({ a: node(false) });
    update({ a: node(true) });
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith('a', expect.objectContaining({ flagged: true }));
  });

  it('passes the full node object to the callback', () => {
    const { onAlert, update } = setup({ a: node(false) });
    const flaggedNode = node(true, { pressure: 28, label: 'Plant' });
    update({ a: flaggedNode });
    expect(onAlert).toHaveBeenCalledWith('a', flaggedNode);
  });

  it('fires once per node when multiple nodes are flagged in the same update', () => {
    const { onAlert, update } = setup({ a: node(false), b: node(false), c: node(false) });
    update({ a: node(true), b: node(true), c: node(false) });
    expect(onAlert).toHaveBeenCalledTimes(2);
    const calledIds = onAlert.mock.calls.map(([id]) => id).sort();
    expect(calledIds).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// Sustained flagging — no duplicate alerts
// ---------------------------------------------------------------------------
describe('useAlerts – no duplicate alerts', () => {
  it('does not re-fire while a node stays continuously flagged across ticks', () => {
    const { onAlert, update } = setup({ a: node(false) });
    update({ a: node(true) });   // flagging event — fires
    update({ a: node(true) });   // still flagged — silent
    update({ a: node(true) });   // still flagged — silent
    expect(onAlert).toHaveBeenCalledTimes(1);
  });

  it('does not fire when unrelated node fields change while flagged', () => {
    const { onAlert, update } = setup({ a: node(false) });
    update({ a: node(true, { pressure: 28 }) });    // flagging event
    update({ a: node(true, { pressure: 27 }) });    // same flag, different pressure
    expect(onAlert).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Recovery and re-flagging
// ---------------------------------------------------------------------------
describe('useAlerts – recovery and re-flagging', () => {
  it('fires again when a recovered node is re-flagged', () => {
    const { onAlert, update } = setup({ a: node(false) });
    update({ a: node(true) });    // first flagging event
    update({ a: node(false) });   // recovery
    update({ a: node(true) });    // second flagging event
    expect(onAlert).toHaveBeenCalledTimes(2);
  });

  it('does not fire during the recovery tick itself', () => {
    const { onAlert, update } = setup({ a: node(false) });
    update({ a: node(true) });   // fires
    update({ a: node(false) });  // recovery — should be silent
    expect(onAlert).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Nodes added after initial render
// ---------------------------------------------------------------------------
describe('useAlerts – nodes added dynamically', () => {
  it('fires when a new node appears already flagged (not present on first render)', () => {
    const { onAlert, update } = setup({ a: node(false) });
    // 'b' is a brand-new node that arrives flagged mid-stream
    update({ a: node(false), b: node(true) });
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith('b', expect.objectContaining({ flagged: true }));
  });
});

// ---------------------------------------------------------------------------
// Callback identity stability
// ---------------------------------------------------------------------------
describe('useAlerts – callback stability', () => {
  it('uses the latest callback reference without missing or duplicating alerts', () => {
    const first  = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ nodes, cb }) => useAlerts(nodes, cb),
      { initialProps: { nodes: { a: node(false) }, cb: first } },
    );

    // Swap callback, then trigger a flagging event
    act(() => rerender({ nodes: { a: node(false) }, cb: second }));
    act(() => rerender({ nodes: { a: node(true)  }, cb: second }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
