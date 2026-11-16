// Draws the favicon set into public/ from assets/logo/croptimizing-icon.svg:
// favicon.ico (16, 32, 48), PNGs at 48/96/192/512 (Google wants multiples of 48),
// and apple-touch-icon.png (180, no transparency).
// Usage: npx tsx scripts/make-favicons.ts   (needs Chrome installed, like the e2e scripts)
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const svg = readFileSync(join('assets', 'logo', 'croptimizing-icon.svg'), 'utf8').replace(/width="512" height="512"/, 'width="100%" height="100%"');
// Apple touch icons get no rounded corners or transparency: fill the square with navy.
const square = svg.replace('<rect width="32" height="32" rx="8" fill="#0B3D91"/>', '<rect width="32" height="32" fill="#0B3D91"/>');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
async function png(size: number, src = svg): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${src}</div></body></html>`);
  return page.locator('div').screenshot({ omitBackground: true });
}

const out = 'public';
for (const s of [48, 96, 192, 512]) {
  writeFileSync(join(out, `favicon-${s}.png`), await png(s));
  console.log(`wrote favicon-${s}.png`);
}
writeFileSync(join(out, 'apple-touch-icon.png'), await png(180, square));
console.log('wrote apple-touch-icon.png');

// favicon.ico: a small header and directory, then PNG images (supported by every current browser and Google).
const sizes = [16, 32, 48];
// One at a time: they share one page.
const images: Buffer[] = [];
for (const s of sizes) images.push(await png(s));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
const dir = Buffer.alloc(16 * sizes.length);
let offset = 6 + dir.length;
sizes.forEach((s, i) => {
  const o = i * 16;
  dir.writeUInt8(s, o);
  dir.writeUInt8(s, o + 1);
  dir.writeUInt8(0, o + 2);
  dir.writeUInt8(0, o + 3);
  dir.writeUInt16LE(1, o + 4);
  dir.writeUInt16LE(32, o + 6);
  dir.writeUInt32LE(images[i].length, o + 8);
  dir.writeUInt32LE(offset, o + 12);
  offset += images[i].length;
});
writeFileSync(join(out, 'favicon.ico'), Buffer.concat([header, dir, ...images]));
console.log('wrote favicon.ico');
await browser.close();
