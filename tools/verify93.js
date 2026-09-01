/* 작업 93 게이트 — «재화 흡수 3박자» (58 33회차 재작성·복원).

   ⚠ 왜 «복원» 인가 — 93 의 1~20회차 리뷰와 58 의 19~32회차 리뷰가 `VERIFY93 PASS` 로
   수십 번 인용해 온 `verify93.js` 는 **저장소에 커밋된 적이 없다**(58 32회차 발견).
   그 결과 58 4차 라운드의 2인 공통 지적 4건(공통1·3·5·6)이 «되돌림을 확인할 수 없는 변경» 이라
   전부 33회차로 밀렸다 — 즉 **이 파일이 없어서 58 이 멈춰 있었다.**

   임계를 어디서 가져왔나 — 눈대중 금지. 두 갈래만 쓴다.
     ⓐ 소스에 선언된 상수(`FX3_ARR0/ARR1`·`FX3_PZ_MAX`·`FXFLY_MAX`·`FRAME_W`)를 페이지에서 읽는다.
     ⓑ 리뷰에 «수치로» 남은 규격 — 복도 하한 976(형제 행 우변 949 + 아이콘 반경 27, 93 §4-16-3) ·
        복도 x 흔들림 ≤14px(93 8회차) · 퍼짐 최대 반경 ≤200px(93 §4-17-5 «204px(≤200)» FAIL 기록) ·
        형제 행 관통 0(93 §3, 딤을 **무시하고** 세도) · 펄스 왕복 ≥4 · 피크 ≥1.15(93 12회차) ·
        델타 회랑 카드기준 y275~396(58 24·27·30회차, `fxDelta` 주석에 그대로 있다).
   신설 임계는 **하나도 없다.** 33회차 실측(`tools/p93tr.js`)이 리뷰 수치와 맞는지 먼저 대조했다:
     복도 다이아 x1040.0 흔들림 0.6px(리뷰 «1040 · 0px») · 퍼짐 181.4px(≤200) ·
     첫 도착 548ms / 마지막 1265~1305ms(선언 500/1220 + 프레임 granularity 40~70ms) · 관통 0.

   ⚑ 570(2026-08-31) — 타이밍 축 셋을 «벽시계 표본» 에서 **제품 자신의 신호**로 갈아 끼웠다.
      증상: 단독 6회 연속 21/21 인데 같은 자 3개를 동시에 돌리면 19/21 · 20/21 로 갈렸다.
      `tools/probe570.js` 로 갈래를 갈랐다(부하 = 16ms 마다 메인 스레드를 n ms 태운다):
        · **«역행» 이 빨간 것은 역행 때문이 아니었다** — 실패문이 `역행 0/31표본 (0)` 이다.
          한 `ok()` 안에 «표본 40개 이상» 이라는 **전제**와 «역행 0» 이라는 **본체**가 같이 들어 있어,
          프레임이 성기면 전제가 먼저 무너진다(표본 59 → 31). 표본 수는 **러너 속도**이지 사양이 아니다.
        · **피크는 표본 위상이 아니라 «제품 프레임 간격» 에 물린다.** `fxPzTick` 은 고원
          `FX3_PZ_HOLD`(50ms)를 `h -= dt` 로 깎고 h ≤ 0 이면 **dt 전체**로 감쇠한다 —
          dt 가 50ms 를 넘는 순간 봉우리가 한 프레임도 안 남고 ×1.220 → **×1.072 로 계단**이 진다.
          즉 «표본을 촘촘히 해서» 되찾을 수 있는 값이 아니다(부하 20ms 에서 고원 안 제품 프레임 0/4).
        · 듀티도 같은 뿌리 — 표본 기준 42.9~57.1% 로 판정선 55 를 **가로지른다.**
      ⇒ 처방(등재문 ⓐ · 556 «벽시계 → 작업량 예산» 과 같은 길): 축을 **연출 자신의 신호**로 다시 적는다.
        · 국면은 제품의 `f.t`/`f.ha` 에서 읽는다(«100px 위로 갔으면 흡수» 라는 눈대중 폐기).
        · 봉우리·듀티는 제품이 **선언한** 것(비트 로그 `fxBeatLog` · `fxPz` 진폭)과
          **그린 것**(인라인 `style.transform`)을 각각 묻는다. 둘 다 프레임 간격과 무관하다.
        · 샘플러 자신이 부하다 — `getBoundingClientRect`+`getComputedStyle` 로 프레임마다
          레이아웃을 강제하던 것을 인라인 transform 읽기로 바꿨다(`probe570` 대조 **최대 Δ 0.00px**).
      **허용 오차는 한 칸도 안 넓혔다**(듀티 55 · 봉우리 1.15 그대로) — 되돌림 시험은 `node tools/verify570.js`.

   실행: node tools/verify93.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* 570 — 되돌림 시험(`tools/verify570.js`)이 «주입 사본» 을 물릴 수 있게 하는 손잡이.
   ⚠ 사본은 저장소 루트에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가
      통째로 404 다(360·367·438·439·453·467·471·541 선례). 평소에는 이 변수가 없다. */
