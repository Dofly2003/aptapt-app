import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 400 });
const page = await browser.newPage();

// Go to login page
await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'E:/tmp_ss/01_login.png', fullPage: true });
console.log('Screenshot: login page');

await browser.close();
