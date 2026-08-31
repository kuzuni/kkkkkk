#!/usr/bin/env node
/* 작업 582 — 「승급 계열 팝업 디자인 통일」 **게이트**
 *
 *   node tools/verify582.js
 *
 * 무엇을 못박나 (PROGRESS 582 행의 게이트 ⑴~⑺ 그대로):
 *   [A] 부품   — 179 `.pr-rw-c` · 182 `.pg-c` · 07·26·50 장착 슬롯이 **같은 클래스**(`.slotfr`)를 달고,
 *                프레임(면·링·radius)을 **그 한 규칙에서만** 받는다(자체 리터럴이 되살아나면 빨강).
 *   [B] 화소   — **찍힌 픽셀**로 세 자리의 프레임 단면(검정 5 → 림 7 → 면)과 radius·면색이 같다.
 *                ⚠ 림 «색» 은 셋이 달라도 된다 — 194 규약이 «림 = 그 코스튬의 틴트» 이기 때문이다.
 *                통일의 자는 **두께 수열 + radius + 면색**이고, 림 색은 [C] 가 «토큰에서 온다» 로 받는다.
 *   [C] 토큰   — 두 팝업의 상자 톤(면·테두리·표제 색·radius)이 같은 값이고, 리터럴이 아니라 토큰이다.
 *   [D] 그림   — 411(슬롯 아이콘)·이 행이 키운 칸의 **그림 크기가 한 픽셀도 안 줄었다**.
 *   [E] 연출   — 182 `promoCosFx` 의 70ms 스태거 · 앞 8칸 파티클 · FXMAX 드롭 0건.
 *   [F] 불변   — 515 `.pr-cond{text-align:center}` · 320 «권장 스테이지» 한 줄 · 179 겹침 0.
 *   [R] 되돌림 — 공용 프레임을 뗀 **사본**에서 [B] 가 실제로 빨개진다(무르게 푼 자가 아님을 못박는다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/* 칸 가로 한복판에서 위 → 아래로 «색이 바뀌는 지점» 을 적는다(probe582 와 같은 자).
   가로 한복판이라 radius 와 무관하게 «검정 링 → 림 링 → 면» 순서가 그대로 나온다. */
async function frameCut(page, sel, depth) {
  const r = await page.evaluate(q => {
    const e = document.querySelector(q); if (!e) return null;
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { x: b.x, y: b.y, w: b.width, h: b.height,
             rad: parseFloat(cs.borderTopLeftRadius), bg: cs.backgroundColor, sh: cs.boxShadow };
  }, sel);
  if (!r) return null;
  const buf = await page.screenshot({ clip: { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.w), height: Math.ceil(r.h) } });
  const runs = await page.evaluate(async ([b64, dep]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const x = Math.floor(c.width / 2), out = [];
    for (let y = 0, n = Math.min(dep, c.height); y < n; y++) {
      const i = (y * c.width + x) * 4, col = [d[i], d[i + 1], d[i + 2]];
      const last = out[out.length - 1];
      if (last && Math.abs(last.c[0] - col[0]) + Math.abs(last.c[1] - col[1]) + Math.abs(last.c[2] - col[2]) <= 24) last.n++;
      else out.push({ c: col, n: 1 });
    }
    return out;
  }, [buf.toString('base64'), depth || 24]);
  /* 모서리 밖 배경 한 줄(AA)은 «두께» 가 아니다 — 3px 미만 런은 버린다 */
  const solid = runs.filter(m => m.n >= 3);
  return { ...r, cut: solid.map(m => ({ col: hex(m.c[0], m.c[1], m.c[2]), n: m.n })) };
}
const shapeOf = f => f.cut.map(r => r.n).join('/');
const cutStr = f => f.cut.map(r => r.col + '×' + r.n).join(' → ');

async function seedSheets(page) {
  await page.evaluate(() => {
    Object.assign(S, DEF()); S.best = 200; S.stage = 200;
    S.own = {}; SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
    S.eqSkill = []; SKILLS.slice(0, 6).forEach(s => toggleEquip(s, 'skill'));
    S.pet = {}; S.eqPet = []; PETS.slice(0, 2).forEach(t => { S.pet[t.id] = { n: 3, l: 2 }; toggleEquip(t, 'pet'); });
    S.avatars = { av0: 1, av41: 1 };
    buildSlots(); uiDirty = true; renderUI();
  });
}

