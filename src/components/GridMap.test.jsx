import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GridMap from './GridMap.jsx';

const nodes = {
  a: { pressure: 50, flowDirection: 'normal',   flagged: false, flaggedAt: null,        history: [48, 49, 50] },
  b: { pressure: 20, flowDirection: 'reversed',  flagged: true,  flaggedAt: Date.now(),  history: [35, 28, 20] },
};

describe('GridMap', () => {
  it('renders a card for each node', () => {
    render(<GridMap nodes={nodes} />);
    expect(screen.getByLabelText(/junction a/i)).toBeTruthy();
    expect(screen.getByLabelText(/junction b/i)).toBeTruthy();
  });

  it('shows an alert for the flagged node', () => {
    render(<GridMap nodes={nodes} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('shows a falling trend for node b (history 35→28→20)', () => {
    render(<GridMap nodes={nodes} />);
    expect(screen.getByText(/falling/i)).toBeTruthy();
  });

  it('shows a rising trend for node a (history 48→49→50)', () => {
    render(<GridMap nodes={nodes} />);
    expect(screen.getByText(/rising/i)).toBeTruthy();
  });

  it('shows empty state message when no nodes provided', () => {
    render(<GridMap nodes={{}} />);
    expect(screen.getByText(/no junction data/i)).toBeTruthy();
  });

  it('each card is keyboard focusable', () => {
    render(<GridMap nodes={nodes} />);
    const cards = screen.getAllByRole('article');
    cards.forEach((card) => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });
});
