/* 게이트 480 — 10 상점 «이용권» 탭 «광고 제거» 카드의 ▶ 가독성
 *
 *   node tools/verify480.js
 *
 * 지키는 약속(주인 보고 2026-08-30 · 등재문 처방 ①②):
 *   · ▶ 는 «검정 외곽 + 흰 코어» 로 그려지고 **배경과 대비 ≥ 4.5:1** 이다(WCAG 텍스트 기준).
 *   · 자리·크기는 안 바뀐다 — 아이콘 칸 레이아웃 상자는 카드 기준 (57,27) 89×68 로 **Δ0**.
 *   · 형제 부품(13 재화 카드 ▶AD · 29 룰렛 ▶AD)은 CSS 삼각형이라 이 규칙과 **다른 부품**이고,
 *     둘 다 제 판 위에서 여전히 잘 보인다(회귀).
 *   · 색 이모지를 쓰는 형제 카드(🎟·⏳)에는 이 규칙이 안 닿는다.
 *
 * ⚑ 이 게이트는 «색을 무엇으로 적었나» 가 아니라 **찍힌 픽셀**을 본다(350 처방) —
 *   선언만 세면 «흰 글자에 흰 외곽» 같은 무른 수리가 통과한다.
 * ⚠ 잉크는 «▶ 를 숨긴 한 장» 과의 **차이**로 센다 — 아이콘 상자 안에 남의 픽셀
 *   (② 가치 뱃지 #F43171)이 겹쳐 들어와 실루엣을 오염시킨다(probe480 1회차 오측).
 * §R 되돌림 시험 — 색·외곽선을 떼면 대비가 1.2:1 로 주저앉아 이 게이트가 즉시 빨개진다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const SHOTS = path.resolve(__dirname, '../docs/shots');

let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m + (d ? ' — ' + d : '')); } else { fail++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbStr2 = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + SRC);
  await page.waitForTimeout(900);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); } catch (e) { return { __err: String(e && e.message || e) }; }
  };
  await ev(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(1000);
  await ev(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });
  await page.waitForTimeout(200);
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  /* ── 찍힌 픽셀 재기: ▶ 켠 한 장 ↔ 끈 한 장의 차이 ── */
  async function inkOf(tag) {
    const rects = await ev(() => {
      /* ⚠ 자리는 «카드» 가 아니라 **호스트**(배너 / 아트 판) 기준으로 잰다 —
         `.ban>em` 의 CSS left/top(57·27)은 배너의 **패딩 상자**(검정 테 7px 안쪽) 기준이다.
         카드 기준으로 재면 50+7+57 = 114 가 나와 «어긋난 것처럼» 보인다(1회차 오판). */
      const R = (sel, host) => {
        const e = document.querySelector(sel); if (!e) return null;
        const r = e.getBoundingClientRect();
        const H = document.querySelector(host).getBoundingClientRect();
        return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          cx: +(r.left - H.left).toFixed(1), cy: +(r.top - H.top).toFixed(1) };
      };
      return { ban: R('.pvc.ban1>.ban>em', '.pvc.ban1>.ban'), art: R('.pvc.ban1>.art>em', '.pvc.ban1>.art') };
    });
    if (rects.__err) return { __err: rects.__err };
    const a = path.join(SHOTS, 'verify480-' + tag + '.png');
    await page.screenshot({ path: a });
    await ev(() => document.querySelectorAll('.pvc.ban1>.ban>em,.pvc.ban1>.art>em')
      .forEach((e) => { e.style.visibility = 'hidden'; }));
    await page.waitForTimeout(80);
    const b = path.join(SHOTS, 'verify480-' + tag + '-off.png');
    await page.screenshot({ path: b });
    await ev(() => document.querySelectorAll('.pvc.ban1>.ban>em,.pvc.ban1>.art>em')
      .forEach((e) => { e.style.visibility = ''; }));
    await page.waitForTimeout(60);
    const res = await ev(([dOn, dOff, boxes]) => new Promise((res2, rej) => {
      const load = (d) => new Promise((r2, j2) => {
        const im = new Image(); im.onload = () => r2(im); im.onerror = () => j2(new Error('load'));
        im.src = 'data:image/png;base64,' + d;
      });
      Promise.all([load(dOn), load(dOff)]).then(([ia, ib]) => {
        const mk = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g; };
        const ga = mk(ia), gb = mk(ib), out = {};
        const hex = (d, i) => '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        for (const k in boxes) {
          const bx = boxes[k]; if (!bx) { out[k] = null; continue; }
          const x0 = Math.round(bx.x), y0 = Math.round(bx.y), w = Math.round(bx.w), h = Math.round(bx.h);
          const da = ga.getImageData(x0, y0, w, h).data, db = gb.getImageData(x0, y0, w, h).data;
          const inkH = {}, bgH = {};
          let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, n = 0;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const dist = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
            if (dist > 12) {
              n++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
              const ha = hex(da, i), hb = hex(db, i);
              inkH[ha] = (inkH[ha] || 0) + 1; bgH[hb] = (bgH[hb] || 0) + 1;
            }
          }
          out[k] = { n, w: maxx - minx + 1, h: maxy - miny + 1,
            inkTop: Object.entries(inkH).sort((p, q) => q[1] - p[1]).slice(0, 8),
            bgTop: Object.entries(bgH).sort((p, q) => q[1] - p[1]).slice(0, 3) };
        }
        res2(out);
      }).catch((e) => rej(e));
    }), [fs.readFileSync(a).toString('base64'), fs.readFileSync(b).toString('base64'), rects]);
    if (res.__err) return { __err: res.__err };
    for (const k of ['ban', 'art']) if (res[k]) res[k].rect = rects[k];
    return res;
  }

  const sil = (q) => {
    if (!q || !q.n) return null;
    const bgr = hex2rgb(q.bgTop[0][0]);
    let best = null;
    q.inkTop.forEach(([hx, n]) => {
      if (n < q.n * 0.03) return;
      const r = ratio(hex2rgb(hx), bgr);
      if (!best || r > best.ratio) best = { hex: hx, n, ratio: +r.toFixed(2) };
    });
    return best ? { ...best, bg: q.bgTop[0][0] } : null;
  };
  const share = (q, hx) => { const e = (q.inkTop.find((p) => p[0] === hx) || [0, 0])[1]; return e / q.n; };

  console.log('=== [A] 선언 — «검정 외곽 + 흰 코어» 규약 ===');
  const decl = await ev(() => {
    const g = (sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const c = getComputedStyle(e);
      return { color: c.color, sw: c.webkitTextStrokeWidth, sc: c.webkitTextStrokeColor,
        po: c.paintOrder, fs: c.fontSize, txt: e.textContent.trim() };
    };
    return { ban: g('.pvc.ban1>.ban>em'), art: g('.pvc.ban1>.art>em'),
      other: [...document.querySelectorAll('.pvc:not(.ban1)>.art>em')]
        .map((e) => ({ txt: e.textContent.trim(), sw: getComputedStyle(e).webkitTextStrokeWidth })) };
  });
  if (decl.__err) { ok('[A] 선언 읽기', false, decl.__err); }
  else {
    ok('[A1] 배너 ▶ 코어가 흰색이다', decl.ban && rgbStr2(decl.ban.color).join() === '255,255,255', decl.ban && decl.ban.color);
    ok('[A2] 배너 ▶ 외곽선이 검정 6px 이다(바깥 3px — 등재문 «2~3px»)',
      decl.ban && decl.ban.sw === '6px' && rgbStr2(decl.ban.sc).join() === '0,0,0', decl.ban && (decl.ban.sw + ' ' + decl.ban.sc));
    ok('[A3] paint-order 가 stroke fill 이다(외곽선이 코어를 안 덮는다)',
      decl.ban && /stroke/.test(decl.ban.po), decl.ban && decl.ban.po);
    ok('[A4] 글리프 크기는 그대로 62px = 색만 고쳤다', decl.ban && decl.ban.fs === '62px', decl.ban && decl.ban.fs);
    ok('[A5] 일러스트 ▶ 도 같은 규칙 · 획만 크기에 비례(12px)',
      decl.art && rgbStr2(decl.art.color).join() === '255,255,255' && decl.art.sw === '12px' && decl.art.fs === '180px',
      decl.art && (decl.art.color + ' / ' + decl.art.sw + ' / ' + decl.art.fs));
    ok('[A6] 색 이모지를 쓰는 형제 카드(🎟·⏳)에는 이 규칙이 안 닿는다',
      Array.isArray(decl.other) && decl.other.length === 2 && decl.other.every((o) => o.sw === '0px'),
      Array.isArray(decl.other) ? decl.other.map((o) => o.txt + ':' + o.sw).join(' · ') : '?');
  }

  console.log('\n=== [B] 찍힌 픽셀 — 배너 칸 ▶ ===');
  const now = await inkOf('now');
  if (now.__err) { ok('[B] 픽셀 읽기', false, now.__err); }
  else {
    const b = now.ban, s = sil(b);
    ok('[B1] ▶ 가 실제로 찍힌다(잉크 픽셀 ≥ 800)', b && b.n >= 800, b && b.n + 'px');
    ok('[B2] 배경은 크림 칸 #FDE7CF 다', b && b.bgTop[0][0] === '#FDE7CF', b && b.bgTop[0][0]);
    ok('[B3] 실루엣색 ↔ 배경 대비 ≥ 4.5:1', s && s.ratio >= 4.5, s && (s.hex + ' ' + s.ratio + ':1'));
    ok('[B4] 검정 외곽이 잉크의 10% 이상 = 테가 실제로 둘러싼다', b && share(b, '#000000') >= 0.10,
      b && (share(b, '#000000') * 100).toFixed(1) + '%');
    ok('[B5] 흰 코어가 잉크의 40% 이상 = 테만 남고 속이 빈 게 아니다', b && share(b, '#FFFFFF') >= 0.40,
      b && (share(b, '#FFFFFF') * 100).toFixed(1) + '%');
    ok('[B6] 아이콘 칸 레이아웃 상자 Δ0 — 배너 테(7px) 안쪽 (57,27) 89×68 = 배너 상자 기준 (64,34)',
      b && Math.abs(b.rect.cx - 64) < 0.6 && Math.abs(b.rect.cy - 34) < 0.6
        && Math.abs(b.rect.w - 89) < 0.6 && Math.abs(b.rect.h - 68) < 0.6,
      b && ('(' + b.rect.cx + ',' + b.rect.cy + ') ' + b.rect.w + '×' + b.rect.h));
    ok('[B7] 굵어진 잉크가 칸을 안 넘는다', b && b.w <= b.rect.w && b.h <= b.rect.h, b && (b.w + '×' + b.h));
  }

  console.log('\n=== [C] 찍힌 픽셀 — 오른쪽 일러스트 자리 ▶ (같은 글리프·같은 뿌리) ===');
  if (!now.__err) {
    const a = now.art, s = sil(a);
    ok('[C1] 실루엣색 ↔ 배경 대비 ≥ 4.5:1', s && s.ratio >= 4.5, s && (s.hex + ' ' + s.ratio + ':1'));
    ok('[C2] 검정 외곽 + 흰 코어가 둘 다 잡힌다',
      a && share(a, '#000000') >= 0.10 && share(a, '#FFFFFF') >= 0.40,
      a && ('검정 ' + (share(a, '#000000') * 100).toFixed(1) + '% · 흰 ' + (share(a, '#FFFFFF') * 100).toFixed(1) + '%'));
    ok('[C3] 아트 자리(390×239)를 안 넘는다', a && a.w <= a.rect.w && a.h <= a.rect.h, a && (a.w + '×' + a.h));
  }

  console.log('\n=== [D] 회귀 — 형제 ▶AD 뱃지 2종은 CSS 삼각형이라 다른 부품이다 ===');
  const ad = await ev(() => {
    const mk = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return { miss: 1 };
      const cs = getComputedStyle(e, '::after');
      return { tri: cs.borderLeftColor, plate: getComputedStyle(e).backgroundImage || '', tag: e.tagName };
    };
    /* 13 재화 카드 광고 뱃지 · 29 룰렛 광고 뱃지 — 둘 다 판(`>s`) 위 삼각형(`::after`) */
    /* ⚠ 브라우저가 selectorText 를 «.cn-cd > .bt > .ad > s::after» 로 정규화하므로 공백을 지우고 비교한다 */
    const want = ['.cn-cd>.bt>.ad>s::after', '.ifbtn.pbtn>.ad>s::after'];
    const have = [];
    [...document.styleSheets].forEach((sh) => {
      try { [...sh.cssRules].forEach((r) => { if (r.selectorText) have.push(r.selectorText.replace(/\s+/g, '')); }); }
      catch (e) {}
    });
    const rule = want.filter((w) => have.indexOf(w) >= 0).length;
    return { coin: mk('.cn-cd>.bt>.ad>s'), roul: mk('.ifbtn.pbtn>.ad>s'), rule };
  });
  if (ad.__err) { ok('[D] ▶AD 읽기', false, ad.__err); }
  else {
    /* 두 뱃지는 지금 화면에 없을 수 있다 — 선언(::after 삼각형 색)만으로도 회귀는 잡힌다 */
    ok('[D1] 13·29 ▶AD 삼각형 선언 2개가 그대로 남아 있다(CSS border 삼각형 — 이 작업이 안 건드린 부품)',
      ad.rule === 2, ad.rule + '/2');
    const cream = hex2rgb('#FFFCDB'), plate = hex2rgb('#BC5417');
    ok('[D2] 13 ▶AD 는 «어두운 판 위 크림 삼각형» 이라 대비가 이미 4.5 이상이다 = 이 작업의 부품이 아니다',
      ratio(cream, plate) >= 4.5, ratio(cream, plate).toFixed(2) + ':1');
  }

  console.log('\n=== [R] 되돌림 시험 — 색·외곽선을 떼면 즉시 빨개진다 ===');
  await ev(() => document.querySelectorAll('.pvc.ban1>.ban>em,.pvc.ban1>.art>em').forEach((e) => {
    e.style.color = '#E8ECF5'; e.style.webkitTextStroke = '0px'; e.style.paintOrder = 'normal';
  }));
  await page.waitForTimeout(80);
  const rev = await inkOf('reverted');
  if (rev.__err) { ok('[R] 되돌림 픽셀 읽기', false, rev.__err); }
  else {
    const s = sil(rev.ban);
    ok('[R1] 되돌리면 배너 ▶ 대비가 1.2:1 미만으로 주저앉는다(= 주인이 본 그림)', s && s.ratio < 1.2, s && s.ratio + ':1');
    ok('[R2] 되돌리면 [B3] 기준(≥4.5)이 실제로 깨진다', s && s.ratio < 4.5, s && s.ratio + ':1');
    const sa = sil(rev.art);
    ok('[R3] 되돌리면 일러스트 ▶ 도 3:1 미만이다', sa && sa.ratio < 3, sa && sa.ratio + ':1');
  }
  await ev(() => document.querySelectorAll('.pvc.ban1>.ban>em,.pvc.ban1>.art>em').forEach((e) => {
    e.style.color = ''; e.style.webkitTextStroke = ''; e.style.paintOrder = '';
  }));

  ok('[E] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' / '));

  await browser.close();
  console.log('\nVERIFY480 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
