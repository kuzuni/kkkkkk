/* 작업 897 게이트 — «UI 발 톡톡 펄스의 CSS 판» 이 다시 살아나지 않는가.

   ── 이 자가 무엇을 묻는가 ──────────────────────────────────────────────────
   894 §7 이 「`fxPunch2` 의 한 프레임 최대 이동이 진폭의 90.4% — 복귀가 두 프레임」로 넘겼다.
   `probe897` 이 그 앞에서 셋을 갈랐다(338 규칙):
     ① 그 90.4% 는 **복귀가 아니라 «팝»** 이다(0→16.7ms). 팝 구간이 22.4ms 라 **어떤 이징으로도**
        74.4% 아래로 못 간다 — 그 축을 내리려면 «고원 시작 14%» 를 옮겨야 하고 그 값은 93 것이다.
     ② 복귀 자신은 실재하는 결손이었다(하강 최악 48.3% ↔ 형 8.8%).
     ③ ⚑⚑ **그런데 그 곡선은 화면에 없다** — 93 4회차가 UI 발을 `fxPzHit`(JS 진폭)으로 보낸 뒤로
        `fxPunch()` 는 첫 줄에서 빠지고, 아래 `soft ? 'fx-punch2' : 'fx-punch'` 는 닿을 수 없다.
        그 죽은 가지가 **선언된 적 없는 `FX3_PUNCH`** 를 읽고 있었다(되살리면 `ReferenceError`).
   ⇒ 처방은 «죽은 곡선을 예쁘게 다듬기» 가 아니라 **죽은 가지와 그 CSS 를 같이 걷어내기**다
     (333·399 «죽는 분기와 그 게이트 항을 같이» · 402 «사본을 지운다» · 331 «선언째»).

   ── 절(節) ────────────────────────────────────────────────────────────────
   [A] 선언 — 제품에서 `fxPunch2`·`.fx-punch2`·`FX3_PUNCH` 가 사라졌고, 삼항이 접혔다
   [B] 성질 — **살아 있는 형(`fxPunch`)·지불(`fxPay`)은 한 프레임도 안 바뀌었다** · pivot 규약 유지
   [R] 되돌림 시험 — 지운 것을 되살리면 [A]·[B] 가 **실제로** 빨개진다(422 교훈 — 음성항이 공허하면 안 된다)
   [C] 실물 — 브라우저에서 전투 발 펄스가 그대로 돌고, UI 발은 여전히 JS 진폭으로 «톡톡» 한다

   실행: node tools/verify897.js   (--no-browser 로 [C] 생략)
*/
const path = require('path');
const P = require('./probe894.js');

const NOBR = process.argv.includes('--no-browser');
const F = P.FRAME_MS;
let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

const SRC = P.SRC;
/* 주석은 «제품» 이 아니다 — 277 «폐기 식별자» 방식으로 걷어내고 센다.
   ⚠ 897 은 지운 자리에 **왜 지웠는지**를 주석으로 남겼으므로, 주석을 안 걷으면 이 자가 제 기록에 걸린다. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── [A] 선언 ────────────────────────────────────────────────────────────── */
console.log('[A] 선언 — 죽은 곡선이 제품에서 사라졌는가 (주석 제외)');
const nKf = [...CODE.matchAll(/@keyframes\s+fxPunch2\b/g)].length;
const nCls = [...CODE.matchAll(/fx-punch2/g)].length;
const nConst = [...CODE.matchAll(/\bFX3_PUNCH\b/g)].length;
ok(nKf === 0, '[A1] ★ `@keyframes fxPunch2` 0건', nKf + '건');
ok(nCls === 0, '[A2] ★ `fx-punch2` 문자열 0건 — CSS 규칙·선택자·JS 삼항 전부', nCls + '건');
ok(nConst === 0,
   '[A3] ★ **선언된 적 없는 `FX3_PUNCH`** 참조 0건 — 지뢰가 사라졌다(319 계열)', nConst + '건');
