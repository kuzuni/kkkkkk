/* 작업 975 — «`tools/cap683.js` 씬 B 가 ① 을 원리적으로 못 보여 준다» 게이트.
 *
 *   node tools/verify975.js            (기본 — 새 방식 실행 + 되돌림 시험까지)
 *   node tools/verify975.js --fast     되돌림 시험(§R · 브라우저 4개)만 건너뛴다
 *
 * ⚑ 등재문의 진단은 그대로 맞았다 — 재현(수리 전 `cap683.js r975pre`)이 세 가지를 한 번에 찍었다:
 *   · 「실측 t」가 **2597 → 1787 → 1775 → 1626** 으로 **거꾸로** 간다(네 번의 독립 실행이라 서로 무관).
 *   · 「보유 레벨 합」이 **15 → 15 → 15 → 15** — 한 홀드라면 있을 수 없다(합만 보는 줄은 이것을 «그럴듯»
 *     하다고 읽었다. 그것이 등재문이 말한 «자기검산 줄이 그것을 못 잡는다» 다).
 *   · 용의 심장 카드 상자 22,801px 에서 **B1↔B2 차이 0화소** — 두 장이 화소까지 같다.
 *
 * 처방(등재문 방향 그대로) — 씬 B 를 **한 번의 `open()`** 안에서 찍는다. 5회차가 이 길을 포기했던
 * 이유(«얼리면 페이지가 죽고, 안 얼리면 표와 그림이 어긋난다»)는 **되돌릴 수 있는 얼림**으로 없앴다:
 * 타이머를 지우는 대신 미루고(`__capFreeze`/`__capResume`), 시계는 얼어 있는 만큼 빼고, 뛰던 애니만
 * pause 했다 play 한다. 그래서 프레임마다 「얼림 → 표 → 스크린샷 → 녹임」 이 되고 홀드는 이어진다.
 *
 * ⚠ 이 자가 지키는 것 넷:
 *   [1] 구조 래칫 — 씬 B 가 다시 «프레임마다 새 브라우저» 로 못 돌아간다(`open(` 호출 자리를 센다).
 *   [2] 자기검산 — 꼬리 줄이 «합» 하나가 아니라 **페이지 표 · 실측 t · 칸별 레벨 · 화소 동일** 넷이다.
 *   [3] 행동 — 실제로 돌려 네 프레임이 **한 페이지 · 시각 증가 · 레벨 비감소 · 화소 동일 0쌍** 인지 본다.
 *   [R] 되돌림 시험 — `--b-legacy`(옛 방식)로 돌리면 그 판정이 **실제로 빨개진다**(자가 무를지 않았다).
 *
 * ⚠ 「나이(ms)」 열은 **있는가**만 판정한다 — «두 세대가 겹쳐 있는가» 는 제품(683)의 채점 축이지
 *   이 하네스의 약속이 아니다. 하네스가 자기 편한 값을 «사양» 으로 굳히면 그것이 곧 헛초록이다.
 *
 * [3]-(가) 기계적 검증 — 소스·stdout 실측 판정이라 비평가를 띄우지 않는다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CAP = path.join(ROOT, 'tools', 'cap683.js');
const FAST = process.argv.includes('--fast');

let pass = 0, fail = 0;
const ok = (t, c, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : '  FAIL ') + t + (d ? '  — ' + d : '')); };

const src = fs.readFileSync(CAP, 'utf8');
const fn = name => {                 /* 함수 하나의 본문만 잘라 온다(중괄호 깊이) */
  const i = src.indexOf('async function ' + name + '(');
  if (i < 0) return '';
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return src.slice(i);
};

function run(args, ms) {
  try {
    return { out: execFileSync(process.execPath, [CAP, ...args], { cwd: ROOT, encoding: 'utf8', timeout: ms }), err: '' };
  } catch (e) { return { out: (e.stdout || '') + '', err: String(e.message).slice(0, 160) }; }
}

/* 꼬리 줄을 읽는다 — 표가 스스로 내는 판정을 자가 되풀이해 세지 않고 **그 줄을 본다**
   (줄이 사라지면 여기서 빨개진다 = 자기검산 줄 자체가 래칫이다). */
const line = (out, head) => (out.split('\n').find(l => l.startsWith(head)) || '');

