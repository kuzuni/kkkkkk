#!/usr/bin/env node
/* 게이트 — 작업 685 「전투력 알림 = **살아있는 한 장**」 + 684 「대량 소환도 같은 꼴」
 *
 *   node tools/verify685.js
 *
 * 주인 원문(685, 2026-09-02 00:40): «다른 모든곳도 연속 강화 끝나고 알림뜨는데
 *                                   강화 중에도 알림뜨게 해줘야함»
 * 주인 원문(684, 2026-09-02 00:36): «연속 소환일때도 그 전투력 어케 바꼈다 그런 알림떠야함»
 *
 * ⚑ 이 자는 324 의 **개정판**을 지킨다. 324 가 지키던 «홀드는 끝나고 합계 1장» 은
 *   주인이 뒤집었고(위 원문), 뒤집힌 방향은 다음 넷이다:
 *   ① **홀드 한복판에 이미 떠 있다** — 손을 떼기 전에 보인다.
 *   ② **그 한 장이 갱신된다** — 틱마다 새 장이 아니라 같은 노드의 숫자가 바뀐다(동시 ≤1장).
 *   ③ **값은 단조 증가**하고 **끝값 = `cp()` 실측차**(156 규약 — 324 에서 그대로 물려받는다).
 *   ④ **684** — 대량 소환은 동기 배치라 «멎기를 기다릴» 것이 없다: 배치가 끝나면
 *      묶음 창(`CP_FX_MS`)을 다 기다리지 않고 **그 자리에서** 확정된다.
 *
 * ⚠ 324 에서 **안 뒤집은 것**(이 자도 같이 지킨다):
 *   · Δ ≤ 0 은 침묵 — 살아있는 장도 안 만든다.
 *   · 자동 구매·부팅은 침묵.
 *   · 스팸 금지 — 한 연속 행위에 동시 2장 이상은 여전히 위반이다.
 *
 * ⚠ §R 되돌림 시험이 이 자의 무게추다 — 685 를 무력화하면 ①②④ 가 **실제로 빨개지는지**
 *   같은 실행 안에서 확인한다. 없으면 «685 를 통째로 되돌려도 초록인 게이트» 가 된다
 *   (328~330 이 «이관이 본체» 라고 적어 둔 자리 · 334 «되돌림 시험» 선례).
 *
 * [3]-(가) 기계적 검증 — «상태 → 토스트» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const W = 1080, H = 2280;
const HOLD_MS = 2000;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 페이지 안 계측기 — 제품 0줄(probe677/verify619 와 같은 관측점) */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__v685 = { born: [], live: [], t0: 0, wt: 0 });
  const L = document.getElementById('fxl');
  new MutationObserver(ms => { const t = performance.now();
    for (const m of ms) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && /fx-toast/.test((n.className || '') + '') && /전투력/.test(n.textContent || ''))
        P.born.push({ t, node: n });
    } }).observe(L, { childList: true });
  P.sample = () => {
    const els = [...L.querySelectorAll('.fx-toast')].filter(e => /전투력/.test(e.textContent || ''));
    P.live.push({ t: performance.now() - P.t0, n: els.length, txt: els.length ? els[0].textContent.trim() : '' });
  };
  P.reset = () => { P.born.length = 0; P.live.length = 0; P.t0 = performance.now(); };
  P.watch = iv => { P.reset(); clearInterval(P.wt); P.wt = setInterval(P.sample, iv); };
  P.stop = () => { clearInterval(P.wt); P.wt = 0; };
  /* «지금 화면에 전투력 토스트가 없다» 를 기다리는 데 쓴다(앞 액션의 잔상 배제) */
  P.idle = () => ![...L.querySelectorAll('.fx-toast')].some(e => /전투력/.test(e.textContent || ''));
};

