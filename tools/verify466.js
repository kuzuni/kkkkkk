/* 작업 466 게이트 — «`verify338` §2 던전 입장 실패 10건(3/13)» (2026-08-30 등재, sess-1138-24523 워커 B)
 *
 *   node tools/verify466.js   → 마지막 줄이 `VERIFY466 n/n PASS` 여야 한다.
 *
 * ⚑ **제품 `index.html` 0줄이다.** 453 이 «전투 중에는 어떤 전투에도 못 들어간다» 를 `startDunRun`
 *   첫 줄 가드로 세운 것이 옳고(주인 지시), 낡은 것은 **게이트 쪽 전제**였다 — `verify338` §1 이
 *   스테이지 보스전을 **켜 둔 채** 끝내는데, 뒷정리가 `endDunRun` 하나뿐이라 «던전» 만 껐다.
 *   `probe466` 이 그것을 넷으로 못박았다: [1] 중립 상태면 10종 전부 들어간다(제품은 멀쩡하다) ·
 *   [2] §1 뒤에 `bossOn`·`bossT` 가 살아 남는다 · [3] 그 위에서 10종 전부 막힌다 ·
 *   [4] **음성항** — 현행 준비(`endDunRun` 만)로는 안 풀린다.
 *
 * 이 자가 잠그는 것은 **«게이트가 자기가 세운 전투를 자기가 치우는가»** 다(제품이 아니라 자 자신).
 *   §A 모양   — `verify338` 의 진입 준비·뒷정리가 **전 모드 중립화** 한 곳(`__v338neutral`)을 읽는다.
 *   §B 헛초록 — 입장이 실패했을 때 **한 줄도 안 찍고 지나가는 자리가 0** 이다.
 *               (수리 전엔 2곳 — §1 던전 방향 · §R 되돌림. 그래서 13항 중 3항만 «있는 것» 이었다.)
 *   §C 실행   — `verify338` 이 실제로 초록이고, 항 수가 래칫(**181**) 아래로 안 내려간다.
 *   §R 되돌림 — 중립화에서 **지렛대 한 줄**(`bossOn=false; bossT=0`)만 뺀 사본을 굴리면
 *               던전 8 + 탑 2 가 전부 «입장 실패» 로 되돌아온다. LESSONS 307-④ —
 *               «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다.
 *
 * ⚠ **항을 눌러 «입장 실패해도 초록» 으로 만들지 않았다**(등재문 경고 · LESSONS 328) —
 *   `verify338` 의 단언은 한 항도 안 무르게 뒀고, 오히려 조용하던 두 절이 소리를 내게 됐다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const GATE = path.resolve(__dirname, 'verify338.js');
const COPY = path.join(__dirname, '.verify466-old.js');
const RATCHET = 181;                       /* 466 수리 직후 실측 — 아래로 내려가면 절이 사라진 것이다 */
const IDS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone', 'tower', 'despair'];
/* 중립화의 지렛대 한 줄 — §R 은 이것만 뺀다(나머지는 그대로 두어 «다른 이유로 빨간» 사본을 만들지 않는다) */
const LEVER = 'bossIntro = null; bossOn = false; bossT = 0; S.bossFarm = false; stageWin = false;';

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + JSON.stringify(got)) : no(m + ' — 기대 ' + JSON.stringify(want) + ' · 실제 ' + JSON.stringify(got)));
const ge = (m, got, lim) => (got >= lim ? ok(m + ' = ' + got + ' (≥ ' + lim + ')') : no(m + ' = ' + got + ' — 하한 ' + lim));

const run = (file) => {
  try {
    return { out: execFileSync(process.execPath, [file], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 }), code: 0 };
  } catch (e) {
    return { out: String((e && e.stdout) || '') + String((e && e.stderr) || ''), code: (e && e.status) != null ? e.status : -1 };
  }
};
const tally = (out) => {
  const m = out.match(/VERIFY338 (\d+)\/(\d+) (PASS|FAIL)/);
  return { pass: m ? +m[1] : -1, total: m ? +m[2] : -1, verdict: m ? m[3] : '(마지막 줄 없음)' };
};

const src = fs.readFileSync(GATE, 'utf8');

