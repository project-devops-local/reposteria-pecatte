// Pruebas responsive de la landing Pecatté con Playwright (librería) + Google Chrome
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const SHOTS = process.argv[2]; if (SHOTS) (await import("node:fs")).mkdirSync(SHOTS, { recursive: true });
const URL = process.env.SITE_URL || 'http://localhost:8000/';
const screens = [
  ['movil-320', 320, 568, 2, true], ['movil-375', 375, 667, 2, true], ['movil-390', 390, 844, 3, true],
  ['movil-412', 412, 915, 2.6, true], ['movil-430', 430, 932, 3, true],
  ['tablet-768', 768, 1024, 2, true], ['tablet-820', 820, 1180, 2, true], ['tablet-1024', 1024, 1366, 2, true],
  ['laptop-1280', 1280, 800, 1, false], ['pc-1440', 1440, 900, 1, false], ['pc-1920', 1920, 1080, 1, false],
  ['pantalla-2560', 2560, 1440, 1, false], ['pantalla-3840', 3840, 2160, 1, false],
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const tests = {
  async 'sin errores y sin desborde'(page, ctx) {
    await page.evaluate(() => document.querySelectorAll('.reveal, #anatomy').forEach(e => e.classList.add('in')));
    await sleep(1600);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth, bad = [];
      document.querySelectorAll('.wrap *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || el.closest('.badge, .marquee, .mobile-menu')) return;
        // Si un contenedor con overflow recortado (dentro de pantalla) lo contiene, no se ve fuera
        let clip = el.parentElement;
        while (clip && clip !== document.body && getComputedStyle(clip).overflowX === 'visible') clip = clip.parentElement;
        if (clip && clip !== document.body) { const cb = clip.getBoundingClientRect(); if (cb.left >= -1 && cb.right <= vw + 1) return; }
        const b = el.getBoundingClientRect();
        if (b.width && (b.left < -1 || b.right > vw + 1)) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(b.left)}→${Math.round(b.right)}]`);
      });
      return { vw, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 6) };
    });
    assert.ok(r.sw <= r.vw, `ancho ${r.sw} > ${r.vw}`);
    assert.deepEqual(r.bad, [], 'fuera de pantalla: ' + r.bad.join(' | '));
    assert.deepEqual(ctx.errors, [], 'errores de consola');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${ctx.name}.png`, fullPage: true });
  },
  async 'menú se adapta'(page, ctx) {
    const burger = page.locator('#burger'), links = page.locator('.nav ul');
    if (ctx.w <= 860) {
      assert.ok(await burger.isVisible(), 'hamburguesa visible'); assert.ok(await links.isHidden(), 'links ocultos');
      await burger.click(); await sleep(900);
      assert.equal(await burger.getAttribute('aria-expanded'), 'true');
      assert.match(await page.locator('#mobileMenu .mm-wa').getAttribute('href'), /wa\.me\/573203703184/);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${ctx.name}-menu.png` });
      await page.locator('#mobileMenu a[href="#menu"]').click(); await sleep(1300);
      assert.equal(await burger.getAttribute('aria-expanded'), 'false', 'se cierra al elegir');
      const top = await page.locator('#menu').evaluate(e => e.getBoundingClientRect().top);
      assert.ok(Math.abs(top) < 80, `navega a #menu (top ${top})`);
      await burger.click(); await page.keyboard.press('Escape');
      assert.equal(await burger.getAttribute('aria-expanded'), 'false', 'Escape cierra');
    } else {
      assert.ok(await links.isVisible(), 'links visibles'); assert.ok(await burger.isHidden(), 'sin hamburguesa');
      await page.locator('.nav ul a[href="#pedidos"]').click(); await sleep(1500);
      assert.match(await page.locator('.nav ul a[href="#pedidos"]').getAttribute('class') ?? '', /current/, 'enlace activo');
    }
    const brand = await page.locator('.brand').boundingBox(), act = await page.locator('.nav-actions').boundingBox();
    assert.ok(brand.x + brand.width < act.x, 'logo y botones no se pisan');
  },
  async 'tarjetas alineadas'(page, ctx) {
    await page.locator('#menu .cards').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))); await sleep(1200);
    const cards = await page.locator('.card').evaluateAll(cs => cs.map(c => { const b = c.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), l: b.left, r: b.right }; }));
    const rows = {};
    cards.forEach(c => { assert.ok(c.l >= 0 && c.r <= ctx.w, 'tarjeta dentro de pantalla'); (rows[c.top] ??= []).push(c.h); });
    for (const hs of Object.values(rows)) assert.ok(Math.max(...hs) - Math.min(...hs) <= 2, `altos distintos ${hs}`);
    ctx.cols = Math.max(...Object.values(rows).map(r => r.length));
    await page.locator('.card img').evaluateAll(imgs => Promise.all(imgs.map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); })));
    assert.ok(await page.locator('.card img').evaluateAll(imgs => imgs.length === 6 && imgs.every(i => i.naturalWidth > 0)), '6 imágenes cargadas');
    assert.equal(await page.locator('.angle').count(), 0, 'sin botón "Otro ángulo"');
  },
  async 'pedido por WhatsApp'(page) {
    await page.locator('#pedidos').scrollIntoViewIfNeeded();
    const plus = page.locator('.pick .qty button[data-d="1"]');
    await plus.nth(0).click(); await plus.nth(0).click(); await plus.nth(2).click();
    await page.locator('.when label', { hasText: 'Hoy' }).click();
    await page.fill('#note', 'sin kiwi');
    assert.equal(await page.locator('#total').textContent(), '3');
    const href = decodeURIComponent(await page.locator('.wa-btn.js-wa').getAttribute('href'));
    for (const s of ['wa.me/573203703184', '2 × Pecado Tropical', '1 × Pecado de Galleta', 'Para: Hoy', 'Nota: sin kiwi']) assert.ok(href.includes(s), `falta "${s}"`);
    assert.equal(await page.locator('#waTel').textContent(), '+57 320 370 3184');
  },
  async 'video en bucle'(page) {
    const v = await page.locator('#heroVideo').evaluate(async v => { await new Promise(r => setTimeout(r, 1500)); return { loop: v.loop, muted: v.muted, t: v.currentTime, w: v.videoWidth }; });
    assert.ok(v.loop && v.muted && v.w > 0 && v.t > 0, JSON.stringify(v));
  },
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let fails = 0; const summary = [];
for (const [name, w, h, dpr, mobile] of screens.filter(s => !process.argv[3] || s[0] === process.argv[3])) {
  const row = { pantalla: `${name} (${w}×${h})` };
  for (const [tname, fn] of Object.entries(tests)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage(); const c = { name, w, errors: [] };
    page.on('pageerror', e => c.errors.push(e.message)); page.on('console', m => m.type() === 'error' && c.errors.push(m.text()));
    try {
      await page.goto(URL, { waitUntil: 'load' }); await sleep(500);
      await Promise.race([fn(page, c), sleep(60000).then(() => { throw new Error('timeout'); })]);
      row[tname] = 'OK' + (c.cols ? ` (${c.cols} col)` : '');
    } catch (e) { fails++; row[tname] = 'FALLA'; console.log(`✗ ${name} · ${tname}: ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  summary.push(row); console.log(`· ${name} listo`);
}
await browser.close();
console.table(summary);
console.log(fails ? `${fails} pruebas fallaron` : 'Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
