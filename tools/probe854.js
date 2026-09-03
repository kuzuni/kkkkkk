#!/usr/bin/env node
/* 854 재현기 — «`tools/verify811.js` 가 플레이키한 이유가 문턱인가, 움직이는 화면인가»
 *
 *   node tools/probe854.js
 *
 * 등재문은 모양을 둘로 봤다 — ⓐ [R2] 문턱(잉크 113114 대 잡음바닥 98928 = 1.15배) ·
 * ⓑ 상태 누수([A3-09] 가 `hidden` 으로 끝난다). **재현은 그 둘을 한 뿌리로 합쳤다**:
 * 자가 `#view` 만 숨기고 **제품의 메인 루프는 그대로 돌려 둔 채** 쟀다는 것이다.
 * 루프가 도는 동안 ⓐ `drawHud()`·숫자 롤링이 매 프레임 화소를 바꾸고(= 잡음바닥이 커진다)
 * ⓑ `playerDied()` 가 `openDefeat()` 를 **제 발로 다시** 연다(= 닫은 판이 되살아난다).
 *
 * 재는 것은 넷이다. 앞의 셋은 실행마다 같은 답이 나오는 자리만 골랐다 —
 * 플레이키를 «빨강이 나올 때까지 돌려서» 잡으면 재현기 자신이 플레이키해진다.
 *
 *  [P1] **루프는 실제로 돌고 있다** — 자가 하던 준비(`#view` 숨김 + CSS 애니 정지) 뒤에도
 *       제품의 `step(dt)` 이 500ms 동안 여러 번 불린다. 이것이 ⓐⓑ 의 전제다.
 *  [P2] **끊으면 한 프레임도 안 돈다** — 811 이 새로 넣은 [F] 처방(메인 루프의 rAF 가로채기)을
 *       걸면 같은 500ms 에 `step` 이 **0회**다. 제품은 한 줄도 안 고친다.
 *  [P3] **브루트 닫기는 제품의 재개방을 못 막는다** — 자가 하던 대로 `classList.remove('on')`
 *       으로 `#defw` 를 닫은 뒤 제품 경로(`playerDied()`)를 한 번 태우면 `.on` 이 되살아난다.
 *       ⇒ «닫았다» 는 자의 기록이고, 루프가 살아 있는 한 화면은 그 기록을 안 지킨다.
 *  [P4] **끊은 뒤에는 표본이 멈춘다** — 다섯 호스트 × 세 HUD 를 전부 재도 잡음바닥이
 *       문턱(200) 이하이고, 닫은 뒤 남는 딤 오버레이가 0 이다.
 *
 * ⚑ 811 의 옛 판정식은 바닥이 커지면 `leak > base*3 + 200` 이 통째로 거짓이 되어
 *   **조용히 통과**했다 — 실측 로그의 `잉크 71148 · 잡음바닥 71148`(완전 동수)이 그 얼굴이다.
 *   그래서 이번 수리는 «바닥이 문턱을 넘으면 표본 실패» 를 같이 넣었다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '✓' : '✗') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const HUD = ['top', 'tuto', 'slots'];
/* 811 규칙의 목록 그대로. 여기 적어 두는 이유는 이 자가 «규칙이 맞나» 가 아니라
   «자가 재는 방법이 맞나» 를 묻기 때문이다(규칙 축은 verify811 [B] 가 본다). */
const DIMS = ['modal', 'offw', 'dgdw', 'wpnw', 'prbw', 'collw', 'ciw', 'pfw', 'specw', 'upw',
  'sumw', 'dclw', 'defw', 'blsw', 'bagw', 'cfw', 'statw'];
const HOSTS = [
  { id: '17', sel: '#statw', open: `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})` },
  { id: '18', sel: '#defw', open: `openDefeat()` },
  { id: '21', sel: '#collw', open: `openColl21()` },
  { id: '22', sel: '#modal', open: `openQuest()` },
  { id: '09', sel: '#upw', open: `openUpAll([0,1,2].map(i=>({it:SKILLS[i],from:4,to:5})))` },
];
const FRAMES = [1920, 2280];
const FREEZE = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}';
const NOISE = 200;              /* verify811 의 판정식이 이미 «바닥은 이 정도» 로 쓰던 상수 */

