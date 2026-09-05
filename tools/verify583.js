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
 *   [A] 구조   — (678 이관) 소모 비행 `fxSpend` 계열이 **선언째 없다** · `PAY_CUR` 한 표 ·
 *                543 공용 축은 살아 있고 획득 비행이 읽는다 · `.fx-spd` CSS 도 없다
 *   [B] 신원   — 세 자리의 알갱이가 각각 gold · rstone · tstone 이고 **자산이 실제로 로드됐다**
 *   [C] 크기   — 렌더 상자가 **제품 크기 사슬 전부**(구슬 24~34 × `hsc` × `--burst-sz` ×
 *                `FX_CIC_SC` × `fitK` × 잉크보정)와 같다 · 알이 «버튼이 허용하는 최대» 까지 자란다 ·
 *                찍힌 픽셀이 바뀐다
 *                (⚑ 898 이관 — 종전 660 산식은 `hsc`·`szs`·`fitK` 세 축을 몰라 제품을 «절반» 으로
 *                 읽었다. `probe898` 이 갈래를 갈랐다: 제품 무죄 · 자가 낡음. 상세는 [C] 머리말)
 *   [C-big]   — 주인 지시 «알갱이 크기 더 크게» 의 살아 있는 몸 = `FX_CIC_SC`
 *                (아이콘 알이 구슬보다 작지 않다 · 가둠이 안 무는 자리에서는 실제로 더 크다.
 *                 종전 «절대 34px 초과» 는 838 `fitK` 이후 산술적으로 못 넘는 값이라 갈아 끼웠다)
 *                (⚑ 902 이관 — «작지 않다» 는 **정수 양자화를 뺀 사슬**에 허용 0 으로 묻는다.
 *                 아이콘 갈래에만 `Math.round` 가 한 번 더 있어 대수적으로 같은 값이 정수로만
 *                 1px 갈리던 것이 이 항의 플레이키였다. 정수 쪽은 [C-big-q] 가 «갈림 ≤ 1px» 로
 *                 따로 지킨다 · 되돌림 짝은 [R4])
 *   [D] 방향   — 출발이 «알약·보유 표시», 도착이 호스트. 거리 단조 감소(획득의 반대)
 *                (⚑ 906 이관 — `[D-*-o]` 는 «창 끝까지 **살아남은 알들**의 처음 반경 → 끝 반경» 을
 *                 견준다. 종전에는 «첫 표본 **전원** 평균 → 창 끝 **생존자** 평균» 이라 두 끝값의
 *                 집합이 달라 이동과 표본 구성이 섞였고, 멀리 간 알이 먼저 죽으면 **아무도 안
 *                 모였는데** 평균이 내려가 빨개졌다(수리 전 14회에 1회). 문턱은 한 칸도 안 넓혔다 —
 *                 판정 한 벌은 `tools/dspread906.js` · 되돌림 짝은 [R5]·[R6] · 재현은 `probe906`)
 *   [E] 금액   — `fxPay` «−n» 0건 · 488 훈련 사다리 «−n» 0건 · 알약 «움푹» 1건(43회차 유지)
 *   [F] 518    — 같은 씬에서 «획득 방향» 노드(알약으로 가는 비행·`+n`·딤 위 복제)는 0
 *   [G] 상한   — `#fxl` 최고 동시 노드 < FXMAX (543 규약 — 드롭 0)
 *   [R] 되돌림 — (678 이관) 660 이 세운 «버튼 아이콘 버스트» 를 무력화하면 화폐 아이콘 0 ·
 *                종전 앰버 스파크는 그대로다 · (898 신설 [R3]) `FX_CIC_SC` 를 1 로 되돌린 **제품
 *                사본**에서 단련 알이 지금 판의 상한에 못 닿는다 = [C-big-f] 가 무른 항이 아니다 ·
 *                (902 신설 [R4]) 같은 상자·같은 사슬에 배수만 0.8 을 넣으면 [C-big] 이 빨개진다 ·
 *                (906 신설 [R5]·[R6] — 짝) 실측 궤적을 산수로 되돌린다: 알이 안 움직이고 멀리 간
 *                절반만 죽은 사본은 옛 자만 빨갛고 **새 자는 초록**([R5] — 구성 축이 실제로 걷혔다) ·
 *                소실 없이 모두 발원 쪽으로 모인 사본은 **새 자도 빨강**([R6] — 문턱을 넓힌 것이 아니다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
/* ⚑ 906 — [D-*-o] 의 판정 한 벌. `probe906` 이 **같은 모듈**을 쓴다(402 사본 금지) */
const { spread, TOL: DTOL } = require('./dspread906');

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
  /* ⚑⚑ 678 이관 — **방향을 뒤집었다.** 종전 이 항은 «부품 `fxSpend` / 출발 자리 `fxSpendFrom` 이
     있다» 였다(619 9회차까지의 뜻). 660(= 658, 주인 «골드가 훈련 버튼쪽으로 가는 연출 없애기»)이
     호출부 둘을 걷어 소비처가 0 이 됐고 **678 이 선언째 걷었으므로**, 있다고 묻는 것은 이제
     «폐지한 축이 되살아나 있어야 통과» 라는 뜻이 된다 — 333 처방대로 **자리를 비우지 않고 뜻을 뒤집는다**.
     ⓐ 죽은 선언이 0개 · ⓑ 그 자리를 대신하는 것(`upFx` 의 버튼 버스트)이 살아 있다 — 둘을 같이 묻는다
     (ⓑ 를 안 물으면 «둘 다 없어도 초록» 인 자가 된다). */
  ok(!/function fxSpend\(/.test(src) && !/function fxSpendFrom\(/.test(src) && /function upFx\(/.test(src),
     '[A1] ★ 소모 알갱이 비행(`fxSpend`·`fxSpendFrom`)이 **선언째 없다**(660 폐지 · 678 철거) — 그 자리는 `upFx` 의 버튼 버스트가 대신한다');
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
  /* ⚑⚑ 678 이관 — 종전 [A3]·[A4] 는 **`fxSpend` 본문**을 읽어 «크기 축이 543 상수뿐인가» 를 물었다.
     본문이 사라졌으므로 물을 대상이 없다. 그런데 **묻던 성질은 안 죽었다** — 543 축은 획득 비행이
     계속 쓰고 있고, 678 이 그 축까지 딸려 지웠으면 이 자가 조용해선 안 된다(LESSONS 264-①·9263-②:
     «지우는 김에» 가 공용 부품을 데려가는 것이 실제로 나던 사고다). ⇒ 같은 성질을 **살아 있는 쪽**에
     대고 묻는다: ⓐ 543 축 넷이 선언돼 있고 ⓑ 획득 비행(`fxFly`)이 실제로 그것을 읽는다. */
  /* ⚠ 읽는 쪽은 `fxFly`(스폰)가 아니라 **`fxTick`(획득 비행 애니메이터)** 이다 — 크기 축은
     프레임마다 굴러가는 그 함수가 쓴다(1회차에 `fxFly` 로 물었다가 이 항만 빨갰다). */
  const flyBody = (src.match(/function fxTick\(dt\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(/\bFX3_FLYS\s*=\s*[\d.]+\s*\*\s*FX_GRAIN_SC/.test(src) && /\bFX3_LAND\s*=\s*[\d.]+/.test(src)
     && /const FX3_BSPITCH\s*=/.test(src) && /const fxGrainSc\s*=/.test(src),
     '[A3] ★ 크기·개수 축 543 상수 넷이 **살아 있다**(FX3_FLYS · FX3_LAND · FX3_BSPITCH · fxGrainSc) — 678 이 소모만 걷고 공용 축은 안 데려갔다');
  ok(/FX3_FLYS/.test(flyBody) && /FX3_LAND/.test(flyBody) && (src.match(/fxGrainSc\(/g) || []).length >= 2,
     '[A4] ★ 획득 비행 애니메이터(`fxTick`)가 그 축을 실제로 읽는다 — 선언만 남은 «죽은 상수» 가 아니다',
     'fxGrainSc 호출 ' + (src.match(/fxGrainSc\(/g) || []).length + '곳');
  /* ⚑⚑ 678 이관 — [A5] 도 [A1] 과 같은 벌이다(CSS 쪽). 종전은 «`.fx-fly.fx-spd` 규칙이 있다» 였다. */
  ok(!/\.fx-fly\.fx-spd\{/.test(src) && /\.fx-land\{animation:fxLand/.test(src),
     '[A5] ★ CSS `.fx-fly.fx-spd`(소모 방향) 가 **없다**(678 철거) — 획득 쪽 몸(`.fx-fly`)·착지(`.fx-land`)는 그대로다');

  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  /* ⚑ 678 이관 — 종전 이 줄은 `typeof fxSpend === 'function'` 을 기다렸다. 678 이 그 선언을
     걷었으므로 그대로 두면 **자가 30초 타임아웃으로 즉사**한다(319 «게이트가 죽은 함수를 부른다»).
     기다릴 것은 «이 자가 보는 축이 섰는가» 다 ⇒ 살아 있는 소모 연출의 입구 `upFx` 로 옮긴다. */
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
  await p.waitForTimeout(1200);
  /* ⚠ 표본 재화는 **작게** 넣는다 — 1e18 은 float64 ulp 가 128 이라 «−45» 를 빼도 값이 안 바뀌어
     `fxWatch` 의 감소 판정이 통째로 안 돈다(probe583 1회차가 그 함정에 걸렸다). */
  await p.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6;
    openTrain(); });   /* 613 — 단련은 tstone 직접 지불(포인트 시드 불요·pts 는 죽은 필드) */
  await p.waitForTimeout(400);
  await p.evaluate(INSTALL);

  /* ⚑⚑ 898 이관 — [C] 가 읽을 축이 **넷 더** 늘었다(아래 [C] 머리말). 상수는 손으로 안 적고
     제품에게 묻는다 — 402 «표 두 벌» 방지이자, 상수가 바뀌면 자가 따라오게 하는 자리다. */
  const K = await p.evaluate(() => ({ FXMAX, FX3_FLYS, FX3_LAND, FX3_BSPITCH, CIC_SC: FX_CIC_SC,
    FITS: FXB_FITS, SZMIN: FXB_SZMIN, SZMAX: FXB_SZMAX, DMAX: FXB_DMAX,
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
    /* ⚑⚑ 898 — [C] 가 쓸 **살아 있는 축**(호스트 신고 두 값)을 발원 버튼에게 직접 묻는다.
       ⚠ **상자는 여기서 재면 안 된다** — 제품의 `fitK` 는 버스트가 태어나는 **눌린 순간**의
         `fxRect(버튼)` 을 쓰는데, 룬·단련 버튼은 눌림 연출에서 ×1.02 로 커진다(실측 룬
         420×112 → 428.4×114.24 · 단련 496×173 → 505.9×176.5 · 훈련은 Δ0). 쉬는 상자로 재면
         그 2% 가 그대로 «알 1px» 로 어긋난다 ⇒ 상자는 아래 홀드 창 **안에서** 표본으로 모은다. */
    const AX = await p.evaluate(s => {
      const h = document.querySelector(s.host); if (!h) return null;
      const sel = (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim();
      const t = (sel && h.querySelector(sel)) || h;
      const st = getComputedStyle(t);
      const sz = parseFloat(st.getPropertyValue('--burst-sz'));
      const ft = parseFloat(st.getPropertyValue('--burst-fit'));
      return { sel: sel, szs: (sz > 0 && sz <= 1) ? sz : 1,
               fits: (ft > 0 && ft <= FXB_FITS) ? ft : FXB_FITS };
    }, s);
    const before = await p.screenshot({ clip: { x: hostClip.x, y: hostClip.y, width: hostClip.width, height: hostClip.height } });
    const bb = await (await p.$(s.btn)).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.mouse.down();
    /* 궤적 — 40ms 격자로 알갱이 무리 중심과 호스트 중심 사이 거리를 잰다 */
    const traj = p.evaluate(s => new Promise(res => {
      const out = []; const t0 = performance.now(); let wave = null, ids = null;
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
        /* ⚑⚑ 906 — 첫 무리를 굳힐 때 **알마다 번호를 매긴다.** 종전에는 집합만 굳혀서 창 끝의
           평균을 «첫 표본 **전원**» 의 평균에 댔는데, 창 안에서 알이 죽으면 두 끝값의 **집합이
           달라진다** — 아무도 안 모였는데 평균이 내려간다(멀리 간 알이 먼저 죽는다:
           `probe906` [D2] 실측 소실 알 86.2px vs 생존자 71.5px). 번호가 있어야 아래 [D-*-o] 가
           «창 끝까지 살아남은 알들의 **처음** 반경» 을 되찾아 같은 집합끼리 견줄 수 있다. */
        let live = [...document.querySelectorAll('#fxl .fx-cic')];
        if (!wave && live.length) {                           /* 첫 무리를 굳힌다 */
          wave = new Set(live); ids = new Map(); live.forEach((n, i) => ids.set(n, i));
        }
        if (wave) live = live.filter(n => wave.has(n));
        /* ⚑⚑ 898 — 크기 자를 **둘로 갈랐다.** `getBoundingClientRect` 는 `@keyframes fxSpark` 의
           위상을 타서(알이 태어나 커졌다 사그라든다) «최대» 가 표본 위상 운에 흔들린다 —
           ±2% 문턱에 그대로 대면 플레이키다(344 계열). ⇒ **크기 계약은 `offsetWidth`**(레이아웃 폭 ·
           변환을 안 탄다 = 제품이 인라인으로 박은 `sz` 그 값)로 재고, rect 쪽 `w` 는 그대로 둔다
           (아래 [D] 의 반경·[C-*-px] 의 «찍힌 픽셀» 이 계속 쓴다). */
        const g = live.map(n => {
          const r = n.getBoundingClientRect();
          const im = n.querySelector('img.cic');
          const ir = im ? im.getBoundingClientRect() : r;
          const gsv = parseFloat(getComputedStyle(n).getPropertyValue('--fxgs')) || 1;
          return { i: ids ? ids.get(n) : -1,
                   x: r.x + r.width / 2, y: r.y + r.height / 2, w: ir.width, h: ir.height,
                   wn: (im ? im.offsetWidth : n.offsetWidth) * gsv, on: n.offsetWidth };
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
          /* ⚑ 898 — **눌린 순간의 발원 상자**도 같이 찍는다(위 AX 머리말: 제품의 `fitK` 가 이 값을 쓴다) */
          const fr = fxRect(bh);
          out.push({ t: Math.round(performance.now() - t0), n: g.length,
                     d: g.reduce((a, q) => a + Math.hypot(q.x - ox, q.y - oy), 0) / g.length,
                     /* ⚑ 906 — **알마다** 반경을 같이 남긴다(위 번호와 짝). 평균 `d` 는 지우지 않는다:
                        [D-*-o] 의 보고 줄과 [D-*-s] 가 계속 읽고, 906 은 «무엇을 견주는가» 만 바꿨다. */
                     r: g.map(q => ({ i: q.i, d: Math.hypot(q.x - ox, q.y - oy) })),
                     cx, cy, w: Math.max(...g.map(q => q.w)),
                     wnx: Math.max(...g.map(q => q.wn)), wnm: Math.min(...g.map(q => q.wn)),
                     onx: Math.max(...g.map(q => q.on)), onm: Math.min(...g.map(q => q.on)),
                     bw: fr ? fr.w : null, bh: fr ? fr.h : null,
                     gsv: g.length ? (g[0].wn / Math.max(1, g[0].on)) : null });
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
    R[s.k] = { G, tr, from, hostClip, before, mid, AX };
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
  /* ⚑⚑ 898 이관 — **산식이 또 바뀌었고, 이번엔 «자가 낡은» 쪽이었다.**
     660 이 세운 값(구슬 24~34 × `FX_CIC_SC` = 38~54px)은 그 뒤 세 작업이 크기 사슬에 축을 더하면서
     제품의 실제 크기와 갈라졌다 — `verify583` [C-train]·[C-rune]·[C-big] 3건이 그래서 빨갰다(898).
       · 619 6·12회차 → `hsc`  (호스트 넓이 비례 · 상한 `FXB_DMAX/FXB_SZMAX`)
       · 814 5회차   → `szs`  (호스트 신고 `--burst-sz`)
       · 838 2·3·6회차 → `fitK`(호스트 신고 `--burst-fit`/`FXB_FITS` — «날아갈 방» 을 남기는 배수)
     `probe898` 이 갈래를 갈랐다: 실측이 **사슬 전부와는 맞고**(제품 무죄 · 갈래 ⓐ 기각)
     **660 산식과는 어긋난다**(위끝 차 훈련 187% · 룬 122% · 단련 44% · 갈래 ⓑ 확인).
     ⚠ **단련이 초록이던 것은 헛초록이었다** — 두 구간이 겹쳐 실측이 우연히 낡은 창에 들었을 뿐이고,
       뽑기(rnd 24~34)의 위끝이 안 나오는 실행에서는 그대로 빨개진다(플레이키 · 344 계열).
     ⇒ 자리를 비우지 않고(333) **상수를 빼고 제품의 계약을 다시 유도**한다 — 아래 `chain()` 은
       살아 있는 상수 넷(`FX_CIC_SC`·`FXB_FITS`·`FXB_SZMIN`·`FXB_SZMAX`/`FXB_DMAX`)과 호스트가
       신고한 값(`--burst-sz`·`--burst-fit`)과 발원 상자만으로 구간을 **처음부터 계산**한다.
       제품의 `sz` 를 읽어 오는 것이 아니므로(그러면 «식이 갈려도 초록» 이다 — LESSONS 831)
       사슬에서 한 축이라도 빠지면 그 순간 빨개진다.
     ⚠ **문턱은 한 칸도 안 넓혔다** — 종전 ±2% 그대로다(334·796). 넓힌 것이 아니라 **댈 자리**를 옮겼다. */
  const CH = {};
  for (const s of SITES) {
    const r = R[s.k]; if (!r || !r.AX) { ok(false, '[C-' + s.k + '-ax] 발원 축을 읽었다'); continue; }
    const a = r.AX, gs = K.gs[s.cur];
    const box = r.tr.filter(x => Number.isFinite(x.bw) && x.bw > 0);
    if (!box.length) { ok(false, '[C-' + s.k + '-ax] 눌린 순간의 발원 상자 표본이 있다'); continue; }
    /* 눌림 연출이 상자를 흔들므로(×1.02) 표본의 **양 끝**으로 구간을 감싼다 — 한 순간의 값으로
       못을 박으면 그 2% 가 곧바로 «알 1px» 오차가 된다(위 AX 머리말 · 344 계열 플레이키 방지). */
    /* ⚑ 902 — `cic` 를 밖에서 넣을 수 있게 열어 뒀다(기본값 = 제품이 신고한 `FX_CIC_SC`).
       아래 §R4 되돌림 시험이 **같은 사슬 한 벌**로 «배수를 1 아래로 내리면 빨개진다» 를 굴린다 —
       사슬을 두 번 적으면 그 사본이 곧 다음 부패다(402 «사본을 지운다»). */
    const mk = (q, cic) => {
      const CIC = (cic === undefined ? K.CIC_SC : cic);
      const hsc = Math.min(Math.max(Math.sqrt(q.w * q.h) / 410, 1), K.DMAX / K.SZMAX);
      const cap = Math.max(K.SZMIN, a.fits * Math.min(q.w, q.h));   /* «버튼이 허용하는 만큼»(660·838) */
      const fitIC = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * a.szs * CIC));
      const fitPl = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * a.szs));  /* 같은 자리의 «구슬» 갈래 */
      /* 구슬 눈금 v(24~34) 하나가 낳는 **바깥 알 폭** — 제품의 두 번 반올림까지 그대로 따라간다 */
      /* ⚑⚑ 902 이관 — 같은 사슬의 **정수를 굳히지 않은** 짝(`icX`·`plX`)을 같이 낸다.
         아래 [C-big] 이 두 갈래를 견주는 항인데, 아이콘 갈래에만 `Math.round` 가 **한 번 더**
         있어서(`* K.CIC_SC` 를 따로 굳힌다) 가둠이 무는 자리에서는 대수적으로 같은 값이
         정수로만 1px 갈린다 — 그것이 902 가 재현한 플레이키의 전부다(`probe902` [2]·[3]:
         눌림 진폭 ±10% 구간의 train 14.2% · rune 18.6% 가 «아이콘 = 구슬 − 1» 이고,
         `Math.round` 를 빼면 세 자리 전부 역전 **0/5003**). ⇒ 뜻(«역전 금지»)은 반올림 없는
         쪽에 대고 묻고, 정수 쪽은 «갈림이 양자화 한 칸을 안 넘는가» 로 따로 묻는다. */
      return { hsc, cap, fitIC, fitPl,
               ic: v => Math.max(K.SZMIN, Math.round(Math.round(Math.round(v * hsc * a.szs) * CIC) * fitIC)),
               pl: v => Math.max(K.SZMIN, Math.round(Math.round(v * hsc * a.szs) * fitPl)),
               icX: v => Math.max(K.SZMIN, v * hsc * a.szs * CIC * fitIC),
               plX: v => Math.max(K.SZMIN, v * hsc * a.szs * fitPl) };
    };
    const bx = box.reduce((m, x) => (Math.min(x.bw, x.bh) > Math.min(m.w, m.h) ? { w: x.bw, h: x.bh } : m),
                          { w: box[0].bw, h: box[0].bh });          /* §R4 가 다시 굴릴 상자 */
    const sm = mk(box.reduce((m, x) => (Math.min(x.bw, x.bh) < Math.min(m.w, m.h) ? { w: x.bw, h: x.bh } : m),
                             { w: box[0].bw, h: box[0].bh }));      /* 가장 작게 눌린 순간 */
    const bg = mk(bx);                                              /* 가장 크게 부푼 순간 */
    const lo = sm.ic(24), hi = bg.ic(34);
    CH[s.k] = { cap: bg.cap, fitIC: bg.fitIC, fitPl: bg.fitPl, gs,
                icHi: bg.ic(34), plHi: bg.pl(34), icX: bg.icX(34), plX: bg.plX(34),
                rev: cic => mk(bx, cic),                            /* §R4 되돌림 시험이 쓴다 */
                lo, hi, hi31: sm.ic(31) };
    const all = r.tr.filter(x => Number.isFinite(x.onx));
    const got = Math.max(...all.map(x => x.onx), 0), gotMin = Math.min(...all.map(x => x.onm), 1e9);
    /* ① 계약 — 알이 «버튼이 허용하는 만큼» 을 **안 넘는다**(838 `fitK` 의 뜻) · 제품이 선언한
         바닥(`FXB_SZMIN`) 아래로도 안 내려간다.
       ⚠ 허용은 «±2% 또는 ±1px 중 큰 쪽» 이다. 넓힌 것이 아니라 **정수 양자화**를 적은 것이다 —
         사슬에 `Math.round` 가 두 번 있어 16~19px 짜리 알에서는 2% 가 0.4px, 즉 «맞아도 어긋난» 다.
         종전 ±2% 는 38~54px 구간의 값이었다(같은 비율이 그때는 1px 을 덮었다).
       ⚠⚠ **아래끝을 «구슬 눈금 24» 에 못박지 않는다** — 그렇게 하면 **구조적으로 플레이키**다.
         `fitK` 는 알이 태어나는 **그 순간의** 버튼 상자를 쓰는데, 621 눌림 연출이 홀드 내내 그
         상자를 흔든다(실측 단련 505.9 → 459.2 · 룬 428.4 → 388.9 = 9% 진폭). 40ms 격자로는
         그 골을 못 잡으므로 «가장 작게 눌린 순간» 을 아무리 표본에서 골라도 **자가 못 본 더 작은
         순간에 태어난 알**이 남는다(실행마다 단련 min 22 ↔ 26 으로 흔들렸다 — 344 계열).
         잴 수 없는 것을 문턱으로 세우지 않는다. 대신 **잴 수 있는 세 가지**로 계약을 가른다:
           ① 위끝을 안 넘는다(이 항) · ② 바닥 `FXB_SZMIN` 아래로 안 간다(이 항)
           ③ 위끝까지 실제로 자란다([C-*-hi]) — 셋이 함께 «사슬이 살아 있다» 를 못박는다. */
    const tol = v => Math.max(1, v * 0.02);
    ok(all.length > 0 && got <= hi + tol(hi) && gotMin >= K.SZMIN - 0.5,
       '[C-' + s.k + '] 버스트 알 폭이 **제품 크기 사슬 전부**(구슬 24~34 × hsc ' + n1(bg.hsc)
       + ' × --burst-sz ' + n1(a.szs) + ' × FX_CIC_SC ' + n1(K.CIC_SC) + ' × fitK ' + n1(bg.fitIC)
       + ')의 위끝을 안 넘고 바닥 FXB_SZMIN ' + K.SZMIN + ' 아래로도 안 간다',
       '실측 ' + n1(gotMin) + '~' + n1(got) + ' vs 위끝 ' + n1(hi) + ' · 바닥 ' + K.SZMIN);
    /* ② 위끝 — 알이 실제로 «버튼이 허용하는 만큼» 까지 자란다(사슬이 몰래 더 눌리면 빨개진다).
       ⚠ 눈금 34 를 요구하면 뽑기 운에 걸린다(50알 표본에서 34 가 안 나올 확률 ≈8%) — 상위 눈금
         **31** 에 댄다(같은 표본에서 안 닿을 확률 0.65^50 ≈ 1.6e-10 · 문턱이 아니라 표본 수의 산수다). */
    ok(got >= sm.ic(31) - tol(sm.ic(31)),
       '[C-' + s.k + '-hi] ★ 알이 «버튼이 허용하는 최대»(cap ' + n1(bg.cap)
       + 'px)까지 실제로 자란다 — 사슬이 몰래 더 눌리지 않았다',
       '실측 최대 ' + n1(got) + ' ≥ 눈금31 ' + n1(sm.ic(31)));
    /* ③ 잉크 보정 — 543 축(`--fxgs`)이 **살아서 걸린다**. 위 ①②는 바깥 상자만 보므로 이 항이 없으면
       재화별 잉크 등가 배수가 통째로 사라져도 초록이다(333 «한 항이 두 자리를 겸하면 한쪽이 사라져도 초록»). */
    const ink = all.map(x => x.gsv).filter(v => Number.isFinite(v) && v > 0);
    const inkAvg = ink.length ? ink.reduce((x, y) => x + y, 0) / ink.length : null;
    ok(inkAvg !== null && Math.abs(inkAvg - gs) <= 0.02,
       '[C-' + s.k + '-ink] ★ 안쪽 아이콘이 543 잉크 보정(`--fxgs`)을 **실제로 탄다**',
       '실측 ' + (inkAvg === null ? 'n/a' : inkAvg.toFixed(3)) + ' vs fxGrainSc(' + s.cur + ') ' + gs.toFixed(3));
    ok(diffPct(r.before, r.mid) > 0,
       '[C-' + s.k + '-px] 찍힌 픽셀 — 강화 중 호스트 영역이 실제로 달라진다');
  }
  /* ⚑⚑ 898 이관 — **[C-big] 의 «34px» 은 838 이후 산술적으로 못 넘는 값이다.**
     주인 지시 583 «알갱이 크기 더 크게» 의 종전 몸은 «절대 34px 초과» 였는데, 838 의 `fitK` 가
     알을 «버튼이 허용하는 만큼» 으로 누르면서 훈련 버튼(310×106 · `--burst-fit .18`)의 허용치가
     **19.1px**, 룬(420×112)이 **24.6px** 이 됐다 — 그 자리에서 34 를 요구하는 항은 **영원히 빨간
     게이트**다(348 §R 교훈: 전부를 기대하면 자가 죽는다). 그렇다고 지우면 주인 지시가 조용히
     사라진다(333) ⇒ **같은 지시의 살아 있는 몸으로 갈아 끼운다.**
     583 이 실제로 산 자리는 `FX_CIC_SC` 다 — «아이콘 알은 같은 자리의 구슬보다 크다».
     ⚠ 그 배수는 `fitK` 가 아이콘 갈래에서만 분모에 `FX_CIC_SC` 를 곱하는 탓에 **가둠이 무는
       자리에서는 상쇄된다**(훈련·룬에서 아이콘 상한 = 구슬 상한). 그래서 두 항으로 가른다:
         ⓐ 전 자리 — 아이콘 알이 구슬보다 **작지는 않다**(상쇄는 허용, 역전은 금지)
         ⓑ 가둠이 안 무는 자리(단련 `fitK(구슬)` = 1)에서는 **실제로 더 크다**
       ⓑ 가 없으면 «`FX_CIC_SC` 를 1 로 만들어도 초록» 이 된다(334) — 아래 §R3 가 그것을 못박는다.
     ⚑ 상쇄 자체가 옳은가는 이 자의 물음이 아니다 — **900 으로 등재**했다(주인 축). */
  /* ⚑⚑ 902 이관 — **이 항은 «자가 같은 값을 두 자로 쟀다» 로 플레이키했다**(무변경 트리 5회에 2회 빨강).
     `probe902` 가 갈래를 갈랐다: ⓐ 제품이 흔들린다 = **기각**(반올림 없는 사슬은 세 자리 전부 역전
     0/5003) · ⓑ 자의 정수 양자화 = **확인**(눌림 진폭 구간의 train 14.2% · rune 18.6% 가 «−1px»,
     그리고 **한 번도 −1px 을 넘지 않는다**). 뿌리는 산수 하나다 — 가둠이 무는 자리에서 두 갈래는
       ic = round(round(u·CIC_SC)·fitIC) · pl = round(u·fitPl) · fitIC = fitPl / CIC_SC
     라 **대수적으로 같은 식**인데, 아이콘 쪽만 안쪽 반올림을 한 번 더 돌아 그 잔차(≤0.5)가
     `fitIC` 배로 옮겨 붙는다 ⇒ 갈림은 구조적으로 **0 아니면 −1** 이다.
     ⚠ **문턱을 넓혀 풀지 않았다**(334·796 반려 규약) — 오히려 **좁혔다**:
       종전은 정수에 ±0.5 를 주고 물었고, 지금은 ⓐ 반올림 없는 사슬에 **0 을 주고**(아래 [C-big])
       ⓑ 정수 쪽은 «갈림이 양자화 **한 칸**을 안 넘는가» 라는 **새 항**으로 따로 묻는다([C-big-q]).
       ⇒ 실수 역전은 종전보다 **엄하게** 잡히고, 2px 이상 벌어지는 정수 역전도 그대로 빨개진다.
     ⚠ 같이 흔들린 `[D-train-o]` 는 **다른 병**이다 — `probe902` [D1]·[D2] 가 갈랐다(그쪽은 «어느
       입자를 보고 있는가» 축이고 이 항은 입자를 한 알도 안 본다). **906 으로 등재**했다. */
  {
    const ks = SITES.map(s => s.k).filter(k => CH[k]);
    const bad = ks.filter(k => CH[k].icX < CH[k].plX - 1e-9);
    ok(ks.length === SITES.length && bad.length === 0,
       '[C-big] ★ 주인 지시 «알갱이 크기 더 크게» — 아이콘 알이 같은 자리의 «구슬» 보다 **작지 않다**(정수 양자화를 뺀 사슬 · 허용 0)',
       ks.map(k => k + ' ' + n1(CH[k].icX) + '/' + n1(CH[k].plX)).join(' · ')
       + (bad.length ? ' · 역전 ' + bad.join('·') : ''));
    /* 정수 쪽 — 자리를 비우지 않는다(333). 위 항이 실수로 옮겨 갔다고 «제품이 실제로 굳히는 정수»
       를 아무도 안 보면, 사슬에 반올림이 **또** 끼어들어 2px·3px 로 벌어져도 조용하다. */
    const q2 = ks.filter(k => CH[k].icHi < CH[k].plHi - 1);
    ok(ks.length === SITES.length && q2.length === 0,
       '[C-big-q] ★ 정수로 굳은 두 값의 갈림이 **양자화 한 칸(1px)** 을 안 넘는다 — 넘으면 그것은 반올림이 아니라 사슬이 갈린 것이다',
       ks.map(k => k + ' ' + n1(CH[k].icHi) + '/' + n1(CH[k].plHi)).join(' · ')
       + (q2.length ? ' · 한 칸 초과 ' + q2.join('·') : ''));
    const free = ks.filter(k => CH[k].fitPl >= 0.999);           /* 가둠이 «구슬» 을 안 무는 자리 */
    ok(free.length > 0 && free.every(k => CH[k].icHi > CH[k].plHi + 0.5),
       '[C-big-f] ★ 가둠이 안 무는 자리에서는 `FX_CIC_SC` 가 실제로 알을 키운다(583 이 산 몸)',
       (free.join('·') || '없음') + ' · '
       + free.map(k => n1(CH[k].icHi) + ' > ' + n1(CH[k].plHi)).join(' · '));
  }

  /* ── [D] 방향 ─────────────────────────────────────────────────────── */
  /* ⚑⚑ 660 이관 — **이 절은 방향이 통째로 뒤집혔다.** 583 이 세운 «알약·보유 표시 → 카드» 비행은
     주인 지시 658(«골드가 훈련 버튼쪽으로 가는 연출 없애기. 존나 후지다») · 660(«스폰 위치는
     강화 버튼뿐 · 아이콘쪽에 이펙트 안뜨게»)이 **폐지**했다.
     ⇒ 333 처방대로 **항을 지우지 않고 반대 방향으로 갈아 끼운다** — 그냥 지웠으면
       «658·660 이 통째로 되돌아가도 초록인 게이트» 가 된다. 두 벌로 묻는다:
       ① 그 비행이 **한 건도 안 난다**(폐지의 직접 단언)
       ② 지금의 방향은 «버튼 **밖으로** 퍼진다» 다(버스트의 뜻 — 안으로 모이면 그것이 비행이다) */
  console.log('\n[D] 방향 — 660: «버튼에서 바깥으로 퍼진다» (583 의 «알약 → 카드» 비행은 폐지)');
  const DSP = {};                          /* ⚑ 906 — 자리별 퍼짐 판정. 아래 [R5]·[R6] 이 이 표본을 다시 굴린다 */
  for (const s of SITES) {
    const r = R[s.k]; if (!r) continue;
    const fly = r.G.add.filter(a => /\bfx-spd\b/.test(a.cls));
    ok(fly.length === 0,
       '[D-' + s.k + '] ★ ' + s.n + ' — «알약·보유 표시 → 버튼» 비행(`.fx-spd`)이 **0건**(658·660 폐지)',
       fly.length + '건');
    if (!r.tr.length) { ok(false, '[D-' + s.k + '-s] 궤적 표본이 있다'); continue; }
    /* ⚑⚑ 906 — **견주는 두 값을 같은 집합에서 낸다.** 종전에는 «첫 표본 전원 평균 → 창 끝 생존자
       평균» 이라 한 값에 축이 둘 섞였다(① 이동 ② 창 안에서 누가 죽었는가). 660 의 알은 수명이
       제각각이고 **멀리 간 알이 먼저 죽으므로**, 아무도 안 모였는데 평균이 내려가는 창이 생긴다 —
       그것이 이 항의 플레이키(수리 전 트리 14회에 1회 · [D-temper-o] 31.1 → 24.1px)였다.
       ⇒ 창 끝까지 **살아남은 알만** 골라 그 알들의 처음 반경(`d0s`)과 끝 반경을 견준다.
       ⚠ 문턱(2px)은 한 칸도 안 넓혔다 — 넓히는 것은 반려 조항(334·796)이고, 넓히면 «버스트가
         버튼으로 모여도 초록» 이 되어 658·660 폐지 축이 통째로 풀린다. 바뀐 것은 **집합**이다.
         그 사실은 아래 [R5](소실만 시킨 사본은 초록)·[R6](수렴 사본은 빨강)이 짝으로 못박고,
         `probe906` [D3]·[D4] 가 재현 쪽에서 같은 것을 못박는다.
       판정 한 벌은 `tools/dspread906.js` 하나다 — 자와 재현이 **같은 자**를 쓴다(402 사본 금지). */
    const sp = spread(r.tr);
    console.log('  · ' + s.n + ' — 발원에서 평균 반경 ' + n1(sp.d0) + ' → ' + n1(sp.d1) + 'px'
      + '  |  같은 집합(생존 ' + sp.surv + '/' + sp.tot + '알): ' + n1(sp.d0s) + ' → ' + n1(sp.d1s) + 'px');
    ok(sp.ok,
       '[D-' + s.k + '-o] ★ 버스트가 발원(강화 버튼)에서 **밖으로** 퍼진다 — 창 끝까지 살아남은 **같은 알들**의'
       + ' 반경이 안 줄어든다(줄면 그것이 폐지된 «버튼으로 모이는» 비행이다)',
       n1(sp.d0s) + ' → ' + n1(sp.d1s) + 'px · 생존 ' + sp.surv + '/' + sp.tot + '알(소실 ' + sp.lost
       + ') · 안으로 온 알 ' + sp.inward + ' · 전원 기준이었다면 ' + n1(sp.d0) + ' → ' + n1(sp.d1) + 'px');
    DSP[s.k] = sp;
  }
  /* ⚑ 660 — 종전 [D-pill](«출발 자리가 골드 알약 그 자체») 은 `fxSpendFrom` 을 직접 불러
     그 함수의 계약을 물었다. 658·660 이 그 축을 폐지했고 그 함수는 소비처가 0 이라 675 가
     선언째 걷는다 — 그때 이 항이 같이 죽지 않게 **지금 «아무도 안 부른다» 로 갈아 끼운다**.
     ⚑ 678 이 실제로 걷었고(2026-09-02) 이 항은 **한 글자도 안 고쳐도 초록**이다 — 갈아 끼운 자가
       옳았다는 증거다(호출 0건은 선언이 있든 없든 참이고, 선언 쪽은 [A1] 이 따로 못박는다). */
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
  /* ⚑⚑ 678 이관 — 종전 이 줄은 `window.fxSpend` 를 «무력화» 했다. 678 이 그 선언을 걷었으므로
     없는 전역에 함수를 꽂는 꼴이 되어 **아무것도 안 되돌리는 헛초록**이 된다(373 «초록인 이유를
     묻지 않으면 자가 자기모순을 품는다»). ⇒ 되돌릴 대상을 **살아 있는 소모 연출**로 옮긴다:
     660 이 그 자리에 세운 «강화 버튼 아이콘 버스트»(`upFx` → `fxBurst`)를 죽이면
     [R1] 버스트 아이콘이 0 이 되고, [R2] 앰버 스파크(다른 층)는 그대로 남는다 —
     묻던 뜻(«위 [B]·[C] 가 이미 참인 것이 아니다» · «바닥이 얕아지지 않았다»)은 그대로다. */
  await p.evaluate(() => { window.__burst0 = window.fxBurst;
    /* ⚠ 아이콘 «자리» 만 뺀다 — 호출을 통째로 막으면 앰버 스파크까지 같이 사라져
       [R2] 가 «바닥» 을 못 잰다(1회차에 그렇게 물어 0개가 나왔다). */
    window.fxBurst = function(t, col, n, strict, iv, ic){ return window.__burst0.call(this, t, col, n, strict, iv, null); };
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
  const rvCic = RV.add.filter(a => /\bfx-cic\b/.test(a.cls) || a.cur).length;
  const rvSpark = RV.add.filter(a => /\bfx-spark\b/.test(a.cls)).length;
  ok(rvCic === 0, '[R1] ★ 되돌린 사본에서 **화폐 아이콘 연출이 0** 이다(= 위 [B]·[C] 가 «이미 참인 것» 이 아니다)', rvCic + '개');
  /* ⚠ 문턱을 10 → 1 로 내린 것은 «무르게 푼 것» 이 아니라 **660 이 바꾼 사실**이다 —
     583 시절 이 자리는 «화폐 알갱이(비행)» 와 «앰버 버스트» 두 층이라 알갱이를 끄면 앰버 14개가
     그대로 남았다. 660 이 두 층을 **아이콘 버스트 한 벌**로 합쳤으므로 아이콘을 빼고 남는 것은
     같은 버스트의 «아이콘 없는 스파크» 뿐이다(실측 2개 — 아이콘이 없으면 keep-out·산포에서 더
     많이 빠진다). 이 항이 지키는 뜻은 그대로다: **버스트 층 자체는 안 죽었다**(0 이면 [R1] 이
     «연출이 통째로 없어서» 초록인 헛초록이 된다 — 둘을 같이 봐야 [R1] 이 뜻을 갖는다). */
  ok(rvSpark >= 1, '[R2] ★ 아이콘을 빼도 **버스트 층 자체는 뜬다** — [R1] 의 0 이 «연출이 통째로 없어서» 가 아니다',
     rvSpark + '개 (≥1)');
  await p.evaluate(() => { if (window.__burst0) window.fxBurst = window.__burst0; });

  /* ⚑⚑ 898 신설 — [R3] «`FX_CIC_SC` 를 1 로» 되돌림 시험.
     위 [C-big]·[C-big-f] 는 **주인 지시 583 의 살아 있는 몸**을 묻는 항이라, 무르게 푼 수리가
     아님을 못박는 짝이 있어야 한다(334). [R1]·[R2] 는 «아이콘 자리» 를 런타임에서 빼는 시험이라
     크기 축은 못 건드린다 — `FX_CIC_SC` 는 `const` 라 런타임 주입이 안 되고, 그래서 **제품 사본**을
     만들어 그 상수만 1 로 되돌린다(814 §R 선례).
     기대: 되돌린 사본에서는 `fitK` 의 분모에서도 그 배수가 같이 빠져 아이콘 알이 «구슬» 과 같은
     상한(단련 34px)에 앉는다 ⇒ 지금 판의 상한(38px)에 **못 닿는다** = [C-big-f] 가 실제로 빨개진다.
     ⚠ 자리는 **단련**이다 — 훈련·룬은 가둠이 물어 지금도 상쇄돼 있어 되돌려도 값이 안 바뀐다
       (그 사실 자체가 [C-big-f] 가 «가둠이 안 무는 자리» 에만 대는 이유다). */
  if (CH.temper) {
    const FROM = 'const FX_CIC_SC = 1.6;', TO = 'const FX_CIC_SC = 1;';
    if (src.indexOf(FROM) < 0) {
      ok(false, '[R3] 되돌림 앵커 `' + FROM + '` 를 찾았다 — 조용한 통과 금지');
    } else {
      const tmp = '.v583-r3-' + process.pid + '.html';
      const tmpAbs = path.join(path.dirname(SRC), tmp);
      fs.writeFileSync(tmpAbs, src.split(FROM).join(TO));
      let revMax = null;
      try {
        const p2 = await ctx.newPage();
        await p2.goto('file://' + tmpAbs);
        await p2.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
        await p2.waitForTimeout(1000);
        await p2.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6;
          openTrain(); });
        await p2.waitForTimeout(300);
        await p2.evaluate(() => { setTrSub('temper'); renderTrain();
          const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; });
        await p2.waitForTimeout(250);
        const bb2 = await (await p2.$('#trTemper .tr-tp .tb')).boundingBox();
        await p2.mouse.move(bb2.x + bb2.width / 2, bb2.y + bb2.height / 2);
        await p2.mouse.down();
        revMax = await p2.evaluate(() => new Promise(res => {
          let m = 0; const t0 = performance.now();
          const iv = setInterval(() => {
            for (const n of document.querySelectorAll('#fxl .fx-cic')) m = Math.max(m, n.offsetWidth);
            if (performance.now() - t0 > 720) { clearInterval(iv); res(m); }
          }, 40);
        }));
        await p2.mouse.up();
        await p2.close();
      } finally { try { fs.unlinkSync(tmpAbs); } catch (_) {} }
      ok(revMax !== null && revMax > 0 && revMax < CH.temper.icHi * 0.98,
         '[R3] ★ `FX_CIC_SC` 를 1 로 되돌린 사본에서 단련 알이 지금 판의 상한에 **못 닿는다** = [C-big-f] 가 무른 항이 아니다',
         '되돌린 판 최대 ' + n1(revMax) + 'px < 지금 판 상한 ' + n1(CH.temper.icHi)
         + 'px (구슬 상한 ' + n1(CH.temper.plHi) + 'px)');
    }
  }

  /* ⚑⚑ 902 신설 — [R4] «배수를 1 아래로» 되돌림 시험.
     [C-big] 이 902 에서 «반올림 없는 사슬 · 허용 0» 으로 옮겨 갔으므로, 그것이 **무르게 푼 수리가
     아님**을 짝으로 못박는다(334). [R3] 은 `FX_CIC_SC = 1` 로 되돌려 [C-big-f](가둠이 안 무는
     자리)를 겨누는데, `1` 은 [C-big] 의 «작지 않다» 를 **등호로 통과**시키므로 그 항은 못 건드린다.
     ⇒ 같은 상자·같은 사슬을 그대로 두고 **배수만 0.8** 로 넣어 다시 굴린다. 브라우저를 다시 안 띄우는
       것이 요점이다 — 재는 대상이 «자의 산수» 이므로 산수로 되돌리는 것이 정확히 같은 시험이다.
     기대: 가둠이 안 무는 자리(단련)에서 아이콘 갈래가 구슬 아래로 내려간다 = [C-big] 이 실제로 빨개진다.
     ⚠ 가둠이 무는 자리(훈련·룬)는 배수를 어떻게 넣어도 상쇄돼 값이 안 변한다 — 그 사실 자체가
       [C-big] 이 «전 자리 역전 금지» 이고 [C-big-f] 가 «자유 자리 확대» 인 이유다(900 이 굳힌 판정). */
  {
    const ks = SITES.map(s => s.k).filter(k => CH[k] && CH[k].rev);
    const rows = ks.map(k => { const c = CH[k].rev(0.8); return { k, ic: c.icX(34), pl: c.plX(34) }; });
    const red = rows.filter(r => r.ic < r.pl - 1e-9);
    ok(ks.length === SITES.length && red.length > 0,
       '[R4] ★ 같은 상자·같은 사슬에 `FX_CIC_SC` 만 **0.8** 로 넣으면 [C-big] 이 실제로 빨개진다 — 허용 0 이 «이미 참인 것» 이 아니다',
       rows.map(r => r.k + ' ' + n1(r.ic) + '/' + n1(r.pl)).join(' · ') + ' · 역전 ' + (red.map(r => r.k).join('·') || '없음'));
  }

  /* ⚑⚑ 906 신설 — [R5]·[R6] «집합» 되돌림 시험 (짝으로 세운다).
     [D-*-o] 가 906 에서 «같은 집합끼리» 로 옮겨 갔으므로, 그것이 **문턱을 넓혀 지나간 것이 아님**을
     못박아야 한다(334·796 반려 조항). 902 [R4] 와 같은 수법이다 — 브라우저를 다시 안 띄우고
     **실측 표본을 산수로 되돌린다**(재는 대상이 «자의 판정» 이므로 판정에 먹일 표본을 짜는 것이
     정확히 같은 시험이다). 둘이 짝이라야 뜻이 산다:
       [R5] 알을 **한 픽셀도 안 움직이고** 멀리 간 알만 지운 사본 → 옛 자는 빨갛고 **새 자는 초록**
            (= 수리가 실제로 구성 축을 걷어냈다. 안 걷혔으면 이 항이 빨갛다)
       [R6] 소실 없이 모든 알을 발원 쪽으로 되돌린 사본 → **새 자도 빨강**
            (= «버튼으로 모이면 빨강» 이라는 658·660 폐지 축이 그대로 살아 있다) */
  {
    const kk = SITES.map(s => s.k).filter(k => R[k] && R[k].tr && R[k].tr.length >= 2
      && R[k].tr[0].r && R[k].tr[0].r.length >= 4);
    if (!kk.length) { ok(false, '[R5] 되돌릴 궤적 표본이 있다'); }
    else {
      /* 되돌림의 여유가 가장 큰 창을 고른다 — «멀리 간 절반이 죽었을 때 옛 자가 보는 하락» 이
         곧 이 시험의 진폭이다. 알 수가 아니라 **그 하락**으로 고르는 것이 요점이다(알이 많아도
         반경이 고르게 뭉쳐 있으면 하락이 작아 시험이 무뎌진다 — 그때는 [R5b] 가 말한다). */
      const drop = a => { const A0 = R[a].tr[0].r, f = [...A0].sort((x, y) => y.d - x.d);
        const kp = f.slice(Math.ceil(f.length / 2));
        return A0.reduce((s, x) => s + x.d, 0) / A0.length - kp.reduce((s, x) => s + x.d, 0) / kp.length; };
      const k = kk.sort((a, b2) => drop(b2) - drop(a))[0];
      const A = R[k].tr[0].r;
      const byFar = [...A].sort((x, y) => y.d - x.d);
      const keep = byFar.slice(Math.ceil(byFar.length / 2));       /* 멀리 간 절반이 죽었다 */
      /* ⚠ 시험이 **무디지 않은지**를 먼저 못박는다 — 첫 무리의 반경이 문턱 폭 안에 뭉쳐 있으면
         «멀리 간 절반을 지워도» 옛 자가 안 빨개져 [R5] 가 «이미 참인 것» 을 묻게 된다.
         그 경우는 자의 결함이 아니라 표본이 얇은 것이므로 **따로** 말한다(항을 뭉치면 원인이 섞인다). */
      const sprd = Math.max(...A.map(x => x.d)) - Math.min(...A.map(x => x.d));
      ok(sprd > 2 * DTOL,
         '[R5b] 첫 무리의 반경이 문턱 폭보다 넓게 흩어져 있다 — 아래 [R5] 가 «이미 참인 것» 을 묻지 않는다',
         k + ' · 반경 폭 ' + n1(sprd) + 'px > ' + (2 * DTOL) + 'px · ' + A.length + '알');
      const cens = spread([{ t: 0, r: A }, { t: 720, r: keep.map(x => ({ i: x.i, d: x.d })) }]);
      ok(!cens.okOld && cens.ok,
         '[R5] ★ 알이 **한 픽셀도 안 움직이고** 멀리 간 절반만 죽은 사본 — 옛 자(전원 → 생존자)는 빨갛고'
         + ' **새 자(같은 집합)는 초록**이다 = 906 이 걷어낸 것이 «구성» 축임을 이 자리가 직접 증명한다',
         k + ' · 옛 ' + n1(cens.d0) + ' → ' + n1(cens.d1) + 'px(' + (cens.okOld ? '초록' : '빨강') + ')'
         + ' · 새 ' + n1(cens.d0s) + ' → ' + n1(cens.d1s) + 'px(' + (cens.ok ? '초록' : '빨강') + ')'
         + ' · ' + A.length + '알 → ' + keep.length + '알');
      const conv = spread([{ t: 0, r: A }, { t: 720, r: A.map(x => ({ i: x.i, d: x.d * 0.5 })) }]);
      ok(!conv.ok,
         '[R6] ★ 소실 없이 모든 알을 발원 쪽으로 되돌린 사본은 **새 자로도 빨갛다** — 문턱을 넓힌 수리가'
         + ' 아니다(334·796 · «버튼으로 모이면 빨강» 이 살아 있다)',
         k + ' · 새 ' + n1(conv.d0s) + ' → ' + n1(conv.d1s) + 'px · 문턱 ' + DTOL + 'px · '
         + (conv.ok ? '초록(=반려)' : '빨강'));
    }
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  ok(errs.length === 0, '[Z] 콘솔 에러 0');
  await b.close();
  console.log('\nVERIFY583 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
