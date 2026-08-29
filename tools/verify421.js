#!/usr/bin/env node
/* 작업 421 회귀 게이트 — `probe351.js` D2 의 «회차마다 흔들리는» 넘침(플레이키 자)
 *   실행: node tools/verify421.js   → 마지막 줄이 `VERIFY421 n/n PASS` 여야 한다.
 *
 * 등재문: `shopcat:coin` 의 `.cn-cd.dia>.pn` 에서 `ovfX` **3~4px** 가 7회 중 3회만 나온다.
 * 가설은 둘이었다 — ⓐ 폰트 로드·`fitNum` 되맞춤 «전» 에 재진다 · ⓑ 광고 상품 상태가 실행마다
 * 다르다. **`probe421` 재현이 둘 다 기각했다**(폰트는 세 시점 모두 `loaded` · 카드 클래스 서명은
 * 실행마다 같다). 실재하는 뿌리는 셋째였고, 그것이 이 게이트가 지키는 것이다:
 *
 *   **10회차가 `settle()` 에 넣은 «무한 반복 연출을 위상 0 으로 세운다» 가 0 에 안 세우고 있었다.**
 *   `a.currentTime = 0; a.pause()` 는 웹애니메이션 규약상
 *     · **도는** 애니메이션의 `currentTime` 대입은 hold time 이 아니라 **start time** 을 옮기고(시계는 간다)
 *     · `pause()` 는 즉시 멈추는 게 아니라 **보류 작업**을 걸어, hold time 이 그 작업이 실제로 도는
 *       프레임 시각으로 정해진다
 *   ⇒ 세워진 자리가 **0 이 아니라 50~83ms(3~5프레임)** 이고 그 지연은 실행마다 다르다.
 *   122 재화 탭의 20초 회전 광선(`.cn-cd.dia.top>.pn>.ray` — 판 256 안의 **260px** 상자)은
 *   위상 0 에서 `ovfX 2`(D2 문턱 = `clientW + 2` 이하 ⇒ 안 걸림)인데, **0.9~1.5° 만 돌아도**
 *   회전 bbox 가 넓어져 3~5px 가 된다. 두 해상도가 서로 다른 위상에 굳으면 차분이 그것을
 *   «1600 전용 결함» 으로 낸다 = 등재문이 본 3/7.
 *
 * 처방은 **순서를 뒤집는 것 한 줄**이다(`pause()` → `currentTime = 0`). 규약이 «보류 작업을
 * 취소하고 hold time 을 그 값으로 확정» 하도록 정해 놓았기 때문이다.
 *
 * ⚠ **문턱(2)도 기대값도 한 칸 안 건드렸다**(334·등재문 명시). 무르게 푼 수리가 아님을
 *    §3 되돌림 시험(옛 순서로 세운 사본은 지금도 흔들린다)과 §4 음성항(실제 넘침은 그대로 잡힌다)이
 *    같이 못박는다.
 *
 * 본다:
 *   §1 위상 결정성 — settle() 뒤 무한 연출이 **전부** paused · currentTime 0 (두 프레임 × N회)
 *   §2 그 결과 — 광선 판의 ovfX 가 2 로 굳고 두 해상도가 **같다**(⇒ 차분이 소거한다)
 *   §3 되돌림 시험 — 옛 순서 사본은 위상도 ovfX 도 흔들린다(= 뿌리가 그것이었다)
 *   §4 축이 살아 있다 — 실제 넘침(그릇 폭 +400)은 위상과 무관하게 그대로 D2 에 걸린다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

const N = (() => { const i = process.argv.indexOf('--n'); return i > 0 ? Number(process.argv[i + 1]) : 3; })();
const OPENER = { label: 'shopcat:coin', shop: '#shopCats .shp-ct[data-cat="coin"]' };
const FRAMES = [[1080, 1600], [1080, 2280]];
const RAY = '.cn-cd.dia.top>.pn>.ray';

/* D2 의 판정식을 그대로 쓴다(probe351.js 139행) — 게이트가 자기 문턱을 새로 정하면 안 된다 */
const D2 = (el) => el.scrollWidth > el.clientWidth + 2;

