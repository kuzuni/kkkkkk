#!/usr/bin/env node
/* 451 게이트 — «21 도감 리본(`.cl-rib`) 검정 상변 ↔ HUD 판때기(`.pedge`) 검정 하변» 이
 * 짧은 프레임에서 **햇빛 없이 맞닿는** 것을 막는다.
 *
 * 실행: node tools/verify451.js
 *
 * 이 자가 447 과 무엇이 다른가 — **묻는 수가 다르다.**
 *   `verify447` [A] 는 「여유 ≥ 0」 이다(390 의 −26 침범을 갚았는가). 그 조건은 **0.0 에서도 참**이고
 *   실제로 447 뒤 1842~2024 전 구간이 정확히 0.0 에 착지했다. 451 은 그 0.0 자체가 결함이라는
 *   판정이므로 눈금이 「여유 ≥ **12**」 다. 447 의 항은 한 줄도 안 무르게 하고(그대로 둔다) 여기서 조인다.
 *
 * 눈금 12px 의 근거(등재문 + `probe451` 실측):
 *   ⓐ 리본 몸통(`.cl-rib>s.bd`)의 검정 상변 획이 **6px** — 그 두 배다. 획이 자기 두께만큼의
 *      햇빛을 갖지 못하면 판때기 잉크의 일부로 읽힌다(351 13회차 DB·DD 가 각자 1순위로 지적).
 *   ⓑ 판때기 `clip-path` 가 물러나며 이미 주는 햇빛이 x380 에서 **11px** 다 — 겹침 전 구간이
 *      그 자리수 이상을 받게 한다.
 *
 * 절:
 *   [전제] 오버레이가 실제로 열렸고 기준선(142)·리본 오버행(10)이 그대로다 — 아니면 «판정 불가».
 *   [A] rect 축 — 짧은 프레임 전 구간에서 여유 ≥ 12.
 *   [B] 아래축 — 같은 프레임에서 깃발탭 여유 ≥ 0(위를 갚느라 아래를 깨지 않았다 · 447 의 제약).
 *   [C] 연속 — `.shortf` 문턱(1841↔1842)과 두 무릎(2036·2074)에서 임계 점프가 없다.
 *       ⚑ 1841↔1842 는 **`.shortf` 사본을 지운 것**의 증거이기도 하다(둘이 다르면 사본이 살아 있다).
 *   [D] 레퍼런스 불변 — 2100·2280·2600 은 Δ0px(8220행 검산 «2280 상변 272.5»).
 *   [E] 반대급부 — 상자는 12 만큼만 눌리고 목록은 스크롤로 닿는다.
 *   [P] 찍힌 픽셀 — 겹침 열에서 두 검정 잉크 사이 «햇빛» ≥ 리본 획(6px). rect 가 아니라 색이다.
 *   [R] 되돌림 시험 — 흡수량을 447 의 26 으로 되돌린 사본은 여유 0 이고 픽셀 융합이 되돌아온다.
 *   [S] 제품 선언 — 두 흡수항이 clamp 이고 **같은 무릎**에서 끝난다 · 위 흡수량 = 26 + 12.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  if (c) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg + (extra !== undefined ? '   → ' + extra : '')); }
};

const OPENER = { sel: '.side .ibtn[data-pop="coll"]' };
/* 눈금. 위 흡수량 38 = 390 이 갚은 26 + 이 값. */
const G = 12;
/* 리본 몸통 검정 상변 획 — [P] 의 통과선이자 G 의 근거다. */
const STROKE = 6;
/* 겹침 열 — `.pedge` 가 y≈135 아래까지 검정을 내리는 x 구간(clip-path + mask 로 x ≲ 379). */
const COLS = [310, 320, 330, 340, 350, 360, 370];
const BLACK = 10;   /* 순수 #000 만 검정 — 딤 배경(rgb 41~50)을 검정으로 세면 자가 뒤집힌다 */

