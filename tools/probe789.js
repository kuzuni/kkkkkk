#!/usr/bin/env node
/* 작업 789 재현 — `tools/verify432.js` 가 실행마다 «다른 항» 에서 빨간 뿌리
 *   실행: node tools/probe789.js   → 마지막 줄이 `PROBE789 n/n PASS` 여야 한다.
 *
 * 등재문(sess-0143-10571, 700 회귀 곁다리)은 이렇게 적혀 있었다 —
 *   「§2 «클립 차분 0px» 과 §3 «잉크 높이» 가 프레임 명단째 흔들린다 · `[2-*]` 차분은 늘
 *    **bbox 57×35 · 최대Δ255**(같은 모양의 작은 잉크 한 덩이)라 «클립» 이 아니라
 *    **그 순간 그려져 있던 무언가**로 읽힌다」 · 처방 후보는 「회당 연출(666·683)을 비우고 찍는다」.
 *
 * ⚑ **재현이 그 «연출» 가설을 기각했다.** 흔들리는 것은 연출이 아니라
 *   **41 팝업 내장 재화 바(`.pcb`)의 숫자**다 — 그 바는 프레임 **0~108** 을 덮고
 *   (`.pcb{top:-104px}` · `#relw{top:104px}`), 골드는 방치 전투로 **로드가 흐른 시간만큼** 오른다.
 *   `verify432` 는 상태마다 페이지를 **새로 띄워** 전 프레임 스크린샷을 차분하므로, 두 로드의
 *   진입 시각이 몇십 ms 만 어긋나도 그 알약의 자릿수가 갈리고 **그 잉크가
 *   «클립이 지운 잉크»(§2) · «글로우가 그린 잉크»(§3·§R2)로 읽힌다.**
 *   bbox 가 늘 57×35 인 것이 그 지문이다(숫자 두어 자).
 *
 * ⚠ **이 자 자신은 플레이키면 안 된다**(LESSONS 382-④) — 그래서 «흔들리기를 기다리지» 않고
 *   **기다림을 넣어 흔든다**: 같은 상태를 두 번 띄우되 한쪽만 `AGE_MS` 만큼 더 굴린 뒤 찍는다.
 *   그러면 [1]~[3] 이 양쪽 방향으로 결정적이고, 자연 A/A 쌍은 «가만히 둬도 난다» 를
 *   **관측으로만** 남긴다(단언은 ROI 쪽에만 건다).
 *
 * 본다:
 *   [1] 시간이 흐르면 전역 차분이 **생긴다**(같은 상태·같은 CSS인데도)
 *   [2] 그 차분은 전부 패널 **위**(`y < panelTop` = `.pcb` 띠 안)에 있다 — 패널 안이 아니다
 *   [3] 픽셀 말고 **값**으로 물어도 같다 — 두 로드의 `.pcb` 알약 글자가 다르다
 *   [4] 패널 상변부터 자르면(ROI) 차분이 **전 쌍 0** 이다(늙힌 쌍까지)
 *   [5] 그 ROI 가 글로우 상자를 **통째로** 담는다(현행 490 · 옛 550 둘 다) — 좁혀서 감춘 게 아니다
 *   [6] 되돌림 시험 — ROI 안에 진짜 변화(글로우 끄기)를 넣으면 차분이 그대로 잡힌다
 *   [7] 처방의 되돌림 시험 — **같은 페이지에서 시계를 끊으면** 2.5초 뒤에도 전 프레임이 한 픽셀도
 *       안 바뀌고, **안 끊으면 바뀐다**(`verify432` 가 네 판을 한 페이지에서 찍을 수 있는 근거)
 *
 * ⚑ `roi()` 는 `verify432.js` 가 **이 파일에서 그대로 가져다 쓴다**(385 «자매 자 드리프트» —
 *   재는 창을 두 곳에 적으면 두 자가 서로 다른 것을 재게 되는 날이 온다).
 */

/* 재는 창 — **패널 상변부터 프레임 바닥까지.**
 *   위로 잘라내는 것은 `.pcb`(41 재화 바 · 프레임 0~108) 한 띠뿐이고, 그 띠는 이 축이
 *   닿을 수 없는 자리다(글로우 상자 상변 = `--rw-bt − 104` 로 패널 한참 안쪽 — [5-a] 가 잰다).
 *   아래는 **한 픽셀도 안 자른다** — §2 가 묻는 «클립이 지우는 잉크» 는 정의상 패널 **밖**
 *   (하변 아래)에 있으므로, 아래를 자르면 그 항이 «무조건 0» 이 되어 통째로 무의미해진다. */
