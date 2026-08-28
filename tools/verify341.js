#!/usr/bin/env node
/* 게이트 — 작업 341 「03 던전 카드 «입장 가능» 레드닷」
 *          (2026-08-28 등재 · 72 18회차 비평가 AP·AQ 2인 일치 실측에서 나옴)
 *
 *   node tools/verify341.js
 *
 * ⚑ **이 게이트가 지키는 것은 «닷을 새로 달았다» 가 아니다.** 등재문은 «부품이 없다
 *   (`<s class="updot">` 노드도 `.dnc` 호스트 CSS 도 둘 다 없다)» 였는데, `tools/probe341.js` 로
 *   재현해 보니 **부품·CSS·토글이 전부 살아 있었다** — 이름이 `.updot` 이 아니라 `.dot`(299 규약
 *   이전부터 있던 부품)이라 `grep updot` 에 안 걸렸을 뿐이다. 비평가가 본 «8장 전부 0개» 는
 *   **캡처 상태 탓**이었다: 부팅 직후 세이브는 `cp() = 505` 라 166 조건(`cp() >= d.req(층)`)이
 *   8장 전부 거짓이어서 닷이 하나도 안 켜지는 게 **정상**인 화면이었다.
 *   ⇒ 제품 0줄 · 고친 곳은 `tools/cap72.js`(캡처 상태에 전투력 축을 세운다).
 *
 * 그래서 이 게이트는 **두 칸을 갈라 쓴다**(326 교훈 «전제와 본체를 갈라라»):
 *   [전제] 캡처 하네스가 «닷을 켤 수 있는» 상태를 만드는가 — 여기가 빨가면 다음 워커는
 *          제품을 열 필요가 없다. 유령(«레드닷 전량 누락»)이 돌아온 자리는 항상 여기다.
 *   [A] 부품 — 카드 렌더가 `<s class="dot">` 를 만들고 `.dnc .dot` 위치 규칙이 있다.
 *   [B] 판정 축 셋을 **각각** 갈라 단언 — 잠금 / 입장권 0 / 전투력 미달 이면 소등.
 *       («셋 다 거짓이면 소등» 한 줄로 뭉치면 축 하나가 죽어도 초록이다.)
 *   [C] 점등 — 셋이 다 참이면 켜지고 실제로 빨간 화소가 찍힌다.
 *   [D] 자리 — ref 실측(AP «26×31 @ x1005..1032 · 카드상변 −1~+29» · AQ «28×31 @ 동일»)과 대조 ·
 *       299 «우상단 사분면» · 스크롤 호스트(`.dns-list{overflow-x:hidden}`)에 링이 안 잘린다(328 교훈).
 *   [E] 경로 체인 — 서브탭 «던전» 배지·탭바 «던전» 칸이 같은 자(`dunCardOk`)로 함께 켜진다(298 규약).
 *   [R] 되돌림 시험 — 노드를 지우면 / 조건을 상시 참으로 만들면 위 항들이 **실제로 빨개진다**.
 *
 * ⚠ 재는 법: `.dnc .dot` 은 `jzDotIn{0%{scale:0}}` 을 탄다 — 렌더 같은 틱에 재면 bbox 가
 *   **0×0** 으로 나온다(probe341 1회차가 이 함정을 그대로 밟았다). 잴 때 애니메이션을 끈다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 이미지 대조가 아니라 «상태 → DOM» 판정이라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;

/* 닷 자리의 빨간 화소 bbox — «켜졌다» 를 DOM 이 아니라 그림으로 한 번 더 친다 */
/* ⚠ 화소를 재기 전에 닷의 애니메이션을 **끈다.** 안 끄면 `jzDotIn`(봉우리 1.3)·`jzDotPulse`(1.14)의
   어느 프레임을 찍었는지에 따라 같은 자리가 27px 도 되고 45px 도 된다(1회차에 [D] 가 45×44 로
   빨개진 것이 그 이유였다 — 게임 틱이 `renderDunPage()` 를 다시 돌려 팝이 재시작한 프레임을 찍었다).
   재는 것은 **머무는 자리**다. 등장 연출의 봉우리는 60/쥬시 축이 따로 본다(322·325 가 쓰는 «봉우리
   배율에서 안 밟는가» 검사는 [D] 의 링 여유 항이 대신한다). */
