/* 게이트 463 — «`.stab.on::before` 의 코너 기둥 마스크는 **그 상자의 좌표**로 적혔는가».
 *
 *   node tools/verify463.js
 *
 * 무엇을 지키는가 —
 *   마스크는 자기 상자의 국소 좌표로 읽힌다. 이 부품의 코너 기둥은 «알약 x 0..30»(= 반경, 352 §10)
 *   이어야 하므로 **기둥 폭 = 30 − 그 층의 가로 인셋** 이라는 불변식이 성립해야 한다:
 *       `::after`(검정 등폭 링)  인셋 0 → 기둥 **30**
 *       `::before`(가로 세 띠)   인셋 7 → 기둥 **23**   ← 463 이 고친 자리
 *   수리 전에는 둘 다 30 이라 띠 층이 코너가 끝난 **뒤 직선부 7px** 까지 살아 있었고,
 *   4회차가 세로 인셋 7 을 주면서 세 띠도 7px 씩 밀린 터라 그 7px 에서 부모 위에 겹쳐 칠해졌다.
 *
 * ⚑ **잠복이 아니었다** — `probe463` 이 알약당 **294px** 이 바뀌는 것을 찍었고, 그 열의 단면은
 *   `B13.5 F49.0 B7.0 D12.0` (부모 규약 `B7 F63 B7 D7`) = **위 베벨 두 겹 · 바닥 띠 +71%** 였다.
 *
 * 절 —
 *   [1] 선언 — 두 층의 «인셋 + 기둥 = 30» (값을 박지 않고 자리에서 유도한다)
 *   [2] 그린 것 — 직선부 열(코너 바로 뒤)의 세로 단면이 **부모 그라데이션 규약**과 같다
 *   [3] 음성항 — 코너 안(호 구간)에서는 이 층이 **살아 있어야** 한다 (기둥을 0/좁게 하면 그림이 바뀐다)
 *   [R] 되돌림 — 기둥을 30 으로 되돌리면 [2] 가 빨개진다 (무르게 푼 수리가 아님을 못박는다)
 *
 * ⚠ 끝 칸(378·449)은 `::before` 마스크가 아예 `none` 이라 이 자의 자리가 아니다 —
 *   그 갈림은 `verify96` [1-c] 가 «자리 규칙» 으로 따로 문다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
/* 914 (2026-09-05) — **이 자는 게임 루프를 세우지 않는다.** 그래서 자동 전투가 보스에게 지면
   `openDefeat()` 가 `#defw`(inset:0 · z39 · rgba(0,0,0,.62))를 켜고 **알약을 제자리에 둔 채 덮는다**.
   아래 대조는 전부 «두 장 사이에 흐른 200ms 동안 바뀐 것은 주입한 스타일뿐» 을 전제하므로
   그 딤이 창 안에 들면 [0] 이 **21,375px = 알약의 88%** 로 빨개진다(등재문 914 의 실측).
   처방은 540 이 이미 공용으로 적어 두었다 — 이 자가 그 줄을 안 읽고 있었을 뿐이다(907 교훈 ①). */
const { install, defeatStuck, defeatBlocked } = require('./closers540');
const { chromium } = pw();

/* 409 9회차 — R4b 이관. 옛 항은 «남은 차이 × 10 < 되돌림 신호» 라는 **비율**이었는데, AA 재래스터
   잔여(19px)는 신호 크기와 무관한 **고정 비용**이고 신호 쪽은 9회차에 294 → 168 로 줄었다
   (위 베벨 두 겹이 14 → 11 이 됐으므로 — R1 참조). 비율로 두면 «신호가 줄었다» 는 이유로
   빨개진다. ⇒ 잔여는 **절대 예산**으로, 신호는 **하한**으로 따로 묻는다(둘 다 물어야 뜻이 산다). */
const AA_BUDGET = 25;
const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', 'v463.png');
const R = 30;                                  /* 알약 반경 = 코너 기둥이 덮어야 할 폭 */
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61503C'], ['L', '#F2BC8D']];

/* 가운데 칸이 활성인 호스트 (마스크를 쓰는 갈래) */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
];

const maskCss = n => 'linear-gradient(90deg,#000 0 ' + n + 'px,transparent ' + n + 'px calc(100% - '
  + n + 'px),#000 calc(100% - ' + n + 'px))';
