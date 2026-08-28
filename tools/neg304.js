/* 304 음성 시험 — 고친 `verify55` 의 쿠폰 5건이 **빨개질 수 있는지** 를 잰다.
   옛 판정(`window.popup` 훔쳐보기)은 제품이 어떻든 늘 빨갰다. 고친 판정이 반대로
   «늘 초록» 이면 게이트가 아니라 장식이다 — 결함을 하나씩 심어 넣고 **그 항목만** 뒤집히는지 본다.

   심는 결함 4가지
     A 재사용이 안 막힌다      → 계약 «쿠폰 재사용 차단» 빨강(다이아 총액이 틀어지므로 오코드도 연쇄)
     B 없는 코드가 통과한다    → 계약 «잘못된 코드 차단» **만** 빨강
     C 토스트가 못 뜬다        → 표현 «재사용 안내»·«오코드 안내» 만 빨강(계약은 초록)
     D `#fxl` 이 없다          → 표현 2건 + 전제 «토스트 레이어 존재» 빨강, 안내는 옛 팝업으로
                                 (= 206 이전 경로로 되돌아간 상황. 계약은 그래도 초록)
   사용: node tools/neg304.js   → 마지막 줄 `NEG304 n/n` */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0; const bad = [];
const is = (n, got, want) => { got === want ? pass++ : (fail++, bad.push(`${n}: ${got} ≠ ${want}`)); };

/* verify55 §5 와 **같은 판정문**을 쓴다 — 여기서 통과한 자가 저기서도 같은 것을 잰다. */
async function run(page, defect){
  return page.evaluate(async (defect) => {
    const out = {};
    const click = s => document.querySelector(s).dispatchEvent(new MouseEvent('click', { bubbles:true }));
    openConf();
    S.opt.cp = {};
    /* ── 결함 심기(레이어를 잡기 «전» 에 — D 는 레이어 자체를 없앤다) ── */
    let reuseWipe = false;
    const realToast = window.fxToast;
    if(defect === 'A') reuseWipe = true;                       /* 이력을 지워 «처음 쓰는 코드» 로 만든다 */
    if(defect === 'B') CF_CODES.NOPE = 700;                    /* 없는 코드가 실은 있는 코드가 된다 */
    if(defect === 'C') window.fxToast = () => null;            /* 토스트가 못 뜬다(스택 드롭·큐 대기) */
    if(defect === 'D'){ out._pops = []; window.popup = (t, b) => out._pops.push(b);
                        const L0 = document.getElementById('fxl'); if(L0) L0.remove(); }  /* 206 이전 = 팝업 경로 */

    const dia0 = S.dia; const op = window.prompt;
    const fxLay = document.getElementById('fxl'); const toasts = [];
    const collect = recs => recs.forEach(m => m.addedNodes.forEach(n => {
      if(n.nodeType === 1 && n.classList && n.classList.contains('fx-toast')) toasts.push(n.textContent);
    }));
    const mo = fxLay ? new MutationObserver(collect) : null;
    const drain = () => { if(mo) collect(mo.takeRecords()); };
    if(mo) mo.observe(fxLay, { childList:true });
    out.fxLayer = !!fxLay;
    if(fxLay) fxLay.querySelectorAll('.fx-toast').forEach(n => n.remove());

    window.prompt = () => 'HELLO2026';
    click('[data-cf="coupon"]'); drain();
    out.coupon1 = S.dia === dia0 + 500 && S.opt.cp.HELLO2026 === 1;
    let seen = toasts.length;
    if(reuseWipe) S.opt.cp = {};
    click('[data-cf="coupon"]'); drain();
    out.coupon2 = S.dia === dia0 + 500 && S.opt.cp.HELLO2026 === 1;
    out.coupon2Msg = /이미 사용/.test(toasts.slice(seen).join(''));
    seen = toasts.length;
    window.prompt = () => 'NOPE';
    click('[data-cf="coupon"]'); drain();
    out.couponBad = S.dia === dia0 + 500 && !('NOPE' in S.opt.cp);
    out.couponBadMsg = /사용할 수 없는/.test(toasts.slice(seen).join(''));
    if(mo) mo.disconnect();
    window.prompt = op;
    if(defect === 'C') window.fxToast = realToast;
    if(defect === 'B') delete CF_CODES.NOPE;
    return out;
  }, defect);
}

(async () => {
  const browser = await launch(chromium);
  const results = {};
  for(const d of ['none', 'A', 'B', 'C', 'D']){
    const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
    const page = await ctx.newPage();
    await page.goto('file://' + path.resolve('index.html'), { waitUntil:'load' });
    await page.waitForTimeout(1200);
    results[d] = await run(page, d);
    await ctx.close();
  }
  console.log(JSON.stringify(results, null, 1));

  const R = results;
  /* 결함이 없으면 5건 전부 초록 */
  is('none — 지급', R.none.coupon1, true);
  is('none — 재사용 차단', R.none.coupon2, true);
  is('none — 오코드 차단', R.none.couponBad, true);
  is('none — 재사용 안내', R.none.coupon2Msg, true);
  is('none — 오코드 안내', R.none.couponBadMsg, true);
  /* A: 재사용 계약이 뒤집힌다. «오코드 차단» 도 같이 빨개지는데 이는 게이트의 결함이 아니라
        둘이 «다이아 총액» 이라는 **같은 자**를 쓰기 때문이다 — 재사용이 새면 총액이 이미 틀어져 있다.
        특이도(어느 항목이 왜 빨간지)는 B·C·D 가 증명한다. */
  is('A — 재사용 차단이 빨강', R.A.coupon2, false);
  is('A — 지급은 초록(1회차는 정상)', R.A.coupon1, true);
  /* B: 오코드 계약만 뒤집힌다 — 재사용 쪽은 초록으로 남는다 */
  is('B — 오코드 차단이 빨강', R.B.couponBad, false);
  is('B — 재사용 차단은 초록', R.B.coupon2, true);
  /* C·D: 표현만 뒤집히고 계약은 산다 */
  for(const d of ['C', 'D']){
    is(`${d} — 재사용 안내가 빨강`, R[d].coupon2Msg, false);
    is(`${d} — 오코드 안내가 빨강`, R[d].couponBadMsg, false);
    is(`${d} — 재사용 차단은 초록`, R[d].coupon2, true);
    is(`${d} — 오코드 차단은 초록`, R[d].couponBad, true);
  }
  /* D 는 «206 이전» 이다 — 레이어가 없으면 전제 항목(`토스트 레이어 존재`)이 먼저 빨개져
     «왜 안내 2건이 빨간지» 가 표에서 바로 읽힌다. 안내는 옛 팝업으로 갔다. */
  is('D — 레이어 없음이 먼저 드러난다', R.D.fxLayer, false);
  is('D — 안내가 옛 팝업으로 갔다', /이미 사용/.test((R.D._pops || []).join('')), true);
  is('none — 레이어 있음', R.none.fxLayer, true);
  await browser.close();
  bad.forEach(b => console.log('  ✗', b));
  console.log(`NEG304 ${pass}/${pass + fail}` + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
