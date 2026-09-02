/* 작업 788 재현 — `tools/verify683.js` [H] 가 «다른 카드» 의 라벨을 재고 있는가
 *
 *   node tools/probe788.js            (기본 3라운드)
 *   node tools/probe788.js 5          (5라운드)
 *
 * 등재문(PROGRESS 788 · `docs/review/753-…md` §7-b)의 주장은 셋이다:
 *   ⓐ `labelShot()` 이 표본마다 `summonRelic(true)` 로 **무작위 유물**을 뽑는데,
 *      마스크·상자는 «정착» 프레임 **하나**에서 떠서 모든 표본에 같은 좌표로 적용된다
 *      ⇒ 정착과 표본이 다른 칸이면 «라벨이 아닌 곳» 이 아니라 **연출이 안 걸린 남의 라벨**을 잰다.
 *   ⓑ 그래서 [H2] 가 실행마다 20~100% 로 갈린다.
 *   ⓒ 칸을 고정하고 보유시켜 재면 값이 안정되고 **[H1] 이 실제로는 3:1 미만**이다.
 *
 * 338 규약 — 처방을 따르기 전에 재현부터 한다. 이 자는 **아무것도 안 고친다**(제품·게이트 0줄).
 * 두 모드를 같은 페이지·같은 라운드에서 번갈아 재서 «자의 차이» 말고 다른 변수를 남기지 않는다.
 *
 *   RND — 지금의 verify683 [H] 와 **같은 코드 경로**(표본마다 `summonRelic(true)`)
 *   FIX — 대상 칸을 `RELICS[0]`(rl0) 로 고정하고 **실제 경로로 보유시킨 뒤** 그 칸만 재는 경로
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ROUNDS = Number(process.argv[2] || 3);
const LT = [0, 20, 40, 60, 90, 130, 200, 260];      /* verify683 [H] 와 같은 표본 시각 */
const FIXED = 'rl0';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const r2 = v => Math.round(v * 100) / 100;
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 프레임 — verify683 `labelShot()` 을 그대로 옮겨 오되 «어느 칸을 쓰는가» 만 인자로 뺐다.
   FIX 모드는 `summonRelic` 을 아예 안 부르고 고정 칸 객체로 `rwSummonFx` 를 부른다. */
const shot = async (p, t, mode) => {
  const st = await ev(p, async ({ T, FIX, ID }) => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    if (!window.__p788to) { window.__p788to = window.setTimeout; window.__p788ri = window.requestAnimationFrame; }
    window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
    /* [H1][H2] 와 **같은 조건** — 알갱이는 숨긴다(그 축은 683 의 ⏸ 대기 항이고,
       각도가 매 실행 달라 여기 섞이면 «자리» 말고 다른 변수가 들어온다). */
    if (!document.getElementById('__p788nogain')) {
      const s = document.createElement('style'); s.id = '__p788nogain';
      s.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(s);
    }
    const it = FIX ? RELICS.filter(r => r.id === ID)[0] : summonRelic(true);
    if (!it) return null;
    if (T >= 0) rwSummonFx(it, true, null);
    try {
      document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
        else { a.pause(); try { a.finish(); } catch (_) {} }
      });
    } catch (e) {}
    const el = document.querySelector('[data-rw="' + it.id + '"]');
    const u = el.querySelector('u'), b = u.getBoundingClientRect();
    return { id: it.id, lab: u.textContent,
             box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } };
  }, { T: t, FIX: mode === 'FIX', ID: FIXED });
  if (!st) return null;
  return { id: st.id, lab: st.lab, box: st.box, png: (await p.screenshot()).toString('base64') };
};

/* verify683 [H] 의 «채움↔테 WCAG 대비비» 산수를 한 글자도 안 바꾸고 옮겼다 —
   재는 방법이 같아야 «자리만 다르다» 를 말할 수 있다. */
