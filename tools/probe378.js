/* 작업 378 — «끝 칸이 활성일 때 알약의 검정 7px 이 셸 테두리에 겹쳐 검정이 13px 이 된다» 재현기.
 *
 *   node tools/probe378.js
 *
 * ⚑ 338·341·350·363·368 규칙 — **처방을 따르기 전에 재현한다.** 등재문(352 §8)은 «우리 10 상점
 *    좌변에서 검정 ×13» 을 한 자리에서 한 번 쟀다. 그 한 자리가 부품 전체의 이야기인지,
 *    그리고 «가운데 칸은 ref 에도 검정 7 이 있다»(측정표 07 §9)는 음성 대조가 실제로 성립하는지를
 *    **찍힌 픽셀**로 확인하는 것이 이 도구의 일이다(선언만 보면 자식이 덮은 자리를 못 본다 — 350 처방).
 *
 * 재는 것 — 호스트 6곳 × 칸 전부를 차례로 활성으로 만들고, **바 세로 한복판 행**에서
 *   좌변 바깥 → 안쪽 24px · 우변 바깥 → 안쪽 24px 의 색 런렝스를 찍는다.
 *   · 끝 칸이 활성인 면  = 알약이 셸 안쪽 변에 닿는 면  → 여기가 등재문이 말하는 자리
 *   · 그 밖의 면        = 알약이 안 닿는 면(셸 림이 보인다) → **음성 대조**
 *
 * 판정은 안 한다(probe 다). 숫자만 찍고 verify378 이 그 숫자를 문다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '378-probe.png');

/* 호스트 — verify352 의 목록과 같은 진입 경로를 쓴다(부품이 하나임을 그 게이트가 이미 못박았다). */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const chan = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const close = (a, b, tol) => chan(a).every((v, i) => Math.abs(v - chan(b)[i]) <= tol);

/* 런렝스 — 이웃 색이 채널 ±6 안이면 같은 런으로 본다(둥근 모서리·JPEG 없는 PNG 라도
   그라디언트 보간이 1px 섞인다. verify352 가 쓴 tol 과 같은 급). */
function runs(cols) {
  const out = [];
  for (const c of cols) {
    if (out.length && close(out[out.length - 1].hex, c, 6)) { out[out.length - 1].n++; continue; }
    out.push({ hex: c, n: 1 });
  }
  return out;
}
const fmt = rs => rs.map(r => r.hex + '×' + r.n).join(' → ');

/* 찍힌 픽셀 — 캡처를 data URL 로 페이지에 되돌려 읽는다(350 처방). */
async function readRow(page, y, xs) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, yy, xx]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(xx.map(x => {
        const d = g.getImageData(x, yy, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, y, xs]);
}

/* 활성 칸을 n 번째로 옮긴다 — 라벨 외곽선(ol3/ol4)까지 같이 갈아 실제 클릭과 같은 그림을 만든다. */
const SETON = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  if (!cells[i]) return null;
  cells.forEach((c, j) => {
    c.classList.toggle('on', j === i);
    const ink = c.querySelector('i');
    if (ink) { ink.classList.toggle('ol4', j === i); ink.classList.toggle('ol3', j !== i); }
  });
  return true;
};

/* ⚑ 되읽기 — «내가 켠 칸» 이 아니라 **지금 실제로 켜져 있는 칸**을 돌려준다.
   23 훈련(#trSubs) 처럼 renderUI() 가 매 틱 상태에서 `.on` 을 다시 그리는 바는 클래스 주입이
   되돌려진다. 그것을 모르고 재면 «칸2 를 쟀다» 면서 실은 칸1 을 찍는다(1회차에 그랬다). */
const READBACK = ([sel]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const idx = cells.findIndex(c => c.classList.contains('on'));
  if (idx < 0) return null;
  const bb = bar.getBoundingClientRect();
  const ob = cells[idx].getBoundingClientRect();
  return {
    bar: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
    cell: { x: ob.x, w: ob.width },
    border: parseFloat(getComputedStyle(bar).borderLeftWidth),
    n: cells.length, idx,
    label: (cells[idx].querySelector('i') || {}).textContent || '',
    shadow: getComputedStyle(cells[idx]).boxShadow,
  };
};

/* 입장 연출 settle — verify47 과 같은 것. 안 기다리면 `jzPgIn` 이 바를 아직 축소해 놓아
   테두리가 6 이 아니라 3 으로 찍힌다(1회차 10 상점에서 그랬다 — 결함이 아니라 연출 중 프레임). */
