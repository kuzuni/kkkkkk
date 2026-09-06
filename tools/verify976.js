/* 작업 976 — «씬 B 표본이 «틱 직후» 로 쏠린다» 게이트.
 *
 *   node tools/verify976.js          (기본 — 새 방식 실행 + 되돌림 시험 + 재현 자)
 *   node tools/verify976.js --fast   실행 절(§3·§R·§P)을 건너뛰고 소스 래칫만 본다
 *
 * ⚑ **등재문의 갈래 둘은 «반씩» 맞았다**(재현 `tools/probe976.js`, 표본 16개 × 두 사법):
 *   · ⓐ(표본 편향)가 맞는 쪽 — 지금 방식 표본의 **나이 ≤5ms 가 4~7/16** 이다. 알 간격 중앙값이
 *     104~128ms 이므로 고르게 떨어졌다면 **0.8~0.9개**여야 한다 ⇒ 「알이 태어나는 그 순간」에
 *     표본이 붙는 자리가 실재한다.
 *   · 그러나 등재문의 «나이의 최솟값이 **대개** 0~45ms» 는 **정정된다** — 나이 중앙값은 20~39ms 이고
 *     틱 위상은 첫 사분면 0~3/15(고르면 3.75)로 **오히려 늦은 쪽**에 퍼져 있다. 쏠림은 «전부» 가
 *     아니라 «스파이크» 다. 나머지는 ⓑ(제품이 틱마다 한 알을 놓고 앞 알을 걷는다)로 설명된다.
 *
 * 처방 — 얼리는 순간을 **페이지 안에서** 고른다(`PHASE_FREEZE_TALLY`): 다음 틱을 닻으로 잡고
 * 그 알이 `PHASE_MS` (10·40·100·200ms) 만큼 나이를 먹으면 얼린다. 네 장이 알 수명(380ms)을
 * 네 토막으로 덮는다.
 *   ⚠ **«주기의 몇 %» 로 겨누는 길은 막혀 있다** — 이 러너에서 선언 60ms 가 실측 21~652ms 로
 *     흔들려 «주기» 라는 눈금 자체가 매 틱 달라진다(1회차에 해 보고 버렸다).
 *   ⚠ 닻은 **안 옮긴다** — 기다리는 사이 새 틱이 오면 그것이 곧 683 이 보려는 겹침이고,
 *     그 수는 `+틱n` 으로 밝힌다.
 *
 * ⚠ 이 자가 **판정하지 않는 것**: 「알이 몇 개 겹쳐 있어야 하는가」. 그것은 제품의 값이고 683
 *   채점의 축이다(232-①). 하네스가 자기 편한 값을 사양으로 굳히는 순간이 헛초록이다.
 *   그래서 [3] 은 «수명을 고르게 덮었는가» 만 묻고 겹침 수에는 문턱을 안 건다.
 *
 * ⚠ **나이 ≤5ms 를 0 으로 만드는 것도 목표가 아니다** — 10ms 눈금은 일부러 «갓 태어난» 자리를
 *   찍고, 기다리는 사이 새 틱이 오면 그 프레임의 가장 어린 알은 당연히 갓 태어난 알이다.
 *   목표는 «우연히 그 자리에 붙는 것» 이 없어지는 것이고, 그것을 `probe976` [3a] 가 센다.
 *
 * [3]-(가) 기계적 검증 — 소스·stdout 실측 판정이라 비평가를 띄우지 않는다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CAP = path.join(ROOT, 'tools', 'cap683.js');
const PROBE = path.join(ROOT, 'tools', 'probe976.js');
const FAST = process.argv.includes('--fast');

let pass = 0, fail = 0;
const ok = (t, c, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : '  FAIL ') + t + (d ? '  — ' + d : '')); };

const src = fs.readFileSync(CAP, 'utf8');
const fn = name => {
  const i = src.indexOf('async function ' + name + '(');
  if (i < 0) return '';
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return src.slice(i);
};
function run(file, args, ms) {
  try {
    return { out: execFileSync(process.execPath, [file, ...args], { cwd: ROOT, encoding: 'utf8', timeout: ms }), err: '' };
  } catch (e) { return { out: (e.stdout || '') + '', err: String(e.message).slice(0, 160) }; }
}
const line = (out, head) => (out.split('\n').find(l => l.startsWith(head)) || '');
const nums = s => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);

console.log('# VERIFY976 — 씬 B 표본 위상(하네스)');

/* ───────────────────────── [1] 구조 래칫 ───────────────────────── */
console.log('\n[1] 구조 — 표본 시각을 우리가 고르는 자리로 돌아오지 못하게 못박는다');
const phaseMs = (src.match(/const PHASE_MS = \[([^\]]*)\]/) || [])[1];
const ladder = phaseMs ? phaseMs.split(',').map(x => +x.trim()) : [];
ok('[1-a] `PHASE_MS` 눈금이 넷이고 오름차순·서로 다르다', ladder.length === 4
  && ladder.every((v, i) => i === 0 || v > ladder[i - 1]), ladder.join('·') + 'ms');
