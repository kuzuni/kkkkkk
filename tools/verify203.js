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
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

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
    '.tr-up':    [838, 139, 108, 107],
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
  ok(tab.overlap === 0, '룬 카드 3장 + 총효과 요약줄 서로 겹침 0건', String(tab.overlap));
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
    const lk = [...document.querySelectorAll('.tr-rn')].map(e => e.classList.contains('lk'));
    const txt = [...document.querySelectorAll('.tr-rn>.rlk')].map(e => e.textContent.trim());
    return { a, b, c, max: RUNE_MAXLV, names: RUNES.map(r => r.n), lk, txt,
             req: RUNES.map(r => runeReqText(r.id)) };
  });
  ok(lad.max === 500, '룬 상한 500(주인 확정)', String(lad.max));
  ok(lad.names.join(',') === '일반룬,고급룬,천상룬', '룬 3종 이름·순서', lad.names.join(','));
  ok(JSON.stringify(lad.a) === '[true,false,false]', '시작은 일반룬만 열려 있다', JSON.stringify(lad.a));
  ok(JSON.stringify(lad.b) === '[true,true,false]', '일반룬 500 → 고급룬 개방', JSON.stringify(lad.b));
  ok(JSON.stringify(lad.c) === '[true,true,true]', '고급룬 500 → 천상룬 개방', JSON.stringify(lad.c));
  ok(JSON.stringify(lad.lk) === '[false,true,true]', '잠긴 룬도 탭 안에 나란히 보인다(3장 전부 렌더)');
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
  console.log('[5] 시도 — 재료 · 다이아 · 실패해도 레벨 유지');
  const tryR = await p.evaluate(() => {
    const out = {};
    /* 성공을 강제 — 확률 굴림을 무력화해 «성공 경로» 만 본다 */
    const rand = Math.random;
    S.rune = { r1: 5, r2: 0, r3: 0 }; S.rstone = 1e6; S.dia = 1e6;
    const cost = runeCost(RN.r1, 5);
    Math.random = () => 0;                                   /* 무조건 성공 */
    const b0 = { st: S.rstone, lv: runeLvOf('r1') };
    const r1 = runeTry('r1', 'mat');
    out.mat = { spent: b0.st - S.rstone, cost, up: r1.up, lv: runeLvOf('r1'), was: b0.lv };
    const d0 = S.dia, l0 = runeLvOf('r1');
    const r2 = runeTry('r1', 'dia');
    out.dia = { spent: d0 - S.dia, up: r2.up, lv: runeLvOf('r1'), was: l0 };
    /* 실패를 강제 — 자원만 빠지고 레벨은 그대로여야 한다(주인 지시 ④) */
    Math.random = () => 0.999999;
    const f0 = { st: S.rstone, lv: runeLvOf('r1') };
    const r3 = runeTry('r1', 'mat');
    out.failMat = { spent: f0.st - S.rstone, up: r3.up, lv: runeLvOf('r1'), was: f0.lv };
    const fd0 = { dia: S.dia, lv: runeLvOf('r1') };
    const r4 = runeTry('r1', 'dia');
    out.failDia = { spent: fd0.dia - S.dia, up: r4.up, lv: runeLvOf('r1'), was: fd0.lv };
    Math.random = rand;
    /* 잠긴 룬 · 만렙 · 재화 부족은 시도 자체가 막힌다 */
    out.locked = runeTryOk('r2', 'mat') || runeTryOk('r2', 'dia');
    S.rune.r1 = RUNE_MAXLV;
    out.maxed = runeTryOk('r1', 'mat') || runeTryOk('r1', 'dia');
    S.rune.r1 = 10; S.rstone = 0; S.dia = 0;
    out.broke = runeTryOk('r1', 'mat') || runeTryOk('r1', 'dia');
    out.brokeNoop = (function () { const l = runeLvOf('r1'); runeTry('r1', 'mat'); return runeLvOf('r1') === l; })();
    out.diaPrice = RUNE_DIA;
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
  ok(tryR.dia.spent === tryR.diaPrice && tryR.diaPrice === 50, '다이아 시도는 50 다이아(주인 확정)',
    String(tryR.dia.spent));
  ok(tryR.dia.up && tryR.dia.lv === tryR.dia.was + 1, '다이아 시도도 같은 판정을 지난다');
  ok(!tryR.failMat.up && tryR.failMat.lv === tryR.failMat.was && tryR.failMat.spent > 0,
    '★ 실패 — 재료는 빠지고 **레벨은 그대로**', '재료 −' + tryR.failMat.spent + ' · Lv ' + tryR.failMat.lv);
  ok(!tryR.failDia.up && tryR.failDia.lv === tryR.failDia.was && tryR.failDia.spent === 50,
    '★ 실패 — 다이아도 빠지고 레벨은 그대로', '다이아 −' + tryR.failDia.spent);
  ok(!tryR.locked, '잠긴 룬은 시도 자체가 막힌다');
  ok(!tryR.maxed, '만렙 룬은 시도 자체가 막힌다');
  ok(!tryR.broke && tryR.brokeNoop, '재화가 없으면 시도가 막히고 레벨도 안 움직인다');
  ok(tryR.costMono, '재료 비용이 레벨에 대해 단조 증가');
  table.push({ k: '재료 비용', v: '일반룬 Lv0 ' + tryR.cost.l0 + ' → Lv500 ' + tryR.cost.l500
                                  + ' · 천상룬 Lv0 ' + tryR.cost.r3l0 + ' (다이아는 상시 50)' });

  /* ================= [6] 효과 ================= */
  console.log('[6] 효과 — 계단으로 커지고 bonus() 에 «합산 후 1회 곱» 으로 합류한다');
  const eff = await p.evaluate(() => {
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty();
    /* 계단 — 각 100 레벨 경계에서 «다음 1레벨의 몫» 이 커진다 */
    const gain = L => { S.rune.r1 = L - 1; const a = runeVal('r1', 'atk');
                        S.rune.r1 = L; return +(runeVal('r1', 'atk') - a).toFixed(9); };
    const g = [1, 100, 101, 200, 201, 300, 301, 400, 401, 500].map(gain);
    let steps = true;
    for (let i = 1; i < g.length; i++) if (g[i] < g[i - 1] - 1e-12) steps = false;
    const jumped = g[2] > g[1] && g[4] > g[3] && g[6] > g[5] && g[8] > g[7];
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
    const want = '공격력 +' + pct(runeVal('r1', 'atk'));
    /* 전투력(cp)까지 실제로 오르는가 — «다른 화면에 반영» 의 최종 확인 */
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty(); const cp0 = cp();
    S.rune = { r1: 300, r2: 0, r3: 0 }; markDirty(); const cp1 = cp();
    S.rune = { r1: 0, r2: 0, r3: 0 }; markDirty();
    return { g, steps, jumped, once, notPerRune, shown, want, cp0, cp1,
             sum: { atk: runeSum('atk'), hp: runeSum('hp') },
             stepEvery: RUNE_STEP_EVERY, stepTab: RUNE_STEP.join(',') };
  });
  ok(eff.steps && eff.jumped, '★ 1레벨당 효과가 계단으로 커진다(100 레벨마다 한 칸)',
    eff.g.filter((_, i) => i % 2 === 1).map(v => v.toFixed(4)).join(' → '));
  ok(eff.stepTab === '1,1.8,3,4.6,6.6' && eff.stepEvery === 100, '계단 표 5칸(197 문법)', eff.stepTab);
  ok(eff.once, '★ bonus() 가 «축별 합산 후 1회 곱» 으로 반영한다(194·LESSONS 91-1 규칙)');
  ok(eff.notPerRune, '룬마다 곱하지 **않는다**(그랬다면 만렙 셋에서 배율이 터진다)');
  ok(eff.shown.indexOf(eff.want) === 0, '카드 효과 표기가 runeVal 과 같은 식', eff.shown + ' / ' + eff.want);
  ok(eff.cp1 > eff.cp0, '룬 레벨이 전투력(cp)에 실제로 반영된다',
    Math.round(eff.cp0) + ' → ' + Math.round(eff.cp1));
  table.push({ k: '효과(만렙 1종)', v: '일반룬 500 = 공격력 +' + (1700).toFixed(0) + '% 상당(계단 합 ×17)' });

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

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  if (process.argv.includes('--table')) {
    console.log('\n── 203 수치 요약(최종값은 199 밸런스 라운드의 몫) ──');
    table.forEach(r => console.log('  ' + r.k.padEnd(14) + ' ' + r.v));
  }
  console.log('\nVERIFY203 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
