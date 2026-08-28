#!/usr/bin/env node
/* 작업 262 기능 검증 — 08 세부 팝업 [강화] «꾹 누르면 연속 강화» (docs/ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify262.js
 *
 * 주인 보고: «아이템 «강화» 버튼을 꾹 눌러도 연속 강화가 안 된다 — 홀드 반복이 강화 계열에는 안 붙어 있다».
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·세이브·다른 화면에 반영됨» 을 본다.
 * 마우스 pointer 이벤트를 **진짜로** 눌렀다 떼면서(el.click() 합성 아님 — LESSONS 65-2) 확인한다:
 *   §1 진입·바인딩 · §2 단발 탭 · §3 350ms 임계 · §4 반복·가속 · §5 정지 4종
 *   §6 재료 부족 → «정확히 N회» 에서 조용히 정지 · §7 강화 계열 전수(스킬·장비·펫·코스튬)
 *   §8 «홀드 중 숫자» == «뗀 뒤 통짜 재렌더» (표기층이 두 벌로 갈라지는 것을 막는 게이트)
 *   §9 저장·다른 화면 반영 · §10 297 이후 «부품 경계»(룬·단련은 #trw 전용 홀드) · §11 콘솔 에러 0
 *
 * ⚠ 타이밍은 벽시계가 아니라 **상태 전이**(`upHold === null`)로 기다린다 — LESSONS 138-2.
 * ⚠ 결정성: 게임 루프의 `step()` 을 비워 전투·수입을 멈춘 뒤 잰다(verify64 와 같은 규약).
 */
const path = require('path');
const fs = require('fs');
const { launch: pwLaunch } = require('./pwlaunch');   /* 291 — 정착 장치 공용 부트스트랩 */
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다'); process.exit(2);
})();

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const BTN = '#mLv';
let pass = 0, fail = 0;
const errs = [];
function ok(name, cond, detail){
  if (cond) { pass++; console.log('  ✓ ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  — ' + detail : '')); }
}
function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}

/* 구 트리(홀드 없음)에서도 즉사하지 않고 «빨간» 결과를 끝까지 찍게 한다 —
   upHold 자체가 없으면 null 을 돌려 판정에서 떨어진다(verify61 §10 «게이트 즉사» 재발 방지) */
const holdIdle = page => page.evaluate(() => typeof upHold === 'undefined' ? null : upHold === null);

