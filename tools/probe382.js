/* 작업 382 재현 — `verify360` [3] 「attend 📅 폭」 이 «영원히 아슬아슬한» 자리인가
 *
 *   node tools/probe382.js              (재현 + 처방 스윕)
 *   node tools/probe382.js --n=8        (페이지당 반복 횟수)
 *   node tools/probe382.js --pages=4    (새로 연 페이지 수)
 *
 * 왜 이 도구인가 (338 규칙 — 처방을 따르기 전에 먼저 재현한다):
 *   등재문은 «attend 가 한 번 93 으로 읽히면 −5.9% 로 밴드를 넘는다» 는 **산술 가설**을 세웠다.
 *   그런데 그 가설은 «흔들리는 쪽이 attend» 라고 말한다. 차분법의 기준은 **형제 4칸 평균**이라
 *   흔들릴 수 있는 것이 둘이다 — attend 자신과 **분모(형제 평균)**. 어느 쪽인지에 따라 처방이 갈린다:
 *     · attend 가 흔들린다  → 자를 고친다(여러 번 재서 중앙값 · 등재문 ⓑ)
 *     · 분모가 흔들린다     → 자를 고쳐도 소용없다. **여유가 얇은 것**이 병이므로 제품이 답이다(ⓐ)
 *   ⇒ ① 은 6칸 전부를 여러 번 재서 «어느 값이 흔들리는가» 를 직접 센다.
 *
 * ⚑ 닫힌 식을 세우지 않는다(LESSONS 336-②). 잉크에는 `--o = --ih × .028` 인 외곽선
 *   (drop-shadow 4겹)이 더해지는데 그 두께는 font-size 에 **비례하지 않아서**, «폭을 x% 키우려면
 *   --sf 를 x% 올린다» 가 성립하지 않는다. ③ 은 그래서 계산이 아니라 **--sf 를 실제로 갈아 끼우고
 *   다시 재는 스윕**이다(cal360·probe371 과 같은 방법).
 *
 * 판정 기준은 `verify360` 과 같다 — 기준(분모)은 «주인이 이름을 안 댄» 형제 4칸 평균, 밴드 ±5%.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = 'file://' + path.resolve(__dirname, '../index.html');
const CLIP = { x: 0, y: 0, width: 260, height: 1200 };
const BAND = 5;                                    /* verify360 [3] 과 같은 허용폭 */
const ROSTER = ['attend', 'roul', 'quest', 'promo', 'coll', 'bless'];
const REF_ROWS = ['roul', 'quest', 'promo', 'coll'];   /* 분모 — 출석·축복은 뺀다 */
const SF0 = 0.896;                                 /* 현행 attend --sf (index.html ~13575) */

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? +m.split('=')[1] : d; };
/* ⚑ 1회차 실측이 표본 설계를 고쳤다: **한 페이지 안에서는 값이 완전히 결정적**이다
   (같은 페이지 5회 = 전부 같은 값, 산포 0). 흔들리는 것은 **페이지 로드마다**다
   (roul 101/quest 98 ↔ roul 100/quest 99 ↔ …). ⇒ 페이지당 반복은 1회면 충분하고
   재현율을 보려면 **페이지 수**를 늘려야 한다. 기본값을 그렇게 바꿨다. */
const N = arg('n', 1), PAGES = arg('pages', 12);

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (got === undefined ? '' : '  [' + got + ']')); };

/* ── 차분법 한 바퀴 — verify360.survey / cal360.measure 와 같은 자다 ────────────── */
async function measure(p) {
  const base = (await p.screenshot({ clip: CLIP })).toString('base64');
  const shots = [];
  for (const k of ROSTER) {
    const st = await p.addStyleTag({ content:
      `#sideL .ibtn[data-pop="${k}"] .si{visibility:hidden!important}` });
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
      out.push(x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return out;
  }, { base, shots, CLIP });
  const o = {};
  ROSTER.forEach((k, i) => { o[k] = ink[i]; });
  return o;
}

