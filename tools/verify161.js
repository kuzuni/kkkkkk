/* 작업 161 회귀 게이트 — 스테이지 진행바 중간 노드(.n2) 점등 (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify161.js   → 마지막 줄이 `VERIFY161 n/n PASS` 여야 한다.

   주인 지시: «없애든지, 도달하면 같이 노란색 되든지 — 같이 노란색 되는 게 나을 듯» → 점등을 택했다.

   본다:
     §1 기하     채움 트랙(.kbar>i 의 left+max-width)과 노드 중심으로 점등 임계값을 역산해
                 소스의 상수 KNODE2_AT 과 일치하는지 — 상수를 손으로 적어 두고 CSS 만 옮기는 사고 방지.
     §2 판정     killed/total 을 0→100% 로 훑어 «비율 ≥ 임계» 일 때만 `.on` 이 붙는다(경계 포함/직전 제외).
     §3 픽셀     점등 전 = 검정 단색, 점등 후 = 노랑 #FFBF17 + 검정 테 4px, 그리고 **외경 Ø40 불변**
                 (box-sizing:border-box — 테두리가 붙어도 레퍼런스 bbox 를 안 넘는다).
     §4 정렬     점등 순간 채움 선단의 화면 x 가 노드 중심 x 와 ±1px 안에 있다(«도달하면» 의 실측).
     §5 승급전   promo 진행바(같은 #prF)도 같은 규칙으로 점등한다.
     §6 회귀     28 보스전 상태(.bfight/.bfarm)에서 노드가 그대로 숨겨진다 · 스테이지가 넘어가
                 killed 가 0 으로 돌아가면 점등이 꺼진다.
     §7 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 게임 루프(loop → requestAnimationFrame(loop))를 얼린다. 얼리지 않으면 killed·promo 를 박아도
   다음 프레임이 곧바로 되돌려 «켜졌다 꺼진» 상태를 읽게 된다(실제로 그렇게 오탐이 났다). */
const freeze = (p) => p.evaluate(() => { window.requestAnimationFrame = () => 0; });

/* 적을 비우고 진행률을 직접 박은 뒤 drawHud 를 한 번 돌린다. */
const setKilled = (p, r) => p.evaluate((r) => {
  promo = null;
  enemies.length = 0; spawnQ.length = 0;
  const total = stageTotal();
  killed = Math.round(r * total);
  drawHud();
  return { total, killed, ratio: killed / total };
}, r);

