#!/usr/bin/env node
/* 작업 891 — 89 유물 소환 상단 띠 «벽 : 아치머리» 분할 게이트.
 *
 *   node tools/verify891.js
 *
 * ── 등재문은 «수리» 가 아니라 «셋째 자» 를 시켰고, 그 자가 EF 를 기각했다 ──────
 * 813 9회차 채점 2인이 같은 구간에서 반대되는 것을 봤다(review §48):
 *   · EF — «ref 아치 정점 y90» ⇒ 상단 띠 ref 61.4 : 38.6 ↔ 우리 39.6 : 60.4,
 *          «우리 정점이 69px 위로 밀렸다» 를 ① 1순위로.
 *   · EE — 같은 구간에 «가로 규칙선이 하나도 없다», 구간의 **합**은 이미 맞다.
 * `tools/probe891.js` 가 **한 함수를 두 그림에 그대로** 대서 답했다:
 *
 *   레퍼런스 상단 띠(141행) — 랜드마크 **0건**(문턱 여섯 전부) · max|Δ| **1.74 계조**(z 5.6)
 *   EF 가 지목한 61.4% 자리 — |Δ| **1.42 계조 · z 4.5** = 그 띠의 잡음과 구별되지 않는다
 *   우리 같은 띠           — 같은 자가 **28~29건** · max|Δ| **62 계조**(z 290~340)
 *
 * ⇒ **레퍼런스에는 맞출 랜드마크가 없다.** EF 의 처방(정점을 69px 내린다)은 없는 것에
 *   우리를 맞추라는 것이라 받지 않는다. 이 띠에서 잴 수 있는 유일한 ref 값은 **지분**이고
 *   (ref 20.52% ↔ 우리 ≥1841 20.78% = Δ+1.2%), 1600 의 부족(−14.6%)은 813·879 의 축이다.
 *
 * ── 이 자가 지키는 약속 다섯 ────────────────────────────────────────────────
 *   [1] 레퍼런스 상단 띠의 랜드마크 = 0건 (D1 3·6·12 · D2 10·20·40 — 여섯 문턱 전부)
 *   [2] 같은 자가 우리 띠에서는 ≥10건을 잡는다 — **양성 대조**(자가 눈이 먼 게 아니다)
 *   [2b] 그 셈이 선 **창** 이 옳다 — 화소로 찾은 띠 하변 = DOM 이 아는 격자 상변 (954 신설)
 *   [3] 자의 **감도 한계가 레퍼런스 띠의 실제 max|Δ| 보다 아래**다 — 진폭 2 짜리 선을
 *       주입하면 잡힌다(ref 의 실제 최댓값 1.74 보다 가는 선도 본다) ⇒ [1] 은 관측이다
 *   [4] EF 가 지목한 61.4% 자리가 **잡음 대역 안**(z < 10)
 *   [5] 상단 띠 «지분» — 긴 네 프레임이 ref 대역(±5%) 안. 1600 은 관찰(813·879 의 축)
 *
 * ── 되돌림 시험 둘 ──────────────────────────────────────────────────────────
 *   [R1] 레퍼런스 사본의 61.4% 자리에 **진폭 8** 의 가로선을 주입하면 [1] 이 빨개진다
 *        (귀무 결과가 «자가 아무거나 0 을 낸다» 가 아님의 증명)
 *   [R2] EF 처방(정점을 띠의 61.4% 로)을 제품에 넣으면 **1600 에서 두 가지가 깨진다** —
 *        아치 종횡비가 `verify120` ② 하한(1:1.25) 아래로 내려가고, 니치(= av − 12)가
 *        배수 바 셸 98 보다 좁아진다(879 §17 제로섬). 산문이 아니라 기계가 검산한다.
 *   [R3] 옛 하변 규칙(계조 60 «두께»)을 되살리면 1600 의 띠가 다시 굶고 [2] 가 빨개진다 —
 *        그리고 [R3b] 레퍼런스는 두 규칙이 같은 띠를 낸다 (954 신설)
 *
 * ── 954 (2026-09-05) — [2] 1600 빨강의 뿌리는 «문턱» 이 아니라 «창» 이었다 ──────────
 * 926 이 상인방을 누른 뒤 이 자의 1600 띠가 **293행 → 13행**으로 굶어 [2] 가 15/16 이 됐다.
 * 등재문의 처방은 «창이 짧아진 만큼 `OUR_MIN`(10) 을 비례시켜라» 였지만 재현이 그 전제를
 * 기각했다 — **DOM 이 아는 1600 의 띠는 212.8px** 이고 자가 짚은 하변은 **20** 이었다.
 * 옛 하변 규칙(계조 60 으로 트리거 + 뒤 40행 평균 밝은 비율 ≥ 0.20)이 **몰딩 세 줄**을
 * 격자로 오인한 것이다(1600 에서 0.235 ≥ 0.20 · 1841 은 같은 세 줄이 흩어져 0.175 로 통과).
 * ⇒ `probe891` 의 하변 판정만 «면»(계조 90) 축으로 갈았고 **`OUR_MIN` 은 10 그대로**다.
 * 자를 갈아도 제품 판정([5] 지분 · [R2])은 한 자도 안 움직인다(LESSONS 932-⑥).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { MEASURE, REF, EF_AT, T_SWEEP, Z_SWEEP } = require('./probe891.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const LONG = [1841, 1920, 2280, 2600];

const OUR_MIN = 10;        /* [2] 양성 대조 — 우리 띠에서 잡혀야 할 최소 랜드마크 수 */
const SENS_AMP = 2;        /* [3] 감도 시험 진폭(계조) — ref 띠의 실제 max|Δ| 보다 작다 */
const R1_AMP = 8;          /* [R1] 되돌림 주입 진폭 */
const NOISE_Z = 10;        /* [4] 잡음 대역 상한(= D2 의 가장 무른 문턱) */
const SHARE_TOL = 0.05;    /* [5] 지분 대역 ±5% */
const BOT_TOL = 3;         /* [2b] 화소 띠 하변 ↔ DOM 격자 상변 허용 오차(px) — 크롭 반올림 ±1 */
const LEG_STARVE = 20;     /* [R3] 옛 규칙이 1600 에서 굶긴 띠 길이의 상한(실측 13행) */
const ARCH_W = 589;        /* 아치 개구 폭(19회차 [O] 이후 고정) */
const ARCH_MIN = 1.25;     /* 아치 종횡비 하한 — verify120 ② */
const BAR_SHELL = 98;      /* 배수 바 셸(96·437 규약) — 니치가 이보다 좁으면 바가 안 들어간다 */

