#!/usr/bin/env node
/* 761 게이트 — «상단 토스트가 열린 팝업의 이름표를 가리지 않는다»
 *
 *   node tools/verify761.js
 *
 * 761 은 «토스트를 어디에 그리는가» 가 아니라 **두 앵커의 화해**다:
 *   토스트 top 은 프레임과 무관한 상수(143), 시트는 하단 앵커 ⇒ 짧은 프레임에서 시트가 그 자리로 올라온다.
 * 그래서 이 자는 **양성항과 음성항을 같이** 묻는다 —
 *   [1]·[2] 이름표를 가리면 빨강(짧은 프레임 · 팝업 4종)
 *   [3] **가리지 않는 자리는 한 픽셀도 안 움직인다**(2280 · 팝업 없음 · 리스트형 화면 두 곳)
 *       ⚠ 이 절이 없으면 «전부 위로 올려 버리는» 무른 수리가 초록으로 통과한다.
 *       03 던전 리스트(top 146)·13 상점 리스트(top 104)는 **두 프레임 모두** 토스트 띠에 있고
 *       그건 오늘의 정상 그림이다 — 상자 겹침을 축으로 삼으면 그 두 화면이 같이 움직인다.
 *   [4] 스택(2·3장)에서도 이름표 겹침 0 · [5] 어떤 경우에도 프레임 밖으로 안 나간다
 *   §R 되돌림 시험 — 자리 계산을 옛 상수식으로 되돌린 사본 · 이름표 목록을 비운 사본이
 *       **각각** [1] 을 붉힌다(무르게 푼 수리가 아님을 못박는다).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const CUR = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 이 자가 보는 «이름표» — 제품의 `FX_TOAST_TITLES` 와 같은 뜻을 **따로** 적는다.
   (제품 상수를 그대로 읽으면 목록이 비어도 초록이 된다 — §R2 가 그 자리를 지킨다) */
const TITLES = '#trw .tr-head, #eqw .eqp-ti, .sk-head, #sumw .sm-band, #modal .mhead';

const open = async (browser, url, h) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof fxToast === 'function');
  await page.waitForTimeout(900);
  return { ctx, page, errs };
};

/* 화면 상태 — 라벨 → 여는 손짓. 팝업이 없는 «부팅» 과 리스트형 두 곳이 음성항이다. */
const STATES = {
  '없음(부팅)':      async () => {},
  '23 훈련':         async p => { await p.click('.tab[data-t="grow"]', { force: true }); },
  '06 장비':         async p => { await p.click('.tab[data-t="hero"]', { force: true }); },
  '03 던전(리스트)': async p => { await p.click('.tab[data-t="adv"]', { force: true }); },
  '13 상점(리스트)': async p => { await p.click('.tab[data-t="shop"]', { force: true }); },
  '12 소환 결과':    async p => { await p.evaluate(() => {
      S.dia = 1e12;
      const res = [], seen = new Set();
      for (let i = 0; i < 4000 && res.length < 10; i++) {
        const r = summonOne('weapon');
        if (!r || !r.it || seen.has(r.it.id)) continue;
        seen.add(r.it.id); res.push(r);
      }
      showSummonResult('weapon', res.length, res, false);
    }); },
  'A5 모달':         async p => { await p.evaluate(() => popup('알림', '<p>표본</p>')); }
};

/* n 장을 띄우고 **정착 뒤**(등장 애니 25% = 190ms) 잰다. 이름표와의 겹침을 장마다 돌려준다. */
const shoot = async (page, n) => {
  await page.evaluate((k) => {
    window.__t761 = [];
    for (let i = 0; i < k; i++) window.__t761.push(fxToast('⚔️ 전투력 <b>+1,234</b>'));
  }, n);
  await page.waitForTimeout(320);
  return page.evaluate((SEL) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const tt = [];
    document.querySelectorAll(SEL).forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
      if (el.offsetParent === null && cs.position !== 'fixed') return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      tt.push({ sel: el.className, top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2) });
    });
    return (window.__t761 || []).filter(Boolean).map(el => {
      const r = el.getBoundingClientRect();
      let ov = 0, who = null;
      tt.forEach(t => {
        const o = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
        if (o > ov) { ov = o; who = t.sel; }
      });
      return {
        cssTop: +parseFloat(getComputedStyle(el).top).toFixed(2),
        top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2),
        inFrame: r.top >= app.top - 0.5 && r.bottom <= app.bottom + 0.5,
        ov: +Math.max(0, ov).toFixed(2), who, titles: tt.length
      };
    });
  }, SEL_TITLES());
};
function SEL_TITLES() { return TITLES; }

const run = async (browser, url, h, label, n = 1) => {
  const { ctx, page, errs } = await open(browser, url, h);
  await STATES[label](page);
  await page.waitForTimeout(520);
  const got = await shoot(page, n);
  await ctx.close();
  return { got, errs };
};

/* 되돌림 사본 — 제품 소스에서 한 자리만 갈아 임시 파일로 띄운다 */
const variant = (tag, from, to) => {
  const src = fs.readFileSync(SRC, 'utf8');
  if (src.indexOf(from) < 0) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify761-' + tag + '-'));
  fs.writeFileSync(path.join(dir, 'index.html'), src.replace(from, to));
  return { dir, url: 'file://' + path.join(dir, 'index.html').replace(/\\/g, '/') };
};

