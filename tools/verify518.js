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
  } else if (open === 'dunw' || open === 'shopw' || open === 'relw') {
    /* 3회차 — «(다) 전체화면 페이지»(z28). 팝업과 달리 상단 HUD·탭바를 안 덮어
       프레임의 87.5% 만 차지한다 — 그래서 2회차까지 그물 밖이었다. */
    /* 60 쥬시 열림 연출(.jz-o.jz-pg = jzPgIn .12s)은 이 게이트가 재는 축이 아니고, 씬을 잇달아
       돌리면 그 연출이 opacity 0 에 머문 채 남아 «열었는데 안 덮는다» 는 거짓 진단을 낸다.
       제품 자신의 손잡이 jzHush()(«보이기 상태만 갱신하고 jzOpen/jzClose 는 건너뛴다» — 96 서브탭
       전환이 쓰는 그것)로 감싼다. 열리는 **상태**는 제품 함수가 그대로 만든다. */
    jzHush(() => {
      if (open === 'dunw') openDungeon();
      else if (open === 'shopw') openShopPage(null, 'coin');
      else openRelw();
    });
    /* ⚠ 60 쥬시 열림 연출이 도는 동안 페이지는 display:block 인 채 **opacity 0** 이다 —
       고정 대기로 재면 «열었는데 안 덮는다» 는 거짓 진단이 나온다(1회차 [E3] 가 그랬다).
       ⚠ 이 대기를 fxCovered() 로 걸면 안 된다 — 그 함수는 **프레임당 1회 캐시**라 앞 씬의 팝업이
       남긴 true 를 그대로 돌려주고 루프가 0프레임에 빠져나간다(2회차 시도에서 셋 다 그렇게 빨개졌다).
       실제로 칠해질 때까지, 즉 **opacity** 로 기다린다. */
    const pgw = document.getElementById(open);
    for (let i = 0; i < 150 && Number(getComputedStyle(pgw).opacity) < 0.95; i++) await raf();
    await wait(3);
  } else {
    /* ⚠ 60 쥬시 닫힘 연출이 도는 동안에는 팝업이 «아직 화면에 있다»(display:block · opacity 감쇠).
       그것을 «덮는 층 없음» 으로 세면 [D] 가 재려는 상태가 아니다 — 연출이 끝날 때까지 기다린다. */
    for (let i = 0; i < 60 && fxCovered(); i++) await raf();
    await wait(3);
  }

  /* 발원 만들기 — 'tap' = 추측(그냥 누르기) · 'known' = 화면이 fxAt 로 알려 준 자리 */
  /* ⚠ 89 유물은 #rwBasin 이 **pointerdown 에서 실제로 소환**한다 — 발원 표본으로 쓰면
     «재화를 안 얻었다» 는 전제가 깨진다. 페이지마다 «아무것도 안 주는» 자리를 고른다. */
  const HOST = { sum: '#sumGridIn > *', up: '#upw .upr-cel',
                 dunw: '#dunList .dnc', shopw: '#shopList .cn-cd', relw: '#relw .pcb-p' };
  const host = document.querySelector(HOST[open] || '#menub') || document.body;
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
  const pgEl = document.getElementById(open);
  const pageOn = !!(pgEl && pgEl.classList.contains('on'));
  const pageOp = pgEl ? getComputedStyle(pgEl).opacity : '-';
  const busy = typeof battleBusy === 'function' ? battleBusy() : null;
  /* 진단 — 무엇이 덮고 있는가(게이트가 빨개졌을 때 자리를 바로 알려 준다) */
  const coverIds = [...document.getElementById('app').children].filter(n => {
    if (n.id === 'fxl' || n.id === 'fxlc') return false;
    const z = parseInt(getComputedStyle(n).zIndex, 10); if (!(z > 7)) return false;
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    /* 3회차 — 진단도 제품과 같은 자로 잰다(«전투 화면의 90%»). 프레임 기준으로 두면
       페이지형 3화면에서 «덮는 층 없음» 이라고 거짓 진단을 낸다. */
    const r = n.getBoundingClientRect(), s = document.getElementById('stagearea').getBoundingClientRect();
    const ix = Math.max(0, Math.min(r.right, s.right) - Math.max(r.left, s.left));
    const iy = Math.max(0, Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top));
    return ix * iy >= s.width * s.height * 0.9;
  }).map(n => (n.id || n.className) + '(z' + getComputedStyle(n).zIndex + ')');
  S.gold += 54321;                                   /* «표시 없는» 증가분 — 22291·22316 과 같은 한 줄 */
  await wait(30);
  mo.disconnect();

  const fly = seen.filter(s => /fx-fly/.test(s.cls));
  const plus = seen.filter(s => /fx-plus/.test(s.cls));
  const lit = seen.filter(s => /fx-lit/.test(s.cls));
  /* ⚠ 페이지형 3화면은 «.on 을 손으로 뜯으면» 다음 열기가 60 쥬시의 opacity 0 상태에 갇힌다
     (1회차 [E3] 의 뿌리 — 실측 jz-o jz-pg · opacity 0 이 500ms 뒤에도 그대로였다).
     제품 자신의 닫기 함수를 쓴다. */
  if (typeof closeDungeon === 'function') closeDungeon();
  if (typeof closeShopPage === 'function') closeShopPage();
  if (typeof closeRelw === 'function') closeRelw();
  ['sumw', 'upw'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on'); });
  return {
    pageOn, pageOp, busy,
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
  /* 3회차 — 453 이 «전투 중에는 03 던전·10 상점을 아예 안 연다» 로 못박아 두어, 50킬을 채워
     보스전이 서면 [E]·[F] 씬의 페이지 열기가 통째로 no-op 이 된다(1회차에 셋 다 그렇게 빨개졌다).
     «파밍 대기»(273 — 죽은 뒤 잡몹만 도는 정상 상태)로 두면 새 보스전이 서지 않는다.
     재는 축(배경 전투 골드 · 발원 · 층)은 한 값도 안 바뀐다 — 파도 전멸 보너스도 전투 발이다. */
  await p.evaluate(() => { S.bossFarm = true; });
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
  /* 3회차 — 자의 «무엇의 90% 인가» 를 프레임에서 전투 화면으로 옮긴 것이 이번 회차의 본체다.
     문턱을 87% 로 낮추는 처방이었으면 이 항이 안 선다(그 값이 어디서 왔는지 아무도 못 적는다). */
  ok(/const st = fxRect\(\$\('stagearea'\)\);/.test(src),
     '[A7] «덮는 층» 판정이 **전투 화면(#stagearea)** 을 기준으로 잰다(프레임 90% 문턱 폐기 — 페이지형 3화면이 87.5% 로 새던 자리)');
  const shopFx = ['fxAt(ex0)', 'fxAt(dx)', 'fxAt(b)'].filter(s2 => src.includes(s2));
  ok(shopFx.length === 3,
     '[A8] 10 상점 «재화» 탭의 지급 3경로가 발원을 알려 준다(§9 재화 교환 · §10 입장권 교환 · 광고 상품) — ' + shopFx.join(' '));

  const b = await launch(chromium);

  /* ── [B] 팝업 열림 + 추측 발원 ─────────────────────────────────────── */
  const { p, errs } = await boot(b, false);
  const run = (open, srcKind) => p.evaluate(eval('(' + SCENE + ')'), { open, srcKind });

  /* ⚠ 배경 전투가 계속 도는 탓에 «그 프레임의 발원» 이 전투일 수도 탭일 수도 있다.
     이 게이트가 재려는 것은 **탭이 이긴 시행**이므로 그 시행이 나올 때까지 돌린다. */
  const until = async (open, kind, pred) => {
    let last = null;
    for (let i = 0; i < 6; i++) { last = await run(open, kind); if (pred(last)) return last; }
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

  /* ── [E]·[F] 3회차 — «(다) 전체화면 페이지» 3화면(z28) ───────────────
     2회차 전수 스윕이 남긴 그물 밖 셋이다. 실측 1080×1996 @ y104 = 프레임의 87.5% 라
     «프레임 90%» 문턱을 못 넘었지만 **전투 화면은 100% 가린다** — 그 위로 쏟아지는 코인은
     주인이 본 그림 그대로다(«03 던전 카드를 눌렀는데 거기서 금화가 튄다»). */
  const PAGES = [['dunw', '03 던전'], ['shopw', '10 상점'], ['relw', '89 유물']];
  for (let i = 0; i < PAGES.length; i++) {
    const [key, nm] = PAGES[i];
    const e1 = await until(key, 'tap', r => r.srcTap && r.flyN > 0);
    ok(e1.covered === true, '[E' + (i + 1) + '] ' + nm + ' 페이지(#' + key + ' z28)가 «덮는 층» 으로 잡힌다 — ' + JSON.stringify(e1.coverIds)
       + ' (on=' + e1.pageOn + ' opacity=' + e1.pageOp + ' 전투중=' + e1.busy + ')');
    ok(e1.flyN > 0 && e1.flyLayers.length === 1 && e1.flyLayers[0] === 'fxlc' && e1.litN === 0,
       '[F' + (i + 1) + '] 그 화면에서 추측 발원 코인이 페이지 **아래**(#fxlc) 로만 간다 — '
       + JSON.stringify(e1.flyLayers) + ' · 코인 ' + e1.flyN + '개 · lit ' + e1.litN);
  }

  /* ── [G] 3회차 — 넓힌 그물이 «진짜 보상» 을 삼키지 않는다 ─────────────
     probe518p 표의 «재화 O + 발원 X» 13자리(광고 상품 4 · §9 교환 · §10 입장권 8)가 이 항의 이유다.
     그 자리들에 fxAt 를 달지 않은 채 그물만 넓혔으면 **주인이 실제로 받은 보상**이 페이지 아래로 묻혔다. */
  /* ⚠ 이 자리는 «시행마다 같은 답» 이 안 나온다 — 클릭과 다음 fxWatch 프레임 사이에 킬이 하나
     끼면 158 규약대로 그 묶음의 발원이 **전투**로 덮여(fxAccSrc) 코인이 전투 층으로 간다.
     제품의 오래된 동작이고 이 회차가 만든 것이 아니라, 자를 «한 번이라도 페이지 위에서 나는가» 로 쓴다. */
  const gTrial = async () => p.evaluate(async () => {
    const raf = () => new Promise(r => requestAnimationFrame(r));
    S.dia = 1e6; S.daily = S.daily || {}; S.daily.adBuy = {};
    document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
    openShopPage(null, 'coin');
    await new Promise(r => setTimeout(r, 500));
    const btn = document.querySelector('#shopList [data-cnad]');
    if (!btn) return { err: '광고 상품 버튼 없음' };
    const seen = [];
    const mo = new MutationObserver(recs => {
      for (const rec of recs) for (const n of rec.addedNodes) {
        if (n.nodeType !== 1 || !n.classList || !n.classList.contains('fx-fly')) continue;
        seen.push(n.closest('#fxl') ? 'fxl' : (n.closest('#fxlc') ? 'fxlc' : '?'));
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const covered = fxCovered(), dia0 = S.dia;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    btn.click();
    const gain = S.dia - dia0;                        /* 같은 틱 — 배경 전투가 끼어들기 전 */
    for (let i = 0; i < 40; i++) await raf();
    mo.disconnect();
    const src2 = fxSrc(performance.now());
    closeShopPage();
    return { covered, gain, srcTap: !!(src2 && src2.tap), layers: [...new Set(seen)] };
  });
  let g1 = null, gHit = 0, gN = 0;
  for (let i = 0; i < 6; i++) { gN++; const g = await gTrial(); if (!g1 || g.gain > 0) g1 = g; if (g.layers.includes('fxl')) { gHit++; break; } }
  ok(g1.covered === true && g1.gain > 0,
     '[G1] 10 상점 «재화» 탭 광고 상품 수령이 덮는 화면에서 실제로 재화를 준다 — 다이아 +' + g1.gain);
  ok(gHit > 0,
     '[G2] 그 보상 코인이 **페이지 위**(#fxl) 에서 난다 — ' + gN + '시행 중 ' + gHit + '회 · 마지막 ' + JSON.stringify(g1.layers)
     + ' (그물만 넓히고 fxAt 를 안 달았으면 6시행 전부 fxlc = 받은 보상이 한 번도 안 보인다)');

  ok(errs.length === 0, '[X] 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────────── */
  /* ⚠ 3회차 — 이 항은 «탭 추측이 이긴 시행» 을 재는 것인데 배경 전투 킬이 그 프레임의 발원을
     가져가면 코인이 전투 층으로 간다(158). [B]·[C] 와 같은 규율로 그 시행이 나올 때까지 돌린다 —
     안 그러면 자가 실행마다 흔들린다(2회차 판은 1회 시행이라 실제로 흔들렸다 · 530 계열). */
  const rv = await boot(b, true);
  let r1 = null;
  for (let i = 0; i < 6; i++) {
    r1 = await rv.p.evaluate(eval('(' + SCENE + ')'), { open: 'sum', srcKind: 'tap' });
    if (r1.srcTap && r1.flyN > 0 && r1.flyLayers.includes('fxl')) break;
  }
  ok(r1.flyLayers.includes('fxl'),
     '[R] 판정을 끈 사본(= 수리 전)에서는 코인이 팝업 **위**(#fxl)로 간다 — ' + JSON.stringify(r1.flyLayers)
     + ' (무르게 푼 수리가 아님을 이 항이 못박는다)');

  /* ── [R2] 3회차 되돌림 시험 — «문턱» 이 아니라 «무엇의 90% 인가» 가 일한다 ─────
     자를 2회차 판(프레임의 90%)으로 되돌린 사본에서는 페이지형 3화면이 다시 그물 밖이 된다.
     이 항이 없으면 «어차피 팝업이 다 잡았을 것» 과 구별이 안 된다. */
  const rv2 = await boot(b, false);
  await rv2.p.evaluate(() => {
    let f = -1, c = false;
    window.fxCovered = function () {                  /* 2회차 원본 그대로 — 프레임 90%×90% */
      if (f === fxFrame) return c;
      f = fxFrame; c = false;
      const app = document.getElementById('app'); if (!app) return false;
      for (const n of app.children) {
        if (n.id === 'fxl' || n.id === 'fxlc') continue;
        if (fxZOf(n) <= 7) continue;
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
        const r = fxRect(n);
        if (r && r.w >= FRAME_W * 0.9 && r.h >= frameH * 0.9) { c = true; break; }
      }
      return c;
    };
  });
  let r2 = null;
  for (let i = 0; i < 6; i++) {
    r2 = await rv2.p.evaluate(eval('(' + SCENE + ')'), { open: 'shopw', srcKind: 'tap' });
    if (r2.srcTap && r2.flyLayers.includes('fxl')) break;
  }
  ok(r2.covered === false && r2.flyLayers.includes('fxl'),
     '[R2] 자를 «프레임 90%»(2회차 판)로 되돌린 사본에서는 10 상점 페이지가 다시 그물 밖이고 코인이 페이지 **위**로 간다 — 덮음 '
     + (r2.covered ? 'O' : '·') + ' · ' + JSON.stringify(r2.flyLayers));

  await b.close();
  console.log('\nVERIFY518 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
