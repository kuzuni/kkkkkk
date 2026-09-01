/* 작업 363 게이트 — 12 소환 결과 «연출 스킵» 토글.
   실행: node tools/verify363.js

   주인 지시(2026-08-29): «소환결과 부분에 연출스킵 토글 부분도 있게 해줘. 소환결과가 연출스킵되게»

   ── 재현이 먼저였다(LESSONS 338 ①) ──────────────────────────────────────────
   `tools/probe363.js`(수리 전): 30연은 전 칸이 최종 상태에 닿기까지 **2047ms**(63프레임 중 58이
   미완성) · 10연도 **940ms**. 등재문의 «30연이면 이 순차 연출이 길다» 가 그대로 확인됐다.

   ── 이 게이트가 재는 것 ──────────────────────────────────────────────────────
     §1 자리   — 토글이 «패널 아래 여백» 안에 있고, 84 앵커(버튼·닫기)와 327 패널을 **한 칸도 안 민다**
     §2 저장   — `S.opt.fxSkip` 기본 false · 새로고침 복원 · **키 없는 구 세이브 → false**(KEY 불변)
     §3 켬     — 첫 프레임부터 전 칸 최종 상태 · fx-pop 없음 · **jz-st 도 없음** · 지연 타이머 0
     §4 끔     — 252 회귀: fx-pop · 인라인 delay = i × 0.055s · fxPop 이 이긴다 · 첫 프레임 미완성
     §5 즉시   — 연출 **한복판**에 토글을 누르면 그 자리에서 끝난다(«다음 소환부터» 가 아니다)
     §6 왕복   — 토글 클릭이 팝업을 안 닫는다 · on→off→on 뒤 레이아웃 Δ0
     §7 무료   — `doSummonFree`(무료 연속 소환) 경로에서도 토글이 그대로 먹는다
     §R 되돌림 — ⓐ `jz-x` 표시를 떼면 60 쥬시 스태거가 되살아난다 ⓑ fx-pop 을 도로 붙이면 §3 이 빨개진다

   ⚠ §3 의 «첫 프레임부터 최종» 은 **기대값이 0** 인 단언이다(LESSONS 338 ④ — 헛초록 자리).
     그래서 §4 가 같은 자를 «끔» 상태에 대고 0 이 아닌 값(30칸 미완성)을 내는지 짝으로 묻고,
     §R-ⓑ 가 «자가 정말 애니메이션을 볼 줄 아는가» 를 한 번 더 못박는다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const ok = (n, got, want, tol) => {
  const num = typeof got === 'number' && typeof want === 'number';
  const d = num ? +(got - want).toFixed(2) : 0;
  R.push({ n, got, want, d, pass: num ? Math.abs(d) <= (tol || 0) : got === want });
};
const errs = [];

/* ── 363 의 상수 (index.html `.sm-sk` 주석과 한 벌) ── */
const SK_RIGHT = 36;      // 그리드 우단(36 + 1008 = 1044) 정렬
/* ⚑ 713 이관(2026-09-02) — 배수 토글이 이 팝업으로 오면서 패널 아래 띠가 83 → **98** 로 넓어졌다.
   363 이 세운 규칙(«토글은 그 띠 한가운데»)은 **그대로**이고 값만 따라간다: 15 + (98 − 56)/2 = **36**.
   같은 띠의 왼쪽은 배수 바(98)가 쓰고, 둘의 세로 중심이 64 로 같다(`verify713` [B1]). */
const SK_BOT = 36;        // 패널 하변 기준
const SK_H = 56;          // 토글 높이
const CHROME = 15;        // .sm-panel::after (하단 크롬)
const PAD_BOT = 113;      // 패널 아래 패딩 = 그리드 하변까지 (713 — 크롬 15 + 배수 바 98)
const TRACK_W = 120, TRACK_H = 46, KNOB_W = 70;
const STEP = 0.055;       // SUM_POP_STEP (252)
/* 84 하단 앵커 — 363 이 밀치면 안 되는 값(2280 프레임) */
const A84 = { btnY: 1706, btnBot: 1854, closeY: 2066, panelY: 606, panelBot: 1686, gridBot: 1573, rbY: 538 };

/* 결과 n칸을 «전부 다른 아이템» 으로 만든다(327 게이트와 같은 방식 — 중복이 섞이면 칸 수가 흔들린다).
   배너 하나의 풀은 10종뿐이라 5배너를 돌아야 30칸이 나온다. */
