/* 작업 171 «전역 감사» — «실행 가능한데 회색/비활성으로 보이는» 버튼 전수 훑기
 *
 *   node tools/audit171.js
 *
 * 방법: 재화·재료·해금을 전부 «넘치는» 상태로 만들어 두면 (거의) 모든 행동이 «가능» 하다.
 * 그 상태에서 각 화면을 열어 **눌리는 요소의 실제 렌더 색**을 읽고, 회색(채도 낮음)이거나
 * `disabled` 인 것을 전부 뽑는다. 그 목록을 사람이 한 줄씩 판정한다 —
 * «가능한데 회색» 이면 결함, «원래 못 하는 상태(MAX·이미 보유·이미 착용)» 면 정상이다.
 *
 * 이 파일은 게이트가 아니라 **조사 도구**다(PASS/FAIL 을 내지 않는다). 결과 표는
 * docs/review/171-상태색.md 에 남는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* 색 문자열에서 rgb 삼중항을 뽑아 최대 채도(HSV S)를 낸다 — 회색 판정용 */
function maxSat(css) {
  const out = [];
  const re = /rgba?\((\d+),\s*(\d+),\s*(\d+)/g;
  let m;
  while ((m = re.exec(css))) {
    const r = +m[1], g = +m[2], b = +m[3];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 24) continue;                       /* 검정 테두리는 «면 색» 이 아니다 */
    out.push((mx - mn) / mx);
  }
  return out.length ? Math.max(...out) : 0;
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ---- 전부 «가능» 한 상태로 만든다 ---- */
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e12; S.relic = 1e12; S.mileage = 1e9;
    S.best = 200; S.stage = 200; S.rank = RANKS.length - 1;
    [...EQUIPS, ...SKILLS, ...PETS].forEach(it => { S.own[it.id] = { l: 1, n: 1e12 }; });
    AVATARS.forEach(a => { if (a.id !== 'av0') delete S.avatars[a.id]; });
    S.avatars.av0 = 1; S.avatar = 'av0';
    if (S.dunTk) Object.keys(S.dunTk).forEach(k => S.dunTk[k] = 5);
    markDirty(); uiDirty = true; save(); renderUI();
  });
  await page.waitForTimeout(400);

  /* ---- 훑을 화면 ---- */
  const SCREENS = [
    ['02 메인',            () => { /* 앞 화면은 루프가 이미 닫았다 */ }],
    ['06 장비 시트',       () => { goTab('hero'); heroSubGo('eq'); }],
    ['07 스킬 시트',       () => { goTab('hero'); heroSubGo('sk'); }],
    ['50 코스튬 시트',     () => { goTab('hero'); heroSubGo('cos'); }],
    ['26 동료 시트',       () => { goTab('hero'); heroSubGo('pet'); }],
    ['23 훈련',            () => { goTab('grow'); }],
    ['03 던전',            () => { goTab('adv'); }],
    ['10 상점 — 소환',     () => { goTab('shop'); openShopPage(null, 'summon'); }],
    ['13 상점 — 재화',     () => { goTab('shop'); openShopPage(null, 'coin'); }],
    ['124 상점 — 이용권',  () => { goTab('shop'); openShopPage(null, 'pass'); }],
    ['89 유물 페이지',     () => { goTab('box'); }],
    ['21 도감',            () => { openColl21(); }],
    ['22 퀘스트',          () => { openQuest(); }],
    ['34 축복',            () => { openBless(); }],
    ['35 패스',            () => { openPass(); }],
    ['69 우편함',          () => { openMail(); }],
    ['70 출석',            () => { openAttend(); }],
    ['19 프로필',          () => { openProfile(); }],
    ['54 랭킹',            () => { openRank(); }],
    ['53 가방',            () => { openBag(); }],
    ['52 메뉴',            () => { document.getElementById('menub').click(); }],
    ['55 설정',            () => { openConf(); }],
    ['29 룰렛',            () => { openRoulette(); }],
    ['05 무기 팝업',       () => { goTab('hero'); openWeapon(null, 'weapon'); }],
  ];

  /* 버튼처럼 «눌리는» 것만 본다 — 아이콘·카드·탭은 상태색 규칙의 대상이 아니다 */
  const SEL = ['button', '.gbtn', '.ifbtn', '.cbtn', '.sk-btn', '.wm-btn', '.tr-up', '.clb-btn',
    '.dcl-btn', '.cf55-btn', '.df-btn', '.pf-btn', '.bbtn', '.ubtn', '.sm-b', '.ex', '.cn-mv',
    '[data-buy]', '[data-ex]', '[data-claim]', '[data-shsum]'].join(',');

  const rows = [];
  for (const [name, open] of SCREENS) {
    await page.evaluate(() => { try { closeModal(); } catch (_) {} document.querySelectorAll('.pop.on,.ov.on').forEach(e => e.classList.remove('on')); });
    const err = await page.evaluate(fn => { try { (0, eval)('(' + fn + ')')(); return ''; } catch (e) { return String(e.message); } }, open.toString());
    await page.waitForTimeout(450);
    if (err) { rows.push({ screen: name, label: '(열기 실패)', note: err }); continue; }

    const found = await page.evaluate(sel => {
      /* 02 메인의 상시 요소(💬 채팅·미션 배너 — 🌳마을은 189 에서 삭제)가 모든 화면에 중복으로 잡히지 않게,
         «지금 맨 위에 열린 오버레이» 안쪽만 훑는다. 열린 게 없으면 프레임 전체(=02 메인)를 본다. */
      const ovs = [...document.querySelectorAll('.pop.on, .ov.on, #panel.on, [id$="w"].on')]
        .filter(e => e.getBoundingClientRect().width > 300);
      /* «맨 위» 는 DOM 순서가 아니라 z-index 다 — 05 무기 팝업은 `#panel` 보다 앞에 있으면서 위에 뜬다 */
      const z = e => { const v = parseInt(getComputedStyle(e).zIndex, 10); return Number.isFinite(v) ? v : 0; };
      ovs.sort((a, b) => z(a) - z(b));
      const root = ovs.length ? ovs[ovs.length - 1] : document.getElementById('app');
      const vis = el => {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return false;
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > .05;
      };
      const out = [];
      root.querySelectorAll(sel).forEach(el => {
        if (!vis(el)) return;
        const cs = getComputedStyle(el);
        const paint = cs.backgroundImage + ' ' + cs.backgroundColor + ' ' + cs.boxShadow;
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className.toString().slice(0, 44),
          txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 22),
          dis: !!el.disabled || cs.pointerEvents === 'none',
          paint
        });
      });
      return out;
    }, SEL);

    found.forEach(f => {
      const sat = maxSat(f.paint);
      if (sat >= 0.14 && !f.dis) return;                     /* 유채색 + 활성 = 정상 */
      rows.push({ screen: name, label: f.txt || ('.' + f.cls.split(' ')[0]),
        cls: f.cls, dis: f.dis, sat: sat.toFixed(2) });
    });
  }

  console.log('\n=== 171 전역 감사 — «회색이거나 비활성» 인 눌림 요소 (전부 «가능» 한 상태에서) ===\n');
  console.log('| 화면 | 라벨 | 클래스 | disabled | 채도 |');
  console.log('|---|---|---|---|---|');
  rows.forEach(r => console.log('| ' + r.screen + ' | ' + (r.label || '') + ' | `' + (r.cls || '') + '` | '
    + (r.dis ? 'Y' : '') + ' | ' + (r.sat || r.note || '') + ' |'));
  console.log('\n총 ' + rows.length + '건 · 페이지 에러 ' + errs.length + '건');
  errs.slice(0, 5).forEach(e => console.log('  ' + e));
  await browser.close();
})();
