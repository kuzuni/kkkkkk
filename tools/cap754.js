#!/usr/bin/env node
/* 작업 754 — 3회차 «비평 캡처» 하네스 (지시서 [3]-(나) · 주인 명시 «스샷들 스스로들이 다 찍어서»)
 *
 *   node tools/cap754.js            # 3회차 표본 전부
 *   node tools/cap754.js --only 17  # 한 화면만
 *   node tools/cap754.js --set all  # probe754 의 21종 전부
 *
 * ── 왜 «짝» 이 아니라 «다섯 장 한 줄» 인가 ──────────────────────────────────
 * 754 의 증상은 «넓은(= 세로가 짧은) 화면에서 요소가 제각각의 높이로 흩어진다» 다.
 * 한 장만 주면 비평가는 «이 화면이 레퍼런스와 다른가» 를 채점하고(그건 351·폴리시의 축이다),
 * 우리가 물어야 하는 것은 **«화면비가 바뀔 때 이 오버레이가 무너지는가»** 다.
 * ⇒ 411 교훈(«나란히 안 놓으면 어긋남이 안 보인다 — 따로 보면 셋 다 그럴듯하다»)대로
 *   프레임 5종을 **한 장에 나란히** 놓아 «출렁임» 자체를 보이게 만든다.
 *
 * 프레임 5종은 probe754 와 **같은 값**이다(자와 눈이 같은 화면을 봐야 대조가 된다):
 *   1600(9:13.3 및 그보다 넓은 전부 — fit() 이 clamp 한다) · 1841(.shortf 경계 바로 아래) ·
 *   1920(9:16) · 2280(9:19 = 기준) · 2600(clamp 상한)
 *
 * 산출물(전부 `docs/shots/` — .gitignore 가 캡처를 막는다. 증거는 review .md 의 수치다):
 *   754-r<n>-<id>-<frameH>.png   낱장(프레임 좌표 1:1)
 *   754-r<n>-<id>-strip.png      다섯 장을 한 줄로(상변 정렬 · 같은 배율) ← 비평가에게 주는 것
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'shots');
const ARG = process.argv.slice(2);
const argOf = (n, d) => { const i = ARG.indexOf(n); return i >= 0 ? ARG[i + 1] : d; };
const R = argOf('--r', 'r3');
const ONLY = argOf('--only', null);
const SET = argOf('--set', 'r3');
const SCALE = Number(argOf('--scale', '0.42'));   /* 스트립 축소 배율(5장 × 1080 = 5400 → 2268) */

const FRAMES = [1600, 1841, 1920, 2280, 2600];

/* 표본 — probe754 의 HOSTS 와 **같은 오프너 문자열**을 쓴다(자와 눈이 같은 화면을 본다).
   `set` 은 3회차 표본 구분: 'r3' = 이번 회차가 물을 6종 · 'all' = 21종 전부.
   3회차 6종의 근거(review §11 «다음 회차 할 일»):
     17·18 = 1·2회차가 고친 자리 — 눈으로도 나아졌나
     21·19·20·22 = 자가 «무해» 로 읽는 ⚠ 4건 — 자가 세 번 틀린 화면들이라 눈에게 직접 묻는다 */
