#!/usr/bin/env node
/* 작업 966 — 10 이용권 «불릿형» 카드의 **알약 더미 아랫변** 게이트.
 *
 *   node tools/verify966.js
 *
 * ── 966 이 지킨 것 ────────────────────────────────────────────────────────
 * 923 10회차 채점 GZ·HA 가 «마지막 알약 아랫변 ↔ 리본1 윗변» 틈을 **+2.65~2.87** 로 넘겼고,
 * 손잡이 후보를 둘 남겼다 — ⓐ 더미를 통째로 내린다(`.pvl{top}`) · ⓑ 더미가 아래로 더 닿게 한다.
 * 재현(`tools/probe966.py`)이 **ⓐ 를 기각했다**: 원점을 카드 «바닥» 으로 놓고 사다리를 통째로 재면
 * «밴드 아랫변 ↔ 첫 알약 윗변» 이 ref 22.10 ↔ 우리 21.77 로 **이미 우리가 더 좁다** —
 * 내리면 닫혀 있는 칸을 깬다(문턱 사다리 아홉 단에서 부호 불변).
 *
 * ⇒ 결손은 «앵커» 가 아니라 **«쌓임»** 이었다(알약 높이 −0.2 · 사이 틈 −0.3 이 부호가 같아 3+2 번 쌓인다).
 *   제품은 `.pvb{height:72→72.5 · margin-bottom:10→10.25}` 두 값뿐이고 `.pvl{top:133}` 은 0줄이다.
 *
 * 이 자가 막는 길:
 *   [1] 마지막 알약 아랫변이 ref 과녁 위에 있다 (ⓑ 가 실제로 먹었다)
 *   [2] `.pvl{top}` 이 안 움직였다 — 밴드↔첫 알약이 **수리 전과 같은 값**이다 (ⓐ 로 새는 길)
 *   [3] 알약 세 칸(높이·사이 틈·피치)이 전부 ±0.5 안이고 **수리 전보다 나쁘지 않다**
 *       («아랫변만 맞추려고 알약을 망가뜨렸다» 는 무른 통과를 막는다)
 *   [4] 두 프레임(2280 · 1600)에서 같은 값 — 세로 가변에 안 매인다
 *   [5] 배너형(`ban1`)은 한 화소도 안 움직였다 (885 10회차가 «맞다» 로 못박은 대조군)
 *   [6] **남은 몫은 리본이고 여기서 갚지 않았다** — 리본 높이가 선언 **77** 이다.
 *       ⚑ 969 이관(2026-09-06): 등재 당시는 «여전히 76» 이었고, 969 가 그 1.06 을 **리본 자신의
 *       높이로** 갚아 76 → 77 이 됐다(ref 77.12 / 77.11). 이 항이 76 으로 되돌아가면 969 가
 *       되돌려진 것이다. 화소 자·되돌림 시험은 `tools/verify969.js`(14/14) 가 세운다.
 *   [R] 되돌림 시험 — `height:72px;margin-bottom:10px` 사본을 실제로 먹이면 틈이 **46 → 48** 로
 *       벌어지고 [1] 이 빨개진다(무르게 푼 수리가 아님을 증명한다 · 969 뒤 틈은 45.95 다).
 *
 * ⚠ Pillow/numpy(python)가 없으면 화소 절이 «환경» 으로 건너뛴다(641·937 교훈 · 종료 코드 3).
 *   준비: pip3 install pillow numpy
 * ⚠ 사본은 저장소 «안» 에 둔다 — /tmp 는 assets/** 가 404 라 찍힌 픽셀이 달라진다(905 [R] 선례).
 */
const path = require('path');
const fs = require('fs');
const { py: py937 } = require('./pydep937');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'shots');

/* 제품 선언(이 두 값이 966 의 전부다) · 수리 전 값 = 되돌림 사본이 쓰는 값 */
const NOW = { h: 72.5, m: 10.25 };
const WAS = { h: 72, m: 10 };
/* 과녁 — `probe966.py --ref` 가 낸 ref 실측(우리px · 원점 카드 바닥).
   ⚠ 상수로 굳히지 않는다: 아래에서 **매 실행 ref 를 다시 재고** 그 값과 비교한다.
   여기 적힌 수는 «지금 무엇이 나오는가» 의 기록일 뿐이다(회귀 때 눈으로 대조하라).
     마지막 알약 아랫변 318.52 · 틈 45.52 · 높이 72.39 · 피치 82.38 · 사이 틈 9.97 · 밴드↔p1 22.10 */
const TOL = 0.5;                 /* 923 10회차가 «맞다» 로 쓴 대역 그대로 */
const FRAMES = [2280, 1600];     /* 9:19 기준 + 9:13.3(짧은 기기) — 지시서 [2] */

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};
const p2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'n/a' : (+v).toFixed(2));