(async () => {
  console.log('[1] 구조 — 씬 B 는 한 번만 연다');
  const sb = fn('sceneB'), sl = fn('sceneBLegacy');
  ok('[1-a] `sceneB()` 가 있다', !!sb, sb ? sb.length + '자' : '없음');
  ok('[1-b] `sceneB()` 의 `open(` 호출은 **1회**뿐이다', (sb.match(/\bopen\(/g) || []).length === 1,
    (sb.match(/\bopen\(/g) || []).length + '회');
  const loop = (sb.match(/for \(let i = 0; i < HOLDS\.length; i\+\+\) \{[\s\S]*$/) || [''])[0];
  ok('[1-c] 프레임 루프 **안**에는 `open(` 이 없다(= 브라우저 재사용)', !!loop && !/\bopen\(/.test(loop),
    loop ? '루프 ' + loop.length + '자' : '루프 못 찾음');
  ok('[1-d] 루프가 얼렸다 **녹인다**(`__capResume`) — 한 번 얼리고 끝나면 홀드가 죽는다',
    /__capResume/.test(loop), /__capResume/.test(loop) ? '있음' : '없음');
  ok('[1-e] 옛 방식은 **깃발 뒤**(`--b-legacy`)에만 남아 있다', /--b-legacy/.test(src) && !!sl && /LEGACY_B \?/.test(src),
    sl ? '되돌림 시험용으로 보존' : '없음');
  ok('[1-f] 얼림이 «지우는» 것이 아니라 «미루는» 것이다(되돌릴 수 있다)',
    /window\.__capFreeze = function/.test(src) && /window\.__capResume = function/.test(src)
      && /remap/.test(src), '__capFreeze/__capResume/remap');

  console.log('\n[2] 자기검산 줄 — 「합」 하나가 아니다');
  for (const [tag, head] of [['2-a', '씬 B 페이지 표'], ['2-b', '씬 B 실측 t'],
                             ['2-c', '씬 B 보유 유물 레벨 합'], ['2-d', '씬 B 칸별 레벨'],
                             ['2-e', '씬 B 프레임 쌍 화소 차이']])
    ok('[' + tag + '] 꼬리에 «' + head + '» 줄이 있다', src.includes(head), head);
  ok('[2-f] 표 머리글에 «나이(ms)» 칸이 있다', /\| 획득 알 \| 나이\(ms\) \|/.test(src), '머리글');
  const head = (src.match(/'\| # \| t\(ms\)[^']*'/) || [''])[0];
  const sep = (src.match(/'\|---\|[-|]*'/) || [''])[0];
  ok('[2-g] 머리글 칸 수 = 구분선 칸 수 (753 정정 — 차례가 어긋나면 표가 거짓을 읽힌다)',
    !!head && head.split('|').length === sep.split('|').length,
    head.split('|').length - 2 + '칸 ↔ ' + (sep.split('|').length - 2) + '칸');

  console.log('\n[3] 실제로 돌려 본다 — 새 방식(씬 B · 브라우저 1개)');
  const r = run(['v975', '--scene', 'B'], 900000);
  ok('[3-a] 실행이 끝난다', !r.err, r.err || '정상');
  const rows = r.out.split('\n').filter(l => /^\| B[1-4] \|/.test(l));
  ok('[3-b] B 프레임이 4장 찍혔다', rows.length === 4, rows.length + '장');
  const pgL = line(r.out, '씬 B 페이지 표');
  ok('[3-c] **네 프레임이 한 페이지**다 = 한 홀드(값으로 추정하지 않고 표로 못박는다)',
    /한 홀드 ✅/.test(pgL), pgL.replace('씬 B 페이지 표(한 홀드 = 넷이 같아야 한다): ', '') || '줄 없음');
  const atL = line(r.out, '씬 B 실측 t');
  ok('[3-d] 실측 t 가 증가한다', /증가 ✅/.test(atL), atL.split(': ')[1] || '줄 없음');
  const sumL = line(r.out, '씬 B 보유 유물 레벨 합');
  ok('[3-e] 보유 레벨 합이 단조 증가한다(홀드가 실제로 돌았다)', /단조 증가 ✅/.test(sumL),
    sumL.split(': ')[1] || '줄 없음');
  const lvL = line(r.out, '씬 B 칸별 레벨');
  ok('[3-f] 칸별 레벨이 한 칸도 안 줄었다(CO 가 잡은 지문의 역)', /감소 0칸 ✅/.test(lvL),
    (lvL.split(' — ')[1] || '줄 없음'));
  const pxL = line(r.out, '씬 B 프레임 쌍 화소 차이');
  ok('[3-g] 프레임 쌍 중 **화소까지 같은 쌍이 0** 이다(등재 975 의 얼굴)', /픽셀 동일 0쌍 ✅/.test(pxL),
    (pxL.split(' — ')[1] || '줄 없음'));
  const ages = rows.map(l => l.split('|')[6].trim());
  ok('[3-h] 「나이(ms)」 열이 채워진다(태어난 시각 스탬프가 붙는다 · «?» 0건)',
    ages.length === 4 && ages.every(a => a && !a.includes('?')), ages.join(' / ') || '없음');
  /* ⚑ 753 정정의 본체는 «소스가 몇 칸을 적었나» 가 아니라 «찍힌 표의 머리글과 줄이 같은 칸인가» 다 —
     그러니 소스 무늬가 아니라 **실제로 찍힌 표**를 센다. */
  const outHead = (r.out.split('\n').find(l => l.startsWith('| # | t(ms)')) || '');
  ok('[3-k] 찍힌 표의 머리글 칸 = 줄 칸 (머리글과 줄이 어긋나면 표가 거짓을 읽힌다)',
    !!outHead && rows.length === 4 && rows.every(l => l.split('|').length === outHead.split('|').length),
    (outHead.split('|').length - 2) + '칸 ↔ ' + (rows[0] ? rows[0].split('|').length - 2 : '?') + '칸');
  ok('[3-i] 콘솔 에러 0건', /콘솔 에러: 0건/.test(r.out),
    line(r.out, '콘솔 에러').split(': ')[1] || '줄 없음');
  ok('[3-j] 봉투 줄이 «브라우저 1회» 라고 적는다', /씬 B 봉투: 브라우저 1회/.test(r.out),
    (line(r.out, '씬 B 봉투').split(': ')[1] || '줄 없음'));

  if (FAST) console.log('\n[R] 되돌림 시험 — --fast 라 건너뜀(⚠ 이 실행은 래칫의 절반만 지킨다)');
  else {
    console.log('\n[R] 되돌림 시험 — 옛 방식(`--b-legacy`)이면 판정이 실제로 빨개진다');
    const g = run(['v975r', '--scene', 'B', '--b-legacy'], 1200000);
    ok('[R-a] 옛 방식 사본도 실행은 된다(실패로 빨개지는 자를 만들지 않았다)', !g.err && /^\| B4 \|/m.test(g.out),
      g.err || 'B 4장');
    const gp = line(g.out, '씬 B 페이지 표');
    ok('[R-b] 옛 방식은 **네 프레임이 서로 다른 페이지**다 = 한 홀드가 아니다',
      /서로 다른 실행 4개 ❌/.test(gp), (gp.split(' — ')[1] || '줄 없음'));
    ok('[R-c] 그래서 [3-c] 의 판정이 **뒤집힌다**(자가 실제로 그 차이를 잡는다)',
      /한 홀드 ✅/.test(pgL) && !/한 홀드 ✅/.test(gp), '새 ✅ ↔ 옛 ❌');
    ok('[R-d] 옛 방식은 브라우저를 4회 연다', /씬 B 봉투: 브라우저 4회/.test(g.out),
      (line(g.out, '씬 B 봉투').split(': ')[1] || '줄 없음'));
    /* ⚠ 실측 t·레벨·화소 셋은 옛 방식에서 «대개» 빨갛지만 실행마다 흔들린다(독립 실행 넷의 순서 문제라
       우연히 증가로 보일 수 있다) — 그래서 **개수만** 센다. 하나도 안 빨가면 그때는 이 자가 무른 것이다. */
    const reds = [line(g.out, '씬 B 실측 t'), line(g.out, '씬 B 보유 유물 레벨 합'),
                  line(g.out, '씬 B 칸별 레벨')].filter(l => /❌/.test(l)).length;
    ok('[R-e] 옛 방식에서 값 판정(실측 t · 합 · 칸별) 중 **하나 이상**이 빨갛다', reds >= 1, reds + '/3 빨강');
  }

  console.log('\nVERIFY975 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
