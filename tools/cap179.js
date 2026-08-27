/* 작업 179 캡처 하네스 — 승급전 팝업(openPromo)을 1080×2280 으로 찍고 본문 잉크 높이를 잰다.
   실행: node tools/cap179.js [태그]   → docs/review/179-<태그>.png + 잉크 실측 표(stdout)
   ROUTINE [3]-(가)/(나) 어느 쪽이든 «before/after 2.0±» 게이트의 기준 수치를 여기서 만든다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const TAG = process.argv[2] || 'r1';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => typeof openPromo === 'function' && typeof S === 'object');
  await p.waitForTimeout(900);

  /* 승급 «가능» 상태로 만들어 둔다 — 조건 두 줄이 초록이라야 레퍼런스와 같은 상태다.
     (04 교훈: 캡처 상태가 다르면 그 회차 판정은 통째로 무효다) */
  const info = await p.evaluate(() => {
    S.rank = 0;
    const r = nextRank();
    S.best = Math.max(S.best, r.stage);
    S.stage = Math.max(S.stage, r.stage);
    /* cp()·stat 은 전부 getter 라 대입이 안 먹는다 — 원천인 훈련 레벨을 올려 «진짜로» 조건을 넘긴다 */
    for(let i = 0; i < 400 && cp() < r.cp; i++){ S.lv.atk = (S.lv.atk|0) + 20; S.lv.hp = (S.lv.hp|0) + 20; }
    openPromo();
    return { rank: S.rank, next: r.n, canPromote: canPromote() };
  });
  /* 60 쥬시 «열기» 연출(jz*)이 도는 동안 재면 rect 가 통째로 어긋난다 — 136·221 함정. 정착을 기다린다 */
  await p.waitForFunction(() => {
    const box = document.querySelector('#modal .mbox');
    if (!box) return false;
    return [box, ...box.querySelectorAll('*')].every(n =>
      n.getAnimations().every(a => a.playState !== 'running'));
  }, null, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(350);

  /* 본문 요소별 잉크 높이 — font-size 가 아니라 «실제로 그려진 글자 높이» 를 Range 로 잰다 */
  const ink = await p.evaluate(() => {
    const out = [];
    const box = document.querySelector('#modal .mbox');
    const line = el => {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const rs = [...rg.getClientRects()];
      return rs.length ? Math.max(...rs.map(r => r.height)) : 0;
    };
    box.querySelectorAll('p, h3, .pr-cl b, .pr-cl i, button').forEach((el, i) => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      out.push({
        i, tag: el.tagName.toLowerCase(), cls: el.className || '',
        fs: +cs.fontSize.replace('px', ''), lh: line(el),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26)
      });
    });
    const mb = document.querySelector('#modal .mbody');
    return { rows: out,
      boxH: +box.getBoundingClientRect().height.toFixed(1),
      scrollH: mb.scrollHeight, clientH: mb.clientHeight };
  });

  const f = path.resolve(__dirname, `../docs/review/179-${TAG}.png`);
  await p.locator('#modal').screenshot({ path: f });
  await browser.close();

  console.log(`상태  rank=${info.rank} → ${info.next}  승급가능=${info.canPromote}`);
  console.log(`모달  높이 ${ink.boxH}  본문 scroll ${ink.scrollH} / client ${ink.clientH}` +
    (ink.scrollH > ink.clientH + 1 ? '  ⚠ 넘침(스크롤)' : '  ✓ 한 화면'));
  console.log('  #  tag  fs     행높이   w×h            내용');
  ink.rows.forEach(r => console.log(
    `  ${String(r.i).padStart(2)}  ${r.tag.padEnd(6)}${String(r.fs).padStart(5)}  ` +
    `${r.lh.toFixed(1).padStart(6)}  ${(r.w + '×' + r.h).padEnd(14)} ${r.cls ? '[' + r.cls + '] ' : ''}${r.txt}`));
  console.log(`콘솔 에러 ${errs.length}건` + (errs.length ? '\n  ' + errs.join('\n  ') : ''));
  console.log('CAP179 OK → ' + path.basename(f));
})();
