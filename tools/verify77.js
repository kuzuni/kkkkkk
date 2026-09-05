#!/usr/bin/env node
/* 77 검증 — 전투 발(發) 재화 연출은 팝업 아래(#fxlc z7), UI 발은 팝업 위(#fxl z60)
 *
 *   node tools/verify77.js
 *
 * 검사 항목:
 *   [A] 단위 — fxAt(t,'combat') 태그가 fxSrc() 로 전달되는가 / 무태그는 combat 이 아닌가
 *   [B] 라우팅 — fxFly 가 combat 출발점이면 #fxlc, 아니면 #fxl 에 DOM 을 만드는가 (+n 포함)
 *   [C] 스태킹 — 대표 오버레이(상점·던전·유물·훈련·장비·소환결과·퀘스트 모달) 위에서
 *       elementFromPoint 프로브: #fxlc 의 요소는 오버레이에 가려지고 #fxl 의 요소는 위에 보이는가
 *   [D] 통합 — 상점 페이지를 연 채 실제 자동 전투 10초
 *       [D-a] 592 이관 — 잡몹 킬만 도는 구간에는 재화 연출이 0건(킬 드랍 코인 폐지)
 *       [D-b] 살아 있는 전투 발(스테이지 클리어 보너스)은 **여전히** 전부 #fxlc 에만 생긴다 (#fxl 0건)
 *   [E] 회귀 — 전투 킬을 막고 UI 힌트(fxAt 무태그) + 재화 증가 → #fxl 에 비행이 생기는가
 * 부산물: docs/shots/77-*.png (상점 열고 전투 프레임 6장 + 메인 전투 코인 3장) — 비평가 확인용
 */
