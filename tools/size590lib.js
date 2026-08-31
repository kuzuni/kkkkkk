/* 590 공용 — «전장에 그려지는 펫이 얼마나 큰가 · 플레이어를 얼마나 가리는가» 를 재는 자 한 벌.
   `probe590`(재현)과 `verify590`(게이트)이 **같은 함수**를 쓴다 — 385 «자매 자 드리프트» 대책이고
   541 이 `size541lib.js` 로 먼저 깐 길을 그대로 따른다.

   재는 법 두 겹(541 과 같은 규약):
     ① **배율** — `drawImage` 를 감싸 제품이 실제로 넘긴 dh/sh 를 받아 적는다(표 값이 아니라 «찍힌 것»).
     ② **잉크** — 그 아틀라스 애니에서 «가장 큰 프레임» 의 알파 bbox × 배율.
   그리고 겹침은 **그린 상자끼리**의 교집합으로 잰다(③ — 크기를 되깎지 말고 자리를 벌리라는 처방의 자).

   ⚠ 펫은 `drawFrameC`(중앙 앵커)로 그려진다 — 발밑 앵커인 `drawFrame`(플레이어·잡몹)과 세로 기준이
     다르므로 상자를 만들 때 그 차이를 그대로 적는다(플레이어는 발밑, 펫은 중앙).                  */

