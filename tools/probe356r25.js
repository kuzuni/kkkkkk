#!/usr/bin/env node
/* 작업 356 25회차 — «시간 축»: 애니메이션 한 주기 안의 종횡비 (측정 전용 · 판정은 verify356.js [I])
 *
 *   node tools/probe356r25.js            # 소스 인구조사 — 스케일을 건드리는 애니메이션이 무엇인가
 *   node tools/probe356r25.js --all      # 음성항까지 전부 찍는다(무엇을 «안» 세는지)
 *   node tools/probe356r25.js --live     # ⚑ 본체 — 대표 화면에서 **위상 스윕**으로 실제 값을 잰다
 *   node tools/probe356r25.js --revert   # 되돌림 — 스쿼시를 주입해 실제로 빨개지는지 (브라우저)
 *
 * ── 왜 이 자가 필요한가 (24회차 → 25회차) ───────────────────────────────────
 * 24회차가 여섯째 프런티어(«당부»)를 닫았다. 스물네 회차의 축은 전부 «**어디를·무엇을** 보는가»
 * 였다(화면·상태·사건·문·출처·구성물). 이 회차가 여는 것은 남은 한 축, «**언제** 보는가» 다.
 *
 *     `scan356.COLLECT` 는 화면이 가라앉은 뒤 `getComputedStyle` 을 **한 번** 읽는다.
 *     애니메이션이 도는 노드에서 그 한 점은 **주기의 어느 위상인지 아무도 안 정한 값**이다.
 *
 * ⚑ **이 회차의 첫 실측이 그 말을 그대로 확인했다.** 03 던전 카드 썸네일(`.dnc>.th>canvas`)은
 *    `thBob`(121 이 주인 지시 ⑥ 으로 만든 스쿼시·스트레치)을 **무한 재생**으로 돌고 있고,
 *    키프레임 선언은 `scale: 1 var(--thsqA,.96)` = **한 축만 4%** 다. 그런데 스윕이 읽은 값은
 *    카드 0 이 `1 0.999983` · 카드 1 이 `1 0.995454`(비 1.0046)로 **허용 오차 안**이었다.
 *    두 값이 다른 이유가 이 축의 존재 이유다 — 스윕은 **자기가 도착한 순간의 위상**을 읽는다.
 *
 * ⚠⚠ **그리고 같은 실측이 «소스만 읽는 자» 를 기각했다.** 이 파일의 1판은 소스 텍스트에서
 *    `.96` 을 읽고 «4% 찌그러짐» 이라고 말했는데, **화면의 실제 값은 0.5% 였다**:
 *    `--thsqA` 는 `thPlace` 가 카드마다 «줄일 px» 을 잉크 높이로 나눠 넣어 주는 런타임 값이고
 *    `.96` 은 **아무도 안 쓰는 폴백 리터럴**이다(121 6회차가 «비율이 아니라 px 로 준다» 로 바꾼 자리).
 *    ⇒ 소스 리터럴로 판정하면 **주인 승인 설계를 결함으로 부르는 자**가 된다.
 *    23·24회차가 되풀이해 못박은 규율(«적는 말과 재는 값이 어긋나면 다음 세션이 그 말을 믿는다»)이
 *    이번엔 **내 쪽에** 적용됐다. 그래서 소스 절은 **판정하지 않고 인구조사만** 하고,
 *    판정은 전부 아래 위상 스윕(`--live`)이 한다.
 *
 * ── 위상 스윕이 어떻게 도는가 ───────────────────────────────────────────────
 * 자를 두 벌로 안 적는다(13회차 [R12]). `COLLECT` 를 **그대로** 쓰되, 부르기 전에 페이지의
 * 애니메이션을 전부 **같은 위상에 못박는다**:
 *
 *     animation-play-state: paused  +  animation-delay: −(k/N) × 자기 duration
 *
 * 그러면 `getComputedStyle` 이 그 위상의 값을 돌려준다. k 를 0..N−1 로 돌려 **주기 전체**를 훑고
 * 노드마다 **최악 비**를 취한다. 즉 [A] 가 «한 점» 에서 하던 판정을 [I] 는 «한 주기» 에서 한다.
 *
 * ⚠ 위상을 못박는 것은 **인라인 스타일**이라 되돌릴 수 있다(측정이 제품을 안 바꾼다).
 * ⚠ `animation-duration` 은 쉼표로 여러 벌 올 수 있다(`animation` 이 여럿인 노드) — 벌마다 따로 민다.
 * ⚠ **라벨의 scaleX 는 여전히 대상이 아니다** — `COLLECT` 의 `iconKind` 가 그것을 가르므로
 *    이 자는 그 판정을 물려받는다(따로 안 적는다).
 */
