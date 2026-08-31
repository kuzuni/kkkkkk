#!/usr/bin/env node
/* verify557 — `tools/verifyProgress.js` §3 「마감 누락」 자 (작업 557)
 *
 *   node tools/verify557.js            전 절
 *   node tools/verify557.js --quick    자를 실제로 돌리는 절([B]·[E])을 건너뛴다(빠른 회귀용)
 *
 * ── 이 자가 지키는 것 ──────────────────────────────────────────────────────
 * §3 은 «표는 «미착수» 인데 저장소에는 그 작업의 자산이 이미 있다» 를 잡는다. 자를 세울 때
 * 값을 치르는 쪽은 **헛빨강**이다 — verifyProgress 는 모든 워커의 push 전 게이트라
 * 헛빨강 하나가 저장소 전체의 push 를 막는다. 그래서 이 자는 «빨개지는가» 만큼
 * **«안 빨개져야 할 자리에서 조용한가»** 를 같은 무게로 묻는다([C]~[F]).
 *
 * ── 무르게 풀지 않았음을 못박는 세 겹 ──────────────────────────────────────
 *   [B]  양성 — 마감된 498 행을 등재 상태로 되돌린 합성 표에서 **빨강**이고, 사유가 «자가 초록» 이다.
 *   [B2] 되돌림 시험 — §3 판정 루프를 무력화한 사본으로 **같은 표**를 보면 초록이다
 *        ⇒ [B] 의 빨강이 §3 때문임을 못박는다(다른 절이 우연히 빨간 것이 아니다).
 *   [E]  음성 — 같은 자리에서 자가 **빨갛기만 하면** §3 은 조용하다(임시 자 파일로 양쪽을 다 건다).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = require('./probe557.js');
const quick = process.argv.slice(2).includes('--quick');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'v557-'));

let pass = 0, fail = 0;
const ok = (label, cond, note) => { (cond ? pass++ : fail++); console.log('  ' + (cond ? 'ok  ' : '✗   ') + label + (note ? '  [' + note + ']' : '')); };
const sec = t => ((Date.now() - t) / 1000).toFixed(1) + '초';

/* verifyProgress 실행 — 종료 코드와 출력을 같이 돌려준다. */
function run(args, tool) {
  const t = tool || 'tools/verifyProgress.js';
  try {
    const out = execFileSync('node', [t, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: String((e.stdout || '') + (e.stderr || '')) };
  }
}
const write = (name, text) => { const p = path.join(TMP, name); fs.writeFileSync(p, text); return p; };

const REAL = fs.readFileSync(path.join(ROOT, 'docs', 'PROGRESS.md'), 'utf8');

try {
  console.log('VERIFY557 — verifyProgress §3 「마감 누락」' + (quick ? ' (--quick)' : ''));

  /* ── [A] 전제 — 실물 표는 초록이고, §3 절이 실제로 돈다 ── */
  console.log('\n[A] 전제 — 실물 트리');
  const a = run([]);
  ok('[A-a] 실물 표에서 종료 코드 0(초록)', a.code === 0, 'code ' + a.code);
  ok('[A-b] 요약에 §3 절이 한 줄 찍힌다', /§3 마감 누락 검사/.test(a.out));
  ok('[A-c] §3 이 실물 표에서 빨강 0건', /§3 마감 누락 검사 — 빨강 0건/.test(a.out));
  ok('[A-d] 진행 중(lock) 행을 조용히 빼지 않고 세어 찍는다', /진행 중이라 제외 \d+건/.test(a.out));

  /* ── [B] 양성 — 마감된 행을 «등재 상태» 로 되돌린 합성 표 ── */
  console.log('\n[B] 양성 — 498(제품·자·review 는 있는데 표만 미착수) 합성 재현');
  const synth498 = P.synth(REAL, '498');
  const f498 = write('P498.md', synth498);
  ok('[B-0] 전제: 합성 행에 완료 표지가 0건이다(§2 가 볼 모순이 없다)', !P.DONE_DATED.test(P.rowsOf(synth498).get('498')));
  ok('[B-0b] 전제: 합성 행이 «미착수» 로 읽힌다', P.readsUnstarted(P.rowsOf(synth498).get('498')));
  ok('[B-0c] 전제: 자산이 둘 다 있다', P.reviewOf('498').length > 0 && !!P.gateOf('498'));
  if (quick) {
    console.log('  –   [B-a]~[B-d] 건너뜀(--quick)');
  } else {
    const t0 = Date.now();
    const b = run(['--file', f498]);
    ok('[B-a] 종료 코드 1(빨강)', b.code === 1, 'code ' + b.code + ' · ' + sec(t0));
    ok('[B-b] «PROGRESS UNCLOSED» 를 이름으로 낸다', /PROGRESS UNCLOSED 1건 — 498/.test(b.out));
    ok('[B-c] 사유가 «자가 초록» 이다(자산 존재만으로 부르지 않는다)', /498 — 마감 누락 · 그 작업의 자가 초록이다/.test(b.out));
    ok('[B-d] 고치는 법이 «세 칸을 채워라» 다', /① 구현 칸/.test(b.out) && /등재문 본문은 지우지 마라/.test(b.out));
    ok('[B-e] §1·§2 는 같은 표에서 조용하다(§3 의 빨강이지 남의 빨강이 아니다)',
       /§2 자기모순 검사 — 표 행 \d+건 · 빨강 0건/.test(b.out) && !/PROGRESS REVERTED/.test(b.out) && !/PROGRESS SELF-CONTRADICTION/.test(b.out));

    /* [B2] 되돌림 시험 — §3 판정 루프를 걷어낸 사본은 같은 표에서 초록이어야 한다 */
    const src = fs.readFileSync(path.join(ROOT, 'tools', 'verifyProgress.js'), 'utf8');
    const cut = src.replace('const skipRev = !!rev;', 'const skipRev = true;   /* verify557 [B2] 되돌림 시험 — §3 무력화 */');
    ok('[B2-0] 전제: 사본이 실제로 달라졌다', cut !== src);
    /* 사본은 **저장소 안**에 둬야 한다 — `ROOT = __dirname/..` 이라 임시 디렉터리에 두면
       저장소를 못 찾아 종료 코드 2 로 죽고, 그 2 를 «초록 아님» 으로 잘못 읽게 된다(1회차 실패). */
    const cutPath = path.join(ROOT, 'tools', '.v557-cut.js');
    let b2;
    try { fs.writeFileSync(cutPath, cut); b2 = run(['--file', f498], 'tools/.v557-cut.js'); }
    finally { if (fs.existsSync(cutPath)) fs.unlinkSync(cutPath); }
    ok('[B2-a] §3 을 걷어낸 사본은 같은 표에서 종료 코드 0(초록)', b2.code === 0, 'code ' + b2.code);
    ok('[B2-b] 그 사본은 §3 을 «건너뜀» 으로 밝힌다', /§3 마감 누락 검사 — 건너뜀/.test(b2.out));
  }

  /* ── [C] 음성 — 자산이 0건인 진짜 미착수 행은 건드리지 않는다 ── */
  console.log('\n[C] 음성 — 진짜 미착수(자산 0건)');
  const trueNew = [...P.rowsOf(REAL)].filter(([id, line]) => P.readsUnstarted(line) && !P.DONE_DATED.test(line) && !P.reviewOf(id).length && !P.gateOf(id)).map(([id]) => id);
  ok('[C-a] 표에 «자산 0건 미착수» 표본이 실제로 있다(음성항이 공허하지 않다)', trueNew.length > 0, trueNew.join(' ') || '0건');
  ok('[C-b] 그 행들이 실물 실행에서 한 건도 «마감 누락» 으로 안 불렸다', trueNew.every(id => !new RegExp('✗ ' + id + ' — 마감 누락').test(a.out)));

  /* ── [D] 음성 — lock 이 살아 있으면 제외된다(진행 중 세션의 회차 기록) ── */
  console.log('\n[D] 음성 — lock 이 살아 있는 행은 제외');
  const lockPath = path.join(ROOT, 'docs', 'claims', '498.lock');
  const hadLock = fs.existsSync(lockPath);
  ok('[D-0] 전제: 498 에 lock 이 없다(시험이 남의 lock 을 안 건드린다)', !hadLock);
  if (!hadLock && !quick) {
    fs.writeFileSync(lockPath, new Date().toISOString().replace(/\.\d+Z$/, 'Z') + ' sess-verify557-tmp\n');
    try {
      const d = run(['--file', f498, '--no-gate']);
      ok('[D-a] lock 이 있으면 §3 이 «제외» 로 빼고 이름을 찍는다', /–  498 — 제외 · lock sess-verify557-tmp/.test(d.out));
      ok('[D-b] 그 행이 «마감 누락» 으로는 안 불린다', !/498 — 마감 누락/.test(d.out));
    } finally { fs.unlinkSync(lockPath); }
    ok('[D-c] 시험이 임시 lock 을 도로 지웠다', !fs.existsSync(lockPath));
  } else {
    console.log('  –   [D-a]~[D-c] 건너뜀(' + (hadLock ? '498 에 남의 lock 이 있다' : '--quick') + ')');
  }

  /* ── [E] 음성 — 자가 «빨갛기만» 하면 조용하다 (E2 축의 양쪽) ──
   * 자산이 없는 진짜 미착수 행에 **임시 자 파일**을 심어 자의 답만 바꿔 가며 건다.
   * 초록이면 빨강 · 빨강이면 조용 — 두 판정이 자의 답 하나로만 갈리는지 보는 자리다. */
  console.log('\n[E] 음성 — 그 작업의 자가 빨가면 §3 은 조용하다');
  /* ⚠ lock 이 걸린 행을 고르면 §3 이 그 행을 **제외**해 자를 아예 안 물어보고,
     [E-b]·[E-c] 가 «자의 답» 이 아니라 «제외» 를 재게 된다(1회차 실패 — 555 를 골랐다). */
  const eid = trueNew.find(id => !P.lockOf(id));
  if (quick || !eid) {
    console.log('  –   [E-a]~[E-c] 건너뜀(' + (quick ? '--quick' : '표본 없음') + ')');
  } else {
    const gp = path.join(ROOT, 'tools', 'verify' + eid + '.js');
    if (fs.existsSync(gp)) { console.log('  –   [E] 건너뜀 — tools/verify' + eid + '.js 가 이미 있다'); }
    else {
      try {
        fs.writeFileSync(gp, 'process.exit(1); /* verify557 [E] 임시 표본 */\n');
        const e1 = run(['--file', write('Preal.md', REAL)]);
        ok('[E-a] 자가 빨간 행은 «마감 누락» 이 아니다', !new RegExp('✗ ' + eid + ' — 마감 누락').test(e1.out) && e1.code === 0, 'code ' + e1.code);
        ok('[E-b] 대신 «관찰» 로 이름을 찍는다(조용히 넘기지 않는다)', new RegExp('⚠  ' + eid + ' — 관찰 · 자 .*가 빨갛다').test(e1.out));
        fs.writeFileSync(gp, 'process.exit(0); /* verify557 [E] 임시 표본 */\n');
        const e2 = run(['--file', write('Preal2.md', REAL)]);
        ok('[E-c] 같은 행이 자만 초록으로 바뀌면 빨갛다(판정이 자의 답 하나로 갈린다)',
           new RegExp('✗ ' + eid + ' — 마감 누락 · 그 작업의 자가 초록이다').test(e2.out) && e2.code === 1, 'code ' + e2.code);
      } finally { if (fs.existsSync(gp)) fs.unlinkSync(gp); }
      ok('[E-d] 시험이 임시 자 파일을 도로 지웠다', !fs.existsSync(gp));
    }
  }

  /* ── [F] --no-gate 는 «조용히 초록» 이 아니다 ── */
  console.log('\n[F] --no-gate — 못 본 것을 초록으로 부르지 않는다');
  const f = run(['--file', f498, '--no-gate']);
  ok('[F-a] 요약이 «자를 안 돌렸다» 를 ⚠ 로 밝힌다', /--no-gate: 자를 안 돌렸다/.test(f.out));
  ok('[F-b] 그 행을 «관찰» 로 세어 찍는다', /⚠  498 — 관찰 · 자 .*안 돌렸다/.test(f.out));
  ok('[F-c] 마지막 줄도 §3 이 반쪽으로 돌았음을 밝힌다', /--no-gate 로 껐다/.test(f.out));

  /* ── [G] --rev 는 §3 을 안 돌리고, 안 돌렸다고 말한다 ── */
  console.log('\n[G] --rev — 자산과 옛 표는 짝이 안 맞는다');
  const g = run(['--rev', 'HEAD']);
  ok('[G-a] §3 을 «건너뜀» 으로 밝힌다', /§3 마감 누락 검사 — 건너뜀/.test(g.out));
  ok('[G-b] 마지막 줄도 그렇게 말한다', /--rev 라 안 돌았다/.test(g.out) || g.code !== 0, 'code ' + g.code);

  /* ── [H] 두 자가 서로의 자리를 안 넘본다 ── */
  console.log('\n[H] 경계 — 완료 표지가 **있는** 미착수 행은 §2 의 몫이다');
  const synthC = P.synth(REAL, '498', { head: '**←(등재문) 미착수 · T2.**', keepBody: true });
  const hrow = P.rowsOf(synthC).get('498');
  ok('[H-0] 전제: 그 행에 완료 표지가 있다', P.DONE_DATED.test(hrow));
  const h = run(['--file', write('Pcontra.md', synthC), '--no-gate']);
  ok('[H-a] §2 가 그 행을 자기모순으로 잡는다', /PROGRESS SELF-CONTRADICTION/.test(h.out) && /✗ 498 — 자기모순/.test(h.out));
  ok('[H-b] §3 은 그 행을 안 건드린다(이중 계상 없음)', !/498 — 마감 누락/.test(h.out) && !/498 — 관찰/.test(h.out));

  /* ── [P] 재현기 ── */
  console.log('\n[P] 재현기');
  const p = run(['--no-gate'], 'tools/probe557.js');
  ok('[P-a] probe557 이 초록이다(재현이 성립한다)', p.code === 0, 'code ' + p.code);
  ok('[P-b] probe557 이 «lock 이 가른다» 를 실측으로 찍는다', /진행 중과 마감 누락을 가르는 것은 자산이 아니라 \*\*lock\*\*/.test(p.out));
  const p388 = run([], 'tools/probe388.js');
  ok('[P-c] 회귀: probe388 이 그대로 초록이다(§2 축 무변경)', p388.code === 0, 'code ' + p388.code);
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
}

console.log('\nVERIFY557 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
