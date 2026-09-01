#!/usr/bin/env node
/* 작업 656 — 「버튼을 누르면 축소되면서 뒤에 «검정 테두리» 찌꺼기가 비친다」 **재현·전수 스윕**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다.)
 *
 *   node tools/probe656.js                    전 화면 스윕
 *   P656_ONLY=shop node tools/probe656.js     한 화면만
 *
 * ── 자가 둘인 이유 ────────────────────────────────────────────────────────────
 * 1회차 첫 시안은 «눌린 뒤 비운 띠에 새까만 화소가 남았는가» 하나로 쟀다가 **201개 중 180개**를
 * 빨갛게 칠했다 — 8px 가라앉으면 위쪽 띠에 카드 **바깥 배경**이 들어오는데 그 배경도 어두워서
 * 거짓 양성이 쏟아진 것이다. «남은 검정» 은 결함의 **증상**이지 정의가 아니다.
 *
 * 결함의 정의는 구조다 — **버튼의 실루엣을 같이 그리면서 눌림 변형을 안 따라가는 장식 레이어**.
 * 그래서 자를 둘로 나눈다:
 *
 *   [A] 구조 — 누른 버튼의 «쉴 때 상자» 와 같은 자리를 차지하는(±2px) `pointer-events:none`
 *       장식 노드를 전부 세고, 그중 **버튼이 물러나도 제자리에 남은 것**을 이름으로 뱉는다.
 *       거짓 양성이 없고 «몇 자리인가» 가 정확하다(610 꼴 스코프 구멍 방지).
 *   [B] 픽셀 — [A] 가 지목한 자리에서 «쉴 때 검은 획이던 화소가 눌린 뒤에도 새까만가» 를 센다.
 *       주인이 실제로 본 것이 이것이라, 수리 전·후 대조의 증거는 이 수치로 남긴다(350 판).
 *
 * ⚠ 상시 연출(122 광택)이 검은 획 위를 지나며 루마를 +64 까지 들어올린다(`probe122stk`).
 *    측정 직전에 애니메이션을 전부 정지시키는 이유다 — `jz-dn` 은 transition 이라 안 멈춘다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ONLY = process.env.P656_ONLY || '';
const DARK = 40;            /* 새까맣다 = luma ≤ 40 (검정 획 #000 + AA 여유) */
const EDGE = 3;             /* [B] 는 «쉴 때 상자» 안쪽 3px 테두리 띠만 본다 = 획이 있던 자리 */
const PAD = 4;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* ── 화면 목록 — 주인 보강 2 대로 **10 상점 전 서브탭이 1순위**다 ── */
const SCREENS = [
  { id: 'shop', n: '10 상점', subs: true, go: async (p) => { await p.evaluate(() => openShopPage()); } },
  { id: 'hero', n: '06 영웅', go: async (p) => { await p.evaluate(() => document.querySelector('.tab[data-t="hero"]').click()); } },
  { id: 'adv', n: '03 모험', go: async (p) => { await p.evaluate(() => document.querySelector('.tab[data-t="adv"]').click()); } },
  { id: 'box', n: '보물상자', go: async (p) => { await p.evaluate(() => document.querySelector('.tab[data-t="box"]').click()); } },
  { id: 'train', n: '23 훈련', go: async (p) => { await p.evaluate(() => openTrain && openTrain()); } },
  { id: 'quest', n: '22 퀘스트', go: async (p) => { await p.evaluate(() => { const b = document.querySelector('.side .ibtn[data-pop="quest"]'); if (b) b.click(); }); } },
  { id: 'attend', n: '70 출석', go: async (p) => { await p.evaluate(() => { const b = document.querySelector('.side .ibtn[data-pop="attend"]'); if (b) b.click(); }); } },
  { id: 'coll', n: '21 도감', go: async (p) => { await p.evaluate(() => { const b = document.querySelector('.side .ibtn[data-pop="coll"]'); if (b) b.click(); }); } },
  { id: 'rel', n: '89 유물', go: async (p) => { await p.evaluate(() => { document.querySelector('.tab[data-t="box"]').click(); const b = document.querySelector('[data-pop="relic"],#relBtn'); if (b) b.click(); }); } },
];

const FREEZE = `*,*::before,*::after{animation-play-state:paused!important}`;

/* 한 화면 = 「«실루엣 획 사본» 을 가진 버튼 전수 × 눌림 봉우리 한 프레임」

   ⚠ 1회차 첫 시안은 `jzTarget` 로 «보이는 버튼» 을 먼저 훑고 그 안에서 쌍둥이를 찾았는데,
     화면에 따라 그 걸음이 카드 조상까지 올라가 **상점 카드 버튼이 목록에서 통째로 빠졌다**
     (`.cbtn` 15개가 보이는데 후보 0개). 결함의 정의는 «버튼» 이 아니라 **«같은 상자를 그리는 두 노드»**
     이므로 순서를 뒤집는다 — 상자로 색인해 쌍을 먼저 찾고, 그 짝을 눌러 본다. */
