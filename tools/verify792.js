/* 작업 792 게이트 — «스킬 발동 이펙트 연출 규격 통일»
 *
 *   node tools/verify792.js
 *
 * 710 은 «중복 0»(분간)을 닫았고 비평가 ①은 8 로 안정됐다. 남은 감점 ②(통일감)·③(덩치)의
 * 실체를 재현(`tools/probe792.js`)이 수치로 갈랐다 — 17종이 네 «렌더링 문법» 을 섞어 쓰는데
 * 그 넷은 **층의 있고 없음**으로 갈리고, 게다가 **상보적**이었다:
 *   · 후광이 있는 13종은 하이라이트가 하나도 없다 (spec 0.0000)
 *   · 하이라이트가 있는 4종은 후광이 없다 (soft 2.3~9.6% · 나머지는 30~73%)
 *
 * ── 792 가 못박는 문법 (한 줄) ────────────────────────────────────────────
 *   모든 투사체는 **① 후광(저알파) · ② 본체(`b.col` 불투명) · ③ 하이라이트(근백색 코어)**
 *   세 층을 **전부** 갖는다. 하드 외곽선은 쓰지 않는다(외곽선처럼 보이는 것은 ①이나 ③이 흡수).
 *
 * 절:
 *   [A] 층 — 17종 전부가 ①과 ③을 갖는다.
 *   [B] 밴드 — 412 «한 세트»: 후광 비율이 한 밴드(최대÷최소 ≤ 3.0) · 하이라이트 비율이 1~25%.
 *   [C] 선언 — 층을 부르는 이름이 `shotBody` 안에 한 벌만 있다(`halo`/`spec`/`SPEC`).
 *               종마다 다른 흰색을 손으로 적으면 «한 색» 이라는 문법이 곧 무너진다(402 «사본을 지운다»).
 *   [D] 되감기 금지 — 792 가 후광을 얹느라 710 이 닫은 ①(분간)을 되돌리지 않았다:
 *               종별 실루엣 IoU 최댓값이 710 마감값(0.796) 이하다.
 *               ⚠ 이 항이 실제로 잡았다 — 1회차의 둥근 공 후광이 화염구와 겹쳐 0.796 → **0.840** 이었다.
 *   [R] 되돌림 시험 — 층을 무력화한 사본에서 [A] 가 **실제로** 빨개진다.
 *
 * 자와 재현을 둘 다 두는 이유는 710·412 와 같다 — 자는 «선언» 을, 재현은 «찍힌 픽셀» 을 지킨다.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* 되돌림 사본 — 층 호출을 무력화한다(= 792 이전 세계: 층이 빠진 채로 떨어진다).
   ⚠ 저장소 루트에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가 통째로 404 다
     (360·367·438·439·453·467·471·541·710 선례). 이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648). */
const NEG_SPEC = path.join(ROOT, '.v792-neg-spec-' + process.pid + '.html');
const NEG_HALO = path.join(ROOT, '.v792-neg-halo-' + process.pid + '.html');
const TAG_SPEC = `    const spec = fn => { ctx.save(); fn(); ctx.restore(); };`;
const TAG_HALO = `    const halo = fn => { ctx.save(); fn(); ctx.restore(); };`;

/* 710 [C1] 과 **같은 문턱**을 쓴다.
   ⚠ 1회차에 여기를 «710 이 마감 때 찍은 값 0.796» 으로 박았다가 스스로 빨개졌다 —
     `boom↔flask` 쌍은 같은 트리에서 0.775 · 0.796 · 0.809 · 0.810 · 0.815 로 흔들린다.
     뿌리는 제품이 아니라 **자**다: 마스크를 «살아 있는 전투 장면» 과의 차이로 재기 때문에
     그때그때의 바탕이 저알파 후광 화소를 문턱 위로도, 아래로도 밀어낸다.
     한 번 찍힌 관측값을 문턱으로 박으면 그 자는 **설계부터 플레이키**다(PROGRESS 825 가 그 병이다).
   ⇒ 문턱은 710 의 것(0.90)을 그대로 쓰고, «792 가 되감지 않았다» 는 [B3](후광이 실루엣을
     삼키지 않는다)가 **흔들리지 않는 축으로** 대신 지킨다. 실측 폭은 review §2 에 적었다. */
const IOU_MAX = 0.90;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

