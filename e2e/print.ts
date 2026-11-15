// Prints /report to PDF in English and Spanish and reports the page count.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ channel: 'chrome' });
for (const lang of ['en', 'es']) {
  const page = await browser.newPage();
  await page.goto(`${base}/report?w=2.4&r=40&s=30&lang=${lang}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const path = `${out}/report-${lang}.pdf`;
  await page.pdf({ path, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  const pages = (readFileSync(path, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`report-${lang}.pdf: ${pages} page(s)`);
  await page.close();
}
await browser.close();
