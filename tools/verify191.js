/* 작업 191 게이트 — 89 유물 페이지 «아이콘이 슬롯 안에서 옆으로 밀렸는가».

   재는 것은 **글리프 advance 박스 중심 vs 슬롯 중심**이다(A4 가 스킬 24칸에서 쓴 자와 같다).
   잉크 중심을 안 쓰는 이유는 이모지마다 잉크가 advance 안에서 제각각이라(🫀 −7px) 그것을 0 으로
   맞추면 이모지를 바꿀 때마다 값이 흔들리기 때문이다 — 잉크 편차는 «아트 대기» 로 측정표에 남긴다.
   픽셀 잉크 대조는 `python3 tools/scan191.py docs/review/191-<회차>.png` 가 따로 본다.

   ★ **음성항 [D] 가 이 게이트의 핵심**이다 — 옛 CSS(`inset:0` + flex 중앙)로 되돌리면 반드시
     빨개져야 한다. 안 그러면 «자를 안 댄 곳은 자동 무결점»(LESSONS 15회차)이 된다.

   실행: node tools/verify191.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
let pass = 0, fail = 0;
const ok = (t, d) => { pass++; console.log(`PASS ${t}${d ? ' — ' + d : ''}`); };
const no = (t, d) => { fail++; console.log(`FAIL ${t}${d ? ' — ' + d : ''}`); };
const chk = (c, t, d) => (c ? ok : no)(t, d);

async function openRelic(p) {
  await p.evaluate(() => {
    RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
    S.relic = 99999;
    document.querySelector('#tabbar [data-t="box"]').click();
  });
  return p.evaluate(async () => {
    const sig = () => [...document.querySelectorAll('#relw .rw-c')]
      .map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(2)},${q.top.toFixed(2)},${q.width.toFixed(2)}`; }).join('|');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let prev = '', same = 0, waited = 0;
    while (waited < 6000) { await wait(60); waited += 60; const s = sig(); same = (s === prev && s !== '') ? same + 1 : 0; prev = s; if (same >= 4) return true; }
    return false;
  });
}

/* 슬롯별 «advance 중심 − 슬롯 중심». --rwc 스케일이 걸린 화면비도 있으므로
   프레임 px 그대로 재고 문턱은 스케일로 나눠 논리 px 으로 환산한다. */
const MEASURE = () => {
  const cs = [...document.querySelectorAll('#relw .rw-c')];
  const sc = cs.length ? cs[0].getBoundingClientRect().width / 151 : 1;
  return {
    scale: +sc.toFixed(4),
    n: cs.length,
    fs: cs.length ? getComputedStyle(cs[0].querySelector('i')).fontSize : '',
    rows: cs.map(c => {
      const cr = c.getBoundingClientRect(), i = c.querySelector('i');
      const rg = document.createRange(); rg.selectNodeContents(i);
      const gr = rg.getBoundingClientRect();
      const ur = c.querySelector('u').getBoundingClientRect();
      return {
        id: c.dataset.rw,
        dx: +((gr.left + gr.width / 2) - (cr.left + cr.width / 2)).toFixed(3),
        dy: +((gr.top + gr.height / 2) - (cr.top + cr.height / 2)).toFixed(3),
        du: +((ur.left + ur.width / 2) - (cr.left + cr.width / 2)).toFixed(3),
        w: +cr.width.toFixed(2), h: +cr.height.toFixed(2),
        gw: +gr.width.toFixed(2),
        pe: getComputedStyle(i).pointerEvents,
      };
    }),
  };
};

