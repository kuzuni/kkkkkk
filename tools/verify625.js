#!/usr/bin/env node
/* 작업 625 — 「연속 강화 홀드 중 버튼이 «비활성» 으로 읽힌다」 **게이트**
 *
 *   node tools/verify625.js
 *
 * 처방(⓭ = review §4 의 ⓓ)은 «한 자리에 플래시 한 장» 이다 — `fxFlash()` 가 겹쳐 쌓지 않고
 * 같은 자리의 앞 장을 걷고 새로 붙인다(= 재시작). 이 자가 묻는 것은 넷이다:
 *
 *   [A] 선언   — 규약이 `fxFlash` 안에 있고 허용 오차 상수(`FXFLASH_SAME`)가 선언돼 있다.
 *   [B] 겹침   — 홀드 «전 구간» rAF 전수 듀티에서 **최대 겹 ≤ 1 · ≥2겹 듀티 0 · 누적 알파 ≤ 한 겹(.26)**.
 *                ⚠ 스틸 한 장으로 묻지 않는다 — 덮개 주기가 60~160ms 라 위상이 값을 만든다
 *                  (LESSONS 621-넷째 · review §6-1: 룬이 같은 자에서 0% 와 90% 를 둘 다 냈다).
 *   [C] 619    — 플래시가 **사라지지는 않았다**. ≥1겹 듀티가 살아 있어야 «틱마다 터진다»(619 주인 지시)가 산다.
 *                겹침을 없애는 가장 쉬운 길은 «플래시를 끄는 것» 이고, 이 항이 그 길을 막는다.
 *   [D] 가독성 — 홀드 중 **라벨 잉크 ↔ 배경 대비비**가 기준선(«눌린 버튼만»)의 일정 비율 이상.
 *                ⚠ **«순백(≥245)» 개수를 자로 쓰면 안 된다**(review §4 경고) — 한 겹 .26 워시만으로도
 *                  흰 글자 G = .26×193 + .74×255 = 238.9 라 순백에서 탈락한다. 즉 순백 자는
 *                  «고쳐도 0» 이라 **처방의 성패를 못 가린다.** 물어야 하는 것은 «글자가 읽히는가» 이고
 *                  그것은 대비비(WCAG 상대휘도)다.
 *
 * [R] 되돌림 시험 — 런타임에서 dedupe 를 무력화한 사본(= 수리 전 동작)에서 [B] 가 **빨개져야** 한다.
 *   무르게 푼 수리가 아님을 이 절이 못박는다(334 규약).
 *
 * ⚠ PNG 는 저장소 밖(스크래치)에 쓰고 커밋하지 않는다(2026-08-30 이력 정리 지시).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { decodePNG } = require('./png441');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const OUT = process.env.V625_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'v625-'));
const HOLD_MS = Number(process.env.V625_HOLD || 1100);

let pass = 0, fail = 0;
const fails = [];
let SEC = '';
const section = s => { SEC = s; console.log('\n' + s); };
const ok = (c, m, d) => {
  c ? pass++ : fail++;
  if (!c) fails.push(SEC + ' ' + m + (d ? ' — ' + d : ''));
  console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : ''));
};
const r2 = n => Math.round(n * 100) / 100;
const r3 = n => Math.round(n * 1000) / 1000;

const SPOTS = [
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
];

/* 한 겹 워시(.26)가 누적 알파로 남기는 값. 부동소수·애니메이션 꼬리(opacity 페이드)를 감안해
   아주 얇은 여유만 준다 — 두 겹(1−.74² = .452) 과는 한참 떨어져 있어 «두 겹» 을 놓치지 않는다. */
const ONE_LAYER = 0.26, ACC_MAX = 0.28;

/* ── WCAG 상대휘도 · 대비비 ─────────────────────────────────────────── */
const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = (R, G, B) => 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B);
const ratio = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); };

/* 클립에서 «라벨 잉크 ↔ 배경» 대비비를 잰다.
   잉크·배경을 색으로 미리 정하지 않는다(팔마다 색이 바뀐다) — 휘도 히스토그램의
   **밝은 쪽 8% 평균**(글자)과 **어두운 쪽 50% 평균**(면)을 쓴다. 글자는 면보다 항상 밝고
   (흰 라벨) 면이 다수라, 표본이 무엇이든 «글자 대 면» 을 집는다. */