const MAKE = (n) => `(() => {
  S.dia = 1e12;
  const res = [], seen = new Set();
  const keys = Object.keys(BANNERS);
  for (let i = 0; i < 60000 && res.length < ${n}; i++) {
    const r = summonOne(keys[i % keys.length]);
    if (!r || !r.it || seen.has(r.it.id)) continue;
    seen.add(r.it.id); res.push(r);
  }
  return res;
})()`;

/* 한 프레임씩 «최종 상태가 아닌 칸» 을 세는 자. 최종 = transform 항등 & opacity 1.
   (fxPop 0% = scale(0)·opacity 0 · jzSt = scale .94 → 둘 다 이 자에 걸린다) */
const COUNTER = `
  window.__fin = (el) => { const cs = getComputedStyle(el); const m = cs.transform;
    return (m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)') && Number(cs.opacity) > 0.999; };
  window.__scan = async (ms) => {
    const g = document.getElementById('sumGridIn');
    const cards = [...g.children];
    const t0 = performance.now(); const out = { first: null, notFinal: 0, frames: 0, doneAt: null };
    while (performance.now() - t0 < ms) {
      const bad = cards.filter(el => !window.__fin(el)).length;
      if (out.first === null) out.first = bad;
      if (bad > 0) out.notFinal++; else if (out.doneAt === null) out.doneAt = +(performance.now() - t0).toFixed(1);
      out.frames++;
      await new Promise(r => requestAnimationFrame(() => r()));
    }
    return out;
  };`;

async function page(b, vp) {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await c.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(HTML);
  await p.waitForTimeout(900);
  await p.evaluate(COUNTER);
  return { c, p };
}

/* 결과 팝업을 연다. skip 은 «열기 전» 상태로 박는다. */
const OPEN = (n, skip) => `(async () => {
  S.opt.fxSkip = ${skip ? 'true' : 'false'};
  closeSummonResult();
  const res = ${MAKE(n)};
  showSummonResult('weapon', ${n}, res, false);
  return res.length;
})()`;

const GEO = `(() => {
  const g = s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
             r:+r.right.toFixed(1), b:+r.bottom.toFixed(1) }; };
  return { sk:g('.sm-sk'), tr:g('.sm-skt'), kn:g('.sm-skk'), panel:g('.sm-panel'), grid:g('.sm-grid'),
           btns:g('.sm-btns'), close:g('.sm-close'), rb:g('.sm-rb'),
           cls:document.getElementById('sumSkip').className,
           aria:document.getElementById('sumSkip').getAttribute('aria-checked'),
           txt:document.querySelector('.sm-skk>em').textContent,
           open:document.getElementById('sumw').classList.contains('on') };
})()`;