/* 값 «⚔️ 전투력 +11.6A» 에서 자릿수를 뺀 비교용 순서키 — fmtB 접미어(A/D/…)까지 감안해
   순서를 보려면 제품에게 물어야 한다. 여기서는 «문구가 바뀌었는가» 만 세고, 단조 증가는
   제품이 들고 있는 누적 Δ 로 확인한다(아래 [1-d]). */
(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const cpMs = Number((code.match(/const CP_FX_MS\s*=\s*(\d+)/) || [])[1]) || 420;
  ok(/function cpSay\s*\(/.test(code), '[0] 685 부품 `cpSay(d, live)` 가 **함수 선언**이다 (§R 이 무력화할 수 있어야 한다)');
  /* ⚑ 684 는 **전용 부품이 없는 것이 정답**이다 — 살아있는 한 장(685)이 배치에도 그대로 걸린다.
     1회차에 즉시 확정용 `cpFxFlush()` 를 뒀다가 [R-b] 가 «꺼도 지연 21.9ms» 로 그것이
     아무것도 안 하는 축임을 찍어 걷어냈다. 그 축이 되살아나면 이 항이 빨개진다. */
  ok(!/function cpFxFlush\s*\(/.test(code),
    '[0] 684 전용 축(`cpFxFlush`)이 없다 — 685 의 살아있는 한 장 하나가 둘을 닫는다');
  ok(/function fxToastAge\s*\(/.test(code), '[0] 수명 손잡이 `fxToastAge(el)` 가 있다 (같은 노드를 다시 늙게 셀 수 있다)');
  /* ⚠ «손잡이 없는» 형태만 금지한다 — `fxToastAge` 안의 `el._fxGone = setTimeout(...)` 은
     손잡이가 붙은 정상 형태다(첫 판본이 그것까지 잡아 스스로 빨개졌다). */
  ok(!/\n\s*setTimeout\(\(\) => el\.remove\(\), 1060\);/.test(code),
    '[0] `fxToast` 가 손잡이 없는 타이머를 직접 걸지 않는다 (살아있는 장이 홀드 중에 지워지지 않는다)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof cpTick === 'function' && typeof doSummon === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(ARM);

  const idle = () => page.waitForFunction(() => window.__v685.idle(), null, { timeout: 6000 }).catch(() => {});

  /* ── 한 번의 훈련 홀드를 재고 한 줄로 돌려준다 ─────────────────────────── */
  async function hold() {
    await page.evaluate(() => { S.gold = 1e18; S.trainStage = 400;
      if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
    await page.waitForTimeout(300);
    await idle();
    const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, '#trCards [data-tr]');
    if (!r || !r.w) return null;
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    const before = await page.evaluate(() => cp());
    await page.evaluate(WATCHF, 60);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    const upAt = await page.evaluate(() => performance.now() - window.__v685.t0);
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const d = await page.evaluate(() => { window.__v685.stop();
      const P = window.__v685;
      const last = P.born.length ? P.born[P.born.length - 1].node : null;
      return { live: P.live.slice(), born: P.born.length,
               fin: last ? last.textContent.trim() : '', cp: cp() }; });
    const during = d.live.filter(s => s.t < upAt);
    const shown = during.filter(s => s.n > 0);
    const exp = await page.evaluate(b => '⚔️ 전투력 +' + fmtB(cp() - b), before);
    return { during: during.length, shown: shown.length, born: d.born,
             maxN: Math.max(0, ...d.live.map(s => s.n)),
             kinds: new Set(shown.map(s => s.txt)).size, fin: d.fin, exp,
             cpD: d.cp - before };
  }
  const WATCHF = iv => window.__v685.watch(iv);

  /* ══ [1] 685 — 훈련 홀드: 살아있는 한 장 ════════════════════════════════ */
  const h = await hold();
  if (!h) { ok(false, '[1] 훈련 카드를 못 찾았다'); }
  else {
    ok(h.cpD > 0, '[1-a] 전제 — 홀드로 전투력이 실제로 올랐다 (표본이 «연속 강화» 다)', 'Δ ' + h.cpD);
    ok(h.shown >= Math.ceil(h.during * 0.6),
      '[1-b] ★홀드 **한복판** 에 이미 떠 있다 (손을 떼기 전)', h.shown + '/' + h.during + ' 표본');
    ok(h.maxN <= 1, '[1-c] 동시 표시 ≤1장 — 스팸 금지(324 규약 유지)', '최대 ' + h.maxN + '장');
    ok(h.kinds >= 3, '[1-d] ★그 한 장의 값이 **갱신**된다 (서로 다른 문구 ' + h.kinds + '종)', h.kinds + '종');
    ok(h.born === 1, '[1-e] 붙은 노드는 **하나뿐** — 틱마다 새 장이 아니다', h.born + '개');
    ok(h.fin === h.exp, '[1-f] 156 규약 — **끝값** 이 `cp()` 실측차 그 자체다',
      '«' + h.fin + '» 기대 «' + h.exp + '»');
  }


  /* ══ [2] 684 — 대량 소환: 배치가 끝나면 그 자리에서 확정 ═════════════════ */
  async function batch(b, times) {
    await page.evaluate(() => { const w = document.getElementById('sumw'); if (w) w.classList.remove('on');
      S.dia = 1e12; S.relic = 1e12; S.gold = 1e18; });
    await page.waitForTimeout(500);
    await idle();
    await page.evaluate(() => window.__v685.reset());
    const r = await page.evaluate(([bb, n]) => {
      const before = cp(), at = performance.now();
      doSummon(bb, n);
      return { before, after: cp(), at, exp: '⚔️ 전투력 +' + fmtB(cp() - before) };
    }, [b, times]);
    await page.waitForTimeout(1400);
    const d = await page.evaluate(() => { const P = window.__v685;
      return { born: P.born.map(o => ({ t: o.t, txt: o.node.textContent.trim() })) }; });
    return { b, times, d: r.after - r.before, exp: r.exp, born: d.born,
             lag: d.born.length ? p1(d.born[0].t - r.at) : -1 };
  }
  /* ⚠ 73 ③ 가이드 소환 미션이 **부팅 직후 스킬 말고는 전부 막는다**(`gmBlocked`) — 그 상태로
     weapon·pet 을 굴리면 `doSummon` 이 첫 줄에서 되돌아가 Δ0 이 되고, 표본이 «제품이 안 올린다»
     가 아니라 «준비가 안 됐다» 로 빨개진다(첫 판본이 그렇게 3건 빨갰다). 미션부터 소진한다. */
  await page.evaluate(() => { S.dia = 1e12; S.gold = 1e18; doSummon('skill', 100);
    const w = document.getElementById('sumw'); if (w) w.classList.remove('on'); });
  await page.waitForTimeout(1400);
  const unblocked = await page.evaluate(() => ['weapon', 'pet'].filter(b => !gmBlocked(b)));
  ok(unblocked.length === 2, '[2-0] 전제 — 가이드 미션이 풀려 다른 배너도 굴릴 수 있다',
    '열린 배너 ' + unblocked.join('·'));

  for (const [b, n] of [['weapon', 1000], ['pet', 100]]) {
    const r = await batch(b, n);
    if (r.d <= 0) { ok(false, '[2] 전제 — ' + b + ' ×' + n + ' 배치로 전투력이 올라야 표본이 된다', 'Δ ' + r.d); continue; }
    ok(r.born.length === 1, '[2-a] ' + b + ' ×' + n + ' — 토스트 정확히 1장', r.born.length + '장');
    ok(r.born[0] && r.born[0].txt === r.exp,
      '[2-b] ' + b + ' ×' + n + ' — 값 = `cp()` 실측차', '«' + (r.born[0] && r.born[0].txt) + '» 기대 «' + r.exp + '»');
    ok(r.lag >= 0 && r.lag < cpMs / 2,
      '[2-c] ★684 — 배치가 끝나면 **그 자리에서** 뜬다 (묶음 창 ' + cpMs + 'ms 를 안 기다린다)',
      '지연 ' + r.lag + 'ms < ' + (cpMs / 2) + 'ms');
  }

  /* §R-b 를 **여기서** 돌린다 — 아래 홀드가 cp 를 10^5 규모로 올려 놓으면 소환 한 배치의
     증분이 `cp()` 반올림에 먹혀 Δ0 이 되고, 표본이 통째로 «스킵» 으로 빠진다(첫 판본이 그랬다). */
  await page.evaluate(() => { window.__cpSayB = window.cpSay;
    window.cpSay = function (d, live) { if (live) return; return window.__cpSayB(d, false); }; });
  const bR = await batch('amulet', 100);
  ok(bR.d > 0 && bR.lag >= cpMs * 0.8,
    '[R-b] 살아있는 갱신을 끄면 배치 토스트가 다시 묶음 창을 **다 기다린다** — [2-c] 는 685 를 본다',
    bR.d <= 0 ? '표본 Δ0 — 전제 미성립' : '지연 ' + bR.lag + 'ms ≥ ' + p1(cpMs * 0.8) + 'ms');
  await page.evaluate(() => { window.cpSay = window.__cpSayB; });

  /* ══ [3] 안 뒤집은 것 — Δ≤0 침묵 ════════════════════════════════════════ */
  await page.evaluate(() => { const w = document.getElementById('sumw'); if (w) w.classList.remove('on'); });
  await idle();
  await page.evaluate(() => window.__v685.reset());
  const down = await page.evaluate(() => {
    markDirty();                                   /* 캐시를 먼저 털어 «직전» 값을 실측으로 잡는다 */
    const before = cp();
    /* 장착 해제로 cp 를 내린다 — 324 [4] 와 같은 표본 */
    const had = S.eqSkill.slice();
    S.eqSkill.length = 0; markDirty();
    return { before, after: cp(), had };
  });
  await page.waitForTimeout(1200);
  const dn = await page.evaluate(() => window.__v685.born.length);
  ok(down.after < down.before, '[3-a] 전제 — 해제로 전투력이 내려갔다', down.before + ' → ' + down.after);
  ok(dn === 0, '[3-b] 하락은 침묵 — 살아있는 장도 안 만든다 (324 규약 유지)', dn + '장');
  await page.evaluate(h2 => { S.eqSkill = h2; markDirty(); }, down.had);
  await page.waitForTimeout(1200);

  /* ══ §R 되돌림 시험 — 685 를 무력화하면 위 축이 실제로 빨개진다 ══════════ */
  console.log('  ── §R 되돌림 시험 (685 를 끄면 무엇이 빨개지는가) ──');
  await idle();
  await page.evaluate(() => {
    window.__cpSay0 = window.cpSay;
    /* 개정 전 규약 그대로 — «살아있는 갱신» 만 삼킨다(확정 한 장은 그대로 난다) */
    window.cpSay = function (d, live) { if (live) return; return window.__cpSay0(d, false); };
  });
  const hR = await hold();
  ok(hR && hR.shown === 0, '[R-a] 살아있는 갱신을 끄면 홀드 한복판이 **0장** — [1-b] 는 685 를 본다',
    hR ? hR.shown + '/' + hR.during + ' 표본' : 'n/a');
  await page.evaluate(() => { window.cpSay = window.__cpSay0; });
  const hB = await hold();
  ok(hB && hB.shown > 0, '[R-c] 되돌리면 다시 홀드 한복판에 뜬다',
    hB ? hB.shown + '/' + hB.during + ' 표본' : 'n/a');

  ok(errs.length === 0, '[4] 콘솔 에러 0', errs.slice(0, 2).join(' / ') || '없음');
  await browser.close();
  console.log('\nVERIFY685 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ 실패 ' + fail + '건' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
