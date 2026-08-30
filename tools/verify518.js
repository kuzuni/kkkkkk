/* 게이트 518 — «재화를 안 얻었는데 재화 획득 연출이 터진다» (저장소 주인 보고 2026-08-31)
 *
 * 지키는 규칙 한 줄:
 *   **화면을 덮는 층(팝업·시트)이 떠 있는 동안에는 «누가 줬는지 아는 재화» 만 그 위에서 연출한다.**
 *   화면이 `fxAt(요소)` 로 알려 준 발원 = 안다 / `fxTapEl` 폴백(마지막으로 누른 버튼) = 추측이다.
 *   추측이면 UI 발 3박자·소리·개수·경로는 그대로 두고 **그리는 층만** #fxlc(z7 · 팝업 아래)로 내리고
 *   딤 위 알약 복제(`fx-lit`)를 뺀다.
 *
 * 왜 이 규칙인가(재현 근거 — `tools/probe518.js`):
 *   · 소환은 골드를 **안 준다**(델타 0) · 장비 일괄 강화도 골드를 **안 쓴다**(조각으로만 산다).
 *   · 그런데 배경 전투는 팝업이 떠 있는 동안에도 계속 골드를 번다. 그 증가분에 발원 표시가 없으면
 *     `fxSrc` 가 «마지막으로 누른 버튼»(창 1200ms)을 집어 **UI 발**로 만들고, UI 발은 #fxl(z60)이라
 *     모든 팝업 **위**로 코인이 쏟아진다 — 게다가 발원이 «방금 누른 [일괄 강화]·소환 카드» 다.
 *   · 수리 전 실측: 팝업 안 카드를 누른 직후 `fxSrc` 가 **0프레임 만에** 그 카드를 돌려줬다.
 *
 * [A] 정적 — 전투 수입(스테이지·파도 보너스)에 전투 발원 표시가 붙어 있다
 * [B] 팝업 열림 + 추측 발원  → 코인·`+n` 이 #fxlc · 알약 복제 0
 * [C] 팝업 열림 + 아는 발원  → 종전 그대로 #fxl (무르게 풀지 않았음 = 이 항이 못박는다)
 * [D] 덮는 층 없음(메인) + 추측 발원 → 종전 그대로 #fxl (58/93 회귀)
 * [R] 되돌림 시험 — `fxCovered()` 를 «항상 false» 로 묶은 사본에서 [B] 가 빨개진다
 *
 * 실행: node tools/verify518.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 페이지 안에서 한 씬을 돌린다 — 팝업을 열고, 발원을 만들고, 표시 없는 증가분을 넣는다 */
