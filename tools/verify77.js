#!/usr/bin/env node
/* 77 검증 — 전투 발(發) 재화 연출은 팝업 아래(#fxlc z7), UI 발은 팝업 위(#fxl z60)
 *
 *   node tools/verify77.js
 *
 * 검사 항목:
 *   [A] 단위 — fxAt(t,'combat') 태그가 fxSrc() 로 전달되는가 / 무태그는 combat 이 아닌가
 *   [B] 라우팅 — fxFly 가 combat 출발점이면 #fxlc, 아니면 #fxl 에 DOM 을 만드는가 (+n 포함)
 *   [C] 스태킹 — 대표 오버레이(상점·던전·유물·훈련·장비·소환결과·퀘스트 모달) 위에서
 *       elementFromPoint 프로브: #fxlc 의 요소는 오버레이에 가려지고 #fxl 의 요소는 위에 보이는가
 *   [D] 통합 — 상점 페이지를 연 채 실제 자동 전투 10초: 새로 생기는 .fx-fly/.fx-plus 가
 *       전부 #fxlc 에만 생기는가 (#fxl 0건)
 *   [E] 회귀 — 전투 킬을 막고 UI 힌트(fxAt 무태그) + 재화 증가 → #fxl 에 비행이 생기는가
 * 부산물: docs/shots/77-*.png (상점 열고 전투 프레임 6장 + 메인 전투 코인 3장) — 비평가 확인용
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
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SHOTS = path.resolve(__dirname, '..', 'docs', 'shots');
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  /* ---------- [A] 단위: fxSrc 출처 태그 ---------- */
  console.log('[A] fxSrc 출처 태그');
  {
    const r = await page.evaluate(() => {
      fxAt({ x: 100, y: 100 }, 'combat');
      const s1 = fxSrc(performance.now());
      fxAt({ x: 200, y: 200 });
      const s2 = fxSrc(performance.now());
      return { c1: !!(s1 && s1.combat), c2: !!(s2 && s2.combat) };
    });
    if (r.c1) ok('combat 태그 전달'); else fail('fxAt(t,"combat") 이 fxSrc 에 combat 을 안 넘긴다');
    if (!r.c2) ok('무태그는 combat 아님'); else fail('무태그 fxAt 인데 combat 으로 나온다');
  }

  /* ---------- [B] 라우팅: fxFly / fxPlus 레이어 선택 ---------- */
  console.log('[B] fxFly 레이어 라우팅');
  {
    const r = await page.evaluate(async () => {
      const cnt = (el) => ({ fly: el.querySelectorAll('.fx-fly').length, plus: el.querySelectorAll('.fx-plus').length });
      const L = document.getElementById('fxl'), LC = document.getElementById('fxlc');
      const b0 = cnt(L), c0 = cnt(LC);
      fxFly({ x: 540, y: 1200, combat: true }, 'gold', 100);
      const c1 = cnt(LC).fly - c0.fly;
      fxFly({ x: 540, y: 1200 }, 'gold', 100);
      const b1 = cnt(L).fly - b0.fly;
      /* +n 은 첫 도착 때 뜬다 — 0.6초 기다렸다 양쪽 레이어의 plus 를 센다 */
      await new Promise((res) => setTimeout(res, 700));
      return { combatFly: c1, uiFly: b1, combatPlus: cnt(LC).plus - c0.plus, uiPlus: cnt(L).plus - b0.plus };
    });
    if (r.combatFly > 0) ok(`combat 출발 → #fxlc (${r.combatFly}개)`); else fail('combat 출발인데 #fxlc 에 fly 가 없다');
    if (r.uiFly > 0) ok(`UI 출발 → #fxl (${r.uiFly}개)`); else fail('UI 출발인데 #fxl 에 fly 가 없다');
    if (r.combatPlus > 0) ok('combat +n → #fxlc'); else fail('combat 묶음의 +n 이 #fxlc 에 없다');
    if (r.uiPlus > 0) ok('UI +n → #fxl'); else fail('UI 묶음의 +n 이 #fxl 에 없다');
  }

  /* ---------- [C] 스태킹: 오버레이가 #fxlc 를 덮고 #fxl 은 못 덮는가 ---------- */
  console.log('[C] 오버레이 스태킹 프로브');
  const OVS = [
    { id: 'shopw', open: 'openShopPage()' },
    { id: 'dunw', open: 'openDungeon()' },
    { id: 'relw', open: 'openRelw()' },   /* 89 로 교체된 유물 페이지. 옛 이름 #relicw/openRelicPage() 는 존재한 적 없다(작업 130) */
    { id: 'trw', open: null },     /* 클래스 토글만으로 표시 */
    { id: 'eqw', open: null },
    { id: 'sumw', open: null },
    { id: 'mbox', open: 'openMail()' }, /* A5 공용 모달(우편) — .modal 계열 대표 */
  ];
  for (const ov of OVS) {
    const r = await page.evaluate(async ({ id, open }) => {
      const probe = (lay) => {
        const el = document.createElement('s');
        el.style.cssText = 'position:absolute;left:340px;top:1000px;width:400px;height:400px;'
          + 'background:#f0f;pointer-events:auto;z-index:0';
        el.id = 'probe77';
        lay.appendChild(el);
        return el;
      };
      const target = document.getElementById(id) || document.querySelector('.' + id);
      let shown = null;
      /* 130 — 60(쥬시니스)이 오버레이에 300~450ms 페이드를 달아서 고정 250ms 로는
         «앞 오버레이가 아직 닫히는 중 · 새 오버레이는 opacity 0.5» 인 순간을 재게 된다.
         (실측: openShopPage 직후 100ms 에 shopw opacity 0.00, closeShopPage 뒤 150ms 까지 shopw 가 여전히 block/1.00)
         고정 대기 대신 «가라앉을 때까지» 폴링한다. */
      /* ⚠ 폴링은 «프레임을 넘겨» 두 번 연속 참일 때만 인정한다. jz 애니메이션은 클래스를 붙인
         직후의 첫 스타일 계산에서는 아직 «효과 밖»이라 기저값(opacity 1)이 읽히고, 다음 프레임에
         비로소 0% 키프레임(opacity 0)이 걸린다 — 한 번만 재면 그 «가짜 1» 을 붙잡는다. */
      const settle = async (test, ms) => {
        let hit = 0;
        for (let t = 0; t < ms; t += 50) {
          if (test()) { if (++hit >= 2) return true; } else hit = 0;
          await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 50)));
        }
        return test();
      };
      const anims = (el) => { try { return el.getAnimations().filter((a) => a.playState === 'running').length; } catch (_) { return 0; } };
      const vis = (el) => { if (!el) return false; const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.05; };
      try {
        /* 앞 항목의 닫힘 애니메이션이 끝나기를 먼저 기다린다 — 안 그러면 앞 오버레이를 재게 된다 */
        await settle(() => !['shopw', 'dunw', 'relw', 'trw', 'eqw', 'sumw', 'mbox'].some((o) => o !== id && vis(document.getElementById(o))), 2500);
        if (open) { eval(open); }
        else if (target) { target.classList.add('on'); if (getComputedStyle(target).display === 'none') target.style.display = 'block'; }
        /* 열림 애니메이션이 «끝나서»(러닝 애니메이션 0 · opacity ≥ .95) 실제로 화면을 덮을 때까지 */
        await settle(() => target && getComputedStyle(target).display !== 'none'
          && anims(target) === 0 && parseFloat(getComputedStyle(target).opacity) >= 0.95, 2500);
        const box = target ? target.getBoundingClientRect() : null;
        if (!target || !box || box.width < 10) return { skip: '오버레이가 안 열림' };
        /* 프로브 지점: 오버레이 박스 안쪽 중심 (프레임 px 그대로 — fit() 스케일을 뷰포트 좌표로 환산) */
        const app = document.getElementById('app').getBoundingClientRect();
        const sc = app.width / 1080;
        const px = box.left + box.width / 2, py = box.top + box.height / 2;
        const under = probe(document.getElementById('fxlc'));
        const hitC = document.elementFromPoint(px, py);
        const underCovered = !under.contains(hitC) && hitC !== under;
        /* 130 — «무언가에 가려짐» 이 아니라 «그 오버레이에 가려짐» 인지까지 본다.
           이름이 틀린 게이트가 skip 으로 조용히 흘러가던 사고(#relicw)의 재발 방지:
           오버레이가 안 열려도 다른 무엇이 점을 덮으면 underCovered 는 참이 될 수 있다. */
        const byTarget = !!(hitC && (hitC === target || target.contains(hitC)));
        const cs = getComputedStyle(target);
        const reallyShown = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
        under.remove();
        const over = probe(document.getElementById('fxl'));
        /* #fxl 프로브가 그 점을 덮는지 — 프로브 박스가 점을 포함하게 좌표를 프레임 px 로 재배치 */
        over.style.left = ((px - app.left) / sc - 200) + 'px';
        over.style.top = ((py - app.top) / sc - 200) + 'px';
        const hitU = document.elementFromPoint(px, py);
        const overVisible = hitU === over;
        over.remove();
        return { underCovered, overVisible, byTarget, reallyShown, hit: hitC ? (hitC.id || hitC.className || hitC.tagName) : null };
      } finally {
        if (open === 'openShopPage()' && typeof closeShopPage === 'function') closeShopPage();
        else if (open === 'openDungeon()' && typeof closeDungeon === 'function') closeDungeon();
        else if (open === 'openRelw()' && typeof closeRelw === 'function') closeRelw();
        else if (id === 'mbox') { if (typeof closeModal === 'function') closeModal(); }
        else if (target) { target.classList.remove('on'); target.style.display = ''; }
        const p = document.getElementById('probe77'); if (p) p.remove();
      }
    }, ov).catch((e) => ({ skip: String(e) }));
    if (r.skip) { fail(`${ov.id}: 프로브 불가 — ${r.skip}`); continue; }
    /* 130 — 실제로 그 오버레이가 열려 점을 덮고 있는지(= 이 검사가 헛돌지 않는지) 먼저 확인 */
    if (r.reallyShown && r.byTarget) ok(`${ov.id}: 오버레이가 실제로 그 점을 덮는다 (hit=${r.hit})`);
    else fail(`${ov.id}: 오버레이가 그 점을 안 덮는다 — 검사가 헛돈다 (shown=${r.reallyShown}, hit=${r.hit})`);
    if (r.underCovered) ok(`${ov.id}: #fxlc 는 아래(가려짐)`); else fail(`${ov.id}: #fxlc 프로브가 오버레이 위로 보인다`);
    if (r.overVisible) ok(`${ov.id}: #fxl 은 위(보임)`); else fail(`${ov.id}: #fxl 프로브가 오버레이에 가려진다`);
  }

  /* ---------- [D] 통합: 상점 연 채 실제 전투 10초 ---------- */
  console.log('[D] 상점 열고 자동 전투 10초 — 새 fly/plus 는 전부 #fxlc 에');
  {
    await page.evaluate(() => {
      window.__c77 = { fxl: 0, fxlc: 0 };
      const watch = (id) => new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes)
          if (n.classList && (n.classList.contains('fx-fly') || n.classList.contains('fx-plus'))) window.__c77[id]++;
      }).observe(document.getElementById(id), { childList: true });
      watch('fxl'); watch('fxlc');
      openShopPage();
    });
    fs.mkdirSync(SHOTS, { recursive: true });
    /* 전투 획득이 확실히 일어나게 킬 발생을 기다리며, 도중 프레임 6장 캡처 */
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(i ? 90 : 1600);
      await page.screenshot({ path: path.join(SHOTS, `77-shop-combat-f${i}.png`) });
    }
    await page.waitForTimeout(10000 - 1600 - 90 * 5);
    const r = await page.evaluate(() => { const c = window.__c77; const g = S.gold; return { ...c, gold: g }; });
    if (r.fxlc > 0) ok(`전투 획득 연출 ${r.fxlc}건 → #fxlc`); else fail('10초 동안 #fxlc 에 연출이 0건 (전투 획득이 없었나?)');
    if (r.fxl === 0) ok('#fxl 은 0건 (팝업 위로 새는 연출 없음)'); else fail(`#fxl 에 ${r.fxl}건 — 팝업 위로 뚫는 연출이 남아 있다`);
    await page.evaluate(() => closeShopPage());
  }

  /* ---------- [E] 회귀: UI 발은 여전히 #fxl(팝업 위) ---------- */
  console.log('[E] UI 발 회귀 — 킬 차단 후 UI 힌트 + 재화 증가');
  {
    const r = await page.evaluate(async () => {
      const realKill = killEnemy; killEnemy = () => {};        /* 전투 획득이 끼어들지 못하게 */
      try {
        /* 직전 전투 비행이 공중에 있으면 FXFLY_MAX 여유가 0 이라 새 묶음이 안 뜬다 — 착지를 기다린다 */
        await new Promise((res) => setTimeout(res, 1000));
        /* 코인 DOM 은 착지 후 바로 제거된다(수명 ~0.6s) — 잔존 수가 아니라 «생성» 을 센다 */
        const made = { fxl: 0, fxlc: 0 };
        const watch = (id) => new MutationObserver((ms) => {
          for (const m of ms) for (const n of m.addedNodes)
            if (n.classList && n.classList.contains('fx-fly')) made[id]++;
        }).observe(document.getElementById(id), { childList: true });
        watch('fxl'); watch('fxlc');
        fxAt(document.getElementById('menub'));                /* UI 힌트(무태그) */
        S.gold += 12345;
        await new Promise((res) => setTimeout(res, 600));
        return { ui: made.fxl, combat: made.fxlc };
      } finally { killEnemy = realKill; }
    });
    if (r.ui > 0) ok(`UI 획득 → #fxl (${r.ui}개, 팝업 위 정상)`); else fail('UI 획득인데 #fxl 에 비행이 없다');
    if (r.combat === 0) ok('#fxlc 에는 안 감'); else fail('UI 획득이 #fxlc 로 갔다');
  }

  /* ---------- 메인 화면(팝업 없음)에서 전투 코인이 보이는지 ---------- */
  console.log('[F] 메인 화면 — 전투 코인 정상 표시(양성 증거)');
  {
    const flying = await page.evaluate(async () => {
      if (typeof closeModal === 'function') closeModal();     /* 앞 검사에서 열린 게 남아 있으면 닫는다 */
      ['shopw', 'dunw', 'relw', 'trw', 'eqw', 'sumw', 'bagw', 'mnw'].forEach((id) => {
        const el = document.getElementById(id); if (el) { el.classList.remove('on'); el.style.display = ''; }
      });
      await new Promise((res) => setTimeout(res, 300));
      /* 착지 대기 후 전투 발 획득을 강제 — 캡처 타이밍에 확실히 공중에 있게 한다 */
      await new Promise((res) => setTimeout(res, 900));
      fxAt(fxWorld(player.x, player.y - 40), 'combat');
      S.gold += 7777;
      await new Promise((res) => setTimeout(res, 160));
      return document.getElementById('fxlc').querySelectorAll('.fx-fly').length;
    });
    if (flying > 0) ok(`팝업 없는 화면에서 전투 코인 ${flying}개 공중(#fxlc 표시 중)`);
    else fail('강제 전투 획득인데 #fxlc 에 공중 코인이 없다');
    for (let i = 0; i < 3; i++) {
      await page.screenshot({ path: path.join(SHOTS, `77-main-combat-f${i}.png`) });
      await page.waitForTimeout(90);
    }
  }

  if (errs.length) errs.forEach((e) => fail(e)); else ok('콘솔 에러 0');
  await ctx.close(); await browser.close();
  console.log('');
  if (fails.length) { console.log(`VERIFY77 FAIL (${fails.length})`); process.exit(1); }
  console.log('VERIFY77 PASS');
})().catch((e) => { console.error(e); process.exit(1); });
