/* 작업 487 — 21 도감 카드 «Lv. n/m» 잉크가 카드(`.cd`)에 잘리는지 재현한다.
 *
 * 338 규칙 — 처방보다 재현이 먼저다. 등재문(470 4회차 곁다리)은 «도감 6탭 전부에서 좌우 −2.9px»
 * 라고 적고 있지만, 그 값은 `scan470` 이 **한 상태(레벨 100 · req 한 값)** 에서 낸 것이다.
 * 여기서는 **레벨 축과 req 축을 따로** 굴려 «어느 문자열부터 잘리는가» 를 잰다 —
 * 처방(ⓐ font-size ⓑ letter-spacing ⓒ 접두어 제거) 중 어느 것이 얼마나 필요한지는
 * «가장 긴 실제 문자열» 이 정하기 때문이다.
 *
 *   자 = scan470 과 같은 정의(잉크 = Range 글리프 상자 ∪ 스트로크 바깥 몫 sw/2).
 *   호스트 = `.cd` 의 **클라이언트 박스**(테두리 5 안쪽 = 111px). `.cd{overflow:hidden}` 이라
 *   여기를 넘는 잉크는 실제로 안 그려진다.
 *
 * 실행: node tools/probe487.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* 도감 6탭 — scan470 SCREENS 와 같은 오프너 */
const TABS = [
  ['스킬',   '.cltab[data-ct="skill"]'],
  ['무기',   '.cltab[data-ct="weapon"]'],
  ['방어구', '.cltab[data-ct="shield"]'],
  ['장신구', '.cltab[data-ct="amulet"]'],
  ['펫',     '.cltab[data-ct="pet"]'],
  ['유물',   '.cltab[data-ct="relic"]'],
];

/* 상태 축 — [보유 레벨, 받은 단계]. 받은 단계 got 이 곧 req = got+1 이라 문자열 꼬리가 길어진다.
   ⚠ 합성이 아니다: MAX_LEVEL = 100 · COLL_MAX_STEP = 10 이라 «Lv. 100/10» 은 실제로 도달한다. */
const CASES = [
  [1,   0],   /* Lv. 1/1     — 가장 짧은 문자열 */
  [10,  0],   /* Lv. 10/1 */
  [99,  0],   /* Lv. 99/1    — 등재문이 «여기까지는 초록» 이라고 적은 자리 */
  [100, 0],   /* Lv. 100/1   — 3자리 진입 */
  [100, 9],   /* Lv. 100/10  — 실제 최장 문자열 */
];

const RAISE = (lv, got) => `
  try {
    const own = (id, l) => { S.own[id] = S.own[id] || { l:0, n:0 }; S.own[id].l = l; S.own[id].n = 5; };
    [SKILLS, EQUIPS, PETS, RELICS].forEach(A => { if (A) A.forEach(x => own(x.id, ${lv})); });
    COLL_SETS.forEach(st => { S.coll[st.key] = ${got}; });
    renderAll && renderAll();
  } catch (e) {}
`;

/* 잉크 자 — scan470 의 inkOf 와 같은 정의(340 교훈: 사람이 보는 것은 레이아웃 상자가 아니라 잉크다) */
const MEASURE = `(() => {
  const inkOf = (el) => {
    let x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9, any = false;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (!r.width || !r.height) continue;
        any = true;
        if (r.left < x1) x1 = r.left; if (r.right > x2) x2 = r.right;
        if (r.top < y1) y1 = r.top;   if (r.bottom > y2) y2 = r.bottom;
      }
    }
    if (!any) return null;
    const sw = parseFloat(getComputedStyle(el).webkitTextStrokeWidth) || 0;
    return { x1: x1 - sw / 2, x2: x2 + sw / 2, y1: y1 - sw / 2, y2: y2 + sw / 2, sw };
  };
  const out = [];
  document.querySelectorAll('#collw .clb .cd').forEach(cd => {
    const el = cd.querySelector('i.cl2'); if (!el) return;
    const ink = inkOf(el); if (!ink) return;
    const cs = getComputedStyle(cd), r = cd.getBoundingClientRect();
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const cw = r.width - bl - br;                 /* 클라이언트 폭 = 121 − 5 − 5 = 111 */
    out.push({
      txt: el.textContent.trim(),
      w: +(ink.x2 - ink.x1).toFixed(1),
      cw: +cw.toFixed(1),
      l: +(ink.x1 - (r.left + bl)).toFixed(1),   /* 좌 여백(음수 = 잘림) */
      rr: +((r.right - br) - ink.x2).toFixed(1), /* 우 여백 */
      ov: cs.overflow,
    });
  });
  return out;
})()`;

