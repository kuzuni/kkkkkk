#!/usr/bin/env node
/* 작업 893 — 89 유물 소환 «계단(`.rw-steps`) 약속» 게이트.
 *
 *   node tools/verify893.js
 *
 * ── 등재문의 가설은 재현으로 기각됐다(338 규칙) ──────────────────────────────
 * 893 은 «13회차 예산식이 못박은 «계단 최소 1단 84» 가 조용히 사라졌다» 로 등재됐고,
 * 등재문 스스로 판정 기준을 적어 뒀다 — **«내린 이유가 있으면 주석이 틀린 것이고,
 * 없으면 약속이 조용히 사라진 것»**. `git log -S` 가 답했다:
 *
 *   · 219(13회차) → **231**(14회차 — 금테 내측 8→20) → **174**(16회차 — 계단 1단 84 를 빼고 바닥 27)
 *   · 174 를 넣은 커밋은 `226b32de wip(120): 16회차` 이고, 그 자리에 **비평가 둘(AJ·AK)이 각자
 *     «1600 은 계단을 지우고 바닥만» 을 처방**했다(11회차 AC 의 «찌그러진 단을 만드느니 안 그린다»).
 *   · 18회차 [M] 이 그 결정을 식으로 굳혔고(구간 = 84 의 정수배), `verify120` ③ 은 그때
 *     **«계단 억제(구간 0)» 분기**를 정식으로 받아들였다.
 *
 * ⇒ 코드는 옳다. 사라진 것은 «계단 84» 가 아니라 **그 결정을 지키는 자**다:
 *   `verify120` ③ 의 억제 분기는 `steps.h < 0.6` 이면 **묻지도 않고 통과**한다 —
 *   억제가 «재원이 없어서» 인지 «누가 계단을 죽여서» 인지 구분하지 않는다.
 *   다섯 프레임 전부에서 계단이 사라져도 `verify120` 은 초록이다([R1] 이 그것을 찍는다).
 *
 * ── 이 자가 지키는 약속 넷 ───────────────────────────────────────────────────
 *   [1] 계단 구간은 **피치(84c)의 정수배**다 — N = floor(R / 84c), R = sh − gd − 14c
 *   [2] **억제(0단)는 재원이 없을 때만 정당하다** — R ≥ 84c 인데 0단이면 빨강 (★ 120 이 못 보던 자리)
 *   [3] 1600 의 «아래 예약» 80c(받침 40 + 접합선 띠 13 + 바닥 27)가 실측으로 지켜진다
 *   [4] 1600 에서도 **받침·접합선은 살아 있다** — 채점자 EE 의 «수반 뒤 장식이 통째로
 *       사라진다» 는 정정된다(사라진 것은 계단뿐이고 받침·접합선·바닥은 그 자리에 있다)
 *
 * ── 되돌림 시험 둘 ───────────────────────────────────────────────────────────
 *   [R1] 계단을 다섯 프레임 전부에서 죽인 사본 → 이 자의 [2]·[3] 은 빨갛고
 *        **`verify120` ③ 의 술어는 초록**이다(이 자가 왜 있어야 하는지의 증명).
 *   [R2] 예약 174 → 258 로 1600 에 계단 1단을 되살린 사본 → **격자↔바 여유 < 8**
 *        (`probe813` [C]) 과 **아치 종횡비 < 1:1.25**(`verify120` ②)가 **둘 다** 깨진다.
 *        «재원이 니치 제로섬(879 §17)에 걸려 813 이 못 낸다» 는 813 §49 의 산문이
 *        여기서 기계가 검산하는 사실이 된다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];

/* 18회차 [M] 이 못박은 상수 — 단 면 높이(피치)와 접합선 띠. 둘 다 `--rwc` 로 스케일된다. */
const PITCH = 84;
const BAND = 14;          /* 계단 상단 = 접합선 + 14 (접합선 띠 4 + 그림자 9 를 안 덮는다) */
const PED = 40;           /* 받침 밑동 오프셋 `--rw-gd` 의 기본값 */
const RESERVE = 80;       /* 16회차 «아래 예약» = 받침 40 + 띠 13 + 바닥 27 (174 = 94 + 80) */
const GAP_MIN = 8;        /* 격자 하변 ↔ 배수 바 상변 (probe813 [C] · 867 이후) */
const ARCH_MIN = 1.25;    /* 아치 종횡비 하한 (verify120 ②) */

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};

/* 되돌림 사본은 **파일을 안 고친다** — 같은 우선순위 사슬 위에 얹는 덮어쓰기 한 장이다
   (`#relw .rw-panel` 은 `.rw-panel` 보다 특이성이 높아 선언만 갈아 끼운다). */
