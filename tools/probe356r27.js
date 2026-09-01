#!/usr/bin/env node
/* 작업 356 27회차 — «의사 이름» 축: `::before`/`::after` 말고 **다른 의사 이름**은?
 *   (재현·측정 전용 · 판정은 verify356.js [K])
 *
 *   node tools/probe356r27.js            # 의사 이름 12종을 «읽히는가 / transform 이 먹는가» 로 가른다
 *   node tools/probe356r27.js --census   # 소스 인구조사만 (브라우저 없이)
 *
 * ── 왜 이 축인가 (26회차 → 27회차) ─────────────────────────────────────────
 * 26회차 인계문(review §34-7)이 아홉째 프런티어를 이렇게 적어 넘겼다:
 *
 *   > 아직 안 밟은 «노드가 아닌 것» 이 하나 더 있다 — `::marker`·`::first-letter`·`::selection` 과
 *   > `::part`/`::slotted`(웹 컴포넌트). 지금 제품에 0건이라 [J] 는 `::before`/`::after` 둘만 문다.
 *   > 넣을 때는 [J-a] 의 정규식 한 곳만 고치면 된다(수집기는 의사 이름을 인자로 받는다).
 *
 * 338 규칙대로 **처방 전에 재현**했고, 그 한 문단이 **네 곳에서 틀렸다.** 아래가 실측이다.
 *
 * ── 무엇을 재는가 ──────────────────────────────────────────────────────────
 * 의사 이름마다 **같은 선언**을 심고(`content:'🔥'; font-size:31px; transform:scaleX(.5)`)
 * `getComputedStyle(host, '::<이름>')` 이 무엇을 돌려주는지 읽는다. 호스트는 세 종류
 * (`div` · `li` · `input`)로 나눠 «그 이름이 붙을 수 있는 자리» 를 다 준다.
 * 묻는 것은 **두 가지**다 — ⓐ **읽히는가**(빈 문자열이면 눈이 없다) ⓑ **`transform` 이 먹는가**.
 * 356 의 축은 «비균등 배율» 하나이므로 ⓑ 가 거짓이면 그 이름은 **사정권 밖**이다.
 *
 * ⚠ 대조군이 이 자의 절반이다 — **없는 이름 `::bogus-xyz`** 를 같이 잰다.
 *   «못 읽는다» 를 «없다» 와 가르는 기준선이 그것뿐이다.
 *
 * ── 실측 결과 (2026-09-01 · Chromium 1194) ────────────────────────────────
 *
 *   | 이름                      | 읽힘 | transform | content | font-size | 판정        |
 *   |---------------------------|-----|-----------|---------|-----------|-------------|
 *   | `::before`                | ○   | **먹는다** | ○       | ○         | **대상**    |
 *   | `::after`                 | ○   | **먹는다** | ○       | ○         | **대상**    |
 *   | `::placeholder`           | ○   | **먹는다** | ○ ※     | ○         | **대상**    |
 *   | `::marker`                | ○   | none      | ○       | ○         | 사정권 밖   |
 *   | `::first-letter`          | ○   | none      | ✕       | ○         | 사정권 밖   |
 *   | `::first-line`            | ○   | none      | ✕       | ○         | 사정권 밖   |
 *   | `::selection`             | ○   | none      | ✕       | ✕         | 사정권 밖   |
 *   | `::backdrop`              | ○   | none      | ○       | ○         | 사정권 밖   |
 *   | `::file-selector-button`  | ○   | none      | ✕       | ✕         | 사정권 밖   |
 *   | `::cue`                   | ○   | none      | ✕       | ✕         | 사정권 밖   |
 *   | `::part`                  | **✕** | (빈 문자열) | —      | —         | **눈 없음** |
 *   | `::slotted`               | **✕** | (빈 문자열) | —      | —         | **눈 없음** |
 *   | `::bogus-xyz`(대조군)      | **✕** | (빈 문자열) | —      | —         | **눈 없음** |
 *
 * ※ `::placeholder` 의 `content` 는 **계산값으로는 받아 적히지만 화면에 그 글자가 뜨지 않는다** —
 *   실제로 그려지는 것은 호스트의 `placeholder` **속성**이다. 그래서 이 이름만 «무엇을 그리는가» 를
 *   `content` 가 아니라 속성에서 읽어야 한다(아래 ⚑ 참조). 표의 ○ 를 «content 로 그림을 넣을 수
 *   있다» 로 읽으면 안 된다.
 *
 * ⇒ 인계문이 틀린 네 곳:
 *
 *  ① **`::marker`·`::first-letter`·`::selection` 은 «넣어도 잡을 것이 없다».**
 *     셋 다 속성 제한 의사 요소라 **`transform` 이 적용되지 않는다**(선언해도 계산값이 `none`).
 *     [J] 에 넣으면 **사정권이 0인 항**이 스윕 비용만 늘리고 «0자리» 를 한 줄 더 찍는다 —
 *     24회차가 경고한 «없어서 0» 의 정확한 반대, **«못 찌그러져서 0»** 이다.
 *     ⚠ 단 `::marker` 는 `content` 와 `font-size` 를 **먹는다**(`li::marker{content:'🔥'}` 가
 *     실제로 🔥 로 읽힌다) — **그림은 살 수 있어도 자기 배율로는 못 눌린다.** 조상 누적으로
 *     눌리는 길은 [A] 가 이미 문다(호스트가 실 노드다).
 *
 *  ② **`::part`/`::slotted` 는 넣으면 «헛초록» 이 된다.** `getComputedStyle` 이 이 둘을
 *     **못 읽는다** — 돌려주는 것이 **빈 문자열**이고, 그 값은 **없는 이름 `::bogus-xyz` 와
 *     한 글자도 다르지 않다.** 즉 넣어도 «0자리» 는 영원히 0인데 그 0 이 «없어서 0» 인지
 *     «눈이 없어서 0» 인지 **이 자로는 못 가른다.** 11·21회차가 두 번 데인 그 모양이라
 *     **안 넣는 것이 맞고, 안 넣는 이유를 자가 말해야 한다**(→ verify356 [K-e] 가 대조군으로 못박는다).
 *
 *  ③ **인계문이 빠뜨린 이름이 정답이었다 — `::placeholder`.** 이것 하나가 `::before`/`::after`
 *     와 같은 자격이다(`transform` 이 먹는다). 게다가 **이 저장소에 이미 있다** —
 *     `index.html` 의 `.ch-in::placeholder{color:#7A6550;font-weight:900}`(103 채팅 입력창).
 *     인계문의 «지금 제품에 0건» 은 자기가 센 다섯 이름에 대해서만 참이었다.
 *
 *  ④ **«수집기는 의사 이름을 인자로 받는다» 도 틀렸다.** `probe356r26.COLLECT_PSEUDO` 는
 *     `for (const pe of ['::before', '::after'])` 로 **박아** 두었었다(26회차 143행).
 *     27회차가 그 한 줄을 `opt.pseudo` 로 열어 인계문의 문장을 **참으로 만들었다.**
 *
 * ⚑ **`::placeholder` 는 «그리는 것» 이 CSS `content` 가 아니다.** 계산된 `content` 는 `normal`
 *   이고 화면에 뜨는 글자는 **호스트의 `placeholder` 속성**이다. 26회차의 `contentKind()` 를
 *   그대로 대면 이 이름은 **한 줄도 안 걸린다**(또 «못 봐서 0»). 그래서 `COLLECT_PSEUDO` 에
 *   그 이름만 호스트 속성을 읽는 갈래를 세웠다 — 규율은 같다(그림문자«만» 이면 아이콘 ·
 *   글자가 섞이면 라벨이라 안 센다).
 */
