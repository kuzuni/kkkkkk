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
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

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
    const CX = Math.round(player.x + ox + 70), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const base = grab();

    /* 층 분해 — soft / hard / spec */
    const layersOf = (a0) => {
      let soft = 0, hard = 0, spec = 0;
      for (let i = 0; i < a0.length; i += 4) {
        const d = Math.max(Math.abs(a0[i] - base[i]),
                           Math.abs(a0[i + 1] - base[i + 1]),
                           Math.abs(a0[i + 2] - base[i + 2]));
        if (d <= 8) continue;
        if (d <= 60) soft++; else hard++;
        if (a0[i] >= 232 && a0[i + 1] >= 232 && a0[i + 2] >= 232) spec++;
      }
      return { soft, hard, spec, ink: soft + hard };
    };

    const rows = {};
    for (const id in specs) {
      const sp = specs[id];
      clearFx();
      shots.push({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                   dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                   spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                   tx: sp.tx === undefined ? undefined : CX - ox,
                   ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      const L = layersOf(grab());
      rows[id] = { sh: sp.sh, ink: L.ink, soft: L.soft, hard: L.hard, spec: L.spec,
                   fSoft: +(L.soft / Math.max(1, L.ink)).toFixed(4),
                   fSpec: +(L.spec / Math.max(1, L.ink)).toFixed(4) };
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
                'fSoft'.padStart(8) + 'fSpec'.padStart(8));
    for (const id of ids) {
      const r = out.rows[id];
      console.log('   ' + id.padEnd(9) + r.sh.padEnd(10) + String(r.ink).padStart(7) +
                  String(r.soft).padStart(8) + String(r.hard).padStart(8) +
                  String(r.spec).padStart(7) +
                  r.fSoft.toFixed(3).padStart(8) + r.fSpec.toFixed(4).padStart(8));
    }
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
