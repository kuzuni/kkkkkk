#!/usr/bin/env node
/* verify566 — `tools/verifyProgress.js` §2 축 ⓒ 「구현 칸이 벙어리」 자 (작업 566)
 *
 *   node tools/verify566.js
 *
 * ── 이 자가 지키는 것 ──────────────────────────────────────────────────────
 * ⓐ(388)·ⓑ(445)는 «미착수» 라는 **낱말**을 찾는다. ⓒ 는 낱말이 없는 자리를 본다 —
 * «비고는 완료로 닫혔는데 구현 칸이 완료·보류·진행 표지도 «–» 도 아닌 산문» 이다.
 * verifyProgress 는 모든 워커의 push 전 게이트이므로 이 자는 «빨개지는가» 만큼
 * **«안 빨개져야 할 자리에서 조용한가»** 를 같은 무게로 묻는다([C]~[F]).
 *
 * ── 무르게 풀지 않았음을 못박는 세 겹 ──────────────────────────────────────
 *   [B]  양성 — 마감된 512 의 구현 칸을 수리 전 산문으로 되돌리면 **빨강**이고 사유가 ⓒ 다.
 *   [B2] 되돌림 시험 — 축 ⓒ 를 무력화한 사본은 **같은 표**에서 초록이다
 *        ⇒ [B] 의 빨강이 ⓒ 때문임을 못박는다(다른 축이 우연히 빨간 것이 아니다).
 *   [C]~[F] 음성 — «–» · 진행/보류 표지 · 칸 수 7 아님 · 비고 머리말이 «미착수» 인 네 자리에서
 *        각각 조용한지(또는 **다른 축의 이름으로** 불리는지)를 따로따로 건다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const P = require('./probe566.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v566-'));

let pass = 0, fail = 0;
const ok = (label, cond, note) => { (cond ? pass++ : fail++); console.log('  ' + (cond ? 'ok  ' : '✗   ') + label + (note ? '  [' + note + ']' : '')); };

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
const rows = P.rowsOf(REAL);
/* 합성은 늘 «구현 칸만» 손댄다 — 다른 칸을 건드리면 어느 축이 빨간지 못 가른다. */
const setImpl = (text, id, v) => P.synthMute(text, id, v);

