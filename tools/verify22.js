/* 작업 22 — 퀘스트 팝업 회귀 게이트.
 *   node tools/verify22.js            → 기하 + 기능 + 화면비 검사
 *   node tools/verify22.js --probe    → 프레임 절대 좌표만 덤프(측정용)
 *
 * 기준: docs/measure/22-퀘스트팝업.md 의 «레퍼런스 절대 y» → 프레임 y = ref y − 84 (가로 1:1).
 * 좌표는 전부 «프레임 px»(#app 의 scale 을 되돌린 값). 허용 오차 ±2px.
 */
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const PROBE = process.argv.includes('--probe');

const R = (y) => y - 84;                     /* 레퍼런스 y → 프레임 y */
let pass = 0; const fails = [];
const ok = (m) => { pass++; if (PROBE) console.log('  ok  ' + m); };
const fail = (m) => { fails.push(m); console.log('  FAIL ' + m); };
const near = (label, got, want, tol = 2) => {
  if (got === null || got === undefined || Number.isNaN(got)) return fail(`${label}: 값 없음`);
  const d = got - want;
  if (Math.abs(d) <= tol) ok(`${label} = ${got.toFixed(1)} (목표 ${want}, Δ${d.toFixed(1)})`);
  else fail(`${label} = ${got.toFixed(1)} — 목표 ${want}, Δ${d.toFixed(1)} (허용 ±${tol})`);
};

const SAVE = { totalKills: 1000, best: 12, summons: 500, upgrades: 3000, gold: 5e7, dia: 12000 };

async function openQuestPage(browser, w = 1080, h = 2280) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(500);
  return { ctx, page };
}

/* #app 의 scale 을 되돌려 «프레임 px» 로 환산한 rect 를 준다 */
const frameRects = (page, map) => page.evaluate((m) => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const s = A.width / app.offsetWidth;
  const out = {};
  for (const [k, sel] of Object.entries(m)) {
    const e = document.querySelector(sel);
    if (!e) { out[k] = null; continue; }
    const r = e.getBoundingClientRect();
    out[k] = { x: (r.left - A.left) / s, y: (r.top - A.top) / s, w: r.width / s, h: r.height / s };
  }
  return out;
}, map);

