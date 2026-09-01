#!/usr/bin/env node
/* 작업 750 — [S3] ③ 이 새로 잡은 자리들의 «귀속» 을 찍는다
 *
 *   node tools/probe750.js            # ① 자리→아트 매핑 ② 아트별 «잉크 종횡 ÷ 상자 크기» 곡선
 *   node tools/probe750.js --json
 *
 * ── 무엇을 묻는가 ──────────────────────────────────────────────────────
 * `verify356` [S3] 의 편차는 **viewBox 종횡과의 차이가 아니다**(1회차 오측 정정이 probe418 335행에
 * 적혀 있다). 기준은 **그 그림을 256px 정사각 상자에 한 번 그려 잰 잉크 종횡**(`ref.asp`)이고,
 * 편차 = «화면 위 잉크 종횡 ÷ 그 기준» 이다. 그러니 한 자리가 빨개지는 길은 둘뿐이다:
 *   ⓐ 화면 쪽이 찌그러졌다 — 소수 상자·좌표·비균등 배율 (418·548·601 이 다뤄 온 축)
 *   ⓑ **그 아트의 잉크 종횡이 «그리는 크기» 를 탄다** — 기준은 256px 에서 재는데 화면의 아이콘은
 *      26~142px 이다. 뾰족한 꼭짓점·가는 획은 작게 그릴수록 AA 문턱(THR) 아래로 내려가
 *      bbox 가 그 축에서만 줄어든다 ⇒ 같은 그림인데 크기마다 종횡이 다르게 읽힌다.
 * ⓑ 는 [S3] 의 어느 항도 «자리» 로 못 가른다 — 그 아트를 쓰는 **모든 자리**가 한꺼번에 움직여
 * «새 자리가 여덟 개» 처럼 보인다(750 등재문이 본 모양). 그래서 이 자는 두 가지를 같이 찍는다:
 *   §1 자리 → 아트(`currentSrc`) 매핑 — 여덟 자리가 몇 장의 그림에서 나온 것인지
 *   §2 아트별 «상자 크기 ↔ 잉크 종횡» 곡선 — 기준 크기(256)에서 화면 크기까지 내려가며 잰다
 * §2 가 화면에서 관측된 편차를 **그 크기에서 그대로 재현하면** 그 자리는 ⓑ 다(제품 0줄).
 * 재현이 안 되면 남는 것이 ⓐ 이고, 그때가 제품을 고칠 자리다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, URL, STEP } = require('./scan356');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const THR = 12;                   /* probe418 과 같은 diff 문턱 — 다른 문턱으로 재면 나란히 못 읽는다 */

/* [S3] ③ 이 이번 실행에서 «등재 안 된 자리» 로 부른 여덟과, 눈금을 넘은 둘.
   화면 이름은 scan356 의 SCREENS 키를 그대로 쓴다(자가 밟는 길로만 간다). */
const TARGETS = [
  ['35 패스(스테이지)', ['div#psTk>div.ps-r>div.ps-bx.c0>i>img.cic',
    'div#psTk>div.ps-r>div.ps-bx.c1>i>img.cic',
    'div#psTk>div.ps-r>div.ps-bx.c2>i>img.cic']],
  ['35 패스(시련의 탑)', ['div#psArt>img.cic']],
  ['03 던전', ['div#dunw>div.pcb>div.pcb-p.pcb-d>i>img.cic',
    'div#dunList>div.dnc.bgm-dia>div.pill>em>img.cic',
    'div#dunList>div.dnc.bgm-gold>div.pill>em>img.cic']],
  ['89 유물', ['div#relw>div.pcb>div.pcb-p.pcb-r>i>img.cic',
    'div#relw>div.pcb>div.pcb-p.pcb-d>i>img.cic']],
  ['10 상점', ['div#shopw>div.pcb>div.pcb-p.pcb-d>i>img.cic']],
  ['18 패배', ['span#tutoRew>img.cic']],
  ['08 코스튬 세부', ['div.skd>div.sk-ct>div.vl>div.nt>b>img.cic']],
];

/* 화면 위 노드의 그림 출처와 «선언된 상자» 를 읽는다(잉크는 §2 가 크기별로 재므로 여기선 안 잰다). */
const READ = function (sels) {
  const out = [];
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out.push({ sel: s, miss: true }); continue; }
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    out.push({ sel: s, src: el.currentSrc || el.src || '', fit: cs.objectFit,
      box: +r.width.toFixed(4), boxH: +r.height.toFixed(4),
      nat: el.naturalWidth ? el.naturalWidth + '×' + el.naturalHeight : '?' });
  }
  return out;
};

/* 알파 bbox — 두 장 차분이 아니라 «흰 바탕 대비» 로 읽는다.
   ⚠ **그림은 한 장씩 재야 한다**(1회차에 여러 장을 나란히 놓고 x 를 등분해 갈랐다가
      큰 상자에서 이웃과 겹쳐 620×512 같은 «두 장 합본» bbox 를 읽었다 — 그 표는 통째로 버렸다). */