const READ = () => {
  const app = document.getElementById('app'), A = app.getBoundingClientRect();
  const L = (v) => Math.round((v - A.top) * 10) / 10;
  const R = (s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return { top: L(r.top), bot: L(r.bottom), h: Math.round(r.height * 10) / 10 };
  };
  const host = document.getElementById('collw');
  const cs = host ? getComputedStyle(host) : null;
  const body = document.querySelector('#collw .cl-body');
  const pedge = document.querySelector('.pedge');
  const bar = document.getElementById('tabbar');
  const bd = document.querySelector('#collw .cl-rib>s.bd');
  return {
    frameH: Math.round(A.height), appTop: A.top,
    on: !!(host && host.classList.contains('on')),
    padT: cs ? Math.round(parseFloat(cs.paddingTop) * 10) / 10 : null,
    padB: cs ? Math.round(parseFloat(cs.paddingBottom) * 10) / 10 : null,
    box: R('#collw .cl'), rib: R('#collw .cl-rib'), tabsBox: R('#collw .cl-tabs'),
    stroke: bd ? Math.round(parseFloat(getComputedStyle(bd).borderTopWidth) * 10) / 10 : null,
    bodyOver: body ? Math.round(body.scrollHeight - body.clientHeight) : null,
    bodyH: body ? Math.round(body.clientHeight) : null,
    pedgeBot: pedge ? Math.round((pedge.getBoundingClientRect().bottom - A.top) * 10) / 10 : null,
    tabsTop: bar ? Math.round((bar.getBoundingClientRect().top - A.top) * 10) / 10 : null,
  };
};

/* 되돌림 사본 — 위 흡수량을 447 의 26 으로 되돌린다(= 451 직전 트리와 픽셀 동일).
   ⚠ 아래 항도 447 의 짝(2035/11)으로 같이 되돌린다 — 무릎이 어긋난 사본은 «451 을 뺀 것» 이
      아니라 «447 도 깬 것» 이라 되돌림 시험이 엉뚱한 것을 증명하게 된다. */
const REVERT = `
  #collw{padding-top:calc(168px + clamp(0px, 2050px - var(--frameh, 2280px), 26px)) !important;
         padding-bottom:calc(276px + clamp(0px, 2035px - var(--frameh, 2280px), 11px)) !important}`;

/* 한 열의 두 검정 잉크 사이 «햇빛» — `probe451` 의 `seamPx` 와 같은 규칙(자매 자 드리프트 방지:
   규칙이 갈리면 게이트와 재현기가 서로 다른 수를 낸다. 바뀌면 둘 다 바꾼다). */
function seamPx(rows, pedBotY, ribTopY) {
  const isB = (p) => p && p.r <= BLACK && p.g <= BLACK && p.b <= BLACK;
  const at = (y) => rows.find((p) => p.y === y);
  let ped = null;
  const from = Math.min(Math.round(pedBotY) + 2, Math.round(ribTopY) - 1);
  for (let y = from; y >= rows[0].y; y--) { if (isB(at(y))) { ped = y; break; } }
  if (ped == null) return null;
  let rib = null;
  for (let y = ped + 1; y <= Math.round(ribTopY) + 24; y++) { if (isB(at(y))) { rib = y; break; } }
  return rib == null ? null : rib - ped - 1;
}

