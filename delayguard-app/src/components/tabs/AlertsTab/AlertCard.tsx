/**
 * AlertCard V2 Component
 *
 * Enhanced alert card component that displays comprehensive delay information including:
 * - Delay reason (from carrier)
 * - Original and revised ETAs
 * - Customer notification status (email/SMS)
 * - Suggested actions for merchants
 * - Tracking event timeline
 *
 * Priority 3: Adds missing critical information to alert cards for better UX
 */

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Accordion } from '../../ui/Accordion';
import { DelayAlert, TrackingEvent } from '../../../types';
import styles from './AlertCard.module.css';

interface AlertCardProps {
  alert: DelayAlert;
  onAction: (alertId: string, action: 'resolve' | 'dismiss') => void;
  variant: 'active' | 'resolved' | 'dismissed';
}

export function AlertCard({ alert, onAction, variant }: AlertCardProps) {
  const [showAllEvents, setShowAllEvents] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      'active': { class: styles.badgeDanger, text: 'Active' },
      'resolved': { class: styles.badgeSuccess, text: 'Resolved' },
      'dismissed': { class: styles.badgeInfo, text: 'Dismissed' },
    };

    const statusInfo = statusMap[status] || { class: styles.badgeInfo, text: status };
    return <span className={`${styles.badge} ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  // Phase 1.1: Enhanced priority color that considers both delay days AND order value
  const getPriorityColor = (delayDays: number, orderTotal?: number) => {
    // Critical: 7+ days OR high-value orders ($500+) with any delay
    if (delayDays >= 7 || (orderTotal && orderTotal >= 500 && delayDays >= 3)) {
      return '#dc2626'; // Critical - red
    }
    // High: 4+ days OR medium-value orders ($200+) with 3+ day delay
    if (delayDays >= 4 || (orderTotal && orderTotal >= 200 && delayDays >= 2)) {
      return '#ea580c'; // High - orange
    }
    // Medium: 2+ days
    if (delayDays >= 2) {
      return '#d97706'; // Medium - amber
    }
    // Low: < 2 days
    return '#059669'; // Low - green
  };

  // Phase 1.1: Get priority level badge
  const getPriorityBadge = (delayDays: number, orderTotal?: number) => {
    if (delayDays >= 7 || (orderTotal && orderTotal >= 500 && delayDays >= 3)) {
      return { label: 'CRITICAL', color: '#dc2626', bgColor: '#fee2e2', borderColor: '#fecaca' };
    }
    if (delayDays >= 4 || (orderTotal && orderTotal >= 200 && delayDays >= 2)) {
      return { label: 'HIGH', color: '#ea580c', bgColor: '#ffedd5', borderColor: '#fed7aa' };
    }
    if (delayDays >= 2) {
      return { label: 'MEDIUM', color: '#d97706', bgColor: '#fef3c7', borderColor: '#fde68a' };
    }
    return { label: 'LOW', color: '#059669', bgColor: '#d1fae5', borderColor: '#a7f3d0' };
  };

  // Phase 1.1: Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateShort = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getDaysText = (days: number) => {
    return days === 1 ? '1 day' : `${days} days`;
  };

  const renderDelayReason = () => {
    if (!alert.delayReason) return null;

    return (
      <div className={styles.delayReason}>
        <span className={styles.reasonIcon}>⚠️</span>
        <div className={styles.reasonContent}>
          <span className={styles.reasonLabel}>Reason:</span>
          <span className={styles.reasonText}>{alert.delayReason}</span>
        </div>
      </div>
    );
  };

  const renderEtaInformation = () => {
    if (!alert.originalEta && !alert.revisedEta) return null;

    return (
      <div className={styles.etaSection}>
        <h5 className={styles.sectionTitle}>Delivery Timeline</h5>
        {alert.originalEta && (
          <div className={styles.etaItem}>
            <span className={styles.etaLabel}>Original ETA:</span>
            <span className={styles.etaValue}>{formatDateShort(alert.originalEta)}</span>
          </div>
        )}
        {alert.revisedEta && (
          <div className={styles.etaItem}>
            <span className={styles.etaLabel}>Revised ETA:</span>
            <span className={`${styles.etaValue} ${styles.revisedEta}`}>
              {formatDateShort(alert.revisedEta)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Phase 1.1 & 1.3: Enhanced notification status with engagement tracking
  const renderNotificationStatus = () => {
    if (!alert.notificationStatus) return null;

    const {
      emailSent,
      emailSentAt,
      emailOpened,
      emailOpenedAt,
      emailClicked,
      emailClickedAt,
      smsSent,
      smsSentAt,
    } = alert.notificationStatus;
    const hasNotifications = emailSent || smsSent;

    if (!hasNotifications && emailSent === false && smsSent === false) {
      return (
        <div className={styles.notificationSection}>
          <h5 className={styles.sectionTitle}>Customer Notifications</h5>
          <div className={styles.notificationNone}>
            <span className={styles.notificationIcon}>❌</span>
            <span className={styles.notificationText}>No notifications sent</span>
          </div>
        </div>
      );
    }

    if (!hasNotifications) return null;

    return (
      <div className={styles.notificationSection}>
        <h5 className={styles.sectionTitle}>Customer Notifications</h5>
        <div className={styles.notificationList}>
          {emailSent && (
            <div className={styles.notificationItem}>
              <span className={styles.notificationIcon}>
                {emailOpened ? '📧' : '✉️'}
              </span>
              <div className={styles.notificationDetails}>
                <span className={styles.notificationText}>
                  Email sent {emailSentAt && `on ${formatDateShort(emailSentAt)}`}
                </span>
                {emailOpened && (
                  <span className={`${styles.badge} ${styles.badgeSuccess}`} style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                    ✓ Opened {emailOpenedAt && `on ${formatDateShort(emailOpenedAt)}`}
                  </span>
                )}
                {emailClicked && (
                  <span className={`${styles.badge} ${styles.badgeInfo}`} style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                    🔗 Clicked {emailClickedAt && `on ${formatDateShort(emailClickedAt)}`}
                  </span>
                )}
                {emailSent && !emailOpened && (
                  <span className={styles.notificationHint} style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#6b7280' }}>
                    Not opened yet
                  </span>
                )}
              </div>
            </div>
          )}
          {smsSent && (
            <div className={styles.notificationItem}>
              <span className={styles.notificationIcon}>📱</span>
              <span className={styles.notificationText}>
                SMS sent {smsSentAt && `on ${formatDateShort(smsSentAt)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Phase 1.2: Product Information Display
  const renderProductDetails = () => {
    if (!alert.lineItems || alert.lineItems.length === 0) return null;

    const MAX_ITEMS_TO_SHOW = 5;
    const displayItems = alert.lineItems.slice(0, MAX_ITEMS_TO_SHOW);
    const remainingCount = alert.lineItems.length - MAX_ITEMS_TO_SHOW;

    return (
      <Accordion
        title={`📦 View Order Contents (${alert.lineItems.length} item${alert.lineItems.length !== 1 ? 's' : ''})`}
        className={styles.productDetailsAccordion}
        defaultOpen={false}
      >
        <div className={styles.productDetails}>
          <div className={styles.lineItemsContainer}>
            {displayItems.map((item) => (
              <div key={item.id} className={styles.lineItem}>
                {/* Product image or placeholder */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className={styles.productThumbnail}
                  />
                ) : (
                  <div className={styles.productPlaceholder}>📦</div>
                )}

                {/* Product information */}
                <div className={styles.itemInfo}>
                  <p className={styles.productTitle}>{item.title}</p>
                  {item.variantTitle && (
                    <p className={styles.variant}>{item.variantTitle}</p>
                  )}
                  <div className={styles.itemMeta}>
                    <span className={styles.metaItem}>SKU: {item.sku || 'N/A'}</span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>Qty: {item.quantity}</span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>${item.price.toFixed(2)}</span>
                  </div>
                  {/* Product type badge */}
                  {item.productType && (
                    <span className={styles.productTypeBadge}>{item.productType}</span>
                  )}
                  {/* Vendor name */}
                  {item.vendor && (
                    <span className={styles.vendorName}>by {item.vendor}</span>
                  )}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className={styles.moreItems}>
                +{remainingCount} more items
              </div>
            )}
          </div>
        </div>
      </Accordion>
    );
  };

  const renderSuggestedActions = () => {
    if (!alert.suggestedActions || alert.suggestedActions.length === 0) return null;

    return (
      <div className={styles.actionsSection}>
        <h5 className={styles.sectionTitle}>Suggested Actions</h5>
        <ul className={styles.suggestedActions}>
          {alert.suggestedActions.map((action) => (
            <li key={action} className={styles.actionItem}>
              <span className={styles.actionBullet}>•</span>
              <span className={styles.actionText}>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTrackingTimeline = () => {
    if (!alert.trackingEvents || alert.trackingEvents.length === 0) return null;

    // Sort events by timestamp (most recent first) and limit to 5 unless "show all" is clicked
    const sortedEvents = [...alert.trackingEvents].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const displayEvents = showAllEvents ? sortedEvents : sortedEvents.slice(0, 5);
    const hasMoreEvents = sortedEvents.length > 5;

    return (
      <div className={styles.timelineSection}>
        <h5 className={styles.sectionTitle}>Tracking Timeline</h5>
        <div className={styles.timeline}>
          {displayEvents.map((event: TrackingEvent, index: number) => (
            <div key={event.id} className={styles.timelineEvent}>
              <div className={styles.timelineDot}></div>
              {index < displayEvents.length - 1 && <div className={styles.timelineLine}></div>}
              <div className={styles.eventContent}>
                <div className={styles.eventHeader}>
                  <span className={styles.eventTime}>{formatDate(event.timestamp)}</span>
                  {event.location && (
                    <span className={styles.eventLocation}>📍 {event.location}</span>
                  )}
                </div>
                <div className={styles.eventDescription}>{event.description}</div>
                {event.carrierStatus && (
                  <div className={styles.eventStatus}>{event.carrierStatus}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {hasMoreEvents && !showAllEvents && (
          <button
            className={styles.showMoreButton}
            onClick={() => setShowAllEvents(true)}
          >
            Show all events ({sortedEvents.length})
          </button>
        )}
        {showAllEvents && (
          <button
            className={styles.showMoreButton}
            onClick={() => setShowAllEvents(false)}
          >
            Show less
          </button>
        )}
      </div>
    );
  };

  // Phase 1.1: Get priority info
  const priorityBadge = getPriorityBadge(alert.delayDays, alert.totalAmount);

  return (
    <div className={`${styles.alertCard} ${styles[variant]}`}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <div className={styles.orderHeader}>
            <h4 className={styles.orderId}>Order #{alert.orderId}</h4>
            {/* Phase 1.1: Order total prominently displayed */}
            {alert.totalAmount && (
              <span className={styles.orderTotal}>
                {formatCurrency(alert.totalAmount, alert.currency)}
              </span>
            )}
          </div>
          <p className={styles.customerName}>{alert.customerName}</p>
          {/* Phase 1.1: Email and phone more prominent */}
          <div className={styles.contactDetails}>
            {alert.customerEmail && (
              <span className={styles.contactItem}>
                <span className={styles.contactIcon}>✉️</span>
                {alert.customerEmail}
              </span>
            )}
            {alert.customerPhone && (
              <span className={styles.contactItem}>
                <span className={styles.contactIcon}>📞</span>
                {alert.customerPhone}
              </span>
            )}
          </div>
        </div>
        <div className={styles.status}>
          {getStatusBadge(alert.status)}
          {/* Phase 1.1: Priority badge */}
          <span
            className={styles.priorityBadge}
            style={{
              color: priorityBadge.color,
              backgroundColor: priorityBadge.bgColor,
              borderColor: priorityBadge.borderColor,
            }}
          >
            {priorityBadge.label}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        {/* Delay Information */}
        <div className={styles.delayInfo}>
          <div className={styles.delayDays} style={{ color: getPriorityColor(alert.delayDays, alert.totalAmount) }}>
            {getDaysText(alert.delayDays)} delay
          </div>
          <div className={styles.createdAt}>
            Created: {formatDate(alert.createdAt)}
          </div>
          {alert.resolvedAt && (
            <div className={styles.resolvedAt}>
              Resolved: {formatDate(alert.resolvedAt)}
            </div>
          )}
        </div>

        {/* Priority 3: Delay Reason */}
        {renderDelayReason()}

        {/* Tracking Info */}
        {alert.trackingNumber && (
          <div className={styles.trackingInfo}>
            <span className={styles.label}>Tracking:</span>
            <span className={styles.value}>{alert.trackingNumber}</span>
            {alert.carrierCode && (
              <span className={styles.carrier}>({alert.carrierCode})</span>
            )}
          </div>
        )}

        {/* Priority 3: ETA Information */}
        {renderEtaInformation()}

        {/* Priority 3: Notification Status */}
        {renderNotificationStatus()}

        {/* Phase 1.2: Product Information */}
        {renderProductDetails()}

        {/* Priority 3: Suggested Actions */}
        {renderSuggestedActions()}

        {/* Priority 3: Tracking Timeline */}
        {renderTrackingTimeline()}
      </div>

      {variant === 'active' && (
        <div className={styles.actions}>
          <Button
            variant="success"
            size="sm"
            onClick={() => onAction(alert.id, 'resolve')}
          >
            Mark Resolved
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onAction(alert.id, 'dismiss')}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

AlertCard.displayName = 'AlertCard';