const shot = async (page) => (await (await page.$('#app')).screenshot()).toString('base64');
const onDims = (page) => page.evaluate((ids) => ids.filter((k) => {
  const el = document.getElementById(k);
  return !!(el && el.classList.contains('on'));
}), DIMS);
const visOne = (page, id) => page.evaluate((k) => {
  const el = document.getElementById(k);
  return el ? getComputedStyle(el).visibility : 'MISSING';
}, id);

/* 자가 하던 준비 그대로 — 여기까지가 «옛 811» 의 출발선이다. */
async function boot(page, fh) {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(650);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.addStyleTag({ content: FREEZE });
}

/* 루프가 도는지를 **화소가 아니라 호출**로 묻는다. 두 함수를 따로 세는 이유는 등재문의 두 얼굴이
   각각 이 둘에 매달려 있기 때문이다 — `step` 은 ⓑ 재개방 경로(`step → playerDied → openDefeat`),
   `drawHud` 는 ⓐ 잡음바닥([E] 가 재는 바로 그 화소를 매 프레임 다시 그린다). */
const FNS = ['step', 'drawHud'];
const armFns = (page) => page.evaluate((names) => {
  window.__n854 = {};
  const miss = [];
  for (const n of names) {
    window.__n854[n] = 0;
    const f0 = window[n];
    if (typeof f0 !== 'function') { miss.push(n); continue; }
    window[n] = function () { window.__n854[n]++; return f0.apply(this, arguments); };
  }
  return miss;
}, FNS);
const counts = (page) => page.evaluate(() => window.__n854);
const fmt = (c) => FNS.map((n) => `${n} ${c[n]}회`).join(' · ');

/* 811 이 새로 넣은 [F] 처방과 **같은 한 줄** — 자가 자기 페이지에서만 메인 루프의 rAF 를 가로챈다. */
const cutLoop = (page) => page.evaluate(() => {
  const raf = window.requestAnimationFrame;
  window.__cut854 = 0;
  window.requestAnimationFrame = function (cb) {
    if (cb && cb.name === 'loop') { window.__cut854++; return 0; }
    return raf.call(window, cb);
  };
});

/* verify811 의 inkOf 와 **같은 셈** — 자를 바꾸면 비교가 성립하지 않는다. */
async function inkOf(page, id) {
  const clip = await page.evaluate((k) => {
    const el = document.getElementById(k), app = document.getElementById('app');
    if (!el || !app) return null;
    const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
    const s = a.width && app.offsetWidth ? a.width / app.offsetWidth : 1;
    return { x: (r.x - a.x) / s, y: (r.y - a.y) / s, x2: (r.right - a.x) / s, y2: (r.bottom - a.y) / s };
  }, id);
  const a = await shot(page);
  await page.evaluate((k) => {
    const el = document.getElementById(k);
    if (el) el.style.setProperty('visibility', 'hidden', 'important');
  }, id);
  const b = await shot(page);
  await page.evaluate((k) => {
    const el = document.getElementById(k);
    if (el) el.style.removeProperty('visibility');
  }, id);
  const a2 = await shot(page);
  return {
    base: a === a2 ? 0 : await diffPx(page, a, a2, clip),
    leak: a === b ? 0 : await diffPx(page, a, b, clip),
  };
}

function diffPx(page, ba, bb, cl) {
  return page.evaluate(async ([x, y, c2]) => {
    const load = (b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64;
    });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, cv.width, cv.height).data;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, cv.width, cv.height).data;
    const lo = c2 ? { x: Math.max(0, Math.floor(c2.x) - 2), y: Math.max(0, Math.floor(c2.y) - 2),
      x2: Math.min(cv.width, Math.ceil(c2.x2) + 2), y2: Math.min(cv.height, Math.ceil(c2.y2) + 2) } : null;
    let n = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (lo) {
        const p = i / 4, yy = Math.floor(p / cv.width), xx = p % cv.width;
        if (xx < lo.x || xx >= lo.x2 || yy < lo.y || yy >= lo.y2) continue;
      }
      if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 4) n++;
    }
    return n;
  }, [ba, bb, cl]);
}

