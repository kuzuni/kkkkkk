#!/usr/bin/env node
/* 작업 905 — 안내문 «위» 끝점의 **자** 를 지키는 게이트.
 *
 *   node tools/verify905.js
 *
 * ── 이 자가 지키는 것도 «값» 이 아니라 «자» 다 ────────────────────────────────
 * 887 은 **아래** 끝점에서 «금테 띠 «안» 을 가리키는 규약은 두 그림에서 서로 다른 양을
 * 훔친다» 를 걷어냈는데, **위** 끝점은 옛 자 그대로 두었다. 905 가 가른 결론은 셋이다:
 *
 *   ① 옛 자(U1 = «잉크 위 창에서 가장 긴 밝은 가로줄»)의 «문턱 90/110/140 불변» 은
 *      **위 끝점에 대해서는 공문**이다 — 그 문턱은 `find_ink` 것이고 `find_base_u1` 은
 *      받지도 않는다. 자기 손잡이(옆 여백 띠 대비 +d)를 흔들면 레퍼런스가 갈린다.
 *   ② U1 은 두 그림에서 밑판 검은 외곽선의 **반대편**을 짚는다 —
 *      우리 캡처 **−2px**(외곽선 위) ↔ 레퍼런스 **+2px**(외곽선 아래). **부호가 뒤집힌다.**
 *      기계는 레퍼런스의 좌우 여백 띠가 아래로 갈수록 어두워지는 것이다(y624 37 → y638 11) —
 *      «옆보다 밝다» 가 외곽선 **아래 그림자 구간**에서 이긴다.
 *   ③ 그래서 위 끝점도 아래와 **같은 걷개**(«그 물체의 마지막/첫 «칠해진» 행» · 절대 어둠 <12)
 *      로 재고, 그 자로 재면 레퍼런스는 **위 12 : 아래 9 ref px = 0.750** 이다(옛 0.90 은
 *      위를 2 ref px 짧게 본 값이고, 옛 1.00 은 거기에 아래의 «띠 안» 까지 겹친 값이다).
 *
 * ⚠ 이 자는 Pillow(python)를 쓴다 — 없으면 «환경» 이라고 밝히고 **건너뛴다**(641 교훈).
 *   브라우저는 pwlaunch 가 고른다. 상세 `docs/review/905-안내문위끝점자.md`.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { py: py937 } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'shots');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const BASE = 2280;
const TH = 110;

/* 905 가 확정한 과녁과 대역 — 레퍼런스는 위 12 : 아래 9 ref px 이고 한 눈금이 프레임 2.222px 다.
   ±1 눈금이 (9±1)/12 = 0.667~0.833 · 9/(12±1) = 0.692~0.818 ⇒ 0.67~0.83(±11%). */
const REF_RATIO = 0.750;
const BAND = [0.67, 0.83];
/* 되돌림 대상 — 이 회차가 옮긴 **한 자리**(10회차 어파인의 목표비 .9 → .75) */
const NEW = 'var(--rw-g3)) * .4286 + 1.21px * var(--rwc,1)));';
const OLD = 'var(--rw-g3)) * .4737 + 2.57px * var(--rwc,1)));';

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};

