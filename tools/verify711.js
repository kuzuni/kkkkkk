/* 작업 711 게이트 — «코스튬 강화 델타가 카드 아래로 내는 여정이 **아래 행 글자를 안 덮는다**» 를 굳힌다.
 *
 * 711 의 물음은 판정이었다(등재문 ⚠ «먼저 가를 것»):
 *   ⓐ 카드 아래로 새는 자리에 **아래 행 카드의 글자가 실제로 있는가**
 *   ⓑ 있으면 겹침의 넓이·시간·비율은 얼마인가 — 없으면 **사양**이고 그 행은 닫는다.
 * `tools/probe711.js` 의 실측이 답했다(2026-09-02):
 *   델타 잉크가 카드 아래로 **58px**(상자 63) 나가는데 **행 사이 빈 띠가 49px** 이고
 *   아래 칸의 첫 글자(«Lv. n»)는 그 칸 안 **dy 17** 에서 시작한다 ⇒ 여유 **8px** · 겹침 **0px²** ·
 *   아래 칸 **글줄 화소 변화 0**(1080×2280 · 1080×1600 둘 다). ⇒ **사양**.
 *
 * ⚑ 사양이라고 자리를 비우면(333) 이 판정은 **다음에 누가 행 pitch·카드 높이·여정을 건드리는 순간
 *   조용히 거짓이 된다.** 여유가 8px 뿐이라 더욱 그렇다 — 694 가 [7-f] 를 «가로만» 묻고 세로 하단을
 *   비워 둔 채 판정을 이 행에 넘긴 이유가 그것이다. 그래서 판정을 **자로** 굳힌다.
 *
 * 축
 *   [A] 격자 규약 — 카드 168×171 · 행 pitch 220 · 행 사이 빈 띠 49 · 아래 칸 첫 글자 dy 17
 *   [B] ★ 아래 칸 «글자» 상자와 델타 잉크 상자의 교집합이 **모든 진행도에서 0**
 *   [C] ★ 여유 > 0 — 델타 잉크 하단 ↔ 아래 칸 첫 글자 상단(실측 8px)
 *   [D] ★ 화소 축 — 아래 칸 **글줄 상자 안 화소 변화 0**(상자가 못 보는 7px 스트로크·글로우를 여기서 본다)
 *   [E] 마지막 행(아래 칸이 없는 자리) — 델타가 탭바·뷰포트 밖으로 안 나간다
 *   [F] 9:13.3(1600) 에서도 [B]·[C] 와 같은 판정
 *   [G] 래칫 — **호스트 카드 자신의 «n/500» 겹침은 814 몫**이고, 지금(교집합 1275px² · 세로 100%)보다
 *       나빠지지 않는다. 이 자는 그 자리를 «없다» 고 말하지 않는다(694 가 [7-f] 로 겪은 헛초록의 반대편).
 *   §R 되돌림 시험(334) — 무르게 푼 판정이 아님을 주입으로 못박는다
 *     §R-a 여정을 40px 더 내린다(`fxDelta` 의 시작 `- 80` → `- 40`)  ⇒ [B]·[C]·[D] 빨강
 *     §R-b 행 pitch 를 220 → 196 으로 좁힌다(빈 띠 49 → 25)          ⇒ [B]·[C] 빨강
 *   두 주입이 «여정» 과 «격자» 를 각각 겨눈다 — 이 판정은 둘의 **차**로만 서 있기 때문이다.
 *
 * 실행: node tools/verify711.js        (빠르게: node tools/verify711.js --no-neg)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const DUR = 620;                                  /* `.fx-delta{animation-duration:.62s}` */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const r0 = (n) => (n === null || n === undefined ? '—' : Math.round(n * 10) / 10);

