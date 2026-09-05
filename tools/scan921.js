#!/usr/bin/env node
/* 작업 921 — «여는 동작 4줄 안에 250ms 미만 대기» 자리를 세고, 그 자리가 무엇을 재는지 가른다.
 *
 * 왜 자가 먼저인가(907 교훈 ①): 79곳에 한 줄씩 흩어 적기 전에 «어디가 대상인가» 를 아는
 * 판별기를 세운다. 그래야 다음에 같은 모양이 새로 생겨도 세는 방법이 남는다.
 *
 *   node tools/scan921.js            표 + 요약
 *   node tools/scan921.js --json     기계용
 *   node tools/scan921.js --gate     처방이 빠진 «기하·화소» 자리가 있으면 종료 코드 2
 *
 * 판정 규칙 (등재문 ①②③ 그대로):
 *   ① 여는 동작(`open*()` · `.click()` · `setTab(`) 뒤 **4줄 안**의 `waitForTimeout(<250)` 이 자리다.
 *      (250 = `settle291.MIN_WAIT` — 이 값 미만이면 공용 훅이 구조적으로 안 돈다)
 *   ② 그 자리 **뒤**에서 기하·화소를 재면(`getBoundingClientRect`·`boundingBox`·`screenshot`·
 *      `getComputedStyle`·`offset*`/`client*` 좌표) 처방 대상이다 — 입장 연출 0% 프레임에서
 *      재면 화면 절대 좌표가 통째로 밀린다(291 지문 · 915 §3).
 *   ③ 시간·개수만 세는 자리(`Date.now`·`performance.now`·노드 수·클래스 유무)는 **손대지 않는다** —
 *      rAF 2프레임이 곧 결함이 되는 자들이 있다(64·262 홀드 350ms · 107 관성 프레임 수).
 *   처방이 이미 붙어 있으면(같은 창 안에 `settle291`) «✔ 정착» 으로 센다.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = __dirname;
const MIN_WAIT = 250;          /* settle291.MIN_WAIT 과 같은 값 — 여기서 다시 적지 않는다 */
const OPEN_SPAN = 4;           /* 여는 동작 ↔ 대기 사이 허용 줄 수 */
const LOOK_AHEAD = 15;         /* 그 자리 뒤 «무엇을 재는가» 를 볼 창 — 좁게 본다.
                                  넓히면 «같은 파일 어딘가에 rect 가 있다» 로 번져 시간·상태만 세는
                                  자리까지 대상이 된다(1차 60줄에서 실제로 그랬다). */

let realMin = MIN_WAIT;
try { realMin = require('./settle291').MIN_WAIT; } catch (_) {}