const { pw, launch } = require('./pwlaunch');

const ARG = process.argv.slice(2);
const CENSUS_ONLY = ARG.includes('--census');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

/* 후보 의사 이름 — «없어서 안 넣었다» 를 안 적기 위해 **전부** 적고 실측으로 가른다(24회차 규율) */
const NAMES = ['before', 'after', 'placeholder', 'marker', 'first-letter', 'first-line',
  'selection', 'backdrop', 'file-selector-button', 'cue', 'part', 'slotted'];
/* 대조군 — 존재하지 않는 이름. «읽히는가» 축의 음성 기준선이다. */
const BOGUS = 'bogus-xyz';

/* 위 표를 **등재값이 아니라 자로** 쓰는 쪽(verify356 [K])이 읽는 세 갈래.
   ⚠ 수를 굳히지 않는다(24회차 [H-b] 규율) — 이름은 굳히되 «몇 종» 은 실측이 정한다. */
const PSEUDO_ON = ['::before', '::after', '::placeholder'];   /* transform 이 먹는다 = 356 사정권 */
const PSEUDO_OFF = ['marker', 'first-letter', 'first-line', 'selection', 'backdrop',
  'file-selector-button', 'cue'];                             /* 읽히지만 transform 이 안 먹는다 */
const PSEUDO_BLIND = ['part', 'slotted'];                     /* getComputedStyle 이 못 읽는다 */

