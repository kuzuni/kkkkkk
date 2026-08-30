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
                                       /* 13회차 — 칩 내용이 `<b class="ck">⏱</b>` + `<i>숫자</i>` 로 갈라졌다.
                                          시계까지 같이 보려면 칩(`.tm`) 전체 textContent 를 읽어야 한다. */
                                       txt: document.querySelector('#blsC_atk .tm').textContent,
                                       off: document.querySelector('#blsC_atk').classList.contains('off') }));
  ok('C1 공격력 카드 클릭 → 활성', a.on);
  ok('C2 mulAtk() ×1.20', Math.abs(a.atk / before.atk - 1.20) < 1e-6, (a.atk / before.atk).toFixed(4));
  ok('C3 stat.dmg 도 ×1.20', Math.abs(a.dmg / before.dmg - 1.20) < 1e-6, (a.dmg / before.dmg).toFixed(4));
  ok('C4 진행 +1', a.prog === before.prog + 1, before.prog + '→' + a.prog);
  ok('C5 지속시간 30분(±2초)', Math.abs(a.left - 30 * 60 * 1000) < 2000, a.left);
  ok('C6 타이머 표시 HH:MM:SS', /^⏱\s*\d\d:\d\d:\d\d$/.test(a.txt), a.txt);
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
  /* 456(2026-08-30, 주인 지시 «축복은 늘 30분으로 해줘 렙업되도») — 지속시간에서 레벨 항이 이름째 사라졌다.
     옛 «레벨 2 = 35분» 은 `verify456` 이 못박은 «항상 30분» 과 **정면으로 반대를 단언하던 자리**라
     둘 중 하나는 영원히 빨갛다(333 선례: 149 ↔ 295). 나중 지시가 옳으므로 이쪽을 뒤집는다.
     자리는 비우지 않는다 — 뜻이 «레벨업이 지속시간을 건드리지 않는다» 로 바뀌었을 뿐이고,
     그래서 C5(Lv1 30분)와 겹치지 않게 **레벨이 오른 뒤에도** 같은 값인지를 묻는다. */
  ok('E3 레벨 2 여도 지속시간 30분(456 — 레벨과 무관)', Math.abs(e.left - 30 * 60 * 1000) < 2000,
     e.left + ' (Lv' + e.lv + ')');
  ok('E4 Lv 표시 갱신', e.lvTxt === 'Lv.2', e.lvTxt);
  /* 500(2026-08-30) — 진행바 분모가 «어느 레벨에서나 4» 에서 **레벨별 필요 경험치 표**로 바뀌었다.
     이 항이 묻던 뜻(«레벨업 직후 표시·채움이 되감긴다»)은 그대로 두고 분모만 Lv2 의 값(10)으로 갈아 끼운다. */
  ok('E5 진행 표시·채움 갱신 (Lv2 = 0/10)', e.pgTxt === '0/10' && parseFloat(e.fill) === 0, e.pgTxt + ' ' + e.fill);

  /* ── F. 프로모 스트립 [이동] ──
     157(주인 지시 2026-08-27) 이 «모든 축복 받기»(일괄 활성화)를 **폐지**하고 그 버튼을
     판매처(상점 «이용권» 탭)로 보내는 크로스 프로모 CTA 로 갈았다. 옛 동작을 계속 물으면
     «버튼이 사라진 것» 을 영원히 빨갛게 세우므로, **자리를 비우지 않고** 지금 살아 있는 동작으로
     갈아 끼운다(333 처방). 세 항이 묻는 것: ① 버튼이 제 일을 하는가 ② 폐지된 일괄 활성화가
     되살아나지 않았는가(음성항) ③ 레이어가 늘 있고 활성인가. */
  /* ③ 은 «축복 상태와 무관» 이 뜻이라 두 상태에서 다 본다 — 여기(E 직후)는 3종 전부 켜진 상태다 */
  const fOn = await page.evaluate(() => ({ all: blessAll(),
                                           off: document.getElementById('blsAll').classList.contains('off'),
                                           w: document.getElementById('blsAll').offsetWidth }));
  await page.evaluate(() => { S.bless.exp = { atk: 0, hp: 0, rate: 0 }; S.bless.prog = 0; markDirty(); renderBless(); });
  const fOff = await page.evaluate(() => ({ all: blessAll(),
                                            off: document.getElementById('blsAll').classList.contains('off'),
                                            w: document.getElementById('blsAll').offsetWidth,
                                            txt: document.getElementById('blsAll').textContent.trim() }));
  await page.click('#blsAll'); await page.waitForTimeout(300);
  let f = await page.evaluate(() => ({ open: document.getElementById('blsw').classList.contains('on'),
                                       shop: document.getElementById('shopw').classList.contains('on'),
                                       cat: shopCat, all: blessAll(), prog: S.bless.prog }));
  ok('F1 [이동] → 축복 팝업이 닫히고 상점 «이용권» 탭이 열린다', !f.open && f.shop && f.cat === 'pass',
     'bless' + (f.open ? '열림' : '닫힘') + ' shop=' + f.shop + ' cat=' + f.cat);
  /* 음성항 — 일괄 활성화가 되살아나면 여기가 빨개진다 */
  ok('F2 [이동] 은 축복을 켜지 않는다(157 일괄 활성화 폐지)', !f.all && f.prog === 0, f.prog);
  /* ref 에 항상 있는 레이어라 «숨김» 이 아니다(비평 B 1순위 지적). 157 이후로는 «비활성» 도 아니다 —
     축복을 다 켰든 하나도 안 켰든 이동 버튼은 늘 있고 늘 활성이다. */
  ok('F3 스트립 CTA 는 축복 상태와 무관하게 늘 있고 활성(숨기지 않는다)',
     fOn.all && !fOn.off && fOn.w > 0 && !fOff.all && !fOff.off && fOff.w > 0 && fOff.txt === '이동',
     '켬' + JSON.stringify(fOn) + ' 끔' + JSON.stringify(fOff));

  /* ── G. 저장·복원 ── */
  /* F 가 더는 축복을 켜지 않으므로(157) G 는 **실제 사용자 경로**로 표본을 만든다 — 카드 3장 클릭.
     Lv2 의 필요 경험치는 10(500 의 BLESS_NEED 표)이라 3 을 채워도 레벨은 2 그대로다. */
  /* ⚠ 여기서 사이드 아이콘을 «클릭» 으로 다시 열면 F1 이 깨진 트리(축복 팝업이 안 닫히는 사본)에서
     딤에 가려 클릭이 가로막혀 **하네스가 통째로 죽는다**(319 의 278 처방과 같은 자리 — 죽으면
     G·H·I·J·K 가 한꺼번에 사라져 «빨강 1건» 이 «검증 안 함» 이 된다). 진입 클릭은 B2 가 이미 묻고
     있으므로 여기서는 상태만 만든다. */
  await page.evaluate(() => { closeShopPage(); openBless(); }); await page.waitForTimeout(250);
  for (const k of ['atk', 'hp', 'rate']) { await page.click('#blsC_' + k); await page.waitForTimeout(150); }
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
                                       /* 117 — 배수가 «1.20 고정» 이 아니라 «레벨 곡선» 이 됐다.
                                          이 시점의 축복 레벨(E 에서 2가 돼 있다)로 기대값을 세운다. */
                                       exp: 1 + BLESS[0].v * blessScale(), lv: blessLv(),
                                       off: document.querySelector('#blsC_atk').classList.contains('off'),
                                       txt: document.querySelector('#blsC_atk .tm').textContent }));
  ok('I1 만료되면 비활성', !i.on);
  ok('I2 만료 즉시 배수 원복(캐시 무효화)', Math.abs(i.atk / gBefore - 1 / i.exp) < 1e-6,
     (i.atk / gBefore).toFixed(4) + ' (Lv' + i.lv + ' → ÷' + i.exp.toFixed(2) + ')');
  ok('I3 만료 카드 .off + «받기» 표시', i.off && /^⏱\s*받기$/.test(i.txt), i.txt);

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
  ok('J4 Lv 알약 110,626,139x68', near(geo.lv, [110, 626, 139, 68]), JSON.stringify(geo.lv));
  /* 10회차: 비평 E «ref h48» · F «ref 48~49, y636..684» 로 두 비평가 독립 일치 → 51→48, top 634→636 */
  /* 12회차: ref 트랙이 Lv 알약 아래로 파고든다(I 역산 233 · J 채움경계 748) → 좌측 16px 연장, 우단 925 불변 */
  ok('J5 진행바 227,636,698x48', near(geo.bar, [227, 636, 698, 48]), JSON.stringify(geo.bar));
  ok('J6 카드 그리드 76,715,928x447', near(geo.cards, [76, 715, 928, 447]), JSON.stringify(geo.cards));
  /* 10회차: E·F 둘 다 «ref 열 간격 15» (2차의 C 21 / D 18 을 뒤집는다). 피치 315 불변 → 카드 폭 300.
     F 가 2차의 엇갈림도 설명했다 — 헤더 밴드가 본체보다 좌3/우2 인셋이라 헤더 행에서 재면 20~21 로 읽힌다. */
  /* 16회차에 R(거터 19/18) 근거로 gap 18.5 로 넓혔다가 **17회차에 되돌렸다** — T 서브픽셀 실측
     «ref 16.71/16.67 · 폭 298.3 ⇒ 이전 값 17/298 이 정확했고 18.5/297 이 오차를 13배 키웠다» ·
     U «ref 15/15». 게다가 928 은 18.5 로 3등분이 안 돼 우리 거터 2개가 1.00px 어긋났다(ref 편차 0.04). */
  ok('J7 카드 x 76/391/706 · w298', geo.c1[0] === 76 && geo.c2[0] === 391 && geo.c3[0] === 706
     && geo.c1[2] === 298, [geo.c1[0], geo.c2[0], geo.c3[0]].join('/'));
  /* 11회차 정정 — ref 탭 마스크 bbox x317..762(446). 낡은 기대값 442 는 «구현» 이 아니라 «검사» 가 낡은 것이다 */
  ok('J8 보너스탭 317,1195,446x60', near(geo.btab, [317, 1195, 446, 60]), JSON.stringify(geo.btab));
  /* 11회차: 자체 col x900 덤프로 ref 바 = 1254..1403(h150) 확정. 노출 립 = 1254−1195 = 59 (G 60 · H 59) */
  ok('J9 보너스바 75,1254,930x150', near(geo.bn, [75, 1254, 930, 150]), JSON.stringify(geo.bn));
  ok('J10 초록 스트립 64,1523,952x249', near(geo.promo, [64, 1523, 952, 249]), JSON.stringify(geo.promo));
  /* 11회차: G «ref 검정 링 9~10px» vs H «링 없음» 엇갈림 → 자체 row1863 덤프로 H 확정.
     ref 는 붉은 원 Ø119 + 1px 어두운 테 = 실루엣 Ø≈120 이고 순검정 링이 없다. 우리 7px 링(Ø132)을 걷어낸다.
     중심 y 는 G·H·10회차 3자 일치로 1863.5 유지 */
  /* 12회차: I «실루엣 Ø120~121 + 어두운 적색 림» vs J «검정링 10px Ø140~141» → 자체 row1863 덤프로 I 확정
     (ref 는 x479 부터 어두워지고 x600 이후가 딤이라 Ø≈122). 붉은 코어 118 은 유지한 채 림만 2px */
  /* 16회차 — 11·12회차의 «검정 링 없음» 자체 판정은 **틀렸다**. R·S 가 둘 다 «링 10px» 로 지적해
     ref col x540 / row y1863 을 RGB 로 다시 떠 보니 결론이 뒤집혔다:
       row1863: 배경 (70,41,25) → x472..478 **(31,31,31) 순검정** → x480 (105,34,38) 어두운적 → x488 (223,77,88) 밝은적
       col540 : 스트립 하단 1772 → 배경 21px → **y1794..1803 검정 링** → 1804 어두운적 → 1806 밝은적 … 1924..1932 검정 링
     즉 ref 는 «검정 링 10 + 어두운적 림 ~7 + 밝은 코어» 3겹이고 바깥 실루엣은 **y1794..1932 = 139**,
     스트립 하단과의 간격은 **21** 이다. 11·12회차가 «링 없음» 으로 본 것은 링 바깥이 갈색 배경(70,41,25)이라
     검정과 배경을 함께 «어두움» 으로 묶어 버렸기 때문이다 — 배경은 갈색이고 링은 무채색(31,31,31) 이라 구별된다.
     ⇒ 바깥 138(box-sizing) · border 10 검정 · inset 7 어두운적 · 코어 118. 중심 y 는 1793+69 = 1862 로 1.5px 위. */
  ok('J11 닫기 X 중심 540,1862 Ø138', geo.x && Math.abs(geo.x[0] + geo.x[2] / 2 - 540) <= 1
     && Math.abs(geo.x[1] + geo.x[3] / 2 - 1862) <= 2.5 && geo.x[2] === 138, JSON.stringify(geo.x));
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
