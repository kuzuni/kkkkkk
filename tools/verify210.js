/* 작업 210 — «단련» 시스템 신설 (23 훈련 팝업 3번째 탭 · 단련석 · 포인트 자유 배분).
 * 실행: node tools/verify210.js [--table]
 *
 * ROUTINE «기능 완성 규칙»(T2 는 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가
 * 저장(S)·HUD·다른 화면에 반영됨» 이어야 완료) 에 맞춘 게이트다. 절 구성:
 *
 *   [A] 재화     — `tstone` 이 CUR_ICON·CURINFO·가방·giveReward 를 전부 지난다 · 아이콘 1종(125)
 *                 ⚠ **434**(2026-08-30): «입장권은 5종» 상수를 걷어내고 «단련석이 입장권 목록에
 *                 끼어들지 않는다 · 권종 집합 = DUNGEONS 가 쓰는 집합» 으로 갈아 끼웠다(402·430 이관)
 *   [B] 팝업 탭  — «훈련 · 룬 · 단련» 3칸(96 공용 부품 `.sp3`) 이고, **탭이 3개가 돼도 23 의
 *                 좌표가 안 움직인다**(훈련 5요소 bbox Δ0, 세 탭 왕복) · 단련 5줄 겹침 0 · 잘림 0
 *   [C] 비용 계단 — 주인 예시 «~99: 1pt · 100~: 3pt · 200~: 6pt» 와 **정확히 일치** · 구간 폭 100 ·
 *                 맥스 없음(구간이 계속 연장) · 단조 증가 · **UI 가 현재 구간 비용을 적는다**(주인 ⓑ-2)
 *   [D] 회수 보존 — ★ 이 작업의 핵심 불변식(주인 ⓒ). 무작위 배분 → 회수 → 재투자 왕복에서
 *                 총 포인트가 **1pt 도 어긋나지 않는다** · 계단을 넘나든 배분에서도 같다
 *   [E] 실동작   — 전환·투자·회수 **버튼을 실제로 클릭**해서 S 가 바뀌는지(목업 아님)
 *   [F] 효과     — bonus() 에 «축별로 한 번만 곱» 으로 합류 · 3축이 각각 제 축에만 붙는다 ·
 *                 168 훈련·203 룬과 **겹치지 않는 별도 축**
 *   [G] 저장     — 저장·재로드 보존 · 구 세이브(키 없음) 마이그레이션 · 손댄 값 방어
 *   [H] 되돌림 시험 — 일부러 깨 보고 이 게이트가 정말 잡는지(LESSONS 43-①)
 *   [I] 홀드     — **297**(2026-08-28 주인 재지시): 단련 투자·충전 «꾹 누르면 연속».
 *                 진짜 마우스 포인터로 누르고 뗀다 · 단발 1회 · 1초 홀드 3회 이상 · 가속 ·
 *                 뗌 정지 · 포인트 3회분이면 정확히 3회 · **회수는 홀드 제외** ·
 *                 «홀드 중 숫자» == «통짜 재렌더 숫자»(262 교훈 2ⓑ)
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

  /* ================= [A] 재화 ================= */
  console.log('[A] 재화 — 단련석이 125 단일 출처와 33 재화 정보 · 53 가방을 지난다');
  const cur = await p.evaluate(() => ({
    icon: CUR_ICON.tstone,
    ic1: (curIc('tstone').match(/src="([^"]+)"/) || [])[1],
    info: !!CURINFO.tstone, ways: CURINFO.tstone ? CURINFO.tstone.ways.length : 0,
    way0: CURINFO.tstone ? CURINFO.tstone.ways[0] : '',
    val: (function () { S.tstone = 777; return curVal('tstone'); })(),
    def: DEF().tstone, defT: JSON.stringify(DEF().temper),
    bag: (function () { S.tstone = 4321; return bagCur().some(r => r.n === '단련석' && r.q === 4321); })(),
    /* 194 강화석·203 룬강화석과 **다른 재화** 여야 한다 — 아이콘도 잔고도 섞이면 안 된다 */
    apart: CUR_ICON.tstone !== CUR_ICON.stone && CUR_ICON.tstone !== CUR_ICON.rstone
           && (function () { S.stone = 5; S.rstone = 7; S.tstone = 9;
                             return S.stone === 5 && S.rstone === 7 && S.tstone === 9; })(),
    /* 단련석은 던전 계열이 아니다(수급처가 탑이다) — 입장권을 만들지 않았다.
       ⚠ **434(2026-08-30)** — 이 자리는 원래 «`tk*` 키가 **5개**»(125 옛 [H] «계열 5종»)라는
         **손으로 적은 상수**를 셌다. 402 가 주인 지시로 입장권을 «던전마다 한 장»(8종)으로
         뒤집자 그 상수만 뒤처져 빨개졌다 — 제품은 내내 옳았다(`probe434` P1~P6).
       ⚠ 이 항이 지키려던 뜻은 «입장권이 5종» 이 **아니라** «단련석(절망의 탑 보상)이 입장권
         목록에 끼어들지 않는다» 이다. 그래서 숫자만 8 로 고쳐 초록으로 되돌리지 않았다 —
         그렇게 풀면 **던전이 하나 늘 때마다 같은 자리가 네 번째로 뒤처진다**(194·203·402 선례).
         뜻을 묻는 모양으로 갈아 끼운다(328-330 «이관이 본체» · 125 [H] «숫자를 손으로 적지 않는다»
         — 세는 것은 **던전 수와의 일치**이지 어떤 상수가 아니다). */
    tkKeys: Object.keys(CUR_ICON).filter(k => k.startsWith('tk')).sort(),
    dunTkKeys: [...new Set(DUNGEONS.map(d => dunTk(d.id)))].sort(),
    hasTkTstone: !!CUR_ICON.tkTstone,
    tstoneAsTicket: DUNGEONS.filter(d => CUR_ICON[dunTk(d.id)] === CUR_ICON.tstone).map(d => d.id)
  }));
  ok(cur.icon === 'assets/ui/cur-tstone.svg', 'CUR_ICON.tstone 이 전용 SVG 하나', cur.icon);
  ok(cur.ic1 === cur.icon, "curIc('tstone') 이 같은 경로를 낸다(125 단일 출처)", cur.ic1);
  ok(cur.info && cur.ways === 2, '33 재화 정보 팝업에 단련석 등재 · 획득처 2줄', String(cur.ways));
  ok(/절망의 탑/.test(cur.way0), '33 획득처 첫 줄이 «절망의 탑»(주인 지시 ②)', cur.way0);
  ok(cur.val === 777, 'curVal(tstone) 이 보유량을 그대로 읽는다', String(cur.val));
  ok(cur.def === 0 && cur.defT === '{"pts":0,"alloc":{"atk":0,"hp":0,"regen":0}}',
    'DEF() 에 tstone·temper 신설', cur.defT);
  ok(cur.bag, '53 가방 «재화» 탭에 단련석 보유량이 뜬다');
  ok(cur.apart, '194 강화석 · 203 룬강화석과 별개 재화(아이콘·잔고 모두)');
  ok(!cur.hasTkTstone && cur.tstoneAsTicket.length === 0,
    '단련석은 던전 계열이 아니라 입장권을 안 만들었다(434 — 뜻: 어느 던전도 단련석을 권종으로 안 쓴다)',
    cur.tstoneAsTicket.length ? '끼어든 던전 ' + cur.tstoneAsTicket.join(',') : '0개');
  ok(cur.tkKeys.join(',') === cur.dunTkKeys.join(','),
    '입장권 키 집합 = DUNGEONS 가 실제로 쓰는 권종 집합(여분 0 · 434 — 숫자를 손으로 적지 않는다)',
    cur.tkKeys.length + '종 ' + cur.tkKeys.join(','));

  const give = await p.evaluate(() => {
    S.tstone = 0;
    const txt = giveReward({ tstone: 250 });
    return { st: S.tstone, txt, img: /cur-tstone\.svg/.test(txt) };
  });
  ok(give.st === 250, 'giveReward({tstone}) 가 실제로 잔고를 올린다', String(give.st));
  ok(give.img, '보상 문구가 이모지가 아니라 CUR_ICON 이미지를 쓴다(125)');

  /* ================= [B] 팝업 탭 ================= */
  console.log('[B] 팝업 탭 — 3칸이 돼도 23 의 좌표가 한 값도 안 움직인다');
  /* 203 이 못 박아 둔 «훈련 5요소의 .tr-box local 좌표». 210 이 탭을 3개로 늘려도 Δ0 이어야 한다. */
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
    S.tstone = 500; S.dia = 1e6; S.temper = { pts: 300, alloc: { atk: 5, hp: 0, regen: 0 } };
    openTrain(); setTrSub('train');
    const before = KEYS.map(loc);
    const bar = document.getElementById('trSubs');
    const cells = [...bar.querySelectorAll('[data-trsub]')];
    /* 룬 → 단련 → 훈련 왕복. 세 탭을 다 돌고 와도 훈련 좌표가 그대로여야 한다. */
    setTrSub('rune');
    setTrSub('temper');
    const hidden = KEYS.every(k => getComputedStyle(document.querySelector(k)).display === 'none')
                && getComputedStyle(document.querySelector('.tr-runes')).display === 'none';
    const rows = ['.tp-hd', '.tr-tp.k0', '.tr-tp.k1', '.tr-tp.k2', '.tp-ft']
      .map(s => document.querySelector(s)).map(e => e && e.getBoundingClientRect());
    const barR = bar.getBoundingClientRect();
    const sheet = document.querySelector('.tr-sheet').getBoundingClientRect();
    let overlap = 0;
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++)
      if (rows[i] && rows[j] && rows[i].bottom > rows[j].top + 0.5 && rows[j].bottom > rows[i].top + 0.5) overlap++;
    const last = rows[rows.length - 1];
    /* 단련 카드 3장 안에 축 3종이 «각각 하나씩» 있다(중복·누락 0) */
    const keys = [...document.querySelectorAll('.tr-tp')].map(e => e.dataset.temper);
    const btns = ['[data-tpchg]', '[data-tempup]', '[data-tpreset]'].map(s => !!document.querySelector(s));
    setTrSub('train');
    const after = KEYS.map(loc);
    return {
      cells: cells.length, tkeys: cells.map(c => c.dataset.trsub),
      shared: bar.classList.contains('stabs') && bar.classList.contains('sp3')
              && cells.every(c => c.classList.contains('stab')),
      /* 96 공용 부품이 «칸만» 3등분한다 — 바 자신의 자리·폭은 203 과 같아야 한다 */
      barLoc: (function () { const r = bar.getBoundingClientRect(), bb = box();
                             return [+(r.x - bb.x).toFixed(2), +r.width.toFixed(2)]; })(),
      pinned: KEYS.every((k, i) => JSON.stringify(before[i]) === JSON.stringify(PIN[k])),
      same: JSON.stringify(before) === JSON.stringify(after),
      before, after, hidden, overlap, rows: rows.filter(Boolean).length,
      keys: keys.join(','), btns,
      belowBar: last.bottom <= barR.top + 0.5,
      inSheet: barR.bottom <= sheet.bottom + 0.5 && rows[0].top >= sheet.top - 0.5,
      onTrain: document.querySelector('#trSubs [data-trsub="train"]').classList.contains('on'),
      showTrain: getComputedStyle(document.querySelector('.tr-cards')).display
    };
  }, PIN23);
  ok(tab.cells === 3 && tab.tkeys.join(',') === 'train,rune,temper',
    '팝업 탭이 «훈련 · 룬 · 단련» 3칸', tab.tkeys.join(','));
  ok(tab.shared, '96 공용 서브탭 부품(.stabs.sp3 > .stab) 을 그대로 쓴다');
  ok(JSON.stringify(tab.barLoc) === JSON.stringify([126, 794]),
    '서브탭 바 자신의 left·width 는 203 값 그대로(칸만 3등분)', JSON.stringify(tab.barLoc));
  ok(tab.pinned, '★ 훈련 5요소의 박스 local 좌표가 203 이전 값과 Δ0 — 탭이 3개가 돼도 23 이 안 밀렸다',
    tab.pinned ? '' : JSON.stringify(tab.before));
  ok(tab.same, '룬·단련을 거쳐 돌아와도 훈련 좌표가 그대로(3탭 왕복 Δ0)',
    tab.same ? '' : JSON.stringify(tab.before) + ' vs ' + JSON.stringify(tab.after));
  ok(tab.hidden, '단련 탭에서는 훈련 5요소·룬 본문이 display:none — 같은 자리를 번갈아 쓴다');
  ok(tab.rows === 5, '단련 본문 5줄(충전 · 축 카드 3 · 회수)이 전부 그려진다', String(tab.rows));
  ok(tab.overlap === 0, '단련 5줄 서로 겹침 0건', String(tab.overlap));
  ok(tab.keys === 'atk,hp,regen', '축 3종이 각각 카드 하나씩(중복·누락 0)', tab.keys);
  ok(tab.btns.every(Boolean), '전환·투자·회수 버튼이 실제 노드로 있다', JSON.stringify(tab.btns));
  ok(tab.belowBar, '단련 본문이 서브탭 바 위에서 끝난다(바를 안 침범)');
  ok(tab.inSheet, '서브탭 바·단련 본문이 시트 안에 들어간다(잘림 0)');
  ok(tab.onTrain && tab.showTrain === 'block', '기본 탭은 여전히 «훈련» 이다', tab.showTrain);

  /* ================= [C] 비용 계단 ================= */
  console.log('[C] 비용 계단 — 주인 예시 1/3/6 과 정확히 일치 · 구간 폭 100 · 맥스 없음');
  const cost = await p.evaluate(() => {
    const at = l => { S.temper = { pts: 0, alloc: { atk: l, hp: 0, regen: 0 } }; return temperCost('atk'); };
    const seg = [0, 1, 2, 3, 4, 5].map(temperSegCost);
    const probe = [0, 1, 98, 99, 100, 101, 199, 200, 201, 299, 300, 999].map(l => [l, at(l)]);
    /* 단조 비감소 — 레벨이 올라가는데 비용이 싸지는 구간이 있으면 안 된다 */
    let mono = true, prev = 0;
    for (let l = 0; l <= 1200; l++) { const c = at(l); if (c < prev) mono = false; prev = c; }
    /* «맥스 없음»(주인 ⓑ) — 상한 상수가 없고 아주 높은 레벨도 유한한 비용이 나온다 */
    const far = at(100000);
    return { seg, probe, mono, far, width: TEMPER_SEG, reset: TEMPER_RESET_DIA };
  });
  ok(cost.width === 100, '구간 폭이 주인 예시대로 100', String(cost.width));
  ok(cost.seg.slice(0, 3).join(',') === '1,3,6',
    '★ 구간 비용이 주인 예시 «~99:1 · 100~:3 · 200~:6» 과 정확히 일치', cost.seg.slice(0, 3).join(','));
  ok(cost.seg.join(',') === '1,3,6,10,15,21',
    '그 뒤 구간은 삼각수로 연장된다(계차가 1씩 커진다)', cost.seg.join(','));
  const cmap = Object.fromEntries(cost.probe);
  ok(cmap[0] === 1 && cmap[99] === 1 && cmap[100] === 3 && cmap[199] === 3 && cmap[200] === 6,
    '레벨 → 비용 경계가 99/100 · 199/200 에서 정확히 갈린다',
    [0, 99, 100, 199, 200].map(l => l + ':' + cmap[l]).join(' '));
  ok(cost.mono, '0~1200 레벨 전수에서 비용이 단조 비감소');
  ok(Number.isFinite(cost.far) && cost.far > 0, '맥스 없음 — Lv 100000 도 유한한 비용', String(cost.far));
  ok(cost.reset === 1000, '회수 비용이 주인 확정값 1000 다이아', String(cost.reset));

  const ui = await p.evaluate(() => {
    S.tstone = 0; S.dia = 1e6; S.temper = { pts: 5, alloc: { atk: 150, hp: 0, regen: 0 } };
    openTrain(); setTrSub('temper'); renderTemper();
    const card = document.querySelector('.tr-tp[data-temper="atk"]');
    return { tc: card.querySelector('.tc').textContent, tb: card.querySelector('.tb').textContent,
             cost: temperCost('atk') };
  });
  ok(ui.cost === 3 && /3\s*pt/.test(ui.tc) && /100~199/.test(ui.tc),
    '★ UI 가 «현재 구간 비용» 을 적는다(주인 ⓑ-2) — Lv150 → 3pt · 100~199 구간', ui.tc.replace(/\s+/g, ' '));
  ok(/3\s*pt/.test(ui.tb), '투자 버튼에도 같은 비용이 적힌다(표기층 두 벌 금지)', ui.tb.replace(/\s+/g, ' '));

  /* ================= [D] 회수 보존 ================= */
  console.log('[D] ★ 회수 보존 — 투자 → 회수 → 재투자 왕복에서 총 포인트가 1pt 도 안 어긋난다');
  const rt = await p.evaluate(() => {
    /* 재현 가능한 의사난수(Date.now/Math.random 없이) — 배분이 회차마다 같아야 실패를 재현한다 */
    let s = 20260827;
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    const runs = [];
    for (let t = 0; t < 40; t++) {
      const budget = 50 + Math.floor(rnd() * 60000);      /* 계단을 여러 개 넘나드는 예산 */
      S.dia = 1e9; S.tstone = 0; S.temper = { pts: budget, alloc: { atk: 0, hp: 0, regen: 0 } };
      const keys = ['atk', 'hp', 'regen'];
      let spins = 0;
      /* 무작위 축에 살 수 있는 만큼 산다 — «올빵» 도 «골고루» 도 섞여 나온다 */
      while (spins < 20000) {
        const k = keys[Math.floor(rnd() * 3)];
        if (!temperUpOk(k)) {
          if (!keys.some(x => temperUpOk(x))) break;
          spins++; continue;
        }
        temperUp(k); spins++;
      }
      const left = temperPts(), lv = keys.map(temperLv);
      const back = temperReset();
      runs.push({ budget, left, lv, back, after: temperPts(),
                  keep: temperPts() === budget, zero: keys.every(k => temperLv(k) === 0) });
    }
    return { runs, allKeep: runs.every(r => r.keep), allZero: runs.every(r => r.zero),
             spread: runs.some(r => r.lv[0] > 100) && runs.some(r => r.lv.every(x => x > 0)) };
  });
  const bad = rt.runs.filter(r => !r.keep);
  ok(rt.allKeep, '★ 무작위 배분 40회 전부 «회수 후 총 포인트 = 처음 예산» (오차 0pt)',
    bad.length ? JSON.stringify(bad[0]) : rt.runs.length + '회');
  ok(rt.allZero, '회수하면 3축 레벨이 전부 0 으로 돌아간다');
  ok(rt.spread, '시험 배분이 계단을 실제로 넘고(>Lv100) 3축 분산도 섞였다(단언이 공허하지 않다)');
  const cross = await p.evaluate(() => {
    /* 계단 경계를 정확히 걸친 배분 — 닫힌 식과 «한 레벨씩 더한 값» 이 같은가 */
    const out = [];
    [0, 1, 99, 100, 101, 250, 1000].forEach(L => {
      let sum = 0;
      S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } };
      for (let i = 0; i < L; i++) { sum += temperCost('atk'); S.temper.alloc.atk = i + 1; }
      out.push([L, sum, temperSpent(L)]);
    });
    return out;
  });
  ok(cross.every(r => r[1] === r[2]),
    '★ 닫힌 식 temperSpent(L) 이 «한 레벨씩 실제로 낸 합» 과 정확히 같다',
    cross.map(r => r[0] + ':' + r[1]).join(' '));

  /* ================= [E] 실동작 ================= */
  console.log('[E] 실동작 — 전환·투자·회수 버튼을 실제로 클릭해서 S 가 바뀐다(목업 아님)');
  await p.evaluate(() => {
    S.tstone = 120; S.dia = 5000; S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } };
    openTrain(); setTrSub('temper'); renderTemper();
  });
  await p.click('[data-tpchg]'); await p.waitForTimeout(120);
  const e1 = await p.evaluate(() => ({ st: S.tstone, pts: temperPts() }));
  ok(e1.st === 0 && e1.pts === 120, '[전환] 클릭 → 단련석 120 이 포인트 120 이 된다',
    '단련석 ' + e1.st + ' · 포인트 ' + e1.pts);
  await p.click('.tr-tp[data-temper="atk"] [data-tempup]'); await p.waitForTimeout(120);
  await p.click('.tr-tp[data-temper="regen"] [data-tempup]'); await p.waitForTimeout(120);
  const e2 = await p.evaluate(() => ({ a: temperLv('atk'), h: temperLv('hp'), r: temperLv('regen'),
                                       pts: temperPts() }));
  ok(e2.a === 1 && e2.r === 1 && e2.h === 0 && e2.pts === 118,
    '[투자] 클릭 → 누른 축만 Lv+1 · 포인트가 그만큼 빠진다',
    JSON.stringify(e2));
  const e3 = await p.evaluate(() => {
    /* «한 스탯 올빵» 이 실제로 가능한가(주인 ⓐ — 골고루 강제 없음) */
    S.temper = { pts: 60, alloc: { atk: 0, hp: 0, regen: 0 } };
    for (let i = 0; i < 60; i++) temperUp('atk');
    return { a: temperLv('atk'), h: temperLv('hp'), r: temperLv('regen'), pts: temperPts() };
  });
  ok(e3.a === 60 && e3.h === 0 && e3.r === 0 && e3.pts === 0,
    '한 축 «올빵» 이 가능하다(골고루 강제 없음 — 주인 ⓐ)', JSON.stringify(e3));
  const diaBefore = await p.evaluate(() => { S.dia = 5000; renderTemper(); return S.dia; });
  await p.click('[data-tpreset]'); await p.waitForTimeout(150);
  const e4 = await p.evaluate(() => ({ dia: S.dia, pts: temperPts(), a: temperLv('atk') }));
  ok(e4.dia === diaBefore - 1000 && e4.a === 0 && e4.pts === 60,
    '[회수] 클릭 → 다이아 1000 차감 · 레벨 0 · 포인트 60 전액 환급',
    '다이아 ' + e4.dia + ' · 포인트 ' + e4.pts);
  const e5 = await p.evaluate(() => {
    /* 못 사는 상황에서는 실제로 막힌다(회색 버튼이 장식이 아니다) */
    S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } }; S.tstone = 0; S.dia = 10;
    renderTemper();
    const before = { pts: temperPts(), dia: S.dia };
    const gray = ['[data-tpchg]', '.tr-tp[data-temper="atk"] [data-tempup]', '[data-tpreset]']
      .every(s => document.querySelector(s).classList.contains('no'));
    const upBlocked = temperUp('atk') === false;
    const chgBlocked = temperCharge() === 0;
    const rstBlocked = temperReset() === 0;
    return { gray, upBlocked, chgBlocked, rstBlocked,
             same: temperPts() === before.pts && S.dia === before.dia };
  });
  ok(e5.gray, '재화가 없으면 세 버튼이 전부 회색(.no)이다(202 상태색)');
  ok(e5.upBlocked && e5.chgBlocked && e5.rstBlocked && e5.same,
    '회색일 때 실제로도 막힌다 — 포인트·다이아가 1도 안 움직인다');
  const e6 = await p.evaluate(() => {
    /* 서브탭 레드닷(166) — «누를 게 있다» 일 때만.
       ⚠ 탭 상태(on/alert)를 켜고 끄는 곳은 `renderRunes()` **한 곳뿐**이다(203 이 세운 규약).
       `renderTemper()` 는 본문만 그린다 — 그래서 여기서도 renderTrain() 으로 한 바퀴를 돌린다. */
    S.tstone = 0; S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } };
    renderTrain();
    const off = !document.querySelector('#trSubs [data-trsub="temper"]').classList.contains('alert');
    S.tstone = 10; renderTrain();
    const on = document.querySelector('#trSubs [data-trsub="temper"]').classList.contains('alert');
    return { off, on };
  });
  ok(e6.off && e6.on, '단련 서브탭 레드닷이 «전환·투자할 게 있을 때만» 켜진다(166)');

  /* ================= [F] 효과 ================= */
  console.log('[F] 효과 — bonus() 에 축별로 한 번만 곱해 붙는다 · 168·203 과 별개 축');
  const eff = await p.evaluate(() => {
    const zero = () => { S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } }; markDirty(); return bonus(); };
    const b0 = Object.assign({}, zero());
    S.temper = { pts: 0, alloc: { atk: 50, hp: 0, regen: 0 } }; markDirty();
    const bA = Object.assign({}, bonus());
    S.temper = { pts: 0, alloc: { atk: 0, hp: 50, regen: 0 } }; markDirty();
    const bH = Object.assign({}, bonus());
    S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 50 } }; markDirty();
    const bR = Object.assign({}, bonus());
    S.temper = { pts: 0, alloc: { atk: 50, hp: 0, regen: 0 } }; markDirty();
    const once = bonus().atk / b0.atk;                 /* 축별 1회 곱이면 정확히 1 + 50×계수 */
    const back = Object.assign({}, zero());
    return {
      atkOnly: bA.atk > b0.atk && Math.abs(bA.hp - b0.hp) < 1e-9 && Math.abs(bA.regen - b0.regen) < 1e-9,
      hpOnly:  bH.hp  > b0.hp  && Math.abs(bH.atk - b0.atk) < 1e-9,
      regOnly: bR.regen > b0.regen && Math.abs(bR.atk - b0.atk) < 1e-9,
      once, want: 1 + 50 * TEMPER_EFF.atk,
      val: temperVal.toString().length > 0,
      off: Math.abs(back.atk - b0.atk) < 1e-9,
      /* 168 훈련·203 룬과 겹치지 않는 별개 축인가 — 훈련·룬을 0 으로 두고도 단련만으로 오른다 */
      apart: (function () {
        S.rune = { r1: 0, r2: 0, r3: 0 };
        S.temper = { pts: 0, alloc: { atk: 100, hp: 0, regen: 0 } }; markDirty();
        const withT = bonus().atk;
        S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } }; markDirty();
        return withT > bonus().atk;
      })()
    };
  });
  ok(eff.atkOnly && eff.hpOnly && eff.regOnly, '3축이 각각 제 축에만 붙는다(교차 오염 0)');
  ok(Math.abs(eff.once - eff.want) < 1e-9,
    '★ «축별로 한 번만 곱» — 배율이 정확히 1 + Lv×계수 (LESSONS 91-1)',
    eff.once.toFixed(6) + ' vs ' + eff.want.toFixed(6));
  ok(eff.off, '레벨을 0 으로 되돌리면 효과도 정확히 사라진다(«켜 두고 안 끄는» 버그 방지)');
  ok(eff.apart, '203 룬을 전부 0 으로 둬도 단련만으로 공격력이 오른다(별도 축 — 주인 ⓓ)');
  const show = await p.evaluate(() => {
    S.temper = { pts: 0, alloc: { atk: 25, hp: 0, regen: 0 } };
    openTrain(); setTrSub('temper'); renderTemper();
    const td = document.querySelector('.tr-tp[data-temper="atk"] .td').textContent;
    return { td, want: pct(temperVal('atk')) };
  });
  ok(show.td.indexOf(show.want) >= 0,
    '카드 효과 표기가 bonus() 와 **같은 식**(temperVal)을 쓴다', show.td.replace(/\s+/g, ' '));

  /* ================= [G] 저장 ================= */
  console.log('[G] 저장 — 재로드 보존 · 구 세이브 마이그레이션 · 손댄 값 방어');
  const sav = await p.evaluate(() => {
    S.tstone = 13579; S.temper = { pts: 246, alloc: { atk: 120, hp: 7, regen: 0 } }; save();
    const raw = JSON.parse(localStorage.getItem(KEY));
    return { rawSt: raw.tstone, rawT: JSON.stringify(raw.temper) };
  });
  await p.reload(); await p.waitForTimeout(1100);
  const back = await p.evaluate(() => ({ st: S.tstone, t: JSON.stringify(S.temper),
                                         lv: temperLv('atk'), spent: temperSpentAll(),
                                         want: temperSpent(120) + temperSpent(7) + temperSpent(0) }));
  ok(sav.rawSt === 13579 && sav.rawT === '{"pts":246,"alloc":{"atk":120,"hp":7,"regen":0}}',
    '세이브에 실제로 기록된다', sav.rawT);
  ok(back.st === 13579 && back.t === '{"pts":246,"alloc":{"atk":120,"hp":7,"regen":0}}',
    '재로드 후 보존된다', back.t);
  ok(back.lv === 120 && back.spent === back.want && back.spent > 0,
    '재로드 후 «회수하면 돌려줄 총액» 도 그대로', String(back.spent));

  const mig = await p.evaluate(() => {
    /* 구 세이브 = 두 키가 아예 없는 상태(210 이전). 203 과 같은 «없으면 기본값» 마이그레이션 */
    const d = JSON.parse(localStorage.getItem(KEY));
    delete d.tstone; delete d.temper;
    localStorage.setItem(KEY, JSON.stringify(d));
    load();
    const a = { st: S.tstone, t: JSON.stringify(S.temper) };
    /* 손댄 세이브 = 범위 밖·다른 타입·없는 축 */
    const d2 = JSON.parse(localStorage.getItem(KEY));
    d2.tstone = -50; d2.temper = { pts: -9, alloc: { atk: 12.7, hp: 'x', zzz: 7 } };
    localStorage.setItem(KEY, JSON.stringify(d2));
    load();
    return { old: a, bad: { st: S.tstone, t: JSON.stringify(S.temper) },
             ver: (JSON.parse(localStorage.getItem(KEY)) || {}).v };
  });
  ok(mig.old.st === 0 && mig.old.t === '{"pts":0,"alloc":{"atk":0,"hp":0,"regen":0}}',
    '구 세이브(키 없음) → 단련석 0 · 포인트 0 · 3축 Lv0 (KEY 안 올림)', mig.old.t);
  ok(mig.bad.st === 0 && mig.bad.t === '{"pts":0,"alloc":{"atk":12,"hp":0,"regen":0}}',
    '손댄 세이브는 음수→0 · 소수→내림 · 없는 축은 버린다', mig.bad.st + ' / ' + mig.bad.t);

  /* ================= [H] 되돌림 시험 ================= */
  console.log('[H] 되돌림 시험 — 일부러 깨 보고 이 게이트가 잡는지(LESSONS 43-①)');
  const neg = await p.evaluate(() => {
    const out = {};
    /* ⓐ 회수를 «레벨 수 × 1pt» 로 계산하면(계단 무시) 보존이 깨지는가 —
       그렇다면 [D] 의 단언이 공허하지 않다 */
    S.temper = { pts: 0, alloc: { atk: 250, hp: 0, regen: 0 } };
    out.a = temperSpentAll() !== 250 && temperSpentAll() > 250;
    /* ⓑ 구간 폭을 100 이 아닌 값으로 읽으면 경계가 어긋나는가 */
    out.b = temperSegCost(Math.floor(99 / 100)) !== temperSegCost(Math.floor(100 / 100));
    /* ⓒ 계단이 실제로 «다음 구간이 더 비싸다» 인가(단조 단언이 공허하지 않은가) */
    out.c = temperSegCost(1) > temperSegCost(0) && temperSegCost(2) > temperSegCost(1);
    /* ⓓ 효과가 레벨에 실제로 비례하는가(0 이 아닌 계수인가) */
    S.temper = { pts: 0, alloc: { atk: 10, hp: 0, regen: 0 } };
    const v10 = temperVal('atk');
    S.temper.alloc.atk = 20;
    out.d = temperVal('atk') > v10 && v10 > 0;
    /* ⓔ 포인트가 모자란데 투자되면 안 된다 */
    S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } };
    out.e = temperUp('atk') === false && temperLv('atk') === 0;
    /* ⓕ **434** — [A] 의 갈아 끼운 «입장권» 두 항이 무르게 풀린 게 아님을 못박는다.
       단련석 입장권을 일부러 끼워 넣으면 두 항이 **둘 다** 빨개져야 하고, 원복하면 초록이어야
       한다. (옛 «키가 5개» 상수는 이 조작을 하면 오히려 **6 이 되어** 여전히 빨간 채였고,
        조작을 안 해도 8 이라 빨갰다 — 뜻과 무관하게 빨간 자였다는 것이 이 대조의 요점이다.) */
    const tkOf  = () => Object.keys(CUR_ICON).filter(k => k.startsWith('tk')).sort().join(',');
    const dunOf = () => [...new Set(DUNGEONS.map(d => dunTk(d.id)))].sort().join(',');
    const same  = () => tkOf() === dunOf();
    const g0 = !CUR_ICON.tkTstone && same();                 /* 손대기 전 = 초록 */
    CUR_ICON.tkTstone = CUR_ICON.tstone;                     /* 일부러 끼워 넣는다 */
    const red = !!CUR_ICON.tkTstone && !same();              /* 두 항 다 빨강 */
    delete CUR_ICON.tkTstone;                                /* 원복 */
    out.f = g0 && red && !CUR_ICON.tkTstone && same();
    return out;
  });
  ok(neg.a, 'ⓐ 회수액이 «레벨 수» 가 아니라 «계단을 밟은 총액» 이다(250Lv → 250pt 아님)');
  ok(neg.b, 'ⓑ 구간 경계(99/100)가 실제로 비용을 가른다');
  ok(neg.c, 'ⓒ 계단이 실제로 올라간다(단조 단언이 공허하지 않다)');
  ok(neg.d, 'ⓓ 효과가 레벨에 비례한다(계수가 0 이 아니다)');
  ok(neg.e, 'ⓔ 포인트가 모자라면 투자가 실제로 막힌다');
  ok(neg.f, 'ⓕ 434 — 단련석 입장권을 끼워 넣으면 [A] 의 «입장권» 두 항이 빨개진다(원복하면 초록)');

  /* ================= [I] 절망의 탑 (주인 지시 ②) ================= */
  console.log('[I] 절망의 탑 — 209 «탑» 탭에 나란히 · 규칙 209 준용 · 보상 = 단련석');
  const tw = await p.evaluate(() => ({
    n: TOWER_D.n, id: TOWER_D.id, fk: TOWER_D.fk,
    list: TOWERS.map(t => t.id).join(','),
    /* 보상이 «단련 재료» 한 종인가 — 주인 지시 ② */
    rwKeys: Object.keys(TOWER_D.rw(1)),
    rw: [1, 2, 5, 10].map(f => TOWER_D.rw(f).tstone),
    req: [1, 2, 5, 10].map(f => Math.round(TOWER_D.req(f))),
    /* 209 와 **다른 진행 키** — 한 탑을 깬다고 다른 탑 층이 오르면 안 된다 */
    apartKey: TOWER.fk !== TOWER_D.fk,
    inDun: DUNGEONS.some(d => d.id === TOWER_D.id),   /* 209 규약 — 던전 목록에 안 들어간다 */
    hasUi: !!DUN_UI[TOWER_D.id],
    def: DEF().tower2,
    /* 209 의 «탑인가» 판정이 절망의 탑도 잡는가 — 못 잡으면 ①③④(입장권·소탕·층선택)가 딸려 온다 */
    isT: isTower(TOWER_D) && isTower(TOWER) && !isTower(DUNGEONS[0])
  }));
  ok(tw.n === '절망의 탑' && tw.id === 'despair', '「절망의 탑」 이 모델에 있다', tw.n);
  ok(tw.list === 'tower,despair', '탑 목록에 시련의 탑과 **나란히** 선다', tw.list);
  ok(tw.rwKeys.join(',') === 'tstone', '★ 클리어 보상 = 단련석 한 종(주인 지시 ②)', tw.rwKeys.join(','));
  ok(tw.rw.every((v, i) => v > 0 && (i === 0 || v > tw.rw[i - 1])), '보상이 층에 비례해 증가', tw.rw.join(' → '));
  ok(tw.req.every((v, i) => v > 0 && (i === 0 || v > tw.req[i - 1])), '요구 전투력이 층마다 단조 증가',
    tw.req.join(' → '));
  ok(tw.req[0] > 505, '첫 층이 기본 캐릭터 cp() 505 위 — 시련의 탑보다 한 단 어렵다', String(tw.req[0]));
  ok(tw.apartKey && tw.def === 1, '진행 키가 시련의 탑과 별개(S.tower2, 기본 1층)', tw.fk);
  ok(!tw.inDun && tw.hasUi, '209 규약 준용 — DUNGEONS 에는 없고 DUN_UI 칸만 있다');
  ok(tw.isT, 'isTower() 가 절망의 탑도 «탑» 으로 잡는다(입장권·소탕·층선택이 안 딸려 온다)');

  const twRun = await p.evaluate(() => {
    S.tower = 3; S.tower2 = 1; S.tstone = 0; S.relic = 0;
    openDungeon(); setDunSub('tower');
    const cards = [...document.querySelectorAll('#dunList [data-tcard]')].map(e => e.dataset.tcard);
    /* 434 — **그린 것**으로도 못박는다(125 H3 식): 단련석 보상 탑의 카드가 입장권 칸에
       입장권을 그리면 «탑에는 권종이 없다» 가 선언에서만 참인 것이 된다. */
    const tkDrawn = [...document.querySelectorAll('#dunList [data-tcard]')].map(e => {
      const cell = e.querySelector('.sp.tk');
      return { id: e.dataset.tcard, txt: cell ? cell.textContent.trim() : null,
               imgs: cell ? cell.querySelectorAll('img.cic').length : -1 };
    });
    /* 절망의 탑 카드를 눌러 세부를 연다 — 어느 탑을 눌렀는지 카드가 말한다 */
    openTowerDetail('despair');
    const det = { title: document.getElementById('dgdTitle').textContent,
                  floor: document.getElementById('dgdFloor').textContent,
                  amt: document.getElementById('dgdAmt').textContent,
                  icon: /cur-tstone\.svg/.test(document.getElementById('dgdIcon').innerHTML),
                  prev: document.getElementById('dgdPrev').disabled,
                  next: document.getElementById('dgdNext').disabled,
                  sweep: document.getElementById('dgdSweep').disabled
                         || document.getElementById('dgdSweep').classList.contains('lk') };
    closeDunDetail();
    /* 실제로 한 층을 돌려서 깬다 — 단련석이 들어오고 «절망의 탑만» 층이 오른다 */
    const relBefore = S.relic, t1Before = S.tower;
    challengeTower('despair');
    const running = !!dunRun && dunRun.f === 1 && dunRun.d.id === 'despair';
    endDunRun(true, false);
    return { cards: cards.join(','), det, running, tkDrawn,
             t1: S.tower, t1Before, t2: S.tower2, tstone: S.tstone,
             relSame: S.relic === relBefore };
  });
  ok(twRun.cards === 'tower,despair', '«탑» 탭에 카드 2장이 나란히 뜬다', twRun.cards);
  ok(twRun.tkDrawn.length === 2
     && twRun.tkDrawn.every(d => d.imgs === 0 && /없음/.test(d.txt || '')),
    '★ 434 — 탑 카드가 **그린** 것도 입장권이 아니다(입장권 이미지 0장 · «없음»)',
    twRun.tkDrawn.map(d => d.id + ':' + d.txt + '(img ' + d.imgs + ')').join(' · '));
  ok(twRun.det.title === '절망의 탑' && twRun.det.floor === '1', '세부 팝업이 절망의 탑 1층을 연다',
    twRun.det.title + ' ' + twRun.det.floor);
  ok(twRun.det.icon && twRun.det.amt !== '', '보상 칸이 단련석 아이콘·수량을 그린다(125)', twRun.det.amt);
  ok(twRun.det.prev && twRun.det.next, '209 ② 준용 — ◀▶ 둘 다 잠김(현재 층만 도전)');
  ok(twRun.det.sweep, '209 ③ 준용 — [소탕] 잠김');
  ok(twRun.running, '[도전] 이 절망의 탑 1층 런을 실제로 시작한다');
  ok(twRun.t2 === 2 && twRun.tstone > 0, '★ 클리어 → 절망의 탑 층 +1 · 단련석이 실제로 들어온다',
    '층 ' + twRun.t2 + ' · 단련석 ' + twRun.tstone);
  ok(twRun.t1 === twRun.t1Before && twRun.relSame,
    '★ 시련의 탑 층·유물조각은 1도 안 움직인다(탑끼리 진행이 안 섞인다)', '시련 ' + twRun.t1 + '층');

  const twSave = await p.evaluate(() => {
    save();
    const raw = JSON.parse(localStorage.getItem(KEY));
    const d = JSON.parse(localStorage.getItem(KEY));
    delete d.tower2; localStorage.setItem(KEY, JSON.stringify(d)); load();
    const old = S.tower2;
    const d2 = JSON.parse(localStorage.getItem(KEY));
    d2.tower2 = -3; localStorage.setItem(KEY, JSON.stringify(d2)); load();
    return { raw: raw.tower2, old, bad: S.tower2 };
  });
  ok(twSave.raw === 2, '절망의 탑 진행이 세이브에 남는다', String(twSave.raw));
  ok(twSave.old === 1 && twSave.bad === 1,
    '구 세이브(키 없음)·손댄 값이 1층으로 정화된다(209 와 같은 자)', twSave.old + '/' + twSave.bad);
  /* 단련의 «수급 → 전환 → 투자» 가 실제로 한 바퀴 도는가 — 기능 완성 규칙의 핵심 */
  const loop = await p.evaluate(() => {
    S.tower2 = 1; S.tstone = 0; S.temper = { pts: 0, alloc: { atk: 0, hp: 0, regen: 0 } };
    markDirty(); const atk0 = bonus().atk;
    challengeTower('despair'); endDunRun(true, false);      /* 절망의 탑 1층 클리어 */
    const got = Math.floor(S.tstone);
    const pts = temperCharge();                             /* 전환 */
    const up = temperUp('atk');                             /* 투자 */
    markDirty();
    return { got, pts, up, lv: temperLv('atk'), atkUp: bonus().atk > atk0,
             bag: bagCur().some(r => r.n === '단련석') };
  });
  ok(loop.got > 0, '★ 절망의 탑 클리어 → 단련석 획득', String(loop.got));
  ok(loop.pts === loop.got, '★ 전환 → 단련 포인트', String(loop.pts));
  ok(loop.up && loop.lv === 1, '★ 투자 → 공격력 단련 Lv1');
  ok(loop.atkUp, '★ 그 결과가 bonus() 전투력에 실제로 반영된다(목업 아님 — 기능 완성 규칙)');

  /* ================= [I] 297 «꾹 누르면 연속» =================
     2026-08-28 주인 재지시 — 210 이 «전부 확정 처리라 룬과 달리 꾹 누르기도 확률도 없다» 로
     못 박아 뒀던 자리가 뒤집혔다(«단련 부분도 토글하는 거 연속으로 강화되게 돼야 하는데»).
     **진짜 마우스 포인터**로 누르고 뗀다 — LESSONS 262-1(게이트는 «어떤 리스너에 걸렸나» 가
     아니라 «사용자가 무엇을 하나» 를 흉내 내야 구현 방식이 바뀌어도 산다). */
  console.log('[I] 297 — 단련 투자·충전 «꾹 누르면 연속»(주인 재지시)');
  const TB = '.tr-tp[data-temper="atk"] [data-tempup]';
  const CG = '#trTemper [data-tpchg]';
  const RS = '#trTemper [data-tpreset]';
  const setT = async o => {
    const r = await p.evaluate(x => {
      /* 결정성 — 자동 전투가 도는 채로 30초를 지나면 레벨업·보상 팝업이 버튼을 덮는다 */
      if (typeof step === 'function') step = () => {};
      /* 앞 절(절망의 탑 런)이 남긴 던전 클리어 팝업 `#dclw` 가 버튼 위를 덮는다 —
         전부 닫고 시작한다(LESSONS 263-②: 하네스가 «눌렀다» 고 믿는 자리에서 게임은 다른 답을 한다) */
      ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult']
        .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      S.temper = { pts: x.pts, alloc: { atk: 0, hp: 0, regen: 0 } };
      S.tstone = x.st || 0; S.dia = x.dia == null ? 100000 : x.dia;
      openTrain(); setTrSub('temper'); renderTrain();
      return { pts: temperPts(), cost: temperCost('atk') };
    }, o);
    /* ⚠ 23 팝업은 슬라이드 애니메이션이 있다 — 곧바로 재면 아직 움직이는 중의 좌표를 집는다(164) */
    await p.waitForTimeout(420);
    return r;
  };
  let hitOk210 = true;
  const center210 = async sel => {
    const bb = await p.locator(sel).boundingBox();
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    const on = await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      return !!(el && el.closest && el.closest(o.sel));
    }, { sel, x: c.x, y: c.y });
    if (!on) hitOk210 = false;
    return c;
  };
  /* 액셔너빌리티 — `hover()` 는 «보이고 · 안정되고 · 그 좌표에서 이벤트를 실제로 받는» 상태가
     될 때까지 기다렸다가 마우스를 그 중심으로 옮긴다. 앞 절이 남긴 팝업·슬라이드 애니메이션이
     버튼을 덮고 있으면 여기서 걸린다(고정 대기는 «가끔 통과» 로 굳는다 — LESSONS 138-2). */
  const aim = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    await p.locator(sel).hover();
    await center210(sel);                       /* 양성항 기록 — 최상단 노드가 정말 그 버튼인가 */
  };
  const press210 = async (sel, ms) => {
    await aim(sel);
    await p.mouse.down();
    if (ms) await p.waitForTimeout(ms);
    await p.mouse.up();
    await p.waitForTimeout(80);
  };
  const lvAtk = () => p.evaluate(() => temperLv('atk'));

  await setT({ pts: 100000 });
  await press210(TB, 0);
  const t1 = await lvAtk();
  ok(t1 === 1, '단발 탭 = 정확히 1회 투자(누를 때 1 + 뗄 때 1 이 아니다 — 64 ⓐ)', 'Lv ' + t1);

  await setT({ pts: 100000 });
  await press210(TB, 1000);
  const tHold = await lvAtk();
  ok(tHold >= 3, '★ 꾹 누르면 연속 투자된다 — 1초 홀드에 3회 이상', tHold + '회');
  table.push('홀드 1초 = ' + tHold + '회 투자');

  const tStop = await lvAtk();
  await p.waitForTimeout(500);
  ok(await lvAtk() === tStop, '손을 떼면 즉시 멈춘다(뗀 뒤 500ms 동안 0회)');

  await setT({ pts: 100000 });
  {
    await aim(TB);
    await p.mouse.down();
    await p.waitForTimeout(900);
    const mid = await lvAtk();
    await p.waitForTimeout(900);
    const end = await lvAtk();
    await p.mouse.up(); await p.waitForTimeout(80);
    ok(end - mid > mid, '반복이 가속된다(TR_HOLD_ACCEL 0.86) — 뒤 900ms 가 앞 900ms 보다 많다',
      mid + ' → ' + (end - mid));
  }

  /* 포인트가 딱 3회분이면 «정확히 3회» 에서 조용히 멈춘다(119 G4 — 반복분은 무알림) */
  await setT({ pts: 3 });
  await press210(TB, 2000);
  const t3 = await p.evaluate(() => ({ lv: temperLv('atk'), pts: temperPts() }));
  ok(t3.lv === 3 && t3.pts === 0, '포인트가 3회분이면 정확히 3회에서 조용히 멈춘다',
    'Lv ' + t3.lv + ' · 남은 ' + t3.pts + 'pt');

  /* 충전도 같은 경로(pointerdown)를 탄다 — 다만 «보유분 전부» 를 바꾸므로 1회에 끝난다 */
  await setT({ pts: 0, st: 250 });
  await press210(CG, 1200);
  const tc = await p.evaluate(() => ({ st: S.tstone, pts: temperPts() }));
  ok(tc.st === 0 && tc.pts === 250, '[전환] 도 pointerdown 경로 — 꾹 눌러도 보유분 전부 1회에 끝',
    '단련석 ' + tc.st + ' · 포인트 ' + tc.pts);

  /* 회수는 홀드 대상이 아니다(1000 다이아 1회성) — 꾹 눌러도 1회분만 나간다 */
  await setT({ pts: 0, dia: 100000 });
  await p.evaluate(() => { S.temper = { pts: 0, alloc: { atk: 50, hp: 0, regen: 0 } }; renderTrain(); });
  await p.waitForTimeout(120);
  const rd0 = await p.evaluate(() => S.dia);
  await press210(RS, 1200);
  const rdSpent = rd0 - (await p.evaluate(() => S.dia));
  const resetCost = await p.evaluate(() => TEMPER_RESET_DIA);
  ok(rdSpent === resetCost, '[회수] 는 홀드 대상이 아니다 — 1.2초를 눌러도 ' + resetCost + ' 다이아 1회분만',
    rdSpent + ' 다이아');

  /* ★ 262 교훈 2ⓑ — 표기층이 두 벌이 됐으므로 «홀드 중 숫자» == «통짜 재렌더 숫자» 를 잠근다 */
  const tSame = await p.evaluate(() => {
    const read = () => {
      const w = document.getElementById('trTemper');
      const row = w.querySelector('.tr-tp[data-temper="atk"]');
      return [w.querySelector('.tp-hd .pv i').innerHTML, w.querySelector('.tp-hd .cg i').innerHTML,
              row.querySelector('.tl i').textContent, row.querySelector('.td i').textContent,
              row.querySelector('.tc i').textContent, row.querySelector('.tc s').textContent,
              row.querySelector('.tb i').textContent,
              row.querySelector('.tb').classList.contains('no') ? 'no' : 'ok',
              w.querySelector('.tp-ft .rs i').innerHTML].join(' | ');
    };
    S.temper = { pts: 500, alloc: { atk: 0, hp: 0, regen: 0 } }; S.tstone = 40;
    openTrain(); setTrSub('temper'); renderTrain();
    rtHold = { tag: 'temper' };                    /* 홀드 중인 척 — liveTemper 경로로 그린다 */
    S.temper.alloc.atk = 137; S.temper.pts = 42; S.tstone = 7; markDirty();
    renderTemper();
    const live = read();
    rtHold = null;
    renderTemper();                                /* → 통짜 경로(sig 가 갱신되지 않아 실제로 그린다) */
    const full = read();
    return { live, full, moved: /137/.test(full) };
  });
  ok(tSame.moved, '대조군 — 통짜 렌더가 실제로 새 레벨(137)을 말한다(단언이 공허하지 않다)');
  ok(tSame.live === tSame.full,
    '★ «홀드 중 숫자» 와 «손 뗀 뒤 통짜 재렌더» 가 한 글자도 다르지 않다(262 교훈 2ⓑ)',
    tSame.live === tSame.full ? '' : '\n      live: ' + tSame.live + '\n      full: ' + tSame.full);
  ok(hitOk210, '누른 좌표의 최상단 노드가 매번 그 버튼이었다(팝업이 덮지 않았다 — 양성항)');

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  if (process.argv.includes('--table')) {
    console.log('\n[표] 비용 계단 · 누적 총액');
    console.log('  구간 s : 1업글 비용 = (s+1)(s+2)/2');
    cost.seg.forEach((c, i) => console.log('    s=' + i + ' (Lv ' + (i * 100) + '~' + ((i + 1) * 100 - 1) + ') : ' + c + ' pt'));
    console.log('  누적 temperSpent(L)');
    cross.forEach(r => console.log('    L=' + r[0] + ' : ' + r[1] + ' pt'));
    table.forEach(r => console.log('  ' + r));
  }

  await b.close();
  console.log('\nVERIFY210 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
