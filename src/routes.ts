export const NAV = [
  { path: '/', key: 'start' },
  { path: '/plan', key: 'plan' },
  { path: '/tradeoffs', key: 'tradeoffs' },
  { path: '/compare', key: 'compare' },
  { path: '/why', key: 'why' },
  { path: '/stress', key: 'stress' },
  { path: '/report', key: 'report' },
  { path: '/method', key: 'method' },
] as const;

export type NavKey = (typeof NAV)[number]['key'];
