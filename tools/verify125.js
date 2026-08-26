#!/usr/bin/env node
/* 125 검증 — 화폐 아이콘이 «정해진 이미지 1개» 로 통일됐는가
 *
 *   node tools/verify125.js
 *
 * 지시(PROGRESS 125 «검증 [3]-(가)+(다)») 가 요구한 항목 그대로. 치환형 작업이라 LESSONS 111-① 대로
 * **두 층**으로 나눠 본다 — ⓐ 옛것이 사라졌는가(소스 스캔) · ⓑ 새것이 맞는가(런타임 표시 결과).
 *
 *   [A] 소스 — 주석을 걷어낸 index.html 에 화폐 이모지(🪙💰🥇💎💠🔮🎟️🎫) 0건.
 *       비재화(등급·계급·메달·장비 이름·탭/메뉴 아이콘)는 **줄 단위 허용 목록**으로 명시하고,
 *       목록에 없는 잔여 이모지는 실패다. 허용 목록 자체가 «남겨 둔 것» 의 기록이 된다.
 *   [B] 단일 출처 — `assets/ui/cur-*.svg` 리터럴은 `CUR_ICON` 블록 안에만 있다(문자열에 경로 복제 금지).
 *   [C] 자산 — 화폐 7종 SVG 가 실제로 있고 유효하다(파일 · <svg> · viewBox).
 *   [D] 기하 — HUD `.cbox i` 아이콘 **63×63**(measure/A3) · 41 팝업 재화 바 `.pcb-p>i` **57×57**(measure/41),
 *       옛 이모지 보정(`scaleX`)이 이미지에 남아 있지 않다.
 *   [E] «한 종류» — 전 화면 스윕에서 모인 모든 화폐 아이콘의 src 가 재화별로 **유일**하고 CUR_ICON 과 같다.
 *       특히 골드는 옛 🪙/💰/🥇 3종이 섞여 있던 자리다.
 *   [F] 유출 — 스윕 중 화면 텍스트에 `<img` 0건(= 이미지 태그를 textContent 로 박은 자리 없음) ·
 *       화면 텍스트에 화폐 이모지 0건 · NaN/undefined 0건.
 *   [G] 58 연출 — 재화 비행 파티클이 이모지가 아니라 CUR_ICON 이미지다(fxFly 직후 `.fx-fly>img.cic`).
 *   [H] 입장권 — 던전 계열 3종(골드·다이아·유물)만 쓰인다. 던전 6개의 카드 권종이 계열과 일치.
 *   [I] 콘솔 에러 0건.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const CUR_EMOJI = ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'];
/* 화면 텍스트에 남으면 무조건 실패인 «순수 화폐» 글리프 — 나머지(💎🔮💠🥇)는 등급·계급·탭 아이콘으로도
   쓰이므로 런타임 텍스트로는 못 가른다(그쪽은 [A] 소스 스캔이 줄 단위로 잡는다. LESSONS 111-①). */
const PURE = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'];
const ICONS = ['cur-gold.svg', 'cur-dia.svg', 'cur-relic.svg', 'cur-mile.svg',
               'cur-ticket-gold.svg', 'cur-ticket-dia.svg', 'cur-ticket-relic.svg'];

/* 화폐가 «아닌» 자리 — 남겨 두기로 한 것들. 줄에 이 조각이 있으면 그 줄의 이모지는 통과시킨다.
   (등급·계급·메달·장비 이름·화면 아이콘은 재화 표시가 아니다 — 지시 ③ «비재화 제외 목록») */
const ALLOW = [
  '<span class="ti">',                        /* 탭바 «유물» 탭 아이콘 */
  'data-mn="pass"',                           /* ▦ 메뉴 «패스» 버튼 아이콘 */
  'data-ptab="stage"',                        /* 35 패스 «스테이지» 탭 아이콘 */
  'class="rk-sh s1"',                         /* 54 랭킹 단상 1위 방패 */
  "['\u{1F947}', '\u{1F948}', '\u{1F949}']",  /* 54 랭킹 메달 3종 */
  "{ n:'희귀',", "{ n:'영웅',",               /* 장비 등급 아이콘 */
  "{n:'마력 장벽'", "{n:'무한 결계'", "{n:'행운의 동전 목걸이'",  /* 장비 «이름» 표(재화 아님) */
  "{ n:'골드',     ic:", "{ n:'플래티넘', ic:", "{ n:'다이아',   ic:",  /* 랭킹 계급 엠블럼 */
  "n:'아티팩트 강화석'",                      /* 출석 보상 «아이템»(재화가 아니라 재료 상자) */
];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 주석(/* *​/ · <!-- -->)을 걷어낸 소스 — 주석 속 «옛 이모지» 는 역사 기록이라 남긴다(LESSONS 111-①ⓐ) */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
            .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
}

