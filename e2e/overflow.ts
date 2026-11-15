// Checks every route at phone (375) and laptop (1280) widths for horizontal page
// overflow, and lists the widest elements that stick out past the viewport.
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173';
const routes = ['/', '/plan', '/plan?goal=soil', '/tradeoffs', '/tradeoffs?view=soil', '/compare', '/why', '/stress', '/report', '/method', '/about'];
const browser = await chromium.launch({ channel: 'chrome' });
let bad = 0;
for (const width of [375, 1280]) {
  for (const lang of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const r of routes) {
      await page.goto(`${base}${r}${r.includes('?') ? '&' : '?'}lang=${lang}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const res = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const over = document.documentElement.scrollWidth - vw;
        const out: string[] = [];
        if (over > 1) {
          for (const el of Array.from(document.querySelectorAll('body *'))) {
            const b = el.getBoundingClientRect();
            // Skip things inside a scrolling container (tables meant to scroll sideways).
            let p = el.parentElement;
            let scrolls = false;
            while (p) {
              const s = getComputedStyle(p).overflowX;
              if (s === 'auto' || s === 'scroll' || s === 'hidden') scrolls = true;
              p = p.parentElement;
            }
            if (!scrolls && b.right > vw + 1 && b.width > 0) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(b.right)}`);
          }
        }
        return { over, out: out.slice(0, 6) };
      });
      if (res.over > 1) {
        bad++;
        console.log(`[${width} ${lang}] ${r} overflows by ${res.over}px`);
        for (const o of res.out) console.log(`    ${o}`);
      }
    }
    await context.close();
  }
}
await browser.close();
console.log(bad === 0 ? 'overflow: none at 375 or 1280' : `overflow: ${bad} page(s)`);