const URL = 'file://' + path.resolve(__dirname, '..', process.env.V93_SRC || 'index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 배치 전 프레임 제외 — 노드는 생겼는데 transform 이 아직 안 걸린 첫 프레임은 전부 레이어
   원점(28,28)에 겹쳐 있다. 세면 «퍼짐 반경 1680px» 라는 허깨비가 나온다(33회차 실측). */
const placed = (g) => !(g.x < 60 && g.y < 60);

async function run(scene, span) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, scene);
  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(450); }
  if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(450); }
  /* 694 — 씬 D(50 코스튬 [강화]). `fxDelta` 를 **아직 쓰는** 유일한 계열이다(`probe694` [3]:
     `fxUpOk` 호출부 6곳 중 텍스트를 넘기는 곳은 33692·33818 두 자리뿐 · 둘 다 코스튬). */
  if (scene === 'cos') {
    await p.evaluate(() => {
      S.stone = 1e12;
      const a = AVATARS[0].id;
      S.avatars = S.avatars || {}; S.avatars[a] = 1; S.avatar = a;
      goTab('hero'); heroSubGo('cos');
    });
    await p.waitForTimeout(450);
    /* 클릭은 한 번의 evaluate 안에서 query+click 한다 — `renderCos()` 가 `#bCos.innerHTML` 을
       갈아끼우면 핸들이 detach 돼 위임 핸들러가 안 탄다(LESSONS 25-⑤ · func50 머리말). */
    await p.evaluate(() => { const c = document.querySelector('#bCos [data-cosit]'); if (c) c.click(); });
    await p.waitForTimeout(300);
  }
  if (scene === 'gain') {
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  }
  /* 부팅 연출·카운터 롤이 가라앉을 때까지 (verify58 과 같은 정착 규칙) */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus').length + '|'
      + (document.getElementById('goldN') || {}).textContent + '|' + (document.getElementById('diaN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const data = await p.evaluate(async ({ sc, span }) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const rows = [...document.querySelectorAll('.qs-r, .ml-r')].map(rect).filter(r => r.h >= 40);
    const pillEl = (cur) => document.querySelector('[data-cur="' + cur + '"]') || document.querySelector('#top .' + cur);
    const pillC = (cur) => {
      const el = document.querySelector('[data-cur="' + cur + '"] i') || document.querySelector('#top .' + cur + ' i');
      if (!el) return null; const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    /* 570 — `getComputedStyle` 로 알약 배율을 읽던 `scaleOf` 는 아래 `scaleInline` 이 대신한다
       (같은 값 · 레이아웃 강제 0회). 프레임마다 부르던 자리라 자 자신이 부하였다. */
    const cards = [...document.querySelectorAll('.tr-card')].map(rect);
    /* 694 — 씬 D 의 호스트. **클릭 전에** 잡는다: `cosUpgrade()` 가 `renderUI()` 로 카드를
       갈아끼우므로 뒤에 재면 «새 노드» 를 재게 된다(LESSONS 22 와 같은 규칙). */
    const cosEl = document.querySelector('#bCos .sk-card.sel');
    const cosR = cosEl ? rect(cosEl) : null;
    /* 694 — 씬 C 의 호스트(누를 카드). [7-c2] 가 «버스트가 그 상자 안에서 뜨는가» 를 잰다:
       종전 [7] 이 지키던 것은 **위치 축**이라(58 24·27·30회차 회랑) 개수만 세면 그 뜻이 빠진다(702 지적). */
    const trEl = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
    const trR = trEl ? rect(trEl) : null;

    /* ── 570 — 제품 자신의 신호를 남긴다(표본이 아니다) ────────────────────────
       ⓐ `plog` : 제품의 틱(`fxPzTick`)이 **그린** 인라인 scale. 프레임마다 한 줄.
       ⓑ `mism` : 그 틱에서 «그림(인라인 scale) ≠ 선언(`fxPz` 진폭)» 인 프레임.
       ⓒ `dlog` : 비트(`fxPzHit`) **직후의 진폭** — 프레임과 무관한 «선언» 그 자체.
       셋 다 레이아웃을 안 건드린다(인라인 style 읽기 · Map 조회). */
    const scaleInline = (el) => {
      if (!el || !el.style) return 1;
      const m = /scale\(([-\d.]+)\)/.exec(el.style.transform || '');
      return m ? parseFloat(m[1]) : 1;
    };
    const xyInline = (el) => {
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec((el.style && el.style.transform) || '');
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
    };
    const plog = [], mism = [], dlog = [];
    const gp0 = pillEl('gold'), dp0 = pillEl('dia');
    const oTick = window.fxPzTick, oHit = window.fxPzHit;
    window.fxPzTick = function () {
      const r = oTick.apply(this, arguments);
      for (const el of [gp0, dp0]) {
        const st = (typeof fxPz !== 'undefined') ? fxPz.get(el) : null;
        if (!st) continue;
        const want = +(1 + st.a).toFixed(4), got = scaleInline(el);
        if (Math.abs(want - got) > 1e-4) mism.push([Math.round(performance.now()), want, got]);
      }
      /* `h` = 고원의 잔량. h > 0 인 틱은 «진폭을 안 깎은 틱» 이므로 그 프레임에는 봉우리가
         반드시 그려져 있어야 한다 — [4-e] 의 등급 가능 조건을 시각으로 «추정» 하지 않고 여기서 읽는다. */
      const sg1 = (typeof fxPz !== 'undefined' && fxPz.get(gp0)) ? fxPz.get(gp0).h : -1;
      const sd1 = (typeof fxPz !== 'undefined' && fxPz.get(dp0)) ? fxPz.get(dp0).h : -1;
      plog.push([performance.now(), scaleInline(gp0), scaleInline(dp0), sg1, sd1]);
      return r;
    };
    window.fxPzHit = function (el) {
      const r = oHit.apply(this, arguments);
      const st = (typeof fxPz !== 'undefined') ? fxPz.get(el) : null;
      if (st) dlog.push([Math.round(performance.now()), st.a, st.h, el === dp0 ? 'd' : 'g']);
      return r;
    };

    const frames = [];
    const t0 = performance.now();
    let p0 = null;
    const beat0 = (typeof fxBeatLog !== 'undefined') ? fxBeatLog.length : 0;
    const punch0 = (typeof fxPunchN === 'number') ? fxPunchN : 0;
    /* 694 — «강화가 실제로 일어났나» 는 연출이 아니라 **판정**에서 읽는다(씬 C 골드 · 씬 D 강화석).
       [7-a] 의 전제가 이 값이다 — 없으면 «델타 0장» 이 «씬이 안 났다» 와 구별되지 않는다. */
    const pay0 = sc === 'cos' ? S.stone : S.gold;
    if (sc === 'quest') {
      const b = document.getElementById('qAll');
      if (b) { const r = b.getBoundingClientRect(); p0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; b.click(); }
    } else if (sc === 'gain') {
      const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
      fxAt(e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y), 'combat'); S.gold += 128000;
    } else if (sc === 'cos') {
      const b = document.querySelector('#bCos [data-cosup]');
      if (b) b.click();
    } else {
      const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
      if (c) { c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }
    }
    const cicSeen = new Set(), cicAt = new Map();
    const gp = pillEl('gold'), dp = pillEl('dia');
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        /* 570 — 좌표는 «제품이 쓴 인라인 transform» 을 그대로 읽는다(레이아웃 강제 0회).
           `probe570` 대조: rect 중심 ↔ 인라인 translate **최대 Δ 0.00px** — 같은 것을 잰다.
           국면(`ph`)은 제품의 `fxFlies` 에서 온다 — «몇 px 올라갔나» 로 국면을 추정하지 않는다. */
        const phMap = new Map();
        if (typeof fxFlies !== 'undefined') for (const f of fxFlies) if (f.ui) phMap.set(f.el, f);
        const list = [];
        for (const el of document.querySelectorAll('.fx-fly')) {
          if (el.__v93 === undefined) el.__v93 = (window.__v93n = (window.__v93n || 0) + 1);
          const g = xyInline(el); if (!g) continue;      /* transform 이 아직 안 걸린 프레임 = 배치 전 */
          const ic = el.querySelector('.cic');
          const f = phMap.get(el);
          list.push({
            i: el.__v93, cur: ic ? ic.getAttribute('data-cur-ic') : '?',
            x: g.x, y: g.y, ph: f ? { t: f.t, ha: f.ha } : null,
            lo: !!el.closest('#fxlc'), up: !!el.closest('#fxl'),
          });
        }
        const delta = [...document.querySelectorAll('.fx-delta')].map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        /* 694 — 660 의 버스트는 수명이 짧아 «끝난 뒤 세면» 이미 지워져 있다. 붙는 순간에
           도장을 찍어 누적으로 센다(666·488 이 쓴 방법). 두 씬에서만 돈다 — 씬 A·B 의
           타이밍 축은 샘플러 부하에 물리므로(570) 거기서는 한 줄도 더 안 돈다. */
        if (sc === 'upg' || sc === 'cos') {
          for (const el of document.querySelectorAll('.fx-cic')) {
            if (el.__v93c === undefined) el.__v93c = (window.__v93cn = (window.__v93cn || 0) + 1);
            cicSeen.add(el.__v93c);
            /* 위치는 «떠 있는 동안» 한 번만 잡는다(첫 프레임 = 스폰 자리). 프레임마다 재면
               자 자신이 부하가 된다(570) — 스폰 자리가 [7-c2] 가 묻는 전부다. */
            if (sc === 'upg' && !cicAt.has(el.__v93c)) {
              const r = el.getBoundingClientRect();
              if (r.width) cicAt.set(el.__v93c, { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width });
            }
          }
        }
        frames.push({
          t: Math.round(t), list, delta,
          sg: scaleInline(gp), sd: scaleInline(dp),
          punch: ((typeof fxPunchN === 'number') ? fxPunchN : 0) - punch0,
          gold: (document.getElementById('goldN') || {}).textContent,
          dia: (document.getElementById('diaN') || {}).textContent,
        });
        if (t >= span) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const leftover = document.querySelectorAll('.fx-fly, .fx-plus, .fx-lit').length;
    window.fxPzTick = oTick; window.fxPzHit = oHit;
    const beats = (typeof fxBeatLog !== 'undefined')
      ? fxBeatLog.slice(beat0).map(b => [b[0] - t0, b[1]]).filter(v => v[0] >= -1) : [];
    return {
      frames, rows, cards, p0, leftover, beats, mism: mism.length,
      /* 694 — [7] 이 읽는 셋: 호스트 상자 · 실제 지출 · 버스트 알 수 */
      cosR, trR, cicAt: [...cicAt.values()], paid: pay0 - (sc === 'cos' ? S.stone : S.gold), cic: cicSeen.size,
      plog: plog.map(r => [Math.round(r[0] - t0), r[1], r[2], r[3], r[4]]), dlog,
      goldPill: pillC('gold'), diaPill: pillC('dia'),
      outX: (typeof fx3Out === 'function' && p0) ? fx3Out(p0) : 0,
      K: {
        BSOM: typeof FX3_BSOM === 'number' ? FX3_BSOM : 70,
        ARR0: typeof FX3_ARR0 === 'number' ? FX3_ARR0 : 0.50,
        ARR1: typeof FX3_ARR1 === 'number' ? FX3_ARR1 : 1.22,
        PZMAX: typeof FX3_PZ_MAX === 'number' ? FX3_PZ_MAX : 0.22,
        PZHOLD: typeof FX3_PZ_HOLD === 'number' ? FX3_PZ_HOLD : 0.05,
        PZTAU: typeof FX3_PZ_TAU === 'number' ? FX3_PZ_TAU : 0.045,
        FLYMAX: typeof FXFLY_MAX === 'number' ? FXFLY_MAX : 32,
        FLYMAXC: typeof FXFLY_MAX_C === 'number' ? FXFLY_MAX_C : 12,
        /* 42회차 — 이 창은 «리터럴 330» 이 아니라 **소스 상수에서 파생**시킨다.
           41회차가 `fx-flash` 에서 잡은 «주석·값·게이트가 따로 굳는» 병을 여기서 반복하지 않는다.
           재는 것은 «아직 아무 아이콘도 흡수를 시작하지 않은 구간» 이므로 **최소 ha**
           (= 퍼짐 + 머묾)다. 흡수가 시작된 뒤까지 창을 열면 먼저 출발한 아이콘의 **복도 x(1040)**
           가 «퍼짐 봉투» 로 잘못 잡힌다(42회차가 실제로 FAIL 을 봤다 — 퍼짐 최대 x 1040 ≤ 997). */
        HAMIN: ((typeof FX3_SPREAD === 'number' ? FX3_SPREAD : 0.22)
                + (typeof FX3_HOLD_F === 'number' ? FX3_HOLD_F : 0.12)),
      },
    };
  }, { sc: scene, span });

  await b.close();
  return { ...data, errs };
}

