/* 작업 241 회귀 게이트 — 19 프로필 팝업이 9:16(frameH 1600)에서 바닥 227px 잘림 (T1 버그).
   실행: node tools/verify241.js   → 마지막 줄이 `VERIFY241 n/n PASS` 여야 한다.

   증상(등재 실측 · `verify201` §8): `.pf{top:431px;height:1396px}` → 431+1396 = **1827** 인데
   `fit()` 의 frameH 는 짧은 기기에서 **1600 으로 clamp** 된다. 바닥 227px 이 프레임 밖이라
   «장착 중» 버튼(패널 local +1105..1224)과 하단 토글(+1261..1356)이 **통째로 안 보였다.**

   처방: `.pf{top:clamp(104px, 431px, calc(100% - 1427px))}` — 값이 아니라 **상한**이다.
     · 최대값 `100% − 1427`(=1396 패널 + **31** 여유): 2280 → 853 · 1920 → 493 → 둘 다 431 이 이긴다.
       **기준 프레임 기하는 한 픽셀도 안 바뀐다**(19 는 ①~④ 8점 통과 화면).
       1600 → 173 이라 이때만 258px 위로 붙는다.
       ⚑ 여유 8 → **31** 은 작업 391(2026-08-29)이 바꿨다 — 8 은 «프레임 안에 넣기» 만 보고 고른 값이라
         1600 에서 패널이 바닥에 붙어 흘러내리는 것처럼 읽혔다. 31 = (1458 − 1396) ÷ 2 =
         쓸 수 있는 띠(HUD 잉크 142 .. 프레임 끝)의 남는 62px 의 절반 ⇒ **1600 에서 위 = 아래 = 31**.
     · 최소값 104px: 상단 HUD(0..104) 가드.

   같이 고친 것 — `tools/smoke.js` 의 «바닥 시트 잘림» 후보 목록이 **오버레이**(`#pfw{inset:0}` 등
   항상 프레임과 같은 크기)를 재고 있어 이 결함이 원리적으로 안 걸렸다(189-③ «헛초록»).
   껍데기 8개를 안쪽 박스로 갈아 끼웠다. 전수 확인은 `node tools/audit241.js`(읽기 전용).

   본다:
     §1 화면비 4종 — 1920·2280·2600 은 top **431 불변**, 1600 만 196. 네 경우 다 프레임 안.
     §2 원 증상 — «장착 중» 버튼 `.pf-btn` · 하단 토글 `.pf-tgl` 이 4종 전부 프레임 안.
     §3 기준 프레임(2280) 불변 — `.pf` 와 자식 5종의 프레임 좌표가 수정 전 값 그대로.
        (패널 local 좌표가 그대로인지도 같이 본다 — 상한이 자식 앵커를 밀면 여기서 잡힌다)
     §4 1600 에서 실제로 **눌린다** — 두 요소가 hit-test 최상단이고, 토글 클릭 → 20 스펙 팝업 전환.
     §5 소스 — smoke 후보 목록에 «맨 오버레이» 가 없고 안쪽 박스가 들어 있다.
     §6 음성항 — 갈아 끼운 사본(`.v241-neg.html`)을 **새로 열어** 재면 1600 바닥 +227 이 복원되고,
        smoke 와 같은 자(후보 = 안쪽 박스)가 그 사본에서 실제로 **빨개진다.**
        (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191) */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SMOKE = fs.readFileSync(path.join(__dirname, 'smoke.js'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* smoke.js 의 «시트 잘림» 판정과 **같은 자**. 후보 목록도 smoke 소스에서 그대로 뽑아 쓴다 —
   목록이 다시 오버레이로 되돌아가면 §6 이 초록이 돼 버리므로 여기서 읽는 것이 중요하다. */
const CANDS = (SMOKE.match(/const cands = \[\.\.\.document\.querySelectorAll\('([^']+)'\)\]/) || [])[1] || '';
const CUT = `(function(sel){
  const app = document.getElementById('app'); if(!app) return 'no #app';
  const A = app.getBoundingClientRect();
  const out = [];
  for(const e of document.querySelectorAll(sel)){
    if(!(e.offsetParent !== null || getComputedStyle(e).position === 'fixed')) continue;
    const cs = getComputedStyle(e);
    if(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0) continue;
    const r = e.getBoundingClientRect(); if(!r.width || !r.height) continue;
    if(r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5)
      out.push((e.id || e.className) + ' top ' + Math.round(r.top - A.top) + ' bottom ' + Math.round(r.bottom - A.bottom));
  }
  return out;
})`;

/* 프로필을 연 뒤 재는 값 한 벌 */
const MEAS = `(function(){
  openProfile();
  void document.body.offsetHeight;
  const A = document.getElementById('app').getBoundingClientRect();
  const pf = document.querySelector('#pfw .pf');
  const P = pf.getBoundingClientRect();
  const box = (s) => { const e = document.querySelector(s); if(!e) return null;
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.bottom),
             lx: Math.round(r.left - P.left), ly: Math.round(r.top - P.top),
             w: Math.round(r.width), h: Math.round(r.height) }; };
  return {
    frameH: Math.round(A.height),
    pf:    box('#pfw .pf'),
    btn:   box('#pfw .pf-btn'),
    tgl:   box('#pfw .pf-tgl'),
    grid:  box('#pfw .pf-grid'),
    tab:   box('#pfw .pf-tab'),
    por:   box('#pfw .pf-por'),
    msn:   box('#pfw .pf-msn'),
  };
})`;

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL); await p.waitForTimeout(900);

  /* ── §1 화면비 4종 — 상한은 짧은 프레임에서만 걸린다 ── */
  console.log('§1 화면비 4종 — top 431 불변 · 1600 만 올라간다 · 전부 프레임 안');
  const M = {};
  for (const h of [1600, 1920, 2280, 2600]) {
    await p.setViewportSize({ width: 1080, height: h });
    await p.waitForTimeout(350);
    M[h] = await p.evaluate(MEAS + "()");
    eq(`[${h}] frameH`, M[h].frameH, h);
  }
  for (const h of [1920, 2280, 2600]) eq(`[${h}] .pf top 431 불변`, M[h].pf.top, 431);
  /* 작업 391(2026-08-29) 이관 — 상한의 «여유» 가 8 → 31 로 바뀌었다(1404 → 1427).
     ⚠ 숫자만 196 → 173 으로 갈아 끼우면 «상한이 통째로 사라져도 초록» 인 자가 되지는 않지만
     «왜 173 인가» 를 아무도 안 묻는 자가 된다(LESSONS 328-330 의 «누른 항을 묻는 항»).
     그래서 값 항 옆에 **유도 항**을 나란히 둔다 — 여유는 상수가 아니라
     «쓸 수 있는 띠(HUD 잉크 142 .. 프레임 끝)의 남는 62px 의 절반» 이다. */
  eq('[1600] .pf top = 상한 173 (= 1600 − 1396 − 31)', M[1600].pf.top, 173);
  eq('[1600] .pf 아래 여백 31 (= 프레임 끝 − 바닥)', -M[1600].pf.bot, 31);
  eq('[1600] 위 여백(= top − HUD 잉크 142) = 아래 여백 31', M[1600].pf.top - 142, 31);
  for (const h of [1600, 1920, 2280, 2600]) {
    ok(M[h].pf.bot <= 1.5, `[${h}] .pf 바닥이 프레임 안 (프레임 밖 ${Math.max(0, M[h].pf.bot)}px)`);
    ok(M[h].pf.top >= 104, `[${h}] .pf 상단이 HUD(104) 아래 (top ${M[h].pf.top})`);
  }
  /* 수정 전에는 바로 이 값이 227 이었다 — 표에 남긴다(233-③) */
  console.log('      · [1600] 수정 전 이 값이 +227 이었다 → 지금 ' + M[1600].pf.bot);

  /* ── §2 원 증상 — 버튼·토글이 안 보이던 것 ── */
  console.log('§2 «장착 중» 버튼 · 하단 토글이 4종 전부 프레임 안');
  for (const h of [1600, 1920, 2280, 2600]) {
    ok(M[h].btn.bot <= 1.5 && M[h].btn.top >= 0, `[${h}] .pf-btn 프레임 안 (top ${M[h].btn.top} · 바닥 ${M[h].btn.bot})`);
    ok(M[h].tgl.bot <= 1.5 && M[h].tgl.top >= 0, `[${h}] .pf-tgl 프레임 안 (top ${M[h].tgl.top} · 바닥 ${M[h].tgl.bot})`);
  }

  /* ── §3 기준 프레임(2280) 기하 불변 ── */
  console.log('§3 기준 프레임 2280 — 수정 전 좌표 그대로 (19 는 ①~④ 8점 통과 화면)');
  const WANT2280 = { pf: 431, btn: 1536, tgl: 1692, grid: 901, tab: 833, por: 511, msn: 1457 };
  for (const k of Object.keys(WANT2280)) eq(`[2280] ${k} 프레임 top`, M[2280][k].top, WANT2280[k]);
  eq('[2280] .pf 크기', `${M[2280].pf.w}×${M[2280].pf.h}`, '896×1396');
  /* 패널 local — 상한이 자식 앵커를 밀지 않았는가(LESSONS 189-①) */
  const LOCAL = { btn: 1105, tgl: 1261, grid: 470, tab: 402, por: 80, msn: 1026 };
  for (const h of [1600, 1920, 2280, 2600])
    for (const k of Object.keys(LOCAL))
      eq(`[${h}] ${k} 패널 local y (자식 앵커 불변)`, M[h][k].ly, LOCAL[k]);

  /* ── §4 1600 에서 실제로 눌린다 ── */
  console.log('§4 1600 — 두 요소가 hit-test 최상단이고 토글이 실제로 동작한다');
  await p.setViewportSize({ width: 1080, height: 1600 });
  await p.waitForTimeout(350);
  const hit = await p.evaluate(() => {
    openProfile(); void document.body.offsetHeight;
    const at = (sel) => { const r = document.querySelector(sel).getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!(e && (e.matches(sel) || e.closest(sel))); };
    return { btn: at('#pfw .pf-btn'), lb: at('#pfw .pf-tgl>.lb') };
  });
  ok(hit.btn, '[1600] «장착 중» 버튼이 실제 클릭 지점에서 잡힌다');
  ok(hit.lb, '[1600] 하단 토글 «종합 스탯» 라벨이 실제 클릭 지점에서 잡힌다');
  const sw = await p.evaluate(async () => {
    const r = document.querySelector('#pfw .pf-tgl>.lb').getBoundingClientRect();
    document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click();
    await new Promise(z => setTimeout(z, 250));
    return { spec: document.getElementById('specw').classList.contains('on'),
             prof: document.getElementById('pfw').classList.contains('on') };
  });
  ok(sw.spec && !sw.prof, `[1600] 토글 클릭 → 20 스펙 팝업으로 전환 (spec ${sw.spec} · prof ${sw.prof})`);

  /* ── §5 소스 — smoke 후보 목록 ── */
  console.log('§5 smoke 후보 목록 = 오버레이가 아니라 안쪽 박스');
  ok(CANDS.length > 0, 'smoke.js 에서 후보 목록을 읽었다');
  for (const bad of ['#pfw', '#specw', '#ciw', '#trw', '#eqw', '#relw', '#shopw', '#dunw'])
    ok(!new RegExp('(^|,\\s*)' + bad + '\\s*(,|$)').test(CANDS), `후보에 맨 오버레이 ${bad} 가 없다`);
  for (const good of ['#pfw .pf', '#specw .spc', '#ciw .ci', '#trw .tr-sheet', '#eqw .eqp',
                      '#relw .rw-grid', '#shopw .shp-list', '#dunw .dns-list'])
    ok(CANDS.includes(good), `후보에 안쪽 박스 ${good} 가 있다`);
  ok(/clamp\(104px,\s*431px,\s*calc\(100% - 1427px\)\)/.test(SRC), 'index.html 에 .pf top 상한이 있다 (391: 여유 8 → 31)');

  /* ── §6 음성항 — 갈아 끼운 사본을 새로 열어서 잰다 ── */
  console.log('§6 음성항 — 옛 규칙 사본에서 227px 이 되살아나고 smoke 자가 빨개진다');
  const negPath = path.join(ROOT, '.v241-neg.html');
  const neg = SRC.replace('top:clamp(104px, 431px, calc(100% - 1427px));', 'top:431px;');
  ok(neg !== SRC, '사본에서 상한을 옛 고정값으로 되돌렸다');
  fs.writeFileSync(negPath, neg);
  try {
    const nctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const np = await nctx.newPage();
    await np.goto('file://' + negPath); await np.waitForTimeout(900);
    const nm = await np.evaluate(MEAS + "()");
    eq('[음성 1600] 옛 규칙이면 .pf top 431 로 돌아온다', nm.pf.top, 431);
    eq('[음성 1600] 옛 규칙이면 바닥 227px 이 프레임 밖', nm.pf.bot, 227);
    ok(nm.btn.bot > 1.5 && nm.tgl.bot > 1.5, `[음성 1600] «장착 중»·토글이 프레임 밖 (${nm.btn.bot} · ${nm.tgl.bot})`);
    /* 60 쥬시 개봉 연출(`jz-*` scale)이 도는 중에 재면 상자가 줄어든 순간이 잡힌다 —
       연출이 끝난 뒤에 잰다(smoke 의 같은 가드와 같은 이유). */
    await np.waitForTimeout(800);
    const ncut = await np.evaluate(`(${CUT})(${JSON.stringify(CANDS)})`);
    ok(Array.isArray(ncut) && ncut.some(s => /(^|\s)pf(\s|$)/.test(s)),
      `[음성 1600] smoke 자가 .pf 를 잡는다 (${JSON.stringify(ncut)})`);
    /* 대조 — 같은 자를 «안 갈아 낀» 현재 트리에 대면 0건이어야 한다(항등식이 아님) */
    await np.goto(URL); await np.waitForTimeout(700);
    await np.evaluate(() => openProfile());
    await np.waitForTimeout(800);
    const bcut = await np.evaluate(`(${CUT})(${JSON.stringify(CANDS)})`);
    eq('[대조 1600] 현재 트리에서는 같은 자가 0건', Array.isArray(bcut) ? bcut.length : -1, 0);
    await nctx.close();
  } finally { try { fs.unlinkSync(negPath); } catch (_) {} }

  eq('콘솔/런타임 에러', errs.length, 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(`\nVERIFY241 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
