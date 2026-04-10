export const colors = {
  // Brand
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryBg: '#EFF6FF',

  // Semantic states
  success: '#22C55E',
  successBg: '#DCFCE7',
  successText: '#15803D',

  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningText: '#92400E',

  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  dangerText: '#B91C1C',

  info: '#6366F1',
  infoBg: '#EEF2FF',
  infoText: '#4338CA',

  // Neutrals
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral800: '#1F2937',
  neutral900: '#111827',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Background
  background: '#F4F6FA',
} as const;

export type ColorKey = keyof typeof colors;
