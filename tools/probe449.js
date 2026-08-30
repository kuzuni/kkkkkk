/* 작업 449 재현기 — «끝 칸(378)의 «셸에 닿는 면» 은 베벨이 아직 «가로 평행이동 밴드» 인가».
 *
 *   node tools/probe449.js            현행 + 후보 변종을 한 표에
 *   V449_FULL=1 node tools/probe449.js  전체 런 문자열까지
 *
 * 338 규칙 — 449 등재문의 처방(ⓐ `--pill-k:transparent` + 배경 동심 고리 · ⓑ 비대칭 반경)을
 * 따르기 **전에** 먼저 재현한다. 재는 것은 409 가 가운데 칸에서 쓴 것과 **같은 자**다:
 * 코너 원 중심에서 각도 α 로 쏜 광선의 **법선** 런(가로 런은 코너에서 1/cosα 로 길어져
 * «등폭인가» 를 직접 못 묻는다 — probe409 서두).
 *
 * 다른 것은 **어느 면을 보는가** 하나다:
 *   · 409 [2][8][9][10] = 가운데 칸 / 검정이 **있는** 면 → 첫 런이 `K`(검정 링) 다.
 *   · 449            = 끝 칸 / 셸에 **넘긴** 면 → 그 면엔 검정이 없고(378) 첫 런이 곧
 *     **베벨 `B`** 여야 한다. ref 실측(측정표 03 §4-3 · 352 §8)이 그 자리를 이렇게 적는다:
 *         `#000000 ×6(셸 테두리) → #634F37 ×7~8(베벨) → 면 #4B3E2D`
 *     즉 이 자에서 물을 값은 «첫 런 = B · 두께 ≈7 이 각도와 무관한가» 다.
 *
 * 변종:
 *   A  현행 — `--pill-l:inset 7px` 짜리 **가로 밴드** + `::before` 는 **옛 상자**(409 4회차가 남긴 것)
 *   G  `::before` 만 동심(사방 7 인셋 · r23 · 기둥 마스크)으로 → 409 4회차가 «면색 4px» 을 본 그 상태
 *   S  G + **배경 동심 고리**(등재문 ⓐ) — 닿는 면 두 코너에 `#634F37` 를 r23..30 으로 깔아
 *      베벨 자체를 동심으로 만든다. 검정은 여전히 0 이므로 378 은 그대로다.
 *   Sb S 에서 고리만 빼 본 것(= G) 과 가르기 위한 «고리만» 변종(::before 는 옛 상자 그대로)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '449.png');
const R = 30;
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61503C']];
const DEGS = [0, 15, 30, 45, 60, 75];

/* 끝 칸 셀렉터 — 378 이 «셸 안쪽 변에 닿는 칸» 으로 고른 그 셋이다. */
const END = '.stabs.sp2>.stab.on:nth-of-type(1),.stabs.sp3>.stab.on:nth-of-type(1),.stab.on.stab-c1';
const END_B = '.stabs.sp2>.stab.on:nth-of-type(1)::before,.stabs.sp3>.stab.on:nth-of-type(1)::before,'
  + '.stab.on.stab-c1::before';
const MASK = 'linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))';
const CONCENTRIC = END_B + '{top:7px!important;bottom:7px!important;border-radius:23px!important;'
  + '-webkit-mask-image:' + MASK + '!important;mask-image:' + MASK + '!important}';
const GRAD = 'linear-gradient(180deg,#634F37 0 7px,#4B3E2D 7px 71px,#634F37 71px 78px,#413122 78px 85px)';
const RING_L = END + '{background:'
  + 'radial-gradient(circle at 30px 30px,transparent 0 23px,#634F37 23px 30px,transparent 30px) 0 0/30px 30px no-repeat,'
  + 'radial-gradient(circle at 30px 0,transparent 0 23px,#634F37 23px 30px,transparent 30px) 0 100%/30px 30px no-repeat,'
  + GRAD + '!important}';

const VARIANTS = [
  ['A 현행 (가로 밴드 + 옛 ::before 상자)', ''],
  ['G ::before 만 동심으로 (409 4회차가 «면색 4px» 을 본 상태)', CONCENTRIC],
  ['Sb 배경 동심 고리만 (::before 는 옛 상자)', RING_L],
  ['S = G + 배경 동심 고리 (등재문 ⓐ)', CONCENTRIC + RING_L],
  /* T — **닿는 면의 가로 인셋만 0**. 옛 상자(세로 인셋 0 · r30 · 마스크 없음)는 그대로 두고
     그 면의 인셋 7 만 뗀다 ⇒ 이 코너의 원 중심이 (7+30) 에서 **(30) = 알약 코너 중심**으로 온다.
     ref 가 이 자리에서 «어두운 띠가 **가장 바깥**, 그 뒤 베벨» 인 것(probe449.py BR)과 같은 꼴이다 —
     띠들이 그제서야 알약 윤곽에서 시작한다. 등재문 ⓑ 의 «비대칭» 을 반경이 아니라 **인셋**으로 푼 것. */
  ['T 닿는 면 인셋 0 (옛 상자 · 동심)', END_B + '{left:0!important}'],
];

