/* 작업 122 — «사양대로 적었는데 눈에 안 보이는» 항목 4건 런타임 실측 (13회차 신설).

   10회차 채점(AC·AD)이 남긴 잔여 지적 중 4건은 «CSS 에는 값이 적혀 있는데 실측이 그 근처도
   아니다» 는 종류다. 눈으로 세지 말고 **계산된 값(getComputedStyle)과 실제 화면 bbox** 를
   한 주기 전체에서 뽑아 «적힌 값 / 계산된 값 / 실제 움직인 양» 셋을 나란히 놓는다.

     ⓐ 쿠폰 뱃지 흔들림 — CSS ±4° · 비평가 실측 ≤0.5°
     ⓑ 마일리지 [교환] 펄스 — 비평가 실측 ±0.8%
     ⓒ 소환 [무료] 링 — 비평가 실측 +3.1% (사실상 미구현)
     ⓓ 재화 아이콘 둥실 — CSS 총 8px · 사양 6px

   실행: node tools/probe122c.js
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const n = a.animationName || '';
    if (/^jz122/.test(n)) { try { a.pause(); a.currentTime = t; } catch (_) {} }
    else { try { a.finish(); } catch (_) { try { a.cancel(); } catch (_) {} } }
  });
}, ms);

/* 한 주기를 24등분해 «계산된 rotate/translate/scale» 과 bbox 를 뽑는다 */
async function sweep(p, sel, periodMs, props) {
  const N = 24;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const t = Math.round(periodMs * i / N);
    await seek(p, t);
    const r = await p.evaluate(([s, ps]) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const cs = getComputedStyle(e), b = e.getBoundingClientRect();
      const o = { t: 0, x: b.x, y: b.y, w: b.width, h: b.height };
      for (const k of ps) o[k] = cs[k];
      return o;
    }, [sel, props]);
    if (r) { r.t = t; rows.push(r); }
  }
  return rows;
}

const span = (rows, k) => {
  const vs = rows.map(r => parseFloat(r[k])).filter(v => !isNaN(v));
  return vs.length ? { lo: Math.min(...vs), hi: Math.max(...vs), d: Math.max(...vs) - Math.min(...vs) } : null;
};
const show = (label, rows, keys) => {
  console.log('\n' + label + '  (' + rows.length + '표본)');
  for (const k of keys) {
    const s = span(rows, k);
    console.log('   ' + k.padEnd(12) + (s ? s.lo.toFixed(2) + ' … ' + s.hi.toFixed(2) + '  (진폭 ' + s.d.toFixed(2) + ')' : '없음'));
  }
  const raw = [...new Set(rows.map(r => r.rotate).filter(Boolean))];
  if (raw.length) console.log('   rotate 원값 ' + (raw.length > 4 ? raw.length + '종: ' + raw.slice(0, 4).join(' | ') + ' …' : raw.join(' | ')));
  const tr = [...new Set(rows.map(r => r.translate).filter(Boolean))];
  if (tr.length) console.log('   translate 원값 ' + (tr.length > 4 ? tr.length + '종: ' + tr.slice(0, 4).join(' | ') + ' …' : tr.join(' | ')));
  const sc = [...new Set(rows.map(r => r.scale).filter(Boolean))];
  if (sc.length) console.log('   scale 원값 ' + (sc.length > 4 ? sc.length + '종: ' + sc.slice(0, 4).join(' | ') + ' …' : sc.join(' | ')));
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });

  console.log('===== 소환 탭 =====');
  console.log('ⓒ [무료] 링 — .shp-card .cbtn.b1:not(.lack) (jz122Ring 0.9s)');
  const free = await p.evaluate(() => !!document.querySelector('#shopList .shp-card .cbtn.b1:not(.lack)'));
  if (!free) console.log('   ⚠ 무료 남은 칸이 없다 — 측정 불가');
  else {
    const rows = await sweep(p, '#shopList .shp-card .cbtn.b1:not(.lack)', 900, ['boxShadow', 'scale', 'rotate', 'translate']);
    show('   [무료] 버튼', rows, ['w', 'h']);
    /* 링은 box-shadow 로 그린다 — 퍼짐 반경(spread) 을 뽑는다 */
    const bs = rows.map(r => r.boxShadow);
    const nums = bs.map(s => (String(s).match(/-?[\d.]+px/g) || []).map(parseFloat));
    const last = nums.map(a => a.length ? a[a.length - 1] : null);
    console.log('   box-shadow 마지막 길이값(퍼짐) ' + Math.min(...last) + ' … ' + Math.max(...last)
      + '  (진폭 ' + (Math.max(...last) - Math.min(...last)) + 'px)');
    console.log('   box-shadow 원값 표본 t=0    : ' + bs[0]);
    console.log('   box-shadow 원값 표본 t=' + rows[Math.floor(rows.length / 2)].t + ' : ' + bs[Math.floor(bs.length / 2)]);
  }

  console.log('\n===== 재화 탭 =====');
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });

  const cp = await p.evaluate(() => {
    const e = document.querySelector('#shopList .cn-cd>.cp');
    if (!e) return null;
    const cs = getComputedStyle(e);
    return { d: cs.getPropertyValue('--jz-d'), amp: cs.getPropertyValue('--jz-amp'),
             delay: cs.animationDelay, name: cs.animationName, dur: cs.animationDuration,
             n: document.querySelectorAll('#shopList .cn-cd>.cp').length };
  });
  console.log('ⓐ 쿠폰 뱃지 — .cn-cd>.cp  ' + JSON.stringify(cp));
  if (cp) {
    const rows = await sweep(p, '#shopList .cn-cd>.cp', 3000, ['rotate', 'translate', 'scale']);
    show('   뱃지 1번', rows, ['x', 'y', 'w', 'h']);
  }

  const ml = await p.evaluate(() => !!document.querySelector('#shopList .cn-ml:not(.off)>.ex'));
  console.log('\nⓑ 마일리지 [교환] 펄스 — .cn-ml:not(.off)>.ex (jz122Ring2 1.2s) · 대상 ' + ml);
  if (ml) {
    const rows = await sweep(p, '#shopList .cn-ml:not(.off)>.ex', 1200, ['boxShadow', 'scale']);
    show('   [교환] 버튼', rows, ['w', 'h']);
    const bs = rows.map(r => r.boxShadow);
    console.log('   box-shadow 원값 t=0    : ' + bs[0]);
    console.log('   box-shadow 원값 t=' + rows[Math.floor(rows.length / 2)].t + ' : ' + bs[Math.floor(bs.length / 2)]);
  }

  console.log('\nⓓ 재화 아이콘 둥실 — .cn-cd>.pn>em (jz122Float 2.6s)');
  const rows = await sweep(p, '#shopList .cn-cd>.pn>em', 2600, ['translate', 'rotate', 'scale']);
  show('   아이콘 1번', rows, ['y', 'h']);

  await b.close();
})();
