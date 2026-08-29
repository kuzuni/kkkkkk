/* 작업 411 재현 — 07 스킬 · 26 펫 · 50 코스튬 «장착 슬롯» 아이콘의 **그려진 잉크** 를 잰다.
 *
 * 등재문의 53 / 59 / 126 은 **상자 값**이다(`.sk-si` 높이 · `PET_TH.slot.h` · 캔버스 height).
 * 338 규칙대로 처방 전에 «화면에 실제로 찍히는 그림» 을 먼저 재고, 그 값으로만 판단한다.
 *
 * 재는 법은 출처별로 다르되 **단위는 하나(슬롯 기준 CSS px)** 로 모은다:
 *   · 스킬  = 이모지  → `.sk-si` 의 computed font 를 그대로 옮긴 2D 컨텍스트에 다시 그려 알파 bbox
 *              (DOM 글리프의 알파는 직접 못 읽는다 — probe268 이 쓴 방법)
 *   · 펫    = 스프라이트 캔버스 → 캔버스 픽셀 알파 bbox × (rect.w / canvas.width)
 *   · 코스튬 = 기사 캔버스     → 같은 방법
 *
 * 출력: 시트별 잉크 w×h, 잉크 중심의 슬롯 중심 대비 오프셋, 세로 덩치 최대÷최소.
 * 실행: node tools/probe411.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/* 페이지 안에서 도는 잉크 측정기 — 슬롯 하나를 받아 «그려진 잉크» 를 슬롯 기준 좌표로 돌려준다 */