/* ── 공용 계산자 ─────────────────────────────────────────────── */
const arrT = (h, k) => {
  const a = h.frames.map(f => String(f[k] || '').trim());
  const base = a[0], fin = a[a.length - 1];
  const fi = a.findIndex(v => v !== base);
  const li = fin === base ? -1 : a.findIndex(v => v === fin);
  return { first: fi < 0 ? null : h.frames[fi].t, last: li < 0 ? null : h.frames[li].t };
};
const inBox = (r, g) => g.x >= r.x && g.x <= r.x + r.w && g.y >= r.y && g.y <= r.y + r.h;

(async () => {
  console.log('VERIFY93 — 재화 흡수 3박자 (퍼짐 → 머묾 → 흡수)\n');

  /* 씬 B 창 2400ms — «잔여 DOM 0» 을 재려면 «+n» 플로터(`fx-plus`, 실측 소멸 ≈2100ms)까지
     끝난 뒤여야 한다. 2000ms 에서 세면 사양대로 살아 있는 플로터 1개가 잔여로 잡힌다. */
  const q = await run('quest', 2400);   /* 씬 B — 퀘스트 «모두 받기» (UI 발) */
  const g = await run('gain', 1400);    /* 씬 A — 전투 킬 (전투 발) */
  const u = await run('upg', 1000);     /* 씬 C — 훈련 강화(660 이후 델타 없음) */
  const cs = await run('cos', 1000);    /* 씬 D — 50 코스튬 [강화] = `fxDelta` 가 아직 사는 자리(694) */

  const K = q.K;

  /* ── [1] 퍼짐 봉투 ───────────────────────────────────────────────────────
     ⚠ 93 §4-17-5 의 «퍼짐 최대 **반경** ≤200px» 을 그대로 쓰면 안 된다 — 그 항목은 **17회차**,
     즉 밴드 스프레이(58 23~30회차)가 생기기 «전» 의 부채꼴 기준이다. 밴드는 사양상 가로로
     `슬롯 수 × FX3_BSPITCH`(16×44 = 704px)까지 벌리도록 30회차에 정해졌으므로, 원형 반경
     하나로 재면 **사양이 지시한 배치를 게이트가 막는다**.
     → 같은 봉투를 두 축으로 나눠 선다(둘 다 소스에 선언된 상수에서 온다):
        가로 = 밴드 상한 `outX − FX3_BSOM`(복도를 침범하면 안 된다) + 아이콘 반경 27
        세로 = 부채꼴 반경 상한 FX3_R1/FX3_PR1(184) + 지터 → §4-17-5 의 200 그대로 */
  console.log('[1] (a) 퍼짐 봉투 — 가로 = 밴드 상한(복도 앞) · 세로 = 부채꼴 반경 200 (93 §4-17-5)');
  const org = q.p0;
  const HAT = Math.round((q.K.HAMIN || 0.34) * 1000) - 10;   /* 42회차 — 리터럴 330 폐기 */
  let rmax = 0, rmaxT = 0, xmax = -1e9;
  for (const f of q.frames) {
    if (f.t > HAT) break;                              /* 퍼짐 + 머묾 = 흡수 개시 전(소스 상수에서 파생) */
    for (const s of f.list) {
      if (!placed(s)) continue;
      const d = Math.abs(s.y - org.y); if (d > rmax) { rmax = d; rmaxT = f.t; }
      if (s.x > xmax) xmax = s.x;
    }
  }
  const XCAP = q.outX - q.K.BSOM + 27;
  ok(xmax <= XCAP, `퍼짐 최대 x ${xmax.toFixed(1)} (≤ ${XCAP.toFixed(0)} = outX ${q.outX} − FX3_BSOM ${q.K.BSOM} + 27)`);
  ok(rmax > 10 && rmax <= 200, `퍼짐 세로 반경 ${rmax.toFixed(1)}px @${rmaxT}ms (10 < r ≤ 200)`);
  const spreadN = Math.max(...q.frames.filter(f => f.t >= 120 && f.t <= HAT).map(f => f.list.filter(placed).length), 0);
  /* 543 이관 — 알갱이가 3배(잉크 36 → 108px)가 되면서 개수가 8~16 → 3~6 으로 내려갔다. */
  ok(spreadN >= 3, `퍼짐 구간에 동시 ${spreadN}개 (≥3 — «퍼짐» 이 프레임에 실재한다)`);

  console.log('[2] (c) 흡수 — 도착 봉투 (선언 FX3_ARR0/ARR1)');
  const dia = arrT(q, 'dia'), gold = arrT(q, 'gold');
  const A = dia.first !== null ? dia : gold, B = dia.last !== null ? dia : gold;
  /* 선언값 ±20% + 리뷰가 여러 회차에 걸쳐 적어 둔 프레임 granularity 지연 +40~70ms */
  const lo0 = K.ARR0 * 1000 * 0.8, hi0 = K.ARR0 * 1000 * 1.2 + 70;
  const lo1 = K.ARR1 * 1000 * 0.8, hi1 = K.ARR1 * 1000 * 1.2 + 70;
  ok(A.first !== null && A.first >= lo0 && A.first <= hi0, `첫 도착 ${A.first}ms (${lo0.toFixed(0)}~${hi0.toFixed(0)})`);
  ok(B.last !== null && B.last >= lo1 && B.last <= hi1, `마지막 도착 ${B.last}ms (${lo1.toFixed(0)}~${hi1.toFixed(0)})`);

  /* ── [2b] 형제 행 관통 0 — 딤을 무시하고 센다 (93 §3) ───────── */
  console.log('[2b] 형제 행 관통 0 — «딤을 무시하고» 세도 0 (93 §3)');
  const home = q.rows.findIndex(r => q.p0 && inBox(r, q.p0));
  let cross = 0; const where = [];
  for (const f of q.frames) for (const s of f.list) {
    if (!placed(s)) continue;
    for (let k = 0; k < q.rows.length; k++) {
      if (k === home) continue;
      if (inBox(q.rows[k], s)) { cross++; if (where.length < 5) where.push(`${f.t}ms 행${k} ${Math.round(s.x)},${Math.round(s.y)}`); }
    }
  }
  ok(cross === 0, `관통 ${cross}표본 (0)${where.length ? ' — ' + where.join(' · ') : ''}`);
  ok(q.rows.length >= 2, `형제 행 ${q.rows.length}개 — 관통을 잴 대상이 실제로 있다`);

  /* ── [2c] 복도 (93 §4-16-3) ─────────────────────────────── */
  console.log('[2c] 복도 — 형제 행 우변 밖 · 흔들림 (93 §4-16-3 · 8회차)');
  const rowTop = Math.min(...q.rows.map(r => r.y)), rowBot = Math.max(...q.rows.map(r => r.y + r.h));
  const rowRight = Math.max(...q.rows.map(r => r.x + r.w));
  const LANE_MIN = rowRight + 27;                        /* 형제 행 우변 + 아이콘 반경 27 = 976 */
  const lanes = {};
  for (const f of q.frames) for (const s of f.list) {
    if (!placed(s)) continue;
    if (s.y >= rowTop && s.y <= rowBot) (lanes[s.cur] || (lanes[s.cur] = [])).push(s.x);
  }
  const curs = Object.keys(lanes).filter(k => lanes[k].length >= 5);
  ok(curs.length >= 1, `복도 표본이 있는 재화 ${curs.length}종`);
  for (const k of curs) {
    const a = lanes[k], mn = Math.min(...a), mx = Math.max(...a);
    ok(mn >= LANE_MIN, `복도 ${k} 최소 x ${mn.toFixed(1)} (≥ ${LANE_MIN.toFixed(0)} = 행 우변 ${rowRight.toFixed(0)} + 27)`);
    ok(mx - mn <= 14, `복도 ${k} 흔들림 ${(mx - mn).toFixed(1)}px (≤14)`);
  }

  /* ── [3] 흡수 중 아래로 되돌아가는 프레임 0 ───────────────────
     ⚑ 570 — 전제와 본체를 갈랐다(341 «[전제] 절» 선례). 종전 한 줄은
       `ok(moved > 40 && backs === 0, …)` 이라 **표본이 40개 안 되면 «역행» 이 빨개진다** —
       3중 부하에서 실제로 그렇게 죽었다(`역행 0/31표본 (0)`: 역행은 0인데 빨강).
       전제는 «표본 수»(= 러너 속도) 가 아니라 **아이콘 수**(= 사양, 543 이후 3~6)로 세운다.
     ⚑ 국면도 «첫 표본에서 100px 위» 라는 눈대중을 버리고 제품의 `f.t ≥ f.ha` 로 읽는다.
       흡수 국면의 y 는 시간의 순함수(단조)라 **허용 오차 0px** 이 정확한 자다 —
       종전 «+2px» 은 머묾의 부유를 흘려보내려던 완충인데, 표본 간격이 벌어지면
       같은 부유가 한 표본에 2px 을 넘어 «역행» 으로 찍힌다(자가 러너 속도를 재는 자리). */
  console.log('[3] 흡수 국면 y 역행 0 — 국면은 제품 자신의 f.t/f.ha 로 고른다 (570)');
  let backs = 0, moved = 0; const stM = new Map();
  for (const f of q.frames) for (const s of f.list) {
    if (!placed(s) || !s.ph || s.ph.t < s.ph.ha) continue;
    const key = s.cur + ':' + s.i;
    const st = stM.get(key) || { prev: s.y, n: 0 };
    moved++; st.n++; if (s.y > st.prev) backs++;
    st.prev = s.y; stM.set(key, st);
  }
  const absFly = [...stM.values()].filter(v => v.n >= 2).length;
  ok(absFly >= 3, `[3-전제] 흡수 국면 표본이 2개 이상인 아이콘 ${absFly}종 (≥3 = [5] 하한과 같은 사양)`);
  ok(backs === 0, `역행 ${backs}/${moved}표본 (0 — 허용 0px)`);

  /* ── [4] 알약 펄스 (93 12회차 · 570 재작성) ──────────────────────────
     ⚑ 570 — «표본으로 봉우리를 세는» 자를 폐기했다. 뿌리는 표본 위상이 아니라 **제품 프레임 간격**이다:
       `fxPzTick` 은 고원(`FX3_PZ_HOLD`)을 `h -= dt` 로 깎고 h ≤ 0 이면 **dt 전체**로 감쇠하므로,
       dt > 50ms 인 순간 봉우리가 한 프레임도 «그려지지» 않는다(×1.220 → ×1.072 계단).
       그건 이 기기의 프레임 사정이지 연출의 규격이 아니다 — 규격은 셋으로 갈라 묻는다.
         [4-a] 선언  : 비트마다 진폭이 FX3_PZ_MAX 로 올라간다      (프레임 무관 — fxPzHit 직후 값)
         [4-b] 그림  : 제품이 매 틱 «선언한 값 그대로» 그린다      (프레임 무관 — 인라인 scale ↔ fxPz.a)
         [4-c] 고원  : 고원이 60fps 한 프레임보다 길다             (설계 보장 — 정상 기기면 반드시 보인다)
       셋이 참이면 «봉우리 ×1.22 가 화면에 남는다» 가 따라 나온다. 아래 [4-e] 는 그 귀결을
       실제로 그려진 값으로 한 번 더 확인하되, **고원 안에 제품 프레임이 하나도 없던 실행**
       (= 이 기기가 느렸던 실행)에서는 등급하지 않는다 — 그 자리는 [4-a]~[4-c] 가 문다. */
  console.log('[4] 알약 펄스 — 선언 · 그림 · 고원 · 듀티 (93 12회차 · 570 재작성)');
  const scaleKey = dia.first !== null ? 'sd' : 'sg';
  const pi = scaleKey === 'sd' ? 2 : 1;
  const hits = q.dlog.filter(r => r[3] === (scaleKey === 'sd' ? 'd' : 'g'));
  const declMin = hits.length ? Math.min(...hits.map(r => r[1])) : 0;
  /* ⚑ 644(2026-09-01) — 하한 4 → **사양 밴드 3..6**. 값을 무르게 푼 것이 아니라 **사양으로 옮긴 것**이다.
     644 가 `cur-dia.svg` 의 viewBox 를 잉크 bbox 로 잘라 채움비 .9375 → 1.0 이 되면서 알갱이의
     **실제 잉크 지름**이 108.3 → **115.5** 가 됐다(`FX3_GINK` — 그 상수의 끝 계수가 바로 이 채움비다.
     108.3 을 그대로 두면 상수가 잉크를 **속이고** 알갱이가 6.7% 겹치게 깔린다 ⇒ `verify543` [D] 가 잡는다).
     543 의 설계가 «크기를 개수와 맞바꾼다» 이므로 밴드 피치·최소 중심거리(`FX3_MIND` 123 → 132)가 같이
     커졌고 UI 발 슬롯이 **4 → 3** 이 됐다. 3 은 이 화면의 **사양 하한**이다 —
     93 자신의 «UI 발 3~6개» · `verify58` [2] · `verify543` [D](«개수가 3 밑으로 안 내려간다»)가 같은 수를 쓴다.
     ⇒ 한쪽만 묻던 «≥4» 를 **양쪽을 묻는 «3..6»** 으로 바꿨다(위반 방향이 하나 늘었다).
     ⚠ 되돌림 대조 — `FX3_GINK` 를 108.3 으로 되돌린 사본은 이 절이 **26/26 초록**이다(비트 4회).
       즉 이 항은 여전히 기하에 물려 있고, 알갱이를 다시 줄이면 개수가 저절로 돌아온다. */
  const BEAT_LO = 3, BEAT_HI = 6;   /* 93 사양 «UI 발 3~6개» */
  ok(hits.length >= BEAT_LO && hits.length <= BEAT_HI && declMin >= K.PZMAX - 1e-9,
    `[4-a] 선언 — 비트 ${hits.length}회(사양 ${BEAT_LO}~${BEAT_HI}) 전부 진폭 ≥ FX3_PZ_MAX ${K.PZMAX} (최소 ${declMin.toFixed(4)})`);
  ok(q.mism === 0, `[4-b] 그림 = 선언 — 제품 틱 ${q.plog.length}회 중 인라인 scale ≠ 1+a 인 프레임 ${q.mism}건 (0)`);
  ok(K.PZHOLD * 1000 >= 1000 / 60, `[4-c] 고원 ${(K.PZHOLD * 1000).toFixed(0)}ms ≥ 60fps 한 프레임 16.7ms (FX3_PZ_HOLD)`);
  const beats = Math.max(...q.frames.map(f => f.punch));
  ok(beats >= BEAT_LO && beats <= BEAT_HI, `왕복(fxPunchN 증가) ${beats}회 (사양 ${BEAT_LO}~${BEAT_HI} · 644 이관)`);

  /* [4-d] 듀티 — 비트 시각(`fxBeatLog`)과 감쇠 법칙만으로 «켜져 있는 시간의 비» 를 낸다.
     종전 «표본 중 scale>1.005 인 프레임 비율» 은 부하에서 42.9~57.1% 로 판정선 55 를 가로질렀다.
     여기서 쓰는 것은 제품이 선언한 값뿐이다 — 고원 + τ·ln(진폭/문턱). 판정선 55 는 그대로다. */
  const ONMS = K.PZHOLD * 1000 + K.PZTAU * 1000 * Math.log(K.PZMAX / 0.005);
  /* 비트 시각은 «내가 재는 그 알약» 의 것만 골라야 한다. 재화 구분은 **요소 동일성**(`el === dp0`)으로
     한다 — 제품의 `fxBeatLog` 둘째 칸('d'/'g')도 같은 답을 내지만(아래 관측 줄이 매 실행 대조한다),
     그 칸은 `className` 에 'cDia' 가 있는지로 가르므로 알약 마크업이 바뀌면 조용히 어긋난다. */
  const bcur = scaleKey === 'sd' ? 'd' : 'g';
  const bt = q.dlog.filter(r => r[3] === bcur && Math.abs(r[2] - K.PZHOLD) < 1e-9)
    .map(r => r[0]).sort((a, b) => a - b);
  let duty = 0;
  if (bt.length >= 2) {
    let on = 0;
    for (let i = 0; i < bt.length; i++) on += Math.min(ONMS, (i + 1 < bt.length ? bt[i + 1] : Infinity) - bt[i]);
    duty = on / Math.max(1, bt[bt.length - 1] + ONMS - bt[0]);
  }
  ok(bt.length >= BEAT_LO && bt.length <= BEAT_HI, `[4-d 전제] ${bcur === 'd' ? '다이아' : '골드'} 비트 ${bt.length}건 (사양 ${BEAT_LO}~${BEAT_HI} — fxPzHit 직후의 고원 개시, 표본이 아니다)`);
  ok(duty >= 0.55, `[4-d] 듀티(선언) ${(duty * 100).toFixed(1)}% (≥55% · 켜짐 ${ONMS.toFixed(0)}ms = 고원 + τ·ln(${K.PZMAX}/0.005))`);

  /* [4-e] 그려진 봉우리 — 고원 안에 제품 프레임이 있었던 비트만 등급한다 */
  /* 등급 가능 조건을 시각으로 «추정» 하지 않는다 — 제품이 남긴 고원 잔량 `h` 를 직접 읽는다.
     h > 0 인 틱 = 그 프레임에서 `fxPzTick` 이 진폭을 한 번도 안 깎았다 = 봉우리가 그려져 있어야 한다.
     프레임이 고원(50ms)보다 성긴 실행에서는 그런 틱이 **한 장도 없고**(등급 불가), 그 자리는
     [4-a](선언) · [4-b](그림=선언) · [4-c](고원 길이)가 대신 문다. 판정선 1.15 는 그대로다. */
  const hi = pi === 2 ? 4 : 3;
  const live = q.plog.filter(r => r[hi] > 0);
  const peakOn = live.length ? Math.min(...live.map(r => r[pi])) : 0;
  const peakAll = Math.max(...q.plog.map(r => r[pi]), 1);
  const tail = live.length === 0
    ? ' — 이 실행은 프레임이 고원보다 성겨 등급 불가, [4-a]~[4-c] 가 문다'
    : ' · 1.15 ~ ' + (1 + K.PZMAX).toFixed(2);
  ok(live.length === 0 || (peakOn >= 1.15 && peakOn <= 1 + K.PZMAX + 0.02),
    `[4-e] 고원(h>0)이 살아 있던 틱 ${live.length}장의 최소 배율 ×${peakOn.toFixed(3)}${tail}`);
  const btLog = q.beats.filter(b => b[1] === bcur).length;
  console.log(`      (관측) 전 구간 그려진 최대 배율 ×${peakAll.toFixed(3)} · 제품 틱 ${q.plog.length}회`
    + ` · 비트 ${bt.length}회 (fxBeatLog 같은 재화 ${btLog}회 — 두 신호가 어긋나면 알약 마크업이 바뀐 것)`);

  /* ── [5] 아이콘 수 ─────────────────────────────────────── */
  console.log('[5] 아이콘 수 상한 (선언 FXFLY_MAX)');
  const qPeak = Math.max(...q.frames.map(f => f.list.length));
  /* 543 이관 — 하한 8 → 3(개수를 잉크 면적과 맞바꿨다). 상한은 종전대로 제품의 FXFLY_MAX 를 읽는다. */
  ok(qPeak >= 3 && qPeak <= K.FLYMAX, `UI 발 동시 최대 ${qPeak}개 (3 ~ FXFLY_MAX ${K.FLYMAX})`);

  /* ── [6] 전투 발은 3박자를 쓰지 않는다 ──────────────────── */
  console.log('[6] 전투 발 — 3박자 밖 · 팝업 아래 레이어(작업 77)');
  const gPeak = Math.max(...g.frames.map(f => f.list.length));
  const gLo = Math.max(...g.frames.map(f => f.list.filter(s => s.lo).length));
  const gUp = Math.max(...g.frames.map(f => f.list.filter(s => s.up).length));
  const gArr = arrT(g, 'gold');
  ok(gPeak > 0 && gPeak <= K.FLYMAXC, `전투 발 동시 최대 ${gPeak}개 (1 ~ FXFLY_MAX_C ${K.FLYMAXC})`);
  ok(gLo > 0 && gUp === 0, `#fxlc(팝업 아래) ${gLo}개 · #fxl(팝업 위) ${gUp}개`);
  ok(gArr.last !== null && gArr.last < K.ARR1 * 1000, `전투 발 마지막 도착 ${gArr.last}ms < UI 발 선언 ${K.ARR1 * 1000}ms`);

  /* ── [7] 델타 플로터 — 660 이관 (694, 333 처방) ──────────────────────────
     종전 한 항: «씬 C(훈련) 델타가 훈련 카드기준 y275~396 회랑 안에 선다»(58 24·27·30회차).
     **660**(주인 지시 «훈련·단련·룬 숫자 플로터 폐지»)이 그 플로터를 통째로 걷었다 —
     `trHoldStart`/`trHoldStop` 의 `fxUpOk(…, null, cur, true)` 두 자리가 그 증거다
     (`probe694` [3-b]). 그래서 종전 항은 **주인이 없애라고 한 것이 있어야 통과하는 자**가 됐다.
     ⇒ 자리를 비우지 않고(333) 660 이 `verify488`·`verify583` 에서 쓴 규약 그대로 갈아 끼운다:
        음성항으로 뒤집고, **그 자리를 이어받은 부품에 양성항**을 세운다.
       [7-a] 전제 — 씬 C 는 **났다**(강화가 실제로 일어나 골드가 나갔다).
             이것이 없으면 «델타 0장» 은 «씬이 안 났다» 와 구별되지 않는다(종전 실패문이 바로 그 말이었다).
       [7-b] 음성 — 씬 C 에 델타 0장. 660 이 되돌아가면 빨개진다.
       [7-c] 양성 — 그 자리를 «아이콘 버스트»가 대신한다. 없으면 «660 이 통째로 사라져도 초록» 이다.
       [7-d] 부품 — `fxDelta` 자체는 안 죽었다: 아직 쓰는 계열(50 코스튬)에서 뜨고,
             **호스트 안에서 출발해 선언된 여정만큼** 간다.
     ⚑ 새 임계는 하나도 안 만들었다 — [7-d] 의 봉투는 ⓐ 호스트 카드 상자(제품이 그린 것)와
        ⓑ `@keyframes fxDelta` 의 선언(−4px → +80px = 84px)에서 온다. 종전 훈련 회랑 275~396 은
        훈련 카드(326×510)의 «아이콘 아래 ~ 버튼 위» 띠라 코스튬 카드(168×171)에 옮겨 적을 수 없다. */
  console.log('[7] 델타 플로터 — 660 이관(훈련은 폐지 · 코스튬은 살아 있다)');
  const uDelta = u.frames.reduce((n, f) => n + f.delta.length, 0);
  ok(u.paid > 0, `[7-a] 전제 — 씬 C 가 났다: 훈련 강화로 골드 ${u.paid} 지출(연출이 아니라 판정에서 읽는다)`);
  ok(uDelta === 0, `[7-b] ★ 660 — 훈련 «+n» 숫자 플로터가 0장이다 (${uDelta}프레임·표본)`);
  ok(u.cic >= 3, `[7-c] ★ 그 자리를 아이콘 버스트가 대신한다 (${u.cic}알 · 660)`);
  /* [7-c2] — 종전 [7] 이 지키던 것은 개수가 아니라 **위치**였다(702 지적: «위치 축을 잃지 마라»).
     자리는 660 이 정한 그대로 «스폰은 누른 호스트뿐» 이고, 봉투는 호스트 상자에서 온다 —
     알갱이 자신의 반지름만 여유로 준다(제품이 그린 값 · 새 상수 0개). */
  const tr = u.trR, bad = [];
  if (tr) for (const a of u.cicAt) {
    const m = a.s / 2;
    if (a.x < tr.x - m || a.x > tr.x + tr.w + m || a.y < tr.y - m || a.y > tr.y + tr.h + m) bad.push(a);
  }
  ok(!!tr && u.cicAt.length >= 3 && bad.length === 0,
    `[7-c2] ★ 그 버스트가 **누른 카드 상자 안**에서 뜬다 — 밖 ${bad.length}알 / 잰 ${u.cicAt.length}알`
    + (tr ? ` (카드 ${Math.round(tr.w)}×${Math.round(tr.h)})` : ' (호스트 없음)'));

  const cr = cs.cosR;
  const cd = [];
  for (const f of cs.frames) for (const d of f.delta) if (cr) cd.push({ dx: d.x - cr.x, dy: d.y - cr.y });
  const DJ = 84;   /* 선언 — `@keyframes fxDelta` 0% −4px → 100% +80px */
  if (!cr || !cd.length) {
    ok(false, `[7-d] 씬 D 델타 표본 0 — 코스튬 [강화]가 안 났다 (호스트 ${cr ? '있음' : '없음'} · 강화석 지출 ${cs.paid})`);
  } else {
    const ys = cd.map(o => o.dy), xs = cd.map(o => o.dx);
    const y0 = Math.min(...ys), y1 = Math.max(...ys), x0 = Math.min(...xs), x1 = Math.max(...xs);
    ok(cs.paid > 0, `[7-d 전제] 코스튬 [강화]가 실제로 붙었다 — 강화석 ${cs.paid} 지출`);
    ok(y0 >= 0 && y0 <= cr.h,
      `[7-d] ★ 부품은 살아 있다 — 델타가 **호스트 안에서 출발한다** 카드기준 y ${y0.toFixed(0)} (0~${Math.round(cr.h)})`);
    ok(y1 - y0 <= DJ + 8,
      `[7-e] 그림 = 선언 — 세로 여정 ${(y1 - y0).toFixed(0)}px ≤ 선언 ${DJ}px(+표본 여유 8)`);
    ok(x0 >= 0 && x1 <= cr.w,
      `[7-f] 가로는 호스트 폭 안 — x ${x0.toFixed(0)}~${x1.toFixed(0)} (0~${Math.round(cr.w)})`);
  }

  /* ── [8] 잔여 DOM · 콘솔 ───────────────────────────────── */
  console.log('[8] 잔여 DOM · 콘솔 에러');
  ok(q.leftover === 0, `씬 B 종료 뒤 잔여 연출 노드 ${q.leftover}개 (0)`);
  const e = q.errs.length + g.errs.length + u.errs.length + cs.errs.length;
  ok(e === 0, `네 씬 콘솔 에러 합계 ${e}건`);

  console.log(`\nVERIFY93 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
