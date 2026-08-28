/* 작업 58 — 연출 연속 프레임 캡처 «강제 합성» 하네스 (32회차 재작성).
   지시서 [3]-(다): 정지 1장이 아니라 연속 프레임을 비평가에게 준다.

   ⚠ 31회차가 이 하네스를 처음 만들었지만 **저장소에 커밋되지 않았다**(리뷰 §31 이 설계만 남기고
   파일은 유실 — 32회차가 그 설계문대로 재작성했다). 재발 방지: 게이트·하네스는 반드시 커밋한다.

   왜 «강제 합성» 인가 — 종전 `cap58.js` 는 CDP `Page.startScreencast` 로 프레임을 받았는데,
   부하가 걸리면 **낡은 합성**을 내보낸다(28회차 실측 «바닥 56~68ms · 부하 시 488ms»).
   그래서 28·29·30 세 라운드 연속으로 «머묾 박자가 없다 / 재화가 아직 안 보인다» 가 감점됐고,
   31회차가 그것이 게임이 아니라 캡처임을 확정했다(리뷰 §31 «최대 수확»).

   이 하네스는 표본마다
     ① 페이지를 새로 열고 → ② 씬을 세팅하고 → ③ 트리거 뒤 목표 시각까지 rAF 로 진행시키고
     → ④ 페이지를 통째로 얼린 뒤 → ⑤ `page.screenshot()` 로 찍는다.
   스크린샷이 300~600ms 로 느린 것은 상관없다 — 화면이 정지해 있기 때문이다.

   ★ 얼리기는 반드시 **두 겹**이어야 한다(31회차 교훈 1):
     `requestAnimationFrame = () => 0` 만으로는 안 된다. `fxPlus`·`fxDelta`·`fxPop` 은
     **컴포지터**가 돌리는 CSS 애니메이션이라 rAF 를 죽여도 계속 흐르고, 느린 스크린샷 동안
     그만큼 더 진행한 그림이 찍힌다(새 방식이 스스로 낡은 프레임을 만든다).
     → `document.getAnimations().forEach(a => a.pause())` 를 같이 건다.

   ★ 세이브를 표본마다 비운다(31회차 교훈 2): 표본마다 새 컨텍스트를 쓰므로 localStorage 가
     남아 있으면 «표본마다 1.3초씩 실제로 게임이 돈» 누적분이 정답표를 깨뜨린다.

   실행:
     node tools/cap58b.js [라운드]  [씬목록]
     node tools/cap58b.js r32       gain,quest,upg      (기본값)
   결과: docs/review/58-<라운드>-<씬>-<n>.jpg  +  docs/review/58-<라운드>-정답표.md */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROUND = process.argv[2] || 'r32';
const WANT = (process.argv[3] || 'gain,quest,upg').split(',').map(s => s.trim()).filter(Boolean);
const OUT = path.resolve(__dirname, '../docs/review');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 표본 시각(ms, 트리거 = 0). 93 규격의 연출 길이가 «첫 도착 0.50s · 마지막 1.22s · 총 1.1~1.4s»
   이므로 gain·quest 는 95ms 간격 17장(0~1520ms)으로 그 봉투를 통째로 덮는다.
   upg(강화)는 `fxDelta .62s` + `fxFlash` 라 100ms 간격 8장(0~700ms)이면 충분하다. */
/* ⚑ 32회차 — **씬마다 간격이 달라야 한다.** r32 는 씬 A 도 95ms 로 찍었는데, 씬 A 는 전투 발이라
   총 길이가 ~480ms(UI 발 1500ms의 1/3)다. 그래서 «흡수» 구간(372~476ms, 약 100ms)이 통째로
   프레임 사이(318 → 384 → 소멸)로 빠졌고, 비평가 BC 가 정직하게 «코인이 y<134 인 프레임이 0장 —
   목표까지 279px 남기고 소실» 로 읽었다. `p58an` 이 10ms 로 재니 코인 최소 y 는 **27.5**,
   알약 아이콘 중심 10px 안에 든 구간이 **372~476ms** 로 멀쩡히 있다(화면 밖 표본 0).
   → 씬 A 는 40ms 간격으로 내린다. 봉투 길이에 표본을 맞추는 것이 «연속 프레임» 의 조건이다. */
