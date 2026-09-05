/* 작업 84 게이트 — 12 소환 결과 팝업의 하단 버튼 3개 · «터치하여 닫기» 앵커 검산.
   실행: node tools/verify84.js   (docs/review/12-84-r2.png 를 먼저 만들 필요 없음 — 자체 캡처)

   기준(측정표 docs/measure/12-소환결과팝업.md §1, 레퍼런스 1080×2340):
     · 버튼 3개 외곽  ref y 1766~1913 (h148) · x 117~962 (w846) · pitch 300
     · 닫기 잉크      ref y 2124~2164 (h41)  · x 412~667 (cx 539.5)
     · 버튼↔닫기 간격 211
   변환: 이 둘은 **화면 하단(탭바) 기준** 요소이므로 «ref y − 60»(2340→2280 은 상단 84 잘림 + 하단 24 추가).
     → 프레임 목표: 버튼 1706~1853 · 닫기 잉크 2064~2104.
   ⑤색·⑥서체는 통과를 막지 않는다(지시서 [3]-(나) 2). 잉크 «높이»는 서체 차(43 vs 41)라 중심으로 본다. */
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { py } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»

const CAP = 'docs/review/12-84-verify.png';
const T = {
  btnTop: 1706, btnBot: 1853, btnX: 117, btnW: 846, btnH: 148, pitch: 300,
  inkTop: 2064, inkBot: 2104, inkCx: 539.5, gap: 211
};
const R = [];
const ok = (n, got, want, tol) => {
  const d = +(got - want).toFixed(1);
  R.push({ n, got, want, d, pass: Math.abs(d) <= tol, tol });
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    S.dia = 1e9;
    const res = [];
    for (let i = 0; i < 10; i++) res.push(summonOne('weapon'));
    showSummonResult('weapon', 10, res, false);
  });
  await p.waitForTimeout(1400);
  await p.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('.fx-pop').forEach((e) => { e.style.animation = 'none'; });
  });
  await p.waitForTimeout(120);

  const g = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const R2 = (sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               bot: +(A.bottom - r.bottom).toFixed(1) };
    };
    return {
      frameH: +A.height.toFixed(1),
      btns: R2('.sm-btns'), b1: R2('.sm-b1'), b2: R2('.sm-b2'), b3: R2('.sm-b3'),
      panel: R2('.sm-panel'), rb: R2('.sm-rb'), band: R2('.sm-band'),
      closeAnchor: getComputedStyle(document.querySelector('.sm-close')).bottom,
      btnsTopCss: getComputedStyle(document.querySelector('.sm-btns')).top
    };
  });
  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '..', CAP) });
  await b.close();

  /* 닫기 잉크는 픽셀 스캔(PIL) — 레이아웃 박스가 아니라 «잉크» 기준이라야 ref 와 같은 잣대다 */
  const scan = py([path.resolve(__dirname, 'scan12.py'), CAP], { encoding: 'utf8' });
  const m = scan.match(/ink bbox: x (\d+)~(\d+) \(w (\d+), cx ([\d.]+)\)\s+y (\d+)~(\d+) \(h (\d+)\)/);
  if (!m) { console.log(scan); console.log('FAIL: 닫기 잉크를 못 찾음'); process.exit(1); }
  const ink = { x0: +m[1], x1: +m[2], w: +m[3], cx: +m[4], y0: +m[5], y1: +m[6], h: +m[7] };

  ok('프레임 높이', g.frameH, 2280, 0);
  ok('버튼 그룹 top', g.btns.y, T.btnTop, 2);
  ok('버튼 그룹 하변(마지막 행)', g.btns.y + g.btns.h - 1, T.btnBot, 2);
  ok('버튼 그룹 x', g.btns.x, T.btnX, 2);
  ok('버튼 그룹 w', g.btns.w, T.btnW, 2);
  ok('버튼 외곽 h', g.b1.h, T.btnH, 1);
  ok('버튼 pitch(1→2)', g.b2.x - g.b1.x, T.pitch, 2);
  ok('버튼 pitch(2→3)', g.b3.x - g.b2.x, T.pitch, 2);
  ok('닫기 잉크 top', ink.y0, T.inkTop, 2);
  ok('닫기 잉크 bottom', ink.y1, T.inkBot, 2);
  ok('닫기 잉크 중심 y', (ink.y0 + ink.y1) / 2, (T.inkTop + T.inkBot) / 2, 1);
  ok('닫기 잉크 중심 x', ink.cx, T.inkCx, 3);
  ok('버튼↔닫기 간격', ink.y0 - (g.btns.y + g.btns.h - 1), T.gap, 2);
  /* 회귀 — 패널·리본 (측정표 §1 2·1)
     작업 327(2026-08-28, 저장소 주인 «창이 너무 작음 — 세로로 2배») 이 여기 값을 바꿨다:
     패널 539 → **1080(2.00배)** 이고, 그 높이로 84 앵커를 침범하지 않으려면 패널·리본이
     통째로 **103 위로** 떠야 한다(709 → 606 · 641 → 538). 84 가 지키는 것은 «패널이 버튼을
     밀치지 않는가» 이지 «패널이 709 에 있는가» 가 아니므로, 자리값을 327 것으로 갈아 끼우고
     **간격 단언(아래 D 절 · 바로 다음 줄)을 84 의 진짜 자를 삼는다**. */
  ok('패널 top(327)', g.panel.y, 606, 0);
  ok('패널 h(327 = ref 539 × 2)', g.panel.h, 1080, 0);
  ok('리본 top(327 = 패널 top − 68)', g.rb.y, 538, 0);
  /* 327 이 새로 박는 84 의 본질 — 패널 하변과 버튼 상변 사이 20px 이 그대로인가.
     이 한 줄이 «패널을 더 키우면 버튼을 밀친다» 를 막는다(327 이전에는 여유가 117 이라
     아무도 재지 않았고, 그래서 187 이 상한을 잘못 잡아도 게이트가 조용했다). */
  ok('패널 하변 ↔ 버튼 상변 간격', g.btns.y - (g.panel.y + g.panel.h), 20, 0);
  /* 앵커 자체 — 둘 다 bottom 으로 통일됐는지. computed top 은 auto 여도 «사용값»(px)이 나오므로
     선언 자체를 소스에서 본다(LESSONS: computed style 로는 앵커를 구분할 수 없다). */
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const decl = (src.match(/\n\s*\.sm-btns\{[^}]*\}/) || [''])[0];
  R.push({ n: '.sm-btns 선언 = bottom', got: decl.replace(/\s+/g, ' ').trim().slice(0, 60),
    want: 'bottom:426px, top 없음', d: 0,
    pass: /bottom:\s*min\(426px/.test(decl) && !/(^|[;{])\s*top:/.test(decl), tol: 0 });
  /* 126 ①(2026-08-26): 서체가 «Jua» 로 바뀌면서 같은 line-height 안의 베이스라인이 5px 올라갔다.
     이 항목이 지키려는 것은 «175 라는 숫자» 가 아니라 위 4항목이 재는 **잉크 자리(ref 2064~2104,
     중심 2084)** 이므로, 잉크를 원래 자리에 두는 앵커 값 175 → 170 으로 갱신한다. */
  R.push({ n: '.sm-close bottom 앵커', got: g.closeAnchor, want: '170px', d: 0, pass: g.closeAnchor === '170px', tol: 0 });
  R.push({ n: '콘솔 에러', got: errs.length, want: 0, d: errs.length, pass: errs.length === 0, tol: 0 });

  /* 짧은 프레임(#app 높이 clamp 하한 1600) — 하단 앵커로 바꾼 대가로 패널과 겹칠 수 있다.
     min() 클램프가 살아 있는지 «겹침 0» 으로 본다(37·51 계열 회귀 게이트). */
  const b2 = await launch(chromium);
  for (const vp of [{ width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
    const c2 = await b2.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const q = await c2.newPage();
    await q.goto('file://' + path.resolve(__dirname, '../index.html'));
    await q.waitForTimeout(800);
    const o = await q.evaluate(() => {
      S.dia = 1e9;
      const res = []; for (let i = 0; i < 10; i++) res.push(summonOne('weapon'));
      showSummonResult('weapon', 10, res, false);
      const A = document.getElementById('app').getBoundingClientRect();
      const r = (s) => { const e = document.querySelector(s).getBoundingClientRect();
        return { t: e.top - A.top, b: e.bottom - A.top }; };
      const P = r('.sm-panel'), B = r('.sm-btns'), C = r('.sm-close');
      return { panelBtns: B.t < P.b, btnsClose: C.t < B.b, inFrame: C.b <= A.height + 0.5 };
    });
    R.push({ n: vp.width + 'x' + vp.height + ' 패널↔버튼 겹침', got: o.panelBtns, want: false, d: 0, pass: !o.panelBtns, tol: 0 });
    R.push({ n: vp.width + 'x' + vp.height + ' 버튼↔닫기 겹침', got: o.btnsClose, want: false, d: 0, pass: !o.btnsClose, tol: 0 });
    R.push({ n: vp.width + 'x' + vp.height + ' 닫기 프레임 안', got: o.inFrame, want: true, d: 0, pass: o.inFrame, tol: 0 });
    await q.close();
  }
  await b2.close();

  /* 기능 체크(지시서 «기능 완성 규칙») — 앵커를 옮긴 뒤에도 버튼 3개가 실제로 눌리고
     «터치하여 닫기»(딤 탭)가 닫는지. 좌표가 바뀌었으니 히트테스트까지 본다. */
  const b3 = await launch(chromium);
  const c3 = await b3.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const q3 = await c3.newPage();
  const ferr = [];
  q3.on('pageerror', (e) => ferr.push(String(e)));
  await q3.goto('file://' + path.resolve(__dirname, '../index.html'));
  await q3.waitForTimeout(800);
  /* 73 가이드 소환 미션이 «지정된 상자» 외의 소환을 막는다(gmBlocked) — 기능 체크는 그 상자로 연다 */
  await q3.evaluate(() => {
    S.dia = 1e9;
    const bk = (typeof gmBan === 'function' && gmBan()) || 'weapon';
    const res = []; for (let i = 0; i < 10; i++) res.push(summonOne(bk));
    showSummonResult(bk, 10, res, false);
  });
  await q3.waitForTimeout(900);
  const fn = { };
  for (const [k, id] of [['10연(💎)', '#sumB10'], ['30연(💎)', '#sumB30']]) {
    /* 앞 소환이 띄운 안내 모달(가이드 미션 달성 등)은 닫고 나서 다음 버튼을 누른다 */
    await q3.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
    await q3.waitForTimeout(200);
    const before = await q3.evaluate(() => ({ dia: S.dia, sum: S.summons }));
    await q3.click(id, { force: false, timeout: 8000 });
    await q3.waitForTimeout(700);
    const after = await q3.evaluate(() => ({ dia: S.dia, sum: S.summons, on: document.getElementById('sumw').classList.contains('on') }));
    fn[k] = { 다이아: before.dia - after.dia, 소환수: after.sum - before.sum, 팝업유지: after.on };
    R.push({ n: k + ' 버튼 동작', got: '💎-' + (before.dia - after.dia) + ' / +' + (after.sum - before.sum) + '회',
      want: '재화 차감 + 소환 발생', d: 0,
      pass: after.dia < before.dia && after.sum > before.sum && after.on, tol: 0 });
  }
  const freeOn = await q3.evaluate(() => !document.getElementById('sumBF').disabled);
  R.push({ n: '무료 버튼 상태 동기화', got: freeOn ? '활성(잔여 있음)' : '비활성(잔여 0)', want: 'syncSummonBtns 반영', d: 0, pass: true, tol: 0 });
  /* 딤(=«터치하여 닫기») 탭 → 닫힘. 버튼 위가 아닌 좌표를 찍는다 */
  await q3.mouse.click(540, 300);
  await q3.waitForTimeout(300);
  const closed = await q3.evaluate(() => !document.getElementById('sumw').classList.contains('on'));
  R.push({ n: '«터치하여 닫기» 동작', got: closed ? '닫힘' : '안 닫힘', want: '닫힘', d: 0, pass: closed, tol: 0 });
  R.push({ n: '기능 체크 런타임 에러', got: ferr.length, want: 0, d: ferr.length, pass: ferr.length === 0, tol: 0 });
  await b3.close();

  const bad = R.filter((r) => !r.pass);
  R.forEach((r) => console.log((r.pass ? '  ok ' : '  XX ') + r.n.padEnd(24)
    + ' got=' + String(r.got).padEnd(9) + ' want=' + String(r.want).padEnd(9)
    + (typeof r.d === 'number' ? ' Δ=' + r.d : '')));
  console.log(errs.length ? 'errors: ' + errs.slice(0, 5).join(' | ') : '');
  console.log('VERIFY84 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  if (!fs.existsSync(path.resolve(__dirname, '..', CAP))) process.exit(1);
  process.exit(bad.length ? 1 : 0);
})();
