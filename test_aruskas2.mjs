import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'E:/tmp_ss/01_login.png' });
console.log('01: login page');

// Login
await page.fill('input[type="text"], input[placeholder*="email"], input[placeholder*="username"]', 'doniananda611@gmail.com');
await page.screenshot({ path: 'E:/tmp_ss/02_filled_email.png' });
console.log('02: email filled');

await browser.close();
