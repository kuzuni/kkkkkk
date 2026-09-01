/* 작업 360 재현 프로브 — «왼쪽 사이드 «출석»·«축복» 만 다른 버튼들과 크기·간격이 달라 보인다»
 *
 *   node tools/probe360.js
 *
 * 주인 원문: «왼쪽에 출석보상만 왼쪽 버튼들이랑 간격이랑 크기가 달라보이더라. 다른거랑 같게 해줘.
 *             축복버튼도 그렇네»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify360.js`) **무엇이 얼마나 달랐고
 * 얼마나 같아졌는가**를 숫자로 박는 자리다. 338·341·350 규칙대로 등재문의 처방을 따르기 **전에**
 * 재현했고, 수리 뒤에도 이 파일이 살아 있으려면 «수리 전» 을 다시 만들 수 있어야 하므로
 * **수리 전 커밋의 index.html** 과 **현재 파일** 을 둘 다 띄워 나란히 잰다(probe350 과 같은 처방).
 *
 * 재는 것은 셋이다 — 주인이 말한 낱말이 «간격» 과 «크기» 둘뿐이기 때문이다(LESSONS 338-② «낱말이 사양이다»).
 *   ⓐ 간격  — 행 pitch(셀 top 차분) 6행
 *   ⓑ 크기  — 아트 «잉크» bbox. **차분법**으로 뜬다(capA2 3회차 교훈: 임계값 마스크는
 *              드롭섀도를 물어 수 px 틀린다 → «그 행의 .si 만 숨긴 캡처» 와의 차분이 정확하다)
 *   ⓒ 구조  — 라벨 유무 · `.solo` 여부 · 배지(`.bdg`) 자리
 *
 * ⚑ **재현 결과 — 등재문의 가설이 그대로 확인됐다**(338 과 달리 기각된 것이 없다). 다만 셋이 아니라
 *    **넷**이었다: 등재문이 지목한 출석·축복 말고 **도감도 형제 대비 폭 −13.5%** 로 ±5% 밖이었다.
 *    주인이 이름을 안 댔을 뿐 «6행이 같은 급» 을 막고 있던 자리라 같이 잡았다.
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
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { plate } = require('./plate360');   /* 385 — 차분법의 공용 판(마젠타). 규약·근거는 그 파일 머리말 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* 수리 «전» = 360 의 제품 변경이 들어가기 직전 커밋(= probe360 을 신설한 1회차 커밋).
   파일을 손으로 되돌려 적으면 그 사본이 또 하나의 «상수» 가 된다(LESSONS 336-②) — 히스토리에서 꺼낸다. */
const BEFORE_REF = process.env.P360_BEFORE || 'dae7b97';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

const CLIP = { x: 0, y: 0, width: 260, height: 1200 };
const SB = 84;                                       /* ROUTINE [2] — 프레임 y = ref y − 84 */
/* A2 측정표 §1-1·§1-2 · §7 — 360 이 «의도적으로 이탈» 하는 대상. 이탈의 크기를 재려고 남긴다. */
const REF_TOP = { attend: 260, roul: 421, quest: 556, promo: 686, coll: 820, bless: 958 };
const REF_PITCH = [161, 135, 131, 133, 138];

