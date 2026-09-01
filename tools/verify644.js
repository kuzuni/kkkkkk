#!/usr/bin/env node
/* 작업 644 게이트 — 재화 아트 15장의 «덩치» 를 한 눈금으로 묶는다.
 *
 *   node tools/verify644.js
 *
 * 무엇을 지키나 (394 규약 — «무엇을 눈금으로 삼는가» 를 먼저 적는다):
 *   눈금 = **외접 정사각형의 변** = max(잉크w, 잉크h) ÷ 그려지는 캔버스.
 *   `.cic` 상자는 정사각이고 `object-fit:contain` 이므로 상자를 정하는 것은 **긴 축 하나**다.
 *   짧은 축은 아트 자신의 종횡비이고, 356 규약(원본 비율 · 비균등 스케일 금지)이 그것을 못 건드리게 한다.
 *
 * 목표 F = **1.0000** — 「viewBox == 그려진 잉크 bbox」. 근거는 취향이 아니라 레퍼런스 실측이다:
 *   `tools/verify340.js` 의 REF 가 ref 코인·젬의 **실루엣을 똑같이 64×65** 로 적어 두었다
 *   (= 레퍼런스는 두 아트를 같은 덩치로 그린다). 골드가 이미 1.0000 이므로 F=1.0 은 골드를
 *   한 픽셀도 안 움직이고, 340 [2] 가 «−12.5%» 로 적어 둔 다이아를 ref 쪽으로 당긴다.
 *   반대 후보(F=0.9375, 다이아·입장권 9장의 최빈값)는 **골드를 ref 에서 멀어지게** 하므로 기각됐다.
 *
 * ⚑ 이 자는 «지금 픽셀» 을 다시 적는 재기준이 아니다. 세 축이 서로를 받친다:
 *   [A] 채움비 = 1.0000  (덜 채우면 빨강)
 *   [B] 15장 최대÷최소 ≤ 1.05  (한 장만 어긋나도 빨강)
 *   [C] **원 좌표계 대조** — viewBox 를 `0 0 64 64` 로 되돌려 그리면 **642 §5 의 옛 채움비 표가
 *       그대로 나온다** = 자른 것은 캔버스뿐이고 **아트 내용은 한 획도 안 바뀌었다**(등방 · 356 규약).
 *   [D] 제품 실측 — 한 상자를 공유하는 한 프레임에서 아트가 갈려도 덩치가 같다(69 우편 목록).
 *   §R 되돌림 시험 — 되돌리면 빨개지는지 세 방향으로 확인한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const UI = path.join(ROOT, 'assets', 'ui');
const URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 3;

const GAUGE = 1.05;      /* 411·356 눈금 — 덩치 최대÷최소 */
const FILL_TOL = 0.006;  /* 512px 래스터의 AA 한 겹 = 1/512 ≈ .002. 세 겹까지 봐준다. */
const ASP_TOL = 0.01;    /* 종횡비 대조 허용 — 등방이면 0 이어야 한다 */

/* 642 §5 가 남긴 «수리 전» 채움비 표 (원 좌표계 0 0 64 64 에서 512px 로 잰 값).
   [C] 는 이 표를 **되돌린 좌표계**에서 다시 요구한다 — 아트 내용이 안 바뀌었다는 산술 증거다.
   ⚑ 671(2026-09-01) — **`cur-dia.svg` 한 칸만 갱신했다**(0.9375 → 1.0000). 이 표의 뜻은
     «644 가 캔버스만 잘랐다» 인데, 671 은 그 뒤에 **젬의 테 규격을 실제로 다시 그린 회차**다
     (몸통 path 는 Δ0 · 검정 테를 straddle stroke → 뒤에 까는 실루엣으로 바꿨다 ⇒ 잉크가 0..64 를 채운다).
     ⚠ 그래서 이 한 칸은 «644 이후 아무도 안 건드렸다» 를 더는 못 지킨다 — 지키는 자는
       `verify671`([A] 색÷실루엣 .875 등방 · §R 옛 테 규격 되돌림)로 **옮겼다**. 나머지 14칸은 그대로다. */
const ORIG = {
  'cur-gold.svg':          [1.0000, 1.0000],
  'cur-dia.svg':           [1.0000, 1.0000],   /* 671 재작도 — 옛 값 0.9375×0.9375 */
  'cur-relic.svg':         [0.8438, 0.9727],
  'cur-rstone.svg':        [0.6250, 1.0000],
  'cur-stone.svg':         [0.7520, 0.8164],
  'cur-tstone.svg':        [0.7500, 0.7500],
  'cur-mile.svg':          [0.9063, 0.6563],
  'cur-ticket-gold.svg':   [0.9375, 0.5313],
  'cur-ticket-dia.svg':    [0.9375, 0.5313],
  'cur-ticket-relic1.svg': [0.9375, 0.5313],
  'cur-ticket-relic2.svg': [0.9375, 0.5313],
  'cur-ticket-relic3.svg': [0.9375, 0.5313],
  'cur-ticket-relic4.svg': [0.9375, 0.5313],
  'cur-ticket-rstone.svg': [0.9375, 0.5313],
  'cur-ticket-stone.svg':  [0.9375, 0.5313],
};