const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });

    console.log('\n378 재현 — 바 세로 한복판 행, 바 «바깥» 변에서 안쪽으로 24px');
    console.log('  ref(352 §8 · 03 활성 끝 칸) = #000000 ×6(+AA) → 베벨 → 면 #4B3E2D');
    console.log('  즉 ref 는 끝 면에서 검정을 겹치지 않는다 (셸 테두리가 알약의 그 변을 겸한다)\n');

    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { console.log(name + ' 진입 실패 — ' + e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const n = await page.evaluate(([s]) => {
        const b = document.querySelector(s);
        return b ? b.querySelectorAll(':scope > .stab').length : 0;
      }, [sel]);
      if (!n) { console.log(name + ' — 바 없음'); continue; }
      console.log('── ' + name + ' (' + sel + ', ' + n + '칸)');
      for (let i = 0; i < n; i++) {
        if (!await page.evaluate(SETON, [sel, i])) continue;
        await page.waitForTimeout(200);
        await page.evaluate(SETTLE);
        const g = await page.evaluate(READBACK, [sel]);
        if (!g) continue;
        if (g.idx !== i) { console.log('  칸' + (i + 1) + ' — 주입이 되돌려졌다(renderUI 가 상태에서 다시 그린다) → 실제 활성 칸' + (g.idx + 1) + ' · 건너뛴다'); continue; }
        const y = Math.round(g.bar.y + g.bar.h / 2);
        const x0 = Math.round(g.bar.x), x1 = Math.round(g.bar.x + g.bar.w) - 1;
        const px0 = Math.round(g.cell.x), px1 = Math.round(g.cell.x + g.cell.w) - 1;
        /* ⚑ **한 장으로 다 읽는다.** readRow 를 네 번 부르면 캡처도 네 장이고, 그 사이에
           renderUI 가 `.on` 을 되돌리면 «칸2 를 쟀다» 면서 실은 칸1 그림을 찍는다(2회차에 그랬다 —
           되읽기는 통과했는데 픽셀은 칸1 이었다). 캡처는 한 장 · 그 캡처 **뒤에 되읽기를 한 번 더** 한다. */
        const all = await readRow(page, y, [
          ...Array.from({ length: 24 }, (_, k) => x0 + k),
          ...Array.from({ length: 24 }, (_, k) => x1 - k),
          ...Array.from({ length: 20 }, (_, k) => px0 + k),
          ...Array.from({ length: 20 }, (_, k) => px1 - k),
        ]);
        const g2 = await page.evaluate(READBACK, [sel]);
        if (!g2 || g2.idx !== i) { console.log('  칸' + (i + 1) + ' — 캡처 도중 활성이 되돌려졌다 → 건너뛴다'); continue; }
        const L = all.slice(0, 24), R = all.slice(24, 48);
        const PL = all.slice(48, 68), PR = all.slice(68, 88);
        /* 이 면에 알약이 닿는가 — 칸 변이 셸 콘텐츠 변과 같은가 */
        const cL = g.bar.x + g.border, cR = g.bar.x + g.bar.w - g.border;
        const touchL = Math.abs(g.cell.x - cL) <= 0.6;
        const touchR = Math.abs(g.cell.x + g.cell.w - cR) <= 0.6;
        const blk = rs => (rs[0] && close(rs[0].hex, '#000000', 8)) ? rs[0].n : 0;
        const rl = runs(L), rr = runs(R);
        console.log('  활성 칸' + (i + 1) + ' «' + g.label + '»  칸 ' + f1(g.cell.x - g.bar.x) + '..' + f1(g.cell.x + g.cell.w - g.bar.x));
        console.log('     좌' + (touchL ? ' [알약이 닿는 면]' : ' [안 닿음 — 음성 대조]') + ' 검정 ' + blk(rl) + 'px : ' + fmt(rl.slice(0, 5)));
        console.log('     우' + (touchR ? ' [알약이 닿는 면]' : ' [안 닿음 — 음성 대조]') + ' 검정 ' + blk(rr) + 'px : ' + fmt(rr.slice(0, 5)));
        /* ⚑ 양성 대조 — 셸 변에 **안 닿는** 알약 변에서는 «검정 7 + 베벨 7» 이 그대로 있어야 한다
           (측정표 07 §9 «좌우 테두리 7px #000000» — 처방은 «지우기» 가 아니다). */
        if (!touchL) console.log('       └ 알약 좌변 안쪽 [양성 대조] : ' + fmt(runs(PL).slice(0, 4)));
        if (!touchR) console.log('       └ 알약 우변 안쪽 [양성 대조] : ' + fmt(runs(PR).slice(0, 4)));
      }
      console.log('');
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
