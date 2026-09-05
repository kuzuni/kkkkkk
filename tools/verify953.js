#!/usr/bin/env node
/* 게이트 953 — «자산이 없다» 는 빨강이 아니라 SKIP 이다 (캡처 의존 자리)
 *
 *   node tools/verify953.js
 *
 * 무엇을 지키는가 —
 *   `verify932` §10 은 자기 값의 절반을 **남이 찍는 캡처**(`docs/shots/887-*.png` — `verify887` 이 찍는다)에서
 *   읽는다. 그 다섯은 **커밋 금지 자산**(ROUTINE 서두 «캡처는 커밋하지 마라»)이라 **없는 클론이 정상**인데,
 *   [10-d] 만 그 자리에서 «우리 값 없음» 을 **빨강**으로 냈다(출력이 «ref -0.072 ↔ 우리 » 로 오른쪽이 빈다).
 *   바로 아래 [10-e] 는 **같은 조건을 SKIP** 으로 내고 있었으므로 처방은 이미 짝에 있었다.
 *
 *   ⚠ 이 자가 지키는 것은 «SKIP 을 늘렸다» 가 아니라 **«무르게 하지 않고 갈랐다»** 다 —
 *     ① ref 쪽은 저장소 안 그림이라 캡처가 없어도 **여전히 판정**되고(§2 · 헛초록 아님),
 *     ② 캡처가 있으면 그 자리는 SKIP 이 아니라 **판정**이며(§3),
 *     ③ 그 판정은 예민하다 — 잉크가 **안 밀린** 캡처를 놓으면 그대로 **빨개진다**(§4 · 되돌림 시험).
 *
 * ⚑ §3·§4 의 «합성 캡처» 는 저장소 안 레퍼런스 그림(`docs/ref/89-유물-팝업.png`)이다.
 *   그 그림의 잉크 잔차는 −0.072(= 격자 위, 안 밀렸다)라 [10-d2] 의 과녁(−0.981)과 정반대다 —
 *   그래서 **자산을 새로 만들지 않고도** «캡처가 있으면 진짜로 판정한다» 를 실측으로 보일 수 있다.
 *
 * ⚠ 실캡처를 지우지 않는다 — 있으면 잠깐 옆으로 옮겼다가 **반드시 제자리로 돌려놓는다**(finally).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const REF = path.join(ROOT, 'docs', 'ref', '89-유물-팝업.png');
const FRAMES = [1600, 1841, 1920, 2280, 2600];

let pass = 0, fail = 0, skip = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};
const sk = (msg, why) => { skip++; console.log('  SKIP ' + msg + (why ? ' — ' + why : '')); };

/* verify932 를 돌리고 «출력 + 종료 코드» 를 그대로 돌려준다. 이 자는 그 표를 읽는다. */
const run932 = () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'verify932.js')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { out: String(r.stdout || '') + String(r.stderr || ''), code: r.status };
};
/* 한 항의 판정을 표에서 읽는다 — 'PASS' · 'FAIL' · 'SKIP' · null(항이 없다). */
const verdict = (out, tag) => {
  const m = out.match(new RegExp('^\\s*(PASS|FAIL|SKIP) \\[' + tag.replace(/[-[\]]/g, '\\$&') + '\\]', 'm'));
  return m ? m[1] : null;
};
const line = (out, tag) => {
  const m = out.match(new RegExp('^.*\\[' + tag.replace(/[-[\]]/g, '\\$&') + '\\].*$', 'm'));
  return m ? m[0].trim() : '';
};

/* ── 실캡처 보존 — 있으면 옆으로 옮겼다가 끝나고 되돌린다 ────────────────── */
const BAK = path.join(SHOTS, '.953bak');
const real = FRAMES.map((h) => `887-${h}.png`).filter((n) => fs.existsSync(path.join(SHOTS, n)));
const stash = () => {
  if (!real.length) return;
  fs.mkdirSync(BAK, { recursive: true });
  for (const n of real) fs.renameSync(path.join(SHOTS, n), path.join(BAK, n));
};
const unstash = () => {
  for (const n of real) {
    const b = path.join(BAK, n);
    if (fs.existsSync(b)) fs.renameSync(b, path.join(SHOTS, n));
  }
  if (fs.existsSync(BAK)) { try { fs.rmdirSync(BAK); } catch (e) { /* 남아 있으면 그대로 둔다 */ } }
};

