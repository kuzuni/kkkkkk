#!/usr/bin/env node
/* 작업 660 게이트 — 「훈련·단련·룬 강화 연출 리디자인 — 재화 아이콘이 **강화 버튼에서** 터진다」
 * (주인 지시 2026-09-01 23:47 + 보강 1~3 · 659·658 흡수 · 상세는 PROGRESS 660 행)
 *
 *   node tools/verify660.js
 *
 * 확정 스펙을 그대로 절로 옮겼다:
 *   [A] 선언   — 아이콘 버스트 부품이 **한 벌**이고(`fxBurst` 여섯째 인자 + `.fx-cic`),
 *                세 호스트가 «버튼» 을 `--burst-to` 로 신고하며, 세 자리가 `PAY_CUR` 를 넘긴다
 *   [B] 그림   — 홀드하면 발화 입자가 **재화 아이콘**이고 그 아이콘이 **그 탭이 내는 재화**다
 *                (훈련 골드 · 단련 단련석 · 룬 룬강화석 — «탭의 지불 재화 = 버스트 아이콘» 한 규약)
 *   [C] 자리   — 스폰이 **강화 버튼 상자 안**이다(아이콘·슬롯 쪽 스폰 0건 — 주인 지목)
 *   [D] 폐지   — 숫자 플로터 0장 · 골드 이동(`fx-spd`) 0장 · `fxSpend` 호출 0건
 *   [E] 캔슬 금지 — 홀드 동안 **수명 미달로 지워진 입자 0건**(주인 보강 2 «영점 몇초 단위 캔슬»)
 *   [F] 불변   — 619 의 «틱당 1회»(발화 ↔ 강화 1:1) · 621 눌림 왕복 · 625 플래시 1장은 그대로다
 *   [R] 되돌림 — 무르게 푼 수리가 아님을 못박는다(세 항 — 아래 §R 머리말)
 *
 * ⚠ 338 규칙 — 판정은 «함수를 불렀는가» 가 아니라 **`#fxl` 에 실제로 붙은 노드**로 센다.
 *   `fxBurst` 는 상한·keep-out 에서 조용히 빠지므로 호출 횟수로 세면 헛초록이 된다(619 머리말과 같은 규약).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V660_HOLD || 2400);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 세 탭 — `cur` 는 `PAY_CUR` 가 말하는 값이고, 이 표는 그것을 **다시 적지 않고 확인만** 한다
   (두 벌 금지 — 402 규약). `btn` 은 `--burst-to` 가 가리키는 그 버튼이다. */
