#!/usr/bin/env node
/* 413 프로브 — «#panel 계열 세 시트(07 스킬·26 펫·50 코스튬)의 딤만 포인터를 안 막는다» 재현.
 *
 * 실행: node tools/probe413.js [--json <경로>]
 *
 * 왜 새 자인가: 406 이 남긴 12건의 뿌리는 **한 속성**(`#panel:has(…)::before{pointer-events:none}`)
 * 이라고 등재됐지만, 등재문이 «먼저 정할 것» 으로 셋(ⓐ 막는다 / ⓑ 캔버스만 통과 / ⓒ 지금을 규약으로)을
 * 남겼다. 338 규칙대로 **처방 전에 재현**하고, 셋 중 무엇을 고를지를 **찍힌 값**으로 정한다.
 *
 * 이 자가 묻는 것은 넷이다:
 *   [A] 딤 자체 — 세 시트가 열렸을 때 `::before` 의 계산된 `pointer-events` 는 무엇인가.
 *   [B] 통로 — 배경 고정 조작 요소(사이드 레일·▦ 메뉴·좌하단 유틸·앱 탭바)가 실제로 «닿나».
 *   [C] 조이스틱(42) — 시트가 열린 채 캔버스를 누르면 `joy.on` 이 켜지나.
 *       ⚑ **대조군이 이 작업의 본체다** — 같은 질문을 «자기 클릭으로 닫는 오버레이» 들에게도 던진다.
 *          그것들 아래에서 조이스틱이 이미 죽는다면 «시트 위에서 캐릭터를 움직인다» 는 설계가 아니라
 *          `#panel` 한 자리의 사고이고, 살아 있다면 그것이 이 게임의 규약이다. 셋 중 답이 갈린다.
 *   [D] 패치 대조 — 딤을 `pointer-events:auto` 로 바꾼 사본에서 [B]·[C] 가 어떻게 바뀌나.
 *
 * 닿음 판정은 406 규약을 그대로 쓴다 — 요소 상자 안 5×5 격자에서 `elementFromPoint` 가
 * 그 요소(또는 자손)를 돌려주는 칸이 50% 이상이면 «닿음».
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
const { fresh, settle, drive, TALL, SHORT } = require('./probe351lib');

/* 세 시트 — 08 영웅 탭 안의 서브탭. probe351lib 의 `hero` 갈래를 그대로 쓴다. */
const SHEETS = [
  { label: 'sk', hero: '#eqTabs [data-eqtab="sk"]' },
  { label: 'pet', hero: '#eqTabs [data-eqtab="pet"]' },
  { label: 'cos', hero: '#eqTabs [data-eqtab="cos"]' },
];

/* 대조군 — «자기 클릭으로 닫는» 전체 오버레이. 등재문이 센 열둘 중 오프너가 있는 것들. */
const CTRLS = [
  { label: 'side:attend', sel: '.side .ibtn[data-pop="attend"]' },
  { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' },
  { label: 'side:quest', sel: '.side .ibtn[data-pop="quest"]' },
  { label: 'side:roul', sel: '.side .ibtn[data-pop="roul"]' },
  { label: 'menu', sel: '#menub' },
];

const REACH = 50;

/* ---- 페이지 안에서 도는 자들 ---- */

const DIM_PE = function () {
  const p = document.getElementById('panel');
  if (!p) return { ok: false, why: '#panel 없음' };
  const cs = getComputedStyle(p, '::before');
  return { ok: true, pe: cs.pointerEvents, bg: cs.backgroundColor, h: cs.height, content: cs.content };
};

/* 고정 조작 요소가 «닿나» — 406 규약(5×5 격자 · 50%)
   ⚑ 1회차에 이 목록을 한 덩어리로 세다가 **판정을 뒤집을 뻔했다**: 앱 탭바 5칸은
   두 프레임·패치 전후 **언제나** 닿는데(시트가 탭바 위에서 끝난다), 그것까지 «누출» 로 세면
   패치 뒤에도 5칸이 남아 «안 고쳐졌다» 로 읽힌다. 탭바는 누출이 아니라 **나갈 길**이다
   (`verify351` [7-e] — 규약이 레일을 뺀 대가로 반드시 닿아야 하는 자리). ⇒ 두 군을 갈라서 센다. */
const REACHED = function (reachPct) {
  const out = [];
  const list = [];
  document.querySelectorAll('.side .ibtn[data-pop]').forEach((e) => list.push({ k: 'rail:' + e.dataset.pop, e }));
  const mb = document.getElementById('menub'); if (mb) list.push({ k: 'menub', e: mb });
  document.querySelectorAll('#botleft .ubtn').forEach((e) => list.push({ k: 'util:' + (e.dataset.util || '?'), e }));
  document.querySelectorAll('.curs [data-cur]').forEach((e) => list.push({ k: 'cur:' + e.dataset.cur, e }));
  document.querySelectorAll('.tab[data-t]').forEach((e) => list.push({ k: 'tab:' + e.dataset.t, e }));
  for (const { k, e } of list) {
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) { out.push({ k, pct: -1, hit: null, why: '안 보임' }); continue; }
    let n = 0, tot = 0, who = null;
    for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) {
      const x = r.left + r.width * i / 6, y = r.top + r.height * j / 6;
      const t = document.elementFromPoint(x, y);
      tot++;
      if (t && (t === e || e.contains(t))) n++;
      else if (!who && t) who = t.id ? '#' + t.id : (t.className && typeof t.className === 'string'
        ? t.tagName.toLowerCase() + '.' + t.className.trim().split(/\s+/).join('.') : t.tagName.toLowerCase());
    }
    const pct = Math.round(n / tot * 100);
    out.push({ k, pct, hit: pct >= reachPct, blocker: pct >= reachPct ? null : who });
  }
  return out;
};