try {
  fs.mkdirSync(SHOTS, { recursive: true });
  stash();

  /* ── [1] 수리 — 캡처가 없는 클론에서 게이트가 초록이고 그 자리는 SKIP 이다 ── */
  console.log('\n[1] 캡처가 없는 클론 — 빨강이 아니라 SKIP 인가');
  const bare = run932();
  ok('[1-a] `verify932` 가 **초록**이다 (수리 전에는 [10-d] 한 건으로 58/59 FAIL 이었다)',
    bare.code === 0, `종료 코드 ${bare.code} · ${(bare.out.match(/VERIFY932 .*/) || [''])[0]}`);
  ok('[1-b] 우리 쪽 잉크 항은 **SKIP** 이다 (빨강도, 조용한 초록도 아니다)',
    verdict(bare.out, '10-d2') === 'SKIP', line(bare.out, '10-d2'));
  ok('[1-c] 짝인 [10-e] 도 같은 조건에서 SKIP — 한 절 안에서 규약이 하나다',
    verdict(bare.out, '10-e') === 'SKIP', line(bare.out, '10-e'));
  ok('[1-d] §10 에 빨강이 **한 건도** 없다',
    !/^\s*FAIL \[10-/m.test(bare.out),
    (bare.out.match(/^\s*FAIL \[10-.*$/mg) || ['빨강 0건']).join(' · '));

  /* ── [2] 헛초록 아님 — ref 항은 캡처가 없어도 **여전히 판정**된다 ────────── */
  console.log('\n[2] 헛초록 아님 — 캡처가 없어도 ref 항은 그대로 판정된다');
  ok('[2-a] ref 잉크 잔차 항([10-d])은 캡처 없이도 **판정**된다 (SKIP 으로 도망가지 않았다)',
    verdict(bare.out, '10-d') === 'PASS' && /ref -0\.07/.test(line(bare.out, '10-d')),
    line(bare.out, '10-d'));
  ok('[2-b] ⚑ 과녁 항([10-g])도 캡처 없이 판정된다 — 옛 조건 `C.length === 0 || (…)` 은 '
    + '과녁까지 통째로 건너뛰어 **헛초록**이었다',
    verdict(bare.out, '10-g') === 'PASS' && /ref 과녁 0\.750/.test(line(bare.out, '10-g')),
    line(bare.out, '10-g'));
  ok('[2-c] ref 절 넷([10-a]~[10-c]·[10-f])은 캡처 유무와 무관하게 판정된다',
    ['10-a', '10-b', '10-c', '10-f'].every((t) => verdict(bare.out, t) === 'PASS'),
    ['10-a', '10-b', '10-c', '10-f'].map((t) => t + ':' + verdict(bare.out, t)).join(' '));

  /* ── [3]·[4] 되돌림 — 캡처가 «있으면» 판정이고, 그 판정은 예민하다 ────────
     합성 캡처 = 저장소 안 레퍼런스 그림. 그 그림의 잔차는 −0.072(안 밀렸다)라
     [10-d2] 의 과녁(−0.981)과 정반대다 ⇒ 판정이 살아 있으면 **반드시 빨개진다**. */
  console.log('\n[3] 캡처가 있으면 SKIP 이 아니라 판정이다 (합성 캡처 = 저장소 ref 그림)');
  if (!fs.existsSync(REF)) {
    sk('[3]·[4] 레퍼런스 그림이 없다', REF);
  } else {
    const synth = path.join(SHOTS, `887-${FRAMES[0]}.png`);
    let withCap;
    try {
      fs.copyFileSync(REF, synth);
      withCap = run932();
    } finally { if (fs.existsSync(synth)) fs.unlinkSync(synth); }

    ok('[3-a] 캡처가 한 장이라도 있으면 [10-d2] 는 **SKIP 이 아니다** (문이 실제로 열린다)',
      verdict(withCap.out, '10-d2') !== 'SKIP' && verdict(withCap.out, '10-d2') !== null,
      `판정 ${verdict(withCap.out, '10-d2')}`);
    ok('[3-b] 그 항이 우리 쪽 값을 **실제로 읽는다** (출력 오른쪽이 비지 않는다)',
      /↔ 우리 -?\d/.test(line(withCap.out, '10-d2')), line(withCap.out, '10-d2'));

    console.log('\n[4] 되돌림 시험 — 잉크가 **안 밀린** 캡처를 놓으면 그대로 빨개지는가');
    ok('[4-a] ★ 잔차 −0.072(안 밀렸다)짜리 캡처에서 [10-d2] 는 **빨강**이다 — 무르게 푼 수리가 아니다',
      verdict(withCap.out, '10-d2') === 'FAIL', line(withCap.out, '10-d2'));
    ok('[4-b] ★ 게이트 전체도 그 한 건으로 **코드 1** 로 떨어진다 (SKIP 이 판정을 삼키지 않는다)',
      withCap.code === 1, `종료 코드 ${withCap.code} · ${(withCap.out.match(/VERIFY932 .*/) || [''])[0]}`);
    ok('[4-c] 그런데 같은 실행에서 ref 항([10-d])은 **초록** — 빨강의 출처가 «우리 쪽» 임을 자가 스스로 가른다',
      verdict(withCap.out, '10-d') === 'PASS', line(withCap.out, '10-d'));
  }
} finally {
  unstash();
}

/* ── [5] 인구조사 — «남이 찍는 캡처를 읽는» 자리가 더 있는가 (래칫) ────────
   자기가 찍어서 자기가 읽는 자(verify77·451·480·901·934)는 이 부류가 아니다 —
   없으면 그 자리에서 찍으므로 «없는 것이 정상» 인 자산이 아니다. 부류는 **소비자**뿐이다. */
console.log('\n[5] 인구조사 — 남이 찍는 자산을 읽는 자리는 둘뿐이고 둘 다 SKIP 으로 갈린다');
{
  const v932 = fs.readFileSync(path.join(__dirname, 'verify932.js'), 'utf8');
  /* §9 = `scratch/151-r932.png`(cap151.js 가 찍는다) · §10 = `docs/shots/887-*.png`(verify887 이 찍는다) */
  const consumers = [
    ['§9 (scratch/151-r932.png · cap151.js)', /SKIP \[9\] 캡처가 없다/],
    ['§10 (docs/shots/887-*.png · verify887.js)', /SKIP \[10-d2\] 우리 `ink_top`/],
    ['§10 짝 (같은 캡처 · 순위)', /SKIP \[10-e\] 캡처 다섯 장이/],
  ];
  for (const [name, re] of consumers) {
    ok(`[5-a] ${name} — 캡처가 없으면 SKIP 으로 갈린다`, re.test(v932));
  }
  /* 자기가 찍는 자는 래칫으로 적어 둔다 — 늘어나면 사람이 한 번 보고 부류를 판정하라는 뜻이다. */
  const SELF = ['verify451.js', 'verify480.js', 'verify77.js', 'verify901.js', 'verify934.js'];
  const cur = fs.readdirSync(__dirname)
    .filter((f) => /^verify.*\.js$/.test(f) && f !== 'verify953.js')
    /* ⚠ 백틱(`scratch`)은 산문이지 경로가 아니다 — `verify833` 이 주석에서 그렇게 쓴다.
       경로로 쓰인 자리(따옴표 안 · 구분자 뒤)만 센다. */
    .filter((f) => /docs[/\\]shots|['"]scratch['"]|scratch[/\\]/
      .test(fs.readFileSync(path.join(__dirname, f), 'utf8')))
    .filter((f) => f !== 'verify932.js');
  ok('[5-b] 캡처 자리를 든 자 목록이 기록과 같다 (래칫 — 늘면 «찍는 자인가 읽는 자인가» 를 사람이 가른다)',
    cur.length === SELF.length && cur.every((f) => SELF.includes(f)),
    `지금 [${cur.sort().join(' ')}] ↔ 기록 [${SELF.slice().sort().join(' ')}]`);
  ok('[5-c] 그 다섯은 **자기가 찍는다** — 스크린샷/캡처를 만드는 코드를 든다 («없는 것이 정상» 인 자산이 아니다)',
    SELF.every((f) => /screenshot|cap\d|\.png['"`]\s*\)/.test(fs.readFileSync(path.join(__dirname, f), 'utf8'))),
    SELF.join(' '));
}

console.log(`\nVERIFY953 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`
  + (skip ? ` (SKIP ${skip})` : ''));
process.exit(fail ? 1 : 0);
