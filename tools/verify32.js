/* 작업 32 — 가이드 미션 배너 «미완료» 상태 회귀 게이트.
   ① 미완료(todo) 상태의 기하·변환이 측정표(docs/measure/61-가이드미션.md)와 맞는가
   ② **보상받기(ready·02 ④) 상태가 회귀하지 않았는가** — 32 의 수정은 전부 `.todo` 안에만 있어야 한다
   ③ 짧은/긴 미션 이름에서도 세 줄이 배너를 벗어나지 않는가
   실행: node tools/verify32.js        → 'VERIFY32 PASS n/n' 이면 통과 */
const { chromium } = require('playwright');
const path = require('path');

let pass = 0, fail = 0;
const ck = (name, got, want, tol = 0) => {
  const ok = (typeof want === 'number') ? Math.abs(got - want) <= tol : got === want;
  ok ? pass++ : fail++;
  console.log((ok ? '  OK   ' : '  FAIL ') + name.padEnd(46) + ' got ' + got + ' / want ' + want + (tol ? ' ±' + tol : ''));
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const R = await p.evaluate(() => {
    const $$ = s => document.querySelector(s);
    const rect = s => { const e = $$(s); const b = e.getBoundingClientRect();
      return { x:+b.x.toFixed(1), y:+b.y.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1), bot:+b.bottom.toFixed(1), right:+b.right.toFixed(1) }; };
    const out = {};

    /* ── 미완료 상태 ── */
    const t = document.getElementById('tuto');
    t.classList.remove('off', 'ready'); t.classList.add('todo');
    document.getElementById('tutoBtn').textContent = '[미션-227]';
    document.getElementById('tutoName').innerHTML  = '아무거나 소환 <em>10</em>회';
    document.getElementById('tutoPg').textContent  = '(0/10)';
    document.getElementById('tutoSub').textContent = '200';
    out.todo = {
      banner: rect('#tuto'), stage: rect('#stagearea'), tabbar: rect('#tabbar'),
      l1: rect('#tuto .tbtn'), l2: rect('#tuto .tt'), l3: rect('#tuto .tpg'),
      rew: rect('#tuto .trew'), sub: rect('#tuto .tsub'),
      fill: getComputedStyle(t).backgroundColor,
      bcol: getComputedStyle(t).borderTopColor,
      bw:   getComputedStyle(t).borderTopWidth,
      dot:  getComputedStyle($$('#tuto .trew'), '::after').display,
      l1tf: getComputedStyle($$('#tuto .tbtn')).transform,
      l3tf: getComputedStyle($$('#tuto .tpg')).transform,
      subtf:getComputedStyle($$('#tuto .tsub')).transform,
      gemtf:getComputedStyle($$('#tuto .trew .ri')).transform,
      l3disp:getComputedStyle($$('#tuto .tpg')).display
    };

    /* ── 보상받기 상태(02 ④) — 32 의 수정이 새지 않았는지 ── */
    t.classList.remove('todo'); t.classList.add('ready');
    document.getElementById('tutoBtn').textContent = '[보상받기]';
    document.getElementById('tutoSub').textContent = '3';
    out.ready = {
      banner: rect('#tuto'), rew: rect('#tuto .trew'),
      bw: getComputedStyle(t).borderTopWidth, bcol: getComputedStyle(t).borderTopColor,
      l1tf: getComputedStyle($$('#tuto .tbtn')).transform,
      subtf:getComputedStyle($$('#tuto .tsub')).transform,
      gemtf:getComputedStyle($$('#tuto .trew .ri')).transform,
      l3disp:getComputedStyle($$('#tuto .tpg')).display,
      dot:  getComputedStyle($$('#tuto .trew'), '::after').display
    };

    /* ── 실제 게임 상태로 되돌린 뒤, 최장·최단 미션 이름에서 넘침 검사 ── */
    t.classList.remove('ready'); t.classList.add('todo');
    const longest = GUIDE.reduce((a, m) => m.n.length > a.length ? m.n : a, '');
    document.getElementById('tutoName').textContent = longest;
    document.getElementById('tutoBtn').textContent  = '[미션-20]';
    document.getElementById('tutoPg').textContent   = '(999/3000)';
    document.getElementById('tutoSub').textContent  = '3,000';
    const bn = $$('#tuto').getBoundingClientRect();
    out.overflow = ['#tuto .tbtn', '#tuto .tt', '#tuto .tpg', '#tuto .tsub'].map(s => {
      const r = $$(s).getBoundingClientRect();
      /* scaleX 는 getBoundingClientRect 에 반영된다 — 실제 잉크가 아니라 «박스» 기준 넘침을 본다 */
      return { s, over: +Math.max(0, r.right - bn.right, bn.left - r.left, r.bottom - bn.bottom, bn.top - r.top).toFixed(1) };
    });
    out.longest = longest;
    /* 되돌리기 */
    drawTuto();
    return out;
  });

  const OFF = 60;                                   /* 하단 앵커 변환 (ref y = 프레임 y + 60) */
  const T = R.todo;
  console.log('─ 미완료(todo) 상태 — 측정표 61 대조 (ref 좌표) ───────────────');
  ck('탭바 상단 ref y (변환 상수 근거)', T.tabbar.y + OFF, 2160, 1);
  ck('배너 좌단 x',                     T.banner.x, 620);
  ck('배너 우단 x (화면 밖 bleed)',       T.banner.right, 1080);
  ck('배너 하단 ref y',                 T.banner.bot + OFF, 1989, 1);
  ck('배너 폭',                         T.banner.w, 460);
  ck('배너 높이',                       T.banner.h, 150, 1);
  ck('배너 채움 = 반투명 검정',           T.fill, 'rgba(0, 0, 0, 0.55)');
  ck('배너 테두리 = 보이지 않음',          T.bcol, 'rgba(0, 0, 0, 0)');
  ck('배너 테두리 폭 유지(자식 좌표 보존)', T.bw, '5px');
  ck('레드닷 숨김',                      T.dot, 'none');
  ck('L3 «(진행/목표)» 줄 표시',          T.l3disp, 'block');
  ck('L1 에 잉크폭 보정 transform 있음',   /matrix/.test(T.l1tf), true);
  ck('L3 에 잉크폭 보정 transform 있음',   /matrix/.test(T.l3tf), true);
  ck('수량에 잉크폭 보정 transform 있음',   /matrix/.test(T.subtf), true);
  ck('젬에 잉크폭 보정 transform 있음',     /matrix/.test(T.gemtf), true);
  ck('보상칸 좌단 x',                    T.rew.x, 948);
  ck('보상칸 상단 ref y',                T.rew.y + OFF, 1855, 2);
  ck('보상칸 크기 w',                    T.rew.w, 118, 1);
  ck('보상칸 크기 h',                    T.rew.h, 118, 1);
  ck('수량 라벨 중심 x = 보상칸 중심',      +(T.sub.x + T.sub.w / 2).toFixed(1), +(T.rew.x + T.rew.w / 2).toFixed(1), 1);

  console.log('─ 보상받기(ready · 02 ④) 회귀 — 32 수정이 새지 않았는가 ───────');
  const D = R.ready;
  ck('테두리 검정 5px 복귀',              D.bw + ' ' + D.bcol, '5px rgb(0, 0, 0)');
  ck('배너 bbox 동일',                   D.banner.x + ',' + D.banner.w + ',' + D.banner.h, T.banner.x + ',' + T.banner.w + ',' + T.banner.h);
  ck('보상칸 bbox 동일',                 D.rew.x + ',' + D.rew.w + ',' + D.rew.h, T.rew.x + ',' + T.rew.w + ',' + T.rew.h);
  ck('L1 transform 없음(02 는 보정 안 함)', D.l1tf, 'none');
  ck('수량 transform 없음',               D.subtf, 'none');
  ck('젬 transform 없음',                 D.gemtf, 'none');
  ck('L3 줄 숨김(02 는 2줄)',             D.l3disp, 'none');
  ck('레드닷 표시',                       D.dot !== 'none', true);

  console.log('─ 최장 미션 이름 넘침 (46 교훈 1) ────────────────────────────');
  console.log('  최장 이름: ' + R.longest);
  R.overflow.forEach(o => ck('넘침 ' + o.s, o.over, 0, 0.6));

  ck('콘솔 에러 0건', errs.length, 0);
  await b.close();
  console.log('\n' + (fail ? 'VERIFY32 FAIL ' + fail + '건 (' + pass + '/' + (pass + fail) + ')' : 'VERIFY32 PASS ' + pass + '/' + pass));
  process.exit(fail ? 1 : 0);
})();
