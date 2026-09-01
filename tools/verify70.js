/* 작업 70 — 출석 보상 팝업 «실동작» 게이트 (T2 기능 완성 규칙).
   레이아웃이 아니라 «버튼을 눌렀을 때 무엇이 바뀌는지» 만 본다.
   실행: node tools/verify70.js   → 마지막 줄이 `VERIFY70 PASS n/n` 이어야 한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const R = [];
const ok = (n, c, d) => { R.push({ n, c, d }); console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? '  — ' + d : '')); };

/* 527 — `S.gold` 를 접근자로 갈아 끼워 «누가 올렸나» 를 스택째 기록한다.
   ⚠ `enumerable:true` 는 취향이 아니다 — `save()` 가 `JSON.stringify(S)` 라 이 플래그를 빼면
   세이브에서 골드 키가 통째로 사라진다(§3 «새로고침 후에도 유지» 가 즉시 빨개진다). */
const GOLD_WATCH = () => {
  let v = S.gold;
  window.__g70w = { log: [], live: false };
  Object.defineProperty(S, 'gold', {
    configurable: true, enumerable: true,
    get() { return v; },
    set(nv) {
      const d = nv - v; v = nv;
      if (!d) return;
      const st = (new Error().stack || '');
      const m = /at ([A-Za-z0-9_$.]+)/.exec(st.split('\n')[2] || '') || [];
      window.__g70w.log.push({ d, st, fn: m[1] || '?' });
    },
  });
  /* 전제 — 감시자가 실제로 잡는지 여기서 한 번 확인한다(귀속 항이 «공허한 초록» 이 되는 것을 막는다) */
  const g0 = S.gold; S.gold = g0 + 1; S.gold = g0;
  window.__g70w.live = window.__g70w.log.length === 2;
  window.__g70w.log.length = 0;
};
const GOLD_READ = () => ({
  live: window.__g70w.live,
  all: window.__g70w.log.reduce((s, x) => s + x.d, 0),
  att: window.__g70w.log.filter((x) => /claimAttend|giveReward/.test(x.st)).reduce((s, x) => s + x.d, 0),
  who: [...new Set(window.__g70w.log.map((x) => x.fn))].join(','),
});

