#!/usr/bin/env node
/* 106 검증 — 동료(펫) 소환 배너 추가 + 동료 8등급 36종 확장
 *
 *   node tools/verify106.js
 *
 * 지시서 [3]-(가) 기계적·기능 작업 — 비평가 없이 헤드리스 실동작만 본다.
 * (카드·격자 기하는 07/26 규격 그대로라 레이아웃 채점 대상이 아니다. 늘어난 것은 «종 수» 뿐이다.)
 *
 *   [A] 데이터   PETS 35종 · 분포 (5×7 · 불멸 0) · 무기 종 수 − 불멸 1 과 동일 · id 중복 0 · 구 9종 id·이름·등급 보존
 *       ⚑ 757 이관(2026-09-02, 주인 보강 «펫도 … 불멸 등급 없애고») — 106 이 세운 «장비와 같은
 *         8등급 36종» 이 **7등급 35종**이 됐다. 자리를 비우지 않고 방향만 뒤집었다(333 처방):
 *         묻는 것은 그대로 «등급마다 5종» 이고, 거기에 «불멸 칸이 정말 비었는가» 가 더해졌다.
 *   [B] 곡선     (481 이관) 피해 계수 축 폐지 · PET_CD = 1.30·(0.40/1.30)^(g/7) · 36종 cd = PET_CD[g]/v
 *                · 등급 간 세기(1/cd) 단조(등급 g 최댓값 < 등급 g+1 최솟값)
 *   [C] 확률표   rollOf('pet') = 7행(8행 표의 앞 7행) · 초월 해금 · 불멸 행 없음 · 확률 합 1
 *   [D] 상점     SHOP_BOXES 5장 · «펫 상자» 카드 DOM · 가격 = 나머지 배너와 동일(195: 1,000/3,000) · 무료 2/2
 *   [E] 실동작   10연 → 다이아 차감 · 결과 팝업 10장 · S.cnt.sumPet +10 · 보유 종 수 증가 · 소환 경험치 연동(196)
 *   [F] 구 세이브 구 9종 보유 + eqPet 3마리 세이브를 로드해도 보유·장착·레벨 그대로
 *   [G] 26 시트  카드 36장 · 격자 안쪽 스크롤 성립 · [동료 소환] → 상점 동료 상자로 이동
 *   [H] 도감     pet 세트 7개 · 구성원 합 35 · 세트 키 pet:0~6
 *   [I] 콘솔 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, e) => Math.abs(a - b) <= e;

/* ── 226 — G6 «펫 상자 카드까지 스크롤» 이 왜 뜨고 지었나 ─────────────────────
   증상: 4회 중 2회 FAIL, `586 ≈ 590` / `586 ≈ 591`(허용 ±2). 어긋남은 늘 **want 쪽**이 +4~5.
   G6 은 제품(`openShopPage(focus)`)과 **글자 그대로 같은 식**을 다시 계산해 비교한다:
       top  = card.offsetTop − children[0].offsetTop        (= 1916, 실측 고정)
       want = clamp(top, 0, scrollHeight − clientHeight)
   펫 상자는 마지막 칸이라 `top` 이 스크롤 여지를 한참 넘어 **클램프가 항상 이긴다** →
   want 는 사실상 `scrollHeight − clientHeight` 하나다. 즉 흔들린 것은 `#shopList.scrollHeight` 다.
   진단(`tools/probe226.js` · `tools/probe226b.js`, 프레임 단위 표본): 기준 2428 이 300~410ms 구간에서만
   2429~2433 으로 튀고, 그 프레임에서 리스트 바닥을 미는 노드는 **`DIV.shp-card jz-st`**(마지막 칸)였다.
   원인은 136 이 `verify102` 에서 잡은 것과 **같은 연출**이다 — 60 `jzStagger` 의 카드 등장
   `.jz-st{animation:jzSt .2s}` 는 키프레임이 `scale:.94 → 1.02 → 1` 이고,
   **CSS 의 스크롤 가능 오버플로 영역은 «변환된» 박스들의 합집합**이라 `scale(1.02)` 이 걸린 동안
   마지막 카드가 자기 중심 아래로 450 × .02 / 2 = **4.5px** 삐져나온다 → `scrollHeight` +4~5
   → want +4~5. 관측된 어긋남(+4 / +5)과 산술이 정확히 맞는다.
   마지막 칸(5번째)의 위상은 `--jzd = 60 + 4×25 = 160ms` · 길이 .2s 이고, 실측 절대 시각으로는
   **클릭 후 ≈530~560ms** 에 배율이 1 을 넘는다(스태거는 `openShopPage()` 의 렌더·`jz-pg` 뒤에 출발한다).
   게이트의 고정 대기가 **500ms** 라 그 창의 바로 앞턱에 서 있었고, 부하에 따라 물기도 비켜 가기도 했다(= «간헐»).
   `tools/probe226d.js` 로 클릭 후 1.2초를 프레임마다 훑으면 실행마다 0~1 프레임이 걸리고,
   걸린 프레임의 값이 `scrolled=586 want=589~591`(scale 1.0128~1.02)로 **보고된 FAIL 값과 같다**.
   (헤드리스에서 rAF 가 ~70ms 로 throttle 돼 1.2초에 15~17 프레임뿐이라 «한 프레임» 이 그대로 «한 회» 다.)
   제품 결함이 아니다: 제품은 연출 중이라 부풀어 있던 값으로 `scrollTop` 을 넣어도 브라우저가
   연출이 끝나면 실제 최대치로 **다시 클램프**하므로 착지점(586)은 언제나 옳다. 실제로 `scrollTop` 은
   전 표본에서 586 으로 고정이었다 — 흔들린 쪽은 오직 **게이트가 재는 시점**이다.
   처방(지시서 [3] «flake 는 근본 원인이 아니다» · LESSONS 120 «고정 대기 대신 기하 정지 폴링»):
   고정 대기를 늘리지 않고 **기하가 멈출 때까지 폴링**한 뒤 잰다. 상수를 키우는 처방은
   102 가 이미 기각했다 — 스태거 시작 시각이 부하에 따라 100ms 넘게 밀려 어떤 상수도 언젠가 깨진다.
   수렴하지 않으면 그 사실 자체를 FAIL 로 드러낸다(rect 를 움직이는 무한 연출이 새로 붙으면 여기서 잡힌다). */