/* 조이스틱을 띄울 수 있는 «빈 캔버스 점» 하나 — HUD(JOY_HUD) 사각형과 안 겹치는 자리 */
const FREE_PT = function () {
  const sa = document.getElementById('stagearea');
  if (!sa) return null;
  const r = sa.getBoundingClientRect();
  const hud = [...document.querySelectorAll('#stinfo, #bossTm.on, #bossHp.on, #dunTtl, #dunTm, #dunBar')]
    .map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
  const inHud = (x, y) => hud.some((b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom);
  /* 캔버스 안을 성기게 훑어 «HUD 밖 + 캔버스가 실제로 맨 위(딤은 통과)» 인 점을 찾는다. */
  for (let fy = 0.2; fy <= 0.9; fy += 0.05) {
    for (let fx = 0.2; fx <= 0.85; fx += 0.05) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (y > r.bottom - 4) continue;
      if (inHud(x, y)) continue;
      return { x: Math.round(x), y: Math.round(y), fx: +fx.toFixed(2), fy: +fy.toFixed(2) };
    }
  }
  return null;
};

async function joyTest(page) {
  const pt = await page.evaluate(FREE_PT);
  if (!pt) return { pt: null, on: null, top: null };
  const top = await page.evaluate(([x, y]) => {
    const t = document.elementFromPoint(x, y);
    return t ? (t.id ? '#' + t.id : t.tagName.toLowerCase()) : null;
  }, [pt.x, pt.y]);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  const on = await page.evaluate(() => { try { return !!joy.on; } catch (_) { return null; } });
  await page.mouse.up();
  await page.waitForTimeout(60);
  return { pt, on, top };
}

/* 딤의 `pointer-events` 를 강제한다 — 이 자는 **제품이 지금 어느 값을 들고 있든** 같은 답을 낸다.
   그래야 수리 전/후 어느 트리에서 돌려도 «기제» 를 말하는 자로 남는다(338 «되돌림» 규칙). */
const FORCE = function (v) {
  let s = document.getElementById('p413force');
  if (!s) { s = document.createElement('style'); s.id = 'p413force'; document.head.appendChild(s); }
  s.textContent = `#panel:has(:is(#bSk,#bPet,#bCos).on)::before{pointer-events:${v} !important}`;
};

/* 세 군으로 가른다 — 1회차에 둘로만 갈랐다가 [N2] 가 빨개져서 알았다:
   **HUD 재화 알약(`cur:*`)은 두 프레임 다 누출된다.** 등재문은 «2280 100% → 1600 0%» 로 적었지만
   그것은 레일·▦ 만 센 값이고, 화면 맨 위 알약은 1600 에서도 시트 본문 위(딤 구역)에 있어
   **딤 말고는 막을 것이 없다.** ⇒ 결손은 «해상도가 갈리는 것» 보다 넓다. */