ok('[1-b] 눈금이 알 수명(380ms) 안을 네 토막으로 덮는다',
  ladder.length === 4 && ladder[0] >= 0 && ladder[3] < 380
  && ladder[1] >= 40 && ladder[2] >= 100 && ladder[3] >= 200,
  '0~40 · 40~100 · 100~200 · 200~380 에 하나씩');
const loop = (fn('sceneB').match(/for \(let i = 0[\s\S]*$/) || [''])[0];
ok('[1-c] 씬 B 프레임 루프가 위상 지정으로 얼린다(`PHASE_FREEZE_TALLY`)',
  /PHASE_FREEZE_TALLY/.test(loop) && /PHASE_MS\[i % PHASE_MS\.length\]/.test(loop), '루프 안');
ok('[1-d] 옛 표본 방식은 **깃발 뒤**(`--b-nophase`)에만 남아 있다',
  /--b-nophase/.test(src) && /NOPHASE\s*\n?\s*\?\s*await p\.evaluate\(FREEZE_TALLY/.test(loop.replace(/\s+/g, m => m)),
  'NOPHASE ? FREEZE_TALLY : PHASE_FREEZE_TALLY');
ok('[1-e] 975 의 구조(한 브라우저·한 홀드)를 안 건드렸다 — 루프 안에 `open(` 이 없다',
  !!loop && !/\bopen\(/.test(loop) && /__capResume/.test(loop), '재사용 유지');
const pft = (src.match(/const PHASE_FREEZE_TALLY = [\s\S]*?\n\}\);/) || [''])[0];
ok('[1-f] 닻을 **안 옮긴다**(겨누는 것은 «그 알의 나이» 지 «마지막 틱으로부터» 가 아니다)',
  /anchor < 0 && T\.at\.length > n0/.test(pft) && /newTicks/.test(pft), 'anchor 한 번 · newTicks 보고');
ok('[1-g] 겨눈 자리를 놓치면 **밝힌다**(조용히 옛 자리로 안 돌아간다)',
  /late: true/.test(pft) && /late/.test(src.slice(src.indexOf('씬 B 표본 위상'))), 'late 표시');
ok('[1-h] 틱을 **두 자**로 적는다(rwSummonFx 훅 ↔ #fxl 관찰자) + 알 탄생 목록',
  /T\.at\.push\(Math\.round\(t0\)\)/.test(src) && /T\.mo\.push\(t\)/.test(src) && /T\.egg\.push\(t\)/.test(src),
  '__tick976 = {at, iv, js, first, mo, egg}');
ok('[1-i] `cap683.js` 는 실행도 되고 require 도 된다(재는 자가 사본을 안 뜬다)',
  /if \(require\.main === module\) main\(\);/.test(src) && /module\.exports = \{[^}]*PHASE_MS/.test(src),
  'require.main 가드 + exports');
let reqOk = false;
try { const m = require(CAP); reqOk = typeof m.open === 'function' && Array.isArray(m.PHASE_MS); } catch (e) {}
ok('[1-j] 실제로 require 해도 브라우저가 안 뜬다(본체가 안 돈다)', reqOk, 'open/PHASE_MS 노출');

/* ───────────────────────── [2] 자기검산 줄 ───────────────────────── */
console.log('\n[2] 자기검산 — 표가 스스로 «위상» 을 적는다(줄이 사라지면 여기서 빨개진다)');
for (const [tag, head] of [['2-a', '씬 B 표본 위상'], ['2-b', '씬 B 알 나이 최솟값']])
  ok('[' + tag + '] 꼬리에 «' + head + '» 줄이 있다', src.includes(head), head);
ok('[2-c] 975 의 다섯 줄을 안 지웠다',
  ['씬 B 실측 t', '씬 B 보유 유물 레벨 합', '씬 B 칸별 레벨', '씬 B 프레임 쌍 화소 차이', '씬 B 페이지 표']
    .every(h => src.includes(h)), '다섯 줄 그대로');
ok('[2-d] 위상 줄이 «겨눈 → 실측» 을 **값으로** 적는다(판정만 적지 않는다)',
  /off \+ '→' \+ ph\[i\]\.ms \+ 'ms'/.test(src), "10→311ms 꼴");

/* ───────────────────────── [3] 행동 ───────────────────────── */
if (!FAST) {
  console.log('\n[3] 행동 — 실제로 돌려 네 장이 어디에 섰는지 본다');
  const r = run(CAP, ['v976', '--scene', 'B'], 420000);
  const ph = line(r.out, '씬 B 표본 위상'), ag = line(r.out, '씬 B 알 나이 최솟값');
  ok('[3-a] 씬 B 가 돌고 네 줄이 찍혔다', !r.err && r.out.split('\n').filter(l => /^\| B[1-4] \|/.test(l)).length === 4,
    r.err || '4줄');
  ok('[3-b] 위상 줄이 겨눈 눈금 넷을 밝힌다', /겨눈 눈금 10·40·100·200ms/.test(ph),
    ph.split(' — ')[1] || '줄 없음');
  /* ⚠ 줄 안에 «—» 가 두 번 나온다(머리말의 것과 판정의 것). 값만 떼려면 «): » 뒤를 읽는다. */
  const seg = (ag.split('): ')[1] || ''), aged = nums(seg.split(' — ')[0]);
  ok('[3-c] 네 장이 **서로 다른 자리**에 섰다(둘이 15ms 안이면 같은 자리다)',
    aged.length === 4 && aged.every((v, i) => aged.every((w, j) => i === j || Math.abs(v - w) > 15)),
    aged.join('·') + 'ms');
  /* ⚠ **한 번의 실행에 «네 토막을 다 덮는다» 를 걸면 안 된다** — 이 러너는 스핀의 `setTimeout` 을
     그 프레임의 렌더 뒤로 밀어서(실측 +25~330ms) 겨눈 값이 위로 흩어진다. 한 실행으로 지킬 수
     있는 것은 «네 장이 한 토막에 뭉치지 않는다» 까지이고, «고르게 덮는다» 는 표본을 12~16개 쓰는
     `probe976` [3c] 가 센다([P-a]). 여기서 4/4 를 요구하면 초록이 러너 기분에 달린다. */
  ok('[3-d] 네 장이 한 토막에 뭉치지 않는다(2/4 이상)', /토막\(0~40·40~100·100~200·200~\) [234]\/4 ✅/.test(ag),
    (ag.split(' — ')[ag.split(' — ').length - 1] || '줄 없음').trim());
  ok('[3-e] 975 의 다섯 판정이 여전히 초록이다(내 변경이 그것을 안 깼다)',
    ['씬 B 실측 t', '씬 B 보유 유물 레벨 합', '씬 B 칸별 레벨', '씬 B 프레임 쌍 화소 차이', '씬 B 페이지 표']
      .every(h => /✅/.test(line(r.out, h))),
    ['실측 t', '레벨 합', '칸별', '화소', '페이지'].filter((h, i) =>
      !/✅/.test(line(r.out, ['씬 B 실측 t', '씬 B 보유 유물 레벨 합', '씬 B 칸별 레벨',
        '씬 B 프레임 쌍 화소 차이', '씬 B 페이지 표'][i]))).join(',') || '다섯 다 ✅');
  ok('[3-f] 콘솔 에러 0건', /콘솔 에러: 0건/.test(r.out),
    (line(r.out, '콘솔 에러') || '줄 없음'));

  /* ─────────────────── [R] 되돌림 시험 ─────────────────── */
  console.log('\n[R] 되돌림 — `--b-nophase` 로 표본 시각을 975 자리로 되돌리면 위상 축이 사라진다');
  const g = run(CAP, ['v976rev', '--scene', 'B', '--b-nophase'], 420000);
  const gph = line(g.out, '씬 B 표본 위상');
  ok('[R-a] 옛 표본 방식 사본도 실행은 된다(실패로 빨개지는 자를 만들지 않았다)',
    !g.err && /^\| B4 \|/m.test(g.out), g.err || '4줄');
  ok('[R-b] 되돌리면 «겨눈 눈금 없음» 이 찍힌다 — 위상을 고른 흔적이 사라진다',
    /겨눈 눈금 없음\(--b-nophase/.test(gph) && /겨눔 없음/.test(gph),
    (gph.split(' — ')[1] || '줄 없음'));
  ok('[R-c] 새 방식만 겨눈 눈금을 적는다(둘이 실제로 다른 자를 쓴다)',
    /겨눈 눈금 10·40·100·200ms/.test(ph) && !/겨눈 눈금 10·40·100·200ms/.test(gph), '새 ✅ ↔ 옛 없음');

  /* ─────────────────── [P] 재현 자 ─────────────────── */
  console.log('\n[P] 재현 — 두 사법을 같은 실행에서 견주는 자(probe976)');
  const pr = run(PROBE, ['--n', '12', '--no-shot'], 420000);
  ok('[P-a] `probe976` 이 통과한다(스파이크 재현 + 위상 지정이 그것을 설명한다)',
    /PROBE976 PASS/.test(pr.out), (pr.out.match(/PROBE976 \w+ — \d+\/\d+/) || [pr.err || '못 돌았다'])[0]);
  ok('[P-b] 재현이 «지금 방식의 나이 ≤5ms» 수를 값으로 적는다',
    /나이 ≤5ms 가 \d+\/\d+/.test(pr.out), (pr.out.match(/나이 ≤5ms 가 \d+\/\d+[^*]*/) || [''])[0].trim().slice(0, 80));
}

console.log('\nVERIFY976 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail)
  + (FAST ? ' (--fast · 실행 절 건너뜀)' : ''));
process.exit(fail ? 1 : 0);
