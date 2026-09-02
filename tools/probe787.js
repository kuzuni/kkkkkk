#!/usr/bin/env node
/* 787 재현·실측기 — 19 프로필 · 20 종합스탯의 «수치로 닫을 수 있는» 자리만 잰다.
 *
 *   node tools/probe787.js            # 표로 출력 (2280·1600 두 프레임)
 *   node tools/probe787.js --json a.json
 *
 * 왜 이 자가 따로 있는가(338 규칙) — 705 §6 이 넘긴 감점 표에는 **유령이 섞여 있다**
 * («자물쇠 +112px» 은 작업 137 의 의도된 이탈, «탭 1개» 는 201 ① 주인 지시).
 * 처방을 따르기 전에 «레퍼런스 절대값과 정말 어긋난 자리» 만 골라내려고 먼저 잰다.
 *
 * 무엇을 재는가 (측정표에서 옮긴 ref 값과 짝):
 *   ⓐ `#spcEdit` 연필 글리프 — **잉크 bbox vs 테두리 상자**(넘침이면 몇 px 넘치는가)
 *   ⓑ 19 칭호 카드 격자 — 카드 w×h · 가로/세로 pitch · 행 수
 *   ⓒ 20 스탯 리스트 뷰포트 — 절대 y·높이 · 행 피치
 *   ⓓ 20·19 하단 토글 탭 — 컨테이너 bbox
 * 잉크(ⓐ)는 «요소를 숨긴 장 ↔ 보이는 장» 차분으로 잡는다(ink141 방식) — 배경 크림·테두리가
 * 색 마스크에 딸려오는 것을 막기 위해서다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

/* 레퍼런스 절대값 — 측정표 19 §5-2 · 20 §7-1/§7-2/§8-1 (재측정 금지, 옮겨 적기만) */
const REF = {
  card:      { w: 350, h: 77, px: 370, py: 100 },   /* 19 §5-2 */
  listY:     977, listH: 760, rowPitch: 60,          /* 20 §7-1 정오표 · §7-2 */
  spcTabs:   { x: 157, y: 1776, w: 767, h: 94 },     /* 20 §8-1 */
  editBox:   { w: 53, h: 54 },                       /* 20 §6 5회차 정정판 */
};

/* 캡처 y = ref y − 84 */
const toCap = (refY) => refY - 84;

async function shot(page) {
  const b = await page.screenshot();
  return b.toString('base64');
}
async function load(page, slot, b64) {
  await page.evaluate(async ({ slot, b64 }) => {
    window.__p787 = window.__p787 || {};
    const im = new Image();
    im.src = 'data:image/png;base64,' + b64;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    window.__p787[slot] = { d: g.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height };
  }, { slot, b64 });
}

/* 차분으로 잉크 bbox 를 잡는다.
 * mode 'el'   — 요소를 통째로 숨긴다(요소가 «칠하는 모든 것» = 테두리·배경·그림자 포함).
 * mode 'text' — **글자만** 지운다(테두리·배경·그림자는 양쪽 장에 그대로 남아 차분에서 상쇄된다).
 * ⚠ 둘을 섞어 쓰지 마라 — `visibility:hidden` 으로 «글리프 넘침» 을 재면 `box-shadow`(여기서는
 *   `0 3px 8px`)가 통째로 잉크로 딸려와 «아래로 2px 넘친다» 는 **가짜 결함**이 나온다(1회차에 실제로 그랬다). */