const injBefore = n => '.stab.on::before{-webkit-mask-image:' + maskCss(n) + '!important;mask-image:'
  + maskCss(n) + '!important}';
const KILL = '.stab.on::before{-webkit-mask-image:linear-gradient(90deg,transparent 0 100%)!important;'
  + 'mask-image:linear-gradient(90deg,transparent 0 100%)!important}';

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* 914 — «두 장이 **같은 화면**에서 찍혔나» 의 서명. 좌표만으로는 못 가른다: 전면 딤은 알약을
   제자리에 둔 채 덮는다. 그래서 «알약 중심에 무엇이 서 있나»(elementsFromPoint)를 같이 적는다.
   ⚠ 이름을 목록으로 두지 않는다 — `#defw` 만 묻는 자는 다음 껍데기가 오면 다시 조용해진다.
      묻는 것은 «덮은 것이 있는가» 이고, 무엇이 덮었는지는 실패 문구가 말한다(912 교훈 ②). */
const SIG = Object.create(null);
const screenSig = (page, sel) => page.evaluate(s => {
  const bar = document.querySelector(s);
  const on = bar && bar.querySelector(':scope > .stab.on');
  if (!on) return '활성 칸 없음';
  const r = on.getBoundingClientRect();
  const top = document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)[0];
  const nm = e => e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')
    + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '')) : '없음';
  return [r.x.toFixed(2), r.y.toFixed(2), r.width.toFixed(2), r.height.toFixed(2), nm(top)].join('|');
}, sel);

async function shoot(page, slot, sel) {
  if (sel) SIG[slot] = await screenSig(page, sel);
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, key]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      window['__g463' + key] = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('load fail'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, slot]);
}

/* 알약 국소 x 열의 세로 색 런 */
const column = (page, p, lx, slot) => page.evaluate(([box, x, key, pal]) => {
  const g = window['__g463' + key];
  const cls = (Rr, Gg, Bb) => {
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d = (Rr - rr) ** 2 + (Gg - gg) ** 2 + (Bb - bb) ** 2;
      if (d < bd) { bd = d; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let y = 0; y <= box.h - 0.5; y += 0.5) {
    const q = g.getImageData(Math.round(box.x + x), Math.round(box.y + y), 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, lx, slot, PAL]);

/* 알약 상자 안 두 슬롯의 픽셀 대조 — 국소 x 창(x0..x1) 으로 좁힐 수 있다.
   ⚠ **문턱 8 은 임의값이 아니다.** 마스크를 갈아 끼우면 코너 호가 다시 래스터되면서
   AA 한 칸이 ±1~3 만큼 흔들린다(주입 → 원복만 해도 34px 이 «달라진다» 고 나온다 —
   대조 실행으로 확인했다. 같은 창에서 시간만 흘리면 **0px** 이므로 이것은 시간 드리프트가
   아니라 재래스터 잡음이다). 이 자가 세려는 신호는 **띠 색이 통째로 바뀌는 것**이고
   그 최소 낙차는 `B(99,79,55)` ↔ `F(75,62,45)` = **24** 다. 문턱 8 은 잡음(≤3)과
   신호(≥24) 사이에 있고 어느 쪽에도 가깝지 않다 — 예산을 넓혀 «≤60 이면 같다» 로
   푸는 것과 다르다(그러면 진짜 결함 294px 의 1/5 까지 눈감는 자가 된다). */
const AA = 8;
/* `half` — null 이면 알약 전 높이, 'top'/'bot' 이면 위/아래 절반만 센다.
   ⚑ **409 17회차 신설.** 17회차가 `::after` 배경에서 «아래 코너 고리» 두 줄을 걷어냈으므로
      «배경을 끄면 코너가 바뀐다» 를 전 높이로 물으면 **위 코너 몫만으로 초록**이 된다
      (= 라벨이 «아래» 라고 적힌 항이 위를 세는 헛초록). 절반씩 따로 물어야 뜻이 산다. */
const diffCols = (page, p, x0, x1, a, b, half) => page.evaluate(([box, lo, hi, ka, kb, tol, hf]) => {
  const A = window['__g463' + ka], B = window['__g463' + kb];
  let y0 = Math.round(box.y), h = Math.round(box.h);
  if (hf === 'top') h = Math.round(h / 2);
  else if (hf === 'bot') { const c = Math.round(h / 2); y0 += c; h -= c; }
  const w = Math.max(0, Math.round(hi) - Math.round(lo));
  if (!w) return 0;
  const da = A.getImageData(Math.round(box.x + lo), y0, w, h).data;
  const db = B.getImageData(Math.round(box.x + lo), y0, w, h).data;
  let n = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d > tol) n++;
  }
  return n;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, x0, x1, a, b, AA, half || null]);

function runs(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], (j - i) * step]); i = j; }
  return rs;
}
const fmt = rs => rs.map(r => r[0] + r[1].toFixed(1)).join(' ');
/* 위 베벨 = 알약 상변에서 시작하는 첫 `B` 런. 부모 규약은 **7.0** 이다(437 §ⓑ · 352 «7 규약»). */
const topBevel = s => { const rs = runs(s); return rs[0] && rs[0][0] === 'B' ? rs[0][1] : 0; };
/* 면색 F 의 가장 긴 런 — 부모 규약은 63.0 이다 */
const faceRun = s => Math.max(0, ...runs(s).filter(r => r[0] === 'F').map(r => r[1]));

