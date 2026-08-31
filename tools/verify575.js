/* 작업 575 게이트 — «한 앵커에 한 재화 한 줄».
 *
 * 지키는 것 셋:
 *   ⓐ 같은 재화가 같은 층에 이미 떠 있으면 **줄을 하나 더 만들지 않는다**(값은 더한다)
 *   ⓑ 합칠 수 없는 이웃(다른 재화 · 층이 갈린 같은 재화)은 **띠가 안 겹치게** 행을 나눈다
 *   ⓒ 그 대가로 **층은 한 노드도 안 옮긴다** — 77(전투 발은 팝업 아래)·518(+n 은 코인과 같은 층)
 *
 * §R 되돌림 시험이 둘을 각각 무력화한 사본으로 «정말 이 두 줄이 일하고 있는가» 를 못박는다.
 *
 * 실행: node tools/verify575.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const os = require('os');

let pass = 0, fail = 0;
const ok = (c, m, v) => { console.log((c ? '  ok   ' : '  FAIL ') + m + (v === undefined ? '' : '  → ' + v)); c ? pass++ : fail++; };

const SRC = path.resolve(__dirname, '../index.html');
const src = fs.readFileSync(SRC, 'utf8');

/* ── 페이지 안에서 도는 실동작 하네스 ──
   `fxPlus` 를 직접 부른다. 묶음·비행·소리를 거치지 않으므로 이 자는 **자리 규칙만** 잰다
   (묶음 쪽은 `probe575` 가 실제 게임 자극으로 따로 잰다). */
const HARNESS = `async (plan) => {
  const clear = () => { document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove()); fxPlusLive.length = 0; };
  const rd = () => [...document.querySelectorAll('#fxl .fx-plus, #fxlc .fx-plus')].map(el => ({
    txt: el.textContent, lay: el.parentNode.id,
    cx: parseFloat(el.style.left), top: parseFloat(el.style.top),
    w: el.offsetWidth, h: el.offsetHeight, ui: el.classList.contains('ui'),
  }));
  clear();
  for (const s of plan) fxPlus(s.cur, s.n, s.combat, s.at || undefined);
  const nodes = rd();
  /* 실제로 그려진 상자도 애니메이션이 도는 동안 표본한다(띠 산수가 그림과 맞는지) */
  const shots = [];
  await new Promise(res => {
    const t0 = performance.now();
    const tick = () => {
      const f = document.getElementById('app').getBoundingClientRect();
      const s = f.width / FRAME_W;
      shots.push([...document.querySelectorAll('#fxl .fx-plus, #fxlc .fx-plus')].map(el => {
        const r = el.getBoundingClientRect();
        return { x1:(r.left-f.left)/s, x2:(r.right-f.left)/s, y1:(r.top-f.top)/s, y2:(r.bottom-f.top)/s };
      }));
      if (performance.now() - t0 < 1300) requestAnimationFrame(tick); else res();
    };
    requestAnimationFrame(tick);
  });
  let worst = 0;
  for (const fr of shots) for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) {
    const a = fr[i], b = fr[j];
    const ix = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
    if (ix <= 0) continue;
    worst = Math.max(worst, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  }
  return { nodes, worst: +worst.toFixed(1), frames: shots.length,
           gold: fmtCur('gold', 150), rise: FXPLUS_RISE, drop: FXPLUS_DROP, gap: FXPLUS_GAP };
}`;

async function run(browser, file, plan) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + file);
  await p.waitForTimeout(1100);
  const r = await p.evaluate(new Function('return ' + HARNESS)(), plan);
  await ctx.close();
  return r;
}

/* 되돌림 사본 — 원본을 한 군데만 무력화한 파일을 임시로 만든다(원본은 안 건드린다) */
function copyWith(name, from, to) {
  if (!src.includes(from)) return null;
  const f = path.join(os.tmpdir(), 'v575-' + name + '.html');
  fs.writeFileSync(f, src.replace(from, to));
  return f;
}

const PLAN_MERGE = [{ cur: 'gold', n: 100, combat: false }, { cur: 'gold', n: 50, combat: false }];
const PLAN_LAYER = [{ cur: 'gold', n: 100, combat: false }, { cur: 'gold', n: 50, combat: true }];
const PLAN_POINT = [{ cur: 'stone', n: 5, combat: true, at: { x: 540, y: 800 } },
                    { cur: 'rstone', n: 3, combat: true, at: { x: 540, y: 800 } }];

