#!/usr/bin/env node
/* 451 재현기 — «21 도감 리본(`.cl-rib`) 검정 상변 ↔ HUD 판때기(`.pedge`) 검정 하변» 이
 * 짧은 프레임에서 **한 덩어리로 융합되는가** 를 «찍힌 픽셀» 로 묻는다.
 *
 * 실행: node tools/probe451.js [--frames 1600,1920,2280]
 *
 * 왜 `probe447` 로 안 끝나는가(385 «자매 자 드리프트» 를 알면서도 하나 더 세우는 이유):
 *   `probe447` 은 **rect 축**이다 — 「리본 상변 − `.pedge` 하변 = 0.0」 까지만 답한다.
 *   451 의 등재문은 그 0.0 이 아니라 **«두 검은 외곽선이 한 덩어리로 읽혀 리본 상변이
 *   소실된다»** 이고, 그것은 rect 가 아니라 **색**이다. 350 이 «표시 전용 HUD 는
 *   `elementFromPoint` 가 캔버스로 빠지니 찍힌 픽셀을 읽어라» 로 못박은 자리와 같다.
 *   ⇒ 이 자는 세로 단면을 훑어 **검정 런(run)** 을 세고, 두 검정 사이에 «햇빛»(비검정)이
 *      몇 px 있는지 답한다. 그 수가 곧 처방의 눈금이다.
 *
 * 재는 것(모두 `#app` 로컬 좌표 · 프레임 1080 폭이라 x 는 1:1):
 *   · `seam`     — `probe447` 과 같은 rect 축(리본 상변 − `.pedge` 하변). 두 자의 대조용이다.
 *   · `col[x]`   — x 열의 세로 단면. `.pedge` 하변 위 24px 부터 리본 시안 시작까지 훑어
 *                  ① 검정 런의 길이 ② 두 검정 사이 비검정 런(=햇빛)의 길이 ③ 그 색을 찍는다.
 *   · `ribStroke`— 리본 몸통(`.cl-rib>s.bd`)의 검정 상변 두께(계산값). 처방의 «한 획» 눈금.
 *
 * ⚠ 열은 **겹치는 구간에서만** 뜻이 있다 — `.pedge` 는 폭 475(clip-path 로 우하단이 깎인다)이고
 *    리본은 x264.5..807.5 다. 겹침은 x≈264.5..475 뿐이라 그 안에서만 표본을 잡는다.
 *    (밖에서는 위가 딤 배경이라 «융합» 이 원리적으로 안 일어난다 — 음성 대조로 한 열 같이 찍는다.)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

const argFrames = (() => {
  const i = process.argv.indexOf('--frames');
  return i > 0 ? process.argv[i + 1].split(',').map(Number) : [1600, 1920, 2024, 2280];
})();

const OPENER = { sel: '.side .ibtn[data-pop="coll"]' };
const SHOTS = path.resolve(__dirname, '../docs/shots');

/* 표본 열 — 리본 좌끝(264.5)부터 10px 간격으로 훑는다.
   ⚠ **겹침 구간은 «폭 475» 가 아니다**(1회차에 그렇게 잡았다가 열 넷 중 둘이 헛표본이었다):
      `.pedge` 는 `clip-path` 로 우하단이 계단처럼 깎이고 그 **위에** `mask-image` 가
      y101 위를 통째로 지운다 ⇒ **y≈135 아래까지 검정이 내려오는 것은 x ≲ 379 뿐**이다.
      (x=400 은 판때기 하변이 y≈100 이라 마스크에 걸려 아예 안 그려진다.)
   ⇒ 열을 촘촘히 깔아 «어디서부터 어디까지 융합인가» 를 자가 직접 답하게 한다. */
const COLS = [270, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 420, 600];
/* «검정» 판정 문턱.
   ⚠ **40 은 못 쓴다**(1회차 실측): 딤(rgba(0,0,0,.53))이 깔린 배경이 rgb(41,29,44) 언저리라
      문턱 바로 위에 걸리고, 장면이 어두운 자리는 그 아래로 내려가 **배경이 «검정» 으로 읽힌다**
      (2280 에서 여유 120.5 인데 «융합 9열» 이 나온 것이 그것이다 — 350 이 비네트로 겪은 함정).
   ⇒ 순수 #000 만 검정으로 본다. 판때기도 리본 테두리도 선언이 `#000` 이고, 딤은 판때기 «위» 에
      깔리지만 검정 위 검정은 그대로 검정이라 이 문턱으로 둘 다 잡힌다.
      경계 안티에일리어싱 1px 은 «햇빛» 쪽으로 세어 **보수적**으로 읽는다. */
const BLACK = 10;

