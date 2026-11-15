import type { Config } from 'tailwindcss';
import { colors, rotationColors } from './src/theme/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        rot: rotationColors,
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // 14 px is the floor. Nothing smaller exists in this scale.
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.125rem', { lineHeight: '1.65rem' }],
        xl: ['1.25rem', { lineHeight: '1.7rem', letterSpacing: '-0.005em' }],
        '2xl': ['1.5rem', { lineHeight: '1.9rem', letterSpacing: '-0.012em' }],
        '3xl': ['1.875rem', { lineHeight: '2.2rem', letterSpacing: '-0.016em' }],
        metric: ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '3.1rem', letterSpacing: '-0.025em' }],
        '6xl': ['3.75rem', { lineHeight: '3.9rem', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        card: '12px',
        ctl: '8px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
        lift: '0 2px 4px rgba(15, 23, 42, 0.05), 0 12px 32px -8px rgba(15, 23, 42, 0.16)',
      },
      maxWidth: {
        content: '1200px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      ringWidth: {
        focus: '3px',
      },
    },
  },
  plugins: [],
} satisfies Config;