/* ── 한 판 찍기: 이용권 탭에 착지 → 정지 → 카드 기하 덤프 + 스크린샷 ──────── */
async function shoot(browser, file, geoFile, fh, url, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    S.dia = 3e5; S.gold = 1e9;
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; });
    openShopTab('pass');                       /* 164 공용 헬퍼 — cap151.js 와 같은 경로 */
  });
  await page.waitForTimeout(900);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
    document.getElementById('shopList').scrollTop = 0;
  });
  await page.waitForTimeout(200);
  const geo = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (r) => ({ x: +(r.left - A.left).toFixed(3), y: +(r.top - A.top).toFixed(3),
      w: +r.width.toFixed(3), h: +r.height.toFixed(3) });
    const g = { frameH: +A.height.toFixed(1) };
    g.cards = [...document.querySelectorAll('.pvc')].map((c) => {
      const o = box(c.getBoundingClientRect());
      o.id = c.dataset.pv; o.cls = [...c.classList];
      const q = (s) => (c.querySelector(s) ? box(c.querySelector(s).getBoundingClientRect()) : null);
      o.rb1 = q('.rb1'); o.rb2 = q('.rb2'); o.hdb = q('.hdb'); o.pvl = q('.pvl');
      o.lines = [...c.querySelectorAll('.pvb')].map((l) => box(l.getBoundingClientRect()));
      const s = c.querySelector('.pvb');
      o.pvbCss = s ? (({ height, marginBottom }) => ({ height, marginBottom }))(getComputedStyle(s)) : null;
      const r1 = c.querySelector('.rb1');
      o.rbCss = r1 ? getComputedStyle(r1).height : null;
      return o;
    });
    return g;
  });
  fs.writeFileSync(geoFile, JSON.stringify(geo));
  const el = await page.$('#app');
  await (el || page).screenshot({ path: file });
  await ctx.close();
  return geo;
}

