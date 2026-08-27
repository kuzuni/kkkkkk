/* 277 음성 검사 — verify88 [A]/[A2]/[B] 가 «진짜로 무는가».
   277 은 «제품이 옳고 게이트가 낡았다» 계열이다(242·275·276 과 같은 갈래). 이런 작업의 가장 쉬운
   «고침» 은 빨간 단언을 **지우는** 것인데, 그 순간 88 이 세운 감시가 통째로 사라진다.
   그래서 금지 목록에서 `trSub`·`data-trsub`(= 203/210 이 새로 세운 «훈련·룬·단련» 바의 이름)를 뺀 대신,
   88 의 **주제**(«스탯» 칸의 부활 금지)를 [A2]·[B] 로 이사시켰다 — 그 이사가 **빈 껍데기가 아님**을
   여기서 반증한다. index.html 을 일부러 되돌려 놓고 진짜 게이트를 돌려 ✗ 로 바뀌는지 본다.

   실행: node tools/neg277.js      (index.html 을 잠깐 고쳤다 원상 복구한다 — 끝에 git diff 로 검산)

   [A]  폐기 식별자 0건            … spAtk/S.pexp/upTab 등 88 이 지운 이름
   [A2] «스탯» 서브탭 부활 없음    … 88 의 바(id trSub / class tr-sub)도 stat 칸도 0건
   [B]  «스탯» 서브탭·분배 UI 없음 … 실제로 연 훈련 팝업에서 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HTML = path.resolve(__dirname, '../index.html');
const GATE = path.resolve(__dirname, 'verify88.js');
const A  = '[A] 폐기 식별자 0건';
const A2 = '[A2] «스탯» 서브탭 부활 없음';
const B  = '[B] «스탯» 서브탭·분배 UI 없음';

/* 되돌릴 자리 — 셋 다 «88 이 지웠던 것을 그대로 되살린다» 는 뜻이다. */
const TEMPER = '<div class="stab" data-trsub="temper"><i class="ol3">단련</i><s class="bdg"></s></div>';
const TRSUBS = "const TRSUBS = ['train', 'rune', 'temper'];";
const BAR    = '<div class="stabs sp3 tr-subs" id="trSubs">';
const TEMP   = '<div class="tr-temp" id="trTemper"></div>';

/* [이름, 원문, 바꿀 문장, 기대(A, A2, B) — 1 = ✓ 통과, 0 = ✗ 빨개짐] */
const CASES = [
  ['① 무변경 (현재 제품 — 203/210 의 «훈련·룬·단련» 바가 그대로 있다)', null, null, [1, 1, 1]],

  ['② «스탯» 칸 부활 — data-trsub="stat" + TRSUBS 에 stat',
   TEMPER + "\n        </div>",
   TEMPER + '\n          <div class="stab" data-trsub="stat"><i class="ol3">스탯</i></div>\n        </div>',
   [1, 0, 0]],

  ['③ 88 의 서브탭 바 부활 — id="trSub" · class="tr-sub" (속성 표기)',
   BAR, '<div class="tr-sub" id="trSub"></div>\n        ' + BAR, [1, 0, 0]],

  ['④ 훈련 팝업에 스탯 분배 UI 부활 — [data-sp]',
   TEMP, TEMP + '\n        <div data-sp="atk"></div>', [1, 1, 0]],

  ['⑤ 폐기 식별자 부활 — S.spAtk · S.pexp · S.upTab',
   TRSUBS, 'let zz = S.spAtk + S.pexp + S.upTab;\n' + TRSUBS, [0, 1, 1]],

  ['⑥ 203/210 의 이름만 있는 현 상태에서 «단련» 칸을 하나 더 — 금지 목록이 남의 이름을 안 문다',
   TEMPER, TEMPER + '\n          <div class="stab" data-trsub="rune2"><i class="ol3">룬2</i></div>',
   [1, 1, 1]]   /* TRSUBS 에 없는 칸이라 [A2]/[B] «전제» 는 빨개지지만 결론 3항은 초록이어야 한다 */
];

const orig = fs.readFileSync(HTML, 'utf8');
let bad = 0;

const verdict = out => {
  const line = t => (out.split('\n').find(l => l.includes(t)) || '');
  const la = line(A), la2 = line(A2), lb = line(B);
  if (!la || !la2 || !lb) return null;                 /* 단언 자체가 사라졌다 = 검사 불능 */
  return [la.startsWith('PASS') ? 1 : 0, la2.startsWith('PASS') ? 1 : 0, lb.startsWith('PASS') ? 1 : 0];
};

(async () => {
  try {
    for (const [n, from, to, want] of CASES) {
      if (from) {
        if (orig.indexOf(from) < 0) { console.log('FAIL  ' + n + '  →  원문 미발견(케이스가 낡음)'); bad++; continue; }
        let next = orig.replace(from, to);
        if (n.startsWith('②')) next = next.replace(TRSUBS, "const TRSUBS = ['train', 'rune', 'temper', 'stat'];");
        fs.writeFileSync(HTML, next);
      } else fs.writeFileSync(HTML, orig);
      let out;
      try { out = execFileSync('node', [GATE], { encoding: 'utf8', maxBuffer: 8 << 20 }); }
      catch (e) { out = (e.stdout || '') + (e.stderr || ''); }   /* FAIL 이면 exit≠0 — 출력은 그대로 쓴다 */
      const got = verdict(out);
      const okc = got && got.join() === want.join();
      if (!okc) bad++;
      console.log((okc ? ' ok ' : 'FAIL') + '  ' + n
                  + '\n        → ' + (got ? '[A]' + got[0] + ' [A2]' + got[1] + ' [B]' + got[2] : '단언 소실')
                  + '  (want [A]' + want[0] + ' [A2]' + want[1] + ' [B]' + want[2] + ')');
    }
  } finally {
    fs.writeFileSync(HTML, orig);                      /* 무슨 일이 있어도 원상 복구 */
  }

  /* 복구 검산 — 게이트가 아니라 git 에게 묻는다 */
  let dirty = '';
  try { dirty = execFileSync('git', ['diff', '--stat', '--', HTML], { encoding: 'utf8', cwd: path.dirname(GATE) }).trim(); }
  catch (e) { dirty = '(git 조회 실패)'; }
  const restored = dirty === '';
  if (!restored) bad++;
  console.log((restored ? ' ok ' : 'FAIL') + '  ⑦ index.html 원상 복구 — git diff 비어 있음'
              + (restored ? '' : ' — 남은 변경: ' + dirty));

  const total = CASES.length + 1;
  console.log('\nNEG277 ' + (total - bad) + '/' + total + (bad ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(bad ? 1 : 0);
})();
