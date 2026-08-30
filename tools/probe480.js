/* 작업 480 재현 프로브 — «10 상점 이용권 탭 «광고 제거» 카드의 ▶(플레이) 아이콘이 안 보인다»
 *
 *   node tools/probe480.js
 *
 * 주인 보고(2026-08-30, 스크린샷): «광고 제거 부분에 저 플레이 부분이 너무 안보임. 그거 해결하기»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify480.js`) **무엇이 어떻게 어긋났는가**
 * 를 눈으로 보는 자리다. 338·341·350 규칙대로 등재문의 처방을 따르기 **전에** 재현했고,
 * 등재문의 색 가설이 여기서 **틀린 것으로 판명**됐다(결함 자체는 등재문대로 실재한다).
 *
 * ⚑ 재현 결과(수리 전):
 *   · 배너 칸 ▶ — 찍힌 잉크가 **`#E8ECF5`**(카드 본문색, 거의 흰색)이고 배경은 크림 `#FDE7CF` 다.
 *     대비비 **1.01:1**. 등재문은 «연주황 위 연주황(밝은 주황 삼각형)» 이라고 적었는데 **색이 틀렸다** —
 *     주황이 아니라 «흰색 위 크림» 이었다. 결론(«대비가 거의 0 · 형태를 알아볼 수 없다»)은 같다.
 *   · 오른쪽 일러스트 자리 ▶ — 같은 `#E8ECF5` 가 파랑 카드(`#57BBEB` 계열) 위에 얹혀 **1.83:1**
 *     (WCAG 비텍스트 최소 3:1 미달). **같은 글리프 · 같은 뿌리**라 한 규칙으로 같이 고친다.
 *   · 뿌리는 «색을 잘못 골랐다» 가 아니라 **«이 글리프만 색 이모지가 아니다»** 다 —
 *     ▶(U+25B6)는 VS16 없이 쓰면 흑백 «텍스트» 글리프라 `color` 를 물려받는데, 형제 카드의
 *     🎟·⏳ 는 색 이모지라 제 색으로 그려진다. 그래서 세 카드 중 이 카드만 아트가 사라졌다.
 *
 * 수리 뒤에도 이 파일이 살아 있어야 하므로 **소스 사본**(두 규칙을 수리 전으로 되돌린 index.html
 * 임시 복사본)과 **현재 파일**을 둘 다 띄워 나란히 잰다 — 원본은 한 글자도 안 건드린다(350 처방).
 *
 * ⚠ 함수 rect 가 아니라 **찍힌 픽셀**을 읽는다(350 교훈) — 이 결함은 «어디에 있나» 가 아니라
 *   «무슨 색으로 찍혔나» 라서 getComputedStyle 로는 «흐리다» 를 못 잰다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const SHOTS = path.resolve(__dirname, '../docs/shots');

/* 수리 전 ↔ 수리 후 — 사본을 만들 때 되돌릴 두 자리 */
const NEW_BAN = "line-height:68px;text-align:center;color:#fff;-webkit-text-stroke:6px #000;\n    paint-order:stroke fill}";
const OLD_BAN = "line-height:68px;text-align:center}";
const NEW_ART = ".pvc.ban1>.art>em{font-size:180px;line-height:239px;color:#fff;\n    -webkit-text-stroke:12px #000;paint-order:stroke fill}";
const OLD_ART = ".pvc.ban1>.art>em{font-size:180px;line-height:239px}";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* WCAG 상대 휘도·대비비 */
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

