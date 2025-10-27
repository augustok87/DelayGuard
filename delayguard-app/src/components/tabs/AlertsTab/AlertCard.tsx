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

  const getPriorityColor = (delayDays: number) => {
    if (delayDays >= 7) return '#dc2626'; // Critical - red
    if (delayDays >= 4) return '#ea580c'; // High - orange
    if (delayDays >= 2) return '#d97706'; // Medium - amber
    return '#059669'; // Low - green
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

  const renderNotificationStatus = () => {
    if (!alert.notificationStatus) return null;

    const { emailSent, emailSentAt, smsSent, smsSentAt } = alert.notificationStatus;
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
              <span className={styles.notificationIcon}>✉️</span>
              <span className={styles.notificationText}>
                Email sent {emailSentAt && `on ${formatDateShort(emailSentAt)}`}
              </span>
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

  return (
    <div className={`${styles.alertCard} ${styles[variant]}`}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <h4 className={styles.orderId}>Order #{alert.orderId}</h4>
          <p className={styles.customerName}>{alert.customerName}</p>
        </div>
        <div className={styles.status}>
          {getStatusBadge(alert.status)}
        </div>
      </div>

      <div className={styles.content}>
        {/* Delay Information */}
        <div className={styles.delayInfo}>
          <div className={styles.delayDays} style={{ color: getPriorityColor(alert.delayDays) }}>
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

        {/* Basic Contact/Tracking Info */}
        {alert.customerEmail && (
          <div className={styles.contactInfo}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{alert.customerEmail}</span>
          </div>
        )}

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