/* ═══ §A 모양 — 진입 준비·뒷정리가 «전 모드 중립화» 한 곳을 읽는다 ═══════════════ */
console.log('\n[A] 모양 — `verify338` 의 전장 되돌리기가 한 곳이고, 그 한 곳이 전 모드를 끈다');
{
  const decl = (src.match(/window\.__v338neutral\s*=\s*function/g) || []).length;
  const call = (src.match(/__v338neutral\(\)/g) || []).length;
  is('[A1] 중립화 선언 수 — 값을 두 곳에 안 적는다(LESSONS 58-①)', decl, 1);
  ge('[A2] 중립화를 부르는 자리(§1 준비 · §1 뒷정리 · enter · cleanup)', call, 4);
  const body = (src.match(/window\.__v338neutral\s*=\s*function\(\)\{[\s\S]*?\n  \};/) || [''])[0];
  const has = (re, nm) => (re.test(body) ? ok('[A3] 중립화가 끄는 모드 — ' + nm) : no('[A3] 중립화가 «' + nm + '» 을 안 끈다'));
  has(/endDunRun\(false, true\)/, '던전·탑(dunRun)');
  has(/endArena\(/, '아레나(arena)');
  has(/endRaid\(/, '레이드(raidOn)');
  has(/promo = null/, '승급전(promo)');
  has(/bossOn = false/, '스테이지 보스전(bossOn) ← 466 이 더한 지렛대');
  has(/bossT = 0/, '스테이지 시계(bossT)');
  /* 종전 준비(«던전만 끈다»)가 어느 절에도 남아 있으면 안 된다 — 그것이 3/13 의 뿌리였다.
     중립화 몸통 **밖**에 `endDunRun` 이 하나라도 있으면 그 절은 다시 «던전만» 끄고 있다. */
  const outside = src.replace(body, '').match(/endDunRun\(/g) || [];
  is('[A4] 중립화 밖에 남은 «endDunRun 만» 하는 옛 준비', outside.length, 0);
  /* 막힌 이유를 문구가 이름으로 댄다 — «입장 실패» 넉 자로는 다음 세션이 또 한 회차를 태운다 */
  is('[A5] 입장 실패 문구가 원인(bossMode)을 같이 들고 나온다', /입장 실패 \(battleBusy=/.test(src), true);
}

/* ═══ §B 헛초록 — 실패를 조용히 삼키는 자리가 0 ═══════════════════════════════ */
console.log('\n[B] 헛초록 — 입장이 실패하면 «한 줄도 안 찍고» 지나가던 자리');
{
  const silent = (src.match(/&& !p\.err\)/g) || []).length;
  const loud = (src.match(/if \(p\.err\)[^\n]*no\(/g) || []).length;
  is('[B1] 조용한 건너뜀 자리(수리 전 2 — §1 던전 · §R)', silent, 0);
  ge('[B2] 입장 실패를 찍는 자리(§1 던전 · §2 루프 · §R)', loud, 3);
}

/* ═══ §C 실행 — 게이트가 실제로 초록이고 항 수가 래칫 이상 ═════════════════════ */
console.log('\n[C] 실행 — `node tools/verify338.js`');
const cur = run(GATE);
{
  const t = tally(cur.out);
  is('[C1] 판정', t.verdict, 'PASS');
  is('[C2] 종료 코드', cur.code, 0);
  ge('[C3] 초록 항 수 래칫', t.pass, RATCHET);
  is('[C4] 빨간 항 0', t.total - t.pass, 0);
  const failedEnter = (cur.out.match(/입장 실패/g) || []).length;
  is('[C5] «입장 실패» 0건 (던전 8 + 탑 2 전수가 실제로 돈다)', failedEnter, 0);
  const missing = IDS.filter((id) => cur.out.indexOf('§2 ' + id + '(') < 0);
  is('[C6] §2 가 던전 8 + 탑 2 를 빠짐없이 돈다 — 빠진 것', missing.join(',') || '없음', '없음');
  /* 조용히 건너뛰던 두 절이 실제로 돌아왔는가(수리 전엔 이 두 줄이 출력에 아예 없었다) */
  is('[C7] §1 던전 방향 절이 실제로 돈다', /#dunBarF — 체력이 줄면 바도 준다/.test(cur.out), true);
  is('[C8] §R 되돌림 절이 실제로 돈다', /R1 옛 폭 식/.test(cur.out), true);
  is('[C9] §1 이 자기가 세운 보스전을 자기가 껐다', /§1 자기가 세운 보스전을 자기가 껐다/.test(cur.out), true);
}

/* ═══ §R 되돌림 — 지렛대 한 줄을 뺀 사본은 3/13 으로 돌아간다 ═══════════════════ */
console.log('\n[R] 되돌림 — 중립화에서 `bossOn=false; bossT=0` 한 줄만 뺀 사본');
{
  let made = false;
  if (src.indexOf(LEVER) >= 0) {
    fs.writeFileSync(COPY, src.replace(LEVER, '/* R466 — 지렛대 제거(수리 전 = 던전만 껐다) */'));
    made = true;
  }
  process.on('exit', () => { try { fs.unlinkSync(COPY); } catch (e) {} });
  if (!made) no('[R0] 사본을 못 만들었다 — 중립화의 그 줄 모양이 바뀌었다');
  else {
    const r = run(COPY);
    const t = tally(r.out);
    is('[R1] 사본 판정', t.verdict, 'FAIL');
    (r.code !== 0) ? ok('[R2] 사본 종료 코드 ' + r.code + ' ≠ 0') : no('[R2] 사본이 종료 코드 0 이다 — 되돌림이 성립 안 함');
    const hit = IDS.filter((id) => new RegExp('NO +§2 ' + id + '\\(|NO +' + id + '\\(').test(r.out));
    is('[R3] 사본에서 «입장 실패» 로 되돌아온 던전·탑 수', hit.length, IDS.length);
    is('[R4] 사본의 실패 문구가 원인을 댄다(bossMode="stage")', /bossMode="stage"/.test(r.out), true);
    /* 음성항 — 사본이 «다른 이유로» 빨간 게 아니다: 콘솔 에러 항은 사본에서도 초록이어야 한다 */
    is('[R5] 사본도 콘솔 에러 0건 = 사본이 깨져서 빨간 게 아니다', /ok +콘솔 에러 0건 = 0/.test(r.out), true);
    /* §1 스테이지 절(중립화와 무관한 자리)은 사본에서도 초록이어야 한다 = 지렛대가 좁다 */
    is('[R6] 사본에서도 §1 스테이지 보스 방향은 초록 = 지렛대가 이 한 자리다',
      /ok +#bossHpF — 체력이 줄면 바도 준다/.test(r.out), true);
    console.log('       사본 ' + t.pass + '/' + t.total + ' ↔ 현재 ' + tally(cur.out).pass + '/' + tally(cur.out).total);
  }
}

console.log('\nVERIFY466 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
process.exit(fail ? 1 : 0);