const SCENE = `async ({ open, srcKind }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const wait = async n => { for (let i = 0; i < n; i++) await raf(); };
  S.dia = 1e9;
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
  /* ⚠ 앞 씬의 «아직 안 꽂힌 묶음» 이 남아 있으면 그 묶음의 «+n» 이 이번 창에서 뜬다 —
     층 판정과 무관한 잔재라 먼저 가라앉힌다(도착 예산 0.62s + 롤링). */
  await new Promise(r => setTimeout(r, 800));
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());

  if (open === 'sum') {
    const keys = Object.keys(BANNERS), res = [], sn = new Set();
    for (let i = 0; i < 4000 && res.length < 10; i++) { const o = summonOne(keys[i % keys.length]); if (sn.has(o.it.id)) continue; sn.add(o.it.id); res.push(o); }
    showSummonResult('weapon', 10, res, false);
    await new Promise(r => setTimeout(r, 500));
  } else if (open === 'up') {
    EQUIPS.slice(0, 6).forEach(it => { S.own[it.id] = { n: 400, l: (S.own[it.id] || {}).l || 1 }; });
    openUpAll(levelUpAll(wpnList()).ups);
    await new Promise(r => setTimeout(r, 400));
  } else {
    /* ⚠ 60 쥬시 닫힘 연출이 도는 동안에는 팝업이 «아직 화면에 있다»(display:block · opacity 감쇠).
       그것을 «덮는 층 없음» 으로 세면 [D] 가 재려는 상태가 아니다 — 연출이 끝날 때까지 기다린다. */
    for (let i = 0; i < 60 && fxCovered(); i++) await raf();
    await wait(3);
  }

  /* 발원 만들기 — 'tap' = 추측(그냥 누르기) · 'known' = 화면이 fxAt 로 알려 준 자리 */
  const host = document.querySelector(open === 'sum' ? '#sumGridIn > *' : open === 'up' ? '#upw .upr-cel' : '#menub')
            || document.body;
  host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  if (srcKind === 'known') fxAt(host);

  const seen = [];
  const layerOf = el => el.closest('#fxl') ? 'fxl' : (el.closest('#fxlc') ? 'fxlc' : '?');
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const n of rec.addedNodes) {
      if (n.nodeType !== 1 || !n.classList) continue;
      if (n.classList.contains('fx-fly') || n.classList.contains('fx-plus') || n.classList.contains('fx-lit'))
        seen.push({ cls: n.className, layer: layerOf(n) });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  const src = fxSrc(performance.now());
  const covered = fxCovered();                       /* 팝업을 닫기 «전» 에 재 둔다 */
  /* 진단 — 무엇이 덮고 있는가(게이트가 빨개졌을 때 자리를 바로 알려 준다) */
  const coverIds = [...document.getElementById('app').children].filter(n => {
    if (n.id === 'fxl' || n.id === 'fxlc') return false;
    const z = parseInt(getComputedStyle(n).zIndex, 10); if (!(z > 7)) return false;
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    const r = n.getBoundingClientRect(), a = document.getElementById('app').getBoundingClientRect();
    return r.width >= a.width * 0.9 && r.height >= a.height * 0.9;
  }).map(n => (n.id || n.className) + '(z' + getComputedStyle(n).zIndex + ')');
  S.gold += 54321;                                   /* «표시 없는» 증가분 — 22291·22316 과 같은 한 줄 */
  await wait(30);
  mo.disconnect();

  const fly = seen.filter(s => /fx-fly/.test(s.cls));
  const plus = seen.filter(s => /fx-plus/.test(s.cls));
  const lit = seen.filter(s => /fx-lit/.test(s.cls));
  ['sumw', 'upw'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on'); });
  return {
    covered, coverIds, srcTap: !!(src && src.tap), srcCombat: !!(src && src.combat),
    flyN: fly.length, flyLayers: [...new Set(fly.map(s => s.layer))],
    plusLayers: [...new Set(plus.map(s => s.layer))], litN: lit.length
  };
}`;

async function boot(browser, revert) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  /* [R] 되돌림 — 수리 «전» 과 같은 상태(덮는 층 판정을 통째로 끈다) */
  if (revert) await p.evaluate(() => { window.fxCovered = () => false; });
  return { p, errs };
}

