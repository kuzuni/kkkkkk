/* 작업 592 — 재현(338 규칙: 등재문의 처방을 따르기 **전에** 실제로 찍힌 것부터 본다).
 *
 * 등재문의 가설:
 *   ⓐ 적이 죽을 때 `killEnemy` 가 `fxAt(…, 'combat')` 로 발원을 찍고 `S.gold += g` 를
 *      `fxWatch` 가 잡아 코인이 난다 = 주인이 «빼 달라» 고 한 그 연출.
 *   ⓑ 그 연출은 `#fxlc`(z7) 층에 DOM 노드로 태어난다.
 *   ⓒ 적 색 사망 파티클(`burst` → 캔버스 `parts`)은 그와 **다른 것**이다 — 남겨야 한다.
 *   ⓓ 비행을 안 쏘면 `fxHold`/`fxRoll` 이 안 걸려 HUD 골드 숫자가 즉시 오른다.
 *
 * 재는 것(메인 화면 · 팝업 0 · 자동 전투 WATCH_MS):
 *   [1] 킬 수 · 골드 증가분          — «보상은 그대로» 의 기준선
 *   [2] `#fxlc` 에 태어난 재화 연출 노드(fx-fly / fx-plus)와 `.fx-lit`(딤 위 알약 복제)
 *   [3] `#fxlc` 동시 노드 최대치 · 프레임 시간(연출을 끄면 좋아지는 방향 — 592 ⑤)
 *   [4] 캔버스 파티클 `parts` 최대치 · 사망 파티클 색(적 색) — ⓒ 의 기준선
 *   [5] HUD 골드 표시값(`fxDisp.gold`)이 실제 `S.gold` 를 얼마나 뒤따라오는가(홀드·롤링)
 *
 * 실행: node tools/probe592.js [--ms 8000] [--killfx = 「수리 전」 재현]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const MS = (() => { const i = process.argv.indexOf('--ms'); return i > 0 ? +process.argv[i + 1] : 8000; })();
/* 「수리 전」을 **같은 자·같은 프로세스**에서 잰다 — 스위치를 켜면 592 이전 동작이 그대로 돌아온다.
   커밋을 갈아 끼워 두 번 재는 것보다 짧고, «전·후 표»(592 ⑤)의 두 행이 같은 조건임이 보장된다. */
const KILLFX = process.argv.includes('--killfx');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

const SCENE = `async ({ ms, killfx }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  if (killfx) FX_COMBAT_FX.kill = true;               /* 「수리 전」 재현 */
  /* 팝업이 없는 «메인 화면» 상태로 둔다. 273 «파밍 대기» 로 두면 새 보스전이 서지 않아
     잡몹 킬만 계속 도는 정상 구간이 된다(verify518 [E]·probe518t 와 같은 처방). */
  S.bossFarm = true;
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
  await new Promise(r => setTimeout(r, 900));         /* 앞선 묶음이 가라앉기를 기다린다 */
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());

  const born = [];                                     /* 태어난 재화 연출 노드 */
  const layerOf = el => el.closest('#fxl') ? 'fxl' : (el.closest('#fxlc') ? 'fxlc' : '?');
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const n of rec.addedNodes) {
      if (n.nodeType !== 1 || !n.classList) continue;
      if (n.classList.contains('fx-fly') || n.classList.contains('fx-plus') || n.classList.contains('fx-lit'))
        born.push({ cls: n.className, layer: layerOf(n) });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  const g0 = S.gold, k0 = S.totalKills;
  let lcMax = 0, partMax = 0, frames = 0, lagMax = 0, lagSum = 0, held = 0;
  const gaps = [], partCol = new Set();               /* 색은 «창 전체» 로 모은다 — 끝 프레임만 보면 이미 다 사라져 있다 */
  let last = performance.now();
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    await raf();
    const now = performance.now();
    gaps.push(now - last); last = now;
    frames++;
    lcMax = Math.max(lcMax, document.getElementById('fxlc').childElementCount);
    const pr = (typeof parts !== 'undefined' && parts) ? parts : [];
    partMax = Math.max(partMax, pr.length);
    for (const q of pr) if (q && q.c) partCol.add(q.c);
    /* 592 ③ — HUD 표시값이 실제 보유량을 얼마나 뒤따라오는가. 비행이 있으면 fxHold 가
       표시값을 붙잡아 두므로 이 차이가 벌어진다(= 숫자가 «나중에» 오른다). */
    const d = (typeof fxDisp !== 'undefined' && fxDisp.gold != null) ? (S.gold - fxDisp.gold) : 0;
    lagMax = Math.max(lagMax, d); lagSum += d;
    if (fxHold.gold > now) held++;
  }
  mo.disconnect();

  /* 사망 파티클 색 — 적 색(e.T.col)이 캔버스 파티클에 그대로 들어간다(592 ② 회귀 기준선) */
  const partCols = [...partCol].sort();
  gaps.sort((a, b) => a - b);
  return {
    kills: S.totalKills - k0, gold: Math.round(S.gold - g0),
    fly:  born.filter(b => /fx-fly/.test(b.cls)).length,
    flyL: [...new Set(born.filter(b => /fx-fly/.test(b.cls)).map(b => b.layer))],
    plus: born.filter(b => /fx-plus/.test(b.cls)).length,
    lit:  born.filter(b => /fx-lit/.test(b.cls)).length,
    lcMax, partMax, partCols, frames,
    fpsMed: +(1000 / gaps[gaps.length >> 1]).toFixed(1),
    gapP95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(2),
    lagMax: Math.round(lagMax), lagAvg: Math.round(lagSum / Math.max(1, frames)),
    heldPct: +(100 * held / Math.max(1, frames)).toFixed(1)
  };
}`;

