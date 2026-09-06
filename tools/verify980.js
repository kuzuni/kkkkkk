/* 작업 980 — «`tools/cap683.js` 의 A8 은 «정착» 이 아니다» 게이트.
 *
 *   node tools/verify980.js            전부
 *   node tools/verify980.js --fast     §R(되돌림 시험)만 건너뛴다 ⚠ 래칫의 절반만 지킨다
 *
 * 지시서 [3]-**(가)** — 소스·stdout 실측 판정이라 비평가 없음.
 *
 * 등재문(683 11회차 비평가 CQ)의 진단은 **확인됐고 수치는 정정됐다**(`probe980`):
 *   ⓐ A8(340ms)에는 불투명도 1 짜리 `.fx-keep`(795 라벨 패치)가 당첨 카드를 덮고 있다 — 확인.
 *      정답표가 그것을 못 본 이유는 세는 갈래(획득·지불·플래시·구슬·글자) **어디에도 없었기** 때문이다.
 *   ⓑ 다만 그 패치의 **화소 무게는 33px(0.11%)** 이지 등재문의 9,728px 이 아니다(패치는 라벨을
 *      제자리에 다시 그린다). 등재문의 수치는 A8↔**B3** = «다른 상태의 두 프레임» 이었다.
 *   ⓒ **더 큰 뿌리는 기준선 자신**이었다 — `baseline()` 이 «소환 **전**» 별개 페이지라 당첨 칸이
 *      미보유(회색 `.off`)다. 소환 전 89px ↔ 소환 뒤 «연출 0» 7,305px ⇒ Δ(A8) 7,205px 이 통째로
 *      «칸이 켜졌다» 였다(참값 −14px). 브리핑의 «파티클 몫 ≈ Δ − 8000» 손 상수가 그 8,000 이다.
 *   ⓓ 곁가지로 **첫 스크린샷이 정착이 아니다** — `#fxl` 이 합성 레이어라 `finish()`/`currentTime` 이
 *      한 프레임 늦게 그려진다(알 0 인 프레임에서도 +740~770px = 카드 `.fx-hit` 팝 몫 7,293×(1.05²−1)).
 *
 * 이 자가 지키는 것:
 *   [1] 구조 — 기준선이 «프레임마다 뜬 쌍둥이» 이고, 숨기기가 `visibility`(비파괴)이며, 예열이 있고,
 *       표가 `.fx-keep` 를 센다.
 *   [2] 자기검산 줄 — 꼬리 세 줄(기준선 · 예열 · 씬 A 마지막 눈금)이 있다.
 *   [3] 행동 — 실제로 씬 A 를 돌려 판정·값·파일을 확인한다.
 *   [R] 되돌림 — `--twin-legacy` 로 옛 기준선을 되살리면 Δ(A8)가 **7,000px 대로 되돌아간다**.
 *
 * ⚑⚑ **987 (2026-09-06) — [3-h] 의 과녁을 옮겼다(986 준용).** 종전 [3-h] 는 예열 줄의 Δ 에
 *   «8 중 **6 이상**에서 첫 장 ≠ 둘째 장» 이라는 문턱을 걸고 있었다. 그 Δ 는 이 자가 «고른» 값이
 *   아니라 러너에게 «받은» 값이라(984-①) **0px 도 정상**이고, `cap683.js` 200행 그날 표는 이미
 *   8 중 1 을 0 으로 찍어 여유가 한 칸뿐이었다 — 즉 **버리기로 한 값에 문턱을 걸어 러너가 우리 대신
 *   채점하던 자리**다(986 과 같은 병 · 자리만 다름). ⇒ 판정 둘로 갈랐다:
 *     [3-h]  «예열을 **실제로 지났는가**» — 여덟 칸이 다 있고 `-1`(예열 없음)이 아니다.
 *            되돌림은 §R [R-d] 다(`--twin-legacy` 는 예열을 안 하므로 이 항이 곧바로 빨개진다).
 *     [3-h2] «그 값에 **판정 표지가 없는가**» — 소스 래칫(986 [6-a] 꼴). 조용히 버려도, 다시
 *            채점해도 빨갛다. ⚠ 문턱을 6 → 1 로 «내리는» 길은 헛초록이다(LESSONS 334).
 *   Δ 자체는 `info` 관찰 줄로 계속 찍는다 — 조용히 버리면 다음 세션이 같은 것을 다시 배운다(980-④).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CAP = path.join(ROOT, 'tools', 'cap683.js');
const OUT = path.join(ROOT, 'docs', 'shots');
const src = fs.readFileSync(CAP, 'utf8');
const FAST = process.argv.includes('--fast');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
/* 관찰 — 점수에 안 들어간다(987 · 984-① «고른 값 ↔ 받은 값»). 값은 찍되 판정은 안 한다:
   조용히 버리면 다음 세션이 같은 것을 다시 배운다(980-④). */
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined && d !== '' ? '  [' + d + ']' : ''));

