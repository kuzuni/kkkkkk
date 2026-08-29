#!/usr/bin/env node
/* 작업 356 9회차 재현기 — 8회차 비평가 BF 의 «화면 밖에 같은 계열 4건» 을 재현하고 가른다.
 *
 *   node tools/probe356r9.js
 *
 * BF 가 낸 넷은 8회차가 33 재화 정보에서 닫은 것과 **같은 계열**이다 —
 * `.cic{width:1.08em}` × 소수 `font-size` = **소수 상자**가 소수 좌표에 앉아
 * 페인트 스냅이 한 축만 1px 더 먹는다. 다만 넷이 같은 급인지는 **배율을 올려 봐야** 갈린다:
 *
 *   · 진짜 기하 결함 — DSF 1·2·3 에서 **편차가 안 줄어든다**(8회차 33 보석이 그랬다: 1.10% 고정)
 *   · 측정 바닥      — 배율을 올리면 **0 으로 수렴한다**(1px 이 DSF1 에서는 1.2%, DSF3 에서는 0.4%)
 *
 * 그래서 이 자는 DSF 1·2·3·4 를 다 돌리고 «형제와의 대조»(같은 격자의 다른 칸)를 같이 찍는다.
 * ⚠ 8회차 교훈 — 차분 두 장 사이에 다른 것이 바뀌면 bbox 가 부푼다: 애니를 끝내고 타이머를 끄고
 *   같은 자리를 두 번 재서 같은 값인지 본다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const OPA = ([sel, i, v]) => { const e = document.querySelectorAll(sel)[i]; if (e) e.style.opacity = v; };
const RECT = ([sel, i]) => {
  const e = document.querySelectorAll(sel)[i]; if (!e) return null;
  const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
};
const DIFF = async ([a, b]) => {
  const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }; };
  const A = await load(a), B = await load(b);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) { const i = (y * A.W + x) * 4;
    const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
    if (dd > 12) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
};

const SITES = [
  { lab: '70 출석 보상 젬 ×7', open: ['.side .ibtn[data-pop="attend"]'],
    sel: '#modal.at70 .at-rw .at-if.ifr > em > img.cic', all: true,
    /* 되돌림 — 9회차가 넣은 정수 상자를 떼면 소수 상자(82.0781)가 돌아온다 */
    fix: '.at-if>em>.cic{width:1.08em !important;height:1.08em !important}', revert: true },
  /* ⚑ 34 축복은 **유령으로 기각됐다** — 현행이 DSF1 109×110(−0.91%)이지만 DSF2 −0.45% ·
     DSF3·4 **0.00%** 로 수렴한다 = 1px 이 저배율에서만 커 보이는 «측정 바닥» 이다.
     70 출석과 부호가 아니라 **수렴 여부**가 갈랐다. 재현은 남겨 둔다(다음 세션이 다시 안 파도록). */
  { lab: '34 축복 보너스 💰 (기각 — 수렴)', open: ['.side .ibtn[data-pop="bless"]'],
    sel: '#blsBonus > s.ic > img.cic', all: true,
    fix: '/* 후보 없음 — 상자를 건드리면 6회차의 그룹 배율 역산이 깨진다 */' },
];

(async () => {
  const b = await launch(chromium);
  const calc = await b.newPage(); await calc.setContent('<body></body>');

  for (const site of SITES) {
    console.log(`\n════ ${site.lab} ════`);
    for (const mode of ['현행(수리 후)', site.revert ? '되돌림 — 소수 상자 1.08em' : '대조(변경 없음)']) {
      for (const dsf of [1, 2, 3, 4]) {
        const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: dsf });
        await p.goto(URL); await p.waitForTimeout(1300);
        for (const q of site.open) {
          await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); }, q);
          await p.waitForTimeout(800);
        }
        await p.evaluate(() => {
          for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
          for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
          window.requestAnimationFrame = () => 0;
        });
        if (!mode.startsWith('현행')) await p.addStyleTag({ content: site.fix });
        await p.waitForTimeout(250);

        const n = await p.evaluate((s) => document.querySelectorAll(s).length, site.sel);
        if (!n) { console.log(`  ${mode} DSF${dsf} — 진입 실패(노드 0개)`); await p.close(); continue; }
        const out = [];
        for (let i = 0; i < n; i++) {
          const r = await p.evaluate(RECT, [site.sel, i]);
          const PAD = 40;
          const clip = { x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
            width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2) };
          await p.waitForTimeout(120);
          const on = (await p.screenshot({ clip })).toString('base64');
          await p.evaluate(OPA, [site.sel, i, '0']);
          await p.waitForTimeout(120);
          const off = (await p.screenshot({ clip })).toString('base64');
          await p.evaluate(OPA, [site.sel, i, '']);
          await p.waitForTimeout(80);
          const d = await calc.evaluate(DIFF, [on, off]);
          if (!d) { out.push('—'); continue; }
          const dev = (d.w / d.h - 1) * 100;
          out.push(`${d.w}×${d.h}${Math.abs(dev) > 0.5 ? ' ✗' + dev.toFixed(2) + '%' : ''}`);
        }
        const box = await p.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return r.width.toFixed(4); }, site.sel);
        console.log(`  ${mode.padEnd(24)} DSF${dsf} · 상자 ${box} · ${out.join(' | ')}`);
        await p.close();
      }
    }
  }
  await b.close();
})();