const probe = (png, geo) => {
  const out = py937([path.join(__dirname, 'probe966.py'), '--ref', '--cap', png, '--geo', geo, '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = out.indexOf('@@JSON@@');
  if (i < 0) throw new Error('probe966 이 JSON 을 안 냈다');
  return JSON.parse(out.slice(i + 8))['x1.0'];
};

/* DOM 만으로 세우는 사다리 — 화소 자 없이도 도는 절(환경 SKIP 때 이 절은 산다) */
const domLadder = (c) => {
  const cb = c.y + c.h, L = c.lines;
  return {
    last_bot: cb - (L[L.length - 1].y + L[L.length - 1].h),
    rb_top: cb - c.rb1.y,
    gap: c.rb1.y - (L[L.length - 1].y + L[L.length - 1].h),
    band_to_p1: L[0].y - (c.hdb.y + c.hdb.h),
    ph: L[0].h,
    pitch: L.length > 1 ? L[1].y - L[0].y : null,
    inter: L.length > 1 ? L[1].y - (L[0].y + L[0].h) : null,
  };
};
const bullet = (g) => g.cards.filter((c) => !c.cls.includes('ban1') && c.lines.length);
const banner = (g) => g.cards.find((c) => c.cls.includes('ban1'));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  /* ── 되돌림 사본 — 저장소 «안» 에 둔다(assets 상대경로) ───────────────── */
  const RX = path.join(ROOT, 'index.v966rx.html');
  const src = fs.readFileSync(SRC, 'utf8');
  const RX_FIND = `.pvc>.pvl>.pvb{position:relative;height:${NOW.h}px;margin-bottom:${NOW.m}px;`;
  const RX_REPL = `.pvc>.pvl>.pvb{position:relative;height:${WAS.h}px;margin-bottom:${WAS.m}px;`;
  const canRx = src.includes(RX_FIND);
  if (canRx) fs.writeFileSync(RX, src.replace(RX_FIND, RX_REPL));

  const shots = {};
  let browser;
  try {
    browser = await launch(chromium);
    for (const fh of FRAMES) {
      shots[fh] = await shoot(browser, path.join(OUT, `v966-${fh}.png`),
        path.join(OUT, `v966-${fh}.json`), fh, URL, null);
    }
    if (canRx) {
      shots.rx = await shoot(browser, path.join(OUT, 'v966-rx.png'), path.join(OUT, 'v966-rx.json'),
        2280, 'file://' + RX.replace(/\\/g, '/'), null);
    }
    await browser.close();
  } catch (e) {
    try { if (browser) await browser.close(); } catch (_) {}
    console.error('VERIFY966 — playwright 없음이거나 자가 죽었다: ' + String(e.message || e).split('\n')[0]);
    console.error('  준비: npm i --no-save playwright pngjs   (913 — 반드시 «한 번에»)');
    process.exit(3);
  }

  /* ── [0] 제품 선언 두 값 ─────────────────────────────────────────────── */
  {
    const c = bullet(shots[2280])[0];
    const h = parseFloat(c.pvbCss.height), m = parseFloat(c.pvbCss.marginBottom);
    ok(Math.abs(h - NOW.h) < 0.01 && Math.abs(m - NOW.m) < 0.01,
      `[0] 알약 선언 = height ${NOW.h} · margin-bottom ${NOW.m} (966 의 제품 전부)`,
      `${h} / ${m}`);
  }

  /* ── [2] `.pvl{top}` 은 0줄 — 밴드↔첫 알약이 수리 전과 **같은 값**이다 ──
     ⓐ(더미를 통째로 내린다)로 새면 여기가 먼저 빨개진다. 되돌림 사본이 기준이므로
     «21.7» 같은 상수를 손으로 안 적는다(수리 전 트리가 스스로 답한다). */
  if (canRx) {
    const now = bullet(shots[2280]).map((c) => domLadder(c).band_to_p1);
    const was = bullet(shots.rx).map((c) => domLadder(c).band_to_p1);
    ok(now.every((v, i) => Math.abs(v - was[i]) < 0.01),
      '[2] 밴드 아랫변 ↔ 첫 알약 윗변이 **수리 전과 같다**(`.pvl{top}` 0줄 — 더미를 안 옮겼다)',
      `지금 ${now.map(p2).join('/')} ↔ 수리 전 ${was.map(p2).join('/')}`);
  } else {
    ok(false, '[2] 되돌림 사본을 못 만들었다 — 제품 선언이 바뀌었는가',
      `찾는 문자열: ${RX_FIND}`);
  }

  /* ── [4] 두 프레임이 같은 값 ────────────────────────────────────────── */
  {
    const a = domLadder(bullet(shots[2280])[0]);
    const b = domLadder(bullet(shots[1600])[0]);
    const keys = ['last_bot', 'gap', 'band_to_p1', 'ph', 'pitch', 'inter'];
    ok(keys.every((k) => Math.abs(a[k] - b[k]) < 0.01),
      '[4] 9:19(2280) 과 9:13.3(1600) 이 **같은 사다리**다 — 세로 가변에 안 매인다',
      keys.map((k) => `${k} ${p2(a[k])}/${p2(b[k])}`).join(' · '));
  }

  /* ── [5] 배너형은 한 화소도 안 움직였다(885 10회차 대조군) ───────────── */
  if (canRx) {
    const n = banner(shots[2280]), w = banner(shots.rx);
    const same = n && w && ['y', 'h'].every((k) => Math.abs(n[k] - w[k]) < 0.01) &&
      Math.abs((n.rb1.y - n.y) - (w.rb1.y - w.y)) < 0.01 &&
      Math.abs((n.rb2.y - n.y) - (w.rb2.y - w.y)) < 0.01;
    ok(same, '[5] 배너형(ban1)은 수리 전후가 **한 화소도 안 다르다**(알약이 없는 형)',
      n ? `높이 ${p2(n.h)}↔${p2(w.h)} · rb1 ${p2(n.rb1.y - n.y)}↔${p2(w.rb1.y - w.y)} · ` +
          `rb2 ${p2(n.rb2.y - n.y)}↔${p2(w.rb2.y - w.y)}` : '배너형 카드를 못 찾았다');
  }

  /* ── [6] 남은 몫은 **리본**이고 여기서 안 갚았다 — 969 가 리본으로 갚았다 ──
     ⚑ 969 이관(2026-09-06). 이 항의 뜻은 처음부터 «리본 높이가 76이다» 가 아니라
     **«틈의 나머지를 알약으로 갚지 않았다»** 였다(966 §4 «한 부품의 결손을 다른 부품으로 갚지 않는다»).
     969 가 리본 띠를 76 → **77** 로 올려 그 몫을 자기 부품에서 갚았으므로 과녁을 같이 옮긴다 —
     966 의 제품 두 값(알약 72.5 / 10.25)은 [0] 이 그대로 못박고 있으므로 «알약이 리본 몫을 흡수하지
     않았다» 는 [0] 이 이미 지킨다. 이 항이 지키는 것은 그 짝 — **리본 자신이 77 이다** 이다.
     ⚠ 이 항이 «76» 으로 되돌아가면 969 가 되돌려진 것이다(`tools/verify969.js` 가 화소로 짝을 선다). */
  {
    const hs = shots[2280].cards.filter((c) => !c.cls.includes('ban1')).map((c) => parseFloat(c.rbCss));
    ok(hs.every((h) => Math.abs(h - 77) < 0.01),
      '[6] 불릿형 리본 띠 높이가 **77**이다 — 틈의 나머지를 알약이 아니라 **리본**이 갚았다(969)',
      hs.join(' / '));
  }

  /* ── 화소 절 [1][3][R] — probe966 이 ref 를 매 실행 다시 잰다 ────────── */
  let R, N, X;
  try {
    N = probe(path.join(OUT, 'v966-2280.png'), path.join(OUT, 'v966-2280.json'));
    if (canRx) X = probe(path.join(OUT, 'v966-rx.png'), path.join(OUT, 'v966-rx.json'));
    R = N.ref;
  } catch (e) {
    if (canRx) fs.unlinkSync(RX);
    console.error('VERIFY966 — [1][3][R] SKIP: ' + String(e.message || e).split('\n')[0]);
    console.error('  준비: pip3 install pillow numpy   (937 — 저장소 결함이 아니라 컨테이너 의존이다)');
    console.log(`\nVERIFY966 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS (일부 SKIP — 환경)'}`);
    process.exit(fail ? 1 : 3);
  }

  /* ── [1] 마지막 알약 아랫변이 ref 과녁 위에 있다 ─────────────────────── */
  {
    const d = N.cap.last_bot - R.last_bot;
    ok(Math.abs(d) <= TOL,
      `[1] 마지막 알약 아랫변 ← 카드 바닥 = ref ±${TOL}`,
      `ref ${p2(R.last_bot)} · 우리 ${p2(N.cap.last_bot)} · Δ ${d >= 0 ? '+' : ''}${p2(d)}` +
      (X ? ` (수리 전 ${p2(X.cap.last_bot)} · Δ ${p2(X.cap.last_bot - R.last_bot)})` : ''));
  }

  /* ── [3] 알약 세 칸이 ±0.5 안이고 **수리 전보다 나쁘지 않다** ─────────
     아랫변만 맞추려고 알약을 망가뜨리는 길을 막는다(무른 통과 금지). */
  {
    const keys = [['ph', '높이'], ['inter', '사이 틈'], ['pitch', '피치']];
    const rows = keys.map(([k, n]) => ({
      n, now: N.cap[k] - R[k], was: X ? X.cap[k] - R[k] : null,
    }));
    const inBand = rows.every((r) => Math.abs(r.now) <= TOL + 0.05);
    const notWorse = !X || rows.every((r) => Math.abs(r.now) <= Math.abs(r.was) + 0.3);
    ok(inBand && notWorse,
      `[3] 알약 높이·사이 틈·피치가 전부 ±${TOL} 안이고 **수리 전보다 나쁘지 않다**`,
      rows.map((r) => `${r.n} Δ${r.now >= 0 ? '+' : ''}${p2(r.now)}` +
        (X ? `(전 ${r.was >= 0 ? '+' : ''}${p2(r.was)})` : '')).join(' · '));
  }

  /* ── [R] 되돌림 시험 — 사본은 실제로 빨개진다 ────────────────────────── */
  if (X) {
    const back = Math.abs(X.cap.last_bot - R.last_bot) > TOL;
    const wider = X.cap.gap - N.cap.gap;
    ok(back && wider > 1.5,
      '[R] `height:72px;margin-bottom:10px` 사본은 [1] 이 **빨개지고** 틈이 다시 벌어진다',
      `수리 전 아랫변 Δ ${p2(X.cap.last_bot - R.last_bot)}(대역 밖 ${back}) · ` +
      `틈 ${p2(N.cap.gap)} → ${p2(X.cap.gap)} (+${p2(wider)})`);
    fs.unlinkSync(RX);
  }

  /* ── 곁축 기록(판정 아님) — 남은 리본 몫을 수로 남긴다 ────────────────── */
  console.log(`  · (기록) 틈 ref ${p2(R.gap)} · 우리 ${p2(N.cap.gap)} · Δ ${p2(N.cap.gap - R.gap)}` +
    (X ? ` (수리 전 ${p2(X.cap.gap)} · Δ ${p2(X.cap.gap - R.gap)})` : '') +
    ` — 남은 몫은 리본1 윗변 Δ ${p2(N.cap.rb_top - R.rb_top)} (969)`);
  console.log(`  · (기록) 밴드↔첫 알약 ref ${p2(R.band_to_p1)} · 우리 ${p2(N.cap.band_to_p1)} · ` +
    `Δ ${p2(N.cap.band_to_p1 - R.band_to_p1)} — 내리면 더 벌어진다(ⓐ 기각의 근거)`);

  console.log(`\nVERIFY966 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
