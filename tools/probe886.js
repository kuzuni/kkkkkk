#!/usr/bin/env node
/* 작업 886 — «89 유물 소환: 배수 바 크기의 재원은 니치 «밖» 에 있는가» 재현기
 *
 *   node tools/probe886.js            # [1] 상자 · [2] 화소 · [3] 갈래
 *   node tools/probe886.js --json     # 원자료
 *
 * ── 무엇을 묻는가 ────────────────────────────────────────────────────────────
 * 879 3회차가 «니치 예산은 닫혔다»(gapA + 96.53·s = 122.13 항등식)를 증명하고, 채점 2인이
 * 재원으로 지목한 «바↓수반 94px 여유» 를 §18 에서 «빈 곳이 아니다» 로 닫으며 이 행을 등재했다.
 * 등재문이 이 자에게 시킨 것은 셋이다:
 *   ① 867 의 «받침 위 12» 가 **지면선**(`--rw-fl`)에 매인 것이 옳은가, **수반 상변**이어야 하는가
 *   ② 지면선 아래로 바가 내려가면 «지면을 뚫는» 그림이 되는지를 **화소로**
 *   ③ 813 [E1] 의 아래 예약(구조적 최소 53)은 건드리지 않는다
 *
 * ⚑ 이 자가 실제로 찍은 것은 등재문이 예상한 것의 **반대 부호**다 —
 *    받침(`.rw-floor::before`)의 **상변은 `--rw-fl` 이 아니라 그보다 16px 위**다.
 *    그래서 «받침 위 12» 는 도면에서 «받침 **안** 4» 이고, 니치는 879 가 쓴 항등식보다
 *    **16px 좁다**. [2] 가 그것을 찍힌 픽셀로 확인하고 [3] 이 그 정정 위에서 갈래를 다시 연다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { decodePNG } = require('./png441.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const JSONOUT = process.argv.includes('--json');
const FRAMES = [1600, 1841, 1920, 2280, 2600];

/* ── 페이지 안에서 도는 자 ────────────────────────────────────────────────────
   식을 옮겨 적지 않고 **그려진 상자**에서 되잰다(813 [2] 규약).
   받침은 의사요소(`.rw-floor::before`)라 상자를 못 잡는다 — 같은 식을 문 클론을 `.rw-floor`
   안에 잠깐 넣어 브라우저가 푼 상자를 되잰다(probe879 의 아치판과 같은 수법). */
