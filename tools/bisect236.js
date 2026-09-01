#!/usr/bin/env node
/* 작업 236 이분 자 — 읽기 전용(제품·게이트를 안 고친다).
 *
 *   node tools/bisect236.js <git-rev>        (생략하면 현재 트리)
 *
 * verify107 [I] 만 떼어 낸다(전투 30초·형제 시트 점검표 없음 → 한 판 ~12초).
 * 지정한 rev 의 index.html 을 저장소 루트에 `.b236.html` 로 갈아 끼워 **새로 열어서** 잰다
 * (LESSONS 191 — 살아 있는 페이지에 주입하면 거짓 초록). 끝나면 사본을 지운다.
 * 찍는 값: 격자 max · 손 뗄 때 scrollTop · +900ms · +3900ms · 관성이 멎은 시각.
 * 판정: verify107 [I] 와 같은 식 — round(+900ms) !== round(+3900ms) 이면 RED.
 */
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const rev = process.argv[2] || '';
const COPY = path.join(ROOT, `.b236-${process.pid}.html`);

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {}
  return {};
}

(async () => {
  /* 인자가 .html 파일이면 그 파일을, 아니면 git rev 의 index.html 을 쓴다
     (되돌림 사본에 «옛 두 점 표본» 을 그대로 대 보려고 — 작업 236 review §4) */
  const html = !rev ? fs.readFileSync(path.join(ROOT, 'index.html'))
             : /\.html$/i.test(rev) ? fs.readFileSync(path.resolve(ROOT, rev))
             : (() => {                       /* 756 — 얕은 클론이면 먼저 판다(규약 ①) */
                 const got = require('./gitrev756').show(rev, 'index.html');
                 if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
                 if (got.how) console.log('[i]' + got.how);
                 return got.buf;
               })();
  fs.writeFileSync(COPY, html);
  const br = await chromium.launch(launchOpts());
  let out = null;
  try {
    const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + COPY.replace(/\\/g, '/'));
    await pg.waitForTimeout(2600);
    await pg.evaluate(`gmHero('sk')`);
    await pg.waitForTimeout(800);

    const info = await pg.evaluate(() => {
      const gp = document.querySelector('#bSk .sk-gp');
      if (!gp) return null;
      const r = gp.getBoundingClientRect();
      return { max: gp.scrollHeight - gp.clientHeight, x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
    });
    if (!info) { console.log((rev || 'WORKTREE') + '\tSKIP\t.sk-gp 없음'); return; }

    await pg.evaluate(() => {
      document.querySelector('#bSk .sk-gp').scrollTop = 0;
      window.__tr = [];
      window.__rec = () => {
        const gp = document.querySelector('#bSk .sk-gp');
        window.__tr.push([Math.round(performance.now() - window.__t0),
                          gp ? +gp.scrollTop.toFixed(2) : -1,
                          (typeof dsGlide !== 'undefined' && dsGlide) ? 1 : 0]);
        window.__raf = requestAnimationFrame(window.__rec);
      };
    });
    await pg.mouse.move(info.x, info.y + info.h * 0.35);
    await pg.mouse.down();
    for (let i = 1; i <= 8; i++) { await pg.mouse.move(info.x, info.y + info.h * 0.35 - i * 40); await pg.waitForTimeout(16); }
    await pg.mouse.up();
    await pg.evaluate(() => { window.__t0 = performance.now(); window.__rec(); });
    await pg.waitForTimeout(4000);
    const tr = await pg.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__tr; });
    const at = ms => (tr.find(r => r[0] >= ms) || tr[tr.length - 1]);
    const a900 = at(900), last = tr[tr.length - 1];
    const glideEnd = [...tr].reverse().find(r => r[2] === 1);
    const red = Math.round(a900[1]) !== Math.round(last[1]);
    out = { max: info.max, up: tr[0][1], at900: Math.round(a900[1]), at3900: Math.round(last[1]),
            glideEnd: glideEnd ? glideEnd[0] : -1, red, errs: errs.length };
    console.log((rev || 'WORKTREE') + '\t' + (red ? 'RED ' : 'GREEN') +
      '\tmax ' + out.max + '\tup ' + out.up + '\t900ms ' + out.at900 + '\t3900ms ' + out.at3900 +
      '\tΔ ' + (out.at3900 - out.at900) + '\t관성끝 ' + out.glideEnd + 'ms\terr ' + out.errs);
  } finally {
    await br.close();
    try { fs.unlinkSync(COPY); } catch (_) {}
  }
})();
