/* 작업 360 재현 프로브 — «왼쪽 사이드 «출석»·«축복» 만 다른 버튼들과 크기·간격이 달라 보인다»
 *
 *   node tools/probe360.js
 *
 * 주인 원문: «왼쪽에 출석보상만 왼쪽 버튼들이랑 간격이랑 크기가 달라보이더라. 다른거랑 같게 해줘.
 *             축복버튼도 그렇네»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify360.js`) **무엇이 얼마나 다른가**를
 * 숫자로 박는 자리다. 338·341·350 규칙대로 등재문의 처방을 따르기 **전에** 재현한다.
 *
 * 재는 것은 셋이다 — 주인이 말한 낱말이 «간격» 과 «크기» 둘뿐이기 때문이다(338-② «낱말이 사양이다»).
 *   ⓐ 간격  — 행 pitch(셀 top 차분) 6행
 *   ⓑ 크기  — 아트 «잉크» bbox. **차분법**으로 뜬다(capA2 3회차 교훈: 임계값 마스크는
 *              드롭섀도를 물어 수 px 틀린다 → «그 행의 .si 만 숨긴 캡처» 와의 차분이 정확하다)
 *   ⓒ 구조  — 라벨 유무 · `.solo` 여부 · 배지(`.bdg`) 자리
 *
 * ⚠ 함정 둘:
 *   ① 전투 캔버스·58 파티클·60 쥬시가 살아 있으면 차분이 화면 전체로 번진다 → capA2 처럼 얼린다.
 *   ② `--ih` 등 행 그리드 변수는 `layoutSide()` 가 **캔버스 높이에 비례**시켜 덮어쓴다.
 *      1080×2280 에서 --ih 가 82(=SIDE.ART) 인지 먼저 확인하고 재야 값이 측정표와 같은 자다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = 'file://' + path.resolve(__dirname, '../index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const blk = async (name, fn) => {                    /* 319 처방 — 즉사 대신 그 블록만 빨갛게 */
  try { await fn(); } catch (e) { fail++; console.log('  FAIL ' + name + ' — 예외: ' + e.message); }
};

/* 레퍼런스(A2 측정표 §1-1·§1-2 · §7) — 이 값이 «지금 무엇을 따르고 있는가» 의 정본이다.
   360 은 주인 지시로 여기서 **의도적으로 이탈**한다. 재현 단계에서는 이탈 전 상태를 그대로 찍는다. */