async function boot(ctx, url) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#fxl{display:none!important}' });   /* 58 파티클이 차분을 오염시킨다 */
  await p.evaluate(() => {                                            /* capA2 와 같은 상태(02 화면) */
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.stage = 37; S.best = 37; S.gold = 1234567; S.dia = 8900;
    S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0; S.totalKills = 500;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i); });
  await p.addStyleTag({ content:
    '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await p.waitForTimeout(250);
  /* ★ 385(2026-08-29) — **판을 깔고 잰다.** 382 가 `verify360` 에만 넣은 정착 두 줄이 이 자에는
     안 와서, 같은 차분법이 게이트와 다른 숫자를 돌려주고 있었다(게이트 attend 98×100 ↔ 여기
     96×99 · 로드마다 ±1~2px). 판 색 규약과 근거는 `tools/plate360.js` 머리말. */
  await plate(p);
  return { p, errs };
}

/* 한 페이지의 6행을 «구조 + 잉크» 로 잰다 */
async function survey(p) {
  const rows = await p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const g = e => { const b = e.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(2), y: +(b.y - app.y).toFixed(2),
               w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
    const cs = getComputedStyle(document.getElementById('app'));
    return { vars: { ih: cs.getPropertyValue('--ih').trim(), igap: cs.getPropertyValue('--igap').trim(),
                     itop: cs.getPropertyValue('--itop').trim() },
             N: (typeof SIDE === 'object' && SIDE) ? SIDE.N : null,
             soloNodes: document.querySelectorAll('.side .solo').length,
             list: [...document.querySelectorAll('#sideL .ibtn')].map(e => {
               const si = e.querySelector('.si'), sl = e.querySelector('.sl');
               return { pop: e.dataset.pop, solo: e.classList.contains('solo'),
                        label: sl ? sl.textContent : null, glyph: si ? si.textContent : null,
                        cell: g(e), si: g(si),
                        sf: e.style.getPropertyValue('--sf') || '(기본)',
                        sx: e.style.getPropertyValue('--sx') || '(기본)' };
             }) };
  });
  /* 잉크 — 차분법. 한 행의 `.si` 만 끈 캡처와 원본의 차이가 그 행의 «찍힌 실루엣» 전부다
     (외곽선 drop-shadow 4겹 포함 — 사람이 보는 것이 그것이다). */
  const base = (await p.screenshot({ clip: CLIP })).toString('base64');
  const shots = [];
  for (const r of rows.list) {
    const st = await p.addStyleTag({ content:
      `#sideL .ibtn[data-pop="${r.pop}"] .si{visibility:hidden!important}` });
    await p.waitForTimeout(70);
    shots.push((await p.screenshot({ clip: CLIP })).toString('base64'));
    await p.evaluate(el => el.remove(), st);
    await p.waitForTimeout(50);
  }
  const ink = await p.evaluate(async ({ base, shots, CLIP }) => {
    const load = b64 => new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64; });
    const px = async b64 => {
      const im = await load(b64);
      const c = document.createElement('canvas');
      c.width = CLIP.width; c.height = CLIP.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, CLIP.width, CLIP.height).data;
    };
    const A = await px(base), out = [];
    for (const s of shots) {
      const B = await px(s);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < CLIP.height; y++) for (let x = 0; x < CLIP.width; x++) {
        const i = (y * CLIP.width + x) * 4;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      out.push(x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return out;
  }, { base, shots, CLIP });
  rows.list.forEach((r, i) => { r.ink = ink[i]; });
  rows.pitch = rows.list.slice(1).map((r, i) => +(r.cell.y - rows.list[i].cell.y).toFixed(2));
  return rows;
}

/* 한쪽 결과를 표로 찍고, «형제 평균 대비 편차» 를 돌려준다.
   기준은 «주인이 이름을 안 댄 행들» — 즉 출석·축복을 뺀 4칸이다(그것이 주인 원문의 «다른거»). */
function report(tag, s) {
  console.log(`\n───── ${tag}`);
  console.log(`  SIDE.N=${s.N} · --ih ${s.vars.ih} · --igap ${s.vars.igap} · --itop ${s.vars.itop}` +
              ` · .solo 노드 ${s.soloNodes}개`);
  s.list.forEach(r => console.log(
    `    ${r.pop.padEnd(7)} ${r.glyph}  라벨=${String(r.label).padEnd(4)} solo=${String(r.solo).padEnd(5)}` +
    ` 셀 y=${String(r.cell.y).padStart(6)} h=${String(r.cell.h).padStart(6)}` +
    ` 아트h=${String(r.si.h).padStart(6)}` +
    `  잉크 ${r.ink ? String(r.ink.w).padStart(4) + '×' + String(r.ink.h).padStart(4) : ' 측정실패'}` +
    `  sf=${r.sf} sx=${r.sx}`));
  console.log(`    pitch: ${s.pitch.join(' / ')}   (A2 ref ${REF_PITCH.join(' / ')})`);
  const base = s.list.filter(r => r.ink && r.pop !== 'attend' && r.pop !== 'bless');
  const aw = base.reduce((a, r) => a + r.ink.w, 0) / base.length;
  const ah = base.reduce((a, r) => a + r.ink.h, 0) / base.length;
  console.log(`    형제 기준(출석·축복 뺀 4칸) 평균 잉크 = ${aw.toFixed(1)} × ${ah.toFixed(1)}`);
  const dev = {};
  s.list.forEach(r => {
    if (!r.ink) return;
    dev[r.pop] = { w: (r.ink.w / aw - 1) * 100, h: (r.ink.h / ah - 1) * 100 };
    console.log(`      ${r.pop.padEnd(7)} 폭 ${dev[r.pop].w.toFixed(1).padStart(6)}%` +
                `  높이 ${dev[r.pop].h.toFixed(1).padStart(6)}%`);
  });
  const lp = s.pitch;
  const spread = +(Math.max(...lp) - Math.min(...lp)).toFixed(2);
  console.log(`    pitch 편차(6행 전체) = ${spread}px`);
  return { dev, spread, pitch: lp };
}

