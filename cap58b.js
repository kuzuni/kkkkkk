#!/usr/bin/env node
/* 58 UI 연출 — **강제 합성** 연속 프레임 캡처 (31회차 신설, 4차 폴리시 라운드)
 *
 *   node cap58b.js [라운드] [씬...]     # 기본 r31 · 씬 생략 시 gain quest upg 전부
 *   → docs/review/58-<라운드>-<씬>-<n>.jpg   (cap58.js 와 같은 파일명 규약)
 *
 * ── 왜 새로 만드는가 (30회차가 «31회차가 잡을 것» 1번으로 남긴 항목) ──
 * `cap58.js` 는 CDP `Page.startScreencast` 로 프레임을 받는다. 그 방식은 **부하가 걸리면 낡은
 * 합성을 내보낸다** — 28회차 실측으로 «바닥 56~68ms · 부하 시 488ms» 였고, 30회차의 `p58ai` 가
 * 같은 시각을 `page.screenshot()`(강제 재합성)으로 찍어 **스크린캐스트에는 없는 재화가 스크린샷에는
 * 있다**를 확정했다. 그래서 씬 B 의 ①«머묾 ≤60ms» · ②«가시 개시 +181ms» 가 **28·29·30 세 라운드
 * 연속** 감점됐는데 셋 다 게임이 아니라 캡처의 낡은 레이어였다.
 *
 * ── 설계 ──
 * 표본(프레임)마다 **페이지를 새로 열고**, 목표 시각까지 rAF 로 진행시킨 뒤 **페이지를 통째로 얼리고**
 * `page.screenshot()` 으로 찍는다. 스크린샷이 337~629ms 로 느린 것은 상관없다 — 화면이 정지해 있으므로.
 *   ① rAF 정지        : `requestAnimationFrame = () => 0`  (JS 구동 비행·부유·펀치)
 *   ② CSS 애니 정지    : `document.getAnimations().forEach(a => a.pause())`
 *      ⚠ ②가 없으면 `fxPlus`·`fxDelta`·`fxPop` 은 **컴포지터**가 돌리므로 rAF 를 죽여도 계속 흐르고,
 *        느린 스크린샷 동안 그만큼 더 진행한 그림이 찍힌다(= 새 방식이 스스로 낡은 프레임을 만든다).
 *   ③ 난수 고정        : 표본마다 실행이 다르면 퍼짐 끝점 난수가 달라져 «연속 프레임» 이 튀어 보인다.
 *      30회차가 **선결 조건**으로 못 박은 항목이다. `addInitScript` 로 mulberry32 를 심어 로드 시점부터
 *      결정적으로 만들고, **트리거 직전에 다시 시드**한다 — 트리거 전까지 소비된 난수 개수가 표본마다
 *      달라도(프레임 수가 다르다) 퍼짐 난수는 항상 같은 자리에서 뽑히게.
 *
 * ── 정답표 ──
 * 얼린 시각이 곧 그 프레임의 시각이므로 `cap58.js` 의 «lag 밴드»(28회차)가 **필요 없다**.
 * 얼린 직후 DOM 에서 읽은 값이 그 그림의 값이다 — 한 점으로 적는다.
 */
const path = require('path'), fs = require('fs');
const { pw, launch } = require('./tools/pwlaunch');

const ROUND = process.argv[2] || 'r31';
const ONLY  = process.argv.slice(3);
const OUT   = path.resolve(__dirname, 'docs', 'review');
const URL   = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

/* 창은 `cap58.js` 와 **같은 값**을 쓴다 — 회차 간 비교가 되어야 한다(19·24회차가 정한 창). */
const WANT_FX  = [95, 190, 285, 380, 475, 570, 665, 760, 855, 950, 1045, 1140, 1235, 1330, 1425, 1520];
const WANT_UPG = [95, 175, 255, 335, 425, 530, 660];
const WANT_BY  = { gain: WANT_FX, quest: WANT_FX, upg: WANT_UPG };

const SEED = 0x58C0FFEE;                       /* 회차가 바뀌어도 같은 퍼짐이 나오게 고정한다 */

