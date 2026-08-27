/* 작업 58 32회차 — 씬 A(전투 발) 코인 궤적을 10ms 해상도로 직접 잰다.

   왜 만들었나 — 32차 비평가 BC 가 씬 A 에 대해 두 가지를 냈다:
     ③-1 «코인이 y<134 인 프레임이 0장 — 목표(583,52)까지 279px 남기고 전부 소실»
     ③-2 «발원이 +90~118px 치우쳤고 입자·코인이 x>1080 화면 밖»
   둘 다 사실이면 큰 결함이지만, **캡처 간격이 95ms** 라 «마지막 100px» 이 프레임 사이로 빠졌을
   가능성과, 하네스가 `enemies[0]` 를 그냥 집어서 **적이 화면 우단에 서 있었을** 가능성이 있다.
   리뷰가 회차마다 잡아 온 «어긋난 것은 게임이 아니라 하네스» 를 먼저 배제한다.

   재는 것: 트리거 후 10ms 간격으로 `.fx-fly` 전부의 중심 좌표 · 소속 레이어 · 화면 밖 여부,
   그리고 골드 알약 아이콘 중심. 적 위치를 인자로 바꿔 가며 볼 수 있다.

   실행: node tools/p58an.js            (적을 «화면 가운데» 로 옮겨서 — 실제 플레이 대표값)
        node tools/p58an.js raw        (하네스가 하던 대로 enemies[0] 를 그대로) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const RAW = process.argv[2] === 'raw';

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark').length + '');
    if (st === prev && st === '0') break; prev = st; await p.waitForTimeout(80);
  }

  const out = await p.evaluate(async (raw) => {
    const iconEl = document.querySelector('#top .cbox.gold i, #top .gold i') || document.querySelector('[data-cur="gold"] i');
    const ir = iconEl ? iconEl.getBoundingClientRect() : null;
    const pill = ir ? { x: ir.left + ir.width / 2, y: ir.top + ir.height / 2 } : null;
    const e = enemies[0];
    const src = raw ? { x: e.x, y: e.y - e.r } : { x: cam.x, y: cam.y };
    const spawn = fxWorld(src.x, src.y);
    fxAt(spawn, 'combat');
    S.gold += 128000;
    const t0 = performance.now();
    const rows = [];
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const f = [...document.querySelectorAll('.fx-fly')].map((el) => {
          const r = el.getBoundingClientRect();
          return { x: +(r.left + r.width / 2).toFixed(1), y: +(r.top + r.height / 2).toFixed(1), w: +r.width.toFixed(1) };
        });
        rows.push({ t: Math.round(t), n: f.length, f });
        if (t >= 900) return res();
        setTimeout(tick, 10);
      };
      tick();
    });
    return { pill, spawn, enemy: { x: e.x, y: e.y }, rows };
  }, RAW);

  const { pill, spawn, rows } = out;
  console.log(`모드: ${RAW ? 'raw(enemies[0] 그대로)' : '가운데(cam 중심 = 실제 플레이 대표값)'}`);
  console.log(`발원(프레임 px): x ${spawn.x.toFixed(1)} y ${spawn.y.toFixed(1)}   골드 알약 아이콘 중심: x ${pill.x.toFixed(1)} y ${pill.y.toFixed(1)}\n`);
  let offAny = 0, minY = 1e9, lastSeen = -1;
  const yBands = { '<52': 0, '52~103': 0, '103~134': 0, '>=134': 0 };
  for (const r of rows) {
    if (!r.n) continue;
    lastSeen = r.t;
    for (const f of r.f) {
      if (f.x < 0 || f.x > 1080) offAny++;
      minY = Math.min(minY, f.y);
      if (f.y < 52) yBands['<52']++;
      else if (f.y < 103) yBands['52~103']++;
      else if (f.y < 134) yBands['103~134']++;
      else yBands['>=134']++;
    }
  }
  const near = (d) => rows.filter(r => r.f.some(f => Math.hypot(f.x - pill.x, f.y - pill.y) <= d));
  console.log(`표본 ${rows.length}장(10ms) · 마지막 코인 가시 ${lastSeen}ms · 코인 최소 y ${minY === 1e9 ? 'n/a' : minY}`);
  console.log(`y 대역별 표본수  <52: ${yBands['<52']}  52~103(HUD 바 안): ${yBands['52~103']}  103~134: ${yBands['103~134']}  >=134: ${yBands['>=134']}`);
  console.log(`화면 밖(x<0 또는 x>1080) 코인 표본: ${offAny}`);
  console.log(`알약 아이콘 중심 40px 안에 든 표본 프레임: ${near(40).length}장  (첫 ${near(40)[0] ? near(40)[0].t + 'ms' : 'n/a'})`);
  console.log(`알약 아이콘 중심 10px 안에 든 표본 프레임: ${near(10).length}장  (첫 ${near(10)[0] ? near(10)[0].t + 'ms' : 'n/a'})`);
  console.log(`페이지 에러 ${errs.length}건`);
  await b.close();
})();
