#!/usr/bin/env node
/* 게이트 — 작업 489 「룬 강화 수치를 **선형**으로」 (2026-08-30 주인 확정 23:40 · 203 개정)
 *
 *   node tools/verify489.js
 *
 * 지키는 성질: **1레벨의 무게가 전 구간 같다 — 그리고 그 상수는 선언 한 곳에서만 온다.**
 *   [A] 모델   — Lv n → n+1 의 차가 **상수 ±0**(구 계단 경계 100·200·300·400 을 표본에 포함) ·
 *                그 상수가 `eff[k] × RUNE_LIN` 과 한 식 · 누적 = 상수 × 레벨(세 룬 · 전 축).
 *   [B] 계단 폐기 — `RUNE_STEP` / `RUNE_STEP_EVERY` 가 **제품 줄에 0건**이고 런타임에도 없다.
 *                («두 벌 금지» 295-② — 표가 남아 있으면 다음 세션이 둘 중 하나를 보고 갈라진다.)
 *   [C] 상한·세이브 — `RUNE_MAXLV` 500 **불변** ⇒ 이관 0줄. 구 세이브(Lv 120)를 **실로드**해
 *                레벨이 그대로 120 이고 KEY 를 안 올렸다.
 *   [D] 비용   — 지시 «레벨당 비 ≤ 1.05» · 단조 증가. (선형 수치에 지수 비용이 얹히면 체감이 다시 죽는다.)
 *   [E] 표기   — 카드 «다음 +n%» 이 레벨과 무관한 상수이고 `runeVal` 과 한 식 · bonus()·cp 에 실제 반영.
 *   [F] 배수   — 구 계단표 대비 대조표(등재문의 두 조항이 **서로 양립하지 않음**을 수치로 남긴다).
 *   [R] 되돌림 시험 — 계단표를 **도로 끼운 사본**에서 [A] 의 «상수» 가 빨개진다
 *                (334·338 교훈 — 이 절이 없으면 «이미 참인 것을 굳힌 게이트» 다).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «식·수치» 판정이라 비평가를 띄우지 않는다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 구 계단표 — 되돌림 사본과 [F] 대조표가 같은 값을 쓴다(여기 한 곳에만 적는다) */
const OLD_EVERY = 100, OLD_STEP = [1, 1.8, 3.0, 4.6, 6.6];
const oldMul = L => {                                  /* Σ 계단 배수 (구 runeVal 의 n) */
  let l = L, n = 0, seg = 0;
  while (l > 0 && seg < OLD_STEP.length) { const t = Math.min(l, OLD_EVERY); n += t * OLD_STEP[seg]; l -= t; seg++; }
  return n;
};

async function boot(browser, url, save) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save || { gold: 5e7, dia: 1e5, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof runeVal === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { ctx, page, errs };
}

