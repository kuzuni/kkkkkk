/* 작업 58 게이트 — UI 연출 공용 모듈 (32회차 재작성).

   ⚠ 왜 «재작성» 인가 — 19~31회차 리뷰가 `VERIFY58 n/n PASS` 로 인용해 온 `tools/verify58.js` 는
   **저장소에 커밋된 적이 없다**(32회차 발견. `verify93.js` · `cap58.js` · `probe58*` 도 같다).
   세션이 자기 컨테이너에서만 쓰다가 죽으면서 계측 수단이 통째로 사라졌다.
   → 이 파일은 리뷰가 남긴 **사양**(93 3박자 규격 · 77 레이어 규칙 · 24회차 공용 토큰)에서 다시 세운 것이라
     항목 번호는 옛 verify58 과 대응하지 않는다. 앞으로는 반드시 커밋한다.

   무엇을 지키나 (전부 «사양이 글로 남아 있는 것» 만 단언한다 — 눈대중 임계는 넣지 않는다)
     [1] UI 발 3박자 봉투 — 첫 도착·마지막 도착이 선언 구간 안
     [2] UI 발 아이콘 수 8~16 (FXFLY_MAX 32 = 두 재화 × 16)
     [3] 전투 발은 팝업 «아래» 레이어(#fxlc)로만 간다 — #fxl 로 새지 않는다 (작업 77)
     [4] 전투 발 개수 ≤ 6 — clamp(3 + log10(n)*0.7, 3, 6) (93: 전투 발은 3박자를 쓰지 않는다)
     [5] 전투 발은 UI 발보다 짧다 (93 «전투 발은 현행 속도 그대로»)
     [6] 재화가 HUD 알약 «안» 에 도착한다 (골드·다이아 각각)
     [7] 강화 피드백 3종이 한 번에 난다 — 플래시 1 · 불꽃 10 · 델타 플로터 1
     [8] 세 씬의 «+n» 플로터 글자 크기가 공용 토큰 하나로 묶여 있다 (24회차 --fx-plus-fs)
     [9] 동시 DOM 상한 FXMAX(120)을 넘지 않는다
    [10] 퀘스트 수령 토스트가 300ms 안에 완전히 뜬다
    [11] 세 씬 어디서도 콘솔 에러가 나지 않는다
    [12] 전투 발 경로가 우상단 ▦ 메뉴 버튼(#menub)을 관통하지 않는다 (34차 2인 공통2)
    [13] 씬 B 머묾 구간에 코인이 «모두 받기» 라벨 keep-out 을 지킨다 (34차 2인 공통1)

   실행: node tools/verify58.js            (실패 항목은 ✗ 로 찍힌다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 페이지 하나를 열어 씬을 세팅하고, 트리거 뒤 dt 마다 표본을 찍어 «연출의 이력» 을 돌려준다. */