const SCENES = {
  gain:  { stops: Array.from({ length: 17 }, (_, i) => i * 40) },
  quest: { stops: Array.from({ length: 17 }, (_, i) => i * 95) },
  upg:   { stops: Array.from({ length: 8 }, (_, i) => i * 100) },
};

/* ── 페이지 안에서 도는 코드 ── 씬 세팅과 트리거를 문자열이 아니라 함수 이름으로 넘긴다 ── */
async function setupScene(p, scene) {
  await p.evaluate((sc) => {
    /* 게임 로직만 죽인다(LESSONS 58-2). draw()·fxTick() 은 계속 돌아 연출은 그대로 보인다 —
       안 멈추면 유휴 전투 수입이 프레임마다 HUD 골드를 굴려서 연출과 무관한 변화가 캡처에 섞인다. */
    if (typeof window.step === 'function') window.__step = window.step, window.step = () => {};
    /* ⚑ 32회차 함정 — 세팅으로 재화를 넣는 것 자체가 `fxWatch` 의 «증가» 로 잡혀 **세팅 연출이
       트리거 연출과 겹친다**(첫 시험에서 씬 C 프레임마다 비행 코인 16개 + 골드 카운터가 0→112A 로
       굴러 강화 연출을 통째로 덮었다). 스냅샷 `fxSeen` 을 같은 프레임에 맞춰 «증가분 0» 으로 만든다. */
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      /* 퀘스트 5종이 전부 «받을 수 있다» 가 되게 카운터만 올린다(기준선 base 는 0 이 기본값). */
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true;
    if (typeof renderUI === 'function') renderUI();
  }, scene);

  if (scene === 'quest') {
    await p.evaluate(() => openQuest());
    await p.waitForTimeout(400);
  } else if (scene === 'upg') {
    await p.evaluate(() => openTrain());
    await p.waitForTimeout(400);
  } else {
    /* 씬 A 는 전투 화면 그대로다 — 적이 하나 이상 살아 있어야 «죽은 자리» 가 생긴다. */
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 })
      .catch(() => {});
  }

  /* ⚑ 32회차 함정 2 — 부팅 자체가 HUD 카운터를 굴리고 있다. 180(신규 유저 다이아 100만)이
     들어온 뒤로 새 세이브는 다이아 1,000,000 에서 시작하는데, 세팅이 그것을 4,200 으로 낮추면
     `fxRoll` 이 **낮추는 방향으로 계속 굴러** 트리거 시점에 «259,926» 같은 중간값이 찍힌다
     (첫 시험 gain-1). 트리거 전에 카운터가 두 번 연속 같은 값이 되고 연출 DOM 이 빌 때까지 기다린다. */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => {
      const g = document.getElementById('goldN'), d = document.getElementById('diaN');
      return (g ? g.textContent.trim() : '') + '|' + (d ? d.textContent.trim() : '')
        + '|' + document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length;
    });
    if (st === prev && st.endsWith('|0')) break;
    prev = st;
    await p.waitForTimeout(80);
  }
}

