/* 작업 795 게이트 — 공용 `.fx-flash` 의 «흰 테 + 바깥 글로우» 가 카드 밖으로 걸친 라벨을 지운다
 *
 *   node tools/verify795.js
 *
 * **무엇을 고쳤나**: 세기(공용 CSS)는 한 글자도 안 건드리고, 덮인 라벨을 **플래시 «위에» 다시 그린다**
 * (619 16회차가 배지에 쓴 처방을 «글자» 로 넓힌 것 — `FXKEEP_TXT` · `fxFlash` 넷째 인자 `keep`).
 * 대비 자체는 `verify683` [H1][H4] 가 화소로 잰다(정착 21:1 ↔ 패치 걷으면 2.4:1). 이 자는 **부품**을 묻는다:
 *
 *   [A] 전제 — 라벨이 정말 호스트 밖으로 걸쳐 있다(뿌리가 «세기» 가 아니라 «자리» 라는 근거)
 *   [B] 패치가 선다 — 플래시가 도는 동안 라벨 패치가 fx 레이어에 있고 **플래시 뒤**(= 위)에 붙는다
 *   [C] 자리 — 패치 라벨 rect 가 원본과 Δ≤0.5px (rect 에 이미 든 `scaleX(1.1)` 을 두 번 먹지 않았다)
 *   [D] 그림 — 서체·색·테·변형을 **손으로 안 적었다**(원본 계산값과 전 항 일치 · 새 상수 0개)
 *   [E] 수명 — 플래시가 걷히면 패치도 걷힌다(«없는 것을 덮는 판때기» 가 안 남는다)
 *   [F] 남의 부품 불변 — `keep` 을 안 준 호출(09·12·17·코스튬·장비 단발 플래시)은 패치가 0개
 *   [G] 여러 칸 — 새 칸의 플래시가 **남의 칸 패치를 안 걷는다**(795 가 좁힌 걷기 범위)
 *   [H] z — 패치에 z 를 안 준다(주면 뒤따라 붙는 스파크가 이 밑으로 깔린다 — `.fx-keep` 규약)
 *   [R] 되돌림 — 넷째 인자를 떨구면 [B]~[E] 가 통째로 사라진다(이 자가 «항상 참» 을 재는 게 아니다)
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

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const r2 = v => Math.round(v * 100) / 100;
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 칸에 연출을 건다. ⚠ `rwSummonFx` 는 제품 경로 그대로 부른다 —
   스텁으로 연출을 흉내 내면 «자가 자기 사본을 재는» 자가 된다.
   ⚑ **애니메이션을 한 시각에 세운다**(probe788·verify683 과 같은 처리). 안 세우면 `fxHitEl` 의
     `.fx-hit`(scale 1.05)가 호스트를 흔드는 **한복판**에서 재게 된다 — 그러면 [C1] 이 «패치가
     어긋났다» 가 아니라 «읽는 순간이 달랐다» 를 재서 Δ가 0.09 ↔ 2.41px 로 실행마다 갈린다
     (자를 처음 짤 때 실제로 그랬다 · 344 «플레이키는 제품이 아니라 자의 것일 수 있다»). */
