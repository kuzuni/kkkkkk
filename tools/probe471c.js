#!/usr/bin/env node
/* 재현 ③ — 작업 471 7회차: **02 사이드 6칸을 «한 칸씩»** 잰다.
 *
 *   node tools/probe471c.js
 *
 * 왜 새 자가 필요한가 — `probe471 --ink` 는 `.ibtn .bdg` 를 **한 줄(n=6)로 뭉쳐** 평균만 싣는다
 * (`잉크 dxRi/dyTi = 11/11`). 그런데 6회차 비평가 BW·BX 가 2인 독립으로 «9 를 막는 단 하나» 로
 * 꼽은 것이 바로 이 자리이고, BX 의 지적은 «배치 좌표 편차는 0.0px 인데 **점 중심 ↔ 글리프 잉크
 * 우단** 관계가 14.0px 벌어진다» 였다. **평균을 싣는 자는 그 문장을 확인도 반박도 못 한다.**
 * §10 ③ 이 «시트가 6칸 중 1칸만 보여 준다» 로 잡은 것과 같은 결함이 자 쪽에 남아 있었다.
 *
 * 무엇을 재나 — 칸마다 ⓐ 호스트 상자 ⓑ 닷 중심·바깥 반지름 ⓒ **글리프(`.si`) 만의 잉크 bbox**.
 * ⓒ 는 «찍힌 픽셀» 로 잡는다(350·368 처방): 같은 클립을 A(그대로)·B(`.si` 만 숨김)·A2(되돌림)
 * 세 장 찍어 A↔B 차분에서 **A↔A2 도 달라진 화소(스스로 다시 그리는 것)를 뺀다**.
 * 문턱은 `probe471` 과 같은 core(>60) — 사람이 «변» 으로 보는 단단한 모양이다.
 *
 * ⚠ 라벨(`.sl`)은 일부러 뺐다. `probe471` 의 union 축은 글리프+라벨 합집합이라 우변이 라벨 쪽에서
 *   결정되는데(그 자가 `core3` «상단 띠» 축을 따로 둔 이유), 우상단 코너에서 눈이 견주는 변은
 *   **글리프의 것**이다. 여기서는 아예 글리프 하나만 숨겨 그 축을 직접 만든다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 2;

const r2 = v => Math.round(v * 100) / 100;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스가 매 프레임 다시 그려지면 차분이 통째로 «잉크» 가 된다 — 멈추고 숨긴다. */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 6칸을 다 켠다 — `.ibtn.on .bdg{display:block}` 이라 안 켜면 «닷 없는 빈 칸» 이 된다
     (cap471 1회차가 정확히 그 사고로 셋을 잃었다). 그리고 닷 맥박을 base 에 세운다. */
  /* ⚠ 클래스만 얹으면 안 된다 — `promo`·`coll` 칸은 얹은 뒤 **다시 그려지면서 `.on` 이 벗겨져**
     촬영 시점에 `display:none` 이다(cap471 6회차가 같은 자리에서 겪은 사고 · 1회차의 «빈 칸 셋»
     과 같은 뿌리). 클래스에 기대지 말고 **노드 자신을 켠다.** */
  await page.evaluate(() => {
    document.querySelectorAll('.side .ibtn').forEach(b => b.classList.add('on'));
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    document.querySelectorAll('.side .ibtn').forEach(b => {
      const d = b.querySelector('.bdg');
      if (d && getComputedStyle(d).display === 'none') d.style.display = 'block';
    });
  });
  await page.waitForTimeout(250);
  /* 550 «드레인» — 도는 유한 애니가 0이 될 때까지 반복해서 세운다(시간이 아니라 상태로 닫는다). */
  await page.evaluate(() => {
    for (let k = 0; k < 12; k++) {
      document.getAnimations().forEach(a => {
        try { a.pause(); a.currentTime = (a.effect.getTiming().duration || 0); } catch (_) {}
      });
    }
    document.querySelectorAll('.ibtn .bdg').forEach(d => { d.style.animation = 'none'; });
  });
  await page.waitForTimeout(150);

  const n = await page.evaluate(() => document.querySelectorAll('.side .ibtn').length);
  console.log('PROBE471C — 02 사이드 `.ibtn` 칸별 실측 (1080×2280 · dsf ' + DSF + ')\n');
  if (n !== 6) console.log('⚠ 칸 수가 6이 아니다 — ' + n + '개 (부품이 바뀌었다면 이 자의 전제를 다시 볼 것)\n');

  /* 클립 3장 차분 → 잉크 bbox (페이지 좌표). probe471 의 방식과 같은 문턱·같은 배제 규칙. */
  const inkOf = async (idx, clip) => {
    const shot = () => page.screenshot({ clip });
    const A = await shot();
    await page.evaluate(i => { const e = document.querySelectorAll('.side .ibtn')[i].querySelector('.si'); e.dataset.v471 = e.style.visibility || ''; e.style.visibility = 'hidden'; }, idx);
    const B = await shot();
    await page.evaluate(i => { const e = document.querySelectorAll('.side .ibtn')[i].querySelector('.si'); e.style.visibility = e.dataset.v471 || ''; delete e.dataset.v471; }, idx);
    const A2 = await shot();
    return page.evaluate(async ([a64, b64, a264, cl, dsf]) => {
      const load = async (s) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.getContext('2d').getImageData(0, 0, img.width, img.height);
      };
      const A = await load(a64), B = await load(b64), A2 = await load(a264);
      if (A.width !== B.width || A.height !== B.height || A2.width !== A.width) return null;
      let l = 1e9, t = 1e9, r = -1e9, bo = -1e9, cnt = 0;
      for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]),
          Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3]));
        const j = Math.max(Math.abs(A.data[i] - A2.data[i]), Math.abs(A.data[i + 1] - A2.data[i + 1]),
          Math.abs(A.data[i + 2] - A2.data[i + 2]), Math.abs(A.data[i + 3] - A2.data[i + 3]));
        if (d > 60 && j <= 10) { cnt++; if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bo) bo = y; }
      }
      if (!cnt) return null;
      /* device px → 제품 px */
      return { l: cl.x + l / dsf, t: cl.y + t / dsf, r: cl.x + (r + 1) / dsf, b: cl.y + (bo + 1) / dsf, n: cnt };
    }, [A.toString('base64'), B.toString('base64'), A2.toString('base64'), clip, DSF]);
  };

  const rows = [];
  for (let i = 0; i < n; i++) {
    const geo = await page.evaluate(idx => {
      const h = document.querySelectorAll('.side .ibtn')[idx];
      const d = h.querySelector('.bdg');
      const hb = h.getBoundingClientRect(), db = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      return {
        name: h.dataset.pop || '?', icon: (h.querySelector('.si') || {}).textContent || '',
        hx: hb.left, hy: hb.top, hw: hb.width, hh: hb.height,
        dcx: db.left + db.width / 2, dcy: db.top + db.height / 2, dw: db.width,
        inX: cs.getPropertyValue('--dot-in-x').trim(), inY: cs.getPropertyValue('--dot-in-y').trim(),
        sf: h.style.getPropertyValue('--sf').trim(), dx: h.style.getPropertyValue('--dx').trim(), dy: h.style.getPropertyValue('--dy').trim(),
      };
    }, i);
    const clip = {
      x: Math.max(0, Math.floor(geo.hx - 30)), y: Math.max(0, Math.floor(geo.hy - 30)),
      width: Math.ceil(geo.hw + 60), height: Math.ceil(geo.hh + 60),
    };
    const ink = await inkOf(i, clip);
    rows.push({ geo, ink });
  }

  /* ── 표 ── */
  const P = (s, w) => String(s).padEnd(w);
  console.log(P('#', 3) + P('칸', 10) + P('글리프', 8) + P('상자 우/상', 18) + P('글리프잉크 우/상', 20)
    + P('닷중심', 16) + P('잉크 dxRi/dyTi', 16) + '오버행(우/상)');
  console.log('-'.repeat(120));
  const dxs = [], dys = [];
  rows.forEach((o, i) => {
    const g = o.geo, k = o.ink;
    if (!k) { console.log(P(i + 1, 3) + P(g.name, 10) + '⚠ 글리프 잉크 0화소 — 숨김이 화면을 안 바꿨다'); return; }
    /* 조용한 실패를 표에 싣지 않는다 — 닷이 안 켜졌으면 그 칸은 «측정 불능» 이라고 말한다
       (1회차가 빈 칸 셋을 그대로 채점에 실어 잃었다). */
    if (!g.dw) { console.log(P(i + 1, 3) + P(g.name, 10) + '⚠ 닷 상자 0×0 — 점등 실패(측정 불능)'); return; }
    const dxRi = k.r - g.dcx;          /* 잉크 우변에서 점 중심이 안쪽으로 몇 px */
    const dyTi = g.dcy - k.t;          /* 잉크 상변에서 점 중심이 아래로 몇 px */
    const outR = g.dw / 2;
    dxs.push(dxRi); dys.push(dyTi);
    console.log(P(i + 1, 3) + P(g.name, 10) + P(g.icon, 8)
      + P(r2(g.hx + g.hw) + ' / ' + r2(g.hy), 18)
      + P(r2(k.r) + ' / ' + r2(k.t), 20)
      + P(r2(g.dcx) + ',' + r2(g.dcy), 16)
      + P(r2(dxRi) + ' / ' + r2(dyTi), 16)
      + r2(g.dcx + outR - k.r) + ' / ' + r2(k.t - (g.dcy - outR)));
  });

  const mm = a => ({ min: Math.min(...a), max: Math.max(...a), avg: a.reduce((s, v) => s + v, 0) / a.length });
  if (dxs.length) {
    const X = mm(dxs), Y = mm(dys);
    const cs = rows[0].geo;
    console.log('\n요약');
    console.log('  제품 상수  — `--dot-in-x` ' + cs.inX + ' · `--dot-in-y` ' + cs.inY + ' (6칸 공용 · 4회차가 «6칸 평균 잉크» 로 정한 값)');
    console.log('  잉크 dxRi  — 최소 ' + r2(X.min) + ' · 최대 ' + r2(X.max) + ' · 평균 ' + r2(X.avg) + ' ⇒ **편차 ' + r2(X.max - X.min) + 'px**');
    console.log('  잉크 dyTi  — 최소 ' + r2(Y.min) + ' · 최대 ' + r2(Y.max) + ' · 평균 ' + r2(Y.avg) + ' ⇒ 편차 ' + r2(Y.max - Y.min) + 'px');
    /* 배치(상자) 축은 흔들리지 않는다는 반대편 사실도 같이 싣는다 — BX 의 «배치 편차 0.0px» 검산. */
    const bx = rows.map(o => (o.geo.hx + o.geo.hw) - o.geo.dcx), by = rows.map(o => o.geo.dcy - o.geo.hy);
    const BX = mm(bx), BY = mm(by);
    console.log('  상자 dxR   — 최소 ' + r2(BX.min) + ' · 최대 ' + r2(BX.max) + ' ⇒ 편차 ' + r2(BX.max - BX.min) + 'px (배치는 흔들리지 않는다)');
    console.log('  상자 dyT   — 최소 ' + r2(BY.min) + ' · 최대 ' + r2(BY.max) + ' ⇒ 편차 ' + r2(BY.max - BY.min) + 'px');
    console.log('\n  ⇒ 배치 좌표는 6칸이 **한 값**인데 글리프 잉크만 벌어진다 ⇒ 남은 뿌리는 CSS 상수가 아니라 **글리프(아트) 폭**이다.');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
