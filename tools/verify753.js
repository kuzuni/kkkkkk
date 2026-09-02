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
  const envPeak = mR && boxHalf ? 0.78 * Number(mR[2]) + boxHalf : 1e9;
  ok(!!mR && !!mBox && envPeak <= 100.5,
     'A3 ★ `RW_GAIN_R1` 이 **이웃 칸 산수 안**이다 — 0.78·R1 + 상자반폭 ≤ 100.5(봉투 52% 지점이 최댓값)',
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

  /* ── [B] 자리 — 찍힌 픽셀 ─────────────────────────────────────────── */
  blk('B] 자리 — **찍힌 잉크**로 «알 중심 = 아이콘 중심»(350 규칙)');
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
  const pInk = (geo && fired) ? await inkOf(geo.clip, h => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.visibility = h ? 'hidden' : '';
  }) : null;
  await ev(p, () => { if (window.__oldBye) { window.fxBye = window.__oldBye; delete window.__oldBye; } });
  ok(!!icInk && !!pInk, 'B0 전제 — 아이콘·알 두 잉크를 다 찍었다',
     (icInk ? Math.round(icInk.w) + '×' + Math.round(icInk.h) : '—') + ' / '
     + (pInk ? Math.round(pInk.w) + '×' + Math.round(pInk.h) : '—'));
  if (icInk && pInk) {
    const s = geo.scale || 1;
    const dx = (pInk.cx - icInk.cx) / s, dy = (pInk.cy - icInk.cy) / s;
    ok(Math.hypot(dx, dy) <= EPS_C,
       'B1 ★ **알 잉크 중심 = 아이콘 잉크 중심**(±' + EPS_C + 'px · 753 ③ «유물 위치에서»)',
       'Δ ' + dx.toFixed(2) + ', ' + dy.toFixed(2) + ' = ' + Math.hypot(dx, dy).toFixed(2) + 'px');
    /* ⏸ 실패 아님 — 683 5회차가 남긴 «라벨 가림» 축을 값으로만 찍는다(326 `ck199` 꼴).
       알 잉크는 683 이 세운 여덟 방향 흰 테 + 6px 글로우 때문에 글리프보다 넓게 찍힌다. */
    info('⏸ 알 찍힌 잉크 ÷ 아이콘 찍힌 잉크',
         (pInk.w / icInk.w).toFixed(3) + ' × ' + (pInk.h / icInk.h).toFixed(3)
         + ' (글리프는 항등 — 차이는 `.fx-rlic` 의 흰 테·글로우 몫)');
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
