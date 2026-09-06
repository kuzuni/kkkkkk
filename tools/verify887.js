#!/usr/bin/env node
/* 작업 887 — 안내문 «위:아래» 여백의 **자** 를 지키는 게이트.
 *
 *   node tools/verify887.js
 *
 * ── 이 자가 지키는 것은 «값» 이 아니라 «자» 다 ────────────────────────────────
 * 이 한 값을 두고 채점자 넷이 2 대 2 로 갈렸고(879 3회차 §19), 저장소 안의 자 셋도
 * 서로 다른 값을 내고 있었다. 887 이 가른 결론은 셋이다:
 *
 *   ① 이 약속의 자는 **찍힌 화소**다. 레퍼런스는 그림이라 «상자» 가 없으므로
 *      상자로 잰 값은 레퍼런스와 견줄 수 없다 — 자가 다르면 일치해도 틀린다(A1 2차 라운드).
 *   ② 아래 끝점은 **하단 테두리 «조립체» 의 최상단**이다(어두운 안쪽 선 + 금테 띠가 다 테두리).
 *      «금테 띠의 첫 행/안» 은 정의가 아니라 **훑는 방향의 부산물**이고, 띠 두께가
 *      레퍼런스 2px ↔ 우리 캡처 5px 이라 그 규약은 두 쪽에서 **서로 다른 것을 훔친다**.
 *      그 비대칭이 «ref 1.00 ↔ 우리 0.96» 이라는 **거짓 일치**를 만들었다(실제 0.90 ↔ 0.76).
 *   ③ 그래서 레퍼런스의 확정값은 1.00 이 아니라 **0.90**(위 10 : 아래 9 ref px)이다.
 *
 * `verify813` [3] 은 DOM 게이트라 화소를 못 본다 — 그래서 **어긋남 두 상수를 밝혀 적은 거울**
 * 로 재고, 그 거울이 실제 화소와 맞는지는 **여기 [5] 짝 항**이 지킨다(자를 두 곳에 두지 않는다).
 *
 * ⚠ 이 자는 Pillow(python)를 쓴다 — 없으면 «환경» 이라고 밝히고 **건너뛴다**(641 교훈:
 *   컨테이너 의존을 저장소 결함으로 세지 않는다). 브라우저는 pwlaunch 가 고른다.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { py } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'shots');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const BASE = 2280;

/* 887 이 확정한 과녁과 대역 —
   레퍼런스의 위·아래는 각 9~10 **ref px** 이고 한 눈금이 프레임 2.22px 다. ±1 눈금이 비를
   ±10% 흔들므로 **그보다 좁은 대역은 레퍼런스가 감당 못 하는 정밀도**다(7회차의 0.92~1.08 은
   틀린 과녁을 담은, 근거보다 좁은 대역이었다). */
/* ⚑⚑ 905 이관 — **위 끝점의 자가 바뀌어 과녁이 0.90 → 0.750 으로 옮겨졌다.**
   887 은 아래 끝점만 «칠해진 행» 규약으로 세우고 위 끝점은 옛 자(U1 = 가장 긴 밝은 가로줄)에
   두었는데, 그 자가 두 그림에서 밑판 외곽선의 **반대편**을 짚고 있었다(우리 −2px · ref +2px).
   위도 같은 걷개로 재면 레퍼런스는 위 12 : 아래 9 ref px 다. 상세 `docs/review/905-안내문위끝점자.md`.
   대역도 같은 방법으로 다시 뽑았다 — ±1 눈금이 (9±1)/12 = 0.667~0.833 · 9/(12±1) = 0.692~0.818. */
/* ⚑⚑ 948 이관 — **과녁도 대역도 «정수 격자» 위에서 세워진 값이었다.**
   932 7회차가 `scan887` 을 부분 화소로 갈자 0.750 은 «정수 두 개의 비» 였음이 드러났고,
   위 주석의 «±1 눈금» 은 그 정수 격자의 한 칸이라 부분 화소 축에는 **없는 눈금**이다.
   948 이 두 수를 다시 세웠다 — 과녁 0.7338(부분 화소) · 대역 = 과녁 ± 9.6%
   (`probe948` [4] 위상 스윕으로 잰 **자 자신의 재현성**). 값은 `tools/target948.js` 한 곳이다. */
const { REF_RATIO, BAND, INT_RATIO } = require('./target948');
/* `verify813` [3] 이 쓰는 거울 상수 — 화소 − 상자. 여기 [5] 가 실측으로 지킨다.
   905 — 위 끝점이 2px 내려오면서 위 거울이 +3 → **+0.7** 이 됐다(아래는 그대로 −2.6).
   ⚑ 948 — 과녁이 부분 화소로 가면서 **거울도 같이 갔다**(위 +0.7 → −1.34 · 아래 −3 → −3.58).
     자를 두 곳에 두지 않는다 — 화소 쪽 값이 부분 화소면 거울도 부분 화소여야 한다. */
