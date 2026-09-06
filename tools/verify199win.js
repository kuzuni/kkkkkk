#!/usr/bin/env node
/* 199 33회차 검증 — **«판정 창 규약»(§0-2)이 글이 아니라 자로 서 있는가**
 *
 *   node tools/verify199win.js
 *
 * ── 무엇을 지키는 자인가 ─────────────────────────────────────────────────
 * 32-4 는 30일 표에서 ①③ 이 «비트 동일» 인 것을 보고 하마터면 밴드 사다리를 되돌릴 뻔했다.
 * 30일 창이 사다리를 **구조적으로 못 보기** 때문이다(창 끝 s376 = 첫 좁은 관문 · 창 끝의 벽은
 * 잘린 벽이라 배정에서 빠진다 ⇒ 그 창이 재는 벽은 전부 문턱 아래).
 * 32-8 1번은 그 자리의 처방을 «손잡이가 아니라 규약» 으로 적었고 ①(창마다 무엇을 판정하는지를
 * 적는다)을 권했다. 규약을 글로만 적으면 다음 회차가 또 30일 표 하나로 결론을 낸다 —
 * 그래서 **표가 스스로 «이 창은 이 축을 못 본다» 를 찍고**, 이 자가 그것을 지킨다.
 *
 * 검사 절
 *   [A] 배선 — 판정식이 `tools/win199.js` 한 곳에 있고 `bot199` 가 그것을 써서 두 표에 찍는다
 *   [B] 판정식 — 단위 시험(문턱 되찾기 4갈래 · 벽 0/1/2 · 되돌림본) + **s360 함정 되돌림 시험**
 *   [C] 실측 — 저장소의 봇 표 전수: 창 역량 줄의 판정이 그 줄 자신의 수와 맞는가 +
 *              «불가» 표와 «가능» 표가 **둘 다** 있는가(양성·음성 대조가 실재해야 규약이 산다)
 *   [D] 문서 — `docs/review/199-최종밸런스.md` §0-2 가 축 넷의 창을 적었고 문턱이 제품과 같은가
 *   [E] 제품 — 사다리가 실재하는가(`ES_BAND2 < ES_BAND`) · 문턱 = `ES_BAND × ES_BANDG`
 *
 * 브라우저를 안 띄운다 — 이 자가 보는 것은 «자와 표와 규약» 이지 화면이 아니다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const W = require('./win199');

const ROOT = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* ── [E] 제품 상수 (다른 절이 이 값에서 파생한다 — 자에 리터럴을 안 적는다) ───────── */
const SRC = rd('index.html');
const num = re => { const m = SRC.match(re); return m ? Number(m[1]) : NaN; };
const BAND  = num(/const ES_BAND\s*=\s*(\d+)/);
const BAND2 = num(/const ES_BAND2\s*=\s*(\d+)/);
const BANDG = num(/const ES_BANDG\s*=\s*(\d+)/);
/* ⚑ 199 40회차 — 사다리가 **두 단**(40 → `ES_BAND3` → `ES_BAND2`)이 됐다. 전이 폭이 없으면
   0 으로 읽어 종전 한 단 식이 그대로 성립한다(되돌림 한 줄이 이 자도 같이 되돌린다). */
const BAND3 = Number.isFinite(num(/const ES_BAND3\s*=\s*(\d+)/)) ? num(/const ES_BAND3\s*=\s*(\d+)/) : 0;
ok(Number.isFinite(BAND) && Number.isFinite(BAND2) && Number.isFinite(BANDG),
   '[E1] 제품 사다리 상수 셋이 읽힌다', `ES_BAND ${BAND} · ES_BAND2 ${BAND2} · ES_BANDG ${BANDG}` + (BAND3 ? ` · ES_BAND3 ${BAND3}` : ''));
