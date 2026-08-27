/* 작업 159 — «영웅 팝업은 열 때마다 장비 탭에서 시작한다» 게이트
 *
 * 저장소 주인 지시(2026-08-27): «영웅 팝업 처음 열었을 때 장비 탭이 선택돼 있어야 함».
 * 지금까지는 서브탭 이동마다 `S.heroTab` 에 저장하고 로드 때 복원해서 **마지막 본 탭이 부활**했다.
 *
 * 이 게이트가 지키는 불변식:
 *   ① 첫 진입 — 영웅 탭을 누르면 `heroTab==='eq'` · 06 장비 시트(#eqw) 가 뜬다
 *   ② 열려 있는 동안의 서브탭 전환은 그대로 산다(장비↔스킬↔동료↔코스튬)
 *   ③ 닫았다 다시 열면 장비 · 다른 탭 갔다 와도 장비 (재진입 4경로)
 *   ④ 세이브에 `heroTab` 키가 안 남는다(저장·복원 폐기) — 리로드 후에도 장비
 *   ⑤ 예외는 가이드 미션 이동(gmHero) 하나뿐이고, 그 예약은 **1회만** 산다
 *   ⑥ 소스에 `S.heroTab` 대입·DEF 키가 0건 · 콘솔 에러 0건
 *
 * 실행: node tools/verify159.js  → 마지막 줄이 `VERIFY159 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

const FILE = path.resolve(__dirname, '..', 'index.html');

/* 화면 상태를 한 벌로 뜬다 — 플래그(heroTab)만 보면 «플래그는 바뀌는데 화면은 안 바뀌는» 함정에
   빠진다(LESSONS «상태 플래그도 같은 함정»). 그래서 본문 id 와 #eqw 표시를 같이 읽는다. */
const SNAP = `() => ({
  heroTab, curTab, panelOpen,
  eqw:  document.getElementById('eqw').classList.contains('on'),
  bSk:  document.getElementById('bSk').classList.contains('on'),
  bPet: document.getElementById('bPet').classList.contains('on'),
  bCos: document.getElementById('bCos').classList.contains('on'),
  panelShown: getComputedStyle(document.getElementById('panel')).display !== 'none',
  saved: (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } })(),
})`;

const clickTab = async (page, t) => {
  await page.evaluate(k => document.querySelector('.tab[data-t="' + k + '"]').click(), t);
  await page.waitForTimeout(120);
};
/* 문자열을 그대로 넘기면 playwright 는 «식» 으로 평가한다 — `() => …` 는 함수 객체라 undefined 가
   돌아온다. 즉시호출로 감싸 «값» 을 돌려받는다. */
const snap = page => page.evaluate('(' + SNAP + ')()');

