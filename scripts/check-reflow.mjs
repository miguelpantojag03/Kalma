// Reflujo (WCAG 1.4.10): recorre rutas a 320 px y reporta scroll horizontal o elementos que se salen.
// Uso (con `npx expo start` corriendo): npm i --no-save puppeteer-core && node scripts/check-reflow.mjs
// Chrome: CHROME_PATH o la ruta por defecto de Windows.
import puppeteer from 'puppeteer-core';
const ROUTES = ['/', '/calendario', '/patrones', '/perfil', '/registro', '/checkin', '/reporte', '/experimentos', '/experimentos/nuevo', '/volvi-del-medico', '/visitas', '/ajustes/salud', '/ajustes/recordatorios', '/ajustes/privacidad', '/emergencia', '/design-system'];
const routes = process.argv.length > 2 ? process.argv.slice(2) : ROUTES;
let failed = 0;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 320, height: 640, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:8081/', { waitUntil: 'networkidle0', timeout: 120000 }); await wait(2000);
const el = await page.waitForSelector('::-p-text(Explorar con datos de ejemplo)'); await el.click(); await wait(3000);
for (const r of routes) {
  await page.goto('http://localhost:8081' + r, { waitUntil: 'networkidle0', timeout: 120000 }); await wait(1500);
  const res = await page.evaluate(() => {
    const W = window.innerWidth; const bad = [];
    for (const n of document.querySelectorAll('div,span,button,input')) {
      const b = n.getBoundingClientRect();
      if (b.width > 0 && b.right > W + 1 && getComputedStyle(n).visibility !== 'hidden') {
        // ignora contenedores con scroll horizontal intencional
        let p = n.parentElement, scrollable = false;
        while (p) { const s = getComputedStyle(p); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && p.scrollWidth > p.clientWidth) { scrollable = true; break; } p = p.parentElement; }
        if (!scrollable) bad.push((n.innerText || n.getAttribute('aria-label') || n.tagName).slice(0, 40).replace(/\n/g, ' ') + ' →' + Math.round(b.right));
      }
    }
    return { docScroll: document.documentElement.scrollWidth > W, bad: [...new Set(bad)].slice(0, 4) };
  });
  if (res.docScroll || res.bad.length) failed++;
  console.log(r, res.docScroll ? 'SCROLL-H' : res.bad.length ? 'SE SALE' : 'ok', res.bad.join(' | '));
}
await browser.close();
process.exit(failed ? 1 : 0);