(async () => {
  const b = await launch(chromium);

  /* ───────────────────────── §1 자리 ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(OPEN(30, false));
    await p.waitForTimeout(2400);
    const g = await p.evaluate(GEO);

    ok('1-1 토글 노드가 있다', !!g.sk, true);
    ok('1-2 토글 높이', g.sk.h, SK_H, 0);
    ok('1-3 우단이 그리드 우단(1044)에 맞는다', g.sk.r, g.grid.r, 0.5);
    ok('1-4 패널 하변 기준 bottom', +(g.panel.b - g.sk.b).toFixed(1), SK_BOT, 0.5);
    /* 쓸 수 있는 띠 = [하단 크롬 15, 그리드 하변 98] — 양쪽에 물리면 안 된다 */
    ok('1-5 하단 크롬(15px)을 안 밟는다', +(g.panel.b - CHROME - g.sk.b).toFixed(1) >= 0, true);
    ok('1-6 그리드 하변을 안 밟는다', +(g.sk.y - g.grid.b).toFixed(1) >= 0, true);
    ok('1-7 그리드와의 여유', +(g.sk.y - g.grid.b).toFixed(1), (PAD_BOT - CHROME - SK_H) / 2 + 0.5, 1.5);
    ok('1-8 트랙 크기', g.tr.w + 'x' + g.tr.h, TRACK_W + 'x' + TRACK_H);
    ok('1-9 노브 폭', g.kn.w, KNOB_W, 0);
    /* ★ 84 앵커·327 패널이 한 칸도 안 움직였는가 — 363 의 «Δ0px» 약속 */
    ok('1-10 (84) 버튼 상변 불변', g.btns.y, A84.btnY, 0);
    ok('1-11 (84) 버튼 하변 불변', g.btns.b, A84.btnBot, 0);
    ok('1-12 (84) 닫기 상변 불변', g.close.y, A84.closeY, 0);
    ok('1-13 (327) 패널 top 불변', g.panel.y, A84.panelY, 0);
    ok('1-14 (327) 패널 하변 불변', g.panel.b, A84.panelBot, 0);
    ok('1-15 (327) 그리드 하변 불변', g.grid.b, A84.gridBot, 0);
    ok('1-16 (327) 리본 top 불변', g.rb.y, A84.rbY, 0);
    ok('1-17 패널 하변 ↔ 버튼 상변 20px 유지', +(g.btns.y - g.panel.b).toFixed(1), 20, 0);
    await c.close();
  }

  /* §1-b 짧은 프레임(1600) — «버튼 하변 ↔ 닫기» 띠에 두면 안 되는 이유가 여기 있다.
     그 띠는 1600 에서 12px 로 줄지만, 패널 안 띠는 프레임과 무관하게 83px 그대로다. */
  {
    const { c, p } = await page(b, { width: 1080, height: 1600 });
    await p.evaluate(OPEN(30, false));
    await p.waitForTimeout(2400);
    const g = await p.evaluate(GEO);
    ok('1-18 (1600) 패널 하변 기준 bottom 동일', +(g.panel.b - g.sk.b).toFixed(1), SK_BOT, 0.5);
    /* 713 — 리터럴 14 를 띠 산수로 되돌린다(위 1-7 과 같은 식이라 띠가 바뀌면 같이 따라간다) */
    ok('1-19 (1600) 그리드와의 여유 동일', +(g.sk.y - g.grid.b).toFixed(1),
      (PAD_BOT - CHROME - SK_H) / 2 + 0.5, 1.5);
    ok('1-20 (1600) 버튼과 안 겹친다', g.sk.b <= g.btns.y, true);
    /* 짝 단언 — «그 띠가 실제로 좁다» 를 재서, 자리 선택이 취향이 아니라 기하였음을 남긴다 */
    ok('1-21 (1600) 버튼↔닫기 띠는 20px 미만이다', +(g.close.y - g.btns.b).toFixed(1) < 20, true);
    await c.close();
  }

  /* ───────────────────────── §2 저장·복원 ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    ok('2-1 기본값 false', await p.evaluate('S.opt.fxSkip'), false);
    ok('2-2 DEF() 에도 false 로 있다', await p.evaluate('DEF().opt.fxSkip'), false);
    await p.evaluate(OPEN(10, false));
    await p.waitForTimeout(300);
    await p.click('#sumSkip');
    await p.waitForTimeout(200);
    ok('2-3 클릭 → true', await p.evaluate('S.opt.fxSkip'), true);
    ok('2-4 localStorage 에 저장된다',
      await p.evaluate(`JSON.parse(localStorage.getItem(KEY)).opt.fxSkip`), true);
    const key = await p.evaluate('KEY');
    await p.reload(); await p.waitForTimeout(900);
    ok('2-5 새로고침 복원', await p.evaluate('S.opt.fxSkip'), true);
    ok('2-6 KEY 를 안 올렸다', await p.evaluate('KEY'), key);
    /* 구 세이브 이관 — 키가 아예 없는 세이브(363 이전)는 기본값 false 로 흡수돼야 한다.
       ⚠ 이 항이 없으면 `fxSkip` 을 마이그레이션 화이트리스트에 넣는 것을 잊어도 초록이다.
       ⚠ 514 가 키를 `sumSkip` → `fxSkip` 으로 넓혔다. **구 `sumSkip` 세이브의 승계**를 묻는 항은
         여기가 아니라 `tools/verify514.js` §6 에 있다(이 게이트는 12 화면 몫만 본다).
       ⚠ **reload 로 재면 못 잰다** — `beforeunload → save()`(index.html 32177)가 새로고침 «직전» 에
         메모리의 S 를 통째로 다시 써서, localStorage 에서 지운 키가 그대로 되살아난다
         (실측: 지웠는데 reload 뒤 true). 그래서 이관은 `load()` 를 **직접** 불러서 잰다.
       ⚠ `load()` 는 상태를 돌려주지 않는다 — 안에서 `S = b` 를 하고 **`d.time` 을 돌려준다**(17542·17554).
         읽을 곳은 반환값이 아니라 `S.opt` 다. */
    const mig = await p.evaluate(`(() => {
      const raw = JSON.parse(localStorage.getItem(KEY));
      const put = (o) => localStorage.setItem(KEY, JSON.stringify(o));
      const rd = (mut) => { const d = JSON.parse(JSON.stringify(raw)); mut(d); put(d); load(); return S.opt.fxSkip; };
      const a = rd(d => { delete d.opt.fxSkip; });
      const c = rd(d => { d.opt.fxSkip = true; });
      const n = rd(d => { d.opt.fxSkip = false; });
      const e = rd(d => { delete d.opt; });
      put(raw); load();
      return { noKey: a, yes: c, no: n, noOpt: e }; })()`);
    ok('2-7 키 없는 구 세이브 → false', mig.noKey, false);
    ok('2-8 opt 자체가 없는 세이브 → false', mig.noOpt, false);
    /* 짝 단언 — «화이트리스트에서 빠지면 저장된 true 도 false 로 뭉갠다» 를 가르는 자리.
       2-7 만 있으면 «키를 안 읽어서 false» 와 «기본값이라 false» 를 구별 못 한다. */
    ok('2-9 true 로 저장된 세이브는 true 로 살아 돌아온다', mig.yes, true);
    ok('2-10 false 로 저장된 세이브는 false 다', mig.no, false);
    await c.close();
  }

  /* ───────────────────────── §3 켬 ───────────────────────── */
  let onScan = null;
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    const n = await p.evaluate(OPEN(30, true));
    ok('3-0 30칸이 만들어졌다', n, 30, 0);
    onScan = await p.evaluate('window.__scan(700)');
    const st = await p.evaluate(`(() => {
      const cards = [...document.getElementById('sumGridIn').children];
      return {
        n: cards.length,
        fxpop: cards.filter(e => e.classList.contains('fx-pop')).length,
        jzx:   cards.filter(e => e.classList.contains('jz-x')).length,
        jzst:  cards.filter(e => e.classList.contains('jz-st')).length,
        names: [...new Set(cards.map(e => getComputedStyle(e).animationName))],
        delays:[...new Set(cards.map(e => e.style.animationDelay))],
        anims: cards.reduce((s, e) => s + e.getAnimations().length, 0)
      }; })()`);
    ok('3-1 첫 프레임 «미완성» 칸 0', onScan.first, 0, 0);
    ok('3-2 «미완성» 프레임 0', onScan.notFinal, 0, 0);
    ok('3-3 전 칸 최종 도달 시각 < 60ms', onScan.doneAt < 60, true);
    ok('3-4 fx-pop 이 하나도 없다', st.fxpop, 0, 0);
    ok('3-5 jz-x 표시가 전 칸에 있다', st.jzx, 30, 0);
    ok('3-6 60 쥬시 스태거(jz-st)도 안 붙는다', st.jzst, 0, 0);
    ok('3-7 이긴 animation-name 이 전부 none', st.names.join(','), 'none');
    ok('3-8 굴러가는 애니메이션 0개', st.anims, 0, 0);
    ok('3-9 인라인 delay 가 전부 0s', st.delays.join(','), '0s');
    await c.close();
  }

  /* ───────────────────────── §4 끔 (252 회귀) ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(OPEN(30, false));
    const sc = await p.evaluate('window.__scan(700)');
    const st = await p.evaluate(`(() => {
      const cards = [...document.getElementById('sumGridIn').children];
      return { fxpop: cards.filter(e => e.classList.contains('fx-pop')).length,
               jzx: cards.filter(e => e.classList.contains('jz-x')).length,
               d0: cards[0].style.animationDelay, d1: cards[1].style.animationDelay,
               dl: cards[29].style.animationDelay,
               names: [...new Set(cards.map(e => getComputedStyle(e).animationName))] }; })()`);
    ok('4-1 첫 프레임에 «미완성» 칸 30 (= §3 의 0 이 헛초록이 아니다)', sc.first, 30, 0);
    ok('4-2 «미완성» 프레임이 여럿이다', sc.notFinal > 10, true);
    ok('4-3 fx-pop 이 전 칸에 있다', st.fxpop, 30, 0);
    ok('4-4 jz-x 는 안 붙는다', st.jzx, 0, 0);
    ok('4-5 (252) delay[0] = 0s', st.d0, '0s');
    ok('4-6 (252) delay[1] = 0.055s', st.d1, STEP.toFixed(3) + 's');
    ok('4-7 (252) delay[29] = 1.595s', st.dl, (29 * STEP).toFixed(3) + 's');
    ok('4-8 (252) fxPop 이 이긴다', st.names.join(','), 'fxPop');
    await c.close();
  }

  /* ───────────────────────── §5 «켜는 즉시» ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(OPEN(30, false));
    await p.waitForTimeout(400);                       /* 연출 한복판 — 30연은 1.9s 짜리다 */
    const mid = await p.evaluate(`(() => { const cards=[...document.getElementById('sumGridIn').children];
      return cards.filter(e => !window.__fin(e)).length; })()`);
    ok('5-1 400ms 시점은 아직 연출 중이다(미완성 칸 > 0)', mid > 0, true);
    await p.click('#sumSkip');
    const after = await p.evaluate(`(() => { const cards=[...document.getElementById('sumGridIn').children];
      return { bad: cards.filter(e => !window.__fin(e)).length,
               fxpop: cards.filter(e => e.classList.contains('fx-pop')).length,
               anims: cards.reduce((s,e)=>s+e.getAnimations().length,0),
               on: document.getElementById('sumw').classList.contains('on'),
               opt: S.opt.fxSkip }; })()`);
    ok('5-2 누른 «그 자리에서» 전 칸이 최종 상태', after.bad, 0, 0);
    ok('5-3 fx-pop 이 전부 떨어졌다', after.fxpop, 0, 0);
    ok('5-4 굴러가던 애니메이션이 없다', after.anims, 0, 0);
    ok('5-5 S.opt 가 켜졌다', after.opt, true);
    ok('5-6 팝업은 안 닫힌다', after.on, true);
    await c.close();
  }

  /* ───────────────────────── §6 왕복 ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(OPEN(30, false));
    await p.waitForTimeout(2400);
    const g0 = await p.evaluate(GEO);
    ok('6-1 끔 겉모습 OFF', g0.txt, 'OFF');
    ok('6-2 끔 aria-checked', g0.aria, 'false');
    await p.click('#sumSkip'); await p.waitForTimeout(250);
    const g1 = await p.evaluate(GEO);
    ok('6-3 켬 겉모습 ON', g1.txt, 'ON');
    ok('6-4 켬 클래스', g1.cls.includes('on'), true);
    ok('6-5 켬 aria-checked', g1.aria, 'true');
    ok('6-6 노브가 오른쪽으로 간다', +(g1.kn.x - g0.kn.x).toFixed(1), 50, 0.5);
    ok('6-7 트랙은 안 움직인다', g1.tr.x + '/' + g1.tr.w, g0.tr.x + '/' + g0.tr.w);
    await p.click('#sumSkip'); await p.waitForTimeout(250);
    const g2 = await p.evaluate(GEO);
    ok('6-8 다시 끄면 OFF', g2.txt, 'OFF');
    ok('6-9 왕복 뒤 토글 자리 Δ0', g2.sk.x + '/' + g2.sk.y + '/' + g2.sk.w, g0.sk.x + '/' + g0.sk.y + '/' + g0.sk.w);
    ok('6-10 왕복 뒤 패널 Δ0', g2.panel.y + '/' + g2.panel.h, g0.panel.y + '/' + g0.panel.h);
    ok('6-11 왕복 뒤 버튼 Δ0', g2.btns.y + '/' + g2.btns.h, g0.btns.y + '/' + g0.btns.h);
    ok('6-12 왕복 뒤 닫기 Δ0', g2.close.y, g0.close.y, 0);
    ok('6-13 세 번 눌러도 팝업이 안 닫힌다', g2.open, true);
    /* 짝 단언 — «닫기 필터가 토글만 통과시킨다»(배경은 여전히 닫는다) */
    await p.mouse.click(60, 300);
    ok('6-14 배경 탭은 그대로 닫힌다',
      await p.evaluate(`document.getElementById('sumw').classList.contains('on')`), false);
    await c.close();
  }

  /* ───────────────────────── §7 무료 연속 소환 경로 ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(`(() => { S.opt.fxSkip = true; S.dia = 1e12; doSummonFree('weapon', 10, true); })()`);
    const sc = await p.evaluate('window.__scan(500)');
    const st = await p.evaluate(`(() => { const cards=[...document.getElementById('sumGridIn').children];
      return { n: cards.length, fxpop: cards.filter(e=>e.classList.contains('fx-pop')).length,
               jzst: cards.filter(e=>e.classList.contains('jz-st')).length,
               on: document.getElementById('sumw').classList.contains('on') }; })()`);
    ok('7-1 무료 경로도 팝업을 연다', st.on, true);
    ok('7-2 무료 경로에서도 fx-pop 0', st.fxpop, 0, 0);
    ok('7-3 무료 경로에서도 스태거 0', st.jzst, 0, 0);
    ok('7-4 무료 경로 첫 프레임 «미완성» 0', sc.first, 0, 0);
    /* 같은 페이지에서 끄고 다시 부르면 연출이 돌아온다 = 토글이 «경로» 가 아니라 «상태» 를 탄다 */
    await p.evaluate(`(() => { S.opt.fxSkip = false; closeSummonResult(); doSummonFree('weapon', 10, true); })()`);
    const sc2 = await p.evaluate('window.__scan(500)');
    ok('7-5 끄면 무료 경로에도 연출이 돌아온다', sc2.first > 0, true);
    await c.close();
  }

  /* ───────────────────────── §R 되돌림 시험 ───────────────────────── */
  {
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(OPEN(30, true));
    await p.waitForTimeout(200);
    /* ⓐ `jz-x` 표시를 떼고 jzStagger 를 다시 부르면 — 252 의 가드가 «등장 연출 없는 그리드» 로 읽어
       자기 스태거(.jz-st)를 얹는다. 이것이 363 이 실제로 밟은 함정이고, 표시가 그것을 막는다. */
    const withMark = await p.evaluate(`(() => {
      jzStagger(document.getElementById('sumw'));
      return [...document.getElementById('sumGridIn').children]
        .filter(e => e.classList.contains('jz-st')).length; })()`);
    ok('R-1 jz-x 가 있으면 스태거가 안 붙는다', withMark, 0, 0);
    const without = await p.evaluate(`(() => {
      const cards = [...document.getElementById('sumGridIn').children];
      cards.forEach(e => e.classList.remove('jz-x'));
      jzStagger(document.getElementById('sumw'));
      return { st: cards.filter(e => e.classList.contains('jz-st')).length,
               d0: cards[0].style.getPropertyValue('--jzd'),
               d19: cards[19].style.getPropertyValue('--jzd') }; })()`);
    ok('R-2 표시를 떼면 스태거가 되살아난다 (= R-1 이 헛초록이 아니다)', without.st, 20, 0);
    ok('R-3 되살아난 스태거의 지연 기준선', without.d0, '60ms');
    ok('R-4 되살아난 스태거의 마지막 칸 지연', without.d19, (60 + 19 * 25) + 'ms');
    await c.close();
  }
  {
    /* ⓑ fx-pop 을 도로 붙이면 §3 의 자(「첫 프레임부터 최종」)가 실제로 빨개지는가 —
       기대값 0 인 단언이 «볼 줄 아는 자» 위에 서 있음을 못박는다(LESSONS 338 ④). */
    const { c, p } = await page(b, { width: 1080, height: 2280 });
    await p.evaluate(OPEN(30, true));
    await p.evaluate(`(() => { [...document.getElementById('sumGridIn').children]
      .forEach((e,i) => { e.style.animationDelay = (i*${STEP}).toFixed(3)+'s'; e.classList.add('fx-pop'); }); })()`);
    const sc = await p.evaluate('window.__scan(700)');
    ok('R-5 fx-pop 을 도로 붙이면 첫 프레임이 미완성 30', sc.first, 30, 0);
    ok('R-6 fx-pop 을 도로 붙이면 «미완성» 프레임이 생긴다', sc.notFinal > 10, true);
    await c.close();
  }

  await b.close();

  const bad = R.filter(r => !r.pass);
  R.forEach(r => console.log((r.pass ? '  ok ' : '  XX ') + String(r.n).padEnd(52)
    + ' got=' + String(r.got).padEnd(16) + ' want=' + String(r.want).padEnd(16)
    + (r.d ? ' Δ=' + r.d : '')));
  if (errs.length) console.log('errors: ' + errs.slice(0, 5).join(' | '));
  console.log('VERIFY363 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