const out = [];
let pass = 0, fail = 0;
const ok  = (n, c, m) => { if (c) { pass++; out.push('  ✓ ' + n + (m ? ' — ' + m : '')); }
                           else   { fail++; out.push('  ✗ ' + n + (m ? ' — ' + m : '')); } };
const near = (n, got, want, tol) =>
  ok(n, Math.abs(got - want) <= tol, `${(+got).toFixed(4)} (기대 ${want} ±${tol})`);

/* SVG 문자열을 정사각 캔버스 S 에 그려 잉크 bbox 를 잰다.
   `.cic` 이 하는 것과 같다 — width/height 가 64/64 라 캔버스는 정사각이고
   viewBox 는 기본 preserveAspectRatio(xMidYMid meet)로 그 안에 맞춰 들어간다. */
async function inkBox(page, svg, S) {
  return page.evaluate(async ({ svg, S }) => {
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    const im = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode'));
      i.width = S; i.height = S; i.src = url;
    });
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'); g.clearRect(0, 0, S, S); g.drawImage(im, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data;
    let ax = 1e9, ay = 1e9, bx = -1, by = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (d[((y * S) + x) * 4 + 3] > 8) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
    }
    if (bx < 0) return null;
    return { x0: ax / S, y0: ay / S, w: (bx - ax + 1) / S, h: (by - ay + 1) / S };
  }, { svg, S });
}

