import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// ── 1. Login page ──────────────────────────────────────────────────────
await page.goto('http://localhost:5173/login');
await page.screenshot({ path: 'C:/Users/donia/AppData/Local/Temp/ss01-login.png' });
console.log('SS1: login page loaded');
await browser.close();
