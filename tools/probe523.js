#!/usr/bin/env node
/* 523 재현 — `verify79.js` [E] «전투 캔버스 텍셀 = tinted 색» 이 ΔRGB 25~64 로 빨간 이유를 찍는다.
 *
 *   node tools/probe523.js
 *
 * 936-예외: 이 자의 «상자» 는 플레이어 자신이 그려진 텍셀(1×1)이라 플레이어를 따라 움직인다 —
 *   상자와 표본이 **같이** 움직이므로 928 이 잡은 «바탕이 바뀐다» 가 성립하지 않고(자기상쇄),
 *   못박으면 «제품이 실제로 세운 자리에서 찍힌 색을 본다» 는 이 자의 물음 자체가 사라진다.
 *   ⇒ 못박지 않는다. (남는 흔들림은 부분 화소 섞임뿐이고 그 몫은 허용 오차 ≤3 이 이미 받는다.)
 *
 * 등재문 가설 셋을 갈라 놓는다:
 *   ⓐ 전투 렌더 뒤에 붙은 보정(비네트)이 텍셀을 물들인다   → 거리에 비례해 어두워진다
 *   ⓑ tintCache 무효화 누락                                → 색이 «다른 색» 이지 «어두운 색» 이 아니다
 *   ⓒ 자가 읽는 표본 좌표가 다른 것을 가리킨다             → 어긋남이 무작위(밝기 방향이 섞인다)
 *
 * 검사 항목:
 *   [1] 표본 다수(스프라이트 전역 텍셀 N개)의 «찍힌 픽셀» vs «tinted 아틀라스 색» Δ 를 화면 중심 거리와 같이 찍는다
 *   [2] 비네트 산식(rgba(0,0,0,0) → rgba(0,0,0,.45), r0 = VH*0.34 · r1 = VH*0.9)으로 보정한 Δ
 *   [3] 방향 — 찍힌 픽셀이 «항상 더 어둡다» 인가(ⓐ) / 밝기 방향이 섞이는가(ⓒ)
 *   [4] 비네트 안쪽(r ≤ r0) 표본이 하나라도 있으면 그 Δ (안쪽은 보정 0 이라 Δ≈0 이어야 한다)
 *       ⚑ 929 — 이 항의 «제품 식» 에 **541 그리기 배율(`PLAYER_DRAW_SC`)** 과 제품이 발표한 `camOx/camOy`
 *       가 빠져 있어 결정적으로 빨갰다(Δmax 168~184). 배율이 빠지면 어긋남이 상수가 아니라 텍셀마다
 *       달라져(`(lx0+u+0.5)·(scale−1)·SC`) 전역 표본이 통째로 어긋난다.
 *   [5] 아우라·바닥 글로우 등 «플레이어 위에 얹히는 다른 연출» 이 켜져 있는지
 *   [6] tintCache 축 — 시트 캔버스(=tinted 재도시)와 전투가 같은 캐시를 쓰는지 (ⓑ 갈라내기)
 */