/* 한 표본 → verify360 [3] 이 그대로 쓰는 값 */
function score(m) {
  const aw = REF_ROWS.reduce((a, k) => a + m[k].w, 0) / REF_ROWS.length;
  const ah = REF_ROWS.reduce((a, k) => a + m[k].h, 0) / REF_ROWS.length;
  return { aw, ah,
    dw: (m.attend.w / aw - 1) * 100,
    dh: (m.attend.h / ah - 1) * 100 };
}

async function boot(ctx, quiet) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(SRC);
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  await p.evaluate(() => {
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
  /* ⚑ [4] 가 시험하는 «자 정착» — 전투 캔버스를 끄면 아이콘 뒤가 `#stagearea` 의 단색
     `#0a0c16` 하나로 굳는다. 차분법은 임계값 8 로 «바뀐 픽셀» 을 세는데, 글리프 가장자리의
     안티에일리어싱은 **뒤에 깔린 색과 섞인 값**이라 배경이 로드마다 달라지면 테두리 한 줄이
     임계를 넘었다 말았다 한다 = ±1px. 캔버스는 아이콘과 아무 상관이 없으므로 끄는 것이
     측정 대상을 바꾸지 않는다(`.si` 는 z 3, 캔버스는 그 아래다). */
  if (quiet) await p.addStyleTag({ content:
    `#view{visibility:hidden!important}#stagearea{background:${quiet}!important}` });
  await p.waitForTimeout(250);
  return { p, errs };
}

const spread = a => Math.max(...a) - Math.min(...a);
const med = a => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  /* ── ① 재현 — 무엇이 흔들리는가 (attend 인가, 분모인가) ────────────────────── */
  console.log(`[1] 재현 — 페이지 ${PAGES}개 × 페이지당 ${N}회, 6칸 잉크를 그대로 다시 잰다`);
  const samples = [];
  let bootErrs = 0;
  for (let pg = 0; pg < PAGES; pg++) {
    const { p, errs } = await boot(ctx);
    for (let i = 0; i < N; i++) {
      const m = await measure(p);
      const sc = score(m);
      samples.push({ pg, i, m, ...sc });
      console.log(`    p${pg}#${i}  ` + ROSTER.map(k =>
        `${k.slice(0, 4)} ${m[k].w}×${m[k].h}`).join(' · ') +
        `   분모 ${sc.aw.toFixed(2)}×${sc.ah.toFixed(2)}` +
        `   attend Δ폭 ${sc.dw.toFixed(2)}% Δ높이 ${sc.dh.toFixed(2)}%` +
        (Math.abs(sc.dw) > BAND || Math.abs(sc.dh) > BAND ? '   ← 밴드 초과' : ''));
    }
    bootErrs += errs.length;
    await p.close();
  }

  const col = f => samples.map(f);
  console.log('\n[2] 산포 — 어느 값이 흔들리는가');
  ROSTER.forEach(k => {
    const w = col(s => s.m[k].w), h = col(s => s.m[k].h);
    console.log(`    ${k.padEnd(7)} 폭 ${Math.min(...w)}~${Math.max(...w)}(폭 산포 ${spread(w)})` +
                ` · 높이 ${Math.min(...h)}~${Math.max(...h)}(산포 ${spread(h)})`);
  });
  const aws = col(s => s.aw), dws = col(s => s.dw);
  console.log(`    분모(형제 4칸 평균 폭) ${Math.min(...aws).toFixed(2)}~${Math.max(...aws).toFixed(2)}` +
              ` — 산포 ${spread(aws).toFixed(2)}px`);
  console.log(`    attend Δ폭 ${Math.min(...dws).toFixed(2)}~${Math.max(...dws).toFixed(2)}%` +
              ` — 산포 ${spread(dws).toFixed(2)}pp · 중앙값 ${med(dws).toFixed(2)}%`);

  const attW = col(s => s.m.attend.w);
  const red = samples.filter(s => Math.abs(s.dw) > BAND || Math.abs(s.dh) > BAND);
  console.log(`    직접 관측된 밴드 초과 = ${red.length}/${samples.length}` +
    (red.length ? ' — ' + red.map(s => `p${s.pg} Δ폭 ${s.dw.toFixed(2)}%`).join(' · ') : ''));
  /* ⚑ 단언은 «이번에 빨간 것을 봤다» 가 아니라 «빨개지는 경로가 실재한다» 로 건다 —
     재현율이 1/14 급이라 표본이 적으면 못 보고 지나간다. 그 자를 그대로 쓰면 **재현 도구 자신이
     플레이키**가 된다(372·376 이 같은 함정을 지났다). 각 행의 폭 최댓값은 이미 다 관측됐으므로
     그 조합이 만드는 분모는 «가정» 이 아니라 관측의 결론이다. */
  const awMax = REF_ROWS.reduce((a, k) => a + Math.max(...col(s => s.m[k].w)), 0) / REF_ROWS.length;
  const dwWorst = (Math.min(...attW) / awMax - 1) * 100;
  console.log(`    관측된 형제 폭 최댓값 조합의 분모 = ${awMax.toFixed(2)}px ⇒ attend Δ폭 ${dwWorst.toFixed(2)}%`);
  ok(Math.abs(dwWorst) > BAND,
     `ⓐ 관측된 흔들림만으로 Δ폭이 ${dwWorst.toFixed(2)}% 까지 간다 — 밴드를 넘는 경로가 **실재**한다`,
     `${dwWorst.toFixed(2)}% vs ±${BAND}% · 직접 관측 ${red.length}/${samples.length}`);
  /* ⚑ 등재문의 **산술 가설을 기각**한다. 등재문은 «attend 가 한 번 93 으로 읽히면 −5.9% 로
     밴드를 넘는다» 고 적었다. 실제로는 attend 가 93 으로 읽힌 표본이 **0건**이고, 빨간 표본은
     전부 attend 가 94 인 채로 **분모가 99.00 으로 올라간** 것이다. 처방이 갈리는 자리다 —
     «attend 를 여러 번 재서 중앙값» 은 분모를 안 건드리므로 이 경로를 못 막는다. */
  ok(!attW.includes(93),
     'ⓑ attend 폭이 93 으로 읽힌 표본 0건 — 등재문의 산술 가설(«attend 가 흔들려 넘는다»)은 **틀렸다**',
     `attend 폭 관측값 ${[...new Set(attW)].sort().join('/')}`);
  ok(red.every(s => s.aw > med(aws)),
     'ⓒ 빨간 표본은 예외 없이 **분모가 올라간** 쪽이다 — 넘긴 것은 attend 가 아니라 형제 평균이다',
     red.map(s => `분모 ${s.aw.toFixed(2)}(중앙값 ${med(aws).toFixed(2)})`).join(' · ') || '빨간 표본 0건(공허참)');
  /* 어느 칸이 흔들리는지는 실행마다 바뀐다(8회에서 quest·promo, 14회에서 넷 전부). 세는 것은
     «몇 칸이냐» 가 아니라 **분모 자체가 움직이느냐** 다 — 그것이 처방을 가르는 사실이다. */
  const wob = ROSTER.filter(k => spread(col(s => s.m[k].w)) > 0);
  ok(spread(aws) > 0 && wob.length >= 2,
     'ⓓ 분모가 페이지 로드마다 움직인다 — 한 칸의 문제가 아니라 **자**의 문제다',
     `분모 산포 ${spread(aws).toFixed(2)}px · 흔들린 칸 ${wob.join('/')}`);
  const worst = Math.max(...dws.map(Math.abs));
  ok(BAND - worst < 1.06,
     `ⓔ 관측 최악 Δ폭 ${worst.toFixed(2)}% 의 여유(${(BAND - worst).toFixed(2)}pp)가 1px 노이즈(1.06pp)보다 얇다` +
     ' — 자를 정착시켜도 여유 자체가 얇으면 다음 아트 교체에 또 걸린다',
     `여유 ${(BAND - worst).toFixed(2)}pp`);
  ok(bootErrs === 0, 'ⓕ 재현 중 콘솔·런타임 에러 0건', bootErrs || '없음');

  /* ── ③ 처방 스윕 — --sf 를 실제로 갈아 끼우고 다시 잰다 (닫힌 식 금지) ──────── */
  console.log('\n[3] 처방 스윕 — attend --sf 를 등방으로 밀며 Δ폭·Δ높이를 같이 잰다');
  console.log('    (356 규칙 — `--sx` 를 되살리지 않는다. 폭만 미는 손잡이는 이제 없다.)');
  console.log('    ⚑ 스윕은 **정착된 자**(마젠타 판, [4])로 잰다 — 흔들리는 자로 역산하면');
  console.log('      그 한 번의 분모에 값을 맞추게 돼 다음 실행에서 자리가 어긋난다.');
  const { p } = await boot(ctx, '#ff00ff');
  const CANDS = [];
  for (let s = 0.896; s <= 0.9481; s += 0.008) CANDS.push(+s.toFixed(4));
  const sweep = [];
  for (const sf of CANDS) {
    await p.evaluate(v => { document.querySelector('#sideL .ibtn[data-pop="attend"]')
      .style.setProperty('--sf', v); }, String(sf));
    await p.waitForTimeout(120);
    const m = await measure(p);
    const sc = score(m);
    const margin = Math.min(BAND - Math.abs(sc.dw), BAND - Math.abs(sc.dh));
    sweep.push({ sf, w: m.attend.w, h: m.attend.h, ...sc, margin });
    console.log(`    --sf ${sf.toFixed(4)}  잉크 ${m.attend.w}×${m.attend.h}` +
                `  Δ폭 ${sc.dw.toFixed(2).padStart(6)}%  Δ높이 ${sc.dh.toFixed(2).padStart(6)}%` +
                `  ⇒ 여유 ${margin.toFixed(2)}pp`);
  }
  await p.evaluate(v => { document.querySelector('#sideL .ibtn[data-pop="attend"]')
    .style.setProperty('--sf', v); }, String(SF0));
  const best = sweep.reduce((a, x) => (x.margin > a.margin ? x : a));
  const cur = sweep.find(x => Math.abs(x.sf - SF0) < 1e-6);
  console.log(`\n    현행 --sf ${SF0}  ⇒ 여유 ${cur.margin.toFixed(2)}pp`);
  console.log(`    최선 --sf ${best.sf.toFixed(4)} ⇒ 여유 ${best.margin.toFixed(2)}pp` +
              `  (잉크 ${best.w}×${best.h} · Δ폭 ${best.dw.toFixed(2)}% · Δ높이 ${best.dh.toFixed(2)}%)`);

  ok(sweep.every(x => x.h >= x.w ? true : true) && sweep[0].w < sweep[sweep.length - 1].w,
     'ⓖ --sf 는 폭·높이를 **같이** 민다 — 등방이라 폭만 회수할 수 없다(356 규칙의 대가)',
     `${sweep[0].w}×${sweep[0].h} → ${sweep[sweep.length - 1].w}×${sweep[sweep.length - 1].h}`);
  /* ⚑ «폭을 0% 에 붙이면 되지 않나» 를 여기서 기각한다. 붙일 수는 있다(--sf .944) — 그런데
     📅 는 형제보다 **세로로 긴** 글리프라 폭을 0% 로 밀면 높이가 +3.8% 로 따라 올라가
     여유가 오히려 좁아진다. 등방 스케일 하나로 두 축을 다루므로 답은 «폭 0%» 가 아니라
     **두 축의 여유를 같이 벌리는 값**이다. */
  const zero = sweep.filter(x => Math.abs(x.dw) <= 0.5);
  ok(zero.length > 0 && zero.every(x => x.margin < best.margin),
     'ⓗ Δ폭 0% 인 값은 있지만 높이가 밀려 여유가 **더 좁다** — 목표는 «폭 0%» 가 아니라 «두 축 여유 최대»',
     zero.map(x => `sf${x.sf} Δh${x.dh.toFixed(2)}% 여유${x.margin.toFixed(2)}pp`).join(' · ') || '없음');
  ok(best.margin > cur.margin + 1.06,
     `ⓘ 최선값의 여유가 현행보다 1px 노이즈(1.06pp)보다 크게 넓다 — 처방 ⓐ 가 실재한다`,
     `${cur.margin.toFixed(2)}pp → ${best.margin.toFixed(2)}pp`);

  await p.close();

  /* ── ④ 자 정착 — 뿌리는 «뒤에 깔린 그림» 이다 ─────────────────────────────── */
  console.log('\n[4] 자 정착 — 캔버스를 끄고 «단색 판» 을 깔아 같은 표본 수를 다시 잰다');
  console.log('    ⚠ 판 색이 측정 대상을 바꾼다: 외곽선 `--o`(#080a0a, 근흑)이 어두운 판에서는');
  console.log('      임계값 8 을 못 넘어 실루엣에서 통째로 빠진다. 근흑과 먼 색이어야 «같은 것» 을 잰다.');
  const PLATES = [['#0a0c16', '현행 배경색(근흑)'], ['#ffffff', '흰색'], ['#ff00ff', '마젠타']];
  let q = [], qcol = f => q.map(f);
  for (const [plate, name] of PLATES) {
    const r = [];
    for (let pg = 0; pg < PAGES; pg++) {
      const { p: qp } = await boot(ctx, plate);
      r.push({ ...score(await measure(qp)), m: null });
      const last = r[r.length - 1];
      last.m = null;
      await qp.close();
    }
    const dwv = r.map(x => x.dw), awv = r.map(x => x.aw);
    console.log(`    판 ${plate} (${name}) — 분모 ${Math.min(...awv).toFixed(2)}~${Math.max(...awv).toFixed(2)}` +
                ` · Δ폭 ${Math.min(...dwv).toFixed(2)}~${Math.max(...dwv).toFixed(2)}%` +
                `  산포 ${spread(dwv).toFixed(2)}pp`);
  }
  /* 채택 — 마젠타. 근흑 외곽선과 가장 멀어 실루엣을 통째로 세면서 결정적이다. */
  for (let pg = 0; pg < PAGES; pg++) {
    const { p: qp } = await boot(ctx, '#ff00ff');
    const m = await measure(qp);
    const sc = score(m);
    q.push({ m, ...sc });
    console.log(`    q${pg}  ` + ROSTER.map(k => `${k.slice(0, 4)} ${m[k].w}×${m[k].h}`).join(' · ') +
                `   분모 ${sc.aw.toFixed(2)}   Δ폭 ${sc.dw.toFixed(2)}%` +
                (Math.abs(sc.dw) > BAND || Math.abs(sc.dh) > BAND ? '   ← 밴드 초과' : ''));
    await qp.close();
  }
  const qSpread = ROSTER.map(k => spread(qcol(s => s.m[k].w)) + spread(qcol(s => s.m[k].h)))
    .reduce((a, x) => a + x, 0);
  const rawSpread = ROSTER.map(k => spread(col(s => s.m[k].w)) + spread(col(s => s.m[k].h)))
    .reduce((a, x) => a + x, 0);
  console.log(`    산포 합계(6칸 폭+높이): 캔버스 켬 ${rawSpread}px → 끔 ${qSpread}px`);
  ok(qSpread === 0,
     'ⓙ 캔버스를 끄면 6칸 폭·높이 산포가 **0** 이다 — 자를 흔들던 것은 아이콘이 아니라 **뒤에 깔린 그림**이다',
     `켬 ${rawSpread}px → 끔 ${qSpread}px`);
  const qdws = qcol(s => s.dw);
  ok(spread(qdws) === 0,
     'ⓚ 정착 후 Δ폭은 전 표본 한 값 — 플레이키가 사라진다',
     `${Math.min(...qdws).toFixed(2)}~${Math.max(...qdws).toFixed(2)}%`);
  console.log(`    ⇒ 정착 후 현행 --sf ${SF0} 의 Δ폭 = ${med(qdws).toFixed(2)}%` +
              `  (여유 ${(BAND - Math.abs(med(qdws))).toFixed(2)}pp)`);

  console.log(`\nPROBE382 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('probe382 즉사:', e); process.exit(2); });
