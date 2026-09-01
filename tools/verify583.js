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
 *   [C] 크기   — 렌더 상자가 **660 산식**(구슬 24~34px × `FX_CIC_SC`)과 같다 · 찍힌 픽셀이 바뀐다
 *                (⚑ 660 이관 — 종전 543 산식 `ics × fxGrainSc × FX3_FLYS` 는 «화면을 가로지르던»
 *                 비행 알갱이의 값이라 74px 버튼 안에 안 들어간다. «구슬보다 크다»(주인 583)는
 *                 아래 [C-big] 이 그대로 지킨다)
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
  /* ⚑ 660 — **문자열 전체를 박아 두던 것을 뜻으로 바꿨다.** 종전 정규식은 표의 리터럴을 통째로
     고정해서, 표에 **칸이 하나 늘기만 해도** 빨개졌다(2026-09-01 실측: 666 이 유물 버스트를 위해
     `relic:'relic'` 을 더하자 이 항만 빨갛고 나머지 35 항은 전부 초록이었다 — 결함이 아니라 자의 취약함이다).
     이 항이 묻는 것은 «표가 **한 벌**인가» 이지 «표에 칸이 몇 개인가» 가 아니다. 세 조각으로 나눠 묻는다:
       ⓐ 선언이 **딱 하나**(둘이면 그 순간 «표 두 벌» 이다) ⓑ 세 탭이 **그 표에서** 제 화폐를 얻는다
       ⓒ 호출부가 화폐 문자열을 손으로 적지 않는다(아래 [A2b])
     ⇒ 표가 늘어나는 것(666 유물 등)은 통과하고, **갈라지는 것**은 그대로 빨개진다. */
  const payDecl = (src.match(/const PAY_CUR = \{[^}]*\}/g) || []);
  ok(payDecl.length === 1
     && /train:'gold'/.test(payDecl[0]) && /rune:'rstone'/.test(payDecl[0]) && /temper:'tstone'/.test(payDecl[0]),
     '[A2] ★ «이 자리는 무엇으로 사는가» 가 **한 표**다(선언 1개 · 세 탭이 전부 거기 있다 — 402 «표 두 벌» 방지)',
     '선언 ' + payDecl.length + '개 · ' + (payDecl[0] || '').slice(0, 90));
  /* ⓒ — 호출부가 표를 안 거치고 화폐를 손으로 적으면 «두 벌» 이 된다(660 이 버스트 아이콘을
     `PAY_CUR` 에서만 받게 한 것과 같은 규약 · `verify660` [A7~A10] 의 짝). */
  ok(!/upFx\('(train|rune|temper):'[^)]*'(gold|rstone|tstone)'/.test(src),
     "[A2b] ★ 세 탭의 호출부가 화폐 문자열을 **손으로 안 적는다**(전부 `PAY_CUR` 를 지난다)");
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

  const K = await p.evaluate(() => ({ FXMAX, FX3_FLYS, FX3_LAND, FX3_BSPITCH, CIC_SC: FX_CIC_SC,
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
        /* ⚑ 660 이관 — 거리의 기준점을 **호스트 중심 → 발원(강화 버튼) 중심**으로 옮겼다.
           583 이 호스트 중심을 쓴 것은 그때 질문이 «알갱이가 호스트 **쪽으로** 오는가» 였기
           때문이다. 660 의 질문은 «발원에서 **밖으로** 퍼지는가» 이고, 발원은 호스트 한복판이
           아니다(훈련 `.cb` 는 카드 **하단**) — 호스트 중심에서 재면 «퍼짐» 이 «가까워짐» 으로
           읽힌다(1회차 실측 194.6 → 186.8px 이 그 그림이다). */
        const bs = h ? (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim() : '';
        const bh = (h && bs && h.querySelector(bs)) || h;
        const hr = bh ? bh.getBoundingClientRect() : null;
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
        /* ⚑ 660 이관 — 따라갈 대상이 `.fx-spd`(폐지) → **`.fx-cic`**(버스트 아이콘)다.
           «한 무리만 따라간다»(619 17회차)는 여기서 **더 중요해졌다** — 660 은 틱마다 독립으로
           스폰하고 세대가 겹치므로(주인 «겹침 허용»), 전부 모으면 무리 중심이 늘 버튼 중심에
           눌러앉아 [D-o] 가 아무것도 못 묻는다. 첫 무리만 따라가면 그 무리의 «퍼짐» 이 그대로 읽힌다. */
        let live = [...document.querySelectorAll('#fxl .fx-cic')];
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
          /* ⚑⚑ 660 이관 — `d` 를 «**무리 중심**과 발원 사이 거리» 에서 «**입자들의 평균 반경**» 으로
             바꿨다. 583 의 비행은 한 방향으로 가는 무리라 중심 거리가 곧 진행이었지만, 660 의 버스트는
             **사방으로 등방으로** 퍼진다 — 대칭 링의 중심은 발원에 그대로 눌러앉아 **한 픽셀도 안 움직인다**
             (1회차 훈련 실측 5.0 → 2.8px 이 정확히 그 그림이다. 룬·단련이 통과한 것은 링이 한쪽에서
             가둠에 눌려 중심이 우연히 밀렸기 때문이지 «퍼져서» 가 아니다 — **셋 다 자가 틀렸던 것**이다).
             퍼짐은 중심이 아니라 **반경**에 있다. 문턱·방향·의미는 그대로 두고 재는 양만 옮긴다. */
          const ox = hr.x + hr.width / 2, oy = hr.y + hr.height / 2;
          out.push({ t: Math.round(performance.now() - t0), n: g.length,
                     d: g.reduce((a, q) => a + Math.hypot(q.x - ox, q.y - oy), 0) / g.length,
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
    /* ⚑ 660 이관 — 종전에는 `fxSpendFrom()`(폐지된 비행의 출발 자리)을 직접 불러 기록했다.
       678 이 그 함수를 선언째 걷으면 이 자가 같이 죽으므로, 지금은 **버스트가 실제로 태어난 자리**
       (`--burst-to` 가 가리키는 강화 버튼의 중심)를 기록한다 — 같은 칸의 뜻을 살아 있는 축으로 옮긴 것이다. */
    const from = await p.evaluate(s => {
      const h = document.querySelector(s.host); if (!h) return null;
      const sel = (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim();
      const b = (sel && h.querySelector(sel)) || h;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    }, s);
    R[s.k] = { G, tr, from, hostClip, before, mid };
    await p.waitForTimeout(400);
  }

  /* ── [B] 신원 ─────────────────────────────────────────────────────── */
  console.log('\n[B] 신원 — 자리마다 «그 자리가 쓰는 화폐» 이고, 자산이 실제로 그려졌다');
  for (const s of SITES) {
    const r = R[s.k]; if (!r) continue;
    /* ⚑⚑ 660 이관 — **표본을 `.fx-spd` 에서 `.fx-cic` 로 옮겼다.** 이 절이 묻는 것
       («그 자리가 쓰는 화폐로 말하는가 · 자산이 실제로 그려졌는가»)은 583 의 본체이고
       **그대로 살아 있다** — 바뀐 것은 그 말을 하는 부품이다. 주인 지시 658·660 이
       «알약 → 버튼» 비행(`.fx-spd`)을 폐지하고 «버튼에서 터지는 아이콘 버스트»(`.fx-cic`)로
       갈아 끼웠으므로, 자도 같은 자리를 새 부품에서 읽는다(333 «자리를 비우지 마라»).
       ⚠ 폐지 자체는 아래 [D] 가 **방향을 뒤집어** 지킨다. */
    const spd = r.G.add.filter(a => /\bfx-cic\b/.test(a.cls));
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
    /* ⚑⚑ 660 이관 — **산식이 바뀌었다.** 종전 값(`ics 55 × 잉크보정 × FX3_FLYS 2.1` = 93~128px)은
       알갱이가 **화면을 가로질러 날던** 시절의 크기다. 660 이 스폰을 강화 버튼 안으로 못 박으면서
       그 값은 산술적으로 못 들어간다(가장 얇은 호스트 단련 `.tb` 는 **74px**).
       ⇒ 자리를 비우지 않고 **버스트 자신의 계약**으로 갈아 끼운다: 구슬(24~34px)에 `FX_CIC_SC`
       를 곱한 38~54px. 아래 [C-big] 이 «구슬보다 크다» 는 주인 지시(583)를 그대로 지킨다.
       ⚠ 문턱은 **한 칸도 안 넓혔다** — 종전 ±2% 를 그대로 쓰되 구간(38~54)의 양 끝에 댄다. */
    /* ⚠ 재는 것은 **안쪽 아이콘**이고 그 놈은 `--fxgs`(543 재화별 잉크 보정)를 탄다 —
       바깥 `<s>` 상자(24~34 × FX_CIC_SC)에 그 보정을 곱해야 같은 값을 묻는다.
       종전 543 산식도 `ics × fxGrainSc × FX3_FLYS` 로 **같은 세 축**이었다(가운데 축은 그대로다). */
    const lo = 24 * K.CIC_SC * K.gs[s.cur], hi = 34 * K.CIC_SC * K.gs[s.cur];
    const got = Math.max(...r.tr.map(x => x.w), 0);
    ok(got >= lo * 0.98 && got <= hi * 1.02,
       '[C-' + s.k + '] 버스트 아이콘 폭이 660 산식(구슬 24~34 × FX_CIC_SC ' + n1(K.CIC_SC)
       + ' × 잉크보정 ' + n1(K.gs[s.cur]) + ')과 같다',
       '실측 ' + n1(got) + ' vs 구간 ' + n1(lo) + '~' + n1(hi));
    ok(diffPct(r.before, r.mid) > 0,
       '[C-' + s.k + '-px] 찍힌 픽셀 — 강화 중 호스트 영역이 실제로 달라진다');
  }
  ok(Math.max(...SITES.map(s => (R[s.k] ? Math.max(...R[s.k].tr.map(x => x.w), 0) : 0)))
     > 34,
     '[C-big] ★ 주인 지시 «알갱이 크기 더 크게» — 종전 방사형 불꽃 상한(34px)보다 크다',
     '최대 ' + n1(Math.max(...SITES.map(s => (R[s.k] ? Math.max(...R[s.k].tr.map(x => x.w), 0) : 0)))) + 'px');

  /* ── [D] 방향 ─────────────────────────────────────────────────────── */
  /* ⚑⚑ 660 이관 — **이 절은 방향이 통째로 뒤집혔다.** 583 이 세운 «알약·보유 표시 → 카드» 비행은
     주인 지시 658(«골드가 훈련 버튼쪽으로 가는 연출 없애기. 존나 후지다») · 660(«스폰 위치는
     강화 버튼뿐 · 아이콘쪽에 이펙트 안뜨게»)이 **폐지**했다.
     ⇒ 333 처방대로 **항을 지우지 않고 반대 방향으로 갈아 끼운다** — 그냥 지웠으면
       «658·660 이 통째로 되돌아가도 초록인 게이트» 가 된다. 두 벌로 묻는다:
       ① 그 비행이 **한 건도 안 난다**(폐지의 직접 단언)
       ② 지금의 방향은 «버튼 **밖으로** 퍼진다» 다(버스트의 뜻 — 안으로 모이면 그것이 비행이다) */
  console.log('\n[D] 방향 — 660: «버튼에서 바깥으로 퍼진다» (583 의 «알약 → 카드» 비행은 폐지)');
  for (const s of SITES) {
    const r = R[s.k]; if (!r) continue;
    const fly = r.G.add.filter(a => /\bfx-spd\b/.test(a.cls));
    ok(fly.length === 0,
       '[D-' + s.k + '] ★ ' + s.n + ' — «알약·보유 표시 → 버튼» 비행(`.fx-spd`)이 **0건**(658·660 폐지)',
       fly.length + '건');
    if (!r.tr.length) { ok(false, '[D-' + s.k + '-s] 궤적 표본이 있다'); continue; }
    const d0 = r.tr[0].d, d1 = r.tr[r.tr.length - 1].d;
    console.log('  · ' + s.n + ' — 발원에서 평균 반경 ' + n1(d0) + ' → ' + n1(d1) + 'px');
    ok(d1 >= d0 - 2,
       '[D-' + s.k + '-o] ★ 버스트가 발원(강화 버튼)에서 **밖으로** 퍼진다 — 평균 반경이 안 줄어든다'
       + '(줄면 그것이 폐지된 «버튼으로 모이는» 비행이다)',
       n1(d0) + ' → ' + n1(d1) + 'px');
  }
  /* ⚑ 660 — 종전 [D-pill](«출발 자리가 골드 알약 그 자체») 은 `fxSpendFrom` 을 직접 불러
     그 함수의 계약을 물었다. 658·660 이 그 축을 폐지했고 그 함수는 소비처가 0 이라 675 가
     선언째 걷는다 — 그때 이 항이 같이 죽지 않게 **지금 «아무도 안 부른다» 로 갈아 끼운다**. */
  ok(!/(?<!function )\bfxSpend\(/.test(src),
     '[D-pill] ★ `fxSpend()` 호출이 **0건**이다 — «알약 → 버튼» 축이 소스에서 죽었다(658·660 · 678 이 선언째 걷는다)');

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
  /* ⚑ 660 이관 — 표본이 `.fx-cic` 로 옮겨졌고 **개수 계약도 바뀌었다**: 종전은 «첫 발 + 정산»
     두 번의 비행 무리(3~6개씩)였고, 지금은 **홀드 틱마다 독립 스폰**(`UPFX_N` 4알 × 틱 수)이다.
     상한은 자가 다시 적지 않는다 — `UPFX_CAP`(36)이 정하고 [G1] 이 `FXMAX` 를 본다.
     하한 3 은 **한 칸도 안 내렸다**(«무리가 실제로 난다» 를 묻는 그 값 그대로). */
  const cnt = SITES.map(s => (R[s.k] ? R[s.k].G.add.filter(a => /\bfx-cic\b/.test(a.cls)).length : 0));
  ok(cnt.every(c => c >= 3 && c <= K.FXMAX),
     '[G2] 자리마다 버스트 아이콘이 3알 이상 · `FXMAX` 아래(660 — 틱마다 독립 스폰)', cnt.join(' · '));

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
