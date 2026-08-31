/* 게이트 578 — «[충전] 을 뗀 뒤 «+1,000,000» 사본이 이웃 행 안에 하나 더 뜬다»
 *              (2026-08-31 등재 · 491 8회차 비평 곁다리 관측)
 *
 * 지키는 규칙 한 줄:
 *   **근거가 약할수록 낮은 층에 그린다.** 518 이 «탭 추측» 을 팝업 아래로 내렸는데, 그 판정이
 *   `from.tap` 하나에 걸려 있어서 **추측조차 못 한 묶음**(`fxAccSrc` 스냅샷 = null)은 가드를 통째로
 *   비켜 가 `#fxl`(z60 = 모든 팝업 위)에 떴다. 근거가 더 약한 쪽이 더 높은 층을 얻고 있었다.
 *
 * 재현이 등재문의 가설 셋을 어떻게 갈랐나(`tools/probe578.js`):
 *   ⓐ «hbFloat 의 변형 벗기기가 개별 변환 속성(.jz-hdn 의 scale/translate)을 못 벗긴다» — **기각**.
 *      `.tp-hd` 에 `jz-hdn` 을 붙여도 `getComputedStyle().transform` 은 `none`, `.scale` 1, `.translate` 0px 이고
 *      상자가 Δ(0,0) 이다 — 벗길 것이 애초에 없다.
 *   ⓒ «`end:` 의 fxReward()·토스트가 남긴 별개 노드» — **기각**. 인자 없는 `fxReward()` 는 버스트만
 *      만들고 글자를 안 만든다. 토스트는 프레임 상단(y135~215)이라 좌표가 아예 다르다.
 *   ⓑ «2패스 캡처가 만든 사본» — **확인**, 다만 «사다리가 다른 레인에 앉는다» 가 아니었다:
 *      하네스의 `S.tstone = 1e6`(2패스용 재고 되돌림)이 제품에게는 **진짜 획득**이라
 *      `fxWatch` 가 정직하게 «+1,000,000» 을 띄운 것이고, 그 자리가 «발원 불명 → 프레임 한복판» 이라
 *      열려 있는 훈련 팝업의 **이웃 «공격력 단련» 행 위**였다.
 *      실측 (503.6,1245.9) 176.7×43 — 등재문 CI 「crop y258~290」·CJ 「crop x491~670」
 *      = 프레임 (502,1250)~(681,1282) 와 같은 자리다.
 *
 * ⇒ 수리는 둘이다. **자**(하네스가 없는 사건을 만들지 않는다) 와 **제품**(발원 불명도 «추측» 과 같은 급).
 *
 * [전제] 훈련 팝업이 «덮는 층» 으로 잡힌다 · 발원을 비우면 스냅샷이 정말 null 이다
 * [B]  발원 불명 + 팝업 열림 → `+n` 이 팝업 **아래**(#fxlc) 에만 · 팝업 위(#fxl)에 0개
 * [C]  무르게 풀지 않았다 — «아는 발원»(fxAt(요소))은 종전 그대로 팝업 **위**(#fxl)
 * [D]  덮는 층이 없으면(메인) 발원 불명도 종전 그대로 #fxl (58·93·518 [D2] 회귀)
 * [E]  폴백 자리 — «발원 불명» 의 기본 자리가 팝업 안 이웃 행 위다(= 층을 내려야 하는 이유)
 * [F]  자(cap491) — 되돌림이 조용한가 · 두 층을 같이 비우는가
 * [R]  되돌림 시험 — 가드를 518 판(`from.tap` 만)으로 되돌린 사본에서 [B] 가 빨개진다
 *
 * 실행: node tools/verify578.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const CAP = path.join(ROOT, 'tools', 'cap491.js');

/* 578 이 넓힌 판정 ↔ 518 판(되돌림 시험용) */
const GUARD_NEW = 'const guess  = !combat && (!from || !!from.tap || !fxPt(from));\n'
                + '  const buried = guess && (fxCovered() || (from && from.el ? fxOverlaid(from.el) : false));';