async function center(page, sel){
  return page.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, sel);
}
/* 버튼 중심으로 이동 → down → ms 유지 → up. 실제 pointerdown/move/up 이 나간다 */
async function hold(page, sel, ms){
  const p = await center(page, sel);
  if (!p) throw new Error('요소 없음: ' + sel);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
/* 누른 채로 «홀드가 스스로 멈출 때까지» 기다린다(시간이 아니라 상태 전이 — LESSONS 138-2).
   멈추지 않으면 timeout 뒤 그대로 뗀다(그 경우 stopped=false 로 판정에 쓴다) */
async function holdUntilStop(page, sel, timeout){
  const p = await center(page, sel);
  if (!p) throw new Error('요소 없음: ' + sel);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  let stopped = false;
  const t0 = Date.now();
  while (Date.now() - t0 < (timeout || 4000)) {
    stopped = await holdIdle(page) === true;
    if (stopped) break;
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(80);
  return stopped;
}

/* 대상 하나를 «강화 가능» 상태로 만들고 08 세부 팝업을 연다.
   kind: skill | equip | pet | cos.  frag = 조각 수(코스튬은 강화석). */
async function open(page, kind, frag){
  const r = await page.evaluate(o => {
    step = () => {};                 /* 전투·수입 정지 */
    S.autoBuy = false;
    if (o.kind === 'cos') {
      const id = AVATARS[0].id;
      if (!S.avatars || typeof S.avatars !== 'object') S.avatars = {};
      S.avatars[id] = 1; S.cosLv = S.cosLv || {}; S.cosLv[id] = 0;
      S.stone = o.frag;
      save(); showCosDetail(id);
      return { id, lv: cosLvOf(id) };
    }
    const list = o.kind === 'skill' ? SKILLS : o.kind === 'equip' ? EQUIPS : PETS;
    const id = list[0].id;
    S.own[id] = { n: o.frag, l: 1 };
    save();
    if (o.kind === 'skill') showSkillDetail(id); else showItem(id);
    return { id, lv: oLv(id) };
  }, { kind, frag });
  await page.waitForTimeout(120);
  return r;
}
const lvOf = (page, kind, id) => page.evaluate(o =>
  o.kind === 'cos' ? cosLvOf(o.id) : oLv(o.id), { kind, id });
const fragOf = (page, kind, id) => page.evaluate(o =>
  o.kind === 'cos' ? S.stone : frag(o.id), { kind, id });
/* 08 껍데기에서 «레벨을 타는» 자리를 통째로 읽는다(§8 표기 대조용) */
const face = page => page.evaluate(() => {
  const b = $('mbox'), g = s => { const n = b.querySelector(s); return n ? n.innerHTML : null; };
  const bar = b.querySelector('.sk-pb i');
  return { gr: g('.sk-gr b'), lv: g('.sk-lv b'), w: bar ? bar.style.width : null,
           pb: g('.sk-pb b'), cell: g('.sk-ct .vl .nt b'), desc: g('.sk-db p'), own: g('.sk-ow .v b') };
});

(async () => {
  /* 291 — 공용 부트스트랩을 지나가게 한다. `launch()` 가 입장 연출 «정착 장치»(settle291)를
     브라우저에 심어 주므로, 고정 대기 뒤 rect 를 재도 연출 한복판을 잡지 않는다. */
  const browser = await pwLaunch(chromium, launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* ── §1 진입·바인딩 ── */
  console.log('[1] 진입 — 08 아이템 세부 팝업의 [강화] 에 홀드가 붙어 있다');
  let t = await open(page, 'equip', 999);
  ok('08 세부 팝업 열림', await page.evaluate(() => $('modal').classList.contains('on')));
  ok('[강화] 버튼 존재 · 활성', await page.evaluate(() => { const b = $('mLv'); return !!b && !b.disabled; }));
  /* 64 교훈 2 — click 을 같이 두면 «누를 때 1 + 뗄 때 1» 로 두 번 사진다 */
  ok('[강화] 에 onclick 이 남아 있지 않다(pointerdown 전용)',
     await page.evaluate(() => $('mLv').onclick === null));
  ok('공용 홀드 상태 변수 upHold 가 있다', await holdIdle(page) !== null);

  /* ── §2 단발 탭 ── */
  console.log('[2] 단발 탭(80ms) — 1회만 강화되고 반복이 시작되지 않는다');
  t = await open(page, 'equip', 999);
  let a = await lvOf(page, 'equip', t.id), af = await fragOf(page, 'equip', t.id);
  await hold(page, BTN, 80);
  await page.waitForTimeout(600);                        /* 뗀 뒤 여유 — 반복이 남아 있으면 여기서 는다 */
  let b = await lvOf(page, 'equip', t.id), bf = await fragOf(page, 'equip', t.id);
  ok('탭 1회 = Lv +1', b - a === 1, 'Δ' + (b - a));
  ok('탭 1회 = 조각 −fragNeed(1)=2', af - bf === 2, 'Δ조각 ' + (bf - af));
  ok('뗀 뒤 600ms 동안 추가 강화 0', b - a === 1, 'Lv ' + b);

  /* ── §3 350ms 임계 ── */
  console.log('[3] 반복 시작 임계 — 300ms 는 1회, 420ms 는 2회 (TR_HOLD_DELAY 공유)');
  t = await open(page, 'equip', 999);
  a = await lvOf(page, 'equip', t.id); await hold(page, BTN, 300); await page.waitForTimeout(400);
  b = await lvOf(page, 'equip', t.id);
  ok('300ms 유지 → 1회', b - a === 1, 'Δ' + (b - a));
  t = await open(page, 'equip', 999);
  a = await lvOf(page, 'equip', t.id); await hold(page, BTN, 430); await page.waitForTimeout(400);
  b = await lvOf(page, 'equip', t.id);
  ok('430ms 유지 → 2회 (350ms 에 첫 반복)', b - a === 2, 'Δ' + (b - a));

  /* ── §4 반복·가속 ── */
  console.log('[4] 연속 강화 · 가속 (160ms → ×0.86 → 최소 60ms)');
  /* 132 교훈 — «앞 창 개수 vs 뒤 창 개수» 는 저장·렌더 비용 w 에 묻힌다. 구매 «시각» 을 직접 재서
     간격 자체를 본다(한 번의 실행 안에서 비교되므로 기계 속도에 무관하다). */
  t = await open(page, 'equip', 99999);
  await page.evaluate(() => {
    window.__t = []; window.__orig = levelUp;
    levelUp = function(it){ const r = window.__orig(it); if (r) window.__t.push(performance.now()); return r; };
  });
  await hold(page, BTN, 2200);
  await page.waitForTimeout(200);
  const ivs = await page.evaluate(() => {
    levelUp = window.__orig;
    const t = window.__t, out = [];
    for (let i = 1; i < t.length; i++) out.push(t[i] - t[i-1]);
    return out;
  });
  ok('2.2초 홀드에 8회 이상 강화', ivs.length + 1 >= 8, (ivs.length + 1) + '회');
  const first = ivs.slice(1, 3), last = ivs.slice(-3);
  const avg = x => x.reduce((s, v) => s + v, 0) / (x.length || 1);
  ok('간격이 줄어든다(가속)', avg(last) < avg(first), avg(first).toFixed(0) + 'ms → ' + avg(last).toFixed(0) + 'ms');
  ok('최소 간격 60ms 아래로 안 내려간다', ivs.slice(2).every(v => v >= 55),
     '최소 ' + Math.min.apply(null, ivs.slice(2)).toFixed(0) + 'ms');
  ok('뗀 뒤 upHold 가 비었다', await holdIdle(page) === true);

  /* ── §5 정지 4종 ── */
  console.log('[5] 정지 — 뗌 · 버튼 밖 이탈 · pointercancel · 팝업 닫힘');
  t = await open(page, 'equip', 99999);
  await hold(page, BTN, 700);
  a = await lvOf(page, 'equip', t.id);
  await page.waitForTimeout(700);
  b = await lvOf(page, 'equip', t.id);
  ok('뗌 → 그 뒤로 0회', b === a, 'Lv ' + a + ' → ' + b);

  t = await open(page, 'equip', 99999);
  let c = await center(page, BTN);
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.move(c.x, c.y - 400);                 /* 버튼 밖으로 이탈 */
  await page.waitForTimeout(60);
  const leftStopped = await holdIdle(page) === true;
  a = await lvOf(page, 'equip', t.id);
  await page.waitForTimeout(500);
  b = await lvOf(page, 'equip', t.id);
  await page.mouse.up();
  ok('버튼 밖 이탈 → 즉시 정지', leftStopped && b === a, 'Lv ' + a + ' → ' + b);

  t = await open(page, 'equip', 99999);
  c = await center(page, BTN);
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.waitForTimeout(600);
  await page.evaluate(() => dispatchEvent(new Event('pointercancel')));
  const cancelStopped = await holdIdle(page) === true;
  a = await lvOf(page, 'equip', t.id);
  await page.waitForTimeout(500);
  b = await lvOf(page, 'equip', t.id);
  await page.mouse.up();
  ok('pointercancel → 즉시 정지', cancelStopped && b === a, 'Lv ' + a + ' → ' + b);

  t = await open(page, 'equip', 99999);
  c = await center(page, BTN);
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.waitForTimeout(600);
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(300);
  const closedStopped = await holdIdle(page) === true;
  a = await lvOf(page, 'equip', t.id);
  await page.waitForTimeout(400);
  b = await lvOf(page, 'equip', t.id);
  await page.mouse.up();
  ok('팝업이 닫히면 같이 멈춘다', closedStopped && b === a, 'Lv ' + a + ' → ' + b);

  /* ── §6 재료 부족 → «정확히 N회» 에서 조용히 정지 ── */
  console.log('[6] 재료 부족 — 예산을 딱 맞춰 «정확히 3회» 에서 스스로 멈춘다(119 G4 규약: 무알림)');
  /* fragNeed: Lv1→2 = 2 · Lv2→3 = 6 · Lv3→4 = 7 · Lv4→5 = 8. 15 = 정확히 3회분 */
  t = await open(page, 'equip', 15);
  const popBefore = await page.evaluate(() => document.querySelectorAll('#fxl .toast, .toast').length);
  const stopped = await holdUntilStop(page, BTN, 5000);
  b = await lvOf(page, 'equip', t.id);
  const leftFrag = await fragOf(page, 'equip', t.id);
  ok('예산 15 → 정확히 3회', b - 1 === 3, 'Lv 1 → ' + b);
  ok('스스로 멈췄다(upHold=null)', stopped);
  ok('잔여 조각 0', leftFrag === 0, '조각 ' + leftFrag);
  ok('반복분 부족은 무알림(토스트 0)',
     (await page.evaluate(() => document.querySelectorAll('#fxl .toast, .toast').length)) === popBefore);
  ok('멈춘 뒤 [강화] 는 비활성', await page.evaluate(() => { const x = $('mLv'); return !!x && x.disabled; }));

  /* ── §7 강화 계열 전수 ── */
  console.log('[7] 계열 전수 — 08 스킬 세부 · 08 장비 세부 · 08 펫 세부 · 50 코스튬 세부');
  for (const k of ['skill', 'equip', 'pet']) {
    t = await open(page, k, 99999);
    a = await lvOf(page, k, t.id);
    await hold(page, BTN, 900);
    await page.waitForTimeout(150);
    b = await lvOf(page, k, t.id);
    ok(k + ' 세부 [강화] 홀드 900ms → 4회 이상', b - a >= 4, 'Δ' + (b - a) + ' (' + t.id + ')');
  }
  t = await open(page, 'cos', 1e9);
  a = await lvOf(page, 'cos', t.id);
  await hold(page, BTN, 900);
  await page.waitForTimeout(150);
  b = await lvOf(page, 'cos', t.id);
  ok('코스튬 세부 [강화] 홀드 900ms → 4회 이상', b - a >= 4, 'Δ' + (b - a));

  /* ── §8 홀드 중 숫자 == 뗀 뒤 통짜 재렌더 ── */
  console.log('[8] 표기 대조 — 홀드 중 «숫자만 갱신» 결과가 통짜 재렌더와 한 글자도 안 다르다');
  for (const k of ['skill', 'equip', 'pet', 'cos']) {
    t = await open(page, k, k === 'cos' ? 1e9 : 99999);
    c = await center(page, BTN);
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    await page.waitForTimeout(800);
    const live = await face(page);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const full = await face(page);
    const keys = ['gr', 'lv', 'w', 'pb', 'cell', 'desc', 'own'];
    const diff = keys.filter(x => live[x] !== full[x]);
    ok(k + ' — 홀드 중 표기 == 재렌더 표기', diff.length === 0,
       diff.length ? diff.map(x => x + ': «' + live[x] + '» vs «' + full[x] + '»').join(' / ') : keys.length + '자리 일치');
  }
  /* ⓑ 누른 노드가 홀드 내내 살아 있어야 한다(터치의 암묵적 포인터 캡처 — 64 교훈 1) */
  t = await open(page, 'equip', 99999);
  c = await center(page, BTN);
  await page.evaluate(() => { window.__btn = $('mLv'); });
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.waitForTimeout(900);
  const alive = await page.evaluate(() => window.__btn === $('mLv') && document.contains(window.__btn));
  await page.mouse.up();
  await page.waitForTimeout(200);
  const replaced = await page.evaluate(() => window.__btn !== $('mLv'));
  ok('홀드 중 [강화] 노드가 살아 있다(포인터 캡처 유지)', alive);
  ok('손을 뗀 «뒤» 에 한 번 통짜 재렌더된다', replaced);

  /* ── §9 저장·다른 화면 반영 ── */
  console.log('[9] 결과가 S·세이브·다른 화면(07 스킬 시트)·전투력에 반영된다');
  t = await open(page, 'skill', 99999);
  const cpBefore = await page.evaluate(() => cp());
  await hold(page, BTN, 900);
  await page.waitForTimeout(200);
  const lvNow = await lvOf(page, 'skill', t.id);
  const saved = await page.evaluate(o => (JSON.parse(localStorage.getItem(KEY)).own[o.id] || {}).l, { id: t.id });
  ok('세이브에 레벨이 그대로 들어갔다', saved === lvNow, 'S ' + lvNow + ' / 세이브 ' + saved);
  ok('전투력이 올랐다', (await page.evaluate(() => cp())) > cpBefore);
  const cardLv = await page.evaluate(o => {
    closeModal(); heroSubGo('sk'); renderSkill();
    const card = document.querySelector('#bSk [data-skit="' + o.id + '"] .sk-clv, #bSk [data-skit="' + o.id + '"] u');
    return card ? card.textContent.replace(/[^0-9]/g, '') : null;
  }, { id: t.id });
  ok('07 스킬 시트 카드가 같은 레벨을 말한다', cardLv === String(lvNow), '카드 «' + cardLv + '» / S ' + lvNow);

  /* ── §10 룬·단련은 262 의 부품이 아니라 297 의 부품을 탄다 ──
     2026-08-28: 저장소 주인이 «룬 강화·단련 투자도 꾹 누르면 연속» 으로 재지시해 262 의
     «룬은 홀드 대상이 아니다» 가 뒤집혔다(작업 297). 이 절은 그 사실을 반영해 **경계**를
     잰다 — 홀드가 붙었는지는 verify203 [10]·verify210 [10] 이 실제 포인터로 재고,
     여기서는 «262 의 08 팝업 부품(bindUpHold/upHold/mdLive)이 #trw 로 새지 않았는가» 만 본다.
     두 부품은 껍데기가 다르다(#modal vs #trw) — 섞이면 팝업 닫힘 판정이 서로를 죽인다. */
  console.log('[10] 297 이후 경계 — 룬·단련은 #trw 전용 홀드(rtHoldStart)를 타고 262 부품과 섞이지 않는다');
  ok('룬 버튼이 262 의 bindUpHold 를 쓰지 않는다', !/runebuy[\s\S]{0,200}bindUpHold/.test(SRC));
  ok('단련 버튼이 262 의 bindUpHold 를 쓰지 않는다', !/tempup[\s\S]{0,200}bindUpHold/.test(SRC));
  ok('룬·단련 홀드는 #trw 전용 부품(rtHoldStart)에 있다',
    /function rtHoldStart\(/.test(SRC) && /rtRuneHold\(/.test(SRC) && /rtTemperHold\(/.test(SRC));
  ok('두 부품이 같은 손맛 상수(TR_HOLD_*)를 공유한다',
    /rtHoldTick[\s\S]{0,400}TR_HOLD_IVMIN[\s\S]{0,120}TR_HOLD_ACCEL/.test(SRC)
    && /rtHold\.timer\s*=\s*setTimeout\(rtHoldTick,\s*TR_HOLD_DELAY\)/.test(SRC));
  ok('08 팝업 홀드(upHold)는 여전히 #modal 로 멈춘다(경계 유지)',
    /function upHoldTick[\s\S]{0,200}\$\('modal'\)/.test(SRC));
  ok('#trw 홀드(rtHold)는 #trw 로 멈춘다(경계 유지)',
    /function rtHoldTick[\s\S]{0,200}\$\('trw'\)/.test(SRC));

  /* ── §11 콘솔 ── */
  console.log('[11] 콘솔 에러');
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY262 ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
