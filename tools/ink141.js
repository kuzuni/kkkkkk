/* 작업 141 — 22 퀘스트 «수량 배지»(`.qs-i > i.ifq`) 잉크 실측기.
 *
 *   node tools/ink141.js            # 표로 출력
 *   node tools/ink141.js --json a.json
 *
 * 무엇을 재는가 — 측정표 `docs/measure/22-퀘스트팝업.md` §5-2 의 규격과 «같은 것» 을 잰다:
 *   · **잉크(흰 채움)** = 차분 픽셀 중 `min(rgb) > 150` 인 것의 bbox (외곽선 제외)
 *   · 같이 내는 «ink» 는 외곽선 포함 bbox 다 — 측정표의 «흰 채움» 과 섞어 쓰지 마라(126 §9-6 교훈).
 * 왜 차분인가 — 배지가 프레임 금색 림·검정 테두리 위에 걸쳐 있어서 색 마스크만으로 자르면
 *   프레임 테두리가 같이 딸려온다(그게 바로 옛 «w 77» 오염 표본의 정체다. 측정표 §5-2 정오표).
 * 왜 잡음 기준선(N) 두 장인가 — 22 는 122 의 카드 배경 연출 · 60 의 펄스가 계속 돌아서
 *   한 장짜리 기준선으로는 위상이 우연히 같은 프레임을 못 거른다(m126ink.js 와 같은 이유).
 *
 * 상태는 cap22.js 와 «같게» 만든다 — 레퍼런스와 같은 탭·같은 진행률이라야 대조가 성립한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
/* 배율 — 1× 는 ±0.5px 양자화가 «자간 L» 을 푸는 연립식에서 ×2.7 로 증폭돼(dL/dA2 = 67/25)
   두 번 재면 답이 3px 씩 갈렸다. 3× 로 찍으면 ±0.17px 이라 그 증폭을 견딘다. */
const DSF = (() => { const i = process.argv.indexOf('--dsf'); return i > 0 ? +process.argv[i + 1] : 3; })();

/* cap22.js 와 같은 세이브 — 5행 전부 진행 중(회색 버튼), 레퍼런스와 같은 상태.
   ⚑ 851(2026-09-03) — 799 가 진행을 «누적 절대값»(`questProg = q.get()`) 으로, 목표를 등차
   (`step × (s+1)`) 로 바꾼 뒤로 기준선 `S.quest[].base` 는 **읽는 곳이 0곳**이다. 옛 표본은
   그 base 로 짜여 있어 5행 중 4행이 진행 100% · 초록 활성이었다(레퍼런스와 정반대).
   ⇒ 진행률은 **카운터와 s 두 값**으로 만든다. base 를 되살리는 방향으로 고치지 마라(799 금지). */
const SAVE = {
  totalKills: 44, best: 6, summons: 15, upgrades: 69,
  gold: 5e7, dia: 12000,
  own: { slash: { n:0, l:1 }, shuri: { n:0, l:1 }, stone: { n:0, l:1 },
         curve: { n:0, l:1 }, multi: { n:0, l:1 }, orbit: { n:0, l:1 } },
  quest: {
    summon: { s: 1 },   /* goal 15×2  =  30 · 진행 15 (50%) */
    upg:    { s: 12 },  /* goal 10×13 = 130 · 진행 69 (53%) */
    kill:   { s: 1 },   /* goal 100×2 = 200 · 진행 44 (22%) */
    stage:  { s: 6 },   /* goal 1×7   =   7 · 진행 6  (86%) */
    coll:   { s: 1 }    /* goal 5×2   =  10 · 진행 6  (60%) */
  }
};

/* 레퍼런스 규격 (측정표 §5-2, 126 ②-2 5회차 정정판) */
const REF = {
  2: { w: 46, h: 27 },     /* `50`  x197~242 / y782~808 */
  3: { w: 67, h: 27 },     /* `100` x186~252 */
  /* 프레임 하단(ref 803.5) 대비 흰 채움 위치. y782~808 은 **끝값 포함** 이므로
     위 = 803.5 − 782 = 21.5 · 아래 = (808+1) − 803.5 = **5.5** 다(둘의 합 27 = 잉크 높이).
     처음에 4.5 로 적었더니 합이 26 이 돼 잉크 높이 27 과 안 맞았다. */
  belowFrameBottom: 5.5,
  aboveFrameBottom: 21.5,
};

async function stash(page, slot, b64) {
  await page.evaluate(async ({ slot, b64 }) => {
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => rej(new Error('decode ' + slot));
      i.src = 'data:image/png;base64,' + b64;
    });
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    window.__i141 = window.__i141 || {};
    window.__i141[slot] = g.getImageData(0, 0, im.width, im.height).data;
    window.__i141.W = im.width;
  }, { slot, b64 });
}

