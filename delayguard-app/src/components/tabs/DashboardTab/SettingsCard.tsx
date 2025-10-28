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

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { AppSettings } from '../../../types';
import styles from './SettingsCard.module.css';

interface SettingsCardProps {
  shop: string | null;
  settings: AppSettings;
  loading: boolean;
  onSave: () => void;
  onTest: () => void;
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
  onSave,
  onTest,
  onConnect,
  onSettingsChange,
  benchmarks,
}: SettingsCardProps) {
  // Phase 1.4: Handle delay threshold change (maps to all 3 rules for now)
  const handleDelayThresholdChange = (value: number) => {
    onSettingsChange({ ...settings, delayThreshold: value });
  };

  // Handle notification changes
  const handleEmailToggle = () => {
    onSettingsChange({ ...settings, emailNotifications: !settings.emailNotifications });
  };

  const handleSmsToggle = () => {
    onSettingsChange({ ...settings, smsNotifications: !settings.smsNotifications });
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
      title="App Settings"
      subtitle="Configure your delay detection and notification preferences"
    >
      <div className={styles.content}>
        {/* System Status Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>System Status</h3>

          {/* Shopify Connection Status */}
          {shop ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <span className={styles.alertIcon}>✓</span>
              <div className={styles.alertContent}>
                <strong>Connected to Shopify</strong>
                <p className={styles.alertText}>Shop: {shop}</p>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Phase 1.4: Delay Detection Rules with Plain Language */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Delay Detection Rules</h3>
          <p className={styles.sectionSubtitle}>
            Configure when you want to be alerted about potential shipping delays
          </p>

          {/* Rule 1: Warehouse Delays (Pre-Shipment) */}
          <div className={styles.ruleCard}>
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
                  value={settings.delayThreshold}
                  onChange={(e) => handleDelayThresholdChange(parseInt(e.target.value) || 0)}
                  min="0"
                  max="30"
                  disabled={loading}
                />
                <span className={styles.inputSuffix}>days</span>
              </div>
            </div>
            <p className={styles.ruleHelpText}>
              💡 Catches warehouse and fulfillment bottlenecks early
            </p>
            {benchmarks && (
              <div className={styles.benchmarkContainer}>
                {renderBenchmark(benchmarks.avgFulfillmentDays, 'Your avg fulfillment time')}
              </div>
            )}
          </div>

          {/* Rule 2: Carrier Reported Delays (In-Transit Exceptions) */}
          <div className={styles.ruleCard}>
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
            <p className={styles.ruleHelpText}>
              💡 Immediate alerts for weather, accidents, lost packages
            </p>
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

          {/* Rule 3: Stuck in Transit (Extended Transit) */}
          <div className={styles.ruleCard}>
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
                  value={settings.delayThreshold + 5}
                  disabled={true}
                  min="0"
                  max="30"
                />
                <span className={styles.inputSuffix}>days (auto-calculated)</span>
              </div>
            </div>
            <p className={styles.ruleHelpText}>
              💡 Identifies potentially lost packages. Set to delay threshold + 5 days
            </p>
            {benchmarks && (
              <div className={styles.benchmarkContainer}>
                {renderBenchmark(benchmarks.avgDeliveryDays, 'Your avg delivery time')}
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

        {/* Notification Preferences Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Notification Preferences</h3>

          <div className={styles.setting}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={handleEmailToggle}
                disabled={loading}
                aria-label="Enable email notifications"
              />
              <span>
                <strong>Email Notifications</strong>
                <span className={styles.helpText}>Send email alerts to customers when delays are detected</span>
              </span>
            </label>
          </div>

          <div className={styles.setting}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={handleSmsToggle}
                disabled={loading}
                aria-label="Enable SMS notifications"
              />
              <span>
                <strong>SMS Notifications</strong>
                <span className={styles.helpText}>Send text message alerts to customers (requires phone numbers)</span>
              </span>
            </label>
          </div>

          {!settings.emailNotifications && !settings.smsNotifications && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <span className={styles.alertIcon}>⚠</span>
              <div className={styles.alertContent}>
                <strong>No notifications enabled</strong>
                <p className={styles.alertText}>Customers won&apos;t be notified about delays. Enable at least one notification method.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            variant="secondary"
            onClick={onTest}
            disabled={loading || !shop}
          >
            Send Test Alert
          </Button>
        </div>
      </div>
    </Card>
  );
}

SettingsCard.displayName = 'SettingsCard';