(async () => {
  /* ---- [A] 소스 스캔 ---- */
  const lines = stripComments(SRC).split('\n');
  const leftovers = [];
  lines.forEach((ln, i) => {
    if (!CUR_EMOJI.some(e => ln.indexOf(e) >= 0)) return;
    if (ALLOW.some(a => ln.indexOf(a) >= 0)) return;
    leftovers.push((i + 1) + ': ' + ln.trim().slice(0, 80));
  });
  ok(leftovers.length === 0, 'A1 소스에 남은 화폐 이모지 0건(주석·비재화 제외)',
     leftovers.length ? leftovers.slice(0, 6).join(' | ') : '0건');
  const allowHits = lines.filter(ln => CUR_EMOJI.some(e => ln.indexOf(e) >= 0)).length;
  ok(allowHits <= ALLOW.length + 4, 'A2 허용 목록이 부풀지 않았다(비재화 줄 ' + allowHits + '개)', String(allowHits));

  /* ---- [B] 단일 출처 ---- */
  const decl = SRC.indexOf('const CUR_ICON = {');
  const declEnd = SRC.indexOf('};', decl);
  const paths = [];
  let idx = -1;
  while ((idx = SRC.indexOf('assets/ui/cur-', idx + 1)) >= 0) paths.push(idx);
  const outside = paths.filter(p => !(p > decl && p < declEnd));
  ok(decl > 0 && outside.length === 0, 'B1 아이콘 경로는 CUR_ICON 블록 안에만 있다',
     '총 ' + paths.length + '건 · 블록 밖 ' + outside.length + '건');
  ok(/function curIc\(/.test(SRC) && /function curIcEl\(/.test(SRC),
     'B2 헬퍼 curIc()/curIcEl() 존재');

  /* ---- [C] 자산 ---- */
  const bad = ICONS.filter(f => {
    const p = path.join(ROOT, 'assets', 'ui', f);
    if (!fs.existsSync(p)) return true;
    const t = fs.readFileSync(p, 'utf8');
    return !/<svg[\s\S]*viewBox="0 0 64 64"/.test(t);
  });
  ok(bad.length === 0, 'C1 화폐 SVG 7종 존재·유효', bad.length ? bad.join(',') : ICONS.length + '개');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await page.waitForTimeout(400);

  /* 재화를 넉넉히 넣어 «부족» 분기가 아닌 정상 표시를 본다 */
  await page.evaluate(() => {
    S.gold = 4.2e12; S.dia = 3.5e6; S.relic = 88000; S.mileage = 12;
    S.dun = S.dun || {}; DUNGEONS.forEach(d => { S.daily.dun[d.id] = DUN_TRY; });
    if (typeof fxDisp === 'object') { fxDisp.gold = S.gold; fxDisp.dia = S.dia; }
    drawHud();
  });

  /* ---- [D] 기하 ---- */
  const D = await page.evaluate(() => {
    const out = { hud: [], tf: [] };
    document.querySelectorAll('.cbox i > img.cic').forEach(im => {
      const r = im.getBoundingClientRect();
      out.hud.push({ k: im.dataset.curIc, w: Math.round(r.width), h: Math.round(r.height) });
      out.tf.push(getComputedStyle(im.parentElement).transform);
    });
    return out;
  });
  ok(D.hud.length === 2 && D.hud.every(x => Math.abs(x.w - 63) <= 2 && Math.abs(x.h - 63) <= 2),
     'D1 HUD 아이콘 63×63 (measure/A3)', D.hud.map(x => x.k + ' ' + x.w + '×' + x.h).join(' · '));
  ok(D.tf.every(t => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'),
     'D2 HUD 아이콘에 옛 scaleX 보정이 남지 않았다', D.tf.join(' | '));

  const P = await page.evaluate(() => {
    openDungeon();
    const out = [];
    document.querySelectorAll('#dunw .pcb-p > i > img.cic').forEach(im => {
      const r = im.getBoundingClientRect();
      out.push({ k: im.dataset.curIc, w: Math.round(r.width), h: Math.round(r.height),
                 tf: getComputedStyle(im.parentElement).transform });
    });
    return out;
  });
  ok(P.length >= 2 && P.every(x => Math.abs(x.w - 57) <= 2 && Math.abs(x.h - 57) <= 2),
     'D3 41 재화 바 아이콘 57×57 (measure/41)', P.map(x => x.k + ' ' + x.w + '×' + x.h).join(' · '));
  ok(P.every(x => x.tf === 'none' || x.tf === 'matrix(1, 0, 0, 1, 0, 0)'),
     'D4 재화 바 아이콘에 옛 scaleX 보정이 남지 않았다', P.map(x => x.tf).join(' | '));

  /* ---- [C2] 이미지가 실제로 뜬다(경로·SVG 문법) ---- */
  const dec = await page.evaluate(async () => {
    const wait = [];
    const out = [];
    for (const k of Object.keys(CUR_ICON)) {
      wait.push(new Promise(res => {
        const im = new Image();
        im.onload = () => { out.push({ k, w: im.naturalWidth, h: im.naturalHeight }); res(); };
        im.onerror = () => { out.push({ k, w: 0, h: 0 }); res(); };
        im.src = CUR_ICON[k];
      }));
    }
    await Promise.all(wait);
    return out;
  });
  ok(dec.length === 7 && dec.every(x => x.w > 0 && x.h > 0),
     'C2 7종이 실제로 디코드된다(경로·SVG 문법)',
     dec.map(x => x.k + ' ' + x.w + '×' + x.h).join(' · '));

  /* ---- [E][F] 전 화면 스윕 ---- */
  const sweep = await page.evaluate(async (PURE) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shut = () => ['closeShopPage','closeDungeon','closeDunDetail','closeRelw','closeMail','closeQuest',
      'closeAttend','closePass','closeBag','closeCurInfo','closeColl21','closeRank','closeBless','closeProfile',
      'closeTrain','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    const steps = [
      ['메인', () => shut()],
      ['영웅', () => goTab('hero')],
      ['훈련', () => openTrain && openTrain()],
      ['던전', () => openDungeon()],
      ['던전세부', () => openDunDetail(DUNGEONS[0])],
      ['유물', () => openRelw && openRelw()],
      ['상점-소환', () => { openShopPage(); shopCat = 'sum'; setShopCatTabs('sum'); renderShopPage(); }],
      ['상점-재화', () => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); }],
      ['우편', () => openMail()],
      ['퀘스트', () => openQuest()],
      ['출석', () => openAttend()],
      ['패스', () => openPass()],
      ['가방', () => openBag()],
      ['재화정보-골드', () => openCurInfo('gold')],
      ['재화정보-다이아', () => openCurInfo('dia')],
      ['재화정보-유물', () => openCurInfo('relic')],
      ['도감', () => openColl21()],
      ['랭킹', () => openRank()],
      ['축복', () => openBless()],
      ['프로필', () => openProfile()],
    ];
    const srcs = {}, leaks = [], emo = [], nan = [], err = [];
    for (const [name, fn] of steps) {
      shut();
      try { fn(); } catch (e) { err.push(name + ': ' + e.message); continue; }
      await sleep(90);
      document.querySelectorAll('img.cic').forEach(im => {
        const r = im.getBoundingClientRect();
        if (!r.width) return;                                  /* 닫힌 오버레이 안은 세지 않는다 */
        (srcs[im.dataset.curIc] = srcs[im.dataset.curIc] || {})[im.getAttribute('src')] = 1;
      });
      const t = document.body.innerText || '';
      if (/<?img\s+class="cic"|cur-[a-z-]+\.svg/.test(t)) leaks.push(name);   /* '<' 가 떨어진 이스케이프본까지 */
      for (const e of PURE) if (t.indexOf(e) >= 0) emo.push(name + ':' + e);
      if (/\bNaN\b|\bundefined\b/.test(t)) nan.push(name);
    }
    return { srcs, leaks, emo, nan, err };
  }, PURE);

  ok(sweep.err.length === 0, 'E0 스윕 20개 화면이 전부 열렸다', sweep.err.join(' | ') || '20/20');
  const multi = Object.entries(sweep.srcs).filter(([, v]) => Object.keys(v).length !== 1);
  ok(multi.length === 0, 'E1 재화마다 아이콘 이미지가 정확히 1종',
     multi.length ? multi.map(([k, v]) => k + '→' + Object.keys(v).join('/')).join(' | ')
                  : Object.keys(sweep.srcs).map(k => k + '=' + Object.keys(sweep.srcs[k])[0].split('/').pop()).join(' · '));
  ok(!!(sweep.srcs.gold && sweep.srcs.gold['assets/ui/cur-gold.svg']),
     'E2 골드는 옛 🪙/💰/🥇 3종 대신 cur-gold.svg 하나', Object.keys(sweep.srcs.gold || {}).join(','));
  ok(!!(sweep.srcs.dia && sweep.srcs.dia['assets/ui/cur-dia.svg']),
     'E3 다이아는 cur-dia.svg 하나', Object.keys(sweep.srcs.dia || {}).join(','));
  ok(!!(sweep.srcs.relic && sweep.srcs.relic['assets/ui/cur-relic.svg']),
     'E4 유물조각은 cur-relic.svg 하나', Object.keys(sweep.srcs.relic || {}).join(','));
  ok(sweep.leaks.length === 0, 'F1 화면 텍스트에 아이콘 마크업 0건(textContent 유출 없음)',
     sweep.leaks.join(',') || '0건');
  ok(sweep.emo.length === 0, 'F2 화면 텍스트에 «순수 화폐» 이모지(🪙💰🎟️🎫) 0건',
     sweep.emo.slice(0, 6).join(',') || '0건');
  ok(sweep.nan.length === 0, 'F3 화면 텍스트에 NaN/undefined 0건', sweep.nan.join(',') || '0건');

  /* ---- [G] 58 파티클 ---- */
  const G = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ['closeShopPage','closeDungeon','closeDunDetail','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    document.querySelectorAll('#fxl .fx-fly').forEach(e => e.remove());
    fxFly({ x: 540, y: 1200 }, 'gold', 12345);
    for (let i = 0; i < 40 && !document.querySelector('#fxl .fx-fly'); i++) await sleep(16);
    const el = document.querySelector('#fxl .fx-fly');
    if (!el) return { n: 0 };
    const im = el.querySelector('img.cic');
    const r = im ? im.getBoundingClientRect() : null;
    return { n: document.querySelectorAll('#fxl .fx-fly').length,
             src: im ? im.getAttribute('src') : null,
             txt: el.textContent, w: r ? Math.round(r.width) : 0 };
  });
  ok(G.src === 'assets/ui/cur-gold.svg', 'G1 재화 비행 파티클이 CUR_ICON 이미지', String(G.src) + ' ×' + G.n);
  ok(G.txt === '', 'G2 파티클에 이모지 글자가 남지 않았다', JSON.stringify(G.txt));

  /* ---- [H] 입장권 3종 ---- */
  const H = await page.evaluate(() => {
    openDungeon();
    const want = { gold: 'cur-ticket-gold.svg', dia: 'cur-ticket-dia.svg' };
    const got = DUNGEONS.map(d => {
      const m = String(DUN_UI[d.id].tk).match(/cur-ticket-[a-z]+\.svg/);
      return { id: d.id, tk: m ? m[0] : null,
               want: want[d.id] || 'cur-ticket-relic.svg' };
    });
    return got;
  });
  const tkBad = H.filter(x => x.tk !== x.want);
  ok(tkBad.length === 0, 'H1 던전 6개의 입장권이 계열 3종과 일치',
     tkBad.length ? tkBad.map(x => x.id + '→' + x.tk).join(',') : H.map(x => x.id + ':' + x.tk.replace('cur-ticket-', '').replace('.svg', '')).join(' · '));
  ok(new Set(H.map(x => x.tk)).size === 3, 'H2 입장권 종류는 3종뿐', [...new Set(H.map(x => x.tk))].join(','));

  /* ---- [J] 제목 자리 금지 규칙 ----
     showModal 은 `<h2>` 를 **textContent** 로 넣고 앞머리 기호를 떼기까지 한다(«레퍼런스 헤더에는 이모지가 없다»).
     우편 제목 `m.t` 도 같은 정규식을 쓴다. 그래서 그 두 자리에 아이콘 마크업을 붙이면 **글자로 샌다**. */
  const titleBad = [];
  const clean = stripComments(SRC);
  const reTitle = /popup\(\s*curIc\(/g;
  if (reTitle.test(clean)) titleBad.push('popup() 제목에 curIc()');
  if (/\bt:\s*curIc\(/.test(clean)) titleBad.push('우편 t: 에 curIc()');
  ok(titleBad.length === 0, 'J1 모달·우편 «제목» 자리에는 아이콘을 넣지 않는다', titleBad.join(' | ') || '0건');

  /* ---- [I] 콘솔 ---- */
  ok(errs.length === 0, 'I1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY125 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