function contrast(file) {
  const { w, h, px } = decodePNG(file);
  const n = w * h;
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) { const d = i * 4; ys[i] = lum(px[d], px[d + 1], px[d + 2]); }
  const sorted = Float64Array.from(ys).sort();
  const inkN = Math.max(1, Math.round(n * 0.08));
  const bgN = Math.max(1, Math.round(n * 0.50));
  let si = 0, sb = 0;
  for (let i = n - inkN; i < n; i++) si += sorted[i];
  for (let i = 0; i < bgN; i++) sb += sorted[i];
  const ink = si / inkN, bg = sb / bgN;
  return { cr: ratio(ink, bg), ink, bg, w, h };
}

/* 페이지 안에 «홀드 전 구간 rAF 전수 표본» 을 심는다(probe625 와 같은 자). */
const INSTALL = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  window.__v625 = { saved: {}, on: false, sel: '', frames: [] };
  const P = window.__v625;
  const step = () => {
    if (P.on && P.sel) {
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
          if (iw * ih < area * 0.5) continue;      /* «덮는» 것만 — 스쳐 지나는 것은 뺀다 */
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
};

async function holdSample(page, sp, shoot) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(450);
  const r = await page.evaluate(sel => {
    const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, sp.sel);
  if (!r || !r.w) return null;
  const clip = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) };
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
  await page.evaluate(sel => { const P = window.__v625; P.sel = sel; P.frames.length = 0; P.on = true; }, sp.sel);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  let shot = null;
  if (shoot) { const f = path.join(OUT, shoot + '.png'); await page.screenshot({ path: f, clip }); shot = f; }
  await page.mouse.up();
  const duty = await page.evaluate(() => {
    const P = window.__v625; P.on = false;
    const f = P.frames.slice();
    if (!f.length) return null;
    const ge = k => f.filter(x => x.n >= k).length / f.length;
    return { N: f.length, mean: f.reduce((s, x) => s + x.n, 0) / f.length,
             max: Math.max(...f.map(x => x.n)), d1: ge(1), d2: ge(2), d3: ge(3),
             accMax: Math.max(...f.map(x => x.acc)),
             accMean: f.reduce((s, x) => s + x.acc, 0) / f.length };
  });
  await page.waitForTimeout(420);
  return { duty, shot, clip };
}

/* 층을 죽이거나(기준선) dedupe 를 무력화(되돌림)하는 팔 */
async function arm(page, mode) {
  await page.evaluate(m => {
    const P = window.__v625;
    for (const k of Object.keys(P.saved)) window[k] = P.saved[k];
    P.saved = {};
    if (m === 'noFx') {
      for (const k of ['fxFlash', 'fxSpend', 'fxBurst']) {
        if (typeof window[k] === 'function') { P.saved[k] = window[k]; window[k] = function () { return false; }; }
      }
    } else if (m === 'stack') {
      /* 되돌림 — «앞 장을 걷는» 대목만 무력화한다. `fxFlash` 는 `#fxl` 의 자식을 훑어
         같은 자리의 앞 장을 remove() 하는데, 그 노드의 remove 를 무해하게 만들면
         **수리 전과 같은 append-만** 동작이 된다(제품은 한 줄도 안 고친다). */
      const L = (typeof fxL === 'function') ? fxL() : null;
      if (L) {
        P.saved.__obs = null;
        const mo = new MutationObserver(() => {
          for (const nd of L.children) {
            if (!/fx-flash/.test(nd.className || '')) continue;
            if (nd.__noRm) continue;
            nd.__noRm = true;
            try { Object.defineProperty(nd, 'remove', { value: function () {}, configurable: true }); } catch (_) {}
          }
        });
        mo.observe(L, { childList: true });
        P.__mo = mo;
      }
    }
    if (m !== 'stack' && P.__mo) { try { P.__mo.disconnect(); } catch (_) {} P.__mo = null; }
  }, mode);
  await page.waitForTimeout(120);
}