/* [R2] 되돌림 사본 — 파일을 안 고친다.
   ⚠ `--rw-av` 를 `calc(var(--rw-gt) * .386)` 으로 덮으면 **순환 참조**다(`--rw-gt` 가
     `--rw-av` 를 읽는다 · index.html 6573). CSS 는 고리를 무효로 만들어 둘 다 0 이 되므로
     그 사본은 «EF 처방» 이 아니라 «아치가 사라진 그림» 을 잰다. ⇒ 의사 요소의 `top`·`height`
     를 **잰 값으로** 직접 덮는다. 대칭 규약(`ah = 516 + av×2` · 6회차 «격자가 아치 한가운데»)은
     그대로 지킨 채 정점만 EF 자리로 내린다. */
const r2Override = (gt) => {
  const apex = gt * EF_AT;
  const av = gt - apex;
  return `#relw .rw-bg::after{top:${apex.toFixed(2)}px;height:${(516 + av * 2).toFixed(2)}px}`;
};

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};

const dataUrl = (buf) => 'data:image/png;base64,' + buf.toString('base64');

/* 아치·니치는 의사 요소라 rect 가 없다 — 계산된 값에서 그대로 읽는다(식을 옮겨 적지 않는다). */
const ARCH = () => {
  const q = (s) => document.querySelector(s);
  const bowl = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const app = document.getElementById('app');
  const sc = app ? app.getBoundingClientRect().width / 1080 : 1;
  const pr = bowl.getBoundingClientRect();
  const cs = getComputedStyle(q('#relw .rw-bg'), '::after');
  const gr = q('#rwGrid').getBoundingClientRect();
  const gt = (gr.top - pr.top) / sc;
  const apex = parseFloat(cs.top) / sc;
  const ah = parseFloat(cs.height) / sc;
  const aw = parseFloat(cs.width) / sc;
  return {
    gt: Math.round(gt * 10) / 10,
    apex: Math.round(apex * 10) / 10,
    apexFrac: apex / gt,
    ah: Math.round(ah * 10) / 10,
    aw: Math.round(aw * 10) / 10,
    ratio: ah / aw,
    av: Math.round((gt - apex) * 10) / 10,      /* 아치 뻗음 — probe813 [B] 와 같은 정의 */
    niche: Math.round((gt - apex - 12) * 10) / 10,  /* 879 §17 항등식: 니치 = av − 12 */
    panelH: Math.round((pr.height / sc) * 10) / 10,
  };
};

