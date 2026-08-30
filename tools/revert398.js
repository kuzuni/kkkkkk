/* 작업 539 — 「398·399 되돌림 상태」를 **페이지 안에서** 만드는 한 벌
 *
 * 왜 파일로 따로 뺐나: `verify398.js` §R 과 `probe539.js` 가 **같은 되돌림**을 써야
 * «자가 통과한 것» 과 «재현기가 증명한 것» 이 같은 물건이 된다. 사본이 둘이면
 * 그 둘이 어긋나는 순간(398 계열은 이미 세 번 그랬다) 아무도 모른다.
 *
 * 쓰는 법: `await page.evaluate(revertMeasure)` — 되돌린 뒤 §1·§2 가 보는 값을 그대로 돌려준다.
 *
 * ⚑ 규약 — **제품 수식을 베끼지 않는다.**
 *   되돌리는 것은 «표»(PASS_CUR·ATTEND) 뿐이고, 칸값 계산은 제품 `passRw`·`won` 이 한다.
 *   옛 `PASS_CUR[(i + c) % 3]` 은 «표를 (i + c) 만큼 돌려 놓고 지금 제품(PASS_CUR[0])을 부르는 것»
 *   과 값이 같아서, 회전만 시키고 계산은 넘긴다. 제품이 표를 안 읽게 바뀌면 `rwReads` 가 false 로
 *   답한다 — 조용히 초록이 되는 길이 없다.
 */
function revertMeasure() {
  /* ① 패스 표 — 399 가 지운 3재화를 그 값 그대로 되돌린다 */
  PASS_CUR.length = 0;
  PASS_CUR.push(
    { k: 'gold', ic: curIc('gold'), n: i => 20000 * (i + 1) * (i + 1) },
    { k: 'dia', ic: curIc('dia'), n: i => 30 + i * 10 },
    { k: 'relic', ic: curIc('relic'), n: i => 3 + i });
  /* ② 옛 «칸마다 재화가 돌아간다» = 표를 (i + c) 만큼 돌린 뒤 제품 passRw 를 부르는 것 */
  const rw0 = passRw;
  window.passRw = (i, c) => {
    const save = PASS_CUR.slice(), k = (i + c) % save.length;
    PASS_CUR.length = 0; PASS_CUR.push(...save.slice(k), ...save.slice(0, k));
    try { return rw0(i, c); } finally { PASS_CUR.length = 0; PASS_CUR.push(...save); }
  };
  /* ③ 옛 출석 — 5칸마다 유물조각(수량 곡선은 399 가 지운 그 값) */
  ATTEND.forEach((r, idx) => {
    const i = idx + 1;
    if (i % 5 === 0) { delete r.dia; r.ic = curIc('relic'); r.t = '유물조각'; r.rel = 400 + i * 25; }
  });
  const cells = [];
  const prev = passTab; passTab = 'stage';
  for (let i = 0; i < PASS_TABS.stage.n; i++) for (let c = 0; c < PASS_TABS.stage.cols; c++) cells.push(passRw(i, c));
  passTab = prev;
  return {
    curN: PASS_CUR.length,
    /* 제품 passRw 가 표를 실제로 읽는가 — 같은 단계의 두 칸이 다른 재화로 나와야 회전이 먹은 것이다 */
    rwReads: passRw(0, 0).k !== passRw(0, 1).k,
    atRel: ATTEND.some(r => r.rel > 0),
    atN: ATTEND.length,
    passKeys: [...new Set(cells.map(c => c.k))].sort(),
    maxTxt: cells.reduce((a, c) => (won(c.n).length > a.length ? won(c.n) : a), ''),
    atKeys: [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => !['ic', 't'].includes(k))))].sort()
  };
}

module.exports = { revertMeasure };
