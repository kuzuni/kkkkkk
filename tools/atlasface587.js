/* 587 — «아틀라스 원본은 어느 쪽을 보는가» 를 **픽셀로** 재는 자 (등재문 처방 ① ⚠ «눈이 아니라 픽셀로»).
   probe587 · verify587 이 **같은 함수**를 쓴다(385 규약 — 자는 한 벌).

   재는 법: 프레임 하나의 잉크(알파>0)를 세로로 셋으로 나눠
     · headCx  = 위 1/3 잉크 x 중심 (얼굴·머리·부리)
     · bodyCx  = 가운데 1/3 잉크 x 중심 (몸통)
     · footCx  = 아래 1/3 잉크 x 중심 (발)
   **머리는 보는 쪽으로 튀어나온다** — 측면 스프라이트의 보편 성질이다.
   눈금은 `lean = (headCx − bodyCx) / bboxW` (오른쪽으로 튀어나오면 +).
   여러 프레임의 중앙값을 쓴다(한 프레임의 팔 동작에 안 흔들리게).

   ⚠ 이 눈금은 **펫 3종으로 교정돼 있다** — `PET_SP` 가 bird·robo·dragon 을 `faceRight:true` 로
   이미 선언해 뒀으므로(18223~18225), 그 셋에서 lean > 0 이 나와야 눈금이 맞는 것이다.
   교정이 깨지면 verify587 [A0] 이 빨개진다.                                                */

