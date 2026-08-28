/* 작업 58 36회차 — 공통1 회수 판정을 «비평가 BF 의 자»(글자 **잉크** 픽셀)로 다시 잰다.

   [13] 게이트와 `p58ap` 은 **레이아웃 상자**(`.cic` ↔ 라벨 advance 상자)로 잰다. BF 는
   «흰 글자 잉크 458px 중 남은 것 153/164/229px» 처럼 **화소**로 쟀다. 두 자는 서로 다른 것을
   재므로(A1 10회차 «자가 다르면 일치해도 틀린다») 회수 판정은 **두 자 모두** 내야 한다.

   방식 — **같은 프레임을 두 장** 찍는다(얼린 뒤 코인만 껐다 켠다):
     ⓐ 기준선  : 그 시각에서 `.fx-fly` 만 `visibility:hidden` → «코인이 없었다면» 의 라벨
     ⓑ 대상    : 같은 시각·같은 페이지에서 코인을 켠 그림
   두 장을 `tools/p58ar.py` 가 비교해 «원본 잉크 중 색이 바뀐 화소 비율» = 가림률을 낸다.

   ⚠ «클릭 전» 을 기준선으로 쓰면 안 된다 — 수령이 끝나면 버튼 자체가 상태를 바꿔(색·라벨)
     라벨 사각의 화소가 **전부** 달라진다(첫 시험에서 임계 4종 모두 «가림률 100%»). 그것은
     코인이 한 일이 아니다. 짝은 반드시 같은 프레임에서 만든다.

   얼리기는 `cap58b.js` 와 같은 **두 겹**이어야 한다(rAF 정지 + getAnimations().pause()).

   실행: node tools/p58ar.js [출력디렉터리] [시각들ms]
        node tools/p58ar.js /tmp/x 240,280,320
   이어서: python3 tools/p58ar.py <출력디렉터리> */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.resolve(__dirname, '../.p58ar');
const STOPS = (process.argv[3] || '240,280,320').split(',').map(Number);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function open() {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    try { localStorage.clear(); } catch (e) {}
    let s = 7 >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
    QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openQuest();
  });
  await p.waitForTimeout(500);
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length + '');
    if (st === prev && st === '0') break;
    prev = st; await p.waitForTimeout(80);
  }
  return { b, p };
}

/* 라벨 사각(페이지 좌표) — 게이트와 같은 자(텍스트 노드 Range) */
const LABEL = () => {
  const btn = document.getElementById('qAll');
  if (!btn) return null;
  const rg = document.createRange(); let best = null;
  const walk = (n) => { if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width && (!best || r.width > best.width)) best = r; } for (const c of n.childNodes) walk(c); };
  walk(btn);
  return best ? { x: best.left, y: best.top, w: best.width, h: best.height } : null;
};

async function pair(dir, at) {
  const { b, p } = await open();
  const lab = await p.evaluate(LABEL);
  const n = await p.evaluate(async (ms) => {
    const t0 = performance.now();
    document.getElementById('qAll').click();
    while (performance.now() - t0 < ms) await new Promise(r => requestAnimationFrame(r));
    window.requestAnimationFrame = () => 0;                         /* 얼리기 ① rAF */
    document.getAnimations().forEach(a => a.pause());               /* 얼리기 ② 컴포지터 */
    return document.querySelectorAll('.fx-fly').length;
  }, at);
  const clip = { x: lab.x - 8, y: lab.y - 8, width: lab.w + 16, height: lab.h + 16 };
  await p.evaluate(() => document.querySelectorAll('.fx-fly').forEach(e => { e.style.visibility = 'hidden'; }));
  await p.screenshot({ path: path.join(dir, 'base-' + at + '.png'), clip });
  await p.evaluate(() => document.querySelectorAll('.fx-fly').forEach(e => { e.style.visibility = ''; }));
  await p.screenshot({ path: path.join(dir, 'hold-' + at + '.png'), clip });
  await b.close();
  return { lab, n };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const t of STOPS) {
    const r = await pair(OUT, t);
    console.log('t=' + String(t).padStart(4) + 'ms — 코인 ' + r.n + '개 · 라벨(페이지) ' + JSON.stringify(r.lab));
  }
  console.log('\n다음: python3 tools/p58ar.py ' + OUT);
})();