async function measure(page, url, tag) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(900);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); } catch (e) { return { __err: String(e && e.message || e) }; }
  };
  await ev(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(1000);
  /* LESSONS 28-③ · 51-③ — 전투 캔버스·유휴 루프·등장 애니메이션이 걸린 채로 재면 다른 것을 잰다 */
  await ev(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });
  await page.waitForTimeout(200);

  const rects = await ev(() => {
    const R = (sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { sel, x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        color: cs.color, stroke: cs.webkitTextStrokeWidth, fs: cs.fontSize, txt: e.textContent };
    };
    return { ban: R('.pvc.ban1>.ban>em'), art: R('.pvc.ban1>.art>em') };
  });
  if (rects.__err) { console.log('  rect 실패: ' + rects.__err); fail++; return { errs }; }

  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  /* ⚠ 상자 안에서 «가장 흔한 색 = 배경» 으로 잡으면 안 된다 — 일러스트 상자(390×239)에는
     ② 가치 뱃지(#F43171)가 겹쳐 들어와 **글리프가 아닌 남의 색**이 실루엣으로 뽑힌다(1회차 오측).
     그래서 «▶ 를 숨긴 한 장» 을 더 찍어 **두 장의 차이**만 잉크로 센다 — 남의 픽셀은 두 장이 같다. */
  const shot = path.join(SHOTS, 'probe480-' + tag + '.png');
  await page.screenshot({ path: shot });
  await ev(() => document.querySelectorAll('.pvc.ban1>.ban>em,.pvc.ban1>.art>em')
    .forEach((e) => { e.style.visibility = 'hidden'; }));
  await page.waitForTimeout(80);
  const shotB = path.join(SHOTS, 'probe480-' + tag + '-off.png');
  await page.screenshot({ path: shotB });
  await ev(() => document.querySelectorAll('.pvc.ban1>.ban>em,.pvc.ban1>.art>em')
    .forEach((e) => { e.style.visibility = ''; }));

  const b64 = fs.readFileSync(shot).toString('base64');
  const b64b = fs.readFileSync(shotB).toString('base64');
  const px = await ev(([dOn, dOff, boxes]) => new Promise((res, rej) => {
    const load = (d) => new Promise((r2, j2) => {
      const im = new Image(); im.onload = () => r2(im); im.onerror = () => j2(new Error('이미지 로드 실패'));
      im.src = 'data:image/png;base64,' + d;
    });
    Promise.all([load(dOn), load(dOff)]).then(([a, b]) => {
      const mk = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g; };
      const ga = mk(a), gb = mk(b);
      const out = {};
      for (const k in boxes) {
        const bx = boxes[k]; if (!bx) { out[k] = null; continue; }
        const x0 = Math.round(bx.x), y0 = Math.round(bx.y), w = Math.round(bx.w), h = Math.round(bx.h);
        const da = ga.getImageData(x0, y0, w, h).data, db = gb.getImageData(x0, y0, w, h).data;
        const inkH = {}, bgH = {};
        let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, n = 0;
        const hex = (d, i) => '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const dist = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
          if (dist > 12) {
            n++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
            const ha = hex(da, i), hb = hex(db, i);
            inkH[ha] = (inkH[ha] || 0) + 1; bgH[hb] = (bgH[hb] || 0) + 1;
          }
        }
        out[k] = { box: { x: x0, y: y0, w, h }, n,
          ink: n ? { n, w: maxx - minx + 1, h: maxy - miny + 1, x: x0 + minx, y: y0 + miny } : null,
          inkTop: Object.entries(inkH).sort((p, q) => q[1] - p[1]).slice(0, 6),
          bgTop: Object.entries(bgH).sort((p, q) => q[1] - p[1]).slice(0, 3) };
      }
      res(out);
    }).catch((e) => rej(e));
  }), [b64, b64b, { ban: rects.ban, art: rects.art }]);
  if (px.__err) { console.log('  픽셀 읽기 실패: ' + px.__err); fail++; return { errs }; }

  /* 실루엣을 만드는 색 = «▶ 가 찍은» 잉크 중 그 밑 배경과 대비가 가장 큰 색(잉크 면적 3% 이상만) */
  const out = {};
  for (const k of ['ban', 'art']) {
    const q = px[k]; if (!q) { out[k] = null; continue; }
    const bg = q.bgTop.length ? q.bgTop[0][0] : '#000000';
    const bgr = hex2rgb(bg);
    let best = null;
    q.inkTop.forEach(([hx, n]) => {
      if (n < q.n * 0.03) return;
      const r = ratio(hex2rgb(hx), bgr);
      if (!best || r > best.ratio) best = { hex: hx, n, ratio: +r.toFixed(2) };
    });
    /* 면적이 가장 큰 잉크색 = «칠해진 몸통» · best = «가장 잘 보이는 가장자리»(최선의 경우) */
    const dom = q.inkTop.length
      ? { hex: q.inkTop[0][0], n: q.inkTop[0][1], ratio: +ratio(hex2rgb(q.inkTop[0][0]), bgr).toFixed(2) } : null;
    out[k] = { bg, ink: q.ink, silhouette: best, dominant: dom, rect: rects[k] };
    console.log('  [' + tag + '] ' + k + ' — 잉크 밑 배경 ' + bg + ' · 몸통색 '
      + (dom ? dom.hex + ' (' + dom.n + 'px · 대비 ' + dom.ratio + ':1)' : '없음') + ' · 최대대비색 '
      + (best ? best.hex + ' (' + best.n + 'px)' : '없음')
      + ' · 대비 ' + (best ? best.ratio : '–') + ':1 · 잉크 bbox '
      + (q.ink ? q.ink.w + '×' + q.ink.h : '0×0')
      + ' · 상자 ' + q.box.w + '×' + q.box.h);
  }
  console.log('  캡처 docs/shots/probe480-' + tag + '.png · 콘솔 에러 ' + errs.length + '건');
  return { ...out, errs };
}

