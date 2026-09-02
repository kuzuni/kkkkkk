/* 작업 817 게이트 — «유물 소환 버스트가 잘린다» 의 두 축을 **따로** 못박는다.
 *
 *   node tools/verify817.js
 *
 * 재현(`probe817`)이 갈래를 갈랐다 — 등재문의 «뷰포트 상단(y=0) 이탈» 은 **기각**됐고
 * (지원 프레임 5종 × 알 600개에서 프레임 밖 0건), 잘린 것은 화면이 아니라 **캡처**였다
 * (`cap681` 의 손 상수 클립 여유 M=160 < 실제 필요 여유 **280px**). 그래서 이 자의 절도 둘이다:
 *
 *   [A] **제품 불변식** — 유물 소환 버스트의 잉크가 프레임 밖으로 안 나간다(지원 5종).
 *       ⚑ 지금 초록인 것을 굳히는 항이 아니다 — `RW_FX_FLY`·산포·발원점(`RW_FX_Y`)·대야 위치가
 *         바뀌면 **여기가 먼저 빨개진다**. 등재문이 고치려던 그 결함의 자리를 자로 지킨다.
 *   [B] **하네스 불변식** — `cap681` 의 클립이 그 버스트를 **통째로 담는다**.
 *       규칙의 사본을 여기 다시 적지 않는다 — `cap681` 이 내보내는 `clipFor` 를 **그대로 require**
 *       해서 잰다(402 «사본을 지운다» · 이 자와 하네스가 갈라지면 그게 곧 다음 유령이다).
 *   [C] **5회차 규약 보존** — 클립이 `currentTime` 에 안 흔들린다(여덟 장이 같은 상자).
 *   [D] **손 상수 0** — 클립 여유를 다시 손으로 적지 않았는가(뿌리의 재발 방지).
 *   [R] **되돌림 시험** — 종전 규칙(M=160 고정)으로는 [B] 가 **빨갛다**.
 *       334 «허용치를 넓혀 무르게 풀지 마라» · 368 §R2 와 같은 자리 — 이 항이 없으면
 *       «클립을 키웠더니 통과» 가 수리인지 눈감음인지 못 가른다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { clipFor, STOPS, SEED } = require('./cap681.js');   /* 규칙·표본 시각·시드는 하네스 것 하나뿐이다 */

const SRC = path.resolve(__dirname, '..', 'index.html');
const CAP = path.resolve(__dirname, 'cap681.js');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const HS = [1600, 1780, 1920, 2280, 2600];
const BURSTS = 10;
const M_OLD = 160;                                   /* 817 이전 손 상수 — §R 에서만 쓴다 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 화면에서 버스트를 N 회 굴려 ① 프레임 좌표 궤적 상자 ② 화면 좌표 궤적 상자(`reach` 와 같은 자)
   ③ 호스트 상자를 같이 걷어 온다. `cap681` 의 `reach` 계산과 **같은 산수**를 쓴다. */
const RUN = ({ sel, open, n }) => {
  const out = { frameH: 0, host: null, hostScr: null, box: [], scr: [], pad: 0, err: '' };
  try {
    const num = v => { const q = parseFloat(v); return Number.isFinite(q) ? q : null; };
    try { closeModal(); } catch (_) {}
    S.relic = 1e12; S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    (new Function(open))();
    const f = (typeof fxSc === 'function') ? fxSc() : null;
    const s = f ? f.s : 1, ox = f ? f.x : 0, oy = f ? f.y : 0;
    const app = document.getElementById('app');
    out.frameH = app ? app.getBoundingClientRect().height / s : 0;
    const L = document.getElementById('fxl');
    const el = document.querySelector(sel);
    if (!el) { out.err = '대상 없음: ' + sel; return out; }
    out.host = (typeof fxRect === 'function') ? fxRect(el) : null;
    const hb = el.getBoundingClientRect();
    out.hostScr = { x: Math.round(hb.x), y: Math.round(hb.y), w: Math.round(hb.width), h: Math.round(hb.height) };
    while (L.firstChild) L.removeChild(L.firstChild);
    for (let k = 0; k < n; k++) {
      const seen = new Set(L.children);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      for (const nd of L.children) {
        if (seen.has(nd)) continue;
        const c = nd.className + '';
        if (!/fx-spark/.test(c)) continue;
        const x = num(nd.style.left), y = num(nd.style.top);
        if (x === null || y === null) continue;
        const dx = num(nd.style.getPropertyValue('--dx')) || 0;
        const dy = num(nd.style.getPropertyValue('--dy')) || 0;
        const bb = nd.getBoundingClientRect();
        const sz = num(nd.style.width) || bb.width || 26;
        const half = (bb.width || sz) / 2;
        out.pad = Math.max(out.pad, Math.round(bb.width || sz));
        out.box.push({ x0: Math.min(x, x + dx) - sz / 2, x1: Math.max(x, x + dx) + sz / 2,
                       y0: Math.min(y, y + dy) - sz / 2, y1: Math.max(y, y + dy) + sz / 2,
                       rlic: /fx-rlic/.test(c) });
        out.scr.push({ x0: ox + Math.min(x, x + dx) * s - half, x1: ox + Math.max(x, x + dx) * s + half,
                       y0: oy + Math.min(y, y + dy) * s - half, y1: oy + Math.max(y, y + dy) * s + half });
      }
      while (L.firstChild) L.removeChild(L.firstChild);
    }
  } catch (e) { out.err = String(e).split('\n')[0]; }
  return out;
};