(async () => {
  const b = await launch(chromium);

  /* ── [A] 소스 — 부품이 실재하는가 ── */
  console.log('[A] 부품 선언');
  ok(/const fxPlusLive = \[\]/.test(src), '[A1] 살아 있는 플로터 명부 `fxPlusLive`');
  ok(/const FXPLUS_RISE = \d+, FXPLUS_DROP = \d+;/.test(src), '[A2] 띠 상수 FXPLUS_RISE·FXPLUS_DROP');
  ok(/fxPlusLive\.find\(e => e\.cur === cur && e\.lay === lay\)/.test(src),
     '[A3] 합치기 판정은 «같은 재화 + 같은 층» 두 조건이다(층을 안 옮긴다는 뜻)');
  ok(/function fxPlusPurge/.test(src) && /isConnected/.test(src), '[A4] 명부 정리는 «붙어 있는가» 로만 한다(수명 상수 두 벌 금지)');

  /* ── [B] 상수 대조 — 띠 값이 키프레임과 같은가 ── */
  console.log('\n[B] 띠 상수 ↔ @keyframes fxPlus 대조 (340 «상수를 두 벌 적지 마라»)');
  const kf = src.match(/@keyframes fxPlus\{([\s\S]*?)\}\}/);
  const rise = kf && kf[1].match(/0%\{[^}]*translate\(-50%,\s*(-?\d+)px\)/);
  const drop = kf && kf[1].match(/100%\{[^}]*translate\(-50%,\s*(-?\d+)px\)/);
  const cst = src.match(/const FXPLUS_RISE = (\d+), FXPLUS_DROP = (\d+);/);
  ok(!!(kf && rise && drop && cst), '[B1] 키프레임과 상수를 둘 다 읽었다',
     rise && drop && cst ? `키프레임 ${rise[1]}→${drop[1]} · 상수 ${cst[1]}/${cst[2]}` : '–');
  ok(!!(rise && cst) && Number(cst[1]) === -Number(rise[1]), '[B2] FXPLUS_RISE = 0% 키프레임의 위쪽 여정');
  ok(!!(drop && cst) && Number(cst[2]) === Number(drop[1]), '[B3] FXPLUS_DROP = 100% 키프레임의 아래쪽 여정');

  /* ── [C] 실동작 ⓐ 합치기 ── */
  console.log('\n[C] 같은 재화 · 같은 층 → 한 줄로 합친다');
  const C = await run(b, SRC, PLAN_MERGE);
  ok(C.nodes.length === 1, '[C1] 두 번 쐈는데 노드는 하나다', C.nodes.length + '개');
  ok(C.nodes[0] && C.nodes[0].txt === '+' + C.gold, '[C2] 값은 «두 묶음의 합»(100 + 50)', C.nodes[0] && C.nodes[0].txt);
  ok(C.nodes[0] && C.nodes[0].lay === 'fxl', '[C3] 층은 UI 발 그대로', C.nodes[0] && C.nodes[0].lay);
  ok(C.worst === 0, '[C4] 애니메이션이 도는 동안 겹침 0px', C.worst + 'px / ' + C.frames + '프레임');

  /* ── [D] 실동작 ⓑ 행 나누기 (다른 재화 · 같은 점) ── */
  console.log('\n[D] 알약 없는 재화 둘이 같은 점에 뜬다 → 행을 나눈다 (512 계열)');
  const D = await run(b, SRC, PLAN_POINT);
  ok(D.nodes.length === 2, '[D1] 재화가 다르므로 줄은 둘이다', D.nodes.length + '개');
  const dTop = D.nodes.map(n => n.top).sort((a, z) => a - z);
  ok(D.nodes.length === 2 && dTop[0] !== dTop[1],
     '[D2] 두 줄의 top 이 다르다(수리 전에는 한 픽셀도 안 달랐다)', dTop.join(' / '));
  ok(D.nodes.length === 2 && Math.abs((dTop[1] - dTop[0]) - (D.nodes[0].h + D.drop + D.rise + D.gap)) < 1.5,
     '[D3] 간격 = 상자 + 여정(62) + 여백(6) — 띠가 정확히 맞닿는다',
     D.nodes.length === 2 ? (dTop[1] - dTop[0]) + 'px' : '–');
  ok(D.worst === 0, '[D4] 애니메이션이 도는 동안 겹침 0px', D.worst + 'px');

  /* ── [E] 층이 갈린 같은 재화 — 합치지 않고 행을 나눈다(77·518 불변) ── */
  console.log('\n[E] 같은 재화라도 층이 갈리면 합치지 않는다 — 층은 안 옮긴다');
  const E = await run(b, SRC, PLAN_LAYER);
  ok(E.nodes.length === 2, '[E1] 줄은 둘이다(합치면 한쪽 층이 옮겨진다)', E.nodes.length + '개');
  ok(E.nodes.some(n => n.lay === 'fxl') && E.nodes.some(n => n.lay === 'fxlc'),
     '[E2] 한 줄은 #fxl · 한 줄은 #fxlc', E.nodes.map(n => n.lay).join('+'));
  ok(E.worst === 0, '[E3] 그런데도 겹침 0px (수리 전 이 조합이 25.6~40.1px 였다)', E.worst + 'px');

  /* ── [F] 값의 뜻 — 등재문 ② «플로트 값 ↔ 알약 델타가 서로를 설명하지 못한다» ──
     두 수는 **다른 것을 말하는 것이 맞다**(플로트 = 이번에 늘어난 양 · 알약 = 지금 가진 양).
     비평가가 «설명하지 못한다» 고 읽은 것은 93 롤링 계단이 아직 안 끝난 프레임을 잡았기 때문이고,
     ① 을 닫아 «한 재화 한 줄» 이 되면 그 두 수는 서로를 정확히 설명한다. 여기서 그것을 못박는다.
     ⚠ 골드가 아니라 **다이아**로 잰다 — 전투 킬이 골드를 계속 흘려 넣어 «늘어난 양» 이 흔들린다. */
  console.log('\n[F] 플로트 = «이번에 늘어난 양» · 알약 = «지금 가진 양» (등재문 ②)');
  {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto('file://' + SRC);
    await p.waitForTimeout(1100);
    const F = await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      S.dia = 5e6; await wait(1400);                    /* 롤링이 끝나 알약이 정착할 때까지 */
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove()); fxPlusLive.length = 0;
      const before = S.dia, GAIN = 1000;
      S.dia += GAIN; fxFlush();
      /* ⚠ 골드 플로터가 같은 창에 떠 있다(전투 킬) — **색으로** 다이아 줄만 고른다.
         색은 `FXCUR` 표에서 읽는다(리터럴을 자에 두지 않는다 · 512 ⑵). */
      const probe = document.createElement('b');
      probe.style.color = FXCUR.dia.col; document.body.appendChild(probe);
      const want = getComputedStyle(probe).color; probe.remove();
      let txt = null;
      for (let i = 0; i < 60 && !txt; i++) {
        await wait(40);
        const el = [...document.querySelectorAll('#fxl .fx-plus, #fxlc .fx-plus')]
          .find(n => getComputedStyle(n).color === want);
        if (el) txt = el.textContent;
      }
      await wait(2500);                                  /* 롤링·비행이 다 끝난 뒤 알약을 읽는다 */
      const pillEl = document.querySelector('.cDia');
      return { txt, gain: '+' + fmtCur('dia', GAIN), total: '+' + fmtCur('dia', before + GAIN),
               pill: pillEl ? pillEl.textContent.trim() : null, want: fmtCur('dia', S.dia) };
    });
    await ctx.close();
    ok(F.txt === F.gain, '[F1] 플로트는 **늘어난 양**을 말한다', F.txt + ' (기대 ' + F.gain + ')');
    ok(F.txt !== F.total, '[F2] 총액이 아니다 — 그 둘이 헷갈릴 수 없는 표본으로 쟀다(보유 5,000,000)', F.total);
    ok(!!F.pill && F.pill.includes(F.want), '[F3] 알약은 **지금 가진 양**을 말한다(롤링이 끝난 뒤)', F.pill + ' ⊃ ' + F.want);
  }

  /* ── [R] 되돌림 시험 ── */
  console.log('\n[R] 되돌림 시험 — 두 줄을 각각 무력화하면 빨개지는가');
  const fMerge = copyWith('merge', 'const same = fxPlusLive.find(e => e.cur === cur && e.lay === lay);',
                                   'const same = null; fxPlusLive.find(e => e.cur === cur && e.lay === lay);');
  ok(!!fMerge, '[R0-a] 합치기 무력화 사본을 만들었다');
  if (fMerge) {
    const R = await run(b, fMerge, PLAN_MERGE);
    ok(R.nodes.length === 2, '[R1] 합치기를 빼면 줄이 둘이 된다', R.nodes.length + '개');
    ok(R.nodes.length === 2 && R.nodes[0].txt !== R.nodes[1].txt,
       '[R2] 그 둘은 서로 다른 값을 말한다(«+4.1» 과 «+54.3A» 가 이것이다)',
       R.nodes.map(n => n.txt).join(' , '));
  }
  const fBand = copyWith('band', 'const FXPLUS_RISE = 14, FXPLUS_DROP = 48;', 'const FXPLUS_RISE = 0, FXPLUS_DROP = 0;');
  ok(!!fBand, '[R0-b] 띠 무력화 사본을 만들었다(행 나누기를 상자 높이로만 한다)');
  if (fBand) {
    const R = await run(b, fBand, PLAN_LAYER);
    ok(R.worst > 0, '[R3] 띠를 상자로만 잡으면 **겹침이 되살아난다** — 1회차가 여기서 40.1 → 25.6px 로 «줄기만» 했다',
       R.worst + 'px');
  }

  await b.close();
  console.log(`\n${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
