#!/usr/bin/env node
/* 413 게이트 — «#panel 계열 세 시트(07 스킬·26 펫·50 코스튬)의 딤도 포인터를 막는다»
 *
 * 실행: node tools/verify413.js
 *
 * 무엇을 못박는가 — 413 은 «값 하나» 가 아니라 **규약**을 정한 작업이다:
 *   «오버레이가 소유한 화면에서 배경은 안 눌린다. 남는 것은 나갈 길뿐이다.»
 * 그래서 이 자는 세 겹으로 잰다.
 *   §1 제품 값 — 딤의 계산된 `pointer-events` 가 세 시트 × 두 프레임 전부 `auto`.
 *   §2 결과   — 배경 조작 요소(레일군 + HUD 재화 알약) 누출 0칸, **나갈 길은 그대로**.
 *   §3 대가   — 42 조이스틱이 세 시트 아래에서 안 뜬다. ⚑ 그리고 그 대가가 **이 게임이 이미
 *              치르고 있던 값**임을 대조군(«자기 클릭으로 닫는» 오버레이 5종)으로 못박는다 —
 *              이 항이 없으면 §3 은 «기능 하나를 죽인 게이트» 로만 읽힌다.
 *   §R 되돌림 — 딤을 `none` 으로 되돌린 사본에서 §2·§3 이 **실제로 빨개진다**(338 교훈).
 *
 * ⚑ 이 자가 «음성항» 에 자리를 크게 쓰는 이유: §2·§3 은 전부 «안 눌린다 / 안 뜬다» 는 **부정문**이라
 *   진입에 실패하거나 자가 고장 나도 그대로 초록이다(LESSONS 356-⑬). 그래서 시트가 안 열린
 *   화면에서 같은 것들이 **닿고 뜨는지**를 매번 같이 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log(`  ok  ${m}${d ? ' — ' + d : ''}`); };
const no = (m, d) => { fail++; console.log(`  NG  ${m}${d ? ' — ' + d : ''}`); };

const { fresh, settle, drive, TALL, SHORT } = require('./probe351lib');

const SHEETS = [
  { label: 'sk', hero: '#eqTabs [data-eqtab="sk"]' },
  { label: 'pet', hero: '#eqTabs [data-eqtab="pet"]' },
  { label: 'cos', hero: '#eqTabs [data-eqtab="cos"]' },
];
const CTRLS = [
  { label: 'side:attend', sel: '.side .ibtn[data-pop="attend"]' },
  { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' },
  { label: 'side:quest', sel: '.side .ibtn[data-pop="quest"]' },
  { label: 'side:roul', sel: '.side .ibtn[data-pop="roul"]' },
  { label: 'menu', sel: '#menub' },
];
/* 되돌림 사본 — 413 이전 값 */
const REVERT = `#panel:has(:is(#bSk,#bPet,#bCos).on)::before{pointer-events:none !important}`;

const REACH = 50;

const DIM_PE = function () {
  const p = document.getElementById('panel');
  if (!p) return null;
  return getComputedStyle(p, '::before').pointerEvents;
};

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
    if (r.width <= 0 || r.height <= 0) { out.push({ k, pct: -1, hit: null }); continue; }
    let n = 0, tot = 0, who = null;
    for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) {
      const x = r.left + r.width * i / 6, y = r.top + r.height * j / 6;
      const t = document.elementFromPoint(x, y);
      tot++;
      if (t && (t === e || e.contains(t))) n++;
      else if (!who && t) who = t.id ? '#' + t.id : t.tagName.toLowerCase();
    }
    const pct = Math.round(n / tot * 100);
    out.push({ k, pct, hit: pct >= reachPct, blocker: pct >= reachPct ? null : who });
  }
  return out;
};

const FREE_PT = function () {
  const sa = document.getElementById('stagearea');
  if (!sa) return null;
  const r = sa.getBoundingClientRect();
  const hud = [...document.querySelectorAll('#stinfo, #bossTm.on, #bossHp.on, #dunTtl, #dunTm, #dunBar')]
    .map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
  const inHud = (x, y) => hud.some((b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom);
  for (let fy = 0.2; fy <= 0.9; fy += 0.05) {
    for (let fx = 0.2; fx <= 0.85; fx += 0.05) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (y > r.bottom - 4) continue;
      if (inHud(x, y)) continue;
      return { x: Math.round(x), y: Math.round(y) };
    }
  }
  return null;
};

async function joyOn(page) {
  const pt = await page.evaluate(FREE_PT);
  if (!pt) return null;
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  const on = await page.evaluate(() => { try { return !!joy.on; } catch (_) { return null; } });
  await page.mouse.up();
  await page.waitForTimeout(60);
  return on;
}