/* 한 자리만 창을 잘라 A·N1·N2·B 네 장으로 잰다 (주변 연출 오염 차단) */
async function inkOne(page, it) {
  const clip = { x: it.win[0], y: it.win[2], width: it.win[1] - it.win[0], height: it.win[3] - it.win[2] };
  const sel = `[data-i141="${it.i}"]`;
  const shot = async () => (await page.screenshot({ clip })).toString('base64');
  const a = await shot();
  await page.waitForTimeout(110); const n1 = await shot();
  await page.waitForTimeout(110); const n2 = await shot();
  await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.style.visibility = 'hidden'; }, sel);
  await page.waitForTimeout(110);
  const b = await shot();
  await page.waitForTimeout(110);
  const b2 = await shot();          /* B 를 두 장 — 한 장짜리면 그 프레임만의 떨림이 통째로 «잉크» 가 된다 */
  await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.style.visibility = ''; }, sel);
  for (const [k, v] of [['a', a], ['n', n1], ['n2', n2], ['b', b], ['b2', b2]]) await stash(page, k, v);

  await page.evaluate((k) => { window.__i141.K = k; }, DSF);
  const r = await page.evaluate(({ w, h }) => {
    const da = window.__i141.a, db = window.__i141.b, db2 = window.__i141.b2,
          dn = window.__i141.n, dn2 = window.__i141.n2, W = window.__i141.W;
    const TH = 18, FILL = 150;
    const diff = (p, q, o) => Math.abs(p[o] - q[o]) + Math.abs(p[o + 1] - q[o + 1]) + Math.abs(p[o + 2] - q[o + 2]);
    const noisy = (o) => diff(da, dn, o) >= TH || diff(da, dn2, o) >= TH || diff(dn, dn2, o) >= TH;
    let lo = 1e9, hi = -1e9, top = 1e9, bot = -1e9, n = 0;
    let wlo = 1e9, whi = -1e9, wtop = 1e9, wbot = -1e9, wn = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * W + x) * 4;
      if (diff(da, db, o) < TH) continue;
      if (diff(da, db2, o) < TH) continue;   /* 두 B 장 모두에서 사라져야 «그 글자가 그린 잉크» 다 */
      if (noisy(o)) continue;
      n++;
      if (x < lo) lo = x; if (x > hi) hi = x;
      if (y < top) top = y; if (y > bot) bot = y;
      if (Math.min(da[o], da[o + 1], da[o + 2]) > FILL) {
        wn++;
        if (x < wlo) wlo = x; if (x > whi) whi = x;
        if (y < wtop) wtop = y; if (y > wbot) wbot = y;
      }
    }
    if (n < 6) return null;
    const K = window.__i141.K || 1;        /* 디바이스 px → CSS px */
    return {
      ink: +((hi - lo + 1) / K).toFixed(2), inkH: +((bot - top + 1) / K).toFixed(2), px: n,
      fill: wn < 6 ? null : +((whi - wlo + 1) / K).toFixed(2), fillH: wn < 6 ? null : +((wbot - wtop + 1) / K).toFixed(2),
      fx0: wn < 6 ? null : wlo / K, fx1: wn < 6 ? null : whi / K,
      fy0: wn < 6 ? null : wtop / K, fy1: wn < 6 ? null : wbot / K, fillPx: wn,
    };
  }, { w: clip.width * DSF, h: clip.height * DSF });
  if (!r) return Object.assign({}, it, { fill: null });
  /* 창 좌표 → 뷰포트 좌표 */
  return Object.assign({}, it, r, {
    fx0: r.fx0 == null ? null : r.fx0 + clip.x, fx1: r.fx1 == null ? null : r.fx1 + clip.x,
    fy0: r.fy0 == null ? null : r.fy0 + clip.y, fy1: r.fy1 == null ? null : r.fy1 + clip.y,
  });
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1000);
  /* 부팅 뒤 자동 전투가 카운터를 밀어 진행률이 실행마다 흔들린다 — 팝업을 열기 직전에 못박는다(851) */
  await page.evaluate(() => {
    window.step = () => {};
    S.totalKills = 44; S.best = 6; S.summons = 15; S.upgrades = 69;
    save();
  });
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
  });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(500);

  /* 레퍼런스와 «같은 문자열» 로 재는 모드. 숫자는 글리프마다 폭이 달라서(Jua `1` 은 좁다)
     우리 보상값 235/224/210/260 을 ref `50`/`100` 과 바로 비교하면 자릿수 말고 글리프가
     섞인다 — 5행을 ref 두 표본으로 갈아 끼워 «같은 글자» 끼리 잰다. 기본값이 이쪽이다. */
  const RAW = process.argv.includes('--raw');
  const TXT = (() => { const i = process.argv.indexOf('--text'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
  if (!RAW) {
    await page.evaluate((tt) => {
      const t = tt || ['50', '100', '50', '100', '50'];
      document.querySelectorAll('.qs-r').forEach((row, ri) => {
        const q = row.querySelector('.qs-i .ifq');
        if (q) q.textContent = t[ri % t.length];
      });
    }, TXT);
    await page.waitForTimeout(250);
  }

  const items = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.qs-r').forEach((row, ri) => {
      const fr = row.querySelector('.qs-i');
      const q = fr && fr.querySelector('.ifq');
      if (!fr || !q) return;
      q.setAttribute('data-i141', String(ri));
      const fb = fr.getBoundingClientRect(), qb = q.getBoundingClientRect();
      const cs = getComputedStyle(q);
      const sxm = cs.transform && cs.transform.match(/matrix\(([^)]+)\)/);
      out.push({
        i: ri, text: (q.textContent || '').trim(),
        digits: (q.textContent || '').replace(/[^0-9]/g, '').length,
        fs: +parseFloat(cs.fontSize).toFixed(2),
        sx: sxm ? +parseFloat(sxm[1].split(',')[0]).toFixed(4) : 1,
        stroke: cs.webkitTextStrokeWidth,
        frame: { x: +fb.x.toFixed(1), y: +fb.y.toFixed(1), w: +fb.width.toFixed(1), h: +fb.height.toFixed(1),
                 cx: +(fb.x + fb.width / 2).toFixed(1), bottom: +fb.bottom.toFixed(1) },
        boxH: +qb.height.toFixed(1),
        win: [Math.max(0, Math.floor(fb.x - 40)), Math.min(innerWidth, Math.ceil(fb.right + 40)),
              Math.max(0, Math.floor(fb.bottom - 46)), Math.min(innerHeight, Math.ceil(fb.bottom + 30))],
      });
    });
    return out;
  });

  const rows = [];
  for (const it of items) rows.push(await inkOne(page, it));
  await browser.close();

  const pct = (a, b) => (b ? ((a - b) / b * 100).toFixed(1).padStart(6) + '%' : '   —  ');
  console.log('행 | 값   | 자릿 | fs    | sx    | 흰채움 w×h | ref w×h | Δw      | Δh      | 중심Δ | 프레임하단 대비 (위/아래)');
  for (const r of rows) {
    const ref = REF[r.digits];
    const cx = (r.fx0 != null) ? (r.fx0 + r.fx1 + 1 / DSF) / 2 : null;
    const above = (r.fy0 != null) ? (r.frame.bottom - r.fy0).toFixed(1) : '—';
    const below = (r.fy1 != null) ? (r.fy1 + 1 / DSF - r.frame.bottom).toFixed(1) : '—';
    console.log(
      ` ${r.i + 1} | ${String(r.text).padEnd(4)} | ${String(r.digits).padStart(3)}  | ` +
      `${String(r.fs).padStart(5)} | ${String(r.sx).padStart(5)} | ` +
      `${String(r.fill).padStart(4)}×${String(r.fillH).padEnd(4)} | ` +
      `${ref ? String(ref.w).padStart(3) + '×' + ref.h : '  —   '} | ` +
      `${ref ? pct(r.fill, ref.w) : '   —  '} | ${ref ? pct(r.fillH, ref.h) : '   —  '} | ` +
      `${cx != null ? (cx - r.frame.cx).toFixed(1).padStart(5) : '   — '} | ` +
      `${above} / ${below}  (ref ${REF.aboveFrameBottom} / ${REF.belowFrameBottom})`
    );
  }
  /* 자연 잉크폭(scaleX 를 되돌린 값) — 다음 sx 를 한 번에 푼다 */
  console.log('\n자연 잉크폭(= 흰채움 / sx) 과 목표 sx:');
  for (const r of rows) {
    const ref = REF[r.digits];
    if (!ref || !r.fill) continue;
    const nat = r.fill / r.sx;
    console.log(`  ${r.digits}자리 «${r.text}»: 자연 ${nat.toFixed(1)}  → 목표 sx = ${ref.w}/${nat.toFixed(1)} = ${(ref.w / nat).toFixed(3)}`
      + `   (자당 잉크 ${(r.fill / r.digits).toFixed(1)} vs ref ${(ref.w / r.digits).toFixed(1)})`);
  }
  if (JSON_AT) require('fs').writeFileSync(JSON_AT, JSON.stringify(rows, null, 1));
})();
