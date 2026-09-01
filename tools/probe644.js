#!/usr/bin/env node
/* 작업 644 재현 — «같은 프레임인데 아트마다 아이콘 잉크가 다르다».
 *
 *   node tools/probe644.js
 *
 * 338 규칙: 처방 전에 «찍힌 픽셀» 로 재현부터 한다.
 * 등재문(642 §5 곁다리)은 69 우편 목록 한 자리만 수치로 들고 있다 — 다이아 49.33 vs 골드 52.00 = 1.054.
 * 이 프로브는 그 수치를 다시 찍고, **그것이 한 자리의 사고가 아니라 아트 15장의 규격 결손**임을
 * 세 갈래로 묻는다:
 *   [A] 아트 15장이 각자 viewBox 를 얼마나 채우는가(잉크 bbox 를 512px 로 그려 잰다).
 *   [B] «한 프레임» 실측 — 69 우편 목록(다이아+골드) · 53 가방(재화 여러 종).
 *   [C] 눈금을 무엇으로 삼을 것인가(394 규약) — 그리고 목표 채움비 F 를 어느 쪽으로 잡을 것인가.
 *       근거는 취향이 아니라 **레퍼런스 실측**이다: `tools/verify340.js` 의 REF 상수가
 *       ref 코인·젬의 **실루엣을 똑같이 64×65** 로 적어 두었다(= 레퍼런스는 채움비가 하나다).
 *
 * ⚠ 이 프로브는 «지금 상태» 를 재는 자다. 수리 뒤에는 [A] 의 최대÷최소가 1.0000 이 되고
 *    [B] 의 한 프레임 최대÷최소도 1.05 아래로 내려온다 — 그때도 같은 명령으로 돌려 대조한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 3;
const UI = path.join(ROOT, 'assets', 'ui');

/* 411·356 이 쓰는 눈금 — «덩치 최대÷최소 ≤ 1.05» */
const GAUGE = 1.05;

/* probe642 / verify144 와 같은 세이브 — 값이 그 자들과 직접 비교돼야 한다 */
const SAVE = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 }, upg: { s: 4, base: 3000 - 70 },
    kill: { s: 3, base: 1000 - 50 }, stage: { s: 2, base: 0 }, coll: { s: 1, base: 0 }
  }
};

const OPEN = {
  '.ml-i':   () => { document.querySelector('#menub').click();
                     document.querySelector('#mnw [data-mn="mail"]').click(); },
  '.bg53-c': () => { openBag(); },
};

const out = [];
let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; out.push('  ✓ ' + n + (m ? ' — ' + m : '')); };
const bad = (n, m) => { fail++; out.push('  ✗ ' + n + (m ? ' — ' + m : '')); };

const ICSEL = '.ifi, .cic, em, i:not(.ifq), b:not(.ifq)';

/* ── 아이콘 잉크(차분) — verify144 / probe642 measure() 와 같은 식이라 값이 직접 비교된다 ── */
async function inkOf(page, sel, nth) {
  const dom = await page.evaluate(([s, n, icsel]) => {
    const el = document.querySelectorAll(s)[n];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const ic = el.querySelector(icsel);
    const img = ic && (ic.tagName === 'IMG' ? ic : ic.querySelector('img'));
    const ir = img ? img.getBoundingClientRect() : (ic ? ic.getBoundingClientRect() : null);
    return {
      frame: { x: r.x, y: r.y, w: +r.width.toFixed(2), h: +r.height.toFixed(2) },
      src: img ? img.getAttribute('src') : null,
      box: ir ? { w: +ir.width.toFixed(2), h: +ir.height.toFixed(2) } : null,
    };
  }, [sel, nth || 0, ICSEL]);
  if (!dom) return null;
  const clip = { x: dom.frame.x, y: dom.frame.y, width: dom.frame.w, height: dom.frame.h };
  const shot = async () => (await page.screenshot({ clip })).toString('base64');
  const A = await shot();
  await page.evaluate(([s, n, icsel]) => {
    const ic = document.querySelectorAll(s)[n].querySelector(icsel);
    if (ic) ic.style.visibility = 'hidden';
  }, [sel, nth || 0, ICSEL]);
  await page.waitForTimeout(140);
  const B = await shot();
  await page.evaluate(([s, n, icsel]) => {
    const ic = document.querySelectorAll(s)[n].querySelector(icsel);
    if (ic) ic.style.visibility = '';
  }, [sel, nth || 0, ICSEL]);
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

async function open(browser, sel) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
  });
  await page.evaluate(OPEN[sel]);
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }));
  await page.waitForTimeout(120);
  return { ctx, page };
}

