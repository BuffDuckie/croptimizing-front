// Screenshots of every route at phone and desktop widths, using the installed Chrome.
// Usage: npx tsx e2e/shots.ts [baseUrl] [outDir] [routes...]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'shots';
const routes = process.argv.slice(4).length ? process.argv.slice(4) : ['/', '/plan', '/tradeoffs', '/compare', '/why', '/stress', '/report', '/method'];
const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 375, height: 812 },
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const s of sizes) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, reducedMotion: 'reduce' });
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const name = r === '/' ? 'start' : r.slice(1);
    await page.screenshot({ path: `${out}/${name}-${s.name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`${name}-${s.name}${overflow > 0 ? `  OVERFLOW ${overflow}px` : ''}`);
  }
  await page.close();
}
await browser.close();
