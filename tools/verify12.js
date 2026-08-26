/* 12 소환 결과 팝업 — 수치 회귀 게이트 (2026-08-26, 2차 폴리시 라운드 워커 C)
 *
 * 왜 만들었나: 이 화면은 «측정은 끝났는데 다른 작업이 지나가면서 조용히 어긋나는» 일이 반복됐다.
 *   - 63  (9:19 전환)   → 하단 요소가 상단 변환을 타 24px 떠올랐다 (작업 84 가 잡음)
 *   - 126 (서체 Jua)    → 세로 베이스라인만 보정하고 **가로 잉크를 안 되돌려** 전 텍스트가 −13~15% 로 눌렸다
 *   - 102 (부족/충분색) → `.lack` 과 `disabled` 가 같은 조건이 되면서 `:disabled` 필터가 이중으로 걸려
 *                         버튼 전 계조가 레퍼런스의 0.72 배가 됐다
 * 전부 «캡처를 다시 재기 전에는 아무도 모르는» 종류다. 그래서 레퍼런스 실측값을 그대로 게이트로 박는다.
 *
 * 실행: node tools/verify12.js
 *   레퍼런스와 **같은 상태**(무료 0회·다이아 0 = «부족»)로 띄운 뒤(측정표 §11),
 *   `tools/scan12r.py` 로 ref·cap 을 같은 마스크로 재고 목표값과 대조한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs/review/12-verify.png');

/* 목표값은 전부 **레퍼런스 실측**(1080×2340 좌표)이다. 스캐너가 캡처 y 를 ref 축으로 되돌려 주므로
   여기서는 두 이미지를 같은 숫자로 비교할 수 있다. */
const T = {
  /* 잉크 bbox [x, y, w, h] */
  title:  [455,  747, 171, 41],
  close:  [412, 2123, 256, 42],
  lab1:   [170, 1796, 140, 31],
  lab2:   [470, 1796, 140, 31],
  lab3:   [767, 1796, 147, 31],
  badge0: [109, 1039,  10, 26],
  badge1: [109, 1209,  10, 26],
};
const TOL = { title: 3, close: 3, lab1: 3, lab2: 3, lab3: 3, badge0: 3, badge1: 3 };

let pass = 0, fail = 0;
const rows = [];
function chk(name, got, want, tol) {
  const ok = Array.isArray(want)
    ? Array.isArray(got) && got.length === want.length && want.every((w, i) => Math.abs(got[i] - w) <= tol)
    : Math.abs(got - want) <= tol;
  rows.push(`  ${ok ? 'ok' : 'FAIL'} ${name.padEnd(34)} got=${JSON.stringify(got)} want=${JSON.stringify(want)} ±${tol}`);
  ok ? pass++ : fail++;
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    S.dia = 0;                                    /* ②③ «부족» — 은색 면 + 빨간 가격 */
    S.daily = S.daily || {};
    S.daily.freeSum = Object.assign({}, S.daily.freeSum, { weapon: 0 });   /* ① 무료 소진 */
    const res = [], seen = new Set();
    for (let i = 0; i < 4000 && res.length < 10; i++) {
      const r = summonOne('weapon');
      if (seen.has(r.it.id)) continue;
      seen.add(r.it.id); res.push(r);
    }
    showSummonResult('weapon', 10, res, false);   /* ref 와 같은 6열 2행 10칸 */
  });
  await p.waitForTimeout(1400);
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('.fx-pop').forEach((e) => { e.style.animation = 'none'; });
  });
  await p.waitForTimeout(120);
  await p.locator('#app').screenshot({ path: SHOT });
  await b.close();

  const out = execFileSync('python3', ['tools/scan12r.py', path.relative(ROOT, SHOT), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const m = JSON.parse(out);

  console.log('== 텍스트·배지 잉크 bbox (ref 실측 대비) ==');
  for (const k of Object.keys(T)) chk(k + ' 잉크 [x,y,w,h]', m.cap[k], T[k], TOL[k]);

  console.log('\n== 기하 회귀 (ref 를 그 자리에서 같이 재서 대조) ==');
  chk('카드 6열 검정 좌단 (y940)', m.cap.cardcols, m.ref.cardcols, 2);
  chk('카드 2행 상·하단 (x78)', m.cap.cardrows.flat(), m.ref.cardrows.flat(), 2);
  chk('검은 패널 세로 (x12)', m.cap.panel, m.ref.panel, 2);
  chk('리본 밴드 가로 (y733)', m.cap.band733, m.ref.band733, 2);
  chk('버튼 검정 외곽 상단 x3', m.cap.btntop.flat(), m.ref.btntop.flat(), 2);

  /* 회귀 ② 감시 — «부족» 상태의 버튼은 레퍼런스와 **같은 계조**여야 한다(측정표 §11).
     `.sm-b:disabled` 의 filter 가 다시 걸리면 여기가 0.72 배로 내려앉는다. */
  console.log('\n== 버튼 계조 — «부족» 상태는 ref 픽셀 그대로여야 한다 ==');
  chk('버튼② 림·면 계조 (x540)', m.cap.btntone, m.ref.btntone, 8);

  chk('콘솔·런타임 에러', errs.length, 0, 0);

  console.log('');
  rows.forEach((r) => console.log(r));
  console.log(`\nVERIFY12 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  if (!fs.existsSync(SHOT)) process.exit(2);
  process.exit(fail ? 1 : 0);
})();
