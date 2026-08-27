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
    /* ★ 두 겹 얼리기 — rAF 를 죽이고, 컴포지터가 돌리는 CSS 애니메이션도 같이 세운다. */
    window.requestAnimationFrame = () => 0;
    try { document.getAnimations().forEach((a) => a.pause()); } catch (e) {}
    const g = document.getElementById('goldN'), d = document.getElementById('diaN');
    return {
      at: Math.round(at),
      gold: g ? g.textContent.trim() : '',
      dia: d ? d.textContent.trim() : '',
      fly: document.querySelectorAll('.fx-fly').length,
      flyUp: document.querySelectorAll('#fxl .fx-fly').length,
      flyLo: document.querySelectorAll('#fxlc .fx-fly').length,
      plus: document.querySelectorAll('.fx-plus').length,
      burst: document.querySelectorAll('.fx-spark').length,
      flash: document.querySelectorAll('.fx-flash').length,
      check: document.querySelectorAll('.fx-check').length,
      toast: document.querySelectorAll('.fx-toast').length,
    };
  }, { T, trg: TRIGGERS[scene].toString() });

  const file = path.join(OUT, `58-${ROUND}-${scene}-${idx}.jpg`);
  await p.screenshot({ path: file, type: 'jpeg', quality: 82 });
  await b.close();
  return { ...info, T, idx, errs: errs.length, file: path.basename(file) };
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
    + `«실제» 는 얼린 시각이며 목표와의 차이가 그 프레임 라벨의 오차다.\n\n`;
  for (const scene of WANT) {
    const rs = rows.filter(r => r.scene === scene);
    if (!rs.length) continue;
    md += `## 씬 ${scene}\n\n| 프레임 | 목표 | 실제 | 비행(위/아래) | +n | 불꽃 | 플래시 | 체크 | 토스트 | 골드 | 다이아 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
    rs.forEach(r => { md += `| ${r.idx} | ${r.T} | ${r.at} | ${r.fly} (${r.flyUp}/${r.flyLo}) | ${r.plus} | ${r.burst} | ${r.flash} | ${r.check} | ${r.toast} | ${r.gold} | ${r.dia} |\n`; });
    md += '\n';
  }
  fs.writeFileSync(path.join(OUT, `58-${ROUND}-정답표.md`), md);
  const bad = rows.filter(r => Math.abs(r.at - r.T) > 40);
  console.log(`\n표본 ${rows.length}장 · 라벨 오차 40ms 초과 ${bad.length}장 · 콘솔 에러 ${rows.reduce((a, r) => a + r.errs, 0)}건`);
  console.log('정답표: docs/review/58-' + ROUND + '-정답표.md');
})();