const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '..', 'index.html');
const TOL = 0.02;                                  /* [A]·[B]·[H] 와 같은 허용 오차 */
const PHASES = 16;                                 /* 한 주기를 몇 칸으로 훑는가 */

/* 대표 화면 — [G] 가 쓴 것과 같은 규약(전 화면 순회는 [A] 몫, 이 절은 «축이 사는가» 를 본다).
   고른 근거: 03 던전·레이드가 `thBob`(이 저장소에서 유일하게 «아이콘에 걸린 스쿼시»)을 돌리고,
   26 펫·12 소환 결과는 쥬시(60) 애니메이션이 가장 많이 겹치는 자리다. */
const PICK = ['03 던전', '03 레이드', '26 펫', '12 소환 결과'];

/* ── 주석 걷기 — 24회차와 같은 규약(줄바꿈은 남긴다: 빨간 줄이 원문 줄을 가리켜야 한다) ── */
const blank = (s) => s.replace(/[^\n]/g, ' ');
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

function matchBrace(src, openAt) {
  let d = 0;
  for (let i = openAt; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (d === 0) return i; }
  }
  return src.length;
}

/* 괄호 깊이를 지키며 쪼갠다 — `var(--hb-s,1.06)` 의 쉼표와 `calc(1 + .04 * var(--a))` 의
   공백은 **구분자가 아니다.** 안 지키면 성분 수를 잘못 세어 «한 성분 = 등방» 을 놓친다. */
function splitTop(s, sep) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') { d++; cur += ch; continue; }
    if (ch === ')') { d--; cur += ch; continue; }
    if (d === 0 && sep.test(ch)) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* ── 소스 인구조사 — «스케일을 건드리는 애니메이션» 을 세운다 ────────────────
   ⚠ **판정하지 않는다.** 여기서 나오는 «성분이 둘» 은 결함 후보가 아니라 **위상 스윕이 반드시
      가 봐야 할 자리**의 목록이다(머리말의 `thBob` 함정 — 폴백 리터럴은 화면의 값이 아니다). */
