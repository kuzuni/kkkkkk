/* 캡처 하네스 669 — 10 상점 소환 탭의 «Lv.n» 알약 · 경험치 게이지 글씨 채점본.
 *
 * 낸다:
 *   docs/review/669-r<n>-2280.png     9:19 전체 화면(소환 탭)
 *   docs/review/669-r<n>-1600.png     9:13.3 전체 화면(소환 탭)
 *   docs/review/669-r<n>-cmp.png      **수리 전 ↔ 수리 후 나란히 대조**(같은 카드 하단 띠, 2배 확대)
 *
 * ⚠ 411 교훈 — «나란히 안 놓으면 어긋남이 안 보인다». 크기 채점은 대조본이 본체다.
 * ⚠ 캡처 PNG 는 커밋하지 않는다(ROUTINE 서두 · `.gitignore` 가 `docs/review/*.png` 를 막는다).
 *
 * 실행: node tools/cap669.js [회차번호]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '../docs/review');
/* 수리 전 값 — 되돌림 오버라이드(제품은 안 건드린다) */
/* ⚠ 2회차부터는 **그릇도** 되돌려야 진짜 BEFORE 다 — 바 33/369 을 같이 안 되돌리면
   «새 그릇 + 옛 글씨» 라는 존재한 적 없는 장을 대조본에 싣게 된다. */
const OLD = '.shp-card .clv>i{font-size:23px !important}'
  + '.shp-card .cbar>b{font-size:20px !important;line-height:33px !important;'
  + 'transform:translateY(2px) scaleX(.85) !important}'
  + '.shp-card .cbar,.shp-card .stkbar{top:369px !important;height:33px !important}';

async function prep(p) {
  await p.evaluate(() => { S.dia = 2e6; S.gold = 1e9; S.daily = S.daily || {}; S.daily.freeSum = {}; openShopPage(); });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    /* 채점본은 «지금 화면» 이라 카드 필터·광택은 그대로 둔다 — 정지만 시킨다(60 쥬시 스태거) */
    const st = document.createElement('style'); st.id = 'c669stop';
    st.textContent = '*{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
    /* 주인 표본과 같은 상태: 소환 레벨 31 · 경험치 655/6710 */
    BKEYS.forEach(k => { S.sum[k].lv = 31; S.sum[k].exp = 655; }); renderShopPage();   /* 714 — 배너 칸 다섯 */
  });
  await p.waitForTimeout(400);
}

(async () => {
  const b = await launch(chromium);
  const shots = {};
  for (const F of [{ w: 1080, h: 2280, k: '2280' }, { w: 1080, h: 1600, k: '1600' }]) {
    const ctx = await b.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.waitForTimeout(900);
    await prep(p);
    const f = OUT + '/669-r' + R + '-' + F.k + '.png';
    await p.screenshot({ path: f });
    console.log('  ' + f);

    if (F.k === '2280') {
      /* 대조본 — 카드 하단 띠(알약+게이지)를 수리 전·후로 한 장씩, 2배로 키워 위아래로 붙인다 */
      const rc = await p.evaluate(() => {
        const c = document.querySelector('#shopList .shp-card').getBoundingClientRect();
        const g = document.querySelector('#shopList .shp-card .cbar').getBoundingClientRect();
        return { x: Math.round(c.left) + 20, y: Math.round(g.top) - 24, w: 460, h: 82 };
      });
      const clip = { x: rc.x, y: rc.y, width: rc.w, height: rc.h };
      const after = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate((t) => { const s = document.createElement('style'); s.id = 'c669old'; s.textContent = t; document.head.appendChild(s); }, OLD);
      await p.waitForTimeout(200);
      const before = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate(() => { const s = document.getElementById('c669old'); if (s) s.remove(); });
      await p.waitForTimeout(150);

      const png = await p.evaluate(async ({ a, b, w, h }) => {
        const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
        const [A, B] = await Promise.all([load(a), load(b)]);
        const K = 2, PADT = 40;
        const cv = document.createElement('canvas');
        cv.width = w * K; cv.height = (h * K + PADT) * 2;
        const x = cv.getContext('2d');
        x.imageSmoothingEnabled = false;
        x.fillStyle = '#1b1b1b'; x.fillRect(0, 0, cv.width, cv.height);
        x.fillStyle = '#fff'; x.font = 'bold 26px sans-serif';
        x.fillText('BEFORE (수리 전)', 12, 28);
        x.drawImage(B, 0, PADT, w * K, h * K);
        x.fillText('AFTER (수리 후)', 12, h * K + PADT + 28);
        x.drawImage(A, 0, h * K + PADT * 2, w * K, h * K);
        return cv.toDataURL('image/png').split(',')[1];
      }, { a: after, b: before, w: rc.w, h: rc.h });
      const f2 = OUT + '/669-r' + R + '-cmp.png';
      fs.writeFileSync(f2, Buffer.from(png, 'base64'));
      console.log('  ' + f2);
      shots.cmp = f2;
    }
    await ctx.close();
  }
  await b.close();
  console.log('CAP669 r' + R + ' 완료');
})();
