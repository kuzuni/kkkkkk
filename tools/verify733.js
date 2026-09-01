#!/usr/bin/env node
/* 733 검증 — «남의 파일이 커밋에 통째로 딸려 들어가는 것» 을 자가 잡는가
 *
 *   node tools/verify733.js
 *
 *   [A] 도구 — `verifyProgress.js` 에 §5 가 있고 **종료 코드에 반영**된다 · 지시서 [4]·[6] 에 add 규약·복구 절차가 있다.
 *   [B] 사고 재현 — 2026-09-01 `2e8c90a` 의 모양(주제와 무관한 파일이 25,424줄 → 0)을 합성 저장소로 되살려
 *       자가 **코드 1** 로 멈추는지 잰다. 파일이 «비워진» 경우와 «지워진» 경우 둘 다.
 *   [C] 헛빨강 방지 — 정상 회차 커밋(제품 편집 · lock 해제 · review 추가 · 표 갱신)은 초록이어야 한다.
 *       ⚠ **핵심 축**: 상류가 앞서 있어도(남이 LESSONS 에 5,000줄을 더 올렸어도) 초록이다 —
 *       기준이 `origin/main` 이 아니라 `merge-base` 이기 때문이다. 4개 워커가 상시 push 하는 저장소라
 *       이 축이 없으면 자가 매번 헛빨강을 내고 곧 꺼진다.
 *   [D] 밝히고 지나가기 — `--allow-shrink <path>` 로 밝힌 경로는 «관찰» 로 찍히고 push 를 막지 않는다.
 *   [R] 되돌림 시험 — §5 를 **뺀 사본**은 같은 사고 저장소에서 도로 초록이 된다(= 무르게 푼 수리가 아니다).
 *
 * ⚠ 문턱은 실측이다(355 커밋 · 2026-09-01 13:41Z~17:44Z): 한 파일 순삭 최댓값은 사고를 빼면 **50줄**이다.
 *   그래서 [C3] 은 실측 최댓값(−124/+115 재작성 = 순삭 9)과 그 위(순삭 60)를 **둘 다** 초록으로 못박는다.
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VP = path.join(ROOT, 'tools', 'verifyProgress.js');
const ROUTINE = path.join(ROOT, 'docs', 'ROUTINE.md');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const shQ = (cwd, ...a) => {
  const r = spawnSync(a[0], a.slice(1), { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

const VSRC = fs.existsSync(VP) ? fs.readFileSync(VP, 'utf8') : '';
const RSRC = fs.existsSync(ROUTINE) ? fs.readFileSync(ROUTINE, 'utf8') : '';

/* ─────────────────────────── [A] 도구 ─────────────────────────── */
ok(spawnSync('node', ['--check', VP], { encoding: 'utf8' }).status === 0, 'A1 verifyProgress.js 문법 성함');
ok(/§5 추적 파일 급감 판정/.test(VSRC), 'A2 verifyProgress 에 §5 절이 있다');
ok(/\|\|\s*shrunk\.length\s*\)\s*process\.exit\(1\)/.test(VSRC),
   'A3 §5 가 **종료 코드에 반영**된다(경고만 찍고 코드 0 이면 push 게이트가 아니다 — 604 선례)');
ok(/merge-base/.test(VSRC) && /origin\/main/.test(VSRC),
   'A4 기준이 merge-base 다(상류 추가분을 내 삭제로 읽으면 헛빨강이 난다)');
ok(/--allow-shrink/.test(VSRC), 'A5 밝히고 지나가는 문이 있다(--allow-shrink)');
ok(/SHRINK_ABS = 200/.test(VSRC) && /SHRINK_RATIO = 0\.9/.test(VSRC),
   'A6 문턱이 실측값으로 박혀 있다(순삭 200줄 · 밑동의 90%)');
ok(/git add -A.*금지|금지.*git add -A/.test(RSRC),
   'A7 지시서에 «`git add -A` 금지 · 내가 만진 파일만» 규약이 있다(처방 ②)');
ok(/git checkout <[^>]*sha[^>]*> -- /.test(RSRC) || /git checkout .* -- <파일>/.test(RSRC),
   'A8 지시서에 복구 절차 한 줄이 있다(처방 ③)');

/* ───────────────── 합성 저장소 — 사고의 모양을 그대로 만든다 ───────────────── */
const LESSONS_N = 3000;
const lessons = n => Array.from({ length: n }, (_, i) => '- 교훈 ' + (i + 1)).join('\n') + '\n';
const TABLE = '| # | 화면 | 측정표 | 구현 | 최고 점수 | 루프 횟수 | 비고 |\n|---|---|---|---|---|---|---|\n' +
              '| 900 | 씨앗 | – | – | – | 0/5 | 미착수. |\n';

