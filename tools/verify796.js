/* 작업 796 게이트 — «게이트 플레이키 두 자리: `probe666` [1-a]·[2-a] · `verify682` [R4]»
 *
 *   node tools/verify796.js
 *
 * 등재문(PROGRESS 796)이 지목한 것은 **한 뿌리**였다 — 785 가 «시간 고정 홀드» 를 공용 부품으로
 * 옮길 때 `probe666` 하나가 안 옮겨졌고, `verify682` [R4] 는 그 문턱이 낳는 **표본 4개** 위에
 * 5칸 분포를 세워 두었다(4개를 5칸에 던져 ≥3칸일 확률 0.77 = 자가 4회 중 1회 빨갛다).
 *
 * ⚑ **등재문이 못 본 자리가 하나 더 있었고, 그쪽이 더 자주 빨갰다(338·344 규약 — 밝혀 적는다).**
 *   착수 전 실측(같은 러너 8회): `[2-a]` 4·4·**3**·4·5·4·6·5 (1/8 빨강) ·
 *   **`[1-a]` 은 8회 중 3회 «0회»** 로 더 자주 빨갰다. 그 뿌리는 홀드가 아니라 **누를 자리**다:
 *   대조군([5] 23 훈련)을 닫고 `openRelw()` 를 부른 뒤 자가 **고정 400ms** 만 기다리는데,
 *   닫히는 훈련 시트가 소환 버튼 점을 **900~1000ms** 까지 히트테스트로 물고 있어
 *   (`elementFromPoint` = `.td`/`.tr-tp`) 그 창의 터치는 **`pointerdown` 조차 안 왔다**(눌림 0 · 소환 0).
 *   ⇒ 같은 785 규약의 **다른 축**이다: «시간을 재지 말고 조건을 기다린다» 가 누르는 쪽뿐 아니라
 *      **누를 자리** 에도 필요했다 ⇒ `holdburst.waitHittable` 신설.
 *
 * ⚠ **수리 전 대조가 성립하지 않는 자리다**(등재문이 미리 밝힌 대로) — 793 이전에는 계수기가
 *   구조적으로 0 이라 [2-a] 의 문턱이 **가려져** 있었다. 그래서 이 자는 «옛 커밋과 비교» 가 아니라
 *   **옛 방식을 지금 트리에서 그대로 재현**해 판정한다([R] 절).
 *
 * 절:
 *   [A] 구조 — 손으로 적은 «시간만» 홀드/탭 0건 · 다섯째 식구가 공용 부품을 읽는다 · 문턱 래칫이 «바닥»
 *   [B] 산수 — 문턱을 표본에서 파는 부품(`coverstat`)의 성질: 굳은 그림은 항상 빨갛다 · 헛초록 없음
 *   [C] 자리 — 제품 페이지에서 실제로 기다렸다가 누른다(+ C0 = 실제 닫힘 창 길이 **관측**)
 *   [R] 되돌림 — «남이 그 점을 문» 상태를 덮개로 **결정적으로** 세워, 옛 고정 탭은 `pointerdown`
 *              조차 못 받고 새 자는 걷힐 때까지 기다린다는 것을 못박는다
 *              (⚠ 실제 닫힘 창은 8회 중 3회만 열려 **되돌림 항의 재료로는 못 쓴다** — 그러면
 *               이 자가 새 플레이키가 된다. 그 창의 실측은 [C0] 이 관측으로만 남긴다)
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { holdUntil, waitHittable } = require('./holdburst');
const { coverMin, pCoverAtMost, cellsFor } = require('./coverstat');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t + ']');
const T = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

(async () => {
  /* ── [A] 구조 ──────────────────────────────────────────────────────── */
  blk('A] 구조 — 손으로 적은 시간이 남아 있지 않다');
  const P666 = T('probe666.js'), V682 = T('verify682.js'), V785 = T('verify785.js'), HB = T('holdburst.js');

  ok(/require\('\.\/holdburst'\)/.test(P666),
     'A1 ★ `probe666` 이 785 공용 부품을 읽는다 — 넷만 옮기고 혼자 남아 있던 다섯째다');
  ok(!/while \(Date\.now\(\) - t0 < ms\)/.test(P666),
     'A2 ★ «N밀리초만 누른다» 손 사본 0건(295-②·399·460 죽은 코드 금지)');
  ok(!/const HOLD = 1500/.test(P666) && /NEED = 4/.test(P666),
     'A3 ★ 시간 상수(`HOLD = 1500`)가 **표본 문턱**(`NEED = 4`)으로 바뀌었다 — 문턱은 한 칸도 안 내렸다');
  ok(/waitForTimeout\(60\)/.test(P666) === false,
     'A4 «60ms 탭» 손 사본 0건 — 단발도 «소환이 잡힐 때까지» 누른다');
  ok(/module\.exports = \{ holdUntil, waitHittable/.test(HB),
     'A5 공용 부품이 «자리 대기»(`waitHittable`)를 같이 내놓는다 — 785 계약(`need`·`maxMs`)은 그대로');

  ok(/require\('\.\/coverstat'\)/.test(V682) && !/obin\.size >= 3/.test(V682),
     'A6 ★ `verify682` [R4] 의 손 상수(«5등분 중 ≥3»)가 사라지고 문턱을 **표본에서 판다**');
  const need682 = (V682.match(/NEED = (\d+)/) || [])[1];
  ok(Number(need682) >= 12, 'A7 ★ [R4] 가 설 표본을 **올렸다**(4 → ' + need682 + ') — 내린 게 아니다', 'NEED = ' + need682);
  ok(/v >= USERS\[f\]/.test(V785),
     'A8 ★ 785 A3 래칫이 «같다(===)» 가 아니라 «바닥(≥)» 이다 — 올리는 수리를 자가 막아서지 않는다');
  ok(/'probe666\.js': 4/.test(V785),
     'A9 ★ 785 의 식구 표에 `probe666` 이 들어가 다시 손 사본으로 돌아가면 그 자가 짖는다');

  /* ── [B] 산수 — 문턱을 표본에서 파는 부품의 성질 ─────────────────────── */
  blk('B] 산수 — 표본에서 판 문턱이 «굳은 그림» 을 항상 잡는다');
  const NS = [4, 6, 8, 11, 12, 14, 16, 20, 25];
  const rows = NS.map(n => { const k = cellsFor(n); const t = coverMin(n, k); return { n, k, t, p: pCoverAtMost(n, k, t - 1) }; });
  rows.forEach(r => info('표본 ' + r.n + '개', r.k + '등분 · 문턱 ≥' + r.t + ' · 무작위가 밑돌 확률 ' + r.p.toExponential(1)));
  ok(rows.every(r => r.t >= 2),
     'B1 ★ 문턱이 항상 2 이상 — **위상이 한 자리에 굳으면(1칸) 표본이 몇 개든 빨갛다**(항이 지키는 뜻)');
  /* ⚠ **«전 구간 0.1% 미만» 은 거짓이고, 그렇게 적었다가 이 항이 잡았다(기록으로 남긴다).**
     문턱의 바닥이 2 라 표본이 너무 적으면(4개 → 3등분 ≥2칸) 산술적으로 3.7% 가 남는다 —
     바닥을 지키는 대가다(1칸=굳음을 놓치느니 그 확률을 지고 간다). 그 구간은 이 자가 아니라
     **부르는 자의 전제항**이 잡는다: `verify682` [B0] 이 «버스트 ≥ 12» 로 먼저 빨개지므로
     표본 8 미만은 애초에 [R4] 를 판정할 상태가 아니다. ⇒ 실제 사용 구간(표본 ≥ 8)으로 못박는다. */
  const used = rows.filter(r => r.n >= 8);
  ok(used.every(r => r.p < 1e-3),
     'B2 ★ 헛빨강(플레이키) 한도 — **실제 사용 구간(표본 ≥ 8)** 에서 무작위가 문턱을 밑돌 확률 0.1% 미만',
     '최대 ' + Math.max(...used.map(r => r.p)).toExponential(1)
     + ' · 그 아래(표본 ' + rows.filter(r => r.n < 8).map(r => r.n).join('·') + ')는 [B0] 이 먼저 빨개진다');
  const t11 = coverMin(11, cellsFor(11)), t4 = coverMin(4, cellsFor(4));
  ok(t11 >= t4, 'B3 ★ 표본이 늘면 문턱이 **저절로 엄해진다**(강화 · 표본 4 → ' + t4 + ' · 표본 11 → ' + t11 + ')');
  /* ⚑ 수리 전 산수를 그대로 재현 — «표본 4개 · 5등분 · ≥3칸» 이 실제로 4회 중 1회 빨갰다는 증거 */
  const pOld = pCoverAtMost(4, 5, 2);
  ok(pOld > 0.2, 'B4 ★ 옛 손 상수의 헛빨강 확률 재현 — «표본 4 · 5등분 · ≥3칸» 은 산술적으로 이만큼 빨갛다',
     (pOld * 100).toFixed(1) + '% (실측 등재문 2/5 ↔ 4/5 와 같은 자리)');

  /* ── [C]·[R] 제품 페이지 ───────────────────────────────────────────── */
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const cdp = await p.context().newCDPSession(p);

  /* 소환 실행을 센다(793 규약 — 감는 자리는 `summonRelicBatch`) */
  await ev(p, () => {
    window.__v796 = { sum: 0, pd: 0 };
    const o = window.summonRelicBatch;
    window.summonRelicBatch = function () { const r = o.apply(this, arguments); if (r) window.__v796.sum++; return r; };
    document.getElementById('rwBasin').addEventListener('pointerdown', () => window.__v796.pd++, true);
  });

  blk('R] 되돌림 — «자리가 남의 것인 창» 에서 옛 고정 탭은 삼켜진다');
  /* ⚠ **실제 닫힘 창을 그대로 쓰면 이 자가 새 플레이키가 된다** — 그 창은 러너가 바쁠 때만 열려
     8회 중 3회만 재현됐다(그래서 등재문도 «가끔» 이라고 적었다). 되돌림 항은 **결정적**이어야 하므로
     같은 기계(«남이 그 점을 물고 있다»)를 **덮개 하나로** 세운다 — 닫히는 시트가 하던 일과 같다.
     실제 페이지의 창 길이는 아래 [C0] 이 관측으로만 찍는다(판정하지 않는다). */
  await ev(p, () => { try { closeModal(); closeTrain(); closeDungeon(); } catch (_) {}
    S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(600);
  const covered = await ev(p, () => {
    const e = document.getElementById('rwBasin'); const b = e.getBoundingClientRect();
    const d = document.createElement('div');
    d.id = '__v796cover';
    d.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:transparent';
    document.body.appendChild(d);
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { mine: !!(t && (t === e || e.contains(t))), top: t ? (t.id || t.className || t.tagName) + '' : 'null' };
  });
  info('소환 버튼 중심을 지금 물고 있는 것', covered ? covered.top : '측정 실패');
  ok(!!covered && !covered.mine,
     'R1 ★ 남이 그 점을 물면 히트테스트가 **소환 버튼을 안 준다** — 옛 자는 이 상태를 물어본 적이 없다',
     covered ? '맨 위 = ' + covered.top : '측정 실패');

  /* 옛 방식 그대로: 자리를 안 묻고 60ms 탭 + 420ms 대기 */
  await ev(p, () => { window.__v796.sum = 0; window.__v796.pd = 0; });
  const c0 = await ev(p, () => { const b = document.getElementById('rwBasin').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c0.x, y: c0.y }] });
  await p.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(420);
  const old = await ev(p, () => ({ sum: window.__v796.sum, pd: window.__v796.pd }));
  ok(!!old && old.sum === 0 && old.pd === 0,
     'R2 ★ 옛 «고정 탭» 은 그 창에서 **`pointerdown` 조차 못 받는다**(소환 0) — [1-a] 가 8회 중 3회 «0회» 였던 기계',
     old ? '눌림 ' + old.pd + ' · 소환 ' + old.sum + '회' : '측정 실패');

  /* 덮개가 걷히기를 **기다리는지** 본다 — 600ms 뒤에 걷고, 그 전에는 `waitHittable` 이 안 넘어간다 */
  const sh = await waitHittable(p, '#rwBasin', { maxMs: 300 });
  ok(!sh.ok, 'R3 ★ 덮개가 있는 동안은 `waitHittable` 이 **안 넘어간다**(상한에서 «남의 자리» 로 알린다)', sh.note);
  await ev(p, () => { setTimeout(() => { const d = document.getElementById('__v796cover'); if (d) d.remove(); }, 600); });
  const W2 = await waitHittable(p, '#rwBasin', { maxMs: 8000 });
  ok(W2.ok && W2.ms >= 300,
     'R4 ★ 덮개가 걷힐 때까지 **실제로 기다렸다가** 자리를 되찾는다 — 이것이 [1-a] 를 고친 기계다', W2.note);

  blk('C] 자리 — 수리한 방식은 «자리가 내 것이 될 때까지» 기다린다');
  /* C0 — **관측만**(판정 아님): probe666 의 실제 순서에서 «닫고 → 자리를 되찾기까지» 몇 ms 인가.
     이 값이 옛 고정 대기(400ms)를 넘는 회차가 [1-a] 가 «0회» 로 빨갰던 회차다.
     러너 사정에 따라 흔들리는 값이라 **문턱을 걸지 않는다**(344 규약 — 흔들리는 것은 관측으로 찍는다). */
  await ev(p, () => { try { openTrain(); setTrSub('temper'); S.tstone = 1e12; renderTrain(); } catch (_) {} });
  await p.waitForTimeout(400);
  const t0 = Date.now();
  await ev(p, () => { try { closeModal(); closeTrain(); closeDungeon(); } catch (_) {} S.relic = 1e12; openRelw(); });
  const W3 = await waitHittable(p, '#rwBasin', { maxMs: 8000, stepMs: 30 });
  info('C0 관측 — 닫기 → 자리 되찾기', (Date.now() - t0) + 'ms (옛 고정 대기 400ms · ' + W3.note + ')');

  const HIT = await waitHittable(p, '#rwBasin', { maxMs: 8000 });
  info('자리 확보', HIT.note);
  ok(HIT.ok, 'C1 ★ `waitHittable` 이 그 점을 실제로 되찾는다(옛 자는 여기를 안 기다렸다)', HIT.note);
  await ev(p, () => { window.__v796.sum = 0; window.__v796.pd = 0; });
  const HA = await holdUntil(p, { at: '#rwBasin', need: 1, minMs: 0, maxMs: 4000, settleMs: 420,
                                  mode: 'touch', cdp, count: () => window.__v796.sum });
  ok(HA.n >= 1, 'C2 ★ 같은 자리·같은 터치가 이제 **소환을 돌린다** — [R2] 와 갈리는 것은 «기다렸는가» 뿐',
     HA.note);
  const HB2 = await holdUntil(p, { at: '#rwBasin', need: 4, minMs: 1500, maxMs: 30000,
                                   mode: 'touch', cdp, count: () => window.__v796.sum });
  ok(HB2.n >= 4, 'C3 ★ 홀드도 **표본이 찰 때까지** 누른다 — [2-a] 문턱 4 를 시간이 아니라 표본으로 채운다', HB2.note);
  ok(errs.length === 0, 'C4 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY796 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
