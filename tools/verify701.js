#!/usr/bin/env node
/* 701 게이트 — 단련·룬 강화 배수 토글 ×1/×10/×100/×1000 (주인 지시 2026-09-02 02:12)
 *
 *   node tools/verify701.js
 *
 * 묻는 것은 아홉이다.
 *   [A] 부품   — 668·700·713 과 **같은 공용 셸**(`.stabs.sp4`)이고 칸 목록이 `SUM_MULS` 한 곳에서 온다
 *   [B] 자리   — 룬은 잔량 헤더와 한 줄(24/632 ↔ 672/350 · 겹침 0) · 단련은 제 줄(126/794 · 위 13 아래 12)
 *   [C] Δ0px   — 바를 얹어도 **룬 헤더 말고는 아무것도 안 움직인다**(수리 전 트리와 네 프레임 대조)
 *   [D] 등가성 — 씨앗 고정 «×1000 한 번 ↔ ×1 을 1000번» 이 룬·단련 **둘 다 장부까지 같다**
 *   [E] 클램프 — 재화·만렙이 모자라면 **가능한 만큼만** 하고 그만큼만 과금한다(잔액 음수 0)
 *   [F] 구간   — 단련 총비용이 «단가 × N» 이 아니라 **걸음 합**이다(주인 보강 2026-09-02 02:15)
 *   [G] 연출   — 홀드 틱 1회 = 버스트 **1회**(배수와 무관 — 주인 지시 «클릭 1번 = 660 버스트 1회»)
 *   [H] 상태   — 두 탭이 한 값을 본다 · 팝업을 닫으면 ×1 로 돌아간다
 *   [I] ×1 회귀 — 배수를 안 켜면 두 버튼 라벨이 686·670·584 의 값 그대로다(레퍼런스 상태 불변)
 *   [R] 되돌림 — 배수를 읽는 자리를 지운 사본에서 이 자가 **실제로 빨개진다**
 *
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 `assets/**`·웹폰트가 404 라 «다른 것을 재게» 된다(probe700 §preTree).
 * ⚠ 씨앗과 장부는 **한 evaluate 안**에서 잇는다 — 사이에 rAF 루프가 `Math.random` 을 먹는다(probe701 §4).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const G = require('./gitrev756');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1920, 2280, 2600];
const MULS = [1, 10, 100, 1000];
const SHELL_H = 98;
const RN_BAR = { l: 24, t: 19, w: 632 }, RN_HD = { l: 672, t: 24, w: 350 };
const TP_BAR = { l: 126, t: 843, w: 794 }, TP_UP = 13, TP_DOWN = 12;

let pass = 0, fail = 0, hold = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const skip = (name, why) => { console.log('HOLD ' + name + ' — ' + why); hold++; };

/* «수리 전» 은 선점 커밋의 부모 한 점이다(probe701 §preTree 의 1회차 함정 — merge-base 는 회차를
   push 하는 순간 «수리 후» 가 된다). 못 찾으면 merge-base 로 물러난다. */
