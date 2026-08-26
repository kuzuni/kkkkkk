/* 작업 121 6회차 — «스프라이트 아이들이 CSS 들썩을 통째로 덮는다» 를 수치로 잰다.
 *
 * 5회차가 6회차로 이월한 1순위(비평가 G·H 공통): 던전 카드 썸네일의 아틀라스 아이들이
 * 프레임마다 잉크를 위아래로 크게 흔들어, 121 이 만든 CSS 들썩(`thBob`, 최대 18px)이 묻힌다.
 *
 * 여기서 재는 것은 **캔버스 안 잉크 bbox** 다(카드 화면 좌표가 아니라 슬롯 로컬 px).
 *   ink-top p2p     — 한 사이클 동안 잉크 상단이 오간 폭
 *   max step        — 인접 프레임 사이 최대 점프(= 125ms 안에 튀는 양, 축 ① «팝»)
 *   ink h p2p       — 잉크 높이가 프레임마다 얼마나 커졌다 작아지는지(= 배율 펌핑)
 *
 * 두 가지 배치 방식을 같은 표에 놓는다:
 *   cur   현행 — `k = min((W-2p)/fr[2], (H-2p)/fr[3])` 를 **프레임마다** 다시 계산하고 프레임을 중앙에 놓는다
 *   uni   제안 — 아틀라스 트림 정보(fr[4],fr[5] 오프셋 · fr[6],fr[7] 원본 크기)로 **애니 전체의 합집합 bbox**
 *                를 한 번 구해 그것을 슬롯에 담고, 각 프레임은 그 안의 제자리에 놓는다
 *                → 배율이 사이클 내내 하나로 고정되고, 남는 움직임은 «그림이 실제로 움직인 만큼» 뿐이다
 *
 * 실행: node tools/inkjit121.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => window.ATLAS && Object.keys(window.ATLAS).length &&
    Object.values(window.ATLAS).every(a => a.image && a.image.complete), null, { timeout: 20000 });

  const rows = await p.evaluate(() => {
    const CARDS = Object.entries(DUN_UI).map(([id, u]) => ({
      id, k: u.thk, anim: u.thi, br: u.thbr,
      W: parseInt(u.thw, 10) - TH_INSET,
      H: 341 - parseInt(u.tht, 10) - TH_INSET,
    })).filter(c => c.anim);

    /* 애니 전체의 «원본 좌표계» 합집합 bbox */
    function unionBox(A, anim) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const n of A.a[anim]) {
        const f = A.f[n]; if (!f) continue;
        const ox = f[4] | 0, oy = f[5] | 0;
        x0 = Math.min(x0, ox); y0 = Math.min(y0, oy);
        x1 = Math.max(x1, ox + f[2]); y1 = Math.max(y1, oy + f[3]);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    function inkBox(g, W, H) {
      const d = g.getImageData(0, 0, W, H).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 24) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }

    const P = TH_PAD, out = [];
    for (const c of CARDS) {
      const A = ATLAS[c.k]; if (!A || !A.image) continue;
      const list = A.a[c.anim] || [];
      const uni = unionBox(A, c.anim);
      const cv = document.createElement('canvas');
      cv.width = c.W; cv.height = c.H;
      const g = cv.getContext('2d', { willReadFrequently: true });
      /* TH_IDLE 은 스크립트 최상위 `const` 라 `window.TH_IDLE` 이 아니라 전역 렉시컬 바인딩이다 */
      const win = TH_IDLE[c.k + '/' + c.anim] || null;
      const modes = {};
      for (const mode of ['cur', 'uni', 'win']) {
        const tops = [], hs = [];
        for (const n of (mode === 'win' ? (win || list) : list)) {
          const f = A.f[n]; if (!f) continue;
          g.clearRect(0, 0, c.W, c.H);
          g.imageSmoothingEnabled = false;
          let dx, dy, dw, dh;
          if (mode !== 'uni') {
            const k = Math.min((c.W - P * 2) / f[2], (c.H - P * 2) / f[3]);
            dw = Math.max(1, Math.round(f[2] * k)); dh = Math.max(1, Math.round(f[3] * k));
            dx = Math.round((c.W - dw) / 2); dy = Math.round((c.H - dh) / 2);
          } else {
            const k = Math.min((c.W - P * 2) / uni.w, (c.H - P * 2) / uni.h);
            const bx = (c.W - uni.w * k) / 2, by = (c.H - uni.h * k) / 2;
            dw = Math.max(1, Math.round(f[2] * k)); dh = Math.max(1, Math.round(f[3] * k));
            dx = Math.round(bx + ((f[4] | 0) - uni.x) * k);
            dy = Math.round(by + ((f[5] | 0) - uni.y) * k);
          }
          g.drawImage(A.image, f[0], f[1], f[2], f[3], dx, dy, dw, dh);
          const ib = inkBox(g, c.W, c.H);
          tops.push(ib ? ib.y : null); hs.push(ib ? ib.h : null);
        }
        const t = tops.filter(v => v != null), h = hs.filter(v => v != null);
        let step = 0;
        for (let i = 0; i < t.length; i++) step = Math.max(step, Math.abs(t[(i + 1) % t.length] - t[i]));
        modes[mode] = {
          topP2P: Math.max(...t) - Math.min(...t),
          maxStep: step,
          hP2P: Math.max(...h) - Math.min(...h),
          fill: Math.round(Math.max(...h) / (c.H - P * 2) * 100),
        };
      }
      out.push({ id: c.id, k: c.k, anim: c.anim, n: list.length, W: c.W, H: c.H,
                 win: win ? win.length : 0,
                 cur: modes.cur, uni2: modes.uni, win2: modes.win });
    }
    return out;
  });

  console.log('썸네일 잉크 흔들림 — 슬롯 로컬 px (thBob CSS 진폭 = 최대 18px, 큰 점프 −14)');
  console.log('  cur = 전 사이클(현행 배치)  ·  uni = 트림 합집합 처방(5회차 비평가 G·H)  ·  win = TH_IDLE 아이들 창(실제로 도는 것)');
  console.log('card    atlas/anim           전체 창  | cur  top/step/h/채움% | uni  top/step/h/채움% | win  top/step/h/채움%');
  const f = (m) => `${String(m.topP2P).padStart(4)} /${String(m.maxStep).padStart(4)} /${String(m.hP2P).padStart(4)} /${String(m.fill).padStart(4)}%`;
  let bad = 0;
  for (const r of rows) {
    console.log(
      r.id.padEnd(7), (r.k + '/' + r.anim).padEnd(20), String(r.n).padStart(2),
      String(r.win || '-').padStart(3), '|', f(r.cur), '|', f(r.uni2), '|', f(r.win2));
    /* 게이트 — 실제로 도는 창의 세로 흔들림이 CSS 들썩(진폭 18)의 절반을 넘으면 연출이 묻힌다 */
    if (r.win2.topP2P > 9 || r.win2.maxStep > 9) {
      console.log(`   ✗ ${r.id}: 창의 잉크 세로 흔들림 ${r.win2.topP2P}px(step ${r.win2.maxStep}) — thBob 18px 의 절반(9) 초과`);
      bad++;
    }
  }
  console.log(bad ? `INKJIT121 FAIL — ${bad}장` : `INKJIT121 PASS — ${rows.length}/${rows.length}장 창 흔들림 ≤ 9px`);
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