const HOSTS = [
  ['06 장비', '#eqTabs', () => { goTab('hero', true); heroSubGo('eq'); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

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
      window.__v449 = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('load fail'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

/* 코너 원 중심에서 각도 deg 로 쏜 광선. d = 윤곽에서 안쪽으로. 윤곽 **바깥은 안 읽는다** —
   닿는 면 바로 밖은 셸의 검정 테두리라, 밖을 읽으면 «검정이 있다» 로 잘못 읽힌다(verify409 주석). */
const ray = (page, p, corner, deg) => page.evaluate(([box, cor, dg, pal, r]) => {
  const g = window.__v449;
  const a = dg * Math.PI / 180;
  const bottom = cor[0] === 'B', right = cor[1] === 'R';
  const cx = box.x + (right ? box.w - r : r), cy = box.y + (bottom ? box.h - r : r);
  const ux = (right ? 1 : -1) * Math.cos(a), uy = (bottom ? 1 : -1) * Math.sin(a);
  const cls = (R2, G2, B2) => {
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d2 = (R2 - rr) ** 2 + (G2 - gg) ** 2 + (B2 - bb) ** 2;
      if (d2 < bd) { bd = d2; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let d = 0; d <= 24 + 1e-9; d += 0.5) {
    const q = g.getImageData(Math.round(cx + ux * (r - d)), Math.round(cy + uy * (r - d)), 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, corner, deg, PAL, R]);

function runs(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], (j - i) * step]); i = j; }
  return rs;
}
/* 윤곽에서 시작하는 첫 «실한 런»(≥1.5px) — 이 면에서는 그것이 곧 베벨이어야 한다.
   ⚠ 이음매(≤1.0px 중간색)는 건너뛴다(probe409b 2회차 교훈 — 안쪽 한 칸만 보면 AA 에 속는다). */
function first(s) {
  const rs = runs(s);
  let i = 0;
  while (rs[i] && rs[i][1] < 1.5) i++;
  return rs[i] || ['-', 0];
}
/* 첫 실한 런 **뒤에** 면색 `F` 가 곧바로 오면 = «베벨과 띠 사이가 벌어졌다»(409 4회차의 F 갭). */
function gapF(s) {
  const rs = runs(s);
  let i = 0;
  while (rs[i] && rs[i][1] < 1.5) i++;
  let j = i + 1;
  while (rs[j] && rs[j][1] < 1.5) j++;
  return rs[j] && rs[j][0] === 'F' ? rs[j][1] : 0;
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    console.log('\n══════ 449 — 끝 칸(378) «셸에 닿는 면» 의 베벨을 법선으로 잰다 ══════');
    console.log(' ref: 그 면은 «셸 검정 6 → 베벨 #634F37 ×7~8 → 면» (측정표 03 §4-3 · 352 §8)');
    console.log(' ⇒ 첫 런이 B 이고 두께가 각도와 무관해야 한다. 밴드면 7·cos α 로 얇아진다(60° 3.5 · 75° 1.8).');

    for (const [hname, sel, setup] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(800);
      const p = await page.evaluate(s => {
        const on = document.querySelector(s + ' > .stab.on') || document.querySelector(s + ' .stab.on');
        const b = on.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      }, sel);
      console.log('\n▣ ' + hname + '  알약 ' + p.w.toFixed(1) + '×' + p.h.toFixed(1)
        + ' @ ' + p.x.toFixed(1) + ',' + p.y.toFixed(1));
      for (const [vname, css] of VARIANTS) {
        if (css) await page.evaluate(c => {
          const s = document.createElement('style'); s.id = 'v449'; s.textContent = c; document.head.appendChild(s);
        }, css);
        await page.waitForTimeout(220);
        await shoot(page);
        /* V449_FAR=1 — 같은 끝 칸의 **반대 면**(셸에 안 닿는 · 검정 링이 있는) 코너를 본다.
           449 의 범위 밖이지만 «한 상자를 공유하므로 한쪽만 동심으로 못 만든다» 를 값으로 남긴다. */
        for (const cor of (process.env.V449_FAR ? ['TR', 'BR'] : ['TL', 'BL'])) {
          const cells = [];
          for (const dg of DEGS) {
            const s = await ray(page, p, cor, dg);
            const f = first(s), g = gapF(s);
            cells.push(dg + '°:' + f[0] + f[1].toFixed(1) + (g ? '/F' + g.toFixed(1) : ''));
            if (process.env.V449_FULL) console.log('      ' + cor + ' ' + dg + '° ' + runs(s).map(r => r[0] + r[1].toFixed(1)).join(' '));
          }
          console.log('   ' + cor + '  ' + vname.slice(0, 2) + '  ' + cells.join('  '));
        }
        if (css) await page.evaluate(() => { const s = document.getElementById('v449'); if (s) s.remove(); });
        await page.waitForTimeout(150);
      }
    }
    console.log('\n 읽는 법: «각도:첫실런+두께» · `/Fn` 은 그 뒤가 곧바로 **면색** 이라는 뜻(= 벌어진 자리).');
  } finally { await browser.close(); }
})();