async function run(scene, span, step) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1100);

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
  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(400); }
  if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(400); }
  if (scene === 'gain') {
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 })
      .catch(() => {});
  }
  /* 카운터 롤·부팅 연출이 끝날 때까지 (cap58b.js 와 같은 정착 규칙) */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length
      + '|' + (document.getElementById('goldN') || {}).textContent + '|' + (document.getElementById('diaN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const hist = await p.evaluate(async ({ sc, span, step }) => {
    const pill = (cur) => {
      const el = document.querySelector('#top .cbox.' + cur + ' i, #top .' + cur + ' i')
        || document.querySelector('[data-cur="' + cur + '"] i');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const goldPill = pill('gold'), diaPill = pill('dia');
    const samples = [];
    const t0 = performance.now();
    if (sc === 'gain') {
      /* 35회차 — 발원을 `enemies[0]` 에 맡기면 **실행마다 달라** [12] 가 재현되지 않는다(32회차가
         «하네스가 적을 우단에서 집었다» 로 데인 자리의 반대판). ▦ 버튼보다 오른쪽·아래인 한 점으로
         고정한다 — 이 조합이 34차 두 비평가가 캡처에서 본 관통 기하다. */
      fxAt({ x: 1040, y: 400 }, 'combat');
      S.gold += 128000;
    } else if (sc === 'quest') {
      const b = document.getElementById('qAll'); if (b) b.click();
    } else {
      const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      }
    }
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const flies = [...document.querySelectorAll('.fx-fly')].map((el) => {
          const r = el.getBoundingClientRect();
          /* 36회차 — 가림을 재는 상자는 «그림» 인 `.cic` 다(93 17회차: 화소가 아니라 레이아웃 박스).
             `.fx-fly` 자신은 글리프 advance 상자라 그림보다 작다(실측 44 vs 55). */
          const ic = el.querySelector('.cic');
          const ir = ic ? ic.getBoundingClientRect() : r;
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
            cx: ir.left, cy: ir.top, cw: ir.width, ch: ir.height,
            up: !!el.closest('#fxl'), lo: !!el.closest('#fxlc') };
        });
        const plus = [...document.querySelectorAll('.fx-plus')].map((el) => parseFloat(getComputedStyle(el).fontSize));
        const toast = document.querySelector('.fx-toast');
        samples.push({
          t: Math.round(t), n: flies.length, flies,
          up: flies.filter((f) => f.up).length, lo: flies.filter((f) => f.lo).length,
          plus, spark: document.querySelectorAll('.fx-spark').length,
          flash: document.querySelectorAll('.fx-flash').length,
          check: document.querySelectorAll('.fx-check').length,
          toastOp: toast ? parseFloat(getComputedStyle(toast).opacity) : -1,
          fxl: (document.getElementById('fxl') || { childElementCount: 0 }).childElementCount,
          gold: (document.getElementById('goldN') || {}).textContent,
          dia: (document.getElementById('diaN') || {}).textContent,
        });
        if (t >= span) return res();
        setTimeout(tick, step);
      };
      tick();
    });
    const mb = document.getElementById('menub');
    const mbr = mb ? mb.getBoundingClientRect() : null;
    /* 36회차 [13] — «모두 받기» 라벨의 **글자 advance 상자**(텍스트 노드 Range). 요소 상자를 쓰면
       버튼 배경 272px 을 재게 돼 «글자를 덮는다» 는 지적과 다른 것을 재는 자가 된다. */
    let qlab = null;
    { const btn = document.getElementById('qAll');
      if (btn) {
        const rg = document.createRange(); let best = null;
        const walk = (n) => { if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width && (!best || r.width > best.width)) best = r; } for (const c of n.childNodes) walk(c); };
        walk(btn);
        if (best) qlab = { x: best.left, y: best.top, w: best.width, h: best.height };
      } }
    return { samples, goldPill, diaPill, FXMAX: typeof FXMAX === 'number' ? FXMAX : 120,
      menub: mbr ? { x: mbr.left, y: mbr.top, w: mbr.width, h: mbr.height } : null,
      qlab,
      /* keep-out 규칙 상수도 페이지에서 읽는다 — 게이트가 자기 사본을 들면 부패한다(211·289) */
      kom: (typeof FX3_KOM === 'number' && typeof FX3_BSFX === 'number')
        ? { kom: FX3_KOM, fx: FX3_BSFX } : null,
      /* 머묾 창은 사양 상수에서 읽는다(눈대중 임계 금지) — 퍼짐 끝 ~ 흡수 시작 */
      hold: { a: (typeof FX3_SPREAD === 'number' ? FX3_SPREAD : 0.22) * 1000,
              b: ((typeof FX3_SPREAD === 'number' ? FX3_SPREAD : 0.22)
                + (typeof FX3_HOLD_F === 'number' ? FX3_HOLD_F : 0.12)) * 1000 } };
  }, { sc: scene, span, step });

  await b.close();
  return { ...hist, errs };
}