const GUARD_OLD = 'const guess  = false;\n'
                + '  const buried = !combat && !!(from && from.tap) && (fxCovered() || fxOverlaid(from.el));';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ── 페이지 안에서 도는 한 씬 ──────────────────────────────────────────────
   `open`  : 'train'(23 훈련 팝업 = 덮는 층) · 'main'(아무것도 안 연다)
   `origin`: 'none'(발원 불명 — 표시도 없고 탭 창도 비었다) · 'known'(fxAt 으로 알려 준 발원)   */
const SCENE = `async ({ open, origin }) => { try {
  const raf  = () => new Promise(r => requestAnimationFrame(r));
  const wait = async n => { for (let i = 0; i < n; i++) await raf(); };
  const clear = () => document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());

  /* 화면을 만든다 */
  if (open === 'train') { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('temper'); renderTrain(); }
  else { if ($('trw').classList.contains('on')) closeTrain && closeTrain(); document.querySelectorAll('#app > .on').forEach(n => { if (n.id === 'trw') n.classList.remove('on'); }); }
  await wait(4);

  /* ⚠ 앞 씬의 «아직 안 꽂힌 묶음» 을 먼저 가라앉힌다(518 SCENE 과 같은 이유) */
  await new Promise(r => setTimeout(r, 700));
  clear();
  await wait(2);

  /* 발원을 만든다(또는 비운다).
     ⚠ 'none' 은 «표시도 없고 탭도 없는» 상태다 — 배경 전투가 그 사이에 새 발원을 찍지 못하게
       «fxAt« 을 이 씬 동안만 재운다. 이것이 «자동 수입» 이 도착하는 순간의 상태 그대로다. */
  const _fxAt = fxAt;
  if (origin === 'none') {
    fxAt = () => {};
    fxOrig = null; fxOrigT = -1e9; fxOrigSrc = null; fxTapEl = null; fxTapT = -1e9;
    for (const k in fxAccSrc) fxAccSrc[k] = null;
  } else {
    const host = document.querySelector('#trTemper .tp-hd .cg') || document.querySelector('#tabbar');
    _fxAt(host);
  }
  const snapNull = (typeof fxSrc === 'function') ? (fxSrc(performance.now()) === null) : null;
  const covered  = (typeof fxCovered === 'function') ? fxCovered() : null;

  /* 표시가 없는 증가분 — 단련석(알약이 없는 재화 = 등재문과 같은 재화) */
  fxSeen.tstone = (Math.floor(S.tstone) || 0);
  S.tstone = (Math.floor(S.tstone) || 0) + 1000000;
  if (typeof fxFlush === 'function') fxFlush();
  await wait(6);
  await new Promise(r => setTimeout(r, 260));

  const pick = id => Array.from((document.getElementById(id) || { children: [] }).children)
    .filter(d => d.classList && d.classList.contains('fx-plus'))
    .map(d => { const r = (typeof fxRect === 'function') ? fxRect(d) : null;
      return { cls: d.className, txt: (d.textContent || '').trim(),
               r: r ? { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1) } : null }; });
  const out = { snapNull, covered, fxl: pick('fxl'), fxlc: pick('fxlc') };

  /* 이웃 행의 자리도 같이 신고한다([E] 가 쓴다) */
  const row = document.querySelector('#trTemper .tr-tp.k0');
  if (row && typeof fxRect === 'function') { const r = fxRect(row);
    out.row = r ? { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1),
                    n: (row.querySelector('.tn') || {}).textContent || '' } : null; }
  fxAt = _fxAt;
  return out;
  } catch (e) { return { err: (e && e.message) || String(e), fxl: [], fxlc: [] }; }
}`;

async function boot(ctx, url) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxFly === 'function' && typeof openTrain === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
                           S.gold = 1e6; S.dia = 1e4; S.tstone = 1000; });
  await p.waitForTimeout(300);
  return { p, errs, run: a => p.evaluate(eval('(' + SCENE + ')'), a) };
}

