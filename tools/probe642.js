#!/usr/bin/env node
/* 작업 642 재현 — `verify144` [형제] 69 `.ml-i` 잉크 49.33×49 (기준선 52) 의 갈래 가르기.
 *
 *   node tools/probe642.js
 *
 * 338 규칙: 처방 전에 «찍힌 픽셀» 로 재현부터 한다. 등재문이 갈래를 둘로 열어 뒀다 —
 *   ⓐ 제품 결함(69 가 144 의 `--if-ic` 보정을 못 받았다) · ⓑ 게이트 부패(52 는 이모지 시절 값).
 * 그런데 둘 다 **표본이 고정이라는 전제** 위에 있다. 이 프로브는 그 전제부터 묻는다:
 *   ① 69·53·70 의 아이콘이 지금 무엇인가(이모지 / 어느 SVG) — 등재문이 «첫 실마리» 로 지목한 것.
 *   ② 각 SVG 가 viewBox 를 얼마나 채우는가(잉크 = 상자 × 채움비 이므로 아트마다 상한이 다르다).
 *   ③ 69 우편함의 **행마다** 썸네일이 무엇인지 — 게이트는 `.ml-i` 첫 노드 하나만 잰다.
 *      첫 행의 보상이 바뀌면 «제품도 자도 안 건드렸는데» 잉크가 바뀐다.
 *
 * 잉크 측정은 verify144 와 같은 차분법(아이콘만 껐다 켠 두 장)이라 값이 직접 비교된다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 3;

/* verify144 와 같은 세이브 — 값이 그 게이트와 직접 비교돼야 한다 */
const SAVE = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 }, upg: { s: 4, base: 3000 - 70 },
    kill: { s: 3, base: 1000 - 50 }, stage: { s: 2, base: 0 }, coll: { s: 1, base: 0 }
  }
};

const OPEN = {
  '.bg53-c': () => { openBag(); },
  '.ml-i':   () => { document.querySelector('#menub').click();
                     document.querySelector('#mnw [data-mn="mail"]').click(); },
  '.at-if':  () => document.querySelector('.side .ibtn[data-pop="attend"]').click(),
  '.qs-i':   () => document.querySelector('.side .ibtn[data-pop="quest"]').click(),
};

const out = [];
let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; out.push('  ✓ ' + n + (m ? ' — ' + m : '')); };
const bad = (n, m) => { fail++; out.push('  ✗ ' + n + (m ? ' — ' + m : '')); };

/* ── 아이콘 잉크(차분) — verify144 measure() 와 같은 식 ── */
const ICSEL = '.ifi, .cic, em, i:not(.ifq), b:not(.ifq)';

