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
const skipped = [];    /* 건너뜀 — 환경이 없어 **못 쟀다**. 초록으로도 빨강으로도 세지 않는다(작업 810). */
const ok = (label, cond, note) => { (cond ? pass++ : fail++); console.log('  ' + (cond ? 'ok  ' : '✗   ') + label + (note ? '  [' + note + ']' : '')); };
const skip = (label, why) => { skipped.push(label + ' — ' + why); console.log('  –   ' + label + ' 건너뜀 — ' + why); };
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
    /* ── ⚠ 환경 갈래 (2026-09-02, 작업 810) ────────────────────────────────────
     * [B] 는 «§3 이 498 을 마감 누락으로 부르는가» 를 묻는데, §3 의 E2 축은 그 답을
     * **`verify498` 의 종료 코드**로 정한다. 그 자가 이 컨테이너에서 아예 **못 돌면**
     * (playwright 없음 = 종료 코드 2 — 저장소 공용 규약) §3 은 설계대로
     * «관찰 · 판정 불가» 로 비켜서고, [B-a]~[B-d] 가 4항 줄줄이 빨개진다.
     * 그 빨강은 «§3 회귀 부패» 와 **글자 하나까지 같은 얼굴**이다 —
     * 810 등재문이 실제로 그렇게 읽혔고(35/39 · «자 · 회귀 부패» 로 등재),
     * 뿌리는 `npm i --no-save playwright` 한 줄이었다. 지시서 [-2] 의 «얕은 클론» 처방도
     * `git stash` 대조도 이 축은 못 가른다 — 둘 다 자를 **돌려 보지 않기** 때문이다.
     * ⇒ 환경이 원인이면 **빨강이 아니라 건너뜀**으로 밝히고 고치는 법을 같이 찍는다.
     *   못 본 것을 초록으로 부르지도 않는다 — 이 자리를 [E-e] 가 환경 없이 대신 잰다
     *   (자가 «못 돌린» 답을 §3 이 어떻게 다루는지가 정확히 그 축이다). */
    const envUnrun = /498 — 관찰 · 자 .*를 못 돌렸다/.test(b.out);
    const gateRed = /498 — 관찰 · 자 .*가 빨갛다/.test(b.out);
    if (envUnrun || gateRed) {
      const why = envUnrun
        ? '표본 자 `tools/verify498.js` 가 이 환경에서 안 돈다(§3 은 규약대로 «관찰 · 판정 불가»). '
          + '고치는 법: npm i --no-save playwright && npx playwright install chromium'
        : '표본 자 `tools/verify498.js` 가 빨갛다 — §3 이 아니라 **498 의 자**를 먼저 봐라';
      console.log('  ⚠   [B] 이 절은 §3 의 결손이 아니다 — ' + why);
      for (const l of ['[B-a]', '[B-b]', '[B-c]', '[B-d]', '[B-e]', '[B2-0]', '[B2-a]', '[B2-b]']) skip(l, envUnrun ? '환경(표본 자 실행 불가)' : '표본 자가 빨갛다');
    } else {
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
    const cutPath = path.join(ROOT, 'tools', `.v557-cut-${process.pid}.js`);
    let b2;
    try { fs.writeFileSync(cutPath, cut); b2 = run(['--file', f498], 'tools/' + path.basename(cutPath)); }
    finally { if (fs.existsSync(cutPath)) fs.unlinkSync(cutPath); }
    ok('[B2-a] §3 을 걷어낸 사본은 같은 표에서 종료 코드 0(초록)', b2.code === 0, 'code ' + b2.code);
    ok('[B2-b] 그 사본은 §3 을 «건너뜀» 으로 밝힌다', /§3 마감 누락 검사 — 건너뜀/.test(b2.out));
    }
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
    } finally { try { fs.unlinkSync(lockPath); } catch (e) {} }
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
        /* [E-e] 세 번째 답 — «못 돌렸다» (2026-09-02, 작업 810).
         * 자의 답은 둘이 아니라 **셋**이다: 초록 · 빨강 · **못 돌림**(playwright 없음 = 종료 코드 2,
         * 저장소 공용 규약). 앞의 둘만 걸어 두면 셋째 갈래가 무보증으로 남고, 그 갈래가
         * 곧 810 이 «§3 회귀 부패» 로 읽은 그 자리다. 이 항은 **환경이 없어도 도는** 시험이라
         * 위 [B] 가 환경으로 건너뛴 회차에서도 §3 의 그 축을 실제로 잰다. */
        fs.writeFileSync(gp, 'console.error("playwright 없음"); process.exit(2); /* verify557 [E] 임시 표본 */\n');
        const e3 = run(['--file', write('Preal3.md', REAL)]);
        ok('[E-e] 자를 «못 돌린» 행은 빨강도 침묵도 아니다 — 관찰 · 판정 불가',
           new RegExp('⚠  ' + eid + ' — 관찰 · 자 .*를 못 돌렸다').test(e3.out)
           && !new RegExp('✗ ' + eid + ' — 마감 누락').test(e3.out) && e3.code === 0, 'code ' + e3.code);
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

  /* ── [I] 경계 — §1 이 이미 댄 행은 §3 이 다시 안 댄다 ──
   * 되돌린 행은 완료 표지를 잃으므로 §3 의 후보 모양과 **정확히 같아진다**. 둘 다 찍으면
   * 고치는 법이 갈린다(§1 «done 커밋의 행을 되살려라» ↔ §3 «세 칸을 채워라») — 더 구체적인 §1 이 댄다.
   * ⚠ 이 항이 없으면 `verify374` R2(«§1 빨간 행이 정확히 되돌린 그 행뿐»)가 조용히 빨개진다(1회차 실측). */
  console.log('\n[I] 경계 — §1 이 댄 행은 §3 이 다시 안 댄다');
  const realRows = P.rowsOf(REAL);
  const doneIds = [...new Set((execFileSync('git', ['log', 'HEAD', '--format=%s', '--', 'docs/PROGRESS.md'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n')
    .map(s => /^done\(([0-9A-Z, ]+)\)/.exec(s)).filter(Boolean)
    .flatMap(g => g[1].split(',').map(x => x.trim()))))];
  /* 표본 조건: ① 이력에 done() 이 보이고 ② 지금 행이 완료로 닫혀 있고 ③ 자산이 있고 ④ lock 이 없고
     ⑤ **합성 사본에서 완료 표지가 통째로 걷힌다**. ⑤ 를 안 물으면 «칸에 `|` 가 있어 구현 칸이 밀린 행»
     (예: 559)이 뽑혀 사본에 ✅ 가 남고, §1 이 아니라 **§3 의 DONE_DATED 제외**가 [I-a] 를 통과시킨다
     = 시험이 엉뚱한 축을 재게 된다(1회차 실측). */
  const donePick = doneIds.find(id => {
    const row = realRows.get(id);
    if (!(row && P.DONE_DATED.test(row) && (P.reviewOf(id).length || P.gateOf(id)) && !P.lockOf(id))) return false;
    try { return !/✅|완료\(/.test(P.rowsOf(P.synth(REAL, id)).get(id)); } catch (e) { return false; }
  });
  if (!donePick) {
    console.log('  –   [I-a]~[I-c] 건너뜀 — 얕은 창에 «완료 표지 + 자산» 을 다 가진 done 행이 없다');
  } else {
    /* 그 행을 «미착수» 로 되돌린 사본 = §1(표지 회귀)과 §3(마감 누락)의 후보 모양이 겹치는 자리 */
    const both = P.synth(REAL, donePick);
    const i = run(['--file', write('Pboth.md', both), '--no-gate']);
    ok('[I-0] 전제: 그 사본이 §1 을 빨갛게 한다', new RegExp('✗ ' + donePick + ' — (완료 표지가 사라졌다|정확 되돌림)').test(i.out), donePick);
    ok('[I-a] §3 은 같은 행을 다시 안 부른다(이중 진단 없음)', !new RegExp('✗ ' + donePick + ' — 마감 누락').test(i.out));
    ok('[I-b] §3 요약이 그 행을 관찰로도 안 센다', !new RegExp('⚠  ' + donePick + ' — 관찰').test(i.out));
  }

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

/* 건너뛴 항은 초록으로도 빨강으로도 세지 않는다 — 대신 **마지막 줄이 이름을 밝힌다**(작업 810).
   조용한 건너뜀은 «못 본 것을 초록으로 부르는» 것과 같다(557 머리말 · verifyProgress --no-gate 규약). */
console.log('\nVERIFY557 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS')
  + (skipped.length ? '\n⚠ 안 쟀다 ' + skipped.length + '항 — ' + skipped.join(' · ') : ''));
process.exit(fail ? 1 : 0);
