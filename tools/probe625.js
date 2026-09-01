#!/usr/bin/env node
/* 작업 625 — 「연속 강화 홀드 중 버튼이 «비활성» 으로 읽힌다 — 흰 라벨 글자가 통째로 사라지고
 *              채움이 탁한 올리브가 된다」 **재현**  (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다.)
 *
 *   node tools/probe625.js
 *
 * 등재문(PROGRESS 625 · `docs/review/621-홀드틱눌림왕복.md` §6-4)은 **증상**을 이미 수치로 적어 놓았다
 * (홀드 1.1초 시점 · 버튼 상자 안 순백(≥245,245,245) 픽셀 수와 평균색):
 *     단련 쉼 흰 497 (111,167,44) → 홀드 흰 0 (196,200,66) → 뗌 뒤 흰 497
 *     룬  쉼 흰 318                → 홀드 흰 0 (191,203,60) → 뗌 뒤 흰 297
 * 그러나 등재문이 «겹치는 층» 으로 지목한 것은 **둘**이다 — `upFx()` 의 `fxFlash` 와 `fxSpend`(583 알갱이).
 * 처방 후보 셋(ⓐ 오버레이를 카드 층에 · ⓑ 라벨을 오버레이 위로 · ⓒ 알파·수명 낮추기)은 **어느 층이 덮는가**
 * 에 따라 답이 갈린다. 그래서 이 재현기가 묻는 것은 증상이 아니라 **범인**이다.
 *
 * 재는 방법 — 자를 클래스가 아니라 **찍힌 픽셀**에 댄다(350 규칙):
 *   [A] 증상 재현 — 쉼 / 홀드 1.1s / 뗌 뒤, 버튼 상자 클립을 찍어 순백 수·평균색을 적는다.
 *   [B] 덮개의 정체 — 홀드 1.1s 그 순간에 `#fxl` 자식 중 **버튼 상자와 겹치는** 노드를 전수로 적는다
 *       (클래스 · 겹침 면적비 · 계산된 opacity · background). 겹친 `.fx-flash` 가 **몇 겹**인지가 핵심이다:
 *       한 겹은 알파 .26 인데 n 겹이면 1−(1−.26)^n 이라 4 겹이면 .70 = «상시 덮개» 다.
 *   [C] 범인 가르기 — 같은 자를 **층을 하나씩 죽인 사본**에 댄다(제품은 안 고친다 · 런타임 오버라이드).
 *         ⓘ 그대로   ⓠ fxFlash 만 죽임   ⓡ fxSpend+fxBurst(알갱이·스파크)만 죽임
 *       흰 픽셀이 돌아오는 쪽이 범인이다. 둘 다 돌아오면 겹침은 합작이다.
 *
 * ⚠ 이 재현기는 **판정을 하지 않는다**(probe239·probe368 선례) — 재는 것만 한다.
 *   PASS/FAIL 은 «측정이 성립했는가»(표본이 잡혔는가 · 콘솔 에러 0)만 본다.
 * ⚠ PNG 는 저장소 밖(스크래치)에 쓰고 커밋하지 않는다(2026-08-30 이력 정리 지시).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { decodePNG } = require('./png441');
const path = require('path');
const fs = require('fs');
const os = require('os');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = process.env.P625_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'p625-'));
const HOLD_MS = Number(process.env.P625_HOLD || 1100);   /* 등재문과 같은 표본 시각 */
const WHITE = 245;                                       /* 등재문과 같은 «순백» 문턱 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const r1 = n => Math.round(n * 10) / 10;
const r3 = n => Math.round(n * 1000) / 1000;

const SPOTS = [
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
];

/* 층을 하나씩 죽이는 사본 — 제품은 한 줄도 안 고친다. `upFx()` 는 `typeof fxFlash === 'function'`
   으로 전역을 읽으므로 전역 바인딩을 갈면 그 층만 빠진다. */