/* 삼항이 접혔는가 — «죽은 가지를 남겨 두면 다음 사람이 그 값을 사양으로 읽는다» */
const fnBody = (() => {
  const i = CODE.indexOf('function fxPunch(');
  if (i < 0) return '';
  let d = 0, s = CODE.indexOf('{', i);
  for (let p = s; p < CODE.length; p++) { if (CODE[p] === '{') d++; else if (CODE[p] === '}') { d--; if (!d) return CODE.slice(s, p + 1); } }
  return '';
})();
ok(fnBody.length > 0, '[A4 전제] `fxPunch()` 본문을 읽었다', fnBody.length + '자');
ok(/if\(soft\)\s*return\s+fxPzHit\(/.test(fnBody),
   '[A5] 93 4회차의 조기 반환은 **그대로다** — 897 은 경로를 안 건드렸다(UI 발 = JS 진폭)');
const softTern = [...fnBody.matchAll(/soft\s*\?/g)].length;
ok(softTern === 0,
   '[A6] ★ 조기 반환 **뒤쪽**에 `soft ? … : …` 가 0건 — 닿을 수 없는 가지를 안 남겼다', softTern + '건');
ok(/const\s+gap\s*=\s*420\b/.test(fnBody) && /const\s+cls\s*=\s*'fx-punch'/.test(fnBody)
   && /\}\s*,\s*450\s*\)/.test(fnBody),
   '[A7] ★ 접은 값이 **삼항의 «거짓(전투 발)» 가지 그대로**다 — 동작 Δ0 (420 · \'fx-punch\' · 450)');

/* ── [B] 성질 — 살아 있는 형은 한 프레임도 안 바뀌었다 ──────────────────── */
console.log('\n[B] 성질 — 살아 있는 이웃이 무변경인가');
function load(name) {
  const body = P.blockOf(name), dec = P.declOf(name);
  if (!body || !dec || !dec.durMs) return null;
  return { name, dec, stops: P.stopsOf(body), cs: P.chanStops(P.stopsOf(body), P.CH.scale) };
}
const pun = load('fxPunch'), pay = load('fxPay');
/* 형의 값·길이·구간 이징은 93 39회차 것이다 — 897 이 이웃을 밟았는지 여기서 걸린다 */
const PUNCH_REF = { dur: 420, timing: 'ease-out',
  stops: [[0, 1], [0.14, 1.17], [0.42, 1.13], [0.9, 0.985], [1, 1]],
  atf: [null, null, 'cubic-bezier(.3,.05,.7,.95)', 'ease-out', null] };
const sameStops = pun && pun.cs.length === PUNCH_REF.stops.length
  && pun.cs.every((c, i) => Math.abs(c.p - PUNCH_REF.stops[i][0]) < 1e-6 && Math.abs(c.v - PUNCH_REF.stops[i][1]) < 1e-9)
  && pun.cs.every((c, i) => (c.atf || null) === PUNCH_REF.atf[i]);
ok(!!pun && pun.dec.durMs === PUNCH_REF.dur && pun.dec.timing === PUNCH_REF.timing && sameStops,
   '[B1] ★ 형 `fxPunch` 는 값·길이·구간 이징 **Δ0**(93 39회차 소유 — 봉우리 1.17 · 되튐 .985 · 복귀 near-linear)',
   pun ? pun.dec.durMs + 'ms · 정지점 ' + pun.cs.length : 'null');
ok(!!pay && pay.dec.timing === 'linear' && pay.dec.durMs === 300,
   '[B2] 894 가 닫은 `fxPay` 도 무변경(`linear` · 300ms) — 897 이 이웃 회차를 안 밟았다',
   pay ? pay.dec.timing + ' · ' + pay.dec.durMs + 'ms' : 'null');
/* pivot 규약(43회차) — 한 이름을 덜어도 «세 자리가 같은 pivot» 은 유지된다.
   .fx-punch·.fx-pay 는 CSS 로, UI 발은 `fxPzHit` 이 인라인으로 같은 값을 적는다. */
const pivotRule = /\.cbox\.fx-punch\s*,\s*\.cbox\.fx-pay\{transform-origin:1px 50%\}/.test(CODE);
const pivotInline = [...CODE.matchAll(/transformOrigin\s*=\s*'1px 50%'/g)].length;
ok(pivotRule, '[B3] ★ pivot 규약 유지 — `.cbox.fx-punch,.cbox.fx-pay{transform-origin:1px 50%}`');
ok(pivotInline >= 2,
   '[B4] UI 발은 `fxPzHit` 이 **같은 pivot 을 인라인으로** 적는다 — 규약이 한 자리도 안 빈다(원본+딤 복제판)',
   pivotInline + '자리');
