#!/usr/bin/env node
/* 작업 530 — «`verify356` [S3] ③ 래칫이 실행마다 흔들린다» 의 재현자 (측정 전용)
 *
 *   node tools/probe530.js                 # 기본 5화면 × 6회 — 스윕이 «무엇을 재게 되는가» 만 센다
 *   node tools/probe530.js --iter 3
 *   node tools/probe530.js --json
 *
 * ── 왜 전 화면 스윕(probe418)이 아니라 이 자인가 ────────────────────────
 * 등재문(530)의 물음은 «제품이 찌그러졌나» 가 아니라 **«자가 같은 트리에서 같은 답을 내는가»** 다.
 * 전 화면 스윕은 한 번에 10분이라 «네 번 돌려 보기» 가 한 시간짜리 실험이 된다. 그런데 흔들림의
 * 뿌리를 보는 데는 **판정까지 갈 필요가 없다** — 스윕의 **입력 집합**(= 그 순간 화면에 있던
 * 측정 대상 노드)이 실행마다 다른지만 보면 된다.
 * ⇒ 이 자는 `probe418.sweep()` 과 **같은 순서**(진입 → 애니·타이머 정지)로 페이지를 만들고,
 *   그 시점에 «연출 노드가 몇 개 섞여 있는가» 를 센다. 그 수가 실행마다 다르면 래칫도 흔들린다.
 *
 * ── 무엇을 «연출 노드» 로 보는가 ───────────────────────────────────────
 *   ⓐ 연출 레이어 `#fxlc`(z7 · 전투 발) · `#fxl`(z60 · UI 발) 안의 노드
 *   ⓑ 자신 또는 조상이 `fx-*` 클래스를 달고 있는 노드 (`.cbox.cGold.fx-punch` 가 그 자리다)
 * 둘 다 «찰나» 다 — 356 [A] 가 지키려는 것은 «**상시** 크롬 아이콘의 종횡» 이다.
 *
 * ── 두 번째 절 — 정규화가 실제로 먹는가 ───────────────────────────────
 * 같은 페이지에 `probe418` 의 `SETTLE_FX`(레이어 비우기 + `fx-` 클래스 걷기)를 먹이고 다시 센다.
 * 여기서 **0** 이 나와야 스윕이 «상시» 상태에서 잰 것이다. 이 절이 없으면 정규화가 조용히
 * 안 먹어도 아무도 모른다(397 «무음 실패» 사고).
 *
 * ── 세 번째 절 — 흔들림의 «둘째» 뿌리: 무한 반복 애니 ────────────────
 * 연출 노드를 다 걷어도 칸 수가 ±2 남았다. 뿌리는 정지 절차 자신이었다 —
 * `a.finish()` 는 **무한 반복 애니에서 던지고**(그 예외를 try/catch 가 삼켰다),
 * `clearInterval`·rAF 무력화는 CSS 애니를 안 멈춘다. ⇒ 122 의 상시 쥬시가 계속 돌아
 * 13 재화 카드 아이콘의 y 가 실행마다 1.5px 씩 다른 자리에 굳었다.
 * 이 절은 **옛 정지(finish 만)** 와 **새 정지(무한은 주기 0)** 를 같은 화면에서 나란히 돌려
 * 그 드리프트를 px 로 찍는다 — 새 쪽이 0.00 이어야 결정적이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, URL } = require('./scan356');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const ITER = Number((argv[argv.indexOf('--iter') + 1]) || 6) || 6;
const DSF = 2;

/* 기본 표본 — 530 등재문이 «흔들리는 그룹» 으로 지목한 세 자리가 사는 화면 + 대조용 02 메인.
   ⓐ `#fxlc>b.fx-fly>img.cic` : 52 메뉴 · 29 룰렛 · 22 퀘스트 · 33 재화 정보
   ⓑ `.cbox.cGold.fx-punch>i>img.cic` : 상단 HUD 라 전 화면 공통 */