const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const rel = (r) => ({ t: r1(r.top - pr.top), b: r1(r.bottom - pr.top), h: r1(r.height),
                        l: r1(r.left - pr.left), r: r1(r.right - pr.left) });
  const box = (s) => { const e = q(s); return e ? rel(e.getBoundingClientRect()) : null; };
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const num = (n) => { ruler.style.height = 'var(' + n + ')';
    return ruler.getBoundingClientRect().height; };
  const av = num('--rw-av'), gt = num('--rw-gt'), fl = num('--rw-fl'),
        sh = num('--rw-sh'), gd = num('--rw-gd'), gs = num('--rw-gs');
  ruler.remove();
  const floor = q('#relw .rw-floor');
  /* 받침 클론 — «.rw-floor::before» 와 **같은 선언**을 물린다(리터럴을 옮겨 적지 않는다:
     실제 규칙에서 top/height 를 읽어 온다). */
  const pedRule = (() => {
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch (e) { continue; }
      for (const r of rules || []) {
        if (r.selectorText && r.selectorText.replace(/\\s+/g, '') === '.rw-floor::before')
          return { top: r.style.top, height: r.style.height, width: r.style.width };
      }
    }
    return null;
  })();
  const ped = document.createElement('div');
  ped.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%)';
  ped.style.top = (pedRule && pedRule.top) || '-16px';
  ped.style.height = (pedRule && pedRule.height) || '56px';
  ped.style.width = (pedRule && pedRule.width) || '617px';
  floor.appendChild(ped);
  const pedBox = rel(ped.getBoundingClientRect());
  ped.remove();
  const grid = box('#relw .rw-grid'), mul = box('#rwMulBar'), mid = box('#relw .rw-mid');
  /* 격자 행 간 — 그려진 슬롯에서 되잰다. 격자는 JS 가 그리므로 슬롯 노드의 y 를 모아
     서로 다른 «행» 의 위·아래 간격을 잡는다(못 잡으면 null 을 내고 호출부가 상수로 간다). */
  const slots = [...document.querySelectorAll('#relw .rw-grid > *')].map(e => rel(e.getBoundingClientRect()))
    .filter(r => r.h > 40).sort((a, b) => a.t - b.t);
  let rowGap = null;
  for (let i = 1; i < slots.length; i++)
    if (slots[i].t > slots[i - 1].b) { rowGap = r1(slots[i].t - slots[i - 1].b); break; }
  const slot = slots[0];
  return {
    panelH: r1(pr.height), panelY: r1(pr.top), panelX: r1(pr.left), panelW: r1(pr.width),
    av: r1(av), gt: r1(gt), fl: r1(fl), sh: r1(sh), gd: r1(gd), gs: r1(gs),
    grid, mul, mid, pedBox,
    slotH: slot ? slot.h : null,
    rowGap,
    pedRuleTop: pedRule ? pedRule.top : null,
    /* 세 요구(879 의 이름 그대로) + 이 작업이 새로 묻는 둘 */
    gapBar:  mul && grid ? r1(mul.t - grid.b) : null,   /* ② 격자 하변 ↔ 바 상변 */
    gapFl:   mul ? r1(fl - mul.b) : null,               /* ②/ 바 하변 ↔ **지면선** (867 이 «받침» 이라 부른 값) */
    seat:    mul ? r1(mul.b - pedBox.t) : null,         /* ★ 얹힘 깊이 — 양수면 바가 받침을 **파고든다** */
    bandPed: r1(pedBox.b - fl),                         /* 지면선 ↓ 받침 하변 */
    bandGnd: mid ? r1(mid.t - pedBox.b) : null,         /* 받침 하변 ↓ 수반 상변 */
    bandAll: mid ? r1(mid.t - fl) : null,               /* «94px 여유» 의 전부 */
  };
})()`;

async function openAt(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(200);
  /* 915 — 짝인 `verify886` 과 같은 자리·같은 이유(200 < `settle291.MIN_WAIT` 250 이라 공용 훅이
     안 돈다 · 그 대기가 `jzPgIn` 한복판이다). 재현자와 게이트가 **다른 프레임**에서 재면
     «자가 갈린다» 가 하나 더 생기므로 같이 넣는다(896 계열을 새로 만들지 않는다). */
  if (page.settle291) await page.settle291();
  return { ctx, page };
}

async function measure(browser, H, css) {
  const { ctx, page } = await openAt(browser, H, css);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}

/* ── [2] 화소 — 바를 숨겨 «바가 덮은 화소» 를 차분으로 잡는다 ────────────────── */
const HIDE_BAR = '#rwMulBar{display:none!important}';

async function inkScan(browser, H) {
  const shots = {};
  /* ⚑ «base2» 는 잡음 바닥이다 — 이 화면은 파티클·글로우가 돌아서 **같은 상태를 두 번 찍어도**
     차분이 0 이 아니다. 그걸 안 재면 «바가 덮은 화소» 에 애니메이션이 섞여 들어온다
     (1차 실행에서 1600 «지면선 아래 화소 5399» 가 그것이었다). */
  for (const [k, css] of [['base', ''], ['base2', ''], ['noBar', HIDE_BAR]]) {
    const { ctx, page } = await openAt(browser, H, css);
    const geo = await page.evaluate(M => eval(M), MEASURE);
    const buf = await page.screenshot();
    const f = path.join(ROOT, 'docs/shots', `probe886-${H}-${k}.png`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, buf);
    const d = decodePNG(f); shots[k] = { geo, png: { width: d.w, height: d.h, data: d.px } };
    fs.unlinkSync(f);
    await ctx.close();
  }
  const { geo, png } = shots.base;
  const W = png.width, H2 = png.height, py = geo.panelY, px = geo.panelX;
  /* ⚑ 문턱 40 — 요소 하나를 숨기면 이 화면 **전체**의 래스터가 계조 5~18 만큼 흔들린다
     (1차 실행: 바에서 72px 떨어진 바닥 행까지 «차분» 으로 잡혔다). 바 본체는 배경과
     계조 100 이상 차이 나므로 40 은 «덮였다» 만 남기고 그 흔들림을 떨군다. */
  const TH = 40;
  const at = (buf, x, y) => { const i = (y * W + x) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; };
  const d2 = (p, q, x, y) => {
    const a = at(p, x, y), b = at(q, x, y);
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  };
  /* 잡음이 낀 화소는 «바가 덮은 것» 에서 뺀다 — base↔base2 가 이미 다른 자리다. */
  const diff = (x, y) =>
    (d2(png.data, shots.base2.png.data, x, y) > TH) ? 0 : d2(png.data, shots.noBar.png.data, x, y);
  const noise = (x, y) => d2(png.data, shots.base2.png.data, x, y);
  /* ⓐ 바 잉크의 실제 하변 — 바를 숨겼을 때 달라지는 **가장 아래 행** */
  const yTop = Math.max(0, Math.round(py + geo.mul.t) - 6);
  const yBot = Math.min(H2 - 1, Math.round(py + geo.fl) + 60);
  const xa = Math.max(0, Math.round(px + geo.mul.l)), xb = Math.min(W, Math.round(px + geo.mul.r));
  let barInkB = null;
  for (let y = yBot; y >= yTop; y--) {
    let n = 0; for (let x = xa; x < xb; x++) if (diff(x, y) > TH) n++;
    if (n >= 8) { barInkB = y; break; }
  }
  /* ⓑ 받침 «상면 하이라이트 띠»(선언 0~5px)가 바에 얼마나 가려지는가 —
       띠의 각 행에서 «바가 덮은 x» 를 센다. 받침 폭 전체 대비 비율로 낸다. */
  const pedT = py + geo.pedBox.t;
  const bandH = Math.max(1, Math.round((geo.pedBox.b - geo.pedBox.t) * 5 / 56)); /* 선언 56 중 위 5 */
  const pxa = Math.max(0, Math.round(px + geo.pedBox.l)), pxb = Math.min(W, Math.round(px + geo.pedBox.r));
  let covered = 0, total = 0;
  for (let y = Math.round(pedT); y < Math.round(pedT) + bandH; y++) {
    if (y < 0 || y >= H2) continue;
    for (let x = pxa; x < pxb; x++) { total++; if (diff(x, y) > TH) covered++; }
  }
  /* ⓒ 지면선 아래를 바가 덮는가 — `--rw-fl` 아래 40px 창에서 차분 화소 수 */
  let belowFl = 0, noiseN = 0;
  for (let y = Math.round(py + geo.fl); y < Math.min(H2, Math.round(py + geo.fl) + 40); y++)
    for (let x = pxa; x < pxb; x++) { if (diff(x, y) > TH) belowFl++; if (noise(x, y) > TH) noiseN++; }
  return {
    frame: H, noiseN, barInkB: barInkB === null ? null : +(barInkB - py).toFixed(1),
    boxBarB: geo.mul.b, pedInkT: geo.pedBox.t, flY: geo.fl,
    seatPx: barInkB === null ? null : +(barInkB - (py + geo.pedBox.t)).toFixed(1),
    bandCovered: total ? +(covered / total * 100).toFixed(1) : null,
    bandH, belowFl,
  };
}

/* ── [3] 갈래 — 앵커 후보를 제품에 넣어 다시 잰다 ─────────────────────────────
   ⚠ 배율은 `rwMulFit()` 이 **인라인**으로 얹으므로 선언 쪽에서 이기려면 `!important` 가 필요하다.
      갈래마다 «배율을 그대로 두고 간극이 줄어드는 쪽»(keep-s)과 «간극을 지키고 배율이 주는
      쪽»(keep-gap)을 **둘 다** 넣는다 — 트레이드의 양쪽을 안 재면 자가 한 면만 묻는다(879 [2c] 교훈). */
function anchorCSS(clear, mbs) {
  /* 바 하변 = 받침 상변 − clear  ⇒  top = fl − ped − clear − 98   (전부 rwc 배) */
  const out = [`#rwMulBar{top:calc(var(--rw-fl) - (16px + ${clear}px + 98px) * var(--rwc,1))}`];
  if (mbs != null) out.push(`#relw{--rw-mbs:${mbs}!important}`);
  return out.join('\n');
}

