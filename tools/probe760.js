#!/usr/bin/env node
/* 작업 760 재현기 — «`tools/verify188.js` 즉사(`ReferenceError: trDeltaTxt is not defined`)».
   실행: node tools/probe760.js

   338 규칙 — 처방을 따르기 전에 등재문을 **재현**하고, 수리 뒤에는 그 수리가 «무르게 푼 것» 이
   아님을 **주입 시험**으로 못박는다. 이 자가 재는 것은 자기 자신이 아니라 `verify188.js` 의 **거동**이다.

     [1] 재현   — 수리 전 판(`git show <BASE>:tools/verify188.js`)은 ③ 한복판에서 죽고
                  **보고서(`VERIFY188 n/m`)를 한 줄도 못 찍는다**. 앞 절의 초록조차 안 나온다 —
                  `R.forEach` 가 파일 맨 끝이라 «즉사» 는 이미 판정한 항까지 통째로 삼킨다.
     [2] 수리 후 — 지금 판은 끝까지 돌아 보고서를 찍고 PASS 한다.
     [3] 주입   — 지금 판의 ③ 블록 안에 **죽은 입**(`__dead760()`)을 한 줄 심는다.
                  ⓐ 프로세스는 안 죽고 보고서를 찍는다 · ⓑ ③ 블록이 FAIL **1건**으로 세어진다 ·
                  ⓒ **그 뒤 절(③-b · §R3 · ⑤ · 콘솔 항)은 계속 돈다** — 이것이 ⓐ 처방의 전부다.
     [4] 무름 방지 — 660 이 닫은 «+n» 입을 되살린 사본에서 ③·⑤ 의 방향 반전 항이 **빨개지는가**.
                  (자 안의 §R4·§R5 미끼는 «대조기가 살아 있는가» 를, 여기 [4] 는 «제품이 되살아나면
                   빨개지는가» 를 본다 — 두 방향을 다 세워야 헛초록이 아니다.)
*/
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const G756 = require('./gitrev756');           /* 756 — 얕은 클론에서 고정 SHA 를 데려오는 공용 부품 */

const TOOLS = __dirname;
const GATE = path.join(TOOLS, 'verify188.js');
/* 수리 직전 커밋 — 이 자를 나중에 돌리는 세션도 같은 «수리 전» 을 본다.
   ⚠ 756 이 등재한 «얕은 클론» 문제를 부품에 맡긴다(965): 창 밖이면 **먼저 판고**,
   그래도 없을 때만 갈린다 — 얕으면 ⏸ 보류(안 셈) · 얕지 않은데 없으면 **빨강**이다. */
const BASE = process.env.PROBE760_BASE || '4075c67';

let pass = 0, fail = 0, skip = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const sec = t => console.log('\n' + t);

