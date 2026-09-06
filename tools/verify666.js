#!/usr/bin/env node
/* 작업 666 게이트 — 「유물 소환 — 텍스트 이펙트 폐지, 유물화폐 아이콘이 **소환 버튼에서** 터진다」
 * (주인 지시 2026-09-02 00:40 · 660 규약의 유물 소환 확장 · 상세는 PROGRESS 666 행)
 *
 *   node tools/verify666.js
 *
 * 절:
 *   [A] 선언   — 연출이 `summonRelic()` 에서 빠져 **버튼 경로 한 함수**(`rwSummonFx`)로 모였고,
 *                재화 키는 손으로 안 적고 `PAY_CUR` 표에서 읽는다(402 «표 두 벌» 방지)
 *   [B] 그림   — 소환하면 버스트 입자가 **유물조각 아이콘**이다(크림 구슬 0알 · 이모지 0건)
 *   [C] 자리   — 스폰이 **소환 버튼 상자 안**이다 — 격자 칸(슬롯) 발 스폰 0건(주인 지목 자리)
 *   [D] 폐지   — 텍스트 플로터 0장(«이름 Lv.n» 델타 · «−n» 비용 둘 다)
 *   [E] 1:1    — 소환 N회 ↔ 버스트 N회(발화가 조용히 빠지지 않는다)
 *   [F] 불변   — 당첨 칸의 «어느 칸인가» 신호(플래시·펄스)는 살아 있고, 맥박·부족 반려도 그대로다
 *   [G] 캔슬 금지 — 홀드 동안 **수명 미달로 지워진 입자 0건**(660 보강 2 규약을 그대로 잇는다)
 *   [R] 되돌림 — 고친 축 셋을 각각 되돌리면 위 항이 빨개진다
 *
 * ⚠ 338 규칙 — 판정은 «함수를 불렀는가» 가 아니라 **`#fxl` 에 실제로 붙은 노드**로 센다.
 *   `fxBurst` 는 상한에서 조용히 줄어들 수 있으므로 호출 횟수로 세면 헛초록이 된다.
 * ⚠ 시각은 `MutationObserver` 가 아니라 `appendChild`/`remove` 후킹으로 찍는다 —
 *   관찰자 콜백은 마이크로태스크로 묶여 늦게 와서 «수명» 을 못 잰다(verify660 머리말의 실측).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { holdUntil } = require('./holdburst');     /* 785 — 홀드 표본 문턱 공용 부품 */
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V666_HOLD || 1800);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 계측기 — 제품은 한 줄도 안 고친다. `#fxl` 에 붙는 노드를 종류·자리·수명으로 적고,
   소환 성공(`summonRelic` 이 아이템을 돌려준 순간)을 [E] 의 분모로 센다. */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';   /* 전투 캔버스는 잴 것이 없다 */
  const P = (window.__v666 = { add: [], gone: [], buys: [] });
  const L = document.getElementById('fxl');
  const kindOf = el => {
    const c = (el.className || '') + '';
    /* ⚑⚑ 683 이관 — **이 화면에는 이제 이미터가 둘이다.** 666 의 규약(«스폰은 버튼뿐»)은
       **지불 버스트 이미터**의 것이고, 683(주인 지시 2026-09-02 00:33 «유물소환했을때 해당 유물쪽에
       해당 유물 파티클떠야함»)이 «획득 유물 카드» 를 원점으로 하는 **별도 이미터**를 세웠다.
       ⇒ 아래 [C1][C2] 는 «전부» 가 아니라 **지불 이미터의 알**만 묻도록 이관됐다(333 처방 —
       항을 지우지 않고 방향을 좁혔다). 획득 이미터 쪽은 `tools/verify683.js` 가 따로 단언한다.
       ⚠ `.fx-rlic` 를 `.fx-cic` 보다 **먼저** 본다 — 두 클래스가 겹치지는 않지만, 갈래의 뜻이
         «무엇으로 그려졌나» 가 아니라 «어느 이미터가 낳았나» 라는 것을 순서로도 못박는다. */
    if (/fx-rlic/.test(c))  return 'rlic';    /* 683 — 획득 이미터(그 유물 글리프) */
    if (/fx-cic/.test(c))   return 'icon';    /* 660·666 — 재화 아이콘 버스트(지불 이미터) */
    if (/fx-spark/.test(c)) return 'spark';   /* 종전 크림 구슬 */
    if (/fx-spd/.test(c))   return 'spend';   /* 583 화폐 비행(658 이 폐지) */
    if (/fx-delta/.test(c)) return 'delta';   /* «이름 Lv.n» 텍스트 델타(666 폐지 대상) */
    if (/fx-plus/.test(c))  return 'float';   /* «+n»·«−n» 숫자 플로터(666 폐지 대상) */
    if (/fx-flash/.test(c)) return 'flash';
    if (/fx-toast/.test(c)) return 'toast';
    return 'etc';
  };
  /* ⚑ 700 이관 — 소환 경로가 **배치 하나**로 접혔다(`summonRelicBatch`, ×1 은 n = 1 인 배치다).
     그래서 «몇 번 소환했는가» 를 세는 자리도 그 함수다. 종전처럼 `summonRelic` 을 감으면
     배수 토글이 붙은 뒤로는 **한 건도 안 세어져** [B1]·[E1]·[R3] 이 «0회» 로 빨개진다.
     ⚠ 세는 단위가 «장» 이 아니라 **«실행»** 인 것이 700 의 규약이다 — 666 의 «소환마다 버스트»
       는 이제 «실행마다 버스트» 이고, 그것을 [E3] 이 ×100 으로 직접 못박는다(항을 눌러
       초록으로 되돌리기만 하면 «×100 이 100발 터져도 초록» 이 된다 — 328~330 교훈). */
  { const f = window.summonRelicBatch;
    window.summonRelicBatch = function (...a) { const r = f.apply(this, a);
      if (r) P.buys.push({ t: performance.now(), n: a[0] }); return r; }; }
  const stamp = nd => {
    if (nd.nodeType !== 1) return;
    const t = performance.now();
    const b = nd.getBoundingClientRect();
    const im = nd.querySelector && nd.querySelector('img.cic');
    let intended = 380;
    try { const d = parseFloat(getComputedStyle(nd).animationDuration); if (d > 0) intended = d * 1000; } catch (_) {}
    /* 2회차 — «이동» 축(아래 [C3]). 입자는 CSS 변수 `--dx/--dy` 만큼 날아간다 —
       끝점을 프레임에서 다시 재는 것보다 **제품이 적어 둔 값**을 읽는 쪽이 정확하다(619 12회차 규약).
       ⚠ **3회차 — append 시점에 읽으면 안 된다.** 제품이 스폰 «직후» 에 그 값을 손보는 자리가
         생겼으므로(`rwSummonFx` 의 `RW_FX_FLY`), append 훅에서 읽으면 **손보기 전 값**이 잡혀
         자가 «안 고쳤다» 고 말한다(3회차 1차 실행에서 실제로 118px = 기저값이 나왔다).
         → 마이크로태스크로 미뤄 **그 프레임의 최종값**을 읽는다. */
    const dx = parseFloat(nd.style.getPropertyValue('--dx')) || 0;
    const dy = parseFloat(nd.style.getPropertyValue('--dy')) || 0;
    const rec = { k: kindOf(nd), t, born: t, intended, dx, dy,
                  x: b.x + b.width / 2, y: b.y + b.height / 2,
                  cur: im ? (im.getAttribute('data-cur-ic') || '') : '',
                  img: !!im, txt: (nd.textContent || '').trim().slice(0, 24) };
    nd.__v666 = rec; P.add.push(rec);
    queueMicrotask(() => {                            /* 위 머리말 — 손본 «최종» 이동값으로 갱신 */
      const fx = parseFloat(nd.style.getPropertyValue('--dx')), fy = parseFloat(nd.style.getPropertyValue('--dy'));
      if(Number.isFinite(fx)) rec.dx = fx;
      if(Number.isFinite(fy)) rec.dy = fy;
      /* ⚑ 990 신설 — **태생 «자리» 도 최종값이 따로 있다.** 위 `rec.x/y` 는 append 순간의
         `getBoundingClientRect`(= `fxBurst` 가 링 위에 앉힌 자리 · 뷰포트 좌표)인데,
         `rwSummonFx` 는 그 뒤 **같은 각으로 태생점을 옮겨 적는다**(`left/top`). [A3b] 는
         «태생점 + 최종 방향» 이 한 직선이어야 성립하므로 **그 최종 자리**를 따로 남긴다.
         ⚠ 단위가 다르다 — `left/top` 은 fx 레이어 좌표라 [A3b] 는 `iconFx`(같은 좌표)에 대고 묻는다.
           `rec.x/y`(뷰포트)를 그대로 두는 이유는 [C1][C2][C4] 가 뷰포트 상자와 짝이기 때문이다. */
      const lx = parseFloat(nd.style.left), ly = parseFloat(nd.style.top);
      if(Number.isFinite(lx)) rec.lx = lx;
      if(Number.isFinite(ly)) rec.ly = ly;
      /* ⚑⚑ 683 이관 — **갈래도 «최종» 으로 다시 읽는다.** 3회차가 이동값에서 배운 것과 **같은 교훈**이다:
         제품이 스폰 «직후» 에 손보는 자리가 또 하나 생겼다 — 683 의 획득 이미터는 `fxBurst` 가
         `.fx-cic`(재화 `<img>`)로 낳은 알을 그 자리에서 `.fx-rlic`(유물 글리프)로 갈아 끼운다.
         append 훅에서만 읽으면 **획득 알이 지불 알로 잡혀** [C1] 이 «밖 30/72» 로 빨개진다
         (이관 전 실측이 정확히 그 값이었다 — 갈래를 안 고치고 [C1] 을 손대면 «지불 이미터가
         버튼 밖에서 나도 초록» 인 헛초록이 된다). 그림 축(`img`·`txt`)도 같이 최종값으로 갱신한다. */
      const k2 = kindOf(nd);
      if(k2 !== rec.k) rec.k = k2;
      const im2 = nd.querySelector && nd.querySelector('img.cic');
      rec.img = !!im2;
      rec.cur = im2 ? (im2.getAttribute('data-cur-ic') || '') : '';
      rec.txt = (nd.textContent || '').trim().slice(0, 24);
    });
  };
  const ap = L.appendChild.bind(L);
  L.appendChild = nd => { const r = ap(nd); stamp(nd); return r; };
  const bye = rec => { if (!rec || rec.life != null) return; rec.life = performance.now() - rec.born; P.gone.push(rec); };
  const rm = Element.prototype.remove;
  Element.prototype.remove = function () { if (this.parentNode === L) bye(this.__v666); return rm.call(this); };
  const rc = Node.prototype.removeChild;
  Node.prototype.removeChild = function (c) { if (this === L && c) bye(c.__v666); return rc.call(this, c); };
};

