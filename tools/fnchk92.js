/* 작업 92 — «기능 체크 표» 하네스 (지시서 ROUTINE.md «기능 완성 규칙», 2026-08-25 주인 지시).
   버튼을 실제로 눌러 «무엇이 바뀌는지» 를 헤드리스로 재고, 그대로 마크다운 표로 찍는다.
   실행: node tools/fnchk92.js
   확인 축: 화면(목록·버튼 상태) · 세이브(S + localStorage) · 재화(HUD 반영). */
/* 127 — 클라우드 러너에는 번들 브라우저가 없다. 게이트 공용 부트스트랩을 쓴다. */
/* 765 (2026-09-01) — «고정 5통» 상수를 걷어냈다. 이 자는 92 당시(우편 = `MAILS` 5통뿐)의 세계를
   상수로 들고 있었는데, 그 뒤 **153**(상점발 `S.mailx`)와 **180**(월별 다이아 — 부팅 정산이
   `sendMail()` 로 한 통을 넣는다)이 우편의 출처를 셋으로 늘렸다. 제품의 진실은 `allMails()`
   = `MAILS.concat(S.mailx)` 이고, 자만 5 에 굳어 첫 진입 6행·일괄 수령 Δ220,000 을 «실패» 로 읽었다.
   ⚠ 그냥 5 → 6 으로 고치면 **달이 바뀔 때마다 다시 빨개진다**(월별 통은 날짜 의존이다) — 그래서
   기대값을 상수가 아니라 **런타임 파생**으로 바꾼다(185-① · 제품 0줄).
   ⚑ 무르게 푼 것이 아님은 자가 «제품 함수의 답» 이 아니라 **재료(`MAILS` + `S.mailx`)에서 스스로
   센 값**과 화면을 대조한다는 데 있다 — `mailList()`/`claimAllMail()` 이 동적 우편을 흘리면
   즉시 빨개진다(되돌림 시험 `tools/verify765.js` §R1·§R2 가 그것을 못박는다).
   `FN92_SRC` 로 다른 index.html 사본을 가리킬 수 있다(§R 이 주입 사본을 먹인다 · 438·439 선례). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = process.env.FN92_SRC
  ? path.resolve(process.cwd(), process.env.FN92_SRC)
  : path.resolve(__dirname, '../index.html');

const rows = [];
const add = (btn, pre, act, exp, got, ok) => rows.push({ btn, pre, act, exp, got, ok });

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForTimeout(900);

  /* 765 — 기대 목록은 «제품이 그리라고 준 것»(`mailList()`)이 아니라 **재료에서 자가 직접 센 것**이다.
     재료 = 고정 우편 `MAILS` + 동적 우편 `S.mailx`(153 상점발 · 180 월별). 화면에 남는 조건은
     «삭제(2) 가 아님» 하나뿐이다(69 «기한 없음» — 만료로 사라지는 통이 없다). */
  const snap = () => p.evaluate(() => ({
    rows: [...document.querySelectorAll('.ml-r [data-ml]')].map((x) => x.dataset.ml),
    expIds: MAILS.map((m) => m.id).concat((S.mailx || []).map((m) => m.id))
      .filter((id) => S.mail[id] !== 2),
    fixN: MAILS.length,
    dynN: (S.mailx || []).length,
    mail: { ...S.mail },
    saved: JSON.parse(localStorage.getItem(KEY) || '{}').mail || {},
    gold: S.gold, dia: S.dia, relic: S.relic,
    delDis: document.getElementById('mailDel') && document.getElementById('mailDel').disabled,
    allDis: document.getElementById('mailBtn') && document.getElementById('mailBtn').disabled,
    allTxt: document.getElementById('mailBtn') && document.getElementById('mailBtn').textContent.trim(),
    delTxt: document.getElementById('mailDel') && document.getElementById('mailDel').textContent.trim(),
    empty: !!document.querySelector('.ml-empty'),
    open: document.getElementById('modal').classList.contains('ml69'),
    hud: /NaN|undefined/.test(document.getElementById('app').textContent)
  }));

  await p.evaluate(() => openMail());
  await p.waitForTimeout(500);

  /* 0) 첫 진입 — 아무것도 안 읽었을 때.
     765 — 행 «수» 가 아니라 **id 집합**을 본다. 수만 세면 «한 통이 빠지고 다른 한 통이 두 번 그려진»
     화면이 초록으로 지나간다. 집합을 보면 그 자리가 곧바로 빨개진다. */
  let s = await snap();
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  add('(첫 진입)', `미수령 ${s.expIds.length}통(고정 ${s.fixN} + 동적 ${s.dynN})`, '—',
    `[읽음 전체 삭제] 비활성 · [일괄 읽기&수령] 활성 · ${s.expIds.length}행(${s.expIds.join(',')})`,
    `삭제 ${s.delDis ? '비활성' : '활성'} · 수령 ${s.allDis ? '비활성' : '활성'} · ${s.rows.length}행(${s.rows.join(',')})`,
    s.delDis === true && s.allDis === false && eq(s.rows, s.expIds));

  /* 1) [읽음 전체 삭제] — 지울 게 없을 때 눌러도 아무 일 없어야 한다 */
  const p0 = await snap();
  await p.evaluate(() => { document.getElementById('mailDel').click(); });
  await p.waitForTimeout(700);
  s = await snap();
  add('[읽음 전체 삭제]', '읽음 0통(비활성)', '클릭',
    `아무 변화 없음(${p0.rows.length}행 유지 · 재화 불변)`,
    `${s.rows.length}행 · 다이아 Δ${s.dia - p0.dia} · 유물석 Δ${s.relic - p0.relic}`,
    /* 765 — «재화 불변» 에 골드는 못 넣는다. 게임이 뒤에서 자동 전투를 돌려 골드는 매 틱 오른다
       (700ms 를 기다리는 이 항에서 반드시 달라진다). 우편이 주는 축 중 **틱으로 안 변하는 둘**
       (다이아·유물석)로 «클릭이 아무 것도 안 줬다» 를 잰다. */
    eq(s.rows, p0.rows) && s.dia === p0.dia && s.relic === p0.relic);

  /* 2) 행 [받기] — 1통 수령 */
  /* 765 — 첫 행이 고정 우편이라는 보장이 없다(동적 우편이 앞에 설 수도 있다). 실제로 눌리는 행에서 재료를 찾는다. */
  const m0 = await p.evaluate(() => {
    const id = document.querySelector('.ml-r [data-ml]').dataset.ml;
    return { ...MAILS.concat(S.mailx || []).find((m) => m.id === id) };
  });
  const p1 = await snap();
  await p.evaluate(() => { document.querySelector('.ml-r [data-ml]').click(); });
  await p.waitForTimeout(900);
  s = await snap();
  add('행 [받기]', `${m0.id} 미수령`, '클릭',
    `S.mail[${m0.id}]=1 · 다이아 +${m0.c} · 유물석 +${m0.r} · 행 «완료» · 삭제 버튼 활성`,
    `S.mail=${s.mail[m0.id]} · 다이아 Δ${s.dia - p1.dia} · 유물석 Δ${s.relic - p1.relic} · 삭제 ${s.delDis ? '비활성' : '활성'}`,
    s.mail[m0.id] === 1 && s.dia - p1.dia === m0.c && s.relic - p1.relic === (m0.r || 0) && s.delDis === false);
  add('행 [받기]', '(같은 클릭)', '세이브 확인',
    `localStorage[KEY].mail[${m0.id}] = 1`, `= ${s.saved[m0.id]}`, s.saved[m0.id] === 1);

  /* 3) [읽음 전체 삭제] — 읽은 1통만 사라지고 미수령 4통은 남는다 */
  const p2 = await snap();
  /* 765 — 두 목록도 재료 전체(고정 + 동적)에서 센다. */
  const allNow = () => p.evaluate(() => MAILS.concat(S.mailx || []).map((m) => ({ id: m.id, st: S.mail[m.id] | 0 })));
  const before = await allNow();
  const readIds = before.filter((m) => m.st === 1).map((m) => m.id);
  const unreadIds = before.filter((m) => !m.st).map((m) => m.id);
  await p.evaluate(() => { document.getElementById('mailDel').click(); });
  await p.waitForTimeout(900);
  s = await snap();
  /* 765 — 삭제 뒤 «지워졌다» 의 모양이 출처마다 다르다(제품 `delReadMail` 주석): 고정 우편은
     `S.mail=2` 로 남고, 동적 우편은 `S.mailx` 에서 **아예 빠지며 `S.mail` 키까지 지워진다**
     (안 그러면 구매 횟수만큼 무한히 자란다). 둘을 한 잣대로 재면 동적 쪽이 거짓 빨강이 된다. */
  const goneOk = (i) => (i.charAt(0) === 'x'
    ? s.mail[i] === undefined && !s.expIds.includes(i)
    : s.mail[i] === 2);
  add('[읽음 전체 삭제]', `읽음 ${readIds.length}통 · 미수령 ${unreadIds.length}통`, '클릭',
    `읽음 ${readIds.length}통만 목록에서 제거(고정=S.mail 2 · 동적=S.mailx 에서 제거) · 미수령 ${unreadIds.length}통 유지 · 재화 불변 · 팝업 유지`,
    `남은 ${s.rows.length}행(${s.rows.join(',')}) · 삭제분 S.mail=${readIds.map((i) => s.mail[i]).join(',')} · 다이아 Δ${s.dia - p2.dia} · 팝업 ${s.open ? '열림' : '닫힘'}`,
    readIds.every((i) => goneOk(i) && !s.rows.includes(i)) && unreadIds.every((i) => s.rows.includes(i))
      && s.dia === p2.dia && s.relic === p2.relic && s.open);
  add('[읽음 전체 삭제]', '(같은 클릭)', '세이브 확인',
    'localStorage[KEY].mail 에 반영(고정 = 2 · 동적 = 키 제거)',
    `= ${readIds.map((i) => s.saved[i]).join(',')}`,
    readIds.every((i) => (i.charAt(0) === 'x' ? s.saved[i] === undefined : s.saved[i] === 2)));
  const srcLen = await p.evaluate(() => MAILS.length);
  /* 765 — 이 항만은 상수를 지킨다. «고정 우편 원본은 어떤 삭제로도 안 줄어든다» 가 92 의 주장이고,
     그 5 는 `MAILS` 선언의 값이지 «우편함에 몇 행이 보이는가» 가 아니다(전자는 소스, 후자는 화면). */
  add('[읽음 전체 삭제]', '(같은 클릭)', 'MAILS 원본',
    '불변 5통', `${srcLen}통`, srcLen === 5);

  /* 4) [일괄 읽기&수령] — 남은 전부 수령, 재화 합계 일치 */
  const p3 = await snap();
  /* 765 — 합계도 재료 전체에서. 동적 우편은 키가 빠져 있을 수 있어 전부 `|| 0` 으로 받는다
     (제품 `claimMail` 이 같은 이유로 그렇게 한다 — undefined 를 더하면 NaN 이다). */
  const rest = await p.evaluate(() => MAILS.concat(S.mailx || []).filter((m) => !S.mail[m.id])
    .reduce((a, m) => ({ g: a.g + (m.g || 0), c: a.c + (m.c || 0), r: a.r + (m.r || 0) }), { g: 0, c: 0, r: 0 }));
  await p.evaluate(() => { document.getElementById('mailBtn').click(); });
  await p.waitForTimeout(900);
  s = await snap();
  add('[일괄 읽기&수령]', `미수령 ${unreadIds.length}통`, '클릭',
    `다이아 +${rest.c} · 유물석 +${rest.r} · 전 행 «완료» · 버튼 비활성 · 라벨 고정`,
    `다이아 Δ${s.dia - p3.dia} · 유물석 Δ${s.relic - p3.relic} · 버튼 ${s.allDis ? '비활성' : '활성'} · 라벨 «${s.allTxt}»`,
    s.dia - p3.dia === rest.c && s.relic - p3.relic === rest.r && s.allDis === true && s.allTxt === '일괄 읽기&수령');

  /* 5) 연타 — 1회분만 */
  await p.evaluate(() => {
    /* 세이브를 초기화해 다시 미수령 상태로 만든다(연타 가드만 본다) */
    S.mail = {}; save(); openMail();
  });
  await p.waitForTimeout(500);
  const p4 = await snap();
  const m1 = await p.evaluate(() => {
    const b2 = document.querySelector('.ml-r [data-ml]:not([disabled])');
    const id = b2.dataset.ml; b2.click(); b2.click(); b2.click();
    /* 765 — 동적 우편이 첫 행일 수 있다. `MAILS.find` 만 보면 undefined 를 돌려줘 자가 즉사한다. */
    return MAILS.concat(S.mailx || []).find((m) => m.id === id);
  });
  await p.waitForTimeout(900);
  s = await snap();
  add('행 [받기] 연타 3회', `${m1.id} 미수령`, '3연타',
    `다이아 +${m1.c || 0} (1회분만)`, `다이아 Δ${s.dia - p4.dia}`, s.dia - p4.dia === (m1.c || 0));

  /* 6) 빈 상태 — 전부 수령 후 전부 삭제 */
  await p.evaluate(() => { document.getElementById('mailBtn').click(); });
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('mailDel').click(); });
  await p.waitForTimeout(900);
  s = await snap();
  add('[읽음 전체 삭제]', '전부 읽음', '클릭',
    '행 0 · «우편이 없습니다» · 두 버튼 비활성',
    `${s.rows.length}행 · 빈문구 ${s.empty ? '있음' : '없음'} · 삭제 ${s.delDis ? '비활성' : '활성'} · 수령 ${s.allDis ? '비활성' : '활성'}`,
    s.rows.length === 0 && s.empty && s.delDis && s.allDis);

  /* 7) 새로고침 후에도 삭제 상태 유지 */
  await p.reload();
  await p.waitForTimeout(1000);
  await p.evaluate(() => openMail());
  await p.waitForTimeout(500);
  s = await snap();
  add('(새로고침)', '전부 삭제된 세이브', 'F5 → 우편함',
    '행 0 · 빈 상태 유지', `${s.rows.length}행 · 빈문구 ${s.empty ? '있음' : '없음'}`,
    s.rows.length === 0 && s.empty);

  /* 8) 닫기 경로 — ✕ 하나뿐 */
  const closeChk = await p.evaluate(() => {
    const had = !!document.getElementById('mailClose');
    document.getElementById('mailX').click();
    return { had, closed: !document.getElementById('modal').classList.contains('on') };
  });
  add('바닥 ✕', '우편함 열림', '클릭',
    '닫힘 · 버튼 «닫기» 는 존재하지 않음',
    `${closeChk.closed ? '닫힘' : '안 닫힘'} · #mailClose ${closeChk.had ? '있음' : '없음'}`,
    closeChk.closed && !closeChk.had);

  add('(전 과정)', '—', '콘솔',
    '에러 0건 · 화면에 NaN/undefined 0건',
    `에러 ${errs.length}건 · NaN ${s.hud ? '있음' : '0건'}`, errs.length === 0 && !s.hud);

  await b.close();

  console.log('| 버튼 | 사전 상태 | 동작 | 기대 | 실제 | |');
  console.log('|---|---|---|---|---|---|');
  rows.forEach((r) => console.log(`| ${r.btn} | ${r.pre} | ${r.act} | ${r.exp} | ${r.got} | ${r.ok ? '✅' : '❌'} |`));
  const bad = rows.filter((r) => !r.ok).length;
  console.log(`\n${bad === 0 ? 'FNCHK92 PASS' : 'FNCHK92 FAIL'} ${rows.length - bad}/${rows.length}`);
  if (errs.length) errs.slice(0, 8).forEach((e) => console.log('  ERR', e));
  process.exit(bad === 0 ? 0 : 1);
})();
