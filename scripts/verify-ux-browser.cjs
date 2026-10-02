// Run: NODE_PATH=<playwright node_modules> AXE_PATH=<axe.min.js> node scripts/verify-ux-browser.cjs <url> <output-dir>
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = process.argv[2] || 'http://127.0.0.1:8901';
const out = process.argv[3] || '/tmp/novin-ux-final';
const report = { base, started: new Date().toISOString(), checks: [], failures: [] };
fs.mkdirSync(out, { recursive: true });
const record = (name, data) => {
  report.checks.push({ name, ...data });
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
};
const inventory = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/cars-data.js'), 'utf8') + ';carsData');
const number = text => Number(text.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^0-9]/g, ''));
async function axe(page, name) {
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const result = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
  }));
  const violations = result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }));
  record(name, { violations, incomplete: result.incomplete.map(v => v.id) });
  assert.equal(violations.length, 0, name + JSON.stringify(violations));
}
async function geometry(page, name) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 35));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await document.fonts.ready;
  });
  const data = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    headerOverflow: (() => { const h = document.querySelector('.header-inner'); return h ? h.scrollWidth - h.clientWidth : 0; })(),
    brokenImages: [...document.images].filter(x => x.getClientRects().length && x.complete && !x.naturalWidth).map(x => x.src),
    direction: getComputedStyle(document.documentElement).direction
  }));
  record(name, data);
  assert.equal(data.overflow, 0, name + ' page overflow');
  assert.ok(data.headerOverflow <= 1, name + ' header overflow');
  assert.deepEqual(data.brokenImages, [], name + ' broken images');
  assert.equal(data.direction, 'rtl');
}
(async () => {
  assert.ok(process.env.AXE_PATH, 'AXE_PATH is required; install axe-core outside the deployed tree');
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch(engine === chromium ? { channel: 'chrome' } : {});
    try {
      for (const width of [320, 390, 768, 1200, 1201, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.tracing.start({ screenshots: true, snapshots: true });
        const page = await context.newPage();
        const errors = [], failedAssets = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400 && /\.(css|js|webp|woff2)(\?|$)/.test(r.url())) failedAssets.push([r.status(), r.url()]); });
        const prefix = engine.name() + '-' + width;
        try {
          const response = await page.goto(base, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          await geometry(page, prefix);
          assert.equal(await page.locator('.car-card-modern').count(), inventory.length);
          for (let i = 0; i < 3; i++) {
            await page.locator('.slider-dot').nth(i).click();
            const slide = page.locator('.slide-item.active');
            const title = await slide.locator('.slide-title').innerText();
            const car = inventory.find(c => c.title === title);
            assert.ok(car, 'Hero title absent from inventory: ' + title);
            assert.equal(number(await slide.locator('.slide-price').innerText()), car.price);
            await slide.locator('.btn-slide-primary').click();
            assert.ok((await page.locator('#modalCarTitle').innerText()).startsWith(car.title));
            assert.equal(await page.evaluate(() => document.activeElement.id), 'modalClose');
            if (i === 1 && width === 390) await axe(page, prefix + '-modal');
            for (let j = 0; j < 12; j++) {
              await page.keyboard.press(j < 6 ? 'Tab' : 'Shift+Tab');
              assert.equal(await page.evaluate(() => document.querySelector('#carModal').contains(document.activeElement)), true, `${prefix} hero ${i} Tab ${j}: focus escaped modal`);
            }
            await page.keyboard.press('Escape');
            assert.equal(await slide.locator('.btn-slide-primary').evaluate(x => x === document.activeElement), true, prefix + ' Escape must restore opener focus');
          }
          const search = page.locator('#searchInput');
          for (const query of ['207', '۲۰۷', '٢٠٧']) {
            await search.fill(query);
            assert.equal(await page.locator('.car-card-modern').count(), 1);
          }
          await search.fill('ناموجودناموجود');
          assert.equal(await page.locator('.car-card-modern').count(), 0);
          await search.fill('');
          assert.equal(await page.locator('.car-card-modern').count(), inventory.length);
          if (width <= 1200) {
            const toggle = page.locator('#mobileToggle');
            await toggle.click();
            await page.waitForFunction(() => getComputedStyle(document.querySelector('#navLinks a')).visibility === 'visible');
            if (width === 390) await axe(page, prefix + '-menu');
            await page.keyboard.press('Escape');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
            assert.equal(await toggle.evaluate(x => x === document.activeElement), true);
          }
          if ([390, 1440].includes(width)) await axe(page, prefix + '-home');
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await page.locator('#slideDot1').click();
          await page.screenshot({ path: path.join(out, prefix + '.png') });
          assert.deepEqual(errors, [], prefix + ' runtime errors');
          assert.deepEqual(failedAssets, [], prefix + ' asset HTTP errors');
          record(prefix + '-journey', { status: 'pass', heroCars: 3, searchVariants: 3, modalTabs: 36, errors, failedAssets });
        } catch (error) { report.failures.push({ name: prefix, error: error.message }); }
        finally {
          await context.tracing.stop({ path: path.join(out, prefix + '.zip') });
          await context.close();
          fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
        }
      }
      // Separate documents: cold contexts, real links, no reliance on home tests.
      for (const route of ['/cars/', '/cars/xtrim-vx.html', '/cars/peugeot-207i.html', '/cars/dena-plus-turbo-automatic-options.html', '/prices.html', '/encyclopedia.html']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const name = engine.name() + route;
        try {
          assert.equal((await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' })).status(), 200);
          await geometry(page, name);
          await axe(page, name + '-axe');
        } catch (error) { report.failures.push({ name, error: error.message }); }
        finally { await context.close(); }
      }
    } finally { await browser.close(); }
  }
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks.length, failures: report.failures, output: out }, null, 2));
  assert.equal(report.failures.length, 0, 'Independent browser audit failed');
})().catch(error => { console.error(error); process.exitCode = 1; });