(async () => {
  const browser = await launch(chromium);
  const tmps = [];

  /* ── [1] 짧은 프레임(1600) — 이름표를 가리지 않는다 ────────────────────── */
  console.log('\n[1] 1080×1600 — 열린 팝업의 이름표 겹침 0');
  for (const label of ['23 훈련', '06 장비', '12 소환 결과', 'A5 모달']) {
    const { got, errs } = await run(browser, CUR, 1600, label);
    const t = got[0];
    ok(!!t, '[1-' + label + '] 토스트가 떴다', t ? t.top + '..' + t.bottom : '없음');
    if (t) {
      ok(t.titles > 0, '[1-' + label + '] 이름표가 보인다(전제 — 0 이면 이 항은 헛초록이다)',
        t.titles + '개');
      ok(t.ov === 0, '[1-' + label + '] 이름표 겹침 0px',
        t.ov + 'px' + (t.who ? ' (' + t.who + ')' : '') + ' · 토스트 ' + t.top + '..' + t.bottom);
      ok(t.inFrame, '[1-' + label + '] 토스트가 프레임 안', t.top + '..' + t.bottom);
    }
    ok(errs.length === 0, '[1-' + label + '] 콘솔 에러 0', errs.join(' | ') || '0건');
  }

  /* ── [2] 긴 프레임(2280) — 같은 화면에서도 겹침 0 ──────────────────────── */
  console.log('\n[2] 1080×2280 — 같은 화면 겹침 0');
  for (const label of ['23 훈련', '12 소환 결과']) {
    const { got } = await run(browser, CUR, 2280, label);
    ok(got[0] && got[0].ov === 0, '[2-' + label + '] 이름표 겹침 0px',
      got[0] ? got[0].ov + 'px · 토스트 ' + got[0].top + '..' + got[0].bottom : '토스트 없음');
  }

  /* ── [3] Δ0px — 가리지 않는 자리는 안 움직인다 ────────────────────────── */
  console.log('\n[3] Δ0px — 이름표를 안 가리는 자리는 종전 그대로(CSS top 143)');
  for (const h of [1600, 2280]) {
    for (const label of ['없음(부팅)', '03 던전(리스트)', '13 상점(리스트)']) {
      const { got } = await run(browser, CUR, h, label);
      ok(got[0] && got[0].cssTop === 143, '[3-' + h + '/' + label + '] CSS top 143 불변',
        got[0] ? String(got[0].cssTop) : '토스트 없음');
    }
  }
  {
    const { got } = await run(browser, CUR, 2280, '23 훈련');
    ok(got[0] && got[0].cssTop === 143, '[3-2280/23 훈련] 긴 프레임은 팝업이 열려도 종전 자리',
      got[0] ? String(got[0].cssTop) : '토스트 없음');
  }

  /* ── [4] 스택 ─────────────────────────────────────────────────────────── */
  console.log('\n[4] 스택 — 여러 장이 떠도 이름표 겹침 0 · 프레임 안');
  {
    const { got } = await run(browser, CUR, 1600, '23 훈련', 3);
    ok(got.length >= 2, '[4-a] 두 장 이상 떴다', got.length + '장');
    ok(got.every(t => t.ov === 0), '[4-b] 모든 장이 이름표 겹침 0px',
      got.map(t => t.ov).join(' · '));
    ok(got.every(t => t.inFrame), '[4-c] 모든 장이 프레임 안',
      got.map(t => t.top + '..' + t.bottom).join(' · '));
    const tops = got.map(t => t.cssTop);
    ok(new Set(tops).size === tops.length, '[4-d] 장끼리 같은 자리에 안 겹쳐 쌓인다', tops.join(' · '));
    /* 자리를 옮긴 장이 종전 자리의 장 위에 포개지는지 — «겹침 0» 은 이름표뿐 아니라 서로에게도다 */
    const srt = got.slice().sort((a, b) => a.top - b.top);
    let piled = null;
    for (let i = 1; i < srt.length; i++) if (srt[i].top < srt[i - 1].bottom) piled = srt[i - 1].top + '..' + srt[i - 1].bottom + ' ↔ ' + srt[i].top + '..' + srt[i].bottom;
    ok(!piled, '[4-e] 장끼리 상자가 안 포개진다', piled || srt.map(t => t.top.toFixed(0) + '..' + t.bottom.toFixed(0)).join(' · '));
  }

  /* ── §R 되돌림 시험 ───────────────────────────────────────────────────── */
  console.log('\n§R 되돌림 시험 — 수리를 빼면 각각 다른 이유로 빨개진다');
  const R1 = variant('r1', 'function fxToastTop(stack, h, L, self){\n  const base',
    'function fxToastTop(stack, h, L, self){\n  return FX_TOAST_TOP + stack * FX_TOAST_PITCH;\n  const base');
  if (R1) {
    tmps.push(R1.dir);
    const { got } = await run(browser, R1.url, 1600, '23 훈련');
    ok(got[0] && got[0].ov > 0, '[R1] 자리 계산을 옛 상수식으로 되돌리면 이름표가 가려진다',
      got[0] ? got[0].ov + 'px (' + got[0].who + ')' : '토스트 없음');
  } else ok(false, '[R1] 되돌림 사본을 못 만들었다(앵커 문자열 불일치)', 'fxToastTop');

  const R2 = variant('r2', "const FX_TOAST_TITLES = '#trw .tr-head",
    "const FX_TOAST_TITLES = '.__none761__, #__none761__ .tr-head");
  if (R2) {
    tmps.push(R2.dir);
    const { got } = await run(browser, R2.url, 1600, '23 훈련');
    ok(got[0] && got[0].ov > 0, '[R2] 이름표 목록이 비면 가려진다 — 목록이 이 수리의 실체다',
      got[0] ? got[0].ov + 'px (' + got[0].who + ')' : '토스트 없음');
  } else ok(false, '[R2] 되돌림 사본을 못 만들었다(앵커 문자열 불일치)', 'FX_TOAST_TITLES');

  await browser.close();
  tmps.forEach(d => fs.rmSync(d, { recursive: true, force: true }));
  console.log('\nVERIFY761 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
