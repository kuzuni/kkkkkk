/* 작업 682 게이트 — «유물 소환 버스트가 3방향 고정 → 랜덤 산포»
 *
 *   node tools/verify682.js
 *
 * 주인 원문: «유물소환 연속으로 하니까 3방향으로 입자 퍼지더라 랜덤이 아니라. 그거 수정해야할듯».
 * 등재문이 요구한 게이트 그대로다 — **① 방향 분포가 등분 고정이 아님(버스트 간 시퀀스 동일성)
 * ② 상향 반구(666 4회차) 제약 유지 ③ 되돌림.**
 *
 * ⚑ 이 자가 세는 것은 코드가 아니라 **찍힌 노드에 적힌 이동 벡터**다(`--dx/--dy`).
 *   버스트 경계는 `rwSummonFx` 를 **동기로** 감싸 가른다(MutationObserver 는 마이크로태스크라 뭉갠다).
 *   같은 감싸기를 `fxBurst` 에도 걸어 **후처리 전 원본 각**을 따로 들고 있는다 — [R1] 이 그 원본에
 *   **옛 뒤집기를 다시 걸어** «수리 전 그림» 을 제품 자기 알로 재현한다(사본 파일을 안 만든다).
 *
 * 절:
 *   [A] 구조 — 뒤집기 폐지 · 층화 난수 세 부품 · `RW_FX_UP` 이 죽은 상수가 아님(399 규약)
 *   [B] 산포 — 연속 버스트의 방향 시퀀스가 같지 않다 · 반구 6칸이 고르게 찬다
 *   [C] 겹침 — 한 버스트 안 갈래 수 = 알 수(접혀 포개지지 않는다)
 *   [D] 반구 — 666 4회차 상향 원뿔이 한 알도 안 새어 나간다
 *   [E] 불변 — 666 이 세운 축(스폰 = 버튼 · 이동 거리 · 1:1)을 이번 변경이 안 건드렸다
 *   [R] 되돌림 — R1 옛 뒤집기면 갈래가 준다 · R2 «지터만 키우는 가짜 수리» 로는 안 풀린다
 *              · R3 위상이 실제로 돈다
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const HOLD = 3200;
const GRID = 15;            /* 사람이 «같은 방향» 으로 읽는 폭(도) */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};
const r1 = v => Math.round(v * 10) / 10;

/* ── 각도 도구 ─────────────────────────────────────────────────────── */
const deg = b => b.map(q => Math.atan2(-q.dy, q.dx) * 180 / Math.PI);   /* 위쪽 = +90° */
/* 갈래 수 — 반올림 격자가 아니라 **묶기**로 센다(13° 떨어진 두 알이 칸 경계에 걸리면 반올림은 거짓말한다) */
const lanes = as => {
  if (!as.length) return 0;
  const s = [...as].sort((a, b) => a - b);
  let n = 1;
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] >= GRID) n++;
  return n;
};
const same = (a, b, tol) => {
  if (a.length !== b.length || !a.length) return false;
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
  return x.every((v, i) => Math.abs(v - y[i]) < tol);
};
const dupPairs = (list, tol) => {
  let d = 0;
  for (let i = 1; i < list.length; i++) if (same(list[i - 1], list[i], tol)) d++;
  return d;
};
/* 반구를 30° 칸 6개로 — 고정 각이면 늘 같은 칸만 찬다 */
const binsOf = as => {
  const b = new Array(6).fill(0);
  as.forEach(a => { const k = Math.min(5, Math.max(0, Math.floor(((a % 360) + 360) % 360 / 30))); b[k]++; });
  return b;
};