async function inkOf(page, sel, mode = 'el', fill = 'any') {
  await load(page, 'A', await shot(page));
  await page.evaluate(({ s, m }) => {
    const e = document.querySelector(s); if (!e) return;
    if (m === 'text') { e.dataset.p787 = e.textContent; e.textContent = ''; }
    else e.style.visibility = 'hidden';
  }, { s: sel, m: mode });
  await page.waitForTimeout(120);
  await load(page, 'B', await shot(page));
  await page.evaluate(({ s, m }) => {
    const e = document.querySelector(s); if (!e) return;
    if (m === 'text') { e.textContent = e.dataset.p787 || ''; delete e.dataset.p787; }
    else e.style.visibility = '';
  }, { s: sel, m: mode });
  return page.evaluate(({ s, fill }) => {
    const A = window.__p787.A, B = window.__p787.B;
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    /* 상자 둘레로 넉넉히 40px 여유를 둔 창만 훑는다(넘침을 보려면 상자 밖도 봐야 한다) */
    const x0 = Math.max(0, Math.floor(r.left - 40)), x1 = Math.min(A.w - 1, Math.ceil(r.right + 40));
    const y0 = Math.max(0, Math.floor(r.top - 40)), y1 = Math.min(A.h - 1, Math.ceil(r.bottom + 40));
    let lo = 1e9, hi = -1e9, top = 1e9, bot = -1e9, n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = (y * A.w + x) * 4;
      const d = Math.abs(A.d[o] - B.d[o]) + Math.abs(A.d[o + 1] - B.d[o + 1]) + Math.abs(A.d[o + 2] - B.d[o + 2]);
      if (d < 40) continue;                     /* AA 떨림 문턱 */
      /* «흰 채움만»/«초록 채움만» — 측정표가 적은 잉크는 **채움**이고 검정 외곽선은 그 밖이다.
         차분만 쓰면 외곽선까지 딸려와 잉크가 stroke 두께의 2배만큼 부풀어 보인다(126 §9-6 교훈). */
      if (fill !== 'any') {
        const R = A.d[o], G = A.d[o + 1], B2 = A.d[o + 2];
        if (fill === 'white' && Math.min(R, G, B2) <= 230) continue;   /* refink787 과 «같은» 문턱 — 행 줄무늬(min 199~210) 배제 */
        if (fill === 'green' && !(G > 200 && B2 < 140 && R < 215)) continue;  /* refink787 과 «같은» 문턱 */
        if (fill === 'cream' && !(R > 230 && G > 220 && B2 > 150)) continue;  /* 크림흰 #FEF7C1 만 — 금색 배너 #FFC736(B 54) 배제 */
      }
      n++; if (x < lo) lo = x; if (x > hi) hi = x; if (y < top) top = y; if (y > bot) bot = y;
    }
    if (!n) return { px: 0 };
    return {
      px: n, x: lo, y: top, w: hi - lo + 1, h: bot - top + 1,
      box: { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      over: {                                   /* 상자 밖으로 넘친 양(+ 면 넘침) */
        left: +(r.left - lo).toFixed(1), right: +(hi + 1 - r.right).toFixed(1),
        top: +(r.top - top).toFixed(1), bottom: +(bot + 1 - r.bottom).toFixed(1),
      },
    };
  }, { s: sel, fill });
}

const box = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s); if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
}, sel);

