/* 작업 710 재현 프로브 — «스킬 이펙트 중복 — 같은 연출을 쓰는 스킬이 있으면 서로 갈라지게»
 *
 *   node tools/probe710.js
 *
 * 주인 원문: «스킬 이펙트 중복 된거 있으면 중복 안되게 하기».
 *
 * 등재문 가설(ⓐ): 27종의 발동 이펙트에 **같은 연출을 재사용하는 쌍**이 있다.
 * 정적 실측(이 프로브를 쓰기 전) — `shotBody()`(index.html) 의 분기가 다섯 개뿐이다:
 *     slash · (shuri|boomer) · ice · (boom|meteor|flask) · else(공용 구슬)
 *   그리고 `SKILLS` 의 `k`(그리기 종류)를 세어 보면 slash 4종 · ice 4종 · shuri 2종 ·
 *   rico 2종 이 같은 값을 쓴다. 즉 **그림이 같고 색만 다른** 자리가 여럿이다.
 *
 * ⚑ 412 교훈 — «색만 가르면 회색조에서 못 갈린다». 그래서 이 자는 **색을 안 본다**:
 *   재는 것은 «배경과 달라진 화소» 의 **실루엣 마스크**이고, 색을 바꿔도 마스크는 안 바뀐다.
 *   두 스킬의 마스크가 겹치면(IoU ≥ 0.90) 그 둘은 **회색조에서 같은 그림**이다.
 *
 * 재는 법 — «찍힌 픽셀 diff»(350·752 선례): 같은 프레임을 «투사체 있음 / 없음» 으로 두 번
 *   draw() 해 달라진 화소만 «그 스킬의 잉크» 로 센다(바닥·플레이어·HUD 가 전부 상쇄된다).
 *   자리·각도·스핀을 **모든 스킬에 대해 같은 값으로 고정**하므로 마스크가 서로 정렬된다.
 *
 * 절:
 *   [1] 연출 가족표 — 27종을 실제로 시전해 어떤 렌더러 배열에 무엇이 얹히는지 찍는다.
 *   [2] 실루엣 중복 — 투사체를 내는 종끼리 마스크 IoU 를 전수(쌍) 비교한다.
 *   [3] 선언 중복 — `shotBody` 가 실제로 타는 분기(그리기 종류)가 겹치는 쌍을 센다.
 *   [4] 겹침 스폰(ⓑ) — 한 번 시전에 «같은 자리·같은 종류» 가 2개 이상 겹쳐 나는지.
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const IOU_DUP = 0.90;          /* 이 이상이면 «같은 그림» 으로 본다 */
const SKILL_N = 27;            /* 현재 `SKILLS.length` — 종수가 늘면 [0] 이 먼저 빨개진다(조용한 어긋남 방지) */

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