function preTree() {
  let base;
  try {
    const c = execFileSync('git', ['log', '--format=%H', '--grep', '^claim(701)', '-1', 'origin/main'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    base = c ? execFileSync('git', ['rev-parse', c + '^'], { cwd: ROOT, encoding: 'utf8' }).trim()
             : execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) { return { ok: false, env: true, why: '수리 전 커밋을 못 읽는다(원격 참조 없음)' }; }
  const r = G.ensure(base);
  if (!r.ok) return { ok: false, env: !!r.env, why: r.why || ('객체 없음: ' + base) };
  let src;
  try {
    src = execFileSync('git', ['show', base + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) { return { ok: false, env: false, why: 'git show 실패: ' + e.message }; }
  const f = path.join(ROOT, '.v701-pre-' + process.pid + '.html');
  fs.writeFileSync(f, src);
  return { ok: true, sha: base, file: f, url: 'file://' + f.replace(/\\/g, '/') };
}
/* §R 되돌림 사본 — 배수를 **읽는 자리**를 ×1 로 못 박는다(부품·바는 그대로 둔다).
   이 사본에서 [D]·[F] 가 빨개져야 «무르게 푼 수리» 가 아니다. */
function revTree() {
  let src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const before = src;
  src = src.replace('const b = temperUpBatch(k, trMul);', 'const b = temperUpBatch(k, 1);')
           .replace('const b = runeTryBatch(id, trMul);', 'const b = runeTryBatch(id, 1);');
  if (src === before) return null;
  const f = path.join(ROOT, '.v701-rev-' + process.pid + '.html');
  fs.writeFileSync(f, src);
  return { file: f, url: 'file://' + f.replace(/\\/g, '/') };
}
const rm = t => { if (t && t.file) { try { fs.unlinkSync(t.file); } catch (_) {} } };

async function open(browser, url, height) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(220);
  return { ctx, page };
}

const SEEDED = `(seed => { let s = seed >>> 0;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(20260902)`;

/* 등가성 장부 — «×m 한 번» 과 «×1 을 m 번» 을 **같은 씨앗**에서 각각 굴려 대조한다.
   룬은 확률 판정이라 수열이 어긋나면 곧바로 갈린다(가장 가혹한 표본). */
const EQ = m => `(() => { ${SEEDED};
  const reset = () => { S.rstone = 5e8; S.tstone = 5e8; S.rune = { r1:0, r2:0, r3:0 };
    S.temper = { alloc:{ atk:0, hp:0, regen:0 } }; };
  const snap = () => ({ rlv: runeLvOf('r1'), rst: S.rstone, tlv: temperLv('atk'), tst: S.tstone });
  const seed = s0 => { let s = s0 >>> 0; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  seed(20260902); reset();
  const rb = runeTryBatch('r1', ${m}); const tb = temperUpBatch('atk', ${m});
  const batch = { ...snap(), rtries: rb.tries, rsucc: rb.succ, rspent: rb.spent, tdone: tb.done, tspent: tb.spent };
  seed(20260902); reset();
  let rtries = 0, rsucc = 0, rspent = 0, tdone = 0, tspent = 0;
  for (let i = 0; i < ${m}; i++) { const r = runeTryBatch('r1', 1); rtries += r.tries; rsucc += r.succ; rspent += r.spent; }
  for (let i = 0; i < ${m}; i++) { const t = temperUpBatch('atk', 1); tdone += t.done; tspent += t.spent; }
  const one = { ...snap(), rtries, rsucc, rspent, tdone, tspent };
  return { batch, one };
})()`;

(async () => {
  const browser = await launch(chromium);

  /* ── [A]·[B]·[I] 부품·자리·×1 회귀 ─────────────────────────────────────── */
  const geo = [];
  for (const H of FRAMES) {
    const { ctx, page } = await open(browser, URL, H);
    const r = await page.evaluate(() => {
      S.rstone = 1234567; S.tstone = 987654; S.rune = { r1: 50, r2: 0, r3: 0 };
      S.temper = { alloc: { atk: 7, hp: 0, regen: 0 } };
      openTrain();
      const box = document.querySelector('#trw .tr-box'), bb = box.getBoundingClientRect();
      const R = s => { const e = document.querySelector(s); if (!e) return null;
        const q = e.getBoundingClientRect();
        return { l: +(q.left - bb.left).toFixed(1), t: +(q.top - bb.top).toFixed(1),
                 r: +(q.right - bb.left).toFixed(1), b: +(q.bottom - bb.top).toFixed(1),
                 w: +q.width.toFixed(1), h: +q.height.toFixed(1) }; };
      const cellFit = id => [...document.querySelectorAll('#' + id + ' [data-mul]')].map(c => {
        const q = c.getBoundingClientRect(), i = c.querySelector('i').getBoundingClientRect();
        return +Math.min(i.left - q.left, q.right - i.right).toFixed(1); });
      setTrSub('rune'); renderTrain();
      const rn = {
        cls: $('rnMulBar').className, host: $('rnMulBar').parentElement.className,
        muls: [...document.querySelectorAll('#rnMulBar [data-mul]')].map(c => +c.dataset.mul),
        labs: [...document.querySelectorAll('#rnMulBar [data-mul] i')].map(c => c.textContent),
        on: [...document.querySelectorAll('#rnMulBar .stab.on')].map(c => +c.dataset.mul),
        fit: cellFit('rnMulBar'),
        bar: R('#rnMulBar'), hd: R('.rn-hd'), subs: R('.rn-subs'), body: R('.tr-runes'),
        hdInkOver: (() => { const p = document.querySelector('.rn-hd .pv').getBoundingClientRect(),
          h = document.querySelector('.rn-hd').getBoundingClientRect();
          return +Math.min(p.left - h.left, h.right - p.right).toFixed(1); })(),
        btn: document.querySelector('.tr-rn .rbt.b1 i').textContent,
        btnRef: fmt(runeCost(RN[curRuneId()], runeLvOf(curRuneId())))
      };
      setTrSub('temper'); renderTrain();
      const tp = {
        cls: $('tpMulBar').className,
        muls: [...document.querySelectorAll('#tpMulBar [data-mul]')].map(c => +c.dataset.mul),
        fit: cellFit('tpMulBar'),
        bar: R('#tpMulBar'), k2: R('.tr-tp.k2'), subsBar: R('.tr-subs'),
        btn: document.querySelector('.tr-tp.k0 .tb .tbn').textContent,
        btnRef: fmt(temperCost('atk'))
      };
      /* ⚠ «훈련 탭에서 숨는가» 는 반드시 **훈련 탭으로 돌아온 뒤** 읽는다 — 위에서 마지막으로 켠 것이
         단련 탭이라 그대로 읽으면 `#tpMulBar` 가 당연히 block 이다(1회차에 이 자가 그렇게 빨갰다). */
      setTrSub('train'); renderTrain();
      return { rn, tp, srcMuls: SUM_MULS.slice(), vis: {
        trainR: getComputedStyle($('rnMulBar')).display, trainT: getComputedStyle($('tpMulBar')).display } };
    });
    geo.push({ H, ...r });
    await ctx.close();
  }
  const g0 = geo[0];
  ok(geo.every(g => /\bstabs\b/.test(g.rn.cls) && /\bsp4\b/.test(g.rn.cls)
                 && /\bstabs\b/.test(g.tp.cls) && /\bsp4\b/.test(g.tp.cls)),
    '[A1] 두 바가 668·700·713 과 같은 공용 셸 `.stabs.sp4` 다', g0.rn.cls + ' · ' + g0.tp.cls);
  ok(geo.every(g => JSON.stringify(g.rn.muls) === JSON.stringify(g.srcMuls)
                 && JSON.stringify(g.tp.muls) === JSON.stringify(g.srcMuls)),
    '[A2] 칸 목록이 `SUM_MULS` 한 곳에서 온다(마크업에 숫자 두 벌 0)', g0.rn.muls.join(','));
  ok(JSON.stringify(g0.rn.labs) === JSON.stringify(MULS.map(m => '×' + m.toLocaleString('en-US'))),
    '[A3] 라벨은 668 과 같은 말(`mulBarHTML`)', g0.rn.labs.join(' '));
  ok(geo.every(g => g.rn.on.length === 1 && g.rn.on[0] === 1),
    '[A4] 활성 알약은 정확히 하나 · 기본은 ×1', g0.rn.on.join(','));

  ok(geo.every(g => g.rn.bar.l === RN_BAR.l && g.rn.bar.t === RN_BAR.t
                 && g.rn.bar.w === RN_BAR.w && g.rn.bar.h === SHELL_H),
    '[B1] 룬 바 자리 = ' + JSON.stringify(RN_BAR) + ' · 높이 ' + SHELL_H, JSON.stringify(g0.rn.bar));
  ok(geo.every(g => g.rn.hd.l === RN_HD.l && g.rn.hd.t === RN_HD.t && g.rn.hd.w === RN_HD.w),
    '[B2] 룬 잔량 헤더가 같은 줄의 오른쪽 = ' + JSON.stringify(RN_HD), JSON.stringify(g0.rn.hd));
  ok(geo.every(g => g.rn.hd.l - g.rn.bar.r >= 12),
    '[B3] 바 ↔ 헤더 **겹침 0**(사이 12 이상)', geo.map(g => g.H + ':' + (g.rn.hd.l - g.rn.bar.r)).join(' · '));
  ok(geo.every(g => g.rn.subs.t - g.rn.bar.b >= 12),
    '[B4] 바 하변 ↔ 하위 바 상변 12 이상(줄이 안 붙는다)',
    geo.map(g => g.H + ':' + (g.rn.subs.t - g.rn.bar.b)).join(' · '));
  ok(geo.every(g => g.rn.fit.every(v => v >= 4) && g.tp.fit.every(v => v >= 4)),
    '[B5] 네 칸 라벨 잉크가 칸을 **안 넘친다**(좌우 여유 4 이상 — «×1,000» 이 최악)',
    '룬 ' + g0.rn.fit.join('/') + ' · 단련 ' + g0.tp.fit.join('/'));
  ok(geo.every(g => g.rn.hdInkOver >= 4),
    '[B6] 좁힌 헤더 안에서 잉크가 안 넘친다', geo.map(g => g.H + ':' + g.rn.hdInkOver).join(' · '));
  ok(geo.every(g => g.tp.bar.l === TP_BAR.l && g.tp.bar.t === TP_BAR.t
                 && g.tp.bar.w === TP_BAR.w && g.tp.bar.h === SHELL_H),
    '[B7] 단련 바 자리 = ' + JSON.stringify(TP_BAR) + '(상위 바와 같은 좌·폭 — 96 대칭)',
    JSON.stringify(g0.tp.bar));
  ok(geo.every(g => g.tp.bar.t - g.tp.k2.b === TP_UP && g.tp.subsBar.t - g.tp.bar.b === TP_DOWN),
    '[B8] 단련 바가 빈 띠 한복판 — 위 ' + TP_UP + ' · 아래 ' + TP_DOWN,
    geo.map(g => g.H + ':' + (g.tp.bar.t - g.tp.k2.b) + '/' + (g.tp.subsBar.t - g.tp.bar.b)).join(' · '));
  ok(geo.every(g => g.vis.trainR === 'none' && g.vis.trainT === 'none'),
    '[B9] 훈련 탭에서는 두 바가 **둘 다 숨는다**(번갈아 쓰는 형제 규약)',
    g0.vis.trainR + '/' + g0.vis.trainT);

  ok(geo.every(g => g.tp.btn === g.tp.btnRef),
    '[I1] ×1 에서 단련 버튼 수 = `temperCost` — 686·670 잉크 불변', g0.tp.btn + ' ↔ ' + g0.tp.btnRef);
  ok(geo.every(g => g.rn.btn.indexOf(g.rn.btnRef) >= 0),
    '[I2] 룬 버튼 라벨은 배수를 **안 탄다**(1회 단가 — 확률이라 총액이 사전 확정 불가 · 위임 규약 ⓒ)',
    g0.rn.btn + ' ⊇ ' + g0.rn.btnRef);

  /* ── [C] Δ0px — 수리 전 트리와 대조 ────────────────────────────────────── */
  const pre = preTree();
  if (!pre.ok) {
    if (pre.env) skip('[C] Δ0px 대조', pre.why); else ok(false, '[C] 수리 전 사본을 못 꺼냈다', pre.why);
  } else {
    const SEL = ['.rn-subs', '.tr-runes', '.tr-rn', '.tr-rn .rbt.b1', '.tr-runes .rsum',
                 '.tr-temp', '.tr-tp.k0', '.tr-tp.k1', '.tr-tp.k2', '.tr-tp.k0 .tb',
                 '.tr-temp .tp-hd', '.tr-subs'];
    const shot = async url => {
      const out = {};
      for (const H of FRAMES) {
        const { ctx, page } = await open(browser, url, H);
        out[H] = await page.evaluate(sel => {
          S.rstone = 1234567; S.tstone = 987654; S.rune = { r1: 50, r2: 0, r3: 0 };
          S.temper = { alloc: { atk: 7, hp: 0, regen: 0 } };
          openTrain();
          const box = document.querySelector('#trw .tr-box'), bb = box.getBoundingClientRect();
          const R = s => { const e = document.querySelector(s); if (!e) return 'MISSING';
            const q = e.getBoundingClientRect();
            return [+(q.left - bb.left).toFixed(1), +(q.top - bb.top).toFixed(1),
                    +q.width.toFixed(1), +q.height.toFixed(1)].join(','); };
          const o = {};
          setTrSub('rune'); renderTrain();
          sel.forEach(s => { if (s.indexOf('temp') < 0 && s.indexOf('.tr-tp') < 0) o[s] = R(s); });
          setTrSub('temper'); renderTrain();
          sel.forEach(s => { if (o[s] === undefined) o[s] = R(s); });
          return o;
        }, SEL);
        await ctx.close();
      }
      return out;
    };
    const A = await shot(pre.url), B = await shot(URL);
    /* ⚑ 769 이관 — 이 항은 «수리 전 트리»(701 직전 SHA)와 대조한다. 그래서 **701 뒤에 온
       의도적 변경**은 전부 여기서 빨개진다(자가 상한다는 뜻이 아니라, 그 변경을 이름과 함께
       적어 줘야 한다는 뜻이다 — 333 처방: 자리를 비우지 말고 «무엇이 왜 움직였나» 를 적는다).
       769 = `.td` 과예약(392 → 236)을 걷어 그 폭을 단련 버튼에 넘겼다 ⇒ `.tb` 폭 340 → 496,
       좌변 −156. **세로(top·height)는 한 픽셀도 안 움직인다** — 그 조건까지 같이 건다. */
    const LATER = {
      '.tr-tp.k0 .tb': { why: '769 — 폭 340 → 496(좌변 −156) · 세로 Δ0', dx: -156, dw: 156 }
    };
    const moved = [], okLater = [];
    for (const H of FRAMES) for (const s of SEL) {
      if (A[H][s] === B[H][s]) continue;
      const L = LATER[s];
      if (L) {
        const a = A[H][s].split(',').map(Number), b = B[H][s].split(',').map(Number);
        if (Math.abs(b[0] - (a[0] + L.dx)) < 0.5 && Math.abs(b[1] - a[1]) < 0.5
            && Math.abs(b[2] - (a[2] + L.dw)) < 0.5 && Math.abs(b[3] - a[3]) < 0.5) {
          okLater.push(H + ' ' + s); continue;
        }
      }
      moved.push(H + ' ' + s + ' ' + A[H][s] + ' → ' + B[H][s]);
    }
    ok(moved.length === 0,
      '[C] 바를 얹어도 **12개 요소 × 네 프레임이 한 픽셀도 안 움직인다**(룬 잔량 헤더 · 769 버튼 폭만 의도적 이탈)',
      moved.length ? moved.slice(0, 4).join(' | ')
                   : (48 - okLater.length) + '/48 Δ0 · 769 이탈 ' + okLater.length + '건(폭 +156 · 세로 Δ0)');
  }

  /* ── [D]~[H] 동작 ──────────────────────────────────────────────────────── */
  const behave = async url => {
    const { ctx, page } = await open(browser, url, 2280);
    const eq1000 = await page.evaluate(EQ(1000));
    const eq100 = await page.evaluate(EQ(100));
    const rest = await page.evaluate(() => {
      const out = {};
      /* [E] 클램프 — 정확히 7회분만 있는 상태에서 ×1000 */
      S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
      S.tstone = 7;                                   /* 구간 0 은 1/회 → 딱 7회 */
      const b = temperUpBatch('atk', 1000);
      out.clampDone = b.done; out.clampSpent = b.spent; out.clampLeft = S.tstone; out.clampLv = temperLv('atk');
      /* [E2] 룬 만렙 클램프 — Lv.499 에서 ×1000 이면 최대 1회만 오른다 */
      S.rstone = 1e9; S.rune = { r1: 499, r2: 0, r3: 0 };
      const rb = runeTryBatch('r1', 1000);
      out.rMaxLv = runeLvOf('r1'); out.rMaxTries = rb.tries;
      /* [F] 구간 — Lv.95 에서 ×10 은 «단가×10» 과 다르다 */
      S.tstone = 1e9; S.temper = { alloc: { atk: 95, hp: 0, regen: 0 } };
      out.flat = temperCost('atk') * 10;
      out.plan = temperPlan('atk', 10).cost;
      const before = S.tstone; const b2 = temperUpBatch('atk', 10);
      out.paid = before - S.tstone; out.spent = b2.spent;
      /* [F2] 라벨이 그 값을 적는다 */
      S.tstone = 1e9; S.temper = { alloc: { atk: 95, hp: 0, regen: 0 } };
      openTrain(); setTrSub('temper'); setTrMul(10); renderTrain();
      out.label10 = document.querySelector('.tr-tp.k0 .tb .tbn').textContent;
      out.labelRef = fmt(temperPlan('atk', 10).cost);
      /* [H] 두 탭 한 값 */
      setTrSub('rune'); renderTrain();
      out.shared = [...document.querySelectorAll('#rnMulBar .stab.on')].map(c => +c.dataset.mul)[0];
      /* [H2] 닫으면 ×1 */
      closeTrain();
      out.afterClose = trMul;
      out.afterCloseBar = [...document.querySelectorAll('#tpMulBar .stab.on')].map(c => +c.dataset.mul)[0];
      return out;
    });
    /* [G] 연출 — 홀드 틱 1회 = upFx 1회(배수와 무관) */
    const fx = await page.evaluate(async () => {
      window.__fx = 0;
      const orig = window.upFx;
      window.upFx = function () { window.__fx++; return orig.apply(this, arguments); };
      S.tstone = 1e9; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
      openTrain(); setTrSub('temper'); setTrMul(100); renderTrain();
      const lv0 = temperLv('atk'); window.__fx = 0;
      rtTemperHold('atk');
      await new Promise(r => setTimeout(r, 900));
      const fxN = window.__fx, lv = temperLv('atk');
      rtHoldStop(false);
      window.upFx = orig;
      setTrMul(1); closeTrain();
      return { fxN, gained: lv - lv0 };
    });
    await ctx.close();
    return { eq1000, eq100, ...rest, ...fx };
  };
  const R = await behave(URL);

  const eqSame = e => JSON.stringify(e.batch) === JSON.stringify(e.one);
  ok(eqSame(R.eq1000), '[D1] ⚑ 씨앗 고정 «×1000 한 번 ↔ ×1 을 1000번» — 룬·단련 장부 **완전 일치**',
    JSON.stringify(R.eq1000.batch));
  ok(eqSame(R.eq100), '[D2] 같은 항등식이 ×100 에서도 성립', JSON.stringify(R.eq100.batch));
  ok(R.eq1000.batch.rtries === 1000 && R.eq1000.batch.tdone === 1000,
    '[D3] 재화가 넉넉하면 ×1000 은 정말 1000걸음이다',
    'rune ' + R.eq1000.batch.rtries + ' · temper ' + R.eq1000.batch.tdone);

  ok(R.clampDone === 7 && R.clampSpent === 7 && R.clampLeft === 0 && R.clampLv === 7,
    '[E1] ⚑ 클램프 — 7회분만 있는데 ×1000 을 눌러도 **7회 · 7만 과금 · 잔액 0**(음수 없음)',
    'done ' + R.clampDone + ' · spent ' + R.clampSpent + ' · left ' + R.clampLeft);
  ok(R.rMaxLv === 500 && R.rMaxTries >= 1 && R.rMaxTries <= 1000,
    '[E2] 룬은 만렙(500)에서 저절로 멈춘다 — 넘어가지 않는다',
    'lv ' + R.rMaxLv + ' · tries ' + R.rMaxTries);

  ok(R.flat !== R.plan && R.plan === R.paid && R.paid === R.spent,
    '[F1] ⚑ 구간 경계 — 총비용이 «단가 × N»(' + R.flat + ')이 아니라 **걸음 합**(' + R.plan + ')이고 실제 차감도 그 값이다',
    'flat ' + R.flat + ' ↔ plan ' + R.plan + ' = paid ' + R.paid);
  ok(R.label10 === R.labelRef,
    '[F2] 단련 버튼이 **그 값을 적는다**(라벨이 거짓말을 안 한다)', R.label10 + ' ↔ ' + R.labelRef);

  ok(R.fxN >= 1 && R.gained >= R.fxN * 100 && R.fxN <= 12,
    '[G] ⚑ 홀드 틱 1회 = 버스트 1회 — ×100 으로 ' + R.gained + '레벨이 올랐는데 발화는 ' + R.fxN + '회',
    '발화 ' + R.fxN + ' · 강화 ' + R.gained);

  ok(R.shared === 10, '[H1] 단련에서 고른 배수를 룬 탭이 그대로 본다(두 곳·한 값)', String(R.shared));
  ok(R.afterClose === 1 && R.afterCloseBar === 1,
    '[H2] 팝업을 닫으면 ×1 로 돌아간다(668ⓑ·700ⓑ 규약)', 'trMul ' + R.afterClose);

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────────────── */
  const rev = revTree();
  if (!rev) ok(false, '[R] 되돌림 사본을 못 만들었다 — 배수를 읽는 자리를 못 찾았다');
  else {
    const { ctx, page } = await open(browser, rev.url, 2280);
    const e = await page.evaluate(EQ(100));
    const c = await page.evaluate(() => {
      S.tstone = 1e9; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
      openTrain(); setTrSub('temper'); setTrMul(100); renderTrain();
      const lv0 = temperLv('atk');
      rtTemperHold('atk'); rtHoldStop(false);
      return { gained: temperLv('atk') - lv0 };
    });
    await ctx.close();
    rm(rev);
    ok(!eqSame(e) || c.gained < 100,
      '[R] 배수를 ×1 로 못 박은 사본에서 **실제로 빨개진다**(같은 자가 그 사본을 통과하지 않는다)',
      '한 틱 강화 ' + c.gained + '회(정상은 100)');
  }
  rm(pre);

  await browser.close();
  console.log('\nVERIFY701 ' + pass + '/' + (pass + fail) + (hold ? ' (HOLD ' + hold + ')' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