(async () => {
  console.log('\n=== probe592 — 킬 드랍 골드 연출 재현 (' + MS + 'ms 자동 전투 · 팝업 없음'
            + (KILLFX ? ' · **수리 전**(FX_COMBAT_FX.kill = true)' : ' · 현재(kill 꺼짐)') + ') ===');
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* ⚠ 문자열 씬은 `eval('(' + … + ')')` 로 **함수로 만들어** 넘긴다 — 문자열 그대로 주면
     playwright 1.62 가 «식» 으로 읽어 인자를 안 넘기고 undefined 를 돌려준다(verify518 220행 선례). */
  const r = await p.evaluate(eval('(' + SCENE + ')'), { ms: MS, killfx: KILLFX });
  console.log('  ' + JSON.stringify(r));

  /* ── 기준선 판정 — «지금 무엇이 찍히는가» 를 항으로 못박는다 ─────────── */
  ok(r.kills > 0, '[1] 자동 전투가 실제로 돌았다 — 킬 ' + r.kills + '회');
  ok(r.gold > 0, '[2] 그동안 골드가 늘었다 — +' + r.gold);
  /* KILLFX 스위치가 꺼져 있으면 이 두 항은 «0 이어야 한다» 는 뜻으로 뒤집힌다(verify592 가 잰다).
     probe 는 «지금 상태» 를 그대로 적는 자이므로 여기서는 값만 남긴다. */
  console.log('  [i] 킬 드랍 코인(fx-fly) ' + r.fly + '개 · 층 ' + JSON.stringify(r.flyL)
            + ' · +n ' + r.plus + ' · 알약 복제(fx-lit) ' + r.lit);
  ok(r.partMax > 0, '[3] 사망 파티클(캔버스 parts)이 살아 있다 — 최대 ' + r.partMax + '개 · 색 ' + JSON.stringify(r.partCols));
  console.log('  [i] #fxlc 동시 노드 최대 ' + r.lcMax + ' · 프레임 중앙 ' + r.fpsMed + 'fps · p95 간격 ' + r.gapP95 + 'ms');
  console.log('  [i] HUD 골드 표시 지연 — 최대 ' + r.lagMax + ' · 평균 ' + r.lagAvg + ' · 홀드 프레임 ' + r.heldPct + '%');
  ok(errs.length === 0, '[4] 콘솔 에러 0건 — ' + JSON.stringify(errs.slice(0, 3)));

  await b.close();
  console.log('\n  ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