/* 트리거는 페이지 안에서 «한 프레임 안에» 끝나야 한다 — 시작 시각 t0 가 흐려지면 라벨이 거짓이 된다. */
const TRIGGERS = {
  /* 씬 A — 전투 발 골드 드랍.
     ⚑ 31회차 발견: 1~31회차 하네스는 `fxAt(p)` 로 **`combat` 태그를 안 줬다**. 그래서 게임이
     «전투 드랍»(개수 3~6 · 레이어 `#fxlc` = 팝업 아래)이 아니라 UI 발 경로(개수 8~16 · `#fxl`)로
     흘렸고, 30차 BA P6 «씬 A 만 발원 버스트가 없다» 의 진짜 원인이 그것이었다.
     → 여기서 실제 킬 경로와 **같은 두 줄**을 태운다. 32회차의 씬 A 는 «처음 보는 씬» 이다. */
  gain: () => {
    const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
    const p = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
    fxAt(p, 'combat');
    S.gold += 128000;
  },
  /* 씬 B — 퀘스트 «모두 받기». 수령 핸들러가 직접 fxCheck·fxBurst·fxAt·fxToast 를 건다. */
  quest: () => { const b = document.getElementById('qAll'); if (b) b.click(); },
  /* 씬 C — 23 훈련 카드 강화(공격력). pointerdown 이 trHoldStart → fxUpOk 를 태우고,
     곧바로 pointerup 을 줘 «꾹 누르기» 반복이 캡처에 섞이지 않게 한다. */
  upg: () => {
    const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
    if (!c) return;
    c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  },
};