const py = (args) => py937([path.join(__dirname, 'scan887.py'), ...args],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const json = (out) => JSON.parse(out.slice(out.indexOf('{')));

async function shoot(browser, file, fh, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(650);
  await page.evaluate(`try{ openRelw() }catch(e){}`);
  await page.waitForTimeout(460);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  const el = await page.$('#app');
  await (el || page).screenshot({ path: file });
  await ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const shots = [];
  for (const fh of FRAMES) {
    const f = path.join(OUT, `905-${fh}.png`);
    await shoot(browser, f, fh, URL);
    shots.push(f);
  }
  await browser.close();

  let s, sw;
  try {
    s = json(py(['--json', ...shots]));
    sw = json(py(['--sweep', '--json', ...shots]));
  } catch (e) {
    console.error('VERIFY905 SKIP — Pillow(python) 없음이거나 자가 죽었다: ' + (e.message || e).split('\n')[0]);
    console.error('  준비: pip install pillow   (641 — 저장소 결함이 아니라 컨테이너 의존이다)');
    process.exit(3);
  }
  const ref = s.ref, caps = s.caps;
  const rw = sw.ref, cw = sw.caps;

  /* ── [1] 옛 자 U1 은 **자기 손잡이**에서 흔들린다 ── */
  {
    const vals = Object.entries(rw.u1).map(([d, y]) => `${d}:${y === null ? '없음' : y}`);
    ok(rw.u1_span >= 3,
      '[1] 옛 자 U1 은 **자기 손잡이**(옆 여백 띠 대비 +d)에서 흔들린다 — 레퍼런스가 여러 자리로 갈린다',
      `d 4~30 → ${rw.u1_span} 가지 · ${vals.join(' ')}`);
  }

  /* ── [2] 887 이 흔든 문턱은 **위 끝점을 못 가른다** — 그 축에서는 두 자가 둘 다 불변 ── */
  {
    const u1s = new Set(Object.values(rw.ink_axis).map(v => v.u1));
    const u3s = new Set(Object.values(rw.ink_axis).map(v => v.u3));
    ok(u1s.size === 1 && u3s.size === 1,
      '[2] 887 이 흔든 **잉크 문턱 90/110/140** 은 위 끝점을 못 가른다 — 그 축에서는 U1·U3 이 **둘 다** 불변이다(그 시험이 U1 을 «견고» 로 읽은 이유)',
      `ref U1 ${[...u1s].join('/')} · U3 ${[...u3s].join('/')} — 이 축은 find_ink 것이고 find_base_u1 은 받지도 않는다`);
  }

  /* ── [3] 새 자 U3 은 자기 손잡이에서 **두 그림 다** 한 자리 ── */
  {
    const spans = [rw, ...cw].map(r => r.u3_core_span);
    ok(spans.every(v => v === 1),
      '[3] 새 자 U3 은 **자기 손잡이**(어둠 문턱 8~12 × 폭 0.5~8% · 15조합)에서 두 그림 다 한 자리도 안 움직인다',
      `ref y${rw.u3_row}(${rw.u3_core_span}가지) · ` + cw.map(r =>
        path.basename(r.path).replace(/^905-|\.png$/g, '') + `:y${r.u3_row}(${r.u3_core_span})`).join(' · '));
  }

  /* ── [4] ⚑ 부호 뒤집힘 — U1 이 두 그림에서 **다른 물체**를 가리킨다 ── */
  {
    const dRef = ref.th[TH].base_u1 - ref.th[TH].base;
    const dCap = caps.map(c => c.th[TH].base_u1 - c.th[TH].base);
    ok(dRef > 0 && dCap.every(v => v < 0),
      '[4] ⚑ 옛 자 U1 은 두 그림에서 밑판 외곽선의 **반대편**을 짚는다 — 부호가 뒤집히면 같은 물체가 아니다',
      `U1 − U3: ref ${dRef > 0 ? '+' : ''}${dRef}(외곽선 아래) · 캡처 ` +
      caps.map((c, i) => path.basename(c.path).replace(/^905-|\.png$/g, '') + ':' + dCap[i]).join(' · ') +
      ' (외곽선 위)');
  }

  /* ── [5] U3 은 두 그림에서 **같은 것**을 가리킨다 — 칠해진 행 + 그 아래로 여백이 이어진다 ── */
  {
    const all = [rw, ...cw];
    const bad = all.filter(r => !r.u3_painted || r.u3_below_clear < 5);
    ok(!bad.length,
      '[5] U3 행은 두 그림 다 **칠해진 행**이고 그 **바로 아래**부터 여백이 이어진다 — 아래 끝점(«아래 물체의 첫 칠해진 행»)과 같은 뜻의 자다',
      all.map(r => path.basename(r.path).replace(/^905-|\.png$/g, '').replace('89-유물-팝업', 'ref') +
        `:칠해짐 ${r.u3_painted ? 'O' : 'X'}/아래 여백 ${r.u3_below_clear}행`).join(' · '));
  }

  /* ── [6] 확정값 — 레퍼런스는 **0.750** 이다 ── */
  {
    const v = ref.th[TH].ratio.B3, old = ref.th[TH].ratio_u1.B1, old887 = ref.th[TH].ratio_u1.B3;
    ok(Math.abs(v - REF_RATIO) < 0.005 && Math.abs(old - 1.00) < 0.005 && Math.abs(old887 - 0.90) < 0.005,
      '[6] 레퍼런스 확정값 = **0.750**(위 12 : 아래 9 ref px) · 같은 그림에서 887 의 자는 0.90 · 옛 규약 한 벌은 1.00',
      `905 ${v.toFixed(3)} · 887(U1 + 조립체) ${old887.toFixed(3)} · 옛 한 벌(U1 + 띠 «안») ${old.toFixed(3)}` +
      ` · 위 ${ref.th[TH].up}(U1 로는 ${ref.th[TH].up_u1}) : 아래 ${ref.th[TH].down.B3} ref px`);
  }

  /* ── [7] 제품 — 다섯 프레임이 과녁 대역 안 ── */
  {
    const vals = caps.map(c => c.th[TH].ratio.B3);
    ok(vals.every(v => v >= BAND[0] && v <= BAND[1]),
      `[7] 제품의 **화소** 아래/위 비가 과녁 ${REF_RATIO}(대역 ${BAND[0]}~${BAND[1]}) 안 — 다섯 프레임`,
      caps.map((c, i) => path.basename(c.path).replace(/^905-|\.png$/g, '') + ':' + vals[i].toFixed(3)).join(' · '));
  }

  /* ── [R] 되돌림 — **905 이전(10회차 어파인)으로 되돌린 사본**에 두 자를 다 대 본다 ──
     905 가 한 일이 «대역을 옮겨 통과시킨 것» 이 아님을 이 항이 못박는다:
       · 옛 자(U1)로 재면 ref 0.900 ↔ 옛 제품 0.913 = **1.4% 차 = «결함 아님»**
       · 새 자(U3)로 재면 ref 0.750 ↔ 옛 제품 1.000 = **33% 차 = 결함**
     같은 그림·같은 제품인데 답이 갈린다 ⇒ 갈린 것은 제품이 아니라 **자**였다.
     ⚠ 사본은 저장소 루트에 둔다 — /tmp 에 두면 assets/** 가 통째로 404 라 «찍힌 픽셀» 이
       달라진다(360·367·438·439·453 선례). */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    let rOld = null, rNew = null, note = '';
    if (!src.includes(NEW)) {
      note = `되돌림 대상 문자열을 못 찾았다(${NEW})`;
    } else {
      const neg = path.join(ROOT, `.v905-neg-${process.pid}.html`);
      fs.writeFileSync(neg, src.replace(NEW, OLD));
      const b2 = await launch(chromium);
      const shot = path.join(OUT, '905-neg.png');
      await shoot(b2, shot, BASE, 'file://' + neg.replace(/\\/g, '/'));
      await b2.close();
      fs.unlinkSync(neg);
      const negScan = json(py(['--json', shot])).caps[0];
      rOld = negScan.th[TH].ratio_u1.B3;      /* 887 의 자(U1 위 + 조립체 아래) */
      rNew = negScan.th[TH].ratio.B3;         /* 905 의 자 */
    }
    const refOld = ref.th[TH].ratio_u1.B3, refNew = ref.th[TH].ratio.B3;
    const dOld = rOld == null ? null : Math.abs(rOld - refOld) / refOld * 100;
    const dNew = rNew == null ? null : Math.abs(rNew - refNew) / refNew * 100;
    ok(rOld != null && dOld < 5 && dNew > 20,
      '[R] **905 이전(10회차 어파인)으로 되돌린 사본** — 옛 자로는 ref 와 2% 안(결함 안 보임) · 새 자로는 33% 차(결함)',
      note || `옛 자(U1) ref ${refOld.toFixed(3)} ↔ 옛 제품 ${rOld.toFixed(3)} (차 ${dOld.toFixed(1)}%) · ` +
      `새 자(U3) ref ${refNew.toFixed(3)} ↔ 옛 제품 ${rNew.toFixed(3)} (차 ${dNew.toFixed(1)}%)`);
  }

  console.log(`\nVERIFY905 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