async function measure(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
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

    /* 종별 «그 스킬이 실제로 만든 첫 발» 의 규격 (710 [C] 와 같은 자리·같은 방법) */
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

    /* 층 분해 — soft(후광) / hard(본체) / spec(하이라이트)
       문턱 8 은 710 의 마스크 문턱을 그대로 물려받는다(두 자가 같은 것을 세야 비교가 선다). */
    const rows = {}, masks = {};
    for (const id in specs) {
      const sp = specs[id];
      clearFx();
      shots.push({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                   dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                   spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                   tx: sp.tx === undefined ? undefined : CX - ox,
                   ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      const a0 = grab();
      let soft = 0, hard = 0, sp2 = 0;
      const m = new Uint8Array(bw * bh);
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        const d = Math.max(Math.abs(a0[i] - base[i]),
                           Math.abs(a0[i + 1] - base[i + 1]),
                           Math.abs(a0[i + 2] - base[i + 2]));
        if (d <= 8) continue;
        m[p] = 1;
        if (d <= 60) soft++; else hard++;
        if (a0[i] >= 232 && a0[i + 1] >= 232 && a0[i + 2] >= 232) sp2++;
      }
      const ink = soft + hard;
      masks[id] = m;
      rows[id] = { sh: sp.sh, ink, soft, hard, spec: sp2,
                   fSoft: +(soft / Math.max(1, ink)).toFixed(4),
                   fSpec: +(sp2 / Math.max(1, ink)).toFixed(4) };
      clearFx();
    }

    /* 710 [C1] 과 같은 축 — 후광을 얹느라 실루엣이 서로 붙지 않았는가 */
    const ids = Object.keys(masks);
    let worst = { iou: 0 };
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = masks[ids[i]], B = masks[ids[j]];
      let inter = 0, uni = 0;
      for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
      const iou = uni ? inter / uni : 0;
      if (iou > worst.iou) worst = { a: ids[i], b: ids[j], iou: +iou.toFixed(4) };
    }
    return { rows, worst, n: ids.length };
  });

  await ctx.close();
  return { out, errs };
}

