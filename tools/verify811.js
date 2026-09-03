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
 *  [F] **표본이 멈춰 있다** (854) — 위 다섯을 재기 전에 **제품의 메인 루프를 끊는다.**
 *      끊지 않으면 `step(dt)` 이 계속 돌아 ⓐ `playerDied()` 가 `openDefeat()` 를 **제 발로 다시**
 *      열고(`#defw` 가 `.on` 으로 되살아나 `:has()` 가 참인 채 남는다) ⓑ `drawHud()`·숫자 롤링이
 *      매 프레임 화소를 바꾼다. 둘 다 «잰 값이 실행마다 다르다» 로 나타난다.
 *
 * §R **되돌림 시험** — `#app :is(#top,#tuto,#slots){visibility:visible!important}` 을 주입해
 *   811 의 한 줄을 무효화하면 [A]·[E] 가 **빨개져야 한다.** 안 빨개지면 이 게이트는 아무것도
 *   안 지키는 것이다(무르게 푼 수리를 못박는 자리 — 334·364 선례).
 *
 * ⚑ **854(2026-09-03) — 이 자가 플레이키했던 이유는 문턱이 아니라 «움직이는 화면» 이었다.**
 *   재현(`probe854`)이 찍은 것: 호스트 18 을 닫은 뒤 21·22·09 에서 `#defw` 가 **다시 `.on`**
 *   (3/5 자리) — 제품이 옳게 동작한 결과다(전투가 계속 도니 플레이어가 또 죽는다). 그 위에서 잰
 *   [E] 의 «잉크/잡음바닥» 은 HUD 누출이 아니라 **패배 화면이 다시 뜨는 순간**을 재고 있었고,
 *   그래서 같은 트리가 실행마다 `잉크 0 · 바닥 114480`(= `#top` 상자 전체) · `잉크 X · 바닥 X`
 *   (완전 동수 = 조용한 헛초록) · `잉크 114480 · 바닥 0`(빨강) 세 얼굴로 나왔다.
 *   ⇒ 고친 것은 둘이다. **① [F] 로 루프를 끊어 표본을 멈춘다**(제품 0줄 — 자가 자기 페이지에서만
 *   메인 루프의 rAF 를 가로챈다). **② 잡음바닥이 문턱을 넘으면 «표본 실패» 로 빨갛게 한다** —
 *   전에는 바닥이 크면 `leak > base*3+200` 이 통째로 참이 안 되어 **조용히 통과**했다.
 *   ⚠ ① 은 `loop` 라는 **이름**으로 가로채므로 이름이 바뀌면 조용히 안 듣는다 — 그 구멍은
 *   [F2](«두 장이 화소까지 같다»)가 막는다. 루프가 계속 돌면 거기서 빨개진다.
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
/* 854 — «잡음바닥» 이 이 값을 넘으면 화면이 움직이는 것이고, 그 위에서 잰 잉크는 뜻이 없다.
   200 은 원래 판정식 `leak > base*3 + 200` 이 이미 «바닥은 이 정도» 로 쓰던 상수 그대로다. */
const NOISE = 200;

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

/* 854 [F] — 표본을 멈춘다. 제품은 한 줄도 안 고치고, **이 페이지 안에서만** 메인 루프가
   자기를 다시 예약하는 rAF 를 가로챈다(`loop` 이름 하나 — 나머지 rAF 는 그대로 흐르므로
   팝업 등장·`fxThen` 은 안 깨진다. 다섯 오프너 전부 정상 개폐를 실측했다).
   끊었다는 말을 믿지 않고 [F2] 가 «두 장이 화소까지 같은가» 로 확인한다 — 이름이 바뀌어
   가로채기가 헛돌면 여기서 빨개진다. */
async function freeze(page, fh) {
  /* 되돌림 스위치 — `V811_NOCUT=1` 이면 끊지 않는다. 854 수리가 무른지 확인하는 자리다:
     끄고 돌리면 [F2] 와 [E]·[R2] 의 «잡음바닥» 이 되살아나야 한다(안 되살아나면 수리가 헛것이다). */
  if (process.env.V811_NOCUT === '1') {
    ok(true, `[F1-${fh}] 제품 메인 루프를 끊었다`, '⚠ V811_NOCUT=1 — 되돌림 실행이라 안 끊었다');
    const s0 = await shot(page);
    await page.waitForTimeout(500);
    ok(s0 === (await shot(page)), `[F2-${fh}] 표본이 멈췄다`, '⚠ V811_NOCUT=1 되돌림 실행');
    return;
  }
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame;
    window.__f854 = 0;
    window.requestAnimationFrame = function (cb) {
      if (cb && cb.name === 'loop') { window.__f854++; return 0; }
      return raf.call(window, cb);
    };
  });
  await page.waitForTimeout(400);
  const cut = await page.evaluate(() => window.__f854);
  ok(cut > 0, `[F1-${fh}] 제품 메인 루프를 끊었다`,
    cut ? `rAF ${cut}건 차단` : '0건 — `loop` 이름이 바뀌었는가(가로채기가 헛돈다)');
  const s1 = await shot(page);
  await page.waitForTimeout(500);
  ok(s1 === (await shot(page)), `[F2-${fh}] 표본이 멈췄다`,
    '500ms 간격 두 장이 화소까지 같아야 [E] 의 잉크·잡음바닥이 뜻을 갖는다');
}