const OVERRIDE = {
  /* [R1] 계단을 통째로 죽인다 — 구간 0(= `--rw-gs` 가 `--rw-sh` 전체를 먹는다) */
  kill: '#relw .rw-panel{--rw-gs:var(--rw-sh)}',
  /* [R2] 아래 예약 174 → 258(= 94 + 80 + 계단 1단 84). 나머지 두 인자는 원식 그대로다. */
  step: '#relw .rw-panel{--rw-av:min(calc(186px * var(--rwc,1)),' +
        'calc((var(--rw-tt) - 258px * var(--rwc,1)) / 2),' +
        'calc(var(--rw-tt) - 285px * var(--rwc,1)))}',
};

const MEASURE = () => {
  const relw = document.getElementById('relw');
  const q = (s) => document.querySelector(s);
  const app = document.getElementById('app');
  const sc = app ? app.getBoundingClientRect().width / 1080 : 1;
  const bowl = q('#relw .rw-bowl') || q('#relw .rw-panel');
  if (!bowl) return { missing: true };
  const pr = bowl.getBoundingClientRect();
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const box = (s) => {
    const e = q(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { t: r3((r.top - pr.top) / sc), b: r3((r.bottom - pr.top) / sc), h: r3(r.height / sc), rt: r.top, rb: r.bottom };
  };
  /* 커스텀 속성은 미등록이라 `getPropertyValue` 가 **토큰 문자열**을 준다(`calc(100% − …)`).
     그릇 직속에 탐침을 넣어 **길이로 해석시켜** 값을 꺼낸다 — 식을 옮겨 적지 않으므로
     제품의 식이 바뀌어도 이 자가 안 늙는다(probe813 이 av 를 되재는 것과 같은 이유). */
  const probe = (expr) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;width:1px;top:0;visibility:hidden;height:' + expr;
    bowl.appendChild(d);
    const h = d.getBoundingClientRect().height / sc;
    d.remove();
    return r3(h);
  };
  const steps = box('#relw .rw-steps');
  /* 보이는 단 — `.rw-st` 의 rect 는 **잘리기 전** 높이(항상 84)라 그대로 세면 안 된다
     (15회차 «자를 결과에 댄다»). `.rw-steps` 상자와의 교집합 높이로 센다. */
  let visN = 0, visH = [];
  if (steps) {
    for (const e of document.querySelectorAll('#relw .rw-steps>.rw-st')) {
      const r = e.getBoundingClientRect();
      const h = (Math.min(r.bottom, steps.rb) - Math.max(r.top, steps.rt)) / sc;
      if (h > 0.5) { visN++; visH.push(r3(h)); }
    }
  }
  const pedCS = getComputedStyle(q('#relw .rw-floor'), '::before');
  const archCS = getComputedStyle(q('#relw .rw-bg'), '::after');
  return {
    sc: r3(sc),
    rwc: parseFloat(getComputedStyle(relw).getPropertyValue('--rwc')) || 1,
    sh: probe('var(--rw-sh)'), gd: probe('var(--rw-gd)'), gs: probe('var(--rw-gs)'),
    av: probe('var(--rw-av)'), tt: probe('var(--rw-tt)'),
    pitch: probe('calc(84px * var(--rwc,1))'),
    band: probe('calc(14px * var(--rwc,1))'),
    c40: probe('calc(40px * var(--rwc,1))'),
    c80: probe('calc(80px * var(--rwc,1))'),
    steps, visN, visH,
    floor: box('#relw .rw-floor'), mid: box('#relw .rw-mid'),
    grid: box('#rwGrid'), mul: box('#rwMulBar'),
    /* 받침(`.rw-floor::before`)은 바닥선보다 `--rw-ped` 만큼 **위**다(886). */
    pedTop: r3(parseFloat(pedCS.top) / sc), pedH: r3(parseFloat(pedCS.height) / sc),
    archW: r3(parseFloat(archCS.width) / sc), archH: r3(parseFloat(archCS.height) / sc),
  };
};

async function shoot(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(650);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { try { openRelw(); } catch (e) { return String(e); } });
  await page.waitForTimeout(300);
  const m = await page.evaluate(MEASURE);
  m.err = errs[0] || null;
  await ctx.close();
  return m;
}

/* 제품의 식과 **같은 산수**로 «재원» 을 푼다 — 이 자가 예측하고 실측이 답한다.
   R = 계단 구간 후보 = sh − gd − 14c · N = floor(R / 84c) */