/* 「선언됐지만 아무도 안 쓰는 `@keyframes`」 스윕 — 같은 유령이 더 있으면 여기서 먼저 빨개진다 */
const kfNames = [...new Set([...CODE.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g)].map((m) => m[1]))];
const orphan = kfNames.filter((n) => {
  const uses = [...CODE.matchAll(new RegExp('\\b' + n.replace(/[-]/g, '\\-') + '\\b', 'g'))].length;
  return uses <= 1;                                   /* 선언 그 자체 말고는 아무도 안 부른다 */
});
console.log('  `@keyframes` 총 ' + kfNames.length + '개 · 선언 말고 참조가 0인 것 ' + orphan.length
  + (orphan.length ? ' — ' + orphan.join(', ') : ''));
ok(!orphan.includes('fxPunch2'),
   '[B5] ★ 유령 스윕에 `fxPunch2` 가 없다(있지도 않으니까)');

/* ── [R] 되돌림 시험 ─────────────────────────────────────────────────────── */
console.log('\n[R] 되돌림 시험 — 되살리면 실제로 빨개지는가(422 교훈)');
const revived = CODE
  + '\n@keyframes fxPunch2{0%{transform:scale(1)}14%{transform:scale(1.095)}58%{transform:scale(1.09)}80%{transform:scale(1.02)}100%{transform:scale(1)}}\n'
  + '.fx-punch2{animation:fxPunch2 .16s ease-out both}\n'
  + 'const gap = soft ? FX3_PUNCH : 420;\n';
ok([...revived.matchAll(/@keyframes\s+fxPunch2\b/g)].length > 0
   && [...revived.matchAll(/fx-punch2/g)].length > 0
   && [...revived.matchAll(/\bFX3_PUNCH\b/g)].length > 0,
   '[R1] ★ 지운 세 가지를 도로 붙인 사본에서는 [A1]·[A2]·[A3] 이 **전부** 빨개진다 — 음성항이 공허하지 않다');
/* [R2] 그 곡선을 되살렸을 때의 값이 실제로 나빴다는 것을 산수로 남긴다(다시 재지 않게) */
const deadCs = [{ p: 0, v: 1, atf: null }, { p: .14, v: 1.095, atf: null },
                { p: .58, v: 1.09, atf: null }, { p: .8, v: 1.02, atf: null }, { p: 1, v: 1, atf: null }];
const worstIn = (cs, t0, t1) => {
  const amp = Math.max(...cs.map((c) => c.v)) - Math.min(...cs.map((c) => c.v));
  let d = 0;
  for (let s = t0; s + F <= t1 + 1e-9; s += 0.02) {
    const v = Math.abs(P.valueAt(cs, 'ease-out', 160, s + F) - P.valueAt(cs, 'ease-out', 160, s));
    if (v > d) d = v;
  }
  return d / amp * 100;
};
const deadDesc = worstIn(deadCs, 92.8, 160), deadAll = worstIn(deadCs, 0, 160);
const punDesc = (() => {
  const cs = pun.cs, amp = Math.max(...cs.map((c) => c.v)) - Math.min(...cs.map((c) => c.v));
  let d = 0;
  for (let s = 176.4; s + F <= 420 + 1e-9; s += 0.02) {
    const v = Math.abs(P.valueAt(cs, 'ease-out', 420, s + F) - P.valueAt(cs, 'ease-out', 420, s));
    if (v > d) d = v;
  }
  return d / amp * 100;
})();
console.log('  지운 곡선(참고) — 전역 최악 ' + deadAll.toFixed(1) + '%(= «팝») · 하강 최악 '
  + deadDesc.toFixed(1) + '%   |   살아 있는 형 하강 최악 ' + punDesc.toFixed(1) + '%');
ok(deadDesc > punDesc * 2,
   '[R2] ★ 등재문의 ② 는 참이었다 — 그 곡선의 하강은 형의 두 배 넘게 나빴다. **다만 화면에 없었다**',
   deadDesc.toFixed(1) + '% > ' + (punDesc * 2).toFixed(1) + '%');
