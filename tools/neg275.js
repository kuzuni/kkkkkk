/* 275 음성 검사 — 고친 ⑥ 판정식이 «남의 표기» 에는 안 깨지고 «내 성질» 회귀는 잡는지 */
const P = src => {
  const st = (src.match(/^[^\n]*const T2 = ETYPE\.promo[^\n]*$/m) || [''])[0];
  return { a: st !== '', b: /\bs = S\.stage\b/.test(st), c: /\bhp = eHp\(s\)\*60;/.test(st) };
};
const W = '  const T2 = ETYPE.promo';
const CASES = [
  ['① 현재형(208 표기)',              W + ' = promoType(ri), s = S.stage, hp = eHp(s)*60;\n', [1,1,1]],
  ['② 옛 표기(208 이전)',             W + ', s = S.stage, hp = eHp(s)*60;\n',                 [1,1,1]],
  ['③ 앞으로 또 갈아 끼운 표기',      W + ' = foo(bar, baz), s = S.stage, hp = eHp(s)*60;\n',  [1,1,1]],
  ['④ hp 배수 회귀 (×60 → ×22)',      W + ' = promoType(ri), s = S.stage, hp = eHp(s)*22;\n',  [1,1,0]],
  ['⑤ 곡선 회귀 (eHp → ePow)',        W + ' = promoType(ri), s = S.stage, hp = ePow(s)*60;\n', [1,1,0]],
  ['⑥ 스테이지 회귀 (S.stage→S.rank)',W + ' = promoType(ri), s = S.rank, hp = eHp(s)*60;\n',   [1,0,1]],
  ['⑦ 스폰 문장 소멸',                '  /* 승급전 폐기 */\n',                                 [0,0,0]],
];
let bad = 0;
for (const [n, src, want] of CASES) {
  const g = P(src), got = [+g.a, +g.b, +g.c];
  const ok = got.join() === want.join();
  if (!ok) bad++;
  console.log((ok ? ' ok ' : 'FAIL') + '  ' + n + '  →  ⑥a' + got[0] + ' ⑥b' + got[1] + ' ⑥c' + got[2]
              + '  (want ⑥a' + want[0] + ' ⑥b' + want[1] + ' ⑥c' + want[2] + ')');
}
console.log('\nNEG275 ' + (CASES.length - bad) + '/' + CASES.length + (bad ? ' FAIL' : ' PASS'));
process.exit(bad ? 1 : 0);
