/* 작업 468 재현기 — «구분선 `.stab-sep` 이 활성 «끝 칸» 알약 **위**를 지난다».
 *
 *   node tools/probe468.js               현행 + 후보 변종을 한 표에
 *   V468_FULL=1 node tools/probe468.js   런 문자열까지 (분류 전 원색도)
 *
 * 338 규칙 — 등재문의 처방 셋(ⓐ DOM 이동 · ⓑ z-index · ⓒ 조건부 숨김)을 따르기 **전에** 먼저 잰다.
 *
 * ⚑ **462 의 자를 그대로 쓰면 안 된다.** 462 [기록] 이 이 자리를 `F`(면색)로 읽은 것이 이 작업의
 *   등재 계기다 — 구분선 `#483B2B` 와 면색 `#4B3E2D` 은 RGB 거리 **3** 이라 «가장 가까운 팔레트»
 *   분류가 둘을 접는다. 그래서 이 자는 **정확 일치**(distance 0)로 구분선을 따로 센다.
 *
 * 무엇을 보는가 (두 축):
 *   ① 알약 상자 **안**에 구분선 색 `#483B2B` 픽셀이 몇 개인가 — 결함이면 > 0, 고쳐지면 **0**.
 *      (자리·각도에 안 의존하는 «있다/없다» 축이라 409 가 진행 중인 코너 기하와 독립이다.)
 *   ② 알약 세로 한복판 가로 단면의 **런 구성** — 결함이면 `K7 → B2 → S6 → 면`,
 *      고쳐지면 가운데 칸과 같은 `K7 → B7 → 면`.
 *
 * ⚠ 06 장비(#eqTabs)는 **4칸 격자**(`.stab-c1~c4`)라 `.stabs.sp2/.sp3` 규칙을 안 지난다.
 *   구분선이 걸치는 칸은 **둘**이다 (패딩박스 936 · `--sb` 7 · 구분선 703..709):
 *      칸3«코스튬» 알약 456.25..717.25 → 구분선이 **우측 코너 안쪽**(우변에서 8.25..14.25)
 *      칸4«펫»     알약 693.75..936.00 → 구분선이 **좌측 코너 안쪽**(좌변에서  9.25..15.25)
 *   등재문이 적은 «국소 x 9..15» 는 칸4 쪽이다. 칸3 은 등재문이 안 짚은 **두 번째 자리**다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '468.png');

/* 정확 일치로 가르는 색. 구분선(S)과 면색(F)은 RGB 거리 3 이라 «가까운 쪽» 으로는 못 가른다. */
const SEP = [0x48, 0x3B, 0x2B];   /* .stab-sep      #483B2B */
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['H', '#61503C']];

/* 변종 — 등재문 셋 중 둘을 실제로 걸어 본다(ⓒ 조건부 숨김은 «구분선을 지운다» 라 ref 와 어긋난다). */
const VARIANTS = [
  ['A 현행', null, ''],
  ['Z ⓑ `.stab.on{z-index:1}`', null, '.stab.on{z-index:1}'],
  ['M ⓐ DOM 이동 — 구분선을 칸들 **앞**으로', 'dom', ''],
];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* 칸 활성화를 «핀» 으로 박는다 — 462 §5 함정(틱마다 `.on` 이 상태에서 되돌아온다). */
/* 967 — `SETON`(사본 + 자기 핀)은 **선언째 지웠다**(402 · 963). 심는 손잡이는 공용 부품
   `__stab967`(`tools/stab967.js`) 하나다. 이 자는 주입과 읽기 사이에 **캡처**가 들어가 «한 틱» 으로
   못 접으므로, 핀으로 붙들고(`hold`) **캡처 직후 되읽어**(`held`) 어긋난 판은 값을 안 찍고 신고한다. */
const hold = (page, bar, i) => page.evaluate(([s, k]) => window.__stab967.pin(s, k), [bar, i]);
const held = async (page, bar, want, tag) => {
  const on = await page.evaluate(([s]) => window.__stab967.on(s), [bar]);
  if (on !== want) console.log('  ⚠⚠ ' + tag + ' — 못 쟀다: 캡처 사이에 활성이 칸' + (on + 1) + ' 로 바뀌었다 (967)');
  return on === want;
};

