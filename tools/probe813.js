#!/usr/bin/env node
/* 작업 813 — 89 유물 소환 «짧은 프레임 여백 예산» 재현기
 *
 *   node tools/probe813.js            # 프레임 5종 × 예산 변수·요소 좌표
 *   node tools/probe813.js --json     # 원자료
 *
 * ── 무엇을 재는가 ────────────────────────────────────────────────────────────
 * 754 6회차가 등재한 813 은 «간극이 짧은 프레임에서 하한에 눌린다» 인데,
 * probe754 는 **간극만** 재고 그 간극을 만든 **예산 변수**를 안 본다.
 * 813 의 처방은 예산(`--rw-g3` 하한 · `--rw-lt` · `--rw-gt`)을 다시 잡는 것이므로
 * 재현기는 «어느 변수가 어느 프레임에서 어느 분기에 걸렸는가» 를 같이 찍는다.
 *
 * 판정 축 셋 —
 *   ⓐ 쌍 간극(probe754 와 **같은 규칙**: 기준 2280 간극의 1/4 미만이면 붕괴)
 *      · `.rw-lintel ↓ #rwMulBar`   · `.rw-cap ↓ .rw-fc.bl`
 *   ⓑ 예산 변수 실측 — `--rw-sp/g3/bt/tt/av/gt/fl/lt` 와 «벽»(상인방 하변↔격자 상변)
 *   ⓒ 120 이 지키는 최소 요구 — 금테 회피(패널 상단↔상인방 상변 ≥ 20) ·
 *      상인방 온전(높이 66) · 격자 위 여유 8 · 수반 클리어런스(접합선↔수반 ≥ 0)
 *
 * ⚠ 이 자는 **제품을 안 고친 상태에서도 돌려서** 등재문 수치가 재현되는지 먼저 본다(338 규칙).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const ARG = process.argv.slice(2);
const JSONOUT = ARG.includes('--json');

const FRAMES = [1600, 1841, 1920, 2280, 2600];
const BASE = 2280;
const GTOL = 1.5;

/* probe754 의 판정 규칙 그대로 — 자가 둘이면 답도 둘이 된다(334 규약) */
const { judgeGaps } = require('./probe754.js');

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-panel');
  if (!panel) return { missing: true };
  /* ⚠ 커스텀 속성은 등록(@property)돼 있지 않아 `getPropertyValue` 가 **토큰 문자열**(`calc(100% - …)`)을
     그대로 준다 — parseFloat 이 NaN 이다. 그래서 예산 값을 **그려진 기하에서 역산**한다.
     `--rw-gt` = 격자 상변 · `--rw-lt` = 상인방 상변 · `--rw-bt` = 수반 상변 · `--rw-av` = 아치가 격자 위로 뻗은 길이. */
  const pr = panel.getBoundingClientRect();
  const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect();
    return { t: Math.round((r.top - pr.top) * 10) / 10, b: Math.round((r.bottom - pr.top) * 10) / 10,
             h: Math.round(r.height * 10) / 10, ft: Math.round(r.top * 10) / 10 }; };
  const els = {};
  for (const [k, s] of [['lintel', '#relw .rw-lintel'], ['mul', '#rwMulBar'], ['grid', '#rwGrid'],
                        ['mid', '#relw .rw-mid'], ['cap', '#relw .rw-cap'], ['fcbl', '#relw .rw-fc.bl'],
                        ['floor', '#relw .rw-floor'], ['steps', '#relw .rw-steps'],
                        ['panel', '#relw .rw-panel']])
    els[k] = box(s);
  const panelH = Math.round(pr.height * 10) / 10;
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const vars = {
    panelH,
    sp: r1(panelH - 820),
    gt: els.grid ? els.grid.t : null,
    lt: els.lintel ? els.lintel.t : null,
    bt: els.mid ? els.mid.t : null,
    /* 2회차 [E4] — 이 값은 이제 `--rw-g3` 가 아니라 **`--rw-i`(안내문 ↓ 패널 하변)** 다.
       아래 블록의 총량(38 + g3)은 그대로 두고 위·아래를 ref 비 0.625:0.375 로 나눈다. */
    I: r1(panelH - (els.cap ? els.cap.b : 0)),
    G: els.mid && els.cap ? r1(els.cap.t - els.mid.b) : null,
    /* 아치는 `.rw-bg::after` 라 **의사 요소**여서 getBoundingClientRect 로 못 잡는다.
       2회차까지는 `min(186,(tt−174)/2)` 식을 그대로 옮겨 적었는데, [E1] 이 셋째 인자를
       더하면서 **식을 옮겨 적는 방식 자체가 늙었다** — `--rw-fl`(= gt + 516 + av)을 얹은
       `.rw-floor` 상변에서 되재면 식이 어떻게 바뀌어도 자가 안 늙는다. */
    tt: els.mid ? r1(els.mid.t - 516) : null,
    av: els.floor && els.grid ? r1(els.floor.t - (els.grid.t + els.grid.h)) : null,
    wall: els.grid && els.lintel ? r1(els.grid.t - els.lintel.b) : null,
    gapMid: els.grid && els.mid ? r1(els.mid.t - (els.grid.t + els.grid.h)) : null,
  };
  return { vars, els, panelH };
};