const SPOTS = [
  { id: 'train',  tab: 'train',  host: '#trCards [data-tr]',  btn: '.cb',      cur: 'gold',   n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   host: '#trRunes .tr-rn',     btn: '.rbt.b1',  cur: 'rstone', n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', host: '#trTemper .tr-tp.k0', btn: '.tb',      cur: 'tstone', n: '단련 [단련]' },
];

/* 계측기 — 제품은 한 줄도 안 고친다. `#fxl` 에 붙는 노드를 종류·자리·수명으로 적어 둔다.
   ⚑ **`MutationObserver` 로는 [E] 를 못 잰다** — 콜백은 마이크로태스크로 **묶여서 늦게** 오므로
     «태어난 시각» 이 실제 append 보다 뒤로 밀린다. 1회차에 그 자로 재니 룬에서 «수명 20.2ms»
     짜리 유령이 1알 나왔다(설계 하한 `FXTICK_MIN` 45ms 보다 짧아 «캔슬» 로 읽혔는데, 재현기
     `p660` 으로 `remove()` 를 직접 후킹하니 **한 건도 없었다** = 자의 lag 이었다).
   ⇒ `appendChild`/`remove` 를 **그 순간에** 후킹해 시각을 찍는다(350 «찍힌 것으로 물어라» 의 시간 판).
   ⚠ 후킹은 **자 안에서만** 한다 — 제품은 한 줄도 안 고친다. */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__v660 = { add: [], gone: [], buys: [] });
  const L = document.getElementById('fxl');
  const kindOf = el => {
    const c = (el.className || '') + '';
    if (/fx-cic/.test(c))   return 'icon';    /* 660 — 재화 아이콘 버스트 */
    if (/fx-spark/.test(c)) return 'spark';   /* 종전 크림 구슬(= 폐지 대상) */
    if (/fx-spd/.test(c))   return 'spend';   /* 583 화폐 비행(= 658 폐지 대상) */
    if (/fx-plus/.test(c))  return 'float';   /* 숫자 플로터(= 659 폐지 대상) */
    if (/fx-flash/.test(c)) return 'flash';
    if (/fx-toast/.test(c)) return 'toast';
    return 'etc';
  };
  /* 강화 성공을 센다 — [F] 의 «발화 ↔ 강화 1:1» 분모 */
  const wrap = (name, kind, okOf) => { const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a);
      if (okOf(r)) P.buys.push({ kind, t: performance.now() }); return r; }; };
  /* ⚑ 701 이관(2026-09-02) — **관측점을 코어로 옮겼다.** 701 이 배수 토글을 놓으면서 «한 번 강화»
     를 `temperUpOne`/`runeTryOne` 이라는 코어로 갈랐고(×N 은 그 코어의 반복이다), 홀드 틱은
     이제 `temperUpBtn`/`runeBuy`/`runeTry` 를 안 지난다 — 옛 관측점 그대로 두면 이 자는
     «시도 0회» 로 빨개진다(제품이 멀쩡한데 자만 못 따라가는 게이트 부패다).
     ⚠ **묻는 것은 한 글자도 안 바뀌었다** — 이 자는 배수 ×1(기본값)에서 돌고, ×1 에서는
       «코어 호출 1회 = 틱 1회 = 강화 1회» 라 축이 전과 정확히 같다. 배수를 켠 상태의 반대편
       («틱 1회 = 버스트 1회» — 강화 N회여도 발화는 1회)은 주인 지시라 `verify701` [G] 가 맡는다. */
  wrap('trainBuy', 'train', r => !!r);
  wrap('temperUpOne', 'temper', r => !!r);   /* 701 이관 — 코어 */
  { const f = window.runeTryOne; if (typeof f === 'function') window.runeTryOne = function (...a) {   /* 701 이관 — 코어 */
      const r = f.apply(this, a); if (r && r.up) P.buys.push({ kind: 'rune', t: performance.now() }); return r; }; }

  const stamp = nd => {
    if (nd.nodeType !== 1) return;
    const t = performance.now();
    const b = nd.getBoundingClientRect();
    const im = nd.querySelector && nd.querySelector('img.cic');
    /* «의도한 수명» 은 노드 자신이 들고 있다 — 자가 상수를 다시 안 적는다(41회차 공용 퇴장 규약).
       홀드 틱에서는 `fxTickLife(iv, …)` 가 이 값을 틱마다 다르게 정하므로 고정 문턱은 틀린 자다. */
    let intended = 380;
    try { const d = parseFloat(getComputedStyle(nd).animationDuration); if (d > 0) intended = d * 1000; } catch (_) {}
    const rec = { k: kindOf(nd), t, born: t, intended,
                  x: b.x + b.width / 2, y: b.y + b.height / 2,
                  cur: im ? (im.getAttribute('data-cur-ic') || '') : '',
                  txt: (nd.textContent || '').trim().slice(0, 24) };
    nd.__v660 = rec; P.add.push(rec);
  };
  const ap = L.appendChild.bind(L);
  L.appendChild = nd => { const r = ap(nd); stamp(nd); return r; };
  const bye = rec => { if (!rec || rec.life != null) return; rec.life = performance.now() - rec.born; P.gone.push(rec); };
  const rm = Element.prototype.remove;
  Element.prototype.remove = function () { if (this.parentNode === L) bye(this.__v660); return rm.call(this); };
  const rc = Node.prototype.removeChild;
  Node.prototype.removeChild = function (c) { if (this === L && c) bye(c.__v660); return rc.call(this, c); };
};

