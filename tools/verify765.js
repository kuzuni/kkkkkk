/* 작업 765 게이트 — «`fnchk92` 의 고정 5통 상수» 수리가 무르지 않음을 못박는다.
   실행: node tools/verify765.js

   등재문(PROGRESS 765): `tools/fnchk92.js` 가 69 우편함 첫 진입을 «고정 5통» 으로 전제하는데
   180(월별 다이아)이 부팅 정산에서 한 통을 더 넣어 실제로는 6행이고, [일괄 읽기&수령] 다이아가
   Δ220,000(자의 기대 120,000 — 차 100,000 = `MONTHLY_DIA`)이다. **제품은 옳고 자가 부패했다**
   (697 세션이 수리 전 커밋 `3eeba15` 로 대조해 같은 10/13 을 받아 두었다).

   ⚑ 이 자가 지키는 것은 «13/13» 이 아니라 **«그 13/13 이 헛초록이 아니다»** 다.
      기대값을 런타임 파생으로 바꾸는 처방(185-①)은 잘못 쓰면 **제품에게 답을 묻고 그 답을 채점하는**
      꼴이 되어 무엇이 깨져도 초록이 된다. 그래서 자는 재료(`MAILS` + `S.mailx`)에서 **스스로** 세고,
      여기 §R 이 제품을 실제로 부순 사본을 먹여 «그때는 빨개지는가» 를 확인한다.

   절:
     §1 구조 — 자가 고정 5통 세계로 되돌아가지 않았는가(소스 단언)
     §2 초록 — 현재 트리에서 13/13 이고, 표가 실제로 동적 우편(x…)을 보고 있는가
     §R 되돌림 시험 — 제품을 부순 사본 셋을 먹인다
        R1 `mailList()` 가 동적 우편을 흘린다        → 빨강이어야 한다(첫 진입)
        R2 `claimAllMail()` 이 동적 우편을 건너뛴다  → 빨강이어야 한다(일괄 읽기&수령)
        R3 180 월별 정산을 끈 «5통 세계»            → **초록**이어야 한다
           (= 달이 바뀌어 월별 통이 생겼다 없어졌다 해도 자가 안 흔들린다 — 등재문이 «날짜 의존
             플레이키라 더 나쁘다» 로 지목한 바로 그 축이다) */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FN = path.join(ROOT, 'tools/fnchk92.js');
