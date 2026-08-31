/* 작업 607 — 재현(338 규칙: 처방 전에 «찍힌 픽셀·찍힌 글자» 부터 본다).
 *
 * 잡은 것: `tools/verify125.js` 34/38 — A1 1건 · A3 1건 (+ 그 결과인 §R4·§R5).
 *   · A1 : 589 가 넣은 결제 목업 우편 제목 `t:'🎫 프리미엄 패스 — '` 이 «소스에 남은 화폐 이모지» 로 잡힌다.
 *   · A3 : 허용 목록의 `"' 이용권 — '"` 이 **죽었다** — 588·589 가 이용권 구매를 `payMock()` +
 *          우편(`t:'🛒 이용권 구매 보상 — '`)으로 갈아 끼우면서 그 토스트가 사라졌다.
 *
 * 등재문이 남긴 갈래 둘:
 *   ⓐ 589 의 우편 제목·아이콘을 `curIc()`/`CUR_ICON` 로 옮긴다.
 *   ⓑ A1 의 허용 목록을 «목업 우편 제목» 으로 넓히고 A3 의 죽은 항목을 같이 정리한다.
 *
 * ⚠ **이 자는 ⓑ 를 고르기 전에 물어야 하는 것을 묻는다.** 289·211·370 이 «🎫 는 화폐가 아니다» 를
 *    세 번 판정했지만 그 셋은 전부 «소스 한 줄» 판정이었다. 허용 목록에 한 줄을 더하는 순간
 *    그 줄은 **A1 의 눈 밖**으로 나가므로, 그 자리가 **화면에 무엇을 흘리는지**를 A1 이 아니라
 *    F2(런타임) 축으로 먼저 재 두지 않으면 «게이트만 초록» 인 수리가 된다(334 교훈 · 373 전례:
 *    F2 가 초록이던 이유는 판정이 맞아서가 아니라 «스윕이 그 화면을 한 번도 안 열어서» 였다).
 *
 * 재는 것 — 프리미엄 패스를 **실제로 사서** 우편함을 연 뒤:
 *   [1] 사기 전 우편함에 PURE 글리프(🪙💰🎟️🎫) 0건 — 대조군(= 지금 스윕이 보는 그림)
 *   [2] 산 뒤 우편함에 PURE 글리프 몇 건 · 어느 노드에 · 보이는 크기 얼마
 *   [3] 제목 자리(`.ml-t`)에 🎫 가 오는가 — 두 렌더 자리가 `^[^가-힣\w]+` 로 머리 기호를 떼므로 «안 온다» 가 예상
 *   [4] 썸네일 자리(`.ml-i`)에 🎫 가 오는가 — `ic:'🎫'` 는 떼는 자리를 안 지난다
 *   [5] 수령 토스트(«우편 확인 — …»)에 🎫 가 오는가 — 같은 strip 을 지난다
 *   [6] 머리가 아닌 자리에 두면(대조 변조) 제목에도 샌다 — [3] 이 «strip 덕분» 임을 못박는 음성항
 *   [7] F2 의 판정식으로 물으면 몇 건인가 — «스윕이 산 세이브를 보면 F2 가 빨간가»
 *
 * 실행: node tools/probe607.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const PURE = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'];

/* F2 와 **같은 판정**(글리프를 담은 «잎» 노드)을 쓴다 — 자기만의 사본을 들면 «자는 무른데
   재현기만 빨강» 이 되어 다음 세션이 또 갈래를 못 가른다(334). */
