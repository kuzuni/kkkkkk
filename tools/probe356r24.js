#!/usr/bin/env node
/* 작업 356 24회차 — «자가 안 보는 그리기 경로» 인구조사 (측정 전용 · 판정은 verify356.js [H])
 *
 *   node tools/probe356r24.js            # 축 인구조사 — 감시 중인 출처 / 감시 밖 구성물
 *   node tools/probe356r24.js --all      # 음성항 표본까지 전부 찍는다(무엇을 «안» 세는지)
 *   node tools/probe356r24.js --revert   # 되돌림 — 감시 밖 구성물을 하나씩 주입해 실제로 빨개지는지
 *
 * ── 왜 이 자가 필요한가 (23회차 → 24회차) ───────────────────────────────────
 * 23회차가 다섯째 프런티어를 닫으면서 **자기 한계를 글로 적어 넘겼다**:
 *
 *     « 0건은 언제나 **자가 보는 축 안에서의** 0건이다. 616 은 게이트가 스무두 회차 초록인 채로
 *       눈에 보이는 45% 찌그러짐과 공존했다. 새 그림 경로가 들어오면
 *       (WebGL · background-size:100% 100% · filter · CSS aspect-ratio 강제) **축을 먼저 세어라.** »
 *
 * 그 문장은 **사람에게 맡긴 당부**다. 356 의 스물세 회차가 되풀이해 증명한 것이 바로
 * «사람이 기억해야 하는 규율은 진다» 는 것이다 —
 *   · 11·12·15회차: 화면이 `SCREENS` 에 «없어서» 열두 회차 동안 안 보였다
 *   · 21·22회차: 문이 없어서 못 밟았다
 *   · **616**: 게이트 스물두 회차 초록 + 실제 45% 찌그러짐 (축이 없어서)
 * 셋 다 «다음 세션이 잊지 않으면 되는» 문제였고, 셋 다 **잊혔다.**
 *
 * ⇒ 이 자는 그 당부를 **자로 바꾼다.** 축을 세는 일을 다음 세션의 기억이 아니라 게이트에 맡긴다:
 *    감시 밖 구성물이 **소스에 하나라도 생기면 빨개지고**, 빨간 줄이 «축을 먼저 세워라» 라고 말한다.
 *
 * ── 무엇을 세는가 ──────────────────────────────────────────────────────────
 * 브라우저를 안 띄운다. **소스 텍스트**를 센다(전수 스윕은 probe356r23 몫).
 * 세는 대상은 «찌그러뜨릴 수 있는데 356 의 여섯 축 중 어느 것도 안 보는» 구성물이다.
 *
 * ⚠ **주석을 먼저 걷어낸다.** 이 파일을 처음 쓸 때 `grep object-fit:fill` 이 2건을 물어 왔는데
 *    **둘 다 주석**이었다(5525·5528 — 4회차가 왜 그 자리를 눌렀는지 적어 둔 이력).
 *    356 은 스물세 회차가 남긴 주석이 제품보다 긴 파일이라, 주석을 안 걷으면
 *    **«과거에 고쳤다는 기록» 이 «지금 있는 결함» 으로 읽힌다.**
 *
 * ⚠ 음성항이 이 자의 절반이다 — 아래 셋은 **있어도 결함이 아니라서 안 센다**:
 *    · `background-size:100% 100%` 인데 배경이 **그라디언트** (원본 종횡이 없다 = 찌그러질 것이 없다)
 *    · `filter:` 색·그림자 계열 (`grayscale`·`brightness`·`drop-shadow` … 기하를 안 건드린다)
 *    · `scale:1 1` 같은 **등방** 선언 (크기 변경은 결함이 아니다 — 23회차 [G-d] 와 같은 규율)
 *    이 셋을 안 가르면 상시 빨간 자가 되고, 상시 빨간 자는 꺼진 자와 같다.
 */
const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '..', 'index.html');