const REF_TOP = { attend: 260, roul: 421, quest: 556, promo: 686, coll: 820, bless: 958 };
const SB = 84;                                       /* ROUTINE [2] — 프레임 y = ref y − 84 */

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(SRC);
  await p.waitForTimeout(1200);

  /* capA2 와 같은 상태 — 레퍼런스 02 화면(패널 닫힘 · STAGE 37) */
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.stage = 37; S.best = 37; S.gold = 1234567; S.dia = 8900;
    S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0;
    S.totalKills = 500;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  await p.waitForTimeout(700);
  /* 차분을 쓰려면 «사이드 스택 말고는 동일» 해야 한다 — rAF·interval·CSS 애니를 전부 얼린다 */
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i);
  });
  await p.addStyleTag({ content:
    '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await p.waitForTimeout(250);

  console.log('\n=== 360 재현 — 좌측 사이드 6행 «간격·크기» ===\n');

  /* ── 0. 행 그리드 변수가 측정 규격 그대로인가(함정 ②) ───────────────────────── */
  const vars = await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('app'));
    const g = n => cs.getPropertyValue(n).trim();
    return { ih: g('--ih'), igap: g('--igap'), itop: g('--itop'),
             isolo: g('--isolo'), isgap: g('--isgap'), ilh: g('--ilh') };
  });
  console.log('[0] 행 그리드 변수 (1080×2280) — ' + JSON.stringify(vars));
  ok(vars.ih === '82.00px', '--ih = 82.00px (SIDE.ART — 이 해상도에서는 축소가 안 걸린다)');
  ok(vars.isolo === '101.00px', '--isolo = 101.00px (SIDE.SOLO — 출석만 쓰는 단독 규격)');
  ok(vars.isgap === '60.00px', '--isgap = 60.00px (SIDE.SGAP — 출석 아래 gap)');

  /* ── 1. DOM 실측 — 셀/아트/라벨 박스 ────────────────────────────────────────── */
  const rows = await p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const g = e => { const b = e.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(2), y: +(b.y - app.y).toFixed(2),
               w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
    return [...document.querySelectorAll('#sideL .ibtn')].map(e => {
      const si = e.querySelector('.si'), sl = e.querySelector('.sl'), bd = e.querySelector('.bdg');
      const cs = si ? getComputedStyle(si) : null;
      return { pop: e.dataset.pop, solo: e.classList.contains('solo'),
               label: sl ? sl.textContent : null,
               cell: g(e), si: g(si), sl: sl ? g(sl) : null, bdg: bd ? g(bd) : null,
               glyph: si ? si.textContent : null,
               fs: cs ? +parseFloat(cs.fontSize).toFixed(2) : null,
               sf: e.style.getPropertyValue('--sf') || '(기본 .96)',
               sx: e.style.getPropertyValue('--sx') || '(기본 1.15)' };
    });
  });

  console.log('\n[1] 행 구조 · 셀 박스');
  rows.forEach(r => console.log(
    `    ${r.pop.padEnd(7)} solo=${String(r.solo).padEnd(5)} 라벨=${String(r.label).padEnd(5)}` +
    ` 셀 y=${String(r.cell.y).padStart(7)} h=${String(r.cell.h).padStart(6)}` +
    ` | 아트 h=${String(r.si.h).padStart(6)} fs=${String(r.fs).padStart(6)}` +
    ` sf=${r.sf} sx=${r.sx}`));

  /* ── 2. 간격 — 행 pitch(셀 top 차분) ────────────────────────────────────────── */
  const pitch = rows.slice(1).map((r, i) => +(r.cell.y - rows[i].cell.y).toFixed(2));
  const REF_PITCH = [161, 135, 131, 133, 138];        /* A2 측정표 §1-2 (verify71 이 쓰는 정본) */
  console.log('\n[2] 행 pitch (셀 top 차분)');
  pitch.forEach((v, i) => console.log(
    `    ${rows[i].pop} → ${rows[i + 1].pop}: ${String(v).padStart(7)}   (ref ${REF_PITCH[i]})`));
  const labPitch = pitch.slice(1);
  const spread = +(Math.max(...labPitch) - Math.min(...labPitch)).toFixed(2);
  console.log(`    ⇒ 1행(출석) 아래 pitch = ${pitch[0]}  ·  라벨행 5칸 pitch = ${labPitch.join('/')}`);
  console.log(`    ⇒ 라벨행 pitch 편차 = ${spread}px  ·  출석 pitch 는 라벨행 평균의 ` +
              `${(pitch[0] / (labPitch.reduce((a, c) => a + c, 0) / labPitch.length)).toFixed(3)}배`);
  ok(pitch[0] > Math.max(...labPitch) + 15,
     `[결손 ⓐ] 출석 아래 pitch(${pitch[0]})가 라벨행 최대(${Math.max(...labPitch)})보다 15px 넘게 크다`);
  ok(spread >= 4, `[현행] 라벨행 pitch 도 균등이 아니다(편차 ${spread}px — A2 4회차 nth-child 보정)`);

  /* ── 3. 크기 — 아트 잉크 bbox 를 «차분» 으로 뜬다 ───────────────────────────── */
  /* capA2 3회차 교훈: 임계값 마스크는 드롭섀도를 물어 수 px 틀린다.
     한 행의 `.si` 만 visibility:hidden 으로 끈 캡처와 원본의 차분이 그 행의 «찍힌 잉크» 전부다
     (외곽선 drop-shadow 4겹 포함 — 사람이 보는 실루엣이 그것이다). */
  const clip = { x: 0, y: 0, width: 260, height: 1200 };   /* 좌측 컬럼만 — 차분 잡음을 줄인다 */
  const base = (await p.screenshot({ clip })).toString('base64');
  const shots = [];
  for (const r of rows) {
    const st = await p.addStyleTag({ content:
      `#sideL .ibtn[data-pop="${r.pop}"] .si{visibility:hidden!important}` });
    await p.waitForTimeout(80);
    shots.push((await p.screenshot({ clip })).toString('base64'));
    await p.evaluate(el => el.remove(), st);
    await p.waitForTimeout(60);
  }

  const ink = await p.evaluate(async ({ base, shots, clip }) => {
    const load = b64 => new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64; });
    const px = async b64 => {
      const im = await load(b64);
      const c = document.createElement('canvas');
      c.width = clip.width; c.height = clip.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, clip.width, clip.height).data;
    };
    const A = await px(base);
    const out = [];
    for (const s of shots) {
      const B = await px(s);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
      for (let y = 0; y < clip.height; y++) for (let x = 0; x < clip.width; x++) {
        const i = (y * clip.width + x) * 4;
        /* 차분이 «있다» 는 판정 — JPEG 가 아니라 PNG 무손실이라 임계 8 이면 충분하다 */
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 8) {
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      out.push(n ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n } : null);
    }
    return out;
  }, { base, shots, clip });

  console.log('\n[3] 아트 «잉크» bbox — 차분법(외곽선 포함, 사람이 보는 실루엣)');
  const wArr = [], hArr = [];
  rows.forEach((r, i) => {
    const k = ink[i];
    if (!k) { console.log(`    ${r.pop.padEnd(7)} — 차분 0px (측정 실패)`); return; }
    wArr.push(k.w); hArr.push(k.h);
    console.log(`    ${r.pop.padEnd(7)} ${r.glyph}  잉크 ${String(k.w).padStart(4)}×${String(k.h).padStart(4)}` +
                `  (x ${k.x}..${k.x + k.w - 1} · y ${k.y}..${k.y + k.h - 1})  면적 ${k.n}`);
  });
  /* 형제(라벨행 5칸)의 평균을 자로 삼는다 — 주인이 «다른거랑 같게» 라고 한 그 «다른거» 다 */
  const sib = rows.map((r, i) => ({ r, k: ink[i] })).filter(o => o.k && !o.r.solo);
  const sibW = sib.filter(o => o.r.pop !== 'bless').map(o => o.k.w);
  const sibH = sib.filter(o => o.r.pop !== 'bless').map(o => o.k.h);
  const avgW = sibW.reduce((a, c) => a + c, 0) / sibW.length;
  const avgH = sibH.reduce((a, c) => a + c, 0) / sibH.length;
  console.log(`    ⇒ 기준(축복·출석을 뺀 형제 4칸) 평균 잉크 = ${avgW.toFixed(1)} × ${avgH.toFixed(1)}`);
  rows.forEach((r, i) => {
    const k = ink[i]; if (!k) return;
    console.log(`      ${r.pop.padEnd(7)} 폭 ${((k.w / avgW - 1) * 100).toFixed(1).padStart(6)}%` +
                `  높이 ${((k.h / avgH - 1) * 100).toFixed(1).padStart(6)}%  (형제 평균 대비)`);
  });
  const at = ink[rows.findIndex(r => r.pop === 'attend')];
  const bl = ink[rows.findIndex(r => r.pop === 'bless')];
  ok(at && (at.h / avgH - 1) > 0.10,
     `[결손 ⓑ] 출석 잉크 높이가 형제 평균보다 10% 넘게 크다` +
     (at ? ` (${((at.h / avgH - 1) * 100).toFixed(1)}%)` : ''));
  ok(bl && (bl.w / avgW - 1) > 0.10,
     `[결손 ⓒ] 축복 잉크 폭이 형제 평균보다 10% 넘게 넓다` +
     (bl ? ` (${((bl.w / avgW - 1) * 100).toFixed(1)}%)` : ''));

  /* ── 4. 구조 — 라벨 유무 · 배지 자리 ────────────────────────────────────────── */
  console.log('\n[4] 구조');
  const noLabel = rows.filter(r => !r.label).map(r => r.pop);
  console.log(`    라벨 없는 행: ${noLabel.length ? noLabel.join(',') : '(없음)'}`);
  ok(noLabel.length === 1 && noLabel[0] === 'attend',
     '[결손 ⓓ] 라벨이 없는 행은 «출석» 하나뿐이다 (다른 5행은 라벨을 갖는다)');
  console.log('    배지(.bdg) 로컬 자리 — 아트 h 파생(299 규약)');
  rows.forEach(r => { if (r.bdg) console.log(
    `      ${r.pop.padEnd(7)} bdg x=${(r.bdg.x - r.cell.x).toFixed(2)} y=${(r.bdg.y - r.cell.y).toFixed(2)}` +
    ` ${r.bdg.w.toFixed(2)}×${r.bdg.h.toFixed(2)}`); });

  /* ── 5. `.solo` 전용 CSS 의 다른 사용처가 있는가(등재문 ⓑ) ──────────────────── */
  const soloUse = await p.evaluate(() => document.querySelectorAll('.solo').length);
  console.log(`\n[5] 문서 전체 .solo 노드 수 = ${soloUse}`);
  ok(soloUse === 1, '[등재문 ⓑ] `.solo` 사용처는 출석 한 곳뿐 — 죽은 규칙 없이 함께 걷어낼 수 있다');

  /* ── 6. 현행이 레퍼런스를 따르고 있었는가(이탈의 크기를 미리 잰다) ──────────── */
  console.log('\n[6] 현행 vs A2 레퍼런스 셀 top (ref − 84)');
  rows.forEach(r => {
    const exp = REF_TOP[r.pop] - SB;
    console.log(`    ${r.pop.padEnd(7)} 현행 ${String(r.cell.y).padStart(7)}  ref ${String(exp).padStart(5)}` +
                `  Δ ${(r.cell.y - exp).toFixed(2)}`);
  });
  ok(rows.every(r => Math.abs(r.cell.y - (REF_TOP[r.pop] - SB)) <= 1.5),
     '[전제] 현행 6행은 A2 레퍼런스 좌표를 ±1.5px 로 따르고 있다 — 360 은 여기서 «의도적 이탈» 한다');

  console.log('\n[7] 콘솔 에러 ' + errs.length + '건' + (errs.length ? ':\n  ' + errs.join('\n  ') : ''));
  ok(errs.length === 0, '콘솔 에러 0건');

  await b.close();
  console.log(`\nPROBE360 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail + '건' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('probe360 즉사:', e); process.exit(2); });
