#!/usr/bin/env node
/* 작업 582 — 「승급 계열 팝업 디자인 통일 — 179 클리어 보상 미리보기·182 획득 코스튬 칸을
 *              «다른 팝업에서 쓰는 슬롯» 프레임으로」 **재현**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다. 338·341·477·543 이 여기서 등재문을 잃었다.)
 *
 *   node tools/probe582.js
 *
 * 등재문은 «세 자리가 각자 자체 상자를 그린다» 고 적었다. 확인할 것이 여섯이다:
 *   [A] 선언  — 프레임(면색·테두리·radius)을 주는 규칙이 세 자리에서 **각각 따로**인가.
 *               한 부품을 이미 공유하고 있다면 이 행은 «부품 승격» 이 아니라 다른 일이다.
 *   [B] 기하  — 세 자리의 계산된 단면(radius · 링 두께 · 면색)을 나란히 적는다.
 *   [C] 화소  — **찍힌 픽셀**로 프레임 단면을 잰다(칸 가로 한복판에서 위→아래 색 런).
 *               DOM 의 box-shadow 문자열이 아니라 «눈에 보이는 두께» 가 채점 대상이다.
 *   [D] 여유  — 179 보상 줄·182 격자에 프레임을 두를 자리가 있는가(칸을 키워야 하는가).
 *   [E] 그림  — 411(슬롯 아이콘)·492(카드) 가 정한 그림 크기 — 이 행이 **되돌리면 안 되는** 값.
 *   [F] 연출  — 182 `promoCosFx` 의 70ms 스태거·앞 8칸 파티클·FXMAX. 프레임을 바꾸면 흔들릴 자리.
 *
 * ⚠ 이 자는 «수리 전» 을 적는 것이 목적이다 — 수리 후에도 같은 명령으로 돌려 [C]·[E]·[F] 를 대조한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/* 칸 가로 한복판에서 위 → 아래로 색이 바뀌는 지점을 적는다.
   ⚠ 가로 한복판을 고른 이유 — radius 가 40 이라 모서리 쪽 세로 절단은 배경(베이지 본문)을 먼저 문다.
   한복판은 radius 와 무관하게 «링 → 면» 순서가 그대로 나온다. 스프라이트 잉크는 칸 아래쪽이라
   위에서 20~30px 만 읽으면 안 닿는다(그래도 런 목록에 그대로 찍히므로 눈으로 확인할 수 있다). */
