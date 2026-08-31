#!/usr/bin/env node
/* 작업 581 — 「«받기·강화» 주 행동 버튼이 화면마다 다른 부품이다」 **재현**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다. 338·341·412 는 여기서 등재문 가설이 기각됐다.)
 *
 *   node tools/probe581.js
 *
 * 등재문은 «두 자리가 `.ifbtn` 이 아니다» 라고만 적었다. 그 말이 참인지, 그리고 **부품을 갈아 끼우면
 * 무엇이 따라 움직이는지**(= 기하를 얼마나 되돌려 놔야 하는지)를 층별로 먼저 잰다:
 *   [A] 토큰   — 두 자리가 `--gb-*` 5종을 갖고 있는가(= 부품인가). 기준은 `#qAll`(주인이 지목한 «일괄 받기»).
 *   [B] 기하   — 부품을 얹으면 달라지는 상자 값(테두리·패딩·box-sizing)의 **수리 전** 값.
 *   [C] 라벨   — 잉크 bbox(찍힌 픽셀). 부품 교체 뒤 이 값으로 되돌려 놔야 한다.
 *   [D] 레드닷 — 중심·코너 안쪽 여백. 516(도감 `--dot-in-x:16`)·325(축복 안쪽 12)의 결과와 어긋나면 안 된다.
 *   [E] 전수   — `.ifbtn` 을 쓰는 자리가 지금 몇 곳이고 토큰이 갈린 곳이 있는가.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : 'FAIL  ') + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
/* ⚠ `--gb-bw`(검정 테두리 두께)는 **호스트가 주는 값**이다 — 부품 주석 2374 가 «6 또는 7 —
   버튼마다 다르다» 라고 못박아 뒀다. 팔레트 4종만 «같은 부품인가» 의 축이고, bw 를 섞어 세면
   `#qAll`(7) ↔ `.clb-btn`(6)이 영원히 «다른 부품» 으로 읽힌다. */
const PAL = ['--gb-hi', '--gb-lt', '--gb-mid', '--gb-dk'];
const TOK = ['--gb-bw'].concat(PAL);