/* 페이지 안에서 도는 본체 — 아틀라스 이미지에서 프레임을 잘라 잉크를 센다 */
async function faceOf(page, key, frameNames) {
  return await page.evaluate(async ({ key, frameNames }) => {
    const A = window.ATLAS[key];
    if (!A || !A.image) return { err: 'atlas/image 없음' };
    const per = [];
    for (const fn of frameNames) {
      const fr = A.f[fn];
      if (!fr) continue;
      const [sx, sy, sw, sh] = fr;
      const c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(A.image, sx, sy, sw, sh, 0, 0, sw, sh);
      let d;
      try { d = g.getImageData(0, 0, sw, sh).data; } catch (e) { return { err: 'canvas 오염: ' + e.message }; }
      /* 잉크 bbox */
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        if (d[(y * sw + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) continue;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const band = (a, b) => {           /* [a,b) 를 bbox 세로 비율로 받아 x 중심을 낸다 */
        let sxs = 0, n = 0;
        const ya = y0 + Math.floor(bh * a), yb = y0 + Math.ceil(bh * b);
        for (let y = ya; y < yb; y++) for (let x = x0; x <= x1; x++) {
          if (d[(y * sw + x) * 4 + 3] > 16) { sxs += x; n++; }
        }
        return n ? sxs / n : null;
      };
      const head = band(0, 1 / 3), body = band(1 / 3, 2 / 3), foot = band(2 / 3, 1);
      if (head === null || body === null) continue;
      per.push({ fn, bw, bh, head, body, foot, lean: (head - body) / bw });
    }
    if (!per.length) return { err: '잉크 있는 프레임 0' };
    const leans = per.map(p => p.lean).sort((a, b) => a - b);
    const med = leans[(leans.length - 1) >> 1];
    return {
      n: per.length,
      lean: Math.round(med * 1000) / 1000,
      faceRight: med > 0,
      per: per.map(p => ({ fn: p.fn, lean: Math.round(p.lean * 1000) / 1000 }))
    };
  }, { key, frameNames });
}

/* 표: 아틀라스 → 방향을 재는 데 쓸 대표 프레임(정지·걷기 계열. 공격 프레임은 팔이 뻗어 흔들린다) */
const SAMPLE = {
  knight: ['idle/frame0000', 'idle/frame0001', 'idle/frame0002', 'idle/frame0003', 'idle/frame0004', 'idle/frame0005'],
  zombie: ['walk_001', 'walk_002', 'walk_003', 'walk_004', 'walk_005', 'walk_006', 'walk_007', 'walk_008'],
  elvesG: ['green_idle_0', 'green_idle_1', 'green_idle_2', 'green_idle_3', 'green_idle_4'],
  elvesB: ['blue_idle_0', 'blue_idle_1', 'blue_idle_2', 'blue_idle_3', 'blue_idle_4'],
  bird: ['frame0', 'frame1', 'frame2', 'frame3', 'frame4', 'frame5', 'frame6', 'frame7', 'frame8', 'frame9'],
  robo: ['Running_000', 'Running_002', 'Running_004', 'Running_006', 'Running_008', 'Running_010', 'Running_012'],
  dragon: ['f0', 'f2', 'f4', 'f6', 'f8', 'f10']
};
const ATLAS_OF = { knight: 'knight', zombie: 'zombie', elvesG: 'elves', elvesB: 'elves', bird: 'bird', robo: 'robo', dragon: 'dragon' };

async function measureAll(page) {
  const out = {};
  for (const k of Object.keys(SAMPLE)) out[k] = await faceOf(page, ATLAS_OF[k], SAMPLE[k]);
  return out;
}

/* ── 두 번째 눈금: «공격 프레임에서 잉크가 어느 쪽으로 뻗는가» ──────────────────
   무기는 **보는 쪽으로** 나간다. 정지(idle/walk) 프레임의 잉크 상자와 공격 프레임의 잉크 상자를
   **논리 프레임 좌표**(fr[4] − fr[6]/2 + 잉크x)에서 견주면, 뻗은 쪽이 곧 보는 쪽이다.
   ⚠ 게임이 그릴 때 거는 가로 보정 `frameXo`(243)는 **안 쓴다** — 여기서 재는 것은 아트다.
   이 눈금은 머리 눈금(lean)과 달리 **기계적**이다: 팔·무기가 실제로 움직인 픽셀만 본다. */
async function reachOf(page, key, idleFrames, atkFrames) {
  return await page.evaluate(async ({ key, idleFrames, atkFrames }) => {
    const A = window.ATLAS[key];
    if (!A || !A.image) return { err: 'atlas/image 없음' };
    const box = (fn) => {
      const fr = A.f[fn];
      if (!fr) return null;
      const [sx, sy, sw, sh, ox, , lw] = fr;
      const c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(A.image, sx, sy, sw, sh, 0, 0, sw, sh);
      let d;
      try { d = g.getImageData(0, 0, sw, sh).data; } catch (e) { return null; }
      let x0 = 1e9, x1 = -1;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        if (d[(y * sw + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      }
      if (x1 < 0) return null;
      const base = ox - lw / 2;                 /* 논리 프레임 좌표로 옮긴다 */
      return { L: base + x0, R: base + x1 };
    };
    const agg = (names) => {
      let L = 1e9, R = -1e9, n = 0;
      for (const fn of names) { const b = box(fn); if (!b) continue; L = Math.min(L, b.L); R = Math.max(R, b.R); n++; }
      return n ? { L, R, n } : null;
    };
    const idle = agg(idleFrames), atk = agg(atkFrames);
    if (!idle || !atk) return { err: '표본 부족' };
    const dR = atk.R - idle.R;                  /* 오른쪽으로 더 뻗은 양 */
    const dL = idle.L - atk.L;                  /* 왼쪽으로 더 뻗은 양 */
    return {
      idle, atk,
      reachR: Math.round(dR * 10) / 10,
      reachL: Math.round(dL * 10) / 10,
      faceRight: dR > dL,
      margin: Math.round((dR - dL) * 10) / 10
    };
  }, { key, idleFrames, atkFrames });
}

/* 공격 눈금 표본 — idle(또는 walk) ↔ attack */
const REACH = {
  knight: ['knight',
    ['idle/frame0000', 'idle/frame0001', 'idle/frame0002', 'idle/frame0003', 'idle/frame0004', 'idle/frame0005'],
    ['attack_A/frame0004', 'attack_A/frame0005', 'attack_A/frame0006', 'attack_A/frame0007', 'attack_A/frame0008',
     'attack_A/frame0009', 'attack_A/frame0010']],
  elvesG: ['elves', ['green_idle_0', 'green_idle_1', 'green_idle_2', 'green_idle_3', 'green_idle_4'],
    ['green_attack_0', 'green_attack_1', 'green_attack_2', 'green_attack_3', 'green_attack_4', 'green_attack_5']],
  elvesB: ['elves', ['blue_idle_0', 'blue_idle_1', 'blue_idle_2', 'blue_idle_3', 'blue_idle_4'],
    ['blue_attack_0', 'blue_attack_1', 'blue_attack_2', 'blue_attack_3', 'blue_attack_4']]
};

async function measureReach(page) {
  const out = {};
  for (const k of Object.keys(REACH)) {
    const [key, idle, atk] = REACH[k];
    out[k] = await reachOf(page, key, idle, atk);
  }
  return out;
}

module.exports = { faceOf, measureAll, SAMPLE, ATLAS_OF, reachOf, measureReach, REACH };
