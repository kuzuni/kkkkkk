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
     [7] 강화 피드백 3종이 한 번에 난다 — 플래시 1 · 알갱이 층 · **아이콘 버스트**
         (⚑ 732 — 종전 셋째 층 «델타 플로터» 는 659·660 이 폐지했다. 방향을 뒤집어 [7-b] «0장» 으로
          두고 [7-c] «그 자리를 재화 아이콘 버스트가 대신한다» 를 세웠다 — 333 «자리를 비우지 마라»)
     [8] «+n» 플로터 글자 크기가 공용 토큰 하나로 묶여 있다 (24회차 --fx-plus-fs)
         (⚑ 844 — 표본 셋째 자리를 **씬 D(코스튬 델타) → 씬 D(08 세부 [강화] 회당 플로터 `.fx-plus.hb`)**
          로 재이관. 520·814 가 코스튬 델타의 마지막 호출부를 걷어 그 표본이 영영 안 잡히게 됐다 —
          [8-c] «인라인 0장» · [8-d] «델타 계열 은퇴 파수꾼» 을 같이 세웠다)
     [9] 동시 DOM 상한 FXMAX(120)을 넘지 않는다
    [10] 퀘스트 수령 토스트가 300ms 안에 완전히 뜬다
    [11] 네 씬 어디서도 콘솔 에러가 나지 않는다 (732 — 씬 D 편입 · 844 — 씬 D 가 08 세부 [강화]로 바뀌었다)
    [12] 전투 발 경로가 우상단 ▦ 메뉴 버튼(#menub)을 관통하지 않는다 (34차 2인 공통2)
    [13] 씬 B 머묾 구간에 코인이 «모두 받기» 라벨 keep-out 을 지킨다 (34차 2인 공통1)
    [14] 씬 A 전투 발이 프레임 오른쪽으로 잘려 나가지 않는다 (36차 2인 공통)
    [15] 퀘스트 토스트가 «완전히 정지한 채» 오래 머물지 않는다 (36차 2인 공통F)
    [16] 딤 위 알약 복제판의 숫자가 원본과 어긋나지 않는다 (37차 2인 공통ㄱ)
    [17] 씬 A 전투 발이 우측 «상한» 에서 세로 기둥으로 뭉치지 않는다 (37차 2인 공통ㄴ)
    [18] 퀘스트 체크 도장이 «정지 뒤 하드컷» 이 아니다 (37차 2인 공통ㄹ)
    [19] 씬 A HUD 알약 «팝» 의 복귀가 한 프레임에 급락하지 않는다 (37차 2인 공통ㅁ)

   실행: node tools/verify58.js            (실패 항목은 ✗ 로 찍힌다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* ⚑ 732 — 소스를 갈아 끼울 수 있게 한다(`verify93` 의 `V93_SRC` 와 같은 손잡이).
   `verify732` 가 «결함을 주입한 사본» 을 물려 «그때 그 항이 실제로 빨개지는가» 를 묻는다(334 되돌림 시험).
   안 주면 종전과 한 값도 안 다르다. */
const URL = 'file://' + path.resolve(__dirname, '..', process.env.V58_SRC || 'index.html');
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
  /* ⚑ 36회차 — **씨앗을 고정한다.** 35회차가 [12] 에서 «발원을 `enemies[0]` 에 맡기면 실행마다
     달라 재현이 안 된다» 를 고쳤는데, 퍼짐 끝점은 여전히 `Math.random` 이라 같은 병이 남아 있었다:
     36회차 [14](프레임 잘림)를 처음 넣었을 때 **되돌림 시험이 «PASS» 로 나왔다** — 그 실행에서
     우연히 안 넘친 것이지 결함이 없어서가 아니다. 재현되지 않는 게이트는 게이트가 아니다.
     (`cap58b.js` 가 같은 이유로 표본마다 씨앗을 고정한다.) */
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, 20260828);
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
  /* ⚑⚑ 844 — 씬 D 를 **50 코스튬 [강화] → 08 세부 팝업 [강화] 의 회당 피드백**으로 옮겼다.
     732 가 이 자리를 코스튬으로 고른 근거는 «`fxDelta` 를 아직 쓰는 유일한 계열» 이었는데,
     그 뒤 **520·814(주인 지시 «코스튬쪽 +− 표시 없애셈»)가 그 마지막 호출부를 걷었다** ⇒
     `probe844` [2-c]: 텍스트를 넘기는 `fxUpOk` 호출부가 **0곳**(주석을 상태 기계로 걷어 센 값)이라
     델타는 제품에서 **도달 불가**다. 즉 [8-b] 는 «주인이 없애라고 한 것이 **있어야** 통과하는 자» 가
     돼 있었다 — 732 가 [7] 에서 닫은 것과 똑같은 자리·똑같은 얼굴이다(694 verify93 [7] 계열).
     ⚠ 표본을 그냥 두 씬으로 줄이지 않는다(333) — 살아 있는 셋째 계열 `.fx-plus.hb`(488 회당 피드백)로
       옮겼다. 이 계열이야말로 [8] 이 지키려는 그 사고의 현장이다: 488 이 이 자리에만 크기를 손으로
       적었고 491 2회차가 공용 토큰으로 되돌렸다.
     ⚠ 표본은 **결과 줄기(`+1`)만** 이다 — 비용 줄기(`−n 조각`)는 150 규약(폭 클램프)이 인라인
       `font-size` 로 17~20px 까지 눌러 놓는다(`probe844` [4-b] 실측). 두 줄기를 섞으면 «무엇을
       쟀는지 모르는 자» 가 된다(A1 10~12회차 «계측 정의가 다르면 일치해도 틀린다»).
     ⚠ 델타 계열이 자에서 사라지는 것은 아니다 — 부품 자체는 `verify814` [E1]·[E2] 가 34px 로 못박고,
       «되살아나면 표본을 한 자리 더 넣으라» 는 신호는 아래 [8-d] 가 준다. */
  if (scene === 'beat') {
    await p.evaluate(() => {
      const it = SKILLS[0];
      S.own[it.id] = { n: 999999, l: 1 };      /* 조각을 채워 «누르면 오른다» 를 만든다(강화 자체는 제품 경로) */
      markDirty(); uiDirty = true;
      showSkillDetail(it.id);
    });
    await p.waitForTimeout(450);
  }
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
    let vk = 0;                              /* 38회차 [18] — 체크 도장에 «처음 본 순서» 표를 붙인다 */
    const t0 = performance.now();
    /* ⚑ 732 — «강화가 실제로 일어났나» 는 연출이 아니라 **판정**에서 읽는다(씬 C 골드 · 씬 D 강화 횟수).
       [7-b] «훈련 «+n» 0장» 의 전제가 이 값이다 — 없으면 «폐지됐다» 와 «씬이 안 났다» 가
       구별되지 않아, 종전 실패문의 모양 그대로 **헛초록**이 되살아난다(694 §R-d 가 같은 자리).
       ⚑ 844 — 씬 D 는 재화가 아니라 **시도 수**(`S.cnt.levelUps`)로 읽는다. 회당 피드백의 전제는
       «몇 번 눌렸나» 이고(488 «beat = 시도 수»), 계열마다 다른 재화를 쫓으면 자가 계열에 물린다. */
    const pay0 = sc === 'beat' ? S.cnt.levelUps : S.gold;
    if (sc === 'gain') {
      /* 35회차 — 발원을 `enemies[0]` 에 맡기면 **실행마다 달라** [12] 가 재현되지 않는다(32회차가
         «하네스가 적을 우단에서 집었다» 로 데인 자리의 반대판). ▦ 버튼보다 오른쪽·아래인 한 점으로
         고정한다 — 이 조합이 34차 두 비평가가 캡처에서 본 관통 기하다. */
      fxAt({ x: 1040, y: 400 }, 'combat');
      S.gold += 128000;
    } else if (sc === 'quest') {
      const b = document.getElementById('qAll'); if (b) b.click();
    } else if (sc === 'beat') {
      /* 844 — 08 세부 [강화]. 262 이후 이 버튼은 click 이 아니라 **pointerdown 홀드**다
         (`bindUpHold`) — click 으로 부르면 아무 일도 안 나 [8-a] 가 «씬이 안 났다» 로 빨개진다. */
      const b = document.getElementById('mLv');
      if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
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
          /* ⚑ 732 — 660 이 «숫자 플로터» 자리에 세운 **재화 아이콘 버스트**(`.fx-spark.fx-cic`).
             `.fx-spark` 총수만 세면 옛 앰버 불꽃과 구별이 안 돼 «660 이 통째로 사라져도 초록» 이다
             (694 [7-c] 가 verify93 에서 세운 양성항과 같은 뜻). 화폐 신원까지 같이 읽는다.
             ⚠ 씬 A·B 는 타이밍 축이 샘플러 부하에 물리므로(570) 거기서는 한 줄도 더 안 돈다. */
          cic: (sc === 'upg') ? document.querySelectorAll('.fx-spark.fx-cic').length : 0,
          cicCur: (sc === 'upg')
            ? [...new Set([...document.querySelectorAll('.fx-spark.fx-cic > img.cic')].map(i => i.dataset.curIc))] : [],
          /* ⚑ 844 — 씬 D 의 표본. **결과 줄기**(`.fx-plus.hb:not(.dn)`)만 크기를 신고하고,
             «크기를 손으로 적었는가» 는 인라인 `style.fontSize` 로 같이 읽는다(150 폭 클램프와
             «자기 자리에 적은 크기» 를 구별하는 유일한 축이다 — `probe844` [3-d]·[4-b]). */
          hb: (sc === 'beat')
            ? [...document.querySelectorAll('.fx-plus.hb:not(.dn)')].map((el) => ({
              fs: parseFloat(getComputedStyle(el).fontSize), inl: !!el.style.fontSize })) : [],
          /* ⚑ 583 — 강화 자리의 «알갱이» 는 이제 두 얼굴이다: 종전 방사형 불꽃(`.fx-spark`)과
             화폐 알갱이(`.fx-fly.fx-spd` — «무엇으로 샀는가»). 씬 C(훈련 강화)는 후자로 갈렸다. */
          spd: document.querySelectorAll('.fx-spd').length,
          spdCur: [...new Set([...document.querySelectorAll('.fx-spd img.cic')].map(i => i.dataset.curIc))],
          flash: document.querySelectorAll('.fx-flash').length,
          check: document.querySelectorAll('.fx-check').length,
          toastOp: toast ? parseFloat(getComputedStyle(toast).opacity) : -1,
          /* 37회차 [16] — 딤 위 알약 «복제판»(.fx-lit, 플레이어가 실제로 보는 것)의 숫자가
             원본(#diaN, 딤 아래)과 같은가. 두 비평가가 −38(도착 한 칸)로 독립 관측한 자리다. */
          lit: (() => { const o = document.getElementById('diaN');
            const c = document.querySelector('.fx-lit .cDia b');
            return (o && c) ? [o.textContent.trim(), c.textContent.trim()] : null; })(),
          /* 37회차 [15] — 토스트 «정지» 를 재려면 불투명도만으로는 안 된다. 상자 자체를 남긴다
             (36차 X 는 잉크 bbox, Y 는 화소로 같은 창을 짚었다 — 여기서는 레이아웃 상자로 잰다). */
          toastB: toast ? (() => { const r = toast.getBoundingClientRect();
            return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10,
              Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; })() : null,
          /* 38회차 [18] — 체크 도장도 토스트와 **같은 자**(레이아웃 상자)로 잰다. 두 비평가가
             «84×84 ±1px 로 285ms 정지 → 한 표본도 없이 소멸» 로 잡은 자리다. 불투명도만 재면
             퇴장이 «보이는» 것으로 잘못 통과한다(bbox 가 그대로면 플레이어에겐 하드컷이다).
             ⚠ 반드시 **한 도장**을 끝까지 따라가야 한다. 씬 B 는 퀘스트 5행이 각자 도장을 찍는데
               `querySelector('.fx-check')` 로 «첫 번째» 를 읽으면 앞 도장이 사라질 때마다 대상이
               **다른 버튼의 다른 크기 도장**으로 갈아타, 종전 빌드(크기 무변화)에서도 «상자가
               줄었다» 가 관측된다(첫 시도가 실제로 그렇게 통과했다). 처음 본 순서로 표를 붙인다. */
          checkB: (() => {
            for (const c of document.querySelectorAll('.fx-check')) if (!c.dataset.vk) c.dataset.vk = String(vk++);
            const c = document.querySelector('.fx-check[data-vk="0"]');
            if (!c) return null; const r = c.getBoundingClientRect();
            return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10,
              Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
              Math.round(parseFloat(getComputedStyle(c).opacity) * 1000) / 1000]; })(),
          /* 39회차 [19] — HUD 골드 알약의 «팝» 상자. 37차 Z[8]·AA[3] 이 «208ms 고원 뒤 복귀 11px 중
             9px 을 18ms 에» 로 잡은 자리다. 스케일은 상자 폭으로 읽는다(transform 이 반영된 rect). */
          pillB: (() => { const el = document.querySelector('.cbox.cGold');
            if (!el) return null; const r = el.getBoundingClientRect();
            return [Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100]; })(),
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
      /* 732 — [7-a]/[8] 전제. 씬 C 는 골드, 씬 D 는 강화석으로 «났다» 를 판정에서 읽는다. */
      paid: sc === 'beat' ? (S.cnt.levelUps - pay0) : (pay0 - S.gold),
      menub: mbr ? { x: mbr.left, y: mbr.top, w: mbr.width, h: mbr.height } : null,
      qlab,
      /* 37회차 [15] — 토스트 밑변이 물면 안 되는 것(«STAGE n» 헤더). 22회차가 토스트 자리를
         이 두 이웃 사이 82px 띠 안에 가둔 뒤로 여유가 8.5px 뿐이라, 부유를 넣으면 반드시 같이 잰다. */
      chap: (() => { const c = document.getElementById('chapN'); if (!c) return null;
        const r = c.getBoundingClientRect(); return { y: r.top }; })(),
      /* keep-out 규칙 상수도 페이지에서 읽는다 — 게이트가 자기 사본을 들면 부패한다(211·289) */
      kom: (typeof FX3_KOM === 'number' && typeof FX3_BSFX === 'number')
        ? { kom: FX3_KOM, fx: FX3_BSFX } : null,
      /* 38회차 [17] — 차선 규칙 상수도 같은 이유로 페이지에서 읽는다 */
      lane: (typeof FX3_MIND === 'number' && typeof FX3_MBM === 'number')
        ? { mind: FX3_MIND, mbm: FX3_MBM } : null,
      /* [14] — 프레임 사각(페이지 좌표). 잘림은 «프레임 밖» 이지 «뷰포트 밖» 이 아니다. */
      frame: (() => { const a = document.getElementById('app'); if (!a) return null;
        const r = a.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })(),
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

  /* ⚑ 36회차 — 씬 A 는 **8ms** 로 훑는다. [14](프레임 잘림)는 «한 프레임짜리» 사건이라
     25ms 간격에서는 표본 사이로 빠진다 — 씨앗을 고정한 뒤에도 되돌림 시험이 «PASS» 로 나온
     두 번째 이유가 이것이었다(첫 번째는 씨앗). 봉투 길이에 표본을 맞춘다(32회차와 같은 원칙). */
  const gain = await run('gain', 1600, 8);
  const quest = await run('quest', 1900, 15);
  const upg = await run('upg', 900, 25);
  const beat = await run('beat', 1000, 25); /* 844 — 씬 D. 회당 플로터(`.fx-plus.hb`)가 살아 있는 자리 */

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
  /* ⚑ 543 이관 — 주인 지시 «다이아 크기 기준 3배» 로 알갱이 잉크가 36 → 108px(면적 9배)이 됐다.
     개수는 그 면적과 맞바꿔 8~16 → **3~6** 이 됐다(밴드 피치가 44 → 132 라 16슬롯이 2112px 로
     프레임보다 넓어진다 — index.html fxFly 의 543 주석). 상한도 32 → FXFLY_MAX 12 다.
     ⚠ 이 항을 «숫자만 낮춘» 것으로 두지 않는다 — 아래 [2b] 가 «그래서 총 잉크가 줄었나» 를 묻는다. */
  const src58 = require('fs').readFileSync(require('path').resolve(__dirname, '../index.html'), 'utf8');
  const num58 = (re, d) => { const m = src58.match(re); return m ? +m[1] : d; };
  const K58 = { FLYMAX: num58(/const FXFLY_MAX\s+= (\d+)/, 32),
                GINK:   num58(/const FX3_GINK\s+= ([\d.]+)/, 0) };
  ok(qPeak >= 3 && qPeak <= K58.FLYMAX, `동시 최대 ${qPeak}개 (3 ~ FXFLY_MAX ${K58.FLYMAX})`);
  /* [2b] 543 — «개수를 줄인 대가로 무엇을 샀나». 알갱이 하나의 잉크 면적 × 동시 개수가
     프레임(1080×2280)의 5% 를 넘으면 «손맛» 이 아니라 «화면이 덮인다» 다. */
  const ink58 = K58.GINK ? Math.PI * (K58.GINK / 2) ** 2 : 0;
  const cov58 = ink58 * qPeak / (1080 * 2280) * 100;
  ok(!K58.GINK || cov58 <= 5, `동시 잉크 점유 ${cov58.toFixed(2)}% (≤5% — 개수×잉크 맞바꿈이 실제로 성립하는가)`);

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
  /* ⚑ 583 이관 — 주인 지시(«그 알갱이가 골드아이콘으로 되게 하기 왜냐면 골드로 강화하니까»)로
     씬 C 의 앰버 불꽃이 **골드 알갱이로 갈렸다**(겹쳐 쏘지 않는다 — index.html `fxUpOk` 머리말).
     묻는 뜻은 그대로다: «강화 자리에 알갱이 층이 실재하는가». 헐거워지지 않게 **화폐 신원까지**
     같이 못박는다 — 둘 다 사라지면 여기가 빨개진다(333 처방 · 자리를 비우지 않는다). */
  const upSpark = Math.max(...upg.samples.map(s => s.spark));
  const upSpd = Math.max(...upg.samples.map(s => s.spd));
  const upCur = [...new Set(upg.samples.flatMap(s => s.spdCur || []))];
  ok((upSpd >= 3 && upCur.length === 1 && upCur[0] === 'gold') || upSpark >= 10,
    `알갱이 층 — 화폐 알갱이 ${upSpd}개 [${upCur.join(',')}] (≥3·gold) 또는 방사형 불꽃 ${upSpark}개 (≥10)`);
  /* ⚑⚑ 732 이관 — 종전 한 줄은 «씬 C 에 델타 «+n» 플로터가 **난다**» 였고, 659·660(주인 지시
     «훈련·단련·룬 숫자 플로터 폐지 — 아이콘 버스트로 교체»)이 그 호스트를 없앤 뒤로 빨갛다.
     `probe732` 12/12 가 갈래를 닫았다: **ⓐ 게이트 부패**다(제품 0줄 — 훈련 두 호출부 35063·35123 의
     셋째 인자가 `null` · 부품 `fxDelta` 는 코스튬에서 살아 있다). 즉 이 항은 «주인이 없애라고 한 것이
     **있어야** 통과하는 자» 가 돼 있었다 — 694 가 `verify93` [7] 에서 닫은 것과 같은 자리·같은 처방.
     333 규약대로 **자리를 비우지 않고 방향을 뒤집는다**: 음성항 [7-b] + 양성항 [7-c].
     ⚠ 위치 축(«스폰은 강화 버튼뿐»)은 여기서 다시 안 잰다 — `verify660` [C1]·[C2] 가 세 탭 전부
       그것을 이미 단언한다(402 «두 벌 금지»). 여기가 지키는 것은 «한 사건에 세 층이 같이 난다» 다. */
  ok(upg.paid > 0, `[7-a] 전제 — 훈련 강화가 실제로 났다 (골드 ${upg.paid} 지출)`);
  ok(Math.max(...upg.samples.map(s => s.plus.length)) === 0,
    '[7-b] 훈련 «+n» 숫자 플로터 **0장** (659·660 — 되돌아가면 여기가 빨개진다)');
  const upCic = Math.max(...upg.samples.map(s => s.cic));
  const upCicCur = [...new Set(upg.samples.flatMap(s => s.cicCur || []))];
  ok(upCic >= 3 && upCicCur.length === 1 && upCicCur[0] === 'gold',
    `[7-c] 그 자리를 재화 아이콘 버스트가 대신한다 — ${upCic}알 [${upCicCur.join(',')}] (≥3 · gold)`);

  console.log('[8] «+n» 플로터 글자 크기가 세 씬 공통 (24회차 --fx-plus-fs)');
  /* ⚑⚑ 844 — 표본 셋째 자리를 **씬 D(50 코스튬 델타) → 씬 D(08 세부 [강화] 회당 플로터)** 로 옮겼다.
     이 항이 지키는 것은 «회당 플로터가 자기 자리에 크기를 손으로 적지 않는다» 이고(491 2회차가
     488 의 그 사고를 되돌린 자리다), 그러려면 표본은 **플로터가 실제로 사는 자리**여야 한다.
     732 가 고른 코스튬 델타는 그 뒤 520·814 로 호출부가 사라져 **표본이 영영 안 잡히는 자리**가 됐다
     (`probe844` [1] 8ms 격자에서도 0장 · [2-c] 텍스트를 넘기는 `fxUpOk` 호출부 0곳) —
     그래서 이 항은 «주인이 없애라고 한 것이 있어야 통과하는 자» 였다.
     ⚠ 씬 D 는 **결과 줄기**(`.fx-plus.hb:not(.dn)`)만 읽는다 — 비용 줄기 «−n 조각» 은 150 규약이
       인라인으로 눌러 놓으므로(19.7px 실측) 섞으면 무엇을 쟀는지 모르는 자가 된다. */
  const fs = (h) => { const s = h.samples.find(x => x.plus.length); return s ? s.plus[0] : null; };
  const fsHb = (h) => { const s = h.samples.find(x => x.hb && x.hb.length); return s ? s.hb[0].fs : null; };
  const fa = fs(gain), fb = fs(quest), fd = fsHb(beat);
  ok(beat.paid > 0, `[8-a] 전제 — 08 세부 [강화] 가 실제로 났다 (${beat.paid}회)`);
  ok(fa && fb && fd && Math.abs(fa - fb) < 0.6 && Math.abs(fa - fd) < 0.6,
    `[8-b] 씬 A ${fa} · 씬 B ${fb} · 씬 D(회당 플로터) ${fd} px`);
  /* 크기가 «같다» 만으로는 부족하다 — 손으로 적은 값이 우연히 같을 수 있다(488 이 실제로 그랬다:
     그 자리에 30px 을 적었고 토큰도 한때 30 이었다). 인라인이 0장이어야 «토큰이 준 값» 이다. */
  const hbAll = beat.samples.flatMap(s => s.hb || []);
  ok(hbAll.length > 0 && hbAll.every(h => !h.inl),
    `[8-c] 그 크기를 자기 자리에 손으로 적지 않았다 — 인라인 font-size ${hbAll.filter(h => h.inl).length}/${hbAll.length}장`);
  /* ⚑ 844 — 델타 계열의 파수꾼. 지금은 «부르는 자가 없어서» 표본이 없는 것이므로, 누군가 텍스트를
     넘기는 호출을 되살리면(= 델타가 화면에 다시 뜨면) 여기가 빨개져 «[8] 에 표본을 한 자리 더
     넣어라» 고 말한다. 333 «자리를 비우지 마라» 를 정적 축으로 지키는 자리다.
     ⚠ 부품 자체(`fxDelta` 가 34px 글자를 세운다)는 `verify814` [E1]·[E2] 몫이다 — 두 벌로 안 잰다(402). */
  const src844 = require('fs').readFileSync(path.resolve(__dirname, '..', process.env.V58_SRC || 'index.html'), 'utf8');
  const live844 = (() => {                       /* 주석을 여닫이 상태 기계로 걷는다(probe844 [2] 와 같은 규칙) */
    let inB = false; const out = [];
    src844.split('\n').forEach((raw, i) => {
      let s = '', j = 0;
      while (j < raw.length) {
        if (inB) { const e = raw.indexOf('*/', j); if (e < 0) j = raw.length; else { inB = false; j = e + 2; } }
        else {
          const b0 = raw.indexOf('/*', j), l0 = raw.indexOf('//', j);
          if (b0 >= 0 && (l0 < 0 || b0 < l0)) { s += raw.slice(j, b0); inB = true; j = b0 + 2; }
          else if (l0 >= 0) { s += raw.slice(j, l0); j = raw.length; }
          else { s += raw.slice(j); j = raw.length; }
        }
      }
      s = s.trim();
      if (!s || /^function fxUpOk/.test(s) || !/fxUpOk\(/.test(s)) return;
      const a = ((s.match(/fxUpOk\(([^;]*)\)/) || [, ''])[1]).split(',').map(t => t.trim());
      if (a.length >= 3 && a[2] && a[2] !== 'null' && a[2] !== "''") out.push(i + 1);
    });
    return out;
  })();
  ok(live844.length === 0,
    `[8-d] 델타 계열은 제품에서 은퇴 상태다 — 텍스트를 넘기는 \`fxUpOk\` 호출부 ${live844.length}곳`
    + (live844.length ? ` (${live844.join(',')}) — 되살아났으면 [8] 에 그 표본을 한 자리 더 넣어라` : ' (659·660·520·814)'));

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

  /* ---- [14] 씬 A 전투 발이 프레임 밖으로 안 잘린다 (36차 X[2]·Y[1] 2인 공통) ---- */
  console.log('[14] 씬 A 전투 발 — 프레임 오른쪽 잘림 0 (36차 X·Y 2인 공통)');
  if (!gain.frame) {
    ok(false, '#app 사각을 못 읽었다 — 이 단언을 잴 대상이 없다');
  } else {
    const R = gain.frame.x + gain.frame.w;
    let out = 0, worst = 0;
    for (const s2 of gain.samples) for (const f of s2.flies) {
      const right = f.cx + f.cw;                              /* «그림»(.cic) 상자의 우변 */
      if (right > R + 0.5) { out++; worst = Math.max(worst, right - R); }
    }
    /* 되돌리면 빨개진다: 36회차 이전 빌드는 같은 발원(1040,400)에서 최대 **+14.7px** 이 프레임
       밖으로 나갔다(캡처 r36b gain-4 의 골드 화소도 x=1079 까지 붙어 있었다). */
    ok(out === 0, `프레임 우변을 넘은 표본 ${out}개 · 최대 +${worst.toFixed(1)}px (0 이어야 한다)`);
  }

  /* ---- [15] 토스트가 «완전히 정지한 채» 오래 머물지 않는다 (36차 X[4]·Y[8] 2인 공통F) ----
     두 사람이 서로 다른 자(X 잉크 bbox · Y 화소수)로 같은 창을 짚었다: 474ms 동안 변화 ±1px / 0.15%.
     여기서는 세 번째 자(**레이아웃 상자**)로 잰다 — 자가 셋이면 «자가 만든 값» 이 아니다.
     ⚠ 단언을 «항상 움직인다» 로 쓰면 안 된다. 토스트는 **읽히려고** 뜨는 것이라 정지 자체가
       결함이 아니고, 읽는 시간(≈34px 본문 한 줄)은 있어야 한다. 재는 것은 «연속 정지의 길이» 다. */
  console.log('[15] 퀘스트 토스트 — 완전 정지 구간 ≤250ms (36차 X·Y 2인 공통F)');
  {
    const ts = quest.samples.filter(s => s.toastB);
    let best = 0, run = null, from = 0, to = 0;
    for (let i = 1; i < ts.length; i++) {
      const a = ts[i - 1].toastB, c = ts[i].toastB;
      const same = Math.abs(a[0] - c[0]) < 0.5 && Math.abs(a[1] - c[1]) < 0.5
        && Math.abs(a[2] - c[2]) < 0.5 && Math.abs(a[3] - c[3]) < 0.5;
      if (same) {
        if (run == null) run = ts[i - 1].t;
        if (ts[i].t - run > best) { best = ts[i].t - run; from = run; to = ts[i].t; }
      } else run = null;
    }
    /* 되돌리면 빨개진다: 37회차 이전 빌드(.19s 등장 + 부유 없음)는 같은 자로 **582ms**(507~1089)였다. */
    ok(ts.length > 0 && best <= 250,
      `표본 ${ts.length}장 · 최장 정지 ${best}ms (${from}~${to}) — 250 이하여야 한다`);
    /* 부유는 **아래로만** 5px 이다(위 여유 1px). 그 밑변이 «STAGE n» 헤더를 물면 회수가 아니라 이동이다. */
    if (quest.chap == null) {
      ok(false, '#chapN 을 못 찾았다 — 밑변 여유를 잴 대상이 없다');
    } else {
      let worstGap = Infinity;
      for (const s2 of ts) worstGap = Math.min(worstGap, quest.chap.y - (s2.toastB[1] + s2.toastB[3]));
      ok(worstGap > 0, `토스트 밑변 ↔ #chapN 윗변 최소 여유 ${worstGap.toFixed(1)}px (>0 이어야 한다)`);
    }
  }

  /* ---- [16] 딤 위 알약 복제판의 숫자가 원본과 어긋나지 않는다 (37차 Z[12]·AA[11] 2인 공통) ---- */
  console.log('[16] 씬 B 딤 위 알약 복제판 숫자 = 원본 (37차 Z·AA 2인 공통)');
  {
    const ls = quest.samples.filter(s => s.lit);
    const bad = ls.filter(s => s.lit[0] !== s.lit[1]);
    /* 되돌리면 빨개진다: `drawHud()` 뒤의 `fxLitSync()` 를 빼면 rAF 자로 42표본 중 **16표본**이
       어긋났고 차이는 전부 정확히 −38(= 610/16 = 도착 한 칸)이었다 — 두 비평가의 실측 그대로다. */
    ok(ls.length > 0 && bad.length === 0,
      `표본 ${ls.length}장 · 원본≠복제판 ${bad.length}장`
      + (bad.length ? ` (예: 원본 ${bad[0].lit[0]} / 복제판 ${bad[0].lit[1]})` : ''));
  }

  /* ---- [17] 씬 A 전투 발이 «상한» 에서 세로 기둥으로 뭉치지 않는다 (37차 Z[5]·AA[1] 2인 공통ㄴ) ----
     두 사람이 같은 x 구간(1029~1062)을 독립으로 냈다: Z «기둥 폭 34px = 코인 1개분(가로 퍼짐 0)» ·
     AA «f2~f6 5장 연속 x[1029,1062] 동일 · 간격 28px 로 6px 상호 침범».
     ⚠ 재는 대상은 «상한 대역에 든 코인» 이다 — 상한과 무관한 자리에서 서로 가까운 것은 이 규칙이
       아니다(퍼짐 끝점은 이미 배치 루프의 밀어내기가 본다). 대역은 눈대중이 아니라 차선 폭
       `FX3_MIND` 하나로 잡는다: [상한 − FX3_MIND, 상한]. */
  console.log('[17] 씬 A 전투 발 — 우측 상한 대역의 가로 퍼짐 (37차 Z·AA 2인 공통ㄴ)');
  if (!gain.frame || !gain.lane) {
    ok(false, '#app 사각 또는 FX3_MIND/FX3_MBM 을 못 읽었다 — 이 단언을 잴 대상이 없다');
  } else {
    /* ⚠ «대역 안 두 코인의 최소 간격 ≥ FX3_MIND» 로 세우면 안 된다 — 고친 빌드가 실행마다
       빨개졌다(관측 12.6px). 상한에 **안 닿은** 코인이 우연히 대역을 지나가는 것까지 세기 때문인데,
       그건 이 결함이 아니다(퍼짐 끝점 사이의 거리는 배치 루프의 밀어내기가 따로 본다).
       두 비평가가 실제로 잰 것은 **«같은 x 에 여러 개»**(Z «기둥 폭 34px = 코인 1개분 · 가로 퍼짐 0» ·
       AA «f2~f6 5장 연속 같은 x 구간»). 그대로 잰다 — 한 프레임에서 중심 x 가 겹치는 코인 쌍의 수. */
    const bound = gain.frame.x + gain.frame.w - gain.lane.mbm;   /* 코인 «중심» 상한 = 1046 */
    let col = 0, worstFrame = null, pinMax = 0;
    for (const s2 of gain.samples) {
      const xs = s2.flies.map((f) => f.cx + f.cw / 2).filter((cx) => cx >= bound - 200);
      const bucket = new Map();
      for (const cx of xs) { const k = Math.round(cx * 2); bucket.set(k, (bucket.get(k) || 0) + 1); }
      let worst = 0;
      for (const v of bucket.values()) worst = Math.max(worst, v);
      if (worst >= 2) { col++; if (worst > pinMax) { pinMax = worst; worstFrame = s2.t; } }
    }
    /* 되돌리면 빨개진다: 38회차 이전 빌드(`x = Math.min(x, FRAME_W − FX3_MBM)` 단일 상한)는 같은
       발원(1040,400)에서 상한에 닿은 코인이 **전부 x=1046** 에 모여 «한 x 에 2~3개» 인 프레임이 남는다. */
    ok(col === 0, `우측 200px 안에서 «중심 x 가 같은» 코인이 2개 이상인 프레임 ${col}개`
      + (worstFrame != null ? ` (최악 t=${worstFrame}ms · 한 x 에 ${pinMax}개)` : '') + ' — 0 이어야 한다');
  }

  /* ---- [18] 퀘스트 체크 도장이 «정지 뒤 하드컷» 이 아니다 (37차 Z[7]·AA[10] 2인 공통ㄹ) ----
     [15](토스트)와 **같은 자·같은 두 단언**이다 — 같은 병이므로 같은 게이트를 세운다.
     ⓐ 완전 정지 구간 ≤250ms  ⓑ 퇴장(소멸 직전)이 표본에 남는다. */
  /* ⚠ «최장 정지 ≤ Nms» 로는 못 세운다 — [15](토스트)를 그대로 본떠 250ms 로 세웠더니
       **되돌린 빌드가 통과했다**(213ms). 설계상 정지는 34%~80% of .6s = 276ms 인데, 이 컨테이너의
       실제 표본 간격이 15ms 요청에도 **~40ms** 라 구간 경계가 한 걸음(±40ms)씩 흔들리고
       중간에 표본 하나만 튀어도 «연속» 이 끊긴다(`tools/p58at.js` 시계열: 356·411·427·508·577
       완전 동일 = 221~256ms 가 실행마다 왔다 갔다). 임계를 노이즈 폭 안에서 조정하는 것은
       게이트가 아니라 눈대중이다 → **임계 없는 자**로 바꾼다.
     프로브가 준 자: 도장은 `translate(-50%,-50%) scale(…)` 이라 등장·퇴장의 크기 변화가 전부
     **중심 고정**으로 일어난다. 그래서 종전 빌드는 «중심 이동 총거리 = 0.0px» 이 수명 내내 성립하고,
     퇴장도 opacity 만 1→0 이라 상자가 92×97 로 **한 픽셀도 안 움직인 채** 사라진다.
     두 비평가가 «정지» 와 «하드컷» 으로 따로 적은 것이 실은 같은 하나다. */
  console.log('[18] 퀘스트 체크 도장 — 중심 이동 + 움직이는 퇴장 (37차 Z·AA 2인 공통ㄹ)');
  {
    const cs = quest.samples.filter((s) => s.checkB);
    const vis = cs.filter((s) => s.checkB[4] >= 0.02);
    const ctr = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];
    let path = 0;
    for (let i = 1; i < vis.length; i++) {
      const a = ctr(vis[i - 1].checkB), c = ctr(vis[i].checkB);
      path += Math.hypot(c[0] - a[0], c[1] - a[1]);
    }
    /* 되돌리면 빨개진다: 38회차 이전 빌드는 같은 자로 **0.0px**(중심 완전 고정, p58at 20표본 전부).
       임계 4px 은 눈대중이 아니라 **선언한 부유 진폭 5px 의 80%** 다(표본 격자 손실 몫). */
    ok(vis.length > 0 && path >= 4,
      `가시 표본 ${vis.length}장 · 중심 이동 총거리 ${path.toFixed(1)}px (≥4 — 선언 부유 5px)`);
    /* ⓑ 퇴장 — 소멸이 «움직임» 으로 보여야 한다. 종전 빌드는 퇴장 구간(op 1→0) 내내 상자가
       92×97 그대로라 «움직인 퇴장» 표본이 **0장**이었다(= 두 사람이 «하드컷» 으로 읽은 그림). */
    /* ⚠ «퇴장 표본이 매 쌍 움직인다» 로 세우면 안 된다 — 고친 빌드가 1/2 로 빨개졌다. 퇴장은
       ease-in 이라 앞머리 40ms 의 이동이 0.2px 이고, 이 컨테이너의 표본 간격이 ~40ms 라 앞쪽 한
       쌍이 격자에 안 걸린다. 쌍이 아니라 **끝점**을 본다: 소멸 직전 중심이 머물던 자리보다
       «위» 에 있어야 한다(선언 22px 상승). 종전 빌드는 정확히 0.0px 다. */
    const fade = cs.filter((s) => s.t > 250 && s.checkB[4] > 0.005 && s.checkB[4] < 0.98);
    const opaque = cs.filter((s) => s.t > 250 && s.checkB[4] >= 0.98);
    const ref = opaque.length ? ctr(opaque[opaque.length - 1].checkB)[1] : null;
    const rise = fade.length && ref != null
      ? ref - Math.min(...fade.map((s) => ctr(s.checkB)[1])) : 0;
    ok(fade.length >= 1 && ref != null && rise >= 4,
      `퇴장 표본 ${fade.length}장 · 마지막 불투명 표본 대비 중심 상승 ${rise.toFixed(1)}px `
      + '(≥4 — 선언 22px, 표본 격자 손실 몫)');
  }

  /* ---- [19] 씬 A HUD 알약 «팝» 의 복귀가 한 프레임에 급락하지 않는다 (37차 Z[8]·AA[3] 2인 공통ㅁ) ----
     Z «f12~f16 208ms ±2px 고원 → 복귀 11px 중 9px 을 18ms(전체의 2.8%)에» · AA «f13~f16 140ms
     ±0px → f17 −9px 스냅».
     ⚠ «한 표본이 먹은 비율» 로 재면 안 된다 — 표본 간격이 32~65ms 로 들쭉날쭉해서, 같은 속도라도
       간격이 두 배인 표본이 두 배를 먹는다(첫 시도가 그 값으로 «51%» 를 읽고 고친 줄 알 뻔했다).
       [18] 에서 배운 것과 같다: **표본 격자에 안 흔들리는 자**로 잰다.
     → «복귀 실효 구간» — 봉우리에서 25% 내려온 첫 표본 ~ 바닥 10% 안에 든 첫 표본 사이의 시간.
       속도가 아니라 «얼마 동안 복귀가 보이는가» 라서 간격이 흔들려도 값이 안 바뀐다. */
  console.log('[19] 씬 A 알약 팝 — 복귀 실효 구간 (37차 Z·AA 2인 공통ㅁ)');
  {
    const ps = gain.samples.filter((s) => s.pillB);
    if (ps.length < 4) {
      ok(false, `알약 상자 표본 ${ps.length}장 — 잴 대상이 없다(.cbox.cGold 선택자 확인)`);
    } else {
      const ws = ps.map((s) => s.pillB[0]);
      const base = Math.min(...ws), peak = Math.max(...ws), total = peak - base;
      const pk = ws.indexOf(peak);
      const rec = ps.slice(pk);
      const a = rec.find((s) => s.pillB[0] <= peak - 0.25 * total);
      const c = rec.find((s) => s.pillB[0] <= base + 0.10 * total);
      const span = (a && c) ? c.t - a.t : 0;
      /* 되돌리면 빨개진다: 39회차 이전 빌드(고원 60% + 전 구간 ease-out)는 같은 자로 **34ms**
         (두 번 연속 실행 34 · 34). 반영 후 **122ms**. 임계 90ms 은 눈대중이 아니라 37회차가
         넘긴 처방 «복귀 구간을 180ms 로 펼 것» 의 **절반**이다(표본 격자 손실 몫). */
      ok(span >= 90, `봉우리 ${peak.toFixed(1)}px → 바닥 ${base.toFixed(1)}px · `
        + `복귀 실효 구간 ${span}ms (≥90 — 선언 202ms) · 표본 ${ps.length}장`);
    }
  }

  console.log('[11] 콘솔 에러 0');
  const e = gain.errs.length + quest.errs.length + upg.errs.length + beat.errs.length;
  ok(e === 0, `네 씬 합계 ${e}건`);   /* 732 — 씬 D 가 늘었다 */

  console.log(`\nVERIFY58 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
