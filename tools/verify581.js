#!/usr/bin/env node
/* 작업 581 — 「«받기·강화» 주 행동 버튼을 공용 `.ifbtn` 로 통일」 게이트
 *
 *   node tools/verify581.js
 *
 * 축은 등재문 처방이 정한 여섯이다:
 *   [A] 팔레트  — 두 신규 자리의 `--gb-hi/lt/mid/dk` 가 기준 `#qAll` 과 **완전 동일**
 *   [B] 베벨    — **찍힌 픽셀**로 단면(위 밝은 림 · 좌우 밝은 림 · 바닥 밝은 림 + 어두운 띠)이 `#qAll` 과 같은 구조
 *   [C] 라벨    — 흰 채움 + 검정 아웃라인 + `paint-order:stroke fill`, 그리고 **잉크 기하가 수리 전과 Δ0**
 *   [D] 레드닷  — 코너 안쪽이 471 규약 11px(도감 세트별 [강화]만 516 예외 ⑤ 로 가로 16)
 *   [E] 전수    — `.ifbtn` 을 쓰는 자리 중 **자기 색을 따로 칠한 곳이 0**
 *   [R] 되돌림  — 부품을 떼거나 옛 페인트를 되살린 사본에서 위 축들이 실제로 빨개진다
 *
 * ⚠ `--gb-bw`(검정 테두리 두께)는 비교 축이 **아니다** — 부품 주석 2374 가 «6 또는 7 — 버튼마다
 *    다르다» 라고 못박은 호스트 몫이다(`#qAll` 7 · `.clb-btn`/`.tm` 6). 섞어 세면 헛빨강이 난다.
 * ⚠ 닷은 `getBoundingClientRect` 로 재지 마라 — `jzDotIn` 맥박이 Ø 를 27~35 로 흔든다.
 *    `right/top` **선언값** + 호스트 테두리로 «코너 안쪽 = bw + right + Ø/2» 를 역산한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const PAL = ['--gb-hi', '--gb-lt', '--gb-mid', '--gb-dk'];
const HI = [201, 240, 126], MID = [76, 186, 46], DK = [47, 143, 30];   /* #C9F07E · #4CBA2E · #2F8F1E */
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : 'FAIL  ') + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (p, c, t) => p && Math.abs(p[0] - c[0]) <= t && Math.abs(p[1] - c[1]) <= t && Math.abs(p[2] - c[2]) <= t;

/* 캡처를 data URL 로 페이지에 되돌려 «찍힌 픽셀» 을 읽는다(350 처방 — rect 만으로는 못 본다). */
async function readPixels(page, shot, jobs) {
  return page.evaluate(([b64, jobs]) => new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
      const out = {};
      for (const j of jobs) {
        const d = cx.getImageData(j.x, j.y, j.w, j.h).data;
        const px = [];
        for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
        out[j.k] = px;
      }
      res(out);
    };
    im.src = 'data:image/png;base64,' + b64;
  }), [shot.toString('base64'), jobs]);
}

/* 흰 잉크 bbox — 라벨 기하를 «수리 전과 같은가» 로 재는 자 */
async function inkBox(page, shot, r) {
  return page.evaluate(([b64, r]) => new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas'); cv.width = r.w; cv.height = r.h;
      const cx = cv.getContext('2d');
      cx.drawImage(im, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      const d = cx.getImageData(0, 0, r.w, r.h).data;
      let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        const i = (y * r.w + x) * 4;
        if (d[i] >= 235 && d[i + 1] >= 235 && d[i + 2] >= 235) {
          if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
      res(x2 < 0 ? null : { w: x2 - x1 + 1, h: y2 - y1 + 1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 });
    };
    im.src = 'data:image/png;base64,' + b64;
  }), [shot.toString('base64'), r]);
}