/* 페이지에서 재는 것 한 벌 */
const MEASURE = function () {
  const app = document.getElementById('app');
  const ray = document.querySelector('.cn-cd.dia.top>.pn>.ray');
  const pn = ray && ray.parentElement;
  const anims = [];
  for (const a of app.getAnimations({ subtree: true })) {
    const t = a.effect && a.effect.getTiming();
    if (!t || t.iterations !== Infinity) continue;
    anims.push({ n: a.animationName || '', st: a.playState, cur: Math.round(Number(a.currentTime || 0)) });
  }
  return {
    ray: !!ray,
    rot: ray ? getComputedStyle(ray).rotate : null,
    rayW: ray ? Math.round(ray.getBoundingClientRect().width) : null,
    pnClientW: pn ? pn.clientWidth : null,
    ovfX: pn ? pn.scrollWidth - pn.clientWidth : null,
    d2: pn ? pn.scrollWidth > pn.clientWidth + 2 : null,
    hidden: pn ? getComputedStyle(pn).overflowX : null,
    ptr: ray ? getComputedStyle(ray).pointerEvents : null,
    inf: anims.length,
    moving: anims.filter((a) => a.st !== 'paused' || a.cur !== 0).map((a) => `${a.n}@${a.cur}(${a.st})`),
  };
};

/* 옛 순서(10회차 판) — §3 되돌림 시험 전용 사본. `settle()` 의 나머지(대기)는 같다. */
const OLD_ZERO = function () {
  const app = document.getElementById('app'); if (!app) return;
  for (const a of app.getAnimations({ subtree: true })) {
    const t = a.effect && a.effect.getTiming();
    if (!t || t.iterations !== Infinity) continue;
    try { a.currentTime = 0; a.pause(); } catch (_) {}
  }
};

