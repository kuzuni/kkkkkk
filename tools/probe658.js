#!/usr/bin/env node
/* 작업 658 재현기 — 「골드가 훈련 버튼 쪽으로 날아가는 연출 폐지」 (주인 지시 2026-09-01 23:40 «존나 후지다»)
 *
 *   node tools/probe658.js
 *
 * ⚠ 338 규칙 — 처방 전에 재현부터. 그런데 이 번호는 사정이 하나 더 있다:
 *   **660 이 확정 스펙 ③ 으로 이 축을 이미 걷었다**(`upFx`·`fxUpOk` 의 `fxSpend` 두 호출부).
 *   그러니 이 재현기가 답할 물음은 «고칠 것이 남았는가» 이고, 그 답은 **자가 무엇을 세는가**에 달렸다.
 *
 * ⚑ **`verify660` [D2] 와 다른 자를 일부러 쓴다 — 축이 다르다.**
 *   [D2] 는 «`fx-spd` 클래스인 노드가 0장» 이다(클래스 이름에 묶인 자). 주인이 말한 것은 클래스가 아니라
 *   **«골드가 훈련 버튼 쪽으로 간다»** 는 **그림**이라, 다른 부품이 같은 그림을 다시 그리면 [D2] 는
 *   초록인 채로 주인 지시가 깨진다. ⇒ 여기서는 **클래스를 안 보고 기하로** 센다:
 *
 *     «수렴» = `#fxl` 에 붙은 노드가 **호스트(훈련 카드) 밖에서 태어나 안에서 죽는다**
 *     «발산» = 버스트처럼 **버튼 안에서 태어나 밖으로 나간다**(660 스펙 ⑤ — 이건 남아야 한다)
 *
 *   이 자는 «무엇이 그려졌나» 가 아니라 «어느 쪽으로 흘렀나» 를 물으므로 부품 이름이 바뀌어도 안 눈먼다.
 *
 * 절:
 *   ⓐ 현행 — 훈련 클릭 1회 + 홀드에서 «수렴» 0건 (그리고 «발산» > 0 — 자가 눈멀지 않았다는 짝 항)
 *   ⓑ 되돌림 — 660 이 걷은 그 호출(`upFx` 뒤 `fxSpend(cur, host)`)을 **자 안에서만** 되살리면
 *              같은 측정이 «수렴» 을 실제로 본다. 안 보이면 ⓐ 의 0 은 헛초록이다.
 *   ⓒ 소스 — `fxSpend()` 호출 0건 · `.fx-spd` 를 붙이는 자리가 `fxSpend` 본문 하나뿐
 *
 * 제품은 한 줄도 안 고친다(후킹은 전부 페이지 안 임시 패치).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.P658_HOLD || 2200);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 훈련 카드 = 658 의 호스트. 버튼(`--burst-to`)은 그 안의 비용 바다. */
const HOST = '#trCards [data-tr]';
const BTN = '.cb';

/* 계측기 — `#fxl` 의 append/remove 를 그 순간에 후킹해 **태어난 자리와 죽은 자리**를 찍는다.
   ⚠ `MutationObserver` 로는 못 잰다(660 머리말 — 콜백이 마이크로태스크로 묶여 시각이 밀린다).
   ⚠ 죽은 자리를 rect 로 읽는 것이 핵심이다 — `.fx-spd` 는 transform 트랜지션으로 날아가므로
     «도착점» 은 마크업이 아니라 **찍힌 rect** 에만 있다(350 «찍힌 것으로 물어라»). */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__p658 = { add: [], gone: [] });
  const L = document.getElementById('fxl');
  const cls = el => ((el.className || '') + '');
  const stamp = nd => {
    if (nd.nodeType !== 1) return;
    const b = nd.getBoundingClientRect();
    const im = nd.querySelector && nd.querySelector('img.cic');
    const rec = { c: cls(nd), t: performance.now(),
                  x0: b.x + b.width / 2, y0: b.y + b.height / 2,
                  cur: im ? (im.getAttribute('data-cur-ic') || '') : '',
                  txt: (nd.textContent || '').trim().slice(0, 16) };
    nd.__p658 = rec; P.add.push(rec);
  };
  const ap = L.appendChild.bind(L);
  L.appendChild = nd => { const r = ap(nd); stamp(nd); return r; };
  const bye = (nd, rec) => {
    if (!rec || rec.x1 != null) return;
    const b = nd.getBoundingClientRect();
    rec.x1 = b.x + b.width / 2; rec.y1 = b.y + b.height / 2;
    P.gone.push(rec);
  };
  const rm = Element.prototype.remove;
  Element.prototype.remove = function () { if (this.parentNode === L) bye(this, this.__p658); return rm.call(this); };
  const rc = Node.prototype.removeChild;
  Node.prototype.removeChild = function (c) { if (this === L && c) bye(c, c.__p658); return rc.call(this, c); };
};

