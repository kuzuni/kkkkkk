/* 364 재현·실측 — 13 재화 탭 광고 상품 레드닷 자리
 *
 *   node tools/probe364.js            수리 후(현행) 상태를 잰다
 *   node tools/probe364.js --shot     + 카드 캡처(shot364.png · shot364-full.png)
 *
 * 처음 판(kkkkkk-30)은 «닷이 어디 있나» 만 찍는 진단이었다. 338 규칙대로 처방을 따르기 전에
 * **재현**부터 하려고, 자리를 고르는 데 필요한 실측을 같은 파일에 붙였다:
 *   [1] 닷 중심의 카드 기준 좌표 + 299 «우상단 사분면» 판정   (수리 전 = (226,229) 우하단 → 위반)
 *   [2] 같은 카드 안 이웃(타이틀 잉크 · 아이콘 · ×N · 버튼)의 bbox — 겹침을 «몇 px» 로 말하려고
 *   [3] 등장 봉우리(jzDotIn 1.3)에서 카드(overflow:hidden, radius 35)에 잘리는지
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const SHOT = process.argv.includes('--shot');
const r2 = n => Math.round(n * 100) / 100;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await p.evaluate(() => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await p.waitForTimeout(600);

  const info = await p.evaluate(() => {
    const ink = el => { if (!el) return null; const r = document.createRange(); r.selectNodeContents(el);
      const b = r.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
    const cards = [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length);
    const rows = cards.map((cd, i) => {
      const cr = cd.getBoundingClientRect();
      const d = cd.querySelector('.updot');
      const rel = el => { if (!el) return null; const r = el.getBoundingClientRect();
        return { x: r.x - cr.x, y: r.y - cr.y, w: r.width, h: r.height }; };
      let dot = null;
      if (d) {
        const prevD = d.style.display, prevA = d.style.animation;
        d.style.display = 'block'; d.style.animation = 'none';   /* jzDotIn 이 scale(0) 에서 시작한다(104 함정) */
        const dr = d.getBoundingClientRect();
        dot = { x: dr.x - cr.x, y: dr.y - cr.y, w: dr.width, h: dr.height,
                host: d.parentElement.className, alert: d.parentElement.classList.contains('alert') };
        d.style.display = prevD; d.style.animation = prevA;
      }
      const ti = ink(cd.querySelector('.hd>i'));
      return {
        id: COIN_ADS[i] && COIN_ADS[i].id, name: COIN_ADS[i] && COIN_ADS[i].n, cap: COIN_ADS[i] && COIN_ADS[i].cap,
        card: { x: cr.x, y: cr.y, w: cr.width, h: cr.height },
        dot,
        title: ti ? { x: ti[0] - cr.x, y: ti[1] - cr.y, w: ti[2], h: ti[3] } : null,
        icon: rel(cd.querySelector('.pn .cic')) || rel(cd.querySelector('.pn>em')),
        qt: rel(cd.querySelector('.qt')), bt: rel(cd.querySelector('.bt'))
      };
    });
    return { rows, css: getComputedStyle(cards[0]).overflow + ' / r' + getComputedStyle(cards[0]).borderTopRightRadius };
  });

  console.log('카드 CSS: overflow ' + info.css);
  let bad = 0;
  info.rows.forEach(r => {
    const c = r.card;
    console.log('\n[' + r.id + '] ' + r.name + ' (cap ' + r.cap + ')  카드 ' + r2(c.w) + '×' + r2(c.h) + ' @ x' + r2(c.x) + ' y' + r2(c.y));
    if (!r.dot) { console.log('  닷 없음'); return; }
    const d = r.dot, cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    const q = cx > c.w / 2 && cy < c.h / 2;
    if (!q) bad++;
    console.log('  닷 호스트 ' + d.host + (d.alert ? ' (.alert)' : ' (.alert 없음!)')
      + '  좌표 x' + r2(d.x) + ' y' + r2(d.y) + ' ' + r2(d.w) + '×' + r2(d.h)
      + '  중심 (' + r2(cx) + ', ' + r2(cy) + ')  → 299 우상단 사분면 ' + (q ? 'OK' : '위반'));
    /* 링(±7.5) + 등장 봉우리 1.3 까지 포함한 실제 잉크 상자 */
    const R = 7.5, k = 1.3;
    const bx = [cx - (d.w / 2 + R) * k, cx + (d.w / 2 + R) * k, cy - (d.h / 2 + R) * k, cy + (d.h / 2 + R) * k];
    console.log('  봉우리1.3 링 포함 x' + r2(bx[0]) + '~' + r2(bx[1]) + ' y' + r2(bx[2]) + '~' + r2(bx[3])
      + '  카드(0~' + r2(c.w) + ' / 0~' + r2(c.h) + ') 밖 = ' + (bx[0] < 0 || bx[1] > c.w || bx[2] < 0 || bx[3] > c.h ? '잘림' : '안 잘림'));
    const near = { 타이틀잉크: r.title, 아이콘: r.icon, '×N': r.qt, 버튼: r.bt };
    Object.keys(near).forEach(k2 => {
      const o = near[k2]; if (!o) return;
      const ov = Math.min(bx[1], o.x + o.w) - Math.max(bx[0], o.x), ovy = Math.min(bx[3], o.y + o.h) - Math.max(bx[2], o.y);
      const hit = ov > 0 && ovy > 0;
      console.log('    ' + k2.padEnd(8) + ' x' + r2(o.x) + '~' + r2(o.x + o.w) + ' y' + r2(o.y) + '~' + r2(o.y + o.h)
        + '  겹침 ' + (hit ? r2(Math.min(ov, ovy)) + 'px ⚠' : '없음(x여유 ' + r2(-ov) + ')'));
      if (hit) bad++;
    });
  });

  if (SHOT) {
    const c0 = info.rows[0].card;
    const shot = await p.screenshot({ clip: { x: c0.x - 10, y: c0.y - 10, width: c0.w + 20, height: c0.h + 20 } });
    fs.writeFileSync(path.join(__dirname, 'shot364.png'), shot);
    const full = await p.screenshot({ clip: { x: 0, y: 300, width: 1080, height: 1400 } });
    fs.writeFileSync(path.join(__dirname, 'shot364-full.png'), full);
    console.log('\nshot364.png · shot364-full.png saved');
  }
  console.log('\n' + (bad ? '⚠ 위반·겹침 ' + bad + '건' : '위반·겹침 0건'));
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
