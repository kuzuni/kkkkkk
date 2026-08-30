#!/usr/bin/env node
/* 452 검증 — 21 도감 효과문(`.clb-eff`)이 [강화] 버튼(`.clb-btn`)을 파고들지 않는다
 * (T1 «버그», 351 13회차 비평가 3인 독립 보고 → 별개 번호로 등재)
 *
 *   node tools/verify452.js   →  마지막 줄이 `VERIFY452 n/n PASS` 여야 한다.
 *
 * 등재문: «목걸이 탭 효과문 마지막 «0.0%» 잉크가 [강화] 버튼을 10.1px 파고든다.»
 * 재현(`tools/probe452.js`)이 낸 것 — 등재문의 10.1 은 **획을 뺀 Range bbox** 값이고
 * 찍히는 잉크는 획 절반(4.5px)만큼 더 나가 **14.6px** 다. 그리고 그 10.1 은 **부팅값**이라
 * 단계 10 · 만렙 워스트에서는 목걸이 96.9 · 펫 43.1 · 스킬 1.3px 로 **2항 탭 셋 다** 물린다.
 * ⇒ «어느 탭이 2항인가» 표로 막으면 안 되고, 상자를 버튼 앞에서 끊어야 한다(등재문 처방).
 *
 * 검사 항목:
 *   [A] 부팅 세이브 — 6탭 전수 · 모든 블록에서 **잉크 우변 < 버튼 좌변**(두 프레임).
 *   [B] 워스트 — 단계 10 · 세트 전원 만렙(자릿수 최대)에서도 6탭 전수 안 물린다.
 *   [C] 여백 규약 — 눌린 줄의 여백이 **바 자신의 `padding-left` 와 같다**(거울).
 *       새 상수를 안 만들었다는 것을 값으로 못박는다 — 상수가 생기면 이 항이 빨개진다.
 *   [D] 무르게 안 풀었다(음성항) — **안 물리는 탭은 폰트를 한 번도 안 건드린다.**
 *       전부 눌러 버리는 처방이었다면 무기·방패·유물의 인라인 `font-size` 가 붙어 빨개진다.
 *   [E] 잉크 좌변·바 상자·버튼 상자는 **Δ0px** — 레이아웃을 안 옮겼다는 자.
 *   [R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다:
 *       R1 3항 문자열(제품에 아직 없는 길이)을 **아무 탭에나** 주입해도 안 물린다
 *          = 표가 아니라 구조로 막았다.
 *       R2 `collFitEff` 를 걷어낸 사본(인라인 폰트 제거)에서는 **실제로 빨갛다**
 *          = 원래 안 물리던 것을 세고 있는 헛초록이 아니다.
 *       R3 자 자신이 «물림» 을 볼 줄 안다 — 효과문을 억지로 키우면 탐지기가 잡는다.
 *   [H] 콘솔·페이지 에러 0건.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const TABS = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];

/* 페이지 안 측정자 — 찍히는 잉크(Range bbox + `-webkit-text-stroke` 절반)를 프레임 px 로 돌려준다.
   ⚠ 레이아웃 박스를 재면 안 된다(340 교훈 — 게이트가 초록이던 이유가 그것이었다). */
const MEASURE = `(() => {
  const app = document.getElementById('app');
  const ar = app.getBoundingClientRect();
  const sc = ar.width / app.offsetWidth;
  const fx = (v) => (v - ar.left) / sc;
  const out = [];
  document.querySelectorAll('#collList .clb').forEach((b, i) => {
    const eff = b.querySelector('.clb-eff'), btn = b.querySelector('.clb-btn');
    if (!eff || !btn) return;
    const cs = getComputedStyle(eff);
    const sw = parseFloat(cs.webkitTextStrokeWidth) || 0;
    const rg = document.createRange(); rg.selectNodeContents(eff);
    const r = rg.getBoundingClientRect(), bb = btn.getBoundingClientRect();
    if (!r.width) return;
    out.push({ i, txt: eff.textContent,
      fs: +(parseFloat(cs.fontSize)).toFixed(2),
      inline: eff.style.fontSize || '',
      padL: parseFloat(cs.paddingLeft) || 0,
      inkL: +(fx(r.left) - sw / 2).toFixed(2), inkR: +(fx(r.right) + sw / 2).toFixed(2),
      btnL: +fx(bb.left).toFixed(2), btnR: +fx(bb.right).toFixed(2),
      barL: +fx(eff.getBoundingClientRect().left).toFixed(2),
      barR: +fx(eff.getBoundingClientRect().right).toFixed(2),
      gap: +(fx(bb.left) - fx(r.right) - sw / 2).toFixed(2) });
  });
  return out;
})()`;

