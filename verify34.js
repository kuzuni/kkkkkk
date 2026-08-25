/* 34 축복(버프) 팝업 — 기능·기하 검증기 (지시서 «기능 완성 규칙» 의 기능 체크 표).
   node verify34.js   →  VERIFY34 PASS / FAIL 목록
   «만들어 놓음» 이 아니라 «버튼을 누르면 실제 게임 데이터가 바뀌고 저장·HUD 에 반영되는가» 를 본다. */
const { chromium } = require('playwright');
const path = require('path');

const R = [];
const ok = (n, c, d) => R.push({ n, c: !!c, d: d === undefined ? '' : String(d) });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  /* ── A. 구버전 세이브(bless 필드 없음) 마이그레이션 ── */
  /* ⚠ addInitScript 는 reload 마다 다시 돈다 — 그대로 두면 G2(새로고침 유지) 가 «옛 세이브 복원» 이 돼 버린다.
     구버전 세이브(bless 필드 없음)는 «처음 한 번만» 깔고, 이후 저장분은 살린다.
     autoBuy·spAuto 는 끈다 — 유휴 루프가 배수를 올려 C3 같은 «배수 비교» 를 오염시킨다(51 교훈 ③). */
  await page.addInitScript(() => {
    if (!localStorage.getItem('idle_hunter_save_v4'))
      localStorage.setItem('idle_hunter_save_v4',
        JSON.stringify({ gold: 1000, dia: 10, stage: 5, best: 5, autoBuy: false, spAuto: false }));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(800);

  let m = await page.evaluate(() => ({ lv: S.bless.lv, prog: S.bless.prog, keys: Object.keys(S.bless.exp).sort(),
                                       on: BLESS.map(x => blessOn(x.k)) }));
  ok('A1 구버전 세이브 → bless 기본값', m.lv === 1 && m.prog === 0, JSON.stringify(m));
  ok('A2 exp 키 3종 생성', m.keys.join(',') === 'atk,hp,rate', m.keys.join(','));
  ok('A3 초기엔 전부 비활성', m.on.every(v => !v), JSON.stringify(m.on));

  /* ── B. 진입 ── */
  ok('B1 사이드 «축복» 아이콘 존재', await page.$('.side .ibtn[data-pop="bless"]'));
  await page.click('.side .ibtn[data-pop="bless"]');
  await page.waitForTimeout(300);
  ok('B2 아이콘 클릭 → 팝업 열림', await page.$('#blsw.on'));
  ok('B3 카드 3장 렌더', (await page.$$('#blsCards .bls-c')).length === 3,
     (await page.$$('#blsCards .bls-c')).length);

  /* ── C. 카드 클릭 = 축복 활성화 (실제 게임 데이터 변화) ── */
  const before = await page.evaluate(() => ({ atk: mulAtk(), hp: mulHp(), rate: mulRate(), gold: mulGold(),
                                              dmg: stat.dmg, maxHp: stat.maxHp, prog: S.bless.prog }));
  await page.click('#blsC_atk');
  await page.waitForTimeout(250);
  let a = await page.evaluate(() => ({ on: blessOn('atk'), atk: mulAtk(), dmg: stat.dmg,
                                       prog: S.bless.prog, left: blessLeft('atk'),
                                       txt: document.querySelector('#blsC_atk .tm>i').textContent,
                                       off: document.querySelector('#blsC_atk').classList.contains('off') }));
  ok('C1 공격력 카드 클릭 → 활성', a.on);
  ok('C2 mulAtk() ×1.20', Math.abs(a.atk / before.atk - 1.20) < 1e-6, (a.atk / before.atk).toFixed(4));
  ok('C3 stat.dmg 도 ×1.20', Math.abs(a.dmg / before.dmg - 1.20) < 1e-6, (a.dmg / before.dmg).toFixed(4));
  ok('C4 진행 +1', a.prog === before.prog + 1, before.prog + '→' + a.prog);
  ok('C5 지속시간 30분(±2초)', Math.abs(a.left - 30 * 60 * 1000) < 2000, a.left);
  ok('C6 타이머 표시 HH:MM:SS', /^⏱ \d\d:\d\d:\d\d$/.test(a.txt), a.txt);
  ok('C7 활성 카드는 .off 해제', !a.off);
  ok('C8 체력·공속은 아직 그대로', await page.evaluate(() => mulHp()) === before.hp
     && await page.evaluate(() => mulRate()) === before.rate);

  /* 이미 켠 축복을 다시 눌러도 시간이 누적되지 않는다 */
  const l0 = await page.evaluate(() => blessLeft('atk'));
  await page.click('#blsC_atk'); await page.waitForTimeout(200);
  const l1 = await page.evaluate(() => ({ left: blessLeft('atk'), prog: S.bless.prog }));
  ok('C9 재클릭해도 시간·진행 누적 없음', l1.left <= l0 && l1.prog === a.prog, l0 + '→' + l1.left);

  /* ── D. 보너스 축복 = 3종 전부 활성일 때만 ── */
  const g0 = await page.evaluate(() => mulGold());
  await page.click('#blsC_hp'); await page.waitForTimeout(200);
  ok('D1 2종만 켜면 보너스 없음', await page.evaluate(() => mulGold()) === g0
     && !(await page.evaluate(() => blessAll())));
  ok('D2 보너스 바 .off 유지', await page.evaluate(() => document.getElementById('blsBonus').classList.contains('off')));
  await page.click('#blsC_rate'); await page.waitForTimeout(200);
  let d = await page.evaluate(() => ({ all: blessAll(), gold: mulGold(), hp: mulHp(), rate: mulRate(),
                                       off: document.getElementById('blsBonus').classList.contains('off'),
                                       prog: S.bless.prog, lv: S.bless.lv }));
  ok('D3 3종 전부 활성', d.all);
  ok('D4 골드 획득량 ×1.50', Math.abs(d.gold / g0 - 1.5) < 1e-6, (d.gold / g0).toFixed(4));
  ok('D5 mulHp·mulRate 도 ×1.20', Math.abs(d.hp / before.hp - 1.2) < 1e-6 && Math.abs(d.rate / before.rate - 1.2) < 1e-6);
  ok('D6 보너스 바 활성 표시', !d.off);
  ok('D7 진행 3/4 · 레벨 1', d.prog === 3 && d.lv === 1, d.prog + '/' + d.lv);

  /* ── E. 4번째 활성화 → 축복 레벨 +1, 지속시간 +5분 ── */
  await page.evaluate(() => { S.bless.exp.atk = 0; markDirty(); renderBless(); });
  await page.click('#blsC_atk'); await page.waitForTimeout(200);
  let e = await page.evaluate(() => ({ lv: S.bless.lv, prog: S.bless.prog, left: blessLeft('atk'),
                                       lvTxt: document.getElementById('blsLv').textContent,
                                       pgTxt: document.getElementById('blsProg').textContent,
                                       fill: document.getElementById('blsFill').style.width }));
  ok('E1 4번 채우면 레벨 +1', e.lv === 2, e.lv);
  ok('E2 진행 되감기 0/4', e.prog === 0, e.prog);
  ok('E3 레벨 2 지속시간 35분(레벨업 즉시 적용)', Math.abs(e.left - 35 * 60 * 1000) < 2000, e.left);
  ok('E4 Lv 표시 갱신', e.lvTxt === 'Lv.2', e.lvTxt);
  ok('E5 진행 표시·채움 갱신', e.pgTxt === '0/4' && parseFloat(e.fill) === 0, e.pgTxt + ' ' + e.fill);

  /* ── F. «모든 축복 받기» 버튼 ── */
  await page.evaluate(() => { S.bless.exp = { atk: 0, hp: 0, rate: 0 }; S.bless.prog = 0; markDirty(); renderBless(); });
  await page.click('#blsAll'); await page.waitForTimeout(250);
  let f = await page.evaluate(() => ({ all: blessAll(), prog: S.bless.prog,
                                       vis: document.getElementById('blsAll').classList.contains('off') }));
  ok('F1 [받기] 한 번에 3종 활성', f.all);
  ok('F2 진행 +3', f.prog === 3, f.prog);
  /* ref 에 항상 있는 레이어라 «숨김» 이 아니라 «비활성» 이다(비평 B 1순위 지적) */
  ok('F3 켤 게 없으면 버튼 비활성 표시(숨기지 않음)', f.vis === true, f.vis);

  /* ── G. 저장·복원 ── */
  const saved = await page.evaluate(() => { save(); return JSON.parse(localStorage.getItem('idle_hunter_save_v4')).bless; });
  ok('G1 localStorage 에 bless 저장', saved && saved.lv === 2 && saved.prog === 3, JSON.stringify(saved));
  await page.reload(); await page.waitForTimeout(800);
  let g = await page.evaluate(() => ({ lv: S.bless.lv, all: blessAll(), gold: mulGold(), key: KEY }));
  ok('G2 새로고침 후에도 축복 유지', g.all && g.lv === 2, JSON.stringify(g));
  ok('G3 저장 KEY 미변경', g.key === 'idle_hunter_save_v4', g.key);

  /* ── H. 닫기 ── */
  await page.click('.side .ibtn[data-pop="bless"]'); await page.waitForTimeout(250);
  await page.click('#blsX'); await page.waitForTimeout(250);
  ok('H1 X 버튼으로 닫힘', !(await page.$('#blsw.on')));
  await page.click('.side .ibtn[data-pop="bless"]'); await page.waitForTimeout(250);
  await page.mouse.click(30, 100);                       /* 딤(팝업 바깥) 클릭 */
  await page.waitForTimeout(250);
  ok('H2 딤 클릭으로 닫힘', !(await page.$('#blsw.on')));

  /* ── I. 만료 처리 (남은 1초짜리로 몰아 넣고 tick 을 기다린다) ── */
  await page.click('.side .ibtn[data-pop="bless"]'); await page.waitForTimeout(200);
  const gBefore = await page.evaluate(() => { S.bless.exp = { atk: Date.now() + 900, hp: 0, rate: 0 };
    markDirty(); renderBless(); return mulAtk(); });
  await page.waitForTimeout(2400);
  let i = await page.evaluate(() => ({ on: blessOn('atk'), atk: mulAtk(),
                                       off: document.querySelector('#blsC_atk').classList.contains('off'),
                                       txt: document.querySelector('#blsC_atk .tm>i').textContent }));
  ok('I1 만료되면 비활성', !i.on);
  ok('I2 만료 즉시 배수 원복(캐시 무효화)', Math.abs(i.atk / gBefore - 1 / 1.2) < 1e-6, (i.atk / gBefore).toFixed(4));
  ok('I3 만료 카드 .off + «받기» 표시', i.off && /받기/.test(i.txt), i.txt);

  /* ── J. 기하(측정표 대조) ── */
  const geo = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect(), sc = app.width / 1080 || 1;
    const q = s => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect();
      return [+((b.x - app.x) / sc).toFixed(1), +((b.y - app.y) / sc).toFixed(1), +(b.width / sc).toFixed(1), +(b.height / sc).toFixed(1)]; };
    return { bls: q('.bls'), head: q('.bls-head'), note: q('.bls-note'), lv: q('.bls-lv'), bar: q('.bls-bar'),
             cards: q('.bls-cards'), c1: q('#blsC_atk'), c2: q('#blsC_hp'), c3: q('#blsC_rate'),
             btab: q('.bls-btab'), bn: q('.bls-bn'), promo: q('.bls-promo'), x: q('.bls-x') };
  });
  const near = (a, b, t = 2) => a && b.every((v, k) => Math.abs(a[k] - v) <= t);
  ok('J1 팝업 41,345,998x1157', near(geo.bls, [41, 345, 998, 1157]), JSON.stringify(geo.bls));
  ok('J2 헤더 h90', geo.head && Math.abs(geo.head[3] - 90) <= 1, geo.head && geo.head[3]);
  ok('J3 배너 89,486,900x100', near(geo.note, [89, 486, 900, 100]), JSON.stringify(geo.note));
  ok('J4 Lv 알약 110,626,134x68', near(geo.lv, [110, 626, 134, 68]), JSON.stringify(geo.lv));
  /* 10회차: 비평 E «ref h48» · F «ref 48~49, y636..684» 로 두 비평가 독립 일치 → 51→48, top 634→636 */
  /* 12회차: ref 트랙이 Lv 알약 아래로 파고든다(I 역산 233 · J 채움경계 748) → 좌측 16px 연장, 우단 925 불변 */
  ok('J5 진행바 227,636,698x48', near(geo.bar, [227, 636, 698, 48]), JSON.stringify(geo.bar));
  ok('J6 카드 그리드 75,715,930x447', near(geo.cards, [75, 715, 930, 447]), JSON.stringify(geo.cards));
  /* 10회차: E·F 둘 다 «ref 열 간격 15» (2차의 C 21 / D 18 을 뒤집는다). 피치 315 불변 → 카드 폭 300.
     F 가 2차의 엇갈림도 설명했다 — 헤더 밴드가 본체보다 좌3/우2 인셋이라 헤더 행에서 재면 20~21 로 읽힌다. */
  ok('J7 카드 x 75/390/705 · w300', geo.c1[0] === 75 && geo.c2[0] === 390 && geo.c3[0] === 705
     && geo.c1[2] === 300, [geo.c1[0], geo.c2[0], geo.c3[0]].join('/'));
  /* 11회차 정정 — ref 탭 마스크 bbox x317..762(446). 낡은 기대값 442 는 «구현» 이 아니라 «검사» 가 낡은 것이다 */
  ok('J8 보너스탭 317,1195,446x60', near(geo.btab, [317, 1195, 446, 60]), JSON.stringify(geo.btab));
  /* 11회차: 자체 col x900 덤프로 ref 바 = 1254..1403(h150) 확정. 노출 립 = 1254−1195 = 59 (G 60 · H 59) */
  ok('J9 보너스바 75,1254,930x150', near(geo.bn, [75, 1254, 930, 150]), JSON.stringify(geo.bn));
  ok('J10 초록 스트립 64,1523,952x252', near(geo.promo, [64, 1523, 952, 252]), JSON.stringify(geo.promo));
  /* 11회차: G «ref 검정 링 9~10px» vs H «링 없음» 엇갈림 → 자체 row1863 덤프로 H 확정.
     ref 는 붉은 원 Ø119 + 1px 어두운 테 = 실루엣 Ø≈120 이고 순검정 링이 없다. 우리 7px 링(Ø132)을 걷어낸다.
     중심 y 는 G·H·10회차 3자 일치로 1863.5 유지 */
  /* 12회차: I «실루엣 Ø120~121 + 어두운 적색 림» vs J «검정링 10px Ø140~141» → 자체 row1863 덤프로 I 확정
     (ref 는 x479 부터 어두워지고 x600 이후가 딤이라 Ø≈122). 붉은 코어 118 은 유지한 채 림만 2px */
  ok('J11 닫기 X 중심 540,1863 Ø122', geo.x && Math.abs(geo.x[0] + geo.x[2] / 2 - 540) <= 1
     && Math.abs(geo.x[1] + geo.x[3] / 2 - 1863.5) <= 2 && geo.x[2] === 122, JSON.stringify(geo.x));
  /* 프레임 이탈 0 */
  const out = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    return [...document.querySelectorAll('#blsw *')].filter(el => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && (b.left < app.left - 1 || b.right > app.right + 1 || b.top < app.top - 1 || b.bottom > app.bottom + 1);
    }).map(el => el.className || el.id);
  });
  ok('J12 프레임 밖 이탈 0', out.length === 0, out.join(','));

  ok('K1 콘솔 에러 0', errs.length === 0, errs.join(' | '));

  await browser.close();
  const bad = R.filter(r => !r.c);
  R.forEach(r => console.log((r.c ? 'ok   ' : 'FAIL ') + r.n + (r.d ? '  [' + r.d + ']' : '')));
  console.log(bad.length ? `VERIFY34 FAIL ${bad.length}/${R.length}` : `VERIFY34 PASS ${R.length}/${R.length}`);
  process.exit(bad.length ? 1 : 0);
})();
