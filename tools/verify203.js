/* 작업 203 — 룬 시스템 신설 (23 훈련 팝업 «훈련 · 룬» 탭 · 룬 3종 · 룬강화석 던전).
 * 실행: node tools/verify203.js [--table]
 *
 * ROUTINE «기능 완성 규칙»(T2 는 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가
 * 저장(S)·HUD·다른 화면에 반영됨» 이어야 완료) 에 맞춘 게이트다. 절 구성:
 *
 *   [1] 재화     — `rstone` 이 CUR_ICON·CURINFO·가방·giveReward 를 전부 지난다 · 아이콘 1종(125)
 *   [2] 팝업 탭  — «훈련 · 룬» 2칸이 96 공용 부품이고, **탭을 만들어도 23 의 좌표가 안 움직인다**
 *                 (훈련 5요소 bbox Δ0) · 룬 카드끼리·요약줄과 겹침 0 · 시트 밖으로 안 넘침
 *   [3] 사다리   — 일반만 열림 → 일반 500 → 고급 열림 → 고급 500 → 천상 열림 · 잠금 문구(186)
 *   [4] 확률     — Lv18 에서 정확히 5% · 5/2/1/0.5 4단 · 단조 비증가 · 이음매 연속 · 그 뒤 유지
 *   [5] 시도     — 재료·다이아가 각각 실제로 깎인다 · 성공 Lv+1 · **실패해도 레벨 유지** · 만렙 정지
 *   [6] 효과     — 계단(다음 1레벨이 앞보다 크다) · bonus() 에 «축별 합산 후 1회 곱» 으로 합류
 *   [7] 획득처   — 룬강화석 던전 1클리어 · DPS 측정장이 각각 rstone 을 실제로 지급
 *   [8] 저장     — 저장·재로드 보존 · 구 세이브(키 없음) 마이그레이션 · 손댄 값 클램프
 *   [9] 되돌림 시험 — 일부러 깨 보고 이 게이트가 정말 잡는지(LESSONS 43-①)
 *  [10] 홀드     — **297**(2026-08-28 주인 재지시): 룬 강화 시도 «꾹 누르면 연속».
 *                 진짜 마우스 포인터로 누르고 뗀다 · 단발 1회 · 1초 홀드 3회 이상 · 가속 ·
 *                 뗌·팝업 닫힘 정지 · 재료 3회분이면 정확히 3회 · **다이아 칸은 홀드 제외(ⓓ)** ·
 *                 «홀드 중 숫자» == «통짜 재렌더 숫자»(262 교훈 2ⓑ)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
/* 540 — «치우기» 닫개 한 벌. 여기 손으로 적혀 있던 목록에는 제품에 없는 이름
   `closeDefeat` 가 섞여 있었고(index.html 0건), `typeof` 가드가 그것을 조용히 삼켜
   18 패배 화면을 치우는 팔이 한 번도 돈 적이 없다. 목록·껍데기는 이제 한곳에서 온다. */