async function sweep(page, label, out) {
  await page.evaluate((css) => {
    let s = document.getElementById('p656freeze');
    if (!s) { s = document.createElement('style'); s.id = 'p656freeze'; document.head.appendChild(s); }
    s.textContent = css;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  }, FREEZE);
  await page.waitForTimeout(140);

  /* 쌍 = 「획을 그리는 `pointer-events:none` 장식」 ↔ 「같은 상자(±2px)를 쓰는 눌리는 노드」
     ⚠ 색인은 **회차마다 다시 만든다** — 한 번 눌리면 목록이 통째로 재렌더되는 화면이 있어서
       노드를 캐시해 두면 그 뒤 쌍이 전부 `isConnected:false` 로 빠진다(1회차에 12쌍 중 3쌍만 쟀다).
       자리 순(y, x)으로 정렬해 두므로 재렌더가 나도 i 번째는 같은 자리를 가리킨다. */
  await page.evaluate(() => {
    window.__p656idx = () => {
      const all = [...document.querySelectorAll('#app *')].map((e) => {
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return { e, cs, r };
      }).filter((o) => o.cs.visibility !== 'hidden' && o.cs.display !== 'none' &&
        o.r.width >= 30 && o.r.height >= 18 && o.r.top > -20 && o.r.bottom < innerHeight + 20);
      const key = (r) => Math.round(r.x / 2) + '_' + Math.round(r.y / 2) + '_' + Math.round(r.width / 2) + '_' + Math.round(r.height / 2);
      const byBox = new Map();
      for (const o of all) { const k = key(o.r); if (!byBox.has(k)) byBox.set(k, []); byBox.get(k).push(o); }
      const pairs = [];
      for (const group of byBox.values()) {
        if (group.length < 2) continue;
        const deco = group.filter((o) => o.cs.pointerEvents === 'none' && parseFloat(o.cs.borderTopWidth) > 0);
        const btn = group.filter((o) => o.cs.pointerEvents !== 'none' &&
          (o.cs.cursor === 'pointer' || o.e.tagName === 'BUTTON') &&
          !(typeof jzDead === 'function' && jzDead(o.e)));
        if (!deco.length || !btn.length) continue;
        for (const d of deco) for (const b of btn) {
          if (d.e === b.e || d.e.contains(b.e) || b.e.contains(d.e)) continue;
          pairs.push({ btn: b.e, deco: d.e, y: b.r.y, x: b.r.x });
        }
      }
      pairs.sort((a, b) => a.y - b.y || a.x - b.x);
      window.__p656 = pairs;
      return pairs.length;
    };
  });
  const n = await page.evaluate(() => window.__p656idx());

  for (let i = 0; i < n; i++) {
    const pre = await page.evaluate((i) => {
      window.__p656idx();                       /* 회차마다 다시 색인 — 재렌더에 안 속는다 */
      const p = window.__p656[i];
      if (!p || !p.btn.isConnected || !p.deco.isConnected) return null;
      const r = p.btn.getBoundingClientRect(), q = p.deco.getBoundingClientRect();
      const nm = (e) => (e.id ? '#' + e.id : '') + (String(e.className).trim() ? '.' + String(e.className).trim().replace(/\s+/g, '.') : '') || e.tagName;
      return { key: nm(p.btn), deco: nm(p.deco), x: r.x, y: r.y, w: r.width, h: r.height,
        dx: q.x, dy: q.y, bd: getComputedStyle(p.deco).borderTopWidth + ' ' + getComputedStyle(p.deco).borderTopColor };
    }, i);
    if (!pre) continue;

    const clip = { x: Math.max(0, Math.round(pre.x) - PAD), y: Math.max(0, Math.round(pre.y) - PAD),
      width: Math.min(1080, Math.round(pre.x + pre.w) + PAD) - Math.max(0, Math.round(pre.x) - PAD),
      height: Math.min(2280, Math.round(pre.y + pre.h) + PAD) - Math.max(0, Math.round(pre.y) - PAD) };
    if (clip.width < 20 || clip.height < 20) continue;
    const rest = (await page.screenshot({ clip })).toString('base64');

    /* 제품의 실제 경로로 누른다 — `jzInit` 이 `#app` 캡처 단계에서 듣는 pointerdown */
    const gotDn = await page.evaluate((i) => {
      const p = window.__p656[i];
      p.btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }));
      return !!document.querySelector('.jz-dn');
    }, i);
    await page.waitForTimeout(130);          /* transition .06s + 여유 */

    const post = await page.evaluate((i) => {
      const p = window.__p656[i];
      const r = p.btn.getBoundingClientRect(), q = p.deco.getBoundingClientRect();
      const cb = getComputedStyle(p.btn), cd = getComputedStyle(p.deco);
      return { bx: r.x, by: r.y, bw: r.width, dx: q.x, dy: q.y,
        bsc: cb.scale, btr: cb.translate, dsc: cd.scale, dtr: cd.translate,
        dn: p.btn.classList.contains('jz-dn') };
    }, i);

    const moved = Math.abs(post.bw - pre.w) > 0.5 || Math.abs(post.by - pre.y) > 0.5;
    const decoMoved = Math.abs(post.dx - pre.dx) > 0.5 || Math.abs(post.dy - pre.dy) > 0.5;

    let ghost = null;
    if (moved) {
      const press = (await page.screenshot({ clip })).toString('base64');
      ghost = await page.evaluate(([a, b, clip, R, EDGE, DARK]) => new Promise((res) => {
        const load = (d) => new Promise((r2) => { const im = new Image(); im.onload = () => r2(im); im.src = 'data:image/png;base64,' + d; });
        Promise.all([load(a), load(b)]).then(([ia, ib]) => {
          const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
          const g = cv.getContext('2d');
          g.drawImage(ia, 0, 0); const A = g.getImageData(0, 0, cv.width, cv.height).data;
          g.clearRect(0, 0, cv.width, cv.height); g.drawImage(ib, 0, 0);
          const B = g.getImageData(0, 0, cv.width, cv.height).data;
          const lum = (D, i) => .299 * D[i] + .587 * D[i + 1] + .114 * D[i + 2];
          let base = 0, surv = 0;
          for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
            const gx = clip.x + x, gy = clip.y + y;
            const inBox = gx >= R.x - 1 && gx <= R.x + R.w + 1 && gy >= R.y - 1 && gy <= R.y + R.h + 1;
            const inCore = gx >= R.x + EDGE && gx <= R.x + R.w - EDGE && gy >= R.y + EDGE && gy <= R.y + R.h - EDGE;
            if (!inBox || inCore) continue;        /* «쉴 때 상자» 의 바깥 3px 테두리 띠 = 획이 있던 자리 */
            const i = (y * cv.width + x) * 4;
            if (lum(A, i) > DARK) continue; base++;
            if (lum(B, i) <= DARK) surv++;
          }
          res({ base, surv, r: base ? +(surv / base).toFixed(3) : null });
        });
      }), [rest, press, clip, pre, EDGE, DARK]);
    }

    await page.evaluate(() => dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true })));
    await page.waitForTimeout(50);

    out.push({ screen: label, key: pre.key, deco: pre.deco, bd: pre.bd, gotDn, moved, decoMoved,
      dsc: post.dsc, dtr: post.dtr, ghost });
  }
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof jzTarget === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { S.dia = 9999999; S.gold = 1e12; S.relic = 99999; });

  const out = [];
  for (const sc of SCREENS) {
    if (ONLY && !ONLY.split(',').includes(sc.id)) continue;
    await sc.go(page).catch(() => { });
    await page.waitForTimeout(650);
    if (sc.subs) {
      const cats = await page.$$eval('#shopCats .shp-ct[data-cat]', (els) => els.map((e) => e.dataset.cat)).catch(() => []);
      for (const c of (cats.length ? cats : [null])) {
        if (c) { await page.evaluate((k) => document.querySelector(`#shopCats .shp-ct[data-cat="${k}"]`).click(), c); await page.waitForTimeout(520); }
        await sweep(page, sc.n + '/' + (c || '기본'), out);
      }
    } else await sweep(page, sc.n, out);
  }

  const pressed = out.filter((r) => r.moved);
  const ghosts = pressed.filter((r) => !r.decoMoved);

  console.log('\n=== [A] 구조 — 눌린 버튼의 «쉴 때 상자» 를 같이 그리면서 안 따라간 장식 획 ===\n');
  if (!ghosts.length) console.log('  (없음)');
  for (const r of ghosts)
    console.log('  ' + r.screen.padEnd(14).slice(0, 14) + '  ' + r.key.padEnd(26).slice(0, 26) +
      ' ← ' + r.deco.padEnd(16).slice(0, 16) + ' [' + r.bd + ']  scale ' + r.dsc + ' · translate ' + r.dtr);

  console.log('\n=== [B] 픽셀 — «쉴 때 검은 획» 화소가 눌린 뒤에도 새까만 비율 ===\n');
  console.log('  화면            버튼                        장식             base  surv  ghost');
  for (const r of pressed.slice().sort((a, b) => ((b.ghost && b.ghost.r) || 0) - ((a.ghost && a.ghost.r) || 0)))
    if (r.ghost && r.ghost.base)
      console.log('  ' + r.screen.padEnd(14).slice(0, 14) + '  ' + r.key.padEnd(26).slice(0, 26) + '  ' +
        r.deco.padEnd(15).slice(0, 15) + String(r.ghost.base).padStart(5) + String(r.ghost.surv).padStart(6) +
        '  ' + r.ghost.r.toFixed(3) + (r.ghost.r >= 0.5 ? '  ← 유령' : ''));

  console.log('');
  ok(out.length > 0, '«획 사본 ↔ 버튼» 쌍을 실제로 찾았다', out.length + '쌍');
  ok(pressed.length > 0, '그중 눌러서 물러난 쌍', pressed.length + '쌍');
  ok(true, '[A] **안 따라간 장식 획**', ghosts.length + '쌍 — ' + [...new Set(ghosts.map((g) => g.deco))].join(' / '));
  ok(errs.length === 0, '콘솔 에러 0', errs.length + '건' + (errs[0] ? ' · ' + errs[0].slice(0, 90) : ''));

  await browser.close();
  console.log('\n' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