/* 854 — 딤 오버레이가 남아 있으면 다음 판의 표본이 앞 판 위에서 찍힌다. 누가 남았는지 이름을 댄다. */
const onDims = (page, listed) => page.evaluate((ids) => ids.filter((k) => {
  const el = document.getElementById(k);
  return !!(el && el.classList.contains('on'));
}), [...listed]);

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
  /* 854 — `stable` 이 거짓이면 **표본 자체가 무효**다. 전에는 바닥이 커지면 `leak > base*3+200`
     이 통째로 거짓이 되어 «안 읽힌다» 로 **조용히 통과**했다(잉크 X · 바닥 X 동수가 그 얼굴이다). */
  return { leak, base, stable: base <= NOISE, read: leak > base * 3 + 200 };
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
    await freeze(page, fh);                       /* 854 [F] — 재기 전에 표본을 멈춘다 */

    /* 닫혀 있을 때가 기준선이다 — HUD 는 보이고, 알약 상자가 여기 있다. */
    const vis0 = await visOf(page);
    const pill0 = await pillOf(page);
    ok(HUD.every((h) => vis0[h] === 'visible'), `[A0-${fh}] 오버레이가 없을 때 HUD 가 보인다`,
      HUD.map((h) => `${h}:${vis0[h]}`).join(' · '));
    ok(!!pill0 && pill0.w > 0, `[C0-${fh}] 기준선 — 비행 도착지가 있다`,
      pill0 ? `폭 ${pill0.w} @(${pill0.cx},${pill0.cy})` : '없음');

    for (const h of HOSTS) {
      /* 854 [A4] — 앞 판이 깨끗이 닫혔는가. 안 닫힌 채 열면 이 판의 표본은 앞 판 위에서 찍힌다. */
      const before = await onDims(page, listed);
      ok(before.length === 0, `[A4-${h.id}-${fh}] 열기 전에 딤 오버레이가 없다`,
        before.length ? `남음: ${before.map((x) => '#' + x).join(', ')} — 앞 판이 안 닫혔다` : '없음');

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
          ok(t.stable && !t.read, `[E-${h.id}-${fh}-${k}] 딤 너머로 안 읽힌다`,
            `잉크 ${t.leak} · 잡음바닥 ${t.base}`
            + (t.stable ? '' : ` ⚠ 바닥이 ${NOISE} 초과 — 화면이 움직이는 중이라 표본이 무효다(854)`));
        }
      }

      /* 닫고 원상복구 — «닫으면 HUD 가 돌아온다» 가 [A3] 이다 */
      await page.evaluate((s) => {
        const e = document.querySelector(s); if (e) e.classList.remove('on');
      }, h.sel);
      await page.waitForTimeout(120);
      const visBack = await visOf(page);
      /* 854 — 안 돌아왔으면 «아직 `.on` 인 오버레이» 를 같이 댄다. 고정 120ms 만 적어 두면
         빨강이 «누출» 인지 «덜 기다렸다» 인지 다음 사람이 못 가른다. */
      const stuck = HUD.every((k) => visBack[k] === 'visible') ? [] : await onDims(page, listed);
      ok(HUD.every((k) => visBack[k] === 'visible'), `[A3-${h.id}-${fh}] 닫으면 HUD 가 돌아온다`,
        HUD.map((k) => `${k}:${visBack[k]}`).join(' · ')
        + (stuck.length ? ` ⚠ 아직 .on: ${stuck.map((x) => '#' + x).join(', ')}` : ''));
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
    await freeze(page, 'R');                      /* 854 — 되돌림 시험도 멈춘 표본 위에서 잰다 */
    await page.evaluate(`try{ openDefeat() }catch(e){}`);
    await page.waitForTimeout(360);
    const vis = await visOf(page);
    ok(HUD.some((k) => vis[k] === 'visible'), '[R1] 규칙을 무효화하면 [A2] 가 빨개진다',
      HUD.map((k) => `${k}:${vis[k]}`).join(' · '));
    const t = await inkOf(page, '#top');
    /* 854 — 여기가 «잉크 113114 대 바닥 98928 = 1.15배» 로 흔들리던 자리다. 바닥이 컸던 것은
       문턱이 빡빡해서가 아니라 패배 화면이 **매 프레임 다시 그려지고 있었기** 때문이다. */
    ok(t.stable && t.read, '[R2] 규칙을 무효화하면 [E] 가 빨개진다',
      `잉크 ${t.leak} · 잡음바닥 ${t.base}`
      + (t.stable ? '' : ` ⚠ 바닥이 ${NOISE} 초과 — 표본 무효(854)`));
    await ctx.close();
  }

  await browser.close();
  console.log(`\nVERIFY811 ${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail}`
    + `  (목록 ${listed.size}종)`);
  process.exit(fail ? 1 : 0);
})();