(async () => {
  const browser = await launch(chromium);
  const byFrame = {};
  for (const fh of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(650);
    await page.evaluate(() => { try { openRelw(); } catch (e) { return String(e); } });
    await page.waitForTimeout(260);
    const m = await page.evaluate(MEASURE);
    m.err = errs[0] || null;
    byFrame[fh] = m;
    await ctx.close();
  }
  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify(byFrame, null, 2)); return; }

  const g = (fh, a, b) => {
    const e = byFrame[fh].els;
    if (!e[a] || !e[b]) return null;
    return Math.round((e[b].t - e[a].b) * 10) / 10;
  };
  const pairRow = (label, a, b) => {
    const gaps = FRAMES.map((fh) => ({ fh, g: g(fh, a, b) }));
    const j = judgeGaps(gaps);
    const mark = j.harm === 'none' ? (j.why === '상수' ? '  ' : '⚠ ') : '❌';
    console.log(`  ${mark} ${label.padEnd(30)} ${gaps.map((x) => String(x.g).padStart(7)).join('')}   ${j.why}` +
                (j.base != null ? `  (기준 ${j.base} · 1/4 = ${Math.round(j.base * 25) / 100})` : ''));
    return { label, gaps, ...j };
  };

  console.log('PROBE813 — 89 유물 소환 여백 예산 (프레임 1600 · 1841 · 1920 · 2280 · 2600 · 기준 2280)\n');
  console.log('[A] 쌍 간극 — probe754 와 같은 규칙(기준 간극의 1/4 미만 = 붕괴)');
  console.log(`     ${''.padEnd(31)}${FRAMES.map((f) => String(f).padStart(7)).join('')}`);
  const pairs = [
    pairRow('.rw-lintel ↓ #rwMulBar', 'lintel', 'mul'),
    pairRow('#rwMulBar ↓ #rwGrid', 'mul', 'grid'),
    pairRow('.rw-cap ↓ .rw-fc.bl', 'cap', 'fcbl'),
    pairRow('#rwGrid ↓ .rw-mid (격자↔수반)', 'grid', 'mid'),
    pairRow('.rw-mid ↓ .rw-cap', 'mid', 'cap'),
  ];

  console.log('\n[B] 예산 변수 — 그려진 기하에서 역산 (패널 지역 좌표)');
  const keys = [['panelH', '패널 높이'], ['sp', '= 패널H − 820'], ['lt', '상인방 상변'], ['gt', '격자 상변'],
                ['bt', '수반 상변'], ['tt', '= bt − 516'], ['av', '아치 뻗음(격자 하변→받침 상변)'], ['G', '수반 ↓ 안내문'], ['I', '안내문 ↓ 패널 하변'],
                ['wall', '벽 = 격자 상변 − 상인방 하변'], ['gapMid', '격자 하변 → 수반 상변']];
  console.log(`     ${'var'.padEnd(8)}${FRAMES.map((f) => String(f).padStart(9)).join('')}`);
  for (const [k, desc] of keys)
    console.log(`     ${k.padEnd(8)}${FRAMES.map((f) => String(byFrame[f].vars[k]).padStart(9)).join('')}   ${desc}`);
  console.log(`     ${'여유'.padEnd(7)}${FRAMES.map((f) => String(Math.round((byFrame[f].vars.wall - 98) * 10) / 10).padStart(9)).join('')}   벽 − 바 98 (위·아래 두 간극의 합)`);

  console.log('\n[C] 120 최소 요구 — 깨지면 ❌');
  const chk = (label, fn, ok) => {
    const vals = FRAMES.map((f) => fn(byFrame[f]));
    const bad = vals.filter((v) => !ok(v)).length;
    console.log(`  ${bad ? '❌' : '  '} ${label.padEnd(30)} ${vals.map((v) => String(Math.round(v * 10) / 10).padStart(7)).join('')}`);
    return bad === 0;
  };
  const c = [];
  c.push(chk('금테 회피(패널↔상인방 상변 ≥20)', (m) => m.els.lintel.t, (v) => v >= 19.5));
  c.push(chk('상인방 온전(높이 = 66)', (m) => m.els.lintel.h, (v) => Math.abs(v - 66) <= 1.5));
  c.push(chk('바 ↔ 격자 여유 ≥ 8', (m) => m.els.grid.t - m.els.mul.b, (v) => v >= 7.5));
  c.push(chk('바가 벽 안 (상인방 하변 ↔ 바 상변 ≥0)', (m) => m.els.mul.t - m.els.lintel.b, (v) => v >= -0.5));
  /* 2회차 [E4] — 하한의 근거가 «14회차의 44» 에서 **코너 브래킷 산수**로 바뀌었다:
     브래킷은 bottom 3 · 높이 24 라 아래 여백이 27 미만이면 안내문 «상자» 와 겹친다.
     같이 재는 것은 «위:아래 비가 레퍼런스 대역(0.58~0.62, 1600 만 0.64 까지) 안인가» 다 —
     1회차 비평 2인이 독립으로 낸 값이고, 하한만 지키고 비를 안 재면 [E4] 가 조용히 풀린다. */
  c.push(chk('안내문 ↓ 패널 하변 ≥ 32 (코너 브래킷 27 + 5)', (m) => m.vars.I, (v) => v >= 31.5));
  c.push(chk('안내문 위:아래 비 = ref 0.58~0.65', (m) => m.vars.I / m.vars.G, (v) => v >= 0.57 && v <= 0.66));
  c.push(chk('패널 안 (안내문 하변 ≤ 패널H)', (m) => m.panelH - m.els.cap.b, (v) => v >= 0));

  const harm = pairs.filter((p) => p.harm !== 'none');
  console.log(`\n요약 — 붕괴·겹침 쌍 ${harm.length}건${harm.length ? ' (' + harm.map((h) => h.label).join(' · ') + ')' : ''}` +
              ` · 최소 요구 위반 ${c.filter((x) => !x).length}건`);
  process.exit(0);
})();