/* 페이지 로드 시점부터 Math.random 을 결정적으로 만든다 (mulberry32) +
   **세이브를 매 표본 비운다.**
   ⚠ 이 두 줄이 이 하네스의 «결정성» 전부다. 첫 시험 실행에서 표본 17장이 컨텍스트를 공유해
     세이브가 누적됐고(표본마다 1.3초씩 실제로 게임이 돌고 자동 저장된다), 퀘스트 보상이
     설계값 **+400 → 27.2B** 로 불어나 정답표가 통째로 못 쓰게 나왔다. `cap58.js` 는 페이지 한 장을
     끝까지 쓰므로 이 문제가 없었다 — 표본마다 새로 여는 이 방식에만 있는 함정이다. */
const SEED_SRC = (seed) => `(() => { try{ localStorage.clear(); }catch(_){}
  let s = ${seed} >>> 0;
  window.__seed = (v) => { s = (v >>> 0); };
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})()`;

/* 게임을 정지시키고 연출만 남기는 공통 셋업 — `cap58.js` 와 같은 처방(42 교훈 1: 배열을 비우면 파도 클리어) */
async function freezeGame(page){
  await page.evaluate(() => {
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }
    parts.length = 0; nums.length = 0; shots.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
    window.step = () => {};
  });
}

/* 씬별 «트리거 직전» 상태 — `cap58.js` 의 셋업을 그대로 옮긴다(같은 상태를 찍어야 비교가 된다) */
const SETUP = {
  gain: async (page) => {},
  quest: async (page) => {
    await page.evaluate(() => {
      S.gold = 820;
      fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
      const q = QUESTS.find(x => x.id === 'kill');
      S.quest.kill.base = q.get() - questGoal(q);
      openQuest('rep');
    });
    await page.waitForTimeout(450);
  },
  upg: async (page) => {
    await page.evaluate(() => {
      closeModal(); S.gold = 1e13;
      fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
      document.querySelectorAll('#fxl .fx-plus, #fxl .fx-fly').forEach(e => e.remove());
      openTrain();
    });
    await page.waitForTimeout(550);
  },
};

/* 씬별 트리거 — 페이지 «안에서» 목표 시각까지 진행시키고 얼린 뒤, 그 순간의 정답표를 돌려준다.
   ⚠ 트리거와 «얼리기» 사이에 evaluate 왕복이 끼면 안 된다(왕복 지연이 그대로 시각 오차가 된다). */
const TRIG = {
  gain: `const p = fxWorld(player.x + 12, player.y - 20); fxAt(p); S.gold += 128000;`,
  quest: `const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
          if(!b) throw new Error('퀘스트 «보상 받기» 버튼을 찾지 못했다');
          const rc = b.getBoundingClientRect();
          const pe = t => new PointerEvent(t, { bubbles:true, cancelable:true,
            clientX: rc.left + rc.width/2, clientY: rc.top + rc.height/2 });
          b.dispatchEvent(pe('pointerdown')); b.dispatchEvent(pe('pointerup')); b.click();`,
  upg: `const c = document.querySelector('#trw [data-tr]');
        if(!c) throw new Error('훈련 카드를 찾지 못했다');
        c.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));`,
};