const budget = (m) => {
  const R = m.sh - m.gd - m.band;
  const N = Math.max(0, Math.floor((R + 0.001) / m.pitch));
  return { R, N, want: N * m.pitch, rest: R - N * m.pitch };
};

(async () => {
  const browser = await launch(chromium);
  const base = {};
  for (const H of FRAMES) base[H] = await shoot(browser, H, null);

  console.log('VERIFY893 — 89 유물 소환 계단 약속 (등재문 «계단 최소 1단 84» 는 16·18회차가 폐기했다)\n');
  console.log('프레임      rwc      sh      gd       R   피치    N(예측)  계단높이  보이는단   잔여바닥');
  for (const H of FRAMES) {
    const m = base[H], b = budget(m);
    console.log(String(H).padStart(6) + [m.rwc, m.sh, m.gd, b.R, m.pitch, b.N, m.steps.h, m.visN, b.rest]
      .map((v) => String(Math.round(v * 100) / 100).padStart(9)).join(''));
  }
  console.log('');

  for (const H of FRAMES) {
    const m = base[H], b = budget(m);
    ok(m.err == null, `[${H}] 콘솔 오류 0건`, m.err || '없음');

    /* [1] 18회차 [M] — 구간은 피치의 정수배다. 잔여(민 바닥)는 한 단 미만으로만 남는다. */
    ok(Math.abs(m.steps.h - b.want) < 1.0 && b.rest > -1.0 && b.rest < m.pitch,
      `[${H}] [1] 계단 구간 = 피치 × 정수 (18회차 [M] · 찌그러진 단 0)`,
      `구간 ${m.steps.h.toFixed(1)} = ${m.pitch.toFixed(1)} × ${b.N} · 재원 R ${b.R.toFixed(1)} · 잔여 바닥 ${b.rest.toFixed(1)}`);

    /* [2] ★ 이 자의 본체 — 억제는 «재원이 없을 때만» 정당하다.
       `verify120` ③ 은 `steps.h < 0.6` 이면 이유를 안 묻고 통과한다([R1]). */
    ok(m.visN === b.N && (b.N > 0 || b.R < m.pitch),
      `[${H}] [2] 보이는 단 = 재원이 허락하는 수 (억제는 R < 피치일 때만 정당)`,
      `보이는 단 ${m.visN} · 예측 ${b.N} · R ${b.R.toFixed(1)} ${b.R < m.pitch ? '<' : '≥'} 피치 ${m.pitch.toFixed(1)}` +
      (b.N === 0 ? ' ⇒ 억제 정당' : ''));

    /* [4] 받침·접합선은 프레임과 무관하게 살아 있다 — 1600 도 예외가 아니다.
       (EE 의 «수반 뒤 장식이 통째로 사라진다» 를 여기서 정정한다.) */
    const pedT = m.floor.t + m.pedTop;                 /* 받침 상변 = 바닥선 − ped */
    const jointT = m.floor.t + m.gd;                   /* 접합선(밑동) 시작 */
    const jointB = jointT + m.band;                    /* 접합선 띠 아래 */
    ok(m.pedH > 20 && pedT < jointT && jointB <= m.mid.t + 0.6 && m.mid.t - jointB > -0.6,
      `[${H}] [4] 받침·접합선이 살아 있다 (받침 ${m.pedH.toFixed(1)}px · 띠가 수반을 안 넘는다)`,
      `받침 ${pedT.toFixed(1)}..${(pedT + m.pedH).toFixed(1)} · 접합선 ${jointT.toFixed(1)}..${jointB.toFixed(1)} · 수반 ${m.mid.t.toFixed(1)} (바닥 ${(m.mid.t - jointB).toFixed(1)})`);
  }

  /* [3] 1600 의 «아래 예약» — 16회차가 174(=94+80)로 확정한 그 80 이 실측으로 서 있는가.
     이 프레임에서만 `(tt − 174c)/2` 인자가 이기므로 sh 가 예약과 **정확히** 같아야 한다. */
  {
    const m = base[1600], b = budget(m);
    ok(Math.abs(m.sh - m.c80) < 1.5,
      `[1600] [3] 아래 예약 80c = 받침 40 + 띠 13 + 바닥 27 이 실측으로 선다 (16회차 174 = 94 + 80)`,
      `sh ${m.sh.toFixed(2)} vs 80c ${m.c80.toFixed(2)} · av ${m.av.toFixed(2)} (= (tt ${m.tt.toFixed(1)} − 174c) / 2)`);
    ok(Math.abs(m.gd - m.c40) < 0.6 && b.rest >= 20 * m.rwc - 0.6,
      `[1600] [3] 그 예약의 내역 — 받침 40c · 띠 14c · 남는 바닥 ≥ 20c`,
      `받침 ${m.gd.toFixed(1)} · 띠 ${m.band.toFixed(1)} · 바닥 ${b.rest.toFixed(1)}`);
  }

  /* ── [R1] 계단을 통째로 죽인 사본 ─────────────────────────────────────────
     이 자의 [2] 는 빨개져야 하고, `verify120` ③ 의 억제 술어는 **초록이어야 한다**.
     둘이 같이 나와야 «120 이 못 보던 자리» 라는 이 작업의 주장이 증명된다. */
  {
    const k = await shoot(browser, 2280, OVERRIDE.kill);
    const b = budget(k);
    const mine = k.visN === b.N && (b.N > 0 || b.R < k.pitch);
    const v120 = Math.abs(k.steps.h) < 0.6 && Math.abs(k.steps.b - k.mid.t) < 1.0;   /* verify120 ③ 억제 분기의 술어 */
    ok(!mine && v120,
      `[R1] 계단을 죽인 사본(2280) — 이 자 [2] 는 빨갛고 \`verify120\` ③ 억제 술어는 초록이다`,
      `계단 ${k.steps.h.toFixed(1)} · 보이는 단 ${k.visN} · 재원 R ${b.R.toFixed(1)} (≥ 피치 ${k.pitch.toFixed(1)} 이므로 ${b.N}단이어야 한다) · ` +
      `이 자 ${mine ? '초록' : '빨강'} · 120 술어 ${v120 ? '초록' : '빨강'}`);
  }

  /* ── [R2] 1600 에 계단 1단을 되살린 사본(예약 174 → 258) ───────────────────
     계단은 실제로 돌아온다. 대가로 **두 게이트가 동시에** 깨진다 —
     813 §49 의 «재원이 없다» 가 산문이 아니라 실측이라는 증명이다. */
  {
    const s = await shoot(browser, 1600, OVERRIDE.step);
    const b = budget(s);
    const gap = s.mul.t - s.grid.b;                    /* 격자 하변 ↔ 배수 바 상변 (probe813 [C]) */
    const ratio = s.archH / s.archW;                   /* 아치 종횡비 (verify120 ②) */
    const b0 = budget(base[1600]);
    const gap0 = base[1600].mul.t - base[1600].grid.b;
    const ratio0 = base[1600].archH / base[1600].archW;
    ok(b.N >= 1 && gap < GAP_MIN && ratio < ARCH_MIN,
      `[R2] 1600 에 계단 1단을 되살리면 — 격자↔바 여유와 아치 종횡비가 **둘 다** 깨진다 (재원 없음의 증명)`,
      `단 ${b0.N} → ${b.N} · 격자↔바 ${gap0.toFixed(1)} → ${gap.toFixed(1)} (하한 ${GAP_MIN}) · ` +
      `아치 1:${ratio0.toFixed(3)} → 1:${ratio.toFixed(3)} (하한 1:${ARCH_MIN}) · av ${base[1600].av.toFixed(1)} → ${s.av.toFixed(1)}`);
    ok(gap0 >= GAP_MIN && ratio0 >= ARCH_MIN - 0.005,
      `[R2] 현행은 그 둘을 둘 다 지킨다 (되돌림 시험의 짝 항)`,
      `격자↔바 ${gap0.toFixed(1)} ≥ ${GAP_MIN} · 아치 1:${ratio0.toFixed(3)} ≥ 1:${ARCH_MIN}`);
  }

  /* ── [5] 문서 정합 — 코드가 이긴 결정을 주석이 반대로 말하고 있으면 다음 워커가 또 판다.
     893 이 통째로 그렇게 시작했다(등재문 «문서와 코드가 45px 갈라져 있다»). */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const stale = (src.match(/위쪽부터 자른다/g) || []).length;
    ok(stale === 0,
      `[5] 옛 주석 «짧은 프레임은 위쪽부터 자른다» 0건 — 18회차 [M] 이후 구간은 정수배라 잘리는 단이 없다`,
      `${stale}건`);
    const chain = /219[\s\S]{0,400}231[\s\S]{0,400}174/.test(src) && src.includes('893');
    ok(chain,
      `[5] 예산식 주석이 하한 사슬(219 → 231 → 174)을 밝힌다 · 893 표식 있음`,
      chain ? '있음' : '없음 — 13회차 예산식만 읽은 워커가 «약속이 사라졌다» 로 다시 판다');
  }

  await browser.close();
  console.log(`\nVERIFY893 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
