/* 작업 753 게이트 — «683 유물 획득 파티클 스펙 보강 3항 + 주인 보강 1항»
 *
 *   node tools/verify753.js
 *
 * 주인 원문(2026-09-02 05:30): «유물소환으로 유물에 뜨는 이펙트도 캔슬 되지 말라하고, 유물에 뜨는
 *   파티클 크기 유물 아이콘이랑 크기 똑같게 하고, 한번 강화당 알갱이 하나 뜨고 유물 위치에서
 *   터지게 하기 주변에서 터지지 말고»  ·  보강(05:32): «랜덤방향으로 터지게 하기»
 *
 * 절 = 주인의 네 항 + 되돌림:
 *   [A] 선언  — 네 항이 «이름 있는 상수·파생» 으로 서 있다(손 상수 금지)
 *   [B] 자리  — **찍힌 픽셀**로 «알 잉크 중심 = 아이콘 잉크 중심»(350 규칙 · 상자로 재면 테두리 4px 이 빠진다)
 *   [C] 개수  — 획득 N회 → 알 정확히 N개(첫 발·홀드 같은 값)
 *   [D] 크기  — 알 글리프 = 그 칸 아이콘 글리프(같은 font-size · 등방 상자)
 *   [E] 수명  — 캔슬 금지: 홀드 틱의 알도 공용 수명을 그대로 산다 · 봉투가 실제로 끝까지 산다
 *   [F] 방향  — 매번 랜덤(사분면 ≥3 · 연속 각 차가 고정 증분이 아니다) · 아래쪽 배제 섹터가 실제로 빈다
 *   [R] 되돌림 — 손잡이를 옛 683 값으로 되돌리면 위 항이 **실제로 빨개진다**(헛초록이 아니다)
 *
 * ⚑ 이 자가 683 의 `verify683` 와 겹치지 않는 자리는 **[B] 와 [R]** 이다 —
 *   [B] 는 DOM 이 아니라 화면에 «찍힌» 잉크를 재고(683 이 다섯 번 «자가 제품보다 자주 틀린다» 를
 *   배운 자리), [R] 은 이 회차가 바꾼 네 손잡이를 하나씩 되돌려 자가 무엇을 지키는지 보인다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const HOLD = Number(process.env.V753_HOLD || 6000);
const EPS_C = 2.0;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

const WATCH = () => {
  window.__v753 = { bursts: [] };
  const L = () => document.getElementById('fxl');
  const scan = seen => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      const cls = nd.className + '';
      if (!/fx-spark/.test(cls)) continue;
      out.push({ gain: /fx-rlic/.test(cls),
                 x: parseFloat(nd.style.left), y: parseFloat(nd.style.top),
                 w: parseFloat(nd.style.width) || 0, h: parseFloat(nd.style.height) || 0,
                 fs: parseFloat(nd.style.fontSize) || 0,
                 dur: nd.style.animationDuration || '',
                 dx: parseFloat(nd.style.getPropertyValue('--dx')) || 0,
                 dy: parseFloat(nd.style.getPropertyValue('--dy')) || 0,
                 txt: (nd.textContent || '').trim() });
    }
    return out;
  };
  const cards = () => {
    const g = document.getElementById('rwGrid'), out = {};
    if (!g || typeof fxRect !== 'function') return out;
    for (const el of g.querySelectorAll('[data-rw]')) {
      const r = fxRect(el), i = el.querySelector('i');
      if (!r) continue;
      const cs = i ? getComputedStyle(i) : null, ri = i ? fxRect(i) : null;
      out[el.getAttribute('data-rw')] = { r, ri, fs: cs ? parseFloat(cs.fontSize) : 0,
                                          lh: cs ? parseFloat(cs.lineHeight) : 0 };
    }
    return out;
  };
  const o = window.rwSummonFx;
  if (typeof o !== 'function') return false;
  window.rwSummonFx = function (it, first) {
    const l = L(), seen = new Set(l ? l.children : []);
    const rc = cards();
    const r = o.apply(this, arguments);
    window.__v753.bursts.push({ id: it && it.id, ic: it && it.ic, first: !!first, cards: rc, born: scan(seen) });
    return r;
  };
  return true;
};
const RESET = () => { window.__v753.bursts = [];
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

/* 찍힌 픽셀을 페이지로 되돌려 읽는다(350 처방) */
const READ = async (page, buf) => page.evaluate(u => new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    res({ w: img.width, h: img.height, d: Array.from(g.getImageData(0, 0, img.width, img.height).data) });
  };
  img.src = u;
}), 'data:image/png;base64,' + buf.toString('base64'));

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const src = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  blk('A] 선언 — 네 항이 상수·파생으로 서 있다(손 상수 금지)');
  const mN = src.match(/const RW_GAIN_N0 = (\d+), RW_GAIN_N = (\d+);/);
  ok(!!mN && mN[1] === '1' && mN[2] === '1',
     'A1 ★ 알 수가 첫 발·홀드 **둘 다 1**이다(753 ③ «한번 강화당 알갱이 하나»)',
     mN ? ('N0 ' + mN[1] + ' · N ' + mN[2]) : '상수를 못 찾았다');
  const mR = src.match(/const RW_GAIN_R0 = (\d+), RW_GAIN_R1 = (\d+);/);
  ok(!!mR && Number(mR[1]) === 0,
     'A2 ★ 탄생 반경 `RW_GAIN_R0` 가 **0**이다 — 링이 아니라 한 점(753 ③ «주변에서 터지지 말고»)',
     mR ? ('R0 ' + mR[1] + ' · R1 ' + mR[2]) : '상수를 못 찾았다');
  /* ⚑ R1 은 취향이 아니라 이웃 칸이 정한다 — 봉투 최댓값(52% 지점)이 100.5 를 안 넘어야 한다.
     알 상자 = round(fs × RW_GAIN_BOX) 이고 fs 는 그 칸 아이콘 값(126)이다. */
  const mBox = src.match(/const RW_GAIN_BOX = ([\d.]+);/);
  const boxHalf = mBox ? 126 * parseFloat(mBox[1]) / 2 : 0;
  /* ⚑ 753 7회차 — 봉투가 공용 `fxSpark`(52% 고원)에서 **전용 `fxRlic`** 으로 바뀌면서 최댓값의 자리도
     옮겨 갔다: 세 지점(0% t0·s1 · 35% t.55·s.72 · 100% t1·s.45) 중 **탄생 프레임**이 가장 넓다
     (= 아이콘 자기 발자국). 런타임 축은 [G4] 가 살아 있는 애니에게 직접 묻는다. */
  const d1 = mR ? Number(mR[2]) : 0;
  const envPeak = (mR && boxHalf)
    ? Math.max(boxHalf, 0.55 * d1 + 0.72 * boxHalf, d1 + 0.45 * boxHalf) : 1e9;
  ok(!!mR && !!mBox && envPeak <= 100.5,
     'A3 ★ `RW_GAIN_R1` 이 **이웃 칸 산수 안**이다 — `fxRlic` 세 지점의 최대 뻗음 ≤ 100.5',
     '봉투 최대 ' + (envPeak === 1e9 ? '—' : envPeak.toFixed(1)) + 'px ≤ 100.5');
  ok(/fxBurst\(el, col, n, true, null, PAY_CUR\.relic\)/.test(src)
     && !/rwGainFx\([^)]*iv[^)]*\)/.test(src),
     'A4 ★ 획득 버스트에 `iv` 를 **어느 경로에서도 안 넘긴다**(753 ① 캔슬 금지 · `fxTickLife` 를 안 탄다)');
  ok(/const s3 = Math\.round\(fs \* RW_GAIN_BOX\);/.test(src) && /nd\.style\.fontSize = fs \+ 'px';/.test(src)
     && /const fs = cs \? parseFloat\(cs\.fontSize\) : 0;/.test(src),
     'A5 ★ 크기를 **그 칸 아이콘의 computed font-size 에서 파생**시킨다(753 ② · 402 «표 두 벌» 방지)');
  const mD = src.match(/const RW_GAIN_DOWN = ([\d.]+);/);
  ok(!!mD && /const u = \(0\.25 \+ RW_GAIN_DOWN \/ 2 \+ u0 \* \(1 - RW_GAIN_DOWN\)\) % 1;/.test(src),
     'A6 방향 난수에 아래쪽 배제 섹터가 이름 있는 상수로 붙어 있다(683 5회차 처방 · 0 이면 온 원)',
     mD ? 'RW_GAIN_DOWN = ' + mD[1] : '상수를 못 찾았다');
  ok(/const cx = ri\.x \+ ri\.w \/ 2, cy = ri\.y \+ \(\(lh > 0\) \? lh \/ 2 : ri\.h \/ 2\);/.test(src),
     'A7 ★ 자리를 **`<i>` 패딩 상자 + line-height/2** 에서 뽑는다 — 칸 상자로 재면 테두리 4px 이 빠진다');

  /* ── 측정 ─────────────────────────────────────────────────────────── */
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);

  const cdp = await p.context().newCDPSession(p);
  const box = async sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const holdTouch = async (c, ms) => {
    if (!c) return;
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
  };

  const SPARK = (await ev(p, () => (typeof FXSPARK_MS === 'number') ? FXSPARK_MS : 0)) || 0;
  const armed = await ev(p, WATCH);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const BS = (await ev(p, () => window.__v753.bursts)) || [];
  const G = b => b.born.filter(q => q.gain);
  const all = [];
  for (const b of BS) for (const q of G(b)) all.push({ b, q });

  /* ── [C] 개수 ─────────────────────────────────────────────────────── */
  blk('C] 개수 — 획득 N회 → 알 정확히 N개');
  ok(armed === true && BS.length >= 6, 'C0 전제 — 관찰자·홀드가 실제로 돌았다', BS.length + '회');
  const cnts = BS.map(b => G(b).length);
  ok(BS.length > 0 && cnts.every(c => c === 1),
     'C1 ★ **버스트마다 획득 알이 정확히 1개**(753 ③)',
     cnts.filter(c => c === 1).length + '/' + cnts.length + ' · ' + cnts.join('·'));
  ok(all.length > 0 && all.every(({ q, b }) => q.txt === (b.ic || '')),
     'C2 알의 글리프가 **그 회차에 획득한 유물**의 것이다', '어긋난 알 '
     + all.filter(({ q, b }) => q.txt !== (b.ic || '')).length);

  /* ── [D] 크기 ─────────────────────────────────────────────────────── */
  blk('D] 크기 — 알 글리프 = 그 칸 아이콘 글리프(753 ②)');
  let fsBad = 0, sqBad = 0, icFs = 0, szMax = 0;
  for (const { b, q } of all) {
    const c = b.cards[b.id]; if (!c) continue;
    icFs = c.fs || icFs; szMax = Math.max(szMax, q.w);
    if (!(c.fs > 0 && Math.abs(q.fs - c.fs) <= 0.5)) fsBad++;
    if (Math.abs(q.w - q.h) > 1 || q.w < q.fs) sqBad++;
  }
  ok(all.length > 0 && fsBad === 0,
     'D1 ★ 알 font-size = 그 칸 아이콘 font-size(같은 글리프 ⇒ 찍히는 잉크가 **항등**)',
     '어긋난 알 ' + fsBad + ' · 아이콘 ' + icFs + 'px');
  ok(all.length > 0 && sqBad === 0,
     'D2 알 상자가 **정사각**이고 글리프를 담는다(등방 · 356 규약 · [D3] 619 가둠 어휘)',
     '어긋난 알 ' + sqBad + ' · 상자 최대 ' + Math.round(szMax) + 'px');

  /* ── [E] 수명 ─────────────────────────────────────────────────────── */
  blk('E] 수명 — 캔슬 금지(753 ① · 660 보강2 «날아가던 입자는 수명 끝까지»)');
  const cut = all.filter(({ q }) => q.dur && Math.abs(parseFloat(q.dur) - SPARK) > 1);
  ok(all.length > 0 && cut.length === 0,
     'E1 ★ 홀드 틱의 알도 **수명을 안 자른다**(수리 전 45~76ms 가 빨개지는 자리)',
     '잘린 알 ' + cut.length + '/' + all.length + ' · 공용 수명 ' + SPARK + 'ms');
  /* 봉투가 실제로 끝까지 사는가 — 한 발을 쏘고 공용 수명의 80% 지점에 아직 노드가 있는가 */
  const alive = await ev(p, async ms => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const it = RELICS[0]; rwSummonFx(it, true);
    await new Promise(r => setTimeout(r, Math.round(ms * 0.8)));
    return document.querySelectorAll('#fxl .fx-rlic').length;
  }, SPARK);
  ok(alive >= 1, 'E2 ★ 한 발이 공용 수명의 80% 시점에도 **살아 있다**(조기 소멸 0)', '알 ' + alive);

  /* ── [F] 방향 ─────────────────────────────────────────────────────── */
  blk('F] 방향 — 매번 랜덤(주인 보강 05:32) · 아래쪽 배제 섹터');
  const angs = all.map(({ q }) => (Math.atan2(q.dy, q.dx) * 180 / Math.PI + 360) % 360);
  const q4 = new Set(angs.map(a => Math.floor(a / 90)));
  ok(angs.length >= 6 && q4.size >= 3, 'F1 ★ 방향이 사분면 3개 이상에 흩어진다', q4.size + '/4 · 표본 ' + angs.length);
  const df = [];
  for (let i = 1; i < angs.length; i++) df.push((angs[i] - angs[i - 1] + 360) % 360);
  const mu = df.length ? df.reduce((a, b) => a + b, 0) / df.length : 0;
  const sd = df.length ? Math.sqrt(df.reduce((a, b) => a + (b - mu) * (b - mu), 0) / df.length) : 0;
  ok(df.length >= 5 && sd >= 10,
     'F2 ★ 연속 각 차가 «고정 증분» 이 아니다(표준편차 ≥ 10°) — 주인 «고정 패턴이면 빨강»',
     '평균 ' + mu.toFixed(1) + '° · 표준편차 ' + sd.toFixed(1) + '°');
  /* 배제 섹터가 실제로 비는가 — `RW_GAIN_DOWN` 이 0 이면 이 항은 «온 원» 을 허용한다 */
  const D0 = mD ? parseFloat(mD[1]) : 0;
  const lo = 90 - (D0 / 2) * 360, hi = 90 + (D0 / 2) * 360;
  const inDown = angs.filter(a => a > lo && a < hi).length;
  ok(D0 <= 0 || inDown === 0,
     'F3 아래쪽 배제 섹터(' + lo.toFixed(0) + '°~' + hi.toFixed(0) + '°)가 실제로 비어 있다 — 라벨 훑기 방지',
     '들어온 알 ' + inDown + '/' + angs.length);

  /* ── [G] 봉투 — 전용 곡선이 «불투명 구간 안에서 이미 줄어든다» + 취소선 0 ──────────── */
  blk('G] 봉투 — 전용 곡선(`fxRlic`) · 취소선 0(753 7회차 · 비평가 2인 공통)');
  /* ⚑ 계수를 자에 적지 않고 **살아 있는 애니에게 직접 물어본다** — 한 발을 쏘고 `currentTime` 을
     0~수명으로 걸어 그때그때의 `getBoundingClientRect`(변환이 반영된다)를 읽는다. 곡선을 바꿔도
     이 절은 따라오고, 값을 두 벌로 적지 않는다(402 규약). */
  const env = await ev(p, () => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    window.__oldBye2 = window.fxBye; window.fxBye = () => null;
    const el = document.querySelector('#rwGrid [data-rw]');
    rwGainFx(RELICS[0], el, true);
    const nd = document.querySelector('#fxl .fx-rlic');
    if (!nd) { window.fxBye = window.__oldBye2; return null; }
    /* ⚠ `getComputedStyle` 은 **살아 있는 객체**다 — 아래에서 노드를 걷어 낸 뒤 읽으면 빈 문자열이 온다.
       그래서 문자열로 **지금 뽑아 둔다**(1회차에 [G1][G2] 가 그것 때문에 빨갰다). */
    const cs0 = getComputedStyle(nd);
    const cs = { textDecorationLine: cs0.textDecorationLine + '', animationName: cs0.animationName + '' };
    const anims = nd.getAnimations();
    const dur = anims.length ? (anims[0].effect.getComputedTiming().activeDuration || 0) : 0;
    const cb = el.getBoundingClientRect();
    const cx = cb.left + cb.width / 2, cy = cb.top + cb.height / 2;
    const sc = cb.width / 151;
    const out = [];
    for (let i = 0; i <= 10; i++) {
      const T = dur * i / 10;
      for (const a of anims) { try { a.pause(); a.currentTime = T; } catch (_) {} }
      const b = nd.getBoundingClientRect();
      const far = Math.max(Math.hypot(b.left - cx, b.top - cy), Math.hypot(b.right - cx, b.top - cy),
                           Math.hypot(b.left - cx, b.bottom - cy), Math.hypot(b.right - cx, b.bottom - cy));
      out.push({ T: Math.round(T), w: b.width / sc, far: far / sc, op: parseFloat(getComputedStyle(nd).opacity) });
    }
    for (const nd2 of L.querySelectorAll('.fx-rlic')) nd2.remove();
    window.fxBye = window.__oldBye2;
    return { dur, td: cs.textDecorationLine, name: cs.animationName, rows: out };
  });
  ok(!!env && env.name === 'fxRlic', 'G1 ★ 획득 알이 **전용 봉투(`fxRlic`)** 를 탄다(공용 `fxSpark` 는 안 건드린다)',
     env ? env.name : '—');
  ok(!!env && /none/.test(env.td),
     'G2 ★ 취소선 0 — `<s>` 기본값 `line-through` 가 126px 에서 **156×12px 검정 막대**로 찍히던 자리',
     env ? env.td : '—');
  if (env && env.rows.length) {
    const r0 = env.rows[0], half = env.rows.length >> 1;
    info('봉투', env.rows.map(r => r.T + 'ms w' + r.w.toFixed(0) + '/α' + r.op.toFixed(2)).join(' · '));
    /* «앞구간에서 이미 줄어든다» — 자를 **시각**으로 든다.
       ⚠ 9회차에 α 기준(«α≥0.5 구간»)을 시각 기준으로 옮겼다: 출생 α 를 .55 로 낮추자 그 창이
       한 표본으로 쪼그라들어 **문턱이 아니라 창이 사라지는** 꼴이 됐다(자가 무르게 풀린 것이 아니라
       재는 구간이 증발한 것이다). 묻는 것(«고원이 없는가»)은 그대로다 — 수명의 앞 35% 를 본다. */
    const early = env.rows.filter(r => r.T <= env.dur * 0.35);
    const last = early.length ? early[early.length - 1] : r0;
    const shrink = 1 - last.w / r0.w;
    ok(shrink >= 0.15,
       'G3 ★ **수명의 앞 35% 안에서 이미 15% 이상 줄어든다** — 공용 곡선의 «198ms 정지 고원» 이 빨개지는 자리',
       't=' + last.T + 'ms · 폭 ' + r0.w.toFixed(0) + ' → ' + last.w.toFixed(0)
       + 'px (−' + (shrink * 100).toFixed(0) + '%)');
    /* ⚑ 9회차 신설 — 비평가 2인 공통 «출생 불투명도 0.55». 태어나는 순간 알이 칸을 통째로 덮지 않는다. */
    ok(r0.op <= 0.6,
       'G5 ★ **출생 불투명도 ≤ 0.6** — 알이 아이콘과 같은 모양·크기·자리라 α1.00 이면 칸이 단색 실루엣이 된다(비평가 2인 공통)',
       'α(t=0) = ' + r0.op.toFixed(2));
    const far = Math.max(...env.rows.map(r => r.far));
    ok(far <= 100.5 * Math.SQRT2 + 1,
       'G4 봉투 어느 순간에도 알 상자 모서리가 이웃 칸 대각(142.1px) 밖으로 안 나간다',
       '최대 모서리 반경 ' + far.toFixed(1) + 'px');
  }

  /* ── [B] 자리 — 찍힌 픽셀 ─────────────────────────────────────────── */
  /* ⚑⚑ 820(2026-09-02) — **이 절의 자를 갈아 끼웠다. 제품은 0줄.**
     옛 [B1] 은 «알 잉크(후광 포함) 중심 ↔ 아이콘 잉크(후광 없음) 중심» 이라 **두 마스크가 서로
     달랐다** — 알에만 붙은 `.fx-rlic` 의 마지막 층(`drop-shadow(0 0 6px var(--c))`)은 **반투명**이라
     배경 대비에 따라 문턱을 넘는 거리가 방향마다 다르고, 그래서 «자리» 가 아니라 «글로우 색» 을 쟀다.
     `probe820` 이 그것을 찍힌 픽셀로 못박았다(A3-ⓔ «마스크가 다르면 다른 것을 잰다»):
       · 상자 중심(`rwGainFx` 의 cx·cy) ↔ `<i>` 줄상자 중심 **Δ 0.00, −0.05px** — 자리는 옳다.
       · 후광을 끈 글리프끼리 **Δ 0.71px** · 불투명 흰 테까지 켠 잉크끼리 **Δ 0.00, −0.50px**.
       · **같은 노드·같은 자리인데 글로우 «색» 만 바꾸면 잉크 중심이 0.50 → 3.00px 로 움직인다**
         (앰버 폴백 0.50 · 검정 3.00 · 제품색 3.00) — 폭이 허용치(±2) 전체다.
       · «위가 그릇에 잘린다» 는 기각 — 잘렸다면 색과 무관해야 하는데 앰버에서는 상 12 ↔ 하 13 이다.
     ⚠ **허용치를 3 으로 넓혀서 닫지 않았다**(334 «무르게 푼 수리»). 대신 **한 항이 뭉개고 있던 둘을
     갈랐다** — [B1] «자리»(같은 마스크끼리) · [B2] «그려진 알도 중심에 있다»(불투명 층까지) ·
     [B3] **되돌림 시험**(3px 밀면 [B1] 이 실제로 빨개진다). 판정에서 뺀 합본 값은 [B4] 가 **매 실행
     숫자로 찍는다**(326 `ck199` 꼴) — 글로우가 진짜로 한쪽으로 쏠리면 그 수가 먼저 말한다. */
  blk('B] 자리 — **찍힌 잉크**로 «알 중심 = 아이콘 중심»(350 규칙 · 820 이 마스크를 갈랐다)');
  const inkOf = async (clip, hide) => {
    const A = await READ(p, await p.screenshot({ clip }));
    await ev(p, hide, true); await p.waitForTimeout(120);
    const Bb = await READ(p, await p.screenshot({ clip }));
    await ev(p, hide, false); await p.waitForTimeout(60);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
      const o = (y * A.w + x) * 4;
      if (Math.abs(A.d[o] - Bb.d[o]) + Math.abs(A.d[o + 1] - Bb.d[o + 1]) + Math.abs(A.d[o + 2] - Bb.d[o + 2]) > 24) {
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return n < 40 ? null : { cx: clip.x + (x0 + x1) / 2, cy: clip.y + (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1, n };
  };
  const geo = await ev(p, () => {
    const el = document.querySelector('#rwGrid [data-rw]'); const b = el.getBoundingClientRect();
    document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} });
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    return { clip: { x: Math.max(0, b.left - 90), y: Math.max(0, b.top - 90), width: b.width + 180, height: b.height + 180 },
             scale: b.width / 151, id: el.getAttribute('data-rw') };
  });
  const icInk = geo ? await inkOf(geo.clip, h => { const i = document.querySelector('#rwGrid [data-rw] i'); if (i) i.style.visibility = h ? 'hidden' : ''; }) : null;
  const fired = await ev(p, id => {
    const it = RELICS.find(r => r.id === id); if (!it) return false;
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    /* `fxBye` 는 setTimeout 이라 애니를 멈춰도 노드를 걷어 간다 — 이 절 동안만 끈다 */
    window.__oldBye = window.fxBye; window.fxBye = () => null;
    rwSummonFx(it, true);
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.target;
      if (t && L && L.contains(t)) { try { a.pause(); a.currentTime = 0; } catch (_) {} }
    }
    return document.querySelectorAll('#fxl .fx-rlic').length === 1;
  }, geo && geo.id);
  /* 한 번 띄운 그 알을 **세 겹으로** 잰다 — 다시 띄우면 `fxFlash` 가 마스크에 섞인다.
     겹은 CSS 에서 **파생**시킨다(402 «표 두 벌» 규약) — 계산된 `filter` 의 **마지막 drop-shadow**
     하나가 소프트 글로우이므로 그 자리에서 끊는다. 손으로 사슬을 다시 적으면 CSS 가 바뀔 때 조용히 갈린다. */
  const layers = fired ? await ev(p, () => {
    const nd = document.querySelector('#fxl .fx-rlic'); if (!nd) return null;
    const f = getComputedStyle(nd).filter || '';
    const cut = f.lastIndexOf('drop-shadow(');
    return { full: f, ring: cut > 0 ? f.slice(0, cut).trim() : '', tail: cut > 0 ? f.slice(cut) : '',
             n: (f.match(/drop-shadow\(/g) || []).length };
  }) : null;
  const paint = async css => ev(p, f => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.filter = f;
  }, css);
  const inkEgg = async () => inkOf(geo.clip, h => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.visibility = h ? 'hidden' : '';
  });
  const pInk = (geo && fired) ? await inkEgg() : null;          /* 그려진 그대로(합본 — [B4] 기록용) */
  let rInk = null, gInk = null, bInk = null;
  if (geo && fired && layers && layers.ring) {
    await paint(layers.ring); await p.waitForTimeout(80);
    rInk = await inkEgg();                                       /* 불투명 흰 테까지 */
    await paint('brightness(0)'); await p.waitForTimeout(80);
    gInk = await inkEgg();                                       /* 글리프만 */
    await paint('');
  }
  const s = geo ? (geo.scale || 1) : 1;
  const dOf = (a, b) => ({ dx: (a.cx - b.cx) / s, dy: (a.cy - b.cy) / s,
                           d: Math.hypot((a.cx - b.cx) / s, (a.cy - b.cy) / s) });
  ok(!!icInk && !!gInk && !!rInk && !!layers && layers.n >= 5 && /\d+(\.\d+)?px\)?\s*$/.test(layers.tail || 'x'),
     'B0 전제 — 아이콘·알을 **같은 마스크로** 찍었다(글리프 · 흰 테 · 합본 세 겹 · 겹은 CSS 에서 파생)',
     (icInk ? icInk.w + '×' + icInk.h : '—') + ' / 글리프 ' + (gInk ? gInk.w + '×' + gInk.h : '—')
     + ' / 흰 테 ' + (rInk ? rInk.w + '×' + rInk.h : '—')
     + ' · drop-shadow ' + (layers ? layers.n : 0) + '겹');
  if (icInk && gInk) {
    const g = dOf(gInk, icInk);
    ok(g.d <= EPS_C,
       'B1 ★ **알 글리프 잉크 중심 = 아이콘 글리프 잉크 중심**(±' + EPS_C + 'px · 753 ③ «유물 위치에서»)'
       + ' — 820: 후광을 뺀 **같은 마스크**끼리 잰다',
       'Δ ' + g.dx.toFixed(2) + ', ' + g.dy.toFixed(2) + ' = ' + g.d.toFixed(2) + 'px');
  }
  /* ⚑⚑ 683 11회차 — **[B2] 를 둘로 갈랐다(지우지 않았다 · 333 처방).**
     이 항은 «후광이 대칭인가» 를 묻는데 재는 것은 «화면에 그려진 알» 이었다. 둘은 **전경이 없을
     때만** 같은 말이다 — 683 11회차가 `.fx-keep-top`(89 유물 «Lv.n» 라벨 패치)을 알 «위» 로
     올리면서 라벨 글리프가 알의 아래 테를 **정당하게** 가린다(그래야 되살린 글자를 알이 다시
     안 씻는다 · `probe683d` [3]). 그 순간 이 한 항이 두 가지를 한 숫자에 섞는다:
       ⓐ **알 자신이 중심에 대칭으로 그려졌는가**(820 이 묻고 싶었던 것) — [B2]
       ⓑ **전경이 먹는 몫이 얼마인가**(11회차가 새로 만든 대가) — [B2b] 래칫
     ⇒ ⓐ 는 전경을 숨기고 재고(= 종전의 뜻 그대로 · 실측 0.50px), ⓑ 는 그려진 그대로 재서
       **조이는 쪽으로만 다시 적는다**(실측 2.50px → 문턱 3.0). 문턱을 넓혀 초록을 산 것이 아니라
       **한 항이 답하던 두 물음을 각자의 항으로 갈랐다** — ⓐ 의 문턱(EPS_C 2.0)은 한 칸도 안 넓혔고,
       [B3] 되돌림(3px 밀기)이 잡는 것도 ⓐ 축 그대로다.
     되돌림: `index.html` 의 `.fx-keep.fx-keep-top` 선언을 지우면 ⓑ 가 0.50 으로 내려간다. */
  const EPS_FG = 3.0;
  /* §R 사본 — 11회차 선언 한 줄(`.fx-keep.fx-keep-top{z-index:1}`)만 되돌리고 **같은 절차로 다시 띄워** 잰다.
     ⚠ 살아 있는 프레임에서 패치를 `display:none` 으로 지워 재는 길은 **안 쓴다** — 첫 시안이 그렇게 했다가
       그 사이의 페인트 왕복에 알이 움직여 «전경 몫» 자리에 그 이동이 섞였다(−6.00px 라는 없는 수).
     ⚠ `visibility` 로도 못 끈다 — 패치 사본은 `getComputedStyle` 전 항을 인라인으로 물려받아
       **`visibility:visible` 을 자기가 들고 있다**(그릇만 숨겨도 안 숨는다). */
  if (geo && fired && layers && layers.ring) {
    await ev(p, () => { const s = document.createElement('style'); s.id = '__r683r11';
      s.textContent = '.fx-keep.fx-keep-top{z-index:auto}'; document.head.appendChild(s); });
    const re = await ev(p, id => {
      const it = RELICS.find(r => r.id === id); if (!it) return false;
      const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
      rwSummonFx(it, true);
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.target;
        if (t && L && L.contains(t)) { try { a.pause(); a.currentTime = 0; } catch (_) {} }
      }
      return document.querySelectorAll('#fxl .fx-rlic').length === 1;
    }, geo.id);
    if (re) { await paint(layers.ring); await p.waitForTimeout(80); bInk = await inkEgg(); await paint(''); }
    await ev(p, () => { const s = document.getElementById('__r683r11'); if (s) s.remove(); });
  }
  /* ⚑⚑ 683 12회차 — **«12회차 페이드를 되돌린» 사본**(11회차 선언은 그대로 살린다).
     12회차가 플래시를 라벨 띠에서 빼자 라벨 글리프가 알 위에 놓여도 알의 잉크가 안 잘린다 —
     즉 11회차가 치른 «전경 몫» 대가가 **0 으로 사라졌다**(2.00px → 0.00px). 그러면 옛 [B2c]
     («11회차 선언을 되돌리면 [B2b] 가 움직인다»)는 전제가 사라져 헛빨강이 된다.
     ⇒ 축을 지우지 않고 **되돌릴 대상을 12회차 쪽으로 옮긴다**(333 처방): 페이드를 되돌리면
       전경 몫이 되살아나야 하고([B2c]), 지금 제품에서는 대가가 0 이어야 한다([B2d]).
     ⚠ 인라인 마스크는 `!important` 로만 눌린다(사본이 자기 style 로 들고 있다 — 11회차 §R 함정과 같은 꼴). */
  let fInk = null;
  if (geo && fired && layers && layers.ring) {
    await ev(p, () => { const s = document.createElement('style'); s.id = '__r683r12';
      s.textContent = '.fx-flash{-webkit-mask-image:none !important;mask-image:none !important}';
      document.head.appendChild(s); });
    const re2 = await ev(p, id => {
      const it = RELICS.find(r => r.id === id); if (!it) return false;
      const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
      rwSummonFx(it, true);
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.target;
        if (t && L && L.contains(t)) { try { a.pause(); a.currentTime = 0; } catch (_) {} }
      }
      return document.querySelectorAll('#fxl .fx-rlic').length === 1;
    }, geo.id);
    if (re2) { await paint(layers.ring); await p.waitForTimeout(80); fInk = await inkEgg(); await paint(''); }
    await ev(p, () => { const s = document.getElementById('__r683r12'); if (s) s.remove(); });
  }
  if (icInk && bInk) {
    const r = dOf(bInk, icInk);
    ok(r.d <= EPS_C,
       'B2 ★ **후광 자체가 중심에 대칭이다**(±' + EPS_C + 'px · 820 이 묻던 그 성질) — '
       + '683 11회차: 전경 한 줄을 되돌린 사본에서 잰다',
       'Δ ' + r.dx.toFixed(2) + ', ' + r.dy.toFixed(2) + ' = ' + r.d.toFixed(2) + 'px');
  }
  if (icInk && rInk && bInk) {
    const r = dOf(rInk, icInk), b = dOf(bInk, icInk);
    ok(r.d <= EPS_FG,
       'B2b ★ **전경(`.fx-keep-top` 라벨 패치)이 먹는 몫 래칫**(≤' + EPS_FG + 'px · 683 11회차 신설 · 실측 2.50) — '
       + '그려진 그대로의 알 중심. 늘면 라벨이 알을 더 가린 것이다(조이는 쪽으로만 다시 적어라)',
       '그린 대로 ' + r.d.toFixed(2) + 'px ↔ 후광 자체 ' + b.d.toFixed(2) + 'px · 전경 몫 '
       + (r.d - b.d).toFixed(2) + 'px');
    const f = fInk ? dOf(fInk, icInk) : null;
    ok(!!f && Math.abs(f.d - b.d) >= 0.5,
       'B2c ★ **되돌림 시험**(683 12회차 이관) — **12회차 페이드**를 되돌리면 [B2b] 가 실제로 움직인다(≥0.5px). '
       + '안 움직이면 이 자는 «언제나 초록» 인 헛초록이다',
       f ? ('페이드 되돌림 ' + f.d.toFixed(2) + 'px ↔ 후광 자체 ' + b.d.toFixed(2) + 'px = 차 '
            + Math.abs(f.d - b.d).toFixed(2) + 'px') : '측정 실패');
    ok(Math.abs(r.d - b.d) <= 0.3,
       'B2d ★ **12회차가 11회차의 대가를 없앴다**(신설) — 지금 제품에서는 11회차 선언을 되돌려도 알이 안 움직인다(≤0.3px). '
       + '플래시가 라벨 띠를 안 밝히니 라벨 글리프가 알 잉크를 안 자른다',
       '전경 몫 ' + (r.d - b.d).toFixed(2) + 'px (11회차 2.00px)');
  }
  /* 되돌림 시험 — 자가 «자리» 를 정말 재는지. 3px 밀면 [B1] 이 빨개져야 한다(334 처방). */
  if (geo && fired && gInk) {
    await ev(p, () => { for (const nd of document.querySelectorAll('#fxl .fx-rlic')) {
      nd.dataset.oldTop = nd.style.top; nd.style.top = (parseFloat(nd.style.top) + 3).toFixed(1) + 'px';
      nd.style.filter = 'brightness(0)'; } });
    await p.waitForTimeout(80);
    const mv = await inkEgg();
    await ev(p, () => { for (const nd of document.querySelectorAll('#fxl .fx-rlic')) {
      if (nd.dataset.oldTop !== undefined) { nd.style.top = nd.dataset.oldTop; delete nd.dataset.oldTop; }
      nd.style.filter = ''; } });
    const m = mv && icInk ? dOf(mv, icInk) : null;
    ok(!!m && m.d > EPS_C,
       'B3 ★ **되돌림 — 알을 3px 내리면 [B1] 이 실제로 빨개진다**(자가 «자리» 를 잰다는 증명 · 334)',
       m ? 'Δ ' + m.dx.toFixed(2) + ', ' + m.dy.toFixed(2) + ' = ' + m.d.toFixed(2) + 'px > ' + EPS_C : '—');
  }
  await ev(p, () => { if (window.__oldBye) { window.fxBye = window.__oldBye; delete window.__oldBye; } });
  if (icInk && pInk) {
    /* ⏸ 실패 아님 — 판정에서 뺀 «합본»(반투명 글로우 포함) 을 매 실행 숫자로 남긴다(326 `ck199` 꼴).
       이 수는 «자리» 가 아니라 «글로우가 어느 쪽으로 얼마나 번져 잡히는가» 다 — `probe820` 이
       같은 노드에서 색만 바꿔 0.50 ↔ 3.00 으로 흔들리는 것을 찍었다. 쏠림이 커지면 여기서 먼저 보인다. */
    const f = dOf(pInk, icInk);
    info('⏸ 합본(글로우 포함) Δ — 판정 축 아님',
         f.dx.toFixed(2) + ', ' + f.dy.toFixed(2) + ' = ' + f.d.toFixed(2) + 'px'
         + ' · 잉크비 ' + (pInk.w / icInk.w).toFixed(3) + ' × ' + (pInk.h / icInk.h).toFixed(3));
  }

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  blk('R] 되돌림 — 옛 683 값으로 되돌리면 위 항이 실제로 빨개진다');
  /* ⚑ 제품을 안 고치고 «옛 값» 을 그 자리에서 흉내 낸다 — `rwGainFx` 를 683 5회차 기하로 감싼다 */
  const rev = await ev(p, async () => {
    const out = {};
    const L = document.getElementById('fxl');
    const clear = () => { while (L && L.firstChild) L.removeChild(L.firstChild); };
    /* R1 — 옛 알 수(6)·옛 링(R0 38)·옛 크기(글리프 21px)로 되돌린 사본 */
    clear();
    const el = document.querySelector('#rwGrid [data-rw]'), it = RELICS[0];
    const r = fxRect(el), col = '#FFE07A';
    const before = new Set(L.children);
    fxBurst(el, col, 6, true, 240, PAY_CUR.relic);      /* iv 를 넘기면 수명이 잘린다(옛 홀드 경로) */
    const born = []; for (const nd of L.children) if (!before.has(nd)) born.push(nd);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    born.forEach((nd, j) => {
      nd.className = 'fx-spark fx-rlic'; nd.textContent = it.ic;
      const s3 = 28; nd.style.width = s3 + 'px'; nd.style.height = s3 + 'px';
      nd.style.margin = (-s3 / 2) + 'px 0 0 ' + (-s3 / 2) + 'px';
      nd.style.fontSize = Math.round(s3 * 0.74) + 'px';
      const a = (j + 0.5) / born.length * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      nd.style.left = (cx + ca * 38).toFixed(1) + 'px';
      nd.style.top = (cy + sa * 38).toFixed(1) + 'px';
      nd.style.setProperty('--dx', (ca * 48).toFixed(1) + 'px');
      nd.style.setProperty('--dy', (sa * 48).toFixed(1) + 'px');
    });
    const cs = getComputedStyle(el.querySelector('i'));
    const icFs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight);
    const ri = fxRect(el.querySelector('i'));
    const ax = ri.x + ri.w / 2, ay = ri.y + lh / 2;
    out.n = born.length;
    out.fs = born.length ? parseFloat(born[0].style.fontSize) : 0;
    out.icFs = icFs;
    out.r0 = born.length ? Math.hypot(parseFloat(born[0].style.left) - ax, parseFloat(born[0].style.top) - ay) : 0;
    out.cut = born.filter(nd => nd.style.animationDuration
                && Math.abs(parseFloat(nd.style.animationDuration) - FXSPARK_MS) > 1).length;
    out.ratio = born.length ? Math.hypot(parseFloat(born[0].style.getPropertyValue('--dx')),
                                         parseFloat(born[0].style.getPropertyValue('--dy'))) / out.fs : 0;
    clear();
    return out;
  });
  ok(!!rev && rev.n > 1, 'R1 ★ 되돌린 사본은 알이 **여럿**이다 — [C1] 이 그때 빨갛다', rev ? rev.n + '알' : '—');
  ok(!!rev && rev.fs > 0 && Math.abs(rev.fs - rev.icFs) > 0.5,
     'R2 ★ 되돌린 사본의 글리프는 아이콘과 **다른 크기**다 — [D1] 이 그때 빨갛다',
     rev ? (rev.fs + 'px vs 아이콘 ' + rev.icFs + 'px') : '—');
  ok(!!rev && rev.r0 > EPS_C,
     'R3 ★ 되돌린 사본은 **링에서 태어난다** — [B1]·[D7] 이 그때 빨갛다',
     rev ? ('탄생 반경 ' + rev.r0.toFixed(1) + 'px') : '—');
  ok(!!rev && rev.cut > 0,
     'R4 ★ 되돌린 사본(= `iv` 를 넘긴 옛 홀드 경로)은 **수명이 잘린다** — [E1] 이 그때 빨갛다',
     rev ? ('잘린 알 ' + rev.cut + '/' + rev.n) : '—');
  ok(!!rev && rev.ratio > 0.5,
     'R5 ★ 되돌린 사본은 **제 몸보다 멀리 간다**(주행 ÷ 글리프 > 0.5) — `verify683` [C4] 가 그때 빨갛다',
     rev ? rev.ratio.toFixed(2) + '배' : '—');

  blk('Z] 콘솔');
  ok(errs.length === 0, 'Z1 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY753 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
