// Enhanced AlertsTable with world-class UI and micro-interactions
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DelayAlert } from '../../../types';
import styles from './AlertsTable.enhanced.module.css';

interface AlertsTableProps {
  alerts: DelayAlert[];
  onResolve: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

// SVG Icons
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const getSeverityColor = (severity: string): 'critical' | 'warning' | 'info' => {
  if (severity === 'high' || severity === 'critical') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'info';
};

const getPriorityColor = (priority: string): 'critical' | 'warning' | 'info' => {
  if (priority === 'high') return 'critical';
  if (priority === 'medium') return 'warning';
  return 'info';
};

export const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  onResolve,
  onDismiss,
}) => {
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSelectAlert = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const handleBulkResolve = () => {
    selectedAlerts.forEach(alertId => onResolve(alertId));
    setSelectedAlerts(new Set());
  };

  // Filtering logic
  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = !severityFilter || alert.severity === severityFilter;
    const matchesSearch = !searchTerm || 
      alert.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + itemsPerPage);

  if (alerts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.emptyStateContent}
        >
          <div className={styles.emptyStateIcon}>
            <CheckIcon />
          </div>
          <h3>All Clear!</h3>
          <p>No delay alerts at the moment. Great job!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with Filters */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleGroup}>
            <AlertIcon />
            <h2>Delay Alerts</h2>
            <span className={styles.badge}>{filteredAlerts.length}</span>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {/* Search */}
          <div className={styles.searchBox}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search orders or customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Severity Filter */}
          <select
            className={styles.filter}
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedAlerts.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.bulkActions}
          >
            <span className={styles.bulkCount}>
              {selectedAlerts.size} alert{selectedAlerts.size !== 1 ? 's' : ''} selected
            </span>
            <div className={styles.bulkButtons}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={styles.bulkResolve}
                onClick={handleBulkResolve}
              >
                <CheckIcon />
                Resolve All
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={styles.bulkCancel}
                onClick={() => setSelectedAlerts(new Set())}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts List */}
      <div className={styles.alertsList}>
        <AnimatePresence>
          {paginatedAlerts.map((alert, index) => {
            const severityClass = `severity-${getSeverityColor(alert.severity || 'low')}`;
            const priorityClass = `priority-${getPriorityColor(alert.priority || 'low')}`;
            const statusClass = `status-${alert.status === 'resolved' ? 'success' : 'warning'}`;
            
            return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`${styles.alertCard} ${styles[severityClass]}`}
            >
              {/* Checkbox */}
              <div className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedAlerts.has(alert.id)}
                  onChange={() => handleSelectAlert(alert.id)}
                />
              </div>

              {/* Alert Content */}
              <div className={styles.alertContent}>
                {/* Top Row: Order ID and Customer */}
                <div className={styles.alertHeader}>
                  <div className={styles.orderInfo}>
                    <span className={styles.orderLabel}>Order</span>
                    <span className={styles.orderId}>#{alert.orderId}</span>
                  </div>
                  <div className={styles.customerInfo}>
                    <UserIcon />
                    <span>{alert.customerName}</span>
                  </div>
                </div>

                {/* Middle Row: Delay Info and Badges */}
                <div className={styles.alertDetails}>
                  <div className={styles.delayInfo}>
                    <ClockIcon />
                    <span className={styles.delayDays}>{alert.delayDays} days delayed</span>
                  </div>
                  
                  <div className={styles.badges}>
                    <span className={`${styles.priorityBadge} ${styles[priorityClass]}`}>
                      {alert.priority}
                    </span>
                    <span className={`${styles.statusBadge} ${styles[statusClass]}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.alertActions}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={styles.resolveButton}
                  onClick={() => onResolve(alert.id)}
                  disabled={alert.status === 'resolved'}
                >
                  <CheckIcon />
                  Resolve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={styles.dismissButton}
                  onClick={() => onDismiss(alert.id)}
                >
                  Dismiss
                </motion.button>
              </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length}
          </span>
          <div className={styles.paginationButtons}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              Previous
            </motion.button>
            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={styles.pageButton}
            >
              Next
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
