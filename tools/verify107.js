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
 *   [I] 실제 마우스 드래그 — 끌고 손을 뗀 뒤 되돌아가지 않는다(주인 보고 그대로 재현). 4항:
 *       ⓐ 95 관성이 «유한 시간에» 멎는다(옛 900ms 상수를 대신하는 자리 — 작업 236)
 *       ⓑ 드래그가 먹혔다(0px 면 95 회귀)
 *       ⓒ 멎은 뒤 3초 동안 **한 프레임도** 안 움직인다(옛 물음 그대로, 두 점 → 전 프레임)
 *       ⓓ 손 뗀 뒤 «위로 되돌아간 프레임» 0 — 주인이 보고한 문장 그대로
 *   [H] 콘솔 에러 / pageerror 0건
 * 통과: 실패 0건
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
  console.error('playwright 없음 — npm i --no-save playwright@1.56.0'); process.exit(2);
})();

/* V107_SRC — 되돌림 시험(`tools/neg236.js`)이 갈아 끼운 사본을 **새로 열어** 재게 하는 손잡이.
   살아 있는 페이지에 CSS·JS 를 주입해서 재면 거짓 초록이 난다(LESSONS 191 · 96·219 선례). */
const URL = 'file://' + path.resolve(process.env.V107_SRC || path.join(__dirname, '..', 'index.html')).replace(/\\/g, '/');
/* V107_FAST=1 — [C] 전투 30초 대기와 [F]·[G] 절을 건너뛰고 [A][B][D][E][I][H] 만 본다.
   되돌림 시험이 사본 6벌을 돌려야 해서 둔 손잡이다. **평상시 게이트는 절대 이걸 쓰지 않는다**
   (환경변수가 없으면 전 항목을 돈다 — 조용히 줄어드는 일이 없게). */
const FAST = process.env.V107_FAST === '1';
/* [I] 감시창 — «관성이 멎기까지(제품이 정하는 시각)» + «renderUI 가 8~9회 도는 3초».
   앞의 항을 상수로 고르지 않는 것이 236 의 핵심이다(아래 [I] 주석). 여기 값은 그 둘을
   **넉넉히 덮는 창** 일 뿐이라, 관성이 길어져도 판정이 뒤집히지 않는다 —
   창이 모자라면 ⓐ 가 «안 멎었다» 로 빨개져 «늘려라» 를 말해 준다(조용한 오판이 아니다). */