async function shoot(page) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(data => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      window.__v468 = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

/* ① 알약 **코너 띠**(문제의 변에서 안쪽 24px) 안 «구분선 색» 픽셀 수 (정확 일치).
   ⚠ 상자 전체로 세면 안 된다 — 라벨 글리프의 AA 가 우연히 같은 값을 내서 **바닥값이 2~5개**다
      (1회차 실측: 칸2 2개 · 칸1 5개 — 구분선이 안 닿는 칸인데도 0 이 아니다).
      띠로 좁히면 그 잡음이 통째로 빠지고 «구분선이 알약을 밟았는가» 만 남는다. */
const STRIP = 24;
const sepInside = (page, p, side) => page.evaluate(([b, sep, sd, sw]) => {
  const g = window.__v468;
  const y0 = Math.ceil(b.y);
  const h = Math.floor(b.y + b.h) - y0;
  const x0 = sd === 'L' ? Math.ceil(b.x) : Math.floor(b.x + b.w) - sw;
  const w = sw;
  const d = g.getImageData(x0, y0, w, h).data;
  let n = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4] === sep[0] && d[i * 4 + 1] === sep[1] && d[i * 4 + 2] === sep[2]) {
      n++;
      const x = i % w, y = (i / w) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  return { n, box: n ? [minx, maxx, miny, maxy] : null, w, h };
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, SEP, side, STRIP]);

/* ② 알약 세로 한복판 가로 단면 — 지정한 변에서 안쪽으로 24px.
   구분선은 **정확 일치**로 `S`, 나머지는 가장 가까운 팔레트로 분류한다. */