(async () => {
  const cur = fs.readFileSync(SRC, 'utf8');
  if (cur.indexOf(NEW_BAN) < 0 || cur.indexOf(NEW_ART) < 0) {
    console.log('probe480 — index.html 에서 480 의 두 자리를 못 찾았다(규칙이 바뀌었다). 사본 재현 불가.');
    process.exit(1);
  }
  const tmp = path.resolve(__dirname, '../index.probe480-before.html');
  fs.writeFileSync(tmp, cur.replace(NEW_BAN, OLD_BAN).replace(NEW_ART, OLD_ART));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  console.log('=== §1 수리 전(사본) — 주인 보고를 재현하는가 ===');
  const p1 = await ctx.newPage();
  const before = await measure(p1, 'file://' + tmp, 'before');

  console.log('\n=== §2 수리 후(현재 파일) ===');
  const p2 = await ctx.newPage();
  const after = await measure(p2, 'file://' + SRC, 'after');

  console.log('\n=== §3 판정 ===');
  if (before.ban && after.ban) {
    ok(before.ban.silhouette && before.ban.silhouette.ratio < 1.2,
      '[재현] 수리 전 배너 ▶ 는 배경과 대비 1.2:1 미만 = 안 보인다 (실측 '
      + (before.ban.silhouette ? before.ban.silhouette.ratio : '–') + ':1)');
    ok(before.ban.dominant && before.ban.dominant.hex === '#E8ECF5',
      '[정정] 잉크 몸통은 «연주황»(등재문)이 아니라 카드 본문색 #E8ECF5 다 (실측 '
      + (before.ban.dominant ? before.ban.dominant.hex : '–') + ')');
    ok(before.ban.bg === '#FDE7CF', '[정정] 배경도 «노랑» 이 아니라 크림 칸 #FDE7CF 다 (실측 ' + before.ban.bg + ')');
    ok(after.ban.silhouette && after.ban.silhouette.ratio >= 4.5,
      '[수리] 수리 후 배너 ▶ 대비 ≥ 4.5:1 (실측 ' + (after.ban.silhouette ? after.ban.silhouette.ratio : '–') + ':1)');
    ok(Math.abs(after.ban.rect.x - before.ban.rect.x) < 0.5 && Math.abs(after.ban.rect.y - before.ban.rect.y) < 0.5
      && Math.abs(after.ban.rect.w - before.ban.rect.w) < 0.5 && Math.abs(after.ban.rect.h - before.ban.rect.h) < 0.5,
      '[Δ0] 레이아웃 상자는 안 움직였다 (' + before.ban.rect.w + '×' + before.ban.rect.h + ' → '
      + after.ban.rect.w + '×' + after.ban.rect.h + ')');
    ok(after.ban.ink && after.ban.ink.w <= after.ban.rect.w && after.ban.ink.h <= after.ban.rect.h,
      '[안 넘침] 굵어진 잉크가 아이콘 칸(' + after.ban.rect.w + '×' + after.ban.rect.h + ') 안에 들어간다 (잉크 '
      + (after.ban.ink ? after.ban.ink.w + '×' + after.ban.ink.h : '–') + ')');
  } else { ok(false, '[재현] 배너 ▶ 측정 실패'); }

  if (before.art && after.art) {
    ok(before.art.silhouette && before.art.silhouette.ratio < 3,
      '[재현] 수리 전 오른쪽 일러스트 ▶ 도 3:1 미만 = 같은 뿌리 (실측 '
      + (before.art.silhouette ? before.art.silhouette.ratio : '–') + ':1)');
    ok(after.art.silhouette && after.art.silhouette.ratio >= 4.5,
      '[수리] 수리 후 일러스트 ▶ 대비 ≥ 4.5:1 (실측 ' + (after.art.silhouette ? after.art.silhouette.ratio : '–') + ':1)');
  } else { ok(false, '[재현] 일러스트 ▶ 측정 실패'); }

  ok((before.errs || []).length === 0 && (after.errs || []).length === 0,
    '콘솔 에러 0건 (전 ' + (before.errs || []).length + ' · 후 ' + (after.errs || []).length + ')');

  try { fs.unlinkSync(tmp); } catch (e) {}
  await browser.close();
  console.log('\nPROBE480 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
