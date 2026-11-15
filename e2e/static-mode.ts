// Checks static mode: loads /plan with VITE_DATA_MODE=static and confirms the
// app fetched a /results file and shows a plan, then checks an infeasible point.
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:5174';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const fetched: string[] = [];
page.on('response', (r) => r.url().includes('/results/') && fetched.push(`${r.status()} ${new URL(r.url()).pathname}`));
await page.goto(`${base}/plan?w=2.4&r=40&s=30&lang=en`, { waitUntil: 'networkidle' });
await page.getByText('Average year profit').first().waitFor({ timeout: 10000 });
console.log('fetched:', fetched.join(' | '));
console.log('fallback banner shown:', await page.getByText('could not load the latest results').isVisible());
fetched.length = 0;
await page.goto(`${base}/plan?w=0.6&r=0&s=90&lang=en`, { waitUntil: 'networkidle' });
await page.getByRole('alert').waitFor({ timeout: 10000 });
console.log('infeasible fetched:', fetched.join(' | '));
console.log('alert:', (await page.getByRole('alert').innerText()).split('\n')[0]);
await browser.close();