const OPEN = () => {
  try { closeModal(); closeTrain(); closeDungeon(); closeShopPage(); } catch (_) {}
  S.relic = 1e12;                       /* 274 — 비용은 상수 100 이라 홀드가 안 마른다 */
  openRelw();
};

/* 한 번의 계측 — «지운다 → 누른다 → 마지막 세대가 제 수명을 다 살 때까지 기다린다»
 * ⚑ 785 — 누르는 시간이 아니라 **모을 표본 수**를 받는다. `need` 가 찰 때까지 누르고 `maxMs` 에서
 *   끊는다(공용 부품 `tools/holdburst.js`). `minMs` 는 종전 «고정 시간» 을 **바닥**으로 남긴 것 —
 *   빠른 기계에서 지금까지와 똑같이 누르고, 느린 기계에서만 더 기다린다.
 *   수리 전 이 자는 1800ms 에서 소환 **2회**에 그쳐 [B1](문턱 4)과 [E1](같은 문턱을 분모 전제로
 *   접어 둔 자리)이 **둘 다** 빨갰다 — 785 재현 로그가 그 값이다. */
async function press(page, opt) {
  const o = Object.assign({ need: 4, minMs: HOLD_MS, maxMs: 30000 }, typeof opt === 'number' ? { minMs: opt, maxMs: Math.max(30000, opt) } : opt);
  await page.evaluate(() => { const P = window.__v666; P.add.length = 0; P.gone.length = 0; P.buys.length = 0; });
  const g = await page.evaluate(() => {
    const b = document.getElementById('rwBasin'), gr = document.getElementById('rwGrid');
    if (!b || !gr) return null;
    const bb = b.getBoundingClientRect(), gb = gr.getBoundingClientRect();
    /* ⚑ 990 이관 — 발원을 «그릇 아가리» 에서 **가격바 화폐 아이콘**으로 옮겼다(아래 [A3]).
       ⚠ 상자는 **누르기 «전»** 에 잰다 — `hbBeat('#rwBasin')` 의 맥박이 버튼을 늘였다 줄이므로
         버튼 축으로 재면 판정이 위상 제비뽑기가 된다(871 이 훈련에서 세운 그 규칙).
         가격 알약은 버튼의 **형제**라 맥박을 안 타고, 그래서 이 값이 곧 제품이 쓴 값이다. */
    const ic = document.querySelector('#rwCost [data-cur-slot]');
    const ib = ic ? ic.getBoundingClientRect() : null;
    const ifx = (ic && typeof fxRect === 'function') ? fxRect(ic) : null;
    return { btn: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
             grid: { x: gb.x, y: gb.y, w: gb.width, h: gb.height },
             icon: ib ? { x: ib.x + ib.width / 2, y: ib.y + ib.height / 2,
                          d: (ib.width + ib.height) / 2 } : null,
             iconFx: ifx ? { x: ifx.x + ifx.w / 2, y: ifx.y + ifx.h / 2,
                             d: (ifx.w + ifx.h) / 2 } : null };
  });
  if (!g) return null;
  const hb = await holdUntil(page, { at: { x: g.btn.x + g.btn.w / 2, y: g.btn.y + g.btn.h / 2 },
                                     need: o.need, minMs: o.minMs, maxMs: o.maxMs, settleMs: 520,
                                     count: () => window.__v666.buys.length, mode: 'mouse' });
  const d = await page.evaluate(() => { const P = window.__v666;
    return { add: P.add.slice(), gone: P.gone.slice(), buys: P.buys.slice() }; });
  return Object.assign(d, g, { hb });
}
const inBox = (a, r, M) => a.x >= r.x - M && a.x <= r.x + r.w + M && a.y >= r.y - M && a.y <= r.y + r.h + M;

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 연출은 버튼 경로 한 함수에 모였고 재화 키는 표에서 온다');
  /* ⚠ **주석을 벗기고 센다.** 이 저장소는 «무엇을 왜 지웠는가» 를 지운 자리에 그대로 적어 두므로
     (295-②·399·460 «죽은 코드 금지» 의 짝 규약), 주석 안에 지운 코드가 문자열로 남는다.
     안 벗기면 자가 자기 설명문을 «살아 있는 호출» 로 읽어 영원히 빨갛다(1회차에 A1·A8 이 그랬다). */
  const nc = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const body = nc((code.split('function summonRelic(quiet){')[1] || '').split('\nfunction openRelw()')[0]);
  ok(body.length > 0 && !/fxUpOk\(|fxDelta\(|fxBurst\(/.test(body),
     'A1 `summonRelic()` 본체에 연출 호출 0건 — 텍스트 델타·격자 발 버스트가 통째로 빠졌다',
     body ? '본문 ' + body.length + '자' : '본문을 못 찾았다');
  /* 683 이관 — 셋째 인자 `iv`(다음 틱까지의 간격)가 붙었다. **«한 함수» 라는 뜻은 그대로**이고
     바뀐 것은 인자 하나라, 모양을 그 자리에서 넓히되 «first» 는 계속 요구한다(첫 발/틱 갈래의 뿌리). */
  ok(/function rwSummonFx\(it, first(, iv)?\)\{/.test(code),
     'A2 회당 연출이 **한 함수**(`rwSummonFx`)다 — 첫 발·홀드 틱이 같은 자리를 지난다(1:1 축의 뿌리)');
  /* ⚑⚑ 990 이관 — **항을 지우지 않고 묻는 자리만 갈아 끼웠다**(333 처방). 종전 항은 발원을
     «그릇 아가리»(`RW_FX_Y` = 상자 높이의 28%)로 못 박고 있었는데, 세 회차 네 사람이 그 자리를
     결함으로 적었고(838 5회차 DF·DG · 11회차 DL·DM — 알 궤적 교점이 유물화폐 아이콘에서
     124~136px = 아이콘 Ø 의 4.1~4.4배) 주인이 666 에 준 문장 자체가 «유물 소환 버튼에서
     **유물화폐 아이콘** 파티클» 이라 **종전 항이 규약 위반 쪽을 지키고 있었다**.
     ⇒ 지금 묻는 것은 셋이다 — ① 발원을 손 상수가 아니라 **가격바 화폐 아이콘에서 읽는가**
     ② 그 표가 말하는 재화(`PAY_CUR.relic`)로 터지는가 ③ **찍힌 알이 실제로 그 점에서 나는가**
     (아래 [A3b] — 모양만 맞추고 값이 딴 데면 그쪽이 빨개진다). */
  /* ⚠ 마지막 항은 «글자가 없다» 가 아니라 «**선언**이 없다» 를 묻는다 — 3·4회차 머리말은 왜 그 값이
     었는지의 유일한 근거라 남겨 두는 것이 규약이다(58·683). 되살아나는 것은 `const` 쪽이다. */
  ok(/function rwPayFrom\(\)\{/.test(code) && /\$\('rwCost'\)[\s\S]{0,80}data-cur-slot/.test(code)
     && /fxBurst\(\{ x:cx, y:cy \}[^;]*PAY_CUR\.relic\)/.test(code)
     && !/const RW_FX_Y\b/.test(code),
     'A3 발화가 «가격바 유물화폐 아이콘» 에서 «표가 말하는 재화(`PAY_CUR.relic`)» 로 터진다(990 — 손 상수 `RW_FX_Y` 는 선언째 걷혔다)');
  ok(/const PAY_CUR = \{[^}]*relic:'relic'/.test(code),
     'A4 `PAY_CUR` 표에 유물 소환 자리가 있다 — 화폐 문자열을 호출부에 손으로 안 적는다(402 규약)');
  /* 2회차 — `upFx` 의 세대 큐를 안 타므로 상한을 **여기서** 지킨다. `fxBurst` 의 FXMAX 가드는
     «넘으면 통째로 return» 이라 그대로 두면 발화가 조용히 빠진다([E1] 이 깨진다). */
  ok(/Math\.max\(1, Math\.min\(first \? RW_FX_N0 : UPFX_N, FXMAX - L\.childElementCount - 1\)\)/.test(code),
     'A5 상한을 «걷기» 가 아니라 «개수 줄이기» 로 지키고 바닥 1알을 보장한다(660 처방 · 발화는 안 빠진다)');
  /* ⚑ 880 이관 — 항을 지우지 않고 **묻는 것만 갈아 끼웠다**(333 처방).
     종전 자는 `RW_FX_FLY).toFixed(1)` 이라는 **최종 식의 모양**을 그대로 물고 있었는데,
     880 이 그 이동에 «위쪽 벽까지» 상한을 얹으면서(`fly = min(mag * RW_FX_FLY, room)`)
     식의 모양만 바뀌고 **이 항이 지키던 뜻은 한 글자도 안 바뀌었다**(`iv` 안 넘김 · 이동을
     이 자리에서 `RW_FX_FLY` 로 늘림 · 공용 상수 불변). ⇒ 모양이 아니라 그 셋을 묻는다.
     「벽이 없으면 값이 종전과 같다」 는 `verify880` [C5] 가 실런타임으로 못박는다. */
  ok(/, FXPAL\.up, n, false, null, PAY_CUR\.relic\)/.test(code)
     && /mag \* RW_FX_FLY/.test(code)
     && /setProperty\('--dx',/.test(code) && /setProperty\('--dy',/.test(code),
     'A5b `iv` 는 안 넘기고(수명 그대로) **이동만** 이 자리에서 `RW_FX_FLY` 로 늘린다 — 공용 상수는 불변(3회차 · 880 이관)');
  const rw = nc((code.split('function rwHoldTick(){')[1] || '').split('\n[\'pointerup\'')[0]);
  /* 683 이관 — 홀드 틱은 이제 그 틱의 간격을 같이 넘긴다(`rwSummonFx(it, false, h.iv)`).
     ⚠ 첫 발은 **안 넘기는 것이 정답**이다(단발이라 «다음 틱» 이 없다 — 넘기면 수명이 반토막 난다). */
  ok(/rwSummonFx\(it, false(, h\.iv)?\)/.test(rw) && /rwSummonFx\(it, true\)/.test(rw),
     'A6 두 호출부(홀드 틱 · 첫 발)가 그 함수를 지난다', rw ? '' : 'rwHold 절을 못 찾았다');
  ok(rw.length > 0 && (rw.match(/hbBeat\('#rwBasin', true, null, null\)/g) || []).length === 2,
     'A7 맥박은 남고 «−n» 비용 인자는 두 자리 모두 `null` 이다(숫자 플로터 폐지)',
     (rw.match(/hbBeat\('#rwBasin'/g) || []).length + '자리');
  ok(rw.length > 0 && !/relicCost\(\)/.test(rw),
     'A8 죽은 지역 변수 0 — 비용을 읽던 `const cost`/`cost0` 이 선언째 사라졌다(295-②·399·460)');

  /* ── 측정 ──────────────────────────────────────────────────────────── */
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof openRelw === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(ARM);
  await page.evaluate(OPEN);
  await page.waitForTimeout(400);

  const H = await press(page, { need: 4, minMs: HOLD_MS });
  if (!H) { ok(false, 'B0 89 유물 페이지를 못 열었다'); await browser.close(); process.exit(1); }
  const icons = H.add.filter(a => a.k === 'icon');
  const beads = H.add.filter(a => a.k === 'spark');
  const texts = H.add.filter(a => a.k === 'float' || a.k === 'delta');
  console.log('  · 소환 ' + H.buys.length + '회 · 아이콘 ' + icons.length + '알 · 구슬 ' + beads.length
            + '알 · 텍스트 ' + texts.length + '장 · 노드 ' + H.add.length);

  /* ── [B] 그림 ─────────────────────────────────────────────────────── */
  console.log('\n[B] 그림 — 버스트 입자가 유물조각 아이콘이다 (홀드 ' + HOLD_MS + 'ms)');
  ok(H.buys.length >= 4, 'B1 홀드가 여러 번 소환한다(전제 · 488 [E1] 과 같은 문턱 · 785 공용 부품)',
     H.buys.length + '회 · ' + (H.hb ? H.hb.note : ''));
  ok(icons.length >= 8, 'B2 아이콘 버스트가 실제로 터진다(≥8알)', icons.length + '알');
  ok(beads.length === 0, 'B3 종전 크림 구슬 **0알** — 그림이 한 어휘로 통일됐다', '구슬 ' + beads.length + '알');
  const wrong = icons.filter(a => a.cur !== 'relic');
  ok(icons.length > 0 && wrong.length === 0, 'B4 아이콘이 전부 `relic`(지불 재화)이다',
     '어긋난 알 ' + wrong.length + (wrong.length ? ' (' + [...new Set(wrong.map(w => w.cur || '없음'))].join(',') + ')' : ''));
  ok(icons.length > 0 && icons.every(a => a.img),
     'B5 그림은 125 규약 자산(`img.cic`)이다 — 이모지·글자가 아니다');

  /* ── [C] 자리 ─────────────────────────────────────────────────────── */
  /* 주인 지목: «유물소환 버튼에서 유물화폐 아이콘 파티클 이펙트». 660 이 세운 «스폰은 버튼뿐».
     ⚠ 여유 2px 은 반올림 한 칸이다 — 619 의 가둠 상자가 중심을 이미 버튼 안으로 들여 놓는다. */
  console.log('\n[C] 자리 — **지불 이미터**의 스폰 중심이 «소환 버튼» 상자 안이다 (격자 칸 발 0건) · 그리고 실제로 날아간다');
  /* ⚑⚑ 683 이관 — 묻는 대상이 «이 화면의 모든 알» 에서 **«지불 이미터의 알»** 로 좁혀졌다.
     주인 지시 683 이 «획득 유물 카드» 를 원점으로 하는 둘째 이미터를 세웠기 때문이고, 그쪽은
     `tools/verify683.js` 가 «획득 카드에서 난다 · 미획득 카드 0건» 으로 따로 단언한다.
     ⚠ **항을 지우지 않았다**(333 처방) — 지불 알이 한 알이라도 버튼 밖에서 나면 여전히 빨갛고,
       그것이 666 이 주인에게서 받은 지시(«유물소환 버튼에서 유물화폐 아이콘 파티클»)의 전부다.
     ⚠ [C2] 는 **공허한 음성항이 아니다**(422 교훈) — `.fx-rlic` 만 빠졌을 뿐 지불 아이콘·크림 구슬이
       격자에서 나면 그대로 빨개진다. 되돌림 [R2] 가 매 실행 그것을 실제로 빨갛게 만들어 보인다. */
  const outs = icons.filter(a => !inBox(a, H.btn, 2));
  ok(icons.length > 0 && outs.length === 0, 'C1 ★ **지불 알의 탄생 좌표**가 전부 버튼 상자 안이다(지불 스폰 = 버튼뿐)',
     '밖 ' + outs.length + '/' + icons.length);
  /* ⚑⚑ 990 신설 — [A3] 의 **런타임 짝**. 선언만 물으면 «모양은 맞고 값은 딴 데» 를 못 잡는다.
     알마다 노드에 적힌 «태생점 + 최종 방향» 이 곧 그 알의 직선이고, 한 버스트의 알들은
     **발원 한 점에서 갈라져 나가므로** 그 점까지의 수직거리가 전부 0 이다(제품이 태생점을
     `발원 + r0·(cos,sin)` 로, 이동을 같은 각으로 적는다 — 838 11회차 두 사람이 프레임 변위로
     역투영해 쓴 그 산수이고, 여기서는 표본 오차 없이 같은 수를 얻는다).
     ⚠ 문턱 2px 은 반올림 한 칸이다(제품이 `toFixed(1)` 로 적는다) — 수리 전 이 값은
       **124~136px** 이었으므로 한 칸도 안 겹친다. */
  const rayOff = H.iconFx ? icons.map(a => {
    const m = Math.hypot(a.dx, a.dy);
    if (!(m > 0.5) || !Number.isFinite(a.lx) || !Number.isFinite(a.ly)) return null;
    const vx = H.iconFx.x - a.lx, vy = H.iconFx.y - a.ly;
    return Math.abs((vx * a.dy - vy * a.dx) / m);
  }).filter(v => v !== null) : [];
  const rayMax = rayOff.length ? Math.max(...rayOff) : Infinity;
  ok(!!H.iconFx && rayOff.length > 0 && rayMax <= 2,
     'A3b ★ **찍힌 알의 궤적이 전부 그 아이콘 중심을 지난다** — 발원이 그릇이면 여기가 빨개진다(990)',
     '최악 ' + (Number.isFinite(rayMax) ? p2(rayMax) : '—') + 'px / 아이콘 Ø ' + (H.iconFx ? p2(H.iconFx.d) : '—')
       + ' · 알 ' + rayOff.length + '개');
  const gridSpawn = H.add.filter(a => (a.k === 'icon' || a.k === 'spark') && !inBox(a, H.btn, 2) && inBox(a, H.grid, 0));
  ok(gridSpawn.length === 0, 'C2 ★ 격자(슬롯) 발 **지불** 파티클 0건 — 수리 전 여기가 유일한 발화점이었다',
     gridSpawn.length + '알');
  /* ⚑⚑ 2회차 신설 — **«터진다» 는 이동으로만 성립한다.** 1회차(요소 버스트)는 [C1][C2] 를 통과하고도
     비평가 2인이 독립으로 «단 하나» 를 같은 말로 냈다: «380ms 내내 버튼 상자를 못 나간다 · 총 이동
     39~44px · 정지 장식 링». 게이트가 «태어난 자리» 만 물으면 그 그림을 못 잡는다 —
     **이동량과 «상자를 넘는가» 를 같이 물어야** 한다. 문턱은 제품 값에서 온다(점 버스트 산포 80~150). */
  const trav = icons.map(a => Math.hypot(a.dx, a.dy)).sort((x, y) => x - y);
  const tmed = trav.length ? trav[Math.floor(trav.length / 2)] : 0;
  ok(tmed >= 80, 'C3 ★ 이동 거리 중앙값 ≥ 80px — 링이 아니라 «터짐» 이다', p2(tmed) + 'px');
  const flyOut = icons.filter(a => !inBox({ x: a.x + a.dx, y: a.y + a.dy }, H.btn, 0)).length;
  ok(icons.length > 0 && flyOut / icons.length >= 0.25,
     'C4 ★ 끝점이 버튼 상자 밖인 입자가 4알 중 1알 이상 — «바깥으로 흩어진다» 가 그림으로 선다',
     flyOut + '/' + icons.length + ' = ' + p2(flyOut / (icons.length || 1)));

  /* ── [D] 폐지 ─────────────────────────────────────────────────────── */
  console.log('\n[D] 폐지 — 텍스트가 떠오르는 이펙트 0장(주인 «텍스트로 존나 이펙트 하는거 빼기»)');
  ok(texts.length === 0, 'D1 ★ 텍스트 플로터 0장 — «이름 Lv.n» 델타도 «−n» 비용도 안 뜬다',
     texts.length + '장' + (texts.length ? ' (' + texts.slice(0, 4).map(t => t.txt).join(',') + ')' : ''));
  ok(H.add.filter(a => a.k === 'spend').length === 0,
     'D2 화폐 비행(`fx-spd`)도 0장 — 658 이 폐지한 어휘가 이 화면으로 새지 않았다');

  /* ── [E] 1:1 ──────────────────────────────────────────────────────── */
  console.log('\n[E] 1:1 — 소환 N회 ↔ 버스트 N회 (발화가 조용히 빠지지 않는다)');
  let hit = 0;
  H.buys.forEach(b => { if (icons.some(f => f.t >= b.t - 12 && f.t <= b.t + 80)) hit++; });
  const ratio = H.buys.length ? p2(hit / H.buys.length) : 0;
  ok(H.buys.length >= 4 && ratio >= 0.95, 'E1 ★ 소환마다 버스트가 터진다(≥0.95)',
     hit + '/' + H.buys.length + ' = ' + ratio);
  ok(H.buys.every(b => b.n === 1),
     'E2 배수를 안 켰으면 실행 단위는 «1장» 이다(700 이 켠 축이 기본값으로 새지 않는다)',
     '실행별 장수 ' + [...new Set(H.buys.map(b => b.n))].join(','));
  /* ⚑ 700 이관 — 666 의 «소환마다 1회» 는 배수가 붙은 뒤 «**실행**마다 1회» 다.
     이 항이 없으면 ×100 이 **100발**을 터뜨려도 [E1] 은 초록이다(실행 1건에 버스트가
     있기만 하면 되니까). 328~330 이 남긴 교훈 그대로 — 누른 항을 묻는 항을 한 줄 더 넣는다. */
  {
    await page.evaluate(() => { const P = window.__v666; P.add.length = 0; P.buys.length = 0;
      S.relic = 1e12; openRelw();
      document.querySelector('#rwMulBar [data-mul="100"]').click(); });
    const b = await page.evaluate(() => {
      const e = document.getElementById('rwBasin');
      e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      return true;
    });
    await page.waitForTimeout(520);
    /* 상한은 손으로 안 적는다 — 제품의 «첫 발» 상수를 그대로 읽는다(값이 바뀌면 따라온다) */
    const m = await page.evaluate(() => { const P = window.__v666;
      return { buys: P.buys.slice(), icons: P.add.filter(a => a.k === 'icon').length,
               lim: typeof RW_FX_N0 === 'number' ? RW_FX_N0 : 10 }; });
    const RW_FX_N0_LIM = m.lim;
    await page.evaluate(() => { document.querySelector('#rwMulBar [data-mul="1"]').click(); });
    ok(b && m.buys.length === 1 && m.buys[0].n === 100 && m.icons > 0 && m.icons <= RW_FX_N0_LIM,
       'E3 ★ 700 — ×100 을 한 번 눌러도 발화는 **한 벌**이다(1 실행 = 1 버스트 · 100발이 아니다)',
       '실행 ' + m.buys.length + '건(장수 ' + (m.buys[0] ? m.buys[0].n : '-') + ') · 아이콘 '
       + m.icons + '알(상한 ' + RW_FX_N0_LIM + ')');
  }

  /* ── [F] 불변 ─────────────────────────────────────────────────────── */
  /* 주인이 뺀 것은 «텍스트» 다 — 10종 중 무엇이 올랐는지 말하는 칸 신호는 남아야 한다. */
  console.log('\n[F] 불변 — 당첨 칸 신호 · 버튼 맥박 · 부족 반려');
  const cellFx = H.add.filter(a => a.k === 'flash' && inBox(a, H.grid, 0) && !inBox(a, H.btn, 2));
  ok(cellFx.length > 0, 'F1 ★ 당첨 칸의 플래시가 남아 있다 — «어느 유물이 올랐는가» 채널은 안 지웠다',
     cellFx.length + '장');
  const btnFlash = H.add.filter(a => a.k === 'flash' && inBox(a, H.btn, 2) && !inBox(a, H.grid, 0));
  ok(btnFlash.length === 0, 'F2 버튼에는 플래시를 안 건다 — 625 «한 자리에 플래시 한 장»(맥박이 맡는다)',
     btnFlash.length + '장');
  const F3 = await page.evaluate(() => {
    const el = document.getElementById('rwBasin');
    const n0 = document.querySelectorAll('#fxl .fx-toast').length;
    S.relic = 0; renderRelw();
    const r = summonRelic();                                   /* 부족 반려 — 안내는 그대로 */
    const lack = document.getElementById('rwCost').classList.contains('lack');
    return { ret: r, lack, toast: document.querySelectorAll('#fxl .fx-toast').length - n0 };
  });
  ok(F3 && F3.ret === null && F3.lack, 'F3 조각이 모자라면 그대로 반려되고 비용 알약이 `.lack` 이다',
     F3 ? 'ret ' + F3.ret + ' · lack ' + F3.lack : 'n/a');
  ok(F3 && F3.toast >= 1, 'F4 부족 안내(149 토스트)는 살아 있다 — 이 지시는 «연출» 이지 «안내» 가 아니다',
     F3 ? F3.toast + '장' : 'n/a');
  ok(errs.length === 0, 'F5 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [G] 캔슬 금지 ────────────────────────────────────────────────── */
  /* 660 보강 2(주인 «영점 몇초 단위로 알갱이가 캔슬되는데 그거는 하지말기») — 이 화면도 같은 규약이다. */
  console.log('\n[G] 캔슬 금지 — 홀드 동안 수명 미달로 지워진 입자 0건');
  const early = H.gone.filter(a => a.k === 'icon' && a.life < a.intended * 0.9);
  const lives = H.gone.filter(a => a.k === 'icon').map(a => a.life).sort((x, y) => x - y);
  ok(lives.length > 0 && early.length === 0, 'G1 ★ 조기 소멸 0알',
     '조기 ' + early.length + '/' + lives.length + ' · 수명 중앙값 '
     + (lives.length ? p2(lives[Math.floor(lives.length / 2)]) : 0) + 'ms');

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  /* 무르게 푼 수리가 아님을 세 겹으로 못박는다(334·368·660 규약). 제품 파일은 안 건드리고
     **페이지에서** 고친 축을 하나씩 되돌린 뒤, 위 항이 실제로 빨개지는지 본다. */
  console.log('\n[R] 되돌림 — 고친 축을 되돌리면 위 항이 빨개진다');
  const reboot = async (extra) => {
    await page.reload(); await page.waitForFunction(() => typeof openRelw === 'function');
    await page.waitForTimeout(700);
    await page.evaluate(ARM); await page.evaluate(OPEN);
    if (extra) await page.evaluate(extra);
    await page.waitForTimeout(400);
  };
  {
    /* R1 — `ic` 를 떨군다(= B4·B5 의 축) */
    await reboot(() => { const f = window.fxBurst;
      window.fxBurst = function (t, col, n, strict, iv) { return f.call(this, t, col, n, strict, iv); }; });
    const d = await press(page, { need: 2, minMs: 900, maxMs: 12000 });
    const ic = d ? d.add.filter(a => a.k === 'icon').length : -1;
    const bd = d ? d.add.filter(a => a.k === 'spark').length : -1;
    ok(ic === 0 && bd > 0, 'R1 `ic` 를 떨구면 아이콘 0알 · 종전 구슬로 되돌아간다 — [B2][B4] 이 빨개지는 자리',
       '아이콘 ' + ic + ' · 구슬 ' + bd);
  }
  {
    /* R2 — **수리 전 그 한 줄을 되살린다**: 격자 칸에서 터지는 크림 스파크 + «이름 Lv.n» 텍스트 델타 */
    /* 700 이관 — 되살리는 자리도 배치다(수리 전 한 줄은 «뽑은 그 유물의 칸» 에 걸렸고,
       배치가 돌려주는 것이 바로 그 «마지막 한 장» 이라 물음이 그대로 산다). */
    await reboot(() => { const f = window.summonRelicBatch;
      window.summonRelicBatch = function (...a) { const it = f.apply(this, a);
        if (it) { const el = document.querySelector('#rwGrid [data-rw="' + it.id + '"]');
          if (el) fxUpOk(el, el, it.n + ' Lv.' + oLv(it.id)); }
        return it; }; });
    const d = await press(page, { need: 2, minMs: 900, maxMs: 12000 });
    const tx = d ? d.add.filter(a => a.k === 'float' || a.k === 'delta').length : -1;
    const gs = d ? d.add.filter(a => (a.k === 'icon' || a.k === 'spark') && !inBox(a, d.btn, 2) && inBox(a, d.grid, 0)).length : -1;
    ok(tx > 0 && gs > 0, 'R2 수리 전 한 줄을 되살리면 텍스트가 뜨고 격자에서 터진다 — [C2][D1] 이 빨개지는 자리',
       '텍스트 ' + tx + '장 · 격자 발 ' + gs + '알');
  }
  {
    /* R3 — 회당 연출을 통째로 뺀다(= E1 의 축). «발화가 조용히 빠지는» 상태가 바로 이것이다. */
    await reboot(() => { window.rwSummonFx = function () {}; });
    const d = await press(page, { need: 2, minMs: 900, maxMs: 12000 });
    const ic = d ? d.add.filter(a => a.k === 'icon').length : -1;
    ok(d && d.buys.length > 0 && ic === 0,
       'R3 `rwSummonFx` 를 비우면 소환은 도는데 버스트가 0 이다 — [E1] 이 빨개지는 자리',
       d ? '소환 ' + d.buys.length + '회 · 아이콘 ' + ic + '알' : 'n/a');
  }
  {
    /* ⚑⚑ R4(990 신설) — **발원을 990 이전(그릇 아가리)으로 되돌린다.** `rwPayFrom()` 만 갈아 끼우면
       666 3회차의 `cy = r.y + r.h × 0.28` 과 **같은 점**이 나오므로 제품 파일은 안 건드리고 그 그림을
       재현할 수 있다. 이 항이 없으면 [A3b] 가 «이미 참인 것을 굳힌 항» 인지 «결함을 잡는 항» 인지
       가를 수 없다(334 «허용치를 넓혀 무르게 풀지 마라» · 368 §R2 와 같은 자리).
       ⚠ 문턱은 [A3b] 와 **같은 2px** 이고 여기서는 그 수십 배가 나와야 한다 — 안 나오면
         그것은 «되돌렸는데 그림이 같다» 는 뜻이라, 그때 의심할 것은 제품이 아니라 이 자다. */
    await reboot(() => {
      window.rwPayFrom = function () { const r = fxRect(document.getElementById('rwBasin'));
        return r ? { x: r.x + r.w / 2, y: r.y + r.h * 0.28 } : null; };
    });
    const d = await press(page, { need: 2, minMs: 900, maxMs: 12000 });
    const ics = d ? d.add.filter(a => a.k === 'icon') : [];
    const offs = (d && d.iconFx) ? ics.map(a => { const m = Math.hypot(a.dx, a.dy);
      if (!(m > 0.5) || !Number.isFinite(a.lx) || !Number.isFinite(a.ly)) return null;
      return Math.abs(((d.iconFx.x - a.lx) * a.dy - (d.iconFx.y - a.ly) * a.dx) / m);
    }).filter(v => v !== null) : [];
    const mx = offs.length ? Math.max(...offs) : 0;
    ok(offs.length > 0 && mx > 2,
       'R4 발원을 «그릇 아가리» 로 되돌리면 궤적이 아이콘을 안 지난다 — [A3b] 가 빨개지는 자리(990)',
       '최악 ' + p2(mx) + 'px · 알 ' + offs.length + '개');
  }

  await browser.close();
  console.log('\nVERIFY666 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