const RATIO = async ({ a, shots, box }) => {
  const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
  const px = async u => {
    const im = await load(u); const cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    return g.getImageData(box.x, box.y, box.w, box.h).data;
  };
  const A = await px(a);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
  const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const vals = []; for (let i = 0; i < A.length; i += 4) vals.push(lum(A, i));
  const srt = [...vals].sort((x, y) => x - y);
  const loT = srt[Math.floor(srt.length * 0.12)], hiT = srt[Math.floor(srt.length * 0.88)];
  const fill = [], stroke = [];
  for (let i = 0, k = 0; i < A.length; i += 4, k++) { if (vals[k] >= hiT) fill.push(i); else if (vals[k] <= loT) stroke.push(i); }
  const ratio = d => {
    if (!fill.length || !stroke.length) return 0;
    const mf = fill.reduce((s, i) => s + rl(d, i), 0) / fill.length;
    const ms = stroke.reduce((s, i) => s + rl(d, i), 0) / stroke.length;
    const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
    return (hi + 0.05) / (lo + 0.05);
  };
  const per = [];
  for (const sh of shots) per.push({ t: sh.t, r: ratio(await px(sh.png)) });
  const worst = per.reduce((m, o) => (o.r < m.r ? o : m), per[0]);
  const late = per.filter(o => o.t >= 130).sort((x, y) => x.r - y.r)[0] || worst;
  return { base: ratio(A), per, worst, late };
};

const round = async (p, mode) => {
  const settled = await shot(p, -1, mode);
  if (!settled) return null;
  const shots = [], ids = [];
  for (const t of LT) {
    const sh = await shot(p, t, mode);
    if (sh) { shots.push({ t, png: sh.png }); ids.push(sh.id); }
  }
  const m = await ev(p, RATIO, { a: settled.png, shots, box: settled.box });
  if (!m) return null;
  const same = ids.filter(i => i === settled.id).length;
  return Object.assign({ settledId: settled.id, lab: settled.lab, ids, same, n: ids.length }, m);
};