const settleList = (p, sel) => p.evaluate(async s => {
  const rd = () => {
    const li = document.querySelector(s);
    if (!li) return s + ':없음';
    const last = li.children[li.children.length - 1];
    const r = last ? last.getBoundingClientRect() : { top: 0, bottom: 0 };
    return [li.scrollHeight, li.clientHeight, li.scrollTop, r.top.toFixed(3), r.bottom.toFixed(3)].join(',');
  };
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const t0 = performance.now();
  let prev = rd(), same = 0;
  while (performance.now() - t0 < 4000) {
    await raf();
    const cur = rd();
    if (cur === prev) { if (++same >= 4) return { ok: true, ms: Math.round(performance.now() - t0), last: cur }; }
    else { same = 0; prev = cur; }
  }
  return { ok: false, ms: Math.round(performance.now() - t0), last: prev };
}, sel);

/* 세이브를 심고 새 컨텍스트를 연다(87 교훈 3 · 91 교훈 2 — 살아 있는 페이지에 심으면 자동 저장과 경합한다) */
async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  if (seed) await page.addInitScript(s => { try { localStorage.setItem('idle_hunter_save_v4', s); } catch (_) {} }, seed);
  await page.goto(URL);
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof S !== 'undefined');
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

/* 496 — 소환 레벨이 «배너별 5 벌» 에서 «전 배너 공용 하나» 로 내려왔다. 구 세이브의 레벨 숫자는
   그대로 남지 않고 **뽑기 수를 보존한 채** 새 곡선(need = 200 + 210·n) 위로 다시 놓인다.
   이 항이 지키려던 것은 «구 세이브가 손해 없이 그대로 로드되는가» 이므로, 숫자 12 를 그대로
   기대하는 대신 **구 곡선으로 되돌려 센 뽑기 수가 보존되는가** 를 묻는다(그래야 이관이 사라지면
   빨개진다 — 숫자만 갈아 끼우면 «값이 무엇이든 초록» 인 헛초록이 된다). */
const V196_TBL = [50, 200, 500, 800, 1200, 1500, 1800, 2100, 2300, 2600,
                  3000, 3300, 3600, 4000, 4500, 5000];
