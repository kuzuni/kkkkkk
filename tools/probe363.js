/* 작업 363 — 12 소환 결과 «연출 스킵» 재현/측정 (판정 없음, 측정 전용).
 *
 * LESSONS 338 ① — 등재문의 처방을 따르기 전에 **가설부터 재현해 기각하거나 확인한다.**
 * 363 등재문의 가설: «30연이면 이 순차 연출이 길다»(252 의 `animation-delay = i × 0.055s`).
 * 그래서 이 프로브는 «얼마나 긴가» 를 감이 아니라 시간축으로 잰다 —
 *   ⓐ 카드별 인라인 delay·이긴 animation-name (선언값)
 *   ⓑ 실제 시간축에서 «마지막 카드가 최종 상태(scale 1·opacity 1)에 도달한 시각»
 *   ⓒ 그 사이에 화면이 «미완성» 인 프레임 수 (= 주인이 기다리는 구간)
 *   ⓓ 곁다리로 걸린 지연 부품 — flip 사운드 타이머·희귀 광선 버스트 타이머의 마지막 발화 시각
 *
 * 실행: node tools/probe363.js [--n 10|30]
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(수리 후에는 --skip 으로 토글을 켠 값도 같이 찍는다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', 30));
const WANT_SKIP = process.argv.includes('--skip');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const r = await p.evaluate(async ({ n, wantSkip }) => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    S.dia = 1e9;
    /* 토글이 아직 없는 «수리 전» 트리에서도 그대로 돌게 — 있으면 세팅, 없으면 무시 */
    const hasToggle = !!document.getElementById('sumSkip');
    if (S.opt) S.opt.sumSkip = !!wantSkip;

    /* 서로 다른 n 종 — 같은 아이템은 개수로 합쳐지므로 «칸 수 = n» 을 보장한다.
       ⚠ 배너 하나(weapon)의 풀은 10종뿐이라 30칸이 안 나온다 → 5배너를 돌아가며 뽑는다.
       칸 수만 필요한 측정이므로 «어느 배너에서 나왔는가» 는 이 프로브의 축이 아니다. */
    const keys = Object.keys(BANNERS);
    const res = [], seen = new Set();
    for (let i = 0; i < 60000 && res.length < n; i++) {
      const one = summonOne(keys[i % keys.length]);
      if (seen.has(one.it.id)) continue;
      seen.add(one.it.id); res.push(one);
    }

    /* 지연 타이머 계수기 — 어떤 지연 부품이 남아 있는지 «호출 시각» 으로 잡는다 */
    const fired = [];
    const oST = window.setTimeout;
    window.setTimeout = function (fn, ms) {
      const t0 = performance.now();
      return oST.call(window, function () { fired.push(+(performance.now() - t0).toFixed(1)); return fn.apply(this, arguments); }, ms);
    };

    const t0 = performance.now();
    showSummonResult('weapon', n, res, false);

    const cards = [...document.getElementById('sumGridIn').children];
    const decl = cards.map((el, i) => ({
      i,
      delay: getComputedStyle(el).animationDelay,
      name: getComputedStyle(el).animationName,
      inline: el.style.animationDelay || '',
      cls: el.className
    }));

    /* ⓑ·ⓒ — 실제 시간축. 매 프레임 «최종 상태가 아닌 칸» 을 센다.
       최종 상태 = transform 이 항등(또는 없음) & opacity 1. fxPop 0% 는 scale(0)·opacity 0 이다. */
    const fin = el => {
      const cs = getComputedStyle(el);
      const m = cs.transform;
      const idt = (m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)');
      return idt && Number(cs.opacity) > 0.999;
    };
    const frames = [];
    let doneAt = -1;
    for (let k = 0; k < 240; k++) {                     /* 240 프레임 ≈ 4s 상한 */
      const t = +(performance.now() - t0).toFixed(1);
      const bad = cards.filter(el => !fin(el)).length;
      frames.push({ t, bad });
      if (bad === 0 && doneAt < 0) doneAt = t;
      if (doneAt >= 0 && t - doneAt > 120) break;       /* 안정 확인 후 종료 */
      await raf();
    }
    window.setTimeout = oST;

    const firstFin = frames.find(f => f.bad === 0);
    const notFinal = frames.filter(f => f.bad > 0).length;
    return {
      hasToggle, n: cards.length,
      declFirst: decl[0], declLast: decl[decl.length - 1],
      names: [...new Set(decl.map(d => d.name))],
      delays: decl.map(d => d.inline),
      doneAtMs: firstFin ? firstFin.t : null,
      framesNotFinal: notFinal,
      framesTotal: frames.length,
      firstFrameBad: frames[0] ? frames[0].bad : null,
      timers: fired.slice().sort((a, b) => a - b),
      timerMax: fired.length ? Math.max(...fired) : null,
      timerCount: fired.length,
      open: document.getElementById('sumw').classList.contains('on')
    };
  }, { n: N, wantSkip: WANT_SKIP });

  console.log('\n=== probe363 — 12 소환 결과 등장 연출 (n=' + N + ' · skip=' + WANT_SKIP + ') ===');
  console.log('토글 노드(#sumSkip) 존재 : ' + r.hasToggle);
  console.log('칸 수                    : ' + r.n);
  console.log('이긴 animation-name      : ' + JSON.stringify(r.names));
  console.log('인라인 delay 첫/끝        : "' + r.delays[0] + '" / "' + r.delays[r.delays.length - 1] + '"');
  console.log('첫 프레임 «미완성» 칸    : ' + r.firstFrameBad + ' / ' + r.n);
  console.log('전 칸 최종 도달 시각     : ' + r.doneAtMs + ' ms');
  console.log('«미완성» 프레임 수       : ' + r.framesNotFinal + ' / ' + r.framesTotal);
  console.log('지연 타이머 발화 수      : ' + r.timerCount + ' (마지막 ' + r.timerMax + ' ms)');
  console.log('');

  /* 판정은 «값이 있다» 수준만 — 이 파일은 측정용이다. 대조는 사람이 전/후로 읽는다. */
  ok(r.n === N, 'ⓐ 칸 수 = ' + N);
  ok(r.open === true, 'ⓑ 팝업이 열려 있다');
  ok(r.doneAtMs !== null, 'ⓒ 전 칸이 최종 상태에 도달한다');
  if (WANT_SKIP) {
    ok(r.hasToggle, 'ⓓ 토글 노드가 있다(수리 후 트리)');
    ok(r.firstFrameBad === 0, 'ⓔ 스킵 켬 — **첫 프레임부터** 전 칸이 최종 상태');
    ok(r.doneAtMs !== null && r.doneAtMs < 60, 'ⓕ 스킵 켬 — 전 칸 최종 도달 < 60ms (실측 ' + r.doneAtMs + ')');
    ok(r.names.every(nm => nm === 'none'), 'ⓖ 스킵 켬 — 이긴 animation-name 이 전부 none');
  } else {
    ok(r.firstFrameBad > 0, 'ⓓ 스킵 끔 — 첫 프레임에 «미완성» 칸이 있다(252 연출 살아 있음)');
    ok(r.names.includes('fxPop'), 'ⓔ 스킵 끔 — fxPop 이 이긴다');
  }
  ok(errs.length === 0, 'ⓧ 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

  await b.close();
  console.log('\nPROBE363 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
