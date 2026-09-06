/* 작업 449 게이트 — «끝 칸(378)의 «셸에 닿는 면» 도 동심인가».
 *
 *   node tools/verify449.js
 *
 * 잡는 것 하나:
 *   409 는 활성 알약의 테두리를 «가로 평행이동 밴드» 에서 «동심 등폭 링» 으로 옮겼는데,
 *   **378 이 셸에 넘긴 그 한 면만** 그 이사를 못 했다(4회차가 일부러 남긴 절반 — 449 등재문).
 *   그 면에는 검정이 없어 `::before` 를 «검정의 안쪽 윤곽»(사방 7 인셋)으로 걸면 윤곽이 x≈11 로
 *   휘어 베벨과의 사이 4px 이 면색으로 뜬다. ⇒ 상자를 **안으로** 미는 대신 그 면의 가로 인셋을
 *   **0** 으로 둬서 옛 상자가 그대로 알약 코너 중심(30,30)을 도는 **동심**이 되게 했다.
 *
 * ⚑ **목표값은 ref 에서 뽑았다** — `python3 tools/probe449.py`(03 «던전» = 저장소 안에서 «활성
 *   끝 칸» 이 찍힌 유일한 레퍼런스. 06 활성 첫 칸은 바 **밖으로** 삐져나와 좌·우 모두 검정 7 을
 *   가지므로 «닿는 면» 의 표본이 아니다 — 측정표 06 §4-3). 그 우하 코너 실측:
 *       15°/30°/45°/60°/75°  →  **D 2.0/3.5/5.5/5.5/5.0**  →  **B 6.0/7.0/5.5/6.0/6.0**  → 면
 *   즉 이 면의 **가장 바깥은 어두운 띠**이고 베벨은 그 뒤다. 수리 전 우리는 순서가 **거꾸로**였다
 *   (`B → D → B`, 그 앞 B 는 `--pill-l` 가로 밴드라 75° 에서 **2.5px**).
 *
 * ⚑ **무른 게이트가 안 되게 다섯 겹으로 문다**(LESSONS 328·334 · 409 §3-1):
 *     [1] 선언 — 닿는 면만 인셋 0 (반대 면은 7 그대로 = «둘 다 밀지 않았다»)
 *     [2] 순서 — 아래 코너의 **가장 바깥 실런이 D** 다 (ref 와 같은 순서)
 *     [3] 두께 — 그 D 가 ≥4.0 이고 뒤따르는 B 가 ≥4.0
 *     [4] 위 코너 — 첫 실런이 B 이고 **5.0~8.0**(수리 전 9.0~9.5 = 두 밴드가 겹쳐 +29% 과중)
 *     [5] 음성항 — 반대 면(셸에 **안** 닿는)은 여전히 검정이 가장 바깥이다 (378 을 안 깼다)
 *   그리고 [R]/[R2] 가 되돌림을 문다 — 인셋 7 을 도로 주입하면 순서가 뒤집히고(R1) 그 밴드가
 *   75° 에서 눌리며(R2), 4회차가 걸렀던 «새 상자» 를 주입하면 위 코너에 **면색 갭**이 생긴다(R3).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품(한 틱) */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '449v.png');
const R = 30;
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61503C']];

/* 각도 — 0° = 변 한복판(직선부와 만나는 자리) · 90° = 상/하변.
   아래 코너의 «띠» 는 **바닥 쪽**에서만 두꺼운 것이 정답이다(0° 는 ref 도 0 이다 — probe449.py). */
const DARK_DEGS = [45, 60, 75];
const TOP_DEGS = [0, 15, 30, 45, 60, 75];
const MIN_DARK = 4.0;   /* ref 5.0~5.5 · 수리 후 5.5~6.5 · 수리 전 이 자리는 D 가 아예 바깥이 아니었다 */
const MIN_BEV = 4.0;    /* 띠 뒤 베벨 — ref 5.5~7.0 · 수리 후 6.0~7.0 */
const TOP_LO = 5.0, TOP_HI = 8.0;  /* 위 코너 — ref 안쪽 림 7~8(측정표 03 §4-3) · 수리 전 9.0~9.5 */

