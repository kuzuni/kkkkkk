/* 작업 258 진단 프로브 — 04 던전 세부 팝업이 «열려 있는 동안 깜빡거린다».
 *
 * 지시서(PROGRESS 258)가 요구하는 «측정 먼저». 감으로 상수를 흔들지 않기 위해
 *   ① `#dgdw`·`#dgdBn`·`#dgdTh` 에 MutationObserver 를 걸어 «클래스·style·자식 교체» 를
 *      타임스탬프와 함께 전부 찍고,
 *   ② 같은 창에서 배너 캔버스의 잉크 픽셀 수를 50ms 간격으로 샘플링해 «화면이 실제로 바뀌는» 주기를 잰다.
 * 주기가 200ms 면 ①(dgdPaintTh 재시도), 125ms/4.3s 면 ②(121 들썩), 매 틱이면 ④(주기 재렌더).
 *
 * 실행: node tools/probe258.js [--ms 6000]
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const MS = (() => { const i = process.argv.indexOf('--ms'); return i > 0 ? +process.argv[i + 1] : 6000; })();

const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

/* 페이지 안에 관찰기를 심는다. 팝업을 열기 **전에** 걸어야 열림 자체도 기록된다. */
const INSTALL = () => {
  window.__m = [];
  window.__t0 = performance.now();
  const rec = (tag, o) => window.__m.push(Object.assign({ t: +(performance.now() - window.__t0).toFixed(1), tag }, o));
  window.__rec = rec;
  const obs = new MutationObserver(ms => {
    for (const m of ms) {
      const id = m.target.id || (m.target.className && m.target.className.baseVal) || m.target.className || m.target.nodeName;
      if (m.type === 'attributes') {
        rec('attr', { id: String(id).slice(0, 30), a: m.attributeName,
                      old: String(m.oldValue).slice(0, 60),
                      now: String(m.target.getAttribute(m.attributeName)).slice(0, 60) });
      } else {
        rec('child', { id: String(id).slice(0, 30), add: m.addedNodes.length, rm: m.removedNodes.length });
      }
    }
  });
  const opt = { attributes: true, attributeOldValue: true, childList: true, subtree: true };
  ['dgdw', 'dgdBn', 'dgdTh'].forEach(k => { const e = document.getElementById(k); if (e) obs.observe(e, opt); });

  /* 어떤 함수가 몇 번 불리는지 — 원인 후보를 함수 단위로 가른다 */
  ['dgdPaintTh', 'renderDunDetail', 'raidDraw', 'raidIdleTick', 'renderUI'].forEach(fn => {
    const f = window[fn];
    if (typeof f !== 'function') return;
    window[fn] = function (...a) { rec('call', { id: fn }); return f.apply(this, a); };
  });
};

/* 배너 캔버스의 잉크(알파>8) 픽셀 수 + 클래스 상태 한 장 */
const SNAP = () => {
  const cv = document.getElementById('dgdTh'), bn = document.getElementById('dgdBn');
  const sil = bn.querySelector('b');
  let n = 0;
  try {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
  } catch (_) { n = -1; }
  return { t: +(performance.now() - window.__t0).toFixed(1), n,
           on: bn.classList.contains('th-on'),
           fr: cv._fr || '',
           silD: getComputedStyle(sil).display,
           cvD: getComputedStyle(cv).display,
           wOn: document.getElementById('dgdw').classList.contains('on'),
           dunOn: document.getElementById('dunw').classList.contains('on') };
};

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(SEED);

  /* 03 목록을 거쳐 세부를 여는 «주인이 본 경로» 그대로 */
  await p.evaluate(() => { openDungeon(); });
  await p.waitForTimeout(600);
  await p.evaluate(INSTALL);
  await p.evaluate(() => { openDunDetail(DUNGEONS[0]); });

  const snaps = [];
  const t0 = Date.now();
  while (Date.now() - t0 < MS) {
    snaps.push(await p.evaluate(SNAP));
    await p.waitForTimeout(50);
  }
  const mut = await p.evaluate(() => window.__m);

  /* ---- 보고 ---- */
  console.log(`\n=== [1] 잉크 픽셀 추이 (50ms 간격, ${MS}ms) ===`);
  let flips = 0, prev = null, changes = [];
  for (const s of snaps) {
    if (prev !== null && s.n !== prev) { flips++; changes.push(s.t); }
    prev = s.n;
  }
  const ns = snaps.map(s => s.n);
  console.log(`샘플 ${snaps.length} · 잉크 변화 ${flips}회 · min ${Math.min(...ns)} max ${Math.max(...ns)}`);
  const onFlip = snaps.filter((s, i) => i && s.on !== snaps[i - 1].on);
  console.log(`th-on 토글 ${onFlip.length}회` + (onFlip.length ? ' @ ' + onFlip.map(s => s.t).join(',') : ''));
  const silFlip = snaps.filter((s, i) => i && s.silD !== snaps[i - 1].silD);
  console.log(`실루엣 display 토글 ${silFlip.length}회` + (silFlip.length ? ' @ ' + silFlip.map(s => s.t + ':' + s.silD).join(',') : ''));
  if (changes.length > 1) {
    const gaps = changes.slice(1).map((t, i) => +(t - changes[i]).toFixed(0));
    const hist = {};
    gaps.forEach(g => { const k = Math.round(g / 25) * 25; hist[k] = (hist[k] || 0) + 1; });
    console.log('잉크 변화 간격 히스토그램(25ms 버킷): ' +
      Object.entries(hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}ms×${v}`).join(' '));
  }
  console.log('앞 40 샘플 n: ' + ns.slice(0, 40).join(' '));

  console.log(`\n=== [2] MutationObserver / 호출 (${mut.length}건) ===`);
  const cnt = {};
  mut.forEach(m => { const k = m.tag + ':' + (m.id || '') + (m.a ? '@' + m.a : ''); cnt[k] = (cnt[k] || 0) + 1; });
  Object.entries(cnt).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v.toString().padStart(5)} × ${k}`));

  console.log('\n=== [3] 앞 60건 원본 ===');
  mut.slice(0, 60).forEach(m => console.log('  ' + JSON.stringify(m)));

  console.log('\n=== [4] 콘솔 에러 ===');
  console.log(errs.length ? errs.slice(0, 10).join('\n') : '  없음');

  await ctx.close(); await b.close();
})();