const LEAK = (r) => r.filter((x) => x.hit && /^(rail:|menub|util:)/.test(x.k)).map((x) => x.k);
const HUD = (r) => r.filter((x) => x.hit && /^cur:/.test(x.k)).map((x) => x.k);
const ESC = (r) => r.filter((x) => x.hit && /^tab:/.test(x.k)).map((x) => x.k);

/* ---------------- 본체 ---------------- */
(async () => {
  const browser = await launch(chromium);
  const R = { A: [], N: [], U: [], C: [], Z: [] };
  let pass = 0, fail = 0;
  const ok = (c, m, d) => {
    if (c) { pass++; console.log('  ✔ ' + m + (d ? ' — ' + d : '')); }
    else { fail++; console.log('  ✘ ' + m + (d ? ' — ' + d : '')); }
  };

  for (const [fw, fh] of [TALL, SHORT]) {
    const tag = fh === 2280 ? '2280' : '1600';
    for (const sh of SHEETS) {
      const { ctx, page } = await fresh(browser, fw, fh);
      await drive(page, sh);
      await settle(page);
      R.A.push({ frame: tag, sheet: sh.label, ...(await page.evaluate(DIM_PE)) });

      /* ⓝ 딤 = none (결손 재현) */
      await page.evaluate(FORCE, 'none');
      await page.waitForTimeout(60);
      const rn = await page.evaluate(REACHED, REACH);
      const jn = await joyTest(page);
      R.N.push({ frame: tag, sheet: sh.label, leak: LEAK(rn), hud: HUD(rn), esc: ESC(rn), joy: jn.on, top: jn.top, all: rn });

      /* ⓤ 딤 = auto (처방) — 같은 페이지·같은 상태라 차분에 그 한 속성만 남는다 */
      await page.evaluate(FORCE, 'auto');
      await page.waitForTimeout(60);
      const ru = await page.evaluate(REACHED, REACH);
      const ju = await joyTest(page);
      R.U.push({ frame: tag, sheet: sh.label, leak: LEAK(ru), hud: HUD(ru), esc: ESC(ru), joy: ju.on, top: ju.top, all: ru });

      await ctx.close();
    }
  }

  /* 대조군 — «자기 클릭으로 닫는» 오버레이 아래에서 조이스틱이 사나 (통로가 열리는 프레임 2280) */
  for (const c of CTRLS) {
    const { ctx, page } = await fresh(browser, ...TALL);
    await drive(page, c);
    await settle(page);
    const j = await joyTest(page);
    R.C.push({ label: c.label, joy: j.on, top: j.top });
    await ctx.close();
  }

  /* 음성항 — 아무 것도 안 열린 화면. 여기서 조이스틱이 죽거나 레일이 안 닿으면 자 자체가 고장이다. */
  for (const [fw, fh] of [TALL, SHORT]) {
    const { ctx, page } = await fresh(browser, fw, fh);
    await settle(page);
    const r = await page.evaluate(REACHED, REACH);
    const j = await joyTest(page);
    R.Z.push({ frame: fh === 2280 ? '2280' : '1600', leak: LEAK(r), hud: HUD(r), esc: ESC(r), joy: j.on, top: j.top });
    await ctx.close();
  }

  await browser.close();

  /* ---------------- 보고 ---------------- */
  console.log('\n========== PROBE 413 — #panel 딤 포인터 통로 ==========\n');

  console.log('[A] 제품이 지금 들고 있는 딤 속성 (참고 — 판정에 안 쓴다)');
  for (const a of R.A) console.log(`  ${a.frame} / ${a.sheet}: pointer-events=${a.pe} · bg=${a.bg} · h=${a.h}`);

  console.log('\n[N] 딤 = none 으로 강제 — 결손 재현');
  for (const n of R.N) console.log(`  ${n.frame} / ${n.sheet}: 레일군 ${n.leak.length}칸 [${n.leak.join(', ') || '없음'}] · HUD ${n.hud.length}칸 [${n.hud.join(', ') || '없음'}] · 나갈길 ${n.esc.length}칸 · joy.on=${n.joy}`);
  const n19 = R.N.filter((x) => x.frame === '2280'), n13 = R.N.filter((x) => x.frame === '1600');
  ok(n19.every((x) => x.leak.length >= 4), '[N1] 2280 — 딤이 none 이면 배경 조작 요소가 누출된다 (등재문 재현)',
    n19.map((x) => x.sheet + '=' + x.leak.length + '칸').join(' · '));
  ok(n13.every((x) => x.leak.length === 0), '[N2] 1600 — 같은 값인데 레일군 누출 0칸 (막는 것은 딤이 아니라 시트 본문)',
    n13.map((x) => x.sheet + '=' + x.leak.length + '칸').join(' · '));
  /* ⚑ 등재문이 못 본 자리 — 이것이 «해상도가 갈리는 결함» 이라는 틀 자체를 넓힌다. */
  ok(R.N.every((x) => x.hud.length >= 2),
    '[N2b] ⚑ HUD 재화 알약은 **두 프레임 다** 누출된다 — 등재문의 «2280 만» 은 레일만 센 값이었다',
    R.N.map((x) => x.frame + '/' + x.sheet + '=' + x.hud.length + '칸').join(' · '));
  ok(n19.every((x) => x.joy === true) && n13.every((x) => x.joy === false),
    '[N3] 조이스틱조차 프레임에 따라 갈린다 — 2280 산다 / 1600 죽는다 = «시트 위 이동» 은 규약이 아니다',
    '2280=' + n19.map((x) => x.joy).join(',') + ' · 1600=' + n13.map((x) => x.joy).join(','));

  console.log('\n[U] 딤 = auto 로 강제 — 처방');
  for (const u of R.U) console.log(`  ${u.frame} / ${u.sheet}: 레일군 ${u.leak.length}칸 [${u.leak.join(', ') || '없음'}] · HUD ${u.hud.length}칸 [${u.hud.join(', ') || '없음'}] · 나갈길 ${u.esc.length}칸 · joy.on=${u.joy}`);
  ok(R.U.every((x) => x.leak.length === 0 && x.hud.length === 0),
    '[U1] 두 프레임 · 세 시트 전부 누출 0칸(레일군 + HUD) — 통로는 그 한 속성이다');
  ok(R.U.every((x) => x.esc.length >= 5), '[U2] 나갈 길(앱 탭바)은 그대로 닿는다 — 막은 대가를 치르지 않는다',
    R.U.map((x) => x.esc.length).join(','));
  ok(R.U.every((x) => x.joy === false), '[U3] 세 시트 아래에서 조이스틱이 죽는다 (처방이 치르는 값)');

  console.log('\n[C] 대조군 — «자기 클릭으로 닫는» 오버레이 아래의 조이스틱 (2280)');
  for (const c of R.C) console.log(`  ${c.label}: joy.on=${c.joy} · 맨위=${c.top}`);
  const alive = R.C.filter((c) => c.joy === true).map((c) => c.label);
  ok(R.C.length >= 5 && R.C.every((c) => c.joy === false),
    '[C1] 대조군 전부 조이스틱이 이미 죽는다 — [U3] 이 치르는 값은 이 게임이 이미 치르고 있던 값이다',
    `${R.C.length}종 중 사는 것 ${alive.length}종${alive.length ? ' (' + alive.join(', ') + ')' : ''}`);

  console.log('\n[Z] 음성항 — 아무 것도 안 열린 화면');
  for (const z of R.Z) console.log(`  ${z.frame}: 레일군 ${z.leak.length}칸 · HUD ${z.hud.length}칸 · 나갈길 ${z.esc.length}칸 · joy.on=${z.joy}`);
  ok(R.Z.every((z) => z.joy === true), '[Z1] 시트가 안 열리면 두 프레임 다 조이스틱이 산다 (자가 «항상 죽음» 을 재는 게 아니다)');
  ok(R.Z.every((z) => z.leak.length >= 6 && z.hud.length >= 2),
    '[Z2] 시트가 안 열리면 배경 조작 요소(레일군 + HUD)가 두 프레임 다 닿는다',
    R.Z.map((z) => z.frame + '=' + z.leak.length + '+' + z.hud.length + '칸').join(' · '));

  console.log(`\nPROBE413 ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass}/${pass + fail}`);
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(R, null, 1));
  process.exit(fail === 0 ? 0 : 1);
})();