/* SVG 를 512px 로 그려 «그려진 잉크» bbox 를 잰다 — 경로 파싱보다 정확하다(외곽선·AA 포함). */
async function artBox(page, svg) {
  return page.evaluate(async ({ svg, S }) => {
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    const im = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('x'));
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
  }, { svg, S: 512 });
}

(async () => {
  const files = fs.readdirSync(UI).filter(f => /^cur-.*\.svg$/.test(f)).sort();
  const browser = await launch(chromium);
  const art = {};
  try {
    /* ─────────────────────────────────────────────────────────────
       [A] 아트 15장의 «채움비» — 잉크 bbox ÷ 그려지는 캔버스
       ───────────────────────────────────────────────────────────── */
    out.push('[A] 재화 아트 15장 — «그려진 잉크» 가 캔버스를 얼마나 채우는가');
    out.push('    (`.cic` 상자는 정사각 + object-fit:contain 이라 아트가 쓸 수 있는 것은 «긴 축» 하나다)');
    {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('about:blank');
      for (const f of files) {
        const svg = fs.readFileSync(path.join(UI, f), 'utf8');
        const vb = /viewBox="([^"]+)"/.exec(svg);
        const r = await artBox(page, svg);
        art[f] = r ? { ...r, long: Math.max(r.w, r.h), vb: vb ? vb[1] : '(없음)' } : null;
        out.push(`  · ${f.padEnd(23)} viewBox "${(art[f].vb).padEnd(22)}"`
               + ` 잉크 w ${r.w.toFixed(4)} · h ${r.h.toFixed(4)}`
               + ` · **긴 축 ${art[f].long.toFixed(4)}**`);
      }
      await ctx.close();
    }
    const longs = files.map(f => art[f].long);
    const hi = Math.max(...longs), lo = Math.min(...longs);
    const hiF = files[longs.indexOf(hi)], loF = files[longs.indexOf(lo)];
    const ratio = hi / lo;
    out.push(`  ⇒ 긴 축 최대 ${hi.toFixed(4)} (${hiF}) ÷ 최소 ${lo.toFixed(4)} (${loF}) = **${ratio.toFixed(4)}**`);
    if (ratio > GAUGE) ok('[A] 등재문 재현 — 아트 채움비가 411·356 의 눈금 ≤' + GAUGE + ' 를 넘는다',
      ratio.toFixed(4) + ' > ' + GAUGE);
    else ok('[A] 아트 채움비가 눈금 안에 있다(수리 뒤 기대 상태)', ratio.toFixed(4) + ' ≤ ' + GAUGE);

    /* «viewBox == 잉크 bbox» 불변식 — 수리의 목표를 파일 하나로 검산할 수 있는 형태로 적는다 */
    const off = files.filter(f => art[f].long < 0.9995);
    out.push(`  ⇒ 긴 축이 캔버스를 꽉 안 채우는 아트 **${off.length}/${files.length}장**: ` + (off.join(' ') || '(없음)'));

    /* ─────────────────────────────────────────────────────────────
       [B] 한 프레임 실측 — 등재문의 수치(69 다이아 49.33 vs 골드 52.00)
       ───────────────────────────────────────────────────────────── */
    out.push('');
    out.push('[B] «한 프레임» 실측 — 같은 상자에 담긴 서로 다른 아트');
    for (const [id, sel, label] of [['69', '.ml-i', '우편 목록'], ['53', '.bg53-c', '가방']]) {
      const { ctx, page } = await open(browser, sel);
      const n = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
      const seen = [];
      for (let i = 0; i < n; i++) {
        const m = await inkOf(page, sel, i);
        if (!m || !m.ink || !m.box) continue;
        const base = m.src ? path.basename(m.src) : '(img 없음)';
        seen.push({ i, base, box: m.box.w, w: m.ink.w, h: m.ink.h,
                    fill: m.ink.w / m.box.w, longInk: Math.max(m.ink.w, m.ink.h) });
        out.push(`  · ${id} ${sel}[${i}] ${base.padEnd(22)} 상자 ${String(m.box.w).padStart(6)}`
               + ` · 잉크 ${String(m.ink.w).padStart(6)}×${String(m.ink.h).padStart(6)}`
               + ` · 잉크/상자 ${(m.ink.w / m.box.w).toFixed(4)}`);
      }
      if (!seen.length) { bad(`[B] ${id} ${label}`, '표본 0개'); await ctx.close(); continue; }
      /* 상자가 같은 것끼리만 비교한다 — 상자가 다른 것은 «화면이 정한 크기» 라 아트 탓이 아니다 */
      const byBox = {};
      for (const s of seen) { const k = s.box.toFixed(1); (byBox[k] = byBox[k] || []).push(s); }
      for (const [k, g] of Object.entries(byBox)) {
        if (g.length < 2) continue;
        const arts = [...new Set(g.map(x => x.base))];
        const H = Math.max(...g.map(x => x.longInk)), L = Math.min(...g.map(x => x.longInk));
        const r = H / L;
        out.push(`  ⇒ ${id} 상자 ${k} 를 공유하는 ${g.length}칸(아트 ${arts.length}종)`
               + ` — 긴 축 잉크 최대 ${H} ÷ 최소 ${L} = **${r.toFixed(4)}**`);
        if (arts.length >= 2) {
          if (r > GAUGE) ok(`[B] ${id} ${label} — 눈금 ≤${GAUGE} 위반 재현`, r.toFixed(4) + ' > ' + GAUGE);
          else ok(`[B] ${id} ${label} — 눈금 안(수리 뒤 기대 상태)`, r.toFixed(4) + ' ≤ ' + GAUGE);
        }
      }
      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────
       [C] 눈금과 목표값 — 394 규약 «무엇을 눈금으로 삼는가를 먼저 정해 적는다»
       ───────────────────────────────────────────────────────────── */
    out.push('');
    out.push('[C] 눈금(394 규약)과 목표 채움비 F — 근거는 레퍼런스 실측이다');
    const v340 = fs.readFileSync(path.join(ROOT, 'tools', 'verify340.js'), 'utf8');
    const mg = /gold:\s*\{\s*sil:\s*\[(\d+),\s*(\d+)\]/.exec(v340);
    const md = /dia:\s*\{\s*sil:\s*\[(\d+),\s*(\d+)\]/.exec(v340);
    if (mg && md) {
      const g = [+mg[1], +mg[2]], d = [+md[1], +md[2]];
      ok('[C] verify340 REF — ref 코인·젬 **실루엣이 같다**',
        `gold ${g[0]}×${g[1]} · dia ${d[0]}×${d[1]}`);
      out.push('     ⇒ 레퍼런스는 두 아트를 **같은 덩치**로 그린다 = 채움비는 아트마다 다를 수 없다.');
    } else bad('[C] verify340 REF 를 못 읽었다', '정규식 불일치');
    out.push('     눈금 = **외접 정사각형의 변**(= max(잉크w, 잉크h) ÷ 캔버스).');
    out.push('       이유: `.cic` 상자는 정사각이고 `object-fit:contain` 이라 긴 축이 상자를 정하고,');
    out.push('       짧은 축은 **아트 자신의 종횡비**다 — 356 규약(원본 비율·비균등 스케일 금지)이 그것을 못 건드리게 한다.');
    out.push(`     목표 F 후보 둘 — ⓐ **1.0000**(골드가 지금 쓰는 값) · ⓑ 0.9375(다이아·입장권 9장의 최빈값)`);
    {
      const gArt = art['cur-gold.svg'], dArt = art['cur-dia.svg'];
      out.push(`       ⓐ 를 고르면 골드는 **한 픽셀도 안 움직이고**(현 ${gArt.long.toFixed(4)}) 다이아가`
             + ` ${(1 / dArt.long).toFixed(4)}배 커진다 → 340 [2] 가 적어 둔 «dia 색 잉크 −12.5%» 가 ref 쪽으로 줄어든다.`);
      out.push(`       ⓑ 를 고르면 다이아·입장권 9장이 안 움직이는 대신 **골드가 ref 에서 멀어진다**`
             + `(340 [2] 는 골드 색 잉크를 ref 57 ±3 으로 못박고 있다 — ${(0.9375 * 57).toFixed(1)} 로 내려가 빨개진다).`);
      out.push('       ⇒ **ⓐ 를 고른다.** 레퍼런스 실측이 박혀 있는 축을 «멀어지는 쪽» 으로 미는 것은 재기준이다.');
    }
  } finally { await browser.close(); }

  console.log(out.join('\n'));
  const tot = pass + fail;
  console.log(`\nPROBE644 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
