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
import {
  AlertTriangle,
  Link,
  MailOpen,
  Send,
  Smartphone,
  Package,
  Lightbulb,
  Truck,
  MapPin,
  BookOpen,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Accordion } from '../../ui/Accordion';
import { InfoTooltip } from '../../ui/InfoTooltip'; // Phase A: UX clarity
import { DelayAlert, TrackingEvent } from '../../../types';
import styles from './AlertCard.module.css';

interface AlertCardProps {
  alert: DelayAlert;
  onAction: (alertId: string, action: 'resolve' | 'dismiss' | 'reopen') => void;
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

  // Phase 1: Compact delay info that merges delay days + reason
  const renderCompactDelayInfo = () => {
    return (
      <div className={styles.delayInfoCompact}>
        <span
          className={styles.delayDaysInline}
          style={{ color: getPriorityColor(alert.delayDays, alert.totalAmount) }}
        >
          {alert.delayReason && <AlertTriangle size={16} aria-hidden={true} strokeWidth={2} style={{ display: 'inline', marginRight: '0.25rem' }} />}
          {getDaysText(alert.delayDays)} delay
        </span>
        {alert.delayReason && (
          <>
            <span className={styles.delaySeparator}>—</span>
            <span className={styles.reasonInline}>{alert.delayReason}</span>
          </>
        )}
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

  // Phase 1 & Phase A: Compact notification status with inline badges (improved labels)
  const renderNotificationStatusCompact = () => {
    if (!alert.notificationStatus) return null;

    const { emailSent, emailOpened, emailClicked, smsSent } = alert.notificationStatus;
    const badges = [];

    // Phase A: Updated badge labels for better merchant clarity
    if (emailClicked) {
      badges.push({ icon: <Link size={14} aria-hidden={true} strokeWidth={2} />, label: 'Engaged', style: styles.badgeClicked });
    } else if (emailOpened) {
      badges.push({ icon: <MailOpen size={14} aria-hidden={true} strokeWidth={2} />, label: 'Read', style: styles.badgeOpened });
    } else if (emailSent) {
      badges.push({ icon: <Send size={14} aria-hidden={true} strokeWidth={2} />, label: 'Delivered', style: styles.badgeSent });
    }

    if (smsSent) {
      badges.push({ icon: <Smartphone size={14} aria-hidden={true} strokeWidth={2} />, label: 'SMS', style: styles.badgeSms });
    }

    if (badges.length === 0) return null;

    return (
      <div className={styles.notificationCompact}>
        {badges.map((badge) => (
          <span key={badge.label} className={`${styles.notificationBadgeCompact} ${badge.style}`}>
            {badge.icon} {badge.label}
          </span>
        ))}
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
        title={
          <>
            <Package size={16} aria-hidden={true} strokeWidth={2} style={{ display: 'inline', marginRight: '0.5rem' }} />
            View Order Contents ({alert.lineItems.length} item{alert.lineItems.length !== 1 ? 's' : ''})
          </>
        }
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
                  <div className={styles.productPlaceholder}>
                    <Package size={24} aria-hidden={true} strokeWidth={1.5} />
                  </div>
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
      <Accordion
        title={
          <>
            <Lightbulb size={16} aria-hidden={true} strokeWidth={2} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Suggested Actions ({alert.suggestedActions.length})
          </>
        }
        className={styles.suggestedActionsAccordion}
        defaultOpen={false}
      >
        <div className={styles.actionsSection}>
          <ul className={styles.suggestedActions}>
            {alert.suggestedActions.map((action) => (
              <li key={action} className={styles.actionItem}>
                <span className={styles.actionBullet}>•</span>
                <span className={styles.actionText}>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </Accordion>
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
      <Accordion
        title={
          <>
            <Truck size={16} aria-hidden={true} strokeWidth={2} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Tracking Timeline ({sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''})
          </>
        }
        className={styles.trackingTimelineAccordion}
        defaultOpen={false}
      >
        <div className={styles.timelineSection}>
          <div className={styles.timeline}>
            {displayEvents.map((event: TrackingEvent, index: number) => (
              <div key={event.id} className={styles.timelineEvent}>
                <div className={styles.timelineDot}></div>
                {index < displayEvents.length - 1 && <div className={styles.timelineLine}></div>}
                <div className={styles.eventContent}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventTime}>{formatDate(event.timestamp)}</span>
                    {event.location && (
                      <span className={styles.eventLocation}>
                        <MapPin size={14} aria-hidden={true} strokeWidth={2} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {event.location}
                      </span>
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
      </Accordion>
    );
  };

  // Phase A: Badge legend for merchant education
  const renderBadgeLegend = () => {
    // Only show legend if there's actual notification activity
    if (!alert.notificationStatus) return null;
    const hasNotificationActivity =
      alert.notificationStatus.emailSent || alert.notificationStatus.smsSent;
    if (!hasNotificationActivity) return null;

    return (
      <Accordion
        title={
          <>
            <BookOpen size={16} aria-hidden={true} strokeWidth={2} style={{ display: 'inline', marginRight: '0.5rem' }} />
            What do these badges mean?
          </>
        }
        className={styles.badgeLegendAccordion}
        defaultOpen={false}
      >
        <div className={styles.badgeLegend}>
          <div className={styles.legendItem}>
            <span className={`${styles.notificationBadgeCompact} ${styles.badgeClicked}`}>
              <Link size={14} aria-hidden={true} strokeWidth={2} /> Engaged
            </span>
            <span className={styles.legendText}>
              Customer clicked a link in your email (highest engagement!)
            </span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.notificationBadgeCompact} ${styles.badgeOpened}`}>
              <MailOpen size={14} aria-hidden={true} strokeWidth={2} /> Read
            </span>
            <span className={styles.legendText}>Customer opened and read your email</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.notificationBadgeCompact} ${styles.badgeSent}`}>
              <Send size={14} aria-hidden={true} strokeWidth={2} /> Delivered
            </span>
            <span className={styles.legendText}>Email notification sent to customer</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.notificationBadgeCompact} ${styles.badgeSms}`}>
              <Smartphone size={14} aria-hidden={true} strokeWidth={2} /> SMS
            </span>
            <span className={styles.legendText}>Text message sent to customer</span>
          </div>
        </div>
      </Accordion>
    );
  };

  // Phase 1.1: Get priority info
  const priorityBadge = getPriorityBadge(alert.delayDays, alert.totalAmount);

  // v1.29: Get priority variant class for color-coded left border
  const getPriorityVariantClass = (delayDays: number, orderTotal?: number) => {
    if (delayDays >= 7 || (orderTotal && orderTotal >= 500 && delayDays >= 3)) {
      return styles.alertCardCritical;
    }
    if (delayDays >= 4 || (orderTotal && orderTotal >= 200 && delayDays >= 2)) {
      return styles.alertCardHigh;
    }
    if (delayDays >= 2) {
      return styles.alertCardMedium;
    }
    return styles.alertCardLow;
  };

  const priorityVariantClass = getPriorityVariantClass(alert.delayDays, alert.totalAmount);

  return (
    <div className={`${styles.alertCard} ${styles[variant]} ${priorityVariantClass}`}>
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
                <span className={styles.contactIcon}>
                  <Mail size={16} aria-hidden={true} strokeWidth={2} />
                </span>
                {alert.customerEmail}
              </span>
            )}
            {alert.customerPhone && (
              <span className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <Phone size={16} aria-hidden={true} strokeWidth={2} />
                </span>
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
        {/* Phase 1: Compact Delay Information (merged with reason) */}
        {renderCompactDelayInfo()}

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

        {/* Phase A: Customer Engagement Section with Header + Tooltip */}
        {alert.notificationStatus && (
          <>
            <div className={styles.engagementHeader}>
              <h4 className={styles.engagementTitle}>
                Customer Engagement
                <InfoTooltip text="Track if customers opened and engaged with your delay notification emails. Higher engagement = better customer communication." />
              </h4>
            </div>
            {/* Phase 1: Compact Notification Status */}
            {renderNotificationStatusCompact()}
            {/* Phase A: Badge Legend (collapsible) */}
            {renderBadgeLegend()}
          </>
        )}

        {/* Phase 1.2: Product Information */}
        {renderProductDetails()}

        {/* Priority 3: Suggested Actions */}
        {renderSuggestedActions()}

        {/* Priority 3: Tracking Timeline */}
        {renderTrackingTimeline()}
      </div>

      {/* v1.30: Alert State Transition Actions - Option 1 (Full Flexibility) */}
      {variant === 'active' && (
        <div className={styles.actions}>
          <div className={styles.actionWithTooltip}>
            <Button
              variant="success"
              size="sm"
              onClick={() => onAction(alert.id, 'resolve')}
            >
              Mark Resolved
            </Button>
            <InfoTooltip text="Mark this alert as handled. Use this when you've taken action (contacted customer, issued refund, etc.) and the issue is no longer active." />
          </div>
          <div className={styles.actionWithTooltip}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAction(alert.id, 'dismiss')}
            >
              Dismiss
            </Button>
            <InfoTooltip text="Dismiss this alert if it's a false positive or doesn't require action. Dismissed alerts can be reopened later if needed." />
          </div>
        </div>
      )}

      {variant === 'resolved' && (
        <div className={styles.actions}>
          <div className={styles.actionWithTooltip}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAction(alert.id, 'reopen')}
            >
              Reopen
            </Button>
            <InfoTooltip text="Reopen this alert to move it back to Active status. Use this if the issue has resurfaced or requires additional follow-up." />
          </div>
          <div className={styles.actionWithTooltip}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAction(alert.id, 'dismiss')}
            >
              Dismiss
            </Button>
            <InfoTooltip text="Move this resolved alert to Dismissed status. Use this to archive alerts that no longer need to appear in the resolved list." />
          </div>
        </div>
      )}

      {variant === 'dismissed' && (
        <div className={styles.actions}>
          <div className={styles.actionWithTooltip}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAction(alert.id, 'reopen')}
            >
              Reopen
            </Button>
            <InfoTooltip text="Reopen this alert to move it back to Active status. Use this if you dismissed it by mistake or the issue needs attention." />
          </div>
          <div className={styles.actionWithTooltip}>
            <Button
              variant="success"
              size="sm"
              onClick={() => onAction(alert.id, 'resolve')}
            >
              Mark Resolved
            </Button>
            <InfoTooltip text="Mark this alert as resolved instead of dismissed. Use this if you've now taken action and want to track it as handled rather than archived." />
          </div>
        </div>
      )}
    </div>
  );
}

AlertCard.displayName = 'AlertCard';
