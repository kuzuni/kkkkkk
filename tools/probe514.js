/* 작업 514 — 룰렛 «연출 스킵» 재현/측정 (판정 없음, 측정 전용).
 *
 * LESSONS 338 ① — 등재문의 처방을 따르기 전에 **가설부터 재현해 기각하거나 확인한다.**
 * 514 등재문의 가설 셋:
 *   ⓐ 1회 회전이 `ROUL_MS 3600` + `ROUL_BACK_MS 260` = **약 3.9초** 고정이고 스킵 경로가 없다.
 *   ⓑ 부품(`.sm-sk`)·상태(`S.opt.sumSkip`)는 이미 있다(363) — 새로 짤 것이 없다.
 *   ⓒ 이탈 경로가 전부 `roulFinish(idx)` 를 지나므로 스킵이 보상을 흘릴 구조가 아니다.
 *
 * 재는 것:
 *   [1] 회전 시작 → 결과 문구(`#rouRes`)가 뜰 때까지의 **실측 벽시계**(수리 전/후 대조용)
 *   [2] 그 사이 «아직 결과가 없는» 프레임 수 (= 주인이 기다리는 구간)
 *   [3] 룰렛 팝업의 **자리 실측** — 토글을 놓을 빈 띠가 실제로 있는가(어림짐작 금지)
 *   [4] 363 토글 부품의 실측 bbox (승격 대상이 무엇인지 숫자로 못박는다)
 *   [5] 지급 1회 보증 — 회전 도중 팝업을 닫아도 `S.dia` 증가가 정확히 한 번인가(181 회귀)
 *
 * 실행: node tools/probe514.js
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(수리 후에는 --skip 으로 토글을 켠 값도 같이 찍는다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const WANT_SKIP = process.argv.includes('--skip');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const r = await p.evaluate(async (wantSkip) => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    const rect = s => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2),
        w: +b.width.toFixed(2), h: +b.height.toFixed(2), b: +b.bottom.toFixed(2), r: +b.right.toFixed(2) }; };

    /* 스킵 상태의 이름이 수리 전/후로 다르다 — 있는 쪽에 쓴다(수리 전 트리에서도 그대로 돈다) */
    const hasFx   = !!(S.opt && 'fxSkip'   in S.opt);
    const hasSum  = !!(S.opt && 'sumSkip'  in S.opt);
    if (hasFx)  S.opt.fxSkip  = !!wantSkip;
    if (hasSum) S.opt.sumSkip = !!wantSkip;

    S.daily.spins = 5;
    const dia0 = S.dia;
    openRoulette();
    await raf();

    /* [3] 팝업 자리 실측 */
    const geo = {
      mbox:  rect('#modal .mbox'),
      mbody: rect('#modal .mbody'),
      h2:    rect('#modal .mbody h2'),
      guide: rect('#rouGuide'),
      rlt:   rect('.rlt'),
      res:   rect('#rouRes'),
      btn:   rect('#rouBtn'),
      skip:  rect('#rouSkip'),          /* 수리 후에만 있다 */
    };

    /* [1][2] 회전 → 결과까지 */
    const t0 = performance.now();
    let frames = 0, blank = 0, tRes = -1;
    document.getElementById('rouBtn').click();
    while (performance.now() - t0 < 8000) {
      await raf();
      frames++;
      const txt = (document.getElementById('rouRes') || {}).textContent || '';
      const got = txt.indexOf('획득') >= 0;
      if (!got) blank++;
      else { tRes = performance.now() - t0; break; }
    }
    const spinMs = tRes;
    const diaGain = S.dia - dia0;

    /* [4] 363 토글 부품 bbox — 12 소환 결과 팝업을 열어서 잰다 */
    closeModal();
    S.dia = 1e9;
    doSummonFree('weapon', 10, true);
    await raf(); await raf();
    const sum = { sk: rect('#sumSkip'), tr: rect('#sumSkip .sm-skt'), kn: rect('#sumSkip .sm-skk') };
    const cssCount = (() => {
      let n = 0;
      for (const ss of document.styleSheets) {
        let rules = []; try { rules = ss.cssRules || []; } catch (_) { continue; }
        for (const ru of rules) if (ru.selectorText && /\.sm-sk\b|\.sm-skt\b|\.sm-skk\b/.test(ru.selectorText)) n++;
      }
      return n;
    })();
    try { closeSummonResult(); } catch (_) {}

    return { geo, spinMs, frames, blank, diaGain, sum, cssCount, hasFx, hasSum };
  }, WANT_SKIP);

  /* [5] 지급 1회 보증 — 회전 도중 팝업을 닫아도 지급은 정확히 한 번 */
  const pay = await p.evaluate(async () => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    S.daily.spins = 5;
    const d0 = S.dia;
    openRoulette();
    await raf();
    document.getElementById('rouBtn').click();
    await new Promise(r => setTimeout(r, 400));
    closeModal();
    await new Promise(r => setTimeout(r, 5000));
    return { gain: S.dia - d0, pend: (typeof rouPend === 'undefined' ? null : rouPend) };
  });

  const g = r.geo;
  const L = (k, v) => console.log('  ' + k.padEnd(26) + (v === null || v === undefined ? '(없음)' : v));
  console.log('── 514 재현 (스킵 ' + (WANT_SKIP ? 'ON' : 'OFF') + ') ──');
  console.log('[상태 키] fxSkip=' + r.hasFx + ' · sumSkip=' + r.hasSum);
  console.log('[1] 회전 시작 → 결과 문구');
  L('실측 ms', r.spinMs < 0 ? '8000ms 안에 안 나옴' : r.spinMs.toFixed(1));
  L('프레임 수', r.frames);
  L('결과 없는 프레임', r.blank);
  L('S.dia 증가', r.diaGain);
  console.log('[3] 룰렛 팝업 자리(1080×2280)');
  ['mbox', 'mbody', 'h2', 'guide', 'rlt', 'res', 'btn', 'skip'].forEach(k => {
    const v = g[k];
    L(k, v ? `x${v.x} y${v.y} ${v.w}×${v.h} (하변 ${v.b} · 우변 ${v.r})` : null);
  });
  if (g.res && g.btn) L('결과줄↔버튼 틈', (g.btn.y - g.res.b).toFixed(2) + 'px');
  if (g.btn && g.mbody) L('버튼 하변↔본문 하변', (g.mbody.b - g.btn.b).toFixed(2) + 'px');
  if (g.rlt && g.res) L('원판 하변↔결과줄', (g.res.y - g.rlt.b).toFixed(2) + 'px');
  console.log('[4] 363 토글 부품(승격 대상)');
  L('#sumSkip', r.sum.sk ? `x${r.sum.sk.x} y${r.sum.sk.y} ${r.sum.sk.w}×${r.sum.sk.h}` : null);
  L('  트랙 .sm-skt', r.sum.tr ? `${r.sum.tr.w}×${r.sum.tr.h}` : null);
  L('  노브 .sm-skk', r.sum.kn ? `${r.sum.kn.w}×${r.sum.kn.h}` : null);
  L('CSS 규칙 수(.sm-sk*)', r.cssCount);
  console.log('[5] 회전 중 닫기 — 지급 1회(181)');
  L('S.dia 증가', pay.gain);
  L('rouPend', pay.pend);
  console.log('콘솔 에러: ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();
})();