async function readCols(page, shotPath, cols, y1, y2) {
  const b64 = fs.readFileSync(shotPath).toString('base64');
  return page.evaluate(([data, xs, ya, yb]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const out = {};
      xs.forEach((x) => {
        const d = g.getImageData(x, ya, 1, yb - ya).data;
        const rows = [];
        for (let i = 0; i < yb - ya; i++) {
          rows.push({ y: ya + i, r: d[i * 4], g: d[i * 4 + 1], b: d[i * 4 + 2] });
        }
        out[x] = rows;
      });
      res(out);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, cols, y1, y2]);
}

/* 한 열의 이음매를 «리본 검정 상변» 에서 **위로** 읽는다.
   ⚑ 아래에서 위로 읽는 것이 핵심이다 — 위에서 아래로 첫 검정을 잡으면 판때기가 아니라
      초상화 카드·글자 잉크 같은 다른 검정을 잡는다(1회차에 x=450 이 정확히 그랬다).
   반환: {ribBlack, pedBlack, light, rgb} — light = 두 검정 사이 비검정 px 수(= «햇빛»). */
function seamPx(rows, pedBotY, ribTopY, blackMax) {
  const isB = (p) => p && p.r <= blackMax && p.g <= blackMax && p.b <= blackMax;
  const at = (y) => rows.find((p) => p.y === y);
  /* ① 판때기 잉크의 **맨 아래 순수 검정** — 기준선 142 근방에서 위로 찾는다.
     ⚠ 출발점은 **리본 상변 «위»** 여야 한다(2회차 수리): 여유가 0 인 수리 전 트리에서는
        142+2 에서 시작하면 리본 자기 획(142..148)을 판때기로 집어 **겹침 밖 열(x420·x600)까지
        «융합» 으로 찍었다.** 그 둘은 위에 판때기가 아예 없는 **음성 대조** 자리다. */
  let ped = null;
  const from = Math.min(Math.round(pedBotY) + 2, Math.round(ribTopY) - 1);
  for (let y = from; y >= rows[0].y; y--) { if (isB(at(y))) { ped = y; break; } }
  if (ped == null) return { ped: null };
  /* ② 거기서 아래로 내려가며 만나는 **첫 순수 검정** — 리본의 잉크다.
     ⚠ 둥근 코너(x270~300)에서는 몇 px 더 내려가서 만난다. 그것까지 «햇빛» 으로 세는 것이 맞다 —
        사람이 보는 것은 두 잉크 사이의 거리이지 rect 사이의 거리가 아니다. */
  let rib = null;
  const limit = Math.round(ribTopY) + 24;
  for (let y = ped + 1; y <= limit; y++) { if (isB(at(y))) { rib = y; break; } }
  if (rib == null) return { ped, rib: null };
  return { ped, rib, light: rib - ped - 1, rgb: (() => { const p = at(ped + 1); return p ? `${p.r},${p.g},${p.b}` : null; })() };
}

function seamOf(rows, ribTopY, blackMax) {
  const isB = (p) => p && p.r <= blackMax && p.g <= blackMax && p.b <= blackMax;
  const at = (y) => rows.find((p) => p.y === y);
  /* ① 리본 검정 상변 — ribTop 근방(±3px, 서브픽셀 여유)에서 검정을 찾는다. */
  let ribTop = null;
  for (let y = Math.round(ribTopY) - 3; y <= Math.round(ribTopY) + 6; y++) {
    if (isB(at(y))) { ribTop = y; break; }
  }
  if (ribTop == null) return { ribBlack: null };
  /* ⚑ 찾은 픽셀은 획의 **한복판일 수도** 있다 — 서브픽셀(리본 상변 142.0/262.5)이 반투명으로
     깔리면 문턱 40 아래로 떨어져 «검정» 이 한 줄 위에서 시작한다. 그 한 줄을 판때기로 세면
     햇빛이 통째로 0 이 된다(1회차에 2280 이 «여유 120.5 인데 융합» 으로 나온 것이 이것이다).
     ⇒ 먼저 **자기 검정 런의 꼭대기**까지 올라가고, 거기서부터 햇빛을 센다. */
  const seed = ribTop;
  while (ribTop > rows[0].y && isB(at(ribTop - 1))) ribTop--;
  const runH = seed - ribTop + 1 + (() => { let n = 0, y = seed; while (isB(at(y + 1))) { n++; y++; } return n; })();
  /* ⚑ **이 런의 높이가 판정이다.** 리본 자기 획은 6px 이다 — 런이 그보다 훨씬 길면
     판때기 검정이 **같은 런 안에** 들어와 있다는 뜻이고, 그것이 등재문의 «한 덩어리» 다.
     (융합이면 위로 걸어도 «햇빛» 이 안 나온다 — 두 검정 사이에 경계가 아예 없기 때문이다.) */
  /* ② 런 꼭대기에서 위로 올라가며 비검정(햇빛)을 세고, 다시 검정을 만나면 그것이 판때기다. */
  let y = ribTop - 1, light = 0, rgb = null;
  while (y >= rows[0].y && !isB(at(y))) {
    if (light === 0) { const p = at(y); rgb = p ? `${p.r},${p.g},${p.b}` : null; }
    light++; y--;
  }
  const pedBlack = y >= rows[0].y ? y : null;   /* null = 훑은 구간 안에 판때기 검정 없음 */
  return { ribBlack: ribTop, runH, pedBlack, light: pedBlack == null ? null : light, rgb };
}