const ARMS = [
  { id: 'as-is',   kill: [],                       n: '그대로(현행 main)' },
  { id: 'noFlash', kill: ['fxFlash'],              n: 'fxFlash 만 죽임' },
  { id: 'noGrain', kill: ['fxSpend', 'fxBurst'],   n: '알갱이·스파크만 죽임' },
  /* «눌린 버튼 자신» 만 남긴다 — 연출을 전부 죽인 자리. 이 값이 기준선이다:
     `noFlash` 가 쉼(497)보다 훨씬 많은 흰을 내길래 «알갱이가 희다» 로 읽힐 뻔했는데,
     [B] 가 그 자리의 덮개를 **0개**로 찍었다. 그러면 남는 설명은 버튼 자신뿐이다
     (`jz-dn` 이 `filter:brightness(1.1)` 를 건다 — 라벨 가장자리 반투명 화소가 245 문턱을 넘어온다). */
  { id: 'noFx',    kill: ['fxFlash', 'fxSpend', 'fxBurst'], n: '연출 전부 죽임(눌린 버튼만)' },
];

/* 찍힌 클립에서 «순백 수 · 평균색» 을 센다 — 등재문과 같은 자. */
function stat(file) {
  const { w, h, px } = decodePNG(file);
  let white = 0, sr = 0, sg = 0, sb = 0;
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const d = i * 4, R = px[d], G = px[d + 1], B = px[d + 2];
    sr += R; sg += G; sb += B;
    if (R >= WHITE && G >= WHITE && B >= WHITE) white++;
  }
  return { w, h, n, white, mean: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)] };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    /* 전투 캔버스는 이 자의 표본에 안 들어오지만(버튼 상자 클립) 60 쥬시·연출 소음을 줄인다 */
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.__p625 = { saved: {}, on: false, sel: '', frames: [] };
    /* ⚑ 위상 함정(LESSONS 621-넷째) — 덮개 주기가 60~160ms 라 **스틸 한 장**은 위상을 못 잡는다.
       «상시 덮개» 인지는 한 순간이 아니라 **홀드 전 구간의 듀티**로만 말할 수 있다.
       그래서 [B] 와 별개로 페이지 안 rAF 로 전수 표본을 뜬다(스크린샷과 무관). */
    const P = window.__p625;
    const step = () => {
      if (P.on) {
        const el = document.querySelector(P.sel);
        const L = (typeof fxL === 'function') ? fxL() : null;
        if (el && L) {
          const b = el.getBoundingClientRect(), area = b.width * b.height;
          let n = 0, acc = 0;
          for (const nd of L.children) {
            if (!/fx-flash/.test(nd.className || '')) continue;
            const q = nd.getBoundingClientRect();
            const iw = Math.max(0, Math.min(b.right, q.right) - Math.max(b.left, q.left));
            const ih = Math.max(0, Math.min(b.bottom, q.bottom) - Math.max(b.top, q.top));
            if (iw * ih < area * 0.5) continue;          /* 상자를 «덮는» 것만 — 스쳐 지나는 것은 뺀다 */
            n++;
            const cs = getComputedStyle(nd);
            const m = /rgba?\(([^)]*)\)/.exec(cs.backgroundColor || '');
            const p = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
            const a = p * (+cs.opacity);
            acc = acc + a - acc * a;
          }
          P.frames.push({ n, acc });
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  const rows = [];   /* [A]·[C] 표 */
  const covers = []; /* [B] 표 */

  for (const sp of SPOTS) {
    for (const arm of ARMS) {
      /* 층 죽이기 — 팔이 바뀔 때마다 원본으로 되돌린 뒤 다시 건다(누적 금지) */
      await page.evaluate(kill => {
        const P = window.__p625;
        for (const k of Object.keys(P.saved)) { window[k] = P.saved[k]; }
        P.saved = {};
        for (const k of kill) {
          if (typeof window[k] === 'function') { P.saved[k] = window[k]; window[k] = function () { return false; }; }
        }
      }, arm.kill);

      await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
      await page.waitForTimeout(450);

      const r = await page.evaluate(sel => {
        const el = document.querySelector(sel); if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      }, sp.sel);
      if (!r || !r.w) { ok(false, sp.id + '/' + arm.id + ' 대상 없음', sp.sel); continue; }

      const clip = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) };
      const base = path.join(OUT, sp.id + '-' + arm.id + '-');

      /* ── 쉼 ── */
      await page.screenshot({ path: base + 'rest.png', clip });
      const rest = stat(base + 'rest.png');

      /* ── 홀드 1.1s ── */
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      await page.mouse.move(cx, cy);
      await page.evaluate(sel => { const P = window.__p625; P.sel = sel; P.frames.length = 0; P.on = true; }, sp.sel);
      await page.mouse.down();
      await page.waitForTimeout(HOLD_MS);
      /* 덮개의 정체는 «찍는 그 순간» 에 묻는다 — 스크린샷보다 먼저 DOM 을 훑으면 위상이 어긋난다.
         그래서 DOM 훑기와 스크린샷을 붙여 두 번 다 홀드 안에서 끝낸다. */
      const cov = await page.evaluate(sel => {
        const el = document.querySelector(sel); if (!el) return null;
        const b = el.getBoundingClientRect();
        const L = (typeof fxL === 'function') ? fxL() : null;
        const area = b.width * b.height;
        const out = [];
        if (L) for (const nd of L.children) {
          const q = nd.getBoundingClientRect();
          const iw = Math.max(0, Math.min(b.right, q.right) - Math.max(b.left, q.left));
          const ih = Math.max(0, Math.min(b.bottom, q.bottom) - Math.max(b.top, q.top));
          if (iw <= 0 || ih <= 0) continue;
          const cs = getComputedStyle(nd);
          out.push({ cls: nd.className || nd.tagName, cov: (iw * ih) / area,
                     op: +cs.opacity, bg: cs.backgroundColor, bs: (cs.boxShadow || '').slice(0, 40) });
        }
        /* 덮개가 «없는데» 흰 픽셀이 늘면 범인은 레이어가 아니라 **버튼 자신**이다 — 그 자리도 같이 적는다. */
        const cs0 = getComputedStyle(el);
        const self = { cls: el.className, bg: cs0.backgroundColor, col: cs0.color,
                       fil: cs0.filter, bs: (cs0.boxShadow || '').slice(0, 60), an: cs0.animationName };
        return { layerN: L ? L.childElementCount : -1, hits: out, self };
      }, sp.sel);
      await page.screenshot({ path: base + 'hold.png', clip });
      const hold = stat(base + 'hold.png');
      await page.mouse.up();
      const duty = await page.evaluate(() => {
        const P = window.__p625; P.on = false;
        const f = P.frames.slice();
        if (!f.length) return null;
        const ge = k => f.filter(x => x.n >= k).length / f.length;
        return { N: f.length, mean: f.reduce((s, x) => s + x.n, 0) / f.length,
                 max: Math.max(...f.map(x => x.n)),
                 d1: ge(1), d2: ge(2), d3: ge(3),
                 accMean: f.reduce((s, x) => s + x.acc, 0) / f.length,
                 accMax: Math.max(...f.map(x => x.acc)) };
      });

      /* ── 뗌 뒤(연출 수명 500ms + 여유) ── */
      await page.waitForTimeout(900);
      await page.screenshot({ path: base + 'after.png', clip });
      const after = stat(base + 'after.png');

      rows.push({ id: sp.id, arm: arm.id, box: clip.width + '×' + clip.height,
                  rest, hold, after, duty });
      if (cov) covers.push({ id: sp.id, arm: arm.id, ...cov });
    }
  }

  /* 원본 복구(다음 자가 이 컨텍스트를 재사용할 수 있게) */
  await page.evaluate(() => { const P = window.__p625; for (const k of Object.keys(P.saved)) window[k] = P.saved[k]; P.saved = {}; });

  const cell = s => String(s.white).padStart(7) + ('(' + s.mean.join(',') + ')').padStart(17);
  console.log('\n── [A]·[C] 버튼 상자 안 «순백(≥245,245,245) 픽셀 수» 와 평균색 ─────────────');
  console.log('  자리      층                    상자        쉼: 흰/평균          홀드 1.1s: 흰/평균     뗌 뒤: 흰/평균');
  for (const o of rows) {
    console.log('  ' + o.id.padEnd(9) + o.arm.padEnd(21) + o.box.padStart(9)
      + cell(o.rest) + cell(o.hold) + cell(o.after));
  }

  console.log('\n── [B] 홀드 1.1s 그 순간 버튼 상자를 «덮고 있는» `#fxl` 노드 전수 ──────────');
  for (const c of covers) {
    const flash = c.hits.filter(h => /fx-flash/.test(h.cls));
    const rest = c.hits.filter(h => !/fx-flash/.test(h.cls));
    /* 겹친 워시의 누적 알파 — 한 겹 .26 이면 n 겹은 1−(1−.26)^n */
    let acc = 0;
    for (const f of flash) {
      const m = /rgba?\(([^)]*)\)/.exec(f.bg || '');
      const a = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
      acc = acc + (a * f.op) - acc * (a * f.op);
    }
    console.log('  ' + c.id.padEnd(9) + c.arm.padEnd(9) + '#fxl 자식 ' + String(c.layerN).padStart(3)
      + ' · 상자를 덮는 노드 ' + String(c.hits.length).padStart(3)
      + '  (fx-flash ' + flash.length + ' · 그 외 ' + rest.length + ')'
      + '  누적 워시 알파 ' + r3(acc));
    for (const f of flash) console.log('      flash  겹침 ' + r3(f.cov) + '  opacity ' + r3(f.op) + '  bg ' + f.bg);
    const byCls = {};
    for (const h of rest) byCls[h.cls] = (byCls[h.cls] || 0) + 1;
    for (const k of Object.keys(byCls)) console.log('      기타   ' + k + ' × ' + byCls[k]);
    if (c.self) console.log('      버튼   cls "' + c.self.cls + '" · bg ' + c.self.bg + ' · color ' + c.self.col
      + ' · filter ' + c.self.fil + ' · anim ' + c.self.an + ' · shadow ' + c.self.bs);
  }

  console.log('\n── [D] 층을 죽였을 때 흰 라벨이 돌아오는가(범인 가르기) ────────────────');
  for (const sp of SPOTS) {
    const g = a => rows.find(o => o.id === sp.id && o.arm === a);
    const A = g('as-is'), Q = g('noFlash'), R = g('noGrain'), Z = g('noFx');
    if (!A) continue;
    /* 기준선은 «쉼» 이 아니라 **눌린 버튼만**(noFx) 이다 — 누름 자체가 밝기를 올려 흰 화소를 늘리므로
       쉼과 견주면 모든 팔이 부풀어 보인다. */
    const b0 = Z ? Z.hold.white : A.rest.white;
    const pct = (x) => b0 ? r1(100 * x / b0) + '%' : '—';
    console.log('  ' + sp.id.padEnd(9) + '쉼 ' + String(A.rest.white).padStart(6)
      + ' · 눌린 버튼만 ' + String(Z ? Z.hold.white : -1).padStart(6) + '(기준선)'
      + ' │ 홀드: 그대로 ' + String(A.hold.white).padStart(6) + '(' + pct(A.hold.white) + ')'
      + ' · fxFlash 죽임 ' + String(Q ? Q.hold.white : -1).padStart(6) + '(' + (Q ? pct(Q.hold.white) : '—') + ')'
      + ' · 알갱이 죽임 ' + String(R ? R.hold.white : -1).padStart(6) + '(' + (R ? pct(R.hold.white) : '—') + ')');
  }
  console.log('\n── [E] 홀드 «전 구간» 듀티 — 버튼 상자를 덮는 `.fx-flash` 겹 수 (rAF 전수 · 위상 무관) ──');
  console.log('  자리      층                    표본   평균겹  최대겹  ≥1겹     ≥2겹     ≥3겹     평균누적알파  최대');
  for (const o of rows) {
    const d = o.duty; if (!d) continue;
    console.log('  ' + o.id.padEnd(9) + o.arm.padEnd(21) + String(d.N).padStart(5)
      + String(r3(d.mean)).padStart(8) + String(d.max).padStart(8)
      + String(r3(d.d1)).padStart(9) + String(r3(d.d2)).padStart(9) + String(r3(d.d3)).padStart(9)
      + String(r3(d.accMean)).padStart(14) + String(r3(d.accMax)).padStart(7));
  }
  console.log('\n  캡처: ' + OUT + '  (저장소 밖 — 커밋하지 않는다)');
  console.log('');

  /* 판정은 «측정이 성립했는가» 만 본다 */
  for (const sp of SPOTS) {
    const A = rows.find(o => o.id === sp.id && o.arm === 'as-is');
    ok(!!A, sp.id + ' 표본이 잡혔다', A ? A.box : '없음');
    if (A) ok(A.rest.white > 0, sp.id + ' 쉼 상태에 흰 라벨이 실재한다(자가 흰 것을 볼 수 있다)', '흰 ' + A.rest.white);
  }
  ok(covers.length === SPOTS.length * ARMS.length, '[B] 덮개 훑기가 모든 자리·팔에서 성립',
     covers.length + '/' + (SPOTS.length * ARMS.length));
  ok(errs.length === 0, '콘솔 에러 0', errs.slice(0, 3).join(' | '));

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
