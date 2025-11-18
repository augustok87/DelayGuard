/**
 * SettingsCard Component V2 (Phase 1.4)
 *
 * Enhanced settings interface with:
 * - Plain language rule names (Warehouse Delays, Carrier Reported Delays, Stuck in Transit)
 * - Merchant benchmarks (avg fulfillment time, avg delivery time, delay trends)
 * - Improved help text with inline examples
 * - Better visual hierarchy
 *
 * Implements IMPLEMENTATION_PLAN.md Phase 1.4 requirements
 * Using existing AppSettings type for compatibility with Redux store
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Accordion } from '../../ui/Accordion';
import { AppSettings } from '../../../types';
import { useDebouncedCallback } from '../../../hooks/useDebounce';
import styles from './SettingsCard.module.css';

interface SettingsCardProps {
  shop: string | null;
  settings: AppSettings;
  loading: boolean;
  onSave: () => void; // Deprecated: No longer used with auto-save UX, kept for backward compatibility
  onTest: () => void; // Deprecated: Moved to NotificationPreferences in v1.20.3, kept for backward compatibility
  onConnect: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  // Phase 1.4: Merchant benchmarks
  benchmarks?: {
    avgFulfillmentDays: number;
    avgDeliveryDays: number;
    delaysThisMonth: number;
    delaysTrend?: number; // Percentage change from last month
  };
}

export function SettingsCard({
  shop,
  settings,
  loading,
  onSave: _onSave, // Prefixed with _ to indicate intentionally unused (auto-save UX)
  onTest: _onTest, // Prefixed with _ to indicate intentionally unused (moved to NotificationPreferences)
  onConnect,
  onSettingsChange,
  benchmarks,
}: SettingsCardProps) {
  // Local state for immediate UI updates (debounced save)
  const [localDelayThreshold, setLocalDelayThreshold] = useState(settings.delayThreshold);

  // Sync local state when settings prop changes (e.g., after save)
  useEffect(() => {
    setLocalDelayThreshold(settings.delayThreshold);
  }, [settings.delayThreshold]);

  // Debounced callback for auto-saving (1 second delay)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debouncedSave = useDebouncedCallback(
    (...args: any[]) => {
      onSettingsChange(args[0] as AppSettings);
    },
    1000,
  ) as (newSettings: AppSettings) => void;

  // Phase 2.7 Refactor: Accordion expand/collapse state
  const [accordionState, setAccordionState] = useState({
    warehouse: true,  // Expanded by default (most important)
    carrier: false,   // Collapsed by default
    transit: false,   // Collapsed by default
  });

  // Toggle accordion section
  const toggleAccordion = (section: 'warehouse' | 'carrier' | 'transit', event?: React.MouseEvent) => {
    // Don't toggle if clicking on checkbox or label
    if (event) {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'LABEL' || target.closest('label')) {
        return;
      }
    }

    setAccordionState(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle keyboard navigation for accordion
  const handleAccordionKeyDown = (
    e: React.KeyboardEvent,
    section: 'warehouse' | 'carrier' | 'transit',
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAccordion(section);
    }
  };

  // Phase 1.4: Handle delay threshold change with debouncing
  const handleDelayThresholdChange = (value: number) => {
    setLocalDelayThreshold(value); // Update UI immediately
    debouncedSave({ ...settings, delayThreshold: value }); // Save after 1s
  };

  // Phase 1.4: Render benchmark with comparison text
  const renderBenchmark = (value: number, label: string, suffix: string = 'days') => {
    let comparison = '';
    if (value < 2) {
      comparison = " (you're fast!)";
    } else if (value < 3) {
      comparison = ' (good)';
    } else if (value >= 5) {
      comparison = ' (could be faster)';
    }

    return (
      <span className={styles.benchmark}>
        📊 {label}: <strong>{value.toFixed(1)}</strong> {suffix}{comparison}
      </span>
    );
  };

  return (
    <Card
      title="Delay Detection Rules"
      subtitle="Set thresholds for when to alert customers about shipping delays"
    >
      <div className={styles.content}>
        {/* System Status Section - Only shown when not connected */}
        {!shop && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>System Status</h3>

            {/* Shopify Connection Status - Not Connected */}
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <span className={styles.alertIcon}>⚠</span>
              <div className={styles.alertContent}>
                <strong>Not Connected</strong>
                <p className={styles.alertText}>Connect your Shopify store to start monitoring orders</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onConnect}
                  disabled={loading}
                >
                  Connect to Shopify
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1.4: Delay Detection Rules with Plain Language */}
        {/* Phase 2.7 Refactor: Accordion wrapper for delay rules */}
        <div className={styles.section}>
          {/* Accordion 1: Warehouse Delays (expanded by default) */}
          <div className={styles.accordionSection}>
            {/* Accordion Header */}
            <div
              className={styles.accordionHeader}
              role="button"
              tabIndex={0}
              aria-expanded={accordionState.warehouse}
              aria-label="Warehouse Delays accordion"
              onClick={(e) => toggleAccordion('warehouse', e)}
              onKeyDown={(e) => handleAccordionKeyDown(e, 'warehouse')}
            >
              {/* Toggle checkbox in header */}
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={settings.warehouseDelaysEnabled !== false}
                  onChange={(e) => {
                    onSettingsChange({ ...settings, warehouseDelaysEnabled: e.target.checked });
                  }}
                  disabled={loading}
                  aria-label="Enable warehouse delay notifications"
                />
                <span className={styles.toggleText}>
                  <strong>Warehouse Delays</strong>
                  <span className={styles.toggleDescription}>
                    {localDelayThreshold} days threshold
                  </span>
                </span>
              </label>
              {/* Expand/collapse indicator */}
              <span className={styles.accordionIcon}>
                {accordionState.warehouse ? '▼' : '▶'}
              </span>
            </div>

            {/* Accordion Content (conditionally rendered) */}
            {accordionState.warehouse && (
              <div className={styles.accordionContent}>
                <div className={`${styles.ruleCard} ${settings.warehouseDelaysEnabled === false ? styles.ruleCardDisabled : ''}`}>
                  <div className={styles.ruleHeader}>
                    <span className={styles.ruleIcon}>📦</span>
                    <h4 className={styles.ruleTitle}>Warehouse Delays</h4>
                  </div>
                  <div className={styles.ruleSetting}>
                    <label htmlFor="delay-threshold" className={styles.ruleLabel}>
                      Alert me when orders sit unfulfilled for:
                    </label>
                    <div className={styles.inputGroup}>
                      <input
                        id="delay-threshold"
                        type="number"
                        className={styles.input}
                        value={localDelayThreshold}
                        onChange={(e) => handleDelayThresholdChange(parseInt(e.target.value) || 0)}
                        min="0"
                        max="30"
                        disabled={loading}
                      />
                      <span className={styles.inputSuffix}>days</span>
                    </div>
                  </div>
                  <Accordion title="💡 Learn More About Warehouse Delays" className={styles.ruleAccordion}>
                    <div className={styles.ruleExplanation}>
                      <p className={styles.explanationTitle}>
                        <strong>📌 What this detects:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Orders that haven&apos;t been fulfilled (shipped) after being placed. This catches orders stuck in YOUR warehouse or fulfillment center before they even leave your facility.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>🔍 How it works:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        If an order sits in &quot;unfulfilled&quot; status for {localDelayThreshold}+ days, DelayGuard sends you an alert. You can adjust this threshold based on your typical fulfillment speed.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>💼 Real-world example:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Customer orders on Monday → By Wednesday (2 days later), order still shows &quot;unfulfilled&quot; → You get an alert: &quot;Order #12345 is stuck in your warehouse!&quot; You can investigate (out of stock? picking error? staffing issue?) and fix it before the customer complains.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>✅ Why it matters:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Most customer complaints happen when orders don&apos;t ship on time. This rule catches internal bottlenecks early, giving you time to fix problems BEFORE customers get frustrated. Critical for high-value orders!
                      </p>
                    </div>
                  </Accordion>
                  {benchmarks && (
                    <div className={styles.benchmarkContainer}>
                      {renderBenchmark(benchmarks.avgFulfillmentDays, 'Your avg fulfillment time')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Carrier Reported Delays (collapsed by default) */}
          <div className={styles.accordionSection}>
            {/* Accordion Header */}
            <div
              className={styles.accordionHeader}
              role="button"
              tabIndex={0}
              aria-expanded={accordionState.carrier}
              aria-label="Carrier Reported Delays accordion"
              onClick={(e) => toggleAccordion('carrier', e)}
              onKeyDown={(e) => handleAccordionKeyDown(e, 'carrier')}
            >
              {/* Toggle checkbox in header */}
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={settings.carrierDelaysEnabled !== false}
                  onChange={(e) => {
                    onSettingsChange({ ...settings, carrierDelaysEnabled: e.target.checked });
                  }}
                  disabled={loading}
                  aria-label="Enable carrier delay notifications"
                />
                <span className={styles.toggleText}>
                  <strong>Carrier Reported Delays</strong>
                  <span className={styles.toggleDescription}>
                    Auto-detect
                  </span>
                </span>
              </label>
              {/* Expand/collapse indicator */}
              <span className={styles.accordionIcon}>
                {accordionState.carrier ? '▼' : '▶'}
              </span>
            </div>

            {/* Accordion Content (conditionally rendered) */}
            {accordionState.carrier && (
              <div className={styles.accordionContent}>
                <div className={`${styles.ruleCard} ${settings.carrierDelaysEnabled === false ? styles.ruleCardDisabled : ''}`}>
                  <div className={styles.ruleHeader}>
                    <span className={styles.ruleIcon}>🚨</span>
                    <h4 className={styles.ruleTitle}>Carrier Reported Delays</h4>
                  </div>
                  <div className={styles.ruleSetting}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        aria-label="Auto-detect carrier exceptions"
                      />
                      <span>Auto-detect when carriers report exceptions</span>
                    </label>
                    <p className={styles.helpText} style={{ marginLeft: '2rem' }}>
                      (Always enabled to catch critical carrier issues)
                    </p>
                  </div>
                  <Accordion title="💡 Learn More About Carrier Reported Delays" className={styles.ruleAccordion}>
                    <div className={styles.ruleExplanation}>
                      <p className={styles.explanationTitle}>
                        <strong>📌 What this detects:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Problems reported directly by shipping carriers (UPS, FedEx, USPS, DHL, etc.). These are exceptions the carrier is telling you about in their tracking system.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>🔍 How it works:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Always enabled (can&apos;t be turned off) because these are URGENT issues. DelayGuard monitors tracking events and instantly detects when carriers report exceptions like &quot;weather delay,&quot; &quot;damaged in transit,&quot; or &quot;delivery attempted - no access.&quot;
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>💼 Real-world examples:</strong>
                      </p>
                      <ul className={styles.explanationList}>
                        <li>🌨️ &quot;Severe weather - shipment delayed&quot; (snowstorm, hurricane)</li>
                        <li>📦 &quot;Package damaged in transit - returning to sender&quot;</li>
                        <li>🚫 &quot;Delivery attempted - address unknown&quot;</li>
                        <li>✈️ &quot;Package held at customs for inspection&quot;</li>
                        <li>🚛 &quot;Accident - delivery delayed 2-3 days&quot;</li>
                      </ul>
                      <p className={styles.explanationTitle}>
                        <strong>✅ Why it matters:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Customers will contact YOU (not the carrier) when there&apos;s a problem. Being proactive and reaching out first shows excellent customer service. You can explain the situation, offer a discount, or arrange a replacement before they demand a refund.
                      </p>
                    </div>
                  </Accordion>
                  {benchmarks && benchmarks.delaysThisMonth !== undefined && (
                    <div className={styles.benchmarkContainer}>
                      <span className={styles.benchmark}>
                        📊 You&apos;ve had <strong>{benchmarks.delaysThisMonth}</strong> carrier delays this month
                        {benchmarks.delaysTrend !== undefined && benchmarks.delaysTrend < 0 && (
                          <span className={styles.trendPositive}> ↓ {Math.abs(benchmarks.delaysTrend)}%</span>
                        )}
                        {benchmarks.delaysTrend !== undefined && benchmarks.delaysTrend > 0 && (
                          <span className={styles.trendNegative}> ↑ {benchmarks.delaysTrend}%</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Accordion 3: Stuck in Transit (collapsed by default) */}
          <div className={styles.accordionSection}>
            {/* Accordion Header */}
            <div
              className={styles.accordionHeader}
              role="button"
              tabIndex={0}
              aria-expanded={accordionState.transit}
              aria-label="Stuck in Transit accordion"
              onClick={(e) => toggleAccordion('transit', e)}
              onKeyDown={(e) => handleAccordionKeyDown(e, 'transit')}
            >
              {/* Toggle checkbox in header */}
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={settings.transitDelaysEnabled !== false}
                  onChange={(e) => {
                    onSettingsChange({ ...settings, transitDelaysEnabled: e.target.checked });
                  }}
                  disabled={loading}
                  aria-label="Enable transit delay notifications"
                />
                <span className={styles.toggleText}>
                  <strong>Stuck in Transit</strong>
                  <span className={styles.toggleDescription}>
                    {localDelayThreshold + 5} days threshold
                  </span>
                </span>
              </label>
              {/* Expand/collapse indicator */}
              <span className={styles.accordionIcon}>
                {accordionState.transit ? '▼' : '▶'}
              </span>
            </div>

            {/* Accordion Content (conditionally rendered) */}
            {accordionState.transit && (
              <div className={styles.accordionContent}>
                <div className={`${styles.ruleCard} ${settings.transitDelaysEnabled === false ? styles.ruleCardDisabled : ''}`}>
                  <div className={styles.ruleHeader}>
                    <span className={styles.ruleIcon}>⏰</span>
                    <h4 className={styles.ruleTitle}>Stuck in Transit</h4>
                  </div>
                  <div className={styles.ruleSetting}>
                    <label htmlFor="extended-transit-days" className={styles.ruleLabel}>
                      Alert when packages are in transit for:
                    </label>
                    <div className={styles.inputGroup}>
                      <input
                        id="extended-transit-days"
                        type="number"
                        className={styles.input}
                        value={localDelayThreshold + 5}
                        disabled={true}
                        min="0"
                        max="30"
                      />
                      <span className={styles.inputSuffix}>days (auto-calculated)</span>
                    </div>
                  </div>
                  <Accordion title="💡 Learn More About Stuck in Transit Detection" className={styles.ruleAccordion}>
                    <div className={styles.ruleExplanation}>
                      <p className={styles.explanationTitle}>
                        <strong>📌 What this detects:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Packages that are taking too long to deliver AFTER being shipped. This catches &quot;silently lost&quot; packages where the carrier hasn&apos;t reported any exception, but the package just isn&apos;t moving.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>🔍 How it works:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Auto-calculated as your warehouse delay threshold ({localDelayThreshold} days) + 5 additional days for shipping = {localDelayThreshold + 5} days total. If a package shows &quot;in transit&quot; for {localDelayThreshold + 5}+ days without delivery, you get an alert.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>💼 Real-world example:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Order ships on Monday → Package shows &quot;in transit&quot; all week → By the following Monday (7+ days), still no delivery scan → No carrier exception reported → Likely lost or stuck somewhere. You get an alert to investigate and contact the carrier before the customer gets angry.
                      </p>
                      <p className={styles.explanationTitle}>
                        <strong>✅ Why it matters:</strong>
                      </p>
                      <p className={styles.explanationText}>
                        Catches the &quot;ghost packages&quot; that fall through the cracks. The longer a package is in transit without updates, the more likely it&apos;s lost forever. Early detection lets you file a claim with the carrier and send a replacement to keep your customer happy. Waiting too long means guaranteed negative review.
                      </p>
                      <p className={styles.explanationNote}>
                        <em>💡 Tip: Shorter threshold = more proactive alerts, but may catch slow (but normal) shipments. Longer threshold = fewer false positives, but less time to fix real problems.</em>
                      </p>
                    </div>
                  </Accordion>
                  {benchmarks && (
                    <div className={styles.benchmarkContainer}>
                      {renderBenchmark(benchmarks.avgDeliveryDays, 'Your avg delivery time')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Smart Tip */}
          <div className={styles.smartTip}>
            <span className={styles.tipIcon}>💡</span>
            <div className={styles.tipContent}>
              <strong>SMART TIP:</strong> Based on your store&apos;s performance, we recommend a delay threshold of{' '}
              <strong>{Math.ceil((benchmarks?.avgFulfillmentDays || 2) + 1)}</strong> days to catch issues early
              while avoiding false positives.
            </div>
          </div>
        </div>

        {/* Phase 2.7: Merchant Contact Information */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Merchant Contact Information</h3>
          <p className={styles.sectionSubtitle}>
            Receive warehouse delay notifications at these contact details
          </p>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="merchant-email" className={styles.formLabel}>
                Merchant Email
              </label>
              <input
                id="merchant-email"
                type="email"
                className={styles.input}
                value={settings.merchantEmail || ''}
                onChange={(e) => onSettingsChange({ ...settings, merchantEmail: e.target.value })}
                placeholder="merchant@yourstore.com"
                disabled={loading}
              />
              <p className={styles.helpText}>
                Warehouse delay notifications will be sent here instead of to customers
              </p>
            </div>

            <div className={styles.formField}>
              <label htmlFor="merchant-phone" className={styles.formLabel}>
                Merchant Phone
              </label>
              <input
                id="merchant-phone"
                type="tel"
                className={styles.input}
                value={settings.merchantPhone || ''}
                onChange={(e) => onSettingsChange({ ...settings, merchantPhone: e.target.value })}
                placeholder="+1-555-1234"
                disabled={loading}
              />
              <p className={styles.helpText}>
                Optional: Receive SMS notifications for warehouse delays
              </p>
            </div>

            <div className={styles.formField}>
              <label htmlFor="merchant-name" className={styles.formLabel}>
                Merchant Name
              </label>
              <input
                id="merchant-name"
                type="text"
                className={styles.input}
                value={settings.merchantName || ''}
                onChange={(e) => onSettingsChange({ ...settings, merchantName: e.target.value })}
                placeholder="Shop Owner"
                disabled={loading}
              />
              <p className={styles.helpText}>
                Your name for personalized notifications
              </p>
            </div>
          </div>
        </div>

        {/* Send Test Alert button moved to NotificationPreferences component in v1.20.3 */}
      </div>
    </Card>
  );
}

SettingsCard.displayName = 'SettingsCard';