(async () => {
  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  section('[A] 선언 — «한 자리에 플래시 한 장» 규약이 제품 안에 있다');
  const code = fs.readFileSync(SRC, 'utf8');
  /* ⚑ 619 14회차 이관 — 서명에 둘째 인자 `iv`(틱 간격)가 붙었다(«회당 연출의 길이는 틱이 정한다»).
     **자를 넓힌 것이 아니라 좁힌 것이다** — 인자를 명시로 박아 두므로 그 축이 사라지면 여기가
     빨개진다. 625 의 뜻(«한 자리에 플래시 한 장»)은 아래 A3~A5 가 그대로 지킨다. */
  /* ⚑ 795 이관 — 넷째 인자 `keep`(라벨 패치 opt-in)이 붙었다. **여기도 넓히지 않고 명시로 박는다** —
     14회차 이관과 같은 처방이라, 네 축(자리·길이·상자·패치) 중 하나라도 사라지면 이 항이 빨개진다.
     ⚠ `\([^)]*\)` 같은 «아무 인자나» 로 풀면 그 순간 이 항은 «함수가 있는가» 만 묻는 항이 된다. */
  const fxSrc = (/function fxFlash\(el, iv, inset, keep\)\{[\s\S]*?\n\}/.exec(code) || [''])[0];
  ok(!!fxSrc, 'A1 `fxFlash()` 를 찾았다', fxSrc ? fxSrc.split('\n').length + '줄' : '없음');
  ok(/const FXFLASH_SAME\s*=\s*\d+/.test(code), 'A2 허용 오차 상수 `FXFLASH_SAME` 이 선언돼 있다',
     (/const FXFLASH_SAME\s*=\s*(\d+)/.exec(code) || [])[1]);
  ok(/\.remove\(\)/.test(fxSrc), 'A3 `fxFlash` 가 앞 장을 **걷는다**(remove)');
  ok(/__fxr/.test(fxSrc) && /__fxHost/.test(fxSrc), 'A4 «같은 자리» 를 알아보는 표를 노드에 남긴다');
  ok(/FXFLASH_SAME/.test(fxSrc), 'A5 그 판정이 A2 상수를 읽는다 — 손으로 적은 숫자가 아니다');
  /* 583 알갱이는 범인이 아니었다(review §3) — 한 줄도 안 건드렸음을 못박는다 */
  ok(!/fx-spark|fxSpend/.test(fxSrc), 'A6 583 알갱이·스파크는 `fxFlash` 안에서 한 줄도 안 건드린다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(INSTALL);
  await page.waitForTimeout(400);

  /* ── [B]·[C] 겹침 · 619 ───────────────────────────────────────────── */
  section('[B] 겹침 — 홀드 전 구간 rAF 전수 듀티 (최대 겹 ≤ 1 · ≥2겹 0 · 누적 알파 ≤ 한 겹)');
  console.log('  자리      표본  평균겹  최대겹   ≥1겹    ≥2겹    ≥3겹   누적알파(평균/최대)');
  const live = [];
  await arm(page, 'as-is');
  for (const sp of SPOTS) {
    const s = await holdSample(page, sp, 'hold-' + sp.id);
    if (!s || !s.duty) { ok(false, 'B0 ' + sp.id + ' 표본이 안 잡혔다'); continue; }
    const d = s.duty;
    console.log('  ' + sp.id.padEnd(9) + String(d.N).padStart(4) + r2(d.mean).toString().padStart(8) +
      String(d.max).padStart(8) + r3(d.d1).toString().padStart(9) + r3(d.d2).toString().padStart(8) +
      r3(d.d3).toString().padStart(8) + ('   ' + r3(d.accMean) + ' / ' + r3(d.accMax)));
    ok(d.max <= 1, 'B1 ' + sp.id + ' 최대 겹 ≤ 1', '최대 ' + d.max + ' 겹 (수리 전 4~5)');
    ok(d.d2 === 0, 'B2 ' + sp.id + ' ≥2겹 듀티 = 0', r3(d.d2) + ' (수리 전 0.56~0.62)');
    ok(d.accMax <= ACC_MAX, 'B3 ' + sp.id + ' 누적 알파가 한 겹(' + ONE_LAYER + ')을 안 넘는다',
       '최대 ' + r3(d.accMax) + ' ≤ ' + ACC_MAX);
    live.push({ sp, d, shot: s.shot });
  }

  section('[C] 619 회귀 — 겹침을 없앤다고 플래시가 사라지지는 않았다 («틱마다 터진다»)');
  /* 룬은 확률 시도(`runeBuy`)라 홀드 한 번의 발화 수가 회차마다 다르다(review §2) —
     세 자리 «전부» 에 듀티 하한을 걸면 자가 플레이키해진다. 단련·훈련에만 건다. */
  for (const e of live) {
    if (e.sp.id === 'rune') {
      console.log('  --  rune 듀티 ' + r3(e.d.d1) + ' (확률 시도라 하한을 안 건다 — review §2)');
      continue;
    }
    ok(e.d.d1 >= 0.5, 'C1 ' + e.sp.id + ' ≥1겹 듀티가 살아 있다(플래시가 안 꺼졌다)',
       r3(e.d.d1) + ' ≥ 0.5');
  }
  ok(live.some(e => e.d.d1 > 0), 'C2 적어도 한 자리에서 플래시가 실제로 떴다');

  /* ── [D] 가독성 — 대비비 ─────────────────────────────────────────── */
  section('[D] 가독성 — 라벨 잉크 ↔ 배경 **대비비**(순백 개수가 아니다 · review §4 경고)');
  await arm(page, 'noFx');
  const base = {};
  for (const sp of SPOTS) {
    const s = await holdSample(page, sp, 'base-' + sp.id);
    if (s && s.shot) base[sp.id] = contrast(s.shot);
  }
  await arm(page, 'as-is');
  console.log('  자리      기준선(연출 끔)   홀드(현행)   유지율');
  for (const e of live) {
    const b = base[e.sp.id], h = e.shot ? contrast(e.shot) : null;
    if (!b || !h) { ok(false, 'D0 ' + e.sp.id + ' 대비비 표본이 안 잡혔다'); continue; }
    const keep = h.cr / b.cr;
    console.log('  ' + e.sp.id.padEnd(9) + r2(b.cr).toString().padStart(10) + r2(h.cr).toString().padStart(14) +
      (Math.round(keep * 100) + '%').padStart(10));
    /* 한 겹 .26 워시의 산수상 상한은 유지율 ≈ 76%(review §2 · 2.90 → 2.21).
       두 겹이면 62%, 다섯 겹이면 44% 로 내려간다 — 0.70 은 «한 겹» 과 «두 겹» 사이에 있다. */
    ok(keep >= 0.70, 'D1 ' + e.sp.id + ' 홀드 중 대비비가 기준선의 70% 이상',
       r2(h.cr) + ' / ' + r2(b.cr) + ' = ' + Math.round(keep * 100) + '%');
  }

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  section('[R] 되돌림 시험 — dedupe 를 무력화하면(= 수리 전) [B] 가 빨개져야 한다');
  await arm(page, 'stack');
  let stacked = 0, seen = 0;
  for (const sp of SPOTS) {
    const s = await holdSample(page, sp, null);
    if (!s || !s.duty) continue;
    seen++;
    const d = s.duty;
    console.log('  ' + sp.id.padEnd(9) + '최대겹 ' + d.max + ' · ≥2겹 ' + r3(d.d2) + ' · 누적알파 최대 ' + r3(d.accMax));
    if (d.max >= 2) stacked++;
  }
  await arm(page, 'as-is');
  ok(seen >= 2, 'R0 되돌림 팔에서도 표본이 잡혔다', seen + '자리');
  ok(stacked >= 1, 'R1 무력화 사본은 실제로 겹이 쌓인다(자가 차이를 볼 수 있다)',
     stacked + '자리에서 최대 겹 ≥ 2');

  section('[Z] 콘솔');
  ok(errs.length === 0, 'Z1 콘솔 에러 0', errs.slice(0, 3).join(' / '));

  console.log('\n  캡처: ' + OUT + '  (저장소 밖 — 커밋하지 않는다)');
  await browser.close();

  if (fails.length) { console.log('\n실패 목록:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log('\n' + (fail ? 'VERIFY625 FAIL — ' + fail + '건' : 'VERIFY625 PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