(async () => {
  const out = {};
  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(FILE, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof openProfile === 'function');
    await page.waitForTimeout(1100);
    /* cap787/cap705 와 «같은» 표본 상태라야 캡처 비평과 대조가 성립한다 */
    await page.evaluate(() => {
      S.rank = 2; S.titles = { 0: 1, 1: 1, 2: 1, 3: 1 };
      S.avatar = 'av0'; S.avatars = Object.assign({ av0: 1 }, S.avatars);
      S.lv.atk = 120; S.lv.hp = 120; S.lv.regen = 60; S.lv.crit = 20;
      S.lv.cdmg = 15; S.lv.pierce = 3; S.lv.def = 12; S.lv.gold = 20;
      markDirty(); save(); openProfile();
    });
    await page.waitForTimeout(900);

    const F = out[H] = { f19: {}, f20: {} };

    /* ── 19 프로필 탭 ───────────────────────────────────────── */
    F.f19.grid = await box(page, '.pf-grid');
    F.f19.cards = await page.evaluate(() => {
      const cs = [...document.querySelectorAll('.pf-grid .pf-card')];
      if (!cs.length) return null;
      const r = cs.map(e => { const b = e.getBoundingClientRect(); return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; });
      const xs = [...new Set(r.map(a => a.x))].sort((a, b) => a - b);
      const ys = [...new Set(r.map(a => a.y))].sort((a, b) => a - b);
      return { n: r.length, cols: xs.length, rows: ys.length, w: r[0].w, h: r[0].h,
        pitchX: xs.length > 1 ? +(xs[1] - xs[0]).toFixed(1) : null,
        pitchY: ys.length > 1 ? +(ys[1] - ys[0]).toFixed(1) : null, first: r[0] };
    });
    F.f19.tgl = await box(page, '.pf-tgl');
    F.f19.bnInk = await inkOf(page, '.pf-grid .pf-card:nth-child(1) .pf-bn > i', 'text', 'any');

    /* ── 20 종합스탯 탭 ─────────────────────────────────────── */
    await page.evaluate(() => { const e = document.querySelector('.pf-tgl>.lb'); if (e) e.click(); });
    await page.waitForTimeout(900);
    F.f20.list = await box(page, '.spc-list');
    F.f20.rowPitch = await page.evaluate(() => {
      const rs = [...document.querySelectorAll('.spc-list .spc-row')];
      if (rs.length < 2) return null;
      const a = rs[0].getBoundingClientRect(), b = rs[1].getBoundingClientRect();
      return { n: rs.length, pitch: +(b.top - a.top).toFixed(1), h: +a.height.toFixed(1) };
    });
    /* 787 2회차 — 라벨을 키우면 **오른쪽 값과 부딪히는지**가 첫 번째 위험이다(둘 다 nowrap).
       13행 전부에서 «라벨 우변 ↔ 값 좌변» 최소 간격을 잰다. 음수면 겹친 것이다. */
    /* 787 2회차 — 비평 A·B 가 **독립적으로** «라벨 잉크 중심이 행 중심보다 2~2.5px 위» 를 냈다
       (값은 양쪽 다 행 중심과 Δ0). 잉크 중심을 행 밴드 중심과 직접 비교한다. */
    F.f20.vc = await inkOf(page, '.spc-list .spc-row:nth-child(2) > .nm', 'text', 'white');
    F.f20.vcRow = await page.evaluate(() => {
      const r = document.querySelectorAll('.spc-list .spc-row')[1].getBoundingClientRect();
      return { top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1), mid: +((r.top + r.bottom) / 2).toFixed(1) };
    });
    F.f20.vcV = await inkOf(page, '.spc-list .spc-row:nth-child(2) > .vl', 'text', 'green');
    F.f20.gap = await page.evaluate(() => {
      const rs = [...document.querySelectorAll('.spc-list .spc-row')];
      let worst = 1e9, at = null;
      for (const r of rs) {
        const a = r.querySelector('.nm'), b = r.querySelector('.vl');
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const g = rb.left - ra.right;
        if (g < worst) { worst = g; at = (a.textContent || '').trim() + ' | ' + (b.textContent || '').trim(); }
      }
      return { gap: +worst.toFixed(1), at };
    });
    F.f20.tabs = await box(page, '.spc-tabs');
    F.f20.editBox = await box(page, '#spcEdit');
    /* ② ⑥ 축 — 측정표가 적은 «채움» 잉크만 골라 잰다(외곽선 제외) */
    F.f20.nmInk = await inkOf(page, '.spc-list .spc-row:nth-child(1) > .nm', 'text', 'white');
    F.f20.vlInk = await inkOf(page, '.spc-list .spc-row:nth-child(1) > .vl', 'text', 'green');
    F.f20.tabOnInk = await inkOf(page, '.spc-tab-on > b > i', 'text', 'cream');
    F.f20.tabOffInk = await inkOf(page, '.spc-tab-off > i', 'text', 'any');
    F.f20.editInk = await inkOf(page, '#spcEdit', 'text');   /* 글리프만 */
    F.f20.editPaint = await inkOf(page, '#spcEdit', 'el');     /* 요소가 칠하는 전부(그림자 포함) */

    await ctx.close();
  }
  await browser.close();

  /* ── 출력 ─────────────────────────────────────────────────── */
  for (const H of [2280, 1600]) {
    const F = out[H];
    console.log(`\n══════ frame ${H} ══════`);
    const c = F.f19.cards;
    if (c) {
      console.log(`ⓑ 19 칭호 카드  ${c.n}장 / ${c.cols}열 × ${c.rows}행  카드 ${c.w}×${c.h} (ref ${REF.card.w}×${REF.card.h}, Δ${(c.w - REF.card.w).toFixed(1)}×${(c.h - REF.card.h).toFixed(1)})`);
      console.log(`                pitch ${c.pitchX}×${c.pitchY} (ref ${REF.card.px}×${REF.card.py}, Δ${c.pitchX === null ? '—' : (c.pitchX - REF.card.px).toFixed(1)}×${c.pitchY === null ? '—' : (c.pitchY - REF.card.py).toFixed(1)})`);
    } else console.log('ⓑ 19 칭호 카드  — 못 찾음(.pf-grid .pf-card)');
    const L = F.f20.list, RP = F.f20.rowPitch;
    if (L) console.log(`ⓒ 20 리스트     y ${L.y} h ${L.h}   (ref y ${toCap(REF.listY)} h ${REF.listH} · Δy ${(L.y - toCap(REF.listY)).toFixed(1)} Δh ${(L.h - REF.listH).toFixed(1)})`);
    if (RP) console.log(`                행 ${RP.n}개 · 피치 ${RP.pitch} (ref ${REF.rowPitch}, Δ${(RP.pitch - REF.rowPitch).toFixed(1)}) · 높이 ${RP.h}`);
    const VC = F.f20.vc, VR = F.f20.vcRow, VV = F.f20.vcV;
    if (VC && VC.px && VR) {
      const c = VC.y + VC.h / 2;
      console.log(`   행2 라벨 잉크중심 ${c.toFixed(1)} vs 행중심 ${VR.mid}  → Δ ${(c - VR.mid).toFixed(1)}px (음수면 위로 쏠림)`);
      if (VV && VV.px) { const cv = VV.y + VV.h / 2; console.log(`   행2 값   잉크중심 ${cv.toFixed(1)}  → Δ ${(cv - VR.mid).toFixed(1)}px`); }
    }
    const G = F.f20.gap;
    if (G) console.log(`   라벨↔값 최소 간격 ${G.gap}px  (음수면 겹침)  최악 행: ${G.at}`);
    const T = F.f20.tabs;
    if (T) console.log(`ⓓ 20 탭 컨테이너 x ${T.x} y ${T.y} ${T.w}×${T.h} (ref x ${REF.spcTabs.x} y ${toCap(REF.spcTabs.y)} ${REF.spcTabs.w}×${REF.spcTabs.h})`);
    const IK = (o, ref, nm) => o && o.px
      ? console.log(`   ${nm}  채움잉크 ${o.w}×${o.h}  (ref h ${ref} · Δ ${(o.h - ref).toFixed(1)} = ${(100 * (o.h - ref) / ref).toFixed(1)}%)`)
      : console.log(`   ${nm}  채움잉크 — 차분 0px`);
    console.log('② ⑥ 축 — 채움 잉크(외곽선 제외)');
    IK(F.f20.nmInk, 25.5, '20 행 라벨 ');
    IK(F.f20.vlInk, 22.5, '20 행 값   ');
    IK(F.f20.tabOnInk, 33, '20 활성 탭 ');
    IK(F.f20.tabOffInk, 31, '20 비활성탭');
    IK(F.f19.bnInk, 23, '19 카드 배너');
    const E = F.f20.editBox, EI = F.f20.editInk;
    if (E) console.log(`ⓐ 20 ✎ 상자     ${E.w}×${E.h} (ref ${REF.editBox.w}×${REF.editBox.h})`);
    if (EI && EI.px) console.log(`   ✎ 글리프 잉크 ${EI.w}×${EI.h} @(${EI.x},${EI.y})  넘침 좌${EI.over.left} 우${EI.over.right} 상${EI.over.top} 하${EI.over.bottom}  ← +면 상자 밖`);
    else console.log('   ✎ 글리프 잉크 — 차분 0px(못 잡음)');
    const EP = F.f20.editPaint;
    if (EP && EP.px) console.log(`   ✎ 칠 전체(그림자 포함) ${EP.w}×${EP.h}  넘침 좌${EP.over.left} 우${EP.over.right} 상${EP.over.top} 하${EP.over.bottom}`);
  }
  if (JSON_AT) require('fs').writeFileSync(JSON_AT, JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
