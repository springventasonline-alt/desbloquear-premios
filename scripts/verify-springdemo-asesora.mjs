#!/usr/bin/env node
import { chromium } from 'playwright';
const URL = 'https://springdemo.mitiendanube.com/product/example';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const requests = [];
  page.on('request', (req) => {
    const u = req.url();
    if (/asesora|railway|apps-scripts|desbloquear|widget\.js/i.test(u)) requests.push(u);
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.mouse.click(400, 400);
  await page.waitForTimeout(3000);
  const buttonCount = await page.locator('#asesora-moda-trigger, button:has-text("Encontrá tu look")').count();
  const buttonText = await page.evaluate(() => document.getElementById('asesora-moda-trigger')?.textContent || null);
  console.log(JSON.stringify({ button_count: buttonCount, button_text: buttonText, requests }, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
