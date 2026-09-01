#!/usr/bin/env node
/* 게이트 583 — 「«강화에 쓰는 화폐» 가 연출에 나온다」 (저장소 주인 지시 2026-08-31)
 *
 *   node tools/verify583.js
 *
 * 주인 원문: «그 훈련할때 금액 마이너스로 되는 연출 빼기» · «훈련할때 나오는 알갱이 연출 크기 더 크게하기» ·
 *           «그 알갱이가 골드아이콘으로 되게 하기 왜냐면 골드로 강화하니까» ·
 *           «단련 · 룬 도 전부 강화 하는 화폐 아이콘으로 연출하기. 강화버튼 ㅇㅇ»
 *
 * ⚠⚠ 이 게이트의 본체는 **518 과 부딪히는 자리를 방향 축으로 가른 것**이다.
 *   518 = «재화를 안 얻었는데 «획득» 연출이 뜬다» 를 전 화면 0 으로 만든 작업.
 *   583 = 화폐를 **쓰는** 자리에 화폐 알갱이를 세우는 작업.
 *   둘이 같이 서려면 «획득(사건 자리 → 알약)» 과 «소모(알약·보유 표시 → 카드)» 가 갈려야 한다.
 *   그래서 [D] 가 **방향**을 재고, [F] 가 같은 씬에서 «획득 방향은 여전히 0» 을 못박는다.
 *
 *   [A] 구조   — `fxSpend` 부품 · `PAY_CUR` 한 표 · 새 크기 상수 0개(543 축 재사용) · CSS 규칙
 *   [B] 신원   — 세 자리의 알갱이가 각각 gold · rstone · tstone 이고 **자산이 실제로 로드됐다**
 *   [C] 크기   — 렌더 상자가 543 산식(ics × fxGrainSc × FX3_FLYS)과 ±2% 안 · 찍힌 픽셀이 바뀐다
 *   [D] 방향   — 출발이 «알약·보유 표시», 도착이 호스트. 거리 단조 감소(획득의 반대)
 *   [E] 금액   — `fxPay` «−n» 0건 · 488 훈련 사다리 «−n» 0건 · 알약 «움푹» 1건(43회차 유지)
 *   [F] 518    — 같은 씬에서 «획득 방향» 노드(알약으로 가는 비행·`+n`·딤 위 복제)는 0
 *   [G] 상한   — `#fxl` 최고 동시 노드 < FXMAX (543 규약 — 드롭 0)
 *   [R] 되돌림 — `fxSpend` 를 무력화한 사본에서는 알갱이 0 · 종전 앰버 버스트가 되살아난다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const n1 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(1);

const SITES = [
  { k:'train',  n:'23 훈련 카드', sub:'train',  cur:'gold',
    host:'#trCards [data-tr="atk"]', btn:'#trCards [data-tr="atk"]' },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',   cur:'rstone',
    host:'#trRunes .tr-rn',        btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', n:'단련 [투자]',  sub:'temper', cur:'tstone',
    host:'#trTemper .tr-tp',       btn:'#trTemper .tr-tp .tb' }
];

/* 표본을 만드는 계측기 — 페이지 안에서 한 번만 깐다 */
const INSTALL = () => {
  window.__G583 = { add: [], peak: 0 };
  const L = document.getElementById('fxl');
  const rec = n => {
    const c = (n.className || '') + '';
    if (!/\bfx-fly\b|\bfx-plus\b|\bfx-spark\b|\bfx-lit\b/.test(c)) return;
    const im = n.querySelector && n.querySelector('img.cic');
    window.__G583.add.push({
      cls: c, txt: (n.textContent || '').trim().slice(0, 24),
      cur: im ? im.dataset.curIc : null,
      loaded: im ? !!(im.complete && im.naturalWidth > 0) : null
    });
  };
  new MutationObserver(recs => {
    for (const r of recs) for (const n of r.addedNodes) if (n.nodeType === 1) rec(n);
    const L2 = document.getElementById('fxl');
    if (L2) window.__G583.peak = Math.max(window.__G583.peak, L2.childElementCount);
  }).observe(L, { childList: true, subtree: true });
  /* 알약 «움푹» 은 클래스 토글이라 따로 센다 */
  window.__G583.dent = 0;
  new MutationObserver(recs => {
    for (const r of recs) {
      const now = (r.target.className || '') + '', was = r.oldValue || '';
      if (/(^| )fx-pay( |$)/.test(now) && !/(^| )fx-pay( |$)/.test(was)) window.__G583.dent++;
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
};

(async () => {
  console.log('\n=== verify583 — «강화에 쓰는 화폐» 연출 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[A] 구조 — 부품 하나 · 표 하나 · 새 크기 상수 0개');
  /* 619 9회차 이관 — fxSpendFrom 이 도착 중심(toC)을 받는다(폴백 출발 x 를 도착 위로 — 경로가
     라벨을 관통하지 않게). 부품·출발 자리의 존재를 묻는 뜻은 그대로다. */
  ok(/function fxSpend\(cur, host\)\{/.test(src) && /function fxSpendFrom\(cur, host, toC\)\{/.test(src),
     '[A1] 소모 알갱이 부품 `fxSpend` / 출발 자리 `fxSpendFrom` 이 있다');
  ok(/const PAY_CUR = \{ train:'gold', rune:'rstone', temper:'tstone' \};/.test(src),
     '[A2] ★ «이 자리는 무엇으로 사는가» 가 **한 표**다(자리마다 화폐 문자열 금지 — 402 «표 두 벌» 방지)');
  /* ⚠ «크기를 두 벌로 적지 않았는가» — fxSpend 본문이 543 상수만 쓰고 새 리터럴을 안 만든다 */
  const body = (src.match(/function fxSpend\(cur, host\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(/FX3_FLYS/.test(body) && /FX3_LAND/.test(body) && /FX3_BSPITCH/.test(body) && /fxGrainSc\(cur\)/.test(body),
     '[A3] ★ 크기·개수 축이 전부 543 상수다(FX3_FLYS · FX3_LAND · FX3_BSPITCH · fxGrainSc)');
  ok(!/scale\(\s*[\d.]+\s*\)/.test(body.replace(/scale\(' \+ s\.toFixed\(3\) \+ '\)/g, '')),
     '[A4] 본문에 배율 리터럴이 없다 — 543 손잡이를 돌리면 소모 알갱이도 따라온다');
  ok(/\.fx-fly\.fx-spd\{transition:transform var\(--spd-t/.test(src),
     '[A5] CSS `.fx-fly.fx-spd` 가 «몸은 획득과 같고 방향만 다르다» 를 세운다');

  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxSpend === 'function');
  await p.waitForTimeout(1200);
  /* ⚠ 표본 재화는 **작게** 넣는다 — 1e18 은 float64 ulp 가 128 이라 «−45» 를 빼도 값이 안 바뀌어
     `fxWatch` 의 감소 판정이 통째로 안 돈다(probe583 1회차가 그 함정에 걸렸다). */
  await p.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6;
    openTrain(); });   /* 613 — 단련은 tstone 직접 지불(포인트 시드 불요·pts 는 죽은 필드) */
  await p.waitForTimeout(400);
  await p.evaluate(INSTALL);

  const K = await p.evaluate(() => ({ FXMAX, FX3_FLYS, FX3_LAND, FX3_BSPITCH,
    ics: FXCUR.gold.ics, gs: { gold: fxGrainSc('gold'), rstone: fxGrainSc('rstone'), tstone: fxGrainSc('tstone') } }));

  const R = {};
  for (const s of SITES) {
    await p.evaluate(s => { setTrSub(s.sub); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
      window.__G583 = Object.assign(window.__G583, { add: [], peak: 0, dent: 0 }); }, s);
    await p.waitForTimeout(200);
    const hostClip = await p.evaluate(s => {
      const h = document.querySelector(s.host); if (!h) return null;
      const r = h.getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y),
               width: Math.min(1080 - Math.max(0, r.x), r.width), height: Math.min(2280 - Math.max(0, r.y), r.height),
               cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    }, s);
    if (!hostClip) { ok(false, '[B0-' + s.k + '] 호스트를 찾았다', s.host); continue; }
    const before = await p.screenshot({ clip: { x: hostClip.x, y: hostClip.y, width: hostClip.width, height: hostClip.height } });
    const bb = await (await p.$(s.btn)).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.mouse.down();
    /* 궤적 — 40ms 격자로 알갱이 무리 중심과 호스트 중심 사이 거리를 잰다 */
    const traj = p.evaluate(s => new Promise(res => {
      const out = []; const t0 = performance.now(); let wave = null;
      const iv = setInterval(() => {
        const h = document.querySelector(s.host);
        const hr = h ? h.getBoundingClientRect() : null;
        /* ⚠ 크기는 **안쪽 아이콘**으로 잰다. 바깥 `<b>` 의 상자는 `scale(FX3_FLYS)` 만 타고
           재화별 잉크 보정 `--fxgs` 는 `.fx-fly>.cic` 에 걸리므로(3454 · 543), 바깥만 재면
           세 재화가 전부 같은 115.5px 로 읽힌다(1회차에 [C] 가 그렇게 빨갰다 — 자의 결함이었다). */
        /* ⚑⚑ 619 17회차 — **«한 무리» 만 따라간다.** 종전에는 살아 있는 `.fx-spd` 를 **전부** 모아
           무리 중심을 냈는데, 이 자는 **홀드** 중이라 720ms 창 안에서 새 무리가 여러 번 태어난다 —
           갓 태어난(멀리 있는) 알갱이와 도착 직전(가까운) 알갱이가 한 중심에 섞여서, 마지막 표본이
           «새 무리 직후» 에 걸리는지 «비행 중» 에 걸리는지가 **순전히 위상 운**이었다.
           그래서 [D] 의 `d0 → d1` 이 수리 전 트리에서도 22~70px 로 흔들렸다(문턱 20 에 최소 여유 2px).
           ⇒ **첫 표본에 있던 노드만** 끝까지 따라간다. 새로 태어난 무리는 안 센다 —
             «알갱이가 호스트 쪽으로 간다» 는 원래 **한 알갱이의 궤적**에 관한 말이고, 무리 중심은
             그것을 재는 수단이었을 뿐이다. 문턱(20px)·방향·의미는 **한 칸도 안 건드렸다**.
           ⚠ 첫 표본이 잡히기 전에는 집합을 안 굳힌다(빈 집합으로 굳으면 영원히 표본 0 이 된다). */
        let live = [...document.querySelectorAll('#fxl .fx-spd')];
        if (!wave && live.length) wave = new Set(live);       /* 첫 무리를 굳힌다 */
        if (wave) live = live.filter(n => wave.has(n));
        const g = live.map(n => {
          const r = n.getBoundingClientRect();
          const im = n.querySelector('img.cic');
          const ir = im ? im.getBoundingClientRect() : r;
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: ir.width, h: ir.height };
        });
        if (g.length && hr) {
          const cx = g.reduce((a, q) => a + q.x, 0) / g.length, cy = g.reduce((a, q) => a + q.y, 0) / g.length;
          out.push({ t: Math.round(performance.now() - t0), n: g.length,
                     d: Math.hypot(cx - (hr.x + hr.width / 2), cy - (hr.y + hr.height / 2)),
                     cx, cy, w: Math.max(...g.map(q => q.w)) });
        }
        if (performance.now() - t0 > 720) { clearInterval(iv); res(out); }
      }, 40);
    }), s);
    const mid = await p.waitForTimeout(160).then(() => p.screenshot({
      clip: { x: hostClip.x, y: hostClip.y, width: hostClip.width, height: hostClip.height } }));
    await p.mouse.up();
    const tr = await traj;
    const G = await p.evaluate(() => window.__G583);
    const from = await p.evaluate(s => { const q = fxSpendFrom(s.cur, document.querySelector(s.host));
      return q ? { x: q.x, y: q.y } : null; }, s);
    R[s.k] = { G, tr, from, hostClip, before, mid };
    await p.waitForTimeout(400);
  }

  /* ── [B] 신원 ─────────────────────────────────────────────────────── */
  console.log('\n[B] 신원 — 자리마다 «그 자리가 쓰는 화폐» 이고, 자산이 실제로 그려졌다');
  for (const s of SITES) {
    const r = R[s.k]; if (!r) continue;
    const spd = r.G.add.filter(a => /\bfx-spd\b/.test(a.cls));
    const curs = [...new Set(spd.map(a => a.cur))];
    console.log('  · ' + s.n + ' — 알갱이 ' + spd.length + '개 [' + curs.join(',') + '] · 로드 '
      + spd.filter(a => a.loaded).length + '/' + spd.length);
    ok(spd.length >= 3 && curs.length === 1 && curs[0] === s.cur,
       '[B-' + s.k + '] ★ ' + s.n + ' 의 알갱이가 전부 `' + s.cur + '` 다',
       spd.length + '개 · [' + curs.join(',') + ']');
    ok(spd.length > 0 && spd.every(a => a.loaded),
       '[B-' + s.k + '-ld] 찍힌 픽셀 — 아이콘 자산이 실제로 로드됐다(빈 상자가 아니다)',
       spd.filter(a => a.loaded).length + '/' + spd.length);
  }

  /* ── [C] 크기 · 찍힌 픽셀 ─────────────────────────────────────────── */
  console.log('\n[C] 크기 — 543 산식과 같은 값 · 호스트 픽셀이 실제로 달라진다');
  const diffPct = (a, bImg) => {
    if (!a || !bImg || a.length === bImg.length && Buffer.compare(a, bImg) === 0) return 0;
    return 100;                                       /* PNG 바이트 비교 — «달라졌는가» 만 본다 */
  };
  for (const s of SITES) {
    const r = R[s.k]; if (!r) continue;
    const want = K.ics * K.gs[s.cur] * K.FX3_FLYS;
    const got = Math.max(...r.tr.map(x => x.w), 0);
    ok(got > 0 && Math.abs(got - want) / want <= 0.02,
       '[C-' + s.k + '] 알갱이 렌더 폭이 543 산식(ics ' + K.ics + ' × 잉크보정 ' + n1(K.gs[s.cur])
       + ' × FX3_FLYS ' + n1(K.FX3_FLYS) + ')과 같다',
       '실측 ' + n1(got) + ' vs 산식 ' + n1(want));
    ok(diffPct(r.before, r.mid) > 0,
       '[C-' + s.k + '-px] 찍힌 픽셀 — 강화 중 호스트 영역이 실제로 달라진다');
  }
  ok(Math.max(...SITES.map(s => (R[s.k] ? Math.max(...R[s.k].tr.map(x => x.w), 0) : 0)))
     > 34,
     '[C-big] ★ 주인 지시 «알갱이 크기 더 크게» — 종전 방사형 불꽃 상한(34px)보다 크다',
     '최대 ' + n1(Math.max(...SITES.map(s => (R[s.k] ? Math.max(...R[s.k].tr.map(x => x.w), 0) : 0)))) + 'px');

  /* ── [D] 방향 ─────────────────────────────────────────────────────── */
  console.log('\n[D] 방향 — «알약·보유 표시 → 카드»(획득의 정반대)');
  for (const s of SITES) {
    const r = R[s.k]; if (!r || !r.tr.length) { ok(false, '[D-' + s.k + '] 궤적 표본이 있다'); continue; }
    const d0 = r.tr[0].d, d1 = r.tr[r.tr.length - 1].d;
    console.log('  · ' + s.n + ' — 출발 자리 (' + n1(r.from && r.from.x) + ',' + n1(r.from && r.from.y)
      + ') · 호스트 중심까지 ' + n1(d0) + ' → ' + n1(d1) + 'px');
    ok(d1 < d0 - 20, '[D-' + s.k + '] ★ 알갱이가 호스트 «쪽으로» 간다(획득은 반대로 알약 쪽으로 간다)',
       n1(d0) + ' → ' + n1(d1) + 'px');
    ok(d0 > 60, '[D-' + s.k + '-0] 출발이 호스트 «밖» 이다 — 안에서 시작하면 방향이 안 읽힌다', n1(d0) + 'px');
  }
  /* 훈련은 알약이 실재하므로 «알약에서 출발한다» 를 문자 그대로 못박는다 */
  const pillD = await p.evaluate(() => {
    const q = fxSpendFrom('gold', document.querySelector('#trCards [data-tr="atk"]'));
    const pill = fxPill(FXCUR.gold); const pr = pill ? fxPt(pill.querySelector('i')) || fxPt(pill) : null;
    return (q && pr) ? Math.hypot(q.x - pr.x, q.y - pr.y) : null;
  });
  ok(pillD !== null && pillD < 1,
     '[D-pill] ★ 훈련의 출발 자리가 **골드 알약 그 자체**다(«알약 → 카드» 를 문자 그대로)', n1(pillD) + 'px');

  /* ── [E] 금액 ─────────────────────────────────────────────────────── */
  console.log('\n[E] 금액 — 주인이 지운 것은 «금액» 이고, 남긴 것은 알약 «움푹» 이다');
  const trainAdd = R.train ? R.train.G.add : [];
  const minus = trainAdd.filter(a => /\bfx-plus\b/.test(a.cls) && /−/.test(a.txt));
  ok(minus.length === 0, '[E1] ★ 훈련 강화에서 «−n» 금액 플로터가 0건이다(fxPay · 488 사다리 둘 다)',
     minus.map(a => a.txt).join(',') || '0건');
  ok(!/el\.textContent = '−' \+ fmtCur\(cur, n\);/.test(src),
     '[E2] `fxPay` 의 «−n» 노드 생성이 소스에서 사라졌다');
  ok(/pill\.classList\.add\('fx-pay'\);/.test(src) && (R.train ? R.train.G.dent >= 1 : false),
     '[E3] ★ 알약 «움푹»(.fx-pay)은 **남았다** — 43회차가 고친 «upg 만 HUD 반응 0» 회귀 금지',
     '실측 ' + (R.train ? R.train.G.dent : '?') + '건');

  /* ── [F] 518 ─────────────────────────────────────────────────────── */
  console.log('\n[F] 518 — 같은 씬에서 «획득 방향» 은 여전히 0 이다');
  for (const s of SITES) {
    const r = R[s.k]; if (!r) continue;
    const gainFly = r.G.add.filter(a => /\bfx-fly\b/.test(a.cls) && !/\bfx-spd\b/.test(a.cls));
    /* ⚠ `fx-delta`(«+2.4 공격력» 강화 델타)는 **획득 표시가 아니다** — 58 14회차가 «방금 오른 스탯» 을
       말하려고 세운 자리이고 518 이 문제 삼은 «재화 획득» 과는 어휘가 다르다(재화 알약도 안 건드린다).
       1회차에 이 항이 그것을 세어 빨갰다 — 세는 대상의 결함이었다. */
    const gainPlus = r.G.add.filter(a => /\bfx-plus\b/.test(a.cls) && /\+/.test(a.txt)
                                      && !/\bhb\b/.test(a.cls) && !/\bfx-delta\b/.test(a.cls));
    const lit = r.G.add.filter(a => /\bfx-lit\b/.test(a.cls));
    ok(gainFly.length === 0 && gainPlus.length === 0 && lit.length === 0,
       '[F-' + s.k + '] ★ ' + s.n + ' — 획득 비행 0 · 획득 «+n» 0 · 딤 위 알약 복제 0',
       gainFly.length + ' / ' + gainPlus.length + ' / ' + lit.length);
  }

  /* ── [G] 상한 ─────────────────────────────────────────────────────── */
  console.log('\n[G] 상한 — 543 규약(개수×잉크 맞바꿈), FXMAX 드롭 0');
  const peak = Math.max(...SITES.map(s => (R[s.k] ? R[s.k].G.peak : 0)));
  ok(peak > 0 && peak < K.FXMAX, '[G1] `#fxl` 최고 동시 노드 < FXMAX', peak + ' < ' + K.FXMAX);
  const cnt = SITES.map(s => (R[s.k] ? R[s.k].G.add.filter(a => /\bfx-spd\b/.test(a.cls)).length : 0));
  ok(cnt.every(c => c >= 3 && c <= 12),
     '[G2] 자리마다 3~6개 × (첫 발 + 정산) — 밴드 피치 ' + K.FX3_BSPITCH + 'px 로 센 값', cnt.join(' · '));

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 알갱이를 무력화하면 이 게이트가 빨개지고, 종전 앰버가 되살아난다');
  await p.evaluate(() => { window.__spend0 = window.fxSpend; window.fxSpend = () => false;
    setTrSub('train'); renderTrain();
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
    window.__G583 = Object.assign(window.__G583, { add: [], peak: 0, dent: 0 }); });
  await p.waitForTimeout(220);
  {
    const bb = await (await p.$('#trCards [data-tr="atk"]')).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
    await p.waitForTimeout(260);
  }
  const RV = await p.evaluate(() => window.__G583);
  const rvSpd = RV.add.filter(a => /\bfx-spd\b/.test(a.cls)).length;
  const rvSpark = RV.add.filter(a => /\bfx-spark\b/.test(a.cls)).length;
  ok(rvSpd === 0, '[R1] ★ 되돌린 사본에서 화폐 알갱이가 0 이다(= 위 [B] 가 «이미 참인 것» 이 아니다)', rvSpd + '개');
  ok(rvSpark >= 10, '[R2] ★ 알갱이를 못 쏘면 **종전 앰버 버스트가 그대로 뜬다** — 바닥이 얕아지지 않았다',
     rvSpark + '개 (≥10)');
  await p.evaluate(() => { window.fxSpend = window.__spend0; });

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  ok(errs.length === 0, '[Z] 콘솔 에러 0');
  await b.close();
  console.log('\nVERIFY583 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
