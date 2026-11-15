// Runs axe-core (WCAG 2.2 AA rules) on every route at desktop and phone widths.
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173';
const routes = ['/', '/plan', '/tradeoffs', '/compare', '/why', '/stress', '/report', '/method', '/about', '/plan?s=70'];
const browser = await chromium.launch({ channel: 'chrome' });
let serious = 0;
for (const width of [1440, 375]) {
  for (const lang of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const r of routes) {
      await page.goto(`${base}${r}?lang=${lang}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      for (const v of res.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') serious++;
        console.log(`[${width} ${lang}] ${r} ${v.impact} ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1] ?? ''}`);
      }
    }
    await context.close();
  }
}
await browser.close();
console.log(serious === 0 ? 'axe: no serious or critical issues' : `axe: ${serious} serious/critical issue groups`);