/* 세 자리를 한 화면에 동시에 띄울 수는 없다(서로 다른 팝업) — 자리마다 열고 재는 헬퍼 */
const OPEN = {
  /* ⚠ `#qAll` 은 «받을 게 하나도 없으면» `disabled` 라 `.ifbtn:disabled` 회색 팔레트를 쓰고
     라벨도 #DFDFDF 이며 `.updot` 노드 자체가 없다 — 그 상태를 기준으로 삼으면 이 자가
     «회색끼리 같은가» 를 묻게 된다. 일일 퀘스트 하나를 **진짜로** 달성 상태로 만든다. */
  qAll:   () => { S.daily.q = {}; S.daily.qb = {}; S.summons = 9999; openQuest('daily'); },
  cBtn:   () => { [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { S.own[it.id] = { l: 6, n: 0 }; }); S.coll = {}; openColl21('weapon'); },
  tm:     () => { S.bless.exp = {}; openBless(); },
};
const SEL = { qAll: '#qAll', cBtn: '#collList .clb-btn.rdy', tm: '.bls-c.off .tm' };
const CLOSE = () => { closeModal(); ['collw', 'blsw'].forEach(i => document.getElementById(i).classList.remove('on')); };

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

  /* 자리 하나를 열고 «상자 + 찍힌 단면 + 잉크» 를 한 번에 재는 공통 경로 */
  async function measure(key) {
    await page.evaluate(k => { window.__c(); window.__o[k](); }, key);
    /* ⚠ 60 쥬시 등장이 끝나기 전에 재면 버튼째 1.00~1.01x 로 흔들려 잉크가 1~2px 씩 튄다 */
    await page.waitForTimeout(1500);
    const box = await page.evaluate(k => {
      const el = document.querySelector(window.__s[k]); if (!el) return null;
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      const lab = el.querySelector('b:not(.ck),i');
      const ls = lab ? getComputedStyle(lab) : null;
      const dot = el.querySelector('.updot');
      const ds = dot ? getComputedStyle(dot) : null;
      const pal = {}; ['--gb-hi', '--gb-lt', '--gb-mid', '--gb-dk', '--gb-bw'].forEach(t => pal[t] = s.getPropertyValue(t).trim());
      return {
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        bw: parseFloat(s.borderTopWidth), pal,
        label: ls ? { color: ls.color, stroke: ls.webkitTextStrokeWidth, sc: ls.webkitTextStrokeColor, po: ls.paintOrder } : null,
        dot: ds ? { inX: +(parseFloat(s.borderRightWidth) + parseFloat(ds.right) + parseFloat(ds.width) / 2).toFixed(2),
                    inY: +(parseFloat(s.borderTopWidth) + parseFloat(ds.top) + parseFloat(ds.height) / 2).toFixed(2),
                    disp: ds.display } : null,
      };
    }, key);
    if (!box) return null;
    const shot = await page.screenshot();
    const cols = await readPixels(page, shot, [
      /* 세로 단면 — 버튼 가로 중심의 1px 기둥 */
      { k: 'col', x: box.x + Math.round(box.w / 2), y: box.y, w: 1, h: box.h },
      /* 가로 단면 — 버튼 세로 중심의 1px 행 */
      { k: 'row', x: box.x, y: box.y + Math.round(box.h / 2), w: box.w, h: 1 },
    ]);
    const ink = await inkBox(page, shot, { x: box.x, y: box.y, w: box.w, h: box.h });
    /* ⚠ 키를 `v`/`h` 로 두면 `box.h`(높이)를 덮어써 바닥 밴드 인덱스가 통째로 undefined 가 된다 */
    return Object.assign(box, { col: cols.col, row: cols.row, ink });
  }

  await page.evaluate(([o, s]) => {
    window.__o = {}; Object.keys(o).forEach(k => window.__o[k] = new Function(o[k]));
    window.__s = s;
    window.__c = new Function("closeModal(); ['collw','blsw'].forEach(i => document.getElementById(i).classList.remove('on'));");
  }, [Object.fromEntries(Object.entries(OPEN).map(([k, f]) => [k, f.toString().replace(/^\(\)\s*=>\s*\{/, '').replace(/\}$/, '')])), SEL]);

  const M = {};
  for (const k of ['qAll', 'cBtn', 'tm']) M[k] = await measure(k);

  /* ── [A] 팔레트 ─────────────────────────────────────────────────────────── */
  console.log('\n[A] 팔레트 — 신규 두 자리가 기준 `#qAll` 과 완전 동일 (`--gb-bw` 는 호스트 몫이라 제외)');
  ok(!!M.qAll, '[A0] 기준 `#qAll` 을 잡았다', M.qAll ? PAL.map(t => M.qAll.pal[t]).join(' ') : '없음');
  for (const [k, nm] of [['cBtn', '21 도감 세트별 [강화]'], ['tm', '34 축복 «받기»']]) {
    const m = M[k];
    ok(!!m && PAL.every(t => m.pal[t] === M.qAll.pal[t]),
      '[A:' + k + '] ' + nm + ' 팔레트 == `#qAll`',
      m ? PAL.map(t => m.pal[t]).join(' ') + ' · `--gb-bw`=' + m.pal['--gb-bw'] : '없음');
  }

  /* ── [B] 베벨 단면 (찍힌 픽셀) ──────────────────────────────────────────── */
  console.log('\n[B] 베벨 단면 — 찍힌 픽셀로 «위 밝은 림 · 좌우 밝은 림 · 바닥 밝은 림 + 어두운 띠»');
  for (const [k, nm] of [['qAll', '기준 `#qAll`'], ['cBtn', '21 [강화]'], ['tm', '34 «받기»']]) {
    const m = M[k]; if (!m) { ok(false, '[B:' + k + '] ' + nm, '못 잼'); continue; }
    const bw = Math.round(m.bw);
    /* 위 — 검정 테두리 바로 아래가 `--gb-hi` 밴드(두께 = 테두리 두께) */
    const top = m.col[bw + Math.max(1, Math.floor(bw / 2))];
    /* 바닥 — 아래에서 6px 어두운 띠(--gb-dk), 그 위 6px 밝은 림(--gb-hi).
       스톱이 `calc(100% - 12px)`·`calc(100% - 6px)` 라 **버튼 높이와 무관하게** 같은 자리다. */
    const dk = m.col[m.h - bw - 3], hi2 = m.col[m.h - bw - 9];
    /* 좌우 — 세로 중심 행에서 검정 테두리 바로 안쪽(inset 7px 밝은 림) */
    const sideL = m.row[bw + 3], sideR = m.row[m.w - bw - 4];
    const okTop = near(top, HI, 12), okDk = near(dk, DK, 12), okHi2 = near(hi2, HI, 12);
    const okSide = near(sideL, HI, 12) && near(sideR, HI, 12);
    ok(okTop && okDk && okHi2 && okSide, '[B:' + k + '] ' + nm + ' 4변 베벨',
      '위 ' + top + ' · 바닥어두움 ' + dk + ' · 바닥림 ' + hi2 + ' · 좌 ' + sideL + ' 우 ' + sideR);
  }

  /* ── [C] 라벨 ───────────────────────────────────────────────────────────── */
  console.log('\n[C] 라벨 — 흰 채움 + 검정 아웃라인 + paint-order, 잉크 기하는 수리 전과 Δ0');
  const WANT = { cBtn: { w: 64, h: 32, cx: 118.5, cy: 38.5 }, tm: { w: 95, h: 30, cx: 102.0, cy: 47.5 } };
  for (const [k, nm] of [['qAll', '기준 `#qAll`'], ['cBtn', '21 [강화]'], ['tm', '34 «받기»']]) {
    const m = M[k]; if (!m || !m.label) { ok(false, '[C:' + k + '] ' + nm, '라벨 없음'); continue; }
    const rgb = (m.label.color.match(/\d+/g) || []).map(Number);
    const sw = parseFloat(m.label.stroke);
    const sc = (m.label.sc.match(/[\d.]+/g) || []).map(Number);
    const white = rgb[0] >= 250 && rgb[1] >= 250 && rgb[2] >= 250;
    const dark = sc.length >= 3 && sc[0] <= 40 && sc[1] <= 40 && sc[2] <= 40;
    ok(white && sw > 0 && dark && /stroke/.test(m.label.po),
      '[C:' + k + '] ' + nm + ' 흰 채움 + 검정 아웃라인',
      'color=' + m.label.color + ' stroke=' + m.label.stroke + ' ' + m.label.sc + ' paint-order=' + m.label.po);
  }
  for (const [k, nm] of [['cBtn', '21 [강화]'], ['tm', '34 «받기»']]) {
    const m = M[k], w = WANT[k];
    const good = m && m.ink && m.ink.w === w.w && m.ink.h === w.h
      && Math.abs(m.ink.cx - w.cx) <= 0.5 && Math.abs(m.ink.cy - w.cy) <= 0.5;
    ok(good, '[C:ink:' + k + '] ' + nm + ' 잉크 == 수리 전 ' + w.w + '×' + w.h + ' 중심(' + w.cx + ',' + w.cy + ')',
      m && m.ink ? m.ink.w + '×' + m.ink.h + ' 중심(' + m.ink.cx + ',' + m.ink.cy + ')' : '흰 잉크 0px');
  }

  /* ── [D] 레드닷 ─────────────────────────────────────────────────────────── */
  console.log('\n[D] 레드닷 — 코너 안쪽 471 규약 11px (21 세트별 [강화]만 516 예외 ⑤ 로 가로 16)');
  for (const [k, nm, wx] of [['qAll', '기준 `#qAll`', 11], ['cBtn', '21 [강화]', 16], ['tm', '34 «받기»', 11]]) {
    const m = M[k], d = m && m.dot;
    ok(!!d && d.disp === 'block' && Math.abs(d.inX - wx) <= 1 && Math.abs(d.inY - 11) <= 1,
      '[D:' + k + '] ' + nm + ' 코너 안쪽 == (' + wx + ', 11)±1',
      d ? '(' + d.inX + ', ' + d.inY + ') display=' + d.disp : '닷 없음');
  }

  /* ── [E] 전수 — 자기 색을 따로 칠한 `.ifbtn` 0곳 ────────────────────────── */
  console.log('\n[E] 전수 — `.ifbtn` 을 쓰는 모든 자리가 같은 팔레트를 본다');
  {
    const scan = await page.evaluate(PAL => {
      /* 세 팝업을 다 열어 «지금 존재하는» `.ifbtn` 을 한 번에 본다 */
      openQuest('daily');
      [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { S.own[it.id] = { l: 6, n: 0 }; });
      S.coll = {}; openColl21('weapon');
      S.bless.exp = {}; openBless();
      const out = [];
      document.querySelectorAll('.ifbtn').forEach(el => {
        /* ⚠ `disabled` 는 속성이지 클래스가 아니다 — 회색 팔레트(`.ifbtn:disabled`)를 «자기 색» 으로
           세면 헛빨강이다. 읽는 동안만 떼고 되돌린다(상태를 바꾸지 않는다). */
        const wasD = el.disabled === true; if (wasD) el.disabled = false;
        const s = getComputedStyle(el), o = { n: el.id || el.className.split(' ')[0], red: /\bred\b/.test(el.className) };
        PAL.forEach(t => o[t] = s.getPropertyValue(t).trim());
        if (wasD) el.disabled = true;
        out.push(o);
      });
      return out;
    }, PAL);
    ok(scan.length >= 10, '[E1] `.ifbtn` 자리 ' + scan.length + '곳 (신규 2곳 포함)',
      [...new Set(scan.map(a => a.n))].join(', '));
    const bad = scan.filter(a => !a.red && a['--gb-mid'] !== '#4CBA2E');
    ok(bad.length === 0, '[E2] 자기 색을 따로 칠한 곳 0', bad.length ? bad.map(a => a.n + '=' + a['--gb-mid']).join(', ') : '없음');
    const nb = scan.filter(a => a.n === 'clb-btn').length, nt = scan.filter(a => a.n === 'tm').length;
    ok(nb >= 1 && nt >= 1, '[E3] 신규 두 자리가 실제로 `.ifbtn` 으로 잡힌다', 'clb-btn ' + nb + '개 · tm ' + nt + '개');
  }

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 부품을 떼거나 옛 페인트를 되살리면 위 축들이 실제로 빨개진다');
  {
    /* R1 — 21: `ifbtn` 클래스를 뗀다 ⇒ 팔레트가 사라진다 */
    const r1 = await page.evaluate(PAL => {
      const b = document.querySelector('#collList .clb-btn.rdy'); if (!b) return null;
      b.classList.remove('ifbtn');
      const v = getComputedStyle(b).getPropertyValue('--gb-mid').trim();
      b.classList.add('ifbtn');
      return { off: v, on: getComputedStyle(b).getPropertyValue('--gb-mid').trim() };
    }, PAL);
    ok(r1 && r1.off !== '#4CBA2E' && r1.on === '#4CBA2E',
      '[R1] 21 에서 `ifbtn` 을 떼면 팔레트가 사라진다', r1 ? '뗀 뒤 "' + r1.off + '" → 되돌리면 "' + r1.on + '"' : '못 잼');

    /* R2 — 34: 국면 토글이 실제로 부품을 갈아 끼운다(«받기» 일 때만 `.ifbtn`) */
    const r2 = await page.evaluate(() => {
      const k = BLESS[0].k;
      S.bless.exp = {}; renderBless();
      const offHas = document.getElementById('blsC_' + k).querySelector('.tm').classList.contains('ifbtn');
      S.bless.exp[k] = Date.now() + 60000; renderBless();
      const onHas = document.getElementById('blsC_' + k).querySelector('.tm').classList.contains('ifbtn');
      const onBg = getComputedStyle(document.getElementById('blsC_' + k).querySelector('.tm')).backgroundColor;
      S.bless.exp = {}; renderBless();
      return { offHas, onHas, onBg };
    });
    ok(r2 && r2.offHas === true && r2.onHas === false,
      '[R2] 34 는 «받기» 국면에만 부품이다', r2 ? '받기 ' + r2.offHas + ' · 시간남음 ' + r2.onHas + '(면 ' + r2.onBg + ')' : '못 잼');
    ok(r2 && /146,\s*106,\s*36/.test(r2.onBg.replace(/\s/g, '').replace(/,/g, ', ')) || (r2 && r2.onBg === 'rgb(146, 106, 36)'),
      '[R2b] 상태 칩 국면은 34 실측 갈색 `#926A24` 그대로', r2 ? r2.onBg : '못 잼');

    /* R3 — 옛 페인트를 되살린 사본에서 [B] 베벨 축이 빨개진다 */
    await page.addStyleTag({ content: '.bls-c.off .tm{background:#4CBA2E !important;box-shadow:inset 0 0 0 3px #2F8F1E !important;border-color:transparent !important}' });
    await page.waitForTimeout(300);
    const m2 = await measure('tm');
    const bw2 = Math.round(m2.bw);
    const stillBevel = near(m2.col[bw2 + 2], HI, 12) && near(m2.col[m2.h - bw2 - 3], DK, 12);
    ok(!stillBevel, '[R3] 325 의 옛 «플랫 채움» 을 되살리면 [B] 베벨 단면이 빨개진다',
      '위 ' + m2.col[bw2 + 2] + ' · 바닥 ' + m2.col[m2.h - bw2 - 3] + ' (베벨 없음 = 통과)');
  }

  ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\nVERIFY581 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