const nodeState = (p) => p.evaluate(() => {
  const n = $('kn2'), f = $('prF');
  const cs = getComputedStyle(n);
  const nb = n.getBoundingClientRect(), fb = f.getBoundingClientRect();
  return {
    on: n.classList.contains('on'),
    bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor,
    w: Math.round(nb.width * 100) / 100, h: Math.round(nb.height * 100) / 100,
    cx: Math.round((nb.left + nb.width / 2) * 100) / 100,
    front: Math.round(fb.right * 100) / 100,
    disp: cs.display,
    scale: nb.width / 40                                  /* 프레임 fit() 스케일 — 화면 px ↔ 프레임 px */
  };
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof drawHud === 'function' && document.getElementById('kn2'));
  await p.waitForTimeout(900);
  await freeze(p);
  await p.waitForTimeout(120);                             /* 마지막 프레임이 빠져나가길 기다린다 */
  const TR = 260;                                          /* .n2 색 transition(.18s) 이 끝나는 시간 */

  /* ── §1 기하 — 임계값을 CSS 에서 역산 ─────────────────────────── */
  console.log('§1 기하 — 채움 트랙과 노드 중심으로 임계값 역산');
  const geo = await p.evaluate(() => {
    const f = $('prF'), n = $('kn2'), bar = document.querySelector('#stinfo .kbar');
    const cf = getComputedStyle(f), cb = getComputedStyle(bar), cn = getComputedStyle(n);
    const px = v => parseFloat(v);
    const start = px(cb.left) + px(cf.left);              /* #stinfo 좌표계의 채움 시작 x */
    const span = px(cf.maxWidth);                          /* 채움이 뻗는 최대 폭 */
    const center = px(cn.left) + px(cn.width) / 2;         /* 노드 중심 x */
    return { start, span, center, at: (center - start) / span, KNODE2_AT: (typeof KNODE2_AT !== 'undefined' ? KNODE2_AT : null) };
  });
  console.log(`  · 채움 x${geo.start}..${geo.start + geo.span}(폭 ${geo.span}) · 노드 중심 x${geo.center}`);
  eq('§1 채움 시작 x (#stinfo 기준)', geo.start, 21);
  eq('§1 채움 폭', geo.span, 398);
  eq('§1 노드 중심 x', geo.center, 220);
  ok(geo.KNODE2_AT !== null, '§1 상수 KNODE2_AT 이 노출돼 있다');
  near('§1 역산 임계값이 상수와 일치', geo.at, geo.KNODE2_AT, 0.002);
  eq('§1 임계값', geo.KNODE2_AT, 0.5);
  ok(/KNODE2_AT/.test(SRC) && (SRC.match(/KNODE2_AT/g) || []).length >= 2,
     '§1 상수가 정의·사용 양쪽에 있다(매직넘버 아님)');

  /* ── §2 판정 — 0→100% 스윕 ───────────────────────────────────── */
  console.log('§2 판정 — 진행률 스윕에서 «≥ 임계» 일 때만 점등');
  const AT = geo.KNODE2_AT;
  let sweepBad = [];
  for (let i = 0; i <= 20; i++) {
    const r = i / 20;
    const set = await setKilled(p, r);
    const st = await nodeState(p);
    const want = set.ratio >= AT;
    if (st.on !== want) sweepBad.push(`${(set.ratio * 100).toFixed(0)}%→${st.on ? 'on' : 'off'}(기대 ${want ? 'on' : 'off'})`);
  }
  ok(sweepBad.length === 0, '§2 21단계 스윕 전부 기대대로', sweepBad.join(' '));

  /* 경계 — 임계 직전 한 칸은 꺼져 있고 임계 칸부터 켜진다 */
  const total = (await setKilled(p, 0)).total;
  const kAt = Math.ceil(AT * total);
  await p.evaluate((k) => { promo = null; enemies.length = 0; spawnQ.length = 0; killed = k; drawHud(); }, kAt - 1);
  await p.waitForTimeout(TR);
  const before = await nodeState(p);
  await p.evaluate((k) => { killed = k; drawHud(); }, kAt);
  await p.waitForTimeout(TR);
  const after = await nodeState(p);
  ok(!before.on, `§2 임계 직전(${kAt - 1}/${total}) 은 꺼짐`);
  ok(after.on, `§2 임계 도달(${kAt}/${total}) 에서 켜짐`);

  /* ── §3 픽셀 — 색·테두리·외경 ────────────────────────────────── */
  console.log('§3 픽셀 — 검정 → 노랑 + 검정 테 4, 외경 Ø40 불변');
  const S40 = after.scale;                                 /* 프레임 스케일(1080 → 뷰포트) */
  eq('§3 점등 전 배경', before.bg, 'rgb(0, 0, 0)');
  eq('§3 점등 전 테두리 두께', before.bw, '0px');
  eq('§3 점등 후 배경 (#FFBF17)', after.bg, 'rgb(255, 191, 23)');
  near('§3 점등 후 테두리 두께 4px(프레임 기준)', parseFloat(after.bw) / S40, 4, 0.05);
  eq('§3 점등 후 테두리 색 검정', after.bc, 'rgb(0, 0, 0)');
  near('§3 외경 폭이 점등 전후 불변 Ø40', after.w, before.w, 0.05);
  near('§3 외경 높이가 점등 전후 불변 Ø40', after.h, before.h, 0.05);
  near('§3 외경이 프레임 기준 40px', after.w / S40, 40, 0.05);

  /* ── §4 정렬 — 점등 순간 선단이 노드 중심에 닿는다 ───────────── */
  console.log('§4 정렬 — 점등 순간 채움 선단 x = 노드 중심 x');
  /* 손으로 폭을 박지 않고 **실제 코드 경로**(drawHud)가 그린 선단을 잰다 —
     `%` 로 주던 시절엔 여기서 +6px 이 나왔다(트랙 padding box 410 기준으로 풀려서). */
  await p.evaluate((at) => {
    promo = null; enemies.length = 0; spawnQ.length = 0;
    killed = Math.round(at * stageTotal()); drawHud();
  }, AT);
  await p.waitForTimeout(60);
  const align = await nodeState(p);
  near('§4 선단 x 와 노드 중심 x 차이 ≤ 1px(프레임 기준)', (align.front - align.cx) / S40, 0, 1);
  /* 100% 에서 트랙 오른쪽 안쪽 끝(#stinfo x419)에 정확히 닿는다 — 오버런도 미달도 없다 */
  await p.evaluate(() => { killed = stageTotal(); drawHud(); });
  const full = await p.evaluate(() => {
    const f = $('prF'), si = $('stinfo');
    const fb = f.getBoundingClientRect(), sb = si.getBoundingClientRect();
    const sc = fb.height / 12;
    return { right: Math.round(((fb.right - sb.left) / sc) * 100) / 100, w: Math.round((fb.width / sc) * 100) / 100 };
  });
  near('§4 100% 선단이 #stinfo x419', full.right, 419, 1);
  near('§4 100% 채움 폭 398', full.w, 398, 1);

  /* ── §5 승급전 경로 ─────────────────────────────────────────── */
  console.log('§5 승급전(promo) 진행바도 같은 규칙');
  await p.evaluate(() => { promo = { t: 60, max: 60, rank: 0 }; drawHud(); });   /* t/max = 1 → 점등 */
  const pmFull = await nodeState(p);
  await p.evaluate(() => { promo.t = 60 * 0.49; drawHud(); });
  const pmLow = await nodeState(p);
  await p.evaluate(() => { promo.t = 60 * 0.5; drawHud(); });
  const pmAt = await nodeState(p);
  await p.waitForTimeout(TR);
  ok(pmFull.on, '§5 승급전 100% 에서 점등');
  ok(!pmLow.on, '§5 승급전 49% 에서는 꺼짐');
  ok(pmAt.on, '§5 승급전 50% 에서 점등');
  await p.evaluate(() => { promo = null; drawHud(); });

  /* ── §6 회귀 — 보스전 숨김 · 스테이지 리셋 ──────────────────── */
  console.log('§6 회귀 — 28 보스전 숨김 · killed 리셋 시 소등');
  await setKilled(p, 1);
  const bf = await p.evaluate(() => {
    const si = $('stinfo');
    si.classList.add('bfight');
    const a = getComputedStyle($('kn2')).display;
    si.classList.remove('bfight'); si.classList.add('bfarm');
    const b = getComputedStyle($('kn2')).display;
    si.classList.remove('bfarm');
    return { fight: a, farm: b, back: getComputedStyle($('kn2')).display };
  });
  eq('§6 .bfight 에서 노드 숨김', bf.fight, 'none');
  eq('§6 .bfarm 에서 노드 숨김', bf.farm, 'none');
  eq('§6 상태 해제 후 다시 표시', bf.back, 'block');
  await setKilled(p, 0);
  const reset = await nodeState(p);
  ok(!reset.on, '§6 killed 0 (다음 스테이지 시작)에서 소등');

  /* ── §7 콘솔 에러 ───────────────────────────────────────────── */
  console.log('§7 콘솔 에러');
  ok(errs.length === 0, '§7 pageerror/console.error 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY161 ${pass}/${pass + fail} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
