#!/usr/bin/env node
/* 작업 658 게이트 — 「골드가 훈련 버튼 쪽으로 날아가는 연출 폐지」
 * (주인 지시 2026-09-01 23:40 «골드가 훈련 버튼쪽으로 가는 연출 없애기. 존나 후지다»)
 *
 *   node tools/verify658.js
 *
 * ⚑ **이 자가 `verify660` [D2] 와 따로 있는 이유 — 축이 다르다.**
 *   [D2] 는 «`fx-spd` 클래스인 노드가 0장» 이다. 주인이 말한 것은 클래스가 아니라 **그림**(«골드가
 *   버튼 쪽으로 간다»)이라, **다른 부품이 같은 그림을 다시 그리면 [D2] 는 초록인 채 지시가 깨진다.**
 *   ⇒ 여기서는 클래스를 안 보고 **기하**로 센다:
 *
 *     «수렴» = `#fxl` 노드가 **훈련 카드 밖에서 태어나 카드 안에서 죽는다** — 폐지 대상
 *     «발산» = 버튼에서 태어나 **버튼 중심에서 멀어진다** — 660 스펙 ⑤(버스트), 남아야 한다
 *
 *   절:
 *     [A] 소스   — `fxSpend()` 호출 0건 · `.fx-spd` 를 붙이는 자리가 한 곳(부품 본문)뿐
 *     [B] 그림   — 훈련 클릭 5회 + 홀드에서 **수렴 0장**
 *     [C] 짝 항  — 자가 눈멀지 않았다(노드가 실제로 붙는다 · 버튼 입자는 발산한다 ·
 *                  «수렴» 이 관측 가능한 배치다 = 골드 알약이 카드 밖에 멀리 있다)
 *     [R] 되돌림 — 같은 그림을 **자가 직접 그려** 보이면 [B] 가 빨개진다
 *
 * ⚠ **[R] 이 제품 함수(`fxSpend`)를 안 부르는 것은 의도다.** 678 이 그 죽은 선언을 걷을 예정이라
 *   제품 함수에 매달면 이 자는 678 뒤에 통째로 죽는다. 되돌림은 «그 그림» 만 있으면 성립하므로
 *   자가 스스로 한 장을 날려 [B] 의 눈을 시험한다 — 678 이 무엇을 지우든 이 자는 계속 산다.
 *
 * ⚠ 338 규칙 — 판정은 «함수를 불렀는가» 가 아니라 **`#fxl` 에 실제로 붙은 노드**로 센다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V658_HOLD || 2200);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;
const med = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0;

const HOST = '#trCards [data-tr]';   /* 훈련 카드 — 옛 비행의 도착지 */
const BTN = '.cb';                   /* 그 카드의 «강화 버튼»(660 `--burst-to`) */

/* 계측기 — `#fxl` 의 append/remove 를 **그 순간에** 후킹해 태어난 자리와 죽은 자리를 찍는다.
   ⚠ `MutationObserver` 는 못 쓴다(660 머리말 — 콜백이 마이크로태스크로 묶여 시각·자리가 밀린다).
   ⚠ 도착점은 마크업에 없다 — `.fx-spd` 는 transform 트랜지션으로 나므로 **찍힌 rect** 로만 읽힌다. */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__v658 = { add: [], gone: [] });
  const L = document.getElementById('fxl');
  const stamp = nd => {
    if (nd.nodeType !== 1) return;
    const b = nd.getBoundingClientRect();
    const im = nd.querySelector && nd.querySelector('img.cic');
    const rec = { c: ((nd.className || '') + ''), x0: b.x + b.width / 2, y0: b.y + b.height / 2,
                  cur: im ? (im.getAttribute('data-cur-ic') || '') : '' };
    nd.__v658 = rec; P.add.push(rec);
  };
  const ap = L.appendChild.bind(L);
  L.appendChild = nd => { const r = ap(nd); stamp(nd); return r; };
  const bye = (nd, rec) => {
    if (!rec || rec.x1 != null) return;
    const b = nd.getBoundingClientRect();
    rec.x1 = b.x + b.width / 2; rec.y1 = b.y + b.height / 2; P.gone.push(rec);
  };
  const rm = Element.prototype.remove;
  Element.prototype.remove = function () { if (this.parentNode === L) bye(this, this.__v658); return rm.call(this); };
  const rc = Node.prototype.removeChild;
  Node.prototype.removeChild = function (c) { if (this === L && c) bye(c, c.__v658); return rc.call(this, c); };
};

