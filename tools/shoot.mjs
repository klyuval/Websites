// Screenshot a mirrored site for review: walks the page top to bottom (so scroll-driven scenes and lazy assets load),
// saving a viewport shot at each step, and reports console errors and failed requests.
//   node tools/shoot.mjs <url> <outDir> [desktop|mobile] [steps]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const [,, url, out, mode = 'desktop', stepsArg] = process.argv;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(mode === 'mobile' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const log = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(`console.${m.type()}: ${m.text().slice(0, 300)}`); });
page.on('pageerror', e => log.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on('requestfailed', r => log.push(`failed: ${r.url().slice(0, 200)} ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) log.push(`${r.status()}: ${r.url().slice(0, 200)}`); });
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => log.push('goto: ' + e.message));
for (const ms of [150, 600, 1500]) { await page.waitForTimeout(ms - (Date.now() - t0) > 0 ? ms - (Date.now() - t0) : 0); await page.screenshot({ path: `${out}/${mode}-load-${ms}.png` }); }
await page.waitForTimeout(2500);
const H = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0));
const vh = page.viewportSize().height;
const steps = +stepsArg || Math.min(24, Math.max(4, Math.ceil(H / vh)));
for (let i = 0; i <= steps; i++) {
  const y = Math.round((H - vh) * i / steps);
  await page.mouse.wheel(0, 0); await page.evaluate(y => window.scrollTo(0, y), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${mode}-${String(i).padStart(2, '0')}.png` });
}
fs.writeFileSync(`${out}/${mode}-log.txt`, `height=${H}\n` + [...new Set(log)].join('\n'));
console.log(`${url} ${mode}: height ${H}, ${steps + 1} shots, ${new Set(log).size} log lines`);
await browser.close();