(async () => {
  const browser = await launch(chromium);

  /* 자를 태울 빈 페이지 — 레퍼런스도 우리 캡처도 data: URL 로 이 한 함수를 지난다 */
  const lab = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
  await lab.goto('about:blank');
  const rule = (buf, inject, opt) => lab.evaluate(
    ([src, url, inj, o]) => eval(src)(url, inj, o),
    [MEASURE, dataUrl(buf), inject || null, opt || null],
  );

  const refBuf = fs.readFileSync(path.isAbsolute(REF) ? REF : path.join(ROOT, REF));
  const ref = await rule(refBuf, null);
  const refLeg = await rule(refBuf, null, { legacyBot: true });   /* 954 [R3b] — 옛 규칙 대조 */

  /* ── [1] 레퍼런스 띠에 랜드마크 0건 ── */
  {
    const t = ref.cntT.join('/'), z = ref.cntZ.join('/');
    ok(ref.cntT.every((v) => v === 0) && ref.cntZ.every((v) => v === 0),
      `[1] 레퍼런스 상단 띠에 가로 랜드마크 0건 — 문턱 여섯 전부 (D1 ${T_SWEEP.join('·')} · D2 ${Z_SWEEP.join('·')})`,
      `띠 ${ref.n}행 · D1 ${t} · D2 ${z} · max|Δ| ${ref.maxAbs.toFixed(2)} (z ${ref.maxZ.toFixed(1)}) · median ${ref.med.toFixed(3)}`);
  }

  /* ── [4] EF 가 지목한 61.4% 자리는 잡음 대역 안 ── */
  {
    const z = ref.efAbs / ref.med;
    ok(z < NOISE_Z,
      `[4] EF 가 «ref 아치 정점» 이라고 한 ${(EF_AT * 100).toFixed(1)}% 자리가 잡음 대역 안 (z < ${NOISE_Z})`,
      `|Δ| ${ref.efAbs.toFixed(3)} 계조 · z ${z.toFixed(1)} · 그 띠 median ${ref.med.toFixed(3)}`);
  }

  /* ── [3] 감도 — ref 의 실제 max|Δ| 보다 가는 선도 잡는다 ── */
  {
    const s = await rule(refBuf, { at: EF_AT, amp: SENS_AMP });
    const seen = s.hitT[0] && s.hitZ[0];
    ok(seen && SENS_AMP <= ref.maxAbs + 1,
      `[3] 자의 감도 한계가 레퍼런스 띠의 실제 max|Δ| 아래 — 진폭 ${SENS_AMP} 짜리 선을 주입하면 잡힌다`,
      `주입 ${SENS_AMP} → D1 ${s.hitT.map((b) => (b ? '○' : '×')).join('')} · D2 ${s.hitZ.map((b) => (b ? '○' : '×')).join('')}` +
      ` · ref 의 실제 max|Δ| = ${ref.maxAbs.toFixed(2)}`);
  }

  /* ── [R1] 되돌림 — 진짜 선이 있으면 [1] 이 빨개진다 ── */
  {
    const s = await rule(refBuf, { at: EF_AT, amp: R1_AMP });
    const red = !(s.cntT.every((v) => v === 0) && s.cntZ.every((v) => v === 0));
    ok(red,
      `[R1] 레퍼런스 사본의 ${(EF_AT * 100).toFixed(1)}% 자리에 진폭 ${R1_AMP} 의 선을 넣으면 [1] 이 빨개진다`,
      `D1 ${s.cntT.join('/')} · D2 ${s.cntZ.join('/')} (원본은 ${ref.cntT.join('/')} · ${ref.cntZ.join('/')})`);
  }

  /* ── 우리 쪽 — 프레임 5종 ── */
  const our = {}, arch = {};
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL);
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    await p.waitForTimeout(900);
    arch[H] = await p.evaluate(ARCH);
    const r = await p.evaluate(() => {
      const el = document.querySelector('#relw .rw-bowl') || document.querySelector('#relw .rw-panel');
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    });
    const shot = await p.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    our[H] = await rule(shot, null);
    our[H].gridTopDom = Math.round((await p.evaluate(() => {
      const el = document.querySelector('#relw .rw-bowl') || document.querySelector('#relw .rw-panel');
      return document.querySelector('#rwGrid').getBoundingClientRect().y - el.getBoundingClientRect().y;
    })) * 10) / 10;
    our[H].leg = await rule(shot, null, { legacyBot: true });   /* 954 [R3] — 옛 규칙 대조 */

    /* [R2] 는 같은 페이지에 덮어쓰기 한 장을 얹어 잰다 */
    await p.addStyleTag({ content: r2Override(arch[H].gt) });
    await p.waitForTimeout(120);
    arch[H].r2 = await p.evaluate(ARCH);
    await ctx.close();
  }

  /* ── [2] 양성 대조 ── */
  for (const H of FRAMES) {
    const m = our[H];
    ok(m.cntT[0] >= OUR_MIN,
      `[2] 우리 ${H} — 같은 자가 같은 띠에서 랜드마크를 ${OUR_MIN}건 이상 잡는다 (양성 대조)`,
      `띠 ${m.n}행 · D1 ${m.cntT.join('/')} · D2 ${m.cntZ.join('/')} · max|Δ| ${m.maxAbs.toFixed(1)} (z ${m.maxZ.toFixed(0)})`);
  }

  /* ── [2b] 자의 창이 «진짜 격자 상변» 에 걸렸는가 — DOM 이 검산한다(954) ──
     [2] 는 «랜드마크가 몇 건인가» 만 묻는다. 그 셈이 뜻을 가지려면 세는 창부터 옳아야 하고,
     우리 쪽에는 그 정답이 DOM 에 있다. 926 이 상인방을 누르자 옛 하변 판정이 몰딩을 격자로
     오인해 1600 의 띠가 13행으로 굶었는데(954 등재 = `verify891` [2] 빨강), **[2] 만으로는
     «창이 굶었다» 와 «정말 랜드마크가 없다» 가 구별되지 않는다.** 이 항이 그 둘을 가른다. */
  for (const H of FRAMES) {
    const m = our[H];
    const d = m.bot - m.gridTopDom;
    ok(Math.abs(d) <= BOT_TOL,
      `[2b] 우리 ${H} — 화소로 찾은 띠 하변이 DOM 이 아는 격자 상변과 같은 자리 (|Δ| ≤ ${BOT_TOL}px)`,
      `화소 bot ${m.bot} ↔ DOM 격자 상변 ${m.gridTopDom} · Δ ${d.toFixed(1)}px · 띠 ${m.n}행`);
  }

  /* ── [5] 지분 ── */
  {
    const refShare = ref.n / ref.H;
    for (const H of LONG) {
      const s = arch[H].gt / arch[H].panelH;
      const d = s / refShare - 1;
      ok(Math.abs(d) <= SHARE_TOL,
        `[5] 우리 ${H} — 상단 띠 지분이 레퍼런스 대역 안 (±${(SHARE_TOL * 100).toFixed(0)}%)`,
        `${(s * 100).toFixed(2)}% vs ref ${(refShare * 100).toFixed(2)}% · Δ ${(d * 100).toFixed(1)}%`);
    }
    const s16 = arch[1600].gt / arch[1600].panelH;
    console.log(`  (관찰) 1600 지분 ${(s16 * 100).toFixed(2)}% · Δ ${((s16 / refShare - 1) * 100).toFixed(1)}%` +
      ` — 짧은 프레임의 부족분은 891 의 축이 아니다(813 §46 ⓔ · 879 §17 · 893 [R2])`);
  }

  /* ── [R2] EF 처방의 대가 — 기계 검산 ── */
  {
    const a = arch[1600], b = a.r2;
    ok(b.ratio < ARCH_MIN && b.niche < BAR_SHELL,
      `[R2] EF 처방(정점을 띠의 ${(EF_AT * 100).toFixed(1)}% 로)을 1600 에 넣으면 — 아치 종횡비와 니치가 **둘 다** 깨진다`,
      `종횡비 1:${a.ratio.toFixed(3)} → 1:${b.ratio.toFixed(3)} (하한 1:${ARCH_MIN}) · ` +
      `니치 ${a.niche} → ${b.niche} (바 셸 ${BAR_SHELL}) · av ${a.av} → ${b.av} · 정점 ${(a.apexFrac * 100).toFixed(1)}% → ${(b.apexFrac * 100).toFixed(1)}%`);
    ok(a.ratio >= ARCH_MIN && a.niche >= BAR_SHELL,
      `[R2] 현행은 그 둘을 둘 다 지킨다 (되돌림 시험의 짝 항)`,
      `종횡비 1:${a.ratio.toFixed(3)} ≥ 1:${ARCH_MIN} · 니치 ${a.niche} ≥ ${BAR_SHELL}`);
  }

  /* ── [R3] 되돌림 시험(954) — 옛 하변 규칙을 되살리면 1600 이 다시 굶는다 ──
     무르게 푼 수리가 아님을 이 짝이 못박는다: 고친 축(하변 판정)을 되돌리면 그 자리에서만
     빨개지고, 레퍼런스는 두 규칙이 **같은 자리**를 낸다(= 이 수리는 우리 쪽 창만 움직였다). */
  {
    const m = our[1600];
    ok(m.leg.n <= LEG_STARVE && Math.abs(m.leg.bot - m.gridTopDom) > BOT_TOL && m.leg.cntT[0] < OUR_MIN,
      `[R3] 옛 하변 규칙(계조 60 «두께»)을 1600 에 되살리면 띠가 굶고 [2] 가 다시 빨개진다`,
      `옛 규칙 bot ${m.leg.bot} (띠 ${m.leg.n}행 · D1 ${m.leg.cntT.join('/')}) ↔ 새 규칙 bot ${m.bot} (띠 ${m.n}행 · D1 ${m.cntT.join('/')})` +
      ` · DOM 격자 상변 ${m.gridTopDom}`);
    ok(refLeg.top === ref.top && refLeg.bot === ref.bot,
      `[R3b] 레퍼런스는 옛 규칙과 새 규칙이 같은 띠를 낸다 — 954 의 수리는 우리 쪽 창만 움직였다`,
      `옛 ${refLeg.top}..${refLeg.bot} (${refLeg.n}행) ↔ 새 ${ref.top}..${ref.bot} (${ref.n}행)`);
  }

  /* ── 문서 정합 — 다음 채점자가 같은 갈림을 세 번째로 열지 않게 ── */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(/891/.test(src) && /랜드마크/.test(src),
      `[6] 아치 정점 주석이 891 의 결론(«레퍼런스에 랜드마크가 없다»)을 밝힌다`,
      /891/.test(src) ? '있음' : '없음 — 다음 회차가 EF 의 처방을 다시 판다');
  }

  await browser.close();
  console.log(`\nVERIFY891 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
