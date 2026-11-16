// Renders the PNG versions of the logo into assets/logo/ with the site's Inter font.
// Usage: npx tsx scripts/render-logos.ts   (needs Chrome installed, like the e2e scripts)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const out = join('assets', 'logo');
const font = readFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2').toString('base64');
const mark = readFileSync(join(out, 'croptimizing-mark.svg'), 'utf8').replace(/width="512" height="512"/, 'width="100%" height="100%"');
const icon = readFileSync(join(out, 'croptimizing-icon.svg'), 'utf8').replace(/width="512" height="512"/, 'width="100%" height="100%"');

const page = (body: string, bg: string) => `<!doctype html><html><head><style>
@font-face { font-family: Inter; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
html, body { margin: 0; background: ${bg}; }
.wrap { display: inline-flex; align-items: center; gap: 28px; padding: 56px 72px; font-family: Inter, sans-serif; font-weight: 600; font-size: 104px; letter-spacing: -0.02em; }
.wrap .m { width: 120px; height: 120px; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const p = await ctx.newPage();
const shoot = async (html: string, file: string, size?: { w: number; h: number }, transparent = false) => {
  if (size) await p.setViewportSize({ width: size.w, height: size.h });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  const el = size ? p.locator('body') : p.locator('.wrap');
  await el.screenshot({ path: join(out, file), omitBackground: transparent });
  console.log('wrote', file);
};

await shoot(page(`<div style="width:512px;height:512px">${mark}</div>`, 'transparent'), 'croptimizing-mark-512.png', { w: 512, h: 512 }, true);
await shoot(page(`<div style="width:512px;height:512px">${icon}</div>`, 'transparent'), 'croptimizing-icon-512.png', { w: 512, h: 512 }, true);
await p.setViewportSize({ width: 1400, height: 400 });
await shoot(page(`<div class="wrap" style="color:#0B3D91;background:#FFFFFF"><div class="m">${mark}</div>Croptimizing</div>`, '#FFFFFF'), 'croptimizing-logo-on-light.png');
await shoot(page(`<div class="wrap" style="color:#FFFFFF;background:#0B3D91"><div class="m">${mark}</div>Croptimizing</div>`, '#0B3D91'), 'croptimizing-logo-on-dark.png');
await shoot(page(`<div class="wrap" style="color:#0B3D91"><div class="m">${mark}</div>Croptimizing</div>`, 'transparent'), 'croptimizing-logo-transparent.png', undefined, true);
await browser.close();