const { install, missingClosers, defeatStuck, blockedLabel } = require('./closers540');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const table = [];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await install(p);   /* 540 — `window.__clear540()` 심기 (이 자는 step 을 세우므로 arm 불요) */

  /* ================= [1] 재화 ================= */
  console.log('[1] 재화 — 룬강화석이 125 단일 출처와 33 재화 정보 팝업을 지난다');
  const cur = await p.evaluate(() => ({
    icon: CUR_ICON.rstone, tk: CUR_ICON.tkRstone,
    ic1: (curIc('rstone').match(/src="([^"]+)"/) || [])[1],
    dunTk: dunTk('rstone'),
    info: !!CURINFO.rstone, ways: CURINFO.rstone ? CURINFO.rstone.ways.length : 0,
    def: DEF().rstone, runeKey: JSON.stringify(DEF().rune),
    bag: (function () { S.rstone = 4321; return bagCur().some(r => r.n === '룬강화석' && r.q === 4321); })(),
    /* 194 강화석과 **다른 재화** 여야 한다 — 아이콘도 잔고도 섞이면 안 된다 */
    apart: CUR_ICON.rstone !== CUR_ICON.stone && (function () { S.stone = 5; S.rstone = 9; return S.stone === 5; })()
  }));
  ok(cur.icon === 'assets/ui/cur-rstone.svg', 'CUR_ICON.rstone 이 전용 SVG 하나', cur.icon);
  ok(cur.tk === 'assets/ui/cur-ticket-rstone.svg', '룬강화석 던전권도 전용 SVG 하나', cur.tk);
  ok(cur.ic1 === cur.icon, "curIc('rstone') 이 같은 경로를 낸다(125 단일 출처)", cur.ic1);
  ok(cur.dunTk === 'tkRstone', 'dunTk 가 룬 던전을 5번째 계열로 가른다', cur.dunTk);
  ok(cur.info && cur.ways === 3, '33 재화 정보 팝업에 룬강화석 등재 · 획득처 3줄', String(cur.ways));
  ok(cur.def === 0 && cur.runeKey === '{"r1":0,"r2":0,"r3":0}', 'DEF() 에 rstone·rune 신설', cur.runeKey);
  ok(cur.bag, '53 가방 «재화» 탭에 룬강화석 보유량이 뜬다');
  ok(cur.apart, '194 강화석과 별개 재화(아이콘·잔고 모두)');

  const give = await p.evaluate(() => {
    S.rstone = 0;
    const txt = giveReward({ rstone: 12345 });
    return { got: S.rstone, txt: txt.replace(/<[^>]*>/g, '').trim() };
  });
  ok(give.got === 12345, 'giveReward({rstone}) 가 S.rstone 을 실제로 올린다', String(give.got));
  ok(/12,345/.test(give.txt), '보상 문구가 «숫자 그대로»(150 규칙)', give.txt);

  /* ================= [2] 팝업 탭 ================= */
  console.log('[2] 팝업 탭 — «훈련 · 룬» 2칸, 그리고 23 의 좌표가 한 값도 안 움직인다');
  /* 203 이전 트리에서 잰 «훈련 탭 5요소의 박스 local 좌표»(node tools/verify203.js 를 만들기 전에
     같은 방식으로 캡처한 값). 탭을 붙였다고 이 값이 한 칸이라도 움직이면 23 의 26회차 폴리시가 깨진다.
     ⚠ 프레임 절대좌표가 아니라 **`.tr-box` 기준 local** 로 잰다 — 시트가 프레임 안에서 몇 px
       오르내려도(화면비·탭바 상태) 이 표는 흔들리지 않는다. */
  const PIN23 = {
    '.tr-rib':   [247, 34, 551, 108],
    '.tr-prog':  [177, 165, 668, 55],
    /* ⚑ 584(2026-08-31, 저장소 주인 지시 «업글 버튼 크기 존내 작으니까 더 크게») —
       이 한 칸은 **의도적으로 갈아 끼운 값**이다. 이 표의 뜻(«탭을 갈아타도 훈련 5요소가
       한 칸도 안 움직인다»)은 그대로이고, «왜 128 인가»(진행바 세로 중심 · `.tr-qty` 8.5px)는
       `verify584` [3] 이 따로 잰다 — 그래서 여기 숫자를 되돌려도 그쪽이 먼저 빨개진다. */
    '.tr-up':    [838, 128.5, 128, 128],
    '.tr-qty':   [142, 265, 761, 75],
    '.tr-cards': [0, 373, 1046, 510]
  };
  const tab = await p.evaluate((PIN) => {
    const box = () => document.querySelector('.tr-box').getBoundingClientRect();
    const loc = s => { const e = document.querySelector(s); if (!e) return null;
                       const r = e.getBoundingClientRect(), b = box();
                       return [+(r.x - b.x).toFixed(2), +(r.y - b.y).toFixed(2),
                               +r.width.toFixed(2), +r.height.toFixed(2)]; };
    const KEYS = Object.keys(PIN);
    openTrain(); setTrSub('train');
    const before = KEYS.map(loc);
    const bar = document.getElementById('trSubs');
    const cells = [...bar.querySelectorAll('[data-trsub]')];
    /* 룬 탭으로 갔다가 돌아온다 — 왕복해도 좌표가 그대로여야 한다 */
    setTrSub('rune');
    const hidden = KEYS.every(k => getComputedStyle(document.querySelector(k)).display === 'none');
    const rn = [...document.querySelectorAll('.tr-rn')].map(e => e.getBoundingClientRect());
    const sum = document.querySelector('.tr-runes>.rsum').getBoundingClientRect();
    const barR = bar.getBoundingClientRect();
    const sheet = document.querySelector('.tr-sheet').getBoundingClientRect();
    let overlap = 0;
    const all = rn.concat([sum]);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
      if (all[i].bottom > all[j].top + 0.5 && all[j].bottom > all[i].top + 0.5) overlap++;
    const last = all[all.length - 1];
    setTrSub('train');
    const after = KEYS.map(loc);
    return {
      cells: cells.length, keys: cells.map(c => c.dataset.trsub),
      /* 210 — 세 번째 탭 «단련» 이 붙어 칸이 3등분됐다(`.sp2` → `.sp3`).
         203 이 여기서 재는 것은 «96 공용 부품을 쓰는가» 이지 «칸이 몇 개인가» 가 아니다 —
         칸 수를 못 박으면 탭이 늘 때마다 여기가 빨개진다(10 상점이 124 에서 겪은 그 자리).
         그래서 «.stabs + .spN 격자 + 자식이 전부 .stab» 으로만 본다. 훈련 탭이 안 밀린 사실은
         아래 `pinned`/`same` 이 여전히 bbox 로 재고, 3칸 자체는 verify210 [B] 가 못 박는다. */
      shared: bar.classList.contains('stabs') && /(^| )sp\d( |$)/.test(bar.className)
              && cells.every(c => c.classList.contains('stab')),
      pinned: KEYS.every((k, i) => JSON.stringify(before[i]) === JSON.stringify(PIN[k])),
      same: JSON.stringify(before) === JSON.stringify(after),
      before, after, hidden,
      overlap, belowBar: last.bottom <= barR.top + 0.5,
      inSheet: barR.bottom <= sheet.bottom + 0.5 && rn[0].top >= sheet.top - 0.5,
      onTrain: document.querySelector('#trSubs [data-trsub="train"]').classList.contains('on'),
      showTrain: getComputedStyle(document.querySelector('.tr-cards')).display
    };
  }, PIN23);
  /* 210 — «훈련 · 룬» 두 칸이 **이 순서로 앞에 있는가** 만 본다. 뒤에 탭이 더 붙는 것은
     203 이 막을 일이 아니다(210 «단련» 이 실제로 붙었다). 칸 수 자체는 verify210 [B] 소관. */
  ok(tab.keys.slice(0, 2).join(',') === 'train,rune' && tab.cells >= 2,
    '팝업 탭 앞 두 칸이 «훈련 · 룬»', tab.keys.join(','));
  ok(tab.shared, '96 공용 서브탭 부품(.stabs.spN > .stab) 을 그대로 쓴다');
  ok(tab.pinned, '★ 훈련 5요소의 박스 local 좌표가 203 이전 값과 Δ0 — 탭을 붙여도 23 이 안 밀렸다',
    tab.pinned ? '' : JSON.stringify(tab.before));
  ok(tab.same, '룬 탭에 갔다 와도 훈련 좌표가 그대로(왕복 Δ0)',
    tab.same ? '' : JSON.stringify(tab.before) + ' vs ' + JSON.stringify(tab.after));
  ok(tab.hidden, '룬 탭에서는 훈련 5요소가 display:none — 같은 자리를 번갈아 쓴다');
  /* 271 — 룬 3종이 «행 나열» 에서 «하위 탭» 으로 바뀌어 한 화면에 카드가 **1장**이다(주인 정정).
     203 이 여기서 재는 것은 «본문 요소끼리 겹치지 않는가» 이지 «카드가 몇 장인가» 가 아니므로
     장수를 못 박지 않는다 — 위 `shared` 가 칸 수를 안 박은 것과 같은 이유다. 장수·하위 탭 기하는
     verify271 [1][2] 소관. */
  ok(tab.overlap === 0, '룬 본문(카드 + 총효과 요약줄) 서로 겹침 0건', String(tab.overlap));
  ok(tab.belowBar, '룬 본문이 서브탭 바 위에서 끝난다(바를 안 침범)');
  ok(tab.inSheet, '서브탭 바·룬 본문이 시트 안에 들어간다(잘림 0)');
  ok(tab.onTrain && tab.showTrain === 'block', '기본 탭은 «훈련» 이고 훈련 카드가 보인다', tab.showTrain);

  /* 실제 «클릭» 으로도 탭이 바뀌는가 — 위임 핸들러가 배수 탭·카드 홀드와 안 부딪히는지
     (74·142 «눌림 효과는 뜨는데 동작이 안 되는 탭 유실» 계열의 회귀를 여기서 잡는다) */
  await p.evaluate(() => { openTrain(); setTrSub('train'); });
  await p.waitForTimeout(400);
  await p.click('#trSubs [data-trsub="rune"]', { force: true });
  await p.waitForTimeout(300);
  const clicked = await p.evaluate(() => ({
    sub: trSub, boxOn: document.querySelector('.tr-box').classList.contains('rune'),
    cards: getComputedStyle(document.querySelector('.tr-cards')).display,
    runes: getComputedStyle(document.getElementById('trRunes')).display
  }));
  ok(clicked.sub === 'rune' && clicked.boxOn, '탭을 실제로 클릭하면 룬 탭으로 바뀐다', clicked.sub);
  ok(clicked.cards === 'none' && clicked.runes === 'block', '룬 탭에서 훈련 본문은 숨고 룬 본문이 뜬다');
  await p.click('#trSubs [data-trsub="train"]', { force: true });
  await p.waitForTimeout(300);
  const back2 = await p.evaluate(() => trSub);
  ok(back2 === 'train', '«훈련» 칸을 누르면 되돌아온다', back2);

  /* ================= [3] 사다리 ================= */
  console.log('[3] 사다리 — 일반 → 고급 → 천상, 각 500');
  const lad = await p.evaluate(() => {
    S.rune = { r1: 0, r2: 0, r3: 0 };
    const a = RUNES.map(r => runeOpen(r.id));
    S.rune.r1 = RUNE_MAXLV;
    const b = RUNES.map(r => runeOpen(r.id));
    S.rune.r2 = RUNE_MAXLV;
    const c = RUNES.map(r => runeOpen(r.id));
    S.rune = { r1: 0, r2: 0, r3: 0 };
    renderTrain();
    /* 271 — 잠금 표시가 «카드 3장 나란히» 에서 «하위 탭 3칸» 으로 옮겨졌다(주인 정정).
       그래서 잠금 상태는 탭 칸에서 읽고, 개방 조건 문구는 그 칸을 골랐을 때 카드 덮개에서 읽는다. */
    const lk = [...document.querySelectorAll('#rnSubs [data-runesub]')]
      .map(e => e.classList.contains('lk'));
    const txt = RUNES.map(r => {
      setRuneSub(r.id);
      const c = document.querySelector('.tr-rn>.rlk');
      return c ? c.textContent.trim() : '';
    });
    setRuneSub(null);
    return { a, b, c, max: RUNE_MAXLV, names: RUNES.map(r => r.n), lk, txt,
             req: RUNES.map(r => runeReqText(r.id)) };
  });
  ok(lad.max === 500, '룬 상한 500(주인 확정)', String(lad.max));
  ok(lad.names.join(',') === '일반룬,고급룬,천상룬', '룬 3종 이름·순서', lad.names.join(','));
  ok(JSON.stringify(lad.a) === '[true,false,false]', '시작은 일반룬만 열려 있다', JSON.stringify(lad.a));
  ok(JSON.stringify(lad.b) === '[true,true,false]', '일반룬 500 → 고급룬 개방', JSON.stringify(lad.b));
  ok(JSON.stringify(lad.c) === '[true,true,true]', '고급룬 500 → 천상룬 개방', JSON.stringify(lad.c));
  ok(JSON.stringify(lad.lk) === '[false,true,true]',
    '잠긴 룬도 하위 탭 3칸에 전부 보이고 잠금 표시가 붙는다(271)', JSON.stringify(lad.lk));
  ok(lad.req[1] === '일반룬 Lv.500 달성 시 개방' && lad.req[2] === '고급룬 Lv.500 달성 시 개방',
    '개방 조건 문구(186 관례)', lad.req[1]);
  ok(lad.txt[1].indexOf('일반룬 Lv.500') >= 0, '잠금 덮개에 그 문구가 실제로 찍힌다', lad.txt[1]);

  /* ================= [4] 확률 ================= */
  console.log('[4] 확률 곡선 — 초반 넉넉 → Lv18 부터 5 / 2 / 1 / 0.5%');
  const rate = await p.evaluate(() => {
    const at = l => runeRate(l);
    const seq = [];
    for (let l = 0; l <= 520; l++) seq.push(at(l));
    let mono = true;
    for (let l = 1; l < seq.length; l++) if (seq[l] > seq[l - 1] + 1e-12) mono = false;
    return {
      l0: at(0), l17: at(17), l18: at(18), l59: at(59), l60: at(60),
      l149: at(149), l150: at(150), l299: at(299), l300: at(300), l499: at(499), l520: at(520),
      mono, knee: RUNE_KNEE, p0: RUNE_P0,
      bands: RUNE_BANDS.map(x => x.p)
    };
  });
  ok(Math.abs(rate.l18 - 0.05) < 1e-12, 'Lv18 에서 정확히 5%(주인이 준 «Lv18 부근»)', (rate.l18 * 100).toFixed(3) + '%');
  ok(rate.l0 === 0.90 && rate.l17 > 0.05, '무릎 아래는 넉넉하다(Lv0 90% → Lv17 ' + (rate.l17 * 100).toFixed(2) + '%)');
  ok(Math.abs(rate.l17 - 0.05) < 0.02, '무릎 이음매가 연속이다(Lv17 과 Lv18 이 계단 아님)',
    (rate.l17 * 100).toFixed(2) + '% → 5.00%');
  ok(rate.bands.join(',') === '0.05,0.02,0.01,0.005', '확률 4단이 주인 지시 그대로', rate.bands.join(','));
  ok(rate.l59 === 0.05 && rate.l60 === 0.02 && rate.l149 === 0.02 && rate.l150 === 0.01
     && rate.l299 === 0.01 && rate.l300 === 0.005, '구간 경계에서 정확히 갈린다');
  ok(rate.l499 === 0.005 && rate.l520 === 0.005, '0.5% 는 그 뒤로 유지된다(더 안 떨어진다)');
  ok(rate.mono, '레벨이 오를수록 확률이 절대 오르지 않는다(단조 비증가, 0~520 전수)');
  table.push({ k: '확률', v: 'Lv0 90% → Lv18 5% → Lv60 2% → Lv150 1% → Lv300~ 0.5%' });

  /* ================= [5] 시도 ================= */
  console.log('[5] 시도 — 룬강화석 단일 결제(490) · 실패해도 레벨 유지');
  const tryR = await p.evaluate(() => {
    const out = {};
    /* 성공을 강제 — 확률 굴림을 무력화해 «성공 경로» 만 본다 */
    const rand = Math.random;
    S.rune = { r1: 5, r2: 0, r3: 0 }; S.rstone = 1e6; S.dia = 1e6;
    const cost = runeCost(RN.r1, 5);
    Math.random = () => 0;                                   /* 무조건 성공 */
    const b0 = { st: S.rstone, lv: runeLvOf('r1') };
    const r1 = runeTry('r1');
    out.mat = { spent: b0.st - S.rstone, cost, up: r1.up, lv: runeLvOf('r1'), was: b0.lv };
    /* 490 — 다이아 결제가 폐지됐다. «다이아가 아무리 많아도 룬강화석이 없으면 못 올린다» 로 뒤집는다:
       이 항이 없으면 다이아 갈래를 되살려도 게이트가 초록이다. */
    const d0 = S.dia, l0 = runeLvOf('r1'), st0 = S.rstone;
    S.rstone = 0;
    const r2 = runeTry('r1');
    out.dia = { diaSpent: d0 - S.dia, blocked: !r2.ok, lv: runeLvOf('r1'), was: l0 };
    S.rstone = st0;
    /* 실패를 강제 — 자원만 빠지고 레벨은 그대로여야 한다(주인 지시 ④) */
    Math.random = () => 0.999999;
    const f0 = { st: S.rstone, lv: runeLvOf('r1') };
    const r3 = runeTry('r1');
    out.failMat = { spent: f0.st - S.rstone, up: r3.up, lv: runeLvOf('r1'), was: f0.lv };
    Math.random = rand;
    /* 잠긴 룬 · 만렙 · 재화 부족은 시도 자체가 막힌다 */
    out.locked = runeTryOk('r2');
    S.rune.r1 = RUNE_MAXLV;
    out.maxed = runeTryOk('r1');
    /* 490 — 다이아는 남겨 두고 룬강화석만 비운다(구 코드는 둘 다 비웠다) */
    S.rune.r1 = 10; S.rstone = 0; S.dia = 1e6;
    out.broke = runeTryOk('r1');
    out.brokeNoop = (function () { const l = runeLvOf('r1'); runeTry('r1'); return runeLvOf('r1') === l; })();
    out.diaKept = S.dia;
    out.noDiaConst = typeof RUNE_DIA === 'undefined' && typeof RUNE_HOLD_DIA === 'undefined';
    out.oneBtn = (function () {
      openTrain && openTrain(); setTrSub('rune'); setRuneSub('r1'); S.rstone = 1e6; renderTrain();
      return document.querySelectorAll('#trRunes .tr-rn .rbt').length;
    })();
    /* 비용 곡선 — 레벨이 오르면 재료도 오른다(단조 증가) */
    let inc = true, prev = 0;
    for (let l = 0; l <= RUNE_MAXLV; l += 25) { const c = runeCost(RN.r1, l); if (c < prev) inc = false; prev = c; }
    out.costMono = inc;
    out.cost = { l0: runeCost(RN.r1, 0), l500: runeCost(RN.r1, 500),
                 r3l0: runeCost(RN.r3, 0) };
    return out;
  });
  ok(tryR.mat.spent === tryR.mat.cost && tryR.mat.cost > 0, '재료 시도가 룬강화석을 정확히 깎는다',
    tryR.mat.spent + ' / ' + tryR.mat.cost);
  ok(tryR.mat.up && tryR.mat.lv === tryR.mat.was + 1, '성공하면 레벨 +1', tryR.mat.was + '→' + tryR.mat.lv);
  ok(tryR.dia.blocked && tryR.dia.diaSpent === 0 && tryR.dia.lv === tryR.dia.was,
    '★ 490 — 룬강화석이 0 이면 **다이아가 100만 개 있어도** 시도가 막히고 다이아는 한 푼도 안 나간다',
    '다이아 −' + tryR.dia.diaSpent + ' · Lv ' + tryR.dia.lv);
  ok(tryR.noDiaConst, '490 — `RUNE_DIA`·`RUNE_HOLD_DIA` 가 선언째 사라졌다(결제 갈래가 하나다)');
  ok(tryR.oneBtn === 1, '490 — 룬 카드의 시도 버튼이 **하나**다', tryR.oneBtn + '개');
  ok(!tryR.failMat.up && tryR.failMat.lv === tryR.failMat.was && tryR.failMat.spent > 0,
    '★ 실패 — 재료는 빠지고 **레벨은 그대로**', '재료 −' + tryR.failMat.spent + ' · Lv ' + tryR.failMat.lv);
  ok(!tryR.locked, '잠긴 룬은 시도 자체가 막힌다');
  ok(!tryR.maxed, '만렙 룬은 시도 자체가 막힌다');
  ok(!tryR.broke && tryR.brokeNoop && tryR.diaKept === 1e6,
    '재화가 없으면 시도가 막히고 레벨도 안 움직인다(490 — 다이아로 새지도 않는다)');
  ok(tryR.costMono, '재료 비용이 레벨에 대해 단조 증가');
  table.push({ k: '재료 비용', v: '일반룬 Lv0 ' + tryR.cost.l0 + ' → Lv500 ' + tryR.cost.l500
                                  + ' · 천상룬 Lv0 ' + tryR.cost.r3l0 + ' (490 — 다이아 결제 폐지)' });

  /* ================= [6] 효과 ================= */
  console.log('[6] 효과 — **선형**(489)이고 bonus() 에 «합산 후 1회 곱» 으로 합류한다');
  const eff = await p.evaluate(() => {
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty();
    /* 489 — 계단 폐기. «다음 1레벨의 몫» 이 **전 구간 상수**여야 한다(구 경계 100·200·300·400 포함) */
    const gain = L => { S.rune.r1 = L - 1; const a = runeVal('r1', 'atk');
                        S.rune.r1 = L; return +(runeVal('r1', 'atk') - a).toFixed(9); };
    const g = [1, 100, 101, 200, 201, 300, 301, 400, 401, 500].map(gain);
    const step1 = +(RN.r1.eff.atk * RUNE_LIN).toFixed(9);
    /* 상수인가(±0) · 그 상수가 선언(eff × RUNE_LIN)과 같은가 */
    const flat = g.every(v => Math.abs(v - g[0]) < 1e-12);
    const declared = Math.abs(g[0] - step1) < 1e-12;
    /* 계단이 되살아나면(경계에서 뛰면) 빨개진다 — 되돌림 방향의 음성항 */
    const jumped = g.some((v, i) => i > 0 && v > g[i - 1] + 1e-12);
    /* 누적이 정확히 «상수 × 레벨» 인가 — 세 지점 */
    S.rune.r1 = 0;
    const lin = [1, 250, 500].every(L => { S.rune.r1 = L;
      return Math.abs(runeVal('r1', 'atk') - step1 * L) < 1e-9; });
    S.rune.r1 = 0;
    /* bonus() 합류 — 축별로 더한 뒤 한 번만 곱한다(룬마다 곱하지 않는다) */
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty();
    const base = { atk: bonus().atk, hp: bonus().hp, gold: bonus().gold };
    S.rune = { r1: 200, r2: 150, r3: 100 }; markDirty();
    const withR = { atk: bonus().atk, hp: bonus().hp, gold: bonus().gold };
    const expect = { atk: 1 + runeSum('atk'), hp: 1 + runeSum('hp'), gold: 1 + runeSum('gold') };
    const once = ['atk', 'hp', 'gold'].every(k => Math.abs(withR[k] / base[k] - expect[k]) < 1e-9);
    /* 룬마다 곱했다면 이 값이 나온다 — «아닌지» 를 같이 확인한다 */
    const perRune = ['r1', 'r2', 'r3'].reduce((m, id) => m * (1 + runeVal(id, 'atk')), 1);
    const notPerRune = Math.abs(withR.atk / base.atk - perRune) > 1e-6;
    /* 표기(카드 문구)와 식이 같은가 */
    renderTrain(); setTrSub('rune');
    const shown = document.querySelector('.tr-rn>.rd').textContent;
    const want = '공격력 ' + fmtEff(runeVal('r1', 'atk'));   /* 725 이관 — 표기가 «×N배» */
    /* 전투력(cp)까지 실제로 오르는가 — «다른 화면에 반영» 의 최종 확인 */
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty(); const cp0 = cp();
    S.rune = { r1: 300, r2: 0, r3: 0 }; markDirty(); const cp1 = cp();
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty();
    return { g, once, notPerRune, shown, want, cp0, cp1,
             sum: { atk: runeSum('atk'), hp: runeSum('hp') },
             flat, declared, jumped, lin, step1, lin3: RUNE_LIN,
             noStepTab: typeof RUNE_STEP === 'undefined' && typeof RUNE_STEP_EVERY === 'undefined' };
  });
  ok(eff.flat && !eff.jumped, '★ 489 — 1레벨당 효과가 **전 구간 상수**다(구 계단 경계 100/200/300/400 포함)',
    eff.g.map(v => v.toFixed(4)).join(' / '));
  ok(eff.declared, '그 상수가 선언(eff × RUNE_LIN)과 한 식이다', eff.g[0] + ' = ' + eff.step1);
  ok(eff.lin, '★ 누적 효과 = 상수 × 레벨 (Lv 1 · 250 · 500 세 지점)');
  ok(eff.lin3 === 3, '489 — 선형 계수 RUNE_LIN = 3 (현행 Lv1~100 레벨당 증가분 ×3)', eff.lin3);
  ok(eff.noStepTab, '★ 계단 표(RUNE_STEP/RUNE_STEP_EVERY)가 제품에 남아 있지 않다(295-② 두 벌 금지)');
  ok(eff.once, '★ bonus() 가 «축별 합산 후 1회 곱» 으로 반영한다(194·LESSONS 91-1 규칙)');
  ok(eff.notPerRune, '룬마다 곱하지 **않는다**(그랬다면 만렙 셋에서 배율이 터진다)');
  /* 271 — `.rd` 앞에 «지금 효과 — » 라벨이 붙었다(카드가 커져 ①지금/②다음 1레벨/③계단 3줄이 됐다).
     재는 것은 «표기가 runeVal 과 같은 식인가» 이므로 위치가 아니라 포함으로 본다. */
  ok(eff.shown.indexOf(eff.want) >= 0, '카드 효과 표기가 runeVal 과 같은 식', eff.shown + ' / ' + eff.want);
  ok(eff.cp1 > eff.cp0, '룬 레벨이 전투력(cp)에 실제로 반영된다',
    Math.round(eff.cp0) + ' → ' + Math.round(eff.cp1));
  table.push({ k: '효과(만렙 1종)', v: '일반룬 500 = 공격력 +' + (0.010 * 3 * 500 * 100).toFixed(0)
    + '% (489 선형 — eff 0.010 × RUNE_LIN 3 × 500)' });

  /* ================= [7] 획득처 ================= */
  console.log('[7] 획득처 — 룬강화석 던전 · DPS 측정장이 실제로 지급한다');
  const dun = await p.evaluate(() => {
    S.guide.idx = 99; S.rstone = 0; S.dun.rstone = 1;
    DUNGEONS.forEach(d => S.dunTk[d.id] = 3);
    const d = DUNGEONS.find(x => x.id === 'rstone');
    const before = { st: S.rstone, f: S.dun.rstone, left: S.dunTk.rstone };
    challengeDungeon(d);
    const entered = !!dunRun && dunRun.d.id === 'rstone';
    if (entered) { dunRun.dmg = dunRun.need; endDunRun(true); }
    const after = { st: S.rstone, f: S.dun.rstone, left: S.dunTk.rstone };
    const clr = document.getElementById('dclw').classList.contains('on');
    closeDunClear();
    return { entered, before, after, clr, rw: d.rw(1), name: d.n,
             apart: d.id !== 'stone' && DUNGEONS.filter(x => x.id === 'stone').length === 1,
             ui: !!DUN_UI.rstone, state: !!DUN_STATE.rstone };
  });
  ok(dun.entered, '룬강화석 던전 «' + dun.name + '» 입장');
  ok(dun.after.st - dun.before.st > 0, '클리어 보상으로 룬강화석 실지급', '+' + (dun.after.st - dun.before.st));
  ok(dun.after.f === dun.before.f + 1 && dun.after.left === dun.before.left - 1,
    '층 +1 · 입장 −1(다른 던전과 같은 규칙)');
  ok(dun.clr, '31 던전 클리어 화면 표시');
  ok(Object.keys(dun.rw).join(',') === 'rstone', '보상 종류는 rstone 1종', Object.keys(dun.rw).join(','));
  ok(dun.apart, '194 「각성의 동굴」과 별개 던전이다(둘 다 목록에 있다)');
  ok(dun.ui && dun.state, '03 카드 테마(DUN_UI)·04 세부 상태문구(DUN_STATE) 등재');
  table.push({ k: '던전 1층 보상', v: dun.rw.rstone + ' 룬강화석 (입장 횟수는 204 입장권 규칙 그대로)' });

  const raid = await p.evaluate(() => {
    S.rstone = 0; S.best = 50;
    const r = RAIDS[0];
    startRaid(r);
    const on = !!raidOn;
    raidDmg = 1e9; raidT = 0;
    endRaid(true);
    const first = S.rstone;                       /* 첫 기록 = 신기록 → ×2 */
    closeModal();
    startRaid(r); raidDmg = 1; raidT = 0; endRaid(true);
    const second = S.rstone - first;
    closeModal();
    return { on, first, second, base: RUNE_ST_RAID };
  });
  ok(raid.on, 'DPS 측정장 입장');
  ok(raid.first === raid.base * 2, '측정장 신기록 보상 = 기본 ×2', String(raid.first));
  ok(raid.second === raid.base, '측정장 일반 보상 = 기본', String(raid.second));
  table.push({ k: 'DPS 측정장', v: raid.base + ' 룬강화석 (신기록 ' + raid.base * 2 + ')' });

  /* ================= [8] 저장 ================= */
  console.log('[8] 저장 — 재로드 보존 · 구 세이브 마이그레이션 · 클램프');
  const sav = await p.evaluate(() => {
    S.rstone = 24680; S.rune = { r1: 500, r2: 123, r3: 0 }; save();
    const raw = JSON.parse(localStorage.getItem(KEY));
    return { rawSt: raw.rstone, rawRune: JSON.stringify(raw.rune) };
  });
  await p.reload(); await p.waitForTimeout(1100);
  await install(p);   /* 540 — 재로드로 페이지가 갈렸으니 다시 심는다 */
  const back = await p.evaluate(() => ({ st: S.rstone, rune: JSON.stringify(S.rune),
                                         open: RUNES.map(r => runeOpen(r.id)) }));
  ok(sav.rawSt === 24680 && sav.rawRune === '{"r1":500,"r2":123,"r3":0}', '세이브에 실제로 기록된다', sav.rawRune);
  ok(back.st === 24680 && back.rune === '{"r1":500,"r2":123,"r3":0}', '재로드 후 보존된다', back.rune);
  ok(JSON.stringify(back.open) === '[true,true,false]', '재로드 후 사다리 상태도 그대로');

  const mig = await p.evaluate(() => {
    /* 구 세이브 = 두 키가 아예 없는 상태(203 이전). 194 와 같은 «없으면 기본값» 마이그레이션 */
    const d = JSON.parse(localStorage.getItem(KEY));
    delete d.rstone; delete d.rune;
    localStorage.setItem(KEY, JSON.stringify(d));
    load();                                       /* load() 는 시각을 돌려주고 상태는 전역 S 에 앉힌다 */
    const a = { rstone: S.rstone, rune: S.rune };
    /* 손댄 세이브 = 범위 밖 값 */
    const d2 = JSON.parse(localStorage.getItem(KEY));
    d2.rstone = -50; d2.rune = { r1: 99999, r2: 'x', zzz: 7 };
    localStorage.setItem(KEY, JSON.stringify(d2));
    load();
    const b2 = { rstone: S.rstone, rune: S.rune };
    return { old: { st: a.rstone, rune: JSON.stringify(a.rune) },
             bad: { st: b2.rstone, rune: JSON.stringify(b2.rune) } };
  });
  ok(mig.old.st === 0 && mig.old.rune === '{"r1":0,"r2":0,"r3":0}',
    '구 세이브(키 없음) → 룬강화석 0 · 전 룬 Lv0 (KEY 안 올림)', mig.old.rune);
  ok(mig.bad.st === 0 && mig.bad.rune === '{"r1":500,"r2":0,"r3":0}',
    '손댄 세이브는 0~500 으로 잘리고 없는 룬 키는 버린다', mig.bad.st + ' / ' + mig.bad.rune);

  /* ================= [9] 되돌림 시험 ================= */
  console.log('[9] 되돌림 시험 — 일부러 깨 보고 이 게이트가 잡는지(LESSONS 43-①)');
  const neg = await p.evaluate(() => {
    const out = {};
    /* ⓐ 실패에도 레벨이 떨어지게 만들면 [5] 가 잡아야 한다 */
    const realTry = runeTry;
    S.rune = { r1: 10, r2: 0, r3: 0 }; S.rstone = 1e6;
    const l = runeLvOf('r1');
    S.rune.r1 = l - 1;                       /* «실패 시 하락» 을 손으로 흉내 */
    out.a = runeLvOf('r1') !== l;
    S.rune.r1 = l;
    /* ⓑ 확률이 0.5% 아래로 더 떨어지면 [4] 의 «유지» 단언이 깨진다 */
    out.b = runeRate(1e6) === 0.005;
    /* ⓒ 룬마다 곱하기 vs 합산 후 1회 곱 — 두 값이 실제로 다른가(단언이 공허하지 않은가) */
    S.rune = { r1: 200, r2: 200, r3: 200 };
    const sum1 = 1 + runeSum('atk');
    const per = ['r1', 'r2', 'r3'].reduce((m, id) => m * (1 + runeVal(id, 'atk')), 1);
    out.c = Math.abs(sum1 - per) > 1;
    /* ⓓ 룬을 0 으로 되돌리면 효과도 0 이다(«켜 두고 안 끄는» 버그 방지) */
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty();
    out.d = runeSum('atk') === 0 && runeSum('hp') === 0 && runeSum('gold') === 0;
    return out;
  });
  ok(neg.a, 'ⓐ 레벨이 실제로 움직이는 값이라 «유지» 단언이 공허하지 않다');
  ok(neg.b, 'ⓑ 0.5% 바닥이 진짜 바닥이다(그 아래로 안 내려간다)');
  ok(neg.c, 'ⓒ 「합산 후 1회 곱」과 「룬마다 곱」이 실제로 다른 값이다(단언이 유효)');
  ok(neg.d, 'ⓓ 룬 Lv0 이면 효과 0 — 캐시에 남지 않는다');

  /* ================= [10] 297 «꾹 누르면 연속» =================
     2026-08-28 주인 재지시 — 203 이 «확률 시도라 한 번 누르면 한 번» 으로 못 박아 뒀던 자리가
     뒤집혔다. 여기서는 **진짜 마우스 포인터**로 누르고 뗀다(LESSONS 262-1: `el.click()` 직접
     호출은 구현이 click → pointerdown 으로 옮겨가면 그대로 죽는 부채다).
     확률을 `runeRate` 스텁으로 고정해 «시도 횟수» 를 재화 차감으로 정확히 센다. */
  console.log('[10] 297 — 룬 강화 시도 «꾹 누르면 연속»(주인 재지시)');
  /* 490 — 결제 갈래가 하나라 `data-pay` 가 사라졌다. 버튼도 하나뿐이다(`.rbt.b1`). */
  const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';
  /* 항상 실패하게 고정하면 레벨이 안 움직여 **비용이 상수**가 된다 → 차감액 ÷ 비용 = 시도 횟수 */
  /* ⚠ 23 팝업은 열릴 때 슬라이드 애니메이션이 있다 — 곧바로 boundingBox 를 재면 **아직 움직이는
     중의 좌표**(여기서는 y 2345, 뷰포트 2280 바깥)를 집어 마우스가 허공을 누른다.
     164 가 «애니메이션 종료 대기 후 마우스 클릭» 으로 같은 함정을 지났다. */
  const setHold = async (lv, stone) => {
    const r = await setHold0(lv, stone);
    await p.waitForTimeout(420);
    return r;
  };
  const setHold0 = (lv, stone) => p.evaluate(o => {
    if(!window.__rate0) window.__rate0 = runeRate;
    runeRate = () => 0;                                  /* 전부 실패 — 레벨·비용 고정 */
    /* 결정성 — 자동 전투가 30초 넘게 돌면 레벨업·보상 팝업이 버튼 위를 덮어 포인터가 그리로 간다
       (verify64·262 와 같은 규약: 게이트가 손가락을 흉내 내는 동안 게임 루프는 세운다) */
    if(typeof step === 'function') step = () => {};
    window.__clear540();                                 /* 540 — 닫개 + 이름 없는 껍데기(#defw) */
    S.rune = { r1: o.lv, r2: 0, r3: 0 }; S.rstone = o.stone; S.dia = 100000;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    return { cost: runeCost(RN.r1, runeLvOf('r1')), st: S.rstone, dia: S.dia };
  }, { lv, stone });
  /* 누르기 전에 «그 좌표의 최상단 노드가 정말 그 버튼인가» 를 확인한다 —
     아니면 0회로 조용히 통과·실패해 원인을 못 찾는다(LESSONS 263-① 양성항) */
  const hitAt = (sel, x, y) => p.evaluate(o => {
    const el = document.elementFromPoint(o.x, o.y);
    return !!(el && el.closest && el.closest(o.sel));
  }, { sel, x, y });
  let hitOk = true;
  const center = async sel => {
    const bb = await p.locator(sel).boundingBox();
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    if (!(await hitAt(sel, c.x, c.y))) hitOk = false;
    return c;
  };
  /* 액셔너빌리티 — `hover()` 는 «보이고 · 안정되고 · 그 좌표에서 이벤트를 실제로 받는» 상태가
     될 때까지 기다렸다가 마우스를 중심으로 옮긴다. 고정 대기만 두면 «가끔 통과» 로 굳는다. */
  const aim = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    await p.locator(sel).hover();
    await center(sel);                          /* 양성항 기록 — 최상단 노드가 정말 그 버튼인가 */
  };
  const press = async (sel, ms) => {
    await aim(sel);
    await p.mouse.down();
    if (ms) await p.waitForTimeout(ms);
    await p.mouse.up();
    await p.waitForTimeout(80);
  };
  const tries = async (base, cost) => Math.round((base - (await p.evaluate(() => S.rstone))) / cost);

  let s0 = await setHold(30, 1e7);
  await press(MAT, 0);
  const nTap = await tries(s0.st, s0.cost);
  ok(nTap === 1, '단발 탭 = 정확히 1회 시도(누를 때 1 + 뗄 때 1 이 아니다 — 64 ⓐ)', nTap + '회');

  s0 = await setHold(30, 1e7);
  await press(MAT, 1000);
  const nHold = await tries(s0.st, s0.cost);
  ok(nHold >= 3, '★ 꾹 누르면 연속 시도된다 — 1초 홀드에 3회 이상', nHold + '회');
  table.push({ k: '홀드 1초', v: nHold + '회 시도' });

  const stopped = await p.evaluate(() => S.rstone);
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => S.rstone) === stopped, '손을 떼면 즉시 멈춘다(뗀 뒤 500ms 동안 0회)');

  /* 가속(×0.86) — 뒤 구간이 앞 구간보다 많이 돈다 */
  s0 = await setHold(30, 1e7);
  {
    await aim(MAT);
    await p.mouse.down();
    await p.waitForTimeout(900);
    const mid = await p.evaluate(() => S.rstone);
    await p.waitForTimeout(900);
    const end = await p.evaluate(() => S.rstone);
    await p.mouse.up(); await p.waitForTimeout(80);
    const a = Math.round((s0.st - mid) / s0.cost), b2 = Math.round((mid - end) / s0.cost);
    ok(b2 > a, '반복이 가속된다(TR_HOLD_ACCEL 0.86) — 뒤 900ms 가 앞 900ms 보다 많다', a + ' → ' + b2);
    table.push({ k: '홀드 가속', v: a + ' → ' + b2 + '회 / 900ms' });
  }

  /* 재료가 딱 3회분이면 «정확히 3회» 에서 조용히 멈춘다(119 G4 — 반복분은 무알림) */
  s0 = await setHold(30, 0);
  const exact = await p.evaluate(o => { S.rstone = o.c * 3; renderTrain(); return S.rstone; },
    { c: s0.cost });
  await press(MAT, 2000);
  const left = await p.evaluate(() => S.rstone);
  ok(Math.round((exact - left) / s0.cost) === 3 && left < s0.cost,
    '재료가 3회분이면 정확히 3회에서 조용히 멈춘다', '남은 룬강화석 ' + left);

  /* ⓓ **349 의 자리는 490 이 옮겼다.** 297 → 349 는 «다이아 칸도 홀드를 타는가» 였는데,
     490(주인 지시 «룬 강화는 룬강화석으로만»)이 다이아 갈래를 통째로 없앴다. 349 가 지킨 성질
     («꾹 = 연속»)은 그대로 살아 있어야 하므로 자리를 비우지 않고 **유일한 버튼**에 옮겨 묻는다:
       ⓓ1 다이아를 아무리 쥐여 줘도 홀드가 다이아를 **한 푼도 안 쓴다**(갈래가 되살아나면 빨개진다)
       ⓓ2 그 홀드가 룬강화석은 실제로 3회분 이상 쓴다(«연속» 이 죽지 않았다 = 349 의 본체)
       ⓓ3 결제 갈래를 되살릴 이름(`RUNE_DIA`·`RUNE_HOLD_DIA`·`data-pay`)이 제품에 없다.
     ⚑ ⓓ2 를 안 두면 «다이아를 안 쓴다» 는 버튼을 통째로 없애도 초록이다(LESSONS 328-330). */
  s0 = await setHold(30, 1e7);
  const pre = await p.evaluate(() => ({ dia: S.dia, st: S.rstone }));
  await press(MAT, 1200);
  const post = await p.evaluate(() => ({ dia: S.dia, st: S.rstone }));
  const stCost = await p.evaluate(() => runeCost(RN.r1, runeLvOf('r1')));
  ok(pre.dia - post.dia === 0, 'ⓓ1 490 — 홀드가 다이아를 한 푼도 안 쓴다(결제 갈래가 하나다)',
    '다이아 Δ' + (pre.dia - post.dia));
  ok(pre.st - post.st >= stCost * 3, 'ⓓ2 349 — 그 버튼의 «꾹 = 연속» 은 살아 있다(1.2초에 3회분 이상)',
    (pre.st - post.st) + ' 룬강화석 (1회분 ' + stCost + ')');
  /* ⚠ `typeof` 로 감싼다 — 없는 이름을 그냥 읽으면 evaluate 가 던져 **게이트가 즉사**한다
     (FAIL 이 아니라 예외라 그 아래 절이 통째로 안 돈다 — verify61 §10 · LESSONS 262-1) */
  ok(await p.evaluate(() => typeof RUNE_HOLD_DIA === 'undefined' && typeof RUNE_DIA === 'undefined'),
    'ⓓ3 490 — 다이아 결제 상수가 런타임에 없다');
  ok(!/data-pay|RUNE_HOLD_DIA|RUNE_DIA/.test(
       require('fs').readFileSync(path.resolve(__dirname, '../index.html'), 'utf8')
         .replace(/\/\*[\s\S]*?\*\//g, '')),
    'ⓓ3b 490 — 제품 줄에도 `data-pay`·`RUNE_*_DIA` 가 0건이다(295-② 두 벌 금지)');

  /* 팝업을 닫으면 홀드도 같이 멈춘다 */
  s0 = await setHold(30, 1e7);
  {
    await aim(MAT);
    await p.mouse.down();
    await p.waitForTimeout(600);
    await p.evaluate(() => closeTrain());
    await p.waitForTimeout(400);
    const a = await p.evaluate(() => S.rstone);
    await p.waitForTimeout(400);
    const b2 = await p.evaluate(() => S.rstone);
    await p.mouse.up();
    ok(a === b2, '팝업을 닫으면 홀드도 같이 멈춘다');
  }

  /* ★ 262 교훈 2ⓑ — 표기층이 두 벌이 됐으므로 «홀드 중 숫자» == «통짜 재렌더 숫자» 를 잠근다 */
  const same = await p.evaluate(() => {
    runeRate = window.__rate0;                      /* 원래 확률로 되돌린다 */
    const read = () => {
      const c = document.querySelector('#trRunes .tr-rn[data-rune="r1"]');
      return c ? [c.querySelector('.rl i').textContent, c.querySelector('.rp i').textContent,
                  c.querySelector('.rp s').textContent, c.querySelector('.rd').innerHTML,
                  c.querySelector('.rst i').textContent, c.querySelector('.rbt.b1 i').innerHTML,
                  c.querySelector('.rb i').style.width,
                  document.querySelector('#trRunes .rsum i').innerHTML].join(' | ') : null;
    };
    S.rune = { r1: 30, r2: 0, r3: 0 }; S.rstone = 1e7;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    /* 홀드 중인 척하고 상태만 바꾼다 → `liveRunes` 경로가 그린다 */
    rtHold = { tag: 'rune' };
    S.rune.r1 = 137; S.rstone = 4321; markDirty();
    renderRunes();
    const live = read();
    rtHold = null;
    renderRunes();                                   /* → 통짜 경로(sig 가 갱신되지 않았으므로 실제로 그린다) */
    const full = read();
    return { live, full, moved: /137/.test(full) };
  });
  ok(same.moved, '대조군 — 통짜 렌더가 실제로 새 레벨(137)을 말한다(단언이 공허하지 않다)');
  ok(same.live === same.full,
    '★ «홀드 중 숫자» 와 «손 뗀 뒤 통짜 재렌더» 가 한 글자도 다르지 않다(262 교훈 2ⓑ)',
    same.live === same.full ? '' : '\n      live: ' + same.live + '\n      full: ' + same.full);
  ok(hitOk, '누른 좌표의 최상단 노드가 매번 그 버튼이었다(팝업이 덮지 않았다 — 양성항)');

  /* ⚑ 540 — 유령 재유입 차단. 이 두 항이 없으면 «치우기» 팔은 오타 하나로 다시 통째로 죽고,
     그 죽음은 위 양성항의 «가끔 빨강» 으로만 새어 나온다(524 가 349 에서 겪은 22~24/24). */
  const cl540 = await missingClosers(p);
  ok(cl540.length === 0,
    '★ 540 — 닫개 이름이 전부 제품에 실재한다(typeof 가드가 유령을 삼키지 않는다)',
    cl540.length ? '없는 이름 ' + cl540.join(' , ') : '전부 실재');
  ok(!(await defeatStuck(p)),
    '★ 540 — 측정이 끝난 시점에 18 패배 화면이 켜져 있지 않다(켜지면 뒤 표본이 전부 «0회» 다)',
    await blockedLabel(p));

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  if (process.argv.includes('--table')) {
    console.log('\n── 203 수치 요약(최종값은 199 밸런스 라운드의 몫) ──');
    table.forEach(r => console.log('  ' + r.k.padEnd(14) + ' ' + r.v));
  }
  console.log('\nVERIFY203 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