ok(Math.abs(deadAll - 90.2) < 1.0 && deadAll > 74.4,
   '[R3] ★ 등재문의 ① «90.4%» 는 «팝» 프레임이고 22.4ms 구간의 linear 하한(74.4%)조차 못 내려간다 — '
   + '«복귀에 방을 주면 닫힌다» 는 처방으로는 **애초에 안 움직였을 축**이다',
   deadAll.toFixed(1) + '%');

/* ── [C] 실물 ────────────────────────────────────────────────────────────── */
(async () => {
  if (!NOBR) {
    console.log('\n[C] 브라우저 실물 — 산 것은 살아 있고 죽은 것은 없다');
    const { pw, launch } = require('./pwlaunch');
    const { chromium } = pw();
    const b = await launch(chromium);
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await p.waitForTimeout(1500);
    const live = await p.evaluate(async () => {
      const out = {};
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px';
      document.body.appendChild(d);
      d.className = 'fx-punch2'; out.dead = getComputedStyle(d).animationName;
      d.className = 'fx-punch';  out.alive = getComputedStyle(d).animationName;
      d.remove();
      const pill = document.querySelector('.cbox') || document.body;
      /* 전투 발 — 클래스가 붙고 fxPunchN 이 오른다(93 게이트가 세는 그 신호) */
      const n0 = (typeof fxPunchN === 'number') ? fxPunchN : -1;
      let r = null; try { r = fxPunch(pill, false, true); } catch (e) { r = 'throw: ' + e.message; }
      out.hard = String(r); out.hardCls = pill.classList.contains('fx-punch');
      out.dn = ((typeof fxPunchN === 'number') ? fxPunchN : -1) - n0;
      pill.classList.remove('fx-punch'); pill.__fxPunchT = 0;
      /* UI 발 — 조기 반환으로 JS 진폭 표(`fxPz`)에 올라간다 */
      let r2 = null; try { r2 = fxPunch(pill, true, true); } catch (e) { r2 = 'throw: ' + e.message; }
      out.soft = String(r2);
      out.inPz = (typeof fxPz !== 'undefined' && fxPz.has) ? fxPz.has(pill) : null;
      out.softCls = pill.classList.contains('fx-punch2');
      /* pivot 은 `fxPzHit` 이 아니라 **매 프레임 틱**이 적는다 — 두 프레임 굴리고 읽는다
         (안 그러면 «규약이 사라졌다» 가 아니라 «아직 안 적혔다» 를 잰다. 43 교훈 1) */
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      out.origin = pill.style.transformOrigin || '';
      out.tf = pill.style.transform || '';
      try { fxPz.delete(pill); } catch (_) {}
      pill.style.transform = ''; pill.style.transformOrigin = '';
      return out;
    });
    await b.close();
    console.log('  `.fx-punch2` animation-name = ' + live.dead + ' · `.fx-punch` = ' + live.alive);
    console.log('  전투 발 ' + live.hard + ' · 클래스 ' + live.hardCls + ' · fxPunchN +' + live.dn
      + '   |   UI 발 ' + live.soft + ' · fxPz 등재 ' + live.inPz + ' · transform ' + (live.tf || '(없음)'));
    ok(live.dead === 'none',
       '[C1] ★ 브라우저에도 `.fx-punch2` 가 없다 — CSS 규칙이 실제로 사라졌다', live.dead);
    ok(live.alive === 'fxPunch',
       '[C2] 형 `.fx-punch` 는 그대로 산다 — 자가 «둘 다 죽은 것» 을 보고 있는 게 아니다', live.alive);
    ok(live.hard === 'true' && live.hardCls === true && live.dn === 1,
       '[C3] ★ 전투 발 펄스가 종전대로 돈다(클래스 부착 + `fxPunchN` +1 — 93 게이트가 세는 신호)');
    ok(live.soft === 'true' && live.softCls === false && live.inPz === true,
       '[C4] ★ UI 발은 클래스 없이 **JS 진폭 표(`fxPz`)** 로 간다 — 897 이 «톡톡» 을 안 건드렸다');
    ok(live.origin === '1px 50%',
       '[C5] ★ UI 발이 인라인으로 적는 pivot 이 43회차 규약 그대로다 — CSS 선택자에서 한 이름을 덜어도 '
       + '도착점은 안 움직인다', live.origin || '(없음)');
    ok(errs.length === 0, '[C6] 페이지 에러 0건', errs.slice(0, 2).join(' | '));
  }

  console.log('\n=== VERIFY897 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + ' ===');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
