/**
 * Enhanced StatsCards Component
 * World-class statistics cards with micro-interactions and modern design
 * @version 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { StatsData } from '../../../types';
import styles from './StatsCards.enhanced.module.css';

interface StatsCardsProps {
  stats: StatsData;
}

// Icons as inline SVGs (lightweight, no external dependencies)
const TotalAlertsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ActiveAlertsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ResolvedAlertsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AvgResolutionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const iconVariants = {
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

const valueVariants = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const statsData = [
    {
      id: 'total',
      title: 'Total Alerts',
      value: stats.totalAlerts,
      icon: <TotalAlertsIcon />,
      color: 'primary',
      bgGradient: 'var(--dg-primary-50)',
    },
    {
      id: 'active',
      title: 'Active Alerts',
      value: stats.activeAlerts,
      icon: <ActiveAlertsIcon />,
      color: 'warning',
      bgGradient: 'var(--dg-warning-50)',
    },
    {
      id: 'resolved',
      title: 'Resolved Alerts',
      value: stats.resolvedAlerts,
      icon: <ResolvedAlertsIcon />,
      color: 'success',
      bgGradient: 'var(--dg-success-50)',
    },
    {
      id: 'avgResolution',
      title: 'Avg Resolution',
      value: stats.avgResolutionTime,
      icon: <AvgResolutionIcon />,
      color: 'info',
      bgGradient: 'var(--dg-info-50)',
    },
  ];

  return (
    <div className={styles.statsGrid}>
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.id}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -4 }}
          className={`${styles.statCard} ${styles[`statCard--${stat.color}`]}`}
        >
          <div className={styles.statHeader}>
            <motion.div
              className={styles.iconWrapper}
              variants={iconVariants}
              whileHover="hover"
            >
              {stat.icon}
            </motion.div>
            <div className={styles.titleWrapper}>
              <h3 className={styles.statTitle}>{stat.title}</h3>
            </div>
          </div>
          
          <motion.div
            className={styles.statValue}
            variants={valueVariants}
            whileHover="hover"
          >
            {stat.value}
          </motion.div>
          
          {/* Subtle background decoration */}
          <div className={styles.statDecoration} style={{ background: stat.bgGradient }} />
        </motion.div>
      ))}
    </div>
  );
};

StatsCards.displayName = 'StatsCards';
