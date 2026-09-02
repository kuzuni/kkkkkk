#!/usr/bin/env node
/* 811 게이트 — «전면 딤 오버레이가 떠 있는 동안 팝업 **밖** HUD 가 딤 너머로 안 읽히는가»
 *
 *   node tools/verify811.js
 *
 * 이 자가 지키는 것은 다섯이다.
 *  [A] **잉크가 꺼진다** — 오버레이가 `.on` 인 동안 `#top`·`#tuto`·`#slots` 의 계산된
 *      `visibility` 가 `hidden` 이고, 닫으면 그 자리에서 다시 `visible` 이다.
 *      ⚠ «닫으면 돌아온다» 를 같이 묻는 것이 요점이다 — 안 물으면 HUD 를 영영 끈 수리도 초록이다.
 *  [B] **목록이 새 오버레이를 놓치지 않는다** — 소스에서 «전면 딤 오버레이»(`inset:0` + rgba 딤 +
 *      `.on{display:…}`)를 **세어** 811 규칙의 목록과 대조한다. 새 팝업을 만들고 목록에 안 더하면
 *      그 화면에서만 결손이 조용히 되살아나므로, 그 조용함을 여기서 깬다.
 *  [C] **512·654 짝 — 재화 비행의 도착지가 살아 있다.** `fxPill()` 이 고르는 알약의 상자가
 *      오버레이가 떠 있는 동안에도 폭 > 0 이고, **닫혀 있을 때와 같은 중심**이다.
 *      등재문이 «재화 알약을 숨기면 512·654 와 충돌하는지 먼저 보라» 고 경고한 자리가 이것이다.
 *  [D] **`display` 로 끄지 않았다** — 소스의 811 규칙이 `visibility` 를 쓰고 `display:none` 을
 *      안 쓴다. [C] 와 짝인 항이다: `display:none` 이면 상자가 0 이 되어 비행이 통째로 사라진다.
 *  [E] **화소로 확인한다** — 선언만 믿지 않고, 등재문이 지목한 네 화면(17·18·21·22)에서
 *      HUD 를 지운 장과의 화소 차가 잡음 바닥 안인지 잰다(재현기 `probe811` 과 같은 방법).
 *
 * §R **되돌림 시험** — `#app :is(#top,#tuto,#slots){visibility:visible!important}` 을 주입해
 *   811 의 한 줄을 무효화하면 [A]·[E] 가 **빨개져야 한다.** 안 빨개지면 이 게이트는 아무것도
 *   안 지키는 것이다(무르게 푼 수리를 못박는 자리 — 334·364 선례).
 *
 * ⚠ 시트·페이지(`#trw`·`#eqw`·`#shopw`·`#dunw`·`#relw`·`#mnw`·`#rkw`·`#chw`·`#svw`)는 범위 밖이다.
 *   그쪽은 자기 재화 바(`.pcb`)를 따로 그리는 «페이지» 라 딤 오버레이와 규약이 다르다 — [B] 의
 *   판정식(«rgba 딤을 가진 `inset:0` 호스트»)이 그 둘을 자동으로 가른다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const URL = 'file://' + FILE.replace(/\\/g, '/');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '✓' : '✗') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const HUD = ['top', 'tuto', 'slots'];
/* 등재문이 지목한 네 화면 + 딤이 가장 짙은 대조군 하나(09 = .80).
   09 를 넣는 이유는 재현이 «딤을 올려도 안 죽는다» 를 찍었기 때문이다 — 그 화면도 같이 지킨다. */
const HOSTS = [
  { id: '17', sel: '#statw', open: `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})`, close: `closeStatUp && closeStatUp()` },
  { id: '18', sel: '#defw',  open: `openDefeat()`, close: null },
  { id: '21', sel: '#collw', open: `openColl21()`, close: null },
  { id: '22', sel: '#modal', open: `openQuest()`, close: null },
  { id: '09', sel: '#upw',   open: `openUpAll([0,1,2].map(i=>({it:SKILLS[i],from:4,to:5})))`, close: null },
];
const FRAMES = [1600, 1920, 2280];      /* 짧은·9:16·기준. 재현기가 5종을 다 돌므로 자는 셋으로 족하다 */
const UNFIX = '#app :is(#top,#tuto,#slots){visibility:visible!important}';
const FREEZE = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}';