const PICK = ['02 메인', '52 메뉴', '29 룰렛', '22 퀘스트', '33 재화 정보(유물조각)'];

/* ⚑ 레이어 이름·정규화는 **한 곳**(probe418)에서 가져온다 — 두 벌로 적으면 한쪽만 늙는다(402 교훈) */
const { SETTLE_FX, FX_LAYERS, FREEZE, STILL_CSS } = require('./probe418');

/* §3 대조군 — 530 «전» 의 정지 절차(무한 반복을 못 세운다). 되돌림 시험용으로만 쓴다. */
const OLD_FREEZE = function () {
  for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
  for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
  window.requestAnimationFrame = () => 0;
  return { fin: -1, held: -1 };
};

/* §3 표본 — 122 가 상시 쥬시를 얹은 화면. 카드 아이콘의 화면 y 를 그대로 읽는다. */
const READ_Y = () => [...document.querySelectorAll('#shopList .gem, #shopList .gm, #shopList .pil>em>img')]
  .map((e) => +e.getBoundingClientRect().top.toFixed(4));

/* probe418 의 COLLECT 와 같은 «잴 만한 노드» 조건 — 그 자가 무엇을 재게 되는지를 그대로 본다 */
const COUNT_FX = function (layers) {
  const app = document.getElementById('app');
  if (!app) return { err: 'no #app' };
  const inLayer = (el) => layers.some((id) => {
    const l = document.getElementById(id); return l && l !== el && l.contains(el);
  });
  const fxAnc = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.classList && [...e.classList].some((c) => c.slice(0, 3) === 'fx-')) return true;
    }
    return false;
  };
  const out = [];
  for (const el of app.querySelectorAll('img, canvas, svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const a = inLayer(el), b = fxAnc(el);
    if (!a && !b) continue;
    let sel = el.tagName.toLowerCase() + (el.className && el.className.baseVal === undefined
      ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '');
    let host = el.parentElement ? el.parentElement.className : '';
    out.push({ sel, host: String(host).slice(0, 40), layer: a, cls: b,
      box: `${r.width.toFixed(2)}×${r.height.toFixed(2)}` });
  }
  return { n: out.length, list: out };
};

async function once(browser, label, steps, settleFx) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  const page = await ctx.newPage();
  let r = { n: 0, list: [] };
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    for (const s of steps) {
      await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, s);
      await page.waitForTimeout(420);
    }
    await page.waitForTimeout(350);
    /* probe418 과 **같은** 정지 절차 — 함수째 가져다 쓴다(두 벌로 적으면 한쪽만 늙는다) */
    const frz = await page.evaluate(FREEZE);
    await page.waitForTimeout(200);
    if (settleFx) {
      const got = await page.evaluate(SETTLE_FX, FX_LAYERS);
      if (got && got.missing) throw new Error('연출 레이어 #' + got.missing + ' 없음');
      await page.waitForTimeout(180);
    }
    r = await page.evaluate(COUNT_FX, FX_LAYERS);
    r.frz = frz;
  } catch (e) {
    r = { n: -1, list: [], err: String(e.message || e).split('\n')[0] };
  }
  await ctx.close();
  return r;
}

/* §3 — 한 화면에서 «정지» 만 갈아 끼우고 카드 아이콘 y 의 실행 간 드리프트를 잰다 */
async function drift(browser, label, steps, freezeFn, still) {
  const runs = [];
  for (let i = 0; i < ITER; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, s);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(350);
      await page.evaluate(freezeFn);
      await page.waitForTimeout(200);
      await page.evaluate(SETTLE_FX, FX_LAYERS);
      if (still) await page.addStyleTag({ content: STILL_CSS });
      await page.waitForTimeout(180);
      runs.push(await page.evaluate(READ_Y));
    } catch (e) { runs.push([]); }
    await ctx.close();
  }
  const n = Math.min(...runs.map((r) => r.length));
  let worst = 0, at = -1;
  for (let k = 0; k < n; k++) {
    const col = runs.map((r) => r[k]);
    const d = Math.max(...col) - Math.min(...col);
    if (d > worst) { worst = d; at = k; }
  }
  return { nodes: n, worst: +worst.toFixed(4), at, runs };
}

