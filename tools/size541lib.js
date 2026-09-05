/* 541 공용 — «전투 화면에서 무엇이 얼마나 크게 그려지는가» 를 재는 자 한 벌.
   `probe541`(재현)과 `verify541`(게이트)이 **같은 함수**를 쓴다 — 385 «자매 자 드리프트»
   (같은 것을 재는 두 자가 각자 사본을 들고 조용히 갈라지는 것)를 주석이 아니라 파일로 닫는다.

   재는 법 두 겹:
     ① **배율** — `drawImage` 를 감싸 제품이 실제로 넘긴 dh/sh 를 받아 적는다(표 값이 아니라 «찍힌 것»).
     ② **잉크** — 그 아틀라스 애니에서 «가장 큰 프레임» 의 알파 bbox × 배율
        (가장 큰 프레임으로 재는 이유는 `bossDrawnH()` 와 같다 — 애니 중 24% 커지는 종이 있다).
     그리고 스킬 그림은 **캔버스에서 찍힌 픽셀**을 차분으로 잰다(아래 measure 의 [E]).           */

/* 페이지에 심는 계측기 — page.evaluate(INSTALL) */
const INSTALL = () => {
  const cv = document.getElementById('view');
  const c = cv.getContext('2d');
  if (!c.__cap541) {
    const orig = c.drawImage;
    window.__cap = [];
    c.__cap541 = true;
    c.drawImage = function (img, sx, sy, sw, sh, dx, dy, dw, dh) {
      if (arguments.length === 9) window.__cap.push({ sx, sy, sw, sh, dw, dh });
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
    return x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  window.__inkAnim = (key, anim) => {
    const A = ATLAS[key]; if (!A || !A.a || !A.a[anim]) return null;
    let best = null, bn = null;
    for (const n of A.a[anim]) { const f = A.f[n]; if (f && (!best || f[3] > best[3])) { best = f; bn = n; } }
    if (!bn) return null;
    const ink = window.__inkFr(key, bn);
    return ink ? { fr: bn, w: ink.w, h: ink.h } : null;
  };
  /* 이번에 찍힌 것 중 이 아틀라스·이 애니의 «최대 배율»(팝인 중인 표본을 걸러 낸다) */
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
};

/* 한 판 전부 재서 돌려준다 — probe541 도 verify541 도 이 한 함수만 부른다 */
async function measure(page) {
  await page.evaluate(INSTALL);
  const out = {};

  const metric = (key, anim) => page.evaluate(([key, anim]) => {
    const sc = window.__drawSc(key, anim), ink = window.__inkAnim(key, anim);
    return { key, anim, sc, inkW: ink ? ink.w : null, inkH: ink ? ink.h : null,
             drawnW: sc && ink ? +(ink.w * sc).toFixed(2) : null,
             drawnH: sc && ink ? +(ink.h * sc).toFixed(2) : null };
  }, [key, anim]);

  /* ---------- [A] 플레이어 ---------- */
  await page.evaluate(async () => {
    enemies.length = 0; corpses.length = 0; window.__cap.length = 0; await window.__raf();
  });
  await page.waitForTimeout(400);
  out.player = await metric('knight', 'run');
  out.playerR = await page.evaluate(() => player.r);

  /* ---------- [B] 잡몹 3종 ---------- */
  out.mobs = {};
  for (const tk of ['zombie', 'goblin', 'dark']) {
    const T = await page.evaluate(async tk => {
      enemies.length = 0; corpses.length = 0; window.__cap.length = 0;
      makeEnemy(tk);
      /* ⚠ 루프가 그 사이에 잡몹을 낳는다 — «마지막 개체» 가 아니라 tk 로 찾아야 한다 */
      const e = enemies.filter(o => o.tk === tk).pop();
      if (e) { e.born = 1; e.nopop = true; e.x = player.x + 150; e.y = player.y; }
      await window.__raf();
      return { atlas: ETYPE[tk].atlas, walk: ETYPE[tk].walk, tsc: ETYPE[tk].scale,
               tr: ETYPE[tk].r, er: e ? +e.r.toFixed(4) : null };
    }, tk);
    const m = await metric(T.atlas, T.walk);
    out.mobs[tk] = { ...m, tsc: T.tsc, tr: T.tr, er: T.er };
  }
  await page.evaluate(() => { enemies.length = 0; corpses.length = 0; });

  /* ---------- [C] 보스 3자리 ---------- */
  out.boss = await page.evaluate(() => {
    const d = (typeof DUNGEONS !== 'undefined' && DUNGEONS[0]) ? DUNGEONS[0] : null;
    const db = d ? dunBossType(d) : null;
    const pr = (typeof promoType === 'function') ? promoType(0) : null;
    const inkOf = (key, anim, sc) => { const i = window.__inkAnim(key, anim); return i ? +(i.h * sc).toFixed(2) : null; };
    return {
      drawnH: +bossDrawnH().toFixed(4), rk: +bossRK().toFixed(6),
      stage: { sc: ETYPE.boss.scale, r: ETYPE.boss.r, ink: inkOf(ETYPE.boss.atlas, ETYPE.boss.walk, ETYPE.boss.scale) },
      dun: db ? { id: d.id, sc: +db.scale.toFixed(6), r: db.r, ink: inkOf(db.atlas, db.walk, db.scale) } : null,
      promo: pr ? { sc: +pr.scale.toFixed(6), r: pr.r, ink: inkOf(pr.atlas, pr.walk, pr.scale) } : null,
    };
  });

  /* ---------- [D] 아레나 도전자 = 플레이어와 같은 몸인가 ---------- */
  out.arena = await page.evaluate(async () => {
    enemies.length = 0; corpses.length = 0; window.__cap.length = 0;
    makeEnemy('arena');
    const e = enemies.filter(o => o.tk === 'arena').pop();
    if (e) { e.born = 1; e.nopop = true; e.x = player.x + 150; e.y = player.y; }
    await window.__raf();
    /* 도전자와 플레이어는 **같은 아틀라스**를 쓴다 — 이번 프레임에 knight 를 그린 배율이
       몇 «종류» 인가가 곧 «같은 몸인가» 다(한 종류 = 둘이 같은 크기로 서 있다). */
    const set = {};
    for (const k in ATLAS.knight.f) { const f = ATLAS.knight.f[k]; set[f[0] + ',' + f[1] + ',' + f[2] + ',' + f[3]] = 1; }
    const scs = [];
    for (const r of window.__cap) {
      if (!set[r.sx + ',' + r.sy + ',' + r.sw + ',' + r.sh]) continue;
      const sc = +(r.dh / r.sh).toFixed(4);
      if (!scs.includes(sc)) scs.push(sc);
    }
    const o = { tsc: ETYPE.arena.scale, tr: ETYPE.arena.r, r: e ? +e.r.toFixed(4) : null,
                playerR: player.r, knightScales: scs.sort((a, b) => a - b) };
    enemies.length = 0; corpses.length = 0;
    return o;
  });

  /* ---------- [E] 스킬 그림 — 찍힌 픽셀 ---------- */
  out.skill = await page.evaluate(async () => {
    const cv = document.getElementById('view'), c = cv.getContext('2d');
    /* 논리 px 반경. ⚠ 넓게 잡으면 플레이어 쪽 그림(오라 맥동 등)이 창에 걸려 잉크로 읽힌다 —
       130 으로 잡았을 때 slash 표본이 71.5×260 = 창 전체가 됐다. 70 이면 창의 가장 가까운
       모서리가 플레이어에서 184px 이라 오라 반경 92 밖이고, 가장 큰 표본(ice)도 넉넉히 든다. */
    const R = 70;
    const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const mk = k => ({ k, x: player.x + 190, y: player.y - 210, vx: 0, vy: 0, a: 0, spin: 0.4,
                       col: '#dff2ff', life: 9, pierce: 99, dmg: 0, t: 0, tn: 0, ti: 0, tr: null, born: 1 });
    /* getImageData 는 «장치 픽셀» 이다 — 캔버스가 setTransform(SC,…) 라 SC 를 곱한다 */
    const grab = () => {
      const x = Math.round((player.x + 190 + camOx - R) * SC), y = Math.round((player.y - 210 + camOy - R) * SC);
      return c.getImageData(x, y, R * 2 * SC, R * 2 * SC).data;
    };
    const dif = (a, b, i) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    /* ⚠ 세계를 멈춰도 화면에는 잔잔한 흔들림이 남는다(시계로 도는 그림들). 실측(가만히 둔 세 프레임):
       |Δ|>40 인 화소가 17,623개(창의 6.5%)이고 **최댓값 100**. 그래서 두 겹으로 거른다 —
       ① 가만히 둔 두 장의 차이가 40 을 넘는 화소는 «흔들리는 자리» 라 빼고 ② 잉크는 |Δ|>120 만 센다. */
    const bbox = (n1, n2, cur) => {
      const W = R * 2 * SC;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (dif(n1, n2, i) > 40) continue;
        if (dif(n2, cur, i) > 120) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return x1 < 0 ? null : { w: +((x1 - x0 + 1) / SC).toFixed(2), h: +((y1 - y0 + 1) / SC).toFixed(2) };
    };
    const clear = () => { enemies.length = 0; corpses.length = 0; shots.length = 0; ghosts.length = 0;
                          parts.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
                          rings.length = 0; drones.length = 0; cam.shake = 0; player.vx = 0; player.vy = 0;
                          /* ⚑ 936 — **자리까지** 못박는다(928 처방). 속도만 0 으로 두면 상자는
                             `page.goto` 뒤 실시간 루프가 밀어 놓은 자리에 매달린 채 굳는다 —
                             한 판 안에서는 (아래 `window.step` 정지 덕에) 고정이지만 **판마다**
                             다른 자리라 상자에 드는 바탕(바닥 타일·오라 가장자리)이 달라진다.
                             자리는 제품의 «집»(`spawnStage()` 의 `WORLD.w/2, WORLD.h/2`)에서 판다(402). */
                          player.x = WORLD.w / 2; player.y = WORLD.h / 2; };
    /* 두 프레임의 «배경» 이 같아야 차분이 곧 그림이다 — 그래서 **세계를 멈춘다**.
       `step` 을 빈 함수로 바꾸면 draw 는 계속 도는데 카메라·애니·파티클이 한 프레임도 안 움직인다. */
    const realStep = window.step;
    window.step = function () {};
    const res = {};
    try {
      for (const k of ['slash', 'shuri', 'ice', 'boom']) {
        clear(); await raf(); await raf();
        const n1 = grab();
        await raf();
        const n2 = grab();
        shots.push(mk(k));
        await raf();
        const cur = grab();
        shots.length = 0;
        res[k] = bbox(n1, n2, cur);
        await raf();
      }
    } finally { window.step = realStep; }
    clear();
    return res;
  });

  /* ---------- [F] 장판·레이저·오라 — 그린 반경 = 피해 반경인 자리 ---------- */
  out.zone = await page.evaluate(() => {
    const g = id => SKILLS.find(s => s.id === id) || {};
    return { poisonR: 92, fireR: g('flask').zr, laserW: g('laser').w, laserLen: g('laser').len,
             novaR: g('nova').r, auraR: 92 + 6 * (typeof oLv === 'function' ? oLv('aura') : 0) };
  });

  return out;
}

module.exports = { INSTALL, measure };