/* 되돌림 — 660 이 걷은 그 호출을 자 안에서만 되살린다(`upFx(key, host, cur, …)` 뒤 `fxSpend(cur, host)`).
   ⚠ 제품 파일은 안 건드린다. `fxSpend` 선언은 아직 살아 있으므로(678 이 걷을 몫) 이 되살림이 가능하다. */
const REARM = () => {
  const f = window.upFx; if (typeof f !== 'function') return false;
  window.upFx = function (key, host, cur, ...rest) {
    const r = f.call(this, key, host, cur, ...rest);
    try { window.fxSpend(cur, host); } catch (_) {}
    return r;
  };
  return true;
};

const med = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0;

/* ⚠ «발산» 을 **버튼 상자를 나갔는가** 로 세면 안 된다(1회차에 그렇게 재서 0장이 나왔다) —
   버튼은 310×106 이라 버스트 반경(≈60px)이 상자 안에서 끝난다. 상자가 아니라 **버튼 중심으로부터의
   거리**로 물어야 방향이 읽힌다(«멀어지면 발산 · 가까워지면 수렴»). */
function geo(recs, host, btn) {
  const inR = (x, y, r, m) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
  const bc = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
  const dist = (x, y) => Math.hypot(x - bc.x, y - bc.y);
  const conv = [], dd = [];
  for (const a of recs) {
    if (a.x1 == null) continue;
    const bornIn = inR(a.x0, a.y0, host, 0), diedIn = inR(a.x1, a.y1, host, 0);
    if (!bornIn && diedIn) conv.push(a);                 /* 카드 밖에서 나 안으로 꽂힌다 = 폐지 대상 */
    if (inR(a.x0, a.y0, btn, 8)) dd.push(dist(a.x1, a.y1) - dist(a.x0, a.y0));  /* 버튼에서 난 입자의 방향 */
  }
  return { conv, dd, dmed: med(dd) };
}