/* ── [B]·[D] 소스 축 — 브라우저 없이 답한다 ───────────────────────────────── */
function sourceAxes() {
  /* 811 규칙 한 줄을 소스에서 집는다(줄바꿈을 허용한다 — 목록이 길어 두 줄로 적혀 있다) */
  const m = SRC.match(/#app:has\(:is\(([^)]*)\)\.on\)\s*:is\(([^)]*)\)\{([^}]*)\}/);
  ok(!!m, '[D1] 811 규칙이 소스에 있다', m ? '찾음' : '#app:has(…).on :is(#top,#tuto,#slots){…} 없음');
  if (!m) return new Set();

  const listed = new Set(m[1].split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean));
  const targets = m[2].split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
  const decl = m[3];

  ok(/visibility\s*:\s*hidden/.test(decl) && !/display\s*:\s*none/.test(decl),
    '[D2] `visibility` 로 끈다(`display:none` 아님)',
    `선언 «${decl.trim()}» · display:none 이면 fxPill 상자가 0 이 되어 512·654 비행이 사라진다`);
  ok(HUD.every((h) => targets.includes(h)) && targets.length === HUD.length,
    '[D3] 대상이 등재문의 셋 그대로', `대상 [${targets.join(', ')}]`);

  /* [B] — 소스가 아는 «전면 딤 오버레이» 를 세어 목록과 대조한다.
     판정식: `#id.on{display:…}` 로 켜지고, 자기 규칙에 `inset:0` 과 rgba 어두운 배경이 있다. */
  const found = [];
  for (const mo of SRC.matchAll(/#([a-zA-Z][\w-]*)\.on\{display:(?:block|flex)\}/g)) {
    const id = mo[1];
    const base = SRC.match(new RegExp('#' + id + '\\{([^}]*)\\}'));
    if (!base) continue;
    const body = base[1];
    if (!/position:absolute;\s*inset:0/.test(body)) continue;
    if (!/background:[^;]*rgba\(\s*\d+\s*,/.test(body)) continue;   /* 딤이 있는가(그라디언트 포함) */
    found.push(id);
  }
  const missing = found.filter((id) => !listed.has(id));
  const stale = [...listed].filter((id) => !found.includes(id));
  ok(found.length > 0, '[B1] 소스에서 전면 딤 오버레이를 찾았다', `${found.length}종`);
  ok(missing.length === 0, '[B2] 목록에 빠진 전면 딤 오버레이가 없다',
    missing.length ? `빠짐: ${missing.join(', ')} — 811 규칙 목록에 더할 것` : `${found.length}종 전부 목록 안`);
  ok(stale.length === 0, '[B3] 목록에 죽은 id 가 없다', stale.length ? `죽음: ${stale.join(', ')}` : '없음');
  return listed;
}

/* ── 브라우저 축 ─────────────────────────────────────────────────────────── */
const shot = async (page) => (await (await page.$('#app')).screenshot()).toString('base64');

async function inkOf(page, sel) {
  const clip = await page.evaluate((s) => {
    const el = document.querySelector(s), app = document.getElementById('app');
    if (!el || !app) return null;
    const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
    const k = a.width && app.offsetWidth ? a.width / app.offsetWidth : 1;
    return { x: (r.x - a.x) / k, y: (r.y - a.y) / k, x2: (r.right - a.x) / k, y2: (r.bottom - a.y) / k };
  }, sel);
  /* ⚑ **잡음 바닥은 «같은 시간 간격» 으로 재야 한다.** 1회차에 바닥을 연속 두 장(간격 ~0)으로 재고
     잉크는 evaluate 왕복(간격 ~수십 ms)을 끼고 쟀더니, rAF 로 도는 연출(17 리본·09 플래시)이
     바닥에는 안 잡히고 잉크에만 잡혀 **수리된 트리에서 3자리가 거짓으로 빨개졌다**.
     그래서 바닥도 «숨겼다 되돌린 뒤» 한 장 더 찍어 같은 왕복을 지나게 한다. */
  const a = await shot(page);
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.style.setProperty('visibility', 'hidden', 'important');
  }, sel);
  const b = await shot(page);
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.style.removeProperty('visibility');
  }, sel);
  const a2 = await shot(page);
  const base = a === a2 ? 0 : (await diffPx(page, a, a2, clip));   /* 왕복을 지난 «안 바뀐» 두 장 */
  const leak = a === b ? 0 : (await diffPx(page, a, b, clip));
  return { leak, base, read: leak > base * 3 + 200 };
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

const visOf = (page) => page.evaluate((ids) => {
  const o = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    o[id] = el ? getComputedStyle(el).visibility : 'MISSING';
  }
  return o;
}, HUD);

const pillOf = (page) => page.evaluate(() => {
  try {
    const C = (typeof FXCUR !== 'undefined') ? FXCUR.gold : null;
    if (!C) return null;
    const el = fxPill(C); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: +r.width.toFixed(1), cx: +(r.x + r.width / 2).toFixed(1), cy: +(r.y + r.height / 2).toFixed(1) };
  } catch (e) { return null; }
});