/* 한 표본 = 새 페이지 → 셋업 → 트리거 → want ms 까지 rAF → 얼리기 → 스크린샷 */
async function sample(ctx, scene, want, errs){
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${scene}@${want}: ` + e.message));
  page.on('console', m => { if(m.type() === 'error') errs.push(`${scene}@${want}: ` + m.text()); });
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1300);
  await freezeGame(page);
  await page.waitForTimeout(250);
  await SETUP[scene](page);

  const info = await page.evaluate(async ([src, want, seed]) => {
    /* 퍼짐 난수가 표본마다 같은 자리에서 뽑히도록 트리거 직전에 다시 시드한다 */
    window.__seed && window.__seed(seed);
    const t0 = performance.now();
    (new Function(src))();
    /* want=0 은 «트리거 직전» 기준 프레임이므로 이 경로로 오지 않는다(호출부에서 거른다) */
    while(performance.now() - t0 < want) await new Promise(r => requestAnimationFrame(r));
    const real = performance.now() - t0;
    /* ── 얼리기 ── (순서 중요: rAF 를 먼저 죽여야 아래 pause 사이에 한 프레임 더 안 돈다) */
    window.__frz = true;
    window.requestAnimationFrame = () => 0;
    let paused = 0;
    try { for(const a of document.getAnimations()){ try{ a.pause(); paused++; }catch(_){} } }catch(_){}
    /* ── 정답표 (이 그림의 값. 얼린 뒤라 lag 이 없다) ── */
    const pz = k => { try{ const p = fxPill(FXCUR[k]); if(!p) return '--';
        const el = (typeof fxLit !== 'undefined' && fxLit.get(p)) ? fxLit.get(p).p : p;
        const m = (el.style.transform || '').match(/scale\(([\d.]+)\)/);
        return m ? ('x' + (+m[1]).toFixed(2)) : '--'; }catch(_){ return '--'; } };
    return { real: Math.round(real), paused,
      gold: (document.getElementById('goldN') || {}).textContent || '',
      dia:  (document.getElementById('diaN')  || {}).textContent || '',
      fly:  (typeof fxFlies !== 'undefined') ? fxFlies.filter(f => f.ui).length : 0,
      dom:  document.querySelectorAll('#fxl .fx-fly').length,
      plus: document.querySelectorAll('#fxl .fx-plus').length,
      pzg: pz('gold'), pzd: pz('dia') };
  }, [TRIG[scene], want, SEED]);

  const buf = await page.screenshot({ type:'jpeg', quality:88 });
  await page.close();
  return { info, buf };
}

/* 기준 프레임(트리거 «직전») — 트리거를 걸지 않고 얼려서 찍는다 */
async function baseline(ctx, scene, errs){
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${scene}@base: ` + e.message));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1300);
  await freezeGame(page);
  await page.waitForTimeout(250);
  await SETUP[scene](page);
  const info = await page.evaluate(() => {
    window.__frz = true; window.requestAnimationFrame = () => 0;
    try { for(const a of document.getAnimations()){ try{ a.pause(); }catch(_){} } }catch(_){}
    return { real:0, paused:0,
      gold:(document.getElementById('goldN')||{}).textContent || '',
      dia: (document.getElementById('diaN') ||{}).textContent || '',
      fly:0, dom:document.querySelectorAll('#fxl .fx-fly').length,
      plus:document.querySelectorAll('#fxl .fx-plus').length, pzg:'--', pzd:'--' };
  });
  const buf = await page.screenshot({ type:'jpeg', quality:88 });
  await page.close();
  return { info, buf };
}

(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const { chromium } = pw();
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  await ctx.addInitScript(SEED_SRC(SEED));
  const errs = [];
  const scenes = ONLY.length ? ONLY : ['gain', 'quest', 'upg'];

  for(const scene of scenes){
    const want = WANT_BY[scene];
    if(!want) throw new Error('알 수 없는 씬: ' + scene);
    console.log(`\n[${scene}] 강제 합성 ${want.length + 1}장 (기준 1 + 연출 ${want.length})`);
    const rows = [];
    const b = await baseline(ctx, scene, errs);
    fs.writeFileSync(path.join(OUT, `58-${ROUND}-${scene}-1.jpg`), b.buf);
    rows.push(['1', '기준(트리거 직전)', b.info]);
    for(let i = 0; i < want.length; i++){
      const s = await sample(ctx, scene, want[i], errs);
      fs.writeFileSync(path.join(OUT, `58-${ROUND}-${scene}-${i + 2}.jpg`), s.buf);
      rows.push([String(i + 2), `${want[i]}ms (실제 ${s.info.real}ms)`, s.info]);
      process.stdout.write('.');
    }
    console.log('');
    console.log(`  프레임 | 목표 | 골드 | 다이아 | 비행(논리/DOM) | 플로터 | 알약배율(골드/다이아)`);
    for(const [n, lab, i] of rows)
      console.log(`  f${n} | ${lab} | ${i.gold} | ${i.dia} | ${i.fly}/${i.dom} | ${i.plus} | ${i.pzg}/${i.pzd}`);
  }

  await browser.close();
  if(errs.length){ console.log('\n콘솔 에러:'); errs.slice(0, 8).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  console.log(`\nCAP58B OK — docs/review/58-${ROUND}-*.jpg`);
})().catch(e => { console.error('CAP58B FAIL —', e.message); process.exit(1); });