const HOST_PH = '.ch-in';                                     /* 이 저장소의 유일한 `::placeholder` 호스트 */

/* 페이지 안에서 도는 분류기. **이름 목록을 인자로 받는다**(자를 두 벌로 안 적는다 — 13회차 [R12]).
   verify356 [K-d]/[K-e] 는 이것을 **제품 페이지에** 그대로 대서 제자리에서 잰다. */
const CLASSIFY = function (opt) {
  const names = opt.names.concat([opt.bogus]);
  const hosts = opt.hosts;                    /* [{key, sel}] — 셀렉터로 고른다(합성 페이지·제품 공용) */
  const out = [];
  for (const h of hosts) {
    const el = document.querySelector(h.sel);
    if (!el) { out.push({ host: h.key, n: '', miss: true }); continue; }
    const hs = getComputedStyle(el);
    for (const n of names) {
      let cs;
      try { cs = getComputedStyle(el, '::' + n); }
      catch (e) { out.push({ host: h.key, n, err: String(e.message || e).slice(0, 40) }); continue; }
      out.push({
        host: h.key, n,
        tr: cs.transform, fs: cs.fontSize, ct: String(cs.content).slice(0, 12),
        /* 빈 문자열 = 이 이름을 못 읽는다. 없는 이름과 **같은 값**이라는 것이 [K-e] 의 본체다 */
        blind: cs.transform === '' && cs.fontSize === '',
        trTook: cs.transform !== '' && cs.transform !== 'none' && cs.transform !== hs.transform,
        fsTook: cs.fontSize !== '' && cs.fontSize !== hs.fontSize,
        ctTook: cs.content !== '' && cs.content !== 'normal' && cs.content !== 'none',
      });
    }
  }
  return out;
};

/* 심는 선언 한 벌 — 세 축(그림·크기·배율)을 한 번에 물어본다. 자를 두 벌로 안 적는다. */
function probeCss(sels, names) {
  const decl = "{content:'\\1F525 ';transform:scaleX(.5);font-size:31px}";
  const out = [];
  for (const n of names) for (const s of sels) out.push(`${s}::${n}${decl}`);
  return out.join('\n');
}

/* 이름별로 «어느 호스트에서든 먹었으면 먹는다» 로 접는다 */
function fold(rows, names) {
  const by = new Map();
  for (const n of names) by.set(n, { n, blind: true, tr: false, fs: false, ct: false });
  for (const r of rows) {
    if (r.miss || !by.has(r.n)) continue;
    const a = by.get(r.n);
    if (!r.blind) a.blind = false;
    if (r.trTook) a.tr = true;
    if (r.fsTook) a.fs = true;
    if (r.ctTook) a.ct = true;
  }
  return by;
}