const setVB = (svg, vb) => svg.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`);

/* ── 제품 실측용(69 우편 목록) — probe644 / verify144 와 같은 차분법 ── */
const SAVE = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 }, upg: { s: 4, base: 3000 - 70 },
    kill: { s: 3, base: 1000 - 50 }, stage: { s: 2, base: 0 }, coll: { s: 1, base: 0 }
  }
};
const ICSEL = '.ifi, .cic, em, i:not(.ifq), b:not(.ifq)';

async function inkOnScreen(page, sel, nth) {
  const dom = await page.evaluate(([s, n, icsel]) => {
    const el = document.querySelectorAll(s)[n];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const ic = el.querySelector(icsel);
    const img = ic && (ic.tagName === 'IMG' ? ic : ic.querySelector('img'));
    const ir = img ? img.getBoundingClientRect() : null;
    return { frame: { x: r.x, y: r.y, w: +r.width.toFixed(2), h: +r.height.toFixed(2) },
             src: img ? img.getAttribute('src') : null,
             box: ir ? +ir.width.toFixed(2) : null };
  }, [sel, nth, ICSEL]);
  if (!dom || !dom.src) return null;
  const clip = { x: dom.frame.x, y: dom.frame.y, width: dom.frame.w, height: dom.frame.h };
  const shot = async () => (await page.screenshot({ clip })).toString('base64');
  const A = await shot();
  await page.evaluate(([s, n, icsel]) => {
    const ic = document.querySelectorAll(s)[n].querySelector(icsel); if (ic) ic.style.visibility = 'hidden';
  }, [sel, nth, ICSEL]);
  await page.waitForTimeout(140);
  const B = await shot();
  await page.evaluate(([s, n, icsel]) => {
    const ic = document.querySelectorAll(s)[n].querySelector(icsel); if (ic) ic.style.visibility = '';
  }, [sel, nth, ICSEL]);
  const ink = await page.evaluate(async ({ a, b, dsf }) => {
    const load = async (x) => {
      const im = await new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode'));
        i.src = 'data:image/png;base64,' + x;
      });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height };
    };
    const A = await load(a), B = await load(b);
    let ax = 1e9, ay = 1e9, bx = -1, by = -1, n = 0;
    for (let yy = 0; yy < A.H; yy++) for (let xx = 0; xx < A.W; xx++) {
      const i = ((yy * A.W) + xx) * 4;
      const df = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]),
                          Math.abs(A.d[i + 2] - B.d[i + 2]));
      if (df > 16) { n++; if (xx < ax) ax = xx; if (xx > bx) bx = xx; if (yy < ay) ay = yy; if (yy > by) by = yy; }
    }
    if (!n) return null;
    return { w: +((bx - ax + 1) / dsf).toFixed(2), h: +((by - ay + 1) / dsf).toFixed(2) };
  }, { a: A, b: B, dsf: DSF });
  return { ...dom, ink };
}

(async () => {
  const files = fs.readdirSync(UI).filter(f => /^cur-.*\.svg$/.test(f)).sort();
  const src = {};
  for (const f of files) src[f] = fs.readFileSync(path.join(UI, f), 'utf8');

  const browser = await launch(chromium);
  try {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('about:blank');

    /* ── [A] 채움비 = 1.0000 — 「viewBox == 그려진 잉크 bbox」 ── */
    out.push('[A] 아트 15장 — 긴 축이 캔버스를 꽉 채운다(F = 1.0000)');
    ok('[A0] 재화 아트가 15장이다 (한 장이라도 새로 들어오면 여기가 먼저 걸린다)',
      files.length === 15, files.length + '장');
    const cur = {};
    for (const f of files) {
      const r = await inkBox(page, src[f], 512);
      if (!r) { ok('[A] ' + f, false, '잉크 0px — 그려지지 않는다'); continue; }
      cur[f] = r;
      near('[A] ' + f.padEnd(23) + ' 긴 축 채움비', Math.max(r.w, r.h), 1.0, FILL_TOL);
    }

    /* ── [B] 눈금 — 15장 최대÷최소 ≤ 1.05 (411·356) ── */
    out.push('');
    out.push('[B] 눈금 — 15장의 «외접 정사각형 변» 최대÷최소 ≤ ' + GAUGE);
    {
      const L = files.filter(f => cur[f]).map(f => ({ f, v: Math.max(cur[f].w, cur[f].h) }));
      const hi = L.reduce((a, b) => (b.v > a.v ? b : a));
      const lo = L.reduce((a, b) => (b.v < a.v ? b : a));
      const r = hi.v / lo.v;
      ok('[B1] 덩치 최대÷최소 ≤ ' + GAUGE, r <= GAUGE,
        `${r.toFixed(4)} — 최대 ${hi.f} ${hi.v.toFixed(4)} · 최소 ${lo.f} ${lo.v.toFixed(4)}`);
      /* 음성항 — «1.05 를 넘는 표본을 이 자가 실제로 잡는가» 를 사본으로 확인한다(§R1 에서) */
    }

    /* ── [C] 원 좌표계 대조 — 아트 «내용» 은 한 획도 안 바뀌었다 ── */
    out.push('');
    out.push('[C] 원 좌표계(`0 0 64 64`)로 되돌려 그리면 642 §5 의 옛 표가 그대로 나온다');
    out.push('    ⇒ 자른 것은 **캔버스뿐**이고 잉크의 모양·종횡비는 그대로다(등방 · 356 규약).');
    for (const f of files) {
      const want = ORIG[f];
      if (!want) { ok('[C] ' + f, false, '642 §5 표에 없는 파일이다 — 표를 먼저 갱신할 것'); continue; }
      const r = await inkBox(page, setVB(src[f], '0 0 64 64'), 512);
      if (!r) { ok('[C] ' + f, false, '되돌린 사본이 안 그려진다'); continue; }
      const okW = Math.abs(r.w - want[0]) <= FILL_TOL, okH = Math.abs(r.h - want[1]) <= FILL_TOL;
      ok('[C] ' + f.padEnd(23) + ' 옛 채움비 w·h 그대로', okW && okH,
        `${r.w.toFixed(4)}×${r.h.toFixed(4)} (기대 ${want[0]}×${want[1]})`);
    }

    /* ── [C2] 종횡비 대조 — 자르기가 «등방» 인가 (비균등이면 여기가 빨갛다) ── */
    out.push('');
    out.push('[C2] 종횡비 대조 — 자른 뒤 잉크 종횡비가 원 좌표계와 같다(비균등 자르기 금지 · 356)');
    for (const f of files) {
      const a = cur[f];
      const b = await inkBox(page, setVB(src[f], '0 0 64 64'), 512);
      if (!a || !b) continue;
      const ra = a.w / a.h, rb = b.w / b.h;
      near('[C2] ' + f.padEnd(23) + ' 종횡비', ra, +rb.toFixed(4), ASP_TOL);
    }

    /* ── §R 되돌림 시험 ── */
    out.push('');
    out.push('§R 되돌림 시험 — 무르게 푼 수리가 아님을 세 방향에서 못박는다');
    {
      /* R1 — 한 장의 viewBox 를 옛 값으로 되돌린 사본: [A]·[B] 가 빨개져야 한다.
         ⚑ 671 이관 — 표본을 **다이아 → 단련석**으로 옮겼다. 671 이 젬의 테를 다시 그려
         젬은 옛 좌표계에서도 채움비가 1.0 이라(실루엣이 0..64 를 채운다) 더는 «되돌림» 표본이 못 된다.
         `cur-stone.svg`(옛 채움비 .8164)는 644 가 캔버스만 자른 14장 중 하나라 같은 시험을 그대로 한다. */
      const R1F = 'cur-stone.svg';
      const r1 = await inkBox(page, setVB(src[R1F], '0 0 64 64'), 512);
      ok('[R1] ' + R1F + ' 를 옛 viewBox 로 되돌리면 채움비가 1.0 에서 벗어난다 ([A] 가 잡는다)',
        r1 && Math.abs(Math.max(r1.w, r1.h) - 1.0) > FILL_TOL, r1 ? Math.max(r1.w, r1.h).toFixed(4) : '—');
      const others = files.filter(f => f !== R1F && cur[f]).map(f => Math.max(cur[f].w, cur[f].h));
      const rr = Math.max(...others) / Math.max(r1.w, r1.h);
      ok('[R1b] 그 한 장만으로 [B] 눈금이 깨진다 (한 장도 봐주지 않는다)', rr > GAUGE, rr.toFixed(4) + ' > ' + GAUGE);

      /* R2 — 비균등 자르기 사본: 폭만 더 좁게 자르면 [C2] 종횡비가 빨개져야 한다 */
      const d = cur['cur-dia.svg'];
      const bad2 = setVB(src['cur-dia.svg'], '2 2 54 60');   /* 가로만 6 좁게 = 비균등 */
      const r2 = await inkBox(page, bad2, 512);
      const base = await inkBox(page, setVB(src['cur-dia.svg'], '0 0 64 64'), 512);
      ok('[R2] 가로만 좁게 자른 사본은 [C2] 종횡비가 빨개진다 (비균등 자르기 금지)',
        r2 && Math.abs((r2.w / r2.h) - (base.w / base.h)) > ASP_TOL,
        r2 ? (r2.w / r2.h).toFixed(4) + ' vs ' + (base.w / base.h).toFixed(4) : '—');

      /* R3 — 원복: 현재 파일은 초록 */
      ok('[R3] 원복(현재 파일)하면 다시 초록', d && Math.abs(Math.max(d.w, d.h) - 1.0) <= FILL_TOL,
        d ? Math.max(d.w, d.h).toFixed(4) : '—');
    }
    await ctx.close();

    /* ── [D] 제품 실측 — 69 우편 목록: 한 상자에 담긴 두 아트의 덩치가 같다 ── */
    out.push('');
    out.push('[D] 제품 실측 — 69 우편 목록(같은 상자 · 아트는 다이아·골드 둘)');
    {
      const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
      await c2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
        [KEY, JSON.stringify(SAVE)]);
      const p = await c2.newPage();
      await p.goto(URL);
      await p.waitForTimeout(900);
      await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
      await p.evaluate(() => { document.querySelector('#menub').click();
                               document.querySelector('#mnw [data-mn="mail"]').click(); });
      await p.waitForTimeout(1400);
      await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }));
      const n = await p.evaluate(() => document.querySelectorAll('.ml-i').length);
      const seen = [];
      for (let i = 0; i < n; i++) {
        const m = await inkOnScreen(p, '.ml-i', i);
        if (!m || !m.ink || !m.box) continue;
        seen.push({ base: path.basename(m.src), box: m.box, long: Math.max(m.ink.w, m.ink.h) });
        out.push(`     행${i} ${path.basename(m.src).padEnd(16)} 상자 ${m.box} · 잉크 ${m.ink.w}×${m.ink.h}`);
      }
      ok('[D0] 우편 행의 썸네일이 둘 이상의 아트다 (한 아트뿐이면 이 절은 아무것도 안 묻는다)',
        new Set(seen.map(s => s.base)).size >= 2, [...new Set(seen.map(s => s.base))].join(' '));
      const box0 = seen.length ? seen[0].box : 0;
      const same = seen.filter(s => Math.abs(s.box - box0) < 0.5);
      ok('[D1] 그 칸들이 **같은 상자**를 쓴다 (상자가 다르면 아트 탓이 아니다)',
        same.length === seen.length, `${same.length}/${seen.length} · 상자 ${box0}`);
      if (same.length >= 2) {
        const H = Math.max(...same.map(s => s.long)), L = Math.min(...same.map(s => s.long));
        ok('[D2] 같은 상자 안에서 덩치 최대÷최소 ≤ ' + GAUGE + ' (등재문의 1.054 가 닫혔다)',
          (H / L) <= GAUGE, `${(H / L).toFixed(4)} — 최대 ${H} · 최소 ${L}`);
      }
      await c2.close();
    }
  } finally { await browser.close(); }

  console.log(out.join('\n'));
  const tot = pass + fail;
  console.log(`\nVERIFY644 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
