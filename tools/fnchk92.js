/* 작업 92 — «기능 체크 표» 하네스 (지시서 ROUTINE.md «기능 완성 규칙», 2026-08-25 주인 지시).
   버튼을 실제로 눌러 «무엇이 바뀌는지» 를 헤드리스로 재고, 그대로 마크다운 표로 찍는다.
   실행: node tools/fnchk92.js
   확인 축: 화면(목록·버튼 상태) · 세이브(S + localStorage) · 재화(HUD 반영). */
/* 127 — 클라우드 러너에는 번들 브라우저가 없다. 게이트 공용 부트스트랩을 쓴다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const rows = [];
const add = (btn, pre, act, exp, got, ok) => rows.push({ btn, pre, act, exp, got, ok });

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const snap = () => p.evaluate(() => ({
    rows: [...document.querySelectorAll('.ml-r [data-ml]')].map((x) => x.dataset.ml),
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

  /* 0) 첫 진입 — 아무것도 안 읽었을 때 */
  let s = await snap();
  add('(첫 진입)', '미수령 5통', '—',
    '[읽음 전체 삭제] 비활성 · [일괄 읽기&수령] 활성 · 5행',
    `삭제 ${s.delDis ? '비활성' : '활성'} · 수령 ${s.allDis ? '비활성' : '활성'} · ${s.rows.length}행`,
    s.delDis === true && s.allDis === false && s.rows.length === 5);

  /* 1) [읽음 전체 삭제] — 지울 게 없을 때 눌러도 아무 일 없어야 한다 */
  const p0 = await snap();
  await p.evaluate(() => { document.getElementById('mailDel').click(); });
  await p.waitForTimeout(700);
  s = await snap();
  add('[읽음 전체 삭제]', '읽음 0통(비활성)', '클릭',
    '아무 변화 없음(5행 유지 · 재화 불변)',
    `${s.rows.length}행 · 다이아 Δ${s.dia - p0.dia}`,
    s.rows.length === 5 && s.dia === p0.dia);

  /* 2) 행 [받기] — 1통 수령 */
  const m0 = await p.evaluate(() => ({ ...MAILS[0] }));
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
  const readIds = await p.evaluate(() => MAILS.filter((m) => S.mail[m.id] === 1).map((m) => m.id));
  const unreadIds = await p.evaluate(() => MAILS.filter((m) => !S.mail[m.id]).map((m) => m.id));
  await p.evaluate(() => { document.getElementById('mailDel').click(); });
  await p.waitForTimeout(900);
  s = await snap();
  add('[읽음 전체 삭제]', `읽음 ${readIds.length}통 · 미수령 ${unreadIds.length}통`, '클릭',
    `읽음 ${readIds.length}통만 목록에서 제거(S.mail=2) · 미수령 ${unreadIds.length}통 유지 · 재화 불변 · 팝업 유지`,
    `남은 ${s.rows.length}행(${s.rows.join(',')}) · 삭제분 S.mail=${readIds.map((i) => s.mail[i]).join(',')} · 다이아 Δ${s.dia - p2.dia} · 팝업 ${s.open ? '열림' : '닫힘'}`,
    readIds.every((i) => s.mail[i] === 2 && !s.rows.includes(i)) && unreadIds.every((i) => s.rows.includes(i))
      && s.dia === p2.dia && s.relic === p2.relic && s.open);
  add('[읽음 전체 삭제]', '(같은 클릭)', '세이브 확인',
    'localStorage[KEY].mail 에 2 반영', `= ${readIds.map((i) => s.saved[i]).join(',')}`,
    readIds.every((i) => s.saved[i] === 2));
  const srcLen = await p.evaluate(() => MAILS.length);
  add('[읽음 전체 삭제]', '(같은 클릭)', 'MAILS 원본',
    '불변 5통', `${srcLen}통`, srcLen === 5);

  /* 4) [일괄 읽기&수령] — 남은 전부 수령, 재화 합계 일치 */
  const p3 = await snap();
  const rest = await p.evaluate(() => MAILS.filter((m) => !S.mail[m.id])
    .reduce((a, m) => ({ g: a.g + m.g, c: a.c + m.c, r: a.r + (m.r || 0) }), { g: 0, c: 0, r: 0 }));
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
    return MAILS.find((m) => m.id === id);
  });
  await p.waitForTimeout(900);
  s = await snap();
  add('행 [받기] 연타 3회', `${m1.id} 미수령`, '3연타',
    `다이아 +${m1.c} (1회분만)`, `다이아 Δ${s.dia - p4.dia}`, s.dia - p4.dia === m1.c);

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
