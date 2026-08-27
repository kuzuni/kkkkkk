#!/usr/bin/env node
/* 158 검증 — 전투 발(發) 재화 묶음은 «누적 시점의 발원» 을 지킨다.
 *   팝업 열기·닫기(✕)·하단 네비 탭이 «전투에서 번 골드» 의 출발점을 가로채면 안 된다.
 *
 *   node tools/verify158.js
 *
 * 버그(주인 보고 2026-08-27): fxSrc() 가 «명시 힌트 600ms vs 마지막 탭 1200ms» 중 더 최근 것을
 *   **발사 시점** 에 고른다. 전투 킬 골드는 fxAcc 에 최대 900ms 묶여 있다가 뒤늦게 발사되므로,
 *   그 사이에 버튼을 누르면 탭 좌표가 이겨 «누른 버튼에서 골드가 튀어나온다». combat 태그까지
 *   같이 사라져 77(전투 발은 팝업 아래 #fxlc)도 함께 깨진다.
 *
 * 검사 항목:
 *   [A] 스냅샷 단위 — 전투 킬로 누적한 뒤 탭이 들어와도 묶음의 발원이 전투 좌표·combat 태그를 유지
 *   [B] 레이어 — 그 묶음이 #fxlc(팝업 아래)에 뜬다 (#fxl 0건)
 *   [C] 출발점 좌표 — 비행 시작점이 «누른 버튼» 이 아니라 «킬 자리» 근처다
 *   [D] UI 발 회귀 — 버튼에서 준 보상은 종전대로 그 버튼에서 #fxl 로 난다 (58/93 회귀 방지)
 *   [E] 통합 — 자동 전투를 돌리며 하단 네비·팝업 ✕ 를 8초간 연타: #fxl 에 재화 비행 0건
 *   [F] 프레임 정지(227) — 킬 직후 메인 스레드가 700ms 얼어붙어도 묶음의 발원이 combat 이다
 *
 * 227(2026-08-27): [E] 가 5회 중 1회 빨갰다. 원인은 게이트가 아니라 **제품**이었다 —
 *   힌트의 «나이» 를 벽시계로 재던 `fxSrc` 가, 하단 네비를 누를 때 나는 645~803ms 짜리 프레임 정지에서
 *   전투 힌트(600ms 창)만 만료시키고 탭 힌트(1200ms 창)는 살려 «더 오래된 탭» 이 이겼다.
 *   [E] 는 그 정지가 «킬 직후» 에 걸려야만 빨개져 간헐이었으므로, 같은 실패를 **결정적으로** 세우는
 *   [F] 를 신설했다(정지를 합성한다). [E] 는 통합 스모크로 남긴다.
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
  await page.waitForTimeout(1400);

  /* 공통 하네스 — 전투 킬을 흉내내 골드를 누적시키고, 발사 전에 버튼을 탭한다.
     실제 킬 경로(killEnemy)와 같은 순서: fxAt(좌표,'combat') → S.gold += g. */
  const HARNESS = `
    window.__v158 = (async (opt) => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const raf  = () => new Promise(r => requestAnimationFrame(() => r()));
      const L = document.getElementById('fxl'), LC = document.getElementById('fxlc');
      const snap = () => ({ fl: L.querySelectorAll('.fx-fly').length, lc: LC.querySelectorAll('.fx-fly').length });
      /* 앞 검사의 잔재가 섞이지 않게 비워 두고 시작 */
      L.innerHTML = ''; LC.innerHTML = ''; fxFlies.length = 0;
      const AS = (typeof fxAccSrc !== 'undefined') ? fxAccSrc : null;   /* 158 이전 코드에도 돌려 «FAIL» 이 나오게 (게이트가 진짜인지 확인용) */
      for (const k in fxAcc) { fxAcc[k] = 0; if (AS) AS[k] = null; }
      /* 출발점은 **DOM 스폰 위치로 재지 않는다** — 93 의 3박자 «퍼짐» 이 UI 발 코인을 밴드로 흩고
         fx3Out() 이 패널 밖으로 빼기 때문에, 스폰 rect 는 발원이 아니라 연출 좌표다.
         묶음이 실제로 어떤 발원으로 발사됐는지는 fxFly(from, …) 의 인자가 유일한 진실이다. */
      if (!window.__fxWrapped) {
        window.__fxWrapped = true; window.__fxLog = [];
        const orig = window.fxFly;
        window.fxFly = function (from, cur, n) {
          window.__fxLog.push({ cur, n, combat: !!(from && from.combat),
                                x: from ? from.x : null, y: from ? from.y : null });
          return orig.apply(this, arguments);
        };
      }
      window.__fxLog.length = 0;
      const toFrame = (r) => {
        if (!r) return null;
        const app = document.getElementById('app').getBoundingClientRect();
        const sc = app.width / 1080;
        return { x: (r.left + r.width / 2 - app.left) / sc, y: (r.top + r.height / 2 - app.top) / sc };
      };
      return { wait, raf, L, LC, snap, toFrame, log: () => window.__fxLog };
    });`;
  await page.evaluate(HARNESS);

  /* ---------- [A][B][C] 전투 누적 → 탭 → 발사 ---------- */
  console.log('[A~C] 전투 누적 뒤에 탭이 들어와도 발원이 안 뺏긴다');
  {
    const r = await page.evaluate(async () => {
      const h = await window.__v158({});
      /* 전투를 멈춰 놓고(자동 킬이 섞이면 좌표가 흔들린다) 킬 1건을 손으로 흉내낸다 */
      const KX = 300, KY = 1500;
      fxAt({ x: KX, y: KY }, 'combat');
      S.gold += 777;
      await h.raf();                       /* fxWatch 가 이번 증가분을 누적(스냅샷)한다 */
      const AS = (typeof fxAccSrc !== 'undefined') ? fxAccSrc : null;
      const snapped = AS && AS.gold ? { x: AS.gold.x, y: AS.gold.y, combat: !!AS.gold.combat } : null;
      /* 발사 전에 하단 네비를 «누른다» — 종전 코드라면 이 좌표가 이긴다 */
      /* 하단 네비는 <button> 이 아니라 `.tab` div 다 — 셀렉터를 틀리면 검사가 조용히 헛돈다 */
      const btn = document.querySelector('#tabbar .tab');
      const br = btn.getBoundingClientRect();
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: br.left + br.width / 2, clientY: br.top + br.height / 2 }));
      const before = h.snap();
      /* quiet(45ms) 를 넘겨 발사시킨다 */
      await h.wait(260);
      const after = h.snap();
      const shot = h.log().find((e) => e.cur === 'gold');       /* 이 묶음이 실제로 쓴 발원 */
      const bp = h.toFrame(br);
      const d = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : -1;
      const fp = shot && shot.x != null ? { x: shot.x, y: shot.y } : null;
      return {
        snapped, shotCombat: shot ? shot.combat : null,
        newFl: after.fl - before.fl, newLc: after.lc - before.lc,
        dKill: d(fp, { x: KX, y: KY }), dTap: d(fp, bp),
      };
    });
    if (r.snapped && r.snapped.combat) ok(`누적 시점 스냅샷 = combat (${Math.round(r.snapped.x)},${Math.round(r.snapped.y)})`);
    else fail(`묶음 스냅샷이 combat 이 아니다 — ${JSON.stringify(r.snapped)}`);
    if (r.snapped && Math.abs(r.snapped.x - 300) < 2 && Math.abs(r.snapped.y - 1500) < 2) ok('스냅샷 좌표 = 킬 자리');
    else fail(`스냅샷 좌표가 킬 자리(300,1500)가 아니다 — ${JSON.stringify(r.snapped)}`);
    if (r.newLc > 0) ok(`전투 묶음 → #fxlc ${r.newLc}개 (팝업 아래)`);
    else fail('전투 묶음이 #fxlc 에 안 떴다');
    if (r.newFl === 0) ok('#fxl 0건 — 탭이 묶음을 가로채지 않았다');
    else fail(`#fxl 에 ${r.newFl}개 — 탭 좌표가 전투 골드를 가로챘다(=버그 재현)`);
    if (r.shotCombat === true) ok('발사된 묶음의 발원 = combat');
    else fail(`발사된 묶음의 발원이 combat 이 아니다 (${r.shotCombat})`);
    if (r.dKill >= 0 && r.dKill < 4) ok(`발원 좌표 = 킬 자리 (오차 ${Math.round(r.dKill)}px · 탭까지는 ${Math.round(r.dTap)}px)`);
    else fail(`발원이 «누른 버튼» 쪽이다 — 킬까지 ${Math.round(r.dKill)}px / 탭까지 ${Math.round(r.dTap)}px`);
  }

  /* ---------- [D] UI 발 회귀 ---------- */
  console.log('[D] UI 발 회귀 — 버튼 보상은 그대로 그 버튼에서 #fxl 로');
  {
    const r = await page.evaluate(async () => {
      const h = await window.__v158({});
      /* 하단 네비는 <button> 이 아니라 `.tab` div 다 — 셀렉터를 틀리면 검사가 조용히 헛돈다 */
      const btn = document.querySelector('#tabbar .tab');
      const br = btn.getBoundingClientRect();
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: br.left + br.width / 2, clientY: br.top + br.height / 2 }));
      fxAt(btn);                    /* 보상 수령 경로가 하는 일 그대로 */
      S.dia += 40;
      fxFlush();
      const before = h.snap();
      await h.wait(300);
      const after = h.snap();
      const shot = h.log().find((e) => e.cur === 'dia');
      const bp = h.toFrame(br);
      const fp = shot && shot.x != null ? { x: shot.x, y: shot.y } : null;
      return { newFl: after.fl - before.fl, newLc: after.lc - before.lc,
               shotCombat: shot ? shot.combat : null,
               dTap: fp && bp ? Math.hypot(fp.x - bp.x, fp.y - bp.y) : -1 };
    });
    if (r.newFl > 0) ok(`UI 보상 → #fxl ${r.newFl}개`); else fail('UI 보상이 #fxl 에 안 떴다');
    if (r.newLc === 0) ok('#fxlc 0건'); else fail(`UI 보상이 #fxlc 로 샜다 (${r.newLc}개)`);
    if (r.shotCombat === false) ok('발원에 combat 태그 없음 (UI 발)');
    else fail(`UI 보상인데 발원 combat 태그가 ${r.shotCombat}`);
    if (r.dTap >= 0 && r.dTap < 120) ok(`발원 좌표 = 누른 버튼 (오차 ${Math.round(r.dTap)}px)`);
    else fail(`UI 보상 발원이 버튼에서 ${Math.round(r.dTap)}px 떨어졌다`);
  }

  /* ---------- [E] 통합: 자동 전투 + 네비/팝업 연타 8초 ---------- */
  console.log('[E] 자동 전투 중 네비·팝업 ✕ 연타 8초 — #fxl 에 재화 비행 0건');
  {
    /* 앞 검사([D])의 UI 묶음이 남긴 +n·비행이 이 카운터에 섞이지 않게 가라앉힌다 */
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      document.getElementById('fxl').innerHTML = '';
      document.getElementById('fxlc').innerHTML = '';
      fxFlies.length = 0;
      window.__c158 = { fxl: 0, fxlc: 0, gold0: S.gold, seen: [] };
      const watch = (id) => new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes)
          if (n.classList && (n.classList.contains('fx-fly') || n.classList.contains('fx-plus'))) {
            window.__c158[id]++;
            if (id === 'fxl' && window.__c158.seen.length < 6)
              window.__c158.seen.push(n.className + ' @' + Math.round(performance.now()));
          }
      }).observe(document.getElementById(id), { childList: true });
      watch('fxl'); watch('fxlc');
      /* 227 — «창이 실제로 열렸나» 의 증거. 하단 네비 렌더가 메인 스레드를 얼리는 구간을 센다
         (실측 120ms 넘는 공백 13~16건 · 최대 645~803ms). 판정은 결정적인 [F] 가 하고 여기서는 기록만 한다. */
      window.__c158.gap = []; let __last = performance.now();
      (function loop(){ const n = performance.now(); if (n - __last > 120) window.__c158.gap.push(Math.round(n - __last)); __last = n; requestAnimationFrame(loop); })();
      /* 실제 자동 전투만으로는 8초에 킬 1~2건이라 «누적 중에 탭» 이라는 창이 잘 안 열린다.
         킬 경로(killEnemy)와 **같은 순서**로 합성 킬을 130ms 간격으로 넣어 그 창을 확실히 만든다:
         fxAt(전투좌표,'combat') → S.gold += g. 좌표는 전투 캔버스 한복판, 탭 지점(탭바)과 멀다. */
      window.__k158 = setInterval(() => { fxAt({ x: 540, y: 1100 }, 'combat'); S.gold += 13; }, 130);
    });
    const tabs = await page.evaluate(() => {
      const app = document.getElementById('app').getBoundingClientRect();
      return [...document.querySelectorAll('#tabbar .tab')].map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }).filter((p) => p.x > 0 && p.y > 0 && app.width > 0);
    });
    /* 셀렉터가 틀리면 «탭이 0개» 라서 아무것도 안 누르고도 «#fxl 0건» 으로 통과한다 —
       130 이 #relicw 로 겪은 «이름 틀린 게이트가 조용히 통과» 와 같은 함정. 먼저 못 박는다. */
    if (tabs.length >= 5) ok(`하단 네비 ${tabs.length}칸을 실제로 누른다`);
    else fail(`#tabbar .tab 을 ${tabs.length}개밖에 못 찾았다 — 이 검사가 헛돈다`);
    const t0 = Date.now();
    let i = 0;
    while (Date.now() - t0 < 8000) {
      const p = tabs[i++ % tabs.length];
      if (p) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); }
      await page.waitForTimeout(180);
    }
    const r = await page.evaluate(() => { clearInterval(window.__k158); return { ...window.__c158, gold: S.gold }; });
    const gained = r.gold - r.gold0;
    if (gained > 0) ok(`8초 동안 전투 골드 +${gained} 획득 (검사가 헛돌지 않는다)`);
    else fail('8초 동안 전투 골드가 0 — 자동 전투가 안 돌아 검사가 헛돈다');
    if (r.fxlc > 0) ok(`전투 연출 ${r.fxlc}건 → #fxlc`); else fail('전투 연출이 #fxlc 에 0건');
    if (r.fxl === 0) ok('#fxl 0건 — 누른 버튼에서 튀는 재화 연출 없음');
    else fail(`#fxl 에 ${r.fxl}건 — 네비·팝업 탭이 전투 골드를 가로채 팝업 위로 튄다 (${(r.seen || []).join(' · ')})`);
    const gp = r.gap || [];
    console.log(`  · 프레임 공백 ${gp.length}건 (최대 ${gp.length ? Math.max(...gp) : 0}ms) — 227 의 실패 창. 판정은 [F] 가 한다`);
  }

  /* ---------- [F] 227 — 킬 직후 프레임이 700ms 얼어붙어도 발원을 안 뺏긴다 ---------- */
  console.log('[F] 킬 직후 메인 스레드 700ms 정지 — 묶음의 발원이 combat 을 지킨다');
  {
    const r = await page.evaluate(async () => {
      const h = await window.__v158({});
      /* 실패가 났던 배치 그대로: **탭이 킬보다 먼저** 온다(실측 tapAge 887 · origAge 697).
         벽시계 나이로 재면 뒤에 온 전투 힌트가 600ms 로 먼저 죽고 앞선 탭이 1200ms 로 살아남는다. */
      const btn = document.querySelector('#tabbar .tab');
      const br = btn.getBoundingClientRect();
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: br.left + br.width / 2, clientY: br.top + br.height / 2 }));
      await h.wait(140);
      const KX = 300, KY = 1500;
      fxAt({ x: KX, y: KY }, 'combat');
      S.gold += 500;
      /* 메인 스레드를 통째로 막는다 — 무거운 패널 렌더가 실제로 하는 일. 이 동안 rAF·타이머 전부 정지. */
      const t0 = performance.now();
      while (performance.now() - t0 < 700) { /* busy */ }
      const froze = Math.round(performance.now() - t0);
      const before = h.snap();
      await h.wait(320);
      const after = h.snap();
      const shot = h.log().find((e) => e.cur === 'gold');
      const bp = h.toFrame(br);
      const fp = shot && shot.x != null ? { x: shot.x, y: shot.y } : null;
      const d = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : -1;
      return { froze, shotCombat: shot ? shot.combat : null,
               newFl: after.fl - before.fl, newLc: after.lc - before.lc,
               dKill: d(fp, { x: KX, y: KY }), dTap: d(fp, bp) };
    });
    if (r.froze >= 690) ok(`메인 스레드를 ${r.froze}ms 얼렸다 (600ms 창을 확실히 넘긴다)`);
    else fail(`정지가 ${r.froze}ms 뿐이라 이 검사가 헛돈다`);
    if (r.shotCombat === true) ok('정지 뒤 발사된 묶음의 발원 = combat');
    else fail(`정지가 발원을 뺏었다 — combat=${r.shotCombat} (킬까지 ${Math.round(r.dKill)}px / 탭까지 ${Math.round(r.dTap)}px)`);
    if (r.newLc > 0) ok(`정지 뒤 묶음 → #fxlc ${r.newLc}개 (팝업 아래)`);
    else fail('정지 뒤 묶음이 #fxlc 에 안 떴다');
    if (r.newFl === 0) ok('#fxl 0건');
    else fail(`#fxl 에 ${r.newFl}개 — 정지 동안 만료된 전투 힌트를 탭이 가로챘다(=227 재현)`);
    if (r.dKill >= 0 && r.dKill < 4) ok(`발원 좌표 = 킬 자리 (오차 ${Math.round(r.dKill)}px · 탭까지는 ${Math.round(r.dTap)}px)`);
    else fail(`발원이 «누른 탭» 쪽이다 — 킬까지 ${Math.round(r.dKill)}px / 탭까지 ${Math.round(r.dTap)}px`);
  }

  if (errs.length) errs.forEach((e) => fail(e));
  await browser.close();
  console.log('');
  if (fails.length) { console.log(`VERIFY158 FAIL (${fails.length})`); process.exit(1); }
  console.log('VERIFY158 PASS');
})().catch((e) => { console.error(e); process.exit(2); });