const scan = (page, p, side) => page.evaluate(([b, sd, pal, sep]) => {
  const g = window.__v468;
  const y = Math.round(b.y + b.h / 2);
  const cls = (R, G, B) => {
    if (R === sep[0] && G === sep[1] && B === sep[2]) return 'S';
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d2 = (R - rr) ** 2 + (G - gg) ** 2 + (B - bb) ** 2;
      if (d2 < bd) { bd = d2; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let d = 0; d < 24; d++) {
    const x = sd === 'L' ? Math.round(b.x) + d : Math.round(b.x + b.w) - 1 - d;
    const q = g.getImageData(x, y, 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, side, PAL, SEP]);

function runs(s) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  return rs;
}
const fmt = s => runs(s).map(r => r[0] + r[1]).join(' ');

/* 구분선이 걸치는 칸 둘 + 대조군(가운데 칸 2 · 구분선이 안 닿는 끝 칸 1) */
const CELLS = [
  [3, 'L', '칸4«펫»   (구분선이 좌측 코너 안쪽)'],
  [2, 'R', '칸3«코스튬»(구분선이 우측 코너 안쪽)'],
  [1, 'L', '칸2«스킬» (대조 — 구분선 안 닿는 가운데 칸)'],
  [0, 'L', '칸1«장비» (대조 — 구분선 안 닿는 끝 칸)'],
];

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.evaluate(SETTLE);
    await page.waitForTimeout(700);

    console.log('\n══════ 468 — `.stab-sep` 이 활성 끝 칸 알약 위를 지나는가 ══════');

    /* 구분선을 가진 바가 어디인가 — «06 뿐» 을 사실로 확인하고 시작한다. */
    const bars = await page.evaluate(() => [...document.querySelectorAll('.stabs')].map(b => ({
      id: b.id || '(id 없음)', cls: b.className,
      sep: b.querySelectorAll(':scope > .stab-sep').length,
      n: b.querySelectorAll(':scope > .stab').length,
    })));
    console.log('\n[0] `.stabs` 바 목록 — 구분선을 가진 바');
    for (const b of bars) console.log('    ' + b.id.padEnd(10) + ' 칸 ' + b.n + ' · 구분선 ' + b.sep + '  (' + b.cls + ')');

    const geo = await page.evaluate(() => {
      const bar = document.getElementById('eqTabs');
      const sp = bar.querySelector('.stab-sep').getBoundingClientRect();
      const bb = bar.getBoundingClientRect();
      const cs = getComputedStyle(bar);
      return { sepX: sp.x, sepW: sp.width, sepY: sp.y, sepH: sp.height, barX: bb.x, barW: bb.width,
        bw: parseFloat(cs.borderLeftWidth) };
    });
    console.log('\n[1] 기하 — 구분선 x ' + geo.sepX.toFixed(2) + '..' + (geo.sepX + geo.sepW).toFixed(2)
      + ' (w ' + geo.sepW + ') · y ' + geo.sepY.toFixed(1) + '..' + (geo.sepY + geo.sepH).toFixed(1)
      + '  · 바 x ' + geo.barX.toFixed(1) + ' w ' + geo.barW.toFixed(1) + ' 테두리 ' + geo.bw);

    for (const [vname, dom, css] of VARIANTS) {
      console.log('\n────── ' + vname + ' ──────');
      await page.evaluate(([d, c]) => {
        /* 앞 변종 걷기 */
        const old = document.getElementById('v468'); if (old) old.remove();
        const bar = document.getElementById('eqTabs');
        const sep = bar.querySelector('.stab-sep');
        if (sep && bar.firstElementChild !== sep && !d) bar.appendChild(sep);   /* 원복 */
        if (d === 'dom' && sep) bar.insertBefore(sep, bar.firstElementChild);
        if (c) { const s = document.createElement('style'); s.id = 'v468'; s.textContent = c; document.head.appendChild(s); }
      }, [dom, css]);

      for (const [i, side, label] of CELLS) {
        const onI = await hold(page, '#eqTabs', i);
        if (onI !== i) { console.log('  ' + label + (onI === -2 ? ' — 칸 없음' : ' — ⚠⚠ 못 쟀다: 켠 칸이 칸' + (onI + 1) + ' 로 되돌려졌다 (967)')); continue; }
        await page.waitForTimeout(220);
        await page.evaluate(SETTLE);
        await shoot(page);
        if (!await held(page, '#eqTabs', i, label)) continue;
        const p = await page.evaluate(() => {
          const on = document.querySelector('#eqTabs > .stab.on');
          if (!on) return null;
          const b = on.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height };
        });
        if (!p) { console.log('  ' + label + ' — 활성 칸 없음'); continue; }
        const ins = await sepInside(page, p, side);
        const s = await scan(page, p, side);
        console.log('  ' + label);
        console.log('      알약 ' + p.x.toFixed(2) + '..' + (p.x + p.w).toFixed(2)
          + '  ① ' + side + ' 코너 띠 24px 안 구분선색 픽셀 **' + ins.n + '개**'
          + (ins.box ? ' (국소 x ' + ins.box[0] + '..' + ins.box[1] + ' · y ' + ins.box[2] + '..' + ins.box[3] + ')' : ''));
        console.log('      ② ' + side + ' 변 단면 24px: ' + fmt(s) + (process.env.V468_FULL ? '   [' + s + ']' : ''));
      }

      /* ③ **음성항** — 구분선이 안 덮이는 상태(칸1 활성)에서는 그대로 다 보여야 한다.
         이 항이 없으면 «구분선을 통째로 숨긴다»(등재문 ⓒ 의 무른 판본)도 ①② 를 통과한다. */
      await hold(page, '#eqTabs', 0);
      await page.waitForTimeout(220);
      await shoot(page);
      await held(page, '#eqTabs', 0, '③ 음성항(칸1 활성)');
      const vis = await page.evaluate(sep => {
        const g = window.__v468;
        const r = document.querySelector('#eqTabs > .stab-sep').getBoundingClientRect();
        const x0 = Math.ceil(r.x), y0 = Math.ceil(r.y);
        const w = Math.floor(r.x + r.width) - x0, h = Math.floor(r.y + r.height) - y0;
        const d = g.getImageData(x0, y0, w, h).data;
        let n = 0;
        for (let i = 0; i < w * h; i++) {
          if (d[i * 4] === sep[0] && d[i * 4 + 1] === sep[1] && d[i * 4 + 2] === sep[2]) n++;
        }
        return { n, w, h };
      }, SEP);
      console.log('  ③ 음성항 — 칸1 활성일 때 구분선 자기 상자(' + vis.w + '×' + vis.h + ') 안 구분선색 **'
        + vis.n + '개** (덮이면 안 되는 상태 — 줄면 무르게 푼 것이다)');
    }

    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    console.log('\n[C] 콘솔 에러 ' + errs.length + '건');
  } finally { await browser.close(); }
})();