async function shot(scene, T, idx, seed) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  /* 표본마다 실행이 달라지면 퍼짐 끝점 난수가 달라져 «연속 프레임» 이 튀어 보인다 → 시드 고정.
     세이브도 같이 비운다(31회차 교훈 2 — 표본마다 새로 여는 방식에만 있는 함정). */
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    /* ⚑ 36회차 — 얼리기 ③(타이머)의 전제. `window.setTimeout` 을 **얼릴 때** 덮어써 봐야
       그때 이미 예약돼 있는 타이머는 그대로 터진다(연출 노드 제거는 전부 스폰 시점에 예약된다).
       → 처음부터 감싸서 id 를 모아 두고, 얼릴 때 **전부 취소**한다. 거동은 안 바뀐다(원본 호출). */
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await setupScene(p, scene);

  /* ⚑ 38회차 — 37차 «반증 2» 의 처방(넘긴 것 3번). 이 하네스는 **프레임마다 페이지를 새로 연다**
     (31회차가 «낡은 합성» 을 없애려고 고른 방식). 그래서 «첫 도착» 처럼 실행마다 몇 ms 씩 흔들리는
     사건은 프레임 열에서 **깜빡임**으로 찍힌다 — f8 은 태어난 지 오래인 판, f9 는 막 태어난 판
     (opacity 0), f10 은 40ms 된 판이 되는 식이다. 37차 두 비평가(Z[4]·AA[4])가 그 그림을
     «+n 플로터가 1프레임 깜빡이고 26px 순간이동한다» 로 **독립적으로 같이** 잡았는데, 게임에는
     없는 결함이었다(MutationObserver 로 훑으니 `.fx-plus` 는 1개가 314ms 에 나서 1192ms 에 진다).
     얼리기 세 겹은 «한 판 안의 시간» 만 고정했고 «판과 판 사이» 는 여전히 안 맞는다.
     → 판 사이를 맞출 수는 없지만(페이지가 다르다) **비평가가 알 수는 있게** 한다: 연출 노드마다
       태어난 시각을 찍어 두고 정답표에 «나이(ms)» 열을 남긴다. 같은 종류의 노드가 프레임 열에서
       나이가 **거꾸로 가거나 리셋되면** 그 프레임은 판이 다른 것이지 게임이 깜빡인 것이 아니다.
     ⚠ 전역 MutationObserver 는 쓰지 않는다 — 게임의 재렌더마다 콜백이 돌아 우리가 재려는 타이밍을
       흔든다. 연출 레이어 두 개의 `appendChild` 만 감싼다(연출 노드는 전부 이 둘로 들어간다). */
  await p.evaluate(() => {
    for (const id of ['fxl', 'fxlc']) {
      const L = document.getElementById(id);
      if (!L || L.__capBorn) continue;
      L.__capBorn = true;
      const _ac = L.appendChild.bind(L);
      L.appendChild = (n) => {
        try { if (n && n.nodeType === 1) n.dataset.born = String(Math.round(performance.now())); } catch (e) {}
        return _ac(n);
      };
    }
  });

  const info = await p.evaluate(async ({ T, trg }) => {
    // eslint-disable-next-line no-new-func
    const fire = new Function('return (' + trg + ')')();
    const t0 = performance.now();
    fire();
    await new Promise((res) => {
      const f = () => { if (performance.now() - t0 >= T) return res(); requestAnimationFrame(f); };
      if (T <= 0) return res();
      requestAnimationFrame(f);
    });
    const at = performance.now() - t0;
    /* ★ 얼리기는 **세 겹**이다 (36회차에 한 겹을 더 찾았다).
       ① rAF — 게임 루프·`fxTick` 이 좌표를 옮긴다.
       ② CSS 애니메이션 — 컴포지터가 돌리므로 rAF 를 죽여도 흐른다(31회차).
       ③ **타이머** — 연출 노드는 `setTimeout(() => el.remove(), …)` 로 사라진다(index.html
          ~28887·28990·29002·29129·29167·29342·29577). ①②만 세우면 노드가 **계속 지워진다**:
          스크린샷은 얼린 뒤 300~600ms 뒤에 찍히므로 그림에는 «그 시각에 있던 불꽃·코인» 이
          없다. 32~35회차 정답표가 «불꽃 6» 이라고 적은 프레임의 그림에 불꽃이 0개인 것이
          이것이다(36회차 실측: 얼린 뒤 160ms 만에 불꽃 6→0 · 비행 6→5). 34차 BE 가 «표가
          픽셀보다 한 프레임 지연» 으로 남긴 자리의 정체이기도 하다 — 어긋난 쪽은 표가 아니라
          **그림**이었다. */
    window.requestAnimationFrame = () => 0;
    try { document.getAnimations().forEach((a) => a.pause()); } catch (e) {}
    let killed = 0;
    try {
      const ids = window.__capIds;
      if (ids) {
        ids.t.forEach((id) => { clearTimeout(id); killed++; });
        ids.i.forEach((id) => { clearInterval(id); killed++; });
      }
    } catch (e) {}
    window.setTimeout = () => 0;
    window.setInterval = () => 0;
    /* 38회차 — 얼린 «그 순간» 의 시각을 남긴다. 나이 = 얼린 시각 − 태어난 시각(위 appendChild). */
    window.__frz = performance.now();
    return { at: Math.round(at), killed };
  }, { T, trg: TRIGGERS[scene].toString() });

  /* ⚑ 36회차 — **정답표는 얼린 «직후» 가 아니라 «가라앉은 뒤» 에 읽는다.**
     34차 비평가 BE 가 «씬 gain 골드 열이 픽셀 판독보다 한 프레임 지연돼 보인다(f8 표 128 vs
     픽셀 157)» 로 남긴 것의 정체다: `requestAnimationFrame` 을 덮어써도 **이미 예약된 콜백
     한 번**은 그대로 돈다. 그 프레임이 `drawHud()` 를 한 번 더 불러 DOM 카운터를 굴리는데,
     census 는 그 앞에서 읽고 스크린샷은 그 뒤에 찍히므로 «표 < 그림» 이 된다.
     → 얼린 뒤 잠깐 두었다가 census 를 하고, **두 번 읽어 같은지 확인**한다(다르면 표에 ⚠ 를
       남긴다 — 조용히 틀린 표를 비평가에게 주는 것이 이 하네스의 가장 나쁜 실패다). */
  /* ⚑ 41회차 — **표는 «있는 노드» 가 아니라 «보이는 노드» 를 세야 한다.**
     40차 두 비평가(AB·AC)가 독립적으로 «표에는 있는데 그림에 없는» 프레임 표를 만들었다. 41회차가
     `tools/p58au.js` 로 재니 원인의 절반은 게임(제거 시각이 애니 길이와 따로 적힌 상수 — index.html
     `fxBye` 로 닫았다)이고, **나머지 절반은 이 하네스**다: `querySelectorAll` 은 `opacity:0` 인 노드도
     세므로, 퇴장 페이드의 마지막 한 뼘과 타이머 지연(이 컨테이너는 setTimeout 이 20~40ms 늦게 터진다)이
     전부 «표에만 있는 것» 으로 찍힌다. 얼리기가 타이머를 **취소**하므로 그 지연분은 영영 안 지워진다.
     → census 를 불투명도로 거른다. `p58au` 와 같은 임계(0.06 — 8비트로 1~2 계조)를 쓴다.
     ⚠ 이것은 «표를 그림에 맞추는» 것이지 결함을 감추는 것이 아니다. 게임 쪽 수명은 41회차가 따로
       줄였고(뒷꼬리 `fx-plus` 486 → 23~119ms · `fx-check` 154 → 34 · `fx-flash` 138 → 30),
       그래도 남는 «보이지 않는 꼬리» 를 표가 «있다» 고 적으면 비평가가 없는 결함을 보고한다. */
  const census = () => p.evaluate(() => {
    /* ⚑ 41회차 — **얼리기 네 겹째.** 얼릴 때 `getAnimations().pause()` 는 «그 순간 존재하던» 것만
       세운다. rAF 를 덮어써도 **이미 예약된 콜백 한 번**은 그대로 도는데(36회차 주석), 그 한 프레임이
       `fxTick` 의 착지 경로를 태워 `.fx-land2` 를 붙이면 **얼린 뒤에 태어난 애니메이션**이 생긴다 —
       세워지지 않았으므로 census 두 번 사이에 불투명도가 변하고(«⚠ 흔들림»), 스크린샷은 그보다 더
       진행한 그림을 찍는다. 41회차가 census 를 불투명도로 거르자마자 이것이 gain 3개 프레임에서
       드러났다(종전에는 개수만 세어 안 보였다). → census 할 때마다 한 번 더 세운다. */
    try { document.getAnimations().forEach((a) => a.pause()); } catch (e) {}
    const g = document.getElementById('goldN'), d = document.getElementById('diaN');
    const VIS = 0.06;
    /* ⚑ 42회차 — 41차 **BG 단독**: 41회차가 넣은 불투명도 임계는 «투명» 만 걸렀지 **«자국 없음»** 은
       못 거른다. BG 가 `gain-10`(374ms)에서 잡았다 — 표 «비행 5» 인데 그림에는 이동 코인이 0개.
       원인은 **착지 축소**다: `fxTick` 이 도착 직후 `scale(.18)` 로 오므리므로 46px 아이콘이 ≈8px 이
       되고, 그 자리는 이미 목적지 알약 아이콘이 덮고 있어 **불투명도는 1 인데 화면에 자국이 없다**.
       → 임계에 **렌더 크기 하한**을 더한다(bbox 최소변 ≥ MINPX). 41회차 «유령» 열과 같은 원칙으로,
         이 사유로 걸러진 개수는 «축소» 열에 따로 남긴다 — **거른 것은 반드시 보이게 적는다.**
       ⚠ 값의 근거: 착지 스케일 0.18 × fs46 ≈ 8px 은 걸러야 하고, 도착 크기 `FX3_LAND` 0.50 ×
         46 ≈ 23px 은 남아야 한다. 그 사이에서 «알약 아이콘(≈55px) 위에 얹혀 안 읽히는» 쪽에
         가깝게 12px 로 잡는다(BG 처방문의 값 그대로).
       ⚠ r42 정답표는 이 하한이 들어가기 **전에** 찍힌 것이라 «축소» 열이 없다. r43 부터 붙는다. */
    const MINPX = 12;
    const big = (n) => { try { const r = n.getBoundingClientRect();
      return Math.min(r.width, r.height) >= MINPX; } catch (e) { return false; } };
    const vis0 = (n) => {
      try {
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (parseFloat(cs.opacity) < VIS) return false;
        const r = n.getBoundingClientRect();
        return !(r.right <= 0 || r.bottom <= 0 || r.left >= 1080 || r.top >= 2280);
      } catch (e) { return false; }
    };
    const vis = (n) => vis0(n) && big(n);
    const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
    return {
      gold: g ? g.textContent.trim() : '',
      dia: d ? d.textContent.trim() : '',
      fly: q('.fx-fly').length,
      flyUp: q('#fxl .fx-fly').length,
      flyLo: q('#fxlc .fx-fly').length,
      plus: q('.fx-plus').length,
      burst: q('.fx-spark').length,
      flash: q('.fx-flash').length,
      check: q('.fx-check').length,
      toast: q('.fx-toast').length,
      /* 41회차 — «표에만 있는» 노드가 몇 개였는지도 남긴다. 0 이 아니면 그만큼이 안 보이는 꼬리다. */
      ghost: ['.fx-fly', '.fx-plus', '.fx-spark', '.fx-flash', '.fx-check', '.fx-toast']
        .reduce((k, sel) => k + ([...document.querySelectorAll(sel)].filter((n) => !vis0(n)).length), 0),
      /* 42회차 — «불투명하지만 렌더가 12px 미만이라 화면에 자국이 없는» 노드 수(BG 단독) */
      tiny: ['.fx-fly', '.fx-plus', '.fx-spark', '.fx-flash', '.fx-check', '.fx-toast']
        .reduce((k, sel) => k + ([...document.querySelectorAll(sel)].filter((n) => vis0(n) && !big(n)).length), 0),
      /* 38회차 — «나이(ms)» = 얼린 시각 − 태어난 시각. 판(페이지)마다 사건 시각이 몇 ms 흔들리는데,
         나이를 같이 주면 비평가가 «이 프레임은 판이 달라서 어린 것» 과 «게임이 깜빡인 것» 을 가른다. */
      age: (() => {
        const f = window.__frz || performance.now();
        const g = (sel) => q(sel)                       /* 41회차 — 나이도 «보이는» 노드만 */
          .map((n) => (n.dataset && n.dataset.born ? Math.round(f - +n.dataset.born) : null))
          .filter((v) => v != null).sort((a, b) => b - a);
        return { fly: g('.fx-fly'), plus: g('.fx-plus'), spark: g('.fx-spark'),
          check: g('.fx-check'), toast: g('.fx-toast'), flash: g('.fx-flash') };
      })(),
    };
  });
  await p.waitForTimeout(40);
  const c1 = await census();
  await p.waitForTimeout(120);
  const c2 = await census();
  const drift = JSON.stringify(c1) !== JSON.stringify(c2);

  const file = path.join(OUT, `58-${ROUND}-${scene}-${idx}.jpg`);
  await p.screenshot({ path: file, type: 'jpeg', quality: 82 });
  await b.close();
  return { ...info, ...c2, drift, T, idx, errs: errs.length, file: path.basename(file) };
}