const INK = function ({ w, h, thr }) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(window.__shot, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dv = Math.max(255 - d[i], 255 - d[i + 1], 255 - d[i + 2]);
      if (dv <= thr) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : [x1 - x0 + 1, y1 - y0 + 1];
};

(async () => {
  const browser = await launch(chromium);

  /* ── §1 자리 → 아트 매핑 ─────────────────────────────────────────── */
  const map = [];
  for (const [screen, sels] of TARGETS) {
    const row = SCREENS.find((s) => s[0] === screen);
    if (!row) { map.push({ screen, err: 'SCREENS 에 없는 화면 이름' }); continue; }
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    let ok = true;
    for (const q of row[1]) { ok = (await STEP(page, q)) && ok; await page.waitForTimeout(420); }
    await page.waitForTimeout(250);
    const got = await page.evaluate(READ, sels);
    for (const g of got) map.push({ screen, entered: ok, ...g });
    await ctx.close();
  }

  /* ── §2 아트별 «상자 크기 ↔ 잉크 종횡» 곡선 ───────────────────────
     기준(probe418 `ref.asp`)은 **256px 상자 · DSF2** 한 점에서만 잰다. 여기서는 그 점과
     화면에서 실제로 쓰이는 크기들을 같이 재서, 관측된 편차가 «크기 탓» 인지 본다. */
  const arts = [...new Set(map.filter((m) => m.src).map((m) => m.src))];
  const SIZES = [256, 142.5469, 88, 65.2969, 57, 52.93, 50.9938, 26];
  const VW = 512, VH = 384;
  const curve = [];
  if (arts.length) {
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });          /* 같은 출처라야 file:// 그림이 뜬다 */
    for (const size of SIZES) {
      const inks = [];
      for (const src of arts) {
        await page.evaluate(({ s, sz }) => {
          document.documentElement.innerHTML = '<body style="margin:0;background:#fff"></body>';
          const im = document.createElement('img');
          im.src = s;
          /* 상자를 **정수 좌표**에 놓는다 — 좌표 몫(548 §4-C)이 이 곡선에 안 끼게. */
          im.style.cssText = `position:absolute;object-fit:contain;left:40px;top:40px;width:${sz}px;height:${sz}px`;
          document.body.appendChild(im);
        }, { s: src, sz: size });
        await page.waitForTimeout(260);
        const buf = await page.screenshot({ type: 'png' });
        await page.evaluate(async ({ b64 }) => {
          window.__shot = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
        }, { b64: buf.toString('base64') });
        inks.push(await page.evaluate(INK, { w: VW * 2, h: VH * 2, thr: THR }));
      }
      curve.push({ size, inks });
    }
    await ctx.close();
  }
  await browser.close();

  const base = curve.find((c) => c.size === 256);
  const asp = (v) => (v ? v[0] / v[1] : null);
  const rows = arts.map((src, i) => {
    const refA = base && asp(base.inks[i]);
    return { src: src.replace(/^.*\//, ''), ref: refA,
      pts: curve.map((c) => ({ size: c.size, ink: c.inks[i] ? c.inks[i].join('×') : null,
        dev: (c.inks[i] && refA) ? +(((asp(c.inks[i]) / refA) - 1) * 100).toFixed(2) : null })) };
  });

  if (JSON_OUT) { console.log(JSON.stringify({ map, rows }, null, 1)); return; }
  console.log('작업 750 — [S3] ③ 새 자리의 귀속\n');
  console.log('§1 자리 → 아트');
  for (const m of map) {
    if (m.err) { console.log('  ' + m.screen + ' — ' + m.err); continue; }
    if (m.miss) { console.log('  ' + m.screen.padEnd(16) + m.sel + '  → 못 찾음'); continue; }
    console.log('  ' + m.screen.padEnd(16) + m.sel.replace(/div#?|span#?/g, '') +
      '\n      상자 ' + m.box + '×' + m.boxH + ' · fit ' + m.fit + ' · natural ' + m.nat +
      ' · ' + m.src.replace(/^.*\//, ''));
  }
  console.log('\n§2 아트별 «상자 크기 ↔ 잉크 종횡» (기준 = 256px 상자 = probe418 의 ref.asp 자리)');
  const head = '  ' + '아트'.padEnd(22) + curve.map((c) => String(c.size).padEnd(12)).join('');
  console.log(head);
  for (const r of rows) {
    console.log('  ' + r.src.padEnd(22) +
      r.pts.map((p) => (p.dev === null ? '—' : `${p.dev > 0 ? '+' : ''}${p.dev}%`).padEnd(12)).join(''));
    console.log('  ' + ''.padEnd(22) + r.pts.map((p) => String(p.ink || '—').padEnd(12)).join(''));
  }
  console.log('\n(편차 = 그 크기의 잉크 종횡 ÷ 256px 상자에서 잰 종횡 − 1.');
  console.log(' 화면에서 관측된 편차가 그 자리의 상자 크기 칸에서 그대로 나오면 «아트가 크기를 탄다»(제품 0줄) 는 뜻이다.)');
})();
