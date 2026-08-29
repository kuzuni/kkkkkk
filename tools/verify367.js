#!/usr/bin/env node
/* 게이트 — 작업 367 「행운 룰렛 — 하루 5회 중 앞 3회 무료 · 뒤 2회는 광고 시청 후」
 *          (저장소 주인 지시 2026-08-29 — «룰렛은 3번까지 공짜 나머지 2번은 광고봐야 가능하게 하기»)
 *
 *   node tools/verify367.js
 *
 * 지키는 성질: **하루 총량은 5회 그대로이고, 앞 3회는 광고 없이 · 뒤 2회는 ▶AD 를 달고 돈다.**
 *   [A] 상수·재고 — ROUL_FREE 3 + ROUL_AD 2 = ROUL_TRY 5. 재고는 여전히 `S.daily.spins` **하나**다
 *       (두 벌로 쪼개면 «돌릴 수 있다» 판정이 화면마다 갈린다 — 190·294 규약)
 *   [B] 실동작 — 5회를 실제 포인터로 다 돌린다. 회차별 «무료/광고» 갈래 · 보상 지급 · 세이브 반영
 *   [C] 표기 — 안내줄 «n / 5» + 꼬리표 «(무료 3 · 광고 2)» · 버튼 라벨이 3회째 뒤 그 자리에서 넘어간다
 *   [D] 124 — 광고 제거 이용권 보유 시 ▶AD 는 감춰지고 라벨은 «(무료)» 이며 **횟수는 그대로 5회**
 *   [E] 자정 리셋 — 소진 뒤 날짜가 넘어가면 5회로 복귀하고 다시 앞 3회가 무료다
 *   [F] 구 세이브 — 총량이 5로 불변이라 이관이 없다. `spins:4` 인 구 세이브가 «광고 구간 없이 4회»
 *       가 아니라 새 규칙(다음 1회는 무료, 뒤 2회는 광고)으로 **그대로 합법**이어야 한다
 *   [G] 기하 — ▶AD 뱃지가 라벨 잉크·레드닷과 겹치지 않고 버튼 안에 있다 · 버튼 위치 Δ0(레이아웃 불변)
 *   [H] 레드닷(321 회귀) — 광고 구간에서도 켜진다(«지금 누를 수 있다» 가 참이다) · 0회면 꺼진다
 *   [R] 되돌림 시험 — `ROUL_AD = 0` 사본(= 367 이전 «5회 전부 무료»)에서 [B]·[C] 의 광고항이
 *       **빨개져야** 한다. 이 항이 없으면 «이미 참인 것을 굳힌 게이트» 다(338·334 교훈).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → 표기·기하» 판정이라 비평가를 띄우지 않는다.
 * ⚠ 회전은 3.9초다. [B] 는 **진짜 클릭 1회**로 실동작을 못박고(267 [F] 와 같은 자리), 나머지 회차는
 *   `roulSpinTo` 를 즉시 결판 사본으로 갈아 끼워 돈다 — 차감·지급·라벨 복귀 경로는 그대로 지난다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SRC = path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;

/* 룰렛 팝업의 현재 상태를 한 번에 긁는다 — 페이지 안에서만 도는 헬퍼 */
const SNAP = `
window.__rou = function(){
  var ink = function(el){ if(!el) return null; var r=document.createRange(); r.selectNodeContents(el);
    var b=r.getBoundingClientRect(); return [b.left,b.top,b.width,b.height]; };
  var bt = document.getElementById('rouBtn');
  var br = bt ? bt.getBoundingClientRect() : null;
  var lb = bt ? bt.querySelector(':scope>b') : null;
  var ad = bt ? bt.querySelector(':scope>.ad') : null;
  var dt = bt ? bt.querySelector(':scope>.updot') : null;
  var g  = document.getElementById('rouGuide');
  var mx = document.getElementById('rouMix');
  var rect = function(el){ if(!el) return null; var r=el.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; };
  return {
    spins: S.daily.spins,
    free: ROUL_FREE, ad: ROUL_AD, tot: ROUL_TRY,
    adNext: roulAdNext(), adMark: roulAdMark(),
    label: lb ? lb.textContent : null,
    disabled: bt ? bt.disabled : null,
    alert: bt ? bt.classList.contains('alert') : null,
    adon: bt ? bt.classList.contains('adon') : null,
    adShown: ad ? getComputedStyle(ad).display !== 'none' : null,
    adRect: ad ? rect(ad) : null,
    labInk: lb ? ink(lb) : null,
    dotRect: dt ? rect(dt) : null,
    btn: br ? [br.left, br.top, br.width, br.height] : null,
    guide: g ? g.textContent : null,
    mix: mx ? mx.textContent : null,
    guideInk: g ? ink(g) : null,
    guideW: g ? g.getBoundingClientRect().width : null,
    side: (function(){ var i=document.querySelector('#sideL .ibtn[data-pop="roul"]');
                       return i ? i.classList.contains('alert') : null; })(),
    noads: document.getElementById('app').classList.contains('noads'),
    dia: S.dia
  };
};`;

