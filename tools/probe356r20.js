#!/usr/bin/env node
/* 356 20회차 재현기 — 19회차가 이름으로 남긴 «같은 부품 · 안 밟은 상태» 축 셋을
 * **넓히기 전에** «새 kind 가 나오는가» 로 먼저 묻는다.
 *
 *   node tools/probe356r20.js          # 두 프레임(2280·1600)
 *   node tools/probe356r20.js --json
 *
 * 왜 이 순서인가(19회차 인계문의 마지막 문장 그대로):
 *   «이 축들은 모두 같은 부품을 다시 보는 것이라, 18·19회차처럼 «새 kind 가 나오는가» 를
 *    먼저 물어라 — 안 나오면 표본만 무거워지고 래칫만 오른다.»
 *   18·19회차는 «넓혔더니 0 이었다» 로 끝났지만 그 대가로 [S3] 래칫 여유가 **2** 까지 줄었다
 *   (19회차 추기 — 칸 77 이 래칫 77 에 정확히 닿았다). 그러니 이 회차의 첫 일은 수리가 아니라
 *   **«그 축이 정말 새 자리를 여는가»** 를 자로 가르는 것이다.
 *
 * 세 축과 이 자가 묻는 것:
 *   ⓐ **우편 `m.ic` 를 «이용권 카드가 실제로 보내는 전 종류» 로** —
 *      제품에서 `sendMail({… ic: …})` 를 부르는 자리를 **소스에서 전수**로 센다(정적 축).
 *      «전 종류» 가 몇 종인지는 눈이 아니라 그 수가 답한다.
 *   ⓑ **09 일괄 강화 결과의 «등급 조합»** — 지금 SCREENS 는 `SKILLS.slice(0,3)+PETS.slice(0,3)`
 *      뿐이다. 그런데 `UP_LISTS` 는 **`{eq, sk, pet}` 셋**이라 `#upCards` 에는 **EQUIPS** 도 들어온다.
 *      19회차가 «배너가 갈리면 그림도 갈린다»(EQUIPS.slot 별 이모지 표)로 12 에서 확인한 그 축이
 *      **09 에서는 한 번도 안 밟혔다**. ⇒ 여기만 «등급» 이 아니라 **«목록»** 이 진짜 축이다.
 *   ⓒ **12 결과 그리드의 «최고 등급 칸»** — 등급이 무엇을 바꾸는지 페이지에서 직접 잰다.
 *      바뀌는 것이 색(`--face`/`--rim`)뿐이고 아이콘 노드의 상자·transform 이 등급과 무관하면
 *      그 축은 «같은 자리를 한 번 더 보는 것» 이라 SCREENS 에 줄을 더할 이유가 없다.
 *
 * 판정은 `scan356.js` 의 수집기(COLLECT)·구동기(STEP)를 **그대로** 받아 쓴다 —
 * 자를 두 벌로 적으면 한쪽만 늙는다(13회차 [R12] 규율 · 19회차 주석).
 *
 * ⚠ LESSONS 356-⑬ — «불렀다» 가 아니라 «그 화면의 고유 노드가 보인다» 를 서명으로 확인한다.
 */
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT, URL, TOL, STEP, HTML, SCREENS } = require('./scan356.js');

/* «새 kind 가 나오는가» 는 **기준선이 있어야** 답이 되는 물음이다.
   기준선 화면의 단계를 여기 다시 적으면 SCREENS 와 두 벌이 되어 한쪽만 늙는다(13회차 [R12]) —
   그래서 **SCREENS 에서 이름으로 꺼내 쓴다**. 이름이 바뀌면 조용히 넘어가지 않고 던진다. */
function baseSteps(label) {
  const row = SCREENS.find((r) => r[0] === label);
  if (!row) throw new Error(`SCREENS 에 '${label}' 줄이 없다 — 이름이 바뀌었으면 여기도 같이 고쳐라`);
  return row[1];
}

const JSON_OUT = process.argv.includes('--json');