async function frameCut(page, sel, depth) {
  const r = await page.evaluate(q => {
    const e = document.querySelector(q); if (!e) return null;
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { x: b.x, y: b.y, w: b.width, h: b.height,
             rad: parseFloat(cs.borderTopLeftRadius), bg: cs.backgroundColor,
             sh: cs.boxShadow, bw: parseFloat(cs.borderTopWidth), bc: cs.borderTopColor };
  }, sel);
  if (!r) return null;
  const clip = { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.w), height: Math.ceil(r.h) };
  const buf = await page.screenshot({ clip });
  const runs = await page.evaluate(async ([b64, dep]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const x = Math.floor(c.width / 2), out = [];
    const n = Math.min(dep, c.height);
    for (let y = 0; y < n; y++) {
      const i = (y * c.width + x) * 4;
      const col = [d[i], d[i + 1], d[i + 2]];
      const last = out[out.length - 1];
      /* 안티에일리어싱 한 줄은 런으로 안 센다 — 색차 24 안이면 같은 런으로 묶는다 */
      if (last && Math.abs(last.c[0] - col[0]) + Math.abs(last.c[1] - col[1]) + Math.abs(last.c[2] - col[2]) <= 24) last.n++;
      else out.push({ c: col, n: 1, y0: y });
    }
    return out;
  }, [buf.toString('base64'), depth || 40]);
  /* 1px 짜리 경계 런(AA)은 앞 런에 흡수해 «두께» 를 사람이 읽는 대로 만든다 */
  const merged = [];
  for (const run of runs) {
    if (run.n === 1 && merged.length && runs.indexOf(run) < runs.length - 1) { merged[merged.length - 1].n += 1; continue; }
    merged.push(run);
  }
  return { ...r, runs: merged.map(m => ({ col: hex(m.c[0], m.c[1], m.c[2]), n: m.n, y0: m.y0 })) };
}
const cutStr = f => f.runs.map(r => r.col + '×' + r.n).join(' → ');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openPromo === 'function' && typeof gmHero === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 정지 — 화소 판정 안정화(554 처방) */

  /* ── [A] 선언 층 ─────────────────────────────────────────────────────────── */
  console.log('\n[A] 선언 — 프레임을 주는 규칙이 세 자리에서 각각 따로인가');
  const decl = await page.evaluate(() => {
    const want = ['borderRadius', 'boxShadow', 'backgroundColor', 'borderTopWidth', 'border'];
    const hits = {};
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (_) { continue; }
      for (const r of rules || []) {
        if (!r.selectorText || !r.style) continue;
        const st = r.style;
        const has = ['border-radius', 'box-shadow', 'background', 'border'].some(k => st.getPropertyValue(k));
        if (!has) continue;
        for (const key of ['.sk-slot', '.pr-rw-c', '.pg-c', '.slotfr']) {
          if (r.selectorText.indexOf(key) >= 0 && !/\.lock|\.free|>|:is\(/.test(r.selectorText.replace(key, ''))) {
            (hits[key] = hits[key] || []).push(r.selectorText);
          }
        }
      }
    }
    return hits;
  });
  for (const k of ['.sk-slot', '.pr-rw-c', '.pg-c']) console.log('      ' + k + ' ← ' + ((decl[k] || []).join(' | ') || '(없음)'));

  const own = ['.sk-slot', '.pr-rw-c', '.pg-c'].filter(k => (decl[k] || []).length);
  console.log('      .slotfr(공용 부품) ← ' + ((decl['.slotfr'] || []).join(' | ') || '(없음)'));
  console.log('      ⇒ 자체 프레임 선언을 가진 자리: ' + (own.join(' · ') || '(0곳)')
    + ' · 공용 부품 존재: ' + ((decl['.slotfr'] || []).length ? 'O' : 'X'));
  /* ⚠ 이 자는 **수리 전·후 어느 트리에서도 돈다**(그래야 대조가 된다) — 그래서 «지금 몇 곳이
     자체 상자인가» 는 단언이 아니라 **찍어서 적는다**. 등재 당시 값(수리 전)은 3곳 전부 자체 상자 ·
     공용 부품 없음이었고, 그 기록은 `docs/review/582-승급계열디자인통일.md` §2 에 있다.
     단언은 «세 자리를 다 찾았다» 하나면 충분하다 — 못 찾으면 아래 [B]·[C] 가 통째로 헛돈다. */
  ok(own.length + ((decl['.slotfr'] || []).length ? 1 : 0) > 0,
    'A1 프레임을 주는 규칙을 찾았다 (자체 상자든 공용 부품이든)',
    '자체 ' + own.length + '곳 · 공용 ' + ((decl['.slotfr'] || []).length) + '규칙');

  /* ── [B]·[C] 슬롯(기준) ──────────────────────────────────────────────────── */
  console.log('\n[B]·[C] 기준 — 07·26·50 이 공유하는 장착 슬롯 `.sk-slot`');
  await page.evaluate(() => {
    Object.assign(S, DEF()); S.best = 200; S.stage = 200;
    S.own = {}; SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
    S.eqSkill = []; SKILLS.slice(0, 6).forEach(s => toggleEquip(s, 'skill'));
    S.avatars = { av0: 1, av41: 1 };
    buildSlots(); uiDirty = true; renderUI();
  });
  const cuts = {};
  for (const [sub, sel, tag] of [['sk', '#bSk .sk-slot[data-skslot]', '07 스킬 슬롯'],
                                 ['cos', '#bCos .sk-slot[data-cosun]', '50 코스튬 슬롯']]) {
    await page.evaluate(s => gmHero(s), sub);
    await page.waitForTimeout(700);
    const f = await frameCut(page, sel, 26);
    if (!f) { ok(false, 'B/C ' + tag + ' 표본을 못 찾았다', sel); continue; }
    cuts[sub] = f;
    console.log('      ' + tag + ' ' + p2(f.w) + '×' + p2(f.h) + ' · radius ' + f.rad + ' · 면 ' + f.bg);
    console.log('        찍힌 단면(위→아래) ' + cutStr(f));
  }
  await page.evaluate(() => { closeModal(); gmCloseAll && gmCloseAll(); });

  /* ── [B]·[C] 179 클리어 보상 미리보기 ────────────────────────────────────── */
  console.log('\n[B]·[C] 179 승급전 팝업 — 클리어 보상 미리보기 `.pr-rw-c`');
  await page.evaluate(() => { closeModal(); S.rank = 2; openPromo(); });
  await page.waitForTimeout(400);
  const rw = await frameCut(page, '#modal .pr179 .pr-rw-c', 26);
  ok(!!rw, 'C1 179 미리보기 칸이 실재한다');
  if (rw) {
    console.log('      ' + p2(rw.w) + '×' + p2(rw.h) + ' · radius ' + rw.rad + ' · 면 ' + rw.bg + ' · box-shadow ' + rw.sh);
    console.log('        찍힌 단면(위→아래) ' + cutStr(rw));
  }
  const rwRow = await page.evaluate(() => {
    const wrap = document.querySelector('#modal .pr179 .pr-rw');
    const row = document.querySelector('#modal .pr179 .pr-rw-b');
    const c = document.querySelector('#modal .pr179 .pr-rw-c');
    const t = document.querySelector('#modal .pr179 .pr-rw-t');
    const cv = c && c.querySelector('canvas');
    const cs = wrap && getComputedStyle(wrap);
    const inner = wrap ? wrap.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
                       - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth) : 0;
    return { inner, cw: c ? c.getBoundingClientRect().width : 0, tw: t ? t.getBoundingClientRect().width : 0,
             gap: row ? parseFloat(getComputedStyle(row).gap) : 0,
             cvAttr: cv ? [cv.width, cv.height] : null,
             cvCss: cv ? [cv.getBoundingClientRect().width, cv.getBoundingClientRect().height] : null,
             cvSc: cv ? cv.getAttribute('data-cossc') : null };
  });
  console.log('      [D] 보상 줄 — 상자 안쪽 폭 ' + p2(rwRow.inner) + ' = 칸 ' + p2(rwRow.cw)
    + ' + gap ' + rwRow.gap + ' + 글 ' + p2(rwRow.tw) + ' ⇒ 남는 폭 ' + p2(rwRow.inner - rwRow.cw - rwRow.gap - rwRow.tw));
  console.log('      [E] 미리보기 캔버스 attr ' + JSON.stringify(rwRow.cvAttr) + ' · css ' + JSON.stringify(rwRow.cvCss.map(p2)) + ' · cossc ' + rwRow.cvSc);

  /* ── [B]·[C] 182 획득 코스튬 칸 ──────────────────────────────────────────── */
  console.log('\n[B]·[C] 182 승급 «성공» 팝업 — 획득 코스튬 칸 `.pg-c`');
  const pgInfo = await page.evaluate(() => {
    closeModal();
    S.avatars = { av0: 1 }; S.rank = 2; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() };
    endPromo(true);
    const wrap = document.querySelector('#mbox .pr182');
    const grid = document.querySelector('#mbox .pg-grid');
    const cards = [].slice.call(document.querySelectorAll('#mbox .pg-c'));
    if (!wrap || !cards.length) return null;
    const cs = getComputedStyle(wrap);
    const inner = wrap.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
                - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    const cb = cards[0].getBoundingClientRect();
    const cv = cards[0].querySelector('canvas');
    const u = cards[0].querySelector('u');
    return { n: cards.length, inner, cw: cb.width, ch: cb.height,
             gap: parseFloat(getComputedStyle(grid).gap),
             cvAttr: [cv.width, cv.height],
             cvCss: [cv.getBoundingClientRect().width, cv.getBoundingClientRect().height],
             cvSc: cv.getAttribute('data-cossc'),
             uBottom: u ? cb.bottom - u.getBoundingClientRect().bottom : null,
             uFs: u ? parseFloat(getComputedStyle(u).fontSize) : null };
  });
  ok(!!pgInfo, 'C2 182 격자 칸이 실재한다');
  let pg = null;
  if (pgInfo) {
    await page.waitForTimeout(900);           /* 스태거·펄스가 끝난 뒤 화소를 읽는다 */
    pg = await frameCut(page, '#mbox .pg-c', 26);
    console.log('      칸 ' + p2(pg.w) + '×' + p2(pg.h) + ' · radius ' + pg.rad + ' · 면 ' + pg.bg
      + ' · border ' + pg.bw + 'px ' + pg.bc);
    console.log('        찍힌 단면(위→아래) ' + cutStr(pg));
    const cols = Math.floor((pgInfo.inner + pgInfo.gap) / (pgInfo.cw + pgInfo.gap));
    const maxCell = (pgInfo.inner - pgInfo.gap * 4) / 5;
    console.log('      [D] 격자 — 안쪽 폭 ' + p2(pgInfo.inner) + ' · 칸 ' + p2(pgInfo.cw) + '×' + p2(pgInfo.ch)
      + ' · gap ' + pgInfo.gap + ' ⇒ 한 줄 ' + cols + '칸 · **5열이 쓸 수 있는 칸 폭 상한 ' + p2(maxCell) + '**');
    console.log('      [E] 칸 캔버스 attr ' + JSON.stringify(pgInfo.cvAttr) + ' · css ' + JSON.stringify(pgInfo.cvCss.map(p2))
      + ' · cossc ' + pgInfo.cvSc + ' · 라벨 fs ' + pgInfo.uFs + ' · 라벨 하변↔칸 하변 ' + p2(pgInfo.uBottom));
  }

  /* ── [C] 세 단면의 «같은가» ─────────────────────────────────────────────── */
  console.log('\n[C] 대조 — 세 자리의 찍힌 프레임 단면이 지금 같은가 (수리 전 ↔ 수리 후 대조용 · 찍어서 적는다)');
  const base = cuts.sk;
  if (base && rw && pg) {
    /* 림 색은 셋이 달라도 된다 — 194 규약이 «림 = 그 코스튬의 틴트» 이기 때문이다.
       통일의 자는 **두께 수열**이다(검정 n → 림 m → 면). 색까지 묶으면 194 를 되돌리게 된다. */
    const shape = f => f.runs.filter(r => r.n >= 3).map(r => r.n).join('/');
    console.log('      슬롯  ' + cutStr(base));
    console.log('      179   ' + cutStr(rw));
    console.log('      182   ' + cutStr(pg));
    console.log('      ⇒ 두께 수열 — 슬롯 ' + shape(base) + ' · 179 ' + shape(rw) + ' · 182 ' + shape(pg));
    console.log('      ⇒ radius — 슬롯 ' + base.rad + ' · 179 ' + rw.rad + ' · 182 ' + pg.rad);
    console.log('      ⇒ 면색  — 슬롯 ' + base.bg + ' · 179 ' + rw.bg + ' · 182 ' + pg.bg);
    console.log('      (등재 당시 = 수리 전: 슬롯 5/7/14 r40 · 179 «링 없음» r24 · 182 «border 3» r16 — 셋이 갈렸다)');
    ok(true, 'C3 세 자리의 단면을 모두 쟀다 — 위 세 줄이 이 트리의 기록이다');
  } else ok(false, 'C3 세 표본이 다 모이지 않았다');

  /* ── [F] 연출 ────────────────────────────────────────────────────────────── */
  console.log('\n[F] 연출 — 182 promoCosFx (프레임을 바꾸면 흔들릴 자리)');
  const fx = await page.evaluate(async () => {
    closeModal();
    S.avatars = { av0: 1 }; S.rank = 0; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() };
    endPromo(true);
    const cards = [].slice.call(document.querySelectorAll('#mbox .pg-c'));
    let hit = 0, parts = 0;
    for (let t = 0; t < 24; t++) {
      await new Promise(r => setTimeout(r, 40));
      hit = Math.max(hit, cards.filter(c => c.classList.contains('fx-hit') || c.classList.contains('fx-flash')).length);
      parts = Math.max(parts, document.querySelectorAll('#fxl > *').length);
    }
    const boxEl = document.querySelector('#modal .mbox'), gridEl = document.querySelector('#mbox .pr182');
    let inside = false, over = 0;
    if (boxEl && gridEl) {
      const b = boxEl.getBoundingClientRect(), g = gridEl.getBoundingClientRect();
      inside = g.left >= b.left - 1 && g.right <= b.right + 1 && g.bottom <= b.bottom + 1;
      over = Math.max(0, g.bottom - b.bottom);
    }
    const mb = boxEl ? boxEl.getBoundingClientRect() : null;
    closeModal();
    return { n: cards.length, hit, parts, inside, over, fxmax: (typeof FXMAX !== 'undefined' ? FXMAX : -1),
             boxH: mb ? mb.height : 0 };
  });
  console.log('      칸 ' + fx.n + ' · fx 걸린 칸 ' + fx.hit + ' · #fxl 최대 ' + fx.parts + ' · FXMAX ' + fx.fxmax
    + ' · 팝업 상자 높이 ' + p2(fx.boxH));
  ok(fx.hit > 0, 'F1 연출이 실제로 칸에 붙는다 (수리 후에도 유지)', fx.hit + '칸');
  ok(fx.parts > 0, 'F2 파티클 레이어에 노드가 생긴다 (수리 후에도 유지)', String(fx.parts));
  ok(fx.inside, 'F3 격자가 팝업 상자 안에 든다 (수리 후에도 유지 — 칸이 커지면 여기가 먼저 깨진다)',
    fx.over ? '넘침 ' + p2(fx.over) + 'px' : '넘침 0');

  ok(errs.length === 0, 'Z1 콘솔 에러 0건', errs.slice(0, 3).join(' / '));
  await browser.close();
  console.log('\nPROBE582  ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