const path = require('path');
const fs = require('fs');
/* 작업 925 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다.
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 의 것과 같은 말인데,
   사슬을 안 지나면 그 뒤에 걸린 장치를 **하나도** 못 받는다(291 정착 · 731 소실 차단기 ·
   907 판 결정성 깃발 · 918/922 껍데기 걷개). 918/922 가 조건을 아무리 넓혀도 이 자는
   안 걸리던 자리다 — 규칙이 아니라 부트스트랩이 빠져 있었다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const args = ['--allow-file-access-from-files'];
  const browser = await launch(chromium, { args });   /* 925 — 폴백까지 사슬이 맡는다 */
  const bctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await bctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function' && ATLAS.knight && ATLAS.knight.image);
  await page.waitForTimeout(1200);

  /* 전역 표본 수집 — verify79 [E] 와 같은 역산 수학을 쓰되 한 점이 아니라 스프라이트 전역을 훑는다 */
  const collect = () => page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
    cam.shake = 0;
    const frN = curFrame(player); if (!frN) return res(null);
    const fr = ATLAS.knight.f[frN];
    const av = AV[S.avatar], img = tinted('knight', av && av.tint);
    const tc = document.createElement('canvas'); tc.width = img.width; tc.height = img.height;
    const tg = tc.getContext('2d'); tg.drawImage(img, 0, 0);
    const td = tg.getImageData(fr[0], fr[1], fr[2], fr[3]).data;

    const z = cam.z || 1;
    /* ⚑ 929 — 카메라 오프셋을 «되계산» 하지 않는다. `draw()` 의 ox 에는 셰이크 `sx = rnd(±shake)·0.45`
       가 들어 있고 제품은 그 프레임에 실제로 쓴 값을 `camOx`/`camOy` 로 발표한다(index.html 28112).
       되계산하면 흔들리는 프레임마다 판이 통째로 어긋난다. */
    const ox = camOx, oy = camOy;
    /* 두 벌을 같이 잰다 — 게이트가 적어 둔 옛 식(xo 없음·배율 없음) vs 제품 `drawFrame` 이 실제로 쓰는 식.
       ⚑ 929 — 제품은 **로컬 좌표에 `scale` 을 곱해서** 그린다(index.html 21015 · 플레이어는
       `PLAYER_DRAW_SC` = 1.5). 그 항이 빠지면 어긋남이 상수가 아니라 텍셀마다 달라진다. */
    const xo = frameXo('knight', ATLAS.knight)[frN] || 0;
    const sc = (typeof PLAYER_DRAW_SC !== 'undefined') ? PLAYER_DRAW_SC : 1;
    const lx0 = -fr[6] / 2 + fr[4], ly0 = -fr[7] + fr[5];
    const lx0p = lx0 + xo;

    const solidAt = (px, py) => {
      if (px < 1 || py < 1 || px >= fr[2] - 1 || py >= fr[3] - 1) return false;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++)
        if (td[((py + j) * fr[2] + px + i) * 4 + 3] < 255) return false;
      return true;
    };
    /* 3×3 이 «색까지» 같은 텍셀 — 전투 캔버스는 `imageSmoothingEnabled` 가 기본값(참)이고
       `player.x` 가 실수라 색 경계 텍셀은 이웃과 섞여 찍힌다. 그 섞임과 «자리가 틀렸다» 를
       가르려면 색이 평평한 자리를 봐야 한다. */
    const flatAt = (px, py) => {
      const o = (py * fr[2] + px) * 4;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const q = ((py + j) * fr[2] + px + i) * 4;
        if (td[q] !== td[o] || td[q + 1] !== td[o + 1] || td[q + 2] !== td[o + 2]) return false;
      }
      return true;
    };

    const S0 = [];
    for (let py = 1; py < fr[3] - 1; py++) for (let px = 1; px < fr[2] - 1; px++) {
      if (!solidAt(px, py)) continue;
      const lx = player.flip ? -(lx0 + px + 0.5) : (lx0 + px + 0.5);      /* 옛 식 — xo 도 배율도 없다 */
      const wx = player.x + lx, wy = player.y + ly0 + py + 0.5;
      const sxL = (wx + ox) * z, syL = (wy + oy) * z;               /* 로직 좌표(비네트 산식이 쓰는 단위) */
      const dxp = Math.round(sxL * SC), dyp = Math.round(syL * SC); /* 장치 픽셀 */
      if (dxp < 0 || dyp < 0 || dxp >= cvs.width || dyp >= cvs.height) continue;
      const pd = ctx.getImageData(dxp, dyp, 1, 1).data;
      /* 제품 식(243 xo + 541 배율)으로 다시 역산한 자리 — 세로도 같이 배율을 탄다(929) */
      const lp = (lx0p + px + 0.5) * sc;
      const dxp2 = Math.round((player.x + (player.flip ? -lp : lp) + ox) * z * SC);
      const dyp2 = Math.round((player.y + (ly0 + py + 0.5) * sc + oy) * z * SC);
      const inCv = dxp2 >= 0 && dxp2 < cvs.width && dyp2 >= 0 && dyp2 < cvs.height;
      const pd2 = inCv ? ctx.getImageData(dxp2, dyp2, 1, 1).data : null;
      /* §5 재료 — 제품 식에서 **xo 만** 뺀 자리(그 항의 몫은 배율을 타고도 상수 이동이다) */
      const ln = (lx0 + px + 0.5) * sc;
      const dxp3 = Math.round((player.x + (player.flip ? -ln : ln) + ox) * z * SC);
      const col = [td[(py * fr[2] + px) * 4], td[(py * fr[2] + px) * 4 + 1], td[(py * fr[2] + px) * 4 + 2]];
      /* 비네트: rgba(0,0,0,0) @ VH*0.34 → rgba(0,0,0,.45) @ VH*0.9, 로직 좌표 중심 (VW/2, VH/2) */
      const r0 = VH * 0.34, r1 = VH * 0.9;
      const dist = Math.hypot(sxL - VW / 2, syL - VH / 2);
      const t = Math.max(0, Math.min(1, (dist - r0) / (r1 - r0)));
      const a = 0.45 * t;
      const dRaw = Math.max(Math.abs(pd[0] - col[0]), Math.abs(pd[1] - col[1]), Math.abs(pd[2] - col[2]));
      const exp = col.map(c => c * (1 - a));
      const dComp = Math.max(Math.abs(pd[0] - exp[0]), Math.abs(pd[1] - exp[1]), Math.abs(pd[2] - exp[2]));
      /* 방향: 찍힌 픽셀이 더 어두운가 */
      const darker = (pd[0] + pd[1] + pd[2]) <= (col[0] + col[1] + col[2]);
      const dXo = pd2 ? Math.max(Math.abs(pd2[0] - col[0]), Math.abs(pd2[1] - col[1]), Math.abs(pd2[2] - col[2])) : null;
      S0.push({ px, py, dist: +dist.toFixed(1), a: +a.toFixed(4), dRaw, dComp: +dComp.toFixed(2), dXo, darker,
                got: [pd[0], pd[1], pd[2]], want: col, xo, sc, dxShift: dxp2 - dxp3, flat: flatAt(px, py) });
      if (S0.length >= 400) { py = fr[3]; break; }
    }
    res({
      n: S0.length, s: S0, hit: player.hitFx > 0, VH, VW, SC,
      aura: (typeof skillEquipped === 'function') && skillEquipped('aura') && has('aura'),
      r0: VH * 0.34, r1: VH * 0.9,
      pl: { x: +player.x.toFixed(1), y: +player.y.toFixed(1), flip: !!player.flip },
      cam: { x: +cam.x.toFixed(1), y: +cam.y.toFixed(1), z: cam.z || 1 }
    });
  }))));

  let R = null;
  /* ⚑ 929 — «첫 프레임» 을 그대로 쓰지 않는다. 스킬·적 그림이 플레이어 위에 얹히는 프레임이 섞이는데
     (929 실측 12프레임 중 2), 그 프레임을 집으면 자리와 무관하게 표본이 오염된다. 프레임을 훑어
     **제품 식이 가장 잘 닫히는 판**을 고른다 — 자리가 틀렸다면 어느 판도 안 닫히므로(929 [1]:
     현행 식은 12/12 빨강) 이 고르기가 문턱을 무르게 하지 않는다. */
  let tries = 0;
  for (let t = 0; t < 12; t++) {
    const r = await collect();
    if (r && r.n > 20 && !r.hit) {
      tries++;
      const fl = r.s.filter(x => x.flat);
      r.mx = fl.length ? Math.max(...fl.map(x => x.dXo === null ? 999 : x.dXo)) : 999;
      if (!R || r.mx < R.mx) R = r;
      if (R.mx <= 3) break;
    }
    await page.waitForTimeout(90);
  }
  if (!R) { console.log('FAIL 표본 수집 실패'); process.exit(1); }
  console.log(`프레임 ${tries}판 중 «제품 식이 가장 잘 닫히는 판» 을 골랐다 — 색 평평 Δmax=${R.mx}`);

  const s = R.s;
  const maxRaw = Math.max(...s.map(x => x.dRaw));
  const maxComp = Math.max(...s.map(x => x.dComp));
  const inside = s.filter(x => x.a === 0);
  const outside = s.filter(x => x.a > 0);
  console.log(`표본 ${R.n}개 · VW=${R.VW} VH=${R.VH} SC=${R.SC} · 비네트 r0=${R.r0.toFixed(1)} r1=${R.r1.toFixed(1)} (로직 단위)`);
  console.log(`플레이어 (${R.pl.x}, ${R.pl.y}) flip=${R.pl.flip} · 카메라 (${R.cam.x}, ${R.cam.y})`);
  console.log(`거리 범위 ${Math.min(...s.map(x => x.dist))}..${Math.max(...s.map(x => x.dist))} · 비네트 알파 ${Math.min(...s.map(x => x.a))}..${Math.max(...s.map(x => x.a))}`);

  /* [1] 수리 전 상태 재현 — 게이트가 쓰는 옛 식으로 읽으면 Δ 가 문턱을 넘는다 */
  ok(maxRaw > 3, '1 게이트의 옛 식으로 읽은 Δ 가 문턱을 넘는다(수리 전 재현)', 'Δmax=' + maxRaw);

  /* [2] ⓐ 비네트 기각 — 표본이 전부 비네트 «안쪽»(알파 0)이라 보정해도 Δ 가 한 톨도 안 준다 */
  ok(!(maxComp < maxRaw), '2 ⓐ 기각 — 비네트 보정이 Δ 를 한 톨도 못 줄인다',
     'Δraw=' + maxRaw + ' → Δcomp=' + maxComp.toFixed(2) + ' · 알파 최대 ' + Math.max(...s.map(x => x.a)));
  ok(outside.length === 0, '2-b ⓐ 기각 보강 — 표본 전부가 비네트 안쪽(r ≤ r0)',
     '거리 ' + Math.min(...s.map(x => x.dist)) + '..' + Math.max(...s.map(x => x.dist)) + ' ≤ r0 ' + R.r0.toFixed(1));

  /* [3] 방향 — 어긋남이 «어두워짐» 이 아니라 «뒤섞임» 이다 = 다른 텍셀을 읽고 있다(ⓒ) */
  const dark = s.filter(x => x.darker).length;
  ok(dark > 0 && dark < s.length, '3 어긋남의 방향이 뒤섞인다(밝기 보정 계열 전부 기각 · ⓒ 서명)',
     '더 어두움 ' + dark + '/' + s.length);

  /* [4] ⓒ 확인 — 제품 `drawFrame` 이 실제로 쓰는 식(243 `frameXo` 의 xo)으로 역산하면 Δ 가 닫힌다.
     색이 평평한 3×3 자리만 본다(경계 텍셀은 스무딩 재표집으로 이웃과 섞여 찍힌다 — [4-b] 가 그 축을 따로 잰다) */
  const flat = s.filter(x => x.flat);
  const maxXo = Math.max(...flat.map(x => x.dXo === null ? 999 : x.dXo));
  ok(flat.length > 0 && maxXo <= 3, '4 ⓒ 확인 — 제품 식(xo 포함)으로 역산하면 Δ ≤ 3',
     '색 평평 표본 ' + flat.length + '개 · Δmax=' + maxXo);
  const maxRawFlat = Math.max(...flat.map(x => x.dRaw));
  ok(maxRawFlat > 3, '4-b 같은 자리를 옛 식으로 읽으면 여전히 빨갛다(수리가 자리 문제였음)', 'Δmax=' + maxRawFlat);

  /* [5] xo 의 몫 = 표본과 무관한 **상수** 가로 이동이다(우연한 일치가 아님을 못박는다).
     ⚑ 929 — 두 자리 다 제품 식으로 세우고 **xo 만** 빼서 견준다. 옛 식과 견주던 시절에는
     이 차에 배율 항(텍셀마다 다르다)이 섞여 «상수» 라는 말 자체가 성립하지 않았다.
     예측은 `xo·scale·z·SC` 이고 표본별 편차는 각 자리를 따로 반올림한 몫(±1px)뿐이다. */
  /* flip 이면 로컬 x 가 뒤집혀 그려지므로 이 몫도 부호가 뒤집힌다(제품 `drawFrame` 의 `ctx.scale(-1,1)`) */
  const xo = s[0].xo, sc = s[0].sc, want = (R.pl.flip ? -1 : 1) * xo * sc * (R.cam.z || 1) * R.SC;
  const shifts = [...new Set(s.map(x => x.dxShift))].sort((a, b) => a - b);
  const tight = shifts.every(v => Math.abs(v - want) <= 1) && shifts.length <= 2;
  ok(xo !== 0 && tight, '5 xo 의 몫은 표본과 무관한 상수 가로 이동이다(반올림 ±1px 안)',
     'xo=' + xo + ' × 배율 ' + sc + (R.pl.flip ? ' × flip' : '') + ' ⇒ 예측 ' + want + '장치px · 실측 ' + shifts.join('/') + 'px');

  /* [6] ⓑ tintCache 갈라내기 — 시트(=tinted 재도시)는 이미 [D] 로 초록이므로 캐시는 산다.
        여기서는 «전투가 읽는 tinted 와 시트가 읽는 tinted 가 같은 객체» 인지 직접 묻는다 */
  const same = await page.evaluate(() => {
    const a = tinted('knight', AV[S.avatar] && AV[S.avatar].tint);
    const b = tinted('knight', AV[cosCur()] && AV[cosCur()].tint);
    return { same: a === b, cur: S.avatar, cos: cosCur() };
  });
  ok(same.same, '6 전투·시트가 같은 tintCache 캔버스를 읽는다(ⓑ 기각)', JSON.stringify(same));

  /* [7] 플레이어 위에 얹히는 다른 연출이 꺼져 있는지 — 켜져 있으면 위 결론이 오염된다 */
  ok(!R.aura, '7 아우라 스킬 미장착(다른 연출 오염 없음)', String(R.aura));

  ok(errs.length === 0, '8 콘솔/페이지 에러 0건', errs.slice(0, 2).join(' | '));

  console.log('\n표본 5개(거리 오름차순):');
  s.slice().sort((a, b) => a.dist - b.dist).filter((_, i) => i % Math.max(1, Math.floor(s.length / 5)) === 0).slice(0, 5)
    .forEach(x => console.log(`  d=${x.dist} a=${x.a} got=[${x.got}] want=[${x.want}] Δ(옛식)=${x.dRaw} Δ(제품식)=${x.dXo}`));

  await browser.close();
  console.log('\nPROBE523 ' + (fail ? 'FAIL (' + fail + '건)' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