async function run() {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const rows = [];
  for (const [lv, got] of CASES) {
    await p.evaluate(RAISE(lv, got));
    await p.waitForTimeout(120);
    /* 팝업이 닫혀 있으면 연다(케이스마다 다시 열지 않는다 — 탭 상태만 갈아탄다) */
    await p.evaluate(() => {
      const w = document.getElementById('collw');
      if (!w || !w.classList.contains('on')) {
        const o = document.querySelector('.side .ibtn[data-pop="coll"]'); if (o) o.click();
      }
    });
    await p.waitForTimeout(320);
    for (const [tn, sel] of TABS) {
      const ok = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);
      if (!ok) { rows.push({ lv, got, tab: tn, miss: true }); continue; }
      await p.waitForTimeout(220);
      const got2 = await p.evaluate(MEASURE);
      /* 같은 문자열은 한 번만 — 카드 수십 장이 같은 값을 낸다 */
      const seen = new Set();
      for (const g of got2) {
        if (seen.has(g.txt)) continue; seen.add(g.txt);
        rows.push({ lv, got, tab: tn, ...g });
      }
    }
  }
  await b.close();
  return { rows, errs };
}

if (require.main === module) (async () => {
  const { rows, errs } = await run();
  console.log('PROBE487 — 21 도감 카드 «Lv. n/m» 잉크 vs 카드 클라이언트 박스 (1080×2280)');
  console.log('  잉크 = Range 글리프 상자 ∪ 스트로크 바깥 몫(sw/2) · 여백 음수 = `.cd{overflow:hidden}` 이 실제로 자른다');
  console.log('');
  console.log('  상태(Lv/단계)  탭       문자열        잉크w   카드안쪽   좌 / 우      판정');
  let bad = 0, tot = 0;
  const worst = {};
  for (const r of rows) {
    if (r.miss) { console.log('  [!] ' + r.tab + ' 탭 오프너 없음'); continue; }
    tot++;
    const hit = Math.min(r.l, r.rr) < -0.05;
    if (hit) bad++;
    const key = r.txt;
    if (!worst[key] || Math.min(r.l, r.rr) < worst[key]) worst[key] = Math.min(r.l, r.rr);
    console.log('  ' + String('Lv' + r.lv + '/단계' + r.got).padEnd(14) + r.tab.padEnd(9)
      + r.txt.padEnd(14) + String(r.w).padStart(6) + String(r.cw).padStart(10) + '   '
      + String(r.l).padStart(5) + ' / ' + String(r.rr).padStart(5) + '   ' + (hit ? '✗ 잘림' : '✓'));
  }
  console.log('');
  console.log('  문자열별 최소 여백:');
  for (const k of Object.keys(worst)) console.log('    ' + k.padEnd(14) + String(worst[k]).padStart(7) + 'px');
  console.log('');
  console.log('  표본 ' + tot + '건 중 잘림 ' + bad + '건 · 콘솔 에러 ' + errs.length + '건');
  if (errs.length) errs.slice(0, 3).forEach(e => console.log('    ! ' + e));
})();

module.exports = { run, TABS, CASES, RAISE, MEASURE };