const MIRROR = { up: -1.34, dn: -3.58, tol: 1.2 };

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};

function scan() {
  const out = py([path.join(__dirname, 'scan887.py'), '--json',
    ...FRAMES.map(H => path.join(OUT, `887-${H}.png`))],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out.slice(out.indexOf('{')));
}

const MEASURE = () => {
  const R = (s) => document.querySelector(s).getBoundingClientRect();
  const p = R('#relw .rw-bowl') || R('#relw .rw-panel');
  const mid = R('#relw .rw-mid');
  const lines = [...document.querySelectorAll('#relw .rw-cap p')].map(el => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const b = rg.getBoundingClientRect();
    return { y1: b.top, y2: b.bottom };
  });
  return { visAbove: +(lines[0].y1 - mid.bottom).toFixed(2),
           visGap: +(p.bottom - lines[lines.length - 1].y2).toFixed(2) };
};

(async () => {
  /* ── 캡처 — 자와 눈이 같은 화면을 봐야 대조가 된다(cap754 와 같은 프레임·같은 오프너) ── */
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const dom = {};
  for (const fh of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(650);
    await page.evaluate(`try{ openRelw() }catch(e){ window.__e = String(e && e.message || e) }`);
    await page.waitForTimeout(460);
    await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
    dom[fh] = await page.evaluate(MEASURE);
    const el = await page.$('#app');
    await (el || page).screenshot({ path: path.join(OUT, `887-${fh}.png`) });
    await ctx.close();
  }
  await browser.close();

  let s;
  try {
    s = scan();
  } catch (e) {
    console.error('VERIFY887 SKIP — Pillow(python) 없음이거나 자가 죽었다: ' + (e.message || e).split('\n')[0]);
    console.error('  준비: pip install pillow   (641 — 저장소 결함이 아니라 컨테이너 의존이다)');
    process.exit(3);
  }
  const ref = s.ref, caps = s.caps;
  const TH = 110;
  const rt = (r, end) => r.th[TH].ratio[end];              /* 정수 걸음 — 대조용 */
  const st = (r, end) => r.th[TH].sub.ratio[end];          /* 948 — 약속의 자는 부분 화소다 */

  /* ── [1] 두 그림의 하단 테두리는 «조립체» 이고 구조가 같다 ── */
  {
    const rb = ref.border, cb = caps.map(c => c.border);
    const okAll = rb.gold_top > rb.dark_top && cb.every(b => b.gold_top > b.dark_top);
    ok(okAll, '[1] 하단 테두리는 한 줄이 아니라 **조립체**(어두운 안쪽 선 + 금테 띠) — 양쪽 그림에서 같은 구조',
      `ref 어두운선 y${rb.dark_top} + 금테 y${rb.gold_top}..${rb.gold_bot} · 캡처 ` +
      cb.map(b => `y${b.dark_top}+${b.gold_top}..${b.gold_bot}`).join(' · '));
  }

  /* ── [2] 그런데 **띠 두께가 다르다** — 거짓 일치의 기계 ── */
  {
    const rw = ref.border.gold_bot - ref.border.gold_top + 1;
    const cw = caps[0].border.gold_bot - caps[0].border.gold_top + 1;
    /* 레퍼런스 한 눈금은 프레임 2.222px 이므로 ref 2px = 4.44 프레임px ↔ 우리 5px 은 «비슷» 하다.
       치명적인 것은 두께 자체가 아니라 **경계를 띠 «안» 으로 잡을 때 훔치는 양**이다:
       ref 는 1 눈금(2.22 프레임px) · 우리는 5px 이라 2.25배다. */
    const stealRef = (ref.th[TH].down.B1 - ref.th[TH].down.B3) * ref.k;
    const stealCap = (caps[0].th[TH].down.B1 - caps[0].th[TH].down.B3) * caps[0].k;
    ok(rw !== cw && Math.abs(stealCap - stealRef) > 1.5,
      '[2] 「금테 띠 «안»」 규약은 두 쪽에서 **서로 다른 것을 훔친다** — 이것이 거짓 일치의 기계다',
      `띠 ref ${rw}px ↔ 캡처 ${cw}px · 훔치는 양 ref ${stealRef.toFixed(1)} 프레임px ↔ 캡처 ${stealCap.toFixed(1)} 프레임px`);
  }

  /* ── [3] 자의 안정성 — 잉크 문턱을 흔들어도 답이 안 바뀐다(A3-ⓑ 의 자기 적용) ── */
  {
    const spread = (r, sub) => { const v = [90, 110, 140]
        .map(t => r.th[t] && (sub ? r.th[t].sub.ratio.B3 : r.th[t].ratio.B3)).filter(x => x != null);
      return Math.max(...v) - Math.min(...v); };
    const mInt = Math.max(spread(ref), ...caps.map(c => spread(c)));
    /* ⚑ 948 — 정수 걸음에서 «진폭 0» 인 것은 자가 안정해서가 아니라 **분수를 버려서**다.
       부분 화소로 재면 문턱이 답을 움직인다(ref 1.9%). 그래도 그 폭은 대역의 1/5 이라
       이 자는 여전히 이 약속을 맡을 수 있다 — 문턱이 아니라 **위상**이 대역을 정한다(`verify948` [3]). */
    const mSub = Math.max(spread(ref, true), ...caps.map(c => spread(c, true)));
    const half = (BAND[1] - BAND[0]) / 2;
    ok(mInt === 0 && mSub < half,
      '[3] 잉크 문턱 90/110/140 이 답을 흔드는 폭은 **대역의 1/5 안**이다 — 문턱으로 흔들리는 자는 이 약속을 못 맡는다',
      `부분 화소 최대 진폭 ${mSub.toFixed(4)} (대역 반폭 ${half.toFixed(4)} 의 ${(mSub / half * 100).toFixed(0)}%) · ` +
      `정수 걸음은 ${mInt.toFixed(3)} — 안정해서가 아니라 분수를 버려서다 · ` +
      `ref ${st(ref, 'B3').toFixed(4)} · 캡처 ${st(caps[0], 'B3').toFixed(4)}`);
  }

  /* ── [4] 확정값 — 레퍼런스는 **0.750** 이다 ──
     905 이관: 옛 규약 «한 벌»(위 U1 + 아래 금테 띠 «안»)은 같은 그림에서 1.000 을 낸다.
     두 착시가 **비만 상쇄**해 1.00 으로 읽히던 것이 이 값이다(887 이 아래를, 905 가 위를 걷었다). */
  {
    const v = st(ref, 'B3'), vi = rt(ref, 'B3'), old = ref.th[TH].ratio_u1.B1;
    ok(Math.abs(v - REF_RATIO) < 0.002 && Math.abs(vi - INT_RATIO) < 0.005 && Math.abs(old - 1.00) < 0.005,
      '[4] 레퍼런스 확정값 = **0.7338**(부분 화소 · 948) · 같은 그림의 정수 걸음은 0.750 · 옛 규약 한 벌(U1 + 띠 «안»)은 1.00',
      `조립체 최상단 부분 화소 ${v.toFixed(4)} · 정수 ${vi.toFixed(3)}(위 ${ref.th[TH].up} : 아래 ${ref.th[TH].down.B3} ref px) · ` +
      `옛 규약 한 벌 ${old.toFixed(3)}`);
  }

  /* ── [5] 짝 항 — `verify813` [3] 의 거울 상수가 실제 화소와 맞는가 ──
     이 항이 있어야 DOM 게이트가 «화소를 재는 척» 하는 것이 아니게 된다. 서체·행간이
     바뀌면 어긋남이 달라지고 그 순간 여기가 빨개진다(거울을 다시 재라는 신호다). */
  {
    const bad = [];
    for (const c of caps) {
      const H = Number(path.basename(c.path).match(/(\d+)\.png$/)[1]);
      const d = dom[H]; if (!d) continue;
      const du = c.th[TH].sub.up - d.visAbove, dd = c.th[TH].sub.down.B3 - d.visGap;
      if (Math.abs(du - MIRROR.up) > MIRROR.tol || Math.abs(dd - MIRROR.dn) > MIRROR.tol)
        bad.push(`${H}: 위 ${du.toFixed(1)} · 아래 ${dd.toFixed(1)}`);
    }
    const sample = caps.map(c => {
      const H = Number(path.basename(c.path).match(/(\d+)\.png$/)[1]);
      return `${H}:${(c.th[TH].sub.up - dom[H].visAbove).toFixed(2)}/${(c.th[TH].sub.down.B3 - dom[H].visGap).toFixed(2)}`;
    }).join(' · ');
    ok(!bad.length, `[5] 짝 항 — \`verify813\` [3] 의 **부분 화소** 거울 상수(위 ${MIRROR.up} · 아래 ${MIRROR.dn})가 실제 화소와 ±${MIRROR.tol} 안`,
      `화소−상자 ${sample}` + (bad.length ? ' · 어긋남 ' + bad.join(' / ') : ''));
  }

  /* ── [6] 제품 — 다섯 프레임이 과녁 대역 안 ── */
  {
    const vals = caps.map(c => st(c, 'B3'));
    ok(vals.every(v => v >= BAND[0] && v <= BAND[1]),
      `[6] 제품의 **부분 화소** 아래/위 비가 과녁 ${REF_RATIO}(대역 ${BAND[0]}~${BAND[1]}) 안 — 다섯 프레임`,
      caps.map((c, i) => path.basename(c.path).replace(/^887-|\.png$/g, '') + ':' + vals[i].toFixed(4)).join(' · ') +
      ' · 905 전(.4737·T+2.57)은 1.000 이었다 · 정수 걸음으로는 ' +
      caps.map(c => rt(c, 'B3').toFixed(3)).join('/') + ' (948: 넷이 한 칸에 몰린다)');
  }

  /* ── [R] 되돌림 — **제품을 887 이전(.5 분할)으로 되돌린 사본**에 두 규약을 다 대 본다 ──
     887 이 한 일이 «대역을 넓힌 것» 이 아님을 이 항이 못박는다:
       · 옛 규약(금테 띠 «안»)으로 재면 ref 1.00 ↔ 옛 제품 0.96 = **4% 차 = «결함 아님»**
       · 새 규약(조립체 최상단)으로 재면 ref 0.90 ↔ 옛 제품 0.76 = **15.6% 차 = 결함**
     같은 그림·같은 제품인데 답이 갈린다 ⇒ 갈린 것은 제품이 아니라 **자**였다.
     ⚠ 사본은 저장소 루트에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가
       통째로 404 라 «찍힌 픽셀» 이 달라진다(360·367·438·439·453 선례). */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    /* ⚠ 813 10회차 — 제품의 분할이 «비례 .551» 에서 «어파인(.4737·T + 2.57)» 으로 바뀌었다.
       거울 오프셋이 절대량이라 총량이 프레임마다 다르면 비례 계수로는 화소 비가 샌다(1600 0.810).
       되돌림 대상 문자열만 옮긴다 — 사본이 만드는 세계(7회차 .5)는 그대로다. */
    const NEW = 'var(--rw-g3)) * .4286 + 1.21px * var(--rwc,1)));', OLD = 'var(--rw-g3)) * .5));';
    const neg = path.join(ROOT, `.v887-neg-${process.pid}.html`);
    let rOld = null, rNew = null, note = '';
    if (!src.includes(NEW)) {
      note = `되돌림 대상 문자열을 못 찾았다(${NEW})`;
    } else {
      fs.writeFileSync(neg, src.replace(NEW, OLD));
      const b2 = await launch(chromium);
      const ctx = await b2.newContext({ viewport: { width: 1080, height: BASE }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('file://' + neg.replace(/\\/g, '/'), { waitUntil: 'load' });
      await page.waitForTimeout(650);
      await page.evaluate(`try{ openRelw() }catch(e){}`);
      await page.waitForTimeout(460);
      await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
      const el = await page.$('#app');
      const shot = path.join(OUT, '887-neg.png');
      await (el || page).screenshot({ path: shot });
      await ctx.close(); await b2.close();
      fs.unlinkSync(neg);
      const o = py([path.join(__dirname, 'scan887.py'), '--json', shot],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const negScan = JSON.parse(o.slice(o.indexOf('{'))).caps[0];
      /* ⚑ 905 이관 — «옛 규약» 은 이제 **한 벌**(위 U1 + 아래 금테 띠 «안»)이다.
         887 세대가 «두 착시가 비만 상쇄한다» 고 적은 그 짝이고, 그래야 이 항이
         887 이 실제로 본 그림(ref 1.000 ↔ 옛 제품 0.96)을 그대로 재현한다. */
      rOld = negScan.th[TH].ratio_u1.B1;
      rNew = negScan.th[TH].sub.ratio.B3;      /* 948 — 새 규약 쪽은 부분 화소로 잰다 */
    }
    const refOld = ref.th[TH].ratio_u1.B1;
    const dOld = rOld == null ? null : Math.abs(rOld - refOld) / refOld * 100;
    const dNew = rNew == null ? null : Math.abs(rNew - st(ref, 'B3')) / st(ref, 'B3') * 100;
    /* 905 — 문턱 12 → 9. 위 끝점이 정정되며 «새 규약» 쪽 차가 15.6% → 10.1% 로 줄었다
       (그 대신 905 자신의 되돌림 시험이 33% 를 낸다 — `verify905` [R]). */
    ok(rOld != null && dOld < 6 && dNew > 9,
      '[R] **887 이전(.5)으로 되돌린 사본** — 옛 규약 한 벌로는 ref 와 4% 안(결함 안 보임) · 새 규약으로는 10% 차(결함)',
      note || `옛 규약 한 벌 ref ${refOld.toFixed(3)} ↔ 옛 제품 ${rOld.toFixed(3)} (차 ${dOld.toFixed(1)}%) · ` +
      `새 규약(부분 화소) ref ${st(ref, 'B3').toFixed(4)} ↔ 옛 제품 ${rNew.toFixed(4)} (차 ${dNew.toFixed(1)}%)`);
  }

  console.log(`\nVERIFY887 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