/* 찍힌 픽셀에서 «흰 잉크» bbox 를 잰다 — 캡처를 data URL 로 페이지에 되돌려 읽는다(350 처방). */
async function inkBox(page, shot, rect, thr) {
  return page.evaluate(([b64, r, thr]) => new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = r.w; cv.height = r.h;
      const cx = cv.getContext('2d');
      cx.drawImage(im, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      const d = cx.getImageData(0, 0, r.w, r.h).data;
      let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, n = 0;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        const i = (y * r.w + x) * 4;
        if (d[i] >= thr && d[i + 1] >= thr && d[i + 2] >= thr) {
          n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
      res(n ? { x1, y1, x2, y2, w: x2 - x1 + 1, h: y2 - y1 + 1, n } : null);
    };
    im.src = 'data:image/png;base64,' + b64;
  }), [shot.toString('base64'), rect, thr]);
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderColl21 === 'function' && typeof renderBless === 'function');
  await page.waitForTimeout(600);

  /* ── [A] 토큰 층 — 두 자리가 부품인가 ───────────────────────────────────── */
  console.log('\n[A] 토큰 — `--gb-*` 5종을 갖고 있는가 (기준 `#qAll`)');
  const tk = await page.evaluate(TOK => {
    /* ⚠ `.ifbtn:disabled` 는 회색 팔레트를 덮어쓴다 — 비교하는 것은 **활성 팔레트**이므로
       읽는 동안만 `disabled` 를 떼고 원래대로 되돌린다(상태를 바꾸지 않는다). */
    const get = el => { if (!el) return null;
      const wasD = el.disabled === true; if (wasD) el.disabled = false;
      const s = getComputedStyle(el); const o = {}; TOK.forEach(t => o[t] = s.getPropertyValue(t).trim());
      if (wasD) el.disabled = true; return o; };
    /* 22 퀘스트를 열어 #qAll 을 만든다 */
    openQuest('daily');
    const q = get(document.getElementById('qAll'));
    closeModal && closeModal();
    /* 21 도감 */
    [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { S.own[it.id] = { l: 6, n: 0 }; });
    S.coll = {}; openColl21('weapon');
    const cAll = get(document.querySelector('#collAll'));
    const cBtn = get(document.querySelector('#collList .clb-btn'));
    document.getElementById('collw').classList.remove('on');
    /* 34 축복 — 전부 «받기» 상태(만료 시각을 비운다) */
    S.bless.exp = {};
    openBless();
    const tm = get(document.querySelector('.bls-c.off .tm'));
    return { q, cAll, cBtn, tm };
  }, TOK);
  const same = (a, b) => a && b && PAL.every(t => a[t] === b[t]);
  ok(!!tk.q, '[A1] `#qAll` 이 존재한다', tk.q ? TOK.map(t => t + '=' + tk.q[t]).join(' ') : '없음');
  ok(same(tk.q, tk.cAll), '[A2] 21 [일괄 강화] 토큰 == `#qAll`', tk.cAll ? '`--gb-mid`=' + tk.cAll['--gb-mid'] : '없음');
  /* 수리 전 실측(기록): 둘 다 `--gb-*` 가 **빈 문자열** = 부품이 아니었다.
     21 은 자기 그라디언트(#A9A9A9→#8A8A8A / `.rdy` 금색), 34 는 325 가 손으로 옮겨 적은 플랫 #4CBA2E. */
  ok(same(tk.q, tk.cBtn), '[A3] 21 세트별 [강화] 팔레트 == `#qAll` (수리 전: 토큰 없음)', tk.cBtn ? '`--gb-mid`="' + tk.cBtn['--gb-mid'] + '" `--gb-bw`=' + tk.cBtn['--gb-bw'] + '(호스트 몫)' : '없음');
  ok(same(tk.q, tk.tm), '[A4] 34 축복 «받기» 팔레트 == `#qAll` (수리 전: 토큰 없음)', tk.tm ? '`--gb-mid`="' + tk.tm['--gb-mid'] + '" `--gb-bw`=' + tk.tm['--gb-bw'] + '(호스트 몫)' : '없음');

  /* ── [B] 기하 층 — 부품을 얹으면 움직이는 값들 ──────────────────────────── */
  console.log('\n[B] 기하 — 상자 값(테두리·패딩·box-sizing·배경). bbox 는 수리 전과 같아야 한다');
  const geo = await page.evaluate(() => {
    /* 두 자리는 서로 다른 팝업에 있고 [A] 가 닫아 두었다 — 재는 동안만 둘 다 켠다(상자 값은 표시 상태에서만 나온다) */
    openQuest('daily');
    [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { S.own[it.id] = { l: 6, n: 0 }; });
    S.coll = {}; openColl21('weapon');
    const g = el => { if (!el) return null; const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), bw: s.borderTopWidth, box: s.boxSizing,
        pad: s.paddingTop + '/' + s.paddingRight + '/' + s.paddingBottom + '/' + s.paddingLeft,
        disp: s.display, lh: s.lineHeight, bg: s.backgroundImage === 'none' ? s.backgroundColor : 'gradient', sh: s.boxShadow.slice(0, 60) }; };
    return { cBtn: g(document.querySelector('#collList .clb-btn')), tm: g(document.querySelector('.bls-c.off .tm')), qAll: g(document.getElementById('qAll')) };
  });
  for (const k of ['qAll', 'cBtn', 'tm']) {
    const v = geo[k];
    ok(!!v, '[B:' + k + '] ' + (v ? v.w + '×' + v.h + ' border=' + v.bw + ' box=' + v.box + ' pad=' + v.pad + ' display=' + v.disp + ' lh=' + v.lh + ' bg=' + v.bg : '없음'));
  }

  /* ── [C] 라벨 층 — 찍힌 잉크 bbox (부품 교체 뒤 되돌려 놓을 기준값) ──────── */
  console.log('\n[C] 라벨 잉크 — 찍힌 픽셀 bbox (교체 뒤 이 값으로 되돌린다)');
  {
    /* 21 도감 */
    await page.evaluate(() => {
      [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { S.own[it.id] = { l: 6, n: 0 }; });
      S.coll = {}; document.getElementById('blsw').classList.remove('on'); openColl21('weapon');
    });
    /* ⚠ 60 쥬시 등장(`jz-st` 스태거 + 카드 scale)이 끝나기 전에 재면 버튼째 1.00x~1.01x 로 흔들려
       잉크 bbox 가 회차마다 1~2px 씩 다르게 나온다(1회차에 같은 CSS 로 38.5·39.5 가 번갈아 나왔다). */
    await page.waitForTimeout(1500);
    const r1 = await page.evaluate(() => { const b = document.querySelector('#collList .clb-btn.rdy') || document.querySelector('#collList .clb-btn'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
    const s1 = await page.screenshot();
    const i1 = await inkBox(page, s1, r1, 235);
    ok(!!i1, '[C1] 21 [강화] 라벨 잉크 (버튼 상자 기준)', i1 ? i1.w + '×' + i1.h + ' @(' + i1.x1 + ',' + i1.y1 + ') 중심(' + ((i1.x1 + i1.x2) / 2).toFixed(1) + ',' + ((i1.y1 + i1.y2) / 2).toFixed(1) + ') 버튼 ' + r1.w + '×' + r1.h : '흰 잉크 0px');

    /* 34 축복 */
    await page.evaluate(() => {
      document.getElementById('collw').classList.remove('on');
      S.bless.exp = {}; openBless();
    });
    await page.waitForTimeout(1500);
    const r2 = await page.evaluate(() => { const t = document.querySelector('.bls-c.off .tm'); const r = t.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
    const s2 = await page.screenshot();
    const i2 = await inkBox(page, s2, r2, 235);
    ok(!!i2, '[C2] 34 «받기» 라벨 잉크 (알약 상자 기준)', i2 ? i2.w + '×' + i2.h + ' @(' + i2.x1 + ',' + i2.y1 + ') 중심(' + ((i2.x1 + i2.x2) / 2).toFixed(1) + ',' + ((i2.y1 + i2.y2) / 2).toFixed(1) + ') 알약 ' + r2.w + '×' + r2.h : '흰 잉크 0px');
  }

  /* ── [D] 레드닷 층 — 516·325 의 결과와 어긋나면 안 된다 ─────────────────── */
  console.log('\n[D] 레드닷 — 중심·코너 안쪽 여백 (516 도감 `--dot-in-x:16` · 325 축복 안쪽 12)');
  {
    await page.evaluate(() => {
      [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { S.own[it.id] = { l: 6, n: 0 }; });
      S.coll = {}; openColl21('weapon'); S.bless.exp = {}; openBless();
    });
    /* ⚠ 60 쥬시 `jzDotIn` 이 닷을 scale 0 → 1.3 → 1 로 올린다 — 봉우리·시작에서 재면 Ø 가 헛값이다 */
    await page.waitForTimeout(1200);
    const d = await page.evaluate(() => {
      /* ⚠ `getBoundingClientRect` 로 재지 마라 — 60 쥬시 `jzDotIn` 이 닷을 scale 0 → 1.3 → 1 로
         올리고 맥박(1.14)이 계속 돈다. 재는 순간에 따라 Ø 가 27 ~ 35 로 흔들려 «자» 가 안 된다.
         닷 자리는 `right/top` **선언값**으로 결정되므로 그것과 호스트 테두리로 역산한다:
           코너 안쪽 = borderWidth + right + Ø/2   (`--dot-in-x` 규약값과 같아야 한다) */
      const one = (host, dot) => { if (!host || !dot) return null;
        const H = host.getBoundingClientRect(), hs = getComputedStyle(host), ds = getComputedStyle(dot);
        const bw = parseFloat(hs.borderRightWidth), bt = parseFloat(hs.borderTopWidth);
        const R = parseFloat(ds.right), T = parseFloat(ds.top), W = parseFloat(ds.width), Hh = parseFloat(ds.height);
        return { inX: +(bw + R + W / 2).toFixed(2), inY: +(bt + T + Hh / 2).toFixed(2), d: +W.toFixed(2),
          bw: +bw.toFixed(2), disp: ds.display, hw: +H.width.toFixed(2), hh: +H.height.toFixed(2) }; };
      const out = {};
      const tm = document.querySelector('.bls-c.off .tm');
      out.bless = one(tm, tm && tm.querySelector('.updot'));
      const cb = document.querySelector('#collList .clb-btn.rdy');
      out.coll = one(cb, cb && cb.querySelector('.updot'));
      const ca = document.getElementById('collAll');
      out.collAll = one(ca, ca && ca.querySelector('.updot'));
      return out;
    });
    for (const k of ['coll', 'collAll', 'bless']) {
      const v = d[k];
      const want = k === 'coll' ? 16 : 11;      /* 516 예외 ⑤ — 도감 세트별 [강화]만 가로 16 */
      ok(!!v && v.disp === 'block' && Math.abs(v.inX - want) <= 1 && Math.abs(v.inY - 11) <= 1,
        '[D:' + k + '] 코너 안쪽 (' + (v ? v.inX : '?') + ', ' + (v ? v.inY : '?') + ') == (' + want + ', 11)±1',
        v ? 'Ø' + v.d + ' 호스트 테두리 ' + v.bw + ' · ' + v.hw + '×' + v.hh + ' display=' + v.disp : '없음');
    }
  }

  /* ── [E] 전수 — `.ifbtn` 자리가 몇 곳이고 토큰이 갈린 곳이 있는가 ────────── */
  console.log('\n[E] 전수 — `.ifbtn` 을 쓰는 자리(열려 있는 것만) 토큰 일치');
  {
    const all = await page.evaluate(TOK => {
      const out = [];
      document.querySelectorAll('.ifbtn').forEach(el => {
        /* ⚠ `disabled` 는 **속성**이지 클래스가 아니다 — 회색 팔레트(`.ifbtn:disabled`)를 «자기 색» 으로
           세면 헛빨강이 난다. 활성 팔레트로 통일돼 있는지가 축이므로 읽는 동안만 떼고 되돌린다. */
        const wasD = el.disabled === true; if (wasD) el.disabled = false;
        const s = getComputedStyle(el), o = { cls: el.className, id: el.id || '', dis: wasD };
        TOK.forEach(t => o[t] = s.getPropertyValue(t).trim());
        if (wasD) el.disabled = true;
        out.push(o);
      });
      return out;
    }, TOK);
    ok(all.length > 0, '[E1] 열린 화면에서 `.ifbtn` 노드 ' + all.length + '개', all.map(a => (a.id || a.cls.split(' ')[0])).join(', '));
    const bad = all.filter(a => a['--gb-mid'] !== '#4CBA2E' && !/\bred\b/.test(a.cls));
    ok(bad.length === 0, '[E2] 자기 색을 따로 칠한 `.ifbtn` 0곳', bad.length ? bad.map(a => (a.id || a.cls) + '=' + a['--gb-mid']).join(', ') : '없음');
  }

  ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\nPROBE581 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