(async () => {
  const browser = await launch(chromium);
  const screens = SCREENS.filter(([l]) => PICK.includes(l));
  const rows = [];
  for (const mode of [false, true]) {
    for (const [label, steps] of screens) {
      const counts = [];
      const seen = new Map();
      for (let i = 0; i < ITER; i++) {
        const r = await once(browser, label, steps, mode);
        counts.push(r.n);
        for (const g of r.list) {
          const k = `${g.sel} «${g.host}» ${g.layer ? '레이어' : '클래스'}`;
          seen.set(k, (seen.get(k) || 0) + 1);
        }
      }
      rows.push({ mode: mode ? '정규화 뒤' : '정규화 전', screen: label, counts,
        min: Math.min(...counts), max: Math.max(...counts),
        /* ⚠ 합계는 «몇 회에서 봤나» 가 아니라 **«${ITER}회 동안 몇 건»** 이다 — 한 실행에
           같은 꼴이 둘 이상 뜨는 자리(비행 코인)가 있어 ITER 을 넘을 수 있다. */
        seen: [...seen.entries()].map(([k, v]) => `${k} — ${ITER}회 동안 ${v}건`) });
    }
  }
  /* §3 — 무한 반복 애니 드리프트(옛 정지 ↔ 새 정지) */
  const shop = SCREENS.find(([l]) => l === '13 재화 탭');
  const dOld = shop ? await drift(browser, shop[0], shop[1], OLD_FREEZE, false) : null;
  const dNew = shop ? await drift(browser, shop[0], shop[1], FREEZE, true) : null;

  await browser.close();

  const before = rows.filter((r) => r.mode === '정규화 전');
  const after = rows.filter((r) => r.mode === '정규화 뒤');
  const swing = before.filter((r) => r.min !== r.max).length;
  const leftover = after.reduce((n, r) => n + r.max, 0);

  if (JSON_OUT) { console.log(JSON.stringify({ iter: ITER, rows, swing, leftover, dOld, dNew }, null, 1)); process.exit(0); }

  console.log(`[probe530] ${screens.length}화면 × ${ITER}회 — 스윕이 재게 되는 «연출 노드» 수`);
  for (const r of rows) {
    console.log(`  [${r.mode}] ${r.screen} — ${r.counts.join(' · ')}  (${r.min}~${r.max})`);
    for (const s of r.seen) console.log(`        ${s}`);
  }
  console.log('');
  console.log(`  ① 정규화 «전» 실행마다 수가 달라진 화면: ${swing}/${before.length}` +
    `  ← 0 이 아니면 스윕의 입력 집합이 흔들린다 = [S3] ③ 래칫이 흔들린다`);
  console.log(`  ② 정규화 «뒤» 남은 연출 노드 합계: ${leftover}  ← 0 이어야 «상시» 상태다`);
  if (dOld && dNew) {
    console.log('');
    console.log(`[probe530 §3] 13 재화 탭 카드 아이콘 y — 같은 트리 ${ITER}회, «정지» 만 갈아 끼웠다`);
    console.log(`  옛 정지(finish 만)              — 노드 ${dOld.nodes}개 · 최대 드리프트 ${dOld.worst}px (노드 #${dOld.at})`);
    console.log(`  새 정지(+ \`animation:none\` 선언) — 노드 ${dNew.nodes}개 · 최대 드리프트 ${dNew.worst}px (노드 #${dNew.at})`);
    console.log(`  ③ 새 정지가 0.0000 이어야 «같은 트리 = 같은 답» 이다 (문턱 ±0.5% 를 넘나들게 하던 축)`);
  }
  process.exit(0);
})();