const path = require('path');
const fs = require('fs');
/* 작업 925 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(같은 말을 손으로 적고 있었다).
   사슬을 안 지나면 뒤에 걸린 장치를 하나도 못 받는다 — 291 정착 · 731 소실 차단기 ·
   907 판 결정성 깃발 · 918/922 껍데기 걷개. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SHOTS = path.resolve(__dirname, '..', 'docs', 'shots');
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

(async () => {
  const browser = await launch(chromium);   /* 925 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  /* ---------- [A] 단위: fxSrc 출처 태그 ---------- */
  console.log('[A] fxSrc 출처 태그');
  {
    const r = await page.evaluate(() => {
      fxAt({ x: 100, y: 100 }, 'combat');
      const s1 = fxSrc(performance.now());
      fxAt({ x: 200, y: 200 });
      const s2 = fxSrc(performance.now());
      return { c1: !!(s1 && s1.combat), c2: !!(s2 && s2.combat) };
    });
    if (r.c1) ok('combat 태그 전달'); else fail('fxAt(t,"combat") 이 fxSrc 에 combat 을 안 넘긴다');
    if (!r.c2) ok('무태그는 combat 아님'); else fail('무태그 fxAt 인데 combat 으로 나온다');
  }

  /* ---------- [B] 라우팅: fxFly / fxPlus 레이어 선택 ---------- */
  console.log('[B] fxFly 레이어 라우팅');
  {
    /* ⚑ 552 — 종전 [B] 는 층별 `.fx-plus` 의 **개수 델타**로 쟀고, 그래서 뜨고 지는 FAIL 이었다.
       이 자는 배경 자동 전투가 도는 채로 재는데 전투 `+n` 의 수명은 840ms(`fxBye(el, 840)`)라,
       **호출 직전 #fxlc 에 남아 있던 «남의» +n** 이 700ms 창 안에 사라지면
       내 +n 이 제 층에 정확히 들어와도 «들어온 1 − 나간 1 = 0» 으로 빨개진다.
       `probe552` 가 이것을 찍었다 — 배경 그대로면 10회 중 **8회 델타 0** 인데
       내 combat +n 은 **10/10 이 #fxlc 에** 붙었고(중앙 270ms) #fxl 로는 **0회** 샜다.
       ⇒ 제품은 옳다. 542 처방 그대로 **씬을 격리하고**([E] 의 `killEnemy` 선례)
       **금액으로 내 묶음을 고른다**(두 묶음에 다른 금액을 준다).
       판정이 «개수» 에서 «어느 층에 붙었나» 로 바뀌면서 **음성항 2개**(반대 층에 안 붙었다)와
       **전제 2개**(금액이 실제로 갈린다 · 격리 창에 남의 +n 0건)가 같이 선다 —
       허용 오차를 넓힌 것이 아니라 **자를 좁힌 것**이다(아래 [B-R] 되돌림 시험이 못박는다). */
    await page.evaluate(() => {
      /* 페이지 안에 측정 한 벌을 심는다 — [B] 본체와 [B-R] 되돌림 시험이 **같은 자**를 쓴다. */
      window.__b552 = async () => {
        const realKill = killEnemy; killEnemy = () => {};      /* 배경 전투 획득 차단([E] 선례) */
        try {
          await new Promise((res) => setTimeout(res, 1000));   /* 앞 비행이 착지할 때까지 */
          const L = document.getElementById('fxl'), LC = document.getElementById('fxlc');
          const log = [];
          const watch = (id, el) => {
            const o = new MutationObserver((ms) => {
              for (const m of ms) for (const n of m.addedNodes) {
                if (!n.classList) continue;
                if (n.classList.contains('fx-plus')) log.push({ lay: id, kind: 'plus', txt: n.textContent });
                else if (n.classList.contains('fx-fly')) log.push({ lay: id, kind: 'fly' });
              }
            });
            o.observe(el, { childList: true });
            return o;
          };
          const oL = watch('fxl', L), oLC = watch('fxlc', LC);
          const cN = 1010, uN = 2020;                          /* 두 묶음을 금액으로 가른다 */
          const cTxt = '+' + fmtCur('gold', cN), uTxt = '+' + fmtCur('gold', uN);
          fxFly({ x: 540, y: 1200, combat: true }, 'gold', cN);
          fxFly({ x: 540, y: 1200 }, 'gold', uN);
          /* +n 은 그 묶음의 «첫 도착» 때 뜬다 — probe552 실측 218~299ms 라 700ms 면 4배 여유다.
             ⚠ 창을 늘려도 안 되고(전투 +n 수명 840ms) 줄여도 안 된다(첫 도착 300ms). */
          await new Promise((res) => setTimeout(res, 700));
          oL.disconnect(); oLC.disconnect();
          const lays = (kind, txt) => log
            .filter((e) => e.kind === kind && (txt === undefined || e.txt === txt))
            .map((e) => e.lay);
          return {
            cTxt, uTxt, distinct: cTxt !== uTxt,
            flyLC: lays('fly').filter((l) => l === 'fxlc').length,
            flyL: lays('fly').filter((l) => l === 'fxl').length,
            cPlus: lays('plus', cTxt), uPlus: lays('plus', uTxt),
            foreign: log.filter((e) => e.kind === 'plus' && e.txt !== cTxt && e.txt !== uTxt).length,
          };
        } finally { killEnemy = realKill; }
      };
    });
    const r = await page.evaluate(() => window.__b552());
    /* [전제] — 이 둘이 깨지면 아래 판정은 «헛초록» 이다(130·341 규약: 전제를 본체와 가른다) */
    if (r.distinct) ok(`[전제] 두 묶음이 금액으로 갈린다 (combat «${r.cTxt}» ↔ UI «${r.uTxt}»)`);
    else fail(`[전제] 두 묶음의 +n 글자가 같다(«${r.cTxt}») — 금액으로 못 고른다`);
    if (r.foreign === 0) ok('[전제] 격리 창에 «남의» +n 0건');
    else fail(`[전제] 격리했는데 «남의» +n 이 ${r.foreign}건 — 씬이 안 격리됐다`);
    if (r.flyLC > 0) ok(`combat 출발 → #fxlc (${r.flyLC}개)`); else fail('combat 출발인데 #fxlc 에 fly 가 없다');
    if (r.flyL > 0) ok(`UI 출발 → #fxl (${r.flyL}개)`); else fail('UI 출발인데 #fxl 에 fly 가 없다');
    if (r.cPlus.includes('fxlc')) ok('combat +n → #fxlc'); else fail('combat 묶음의 +n 이 #fxlc 에 없다');
    if (!r.cPlus.includes('fxl')) ok('combat +n 이 #fxl(팝업 위)로 안 샌다'); else fail('combat 묶음의 +n 이 #fxl 로 샜다');
    if (r.uPlus.includes('fxl')) ok('UI +n → #fxl'); else fail('UI 묶음의 +n 이 #fxl 에 없다');
    if (!r.uPlus.includes('fxlc')) ok('UI +n 이 #fxlc 로 안 샌다'); else fail('UI 묶음의 +n 이 #fxlc 로 샜다');
  }

  /* ---------- [B-R] 되돌림 시험: 새 자가 «층이 갈리는 것» 을 실제로 잡는가 ---------- */
  /* ⚑ 552 — 무르게 풀어 닫은 게 아님을 여기서 못박는다. 제품의 `fxPlus` 가 `combat` 을 잃으면
     ([E] 가 `killEnemy` 를 바꿔 끼우는 것과 같은 방식으로 **사본만** 갈아 끼운다)
     [B] 의 combat 항 두 개가 반드시 빨개져야 한다 — 안 빨개지면 그 항은 뜻이 없다. */
  console.log('[B-R] 되돌림 시험 — fxPlus 가 combat 을 잃으면 [B] 가 잡는가');
  {
    const r = await page.evaluate(async () => {
      const orig = fxPlus;
      fxPlus = (cur, n, combat, at) => orig(cur, n, false, at);   /* «층이 안 따라가는» 사본 */
      try { return await window.__b552(); }
      finally { fxPlus = orig; }
    });
    const caught = r.cPlus.includes('fxl') && !r.cPlus.includes('fxlc');
    if (caught) ok('사본에서 combat +n 이 #fxl 로 새고 #fxlc 에는 없다 — [B] 가 빨개진다');
    else fail(`되돌림 시험이 안 잡힌다 — 사본에서도 combat +n 이 [${r.cPlus.join(',') || '없음'}] (자가 헛돈다)`);
    /* 사본을 되돌린 뒤 다시 초록인지 — 되돌림 시험 자체가 상태를 더럽히지 않았는가 */
    const back = await page.evaluate(() => window.__b552());
    if (back.cPlus.includes('fxlc') && !back.cPlus.includes('fxl')) ok('원복 후 다시 #fxlc (시험이 상태를 안 더럽혔다)');
    else fail(`원복했는데 combat +n 이 [${back.cPlus.join(',') || '없음'}]`);
  }

  /* ---------- [C] 스태킹: 오버레이가 #fxlc 를 덮고 #fxl 은 못 덮는가 ---------- */
  console.log('[C] 오버레이 스태킹 프로브');
  const OVS = [
    { id: 'shopw', open: 'openShopPage()' },
    { id: 'dunw', open: 'openDungeon()' },
    { id: 'relw', open: 'openRelw()' },   /* 89 로 교체된 유물 페이지. 옛 이름 #relicw/openRelicPage() 는 존재한 적 없다(작업 130) */
    { id: 'trw', open: null },     /* 클래스 토글만으로 표시 */
    { id: 'eqw', open: null },
    { id: 'sumw', open: null },
    { id: 'mbox', open: 'openMail()' }, /* A5 공용 모달(우편) — .modal 계열 대표 */
  ];
  for (const ov of OVS) {
    const r = await page.evaluate(async ({ id, open }) => {
      const probe = (lay) => {
        const el = document.createElement('s');
        el.style.cssText = 'position:absolute;left:340px;top:1000px;width:400px;height:400px;'
          + 'background:#f0f;pointer-events:auto;z-index:0';
        el.id = 'probe77';
        lay.appendChild(el);
        return el;
      };
      const target = document.getElementById(id) || document.querySelector('.' + id);
      let shown = null;
      /* 130 — 60(쥬시니스)이 오버레이에 300~450ms 페이드를 달아서 고정 250ms 로는
         «앞 오버레이가 아직 닫히는 중 · 새 오버레이는 opacity 0.5» 인 순간을 재게 된다.
         (실측: openShopPage 직후 100ms 에 shopw opacity 0.00, closeShopPage 뒤 150ms 까지 shopw 가 여전히 block/1.00)
         고정 대기 대신 «가라앉을 때까지» 폴링한다. */
      /* ⚠ 폴링은 «프레임을 넘겨» 두 번 연속 참일 때만 인정한다. jz 애니메이션은 클래스를 붙인
         직후의 첫 스타일 계산에서는 아직 «효과 밖»이라 기저값(opacity 1)이 읽히고, 다음 프레임에
         비로소 0% 키프레임(opacity 0)이 걸린다 — 한 번만 재면 그 «가짜 1» 을 붙잡는다. */
      const settle = async (test, ms) => {
        let hit = 0;
        for (let t = 0; t < ms; t += 50) {
          if (test()) { if (++hit >= 2) return true; } else hit = 0;
          await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 50)));
        }
        return test();
      };
      const anims = (el) => { try { return el.getAnimations().filter((a) => a.playState === 'running').length; } catch (_) { return 0; } };
      const vis = (el) => { if (!el) return false; const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.05; };
      try {
        /* 앞 항목의 닫힘 애니메이션이 끝나기를 먼저 기다린다 — 안 그러면 앞 오버레이를 재게 된다 */
        await settle(() => !['shopw', 'dunw', 'relw', 'trw', 'eqw', 'sumw', 'mbox'].some((o) => o !== id && vis(document.getElementById(o))), 2500);
        if (open) { eval(open); }
        else if (target) { target.classList.add('on'); if (getComputedStyle(target).display === 'none') target.style.display = 'block'; }
        /* 열림 애니메이션이 «끝나서»(러닝 애니메이션 0 · opacity ≥ .95) 실제로 화면을 덮을 때까지 */
        await settle(() => target && getComputedStyle(target).display !== 'none'
          && anims(target) === 0 && parseFloat(getComputedStyle(target).opacity) >= 0.95, 2500);
        const box = target ? target.getBoundingClientRect() : null;
        if (!target || !box || box.width < 10) return { skip: '오버레이가 안 열림' };
        /* 프로브 지점: 오버레이 박스 안쪽 중심 (프레임 px 그대로 — fit() 스케일을 뷰포트 좌표로 환산) */
        const app = document.getElementById('app').getBoundingClientRect();
        const sc = app.width / 1080;
        const px = box.left + box.width / 2, py = box.top + box.height / 2;
        const under = probe(document.getElementById('fxlc'));
        const hitC = document.elementFromPoint(px, py);
        const underCovered = !under.contains(hitC) && hitC !== under;
        /* 130 — «무언가에 가려짐» 이 아니라 «그 오버레이에 가려짐» 인지까지 본다.
           이름이 틀린 게이트가 skip 으로 조용히 흘러가던 사고(#relicw)의 재발 방지:
           오버레이가 안 열려도 다른 무엇이 점을 덮으면 underCovered 는 참이 될 수 있다. */
        const byTarget = !!(hitC && (hitC === target || target.contains(hitC)));
        const cs = getComputedStyle(target);
        const reallyShown = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
        under.remove();
        const over = probe(document.getElementById('fxl'));
        /* #fxl 프로브가 그 점을 덮는지 — 프로브 박스가 점을 포함하게 좌표를 프레임 px 로 재배치 */
        over.style.left = ((px - app.left) / sc - 200) + 'px';
        over.style.top = ((py - app.top) / sc - 200) + 'px';
        const hitU = document.elementFromPoint(px, py);
        const overVisible = hitU === over;
        over.remove();
        return { underCovered, overVisible, byTarget, reallyShown, hit: hitC ? (hitC.id || hitC.className || hitC.tagName) : null };
      } finally {
        if (open === 'openShopPage()' && typeof closeShopPage === 'function') closeShopPage();
        else if (open === 'openDungeon()' && typeof closeDungeon === 'function') closeDungeon();
        else if (open === 'openRelw()' && typeof closeRelw === 'function') closeRelw();
        else if (id === 'mbox') { if (typeof closeModal === 'function') closeModal(); }
        else if (target) { target.classList.remove('on'); target.style.display = ''; }
        const p = document.getElementById('probe77'); if (p) p.remove();
      }
    }, ov).catch((e) => ({ skip: String(e) }));
    if (r.skip) { fail(`${ov.id}: 프로브 불가 — ${r.skip}`); continue; }
    /* 130 — 실제로 그 오버레이가 열려 점을 덮고 있는지(= 이 검사가 헛돌지 않는지) 먼저 확인 */
    if (r.reallyShown && r.byTarget) ok(`${ov.id}: 오버레이가 실제로 그 점을 덮는다 (hit=${r.hit})`);
    else fail(`${ov.id}: 오버레이가 그 점을 안 덮는다 — 검사가 헛돈다 (shown=${r.reallyShown}, hit=${r.hit})`);
    if (r.underCovered) ok(`${ov.id}: #fxlc 는 아래(가려짐)`); else fail(`${ov.id}: #fxlc 프로브가 오버레이 위로 보인다`);
    if (r.overVisible) ok(`${ov.id}: #fxl 은 위(보임)`); else fail(`${ov.id}: #fxl 프로브가 오버레이에 가려진다`);
  }

  /* ---------- [D] 통합: 상점 연 채 실제 전투 10초 ---------- */
  console.log('[D] 상점 열고 자동 전투 10초 — 새 fly/plus 는 전부 #fxlc 에');
  {
    await page.evaluate(() => {
      window.__c77 = { fxl: 0, fxlc: 0 };
      const watch = (id) => new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes)
          if (n.classList && (n.classList.contains('fx-fly') || n.classList.contains('fx-plus'))) window.__c77[id]++;
      }).observe(document.getElementById(id), { childList: true });
      watch('fxl'); watch('fxlc');
      openShopPage();
    });
    fs.mkdirSync(SHOTS, { recursive: true });
    /* 전투 획득이 확실히 일어나게 킬 발생을 기다리며, 도중 프레임 6장 캡처 */
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(i ? 90 : 1600);
      await page.screenshot({ path: path.join(SHOTS, `77-shop-combat-f${i}.png`) });
    }
    await page.waitForTimeout(10000 - 1600 - 90 * 5);
    /* ⚑ 592 이관 — **이 항은 방향이 뒤집혔다(333 처방 · 지우지 않았다).**
       종전 [D] 는 «10초 동안 #fxlc 에 연출이 0건이면 실패» 였고, 그 연출을 대 주던 것이
       **킬 드랍 코인**(`killEnemy` 의 `fxAt(…,'combat')`)이었다. 592 가 주인 지시로 그것을
       폐지했으므로 같은 문장을 그대로 두면 **77 이 아니라 592 를 재는 빨강**이 된다.
       77 이 지키는 규칙 자체(«전투 발 재화 연출은 팝업 아래 #fxlc»)는 한 글자도 안 바뀌었고,
       그 규칙의 **살아 있는 발원**이 ⑵ 스테이지 클리어 · ⑶ 파도 전멸 보너스로 바뀌었을 뿐이다.
       ⇒ 항을 둘로 가른다: [D-a] 는 592 가 뺀 것(킬 드랍 = 0)을, [D-b] 는 77 의 규칙을
       **살아 있는 전투 발**로 다시 문다. [D-b] 가 없으면 이 절은 «비어서 초록» 이 된다. */
    const r = await page.evaluate(() => { const c = window.__c77; const g = S.gold; return { ...c, gold: g }; });
    if (r.fxlc === 0 && r.fxl === 0)
      ok(`592 — 잡몹 킬만 도는 10초에는 재화 연출이 한 건도 안 난다 (#fxlc ${r.fxlc} · #fxl ${r.fxl})`);
    else fail(`592 — 킬 드랍 연출이 남아 있다: #fxlc ${r.fxlc} · #fxl ${r.fxl}`);
    /* [D-b] 살아 있는 전투 발 — ⑵ 스테이지 클리어 보너스. 같은 창(상점 페이지가 열린 채)에서
       그 코인이 **여전히 페이지 아래**(#fxlc)로 가는가가 77 의 본래 질문이다. */
    const r2 = await page.evaluate(async () => {
      window.__c77.fxl = 0; window.__c77.fxlc = 0;
      const g0 = S.gold;
      stageWin = true;                                   /* 162 ① — 다음 틱이 «보스 격파 = 클리어» 갈래를 탄다 */
      await new Promise(res => setTimeout(res, 2500));
      return { ...window.__c77, gold: Math.round(S.gold - g0) };
    });
    if (r2.fxlc > 0) ok(`살아 있는 전투 발(스테이지 클리어 보너스 +${r2.gold}) 연출 ${r2.fxlc}건 → #fxlc`);
    else fail(`살아 있는 전투 발조차 #fxlc 에 0건 (보너스 +${r2.gold} · 전투 발 라우팅이 죽었다)`);
    if (r2.fxl === 0) ok('#fxl 은 0건 (팝업 위로 새는 연출 없음)'); else fail(`#fxl 에 ${r2.fxl}건 — 팝업 위로 뚫는 연출이 남아 있다`);
    await page.evaluate(() => closeShopPage());
  }

  /* ---------- [E] 회귀: UI 발은 여전히 #fxl(팝업 위) ---------- */
  console.log('[E] UI 발 회귀 — 킬 차단 후 UI 힌트 + 재화 증가');
  {
    const r = await page.evaluate(async () => {
      const realKill = killEnemy; killEnemy = () => {};        /* 전투 획득이 끼어들지 못하게 */
      try {
        /* 직전 전투 비행이 공중에 있으면 FXFLY_MAX 여유가 0 이라 새 묶음이 안 뜬다 — 착지를 기다린다 */
        await new Promise((res) => setTimeout(res, 1000));
        /* 코인 DOM 은 착지 후 바로 제거된다(수명 ~0.6s) — 잔존 수가 아니라 «생성» 을 센다 */
        const made = { fxl: 0, fxlc: 0 };
        const watch = (id) => new MutationObserver((ms) => {
          for (const m of ms) for (const n of m.addedNodes)
            if (n.classList && n.classList.contains('fx-fly')) made[id]++;
        }).observe(document.getElementById(id), { childList: true });
        watch('fxl'); watch('fxlc');
        fxAt(document.getElementById('menub'));                /* UI 힌트(무태그) */
        S.gold += 12345;
        await new Promise((res) => setTimeout(res, 600));
        return { ui: made.fxl, combat: made.fxlc };
      } finally { killEnemy = realKill; }
    });
    if (r.ui > 0) ok(`UI 획득 → #fxl (${r.ui}개, 팝업 위 정상)`); else fail('UI 획득인데 #fxl 에 비행이 없다');
    if (r.combat === 0) ok('#fxlc 에는 안 감'); else fail('UI 획득이 #fxlc 로 갔다');
  }

  /* ---------- 메인 화면(팝업 없음)에서 전투 코인이 보이는지 ---------- */
  console.log('[F] 메인 화면 — 전투 코인 정상 표시(양성 증거)');
  {
    const flying = await page.evaluate(async () => {
      if (typeof closeModal === 'function') closeModal();     /* 앞 검사에서 열린 게 남아 있으면 닫는다 */
      ['shopw', 'dunw', 'relw', 'trw', 'eqw', 'sumw', 'bagw', 'mnw'].forEach((id) => {
        const el = document.getElementById(id); if (el) { el.classList.remove('on'); el.style.display = ''; }
      });
      await new Promise((res) => setTimeout(res, 300));
      /* 착지 대기 후 전투 발 획득을 강제 — 캡처 타이밍에 확실히 공중에 있게 한다 */
      await new Promise((res) => setTimeout(res, 900));
      fxAt(fxWorld(player.x, player.y - 40), 'combat');
      S.gold += 7777;
      await new Promise((res) => setTimeout(res, 160));
      return document.getElementById('fxlc').querySelectorAll('.fx-fly').length;
    });
    if (flying > 0) ok(`팝업 없는 화면에서 전투 코인 ${flying}개 공중(#fxlc 표시 중)`);
    else fail('강제 전투 획득인데 #fxlc 에 공중 코인이 없다');
    for (let i = 0; i < 3; i++) {
      await page.screenshot({ path: path.join(SHOTS, `77-main-combat-f${i}.png`) });
      await page.waitForTimeout(90);
    }
  }

  if (errs.length) errs.forEach((e) => fail(e)); else ok('콘솔 에러 0');
  await ctx.close(); await browser.close();
  console.log('');
  if (fails.length) { console.log(`VERIFY77 FAIL (${fails.length})`); process.exit(1); }
  console.log('VERIFY77 PASS');
})().catch((e) => { console.error(e); process.exit(1); });
