#!/usr/bin/env node
/* probe923 — 923 10회차 «셋째 자» : 띠 두께를 **어느 끝의 깊이로 적을 것인가** 를 되찾기 시험으로 정한다.
 *
 * ── 왜 필요한가 (9회차 채점 GX·GY 가 남긴 것) ────────────────────────────────
 * 남은 결함은 «입 근처(깊이 2~6)가 얇다» 하나뿐인데 그 크기가 자마다
 *   GX −2.89 · GY −0.41 · 저장소 자 **+0.58** 로 갈리고, GY 는 «기준점을 안쪽 점으로 바꾸면
 *   깊이 6 에서 부호가 뒤집힌다» 를 실측으로 냈다. 934 규약대로 **셋째 자가 기준을 정하기
 *   전에는 제품을 건드리면 안 된다** — 지금 표를 올리면 저장소 자 쪽에서는 과교정이다.
 *
 * ── 갈림의 뿌리는 정밀도가 아니라 «이름표» 다 ────────────────────────────────
 * 한 두께 표본은 두 점을 잇는다:
 *   · 바탕 쪽 끝 = 검정↔바탕 (`scan923.py` 의 `outer_x`) — 제품 코드에서는 **안쪽 곡선**
 *     (`inner` = 실루엣 · 최대 깊이 `din = d − 10`)
 *   · 림 쪽 끝  = 검정↔밝은 림 (`inner_x`) — 제품 코드에서는 **바깥 곡선**(`oc` · 최대 깊이 `d`)
 * 둘의 깊이는 띠 두께만큼(10~14 우리px) 다르다. 그래서 이름표를 바꾸면 표가 통째로
 * **한 칸 반** 밀린다(9회차가 `verify923` [B8] 주석에 남긴 실측: 선언 기하로 재면 봉우리가
 * u16~24 · 자로 재면 u10~16 — 그 둘은 서로 다른 자가 아니라 **서로 다른 이름표**였다).
 *
 * ── 되찾기 시험 (이 자가 하는 일) ───────────────────────────────────────────
 * ⚑ **우리 렌더는 «참값을 아는» 유일한 그림이다.** 제품의 손잡이 `NTC_BAND[k]` 는
 *   `ntcOffset()` 이 **안쪽(실루엣) 표본의 깊이 px** 로 원판 반지름을 읽는 표이고, 두 곡선의
 *   수직 거리가 곧 그 반지름이다(제품 주석). 즉 우리 카드의 «깊이 ↔ 띠 두께» 참값은
 *   `ntcT(NTC_BAND[k], px)` 로 **선언에 적혀 있다**.
 *   ⇒ 세 이름표(outer · inner · mid)로 같은 캡처를 재서 **그 선언표를 되찾는 것**이 옳은 자다.
 *   이것은 논증이 아니라 측정이다 — 참값이 알려진 그림에서 자를 검정하는 것이므로
 *   ref 를 한 화소도 안 본다(ref 는 참값을 모르는 그림이라 이 시험을 못 한다).
 *
 * ⚠ **배너(ban)는 판별력이 0 이다** — 선언표가 `[[0, 10]]`(어디서나 10)이라 상수 함수이고,
 *   상수는 **어떤 이름표로 다시 붙여도 상수**다. 판별은 표가 굽은 **불릿(bl)** 이 한다.
 *   배너는 그 자체가 대조군이다(셋 다 10 근처면 자가 편향 없이 두께를 재고 있다는 뜻).
 *
 * 종료 코드 — 0 통과 · 1 FAIL · 3 못 쟀다 (939 사전).
 * 쓰기: node tools/probe923.js [--keep]
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { py } = require('./pydep937');

const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const UATS = ['outer', 'inner', 'mid'];

let pass = 0, fail = 0;
const ok = (c, m) => { console.log(`  ${c ? 'ok ' : 'FAIL'} ${m}`); c ? pass++ : fail++; };
const blk = (t) => console.log(`\n${t}`);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });

  /* 참값 두 벌 — **제품 함수를 그대로 부른다**(사본 금지 · 402).
       ⓐ `tab`  = 선언표 `ntcT(NTC_BAND[k], u)` — «적어 둔» 두께
       ⓑ `drawn`= 안쪽 곡선의 깊이 u 점에서 **실제로 그려지는 바깥 폴리라인**까지의 최소 거리
     ⚑ 둘이 같다는 보장은 «두께가 천천히 변하는 한» 이다(제품 주석 · 실측 0.23). 표의 **머리**는
       3→6 에서 10→12.6 = 기울기 **0.87/px** 라 그 전제 밖이다 — 합집합의 바깥 경계가 얕은 쪽에서
       **더 깊은(= 더 큰) 원판에 먹혀** 선언보다 두꺼워진다. ⓑ 가 그것을 화소 없이 확인한다. */
  const truth = await page.evaluate(() => {
    const BINS = [[-2, 2], [2, 4], [4, 7], [7, 10], [10, 16], [16, 24], [24, 34]];
    const d2seg = (x, y, x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
      let s = L2 ? ((x - x1) * dx + (y - y1) * dy) / L2 : 0;
      s = Math.max(0, Math.min(1, s));
      return Math.hypot(x - (x1 + dx * s), y - (y1 + dy * s));
    };
    const out = { bins: BINS, tab: {}, drawn: {} };
    for (const k of ['ban', 'bl']) {
      const pf = NTC_PROF[k], len = NTC_LEN[k], d = NTC_DEP;
      const hin = (len - 20) / 2, din = d - 10, bt = NTC_BAND[k];
      const sm = ntcInnerSamples(pf, din, hin, NTC_OFF_N);
      const oc = ntcOffset(sm, bt, NTC_OFF_N);
      /* 안쪽 곡선 위를 촘촘히 걸으며 (깊이, 그려진 두께) 를 모은다 — 위·아래 대칭이라 한 가지만. */
      const pts = [];
      for (let i = 0; i <= 1200; i++) {
        const f = i / 1200, x = f * din, y = ntcV(pf, f) * hin;
        let b = 1e9;
        for (let j = 0; j < oc.length - 1; j++) b = Math.min(b, d2seg(x, y, oc[j][0], oc[j][1], oc[j + 1][0], oc[j + 1][1]));
        pts.push([x, b]);
      }
      const med = (vs) => { if (!vs.length) return null; vs.sort((p, q) => p - q); return +vs[vs.length >> 1].toFixed(3); };
      out.tab[k] = BINS.map(([a0, a1]) => {
        const vs = [];
        for (let u = Math.max(0, a0); u <= Math.min(din, a1); u += 0.05) vs.push(ntcT(bt, u));
        return med(vs);
      });
      out.drawn[k] = BINS.map(([a0, a1]) => med(pts.filter(([x]) => x >= a0 && x < a1).map(([, b]) => b)));
    }
    return out;
  });

  const boxes = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const r = c.getBoundingClientRect();
      return {
        id: c.dataset.pv, ban: c.classList.contains('ban1'),
        x: Math.round(r.left - A.left), y: Math.round(r.top - A.top),
        w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom - A.top)
      };
    });
  });
  const tmp = path.join(ROOT, `.p923-${process.pid}.png`);
  await page.locator('#app').screenshot({ path: tmp });
  const geo = path.join(ROOT, `.p923-${process.pid}.geo.json`);
  fs.writeFileSync(geo, JSON.stringify({
    cards: boxes.map((c) => ({ id: c.id, box: { x: c.x, y: c.y, w: c.w, h: c.h } }))
  }));
  await b.close();

  /* 세 이름표로 같은 캡처를 잰다 — 자는 하나(`scan923.py`)고 바뀌는 것은 `--uat` 뿐이다. */
  const read = {};
  try {
    for (const uat of UATS) {
      const raw = String(py(['tools/scan923.py', '--cap', tmp, '--geo', geo, '--band', '--json',
        '--uat', uat], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
      const line = raw.split('\n').find((l) => l.startsWith('@@JSON@@'));
      read[uat] = line ? JSON.parse(line.slice(8)) : null;
    }
  } finally {
    if (!process.argv.includes('--keep')) {
      for (const f of [tmp, geo]) { try { fs.unlinkSync(f); } catch (e) { /* 지워졌으면 됐다 */ } }
    }
  }
  if (UATS.some((u) => !read[u])) {
    console.error('probe923: 자가 캡처를 못 읽었다 — `python3 tools/scan923.py --cap … --band` 를 직접 돌려 보라');
    process.exit(3);
  }

  /* 카드별 «온전히 보이는» 노치만 본다(§B 와 같은 규약 — 배지에 가린 토막은 관측). */
  const pick = (res, ci) => {
    const rows = res[`card${ci + 1}`];
    if (!rows) return null;
    const cand = rows.filter((r) => r.D > 20 && r.band);
    return cand.length ? cand[cand.length - 1] : null;   /* 아래쪽 = 안 가려진 자리 */
  };

  const BINS = truth.bins;
  const lbl = BINS.map(([a, c]) => `u${a}~${c}`);
  const row = (vs) => vs.map((v) => (v == null ? '   n/a' : v.toFixed(2).padStart(6))).join(' ');
  /* 매끈한 구간 ↔ 입 구간 — 칸 색인으로. 매끈 = u≥7(3·4·5·6번 칸) · 입 = u<4(0·1번 칸) */
  const SMOOTH = [3, 4, 5, 6], MOUTH = [0, 1];
  const dev = (got, want, idx) => {
    const vs = idx.map((j) => (got[j] == null || want[j] == null ? null : Math.abs(got[j] - want[j])))
      .filter((v) => v != null);
    return vs.length ? Math.max(...vs) : null;
  };

  blk('§1 우리 캡처를 세 이름표로 재서 참값 두 벌과 견준다  (칸: ' + lbl.join(' ') + ')');
  const got = {};
  for (const [ci, c] of boxes.entries()) {
    const k = c.ban ? 'ban' : 'bl';
    console.log(`  -- ${k}(${c.id})`);
    console.log(`     선언표 ${row(truth.tab[k])}`);
    console.log(`     그려짐 ${row(truth.drawn[k])}   ← 합집합 바깥 경계까지의 참 수직거리(화소 안 봄)`);
    for (const uat of UATS) {
      const n = pick(read[uat], ci);
      if (!n) { console.log(`     ${uat.padEnd(6)} — 노치를 못 찾았다`); continue; }
      const v = n.band.map(([, , x]) => x);
      console.log(`     ${uat.padEnd(6)} ${row(v)}   매끈|Δ그려짐| `
        + `${(dev(v, truth.drawn[k], SMOOTH) ?? NaN).toFixed(2)}`);
      if (!got[k]) got[k] = {};
      got[k][uat] = v;
    }
  }

  blk('§2 판정 — 굽은 표를 가진 불릿(bl)만이 이름표를 가른다 (배너는 상수라 판별력 0)');
  ok(!!(got.ban && got.bl && UATS.every((u) => got.bl[u])),
    `[1] 세 이름표가 두 형을 모두 읽었다 — ${UATS.join(' · ')}`);

  /* ⓐ 대조군 — 배너는 선언이 «어디서나 10» 이라 **상수는 어떤 이름표로 다시 붙여도 상수**다.
     셋이 다 10 을 되찾으면 «자가 두께를 이름표와 무관하게 편향 없이 잰다» 가 선다. */
  if (got.ban) {
    const worst = Math.max(...UATS.map((u) => dev(got.ban[u], truth.tab.ban, [0, 1, 2, 3, 4, 5, 6]) ?? 0));
    ok(worst <= 0.4,
      `[2] 대조군(배너 · 선언 = 어디서나 10) — 세 이름표 전부 최대|Δ| ${worst.toFixed(2)} ≤ 0.4`
      + ' ⇒ 자는 두께 자체를 이름표와 무관하게 잰다(갈림은 «크기» 가 아니라 «이름표» 다)');
  }

  /* ⓑ 판별 — 표가 굽은 불릿의 **매끈한 구간**(u≥7 · 합집합 전제가 성립하는 자리)에서
     선언의 축과 같은 이름표만이 «그려진 두께» 를 제자리에서 되찾는다. */
  if (got.bl) {
    const sc = {};
    for (const u of UATS) sc[u] = dev(got.bl[u], truth.drawn.bl, SMOOTH);
    const have = UATS.filter((u) => sc[u] != null);
    for (const u of UATS) console.log(`     ${u.padEnd(6)} 매끈 구간(u≥7) 최대|Δ그려짐| ${sc[u] == null ? '—' : sc[u].toFixed(2)}`);
    const best = have.slice().sort((a, b2) => sc[a] - sc[b2])[0];
    ok(best === 'outer',
      `[3] 매끈한 구간을 제자리에서 되찾는 이름표는 «${best}» 다`
      + ` — ${have.map((u) => `${u} ${sc[u].toFixed(2)}`).join(' · ')}`);
    /* ⚠ «가장 작다» 만으로는 무르다 — 진 쪽이 **뚜렷이** 져야 9회차의 «부호가 뒤집힌다» 가 설명된다.
       절대차가 아니라 **배수**로 묻는다(이긴 쪽의 잔차가 자의 해상도라 절대 창은 그 해상도에 끌려간다). */
    const rest = have.filter((u) => u !== 'outer').map((u) => sc[u]);
    const ratio = rest.length ? Math.min(...rest) / Math.max(sc.outer, 1e-6) : 0;
    ok(ratio >= 3.0,
      `[4] 이름표가 실제로 갈린다 — 진 쪽이 outer 의 ${ratio.toFixed(1)}배 벗어난다 (창 ≥ 3.0배)`
      + ' ⇒ 9회차가 본 «기준점을 바꾸면 부호가 뒤집힌다» 는 이름표 이동이지 정밀도가 아니다');

    /* ⓒ ⚑ **입(u<4)은 선언표대로 그려지지 않는다** — 표의 머리가 3→6 에서 10→12.6(기울기 0.87/px)
       이라 «두께가 천천히 변한다» 는 합집합 전제 밖이고, 얕은 쪽이 더 깊은 원판에 먹힌다.
       화소(자)와 기하(그려짐)가 **둘 다** 선언보다 두껍다고 말하면 그것은 자의 잡음이 아니다. */
    const gapGeo = truth.drawn.bl[1] - truth.tab.bl[1];
    const gapPix = got.bl.outer[1] == null ? null : got.bl.outer[1] - truth.tab.bl[1];
    ok(gapGeo >= 1.0 && gapPix != null && gapPix >= 1.0,
      `[5] 입 칸(u2~4)은 «선언보다 두껍게» 그려진다 — 기하 +${gapGeo.toFixed(2)} · 화소 +${gapPix == null ? '—' : gapPix.toFixed(2)}`
      + ` (선언 ${truth.tab.bl[1].toFixed(2)})  ⇒ 표의 머리를 올리는 수리는 이미 두꺼운 자리를 더 두껍게 한다`);
    /* ⓓ ⚑⚑ **입 칸에는 «두께» 값이 하나가 아니다 — 방향에 따라 다르다.**
       두 자는 같은 두 곡선을 **반대 방향**으로 잰다:
         · 화소 자   = 림 쪽 점 → 실루엣 점구름 최소거리 (이름표 = 그 실루엣 점의 깊이)
         · 기하 참값 = 실루엣 점 → 바깥 폴리라인 최소거리 (이름표 = 그 실루엣 점의 깊이)
       두 곡선이 나란한 **매끈한 구간**에서는 둘이 같은 수로 만나지만, 입에서는 실루엣이 곧은변으로
       접히면서 한 실루엣 점이 **여러 깊이의 원판이 만든 바깥 호**를 통째로 떠맡아 두 방향이 갈린다.
       ⇒ 우리 카드는 기하를 **정확히 아는** 그림인데도 그 자리의 «두께» 가 값 하나로 안 정해진다.
       이것이 8·9회차에서 자 넷이 깊이 2~6 에서만 갈린 **구조적** 이유다(정밀도가 아니다).
       ⚠ 그러므로 이 칸은 **관측**으로만 적고 과녁을 걸지 않는다 — 어느 방향으로 재느냐가
       부호를 정하는 자리에 제품을 맞추면 그 수리는 자를 바꾸는 순간 되돌려야 한다. */
    const smoothGap = dev(got.bl.outer, truth.drawn.bl, SMOOTH);
    const mouthGap = dev(got.bl.outer, truth.drawn.bl, MOUTH);
    ok(smoothGap != null && smoothGap <= 0.6 && mouthGap != null && mouthGap >= 1.5,
      `[6] 두 방향이 매끈 구간에서는 만나고(${smoothGap == null ? '—' : smoothGap.toFixed(2)} ≤ 0.6)`
      + ` 입 칸에서는 갈린다(${mouthGap == null ? '—' : mouthGap.toFixed(2)} ≥ 1.5)`
      + ' ⇒ 입 칸의 «두께» 는 값이 하나가 아니다(방향 의존) — 과녁 금지 · 관측만');
  }

  blk('§Z 요약');
  console.log(`\nPROBE923 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('probe923:', e && e.message ? e.message : e); process.exit(3); });