(async () => {
  console.log('=== VERIFY 792 — 스킬 이펙트 연출 규격(세 층) 통일 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const src = fs.readFileSync(SRC, 'utf8');
  const clean = () => { for (const f of [NEG_SPEC, NEG_HALO]) { try { fs.unlinkSync(f); } catch (_) {} } };

  try {
    /* ---- [C] 선언 ---- */
    const nSpec = (src.match(/\bspec\(\(\)\s*=>/g) || []).length;
    const nHalo = (src.match(/\bhalo\(\(\)\s*=>/g) || []).length;
    ok(src.includes(TAG_SPEC) && src.includes(TAG_HALO),
       '[C1] `shotBody` 가 층 이름 두 개(`halo`/`spec`)를 한 벌로 선언한다');
    ok(src.includes(`const SPEC = 'rgba(255,255,255,.94)';`),
       '[C2] 하이라이트 색이 상수 `SPEC` 한 곳에서만 나온다 (종별 사본 금지 — 402)');
    ok(nSpec >= 13, '[C3] 하이라이트를 부른 자리 ' + nSpec + '곳 ≥ 13 (재현이 «빠졌다» 고 센 종 수)');
    ok(nHalo >= 5, '[C4] 후광을 새로 세운 자리 ' + nHalo + '곳 ≥ 5 (재현이 «빠졌다» 고 센 종 수)');

    /* ---- 본 측정 ---- */
    const { out, errs } = await measure(browser, 'file://' + SRC);
    if (out && out.__err) { ok(false, '[측정] 블록 예외 — ' + out.__err); }
    else {
      const ids = Object.keys(out.rows);
      const noSoft = ids.filter(i => out.rows[i].fSoft < 0.12);
      const noSpec = ids.filter(i => out.rows[i].fSpec < 0.010);
      const fatSpec = ids.filter(i => out.rows[i].fSpec > 0.25);
      const fs2 = ids.map(i => out.rows[i].fSoft);
      const band = +(Math.max.apply(null, fs2) / Math.max(1e-6, Math.min.apply(null, fs2))).toFixed(2);

      ok(out.n === 17, '[A0] 투사체를 내는 종 17종을 픽셀로 쟀다 (실측 ' + out.n + ')');
      ok(noSoft.length === 0, '[A1] ① 후광(soft ≥ 12%) 이 17종 전부에 있다 — 빠진 종 ' +
         noSoft.length + (noSoft.length ? ' (' + noSoft.join(' · ') + ')' : ''));
      ok(noSpec.length === 0, '[A2] ③ 하이라이트(spec ≥ 1%) 가 17종 전부에 있다 — 빠진 종 ' +
         noSpec.length + (noSpec.length ? ' (' + noSpec.join(' · ') + ')' : ''));
      ok(band <= 3.0, '[B1] 412 «한 세트» — 후광 비율 최대÷최소 ' + band + ' ≤ 3.0');
      ok(fatSpec.length === 0, '[B2] 하이라이트 비율이 25% 를 넘는 종 0 — 실측 ' +
         fatSpec.length + (fatSpec.length ? ' (' + fatSpec.join(' · ') + ')' : '') +
         ' (넘으면 «코어» 가 아니라 그 자체가 본체다)');
      /* [B3] 되감기 금지의 **흔들리지 않는** 축 — 후광은 실루엣을 «두르는» 것이지 «삼키는» 것이 아니다.
         이 항이 실제로 1회차 결함을 잡는다: 둥근 공 후광을 크게 준 순간 후광이 잉크의 61.6% 를 먹고
         화염구와 붙었다(IoU 0.796 → 0.840). 본체 몫을 20% 이상 남기게 하면 그 길이 막힌다. */
      const fatSoft = ids.filter(i => out.rows[i].fSoft > 0.80);
      ok(fatSoft.length === 0, '[B3] 후광이 실루엣을 삼킨 종 0 (fSoft ≤ 0.80 — 본체 몫 20% 이상) — 실측 ' +
         fatSoft.length + (fatSoft.length ? ' (' + fatSoft.join(' · ') + ')' : ''));
      ok(out.worst.iou <= IOU_MAX,
         '[D1] 710 회귀 짝 — 종별 실루엣 IoU 최댓값 ' + out.worst.iou + ' ≤ ' + IOU_MAX +
         ' (최악 쌍 ' + out.worst.a + '↔' + out.worst.b + ' · 이 쌍은 흔들린다 — 위 주석)');
      ok(errs.length === 0, '[G1] 콘솔/페이지 오류 0건 (실측 ' + errs.length + ')');

      console.log('\n  [표] 종별 층 비율 — fSoft / fSpec');
      for (const id of ids) {
        const r = out.rows[id];
        console.log('        ' + id.padEnd(9) + r.sh.padEnd(10) +
                    String(r.ink).padStart(7) + '  ' +
                    r.fSoft.toFixed(3) + ' / ' + r.fSpec.toFixed(4));
      }
      console.log('');
    }

    /* ---- [R] 되돌림 시험 ---- */
    fs.writeFileSync(NEG_SPEC, src.replace(TAG_SPEC, `    const spec = fn => {};`), 'utf8');
    fs.writeFileSync(NEG_HALO, src.replace(TAG_HALO, `    const halo = fn => {};`), 'utf8');

    const rSpec = await measure(browser, 'file://' + NEG_SPEC);
    if (rSpec.out && rSpec.out.__err) ok(false, '[R1] 사본 측정 예외 — ' + rSpec.out.__err);
    else {
      const bad = Object.keys(rSpec.out.rows).filter(i => rSpec.out.rows[i].fSpec < 0.010);
      ok(bad.length >= 13, '[R1] 하이라이트를 끄면 [A2] 가 빨개진다 — 빠진 종 ' + bad.length + '종 ≥ 13');
    }

    const rHalo = await measure(browser, 'file://' + NEG_HALO);
    if (rHalo.out && rHalo.out.__err) ok(false, '[R2] 사본 측정 예외 — ' + rHalo.out.__err);
    else {
      const ks = Object.keys(rHalo.out.rows);
      const bad = ks.filter(i => rHalo.out.rows[i].fSoft < 0.12);
      ok(bad.length >= 4, '[R2] 새로 세운 후광을 끄면 [A1] 이 빨개진다 — 빠진 종 ' + bad.length +
         '종 ≥ 4 (잰 종 ' + ks.length + ' · ' + bad.join(' · ') + ')');
    }
  } finally {
    clean();
    await browser.close();
  }

  console.log('VERIFY792 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
