const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8782/ad.html'); await p.evaluate(() => window.ready);
  for (let f = 0; f < 1500; f++) {
    await p.evaluate((t) => window.render(t), f / 60);
    await p.screenshot({ path: `frames/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  console.log('frames done', errs); await b.close();
})();