const FIRE = ({ ID, KEEP }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  const it = RELICS.filter(r => r.id === ID)[0]; if (!it) return null;
  if (KEEP === false) {                       /* [R] 되돌림 — 넷째 인자를 떨군 사본 */
    if (!window.__v795ff) { window.__v795ff = window.fxFlash;
      window.fxFlash = function (el, iv, inset) { return window.__v795ff.call(this, el, iv, inset); }; }
  } else if (window.__v795ff) { window.fxFlash = window.__v795ff; window.__v795ff = null; }
  rwSummonFx(it, true, null);
  try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = 20; } catch (_) {} }); } catch (_) {}
  return { id: it.id };
};
/* 세운 뒤 rAF 한 바퀴를 돌리고 나서 읽는다(패치의 추적 한 번 = 제품이 실제로 그리는 자리). */
const READ = ID => {
  const L = document.getElementById('fxl');
  const el = document.querySelector('[data-rw="' + ID + '"]');
  const u = el && el.querySelector('u');
  const kids = Array.prototype.slice.call(L.children);
  const keeps = kids.filter(n => n.classList && n.classList.contains('fx-keep'));
  const kLab = keeps.filter(n => n.querySelector && n.querySelector('u'));
  const flash = kids.filter(n => n.classList && n.classList.contains('fx-flash'));
  const R = n => { if (!n) return null; const b = n.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const cs = n => { if (!n) return null; const c = getComputedStyle(n);
    return { font: c.font, fontFamily: c.fontFamily, fontSize: c.fontSize, color: c.color,
             stroke: c.webkitTextStrokeWidth + ' ' + c.webkitTextStrokeColor, paintOrder: c.paintOrder,
             transform: c.transform, textAlign: c.textAlign, zIndex: c.zIndex, text: n.textContent }; };
  const host = R(el), lab = R(u);
  return {
    id: ID, nKeep: keeps.length, nLab: kLab.length, nFlash: flash.length,
    flashIdx: flash.length ? kids.indexOf(flash[0]) : -1,
    keepIdx: kLab.length ? kids.indexOf(kLab[0]) : -1,
    host, lab, patch: R(kLab.length ? kLab[0].querySelector('u') : null),
    csLab: cs(u), csPatch: cs(kLab.length ? kLab[0].querySelector('u') : null),
    keepZ: kLab.length ? getComputedStyle(kLab[0]).zIndex : null,
    /* ⚑ 683 11회차 — z 를 받은 그릇이 **라벨 패치뿐인가**(스코프의 짝. 아래 [H1c]) */
    zAll: keeps.map(n => ({ lab: !!(n.querySelector && n.querySelector('u')),
                            top: n.classList.contains('fx-keep-top'),
                            z: getComputedStyle(n).zIndex })),
    /* 라벨이 호스트 밖으로 걸친 양 — 뿌리가 «자리» 라는 근거([A]) */
    over: (host && lab) ? (lab.y + lab.h) - (host.y + host.h) : 0,
  };
};

(async () => {
  console.log('=== verify795 — 카드 밖으로 걸친 라벨을 플래시 «위에» 되그린다 ===');
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);

  /* 788 [H0] 과 같은 전제 — 대상 칸을 **실경로**로 보유시킨다(336: 세이브가 만들 수 있는 상태만 잰다) */
  const own = await ev(p, () => {
    for (let i = 0; i < 4000 && !(has('rl0') && has('rl1')); i++) summonRelic(true);
    renderRelw(); return { a: has('rl0'), b: has('rl1'), lv: oLv('rl0') };
  });

  blk('A] 전제 — 뿌리는 «세기» 가 아니라 «자리» 다 (라벨이 카드 밖으로 걸쳐 있다)');
  ok(!!own && own.a && own.b, 'A1 전제 — 대상 두 칸을 `summonRelic()` 실경로로 보유시켰다', own ? ('rl0 Lv.' + own.lv) : '실패');
  await ev(p, FIRE, { ID: 'rl0', KEEP: true });
  await p.waitForTimeout(80);                 /* rAF 한 바퀴 — 패치의 추적이 한 번 돈 뒤에 읽는다 */
  const K = await ev(p, READ, 'rl0');
  ok(!!K && K.over > 0,
     'A2 ★ «Lv.n» 이 카드 하변 **밖**으로 걸친다 — 카드 rect 로 뜨는 플래시의 흰 테가 그 띠를 지난다',
     K ? (r2(K.over) + 'px 밖 (카드 하변 ' + r2(K.host.y + K.host.h) + ' ↔ 라벨 하변 ' + r2(K.lab.y + K.lab.h) + ')') : '측정 실패');

  blk('B] 패치가 선다 — 플래시 «뒤»(= 위)에 붙는다');
  ok(!!K && K.nLab === 1, 'B1 ★ 라벨 패치가 정확히 한 장 선다', K ? (K.nLab + '장 (패치 전체 ' + K.nKeep + ')') : '측정 실패');
  ok(!!K && K.nFlash === 1 && K.keepIdx > K.flashIdx,
     'B2 ★ DOM 순서가 `flash → keep` 이다 — 같은 층에서 나중에 붙는 것이 곧 «위» 다',
     K ? ('flash idx ' + K.flashIdx + ' < keep idx ' + K.keepIdx) : '측정 실패');

  blk('C] 자리 — 좌표를 새로 쓰지 않았다(transform 을 두 번 안 먹인다)');
  const d = (a, b) => (a && b) ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)) : 999;
  ok(!!K && d(K.patch, K.lab) <= 0.5,
     'C1 ★ 패치 라벨 rect 가 원본과 Δ≤0.5px — 그릇(호스트 패딩 상자)째 재현했다는 증거',
     K ? ('Δ ' + r2(d(K.patch, K.lab)) + 'px · 원본 ' + r2(K.lab.w) + '×' + r2(K.lab.h)) : '측정 실패');
  /* ⚠ 이 항이 없으면 «좌표로 앉히기» 로 되돌아가도 초록이다 — rect 에는 이미 `scaleX(1.1)` 이 들어 있어
     그 값을 그대로 쓰면 패치가 가로로 **한 번 더** 늘어난다(폭 +10%). Δ 0.5px 는 그 사고를 못 잡는다. */
  ok(!!K && K.csPatch && K.csLab && K.csPatch.transform === K.csLab.transform && K.csLab.transform !== 'none',
     'C2 ★ 변형(`scaleX`)이 원본과 같고 «none» 이 아니다 — 두 번 먹였으면 폭이 10% 벌어진다',
     K && K.csPatch ? K.csPatch.transform : '측정 실패');

  blk('D] 그림 — 손으로 베끼지 않았다(원본 계산값 전 항 일치)');
  const KEYS = ['fontFamily', 'fontSize', 'color', 'stroke', 'paintOrder', 'textAlign', 'text'];
  const bad = (K && K.csPatch && K.csLab) ? KEYS.filter(k => K.csPatch[k] !== K.csLab[k]) : ['측정 실패'];
  ok(bad.length === 0, 'D1 ★ 서체·크기·색·테·`paint-order`·정렬·글자가 원본과 한 항도 안 다르다',
     bad.length ? ('어긋남 ' + bad.join(',')) : (K.csLab.fontSize + ' · ' + K.csLab.color + ' · 테 ' + K.csLab.stroke));
  ok(!!K && K.csPatch && /Lv/.test(K.csPatch.text || ''), 'D2 패치가 실제로 «Lv.n» 을 그린다(빈 판때기가 아니다)',
     K && K.csPatch ? ('«' + K.csPatch.text + '»') : '측정 실패');

  blk('H] z — 패치에 z 를 주지 않는다(주면 뒤따라 붙는 스파크가 이 밑으로 깔린다)');
  /* ⚑⚑ 683 11회차 — **[H1] 의 방향을 뒤집었다(지우지 않았다 · 333 처방).**
     795 는 «그릇·복제본 둘 다 auto» 로 못을 박았고 그 근거는 `.fx-keep` 규약(«z 를 주면 뒤따라 붙는
     스파크가 이 판때기 밑으로 깔린다»)이었다. 11회차가 재현으로 그 규약의 **예외 하나**를 열었다:
     라벨 패치는 판때기가 아니라 **투명한 그릇 + 글리프 잉크**라, 깔리는 것은 «글자 위» 뿐이고
     그 대가로 알이 되살린 글자를 다시 씻는 것을 막는다(`probe683d` [3] — «4.5:1 미만» 31% → 21%).
     ⇒ 항을 지우지 않고 **셋으로** 적는다: 복제본은 여전히 auto(그림은 그대로) · 그릇만 한 칸 ·
       그리고 **그 한 칸을 받은 것이 라벨 패치뿐인가**(스코프의 짝 — 없으면 840 뱃지·814 잉크가
       조용히 같이 올라가도 아무 자도 안 짖는다).
     되돌림: `index.html` 의 `.fx-keep.fx-keep-top` 선언을 지우면 [H1b] 가 빨개진다
     (`verify753` [B2c] 가 그 되돌림을 화소로도 시험한다). */
  ok(!!K && K.csPatch && K.csPatch.zIndex === 'auto',
     'H1 ★ **복제본**은 여전히 `z-index:auto` — 그림은 한 항도 안 바뀐다(패치 안에서 층을 만들지 않는다)',
     K && K.csPatch ? ('복제본 ' + K.csPatch.zIndex) : '측정 실패');
  ok(!!K && K.keepZ === '1',
     'H1b ★ **그릇만 한 칸 위로**(683 11회차) — 라벨 패치는 알 «위» 에 선다. `auto` 로 돌아가면 '
     + '알이 되살린 글자를 다시 씻는다(`verify753` [B2b] 가 그 대가를 래칫으로 잡는다)',
     K ? ('그릇 ' + K.keepZ) : '측정 실패');
  const zBad = (K && K.zAll) ? K.zAll.filter(n => (n.top || n.z !== 'auto') && !n.lab) : ['측정 실패'];
  ok(zBad.length === 0,
     'H1c ★ **스코프의 짝** — z 를 받은 그릇은 «글자 라벨» 패치뿐이다(840 뱃지·814 잉크는 auto 그대로. '
     + '그 둘은 불투명한 그림이라 `.fx-keep` 의 금지가 그대로 옳다)',
     zBad.length ? ('라벨 아닌데 올라간 그릇 ' + zBad.length + '개') : ('그릇 ' + (K.zAll ? K.zAll.length : 0) + '개 전수 확인'));

  blk('G] 여러 칸 — 새 칸의 플래시가 남의 칸 패치를 안 걷는다');
  const G = await ev(p, () => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    rwSummonFx(RELICS.filter(r => r.id === 'rl0')[0], true, null);
    const after1 = L.querySelectorAll('.fx-keep').length;
    rwSummonFx(RELICS.filter(r => r.id === 'rl1')[0], true, null);
    const keeps = Array.prototype.slice.call(L.querySelectorAll('.fx-keep'));
    const hosts = new Set(keeps.map(n => n.__fxKeepHost));
    return { after1, after2: keeps.length, hosts: hosts.size };
  });
  ok(!!G && G.after1 >= 1 && G.hosts === 2,
     'G1 ★ 두 칸이 잇달아 번쩍이면 패치도 **두 호스트분**이 산다(10연 소환에서 앞 칸 라벨이 도로 씻기지 않는다)',
     G ? ('1칸 뒤 ' + G.after1 + '장 · 2칸 뒤 ' + G.after2 + '장 / 호스트 ' + G.hosts) : '측정 실패');

  blk('E] 수명 — 플래시가 걷히면 패치도 걷힌다');
  const E = await ev(p, () => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    rwSummonFx(RELICS.filter(r => r.id === 'rl0')[0], true, null);
    const before = L.querySelectorAll('.fx-keep').length;
    for (const n of Array.prototype.slice.call(L.querySelectorAll('.fx-flash'))) n.remove();
    return { before };
  });
  await p.waitForTimeout(200);
  const E2 = await ev(p, () => document.getElementById('fxl').querySelectorAll('.fx-keep').length);
  ok(!!E && E.before >= 1 && E2 === 0,
     'E1 ★ 플래시 노드를 걷으면 다음 프레임에 패치도 스스로 사라진다 — «없는 것을 덮는 판때기» 0장',
     E ? (E.before + '장 → ' + E2 + '장') : '측정 실패');

  blk('F] 남의 부품 불변 — `keep` 을 안 준 호출은 패치가 0장');
  const F = await ev(p, () => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const el = document.querySelector('[data-rw="rl0"]');
    fxFlash(el);                                   /* 09·12·17·코스튬·장비의 단발 플래시와 **같은 호출** */
    return { flash: L.querySelectorAll('.fx-flash').length, keep: L.querySelectorAll('.fx-keep').length };
  });
  ok(!!F && F.flash === 1 && F.keep === 0,
     'F1 ★ 같은 호스트라도 넷째 인자를 안 주면 패치가 0장 — 공용 플래시는 한 프레임도 안 바뀐다',
     F ? ('플래시 ' + F.flash + ' · 패치 ' + F.keep) : '측정 실패');

  blk('R] 되돌림 — 넷째 인자를 떨구면 이 자가 통째로 빨개진다');
  await ev(p, FIRE, { ID: 'rl0', KEEP: false });
  await p.waitForTimeout(80);
  const R = await ev(p, READ, 'rl0');
  ok(!!R && R.nLab === 0 && R.nFlash === 1,
     'R1 ★ `keep` 을 떨군 사본에서는 라벨 패치가 0장이다(플래시는 그대로 뜬다)',
     R ? ('패치 ' + R.nLab + '장 · 플래시 ' + R.nFlash + '장') : '측정 실패');
  await ev(p, FIRE, { ID: 'rl0', KEEP: true });
  await p.waitForTimeout(80);
  const R2 = await ev(p, READ, 'rl0');
  ok(!!R2 && R2.nLab === 1,
     'R2 ★ 원복하면 다시 선다 — [B1] 이 «항상 1장» 을 재는 헛초록이 아니다',
     R2 ? (R2.nLab + '장') : '측정 실패');

  blk('W] 위생');
  ok(errs.length === 0, 'W1 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  info('대비 자체는 `verify683` [H1](봉투 전체 ≥3:1)·[H4](패치 걷으면 <3:1)가 화소로 잰다', '정착 21:1 ↔ 패치 걷으면 2.43:1');

  await browser.close();
  console.log('\nVERIFY795 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
