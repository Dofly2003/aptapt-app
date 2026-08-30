import { chromium } from 'playwright';

const ctx = await chromium.launchPersistentContext(
  'C:/Users/donia/.playwright-session',
  { headless: false, slowMo: 300, viewport: { width: 1280, height: 900 } }
);
const page = ctx.pages()[0] || await ctx.newPage();

// Tangkap console errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error' || (msg.type() === 'warning' && msg.text().includes('react-to-print'))) {
    errors.push(msg.text().slice(0, 120));
  }
});

try {
  console.log('Membuka laporan A.3...');
  await page.goto('http://localhost:5173/laporan/S65PlIcarqBxoe9soP2A?section=A.3',
    { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'ss-before-click.png', fullPage: false });
  console.log('Screenshot sebelum klik saved');

  // Klik tombol Download PDF
  const btn = page.locator('button:has-text("Download PDF")');
  const btnCount = await btn.count();
  console.log('Tombol Download PDF ditemukan:', btnCount);

  if (btnCount > 0) {
    // Tangkap dialog print jika muncul
    let printDialogOpened = false;
    page.on('dialog', async d => {
      printDialogOpened = true;
      await d.dismiss();
    });

    await btn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'ss-after-click.png', fullPage: false });
    console.log('Screenshot setelah klik saved');
  }

  if (errors.length > 0) {
    console.log('\nErrors di console:');
    errors.forEach(e => console.log(' -', e));
  } else {
    console.log('\nTidak ada error di console!');
  }

} catch(e) {
  console.error('Error:', e.message);
}

await page.waitForTimeout(20000).catch(() => {});
await ctx.close().catch(() => {});