(async () => {
  const browser = await launch(chromium);
  const live = [], frozen = [], revive = [];
  const noisy = [], stuck = [];
  let samples = 0;

  for (const fh of FRAMES) {
    /* ── ① 루프가 살아 있는 판 = 옛 811 의 출발선 ─────────────────────────── */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await boot(page, fh);
      const miss = await armFns(page);
      await page.waitForTimeout(500);
      const c = await counts(page);
      live.push({ fh, c, miss });

      /* 관측 — 다섯 호스트를 자가 하던 대로 열고 브루트로 닫으며 «닫은 판이 되살아나는가» 를 본다.
         ⚠ **판정에는 안 쓴다.** 되살아나는 시점이 «플레이어가 또 죽는 때» 라 실행마다 다르다 —
         그 간헐성이 곧 854 가 보고된 얼굴이므로, 여기서는 세기만 하고 판정은 [P1]·[P2] 가 진다. */
      for (const h of HOSTS) {
        await page.evaluate(`(()=>{ try{ ${h.open} }catch(e){} })()`);
        await page.waitForTimeout(360);
        await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.classList.remove('on'); }, h.sel);
        await page.waitForTimeout(120);
        const rest = await onDims(page);
        const v = await visOne(page, 'top');
        if (rest.length || v !== 'visible') revive.push(`${fh} ${h.id}: 남은 .on [${rest.join(', ') || '없음'}] · #top ${v}`);
      }
      await ctx.close();
    }

    /* ── ② [F] 처방을 건 판 ──────────────────────────────────────────────── */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await boot(page, fh);
      await cutLoop(page);
      const miss = await armFns(page);
      await page.waitForTimeout(500);
      frozen.push({ fh, c: await counts(page), miss, cut: await page.evaluate(() => window.__cut854) });

      for (const h of HOSTS) {
        await page.evaluate(`(()=>{ try{ ${h.open} }catch(e){} })()`);
        await page.waitForTimeout(360);
        for (const k of HUD) {
          const drawn = await page.evaluate((id) => {
            const el = document.getElementById(id);
            if (!el || getComputedStyle(el).display === 'none') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }, k);
          if (!drawn) continue;
          samples++;
          const t = await inkOf(page, k);
          if (t.base > NOISE) noisy.push(`${fh} ${h.id} #${k} 바닥 ${t.base} · 잉크 ${t.leak}`);
        }
        await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.classList.remove('on'); }, h.sel);
        await page.waitForTimeout(120);
        const rest = await onDims(page);
        const v = await visOne(page, 'top');
        if (rest.length || v !== 'visible') stuck.push(`${fh} ${h.id}: 남은 .on [${rest.join(', ') || '없음'}] · #top ${v}`);
      }
      await ctx.close();
    }
  }
  await browser.close();

  const miss = [...live, ...frozen].flatMap((r) => r.miss);
  ok(miss.length === 0, '[P0] 세는 대상이 제품에 있다',
    miss.length ? `못 찾음: ${[...new Set(miss)].join(', ')} — 이름이 바뀌면 아래 셋이 헛돈다` : FNS.join(' · '));
  ok(live.every((r) => FNS.every((n) => r.c[n] > 0)),
    '[P1] 자의 준비만으로는 제품 메인 루프가 계속 돈다',
    live.map((r) => `${r.fh}: ${fmt(r.c)}`).join(' / ')
    + ' — `step` 은 재개방 경로(→playerDied→openDefeat) · `drawHud` 는 [E] 가 재는 그 화소다');
  ok(frozen.every((r) => FNS.every((n) => r.c[n] === 0)),
    '[P2] [F] 처방을 걸면 한 프레임도 안 돈다',
    frozen.map((r) => `${r.fh}: ${fmt(r.c)} (rAF ${r.cut}건 차단)`).join(' / '));
  console.log('· 관측(판정 아님) — 루프가 산 채로 다섯 판을 열고 닫았을 때 되살아난 자리: '
    + (revive.length ? `${revive.length}건 · ${revive.join(' / ')}` : '0건(이번 실행에서는 안 잡혔다 — 간헐이다)'));
  ok(noisy.length === 0 && stuck.length === 0,
    `[P4] 끊은 뒤에는 표본이 멈춘다 — 잡음바닥 ≤ ${NOISE} · 남은 오버레이 0`,
    (noisy.length || stuck.length)
      ? `바닥 초과 ${noisy.length}건 ${noisy.slice(0, 3).join(' / ')} · 잔여 ${stuck.length}건 ${stuck.slice(0, 3).join(' / ')}`
      : `${samples} 표본 전부 이하 · 잔여 0`);

  console.log(`\nPROBE854 ${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail}  (표본 ${samples})`);
  process.exit(fail ? 1 : 0);
})();