(async () => {
  /* 수리 «전» 사본 — 히스토리에서 꺼내 임시 폴더에 둔다. 같은 폴더에 둘 필요는 없다
     (이 저장소의 index.html 은 외부 리소스를 안 쓰는 단일 파일이다). */
  let beforeFile = null;
  try {
    /* 756 — 얕은 클론이면 먼저 판다(규약 ①) · 못 가져오면 «환경/진짜 없음» 을 밝혀 던진다(규약 ②) */
    const got = require('./gitrev756').show(BEFORE_REF, 'index.html');
    if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
    if (got.how) console.log('[i]' + got.how);
    const buf = got.buf;
    /* ⚠ **저장소 루트**에 둔다(229 선례). index.html 이 btn.png·hdr.png 를 상대 경로로 물고 있어
       /tmp 에 두면 리소스가 404 가 되고, 배경이 달라지면 차분으로 뜬 «찍힌 픽셀» 도 달라진다
       (1회차에 수리 전 편차가 +20.6/+20.9/−13.5% → +23.4/+18.3/−12.5% 로 흔들린 원인이다). */
    beforeFile = path.join(ROOT, `.v360-before-${process.pid}.html`);
    fs.writeFileSync(beforeFile, buf);
  } catch (e) {
    console.log(`  [!] 수리 전 사본(${BEFORE_REF})을 못 꺼냈다 — «전» 블록은 건너뛴다: ${e.message}`);
  }

  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  console.log('\n=== 360 — 좌측 사이드 6행 «간격·크기» 수리 전/후 ===');

  let A = null;
  if (beforeFile) {
    const { p, errs } = await boot(ctx, 'file://' + beforeFile);
    const s = await survey(p);
    A = report(`수리 전 (${BEFORE_REF})`, s);
    A.errs = errs; A.raw = s;
    await p.close();
  }
  const { p: pB, errs: errB } = await boot(ctx, 'file://' + SRC);
  const sB = await survey(pB);
  const B = report('수리 후 (현재 index.html)', sB);
  B.errs = errB; B.raw = sB;

  console.log('\n───── 판정');
  /* ── 1. 수리 전에 결손이 실재했는가(등재문 가설의 재현) ─────────────────────── */
  if (A) {
    ok(A.pitch[0] - Math.max(...A.pitch.slice(1)) >= 15,
       `[전·ⓐ] 출석 아래 pitch(${A.pitch[0]})가 나머지 최대(${Math.max(...A.pitch.slice(1))})보다 15px 넘게 컸다`);
    ok(A.spread >= 20, `[전·ⓐ] 6행 pitch 편차 ${A.spread}px — 등간격이 아니었다`);
    ok(A.dev.attend && A.dev.attend.h >= 10,
       `[전·ⓑ] 출석 잉크 높이가 형제 평균 +${A.dev.attend ? A.dev.attend.h.toFixed(1) : '?'}% (주인 «크기가 달라보이더라»)`);
    ok(A.dev.bless && A.dev.bless.w >= 10,
       `[전·ⓒ] 축복 잉크 폭이 형제 평균 +${A.dev.bless ? A.dev.bless.w.toFixed(1) : '?'}% (주인 «축복버튼도 그렇네»)`);
    ok(A.dev.coll && A.dev.coll.w <= -10,
       `[전·ⓓ ⚑등재문 밖] 도감 잉크 폭이 형제 평균 ${A.dev.coll ? A.dev.coll.w.toFixed(1) : '?'}% — 주인이 이름을 안 댄 네 번째 자리`);
    ok(A.raw.list.filter(r => !r.label).length === 1 && !A.raw.list[0].label,
       '[전·ⓔ] 라벨이 없는 행이 «출석» 하나 있었다');
    ok(A.raw.soloNodes === 1, '[전·ⓕ] `.solo` 사용처는 출석 한 곳뿐이었다 — 규칙째 걷어낼 수 있다(죽은 규칙 금지)');
    ok(A.raw.list.every(r => Math.abs(r.cell.y - (REF_TOP[r.pop] - SB)) <= 1.5),
       '[전·전제] 수리 전 6행은 A2 레퍼런스 좌표(ref−84)를 ±1.5px 로 따르고 있었다 — 360 은 «의도적 이탈»이다');
  }

  /* ── 2. 수리 후 — 여섯 행이 «같은 급» 인가 ──────────────────────────────────── */
  ok(sB.vars.ih === '82.00px', '[후] --ih = 82.00px (이 해상도에서는 축소가 안 걸린다 — 잰 값이 측정표와 같은 자다)');
  ok(B.spread <= 0.5, `[후·ⓐ] 6행 pitch 가 등간격이다 (편차 ${B.spread}px · ${B.pitch.join('/')})`);
  ok(B.pitch.every(v => Math.abs(v - 134) <= 0.5),
     '[후·ⓐ] pitch = 134 (셀 114 = 아트 82 + 라벨 32, gap 20)');
  const worstW = Math.max(...Object.values(B.dev).map(d => Math.abs(d.w)));
  const worstH = Math.max(...Object.values(B.dev).map(d => Math.abs(d.h)));
  ok(worstW <= 5, `[후·ⓑⓒⓓ] 6행 전부 잉크 폭이 형제 평균 ±5% 안 (최악 ${worstW.toFixed(1)}%)`);
  ok(worstH <= 5, `[후·ⓑ] 6행 전부 잉크 높이가 형제 평균 ±5% 안 (최악 ${worstH.toFixed(1)}%)`);
  ok(sB.list.every(r => r.label), '[후·ⓔ] 6행 전부 라벨을 갖는다 (출석 라벨 신설)');
  ok(sB.list.every(r => !r.solo) && sB.soloNodes === 0,
     '[후·ⓕ] `.solo` 노드 0개 — 단독 규격이 남아 있지 않다');
  ok(sB.list.every(r => Math.abs(r.cell.h - 114) <= 0.5), '[후] 6행 셀 높이가 전부 114');
  ok(sB.N === sB.list.length, `[후] SIDE.N(${sB.N}) = #sideL 행 수(${sB.list.length}) — 짧은 화면비 축소식의 전제`);

  /* ── 3. 이탈의 크기 — 레퍼런스에서 얼마나 멀어졌는지 기록으로 남긴다 ────────── */
  console.log('\n[기록] 수리 후 vs A2 레퍼런스 셀 top (ref − 84) — 주인 지시로 «의도적 이탈» 한 몫');
  sB.list.forEach(r => console.log(
    `    ${r.pop.padEnd(7)} 현행 ${String(r.cell.y).padStart(6)}  ref ${String(REF_TOP[r.pop] - SB).padStart(5)}` +
    `  Δ ${(r.cell.y - (REF_TOP[r.pop] - SB)).toFixed(2)}`));

  ok(errB.length === 0, `[후] 콘솔 에러 0건${errB.length ? ': ' + errB.join(' | ') : ''}`);

  await b.close();
  if (beforeFile) { try { fs.unlinkSync(beforeFile); } catch (_) {} }
  console.log(`\nPROBE360 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail + '건' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('probe360 즉사:', e); process.exit(2); });
