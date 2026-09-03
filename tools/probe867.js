#!/usr/bin/env node
/* 작업 867 — «배수 바를 벽에서 빼 수반/소환 버튼 블록으로 옮긴다» 재현기
 *
 *   node tools/probe867.js            # 프레임 5종 × 후보 띠 기하 + 그 띠에 실제로 그려진 것
 *   node tools/probe867.js --json     # 원자료
 *
 * ── 왜 이 자가 먼저인가(338 규칙) ─────────────────────────────────────────────
 * 813 5회차가 «여백 배분으로는 해가 없다» 를 산수로 닫고 이 행을 등재했다. 그런데 그 처방
 * («바를 수반 블록으로») 은 **700 이 실측으로 갈라 기각한 자리**(ⓐ 안내문 밑 · ⓑ 격자↔수반)
 * 를 다시 여는 것이라, 등재문 자신이 «그 실측을 다시 하고 700 의 판단을 명시적으로 뒤집어야
 * 한다» 고 적었다. ⇒ 처방을 따르기 전에 **지금 트리의** 값으로 네 후보를 다시 잰다.
 *
 *   [1] 등재문 산수 재현 — 1600 의 벽 146.8 · 바 98 · 여유 48.8 · 요구 66.5~73.5
 *   [2] 후보 띠의 **높이** — 셸 98 + 위아래 여백이 들어가는가 (700 의 [2]·[3] 과 같은 질문)
 *   [3] 후보 띠에 **무엇이 그려져 있는가** — 바를 얹으면 무엇을 덮는가
 *       ⚑ 700 이 ⓑ 를 기각한 근거가 이것이다(«접합선 그림자대를 통째로 덮는다»).
 *          자는 **찍힌 픽셀**로 묻는다: 바를 숨긴 캡처에서 바의 가로 구간(x 178..902)만
 *          행별로 ① 고유색 수 ② 행평균 휘도 ③ 행 안 표준편차 ④ 위 행과의 차분 을 잰다.
 *          벽·바닥 그라디언트는 σ·차분이 0 에 붙고, 그림(받침·접합선·계단·아치 다리)은 튄다.
 *   [4] 기능 축(CQ 지적) — 바가 «격자 머리글» 로 읽히는가 «소환 버튼의 컨트롤» 로 읽히는가:
 *       위 간극 : 아래 간극 비. 1 보다 크면 아래(=소환 버튼 쪽)에 붙어 읽힌다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const JSONOUT = process.argv.includes('--json');

const FRAMES = [1600, 1841, 1920, 2280, 2600];
const SHELL_H = 98;      /* 공용 셸 높이(96·437 규약) */
const BAR_L = 178, BAR_W = 724;

/* 페이지 안에서 도는 자 — 기하는 probe813 [B] 와 같은 역산(그려진 것에서 되잰다). */
const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  if (!panel) return { missing: true };
  const pr = panel.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 10) / 10;
  const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect();
    return { t: r1(r.top - pr.top), b: r1(r.bottom - pr.top), h: r1(r.height) }; };
  const els = {};
  for (const [k, s] of [['lintel', '#relw .rw-lintel'], ['mul', '#rwMulBar'], ['grid', '#rwGrid'],
                        ['mid', '#relw .rw-mid'], ['cap', '#relw .rw-cap'],
                        ['floor', '#relw .rw-floor'], ['ground', '#relw .rw-ground'],
                        ['steps', '#relw .rw-steps'], ['cost', '#rwCost']])
    els[k] = box(s);
  return {
    els,
    panelH: r1(pr.height),
    panelX: r1(pr.left),
    panelY: r1(pr.top),
    panelW: r1(pr.width),
  };
};