const LEAK = (r) => r.filter((x) => x.hit && /^(rail:|menub|util:|cur:)/.test(x.k)).map((x) => x.k);
const ESC = (r) => r.filter((x) => x.hit && /^tab:/.test(x.k)).map((x) => x.k);

/* 한 상태를 한 번에 잰다 */
async function measure(browser, wh, opener, revert) {
  const { ctx, page } = await fresh(browser, ...wh);
  if (revert) await page.addStyleTag({ content: REVERT });
  if (opener) await drive(page, opener);
  await settle(page);
  const pe = await page.evaluate(DIM_PE);
  const r = await page.evaluate(REACHED, REACH);
  const joy = await joyOn(page);
  await ctx.close();
  return { pe, leak: LEAK(r), esc: ESC(r), joy };
}

(async () => {
  /* ---------------- §0 정적 — 소스가 그 값을 들고 있는가 ---------------- */
  console.log('[§0] 소스 — 딤 규칙이 pointer-events:auto 를 들고 있다');
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const rule = src.match(/#panel:has\(:is\(#bSk,#bPet,#bCos\)\.on\)::before\{[^}]*\}/);
  rule
    ? (/pointer-events:auto/.test(rule[0])
      ? ok('[0-a] 딤 규칙에 pointer-events:auto')
      : no('[0-a] 딤 규칙에 pointer-events:auto', rule[0].slice(0, 160)))
    : no('[0-a] 딤 규칙을 소스에서 못 찾았다 — 셀렉터가 바뀌었으면 이 자를 같이 옮겨라');
  /* 딤 자체가 사라지면 «누출 0» 은 못 지킨다. 규칙이 딤이기를 그만두지 않았는지 같이 본다. */
  (rule && /background:rgba\(0,\s*0,\s*0,\s*\.28\)/.test(rule[0]))
    ? ok('[0-b] 딤은 여전히 rgba(0,0,0,.28) — 측정표 07 §0 투과율 0.721')
    : no('[0-b] 딤 배경이 바뀌었다', rule ? rule[0].slice(0, 160) : '(규칙 없음)');

  const br = await launch(chromium);
  try {
    const M = {};
    for (const [tag, wh] of [['2280', TALL], ['1600', SHORT]]) {
      for (const sh of SHEETS) M[tag + '/' + sh.label] = await measure(br, wh, sh, false);
      M[tag + '/none'] = await measure(br, wh, null, false);            /* 음성항 */
      M[tag + '/sk-rev'] = await measure(br, wh, SHEETS[0], true);      /* §R */
    }

    /* ---------------- §1 제품 값 ---------------- */
    console.log('\n[§1] 딤의 계산된 pointer-events');
    const cells = Object.keys(M).filter((k) => /\/(sk|pet|cos)$/.test(k));
    cells.every((k) => M[k].pe === 'auto')
      ? ok('[1-a] 세 시트 × 두 프레임 전부 auto', cells.map((k) => k + '=' + M[k].pe).join(' · '))
      : no('[1-a] 세 시트 × 두 프레임 전부 auto', cells.map((k) => k + '=' + M[k].pe).join(' · '));

    /* ---------------- §2 결과 — 누출 0 · 나갈 길 유지 ---------------- */
    console.log('\n[§2] 배경 조작 요소 누출 0 · 나갈 길은 그대로');
    cells.every((k) => M[k].leak.length === 0)
      ? ok('[2-a] 세 시트 × 두 프레임 전부 누출 0칸(레일군 + ▦ + 유틸 + HUD 재화 알약)')
      : no('[2-a] 누출 0칸', cells.map((k) => k + '=' + M[k].leak.length + '칸[' + M[k].leak.join(',') + ']').filter((s) => !/=0칸/.test(s)).join(' · '));
    cells.every((k) => M[k].esc.length >= 5)
      ? ok('[2-b] 나갈 길(앱 탭바)은 두 프레임 다 그대로 닿는다 — 막은 대가를 안 치른다',
        cells.map((k) => k + '=' + M[k].esc.length).join(' · '))
      : no('[2-b] 나갈 길이 닿는다', cells.map((k) => k + '=' + M[k].esc.length + '칸').join(' · '));
    /* 음성항 — 시트가 안 열리면 다 닿아야 한다. 이게 없으면 [2-a] 는 «항상 0» 도 통과시킨다. */
    ['2280/none', '1600/none'].every((k) => M[k].leak.length >= 8)
      ? ok('[2-c] 음성항 — 시트가 안 열린 화면에서는 두 프레임 다 배경이 닿는다',
        ['2280/none', '1600/none'].map((k) => k + '=' + M[k].leak.length + '칸').join(' · '))
      : no('[2-c] 음성항 — 시트가 안 열리면 배경이 닿는다',
        ['2280/none', '1600/none'].map((k) => k + '=' + M[k].leak.length + '칸').join(' · '));

    /* ---------------- §3 대가 — 42 조이스틱 ---------------- */
    console.log('\n[§3] 42 터치 조이스틱 — 시트 아래에서 안 뜬다(413 이 치른 값)');
    cells.every((k) => M[k].joy === false)
      ? ok('[3-a] 세 시트 × 두 프레임 전부 joy.on = false')
      : no('[3-a] 세 시트 아래에서 조이스틱이 안 뜬다', cells.map((k) => k + '=' + M[k].joy).join(' · '));
    ['2280/none', '1600/none'].every((k) => M[k].joy === true)
      ? ok('[3-b] 음성항 — 시트가 안 열리면 두 프레임 다 조이스틱이 뜬다 (42 는 살아 있다)')
      : no('[3-b] 음성항 — 시트가 안 열리면 조이스틱이 뜬다',
        ['2280/none', '1600/none'].map((k) => k + '=' + M[k].joy).join(' · '));
    /* ⚑ 규약항 — 이 대가가 `#panel` 만의 것이 아님을 대조군이 말한다. */
    const ctrl = [];
    for (const c of CTRLS) {
      const { ctx, page } = await fresh(br, ...TALL);
      await drive(page, c);
      await settle(page);
      ctrl.push({ label: c.label, joy: await joyOn(page) });
      await ctx.close();
    }
    const alive = ctrl.filter((c) => c.joy === true).map((c) => c.label);
    (ctrl.length >= 5 && ctrl.every((c) => c.joy === false))
      ? ok('[3-c] 규약 — «자기 클릭으로 닫는» 오버레이 5종 아래에서도 조이스틱이 안 뜬다 = [3-a] 는 이 게임이 이미 치르던 값이다',
        `${ctrl.length}종 중 뜨는 것 ${alive.length}종`)
      : no('[3-c] 대조군 오버레이 아래에서도 조이스틱이 안 뜬다', `뜨는 것: ${alive.join(', ') || '(없음)'}`);

    /* ---------------- §R 되돌림 ---------------- */
    console.log('\n[§R] 딤을 pointer-events:none 으로 되돌린 사본에서 실제로 빨개지는가');
    const r19 = M['2280/sk-rev'], r13 = M['1600/sk-rev'];
    (r19.leak.length >= 6)
      ? ok('[R-a] 되돌리면 2280 에서 누출이 되살아난다', `${r19.leak.length}칸 [${r19.leak.join(', ')}]`)
      : no('[R-a] 되돌리면 2280 누출이 되살아난다', `${r19.leak.length}칸`);
    /* ⚑ 1600 은 «레일은 시트 본문이 막지만 HUD 알약은 딤 말고 막을 것이 없다» 는 자리다.
       이 항이 413 을 «2280 전용 수리» 와 갈라 놓는다(`probe413` [N2b]). */
    (r13.leak.length >= 2 && r13.leak.every((k) => /^cur:/.test(k)))
      ? ok('[R-b] 되돌리면 1600 에서도 HUD 알약만 정확히 되살아난다 — 1600 누출도 413 이 닫은 것이다',
        `${r13.leak.length}칸 [${r13.leak.join(', ')}]`)
      : no('[R-b] 되돌리면 1600 에서 HUD 알약이 되살아난다', `${r13.leak.length}칸 [${r13.leak.join(', ')}]`);
    (r19.joy === true && r13.joy === false)
      ? ok('[R-c] 되돌리면 2280 조이스틱이 되살아나고 1600 은 그대로 안 뜬다 — 프레임에 따라 갈리던 그 상태')
      : no('[R-c] 되돌리면 2280 조이스틱이 되살아난다', `2280=${r19.joy} · 1600=${r13.joy}`);
    /* 음성항 — 되돌림이 «전부를 바꾸는» 주입이 아님을 나갈 길이 말한다. */
    (r19.esc.length >= 5 && r13.esc.length >= 5)
      ? ok('[R-d] 음성항 — 되돌려도 나갈 길은 두 프레임 다 그대로다 (되돌림이 딤 한 속성만 바꾼다)')
      : no('[R-d] 음성항 — 되돌려도 나갈 길은 그대로', `2280=${r19.esc.length} · 1600=${r13.esc.length}`);
  } finally {
    await br.close();
  }

  console.log(`\nVERIFY413 ${pass}/${pass + fail} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
