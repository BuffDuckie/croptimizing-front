/**
 * Single source of truth for brand colors. tailwind.config.ts imports this file,
 * and SVG charts read from it, so no component ever hard-codes a hex value.
 */
export const colors = {
  primary: '#0B3D91',
  'primary-deep': '#072A66',
  'primary-ink': '#051E4A',
  secondary: '#2E7D32',
  accent: '#00C2FF',
  'accent-strong': '#0077A8',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  'text-muted': '#475569',
  border: '#CBD5E1',
  'border-soft': '#E2E8F0',
  warning: '#B45309',
  danger: '#B91C1C',
  'primary-tint': '#E8EEF8',
  'secondary-tint': '#E8F5E9',
  'accent-tint': '#E0F7FF',
  'warning-tint': '#FEF3E2',
  'danger-tint': '#FDECEC',
  /** Danger on dark (navy) backgrounds only. */
  'danger-bright': '#FCA5A5',
  /** Field soil tone for the hero map on navy. */
  'field-soil': '#163E7A',
} as const;

export const rotationColors = {
  alfalfa: '#00805C',
  cotton_barley: '#0072B2',
  durum_sorghum: '#D55E00',
  barley_fallow: '#A8578A',
  fallow: '#64748B',
} as const;

export type ColorToken = keyof typeof colors;