(async () => {
  console.log('=== VERIFY 578 — «발원 불명» 재화 연출이 팝업 위에 사본을 남긴다 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(GUARD_NEW)) {
    console.log('  NO   [전제] index.html 에 578 의 «발원 불명» 가드가 없다 — 수리가 사라졌다');
    console.log('\nVERIFY578 0/1 — FAIL 1');
    process.exit(1);
  }
  /* §R 용 «수리 전»(518 판) 사본. 상대 경로 자산 때문에 반드시 같은 폴더에 둔다(probe350 함정) */
  const revPath = path.join(ROOT, '.verify578-rev.html');
  fs.writeFileSync(revPath, src.replace(GUARD_NEW, GUARD_OLD));
  process.on('exit', () => { try { fs.unlinkSync(revPath); } catch (e) {} });

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const cur = await boot(ctx, 'file://' + SRC);

  /* ── [전제] ───────────────────────────────────────────────────────────── */
  console.log('[전제] 재현의 바닥 — 이 두 항이 초록이어야 아래가 «그 자리» 를 재는 것이다');
  const B = await cur.run({ open: 'train', origin: 'none' });
  ok(B.covered === true, '[전제1] 23 훈련 팝업이 «덮는 층» 으로 잡힌다 — fxCovered()=' + B.covered);
  ok(B.snapNull === true, '[전제2] 발원을 비우면 스냅샷이 정말 null 이다(«추측» 조차 못 하는 상태) — fxSrc()=' + (B.snapNull ? 'null' : '있음'));

  /* ── [B] 본체 ─────────────────────────────────────────────────────────── */
  console.log('\n[B] 발원 불명 + 팝업 열림 — 사본이 팝업 위에 남지 않는다');
  const bAll = B.fxl.concat(B.fxlc);
  ok(bAll.length > 0, '[B1] 이 조건에서 «+n» 이 실제로 난다(항이 «아무 일도 안 남» 으로 초록이 되지 않게) — ' + bAll.length + '개 ' + JSON.stringify(bAll.map(d => d.txt)));
  ok(B.fxl.length === 0, '[B2] 팝업 **위** 층(#fxl · z60)에 «+n» 이 0개 — ' + B.fxl.length + '개 ' + JSON.stringify(B.fxl.map(d => d.txt)));
  ok(B.fxlc.length > 0, '[B3] 그 «+n» 은 팝업 **아래** 층(#fxlc · z7)에 있다 — ' + B.fxlc.length + '개');
  ok(B.fxl.every(d => !/\bui\b/.test(d.cls)) && B.fxlc.every(d => !/\bui\b/.test(d.cls)),
     '[B4] «UI 발» 표시(.ui)가 안 붙는다 = 딤 위 알약 복제·1.5s 수명도 같이 안 붙는다 — ' + JSON.stringify(bAll.map(d => d.cls)));

  /* ── [C] 무르게 풀지 않았다 ───────────────────────────────────────────── */
  console.log('\n[C] 무르게 풀지 않았다 — «아는 발원» 은 한 값도 안 바뀐다');
  const C = await cur.run({ open: 'train', origin: 'known' });
  ok(C.snapNull === false, '[C1] fxAt(요소) 로 알려 준 발원은 스냅샷이 «있다»(이 항이 [C2] 의 전제다)');
  ok(C.fxl.length > 0, '[C2] 그 보상은 종전 그대로 팝업 **위**(#fxl)에서 난다 — ' + C.fxl.length + '개 (이 항이 없으면 «다 내려 버리는» 수리와 구별되지 않는다 · 518 [C2] 와 같은 못)');

  /* ── [D] 메인 화면 회귀 ───────────────────────────────────────────────── */
  console.log('\n[D] 덮는 층이 없으면 종전 그대로 — 58·93·518 [D2] 회귀');
  const D = await cur.run({ open: 'main', origin: 'none' });
  ok(D.covered === false, '[D1] 메인 화면에는 «덮는 층» 이 없다 — fxCovered()=' + D.covered);
  ok(D.fxl.length > 0, '[D2] 발원 불명이어도 메인에서는 종전 그대로 #fxl · .ui — ' + D.fxl.length + '개 ' + JSON.stringify(D.fxl.map(d => d.cls)));
  ok(D.fxl.some(d => /\bui\b/.test(d.cls)), '[D3] 그 노드에 «UI 발» 표시가 그대로 붙는다(층만 바뀌는 수리가 아니라 **덮는 층에서만** 바뀐다)');

  /* ── [E] 왜 층을 내려야 하는가 — 폴백 자리 ────────────────────────────── */
  console.log('\n[E] 폴백 자리 — «발원 불명» 의 기본 자리가 팝업 안 이웃 행 위다');
  const node = B.fxlc[0] || B.fxl[0];
  ok(!!(B.row && node && node.r), '[E1] 이웃 «' + ((B.row && B.row.n) || '?').trim() + '» 행과 사본의 상자를 둘 다 쟀다 — 행 ' + JSON.stringify(B.row) + ' · 사본 ' + JSON.stringify(node && node.r));
  const inRow = !!(B.row && node && node.r
    && node.r.y + node.r.h > B.row.y && node.r.y < B.row.y + B.row.h);
  ok(inRow, '[E2] 사본의 세로 상자가 그 행 «안» 이다 — 값이 하나도 안 바뀐 행이 «+1,000,000» 을 말하게 되는 자리(58·93 «남의 카드가 내 결과를 말한다»)');

  /* ── [F] 자(cap491) — 없는 사건을 만들지 않는다 ───────────────────────── */
  console.log('\n[F] 자 — cap491 의 되돌림이 조용한가 · 두 층을 같이 비우는가');
  const cap = fs.readFileSync(CAP, 'utf8');
  ok(/fxSeen\.tstone\s*=\s*S\.tstone/.test(cap),
     '[F1] 2패스 재고 되돌림이 감시자 기준선을 같이 옮긴다 = 하네스의 사정이 «획득» 으로 안 읽힌다');
  ok((cap.match(/for \(const id of \['fxl', 'fxlc'\]\)/g) || []).length === 2,
     '[F2] 층을 비우는 두 자리가 **둘 다** `#fxl`·`#fxlc` 를 같이 비운다(6·8회차는 한 층만 비웠다)');
  ok(/for \(const k in fxSeen\)/.test(cap),
     '[F3] 장면 시작 전 재고 «채우기» 도 기준선을 맞춘다(안 맞추면 1번 장면에 사본이 얹힌다)');
  const F = await cur.p.evaluate(async () => {
    const raf = () => new Promise(r => requestAnimationFrame(r));
    document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
    await new Promise(r => setTimeout(r, 700));
    document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
    /* cap491 이 하는 그대로 — 값을 되돌리고 기준선을 같이 옮긴다 */
    S.tstone = 1e6; if (typeof fxSeen === 'object' && fxSeen) fxSeen.tstone = S.tstone;
    for (let i = 0; i < 10; i++) await raf();
    await new Promise(r => setTimeout(r, 300));
    return document.querySelectorAll('#fxl .fx-plus, #fxlc .fx-plus').length;
  });
  ok(F === 0, '[F4] 그 되돌림을 실제로 돌리면 «+n» 이 한 개도 안 난다 — ' + F + '개');

  ok(cur.errs.length === 0, '[X] 콘솔 에러 0건 — ' + JSON.stringify(cur.errs.slice(0, 3)));

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 가드를 518 판(`from.tap` 만)으로 되돌린 사본');
  const rev = await boot(ctx, 'file://' + revPath);
  const R = await rev.run({ open: 'train', origin: 'none' });
  ok(R.covered === true && R.snapNull === true, '[R1] 되돌린 사본도 같은 조건이다(덮는 층 있음 · 스냅샷 null)');
  ok(R.fxl.length > 0, '[R2] 그 사본에서는 사본이 다시 팝업 **위**(#fxl)로 간다 — ' + R.fxl.length + '개 ' + JSON.stringify(R.fxl.map(d => d.cls)) + ' (무르게 푼 수리가 아님을 이 항이 못박는다)');
  const rNode = R.fxl[0];
  const rInRow = !!(R.row && rNode && rNode.r && rNode.r.y + rNode.r.h > R.row.y && rNode.r.y < R.row.y + R.row.h);
  ok(rInRow, '[R3] 그리고 그 자리가 등재문이 본 자리 — 이웃 «' + ((R.row && R.row.n) || '?').trim() + '» 행 안 ' + JSON.stringify(rNode && rNode.r));

  await browser.close();
  console.log('\nVERIFY578 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
