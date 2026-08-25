#!/usr/bin/env node
/* 작업 107 검증 게이트 — «시트를 아래로 끌어도 자꾸 위로 되돌아간다» 버그
 *
 *   node tools/verify107.js
 *
 * 원인(PROGRESS 107): loop() 의 `uiT > 0.35` 가 **uiDirty 와 무관하게** renderUI() 를 돌리고,
 * renderUI 가 07 스킬·26 동료·50 코스튬·성장·던전 본문을 setBody() 로 통째로 다시 그린다.
 * 새 노드는 scrollTop 0 에서 시작한다. 옛 setBody 는 `.shsc` **하나만** 복원해서
 * 그 «안» 격자(`.sk-gp` — 86 스킬 24종·87 코스튬 50종)가 매 틱 0 으로 튀었다.
 *
 * 수정(index.html setBody 절 «107»): ① 내용이 같으면 DOM 을 안 갈아끼운다
 * ② 갈아끼울 때 본문 안 **모든** 스크롤러를 자식 인덱스 경로로 복원 ③ 포인터를 쥔 동안 보류.
 *
 * 검사 항목
 *   [A] 유휴 재생성 0회 — 시트를 열어 둔 채 3초 동안 본문 childList 변이가 0건
 *       (= 스크롤이 튈 기회 자체가 사라졌다. 옛 빌드는 8~9회)
 *   [B] 스크롤 유지(강제 renderUI 10회) — 격자 scrollTop 이 설정값 그대로
 *   [C] 스크롤 유지(전투 30초) — 실제 게임 루프를 그대로 돌린 뒤에도 그대로
 *   [D] 구조가 «실제로» 바뀌는 재렌더(장착/해제) 뒤에도 스크롤 유지 — ② 경로 검사
 *   [E] 포인터를 쥔 «동안» 재생성 보류 — 누른 채 상태를 바꿔도 변이 0건, 떼면 반영
 *   [F] 값 갱신 회귀 — ① 이 UI 를 얼리지 않는다(골드를 바꾸면 성장 탭 표시가 따라온다)
 *   [G] 형제 시트 점검표(지시 ④) — 26 동료·50 코스튬·성장·던전·06 장비·10 상점
 *   [I] 실제 마우스 드래그 — 끌고 손을 뗀 뒤 3초 동안 되돌아가지 않는다(주인 보고 그대로 재현)
 *   [H] 콘솔 에러 / pageerror 0건
 * 통과: 실패 0건
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음 — npm i --no-save playwright@1.56.0'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {}
  return {};
}

/* 페이지 안에 심는 헬퍼 — 본문 childList 변이 카운터(= 실제 재생성 횟수) */
const HELPERS = `
  window.__mo = (sel) => {
    const el = sel[0] === '#' && !/[ .>]/.test(sel) ? document.getElementById(sel.slice(1))
                                                    : document.querySelector(sel);
    if(window.__moOb) window.__moOb.disconnect();
    window.__moN = 0;
    if(!el) return false;
    window.__moOb = new MutationObserver(ms => { for(const m of ms) if(m.type === 'childList') window.__moN++; });
    window.__moOb.observe(el, { childList:true });
    return true;
  };
  window.__sc = (sel) => { const n = document.querySelector(sel); return n ? Math.round(n.scrollTop) : -1; };
  window.__max = (sel) => { const n = document.querySelector(sel); return n ? n.scrollHeight - n.clientHeight : -1; };
`;