async function measure(url) {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev((IOU_DUP) => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

    /* ⚠ 이 배열들은 최상위 `const` 라 **window 의 속성이 아니다**(스크립트 스코프).
       `window[name]` 으로 잡으면 undefined 가 돌아온다 — 이름으로 직접 묶는다. */
    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const FX = Object.keys(FXMAP);
    const arr = n => FXMAP[n];
    const clearFx = () => { for (const n of FX) arr(n).length = 0; };

    /* 표적을 «정확히 한 기» 만 세운다 — 시전이 성공하고, 자리가 실행마다 안 흔들리게.
       ⚠ 적 객체는 손으로 못 짓는다 — `T`(타입 서술자)·아틀라스 필드가 없으면 draw() 가 즉사한다
         (`Cannot read properties of undefined (reading 'yo')`). 게임이 만든 개체를 **빌려서** 세운다. */
    let foe = null;
    const putFoe = () => {
      if (!foe) {
        let guard = 0;
        while (enemies.length === 0 && guard++ < 600) step(1 / 60);
        foe = enemies[0];
      }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = 300 - ox; foe.y = 300 - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };

    /* 캔버스 한 상자만 잘라 «달라진 화소» 를 이진 마스크로 만든다.
       ⚠ 자리는 **용사 옆 70게임px** 로 잡는다 — 임의의 화면 좌표에 두면 `edgeFade()` 가 알파를
         0 으로 눌러 잉크가 통째로 0 이 되고(1회차 실측), 몸 겹침 감쇠(`near < 62`)도 피해야 한다. */
    const CX = Math.round(player.x + ox + 70), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    /* 지속형은 용사 «둘레» 를 도는 연출이라 상자를 넓게 잡는다(반폭 R 로는 잘린다) */
    const FR = 150;
    const fx0 = Math.round((CX - 70 - FR) * SC), fy0 = Math.round((CY - FR) * SC);
    const fw = Math.round(2 * FR * SC), fh = Math.round(2 * FR * SC);
    const grabFull = () => { draw(); return ctx.getImageData(fx0, fy0, fw, fh).data; };
    const maskFull = (before, after) => {
      const m = new Uint8Array(fw * fh);
      let n = 0;
      for (let i = 0, p = 0; i < after.length; i += 4, p++) {
        if (Math.abs(after[i] - before[i]) > 8 || Math.abs(after[i + 1] - before[i + 1]) > 8 ||
            Math.abs(after[i + 2] - before[i + 2]) > 8) { m[p] = 1; n++; }
      }
      return { m, n };
    };
    const maskOf = (before, after) => {
      const m = new Uint8Array(bw * bh);
      let n = 0;
      for (let i = 0, p = 0; i < after.length; i += 4, p++) {
        if (Math.abs(after[i] - before[i]) > 8 || Math.abs(after[i + 1] - before[i + 1]) > 8 ||
            Math.abs(after[i + 2] - before[i + 2]) > 8) { m[p] = 1; n++; }
      }
      return { m, n };
    };

    /* ---- [1] 연출 가족표 — 실제 시전이 어떤 배열을 채우는지 ---- */
    const fam = [], specs = {};
    for (const s of SKILLS) {
      putFoe(); clearFx();
      /* ⚠ `castSkillRaw` 가 아니라 `castSkill` 을 부른다 — 실루엣 키를 찍는 곳이 그 바깥이라
         raw 만 부르면 «태그가 없는 세계» 를 재게 된다(수리 후에도 수리 전 값이 나온다). */
      let ok0 = false;
      try { ok0 = castSkill(s); } catch (e) { ok0 = false; }
      const rec = { id: s.id, n: s.n, g: s.g, cast: !!ok0 };
      for (const nm of FX) if (arr(nm).length) rec[nm] = arr(nm).length;
      if (shots.length) {
        const b = shots[0];
        rec.k = b.k; rec.sh = b.sh;
        specs[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                        mf: b.mf, tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      if (bolts.length) rec.bk = bolts[0].bk;
      /* 광역 2종(심판의 빛·창세의 폭발)은 같은 폭발 스프라이트를 쓰므로 배율만으로는 못 가른다 —
         710 이 얹은 «형상 층»(빛살 호 ↔ 동심 충격파)을 링의 모양으로 관측한다.
         ⚠ 시전 플래시 링(`cast`)은 27종 전부에 붙으므로 서명에서 뺀다. */
      {
        const rg = rings.filter(q => !q.cast);
        rec.rg = rg.length ? (rg.filter(q => q.a0 !== undefined).length + 'a' +
                              rg.filter(q => q.fl).length + 'f') : '-';
      }
      if (zones.length) rec.zk = zones[0].k;
      if (booms.length) rec.bscale = +(booms[0].scale || 0).toFixed(2);
      /* [4] 겹침 스폰 — «같은 자리에서 같은 방향으로» 두 장이 겹쳐 나는 것만 센다.
         ⚑ 자리만 보면 안 된다(1회차 실측) — 다발형(shuri 8발·gale 12발)은 총구 한 점에서 나되
           **방향이 전부 다르므로** 겹침이 아니다. 겹침은 «분간할 수 없는 두 장» 을 말한다. */
      let dup = 0;
      for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) {
        const a = shots[i], b = shots[j];
        if (a.k !== b.k) continue;
        if (Math.abs(a.x - b.x) >= 1 || Math.abs(a.y - b.y) >= 1) continue;
        if (Math.abs(a.vx - b.vx) >= 1 || Math.abs(a.vy - b.vy) >= 1) continue;
        dup++;
      }
      for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i], b = zones[j];
        if (a.k === b.k && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) dup++;
      }
      rec.overlap = dup;
      fam.push(rec);
    }

    /* ---- [2] 실루엣 마스크 — 투사체를 내는 종만 ---- */
    putFoe(); clearFx();
    const base = grab();
    const masks = {};
    for (const id in specs) {
      const sp = specs[id];
      clearFx();
      const b = { k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                  dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                  spin: sp.spin === undefined ? undefined : 0.7,
                  r: sp.r, tx: sp.tx === undefined ? undefined : CX - ox,
                  ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 };
      shots.push(b);
      const after = grab();
      const { m, n } = maskOf(base, after);
      masks[id] = { m: Array.from(m), n };
      clearFx();
    }

    /* 쌍별 IoU */
    const ids = Object.keys(masks);
    const pairs = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = masks[ids[i]].m, B = masks[ids[j]].m;
      let inter = 0, uni = 0;
      for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
      const iou = uni ? inter / uni : 0;
      if (iou >= 0.55) pairs.push({ a: ids[i], b: ids[j], iou: +iou.toFixed(4) });
    }
    pairs.sort((x, y) => y.iou - x.iou);

    /* ---- [2-b] 지속형 2종(회전검·신성 오라) — 시전 경로가 없으므로(cd 0) «장착하고 한 프레임»
           으로 잰다. 셋 다 같은 방법(찍힌 픽셀 diff)이라 판정이 한 자에서 나온다. ---- */
    const holdMask = (id) => {
      putFoe(); clearFx();
      S.eqSkill = []; S.own = S.own || {};
      const b0 = grabFull();
      /* ⚠ `S.own[id]` 는 «수» 가 아니라 `{n:재료, l:레벨}` 이다 — 수로 넣으면 `oLv()` 가
         undefined 를 돌려주고 오라 반경이 NaN 이 되어 그리기가 즉사한다(1회차 실측). */
      S.eqSkill = [id]; S.own[id] = { n: 1, l: 1 };
      for (let i = 0; i < 8; i++) step(1 / 60);
      const a0 = grabFull();
      const r = maskFull(b0, a0);
      S.eqSkill = []; clearFx();
      return r;
    };
    const hold = {};
    for (const id of ['orbit', 'aura']) hold[id] = holdMask(id);
    let holdIoU = 0;
    {
      const A = hold.orbit.m, B = hold.aura.m;
      let inter = 0, uni = 0;
      for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
      holdIoU = uni ? +(inter / uni).toFixed(4) : 0;
    }

    const ink = {}; for (const id of ids) ink[id] = masks[id].n;
    return { fam, ink, pairs, dupPairs: pairs.filter(p => p.iou >= IOU_DUP), IOU_DUP,
             hold: { orbit: hold.orbit.n, aura: hold.aura.n, iou: holdIoU } };
  }, IOU_DUP);

  await browser.close();
  return { out, errs };
}