ok(BAND2 < BAND, '[E2] 사다리가 실재한다(말미 폭 < 초기 폭)', `${BAND2} < ${BAND}`);
const SW0 = BAND * (BANDG - (BAND3 ? 1 : 0));   /* 폭이 바뀌는 칸(제품 eBandSw) */
/* **첫 «좁은» 관문** = 이 자의 문턱. 두 단이면 문턱 바로 위 구간이 **전이 폭**이므로
   첫 좁은 관문은 `SW0 + BAND2` 가 아니라 **`SW0 + BAND3`** 다 — `win199.ladderSw` 와 같은 식이다
   (둘이 갈리면 자가 둘이 된다 · 20회차 규약). */
const NARROW0 = SW0 + (BAND3 || BAND2);
ok(/const eBandSw\s*=\s*ES_BAND \* \(ES_BANDG - \(ES_BAND3 \? 1 : 0\)\)/.test(SRC)
   || /const eBandSw\s*=\s*ES_BAND \* ES_BANDG/.test(SRC),
   '[E3] 문턱이 제품에서도 파생식이다(리터럴 스테이지 아님)', `eBandSw = ${SW0}`);
ok(BAND3 === 0 || (BAND2 < BAND3 && BAND3 < BAND),
   '[E4] 전이 폭은 두 폭 **사이**다 — 밖이면 «두 단» 이 아니라 다른 한 단이다',
   BAND3 ? `${BAND2} < ${BAND3} < ${BAND}` : '전이 없음(한 단)');

