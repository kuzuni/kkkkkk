/* 작업 792 재현 — «스킬 발동 이펙트가 네 가지 렌더링 문법을 섞어 쓴다» 를 **찍힌 픽셀**로 잰다
 *
 *   node tools/probe792.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설부터 재현한다. 710 이 남긴 지적(②통일감·③덩치)은
 * 눈의 말이고, 792 등재문 자신이 «자로 검산하지 않은 눈의 지적을 그대로 받지 마라» 고 못박는다
 * (710 9회차 M 의 «멀티 검기가 −45%» 가 자로는 +18% 였다). 그래서 **문법을 수치로 정의**하고
 * 그 정의로 17종을 전수로 잰다.
 *
 * ── 무엇을 «문법» 으로 삼는가 (792 등재문이 요구한 한 줄) ──────────────────
 * 한 발의 그림은 **세 층**으로 이뤄진다. 층의 «있고 없음» 이 곧 문법이다:
 *
 *   ① 후광(soft)   — 바탕을 약하게만 밀어내는 저알파 층. 재질·부피를 준다.
 *   ② 본체(hard)   — 바탕을 크게 밀어내는 불투명 층(`b.col`). 실루엣을 준다.
 *   ③ 하이라이트(spec) — 본체 위의 밝은 코어. «빛나는 발» 이라는 톤을 준다.
 *
 * 네 문법(가는 선화 / 단색 평면 / 파스텔 후광+본체 / 방사 발광)은 이 세 층 중
 * **무엇을 빼먹었는가**로 갈린다 — 단색 평면은 ①③ 이 없고, 가는 선화는 ③ 이 없고,
 * 방사 발광은 ②(또렷한 실루엣)가 약하다. 그래서 «층이 다 있는가 + 비율이 한 밴드인가» 를
 * 재면 네 문법이 하나로 모였는지를 눈이 아니라 자가 말한다.
 *
 * ── 어떻게 재는가 ────────────────────────────────────────────────────────
 * 710 의 [C]·[E] 와 **같은 자리·같은 방법**(실제 게임 캔버스 · 실제 `shotBody()`)으로 그린 뒤
 * 바탕 대비 변화량으로 화소를 가른다:
 *   soft = 8 < Δ ≤ 60   ·   hard = Δ > 60   ·   spec = 본체 위 근백색(r,g,b ≥ 232)
 * (Δ = 채널별 절대차의 최댓값. 710 의 마스크 문턱 8 을 그대로 물려받아 두 자가 같은 것을 센다.)
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* 기본은 제품 트리. `P792_SRC` 로 사본(되돌림 시험용)을 가리킬 수 있다. */
const SRC = 'file://' + path.resolve(process.env.P792_SRC || path.join(__dirname, '../index.html'));

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  console.log('=== PROBE 792 — 스킬 이펙트 «렌더링 문법» 재현 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(SRC);
  await page.waitForTimeout(1100);
  const ev = async (fn) => {
    try { return await page.evaluate(fn); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev(() => {
    /* ⚑⚑ 855 — **주사위를 고정한다.** 시계를 세워도(아래 T0) 회차마다 잉크가 흔들려 남은 갈래를
       쫓아가 보니 뿌리가 하나 더 있었다: `putFoe()` 가 «적이 나올 때까지» `step()` 을 도는데
       그 횟수가 `Math.random()` 에 달렸다. 스텝 수가 다르면 **플레이어가 선 자리**가 달라지고
       (실측 `near` 73.07 ↔ 73.31), 측정 상자는 `player.x + 70` 에 매달려 있으므로
       상자가 배경(오라·플레이어 스프라이트) 위 다른 자리에 얹힌다 ⇒ 같은 발인데 잉크가 바뀐다.
       시계(위상)와 주사위(자리) 둘을 다 묶어야 «같은 트리 = 같은 수» 가 된다.
       ⚠ 판정식·문턱은 한 글자도 안 건드렸다 — 고친 것은 전부 «자가 무엇을 보고 있는가» 다. */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    let ox = camOx, oy = camOy;               /* 855 — 상자를 잡기 직전에 다시 굳힌다(아래) */

    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const clearFx = () => { for (const n in FXMAP) FXMAP[n].length = 0; };

    let foe = null;
    const putFoe = () => {
      if (!foe) { let g = 0; while (enemies.length === 0 && g++ < 600) step(1 / 60); foe = enemies[0]; }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = 300 - ox; foe.y = 300 - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };

    /* 종별 «그 스킬이 실제로 만든 첫 발» 의 규격 (710 [C] 와 같은 방법) */
    const specs = {};
    /* ⚑⚑ 985 — 궤도각을 선언값에 세운다. `verify792.js` 같은 자리의 주석이 본문이다 —
       요약: `orbitAng` 은 `step()` 이 `+= dt*2.4` 로 누적하는 각이라 부팅 1.1초와 `putFoe()` 의
       «적이 나올 때까지» 루프가 판마다 다른 자리에 놓고, `spiral` 은 발사각을 `orbitAng*0.7`
       로 잡아(26291) 같은 발이 판마다 다른 각으로 찍힌다. ⚠ `putFoe()` **뒤**여야 한다.
       (855 «주사위» · 936 «상자» 와 같은 꼴의 세 번째 축 — 갈래를 가른 표는 `tools/probe985.js`) */
    putFoe(); orbitAng = 0;

    for (const s of SKILLS) {
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      if (done && shots.length) {
        const b = shots[0];
        specs[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                        tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      clearFx();
    }

    putFoe(); clearFx();
    /* ⚠ 855 — «플레이어·카메라를 정수 격자에 세운다» 는 갈래는 **재 보고 버렸다.** 부분화소가
       남은 잡음의 뿌리인 것은 맞지만, 세우려면 상자를 잡기 전에 `draw()` 를 한 번 더 불러야 하고
       그 한 번이 주사위 흐름을 밀어 **`spec` 이 도로 흔들렸다**(붙박이 1040 → 1040 ↔ 886).
       고치려던 축을 되레 깨는 처방이라 원복했다 — 남은 잉크 잡음 ±1.5% 는 문턱에서 한참 멀다
       (fSoft 최소 0.36 ↔ 문턱 0.12 · 밴드 2.1 ↔ 3.0). 다음 사람이 같은 길을 다시 파지 않게 남긴다. */
    /* ⚑⚑ 855 — **상자를 빈 자리로 옮긴다.** 이것이 플레이키의 큰 뿌리였다.
       발을 «플레이어 옆 70px» 에 세워 두고 그 둘레를 재면 상자 안에 **발이 아닌 것**이 같이 들어온다 —
       플레이어 스프라이트 · 오라 링(반지름 92 안팎) · 플레이어를 도는 위성이 전부 그 반경이다.
       그것들의 위상은 자가 붙기 전 1.1초 동안 진짜 게임 루프가 돈 만큼 **회차마다 다르다**
       (시계를 세워도 «어느 위상에서 굳느냐» 가 다르고, 주사위를 묶어도 붙기 전 상태가 다르다).
       ⇒ 밝은 것이 `base` 에 이미 들어 있으면 그 화소는 `|a0 − base| ≤ 8` 로 **잉크에서 탈락**하고,
         하이라이트가 하필 거기 얹히면 spec 이 통째로 사라진다 — `bounce` 가 6회에 160 ↔ 1040 으로
         뛴 것이 정확히 이것이다(온전한 원 = 1040px · 160 은 대부분이 남의 잉크에 먹힌 것).
       발을 플레이어에게서 **180px** 떼면 오라(반지름 ≤92 ⇒ 화면 x ≤369)가 상자(x 397..517)에
       닿지 않아 상자 안에는 그 발뿐이다.
       ⚠ **창이 좁다 — 180 은 아무 값이나 고른 것이 아니다.** 이 게임의 전투 뷰포트는
         `VW = 540`(1080 이 아니다 · SC=2 라 장치화소로 1080)이고 플레이어는 화면 x 277 에 선다.
         · 아래로: 오라 오른끝 369 를 상자 좌변이 넘어야 하므로 **dx ≥ 152**
         · 위로  : 상자 우변(CX+60)이 캔버스 540 안에 있어야 하므로 **dx ≤ 203**
         실측으로 dx 240 은 `edgeFade` 0.676, dx 300 은 **0** 이라 잉크가 통째로 0 이 됐다
         (한 번 그렇게 짚었다가 17종이 전부 0 으로 나왔다 — 다음 사람이 같은 데 빠지지 않게 남긴다).
       ⚠ 70 → 180 은 «그리기 감쇠» 를 건드리지 않는다 — 감쇠는 `near < 62` 에서만 걸리고(둘 다 밖),
         `edgeFade` 도 실측 1 이다. 즉 **그려지는 그림 자체는 한 화소도 안 바뀐다.** */
    /* ⚑ 936 — **재는 자리를 못박는다**(928 처방의 나머지 여집합 · 형제 자 8곳).
       상자는 `player.x` 에 매달려 있는데 플레이어는 ① `page.goto` 뒤 실시간 루프 ② `putFoe()` 가
       «적이 나올 때까지» 도는 `step()` 을 타고 **판마다 다른 자리**에 선다. 그러면 상자가 잡는
       그림의 몫이 달라진다 — 수리 전 실측(프로세스 3판): `verify710` 잉크 화소 shuri 5072 /
       5913 / 6287(±12%) · lance 4771 / 5427 / 6068. 못박으면 판을 넘어 같은 값이 나온다.
       ⚠ 자리는 제품의 «집»(`spawnStage()` 가 쓰는 `WORLD.w/2, WORLD.h/2`)에서 판다 — 자에
         좌표를 손으로 적으면 그것이 곧 사본이다(402).
       ⚠ **재는 것은 한 칸도 안 바뀐다** — 상자 크기·문턱·발 놓는 자리(`CX − ox`)는 그대로고,
         바뀌는 것은 «어느 자리에서 재는가» 뿐이다. */
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    /* ⚑⚑ 855 — **벽시계를 세우고 잰다.** 이 자는 `base` 와 `a0`·`a2` 를 서로 다른 순간에 그려
       놓고 그 차(`|a0 − base|`)를 «그 발의 잉크» 라고 부른다. 그런데 상시 연출 중에
       **벽시계로 도는 것**이 측정 상자 안에 있다 — 오라 반지름이
       `(92 + 6·oLv('aura')) × (0.9 + 0.1·sin(performance.now()/220))`(index.html 26392)로 뛴다.
       플레이어(화면 276,500)를 중심으로 한 반지름 92 안팎의 띠라 상자(x 286..406 · y 418..538)를
       통째로 가로지르므로, 두 grab 사이에 오라가 움직인 만큼이 **발의 후광으로 둔갑**했다.
       ⇒ 증상 둘이 같은 뿌리였다: ⓐ 같은 트리 반복이 흔들린다(위상이 매번 다르다) ·
         ⓑ 잉크가 발의 실제 크기보다 몇 배 크다(남의 연출을 같이 셌다).
       시계를 한 값에 묶으면 오라가 `base` 와 `a0` 에 **똑같이** 찍혀 뺄셈에서 정확히 사라진다.
       ⚠ 여기서부터는 `step()` 이 없고 `grab()`(=`draw()`)뿐이라 시계를 세워도 진행이 멈추지 않는다.
       ⚠ 문턱(1%)은 한 글자도 안 건드린다 — 825·854 처방대로 고친 것은 «자의 눈금» 이다. */
    /* ⚠ 세우는 것만으로는 모자라다 — **어디에 세우는지까지 고정**해야 한다.
       `performance.now()` 가 돌려준 값에 세우면 오라가 «그 순간의 위상» 에 굳으므로
       회차마다 다른 반지름에 굳는다(실측: 그렇게 세운 3회가 잉크 6836·6853·**6362** 로
       두 회차만 붙었다). 상수에 세우면 sin 이 한 값이라 전 회차가 같은 그림을 잰다.
       값은 «페이지가 뜬 뒤 한참» 이면 아무 상수나 되고(경과시간을 보는 연출은 전부 끝난 쪽으로
       굳는다), 1e6 은 그 조건을 만족하는 임의의 고정값이다. */
    const T0 = 1e6;
    performance.now = () => T0;
    const base = grab();

    /* 층 분해 — soft(후광) / hard(본체) / spec(하이라이트)
       ⚑⚑ **알파를 «추정» 하지 말고 «푼다».** 3회차까지 이 자리를 세 번 고쳤고 세 번 다 틀렸다:
         ⓐ 저알파 화소를 그대로 후광으로 세니 돌의 **안쪽 그림자 면**이 후광으로 셌다(비평가 CO 가
            «stone 은 글로우 0px» 이라고 적었을 때 자는 fSoft 0.384 로 초록이었다).
         ⓑ 본체 바깥만 세도, 바탕 대비 Δ 로 «저알파 층» 과 «저대비 본체» 를 못 가른다.
         ⓒ 경계를 60 → 90 으로 옮기자 이번엔 돌의 **본체**가 통째로 후광으로 넘어갔다.
       뿌리는 하나다 — **합성된 화소 하나에서 알파를 알아낼 수 없다**(α·L + (1−α)·b 는 미지수가 둘).
       ⇒ **같은 발을 두 번 겹쳐 그려** 방정식을 하나 더 만든다:
            r1 = α·L + (1−α)·b
            r2 = α·L + (1−α)·r1        (같은 층을 r1 위에 한 번 더)
          두 식에서 (r2 − r1) / (r1 − b) = 1 − α  ⇒  **α = 1 − (r2 − r1)/(r1 − b)**
       바탕 b 가 무엇이든 상관없이 **알파 그 자체**가 나온다. 저대비 본체(α=1)와 저알파 후광(α<1)이
       이제 원리적으로 갈린다. 채널은 |r1 − b| 가 가장 큰 것을 골라 나눗셈의 분모를 키운다.
       ⚠ 이 풀이는 그리기가 **source-over** 일 때만 성립한다 — 투사체 경로에는 `globalCompositeOperation`
         이 한 곳도 없음을 확인했다(있는 자리는 전부 스프라이트 생성기 쪽 19358~19697). */
    const A_BODY = 0.55;              /* α ≥ 이 값이면 «본체», 아래면 «후광» */
    const rows = {}, masks = {};
    for (const id in specs) {
      const sp = specs[id];
      const mk = () => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                          dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                          spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                          tx: sp.tx === undefined ? undefined : CX - ox,
                          ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      clearFx(); shots.push(mk());              const a0 = grab();   /* r1 — 한 겹 */
      clearFx(); shots.push(mk(), mk());        const a2 = grab();   /* r2 — 두 겹 */
      let hard = 0, sp2 = 0, mm = 0;            /* mm = 잉크 안 «가장 흰 화소»(min(r,g,b) 최댓값) */
      const m = new Uint8Array(bw * bh);        /* 잉크 전체 */
      const hd = new Uint8Array(bw * bh);       /* 본체 */
      const sf = new Uint8Array(bw * bh);       /* 후광 */
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        m[p] = 1;
        const d1 = a0[i + c] - base[i + c];
        const d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;                   /* α = 1 − (r2 − r1)/(r1 − b) */
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) { hd[p] = 1; hard++; } else sf[p] = 1;
        if (a0[i] >= 232 && a0[i + 1] >= 232 && a0[i + 2] >= 232) sp2++;
        /* 855 — 문턱(232)을 «넘었나» 만 세면 흔들릴 때 «왜» 를 못 말한다. 봉우리 자체를 같이 찍는다. */
        const mn = a0[i] < a0[i + 1] ? (a0[i] < a0[i + 2] ? a0[i] : a0[i + 2])
                                     : (a0[i + 1] < a0[i + 2] ? a0[i + 1] : a0[i + 2]);
        if (mn > mm) mm = mn;
      }
      /* 본체 바깥 = 테두리에서 «본체가 아닌» 화소를 타고 들어간 영역 */
      const out = new Uint8Array(bw * bh);
      const st = [];
      for (let x = 0; x < bw; x++) { st.push(x); st.push((bh - 1) * bw + x); }
      for (let y = 0; y < bh; y++) { st.push(y * bw); st.push(y * bw + bw - 1); }
      while (st.length) {
        const p = st.pop();
        if (p < 0 || p >= out.length || out[p] || hd[p]) continue;
        out[p] = 1;
        const x = p % bw, y = (p - x) / bw;
        if (x > 0) st.push(p - 1);
        if (x < bw - 1) st.push(p + 1);
        if (y > 0) st.push(p - bw);
        if (y < bh - 1) st.push(p + bw);
      }
      let soft = 0, sx = 0, sy = 0, hx = 0, hy = 0;
      for (let p = 0; p < sf.length; p++) {
        const x = p % bw, y = (p - x) / bw;
        if (sf[p] && out[p]) { soft++; sx += x; sy += y; }
        if (hd[p]) { hx += x; hy += y; }
      }
      const ink = soft + hard;
      rows[id] = { sh: sp.sh, ink, soft, hard, spec: sp2, mm,
                   col: sp.col, r: sp.r === undefined ? null : sp.r,
                   fSoft: +(soft / Math.max(1, ink)).toFixed(4),
                   fSpec: +(sp2 / Math.max(1, ink)).toFixed(4) };
      clearFx();
    }
    return { rows, n: Object.keys(rows).length };
  });

  if (out && out.__err) { console.log('  FAIL 측정 블록 예외 — ' + out.__err); fail++; }
  else {
    const ids = Object.keys(out.rows);
    console.log('  [표] 종별 층 분해 (ink = soft + hard · f = 비율)\n');
    console.log('   ' + '종'.padEnd(9) + 'sh'.padEnd(10) + 'ink'.padStart(7) +
                'soft'.padStart(8) + 'hard'.padStart(8) + 'spec'.padStart(7) +
                'fSoft'.padStart(8) + 'fSpec'.padStart(8) +
                'mm'.padStart(5) + 'col'.padStart(10) + 'r'.padStart(6));
    for (const id of ids) {
      const r = out.rows[id];
      console.log('   ' + id.padEnd(9) + r.sh.padEnd(10) + String(r.ink).padStart(7) +
                  String(r.soft).padStart(8) + String(r.hard).padStart(8) +
                  String(r.spec).padStart(7) +
                  r.fSoft.toFixed(3).padStart(8) + r.fSpec.toFixed(4).padStart(8) +
                  /* 855 — «문턱을 넘었나» 옆에 «봉우리가 얼마인가 · 무엇을 그렸나» 를 같이 찍는다.
                     sp2 만 보면 흔들릴 때 «자가 못 봤다» 와 «그림이 안 나왔다» 를 못 가른다. */
                  String(r.mm).padStart(5) + ('' + r.col).padStart(10) +
                  (r.r === null ? '–' : String(r.r)).padStart(6));
    }
    console.log('   (mm = 잉크 안 가장 흰 화소 min(r,g,b) · col/r = 그 종의 첫 발 규격 — 855)');
    console.log('');

    const noSoft = ids.filter(i => out.rows[i].fSoft < 0.12);
    const noSpec = ids.filter(i => out.rows[i].fSpec < 0.010);
    const fs2 = ids.map(i => out.rows[i].fSoft);
    const bandSoft = +(Math.max.apply(null, fs2) / Math.max(1e-6, Math.min.apply(null, fs2))).toFixed(2);

    ok(out.n === 17, '[1] 투사체를 내는 종 17종을 픽셀로 쟀다 (실측 ' + out.n + ')');
    /* ⚠ 아래 셋은 «재현» 이다 — **빨간 것이 정상**이고, 그 빨강이 792 가 고칠 자리다.
       수리 뒤에는 같은 항이 초록으로 뒤집힌다(되돌림 시험은 verify792 [R] 이 따로 맡는다). */
    ok(noSoft.length === 0, '[2] 후광(soft ≥ 12%) 이 빠진 종 0 — 실측 ' +
       noSoft.length + '종' + (noSoft.length ? ' (' + noSoft.join(' · ') + ')' : ''));
    ok(noSpec.length === 0, '[3] 하이라이트(spec ≥ 1%) 가 빠진 종 0 — 실측 ' +
       noSpec.length + '종' + (noSpec.length ? ' (' + noSpec.join(' · ') + ')' : ''));
    ok(bandSoft <= 3.0, '[4] 후광 비율이 한 밴드 — 최대÷최소 ' + bandSoft + ' ≤ 3.0');
    ok(errs.length === 0, '[5] 콘솔/페이지 오류 0건 (실측 ' + errs.length + ')');
  }

  console.log('\nPROBE792 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