(async () => {
  console.log('=== PROBE 710 — 스킬 발동 이펙트 중복 ===\n');
  const { out, errs } = await measure('file://' + SRC);
  if (!out || out.__err) { console.log('측정 실패: ' + (out && out.__err)); process.exit(1); }

  console.log('[1] 연출 가족표 (27종 · 시전이 실제로 채우는 렌더러)');
  /* 가족 서명 = «실제로 채워진 렌더러 + 그 안에 찍힌 실루엣 키». 키가 없으면 옛 `k` 로 떨어지므로
     수리 전에는 slash 4종·ice 4종이 그대로 한 서명이 된다(그것이 등재문의 결손이다).
     ⚠ 지속형 2종은 시전 경로가 없어 여기서는 둘 다 «빈 서명» 이다 — 그 둘의 판정은 [2-b] 가 한다. */
  const famKey = r => [r.sh || r.k || '-', r.zk || '-', r.bscale || '-',
                       r.bk || (r.bolts ? 'bolt' : '-'), r.drones ? 'drone' : '-',
                       r.rg || '-'].join('/');
  /* ⚠ 지속형 2종(회전검·신성 오라)은 cd 0 이라 **시전 경로 자체가 없다** — 시전으로 재면 둘 다
     «빈 서명» 이 되는데 그것은 중복이 아니라 **관측이 없는 것**이다(둘의 판정은 [2-b] 가 픽셀로 한다).
     여기서 빼지 않으면 자가 영원히 못 닫히는 거짓 빨강을 하나 달고 산다. */
  const HOLD = ['orbit', 'aura'];
  const byFam = {};
  for (const r of out.fam) {
    const key = famKey(r);
    (byFam[key] = byFam[key] || []).push(r.id);
    console.log('   ' + r.id.padEnd(7) + ' g' + r.g + ' cast=' + (r.cast ? 'Y' : 'n') +
      '  sh=' + String(r.sh || r.bk || '-').padEnd(9) +
      ' k=' + String(r.k || '-').padEnd(7) +
      ' zone=' + String(r.zk || '-').padEnd(7) +
      ' boom=' + String(r.bscale || '-').padEnd(5) +
      ' ring=' + String(r.rg || '-').padEnd(5) +
      ' bolts=' + (r.bolts || 0) + ' drones=' + (r.drones || 0) +
      ' 겹침=' + r.overlap);
  }
  console.log('\n[1-b] 같은 가족 서명을 쓰는 묶음 (2종 이상 = 중복)');
  const famDup = Object.entries(byFam)
    .map(([k, v]) => [k, v.filter(id => HOLD.indexOf(id) < 0)])
    .filter(([, v]) => v.length > 1);
  for (const [k, v] of famDup) console.log('   ' + k.padEnd(28) + ' ← ' + v.join(', '));
  console.log('   중복 묶음 ' + famDup.length + '개 · 그 안의 종 ' +
    famDup.reduce((a, [, v]) => a + v.length, 0) + '종');

  console.log('\n[2] 실루엣 마스크 IoU (색을 안 본다 — 회색조 동일 판정)');
  for (const p of out.pairs) {
    console.log('   ' + (p.iou >= out.IOU_DUP ? '★' : ' ') + ' ' +
      p.a.padEnd(7) + ' ↔ ' + p.b.padEnd(7) + '  IoU ' + p.iou.toFixed(3));
  }
  console.log('   ★ = IoU ≥ ' + out.IOU_DUP + ' (같은 그림) — ' + out.dupPairs.length + '쌍');

  console.log('\n[3] 잉크 화소 수(참고)');
  console.log('   ' + Object.entries(out.ink).map(([k, v]) => k + ':' + v).join(' · '));

  console.log('\n[2-b] 지속형 2종(시전 경로 없음) — 장착 상태의 그려진 잉크');
  console.log('   회전검 ' + out.hold.orbit + 'px · 신성 오라 ' + out.hold.aura +
    'px · 서로의 마스크 IoU ' + out.hold.iou.toFixed(3));

  const castOk = out.fam.filter(r => r.cast).length;
  const overlaps = out.fam.filter(r => r.overlap > 0);

  console.log('');
  ok(out.fam.length === SKILL_N, '[0] 스킬 ' + out.fam.length + '종을 전수로 잰다');
  ok(castOk >= 25, '[1] 표적 1기 앞에서 시전 성공 ' + castOk + '/' + out.fam.length + '종');
  ok(famDup.length === 0,
    '[1-b] 가족 서명 중복 묶음 0개 (실측 ' + famDup.length + '개' +
    (famDup.length ? ' — ' + famDup.map(([, v]) => v.join('=')).join(' / ') : '') + ')');
  ok(out.dupPairs.length === 0,
    '[2] 실루엣 IoU ≥ ' + out.IOU_DUP + ' 인 쌍 0 (실측 ' + out.dupPairs.length + '쌍' +
    (out.dupPairs.length ? ' — ' + out.dupPairs.slice(0, 8).map(p => p.a + '↔' + p.b).join(' ') : '') + ')');
  ok(overlaps.length === 0,
    '[4] 한 시전에 같은 자리 겹침 스폰 0 (실측 ' + overlaps.length + '종' +
    (overlaps.length ? ' — ' + overlaps.map(r => r.id + ':' + r.overlap).join(' ') : '') + ')');
  ok(out.hold.orbit > 200 && out.hold.aura > 200 && out.hold.iou < IOU_DUP,
    '[2-b] 지속형 2종이 서로 다른 그림이다 (회전검 ' + out.hold.orbit + 'px · 오라 ' +
    out.hold.aura + 'px · IoU ' + out.hold.iou.toFixed(3) + ' < ' + IOU_DUP + ')');
  ok(errs.length === 0, '[5] 콘솔/페이지 오류 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0].slice(0, 120) : ''));

  console.log('\nPROBE710 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();