(async () => {
  const browser = await launch(chromium);
  try {
    /* ---------- 1. 기하 (기준 화면비 1080×2280) ---------- */
    const { ctx, page } = await openQuestPage(browser);
    const g = await frameRects(page, {
      box:   '#modal .mbox',
      head:  '#modal .mhead',
      body:  '#modal .mbody',
      panel: '.qs-pn',
      row1:  '.qs-r:nth-child(1)',
      row2:  '.qs-r:nth-child(2)',
      row5:  '.qs-r:nth-child(5)',
      ico:   '.qs-r:nth-child(1) .qs-i',
      bar:   '.qs-r:nth-child(1) .qs-p',
      btn:   '.qs-r:nth-child(1) .qs-b',
      all:   '#qAll',
      tg:    '.qs-tg',
      sel:   '.qs-tg .sel',
      lday:  '.qs-tg b[data-t="daily"]',
      lrep:  '.qs-tg b[data-t="rep"]'
    });
    /* .mbody 의 패딩 박스 — 절대배치 자식의 실제 기준(03 «절대 배치 자식의 기준은 padding box») */
    g.pad = await page.evaluate(() => {
      const app = document.getElementById('app'); const A = app.getBoundingClientRect();
      const s = A.width / app.offsetWidth;
      const e = document.querySelector('#modal .mbody'); const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      const bl = parseFloat(cs.borderLeftWidth), br = parseFloat(cs.borderRightWidth), bt = parseFloat(cs.borderTopWidth);
      return { x: (r.left - A.left) / s + bl, y: (r.top - A.top) / s + bt, w: r.width / s - bl - br, h: r.height / s };
    });
    if (PROBE) { console.log(JSON.stringify(g, null, 1)); await ctx.close(); await browser.close(); return; }

    /* 측정표 §0 은 바깥 박스를 «91..988 / 462..1961»(AA 포함)과 «검정 코어 464..1960 = h1497»
       두 가지로 적어 뒀다. 구현은 검정 코어가 기준이므로 코어 쪽으로 대조한다. */
    near('모달 박스 x', g.box.x, 91);
    near('모달 박스 width', g.box.w, 898);
    near('모달 박스 top(검정 코어)', g.box.y, R(464));
    near('모달 박스 height(검정 코어)', g.box.h, 1497);
    near('타이틀바 top', g.head.y, R(471), 3);
    near('타이틀바 height', g.head.h, 91, 3);
    near('본문 top', g.body.y, R(563));
    /* ⚠ 본문(.mbody)의 «border box» 를 측정표의 «콘텐츠 영역 111..968» 과 대조하면 안 된다 —
       .mbody 는 갈색 프레임을 자기 border 로 그리므로 border box 가 그만큼 넓다(43 교훈 1).
       실제 배치 기준인 «패딩 박스» 를 재서 대조한다. */

    near('리스트 패널 x', g.panel.x, 118);
    near('리스트 패널 top', g.panel.y, R(628));
    near('리스트 패널 width', g.panel.w, 844);
    near('리스트 패널 height', g.panel.h, 999);

    near('1행 x', g.row1.x, 131);
    near('1행 top', g.row1.y, R(661));
    near('1행 width', g.row1.w, 818);
    near('1행 height', g.row1.h, 179);
    near('행 세로 pitch', g.row2.y - g.row1.y, 200);
    near('행 간 gap', g.row2.y - (g.row1.y + g.row1.h), 21);

    /* ⚠ 측정표 §5-1 «y696~800 / h105 / radius 36» 은 코너 반경이 오기다(1회차 정오).
       레퍼런스 좌·우 14개 열의 «세로 연속 높이» 최소자승 피팅 → h 105.8 · r 30.9 (MSE 0.27),
       측정표 값(h105·r36)은 같은 표본에서 MSE 41. 상단도 696 이 아니라 698 이다. */
    near('보상 프레임 x', g.ico.x, 167);
    near('보상 프레임 width', g.ico.w, 106);
    near('보상 프레임 height', g.ico.h, 106);
    near('보상 프레임 top', g.ico.y, R(698));
    near('보상 프레임 세로중심 = 행 중심', (g.ico.y + g.ico.h / 2) - (g.row1.y + g.row1.h / 2), 0);

    near('진행바 x', g.bar.x, 300);   /* 측정표 299 는 +1 오기 — ref 검정 마스크 300~699 */
    near('진행바 top', g.bar.y, R(762));
    near('진행바 width', g.bar.w, 400);
    near('진행바 height', g.bar.h, 39);  /* 비평가 P·Q·S 3명 모두 ref y762~800 = h39. 측정표 38 정정 */

    near('보상받기 x', g.btn.x, 722);
    near('보상받기 top', g.btn.y, R(692));
    near('보상받기 width', g.btn.w, 195);
    near('보상받기 height', g.btn.h, 118);

    near('모두받기 x', g.all.x, 404);
    near('모두받기 top', g.all.y, R(1647));
    near('모두받기 width', g.all.w, 272);
    near('모두받기 height', g.all.h, 130);
    near('패널 하단 → 모두받기 간격', g.all.y - (g.panel.y + g.panel.h), 21);

    near('토글 바 x', g.tg.x, 151);
    near('토글 바 top', g.tg.y, R(1801));
    near('토글 바 width', g.tg.w, 797);
    near('토글 바 height', g.tg.h, 99);
    near('모두받기 → 토글 간격', g.tg.y - (g.all.y + g.all.h), 25);
    near('선택 알약 x', g.sel.x, 522);
    near('선택 알약 width', g.sel.w, 425);
    near('토글 바 하단', g.tg.y + g.tg.h, R(1899));
    near('본문 패딩박스 좌단', g.pad.x, 111, 3);
    near('본문 패딩박스 우단', g.pad.x + g.pad.w, 968, 3);

    /* 5행째가 패널 하단에서 잘려 «스크롤이 더 있다» 를 보여준다 (레퍼런스 ~13px 노출) */
    const cut5 = (g.panel.y + g.panel.h) - (g.row5.y + g.row5.h);
    if (cut5 < -2) ok(`5행 하단 잘림 = ${(-cut5).toFixed(0)}px (스크롤 어포던스)`);
    else fail(`5행이 패널 안에 다 들어왔다 (여유 ${cut5.toFixed(0)}px) — 스크롤 어포던스 없음`);

    /* ---------- 2. 기능 ---------- */
    const fn = await page.evaluate(async () => {
      const sleep = (t) => new Promise((r) => setTimeout(r, t));
      const out = {};
      out.rows = document.querySelectorAll('.qs-r').length;
      out.tabRep = !!document.querySelector('.qs-tg b[data-t="rep"].on');
      /* 탭 전환 → 일일 퀘스트 5행 */
      document.querySelector('.qs-tg b[data-t="daily"]').click();
      await sleep(120);
      out.dailyRows = document.querySelectorAll('.qs-r').length;
      out.tabDaily = !!document.querySelector('.qs-tg b[data-t="daily"].on');
      out.selLeft = document.querySelector('.qs-tg .sel').style.left;
      document.querySelector('.qs-tg b[data-t="rep"]').click();
      await sleep(120);
      out.backRep = !!document.querySelector('.qs-tg b[data-t="rep"].on');
      /* 수령 — 업적 퀘스트 하나를 «밀린 칸이 있는» 상태로 만들고 눌러 본다.
         ⚠ 847(2026-09-03) — 여기 있던 세 항(「단계 +1」·「기준선 재설정」·「저장 = s0+1」)은
           799 가 **선언째 없앤 축**을 묻고 있었다: 진행이 «수령 시점 기준 델타» 에서
           **«누적 절대값»** 으로 바뀌면서 ⓐ `S.quest[].base` 는 아무도 안 읽고
           ⓑ 한 번 누르면 **밀린 칸을 전부** 받는다(단계가 +1 이 아니다).
           333 처방대로 자리를 비우지 않고 **799 의 실제 약속으로 방향을 뒤집었다**
           — 표본은 `verify799` [C]·[E] 에서 옮겨 왔다(47 / 15 = 3칸). */
      const Q = QUESTS.find((q) => q.id === 'summon');
      S.summons = 47; S.quest.summon.s = 0;
      openQuest('rep');
      await sleep(120);
      const b = document.querySelector('.qs-b[data-q="summon"]');
      out.readyEnabled = b && !b.disabled;
      const dia0 = S.dia, s0 = S.quest.summon.s;
      out.goal0  = questGoal(Q);                /* 등차 첫 칸 = 15 */
      out.steps0 = questSteps(Q);               /* 47 / 15 = 3 칸 밀려 있다 */
      b.click();
      await sleep(700);
      out.diaUp    = S.dia > dia0;                          /* 다이아 지급 */
      out.diaExact = S.dia - dia0 === Q.dia * 3;            /* 799 — 보상은 칸당 «정액» × 칸수 */
      out.stepJump = S.quest.summon.s - s0 === 3;           /* 799 — 밀린 칸을 한 번에 */
      out.goalNext = questGoal(Q) === Q.step * 4;           /* 등차로 4번째 칸(60) */
      out.noMore   = questReady(Q) === false;               /* 47 < 60 */
      /* 저장 반영 — 옛 자는 `s0 + 1` 을 기다렸다(799 뒤엔 s0 + 3 이 정답이다) */
      const raw = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
      out.saved = !!(raw.quest && raw.quest.summon && raw.quest.summon.s === s0 + 3);
      /* ⚑ 옛 「기준선 재설정」 이 지키던 자리를 뒤집어 지킨다 — 수령해도 진행은 깎이지 않는다.
         (옛 규칙이면 여기서 진행이 0 으로 떨어졌다 = 주인이 본 «554 인데 35 가 안 열린다») */
      out.progKept = questProg(Q) === 47 && S.summons === 47;
      /* 구 세이브가 아직 들고 있는 `base` 키를 심어도 진행·목표가 안 변한다(verify799 [C]) */
      S.quest.summon.base = 999999;
      out.baseIgnored = questProg(Q) === 47 && questGoal(Q) === Q.step * 4;
      delete S.quest.summon.base;
      /* 사이드 아이콘 뱃지 */
      out.badge = !!document.querySelector('.side .ibtn[data-pop="quest"] .bdg');
      /* 비활성 버튼은 눌러도 아무 일 없다 */
      const d0 = S.dia;
      const dis = [...document.querySelectorAll('.qs-b')].find((x) => x.disabled);
      if (dis) dis.click();
      await sleep(250);
      out.disabledNoop = S.dia === d0;
      /* 잉크가 부모를 넘치지 않는다 (46 교훈 1 · 61 교훈 3) */
      const over = [];
      for (const r of document.querySelectorAll('.qs-r')) {
        const rr = r.getBoundingClientRect();
        for (const c of r.querySelectorAll('.qs-t, .qs-p, .qs-b, .qs-i')) {
          const cr = c.getBoundingClientRect();
          if (cr.right > rr.right + 1 || cr.left < rr.left - 1) over.push(c.className);
        }
      }
      out.overflow = over;
      return out;
    });
    const yes = (k, m) => (fn[k] ? ok(m) : fail(m + ' — 실패'));
    if (fn.rows === 5) ok('반복 탭 5행'); else fail(`반복 탭 행 수 ${fn.rows} (기대 5)`);
    yes('tabRep', '기본 선택 탭 = 반복 (레퍼런스와 동일)');
    if (fn.dailyRows === 5) ok('일일 탭 5행'); else fail(`일일 탭 행 수 ${fn.dailyRows} (기대 5)`);
    yes('tabDaily', '토글 «일일» 클릭 → 선택 이동');
    if (fn.selLeft === '-5px') ok('선택 알약이 좌측(일일)으로 이동'); else fail(`선택 알약 left ${fn.selLeft} (기대 -5px)`);
    yes('backRep', '토글 «반복» 으로 복귀');
    yes('readyEnabled', '완료 퀘스트의 [보상 받기] 활성화');
    if (fn.goal0 === 15) ok('전제 — 등차 첫 칸 목표 15'); else fail(`전제 — 첫 칸 목표 ${fn.goal0} (기대 15)`);
    if (fn.steps0 === 3) ok('전제 — 소환 47회에 밀린 칸 3'); else fail(`전제 — 밀린 칸 ${fn.steps0} (기대 3)`);
    yes('diaUp', '수령 → 다이아 증가');
    yes('diaExact', '수령 보상 = 칸당 정액 × 밀린 칸 3 (799)');
    yes('stepJump', '수령 → 밀린 칸 3 개가 한 번에 오른다 (799 — «단계 +1» 이 아니다)');
    yes('goalNext', '다음 목표가 등차로 4번째 칸(60)');
    yes('noMore', '더 받을 게 없다 (47 < 60)');
    yes('saved', '수령 결과가 localStorage 에 저장됨');
    yes('progKept', '수령해도 진행은 누적 절대값 그대로 — 기준선 재설정 없음 (799)');
    yes('baseIgnored', '구 세이브의 `base` 키를 심어도 진행·목표 불변');
    yes('badge', '사이드 아이콘 뱃지 요소 존재');
    yes('disabledNoop', '비활성 [보상 받기] 클릭 → 변화 0');
    if (!fn.overflow.length) ok('행 자식 잉크가 행 밖으로 안 나감');
    else fail('행 밖으로 나간 요소: ' + fn.overflow.join(', '));
    await ctx.close();

    /* ---------- 3. 화면비 — 팝업이 프레임 안에 (20 교훈 4 · 51) ---------- */
    for (const [w, h] of [[1080, 2280], [1080, 1920], [1920, 1080], [1024, 768], [1080, 2520]]) {
      const o = await openQuestPage(browser, w, h);
      const bad = await o.page.evaluate(() => {
        const app = document.getElementById('app'); const A = app.getBoundingClientRect();
        const out = [];
        for (const sel of ['#modal .mbox', '.qs-pn', '#qAll', '.qs-tg']) {
          const e = document.querySelector(sel); if (!e) { out.push(sel + ' 없음'); continue; }
          const r = e.getBoundingClientRect();
          if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5)
            out.push(`${sel} 프레임 밖 top ${Math.round(r.top - A.top)} / bottom ${Math.round(r.bottom - A.bottom)}`);
        }
        /* ⚠ 프레임 안에 있는 것만으로는 부족하다 — `.q22 .mbody{overflow:hidden}` 이라
           본문 밖으로 나간 요소는 «삐져나옴» 이 아니라 **통째로 사라진다**(LESSONS 20-④).
           짧은 프레임(frameH 1600)에서 [모두 받기]·토글이 실제로 61~86px 삼켜지고 있었다. */
        const bd = document.querySelector('#modal .mbody'); const B = bd.getBoundingClientRect();
        for (const sel of ['.qs-pn', '#qAll', '.qs-tg']) {
          const r = document.querySelector(sel).getBoundingClientRect();
          if (r.bottom > B.bottom + 0.5 || r.top < B.top - 0.5)
            out.push(`${sel} 본문 밖(overflow:hidden 에 삼켜짐) ${Math.round(r.bottom - B.bottom)}px`);
        }
        return out;
      });
      if (!bad.length) ok(`${w}×${h} 팝업 프레임 안`);
      else fail(`${w}×${h}: 팝업이 프레임 밖 — ${bad.join(' · ')}`);
      await o.ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\nVERIFY22 FAIL ${fails.length}건 / ${pass + fails.length}` : `\nVERIFY22 PASS ${pass}/${pass}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('VERIFY22 CRASH', e); process.exit(2); });
