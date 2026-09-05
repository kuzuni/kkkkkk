/* 작업 860 게이트 — 89 유물 소환 팝업(#relw) [3]-(가) 자로 재는 수치 (비평가 없음)
 *   ⓐ 「유물 소환」 라벨(.rw-basin>b) 이 scaleX 로 눌려 있지 않다
 *      — computed transform 에 가로 스케일 없음 · 잉크 폭이 측정표 ref(144) 의 자연폭(≈141) 급
 *   ⓑ 3열 행(216/463.5/711) 열 피치가 대칭(247.5/247.5) · 가운데 슬롯이 그룹 중심
 *   §R 되돌림 시험 — scaleX(.93) 을 도로 붙이면 폭이 준다 · 가운데를 462 로 되돌리면 비대칭이 산다
 * 근거: probe860 · 측정표 89 §「유물 소환」/§1행 · 859 2회차 CM ⑦.
 *
 * ══ 892 이관(2026-09-05) — 이 자는 «폭» 만 묻고 «비례» 를 안 물었다 ═════════════
 * 892 등재문이 «860 이 25/25 초록인데 라벨이 −5.3% 다 ⇒ 그 자가 폭을 안 묻고 있다» 로
 * 이 자를 지목했다. 재현(`probe892` + `tools/scan892.py`)이 갈래를 갈랐다:
 *
 *  ① **두 자가 갈린 이유는 ref 가장자리 두 칸이다.** ref 라벨의 가로 끝 두 칸(x209 lum 172.1 ·
 *     x275 lum 202.1)이 하필 문턱 170~220 을 걸치고, 세로 끝(y575 125 · y591 164)은 안 걸친다.
 *     그래서 절대 문턱 하나를 대면 **가로만** 67(th≤170) ↔ 65(th 220) 로 흔들린다 —
 *     측정표의 65 는 높은 문턱, 859·813 채점 2인의 67 은 낮은 문턱이다. 같은 그림을 봤고
 *     자를 어디 걸쳤는지만 달랐다(887 «어느 자가 두 그림에서 같은 것을 재는가»).
 *  ② **두 그림에 같은 규약을 댄 값**(`scan892` 정규화 0.90 = «봉우리에 닿은 속»):
 *        ref  66×15 ref px = 146.7×33.3 프레임 px · w/h **4.400**
 *        우리 141×35 프레임 px = 63.45×15.75 ref px · w/h **4.029**
 *     ⇒ 폭 **−3.9%** · 세로 **+5.0%** · 종횡비 **−8.4%**
 *  ③ **확정 결손은 폭 한 축뿐이다.** ref 는 486 폭이라 눈금 한 칸이 폭에서는 ±1.5% ·
 *     세로에서는 ±6.7% 다. 폭 차이는 눈금의 2.6배(분해 가능) · 세로 차이는 0.8배(분해 불가).
 *  ④ **그런데 종횡비는 등방 배율 k 에 불변이다** — font-size 를 41.6px 로 올리면 폭은 맞지만
 *     (147) 세로가 37 로 밀려 나가고, 38px 로 내리면 세로는 맞지만 폭이 134 로 더 좁아진다.
 *     어느 k 를 골라도 종횡비는 −8.4% 그대로다. **결손은 «크기» 가 아니라 «비례»** 이고
 *     비례는 서체가 정한다(GameKR = Jua 서브셋 · 가변축 없음 ⇒ font-stretch 도 안 듣는다).
 *     가로만 늘이는 scaleX 는 **356 이 폐기한 관행**이고 860 이 방금 걷어낸 바로 그것이다.
 *     ⇒ 892 는 **제품 0줄**로 닫고 남는 −3.9% 를 «아트/서체 몫» 으로 이관했다.
 *
 * ⇒ 그래서 이 자에 **세로**와 **종횡비**를 신설했다(328·330 «누른 항을 묻는 항을 한 줄 더»).
 *   종횡비를 고른 이유: 등방 변경(font-size)에는 **불변**이라 정당한 수리를 안 막고,
 *   비등방(scaleX/scaleY)에는 **즉시 반응**한다(현행 4.029 ↔ scaleX(.93) 3.743).
 *   ⚠ 세로 항의 34~36 은 «ref 와 같다» 는 주장이 **아니다** — ref 는 세로를 분해하지 못한다(③).
 *      지금 자리(35)를 못박아 **표류를 막는 래칫**이고, 동시에 «폭을 등방으로 닫는» 우회를
 *      빨갛게 만드는 항이다(§R3 이 그것을 못박는다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1920, 2280];

let pass = 0, fail = 0; const bad = [];
function ck(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

(async () => {
  const browser = await launch(chromium);
  try {
    for (const H of HEIGHTS) {
      console.log(`\n[frameH ${H}]`);
      const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(URL);
      await page.waitForTimeout(700);

      const geom = await page.evaluate(async () => {
        RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
        S.relic = 99999; openRelw(); void document.body.offsetHeight;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const sig = () => [...document.querySelectorAll('#relw .rw-c')].map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(1)},${q.top.toFixed(1)}`; }).join('|');
        let prev = '', same = 0, w = 0;
        while (w < 4000) { await wait(60); w += 60; const s = sig(); same = (s === prev && s) ? same + 1 : 0; prev = s; if (same >= 3) break; }
        const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
        const F = el => { const q = el.getBoundingClientRect(); return { l: (q.left - ar.left) / sc, t: (q.top - ar.top) / sc, w: q.width / sc, h: q.height / sc }; };
        const cs = [...document.querySelectorAll('#relw .rw-c')];
        const row1 = [F(cs[0]), F(cs[1]), F(cs[2])];
        const row3 = [F(cs[7]), F(cs[8]), F(cs[9])];
        const b = document.querySelector('#relw .rw-basin>b');
        const m = getComputedStyle(b).transform;      // 'none' | 'matrix(a,..)'
        const sx = m === 'none' ? 1 : parseFloat(m.slice(m.indexOf('(') + 1).split(',')[0]);
        return { sc, ar: { l: ar.left, t: ar.top }, row1, row3, sx, bRect: F(b), rwpos: RW_POS };
      });

      // 라벨 잉크 화소 자
      // ⚠ 892 — 세로 여유(br.h + 12)를 **넓히지 마라.** 라벨 띠 바깥에는 수반 림·시안 글로우가
      //    있어 창을 열면 «라벨 높이» 가 통째로 거짓이 된다(892 회차에 실제로 h=35 가 62 로 튀었다).
      //    라벨 상자(50px)는 잉크 35~37 을 담고도 남으므로 이 창이 정답이다.
      const measureInk = async () => {
        const br = geom.bRect;
        const clip = { x: Math.max(0, Math.round(br.l) - 10), y: Math.round(br.t) - 6, width: Math.min(1080, Math.round(br.w) + 20), height: Math.round(br.h) + 12 };
        const shot = await page.screenshot({ clip });
        return await page.evaluate(async ({ dataUrl, ox }) => {
          const img = new Image(); await new Promise(r => { img.onload = r; img.src = dataUrl; });
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          const lum = (x, y) => { const i = ((y * c.width + x) << 2); return .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; };
          let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (lum(x, y) > 170) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
          return maxX < 0 ? null : { w: maxX - minX + 1, h: maxY - minY + 1, cx: ox + (minX + maxX) / 2 };
        }, { dataUrl: 'data:image/png;base64,' + shot.toString('base64'), ox: clip.x });
      };

      ck(`[${H}] 페이지 오류 0`, errs.length === 0, errs.slice(0, 2).join(' | '));

      // ── ⓐ 라벨 ──
      ck(`[${H}] ⓐ 라벨 가로 스케일 없음 (scaleX ≈ 1)`, Math.abs(geom.sx - 1) < 1e-3, `scaleX=${geom.sx}`);
      const ink = await measureInk();
      ck(`[${H}] ⓐ 라벨 잉크 폭 ≥ 137 (자연폭 141 급 · scaleX(.93) 의 131 을 배제)`, ink && ink.w >= 137, ink ? `${ink.w}px (ref 144, ${(100 * (ink.w / 144 - 1)).toFixed(1)}%)` : 'null');
      ck(`[${H}] ⓐ 라벨 잉크 폭 ≤ 150 (ref 144 +4% 상한)`, ink && ink.w <= 150, ink ? `${ink.w}px` : 'null');
      ck(`[${H}] ⓐ 라벨 잉크 중심 540±2 (가운데 정렬 유지)`, ink && Math.abs(ink.cx - 540) <= 2, ink ? `cx=${ink.cx.toFixed(1)}` : 'null');

      // ── 892 이관 — 세로·종횡비 (이 자가 여태 안 묻던 두 항) ──
      // 세로: «ref 와 같다» 가 아니라 **지금 자리를 못박는 래칫**이다(ref 는 세로를 분해 못 한다).
      //        폭을 등방 배율로 닫으려 하면(41.6px → 폭 147 · 세로 37) 여기가 빨개진다 — §R3.
      ck(`[${H}] ⓐ 라벨 잉크 세로 34~36 (892 래칫 — 현행 35 · 등방 확대로 폭을 닫는 우회를 막는다)`,
         ink && ink.h >= 34 && ink.h <= 36,
         ink ? `${ink.h}px (ref 15 ref px = 33.3 · ⚠ ref 분해능 ±6.7% 라 «일치» 주장은 안 한다)` : 'null');
      // 종횡비: 등방 변경에는 불변(38px 3.941 · 40px 4.029 · 42px 4.027) · 비등방에는 즉시 반응
      //         (scaleX(.93) 3.743 · scaleX(1.06) ≈ 4.27). ref 는 4.400.
      const ar = ink ? ink.w / ink.h : 0;
      ck(`[${H}] ⓐ 라벨 종횡비 3.90~4.15 (892 — 서체가 정하는 비례 · scaleX/scaleY 어느 쪽이든 잡힌다)`,
         ink && ar >= 3.90 && ar <= 4.15,
         ink ? `w/h=${ar.toFixed(3)} (ref 4.400 ⇒ ${(100 * (ar / 4.4 - 1)).toFixed(1)}% — 아트/서체 몫으로 이관)` : 'null');

      // ── ⓑ 피치 (1행·3행 두 3열 행) ──
      for (const [tag, row] of [['1행', geom.row1], ['3행', geom.row3]]) {
        const L = row.map(s => s.l);
        const p0 = L[1] - L[0], p1 = L[2] - L[1];
        const gc = (L[0] + L[2] + 151) / 2, midC = L[1] + 151 / 2;
        ck(`[${H}] ⓑ ${tag} 피치 대칭 (|Δ| ≤ 0.6px)`, Math.abs(p0 - p1) <= 0.6, `${p0.toFixed(1)} / ${p1.toFixed(1)}`);
        ck(`[${H}] ⓑ ${tag} 가운데 슬롯 = 그룹 중심 (|편차| ≤ 0.6px · 462 의 −1.5 를 배제)`, Math.abs(midC - gc) <= 0.6, `편차 ${(midC - gc).toFixed(2)}px`);
        ck(`[${H}] ⓑ ${tag} 피치 247.5±1 (측정표 환산 246.7~248.9)`, Math.abs(p0 - 247.5) <= 1 && Math.abs(p1 - 247.5) <= 1, `${p0.toFixed(1)} / ${p1.toFixed(1)}`);
      }

      // ── §R 되돌림 시험 ──
      if (H === HEIGHTS[HEIGHTS.length - 1]) {
        // R1 — scaleX(.93) 을 도로 붙이면 잉크 폭이 준다 (눌림 재현)
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = 'scaleX(.93)'; void document.body.offsetHeight; });
        await page.waitForTimeout(60);
        const inkR = await measureInk();
        ck(`[${H}] §R1 scaleX(.93) 재부착 시 잉크 폭 < 137 (게이트가 헛초록 아님)`, inkR && inkR.w < 137, inkR ? `${inkR.w}px` : 'null');
        // 892 — 같은 되돌림이 **종횡비 항에서도** 빨개져야 한다(폭 항이 사라져도 비례가 지킨다)
        ck(`[${H}] §R1b scaleX(.93) 재부착 시 종횡비 < 3.90 (892 신설 항이 헛초록 아님)`,
           inkR && (inkR.w / inkR.h) < 3.90, inkR ? `w/h=${(inkR.w / inkR.h).toFixed(3)}` : 'null');
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = ''; });

        // ── 892 §R3 — «폭을 등방으로 닫는» 우회가 반드시 빨개진다 ──────────────
        // 이것이 892 이관의 본체다. 옛 자(폭 137~150 만 묻는다)는 font-size 41.6px 를
        // **초록으로 통과시킨다**(폭 147). 그런데 그 배율은 세로를 35 → 37 로 밀어내
        // «폭 −3.9% 를 세로 +12% 와 맞바꾼» 것일 뿐이고 종횡비는 한 톨도 안 나아진다.
        // ⇒ 새 세로 항이 그것을 잡는지 직접 굴려서 못박는다.
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.fontSize = '41.6px'; void document.body.offsetHeight; });
        await page.waitForTimeout(120);
        const inkU = await measureInk();
        ck(`[${H}] §R3 font-size 41.6px 는 **옛 자를 통과한다** (폭 137~150 — 구멍이 실재했다)`,
           inkU && inkU.w >= 137 && inkU.w <= 150, inkU ? `${inkU.w}px` : 'null');
        ck(`[${H}] §R3 그런데 세로 항이 빨개진다 (34~36 밖 — 892 가 막은 우회)`,
           inkU && (inkU.h < 34 || inkU.h > 36), inkU ? `${inkU.h}px` : 'null');
        ck(`[${H}] §R3 종횡비는 **그대로다** (등방이라 −8.4% 가 하나도 안 회수된다)`,
           inkU && Math.abs((inkU.w / inkU.h) - 4.03) < 0.16,
           inkU ? `w/h=${(inkU.w / inkU.h).toFixed(3)} (현행 4.029)` : 'null');
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.fontSize = ''; void document.body.offsetHeight; });
        await page.waitForTimeout(120);

        // §R4 — 반대 방향(가로만 늘이는 356 폐기 관행)도 종횡비가 잡는다
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = 'scaleX(1.06)'; void document.body.offsetHeight; });
        await page.waitForTimeout(120);
        const inkW = await measureInk();
        ck(`[${H}] §R4 scaleX(1.06)(폭을 ref 로 맞추는 356 폐기 관행) 시 종횡비 > 4.15`,
           inkW && (inkW.w / inkW.h) > 4.15, inkW ? `w/h=${(inkW.w / inkW.h).toFixed(3)} · 폭 ${inkW.w}px` : 'null');
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = ''; void document.body.offsetHeight; });
        await page.waitForTimeout(120);
        // R2 — 소스 상수 462 되돌림은 그룹 중심에서 1.5px 벗어난다 (수식 검산 · RW_POS 원본 확인)
        const midX = geom.rwpos[1][0];
        ck(`[${H}] §R2 RW_POS 가운데 x = 463.5 (462 로 되돌리면 편차 −1.5 = 비대칭)`, Math.abs(midX - 463.5) < 1e-6, `RW_POS[1].x=${midX}`);
        const devIf462 = (462 + 151 / 2) - ((216 + 711 + 151) / 2);
        ck(`[${H}] §R2 대조 — 462 였다면 편차 ${devIf462}px`, Math.abs(devIf462 - (-1.5)) < 1e-6, `${devIf462}px`);
      }

      await ctx.close();
    }
    console.log(`\nVERIFY860  ${pass}/${pass + fail}` + (fail ? '  FAIL: ' + bad.join(' · ') : '  PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})();