(async () => {
  const browser = await launch(chromium);
  const seen = [];
  try {
    const measure = async (h, css, shotTag) => {
      const { ctx, page } = await fresh(browser, 1080, h);
      if (css) await page.addStyleTag({ content: css });
      await settle(page);
      await drive(page, OPENER);
      await page.waitForTimeout(220);
      const d = await page.evaluate(READ).catch(() => null);
      if (d && shotTag) {
        const shot = path.resolve(__dirname, '../docs/shots/verify451-' + shotTag + '.png');
        await page.screenshot({ path: shot });
        const b64 = fs.readFileSync(shot).toString('base64');
        const A = Math.round(d.appTop);
        const y1 = Math.max(0, Math.round(d.pedgeBot) - 34 + A);
        const y2 = Math.round(d.rib.top) + 34 + A;
        const cols = await page.evaluate(([data, xs, ya, yb]) => new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => {
            const c = document.createElement('canvas');
            c.width = im.width; c.height = im.height;
            const g = c.getContext('2d'); g.drawImage(im, 0, 0);
            const out = {};
            xs.forEach((x) => {
              const px = g.getImageData(x, ya, 1, yb - ya).data, rr = [];
              for (let i = 0; i < yb - ya; i++) rr.push({ y: ya + i, r: px[i * 4], g: px[i * 4 + 1], b: px[i * 4 + 2] });
              out[x] = rr;
            });
            res(out);
          };
          im.onerror = () => rej(new Error('이미지 로드 실패'));
          im.src = 'data:image/png;base64,' + data;
        }), [b64, COLS, y1, y2]).catch(() => null);
        d.light = cols ? COLS.map((x) => seamPx(cols[x], d.pedgeBot + A, d.rib.top + A)) : null;
      }
      await ctx.close();
      if (d && !css) seen.push(d);
      return d;
    };
    const gaps = (d) => (d && d.box && d.rib && d.tabsBox && typeof d.pedgeBot === 'number' && typeof d.tabsTop === 'number')
      ? { t: Math.round((d.rib.top - d.pedgeBot) * 10) / 10, b: Math.round((d.tabsTop - d.tabsBox.bot) * 10) / 10 }
      : null;

    /* ── [전제] ────────────────────────────────────────────────────────────────── */
    console.log('\n[전제] 재는 자리 — 오버레이가 열렸고 기준선·오버행이 그대로다');
    const p16 = await measure(1600, null, 'after-1600');
    ok(p16 && p16.on && p16.box && p16.box.h > 100,
      '[전제] 1600 에서 `#collw` 가 실제로 열렸다(안 열린 화면을 재고 초록을 주지 않는다)',
      p16 ? `on=${p16.on} 상자 h=${p16.box ? p16.box.h : '?'}` : '측정 실패');
    ok(p16 && p16.rib && p16.box && Math.abs((p16.box.top - p16.rib.top) - 10) < 0.6,
      '[전제] 리본이 상자 위로 정확히 10px 삐져나온다(이 자리의 바깥선은 상자가 아니다)',
      p16 && p16.rib && p16.box ? `상자 ${p16.box.top} · 리본 ${p16.rib.top}` : '측정 실패');
    ok(p16 && p16.pedgeBot === 142, '[전제] `.pedge` 하변은 프레임과 무관하게 142(기준선이 상수)',
      p16 ? p16.pedgeBot : '측정 실패');
    ok(p16 && Math.abs(p16.stroke - STROKE) < 0.6,
      `[전제] 리본 몸통 검정 상변 획이 ${STROKE}px 다(눈금 ${G} 의 근거 ⓐ — 획이 바뀌면 이 자도 다시 정한다)`,
      p16 ? p16.stroke : '측정 실패');

    /* ── [A] rect 축 ──────────────────────────────────────────────────────────── */
    console.log(`\n[A] 리본 상변 − HUD 하변 ≥ ${G} — 0.0 은 통과가 아니다`);
    const FR = [1600, 1700, 1841, 1842, 1900, 1920, 1987, 2009, 2024, 2030, 2036];
    const got = { 1600: p16 };
    for (const h of FR) {
      const d = got[h] || (got[h] = await measure(h));
      const g = gaps(d);
      ok(g && g.t >= G, `[A] @${h} — 여유 ≥ ${G}`, g ? `gap ${g.t}` : '측정 실패(판정 불가)');
    }
    /* ⚠ 1920 은 `smoke.js` 가 도는 화면비 4종 중 하나(9:16)이고, 이 결함은 1600 전용이 아니다. */
    ok(FR.includes(1920) && FR.includes(1600),
      '[A] 표본에 1080×1920(9:16)과 1080×1600(9:13.3)이 둘 다 있다(이 0.0 은 1600 전용이 아니었다)');
    ok(FR.includes(1842) && FR.includes(1841),
      '[A] 표본이 `.shortf` 문턱(1842)의 양쪽을 다 본다');

    /* ── [B] 아래축 ───────────────────────────────────────────────────────────── */
    console.log('\n[B] 깃발탭 하변 ≤ 탭바 상변 — 위를 갚느라 아래를 깨지 않았다(447 의 제약)');
    for (const h of FR) {
      const g = gaps(got[h]);
      ok(g && g.b >= 0, `[B] @${h} — 깃발탭 여유 ≥ 0`, g ? `gap ${g.b}` : '측정 실패(판정 불가)');
    }

    /* ── [C] 연속 ─────────────────────────────────────────────────────────────── */
    console.log('\n[C] 임계 점프 0 — 문턱·두 무릎에서 여유가 안 튄다');
    for (const [a, b] of [[1841, 1842], [2035, 2036], [2036, 2037], [2073, 2074], [2074, 2075]]) {
      const da = got[a] || (got[a] = await measure(a));
      const db = got[b] || (got[b] = await measure(b));
      const ga = gaps(da), gb = gaps(db);
      ok(ga && gb && Math.abs(ga.t - gb.t) <= 1 && Math.abs(ga.b - gb.b) <= 1,
        `[C] ${a} ↔ ${b} 에서 위·아래 여유가 안 튄다(≤ 1px)`,
        ga && gb ? `위 ${ga.t}→${gb.t} · 아래 ${ga.b}→${gb.b}` : '측정 실패');
    }
    /* ⚑ `.shortf` 사본을 지운 것의 직접 증거 — 문턱 양쪽 패딩이 **같은 수**여야 한다.
       사본이 되살아나 낡은 값(194)을 들고 있으면 여기가 즉시 빨개진다. */
    ok(got[1841] && got[1842] && got[1841].padT === got[1842].padT && got[1841].padT === 206,
      '[C] `.shortf` 문턱 양쪽의 padding-top 이 같은 206 이다(짧은 프레임 전용 사본이 없다)',
      got[1841] && got[1842] ? `${got[1841].padT} / ${got[1842].padT}` : '측정 실패');

    /* ── [D] 레퍼런스 불변 ────────────────────────────────────────────────────── */
    console.log('\n[D] 레퍼런스 불변 — 2100·2280·2600 은 Δ0px');
    for (const [h, want] of [[2100, 182.5], [2280, 272.5], [2600, 432.5]]) {
      const d = await measure(h);
      ok(d && d.box && Math.abs(d.box.top - want) < 0.6,
        `[D] ${h} \`.cl\` 상변 ${want} (8220행 검산값 계열) Δ0px`, d && d.box ? d.box.top : '측정 실패');
      ok(d && d.padT === 168 && d.padB === 276, `[D] ${h} 패딩이 기본값 168/276 그대로다`,
        d ? `${d.padT}/${d.padB}` : '측정 실패');
    }

    /* ── [E] 반대급부 ─────────────────────────────────────────────────────────── */
    console.log('\n[E] 반대급부 — 상자는 G 만큼만 눌리고 목록은 스크롤로 닿는다');
    ok(got[1920] && got[1920].box && Math.abs(got[1920].box.h - (1920 - 481 - G)) < 1,
      `[E] 1920 상자 높이 = 프레임 − ${481 + G}(= 447 의 481 + 451 의 ${G}) — 띠 안쪽에 정확히 선다`,
      got[1920] && got[1920].box ? `${got[1920].box.h} vs ${1920 - 481 - G}` : '측정 실패');
    ok(got[1920] && got[1920].bodyOver > 0 && got[1920].bodyH > 900,
      '[E] 1920 목록 그릇이 살아 있다(스크롤 가능 · 높이 > 900) — 눌렀지 «없앤» 게 아니다',
      got[1920] ? `그릇 ${got[1920].bodyH} · 넘침 ${got[1920].bodyOver}` : '측정 실패');

    /* ── [P] 찍힌 픽셀 ────────────────────────────────────────────────────────── */
    console.log(`\n[P] 찍힌 픽셀 — 겹침 열에서 두 검정 잉크 사이 햇빛 ≥ 획(${STROKE}px)`);
    ok(p16 && Array.isArray(p16.light) && p16.light.every((v) => typeof v === 'number'),
      '[P] 겹침 열 ' + COLS.length + '개가 전부 읽혔다(표본이 조용히 0 이 되면 아래 항이 헛초록이다)',
      p16 ? JSON.stringify(p16.light) : '측정 실패');
    const lm = p16 && Array.isArray(p16.light) && p16.light.every((v) => typeof v === 'number')
      ? Math.min(...p16.light) : null;
    ok(lm != null && lm >= STROKE,
      `[P] 1600 겹침 열의 햇빛 최솟값 ≥ ${STROKE}px — 리본 획이 판때기의 일부로 안 읽힌다`,
      lm != null ? `최소 ${lm}px · 열별 ${JSON.stringify(p16.light)}` : '측정 실패');

    /* ── [R] 되돌림 시험 ─────────────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 451 을 빼면 rect 도 픽셀도 되돌아온다(무르게 푼 수리가 아니다)');
    const rv = await measure(1600, REVERT, 'revert-1600');
    const gr = gaps(rv);
    ok(gr && Math.abs(gr.t) < 0.6,
      '[R1] 흡수량을 447 의 26 으로 되돌린 사본은 1600 에서 여유가 정확히 0.0 이다(451 등재문의 실측값)',
      gr ? `위 ${gr.t} · 아래 ${gr.b}` : '측정 실패');
    const rl = rv && Array.isArray(rv.light) ? rv.light.filter((v) => typeof v === 'number') : [];
    ok(rl.length === COLS.length && Math.min(...rl) < STROKE,
      `[R2] 같은 사본은 픽셀에서도 융합이 돌아온다(햇빛 최솟값 < ${STROKE}px) — rect 항만 조인 게 아니다`,
      rl.length ? `최소 ${Math.min(...rl)}px · 열별 ${JSON.stringify(rl)}` : '열을 못 읽음');
    ok(gr && gr.b >= 0,
      '[R3] 그 사본의 **아래축은 성하다** — [R1] 이 빨간 이유가 «447 을 깼기 때문» 이 아니다',
      gr ? `아래 ${gr.b}` : '측정 실패');
    const back = await measure(1600);
    const gb2 = gaps(back);
    ok(gb2 && gb2.t >= G, '[R4] 주입을 걷으면 같은 프레임이 다시 초록이다(주입이 새지 않았다)',
      gb2 ? `위 ${gb2.t}` : '측정 실패');

    /* ── [S] 제품 선언 ───────────────────────────────────────────────────────── */
    console.log('\n[S] 제품 선언 — 두 흡수항이 같은 무릎에서 끝나고, 위 흡수량이 26 + G 다');
    const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const mT = src.match(/#collw\{padding-top:calc\(168px \+ clamp\(0px, (\d+)px - var\(--frameh, 2280px\), (\d+)px\)\);/);
    const mB = src.match(/padding-bottom:calc\(276px \+ clamp\(0px, (\d+)px - var\(--frameh, 2280px\), (\d+)px\)\)\}/);
    ok(!!mT && !!mB, '[S] 위·아래가 둘 다 연속 흡수항(clamp)이다 — 상수 분기가 아니다',
      `위 ${mT ? mT[0] : '없음'} · 아래 ${mB ? mB[0] : '없음'}`);
    ok(!!mT && +mT[2] === 26 + G,
      `[S] 위 흡수량이 ${26 + G} = 390 이 갚은 26 + 451 의 햇빛 ${G} 다`, mT ? mT[2] : '못 읽음');
    ok(!!mB && +mB[2] === 11, '[S] 아래 흡수량은 390 의 11 그대로다(451 의 범위가 아니다 — 436 이 판정한 자리)',
      mB ? mB[2] : '못 읽음');
    ok(!!mT && !!mB && +mT[1] - +mT[2] === +mB[1] - +mB[2] && +mT[1] - +mT[2] === 2036,
      '[S] 두 흡수항의 무릎이 2036 으로 같다(447 의 2024 에서 G 만큼 올라간 값 — 상자가 G 더 눌리니 상한에 걸리는 구간도 그만큼 길다)',
      mT && mB ? `위 ${+mT[1] - +mT[2]} · 아래 ${+mB[1] - +mB[2]}` : '못 읽음');
    /* ⚠ **주석 밖에서** 물어야 한다(`verify173` A1 선례) — 451 이 그 줄을 지우면서 «무엇을 지웠는지»
       를 주석에 적어 두었고, 날 텍스트로 재면 그 설명 자체가 이 항을 빨갛게 만든다(1회차에 그랬다). */
    const bare = src.replace(/\/\*[\s\S]*?\*\//g, '');
    ok(!/#app\.shortf #collw\s*\{/.test(bare),
      '[S] `#app.shortf #collw` 사본이 (주석 밖에) 없다 — 같은 값을 두 곳에 적는 것이 390 → 447 → 451 을 낳았다',
      (bare.match(/#app\.shortf #collw\s*\{[^}]*\}/) || [''])[0]);
    ok(seen.length >= FR.length + 3, '[S] 위 항들이 실제로 여러 프레임을 돌았다(표본 수 ≥ 프레임 수)',
      `표본 ${seen.length} · 프레임 ${FR.length}`);
  } finally { await browser.close(); }

  console.log(`\nVERIFY451 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