const FRAMES = [
  { name: '9:19  1080×2280', width: 1080, height: 2280 },
  { name: '9:13.3 1080×1600', width: 1080, height: 1600 },
];

/* ---------- ⓐ 정적 축 — 제품이 `ic` 우편을 몇 종 보내는가 ----------
   19회차는 두 줄(`🎫 ig4` · `🎟️ ig3`)을 «34206 프리미엄 패스가 실제로 보내는 꼴» 이라고 적었다.
   그 문장이 맞는지는 소스가 답한다 — 여기서 세는 것은 «sendMail 호출 중 ic 를 넘기는 것» 이다. */
function icProducers() {
  const src = fs.readFileSync(HTML, 'utf8');
  const out = [];
  const re = /sendMail\(\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    /* 호출 한 건의 인자 덩어리를 괄호 균형으로 잘라 낸다(정규식으로 끝을 추측하지 않는다) */
    let i = m.index + m[0].length - 1, depth = 0, end = -1;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const arg = src.slice(m.index, end + 1);
    const line = src.slice(0, m.index).split('\n').length;
    const ic = /[\s,{]ic\s*:/.test(arg);
    if (!ic) continue;
    const lit = (arg.match(/[\s,{]ic\s*:\s*(['"])(.*?)\1/) || [])[2] ?? '(변수)';
    const ig = (arg.match(/[\s,{]ig\s*:\s*([0-9]+)/) || [])[1] ?? '(변수)';
    out.push({ line, ic: lit, ig });
  }
  return out;
}

/* ---------- ⓒ 등급이 무엇을 바꾸는가 — 페이지에서 직접 잰다 ----------
   같은 배너를 «등급 낮은 결과» / «등급 최고 결과» 두 벌로 그린 뒤,
   그리드 칸의 **아이콘 노드 상자·계산 transform** 이 갈리는지 본다.
   상태는 제품 진입점(`showSummonResult`)으로만 만든다 — 자가 마크업을 그리지 않는다(12회차 규율). */
const GRID_GEO = function () {
  const cells = [...document.querySelectorAll('#sumGridIn .sm-c')];
  return cells.map((c) => {
    const b = c.querySelector('b'), cs = b && getComputedStyle(b);
    const r = b && b.getBoundingClientRect();
    const cc = getComputedStyle(c);
    return {
      face: cc.getPropertyValue('--face').trim(),
      rim: cc.getPropertyValue('--rim').trim(),
      box: r ? [+r.width.toFixed(3), +r.height.toFixed(3)] : null,
      tf: cs ? cs.transform : null,
      fs: cs ? cs.fontSize : null,
    };
  });
};

/* 최고 등급만 나오는 결과 / 최저 등급만 나오는 결과 — 표는 제품 것(`SKILLS`)을 그대로 쓴다 */
const SUM_LOW =
  'js:(function(){var L=SKILLS.filter(function(s){return s.g===0;}).slice(0,6);'
  + 'showSummonResult("skill",10,L.map(function(it){return {it:it};}),0);})()';
const SUM_TOP =
  'js:(function(){var g=Math.max.apply(null,SKILLS.map(function(s){return s.g;}));'
  + 'var L=SKILLS.filter(function(s){return s.g===g;}).slice(0,6);'
  + 'if(!L.length) throw new Error("최고 등급 스킬이 없다");'
  + 'showSummonResult("skill",10,L.map(function(it){return {it:it};}),0);})()';

/* ⓑ 09 «목록» 축 — `UP_LISTS.eq` 가 실제로 돌려주는 표(EQUIPS)를 슬롯별로 두 개씩 = UPR_MAX(6) 채운다.
   값을 손으로 적지 않고 제품에게 묻는다(336) — 슬롯 목록도 `SLOTS` 에서 읽는다. */
const UP_EQ =
  'js:(function(){var L=[];SLOTS.forEach(function(s){'
  + 'L=L.concat(UP_LISTS.eq().filter(function(x){return x.slot===s.k;}).slice(0,2));});'
  + 'if(!openUpAll(L.map(function(it){return {it:it, from:1, to:2};}))) throw new Error("openUpAll 이 false");})()';

const CAND = [
  /* label, steps, sig(그 상태가 만든 고유 노드), owner(귀속 표식), base(이 후보의 기준선 라벨) */
  ['09 일괄 강화 결과(기준선 = SCREENS)', baseSteps('09 일괄 강화 결과'), '#upw.on #upCards .upr-cel', '#upCards', null],
  ['09 일괄 강화 결과(장비)', [UP_EQ], '#upw.on #upCards .upr-cel', '#upCards', '09 일괄 강화 결과(기준선 = SCREENS)'],
  ['12 소환 결과(최저 등급)', [SUM_LOW], '#sumw.on .sm-panel', '#sumGridIn>', null],
  ['12 소환 결과(최고 등급)', [SUM_TOP], '#sumw.on .sm-panel', '#sumGridIn>', '12 소환 결과(최저 등급)'],
];

(async () => {
  const prod = icProducers();
  const browser = await launch(chromium);
  const rows = [];
  const errs = [];
  const geo = {};

  for (const F of FRAMES) {
    for (const [label, steps, sig, owner, base] of CAND) {
      const ctx = await browser.newContext({ viewport: { width: F.width, height: F.height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        for (const s of steps) {
          const ok = await STEP(page, s);
          if (!ok) errs.push(`${F.name} · ${label}: 무음 실패 — 단계 '${s.slice(0, 60)}…' 가 던졌다`);
          await page.waitForTimeout(600);
        }
        await page.waitForTimeout(900);     /* 12 등장 연출(칸당 0.055s)이 끝나야 최종 상태 */
        const seen = await page.evaluate((q) => {
          const el = document.querySelector(q);
          if (!el) return null;
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0)
            ? [+r.width.toFixed(1), +r.height.toFixed(1)] : null;
        }, sig);
        if (!seen) errs.push(`${F.name} · ${label}: 진입 실패 — 고유 노드 '${sig}' 가 안 보인다`);
        if (label.startsWith('12 ')) geo[F.name + ' | ' + label] = await page.evaluate(GRID_GEO);
        const got = await page.evaluate(COLLECT, { all: false });
        const mine = got.filter((g) => (g.sel || '').includes(owner));
        const kinds = [...new Set(mine.map((g) => g.kind))].sort();
        const sels = [...new Set(mine.map((g) => g.sel))].sort();
        const bad = got.filter((g) => Math.abs(g.ratio - 1) > TOL);
        if (!mine.length) errs.push(`${F.name} · ${label}: 귀속 0 — 상태가 만든 노드('${owner}')가 자에 한 개도 안 들어왔다`);
        rows.push({ frame: F.name, label, base, sig: seen, nodes: got.length, own: mine.length, kinds, sels, bad });
      } catch (e) {
        errs.push(`${F.name} · ${label}: ` + String(e.message || e).split('\n')[0]);
        rows.push({ frame: F.name, label, base, sig: null, nodes: 0, own: 0, kinds: [], sels: [], bad: [] });
      }
      await ctx.close();
    }
  }
  await browser.close();

  /* ⓒ 판정 — 최저/최고 등급 두 벌의 «색» 과 «기하» 를 프레임별로 나란히 놓는다 */
  const gradeVerdict = [];
  for (const F of FRAMES) {
    const lo = geo[F.name + ' | 12 소환 결과(최저 등급)'];
    const hi = geo[F.name + ' | 12 소환 결과(최고 등급)'];
    if (!lo || !hi || !lo.length || !hi.length) { gradeVerdict.push({ frame: F.name, ok: false, why: '표본 없음' }); continue; }
    const colDiff = lo[0].face !== hi[0].face || lo[0].rim !== hi[0].rim;
    const key = (g) => JSON.stringify([g.box, g.tf, g.fs]);
    const geoSame = lo.every((g) => key(g) === key(lo[0])) && hi.every((h) => key(h) === key(hi[0]))
      && key(lo[0]) === key(hi[0]);
    gradeVerdict.push({
      frame: F.name, ok: colDiff && geoSame, colDiff, geoSame,
      lo: [lo[0].face, lo[0].rim, key(lo[0])],
      hi: [hi[0].face, hi[0].rim, key(hi[0])],
    });
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, icProducers: prod, rows, gradeVerdict, errs }, null, 1));
    process.exit(0);
  }

  console.log(`[probe356r20] 19회차 인계 축 셋 — «새 kind 가 나오는가» 를 먼저 묻는다 · TOL ${TOL}`);

  console.log('\n[ⓐ] 우편 `ic` 통 — 제품에서 `sendMail({… ic …})` 를 부르는 자리 전수');
  if (!prod.length) console.log('   (없음)');
  for (const p of prod) console.log(`   index.html:${p.line}  ic=${p.ic}  ig=${p.ig}`);
  console.log(`   ⇒ «이용권 카드가 실제로 보내는 전 종류» = **${prod.length}종**`);

  console.log('\n[ⓑ·ⓒ] 상태 진입 · 귀속 · 비균등');
  let total = 0;
  for (const r of rows) {
    console.log(`\n── ${r.frame} · ${r.label} — 아이콘 노드 ${r.nodes}개`
      + ` · 그중 이 상태 몫 ${r.own}개(${r.kinds.join('+') || '없음'}) · 비균등 ${r.bad.length}개`
      + (r.sig ? ` (고유 노드 ${r.sig[0]}×${r.sig[1]})` : ' ⚠ 진입 실패'));
    for (const s of r.sels) console.log(`     sel: ${s}`);
    for (const b of r.bad) {
      total++;
      const pct = ((b.ratio - 1) * 100).toFixed(1);
      console.log(`   ${b.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${b.kind}] ${b.sel}  «${b.txt}»  ${b.w}×${b.h}`);
      for (const c of b.chain) console.log(`      ← ${c}`);
    }
  }

  console.log('\n[ⓒ] 등급이 무엇을 바꾸는가 — 최저 등급 ↔ 최고 등급');
  for (const v of gradeVerdict) {
    if (v.why) { console.log(`   ${v.frame}: ${v.why}`); continue; }
    console.log(`   ${v.frame}: 색 갈림 ${v.colDiff ? 'O' : 'X'} · 기하 동일 ${v.geoSame ? 'O' : 'X'}`);
    console.log(`      최저 face/rim ${v.lo[0]}/${v.lo[1]}`);
    console.log(`      최고 face/rim ${v.hi[0]}/${v.hi[1]}`);
    console.log(`      기하(box·transform·font-size) ${v.hi[2]}`);
  }

  /* ⇒ 이 회차의 판정 — «넓힌 상태가 기준선에 없던 kind·선택자를 여는가» */
  console.log('\n[⇒] 새 kind·선택자 판정 (기준선 대비)');
  for (const r of rows) {
    if (!r.base) continue;
    const b = rows.find((x) => x.frame === r.frame && x.label === r.base);
    if (!b) { console.log(`   ${r.frame} · ${r.label}: 기준선 행 없음`); continue; }
    const nk = r.kinds.filter((k) => !b.kinds.includes(k));
    const ns = r.sels.filter((s) => !b.sels.includes(s));
    console.log(`   ${r.frame} · ${r.label}`);
    console.log(`      기준선 «${r.base}» — kind ${b.kinds.join('+') || '없음'} · 선택자 ${b.sels.length}종 · 귀속 ${b.own}`);
    console.log(`      이 상태            — kind ${r.kinds.join('+') || '없음'} · 선택자 ${r.sels.length}종 · 귀속 ${r.own}`);
    console.log(`      ⇒ 새 kind ${nk.length}개${nk.length ? ' (' + nk.join(', ') + ')' : ''}`
      + ` · 새 선택자 ${ns.length}개${ns.length ? ' (' + ns.join(', ') + ')' : ''}`);
  }

  console.log(`\n합계 비균등 노드 ${total}개`);
  if (errs.length) { console.log('[!] 진입/무음 실패'); errs.forEach((e) => console.log('  ' + e)); }
  process.exit(0);
})();
