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
/* 993 되돌림 시험 손잡이 — `--stall <ms>` 로 창을 일부러 놓치게 한다(`tools/verify993.js` 가 쓴다).
   수명보다 큰 값을 주면 이 자는 «빨강» 이 아니라 «못 쟀다»(코드 3)로 답해야 한다. */
const _si = process.argv.indexOf('--stall');
const STALL = _si >= 0 && process.argv[_si + 1] ? Number(process.argv[_si + 1]) : 0;

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
     (자를 처음 짤 때 실제로 그랬다 · 344 «플레이키는 제품이 아니라 자의 것일 수 있다»).

   ⚑⚑ **993 — 발화와 읽기를 한 `evaluate` 안으로 합쳤다(이 자의 플레이키를 고친 것이 이것이다).**
     종전에는 `FIRE`(evaluate) → `waitForTimeout(80)` → `READ`(evaluate) 로 **읽는 시각이 Node 쪽
     왕복 지연에 달려 있었다.** 그런데 제품은 연출 노드를 **벽시계 타이머**로 걷는다
     (`fxBye` = `setTimeout(remove, …)` — 애니를 세워도 이 타이머는 돈다). 부하가 걸려 왕복이
     수명을 넘으면 노드가 **읽기 전에 사라져** 단언이 어긋난 게 아니라 **잴 것이 없어진다**:
       플래시만 죽음 → `[B2] flash idx -1 < keep idx 0`
       둘 다 죽음   → `[H1] 측정 실패` · `[H1b] 그릇 null` · `[R1] 패치 0장 · 플래시 0장`
     `probe993` 이 그 셋을 지연 사다리로 순서대로 찍고, 동시 6판에서 **2판 FAIL** 로 현장을 재현했다.
   ⇒ 이제 «발화 → rAF 두 바퀴 → 읽기» 가 **페이지 안에서** 끝난다(간격 3~20ms). 창을 놓치면
     아래 `shot()` 이 **다시 쏘고**, 끝내 못 재면 «못 쟀다»(종료 코드 3, 939 규약)로 답한다 —
     빨강으로 위장하지 않는다. 창을 놓친 것과 «제품이 플래시를 안 만들었다» 는 `n0` 로 가른다. */