const IDX = path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (tag, cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${tag} ${msg}`); } else { fail++; console.log(`  ❌ ${tag} ${msg}`); } };

/* ── 자를 한 번 돌려 표를 돌려준다. src 가 있으면 그 사본을 물린다(FN92_SRC). ── */
function runFn(src) {
  const env = { ...process.env };
  if (src) env.FN92_SRC = src;
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [FN], { cwd: ROOT, env, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status == null ? -1 : e.status;
    out = (e.stdout || '') + (e.stderr || '');
  }
  const m = out.match(/FNCHK92 (PASS|FAIL) (\d+)\/(\d+)/);
  const rowRed = (label) => out.split('\n')
    .filter((l) => l.startsWith('| ' + label + ' |'))
    .some((l) => l.trim().endsWith('❌ |'));
  return { out, code, verdict: m && m[1], got: m && +m[2], tot: m && +m[3], rowRed };
}

/* 사본을 저장소 루트에 둔다 — index.html 이 assets/** 를 상대 경로로 물어 /tmp 에서는 통째로 404 다
   (360·367·438·439·453·467·471·541 선례). 이름에 pid 를 섞어 병렬 실행끼리 안 밟는다(646 처방). */
const made = [];
function inject(tag, edits) {
  let html = fs.readFileSync(IDX, 'utf8');
  for (const [from, to] of edits) {
    const n = html.split(from).length - 1;
    if (n !== 1) throw new Error(`${tag}: 주입 자리 «${from.slice(0, 60)}…» 가 ${n}건 — 제품이 옮겨졌다. 자를 갱신하라.`);
    html = html.replace(from, to);
  }
  const f = path.join(ROOT, `.v765-neg-${process.pid}-${tag}.html`);
  fs.writeFileSync(f, html);
  made.push(f);
  return f;
}
const cleanup = () => made.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* 이미 지워졌다 */ } });
process.on('exit', cleanup);

console.log('VERIFY765 — fnchk92 «고정 5통» 상수 수리');

/* ══ §1 구조 ══ */
console.log('\n§1 구조 — 자가 고정 5통 세계로 되돌아가지 않았는가');
const src = fs.readFileSync(FN, 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '');   /* 주석은 단언 대상이 아니다(주석에 5 를 적는 건 자유) */

ok('[1-a]', /FN92_SRC/.test(src) && /const SRC =/.test(code),
  '`FN92_SRC` 로 다른 index.html 사본을 물릴 수 있다(§R 이 쓴다)');
ok('[1-b]', !/rows\.length === 5|rows\.length !== 5/.test(code),
  '«행 수 == 5» 고정 단언 0건');
ok('[1-c]', !/\bMAILS\.filter\(/.test(code),
  '`MAILS.filter(` 0건 — 미수령·합계를 고정 우편만으로 세지 않는다(동적 우편 `S.mailx` 를 같이 읽는다)');
ok('[1-d]', (code.match(/S\.mailx/g) || []).length >= 4,
  `동적 우편을 재료로 읽는 자리 ${(code.match(/S\.mailx/g) || []).length}곳(≥4)`);
ok('[1-e]', /srcLen === 5/.test(code),
  '«`MAILS` 원본 불변 5통» 단언은 **남아 있다** — 그 5 는 소스의 값이지 화면의 행 수가 아니다(무르게 풀지 않았다는 못)');
ok('[1-f]', /expIds/.test(code) && /eq\(s\.rows, s\.expIds\)/.test(code),
  '첫 진입을 «행 수» 가 아니라 **id 집합**으로 본다(한 통이 빠지고 다른 통이 두 번 그려진 화면을 잡는다)');

/* ══ §2 초록 ══ */
console.log('\n§2 초록 — 현재 트리');
const now = runFn(null);
ok('[2-a]', now.verdict === 'PASS' && now.got === now.tot,
  `현재 트리 FNCHK92 ${now.verdict} ${now.got}/${now.tot} (기대 PASS 13/13)`);
ok('[2-b]', /\bx\d/.test(now.out),
  '표에 동적 우편(x…)이 실제로 등장한다 — 자가 180 월별 통을 «보고» 채점한다');
ok('[2-c]', now.code === 0, `종료 코드 ${now.code} (기대 0)`);

/* ══ §R 되돌림 시험 ══ */
console.log('\n§R 되돌림 시험 — 제품을 부순 사본을 먹인다');

/* R1 — 목록이 동적 우편을 흘린다. 화면에는 5행만 남지만 재료에는 6통이 있다. */
const r1 = runFn(inject('R1', [[
  'const mailList = () => allMails().filter(m => S.mail[m.id] !== 2);',
  'const mailList = () => MAILS.filter(m => S.mail[m.id] !== 2);'
]]));
ok('[R1-a]', r1.verdict === 'FAIL', `mailList 가 동적 우편을 흘리면 FNCHK92 ${r1.verdict} ${r1.got}/${r1.tot} — 빨강이어야 한다`);
ok('[R1-b]', r1.rowRed('(첫 진입)'), '빨간 자리가 «(첫 진입)» 이다(id 집합 불일치)');

/* R2 — 일괄 수령이 동적 우편을 건너뛴다. 행은 다 보이는데 다이아가 100,000 모자란다. */
const r2 = runFn(inject('R2', [[
  'function claimAllMail(){\n  let g = 0, c = 0, r = 0, mi = 0, n = 0;\n  allMails().forEach(m => {',
  'function claimAllMail(){\n  let g = 0, c = 0, r = 0, mi = 0, n = 0;\n  MAILS.forEach(m => {'
]]));
ok('[R2-a]', r2.verdict === 'FAIL', `claimAllMail 이 동적 우편을 건너뛰면 FNCHK92 ${r2.verdict} ${r2.got}/${r2.tot} — 빨강이어야 한다`);
ok('[R2-b]', r2.rowRed('[일괄 읽기&수령]'), '빨간 자리가 «[일괄 읽기&수령]» 이다(재화 합계 불일치)');

/* R3 — 180 월별 정산을 끈 «5통 세계». 등재문이 지목한 «날짜 의존» 축이다:
   달이 바뀌어 통이 생겼다 없어졌다 해도 자는 흔들리면 안 된다. */
const r3 = runFn(inject('R3', [[
  'function monthlyCheck(){\n  const mk = monthKey();',
  'function monthlyCheck(){\n  if(true) return null;   /* v765 §R3 — 월별 정산 끔 */\n  const mk = monthKey();'
]]));
ok('[R3-a]', r3.verdict === 'PASS' && r3.got === r3.tot,
  `월별 통이 없는 «5통 세계» 에서도 FNCHK92 ${r3.verdict} ${r3.got}/${r3.tot} — 초록이어야 한다(날짜 의존 제거)`);
ok('[R3-b]', !/\bx\d/.test(r3.out),
  '그 사본의 표에는 동적 우편(x…)이 없다 — 정말로 5통 세계를 먹였다(대조군이 헛돌지 않았다)');

cleanup();
console.log(`\n${fail === 0 ? 'VERIFY765 PASS' : 'VERIFY765 FAIL'} ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