/* ⚠ 60 쥬시가 블록(`.clb`)에 **등장 스케일**을 건다 — 그린 직후에 재면 같은 블록이
   760.7 ~ 832.55px 로 흔들려 프레임 좌표가 통째로 어긋난다(자를 짜다 실제로 겪었다).
   `.clb` 의 그려진 폭이 선언 폭(818)으로 돌아올 때까지 기다린 뒤에 잰다. */
const settle = async (page) => {
  await page.waitForFunction(() => {
    const bs = [...document.querySelectorAll('#collList .clb')];
    return bs.length > 0 && bs.every((b) => Math.abs(b.getBoundingClientRect().width - b.offsetWidth) < 0.6);
  }, null, { timeout: 5000 }).catch(() => {});
};
const scan = async (page, tab) => {
  await page.evaluate((t) => { collTab = t; renderColl21(); }, tab);
  await settle(page);
  return page.evaluate(MEASURE);
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];

  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errs.push(H + ':' + m.text()); });
    page.on('pageerror', (e) => errs.push(H + ':' + String(e)));
    await page.goto(URL);
    await page.waitForTimeout(900);
    console.log('\n──────── 프레임 1080×' + H + ' ────────');

    const opened = await page.evaluate(() => {
      const b = document.querySelector('.side .ibtn[data-pop="coll"]');
      if (!b) return false;
      b.click();
      return !!document.querySelector('#collw.on .clb');
    });
    await settle(page);
    ok(opened, 'A0 도감 팝업이 살아 있는 문(`.side .ibtn[data-pop="coll"]`)으로 열린다 [' + H + ']');
    if (!opened) { await ctx.close(); continue; }

    /* ── [A] 부팅 세이브 · 6탭 전수 ─────────────────────────────────── */
    const boot = {};
    let bad = [];
    for (const t of TABS) {
      const rows = await scan(page, t);
      boot[t] = rows;
      rows.forEach((r) => { if (r.inkR >= r.btnL) bad.push(t + '#' + r.i + ' ' + r.inkR + '≥' + r.btnL); });
    }
    const nBlk = TABS.reduce((n, t) => n + boot[t].length, 0);
    ok(bad.length === 0, 'A1 부팅 세이브 — 6탭 ' + nBlk + '블록 전수 «잉크 우변 < 버튼 좌변» [' + H + ']',
      bad.length ? bad.slice(0, 4).join(' / ') : '겹침 0건');
    /* 등재문의 자리 — 목걸이가 여전히 «가장 아슬아슬한» 탭인지도 같이 본다(자가 눈을 감지 않았다) */
    const worstGap = TABS.map((t) => ({ t, g: Math.min.apply(null, boot[t].map((r) => r.gap)) }))
      .sort((a, b) => a.g - b.g)[0];
    ok(worstGap.g > 0, 'A2 가장 아슬아슬한 탭도 여유가 남는다 [' + H + ']',
      worstGap.t + ' 여유 ' + worstGap.g + 'px');

    /* ── [C] 여백 규약 — 눌린 줄의 여백 = 바 좌측 여백 ─────────────── */
    const fitted = TABS.flatMap((t) => boot[t].filter((r) => r.inline)).slice(0, 3);
    if (H === 2280) {
      ok(fitted.length > 0, 'C1 부팅 세이브에서 실제로 눌린 줄이 있다(자가 빈 상태를 세는 게 아니다)',
        fitted.length + '줄');
      const cbad = fitted.filter((r) => !near(r.gap, r.padL, 1.2));
      ok(cbad.length === 0, 'C2 눌린 줄의 버튼 앞 여백 = 바 좌측 여백(거울 · 새 상수 0개)',
        fitted.map((r) => r.gap + '↔' + r.padL).join(' / '));
    }

    /* ── [D] 음성항 — 안 물리는 탭은 폰트를 안 건드린다 ─────────────── */
    const untouched = ['weapon', 'shield', 'relic'];
    const touched = untouched.filter((t) => boot[t].some((r) => r.inline));
    ok(touched.length === 0, 'D1 안 물리는 탭(무기·방패·유물)은 인라인 폰트가 0건 [' + H + ']',
      touched.length ? touched.join(',') : '무기·방패·유물 전부 원본 38px');
    const fsBad = untouched.flatMap((t) => boot[t]).filter((r) => !near(r.fs, 38, 0.01));
    ok(fsBad.length === 0, 'D2 그 탭들의 실제 폰트가 CSS 값 38px 그대로 [' + H + ']',
      fsBad.length ? fsBad.map((r) => r.fs).join(',') : '38px');

    /* ── [E] 레이아웃 Δ0 — 잉크 좌변·바·버튼 상자 ───────────────────── */
    const e0 = boot.weapon[0];
    ok(near(e0.barL, 130.5, 1) && near(e0.barR, 948.5, 1),
      'E1 효과 바 상자가 측정표 값 그대로다(130.5..948.5) [' + H + ']', e0.barL + '..' + e0.barR);
    ok(near(e0.btnL, 716.5, 4) && near(e0.btnR, 955.5, 4),
      'E2 [강화] 버튼 상자가 측정표 값 그대로다(716.5..955.5) [' + H + ']', e0.btnL + '..' + e0.btnR);
    const inkLbad = TABS.flatMap((t) => boot[t]).filter((r) => !near(r.inkL, e0.inkL, 1.0));
    ok(inkLbad.length === 0, 'E3 효과문 잉크 «좌변» 은 모든 블록에서 같다(왼쪽으로 안 밀었다) [' + H + ']',
      inkLbad.length ? inkLbad.slice(0, 3).map((r) => r.inkL).join(',') : e0.inkL + 'px');

    /* ── [B] 워스트 — 단계 10 · 세트 전원 만렙 ──────────────────────── */
    let wbad = [], wTxt = '';
    for (const t of TABS) {
      await page.evaluate((tab) => {
        COLL_SETS.filter((st) => st.tab === tab).forEach((st) => {
          st.it.forEach((id) => { S.own[id] = S.own[id] || { l: 0, n: 0 }; S.own[id].l = COLL_MAX_STEP; });
          S.coll[st.key] = COLL_MAX_STEP;
        });
      }, t);
      const rows = await scan(page, t);
      rows.forEach((r) => { if (r.inkR >= r.btnL) wbad.push(t + '#' + r.i + ' ' + r.inkR + '≥' + r.btnL); });
      if (t === 'amulet') wTxt = (rows[rows.length - 1] || {}).txt || '';
    }
    ok(wbad.length === 0, 'B1 워스트(단계 10 · 만렙) — 6탭 전수 안 물린다 [' + H + ']',
      wbad.length ? wbad.slice(0, 4).join(' / ') : '겹침 0건 · 목걸이 워스트 「' + wTxt + '」');

    /* ── [R] 되돌림 시험 ─────────────────────────────────────────────── */
    if (H === 2280) {
      console.log('\n[R] 되돌림 시험');
      /* R1 — 3항 문자열을 «아무 탭에나» 주입해도 안 물린다 = 표가 아니라 구조로 막았다.
         제품 데이터에 3항 세트는 아직 없다. 표(«목걸이만») 로 막은 처방이었으면 여기서 빨개진다. */
      const r1 = await page.evaluate(() => {
        const before = COLL_BASE.weapon;
        COLL_BASE.weapon = { atk: 0.020, hp: 0.020, gold: 0.010 };
        /* COLL_SETS 는 부팅 때 한 번 지어진다 — 세트의 eff 를 직접 갈아 끼운다(표를 안 다시 짓는다) */
        const saved = [];
        COLL_SETS.filter((st) => st.tab === 'weapon').forEach((st) => {
          saved.push([st, st.eff]);
          st.eff = { atk: 0.020 * st.mul, hp: 0.020 * st.mul, gold: 0.010 * st.mul };
        });
        collTab = 'weapon'; renderColl21();
        const app = document.getElementById('app'), ar = app.getBoundingClientRect();
        const sc = ar.width / app.offsetWidth, fx = (v) => (v - ar.left) / sc;
        const out = [];
        document.querySelectorAll('#collList .clb').forEach((b) => {
          const eff = b.querySelector('.clb-eff'), btn = b.querySelector('.clb-btn');
          const sw = parseFloat(getComputedStyle(eff).webkitTextStrokeWidth) || 0;
          const rg = document.createRange(); rg.selectNodeContents(eff);
          out.push({ txt: eff.textContent,
            over: +(fx(rg.getBoundingClientRect().right) + sw / 2 - fx(btn.getBoundingClientRect().left)).toFixed(2),
            /* 누르기 전(raw) 값 — 정말 «넘칠 문자열» 을 준 것인지 같이 확인한다 */
            raw: (() => { const k = eff.style.fontSize; eff.style.fontSize = '';
              const rg2 = document.createRange(); rg2.selectNodeContents(eff);
              const v = +(fx(rg2.getBoundingClientRect().right) + sw / 2 - fx(btn.getBoundingClientRect().left)).toFixed(2);
              eff.style.fontSize = k; return v; })() });
        });
        saved.forEach(([st, eff]) => { st.eff = eff; });
        COLL_BASE.weapon = before;
        collTab = 'weapon'; renderColl21();
        return out;
      });
      const r1w = r1.reduce((a, b) => (b.over > a.over ? b : a), r1[0]);
      const r1raw = r1.reduce((a, b) => (b.raw > a.raw ? b : a), r1[0]);
      ok(r1raw.raw > 0, 'R1a 주입한 3항 문자열은 누르지 않으면 실제로 넘친다(빈 시험이 아니다)',
        'raw +' + r1raw.raw + 'px 「' + r1raw.txt + '」');
      ok(r1w.over < 0, 'R1b 그 3항 문자열도 **무기 탭에서** 안 물린다 = 표가 아니라 구조로 막았다',
        '여유 ' + (-r1w.over).toFixed(2) + 'px');

      /* R2 — `collFitEff` 의 결과(인라인 폰트)를 걷어내면 목걸이가 **실제로 빨갛다** */
      const r2 = await page.evaluate(() => {
        collTab = 'amulet'; renderColl21();
        const app = document.getElementById('app'), ar = app.getBoundingClientRect();
        const sc = ar.width / app.offsetWidth, fx = (v) => (v - ar.left) / sc;
        const m = () => {
          let w = -1e9;
          document.querySelectorAll('#collList .clb').forEach((b) => {
            const eff = b.querySelector('.clb-eff'), btn = b.querySelector('.clb-btn');
            const sw = parseFloat(getComputedStyle(eff).webkitTextStrokeWidth) || 0;
            const rg = document.createRange(); rg.selectNodeContents(eff);
            w = Math.max(w, fx(rg.getBoundingClientRect().right) + sw / 2 - fx(btn.getBoundingClientRect().left));
          });
          return +w.toFixed(2);
        };
        const withFit = m();
        const keeps = [];
        document.querySelectorAll('#collList .clb-eff').forEach((e) => { keeps.push([e, e.style.fontSize]); e.style.fontSize = ''; });
        const without = m();
        keeps.forEach(([e, v]) => { e.style.fontSize = v; });
        return { withFit, without, back: m() };
      });
      ok(r2.without > 0 && r2.withFit < 0,
        'R2 `collFitEff` 를 걷어낸 사본은 실제로 빨갛다(헛초록 아님)',
        '누름 ' + r2.withFit + 'px → 걷어냄 +' + r2.without + 'px → 원복 ' + r2.back + 'px');
      ok(near(r2.back, r2.withFit, 0.05), 'R2b 원복하면 도로 초록이다', r2.back + 'px');

      /* R3 — 자 자신이 «물림» 을 볼 줄 안다(양성 대조) */
      const r3 = await page.evaluate(() => {
        const app = document.getElementById('app'), ar = app.getBoundingClientRect();
        const sc = ar.width / app.offsetWidth, fx = (v) => (v - ar.left) / sc;
        const eff = document.querySelector('#collList .clb-eff'), btn = eff.closest('.clb').querySelector('.clb-btn');
        const keep = eff.style.fontSize;
        eff.style.fontSize = '120px';
        const sw = parseFloat(getComputedStyle(eff).webkitTextStrokeWidth) || 0;
        const rg = document.createRange(); rg.selectNodeContents(eff);
        const over = +(fx(rg.getBoundingClientRect().right) + sw / 2 - fx(btn.getBoundingClientRect().left)).toFixed(2);
        eff.style.fontSize = keep;
        return over;
      });
      ok(r3 > 0, 'R3 자가 «물림» 을 볼 줄 안다 — 억지로 키우면 +' + r3 + 'px 로 잡힌다');
    }

    await ctx.close();
  }

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  const line = 'VERIFY452 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
