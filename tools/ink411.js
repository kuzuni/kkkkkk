/* 작업 411 분포 실측 — «그림 자리» 상수를 정하기 전에 **세 출처의 전 품목**이 어떤 종횡·어떤
   잉크비를 갖는지 센다. 슬롯에 걸리는 것은 «지금 장착된 3~8칸» 뿐이지만 상수는 전 품목을 견뎌야 한다.

   재는 것 셋:
     · 스킬 이모지 24종 — `.sk-si` 와 같은 폰트로 다시 그려 잉크 bbox / font-size 비(= 잉크비 r)
     · 펫 스프라이트 36종 — 아틀라스 프레임 안의 **실제 알파 bbox**(프레임 rect 가 아니다)
     · 코스튬 기사 — idle0 프레임의 알파 bbox (배율은 정수 sc 라 값이 양자화된다)

   실행: node tools/ink411.js
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0
    && typeof ATLAS !== 'undefined' && ATLAS.knight && ATLAS.knight.image);
  await p.waitForTimeout(1800);

  const out = await p.evaluate(() => {
    const N = 400;
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const TH = (window.__th411 != null) ? window.__th411 : 8;
    const bbox = (ctx2, w, h) => {
      const d = ctx2.getImageData(0, 0, w, h).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
        if (d[(y * w + x) * 4 + 3] > TH) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };

    /* ① 스킬 이모지 — `.sk-si` computed font 를 그대로 쓴다 */
    const host = document.createElement('b');
    host.className = 'sk-si';
    host.style.cssText = 'position:fixed;left:-9999px;top:0';
    (document.getElementById('bSk') || document.body).appendChild(host);
    const cs = getComputedStyle(host);
    const FS = parseFloat(cs.fontSize);
    const font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const emo = [];
    (typeof SKILLS !== 'undefined' ? SKILLS : []).forEach(s => {
      g.clearRect(0, 0, N, N);
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
      g.fillText(s.ic, N / 2, N * 0.7);
      const b = bbox(g, N, N);
      if (b) emo.push({ id: s.id, ic: s.ic, w: b.w, h: b.h, a: +(b.w / b.h).toFixed(3),
                        rh: +(b.h / FS).toFixed(4), rw: +(b.w / FS).toFixed(4) });
    });
    host.remove();

    /* ② 펫 스프라이트 — 아틀라스 프레임의 실제 알파 bbox(원본 픽셀 단위) */
    const pets = [];
    (typeof PETS !== 'undefined' ? PETS : []).forEach(t => {
      const k = t.sp, A = ATLAS[k], sp = PET_SP[k];
      if (!A || !A.image || !sp) { pets.push({ id: t.id, sp: k, miss: 1 }); return; }
      const list = A.a && A.a[sp.anim];
      const fr = list && A.f[list[0]];
      if (!fr) { pets.push({ id: t.id, sp: k, miss: 1 }); return; }
      const c2 = document.createElement('canvas'); c2.width = fr[2]; c2.height = fr[3];
      const g2 = c2.getContext('2d', { willReadFrequently: true });
      g2.imageSmoothingEnabled = false;
      g2.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
      const b = bbox(g2, fr[2], fr[3]);
      pets.push({ id: t.id, sp: k, frW: fr[2], frH: fr[3],
                  w: b ? b.w : 0, h: b ? b.h : 0, a: b ? +(b.w / b.h).toFixed(3) : 0,
                  /* 프레임 rect 대비 잉크가 차지하는 비 — contain 이 프레임 기준이라 이만큼 손해 본다 */
                  fw: b ? +(b.w / fr[2]).toFixed(3) : 0, fh: b ? +(b.h / fr[3]).toFixed(3) : 0 });
    });

    /* ③ 코스튬 기사 idle0 */
    const A = ATLAS.knight, f0 = A.f[A.a.idle[0]];
    const c3 = document.createElement('canvas'); c3.width = f0[2]; c3.height = f0[3];
    const g3 = c3.getContext('2d', { willReadFrequently: true });
    g3.imageSmoothingEnabled = false;
    g3.drawImage(A.image, f0[0], f0[1], f0[2], f0[3], 0, 0, f0[2], f0[3]);
    const kb = bbox(g3, f0[2], f0[3]);

    return { FS, emo, pets, knight: { frW: f0[2], frH: f0[3], ink: kb } };
  });

  const L = [];
  const hs = out.emo.map(e => e.h), rs = out.emo.map(e => e.rh), as = out.emo.map(e => e.a);
  L.push('== ① 스킬 이모지 ' + out.emo.length + '종 @ font-size ' + out.FS + ' ==');
  L.push('  잉크 h ' + Math.min(...hs) + '~' + Math.max(...hs)
    + ' (max/min ' + (Math.max(...hs) / Math.min(...hs)).toFixed(3) + ')');
  L.push('  잉크비 h/fs ' + Math.min(...rs).toFixed(4) + '~' + Math.max(...rs).toFixed(4)
    + ' · 중앙 ' + ((Math.min(...rs) + Math.max(...rs)) / 2).toFixed(4));
  L.push('  종횡 w/h ' + Math.min(...as).toFixed(3) + '~' + Math.max(...as).toFixed(3));
  out.emo.filter(e => e.a > 1.05 || e.rh > 1.14 || e.rh < 1.02)
    .forEach(e => L.push('    ⚠ ' + e.ic + ' ' + e.id + ' ' + e.w + 'x' + e.h + ' a=' + e.a + ' rh=' + e.rh));

  const ok = out.pets.filter(t => !t.miss);
  const pa = ok.map(t => t.a);
  L.push('== ② 펫 스프라이트 ' + ok.length + '종(누락 ' + (out.pets.length - ok.length) + ') ==');
  L.push('  프레임 rect · 잉크 · 종횡:');
  const seen = new Set();
  ok.forEach(t => { if (seen.has(t.sp)) return; seen.add(t.sp);
    L.push('    ' + t.sp.padEnd(10) + ' fr ' + t.frW + 'x' + t.frH
      + ' · 잉크 ' + t.w + 'x' + t.h + ' · a ' + t.a + ' · 프레임채움 ' + t.fw + '/' + t.fh); });
  L.push('  종횡 w/h ' + Math.min(...pa).toFixed(3) + '~' + Math.max(...pa).toFixed(3));

  const kk = out.knight;
  L.push('== ③ 코스튬 기사 idle0 ==');
  L.push('  fr ' + kk.frW + 'x' + kk.frH + ' · 잉크 ' + kk.ink.w + 'x' + kk.ink.h
    + ' · a ' + (kk.ink.w / kk.ink.h).toFixed(3)
    + ' · 정수배율 잉크높이 ' + [1, 2, 3].map(s => kk.ink.h * s).join(' / '));
  console.log(L.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