(async () => {
  /* ---------- ⑥-1 소스 검사 (브라우저 없이) ---------- */
  const SRC = fs.readFileSync(FILE, 'utf8');
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const CODE = stripComments(SRC);
  console.log('\n[6] 소스 — 저장·복원 경로 폐기');
  const assigns = (CODE.match(/S\.heroTab\s*=/g) || []).length;
  ok('`S.heroTab =` 대입 0건', assigns === 0, assigns + '건');
  const reads = (CODE.match(/S\.heroTab(?!\s*=)/g) || []).length;
  ok('`S.heroTab` 읽기 0건', reads === 0, reads + '건');
  ok('DEF() 에 heroTab 키 없음', !/heroTab\s*:/.test(CODE), /heroTab\s*:/.test(CODE) ? '남아 있음' : '없음');
  ok('gmHero 는 heroSubReq 로 예약한다',
    /function gmHero\(sub\)\{[^}]*heroSubReq\s*=\s*sub[^}]*goTab\('hero',\s*true\)/.test(CODE.replace(/\s+/g, m => m.includes('\n') ? '\n' : ' ')) ||
    /heroSubReq = sub; goTab\('hero', true\)/.test(CODE), 'gmHero 본문');
  ok('goTab hero 분기에 리셋이 있다', /k === 'hero'\s*\)\s*\{\s*heroTab\s*=/.test(CODE), 'goTab');

  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + FILE);
    await page.waitForTimeout(900);

    /* ---------- ① 첫 진입 ---------- */
    console.log('\n[1] 첫 진입 — 영웅 탭을 누르면 장비');
    const s0 = await snap(page);
    ok('시작은 패널 닫힘(02 기본 메인)', s0.panelOpen === false, JSON.stringify({ panelOpen: s0.panelOpen }));
    await clickTab(page, 'hero');
    const s1 = await snap(page);
    ok('heroTab === eq', s1.heroTab === 'eq', s1.heroTab);
    ok('06 장비 시트(#eqw) 열림', s1.eqw === true, String(s1.eqw));
    ok('패널 본문은 접힘(장비는 #panel 본문이 없다)', s1.panelShown === false, String(s1.panelShown));

    /* ---------- ② 열려 있는 동안의 서브탭 전환 ---------- */
    console.log('\n[2] 열려 있는 동안의 서브탭 전환은 그대로 산다');
    for (const [k, body] of [['sk', 'bSk'], ['pet', 'bPet'], ['cos', 'bCos']]) {
      await page.evaluate(x => heroSubGo(x), k);
      await page.waitForTimeout(120);
      const s = await snap(page);
      ok('heroSubGo(' + k + ') → heroTab=' + k, s.heroTab === k, s.heroTab);
      ok('  본문 #' + body + ' 활성 · #eqw 닫힘', s[body] === true && s.eqw === false,
        body + '=' + s[body] + ' eqw=' + s.eqw);
    }
    await page.evaluate(() => heroSubGo('eq'));
    await page.waitForTimeout(120);
    ok('heroSubGo(eq) → 장비 시트 복귀', (await snap(page)).eqw === true, 'eqw');

    /* ---------- ③ 재진입 4경로 ---------- */
    console.log('\n[3] 재진입 — 어느 경로로 와도 장비');
    /* (a) 서브탭을 스킬로 두고 → 같은 탭 재클릭(닫기) → 다시 열기 */
    await page.evaluate(() => heroSubGo('sk'));
    await page.waitForTimeout(120);
    await clickTab(page, 'hero');                                   /* 닫기 */
    const closed = await snap(page);
    ok('(a) 영웅 탭 재클릭 = 닫힘', closed.panelOpen === false && closed.eqw === false,
      'panelOpen=' + closed.panelOpen + ' eqw=' + closed.eqw);
    await clickTab(page, 'hero');                                   /* 다시 열기 */
    const a = await snap(page);
    ok('(a) 다시 열면 장비', a.heroTab === 'eq' && a.eqw === true, a.heroTab + ' eqw=' + a.eqw);

    /* (b) 스킬로 두고 → 다른 탭(성장) → 영웅 */
    await page.evaluate(() => heroSubGo('sk'));
    await page.waitForTimeout(120);
    await clickTab(page, 'grow');
    await page.waitForTimeout(200);
    await page.evaluate(() => { closeTrain(); });                   /* 23 훈련 시트를 걷고 */
    await clickTab(page, 'hero');
    const b = await snap(page);
    ok('(b) 다른 탭 갔다 와도 장비', b.heroTab === 'eq' && b.eqw === true, b.heroTab + ' eqw=' + b.eqw);

    /* (c) [data-go] 이동(forceOpen) — 코스튬으로 두고 강제 진입 */
    await page.evaluate(() => heroSubGo('cos'));
    await page.waitForTimeout(120);
    await page.evaluate(() => { panelOpen = false; syncPanel(); goTab('hero', true); });
    await page.waitForTimeout(150);
    const c = await snap(page);
    ok('(c) goTab(hero,true) 강제 진입도 장비', c.heroTab === 'eq' && c.eqw === true, c.heroTab + ' eqw=' + c.eqw);

    /* ---------- ④ 세이브에 안 남는다 ---------- */
    console.log('\n[4] 세이브 — heroTab 키가 안 남는다');
    await page.evaluate(() => heroSubGo('pet'));
    await page.waitForTimeout(120);
    const sv = await page.evaluate(() => { save(); try { return JSON.parse(localStorage.getItem(KEY)); } catch (_) { return {}; } });
    ok('저장된 세이브에 heroTab 키 없음', !('heroTab' in sv), Object.keys(sv).includes('heroTab') ? 'heroTab=' + sv.heroTab : '없음');
    ok('eqTab(시트 내부 탭)은 그대로 남는다', 'eqTab' in sv, String(sv.eqTab));
    /* 구 세이브 호환 — heroTab:'cos' 가 박힌 세이브를 심고 load() 해도 복원되지 않아야 한다 */
    const oldsv = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem(KEY)); d.heroTab = 'cos';
      localStorage.setItem(KEY, JSON.stringify(d));
      load();                                    /* load() 는 값을 안 돌려준다(153 교훈 1) — S 를 본다 */
      panelOpen = false; syncPanel(); goTab('hero', true);
      return { heroTab, sHero: S.heroTab, eqw: document.getElementById('eqw').classList.contains('on') };
    });
    ok('구 세이브 heroTab=cos 를 무시하고 장비', oldsv.heroTab === 'eq' && oldsv.eqw === true,
      oldsv.heroTab + ' eqw=' + oldsv.eqw);

    /* 리로드 라운드트립 — 재접속해도 장비 */
    await page.evaluate(() => { heroSubGo('sk'); save(); });
    await page.waitForTimeout(120);
    await page.reload();
    await page.waitForTimeout(900);
    await clickTab(page, 'hero');
    const rl = await snap(page);
    ok('재접속(리로드) 후 첫 진입도 장비', rl.heroTab === 'eq' && rl.eqw === true, rl.heroTab + ' eqw=' + rl.eqw);

    /* ---------- ⑤ 가이드 미션 예외 ---------- */
    console.log('\n[5] 예외 — 가이드 미션 이동만 서브탭을 지정한다');
    await page.evaluate(() => gmHero('sk'));
    await page.waitForTimeout(150);
    const g1 = await snap(page);
    ok('gmHero(sk) → 스킬 시트', g1.heroTab === 'sk' && g1.bSk === true && g1.curTab === 'hero',
      g1.heroTab + ' bSk=' + g1.bSk);
    /* 예약이 1회만 사는가 — 바로 닫고 수동으로 다시 열면 장비여야 한다 */
    await clickTab(page, 'hero');
    await clickTab(page, 'hero');
    const g2 = await snap(page);
    ok('예약은 1회만 — 다음 수동 진입은 장비', g2.heroTab === 'eq' && g2.eqw === true, g2.heroTab + ' eqw=' + g2.eqw);
    await page.evaluate(() => gmHero('eq'));
    await page.waitForTimeout(150);
    const g3 = await snap(page);
    ok('gmHero(eq) → 장비 시트', g3.heroTab === 'eq' && g3.eqw === true, g3.heroTab + ' eqw=' + g3.eqw);
    await page.evaluate(() => gmHero('pet'));
    await page.waitForTimeout(150);
    ok('gmHero(pet) → 동료 시트', (await snap(page)).bPet === true, 'bPet');
    /* 잘못된 예약값은 무시하고 장비로 (방어) */
    const bad = await page.evaluate(() => { heroSubReq = 'zzz'; panelOpen = false; syncPanel(); goTab('hero', true); return heroTab; });
    ok('알 수 없는 예약값은 장비로 떨어진다', bad === 'eq', bad);

    console.log('\n[6-2] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY159 ' + (fail ? 'FAIL — ' : 'PASS — ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