function roi(m, vh) {
  const y = Math.max(0, Math.floor(m.panelTop));
  return { x: 0, y, width: 1080, height: Math.max(1, Math.ceil(vh) - y) };
}
module.exports = { roi };

if (require.main === module) main();

function main() {
  const { pw, launch } = require('./pwlaunch');
  const { chromium } = pw();
  const { fresh, settle, drive } = require('./probe351lib');

  const FRAMES = [1842, 1920];
  const NAT_PAIRS = 2;          /* 자연 A/A — 관측용 */
  const AGE_MS = 2500;          /* «늙힌» 쪽이 더 굴리는 시간 — 재화가 반드시 오른다 */
  const OPENER = { label: 'tab:box', sel: '.tab[data-t="box"]' };

  const MEASURE = function () {
    const pn = document.querySelector('#relw>.rw-panel');
    const mid = document.querySelector('#relw .rw-mid');
    if (!pn || !mid) return { err: 'no panel/mid' };
    const pr = pn.getBoundingClientRect(), mr = mid.getBoundingClientRect();
    const bs = getComputedStyle(mid, '::before');
    const pcb = document.querySelector('#relw>.pcb');
    const pcr = pcb ? pcb.getBoundingClientRect() : null;
    return {
      panelTop: +pr.top.toFixed(1), panelBot: +pr.bottom.toFixed(1),
      /* ::before 는 rect 가 없다 — 계산값으로 센다(LESSONS 432-①) */
      glowTop: +(mr.top + parseFloat(bs.top)).toFixed(1),
      glowH: parseFloat(bs.height),
      pcbTop: pcr ? +pcr.top.toFixed(1) : null,
      pcbBot: pcr ? +pcr.bottom.toFixed(1) : null,
      /* 픽셀이 아니라 **값**으로 묻는 표본 — 알약 글자 그대로 */
      pills: [...document.querySelectorAll('#relw>.pcb .pcb-p')].map((c) => c.textContent.replace(/\s+/g, '')),
    };
  };

  /* 두 PNG 의 «다른 픽셀» — `r` 를 주면 그 창 안만 센다(좌표는 페이지 절대값 그대로다) */
  async function diffBox(dpage, a, b, r) {
    return dpage.evaluate(async ([x, y, rr]) => {
      const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
      const A = px(ia), B = px(ib), W = ia.width, H = ia.height;
      const cx1 = rr ? Math.max(0, rr.x) : 0, cy1 = rr ? Math.max(0, rr.y) : 0;
      const cx2 = rr ? Math.min(W, rr.x + rr.width) : W, cy2 = rr ? Math.min(H, rr.y + rr.height) : H;
      let n = 0, x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, worst = 0;
      for (let yy = cy1; yy < cy2; yy++) {
        for (let xx = cx1; xx < cx2; xx++) {
          const i = (yy * W + xx) * 4;
          const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
          if (d > 0) {
            n++;
            if (xx < x1) x1 = xx; if (xx > x2) x2 = xx;
            if (yy < y1) y1 = yy; if (yy > y2) y2 = yy;
            if (d > worst) worst = d;
          }
        }
      }
      return n ? { n, x1, y1, x2, y2, w: x2 - x1 + 1, h: y2 - y1 + 1, worst } : { n: 0, w: 0, h: 0, worst: 0, y1: -1, y2: -1 };
    }, [a.toString('base64'), b.toString('base64'), r || null]);
  }

  /* `verify432` 가 쓰는 것과 **같은 얼리기** — 여기서 한 번 더 적지 않도록 그 자와 같은 몸이다 */
  const FREEZE = function () {
    window.requestAnimationFrame = function () { return 0; };
    const top = setTimeout(function () {}, 0);
    for (let i = 1; i <= top; i++) { clearTimeout(i); clearInterval(i); }
    clearTimeout(top);
  };

  /* [7] — 한 페이지에서 두 번 찍는다. `freeze` 면 시계를 끊고, 아니면 그대로 둔다. */
  async function samePage(browser, h, freeze, waitMs) {
    const { ctx, page } = await fresh(browser, 1080, h);
    await drive(page, OPENER);
    await settle(page);
    if (freeze) await page.evaluate(FREEZE);
    await page.waitForTimeout(150);
    const a = await page.screenshot({ type: 'png' });
    await page.waitForTimeout(waitMs);
    const b = await page.screenshot({ type: 'png' });
    const m = await page.evaluate(MEASURE);
    await ctx.close();
    return { a, b, m };
  }

  async function shot(browser, h, css, ageMs) {
    const { ctx, page } = await fresh(browser, 1080, h);
    await drive(page, OPENER);
    if (css) await page.addStyleTag({ content: css });
    await settle(page);
    if (ageMs) { await page.waitForTimeout(ageMs); await settle(page); }
    const m = await page.evaluate(MEASURE);
    const b = await page.screenshot({ type: 'png' });
    await ctx.close();
    return { m, b };
  }

  (async () => {
    const browser = await launch(chromium);
    const nat = [], aged = [], negs = [], frz = [];
    try {
      const dctx = await browser.newContext({ viewport: { width: 300, height: 300 } });
      const dpage = await dctx.newPage();
      for (const h of FRAMES) {
        for (let k = 0; k < NAT_PAIRS; k++) {
          const A = await shot(browser, h, null, 0);
          const B = await shot(browser, h, null, 0);
          const R = roi(A.m, h);
          nat.push({ h, k, mA: A.m, mB: B.m, R, full: await diffBox(dpage, A.b, B.b, null), in: await diffBox(dpage, A.b, B.b, R) });
        }
        {   /* [1]~[3] — «늙힌» 쌍(결정적) */
          const A = await shot(browser, h, null, 0);
          const B = await shot(browser, h, null, AGE_MS);
          const R = roi(A.m, h);
          aged.push({ h, mA: A.m, mB: B.m, R, full: await diffBox(dpage, A.b, B.b, null), in: await diffBox(dpage, A.b, B.b, R) });
        }
        {   /* [6] 되돌림 — ROI 안에 진짜 변화를 넣는다(글로우를 끈다) */
          const A = await shot(browser, h, null, 0);
          const N = await shot(browser, h, '#relw .rw-mid::before{display:none !important}', 0);
          const R = roi(A.m, h);
          negs.push({ h, R, neg: await diffBox(dpage, A.b, N.b, R) });
        }
        {   /* [7] — 처방(«한 페이지 + 얼리기»)의 되돌림 시험 */
          const on = await samePage(browser, h, true, AGE_MS);
          const off = await samePage(browser, h, false, AGE_MS);
          frz.push({ h, on: await diffBox(dpage, on.a, on.b, null), off: await diffBox(dpage, off.a, off.b, null) });
        }
      }
      await dctx.close();
    } finally { await browser.close(); }

    let pass = 0, fail = 0;
    const ok = (c, msg) => { if (c) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };
    const all = nat.concat(aged);

    console.log('\n[1] 시간이 흐르면 전역 차분이 생긴다 ─────────────────────────');
    for (const o of nat) console.log(`     ${o.h} 자연 A/A #${o.k} — 전역 ${o.full.n}px` + (o.full.n ? ` (bbox ${o.full.w}×${o.full.h} @ y${o.full.y1}..${o.full.y2} · 최대Δ${o.full.worst})` : ' ← 이번엔 안 났다'));
    for (const o of aged) {
      ok(o.full.n > 0,
        `[1-${o.h}] +${AGE_MS}ms 만 더 굴린 판과의 전역 차분 **${o.full.n}px** (bbox ${o.full.w}×${o.full.h} · 최대Δ${o.full.worst}) — CSS 도 상태도 같은데 갈린다`);
    }
    console.log(`     ↑ 자연 A/A 는 ${nat.filter((o) => o.full.n > 0).length}/${nat.length}쌍에서 **가만히 둬도** 같은 지문이 났다(관측 — 단언은 안 건다)`);

    console.log('\n[2] 흔들리는 잉크는 패널 **위**(`.pcb` 띠)에 있다 ────────────');
    const shaky = all.filter((o) => o.full.n > 0);
    ok(shaky.length > 0 && shaky.every((o) => o.full.y2 < o.mA.panelTop),
      `[2-a] 비영 차분의 하변이 전부 패널 상변보다 위다 — ${shaky.map((o) => `y2 ${o.full.y2} < top ${o.mA.panelTop}`).join(' · ')}`);
    ok(shaky.every((o) => o.full.y1 >= o.mA.pcbTop && o.full.y2 <= o.mA.pcbBot),
      `[2-b] 그 자리가 41 재화 바 안이다(프레임 ${all[0].mA.pcbTop}~${all[0].mA.pcbBot}) — ${shaky.map((o) => `${o.full.y1}..${o.full.y2}`).join(' · ')}`);
    ok(shaky.every((o) => o.full.w <= 200 && o.full.h <= 60),
      `[2-c] 등재문의 지문 «작은 한 덩이(57×35 · 최대Δ255)» 와 같은 모양이다 — ${shaky.map((o) => `${o.full.w}×${o.full.h}/Δ${o.full.worst}`).join(' · ')}`);

    console.log('\n[3] 픽셀 말고 **값**으로 물어도 같다 ─────────────────────────');
    for (const o of all) console.log(`     ${o.h} — A ${JSON.stringify(o.mA.pills)} / B ${JSON.stringify(o.mB.pills)}`);
    ok(aged.every((o) => JSON.stringify(o.mA.pills) !== JSON.stringify(o.mB.pills)),
      `[3-a] 늙힌 쌍은 재화 알약 **글자**가 예외 없이 다르다 — 연출이 아니라 «값이 흐른다» 는 뜻`);
    ok(shaky.every((o) => JSON.stringify(o.mA.pills) !== JSON.stringify(o.mB.pills)),
      `[3-b] 그리고 **픽셀이 흔들린 쌍은 예외 없이 글자도 다르다** — 두 축이 같은 것을 가리킨다`);

    console.log('\n[4] 패널 상변부터 자르면(ROI) 차분이 전 쌍 0 ────────────────');
    for (const o of all) console.log(`     ${o.h} — ROI(y≥${o.R.y}) ${o.in.n}px` + (o.in.n ? ` (bbox ${o.in.w}×${o.in.h} @ y${o.in.y1}..${o.in.y2})` : ''));
    ok(all.every((o) => o.in.n === 0),
      `[4-a] 자연 쌍도 늙힌 쌍도 ROI 안은 **정확히 0** — ${all.map((o) => o.in.n).join('·')}`);

    console.log('\n[5] ROI 가 글로우 상자를 통째로 담는다 ──────────────────────');
    ok(all.every((o) => o.mA.glowTop >= o.R.y),
      `[5-a] 현행 상자(490) 상변이 ROI 안이다 — ${all.map((o) => `${o.mA.glowTop}≥${o.R.y}`).join(' · ')}`);
    ok(all.every((o) => o.mA.glowTop + 550 <= o.R.y + o.R.height),
      `[5-b] **옛 선언(550)** 으로 되돌린 상자 하변까지 ROI 안이다(§R 이 재는 자리를 안 자른다) — ${all.map((o) => `${o.mA.glowTop + 550}≤${o.R.y + o.R.height}`).join(' · ')}`);
    ok(all.every((o) => o.R.y + o.R.height >= o.mA.panelBot + 104),
      `[5-c] 패널 **하변 아래 104px**(넘침의 최댓값)까지 담는다 — §2 가 묻는 «클립이 지우는 잉크» 자리를 안 자른다`);

    console.log('\n[6] 되돌림 시험 — ROI 안에 진짜 변화를 넣으면 잡힌다 ────────');
    for (const o of negs) {
      ok(o.neg.n > 10000,
        `[6-${o.h}] 글로우를 끄면 ROI 안 차분 **${o.neg.n}px**(bbox ${o.neg.w}×${o.neg.h}) — 창을 좁힌 것이 «안 보이게 한 것» 이 아니다`);
    }

    console.log('\n[7] 처방의 되돌림 시험 — 시계를 끊으면 화면이 정말 언다 ────');
    for (const o of frz) {
      ok(o.on.n === 0,
        `[7-${o.h}] **얼린** 한 페이지는 ${AGE_MS}ms 뒤에도 전 프레임 차분 **${o.on.n}px** (= verify432 가 네 판을 한 페이지에서 찍어도 되는 근거)`);
      ok(o.off.n > 0,
        `[7-${o.h}n] **안 얼린** 같은 페이지는 같은 시간에 **${o.off.n}px** 이 바뀐다 (bbox ${o.off.w}×${o.off.h} @ y${o.off.y1}) — 얼리기가 «장식» 이 아니다`);
    }

    console.log(`\nPROBE789 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
    process.exit(fail ? 1 : 0);
  })();
}
