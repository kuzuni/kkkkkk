/* 작업 683 게이트 — «유물 소환 시 «획득한 그 유물» 자리에 해당 유물 파티클 · 연속 소환도 동일»
 *
 *   node tools/verify683.js
 *
 * 주인 지시(2026-09-02 00:33) 원문: «유물소환했을때 해당 유물쪽에 해당 유물 파티클떠야함.
 * 그리고 연속소환일때도 그런식으로 되게».
 *
 * 등재문이 이 자에게 요구한 것 넷: **획득 N종 → 각 카드 원점 파티클 ≥1 · 미획득 카드 0건 ·
 * 텍스트 0건 · 되돌림.** 아래 [C]·[D]·[F]·[R] 이 그 넷이고, 나머지는 그 넷이 «무르게» 통과하지
 * 않게 받치는 축이다.
 *
 * ⚑ **이 화면에는 이미터가 둘이다** — 지불 버스트(666 · 원점 = 소환 버튼)와 획득 버스트
 *   (683 · 원점 = 획득 유물 카드). 666 의 «버튼 밖 스폰 0건» 은 **지불 이미터의 규약**이고
 *   `tools/verify666.js` [C1][C2] 가 그쪽을 그대로 지킨다(683 이 그 항을 지우지 않고 좁혔다).
 *   이 자는 **획득 이미터만** 묻는다 — 두 자가 같은 것을 두 번 묻지 않는다.
 *
 * ⚑ 세는 것은 «코드» 가 아니라 **찍힌 노드가 어디서 태어났는가**다.
 *   `rwSummonFx(it, first, iv)` 를 감싸 버스트 단위로 새 `.fx-spark` 를 훑고(682·probe683 과 같은
 *   이유로 MutationObserver 를 안 쓴다 — 감싸기는 동기라 버스트 경계가 정확하다), 그 순간의
 *   10칸 bbox 를 제품 자신의 자(`fxRect`)로 같이 찍어 «어느 칸에서 난 알인가» 를 가른다.
 *   좌표계는 노드의 `style.left/top` 과 `fxRect` 가 **둘 다 프레임 px** 라 보정이 없다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const HOLD = Number(process.env.V683_HOLD || 3000);
const PAD = 6;              /* 카드 bbox 판정 여유 — 탄생 타원은 테두리 «바깥» 이라 조금 넘친다 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 버스트 단위 관찰자 — 당첨 id · 그 순간의 10칸 bbox · 새로 난 알 */
const WATCH = () => {
  window.__v683 = { bursts: [] };
  const L = () => document.getElementById('fxl');
  const scan = seen => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      const cls = nd.className + '';
      if (!/fx-spark/.test(cls)) continue;
      const x = parseFloat(nd.style.left), y = parseFloat(nd.style.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      out.push({ x, y, cls,
                 txt: (nd.textContent || '').trim(),
                 img: !!(nd.querySelector && nd.querySelector('img.cic')),
                 w: parseFloat(nd.style.width) || 0,
                 fs: parseFloat(nd.style.fontSize) || 0,
                 dx: parseFloat(nd.style.getPropertyValue('--dx')) || 0,
                 dy: parseFloat(nd.style.getPropertyValue('--dy')) || 0 });
    }
    return out;
  };
  const cards = () => {
    const g = document.getElementById('rwGrid'), out = {};
    if (!g || typeof fxRect !== 'function') return out;
    for (const el of g.querySelectorAll('[data-rw]')) {
      const r = fxRect(el);
      if (r) out[el.getAttribute('data-rw')] = r;
    }
    return out;
  };
  const o = window.rwSummonFx;
  if (typeof o !== 'function') return false;
  window.rwSummonFx = function (it, first) {
    const l = L(), seen = new Set(l ? l.children : []);
    const rc = cards();
    const r = o.apply(this, arguments);
    window.__v683.bursts.push({ id: it && it.id, ic: it && it.ic, first: !!first, cards: rc, born: scan(seen) });
    return r;
  };
  return true;
};
const RESET = () => { window.__v683.bursts = [];
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

const inR = (p, r, pad) => !!r && p.x >= r.x - pad && p.x <= r.x + r.w + pad
                                && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
const isGain = q => /fx-rlic/.test(q.cls);
/* 한 버스트의 방향 목록(도) — 682 규약 검산용 */
const degs = b => b.born.filter(isGain).map(q => Math.atan2(-q.dy, q.dx) * 180 / Math.PI).sort((a, c) => a - c);
const sameSeq = (a, b, tol) => a.length === b.length && a.length > 0 && a.every((v, i) => Math.abs(v - b[i]) < tol);

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  /* 주석을 벗긴다 — 안 벗기면 자가 «되돌림» 설명문을 살아 있는 호출로 읽는다(666 1회차 교훈) */
  const nc = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const src = nc(code);

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  blk('A] 선언 — 획득 이미터가 «별도 이미터» 로, 지불 이미터를 안 건드리고 서 있다');
  ok(/function rwGainFx\(it, el, first, iv\)\{/.test(src),
     'A1 획득 이미터가 자기 함수(`rwGainFx`)다 — 지불 버스트와 한 덩어리로 안 섞였다');
  ok(/rwGainFx\(it, el, first, first \? null : iv\)/.test(src),
     'A2 `rwSummonFx` 가 그 함수를 부르고, **첫 발에는 `iv` 를 안 넘긴다**(단발은 수명 그대로)');
  /* ⚑ 이 항이 이 자의 핵심이다 — `.rw-c` 는 `background:radial-gradient` 라 `fxbTextHoles` 의
     «그림 잉크» 판정에 **카드 전체**가 걸린다. `ic` 를 안 넘기면 keep-out 이 빈자리를 0 으로 만들어
     `strict` 의 버리기가 «버스트당 보장 1알» 만 남긴다(660 이 단련 버튼에서 실측한 그 자리).
     아이콘 경로(`IC`)라야 `kh` 가 비고, 크기(`FX_CIC_SC`)가 `fxBurst` **안에서** 가둠에 되먹여진다. */
  ok(/fxBurst\(el, col, n, true, iv, PAY_CUR\.relic\)/.test(src),
     'A3 ★ 획득 버스트는 **아이콘 경로 + `strict`** 로 부른다 — keep-out 굶주림(660)을 구조적으로 피한다');
  ok(/const RW_GAIN_N0 = \d+, RW_GAIN_N = \d+;/.test(src) && /const RW_GAIN_GS = [\d.]+;/.test(src)
     && /const RW_GAIN_SC = [\d.]+;/.test(src) && /const RW_GAIN_R0 = \d+, RW_GAIN_R1 = \d+;/.test(src)
     && /const RW_GAIN_JIT = [\d.]+;/.test(src),
     'A4 알 수·크기·반경·지터가 전부 이름 있는 상수다 — 호출부에 손으로 안 적는다');
  ok(/Math\.max\(1, Math\.min\(first \? RW_GAIN_N0 : RW_GAIN_N, FXMAX - L\.childElementCount - 1\)\)/.test(src),
     'A5 상한을 «걷기» 가 아니라 «개수 줄이기» 로 지킨다(660·666 A5 와 같은 처방 — 발화가 안 빠진다)');
  /* ⚑ 2회차 — [A6] 의 뜻이 «상자를 안 건드린다» 에서 **«상자를 줄이기만 한다»** 로 좁혀졌다.
     619 13·14회차의 가둠(`inM`)은 «잉크가 액자 안에서 끝난다» 를 위해 `fxBurst` 가 잡아 준 상자인데,
     **줄인 상자는 그 상자의 부분집합**이라 그 보증이 그대로 산다. 키우면 깨지므로 `RW_GAIN_SC ≤ 1`
     이 규약이고, 이 항이 그 부등식을 **소스에서** 못박는다(런타임 축은 [D3] 이 따로 센다). */
  const mSc = src.match(/const RW_GAIN_SC = ([\d.]+);/);
  ok(/nd\.style\.fontSize = Math\.round\(s3 \* RW_GAIN_GS\)/.test(src)
     && /Math\.max\(12, Math\.round\(sz \* RW_GAIN_SC\)\)/.test(src)
     && !!mSc && parseFloat(mSc[1]) <= 1,
     'A6 ★ 알 상자를 **줄이기만** 한다(`RW_GAIN_SC` ≤ 1) — `fxBurst` 의 가둠(`inM`)이 부분집합으로 따라온다',
     mSc ? 'RW_GAIN_SC = ' + mSc[1] : '상수를 못 찾았다');
  ok(/const u = \(\(\(\(j \+ 0\.5 \+ ph \+ rnd\(-RW_GAIN_JIT, RW_GAIN_JIT\)\)/.test(src)
     && /rwGainW = \(rwGainW \+ 0\.6180339887\) % 1/.test(src),
     'A6b ★ 갈래를 **알 수만큼 칸**으로 나누고 칸 자체가 버스트마다 황금비로 돈다(682 규약 — 2회차 신설)');
  ok(/\.fx-spark\.fx-rlic\{/.test(code) && /filter:drop-shadow\(0 0 6px var\(--c/.test(code),
     'A7 `.fx-rlic` 부품이 있고 `--c`(그 칸의 글로우 색)를 실제로 쓴다 — 죽은 값 0(295-②·399·460)');
  ok(/function rwCardShown\(r\)\{/.test(src) && /rwCardShown\(r\)/.test(src),
     'A8 화면 밖 카드 가드가 있다(518 «쌩뚱맞은 곳에서 이펙트» 재발 방지)');

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

  const armed = await ev(p, WATCH);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const BS = (await ev(p, () => window.__v683.bursts)) || [];

  blk('B] 전제 — 관찰자·홀드가 실제로 돌았다');
  ok(armed === true, 'B1 `rwSummonFx` 를 감쌌다');
  ok(BS.length >= 6, 'B2 홀드가 여러 번 소환한다(전제 · 666 [B1] 과 같은 종류)', BS.length + '회');
  const gain = BS.reduce((n, b) => n + b.born.filter(isGain).length, 0);
  const ids = new Set(BS.map(b => b.id).filter(Boolean));
  info('버스트', BS.length + '회 · 획득 알 ' + gain + '개 · 서로 다른 당첨 유물 ' + ids.size + '종');

  /* ── [C] 자리 — 등재문 요구 ①② ──────────────────────────────────── */
  blk('C] 자리 — 획득 알의 원점이 «획득한 그 유물 카드» 다');
  let hit = 0, offCard = 0, wrongCard = 0;
  const wrongIds = new Set();
  for (const b of BS) {
    const g = b.born.filter(isGain);
    if (g.some(q => inR(q, b.cards[b.id], PAD))) hit++;
    for (const q of g) {
      if (!inR(q, b.cards[b.id], PAD)) offCard++;
      for (const k of Object.keys(b.cards)) {
        if (k === b.id) continue;
        if (inR(q, b.cards[k], 0)) { wrongCard++; wrongIds.add(k); }
      }
    }
  }
  ok(BS.length > 0 && hit === BS.length,
     'C1 ★ **획득 N회 → 각 회차 획득 카드 원점 알 ≥ 1** (등재문 요구 ①)', hit + '/' + BS.length);
  ok(gain > 0 && offCard === 0,
     'C2 ★ 획득 알이 그 카드 밖에서 태어난 건 0 — 알이 엉뚱한 데서 나지 않는다', offCard + '/' + gain);
  ok(wrongCard === 0,
     'C3 ★ **미획득 카드에서 태어난 알 0건** (등재문 요구 ②)',
     wrongCard + '건' + (wrongIds.size ? ' · ' + [...wrongIds].join(',') : ''));

  /* ⚑⚑ 2회차 신설 — «터진다» 는 **이동**으로만 성립한다(666 [C3] 이 버튼에서 배운 것과 같은 교훈).
     1회차는 [C1][C2] 를 통과하고도 비평가 둘이 독립으로 «최대 반경 65 < 카드 반폭 75 라 수명 내내
     한 알도 카드 밖으로 못 나간다 · 총 이동 14px = 자기 지름의 37% · 카드에 붙은 데칼» 로 3점을 줬다.
     게이트가 «태어난 자리» 만 물으면 그 그림을 못 잡는다. */
  const HALF = 151 / 2, PITCH_HALF = 176 / 2;         /* 카드 반폭 · 세로 이웃 칸 중심까지 */
  /* ⚠ 자를 «중심» 이 아니라 **«잉크»** 로 든다 — 619 13회차가 배운 것과 같다(사람이 보는 것은
     입자 중심이 아니라 «액자 밖으로 나온 잉크» 다). [C6] 의 이웃 칸 산수도 같은 자여야 짝이 맞는다. */
  let travTot = 0, farBad = 0, minTrav = 1e9, maxInk = 0, burstOut = 0, burstN = 0;
  for (const b of BS) {
    const g = b.born.filter(isGain);
    const cr = b.cards[b.id]; if (!cr || !g.length) continue;
    const cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2;
    let bMax = 0;
    for (const q of g) {
      const t = Math.hypot(q.dx, q.dy);
      const ink = Math.hypot(q.x + q.dx - cx, q.y + q.dy - cy) + q.w / 2;
      travTot++; minTrav = Math.min(minTrav, t);
      bMax = Math.max(bMax, ink); maxInk = Math.max(maxInk, ink);
      if (ink > PITCH_HALF) farBad++;
    }
    burstN++; if (bMax > HALF) burstOut++;
  }
  ok(travTot > 0 && minTrav >= 40,
     'C4 ★ 모든 알이 **실제로 날아간다**(이동 ≥ 40px) — 1회차의 «14px = 붙은 데칼» 이 빨개지는 자리',
     travTot ? '최소 이동 ' + Math.round(minTrav) + 'px' : '표본 0');
  ok(burstN > 0 && burstOut === burstN,
     'C5 ★ 버스트마다 잉크가 **카드 테(반폭 75.5) 를 넘는다** — «카드 안에서만 논다» 가 아니다',
     burstOut + '/' + burstN + '버스트 · 최대 잉크 끝 ' + Math.round(maxInk) + 'px');
  ok(farBad === 0,
     'C6 ★ 그래도 **이웃 칸(세로 피치 반 88px)에는 안 닿는다** — 잉크 바깥 끝 기준',
     '넘은 알 ' + farBad + ' · 최대 잉크 끝 ' + Math.round(maxInk) + 'px');

  /* ── [D] 그림·연속 ───────────────────────────────────────────────── */
  blk('D] 그림 — 알이 «그 유물» 의 문양이다 · 연속 소환이 같은 그림이 아니다');
  let glyphBad = 0, imgBad = 0, boxBad = 0;
  for (const b of BS) for (const q of b.born.filter(isGain)) {
    if (q.txt !== (b.ic || '')) glyphBad++;
    if (q.img) imgBad++;
    /* 상자(width) 대비 글리프 font-size — 잉크가 상자 안에서 끝나는 값이어야 한다 */
    if (!(q.w > 0 && q.fs > 0 && q.fs <= q.w)) boxBad++;
  }
  ok(gain > 0 && glyphBad === 0, 'D1 ★ 알의 글리프가 **그 회차에 획득한 유물의 것**이다(`RELICS[].ic`)',
     '어긋난 알 ' + glyphBad);
  ok(gain > 0 && imgBad === 0, 'D2 재화 `<img>` 가 남아 있는 알 0 — 지불 어휘와 안 섞인다', String(imgBad));
  ok(gain > 0 && boxBad === 0, 'D3 글리프가 알 상자 안에서 끝난다(font-size ≤ 상자) — 619 13·14회차 규약',
     String(boxBad));
  /* ⚑ 2회차 신설 — «너무 커서 카드를 덮는다»(비평 2인 공통 ②: 알 bbox 합이 카드 면의 67~68% ·
     A1 라벨 흰 픽셀 0개). 한 알이 카드 폭의 몇 %인지를 상한으로 못박는다. */
  let szMax = 0;
  for (const b of BS) for (const q of b.born.filter(isGain)) szMax = Math.max(szMax, q.w);
  ok(gain > 0 && szMax > 0 && szMax <= 151 * 0.22,
     'D5 ★ 알 한 개가 카드 폭의 22% 이하다 — 1회차의 «카드 면 67% 를 덮는다» 가 빨개지는 자리',
     '최대 ' + Math.round(szMax) + 'px = 카드 폭의 ' + (szMax / 151 * 100).toFixed(1) + '%');
  /* ⚑ 2회차 신설 — 갈래 수 = 알 수(682 규약의 «구조적 보증» 을 이 이미터에도). 1회차는 가둠이
     링을 사각형 네 모서리로 접어 6알이 **4갈래**였다(비평 2인 공통 ③). */
  let laneBad = 0, laneMin = 999;
  for (const b of BS) {
    const a = degs(b); if (a.length < 2) continue;
    let g = 999;
    for (let i = 1; i < a.length; i++) g = Math.min(g, a[i] - a[i - 1]);
    g = Math.min(g, 360 - (a[a.length - 1] - a[0]));   /* 원형이라 양 끝도 이웃이다 */
    laneMin = Math.min(laneMin, g);
    if (g < 15) laneBad++;
  }
  ok(BS.length > 0 && laneBad === 0,
     'D6 ★ 한 버스트 안 두 알의 최소 각 간격 ≥ 15° — 갈래 수가 알 수와 같다(682 규약)',
     '어긋난 버스트 ' + laneBad + ' · 최소 ' + (laneMin === 999 ? '—' : laneMin.toFixed(1) + '°'));
  /* 682 규약 — 연속 두 버스트가 «같은 방향 시퀀스» 면 안 된다(황금비 위상이 돌고 있는가) */
  let sameN = 0, pairs = 0;
  for (let i = 1; i < BS.length; i++) {
    const a = degs(BS[i - 1]), c = degs(BS[i]);
    if (!a.length || !c.length) continue;
    pairs++;
    if (sameSeq(a, c, 3)) sameN++;
  }
  ok(pairs > 0 && sameN === 0, 'D4 ★ 연속 두 버스트의 방향 시퀀스가 같은 쌍 0 — 682 규약(버스트마다 위상이 돈다)',
     sameN + '/' + pairs + '쌍');

  /* ── [E] 화면 밖 가드 ────────────────────────────────────────────── */
  blk('E] 화면 밖 — 페이지가 닫혀 있으면 한 알도 안 쏜다(518 재발 방지)');
  const closed = await ev(p, () => {
    closeRelw();
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const it = RELICS[0], el = document.querySelector('[data-rw="' + it.id + '"]');
    const r = rwGainFx(it, el, true, null);
    let n = 0; for (const nd of (L ? L.children : [])) if (/fx-rlic/.test(nd.className + '')) n++;
    openRelw();
    return { ret: r, n };
  });
  ok(!!closed && closed.n === 0 && closed.ret === false,
     'E1 ★ 닫힌 페이지에서는 획득 알 0 · 반환 false', closed ? ('알 ' + closed.n + ' · ret ' + closed.ret) : '측정 실패');

  /* ── [F] 불변 — 등재문 요구 ③ · 지불 이미터 ──────────────────────── */
  blk('F] 불변 — 텍스트 0건(666) · 지불 이미터는 그대로 산다');
  const txt = await ev(p, () => {
    const L = document.getElementById('fxl'); if (!L) return -1;
    let n = 0; for (const nd of L.children) if (/fx-plus|fx-delta/.test(nd.className + '')) n++;
    return n;
  });
  ok(txt === 0, 'F1 ★ 숫자·이름 플로터 0건 (등재문 요구 ③ · 666 이 폐지한 어휘)', String(txt));
  const pay = BS.reduce((n, b) => n + b.born.filter(q => !isGain(q)).length, 0);
  ok(pay > 0, 'F2 지불 버스트가 여전히 터진다 — 이 작업이 666 을 밀어내지 않았다', pay + '알');
  ok(errs.length === 0, 'F3 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [R] 되돌림 ──────────────────────────────────────────────────── */
  blk('R] 되돌림 — 고친 축을 되돌리면 위 항이 빨개진다');
  /* R1 — 획득 이미터를 빼면 [C1] 이 빨개진다. 제품을 실제로 되돌려 «그때 0 이 되는가» 를 본다. */
  const rev = await ev(p, async () => {
    const keep = window.rwGainFx;
    window.rwGainFx = () => false;                   /* 666 상태 = 획득 이미터 없음 */
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    window.__v683.bursts = [];
    for (let i = 0; i < 4; i++) { const it = summonRelic(true); if (it) rwSummonFx(it, i === 0, 90); }
    let n = 0; for (const b of window.__v683.bursts) n += b.born.filter(q => /fx-rlic/.test(q.cls)).length;
    window.rwGainFx = keep;
    return { n, bursts: window.__v683.bursts.length };
  });
  ok(!!rev && rev.bursts >= 3 && rev.n === 0,
     'R1 `rwGainFx` 를 빼면 획득 알 0 — [C1][C2][D1] 이 빨개지는 자리',
     rev ? (rev.bursts + '버스트 · 획득 알 ' + rev.n) : '측정 실패');
  /* R2 — 되살리면 다시 난다(자가 «영원히 0» 을 초록으로 읽지 않는다) */
  const back = await ev(p, () => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    window.__v683.bursts = [];
    for (let i = 0; i < 4; i++) { const it = summonRelic(true); if (it) rwSummonFx(it, i === 0, 90); }
    let n = 0; for (const b of window.__v683.bursts) n += b.born.filter(q => /fx-rlic/.test(q.cls)).length;
    return n;
  });
  ok(back > 0, 'R2 원복하면 다시 난다 — [R1] 이 «항상 0» 을 재는 헛초록이 아니다', '획득 알 ' + back);

  await browser.close();
  console.log('\nVERIFY683 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