/* ── 주석 걷기 ────────────────────────────────────────────────────────────
   `/* … *​/` (css·js 블록) 과 `<!-- … -->` (html) 만 걷는다. 줄 주석(`//`)은 안 걷는다 —
   `url(http://…)` 처럼 «주석이 아닌 //» 가 있어 걷으면 오히려 본문이 잘린다.
   대신 줄 주석 안에 이 자가 세는 구성물이 들어갈 일은 없다(전부 CSS 선언·JS 호출 꼴이다).

   ⚠ **줄바꿈은 남긴다** — 주석을 공백 하나로 접으면 걷은 뒤의 줄 번호가 원문과 어긋나
   빨간 줄이 **없는 자리를 가리킨다**(이 자를 처음 돌렸을 때 실제로 그랬다: 6404 를 2917 로 불렀다).
   자가 «몇 줄» 이라고 말하면 다음 세션은 그 줄을 연다. */
const blank = (s) => s.replace(/[^\n]/g, ' ');
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
}

/* ── 감시 밖 구성물 ────────────────────────────────────────────────────────
   each: { key, 이름, rx, why, 축 } — `rx` 가 무는 것은 전부 «축이 없는» 자리다.
   새 축을 자에 세우면 그 항을 여기서 빼고 해당 절로 옮긴다(= 이 표가 줄어드는 것이 정상). */