/* 한 트리를 열어 «격자 · 여정 · 겹침 · (선택) 화소» 를 한 번에 걷는다 */
async function measure(file, h, withPixels) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.join(ROOT, file));
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;      /* 전 코스튬 보유 = 격자가 10행이 된다 */
    S.avatar = AVATARS[0].id;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    /* `fxBye` 는 실시간 660ms 에 노드를 지운다 — 스크린샷 한 장이 그보다 오래 걸리므로
       재는 동안만 멈춘다. 안 하면 «두 장째부터 화소 변화 0» 이라는 가짜 초록이 나온다. */
    window.fxBye = () => {};
  });
  await p.waitForTimeout(350);

  const D = await p.evaluate(({ DUR }) => {
    const R = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
    const inksOf = (el) => {
      const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(t);
        const r = g.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push({ txt: t.nodeValue.trim().slice(0, 14), x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right });
      }
      return out;
    };
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    if (!all.length) return { none: true };
    all[0].click();
    const sel = document.querySelector('#bCos .sk-card.sel') || all[0];
    const selR = R(sel);
    const rows = [];
    for (const c of all.map(R)) { let q = rows.find((z) => Math.abs(z.y - c.y) < 4); if (!q) { q = { y: c.y, h: c.h, n: 0 }; rows.push(q); } q.n++; }
    rows.sort((x, y) => x.y - y.y);
    const belowEl = all.find((q) => { const r = q.getBoundingClientRect(); return Math.abs(r.left - selR.x) < 4 && r.top > selR.y + 4; }) || null;
    const below = belowEl ? R(belowEl) : null;
    const belowInks = belowEl ? inksOf(belowEl) : [];
    const selInks = inksOf(sel);

    /* 여정 — 애니를 정지시켜 진행도를 직접 준다 */
    const walk = (host) => {
      for (const d of document.querySelectorAll('.fx-delta')) d.remove();
      fxDelta(host, 'Lv. 2');
      const d = document.querySelector('.fx-delta');
      if (!d) return null;
      const an = d.getAnimations(); an.forEach((a) => a.pause());
      const fr = [];
      for (let i = 0; i <= 20; i++) {
        const t = DUR * i / 20;
        an.forEach((a) => { try { a.currentTime = t; } catch (_) {} });
        const box = R(d);
        const g = document.createRange(); g.selectNodeContents(d);
        const k = g.getBoundingClientRect();
        fr.push({ t, box, ink: { x: k.left, y: k.top, w: k.width, h: k.height, b: k.bottom, r: k.right }, op: parseFloat(getComputedStyle(d).opacity) });
      }
      return fr;
    };
    const frames = walk(sel);

    /* 마지막 행 — 아래 칸이 없는 자리 */
    const last = all[all.length - 1];
    last.scrollIntoView({ block: 'center' }); last.click();
    const lastSel = document.querySelector('#bCos .sk-card.sel') || last;
    const lastFr = walk(lastSel);
    const tb = document.querySelector('#tabbar');
    return { rows: rows.length, cols: rows[0].n, pitch: rows.length > 1 ? rows[1].y - rows[0].y : null,
      gap: rows.length > 1 ? rows[1].y - (rows[0].y + rows[0].h) : null,
      sel: selR, below, belowInks, selInks, frames,
      lastBottom: lastFr ? Math.max(...lastFr.map((q) => q.box.b)) : null,
      last: R(lastSel), tabbar: tb ? R(tb) : null, vh: innerHeight };
  }, { DUR });

  let pix = null;
  if (withPixels && D.below) {
    /* ⚠ 위에서 «마지막 행» 을 보느라 격자를 스크롤했다 — 잘라 낼 상자는 **되돌린 뒤에 다시 잰다**.
       옛 좌표를 그대로 쓰면 같은 뷰포트 자리에 **다른 칸**이 들어와 화소 축이 헛빨강이 된다. */
    const clip = await p.evaluate(() => {
      const all = [...document.querySelectorAll('#bCos [data-cosit]')];
      let sc = all[0].parentElement;
      while (sc && sc !== document.body && !(sc.clientHeight > 0 && sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      if (sc && sc !== document.body) sc.scrollTop = 0;
      all[0].click();
      /* 클릭이 `renderUI()` 로 격자를 갈아 끼운다 — 노드를 **다시** 물어야 한다(LESSONS 22 의 거울) */
      const fresh = [...document.querySelectorAll('#bCos [data-cosit]')];
      const sel = document.querySelector('#bCos .sk-card.sel') || fresh[0];
      const sr = sel.getBoundingClientRect();
      const bel = fresh.find((q) => { const r = q.getBoundingClientRect(); return Math.abs(r.left - sr.left) < 4 && r.top > sr.top + 4; });
      if (!bel) return null;
      const b = bel.getBoundingClientRect();
      /* 화소를 물을 자리 = 아래 칸의 **글줄 상자**(Range). 카드 전체의 «어두운 12%» 로 마스크를 만들면
         이 카드의 라벨이 **흰 글자**(`.sk-clv{color:#fff}`)라 마스크에 안 들어간다 — 그 자로 재면
         주입해도 화소가 안 바뀌는 «헛초록» 이 된다(1회차 §R-a 가 2 로 겨우 섰다). */
      const rows = [];
      const w = document.createTreeWalker(bel, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(t);
        const r = g.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rows.push({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
      }
      return { card: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }, rows };
    });
    if (!clip) { await b.close(); return { ...D, pix: null, errs }; }
    /* ⚠ 화소 축은 «델타 말고는 아무것도 안 움직인다» 가 전제다 — 카드를 누른 손짓(621 눌림·선택 링)이
       아직 돌고 있으면 두 장이 그것 때문에 달라져 **판정이 실행마다 흔들린다**(1회차에 0 ↔ 2567).
       그래서 ① 가라앉히고 ② `#fxl` 을 비우고 ③ 델타만 새로 세운 뒤 ④ 나머지 애니는 전부 끝으로 민다. */
    await p.waitForTimeout(600);
    await p.evaluate(() => {
      for (const d of document.querySelectorAll('#fxl > *')) d.remove();
      document.getAnimations().forEach((a) => { a.pause(); try { a.finish(); } catch (_) {} });
      fxDelta(document.querySelector('#bCos .sk-card.sel') || document.querySelector('#bCos [data-cosit]'), 'Lv. 2');
    });
    const set = async (vis, t) => await p.evaluate(({ v, t }) => {
      document.getAnimations().forEach((a) => {
        const tg = a.effect && a.effect.target;
        if (tg && tg.classList && tg.classList.contains('fx-delta')) { a.pause(); try { a.currentTime = t; } catch (_) {} }
        else { a.pause(); try { a.finish(); } catch (_) {} }
      });
      for (const d of document.querySelectorAll('.fx-delta')) d.style.visibility = v ? 'visible' : 'hidden';
    }, { v: vis, t });
    let worst = { changed: 0, glyphChanged: 0, t: null };
    /* ⚠ 진행도를 «잉크가 가장 깊고 아직 불투명한» 쪽으로 고른다 — 100%(t=620)는 opacity 0 이라
       주입해도 화소가 안 바뀐다(1회차에 §R-a 의 화소 축이 2 로 겨우 섰다). */
    for (const t of [250, 310, 372, 434, 496, 558]) {
      await set(false, t); const a = (await p.screenshot()).toString('base64');
      await set(true, t);  const c = (await p.screenshot()).toString('base64');
      const q = await p.evaluate(async ({ a, c, card, rows }) => {
        const load = (u) => new Promise((res, no) => { const i = new Image(); i.onload = () => res(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
        const im = { a: await load(a), c: await load(c) };
        const grab = (img, box) => {
          const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
          const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
          return g.getImageData(box.x, box.y, box.w, box.h).data;
        };
        const count = (box) => {
          const A = grab(im.a, box), C = grab(im.c, box);
          let n = 0;
          for (let i = 0; i < A.length; i += 4) {
            const df = Math.max(Math.abs(A[i] - C[i]), Math.abs(A[i + 1] - C[i + 1]), Math.abs(A[i + 2] - C[i + 2]));
            if (df > 8) n++;
          }
          return { n, px: A.length / 4 };
        };
        const whole = count(card);
        let rn = 0, rp = 0;
        for (const r of rows) { const q = count(r); rn += q.n; rp += q.px; }
        return { changed: whole.n, total: whole.px, gch: rn, glyph: rp };
      }, { a, c, card: clip.card, rows: clip.rows });
      if (q.gch > worst.glyphChanged || (q.gch === worst.glyphChanged && q.changed > worst.changed)) worst = { changed: q.changed, glyphChanged: q.gch, glyph: q.glyph, t };
    }
    pix = worst;
  }
  /* ⚑ 814 이관 — [G] 절이 볼 «실제 [강화] 경로». 여기까지의 측정(합성 `fxDelta` 호출)은 **부품 기하**이고,
     814 가 고친 것은 **호출**이다(문구를 빼고 값 줄 팝으로 옮겼다) — 둘을 같이 재야 «부품을 지운 것과
     호출을 옮긴 것» 이 구별된다. 이 블록은 화소 축이 끝난 **맨 뒤**에서만 돈다(클릭이 격자를 재렌더한다). */
  const real = await p.evaluate(() => {
    const inksOf = (el) => {
      const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(t);
        const r = g.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push({ txt: t.nodeValue.trim().slice(0, 14), x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right });
      }
      return out;
    };
    for (const d of document.querySelectorAll('#fxl > *')) d.remove();
    const btn = document.querySelector('#bCos [data-cosup]');
    if (!btn) return { none: true };
    btn.click();
    const sel = document.querySelector('#bCos .sk-card.sel');
    const inks = sel ? inksOf(sel) : [];
    const dels = [...document.querySelectorAll('.fx-delta')];
    const anims = dels.flatMap((d) => d.getAnimations());
    anims.forEach((a) => a.pause());
    let area = 0;
    for (let i = 0; i <= 20; i++) {
      anims.forEach((a) => { try { a.currentTime = (620 * i) / 20; } catch (_) {} });
      for (const d of dels) {
        if (parseFloat(getComputedStyle(d).opacity) <= 0.02) continue;
        const rg = document.createRange(); rg.selectNodeContents(d);
        const k = rg.getBoundingClientRect();
        for (const q of inks) {
          const ox = Math.max(0, Math.min(k.right, q.r) - Math.max(k.left, q.x));
          const oy = Math.max(0, Math.min(k.bottom, q.b) - Math.max(k.top, q.y));
          area = Math.max(area, ox * oy);
        }
      }
    }
    const clv = sel && sel.querySelector('.sk-clv');
    return { delta: dels.length, area, pop: !!(clv && clv.classList.contains('fx-cvswap')) };
  });
  await b.close();
  return { ...D, pix, real, errs };
}

/* 프레임별 «델타 잉크 ↔ 글자 상자» 교집합 */
function overlap(frames, inks) {
  let n = 0, area = 0, v = 0, first = null, last = null;
  for (const q of frames || []) {
    if (q.op <= 0.02) continue;
    let a = 0, vv = 0;
    for (const k of inks) {
      const ox = Math.max(0, Math.min(q.ink.r, k.r) - Math.max(q.ink.x, k.x));
      const oy = Math.max(0, Math.min(q.ink.b, k.b) - Math.max(q.ink.y, k.y));
      a += ox * oy; if (ox > 0 && oy > 0) vv = Math.max(vv, oy / k.h);
    }
    if (a > 0) { n++; if (first === null) first = q.t; last = q.t; }
    area = Math.max(area, a); v = Math.max(v, vv);
  }
  return { n, area, v, first, last };
}
const inkBottom = (frames) => Math.max(...frames.filter((q) => q.op > 0.02).map((q) => q.ink.b));
const topInk = (inks) => (inks.length ? Math.min(...inks.map((k) => k.y)) : null);

(async () => {
  console.log('VERIFY711 — «코스튬 델타의 아래 행 여유» 판정을 굳힌다\n');
  const neg = !process.argv.includes('--no-neg');

  const M = await measure(process.env.V711_SRC || 'index.html', 2280, true);
  if (M.none) { console.log('  ✗ 코스튬 카드를 못 찾았다'); process.exit(1); }

  console.log('[A] 격자 규약');
  console.log(`  · ${M.rows}행 × ${M.cols}열 · 카드 ${r0(M.sel.w)}×${r0(M.sel.h)} · 행 pitch ${r0(M.pitch)} · 행 사이 빈 띠 ${r0(M.gap)}`);
  ok(Math.abs(M.sel.w - 168) < 1.5 && Math.abs(M.sel.h - 171) < 1.5, `[A1] 카드 168×171 (${r0(M.sel.w)}×${r0(M.sel.h)})`);
  ok(Math.abs(M.pitch - 220) < 1.5, `[A2] 행 pitch 220 (${r0(M.pitch)})`);
  ok(Math.abs(M.gap - 49) < 1.5, `[A3] 행 사이 빈 띠 49 (${r0(M.gap)})`);
  ok(!!M.below && M.belowInks.length >= 1, `[A4] 아래 칸에 글자가 ${M.belowInks.length}줄 있다 — 물음이 성립한다`);
  const dyFirst = topInk(M.belowInks) - M.below.y;
  ok(Math.abs(dyFirst - 17) < 2, `[A5] 아래 칸 첫 글자가 칸 안 dy 17 에서 시작한다 (${r0(dyFirst)})`);

  const ib = inkBottom(M.frames), bx = Math.max(...M.frames.map((q) => q.box.b));
  console.log('\n[B]·[C] 여정 ↔ 아래 칸');
  console.log(`  · 카드 아래로 — 상자 ${r0(bx - M.sel.b)}px · 잉크 ${r0(ib - M.sel.b)}px (빈 띠 ${r0(M.gap)})`);
  const OB = overlap(M.frames, M.belowInks);
  const slack = topInk(M.belowInks) - ib;
  console.log(`  · 겹침 ${OB.n}진행도 · 교집합 ${r0(OB.area)}px² · **여유 ${r0(slack)}px**`);
  ok(OB.area === 0, `[B] ★ 아래 칸 글자와의 교집합 0px² (${r0(OB.area)})`);
  ok(slack > 0, `[C] ★ 여유 > 0 — 델타 잉크 하단 ${r0(ib)} < 아래 칸 첫 글자 상단 ${r0(topInk(M.belowInks))} (${r0(slack)}px)`);

  console.log('\n[D] 화소 축 — 아래 칸 «글줄 상자» 안 화소');
  console.log(`  · 최악 진행도 t=${M.pix ? M.pix.t : '—'}ms — 칸 전체 바뀐 화소 ${M.pix ? M.pix.changed + '/' + M.pix.total : '—'}`
    + ` · **글줄 상자 안 ${M.pix ? M.pix.glyphChanged + '/' + M.pix.glyph : '—'}**`);
  ok(M.pix && M.pix.glyphChanged === 0, `[D] ★ 아래 칸 글줄 화소 변화 0 (${M.pix ? M.pix.glyphChanged : '—'})`);

  console.log('\n[E] 마지막 행 — 아래 칸이 없는 자리');
  const lim = M.tabbar ? M.tabbar.y : M.vh;
  console.log(`  · 카드 y ${r0(M.last.y)}..${r0(M.last.b)} · 델타 상자 하단 ${r0(M.lastBottom)} · 탭바 상단 ${r0(lim)} · 뷰포트 ${M.vh}`);
  ok(M.lastBottom <= lim + 0.5, `[E1] 델타가 탭바 위로 안 올라간다 (${r0(M.lastBottom)} ≤ ${r0(lim)})`);
  ok(M.lastBottom <= M.vh + 0.5, `[E2] 뷰포트 밖으로 안 나간다 (${r0(M.lastBottom)} ≤ ${M.vh})`);

  console.log('\n[F] 9:13.3 (1080×1600) — 같은 판정인가');
  const S = await measure(process.env.V711_SRC || 'index.html', 1600, false);
  const OB2 = overlap(S.frames, S.belowInks), sl2 = topInk(S.belowInks) - inkBottom(S.frames);
  console.log(`  · 카드 ${r0(S.sel.w)}×${r0(S.sel.h)} · 교집합 ${r0(OB2.area)}px² · 여유 ${r0(sl2)}px`);
  ok(OB2.area === 0 && sl2 > 0, `[F1] 1600 에서도 겹침 0 · 여유 ${r0(sl2)}px`);
  ok(Math.abs(sl2 - slack) < 1.5, `[F2] 두 프레임의 여유가 같다 (2280 ${r0(slack)} ↔ 1600 ${r0(sl2)}) — 프레임 높이는 이 자리의 축이 아니다`);

  /* ⚑⚑ 814 이관(2026-09-02) — 이 절은 «실재한다» 를 묻던 자리였다. 814 가 닫았으므로 **방향을 뒤집되
     자리를 비우지 않는다**(333): [G1] 은 **실제 [강화] 경로**가 그 자리를 안 지나는지를 묻고,
     [G2] 는 «그렇게 된 이유가 부품을 지운 것이 아님» — 합성 호출은 종전 기하 그대로 그 자리를 지난다 —
     을 붙든다. 둘을 같이 물어야 «fxDelta 를 통째로 죽여도 초록» 인 자가 안 된다.
     상세한 자는 `tools/verify814.js`(수명 전체 · 남아 있어야 할 것 · §R 되돌림 시험). */
  console.log('\n[G] 호스트 카드 «자신» 의 글자 — 814 가 닫은 자리');
  const OH = overlap(M.frames, M.selInks);
  console.log(`  · 호스트 글자 ${M.selInks.map((k) => '«' + k.txt + '» dy ' + r0(k.y - M.sel.y)).join(' · ')}`);
  console.log(`  · 합성 호출(부품 기하) — 겹침 ${OH.n}진행도 · 교집합 ${r0(OH.area)}px² · 세로 ${(OH.v * 100).toFixed(0)}% · 구간 ${r0(OH.first)}~${r0(OH.last)}ms`);
  console.log(`  · 실제 [강화] 경로 — 텍스트 델타 ${M.real ? M.real.delta : '—'}장 · 교집합 ${M.real ? r0(M.real.area) : '—'}px² · 값 줄 팝 ${M.real && M.real.pop ? '걸림' : '없음'}`);
  ok(!!M.real && !M.real.none && M.real.delta === 0 && M.real.area === 0,
    `[G1] ★ 814 완료 — 실제 [강화] 경로가 호스트 글자 위에 텍스트를 안 세운다 (교집합 ${M.real ? r0(M.real.area) : '—'}px²)`);
  ok(OH.area > 0 && OH.area <= 1400,
    `[G2] 부품을 지운 게 아니라 호출을 옮긴 것이다 — 합성 호출은 종전 기하 그대로 (${r0(OH.area)}px², 래칫 ≤ 1400)`);

  /* ── §R 되돌림 시험 ─────────────────────────────────────── */
  if (neg) {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const INJ = [
      ['R-a', '여정을 40px 더 내린다 (`fxDelta` 시작 −80 → −40)',
        "d.style.top  = (r.y + r.h + (trCv ? 4 : 20) - 80) + 'px';",
        "d.style.top  = (r.y + r.h + (trCv ? 4 : 20) - 40) + 'px';"],
      ['R-b', '행 pitch 를 220 → 196 으로 좁힌다 (빈 띠 49 → 25)',
        "'style=\"left:' + (36 + (i % 5)*190) + 'px;top:' + (TOP + ((i/5)|0)*220) + 'px'",
        "'style=\"left:' + (36 + (i % 5)*190) + 'px;top:' + (TOP + ((i/5)|0)*196) + 'px'"],
    ];
    console.log('\n§R 되돌림 시험 — 주입하면 그 항이 실제로 빨개지는가(334)');
    for (const [tag, why, from, to] of INJ) {
      if (src.indexOf(from) < 0) { ok(false, `[${tag}] 주입 앵커를 못 찾았다 — 조용한 통과 금지`); continue; }
      const tmp = `.v711-neg-${process.pid}-${tag}.html`;      /* 646·648 — 이름에 pid */
      fs.writeFileSync(path.join(ROOT, tmp), src.split(from).join(to));
      try {
        const N = await measure(tmp, 2280, tag === 'R-a');
        const O = overlap(N.frames, N.belowInks);
        const sl = topInk(N.belowInks) - inkBottom(N.frames);
        const red = O.area > 0 || sl <= 0;
        console.log(`  · [${tag}] ${why} — 교집합 ${r0(O.area)}px² · 여유 ${r0(sl)}px`
          + (N.pix ? ` · 아래 칸 글줄 화소 변화 ${N.pix.glyphChanged}` : ''));
        ok(red, `[${tag}] 주입하면 [B]·[C] 가 빨개진다 (교집합 ${r0(O.area)} · 여유 ${r0(sl)})`);
        if (N.pix) ok(N.pix.glyphChanged > 0, `[${tag}-px] 주입하면 [D] 도 빨개진다 (글리프 화소 변화 ${N.pix.glyphChanged})`);
      } finally { try { fs.unlinkSync(path.join(ROOT, tmp)); } catch (_) {} }
    }
  }

  const e = M.errs.length + S.errs.length;
  ok(e === 0, `[H] 콘솔 에러 ${e}건`);
  console.log(`\nVERIFY711 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