/* 캡처 한 장을 행별 지표로 접는다 — scan120 과 같은 «캔버스에 그려서 읽는» 방식. */
const SCANROWS = async ({ url, x0, x1 }) => {
  const img = new Image();
  await new Promise((r) => { img.onload = r; img.src = url; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const rows = [];
  for (let y = 0; y < c.height; y++) {
    const seen = new Set();
    let s = 0, s2 = 0, n = 0;
    for (let x = x0; x < x1 && x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      seen.add((r << 16) | (gg << 8) | b);
      const l = .2126 * r + .7152 * gg + .0722 * b;
      s += l; s2 += l * l; n++;
    }
    const m = s / n;
    rows.push({ uc: seen.size, m: Math.round(m * 100) / 100,
      sd: Math.round(Math.sqrt(Math.max(0, s2 / n - m * m)) * 100) / 100 });
  }
  for (let y = 1; y < rows.length; y++) rows[y].d = Math.round(Math.abs(rows[y].m - rows[y - 1].m) * 100) / 100;
  if (rows.length) rows[0].d = 0;
  return rows;
};

/* 띠 하나를 접는다 — «그림이 있는가» 판정은 세 축을 같이 본다(하나만 보면 속는다):
     · uc  고유색 수   — 통짜/그라디언트면 행당 1~3
     · sd  행 안 편차  — 좌우로 무늬가 있으면 커진다(아치 다리·계단 모서리)
     · d   행 간 차분  — 수평 절단선(접합선·받침 상변)이면 튄다 */
/* ⚑ «띠 전체가 비었는가» 는 틀린 질문이다 — 띠의 두 끝은 언제나 이웃 그림의 모서리다
   (격자 하변·받침 상변·수반 상변). 700 이 실제로 물은 것은 **«그 안에 셸이 들어갈 빈 창이
   있는가»**(«가장 넓은 창이 82px»)이고, 이 자도 그것을 묻는다: 띠 안에서 연속으로
   «평평한»(sd ≤ SDF · d ≤ DF) 행이 가장 길게 이어지는 구간의 길이와 위치를 낸다. */
const SDF = 3, DF = 2;
const band = (rows, a, b) => {
  const A = Math.max(0, Math.ceil(a)), B = Math.min(rows.length, Math.floor(b));
  if (B - A < 2) return { h: Math.round((b - a) * 10) / 10, n: 0, uc: null, sd: null, d: null, win: 0 };
  let uc = 0, sdmax = 0, dmax = 0;
  let run = 0, best = 0, bestEnd = A;
  for (let y = A; y < B; y++) {
    uc = Math.max(uc, rows[y].uc);
    sdmax = Math.max(sdmax, rows[y].sd);
    dmax = Math.max(dmax, rows[y].d || 0);
    if (rows[y].sd <= SDF && (rows[y].d || 0) <= DF) { run++; if (run > best) { best = run; bestEnd = y + 1; } }
    else run = 0;
  }
  return { h: Math.round((b - a) * 10) / 10, n: B - A, uc, sd: sdmax, d: dmax,
           win: best, winT: bestEnd - best, winB: bestEnd };
};

(async () => {
  const browser = await launch(chromium);
  const out = {};
  for (const fh of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.evaluate(() => { try { openRelw(); } catch (e) { return String(e); } });
    await page.waitForTimeout(260);
    const m = await page.evaluate(MEASURE);
    /* 바를 숨기고 찍는다 — «바가 없을 때 그 자리에 무엇이 있는가» 가 이 자의 질문이다. */
    await page.evaluate(() => { const b = document.getElementById('rwMulBar'); if (b) b.style.visibility = 'hidden'; });
    await page.waitForTimeout(120);
    const png = await page.screenshot({ clip: { x: m.panelX, y: m.panelY, width: m.panelW, height: m.panelH } });
    const scanPage = await ctx.newPage();
    await scanPage.goto('about:blank');
    const rows = await scanPage.evaluate(SCANROWS, {
      url: 'data:image/png;base64,' + png.toString('base64'),
      x0: Math.round(BAR_L), x1: Math.round(BAR_L + BAR_W),
    });
    out[fh] = { ...m, rows };
    await ctx.close();
  }
  await browser.close();

  const V = (fh) => {
    const e = out[fh].els;
    const gridB = e.grid.t + e.grid.h;
    return {
      lintelB: e.lintel.b, gt: e.grid.t, gridB,
      pedT: e.floor.t,                       /* 받침 상변 = 아치 다리 끝 */
      groundT: e.ground ? e.ground.t : null,  /* 지면(접합선) 띠 상변 */
      stepsT: e.steps ? e.steps.t : null,
      bt: e.mid.t, midB: e.mid.b, capT: e.cap.t,
      wall: Math.round((e.grid.t - e.lintel.b) * 10) / 10,
      av: Math.round((e.floor.t - gridB) * 10) / 10,
      E: Math.round((e.mid.t - gridB) * 10) / 10,
    };
  };

  /* --rows <프레임> — 행 프로파일 원자료(그 띠에 있는 것이 «무엇» 인지 눈으로 가를 때) */
  const ri = process.argv.indexOf('--rows');
  if (ri > 0) {
    const fh = Number(process.argv[ri + 1]) || 2280;
    const v = V(fh);
    console.log(`# ${fh} — gridB ${v.gridB} · pedT ${v.pedT} · groundT ${v.groundT} · stepsT ${v.stepsT} · bt ${v.bt}`);
    out[fh].rows.forEach((r, y) => {
      if (y >= v.gridB - 10 && y <= v.bt + 10) console.log(`${y}\t${r.m}\t${r.sd}\t${r.d}`);
    });
    return;
  }
  if (JSONOUT) { console.log(JSON.stringify({ frames: FRAMES, out: FRAMES.reduce((a, f) => (a[f] = { ...V(f), els: out[f].els }, a), {}) }, null, 2)); return; }

  console.log('PROBE867 — 배수 바 자리 재실측 (프레임 1600 · 1841 · 1920 · 2280 · 2600)\n');

  console.log('[1] 등재문 산수 재현 — 1600 의 벽에는 요구가 안 들어간다');
  const need = { lo: 21.5 + 45, hi: 21.5 + 52 };
  for (const fh of FRAMES) {
    const v = V(fh);
    const slack = Math.round((v.wall - SHELL_H) * 10) / 10;
    console.log(`     ${fh}: 벽 ${v.wall} − 셸 98 = 여유 ${slack}` +
      (fh === 1600 ? `   요구 ${need.lo}~${need.hi} ⇒ ${Math.round((need.lo - slack) * 10) / 10}~${Math.round((need.hi - slack) * 10) / 10}px 모자람` : ''));
  }

  console.log('\n[2] 후보 띠의 높이 — 셸 98 + 위아래 여백 12 씩(최소 122)이 들어가는가');
  const CANDS = [
    ['ⓒ 상인방↓격자 (현행)', (v) => [v.lintelB, v.gt]],
    ['ⓓ 격자↓받침 (아치 안쪽)', (v) => [v.gridB, v.pedT]],
    ['ⓑ 받침↓수반 (바닥·계단)', (v) => [v.pedT, v.bt]],
    ['ⓐ 수반↓안내문', (v) => [v.midB, v.capT]],
  ];
  console.log(`     ${'후보'.padEnd(24)}${FRAMES.map((f) => String(f).padStart(9)).join('')}`);
  for (const [name, f] of CANDS) {
    const hs = FRAMES.map((fh) => { const [a, b] = f(V(fh)); return Math.round((b - a) * 10) / 10; });
    console.log(`     ${name.padEnd(22)}${hs.map((h) => String(h).padStart(9)).join('')}   ${hs.every((h) => h >= 122) ? '전부 들어간다' : '1600 이 막는다'}`);
  }

  /* ⚑ 판정은 «절대 문턱» 이 아니라 **현행 자리와의 대조**다 — 700 이 이미 «여기는 덮어도 된다»
     고 판정한 자리(ⓒ)가 있으니, 후보가 그보다 덜 덮으면 700 의 근거로도 통과다.
     그래서 «띠» 가 아니라 **셸이 실제로 앉을 98px 상자**를 잰다(띠의 두 끝 모서리는
     이웃 그림의 것이라 띠 전체를 재면 후보가 전부 «그림 있음» 으로 읽힌다 — 1회차 함정). */
  console.log('\n[3] 셸이 앉을 98px 상자가 덮는 것 — 바 가로 구간(x 178..902) · 바를 숨기고 찍었다');
  console.log('     sd = 행 안 편차 평균 · dμ = 행 간 차분 평균 · dmax = 최대(수평 절단선이면 튄다)');
  const RECTS = [
    ['ⓒ 현행(상인방↓격자)', (v, e) => [e.mul.t, e.mul.b]],
    ['ⓓ 받침 위 20 (아치 안쪽)', (v) => [v.pedT - 20 - SHELL_H, v.pedT - 20]],
    ['ⓑ 수반 위 20', (v) => [v.bt - 20 - SHELL_H, v.bt - 20]],
  ];
  for (const fh of FRAMES) {
    console.log(`  ${fh}`);
    const v = V(fh), e = out[fh].els, rows = out[fh].rows;
    for (const [name, f] of RECTS) {
      const [a, b] = f(v, e);
      const A = Math.max(0, Math.ceil(a)), B = Math.min(rows.length, Math.floor(b));
      let sd = 0, dm = 0, dx = 0, dxy = A, n = 0;
      for (let y = A; y < B; y++) { sd += rows[y].sd; dm += rows[y].d || 0;
        if ((rows[y].d || 0) > dx) { dx = rows[y].d; dxy = y; } n++; }
      const r2 = (x) => Math.round(x * 100) / 100;
      console.log(`     ${name.padEnd(24)} y ${String(Math.round(a)).padStart(5)}..${String(Math.round(b)).padStart(5)}` +
        `  sd ${String(r2(sd / n)).padStart(6)}  dμ ${String(r2(dm / n)).padStart(6)}  dmax ${String(r2(dx)).padStart(6)} @y${dxy}`);
    }
  }

  console.log('\n[3-b] 띠 안의 «빈 창»(sd ≤ 3 · d ≤ 2 인 연속 행) — 700 이 «가장 넓은 창 82px» 이라 쓴 그 자');
  for (const fh of FRAMES) {
    console.log(`  ${fh}`);
    for (const [name, f] of CANDS) {
      const v = V(fh); const [a, b] = f(v);
      const r = band(out[fh].rows, a, b);
      console.log(`     ${name.padEnd(22)} h ${String(r.h).padStart(6)}  sd ${String(r.sd).padStart(6)}  d ${String(r.d).padStart(6)}` +
        `   빈 창 ${String(r.win).padStart(5)}px (y ${r.winT}..${r.winB})`);
    }
  }

  /* [4] 기능 축(CQ) — «위 간극 ÷ 아래 간극». 바의 **이웃이 무엇인가** 는 자리에 따라 다르므로
     둘 다 «바의 실제 위 이웃 ↓ 바» 와 «바 ↓ 실제 아래 이웃» 으로 잰다:
       벽에 있을 때  위 = 상인방 하변 · 아래 = 격자 상변
       받침 위일 때  위 = 격자 하변   · 아래 = 받침 상변
     비가 1 보다 크면 아래쪽(=수반·소환 버튼 블록)에 붙어 읽힌다. */
  console.log('\n[4] 기능 축 — 바가 어느 쪽에 붙어 읽히는가 (위 간극 ÷ 아래 간극 · >1 이면 아래쪽 소속)');
  for (const fh of FRAMES) {
    const e = out[fh].els; const v = V(fh);
    const inWall = e.mul.b <= v.gt + 0.5;
    const up = Math.round((e.mul.t - (inWall ? v.lintelB : v.gridB)) * 10) / 10;
    const dn = Math.round(((inWall ? v.gt : v.pedT) - e.mul.b) * 10) / 10;
    console.log(`     ${fh}: [${inWall ? '벽' : '받침 위'}] 위 ${up} / 아래 ${dn} = ${Math.round((up / dn) * 100) / 100}` +
      (up / dn < 1.2 ? '   (위 이웃의 한 줄로 읽힌다 — CP·CQ 지적)' : '') +
      `   · 격자 행 간 대비 위 간극 ${Math.round((up / 25.6) * 100) / 100}배`);
  }
})();
