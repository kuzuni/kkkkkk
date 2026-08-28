/* 275 음성 검사 — 고친 ⑥ 판정식이 «남의 표기» 에는 안 깨지고 «내 성질» 회귀는 잡는지
   285 — hp 배수가 상수 60 → `BOSS_SEC` 참조로 바뀌었다(보스전 제한 시간 15초 통일). 판정식과
   케이스를 같이 옮긴다. ④ 는 «참조가 다시 리터럴로 굳는» 회귀를 잡는 자리가 됐다. */
const P = src => {
  const st = (src.match(/^[^\n]*const T2 = ETYPE\.promo[^\n]*$/m) || [''])[0];
  return { a: st !== '', b: /\bs = S\.stage\b/.test(st), c: /\bhp = eHp\(s\)\*BOSS_SEC;/.test(st) };
};
const W = '  const T2 = ETYPE.promo';
const CASES = [
  ['① 현재형(285 표기)',              W + ' = promoType(ri), s = S.stage, hp = eHp(s)*BOSS_SEC;\n', [1,1,1]],
  ['② 옛 표기(208 이전 자리)',        W + ', s = S.stage, hp = eHp(s)*BOSS_SEC;\n',                 [1,1,1]],
  ['③ 앞으로 또 갈아 끼운 표기',      W + ' = foo(bar, baz), s = S.stage, hp = eHp(s)*BOSS_SEC;\n',  [1,1,1]],
  ['④ 배수가 다시 리터럴로 굳음(285 회귀)', W + ' = promoType(ri), s = S.stage, hp = eHp(s)*60;\n',  [1,1,0]],
  ['⑤ 곡선 회귀 (eHp → ePow)',        W + ' = promoType(ri), s = S.stage, hp = ePow(s)*BOSS_SEC;\n', [1,1,0]],
  ['⑥ 스테이지 회귀 (S.stage→S.rank)',W + ' = promoType(ri), s = S.rank, hp = eHp(s)*BOSS_SEC;\n',   [1,0,1]],
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