(async () => {
  console.log('\n=== verify518 — «안 얻은 재화의 획득 연출» ===');

  /* ── [A] 정적 ─────────────────────────────────────────────────────── */
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const lines = src.split('\n');
  const bonus = [];
  lines.forEach((ln, i) => {
    if (!/S\.gold\s*\+=\s*bonusG/.test(ln)) return;
    const near = lines.slice(Math.max(0, i - 6), i).join('\n');
    bonus.push({ line: i + 1, tagged: /fxAt\(.*'combat'\)/.test(near) });
  });
  ok(bonus.length === 2, '[A1] 전투 보너스 골드 자리 2곳(스테이지 클리어 · 파도 전멸) — ' + bonus.map(b => b.line).join(', '));
  ok(bonus.length > 0 && bonus.every(b => b.tagged),
     '[A2] 두 자리 모두 «전투 발원 표시»(fxAt(…, \'combat\')) 를 단다 — ' + bonus.map(b => b.line + ':' + (b.tagged ? 'O' : '✗')).join(' '));
  ok(/function fxCovered\(\)/.test(src), '[A3] «덮는 층» 판정 부품 fxCovered() 가 있다');
  ok(/el:fxTapEl, tap:true/.test(src), '[A4] 탭 폴백 발원에 «추측» 표시(tap:true)가 붙는다');
  ok(/const buried = !combat && !!\(from && from\.tap\) && fxCovered\(\)/.test(src),
     '[A5] fxFly 가 «추측 + 덮는 층» 일 때만 층을 내린다(전투 발·아는 발원은 안 건드린다)');
  ok(/combat: combat \|\| buried/.test(src),
     '[A6] 묶음이 «내려간 층» 을 기억한다 = `+n` 이 코인과 같은 층에 뜬다(층이 갈리면 팝업 위에 숫자만 남는다)');

  const b = await launch(chromium);

  /* ── [B] 팝업 열림 + 추측 발원 ─────────────────────────────────────── */
  const { p, errs } = await boot(b, false);
  const run = (open, srcKind) => p.evaluate(eval('(' + SCENE + ')'), { open, srcKind });

  /* ⚠ 배경 전투가 계속 도는 탓에 «그 프레임의 발원» 이 전투일 수도 탭일 수도 있다.
     이 게이트가 재려는 것은 **탭이 이긴 시행**이므로 그 시행이 나올 때까지 돌린다. */
  const until = async (open, kind, pred) => {
    let last = null;
    for (let i = 0; i < 4; i++) { last = await run(open, kind); if (pred(last)) return last; }
    return last;
  };
  const b1 = await until('sum', 'tap', r => r.srcTap && r.flyN > 0);
  ok(b1.covered === true, '[B0] 소환 결과 팝업이 «화면을 덮는 층» 으로 잡힌다');
  ok(b1.srcTap === true, '[B1] 팝업 안을 누른 직후 발원이 «탭 추측» 으로 찍힌다(수리 전 그림의 뿌리)');
  ok(b1.flyN > 0, '[B2] 그 사이 배경 전투 골드가 실제로 코인을 쏜다 — ' + b1.flyN + '개(전투 연출은 안 죽였다)');
  ok(b1.flyLayers.length === 1 && b1.flyLayers[0] === 'fxlc',
     '[B3] 코인이 팝업 **아래**(#fxlc) 로만 간다 — ' + JSON.stringify(b1.flyLayers));
  ok(!b1.plusLayers.includes('fxl'), '[B4] «+n» 이 팝업 위에 남지 않는다(코인과 같은 층) — ' + JSON.stringify(b1.plusLayers));
  ok(b1.litN === 0, '[B5] 딤 위 밝은 알약 복제(fx-lit) 0개 — ' + b1.litN);

  const b2 = await until('up', 'tap', r => r.flyN > 0);
  ok(b2.covered === true, '[B6] 09 일괄 강화 결과 팝업도 «덮는 층»');
  ok(b2.flyLayers.every(l => l === 'fxlc') && b2.litN === 0,
     '[B7] [일괄 강화] 를 누른 직후의 배경 골드도 팝업 아래 — ' + JSON.stringify(b2.flyLayers) + ' · lit ' + b2.litN);

  /* ── [C] 팝업 열림 + «아는» 발원 (무르게 풀지 않았다) ───────────────── */
  const c1 = await until('sum', 'known', r => r.flyLayers.includes('fxl'));
  ok(c1.srcTap === false, '[C1] 화면이 fxAt(요소) 로 알려 준 발원은 «추측» 이 아니다');
  ok(c1.flyLayers.includes('fxl'),
     '[C2] 그 보상은 **종전 그대로 팝업 위**(#fxl) 에서 난다 — ' + JSON.stringify(c1.flyLayers)
     + ' (우편·퀘스트·룰렛·패스·상점 수령이 이 길이다)');

  /* ── [D] 덮는 층이 없을 때(메인 화면) — 58·93 회귀 ─────────────────── */
  /* ⚠ 메인 화면은 배경 전투가 계속 돌아 «그 프레임의 발원» 이 전투일 수도 탭일 수도 있다.
     («탭이 이긴 시행» 이 나올 때까지 몇 번 돌린다 — 그 시행에서 층이 안 바뀌는 것이 회귀 판정이다) */
  let d1 = null, dTap = null;
  for (let i = 0; i < 5; i++) {
    d1 = await run('none', 'tap');
    if (d1.srcTap && d1.flyN && d1.flyLayers.length === 1 && d1.flyLayers[0] === 'fxl') { dTap = d1; break; }
  }
  ok(d1 && d1.covered === false, '[D1] 팝업이 없으면 «덮는 층» 도 없다 — ' + JSON.stringify(d1 && d1.coverIds));
  ok(!!dTap, '[D3] 메인 화면에서 «탭이 이긴» 시행을 잡았다(회귀 판정의 전제)');
  ok(!!dTap && dTap.flyLayers.length === 1 && dTap.flyLayers[0] === 'fxl',
     '[D2] 그 시행의 UI 발은 한 값도 안 바뀐다(#fxl) — ' + JSON.stringify(dTap && dTap.flyLayers));

  ok(errs.length === 0, '[X] 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────────── */
  const rv = await boot(b, true);
  const r1 = await rv.p.evaluate(eval('(' + SCENE + ')'), { open: 'sum', srcKind: 'tap' });
  ok(r1.flyLayers.includes('fxl'),
     '[R] 판정을 끈 사본(= 수리 전)에서는 코인이 팝업 **위**(#fxl)로 간다 — ' + JSON.stringify(r1.flyLayers)
     + ' (무르게 푼 수리가 아님을 이 항이 못박는다)');

  await b.close();
  console.log('\nVERIFY518 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