(async () => {
  const browser = await launch(chromium);
  const base = {};
  for (const H of FRAMES) base[H] = await measure(browser, H);
  const ink = [await inkScan(browser, 1600), await inkScan(browser, 2280)];

  /* 갈래 산수 — 그려진 값에서 되잰다(상수를 옮겨 적지 않는다) */
  const g = base[1600];
  const rwc = +(g.gapFl / 12).toFixed(4);              /* 바 하변이 `fl − 12·rwc` 라는 제품의 식에서 역산 */
  const PED = +((g.fl - g.pedBox.t) / rwc).toFixed(2); /* 받침 상변이 지면선보다 몇 px 위인가(무배율) */
  const avU = +(g.av / rwc).toFixed(2);                /* 무배율 니치 */
  /* ⚑ 행 간은 **게이트가 쓰는 상수**(verify879 `ROW_PITCH` = 25.6 · 813 1회차 CF·CG 독립 실측)를
     그대로 쓴다 — 여기서 슬롯 상자로 새로 재면(33.4) 자가 셋째 눈금을 하나 더 만들고,
     그 순간 «어느 자로 잰 1.5배인가» 가 갈린다(887 이 바로 그 사고의 등재다). */
  const ROWG = 25.6, ROWG_SLOT = g.rowGap;
  const BARH = 98;
  const longBar = base[2280].mul.h;                    /* 긴 프레임 바 시각 높이(배율 1) */
  const rows = [];
  for (const clear of [-4, 0, 12]) {
    /* keep-s : 배율을 현행으로 두고 간극이 얼마가 되는가 */
    const sNow = +(g.mul.h / (BARH * rwc)).toFixed(4);
    const gapKeepS = +((avU - PED - clear - BARH * sNow) * rwc).toFixed(2);
    /* keep-gap : 간극을 행 간 ×1.5 로 두고 배율이 얼마가 되는가 */
    const sKeepG = +((avU - PED - clear - ROWG * 1.5 / rwc) / BARH).toFixed(4);
    rows.push({ clear, sNow, gapKeepS, gapKeepSx: +(gapKeepS / ROWG).toFixed(2),
      sKeepG, barKeepG: +(BARH * sKeepG * rwc).toFixed(2),
      pctKeepG: +(BARH * sKeepG * rwc / longBar * 100).toFixed(1),
      pctKeepS: +(g.mul.h / longBar * 100).toFixed(1) });
  }
  /* 갈래를 실제로 넣어 산수를 확인한다(두 자리만 — 현행 정정 c=0 과 등재문의 c=12) */
  const inj = [];
  for (const r of rows.filter(r => r.clear !== -4)) {
    const o = await measure(browser, 1600, anchorCSS(r.clear, r.sKeepG.toFixed(4)));
    inj.push({ clear: r.clear, gapBar: o.gapBar, seat: o.seat, barH: o.mul.h,
      pct: +(o.mul.h / longBar * 100).toFixed(1) });
  }
  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify({ base, ink, rows, inj }, null, 1)); return; }

  console.log('PROBE886 — 89 유물 소환: 받침 상변은 어디인가 · «94px 여유» 의 정체\n');
  console.log('[1] 상자 — 받침 상변은 `--rw-fl` 이 아니다');
  console.log('     프레임    지면선 fl   받침 상변   받침 하변   수반 상변 | 바 하변  ②\'바↓지면선  ★얹힘  격자↔바');
  for (const H of FRAMES) {
    const o = base[H];
    console.log('    ' + String(H).padStart(6) + '  ' +
      String(o.fl.toFixed(1)).padStart(9) + String(o.pedBox.t.toFixed(1)).padStart(12) +
      String(o.pedBox.b.toFixed(1)).padStart(12) + String((o.mid ? o.mid.t : 0).toFixed(1)).padStart(12) +
      ' |' + String(o.mul.b.toFixed(1)).padStart(8) + String(o.gapFl.toFixed(2)).padStart(13) +
      String(o.seat.toFixed(2)).padStart(8) + String(o.gapBar.toFixed(1)).padStart(9));
  }
  console.log('     ★ 얹힘 > 0 = 바가 받침 상면을 **파고든 깊이**. 867·879 의 자는 이 값을 한 번도 안 쟀다.');
  console.log('\n     «94px 여유» 분해 (879 §18 이 셋으로 갈랐다 — 이 자는 받침을 상·하로 한 번 더 가른다)');
  console.log('     프레임   지면선↓받침하변   받침하변↓수반   합   | 받침이 니치로 올라온 몫');
  for (const H of FRAMES) {
    const o = base[H];
    console.log('    ' + String(H).padStart(6) + String(o.bandPed.toFixed(1)).padStart(15) +
      String(o.bandGnd.toFixed(1)).padStart(16) + String(o.bandAll.toFixed(1)).padStart(7) +
      '   |' + String((o.fl - o.pedBox.t).toFixed(2)).padStart(10));
  }

  console.log('\n[2] 화소 — 바가 받침 상면을 덮는가 (바를 숨긴 차분)');
  console.log('     프레임   바 잉크 하변   상자 하변   받침 상변   ★화소 얹힘   상면 띠 가림%   지면선 아래 화소  (잡음)');
  for (const o of ink)
    console.log('    ' + String(o.frame).padStart(6) + String(o.barInkB).padStart(14) +
      String(o.boxBarB.toFixed(1)).padStart(12) + String(o.pedInkT.toFixed(1)).padStart(12) +
      String(o.seatPx).padStart(13) + String(o.bandCovered).padStart(16) + String(o.belowFl).padStart(18) +
      String(o.noiseN).padStart(9));
  console.log('     ⇒ «지면선 아래 화소» 0 = 접합선·계단·바닥은 한 픽셀도 안 덮는다(867 [3] 의 실질).');
  console.log('       그러나 **받침 상면**은 지면선 위라 그 항이 한 번도 안 본 자리다.');

  console.log('\n[3] 갈래 — 앵커를 «받침 상변 − clear» 로 옮기면 (1600 · 산수는 그려진 값에서 역산)');
  console.log('     clear   keep-s: 간극(행간 배수)      keep-gap: 배율 · 바 높이 · 긴프레임 대비%');
  for (const r of rows)
    console.log('    ' + String(r.clear).padStart(6) + '   ' +
      String(r.gapKeepS.toFixed(2)).padStart(7) + ' (×' + r.gapKeepSx.toFixed(2) + ')' +
      '            ' + r.sKeepG.toFixed(4) + ' · ' + r.barKeepG.toFixed(2) + ' · ' + r.pctKeepG.toFixed(1) + '%');
  console.log('     (clear −4 = 현행 = 받침을 4px 파고든 자리 · 행 간은 게이트 상수 ' + ROWG +
    ' — 슬롯 상자로 재면 ' + ROWG_SLOT + ' 라 자를 섞으면 안 된다)');
  console.log('     게이트: verify879 [2] 간극 ≥ 행 간 ×1.50 · [2c] 1600 바 ≥ 긴 프레임 바의 85%');
  console.log('     ⇒ 두 항을 **동시에** 만족하는 clear 는 없다 — 현행(−4)만 둘 다 초록이다.');
  console.log('\n     실측 확인(갈래를 제품에 넣어서)');
  for (const o of inj)
    console.log('     clear ' + String(o.clear).padStart(3) + ' → 격자↔바 ' + o.gapBar.toFixed(1) +
      ' · 얹힘 ' + o.seat.toFixed(2) + ' · 바 ' + o.barH.toFixed(2) + ' (' + o.pct.toFixed(1) + '%)');
})();