function scaleShape(decl) {
  const txt = decl.replace(/\s+/g, ' ');
  let comps = null, axisOnly = false, runtime = false;

  const tm = /(?:^|[;{\s])transform\s*:\s*([^;}]+)/.exec(txt);
  if (tm) {
    const fn = /\bscale(X|Y|3d)?\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let m;
    while ((m = fn.exec(tm[1])) !== null) {
      const parts = splitTop(m[2], /,/);
      if (m[1] === 'X' || m[1] === 'Y') axisOnly = true;
      comps = Math.max(comps || 0, parts.length);
      if (parts.some((p) => /var\(|calc\(/.test(p))) runtime = true;
    }
  }
  const sm = /(?:^|[;{\s])scale\s*:\s*([^;}]+)/.exec(txt);
  if (sm && !/^none$/i.test(sm[1].trim())) {
    const parts = splitTop(sm[1].trim(), /\s/);
    comps = Math.max(comps || 0, parts.length);
    if (parts.some((p) => /var\(|calc\(/.test(p))) runtime = true;
  }
  return { touches: comps !== null || axisOnly, comps, axisOnly, runtime };
}

function sourceCensus(raw) {
  const src = stripComments(raw);
  const blocks = [], twoAxis = [], oneAxis = [];
  let steps = 0, withScale = 0;

  const rx = /@(?:-\w+-)?keyframes\s+([A-Za-z0-9_-]+)\s*\{/g;
  let m;
  while ((m = rx.exec(src)) !== null) {
    const openAt = src.indexOf('{', m.index);
    const closeAt = matchBrace(src, openAt);
    const body = src.slice(openAt + 1, closeAt);
    blocks.push({ name: m[1], line: lineOf(src, m.index) });

    const kf = /([^{}]+)\{([^{}]*)\}/g;
    let k;
    while ((k = kf.exec(body)) !== null) {
      steps++;
      const sh = scaleShape(k[2]);
      if (!sh.touches) continue;
      withScale++;
      /* 성분이 둘이거나 한 축만 적은 칸 = «종횡이 갈릴 수 있는» 칸. 값은 여기서 안 본다. */
      if (sh.comps >= 2 || sh.axisOnly) {
        twoAxis.push({ name: m[1], at: k[1].replace(/\s+/g, ' ').trim(),
                       runtime: sh.runtime, line: lineOf(src, openAt + 1 + k.index) });
      }
    }
    /* 한 축만 애니메이트하는 «상자» 애니메이션 — 상자가 아니라 아이콘에 걸리면 시간에 따라
       그림의 종횡이 변한다. 그 판정도 위상 스윕이 한다(여기서는 이름만 모은다). */
    const w = /(?:^|[;{\s])width\s*:/.test(body), h = /(?:^|[;{\s])height\s*:/.test(body);
    if (w !== h) oneAxis.push({ name: m[1], axis: w ? 'width' : 'height', line: lineOf(src, m.index) });
    rx.lastIndex = closeAt;
  }

  /* WAAPI — 배열 리터럴만 읽는다. 못 읽는 꼴은 «측정 불가» 로 돌려준다(24회차 처방). */
  const wa = { calls: [], twoAxis: [], unknown: [] };
  const ra = /\.animate\s*\(/g;
  while ((m = ra.exec(src)) !== null) {
    const line = lineOf(src, m.index);
    let i = m.index + m[0].length;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== '[') { wa.calls.push({ line, parsed: false });
      wa.unknown.push({ line, why: '키프레임이 배열 리터럴이 아니다 — 이 자가 못 읽는다' }); continue; }
    let d = 0, j = i, end = src.length;
    for (; j < src.length; j++) {
      if (src[j] === '[') d++;
      else if (src[j] === ']') { d--; if (d === 0) { end = j; break; } }
    }
    wa.calls.push({ line, parsed: true });
    const ob = /\{([^{}]*)\}/g; let o, n = 0;
    while ((o = ob.exec(src.slice(i + 1, end))) !== null) {
      n++;
      const sh = scaleShape(o[1].replace(/['"`]/g, '').replace(/,/g, ';'));
      if (sh.touches && (sh.comps >= 2 || sh.axisOnly)) wa.twoAxis.push({ line, at: 'kf#' + n, runtime: sh.runtime });
    }
    ra.lastIndex = end;
  }
  return { blocks, steps, withScale, twoAxis, oneAxis, wa };
}

/* ── 위상 못박기 — 페이지 안에서 돈다 ────────────────────────────────────
   ⓐ frac 이 숫자면 그 위상에 못박고, null 이면 인라인 값을 걷어 원래대로 돌린다.
   ⓑ 되돌릴 수 있게 **인라인 스타일만** 만진다 — 측정이 제품을 안 바꾼다. */
const PIN = function (frac) {
  const dur = (s) => s.split(',').map((x) => {
    const t = x.trim();
    const v = parseFloat(t);
    return !Number.isFinite(v) ? 0 : (/ms\s*$/.test(t) ? v / 1000 : v);
  });
  let n = 0;
  for (const el of document.querySelectorAll('#app, #app *')) {
    const cs = getComputedStyle(el);
    if (!cs.animationName || cs.animationName === 'none') continue;
    n++;
    if (frac === null) { el.style.animationPlayState = ''; el.style.animationDelay = ''; continue; }
    el.style.animationPlayState = 'paused';
    el.style.animationDelay = dur(cs.animationDuration).map((d) => (-(frac * d)) + 's').join(',');
  }
  return n;
};

module.exports = { sourceCensus, scaleShape, splitTop, stripComments, PIN, HTML, TOL, PHASES, PICK };

/* ─────────────────────────────── CLI ─────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2);
  const ALL = argv.includes('--all');
  const LIVE = argv.includes('--live');
  const REVERT = argv.includes('--revert');
  const raw = fs.readFileSync(HTML, 'utf8');

  let pass = 0, fail = 0;
  const ok = (s) => { pass++; console.log('  ✓ ' + s); };
  const bad = (s) => { fail++; console.log('  ✗ ' + s); };
  const done = () => { console.log(`\nprobe356r25 ${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail}`); process.exit(fail ? 1 : 0); };

  const c = sourceCensus(raw);
  console.log('probe356r25 — 시간 축(애니메이션 한 주기 안의 종횡비)\n');
  console.log('[1] 소스 인구조사 — 위상 스윕이 가 봐야 할 자리 (판정 아님)');
  if (c.blocks.length && c.steps) ok(`전제 — @keyframes ${c.blocks.length}블록 · 키프레임 ${c.steps}칸을 읽었다`);
  else bad('전제 — @keyframes 를 못 읽었다 (아래 목록은 «못 봐서 0» 이다)');
  if (c.withScale) ok(`스케일을 건드리는 칸 ${c.withScale}개 (나머지 ${c.steps - c.withScale}칸은 translate·opacity·rotate 만 = 음성항)`);
  else bad('스케일을 건드리는 키프레임이 0칸 — 이 축은 공허하다');
  console.log(`  · 종횡이 갈릴 수 있는 칸(성분 2 또는 한 축만) ${c.twoAxis.length}개:`);
  for (const t of c.twoAxis) console.log(`      ${t.name}@${t.at} 줄 ${t.line}${t.runtime ? '  ⚠ 런타임 값(var/calc) — 소스 리터럴로 판정 금지' : ''}`);
  console.log(`  · 한 축만 움직이는 상자 애니메이션 ${c.oneAxis.length}개: ` + c.oneAxis.map((o) => `${o.name}(${o.axis}, 줄 ${o.line})`).join(' · '));
  console.log(`  · WAAPI 호출 ${c.wa.calls.length}건(배열 리터럴 ${c.wa.calls.filter((x) => x.parsed).length}) · 종횡이 갈릴 수 있는 칸 ${c.wa.twoAxis.length}개`);
  if (!c.wa.unknown.length) ok('WAAPI 측정 불가 0건');
  else bad(`WAAPI 측정 불가 ${c.wa.unknown.length}건: ` + c.wa.unknown.map((u) => `줄 ${u.line} — ${u.why}`).join(' · '));

  if (ALL) {
    console.log('\n[음성항] 스케일을 건드리는데 «한 성분» 이라 종횡이 못 갈리는 칸');
    console.log('  (CSS 정의상 한 성분은 두 축에 같이 간다 — 값을 못 읽어도 등방이다.');
    console.log('   이 저장소에 그 꼴이 실재한다: `scale: calc(1 + .04*var(--jz-amp))` · `scale(var(--hb-s,1.06))`)');
    console.log(`  칸 수 = ${c.withScale - c.twoAxis.length}`);
  }

  if (!LIVE && !REVERT) done();

  (async () => {
    const { pw, launch } = require('./pwlaunch');
    const { chromium } = pw();
    const { COLLECT, URL, STEP, SCREENS } = require('./scan356.js');
    const browser = await launch(chromium);

    /* 한 화면을 열고 위상 0..N−1 을 훑어 노드마다 «최악 비» 를 낸다. */
    const sweep = async (label, inject) => {
      const line = SCREENS.find(([l]) => l === label);
      if (!line) return { miss: `SCREENS 에 «${label}» 줄이 없다` };
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(1400);
      for (const st of line[1]) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(220); }
      await page.waitForTimeout(900);
      if (inject) await page.addStyleTag({ content: inject });

      const animated = await page.evaluate(PIN, 0);
      const worst = new Map();
      let one = null;
      for (let k = 0; k < PHASES; k++) {
        await page.evaluate(PIN, k / PHASES);
        const rows = await page.evaluate(COLLECT, { all: false });
        if (k === 0) one = rows;
        for (const r of rows) {
          if (!r.sx || !r.sy) continue;
          const ratio = Math.max(r.sx / r.sy, r.sy / r.sx);
          const key = r.path || (r.txt + '·' + r.sx);
          const cur = worst.get(key);
          if (!cur || ratio > cur.ratio) worst.set(key, { key, ratio, at: k / PHASES, sx: r.sx, sy: r.sy });
        }
      }
      await page.evaluate(PIN, null);
      await ctx.close();
      const rows = [...worst.values()].filter((x) => x.ratio - 1 > TOL).sort((a, b) => b.ratio - a.ratio);
      /* «한 점만 봤다면» 잡혔을 것 — [A] 가 이 축에 얼마나 눈이 먼지의 실측 */
      const atRest = (one || []).filter((r) => r.sx && r.sy && Math.max(r.sx / r.sy, r.sy / r.sx) - 1 > TOL);
      return { animated, rows, atRest: atRest.length, nodes: (one || []).length };
    };

    if (LIVE) {
      console.log('\n[2] 위상 스윕 — 대표 화면 ' + PICK.length + '곳 × 한 주기 ' + PHASES + '칸');
      let anyAnim = 0, anyNode = 0;
      for (const label of PICK) {
        const r = await sweep(label);
        if (r.miss) { bad(`[live] ${label} — ${r.miss}`); continue; }
        anyAnim += r.animated; anyNode += r.nodes;
        if (!r.rows.length) ok(`[live] ${label} — 아이콘 ${r.nodes}개 · 애니 노드 ${r.animated}개 · 한 주기 어느 위상에도 비균등 0`);
        else bad(`[live] ${label} — 비균등 ${r.rows.length}자리: `
          + r.rows.slice(0, 5).map((x) => `${x.key} 최악 비 ${x.ratio.toFixed(4)} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));
      }
      if (anyAnim > 0) ok(`전제 — 대표 화면에서 애니메이션이 걸린 노드 ${anyAnim}개를 실제로 못박았다 (0 이면 위 초록은 헛초록)`);
      else bad('전제 — 애니메이션이 걸린 노드를 한 개도 못 봤다 — 위상 스윕이 아무것도 안 훑었다');
      if (anyNode > 0) ok(`전제 — COLLECT 가 아이콘 ${anyNode}개를 돌려줬다 (라벨은 iconKind 가 이미 걸렀다)`);
      else bad('전제 — COLLECT 가 아이콘을 0개 돌려줬다');
    }

    if (REVERT) {
      console.log('\n[3] 되돌림 — 스쿼시를 주입하면 위상 스윕이 정말 잡는가');
      /* ⚑ 이 절이 이 회차의 본체다. 주입하는 것은 «상태가 없어도 도는» 무한 애니메이션인데,
         **한 점에서는 안 걸리고 한 주기에서는 걸리는** 모양으로 만든다:
         0%·100% 가 등방이고 한복판만 늘어나면, 스윕이 도착하는 순간(위상 0 근처)에는 등방이다. */
      const INJ = '@keyframes __r25sq{0%,100%{scale:1 1}50%{scale:1.4 1}}'
                + '#app .tab>span.ti{animation:__r25sq 30s linear infinite}';
      const r = await sweep('A1 탭바 열림', INJ);
      if (r.miss) bad('[revert] 화면을 못 열었다 — ' + r.miss);
      else {
        if (r.rows.length) ok(`[R-a] 주입한 스쿼시를 위상 스윕이 잡는다 — ${r.rows.length}자리 · 최악 비 ${r.rows[0].ratio.toFixed(3)} @위상 ${(r.rows[0].at * 100).toFixed(0)}%`);
        else bad('[R-a] 주입했는데 위상 스윕이 0자리 — 이 절은 아무것도 못 보는 자다');
        if (r.atRest === 0 && r.rows.length) ok(`[R-b] ⚑ 같은 것을 «한 점»([A] 의 방식)으로 읽으면 ${r.atRest}자리 — 이 축이 새 축인 이유의 실측`);
        else if (r.rows.length) bad(`[R-b] 한 점에서도 ${r.atRest}자리가 잡힌다 — 이 표본으로는 «[A] 가 눈이 멀었다» 를 못 보인다`);
      }
      /* 음성항 — 등방 애니메이션을 같은 자리에 주입하면 안 잡혀야 한다(상시 빨간 자가 아니다) */
      const r2 = await sweep('A1 탭바 열림',
        '@keyframes __r25uni{0%,100%{scale:1}50%{scale:1.4}}#app .tab>span.ti{animation:__r25uni 30s linear infinite}');
      if (!r2.miss && !r2.rows.length) ok('[R-c] 음성항 — 등방 애니(scale 1→1.4→1)를 같은 자리에 주입해도 0자리 (크기 변경은 결함이 아니다)');
      else bad(`[R-c] 음성항 실패 — 등방을 주입했는데 ${r2.rows ? r2.rows.length : '?'}자리가 잡혔다`);
    }

    await browser.close();
    done();
  })().catch((e) => { console.error(e); process.exit(2); });
}