/* 409 11회차 이관 (2026-08-31) — **기둥은 «첫 층» 이다.** 11회차가 `::after` 마스크에 «어깨» 를
   오려 내는 `radial-gradient` 층 넷(원판 2 · 보호 2)을 `mask-composite` 로 얹으면서 마스크가
   다층이 됐다. 오른쪽 기둥을 **문자열 끝**(`$`)으로 찾던 옛 자는 그 순간 `NaN` 을 돌려주고
   빨개진다 — 결함이 아니라 자의 전제(«마스크 = 한 층»)가 낡은 것이다.
   ⚠ **기대값을 늘리는 이관이 아니다** — 묻는 것은 그대로 «인셋 + 기둥 = 30» 이고, 자리만
      «첫 층» 으로 좁힌다. 기둥 층 자체가 사라지면 여전히 `NaN` 으로 빨개진다. */
const firstLayer = mask => String(mask || '').split(/,\s*radial-gradient/)[0];
const pillarOf = mask => {
  const m = firstLayer(mask);
  const l = /linear-gradient\(90deg, rgb\(0, 0, 0\) 0px, rgb\(0, 0, 0\) ([\d.]+)px/.exec(m);
  const r = /rgb\(0, 0, 0\) calc\(100% - ([\d.]+)px\)\)?\s*$/.exec(m.trim());
  return { l: l ? +l[1] : NaN, r: r ? +r[1] : NaN };
};

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    /* 914 — 껍데기 걷개. `arm` 은 `openDefeat` 의 **제품 경로는 그대로 부르고**(표시 전용 · 자동
       부활은 진행) 껍데기만 즉시 걷으며 막은 횟수를 센다 — 판정을 바꾸지 않는다(540 규약). */
    await install(page, { arm: true });
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    const setStyle = async css => {
      await page.evaluate(c => {
        let s = document.getElementById('g463');
        if (!c) { if (s) s.remove(); return; }
        if (!s) { s = document.createElement('style'); s.id = 'g463'; document.head.appendChild(s); }
        s.textContent = c;
      }, css);
      await page.waitForTimeout(200);
    };

    let mid = 0;
    for (const [hname, sel, setup] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(800);
      const info = await page.evaluate(s => {
        const bar = document.querySelector(s);
        if (!bar) return null;
        const on = bar.querySelector(':scope > .stab.on');
        if (!on) return null;
        const b = on.getBoundingClientRect();
        const bf = getComputedStyle(on, '::before'), af = getComputedStyle(on, '::after');
        return {
          x: b.x, y: b.y, w: b.width, h: b.height,
          bLeft: bf.left, bRight: bf.right, bTop: bf.top, bBottom: bf.bottom, bR: bf.borderRadius,
          bMask: bf.maskImage || bf.webkitMaskImage || '',
          aLeft: af.left, aRight: af.right, aMask: af.maskImage || af.webkitMaskImage || '',
        };
      }, sel);
      if (!info) { console.log('\n▣ ' + hname + ' — 활성 칸 없음'); continue; }
      mid++;
      console.log('\n▣ ' + hname + '  알약 ' + info.w.toFixed(1) + '×' + info.h.toFixed(1));

      /* ---------- [1] 선언 — 인셋 + 기둥 = 30 ---------- */
      console.log('[1] 선언 — 기둥 폭은 그 층의 좌표다 (인셋 + 기둥 = 알약 반경 30)');
      const bIn = { l: parseFloat(info.bLeft), r: parseFloat(info.bRight) };
      const aIn = { l: parseFloat(info.aLeft), r: parseFloat(info.aRight) };
      const bp = pillarOf(info.bMask), ap = pillarOf(info.aMask);
      /* ⚑ **409 8회차 이관 (2026-08-31)** — 세로가 «7px · r23» 에서 «4px · 아래 세로 반경 26» 으로 갔다.
         463 이 지키는 것은 «기둥 폭 = 30 − 가로 인셋» 이라는 **가로** 불변식이고 거기엔 변화가 없다.
         세로는 값 대신 같은 꼴의 불변식(세로 인셋 + 아래 세로 반경 = 30 = 코너 중심 y 가 알약과 같다)
         으로 옮긴다 — 옛 7+23 도 새 4+26 도 참이고, 동심이 깨질 때만 빨개진다. */
      /* 409 12회차 이관 (2026-08-31) — 위·아래 세로 반경이 갈렸다(위 26 · 아래 28.5). 한 값으로
         위·아래를 같이 묻던 자를 **코너별**로 옮긴다 — 불변식(인셋 + 그 코너 세로 반경 = 30)은
         한 글자도 안 바뀌고, 이제 한쪽만 어긋나도 빨개진다. */
      const vrs463 = (info.bR.split('/')[1] || info.bR).trim().split(/\s+/);
      const vrb463 = parseFloat(vrs463[vrs463.length - 1]);   /* 아래 */
      const vrt463 = parseFloat(vrs463[0]);                   /* 위 */
      ok(hname + ' — `::before` 상자는 동심 안쪽 윤곽(가로 7 인셋 · rx23 · 코너별 «세로 인셋 + 세로 반경 = 30»)',
        bIn.l === 7 && bIn.r === 7 && /^23px/.test(info.bR) && vrb463 > 23.5 && vrt463 > 23.5
          && Math.abs(parseFloat(info.bTop) + vrt463 - 30) < 0.6
          && Math.abs(parseFloat(info.bBottom) + vrb463 - 30) < 0.6,
        [info.bLeft, info.bRight, info.bTop, info.bBottom, info.bR].join(' / '));
      ok(hname + ' — `::before` 기둥 = 30 − 인셋 = ' + (R - bIn.l) + '/' + (R - bIn.r) + ' (463)',
        Math.abs(bp.l - (R - bIn.l)) < 0.01 && Math.abs(bp.r - (R - bIn.r)) < 0.01,
        '좌 ' + bp.l + ' · 우 ' + bp.r);
      ok(hname + ' — `::after`(링) 는 인셋 0 이라 같은 불변식이 **30** 을 준다 (짝이 어긋나지 않았다)',
        aIn.l === 0 && aIn.r === 0 && Math.abs(ap.l - R) < 0.01 && Math.abs(ap.r - R) < 0.01,
        '인셋 ' + info.aLeft + '/' + info.aRight + ' · 기둥 ' + ap.l + '/' + ap.r);

      /* ---------- [2] 그린 것 — 직선부 열이 부모 규약대로다 ---------- */
      await shoot(page, 'N', sel);
      /* [0] **이 실행의 잡음 바닥을 스스로 잰다.** 예산을 손으로 정하지 않기 위해서다 —
         마스크를 갈아 끼우면 코너 호가 다시 래스터되면서 몇 픽셀이 흔들린다(시간만 흘리면 0px 이니
         드리프트가 아니다). 지금 값(23)을 **그대로** 한 번 덮었다 걷은 뒤의 차이가 곧 그 바닥이고,
         아래 음성항·되돌림 항은 전부 이 바닥에 견줘 판정한다. 바닥이 커지면 자가 저절로 엄해진다. */
      await setStyle(injBefore(23)); await shoot(page, 'F0', sel);
      const noise0 = await diffCols(page, info, 0, Math.round(info.w), 'N', 'F0');
      await setStyle(null); await shoot(page, 'Z0', sel);
      const noise = Math.max(noise0, await diffCols(page, info, 0, Math.round(info.w), 'N', 'Z0'));
      /* ⚑ **914 신설 — 이 항이 [0] 보다 먼저다.** [0] 은 «바뀐 픽셀 수» 만 말할 수 있어서,
         200ms 창 안에 화면이 갈리면 «21,375px» 이라는 **뜻 없는 수**로 빨개진다(등재문 914).
         그 수는 결함을 말하지 않는다 — «두 장이 다른 화면이었다» 를 말한다. 그래서 그것부터 묻고,
         실패 문구가 **무엇이 덮었는지**를 이름으로 말하게 한다(912 교훈 ②: «틀렸다» 가 아니라
         «무엇이 어떻게 틀렸다»). 여기가 초록이어야 [0] 의 수가 뜻을 가진다. */
      const sigs = ['N', 'F0', 'Z0'].map(k => SIG[k]);
      ok(hname + ' [0-화면] 대조 세 장이 **같은 화면**에서 찍혔다 (알약 좌표 · 알약을 덮은 것이 같다)',
        sigs.every(s => s === sigs[0]),
        sigs.map((s, i) => ['N', 'F0', 'Z0'][i] + '「' + s + '」').join('  '));
      ok(hname + ' [0] 같은 값(23)을 덮었다 걷으면 그림이 안 바뀐다 (이 자의 대조는 시간 드리프트를 안 탄다)',
        noise === 0, noise + 'px (문턱 ' + AA + ')');
      const LX = [['좌', R + 3], ['우', Math.round(info.w) - R - 3]];   /* 코너 바로 뒤 = 옛 기둥이 남던 자리 */
      console.log('[2] 그린 것 — 코너 바로 뒤 열(알약 x ' + LX.map(v => v[1]).join('/') + ')이 부모 그라데이션 규약과 같다');
      for (const [side, lx] of LX) {
        const s = await column(page, info, lx, 'N');
        const tb = topBevel(s), fr = faceRun(s);
        ok(hname + ' ' + side + ' — 위 베벨 7±1.5 (두 겹이면 13~14)', Math.abs(tb - 7) <= 1.5, tb.toFixed(1) + 'px   ' + fmt(runs(s)));
        ok(hname + ' ' + side + ' — 면색 F ≥ 58 (부모 규약 63)', fr >= 58, fr.toFixed(1) + 'px');
      }

      /* ---------- [R] 되돌림 — 30 으로 되돌리면 [2] 가 빨개진다 ---------- */
      /* ⚠ **절 순서가 규약이다: [R] 이 [3] 보다 **먼저** 온다.** [3] 은 이 층을 통째로 죽였다
         살리는 주입이라 코너 호의 AA 가 몇 칸 남는다(대조 실측 ≤11px). 그 뒤에 되돌림을 재면
         그 잔여가 «되돌려도 코너가 바뀐다» 는 **거짓 신호**로 읽힌다 — 깨끗한 상태에서 먼저 잰다
         (이 순서에서 코너 잔여는 **0px** 이다). */
      console.log('[R] 되돌림 — 기둥을 30(수리 전 값)으로 되돌린다');
      await setStyle(injBefore(30)); await shoot(page, 'R');
      let worst = 0, worstS = '';
      for (const [, lx] of LX) {
        const s = await column(page, info, lx, 'R');
        const tb = topBevel(s);
        if (tb > worst) { worst = tb; worstS = fmt(runs(s)); }
      }
      /* ⚑ **409 9회차 이관** — «두 겹» 의 두께는 산수로 정해진다: 부모의 위 베벨(0..7) ∪ 이 층의
         위 베벨. 8회차 전에는 이 층이 7..14 라 합집합 0..14 = 14 였고, 9회차가 위 코너도 타원
         (인셋 4 · ry26)으로 옮기면서 4..11 이 되어 합집합 **0..11 = 11**(AA 한 칸 빼면 10.5)이다.
         ⇒ 선을 **10.0** 으로 옮긴다. 수리된 상태는 여전히 **7.0** 이라 두 상태 사이는 그대로 비어 있다. */
      ok(hname + ' R1 — 되돌리면 위 베벨이 두 겹(≥10px)이 된다 ([2] 가 공허하지 않다)',
        worst >= 10, worst.toFixed(1) + 'px   ' + worstS);
      const dBack = await diffCols(page, info, R, Math.round(info.w) - R, 'N', 'R');
      ok(hname + ' R2 — 되돌림이 바꾸는 것은 **직선부**다 (코너 밖 열에서만 픽셀이 다르다)',
        dBack > Math.max(100, noise * 8), dBack + 'px  (> max(100, 바닥×8 = ' + noise * 8 + '))');
      /* R3 — 코너 창은 **0..28** 로 잡는다. 29~30 은 마스크 정지점 그 자체가 놓이는 열이라
         23 ↔ 30 이 그 한 열의 AA 를 다르게 그린다(측정: 0..30 창이면 7px, 0..28 창이면 0px).
         «수리가 코너 **호**를 안 건드렸다» 를 묻는 항이므로 정지점 열은 빼고 묻는 것이 맞다 —
         예산을 넓히는 것과 다르다(창 밖 한 열도 위 R2 가 직선부 신호로 이미 세고 있다). */
      const dBackCorner = await diffCols(page, info, 0, R - 2, 'N', 'R');
      ok(hname + ' R3 — 되돌려도 코너 호(0..' + (R - 2) + ')는 잡음 바닥 안 (463 은 코너를 안 건드린 수리다)',
        dBackCorner <= noise, dBackCorner + 'px ≤ 바닥 ' + noise);
      await setStyle(null);
      await shoot(page, 'Z');
      /* R4 — «주입이 남지 않았다» 를 **비트 동일**로 물으면 안 된다. 값이 다른 마스크를 한 번
         갈아 끼우면 코너 **호의 AA** 가 몇 칸 다시 그려져 원복해도 10~15px 이 남는다(같은 값을
         덮었다 걷는 [0] 은 0px 이므로 시간 드리프트가 아니라 재래스터다). 그래서 둘로 나눠 묻는다:
           ⓐ 뜻 — 문제의 열이 **수리 후 단면**(위 베벨 7)으로 돌아왔는가 (AA 에 안 흔들린다)
           ⓑ 양 — 남은 차이가 되돌림 신호(294px)의 **1/10 미만**인가 (주입이 통째로 남았으면 294 급이다) */
      let backOk = true, backD = '';
      for (const [side, lx] of LX) {
        const tb = topBevel(await column(page, info, lx, 'Z'));
        if (Math.abs(tb - 7) > 1.5) backOk = false;
        backD += side + ' ' + tb.toFixed(1) + 'px  ';
      }
      ok(hname + ' R4a — 주입을 걷으면 그 열이 **수리 후 단면**으로 돌아온다 (위 베벨 7)', backOk, backD);
      const dRestore = await diffCols(page, info, 0, Math.round(info.w), 'N', 'Z');
      ok(hname + ' R4b — 남은 차이는 코너 호 AA 몫뿐 (되돌림 신호의 1/10 미만)',
        dRestore <= AA_BUDGET && dBack >= 100,
        dRestore + 'px ≤ AA 예산 ' + AA_BUDGET + ' · 되돌림 신호 ' + dBack + 'px ≥ 100');
      /* ---------- [3] 음성항 — 코너 안에서는 이 층이 살아 있다 ---------- */
      console.log('[3] 음성항 — 호 구간(알약 x 0..30)에서는 이 층이 살아 있어야 한다');
      await setStyle(KILL); await shoot(page, 'K');
      const dKill = await diffCols(page, info, 0, R, 'N', 'K');
      ok(hname + ' — 기둥을 0 으로 죽이면 코너가 바뀐다 (이 층이 코너를 실제로 그린다)',
        dKill > Math.max(100, noise * 8), dKill + 'px  (> max(100, 바닥×8 = ' + noise * 8 + '))');
      /* ⚑ **409 14회차 이관 (2026-08-31)** — **이 항은 `::before` 기둥의 몫만 재야 한다.**
         14회차가 `::after` 배경에 «아래 코너 등폭 고리» 를 한 겹 얹었는데(코너 띠 블록 D+B
         10.0 → **11.0** = ref), 그 고리가 이 항이 세던 42px 중 **3px 을 같은 색으로 덮는다**
         (42 → 39). 문턱 40 은 그대로 두고 **비교 대상을 바꾼다** — 두 장 다 고리를 끈 채로 찍으면
         `::after` 는 두 장에서 동일하므로 차분에서 지워지고, 남는 것은 `::before` 기둥의 몫뿐이다.
         ⚠ 문턱을 내려서 풀지 않았다 — 내리면 «고리가 통째로 사라져도 초록» 이 된다.
            고리 자체는 `verify409` 와 아래 [3-고리] 가 따로 문다. */
      const RINGOFF = '.stab.on::after{background-image:none!important}';
      await setStyle(RINGOFF); await shoot(page, 'T');
      await setStyle(RINGOFF + injBefore(16)); await shoot(page, 'S');
      const dNarrow = await diffCols(page, info, 0, R, 'T', 'S');
      ok(hname + ' — 기둥을 16 으로 좁히면 코너가 바뀐다 (23 은 «호를 다 덮는» 하한이다)',
        dNarrow > Math.max(40, noise * 4), dNarrow + 'px  (> max(40, 바닥×4 = ' + noise * 4 + '))');
      /* 409 14회차 신설 · **17회차에 방향을 갈아 끼웠다**(333 처방 — 자리를 비우지 않는다).
         14회차의 «배경을 끄면 코너가 바뀐다» 는 그때 배경이 위·아래 네 겹이라 성립했다.
         17회차가 **아래 두 겹을 걷어냈으므로**(그 고리는 1.32px 틀린 ref 읽기 위에 서 있었다 —
         제품 주석 참조) 같은 질문을 전 높이로 던지면 **위 코너 몫만으로 초록**이 된다.
         ⇒ 절반씩 따로 묻는다. 두 항이 곧 17회차 결정의 되돌림 시험이다 —
           · 위: 16회차 타원 고리가 사라지면 빨갛다.
           · 아래: 누가 아래 코너 고리를 **다시 얹으면** 그 즉시 빨갛다(Δ0 이 깨진다). */
      const dRingT = await diffCols(page, info, 0, R, 'N', 'T', 'top');
      ok(hname + ' [3-고리] — 배경을 끄면 **위** 코너가 바뀐다 (16회차 타원 고리가 공허하지 않다)',
        dRingT > Math.max(20, noise * 4), dRingT + 'px  (> max(20, 바닥×4 = ' + noise * 4 + '))');
      const dRingB = await diffCols(page, info, 0, R, 'N', 'T', 'bot');
      ok(hname + ' [3-고리] — 배경을 끄면 **아래** 코너는 Δ0 (17회차: 아래 코너는 배경이 안 그린다)',
        dRingB <= Math.max(AA_BUDGET, noise), dRingB + 'px ≤ max(AA 예산 ' + AA_BUDGET + ', 바닥 ' + noise + ')');
      await setStyle(null);

    }

    console.log('\n[4] 표본');
    ok('마스크를 쓰는 «가운데 칸» 호스트가 둘 다 있다 (한 곳만이면 규칙을 지워도 초록이 된다)',
      mid >= 2, mid + '곳');
    /* 914 — 걷개가 **실제로 돌았는지**를 같이 찍는다. 늘 0 인 팔은 아무것도 증명하지 않는다
       (LESSONS 353-④). 0 이어도 빨갛게 하지는 않는다 — 실행마다 죽는 판이 있고 없고가 갈리는 것은
       자동 전투의 몫이지 결함이 아니다. 대신 «켜진 채 남았나» 는 판정한다: 켜진 채면 그 뒤 대조가
       전부 딤 위에서 찍힌 것이라 [2]·[R]·[3] 의 단면이 통째로 뜻을 잃는다. */
    const dBlocked = await defeatBlocked(page);
    const dStuck = await defeatStuck(page);
    ok('18 패배 딤(`#defw`)이 측정 끝에 켜진 채로 남지 않았다 (켜지면 알약을 제자리에서 덮는다 — 914)',
      dStuck === false, '켜짐 ' + dStuck + ' · 막은 횟수 ' + (dBlocked == null ? '계측 없음' : dBlocked + '회'));
    console.log('\n[5] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 90) : ''));

    console.log('\nVERIFY463 ' + (fail ? fail + ' FAIL / ' : '') + pass + '/' + (pass + fail)
      + (fail ? '' : '  ALL PASS'));
    process.exitCode = fail ? 1 : 0;
  } finally { await browser.close(); }
})();
