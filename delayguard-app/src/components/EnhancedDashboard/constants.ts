// Constants for EnhancedDashboard component
export const DASHBOARD_CONFIG = {
  GRID_COLUMNS: 'repeat(auto-fit, minmax(200px, 1fr))',
  GRID_GAP: '16px',
  MARGIN_BOTTOM: '24px',
  PADDING: '24px',
  MAX_WIDTH: '1200px',
} as const;

export const TAB_IDS = ['alerts', 'orders', 'analytics'] as const;

export const DEFAULT_SETTINGS = {
  delayThresholdDays: 3,
  emailEnabled: true,
  smsEnabled: false,
  notificationTemplate: 'Your order #{{orderNumber}} is experiencing a delay. We apologize for the inconvenience.',
  autoResolveDays: 7,
  enableAnalytics: true,
} as const;

export const TOAST_STYLES = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  background: 'var(--delayguard-primary)',
  color: 'white',
  padding: '12px 16px',
  borderRadius: '4px',
  zIndex: 1000,
} as const;

export const TOAST_BUTTON_STYLES = {
  marginLeft: '8px',
  background: 'none',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
} as const;