(async () => {
  const listed = sourceAxes();
  const browser = await launch(chromium);

  for (const fh of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(650);
    await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
    await page.addStyleTag({ content: FREEZE });

    /* 닫혀 있을 때가 기준선이다 — HUD 는 보이고, 알약 상자가 여기 있다. */
    const vis0 = await visOf(page);
    const pill0 = await pillOf(page);
    ok(HUD.every((h) => vis0[h] === 'visible'), `[A0-${fh}] 오버레이가 없을 때 HUD 가 보인다`,
      HUD.map((h) => `${h}:${vis0[h]}`).join(' · '));
    ok(!!pill0 && pill0.w > 0, `[C0-${fh}] 기준선 — 비행 도착지가 있다`,
      pill0 ? `폭 ${pill0.w} @(${pill0.cx},${pill0.cy})` : '없음');

    for (const h of HOSTS) {
      const err = await page.evaluate(`(()=>{ try{ ${h.open}; return null }catch(e){ return String(e&&e.message||e) } })()`);
      await page.waitForTimeout(360);
      const on = await page.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.classList.contains('on')); }, h.sel);
      ok(!err && on, `[A1-${h.id}-${fh}] ${h.sel} 가 열린다`, err || (on ? '.on' : '.on 이 아니다'));

      if (on) {
        const vis = await visOf(page);
        ok(HUD.every((k) => vis[k] === 'hidden'), `[A2-${h.id}-${fh}] 오버레이 중 HUD 잉크가 꺼진다`,
          HUD.map((k) => `${k}:${vis[k]}`).join(' · '));

        /* [C] 도착지가 살아 있고 자리도 안 움직였다 */
        const pill = await pillOf(page);
        ok(!!pill && pill.w > 0, `[C1-${h.id}-${fh}] 오버레이 중에도 비행 도착지가 산다`,
          pill ? `폭 ${pill.w}` : '없음 ⚠ display:none 으로 껐는가');
        ok(!!pill && !!pill0 && Math.abs(pill.cx - pill0.cx) < 0.6 && Math.abs(pill.cy - pill0.cy) < 0.6,
          `[C2-${h.id}-${fh}] 도착 좌표가 닫혔을 때와 같다`,
          pill && pill0 ? `Δ(${(pill.cx - pill0.cx).toFixed(1)}, ${(pill.cy - pill0.cy).toFixed(1)})` : '못 잼');

        /* [E] 화소 — 선언이 아니라 그려진 것을 본다 */
        for (const k of HUD) {
          const box = await page.evaluate((id) => {
            const el = document.getElementById(id); if (!el) return null;
            if (getComputedStyle(el).display === 'none') return null;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }, k);
          if (!box) continue;                     /* 그 상태에 없는 부품은 물을 것이 없다 */
          const t = await inkOf(page, '#' + k);
          ok(!t.read, `[E-${h.id}-${fh}-${k}] 딤 너머로 안 읽힌다`,
            `잉크 ${t.leak} · 잡음바닥 ${t.base}`);
        }
      }

      /* 닫고 원상복구 — «닫으면 HUD 가 돌아온다» 가 [A3] 이다 */
      await page.evaluate((s) => {
        const e = document.querySelector(s); if (e) e.classList.remove('on');
      }, h.sel);
      await page.waitForTimeout(120);
      const visBack = await visOf(page);
      ok(HUD.every((k) => visBack[k] === 'visible'), `[A3-${h.id}-${fh}] 닫으면 HUD 가 돌아온다`,
        HUD.map((k) => `${k}:${visBack[k]}`).join(' · '));
    }
    await ctx.close();
  }

  /* ── §R 되돌림 시험 ────────────────────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(650);
    await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
    await page.addStyleTag({ content: UNFIX });
    await page.addStyleTag({ content: FREEZE });
    await page.evaluate(`try{ openDefeat() }catch(e){}`);
    await page.waitForTimeout(360);
    const vis = await visOf(page);
    ok(HUD.some((k) => vis[k] === 'visible'), '[R1] 규칙을 무효화하면 [A2] 가 빨개진다',
      HUD.map((k) => `${k}:${vis[k]}`).join(' · '));
    const t = await inkOf(page, '#top');
    ok(t.read, '[R2] 규칙을 무효화하면 [E] 가 빨개진다', `잉크 ${t.leak} · 잡음바닥 ${t.base}`);
    await ctx.close();
  }

  await browser.close();
  console.log(`\nVERIFY811 ${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail}`
    + `  (목록 ${listed.size}종)`);
  process.exit(fail ? 1 : 0);
})();