async function run(page, opts) {
  await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
  await page.waitForTimeout(420);
  if (opts.rearm) {
    const okr = await page.evaluate(REARM);
    if (!okr) throw new Error('되돌림 후킹 실패 — upFx 가 없다');
  }
  const g = await page.evaluate(([hs, bs]) => {
    const h = document.querySelector(hs); if (!h) return null;
    const b = h.querySelector(bs); if (!b) return null;
    const hb = h.getBoundingClientRect(), bb = b.getBoundingClientRect();
    return { host: { x: hb.x, y: hb.y, w: hb.width, h: hb.height },
             btn:  { x: bb.x, y: bb.y, w: bb.width, h: bb.height } };
  }, [HOST, BTN]);
  if (!g) throw new Error('훈련 카드/버튼을 못 찾았다');
  await page.evaluate(() => { const P = window.__p658; P.add.length = 0; P.gone.length = 0; });

  const cx = g.btn.x + g.btn.w / 2, cy = g.btn.y + g.btn.h / 2;
  /* ① 단발 클릭 N회 */
  for (let i = 0; i < 5; i++) { await page.mouse.click(cx, cy); await page.waitForTimeout(140); }
  await page.waitForTimeout(620);
  /* ② 홀드 한 번 */
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(700);          /* 마지막 세대가 도착·소멸할 시간 */

  const d = await page.evaluate(() => ({ add: window.__p658.add.slice(), gone: window.__p658.gone.slice() }));
  return Object.assign(d, g);
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
    /* 훈련을 실제로 살 수 있는 골드 — 클릭·홀드가 «성공» 이어야 연출 경로가 돈다 */
    await page.evaluate(() => { S.gold = 1e12; if (typeof markDirty === 'function') markDirty(); });
    await page.evaluate(ARM);
    return { page, errs };
  };

  console.log('== 658 재현 — «골드가 훈련 버튼 쪽으로 가는 이동» ==');
  console.log('자: `#fxl` 노드의 **태어난 자리 → 죽은 자리**(클래스 안 봄). 호스트 = 훈련 카드 · 버튼 = `.cb`\n');

  /* ── ⓐ 현행 ─────────────────────────────────────────────────────────── */
  console.log('[ⓐ] 현행 main — 훈련 클릭 5회 + 홀드 ' + HOLD_MS + 'ms');
  const A = await open();
  const a = await run(A.page, {});
  const ga = geo(a.gone, a.host, a.btn);
  console.log('     카드 ' + p2(a.host.w) + '×' + p2(a.host.h) + ' @(' + p2(a.host.x) + ',' + p2(a.host.y) + ')'
            + ' · 버튼 ' + p2(a.btn.w) + '×' + p2(a.btn.h) + ' @(' + p2(a.btn.x) + ',' + p2(a.btn.y) + ')');
  console.log('     `#fxl` 총 ' + a.add.length + '장 (' + [...new Set(a.add.map(r => (r.c.match(/fx-[a-z]+/g) || ['?']).join('.')))].join(' · ') + ')');
  ok(ga.conv.length === 0,
     'ⓐ1 «카드 밖 → 카드 안» 으로 **수렴하는 노드 0장** — 주인이 말한 그 이동이 없다',
     '수렴 ' + ga.conv.length + '장 / 관측 ' + a.gone.length + '장'
     + (ga.conv.length ? ' (' + [...new Set(ga.conv.map(r => r.c.trim()))].join(' · ') + ')' : ''));
  ok(ga.dd.length > 0 && ga.dmed > 0,
     'ⓐ2 짝 항 — 버튼에서 난 입자는 **버튼에서 멀어진다**(발산 · 660 스펙 ⑤). 노드는 실제로 움직인다',
     '표본 ' + ga.dd.length + '알 · 거리 변화 중앙값 ' + p2(ga.dmed) + 'px');
  ok(a.gone.filter(r => /fx-spd/.test(r.c)).length === 0,
     'ⓐ3 `.fx-spd`(583 화폐 비행) 0장 — `verify660` [D2] 와 같은 값을 독립으로 다시 잰다');
  ok(A.errs.length === 0, 'ⓐ4 콘솔 에러 0', A.errs.slice(0, 2).join(' / '));
  await A.page.close();

  /* ── ⓑ 되돌림 ───────────────────────────────────────────────────────── */
  console.log('\n[ⓑ] 되돌림 — 660 이 걷은 `fxSpend(cur, host)` 를 **자 안에서만** 되살린다');
  const B = await open();
  const b = await run(B.page, { rearm: true });
  const gb = geo(b.gone, b.host, b.btn);
  ok(gb.conv.length > 0,
     'ⓑ1 ★ 되살리면 같은 자가 **수렴을 본다** — ⓐ1 의 0 은 헛초록이 아니다',
     '수렴 ' + gb.conv.length + '장'
     + (gb.conv.length ? ' (' + [...new Set(gb.conv.map(r => r.c.trim()))].join(' · ') + ')' : ''));
  {
    const golds = gb.conv.filter(r => r.cur === 'gold' || /cGold|fx-spd/.test(r.c));
    ok(golds.length > 0, 'ⓑ2 그 수렴이 **골드**다 — 주인 문면(«골드가 … 버튼쪽으로»)과 같은 것을 봤다',
       '골드 ' + golds.length + '/' + gb.conv.length + '장');
    if (gb.conv.length) {
      const d0 = gb.conv.map(r => Math.hypot(r.x1 - r.x0, r.y1 - r.y0));
      console.log('     수렴 비행 거리 중앙값 ' + p2(d0.sort((x, y) => x - y)[Math.floor(d0.length / 2)]) + 'px'
                + ' · 출발 y 중앙값 ' + p2(gb.conv.map(r => r.y0).sort((x, y) => x - y)[Math.floor(gb.conv.length / 2)]));
    }
  }
  await B.page.close();

  /* ── ⓒ 소스 ─────────────────────────────────────────────────────────── */
  console.log('\n[ⓒ] 소스 — 호출부가 정말 0 인가');
  {
    const calls = (code.match(/(?<!function )\bfxSpend\(/g) || []).length;
    ok(calls === 0, 'ⓒ1 `fxSpend()` 호출 **0건**', '호출 ' + calls + '건');
    const adds = (code.match(/['"`]fx-spd['"`]|fx-fly fx-spd/g) || []).length;
    console.log('     («fx-spd» 문자열 ' + adds + '곳 — 선언·CSS 는 678 이 걷을 몫이다)');
  }

  await browser.close();
  console.log('\nPROBE658 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