/* 화면 좌표 상자들의 합집합 = `cap681` 이 페이지 안에서 만드는 `reach` 와 같은 값 */
const reachOf = r => {
  if (!r.scr.length) return null;
  const x0 = Math.min(...r.scr.map(b => b.x0)), y0 = Math.min(...r.scr.map(b => b.y0));
  const x1 = Math.max(...r.scr.map(b => b.x1)), y1 = Math.max(...r.scr.map(b => b.y1));
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), pad: r.pad };
};
/* ⚠ 시드를 `cap681` 과 **같이** 심는다 — 안 심으면 같은 자리를 재는 두 표본이 서로 다른
   버스트가 되고, 자는 «클립이 흔들린다» 가 아니라 «난수가 달랐다» 를 재게 된다
   (666 5회차 · LESSONS 666-⑧ 이 하네스에서 잡은 그 함정이다). */
const SEEDER = (sd) => {
  let s = sd >>> 0;
  Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
/* 클립이 상자를 통째로 담는가 */
const holds = (c, b) => b.x0 >= c.x - 0.5 && b.y0 >= c.y - 0.5
                     && b.x1 <= c.x + c.width + 0.5 && b.y1 <= c.y + c.height + 0.5;

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const sample = async (VH, sel, open, n) => {
    const p = await browser.newPage({ viewport: { width: 1080, height: VH } });
    p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const r = await ev(p, RUN, { sel, open, n });
    await p.close();
    return r;
  };

  /* ── [A] 제품 불변식 ── */
  blk('[A] 제품 — 유물 소환 버스트가 프레임 밖으로 안 나간다 (지원 5종)');
  const rows = [];
  for (const VH of HS) {
    const r = await sample(VH, '#rwBasin', 'openRelw()', BURSTS);
    if (!r || r.err || !r.box.length) { ok(false, '[A-' + VH + '] 표본', (r && r.err) || '없음'); continue; }
    rows.push(r);
  }
  ok(rows.length === HS.length, '[A-pre] 지원 프레임 5종 표본', rows.length + '/' + HS.length);
  let aOut = 0, aTot = 0, mnT = 1e9;
  for (const r of rows) for (const b of r.box) {
    if (b.rlic) continue;                       /* 획득 알(683/753)은 이 축이 아니다 */
    aTot++; mnT = Math.min(mnT, b.y0);
    if (b.y0 < 0 || b.y1 > r.frameH || b.x0 < 0 || b.x1 > 1080) aOut++;
  }
  info('지불 알', aTot + '개 · 잉크 상변 최소 ' + (mnT === 1e9 ? '-' : mnT.toFixed(1)) + 'px');
  ok(aTot > 0 && aOut === 0, '[A-a] 프레임 밖 알 0건 (사방)', aOut + '/' + aTot);
  const reqM = rows.length ? Math.max(...rows.map(r =>
    Math.max(...r.box.filter(b => !b.rlic).map(b => r.host.y - b.y0)))) : 0;
  info('호스트 상변에서 필요한 여유', reqM.toFixed(0) + 'px');
  ok(reqM > M_OLD, '[A-b] 실제 상향 도달이 종전 손 상수 ' + M_OLD + ' 보다 크다 (뿌리의 크기)',
     reqM.toFixed(0) + 'px');

  /* ── [B] 하네스 불변식 ── */
  blk('[B] 하네스 — `cap681` 의 클립이 버스트를 통째로 담는다 (규칙은 `clipFor` 하나)');
  const r2280 = rows[HS.indexOf(2280)];
  ok(!!r2280 && !!r2280.hostScr, '[B-pre] 캡처 화면비(2280) 표본', r2280 ? String(r2280.box.length) + '알' : '없음');
  let bOut = 0, bTot = 0, clipNew = null;
  if (r2280) {
    clipNew = clipFor(r2280.hostScr, reachOf(r2280));
    info('새 클립', clipNew ? (clipNew.x + ',' + clipNew.y + ' ' + clipNew.width + '×' + clipNew.height) : '없음');
    for (const b of r2280.scr) { bTot++; if (!holds(clipNew, b)) bOut++; }
  }
  ok(bTot > 0 && bOut === 0, '[B-a] 클립 밖으로 나간 알 0건', bOut + '/' + bTot);
  ok(!!clipNew && clipNew.x >= 0 && clipNew.y >= 0
     && clipNew.x + clipNew.width <= 1080 && clipNew.y + clipNew.height <= 2280,
     '[B-b] 클립이 뷰포트 안에 있다 (screenshot 이 거부하지 않는다)');
  /* 씬 A(훈련)도 같은 규칙으로 담긴다 — 619 가둠 덕에 원래 넉넉했던 자리가 안 무너졌는가 */
  const rA = await sample(2280, '#trCards [data-tr] .cb', 'openTrain()', 4);
  const hostA = await (async () => {
    const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900);
    const h = await ev(p, () => { try { closeModal(); } catch (_) {} S.gold = 1e18; openTrain();
      const e = document.querySelector('#trCards [data-tr]'); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; });
    await p.close(); return h;
  })();
  let aCut = 0;
  if (rA && rA.scr.length && hostA) {
    const cA = clipFor(hostA, reachOf(rA));
    for (const b of rA.scr) if (!holds(cA, b)) aCut++;
    info('씬 A 클립', cA.x + ',' + cA.y + ' ' + cA.width + '×' + cA.height + ' · 알 ' + rA.scr.length);
  }
  ok(!!(rA && rA.scr.length && hostA) && aCut === 0, '[B-c] 씬 A(훈련)도 통째로 담긴다', aCut + '건');

  /* ── [C] 5회차 규약 — 클립이 시각에 안 흔들린다 ── */
  blk('[C] 5회차 규약 — 여덟 장이 같은 클립 (`currentTime` 무관)');
  /* ⚑ 여기서 `cap681` 의 촬영 절차를 **다시 짜지 않는다**(그러면 규칙의 사본이 또 하나 는다).
     대신 그 절차가 서 있는 **두 기둥**을 각각 직접 묻는다:
       ⓐ `reach` 가 `currentTime` 과 무관한가 — 한 페이지·한 버스트에서 시각만 감아 재 본다.
         (봉투는 `--dx/--dy` 사이를 보간할 뿐이라 궤적 상자는 안 움직여야 한다.)
       ⓑ 드라이버가 첫 장의 클립을 뒤 일곱 장에 **물리는가** — 그래야 호스트 상자가 621 눌림
         애니로 흔들려도(5회차가 잡은 그 사고) 여덟 장이 구조적으로 같은 상자를 쓴다.
     ⚠ ⓐ 만으로는 안 닫힌다 — 5회차의 사고는 궤적이 아니라 **호스트**가 흔들린 것이었다. */
  const pC = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await pC.addInitScript(SEEDER, SEED);
  await pC.goto(URL, { waitUntil: 'load' });
  await pC.waitForTimeout(900);
  const reaches = await ev(pC, ({ stops, sd }) => {
    const num = v => { const q = parseFloat(v); return Number.isFinite(q) ? q : null; };
    try { closeModal(); } catch (_) {}
    S.relic = 1e12; openRelw();
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    let s0 = sd >>> 0;
    Math.random = function () { s0 |= 0; s0 = (s0 + 0x6D2B79F5) | 0;
      let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const L = document.getElementById('fxl');
    while (L.firstChild) L.removeChild(L.firstChild);
    const el = document.getElementById('rwBasin');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const f = (typeof fxSc === 'function') ? fxSc() : null;
    const s = f ? f.s : 1, ox = f ? f.x : 0, oy = f ? f.y : 0;
    const out = [];
    for (const T of stops) {
      try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = T; } catch (e) {} }); } catch (e) {}
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, pad = 0;
      for (const nd of L.children) {
        const x = num(nd.style.left), y = num(nd.style.top);
        if (x === null || y === null) continue;
        const dx = num(nd.style.getPropertyValue('--dx')) || 0;
        const dy = num(nd.style.getPropertyValue('--dy')) || 0;
        const w = num(nd.style.width) || 26, half = w / 2;
        pad = Math.max(pad, Math.round(w));
        for (const q of [[x, y], [x + dx, y + dy]]) {
          x0 = Math.min(x0, ox + q[0] * s - half); y0 = Math.min(y0, oy + q[1] * s - half);
          x1 = Math.max(x1, ox + q[0] * s + half); y1 = Math.max(y1, oy + q[1] * s + half);
        }
      }
      out.push(Number.isFinite(x0)
        ? { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), pad }
        : null);
    }
    return out;
  }, { stops: STOPS, sd: SEED });
  await pC.close();
  ok(!!reaches && reaches.every(Boolean), '[C-pre] 여덟 시각 전부 궤적 상자를 냈다',
     reaches ? reaches.filter(Boolean).length + '/' + STOPS.length : '실패');
  const rkey = r => r ? [r.x, r.y, r.w, r.h, r.pad].join(',') : 'null';
  const ru = reaches ? [...new Set(reaches.map(rkey))] : [];
  info('궤적 상자', ru.join(' | '));
  ok(ru.length === 1, '[C-a] `reach` 가 `currentTime` 에 안 흔들린다 (봉투는 궤적을 못 넘는다)',
     ru.length + '종');
  const capSrcC = fs.readFileSync(CAP, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(/shot\([^)]*fixed\)/.test(capSrcC) && /if \(!fixed && r\.clip\) fixed = r\.clip;/.test(capSrcC),
     '[C-b] 드라이버가 첫 장의 클립을 뒤 장에 물린다 (호스트가 흔들려도 구조적으로 같은 상자)');

  /* ── [D] 손 상수 0 ── */
  blk('[D] 뿌리 재발 방지 — 클립 여유를 손으로 다시 적지 않았는가');
  const src = fs.readFileSync(CAP, 'utf8');
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '');           /* 주석 안의 «M=160» 서술은 기록이다 */
  ok(!/const\s+M\s*=\s*\d/.test(body), '[D-a] `const M = <숫자>` 클립 여유 상수가 없다');
  ok(/clipFor\s*\(/.test(body) && /reach/.test(body),
     '[D-b] 클립이 `clipFor` + 제품이 낸 `reach` 로 정해진다');
  ok(/module\.exports\s*=\s*\{[^}]*clipFor/.test(body),
     '[D-c] 규칙이 내보내진다 — 자가 사본을 안 적는다(402)');

  /* ── [R] 되돌림 시험 ── */
  blk('[R] 되돌림 시험 — 종전 규칙(M=' + M_OLD + ')으로는 [B-a] 가 빨갛다');
  let rOut = 0, rTot = 0;
  if (r2280 && r2280.hostScr) {
    const h = r2280.hostScr;
    const cx = Math.max(0, h.x - M_OLD), cy = Math.max(0, h.y - M_OLD);
    const old = { x: cx, y: cy,
                  width: Math.min(1080 - cx, h.w + 2 * M_OLD), height: Math.min(2280 - cy, h.h + 2 * M_OLD) };
    info('종전 클립', old.x + ',' + old.y + ' ' + old.width + '×' + old.height);
    for (const b of r2280.scr) { rTot++; if (!holds(old, b)) rOut++; }
  }
  ok(rOut > 0, '[R-a] 종전 클립은 알을 잘랐다 — 수리가 «허용치 넓히기» 가 아님', rOut + '/' + rTot);
  ok(clipNew && clipNew.height > (r2280 ? r2280.hostScr.h + 2 * M_OLD : 0),
     '[R-b] 새 클립이 종전보다 세로로 크다 — 커진 만큼이 잘리던 양이다');

  /* ── [E] 콘솔 ── */
  blk('[E] 콘솔');
  ok(errs.length === 0, '[E-a] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY817 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