(async () => {
  const rows = [];
  for (const scene of WANT) {
    const sc = SCENES[scene];
    if (!sc) { console.log('[!] 알 수 없는 씬:', scene); continue; }
    for (let i = 0; i < sc.stops.length; i++) {
      const r = await shot(scene, sc.stops[i], i + 1, 20260827);
      rows.push({ scene, ...r });
      console.log(`${scene}-${r.idx}  목표 ${String(r.T).padStart(4)}ms  실제 ${String(r.at).padStart(4)}ms  `
        + `비행 ${r.fly}(위 ${r.flyUp}/아래 ${r.flyLo})  +n ${r.plus}  버스트 ${r.burst}  `
        + `불꽃 ${r.burst}  플래시 ${r.flash}  체크 ${r.check}  골드 ${r.gold}  다이아 ${r.dia}` + (r.errs ? `  ⚠콘솔에러 ${r.errs}` : ''));
    }
  }
  /* 정답표 — 비평가가 «화면의 값» 과 대조할 수 있게 프레임별 상태를 남긴다. */
  let md = `# 58 ${ROUND} 캡처 정답표 (cap58b.js — 강제 합성)\n\n`
    + `표본마다 페이지를 새로 열고 목표 시각까지 rAF 로 진행시킨 뒤 **rAF + CSS 애니메이션을 둘 다 얼리고** 찍었다.\n`
    + `«실제» 는 얼린 시각이며 목표와의 차이가 그 프레임 라벨의 오차다.\n\n`
    + `36회차 — 얼리기가 **세 겹**(rAF · CSS 애니메이션 · **타이머**)이 됐다. 종전 두 겹은 \`setTimeout\` 으로 도는\n`
    + `연출 노드 제거를 못 막아, 얼린 뒤 스크린샷까지의 300~600ms 동안 불꽃·코인이 계속 사라졌다(그림 < 표).\n`
    + `«얼림» 열은 얼린 뒤 40ms·160ms 두 번 읽은 census 가 같았는지다 — «고정» 이어야 표와 그림이 같은 순간이다.\n\n`
    + `**41회차 — 이 표의 개수는 «DOM 에 있는 노드» 가 아니라 «보이는 노드»(불투명도 ≥ 0.06 · 화면 안) 다.**\n`
    + `40차 두 비평가가 «표에는 있는데 그림에 없다» 를 2인 공통으로 낸 자리를 닫은 것이다 — 퇴장 페이드의\n`
    + `마지막 한 뼘과 타이머 지연이 종전 표에서는 «있다» 로 찍혔다. «유령» 열이 그 차이(= 안 보이는데 DOM 에\n`
    + `있는 노드 수)이며, 0 이 아니어도 **그림이 맞다** — 표를 그림에 맞춘 것이지 결함을 감춘 것이 아니다.\n\n`
    + `**42회차 — 여기에 «렌더 크기 하한»(bbox 최소변 ≥ 12px)이 더해졌다.** 41차 BG 가 잡은 자리다:\n`
    + `착지 직후 \`scale(.18)\` 로 오므린 코인은 **불투명도가 1 인데 화면에 자국이 없다**(≈8px 이 목적지\n`
    + `알약 아이콘 밑에 깔린다). 그렇게 걸러진 개수는 «축소» 열에 남는다 — 유령 열과 같은 원칙이다.\n\n`;
  for (const scene of WANT) {
    const rs = rows.filter(r => r.scene === scene);
    if (!rs.length) continue;
    md += `## 씬 ${scene}\n\n| 프레임 | 목표 | 실제 | 비행(위/아래) | +n | 불꽃 | 플래시 | 체크 | 토스트 | 골드 | 다이아 | 얼림 | 유령 | 축소 | 나이(ms) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
    rs.forEach(r => {
      /* 38회차 — «나이» 열. 종류마다 «가장 늙은 노드» 하나만 적는다(전부 적으면 표가 안 읽힌다). */
      const a = r.age || {};
      const ag = ['fly', 'plus', 'spark', 'check', 'toast'].map((k) => (a[k] && a[k].length ? k + ' ' + a[k][0] : null))
        .filter(Boolean).join(' · ') || '—';
      md += `| ${r.idx} | ${r.T} | ${r.at} | ${r.fly} (${r.flyUp}/${r.flyLo}) | ${r.plus} | ${r.burst} | ${r.flash} | ${r.check} | ${r.toast} | ${r.gold} | ${r.dia} | ${r.drift ? '⚠ 흔들림' : '고정'} | ${r.ghost || 0} | ${r.tiny || 0} | ${ag} |\n`;
    });
    md += '\n';
  }
  fs.writeFileSync(path.join(OUT, `58-${ROUND}-정답표.md`), md);
  const bad = rows.filter(r => Math.abs(r.at - r.T) > 40);
  console.log(`\n표본 ${rows.length}장 · 라벨 오차 40ms 초과 ${bad.length}장 · 콘솔 에러 ${rows.reduce((a, r) => a + r.errs, 0)}건`);
  console.log('정답표: docs/review/58-' + ROUND + '-정답표.md');
})();