/* 페이지에 심는 계측기 — page.evaluate(INSTALL) */
const INSTALL = () => {
  const cv = document.getElementById('view');
  const c = cv.getContext('2d');
  if (!c.__cap590) {
    const orig = c.drawImage;
    window.__cap = [];
    c.__cap590 = true;
    c.drawImage = function (img, sx, sy, sw, sh, dx, dy, dw, dh) {
      if (arguments.length === 9) window.__cap.push({ sx, sy, sw, sh, dx, dy, dw, dh });
      return orig.apply(this, arguments);
    };
  }
  window.__inkFr = (key, fr) => {
    const A = ATLAS[key]; if (!A || !A.f || !A.f[fr] || !A.image) return null;
    const f = A.f[fr];
    const cc = document.createElement('canvas'); cc.width = f[2]; cc.height = f[3];
    const g = cc.getContext('2d');
    g.drawImage(A.image, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    const d = g.getImageData(0, 0, f[2], f[3]).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < f[3]; y++) for (let x = 0; x < f[2]; x++) {
      if (d[(y * f[2] + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  window.__inkAnim = (key, anim) => {
    const A = ATLAS[key]; if (!A || !A.a || !A.a[anim]) return null;
    let best = null, bn = null;
    for (const n of A.a[anim]) { const f = A.f[n]; if (f && (!best || f[3] > best[3])) { best = f; bn = n; } }
    if (!bn) return null;
    const ink = window.__inkFr(key, bn);
    return ink ? { fr: bn, w: ink.w, h: ink.h } : null;
  };
  /* 이번에 찍힌 것 중 이 아틀라스·이 애니의 «최대 배율» */
  window.__drawSc = (key, anim) => {
    const A = ATLAS[key]; if (!A || !A.a || !A.a[anim]) return null;
    const set = {}; for (const n of A.a[anim]) { const f = A.f[n]; if (f) set[f[0] + ',' + f[1] + ',' + f[2] + ',' + f[3]] = 1; }
    let mx = null;
    for (const r of window.__cap) {
      if (!set[r.sx + ',' + r.sy + ',' + r.sw + ',' + r.sh]) continue;
      const sc = r.dh / r.sh; if (mx === null || sc > mx) mx = sc;
    }
    return mx === null ? null : +mx.toFixed(4);
  };
  window.__raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  /* 펫 한 마리를 그 스프라이트로 강제 장착한다 — 반환은 그 펫의 def */
  window.__wearPet = sp => {
    const d = PETS.find(p => p.sp === sp);
    if (!d) return null;
    S.own[d.id] = S.own[d.id] || 1;
    S.eqPet = [d.id];
    syncPets();
    return { id: d.id, sp: d.sp, n: d.n };
  };
  /* 스프라이트가 다른 펫 3마리(bird·robo·dragon) 동시 장착 — 겹침 실측용 */
  window.__wear3 = () => {
    const ids = [];
    for (const sp of ['bird', 'robo', 'dragon']) {
      const d = PETS.find(p => p.sp === sp);
      if (!d) continue;
      S.own[d.id] = S.own[d.id] || 1;
      ids.push(d.id);
    }
    S.eqPet = ids;
    syncPets();
    return ids;
  };
};

/* 그린 상자 — 펫은 중앙 앵커(drawFrameC), 플레이어는 발밑 앵커(drawFrame).
   상자는 «프레임 전체» 가 아니라 **잉크** 로 잡는다(투명 여백은 아무것도 안 가린다). */
const BOXES = () => {
  window.__petBox = p => {
    const A = ATLAS[p.def.sp]; if (!A) return null;
    const fr = curFrame(p); if (!fr || !A.f[fr]) return null;
    const ink = window.__inkFr(p.def.sp, fr); if (!ink) return null;
    const f = A.f[fr], sc = window.__petSc(p);
    /* drawFrameC 의 좌상단 = (x + (-f[6]/2 + f[4] + xo)*sc, y + (-f[7]/2 + f[5])*sc) — 잉크는 그 안에서 (x0,y0) */
    const xo = frameXo(p.def.sp, A)[fr] || 0;
    const lx = p.x + (-f[6] / 2 + f[4] + xo) * sc + ink.x0 * sc;
    const ly = p.y + (-f[7] / 2 + f[5]) * sc + ink.y0 * sc;
    return { x: lx, y: ly, w: ink.w * sc, h: ink.h * sc };
  };
  window.__playerBox = () => {
    const A = ATLAS.knight, fr = curFrame(player);
    if (!A || !fr || !A.f[fr]) return null;
    const ink = window.__inkFr('knight', fr); if (!ink) return null;
    const f = A.f[fr], sc = (typeof PLAYER_DRAW_SC !== 'undefined') ? PLAYER_DRAW_SC : 1;
    const xo = frameXo('knight', A)[fr] || 0;
    const lx = player.x + (-f[6] / 2 + f[4] + xo) * sc + ink.x0 * sc;
    const ly = player.y - f[7] * sc + f[5] * sc + ink.y0 * sc;
    return { x: lx, y: ly, w: ink.w * sc, h: ink.h * sc };
  };
};

/* 한 판 전부 재서 돌려준다 — probe590 도 verify590 도 이 한 함수만 부른다 */
async function measure(page) {
  await page.evaluate(INSTALL);
  await page.evaluate(BOXES);
  /* 제품이 «펫 그리기 배율» 을 어떻게 정하든 이 자는 그 한 곳만 읽는다 —
     수리 전(표 값 그대로)과 수리 후(상수 곱) 둘 다에서 같은 함수가 성립한다. */
  await page.evaluate(() => {
    window.__petSc = p => p.sp.scale * ((typeof PET_DRAW_SC !== 'undefined') ? PET_DRAW_SC : 1);
  });
  const out = {};

  /* ---------- [A] 상수·표 ---------- */
  out.consts = await page.evaluate(() => ({
    PET_DRAW_SC: (typeof PET_DRAW_SC !== 'undefined') ? PET_DRAW_SC : null,
    PLAYER_DRAW_SC: (typeof PLAYER_DRAW_SC !== 'undefined') ? PLAYER_DRAW_SC : null,
    MOB_DRAW_SC: (typeof MOB_DRAW_SC !== 'undefined') ? MOB_DRAW_SC : null,
    SK_DRAW_SC: (typeof SK_DRAW_SC !== 'undefined') ? SK_DRAW_SC : null,
    table: { bird: PET_SP.bird.scale, robo: PET_SP.robo.scale, dragon: PET_SP.dragon.scale },
    faceRight: { bird: !!PET_SP.bird.faceRight, robo: !!PET_SP.robo.faceRight, dragon: !!PET_SP.dragon.faceRight },
    unitSc: { arena: unitSc('arena'), zombie: unitSc('zombie'), boss: unitSc('boss') },
    petCd: (typeof PET_CD !== 'undefined') ? PET_CD.slice() : null
  }));

  /* ---------- [B] 펫 3종 — 찍힌 배율 · 그려진 잉크 ---------- */
  out.pets = {};
  for (const sp of ['bird', 'robo', 'dragon']) {
    const info = await page.evaluate(async sp => {
      enemies.length = 0; corpses.length = 0;
      const d = window.__wearPet(sp);
      window.__cap.length = 0;
      await window.__raf(); await window.__raf();
      return d;
    }, sp);
    const m = await page.evaluate(async sp => {
      const anim = PET_SP[sp].anim;
      const sc = window.__drawSc(sp, anim), ink = window.__inkAnim(sp, anim);
      return { sc, inkW: ink ? ink.w : null, inkH: ink ? ink.h : null,
               drawnW: sc && ink ? +(ink.w * sc).toFixed(2) : null,
               drawnH: sc && ink ? +(ink.h * sc).toFixed(2) : null };
    }, sp);
    out.pets[sp] = { ...m, def: info };
  }

  /* ---------- [C] 플레이어 잉크(대조군 — 541 이 정한 ×1.5 가 안 움직였는지) ---------- */
  out.player = await page.evaluate(async () => {
    window.__cap.length = 0; await window.__raf();
    const sc = window.__drawSc('knight', 'run'), ink = window.__inkAnim('knight', 'run');
    return { sc, drawnW: sc && ink ? +(ink.w * sc).toFixed(2) : null,
             drawnH: sc && ink ? +(ink.h * sc).toFixed(2) : null, r: +player.r.toFixed(3) };
  });

  /* ---------- [D] 겹침 — 3마리 장착 · 한 바퀴를 돌며 플레이어 잉크가 얼마나 덮이는가 ----------
     펫은 `orbitAng*0.55 + i*(2π/n)` 자리라 각도를 직접 밀어 «한 바퀴» 를 훑는다.
     세계를 굴리면 플레이어가 움직여 표본이 흔들리므로 `step` 을 세우고 자리만 계산해서 놓는다. */
  out.overlap = await page.evaluate(async () => {
    window.__wear3();
    /* ⚠ `syncPets()` 는 애니 시작점을 `Math.random()*5` 로 흩는다 — 세계를 멈추면 그 한 프레임이
       그대로 굳어 표본마다 «다른 잉크» 를 재게 된다(같은 값을 두 번 재서 86.3% ↔ 70.6% 가 나왔다).
       아래 루프가 표본 번호 k 를 그대로 애니 프레임으로 쓴다 — 결정적이면서 애니 전 프레임을
       고루 훑는다(344 «플레이키 항» 대책). */
    for (const p of pets) { p.at = 0; p.adone = false; }
    /* 플레이어 쪽도 같은 이유로 못박는다 — 세계를 멈춘 «순간» 의 프레임이 매 실행 달라서
       분모(플레이어 잉크 상자)가 흔들렸다(같은 트리를 두 번 재서 38.6% ↔ 40.3%). */
    player.at = 0; player.vx = 0; player.vy = 0;
    /* 궤도 상수는 «있으면 제품 값, 없으면 수리 전 리터럴» 로 읽는다 — 같은 자가 두 트리에서 돈다 */
    const OX = (typeof PET_ORB_X !== 'undefined') ? PET_ORB_X : 62;
    const OY = (typeof PET_ORB_Y !== 'undefined') ? PET_ORB_Y : 30;
    const OU = (typeof PET_ORB_UP !== 'undefined') ? PET_ORB_UP : 46;
    const realStep = window.step;
    window.step = function () {};
    const N = 72, rows = [];
    try {
      for (let k = 0; k < N; k++) {
        const ang = k * (6.283185 / N);
        window.orbitAng = ang / 0.55;
        /* 제품과 **같은 식**으로 자리를 놓는다(수렴을 기다리지 않고 목표점에 바로 둔다) */
        for (let i = 0; i < pets.length; i++) {
          const a = ang + i * (6.283185 / Math.max(1, pets.length));
          pets[i].x = player.x + Math.cos(a) * OX;
          pets[i].y = player.y - OU + Math.sin(a) * OY;
          pets[i].at = k;                       /* 애니 프레임도 표본과 함께 돈다(결정적) */
        }
        await window.__raf();
        const pb = window.__playerBox();
        if (!pb) continue;
        const parea = pb.w * pb.h;
        let cov = 0, worst = 0;
        for (const p of pets) {
          const b = window.__petBox(p); if (!b) continue;
          const ix = Math.max(0, Math.min(pb.x + pb.w, b.x + b.w) - Math.max(pb.x, b.x));
          const iy = Math.max(0, Math.min(pb.y + pb.h, b.y + b.h) - Math.max(pb.y, b.y));
          const a2 = ix * iy;
          cov += a2; if (a2 > worst) worst = a2;
        }
        rows.push({ k, cov: +(Math.min(cov, parea) / parea).toFixed(4), worst: +(worst / parea).toFixed(4) });
      }
    } finally { window.step = realStep; }
    const covs = rows.map(r => r.cov), worsts = rows.map(r => r.worst);
    return {
      n: rows.length,
      orb: { x: OX, y: OY, up: OU },
      maxCov: +Math.max(...covs).toFixed(4),
      meanCov: +(covs.reduce((a, b) => a + b, 0) / covs.length).toFixed(4),
      maxOne: +Math.max(...worsts).toFixed(4),
      frames40: covs.filter(v => v > 0.40).length,
      frames25: covs.filter(v => v > 0.25).length
    };
  });

  /* ---------- [E] 26/50 시트 — 카드·슬롯 썸네일은 범위 밖(411·492 회귀) ---------- */
  out.sheet = await page.evaluate(() => {
    const o = {};
    const el = document.querySelector('#petw .sk-si, #petw .sk-slot');
    o.slotCss = el ? getComputedStyle(el).width + '×' + getComputedStyle(el).height : null;
    o.petThumb = (typeof PET_TH !== 'undefined') ? JSON.parse(JSON.stringify(PET_TH)) : null;
    return o;
  });

  return out;
}

module.exports = { INSTALL, BOXES, measure };