const SCAN = `(PURE) => {
  const hit = [];
  const walk = (n) => {
    if (n.nodeType === 3) {
      const g = PURE.find(e => n.nodeValue.indexOf(e) >= 0);
      if (g) {
        const el = n.parentElement;
        const r = el ? el.getBoundingClientRect() : null;
        /* 잎 노드의 부모만 적으면 «.ml-t > i» 처럼 **클래스 없는 껍데기**가 나와 자리를 못 가른다 —
           클래스를 가진 가장 가까운 조상까지 두 칸을 적는다. */
        const named = el ? el.closest('[class]') : null;
        hit.push({ g, txt: n.nodeValue.trim().slice(0, 40),
                   desc: el ? ((named && named !== el
                       ? '.' + String(named.className).trim().split(/\\s+/).join('.') + '>' : '')
                     + el.tagName.toLowerCase()
                     + (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '')) : '?',
                   w: r ? +r.width.toFixed(2) : 0, h: r ? +r.height.toFixed(2) : 0,
                   vis: !!(r && r.width > 0 && r.height > 0) });
      }
      return;
    }
    if (n.nodeType !== 1) return;
    const st = getComputedStyle(n);
    if (st.display === 'none' || st.visibility === 'hidden') return;
    n.childNodes.forEach(walk);
  };
  walk(document.body);
  return hit.filter(h => h.vis);
}`;

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  return { ctx, p };
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  console.log('\n=== probe607 — 589 결제 목업 우편이 화면에 흘리는 글리프 ===');
  const b = await launch(chromium);
  const s = await boot(b);
  await s.p.evaluate((src) => { window.__probe607scan = eval('(' + src + ')'); }, SCAN);
  const P = await s.p.evaluate(async (PURE_) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shut = () => ['closeShopPage','closeDungeon','closeDunDetail','closeRelw','closeMail','closeQuest',
      'closeAttend','closePass','closeBag','closeCurInfo','closeColl21','closeRank','closeBless','closeProfile',
      'closeTrain','closeMenu','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    const scan = window.__probe607scan;
    const out = {};

    /* [1] 대조군 — 사기 전 우편함 */
    shut(); openMail(); await sleep(120);
    out.before = scan(PURE_);
    shut();

    /* [2] 산다 — `buyPassPrem` 은 payMock → deliver → sendMail 한 벌이다 */
    out.bought = !!buyPassPrem('stage');
    out.mailx = (S.mailx || []).map(m => ({ t: m.t, ic: m.ic || '', g: m.g, c: m.c, r: m.r, m: m.m }));
    shut(); openMail(); await sleep(140);
    out.after = scan(PURE_);
    /* 제목·썸네일 자리를 **노드로** 따로 읽는다 */
    /* ⚠ 첫 `.ml-r` 는 고정 우편(m1 «신규 헌터 환영 선물»)이다 — **그 통을 재면 아무것도 안 재게 된다**.
       방금 만든 통을 id 로 집는다(`data-ml`). */
    const mid0 = (S.mailx || []).slice(-1)[0].id;
    const rowOf = (id) => { const b = document.querySelector('.ml-b[data-ml="' + id + '"]');
                            return b ? b.closest('.ml-r') : null; };
    const row = rowOf(mid0);
    out.rowFound = !!row;
    if (row) {
      const t = row.querySelector('.ml-t');
      const ic = row.querySelector('.ml-i');
      out.titleTxt = t ? t.textContent.trim() : null;
      out.thumbTxt = ic ? ic.textContent.trim() : null;
      const rt = t ? t.getBoundingClientRect() : null, ri = ic ? ic.getBoundingClientRect() : null;
      out.titleBox = rt ? [+rt.width.toFixed(2), +rt.height.toFixed(2)] : null;
      out.thumbBox = ri ? [+ri.width.toFixed(2), +ri.height.toFixed(2)] : null;
    }
    /* [5] 수령 토스트 */
    const mid = mid0;
    claimMail(mid);
    await sleep(120);
    const tst = document.querySelector('#toast, .toast, #tst');
    out.toastTxt = tst ? (tst.innerText || tst.textContent || '').trim().slice(0, 80) : null;
    out.toastAll = (document.body.innerText || '').split('\n').filter(l => /우편 확인|결제 완료/.test(l)).slice(0, 3);

    /* [6] 음성항 — 머리가 아닌 자리에 같은 글리프를 두면 제목에도 샌다 */
    const m2 = (S.mailx || []).slice(-1)[0];
    m2.t = '프리미엄 \u{1F3AB} 패스 — 대조';
    shut(); openMail(); await sleep(140);
    const row2 = rowOf(m2.id);
    out.midTitleTxt = row2 ? (row2.querySelector('.ml-t') || {}).textContent : null;
    out.midHits = scan(PURE_).filter(h => /ml-t/.test(h.desc)).length;
    m2.t = '\u{1F3AB} 프리미엄 패스 — 스테이지';
    shut();
    return out;
  }, PURE);

  await s.ctx.close();
  await b.close();

  const show = (a) => a.length ? a.map(h => h.g + '@' + h.desc + '[' + h.w + '×' + h.h + ']'
    + (h.txt ? ' «' + h.txt + '»' : '')).join(' · ') : '0건';

  console.log('\n--- 실측 ---');
  console.log('  [1] 사기 전 우편함 PURE 글리프 : ' + show(P.before));
  console.log('  [2] 구매 성공                  : ' + P.bought + ' · 우편 ' + JSON.stringify(P.mailx));
  console.log('  [2] 산 뒤 우편함 PURE 글리프   : ' + show(P.after));
  console.log('  [3] 제목 자리 .ml-t            : «' + P.titleTxt + '» ' + JSON.stringify(P.titleBox));
  console.log('  [4] 썸네일 자리 .ml-i          : «' + P.thumbTxt + '» ' + JSON.stringify(P.thumbBox));
  console.log('  [5] 수령 토스트                : ' + JSON.stringify(P.toastAll));
  console.log('  [6] 글리프를 문장 가운데로 옮기면 제목 : «' + P.midTitleTxt + '» · .ml-t 적중 ' + P.midHits + '건');

  console.log('\n--- 판정 ---');
  ok(P.before.length === 0,
     '[1] 사기 전 우편함은 PURE 글리프 0건 = **지금 스윕이 보는 그림**(F2 가 초록인 이유가 판정이 아니라 «표본») — ' + show(P.before));
  ok(P.bought === true, '[2] `buyPassPrem` 이 실제로 통을 만든다(재현 가능) — 우편 ' + P.mailx.length + '통');
  ok(P.titleTxt !== null && P.titleTxt.indexOf('\u{1F3AB}') < 0,
     '[3] 제목 자리 `.ml-t` 에는 🎫 가 **안 온다** — 두 렌더 자리가 `^[^가-힣\\w]+` 로 머리 기호를 뗀다 · 실측 «' + P.titleTxt + '»');
  ok(P.midHits > 0 && String(P.midTitleTxt).indexOf('\u{1F3AB}') >= 0,
     '[6] 음성항 — 같은 글리프를 **머리가 아닌 자리**에 두면 제목에 그대로 샌다(=[3] 은 strip 덕분이지 우연이 아니다) · 실측 «' + P.midTitleTxt + '»');
  ok((P.toastAll || []).join(' ').indexOf('\u{1F3AB}') < 0,
     '[5] 수령 토스트(«우편 확인 — …»)에도 🎫 가 안 온다(같은 strip) — ' + JSON.stringify(P.toastAll));
  const thumbLeak = P.after.filter(h => /ml-i/.test(h.desc));
  ok(thumbLeak.length > 0,
     '[4] 그러나 **썸네일 `ic:\'🎫\'` 은 화면에 그대로 그려진다** — `ic` 는 머리 기호를 떼는 자리를 안 지난다 · ' + show(thumbLeak));
  ok(P.after.length === thumbLeak.length,
     '[7] 산 세이브에서 F2 판정으로 새는 자리는 **썸네일 하나뿐**이다(제목은 안 샌다) — 총 ' + P.after.length + '건 · ' + show(P.after));

  console.log('\nPROBE607 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
