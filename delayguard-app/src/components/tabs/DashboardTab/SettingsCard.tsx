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
import { HelpModal } from '../../ui/HelpModal';
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
  const debouncedSave = useDebouncedCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      onSettingsChange(args[0] as AppSettings);
    },
    1000,
  ) as (newSettings: AppSettings) => void;

  // v1.25: Help modal state management
  const [helpModalState, setHelpModalState] = useState({
    warehouse: false,
    carrier: false,
    transit: false,
  });

  // Open help modal
  const openHelpModal = (section: 'warehouse' | 'carrier' | 'transit') => {
    setHelpModalState(prev => ({
      ...prev,
      [section]: true,
    }));
  };

  // Close help modal
  const closeHelpModal = (section: 'warehouse' | 'carrier' | 'transit') => {
    setHelpModalState(prev => ({
      ...prev,
      [section]: false,
    }));
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
        {/* v1.26: Always-visible rules (no accordions) */}
        <div className={styles.section}>
          {/* v1.27: Grid wrapper for 3-column desktop layout */}
          <div className={styles.rulesGrid}>
            {/* Warehouse Delays */}
            <div className={styles.ruleSection}>
            {/* Toggle Checkbox */}
            <div className={styles.toggleSection}>
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
                  Enable warehouse delay notifications
                </span>
              </label>
            </div>

            {/* Rule Card (always visible) */}
            {/* v1.28: Added ruleCardWarehouse variant for colored left border */}
            <div className={`${styles.ruleCard} ${styles.ruleCardWarehouse} ${settings.warehouseDelaysEnabled === false ? styles.ruleCardDisabled : ''}`}>
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

              {/* Learn More Button - Opens modal */}
              <button
                className={styles.learnMoreButton}
                onClick={() => openHelpModal('warehouse')}
                type="button"
              >
                <span className={styles.learnMoreIcon}>ℹ️</span>
                Learn More About Warehouse Delays
              </button>

              {benchmarks && (
                <div className={styles.benchmarkContainer}>
                  {renderBenchmark(benchmarks.avgFulfillmentDays, 'Your avg fulfillment time')}
                </div>
              )}
            </div>
          </div>

          {/* Carrier Reported Delays */}
          <div className={styles.ruleSection}>
            {/* Toggle Checkbox */}
            <div className={styles.toggleSection}>
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
                  Enable carrier delay notifications
                </span>
              </label>
            </div>

            {/* Rule Card (always visible) */}
            {/* v1.28: Added ruleCardCarrier variant for colored left border */}
            <div className={`${styles.ruleCard} ${styles.ruleCardCarrier} ${settings.carrierDelaysEnabled === false ? styles.ruleCardDisabled : ''}`}>
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

              {/* Learn More Button - Opens modal */}
              <button
                className={styles.learnMoreButton}
                onClick={() => openHelpModal('carrier')}
                type="button"
              >
                <span className={styles.learnMoreIcon}>ℹ️</span>
                Learn More About Carrier Reported Delays
              </button>

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

          {/* Stuck in Transit */}
          <div className={styles.ruleSection}>
            {/* Toggle Checkbox */}
            <div className={styles.toggleSection}>
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
                  Enable transit delay notifications
                </span>
              </label>
            </div>

            {/* Rule Card (always visible) */}
            {/* v1.28: Added ruleCardTransit variant for colored left border */}
            <div className={`${styles.ruleCard} ${styles.ruleCardTransit} ${settings.transitDelaysEnabled === false ? styles.ruleCardDisabled : ''}`}>
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

              {/* Learn More Button - Opens modal */}
              <button
                className={styles.learnMoreButton}
                onClick={() => openHelpModal('transit')}
                type="button"
              >
                <span className={styles.learnMoreIcon}>ℹ️</span>
                Learn More About Stuck in Transit Detection
              </button>

              {benchmarks && (
                <div className={styles.benchmarkContainer}>
                  {renderBenchmark(benchmarks.avgDeliveryDays, 'Your avg delivery time')}
                </div>
              )}
            </div>
          </div>
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

        {/* Send Test Alert button moved to NotificationPreferences component in v1.20.3 */}
      </div>

      {/* v1.25: Help Modals - Educational content for delay detection rules */}

      {/* Warehouse Delays Help Modal */}
      <HelpModal
        isOpen={helpModalState.warehouse}
        onClose={() => closeHelpModal('warehouse')}
        title="What are Warehouse Delays?"
      >
        <h3>📌 What this detects:</h3>
        <p>
          Orders that haven&apos;t been fulfilled (shipped) after being placed. This catches orders stuck in YOUR warehouse or fulfillment center before they even leave your facility.
        </p>

        <h3>🔍 How it works:</h3>
        <p>
          If an order sits in &quot;unfulfilled&quot; status for {localDelayThreshold}+ days, DelayGuard sends you an alert. You can adjust this threshold based on your typical fulfillment speed.
        </p>

        <h3>💼 Real-world example:</h3>
        <p>
          Customer orders on Monday → By Wednesday (2 days later), order still shows &quot;unfulfilled&quot; → You get an alert: &quot;Order #12345 is stuck in your warehouse!&quot; You can investigate (out of stock? picking error? staffing issue?) and fix it before the customer complains.
        </p>

        <h3>✅ Why it matters:</h3>
        <p>
          Most customer complaints happen when orders don&apos;t ship on time. This rule catches internal bottlenecks early, giving you time to fix problems BEFORE customers get frustrated. Critical for high-value orders!
        </p>
      </HelpModal>

      {/* Carrier Reported Delays Help Modal */}
      <HelpModal
        isOpen={helpModalState.carrier}
        onClose={() => closeHelpModal('carrier')}
        title="What are Carrier Reported Delays?"
      >
        <h3>📌 What this detects:</h3>
        <p>
          Problems reported directly by shipping carriers (UPS, FedEx, USPS, DHL, etc.). These are exceptions the carrier is telling you about in their tracking system.
        </p>

        <h3>🔍 How it works:</h3>
        <p>
          Always enabled (can&apos;t be turned off) because these are URGENT issues. DelayGuard monitors tracking events and instantly detects when carriers report exceptions like &quot;weather delay,&quot; &quot;damaged in transit,&quot; or &quot;delivery attempted - no access.&quot;
        </p>

        <h3>💼 Real-world examples:</h3>
        <ul>
          <li>🌨️ &quot;Severe weather - shipment delayed&quot; (snowstorm, hurricane)</li>
          <li>📦 &quot;Package damaged in transit - returning to sender&quot;</li>
          <li>🚫 &quot;Delivery attempted - address unknown&quot;</li>
          <li>✈️ &quot;Package held at customs for inspection&quot;</li>
          <li>🚛 &quot;Accident - delivery delayed 2-3 days&quot;</li>
        </ul>

        <h3>✅ Why it matters:</h3>
        <p>
          Customers will contact YOU (not the carrier) when there&apos;s a problem. Being proactive and reaching out first shows excellent customer service. You can explain the situation, offer a discount, or arrange a replacement before they demand a refund.
        </p>
      </HelpModal>

      {/* Stuck in Transit Help Modal */}
      <HelpModal
        isOpen={helpModalState.transit}
        onClose={() => closeHelpModal('transit')}
        title="What is Stuck in Transit Detection?"
      >
        <h3>📌 What this detects:</h3>
        <p>
          Packages that are taking too long to deliver AFTER being shipped. This catches &quot;silently lost&quot; packages where the carrier hasn&apos;t reported any exception, but the package just isn&apos;t moving.
        </p>

        <h3>🔍 How it works:</h3>
        <p>
          Auto-calculated as your warehouse delay threshold ({localDelayThreshold} days) + 5 additional days for shipping = {localDelayThreshold + 5} days total. If a package shows &quot;in transit&quot; for {localDelayThreshold + 5}+ days without delivery, you get an alert.
        </p>

        <h3>💼 Real-world example:</h3>
        <p>
          Order ships on Monday → Package shows &quot;in transit&quot; all week → By the following Monday (7+ days), still no delivery scan → No carrier exception reported → Likely lost or stuck somewhere. You get an alert to investigate and contact the carrier before the customer gets angry.
        </p>

        <h3>✅ Why it matters:</h3>
        <p>
          Catches the &quot;ghost packages&quot; that fall through the cracks. The longer a package is in transit without updates, the more likely it&apos;s lost forever. Early detection lets you file a claim with the carrier and send a replacement to keep your customer happy. Waiting too long means guaranteed negative review.
        </p>

        <p style={{ marginTop: '1rem', fontSize: '0.875rem', fontStyle: 'italic', color: '#64748b' }}>
          💡 Tip: Shorter threshold = more proactive alerts, but may catch slow (but normal) shipments. Longer threshold = fewer false positives, but less time to fix real problems.
        </p>
      </HelpModal>
    </Card>
  );
}

SettingsCard.displayName = 'SettingsCard';