const OPEN_RE = /(?:\bopen[A-Z]\w*\s*\(|\.click\s*\(|\bsetTab\s*\(|\bshowTab\s*\(|\bopenModal\s*\()/;
const WAIT_RE = /waitForTimeout\s*\(\s*(\d+)\s*\)/;
const GEO_RE = /getBoundingClientRect|boundingBox\s*\(|\.screenshot\s*\(|getComputedStyle|offsetWidth|offsetHeight|offsetTop|offsetLeft|clientWidth|clientHeight|\brect\b|\bbbox\b|\bshoot\b|\braster\b|\bRECT\b|\bink\s*\(|\bshot\s*\(/;
/* 시간 자체를 재는 자리 — rAF 2프레임이 곧 결함이 된다(64·262 홀드 350ms · 107 관성).
   ⚠ 이 축은 «참고» 로만 찍는다. 자동 판별로는 `Date.now()` 가 **만료 시각을 확인하는** 자리
   (`verify325` [D])와 **경과를 재는** 자리를 못 가른다 — 갈라야 하는 자리는 손으로 적는다(SKIP). */
const TIME_RE = /Date\.now\(\)\s*-|performance\.now\(\)\s*-|\bframes\b|elapsed|holdMs/;
const SETTLE_RE = /settle291/;
/* 여는 헬퍼의 꼬리 — 대기 바로 뒤에서 페이지를 돌려주고 끝나는 모양(`return { ctx, page }`).
   재는 것은 그 함수 밖이라 «15줄 창» 으로는 안 보인다. 915 가 고친 `verify886.openAt()` 이 이 꼴이다. */
const TAIL_RE = /return\s*(?:\{[^}]*\bpage\b|page\b)/;

/* ── 판정 장부 ───────────────────────────────────────────────────────────
   자동 판별은 «후보를 찾는 것» 까지다. 마지막 한 칸은 손으로 적고 **이유를 남긴다** —
   `rect` 가 뒤에 있다고 다 대상이 아니고(선언된 상자를 일부러 쓰는 자리도 있다),
   없다고 다 아닌 것도 아니다(여는 헬퍼 안이면 재는 곳은 함수 밖이다).
   키는 줄 번호가 아니라 **여는 줄의 조각**이다 — 줄은 편집마다 밀리지만 이 조각은 안 밀린다.
   verdict: 'settle' = 한 줄 넣는다 · 'skip' = 손대지 않는다.
   ⚠ 장부에 없는 후보가 나오면 `--gate` 가 «미판정» 으로 짖는다(새로 생긴 자리를 조용히 놓치지 않게). */
const LEDGER = [
  /* ── 넣는다 — 여는 동작 뒤 기하·화소를 잰다 ── */
  { file: 'verify116.js', open: 'openCoin', v: 'settle', why: '13 재화 카드 `.qt`·`.bg` rect 를 잰다' },
  { file: 'verify325.js', open: "click('#blsC_atk')", v: 'settle', why: '`shot()` 으로 닷 화소를 센다(34 팝업)' },
  { file: 'verify36.js', open: 'openAttTab', v: 'settle', why: '`#psBar .pt.on` rect 를 잰다' },
  { file: 'verify497.js', open: 'openCoin', v: 'settle', why: '13 카드 rect + 마일스톤 바를 잰다' },
  { file: 'verify686.js', open: 'openTrain', v: 'settle', why: '여는 헬퍼 꼬리 — 단련 버튼 rect 19자리' },
  { file: 'verify687.js', open: 'openTrain', v: 'settle', why: '룬 헤더 rect 8자리' },
  { file: 'verify688.js', open: 'openTrain', v: 'settle', why: '여는 헬퍼 꼬리 — 헤더 rect 3자리' },
  { file: 'verify735.js', open: "'#sumMulBar", v: 'settle', why: '토글 4상태 bbox Δ0 — 그릇 rect' },
  { file: 'verify746.js', open: "'#sumMulBar", v: 'settle', why: '`RECT`·`ink()` 로 간극을 잰다' },
  { file: 'verify76.js', open: 'closeModal', v: 'settle', why: '바로 뒤가 `page.screenshot()` — 연출 한복판 판이 남는다' },
  { file: 'verify769.js', open: 'openTrain', v: 'settle', why: '여는 헬퍼 꼬리 — rect 15자리' },
  { file: 'verify917.js', open: 'openRelw', v: 'settle', why: '여는 헬퍼 꼬리 · 886 과 **같은 팝업·같은 모양**(915 선례)' },
  { file: 'verify95.js', open: 'openRank', v: 'settle', why: 'rect + `offsetWidth − clientWidth` 거터를 잰다' },
  { file: 'verify886.js', open: 'openRelw', v: 'settle', why: '915 가 이미 넣었다 — 이 장부의 원본' },
  /* ── 손대지 않는다 ── */
  { file: 'verify345.js', open: '', v: 'skip', why: '닫힘 연출 **한복판**을 일부러 잰다 — 정착이 그 프레임을 없앤다' },
  { file: 'verify918.js', open: '', v: 'skip', why: '918 이 진행 중인 남의 작업 단위다(lock) — 파일 구간을 안 건드린다' },
  { file: 'verify155.js', open: 'openRoulette', v: 'skip', why: '상태(S)·`display` 만 본다 — 배율에 안 흔들린다' },
  { file: 'verify202.js', open: 'openWeapon', v: 'skip', why: '재기가 대기 **앞**이고 뒤는 라벨·색이다' },
  { file: 'verify356.js', open: 'querySelector(s)', v: 'skip', why: '**선언된** 상자(`getComputedStyle`)를 일부러 쓴다 — 조상 배율을 안 탄다(파일 주석)' },
  { file: 'verify491.js', open: "'trw'", v: 'skip', why: '클래스 유무(`alive`·`jz-dn`)만 센다' },
  { file: 'verify516.js', open: "'#collAll'", v: 'skip', why: '닷 유무·`display` 만 본다' },
  { file: 'verify53.js', open: 'locator(sel)', v: 'skip', why: '텍스트·z-index 만 본다' },
  { file: 'verify53.js', open: "'bagw'", v: 'skip', why: 'rect 는 **클릭 좌표**용이라 같은 프레임에서 읽고 쓴다(단언 없음)' },
];
const verdict = (f, openTxt) => LEDGER.find(d => d.file === f && (!d.open || openTxt.includes(d.open)));

function scanFile(f) {
  const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
  const L = src.split('\n');
  const fileGeo = GEO_RE.test(src);
  const hits = [];
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(WAIT_RE);
    if (!m) continue;
    const ms = +m[1];
    if (ms >= realMin) continue;
    let open = null;
    for (let k = Math.max(0, i - OPEN_SPAN); k < i; k++) {
      if (OPEN_RE.test(L[k]) && !/^\s*(\/\/|\*)/.test(L[k])) open = { line: k + 1, text: L[k].trim() };
    }
    if (!open) continue;
    const aheadL = L.slice(i + 1, i + 1 + LOOK_AHEAD);
    const ahead = aheadL.join('\n');
    const near = L.slice(Math.max(0, i - OPEN_SPAN), i + 1 + 6).join('\n');
    const time = TIME_RE.test(ahead);
    /* 재기 «전» 에 문턱 이상 대기가 또 오면 공용 훅이 이미 돈다 — 여기서 부를 필요가 없다. */
    let covered = false;
    for (const l of aheadL.slice(0, 6)) {
      const w = l.match(WAIT_RE);
      if (w && +w[1] >= realMin) { covered = true; break; }
      if (GEO_RE.test(l)) break;
    }
    const tail = TAIL_RE.test(L.slice(i + 1, i + 7).join('\n'));
    const d = verdict(f, open.text);
    const cand = GEO_RE.test(ahead) || (tail && fileGeo) || SETTLE_RE.test(near);
    hits.push({
      file: f, line: i + 1, ms, open: open.text.slice(0, 70),
      cand,                                   /* 자동 판별이 «후보» 로 본 자리 */
      v: d ? d.v : null, why: d ? d.why : null,
      covered, time, tail,
      settled: SETTLE_RE.test(near),
    });
  }
  return hits;
}

const files = fs.readdirSync(TOOLS).filter(f => /^verify.*\.js$/.test(f)).sort();
const hits = [];
for (const f of files) hits.push(...scanFile(f));

const need = hits.filter(h => h.v === 'settle');
const skipped = hits.filter(h => h.v === 'skip');
const missing = need.filter(h => !h.settled);
/* 장부에 없는 후보 — 새로 생긴 자리다. 조용히 지나가지 않게 짖는다. */
const undecided = hits.filter(h => !h.v && h.cand && !h.covered);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    total: hits.length, settle: need.length, skip: skipped.length,
    missing: missing.length, undecided: undecided.length, hits,
  }, null, 1));
} else {
  console.log(`SCAN921 — verify*.js ${files.length}개 · 자리 ${hits.length}곳 (문턱 ${realMin}ms · 여는 동작 ${OPEN_SPAN}줄 안)`);
  console.log(`  정착을 넣은 자리 ${need.length}곳 (빠짐 ${missing.length})`);
  console.log(`  손대지 않기로 한 자리 ${skipped.length}곳 · 자동 판별이 제친 자리 ${hits.length - need.length - skipped.length}곳`);
  console.log(`  미판정(장부에 없는 새 후보) ${undecided.length}곳`);
  console.log('');
  for (const h of hits) {
    if (!h.v && !undecided.includes(h)) continue;
    const tag = h.v === 'settle' ? (h.settled ? '✔ 정착' : '✗ 빠짐') : h.v === 'skip' ? '· 제외' : '? 미판정';
    console.log(`${tag}  ${h.file}:${h.line}  ${String(h.ms).padStart(3)}ms  ${h.open}`);
    if (h.why) console.log(`        ${h.why}`);
  }
}

if (process.argv.includes('--gate')) {
  let bad = 0;
  for (const h of missing) { console.error(`✗ 정착 빠짐 — ${h.file}:${h.line}`); bad++; }
  for (const h of undecided) { console.error(`? 미판정 — ${h.file}:${h.line} (${h.open}) — 장부에 넣어라`); bad++; }
  if (bad) { console.error(`\nSCAN921 GATE FAIL — ${bad}건`); process.exit(2); }
  console.log(`\nSCAN921 GATE PASS — 정착 ${need.length}곳 · 제외 ${skipped.length}곳 · 미판정 0`);
}
