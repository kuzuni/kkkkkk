/* 작업 30 — 던전 입장 화면 기하·기능 검증기.
   측정표 docs/measure/30-던전입장.md 의 실측값을 프레임 좌표(= ref y − 84, 가로 1:1)로 대조한다.
   실행: node tools/verify30.js   (playwright@1.56 + 컨테이너 chromium)  */
const { chromium } = require('playwright');
const path = require('path');

const W = 1080, H = 2280;
const URL = 'file://' + path.resolve(__dirname, '../index.html');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
/* ref → 프레임 변환: 상단 고정 = ref−84, 하단 고정 = 2340−ref_bottom 을 아래에서 직접 쓴다 */
const near = (label, got, want, tol) => {
  if (got == null || !isFinite(got)) return no(label + ' — 값 없음(' + got + ')');
  const d = Math.abs(got - want);
  (d <= tol ? ok : no)(label + ' = ' + (+got).toFixed(1) + ' (기대 ' + want + ', Δ' + d.toFixed(1) + ', 허용 ' + tol + ')');
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ---------- 던전 런 진입 ---------- */
  const started = await page.evaluate(() => {
    S.dia = 1e9; S.gold = 1e9;
    const d = DUNGEONS[0];
    S.daily.dun[d.id] = 3;
    challengeDungeon(d);
    return !!dunRun && document.getElementById('app').classList.contains('dunrun');
  });
  started ? ok('04 [도전] → 던전 런 진입 + #app.dunrun') : no('던전 런이 시작되지 않음');
  await page.waitForTimeout(500);

  /* 프레임 px 로 재는 헬퍼 — #app 은 fit() 이 scale 하므로 되돌린다 */
  const geo = async (sel) => page.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    const a = document.getElementById('app').getBoundingClientRect();
    const k = a.width / 1080;
    const r = el.getBoundingClientRect();
    if (!r.width) return { hidden: true };
    return { x: (r.left - a.left) / k, y: (r.top - a.top) / k, w: r.width / k, h: r.height / k };
  }, sel);

  /* 요소의 «잉크» bbox — 캔버스에 그려 실제 픽셀을 잰다(글리프 stroke 제외 흰색만) */
  const ink = async (sel, thr) => page.evaluate(async ([s, th]) => {
    const el = document.querySelector(s); if (!el) return null;
    const a = document.getElementById('app').getBoundingClientRect();
    const k = a.width / 1080;
    const r = el.getBoundingClientRect();
    /* html2canvas 없이 — 요소 위 영역을 스크린샷으로 못 재므로 여기서는 rect 만 반환 */
    return { x: (r.left - a.left) / k, y: (r.top - a.top) / k, w: r.width / k, h: r.height / k, th };
  }, [sel, thr]);

  console.log('\n[A] 사라져야 하는 것 (측정표 §0)');
  for (const [sel, name] of [['#top', '상단 HUD'], ['#tabbar', '하단 탭바'], ['#stinfo', '스테이지 헤더'],
                             ['#menub', '우상단 ▦ 메뉴'], ['#sideL', '좌측 사이드 아이콘'],
                             ['#botleft', '좌하단 채팅·마을'], ['#tuto', '우하단 미션 배너']]) {
    const g = await geo(sel);
    (g && g.hidden) ? ok(name + ' 숨김(' + sel + ')') : no(name + ' 가 아직 보인다: ' + JSON.stringify(g));
  }

  console.log('\n[B] 던전 HUD 기하 (프레임 = ref y − 84)');
  const hud = await geo('#dunHud');
  hud && !hud.hidden ? ok('#dunHud 표시됨') : no('#dunHud 가 안 보인다');

  const tm = await geo('#dunTm');
  if (tm && !tm.hidden) { near('⏱ 클러스터 left', tm.x, 397, 2); near('⏱ 클러스터 top', tm.y, 146, 2); }
  else no('#dunTm 없음');
  const tmS = await geo('#dunTm s');
  if (tmS && !tmS.hidden) { near('⏱ 아이콘 w', tmS.w, 66, 2); near('⏱ 아이콘 h', tmS.h, 80, 2); }

  const bar = await geo('#dunBar');
  if (bar && !bar.hidden) {
    near('진행바 left', bar.x, 190, 2); near('진행바 top', bar.y, 231, 2);
    near('진행바 w', bar.w, 700, 2); near('진행바 h', bar.h, 80, 2);
    near('진행바 중심 x', bar.x + bar.w / 2, 540, 2);
  } else no('#dunBar 없음');
  const body = await geo('#dunBar em');
  if (body && !body.hidden) { near('진행바 본체 h', body.h, 67, 2); near('진행바 본체 w', body.w, 700, 2); }
  const tab = await geo('#dunBar s');
  if (tab && !tab.hidden) {
    near('보스 탭 left(ref 784)', tab.x, 784, 2);
    near('보스 탭 w', tab.w, 106, 2);
    near('보스 탭 bottom(ref 394→310)', tab.y + tab.h, 310, 2);
    near('보스 탭 하단 돌출(본체 대비)', (tab.y + tab.h) - (body.y + body.h), 13, 2);
  }
  const skull = await geo('#dunBar u');
  if (skull && !skull.hidden) near('해골 박스 중심 x(ref 840)', skull.x + skull.w / 2, 840, 8);

  const out = await geo('#dunOut');
  if (out && !out.hidden) {
    near('뒤로가기 left', out.x, 47, 2);
    near('뒤로가기 w', out.w, 207, 2);
    near('뒤로가기 h', out.h, 132, 2);
    near('뒤로가기 bottom(프레임 하단 기준 210)', H - (out.y + out.h), 210, 3);
  } else no('#dunOut 없음');

  const spd = await geo('#spdb');
  if (spd && !spd.hidden) {
    near('배속 Ø', spd.w, 81, 2);
    near('배속 right(프레임 우단 기준 37)', W - (spd.x + spd.w), 37, 2);
    near('배속 bottom(프레임 하단 기준 200)', H - (spd.y + spd.h), 200, 3);
  } else no('#spdb 없음');

  console.log('\n[C] 스킬 슬롯 — 탭바가 빠지며 +180 내려온다 (측정표 §7)');
  const slots = await geo('#slots');
  if (slots && !slots.hidden) {
    near('슬롯 행 bottom(프레임 하단 기준 27)', H - (slots.y + slots.h), 27, 3);
    /* 슬롯은 «하단 고정» 요소라 기준이 bottom 이다 — 프레임(2280)이 ref 콘텐츠(2256)보다
       24px 크고 그 차이는 캔버스가 먹는다. 그래서 top 은 2280 − 27 − 120 = 2133 이 맞고,
       상단 고정 규칙(ref−84 = 2111)을 쓰면 안 된다(측정표 서두). */
    near('슬롯 행 top(하단 기준 2280−27−120)', slots.y, 2133, 4);
  } else no('#slots 없음');
  const s0 = await geo('.slot2:nth-child(1)'), s7 = await geo('.slot2:nth-child(8)');
  if (s0 && s7 && !s0.hidden) {
    near('슬롯1 중심 x(ref 86.5)', s0.x + s0.w / 2, 86.5, 3);
    near('슬롯8 중심 x(ref 996.5)', s7.x + s7.w / 2, 996.5, 3);
    near('슬롯 외경', s0.w, 120, 2);
  }

  console.log('\n[D] 잉크 실측 (캡처 픽셀 스캔)');
  const shot = 'docs/review/30-verify.png';
  await page.screenshot({ path: shot });
  const inkBox = await page.evaluate(() => {
    /* 흰 글리프 잉크 bbox 를 페이지 안에서 직접 스캔할 수 없으므로 rect + computed 값만 보고한다 */
    const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
    return {
      ttlFs: g('#dunTtl') && g('#dunTtl').fontSize,
      ttlStroke: g('#dunTtl') && g('#dunTtl').webkitTextStrokeWidth,
      tmFs: g('#dunTm b') && g('#dunTm b').fontSize,
      barNumFs: g('#dunBar b') && g('#dunBar b').fontSize
    };
  });
  console.log('  info computed: ' + JSON.stringify(inkBox));

  console.log('\n[E] 기능 체크 — «눌렀을 때 무엇이 바뀌는지»');
  const f1 = await page.evaluate(() => ({ t: dunRun && dunRun.t, txt: document.getElementById('dunTmN').textContent }));
  await page.waitForTimeout(1200);
  const f2 = await page.evaluate(() => ({ t: dunRun && dunRun.t, txt: document.getElementById('dunTmN').textContent, dmg: dunRun && dunRun.dmg }));
  (f2.t != null && f2.t < f1.t) ? ok('타이머가 줄어든다 ' + f1.txt + ' → ' + f2.txt) : no('타이머가 안 줄어든다 ' + JSON.stringify([f1, f2]));
  (f2.dmg > 0) ? ok('누적 피해가 쌓인다 (' + Math.round(f2.dmg) + ')') : no('누적 피해 0 — 전투가 안 돈다');
  const fw = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('dunBarF')).width));
  (fw > 0) ? ok('진행바 채움 폭 > 0 (' + fw.toFixed(1) + 'px, 최대 574)') : no('진행바 채움이 0');
  const ttl = await page.evaluate(() => document.getElementById('dunTtl').textContent);
  /^.+ - 레벨 \d+$/.test(ttl) ? ok('타이틀 «' + ttl + '» = «<던전 이름> - 레벨 <층>»') : no('타이틀 형식 이상: ' + ttl);
  const enemyN = await page.evaluate(() => enemies.length + spawnQ.length);
  (enemyN > 0) ? ok('몹이 스폰돼 있다 (' + enemyN + ')') : no('몹이 0 — 때릴 대상이 없다');
  const stageFrozen = await page.evaluate(() => ({ now: S.stage, want: dunRun && dunRun.stage }));
  (stageFrozen.now === stageFrozen.want) ? ok('던전 런 중 스테이지 고정 (' + stageFrozen.now + ')') : no('스테이지가 움직였다 ' + JSON.stringify(stageFrozen));

  console.log('\n[F] 나가기 버튼 → 기본 화면 복귀');
  const before = await page.evaluate(() => ({ stage: dunRun.stage }));
  await page.click('#dunOut', { force: true });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    run: !!dunRun, cls: document.getElementById('app').classList.contains('dunrun'),
    stage: S.stage, tab: !!document.querySelector('#tabbar').getBoundingClientRect().width,
    top: !!document.querySelector('#top').getBoundingClientRect().width
  }));
  (!after.run && !after.cls) ? ok('나가기 → 던전 런 종료 + .dunrun 해제') : no('나가기가 안 먹는다 ' + JSON.stringify(after));
  (after.tab && after.top) ? ok('탭바·상단 HUD 복귀') : no('기본 UI 가 안 돌아온다 ' + JSON.stringify(after));
  (after.stage === before.stage) ? ok('스테이지 복원 (' + after.stage + ')') : no('스테이지 복원 실패');

  console.log('\n[G] 클리어 / 실패 경로');
  const clear = await page.evaluate(async () => {
    const d = DUNGEONS[0]; S.daily.dun[d.id] = 3;
    const f0 = S.dun[d.id];
    challengeDungeon(d);
    dunRun.dmg = dunRun.need;                 /* 요구치 즉시 충족 */
    await new Promise((r) => setTimeout(r, 500));
    return { run: !!dunRun, f0, f1: S.dun[d.id], cls: document.getElementById('app').classList.contains('dunrun') };
  });
  (!clear.run && clear.f1 === clear.f0 + 1) ? ok('요구 피해 충족 → 클리어 + 층 해금 ' + clear.f0 + '→' + clear.f1)
                                            : no('클리어 경로 이상 ' + JSON.stringify(clear));
  await page.evaluate(() => { const m = document.querySelector('.modal.on'); if (m) m.classList.remove('on'); closeModal && closeModal(); });
  await page.waitForTimeout(200);
  const failp = await page.evaluate(async () => {
    const d = DUNGEONS[1]; S.daily.dun[d.id] = 3;
    const f0 = S.dun[d.id];
    challengeDungeon(d);
    dunRun.t = 0.01; dunRun.dmg = 0; dunRun.need = 1e30;
    await new Promise((r) => setTimeout(r, 700));
    return { run: !!dunRun, f0, f1: S.dun[d.id] };
  });
  (!failp.run && failp.f1 === failp.f0) ? ok('시간 초과 → 실패 + 층 유지 (' + failp.f1 + ')') : no('실패 경로 이상 ' + JSON.stringify(failp));

  console.log('\n[H] 콘솔 에러');
  errs.length ? errs.forEach((e) => no('콘솔: ' + e)) : ok('콘솔 에러 0');

  await ctx.close(); await browser.close();
  console.log('\nVERIFY30 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})();