/* seed(=상류) → [upstreamExtra] → 내 가지에서 mutate() → verifyProgress 실행 */
function harness(mutate, { vpSrc = VSRC, args = [], upstreamExtra = null } = {}) {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v733-'));
  const W = p => path.join(TMP, p);
  fs.mkdirSync(W('tools'), { recursive: true });
  fs.mkdirSync(W('docs/claims'), { recursive: true });
  fs.mkdirSync(W('docs/review'), { recursive: true });
  fs.writeFileSync(W('tools/verifyProgress.js'), vpSrc);
  fs.writeFileSync(W('docs/PROGRESS.md'), TABLE);
  fs.writeFileSync(W('docs/LESSONS.md'), lessons(LESSONS_N));
  fs.writeFileSync(W('docs/claims/900.lock'), '2026-09-01T00:00:00Z sess-seed\n');
  fs.writeFileSync(W('index.html'), Array.from({ length: 400 }, (_, i) => '<!-- 줄 ' + i + ' -->').join('\n') + '\n');
  fs.writeFileSync(W('tools/verify900.js'), Array.from({ length: 300 }, (_, i) => '/* 자 ' + i + ' */').join('\n') + '\n');
  sh(TMP, 'git', 'init', '-q', '-b', 'main');
  sh(TMP, 'git', 'config', 'user.email', 'v733@test'); sh(TMP, 'git', 'config', 'user.name', 'v733');
  sh(TMP, 'git', 'add', '-A'); sh(TMP, 'git', 'commit', '-q', '-m', 'seed');
  sh(TMP, 'git', 'update-ref', 'refs/remotes/origin/main', 'HEAD');   /* 여기가 갈림점 */
  if (upstreamExtra) {                                                /* 남이 상류에 먼저 올렸다 */
    const keep = sh(TMP, 'git', 'rev-parse', 'HEAD').trim();
    upstreamExtra(W);
    sh(TMP, 'git', 'add', '-A'); sh(TMP, 'git', 'commit', '-q', '-m', 'done(901): 남의 커밋');
    sh(TMP, 'git', 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    sh(TMP, 'git', 'reset', '-q', '--hard', keep);                    /* 내 가지는 아직 그 앞이다 */
  }
  mutate(W, TMP);
  const r = shQ(TMP, 'node', W('tools/verifyProgress.js'), '--no-gate', ...args);
  fs.rmSync(TMP, { recursive: true, force: true });
  return r;
}
const commitAll = (TMP, msg) => { sh(TMP, 'git', 'add', '-A'); sh(TMP, 'git', 'commit', '-q', '-m', msg); };
const shrinkLine = out => (out.split('\n').find(l => /§5 추적 파일 급감/.test(l)) || '').trim();

/* ─────────────── [B] 사고 재현 — 자기 주제와 무관한 파일이 통째로 ─────────────── */
const B1 = harness((W, TMP) => {
  fs.writeFileSync(W('index.html'), fs.readFileSync(W('index.html'), 'utf8') + '<!-- 이번 작업 -->\n');
  fs.writeFileSync(W('docs/LESSONS.md'), '');                       /* `git add -A` 가 삼킨 자리 */
  commitAll(TMP, 'done(684,685): 전투력 알림');                      /* 메시지에 그 파일 이야기가 없다 */
}, {});
ok(B1.code === 1 && /TRACKED FILE COLLAPSE/.test(B1.out) && /docs\/LESSONS\.md/.test(B1.out),
   'B1 사고 재현 — 주제와 무관한 파일이 0줄이 된 커밋에서 코드 1 로 멈춘다',
   '코드 ' + B1.code + ' · ' + shrinkLine(B1.out));
ok(/순삭 3000줄/.test(B1.out) && /통째로 사라졌다/.test(B1.out),
   'B2 무엇이 얼마나 사라졌는지 수치로 말한다', (B1.out.split('\n').find(l => /✗ docs\/LESSONS/.test(l)) || '').trim());
ok(/git checkout/.test(B1.out) && /git add -A/.test(B1.out),
   'B3 «어떻게 되살리는가» 와 «뿌리가 무엇인가» 를 같이 적는다');

const B4 = harness((W, TMP) => {
  fs.unlinkSync(W('docs/LESSONS.md'));                              /* 비운 게 아니라 지웠다 */
  commitAll(TMP, 'done(902): 다른 주제');
}, {});
ok(B4.code === 1 && /docs\/LESSONS\.md/.test(B4.out), 'B4 «지워진» 경우도 같은 자에 걸린다', '코드 ' + B4.code);

const B5 = harness((W) => {
  fs.writeFileSync(W('docs/LESSONS.md'), '');                       /* 커밋조차 안 했다(작업 트리) */
}, {});
ok(B5.code === 1, 'B5 커밋 전(작업 트리)에도 걸린다 — 사고를 커밋한 뒤에야 짖으면 늦다', '코드 ' + B5.code);

/* ─────────────── [C] 헛빨강 방지 — 정상 회차는 초록이어야 한다 ─────────────── */
const C1 = harness((W, TMP) => {
  const idx = fs.readFileSync(W('index.html'), 'utf8').split('\n');
  fs.writeFileSync(W('index.html'), idx.slice(0, 380).concat(Array.from({ length: 60 }, (_, i) => '<!-- 새 ' + i + ' -->')).join('\n') + '\n');
  fs.unlinkSync(W('docs/claims/900.lock'));                          /* unclaim */
  fs.writeFileSync(W('docs/review/900-씨앗.md'), '# 1회차\n');
  fs.writeFileSync(W('docs/PROGRESS.md'), TABLE.replace('| – | – | 0/5 | 미착수. |', '| ✅ 완료(2026-09-01) | – | 1/5 | 완료(2026-09-01) |'));
  commitAll(TMP, 'done(900): 정상 회차');
}, {});
ok(C1.code === 0 && /§5 추적 파일 급감 — 빨강 0건/.test(C1.out),
   'C1 정상 회차(제품 편집 · lock 해제 · review 추가 · 표 갱신)는 초록',
   '코드 ' + C1.code + ' · ' + shrinkLine(C1.out));

const C2 = harness((W, TMP) => {
  fs.writeFileSync(W('index.html'), fs.readFileSync(W('index.html'), 'utf8') + '<!-- 내 작업 -->\n');
  commitAll(TMP, 'wip(900): 1회차');
}, { upstreamExtra: W => fs.writeFileSync(W('docs/LESSONS.md'), lessons(LESSONS_N) + lessons(5000)) });
ok(C2.code === 0 && /§5 추적 파일 급감 — 빨강 0건/.test(C2.out),
   'C2 ⚑ 상류가 5,000줄 앞서 있어도 초록 — 기준이 origin/main 이 아니라 merge-base 다',
   '코드 ' + C2.code + ' · ' + shrinkLine(C2.out));

const C3a = harness((W, TMP) => {                                    /* 실측 최댓값 재작성: −124/+115 */
  const t = fs.readFileSync(W('tools/verify900.js'), 'utf8').split('\n');
  fs.writeFileSync(W('tools/verify900.js'), t.slice(0, 176).concat(Array.from({ length: 115 }, (_, i) => '/* 새 자 ' + i + ' */')).join('\n') + '\n');
  commitAll(TMP, 'done(901): 자 재작성');
}, {});
ok(C3a.code === 0, 'C3a 실측 최댓값(−124/+115 = 순삭 9)의 자 재작성은 초록', '코드 ' + C3a.code);
const C3b = harness((W, TMP) => {                                    /* 순삭 60 — 관찰 밴드 */
  const t = fs.readFileSync(W('tools/verify900.js'), 'utf8').split('\n');
  fs.writeFileSync(W('tools/verify900.js'), t.slice(0, 240).join('\n') + '\n');
  commitAll(TMP, 'done(901): 죽은 절 철거');
}, {});
ok(C3b.code === 0 && /관찰 1건/.test(C3b.out) && /tools\/verify900\.js/.test(C3b.out),
   'C3b 실측 최댓값과 문턱 사이(순삭 60)는 **초록이되 조용하지 않다** — «관찰» 로 찍힌다',
   shrinkLine(C3b.out));

const C4 = shQ(ROOT, 'node', VP, '--no-gate');
ok(/§5 추적 파일 급감 — 빨강 0건/.test(C4.out),
   'C4 이 저장소의 실제 작업 트리에서 §5 가 초록이다', shrinkLine(C4.out));

/* ─────────────── [D] 밝히고 지나가기 ─────────────── */
const D1 = harness((W, TMP) => {
  fs.writeFileSync(W('docs/LESSONS.md'), '');
  commitAll(TMP, 'done(903): LESSONS 를 일부러 비운다');
}, { args: ['--allow-shrink', 'docs/LESSONS.md'] });
ok(D1.code === 0 && /--allow-shrink 로 밝혔다/.test(D1.out),
   'D1 밝힌 경로는 «관찰» 로만 찍히고 push 를 막지 않는다', '코드 ' + D1.code + ' · ' + shrinkLine(D1.out));
const D2 = harness((W, TMP) => {
  fs.writeFileSync(W('docs/LESSONS.md'), '');
  fs.writeFileSync(W('index.html'), '');
  commitAll(TMP, 'done(904): 둘 다 비운다');
}, { args: ['--allow-shrink', 'docs/LESSONS.md'] });
ok(D2.code === 1 && /✗ index\.html/.test(D2.out) && !/✗ docs\/LESSONS\.md/.test(D2.out),
   'D2 밝힌 것 하나가 나머지를 면제하지 않는다(한 경로씩만 열린다)', '코드 ' + D2.code);

/* ─────────────── [R] 되돌림 시험 ─────────────── */
const VSRC_R = VSRC.replace(' || shrunk.length)', ')');
ok(VSRC_R !== VSRC, 'R0 되돌림 사본이 실제로 §5 를 종료 코드에서 뺐다');
const R1 = harness((W, TMP) => {
  fs.writeFileSync(W('index.html'), fs.readFileSync(W('index.html'), 'utf8') + '<!-- 이번 작업 -->\n');
  fs.writeFileSync(W('docs/LESSONS.md'), '');
  commitAll(TMP, 'done(684,685): 전투력 알림');
}, { vpSrc: VSRC_R });
ok(R1.code === 0,
   'R1 §5 를 빼면 같은 사고 저장소가 도로 초록이 된다 = 이 자가 실제로 일을 한다',
   '코드 ' + R1.code + '(§5 있으면 ' + B1.code + ')');

console.log('\nverify733: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail + '건' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