(async () => {
  console.log('=== probe788 — verify683 [H] 가 «다른 카드» 를 재는가 (라운드 ' + ROUNDS + ') ===');
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);

  /* FIX 모드의 전제 — 고정 칸을 **실제 경로로** 보유시킨다(`off` 딤이 프레임마다 달라지면
     라벨 색이 통째로 바뀌어 «자리» 말고 다른 변수가 섞인다). */
  const own = await ev(p, ID => {
    for (let i = 0; i < 4000 && !has(ID); i++) summonRelic(true);
    renderRelw();
    return { owned: has(ID), lv: oLv(ID) };
  }, FIXED);

  blk('1] 전제 — 고정 칸이 실제 경로로 보유됐다');
  ok(!!own && own.owned, '1-a 고정 칸 ' + FIXED + ' 을 `summonRelic()` 반복으로 보유시켰다(스텁 없음)', own ? ('Lv.' + own.lv) : '실패');

  const R = { RND: [], FIX: [] };
  for (let i = 0; i < ROUNDS; i++) {
    for (const mode of ['RND', 'FIX']) {
      const r = await round(p, mode);
      if (r) R[mode].push(r);
      await ev(p, () => { const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
        const o = document.getElementById('__p788nogain'); if (o) o.remove();
        if (window.__p788to) { window.setTimeout = window.__p788to; window.requestAnimationFrame = window.__p788ri;
          window.__p788to = null; window.__p788ri = null; } });
      await p.waitForTimeout(120);
    }
  }

  const pct = r => Math.round(r.late.r / r.base * 100);
  blk('2] 재현 ⓐ — 지금의 자(RND)는 표본이 정착과 «다른 칸» 이다');
  R.RND.forEach((r, i) => info('RND 라운드 ' + (i + 1),
    '정착 ' + r.settledId + ' ' + r2(r.base) + ':1 · 같은 칸 표본 ' + r.same + '/' + r.n
    + ' · 최악 t' + r.worst.t + ' ' + r2(r.worst.r) + ':1 · [H2] ' + r2(r.late.r) + '/' + r2(r.base) + ' = ' + pct(r) + '%'));
  const sameAll = R.RND.every(r => r.same === r.n);
  ok(R.RND.length > 0 && !sameAll,
     '2-a ★ RND 에서 표본 칸이 정착 칸과 어긋난다 — «라벨이 아닌 곳» 을 재는 뿌리(등재문 ⓐ)',
     R.RND.map(r => r.same + '/' + r.n).join(' · '));

  blk('3] 재현 ⓑ — 그래서 [H2] 백분율이 실행마다 갈린다');
  const rp = R.RND.map(pct), fp = R.FIX.map(pct);
  const spread = a => (a.length ? Math.max.apply(null, a) - Math.min.apply(null, a) : 0);
  info('RND [H2] %', rp.join(' · ') + '  (폭 ' + spread(rp) + '%p)');
  info('FIX [H2] %', fp.join(' · ') + '  (폭 ' + spread(fp) + '%p)');
  ok(R.FIX.length > 1 && spread(fp) <= 5,
     '3-a ★ 칸을 고정하면 [H2] 백분율이 라운드마다 5%p 안에서 안정된다(등재문 ⓒ)',
     '폭 ' + spread(fp) + '%p');
  ok(R.RND.length > 1 && R.FIX.length > 1 && spread(rp) > spread(fp),
     '3-b ★ 흔들림은 «제품» 이 아니라 «자» 의 것이다 — 같은 제품에서 RND 만 폭이 넓다',
     'RND ' + spread(rp) + '%p ↔ FIX ' + spread(fp) + '%p');

  blk('4] 재현 ⓒ — 칸을 고정하면 실제로는 빨갛다(헛초록의 정체)');
  R.FIX.forEach((r, i) => info('FIX 라운드 ' + (i + 1),
    '정착 ' + r.settledId + ' «' + r.lab + '» ' + r2(r.base) + ':1 · 봉투 ' + r.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · ')
    + ' · 최악 t' + r.worst.t + ' ' + r2(r.worst.r) + ':1 · [H2] ' + pct(r) + '%'));
  const h1 = R.FIX.map(r => r.worst.r);
  ok(R.FIX.length > 0 && h1.every(v => v < 3),
     '4-a ★ 고정 칸에서 [H1] 문턱(≥3:1)이 **일관되게** 미달이다 — 지금의 초록은 헛초록',
     h1.map(r2).join(' · ') + ':1');
  ok(R.FIX.length > 0 && R.FIX.every(r => r.base > 4),
     '4-b 정착 대비는 문제없다(≥4:1) — 빨간 것은 «정착» 이 아니라 «연출 중» 이다',
     R.FIX.map(r => r2(r.base)).join(' · ') + ':1');

  /* ⚑ 다음 세션을 위한 갈래 — «봉우리에서 라벨을 씻는 것» 이 플래시의 **어느 부품**인가.
     `.fx-flash` 는 09·12·17·코스튬·장비 공용이라(LESSONS 666-⑨) 이 행에서 손대지 않는다.
     그래도 «어디를 만져야 하는가» 는 여기서 재 둔다 — 안 재 두면 다음 세션이 같은 재현을 또 짠다. */
  blk('6] 갈래 — 봉우리(t20)의 워시가 플래시의 어느 부품인가 (측정만 · 제품 0줄)');
  const LAYERS = [
    ['전부(현행)', ''],
    ['채움 워시만 끔', '.fx-flash{background:transparent !important}'],
    ['흰 테만 끔', '.fx-flash{border-color:transparent !important}'],
    ['바깥 글로우만 끔', '.fx-flash{box-shadow:none !important}'],
    ['플래시 통째로 끔', '.fx-flash{display:none !important}'],
  ];
  const settled6 = await shot(p, -1, 'FIX');
  for (const [name, css] of LAYERS) {
    await ev(p, C => {
      const o = document.getElementById('__p788lyr'); if (o) o.remove();
      if (C) { const s = document.createElement('style'); s.id = '__p788lyr'; s.textContent = C; document.head.appendChild(s); }
    }, css);
    const sh = await shot(p, 20, 'FIX');
    const m = sh && settled6 ? await ev(p, RATIO, { a: settled6.png, shots: [{ t: 20, png: sh.png }], box: settled6.box }) : null;
    info('t20 대비 — ' + name, m ? (r2(m.per[0].r) + ':1  (정착 ' + r2(m.base) + ':1)') : '측정 실패');
  }
  await ev(p, () => { const o = document.getElementById('__p788lyr'); if (o) o.remove();
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const g = document.getElementById('__p788nogain'); if (g) g.remove(); });

  /* ⚑⚑ [6] 이 뜻밖의 것을 말한다 — 봉우리를 만드는 것은 «채움 워시»(2.75 → 2.84, 거의 안 움직인다)가
     아니라 **흰 테**(→4.75)와 **바깥 글로우**(→3.55)다. 그런데 그 둘은 카드 **가장자리·바깥**에 있고,
     `.rw-c>u` 는 `left:-40px;right:-40px;top:123px` 이라 **상자의 대부분이 카드 밖**이다(223×~40 중
     좌우 40px 기둥과 아래 ~10px 이 카드 밖 · 카드 높이 151). ⇒ 지금의 자는 «라벨 화소» 가 아니라
     «라벨 띠 **주변 배경**» 을 상당 부분 재고 있고, 어두운 쪽 마스크(하위 12%)에 **카드 밖 어두운 배경**이
     섞여 들어간다. 플래시가 그 배경을 밝히면 «테↔채움» 이 아니라 «배경↔채움» 이 좁아진다.
     ⇒ 아래는 **글리프 화소만** 고르는 자다: 같은 프레임에서 라벨 글자만 지운 사본을 한 장 더 찍어
     **차분**(제품에게 «어디가 글자인가» 를 직접 묻는다 · [G] 가 알 잉크에 쓰는 방법과 같다)으로
     화소 집합을 만든다. 손 상수 0개. */
  blk('7] 자를 고쳐 재면 — «글리프 화소만» 으로 좁힌 대비 (측정만 · 제품 0줄)');
  const inkShot = async () => {
    /* 라벨 글자를 지운 사본 — 배경(카드·플래시)은 그대로다 */
    const st = await ev(p, ID => {
      const el = document.querySelector('[data-rw="' + ID + '"]'), u = el.querySelector('u');
      window.__p788lab = u.textContent; u.textContent = '';
      return true;
    }, FIXED);
    const png = st ? (await p.screenshot()).toString('base64') : null;
    await ev(p, ID => {
      const el = document.querySelector('[data-rw="' + ID + '"]'), u = el.querySelector('u');
      if (window.__p788lab != null) u.textContent = window.__p788lab;
    }, FIXED);
    return png;
  };
  const settled7 = await shot(p, -1, 'FIX');
  const blank7 = await inkShot();
  const shots7 = [];
  for (const t of LT) { const sh = await shot(p, t, 'FIX'); if (sh) shots7.push({ t, png: sh.png }); }
  const m7 = await ev(p, async ({ a, blank, shots, box }) => {
    const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(box.x, box.y, box.w, box.h).data; };
    const A = await px(a), Z = await px(blank);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    /* 글자가 있는 프레임 ↔ 글자만 지운 프레임의 차분 = 글리프 화소(채움 + 테) */
    const ink = [];
    for (let i = 0; i < A.length; i += 4) if (Math.abs(lum(A, i) - lum(Z, i)) >= 24) ink.push(i);
    if (ink.length < 50) return { ink: ink.length, per: [], base: 0 };
    const iv = ink.map(i => lum(A, i)).sort((x, y) => x - y);
    const loT = iv[Math.floor(iv.length * 0.25)], hiT = iv[Math.floor(iv.length * 0.75)];
    const fill = ink.filter(i => lum(A, i) >= hiT), stroke = ink.filter(i => lum(A, i) <= loT);
    const ratio = d => {
      const mf = fill.reduce((s, i) => s + rl(d, i), 0) / fill.length;
      const ms = stroke.reduce((s, i) => s + rl(d, i), 0) / stroke.length;
      const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
      return (hi + 0.05) / (lo + 0.05);
    };
    const per = [];
    for (const sh of shots) per.push({ t: sh.t, r: ratio(await px(sh.png)) });
    return { ink: ink.length, nf: fill.length, ns: stroke.length, base: ratio(A), per };
  }, { a: settled7.png, blank: blank7, shots: shots7, box: settled7.box });
  if (m7 && m7.per.length) {
    const w7 = m7.per.reduce((m, o) => (o.r < m.r ? o : m), m7.per[0]);
    const l7 = m7.per.filter(o => o.t >= 130).sort((x, y) => x.r - y.r)[0] || w7;
    info('글리프 화소 ' + m7.ink + '개(채움 ' + m7.nf + ' · 테 ' + m7.ns + ')',
         '정착 ' + r2(m7.base) + ':1 · ' + m7.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · '));
    info('→ [H1] 최악 / [H2] 회복', r2(w7.r) + ':1 (t' + w7.t + ') · ' + Math.round(l7.r / m7.base * 100) + '%');
    ok(m7.base > 4, '7-a 글리프만 골라도 정착 대비는 그대로 건강하다(≥4:1)', r2(m7.base) + ':1');
    info('7-b 판정 — 봉우리가 여전히 3:1 미만인가',
         w7.r < 3 ? '그렇다(' + r2(w7.r) + ':1) — 상자를 좁혀도 남는다 = **제품 결함**(흰 테가 라벨 띠를 지난다)'
                  : '아니다(' + r2(w7.r) + ':1) — 빨강의 정체는 «상자» 였다');
  } else info('7 측정 실패', '');

  blk('5] 위생');
  ok(errs.length === 0, '5-a 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nPROBE788 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