(async () => {
  const b = await launch(chromium);

  /* ---- [A]~[C]·[F]·[G] 화면비 4종 ---- */
  for (const H of HEIGHTS) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL); await p.waitForTimeout(900);
    const settled = await openRelic(p);
    chk(settled, `[${H}] 기하 정지`, settled ? '' : '팝인이 안 끝났다');
    const m = await p.evaluate(MEASURE);
    const s = m.scale || 1;

    chk(m.n === 10, `[${H}] A1 슬롯 10칸`, `${m.n}칸`);
    const mx = Math.max(...m.rows.map(r => Math.abs(r.dx))) / s;
    chk(mx <= 0.75, `[${H}] A2 가로 — advance 중심 = 슬롯 중심 (10칸 |Δ|≤0.75 논리px)`, `최대 |Δx| ${mx.toFixed(3)}`);
    const my = Math.max(...m.rows.map(r => Math.abs(r.dy))) / s;
    chk(my <= 1.5, `[${H}] A3 세로 — advance 중심 = 슬롯 중심 (|Δ|≤1.5)`, `최대 |Δy| ${my.toFixed(3)}`);
    /* «전부 같은 부호로 밀림» 이 191 의 증상이다 — 평균이 아니라 편향을 직접 본다 */
    const bias = m.rows.reduce((a, r) => a + r.dx, 0) / m.rows.length / s;
    chk(Math.abs(bias) <= 0.5, `[${H}] A4 일괄 편향 없음 (평균 Δx)`, `${bias.toFixed(3)}`);
    const mu = Math.max(...m.rows.map(r => Math.abs(r.du))) / s;
    chk(mu <= 0.5, `[${H}] B1 Lv 라벨 중심 불변`, `최대 |Δ| ${mu.toFixed(3)}`);
    chk(m.rows.every(r => r.pe === 'none'), `[${H}] B2 아이콘 상자는 클릭을 안 먹는다`, m.rows[0].pe);

    /* [F] 89 측정 규격 불변 */
    const spec = m.rows.every(r => Math.abs(r.w / s - 151) <= .6 && Math.abs(r.h / s - 151) <= .6);
    chk(spec, `[${H}] F1 슬롯 151×151 (89 측정 규격 불변)`, `${(m.rows[0].w / s).toFixed(1)}×${(m.rows[0].h / s).toFixed(1)}`);
    chk(m.fs === '126px', `[${H}] F2 아이콘 font-size 126px (측정표 «~130×130»)`, m.fs);
    /* 상자가 글리프보다 넓어야 정렬이 걸린다 — 191 의 근본 조건 */
    const boxW = await p.evaluate(() => {
      const i = document.querySelector('#relw .rw-c i');
      return +i.getBoundingClientRect().width.toFixed(2);
    });
    chk(boxW / s > m.rows[0].gw / s + 8, `[${H}] F3 아이콘 상자 폭 > 글리프 advance (+8 여유)`,
      `상자 ${(boxW / s).toFixed(1)} vs advance ${(m.rows[0].gw / s).toFixed(1)}`);
    chk(errs.length === 0, `[${H}] H 콘솔·런타임 에러 0`, `${errs.length}건`);
    await ctx.close();
  }

  /* ---- [E] 실사용 클릭 — 슬롯 중앙은 열리고, 넓힌 상자 자리는 안 열린다 ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(900);
    await openRelic(p);
    const box = await p.evaluate(() => {
      const c = document.querySelector('#relw [data-rw="rl4"]').getBoundingClientRect();
      return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, l: c.left, w: c.width };
    });
    await p.mouse.click(box.cx, box.cy);
    await p.waitForTimeout(350);
    const openedIn = await p.evaluate(() => document.getElementById('modal')?.classList.contains('on') || false);
    chk(openedIn, '[2280] E1 슬롯 중앙 클릭 → 상세 팝업 열림', String(openedIn));
    await p.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
    await p.waitForTimeout(350);
    /* 슬롯 좌변에서 20px 바깥 = 넓힌 <i> 상자 안이지만 슬롯 밖 */
    await p.mouse.click(box.l - 20, box.cy);
    await p.waitForTimeout(350);
    const openedOut = await p.evaluate(() => document.getElementById('modal')?.classList.contains('on') || false);
    chk(!openedOut, '[2280] E2 슬롯 밖 20px(넓힌 상자 자리) 클릭 → 안 열림', `열림=${openedOut}`);
    await ctx.close();
  }

  /* ---- [D] 음성항 — 옛 CSS 로 되돌리면 빨개져야 한다 ----
     ★ **CSS 를 «올린 뒤 주입» 하면 안 된다.** 처음에 그렇게 짰다가 옛 CSS 인데도 Δ0.00 이 나왔다 —
     레이아웃이 끝난 뒤 넣은 규칙은 익명 flex 항목의 정렬을 다시 풀지 않아(무효화 누락) **새로 연 문서와
     다른 배치**가 된다. 같은 CSS 를 index.html 에 넣고 새로 열면 +7.11 이다(A/B 로 확인).
     그래서 옛 규칙으로 갈아 끼운 **사본을 저장소 루트에 만들어 그것을 연다**(59·74·58 게이트 선례).
     루트여야 하는 이유는 `assets/atlas-data.js`·`assets/ui/*.svg` 가 상대 경로라서다. */
  {
    const NEG = path.resolve(__dirname, '..', `.v191-neg-${process.pid}.html`);
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    const CUR = /\.rw-c>i\{[^}]*\}/;
    const hit = src.match(CUR);
    chk(!!hit, '[2280] D0 음성항 사본 — `.rw-c>i` 규칙을 찾았다', hit ? hit[0].slice(0, 46) + '…' : '못 찾음');
    fs.writeFileSync(NEG, src.replace(CUR,
      '.rw-c>i{position:absolute;inset:0;display:flex;align-items:center;'
      + 'justify-content:center;text-align:center;font-size:126px;line-height:1}'));
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto('file://' + NEG); await p.waitForTimeout(900);
    await openRelic(p);
    const m = await p.evaluate(MEASURE);
    const s = m.scale || 1;
    const bias = m.rows.reduce((a, r) => a + r.dx, 0) / m.rows.length / s;
    chk(bias > 5, '[2280] D1 음성항 — 옛 상자(inset:0)로 되돌리면 10칸이 오른쪽으로 밀린다',
      `평균 Δx ${bias.toFixed(2)} (기대 ≈+7.1)`);
    const same = m.rows.every(r => Math.abs(r.dx / s - bias) < 0.3);
    chk(same, '[2280] D2 음성항 — 그 밀림은 «전부 같은 양» 이다(주인 보고와 일치)',
      `편차 ${Math.max(...m.rows.map(r => Math.abs(r.dx / s - bias))).toFixed(2)}`);
    const dyOld = m.rows.reduce((a, r) => a + r.dy, 0) / m.rows.length / s;
    chk(dyOld < -5, '[2280] D3 음성항 — 옛 line-height:1 이면 세로도 위로 뜬다',
      `평균 Δy ${dyOld.toFixed(2)} (기대 ≈−8.5)`);
    await ctx.close();
    try { fs.unlinkSync(NEG); } catch (e) {}
  }

  await b.close();
  console.log(`\nVERIFY191 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