(async () => {
  /* ── [A] 부품 — 소스 층 ──────────────────────────────────────────────────── */
  console.log('\n[A] 부품 — 세 자리가 같은 클래스를 달고 프레임을 한 규칙에서 받는가');
  const slotRule = /\.slotfr\{([^}]*)\}/.exec(SRC);
  ok(!!slotRule, 'A1 공용 부품 `.slotfr` 규칙이 소스에 있다');
  if (slotRule) {
    const body = slotRule[1];
    ok(/box-shadow:[^;]*inset[^;]*var\(--slot-k\)[^;]*inset[^;]*var\(--slot-w\)/.test(body),
      'A2 링 두께가 토큰(`--slot-k`·`--slot-w`)에서 온다 — 자리마다 숫자를 다시 적지 않는다');
    ok(/border-radius:var\(--slot-r\)/.test(body), 'A3 radius 도 토큰(`--slot-r`)이다');
    ok(!/#[0-9A-Fa-f]{6}/.test(body.replace(/#000\b/g, '')),
      'A4 면·림 **색 리터럴이 부품 안에 없다** (호스트가 `--f`/`--r` 로 준다 · 402 «표 두 벌» 방지)',
      body.replace(/\s+/g, ' ').slice(0, 90));
  }
  ok(/:root\{--slot-r:40px;--slot-k:5px;--slot-w:12px\}/.test(SRC),
    'A5 토큰 값이 슬롯 실측(radius 40 · 검정 5 · 림 12)과 같다');
  for (const [tag, re] of [['07·26·50 슬롯', /class="sk-slot slotfr/g],
                           ['179 미리보기', /class="pr-rw-c slotfr"/g],
                           ['182 획득 칸', /class="pg-c slotfr"/g]]) {
    const n = (SRC.match(re) || []).length;
    ok(n > 0, 'A6 ' + tag + ' 마크업이 `slotfr` 를 단다', n + '자리');
  }
  ok(!/\.mbody \.pr179 \.pr-rw-c\{[^}]*(background:#|border-radius:\d)/.test(SRC),
    'A7 179 미리보기에 **자체 면색·radius 가 안 되살아났다**');
  ok(!/\.mbody \.pr182 \.pg-c\{[^}]*(background:#|border:\d|border-radius:\d)/.test(SRC),
    'A8 182 칸에 **자체 면색·테두리·radius 가 안 되살아났다**');

  /* ── 브라우저 ────────────────────────────────────────────────────────────── */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openPromo === 'function' && typeof gmHero === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 정지 — 화소 판정 안정화(554) */

  /* 캐스케이드 승자가 정말 `.slotfr` 인가 — 자체 규칙이 이기고 있으면 [B] 가 우연히 초록일 수 있다 */
  console.log('\n[A] 부품 — 캐스케이드 승자');
  await seedSheets(page);
  await page.evaluate(() => gmHero('cos'));
  await page.waitForTimeout(700);
  const winners = await page.evaluate(() => {
    const out = {};
    const targets = { slot: '#bCos .sk-slot[data-cosun]' };
    for (const [k, sel] of Object.entries(targets)) {
      const e = document.querySelector(sel); if (!e) { out[k] = null; continue; }
      const hits = [];
      for (const sh of document.styleSheets) {
        let rules; try { rules = sh.cssRules; } catch (_) { continue; }
        for (const r of rules || []) {
          if (!r.selectorText || !r.style) continue;
          if (!r.style.getPropertyValue('box-shadow')) continue;
          try { if (e.matches(r.selectorText)) hits.push(r.selectorText); } catch (_) {}
        }
      }
      out[k] = hits;
    }
    return out;
  });
  await page.evaluate(() => { closeModal(); if (typeof gmCloseAll === 'function') gmCloseAll(); });
  ok(winners.slot && winners.slot.length === 1 && winners.slot[0] === '.slotfr',
    'A9 장착 슬롯의 box-shadow 를 주는 규칙은 `.slotfr` **하나뿐**이다',
    (winners.slot || []).join(' | '));

  /* ── [B] 화소 — 세 자리의 찍힌 프레임 단면 ───────────────────────────────── */
  console.log('\n[B] 화소 — 찍힌 프레임 단면(검정 → 림 → 면)이 세 자리에서 같은가');
  const cut = {};
  for (const [sub, sel, tag] of [['sk', '#bSk .sk-slot[data-skslot]', '07 스킬 슬롯'],
                                 ['pet', '#bPet .sk-slot[data-ptslot]', '26 동료 슬롯'],
                                 ['cos', '#bCos .sk-slot[data-cosun]', '50 코스튬 슬롯']]) {
    await page.evaluate(s => gmHero(s), sub);
    await page.waitForTimeout(700);
    cut[sub] = await frameCut(page, sel, 24);
    if (cut[sub]) console.log('      ' + tag + ' ' + p2(cut[sub].w) + '×' + p2(cut[sub].h)
      + ' · r' + cut[sub].rad + ' · ' + cutStr(cut[sub]));
    else ok(false, 'B ' + tag + ' 표본을 못 찾았다', sel);
  }
  await page.evaluate(() => { closeModal(); if (typeof gmCloseAll === 'function') gmCloseAll(); });

  await page.evaluate(() => { closeModal(); S.avatars = { av0: 1 }; S.rank = 2; openPromo(); });
  await page.waitForTimeout(350);
  cut.rw = await frameCut(page, '#modal .pr179 .pr-rw-c', 24);
  ok(!!cut.rw, 'B1 179 미리보기 칸이 실재한다');
  if (cut.rw) console.log('      179 미리보기 ' + p2(cut.rw.w) + '×' + p2(cut.rw.h) + ' · r' + cut.rw.rad + ' · ' + cutStr(cut.rw));

  const pgSeed = await page.evaluate(() => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = 2; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true);
    return document.querySelectorAll('#mbox .pg-c').length;
  });
  await page.waitForTimeout(900);
  cut.pg = await frameCut(page, '#mbox .pg-c', 24);
  ok(!!cut.pg && pgSeed > 0, 'B2 182 획득 칸이 실재한다', pgSeed + '칸');
  if (cut.pg) console.log('      182 획득 칸 ' + p2(cut.pg.w) + '×' + p2(cut.pg.h) + ' · r' + cut.pg.rad + ' · ' + cutStr(cut.pg));

  const all = ['sk', 'pet', 'cos', 'rw', 'pg'].map(k => cut[k]).filter(Boolean);
  const REF = '5/7';
  const shapes = all.map(f => shapeOf(f).split('/').slice(0, 2).join('/'));
  ok(all.length === 5, 'B3 다섯 표본(07·26·50·179·182)을 모두 쟀다', all.length + '/5');
  ok(shapes.every(s => s === REF), 'B4 링 두께 수열이 다섯 자리 전부 «검정 5 → 림 7» 이다', shapes.join(' · '));
  ok(all.every(f => f.rad === 40), 'B5 radius 가 다섯 자리 전부 40 이다', all.map(f => f.rad).join(' · '));
  ok(all.every(f => f.bg === all[0].bg), 'B6 면색이 다섯 자리 전부 같다 (COS_FILL)', all.map(f => f.bg).join(' · '));
  ok(all.every(f => f.cut[0] && f.cut[0].col === '#000000'),
    'B7 가장 바깥 링이 다섯 자리 전부 검정이다', all.map(f => (f.cut[0] || {}).col).join(' · '));
  /* 림 «색» 은 갈려도 된다 — 그 갈림이 194 의 정보다. 다만 **179 와 182 는 같은 코스튬이면 같아야** 한다. */
  if (cut.rw && cut.pg) ok(cut.rw.cut[1] && cut.pg.cut[1] && cut.rw.cut[1].col === cut.pg.cut[1].col,
    'B8 같은 코스튬을 가리키는 179 미리보기와 182 칸의 림 색이 같다 (194 «틴트» 규약)',
    (cut.rw.cut[1] || {}).col + ' ↔ ' + (cut.pg.cut[1] || {}).col);

  /* ── [C] 토큰 — 두 팝업의 상자 톤 ────────────────────────────────────────── */
  console.log('\n[C] 토큰 — 승급 계열 상자 톤이 두 팝업에서 같은 값·같은 출처인가');
  ok(/:root\{--pr-bx:#F7ECDA;--pr-bd:#C8B091;--pr-h:#B4571E;--pr-r:40px\}/.test(SRC),
    'C1 상자 톤 토큰(`--pr-bx`·`--pr-bd`·`--pr-h`·`--pr-r`)이 한 곳에 있다');
  for (const [tag, sel] of [['179 `.pr-rw`', /\.mbody \.pr179 \.pr-rw\{([^}]*)\}/],
                            ['182 `.pr182`', /\.mbody \.pr182\{([^}]*)\}/]]) {
    const m = sel.exec(SRC);
    ok(!!m && /var\(--pr-bx\)/.test(m[1]) && /var\(--pr-bd\)/.test(m[1]) && /var\(--pr-r\)/.test(m[1]),
      'C2 ' + tag + ' 가 면·테두리·radius 를 토큰에서 읽는다 (리터럴 0건)',
      m ? m[1].replace(/\s+/g, ' ').slice(0, 80) : '규칙 없음');
  }
  ok(/\.mbody \.pr179 \.pr-rw>h3\{[^}]*color:var\(--pr-h\)/.test(SRC)
    && /\.mbody \.pr182>h3\{[^}]*color:var\(--pr-h\)/.test(SRC),
    'C3 두 팝업의 표제 색이 같은 토큰(`--pr-h`)이다');
  const tone = await page.evaluate(() => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = 2; openPromo();
    const a = document.querySelector('#modal .pr179 .pr-rw'), ah = a.querySelector('h3');
    const A = { bg: getComputedStyle(a).backgroundColor, bd: getComputedStyle(a).borderTopColor,
                r: getComputedStyle(a).borderTopLeftRadius, h: getComputedStyle(ah).color };
    closeModal();
    S.avatars = { av0: 1 }; S.rank = 2; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true);
    const b = document.querySelector('#mbox .pr182'), bh = b.querySelector('h3');
    const B = { bg: getComputedStyle(b).backgroundColor, bd: getComputedStyle(b).borderTopColor,
                r: getComputedStyle(b).borderTopLeftRadius, h: getComputedStyle(bh).color };
    closeModal();
    return { A, B };
  });
  for (const k of ['bg', 'bd', 'r', 'h'])
    ok(tone.A[k] === tone.B[k], 'C4 계산값이 두 팝업에서 같다 — ' + k, tone.A[k] + ' ↔ ' + tone.B[k]);

  /* 182 코스튬 이름표가 «흰 잉크 + 검정 외곽선» 인가(림과 같은 색이면 림 위에서 사라진다) */
  const lab = await page.evaluate(() => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = 2; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true);
    const u = document.querySelector('#mbox .pg-c > u');
    const cs = u ? getComputedStyle(u) : null;
    const r = cs ? { col: cs.color, sh: cs.textShadow, cls: u.className } : null;
    closeModal(); return r;
  });
  ok(lab && lab.col === 'rgb(255, 255, 255)', 'C5 182 이름표가 흰 잉크다 (종전 `var(--r)` = 림과 같은 색)', lab && lab.col);
  ok(lab && /rgb\(0, 0, 0\)/.test(lab.sh || ''), 'C6 그 이름표에 검정 외곽선이 **실제로 걸린다** (429 꼴 스코프 구멍 수리)',
    (lab && lab.sh || '(없음)').slice(0, 60));

  /* ── [D] 그림 — 한 픽셀도 안 줄었다 ──────────────────────────────────────── */
  console.log('\n[D] 그림 — 411/이 행이 정한 그림 크기가 안 줄었다');
  ok(/const SLOT_ART = \{ h: 80, w: 86 \}/.test(SRC), 'D1 411 `SLOT_ART` 80×86 불변');
  await seedSheets(page);
  await page.evaluate(() => gmHero('cos'));
  await page.waitForTimeout(700);
  const slotArt = await page.evaluate(() => {
    const s = document.querySelector('#bCos .sk-slot[data-cosun]');
    const si = s.querySelector('.sk-si'), cv = s.querySelector('canvas');
    const sb = s.getBoundingClientRect(), ib = si.getBoundingClientRect();
    return { sw: sb.width, sh: sb.height, ix: ib.x - sb.x, iy: ib.y - sb.y, iw: ib.width, ih: ib.height,
             cw: cv.width, ch: cv.height, sc: cv.getAttribute('data-cossc') };
  });
  ok(slotArt.sw === 115 && slotArt.sh === 115, 'D2 슬롯 상자 115×115 Δ0', slotArt.sw + '×' + slotArt.sh);
  ok(slotArt.iy === 12 && p2(slotArt.ih) === 91, 'D3 슬롯 «그림 자리» top 12 · h 91 Δ0 (411)', slotArt.iy + ' / ' + p2(slotArt.ih));
  ok(slotArt.cw === 86 && slotArt.ch === 80, 'D4 슬롯 캔버스가 SLOT_ART 그대로다', slotArt.cw + '×' + slotArt.ch);
  await page.evaluate(() => { closeModal(); if (typeof gmCloseAll === 'function') gmCloseAll(); });

  const art = await page.evaluate(() => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = 2; openPromo();
    const c = document.querySelector('#modal .pr179 .pr-rw-c'), cv = c.querySelector('canvas');
    const cb = c.getBoundingClientRect(), vb = cv.getBoundingClientRect();
    const cs = getComputedStyle(c);
    const a = { boxW: cb.width, boxH: cb.height, pad: parseFloat(cs.paddingTop),
                cvW: cv.width, cvH: cv.height, sc: +cv.getAttribute('data-cossc'),
                cssW: vb.width, cssH: vb.height, inX: vb.x - cb.x, inY: vb.y - cb.y };
    closeModal();
    S.avatars = { av0: 1 }; S.rank = 2; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true);
    const g = document.querySelector('#mbox .pg-c'), gv = g.querySelector('canvas');
    const gb = g.getBoundingClientRect(), gvb = gv.getBoundingClientRect();
    const b = { boxW: gb.width, boxH: gb.height, cssW: gvb.width, cssH: gvb.height,
                inX: gvb.x - gb.x, inY: gvb.y - gb.y };
    closeModal();
    return { a, b };
  });
  /* 잉크 = 기사 원본 42×45 × cossc. 179 는 3 배 ⇒ 126×135 — 수리 전과 **같은 값**이다. */
  const ink179 = { w: 42 * art.a.sc, h: 45 * art.a.sc };
  console.log('      179 칸 ' + art.a.boxW + '×' + art.a.boxH + ' (패딩 ' + art.a.pad + ') · 캔버스 '
    + art.a.cvW + '×' + art.a.cvH + ' @' + art.a.sc + ' ⇒ 잉크 ' + ink179.w + '×' + ink179.h
    + ' · 캔버스 자리 (' + p2(art.a.inX) + ',' + p2(art.a.inY) + ')');
  ok(ink179.w === 126 && ink179.h === 135, 'D5 179 미리보기 잉크 126×135 — 수리 전과 Δ0 (안 줄였다)',
    ink179.w + '×' + ink179.h);
  ok(art.a.pad === 12 && art.a.inX === 12 && art.a.boxW === 174 && art.a.boxH === 189,
    'D6 179 칸이 링이 먹은 만큼(12×2)만 넓어졌다 — 174×189 · 패딩 12',
    art.a.boxW + '×' + art.a.boxH + ' pad ' + art.a.pad);
  ok(art.a.cssW + 2 * art.a.pad === art.a.boxW && art.a.cssH + 2 * art.a.pad === art.a.boxH,
    'D7 캔버스가 링 안쪽에 정확히 들어간다 (넘침 0)',
    art.a.cssW + '×' + art.a.cssH + ' in ' + art.a.boxW + '×' + art.a.boxH);
  console.log('      182 칸 ' + art.b.boxW + '×' + art.b.boxH + ' · 캔버스 css ' + art.b.cssW + '×' + art.b.cssH
    + ' @(' + p2(art.b.inX) + ',' + p2(art.b.inY) + ')');
  ok(art.b.cssW === 84 && art.b.cssH === 84, 'D8 182 칸 캔버스 84×84 — 수리 전과 Δ0 (안 줄였다)',
    art.b.cssW + '×' + art.b.cssH);
  ok(art.b.boxW === 108 && art.b.boxH === 118, 'D9 182 칸이 폭만 링만큼 넓어졌다 — 108×118 (행 pitch Δ0)',
    art.b.boxW + '×' + art.b.boxH);
  ok(art.b.inX >= 12 && art.b.inY >= 12 && art.b.inX + art.b.cssW <= art.b.boxW - 12
     && art.b.inY + art.b.cssH <= art.b.boxH - 12,
    'D10 182 캔버스가 링 안쪽(12px)에 든다',
    '(' + p2(art.b.inX) + ',' + p2(art.b.inY) + ') ' + art.b.cssW + '×' + art.b.cssH);

  /* ── [E] 연출 ────────────────────────────────────────────────────────────── */
  console.log('\n[E] 연출 — promoCosFx 70ms 스태거 · 앞 8칸 파티클 · FXMAX 드롭 0건');
  ok(/setTimeout\([^)]*\), 70 \* i\)/.test(SRC.replace(/\s+/g, ' ')) || /70 \* i/.test(SRC),
    'E1 스태거 상수 70ms 불변');
  ok(/if\(i < 8\) fxUpOk\(el, el\)/.test(SRC), 'E2 앞 8칸만 파티클 규칙 불변');
  const best = await page.evaluate(() => {
    let bi = 1, bn = 0;
    for (let ri = 1; ri < RANKS.length; ri++) {
      const n = (typeof PROMO_COS !== 'undefined' && PROMO_COS[ri] ? PROMO_COS[ri].length : 0);
      if (n > bn) { bn = n; bi = ri; }
    }
    return { bi, bn };
  });
  const fx = await page.evaluate(async (ri) => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = ri - 1; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true);
    const cards = [].slice.call(document.querySelectorAll('#mbox .pg-c'));
    let hit = 0, parts = 0;
    for (let t = 0; t < 40; t++) {
      await new Promise(r => setTimeout(r, 40));
      hit = Math.max(hit, cards.filter(c => c.classList.contains('fx-hit') || c.classList.contains('fx-flash')).length);
      parts = Math.max(parts, document.querySelectorAll('#fxl > *').length);
    }
    const boxEl = document.querySelector('#modal .mbox'), gridEl = document.querySelector('#mbox .pr182');
    const b = boxEl.getBoundingClientRect(), g = gridEl.getBoundingClientRect();
    const rows = new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))).size;
    const painted = cards.filter(c => {
      const cv = c.querySelector('canvas'); if (!cv) return false;
      try { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true; } catch (e) {}
      return false;
    }).length;
    const out = { n: cards.length, hit, parts, painted, rows,
                  inside: g.left >= b.left - 1 && g.right <= b.right + 1 && g.bottom <= b.bottom + 1,
                  over: Math.max(0, g.bottom - b.bottom), fxmax: FXMAX };
    closeModal(); return out;
  }, best.bi);
  console.log('      계급 ' + best.bi + ' — 칸 ' + fx.n + ' (' + fx.rows + '행) · fx ' + fx.hit
    + ' · 파티클 최대 ' + fx.parts + '/' + fx.fxmax);
  ok(fx.n === best.bn, 'E3 가장 많은 칸을 주는 계급에서 칸 수가 맞다', fx.n + '/' + best.bn);
  ok(fx.painted === fx.n, 'E4 칸 스프라이트가 전부 칠해진다', fx.painted + '/' + fx.n);
  ok(fx.hit > 0, 'E5 연출이 칸에 실제로 붙는다', fx.hit + '칸');
  ok(fx.parts > 0 && fx.parts <= fx.fxmax, 'E6 파티클이 생기고 FXMAX 를 안 넘는다 (드롭 0건)', fx.parts + '/' + fx.fxmax);
  ok(fx.inside, 'E7 격자가 팝업 상자 안에 든다 — 칸이 108 로 넓어져도 넘치지 않는다',
    fx.over ? '넘침 ' + p2(fx.over) : '넘침 0');

  /* ── [F] 불변 ────────────────────────────────────────────────────────────── */
  console.log('\n[F] 불변 — 515·320·179 를 되돌리지 않았다');
  ok(/\.mbody \.pr179 \.pr-cond\{text-align:center/.test(SRC), 'F1 515 `.pr-cond{text-align:center}` 불변');
  const inv = await page.evaluate(() => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = 2; openPromo();
    const cond = document.querySelector('#modal .pr179 .pr-cond');
    const txt = cond.textContent.replace(/\s+/g, ' ').trim();
    const mb = document.querySelector('#modal .mbody');
    const mr = mb.getBoundingClientRect();
    const kids = [...mb.querySelectorAll('.pr179>p, .pr179>.pr-cond, .pr179>.pr-rw')].map(e => e.getBoundingClientRect());
    let ov = 0, out = 0;
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].top < mr.top - .5 || kids[i].bottom > mr.bottom + .5 || kids[i].left < mr.left - .5 || kids[i].right > mr.right + .5) out++;
      for (let j = i + 1; j < kids.length; j++) if (kids[i].bottom > kids[j].top + .5 && kids[j].bottom > kids[i].top + .5) ov++;
    }
    const c = mb.querySelector('.pr-rw-c'), t = mb.querySelector('.pr-rw-t');
    const inner = c.getBoundingClientRect().right <= t.getBoundingClientRect().left + .5;
    const align = getComputedStyle(cond).textAlign;
    closeModal();
    return { txt, ov, out, inner, align };
  });
  ok(inv.align === 'center', 'F2 계산값도 center 다 (515)', inv.align);
  ok(/^권장 스테이지 \d/.test(inv.txt), 'F3 320 «권장 스테이지» 한 줄 불변', inv.txt);
  ok(inv.ov === 0 && inv.out === 0, 'F4 179 본문 블록 겹침·잘림 0건 (칸이 174 로 넓어져도)', 'ov ' + inv.ov + ' / out ' + inv.out);
  ok(inv.inner, 'F5 미리보기 칸과 보상 글자가 안 겹친다');

  /* ── [R] 되돌림 시험 ─────────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 공용 프레임을 뗀 사본에서 [B] 가 실제로 빨개진다');
  await page.addStyleTag({ content:
    '.mbody .pr179 .pr-rw-c,.mbody .pr182 .pg-c{box-shadow:none!important;'
    + 'border-radius:24px!important;background:#0e1428!important}' });
  await page.evaluate(() => { closeModal(); S.avatars = { av0: 1 }; S.rank = 2; openPromo(); });
  await page.waitForTimeout(350);
  const rRw = await frameCut(page, '#modal .pr179 .pr-rw-c', 24);
  await page.evaluate(() => {
    closeModal(); S.avatars = { av0: 1 }; S.rank = 2; markDirty();
    promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true);
  });
  await page.waitForTimeout(900);
  const rPg = await frameCut(page, '#mbox .pg-c', 24);
  ok(rRw && shapeOf(rRw).split('/').slice(0, 2).join('/') !== REF,
    'R1 사본에서 179 의 링 수열이 «5/7» 이 아니게 된다 — B4 는 헛초록이 아니다', rRw && cutStr(rRw));
  ok(rPg && shapeOf(rPg).split('/').slice(0, 2).join('/') !== REF,
    'R2 사본에서 182 의 링 수열이 «5/7» 이 아니게 된다', rPg && cutStr(rPg));
  ok(rRw && rRw.rad !== 40 && rPg && rPg.rad !== 40, 'R3 사본에서 radius 도 40 이 아니게 된다 — B5 도 헛초록이 아니다',
    (rRw && rRw.rad) + ' · ' + (rPg && rPg.rad));
  ok(rRw && rRw.bg !== cut.sk.bg, 'R4 사본에서 면색이 슬롯과 갈린다 — B6 도 헛초록이 아니다',
    (rRw && rRw.bg) + ' ↔ ' + cut.sk.bg);

  ok(errs.length === 0, 'Z1 콘솔 에러 0건', errs.slice(0, 3).join(' / '));
  await browser.close();
  console.log('\nVERIFY582  ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
