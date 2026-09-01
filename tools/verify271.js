/* 작업 271 — 룬 3종을 «행 나열» 이 아니라 «하위 탭» 으로 (일반룬 · 고급룬 · 천상룬).
 * 실행: node tools/verify271.js
 *
 * 주인 정정(2026-08-27): 203 이 «룬 탭 안에 3종이 나란히» 로 지었는데
 *   «룬은 행으로 나눠졌다기보다 일반룬·고급룬·천상룬이 **탭으로** 나눠져 있게».
 * → 23 훈련 팝업 상위 탭 «훈련 · 룬 · 단련» 안에 **하위 탭 3칸**(한 화면에 한 종만).
 *
 * ROUTINE «기능 완성 규칙»(T2 는 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고
 * 결과가 저장(S)·HUD·다른 화면에 반영됨» 이어야 완료) 에 맞춘 게이트다. 절 구성:
 *
 *   [1] 부품   — 하위 바가 96 공용 부품(.stabs.sp3 > .stab) 이고 칸 3개 · 키 r1/r2/r3
 *                · 바가 **정적 노드**라 0.35초 재렌더에 안 사라진다(74·142 «탭 유실» 계열)
 *   [2] 기하   — 두 겹 탭: 상위 바와 left·width 가 **같은 값** · 하위 바·카드·요약 겹침 0
 *                · 카드는 화면에 **1장** · 시트 안 · 그리고 **23 훈련 5요소 좌표 Δ0**
 *   [3] 전환   — 실제 클릭으로 칸이 바뀌고 카드가 그 룬으로 바뀐다(왕복 포함)
 *   [4] 잠금   — 잠긴 칸에 잠금 표시 + 자물쇠가 보이고, 들어가면 덮개가 개방 조건을 말한다(186)
 *                · 개방되면 잠금 표시·자물쇠가 사라진다
 *   [5] 기본   — 고른 적 없으면 «열려 있는 마지막 룬» · 한 번 고르면 그 선택이 고정된다
 *   [6] 동작   — 고른 룬의 [재료]·[다이아] 버튼이 **그 룬을** 실제로 올리고 S·전투력에 반영된다
 *                · 칸별 레드닷이 «재료로 시도 가능» 과 일치한다
 *   [7] 표기   — «다음 1레벨» · «계단 n/5» 가 runeVal/RUNE_STEP 과 같은 식이다
 *   [8] 되돌림 시험 — 일부러 깨 보고 이 게이트가 정말 잡는지(LESSONS 43-①)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };

const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  /* ================= [1] 부품 ================= */
  console.log('[1] 부품 — 하위 바가 96 공용 서브탭이고 3칸이며 재렌더에 안 사라진다');
  const part = await p.evaluate(() => {
    openTrain(); setTrSub('rune');
    const bar = document.getElementById('rnSubs');
    const cells = [...bar.querySelectorAll(':scope > [data-runesub]')];
    return {
      shared: bar.classList.contains('stabs') && bar.classList.contains('sp3')
              && cells.every(c => c.classList.contains('stab')),
      n: cells.length, keys: cells.map(c => c.dataset.runesub),
      labels: cells.map(c => c.querySelector('i').textContent.trim()),
      /* 이름은 데이터(RUNES)와 한 벌이어야 한다 — 라벨을 손으로 적어 두면 조용히 갈라진다 */
      names: RUNES.map(r => r.n),
      /* 300 — 주인 지시 «룬은 빨간점 놓지 말기»: 배지 노드가 하나도 없어야 한다 */
      bdg: cells.every(c => !c.querySelector('.bdg')),
      lock: cells.every(c => !!c.querySelector('.sk-lock')),
      /* 바는 본문(#trRunes) **밖**의 형제여야 한다 — 안에 있으면 innerHTML 교체에 같이 지워진다 */
      outside: !document.getElementById('trRunes').contains(bar),
      parent: bar.parentElement.className
    };
  });
  ok(part.shared, '96 공용 서브탭 부품(.stabs.sp3 > .stab) 을 그대로 쓴다');
  ok(part.n === 3 && part.keys.join(',') === 'r1,r2,r3', '하위 탭 3칸 · 키 r1/r2/r3', part.keys.join(','));
  ok(part.labels.join(',') === part.names.join(','),
    '칸 라벨이 RUNES 의 이름과 같다', part.labels.join(','));
  ok(part.bdg, '칸에 레드닷 배지 노드가 없다(300 — 룬은 배지 대상 아님)');
  ok(part.lock, '칸마다 자물쇠 자리(.sk-lock) 가 있다');
  ok(part.outside && /tr-box/.test(part.parent),
    '★ 바가 #trRunes 밖의 .tr-box 형제다 — 0.35초 재렌더에 안 지워진다', part.parent);

  /* 실제로 «재렌더가 여러 번 돈 뒤에도» 같은 노드인가 — 74·142 «탭 유실» 계열의 근본 검사 */
  await p.evaluate(() => { document.getElementById('rnSubs').dataset.mark = 'v271'; });
  await p.evaluate(() => { for (let i = 0; i < 6; i++) renderTrain(); });
  await p.waitForTimeout(900);
  const alive = await p.evaluate(() => {
    const bar = document.getElementById('rnSubs');
    return { mark: bar && bar.dataset.mark, n: bar ? bar.querySelectorAll('[data-runesub]').length : 0 };
  });
  ok(alive.mark === 'v271' && alive.n === 3,
    '★ 재렌더 6회 + 0.9초 라이브 틱을 지나도 같은 바 노드가 살아 있다', alive.mark + '/' + alive.n);

  /* ================= [2] 기하 ================= */
  console.log('[2] 기하 — 두 겹 탭이 같은 세로선 위에 서고, 23 훈련 좌표는 Δ0 이다');
  /* 203 이 못 박은 «훈련 탭 5요소의 .tr-box local 좌표». 271 이 하위 바를 세워도
     한 칸이라도 움직이면 23 의 26회차 폴리시가 깨진다(verify203 [2] 와 같은 표). */
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
  const geo = await p.evaluate((PIN) => {
    const box = () => document.querySelector('.tr-box').getBoundingClientRect();
    const loc = s => { const e = document.querySelector(s); if (!e) return null;
                       const r = e.getBoundingClientRect(), b = box();
                       return [+(r.x - b.x).toFixed(2), +(r.y - b.y).toFixed(2),
                               +r.width.toFixed(2), +r.height.toFixed(2)]; };
    const KEYS = Object.keys(PIN);
    openTrain(); setTrSub('train'); setRuneSub(null);
    const before = KEYS.map(loc);
    setTrSub('rune');
    const up = loc('#trSubs'), dn = loc('#rnSubs'), hd = loc('#rnHd');
    const card = [...document.querySelectorAll('.tr-rn')].map(e => e.getBoundingClientRect());
    const sum = document.querySelector('.tr-runes .rsum').getBoundingClientRect();
    const barU = document.getElementById('trSubs').getBoundingClientRect();
    const barD = document.getElementById('rnSubs').getBoundingClientRect();
    const hdR = document.getElementById('rnHd').getBoundingClientRect();
    const sheet = document.querySelector('.tr-sheet').getBoundingClientRect();
    /* 세로로 겹치는 쌍이 하나라도 있으면 안 된다(687 헤더 · 하위 바 · 카드 · 요약 · 상위 바) */
    const all = [hdR, barD].concat(card, [sum], [barU]);
    let overlap = 0;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
      if (all[i].bottom > all[j].top + 0.5 && all[j].bottom > all[i].top + 0.5) overlap++;
    setTrSub('train');
    const after = KEYS.map(loc);
    return {
      up, dn, hd, card: card.length, overlap,
      order: hdR.bottom <= barD.top + 0.5 && barD.bottom <= card[0].top + 0.5
             && card[0].bottom <= sum.top + 0.5 && sum.bottom <= barU.top + 0.5,
      inSheet: barD.top >= sheet.top - 0.5 && barU.bottom <= sheet.bottom + 0.5,
      pinned: KEYS.every((k, i) => JSON.stringify(before[i]) === JSON.stringify(PIN[k])),
      same: JSON.stringify(before) === JSON.stringify(after), before
    };
  }, PIN23);
  ok(geo.up[0] === geo.dn[0] && geo.up[2] === geo.dn[2],
    '★ 두 겹 탭 — 상·하위 바의 left·width 가 같은 값(같은 세로선 위)',
    'left ' + geo.up[0] + '/' + geo.dn[0] + ' · w ' + geo.up[2] + '/' + geo.dn[2]);
  /* 337 (2026-08-28) 이관 — 부품 높이 99 → 97. `.rn-subs` 는 **상단 앵커**(top:34)라 상변은 Δ0 이고
     하변만 2px 올라온다(세로 예산 §9411 주석의 «하위 바 34~133» → 34~131, 여유 19 → 21). */
  /* 437 (2026-08-30) 이관 — 부품 높이 97 → **98**(셸 98 / 테두리 7 / 칸 84 한 덩어리 · probe437).
     `.rn-subs` 는 **상단 앵커**(top:34)라 상변은 여전히 Δ0 이고 하변만 1 내려간다. */
  /* 687 (2026-09-02) 이관 — 주인 지시 «룬강화석 개수를 탭 **위에**» 가 본문 머리(local 34)를
     재화 잔량 헤더(#rnHd 24/34/998/56)에 내주고 하위 바는 그 아래(104)로 내려왔다.
     «top 34» 를 그냥 지우지 않고 방향을 뒤집어 갈아 끼운다(333 처방) — 머리 자리의 주인이
     바 → 헤더로 바뀌었다는 것까지 단언한다(헤더가 사라지면 이 항이 빨개진다). */
  ok(geo.hd && geo.hd[1] === 24 && geo.hd[3] === 88,
    '★ 687 — 재화 잔량 헤더가 본문 머리(박스 local top 24) · 높이 88 = 단련 .tp-hd 와 같은 부품 급',
    geo.hd && geo.hd[1] + ' / ' + geo.hd[3]);
  ok(geo.dn[1] === 130 && geo.dn[3] === 98,
    '하위 바가 헤더 아래(박스 local top 130 = 24+88+18) · 부품 높이 98', geo.dn[1] + ' / ' + geo.dn[3]);
  ok(geo.card === 1, '★ 한 화면에 룬 카드 1장(행 나열 폐기)', String(geo.card));
  ok(geo.overlap === 0, '687 헤더 · 하위 바 · 카드 · 총효과 요약 · 상위 바 서로 겹침 0건', String(geo.overlap));
  ok(geo.order, '세로 순서 — 687 헤더 → 하위 바 → 카드 → 총효과 요약 → 상위 바');
  ok(geo.inSheet, '두 바 모두 시트 안에 들어간다(잘림 0)');
  ok(geo.pinned, '★ 훈련 5요소의 박스 local 좌표가 203 이전 값과 Δ0 — 하위 바를 세워도 23 이 안 밀렸다',
    geo.pinned ? '' : JSON.stringify(geo.before));
  ok(geo.same, '룬 탭에 갔다 와도 훈련 좌표가 그대로(왕복 Δ0)');

  /* ★ 최고 부하 — «천상룬 Lv499, 축 3개, 4자리 %» 가 이 카드가 만드는 제일 긴 글자다.
     첫 구현은 세 축을 한 줄에 붙였다가 fs36 에서 910px 를 넘겨 **두 줄로 접히고 아래 줄 위로 올라탔다**.
     그래서 여기서는 «겹침 0» 만이 아니라 «한 줄 상자가 실제로 한 줄인가»(높이 = line-height)까지 잰다. */
  const load = await p.evaluate(() => {
    S.rune = { r1: RUNE_MAXLV, r2: RUNE_MAXLV, r3: RUNE_MAXLV - 1 };
    S.rstone = 1e9; S.dia = 1e9;
    openTrain(); setTrSub('rune'); setRuneSub('r3'); renderTrain();
    const card = document.querySelector('.tr-rn');
    const kids = [...card.children].filter(e => getComputedStyle(e).display !== 'none'
                                                && !e.classList.contains('rlk'));
    const R = e => e.getBoundingClientRect();
    let overlap = [];
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = R(kids[i]), b = R(kids[j]);
      if (a.bottom > b.top + 0.5 && b.bottom > a.top + 0.5
          && a.right > b.left + 0.5 && b.right > a.left + 0.5)
        overlap.push(kids[i].className + '×' + kids[j].className);
    }
    /* 한 줄이어야 하는 상자들 — 잉크가 상자보다 넓으면 접혀서 높이가 line-height 를 넘는다 */
    const oneLine = ['.rd>.rw>i', '.rd>.rw>s', '.rst>i', '.rhint>i', '.rn>i', '.rl>i']
      .map(sel => {
        const es = [...card.querySelectorAll(sel.replace('.rd', ':scope>.rd')
                                                .replace(/^\./, ':scope>.'))];
        return es.map(e => ({ sel, h: +R(e).height.toFixed(1),
                              lh: parseFloat(getComputedStyle(e.parentElement).lineHeight) }));
      }).flat();
    const wrapped = oneLine.filter(o => o.lh && o.h > o.lh + 1)
                           .map(o => o.sel + ' h' + o.h + '>lh' + o.lh);
    const rows = card.querySelectorAll('.rd>.rw').length;
    /* 카드 밖으로 삐져나온 자식이 없는가 */
    const c = R(card);
    const out = kids.filter(e => R(e).bottom > c.bottom + 0.5 || R(e).top < c.top - 0.5)
                    .map(e => e.className);
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 0; S.dia = 0; setRuneSub(null); renderTrain();
    return { overlap, wrapped, rows, out, n: kids.length };
  });
  ok(load.rows === 3, '최고 부하 — 천상룬은 효과 줄이 3개(공격력·체력·골드 획득)', String(load.rows));
  ok(load.overlap.length === 0,
    '★ 최고 부하에서 카드 자식끼리 겹침 0건', load.overlap.slice(0, 3).join(' / '));
  ok(load.wrapped.length === 0,
    '★ 한 줄 상자가 전부 실제로 한 줄이다(글자가 접혀 아래 줄을 덮지 않는다)',
    load.wrapped.slice(0, 3).join(' / '));
  ok(load.out.length === 0, '카드 밖으로 삐져나온 자식 0건', load.out.join(' / '));

  /* ================= [3] 전환 ================= */
  console.log('[3] 전환 — 실제 클릭으로 칸이 바뀌고 카드가 그 룬으로 바뀐다');
  await p.evaluate(() => {
    S.rune = { r1: RUNE_MAXLV, r2: RUNE_MAXLV, r3: 0 };   /* 셋 다 열어 둔다 */
    setRuneSub('r1'); openTrain(); setTrSub('rune');
  });
  await p.waitForTimeout(350);
  const seen = [];
  for (const id of ['r2', 'r3', 'r1']) {
    await p.click('#rnSubs [data-runesub="' + id + '"]', { force: true });
    await p.waitForTimeout(300);
    seen.push(await p.evaluate(() => ({
      sub: runeSub,
      card: document.querySelector('.tr-rn').dataset.rune,
      name: document.querySelector('.tr-rn>.rn').textContent.trim(),
      on: [...document.querySelectorAll('#rnSubs [data-runesub]')]
            .filter(e => e.classList.contains('on')).map(e => e.dataset.runesub).join(',')
    })));
  }
  ok(seen.every((s, i) => s.sub === ['r2', 'r3', 'r1'][i]),
    '칸을 누르면 하위 탭이 실제로 바뀐다', seen.map(s => s.sub).join(' → '));
  ok(seen.every((s, i) => s.card === ['r2', 'r3', 'r1'][i]),
    '★ 카드가 그 룬으로 바뀐다', seen.map(s => s.card + ':' + s.name).join(' → '));
  ok(seen.every(s => s.on === s.sub), '활성 칸(.on) 이 정확히 한 칸이고 고른 칸이다',
    seen.map(s => s.on).join(' → '));

  /* 상위 탭을 왕복해도 하위 선택이 유지되는가 */
  await p.evaluate(() => { setRuneSub('r3'); setTrSub('train'); setTrSub('rune'); });
  await p.waitForTimeout(250);
  const keep = await p.evaluate(() => document.querySelector('.tr-rn').dataset.rune);
  ok(keep === 'r3', '상위 탭(훈련 ↔ 룬) 왕복 후에도 고른 하위 탭이 유지된다', keep);

  /* ================= [4] 잠금 ================= */
  console.log('[4] 잠금 — 잠긴 칸에 잠금 표시 + 자물쇠, 들어가면 개방 조건(186)');
  const lock = await p.evaluate(() => {
    const cell = id => document.querySelector('#rnSubs [data-runesub="' + id + '"]');
    const lockVis = id => getComputedStyle(cell(id).querySelector('.sk-lock')).display;
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub(null); renderTrain();
    const lk0 = ['r1', 'r2', 'r3'].map(id => cell(id).classList.contains('lk'));
    const vis0 = ['r1', 'r2', 'r3'].map(lockVis);
    /* 잠긴 칸을 골라도 들어갈 수 있고, 덮개가 개방 조건을 말한다 */
    setRuneSub('r2');
    const cardLk = document.querySelector('.tr-rn').classList.contains('lk');
    const cover = getComputedStyle(document.querySelector('.tr-rn>.rlk')).display;
    const txt = document.querySelector('.tr-rn>.rlk').textContent.trim();
    /* 개방되면 표시가 사라진다 */
    S.rune = { r1: RUNE_MAXLV, r2: 0, r3: 0 }; renderTrain();
    const lk1 = ['r1', 'r2', 'r3'].map(id => cell(id).classList.contains('lk'));
    const vis1 = lockVis('r2');
    const cardLk1 = document.querySelector('.tr-rn').classList.contains('lk');
    const cover1 = getComputedStyle(document.querySelector('.tr-rn>.rlk')).display;
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub(null); renderTrain();
    return { lk0, vis0, cardLk, cover, txt, lk1, vis1, cardLk1, cover1,
             req: runeReqText('r2') };
  });
  ok(JSON.stringify(lock.lk0) === '[false,true,true]',
    '시작 — 일반룬만 열리고 고급·천상 칸에 잠금 표시', JSON.stringify(lock.lk0));
  ok(lock.vis0[0] === 'none' && lock.vis0[1] === 'block' && lock.vis0[2] === 'block',
    '잠긴 칸에서만 자물쇠가 보인다', lock.vis0.join(','));
  ok(lock.cardLk && lock.cover === 'block',
    '★ 잠긴 칸도 들어갈 수 있고 카드 덮개가 뜬다(막지 않는다)');
  ok(lock.txt.indexOf(lock.req) >= 0 && lock.req === '일반룬 Lv.500 달성 시 개방',
    '덮개가 개방 조건 문구를 말한다(186 관례)', lock.txt);
  ok(JSON.stringify(lock.lk1) === '[false,false,true]' && lock.vis1 === 'none'
     && !lock.cardLk1 && lock.cover1 === 'none',
    '★ 일반룬 500 → 고급 칸의 잠금 표시·자물쇠·덮개가 한꺼번에 사라진다',
    JSON.stringify(lock.lk1) + ' / ' + lock.vis1);

  /* ================= [5] 기본 선택 ================= */
  console.log('[5] 기본 — 고른 적 없으면 «열려 있는 마지막 룬»');
  const def = await p.evaluate(() => {
    const shown = () => { renderTrain(); return document.querySelector('.tr-rn').dataset.rune; };
    setRuneSub(null);
    S.rune = { r1: 0, r2: 0, r3: 0 };                        const a = shown();
    S.rune = { r1: RUNE_MAXLV, r2: 0, r3: 0 };               const b = shown();
    S.rune = { r1: RUNE_MAXLV, r2: RUNE_MAXLV, r3: 0 };      const c = shown();
    /* 한 번 고르면 고정 — 사다리가 더 열려도 안 따라간다 */
    setRuneSub('r1');                                        const d = shown();
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub(null); renderTrain();
    return { a, b, c, d };
  });
  ok(def.a === 'r1' && def.b === 'r2' && def.c === 'r3',
    '★ 안 골랐으면 «지금 올리고 있는 룬»(열린 마지막 칸) 을 연다', [def.a, def.b, def.c].join(' → '));
  ok(def.d === 'r1', '한 번 고르면 그 선택이 고정된다(사다리가 더 열려도 안 끌려간다)', def.d);

  /* ================= [6] 동작 ================= */
  console.log('[6] 동작 — 고른 룬의 버튼이 그 룬을 실제로 올리고 S·전투력에 반영된다');
  await p.evaluate(() => {
    S.rune = { r1: RUNE_MAXLV, r2: 0, r3: 0 };
    S.rstone = 1e9; S.dia = 1e9;
    setRuneSub('r2'); openTrain(); setTrSub('rune');
  });
  await p.waitForTimeout(350);
  const before6 = await p.evaluate(() => ({ r1: S.rune.r1, r2: S.rune.r2, st: S.rstone, cp: cp() }));
  /* 성공률이 낮으므로 «레벨이 오를 때까지» 가 아니라 «재화가 실제로 빠지고, 오른 룬은 r2 뿐» 을 본다 */
  for (let i = 0; i < 40; i++) {
    await p.click('.tr-rn [data-runebuy]', { force: true });   /* 490 — 결제 갈래가 하나라 버튼도 하나 */
    await p.waitForTimeout(40);
  }
  const after6 = await p.evaluate(() => ({ r1: S.rune.r1, r2: S.rune.r2, st: S.rstone,
                                           saved: JSON.parse(localStorage.getItem(KEY) || '{}').rune,
                                           cp: cp() }));
  ok(after6.st < before6.st, '[재료] 버튼이 실제로 룬강화석을 깎는다',
    before6.st + ' → ' + after6.st);
  ok(after6.r2 > before6.r2, '★ 고른 룬(r2)의 레벨이 실제로 오른다', before6.r2 + ' → ' + after6.r2);
  ok(after6.r1 === before6.r1, '고르지 않은 룬(r1)은 안 움직인다', String(after6.r1));
  ok(after6.saved && after6.saved.r2 === after6.r2, '결과가 세이브(S)에 그대로 기록된다',
    JSON.stringify(after6.saved));
  ok(after6.cp > before6.cp, '★ 전투력(cp)에 반영된다 — «다른 화면에 반영»',
    before6.cp + ' → ' + after6.cp);

  /* 490 — 구 «[다이아] 버튼도 20회분을 쓴다» 두 항의 자리. 결제 갈래가 «룬강화석» 하나가 됐으므로
     같은 20회를 돌려 **다이아가 0 이고 룬강화석만 정확히 20회분** 나가는지로 뒤집어 묻는다.
     (자리를 비우면 다이아 갈래를 되살려도 초록이다 — 333·LESSONS 328-330) */
  const dia = await p.evaluate(async () => {
    S.rstone = 1e9; S.dia = 1e6;
    const d0 = S.dia, s0 = S.rstone, l0 = S.rune.r2;
    let want = 0;
    for (let i = 0; i < 20; i++) { want += runeCost(RN.r2, runeLvOf('r2')); runeBuy('r2'); }
    return { dia: d0 - S.dia, st: s0 - S.rstone, up: S.rune.r2 - l0, want,
             btn: document.querySelectorAll('#trRunes .tr-rn .rbt').length };
  });
  ok(dia.dia === 0 && dia.st === dia.want,
    '★ 490 — 20회 시도가 다이아를 한 푼도 안 쓰고 룬강화석만 정확히 20회분 쓴다',
    '다이아 Δ' + dia.dia + ' · 룬강화석 −' + dia.st + ' / ' + dia.want);
  ok(dia.up >= 0 && dia.btn === 1, '시도는 레벨을 내리지 않고, 카드의 시도 버튼은 하나다',
    'Δlv ' + dia.up + ' · 버튼 ' + dia.btn + '개');

  /* 300 — 주인 지시 «룬은 빨간점 놓지 말기»: 재료가 넘쳐도 룬 탭·하위 탭 어디에도 alert 가 없다.
     (재료 기반 점등은 «쌓이는 즉시 상시 점등» 이 돼 166 의 훈련(골드) 제외와 같은 이유로 폐지) */
  const dot = await p.evaluate(() => {
    const read = () => [...document.querySelectorAll('#rnSubs [data-runesub]')]
      .map(e => e.classList.contains('alert'));
    const top = () => document.querySelector('#trSubs [data-trsub="rune"]').classList.contains('alert');
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; renderTrain();
    const a = { got: read(), top: top() };
    S.rstone = 0; renderTrain();
    const b = { got: read(), top: top() };
    return { a, b };
  });
  ok(dot.a.got.every(v => v === false) && dot.a.top === false,
    '★ 재료가 넘쳐도(1e9) 룬 탭·하위 탭 어디에도 레드닷이 없다(300)',
    JSON.stringify(dot.a.got) + ' top=' + dot.a.top);
  ok(dot.b.got.every(v => v === false) && dot.b.top === false,
    '재료 0 에서도 당연히 없다(300)', JSON.stringify(dot.b.got));

  /* ================= [7] 표기 ================= */
  console.log('[7] 표기 — «다음 1레벨»·선형 안내줄이 runeVal/RUNE_LIN 과 같은 식이다(489)');
  const say = await p.evaluate(() => {
    const out = [];
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub('r1');
    [0, 99, 100, 250, 499].forEach(l => {
      S.rune.r1 = l; renderTrain();
      const rows = [...document.querySelectorAll('.tr-rn>.rd>.rw')];
      out.push({
        l, rows: rows.length,
        cur: rows.map(e => e.querySelector('i').textContent.trim()).join(' | '),
        nx: rows.map(e => e.querySelector('s').textContent.trim()).join(' | '),
        st: document.querySelector('.tr-rn>.rst').textContent.trim(),
        wantCur: '공격력 +' + pct(runeVal('r1', 'atk')),
        wantNx: '다음 +' + pct(RN.r1.eff.atk * RUNE_LIN),
        wantSt: '1레벨당 증가폭이 Lv.1 ~ Lv.' + RUNE_MAXLV + ' 내내 같습니다'
      });
    });
    S.rune.r1 = RUNE_MAXLV; renderTrain();
    const maxNx = [...document.querySelectorAll('.tr-rn>.rd>.rw>s')]
      .map(e => e.textContent.trim()).join(',');
    const maxBtn = !!document.querySelector('.tr-rn>.rmax');
    const hint = document.querySelector('.tr-rn>.rhint');
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub(null); renderTrain();
    const hint0 = document.querySelector('.tr-rn>.rhint');
    return { out, maxNx, maxBtn, hintAtMax: !!hint, hint0: hint0 ? hint0.textContent.trim() : '' };
  });
  say.out.forEach(o => ok(o.rows === 2 && o.cur.indexOf(o.wantCur) === 0,
    'Lv ' + o.l + ' — 축마다 한 줄(일반룬 2줄) · 왼쪽이 runeVal 과 같은 식',
    o.rows + '줄 · ' + o.cur));
  say.out.forEach(o => ok(o.nx.indexOf(o.wantNx) === 0,
    'Lv ' + o.l + ' — 오른쪽 «다음 +n%» 이 eff × RUNE_LIN 과 같다(489 · 레벨 무관 상수)', o.nx));
  ok(new Set(say.out.map(o => o.nx)).size === 1,
    '★ 489 — 다섯 레벨(0·99·100·250·499)의 «다음 +n%» 이 **글자까지 같다**(계단이 되살아나면 갈라진다)',
    say.out.map(o => o.l + ':' + o.nx).join(' / '));
  say.out.forEach(o => ok(o.st.indexOf(o.wantSt) === 0,
    'Lv ' + o.l + ' — 안내줄이 «전 구간 같은 증가폭»(선형)을 말한다', o.st));
  ok(/^최대(,최대)*$/.test(say.maxNx) && say.maxBtn && !say.hintAtMax,
    '만렙에서는 «다음 +n%» 대신 «최대» · MAX 판 · 실패 안내 없음', say.maxNx);
  ok(say.hint0.indexOf('실패해도 레벨은 그대로') >= 0,
    '시도 가능할 때는 «실패해도 레벨은 그대로» 안내가 상시 붙는다', say.hint0);

  /* ================= [8] 되돌림 시험 ================= */
  console.log('[8] 되돌림 시험 — 일부러 깨 보고 이 게이트가 잡는지(LESSONS 43-①)');
  const neg = await p.evaluate(() => {
    /* ⓐ 하위 탭을 안 바꾸면 카드도 안 바뀐다 — [3] 이 공허하지 않다 */
    S.rune = { r1: RUNE_MAXLV, r2: RUNE_MAXLV, r3: 0 };
    setRuneSub('r1'); renderTrain();
    const a1 = document.querySelector('.tr-rn').dataset.rune;
    setRuneSub('r3'); renderTrain();
    const a2 = document.querySelector('.tr-rn').dataset.rune;
    /* ⓑ 잠금 표시가 «항상 켜짐» 이 아니다 */
    S.rune = { r1: RUNE_MAXLV, r2: RUNE_MAXLV, r3: 0 }; renderTrain();
    const b = [...document.querySelectorAll('#rnSubs [data-runesub]')]
      .every(e => !e.classList.contains('lk'));
    /* ⓒ 카드가 «1장» 인 것이 우연이 아니다 — RUNES 는 여전히 3종이다 */
    const c = RUNES.length === 3 && document.querySelectorAll('.tr-rn').length === 1;
    /* ⓓ 489 — 안내줄(.rst)은 이제 «레벨 무관 상수 문구» 다. 그래서 «레벨을 따라간다» 를
       그대로 물으면 거짓이 된다. 자리를 비우지 않고(333) 두 항으로 갈랐다:
         ⓓ  레벨을 따라 실제로 바뀌는 표기가 살아 있다(지금 효과 `.rd` + Lv 줄 `.rl`)
             — 여기까지 굳으면 «카드가 고정 문자열» 이라는 진짜 결함이다.
         ⓓ2 안내줄 `.rst` 은 반대로 **안 바뀌는 것이 정답**이다(계단이 되살아나면 갈라진다). */
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub('r1'); renderTrain();
    const q = () => ({ st: document.querySelector('.tr-rn>.rst').textContent.trim(),
                       ef: document.querySelector('.tr-rn>.rd').textContent.trim(),
                       lv: document.querySelector('.tr-rn>.rl').textContent.trim() });
    const p0 = q();
    S.rune.r1 = 300; renderTrain();
    const p1 = q();
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub(null); S.rstone = 0; S.dia = 0; renderTrain();
    return { a: a1 === 'r1' && a2 === 'r3', b, c,
             d: p0.ef !== p1.ef && p0.lv !== p1.lv, d0: p0.ef + ' · ' + p0.lv, d1: p1.ef + ' · ' + p1.lv,
             d2: p0.st === p1.st, s0: p0.st };
  });
  ok(neg.a, 'ⓐ 카드는 고른 칸을 실제로 따라간다(고정 노드가 아니다)');
  ok(neg.b, 'ⓑ 잠금 표시는 «항상 켜짐» 이 아니다(전부 열면 전부 꺼진다)');
  ok(neg.c, 'ⓒ 룬은 여전히 3종인데 화면에 1장이다 — «탭으로 나눴다» 가 진짜다');
  ok(neg.d, 'ⓓ 레벨을 따라 실제로 바뀌는 표기가 있다(지금 효과 · Lv 줄)', neg.d0 + ' / ' + neg.d1);
  ok(neg.d2, 'ⓓ2 489 — 안내줄은 레벨과 무관한 상수 문구다(계단이 되살아나면 갈라진다)', neg.s0);

  /* ⓔ [2] 의 «한 줄 상자가 실제로 한 줄인가» 가 진짜로 접힘을 잡는가 —
     일부러 상자를 좁혀 접히게 만들고, 같은 자로 재서 잡히는지 본다(안 잡히면 그 단언은 장식이다). */
  const negE = await p.evaluate(() => {
    S.rune = { r1: RUNE_MAXLV, r2: RUNE_MAXLV, r3: RUNE_MAXLV - 1 };
    openTrain(); setTrSub('rune'); setRuneSub('r3'); renderTrain();
    const probe = () => [...document.querySelectorAll('.tr-rn>.rd>.rw>i')]
      .filter(e => e.getBoundingClientRect().height
                   > parseFloat(getComputedStyle(e.parentElement).lineHeight) + 1).length;
    const clean = probe();
    const st = document.createElement('style');
    st.textContent = '.tr-rn>.rd>.rw>i{width:120px!important}';
    document.head.appendChild(st);
    const broken = probe();
    st.remove();
    const back = probe();
    S.rune = { r1: 0, r2: 0, r3: 0 }; setRuneSub(null); renderTrain();
    return { clean, broken, back };
  });
  ok(negE.clean === 0 && negE.broken > 0 && negE.back === 0,
    'ⓔ 접힘 탐지기가 진짜로 접힘을 잡는다(좁히면 ' + negE.broken + '줄 검출 → 되돌리면 0)',
    negE.clean + '/' + negE.broken + '/' + negE.back);
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  await b.close();
  console.log('\nVERIFY271 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