/* ── [A] 배선 ─────────────────────────────────────────────────────────── */
const BOT = rd('tools/bot199.js');
ok(/require\('\.\/win199'\)/.test(BOT), '[A1] bot199 가 판정식을 `win199` 에서 가져온다');
ok(/WIN\.ladderSw\(/.test(BOT) && /WIN\.lateWalls\(/.test(BOT) && /WIN\.judge\(/.test(BOT),
   '[A2] bot199 가 세 함수를 전부 그 모듈에서 부른다(사본 없음)');
ok((BOT.match(/WIN\.label\(/g) || []).length >= 2,
   '[A3] 창 역량이 **두 표**([D]·[G])에 찍힌다 — [G] 만 읽는 회차가 실제로 있었다',
   (BOT.match(/WIN\.label\(/g) || []).length + '곳');
ok(/out\.bandSw\s*=/.test(BOT) && /out\.band2\s*=/.test(BOT),
   '[A4] 실행이 사다리 상수를 표에 싣는다 — 창이 짧아 격자가 폭 변화를 안 담는 실행도 문턱을 안다');
const WSRC = rd('tools/win199.js');
ok(!/\b(360|376)\b/.test(WSRC.replace(/^\s*\*.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')),
   '[A5] 판정식에 스테이지 리터럴 0건(문턱은 실행이 실어 준 상수·격자에서만 나온다)');
ok(W.MIN_LATE === 2, '[A6] 기준은 «간격의 정의» 그대로 2다(자의적 여유가 아니다)', 'MIN_LATE=' + W.MIN_LATE);

/* ── [B] 판정식 단위 시험 ─────────────────────────────────────────────── */
/* 199 40회차 — 격자 굽기가 **두 단**을 안다: 문턱 위 한 구간이 전이 폭(band3)이고 그 위가 band2 다.
   전이 폭이 0 이면 루프가 한 번도 안 돌아 종전 한 단 격자와 **같은 배열**이다(되돌림이 자도 되돌린다). */
const mkGates = (band, band2, sw, top, band3) => {
  const g = [];
  for (let s = band; s <= sw; s += band) g.push(s);
  const sw2 = sw + (band3 || 0);
  if (band3) g.push(sw2);
  for (let s = sw2 + band2; s <= top; s += band2) g.push(s);
  return g;
};
const gLadder = mkGates(BAND, BAND2, SW0, SW0 + (BAND3 || 0) + 6 * BAND2, BAND3);
const gFlat   = mkGates(BAND, BAND, SW0, SW0 + 6 * BAND, 0);

ok(W.ladderSw({ gateSet: gLadder }) === NARROW0,
   '[B1] 격자만으로 문턱을 되찾는다(옛 JSON 리플레이 경로)', String(W.ladderSw({ gateSet: gLadder })));
ok(W.ladderSw({ bandSw: SW0, band2: BAND2, band: BAND, band3: BAND3 || null, gateSet: gLadder }) === NARROW0,
   '[B2] 상수를 실은 실행도 **같은 수**를 낸다(두 경로가 안 갈린다)');
ok(BAND3 === 0 || W.ladderSw({ bandSw: SW0, band2: BAND2, band: BAND, gateSet: gLadder }) !== NARROW0,
   '[B2b] ⚑ 전이 폭을 **안 실은** 옛 표기는 두 단에서 다른 수를 낸다 — 그래서 실행이 `band3` 를 싣는다',
   BAND3 ? String(W.ladderSw({ bandSw: SW0, band2: BAND2, band: BAND, gateSet: gLadder })) + ' ≠ ' + NARROW0 : '전이 없음(한 단 — 공허하게 참)');
ok(W.ladderSw({ gateSet: gFlat }) === null,
   '[B3] 상수 밴드 격자에서는 문턱이 **없다**(«못 본다» 가 아니라 «볼 것이 없다»)');
ok(W.ladderSw({ bandSw: SW0, band2: BAND, band: BAND }) === null,
   '[B4] 되돌림본(`ES_BAND2 = ES_BAND`)도 문턱을 안 낸다 — 사다리를 지운 사본이 판정을 흉내 내면 안 된다');
ok(W.ladderSw({}) === null && W.ladderSw(null) === null,
   '[B5] 격자도 상수도 없으면 null (조용한 0 을 안 만든다)');

const jc = (late, sw) => W.judge({ sw: sw === undefined ? NARROW0 : sw, late });
ok(jc(0).can === false && jc(1).can === false && jc(2).can === true && jc(5).can === true,
   '[B6] 벽 0·1 = 불가 · 2 이상 = 가능', [0, 1, 2, 5].map(n => n + ':' + jc(n).can).join(' '));
ok(jc(1).why.includes('둘 이상'), '[B7] 벽 1개의 이유가 «간격의 정의» 라고 적힌다', jc(1).why);
ok(jc(0, null).can === null, '[B8] 사다리 없음은 `can === null`(불가와 다른 값)');
ok(/판정 불가/.test(W.label(jc(0))) && /판정 가능/.test(W.label(jc(2))) && /해당 없음/.test(W.label(jc(0, null))),
   '[B9] 세 갈래가 표에서 서로 다른 말로 나온다');
/* ⚑ [B9b] 33-3 의 교훈을 자로 굳힌다 — 초판 문구는 «90일 표로 읽어라» 였는데 그 90일 창이
   같은 자에 걸렸다(말미 벽 1개). **자가 아직 못 재 본 창을 처방으로 박으면 그 처방이 다음
   회차의 헛초록이 된다.** 불가 문구는 «조건»(벽 n개)만 말하고 창 이름을 안 댄다. */
ok(!/\d+\s*일/.test(W.label(jc(0))),
   '[B9b] «판정 불가» 문구에 특정 창 이름(N일)이 안 박혀 있다 — 조건만 말한다', W.label(jc(0)));

/* ⚑ [B10] **s360 함정 되돌림 시험** — 문턱을 «폭이 바뀌는 칸»(SW0)으로 잡으면 30일 창이
   s360 벽 하나를 문턱 «위» 로 세어 반쯤 본다. s360 은 두 격자의 **공통 앵커**라(32-3)
   사다리가 만든 벽이 아니다. 문턱을 첫 좁은 관문으로 잡아야 그 창이 0개가 된다. */
const wallsD30 = [{ stage: SW0 - BAND }, { stage: SW0 }];      /* 30일 창이 실제로 배정하는 꼴 */
ok(W.lateWalls(wallsD30, NARROW0) === 0 && W.lateWalls(wallsD30, SW0) === 1,
   '[B10] s360 함정 — 옛 문턱(폭 전환 칸)이면 1개, 첫 좁은 관문이면 0개',
   `SW0 ${W.lateWalls(wallsD30, SW0)} ↔ 첫 좁은 관문 ${W.lateWalls(wallsD30, NARROW0)}`);
ok(W.judge({ sw: NARROW0, late: W.lateWalls(wallsD30, NARROW0) }).can === false
   && W.judge({ sw: SW0, late: W.lateWalls(wallsD30, SW0) }).can === false,
   '[B10b] 두 문턱 다 «불가» 이긴 하다 — 함정은 **벽이 하나 더 서면** 새어 나간다는 것이고 [B10] 이 그 수를 못박는다');
const wallsD90 = [{ stage: SW0 }, { stage: NARROW0 }, { stage: NARROW0 + BAND2 }];
ok(W.judge({ sw: NARROW0, late: W.lateWalls(wallsD90, NARROW0) }).can === true,
   '[B11] 좁은 관문 둘을 완주한 창은 «가능»', 'late=' + W.lateWalls(wallsD90, NARROW0));

/* ── [C] 실측 — 저장소의 봇 표 전수 ───────────────────────────────────── */
const RVW = path.join(ROOT, 'docs', 'review');
const tables = fs.readdirSync(RVW).filter(f => /^199-bot-.*\.md$/.test(f)).sort();
const LINE = /창 역량[^\n]*?배정 벽 p50 = (\d+)개/g;
let seenCan = [], seenNo = [], badSelf = [];
for (const f of tables) {
  const t = fs.readFileSync(path.join(RVW, f), 'utf8');
  LINE.lastIndex = 0;
  let m;
  while ((m = LINE.exec(t))) {
    const line = t.slice(t.lastIndexOf('\n', m.index) + 1, t.indexOf('\n', m.index));
    const late = Number(m[1]);
    const says = /판정 가능/.test(line) ? true : /판정 불가/.test(line) ? false : null;
    const want = late >= W.MIN_LATE;
    if (says !== null && says !== want) badSelf.push(`${f}: 벽 ${late}개인데 «${says ? '가능' : '불가'}»`);
    if (says === true) seenCan.push(f); else if (says === false) seenNo.push(f);
  }
}
ok(tables.length > 0, '[C1] 봇 표를 읽었다', tables.length + '개');
ok(badSelf.length === 0, '[C2] 창 역량 줄의 판정이 그 줄 자신의 수와 어긋난 표 0건',
   badSelf.length ? badSelf.slice(0, 3).join(' | ') : '전수 자기일관');
ok(seenNo.length > 0, '[C3] «판정 불가» 표가 실재한다(음성 대조 — 못 보는 창을 실제로 잡아 봤다)',
   seenNo.slice(0, 3).join(' · ') || '없음');
ok(seenCan.length > 0, '[C4] «판정 가능» 표가 실재한다(양성 대조 — 항이 공허참이 아니다)',
   seenCan.slice(0, 3).join(' · ') || '없음');

/* ── [D] 문서 규약 ───────────────────────────────────────────────────── */
const DOC = rd('docs/review/199-최종밸런스.md');
const sec = DOC.slice(DOC.indexOf('§0-2'), DOC.indexOf('§0-2') + 4000);
ok(DOC.includes('§0-2'), '[D1] §0-2 판정 창 규약 절이 있다');
ok(['①', '②', '③', '④'].every(a => sec.includes(a)), '[D2] 축 넷이 전부 그 표에 있다');
ok(sec.includes('30일') && sec.includes('90일'), '[D3] 두 창이 이름으로 적혀 있다');
ok(sec.includes('s' + NARROW0), '[D4] 규약의 문턱이 제품 상수에서 나온 값과 같다', 's' + NARROW0);
ok(/창 역량/.test(sec) && /win199/.test(sec),
   '[D5] 규약이 «자가 매 실행 스스로 찍는다» 와 그 자의 이름을 적는다 — 글만 남으면 다음 회차가 또 30일 하나로 결론 낸다');
ok(/그림자|판정이 아니/.test(sec),
   '[D6] «못 보는 창의 수는 판정이 아니다» 가 규약 문장으로 적혀 있다(32-4 의 교훈 그 자체)');

console.log('');
console.log('VERIFY199WIN ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