(async () => {
  const browser = await launch(chromium);
  const now = [];   /* 지금 판 */
  const old = [];   /* 옛 순서 사본 */
  const alive = []; /* 축이 살아 있는가 */
  try {
    for (let i = 0; i < N; i++) {
      for (const [w, h] of FRAMES) {
        /* ── 지금 판 ── */
        {
          const { ctx, page } = await fresh(browser, w, h);
          await drive(page, OPENER);
          await settle(page);
          await page.waitForTimeout(400);   /* 세운 뒤에도 안 움직이는가 */
          now.push({ h, ...(await page.evaluate(MEASURE)) });
          /* §4 — 같은 페이지에 «진짜 넘침» 을 심어 D2 가 그대로 잡는지 본다 */
          alive.push(await page.evaluate(() => {
            const pn = document.querySelector('.cn-cd.dia.top>.pn');
            if (!pn) return { hit: false, by: 0 };
            const s = document.createElement('s');
            s.style.cssText = 'display:block;width:' + (pn.clientWidth + 400) + 'px;height:4px';
            pn.appendChild(s);
            const by = pn.scrollWidth - pn.clientWidth;
            return { hit: pn.scrollWidth > pn.clientWidth + 2, by };
          }));
          await ctx.close();
        }
        /* ── 옛 순서 사본 ── */
        {
          const { ctx, page } = await fresh(browser, w, h);
          await drive(page, OPENER);
          await page.evaluate(OLD_ZERO);
          await page.waitForTimeout(400);
          old.push({ h, ...(await page.evaluate(MEASURE)) });
          await ctx.close();
        }
      }
    }
  } finally { await browser.close(); }

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
  const vals = (rows) => rows.map((r) => r.ovfX);
  const uniq = (a) => [...new Set(a)];

  console.log('\n§1 위상 결정성 ──────────────────────────────────────────────');
  ok(now.every((r) => r.ray), `[1-a] 표본이 실재한다 — 광선 ${RAY} 이 두 프레임 모두 그려진다 (${now.length}판)`);
  const moving = now.filter((r) => r.moving.length);
  ok(!moving.length,
    `[1-b] settle() 뒤 **무한 연출이 전부** paused · currentTime 0 — 안 세워진 자 ${moving.length}건`
    + (moving.length ? ` (${moving[0].moving.slice(0, 3).join(' · ')})` : ` (표본당 무한 연출 ${now[0].inf}개)`));
  const rots = uniq(now.map((r) => r.rot));
  ok(rots.length === 1 && rots[0] === '0deg',
    `[1-c] 광선의 회전각이 실행·프레임과 무관하게 **0deg 하나**다 — rotate ${JSON.stringify(rots)}`);

  console.log('\n§2 그 결과 — D2 가 조용해지는 이유는 «위상이 0 이라서» 다 ────────');
  ok(uniq(vals(now)).length === 1,
    `[2-a] ovfX 가 실행마다 같다 — 값 ${JSON.stringify(uniq(vals(now)))} (${now.length}판, 등재문은 3~4px 를 7회 중 3회)`);
  const byH = {};
  for (const r of now) (byH[r.h] = byH[r.h] || []).push(r.ovfX);
  ok(uniq(byH[1600]).length === 1 && uniq(byH[2280]).length === 1 && byH[1600][0] === byH[2280][0],
    `[2-b] 두 해상도가 **같은 값**이다 ⇒ 차분이 소거한다 — 1600 ${JSON.stringify(byH[1600])} · 2280 ${JSON.stringify(byH[2280])}`);
  ok(now.every((r) => r.d2 === false),
    `[2-c] 그 값(${now[0].ovfX})은 D2 문턱(clientW+2 = ${now[0].pnClientW + 2}) 을 안 넘는다 — 문턱은 한 칸도 안 건드렸다`);
  ok(now.every((r) => r.rayW > r.pnClientW && r.hidden === 'hidden' && r.ptr === 'none'),
    `[2-d] 넘치던 것은 «내용» 이 아니라 **설계상 잘리는 장식**이다 — 광선 ${now[0].rayW}px > 판 ${now[0].pnClientW}px `
    + `· 판 overflow-x:${now[0].hidden} · 광선 pointer-events:${now[0].ptr} (122 2회차 주석: «판은 overflow:hidden 이라 잘라 줄 것도 이미 있다»)`);

  console.log('\n§3 되돌림 시험 — 옛 순서로 세우면 지금도 흔들린다 ──────────────');
  const oldMoving = old.filter((r) => r.moving.length).length;
  ok(oldMoving > 0,
    `[3-a] 옛 순서(`+'`currentTime=0` → `pause()`'+`) 사본은 **0 에 안 선다** — 위상이 0 이 아닌 판 ${oldMoving}/${old.length}건`
    + (old.find((r) => r.moving.length) ? ` (예: ${old.find((r) => r.moving.length).moving[0]})` : ''));
  ok(old.some((r) => r.ovfX > now[0].ovfX),
    `[3-b] 그래서 옛 사본의 ovfX 는 지금보다 커진다 — 옛 ${JSON.stringify(vals(old))} ↔ 지금 ${JSON.stringify(uniq(vals(now)))}`);
  ok(old.some((r) => r.d2 === true),
    `[3-c] 옛 사본에서는 **D2 가 실제로 켜진다**(문턱을 넘는 판이 있다) ⇒ 등재문의 3/7 은 이 자리에서 나온 것이다 — `
    + `켜진 판 ${old.filter((r) => r.d2).length}/${old.length}`);
  ok(uniq(vals(old)).length > 1 || uniq(old.map((r) => r.rot)).length > 1,
    `[3-d] 옛 사본은 값·각도가 실행마다 **다르다**(플레이키의 정의) — ovfX ${JSON.stringify(uniq(vals(old)))} · rotate ${JSON.stringify(uniq(old.map((r) => r.rot)))}`);

  console.log('\n§4 축이 살아 있다 — 기대값을 눌러 끄지 않았다 ──────────────────');
  ok(alive.every((a) => a.hit),
    `[4-a] 같은 판에 «그릇 폭 +400px» 자식을 심으면 D2 가 **그대로 잡는다** — ${alive.filter((a) => a.hit).length}/${alive.length}판 `
    + `(넘침 ${uniq(alive.map((a) => a.by)).join(' · ')}px)`);
  ok(alive.every((a) => a.by > 2),
    `[4-b] 그 넘침은 위상과 무관하다(회전 bbox 가 아니라 흐름 폭이다) — 최소 ${Math.min(...alive.map((a) => a.by))}px`);

  console.log(`\nVERIFY421 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY421 CRASH', e); process.exit(2); });