const UNWATCHED = [
  {
    key: 'webgl',
    name: 'WebGL 컨텍스트',
    rx: /getContext\(\s*['"](?:webgl2?|experimental-webgl)['"]/g,
    why: '2d 훅(probe356r23)이 통째로 못 본다 — drawImage·ctx 변환 축이 전부 무력해진다',
  },
  {
    key: 'aspect',
    name: 'CSS aspect-ratio 강제',
    rx: /(?:^|[;{\s])aspect-ratio\s*:/g,
    why: '상자 종횡을 선언으로 못박는다 — 상자를 재는 축(scan418·[G-e])의 전제를 바꾼다',
  },
  {
    key: 'filterUrl',
    name: 'filter: url() (SVG 필터)',
    rx: /filter\s*:[^;}"']*\burl\(/g,
    why: 'SVG 필터는 기하를 바꿀 수 있다 — 색·그림자 필터와 달리 찌그러뜨릴 수 있다',
  },
  {
    key: 'borderImage',
    name: 'border-image',
    rx: /(?:^|[;{\s])border-image(?:-source)?\s*:/g,
    why: '테두리 슬라이스는 원본 종횡과 무관하게 늘어난다 — 어느 축도 안 본다',
  },
];

/* ── 일곱째 출처 — url() 배경 (23회차가 «안 세운다» 고 판단한 축) ──────────────
 * 23회차는 이 축을 세우지 않기로 하면서 근거를 이렇게 적었다:
 *
 *   « `background-size:100% 100%` 는 소스에 여러 벌 있지만 **전부 그라디언트**다 …
 *     **원본 종횡이 있는 배경**(`url(...)`)은 소스 전체에 **한 곳뿐**이고(`.rw-stone`, 6404)
 *     그 한 곳은 viewBox ↔ 상자 ↔ background-size 로 **세 값이 같다**.
 *     ⇒ 축을 세워도 상시 0 인 항이 하나 늘 뿐이라 안 세웠다. »
 *
 * ⚑ **24회차 정정 — 그 «한 곳뿐» 은 13곳이다.** 23회차의 셈은 `grep 'background[^;{]*url('`
 *    꼴이라 **줄 단위**인데, 이 파일의 배경 선언 열둘은 `background:` 와 `url(` 이
 *    **다른 줄**에 있다(패턴 타일 텍스처가 전부 그 꼴이다). 줄을 넘는 선언을 줄 단위 자로 세면
 *    **안 세어진다** — 12곳이 그렇게 빠졌다.
 *
 * ⚑ **그런데 23회차의 «판단» 은 옳았다.** 열셋을 실제로 재 보니 **열셋 다** background-size 가
 *    원본 종횡과 정확히 같다(235×235→235px 235px · 153.75×229.85→153.75px 229.85px · …).
 *    ⇒ 결론(0자리)은 그대로고, 틀린 것은 **수(1)** 다.
 *    23회차가 [G-c] 에서 스스로 적은 교훈이 이 자리에도 그대로 적용된다:
 *      « 적는 말과 재는 값이 어긋나면 다음 세션이 그 말을 믿는다. »
 *
 * ⇒ 그래서 이 축은 **세는 자가 아니라 재는 자**로 세운다. «몇 곳인가» 를 등재값으로 굳히면
 *    (23회차가 «1» 을 굳혔듯) 그 수가 틀리는 순간 축이 통째로 거짓이 된다.
 *    **곳 수는 안 굳히고 곳마다 비를 잰다** — 곳이 몇으로 늘든 옳으면 초록이다. */
const BG_TOL = 0.02;                       /* [A]·[B] 와 같은 허용 오차 */

function bgLayers(src) {
  const out = [];
  const rx = /background(?:-image)?\s*:/g;
  let m;
  while ((m = rx.exec(src)) !== null) {
    /* 선언 끝 = 괄호 깊이 0 에서 만나는 `;` 또는 `}`.
       ⚠ 정규식으로 `[^;}]*` 를 쓰면 안 된다 — `calc(100% - 12px)` 의 그라디언트가 통째로 잘린다. */
    let d = 0, j = m.index + m[0].length, end = src.length;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (ch === '(') d++;
      else if (ch === ')') d--;
      else if ((ch === ';' || ch === '}') && d === 0) { end = j; break; }
    }
    const decl = src.slice(m.index, end);
    if (!/\burl\(/.test(decl)) continue;
    /* ⚠ data:svg 의 따옴표는 **두 꼴**로 쓰여 있다 — 날것 `width='235'` 과
       URL 인코딩 `width=%22400%22`. 인코딩 꼴을 안 풀면 그 자리는 «원본을 못 읽었다» 로
       조용히 건너뛴다 — 그리고 하필 그 자리가 23회차가 유일하게 확인해 둔 `.rw-stone`(6404)이다.
       «못 봐서 0» 을 «없어서 0» 으로 읽는 것이 이 작업이 스물세 회차 동안 되풀이한 실수다. */
    const flat = decl.replace(/\s+/g, ' ').replace(/%22/g, '"').replace(/%27/g, "'");
    /* 원본 종횡 — data:svg 는 width/height 속성이 곧 내재 크기다 */
    const sv = flat.match(/\bwidth=["']([0-9.]+)["']\s+height=["']([0-9.]+)["']/);
    /* 그 url 레이어에 붙은 `/W H` (background 단축의 size 자리) */
    const tail = flat.slice(flat.indexOf(')', flat.indexOf('url(')) + 1);
    const sz = tail.match(/^[^,]*?\/\s*([0-9.]+)px\s+([0-9.]+)px/);
    /* ⚠ 크기는 단축(`… /W H`) 말고 **별도 프로퍼티** `background-size:` 로도 올 수 있다.
       그 꼴을 «단축에 크기가 없다 = auto = 원본 크기 = 안 찌그러진다» 로 읽으면 **헛초록**이다.
       지금 제품에 그런 블록은 **0개**지만, «없어서 0» 을 «안전해서 0» 으로 적는 것이
       23회차가 url 배경에서 한 실수 그대로다 ⇒ 그런 자리가 생기면 조용히 넘기지 말고
       **«측정 불가»로 빨개지게** 한다(자를 그때 넓히라는 신호다). */
    /* ⚠ 규칙 블록은 선언 끝(`end`)이 아니라 **닫는 `}` 까지**다 —
       `background:… ; background-size:…` 는 별도 프로퍼티가 선언 **뒤**에 오므로
       `end` 까지만 잘라 보면 영영 못 본다(이 항을 처음 짰을 때 실제로 안 걸렸다). */
    const openAt = src.lastIndexOf('{', m.index);
    let closeAt = src.indexOf('}', m.index);
    if (closeAt < 0) closeAt = src.length;
    const rule = openAt >= 0 ? src.slice(openAt, closeAt) : '';
    const sepSize = /background-size\s*:/.test(rule);
    out.push({
      line: src.slice(0, m.index).split('\n').length,
      nat: sv ? { w: +sv[1], h: +sv[2] } : null,
      size: sz ? { w: +sz[1], h: +sz[2] } : null,
      sepSize,
      snippet: flat.slice(0, 60),
    });
  }
  return out;
}

/* 재는 것은 «상자 종횡 ÷ 원본 종횡». 1 에서 멀면 찌그러진 것이다. */
function bgCheck(src) {
  const rows = bgLayers(src);
  const measured = [], skipped = [], unknown = [], bad = [];
  for (const r of rows) {
    /* 단축에 크기가 없는데 같은 규칙에 `background-size:` 가 따로 있다 = 이 자가 못 재는 꼴 */
    if (!r.size && r.sepSize) { unknown.push(r); bad.push(Object.assign({ ratio: null }, r)); continue; }
    if (!r.nat || !r.size) { skipped.push(r); continue; }   /* size 생략 = auto = 원본 크기 = 안 찌그러진다 */
    const ratio = (r.size.w / r.size.h) / (r.nat.w / r.nat.h);
    const row = Object.assign({ ratio: +ratio.toFixed(4) }, r);
    measured.push(row);
    if (Math.abs(ratio - 1) > BG_TOL) bad.push(row);
  }
  return { rows, measured, skipped, unknown, bad };
}

/* ── 음성항 표본 — «있어도 안 센다» 를 실측으로 보이는 자리 ────────────────── */
const NEGATIVE = [
  { key: 'bgSizeFull', name: 'background-size:100% 100% (그라디언트)', rx: /background-size\s*:\s*100%\s+100%/g },
  { key: 'filterColor', name: 'filter: 색·그림자 계열', rx: /filter\s*:\s*(?!none)(?![^;}"']*\burl\()[^;}"']+/g },
  { key: 'scaleUniform', name: 'CSS scale: 등방 선언', rx: /(?:^|[;{\s])scale\s*:\s*([-0-9.]+)(?:\s+([-0-9.]+))?/g },
];

function count(src, rx) {
  rx.lastIndex = 0;
  const hits = [];
  let m;
  while ((m = rx.exec(src)) !== null) {
    hits.push({ index: m.index, text: m[0], groups: m.slice(1) });
    if (m.index === rx.lastIndex) rx.lastIndex++;
  }
  return hits;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

/* ── 인구조사 본체 ────────────────────────────────────────────────────────
   raw 를 받아 주석을 걷고 센다. verify356 [H] 가 이 함수를 그대로 쓴다. */
function census(raw) {
  const src = stripComments(raw);
  const rows = UNWATCHED.map((a) => {
    const hits = count(src, a.rx);
    const base = a.base || 0;
    return {
      key: a.key, name: a.name, why: a.why, base,
      n: hits.length,
      over: Math.max(0, hits.length - base),
      lines: hits.map((h) => lineOf(src, h.index)),
    };
  });
  const neg = NEGATIVE.map((a) => {
    const hits = count(src, a.rx);
    let n = hits.length;
    if (a.key === 'scaleUniform') {
      /* 등방만 음성항이다 — 비등방 `scale:1 .8` 은 scan356 이 이미 보는 축이라 여기서 안 센다 */
      n = hits.filter((h) => {
        const x = Number(h.groups[0]);
        const y = h.groups[1] === undefined ? x : Number(h.groups[1]);
        return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-9;
      }).length;
    }
    return { key: a.key, name: a.name, n };
  });
  const bg = bgCheck(src);
  return { rows, neg, bg, bad: rows.filter((r) => r.over > 0) };
}

module.exports = { census, bgCheck, bgLayers, stripComments, UNWATCHED, NEGATIVE, HTML, BG_TOL };

/* ── CLI ─────────────────────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2);
  const ALL = argv.includes('--all');
  const REVERT = argv.includes('--revert');
  let PASS = 0, FAIL = 0;
  const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m); } else { FAIL++; console.log('  ✗ ' + m); } };

  const raw = fs.readFileSync(HTML, 'utf8');
  const c = census(raw);

  console.log('[1] 감시 밖 구성물 — 하나라도 있으면 «축을 먼저 세워라»');
  for (const r of c.rows) {
    const label = r.base
      ? `${r.name} — ${r.n}건 (등재 BASE ${r.base}, 초과 ${r.over})`
      : `${r.name} — ${r.n}건`;
    ok(r.over === 0, label + (r.over ? ` · 줄 ${r.lines.join(',')} · ${r.why}` : ''));
  }

  console.log('\n[1-b] 일곱째 출처 — url() 배경의 상자 종횡 ÷ 원본 종횡 (곳 수는 안 굳힌다)');
  for (const r of c.bg.measured) {
    console.log(`  · ${String(r.line).padStart(5)}행  원본 ${r.nat.w}×${r.nat.h} → 상자 ${r.size.w}×${r.size.h}  ×${r.ratio}`);
  }
  for (const r of c.bg.skipped) {
    console.log(`  · ${String(r.line).padStart(5)}행  size 생략(auto = 원본 크기) — 안 잰다 · ${r.snippet}`);
  }
  for (const r of c.bg.unknown) {
    console.log(`  · ${String(r.line).padStart(5)}행  **측정 불가** — 단축에 크기가 없는데 규칙에 별도 background-size 가 있다`);
  }
  ok(c.bg.bad.length === 0,
    `url() 배경 ${c.bg.rows.length}곳 중 잰 ${c.bg.measured.length}곳 · 원본 종횡을 어기는 자리 ${c.bg.bad.length}`
    + (c.bg.unknown.length ? ` · 측정 불가 ${c.bg.unknown.length}` : '')
    + (c.bg.bad.length ? ': ' + c.bg.bad.map((r) => `${r.line}행 ${r.ratio === null ? '측정 불가' : '×' + r.ratio}`).join(' · ') : ''));
  ok(c.bg.measured.length > 1,
    `잰 곳 ${c.bg.measured.length} — 23회차의 «한 곳뿐» 은 줄 단위 grep 의 셈이었다(선언이 줄을 넘는다)`);

  console.log('\n[2] 음성항 — 있어도 «찌그러짐» 이 아니라서 안 세는 것');
  for (const r of c.neg) console.log(`  · ${r.name}: ${r.n}건 (안 센다)`);
  ok(c.neg.some((r) => r.n > 0),
    `음성항 표본 ${c.neg.reduce((s, r) => s + r.n, 0)}건 — 이 자는 «있는 것을 전부 빨갛다고 하는» 자가 아니다`);

  console.log('\n[3] 주석 걷기 — 과거 이력이 현재 결함으로 안 읽히는가');
  const rawFill = count(raw, /object-fit\s*:\s*fill/g).length;
  const srcFill = count(stripComments(raw), /object-fit\s*:\s*fill/g).length;
  ok(rawFill > srcFill,
    `\`object-fit:fill\` 원문 ${rawFill}건 → 주석 걷은 뒤 ${srcFill}건 — 주석을 안 걷으면 이력이 결함으로 읽힌다`);

  if (ALL) {
    console.log('\n[전수] 감시 밖 구성물의 실제 자리');
    for (const r of c.rows) if (r.n) console.log(`  ${r.name}: 줄 ${r.lines.join(', ')}`);
  }

  /* ── 되돌림 — 감시 밖 구성물을 주입하면 정말 빨개지는가 ──────────────────
     자가 «0» 이라고 말할 때 그것이 «없어서 0» 인지 «못 봐서 0» 인지는
     주입해 보기 전에는 모른다(21회차 교훈 · 23회차 [G-c] 와 같은 규율). */
  if (REVERT) {
    console.log('\n[R] 되돌림 — 구성물을 하나씩 주입해 [1] 이 실제로 빨개지는지');
    const inject = {
      webgl: `<script>var __t=document.createElement('canvas').getContext('webgl');</script>`,
      aspect: `<style>.__t356r24{aspect-ratio:3/1}</style>`,
      filterUrl: `<style>.__t356r24{filter:url(#squash)}</style>`,
      borderImage: `<style>.__t356r24{border-image:url(a.png) 30 stretch}</style>`,
    };
    for (const a of UNWATCHED) {
      const hurt = census(raw + '\n' + inject[a.key]);
      const row = hurt.bad.find((r) => r.key === a.key);
      ok(!!row, `[R-${a.key}] ${a.name} 을 주입하면 빨개진다` + (row ? ` (${row.n}건 · BASE ${row.base})` : ' — 주입해도 초록이다. 이 항은 아무것도 못 보는 자다'));
    }
    /* ── 일곱째 출처의 되돌림 — 재는 자라서 «주입» 이 아니라 «비를 어겨» 본다 ── */
    const SQ = `<style>.__t356r24{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3C/svg%3E") 0 0/140px 100px repeat}</style>`;
    const sq = census(raw + '\n' + SQ);
    const hit = sq.bg.bad;
    ok(hit.length === 1 && Math.abs(hit[0].ratio - 1.4) < 0.01,
      `[R-bg] 원본 100×100 을 상자 140×100 으로 늘리면 빨개진다 (${hit.length}자리 · ×${hit[0] && hit[0].ratio})`);

    /* 음성항 되돌림 셋 — 이 자가 «있는 것을 전부 빨갛다» 고 하는 자가 아님을 셋으로 못박는다 */
    const grad = census(raw + '\n<style>.__t356r24{background:linear-gradient(#000,#fff);background-size:100% 100%}</style>');
    ok(grad.bg.bad.length === 0,
      '[R-음성a] 그라디언트 배경을 더 넣어도 안 빨개진다 (원본 종횡이 없는 것은 찌그러질 것이 없다)');

    const iso = census(raw + `\n<style>.__t356r24{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3C/svg%3E") 0 0/40px 40px repeat}</style>`);
    ok(iso.bg.bad.length === 0,
      '[R-음성b] 원본 100×100 을 40×40 으로 **등방** 축소하면 안 빨개진다 (크기 변경은 결함이 아니다 — [G-d] 와 같은 규율)');

    const cmt = census(raw + '\n/* background:url("x.png") 0 0/9px 1px repeat · filter:url(#q) · border-image:url(a.png) 30 stretch */');
    ok(!cmt.bad.length && !cmt.bg.bad.length,
      '[R-음성c] 주석 안의 구성물 3종은 안 센다 (과거 이력이 현재 결함으로 안 읽힌다)');

    /* 측정 불가 축 — 단축이 아니라 별도 프로퍼티로 크기를 주면 «조용히 초록» 이 아니라 빨개져야 한다 */
    const sep = census(raw + `\n<style>.__t356r24{background:url("data:image/svg+xml,%3Csvg width='100' height='100'%3E%3C/svg%3E") repeat;background-size:140px 100px}</style>`);
    ok(sep.bg.unknown.length === 1 && sep.bg.bad.length === 1,
      `[R-sep] 크기를 별도 \`background-size:\` 로 주면 «측정 불가» 로 빨개진다 (${sep.bg.unknown.length}자리) — 이 자가 못 재는 꼴을 조용히 넘기지 않는다`);
  }

  console.log(`\n[probe356r24] ${PASS}/${PASS + FAIL} ${FAIL ? 'FAIL' : 'PASS'}`);
  process.exit(FAIL ? 1 : 0);
}