(async () => {
  let b;
  try { b = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await launch(chromium, o); }
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 유휴 루프가 재화를 굴려 증분 비교를 망친다(LESSONS 51-③·34-⑤) */
  await p.evaluate(() => { S.autoBuy = false; if (typeof spAuto !== 'undefined') S.spAuto = false; });

  const open = () => p.evaluate(() => { document.querySelector('.side .ibtn[data-pop="attend"]').click(); });

  /* ---------- 1. 열기 · 껍데기 ---------- */
  /* 513 — 표가 7칸 순환이라 «주차» 가 없다. n=9 는 그대로 두되 뜻이 바뀌었다: 9 % 7 = 2 → **3일차가 오늘**.
     (칸 배치·✔ 2장·👑 1장은 옛 «10일차가 오늘» 과 같은 그림이라 아래 항들은 표본을 안 바꿔도 된다.) */
  await p.evaluate(() => { S.att.n = 9; S.att.date = ''; });        /* 513 순환 — 3일차가 오늘 */
  await open();
  await p.waitForTimeout(320);
  let g = await p.evaluate(() => ({
    on: document.getElementById('modal').classList.contains('on'),
    at70: document.getElementById('modal').classList.contains('at70'),
    title: document.getElementById('mtitle').textContent,
    rings: document.querySelectorAll('#modal .mhead .at-ring').length,
    cards: document.querySelectorAll('#mbox .at-c').length,
    wide: document.querySelectorAll('#mbox .at-c7').length,
    labels: [...document.querySelectorAll('#mbox .at-bd>i')].map((e) => e.textContent),
    got: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map((e) => e.classList.contains('got')),
    today: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map((e) => e.classList.contains('today')),
    checks: document.querySelectorAll('#mbox .at-ck').length,
    crowns: document.querySelectorAll('#mbox .at-cr').length,
    d7frames: document.querySelectorAll('#mbox .at-c7 .at-rw').length,
    /* 399 — 보상이 다이아 하나로 줄어 «3칸» 이 «1칸» 이 됐다. 자리를 비우지 않으려고(333 처방)
       «그 한 칸이 전폭 카드 한복판인가» 를 같이 잰다 — 옛 3칸의 가운데 자리(left 309.5)가 정답이다. */
    d7ctr: (() => {
      const c = document.querySelector('#mbox .at-c7'), f = document.querySelector('#mbox .at-c7 .at-rw');
      if (!c || !f) return null;
      const cb = c.getBoundingClientRect(), fb = f.getBoundingClientRect();
      return +((fb.left + fb.width / 2) - (cb.left + cb.width / 2)).toFixed(2);
    })(),
    hiBands: [...document.querySelectorAll('#mbox .at-bd')].map((e) => e.classList.contains('hi')),
    txt: document.getElementById('mbox').textContent,
  }));
  ok('팝업 열림 — #modal.on.at70', g.on && g.at70);
  ok('타이틀 «출석 보상» (신규 유저 문구 없음)', g.title === '출석 보상' && !/신규/.test(g.title), g.title);
  ok('캘린더 고리 2개', g.rings === 2, String(g.rings));
  ok('카드 = 3열×2행 6장 + 7일차 전폭 1장', g.cards === 6 && g.wide === 1, g.cards + '+' + g.wide);
  /* 513(주인 지시 2026-08-31) — «1~7일 무한 순환». n 이 얼마든 라벨은 «1일 차»~«7일 차» 고정이고
     «8일 차» 이상 문구는 0건이다(옛 항은 n=9 에서 «8~14일 차» 를 기대했다 — 그 자리를 갈아 끼웠다). */
  ok('513 순환 — n 이 얼마든 라벨은 «1일 차»~«7일 차» (8일 차 이상 0건)',
    g.labels.join(',') === '1일 차,2일 차,3일 차,4일 차,5일 차,6일 차,7일 차'
    && !g.labels.some((s) => (parseInt(s, 10) || 0) > 7), g.labels.join(','));
  ok('수령 완료 = 1·2일 차 2장 (✔ 오버레이 2개)',
    g.got.filter(Boolean).length === 2 && g.checks === 2 && g.got[0] && g.got[1]);
  ok('오늘 = 3일 차 1장 (👑 포인터 1개 · n=9 → 9 % 7 = 2)',
    g.today.filter(Boolean).length === 1 && g.today[2] && g.crowns === 1);
  ok('7일차 카드 보상 1칸 (399 — 전 칸 다이아)', g.d7frames === 1, String(g.d7frames));
  ok('7일차 보상 칸이 전폭 카드 한복판 (399 — 3칸의 가운데 자리를 그대로 쓴다)',
    g.d7ctr !== null && Math.abs(g.d7ctr) <= 1, g.d7ctr + 'px');
  ok('강조 밴드 = 오늘(3일차) + 순환 최종(7일차) 2개', g.hiBands.filter(Boolean).length === 2 && g.hiBands[2] && g.hiBands[6]);
  ok('NaN/undefined 없음', !/NaN|undefined/.test(g.txt));

  /* ---------- 2. 오늘 카드 탭 → 실제 지급 ---------- */
  const before = await p.evaluate(() => ({ dia: S.dia, gold: S.gold, rel: S.relic, n: S.att.n, date: S.att.date,
    hud: (document.querySelector('#top [data-cur="dia"]') || {}).textContent || '' }));
  /* 527 — «수령이 골드를 줬나» 를 420ms 창의 차분으로 재면 안 된다. 그 창 안에서 전투 루프가 돌고,
     자동 전투가 적 하나를 잡으면 `killEnemy`(index.html ~20961)가 `S.gold += g` 로 스테이지 골드를
     넣는다 — 스테이지 1 에서 정확히 **4.08**. 자는 그것을 «출석이 준 골드» 로 읽고 24/25 로 빨갰다
     (수리 전 커밋 넷에서 전부 같은 4 — 플레이키가 아니라 **창이 오염된 것**이다. 재현 `probe527`).
     처방은 **자를 좁히는 것**이지 허용 오차를 넓히는 것이 아니다(334 처방 ① vs ②) — 두 겹으로 잰다:
       ⓐ 동기 창 — `click()` 디스패치는 동기라 `claimAttend → giveReward` 가 그 한 태스크 안에서
          끝난다. 같은 태스크에는 rAF 콜백이 끼어들 수 없으므로 여기 차분은 «출석이 준 것» 뿐이다.
       ⓑ 귀속 — 그래도 비동기로 주는 경로가 새로 생길 수 있으니, 420ms 창 전체의 `S.gold` 변화를
          **스택째** 기록해 출석 경로(`claimAttend`/`giveReward`)를 지나는 것이 0 임을 단언한다.
     [전제] 항이 ⓑ 가 공허한 초록이 아님을(감시자가 살아 있다) 못박고, §R 이 되돌림을 못박는다. */
  await p.evaluate(GOLD_WATCH);
  const sync = await p.evaluate(() => {
    const g0 = S.gold, r0 = S.relic, d0 = S.dia;
    document.querySelector('#mbox [data-att]').click();
    return { dg: +(S.gold - g0).toFixed(3), dr: S.relic - r0, dd: S.dia - d0 };
  });
  await p.waitForTimeout(420);
  const w = await p.evaluate(GOLD_READ);
  const after = await p.evaluate(() => ({ dia: S.dia, gold: S.gold, rel: S.relic, n: S.att.n, date: S.att.date,
    today: typeof today === 'function' ? today() : '',
    hud: (document.querySelector('#top [data-cur="dia"]') || {}).textContent || '',
    got: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map((e) => e.classList.contains('got')),
    crowns: document.querySelectorAll('#mbox .at-cr').length,
    checks: document.querySelectorAll('#mbox .at-ck').length,
    on: document.getElementById('modal').classList.contains('at70'),
    badge: getComputedStyle(document.querySelector('.side .ibtn[data-pop="attend"] .bdg')).display,
    fx: document.querySelectorAll('#fxl > *').length,
  }));
  /* 513 — 표가 7칸 순환이라 n=9 가 받는 칸은 #2 = **3일차 1,000**(739 주인 상수) */
  ok('오늘 카드 탭 → 보상 실지급 (S 반영)', after.dia + after.rel + after.gold > before.dia + before.rel + before.gold,
    `Δdia ${after.dia - before.dia} · Δrel ${after.rel - before.rel} · Δgold ${Math.round(after.gold - before.gold)}`);
  /* 399 — 재화 갈래가 «다이아 하나» 로 합쳐졌다(유물석은 한 톨도 안 는다는 항을 같이 둔다).
     513 — 순환으로 칸이 #9 → #2 로 바뀌면서 값이 650 → 440 이 됐고, **199 9회차가 ×12 로 5,280** 이다. 상수를 박지 않고 **표에 묻는다**
     (328 교훈 — 항을 눌러 초록으로 되돌리면 «표가 통째로 바뀌어도 초록인 게이트» 가 된다). */
  /* ⚑ 739(주인 확정 2026-09-02) — 곡선·배수(`ATT_DIA_K`)가 주인 상수 {1~6일차 1,000 ·
     7일차 10,000} 로 대체됐다. 이 항이 지키는 것은 «표 값 그대로 지급되는가»(328 교훈)와
     «그 칸이 주인 상수 위에 있는가» 둘이다 — verify498 §3·verify513 [B] 와 같은 자를 쓴다. */
  const at = await p.evaluate(() => {
    const i = 9 % ATTEND.length;               /* n=9 가 받는 칸 = #2 = 3일차 */
    return { got: ATTEND[i].dia,
             want: (typeof ATT_DIA === 'number' && i !== 6) ? ATT_DIA
                 : (typeof ATT_DIA7 === 'number' ? ATT_DIA7 : NaN) };
  });
  ok('3일차 보상 = 다이아 ' + at.got + ' (ATTEND[n % 길이] 데이터 그대로 · 그 칸이 739 주인 상수)',
    after.dia - before.dia === at.got && at.got === at.want,
    String(after.dia - before.dia) + ' vs 표 ' + at.got + ' vs 주인 상수 ' + at.want);
  /* 527 ⓐ — 동기 창(수령 그 한 태스크). 유물조각은 전투가 안 주므로 창 전체로도 같이 못박는다. */
  ok('3일차에 유물석·골드는 0 (399 — 다이아 말고는 안 준다 · 527 동기 창)',
    sync.dg === 0 && sync.dr === 0 && after.rel === before.rel,
    `동기 Δgold ${sync.dg} · Δrel ${sync.dr} · 창 전체 Δrel ${after.rel - before.rel}`);
  ok('[전제 527] 골드 감시자가 살아 있다 (귀속 항이 «공허한 초록» 이 아니다)', w.live === true, String(w.live));
  /* 527 ⓑ — 창 전체 Δ 는 0 이 아니어도 된다(전투 몫). 단 **출석 경로를 지나는 몫**은 한 톨도 없어야 한다. */
  ok('420ms 창에서도 출석 경로가 올린 골드는 0 (527 귀속 — 창 전체 Δ 는 전투 몫)',
    Math.abs(w.att) < 1e-9,
    `출석 ${w.att} · 창 전체 ${w.all.toFixed(2)} · 올린 함수 [${w.who || '없음'}]`);
  ok('S.att.n +1 · S.att.date = 오늘', after.n === before.n + 1 && after.date === after.today);
  ok('팝업이 그 자리에서 재렌더 (닫히지 않음)', after.on);
  ok('수령한 칸이 ✔ 로 바뀌고 👑 사라짐 (내일 칸은 «미래» 유지)',
    after.checks === 3 && after.crowns === 0 && after.got[2] && !after.got[3],
    `✔${after.checks} 👑${after.crowns}`);
  ok('58 연출 발생 (#fxl 에 노드)', after.fx > 0, String(after.fx));
  ok('좌측 사이드 출석 배지 꺼짐', after.badge === 'none', after.badge);

  /* ---------- 3. 재입력 차단 · 저장 ---------- */
  const dbl = await p.evaluate(() => {
    const d0 = S.dia, r0 = S.relic, g0 = S.gold;
    claimAttend(null);
    return { same: S.dia === d0 && S.relic === r0 && S.gold === g0, n: S.att.n };
  });
  ok('하루 두 번 수령 불가', dbl.same && dbl.n === after.n);

  await p.evaluate(() => save());
  await p.reload();
  await p.waitForTimeout(900);
  const rel = await p.evaluate(() => ({ n: S.att.n, date: S.att.date, rel: S.relic }));
  ok('새로고침 후에도 유지 (세이브 반영)', rel.n === after.n && rel.date === after.date && rel.rel >= after.rel,
    `n ${rel.n} · ${rel.date}`);

  /* ---------- 4. 다른 팝업 오염 없음 ---------- */
  await open();
  await p.waitForTimeout(260);
  const leak = await p.evaluate(() => {
    document.getElementById('modal').click();                       /* 딤 탭 = 닫기 */
    popup('테스트', '<p>ok</p>');
    const m = document.getElementById('modal');
    const ring = document.querySelector('#modal .mhead .at-ring');
    return { at70: m.classList.contains('at70'),
      ringVis: ring ? getComputedStyle(ring).display : 'none',
      /* rect 는 60 쥬시의 열기/닫기 스프링 도중 값이라 못 쓴다 — 계산된 스타일로 본다 */
      headH: getComputedStyle(document.querySelector('#modal .mhead')).height };
  });
  ok('딤 탭으로 닫히고 다른 팝업에 at70 이 안 남음', !leak.at70);
  ok('공용 헤더에 붙인 고리가 다른 팝업에서는 숨음', leak.ringVis === 'none', leak.ringVis);
  ok('공용 모달 헤더 높이 원복 (91px)', leak.headH === '91px', String(leak.headH));

  ok('콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* ---------- §R 되돌림 시험 (527) ----------
     자를 좁힌 것이 «무르게 푼 것» 이 아님을 못박는다 — 결함(«출석이 골드를 준다»)을 사본에
     다시 넣으면 ⓐ·ⓑ 두 항이 **둘 다** 빨개져야 한다. 넣는 자리는 표(`ATTEND`) 한 칸이다:
     `giveReward` 의 `r.gold` 분기는 399 가 표에서 그 칸을 지웠을 뿐 함수에는 살아 있다. */
  {
    const rp = await ctx.newPage();
    await rp.goto('file://' + path.resolve(__dirname, '../index.html'));
    await rp.waitForTimeout(900);
    await rp.evaluate(() => { S.autoBuy = false; if (typeof spAuto !== 'undefined') S.spAuto = false; });
    /* 513 — 표 길이를 자에도 박지 않는다(`% 28` → `% ATTEND.length`). 넣는 칸은 «n=9 가 받는 칸» 이다. */
    await rp.evaluate(() => { S.att.n = 9; S.att.date = ''; ATTEND[9 % ATTEND.length].gold = 7; });   /* ← 결함 주입 */
    await rp.evaluate(() => { document.querySelector('.side .ibtn[data-pop="attend"]').click(); });
    await rp.waitForTimeout(320);
    await rp.evaluate(GOLD_WATCH);
    const rs = await rp.evaluate(() => {
      const g0 = S.gold, r0 = S.relic;
      document.querySelector('#mbox [data-att]').click();
      return { dg: +(S.gold - g0).toFixed(3), dr: S.relic - r0 };
    });
    await rp.waitForTimeout(420);
    const rw = await rp.evaluate(GOLD_READ);
    ok('[§R-a] 표에 골드 칸을 되돌리면 «동기 창» 항이 빨개진다', rs.dg === 7, `Δgold ${rs.dg}`);
    ok('[§R-b] 같은 결함에 «귀속» 항도 빨개진다 (출석 경로 몫이 7)', Math.abs(rw.att - 7) < 1e-9,
      `출석 ${rw.att} · 창 전체 ${rw.all.toFixed(2)} · 올린 함수 [${rw.who || '없음'}]`);
    await rp.close();
  }

  await b.close();
  const pass = R.filter((x) => x.c).length;
  console.log('\nVERIFY70 ' + (pass === R.length ? 'PASS' : 'FAIL') + ' ' + pass + '/' + R.length);
  process.exit(pass === R.length ? 0 : 1);
})();