async function inkOf(page, sel, nth) {
  const dom = await page.evaluate(([s, n, icsel]) => {
    const el = document.querySelectorAll(s)[n];
    if (!el) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const ic = el.querySelector(icsel);
    const img = ic && (ic.tagName === 'IMG' ? ic : ic.querySelector('img'));
    const ir = ic && ic.getBoundingClientRect();
    return {
      frame: { x: r.x, y: r.y, w: +r.width.toFixed(2), h: +r.height.toFixed(2) },
      ifIc: cs.getPropertyValue('--if-ic').trim() || '(없음)',
      ifW: cs.getPropertyValue('--if-w').trim() || '(없음)',
      tag: ic ? ic.tagName : null,
      cls: ic ? String(ic.className || '') : null,
      src: img ? img.getAttribute('src') : null,
      text: ic ? (ic.textContent || '').trim() : null,
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

(async () => {
  /* ── ② 아트마다 viewBox 를 얼마나 채우는가 (브라우저 없이 파일에서) ── */
  out.push('[A] 재화 SVG 채움비 — 잉크 = .cic 상자 × 채움비 이므로 아트가 상한을 정한다');
  const files = fs.readdirSync(path.join(ROOT, 'assets', 'ui')).filter(f => /^cur-.*\.svg$/.test(f));
  const artRatio = {};
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, 'assets', 'ui', f), 'utf8');
    const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(s);
    artRatio[f] = vb ? +vb[1] : null;
  }
  ok('cur-*.svg ' + files.length + '장', files.join(' '));

  const browser = await launch(chromium);
  try {
    /* SVG 실제 실루엣 bbox 는 브라우저에 그려서 잰다(경로 파싱보다 정확하다) */
    {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('about:blank');
      for (const f of files) {
        const svg = fs.readFileSync(path.join(ROOT, 'assets', 'ui', f), 'utf8');
        const r = await page.evaluate(async ({ svg, S }) => {
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
          return { w: (bx - ax + 1) / S, h: (by - ay + 1) / S };
        }, { svg, S: 512 });
        artRatio[f] = r;
        out.push(`  · ${f.padEnd(22)} 채움비 w ${r ? r.w.toFixed(4) : '—'} · h ${r ? r.h.toFixed(4) : '—'}`);
      }
      await ctx.close();
    }

    /* ── ①③ 형제 셋 + 22 본체 ── */
    out.push('[B] 형제 화면 아이콘의 «정체» 와 잉크 (verify144 와 같은 차분법)');
    for (const [id, sel] of [['22', '.qs-i'], ['53', '.bg53-c'], ['69', '.ml-i'], ['70', '.at-if']]) {
      const { ctx, page } = await open(browser, sel);
      const m = await inkOf(page, sel, 0);
      if (!m) { bad(`${id} ${sel}`, '요소 없음'); await ctx.close(); continue; }
      const art = m.src ? artRatio[path.basename(m.src)] : null;
      const kind = m.tag === 'IMG' ? 'SVG(' + path.basename(m.src || '?') + ')'
                 : (m.text ? '이모지/문자 "' + m.text + '"' : m.tag);
      ok(`${id} ${sel} 정체`, kind);
      out.push(`     --if-w ${m.ifW} · --if-ic ${m.ifIc} · 프레임 ${m.frame.w}×${m.frame.h}`
             + ` · .cic 상자 ${m.box ? m.box.w + '×' + m.box.h : '—'}`
             + ` · 잉크 ${m.ink ? m.ink.w + '×' + m.ink.h : '—'}`
             + (m.ink && m.box ? ` · 잉크/상자 ${(m.ink.w / m.box.w).toFixed(4)}` : '')
             + (art ? ` · 아트 채움비 ${art.w.toFixed(4)}` : ''));
      await ctx.close();
    }

    /* ── ③ 69 는 «첫 행» 하나만 잰다 — 행마다 썸네일이 다르면 표본이 흔들린다 ── */
    out.push('[C] 69 우편함 — 게이트가 재는 것은 `.ml-i` **첫 노드** 하나다');
    {
      const { ctx, page } = await open(browser, '.ml-i');
      const rows = await page.evaluate(() => [...document.querySelectorAll('.ml-r')].map((r, i) => ({
        i, t: (r.querySelector('.ml-t i') || {}).textContent || '',
        s: (r.querySelector('.ml-s i') || {}).textContent || '',
        src: (r.querySelector('.ml-i img') || {}).getAttribute
             ? r.querySelector('.ml-i img').getAttribute('src') : null,
        txt: ((r.querySelector('.ml-i') || {}).textContent || '').trim(),
      })));
      ok('우편 행 수', String(rows.length));
      for (const r of rows) out.push(`     행${r.i} «${r.t}» / ${r.s} → ${r.src || '(img 없음) "' + r.txt + '"'}`);
      const n = rows.length;
      for (let i = 0; i < n; i++) {
        const m = await inkOf(page, '.ml-i', i);
        if (!m) continue;
        const art = m.src ? artRatio[path.basename(m.src)] : null;
        out.push(`     행${i} 잉크 ${m.ink ? m.ink.w + '×' + m.ink.h : '—'}`
               + ` · 상자 ${m.box ? m.box.w : '—'}`
               + (m.ink && m.box ? ` · 잉크/상자 ${(m.ink.w / m.box.w).toFixed(4)}` : '')
               + (art ? ` · 아트 채움비 ${art.w.toFixed(4)}` : '')
               + ` · ${path.basename(m.src || m.text || '?')}`);
      }
      /* 기준선 52 를 만족시키려면 --if-ic 가 얼마여야 하는가(갈래 ⓐ 의 처방값) */
      const m0 = await inkOf(page, '.ml-i', 0);
      if (m0 && m0.ink && m0.box) {
        const perIc = m0.ink.w / parseFloat(m0.ifIc);   /* 잉크 / --if-ic */
        out.push(`     ⇒ 잉크/--if-ic = ${perIc.toFixed(4)} · 잉크 52 를 만들려면 --if-ic = ${(52 / perIc).toFixed(2)}px`);
      }
      await ctx.close();
    }
  } finally { await browser.close(); }

  console.log(out.join('\n'));
  const tot = pass + fail;
  console.log(`\nPROBE642 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
