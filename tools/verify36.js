/* 작업 36 — 출석 패스 탭 회귀·기능 검증. «버튼을 누르면 무엇이 바뀌는가» 전수 + 좌표 불변식.
 *   node tools/verify36.js
 * 36 을 다시 손대는 세션은 **손대기 전/후로 한 번씩** 돌려 회귀 0 을 확인할 것(LESSONS 25-⑦).
 * 35(스테이지 패스)와 껍데기를 공유하므로 `tools/verify35.js` 도 같이 돌려야 한다 —
 * 이 파일은 «탭이 갈리는 지점»(슬롯·해금 규칙·저장 네임스페이스)만 본다.
 *
 * 절대값 단정보다 «불변식» 이 덜 틀린다(LESSONS 43-① · 58-⑦):
 *   · 앵커는 측정표의 «ref 절대 y − 84» 에서만 가져온다(프레임 높이 차로 유도하지 않는다).
 *   · 영속성 검사에 addInitScript 를 쓰지 않는다(LESSONS 50-②) — 페이지 안에서 올리고 reload 한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
/* 231 — 되돌림 시험(`tools/neg231.js`)이 «사본을 새로 열어» 돌릴 수 있어야 한다(LESSONS 191:
   살아 있는 페이지에 주입하면 거짓 초록이 난다). 평소에는 저장소의 index.html 그대로다. */
const URL = 'file://' + path.resolve(process.env.V36_SRC || path.join(__dirname, '..', 'index.html'));
const KEY = 'idle_hunter_save_v4';

