#!/usr/bin/env node
/* 작업 150 게이트 — «골드만 A/B/C 알파벳 단위, 나머지 숫자는 전부 숫자 그대로».
   실행: node tools/verify150.js

   저장소 주인 지시(2026-08-27): «골드 빼고 나머지 숫자들은 A B C 단위 안 쓰고 숫자 그대로».
   111(알파벳 단위 전면 도입)의 부분 되돌림이다 — 111 의 단위표·자릿수 규칙은 **골드에** 살아 있고
   (`tools/verify111.js` 가 계속 지킨다), 이 게이트는 «골드가 아닌 수» 쪽을 본다.

   지시서 [3]-(가) 기계적 작업 — 비평가 없음. 이 게이트가 보는 것:
     ① 소스   — 알파벳 단위표(`SUF[`)를 쓰는 함수는 `fmtG`·`fmtShort` 둘뿐 ·
                 `fmtCur` 디스패처 존재 · 골드 아이콘 옆에서 `fmt(` 를 부르는 자리 0건
     ② 표기층 — `fmt`(쉼표) · `fmtG`(알파벳) · `fmtCur`(재화별 분기) · `fmtShort`(배지) 단위 결과
     ③ 런타임 — 알려진 값을 넣고 **화면에 실제로 찍힌 문자열**을 읽는다(111 교훈 1 의 ⓑ 층:
                 «옛 규약이었다면 다른 글자가 나오는» 값을 고른다. 다이아 2.36e9 는
                 옛 규약이면 «2.36C», 새 규약이면 «2,360,000,000»)
     ④ 스윕   — 탭·사이드·▦메뉴·상점·영웅 서브탭을 열어 **골드가 아닌 자리에 알파벳 접미사가
                 한 건도 없는지** 확인한다(«숫자+대문자 1~2자» 만인 텍스트 노드를 전부 수집)
     ⑤ 폭     — «숫자 그대로» 는 자릿수가 자란다. 방치형 중후반 상태에서 숫자 그릇 넘침 0건
                 (`fitNum` 폭 클램프가 도는지). 한계는 review 문서 §4 에 적었다.
     ⑥ 회귀   — 가방 보유량이 `| 0`(int32) 로 잘려 음수가 되던 것(150 에서 발견·수정)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const FILE = 'file://' + SRC;

const R = [];
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });

(async () => {
  /* ── ① 소스 스캔 ───────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  /* 알파벳 단위표를 읽는 자리는 골드 표기(`fmtG`) 3곳 + 배지(`fmtShort`) 1곳뿐이어야 한다.
     새 코드가 `SUF[` 를 하나 더 쓰면 «골드 아닌 수가 다시 접히는» 회귀다. */
  eq('① SUF[ 참조 수(fmtG 3 + fmtShort 1)', (src.match(/SUF\[/g) || []).length, 4);
  yes('① fmtG(골드 전용 알파벳 단위) 정의', /function fmtG\(n\)\{/.test(src));
  yes('① fmt(기본 = 숫자 그대로 · 쉼표) 정의', /function fmt\(n\)\{[\s\S]{0,800}toLocaleString\('en-US'\)/.test(src));
  yes('① fmtCur(재화별 분기) 정의', /const fmtCur = \(k, n\) => k === 'gold' \? fmtG\(n\) : fmt\(n\);/.test(src));
  /* 골드 아이콘 바로 옆에서 접지 않는 `fmt(` 를 부르면 골드가 «숫자 그대로» 로 새는 것이다. */
  const goldRaw = (src.match(/curIc\('gold'\)[^\n]{0,12}\bfmt\(/g) || []);
  eq('① 골드 아이콘 옆 fmt( 호출(=fmtG 여야 한다)', goldRaw.length, 0);
  yes('① 골드 표기 호출부가 fmtG 로 갈라져 있다(≥ 12곳)', (src.match(/fmtG\(/g) || []).length >= 12);
  /* ⑥ 가방 보유량 int32 절단 회귀 */
  eq('⑥ 가방 재화 행의 `| 0` 절단', (src.match(/q:S\.(gold|dia|relic|mileage) \| 0/g) || []).length, 0);

  /* ── 페이지 ────────────────────────────────────────────────────── */
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  /* ── ② 표기층 단위 결과 ── */
  const RAW = [
    [0, '0'], [9.5, '9.5'], [999, '999'],
    [1000, '1,000'], [1234, '1,234'], [12000, '12,000'],
    [3.3e6, '3,300,000'], [2.36e9, '2,360,000,000'], [4.2e15, '4,200,000,000,000,000'],
  ];
  const rawGot = await p.evaluate(cs => cs.map(c => fmt(c[0])), RAW);
  RAW.forEach((c, i) => eq('② fmt(' + c[0] + ') 숫자 그대로', rawGot[i], c[1]));
  eq('② fmt(Infinity)', await p.evaluate(() => fmt(Infinity)), '∞');
  /* 1e21 이상은 Number 가 지수 표기로 새므로 문자열 경로로 끊는다 */
  eq('② fmt(1e21) 지수 표기로 새지 않음', await p.evaluate(() => fmt(1e21)),
    '1,000,000,000,000,000,000,000');
  const GOLD = [[999, '999'], [5.07e3, '5.07A'], [538e3, '538A'], [2.36e9, '2.36C'], [4.2e15, '4.20E']];
  const gGot = await p.evaluate(cs => cs.map(c => fmtG(c[0])), GOLD);
  GOLD.forEach((c, i) => eq('② fmtG(' + c[0] + ') 알파벳 단위', gGot[i], c[1]));
  const cur = await p.evaluate(() => [fmtCur('gold', 2.36e9), fmtCur('dia', 2.36e9),
    fmtCur('rel', 2.36e9), fmtCur('', 2.36e9), fmtShort(2.36e9, 'gold'), fmtShort(2.36e9)]);
  eq('② fmtCur(gold) = 알파벳', cur[0], '2.36C');
  eq('② fmtCur(dia) = 숫자 그대로', cur[1], '2,360,000,000');
  eq('② fmtCur(rel) = 숫자 그대로', cur[2], '2,360,000,000');
  eq('② fmtCur(키 없음) = 숫자 그대로', cur[3], '2,360,000,000');
  eq("② fmtShort(n,'gold') = 짧은 알파벳", cur[4], '2.4C');
  eq('② fmtShort(n) = 숫자 그대로', cur[5], '2,360,000,000');

  /* ── ③ 런타임 표시면 ── */
  const run = await p.evaluate(() => {
    S.gold = 4.2e15; S.dia = 2.36e9; S.relic = 3.3e6;
    /* 111 교훈 2 — HUD 알약은 renderUI 가 아니라 drawHud 가 그리고, 58 롤링 캐시를 거친다 */
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    markDirty(); drawHud(); renderUI();
    const t = id => ((document.getElementById(id) || {}).textContent || '').trim();
    dmgNum(100, 100, 1.234e7, false);
    return { gold: t('goldN'), dia: t('diaN'), cp: t('cpN'),
             dmg: nums.length ? nums[nums.length - 1].v : '' };
  });
  eq('③ HUD 골드 4.2e15 (알파벳 = 111 규약 유지)', run.gold, '4.20E');
  eq('③ HUD 다이아 2.36e9 (숫자 그대로 · 옛 규약이면 «2.36C»)', run.dia, '2,360,000,000');
  /* 188(주인 정정 2026-08-27) — 전투 수치(데미지·체력·전투력·DPS)는 골드와 같이 **알파벳 단위**로 옮겼다.
     150 이 여기서 «숫자 그대로» 를 단언하던 두 줄은 그 지시를 따라 뒤집는다(값 단언은 verify188). */
  /* 초기 상태의 cp 는 세 자리(1000 미만)라 두 표기층이 같은 글자를 낸다 — «알파벳이 붙어 있다» 로는
     못 가른다. 갈리는 지점은 **1000 이상에서 쉼표를 찍느냐** 다(fmt 는 «1,234», fmtB 는 «1.23A»). */
  yes('③ HUD 전투력 «' + run.cp + '» 쉼표 원시 표기 아님(188 — 전투 수치)',
    /^\d{1,3}(\.\d+)?[A-Z]{0,2}$/.test(run.cp));
  eq('③ 전투 데미지 1.234e7 (188 — 알파벳 단위)', run.dmg, '12.3B');

  /* ── ④ 스윕 — 골드·전투 수치가 아닌 자리에 알파벳 접미사 0건 ── */
  const sweep = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 4.2e15; S.dia = 2.36e9; S.relic = 3.3e6; S.mileage = 12;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    markDirty(); drawHud();
    /* «숫자 + 대문자 1~2자» 로만 이루어진 텍스트 = 접힌 단위 표기. 골드 자리만 허용된다.
       (시간 «3시간 25분»·«STAGE 37»·«MAX» 처럼 숫자와 글자가 섞인 문장은 이 꼴이 아니다) */
    const UNIT = /^\d{1,3}(\.\d+)?[A-Z]{1,2}$/;
    /* 골드를 그리는 자리(=알파벳 단위가 정상인 곳) */
    const GOLDSEL = ['#goldN', '.pcb-g>b', '#svG', '#ofrAmt', '.tr-cost', '.uc'];
    /* 188(주인 정정 2026-08-27) — 전투 수치도 알파벳 단위다. 데미지·체력·공격력·재생·DPS·전투력을
       그리는 자리는 이 스윕의 «위반» 이 아니다(그쪽 값 단언은 verify188 이 따로 한다). */
    const WARSEL = ['#cpN', '#hpT', '#bossHpN', '#dunBarN', '#dgdAmt', '.eqst', '.sp.tk',
                    '.spc-row .vl', '.ch-ccp', '.uv', '.tr-card .cv', '#trCards .cv'];
    const isGold = el => GOLDSEL.concat(WARSEL).some(s => el.matches && (el.matches(s) || el.closest(s)))
      /* 아이콘이 골드면 그 옆 수치도 골드다 — 카드/행 단위로 본다 */
      || !!(el.closest('.bg53-c,.ml-i,.dcl-w,.dgd-w,.ifr') || {}).querySelector?.('[data-cur-ic="gold"]');
    const found = [];
    const scan = label => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const s = (n.nodeValue || '').trim();
        if (!UNIT.test(s)) continue;
        const el = n.parentElement; if (!el) continue;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;   /* 숨은 노드 */
        if (isGold(el)) continue;
        found.push(label + ' «' + s + '» ' + (el.id || el.className || el.tagName));
      }
    };
    const opened = [];
    const click = async sel => {
      const el = document.querySelector(sel); if (!el) return false;
      try { el.click(); } catch (e) { return false; }
      await sleep(200); return true;
    };
    scan('메인');
    for (const t of [].map.call(document.querySelectorAll('.tab[data-t]'), e => e.dataset.t)) {
      if (!await click('.tab[data-t="' + t + '"]')) continue;
      opened.push('tab:' + t); scan('tab:' + t);
      /* 상점은 카테고리 4종을 더 본다 */
      if (t === 'shop')
        for (const c of [].map.call(document.querySelectorAll('#shopCats .shp-ct[data-cat]'), e => e.dataset.cat)) {
          if (await click('#shopCats .shp-ct[data-cat="' + c + '"]')) { opened.push('shop:' + c); scan('shop:' + c); }
        }
      if (t === 'hero')
        for (const k of [].map.call(document.querySelectorAll('#eqTabs [data-eqtab]'), e => e.dataset.eqtab)) {
          if (await click('#eqTabs [data-eqtab="' + k + '"]')) { opened.push('hero:' + k); scan('hero:' + k); }
        }
      await click('.tab[data-t="' + t + '"]');
    }
    for (const k of [].map.call(document.querySelectorAll('.side .ibtn[data-pop]'), e => e.dataset.pop)) {
      if (!await click('.side .ibtn[data-pop="' + k + '"]')) continue;
      opened.push('side:' + k); scan('side:' + k);
      await click('.side .ibtn[data-pop="' + k + '"]');
    }
    if (await click('#menub')) {
      for (const k of [].map.call(document.querySelectorAll('#mnw [data-mn]'), e => e.dataset.mn)) {
        if (!await click('#mnw [data-mn="' + k + '"]')) continue;
        opened.push('menu:' + k); scan('menu:' + k);
        await click('#menub');
      }
    }
    /* 33 재화 정보 팝업 — 재화별 보유량 표기 */
    const ci = {};
    for (const k of ['gold', 'dia', 'relic']) {
      try { openCurInfo(k); } catch (e) { continue; }
      await sleep(150);
      ci[k] = (document.getElementById('ciHave') || {}).textContent || '';
      try { closeCurInfo(); } catch (e) {}
    }
    /* 53 가방 — 재화 4행의 배지 */
    let bag = [];
    try { openBag(); } catch (e) {}
    await sleep(250);
    scan('bag');
    bag = [].map.call(document.querySelectorAll('#bagGrid .bg53-c'), c => ({
      n: c.dataset.bagn, q: (c.querySelector('.ifq') || {}).textContent || '',
    })).slice(0, 6);
    return { found: found.slice(0, 12), n: found.length, opened: opened.length, ci, bag };
  });
  yes('④ 스윕이 실제로 화면을 열었다(≥ 12곳)', sweep.opened >= 12);
  eq('④ 스윕 ' + sweep.opened + '곳 · 골드 아닌 자리의 알파벳 단위',
    sweep.found.join(' / ') || 'none', 'none');
  eq('③ 33 재화정보 골드(알파벳)', (sweep.ci.gold || '').trim(), '보유: 4.20E');
  eq('③ 33 재화정보 다이아(숫자 그대로)', (sweep.ci.dia || '').trim(), '보유: 2,360,000,000');
  eq('③ 33 재화정보 유물조각(숫자 그대로)', (sweep.ci.relic || '').trim(), '보유: 3,300,000');
  const bagOf = n => (sweep.bag.find(b => b.n === n) || {}).q;
  eq('③ 53 가방 골드 배지(짧은 알파벳)', bagOf('골드'), '4.2E');
  eq('③ 53 가방 다이아 배지(숫자 그대로)', bagOf('다이아'), '2,360,000,000');
  eq('⑥ 53 가방 다이아 2.36e9 가 음수로 안 잘린다', /^-/.test(bagOf('다이아') || '') , false);

  /* ── ⑤ 폭 클램프 — 방치형 중후반 상태에서 숫자 그릇 넘침 0건 ── */
  const fitw = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 4.2e12; S.dia = 1.8e7; S.relic = 9.6e5;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    markDirty(); drawHud();
    try { closeBag(); } catch (e) {}
    await sleep(60);
    try { openBag(); } catch (e) {}
    await sleep(250);
    const inkW = el => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect().width; };
    const over = [];
    const look = (el, box, label) => {
      if (!el || !box) return;
      const bw = box.getBoundingClientRect().width, iw = inkW(el);
      if (iw > bw + 1) over.push(label + ' 잉크 ' + Math.round(iw) + ' > 그릇 ' + Math.round(bw));
    };
    look(document.getElementById('diaN'), document.getElementById('diaN'), 'HUD 다이아');
    look(document.getElementById('cpN'), document.getElementById('cpN'), 'HUD 전투력');
    document.querySelectorAll('#bagGrid .bg53-c>.ifq').forEach((e, i) =>
      look(e, e.closest('.bg53-c'), '가방 배지 ' + i));
    return over;
  });
  eq('⑤ 중후반 상태(골드 4.2e12·다이아 1.8e7·유물 9.6e5) 숫자 넘침',
    fitw.join(' / ') || 'none', 'none');

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 120) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const bad = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY150 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
