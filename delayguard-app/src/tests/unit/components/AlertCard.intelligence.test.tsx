/**
 * AlertCard — Phase 2.1.f customer-intelligence display.
 *
 * Covers the three data-layer additions from Phase 2.1.b-d as they
 * surface in the UI:
 *   - priority score + level (delay_alerts.priority_score / priority_level)
 *   - financial breakdown (orders subtotal/tax/discounts/shipping columns)
 *   - shipping destination (orders shipping_* columns)
 *
 * All three are optional on the wire — the card must render cleanly with
 * and without them (legacy heuristic badge kept per the prop-widening
 * rule: old-shape alerts still get a priority badge).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertCard } from '../../../components/tabs/AlertsTab/AlertCard';
import { DelayAlert } from '../../../types';

const baseAlert: DelayAlert = {
  id: '42',
  orderId: '1001',
  customerName: 'Jane Doe',
  delayDays: 1,
  status: 'active',
  createdAt: '2026-07-01T10:00:00Z',
  customerEmail: 'jane@example.com',
  totalAmount: 384.99,
  currency: 'USD',
};

const noop = jest.fn();

describe('AlertCard — customer intelligence (Phase 2.1.f)', () => {
  describe('priority score + level', () => {
    it('renders the 4-axis priority score when provided', () => {
      render(
        <AlertCard
          alert={{ ...baseAlert, priorityScore: 78, priorityLevel: 'High' }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('78/100')).toBeInTheDocument();
    });

    it('uses the data-layer priority level for the badge when present', () => {
      render(
        <AlertCard
          // delayDays 1 would heuristically be LOW — the persisted
          // Critical level must win.
          alert={{ ...baseAlert, priorityLevel: 'Critical' }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('falls back to the delay/value heuristic when no level is provided (legacy shape)', () => {
      render(
        <AlertCard
          alert={{ ...baseAlert, delayDays: 7 }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('renders no score chip when the data layer has not scored the alert', () => {
      render(<AlertCard alert={baseAlert} onAction={noop} variant="active" />);

      expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    });
  });

  describe('financial breakdown', () => {
    it('renders the breakdown rows when provided', () => {
      render(
        <AlertCard
          alert={{
            ...baseAlert,
            financialBreakdown: {
              subtotal: 350,
              shipping: 20,
              tax: 24.99,
              discounts: 10,
            },
          }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('Order Financials')).toBeInTheDocument();
      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.getByText('$350.00')).toBeInTheDocument();
      expect(screen.getByText('Shipping:')).toBeInTheDocument();
      expect(screen.getByText('$20.00')).toBeInTheDocument();
      expect(screen.getByText('Tax:')).toBeInTheDocument();
      expect(screen.getByText('$24.99')).toBeInTheDocument();
      expect(screen.getByText('Discounts:')).toBeInTheDocument();
      expect(screen.getByText('-$10.00')).toBeInTheDocument();
    });

    it('renders only the fields present on the wire', () => {
      render(
        <AlertCard
          alert={{ ...baseAlert, financialBreakdown: { subtotal: 350 } }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.queryByText('Tax:')).not.toBeInTheDocument();
      expect(screen.queryByText('Discounts:')).not.toBeInTheDocument();
    });

    it('renders no financial section when the data layer omits it', () => {
      render(<AlertCard alert={baseAlert} onAction={noop} variant="active" />);

      expect(screen.queryByText('Order Financials')).not.toBeInTheDocument();
    });
  });

  describe('shipping destination', () => {
    it('renders the destination line when provided', () => {
      render(
        <AlertCard
          alert={{
            ...baseAlert,
            shippingDestination: {
              city: 'Denver',
              provinceCode: 'CO',
              countryCode: 'US',
              zip: '80202',
            },
          }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('Ships to:')).toBeInTheDocument();
      expect(screen.getByText('Denver, CO 80202, US')).toBeInTheDocument();
    });

    it('renders partial destinations without dangling separators', () => {
      render(
        <AlertCard
          alert={{ ...baseAlert, shippingDestination: { city: 'Denver' } }}
          onAction={noop}
          variant="active"
        />,
      );

      expect(screen.getByText('Denver')).toBeInTheDocument();
    });

    it('renders no destination line when the data layer omits it', () => {
      render(<AlertCard alert={baseAlert} onAction={noop} variant="active" />);

      expect(screen.queryByText('Ships to:')).not.toBeInTheDocument();
    });
  });

  it('renders a legacy alert (no 2.1 fields at all) without crashing', () => {
    render(<AlertCard alert={baseAlert} onAction={noop} variant="active" />);

    expect(screen.getByText('Order #1001')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
