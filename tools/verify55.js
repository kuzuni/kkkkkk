/* 55 설정 팝업 회귀 게이트 — 기하(캡처 실측 대조) + 기능(누르면 무엇이 바뀌는지).
   사용: node tools/verify55.js   → 마지막 줄 `VERIFY55 n/n` */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs'); const path = require('path');
function launchOpts(){ for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium'].filter(Boolean)){
  try{ if(fs.existsSync(p)) return { executablePath:p }; }catch(e){} } return {}; }
let pass = 0, fail = 0; const bad = [];
const eq = (n, got, want, tol = 1.5) => {
  const ok = Math.abs(got - want) <= tol;
  ok ? pass++ : (fail++, bad.push(`${n}: ${got} ≠ ${want} (±${tol})`));
};
const is = (n, got, want) => { const ok = got === want; ok ? pass++ : (fail++, bad.push(`${n}: ${got} ≠ ${want}`)); };
(async () => {
  let browser; try { browser = await launch(chromium); }
  catch(e){ const o = launchOpts(); if(!o.executablePath) throw e; browser = await launch(chromium, o); }
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve('index.html'), { waitUntil:'load' });
  await page.waitForTimeout(1200);

  const R = await page.evaluate(() => {
    S.opt = { vol:100, bgm:true, sfx:true, shake:true, push:false, night:false };
    openConf();
    const app = document.getElementById('app').getBoundingClientRect();
    const q = s => { const e = document.querySelector(s); if(!e) return null; const r = e.getBoundingClientRect();
      return { x:+(r.left-app.left).toFixed(1), y:+(r.top-app.top).toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; };
    return { box:q('.cf55'), head:q('.cf55-head'), body:q('.cf55-body'), track:q('.cf55-track'),
             knob:q('.cf55-knob'), rule:q('.cf55-rule'), list:q('.cf55-list'), acc:q('.cf55-acc'),
             badge:q('.cf55-badge'), b1:q('.cf55-btn.b1'), b3:q('.cf55-btn.b3'),
             row1:q('.cf55-row:nth-child(1)'), row6:q('.cf55-row:nth-child(6)'),
             gold:q('.cf55-gold'), sw2:q('.cf55-row:nth-child(2) .cf55-sw'),
             kn2:q('.cf55-row:nth-child(2) .cf55-kn'), kn5:q('.cf55-row:nth-child(5) .cf55-kn'),
             dl:q('.cf55-dl'), rows:document.querySelectorAll('.cf55-row').length };
  });
  /* ── 기하: 프레임 y = ref y − 84 ── */
  eq('팝업 x', R.box.x, 142); eq('팝업 y', R.box.y, 455);
  eq('팝업 w', R.box.w, 796); eq('팝업 h', R.box.h, 1347);
  eq('헤더 h', R.head.h, 91); eq('본문 w', R.body.w, 758);
  /* border-box 1230 = 크림(패딩박스) 1228 + border-top 2. 크림 원점이 ref 639 → 프레임 555 다. */
  eq('본문 h', R.body.h, 1230); eq('크림 원점 y', R.body.y + 2, 555);
  eq('트랙 x', R.track.x, 216); eq('트랙 y', R.track.y, 619); eq('트랙 w', R.track.w, 679);
  eq('노브(vol100) x', R.knob.x, 835);
  eq('구분선 y', R.rule.y, 717); eq('구분선 w', R.rule.w, 699);
  eq('리스트 y', R.list.y, 740); eq('리스트 h', R.list.h, 509); is('행 수', R.rows, 6);
  eq('1행 y', R.row1.y, 740); eq('6행 y', R.row6.y, 1164, 2);
  eq('언어버튼 x', R.gold.x, 685); eq('언어버튼 w', R.gold.w, 169); eq('언어버튼 h', R.gold.h, 69);
  eq('토글 트랙 x', R.sw2.x, 685); eq('토글 트랙 w', R.sw2.w, 169); eq('토글 트랙 h', R.sw2.h, 58);
  eq('ON 노브 x', R.kn2.x, 755); eq('OFF 노브 x', R.kn5.x, 685);
  eq('노브 w', R.kn2.w, 99); eq('노브 h', R.kn2.h, 69);
  eq('계정삭제 밑줄 x', R.dl.x, 496); eq('계정삭제 밑줄 w', R.dl.w, 90);
  eq('계정패널 y', R.acc.y, 1280); eq('계정패널 h', R.acc.h, 198);
  eq('구글카드 x', R.badge.x, 416); eq('구글카드 y', R.badge.y, 1370); eq('구글카드 w', R.badge.w, 248);
  eq('버튼1 x', R.b1.x, 201); eq('버튼3 x', R.b3.x, 661); eq('버튼 y', R.b1.y, 1504); eq('버튼 h', R.b1.h, 99);

  /* ── 기능: 눌렀을 때 무엇이 바뀌는가 ── */
  const F = await page.evaluate(async () => {
    const out = {};
    const click = s => document.querySelector(s).dispatchEvent(new MouseEvent('click', { bubbles:true }));
    /* 1. 토글 5개 — 상태 반전 + 노브 이동 + 저장 */
    click('.cf55-row:nth-child(2) .cf55-sw');
    out.bgmOff = S.opt.bgm === false;
    out.bgmKnobLeft = document.querySelector('.cf55-row:nth-child(2) .cf55-kn').getBoundingClientRect().left
                    < document.querySelector('.cf55-row:nth-child(2) .cf55-sw').getBoundingClientRect().left + 20;
    out.bgmLabel = document.querySelector('.cf55-row:nth-child(2) .cf55-kn>i').textContent;
    out.saved = JSON.parse(localStorage.getItem(KEY)).opt.bgm === false;
    click('.cf55-row:nth-child(2) .cf55-sw'); out.bgmBack = S.opt.bgm === true;
    /* 2. 화면 흔들림 — 끄면 cam.shake 가 죽는다(67 카메라) */
    cam.shake = 12; S.opt.shake = false; if(typeof step === 'function'){} 
    click('.cf55-row:nth-child(4) .cf55-sw');        /* 위에서 false 로 바꿨으니 여기선 true 로 */
    out.shakeOnAfter = S.opt.shake === true;
    click('.cf55-row:nth-child(4) .cf55-sw');
    out.shakeKilled = (S.opt.shake === false) && cam.shake === 0;
    click('.cf55-row:nth-child(4) .cf55-sw');        /* 원상 복구 */
    /* 3. 볼륨 슬라이더 — 트랙 좌측을 누르면 값이 내려가고 노브가 따라간다 */
    const tr = document.querySelector('.cf55-track'), r = tr.getBoundingClientRect();
    tr.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:1, clientX:r.left + r.width*0.25, clientY:r.top + r.height/2 }));
    out.vol25 = Math.abs(S.opt.vol - 25) <= 2;
    out.knobMoved = document.querySelector('.cf55-knob').getBoundingClientRect().left < r.left + r.width*0.5;
    out.volSaved = Math.abs(JSON.parse(localStorage.getItem(KEY)).opt.vol - S.opt.vol) < 1;
    /* 4. 볼륨 0 이면 sndOn 이 꺼진다(오디오 게이트) */
    S.opt.vol = 0; out.gateOff = sndOn('bgm') === false; S.opt.vol = 100; out.gateOn = sndOn('bgm') === true;
    /* 5. 쿠폰 — 코드 1회 지급 + 재사용·오코드 차단
       ── 304 개정(2026-08-28) ────────────────────────────────────────────────
       옛 판정은 `window.popup = (t,b)=>msgs.push(b)` 로 **통보 함수 하나**를 훔쳐봤다.
       206(알림 전면 토스트화)이 안내를 `notify()` → `#fxl` 의 `.fx-toast` 로 옮기면서
       `msgs` 가 늘 비어 «차단» 2건이 빨개졌다 — 제품은 멀쩡한데 게이트의 **전제**가 죽은 것이다
       (236·242 «경로가 바뀌어도 전제는 죽는다» 와 동형).
       그래서 둘로 갈라 묻는다:
         · **계약** — 다이아가 안 늘고 이력(`S.opt.cp`)이 안 더러워졌는가. 통보 경로에 안 묶인다.
         · **표현** — 안내가 실제로 화면에 떴는가. 토스트는 1060ms 만에 사라지므로 고정 대기가 아니라
           `MutationObserver` 로 등장을 받아 적는다(242 §9 와 같은 형태). `takeRecords()` 로 훑는 이유는
           옵저버 콜백이 **마이크로태스크**라 `click()` 직후 동기 읽기에는 아직 안 도착하기 때문이다. */
    const dia0 = S.dia; const op = window.prompt;
    const fxLay = document.getElementById('fxl'); const toasts = [];
    const collect = recs => recs.forEach(m => m.addedNodes.forEach(n => {
      if(n.nodeType === 1 && n.classList && n.classList.contains('fx-toast')) toasts.push(n.textContent);
    }));
    const mo = fxLay ? new MutationObserver(collect) : null;
    const drain = () => { if(mo) collect(mo.takeRecords()); };
    if(mo) mo.observe(fxLay, { childList:true });
    out.fxLayer = !!fxLay;                         /* 레이어가 없으면 아래 «안내» 2건은 무의미하다 */
    if(fxLay) fxLay.querySelectorAll('.fx-toast').forEach(n => n.remove());   /* 스택 4장 드롭 방지 */
    if(!S.opt.cp) S.opt.cp = {};
    window.prompt = () => 'HELLO2026';
    click('[data-cf="coupon"]'); drain();
    out.coupon1 = S.dia === dia0 + 500 && S.opt.cp.HELLO2026 === 1;
    let seen = toasts.length;
    click('[data-cf="coupon"]'); drain();          /* 재사용 — 계약: 두 번째 지급이 없다 */
    out.coupon2 = S.dia === dia0 + 500 && S.opt.cp.HELLO2026 === 1;
    out.coupon2Msg = /이미 사용/.test(toasts.slice(seen).join(''));
    seen = toasts.length;
    window.prompt = () => 'NOPE';
    click('[data-cf="coupon"]'); drain();          /* 없는 코드 — 계약: 지급도 이력도 없다 */
    out.couponBad = S.dia === dia0 + 500 && !('NOPE' in S.opt.cp);
    out.couponBadMsg = /사용할 수 없는/.test(toasts.slice(seen).join(''));
    if(mo) mo.disconnect();
    window.prompt = op;
    out.cpSaved = JSON.parse(localStorage.getItem(KEY)).opt.cp && JSON.parse(localStorage.getItem(KEY)).opt.cp.HELLO2026 === 1;
    /* 새로고침을 흉내낸다 — load() 가 opt 를 항목별로 다시 짓기 때문에 cp 가 살아남는지 본다 */
    out.cpSurvives = (() => { const raw = localStorage.getItem(KEY); load(); return !!(S.opt.cp && S.opt.cp.HELLO2026); })();
    /* 6. 언어 버튼은 토글이 아니다(값이 안 바뀐다) */
    const before = JSON.stringify(S.opt); click('.cf55-gold'); out.langNoop = JSON.stringify(S.opt) === before;
    /* 7. 딤 탭 → 닫힘 / ▦ 메뉴 → 열림 */
    document.getElementById('cfw').dispatchEvent(new MouseEvent('click', { bubbles:true }));
    out.closed = !document.getElementById('cfw').classList.contains('on');
    openConf(); out.reopened = document.getElementById('cfw').classList.contains('on');
    /* 8. UID·Gamer Id 가 실제 값이다(NaN·undefined 없음) */
    out.uid = /^UID: \d{13}$/.test(document.getElementById('cfUid').textContent);
    out.gid = /^Gamer Id: [0-9a-f-]{20,}$/.test(document.getElementById('cfGid').textContent);
    return out;
  });
  Object.entries({
    '토글 OFF 반전':F.bgmOff, '토글 노브 좌측 이동':F.bgmKnobLeft, '노브 라벨 OFF':F.bgmLabel === 'OFF',
    '토글 저장':F.saved, '토글 복귀':F.bgmBack,
    '흔들림 ON 복원':F.shakeOnAfter, '흔들림 OFF → cam.shake 0':F.shakeKilled,
    '볼륨 25% 반영':F.vol25, '노브 추종':F.knobMoved, '볼륨 저장':F.volSaved,
    '볼륨0 → 오디오게이트 off':F.gateOff, '볼륨100 → on':F.gateOn,
    '쿠폰 지급':F.coupon1, '쿠폰 재사용 차단':F.coupon2, '잘못된 코드 차단':F.couponBad,
    '토스트 레이어 존재':F.fxLayer,               /* 304 — 아래 «안내» 2건이 무엇을 재는지의 전제 */
    '쿠폰 재사용 안내':F.coupon2Msg, '잘못된 코드 안내':F.couponBadMsg,
    '쿠폰 이력 저장':F.cpSaved, '쿠폰 이력이 새로고침을 견딤':F.cpSurvives,
    '언어 버튼은 무변경':F.langNoop, '딤 탭 닫힘':F.closed, '재오픈':F.reopened,
    'UID 형식':F.uid, 'Gamer Id 형식':F.gid
  }).forEach(([k, v]) => is(k, !!v, true));
  is('콘솔 에러 0', errs.length, 0);
  if(errs.length) errs.forEach(e => console.log('  err:', e));
  await browser.close();
  bad.forEach(b => console.log('  ✗', b));
  console.log(`VERIFY55 ${pass}/${pass + fail}` + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
