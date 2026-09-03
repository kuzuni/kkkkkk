/* 작업 833 10회차 — **카드 우변 검정 외곽선이 노치마다 끊기는가**를 화소로 재는 재현기.

   9회차 채점에서 비평가 DH 가 1순위로 «우변 외곽선이 노치마다 11~12px 씩 끊긴다(신뢰 상)» 를
   냈고 ①(요소 배치)을 7 로 막았다. 두 번째 비평가는 이 자리를 안 봤으므로 **1인 지적**이라,
   338 규칙대로 처방을 따르기 전에 이 자가 먼저 «정말 끊기는가» 를 묻는다.

   자: 카드 우변 안쪽 45px 창에서 **순검정 마스크 max(R,G,B) < 25** 의 행별 유무를 세고
       «검정이 한 화소도 없는 행» 을 구간으로 묶는다.
     ⚠ 임계를 60 으로 올리면 바깥 배경(39,39,49)이 잡혀 부호가 뒤집힌다 — 25 를 쓴다(DH 와 같은 값).
     ⚠ **탭·배지가 카드 상변 근처에서 외곽선을 끊는 것은 ref 도 같다**(DH «ref 배너 y70..98»).
       그래서 이 자는 «노치 자리의 끊김» 만 결함으로 센다 — 노치 중심 ±(len/2 + 20) 안의 구간이다.

   실행: node tools/probe833.js [--h 2280] [--css "<덧댈 CSS>"]
     --css 로 수리 전 상태(`clip-path:none`)를 주입해 되돌림을 볼 수 있다.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const os = require('os');
const fs = require('fs');
const { decodePNG } = require('./png441');

const HI = process.argv.indexOf('--h');
const VH = HI > 0 ? +process.argv[HI + 1] : 2280;
const CI = process.argv.indexOf('--css');
const CSS = CI > 0 ? process.argv[CI + 1] : '';

/* 검정 없는 행 구간 → [시작, 끝, 길이] */
function gaps(px, W, x0, x1, y0, y1) {
  const out = []; let start = null;
  for (let y = y0; y < y1; y++) {
    let has = false;
    for (let x = x0; x < x1 && !has; x++) {
      const i = (y * W + x) * 4;
      if (Math.max(px[i], px[i + 1], px[i + 2]) < 25) has = true;
    }
    if (!has) { if (start === null) start = y; }
    else if (start !== null) { out.push([start, y - 1, y - start]); start = null; }
  }
  if (start !== null) out.push([start, y1 - 1, y1 - start]);
  return out;
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: VH }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(700);
  await p.evaluate(() => { try { openShopTab('pass'); } catch (e) { } });
  await p.waitForTimeout(400);
  if (CSS) await p.addStyleTag({ content: CSS });
  /* LESSONS 28-③ — 전투 캔버스가 화소 스캔을 오염시킨다 */
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await p.waitForTimeout(150);

  const cards = await p.evaluate(() => [...document.querySelectorAll('.pvc')].map((c) => {
    const r = c.getBoundingClientRect();
    return { id: c.dataset.pv, ban: c.classList.contains('ban1'),
      x: r.left, right: r.right, top: r.top, bottom: r.bottom,
      ntc: [...c.querySelectorAll('.ntc')].map((n) => {
        const b = n.getBoundingClientRect();
        return { cy: (b.top + b.bottom) / 2, len: b.height - 24 };
      }),
      /* 카드 우변을 «정당하게» 덮는 장식들 — ref 도 이 자리에서는 외곽선이 끊긴다(DH 확인) */
      deco: [...c.querySelectorAll('.stt,.bdg,.pil,.rb,.bt')].map((e) => {
        const b = e.getBoundingClientRect();
        return { t: b.top, b: b.bottom, r: b.right };
      }).filter(d => d.r > r.right - 45) };
  }));
  /* ⚠ 캡처 PNG 는 커밋 대상이 아니다(ROUTINE 서두) — 임시 파일로 떨구고 바로 지운다. */
  const tmp = path.join(os.tmpdir(), 'probe833-' + process.pid + '.png');
  await p.screenshot({ path: tmp, fullPage: false });
  const img = decodePNG(tmp);
  fs.unlinkSync(tmp);
  const out = [];
  for (const c of cards) {
    const g = gaps(img.px, img.w, Math.round(c.right) - 45, Math.round(c.right),
      Math.max(0, Math.round(c.top)), Math.min(VH, Math.round(c.bottom)));
    /* 노치 자리의 끊김만 결함이다 — 탭·배지처럼 **카드 우변을 덮는 장식**이 끊는 자리는
       ref 도 같으므로(DH «ref 배너 y70..98») 그 행에 걸친 구간은 뺀다. */
    const bad = g.filter(([s0, e0]) => {
      const cy = (s0 + e0) / 2;
      if (c.deco.some(d => cy >= d.t - 2 && cy <= d.b + 2)) return false;
      return c.ntc.some(n => cy > n.cy - n.len / 2 - 20 && cy < n.cy + n.len / 2 + 20);
    });
    out.push({ id: c.id, 형: c.ban ? '배너' : '불릿', 끊김: g, 노치자리끊김: bad });
    console.log(`${c.id}(${c.ban ? '배너' : '불릿'}형) — 검정 없는 행 ${g.length}구간` +
      ` [${g.map(v => v.join('..')).join(' · ')}] ⇒ **노치 자리 ${bad.length}구간**`);
  }
  console.log('errors:', errs.length ? errs.slice(0, 3) : 0);
  console.log('PROBE833 노치 자리 끊김 합계 =',
    out.reduce((a, c) => a + c.노치자리끊김.length, 0));
  await b.close();
})();