const HOSTS = [
  { id: '17',  set: 'r3', name: '스탯업(능력 획득)', sel: '#statw', open: `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})` },
  { id: '18',  set: 'r3', name: '패배화면',          sel: '#defw',  open: `openDefeat()` },
  { id: '21',  set: 'r3', name: '도감보너스',        sel: '#collw', open: `openColl21()` },
  { id: '19',  set: 'r3', name: '프로필',            sel: '#pfw',   open: `openProfile()` },
  { id: '20',  set: 'r3', name: '종합스탯',          sel: '#specw', open: `openSpec()` },
  { id: '22',  set: 'r3', name: '퀘스트',            sel: '#modal', open: `openQuest()` },
  { id: '09',  set: 'all', name: '일괄강화결과',     sel: '#upw',   open: `openUpAll([0,1,2].map(i=>({it:SKILLS[i],from:4,to:5})))` },
  { id: '31',  set: 'all', name: '던전클리어',       sel: '#dclw',  open: `openDunClear(DUNGEONS[0],1,false,false)` },
  { id: '01',  set: 'all', name: '오프라인보상',     sel: '#offw',  open: `showOfflineReward(7200,12000,30)` },
  { id: '34',  set: 'all', name: '축복',             sel: '#blsw',  open: `openBless()` },
  { id: '35',  set: 'all', name: '패스',             sel: '#psw',   open: `openPass('stage')` },
  { id: '70',  set: 'all', name: '출석',             sel: '#modal', open: `openAttend()` },
  { id: '29',  set: 'all', name: '룰렛',             sel: '#modal', open: `openRoulette()` },
  { id: '23',  set: 'all', name: '훈련',             sel: '#trw',   open: `openTrain()` },
  { id: '53',  set: 'all', name: '가방',             sel: '#bagw',  open: `openBag()` },
  { id: '33',  set: 'all', name: '재화정보',         sel: '#ciw',   open: `openCurInfo('gold')` },
  { id: '11',  set: 'all', name: '소환확률정보',     sel: '#prbw',  open: `openProbInfo('weapon',1)` },
  { id: '05',  set: 'all', name: '무기팝업',         sel: '#wpnw',  open: `openWeapon(null,'weapon')` },
  { id: '103', set: 'all', name: '채팅',             sel: '#chw',   open: `document.querySelector('#botleft .ubtn[data-util="chat"]').click()` },
  /* 55 = `#cfw`/`openConf()` 다. 1·2회차 표본이 `#svw`/`openSave()` 로 적혀 있어 21종 중 유일하게
     MISSING 이었다 — `#svw` 는 **56 절전 모드**이고 그 오프너 이름은 `openSaver()` 다(review §11-2). */
  { id: '55',  set: 'all', name: '설정',             sel: '#cfw',   open: `openConf()` },
  { id: '56',  set: 'all', name: '절전 모드',        sel: '#svw',   open: `openSaver()` },
];

const pick = () => HOSTS.filter((h) => (ONLY ? (h.id === ONLY) : (SET === 'all' || h.set === SET)));

/* 스트립 — 낱장 다섯을 한 줄로. 이미지 합성만 하는 페이지라 제품과 무관하다. */
const stripHtml = (files, label) => `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#101014;font:600 22px/1.3 system-ui,sans-serif;color:#eee}
  .row{display:flex;align-items:flex-start;gap:14px;padding:14px}
  figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
  img{display:block;border:1px solid #444}
  h1{margin:0;padding:14px 14px 0;font-size:26px}
</style>
<h1>${label}</h1>
<div class="row">${files.map((f) => `<figure><img src="${path.basename(f.file)}" width="${Math.round(1080 * SCALE)}"><figcaption>${f.frameH} (9:${(19 * 2280 / f.frameH).toFixed(1).replace(/\.0$/, '')})</figcaption></figure>`).join('')}</div>`;

async function open1(page, h) {
  await page.evaluate(`try{ ${h.open} }catch(e){ window.__c754 = String(e && e.message || e); }`);
  await page.waitForTimeout(460);
  return page.evaluate(() => window.__c754 || null);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const made = [];
  for (const h of pick()) {
    const shots = [];
    let err = null;
    for (const fh of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(650);
      const e = await open1(page, h);
      if (e && !err) err = e;
      /* 전투 캔버스는 실행마다 다르게 그려져 «같은 화면인가» 를 흐린다 — 비평 축이 아니므로 끈다.
         (probe754 가 같은 이유로 `#view` 를 숨긴다. 딤·팝업은 그대로 둔다.) */
      await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
      const file = path.join(OUT, `754-${R}-${h.id}-${fh}.png`);
      const el = await page.$('#app');
      if (el) await el.screenshot({ path: file });
      else await page.screenshot({ path: file });
      shots.push({ frameH: fh, file });
      await ctx.close();
    }
    /* 스트립 — 낱장을 file:// 로 물어 한 페이지에 올리고 통째로 찍는다 */
    const html = path.join(OUT, `754-${R}-${h.id}-strip.html`);
    fs.writeFileSync(html, stripHtml(shots, `754 ${R} — ${h.id} ${h.name} · 프레임 5종(1080 폭 고정)`));
    const ctx = await browser.newContext({ viewport: { width: Math.round(5 * 1080 * SCALE + 6 * 14 + 40), height: 400 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file://' + html.replace(/\\/g, '/'), { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const strip = path.join(OUT, `754-${R}-${h.id}-strip.png`);
    await page.screenshot({ path: strip, fullPage: true });
    await ctx.close();
    fs.unlinkSync(html);
    made.push({ id: h.id, name: h.name, strip, err });
    console.log(`${h.id} ${h.name}${err ? '  ⚠ ' + err : ''}  → ${path.relative(ROOT, strip)}`);
  }
  await browser.close();
  console.log(`\n캡처 ${made.length} 종 · ${made.length * FRAMES.length} 장 + 스트립 ${made.length} 장`);
  if (made.some((m) => m.err)) { console.error('오프너 오류 있음'); process.exit(1); }
})();