/* 끝 칸을 강제로 활성으로 만들어 잰다(verify378 과 같은 진입 경로·같은 주입).
   ⚠ 23 훈련(#trSubs)은 renderUI() 가 매 틱 `.on` 을 상태에서 다시 그려 주입이 되돌려진다 —
      자연 활성 칸이 이미 끝 칸(칸1)이라 그 자리만 잰다(강제 없음). */
const HOSTS = [
  ['06 장비', '#eqTabs', () => { goTab('hero', true); heroSubGo('eq'); }, [0, 3]],
  /* ⚠ `openShopPage()` 만 부르면 **06 시트가 열린 채** 위에 얹혀 광선이 통째로 셸 위를 지난다
     (rect 는 바를 가리키는데 찍힌 픽셀은 시트다 — 1회차에 10 상점 4항이 그렇게 빨갰다).
     verify409 가 이 호스트 앞에 03 던전을 두는 것과 같은 뜻으로 `goTab('hero')` 를 먼저 부른다. */
  ['10 상점', '#shopCats', () => { goTab('hero'); openShopPage(); }, [0, 2]],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, [null]],
];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d === undefined ? '' : ' — ' + d)); }
  else { fail++; console.log('  FAIL ' + n + (d === undefined ? '' : ' — ' + d)); }
};

/* 60 쥬시의 시트·페이지 등장 애니메이션이 끝나기를 기다린다 — 안 기다리면 **rect 와 찍힌 픽셀이
   다른 순간**을 잡아 10 상점처럼 광선이 통째로 셸 위를 지난다(verify409 와 같은 헬퍼). */
const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* 967 — `SETON` 은 **선언째 지웠다**(402 «사본을 지운다» · 963 «남기면 다음 세션이 다시 두 evaluate 로 쓴다»).
   심는 손잡이는 공용 부품 `__stab967.set`(`tools/stab967.js`) 하나이고, 아래 `SET_READ` **안에서**
   불린다 — «켜기 → 읽기» 가 구조적으로 한 틱이다.

   ⚑ 이 자는 캡처(`shoot`)로 채점하므로 **읽은 뒤에도 틱을 넘는다.** 그래서 두 겹이다:
     ① 켜기·읽기는 한 evaluate    ② 캡처 구간은 핀으로 붙들고 **캡처 직후 되읽어 점수 줄로 문다**
     (핀만으로는 16ms 창이 남는다 — 967 §«핀은 덮는 장치»). */
const SET_READ = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const idx = window.__stab967.set(sel, i);
  if (idx === -2) return null;
  const on = bar.querySelector(':scope > .stab.on');
  if (!on) return null;
  const cs = getComputedStyle(on, '::before');
  const b = on.getBoundingClientRect();
  return { idx, want: i == null ? idx : i,
    x: b.x, y: b.y, w: b.width, h: b.height, l: cs.left, r: cs.right,
    label: (on.querySelector('i') || {}).textContent || '' };
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
      window.__v449v = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

/* 코너 원 중심에서 각도 deg 로 쏜 광선을 0.5px 간격으로. d = 윤곽에서 안쪽으로.
   ⚠ **윤곽 바깥은 안 읽는다** — 닿는 면 바로 밖은 셸의 검정 테두리라, 밖을 읽으면 378 이 넘긴
      면에서도 «검정이 있다» 로 읽혀 [5] 음성항이 통째로 죽는다(verify409 와 같은 규약). */
