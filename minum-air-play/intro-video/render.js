const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8781/meowie.html'); await p.evaluate(() => window.ready);
  for (let f = 0; f < 900; f++) {
    await p.evaluate((t) => window.render(t), f / 60);
    await p.screenshot({ path: `frames/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 });
  }
  console.log('frames done', errs); await b.close();
})();