/* 한 트리에서 «Lv n → n+1 의 차» 표를 뽑는다 — 본체와 되돌림 사본이 **같은 함수**를 지난다 */
const gains = (page, id, k) => ev(page, ([id, k]) => {
  const keep = JSON.parse(JSON.stringify(S.rune || {}));
  const at = L => { S.rune[id] = L; return runeVal(id, k); };
  const LV = [1, 2, 50, 99, 100, 101, 150, 200, 201, 300, 301, 400, 401, 499, 500];
  const g = LV.map(L => +(at(L) - at(L - 1)).toFixed(9));
  const cum = [1, 100, 250, 500].map(L => ({ L, v: +at(L).toFixed(9) }));
  S.rune = keep;
  return { LV, g, cum };
}, [id, k]);

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */
  const browser = await launch(chromium);
  const b = await boot(browser, 'file://' + SRC);
  const p = b.page;

  /* ================= [A] 모델 ================= */
  blk('[A] 모델 — Lv n→n+1 의 차가 전 구간 상수다');
  const decl = await ev(p, () => ({
    lin: typeof RUNE_LIN === 'number' ? RUNE_LIN : null,
    max: RUNE_MAXLV,
    runes: RUNES.map(r => ({ id: r.id, eff: r.eff }))
  }));
  ok(decl && decl.lin === 3, '★ [A0] 선형 계수 `RUNE_LIN` = 3 (지시 «현행 Lv1~100 구간의 레벨당 증가분 ×3»)',
    decl ? String(decl.lin) : '못 읽음');
  let allFlat = true;
  for (const r of (decl ? decl.runes : [])) {
    for (const k of Object.keys(r.eff)) {
      const t = await gains(p, r.id, k);
      if (!t) { ok(false, '[A-' + r.id + '.' + k + '] 표를 못 뽑았다'); allFlat = false; continue; }
      const want = +(r.eff[k] * decl.lin).toFixed(9);
      const flat = t.g.every(v => Math.abs(v - t.g[0]) < 1e-12);
      const same = Math.abs(t.g[0] - want) < 1e-12;
      const lin = t.cum.every(c => Math.abs(c.v - want * c.L) < 1e-9);
      if (!flat || !same || !lin) allFlat = false;
      ok(flat, '[A1-' + r.id + '.' + k + '] 15개 표본(구 경계 100/200/300/400 포함)의 차가 **전부 같다**',
        [...new Set(t.g.map(v => v.toFixed(6)))].join(' / '));
      ok(same, '[A2-' + r.id + '.' + k + '] 그 상수 = eff × RUNE_LIN', t.g[0] + ' = ' + want);
      ok(lin, '[A3-' + r.id + '.' + k + '] 누적 = 상수 × 레벨 (Lv 1·100·250·500)',
        t.cum.map(c => 'Lv' + c.L + ':' + c.v.toFixed(3)).join(' · '));
    }
  }
  ok(allFlat, '★ [A4] 세 룬 · 전 축이 예외 없이 선형이다');

  /* ================= [B] 계단 폐기 ================= */
  blk('[B] 계단 폐기 — 표가 두 벌로 남아 있지 않다');
  {
    const hits = (code.match(/RUNE_STEP(_EVERY)?\b/g) || []).length;
    ok(hits === 0, '★ [B1] 주석을 걷어낸 제품 줄에 `RUNE_STEP`/`RUNE_STEP_EVERY` **0건** (295-② 두 벌 금지)', hits + '건');
    const rt = await ev(p, () => ({
      step: typeof RUNE_STEP, every: typeof RUNE_STEP_EVERY,
      lin: typeof RUNE_LIN, s1: typeof runeStep1
    }));
    ok(rt && rt.step === 'undefined' && rt.every === 'undefined',
      '[B2] 런타임에도 계단 표가 없다', rt ? rt.step + '/' + rt.every : '못 읽음');
    ok(rt && rt.lin === 'number' && rt.s1 === 'function',
      '[B3] 대신 `RUNE_LIN`(수) 과 `runeStep1()`(함수) 한 벌만 있다', rt ? rt.lin + '/' + rt.s1 : '못 읽음');
    const cardStep = await ev(p, () => {
      openTrain && openTrain(); setTrSub('rune'); renderTrain();
      const n = document.querySelector('.tr-rn>.rst');
      return n ? n.textContent.trim() : '';
    });
    ok(typeof cardStep === 'string' && cardStep.indexOf('계단') < 0 && cardStep.length > 0,
      '[B4] 카드 안내줄이 «계단» 을 더 이상 말하지 않는다(자리는 안 비웠다 — 333)', cardStep);
  }

  /* ================= [C] 상한·세이브 ================= */
  blk('[C] 상한·세이브 — 상한 불변이라 이관 0줄이다');
  {
    ok(decl && decl.max === 500, '[C1] `RUNE_MAXLV` 500 불변(주인 확정 · 489 는 상한을 안 건드렸다)',
      decl ? String(decl.max) : '못 읽음');
    const keyBump = (code.match(/idle_hunter_save_v(\d+)/g) || []).map(s => s.slice(-1));
    ok(keyBump.length > 0 && keyBump.every(v => v === '4'),
      '[C2] 세이브 KEY 를 안 올렸다(v4 그대로) — 상한이 안 바뀌었으므로 이관이 없다',
      [...new Set(keyBump)].join(','));
    const b2 = await boot(browser, 'file://' + SRC,
      { gold: 5e7, dia: 1e5, best: 40, rune: { r1: 120, r2: 0, r3: 0 }, rstone: 500 });
    const old = await ev(b2.page, () => ({ lv: runeLvOf('r1'), val: +runeVal('r1', 'atk').toFixed(9) }));
    ok(old && old.lv === 120, '★ [C3] 구 세이브(Lv 120) 실로드 — 레벨이 **그대로 120**(깎이지도 환급되지도 않는다)',
      old ? String(old.lv) : '못 읽음');
    ok(old && Math.abs(old.val - 0.010 * 3 * 120) < 1e-9,
      '[C4] 그 세이브의 효과가 새 식(eff × RUNE_LIN × Lv)으로 읽힌다', old ? old.val.toFixed(4) : '');
    ok(b2.errs.length === 0, '[C5] 구 세이브 경로도 에러 0', b2.errs.slice(0, 2).join(' | ') || '없음');
    await b2.ctx.close();
  }

  /* ================= [D] 비용 ================= */
  blk('[D] 비용 — 레벨당 비 ≤ 1.05 · 단조 증가');
  {
    const cost = await ev(p, () => RUNES.map(r => {
      /* ⚠ 정수 반올림(`Math.ceil`)이 저비용 구간에서 12 → 13 = ×1.083 을 만든다 —
         그것은 «곡선이 가파르다» 가 아니라 한 칸 올림이다. 그래서 자는 «올림을 허용한 1.05»
         (= c(l+1) ≤ ceil(c(l) × 1.05))로 잡고, 곡선 자체는 선언 비(D1)가 본다. */
      let mono = true, over = 0, worst = '';
      let prev = runeCost(r, 0);
      for (let l = 1; l <= RUNE_MAXLV; l++) {
        const c = runeCost(r, l);
        if (c < prev) mono = false;
        if (c > Math.ceil(prev * 1.05)) { over++; if (!worst) worst = 'Lv' + (l - 1) + ' ' + prev + '→' + c; }
        prev = c;
      }
      return { id: r.id, r: r.cost.r, over, worst, mono, at0: runeCost(r, 0), at499: runeCost(r, 499) };
    }));
    (cost || []).forEach(c => {
      ok(c.r <= 1.05, '[D1-' + c.id + '] 선언 비 ≤ 1.05', String(c.r));
      ok(c.over === 0, '[D2-' + c.id + '] 실측 레벨당 비 ≤ 1.05 (정수 올림 허용 · Lv 0~500 전 구간)',
        c.over ? c.over + '건 초과 · ' + c.worst : '초과 0건');
      ok(c.mono, '[D3-' + c.id + '] 비용이 레벨에 대해 단조 증가', c.at0 + ' → ' + c.at499);
    });
    ok(!!cost && cost.length === 3, '[D4] 세 룬 전부 쟀다', cost ? cost.length + '종' : '못 읽음');
  }

  /* ================= [E] 표기·반영 ================= */
  blk('[E] 표기 — «다음 +n%» 이 레벨 무관 상수이고 bonus()·cp 에 실제로 실린다');
  {
    const say = await ev(p, () => {
      setRuneSub('r1');
      const nx = [0, 99, 100, 250, 499].map(l => {
        S.rune.r1 = l; renderTrain();
        return [...document.querySelectorAll('.tr-rn>.rd>.rw>s')].map(e => e.textContent.trim()).join('|');
      });
      S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty(); const cp0 = cp(), a0 = bonus().atk;
      S.rune = { r1: 300, r2: 0, r3: 0 }; markDirty(); const cp1 = cp(), a1 = bonus().atk;
      const want = 1 + runeSum('atk');
      S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty(); renderTrain();
      return { nx, cp0, cp1, ratio: a1 / a0, want };
    });
    ok(say && new Set(say.nx).size === 1,
      '★ [E1] 다섯 레벨(0·99·100·250·499)의 «다음 +n%» 이 **글자까지 같다**', say ? say.nx[0] : '');
    ok(say && say.cp1 > say.cp0, '[E2] 룬 레벨이 전투력(cp)에 실제로 반영된다',
      say ? Math.round(say.cp0) + ' → ' + Math.round(say.cp1) : '');
    ok(say && Math.abs(say.ratio - say.want) < 1e-9,
      '[E3] bonus() 가 «축별 합산 후 1회 곱» 으로 새 식을 그대로 태운다(194·LESSONS 91-1)',
      say ? say.ratio.toFixed(6) + ' = ' + say.want.toFixed(6) : '');
  }

  /* ================= [F] 배수 대조표 ================= */
  blk('[F] 배수 — 구 계단표 대비(등재문 두 조항의 산술 충돌을 수치로 남긴다)');
  {
    const e1 = 0.010;                                   /* 일반룬 atk — 대조에 쓰는 한 축 */
    const rows = [1, 50, 100, 200, 300, 500].map(L => ({
      L, oldV: +(e1 * oldMul(L)).toFixed(4), newV: +(e1 * 3 * L).toFixed(4)
    })).map(r => ({ ...r, x: +(r.newV / r.oldV).toFixed(3) }));
    rows.forEach(r => console.log('      Lv ' + String(r.L).padStart(3) + ' — 구 ' + (r.oldV * 100).toFixed(0)
      + '% → 신 ' + (r.newV * 100).toFixed(0) + '% (×' + r.x.toFixed(2) + ')'));
    const band = rows.filter(r => r.L <= 100);
    ok(band.every(r => Math.abs(r.x - 3) < 1e-6),
      '★ [F1] 지시 본문 — Lv 1~100 구간이 정확히 ×3', band.map(r => 'Lv' + r.L + ':×' + r.x).join(' · '));
    const at500 = rows[rows.length - 1];
    ok(Math.abs(at500.x - 1500 / 1700) < 1e-3,
      '[F2] 그 대가 — Lv500 은 ×0.88 이다. 등재문 괄호(«Lv500 에서 ≥ ×3»)와 **양립하지 않음**을 여기 못박는다',
      '×' + at500.x + ' (≥×3 을 만족시키려면 RUNE_LIN ≥ 10.2 — 199 이관)');
    /* 사람이 실제로 사는 구간이 Lv0~100 이라는 근거 — 기대 시도수(확률 곡선 그대로) */
    const tries = await ev(p, () => {
      let t = 0; const out = {};
      for (let l = 0; l < 500; l++) { t += 1 / runeRate(l); if (l === 99 || l === 199 || l === 499) out[l + 1] = Math.round(t); }
      return out;
    });
    if (tries) console.log('      기대 시도수 — Lv100 까지 ' + tries[100].toLocaleString()
      + '회 · Lv200 ' + tries[200].toLocaleString() + '회 · Lv500 ' + tries[500].toLocaleString() + '회');
    ok(!!tries && tries[500] > 20 * tries[100],
      '[F3] Lv500 은 Lv100 의 20배 넘는 시도가 필요하다 — «본문(저레벨) 우선» 선택의 근거',
      tries ? '×' + (tries[500] / tries[100]).toFixed(1) : '');
  }

  ok(b.errs.length === 0, '[E9] 콘솔·페이지 에러 0건', b.errs.slice(0, 2).join(' | ') || '없음');
  await b.ctx.close();

  /* ================= [R] 되돌림 시험 ================= */
  blk('[R] 되돌림 — 계단표를 도로 끼운 사본에서 [A] 가 빨개진다');
  {
    const anchor = 'const runeStep1 = (r, k) => (r && r.eff[k] ? r.eff[k] * RUNE_LIN : 0);';
    ok(src.indexOf(anchor) >= 0, '[R0] 되돌림 사본의 앵커가 제품에 있다(없으면 이 절이 공허하다)');
    const revBody = anchor + '\n'
      + 'const RUNE_STEP_EVERY = ' + OLD_EVERY + ';\n'
      + 'const RUNE_STEP = [' + OLD_STEP.join(',') + '];\n';
    let rev = src.replace(anchor, revBody);
    const fnA = 'function runeVal(id, k){\n  const r = RN[id]; if(!r || !r.eff[k]) return 0;\n  return runeStep1(r, k) * runeLvOf(id);\n}';
    const fnB = 'function runeVal(id, k){\n  const r = RN[id]; if(!r || !r.eff[k]) return 0;\n'
      + '  let l = runeLvOf(id), n = 0, seg = 0;\n'
      + '  while(l > 0 && seg < RUNE_STEP.length){ const take = Math.min(l, RUNE_STEP_EVERY);\n'
      + '    n += take * RUNE_STEP[seg]; l -= take; seg++; }\n  return r.eff[k] * n;\n}';
    ok(rev.indexOf(fnA) >= 0, '[R0b] `runeVal` 본문 앵커가 제품에 있다');
    rev = rev.replace(fnA, fnB);
    const tmp = path.resolve(__dirname, '..', '.v489-neg.html');   /* 464·455 관례 — 자산 상대경로가 풀리도록 저장소 안에 */
    fs.writeFileSync(tmp, rev);
    try {
      const b3 = await boot(browser, 'file://' + tmp);
      const t = await gains(b3.page, 'r1', 'atk');
      const flat = !!t && t.g.every(v => Math.abs(v - t.g[0]) < 1e-12);
      ok(!flat, '★ [R1] 계단을 되살린 사본에서는 «차가 상수» 가 **깨진다**(= [A1] 이 헛초록이 아니다)',
        t ? [...new Set(t.g.map(v => v.toFixed(6)))].join(' / ') : '못 읽음');
      const jumped = !!t && t.g.some((v, i) => i > 0 && v > t.g[i - 1] + 1e-12);
      ok(jumped, '[R2] 그 사본은 구 경계에서 실제로 뛴다(되돌림이 제대로 됐다)');
      const rtStep = await ev(b3.page, () => typeof RUNE_STEP);
      ok(rtStep === 'object', '[R3] 사본에는 계단 표가 있다 — [B2] 의 «없다» 가 공허하지 않다', String(rtStep));
      ok(b3.errs.length === 0, '[R4] 사본 경로도 에러 0', b3.errs.slice(0, 2).join(' | ') || '없음');
      await b3.ctx.close();
    } finally { fs.unlinkSync(tmp); }
  }

  await browser.close();
  console.log('\nVERIFY489 ' + (fail ? 'FAIL — ' + fail + '건' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