try {
  console.log('VERIFY566 — verifyProgress §2 축 ⓒ 「구현 칸이 벙어리」');

  /* ── [A] 전제 — 실물 트리 ── */
  console.log('\n[A] 전제 — 실물 트리');
  const a = run(['--no-gate']);
  ok('[A-a] 실물 표에서 종료 코드 0(초록)', a.code === 0, 'code ' + a.code);
  ok('[A-b] §2 요약이 «판정 불가» 를 세어 찍는다(못 본 것을 초록으로 안 부른다 · 604 로 축 ⓓ 로 개명)',
     /축 ⓓ 판정 불가 \d+/.test(a.out));
  ok('[A-c] 실물에 SELF-CONTRADICTION 이 없다', !/PROGRESS SELF-CONTRADICTION/.test(a.out));
  ok('[A-d] 전제: 이 세션이 마감한 여섯 행이 지금은 구현 칸에 완료 표지를 갖는다',
     ['144', '266', '327', '333', '512', '517'].every(id => {
       const c = P.cellsOf(rows.get(id).replace(/\s+$/, ''));
       return c.length === P.COLS && P.STATE_MARK.test(c[3]);
     }));

  /* ── [B] 양성 — 512 의 구현 칸을 수리 전 산문으로 ── */
  console.log('\n[B] 양성 — 512 구현 칸을 «— (T2 기능·연출 · … 비평가 없음)» 으로 되돌린다');
  const PROSE = '— (T2 기능·연출 · 지시서 [3]-(가) 기계+기능 · 비평가 없음 — 자가 «찍힌 픽셀» 로 채점)';
  const synth512 = setImpl(REAL, '512', PROSE);
  const f512 = write('P512.md', synth512);
  ok('[B-0] 전제: 합성 행에 완료 표지가 남아 있다(비고는 닫혀 있다)', P.DONE_DATED.test(P.rowsOf(synth512).get('512')));
  ok('[B-0b] 전제: 그 행은 ⓐ·ⓑ 가 안 본다(«미착수» 라는 낱말이 없다)',
     !P.NOT_YET.test(P.rowsOf(synth512).get('512')) && !P.tailHead(P.rowsOf(synth512).get('512')));
  const b = run(['--file', f512, '--no-gate']);
  ok('[B-a] 종료 코드 1(빨강)', b.code === 1, 'code ' + b.code);
  ok('[B-b] «PROGRESS SELF-CONTRADICTION» 을 이름으로 낸다', /PROGRESS SELF-CONTRADICTION 1건 — 512/.test(b.out));
  ok('[B-c] 진단이 ⓒ 의 낱말이다(«구현 칸이 아무 말도 안 한다»)', /✗ 512 — 자기모순 · 비고는 완료 표지 .* \*\*구현 칸\*\*이 아무 말도 안 한다/.test(b.out));
  ok('[B-d] 고치는 법이 «① 한 칸» 이라고 말한다', /고칠 곳은 ① 한 칸이다/.test(b.out) && /산문을 지우지 말고/.test(b.out));
  ok('[B-e] §1·§3 은 같은 표에서 조용하다(ⓒ 의 빨강이지 남의 빨강이 아니다)',
     !/PROGRESS REVERTED/.test(b.out) && !/PROGRESS UNCLOSED/.test(b.out));

  /* ── [B2] 되돌림 시험 — 축 ⓒ 를 걷어낸 사본은 같은 표에서 초록 ──
     ⚠ **치환문은 리터럴이 아니라 본체에서 파생시킨다(964 · 861·960 [R] 선례).**
     566 은 이 자리에 «  const cells = cellsOf(line);» 한 줄을 그대로 박아 두었는데,
     809 가 그 줄을 «const impl = cellsOf(line)[3];» 로 갈아 끼우자 `replace` 가
     **조용한 no-op** 이 됐다 — 사본이 본체와 글자 하나 안 다르니 «축 ⓒ 를 걷어낸 사본» 이
     축 ⓒ 를 그대로 지닌 채 [B] 와 같은 표를 돌아 code 1 을 냈고, [B2-0]·[B2-a]·[B2-b]
     셋이 한 덩어리로 빨갛게 굳었다(964 등재문의 «한 덩어리» 가 이것이다).
     ⇒ 앵커는 축 ⓒ **자신의 이름**(`kind: 'mute'` 를 미는 줄)이고, **정확히 한 줄**일 때만 믿는다.
     못 찾거나 여럿이면 [B2-0] 이 «앵커 n줄» 로 빨개진다 — 조용히 no-op 이 되는 길을 막았다. */
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'verifyProgress.js'), 'utf8');
  const MUTE_PUSH = /^[ \t]*contra\.push\(\{[^\n]*kind: 'mute'[^\n]*\);[ \t]*$/gm;
  const anchors = src.match(MUTE_PUSH) || [];
  const cut = anchors.length === 1
    ? src.replace(MUTE_PUSH, '  continue;   /* verify566 [B2] 되돌림 시험 — 축 ⓒ 무력화 */')
    : src;
  ok('[B2-0] 전제: 축 ⓒ 를 미는 줄을 본체에서 «정확히 한 줄» 찾아 걷어냈다',
     anchors.length === 1 && cut !== src, '앵커 ' + anchors.length + '줄');
  /* 사본은 **저장소 안**에 둔다 — `ROOT = __dirname/..` 이라 임시 디렉터리에 두면 종료 코드 2 로 죽고
     그 2 를 «초록 아님» 으로 잘못 읽게 된다(verify557 [B2] 가 1회차에 겪은 자리).
     ⚠ 이름은 pid 를 섞되(648) **부르는 이름도 같이** 섞어야 한다 — 648 이 쓰는 쪽만 고치고
     `run(…, 'tools/.v566-cut.js')` 를 그대로 둬서, 앵커가 멀쩡해도 없는 파일을 부를 뻔했다(964). */
  const cutName = '.v566-cut-' + process.pid + '.js';
  const cutPath = path.join(ROOT, 'tools', cutName);
  let b2, b2n;
  try {
    fs.writeFileSync(cutPath, cut);
    b2 = run(['--file', f512, '--no-gate'], 'tools/' + cutName);
    /* [B2-c] 되돌림 — «걷어내기가 no-op 이면» 이 절이 초록으로 지나가지 않는다는 것을 못박는다.
       본체를 **그대로** 사본 자리에 놓고 같은 표를 돌린다 = 964 가 고친 그 상태의 재현. */
    fs.writeFileSync(cutPath, src);
    b2n = run(['--file', f512, '--no-gate'], 'tools/' + cutName);
  } finally { if (fs.existsSync(cutPath)) fs.unlinkSync(cutPath); }
  ok('[B2-a] 축 ⓒ 를 걷어낸 사본은 같은 표에서 종료 코드 0(초록)', b2.code === 0, 'code ' + b2.code);
  ok('[B2-b] 즉 [B] 의 빨강은 축 ⓒ 의 것이다', b2.code === 0 && b.code === 1);
  ok('[B2-c] 되돌림 — 걷어내기가 no-op(사본 = 본체)이면 이 절은 다시 빨갛다(964 의 재현)',
     b2n.code === 1, 'code ' + b2n.code);

  /* ── [C] 음성 — 구현 칸이 «–» 면 조용하다(범위의 경계) ── */
  console.log('\n[C] 음성 — 구현 칸이 «–» 인 완료행은 축 밖이다');
  const c1 = run(['--file', write('Pdash.md', setImpl(REAL, '512', '–')), '--no-gate']);
  ok('[C-a] 구현 칸이 «–» 이기만 하면 초록이다', c1.code === 0, 'code ' + c1.code);
  ok('[C-b] 실물 표에 그 꼴로 닫힌 완료행이 많다(음성항이 공허하지 않다)',
     [...rows.values()].filter(l => {
       if (!P.DONE_DATED.test(l) || P.NOT_YET.test(l) || P.tailHead(l)) return false;
       const c = P.cellsOf(l.replace(/\s+$/, ''));
       return c.length === P.COLS && P.BARE_IMPL.test(c[3]);
     }).length >= 20);

  /* ── [D] 음성 — 진행·보류 표지는 «했다» 가 아니어도 조용하다 ── */
  console.log('\n[D] 음성 — 진행(🔧)·보류(⏸) 표지가 있으면 조용하다');
  for (const [mark, name] of [['🔧 **3회차 진행 중**', '진행'], ['⏸ **보류(10회, 최고 7점)**', '보류']]) {
    const r = run(['--file', write('P' + name + '.md', setImpl(REAL, '512', mark)), '--no-gate']);
    ok('[D-' + name + '] «' + mark.slice(0, 6) + '…» 은 빨갛지 않다', r.code === 0, 'code ' + r.code);
  }

  /* ── [E] 경계 — 칸 수가 7 이 아니면 축 ⓒ 는 조용하고 **축 ⓓ** 가 댄다 ──
     ⚠ 2026-08-31(604)에 이 절의 방향이 뒤집혔다. 옛 계약은 «칸이 8개면 초록» 이었는데,
     그 초록이 곧 586·592 가 push 게이트를 그대로 지나간 자리였다 — 이제 «판정 불가» 자체가
     빨강이다(333 처방대로 항을 지우지 않고 방향을 갈아 끼운다). ⓒ 가 조용한 것은 그대로다. */
  console.log('\n[E] 경계 — 칸 수가 7 이 아닌 행은 축 ⓒ 가 아니라 축 ⓓ 가 댄다');
  const un0 = Number(/축 ⓓ 판정 불가 (\d+)/.exec(a.out)[1]);
  const extra = setImpl(REAL, '512', PROSE).split('\n').map(l => {
    const g = P.ROW.exec(l);
    if (!g || g[1] !== '512') return l;
    const c = P.cellsOf(l.replace(/\s+$/, ''));
    c.splice(3, 0, ' (여분 칸) ');            /* 칸을 하나 더 넣는다 = 553·554 가 있던 모양 */
    return '|' + c.join('|') + '|';
  }).join('\n');
  const e = run(['--file', write('Pextra.md', extra), '--no-gate']);
  ok('[E-a] 칸이 8개면 축 ⓒ 는 그 행을 «자기모순» 으로 안 댄다(자리를 못 믿는다)',
     !/512 — 자기모순/.test(e.out));
  const un1 = Number(/축 ⓓ 판정 불가 (\d+)/.exec(e.out)[1]);
  ok('[E-b] 대신 «판정 불가» 가 한 건 늘어 세진다(조용히 빠지지 않는다)', un1 === un0 + 1, un0 + ' → ' + un1);
  ok('[E-c] 그리고 그 «판정 불가» 는 이제 빨강이다 — 옛 계약 «칸이 8개면 초록» 폐기 (604)',
     e.code === 1 && /512 — 판정 불가/.test(e.out), 'code ' + e.code);

  /* ── [F] 경계 — 비고 머리말이 «미착수» 면 ⓑ 가 댄다(이중 진단 없음) ── */
  console.log('\n[F] 경계 — «미착수» 라는 낱말이 있으면 ⓐ·ⓑ 의 몫이다');
  const headSynth = REAL.split('\n').map(l => {
    const g = P.ROW.exec(l);
    if (!g || g[1] !== '512') return l;
    const c = P.cellsOf(l.replace(/\s+$/, ''));
    c[3] = ' ' + PROSE + ' ';
    c[6] = ' **←(등재문) 미착수 · T2.** ' + c[6].trim() + ' ';
    return '|' + c.join('|') + '|';
  }).join('\n');
  const f = run(['--file', write('Phead.md', headSynth), '--no-gate']);
  ok('[F-a] 그 행은 빨갛다', f.code === 1, 'code ' + f.code);
  ok('[F-b] 진단이 ⓑ 의 낱말(«비고 머리말»)이지 ⓒ 의 낱말이 아니다',
     /✗ 512 — 자기모순 · 구현 칸은 채웠는데 \*\*비고 머리말\*\*/.test(f.out) && !/512 — 자기모순 · 비고는 완료 표지/.test(f.out));
  ok('[F-c] 512 가 두 번 불리지 않는다', (f.out.match(/✗ 512 — 자기모순/g) || []).length === 1);

  /* ── [G] escape — `\|` 를 구분자로 세면 진짜 결함이 «판정 불가» 로 밀려난다 ── */
  console.log('\n[G] `\\|` — escape 를 안 지키면 13행이 헛되이 판정 불가가 된다');
  const esc = [...rows].filter(([, l]) => {
    const s = l.replace(/\s+$/, '');
    return P.cellsOf(s).length === P.COLS && s.replace(/\|\s*$/, '').split('|').length - 1 !== P.COLS;
  }).map(([id]) => id);
  ok('[G-a] `\\|` 덕에 7칸으로 세지는 행이 실제로 있다', esc.length > 0, esc.join(' '));
  /* 표본은 «완료행이면서 ⓐ·ⓑ 가 안 보는» 행이어야 한다 — 아니면 [G-b] 가 escape 가 아니라
     다른 전제를 재게 된다(1회차 실패: 14 는 «폐기 **확인** (날짜)» 라 DONE_DATED 가 아니다). */
  const gid = esc.find(id => {
    const l = rows.get(id);
    return P.DONE_DATED.test(l) && !P.NOT_YET.test(l) && !P.tailHead(l);
  });
  ok('[G-a2] 그중 «완료행이고 ⓐ·ⓑ 가 안 보는» 표본이 있다', !!gid, gid || '없음');
  if (!gid) throw new Error('[G] 표본 없음');
  const g = run(['--file', write('Pesc.md', setImpl(REAL, gid, PROSE)), '--no-gate']);
  ok('[G-b] 그런 행도 축 ⓒ 가 제대로 판정한다(빨강)', g.code === 1 && new RegExp('✗ ' + gid + ' — 자기모순 · 비고는 완료 표지').test(g.out), gid + ' · code ' + g.code);

  /* ── [P] 재현기·회귀 ── */
  console.log('\n[P] 재현기 · 회귀');
  const p = run([], 'tools/probe566.js');
  ok('[P-a] probe566 이 초록이다(재현이 성립한다)', p.code === 0, 'code ' + p.code);
  const p388 = run([], 'tools/probe388.js');
  ok('[P-b] 회귀: probe388 초록(ⓐ 축 무변경)', p388.code === 0, 'code ' + p388.code);
  const v388 = run([], 'tools/verify388.js');
  ok('[P-c] 회귀: verify388 초록(§2 의 앞 두 축)', v388.code === 0, 'code ' + v388.code);
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
}

console.log('\nVERIFY566 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