/* [R] 되돌림 — «골드 알약 → 훈련 카드» 한 장을 자가 직접 날린다(제품 함수를 안 쓴다 — 머리말 참조).
   출발은 **실제 골드 알약**(`.cGold`)이라 자리가 상수가 아니고, 도착은 카드 중심이다. */
const FLY = async host => {
  const pill = document.querySelector('.cGold') || document.querySelector('#top .pcb');
  const card = document.querySelector(host);
  if (!pill || !card) return false;
  const pr = pill.getBoundingClientRect(), cr = card.getBoundingClientRect();
  const L = document.getElementById('fxl');
  const el = document.createElement('div');
  el.className = 'fx-fly __v658fly';
  el.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:40px;'
    + 'transform:translate(' + (pr.x + pr.width / 2 - 20) + 'px,' + (pr.y + pr.height / 2 - 20) + 'px);'
    + 'transition:transform .3s linear';
  L.appendChild(el);
  el.getBoundingClientRect();                       /* 레이아웃을 확정시켜 트랜지션이 실제로 돌게 한다 */
  el.style.transform = 'translate(' + (cr.x + cr.width / 2 - 20) + 'px,' + (cr.y + cr.height / 2 - 20) + 'px)';
  await new Promise(r => setTimeout(r, 420));
  el.remove();
  return true;
};

function geo(recs, host, btn) {
  const inR = (x, y, r, m) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
  const bc = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
  const dist = (x, y) => Math.hypot(x - bc.x, y - bc.y);
  const conv = [], dd = [];
  for (const a of recs) {
    if (a.x1 == null) continue;
    if (!inR(a.x0, a.y0, host, 0) && inR(a.x1, a.y1, host, 0)) conv.push(a);
    /* ⚠ «발산» 을 «버튼 상자를 나갔는가» 로 세면 안 된다 — 버튼 310×106 이라 버스트 반경(≈60px)이
       상자 안에서 끝나 0장이 나온다(probe658 1회차 실측). 상자가 아니라 **중심 거리**로 묻는다. */
    if (inR(a.x0, a.y0, btn, 8)) dd.push(dist(a.x1, a.y1) - dist(a.x0, a.y0));
  }
  return { conv, dd, dmed: med(dd) };
}