const v196Need = lv => V196_TBL[Math.min(Math.max(lv | 0, 1), V196_TBL.length) - 1];
const v496Pulls = (lv, exp) => { let t = exp || 0; for (let n = 1; n < lv; n++) t += v196Need(n); return t; };

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await open(browser, null);

  /* ---------------- [A] 데이터 ---------------- */
  const A = await page.evaluate(() => {
    const dist = new Array(GRADE.length).fill(0);
    PETS.forEach(p => dist[p.g]++);
    /* 481 이관(2026-08-30, 주인 지시) — 구 9종에서 **보존되는 것이 id·이름·등급뿐**이 됐다.
       481 이 «피해 = 플레이어 공격력 · 등급은 주기» 로 축을 갈면서 피해 계수 `m` 은 사라졌고
       `cd` 는 (등급, 자리)에서 파생한다 — 옛 오버라이드 9칸은 등급 경계를 세 자리에서
       뒤집고 있던 값이라 같이 걷어냈다(`probe481` ⓒ). **묻는 것은 그대로다**: 구 세이브가
       가리키는 그 9종이 «같은 id·같은 이름·같은 등급» 으로 살아 있는가(A5 의 뜻).
       수치가 정말 새 규칙 위에 있는지는 `verify481` [B] 가 36종 전수로 본다. */
    const legacy = {
      bird0: { n: '꼬마 새', g: 0 }, bird1: { n: '화염 조', g: 1 },
      robo0: { n: '수호 로봇', g: 1 }, bird2: { n: '서리 조', g: 2 },
      robo1: { n: '전투 드론', g: 2 }, drag0: { n: '아기 드래곤', g: 3 },
      robo2: { n: '파괴 병기', g: 3 }, drag1: { n: '홍염 드래곤', g: 4 },
      drag2: { n: '황금 드래곤', g: 5 }
    };
    const bad = Object.keys(legacy).filter(id => {
      const p = PT[id], q = legacy[id];
      return !p || p.n !== q.n || p.g !== q.g || typeof p.cd !== 'number' || p.m !== undefined;
    });
    const ids = PETS.map(p => p.id);
    const allIds = SKILLS.concat(EQUIPS, PETS, RELICS).map(x => x.id);
    return {
      len: PETS.length, dist, weapons: EQUIPS.filter(e => e.slot === 'weapon').length,
      /* 757 — «장비와 같은 종 수» 는 이제 «장비에서 불멸을 뺀 종 수» 다 */
      wImm: EQUIPS.filter(e => e.slot === 'weapon' && e.g === topG('equip')).length,
      petImm: PETS.filter(p => p.g === 7).length,
      uniq: new Set(ids).size, bad, badN: PETS.filter(p => !p.n || /^\d|^$/.test(p.n)).length,
      crossDup: allIds.length - new Set(allIds).size,
      sp: [...new Set(PETS.map(p => p.sp))].sort().join(','),
      noSprite: PETS.filter(p => !PET_SP[p.sp]).length
    };
  });
  /* 757 이관 — 아래 셋은 «불멸 1종» 만큼 값이 내려갔다. 묻는 성질은 안 바뀐다. */
  ok(A.len === 35, 'A1 PETS 35종 (757 — 불멸 1종 폐지)', String(A.len));
  ok(JSON.stringify(A.dist) === '[5,5,5,5,5,5,5,0]' && A.petImm === 0,
    'A2 등급 분포 5×7 · 불멸 칸 0 (757)', JSON.stringify(A.dist));
  ok(A.len === A.weapons - A.wImm, 'A3 무기 부위 종 수 − 불멸 종 수와 동일',
    A.len + ' vs ' + A.weapons + '−' + A.wImm);
  ok(A.uniq === A.len && A.crossDup === 0, 'A4 id 중복 0 (계열 간 포함)', 'uniq=' + A.uniq + ' cross=' + A.crossDup);
  ok(A.bad.length === 0, 'A5 구 9종 id·이름·등급 보존 (481 이관 — m 폐지 · cd 는 파생)',
    A.bad.join(',') || '전부 일치');
  ok(A.badN === 0, 'A6 이름이 «사람이 읽는 이름» (자동 생성 번호 금지)', String(A.badN));
  ok(A.sp === 'bird,dragon,robo' && A.noSprite === 0, 'A7 스프라이트 3종만 사용 · 전부 PET_SP 에 있음', A.sp);

  /* A8 — 260(2026-08-27, 주인 보고) 회귀 방지. 등급 안 자리 순서 = 세기 오름차순.
     481 이관 — 그 «세기» 가 `m/cd` 에서 **`1/cd`** 로 바뀌었다(피해가 전 펫 같아졌으므로 세기는
     주기 하나다 · `power(p,'pet')`·`tierScore` 와 같은 식). 펫을 새로 덧붙이거나 자리를 옮기면
     여기서 잡힌다. 상세는 `tools/verify260.js` [B]. */
  const A8 = await page.evaluate(() => {
    const bad = [];
    GRADE.forEach((_, g) => {
      const t = PETS.filter(p => p.g === g);
      for (let j = 1; j < t.length; j++)
        if (!(1 / t[j].cd > 1 / t[j - 1].cd)) bad.push('g' + g + '[' + j + '] ' + t[j].id);
    });
    return bad;
  });
  ok(A8.length === 0, 'A8 등급 안 자리 순서 = 세기(1/cd) 오름차순 (260 · 481 축 이동)',
    A8.slice(0, 4).join(' / ') || '위반 0');

  /* ---------------- [B] 곡선 ---------------- */
  /* 481 이관(2026-08-30, 주인 지시 «피해는 플레이어 공격력 그대로 · 등급은 공격 주기만») —
     106 의 곡선 두 벌(`PET_M` 피해 · `PET_CD` 주기) 중 **피해 쪽이 통째로 사라졌다.**
     자리는 비우지 않는다(333) — 같은 다섯 항이 «이제 하나뿐인 곡선» 을 같은 깊이로 묻는다:
     표가 식 위에 있는가(B1) · 36종이 전부 그 표에서 파생하는가(B3) · 개체차 폭(B4) ·
     등급 간 세기 단조(B5). 되돌림 시험은 `verify481` §R. */
  const B = await page.evaluate(() => {
    const cErr = PET_CD.map((c, g) => Math.abs(c -
      Math.round(PET_CD_TOP * Math.pow(PET_CD_END / PET_CD_TOP, g / (GRADE.length - 1)) * 100) / 100));
    /* 36종 전부 cd 가 PET_CD[g] / v 여야 한다 — 구 9종 오버라이드도 481 이 걷어냈다 */
    const off = PETS.filter(p => Math.abs(p.cd - Math.round(PET_CD[p.g] / p.v * 1000) / 1000) > 1e-9)
      .map(p => p.id);
    const mLeft = PETS.filter(p => p.m !== undefined).map(p => p.id);
    const vs = PETS.map(p => p.v);
    const dps = {};
    PETS.forEach(p => { (dps[p.g] = dps[p.g] || []).push(1 / p.cd); });
    const mono = [];
    for (let g = 0; g < GRADE.length - 1; g++) {
      if (!dps[g] || !dps[g + 1]) continue;
      mono.push(Math.max.apply(null, dps[g]) < Math.min.apply(null, dps[g + 1]));
    }
    return { cErr: Math.max.apply(null, cErr), off, mLeft,
             vMin: Math.min.apply(null, vs), vMax: Math.max.apply(null, vs),
             mono: mono.every(Boolean), monoN: mono.length,
             /* 757 — «최고 등급» 을 7 로 적어 두면 등급이 접힌 순간 -Infinity 가 나온다 */
             topG: Math.max.apply(null, PETS.map(p => p.g)),
             top: Math.max.apply(null, dps[Math.max.apply(null, PETS.map(p => p.g))]) / Math.min.apply(null, dps[0]) };
  });
  ok(B.mLeft.length === 0, 'B1 피해 계수 축(PET_M·항목 m)은 폐지됐다 (481)', B.mLeft.join(',') || '남은 m 0종');
  ok(B.cErr <= 1e-9, 'B2 PET_CD = 1.30 × (0.40/1.30)^(g/7) (481 곡선)', '최대 오차 ' + B.cErr.toFixed(6));
  ok(B.off.length === 0, 'B3 36종 전부 cd = PET_CD[g] / v', B.off.join(',') || '전부 곡선 위');
  ok(B.vMin >= 0.90 && B.vMax <= 1.15, 'B4 개체차 v 는 0.90~1.15', B.vMin + '~' + B.vMax);
  /* 757 — 등급이 8 → 7 이 되면서 «경계» 도 7 → 6 이다(등급 수 − 1). 값을 손으로 안 적는다. */
  ok(B.mono && B.monoN === B.topG, 'B5 등급 간 세기(1/cd) 단조 (g 최대 < g+1 최소)',
    B.monoN + '경계 / 최고 등급 g' + B.topG);
  console.log('     · 최고 등급(초월)/일반 펫 DPS 배수 = ×' + B.top.toFixed(2));

  /* ---------------- [C] 확률표 ---------------- */
  const C = await page.evaluate(() => {
    const r = rollOf('pet'), sum = a => a.reduce((x, y) => x + y, 0);
    const at = L => gradeProbsAt('pet', L);
    prbBank = 'pet';
    const steps = prbSteps().join(',');
    prbBank = 'weapon';
    /* 757 — 표는 이제 «8행 표를 그 배너 최고 등급까지 자른 것» 이다(같은 배열이 아니라 사본).
       그래서 동일성(`===`)이 아니라 **앞 7행이 같은가** 를 묻는다. */
    const eq = r.length === 7 && r.every((g, i) => g === GRADE_ROLL_EQ[i]);
    return { rows: r.length, eq, u6: r[6] && r[6].unlock, u7: r[7] && r[7].unlock,
             /* 196 — «만렙» 을 리터럴 100 으로 적지 않는다(만렙이 또 바뀌면 여기가 먼저 굳는다).
                해금 직전 레벨도 표에서 뽑는다: 초월 unlock−1 · 불멸 unlock−1. */
             len: at(SUM_MAXLV).length, s100: sum(at(SUM_MAXLV)), s1: sum(at(1)),
             p6at54: at(r[6].unlock - 1)[6], p7at74: r[7] ? at(r[7].unlock - 1)[7] : 0,
             p6at100: at(SUM_MAXLV)[6], p7at100: at(SUM_MAXLV)[7],
             nan: at(SUM_MAXLV).concat(at(1)).some(x => !isFinite(x)), steps, maxlv: SUM_MAXLV,
             skillRows: rollOf('skill').length };
  });
  ok(C.rows === 7 && C.eq, 'C1 rollOf(\'pet\') = 7행 (8행 표의 앞 7행 — 757)', String(C.rows));
  /* 196 — 만렙 25 로 축소되며 사다리가 20/24 로 옮겨졌다(85 와 «동일» 이라는 단언은 그대로). */
  /* 496 — 사다리 비례 이동(만렙 25 → 50). 불멸은 만렙에서 역산해 적는다(LESSONS 106-1) */
  /* 757 이관 — «불멸 해금 = 만렙−1» 은 이제 장비만의 규칙이다(verify85 [B4] 가 계속 지킨다).
     펫에는 그 행이 아예 없어야 하므로 방향을 뒤집어 «없는가» 를 묻는다(333 처방). */
  ok(C.u6 === 40 && C.u7 === undefined,
    'C2 초월 Lv40 해금 · 불멸 행은 없다(757)', C.u6 + ' / 불멸행 ' + (C.u7 === undefined ? '없음' : C.u7));
  ok(near(C.s100, 1, 1e-9) && near(C.s1, 1, 1e-9) && !C.nan, 'C3 확률 합 1 · NaN 0',
    C.s100.toFixed(6) + ' / ' + C.s1.toFixed(6));
  ok(C.p6at54 === 0 && C.p6at100 > 0 && C.p7at100 === 0,
    'C4 해금 전 0 · 만렙 >0 · 불멸은 만렙에서도 0(757)', '초월해금−1 g6=' + C.p6at54 + ' · 불멸해금−1 g7=' + C.p7at74
    + ' · 만렙 g6=' + (C.p6at100 * 100).toFixed(2) + '% g7=' + (C.p7at100 * 100).toFixed(2) + '%');
  /* 250 — 이정표 8개 폐기. 동료 배너(g8)도 단계는 소환 레벨 1..만렙 연속이다. */
  ok(C.steps === Array.from({ length: C.maxlv }, (_, i) => i + 1).join(','),
    'C5 11 확률 팝업 단계 = 소환 레벨 1..' + C.maxlv + ' 연속 (250)', C.steps.slice(0, 40) + '…');
  ok(C.skillRows === 6, 'C6 스킬 배너는 6행 표 그대로(회귀)', String(C.skillRows));

  /* ---------------- [D] 상점 ---------------- */
  await page.evaluate(() => { S.dia = 1e9; goTab('shop'); });
  await page.waitForTimeout(350);
  const D = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const i = SHOP_BOXES.findIndex(x => x.b === 'pet');
    const card = cards[i];
    const cost = [...(card ? card.querySelectorAll('.cost') : [])].map(e => e.textContent);
    const free = card ? (card.querySelector('.b1 .sub') || {}).textContent : null;
    return { boxes: SHOP_BOXES.length, i, cards: cards.length, on: $('shopw').classList.contains('on'),
             name: card ? card.querySelector('.chd i').textContent : null, cost, free,
             c10: summonCost('pet', 10), c30: summonCost('pet', 30),
             /* 195 — 비교 기준: 펫을 뺀 나머지 배너가 전부 같은 값인지 먼저 접어서 하나로 만든다 */
             ref10: [...new Set(BKEYS.filter(k => k !== 'pet').map(k => summonCost(k, 10)))].join('|'),
             ref30: [...new Set(BKEYS.filter(k => k !== 'pet').map(k => summonCost(k, 30)))].join('|'),
             flat: !!BANNERS.pet.flat,
             btns: card ? card.querySelectorAll('[data-shsum="pet"]').length : 0 };
  });
  ok(D.boxes === 5 && D.cards === 5, 'D1 상점 소환 탭 상자 5장', D.cards + '장');
  ok(D.i === 4 && D.name === '펫 상자', 'D2 5번째 카드 = «펫 상자»', D.name);
  ok(D.btns === 3, 'D3 소환 버튼 3개(무료 10연 / 💎10연 / 💎30연)', String(D.btns));
  /* 195 (2026-08-27, 주인 지시 «펫도 다른 거랑 소환 가격 같게») — 73 이 남긴 «펫 현행 유지»(2,250/6,750) 폐기.
     값을 다시 박지 않고 **4배너와 같은지**로 묻는다 — 가격이 또 바뀌어도 «같다» 는 불변식은 안 깨진다. */
  /* ref10/ref30 은 «펫 뺀 배너들의 값 집합» 을 `|` 로 이은 것 — 값이 갈리면 «1000|1350» 처럼 남아
     숫자 하나와 절대 같아지지 않는다. 즉 이 한 줄이 «4배너끼리도 같다 + 펫도 그와 같다» 를 동시에 판정한다. */
  ok(String(D.c10) === D.ref10 && String(D.c30) === D.ref30, 'D4 펫 가격 = 다른 배너와 동일(195)',
    '펫 ' + D.c10 + '/' + D.c30 + ' vs 나머지 배너 ' + D.ref10 + '/' + D.ref30);
  ok(D.c10 === 1000 && D.c30 === 3000, 'D4b 그 공통값이 10회 1,000 · 30회 3,000', D.c10 + '/' + D.c30);
  ok(D.cost.join('/') === '1,000/3,000', 'D5 카드 가격 표기 쉼표', D.cost.join('/'));
  ok(D.flat === true, 'D5b 펫 배너도 `flat:1`(10연 0.9 할인 제외)', String(D.flat));
  ok(D.free === '2/2', 'D6 무료 10연 2/2 (SHOP_FREE 자동 적용)', String(D.free));

  /* ---------------- [E] 10연 실동작 ---------------- */
  /* 73 ③ 회귀 — 가이드 소환 미션(스킬) 진행 중에는 동료 상자도 막힌다. 확인한 뒤 미션을 끝내고 소환한다. */
  const E0 = await page.evaluate(() => {
    S.guide.idx = 0; gmStart();
    const dia = S.dia, blocked = gmBlocked('pet');
    closeModal();
    S.guide.idx = GUIDE.length; gmStart();
    return { blocked, keptDia: S.dia === dia, free: gmBlocked('pet') };
  });
  ok(E0.blocked && E0.keptDia, 'E0 가이드 소환 미션 중 동료 상자 차단(73 ③ 회귀 · 재화 불변)',
    'blocked=' + E0.blocked);
  ok(E0.free === false, 'E0b 미션 종료 후 차단 해제', String(E0.free));

  const E = await page.evaluate(async () => {
    S.dia = 100000; S.cnt.sumPet = 0; S.sum.pet.lv = 1; S.sum.pet.exp = 0;
    const before = { dia: S.dia, own: Object.keys(S.own).filter(k => PT[k]).length,
                     lv: S.sum.pet.lv, exp: S.sum.pet.exp, need: sumNeedExp(S.sum.pet.lv) };
    doSummon('pet', 10);
    await new Promise(r => setTimeout(r, 250));
    const cards = [...document.querySelectorAll('#sumGridIn .sm-c')];
    const n = cards.reduce((a, c) => a + (parseInt((c.querySelector('.sm-fat') || {}).textContent, 10) || 0), 0);
    const petsOnly = Object.keys(S.own).filter(k => PT[k]);
    return { paid: before.dia - S.dia, cnt: S.cnt.sumPet, open: $('sumw').classList.contains('on'),
             cards: cards.length, n, gained: petsOnly.length - before.own, lvUp: S.sum.pet.lv - before.lv,
             expUp: S.sum.pet.exp - before.exp, need: before.need,
             /* 196 — 표 한 칸을 정확히 채우면 여전히 1단계 오른다(경험치 연동의 «끝단» 확인) */
             lvUp2: (() => { S.sum.pet.lv = 1; S.sum.pet.exp = 0;
                             const u = sumAddExp('pet', sumNeedExp(1)); return { u, lv: S.sum.pet.lv }; })(),
             onlyPets: petsOnly.length === Object.keys(S.own).filter(k => PT[k]).length,
             stray: Object.keys(S.own).filter(k => !PT[k] && !SK[k] && !EQ[k] && !RL[k]) };
  });
  ok(E.paid === 1000, 'E1 다이아 1,000 차감 (195 — 4배너와 동일)', String(E.paid));
  ok(E.cnt === 10, 'E2 S.cnt.sumPet +10', String(E.cnt));
  ok(E.open && E.n === 10, 'E3 12 결과 팝업 열림 · 카드 개수 합 10', E.cards + '칸 / 합 ' + E.n);
  ok(E.gained > 0, 'E4 보유 동료 종 수 증가', '+' + E.gained + '종');
  /* 196 — 필요 경험치가 주인 확정표(Lv1 = 50)로 바뀌어 **10연 한 번으로는 안 오른다**(구 곡선은 need 5).
     이 절이 묻는 것은 «소환이 소환 경험치로 이어지는가» 이므로, 판정을 «10연 = exp +10» 과
     «표 한 칸을 채우면 1단계 상승» 둘로 나눈다. 리터럴 need 는 안 쓴다(표가 또 바뀌어도 안 굳는다). */
  ok(E.expUp === 10 && E.lvUp === (10 >= E.need ? 1 : 0),
    'E5 소환 Lv 경험치 연동 — 10연 = exp +10 (need ' + E.need + ')', '+' + E.expUp + 'exp / +' + E.lvUp + 'Lv');
  ok(E.lvUp2.u === 1 && E.lvUp2.lv === 2, 'E5b 표 한 칸(need)을 채우면 Lv +1 (196)', JSON.stringify(E.lvUp2));
  ok(E.stray.length === 0, 'E6 S.own 에 미확인 id 유입 0', E.stray.join(',') || '없음');

  /* [E7] 11 확률 팝업이 펫 배너로 열리고 36행이 나온다 — «전 등급이 보이는» MAX 단계에서 센다.
     528(2026-08-31) — 옛 코드는 `openProbInfo('pet', 100)` 이었다. 100 은 만렙 100 시절의 숫자이고
     496(만렙 50) 아래에서는 `openProbInfo` 의 «cur 이하 가장 높은 단계» 규칙에 걸려 MAX 로 튕기는
     덕에 우연히 초록이다(`probe528` A2). 만렙이 100 이상으로 오르는 날엔 해금 안 된 등급이 표에서
     빠져 36행이 무너진다(`probe528` B3 — 만렙 150 사본에서 35행/7등급). 만렙은 제품에서 읽는다. */
  await page.evaluate(() => { closeSummonResult && closeSummonResult(); openProbInfo('pet', SUM_MAXLV); });
  await page.waitForTimeout(250);
  const E7 = await page.evaluate(() => ({
    on: $('prbw').classList.contains('on'),
    lv: $('prbLv').textContent, max: SUM_MAXLV,
    rows: document.querySelectorAll('#prbList .prb-row').length,
    heads: document.querySelectorAll('#prbList .prb-gh').length,
    empty: [...document.querySelectorAll('#prbList .prb-row .ic')].filter(e => !e.textContent.trim()).length,
    q: [...document.querySelectorAll('#prbList .prb-row .ic')].filter(e => e.textContent.trim() === '❔').length
  }));
  ok(E7.lv === 'MAX', 'E7-a 전제 — 확률 팝업이 실제로 MAX 단계를 열었다(만렙 ' + E7.max + ')',
    '단계 «' + E7.lv + '»');
  /* 757 이관 — 확률 팝업도 `rollOf`·`PETS` 에서 파생하므로 불멸 폐지가 그대로 내려온다 */
  ok(E7.on && E7.rows === 35 && E7.heads === 7, 'E7 11 확률 팝업 — 7등급 · 35행 (757)',
    E7.heads + '등급 / ' + E7.rows + '행');
  ok(E7.empty === 0 && E7.q === 0, 'E8 확률 팝업 아이콘 빈칸·❔ 0건', 'empty=' + E7.empty + ' ❔=' + E7.q);
  await page.evaluate(() => closeProbInfo());

  /* ---------------- [G] 26 동료 시트 ---------------- */
  await page.evaluate(() => { closeShopPage(); goTab('hero'); heroSubGo('pet'); });
  await page.waitForTimeout(450);
  const G = await page.evaluate(() => {
    const gp = document.querySelector('#bPet .sk-gp');
    const cards = document.querySelectorAll('#bPet .sk-card');
    const bad = [...cards].filter(c => /undefined/.test(c.getAttribute('style') || '')).length;
    const last = cards[cards.length - 1];
    return { cards: cards.length, sh: gp ? gp.scrollHeight : 0, ch: gp ? gp.clientHeight : 0,
             bad, lastTop: last ? parseFloat(last.style.top) : 0,
             sp: !!document.querySelector('#bPet .sk-gsp') };
  });
  ok(G.cards === 35, 'G1 26 시트 카드 35장 (757 — 불멸 1종 폐지)', String(G.cards));
  ok(G.sp && G.sh > G.ch, 'G2 격자 안쪽 스크롤 성립(스페이서)', G.sh + ' > ' + G.ch);
  ok(G.bad === 0, 'G3 카드 색 undefined 0건(SK_FILL/SK_RIM 8단)', String(G.bad));

  /* 격자 실제 스크롤 — 마지막 행까지 닿는다 */
  const G4 = await page.evaluate(async () => {
    const gp = document.querySelector('#bPet .sk-gp');
    gp.scrollTop = gp.scrollHeight;
    await new Promise(r => setTimeout(r, 60));
    return { top: gp.scrollTop, max: gp.scrollHeight - gp.clientHeight };
  });
  ok(G4.top > 0 && near(G4.top, G4.max, 1), 'G4 격자 끝까지 스크롤', G4.top + '/' + G4.max);

  /* [G5] [동료 소환] → 상점 «동료 상자» 로 이동 (73 이 «막다른 길» 로 남긴 경로) */
  await page.evaluate(() => {
    const b = document.querySelector('#bPet [data-ptsum]');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  /* 226 — 재기 전에 60 스태거(`jz-st`)가 끝나기를 기다린다. 위 주석 참고:
     연출 중에는 `scale(1.02)` 이 걸린 마지막 카드가 스크롤 오버플로를 4~5px 부풀린다. */
  const G5s = await settleList(page, '#shopList');
  const G5 = await page.evaluate(() => {
    const li = $('shopList'), i = SHOP_BOXES.findIndex(x => x.b === 'pet');
    const card = li.children[i];
    const top = card ? card.offsetTop - li.children[0].offsetTop : -1;
    const lr = li.getBoundingClientRect(), cr = card ? card.getBoundingClientRect() : null;
    return { on: $('shopw').classList.contains('on'), cat: shopCat, scrolled: li.scrollTop,
             want: Math.max(0, Math.min(top, li.scrollHeight - li.clientHeight)),
             /* «카드까지 스크롤» 의 사용자 쪽 뜻 — 펫 칸이 리스트 뷰포트 안에 통째로 들어왔나
                (클램프 산술과 무관하게 성립해야 하는 값이다) */
             vis: cr ? Math.round(Math.min(cr.bottom, lr.bottom) - Math.max(cr.top, lr.top)) : -1,
             ch: cr ? Math.round(cr.height) : -1 };
  });
  ok(G5.on && G5.cat === 'summon', 'G5 [동료 소환] → 10 상점 소환 탭 열림', G5.cat);
  /* 226 — «잰 순간이 연출 도중이 아니었다» 를 못 박는다(102 [5] 선례). settle 이 죽으면 여기가 빨개진다 */
  ok(G5s.ok, 'G5b 리스트 기하 정지 후 측정(60 스태거 종료)', (G5s.ok ? '수렴 ' : '수렴 실패 ') + G5s.ms + 'ms · ' + G5s.last);
  ok(near(G5.scrolled, G5.want, 2), 'G6 동료 상자 카드까지 스크롤', G5.scrolled + ' ≈ ' + G5.want);
  ok(G5.vis === G5.ch && G5.ch > 0, 'G6b 펫 상자 칸이 리스트 안에 통째로 보인다', G5.vis + '/' + G5.ch + 'px');

  /* ---------------- [H] 도감 ---------------- */
  const H = await page.evaluate(() => {
    const sets = COLL_SETS.filter(s => s.tab === 'pet');
    return { n: sets.length, keys: sets.map(s => s.key).join(','),
             members: sets.reduce((a, s) => a + s.it.length, 0),
             dist: sets.map(s => s.it.length).join(','),
             tabs: COLL_TABS.length };
  });
  /* 757 이관 — 도감 세트는 `PETS` 에서 파생하므로 불멸 폐지가 그대로 내려온다 */
  ok(H.n === 7, 'H1 도감 펫 세트 7개(등급별 · 757)', String(H.n));
  ok(H.keys === 'pet:0,pet:1,pet:2,pet:3,pet:4,pet:5,pet:6', 'H2 세트 키 pet:0~6', H.keys);
  ok(H.members === 35 && H.dist === '5,5,5,5,5,5,5', 'H3 구성원 합 35 · 분포 유지', H.dist);
  ok(H.tabs === 6, 'H4 도감 탭 6개 유지(회귀)', String(H.tabs));

  /* ---------------- [I] 콘솔 에러 ---------------- */
  ok(errs.length === 0, 'I1 콘솔 에러 0건 (본런)', errs.slice(0, 3).join(' | ') || '없음');
  await ctx.close();

  /* ---------------- [F] 구 세이브 호환 ---------------- */
  const seed = JSON.stringify({
    v: 4, gold: 1e6, dia: 5000, stage: 40, best: 40,
    own: { bird0: { n: 3, l: 7 }, robo0: { n: 1, l: 4 }, drag2: { n: 0, l: 12 } },
    eqPet: ['drag2', 'robo0', 'bird0'], eqSkill: [], eqSlot: {},
    coll: {}, sum: { pet: { lv: 12, exp: 3 } }
  });
  const F0 = await open(browser, seed);
  const F = await F0.page.evaluate(() => ({
    own: ['bird0', 'robo0', 'drag2'].map(id => (S.own[id] ? S.own[id].l : 0)).join(','),
    frag: ['bird0', 'robo0', 'drag2'].map(id => (S.own[id] ? S.own[id].n : -1)).join(','),
    /* 714 — 소환 진행도가 다시 배너 칸이다. 이 씨앗이 담은 것은 **펫 칸** 하나이므로
       되돌려 셀 자리도 펫 칸이다(496 의 공용 스칼라 둘은 폐지 · 묻는 것은 그대로 «보존»). */
    eq: S.eqPet.join(','), pets: pets.length, lv: S.sum.pet.lv, exp: S.sum.pet.exp, maxlv: SUM_MAXLV,
    back: (() => { let t = S.sum.pet.exp; for (let n = 1; n < S.sum.pet.lv; n++) t += sumNeedExp(n); return t; })(),
    /* 구 세이브의 «펫» 키가 전부 새 표에 살아 있는지만 본다(로드가 스킬 등 다른 계열을 새로 줄 수 있다) */
    lost: ['bird0', 'robo0', 'drag2'].filter(id => !PT[id]),
    total: PETS.length
  }));
  ok(F.own === '7,4,12', 'F1 구 세이브 동료 레벨 유지', F.own);
  ok(F.frag === '3,1,0', 'F2 구 세이브 조각 수 유지', F.frag);
  ok(F.eq === 'drag2,robo0,bird0', 'F3 S.eqPet 3마리 순서까지 유지', F.eq);
  ok(F.pets === 3, 'F4 전투 동료 3마리 스폰(syncPets)', String(F.pets));
  ok(F.back === v496Pulls(12, 3),
    'F5 ★ 구 세이브 소환 진행도 보존 — 구 Lv12/exp3 = ' + v496Pulls(12, 3).toLocaleString()
      + ' 뽑이 **펫 배너 칸으로** 그대로 옮겨졌다(714 배너 독립 이관)',
    'Lv' + F.lv + '/' + F.exp + ' = ' + F.back.toLocaleString() + ' 뽑');
  ok(F.lost.length === 0 && F.total === 35, 'F6 구 펫 id 전부 새 표에 존재 · 35종 (757)',
    F.lost.join(',') || (F.total + '종'));
  ok(F0.errs.length === 0, 'F7 구 세이브 로드 콘솔 에러 0건', F0.errs.slice(0, 3).join(' | ') || '없음');
  await F0.ctx.close();

  await browser.close();
  console.log('\nVERIFY106 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
