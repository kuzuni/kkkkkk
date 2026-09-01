#!/usr/bin/env node
/* 117 검증 — 34 축복: 켤 때마다 축복 경험치 ↑ → 레벨업, **레벨당 효과 +10%**
 *
 *   node tools/verify117.js
 *
 * 지시서(PROGRESS 117 «검증 [3]-(가)») 가 요구한 항목 그대로 — «만들어 놓음» 이 아니라
 * «버튼을 누르면 실제 게임 데이터가 바뀌고 저장·HUD·다른 화면에 반영되는가» 를 본다.
 *
 *   [A] 상수 — BLESS_EFFLV(0.10) · BLESS_MAXLV(51) 존재, blessScale/blessPct 접근자
 *   [B] 곡선 — Lv1 1.00 · Lv2 1.10 · Lv6 1.50 · Lv51 6.00 · Lv52 이상은 캡(6.00)
 *   [C] 실제 배율 — activateBless 4회 → lv2, bonus().atk 배율 1.22 · Lv6 → 1.30 · 골드 Lv2 → 1.55
 *   [D] 지속시간은 «레벨 무관 30분»(456 이 «레벨당 +5분» 폐지) — 레벨업은 «그 활성화부터» 즉시 **효과 배율**에
 *   [E] 상한 — Lv51 에서 경험치가 멈추고 진행바가 MAX
 *   [F] UI 반영 — 카드 «+xx%» 와 보너스 «+xx%» 가 실효값, Lv 알약·진행바 갱신
 *   [G] 저장·복원 — lv 이 저장되고 새로고침 뒤에도 같은 배율. 상한 초과 세이브는 잘린다
 *   [H] 만료 — 만료 즉시 배율 원복(레벨이 올라도 캐시가 안 굳는다)
 *   [I] 연출 — 레벨업 순간 토스트(58 fxToast) 1장
 *   [J] 콘솔 에러 0건
 *
 * ⚠ 334(2026-08-28) — [C] 의 «타이머 표시» 단언은 **34 의 13회차가 알약을 두 노드로 쪼갠 뒤 굳어 있었다**.
 *    옛 DOM 은 `<s class="tm"><i>⏱ 00:30:00</i></s>` 한 노드, 지금은 `<b class="ck">⏱</b>` + `<i>00:30:00</i>` 다
 *    (한 노드에 담으면 시계와 숫자의 크기를 따로 못 고친다 — index.html ~11239 주석).
 *    값은 내내 정상이었고 **표기 «형식» 단언만** 옛 DOM 을 보고 있었다 → 고친 것은 게이트, 제품은 0줄이다
 *    (319·333 선례: 게이트 부패에 제품을 맞추지 마라). 두 부품을 **각각** 물으므로 어느 쪽이 사라져도 빨개지고,
 *    무르게 푼 수리가 아님은 같은 자리의 되돌림 시험(C3n)이 못박는다(LESSONS 232-① · 289 계열 경고).
 *
 * ⚠ addInitScript 는 reload 마다 다시 돈다(34 교훈 5) — 세이브는 «처음 한 번만» 깐다.
 *    autoBuy·spAuto 는 끈다: 유휴 루프가 사이에 레벨을 올려 «배수 비교» 를 오염시킨다(51 교훈 ③).
 * ⚠ 그것만으로는 부족했다 — «켜기 전 / 켠 뒤» 를 **다른 evaluate 로 나눠 재면** 그 사이에 tick 이 돌아
 *    10회 중 1회 비가 어긋났다. 배수 비교는 전부 **한 evaluate 안**에서 재고(단일 스레드라 tick 이 못 낀다),
 *    카드 클릭도 그 안에서 실제 DOM click 으로 쏜다([C]·[H]).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, e) => Math.abs(a - b) < (e === undefined ? 1e-9 : e);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));

  await page.addInitScript(() => {
    if (!localStorage.getItem('idle_hunter_save_v4'))
      localStorage.setItem('idle_hunter_save_v4',
        JSON.stringify({ gold: 1000, dia: 10, stage: 5, best: 5, autoBuy: false, spAuto: false }));
  });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof blessScale === 'function');
  await page.waitForTimeout(600);

  /* ---- [A] 상수·접근자 ---- */
  const A = await page.evaluate(() => ({
    eff: typeof BLESS_EFFLV === 'number' ? BLESS_EFFLV : null,
    max: typeof BLESS_MAXLV === 'number' ? BLESS_MAXLV : null,
    fns: ['blessScale', 'blessPct', 'blessGoldPct', 'blessLv', 'blessMax'].filter(n => typeof window[n] === 'function'),
    lv: S.bless.lv, prog: S.bless.prog
  }));
  ok(A.eff === 0.10, 'A1 BLESS_EFFLV = 0.10 (레벨당 효과 +10%)', String(A.eff));
  ok(A.max === 51, 'A2 BLESS_MAXLV = 51 (상한)', String(A.max));
  ok(A.fns.length === 5, 'A3 접근자 5종 존재', A.fns.join(','));
  ok(A.lv === 1 && A.prog === 0, 'A4 구버전 세이브 → Lv1 · 경험치 0', A.lv + '/' + A.prog);

  /* ---- [B] 곡선 (S 를 직접 세워 순수 함수만 본다) ---- */
  const B = await page.evaluate(() => {
    const o = S.bless.lv, r = {};
    [1, 2, 6, 11, 51, 80].forEach(l => { S.bless.lv = l; r[l] = [blessScale(), blessPct('atk'), blessGoldPct()]; });
    S.bless.lv = o; return r;
  });
  ok(near(B[1][0], 1.0) && near(B[1][1], 20) && near(B[1][2], 50), 'B1 Lv1 = ×1.00 (공 +20% · 골드 +50%)', JSON.stringify(B[1]));
  ok(near(B[2][0], 1.1) && near(B[2][1], 22) && near(B[2][2], 55), 'B2 Lv2 = ×1.10 (공 +22% · 골드 +55%)', JSON.stringify(B[2]));
  ok(near(B[6][0], 1.5) && near(B[6][1], 30, 1e-9), 'B3 Lv6 = ×1.50 (공 +30%)', JSON.stringify(B[6]));
  ok(near(B[11][1], 40, 1e-9) && near(B[11][2], 100, 1e-9), 'B4 Lv11 = 공 +40% · 골드 +100%', JSON.stringify(B[11]));
  ok(near(B[51][0], 6.0) && near(B[51][1], 120, 1e-9), 'B5 Lv51 = ×6.00 (공 +120%) 상한', JSON.stringify(B[51]));
  ok(near(B[80][0], B[51][0]), 'B6 Lv51 초과는 캡 — Lv80 도 ×6.00', JSON.stringify(B[80]));

  /* ---- [C] 실제 배율 — bonus() 를 거쳐 stat 까지 내려가는가 ----
     ⚠ «켜기 전 / 켠 뒤» 를 서로 다른 evaluate 로 나눠 재면 그 사이에 유휴 루프가 한 번 돌아
     강화 레벨이 오를 수 있고, 그러면 비가 1.20 이 아니라 1.20×(강화 증가분) 으로 나온다
     (51 교훈 ③ 의 재현 — 실제로 10회 중 1회 이렇게 깨졌다). **한 evaluate 안에서** 재면
     자바스크립트가 단일 스레드라 사이에 tick 이 못 낀다. 카드 클릭도 그 안에서 실제 DOM click
     으로 쏜다 — 핸들러 경로(#blsw 위임 → activateBless)는 그대로 검증된다. */
  const C = await page.evaluate(() => {
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); renderBless();
    const base = { atk: mulAtk(), hp: mulHp(), rate: mulRate(), regen: mulRegen(), gold: mulGold(), dmg: stat.dmg };

    /* 1회차 — Lv1 이므로 종전과 같은 ×1.20 이어야 한다(회귀 방지: 34 게이트 C2/C3 와 같은 값) */
    document.getElementById('blsC_atk').click();
    /* 334 — 알약은 «시계 `<b class="ck">` + 숫자 `<i>`» 두 부품이다. 한 노드 시절의 합본 형식을
       묻던 자리라 둘을 **따로** 집는다(`.ck` 가 없으면 `ck: null` 로 나가 그대로 빨개진다). */
    const tm1 = document.querySelector('#blsC_atk .tm'), ck1 = tm1.querySelector('b.ck');
    const c1 = { atk: mulAtk(), dmg: stat.dmg, lv: S.bless.lv, prog: S.bless.prog,
                 ck: ck1 ? ck1.textContent.trim() : null,
                 txt: tm1.querySelector('i').textContent };

    /* 4회 켜면 Lv2 — 그 순간부터 효과가 22% 다 */
    ['hp', 'rate'].forEach(k => document.getElementById('blsC_' + k).click());     /* 경험치 3 */
    S.bless.exp.atk = 0; markDirty(); document.getElementById('blsC_atk').click(); /* 4번째 → Lv2 */
    const c4 = { lv: S.bless.lv, prog: S.bless.prog, atk: mulAtk(), hp: mulHp(), rate: mulRate(),
                 regen: mulRegen(), gold: mulGold(), dmg: stat.dmg };

    /* Lv6 → 1.30, 1종만 켜면 골드 보너스 없음 */
    S.bless.lv = 6; S.bless.exp = { atk: Date.now() + 6e5, hp: 0, rate: 0 }; markDirty();
    const c6 = { atk: mulAtk(), gold: mulGold() };
    return { base, c1, c4, c6 };
  });
  ok(near(C.c1.atk / C.base.atk, 1.20, 1e-9), 'C1 Lv1 활성 = ×1.20 (34 회귀)', (C.c1.atk / C.base.atk).toFixed(4));
  ok(near(C.c1.dmg / C.base.dmg, 1.20, 1e-9), 'C2 stat.dmg 도 ×1.20', (C.c1.dmg / C.base.dmg).toFixed(4));
  /* 334 — C3 의 술어를 **함수 하나로** 꺼내 둔다. 아래 되돌림 시험(C3n)이 이것을 **그대로** 쓴다 —
     시험 안에서 사본을 만들면 «사본이 뒤집히는 것» 만 확인하고 정작 본 단언은 안 재는, 시험 자신의 헛초록이 된다. */
  const c3pred = o => o.prog === 1 && o.ck === '\u23F1' && /^\d\d:\d\d:\d\d$/.test(o.txt);
  const c3say  = o => o.prog + ' ' + o.ck + '|' + o.txt;
  ok(c3pred(C.c1), 'C3 카드 클릭 → 축복 경험치 +1 · 타이머 표시(시계 .ck + 숫자 .tm>i 두 부품)', c3say(C.c1));
  ok(C.c4.lv === 2 && C.c4.prog === 0, 'C4 4회 활성 → Lv2 · 경험치 되감기 0', C.c4.lv + '/' + C.c4.prog);
  ok(near(C.c4.atk / C.base.atk, 1.22, 1e-9), 'C5 Lv2 공격력 = ×1.22', (C.c4.atk / C.base.atk).toFixed(4));
  /* 703 이관(2026-09-02) — 축복 3번의 **효과 축**이 «공격 속도» → «체력 재생» 으로 옮겨졌다
     (공속은 목걸이 전속). 저장·DOM 키(`rate`)는 세이브·자 열 곳이 읽어서 그대로 두었으므로
     이 항은 «켠 카드가 올리는 축» 을 `blessAxis()` 로 물어야 한다 — 키를 축으로 읽으면
     영영 빨갛다. 방향만 바꾸고 항은 남긴다(333 처방): 여기 몫은 여전히 «레벨 배율이
     체력·세 번째 축에도 똑같이 걸린다» 다. */
  ok(near(C.c4.hp / C.base.hp, 1.22, 1e-9) && near(C.c4.regen / C.base.regen, 1.22, 1e-9), 'C6 체력·3번째 축(체력 재생)도 ×1.22',
     (C.c4.hp / C.base.hp).toFixed(4) + '/' + (C.c4.regen / C.base.regen).toFixed(4));
  ok(near(C.c4.gold / C.base.gold, 1.55, 1e-9), 'C7 3종 전부 활성 → 골드 ×1.55 (보너스도 레벨 곡선)',
     (C.c4.gold / C.base.gold).toFixed(4));
  ok(near(C.c4.dmg / C.base.dmg, 1.22, 1e-9), 'C8 stat.dmg 도 ×1.22 (HUD 전투력에 반영)',
     (C.c4.dmg / C.base.dmg).toFixed(4));
  ok(near(C.c6.atk / C.base.atk, 1.30, 1e-9), 'C9 Lv6 공격력 = ×1.30', (C.c6.atk / C.base.atk).toFixed(4));
  ok(near(C.c6.gold / C.base.gold, 1.0), 'C10 1종만 켜면 골드 보너스 없음', (C.c6.gold / C.base.gold).toFixed(4));

  /* ---- [C3n] 되돌림 시험 — 고친 C3 가 «실제로 무언가를 재는가» (334) ----
     게이트 부패의 가장 쉬운 «고침» 은 빨간 단언을 **무르게** 만드는 것이다(LESSONS 289 계열 경고).
     그래서 옛 DOM 두 모양을 **일부러 만들어** C3 의 술어가 뒤집히는지 본다 —
       ⓐ 시계 `<b class="ck">` 를 지운다        → C3 는 빨개져야 한다(시계를 안 보는 단언이면 초록으로 남는다)
       ⓑ 숫자 `<i>` 에 옛 합본 «⏱ HH:MM:SS» 를 넣는다 → 역시 빨개져야 한다(형식을 안 보는 단언이면 초록)
     ⓑ 가 초록이면 «두 노드 시절» 과 «한 노드 시절» 을 구별 못 하는 것이라 부패가 그대로 재발한다.
     DOM 은 손대는 즉시 원복하고 마지막에 `renderBless()` 로 다시 그린다(뒤 절에 흔적을 안 남긴다).
     ⚠ 페이지 쪽은 **읽기만** 한다 — 네 모양에서 C3 와 똑같은 세 값(`prog`·`ck`·`txt`)을 걷어 오고,
     판정은 위의 `c3pred` 가 한다. 시험이 자기 술어를 따로 들고 있으면 «사본이 뒤집히는 것» 만 보게 된다. */
  const N3 = await page.evaluate(() => {
    /* C3 가 집는 것과 같은 세 값 — 여기서 판정하지 않는다(판정은 노드 쪽 c3pred) */
    const snap = () => {
      const tm = document.querySelector('#blsC_atk .tm'), ck = tm.querySelector('b.ck');
      return { prog: S.bless.prog, ck: ck ? ck.textContent.trim() : null,
               txt: tm.querySelector('i').textContent };
    };
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); renderBless();
    document.getElementById('blsC_atk').click();
    const live = snap();
    const tm = document.querySelector('#blsC_atk .tm');
    const ck = tm.querySelector('b.ck'), i = tm.querySelector('i'), keep = i.textContent;
    ck.remove();                                const noClock = snap();
    tm.insertBefore(ck, i);                     /* 원복 */
    i.textContent = '⏱ ' + keep;           const merged = snap();   /* 한 노드이던 시절의 합본 */
    i.textContent = keep;                       const back = snap();
    renderBless();
    return { live, noClock, merged, back };
  });
  ok(c3pred(N3.live) && !c3pred(N3.noClock) && !c3pred(N3.merged) && c3pred(N3.back),
     'C3n 되돌림 시험 — 시계 삭제·옛 합본 표기 둘 다 C3 를 빨갛게 만든다',
     ['산 DOM', '시계없음', '합본', '원복'].map((n, x) =>
       n + ' ' + c3pred([N3.live, N3.noClock, N3.merged, N3.back][x])).join(' · ')
     + '  [합본 실측 «' + N3.merged.txt + '»]');

  /* ---- [D] 지속시간은 «레벨 무관 30분» · 레벨업은 «그 활성화부터» 즉시 (456 이관) ----
     ⚠ 456(주인 지시 2026-08-30)이 «레벨당 +5분» 을 폐지했다. 옛 D1·D2 는 35분·55분을 단언했는데
     그 곡선 자체가 사라졌으므로 **자리를 비우지 않고 살아 있는 단언으로 갈아 끼운다**(333 처방):
       ① 같은 두 표본(4번째 활성으로 오른 Lv2 · Lv6)에서 지속이 **둘 다 30분**
       ② 옛 항이 지키던 «레벨업은 그 활성화부터 즉시» 는 이제 **효과 배율**이 받는다 —
          그 활성화 직후 `blessScale()` 이 이미 Lv2 값(1.10)이다. 지속만 물었으면 이 뜻이 사라진다. */
  const D = await page.evaluate(() => {
    S.bless = { lv: 1, prog: 3, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    const sc0 = blessScale();                                      /* 켜기 전 Lv1 = 1.00 */
    activateBless('atk');                                          /* 4번째 → Lv2 */
    const a = { lv: S.bless.lv, left: blessLeft('atk'), sc: blessScale() };
    S.bless.lv = 6; S.bless.exp.hp = 0; markDirty(); activateBless('hp');
    return { sc0, a, b: { lv: S.bless.lv, left: blessLeft('hp'), sc: blessScale() } };
  });
  ok(D.a.lv === 2 && Math.abs(D.a.left - 30 * 60000) < 2000, 'D1 Lv2 지속 30분 (456 — 레벨 무관 고정)', D.a.left);
  ok(D.b.lv === 6 && Math.abs(D.b.left - 30 * 60000) < 2000, 'D2 Lv6 도 지속 30분 (레벨이 시간을 안 늘린다)', D.b.left);
  ok(Math.abs(D.sc0 - 1.00) < 1e-9 && Math.abs(D.a.sc - 1.10) < 1e-9 && Math.abs(D.b.sc - 1.50) < 1e-9,
     'D3 레벨업은 «그 활성화부터» 즉시 — 효과 배율 1.00 → 1.10 (Lv6 = 1.50)',
     D.sc0.toFixed(2) + ' → ' + D.a.sc.toFixed(2) + ' · Lv6 ' + D.b.sc.toFixed(2));

  /* ---- [E] 상한 ---- */
  const E = await page.evaluate(() => {
    S.bless = { lv: BLESS_MAXLV, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    for (let i = 0; i < 8; i++) { S.bless.exp.atk = 0; activateBless('atk'); }
    openBless();
    return { lv: S.bless.lv, prog: S.bless.prog, mx: blessMax(),
             pg: document.getElementById('blsProg').textContent,
             fill: document.getElementById('blsFill').style.width,
             scale: blessScale() };
  });
  ok(E.lv === 51 && E.prog === 0, 'E1 Lv51 에서 레벨·경험치 정지', E.lv + '/' + E.prog);
  ok(E.pg === 'MAX' && parseFloat(E.fill) === 100, 'E2 진행바 «MAX» · 100%', E.pg + ' ' + E.fill);
  ok(near(E.scale, 6.0), 'E3 상한 배율 ×6.00', String(E.scale));

  /* ---- [F] UI 반영 ---- */
  const F = await page.evaluate(() => {
    const rd = lv => { S.bless = { lv, prog: 1, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); renderBless();
      return { vl: [...document.querySelectorAll('#blsCards .vl')].map(e => e.textContent),
               bn: document.getElementById('blsBnV').textContent,
               lv: document.getElementById('blsLv').textContent,
               pg: document.getElementById('blsProg').textContent,
               fill: document.getElementById('blsFill').style.width }; };
    return { l1: rd(1), l2: rd(2), l6: rd(6), l11: rd(11) };
  });
  ok(F.l1.vl.join(',') === '+20%,+20%,+20%' && F.l1.bn === '+50%', 'F1 Lv1 카드 +20% · 보너스 +50% (34 회귀)',
     F.l1.vl.join(',') + ' | ' + F.l1.bn);
  ok(F.l2.vl.join(',') === '+22%,+22%,+22%' && F.l2.bn === '+55%', 'F2 Lv2 카드 +22% · 보너스 +55%',
     F.l2.vl.join(',') + ' | ' + F.l2.bn);
  ok(F.l6.vl[0] === '+30%' && F.l11.vl[0] === '+40%', 'F3 Lv6 +30% · Lv11 +40%', F.l6.vl[0] + '/' + F.l11.vl[0]);
  /* 500(2026-08-30) — 진행바 분모가 상수 4 에서 **레벨별 필요 경험치 표**로 바뀌었다(주인 지시).
     여기서 묻던 뜻(«Lv 알약·경험치·채움이 같이 갱신된다»)은 그대로 두고 분모만 그 레벨의 값으로
     갈아 끼운다 — Lv11 의 필요량은 55 이므로 «1/55 · 1.82%» 다. 상수 4 로 되돌아가면 다시 빨개진다. */
  ok(F.l11.lv === 'Lv.11' && F.l11.pg === '1/55' && Math.abs(parseFloat(F.l11.fill) - 100 / 55) < 0.02,
     'F4 Lv 알약 · 경험치 1/55(Lv11 필요량) · 채움 1.82%', F.l11.lv + ' ' + F.l11.pg + ' ' + F.l11.fill);

  /* ---- [G] 저장·복원 ---- */
  const G1 = await page.evaluate(() => {
    S.bless = { lv: 7, prog: 2, exp: { atk: Date.now() + 12e5, hp: Date.now() + 12e5, rate: Date.now() + 12e5 } };
    markDirty(); save();
    return { saved: JSON.parse(localStorage.getItem('idle_hunter_save_v4')).bless, atk: mulAtk(), gold: mulGold() };
  });
  ok(G1.saved && G1.saved.lv === 7 && G1.saved.prog === 2, 'G1 localStorage 에 lv·경험치 저장', JSON.stringify(G1.saved));
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof blessScale === 'function');
  await page.waitForTimeout(600);
  const G2 = await page.evaluate(() => ({ lv: S.bless.lv, prog: S.bless.prog, scale: blessScale(),
                                          pct: blessPct('atk'), key: KEY }));
  ok(G2.lv === 7 && G2.prog === 2, 'G2 새로고침 후에도 Lv7 · 경험치 2', G2.lv + '/' + G2.prog);
  ok(near(G2.scale, 1.6) && near(G2.pct, 32, 1e-9), 'G3 새로고침 후 배율도 그대로 (+32%)', G2.pct.toFixed(2));
  ok(G2.key === 'idle_hunter_save_v4', 'G4 저장 KEY 미변경 (마이그레이션으로 흡수)', G2.key);
  /* 손댄 세이브를 흉내낸다 — localStorage 만 고치면 돌고 있는 페이지의 자동 저장이 되돌려 놓는다.
     S 에 직접 넣고 save() 해야 «상한 초과가 실제로 저장된» 상태가 된다. */
  const G5 = await page.evaluate(() => { S.bless.lv = 999; save();
    return JSON.parse(localStorage.getItem('idle_hunter_save_v4')).bless.lv; });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof blessScale === 'function');
  await page.waitForTimeout(500);
  const G6 = await page.evaluate(() => ({ lv: S.bless.lv, scale: blessScale() }));
  ok(G5 === 999 && G6.lv === 51 && near(G6.scale, 6.0), 'G5 상한 초과 세이브(lv 999)는 51 로 잘린다',
     '저장 ' + G5 + ' → 로드 ' + G6.lv + ' ×' + G6.scale);

  /* ---- [H] 만료 — 레벨이 올라가 있어도 만료 즉시 원복 ---- */
  const H0 = await page.evaluate(() => {
    S.bless = { lv: 11, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    const off = mulAtk();
    S.bless.exp.atk = Date.now() + 900; markDirty();
    return { off, on: mulAtk() };
  });
  ok(near(H0.on / H0.off, 1.40, 1e-9), 'H1 Lv11 활성 = ×1.40', (H0.on / H0.off).toFixed(4));
  await page.waitForTimeout(2400);
  /* 만료 뒤의 «원복» 도 2.4초 전의 값과 비교하면 유휴 루프에 오염된다(위 [C] 와 같은 이유).
     만료 시점에서 «한 번 더 켜 보고» 그 자리에서 비를 재면 시간이 끼어들 틈이 없다. */
  const H1 = await page.evaluate(() => {
    const on0 = blessOn('atk'), off = mulAtk();                  /* 만료 상태의 배율 = 기준선 */
    S.bless.exp.atk = Date.now() + 6e5; markDirty();
    const on = mulAtk();
    S.bless.exp.atk = 0; markDirty();
    return { on0, ratio: on / off };
  });
  ok(!H1.on0 && near(H1.ratio, 1.40, 1e-9), 'H2 만료 즉시 배율 원복 (1초 tick 이 캐시를 깬다)',
     '만료 후 재점화 비 ' + H1.ratio.toFixed(4));

  /* ---- [I] 레벨업 연출 (58 fxToast) ---- */
  const I = await page.evaluate(async () => {
    /* 500 — «4번째» 가 아니라 «그 레벨의 마지막 한 칸» 이다(필요량이 레벨마다 다르다).
       숫자를 손으로 적지 않고 제품의 접근자에서 받아 «마지막 한 칸에서 켜면 오른다» 는 뜻만 남긴다. */
    S.bless = { lv: 3, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    S.bless.prog = blessNeed() - 1; markDirty(); openBless();
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    activateBless('atk');
    await new Promise(r => setTimeout(r, 120));
    const t = [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).filter(s => /축복/.test(s));
    return { lv: S.bless.lv, toasts: t, popped: !!document.querySelector('#blsCards .bls-c.fx-pop') };
  });
  ok(I.lv === 4, 'I1 마지막 한 칸에서 활성 → Lv4', String(I.lv));
  ok(I.toasts.length === 1 && /축복 Lv\.4 — 효과 \+26%/.test(I.toasts[0]), 'I2 레벨업 토스트 1장 (실효 %)',
     JSON.stringify(I.toasts));
  ok(I.popped, 'I3 카드 팝 연출(fxPop) 부착', String(I.popped));

  /* ---- [J] 콘솔 ---- */
  ok(errs.length === 0, 'J1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY117 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
