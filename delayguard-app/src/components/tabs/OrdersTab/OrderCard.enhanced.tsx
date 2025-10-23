// Enhanced OrderCard with world-class UI and micro-interactions
import React from 'react';
import { motion } from 'framer-motion';
import { Order } from '../../../types';
import styles from './OrderCard.enhanced.module.css';

interface OrderCardProps {
  order: Order;
  onAction: (orderId: string, action: 'track' | 'view') => void;
  variant: 'processing' | 'shipped' | 'delivered';
}

// SVG Icons
const PackageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const TruckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const getVariantIcon = (variant: string) => {
  switch (variant) {
    case 'delivered':
      return <CheckCircleIcon />;
    case 'shipped':
      return <TruckIcon />;
    default:
      return <PackageIcon />;
  }
};

const getStatusColor = (status: string): 'success' | 'info' | 'warning' => {
  if (status === 'delivered') return 'success';
  if (status === 'shipped') return 'info';
  return 'warning';
};

export function OrderCard({ order, onAction, variant }: OrderCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const statusColor = getStatusColor(order.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: 'var(--dg-shadow-2xl)' }}
      transition={{ duration: 0.2 }}
      className={`${styles.orderCard} ${styles[`variant-${variant}`]}`}
    >
      {/* Header with Icon and Status */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          {getVariantIcon(variant)}
        </div>
        <div className={styles.headerContent}>
          <div className={styles.orderNumber}>#{order.orderNumber}</div>
          <span className={`${styles.statusBadge} ${styles[`status-${statusColor}`]}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className={styles.customerSection}>
        <div className={styles.customerName}>
          <UserIcon />
          <span>{order.customerName}</span>
        </div>
        {order.customerEmail && (
          <div className={styles.customerEmail}>
            <MailIcon />
            <span>{order.customerEmail}</span>
          </div>
        )}
      </div>

      {/* Order Details Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <div className={styles.detailIcon}>
            <CalendarIcon />
          </div>
          <div className={styles.detailContent}>
            <span className={styles.detailLabel}>Created</span>
            <span className={styles.detailValue}>{formatDate(order.createdAt)}</span>
          </div>
        </div>

        {order.totalAmount && (
          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <DollarIcon />
            </div>
            <div className={styles.detailContent}>
              <span className={styles.detailLabel}>Total</span>
              <span className={styles.detailValue}>
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tracking Info (if available) */}
      {order.trackingNumber && (
        <div className={styles.trackingSection}>
          <div className={styles.trackingIcon}>
            <TruckIcon />
          </div>
          <div className={styles.trackingContent}>
            <span className={styles.trackingLabel}>Tracking Number</span>
            <div className={styles.trackingNumber}>
              <span>{order.trackingNumber}</span>
              {order.carrierCode && (
                <span className={styles.carrierBadge}>{order.carrierCode}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {order.trackingNumber && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={styles.trackButton}
            onClick={() => onAction(order.id, 'track')}
          >
            <TruckIcon />
            Track Package
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={styles.viewButton}
          onClick={() => onAction(order.id, 'view')}
        >
          <ExternalLinkIcon />
          View Details
        </motion.button>
      </div>

      {/* Decorative Element */}
      <div className={styles.decoration} />
    </motion.div>
  );
}

OrderCard.displayName = 'OrderCard';