let bad = 0;
const ok = (m) => console.log('  ✓ ' + m);
const no = (m) => { bad++; console.log('  ✗ ' + m); };
const eq = (label, got, want, tol) => {
  const d = Math.abs(got - want);
  if (d <= (tol === undefined ? 1 : tol)) ok(`${label} = ${got} (기대 ${want})`);
  else no(`${label} = ${got} (기대 ${want}, Δ${d.toFixed(2)})`);
};

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}
/* 진입은 실제 경로로 — ▦ 메뉴 → 🎫 패스 → 하단바 «출석»(LESSONS 50-①) */
const openAttTab = async (page) => {
  await page.evaluate(() => document.getElementById('menub').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('psGo').click());
  /* 60 쥬시의 «열기 팝»(scale) 이 도는 동안 재면 bbox 가 3~4% 작게 읽힌다(LESSONS 64-③) */
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('#psBar [data-ptab="att"]').click());
  await page.waitForTimeout(400);
};

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const errs = [];

  /* ---------- 1. 탭 전환 · 슬롯 (측정표 §9-2) ---------- */
  console.log('[1] 탭 전환 · 탭별 슬롯 — 1080×2280');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    /* ⚠ addInitScript 는 reload 때도 다시 돈다 — 무조건 setItem 하면 저장된 진행도를 덮어써
       «영속성 실패» 로 오진한다(LESSONS 50-②). 비어 있을 때만 심는다. */
    await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify({ best: 79, stage: 79, gold: 5e9, dia: 120000, relic: 4000,
                             att: { n: 2, date: '' }, pass: { prem: {}, got: {} } })]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(URL); await page.waitForTimeout(800);
    await openAttTab(page);

    await page.evaluate(() => { document.getElementById('psList').scrollTop = 0; });
    await page.waitForTimeout(200);
    if (page.settle291) await page.settle291();   /* 921 — 여는 동작 뒤 <250ms 대기라 291 훅이 구조적으로 안 돈다(915 선례) */
    const g = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      return { tab: passTab, on: document.querySelector('#psBar .pt.on').dataset.ptab,
               onBox: r('#psBar .pt.on'),
               ttl: document.getElementById('psTtl').textContent,
               sub: document.getElementById('psSub').textContent,
               stl: document.getElementById('psStL').textContent,
               stv: document.getElementById('psStV').textContent,
               price: document.getElementById('psPrice').textContent,
               cols: document.querySelector('#psTk .ps-r:not(.ps-hr)').querySelectorAll('.ps-bx').length,
               c1: r('#psTk .ps-r:not(.ps-hr) .ps-bx.c1'), c0: r('#psTk .ps-r:not(.ps-hr) .ps-bx.c0'),
               lb: r('.ps-lb'), lbTxt: (document.querySelector('.ps-lb i') || {}).textContent,
               row0: r('#psTk .ps-r:not(.ps-hr)'),
               hex: [...document.querySelectorAll('#psTk .ps-hex i')].slice(0, 6).map(e => e.textContent),
               attCls: document.getElementById('psw').classList.contains('att') };
    });
    if (g.tab === 'att' && g.on === 'att') ok('하단바 «출석» → att 탭으로 전환');
    else no('탭 전환 실패: passTab=' + g.tab + ' on=' + g.on);
    /* 활성 칸은 뒤로가기195 + 구분선5 + 비활성190×3 + 구분선(5,6,4) 뒤 — ref x786..1074 */
    eq('활성 탭 칸 left (ref 786)', g.onBox.x, 785, 2);
    eq('활성 탭 칸 width (활성 289)', g.onBox.w, 289);
    if (g.ttl === '출석 패스 1') ok('타이틀 = «출석 패스 1»'); else no('타이틀: ' + g.ttl);
    if (g.sub.indexOf('매일매일 접속하고') === 0) ok('부제 = 출석 문구'); else no('부제: ' + g.sub);
    if (g.stl === '접속일') ok('스탯 라벨 = «접속일»'); else no('스탯 라벨: ' + g.stl);
    if (g.stv === '2') ok('스탯 값 = 접속일 2 (S.att.n 연동)'); else no('스탯 값: ' + g.stv);
    if (g.price === '₩5,900') ok('가격 = ₩5,900'); else no('가격: ' + g.price);
    if (g.attCls) ok('#psw.att 클래스 부착'); else no('#psw 에 .att 가 없다');
    eq('보상 칸 수 (무료1 + 프리미엄1)', g.cols, 2, 0);
    /* 프리미엄 칸 1개는 컬럼 중앙 819.5 — ref x741..898 */
    eq('프리미엄 칸 left (ref 741)', g.c1.x, 741);
    eq('프리미엄 칸 중심 (컬럼 중앙 819.5)', g.c1.x + g.c1.w / 2, 819.5, 1.5);
    eq('무료 칸 left (35 와 공유, ref 181)', g.c0.x, 181);
    if (g.lb && g.lbTxt === '접속일') ok('리스트 선두 «접속일» 알약 존재');
    else no('선두 알약 없음/문구 불일치: ' + JSON.stringify(g.lbTxt));
    /* 알약 ref 잉크 x454..625 · y866..936 → 프레임 y782 (측정표 35 §9-2) */
    eq('선두 알약 left (ref 454)', g.lb.x, 454);
    eq('선두 알약 top (ref 865 − 84)', g.lb.y, 781);
    eq('선두 알약 w×h (ref 172×72)', g.lb.w, 172); eq('선두 알약 h', g.lb.h, 72);
    eq('선두 알약 중심 x (스파인 중앙 539.5)', g.lb.x + g.lb.w / 2, 539.5, 1.5);
    /* R1 은 라벨 전용 — 첫 보상 행은 알약 한 칸 아래(트랙 top = pitch 229.85) */
    /* 라벨 행만 226.5 — «같은 검출기로 ref·캡처의 구분홈 5개를 대조해» 맞춘 값이다(§10 주의).
       구분홈은 행 «바닥» 이라 행 top 에서 바로 유도하면 2~3px 어긋난다. */
    eq('첫 보상 행 top (구분홈 정렬 실측)', g.row0.y, 938.5, 2);
    if (g.hex.join(',') === '1,2,3,4,5,6') ok('육각 라벨 = 접속 일수 1,2,3,4,5,6');
    else no('육각 라벨이 접속 일수가 아니다: ' + g.hex.join(','));

    /* 보상표 — 레퍼런스는 전 행 다이아, 무료 1,000 / 프리미엄 1일차 30,000 · 그 뒤 10,000 (§8-3) */
    const rws = await page.evaluate(() => [0, 1, 2, 3].map(i => [passRw(i, 0), passRw(i, 1)]));
    const wantRw = [[1000, 30000], [1000, 10000], [1000, 10000], [1000, 10000]];
    const gotRw = rws.map(p => [p[0].n, p[1].n]);
    if (JSON.stringify(gotRw) === JSON.stringify(wantRw) && rws.every(p => p.every(x => x.k === 'dia' && x.g === 3)))
      ok('보상표 — 전 칸 다이아·에픽 등급, 무료 1,000 / 프리미엄 30,000→10,000');
    else no('보상표 불일치: ' + JSON.stringify(gotRw) + ' / ' + JSON.stringify(rws.map(p => p.map(x => x.k + ':' + x.g))));

    /* ---------- 2. 해금 규칙 — 접속일이 진행도다 ---------- */
    console.log('[2] 해금 — S.att.n 이 진행도');
    const lk2 = await page.evaluate(() =>
      [...document.querySelectorAll('#psTk .ps-hex')].slice(0, 4).map(e => e.classList.contains('lk')));
    if (lk2.join(',') === 'false,false,true,true') ok('접속일 2 → 1·2 일차 해금 / 3·4 일차 잠금');
    else no('해금 상태가 접속일을 안 따른다: ' + lk2.join(','));
    const lk5 = await page.evaluate(() => { S.att.n = 5; renderPass();
      return [...document.querySelectorAll('#psTk .ps-hex')].slice(0, 6).map(e => e.classList.contains('lk')); });
    if (lk5.join(',') === 'false,false,false,false,false,true') ok('접속일 5 → 5일차까지 해금');
    else no('접속일 5 반영 실패: ' + lk5.join(','));
    await page.evaluate(() => { S.att.n = 2; renderPass(); });

    /* ---------- 3. 기능 체크 표 — 칸을 누르면 무엇이 바뀌는가 ---------- */
    console.log('[3] 기능 — 보상 수령');
    const rw = await page.evaluate(() => passRw(1, 0));
    const k = rw.k === 'gold' ? 'g' : (rw.k === 'dia' ? 'd' : 'r');
    const b1 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    await page.evaluate(() => document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')[1].querySelector('.ps-bx.c0').click());
    await page.waitForTimeout(250);
    const a1 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    eq(`무료 2일차 수령 — ${rw.k} 증가량`, a1[k] - b1[k], rw.n, 0);
    const dn = await page.evaluate(() =>
      document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')[1].querySelector('.ps-bx.c0').classList.contains('dn'));
    if (dn) ok('수령한 칸이 수령완료(.dn)로 바뀐다'); else no('수령했는데 칸이 안 바뀐다');
    /* ⚠ 재화 총합 델타로는 못 잰다 — 뒤에서 전투가 계속 돌아 골드가 늘어난다(LESSONS 58-②).
       «수령 함수의 반환값 + 다이아 델타» 로 본다(출석 보상은 전부 다이아라 골드 증가와 안 섞인다). */
    const re = await page.evaluate(() => { const d = S.dia; const r = passClaim(1, 0); return { r, d: S.dia - d }; });
    if (re.r === false && re.d === 0) ok('재수령 불가 — 두 번째 수령은 무효');
    else no('재수령이 됐다: ' + JSON.stringify(re));
    const lkc = await page.evaluate(() => { const d = S.dia; const r = passClaim(5, 0); return { r, d: S.dia - d }; });
    if (lkc.r === false && lkc.d === 0) ok('미해금 일차(6일차)는 수령 불가');
    else no('잠긴 일차가 수령됐다: ' + JSON.stringify(lkc));

    /* ---------- 4. 프리미엄 — 패스마다 따로 산다 ---------- */
    console.log('[4] 프리미엄 — 탭별 분리');
    /* 231(2026-08-27) — 잠금 «안내» 를 재는 자리를 모달 → `#fxl .fx-toast` 로 **이사**시켰다.
       149(주인 지시)가 안내를 토스트로 뒤집은 뒤 `passClaim()` 의 잠금 안내(index.html 23613
       `notify('🔒 <b>프리미엄 패스</b>를 활성화하면 받습니다')`)는 모달을 한 번도 안 만든다
       → `#modal` 표시 여부는 원리적으로 항상 false 라 이 한 항목이 굳어 빨갰다(got 이 «둘 다 빈 값»
       인 비대칭 — LESSONS 230-①). 물음(«막았으면 왜 막혔는지 말하는가»)은 그대로 두고
       자리만 옮긴다(185-④ · 230·215·213·214·217·218 과 같은 계열).
       · 기대 문구는 리터럴 금지 — 헤더의 «프리미엄» 라벨과 구매 버튼 라벨(«프리미엄 활성화»)에서
         **런타임 계산**한다(185-①). 문안이 바뀌어도 «무엇을 활성화하라고 말하는가» 는 남는다.
       · 대기는 없다(LESSONS 230-③) — click → passClaim → notify → fxToast 의 appendChild 까지가
         **한 동기 흐름**이라 같은 evaluate 안에서 읽으면 퇴장(760/1060ms)과 무관하다.
         대신 재기 «전» 에 남은 토스트를 비운다 — `fxToast` 는 4장부터 조용히 드롭한다(230-②).
       · 코드 경로가 둘이면 단언도 둘이다(230-④) — «막혔다»(재화·수령키·칸 상태 불변)와
         «왜 막혔는지 말한다»(토스트 문구)와 «팝업이 아니다»(149 되돌림 감시)를 따로 세운다. */
    const lockPop = await page.evaluate(() => {
      const fxTxt   = () => [...document.querySelectorAll('#fxl .fx-toast')].map(t => t.textContent).join(' | ');
      const clearFx = () => document.querySelectorAll('#fxl .fx-toast').forEach(t => t.remove());
      clearFx();
      /* 기대 문구의 근거를 소스에서 런타임으로 (185-①) */
      const premLbl = ((document.querySelector('#psw .ps-hdr b.p i') || {}).textContent || '').trim();
      const buyLbl  = ((document.querySelector('#psBuy .t1 i') || {}).textContent || '').trim();
      const act     = buyLbl.replace(premLbl, '').trim();          /* «프리미엄 활성화» − «프리미엄» */
      const cell = document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')[1].querySelector('.ps-bx.c1');
      const d0 = S.dia, n0 = Object.keys(S.pass.got).length;
      cell.click();
      const txt = fxTxt();
      const modalOn = document.getElementById('modal').classList.contains('on');
      const blocked = S.dia === d0 && Object.keys(S.pass.got).length === n0 && !cell.classList.contains('dn');
      clearFx(); if (typeof closeModal === 'function') closeModal();
      return { txt, modalOn, blocked, premLbl, act, prem: !!passPrem() };
    });
    /* ⚠ ✓ 와 ✗ 의 **첫 자락을 같게** 쓴다 — `tools/neg231.js` 가 항목을 이름 조각으로 집는다
       (neg230 관례). 문구가 갈리면 되돌림 시험이 «빨간 항목» 을 못 찾는다. */
    const L = { pre: '프리미엄 잠금 전제 — 미구매 상태',
                blk: '프리미엄 칸 수령 차단',
                tos: '잠금 안내 토스트 노출',
                pop: '잠금 안내는 팝업이 아니다' };
    if (!lockPop.prem) ok(L.pre);
    else no(L.pre + ' — 재기도 전에 프리미엄이 켜져 있다');
    if (lockPop.blocked) ok(L.blk + ' — 다이아·수령키·칸 상태 불변');
    else no(L.blk + ' 실패 — 그냥 수령됐다: ' + JSON.stringify(lockPop));
    if (lockPop.premLbl && lockPop.act &&
        lockPop.txt.indexOf(lockPop.premLbl) >= 0 && lockPop.txt.indexOf(lockPop.act) >= 0)
      ok(L.tos + ` — «${lockPop.premLbl}…${lockPop.act}» (got "${lockPop.txt}")`);
    else no(L.tos + ' 실패 — 안내가 없거나 무엇을 활성화하라는지 안 말한다: ' + JSON.stringify(lockPop));
    if (!lockPop.modalOn) ok(L.pop + ' — 149(주인 지시) 토스트화 유지');
    else no(L.pop + ' 실패 — 모달로 떴다(149 되돌림): ' + JSON.stringify(lockPop));
    await page.evaluate(() => window.devPassPrem());
    await page.waitForTimeout(250);
    const buyHidden = await page.evaluate(() => getComputedStyle(document.getElementById('psBuy')).display);
    if (buyHidden === 'none') ok('출석 프리미엄 활성화 → 구매 버튼 숨김'); else no('구매 버튼이 그대로: ' + buyHidden);
    const rwP = await page.evaluate(() => passRw(1, 1));
    const kp = rwP.k === 'gold' ? 'g' : (rwP.k === 'dia' ? 'd' : 'r');
    const b4 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    await page.evaluate(() => document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')[1].querySelector('.ps-bx.c1').click());
    await page.waitForTimeout(250);
    const a4 = await page.evaluate(() => ({ g: S.gold, d: S.dia, r: S.relic }));
    eq(`프리미엄 2일차 수령 — ${rwP.k} 증가량`, a4[kp] - b4[kp], rwP.n, 0);
    /* 출석 프리미엄을 샀다고 스테이지 프리미엄이 열리면 안 된다 */
    const cross = await page.evaluate(() => {
      document.querySelector('#psBar [data-ptab="stage"]').click();
      return { prem: JSON.stringify(S.pass.prem),
               buy: getComputedStyle(document.getElementById('psBuy')).display };
    });
    if (cross.buy !== 'none') ok('스테이지 탭 프리미엄은 여전히 미구매 (prem=' + cross.prem + ')');
    else no('출석 프리미엄이 스테이지까지 열었다: ' + cross.prem);

    /* ---------- 5. 저장 네임스페이스 · 영속성 ---------- */
    console.log('[5] 저장 — «탭:단계:칸» 네임스페이스');
    const keys = await page.evaluate(() => Object.keys(S.pass.got));
    if (keys.length && keys.every(x => x.split(':').length === 3 && x.startsWith('att:')))
      ok('수령 키가 «att:단계:칸» 으로 저장된다: ' + keys.join(' '));
    else no('키 네임스페이스 이상: ' + keys.join(' '));
    const cross2 = await page.evaluate(() => {
      /* 스테이지 탭에서 같은 번호 칸이 수령완료로 보이면 네임스페이스가 샌 것이다 */
      document.querySelector('#psBar [data-ptab="stage"]').click();
      return [...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')].slice(0, 3)
        .map(e => e.querySelector('.ps-bx.c0').classList.contains('dn'));
    });
    if (cross2.every(x => !x)) ok('출석 수령이 스테이지 패스 칸에 안 샌다');
    else no('네임스페이스 누수: ' + cross2.join(','));
    /* reload 후에도 남는다 (addInitScript 금지 — LESSONS 50-②).
       ⚠ save() 는 자동 저장 타이머와 경쟁한다 — 저장 직전 스냅샷을 같이 찍어 비교한다. */
    const before = await page.evaluate(() => { save();
      return { got: Object.keys(S.pass.got).sort().join(' '), prem: JSON.stringify(S.pass.prem) }; });
    console.log('    (저장 직전: got=' + before.got + ' prem=' + before.prem + ')');
    /* ⚠ `page.reload()` 로 확인하면 **간헐 실패**한다 — file:// 컨텍스트에서 localStorage 커밋과
       리로드가 경쟁해 load() 가 빈 저장소를 읽는 경우가 있다(고정 대기·조건 대기 둘 다 못 막았다).
       영속성의 계약은 «save() 가 저장소에 쓰고, load() 가 그걸 되살린다» 이므로 그 둘을 직접 본다:
       ⓐ 저장소 원문에 우리 키가 들어갔는지 ⓑ 그 원문으로 load() 를 다시 돌리면 S 가 복원되는지. */
    const rawOk = await page.evaluate(() => {
      const raw = localStorage.getItem('idle_hunter_save_v4') || '';
      return { hasGot: raw.indexOf('att:1:0') >= 0 && raw.indexOf('att:1:1') >= 0,
               hasPrem: raw.indexOf('"prem":{"att":1}') >= 0 };
    });
    if (rawOk.hasGot && rawOk.hasPrem) ok('영속성 ⓐ — save() 가 «att:단계:칸»·prem.att 를 저장소에 쓴다');
    else no('영속성 ⓐ 실패: ' + JSON.stringify(rawOk));
    const kept = await page.evaluate(() => {
      S = { }; load();                       /* 저장소 원문만으로 전역 S 를 다시 세운다 */
      return { got: !!S.pass.got['att:1:0'], gotP: !!S.pass.got['att:1:1'],
               prem: !!(S.pass.prem && S.pass.prem.att),
               stagePrem: !!(S.pass.prem && S.pass.prem.stage), att: S.att.n };
    });
    if (kept.got && kept.gotP && kept.prem && !kept.stagePrem && kept.att === 2)
      ok('영속성 ⓑ — load() 가 출석 수령·프리미엄·접속일을 되살리고, 스테이지는 미구매 그대로');
    else no('영속성 ⓑ 실패: ' + JSON.stringify(kept));

    /* ---------- 6. 구버전 세이브 마이그레이션 ---------- */
    console.log('[6] 마이그레이션 — 35 시절 세이브');
    const mig = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('idle_hunter_save_v4'));
      d.pass = { prem: true, got: { '12:0': 1, '14:1': 1 } };     /* 35 시절 구조 */
      localStorage.setItem('idle_hunter_save_v4', JSON.stringify(d));
      load();
      return { got: Object.keys(S.pass.got).sort().join(' '), prem: JSON.stringify(S.pass.prem) };
    });
    if (mig.got === 'stage:12:0 stage:14:1') ok('구 키 «단계:칸» → «stage:단계:칸» 이관: ' + mig.got);
    else no('키 이관 실패: ' + mig.got);
    if (mig.prem === '{"stage":1}') ok('구 prem boolean → { stage:1 } 이관');
    else no('prem 이관 실패: ' + mig.prem);
    for (const v of [undefined, null, 'x', 7, { prem: 'y' }, { prem: {}, got: 3 }]) {
      const res = await page.evaluate((val) => {
        const d = JSON.parse(localStorage.getItem('idle_hunter_save_v4'));
        if (val === undefined) delete d.pass; else d.pass = val;
        localStorage.setItem('idle_hunter_save_v4', JSON.stringify(d));
        load();
        try { passTab = 'att'; renderPass(); } catch (e) { return { err: e.message }; }
        return { t: typeof S.pass, prem: typeof S.pass.prem, got: typeof S.pass.got,
                 rows: document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').length,
                 /* 493 이관 — 이 항이 재는 것은 «망가진 세이브를 흡수하고 **리스트가 선다**» 이지
                    «출석 패스가 30일이다» 가 아니다. 길이를 여기 손으로 적어 두면 길이가 바뀔 때마다
                    이 자리가 빨개진다(2026-08-31, 30 → 100). 길이 자체는 `verify493` [A] 가 못박는다. */
                 /* 526 이관 — 창 가상화 뒤로 DOM 의 행 수는 «창»(23행)이지 «길이» 가 아니다.
                    «리스트가 선다» 는 이제 **트랙 높이**가 말한다(선두 라벨 행 226.5 + n × pitch). */
                 trackH: +parseFloat(document.getElementById('psTk').style.height).toFixed(2),
                 wantH: +(226.5 + PASS_TABS.att.n * PASS_RH).toFixed(2),
                 want: PASS_TABS.att.n };
      }, v === undefined ? undefined : v);
      if (!res.err && res.t === 'object' && res.prem === 'object' && res.got === 'object'
          && Math.abs(res.trackH - res.wantH) < 0.5 && res.rows > 0)
        ok('마이그레이션 — pass=' + JSON.stringify(v) + ' → 기본값 흡수');
      else no('마이그레이션 실패 pass=' + JSON.stringify(v) + ': ' + JSON.stringify(res));
    }
    /* NaN/undefined 가 화면에 새지 않는다 */
    const txt = await page.evaluate(() => document.getElementById('psw').textContent);
    if (!/NaN|undefined|Infinity/.test(txt)) ok('화면에 NaN/undefined 없음');
    else no('화면에 NaN/undefined 가 있다');
    await ctx.close();
  }

  /* ---------- 7. 화면비 회귀 (LESSONS 63-②) ---------- */
  console.log('[7] 화면비 회귀 — 출석 탭');
  for (const h of [2280, 1920, 2520]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
    /* ⚠ addInitScript 는 reload 때도 다시 돈다 — 무조건 setItem 하면 저장된 진행도를 덮어써
       «영속성 실패» 로 오진한다(LESSONS 50-②). 비어 있을 때만 심는다. */
    await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify({ best: 79, att: { n: 2, date: '' }, pass: { prem: {}, got: {} } })]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push('pageerror(' + h + '): ' + e.message));
    await page.goto(URL); await page.waitForTimeout(800);
    await openAttTab(page);
    const g = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      return { bar: r('.ps-bar'), lb: r('.ps-lb'), c1: r('#psTk .ps-r:not(.ps-hr) .ps-bx.c1'),
               app: document.getElementById('app').getBoundingClientRect().height };
    });
    eq(`1080×${h} 하단바 bottom = 프레임 높이`, g.bar.y + g.bar.h, g.app, 1);
    eq(`1080×${h} 선두 알약 left`, g.lb.x, 454);
    eq(`1080×${h} 프리미엄 칸 left`, g.c1.x, 741);
    await ctx.close();
  }

  if (errs.length) { errs.slice(0, 8).forEach(e => no(e)); }
  else ok('콘솔·런타임 에러 0');

  await browser.close();
  console.log(bad ? `\nVERIFY36 FAIL — ${bad} 건` : '\nVERIFY36 PASS');
  process.exit(bad ? 1 : 0);
})();