/* ── 페이지 안 관찰자 ──────────────────────────────────────────────── */
const WATCH = () => {
  window.__v682 = { fin: [], raw: [] };
  const L = () => document.getElementById('fxl');
  const scan = seen => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      if (!/fx-spark/.test(nd.className + '')) continue;
      /* ⚑⚑ 683 이관 — **이 화면에는 이제 이미터가 둘이다.** 682 가 재는 축(«3방향으로만 퍼진다»)은
         **지불 버스트 이미터**(원점 = 소환 버튼 · 상향 원뿔)의 것이고, 683(주인 지시 2026-09-02 00:33)이
         «획득 유물 카드» 를 원점으로 하는 획득 이미터를 따로 세웠다. 그쪽은 카드를 **둘러싸는 링**이라
         상향 원뿔([D])도 버튼 상자([E1])도 **일부러** 안 따른다 — 섞어 세면 [C][D][E1] 이 통째로
         빨개진다(이관 전 실측: 갈래 모자람 6/9 · 아래로 16알 · 밖 33/79).
         ⇒ 이 자는 지불 이미터만 본다. 획득 이미터는 `tools/verify683.js` 가 자기 축으로 단언한다.
         ⚠ **항을 하나도 안 지웠다**(333 처방) — 지불 알이 3방향으로 다시 접히면 그대로 빨갛다. */
      if (/fx-rlic/.test(nd.className + '')) continue;
      const dx = parseFloat(nd.style.getPropertyValue('--dx'));
      const dy = parseFloat(nd.style.getPropertyValue('--dy'));
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
      out.push({ dx, dy, x: parseFloat(nd.style.left), y: parseFloat(nd.style.top) });
    }
    return out;
  };
  const wrap = (name, bucket) => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function () {
      const l = L(), seen = new Set(l ? l.children : []);
      const r = o.apply(this, arguments);
      const got = scan(seen);
      if (got.length && !window.__v682.inGain) window.__v682[bucket].push(got);
      return r;
    };
  };
  /* ⚑ 683 이관 — «raw» 는 `fxBurst` 를 감싸 **후처리 전** 값을 잡는데, 그 시점에는 획득 알이
     아직 `.fx-cic` 라 위 `scan` 의 클래스 자로는 못 가른다(`rwGainFx` 가 `fxBurst` 가 돌아온 **뒤**에
     `.fx-rlic` 로 갈아 끼운다 — 666 3회차가 이동값에서 배운 «append 시점에 읽지 마라» 와 같은 함정).
     ⇒ 획득 이미터가 도는 동안만 깃발을 세워 그 버스트를 «raw» 에서 뺀다. */
  { const g = window.rwGainFx;
    if (typeof g === 'function') window.rwGainFx = function () {
      window.__v682.inGain = 1;
      try { return g.apply(this, arguments); } finally { window.__v682.inGain = 0; }
    }; }
  wrap('fxBurst', 'raw');            /* 후처리 **전** — [R1] 이 옛 뒤집기를 다시 걸 원본 */
  wrap('rwSummonFx', 'fin');         /* 후처리 **후** — 제품이 실제로 그리는 방향 */
  /* 소환 횟수(1:1 축) */
  window.__v682.buys = 0;
  const s = window.summonRelic;
  window.summonRelic = function () { const r = s.apply(this, arguments); if (r) window.__v682.buys++; return r; };
};
const RESET = () => { window.__v682.fin = []; window.__v682.raw = []; window.__v682.buys = 0;
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  /* 주석을 벗겨서 본다 — 안 벗기면 자가 자기 설명문(옛 코드를 인용한 머리말)을 «살아 있는 호출» 로
     읽어 영원히 빨갛다(verify666 1회차 A1·A8 이 그랬다 · 295-②·399·460 규약의 짝) */
  const nc = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  /* ⚑ 683 이관 — `rwSummonFx` 에 셋째 인자 `iv`(다음 틱까지의 간격)가 붙었다. 본문을 «머리 문자열»
     로 자르던 자리라 **서명이 한 글자만 바뀌어도 [A] 절 일곱 항이 통째로 전제 실패**로 죽는다
     (이관 전 실측: A0~A6 전부 빨강 · 본문 «못 찾았다»). ⇒ 자르는 자를 정규식으로 넓힌다 —
     묻는 것(«이 함수의 본문»)은 한 글자도 안 바뀌었다. */
  const mHead = code.match(/function rwSummonFx\(it, first(?:, iv)?\)\{/);
  const body = nc((mHead ? code.slice(code.indexOf(mHead[0]) + mHead[0].length) : '')
                  .split('\nfunction rwHoldTick()')[0]);

  blk('A] 구조 — 뒤집기 폐지 · 층화 난수 · 죽은 상수 0개');
  ok(body.length > 0, 'A0 `rwSummonFx` 본문을 찾았다(전제)', body ? body.length + '자' : '못 찾았다');
  ok(body.length > 0 && !/dy\s*=\s*-\s*dy/.test(body) && !/2\s*\*\s*cy\s*-\s*sy/.test(body),
     'A1 ★ 옛 «뒤집기»(`dy = -dy` · `2*cy - sy`)가 0건 — 아래 반구를 위 반구에 **포개던** 사상이 사라졌다');
  ok(/RW_FX_JIT/.test(body) && /const RW_FX_JIT = [\d.]+;/.test(code),
     'A2 칸 **안** 난수(`RW_FX_JIT`)가 있다 — 고정 부채가 아니다');
  ok(/rwFxW = \(rwFxW \+ 0\.6180339887\) % 1/.test(body),
     'A3 칸 **자체**가 버스트마다 황금비 저불일치 수열로 돈다(619 6회차와 같은 수열 — 순수 난수는 우연히 같은 값을 뽑는다)');
  ok(/%\s*m\s*\)\s*\+\s*m\s*\)\s*%\s*m\s*\/\s*m/.test(body.replace(/\s+/g, ' ')) || /\)\s*%\s*m\s*\/\s*m/.test(body),
     'A4 반구를 **알 수(m)만큼 칸**으로 나눠 한 칸에 한 알 — 겹침이 구조적으로 불가하다');
  ok(/Math\.atan\(RW_FX_UP\)/.test(body),
     'A5 ★ `RW_FX_UP` 이 여전히 «상향 원뿔의 여유» 로 일한다 — 죽은 상수를 남기지 않았다(399 규약)');
  ok(/Math\.hypot\(dx0, dy0\)/.test(body) && /Math\.hypot\(sx - cx, sy - cy\)/.test(body),
     'A6 이동 거리·탄생 반경을 **새로 안 정하고** 노드에서 읽어 다시 쓴다 — 바꾼 것은 «어느 쪽» 하나다');

  /* ── 브라우저 ── */
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);

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

  await ev(p, WATCH);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const G = await ev(p, () => ({
    fin: window.__v682.fin, raw: window.__v682.raw, buys: window.__v682.buys,
    up: (typeof RW_FX_UP === 'number') ? RW_FX_UP : null,
    btn: (b => ({ x: b.left, y: b.top, w: b.width, h: b.height }))(document.getElementById('rwBasin').getBoundingClientRect()),
    cy: (b => b.top + b.height * RW_FX_Y)(document.getElementById('rwBasin').getBoundingClientRect())
  }));

  const FIN = (G && G.fin) || [], RAW = (G && G.raw) || [];
  const A = FIN.map(deg), rep = A.slice(1);        /* 첫 발은 알 수가 달라 따로 본다 */
  const allRep = [].concat(...rep);

  blk('B] 산포 — 연속 버스트가 같은 그림이 아니다');
  ok(FIN.length >= 4, 'B0 표본(버스트) ≥ 4 — 연속 소환을 실제로 굴렸다(전제)', FIN.length + '버스트 · 알 ' + FIN.reduce((s, b) => s + b.length, 0) + '개');
  rep.slice(0, 6).forEach((b, i) => info('버스트 #' + (i + 2) + ' 방향(°)', deg(FIN[i + 1]).map(r1).sort((x, y) => x - y).join(', ')));
  const dup = dupPairs(rep, GRID), cmp = Math.max(0, rep.length - 1);
  info('연속 쌍 «±' + GRID + '° 전원 일치»', dup + '/' + cmp + '쌍');
  /* ⚠ 여유 1쌍을 두는 이유(무르게 푼 것이 아니다): 지터가 난수라 네 알의 어긋남이 한꺼번에
     ±15° 안으로 모이는 표본이 드물게 나온다. **수리 전은 100%(1/1·9/9)** 였으므로 이 문턱은
     그 그림과 한 칸도 안 겹친다. 구조적 보증은 아래 [B2]·[C1] 이 따로 못박는다. */
  ok(cmp >= 3 && dup <= Math.max(1, Math.floor(cmp * 0.125)),
     'B1 ★ 연속 버스트의 방향 시퀀스가 서로 다르다 — 수리 전엔 **전 쌍이 동일**했다',
     dup + '/' + cmp + '쌍 동일');
  const bins = binsOf(allRep);
  info('반구 30° 칸 분포(0~180°)', bins.join(' / '));
  ok(bins.filter(v => v).length >= 5,
     'B2 ★ 반구 6칸 중 5칸 이상이 찬다 — 수리 전엔 «오른쪽·위·왼쪽» **3칸**만 찼다',
     '덮인 칸 ' + bins.filter(v => v).length + '/6 (알 ' + allRep.length + '개)');

  blk('C] 겹침 — 한 버스트 안에서 두 알이 한 방향으로 포개지지 않는다');
  const short = rep.filter(b => lanes(b) < b.length);
  info('버스트별 갈래/알', rep.map(b => lanes(b) + '/' + b.length).join(' · '));
  ok(rep.length > 0 && short.length === 0,
     'C1 ★ 갈래 수 = 알 수 (칸 45° · 지터 ±0.30칸 ⇒ 최소 간격 18° ≥ ' + GRID + '° 라 **구조적 보증**)',
     '모자란 버스트 ' + short.length + '/' + rep.length);
  const gaps = rep.map(b => { const s = [...b].sort((x, y) => x - y); let g = 999;
    for (let i = 1; i < s.length; i++) g = Math.min(g, s[i] - s[i - 1]); return g; });
  ok(gaps.length === 0 || Math.min(...gaps) >= GRID,
     'C2 두 알의 최소 각 간격이 ' + GRID + '° 이상 — 수리 전엔 2.3~5.1° 였다',
     '최소 ' + r1(Math.min(...(gaps.length ? gaps : [0]))) + '°');

  blk('D] 반구 — 666 4회차 상향 원뿔이 한 알도 안 샌다');
  const flat = [].concat(...FIN);
  const down = flat.filter(q => q.dy > 0.05);
  ok(flat.length > 0 && down.length === 0, 'D1 ★ 아래로 향하는 알 0건(`dy ≤ 0`)', down.length + '/' + flat.length + '알');
  const upv = G ? G.up : 0;
  const outCone = flat.filter(q => q.dy > -Math.abs(q.dx) * upv - 1e-6);
  ok(upv === 0 ? down.length === 0 : outCone.length === 0,
     'D2 원뿔 여유(`RW_FX_UP` = ' + upv + ')를 벗어난 알 0건 — 종전 `dy > |dx|×RW_FX_UP` 과 같은 경계다',
     (upv === 0 ? down.length : outCone.length) + '알');

  blk('E] 불변 — 666 이 세운 축을 이번 변경이 안 건드렸다');
  const inBtn = q => G && q.x >= G.btn.x - 2 && q.x <= G.btn.x + G.btn.w + 2 && q.y >= G.btn.y - 2 && q.y <= G.btn.y + G.btn.h + 2;
  const outs = flat.filter(q => !inBtn(q));
  ok(flat.length > 0 && outs.length === 0, 'E1 ★ 탄생 좌표가 전부 버튼 상자 안(666 [C1] «스폰 = 버튼뿐»)',
     '밖 ' + outs.length + '/' + flat.length);
  const trav = flat.map(q => Math.hypot(q.dx, q.dy)).sort((a, b) => a - b);
  const tmed = trav.length ? trav[Math.floor(trav.length / 2)] : 0;
  ok(tmed >= 80, 'E2 이동 거리 중앙값 ≥ 80px(666 [C3] «링이 아니라 터짐»)', r1(tmed) + 'px');
  ok(G && G.buys > 0 && FIN.length >= G.buys * 0.95,
     'E3 소환마다 버스트가 터진다(666 [E1] 1:1 — 발화가 조용히 안 빠진다)',
     FIN.length + '버스트 / ' + (G ? G.buys : 0) + '소환');
  const r0s = flat.map(q => Math.hypot(q.x - (G.btn.x + G.btn.w / 2), q.y - G.cy));
  info('탄생 반경(px) 최소~최대', r1(Math.min(...r0s)) + '~' + r1(Math.max(...r0s)) + ' (fxBurst 의 22×jt 그대로)');

  blk('R] 되돌림 — 자가 «그 자리» 를 보는가');
  /* R1 — 제품 자기 알의 **후처리 전** 벡터에 옛 뒤집기를 다시 건다(사본 파일 없이 수리 전 그림 재현) */
  const foldOld = b => b.map(q => ({ dx: q.dx, dy: q.dy > Math.abs(q.dx) * upv ? -q.dy : q.dy }));
  const oldRep = RAW.slice(1).map(b => deg(foldOld(b)));
  const oldShort = oldRep.filter(b => lanes(b) < b.length).length;
  const oldDup = dupPairs(oldRep, GRID);
  info('옛 뒤집기 재현 — 버스트별 갈래/알', oldRep.map(b => lanes(b) + '/' + b.length).join(' · '));
  ok(oldRep.length >= 3 && oldShort >= Math.ceil(oldRep.length * 0.5),
     'R1 ★ 같은 알에 **옛 뒤집기**를 다시 걸면 갈래가 알 수보다 준다 — 주인이 본 «3방향» 이 여기서 되살아난다',
     '모자란 버스트 ' + oldShort + '/' + oldRep.length);
  ok(oldRep.length >= 3 && oldDup >= Math.ceil((oldRep.length - 1) * 0.5),
     'R2 ★ 옛 뒤집기면 연속 버스트가 **같은 시퀀스**다(±' + GRID + '°)',
     oldDup + '/' + Math.max(0, oldRep.length - 1) + '쌍 동일');
  /* R3 — «지터만 키우는 가짜 수리» 로는 안 풀린다: 옛 각에 ±10° 를 더 얹어도 쌍이 안 갈라진다.
     (뒤집기가 각을 **포개** 놓으므로 지터는 그 쌍을 흔들 뿐 떼어 놓지 못한다 — 구조를 바꿔야 했다) */
  const jitter = b => b.map(a => a + (Math.random() * 20 - 10));
  const fake = oldRep.map(jitter);
  const fakeShort = fake.filter(b => lanes(b) < b.length).length;
  ok(oldRep.length >= 3 && fakeShort > 0,
     'R3 ★ 옛 각에 ±10° 지터를 더 얹는 «가짜 수리» 로는 포갬이 안 풀린다 — 구조를 바꾼 것이 정답이었다',
     '여전히 모자란 버스트 ' + fakeShort + '/' + fake.length);
  /* R4 — 위상이 실제로 도는가: 칸 위상(정렬 각 평균 mod 칸폭)이 버스트마다 다른 칸에 앉는다 */
  const cell = rep.length && rep[0].length ? 180 / rep[0].length : 45;
  const offs = rep.map(b => (b.reduce((s, v) => s + v, 0) / b.length) % cell);
  const obin = new Set(offs.map(o => Math.floor(o / (cell / 5))));
  info('칸 위상(칸폭 ' + r1(cell) + '° 안 위치)', offs.map(r1).join(', '));
  ok(rep.length >= 4 && obin.size >= 3, 'R4 위상이 한 자리에 안 굳는다 — 칸을 5등분해 ' + obin.size + '칸에 앉는다(≥3)',
     obin.size + '/5');

  blk('H] 마감');
  ok(errs.length === 0, 'H1 페이지 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY682 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