(async () => {
  const browser = await launch(chromium);
  let fail = 0;
  const table = [];
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  console.log('[451] 리본 검정 상변 ↔ `.pedge` 검정 하변 — 찍힌 픽셀로 «융합» 을 묻는다\n');

  for (const h of argFrames) {
    const { ctx, page } = await fresh(browser, 1080, h);
    await settle(page);
    await drive(page, OPENER);
    await page.waitForTimeout(420);

    const geo = await page.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const L = (v) => Math.round((v - A.top) * 10) / 10;
      const q = (s) => document.querySelector(s);
      const rib = q('.cl-rib'), ped = q('.pedge'), bd = q('.cl-rib>s.bd');
      const on = q('#collw') && q('#collw').classList.contains('on');
      if (!rib || !ped || !bd || !on) return { bad: true, on: !!on, rib: !!rib, ped: !!ped, bd: !!bd };
      const rr = rib.getBoundingClientRect(), pr = ped.getBoundingClientRect();
      const cs = getComputedStyle(bd);
      return {
        appTop: A.top,
        ribTop: L(rr.top), pedBot: L(pr.bottom),
        stroke: Math.round(parseFloat(cs.borderTopWidth) * 10) / 10,
        bdTop: L(bd.getBoundingClientRect().top),
      };
    });
    if (geo.bad) {
      console.log(`  ${h}: 판정 불가 — #collw.on=${geo.on} rib=${geo.rib} pedge=${geo.ped} bd=${geo.bd}`);
      fail++; await ctx.close(); continue;
    }

    const shot = path.join(SHOTS, `probe451-${h}.png`);
    await page.screenshot({ path: shot });

    /* 훑는 구간: 판때기 하변 위 30px ~ 리본 시안(테두리 아래) 아래 8px */
    const y1 = Math.max(0, Math.round(geo.pedBot - 30) + Math.round(geo.appTop));
    const y2 = Math.round(geo.ribTop + geo.stroke + 30) + Math.round(geo.appTop);
    const cols = await readCols(page, shot, COLS, y1, y2);

    const seam = Math.round((geo.ribTop - geo.pedBot) * 10) / 10;
    console.log(`  frameH ${h} — 리본상변 ${geo.ribTop} · .pedge 하변 ${geo.pedBot} · rect 여유 ${seam} · 리본 검정획 ${geo.stroke}px`);

    const line = [];
    const A = Math.round(geo.appTop);
    for (const x of COLS) {
      const s = seamPx(cols[x], geo.pedBot + A, geo.ribTop + A, BLACK);
      if (s.ped == null) { line.push(`x=${x}  판때기 잉크 없음(겹침 밖 — 음성 대조)`); table.push({ h, x, skip: true }); continue; }
      if (s.rib == null) { line.push(`x=${x}  판때기 y${s.ped - A} · 아래 24px 안에 리본 잉크 없음`); table.push({ h, x, skip: true }); continue; }
      /* 융합 판정 — 두 잉크 사이 «햇빛» 이 리본 자기 획(6px)보다 얇으면 획이 판때기에 붙어 읽힌다. */
      const fused = s.light < geo.stroke;
      line.push(`x=${x}  판때기 y${s.ped - A} → 리본 y${s.rib - A} · 햇빛 **${s.light}px**` +
        (s.rgb ? ` rgb(${s.rgb})` : '') + (fused ? `   ⚠ 획(${geo.stroke}px)보다 얇다 = 융합` : ''));
      table.push({ h, x, light: s.light, fused, rgb: s.rgb });
    }
    line.forEach((v) => console.log('    ' + v));
    console.log('');
    await ctx.close();
  }

  await browser.close();

  /* 요약 — 프레임마다 «융합된 열» 수와, 안 融合된 열의 햇빛 최솟값. */
  console.log('[451] 프레임별 요약 — 융합 열 / 햇빛 최소');
  for (const h of argFrames) {
    const rows = table.filter((t) => t.h === h && !t.skip);
    if (!rows.length) { console.log(`  ${h}: 표본 없음`); continue; }
    const fz = rows.filter((r) => r.fused);
    const mn = Math.min(...rows.map((r) => r.light));
    console.log(`  ${h}: 열 ${rows.length}개 · **융합 ${fz.length}개**` +
      (fz.length ? `(${fz.map((r) => 'x' + r.x).join(',')})` : '') + ` · 햇빛 최소 **${mn}px**`);
  }
  console.log('\n  판정: 두 순수 검정 잉크 사이의 «햇빛» 이 리본 자기 획(6px)보다 얇으면');
  console.log('        그 획은 판때기의 일부로 읽힌다 = 등재문의 «한 덩어리».');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