async function fresh(br, frameH) {
  const ctx = await br.newContext({ viewport: { width: 1080, height: frameH || 2280 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await pg.goto(URL);
  await pg.waitForTimeout(2600);
  await pg.evaluate(HELPERS);
  return { ctx, pg, errs };
}

/* 스크롤이 «가능한» 상태를 만든다 — 스킬 24종·코스튬 50종은 기본 데이터로 이미 넘친다.
   격자에 여유가 없으면(max 0) 그 화면은 스크롤 항목을 건너뛰고 재생성 항목만 본다. */
async function openSheet(pg, expr) {
  await pg.evaluate(e => { eval(e); }, expr);
  await pg.waitForTimeout(800);
}

(async () => {
  const br = await chromium.launch(launchOpts());
  const allErrs = [];

  /* ---------------- [A][B][C][D][E] 07 스킬 시트 ---------------- */
  {
    console.log('\n[07 스킬 시트 — 주인이 보고한 화면]');
    const { ctx, pg, errs } = await fresh(br);
    await openSheet(pg, `gmHero('sk')`);

    const max = await pg.evaluate(`window.__max('#bSk .sk-gp')`);
    if (max <= 0) fail('07 격자에 스크롤 여지가 없다(max ' + max + ') — 표본으로 못 쓴다');
    else ok('07 격자 스크롤 여지 ' + max + 'px');

    /* [A] 유휴 3초 재생성 횟수 */
    await pg.evaluate(`window.__mo('#bSk')`);
    await pg.waitForTimeout(3000);
    const idleN = await pg.evaluate(`window.__moN`);
    if (idleN === 0) ok('[A] 유휴 3초 재생성 0회 (renderUI 는 8~9회 돌았다)');
    else fail('[A] 유휴 3초 동안 본문이 ' + idleN + '회 재생성됐다 — 스크롤이 튈 자리가 남아 있다');

    /* [B] 강제 renderUI 10회 */
    const b = await pg.evaluate(async () => {
      const gp = document.querySelector('#bSk .sk-gp');
      gp.scrollTop = 600;
      const set = Math.round(gp.scrollTop);
      for (let i = 0; i < 10; i++) { uiDirty = true; renderUI(); await new Promise(r => setTimeout(r, 30)); }
      return { set, now: Math.round(document.querySelector('#bSk .sk-gp').scrollTop) };
    });
    if (b.now === b.set) ok('[B] renderUI 10회 후 scrollTop ' + b.now + ' 유지');
    else fail('[B] renderUI 10회 후 scrollTop ' + b.set + ' → ' + b.now);

    /* [C] 전투 30초 */
    process.stdout.write('  … 전투 30초 대기\n');
    await pg.waitForTimeout(30000);
    const c = await pg.evaluate(`window.__sc('#bSk .sk-gp')`);
    if (c === b.set) ok('[C] 전투 30초 후 scrollTop ' + c + ' 유지');
    else fail('[C] 전투 30초 후 scrollTop ' + b.set + ' → ' + c);

    /* [D] 장착/해제 = 구조가 실제로 바뀌는 재렌더 */
    const d = await pg.evaluate(async () => {
      /* 기본 세이브는 slash 1종만 보유(그것도 장착 중)이라 «장착 가능한 카드» 가 없다.
         25 교훈 6-① 대로 S.own[id] 는 숫자가 아니라 {n,l} 객체다.
         (105 로 자동 장착이 폐기돼 «해제가 2초 뒤 되돌아오는» 함정은 더 없다) */
      const spare = SKILLS.find(s => !has(s.id));
      if (spare) { S.own[spare.id] = { n: 0, l: 1 }; }
      renderSkill();
      await new Promise(r => setTimeout(r, 60));
      const gp0 = document.querySelector('#bSk .sk-gp');
      gp0.scrollTop = 400;
      const set = Math.round(gp0.scrollTop);
      /* 보유한 스킬 중 «장착 중이 아닌» 카드를 골라 장착 → 해제 */
      const card = [...document.querySelectorAll('#bSk .sk-card:not(.lk):not(.dim) [data-skeq]')][0];
      if (!card) return { set, err: '장착 가능한 카드 없음' };
      const id = card.dataset.skeq;
      card.click();
      await new Promise(r => setTimeout(r, 60));
      const mid = Math.round(document.querySelector('#bSk .sk-gp').scrollTop);
      const un = document.querySelector('#bSk [data-skeq="' + id + '"]');
      if (un) un.click();
      await new Promise(r => setTimeout(r, 60));
      return { set, mid, end: Math.round(document.querySelector('#bSk .sk-gp').scrollTop) };
    });
    if (d.err) fail('[D] ' + d.err);
    else if (d.mid === d.set && d.end === d.set) ok('[D] 장착·해제 재렌더 뒤에도 scrollTop ' + d.set + ' 유지');
    else fail('[D] 장착 ' + d.set + '→' + d.mid + ' · 해제 →' + d.end);

    /* [E] 포인터를 쥔 동안 재생성 보류 */
    const e = await pg.evaluate(async () => {
      const gp = document.querySelector('#bSk .sk-gp');
      const r = gp.getBoundingClientRect();
      window.__mo('#bSk');
      /* 격자 위에서 pointerdown — 뗄 때까지 재생성이 미뤄져야 한다 */
      gp.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 7, isPrimary: true }));
      S.gold += 1e9;                       /* 본문 문자열이 실제로 달라지는 변화는 아니지만 */
      S.own.slash.n += 5;                  /* 이건 스킬 카드의 조각 수를 바꾼다 = HTML 이 달라진다 */
      for (let i = 0; i < 6; i++) { renderSkill(); await new Promise(r2 => setTimeout(r2, 20)); }
      const held = window.__moN;
      dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, isPrimary: true }));
      renderSkill();
      await new Promise(r2 => setTimeout(r2, 40));
      return { held, after: window.__moN };
    });
    if (e.held === 0) ok('[E] 포인터를 쥔 동안 재생성 0회');
    else fail('[E] 포인터를 쥔 동안 ' + e.held + '회 재생성됐다 (드래그 중 노드가 날아간다)');
    if (e.after > 0) ok('[E] 떼면 곧바로 반영(변이 ' + e.after + '회)');
    else fail('[E] 포인터를 뗐는데도 갱신이 안 붙었다 — 보류가 안 풀린다');

    /* [I] 주인이 실제로 한 조작 그대로 — 진짜 마우스로 아래로 끌고, 손을 뗀 뒤 3초 지켜본다.
           («아래로 끌었는데 자꾸 위로 올라간다» 를 합성 이벤트가 아닌 입력으로 재현) */
    await pg.evaluate(() => { document.querySelector('#bSk .sk-gp').scrollTop = 0; });
    const box = await pg.evaluate(() => {
      const r = document.querySelector('#bSk .sk-gp').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
    });
    await pg.mouse.move(box.x, box.y + box.h * 0.35);
    await pg.mouse.down();
    for (let i = 1; i <= 8; i++) { await pg.mouse.move(box.x, box.y + box.h * 0.35 - i * 40); await pg.waitForTimeout(16); }
    await pg.mouse.up();
    await pg.waitForTimeout(900);                       /* 95 관성이 멎을 때까지 */
    const dragged = await pg.evaluate(`window.__sc('#bSk .sk-gp')`);
    await pg.waitForTimeout(3000);                      /* renderUI 가 8~9회 도는 동안 */
    const after = await pg.evaluate(`window.__sc('#bSk .sk-gp')`);
    if (dragged <= 0) fail('[I] 마우스 드래그로 스크롤이 아예 안 됐다(scrollTop ' + dragged + ') — 95 회귀');
    else if (after === dragged) ok('[I] 마우스 드래그 ' + dragged + 'px → 3초 뒤에도 ' + after + ' (되돌아가지 않음)');
    else fail('[I] 드래그 ' + dragged + ' → 3초 뒤 ' + after + ' 로 되돌아갔다 (주인이 보고한 증상)');

    allErrs.push(...errs);
    await ctx.close();
  }

  /* ---------------- [F] 값 갱신 회귀 ---------------- */
  {
    console.log('\n[F] 값 갱신 회귀 — «내용이 같으면 건너뛴다» 가 UI 를 얼리지 않는가');
    const { ctx, pg, errs } = await fresh(br);
    await openSheet(pg, `goTab('grow', true)`);   /* 성장 패널(#bUp) 은 forceOpen 으로만 열린다 — 무인자 goTab('grow') 는 23 훈련 시트로 간다 */
    const f = await pg.evaluate(async () => {
      /* 강화 카드의 «비용» 은 골드와 무관하고, 골드로 바뀌는 것은 «살 수 있음»(.no 클래스)이다.
         43 교훈 1 — 내가 쓴 assert 도 기준을 먼저 확인할 것. textContent 로는 안 잡힌다. */
      const sig = () => document.getElementById('bUp').innerHTML;
      S.gold = 0; uiDirty = true; renderUI();
      await new Promise(r => setTimeout(r, 60));
      const a = sig();
      S.gold = 1e12; uiDirty = true; renderUI();
      await new Promise(r => setTimeout(r, 60));
      const b = sig();
      /* 스킬 시트도 같이 — 조각을 넣으면 카드 진행바 문자열이 바뀌어야 한다 */
      gmHero('sk');
      await new Promise(r => setTimeout(r, 300));
      const c = document.getElementById('bSk').textContent.replace(/\s+/g, ' ');
      S.own.slash.n += 3; renderSkill();
      await new Promise(r => setTimeout(r, 60));
      const d = document.getElementById('bSk').textContent.replace(/\s+/g, ' ');
      return { upChanged: a !== b, skChanged: c !== d };
    });
    if (f.upChanged) ok('[F] 골드 변동 → 성장 탭 표시 갱신됨');
    else fail('[F] 골드를 크게 바꿨는데 성장 탭 표시가 그대로다 — 갱신이 얼었다');
    if (f.skChanged) ok('[F] 조각 획득 → 스킬 카드 표시 갱신됨');
    else fail('[F] 조각을 넣었는데 스킬 카드 표시가 그대로다 — 갱신이 얼었다');
    allErrs.push(...errs);
    await ctx.close();
  }

  /* ---------------- [G] 형제 시트 점검표 ---------------- */
  {
    console.log('\n[G] 형제 시트 점검표 (지시 ④)');
    /* [이름, 여는 식, 스크롤러 셀렉터, 재생성 감시 대상(=본문 껍데기), 프레임 높이] */
    const SHEETS = [
      ['26 동료 격자',   `gmHero('pet')`,  '#bPet .sk-gp',    '#bPet',     2280],
      ['26 동료 본문',   `gmHero('pet')`,  '#bPet .shsc',     '#bPet',     2280],
      ['50 코스튬 격자', `gmHero('cos')`,  '#bCos .sk-gp',    '#bCos',     2280],
      ['성장(강화) 탭',  `goTab('grow', true)`, '#bUp',       '#bUp',      2280],
      ['모험(던전) 패널', `goTab('adv', true)`,  '#bDun',      '#bDun',     2280],
      /* 06 은 2280 에서 본문이 다 들어가 스크롤 여지가 없다 — 9:16(1920) 로 열어야 표본이 된다 */
      ['06 장비 시트',   `gmHero('eq')`,   '#eqw .shsc',      '#eqw .shsc-in', 1920],
      ['10 상점(소환)',  `openShopPage()`, '#shopList',       '#shopList', 2280],
      ['03 던전 리스트', `openDungeon()`,  '#dunw .dns-list', '#dunw .dns-list', 2280],
    ];
    const rows = [];
    for (const [name, open, sel, body, fh] of SHEETS) {
      const { ctx, pg, errs } = await fresh(br, fh);
      await openSheet(pg, open);
      const r = await pg.evaluate(async ([sel, body]) => {
        const max = window.__max(sel);
        let idle = null;
        if (body && window.__mo(body)) { await new Promise(r => setTimeout(r, 2000)); idle = window.__moN; }
        else await new Promise(r => setTimeout(r, 200));
        if (max <= 0) return { max, idle, set: null, end: null };
        const n = document.querySelector(sel);
        n.scrollTop = Math.min(500, max);
        const set = Math.round(n.scrollTop);
        for (let i = 0; i < 8; i++) { uiDirty = true; renderUI(); await new Promise(r => setTimeout(r, 60)); }
        return { max, idle, set, end: window.__sc(sel) };
      }, [sel, body]);
      rows.push([name, r]);
      const keep = r.set === null ? '—' : (r.end === r.set ? '유지' : r.set + '→' + r.end);
      console.log('  ' + name.padEnd(15) + ' max ' + String(r.max).padStart(5)
        + ' · 유휴 재생성 ' + (r.idle === null ? '—' : r.idle + '회')
        + ' · 스크롤 ' + keep);
      if (r.set !== null && r.end !== r.set) fail('[G] ' + name + ' 스크롤이 ' + r.set + ' → ' + r.end + ' 로 튄다');
      if (r.idle !== null && r.idle !== 0) fail('[G] ' + name + ' 유휴 2초 재생성 ' + r.idle + '회');
      allErrs.push(...errs);
      await ctx.close();
    }
    if (!fails.length) ok('[G] 점검표 전 항목 정상');
  }

  /* ---------------- [H] 콘솔 ---------------- */
  console.log('');
  const noise = allErrs.filter(e => !/favicon|ERR_FILE_NOT_FOUND|AudioContext|play\(\) failed/i.test(e));
  if (noise.length) { noise.slice(0, 6).forEach(e => fail('[H] 콘솔: ' + e)); }
  else ok('[H] 콘솔 에러 0건');

  await br.close();
  console.log('\n' + (fails.length ? 'VERIFY107 FAIL ' + fails.length + '건' : 'VERIFY107 PASS'));
  process.exit(fails.length ? 1 : 0);
})();
