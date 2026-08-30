/* 작업 409 2회차 — «검정을 등폭으로 만들었더니 감쇠가 **베벨로 옮겨 갔다**» 를 재는 자.
 *
 *   node tools/probe409b.js
 *
 * 1회차 채점(CV)이 낸 것: 검정 법선 두께는 등폭(변동 4.6%)이 됐는데, 그 **안쪽 베벨 링**이
 * 코너에서 7·cos α 로 사라진다(0° 6px → 75° 1px → 88° 0px). 즉 결손이 없어진 게 아니라
 * 한 칸 안으로 옮겨 갔다는 지적이다. 여기서는 **검정과 그 안쪽 런을 같이** 재서
 * 후보 변종들을 한 표에 놓는다.
 *
 *   A 현행        — 검정 = `::after` 등폭 링(코너 기둥 마스크) · 가로 띠 = `::before`(아래)
 *   B 순서 되돌림 — 검정 링은 그대로 두고 **가로 띠를 위로**(띠가 코너에서 링을 덮는다)
 *   C 이중 링     — `::after` 에 검정 7 + 베벨 7 을 **동심으로** 얹는다
 *
 * ref 실측(비평가 CV·CW 2인 + probe409): 검정 6.0~7.0(0~60°) · **베벨 6~7 이 각도와 무관**.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '409b.png');
const R = 30;
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61523D']];
const DEGS = [0, 15, 30, 45, 60, 75, 85];

const VARIANTS = [
  ['A 현행(링 위 · 띠 아래)', ''],
  /* 409 2회차 §R — **되돌림 시험.** 2회차가 넣은 것은 `::after` 의 배경 고리 한 벌뿐이므로
     그것만 떼면 1회차 상태가 그대로 돌아온다. TL «≥2px» 가 코너로 갈수록 무너지면(B2.0/F18.0)
     자가 진짜로 그 축을 재고 있다는 뜻이고, BL 은 A 와 Δ0 이어야 한다(384 를 안 건드렸다는 증거). */
  ['R 되돌림(2·3회차 배경 고리 전부 제거 = 1회차 상태)',
    '.stab.on::after{background:none!important}.stab.on{--pill-bl:none;--pill-br:none}'],
  /* 409 3회차 — **후보 G(다음 회차용 설계안).** 3회차까지의 배경 고리 둘을 **끄고**, 대신
     `::before` 자체를 «검정 링의 **안쪽 윤곽**»(사방 7 인셋 · 반경 23 = 동심)으로 다시 세운다.
     384 가 `::before` 를 «좌·우만 7 인셋» 으로 잡은 것은 그때 검정이 **가로 밴드**였기 때문인데,
     409 1회차가 검정을 **동심 등폭 링**으로 바꾼 순간 그 전제가 바뀌었다 — 검정의 안쪽 윤곽은
     이제 «사방 7 인셋 · 반경 23» 이다. 직선 구간은 부모 그라데이션이 이미 같은 색을 칠하므로
     `::before` 를 **코너 기둥으로 마스크**하면 값을 안 치르고 네 코너를 한 부품이 맡는다.
     ⇒ 이 변종이 «어두운 띠도 호를 따라간다»(3인 독립 지적 CY·CZ·DA)를 값 없이 푸는지 재는 자리다. */
  ['G ::before 를 동심 안쪽 윤곽(사방 7 인셋 · r23 · 기둥 마스크)으로',
    '.stab.on::after{background:none!important}.stab.on{--pill-bl:none;--pill-br:none}'
    + '.stab.on::before{top:7px!important;bottom:7px!important;border-radius:23px!important;'
    + '-webkit-mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px)))!important;'
    + 'mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px)))!important}'],
  /* 409 3회차 — **후보 H = G(아래) + 2회차 `::after` 배경 고리(위).** G 는 아래 코너를 정확히
     되살리지만 위 코너 30~45° 가 `B5.5/B5.0` 으로 2회차(B7.0/B6.5)보다 얕다 — 위는 `::after` 의
     동심 고리가 더 낫다. 3회차의 **부모 배경 고리 둘은 끈다**(G 가 그 일을 대신하고, 그대로 두면
     베벨이 겹쳐 DA 지적 2 «면적 +12~24%» 가 커진다). */
  ['H = G(아래 ::before 동심) + 2회차 위 코너 고리',
    '.stab.on{--pill-bl:none;--pill-br:none}'
    + '.stab.on::before{top:7px!important;bottom:7px!important;border-radius:23px!important;'
    + '-webkit-mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px)))!important;'
    + 'mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px)))!important}'],
  /* 409 4회차 — **후보 K·L(다음 회차 설계안).** 네 회차에 걸쳐 **비평가 넷이 독립으로 같은 것**을 짚었다
     (CV D2 · CY 지적4 · DB 지적1·2 · DD 지적1·2 · DC 지적1): 검정 링이 코너 상자 끝까지 **7px 등폭으로
     끌려가다 한 열에서 잘려** 3×7 짜리 사각 노치를 만든다. ref 는 접선으로 갈수록 **가늘어진다**
     (DD 열 두께 dx 27/28/29 = 1.20/0.51/0.10 ↔ 우리 7.28/7.19/7.11 · CY 법선 75°/80° ref 4.22/3.92).
     ⇒ 기둥 마스크(가로)에 **세로 페이드**를 교차(mask-composite:intersect)해 접선 근처에서 링을 재운다.
     K = 3px 램프 · L = 6px 램프. **어느 쪽이든 `verify409` [2](0~75° 등폭 ≥5.0)와 정면으로 부딪히므로**
     그 항의 이관이 이 처방의 절반이다 — ref 자신이 60° 를 넘으면 등폭이 아니라는 것을 세 비평가가
     각자 다른 자로 쟀다(그 이관 없이 K·L 을 넣으면 게이트가 빨개진다). */
  ['K 접선 페이드 3px(기둥 마스크와 교차)',
    '.stab.on::after{-webkit-mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))),linear-gradient(180deg,transparent 0,#000 3px,#000 calc(100% - 3px),transparent 100%)!important;'
    + 'mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))),linear-gradient(180deg,transparent 0,#000 3px,#000 calc(100% - 3px),transparent 100%)!important;'
    + '-webkit-mask-composite:source-in!important;mask-composite:intersect!important}'],
  ['L 접선 페이드 6px(기둥 마스크와 교차)',
    '.stab.on::after{-webkit-mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))),linear-gradient(180deg,transparent 0,#000 6px,#000 calc(100% - 6px),transparent 100%)!important;'
    + 'mask-image:var(--pill-mask,linear-gradient(90deg,#000 0 30px,transparent 30px calc(100% - 30px),#000 calc(100% - 30px))),linear-gradient(180deg,transparent 0,#000 6px,#000 calc(100% - 6px),transparent 100%)!important;'
    + '-webkit-mask-composite:source-in!important;mask-composite:intersect!important}'],
  ['B 띠를 위로', '.stab.on::before{z-index:1}.stab.on::after{z-index:0}'],
  ['C 이중 링(검정7+베벨7)',
    '.stab.on::after{box-shadow:inset 0 0 0 7px var(--pill-k,#000),inset 0 0 0 14px #634F37!important}'],
  ['D 링 + 상단 베벨 복사본(코너 기둥 안에서만)',
    '.stab.on::after{box-shadow:inset 0 0 0 7px var(--pill-k,#000),inset 0 7px 0 #634F37!important}'],
  ['F ::before 에 베벨 등폭 링(띠 **밑**에 깔아 감김 보존)',
    '.stab.on::before{box-shadow:inset 0 -7px 0 #413122,inset 0 -14px 0 #634F37,'
    + 'inset 0 7px 0 #634F37,inset 0 0 0 7px #634F37!important}'],
  ['E 링 + 상단 베벨 + 바닥 D·베벨 복사본',
    '.stab.on::after{box-shadow:inset 0 0 0 7px var(--pill-k,#000),inset 0 7px 0 #634F37,'
    + 'inset 0 -7px 0 #413122,inset 0 -14px 0 #634F37!important}'],
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
      window.__v409b = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('load fail'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

const ray = (page, p, corner, deg) => page.evaluate(([box, cor, dg, pal, r]) => {
  const g = window.__v409b;
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

/* 윤곽에서 시작하는 검정 런의 두께와 **그 바로 안쪽 런**(베벨이면 B)의 두께를 같이 낸다. */
function split(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  let k = rs.findIndex(r => r[0] === 'K');
  if (k < 0 || k > 6) return { k: 0, nx: '-', nn: 0, sx: '-', sn: 0, txt: rs.map(r => r[0] + (r[1] * step).toFixed(1)).join(' ') };
  const inner = rs[k + 1] || null;
  /* 409 2회차 — **«안쪽» 한 칸만 보면 안티에일리어싱 이음매에 속는다.**
     검정 링의 안쪽 모서리는 그 밑의 색과 섞이므로 각도에 따라 0.5~1.0px 짜리 중간색 런이 하나 낀다
     (45°/60°/85° 에서만 나오고 0°/30°/75° 에서는 안 나온다 = **정수 픽셀 격자에 걸리는 표본 운**이지
     그림의 결손이 아니다. 후보 C — 순수 CSS 동심 링 — 도 같은 자리에서 같은 값을 낸다).
     ⇒ **기존 «안쪽» 칸은 한 글자도 안 바꾸고**(그 자리가 무엇을 세는지는 그대로 두고) 그 뒤에
        «**2px 이상인 첫 런**» 축을 하나 더 낸다. 이음매(≤1.5px)는 이 축에서만 건너뛰고,
        전체 런 문자열(`V409B_FULL=1`)은 그대로 찍히므로 **숨겨지는 값이 없다**. */
  let si = k + 1;
  while (rs[si] && rs[si][1] * step < 2.0) si++;
  const solid = rs[si] || null;
  return { k: rs[k][1] * step, nx: inner ? inner[0] : '-', nn: inner ? inner[1] * step : 0,
    sx: solid ? solid[0] : '-', sn: solid ? solid[1] * step : 0,
    txt: rs.map(r => r[0] + (r[1] * step).toFixed(1)).join(' ') };
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
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(900);

    console.log('\n══════ 409 2회차 — 검정 + «그 안쪽 런» 을 같이 잰다 (07 활성 «스킬») ══════');
    console.log(' ref 실측: 검정 6.0~7.0(0~60°) · 베벨 6~7 이 **각도와 무관** (CV·CW 2인 + probe409)');
    for (const [name, css] of VARIANTS) {
      if (css) await page.evaluate(c => {
        const s = document.createElement('style'); s.id = 'v409b'; s.textContent = c; document.head.appendChild(s);
      }, css);
      await page.waitForTimeout(250);
      const p = await page.evaluate(() => {
        const on = document.querySelector('#bSk .stabs > .stab.on').getBoundingClientRect();
        return { x: on.x, y: on.y, w: on.width, h: on.height };
      });
      await shoot(page);
      console.log('\n ── ' + name);
      for (const cor of ['TL', 'BL']) {
        const K = [], N = [], S = [];
        for (const d of DEGS) {
          const r = split(await ray(page, p, cor, d));
          K.push(r.k); N.push(r.nx + r.nn.toFixed(1)); S.push(r.sx + r.sn.toFixed(1));
        }
        console.log('   ' + cor + '  deg  ' + DEGS.map(d => String(d).padStart(6)).join(''));
        console.log('       검정 ' + K.map(v => v.toFixed(1).padStart(6)).join(''));
        console.log('       안쪽 ' + N.map(v => v.padStart(6)).join(''));
        console.log('      ≥2px ' + S.map(v => v.padStart(6)).join(''));
        if (process.env.V409B_FULL) for (const d of [30, 45, 60, 75]) {
          console.log('        ' + cor + ' ' + String(d).padStart(2) + '°  ' + split(await ray(page, p, cor, d)).txt);
        }
      }
      if (css) await page.evaluate(() => { const s = document.getElementById('v409b'); if (s) s.remove(); });
      await page.waitForTimeout(200);
    }
  } finally {
    await browser.close();
  }
})();