async function drive(page) {
  await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
  await page.waitForTimeout(420);
  const g = await page.evaluate(([hs, bs]) => {
    const h = document.querySelector(hs); if (!h) return null;
    const b = h.querySelector(bs); if (!b) return null;
    const hb = h.getBoundingClientRect(), bb = b.getBoundingClientRect();
    const pl = document.querySelector('.cGold') || document.querySelector('#top .pcb');
    const pr = pl && pl.getBoundingClientRect();
    return { host: { x: hb.x, y: hb.y, w: hb.width, h: hb.height },
             btn:  { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
             pill: pr ? { x: pr.x, y: pr.y, w: pr.width, h: pr.height } : null };
  }, [HOST, BTN]);
  if (!g) throw new Error('훈련 카드/버튼을 못 찾았다');
  await page.evaluate(() => { const P = window.__v658; P.add.length = 0; P.gone.length = 0; });
  const cx = g.btn.x + g.btn.w / 2, cy = g.btn.y + g.btn.h / 2;
  for (let i = 0; i < 5; i++) { await page.mouse.click(cx, cy); await page.waitForTimeout(140); }
  await page.waitForTimeout(620);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(700);
  const d = await page.evaluate(() => ({ add: window.__v658.add.slice(), gone: window.__v658.gone.slice() }));
  return Object.assign(d, g);
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);
  const errs = [];
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
  await page.evaluate(() => { S.gold = 1e12; if (typeof markDirty === 'function') markDirty(); });
  await page.evaluate(ARM);

  /* ── [A] 소스 ───────────────────────────────────────────────────────── */
  console.log('[A] 소스 — «버튼으로 가는 화폐 비행» 을 부르는 자리가 0 이다');
  {
    const calls = (code.match(/(?<!function )\bfxSpend\(/g) || []).length;
    ok(calls === 0, 'A1 `fxSpend()` 호출 **0건**(660 이 `upFx`·`fxUpOk` 두 호출부를 걷었다)', '호출 ' + calls + '건');
    /* ⚠ 클래스 축은 여기 한 항으로 족하다 — 본체는 [B] 의 기하다.
       `.fx-spd` 를 **붙이는** 코드가 부품 본문 말고 또 생기면 여기가 먼저 빨개진다.
       ⚠ 1회차 함정 — «따옴표 안에 fx-spd» 로 세면 **주석 산문과 CSS 가 같이 걸린다**(3곳으로 읽혔다).
         이 파일은 CSS·주석·코드가 한 파일에 있으므로 **클래스를 «붙이는» 두 문법**만 센다. */
    const adds = (code.match(/classList\.add\([^)]*\bfx-spd\b|className\s*=\s*['"`][^'"`]*\bfx-spd\b/g) || []).length;
    ok(adds <= 1, 'A2 `.fx-spd` 를 붙이는 자리가 **한 곳뿐**이다(죽은 부품 본문 — 678 이 걷을 몫)', '자리 ' + adds + '곳');
  }

  /* ── [B]·[C] 그림 ───────────────────────────────────────────────────── */
  console.log('\n[B] 그림 — 훈련 클릭 5회 + 홀드 ' + HOLD_MS + 'ms 에서 «카드로 수렴» 0장');
  const a = await drive(page);
  const ga = geo(a.gone, a.host, a.btn);
  console.log('     카드 ' + p2(a.host.w) + '×' + p2(a.host.h) + ' @(' + p2(a.host.x) + ',' + p2(a.host.y) + ')'
            + ' · 버튼 ' + p2(a.btn.w) + '×' + p2(a.btn.h)
            + (a.pill ? ' · 골드 알약 @(' + p2(a.pill.x) + ',' + p2(a.pill.y) + ')' : ''));
  ok(ga.conv.length === 0,
     'B1 ★ «카드 밖 → 카드 안» 으로 수렴하는 노드 **0장** — 주인이 없애라 한 그 이동이 없다',
     '수렴 ' + ga.conv.length + '장 / 관측 ' + a.gone.length + '장'
     + (ga.conv.length ? ' (' + [...new Set(ga.conv.map(r => r.c.trim()))].join(' · ') + ')' : ''));

  console.log('\n[C] 짝 항 — 자가 눈멀지 않았다');
  ok(a.gone.length >= 20, 'C1 홀드에 노드가 실제로 붙고 걷힌다(표본 ≥20장) — B1 이 «아무 일도 안 일어나서» 초록인 게 아니다',
     '관측 ' + a.gone.length + '장');
  ok(ga.dd.length > 0 && ga.dmed > 0,
     'C2 버튼에서 난 입자는 버튼 중심에서 **멀어진다**(발산 — 660 스펙 ⑤ 는 그대로다)',
     '표본 ' + ga.dd.length + '알 · 거리 변화 중앙값 ' + p2(ga.dmed) + 'px');
  {
    /* «수렴» 이 관측 가능한 배치인가 — 골드 알약이 카드 «밖» 에 있어야 그 비행이 밖→안이 된다.
       알약이 카드 안이면 B1 은 아무것도 안 묻는 헛초록이 된다. */
    const p = a.pill;
    const out = p && (p.y + p.h < a.host.y || p.y > a.host.y + a.host.h
                   || p.x + p.w < a.host.x || p.x > a.host.x + a.host.w);
    ok(!!out, 'C3 골드 알약이 훈련 카드 **밖**에 있다 — «밖 → 안» 이 성립하는 배치다(B1 이 헛초록이 아니다)',
       p ? '알약 y ' + p2(p.y) + '..' + p2(p.y + p.h) + ' · 카드 y ' + p2(a.host.y) + '..' + p2(a.host.y + a.host.h) : '알약 못 찾음');
  }
  ok(errs.length === 0, 'C4 콘솔 에러 0', errs.slice(0, 2).join(' / '));

  /* ── [R] 되돌림 ─────────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 같은 그림을 자가 직접 그리면 B1 이 빨개진다');
  await page.evaluate(() => { const P = window.__v658; P.add.length = 0; P.gone.length = 0; });
  const flew = await page.evaluate(FLY, HOST);
  const r = await page.evaluate(() => ({ gone: window.__v658.gone.slice() }));
  const gr = geo(r.gone, a.host, a.btn);
  ok(flew && gr.conv.length > 0,
     'R1 ★ «골드 알약 → 카드» 한 장을 날리면 같은 자가 **수렴을 본다** — B1 의 0 은 헛초록이 아니다',
     '수렴 ' + gr.conv.length + '장 / 관측 ' + r.gone.length + '장');

  await browser.close();
  console.log('\nVERIFY658 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