const SHOT = async ({ ID, KEEP, STALL }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  const it = RELICS.filter(r => r.id === ID)[0]; if (!it) return null;
  if (KEEP === false) {                       /* [R] 되돌림 — 넷째 인자를 떨군 사본 */
    if (!window.__v795ff) { window.__v795ff = window.fxFlash;
      window.fxFlash = function (el, iv, inset) { return window.__v795ff.call(this, el, iv, inset); }; }
  } else if (window.__v795ff) { window.fxFlash = window.__v795ff; window.__v795ff = null; }
  rwSummonFx(it, true, null);
  const t0 = performance.now();
  /* 발화 «직후» 의 장수 — 창을 놓친 것(1 → 0)과 제품이 안 만든 것(처음부터 0)을 가르는 유일한 표 */
  const n0 = { flash: L.querySelectorAll('.fx-flash').length, keep: L.querySelectorAll('.fx-keep').length };
  try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = 20; } catch (_) {} }); } catch (_) {}
  /* 되돌림 시험용 손잡이 — 창을 일부러 놓치게 해 이 자가 «빨강» 이 아니라 «못 쟀다» 로 답하는지 본다 */
  if (STALL) await new Promise(r => setTimeout(r, STALL));
  /* rAF 두 바퀴 = 패치의 추적이 한 번 돈 뒤(제품이 실제로 그리는 자리). 종전 `waitForTimeout(80)` 자리다. */
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = window.__v795read(ID);
  out.t0 = t0; out.n0 = n0; out.gap = out.t1 - t0;
  return out;
};
/* 세운 뒤 rAF 한 바퀴를 돌리고 나서 읽는다(패치의 추적 한 번 = 제품이 실제로 그리는 자리).
   ⚠ 993 — 이 함수는 **페이지 안에 한 벌만** 심는다(`window.__v795read`, 아래 설치 한 줄).
     `SHOT` 안에 같은 코드를 다시 적으면 «두 벌» 이 되어 한쪽만 고쳐지는 자리가 생긴다. */
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
    id: ID, t1: performance.now(), nKeep: keeps.length, nLab: kLab.length, nFlash: flash.length,
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
  /* 993 — READ 를 페이지 안에 한 벌 심는다(`SHOT` 이 부른다 · 위 머리말의 «두 벌 금지»). */
  await p.evaluate(src => { window.__v795read = new Function('ID', 'return (' + src + ')(ID);'); }, READ.toString());

  /* ⚑ 993 — 한 판 «쏘고 읽는다». 창을 놓치면 다시 쏜다(창을 놓쳤다 = 발화 직후엔 있던 플래시가
     읽을 때 없다). ⚠ **재시도로 초록을 사지 않는다** — 되풀이하는 조건은 «플래시가 살아 있는가»
     하나뿐이고, 패치(이 자가 실제로 묻는 것)의 유무는 판정에 안 쓴다. 제품이 플래시를 아예 안
     만들면(`n0.flash === 0`) 그건 진짜 결함이라 **즉시 그대로 돌려준다**(재시도 금지). */
  /* 판수 — 창(노드 수명 ~220~330ms 실측) 안에 rAF 두 바퀴가 들어가야 한 판이 선다. 4중 동시 실행
     같은 극한에서는 한 판이 통째로 밀릴 수 있어 넉넉히 둔다(5 → 8 로 올리자 [4-a] 의 «못 쟀다» 가
     1/4 → 0/4 로 내려갔다). ⚠ 이 수를 올리는 것은 «초록을 사는 것» 이 아니다 — 되풀이 조건은
     «플래시가 살아 있는가» 뿐이고 패치 유무는 판정에 안 쓴다(위 `shot()` 머리말). */
  const TRIES = 8;
  const shot = async (ID, KEEP) => {
    let last = null;
    for (let i = 1; i <= TRIES; i++) {
      const s = await ev(p, SHOT, { ID, KEEP, STALL });
      if (s) { s.tries = i; last = s; }
      if (!s) continue;
      if (s.n0.flash === 0) return s;               /* 제품이 안 만들었다 — 잴 것이 없는 게 아니라 결함 */
      if (s.nFlash === 1) return s;                 /* 창 안에서 읽었다 */
    }
    return last;                                    /* 다섯 판 다 창을 놓쳤다 — 아래에서 «못 쟀다» */
  };
  /* 창을 끝내 못 잡으면 «빨강» 이 아니라 «못 쟀다»(코드 3)로 답한다 — 939 규약. */
  const missed = s => !!s && s.n0 && s.n0.flash === 1 && s.nFlash === 0;
  const giveUp = (s, where) => {
    console.error('\nverify795: ' + where + ' — 연출 노드가 읽기 전에 걷혔다(' + TRIES + '판 전부). '
      + '발화→읽기 간격 ' + r2(s && s.gap) + 'ms · `fxBye` 타이머가 그보다 짧다. '
      + '부하를 줄여 다시 돌리거나, 수명(`FXBYE_PAD`·`fxAnimEnd`)이 줄지 않았는지 보라 — 측정 실패다(단언 실패가 아니다).');
    process.exit(3);
  };

  const own = await ev(p, () => {
    for (let i = 0; i < 4000 && !(has('rl0') && has('rl1')); i++) summonRelic(true);
    renderRelw(); return { a: has('rl0'), b: has('rl1'), lv: oLv('rl0') };
  });

  blk('A] 전제 — 뿌리는 «세기» 가 아니라 «자리» 다 (라벨이 카드 밖으로 걸쳐 있다)');
  ok(!!own && own.a && own.b, 'A1 전제 — 대상 두 칸을 `summonRelic()` 실경로로 보유시켰다', own ? ('rl0 Lv.' + own.lv) : '실패');
  const K = await shot('rl0', true);
  if (missed(K)) giveUp(K, '[A~H] 본 표본');
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
  /* ⚑ 993 — 종전에는 `waitForTimeout(200)` 이었다. 부하로 프레임이 굶으면 그 200ms 안에 rAF 가
     한 번도 안 돌아 «패치가 안 걷혔다» 로 빨개진다(패치는 rAF 에서 스스로 걷힌다). 시간을 세지 말고
     **조건**을 기다린다 — 못 기다리면 그때 진짜 빨강이다. */
  const E2 = await p.waitForFunction(() => document.getElementById('fxl').querySelectorAll('.fx-keep').length === 0,
      null, { timeout: 5000 }).then(() => 0).catch(async () =>
      await ev(p, () => document.getElementById('fxl').querySelectorAll('.fx-keep').length));
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
  const R = await shot('rl0', false);
  if (missed(R)) giveUp(R, '[R1] 되돌림 표본');
  ok(!!R && R.nLab === 0 && R.nFlash === 1,
     'R1 ★ `keep` 을 떨군 사본에서는 라벨 패치가 0장이다(플래시는 그대로 뜬다)',
     R ? ('패치 ' + R.nLab + '장 · 플래시 ' + R.nFlash + '장') : '측정 실패');
  const R2 = await shot('rl0', true);
  if (missed(R2)) giveUp(R2, '[R2] 원복 표본');
  ok(!!R2 && R2.nLab === 1,
     'R2 ★ 원복하면 다시 선다 — [B1] 이 «항상 1장» 을 재는 헛초록이 아니다',
     R2 ? (R2.nLab + '장') : '측정 실패');

  blk('T] 측정 창 — 이 자가 «부하에서 빨개지던» 자리(993)');
  /* ⚠⚑ **여기에 «간격 < n ms» 를 적으면 993 을 다시 만든다.** 1회차에 실제로 그랬다 — `< 120ms` 로
     적었더니 부하 6판 중 4판이 **이 항만** 빨개졌다(다른 항은 전부 초록). 부하에서는 rAF 두 바퀴가
     길어질 수 있고 그래도 **수명 안이면 측정은 옳다.** 그러니 시간이 아니라 **창 안에서 읽었는가**
     라는 불변식을 묻는다(간격은 수로만 남긴다 — 문턱이 아니다). */
  ok(!!K && K.nFlash === 1 && K.gap !== undefined,
     'T1 ★ 읽기가 노드가 **살아 있는 동안**(창 안에서) 끝났다 — 종전(왕복 + `waitForTimeout(80)`)은 '
     + '부하에서 노드 수명(실측 ~265ms)을 넘겨 «잴 것이 없는» 빨강을 냈다',
     K ? ('간격 ' + r2(K.gap) + 'ms · 플래시 ' + K.nFlash + '장 · 표본 ' + K.tries + '판째') : '측정 실패');
  ok(!!K && K.n0 && K.n0.flash === 1,
     'T2 ★ 발화 «직후» 에 플래시가 1장 — 창을 놓친 것과 «제품이 안 만든 것» 을 가르는 표다',
     K && K.n0 ? ('발화 직후 플래시 ' + K.n0.flash + ' · 패치 ' + K.n0.keep) : '측정 실패');

  blk('W] 위생');
  ok(errs.length === 0, 'W1 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  info('대비 자체는 `verify683` [H1](봉투 전체 ≥3:1)·[H4](패치 걷으면 <3:1)가 화소로 잰다', '정착 21:1 ↔ 패치 걷으면 2.43:1');

  await browser.close();
  console.log('\nVERIFY795 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