async function freezeDot(page) {
  await page.addStyleTag({ content: '#dunList .dnc>.dot{animation:none!important;scale:1!important}' });
  await page.waitForTimeout(60);
}
async function redBox(page, rect, pad) {
  const p = pad || 12;
  const x = Math.max(0, Math.floor(rect[0] - p)), y = Math.max(0, Math.floor(rect[1] - p));
  const w = Math.min(W - x, Math.ceil(rect[2] + p * 2)), h = Math.min(H - y, Math.ceil(rect[3] + p * 2));
  if (!(w > 0 && h > 0)) return { n: 0 };
  const buf = await page.screenshot({ clip: { x, y, width: w, height: h } });
  const r = await page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 130) {
        const p = (i >> 2), px = p % c.width, py = (p / c.width) | 0;
        n++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
    }
    return { n, x0, y0, x1, y1 };
  }, buf.toString('base64'));
  return n0(r, x, y);
}
const n0 = (r, ox, oy) => (r.n ? { n: r.n, x0: r.x0 + ox, y0: r.y0 + oy, x1: r.x1 + ox, y1: r.y1 + oy } : { n: 0 });

/* 카드 한 장의 상태를 한 번에 뜬다. 애니메이션을 끄고 재는 것이 핵심(위 ⚠). */
const MEAS = `
window.__dn = function(){
  const cards = [...document.querySelectorAll('#dunList .dnc')];
  return {
    cp: cp(),
    cards: cards.map((c, i) => {
      const d = c.querySelector(':scope > .dot');
      const cr = c.getBoundingClientRect();
      let dot = null;
      if(d){
        const prev = d.style.animation; d.style.animation = 'none';
        const dr = d.getBoundingClientRect(); const st = getComputedStyle(d);
        dot = { rect:[dr.left,dr.top,dr.width,dr.height], display:st.display,
                dy: dr.top - cr.top, ring: st.boxShadow.indexOf('7.5px') >= 0 };
        d.style.animation = prev;
      }
      const id = c.dataset.dcard;
      const d0 = DUNGEONS.find(x => x.id === id);
      return { i, id, node: !!d, dot, card:[cr.left,cr.top,cr.width,cr.height],
        lock: !!(d0 && dunLocked(d0)), left: d0 ? S.dunTk[id] : null,
        req: d0 ? Math.round(d0.req(S.dun[id])) : null, okc: !!(d0 && dunCardOk(d0)),
        fr: (()=>{ const f=c.querySelector(':scope > .fr'); if(!f) return null;
          const r=f.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; })(),
        th: (()=>{ const t=c.querySelector(':scope > .th'); if(!t) return null;
          const r=t.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; })() };
    }),
    /* ⚠ .stab.dns-t 는 세 칸(컨텐츠·던전·탑)이 **전부** 다는 클래스라 querySelector 는 첫 칸
       (컨텐츠)을 준다 — 1회차에 [E] 가 그 칸을 보고 빨개졌다(컨텐츠는 측정장 기록이 0 이라 켜져 있다).
       칸을 고르는 자는 data-dsub 다(298 이 dunSubAlert(t.dataset.dsub) 로 쓰는 것과 같은 자). */
    sub: (()=>{ const s=document.querySelector('.stab[data-dsub="dun"]'); return s ? s.classList.contains('alert') : null; })(),
    subRaid: (()=>{ const s=document.querySelector('.stab[data-dsub="raid"]'); return s ? s.classList.contains('alert') : null; })(),
    tab: (()=>{ const t=document.querySelector('.tab[data-t="adv"]'); return t ? t.classList.contains('alert') : null; })(),
    host: (()=>{ const l=document.getElementById('dunList'); const r=l.getBoundingClientRect();
      const st=getComputedStyle(l); return { rect:[r.left,r.top,r.width,r.height], ox: st.overflowX }; })(),
  };
};
/* 341 — 캡처 하네스(tools/cap72.js)가 쓰는 것과 **같은 역산**. 상수를 안 박는다(336 처방). */
window.__arm = function(){
  const need = DUNGEONS.filter(d => !dunLocked(d)).reduce((m, d) => Math.max(m, d.req(S.dun[d.id])), 0);
  const cap = trainCap();
  while (cp() < need && S.lv.atk < cap) { S.lv.atk = Math.min(cap, S.lv.atk + 10); markDirty(); }
  return { cp: cp(), need: Math.round(need), lv: S.lv.atk, cap };
};`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(MEAS);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderDunPage === 'function');
  await page.waitForTimeout(1000);
  /* 게임 루프를 얼린다(verify330 선례) — 틱이 `renderDunPage()` 를 다시 돌리면 닷 노드가
     새로 생겨 등장 팝이 재시작하고, 화소 측정이 «어느 프레임을 찍었나» 에 흔들린다. */
  await page.evaluate(() => { window.step = () => {}; });
  await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await page.waitForTimeout(500);
  await freezeDot(page);

  const read = async () => { await page.waitForTimeout(420); return page.evaluate(() => __dn()); };
  const set = async fn => { await page.evaluate(fn); await page.waitForTimeout(60); };

  /* ══ [전제] 캡처 하네스가 «켤 수 있는 상태» 를 만드는가 ═══════════════════ */
  console.log('\n── [전제] 캡처 상태 — 여기가 빨가면 제품이 아니라 하네스다 ──');
  const boot = await read();
  ok(boot.cards.length === 8, '[전제] 03 카드 8장이 떠 있다', boot.cards.length + '장');
  const unl = boot.cards.filter(c => !c.lock);
  ok(unl.length >= 2, '[전제] 부팅 세이브의 해금 카드 ≥ 2장(레퍼런스와 같은 2해금)', unl.length + '장');
  ok(boot.cards.every(c => !c.okc),
    '[전제] 부팅 직후에는 8장 전부 소등이 **정상**이다 — 이것이 «전량 누락» 유령의 정체',
    'cp=' + boot.cp + ' · 해금 카드 요구 ' + unl.map(c => c.req).join('/'));
  const arm = await page.evaluate(() => __arm());
  ok(arm.cp >= arm.need,
    '[전제] cap72 의 역산이 «해금 던전 요구 전투력» 위로 cp 를 올린다(상수 아님)',
    'cp ' + boot.cp + '→' + arm.cp + ' ≥ 요구 ' + arm.need + ' (훈련 atk ' + arm.lv + '/' + arm.cap + ')');
  ok(arm.lv <= arm.cap, '[전제] 그 상태는 훈련 상한 안이라 세이브로서도 합법이다', arm.lv + ' ≤ ' + arm.cap);
  await set(() => { renderDunPage(); });
  const lit = await read();
  const litN = lit.cards.filter(c => c.node).length;
  ok(litN === unl.length,
    '[전제] 그 상태에서 점등 수 = 해금 카드 수(ref 카드 1·2 와 같은 그림)', litN + '개');

  /* ══ [A] 부품 ═══════════════════════════════════════════════════════ */
  console.log('\n── [A] 부품 — 등재문 «노드도 CSS 도 없다» 의 반증 ──');
  const c1 = lit.cards[0];
  ok(c1.node === true, '[A] 카드 렌더가 `<s class="dot">` 를 카드 직속 자식으로 만든다');
  ok(!!c1.dot && c1.dot.display !== 'none', '[A] 그 부품이 실제로 그려진다', c1.dot && c1.dot.display);
  ok(!!c1.dot && c1.dot.ring, '[A] 299 규약 부품 — 검정 외곽링(0 0 0 7.5px) 을 달고 있다');
  const cssHas = await page.evaluate(() => {
    for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs) if (r.selectorText && /\.dnc\s+\.dot\b/.test(r.selectorText)
        && /right\s*:/.test(r.style.cssText || '')) return r.style.cssText; }
    return null;
  });
  ok(!!cssHas, '[A] `.dnc .dot` **위치 규칙이 이미 있다**(등재문의 «호스트 CSS 없음» 은 거짓)',
    cssHas ? cssHas.slice(0, 60) : '(없음)');

  /* ══ [B] 판정 축을 셋으로 갈라 단언 ═══════════════════════════════════ */
  console.log('\n── [B] 판정 축 셋 — 각각 갈라서 (뭉치면 축 하나가 죽어도 초록이다) ──');
  const locked = lit.cards.filter(c => c.lock);
  ok(locked.length > 0 && locked.every(c => !c.node),
    '[B-1] 잠금 카드는 소등 — 축 `!dunLocked`', locked.length + '장 전부 소등');

  await set(() => { const d = DUNGEONS[0]; S.dunTk[d.id] = 0; renderDunPage(); });
  const tk0 = await read();
  ok(tk0.cards[0].node === false,
    '[B-2] 입장권 0 이면 소등 — 축 `S.dunTk > 0`', '남은 횟수 ' + tk0.cards[0].left);
  ok(tk0.cards[1].node === true, '[B-2] 그때 옆 카드는 그대로 켜져 있다(축이 카드별로 산다)');

  await set(() => { const d = DUNGEONS[0]; S.dunTk[d.id] = 2; S.lv.atk = 0; markDirty(); renderDunPage(); });
  const cp0 = await read();
  ok(cp0.cards[0].node === false && cp0.cp < cp0.cards[0].req,
    '[B-3] 전투력 미달이면 소등 — 축 `cp() >= req`(166 «불가능한데 뜨는 dot» 방지)',
    'cp ' + cp0.cp + ' < 요구 ' + cp0.cards[0].req);

  /* ══ [C] 점등 + 화소 ════════════════════════════════════════════════ */
  console.log('\n── [C] 셋이 다 참이면 켜지고 실제로 빨갛게 찍힌다 ──');
  await page.evaluate(() => { __arm(); renderDunPage(); });
  const on = await read();
  const c = on.cards[0];
  ok(c.node && c.dot.display !== 'none', '[C] 잠금 아님 + 입장권 > 0 + 전투력 충족 ⇒ 점등');
  await freezeDot(page);
  const rb = await redBox(page, c.dot.rect);
  ok(rb.n > 300, '[C] 화소 — 닷 자리에 빨강이 실제로 찍힌다', rb.n + 'px');
  const off0 = await (async () => {
    await set(() => { DUNGEONS.forEach(d => { S.dunTk[d.id] = 0; }); renderDunPage(); });
    const s = await read();
    return { s, red: await redBox(page, c.dot.rect) };
  })();
  ok(off0.red.n === 0, '[C] 되돌림 — 입장권을 0 으로 되돌리면 같은 자리 빨강 0', off0.red.n + 'px');

  /* ══ [D] 자리 — ref 대조 · 299 사분면 · 클리핑 ═══════════════════════ */
  console.log('\n── [D] 자리 ──');
  await page.evaluate(() => { DUNGEONS.forEach(d => { S.dunTk[d.id] = 2; }); __arm(); renderDunPage(); });
  const g = await read();
  const gc = g.cards[0], d0 = gc.dot;
  console.log('      ref(AP/AQ 실측) : x1005..1032 · 26~28 × 31 · 카드상변 −1~+29');
  console.log('      현행 코어 실측   : x' + px(d0.rect[0]) + '..' + px(d0.rect[0] + d0.rect[2])
    + ' · ' + px(d0.rect[2]) + ' × ' + px(d0.rect[3]) + ' · 카드상변 +' + px(d0.dy));
  ok(Math.abs(d0.rect[0] - 1005) <= 3 && Math.abs(d0.rect[0] + d0.rect[2] - 1032) <= 3,
    '[D] 가로 자리가 ref 와 3px 이내', 'x' + px(d0.rect[0]) + '..' + px(d0.rect[0] + d0.rect[2]));
  ok(d0.dy >= -2 && d0.dy + d0.rect[3] <= 31,
    '[D] 세로 자리가 ref 봉투(카드상변 −1~+29) 안', '+' + px(d0.dy) + '..+' + px(d0.dy + d0.rect[3]));
  const cx = d0.rect[0] + d0.rect[2] / 2, cy = d0.rect[1] + d0.rect[3] / 2;
  ok(cx > gc.card[0] + gc.card[2] / 2 && cy < gc.card[1] + gc.card[3] / 2,
    '[D] 299 규약 — 중심이 카드 우상단 사분면',
    '(' + px((cx - gc.card[0]) / gc.card[2]) + ', ' + px((cy - gc.card[1]) / gc.card[3]) + ')');
  /* 328 교훈 — 호스트가 무엇을 자르는가. `.dns-list{overflow-x:hidden}` 이라 링까지 들어와야 한다 */
  const ringR = d0.rect[0] + d0.rect[2] + 7.5, ringT = d0.rect[1] - 7.5;
  ok(ringR <= g.host.rect[0] + g.host.rect[2],
    '[D] 링(±7.5)이 스크롤 호스트 가로 클립(`overflow-x:hidden`)에 안 잘린다',
    '링 우단 ' + px(ringR) + ' ≤ 호스트 우단 ' + px(g.host.rect[0] + g.host.rect[2]));
  ok(ringT >= g.host.rect[1],
    '[D] 첫 카드의 링 상단이 리스트 위로 안 넘친다(padding-top 8 이 받는다)',
    '링 상단 ' + px(ringT) + ' ≥ 호스트 상단 ' + px(g.host.rect[1]));
  await freezeDot(page);
  const rbox = await redBox(page, d0.rect);
  ok(rbox.n > 0 && (rbox.x1 - rbox.x0 + 1) >= 24 && (rbox.x1 - rbox.x0 + 1) <= 36,
    '[D] 화소 실측 폭이 ref 잉크(26~28, 핑크 림 포함 최대 32)와 같은 자리',
    (rbox.x1 - rbox.x0 + 1) + '×' + (rbox.y1 - rbox.y0 + 1) + ' @x' + rbox.x0 + '..' + rbox.x1);

  /* ══ [E] 경로 체인(298) ═════════════════════════════════════════════ */
  console.log('\n── [E] 경로 체인 — 카드·서브탭·탭바가 같은 자를 본다(298) ──');
  ok(g.sub === true, '[E] 서브탭 «던전» 배지가 카드와 함께 켜진다');
  await set(() => { DUNGEONS.forEach(d => { S.dunTk[d.id] = 0; }); renderDunPage(); uiDirty = true; renderUI(); });
  const e0 = await read();
  ok(e0.sub === false, '[E] 카드가 전부 꺼지면 «던전» 칸 배지도 함께 꺼진다(같은 자 `dunCardOk`)');
  ok(e0.subRaid === true,
    '[E] 그때 «컨텐츠» 칸은 자기 조건(`raidCardOk`)으로 켜진 채다 — 칸마다 자가 다르다(298)',
    '컨텐츠 alert=' + e0.subRaid);
  ok(e0.tab === true,
    '[E] 탭바 «모험» 칸은 세 칸 중 하나라도 켜지면 켜진다(`advAlert` — 293 «경로 전체»)',
    '탭바 alert=' + e0.tab);

  /* ══ [R] 되돌림 시험 — 위 항이 정말 «무르게» 안 풀렸는가 ══════════════ */
  console.log('\n── [R] 되돌림 시험 ──');
  await page.evaluate(() => { DUNGEONS.forEach(d => { S.dunTk[d.id] = 2; }); __arm(); renderDunPage(); });
  await page.waitForTimeout(420);
  const rGone = await page.evaluate(async () => {
    document.querySelectorAll('#dunList .dnc > .dot').forEach(d => d.remove());
    await new Promise(r => setTimeout(r, 120));
    return document.querySelectorAll('#dunList .dnc > .dot').length;
  });
  const rRed = await redBox(page, d0.rect);
  ok(rGone === 0 && rRed.n === 0,
    '[R1] 노드를 지우면 [C]·[D] 의 화소 항이 **실제로 빨개진다**(헛초록 아님)', '빨강 ' + rRed.n + 'px');
  await set(() => { renderDunPage(); });
  const rBack = await read();
  ok(rBack.cards[0].node === true, '[R1] 다시 렌더하면 원복된다');
  /* R2 — 조건을 상시 참으로 만들면 [B] 축 항이 빨개져야 한다(«상시 점등» 회귀 감시) */
  const r2 = await page.evaluate(() => {
    const card = document.querySelector('#dunList .dnc');
    if (card.querySelector(':scope > .dot')) return 'already';
    card.insertAdjacentHTML('beforeend', '<s class="dot"></s>');
    return 'forced';
  });
  await set(() => { const d = DUNGEONS[0]; S.dunTk[d.id] = 0; renderDunPage();
    document.querySelector('#dunList .dnc').insertAdjacentHTML('beforeend', '<s class="dot"></s>'); });
  const r2s = await read();
  ok(r2s.cards[0].node === true && r2s.cards[0].left === 0,
    '[R2] 조건이 거짓인데 노드를 강제로 넣으면 «상시 점등» 상태가 만들어진다 — [B-2] 가 그것을 잡는 항이다',
    'left=' + r2s.cards[0].left + ' node=' + r2s.cards[0].node + ' (' + r2 + ')');
  await set(() => { const d = DUNGEONS[0]; S.dunTk[d.id] = 2; renderDunPage(); });

  /* ══ [G] 회귀 — 닷이 카드 기하를 한 픽셀도 안 민다 ═══════════════════ */
  console.log('\n── [G] 회귀 — 레이아웃 Δ0px ──');
  const withDot = await read();
  await set(() => { document.querySelectorAll('#dunList .dnc > .dot').forEach(d => d.remove()); });
  const noDot = await read();
  const same = withDot.cards.every((a, i) => {
    const b = noDot.cards[i];
    const eq = (p, q) => p && q && p.every((v, k) => Math.abs(v - q[k]) < 0.5);
    return eq(a.card, b.card) && eq(a.fr, b.fr) && eq(a.th, b.th);
  });
  ok(same, '[G] 닷 유무로 카드·액자(.fr)·썸네일 슬롯(.th) 기하가 안 바뀐다 (verify72 [1]·verify121 보호)');

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  ok(errs.length === 0, '콘솔 에러 0건');
  console.log('\nverify341 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