const fn = name => {                 /* 함수 하나의 본문만 잘라 온다(중괄호 깊이 · 975 와 같은 자) */
  const i = src.indexOf('async function ' + name + '(');
  if (i < 0) return '';
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return src.slice(i);
};
function run(args, ms) {
  try { return { out: execFileSync(process.execPath, [CAP, ...args], { cwd: ROOT, encoding: 'utf8', timeout: ms }), err: '' }; }
  catch (e) { return { out: (e.stdout || '') + '', err: String(e.message).slice(0, 160) }; }
}
const line = (out, head) => (out.split('\n').find(l => l.startsWith(head)) || '');
const num = s => { const m = /-?\d+/.exec(s || ''); return m ? +m[0] : NaN; };

(async () => {
  console.log('[1] 구조 — 기준선은 «그 프레임 자신의 쌍둥이» 다');
  const twin = fn('twinPx'), warm = fn('warmPx'), shotA = fn('shotA'), frame = fn('frame');
  ok(!!twin, '[1-a] `twinPx()` 가 있다', twin ? twin.length + '자' : '없음');
  ok(/style\.visibility\s*=\s*'hidden'/.test(twin),
     '[1-b] 숨기기는 **`visibility`** 다 — `display:none` 은 렌더 트리에서 빼며 CSS 애니를 **취소**하고, '
     + '되살아날 때 t=0 부터 다시 돌아 그 프레임을 통째로 바꾼다(`probe980` 실측 19,254px)',
     /visibility/.test(twin) ? 'visibility' : (/display/.test(twin) ? '**display**' : '없음'));
  ok(!/style\.display\s*=\s*'none'/.test(twin), '[1-c] 그 자리에 `display:none` 이 **없다**', '없음');
  ok(/style\.visibility\s*=\s*q/.test(twin) || /visibility\s*=\s*prev/.test(twin),
     '[1-d] 쌍둥이를 뜬 뒤 **원래 값을 되돌린다**(재는 행위가 재는 대상을 안 바꾼다)', '복원 있음');
  ok(!!warm && /return -1/.test(warm), '[1-e] `warmPx()`(예열 · 버리는 첫 장)가 있다', warm ? '있음' : '없음');
  ok(/await warmPx\(/.test(shotA) && /await twinPx\(/.test(shotA),
     '[1-f] 씬 A 가 «예열 → 프레임 → 쌍둥이» 세 장을 뜬다', 'shotA');
  ok(/await warmPx\(/.test(frame) && /await twinPx\(/.test(frame),
     '[1-g] 씬 B 도 같은 셋을 뜬다(옛 기준선은 B 에서도 같은 오염을 안고 있었다)', 'frame');
  ok(/r\.dpx =[\s\S]{0,220}r\.px - r\.px0/.test(src),
     '[1-h] Δ = (프레임 − **그 프레임의 쌍둥이**) 다', '`r.px - r.px0`');
  ok(/keep = L\.filter\(n => \/fx-keep\/\.test\(cls\(n\)\)\)/.test(src) && /keepOn/.test(src),
     '[1-i] 표가 **여섯째 갈래 `.fx-keep`** 를 센다 — 표가 못 보는 갈래는 «없는 것» 이 된다',
     '`keep`·`keepOn`');
  ok(/--twin-legacy/.test(src) && /TWIN_LEGACY \?/.test(src),
     '[1-j] 옛 방식은 **깃발 뒤**(`--twin-legacy`)에만 남아 있다(975 `--b-legacy` 와 같은 꼴)', '깃발');

  console.log('\n[2] 자기검산 줄 — 표가 스스로 «이 프레임은 정착이 아니다» 라고 말한다');
  for (const [tag, head] of [['2-a', '기준선(프레임마다 뜬 «연출 0» 쌍둥이'],
                             ['2-b', '예열(버린 첫 장'],
                             ['2-c', '씬 A 마지막 눈금'],
                             ['2-d', '**찍힌 잉크 Δpx** 의 부호(980)']])
    ok(src.includes(head), '[' + tag + '] 꼬리에 «' + head + '…» 줄이 있다', head);
  ok(/\| 플래시 \| 패치 \|/.test(src), '[2-e] 표 머리글에 «패치» 칸이 있다', '머리글');
  const head = (src.match(/'\| # \| t\(ms\)[^']*'/) || [''])[0];
  const sep = (src.match(/'\|---\|[-|]*'/) || [''])[0];
  ok(!!head && head.split('|').length === sep.split('|').length,
     '[2-f] 머리글 칸 수 = 구분선 칸 수 (753 정정 — 차례가 어긋나면 표가 거짓을 읽힌다)',
     (head.split('|').length - 2) + '칸 ↔ ' + (sep.split('|').length - 2) + '칸');

  console.log('\n[3] 실제로 돌려 본다 — 씬 A (새 방식)');
  const R = 'v980';
  const r = run([R, '--scene', 'A'], 900000);
  ok(!r.err, '[3-a] 실행이 끝난다', r.err || '정상');
  const rows = r.out.split('\n').filter(l => /^\| A[1-8] \|/.test(l));
  ok(rows.length === 8, '[3-b] A 프레임이 8장 찍혔다', rows.length + '장');
  const hl = r.out.split('\n').find(l => l.startsWith('| # |')) || '';
  ok(!!hl && rows.length > 0 && hl.split('|').length === rows[0].split('|').length,
     '[3-c] 찍힌 표의 머리글 칸 = 줄 칸', (hl.split('|').length - 2) + '칸 ↔ ' + ((rows[0] || '').split('|').length - 2) + '칸');
  const setL = line(r.out, '씬 A 마지막 눈금');
  ok(/정착 아님 ❌/.test(setL),
     '[3-d] **표가 스스로 «A8 은 정착이 아니다» 라고 말한다** — 브리핑이 그 프레임을 기준 프레임으로 '
     + '적어 온 자리다(등재 980 의 얼굴)', setL.split(': ')[1] || '줄 없음');
  ok(/남은 패치 1개\(그 중 당첨 카드를 덮는 것 1개\)/.test(setL),
     '[3-e] 그 줄이 «무엇이» 남았는지까지 적는다(패치 1개 · 카드를 덮는 것 1개)', setL.slice(0, 90));
  const dA8 = (() => { const l = rows[7] || ''; const c = l.split('|').map(x => x.trim()); return +c[13]; })();
  ok(Number.isFinite(dA8) && Math.abs(dA8) <= 200,
     '[3-f] Δ(A8) 가 **0 언저리**다 — 연출이 거의 없는 프레임이 «연출이 더한 잉크» 열에서 크면 그 열이 거짓이다',
     'Δ(A8) = ' + dA8 + 'px');
  const baseL = line(r.out, '기준선(프레임마다');
  const bv = (baseL.split(': ')[1] || '').trim().split(' · ').map(x => +x.split(' ')[1]);
  ok(bv.length === 8 && bv.every(v => Number.isFinite(v) && v === bv[0]),
     '[3-g] 씬 A 는 여덟 장이 **같은 상태**라 쌍둥이 값도 여덟이 같다(자기검산)',
     bv.join('·'));
  const warmL = line(r.out, '예열(버린 첫 장');
  const wpairs = (warmL.split(': ')[1] || '').trim().split(' · ')
    .map(x => x.split(' ')[1]).map(x => (x || '').split('→').map(Number));
  /* ⚑⚑ 987 — **문턱을 걷었다.** 종전 [3-h] 는 «8 중 6 이상에서 첫 장 ≠ 둘째 장» 이었는데,
     그 Δ 는 이 자가 «고른» 값이 아니라 러너에게 «받은» 값이다(984-①): `#fxl` 이 합성 레이어라
     첫 장이 몇 프레임 늦게 그려지느냐가 판마다 다르고(986 실측 0·0·0·525·428·252px),
     `cap683.js` 200행의 그날 표는 이미 **8 중 1**(T=40 `5,994→5,994`)을 0 으로 찍었다.
     ⇒ 판정은 «예열을 **실제로 지났는가**»(값이 있고 `-1` 이 아니다)로 옮기고 Δ 는 **관찰**로 내린다.
     ⚠ 문턱을 6 → 1 로 «내리는» 길은 헛초록이다(LESSONS 334) — 한 프레임만 늦어도 통과가 되어
     예열의 뜻이 사라진다. 되돌림은 §R [R-d](`--twin-legacy` = 예열 없음 ⇒ 이 항이 빨개진다). */
  /* ⚠ 판정에는 **개수만** 넘긴다 — 값을 담은 그릇(`wpairs`)은 판정 줄에 못 닿게 한다([3-h2] 가 그것을 센다). */
  const wcount = wpairs.length;
  const warmed = wpairs.filter(q => q.length === 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]) && q[0] !== -1).length;
  ok(wcount === 8 && warmed === 8,
     '[3-h] **여덟 장이 모두 예열을 실제로 지났다** — 예열 줄이 프레임마다 «첫 장 → 둘째 장» 두 수를 다 적고 '
     + '`-1`(예열 없음)이 아니다. 재는 장은 «버린 뒤» 의 장이다',
     warmed + '/' + wcount + ' 프레임이 예열을 지났다');
  const wdelta = wpairs.map((q, i) => 'A' + (i + 1) + ' ' + (q[0] - q[1]) + 'px');   /* 관찰 — 판정 아님(987) */
  info('[3-h·값] 버린 첫 장 − 쓴 둘째 장 **(값 · 판정 아님)**', wdelta.join(' · ')
     + ' — **0px 도 정상이다**(안 늦게 그려진 판) · 0 이 아닌 판의 값도 «정착 잉크 ×(1.05²−1)» 언저리일 '
     + '이유가 없다(팝이 도는 중이라 배율이 1.0~1.05 사이 어디든 · 986 §1)');
  /* [3-h2] 소스 래칫(986 [6-a] · 984 [2-e] 꼴) — «버린 몫» 이 다시 판정 자리로 기어들면 빨개진다.
     세 이름(값을 담은 그릇 · 관찰 줄 · 옛 문턱 변수)을 **판정 줄(`ok(`) 안에 적으면** 그 순간 빨갛다.
     판정에 필요한 것은 «몇 장이 예열을 지났나» 라는 **개수**뿐이고 그건 위 두 상수가 들고 있다. */
  const self = fs.readFileSync(__filename, 'utf8').split('\n');
  const headOf = i => { for (let j = i; j >= 0; j--) { const t = self[j].trim();
    if (/^(ok|info|const|let|var|return|if|for|console)\b/.test(t)) return t; } return ''; };
  const dLine = i => /\b(wpairs|wdelta|wdiff)\b/.test(self[i]) && !/^\s*[*/]/.test(self[i].trim());
  const dUse = self.map((l, i) => i).filter(dLine);
  const dJudge = dUse.filter(i => /^ok\(/.test(headOf(i)));
  ok(dUse.length > 0 && dJudge.length === 0,
     '[3-h2] **그 값에는 판정 표지가 없다**(소스 래칫) — 버린 몫은 `info` 로 «적히기만» 한다. '
     + '조용히 버려도(사용처 0곳) 다시 채점해도(판정 줄 ≥ 1곳) 빨개진다',
     '버린 몫 사용처 ' + dUse.length + '곳 · 그 중 판정 줄 ' + dJudge.length + '곳');
  ok(fs.existsSync(path.join(OUT, '683-' + R + '-Asettle.png')),
     '[3-i] 진짜 정착 프레임이 파일로 남는다(비평가가 눈으로 대조할 기준 프레임)',
     '683-' + R + '-Asettle.png');
  ok(/콘솔 에러: 0건/.test(r.out), '[3-j] 콘솔 에러 0건', line(r.out, '콘솔 에러').trim());

  if (FAST) console.log('\n[R] 되돌림 시험 — --fast 라 건너뜀(⚠ 이 실행은 래칫의 절반만 지킨다)');
  else {
    console.log('\n[R] 되돌림 시험 — `--twin-legacy` 로 옛 기준선을 되살리면 결함이 되돌아온다');
    const g = run(['v980r', '--scene', 'A', '--twin-legacy'], 900000);
    ok(!g.err && /^\| A8 \|/m.test(g.out), '[R-a] 옛 방식 사본도 실행은 된다(실패로 빨개지는 자를 만들지 않았다)',
       g.err || 'A8 있음');
    ok(/기준선\(--twin-legacy · 옛 방식 = 소환 \*\*전\*\* 별개 페이지/.test(g.out),
       '[R-b] 그 실행은 기준선이 «소환 전 별개 페이지» 라고 스스로 밝힌다', '옛 기준선 줄');
    const gRows = g.out.split('\n').filter(l => /^\| A[1-8] \|/.test(l));
    const gA8 = (() => { const c = (gRows[7] || '').split('|').map(x => x.trim()); return +c[13]; })();
    ok(Number.isFinite(gA8) && gA8 > 5000,
       '[R-c] **판정이 뒤집힌다** — 옛 기준선이면 Δ(A8)가 7,000px 대로 되돌아간다(브리핑의 «Δ − 8000» 손 상수의 정체)',
       '옛 Δ(A8) = ' + gA8 + 'px ↔ 새 Δ(A8) = ' + dA8 + 'px');
    ok(/A1 -1→/.test(line(g.out, '예열(버린 첫 장')),
       '[R-d] 그 실행은 예열도 안 한다(첫 장을 그대로 쓴다) — 예열 열이 `-1` 로 그것을 밝힌다',
       (line(g.out, '예열(버린 첫 장').split(': ')[1] || '').slice(0, 40));
    const gSet = line(g.out, '씬 A 마지막 눈금');
    ok(/정착 아님 ❌/.test(gSet),
       '[R-e] 남은 패치 판정은 **기준선과 무관**하다 — 옛 방식에서도 «정착 아님» 이다(패치는 제품의 것이고 '
       + '이 판정은 그것을 보는 눈이다)', gSet.split(': ')[1] || '줄 없음');
  }

  console.log('\nVERIFY980 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(String(e && e.stack || e).split('\n').slice(0, 4).join('\n')); process.exit(1); });
