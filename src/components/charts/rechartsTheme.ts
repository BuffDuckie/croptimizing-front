import { colors } from '../../theme/tokens';

/** Shared Recharts styling so every chart matches the design system. */
export const axisTick = { fill: colors['text-muted'], fontSize: 14 };
export const axisLine = { stroke: colors.border };
export const gridStroke = colors['border-soft'];
export const tooltipStyle = {
  contentStyle: {
    background: colors.surface,
    border: `1px solid ${colors['border-soft']}`,
    borderRadius: 12,
    boxShadow: '0 12px 32px -8px rgba(15,23,42,0.16)',
    fontSize: 14,
    color: colors.text,
    padding: '10px 12px',
  },
  labelStyle: { fontWeight: 600, color: colors.primary, marginBottom: 4 },
  itemStyle: { padding: 0 },
  cursor: { fill: colors['primary-tint'], opacity: 0.5 },
};