const run = file => {
  const r = spawnSync(process.execPath, [file], { cwd: path.join(TOOLS, '..'), encoding: 'utf8',
    timeout: 15 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/VERIFY188 (\d+)\/(\d+) (PASS|FAIL)/);
  return { code: r.status, out, report: m ? { got: +m[1], tot: +m[2], verdict: m[3] } : null };
};
const tmp = (name, body) => { const f = path.join(TOOLS, '_probe760_' + name + '.js'); fs.writeFileSync(f, body); return f; };
const rm = f => { try { fs.unlinkSync(f); } catch (e) {} };

const TRASH = [];
process.on('exit', () => TRASH.forEach(rm));

(async () => {
  const cur = fs.readFileSync(GATE, 'utf8');

  /* ── [1] 재현 — 수리 전 판은 보고서를 못 찍는다 ─────────────────────────────── */
  sec('[1] 재현 — 수리 전 `verify188.js` 는 ③ 한복판에서 죽는다');
  const g = G756.show(BASE, 'tools/verify188.js', { cwd: path.join(TOOLS, '..'), maxBuffer: 32 * 1024 * 1024 });
  const old = g.ok ? g.buf.toString('utf8') : null;
  if (g.how) console.log('  · ' + BASE + ' 를 판아 왔다 —' + g.how);
  if (!old && g.env) {
    skip++;
    console.log('  · ' + G756.skipNote(g) + ' — [2]~[4] 만 판정한다.');
  } else if (!old) {
    /* 얕지 않은데도 없다 = 환경이 아니다. 756 규약 ②의 안전핀 — 건너뛰기가 게이트 부패를 못 덮는다. */
    ok(false, '  [1-0] 수리 전 판(`' + BASE + ':tools/verify188.js`)을 꺼낸다', g.why);
  } else {
    ok(/trDeltaTxt\(/.test(old), '  [1-a] 수리 전 판이 `trDeltaTxt()` 를 부른다(660 이 선언째 지운 함수)');
    const f = tmp('old', old); TRASH.push(f);
    const r = run(f);
    ok(r.code !== 0, '  [1-b] 수리 전 판은 0 이 아닌 코드로 끝난다', 'code ' + r.code);
    ok(/trDeltaTxt is not defined/.test(r.out), '  [1-c] 그 사인은 `ReferenceError: trDeltaTxt is not defined` 다');
    ok(r.report === null,
       '  [1-d] **보고서(`VERIFY188 n/m`)가 한 줄도 안 나온다** — 이미 판정한 ① 항까지 같이 사라진다',
       r.report ? JSON.stringify(r.report) : '(보고서 없음)');
    ok(!/⑤ \[F4\]/.test(r.out),
       '  [1-e] ③ 뒤 절(⑤ 기능 체크)은 **한 번도 안 돈다** — 등재문의 «log: []» 가 이것이다');
    rm(f);
  }

  /* ── [2] 수리 후 — 끝까지 돌고 초록 ──────────────────────────────────────── */
  sec('[2] 수리 후 — 지금 판은 끝까지 돌아 보고서를 찍는다');
  const now = run(GATE);
  ok(now.report !== null, '  [2-a] 보고서가 나온다', now.report ? JSON.stringify(now.report) : '(없음)');
  ok(now.report && now.report.verdict === 'PASS' && now.code === 0,
     '  [2-b] 그 판정이 PASS 다', now.report ? now.report.got + '/' + now.report.tot + ' ' + now.report.verdict : '');
  ok(/⑤ \[F4\]/.test(now.out) && /§R3/.test(now.out),
     '  [2-c] ③ 뒤 절(§R3 · ⑤)이 실제로 돈다');

  /* ── [3] 주입 — 죽은 입을 심어도 «그 블록만» 빨개진다 ──────────────────────── */
  sec('[3] 주입 시험 — ③ 안에 죽은 입을 한 줄 심는다(ⓐ 처방의 되돌림 시험)');
  const NEEDLE = "    out.trShow = U.atk.show(lv('atk'));";
  ok(cur.indexOf(NEEDLE) >= 0, '  [3-0] 주입 지점이 실제로 있다(빈 replace 가 아니다)');
  const inj = cur.replace(NEEDLE, "    __dead760();\n" + NEEDLE);
  const f3 = tmp('inject', inj); TRASH.push(f3);
  const r3 = run(f3);
  ok(r3.report !== null,
     '  [3-a] 프로세스가 안 죽는다 — 보고서가 나온다', r3.report ? JSON.stringify(r3.report) : '(없음)');
  ok(/③ 런타임 표시면 — 평가가 죽었다/.test(r3.out),
     '  [3-b] ③ 블록이 «평가가 죽었다» FAIL 로 세어진다');
  ok(/__dead760 is not defined/.test(r3.out),
     '  [3-c] 그 FAIL 이 **원인 문자열**을 들고 있다(무슨 입이 죽었는지 말한다)');
  ok(/⑤ \[F4\] 획득 연출 다이아/.test(r3.out) && /§R3 원복하면/.test(r3.out),
     '  [3-d] **그 뒤 절은 계속 돈다** — ③-b · §R3 · ⑤ 가 전부 찍힌다');
  /* 죽은 블록은 «FAIL 1건» 이다 — ③ 항 전체가 거짓 빨강으로 번지지 않는다 */
  const badLines = (r3.out.match(/^FAIL /gm) || []);
  ok(badLines.length === 1,
     '  [3-e] 죽은 블록의 대가는 **FAIL 1건뿐**이다(③ 항 전체가 거짓 빨강으로 번지지 않는다)',
     'FAIL ' + badLines.length + '건 :: ' + badLines.join(' '));
  ok(r3.report && r3.report.tot < now.report.tot,
     '  [3-f] 그리고 «건너뛴 만큼» 총 항 수가 줄어 있다(초록으로 메우지 않는다)',
     r3.report ? r3.report.tot + ' < ' + now.report.tot : '');
  rm(f3);

  /* ── [4] 무름 방지 — «+n» 이 되살아나면 방향 반전 항이 빨개진다 ─────────────── */
  sec('[4] 무름 방지 — 660 이 닫은 «+n» 입을 되살리면 ③·⑤ 가 빨개진다');
  /* 제품(index.html)은 안 건드린다 — 자 안에서 카드 글자에 «+n» 을 한 장 얹은 사본으로 잰다.
     (제품을 고쳐 재면 병렬 세션의 트리를 흔든다 · [4] 는 «대조기가 제품을 본다» 만 물으면 된다) */
  const T3 = "    out.trPlus  = PLUS.test((trHpCard || {}).textContent || '');";
  const T5 = "      o.f1plus = PLUS.test((card || {}).textContent || '');";
  ok(cur.indexOf(T3) >= 0 && cur.indexOf(T5) >= 0, '  [4-0] 두 대조기 자리가 실제로 있다');
  const rev = cur
    .replace(T3, "    if (trHpCard) trHpCard.insertAdjacentHTML('beforeend', '<i>+12.3B</i>');\n" + T3)
    .replace(T5, "      if (card) card.insertAdjacentHTML('beforeend', '<i>+12.3B</i>');\n" + T5);
  const f4 = tmp('revive', rev); TRASH.push(f4);
  const r4 = run(f4);
  ok(r4.report !== null && r4.report.verdict === 'FAIL',
     '  [4-a] «+n» 을 되살린 사본은 FAIL 이다', r4.report ? r4.report.got + '/' + r4.report.tot : '(보고서 없음)');
  ok(/FAIL ③ 23 훈련 체력 카드에 «\+n» 증가분 글자 0건/.test(r4.out),
     '  [4-b] ③ 방향 반전 항이 빨개진다');
  ok(/FAIL ⑤ \[F1\] 강화 직후에도 훈련 카드에 «\+n» 증가분 글자 0건/.test(r4.out),
     '  [4-c] ⑤ 방향 반전 항도 빨개진다(강화 뒤 자리)');
  ok(!/FAIL §R4/.test(r4.out) && !/FAIL §R5/.test(r4.out),
     '  [4-d] 미끼 항(§R4·§R5)은 그대로 초록 — 대조기가 아니라 **제품**이 바뀐 것을 잡았다');
  rm(f4);

  console.log('\nPROBE760 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS') +
              (skip ? '  (⏸ 보류 ' + skip + '건 — 환경/얕은 클론)' : ''));
  process.exit(fail ? 1 : 0);
})();