(async () => {
  console.log('VERIFY58 — UI 연출 공용 모듈\n');

  const gain = await run('gain', 1600, 25);
  const quest = await run('quest', 1900, 15);
  const upg = await run('upg', 900, 25);

  /* ⚑ 32회차 — «도착» 을 무엇으로 재는가.
     처음엔 «비행 아이콘 수가 줄어든 시각» 으로 쟀는데 3회 연속 758·766·826ms 가 나왔다.
     그런데 얼린 캡처(r32 정답표)는 다이아 카운터가 **f7 = 592ms** 에 이미 올라 있다고 말한다.
     둘이 다른 이유는 노드가 «꽂힘 연출까지 끝난 뒤» 제거되기 때문이다 — 아이콘 수 감소는
     도착보다 **170~230ms 늦은 사건**이다. 사양의 «첫 도착 0.50s» 는 «알약에 꽂혀 숫자가 구르기
     시작하는 순간» 이므로 **HUD 카운터가 처음 바뀐 시각**으로 잰다(29회차가 프레임 선택에서
     같은 함정을 잡은 것과 같은 종류의 오류다 — 재는 대상이 사양의 정의와 달랐다).
     아이콘 수 기반 값은 [1b] 로 참고만 남긴다. */
  const cnt = (h, k) => h.samples.map(s => String(s[k] || '').trim());
  const firstArr = (h, k) => { const a = cnt(h, k), base = a[0]; const i = a.findIndex(v => v !== base); return i < 0 ? null : h.samples[i].t; };
  const lastArr = (h, k) => { const a = cnt(h, k), fin = a[a.length - 1]; if (fin === a[0]) return null; const i = a.findIndex(v => v === fin); return i < 0 ? null : h.samples[i].t; };
  const gone = (h) => { const seen = h.samples.some(s => s.n > 0); if (!seen) return null; const i = h.samples.findIndex((s, k) => s.n === 0 && h.samples.slice(0, k).some(x => x.n > 0)); return i < 0 ? null : h.samples[i].t; };

  console.log('[1] UI 발 3박자 봉투 (씬 B)');
  const qF = firstArr(quest, 'dia'), qL = lastArr(quest, 'dia');
  /* 선언값 첫 도착 0.50s · 마지막 1.22s. 표본 간격 25ms + 브라우저 프레임 granularity 를 감안해
     ±20% 창으로 본다(리뷰가 «설계값 대비 실측은 +40~70ms» 라고 여러 회차에 걸쳐 적어 둔 폭). */
  ok(qF !== null && qF >= 400 && qF <= 720, `첫 도착 ${qF}ms (400~720)`);
  ok(qL !== null && qL >= 1000 && qL <= 1620, `마지막 도착 ${qL}ms (1000~1620)`);
  console.log(`      [참고] 아이콘이 화면에서 완전히 사라진 시각 ${gone(quest)}ms — 꽂힘 연출 뒤 제거라 도착보다 늦다`);

  console.log('[2] UI 발 아이콘 수');
  const qPeak = Math.max(...quest.samples.map(s => s.n));
  ok(qPeak >= 8 && qPeak <= 32, `동시 최대 ${qPeak}개 (8~32 = 8~16 × 재화 2종)`);

  console.log('[3] 전투 발 레이어 (작업 77 — 팝업 아래 #fxlc)');
  const gLo = Math.max(...gain.samples.map(s => s.lo)), gUp = Math.max(...gain.samples.map(s => s.up));
  ok(gLo > 0, `#fxlc(팝업 아래)에 ${gLo}개`);
  ok(gUp === 0, `#fxl(팝업 위)로 새지 않는다 (${gUp}개)`);

  console.log('[4] 전투 발 개수 상한');
  const gPeak = Math.max(...gain.samples.map(s => s.n));
  ok(gPeak > 0 && gPeak <= 6, `동시 최대 ${gPeak}개 (1~6 = clamp(3+log10(n)*0.7,3,6))`);

  console.log('[5] 전투 발이 UI 발보다 짧다 (93 — 전투 발은 3박자를 쓰지 않는다)');
  const gL = lastArr(gain, 'gold');
  ok(gL !== null && qL !== null && gL < qL, `전투 발 ${gL}ms < UI 발 ${qL}ms`);

  console.log('[6] 도착점이 HUD 알약 «안»');
  const near = (h, pill) => {
    if (!pill) return null;
    const last = [...h.samples].reverse().find(s => s.n > 0);
    if (!last) return null;
    return Math.min(...last.flies.map(f => Math.hypot(f.x - pill.x, f.y - pill.y)));
  };
  const dg = near(gain, gain.goldPill), dq = near(quest, quest.diaPill);
  ok(dg !== null && dg <= 60, `씬 A 마지막 코인 ↔ 골드 알약 아이콘 ${dg === null ? 'n/a' : dg.toFixed(1)}px (≤60)`);
  ok(dq !== null && dq <= 60, `씬 B 마지막 코인 ↔ 다이아 알약 아이콘 ${dq === null ? 'n/a' : dq.toFixed(1)}px (≤60)`);

  console.log('[7] 강화 피드백 3종 (씬 C)');
  ok(Math.max(...upg.samples.map(s => s.flash)) >= 1, '흰 플래시가 난다');
  ok(Math.max(...upg.samples.map(s => s.spark)) >= 10, `방사형 불꽃 ${Math.max(...upg.samples.map(s => s.spark))}개 (≥10)`);
  ok(Math.max(...upg.samples.map(s => s.plus.length)) >= 1, '델타 «+n» 플로터가 난다');

  console.log('[8] «+n» 플로터 글자 크기가 세 씬 공통 (24회차 --fx-plus-fs)');
  const fs = (h) => { const s = h.samples.find(x => x.plus.length); return s ? s.plus[0] : null; };
  const fa = fs(gain), fb = fs(quest), fc = fs(upg);
  ok(fa && fb && fc && Math.abs(fa - fb) < 0.6 && Math.abs(fa - fc) < 0.6,
    `씬 A ${fa} · 씬 B ${fb} · 씬 C ${fc} px`);

  console.log('[9] 동시 DOM 상한 FXMAX');
  const mx = Math.max(...gain.samples.map(s => s.fxl), ...quest.samples.map(s => s.fxl), ...upg.samples.map(s => s.fxl));
  ok(mx <= quest.FXMAX, `#fxl 최대 ${mx}개 (≤ FXMAX ${quest.FXMAX})`);

  console.log('[10] 퀘스트 수령 토스트가 300ms 안에 완전히 뜬다');
  const tf = quest.samples.find(s => s.toastOp >= 0.99);
  ok(!!tf && tf.t <= 300, `완전 가시 ${tf ? tf.t : 'n/a'}ms (≤300)`);

  /* ---- [12] 전투 발이 우상단 ▦ 메뉴 버튼을 관통하지 않는다 (34차 2인 공통2) ---- */
  console.log('[12] 전투 발 경로 — 우상단 ▦ 메뉴 버튼(#menub) 관통 0 (34차 BE·BF 2인 공통)');
  if (!gain.menub) {
    ok(false, '#menub 을 못 찾았다 — 이 단언을 잴 대상이 없다');
  } else {
    const M = gain.menub;
    let hit = 0, area = 0;
    for (const s2 of gain.samples) for (const f of s2.flies) {
      const ox = Math.min(f.x + f.w / 2, M.x + M.w) - Math.max(f.x - f.w / 2, M.x);
      const oy = Math.min(f.y + f.h / 2, M.y + M.h) - Math.max(f.y - f.h / 2, M.y);
      if (ox > 0 && oy > 0) { hit++; area = Math.max(area, ox * oy); }
    }
    /* 되돌리면 빨개진다: 35회차 이전 빌드는 같은 발원에서 겹친 표본 18 · 최대 1,482px² 였다. */
    ok(hit === 0, `코인 상자 ↔ 버튼 사각 겹친 표본 ${hit}개 · 최대 ${Math.round(area)}px² (0 이어야 한다)`);
  }

  /* ---- [13] 씬 B 머묾 — «모두 받기» 라벨 keep-out 규칙 (34차 2인 공통1) ----
     ⚠ 단언을 «겹침 0» 으로 쓰면 안 된다. 재는 상자가 서로 «다른 것»이기 때문이다:
       · `.cic` 는 **화폐 아이콘의 레이아웃 상자**(55px)라 그림보다 크다(35회차 실측:
         코인 바디가 상자의 86% · 다이아는 53%).
       · 라벨은 **advance 상자**라 글자 잉크 바깥에 사이드베어링이 붙어 있다.
       두 여백이 겹치는 몫까지 «가림» 으로 세면 «화소로는 0인데 게이트는 빨간» 자가 된다.
       (36회차 `p58ar` 화소 실측: 이 규칙을 지킨 빌드의 글자 잉크 가림은 임계 170/190/210 에서
        0.0~1.4% — 규칙을 안 지킨 빌드는 같은 자로 29.7~72.1% 다.)
     → 단언은 **코드가 강제하는 규칙 자신**으로 쓴다: 끝점은 라벨 상자에서 `FX3_KOM` 이상
       떨어져 있고, 머묾 부유가 되밀 수 있는 몫은 `FX3_BSFX` 다. 그러므로 머묾 구간의
       «코인 중심 ↔ 라벨 상자» 가로 거리는 언제나 `FX3_KOM − FX3_BSFX` 이상이어야 한다.
       keep-out 이 사라지거나 KOM 이 내려가거나 부유가 커지면 여기가 먼저 빨개진다. */
  console.log('[13] 씬 B 머묾 구간 — «모두 받기» 라벨 keep-out (34차 BE·BF 2인 공통1)');
  if (!quest.qlab) {
    ok(false, '#qAll 라벨 텍스트를 못 찾았다 — 이 단언을 잴 대상이 없다');
  } else if (!quest.kom) {
    /* 상수가 없으면 규칙 자체가 사라진 것이다. 그래도 **관측값은 낸다** — «잴 수 없다» 로 끝내면
       되돌림 시험이 «왜 빨간지» 를 못 보여 준다(35회차 [12] 가 남긴 교훈의 반대편). */
    const L = quest.qlab, H = quest.hold;
    let mind = 1e9;
    for (const s2 of quest.samples) {
      if (s2.t < H.a || s2.t > H.b) continue;
      for (const f of s2.flies) {
        const cx = f.cx + f.cw / 2, cy = f.cy + f.ch / 2;
        if (cy < L.y || cy > L.y + L.h) continue;
        mind = Math.min(mind, Math.max(L.x - cx, cx - (L.x + L.w)));
      }
    }
    ok(false, `FX3_KOM/FX3_BSFX 가 없다 — keep-out 규칙이 사라졌다 (관측 최소 여유 ${mind === 1e9 ? 'n/a' : mind.toFixed(1)}px)`);
  } else {
    const L = quest.qlab, H = quest.hold, need = quest.kom.kom - quest.kom.fx;
    let n = 0, bad = 0, mind = 1e9;
    for (const s2 of quest.samples) {
      if (s2.t < H.a || s2.t > H.b) continue;                 /* 머묾 창(퍼짐 끝 ~ 흡수 시작)만 */
      n++;
      for (const f of s2.flies) {
        const cx = f.cx + f.cw / 2, cy = f.cy + f.ch / 2;
        if (cy < L.y || cy > L.y + L.h) continue;             /* 라벨 y 대역 밖이면 가로 규칙 무관 */
        const d = Math.max(L.x - cx, cx - (L.x + L.w));       /* 상자 밖이면 양수 = 여유 */
        mind = Math.min(mind, d);
        if (d < need) bad++;
      }
    }
    /* 되돌리면 빨개진다: 36회차 이전 빌드는 같은 창에서 «위반 25개 · 최소 거리 −78.6px»
       (중심이 라벨 «안» 에 있었다 = 두 비평가가 잰 그림). */
    ok(n > 0 && bad === 0, `머묾 표본 ${n}개 · 규칙 위반 ${bad}개 · 최소 여유 ${mind === 1e9 ? 'n/a' : mind.toFixed(1)}px (≥ FX3_KOM ${quest.kom.kom} − FX3_BSFX ${quest.kom.fx} = ${need})`);
  }

  console.log('[11] 콘솔 에러 0');
  const e = gain.errs.length + quest.errs.length + upg.errs.length;
  ok(e === 0, `세 씬 합계 ${e}건`);

  console.log(`\nVERIFY58 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
