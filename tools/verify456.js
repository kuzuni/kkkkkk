#!/usr/bin/env node
/* 456 검증 — 34 축복: **지속 시간은 레벨과 무관하게 언제나 30분** (저장소 주인 지시 2026-08-30, 117 개정)
 *
 *   node tools/verify456.js
 *
 * 주인 원문: «축복은 늘 30분으로 해줘 렙업되도».
 * 수리 전: `blessDur() = BLESS_BASE + BLESS_PERLV × (blessLv() − 1)` → Lv1 30분 · Lv2 35분 … Lv51 280분.
 * 수리 후: `blessDur() = BLESS_BASE` 한 값. 레벨이 사는 곳은 **효과 배율**(`blessScale()`) 하나다.
 *
 *   [A] 선언 — 소스에 폐기 식별자 0건 · `blessDur()` 이 레벨을 안 읽는다 · BLESS_BASE = 30분
 *   [B] 지속 — Lv1·Lv2(4번째 활성)·Lv10·Lv51 에서 `activateBless` 직후 남은 시간이 **전부 30분**
 *   [C] 레벨이 죽지 않았다 — `blessScale()`/`blessPct()` 는 117 곡선 그대로(Lv10 1.90 · Lv51 6.00)
 *   [D] 오프라인 자동 축복 — `autoBlessSettle()` 의 발동 시각이 30분 등간격(레벨이 올라도 안 밀린다)
 *   [E] 화면 — 켠 직후 카드 시계가 `00:30:00` · 레벨업 토스트에 «분» 증가 표현 0건
 *   [R] 되돌림 시험 — 옛 곡선을 다시 깔면 [B]·[E] 가 **실제로 빨개진다**(걷으면 초록)
 *   [J] 콘솔 에러 0건
 *
 * ⚠ [A] 가 «소스에 그 이름 0건» 을 통짜로 물으므로 **주석에도 그 식별자를 쓰지 않는다** —
 *    index.html 의 456 주석이 그래서 폐기 식별자를 이름으로 안 적는다(LESSONS 295-② · 277 «폐기 식별자» 방식).
 * ⚠ [B] 는 «값이 30분» 만 묻지 않는다. 그것만 물으면 `blessDur()` 이 레벨을 읽으면서 우연히 같은 값을
 *    내는 식(예: `BASE + 0 × lv`)도 초록이다 — [A2] 가 **함수 본문**을, [R] 이 **되돌림**을 같이 못박는다.
 * ⚠ 세이브 이관은 «없음» 이 정답이다(등재문 ④) — 이미 켜져 있는 `S.bless.exp[k]` 는 안 건드리고
 *    **다음 활성화부터** 30분이다. [G] 가 «구 세이브의 긴 만료 시각이 그대로 살아 있다» 로 그것을 못박는다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const MIN = 60 * 1000, DUR = 30 * MIN;
const DEAD = 'BLESS_' + 'PERLV';            /* 폐기 식별자 — 이 파일에도 통짜로 안 적는다 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined && detail !== '' ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  /* ═══ [A] 선언 — 소스로 답한다(브라우저를 안 띄워도 되는 항) ═══ */
  console.log('[A] 선언 — 폐기 식별자·함수 본문·상수');
  ok(SRC.split(DEAD).length - 1 === 0, 'A1 폐기 식별자(레벨당 +N분 상수)가 소스에 0건',
     (SRC.split(DEAD).length - 1) + '건');

  const durLine = (SRC.match(/function\s+blessDur\s*\([^)]*\)\s*\{[^\n}]*\}/) || [''])[0];
  ok(/return\s+BLESS_BASE\s*;/.test(durLine) && !/blessLv|S\.bless|lv/.test(durLine),
     'A2 blessDur() 본문이 레벨을 안 읽는다 (한 값을 그대로 돌려준다)', durLine.trim() || '(못 찾음)');

  const baseDecl = (SRC.match(/const\s+BLESS_BASE\s*=\s*[^;]+;/) || [''])[0];
  ok(/30\s*\*\s*60\s*\*\s*1000/.test(baseDecl), 'A3 BLESS_BASE = 30분', baseDecl.trim() || '(못 찾음)');

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  /* 자동 구매·자동 스탯은 끈다 — 유휴 루프가 사이에 상태를 흔든다(117 헤더 주의) */
  await page.addInitScript(() => {
    try { localStorage.removeItem('idle_hunter_save_v4'); } catch (_) {}
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  /* ═══ [B] 지속 — 어느 레벨에서 켜도 30분 ═══ */
  console.log('[B] 지속 — Lv1 · Lv2(4번째 활성) · Lv10 · Lv51');
  const B = await page.evaluate((D) => {
    const out = [];
    const shot = (lv, prog, label) => {
      S.bless = { lv, prog, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
      activateBless('atk');
      out.push({ label, lv: S.bless.lv, left: blessLeft('atk'), dur: blessDur() });
    };
    shot(1, 0, 'Lv1');
    shot(1, 3, 'Lv1→Lv2 (4번째 활성)');   /* 레벨업이 «그 활성화부터» 걸리는 표본 */
    shot(10, 0, 'Lv10');
    shot(51, 0, 'Lv51 (상한)');
    return { out, D };
  }, DUR);
  B.out.forEach((r, i) => {
    ok(Math.abs(r.left - DUR) < 1500, 'B' + (i + 1) + ' ' + r.label + ' — 남은 시간 30분',
       'lv ' + r.lv + ' · ' + (r.left / MIN).toFixed(2) + '분');
  });
  const spread = Math.max(...B.out.map(r => r.dur)) - Math.min(...B.out.map(r => r.dur));
  ok(spread === 0, 'B5 네 레벨의 blessDur() 이 **한 값** (레벨 간 편차 0ms)', spread + 'ms');

  /* ═══ [C] 레벨이 죽지 않았다 — 117 효과 곡선은 그대로 ═══ */
  console.log('[C] 효과 배율은 117 곡선 그대로');
  const C = await page.evaluate(() => {
    const at = lv => { S.bless = { lv, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
      return { sc: blessScale(), pct: blessPct('atk'), gold: blessGoldPct() }; };
    return { a: at(1), b: at(10), c: at(51) };
  });
  ok(Math.abs(C.a.sc - 1.00) < 1e-9, 'C1 Lv1 배율 1.00', C.a.sc.toFixed(2));
  ok(Math.abs(C.b.sc - 1.90) < 1e-9, 'C2 Lv10 배율 1.90 (레벨당 +10%)', C.b.sc.toFixed(2));
  ok(Math.abs(C.c.sc - 6.00) < 1e-9, 'C3 Lv51 배율 6.00 (상한)', C.c.sc.toFixed(2));
  ok(Math.abs(C.b.pct - 38) < 0.01 && Math.abs(C.c.gold - 300) < 0.01,
     'C4 실효 %(카드 ⚔️ Lv10 = 38% · 보너스 Lv51 = 300%) — 레벨의 값어치가 효과로 남았다',
     C.b.pct.toFixed(1) + '% · ' + C.c.gold.toFixed(0) + '%');

  /* ═══ [D] 오프라인 자동 축복 — 발동이 30분 등간격 ═══
     레벨이 오르는 구간을 일부러 지나가게 3시간 창을 준다. 옛 곡선이면 4회마다 간격이 벌어져
     발동 수가 줄어든다 — 여기서 «시각이 안 밀린다» 를 수로 못박는다. */
  console.log('[D] 오프라인 자동 축복 — 30분 등간격');
  const D = await page.evaluate((DUR) => {
    const now = Date.now();
    const win = 3 * 3600 * 1000 - 60 * 1000;              /* 2시간 59분 — ms 지터에 안 물리게 */
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    S.pass.autoBlessUntil = now + 30 * 24 * 3600 * 1000;
    markDirty();
    const r = autoBlessSettle(now - win);
    const per = 1 + Math.floor(win / DUR);                 /* 30분 고정일 때의 닫힌 식 */
    return { fires: r && r.n, want: per * BLESS.length, lv0: r && r.lv0, lv1: r && r.lv1,
             per, exp: BLESS.map(x => S.bless.exp[x.k]) };
  }, DUR);
  ok(D.fires === D.want, 'D1 3시간 창 발동 수 = 30분 등간격의 닫힌 식', D.fires + ' / 기대 ' + D.want);
  ok(D.lv1 > D.lv0, 'D2 그 사이 레벨은 실제로 올랐다 (곡선을 지나갔다는 증거)', 'Lv' + D.lv0 + ' → Lv' + D.lv1);
  ok(D.exp.every(v => Math.abs(v - D.exp[0]) < 1500), 'D3 세 축복의 다음 만료가 같은 눈금 위에 있다',
     D.exp.map(v => v - D.exp[0]).join(','));

  /* ═══ [E] 화면 — 카드 시계·레벨업 토스트 ═══ */
  console.log('[E] 화면 — 시계 00:30:00 · 토스트에 «분» 증가 0건');
  const E = await page.evaluate(async () => {
    S.bless = { lv: 51, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); openBless();
    activateBless('atk'); renderBless();
    const clkMax = document.querySelector('#blsC_atk .tm>i').textContent.trim();
    /* 500 — «4번째 활성이 레벨업» 이 아니라 «그 레벨의 마지막 한 칸» 이다(필요량이 레벨마다 다르다).
       숫자를 손으로 안 적고 제품 접근자에서 받아 «레벨업이 걸린 활성화» 라는 뜻만 남긴다. */
    S.bless = { lv: 3, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    S.bless.prog = blessNeed() - 1; markDirty();
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    activateBless('atk'); renderBless();
    const clk1 = document.querySelector('#blsC_atk .tm>i').textContent.trim();
    await new Promise(r => setTimeout(r, 120));
    const toasts = [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).filter(s => /축복/.test(s));
    const sheet = document.getElementById('blsw').textContent;
    return { clkMax, clk1, toasts, sheet };
  });
  ok(E.clkMax === '00:30:00', 'E1 Lv51 에서 켠 직후 카드 시계가 00:30:00', E.clkMax);
  ok(E.clk1 === '00:30:00', 'E2 레벨업이 걸린 활성화에서도 00:30:00', E.clk1);
  /* 725 이관 — 토스트가 «효과 +n%» 에서 «효과 ×N배» 로 갔다. 이 항이 지키는 뜻(«효과를 말하지
     지속시간을 말하지 않는다»)은 그대로다 — 묻는 얼굴만 배율 표기로 옮긴다. */
  ok(E.toasts.length === 1 && /×[\d.,]+배/.test(E.toasts[0]) && !/분/.test(E.toasts[0]),
     'E3 레벨업 토스트는 «효과 ×N배» 한 장 — «+n분» 을 말하지 않는다', JSON.stringify(E.toasts));
  ok(!/\+\s*\d+\s*분|분\s*(증가|추가|늘)/.test(E.sheet),
     'E4 34 팝업 문구에 «지속이 는다» 표현 0건', E.sheet.replace(/\s+/g, ' ').slice(0, 60) + '…');

  /* ═══ [G] 세이브 이관 «없음» 이 정답 — 이미 켜진 축복은 안 건드린다 ═══ */
  console.log('[G] 구 세이브 — 켜져 있던 긴 만료는 그대로, 다음 활성화부터 30분');
  const G = await page.evaluate((DUR) => {
    const now = Date.now();
    const old = now + 280 * 60 * 1000;                     /* 옛 곡선 Lv51 = 280분짜리 만료 */
    S.bless = { lv: 51, prog: 0, exp: { atk: old, hp: 0, rate: 0 } }; markDirty();
    const kept = blessLeft('atk');
    const again = activateBless('atk');                    /* 켜져 있으면 false — 시간을 덧붙이지 않는다 */
    activateBless('hp');
    return { kept, again, keptAfter: blessLeft('atk'), fresh: blessLeft('hp'), DUR };
  }, DUR);
  ok(G.kept > 270 * MIN && G.again === false && Math.abs(G.keptAfter - G.kept) < 1500,
     'G1 구 세이브의 280분짜리 축복은 잘리지도 덧붙지도 않는다(이관 0줄)',
     (G.kept / MIN).toFixed(1) + '분 → ' + (G.keptAfter / MIN).toFixed(1) + '분');
  ok(Math.abs(G.fresh - DUR) < 1500, 'G2 같은 세이브에서 새로 켠 축복은 30분', (G.fresh / MIN).toFixed(2) + '분');

  /* ═══ [R] 되돌림 시험 — 옛 곡선을 다시 깔면 [B]·[E] 가 빨개진다 ═══ */
  console.log('[R] 되돌림 시험');
  const R = await page.evaluate(() => {
    const orig = window.blessDur;
    const PER = 5 * 60 * 1000;
    window.blessDur = () => 30 * 60 * 1000 + PER * (blessLv() - 1);   /* 456 이전 곡선 */
    const shot = lv => { S.bless = { lv, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
      activateBless('atk'); renderBless();
      return { left: blessLeft('atk'), clk: document.querySelector('#blsC_atk .tm>i').textContent.trim() }; };
    const broken = { a: shot(10), b: shot(51) };
    window.blessDur = orig;
    const back = { a: shot(10), b: shot(51) };
    return { broken, back };
  });
  const near30 = v => Math.abs(v - DUR) < 1500;
  ok(!near30(R.broken.a.left) && !near30(R.broken.b.left) && R.broken.b.clk !== '00:30:00',
     '[R1] 옛 곡선을 깔면 B(30분)·E(00:30:00) 가 실제로 깨진다',
     (R.broken.a.left / MIN).toFixed(0) + '분 · ' + (R.broken.b.left / MIN).toFixed(0) + '분 · 시계 ' + R.broken.b.clk);
  ok(near30(R.back.a.left) && near30(R.back.b.left) && R.back.b.clk === '00:30:00',
     '[R2] 되돌림을 걷으면 다시 초록 (시험이 상태를 안 남긴다)',
     (R.back.a.left / MIN).toFixed(2) + '분 · 시계 ' + R.back.b.clk);

  ok(errs.length === 0, '[J] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY456 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