function census() {
  const fs = require('fs');
  const path = require('path');
  const R26 = require('./probe356r26.js');
  const src = R26.stripComments(fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8'));
  const out = [];
  console.log('[0] 소스 인구조사 — 의사 «이름» 별 규칙 수 (주석 걷은 뒤)');
  for (const n of NAMES) {
    const rx = new RegExp('([^{}\\n;]*::' + n.replace(/-/g, '\\-') + '[^{}]*)\\{([^{}]*)\\}', 'g');
    let m; const hit = [];
    while ((m = rx.exec(src))) {
      hit.push({ line: src.slice(0, m.index).split('\n').length, sel: m[1].trim().replace(/\s+/g, ' ') });
    }
    out.push({ n, hit });
    console.log('    ::' + n.padEnd(22) + String(hit.length).padStart(4) + '  '
      + hit.slice(0, 3).map((h) => h.line + '행 ' + h.sel.slice(0, 54)).join(' | '));
  }
  return out;
}

module.exports = { CLASSIFY, probeCss, fold, census, NAMES, BOGUS, PSEUDO_ON, PSEUDO_OFF, PSEUDO_BLIND, HOST_PH };

if (require.main !== module) return;

(async () => {
  const cen = census();
  const ph = cen.find((c) => c.n === 'placeholder');
  if (ph && ph.hit.length) ok(`⚑ 소스에 \`::placeholder\` 규칙 ${ph.hit.length}건 — ${ph.hit.map((h) => h.line + '행 ' + h.sel).join(' · ')} (26회차 인계문의 «제품에 0건» 은 자기가 센 다섯 이름에 대해서만 참이었다)`);
  else ok('소스에 `::placeholder` 규칙 0건 — 그래도 축은 선다(«0개» 를 «축이 필요 없다» 로 읽지 마라 · 26회차 규율)');

  if (CENSUS_ONLY) { console.log(`\nPROBE356R27 ${pass}/${pass + fail}${fail ? ' FAIL' : ''}`); return; }

  const { chromium } = pw();
  const browser = await launch(chromium);
  const page = await browser.newPage();

  const SELS = ['#h', '#li', '#inp'];
  await page.setContent(`<style>li{list-style:disc}\n${probeCss(SELS, NAMES.concat([BOGUS]))}</style>`
    + '<div id=h>zz</div><ul><li id=li>x</li></ul><input id=inp placeholder=pp>');

  const rows = await page.evaluate(CLASSIFY, {
    names: NAMES, bogus: BOGUS,
    hosts: SELS.map((s) => ({ key: s, sel: s })),
  });
  const by = fold(rows, NAMES.concat([BOGUS]));

  console.log('\n[1] 의사 이름 분류 — 「읽히는가 / transform 이 먹는가」');
  console.log('    이름                       읽힘  transform  content  font-size  판정');
  for (const n of NAMES.concat([BOGUS])) {
    const a = by.get(n);
    const verdict = a.blind ? '눈 없음(넣지 마라)' : a.tr ? '**대상**' : '사정권 밖';
    console.log('    ::' + n.padEnd(24) + (a.blind ? ' ✕  ' : ' ○  ')
      + (a.tr ? '  먹는다  ' : '  none    ') + (a.ct ? '  ○    ' : '  ✕    ')
      + (a.fs ? '   ○      ' : '   ✕      ') + verdict);
  }

  const bog = by.get(BOGUS);
  const on = NAMES.filter((n) => by.get(n).tr);
  const off = NAMES.filter((n) => !by.get(n).blind && !by.get(n).tr);
  const blind = NAMES.filter((n) => by.get(n).blind);

  console.log('\n[2] 판정');
  if (on.length) ok(`transform 이 먹는 이름 ${on.length}종 — ${on.map((n) => '::' + n).join(' · ')} (356 의 사정권)`);
  else bad('transform 이 먹는 이름이 0종 — 분류기가 죽었다(아래는 전부 헛초록)');

  if (on.includes('placeholder')) ok('⚑ `::placeholder` 가 사정권 안이다 — 26회차 인계문이 빠뜨린 이름이고 이 저장소에 이미 있다(`.ch-in::placeholder`)');
  else bad('`::placeholder` 가 사정권 밖으로 나왔다 — 27회차 등재문과 실측이 어긋난다');

  if (on.join('|') === ['before', 'after', 'placeholder'].join('|'))
    ok('사정권이 정확히 세 이름이다 — `PSEUDO_ON` 이 실측과 같다');
  else bad(`사정권이 \`PSEUDO_ON\` 과 다르다: 실측 ${on.join(' · ')}`);

  if (off.length) ok(`속성 제한이라 못 찌그러지는 이름 ${off.length}종 — ${off.map((n) => '::' + n).join(' · ')} (선언해도 계산값이 none)`);
  else bad('속성 제한 이름이 0종 — 음성항이 비어 «대상» 이 공허하다');

  if (off.includes('marker') && off.includes('first-letter') && off.includes('selection'))
    ok('⚑ 26회차 인계문이 지목한 셋(`::marker`·`::first-letter`·`::selection`)이 전부 «사정권 밖» 이다 — 넣어도 잡을 것이 없다');
  else bad('인계문이 지목한 셋 중 사정권 안인 것이 있다 — 27회차 등재문을 고쳐라');

  if (blind.includes('part') && blind.includes('slotted') && bog.blind)
    ok(`⚑ \`::part\`·\`::slotted\` 는 \`getComputedStyle\` 이 **못 읽는다** — 없는 이름 \`::${BOGUS}\` 와 같은 빈 문자열이다. 넣으면 «0» 이 «눈이 없어서 0» 이 된다(헛초록)`);
  else bad('`::part`/`::slotted` 와 대조군의 구분이 실측과 다르다 — [K-e] 의 전제가 무너진다');

  if (by.get('marker').ct && !by.get('marker').tr)
    ok('⚑ 음성항 — `::marker` 는 `content` 로 그림문자를 **받지만**(그림은 산다) 자기 배율로는 **못 눌린다**. 조상 누적으로 눌리는 길은 [A] 가 문다');
  else bad('`::marker` 의 content/transform 조합이 실측과 다르다');

  await browser.close();
  console.log(`\nPROBE356R27 ${pass}/${pass + fail}${fail ? ' FAIL' : ''}`);
  process.exitCode = fail ? 1 : 0;
})();