const I_WATCH = 4200;
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
  /* 291 — 공용 부트스트랩을 지나가게 한다. `launch()` 가 입장 연출 «정착 장치»(settle291)를
     브라우저에 심어 주므로, 고정 대기 뒤 rect 를 재도 연출 한복판을 잡지 않는다. */
  const br = await pwLaunch(chromium, launchOpts());
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
    if (FAST) process.stdout.write('  … [C] 전투 30초 — V107_FAST 로 건너뜀\n');
    else {
      process.stdout.write('  … 전투 30초 대기\n');
      await pg.waitForTimeout(30000);
      const c = await pg.evaluate(`window.__sc('#bSk .sk-gp')`);
      if (c === b.set) ok('[C] 전투 30초 후 scrollTop ' + c + ' 유지');
      else fail('[C] 전투 30초 후 scrollTop ' + b.set + ' → ' + c);
    }

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

    /* [I] 주인이 실제로 한 조작 그대로 — 진짜 마우스로 아래로 끌고, 손을 뗀 뒤 지켜본다.
           («아래로 끌었는데 자꾸 위로 올라간다» 를 합성 이벤트가 아닌 입력으로 재현)

       ⚠ 2026-08-27 (작업 236) — 옛 형태는 **두 점 표본**이었다: 손 뗀 뒤 «900ms 면 95 관성이
       멎어 있다» 를 전제로 900ms 와 +3000ms 를 찍어 같은지만 봤다. 그 전제는 **격자가 짧아
       관성이 바닥에 걸려 일찍 끊겼던 덕분**에만 참이었다(107 당시 max 455 · 관성 종료 ≈0.36s).
       193 이 스킬을 8종 늘려 스크롤 여지가 **455 → 675px** 이 되자 관성이 제 수명(≈0.92~0.98s)을
       다 살아, 900ms 가 «아직 미끄러지는 중» 이 되어 Δ2~3px 로 **간헐 FAIL** 했다 — 제품은 멀쩡한데
       게이트만 빨갛다. 여기서 대기 시간을 1200ms 로 다시 고르면 격자가 더 길어질 때 또 낡는다
       (LESSONS 288-① — 문턱을 정교하게 만들지 말고 방해 항을 끌 손잡이를 찾아라).
       그래서 ① **관성이 실제로 멎을 때까지 기다린 뒤** 재고, ② 궤적을 rAF 로 통째로 떠서
       «되돌아간 프레임» 을 직접 센다. 두 점 표본은 «갔다가 돌아온» 튐을 원리적으로 놓친다. */
    await pg.evaluate(() => { document.querySelector('#bSk .sk-gp').scrollTop = 0; });
    const box = await pg.evaluate(() => {
      const r = document.querySelector('#bSk .sk-gp').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
    });
    /* 손 뗀 순간부터 rAF 마다 [t, scrollTop, 관성 살아있음] 을 적는다 */
    await pg.evaluate(() => {
      window.__tr = [];
      window.__rec = () => {
        const gp = document.querySelector('#bSk .sk-gp');
        window.__tr.push([Math.round(performance.now() - window.__t0),
                          gp ? +gp.scrollTop.toFixed(2) : -1,
                          (typeof dsGlide !== 'undefined' && dsGlide) ? 1 : 0]);
        window.__raf = requestAnimationFrame(window.__rec);
      };
    });
    await pg.mouse.move(box.x, box.y + box.h * 0.35);
    await pg.mouse.down();
    for (let i = 1; i <= 8; i++) { await pg.mouse.move(box.x, box.y + box.h * 0.35 - i * 40); await pg.waitForTimeout(16); }
    await pg.mouse.up();
    await pg.evaluate(() => { window.__t0 = performance.now(); window.__rec(); });
    await pg.waitForTimeout(I_WATCH);                   /* 관성 + renderUI 가 8~9회 도는 동안 */
    const tr = await pg.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__tr; });

    if (tr.length < 30) fail('[I] 궤적 프레임이 ' + tr.length + '개뿐이다 — rAF 기록기가 안 붙었다(측정 불가)');
    else {
      const last = tr[tr.length - 1];
      /* ⓐ 관성이 «유한 시간에» 멎는다 — 옛 900ms 상수를 대신하는 자리. 안 멎으면 아래를 잴 수 없다 */
      const glideEndIdx = tr.map(r => r[2]).lastIndexOf(1);
      const settleT = glideEndIdx < 0 ? 0 : tr[glideEndIdx][0];
      if (glideEndIdx === tr.length - 1)
        fail('[I]ⓐ 손 뗀 뒤 ' + last[0] + 'ms 동안 95 관성이 안 멎었다 (dsFling 종료 조건 회귀)');
      else ok('[I]ⓐ 95 관성이 ' + settleT + 'ms 에 멎었다 (감시창 ' + I_WATCH + 'ms)');

      /* ⓑ·ⓒ 의 기준점 — «관성이 **멎은 것을 본** 첫 프레임» 이다. 관성의 마지막 프레임이 아니다.
         ⚠ 2026-08-28 (작업 303) — 236 은 여기를 `tr.filter(r => r[0] >= settleT)` 로 잡아
         **dsGlide 가 1 로 적힌 마지막 프레임**을 기준으로 삼았다. 그 프레임의 scrollTop 은
         관성의 **마지막 한 걸음을 아직 안 밟은** 값이다 — 제품의 `step` 이 그 걸음을 밟으면서
         같은 프레임에 `dsGlide = 0` 을 놓기 때문이다(기록기는 그 다음에야 0 을 본다).
         그 한 걸음이 «멎은 뒤 움직였다» 로 잡힌다. 걸음 크기는 `sp*dt` 이고 종료 조건이
         «감쇠 후 |sp| < DS_VMIN(0.02)» 이라 **프레임 간격에 정비례**한다:
             dt 16.7ms → 0.02/0.95      × 16.7 = 0.35px   (문턱 0.5 아래 → 초록)
             dt 34ms   → 0.02/0.95^2.04 × 34   = 0.76px   (문턱 0.5 위   → 빨강)
         = 러너가 붐빌 때만 빨개지는 간헐 FAIL 이었다(게이트 45개 일괄 실행에서 드러났다).
         236 의 전제(«관성 마지막 프레임에는 최종 값이 적혀 있다»)는 한가한 기계에서 그 걸음이
         정수 픽셀로 0 으로 반올림되던 덕분에만 참이었다 — 옛 900ms 상수와 같은 종류의 우연이다.
         문턱(0.5px)이나 «한 프레임 더 기다리기» 같은 상수를 만지지 않는다(LESSONS 288-①) —
         **자를 대는 자리**를 한 프레임 옮긴다. `glideEndIdx + 1` 은 rAF 안에서 기록기와 제품 중
         누가 먼저 돌든 «step 이 끝난 뒤» 임이 보장되는 첫 프레임이라 순서에 기대지 않는다. */
      const rest = tr.slice(glideEndIdx + 1);
      const watch = rest.length ? last[0] - rest[0][0] : 0;
      if (!rest.length) fail('[I] 관성이 멎은 뒤 프레임이 0개다 — 감시창(' + I_WATCH + 'ms)이 모자라다(측정 불가)');
      else {
      /* ⓑ 드래그가 먹혔다 — 95 회귀(0px) 방지. 관성이 멎은 뒤 첫 값으로 본다 */
      const settled = Math.round(rest[0][1]);
      if (settled <= 0) fail('[I]ⓑ 마우스 드래그로 스크롤이 아예 안 됐다(scrollTop ' + settled + ') — 95 회귀');
      else ok('[I]ⓑ 마우스 드래그로 ' + settled + 'px 스크롤됐다');

      /* ⓒ 멎은 뒤로는 **한 프레임도** 안 움직인다 — 옛 물음(«3초 뒤에도 그대로») 그대로,
             다만 끝점 한 번이 아니라 그 사이 전 프레임을 본다 */
      const moved = rest.filter(r => Math.abs(r[1] - rest[0][1]) > 0.5);
      if (settled > 0 && moved.length === 0)
        ok('[I]ⓒ 멎은 뒤 ' + watch + 'ms · ' + rest.length + '프레임 동안 ' + settled + ' 유지 (되돌아가지 않음)');
      else if (settled > 0)
        fail('[I]ⓒ 멎은 뒤 ' + moved.length + '프레임이 움직였다 — ' + settled + ' → ' +
             Math.round(moved[moved.length - 1][1]) + ' (t=' + moved[0][0] + 'ms 부터, 주인이 보고한 증상)');
      }

      /* ⓓ 손 뗀 순간부터 **뒤로(위로) 간 프레임 0** — 주인이 보고한 문장 그대로다.
             ⓒ 는 «멎은 뒤» 만 보므로, 관성 중에 0 으로 튀었다가 돌아오는 튐은 여기서만 잡힌다 */
      let back = 0, worst = 0, worstT = -1;
      for (let i = 1; i < tr.length; i++) {
        const d = tr[i][1] - tr[i - 1][1];
        if (d < -0.5) { back++; if (d < worst) { worst = d; worstT = tr[i][0]; } }
      }
      if (back === 0) ok('[I]ⓓ 손 뗀 뒤 ' + tr.length + '프레임 중 위로 되돌아간 프레임 0');
      else fail('[I]ⓓ 위로 되돌아간 프레임 ' + back + '개 — 최대 ' + worst.toFixed(1) +
                'px (t=' + worstT + 'ms) · 주인이 보고한 «자꾸 위로 올라간다»');
    }

    allErrs.push(...errs);
    await ctx.close();
  }

  /* ---------------- [F] 값 갱신 회귀 ---------------- */
  if (!FAST) {
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
  if (!FAST) {
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
  console.log('\n' + (fails.length ? 'VERIFY107 FAIL ' + fails.length + '건' : 'VERIFY107 PASS') + (FAST ? ' (V107_FAST — [C][F][G] 미실행)' : ''));
  process.exit(fails.length ? 1 : 0);
})();