async function boot(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(Object.assign({ gold: 5e7, dia: 12000, best: 40 }, opts.save || {}))]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(opts.url || URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.addScriptTag({ content: SNAP });
  return { ctx, page, errs };
}
/* 회전 대기를 없앤 사본 — `roulSpinTo` 의 «원판이 사라졌으면 즉시 결판»(181) 과 같은 종착점이다 */
const fastSpin = page => page.evaluate(() => { window.roulSpinTo = idx => { roulFinish(idx); }; });

(async () => {
  const browser = await launch(chromium);

  /* ══ [A] 상수·재고 ══════════════════════════════════════════════════════ */
  const b = await boot(browser);
  {
    const c = await b.page.evaluate(() => ({
      free: ROUL_FREE, ad: ROUL_AD, tot: ROUL_TRY,
      def: (typeof DEF === 'function') ? DEF().daily.spins : null,
      keys: Object.keys(S.daily).filter(k => /spin|roul/i.test(k))
    }));
    ok(c.free === 3, '[A] ROUL_FREE = 3 (앞 3회 무료)', 'ROUL_FREE=' + c.free);
    ok(c.ad === 2, '[A] ROUL_AD = 2 (뒤 2회 광고)', 'ROUL_AD=' + c.ad);
    ok(c.tot === 5 && c.tot === c.free + c.ad, '★ [A] 하루 총량은 5회 그대로다 (지시 «총 횟수는 안 바뀐다»)',
       'ROUL_TRY=' + c.tot);
    ok(c.def === c.tot, '[A] 새 세이브 기본값도 총량이다', 'DEF().daily.spins=' + c.def);
    ok(c.keys.length === 1 && c.keys[0] === 'spins',
       '★ [A] 재고는 여전히 한 벌(`S.daily.spins`) — 무료/광고를 두 벌로 쪼개지 않았다 (190·294 규약)',
       'S.daily 안 관련 키: ' + c.keys.join(', '));
  }

  /* ══ [B]·[C]·[H] 5회를 다 돌린다 ═══════════════════════════════════════ */
  const rounds = [];
  {
    await b.page.evaluate(() => { S.pass.noAds = false; syncNoAds(); S.daily.spins = ROUL_TRY;
                                  S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
    await b.page.waitForTimeout(300);

    /* 1회차는 **진짜 클릭 + 진짜 회전**이다(267 [F] 와 같은 자리 — 실동작을 목업으로 대체하지 않는다) */
    const before = await b.page.evaluate(() => window.__rou());
    ok(before.spins === 5 && before.label === '룰렛 돌리기 (무료)' && before.adShown === false,
       '[B1] 1회차 — 라벨 «룰렛 돌리기 (무료)» · ▶AD 없음',
       'spins=' + before.spins + ' · «' + before.label + '» · AD=' + before.adShown);
    await b.page.click('#rouBtn');
    await b.page.waitForTimeout(400);
    const mid = await b.page.evaluate(() => ({ spin: rouSpinning, txt: document.querySelector('#rouBtn>b').textContent,
                                               adShown: getComputedStyle(document.querySelector('#rouBtn>.ad')).display !== 'none' }));
    ok(mid.spin && /돌아가는 중/.test(mid.txt), '[B2] 진짜 클릭으로 회전이 시작됐다 (267 [F] 회귀)', mid.txt);
    ok(mid.adShown === false, '[B3] 회전 중에는 ▶AD 를 끈다 (라벨이 상태 문구라 구간을 말하지 않는다)');
    await b.page.waitForTimeout(5200);
    const r1 = await b.page.evaluate(() => window.__rou());
    rounds.push(r1);
    ok(r1.spins === 4 && r1.dia > 0, '[B4] 1회차가 실제로 소비·지급됐다', 'spins=' + r1.spins + ' · dia=' + r1.dia);

    await fastSpin(b.page);
    /* 남은 4회 — 회차마다 구간을 찍는다 */
    for (let i = 2; i <= 5; i++) {
      const s = await b.page.evaluate(() => window.__rou());
      rounds.push(s);
      await b.page.evaluate(() => spinRoulette());
      await b.page.waitForTimeout(120);
    }
    const end = await b.page.evaluate(() => window.__rou());

    /* 남은 횟수 5·4·3 = 무료 / 2·1 = 광고 */
    const seen = rounds.map(r => ({ spins: r.spins, ad: r.adShown, lab: r.label }));
    const freeRows = seen.filter(r => r.spins > 2), adRows = seen.filter(r => r.spins <= 2 && r.spins > 0);
    ok(freeRows.length >= 2 && freeRows.every(r => r.ad === false && /무료/.test(r.lab)),
       '★ [B5] 남은 4·3회(= 1~3회차)는 광고 없이 돈다',
       seen.filter(r => r.spins > 2).map(r => r.spins + ':' + (r.ad ? 'AD' : '무료')).join(' '));
    ok(adRows.length === 2 && adRows.every(r => r.ad === true && r.lab === '광고 보고 돌리기'),
       '★ [B6] 남은 2·1회(= 4·5회차)는 ▶AD 를 달고 «광고 보고 돌리기» 다',
       seen.filter(r => r.spins <= 2 && r.spins > 0).map(r => r.spins + ':' + (r.ad ? 'AD' : '무료')).join(' '));
    ok(end.spins === 0 && end.disabled === true && /내일 다시/.test(end.label),
       '[B7] 5회를 다 쓰면 잠긴다', 'spins=' + end.spins + ' · «' + end.label + '»');
    ok(end.adShown === false, '[B8] 소진 상태에는 ▶AD 가 없다 (누를 것이 없다)');
    ok(end.alert === false && end.side === false,
       '[H1] 321 회귀 — 소진하면 버튼·사이드 레드닷 둘 다 꺼진다', 'btn=' + end.alert + ' side=' + end.side);
    const adDot = rounds.filter(r => r.spins <= 2 && r.spins > 0);
    ok(adDot.length === 2 && adDot.every(r => r.alert === true),
       '★ [H2] 광고 구간에서도 레드닷은 켜진다 — «지금 누를 수 있다» 가 참이다 (166 규약)',
       adDot.map(r => r.spins + ':' + r.alert).join(' '));

    /* 저장 반영 */
    const saved = await b.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('idle_hunter_save_v4')); } catch (e) { return null; } });
    ok(saved && saved.daily && saved.daily.spins === 0, '[B9] 소진이 세이브에 남는다',
       'localStorage daily.spins=' + (saved && saved.daily ? saved.daily.spins : '?'));
    ok(saved && saved.dia === end.dia, '[B10] 5회분 보상이 세이브에 반영됐다', 'dia=' + end.dia);

    /* ── [C] 표기 ── */
    const g = rounds[0];
    ok(/오늘 남은 횟수/.test(g.guide) && /4 \/ 5/.test(g.guide.replace(/\s+/g, ' ')),
       '[C1] 안내줄은 «오늘 남은 횟수 n / 5» — 총량으로 적는다', g.guide.trim());
    ok(g.mix === '(무료 3 · 광고 2)', '[C2] 꼬리표가 구성을 말한다', String(g.mix));
    ok(g.guideInk && g.guideInk[2] <= g.guideW,
       '[C3] 안내줄이 한 줄에 들어간다 (잉크 ' + px(g.guideInk[2]) + ' ≤ 본문 폭 ' + px(g.guideW) + ')');
    const swap = rounds.find(r => r.spins === 2);
    ok(swap && swap.label === '광고 보고 돌리기' && swap.adon === true,
       '★ [C4] 3회를 다 쓴 **그 자리에서** 라벨·표식이 넘어간다 (팝업을 닫았다 열 필요 없다)',
       swap ? '«' + swap.label + '» adon=' + swap.adon : '표본 없음');
  }

  /* ══ [G] 기하 — 뱃지가 무엇도 안 밟는다 · 버튼은 안 움직인다 ═══════════ */
  {
    await b.page.evaluate(() => { S.daily.spins = 1; uiDirty = true; renderUI(); openRoulette(); });
    await b.page.waitForTimeout(250);
    const s = await b.page.evaluate(() => window.__rou());
    const [bx, by, bw, bh] = s.btn, [ax, ay, aw, ah] = s.adRect;
    const li = s.labInk, dr = s.dotRect;
    ok(s.adShown === true, '[G0] 광고 구간에서 뱃지가 실제로 그려진다');
    ok(ax >= bx && ay >= by && ax + aw <= bx + bw && ay + ah <= by + bh,
       '[G1] 뱃지가 버튼 상자 안에 있다 (잘림 0)',
       '뱃지 x' + px(ax - bx) + '~' + px(ax + aw - bx) + ' / 버튼 폭 ' + px(bw));
    const gap = li[0] - (ax + aw);
    ok(gap > 0, '★ [G2] 뱃지와 라벨 잉크가 안 겹친다', '간격 ' + px(gap) + 'px');
    const ov = !(ax + aw <= dr[0] || dr[0] + dr[2] <= ax || ay + ah <= dr[1] || dr[1] + dr[3] <= ay);
    ok(!ov, '[G3] 뱃지와 321 레드닷이 안 겹친다 (뱃지 좌 · 닷 우)',
       '뱃지 우변 ' + px(ax + aw - bx) + ' · 닷 좌변 ' + px(dr[0] - bx));
    /* 좌우 인셋이 같다 = «321 레드닷의 우 인셋을 거울로» 라는 자리의 근거.
       ⚠ 둘 다 CSS 값은 12 인데 화면에서는 19 로 나온다 — `.ifbtn` 의 7px 테두리 때문에 절대배치
       원점이 padding box 다(1회차에 이 한 칸으로 [G4]·[G5] 가 같이 빨갰다). 여기서는 **보이는 값**을 잰다. */
    const insL = ax - bx, insR = (bx + bw) - (dr[0] + dr[2]);
    ok(Math.abs(insL - insR) < 1.2, '★ [G4] 좌(뱃지)·우(레드닷) 인셋이 같다',
       '좌 ' + px(insL) + ' · 우 ' + px(insR));
    const gapT = ay - by, gapB = by + bh - ay - ah;
    ok(Math.abs(gapT - gapB) < 0.6, '[G5] 세로 가운데', '위 ' + px(gapT) + ' · 아래 ' + px(gapB));

    /* 레이아웃 불변 — 무료 구간(뱃지 없음)과 광고 구간(뱃지 있음)의 버튼 자리가 같다 */
    await b.page.evaluate(() => { S.daily.spins = 5; uiDirty = true; renderUI(); openRoulette(); });
    await b.page.waitForTimeout(250);
    const f = await b.page.evaluate(() => window.__rou());
    ok(Math.abs(f.btn[1] - by) < 0.5 && Math.abs(f.btn[3] - bh) < 0.5,
       '★ [G6] 뱃지가 붙어도 버튼 위치·높이 Δ0 (레이아웃 0px 변경)',
       '무료 y' + px(f.btn[1]) + ' h' + px(f.btn[3]) + ' ↔ 광고 y' + px(by) + ' h' + px(bh));
    ok(f.adShown === false, '[G7] 무료 구간에서는 뱃지가 없다 (190 «그럴 때는 광고 표시 없게»)');
  }

  /* ══ [D] 124 광고 제거 이용권 ══════════════════════════════════════════ */
  {
    await b.page.evaluate(() => { S.pass.noAds = true; syncNoAds(); S.daily.spins = 2;
                                  S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
    await b.page.waitForTimeout(250);
    const s = await b.page.evaluate(() => window.__rou());
    ok(s.noads === true && s.adShown === false,
       '★ [D1] 124 보유 — 광고 구간인데도 ▶AD 가 숨는다 (13·10·01 과 같은 표현)',
       'adNext=' + s.adNext + ' · adMark=' + s.adMark + ' · 표시=' + s.adShown);
    ok(s.label === '룰렛 돌리기 (무료)', '[D2] 라벨도 «(무료)» 로 돌아온다', '«' + s.label + '»');
    ok(s.alert === true && s.disabled === false, '[D3] 누를 수 있는 상태는 그대로다');
    await fastSpin(b.page);
    await b.page.evaluate(() => { spinRoulette(); });
    await b.page.waitForTimeout(150);
    await b.page.evaluate(() => { spinRoulette(); });
    await b.page.waitForTimeout(150);
    const e = await b.page.evaluate(() => window.__rou());
    ok(e.spins === 0 && e.dia > 0,
       '★ [D4] 횟수는 줄지 않는다 — 이용권은 «표식만» 지운다(124 ②)', 'spins=' + e.spins + ' dia=' + e.dia);
    await b.page.evaluate(() => { S.pass.noAds = false; syncNoAds(); });
  }

  /* ══ [E] 자정 리셋 ═════════════════════════════════════════════════════ */
  {
    const s = await b.page.evaluate(() => {
      S.daily.spins = 0; S.daily.date = '1999-01-01';
      dailyCheck();
      openRoulette();
      return window.__rou();
    });
    ok(s.spins === 5, '★ [E1] 날짜가 넘어가면 5회로 복귀한다', 'spins=' + s.spins);
    ok(s.adShown === false && /무료/.test(s.label), '[E2] 복귀 직후는 다시 무료 구간이다', '«' + s.label + '»');
  }

  /* ══ [F] 구 세이브 — 이관 없음 ═════════════════════════════════════════ */
  {
    /* ⚠ 날짜는 게임의 `today()` 형식(YYYY-M-D, 0 패딩 없음)이어야 한다 — ISO 로 적으면
       `dailyCheck()` 가 «어제» 로 읽고 5회로 리셋해 버려 구 세이브 표본이 사라진다(1회차에 그랬다). */
    const d0 = new Date();
    const gToday = d0.getFullYear() + '-' + (d0.getMonth() + 1) + '-' + d0.getDate();
    const b2 = await boot(browser, { save: { gold: 5e7, dia: 100, best: 40,
      daily: { date: gToday, spins: 4 } } });
    const s = await b2.page.evaluate(() => { openRoulette(); return window.__rou(); });
    ok(s.spins === 4, '★ [F1] 구 세이브의 남은 횟수(4)가 그대로 산다 — 이관 코드 0줄',
       'spins=' + s.spins);
    ok(s.adShown === false && /무료/.test(s.label),
       '[F2] 그 4회 중 앞 2회는 무료 · 뒤 2회가 광고다 (새 규칙이 구 값 위에서 그대로 성립)');
    const s2 = await b2.page.evaluate(() => {
      window.roulSpinTo = idx => { roulFinish(idx); };
      spinRoulette(); spinRoulette(); return window.__rou();
    });
    ok(s2.spins === 2 && s2.adShown === true,
       '[F3] 두 번 돌리면 광고 구간으로 넘어간다', 'spins=' + s2.spins + ' AD=' + s2.adShown);
    ok(b2.errs.length === 0, '[F4] 구 세이브 경로 콘솔 에러 0', b2.errs.slice(0, 2).join(' | ') || '없음');
    await b2.ctx.close();
  }

  ok(b.errs.length === 0, '[B11] 콘솔·런타임 에러 0', b.errs.slice(0, 3).join(' | ') || '없음');
  await b.ctx.close();

  /* ══ [R] 되돌림 시험 — «5회 전부 무료» 로 되돌리면 광고항이 빨개진다 ═══ */
  {
    const src = fs.readFileSync(SRC, 'utf8');
    /* 367 **이전** 그대로 되돌린다 — 무료 5 · 광고 0. `ROUL_AD` 만 0 으로 두면 총량이 3 이 돼
       «5회 전부 무료» 가 아니라 다른 게임이 된다(1회차에 그랬다). */
    const rev = src.replace('const ROUL_FREE = 3;', 'const ROUL_FREE = 5;')
                   .replace('const ROUL_AD   = 2;', 'const ROUL_AD   = 0;');
    ok(rev !== src && /ROUL_FREE = 5/.test(rev) && /ROUL_AD   = 0/.test(rev),
       '[R0] 전제 — 사본 편집이 실제로 먹었다 (313 교훈: 전제부터 단언한다)');
    /* ⚠ 사본은 **저장소 루트**에 둔다 — index.html 이 이미지를 상대 경로로 물고 있어
       /tmp 에 두면 리소스가 통째로 404 다(.gitignore 가 360 자리에 같은 주의를 적어 뒀다). */
    const tmp = path.resolve(__dirname, '..', '.v367-neg.html');
    fs.writeFileSync(tmp, rev);
    const b3 = await boot(browser, { url: 'file://' + tmp });
    await fastSpin(b3.page);
    const seen = [];
    await b3.page.evaluate(() => { S.pass.noAds = false; syncNoAds(); S.daily.spins = ROUL_TRY; openRoulette(); });
    await b3.page.waitForTimeout(200);
    for (let i = 0; i < 5; i++) {
      seen.push(await b3.page.evaluate(() => window.__rou()));
      await b3.page.evaluate(() => spinRoulette());
      await b3.page.waitForTimeout(80);
    }
    const adRows = seen.filter(r => r.adShown === true);
    ok(adRows.length === 0,
       '★ [R1] ROUL_AD=0 사본에서는 ▶AD 회차가 **0** 이다 — [B6] 이 실제로 이 축을 잰다는 증거',
       '사본의 AD 회차 ' + adRows.length + '건');
    ok(seen.length === 5 && seen.every(r => /무료/.test(r.label)) && seen[0].spins === 5,
       '[R2] 사본은 5회 내내 라벨이 «(무료)» 다 (수리 전 probe367 이 찍은 그림 그대로)',
       seen.map(r => r.spins).join(','));
    ok(b3.errs.length === 0, '[R3] 사본 경로도 에러 0', b3.errs.slice(0, 2).join(' | ') || '없음');
    await b3.ctx.close();
    fs.unlinkSync(tmp);
  }

  await browser.close();
  console.log('\nVERIFY367 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail + '건' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
