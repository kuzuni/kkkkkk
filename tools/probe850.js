#!/usr/bin/env node
/* 작업 850 재현자 — `tools/verify419.js` 74건 빨강의 뿌리를 ⓐ/ⓑ 로 가른다.
 *   실행: node tools/probe850.js   → 마지막 줄이 `PROBE850 n/n PASS` 여야 한다.
 *
 * 등재문의 두 갈래:
 *   ⓐ 자가 찾는 배너 노드(`#tuto` 460×150 하단 앵커)가 이름·구조째 바뀌었다
 *   ⓑ 오프너 클릭이 조용히 실패해 화면이 안 열렸다
 * 338 규칙대로 «처방 전에 재현» 하고, 두 갈래를 **한 번에** 가르는 자를 세운다:
 * 같은 오프너를 네 트리에서 열어 `#tuto` 의 존재·상자·`display`·`visibility` 를 나란히 찍는다.
 *
 *   T0 현재            — 그대로
 *   T1 −419            — 419 선언(`#app:has(…​).on) #tuto{display:none}`) 제거
 *   T2 −811#tuto       — 811 의 HUD 숨김 목록(`:is(#top,#tuto,#slots){visibility:hidden}`)에서 `#tuto` 만 제거
 *   T3 −둘 다          — 위 둘 다 제거
 *
 * 노드가 T0~T3 어디서나 살아 있고 상자도 그대로면 ⓐ 기각, 오프너가 실제로 화면을 열었으면 ⓑ 기각이다.
 * 그러면 남는 답은 하나 — **제품이 «한 겹 더» 숨기게 됐고 자가 그 겹을 모른다**.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { settle, drive } = require('./probe351lib');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

const RULE419 = (SRC.match(/#app:has\(:is\([^)]*\)\.on\) #tuto\{display:none\}/) || [''])[0];
/* 811 의 HUD 숨김 한 줄 — 줄바꿈이 섞여 있어 `[\s\S]` 로 잡는다 */
const RULE811 = (SRC.match(/#app:has\(:is\([^)]*\)\.on\) :is\(#top,#tuto,#slots\)\{visibility:hidden\}/) || [''])[0];

const { COVER_SRC } = require('./cover351lib');
const MEAS = function (opt) {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const tuto = document.getElementById('tuto');
  const cover = new Function('return (' + opt.coverSrc + ')')();
  const out = { node: !!tuto, box: null, disp: null, vis: null, op: null, visPct: null, stub: null, host: null };
  if (opt.boxSel) {
    const b = document.querySelector(opt.boxSel);
    if (b) {
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      out.host = (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)
        ? 'invisible' : [Math.round(r.width), Math.round(r.height)].join('x');
    }
  }
  if (!tuto) return out;
  const cs = getComputedStyle(tuto);
  out.disp = cs.display; out.vis = cs.visibility; out.op = Number(cs.opacity);
  const t = tuto.getBoundingClientRect();
  /* ⚑ 상자는 `visibility:hidden` 에서도 살아 있다 — 노드가 «사라졌는가»(ⓐ) 를 가르는 것이 이 줄이다 */
  out.box = [Math.round(t.width), Math.round(t.height)];
  const c = cover(tuto, t);
  out.visPct = c.visPct; out.stub = c.stub;
  return out;
};

async function shot(browser, o, H, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + (file || FILE));
  await page.waitForTimeout(1100);
  if (o) await drive(page, o);
  await settle(page);
  const m = await page.evaluate(MEAS, { boxSel: o && o.box ? o.box : null, coverSrc: COVER_SRC });
  await ctx.close();
  return m;
}

/* 419 §2·§R 이 빨간 자리에서 고른 대표 — 419 목록 안(attend·bless·bag·prof) ·
   419 목록 «밖» 이면서 811 목록 «안»(cur:gold = 407 이 살려 둔 자리) · 둘 다 밖(tab:adv · 메인) */
const HOSTS = [
  { label: 'main', o: null },
  { label: 'side:attend', o: { label: 'side:attend', sel: '.side .ibtn[data-pop="attend"]', box: '#modal>.mbox' } },
  { label: 'side:bless', o: { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]', box: '#blsw>.bls' } },
  { label: 'menu:bag', o: { label: 'menu:bag', mn: 'bag', box: '#bagw>.bg53' } },
  { label: 'prof:19', o: { label: 'prof:19', sel: '#profBtn', box: '#pfw>.pf' } },
  { label: 'cur:gold', o: { label: 'cur:gold', sel: '[data-cur="gold"]', box: '#ciw>.ci' } },
  { label: 'tab:adv', o: { label: 'tab:adv', sel: '.tab[data-t="adv"]' } },
];

(async () => {
  const browser = await launch(chromium);
  console.log('§0 재료 — 두 선언이 소스에 있다');
  ok(!!RULE419 && SRC.split(RULE419).length === 2, '419 선언이 정확히 한 번 있다', RULE419 || '(못 찾음)');
  ok(!!RULE811 && SRC.split(RULE811).length === 2, '811 HUD 숨김 선언이 정확히 한 번 있다', RULE811 || '(못 찾음)');
  ok(!!RULE811 && RULE811.includes('#tuto'), '811 목록이 `#tuto` 를 **같이** 숨긴다 (419 가 모르는 두 번째 겹)');

  const trees = { T0: SRC };
  if (RULE419) trees.T1 = SRC.replace(RULE419, '');
  if (RULE811) trees.T2 = SRC.replace(RULE811, RULE811.replace(':is(#top,#tuto,#slots)', ':is(#top,#slots)'));
  if (RULE419 && RULE811) trees.T3 = trees.T2.replace(RULE419, '');
  const files = {};
  for (const k of Object.keys(trees)) {
    if (k === 'T0') { files[k] = FILE; continue; }
    files[k] = path.join(ROOT, `.p850-${k}-${process.pid}.html`);
    fs.writeFileSync(files[k], trees[k]);
  }

  try {
    console.log('\n§1 표 — 오프너 × 프레임 × 트리 (disp/vis · 보임% · 상자)');
    const rows = [];
    for (const h of HOSTS) {
      for (const H of [2280, 1600]) {
        const cells = {};
        for (const k of Object.keys(files)) cells[k] = await shot(browser, h.o, H, files[k]);
        rows.push({ label: h.label, H, cells });
        const fmt = (m) => `${m.disp}/${m.vis} ${m.visPct === null ? '—' : m.visPct + '%'}`;
        console.log(`  ${(h.label + '@' + H).padEnd(20)} host=${String(cells.T0.host)}  ` +
          Object.keys(files).map((k) => `${k}[${fmt(cells[k])}]`).join('  '));
      }
    }

    console.log('\n§2 갈래 판정');
    ok(rows.every((r) => Object.values(r.cells).every((m) => m.node)),
      'ⓐ 기각 — `#tuto` 노드는 네 트리 · 전 표본에서 **살아 있다**');
    /* ⚠ 상자를 묻는 자리는 `display` 가 살아 있는 트리뿐이다 — `display:none` 은 상자를 0 으로 접고
       `visibility:hidden` 은 안 접는다. 그 차이 자체가 «어느 겹이 숨겼나» 를 말해 준다:
       T0 의 419 목록 일곱은 `none` 이라 0 이고, `#ciw`(811 만 덮는 자리)는 `block` 이라 460×150 이다. */
    const boxed = [];
    for (const r of rows) for (const [k, m] of Object.entries(r.cells)) if (m.disp !== 'none') boxed.push([r.label + '@' + r.H + ':' + k, m]);
    ok(boxed.every(([, m]) => m.box && m.box[0] === 460 && m.box[1] >= 148 && m.box[1] <= 150),
      `ⓐ 기각 — display 가 살아 있는 ${boxed.length} 표본에서 껍데기 상자가 460×150 그대로다 (visibility:hidden 은 상자를 안 지운다)`,
      boxed.filter(([, m]) => !m.box || m.box[0] !== 460).map(([k]) => k).join(','));
    const opened = rows.filter((r) => r.label !== 'main' && r.label !== 'tab:adv');
    ok(opened.every((r) => r.cells.T0.host && r.cells.T0.host !== 'invisible'),
      'ⓑ 기각 — 오프너는 실제로 화면을 열었다 (호스트 상자가 눈에 보이는 크기로 잡힌다)',
      opened.filter((r) => !r.cells.T0.host || r.cells.T0.host === 'invisible').map((r) => r.label + '@' + r.H).join(','));

    console.log('\n§3 실재 — 남는 답 하나: 811 이 «한 겹 더» 숨기고 자는 그 겹을 모른다');
    /* 419 목록 안의 자리: T1(419 만 뺀다)에서도 배너는 여전히 안 보인다 = 419 선언은 이미 **덮여 있다** */
    for (const lab of ['side:attend', 'side:bless', 'menu:bag', 'prof:19']) {
      const r = rows.find((x) => x.label === lab && x.H === 1600);
      ok(r.cells.T1.vis === 'hidden',
        `[${lab}@1600] 419 만 빼도 배너는 여전히 안 보인다 (811 의 visibility:hidden) — 419 선언은 덮여 있다`,
        `T1 disp=${r.cells.T1.disp} vis=${r.cells.T1.vis}`);
      ok(r.cells.T3.vis === 'visible' && r.cells.T3.visPct > 0.05 && r.cells.T3.visPct < 99.95,
        `[${lab}@1600] 둘 다 빼면 «토막» 이 되살아난다 (보임 ${r.cells.T3.visPct}%)`,
        `T3 vis=${r.cells.T3.vis} 보임=${r.cells.T3.visPct}%`);
    }
    /* 407 이 살려 둔 자리 — 419 목록에는 없고 811 목록에는 있다 */
    for (const H of [2280, 1600]) {
      const r = rows.find((x) => x.label === 'cur:gold' && x.H === H);
      ok(r.cells.T0.vis === 'hidden',
        `[cur:gold@${H}] 지금은 배너가 숨는다 — 419 는 이 자리를 일부러 뺐는데 **811 이 덮었다**`,
        `T0 disp=${r.cells.T0.disp} vis=${r.cells.T0.vis}`);
      ok(r.cells.T2.vis === 'visible' && r.cells.T2.visPct === 100,
        `[cur:gold@${H}] 811 에서 #tuto 만 빼면 407 의 «100% 보임» 이 그대로 돌아온다 (보임 ${r.cells.T2.visPct}%)`,
        `T2 vis=${r.cells.T2.vis} 보임=${r.cells.T2.visPct}%`);
    }
    /* 음성항 — 811·419 목록 어디에도 없는 자리는 네 트리가 전부 같다 */
    for (const lab of ['main', 'tab:adv']) {
      const r = rows.find((x) => x.label === lab && x.H === 1600);
      const set = new Set(Object.values(r.cells).map((m) => `${m.vis}:${m.visPct}`));
      ok(set.size === 1, `[음성][${lab}@1600] 두 목록 밖이라 네 트리가 전부 같다 (${[...set].join(' / ')})`);
    }
  } finally {
    for (const k of Object.keys(files)) if (k !== 'T0') { try { fs.unlinkSync(files[k]); } catch (e) {} }
  }

  await browser.close();
  console.log(`\nPROBE850 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