function inkOfSlotSrc() {
  window.__ink411 = function (slot) {
    const sb = slot.getBoundingClientRect();
    const host = slot.querySelector('.sk-si');
    if (!host) return null;
    const hb = host.getBoundingClientRect();
    const cv = host.querySelector('canvas');
    let ink = null, kind = '';

    if (cv) {
      kind = cv.className.indexOf('pt-cv') >= 0 ? 'sprite' : 'knight';
      const cb = cv.getBoundingClientRect();
      const g = cv.getContext('2d', { willReadFrequently: true });
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++)
        for (let x = 0; x < cv.width; x++)
          if (d[(y * cv.width + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
      if (x1 < 0) return { kind, empty: true };
      const sx = cb.width / cv.width, sy = cb.height / cv.height;
      ink = { x: cb.x + x0 * sx, y: cb.y + y0 * sy,
              w: (x1 - x0 + 1) * sx, h: (y1 - y0 + 1) * sy,
              cvW: cv.width, cvH: cv.height, cvBoxW: cb.width, cvBoxH: cb.height };
    } else {
      kind = 'emoji';
      /* 411 — 이모지는 이제 `.sk-si` 가 아니라 그 안의 `<i class="sa-e">` 가 크기를 갖는다
         (글자마다 다르다). 상자·폰트·변환이 전부 그 알맹이에 붙으므로 그것을 잰다. */
      const el = host.querySelector('i.sa-e') || host;
      const eb = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const txt = (el.textContent || '').trim();
      const N = 400, o = document.createElement('canvas');
      o.width = N; o.height = N;
      const g = o.getContext('2d', { willReadFrequently: true });
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      /* 화면 위 글리프의 알파벳 베이스라인 = 박스 상단 + (line-height + fontSize*.8 근사) 가 아니라,
         여기서는 **잉크 크기와 박스 안 상대 위치**만 필요하므로 캔버스 한복판에 그려 bbox 를 잰다.
         화면 좌표는 그 bbox 를 `text-align:center` + `line-height` 규칙으로 되돌려 계산한다. */
      g.fillStyle = '#000';
      g.fillText(txt, N / 2, N * 0.7);
      const d = g.getImageData(0, 0, N, N).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          if (d[(y * N + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
      if (x1 < 0) return { kind, empty: true, txt };
      /* 화면 좌표 되돌리기: 가로는 박스 중심 기준(잉크 중심 − N/2), 세로는 베이스라인 기준.
         DOM 베이스라인 = 박스 상단 + (lineHeight − (ascent+descent))/2 + ascent 인데,
         같은 폰트·같은 크기로 그린 캔버스의 베이스라인이 N*0.7 이므로 그 차분으로 옮긴다. */
      const m = g.measureText(txt);
      const asc = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
      const lh = parseFloat(cs.lineHeight) || eb.height;
      const base = eb.y + (eb.height - (asc + desc)) / 2 + asc;
      const sc = parseFloat(cs.fontSize) / 400 * 400 / 400;   /* 잰 폰트와 그린 폰트가 같다 */
      ink = { x: eb.x + eb.width / 2 + (x0 - N / 2), y: base + (y0 - N * 0.7),
              w: x1 - x0 + 1, h: y1 - y0 + 1, txt };
    }
    return {
      kind,
      slot: { w: sb.width, h: sb.height },
      host: { top: hb.y - sb.y, h: hb.height, fs: getComputedStyle(host).fontSize },
      ink: { w: +ink.w.toFixed(1), h: +ink.h.toFixed(1),
             /* 슬롯 좌상단 기준 */
             x: +(ink.x - sb.x).toFixed(1), y: +(ink.y - sb.y).toFixed(1),
             cx: +(ink.x + ink.w / 2 - sb.x - sb.width / 2).toFixed(1),
             cy: +(ink.y + ink.h / 2 - sb.y - sb.height / 2).toFixed(1) },
      cv: ink.cvW ? { w: ink.cvW, h: ink.cvH, boxW: +ink.cvBoxW.toFixed(1), boxH: +ink.cvBoxH.toFixed(1) } : null,
      txt: ink.txt || null
    };
  };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.addInitScript(inkOfSlotSrc);
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);

  /* 세 시트가 «장착된 칸» 을 갖도록 상태를 만든다 */
  await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 200; S.stage = 200;
    S.own = {}; SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
    S.eqSkill = [];
    SKILLS.slice(0, 8).forEach(s => { if (S.eqSkill.length < 8) toggleEquip(s, 'skill'); });
    S.pet = {}; S.eqPet = [];
    PETS.slice(0, 3).forEach(t => { S.pet[t.id] = { n: 3, l: 2 }; toggleEquip(t, 'pet'); });
    buildSlots(); uiDirty = true; renderUI();
  });

  const read = async (sub, sel) => {
    await p.evaluate(s => gmHero(s), sub);
    await p.waitForTimeout(900);
    return p.evaluate(q => Array.from(document.querySelectorAll(q))
      .map(el => window.__ink411(el)).filter(Boolean), sel);
  };

  const out = {};
  out.sk = await read('sk', '#bSk .sk-slot[data-skslot]');
  out.pet = await read('pet', '#bPet .sk-slot[data-ptslot]');
  out.cos = await read('cos', '#bCos .sk-slot[data-cosun]');

  /* ── 대조: «찍힌 픽셀» 로 같은 값을 다시 잰다 (350 처방 — 재구성 측정만 믿지 않는다) ──
     슬롯 면색(`--f`)과 다른 픽셀의 bbox 를 슬롯 캡처 안에서 찾는다. Lv 라벨·해제 뱃지는
     자리로 잘라 낸다(라벨 띠 위쪽만 본다). */
  const shot = async (sub, sel) => {
    await p.evaluate(s => gmHero(s), sub);
    await p.waitForTimeout(900);
    /* 라벨·뱃지를 «자리로» 잘라 내면 잉크까지 같이 잘린다(1회차에 세로가 70 에서 잘렸다) —
       그리지 않게 하고 찍는다. 그림 자체는 한 픽셀도 안 움직인다(둘 다 절대배치).
       411 의 밑동 스크림(`.sk-si` 배경)도 면색과 다르므로 «잉크» 로 세어진다 → 같이 끈다. */
    await p.evaluate(() => {
      document.querySelectorAll('.sk-slot .sk-slv,.sk-slot .sk-eq,.sk-slot .sk-slk')
        .forEach(el => { el.style.visibility = 'hidden'; });
      document.querySelectorAll('.sk-slot .sk-si').forEach(el => { el.style.background = 'none'; });
    });
    const boxes = await p.evaluate(q => Array.from(document.querySelectorAll(q)).map(el => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, f: getComputedStyle(el).getPropertyValue('--f').trim() };
    }), sel);
    const res = [];
    for (const b of boxes) {
      const buf = await p.screenshot({ clip: { x: Math.round(b.x), y: Math.round(b.y),
                                              width: Math.round(b.w), height: Math.round(b.h) } });
      const url = 'data:image/png;base64,' + buf.toString('base64');
      res.push(await p.evaluate(async ({ url, b }) => {
        const im = new Image(); im.src = url; await im.decode();
        const cv = document.createElement('canvas');
        cv.width = im.width; cv.height = im.height;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        /* 면색은 캡처 안에서 직접 뽑는다 — 슬롯 안쪽 위 모서리(림 12 바로 안쪽) 한 점 */
        const at = (x, y) => { const i = (y * cv.width + x) * 4; return [d[i], d[i+1], d[i+2]]; };
        const F = (function(){
          const m = /^#?([0-9a-f]{6})$/i.exec(b.f.replace('#',''));
          if (m) { const v = parseInt(m[1], 16); return [(v>>16)&255, (v>>8)&255, v&255]; }
          const mm = b.f.match(/\d+/g); return mm ? mm.slice(0,3).map(Number) : at(57, 60);
        })();
        const far = (c) => Math.abs(c[0]-F[0]) + Math.abs(c[1]-F[1]) + Math.abs(c[2]-F[2]) > 60;
        /* 잘라 내는 것 셋 — ① 림(12px 인셋 · 코너 반지름 28 의 «바깥») ② `Lv.n` 라벨 띠(상단 +82 아래)
           ③ `─` 해제 뱃지(슬롯 우상단 55x35). 남는 것이 «그림 잉크» 다. */
        const W = cv.width, H = cv.height, R = 26, IN = 14, Y1 = H;  /* 림 12 + 여유 2 — 캡처 반올림 1px 이 림을 잉크로 세는 것을 막는다 */
        const inRound = (x, y) => {
          if (x < IN || y < IN || x >= W - IN || y >= H - IN) return false;
          const cx = x < IN + R ? IN + R : x > W - IN - R ? W - IN - R : x;
          const cy = y < IN + R ? IN + R : y > H - IN - R ? H - IN - R : y;
          return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= R * R;
        };
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let y = 0; y < Math.min(Y1, H); y++)
          for (let x = 0; x < W; x++) {
            if (!inRound(x, y)) continue;
            if (far(at(x, y))) { if (x<x0) x0=x; if (x>x1) x1=x; if (y<y0) y0=y; if (y>y1) y1=y; }
          }
        return x1 < 0 ? null : { x: x0, y: y0, w: x1-x0+1, h: y1-y0+1 };
      }, { url, b }));
    }
    return res;
  };
  out.pxSk = await shot('sk', '#bSk .sk-slot[data-skslot]');
  out.pxPet = await shot('pet', '#bPet .sk-slot[data-ptslot]');
  out.pxCos = await shot('cos', '#bCos .sk-slot[data-cosun]');

  /* ── 전수 스윕 — 슬롯에 «걸릴 수 있는» 그림 전부를 그림 자리에 통과시켜 최악값을 본다.
     화면의 3~8칸만 보면 dragon(가장 넓다)·🔻lance(가장 작다) 같은 끝을 놓친다. ── */
  const sweep = await p.evaluate(() => {
    const P = SA_P, A = SLOT_ART, out = { emo: [], pet: [] };
    (typeof SKILLS !== 'undefined' ? SKILLS : []).forEach(s => {
      const m = saInk(s.ic);
      if (!m) { out.emo.push({ ic: s.ic, id: s.id, miss: 1 }); return; }
      /* 잉크는 «잰 잉크 × 배율» 이다. 배율은 fs/P */
      const k = m.fs / P;
      const cv = document.createElement('canvas'); cv.width = P * 3; cv.height = P * 3;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.font = P + 'px ' + saFam; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#000'; g.fillText(s.ic, cv.width / 2, Math.round(cv.height * 0.72));
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++)
        if (d[(y * cv.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      out.emo.push({ ic: s.ic, id: s.id, fs: m.fs,
                     w: +((x1 - x0 + 1) * k).toFixed(1), h: +((y1 - y0 + 1) * k).toFixed(1) });
    });
    const T = PET_TH.slot, seen = {};
    (typeof PETS !== 'undefined' ? PETS : []).forEach(t => {
      const k0 = t.sp; if (seen[k0]) return; seen[k0] = 1;
      const At = ATLAS[k0], sp = PET_SP[k0];
      const fr = At && At.a && sp && At.a[sp.anim] && At.f[At.a[sp.anim][0]];
      if (!fr) { out.pet.push({ sp: k0, miss: 1 }); return; }
      const ins = (T.fit | 0) + 2;                       /* fit + 림 2 */
      const kk = Math.min((T.w - ins * 2) / fr[2], (T.h - ins * 2) / fr[3]);
      out.pet.push({ sp: k0, w: +(Math.round(fr[2] * kk) + 4).toFixed(1),
                              h: +(Math.round(fr[3] * kk) + 4).toFixed(1) });
    });
    out.box = { h: A.h, w: A.w };
    return out;
  });

  const lines = [];
  const stat = [];
  for (const k of ['sk', 'pet', 'cos']) {
    const rows = out[k];
    lines.push('== ' + k + ' (' + rows.length + '칸) ==');
    rows.forEach((r, i) => {
      if (r.empty) { lines.push('  [' + i + '] ' + r.kind + ' EMPTY'); return; }
      lines.push('  [' + i + '] ' + r.kind + (r.txt ? ' ' + r.txt : '')
        + ' 잉크 ' + r.ink.w + 'x' + r.ink.h
        + ' · 슬롯기준 (' + r.ink.x + ',' + r.ink.y + ')'
        + ' · 중심오프셋 (' + r.ink.cx + ',' + r.ink.cy + ')'
        + (r.cv ? ' · 캔버스 ' + r.cv.w + 'x' + r.cv.h + ' 박스 ' + r.cv.boxW + 'x' + r.cv.boxH : '')
        + ' · 슬롯 ' + r.slot.w + 'x' + r.slot.h);
      stat.push({ k, w: r.ink.w, h: r.ink.h, cx: r.ink.cx, cy: r.ink.cy });
    });
  }
  const hs = stat.map(s => s.h), ws = stat.map(s => s.w);
  const hmax = Math.max(...hs), hmin = Math.min(...hs);
  const wmax = Math.max(...ws), wmin = Math.min(...ws);
  lines.push('');
  lines.push('세로 덩치 max/min = ' + hmax + ' / ' + hmin + ' = ' + (hmax / hmin).toFixed(3)
    + '  (목표 ≤ 1.05)');
  lines.push('가로 덩치 max/min = ' + wmax + ' / ' + wmin + ' = ' + (wmax / wmin).toFixed(3));
  lines.push('중심 오프셋 |cx| max = ' + Math.max(...stat.map(s => Math.abs(s.cx))).toFixed(1)
    + ' · |cy| max = ' + Math.max(...stat.map(s => Math.abs(s.cy))).toFixed(1));
  /* 시트별 대표값(같은 시트 안 칸끼리는 그림이 달라 편차가 있다 — 최대·최소를 같이 적는다) */
  for (const k of ['sk', 'pet', 'cos']) {
    const g = stat.filter(s => s.k === k);
    if (!g.length) continue;
    lines.push(k + ': h ' + Math.min(...g.map(s => s.h)) + '~' + Math.max(...g.map(s => s.h))
      + ' · w ' + Math.min(...g.map(s => s.w)) + '~' + Math.max(...g.map(s => s.w)));
  }
  lines.push('');
  lines.push('== 찍힌 픽셀 대조(라벨·뱃지 숨김 · 림 안쪽) ==');
  for (const [k, arr] of [['sk', out.pxSk], ['pet', out.pxPet], ['cos', out.pxCos]])
    arr.forEach((r, i) => lines.push('  px ' + k + '[' + i + '] '
      + (r ? r.w + 'x' + r.h + ' @(' + r.x + ',' + r.y + ')' : 'none')));
  lines.push('');
  lines.push('== 전수 스윕(그림 자리 ' + sweep.box.w + 'x' + sweep.box.h + ') ==');
  const eh = sweep.emo.filter(e => !e.miss).map(e => e.h);
  const ph = sweep.pet.filter(e => !e.miss).map(e => e.h);
  lines.push('  이모지 ' + sweep.emo.length + '종 잉크 h ' + Math.min(...eh) + '~' + Math.max(...eh)
    + ' · w ' + Math.min(...sweep.emo.filter(e=>!e.miss).map(e=>e.w)) + '~'
    + Math.max(...sweep.emo.filter(e=>!e.miss).map(e=>e.w)));
  sweep.emo.filter(e => !e.miss && e.h < sweep.box.h - 1)
    .forEach(e => lines.push('    · 폭 상한에 걸린 이모지 ' + e.ic + ' ' + e.id
      + ' → ' + e.w + 'x' + e.h + ' (fs ' + e.fs + ')'));
  sweep.emo.filter(e => e.miss).forEach(e => lines.push('    ⚠ 측정 실패 ' + e.ic + ' ' + e.id));
  lines.push('  펫 스프라이트 ' + sweep.pet.length + '종:');
  sweep.pet.forEach(e => lines.push('    ' + e.sp.padEnd(9)
    + (e.miss ? '측정 실패' : e.w + 'x' + e.h + (e.h < sweep.box.h - 2 ? '  ← 폭 상한' : ''))));
  const allh = eh.concat(ph);
  lines.push('  스윕 세로 덩치 max/min = ' + Math.max(...allh) + ' / ' + Math.min(...allh)
    + ' = ' + (Math.max(...allh) / Math.min(...allh)).toFixed(3));
  console.log(lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