const ray = (page, p, corner, deg) => page.evaluate(([box, cor, dg, pal, r]) => {
  const g = window.__v449v;
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
/* 윤곽에서 시작하는 «실한 런» 들 — 이음매(<1.5px 중간색)는 건너뛴다.
   ⚠ D(#413122) 와 B(#634F37) 의 안티에일리어싱은 정확히 F(#4B3E2D) 로 분류된다(둘의 중간색이다) —
      ref 표본에도 같은 자리에 `F1.0~2.0` 이 낀다(probe449.py). 그래서 «실한 런» 만 이어 읽는다. */
const solid = s => runs(s).filter(r => r[1] >= 1.5);
/* «가장 바깥 런 **뒤**의 다음 층» — 이음매(<2.0px)를 건너뛰고 첫 실한 층을 돌려준다.
   ⚠ 2.0 은 probe409b 2회차가 정한 이음매 폭과 같은 값이다. D 와 B 의 AA 는 정확히 F 로 분류되고
      (둘의 중간색) ref 표본도 같은 자리에 `F1.0~2.0` 을 낸다 — 그 한 칸을 «면색 갭» 으로 읽으면
      ref 자신이 빨개진다. 대신 **2.0 이상인 F** 는 그대로 갭으로 읽힌다([R3] 가 그것을 문다). */
function nextLayer(rs, from) {
  let i = from + 1;
  while (rs[i] && rs[i][1] < 2.0) i++;
  return rs[i] || ['-', 0];
}
const fmt = a => a.map(([c, n]) => c + n.toFixed(1)).join(' ');

(async () => {
  const browser = await launch(chromium);
  let touchFaces = 0, farFaces = 0, forced = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    console.log('══════ VERIFY 449 — 끝 칸의 «셸에 닿는 면» 도 동심인가 ══════');

    /* ---- [1] 선언 ---- */
    console.log('\n[1] 선언 — 닿는 면의 가로 인셋만 0 (반대 면은 7 그대로)');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(900);
    await page.evaluate(SETTLE);
    const d1 = await page.evaluate(() => {
      const on = document.querySelector('#eqTabs > .stab.on');
      const cs = getComputedStyle(on, '::before');
      return { l: cs.left, r: cs.right, t: cs.top, b: cs.bottom, rad: cs.borderRadius };
    });
    ok('[1] 06 장비 첫 칸 — 닿는 면(좌) 인셋 0', d1.l === '0px', d1.l);
    ok('[1] 06 장비 첫 칸 — 반대 면(우) 인셋 7 그대로 («둘 다 밀지 않았다»)', d1.r === '7px', d1.r);
    ok('[1] 06 장비 첫 칸 — 세로 인셋 0 · 반경 30 (이 둘이 이미 알약과 같아 동심이 된다)',
      d1.t === '0px' && d1.b === '0px' && /^30px/.test(d1.rad), d1.t + ' / ' + d1.b + ' / ' + d1.rad);

    /* ---- [2]~[5] 실측 ---- */
    for (const [name, sel, setup, idxs] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(900);
      await page.evaluate(SETTLE);
      for (const i of idxs) {
        /* 967 — 켜기와 읽기가 한 evaluate 다(전에는 `SETON` → 500ms → `SETTLE` → 읽기 세 evaluate 였다). */
        const g = await page.evaluate(SET_READ, [sel, i]);
        if (!g) { ok('[전제] ' + name + ' 칸' + (i == null ? '(자연)' : i + 1) + ' 활성 칸을 읽었다', false, '없음'); continue; }
        /* 967 — «켠 칸을 그대로 쟀는가». 전에는 되읽은 칸을 말없이 채점했다(칸1 이 두 번 재지고
           칸3 은 한 번도 안 재지면서 점수 줄 수는 그대로 = 초록). 이제는 빨개진다. */
        ok('[전제] ' + name + ' 칸' + (i == null ? '(자연)' : i + 1) + ' — 켠 칸을 그대로 쟀다 (한 틱 · 967)',
          g.idx === g.want, '켠 칸 ' + (g.want + 1) + ' → 잰 칸 ' + (g.idx + 1));
        if (g.idx !== g.want) continue;
        if (i != null) forced++;
        /* 어느 면이 셸에 닿는가 = 인셋 0 인 쪽. 둘 다 7 이면 가운데 칸이라 이 자가 볼 자리가 아니다. */
        const left = g.l === '0px', right = g.r === '0px';
        if (!left && !right) continue;
        const tag = name + ' 칸' + (i == null ? '(자연)' : i + 1) + '«' + g.label + '»';
        const near = left ? ['TL', 'BL'] : ['TR', 'BR'];
        const far = left ? ['TR', 'BR'] : ['TL', 'BL'];
        /* 967 — 캡처 구간은 틱을 넘는다 ⇒ 핀으로 붙들고 **캡처 직후 되읽어 점수 줄로** 묻는다. */
        if (i != null) await page.evaluate(([s, k]) => window.__stab967.pin(s, k), [sel, i]);
        await shoot(page);
        const after = await page.evaluate(([s]) => window.__stab967.on(s), [sel]);
        if (i != null) await page.evaluate(() => window.__stab967.unpin());
        ok('[전제] ' + tag + ' — 캡처 사이에 활성이 안 바뀌었다 (967)',
          after === g.idx, '캡처 전 칸' + (g.idx + 1) + ' → 캡처 뒤 칸' + (after + 1));
        if (after !== g.idx) continue;

        /* [2][3] 닿는 면 **아래** 코너 — 가장 바깥이 D, 그 뒤가 B */
        const dk = [], bv = [], head = [], bleed = [];
        for (const dg of DARK_DEGS) {
          let all = runs(await ray(page, g, near[1], dg));
          /* ⚠ **셸 테두리의 AA 한 칸**을 건너뛴다. 이 면 바로 밖은 셸의 검정이고(378 이 넘긴 그 검정)
             알약 우변이 소수 좌표(예: 1009.0 ↔ rect x 765.75 + w 243.25)라 d=0 표본이 반 픽셀
             바깥에 앉는 각도가 있다. **무른 예외가 아니다** — 건너뛰는 폭을 2.5px 로 못박고
             그보다 두꺼운 검정이 나오면 아래 항이 «378 이 깨졌다» 로 빨개진다(알약 자신의 링은 7 이다). */
          const lead = all[0] && all[0][0] === 'K' ? all[0][1] : 0;
          bleed.push(dg + '°:' + lead.toFixed(1));
          if (lead > 0 && lead <= 2.5) all = all.slice(1);
          const rs = all.filter(r => r[1] >= 1.5);
          head.push(rs[0] ? rs[0][0] : '-');
          dk.push(rs[0] && rs[0][0] === 'D' ? rs[0][1] : 0);
          const at = all.indexOf(rs[0]);
          const nx = at < 0 ? ['-', 0] : nextLayer(all, at);
          bv.push(nx[0] === 'B' ? nx[1] : 0);
        }
        ok('[2] ' + tag + ' ' + near[1] + ' — 가장 바깥 실런이 **어두운 띠 D** 다 (ref 와 같은 순서)',
          head.every(h => h === 'D'), DARK_DEGS.map((d, j) => d + '°:' + head[j]).join(' '));
        ok('[2] ' + tag + ' ' + near[1] + ' — 이 면에 알약 자신의 검정은 없다 (셸 테두리 AA ≤2.5px · 378 무손상)',
          bleed.every(t => parseFloat(t.split(':')[1]) <= 2.5), bleed.join(' '));
        ok('[3] ' + tag + ' ' + near[1] + ' — 그 띠가 ≥ ' + MIN_DARK.toFixed(1) + 'px',
          dk.every(v => v >= MIN_DARK), DARK_DEGS.map((d, j) => d + '°:' + dk[j].toFixed(1)).join(' '));
        ok('[3] ' + tag + ' ' + near[1] + ' — 띠 **뒤** 베벨이 ≥ ' + MIN_BEV.toFixed(1) + 'px (순서가 D→B)',
          bv.every(v => v >= MIN_BEV), DARK_DEGS.map((d, j) => d + '°:' + bv[j].toFixed(1)).join(' '));

        /* [4] 닿는 면 **위** 코너 — 첫 실런 B 가 등폭(5.0~8.0) */
        const tp = [];
        for (const dg of TOP_DEGS) {
          const rs = solid(await ray(page, g, near[0], dg));
          tp.push(rs[0] || ['-', 0]);
        }
        ok('[4] ' + tag + ' ' + near[0] + ' — 첫 실런이 베벨 B 이고 ' + TOP_LO + '~' + TOP_HI + 'px (수리 전 9.0~9.5)',
          tp.every(r => r[0] === 'B' && r[1] >= TOP_LO && r[1] <= TOP_HI), fmt(tp));
        touchFaces++;

        /* [5] 음성항 — 반대 면은 여전히 **검정이 가장 바깥**이다(378 을 안 깼다 = «다 지웠다» 와 구분).
           ⚠ 두께는 **0°·75°** 에서만 문다. 30° 는 그 면의 `::before` 가 아직 옛 상자(가로 인셋 7)라
              원이 7 어긋나 검정 안쪽을 파고드는 자리다(06 칸4 좌상 30° = `K4.5 F7.0 B2.5`).
              그 반쪽은 449 의 범위가 아니라 **462** 로 등재했다 — 여기서는 값을 **찍기만** 한다.
              (숨기는 게 아니다: 아래 [5-기록] 이 30° 값을 매 실행 출력한다.) */
        const fk = [], frec = [];
        let farOk = true;
        for (const cor of far) {
          const rs0 = solid(await ray(page, g, cor, 0));
          const h0 = rs0[0] ? rs0[0][0] : '-', t0 = rs0[0] ? rs0[0][1] : 0;
          fk.push(cor + ' 0°:' + h0 + t0.toFixed(1));
          if (h0 === 'K' && t0 >= 5.0) farFaces++; else farOk = false;
          const rec = [];
          for (const dg of [30, 75]) {
            const rs = solid(await ray(page, g, cor, dg));
            rec.push(dg + '°:' + (rs[0] ? rs[0][0] + rs[0][1].toFixed(1) : '-'));
          }
          frec.push(cor + ' ' + rec.join(' '));
        }
        ok('[5] ' + tag + ' — 반대 면(셸에 **안** 닿는)의 변 한복판은 검정이 가장 바깥 ≥5.0 (378·409 무손상)',
          farOk, fk.join('  '));
        console.log('    [5-기록] 반대 면 코너 30°·75° (449 가 안 건드린 절반 = **462**) — ' + frec.join(' · '));
      }
    }
    ok('[2]~[4] 를 닿는 면 3 곳 이상에서 쟀다 (표본이 공허하지 않다)', touchFaces >= 3, touchFaces + '면');
    ok('[5] 음성항이 실제로 검정을 본 면이 4 곳 이상 (공허하지 않다)', farFaces >= 4, farFaces + '면');
    ok('끝 칸을 강제로 활성으로 만든 자리가 3 곳 이상 (좌·우 두 종류를 다 봤다)', forced >= 3, forced + '곳');

    /* ---- [R] 되돌림 ---- */
    console.log('\n[R] 되돌림 — 닿는 면의 인셋 7 을 도로 주입하면 순서가 뒤집힌다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(900);
    await page.evaluate(SETTLE);
    await page.evaluate(SETTLE);
    /* 967 — 켜기·읽기 한 틱. [R] 은 그 뒤로 주입·캡처를 되풀이하므로 핀으로 붙들어 둔다. */
    const gE = await page.evaluate(([s, k]) => {
      if (window.__stab967.pin(s, k) !== k) return null;
      const b = document.querySelector(s + ' > .stab.on').getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, ['#eqTabs', 0]);
    ok('[R] 전제 — 06 장비 첫 칸을 켠 그대로 쟀다 (967)', !!gE, gE ? '' : '켠 칸이 되돌려졌다');
    const inject = async (id, css) => {
      await page.evaluate(([i, c]) => {
        const s = document.createElement('style'); s.id = i; s.textContent = c; document.head.appendChild(s);
      }, [id, css]);
      await page.waitForTimeout(220);
      await shoot(page);
    };
    const drop = async id => {
      await page.evaluate(i => { const s = document.getElementById(i); if (s) s.remove(); }, id);
      await page.waitForTimeout(180);
      await shoot(page);
    };

    await shoot(page);
    const onNow = [];
    for (const dg of DARK_DEGS) onNow.push(solid(await ray(page, gE, 'BL', dg))[0] || ['-', 0]);

    /* 409 11회차 이관 (2026-08-31) — **반사실에 한 줄이 더 필요해졌다.**
       11회차가 부모 `box-shadow` 첫 항에 바닥 띠(`inset 0 -7px 0 #413122`)를 올려 옆띠의 코너
       감김을 덮는다. 그 띠는 449 의 인셋 7 과 **무관하게** 아래 코너의 가장 바깥을 D 로 만들므로,
       인셋만 되돌리면 이 항은 «뒤집히지 않는다» — 449 가 무른 게 아니라 **다른 층이 같은 자리를
       같이 지키게 된 것**이다. ⇒ 반사실은 둘을 **같이** 걷어 449 자신의 몫만 남긴다.
       ⚠ 그래도 이 항은 공허하지 않다: 인셋 7 만 도로 주입하고 바닥 띠를 그대로 두면 [2] 는
          초록이지만 **75° 두께**(R2)가 다시 눌린다 — 그 축은 이 층이 못 덮는다. */
    await inject('v449R', '.stab.on.stab-c1::before{left:7px!important}'
      + '.stab.on{box-shadow:var(--pill-l),var(--pill-r)!important}');
    const offR = [];
    for (const dg of DARK_DEGS) offR.push(solid(await ray(page, gE, 'BL', dg))[0] || ['-', 0]);
    ok('R1 인셋 7 을 도로 주입하면 가장 바깥이 **베벨 밴드 B** 로 뒤집힌다 ([2] 가 공허하지 않다)',
      onNow.every(r => r[0] === 'D') && offR.every(r => r[0] === 'B'),
      '지금 ' + fmt(onNow) + '  ↔  주입 ' + fmt(offR));
    ok('R2 그 밴드는 75° 에서 ≤3.5px 로 눌린다 (7·cos75 = 1.8 쪽 · 등재문이 잡은 결함)',
      (offR[offR.length - 1][1] || 99) <= 3.5, '75° ' + offR[offR.length - 1][1].toFixed(1) + 'px');
    const topOff = [];
    for (const dg of TOP_DEGS) topOff.push(solid(await ray(page, gE, 'TL', dg))[0] || ['-', 0]);
    ok('R2b 같은 주입에서 위 코너 베벨은 ' + TOP_HI + ' 를 넘는다 (두 밴드가 겹쳐 과중해진다 — [4] 가 공허하지 않다)',
      topOff.some(r => r[1] > TOP_HI), fmt(topOff));
    await drop('v449R');

    /* [R3] 4회차가 걸렀던 길 — «새 상자»(사방 7 인셋 · r23 · 기둥 마스크)를 이 면에 걸면 면색 갭이 뜬다.
       이 항이 «왜 인셋을 **밖으로** 밀었나» 를 못박는다(안으로 밀면 검정이 없어 윤곽이 어긋난다). */
/* 463 (2026-08-30) — 기둥 폭은 **이 상자의 국소 좌표**다. «새 상자» 는 좌·우 7 인셋이라
       30 이 아니라 **23**(= 30 − 7) 이어야 «알약 x 0..30» 을 덮는다. 제품이 그렇게 고쳐졌으므로
       이 반사실 주입도 같은 값을 쓴다 — 30 을 그대로 두면 «제품에 없는 상자» 를 시험하게 된다. */
    const MASK = 'linear-gradient(90deg,#000 0 23px,transparent 23px calc(100% - 23px),#000 calc(100% - 23px))';
    await inject('v449R3', '.stab.on.stab-c1::before{left:7px!important;top:7px!important;bottom:7px!important;'
      + 'border-radius:23px!important;-webkit-mask-image:' + MASK + '!important;mask-image:' + MASK + '!important}');
    let gapF = 0, gapAt = '';
    for (const dg of TOP_DEGS) {
      const rs = solid(await ray(page, gE, 'TL', dg));
      if (rs[0] && rs[0][0] === 'B' && rs[1] && rs[1][0] === 'F' && rs[2] && rs[2][0] === 'B') {
        gapF++; gapAt += ' ' + dg + '°:' + fmt(rs.slice(0, 3));
      }
    }
    ok('R3 4회차의 «새 상자»(사방 7 인셋 · r23)를 이 면에 걸면 베벨과 띠 사이에 **면색 갭**이 뜬다',
      gapF >= 1, gapF + '각도' + gapAt);
    await drop('v449R3');

    const back = [];
    for (const dg of DARK_DEGS) back.push(solid(await ray(page, gE, 'BL', dg))[0] || ['-', 0]);
    ok('R4 주입을 걷으면 다시 D 가 가장 바깥이다 (주입이 남지 않았다)',
      back.every(r => r[0] === 'D' && r[1] >= MIN_DARK), fmt(back));

    console.log('\n[C] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 90) : ''));
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY449 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})();