async function hold(page, sp) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(420);
  await page.evaluate(() => { const P = window.__v660; P.add.length = 0; P.gone.length = 0; P.buys.length = 0; });
  const g = await page.evaluate(([hs, bs]) => {
    const h = document.querySelector(hs); if (!h) return null;
    const b = h.querySelector(bs); if (!b) return null;
    const hb = h.getBoundingClientRect(), bb = b.getBoundingClientRect();
    return { host: { x: hb.x, y: hb.y, w: hb.width, h: hb.height },
             btn:  { x: bb.x, y: bb.y, w: bb.width, h: bb.height } };
  }, [sp.host, sp.btn]);
  if (!g) return null;
  await page.mouse.move(g.btn.x + g.btn.w / 2, g.btn.y + g.btn.h / 2);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(520);          /* 마지막 세대가 제 수명을 다 살 시간 — [E] 가 이것을 잰다 */
  const d = await page.evaluate(() => { const P = window.__v660;
    return { add: P.add.slice(), gone: P.gone.slice(), buys: P.buys.slice() }; });
  return Object.assign(d, g);
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 아이콘 버스트 부품 한 벌 · 세 호스트가 버튼을 신고 · 세 자리가 재화를 넘긴다');
  ok(/function fxBurst\(t, col, n, strict, iv, ic\)\{/.test(code),
     'A1 `fxBurst` 가 여섯째 인자 `ic`(버스트 아이콘의 재화 키)를 받는다');
  ok(/\.fx-spark\.fx-cic\{/.test(code) && /\.fx-spark\.fx-cic>\.cic\{/.test(code),
     'A2 `.fx-cic` 가 **`.fx-spark` 를 그대로 쓰는 한 벌**이다(몸을 새로 안 만든다 — 58 «규격 3종» 규약)');
  ok(/function fxBurstAt\(el\)\{/.test(code) && /--burst-to/.test(code),
     'A3 스폰 자리 신고 `--burst-to` 와 그것을 읽는 `fxBurstAt()` 이 있다');
  /* 세 호스트가 **각자의 버튼**을 신고한다 — 신고가 하나라도 빠지면 그 탭은 호스트(카드·행) 전체에서 터진다 */
  ok(/\.tr-card\{[^}]*--burst-to:\.cb/.test(code),        'A4 훈련 카드가 `--burst-to:.cb`(하단 비용 바)를 신고한다');
  ok(/\.tr-rn\{[^}]*--burst-to:\.rbt\.b1/.test(code),     'A5 룬 카드가 `--burst-to:.rbt.b1`(강화 버튼)을 신고한다');
  ok(/\.tr-tp\{[^}]*--burst-to:\.tb/.test(code),          'A6 단련 행이 `--burst-to:.tb`(단련 버튼)를 신고한다');
  /* 재화 키는 «탭의 지불 재화» 한 규약에서만 나온다 — 새 표를 만들면 PAY_CUR 과 두 벌이 된다 */
  ok(/upFx\('train:'[^)]*PAY_CUR\.train/.test(code),      'A7 훈련 발화가 `PAY_CUR.train` 을 넘긴다');
  ok(/upFx\('rune:'[^)]*PAY_CUR\.rune/.test(code),        'A8 룬 발화가 `PAY_CUR.rune` 을 넘긴다');
  ok(/upFx\('temper:'[^)]*PAY_CUR\.temper/.test(code),    'A9 단련 발화가 `PAY_CUR.temper` 를 넘긴다');
  ok(!/const PAY_CUR2|BURST_CUR\s*=/.test(code),          'A10 버스트 아이콘 표를 **따로 안 적었다**(PAY_CUR 한 벌 — 402 규약)');
  /* [E] 의 제품 쪽 근거 — 상한에서 «걷기» 가 아니라 «줄이기» 여야 한다 */
  ok(!/while\(q\.length && upFxLive\(q\)/.test(code),
     'A11 상한 처리가 «앞 세대 걷기»(`while(...) upFxDrop`)가 **아니다** — 캔슬-재시작 금지(주인 보강 2)');
  /* 캔슬 금지의 **본체** — 버스트에 틱 간격을 안 넘긴다(619 14회차의 수명 자르기를 660 이 뒤집었다).
     넘기면 입자가 틱의 55% 만에 지워져 궤적 한복판에서 사라진다 = 주인이 본 «캔슬». */
  ok(/fxBurst\(fxBurstAt\(el\), FXPAL\.up, cnt, true, null, cur \|\| null\)/.test(code),
     'A12 버스트에 틱 간격(`iv`)을 **안 넘긴다** — 입자가 제 수명을 끝까지 산다(주인 보강 2 본체)');
  /* 짝 항 — 플래시는 **여전히** 받는다(625 «한 자리에 플래시 한 장» 은 별개의 주인 지시다) */
  ok(/fxFlash\(fel, iv, true\)/.test(code),
     'A13 플래시는 종전대로 `iv` 를 받는다 — 625·619 의 «회당 한 장» 은 안 건드렸다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(ARM);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  const res = {};
  for (const sp of SPOTS) {
    const d = await hold(page, sp);
    if (!d) { ok(false, 'B0 ' + sp.id + ' 대상이 없다', sp.host + ' >> ' + sp.btn); continue; }
    res[sp.id] = d;
  }

  /* ── [B] 그림 — 발화 입자가 «그 탭이 내는 재화» 의 아이콘이다 ──────────── */
  console.log('\n[B] 그림 — 버스트 입자가 그 탭의 지불 재화 아이콘이다 (홀드 ' + HOLD_MS + 'ms)');
  for (const sp of SPOTS) {
    const d = res[sp.id]; if (!d) continue;
    const icons = d.add.filter(a => a.k === 'icon');
    const beads = d.add.filter(a => a.k === 'spark');
    ok(icons.length >= 8, 'B1 ' + sp.id + ' 아이콘 버스트가 실제로 터진다(≥8알)', '아이콘 ' + icons.length + '알');
    /* 「알갱이 파티클 폐지」 — 크림 구슬이 한 알도 안 남아야 한다(«섞여 있으면 어휘가 둘» ) */
    ok(beads.length === 0, 'B2 ' + sp.id + ' 종전 알갱이(크림 구슬) **0알** — 폐지됐다(주인 «알갱이들 파티클 없애기»)',
       '구슬 ' + beads.length + '알');
    const wrong = icons.filter(a => a.cur !== sp.cur);
    ok(icons.length > 0 && wrong.length === 0,
       'B3 ' + sp.id + ' 아이콘이 전부 `' + sp.cur + '` 다(탭의 지불 재화 = 버스트 아이콘)',
       '어긋난 알 ' + wrong.length + (wrong.length ? ' (' + [...new Set(wrong.map(w => w.cur || '없음'))].join(',') + ')' : ''));
  }

  /* ── [C] 자리 — 강화 버튼 상자 안에서만 태어난다 ───────────────────────── */
  /* 주인 지목: «아이콘쪽에 이펙트 안뜨게 하고, 룬강화 버튼에서 룬아이콘이 터지는 느낌으로».
     ⚠ 여유는 **입자 반지름**에서 나온다 — 619 13·14회차가 «잉크가 액자 안에서 끝난다» 로 가둠 상자를
       `sz/2 + FXB_INPAD` 안으로 들여 놨으므로 **중심은 버튼 상자 안**이 정답이고, 여유 0 이 맞다.
       그래도 반올림 한 칸(2px)은 물린다 — 자가 기하를 다시 적는 자리가 아니다. */
  console.log('\n[C] 자리 — 스폰 중심이 «강화 버튼» 상자 안이다 (아이콘·슬롯 쪽 스폰 0건)');
  for (const sp of SPOTS) {
    const d = res[sp.id]; if (!d) continue;
    const icons = d.add.filter(a => a.k === 'icon');
    const M = 2;
    const outs = icons.filter(a => a.x < d.btn.x - M || a.x > d.btn.x + d.btn.w + M
                                || a.y < d.btn.y - M || a.y > d.btn.y + d.btn.h + M);
    ok(icons.length > 0 && outs.length === 0,
       'C1 ' + sp.id + ' 버튼 상자 밖 스폰 **0건**', '밖 ' + outs.length + '/' + icons.length
       + ' · 버튼 ' + p2(d.btn.w) + '×' + p2(d.btn.h));
    /* «호스트 전체» 가 아니라 «버튼» 이라는 것을 못박는 짝 항 — 버튼이 호스트보다 실제로 작아야
       이 축이 뜻을 갖는다(같으면 C1 은 아무것도 안 묻는 헛초록이 된다). */
    ok(d.btn.w * d.btn.h < d.host.w * d.host.h * 0.9,
       'C2 ' + sp.id + ' 버튼이 호스트보다 작다 — C1 이 헛초록이 아니다',
       '버튼 ' + Math.round(d.btn.w * d.btn.h) + ' vs 호스트 ' + Math.round(d.host.w * d.host.h) + 'px²');
  }

  /* ── [D] 폐지 — 숫자 플로터 · 골드 이동 ───────────────────────────────── */
  console.log('\n[D] 폐지 — 숫자 플로터 0장 · 화폐 비행 0장 · `fxSpend` 호출 0건');
  for (const sp of SPOTS) {
    const d = res[sp.id]; if (!d) continue;
    /* 룬의 «실패» 만 예외다(위임 규약 채택 — 숫자가 아니고, 실패 틱의 유일한 회당 채널이다) */
    const floats = d.add.filter(a => a.k === 'float');
    const nums = floats.filter(a => /[0-9]/.test(a.txt));
    ok(nums.length === 0, 'D1 ' + sp.id + ' **숫자** 플로터 0장(659 · 주인 «숫자들 뜨는 연출 없애기»)',
       '숫자 ' + nums.length + '장 / 전체 플로터 ' + floats.length + '장'
       + (floats.length ? ' («' + [...new Set(floats.map(f => f.txt))].join('», «') + '»)' : ''));
    ok(d.add.filter(a => a.k === 'spend').length === 0,
       'D2 ' + sp.id + ' «버튼으로 날아가는 화폐»(`fx-spd`) 0장 (658 · 주인 «존나 후지다»)');
  }
  /* 훈련·단련은 플로터 자체가 0 이어야 한다 — 문구가 하나도 안 남는다(룬만 «실패» 를 남겼다) */
  ok(res.train && res.train.add.filter(a => a.k === 'float').length === 0,
     'D3 훈련 — 플로터가 통째로 0장');
  ok(res.temper && res.temper.add.filter(a => a.k === 'float').length === 0,
     'D4 단련 — 플로터가 통째로 0장(659 본체)');
  /* 소스 축 — 부품은 남기고 호출부만 껐는지, 그리고 `fxSpend` 가 정말 아무도 안 부르는지 */
  ok(/function fxDelta\(el, txt\)\{/.test(code), 'D5 `fxDelta` 부품은 **남아 있다**(09·12·17·장비·코스튬이 쓴다 — 659 «부품 삭제 금지»)');
  {
    const calls = (code.match(/(?<!function )\bfxSpend\(/g) || []).length;
    ok(calls === 0, 'D6 `fxSpend()` 호출 **0건** — 660 이 그 축을 폐지했다(678 가 선언째 걷는다)', '호출 ' + calls + '건');
  }

  /* ── [E] 캔슬-재시작 금지 ─────────────────────────────────────────────── */
  /* 주인 보강 2(2026-09-01 23:53) «연속강화할때 영점 몇초 단위로 알갱이가 캔슬되는데 그거는 하지말기».
     자: 홀드 동안 `#fxl` 에서 지워진 버스트 입자의 «살았던 시간» 을 재, **수명 미달 제거**를 센다.
     수명 하한은 619 14회차의 «틱 안에서 끝나는 길이»(최소 틱 60ms)라 그보다 짧게 죽으면 캔슬이다.
     ⚠ 문턱을 «CSS 수명 380ms» 로 잡지 않는 이유 — 619 가 홀드 틱에서 수명을 틱 간격으로 줄이므로
       그 값은 틱마다 다르다. 자가 상수를 다시 적지 않게 **틱 하한**을 쓴다. */
  console.log('\n[E] 캔슬-재시작 금지 — 수명 미달로 지워진 입자 0건');
  for (const sp of SPOTS) {
    const d = res[sp.id]; if (!d) continue;
    const born = d.add.filter(a => a.k === 'icon');
    /* 여유 30ms — `fxBye` 가 애니 끝 뒤 `FXBYE_PAD`(24ms)에 걷으므로 «제 수명을 다 산» 입자의
       측정값은 intended 보다 **크다**. 그보다 짧게 죽었으면 누가 중간에 걷은 것이다. */
    const killed = d.gone.filter(a => a.k === 'icon' && a.life < a.intended - 30);
    ok(born.length > 0 && killed.length === 0,
       'E1 ' + sp.id + ' 조기 소멸(제 수명 미달) **0건** — 날아가던 입자는 수명 끝까지 산다',
       '조기 ' + killed.length + '/' + born.length + ' · 걷힘 ' + d.gone.filter(a => a.k === 'icon').length
       + (killed.length ? ' · 최단 ' + p2(Math.min(...killed.map(k => k.life))) + 'ms (의도 '
          + p2(killed[0].intended) + 'ms)' : ''));
    /* ⚑ E2 — **수명 자체가 설계값이어야 한다.** E1 만으로는 619 14회차의 truncation 을 못 잡는다:
       그쪽은 «애니 길이를 짧게 선언» 하므로 `intended` 도 같이 줄어 E1 이 초록으로 남는다(헛초록).
       ⇒ 설계 수명(`FXSPARK_MS` 380ms)에 직접 댄다. 문턱 340 = 380 − 한 프레임 여유 두 칸. */
    const lives = d.gone.filter(a => a.k === 'icon').map(a => a.life).sort((x, y) => x - y);
    const med = lives.length ? lives[Math.floor(lives.length / 2)] : 0;
    ok(med >= 340, 'E2 ' + sp.id + ' 입자가 **제 설계 수명(380ms)을 끝까지** 산다(중앙값 ≥340ms)',
       '중앙값 ' + p2(med) + 'ms · 표본 ' + lives.length);
    /* ⚑ E3 — **세대가 겹친다**(주인 «틱마다 독립 스폰 · 겹침 허용»). 수명 380 ÷ 최속 틱 60 = 6.3 세대라
       동시 생존이 한 세대(UPFX_N 4)를 크게 넘어야 한다. 619 truncation 에서는 정확히 한 세대뿐이다. */
    let live = 0, peak = 0;
    const ev = [];
    d.add.filter(a => a.k === 'icon').forEach(a => { ev.push({ t: a.born, v: 1 });
      ev.push({ t: a.life != null ? a.born + a.life : a.born + a.intended, v: -1 }); });
    ev.sort((x, y) => x.t - y.t).forEach(e => { live += e.v; if (live > peak) peak = live; });
    d.peak = peak;                                   /* R3b 가 이 값과 비교한다 */
    ok(peak >= 8, 'E3 ' + sp.id + ' 세대가 겹친다 — 동시 생존 ≥8알(한 세대 4알의 2배 이상)',
       '최대 동시 ' + peak + '알');
  }

  /* ── [F] 불변 — 619 «틱당 1회» · 625 플래시 1장 ────────────────────────── */
  console.log('\n[F] 불변 — 619 발화 1:1 · 625 «한 자리에 플래시 한 장»');
  for (const sp of SPOTS) {
    const d = res[sp.id]; if (!d) continue;
    const icons = d.add.filter(a => a.k === 'icon');
    const buys = d.buys.filter(b => b.kind === sp.id);
    let hit = 0;
    buys.forEach(b => { if (icons.some(f => f.t >= b.t - 12 && f.t <= b.t + 55)) hit++; });
    const ratio = buys.length ? p2(hit / buys.length) : 0;
    ok(buys.length >= 3 && ratio >= 0.95,
       'F1 ' + sp.id + ' 강화마다 버스트가 터진다(619 [B] 이관 · ≥0.95)', hit + '/' + buys.length + ' = ' + ratio);
  }
  ok(errs.length === 0, 'F2 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  /* 무르게 푼 수리가 아님을 세 겹으로 못박는다(334·368 규약):
     R1 — `ic` 를 안 넘기는 사본에서는 [B3] 의 축이 **빨개진다**(아이콘이 안 나온다)
     R2 — `--burst-to` 를 지운 사본에서는 [C1] 이 **빨개진다**(호스트 전체로 흩어진다)
     R3 — 상한 처리를 종전 «걷기» 로 되돌린 사본에서는 [E1] 이 **빨개진다**(조기 소멸이 돌아온다) */
  console.log('\n[R] 되돌림 — 고친 축을 되돌리면 위 항이 빨개진다');
  {
    /* R1 — 페이지에서 `ic` 를 떨군다(제품 파일은 안 건드린다) */
    await page.evaluate(() => { const f = window.fxBurst;
      window.fxBurst = function (t, col, n, strict, iv) { return f.call(this, t, col, n, strict, iv); }; });
    const d = await hold(page, SPOTS[2]);
    ok(d && d.add.filter(a => a.k === 'icon').length === 0 && d.add.filter(a => a.k === 'spark').length > 0,
       'R1 `ic` 를 떨구면 아이콘 0알 · 종전 구슬로 되돌아간다 — [B1][B3] 이 빨개지는 자리',
       d ? '아이콘 ' + d.add.filter(a => a.k === 'icon').length + ' · 구슬 ' + d.add.filter(a => a.k === 'spark').length : 'n/a');
    await page.reload(); await page.waitForFunction(() => typeof openTrain === 'function');
    await page.waitForTimeout(700); await page.evaluate(ARM);
    await page.evaluate(() => { S.gold = 1e18; S.rstone = 1e9; S.tstone = 1e9;
      if (S.temper) S.temper.pts = 1e6; openTrain(); });
    await page.waitForTimeout(400);
  }
  {
    /* R2 — `--burst-to` 신고를 지운다 → 버스트가 행 전체(호스트)로 흩어진다 */
    await page.addStyleTag({ content: '.tr-tp{--burst-to:initial}' });
    const d = await hold(page, SPOTS[2]);
    const icons = d ? d.add.filter(a => a.k === 'icon') : [];
    const M = 2;
    const outs = icons.filter(a => a.x < d.btn.x - M || a.x > d.btn.x + d.btn.w + M
                                || a.y < d.btn.y - M || a.y > d.btn.y + d.btn.h + M);
    ok(icons.length > 0 && outs.length > 0,
       'R2 `--burst-to` 를 지우면 버튼 밖 스폰이 생긴다 — [C1] 이 빨개지는 자리',
       '밖 ' + outs.length + '/' + icons.length);
  }
  {
    /* R3 — **619 14회차의 «수명 자르기» 를 되살린다.** 660 이 뒤집은 그 한 값(버스트에 `iv` 를
       넘기는 것)을 페이지에서 되돌려 놓고, [E2]·[E3] 이 실제로 빨개지는지 본다.
       ⚠ 되돌리는 것은 «내가 지운 그 값» 이다 — 자를 무력화하는 흉내가 아니다. 최속 틱 60ms 를
         넘기면 제품이 `fxTickLife(60, 380)` = 45ms 로 수명을 자른다. */
    await page.reload(); await page.waitForFunction(() => typeof openTrain === 'function');
    await page.waitForTimeout(700); await page.evaluate(ARM);
    await page.evaluate(() => { S.gold = 1e18; S.rstone = 1e9; S.tstone = 1e9;
      if (S.temper) S.temper.pts = 1e6; openTrain();
      const f = window.fxBurst;
      window.fxBurst = function (t, col, n, strict, iv, ic) { return f.call(this, t, col, n, strict, 60, ic); };
    });
    await page.waitForTimeout(400);
    const d = await hold(page, SPOTS[2]);
    const lives = d ? d.gone.filter(a => a.k === 'icon').map(a => a.life).sort((x, y) => x - y) : [];
    const med = lives.length ? lives[Math.floor(lives.length / 2)] : 0;
    let live = 0, peak = 0; const ev = [];
    (d ? d.add.filter(a => a.k === 'icon') : []).forEach(a => { ev.push({ t: a.born, v: 1 });
      ev.push({ t: a.life != null ? a.born + a.life : a.born + a.intended, v: -1 }); });
    ev.sort((x, y) => x.t - y.t).forEach(e => { live += e.v; if (live > peak) peak = live; });
    ok(lives.length > 0 && med < 340, 'R3a 틱 간격을 되넘기면 수명이 잘린다 — [E2] 가 빨개지는 자리',
       '중앙값 ' + p2(med) + 'ms · 표본 ' + lives.length);
    /* ⚠ R3b 는 **절대 문턱이 아니라 대조**다. 수명을 자르면 겹침이 줄지만 «0 세대» 가 되지는
       않는다(잘린 수명 45ms 도 최속 틱 60ms 의 75% 라 한 세대 반이 겹친다) — 1회차에 문턱 8 로
       재니 10 이 나와 [E3] 과 안 갈렸다. 갈리는 것은 **같은 자리의 전후 비**이므로 그것을 묻는다.
       문턱 0.75: 실측 22↔10 · 15↔10 · 16↔10 이라 비는 0.45~0.67 이고, 0.75 는 그 위·아래를
       가르되 프레임 흔들림(±2알)에 안 뒤집히는 자리다. */
    const base = res.temper ? res.temper.peak : 0;
    ok(base > 0 && peak < base * 0.75,
       'R3b 그러면 겹침이 실제로 줄어든다 — [E3] 이 빨개지는 자리',
       '수리 후 ' + base + '알 → 되돌림 ' + peak + '알 (' + p2(peak / (base || 1)) + '배)');
  }

  await browser.close();
  console.log('\nVERIFY660 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
