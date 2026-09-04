/* 작업 151 — 10 상점 «이용권» 탭 카드 캡처 + 기하 덤프 (1080×2280).
   레퍼런스 docs/ref/151-이용권-카드.png 는 «카드 2장만» 잘라 낸 504×705 이미지다 —
   전체 화면 스크린샷이 아니므로 «프레임 y = ref y − 84» 변환은 이 작업에 해당하지 않는다.
   비교는 «카드 하나» 단위로, 카드 폭을 1 로 놓은 비율로 한다(측정표 §7).

   진입: 정식 경로 openShopTab('pass') — 164 가 만든 공용 헬퍼(사용자와 같은 경로).
   LESSONS 28-③ — 전투 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨긴다.
   LESSONS 51-③ · 149-1 — 유휴 루프·상시 연출·등장 애니메이션이 걸린 채로 재면 다른 것을 잰다.

   실행: node tools/cap151.js [출력경로] [--geo] [--own] [--crop]
     --own   3종 이용권을 «보유 중» 상태로 만들어 잡는다(상태 탭 «이용 중» 확인용)
     --crop  카드 3장 영역만 잘라 따로 저장한다(<출력>-c1/-c2/-c3.png)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const out = process.argv[2] || 'docs/review/151-r1.png';
const GEO = process.argv.includes('--geo');
const OWN = process.argv.includes('--own');
const CROP = process.argv.includes('--crop');
/* 667 7회차 — 등재문이 «비평 2인 ≥9 통과 회차(9:19·9:13.3 두 프레임)» 를 요구하는데
   이 자는 2280 한 프레임만 찍고 있었다(1~6회차가 전부 9:19 만 채점한 뿌리).
   ⚠ 세로만 바꾼다 — 폭 1080 은 고정이다(지시서 [2] «절대 전체를 비율로 축소하지 마라»). */
const HI = process.argv.indexOf('--h');
const VH = HI > 0 ? +process.argv[HI + 1] : 2280;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: VH }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  await p.evaluate((own) => {
    S.dia = 3e5; S.gold = 1e9;
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; });
    document.querySelectorAll('#tabbar .tab').forEach((x) => x.classList.remove('fresh'));
    if (own && typeof window.devBuyPass === 'function') PASS_ITEMS.forEach((q) => window.devBuyPass(q.id));
    openShopTab('pass');                       /* 164 공용 헬퍼 — 닫힌 상태에서도 이용권 탭에 착지 */
  }, OWN);
  await p.waitForTimeout(1000);

  /* 정지 캡처: 유휴 루프·전투 캔버스·60 쥬시 등장 애니메이션 정지 */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
  });
  await p.waitForTimeout(150);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = { frameH: +A.height.toFixed(1) };
    const box = (r) => ({
      x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1)
    });
    const R = (k, sel, root) => {
      const e = (root || document).querySelector(sel); if (!e) { g[k] = null; return null; }
      g[k] = box(e.getBoundingClientRect()); return e;
    };
    R('shopw', '#shopw'); R('list', '.shp-list'); R('cats', '.shp-cats');
    R('title', '.cn-ti>i'); R('hd', '.cn-hd>i'); R('ribbon', '.cn-rb');
    const sub = (c, sel) => { const e = c.querySelector(sel); return e ? box(e.getBoundingClientRect()) : null; };
    g.cards = [...document.querySelectorAll('.pvc')].map((c) => {
      const o = box(c.getBoundingClientRect());
      o.id = c.dataset.pv;
      /* 901 — 카드의 «형»(배너형/불릿형)을 가르는 축은 **실제 클래스**다.
         `scan833.py` 가 `c['cls']` 로 그것을 물었는데 이 덤프에 없어 «우리» 절이
         한 번도 안 돌았다(`KeyError: 'cls'`). id 문자열 관례(`ban1` 이 아니라
         `noads`)로 가르는 길도 있었지만, 형을 정하는 것은 CSS 의 `.pvc.ban1` 이므로
         그 클래스를 그대로 넘긴다 — 카드가 늘어도 자를 안 고친다. */
      o.cls = [...c.classList];
      o.own = c.classList.contains('own');
      o.stt = sub(c, '.stt'); o.sttI = sub(c, '.stt>i');
      o.bdg = sub(c, '.bdg'); o.bdgI = sub(c, '.bdg>i');
      o.pil = sub(c, '.pil'); o.pilI = sub(c, '.pil>i');
      o.ti = sub(c, '.pvt>i'); o.bd = sub(c, '.bd');
      o.art = sub(c, '.art');
      o.rb1 = sub(c, '.rb1'); o.rb2 = sub(c, '.rb2');
      o.bt = sub(c, '.bt'); o.btI = sub(c, '.bt>i');
      o.lines = [...c.querySelectorAll('.pvb')].map((l) => box(l.getBoundingClientRect()));
      return o;
    });
    g.scrollTop = document.getElementById('shopList').scrollTop;
    g.listH = document.getElementById('shopList').scrollHeight;
    return g;
  });

  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '..', out) });
  if (CROP) {
    /* 카드마다 «그 카드가 온전히 보이는 위치» 로 리스트를 굴린 뒤 잘라낸다.
       1회차 크롭은 스크롤 없이 잘라 **3장째가 하단 탭바에 가려** 비평가가 채점을 못 했고,
       위 여백도 30px 뿐이라 카드 윗변 밖으로 나온 상태 탭·가치 배지가 잘렸다(비평 A ⑪). */
    for (let i = 0; i < geo.cards.length; i++) {
      const c0 = geo.cards[i];
      const want = Math.max(0, c0.y - 300);
      await p.evaluate((t) => { document.getElementById('shopList').scrollTop = t; }, want);
      await p.waitForTimeout(120);
      const c = await p.evaluate((id) => {
        const A = document.getElementById('app').getBoundingClientRect();
        const e = document.querySelector('.pvc[data-pv="' + id + '"]').getBoundingClientRect();
        return { x: e.left - A.left, y: e.top - A.top, w: e.width, h: e.height };
      }, c0.id);
      const app = await p.locator('#app').boundingBox();
      /* 901 — 크롭 원점을 **한 곳에서** 계산해 클립과 기하 덤프가 같은 수를 쓰게 한다.
         `scan833.py` 는 크롭-로컬 카드 상자(`c['card']`)를 묻는데 덤프에 없어
         `cls` 바로 다음 줄에서 또 죽었다(첫 키가 가려 안 보이던 둘째 결손).
         형제 자 `scan833b.py` 는 그 자리를 상수 `CROP_DX,CROP_DY = 40,80` 으로
         때웠지만, 그 둘은 **여기서 정해지는 값**이라 이 줄이 바뀌면 조용히 어긋난다.
         ⇒ 상수를 베끼게 두지 말고 실제 원점을 같이 실어 보낸다. */
      const ox = Math.max(0, c.x - 40), oy = Math.max(0, c.y - 80);
      const cw = Math.min(1080 - ox, c.w + 80), ch = c.h + 110;
      c0.card = { x: +(c.x - ox).toFixed(1), y: +(c.y - oy).toFixed(1), w: +c.w.toFixed(1), h: +c.h.toFixed(1) };
      c0.crop = { x: +ox.toFixed(1), y: +oy.toFixed(1), w: +cw.toFixed(1), h: +ch.toFixed(1) };
      await p.screenshot({
        path: path.resolve(__dirname, '..', out.replace(/\.png$/, '-c' + (i + 1) + '.png')),
        clip: { x: app.x + ox, y: app.y + oy, width: cw, height: ch }
      });
    }
    await p.evaluate(() => { document.getElementById('shopList').scrollTop = 0; });
  }
  if (GEO) console.log(JSON.stringify(geo, null, 1));
  console.log('errors:', errs.length ? errs.slice(0, 5) : 0);
  console.log('saved', out, 'frameH', geo.frameH, 'cards', geo.cards.length);
  await b.close();
})();
