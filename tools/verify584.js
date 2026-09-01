#!/usr/bin/env node
/* 게이트 — 작업 584 «23 훈련 팝업 부품 크기·라벨» (2026-08-31, 저장소 주인 지시)
 *
 *   node tools/verify584.js
 *
 * 주인 원문 넷을 그대로 축으로 삼는다:
 *   ① «룬, 단련 버튼에 화폐 크기가 너무 작음. **훈련 팝업에서 처럼** 화폐 크기 크게하기»
 *   ② «룬부분 아이콘 크기 존나 작은데 좀 **다른 팝업들의 슬롯들처럼** 크기 정상적으로 크게좀»
 *   ③ «훈련부분에 업글 버튼 크기 존내 작으니까 더 크게하고»
 *   ④ «**투자 버튼 말고 단련으로 이름 바꾸고** 해당 화폐 거기에 표시 되게 해줘 **어떤 화폐 쓰는지 버튼 내에**»
 *
 * 절은 일곱 + 되돌림이다:
 *   [1] 전제   — 세 탭이 실제로 열리고 잴 노드가 있다(전제가 죽으면 아래가 «조용한 초록» 이 된다)
 *   [2] ①      — 화폐 기준선. **기준을 새로 안 만들었다**: 훈련 카드 코인 실측 = `TR_CUR_PX`,
 *                룬 [강화]·단련 [단련]이 그 값과 ±3%. 세 자산 viewBox 가 같은 64 라 상자 = 잉크다.
 *   [3] ③      — `.tr-up` 이 커졌고(수리 전 108×107) 이웃과 겹침 0 · 진행바 세로 중심 유지
 *   [4] ②      — 룬 액자 안 잉크비가 411 `SLOT_ART` 비와 ±3% · 값이 **파생**이지 손으로 적은 수가 아니다
 *   [5] ④      — 라벨이 `tstone` 아이콘 **1장** + «n»(613 — «pt» 는 죽은 말) ·
 *                제품 문자열에 «투자» 0건(토스트 포함)
 *                ⚑ 670(2026-09-02) — «단련» 낱말은 버튼에서 빠졌다. [5-a] 를 «낱말 0건» 으로
 *                뒤집고 [5-a2](행 제목이 그 말을 한다)를 신설했다 — 상세는 `verify670`.
 *   [6] 297    — 통짜 렌더와 `liveTemper()` 가 **같은 문자열**(라벨에 태그가 들어와 깨지기 쉬운 자리)
 *   [7] 210·519·166 — 단련 탭 다섯 줄 겹침 0 · 레드닷 판정 불변 · 351(9:13.3) 잘림 0
 *   §R  되돌림 — 라벨·룬 그림자리·↑ 버튼을 각각 수리 전으로 되돌리면 **그 절만** 빨개진다
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;
const p2 = n => Math.round(n * 100) / 100;
const near = (a, b, pctTol) => a != null && b != null && Math.abs(a - b) <= Math.abs(b) * pctTol / 100;

/* 수리 전 값 — `probe584` 1회차 실측(이 자가 «이미 참인 것» 을 굳히지 않았다는 기준선) */
const PRE = { up: { w: 108, h: 107, x: 838, y: 139 }, rune: 34, tb: 300, riRatio: 0.2419 };

const INK = `
  window.__ink = function(ch, fs, fam){
    const P = 100, cv = document.createElement('canvas');
    cv.width = P * 3; cv.height = P * 3;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = P + 'px ' + fam;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(ch, cv.width / 2, Math.round(cv.height * 0.72));
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let y = 0; y < cv.height; y++)
      for(let x = 0; x < cv.width; x++)
        if(d[(y * cv.width + x) * 4 + 3] > 8){
          if(x < x0) x0 = x; if(x > x1) x1 = x;
          if(y < y0) y0 = y; if(y > y1) y1 = y;
        }
    if(x1 < 0) return null;
    const k = fs / P;
    return { w: +((x1 - x0 + 1) * k).toFixed(2), h: +((y1 - y0 + 1) * k).toFixed(2) };
  };
  /* 액자 안 «그림» 의 잉크비 — 411 규약대로 안쪽 .sa-e 가 있으면 그것을 잰다(없으면 액자 자신) */
  window.__artRatio = function(sel){
    const n = document.querySelector(sel); if(!n) return null;
    const r = n.getBoundingClientRect();
    const a = n.querySelector('i.sa-e'), s = a || n, cs = getComputedStyle(s);
    const ink = window.__ink((s.textContent || '').trim(), parseFloat(cs.fontSize), cs.fontFamily);
    if(!ink) return null;
    return { art: !!a, disp: a ? getComputedStyle(a).display : null, box: +r.height.toFixed(1),
             ink: ink.h, ratio: +(ink.h / r.height).toFixed(4) };
  };
  window.__rc = function(sel, base){
    const n = document.querySelector(sel); if(!n) return null;
    const r = n.getBoundingClientRect();
    const b = base ? document.querySelector(base).getBoundingClientRect() : { x:0, y:0 };
    return { x: +(r.x - b.x).toFixed(1), y: +(r.y - b.y).toFixed(1),
             w: +r.width.toFixed(1), h: +r.height.toFixed(1),
             x2: +(r.x - b.x + r.width).toFixed(1), y2: +(r.y - b.y + r.height).toFixed(1) };
  };`;

const openAt = async (browser, h) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(450);
  await page.evaluate(INK);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400; S.trainStage = 3;
    markDirty(); openTrain(); setTrSub('train'); renderTrain();
  });
  return { ctx, page };
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await openAt(browser, 2280);
  const tab = k => page.evaluate(v => { setTrSub(v); renderTrain(); }, k);

  /* ══ [1] 전제 ═══════════════════════════════════════════════════════════ */
  console.log('\n=== [1] 전제 — 세 탭이 열리고 잴 노드가 있다 ===');
  const has = await page.evaluate(() => {
    const r = {};
    setTrSub('train'); renderTrain();
    r.train = !!document.querySelector('#trCards .tr-card .cb>s .cic') && !!document.querySelector('#trw .tr-up');
    setTrSub('rune'); renderTrain();
    r.rune = !!document.querySelector('#trw .tr-rn>.ri') && !!document.querySelector('#trw .tr-rn>.rbt .cic');
    setTrSub('temper'); renderTrain();
    r.temper = !!document.querySelector('#trTemper .tr-tp .tb') && !!document.querySelector('#trTemper .tp-hd');
    setTrSub('train'); renderTrain();
    return r;
  });
  ok(has.train, '[1-a] 훈련 탭 — 카드 코인 · ↑ 버튼이 있다');
  ok(has.rune, '[1-b] 룬 탭 — 액자 · [강화] 버튼 화폐가 있다');
  ok(has.temper, '[1-c] 단련 탭 — 축 행 버튼 · 헤더가 있다');

  /* ══ [2] ① 화폐 기준선 ═══════════════════════════════════════════════════ */
  console.log('\n=== [2] ① «훈련 팝업에서 처럼» — 화폐 기준선 ===');
  const cur = await page.evaluate(() => {
    const one = s => { const n = document.querySelector(s); if (!n) return null;
      const r = n.getBoundingClientRect();
      return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), cur: n.dataset.curIc || null,
               out: null, host: null }; };
    const fit = (icSel, hostSel) => { const i = document.querySelector(icSel), h = document.querySelector(hostSel);
      if (!i || !h) return null; const a = i.getBoundingClientRect(), b = h.getBoundingClientRect();
      return { top: +(a.top - b.top).toFixed(1), bot: +(b.bottom - a.bottom).toFixed(1) }; };
    const res = {};
    setTrSub('train'); renderTrain();
    res.base = one('#trCards .tr-card .cb>s .cic');
    setTrSub('rune'); renderTrain();
    res.rune = one('#trw .tr-rn>.rbt .cic'); res.runeFit = fit('#trw .tr-rn>.rbt .cic', '#trw .tr-rn>.rbt');
    setTrSub('temper'); renderTrain();
    res.temp = one('#trTemper .tr-tp .tb .cic'); res.tempFit = fit('#trTemper .tr-tp .tb .cic', '#trTemper .tr-tp .tb');
    res.tempN = document.querySelectorAll('#trTemper .tr-tp.k0 .tb .cic').length;
    setTrSub('train'); renderTrain();
    return res;
  });
  ok(!!cur.base, '[2-a] 훈련 카드 코인(기준선)을 실제로 쟀다', cur.base && cur.base.w + 'px');
  ok(/const TR_CUR_PX = 53;/.test(CODE),
    '[2-b] 기준선이 **상수 한 곳**에 적혀 있다(`TR_CUR_PX`) — 자리마다 손으로 적지 않았다');
  ok(cur.base && near(cur.base.w, 53, 3),
    '[2-c] 그 상수가 실측과 같다(훈련 카드 코인 ↔ TR_CUR_PX)', cur.base && cur.base.w + ' ↔ 53');
  ok(cur.rune && near(cur.rune.w, cur.base.w, 3),
    '[2-d] ★ 룬 [강화] 화폐가 훈련 기준선과 ±3%',
    cur.rune && `${cur.rune.w} ↔ ${cur.base.w} (${p1(cur.rune.w / cur.base.w * 100)}%, 수리 전 ${PRE.rune})`);
  /* ⚑ 686 이관 — 단련 버튼만 상자가 74 → 173 이 됐다(주인 지시 «세로로 키워라»). 화폐 아이콘을
     기준선 53 에 묶어 두면 면 대비 잉크가 6% 로 희석돼 비평 2인이 ② 를 4·5 점으로 떨어뜨렸다.
     ⇒ **단련만** 전용 상수 `TP_CUR_PX`(96)로 갈랐다. 584 의 «기준선은 상수 한 곳» 규약은 안 죽는다 —
     [2-b]·[2-c]·[2-d](훈련·룬)가 그대로 지키고, 이 항은 «단련은 제 상수를 **상수로** 읽는가» 로
     방향을 옮긴다(손으로 적은 수가 아니어야 한다는 것이 584 의 뜻이다). */
  ok(/const TP_CUR_PX = 96;/.test(CODE) && cur.temp && near(cur.temp.w, 96, 3),
    '[2-e] ★ 686 — 단련 화폐는 전용 상수 `TP_CUR_PX`(96)를 읽는다(룬은 기준선 53 그대로 = [2-d])',
    cur.temp && `${cur.temp.w} ↔ TP_CUR_PX 96 (기준선 ${cur.base.w} 대비 ${p1(cur.temp.w / cur.base.w * 100)}%)`);
  ok(cur.tempN === 1, '[2-f] 단련 버튼 안 화폐 아이콘은 **정확히 1장**이다', cur.tempN + '장');
  /* ⚑ 644(2026-09-01) — 이 항은 **헛초록이었다.** 옛 술어는 세 파일의 `viewBox` **문자열**이
     `0 0 64 64` 로 같은지만 보고 «상자가 같다 = 잉크가 같다» 를 주장했는데, 그 결론은 세 아트가
     **캔버스를 같은 비율로 채울 때만** 성립한다. 실제로는 `cur-rstone.svg` 가 가로를 **.625** 밖에
     안 채워(세로만 꽉 찼다) 같은 상자에 넣으면 폭이 37% 작았다 — 옛 술어는 그것을 **한 번도 못 봤다**.
     (그런데도 [2-d] 가 초록이던 것은 CSS 가 자리마다 상자를 따로 줘서 폭을 맞춰 놨기 때문이다.)
     644 가 15장의 viewBox 를 잉크 bbox 로 잘라 **긴 축 채움비를 1.0000 으로** 통일했으므로,
     이 항을 문자열에서 **실제로 그려진 채움비**로 옮긴다 — 술어를 넓힌 것이 아니라 처음으로 재는 것이다. */
  const FILLSRC = ['gold', 'rstone', 'tstone'].map(k => ({
    k, svg: fs.readFileSync(path.join(ROOT, 'assets/ui/cur-' + k + '.svg'), 'utf8'),
  }));
  const fills = [];
  for (const a of FILLSRC) {
    const r = await page.evaluate(async ({ svg, S }) => {
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      const im = await new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('x'));
        i.width = S; i.height = S; i.src = url;
      });
      const c = document.createElement('canvas'); c.width = S; c.height = S;
      const g = c.getContext('2d'); g.clearRect(0, 0, S, S); g.drawImage(im, 0, 0, S, S);
      const d = g.getImageData(0, 0, S, S).data;
      let ax = 1e9, ay = 1e9, bx = -1, by = -1;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++)
        if (d[((y * S) + x) * 4 + 3] > 8) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
      return bx < 0 ? null : { w: (bx - ax + 1) / S, h: (by - ay + 1) / S };
    }, { svg: a.svg, S: 256 });
    fills.push({ k: a.k, long: r ? Math.max(r.w, r.h) : 0, w: r ? r.w : 0 });
  }
  ok(fills.every(f => Math.abs(f.long - 1) <= 0.01),
    '[2-g] 세 화폐 자산이 캔버스의 **긴 축을 똑같이 꽉 채운다**(644 — 상자가 같으면 덩치가 같다)',
    fills.map(f => `${f.k} ${f.long.toFixed(4)}`).join(' / '));
  ok(Math.abs(fills.find(f => f.k === 'rstone').w - 0.625) <= 0.02,
    '[2-g2] 그래도 rstone 은 **가로**가 .625 다(아트 종횡 몫) — 폭을 맞추는 것은 자리마다의 상자다',
    fills.map(f => `${f.k} w ${f.w.toFixed(4)}`).join(' / '));
  ok(cur.runeFit && cur.runeFit.top >= 5 && cur.runeFit.bot >= 5 &&
     Math.abs(cur.runeFit.top - cur.runeFit.bot) <= 3,
    '[2-h] ★ 커진 화폐가 룬 [강화] 버튼 안에서 **세로 중앙**이다(안 새고, 위로도 안 뜬다)',
    cur.runeFit && `위 ${cur.runeFit.top} · 아래 ${cur.runeFit.bot}`);
  ok(cur.tempFit && cur.tempFit.top >= 5 && cur.tempFit.bot >= 5 &&
     Math.abs(cur.tempFit.top - cur.tempFit.bot) <= 3,
    '[2-i] ★ 커진 화폐가 단련 [단련] 버튼 안에서 **세로 중앙**이다',
    cur.tempFit && `위 ${cur.tempFit.top} · 아래 ${cur.tempFit.bot}`);
  ok(!/curIc\('rstone', *34\)/.test(CODE) && !/curIc\('tstone', *TR_CUR_PX\)[\s\S]{0,0}/.test('') ,
    '[2-j] 옛 손글씨 값(`curIc(\'rstone\', 34)`)이 소스에 0건이다');

  /* ══ [3] ③ ↑ 버튼 ═══════════════════════════════════════════════════════ */
  console.log('\n=== [3] ③ «업글 버튼 크기 존내 작다» — `.tr-up` ===');
  await tab('train');
  const up = await page.evaluate(() => ({
    up: window.__rc('#trw .tr-up', '#trw .tr-box'),
    prog: window.__rc('#trw .tr-prog', '#trw .tr-box'),
    qty: window.__rc('#trw .tr-qty', '#trw .tr-box'),
    rib: window.__rc('#trw .tr-rib', '#trw .tr-box'),
    cards: window.__rc('#trw .tr-cards', '#trw .tr-box'),
    box: window.__rc('#trw .tr-box'),
    rbt: (() => { setTrSub('rune'); renderTrain(); const r = window.__rc('#trw .tr-rn>.rbt');
      setTrSub('train'); renderTrain(); return r; })(),
    svg: window.__rc('#trw .tr-up>svg', '#trw .tr-up'),
    rad: parseFloat(getComputedStyle(document.querySelector('#trw .tr-up')).borderTopLeftRadius),
  }));
  ok(up.up.w > PRE.up.w && up.up.h > PRE.up.h,
    '[3-a] ★ 수리 전보다 크다', `${up.up.w}×${up.up.h} (수리 전 ${PRE.up.w}×${PRE.up.h})`);
  ok(up.up.w === up.up.h, '[3-b] 정사각을 지킨다(356 «확대는 등방»)', `${up.up.w}×${up.up.h}`);
  const upC = up.up.y + up.up.h / 2, pgC = up.prog.y + up.prog.h / 2;
  ok(Math.abs(upC - pgC) <= 0.6,
    '[3-c] ★ 세로 중심이 진행바 중심과 같다(커져도 «바에 얹힌 버튼» 이 유지된다)',
    `버튼 ${p1(upC)} ↔ 바 ${p1(pgC)}`);
  ok(up.up.x === PRE.up.x, '[3-d] 좌변은 안 옮겼다(진행바와의 관계 보존)', 'x=' + up.up.x);
  ok(up.up.y2 <= up.qty.y - 4,
    '[3-e] ★ 아래 배수 바(`.tr-qty`)와 겹침 0', `하변 ${up.up.y2} ↔ 배수 바 ${up.qty.y} (여유 ${p1(up.qty.y - up.up.y2)})`);
  ok(up.up.x >= up.rib.x2,
    '[3-f] 리본(`.tr-rib`)과 가로로 안 겹친다 — 그래서 위로 자란 13.5px 이 결함이 아니다',
    `버튼 좌변 ${up.up.x} ↔ 리본 우변 ${up.rib.x2}`);
  ok(up.up.x2 <= up.box.w - 20, '[3-g] 박스 우변을 안 넘는다', `우변 ${up.up.x2} ↔ 박스 ${up.box.w}`);
  ok(up.up.y2 <= up.cards.y, '[3-h] 카드 리스트와 겹침 0', `하변 ${up.up.y2} ↔ 카드 ${up.cards.y}`);
  ok(near(up.rad, 40, 2), '[3-i] radius 가 같은 비로 따라왔다(34 → 40)', up.rad + 'px');
  const sc = up.up.w / PRE.up.w;
  ok(near(up.svg.w, 73 * sc, 2) && near(up.svg.h, 69 * sc, 2) &&
     near(up.svg.x, 16.5 * sc, 6) && near(up.svg.y, 11.5 * sc, 6),
    '[3-j] ★ 화살표가 **비례로만** 따라왔다(광학 보정 «중심보다 위» 보존)',
    `svg ${up.svg.w}×${up.svg.h} @ (${up.svg.x},${up.svg.y}) · 기대 ${p1(73 * sc)}×${p1(69 * sc)} @ (${p1(16.5 * sc)},${p1(11.5 * sc)})`);
  ok(up.rbt && up.up.w * up.up.h / (up.rbt.w * up.rbt.h) > 0.30,
    '[3-k] `.rbt`(420×112)와의 면적 격차가 좁혀졌다(수리 전 0.246)',
    up.rbt && `${Math.round(up.up.w * up.up.h)} / ${Math.round(up.rbt.w * up.rbt.h)} = ${p2(up.up.w * up.up.h / (up.rbt.w * up.rbt.h))}`);

  /* ══ [4] ② 룬 액자 안 그림 ═══════════════════════════════════════════════ */
  console.log('\n=== [4] ② «다른 팝업들의 슬롯들처럼» — 411 그림 자리 ===');
  await tab('rune');
  const art = await page.evaluate(() => ({
    ri: window.__artRatio('#trw .tr-rn>.ri'),
    ref: { slot: SLOT_ART, box: SLOT_BOX, rune: RUNE_ART },
    riBox: window.__rc('#trw .tr-rn>.ri'),
  }));
  const refRatio = art.ref.slot.h / art.ref.box;
  ok(art.ri && art.ri.art, '[4-a] 액자 안이 «그림 자리» 노드(`.sa-e`)다 — 한 상수 fs118 이 아니다');
  ok(art.ri && art.ri.disp === 'block',
    '[4-b] ★ 그 노드의 computed display 가 **block** 이다 — `#trw i{display:inline-block}`(1,0,1)을 이겼다',
    art.ri && 'display=' + art.ri.disp);
  ok(art.ri && near(art.ri.ratio, refRatio, 3),
    '[4-c] ★ 잉크비가 411 슬롯 비와 ±3%',
    art.ri && `${art.ri.ratio} ↔ ${p2(refRatio)} (${p1(art.ri.ratio / refRatio * 100)}%, 수리 전 ${PRE.riRatio})`);
  ok(art.ri && art.ri.ratio > PRE.riRatio * 2,
    '[4-d] 수리 전(0.2419)보다 실제로 커졌다', art.ri && String(art.ri.ratio));
  ok(/RUNE_ART *= *\{ *w: *\+\(SLOT_ART\.w \/ SLOT_BOX \* RI_BOX\)/.test(CODE.replace(/\s+/g, ' ')) ||
     /SLOT_ART\.h \/ SLOT_BOX \* RI_BOX/.test(CODE),
    '[4-e] ★ 값이 **파생**이다 — 411 의 `SLOT_ART` 에서 나온다(손으로 적은 139 가 아니다)');
  ok(art.ref.rune && near(art.ref.rune.h, art.ref.slot.h / art.ref.box * 200, 0.5),
    '[4-f] 파생 값 검산', art.ref.rune && art.ref.rune.w + '×' + art.ref.rune.h);
  ok(art.ri && Math.abs(art.riBox.w - 200) < 0.5,
    '[4-g] 액자 상자(200)는 한 픽셀도 안 건드렸다(레이아웃 Δ0)', art.riBox && art.riBox.w + 'px');

  /* ══ [5] ④ 라벨 ═════════════════════════════════════════════════════════ */
  console.log('\n=== [5] ④ [투자] → [단련] + 버튼 안 화폐 ===');
  await tab('temper');
  const lab = await page.evaluate(() => {
    const b = document.querySelector('#trTemper .tr-tp.k0 .tb i');
    const t = document.querySelector('#trTemper .tr-tp.k0 .tn i');
    return { txt: b.textContent.replace(/\s+/g, ' ').trim(), html: b.innerHTML,
             imgs: b.querySelectorAll('img.cic').length,
             cur: (b.querySelector('img.cic') || {}).dataset && b.querySelector('img.cic').dataset.curIc,
             title: t ? t.textContent.replace(/\s+/g, ' ').trim() : null,
             fn: temperRowTxt(TEMPERS[0]).btn };
  });
  /* ⚑ 670(2026-09-02 주인 지시 «단련 (단련아이콘) 3 이런거 말고 (단련아이콘) 3 이런식으로»)이
     이 항의 **방향을 뒤집었다**. 항을 지우지 않고 갈아 끼우는 이유(333 처방): 584 ④ 의 뜻은
     «버튼이 [투자] 라는 죽은 말을 하지 않는다» 였고, 그 뜻은 지금도 살아 있다 —
     달라진 것은 버튼이 말하는 방법이다(낱말 → 아이콘). 그래서 술어를 둘로 나눈다:
       [5-a]  버튼 라벨에는 낱말이 없다(«단련» 포함 0건 · 수와 자리쉼표뿐)
       [5-a2] 그 말은 같은 행 제목이 대신한다 — «무슨 버튼인지» 를 잃지 않았다는 반대편 항
     («단련» 을 그냥 안 보게 한 수리였다면 [5-a2] 가 빨개진다.) 상세 게이트는 `verify670`. */
  ok(!/단련/.test(lab.txt) && /^[\d,]+$/.test(lab.txt),
    '[5-a] ★ 670 — 라벨은 «(아이콘) n» 뿐이다(낱말 0건)', '«' + lab.txt + '»');
  ok(/단련/.test(lab.title || ''),
    '[5-a2] ★ 670 — 버튼에서 뺀 «단련» 은 같은 행 제목이 말한다', '«' + lab.title + '»');
  ok(!/투자/.test(lab.txt) && !/투자/.test(lab.html), '[5-b] 라벨에 «투자» 가 없다');
  ok(lab.imgs === 1 && lab.cur === 'tstone',
    '[5-c] ★ «어떤 화폐 쓰는지» 를 아이콘으로 말한다(tstone 1장)', lab.cur + ' ×' + lab.imgs);
  ok(/\d[\d,]*$/.test(lab.txt) && !/pt/.test(lab.txt),
    '[5-d] 613 — 라벨이 숫자로 끝나고 «pt» 가 없다(그 수가 곧 단련석 지불액)', '«' + lab.txt + '»');
  /* 제품 문자열(주석 아님)에서 «투자» 가 0건 — 버튼·토스트 둘 다 */
  const codeHits = CODE.split('\n').filter(l => /(['"])투자 /.test(l) || /\(투자 /.test(l));
  ok(codeHits.length === 0, '[5-e] ★ 제품 문자열에 «투자» 표기 0건(버튼 + 홀드 토스트)',
    codeHits.length + '건' + (codeHits.length ? ' — ' + codeHits[0].trim().slice(0, 70) : ''));
  ok(/단련 ' \+ fmt\(n\) \+ '회/.test(CODE) || /\(단련 ' \+ fmt\(n\)/.test(CODE),
    '[5-f] 홀드 토스트도 버튼과 같은 말을 쓴다(«단련 n회»)');

  /* ══ [6] 297 — 표기층 두 벌 금지 ═════════════════════════════════════════ */
  console.log('\n=== [6] 297 — 통짜 렌더 ↔ `liveTemper()` 가 같은 문자열 ===');
  const same = await page.evaluate(() => {
    const w = $('trTemper');
    w.dataset.sig = ''; renderTrain();
    const full = [...w.querySelectorAll('.tr-tp .tb i')].map(n => n.innerHTML);
    liveTemper();
    const live = [...w.querySelectorAll('.tr-tp .tb i')].map(n => n.innerHTML);
    /* 값이 바뀐 뒤에도 같은가 — 홀드 중 갱신 경로 (613 — 전환 없이 잔액·레벨을 직접 바꾼다) */
    S.tstone += 500; S.temper.alloc.atk = (S.temper.alloc.atk || 0) + 100;
    liveTemper();
    const live2 = [...w.querySelectorAll('.tr-tp .tb i')].map(n => n.innerHTML);
    w.dataset.sig = ''; renderTrain();
    const full2 = [...w.querySelectorAll('.tr-tp .tb i')].map(n => n.innerHTML);
    return { full, live, live2, full2, esc: live.some(h => /&lt;img/.test(h)) };
  });
  ok(JSON.stringify(same.full) === JSON.stringify(same.live),
    '[6-a] ★ 첫 갱신에서 두 경로가 같다', same.live[0] ? same.live[0].slice(0, 46) + '…' : '');
  ok(!same.esc, '[6-b] ★ 라벨 태그가 **글자로** 안 찍힌다(`put(..., true)` — textContent 경로였으면 여기서 빨개진다)');
  ok(JSON.stringify(same.full2) === JSON.stringify(same.live2),
    '[6-c] 값이 바뀐 뒤에도 두 경로가 같다');

  /* ══ [7] 210 · 519 · 351 회귀 ═══════════════════════════════════════════ */
  console.log('\n=== [7] 210 세로 예산 · 519 레드닷 · 351 짧은 프레임 ===');
  const reg = await page.evaluate(() => {
    setTrSub('temper'); renderTrain();
    const rc = s => window.__rc(s, '#trTemper');
    const rows = ['.tp-hd', '.tr-tp.k0', '.tr-tp.k1', '.tr-tp.k2'].map(s => rc(s));   /* 614 — 회수 줄 없음 */
    const tb = window.__rc('#trTemper .tr-tp.k0 .tb', '#trTemper .tr-tp.k0');
    const td = window.__rc('#trTemper .tr-tp.k0 .td', '#trTemper .tr-tp.k0');
    /* 686 — 비용 줄(.tc)은 주인 지시로 사라졌다. [7-c] 의 과녁은 같은 행에서 버튼 위쪽에
       남은 것(아이콘 상자 `.ti`)으로 옮긴다(333 처방 — 자리를 비우지 않는다). */
    const tc = window.__rc('#trTemper .tr-tp.k0 .tc', '#trTemper .tr-tp.k0');
    const ti = window.__rc('#trTemper .tr-tp.k0 .ti', '#trTemper .tr-tp.k0');
    /* 519 — 올릴 축이 없으면 소등, 있으면 점등 */
    const dot = () => { const d = document.querySelector('#trSubs [data-trsub="temper"]');
      return { alert: d.classList.contains('alert'),
               disp: getComputedStyle(d.querySelector('.bdg')).display }; };
    const before = { tstone: S.tstone };
    S.tstone = 0; renderTrain();
    const off = { judge: temperAlert(), ui: dot() };
    S.tstone = 1e6; renderTrain();
    const on = { judge: temperAlert(), ui: dot() };
    S.tstone = before.tstone; renderTrain();
    return { rows, tb, td, tc, ti, off, on };
  });
  let overlap = 0;
  for (let i = 1; i < reg.rows.length; i++) if (reg.rows[i].y < reg.rows[i - 1].y2) overlap++;
  ok(overlap === 0, '[7-a] 210 — 단련 탭 네 줄이 여전히 겹침 0(614 — 회수 줄 없음)', reg.rows.map(r => r.y + '..' + r.y2).join(' · '));
  ok(reg.tb.x >= reg.td.x2, '[7-b] ★ 넓힌 [단련] 버튼이 같은 행 효과 줄(`.td`)과 겹치지 않는다',
    `버튼 좌변 ${reg.tb.x} ↔ .td 우변 ${reg.td.x2} (여유 ${p1(reg.tb.x - reg.td.x2)})`);
  ok(reg.tc === null && reg.tb.y === reg.ti.y && reg.tb.y2 + 5 === reg.ti.y2,
    '[7-c] 686 — 비용 줄(`.tc`)은 사라졌고, 버튼이 그 세로를 먹어 아이콘 상자와 같은 밴드에 선다',
    `.tc ${reg.tc === null ? '없음' : '있음'} · 버튼 ${reg.tb.y}..${reg.tb.y2}(+립 5) ↔ 아이콘 ${reg.ti.y}..${reg.ti.y2}`);
  ok(reg.off.judge === false && reg.off.ui.alert === false,
    '[7-d] 519 — 올릴 축이 없으면 판정도 닷도 꺼진다(오점등 회귀)',
    'judge=' + reg.off.judge + ' · alert=' + reg.off.ui.alert);
  ok(reg.on.judge === true && reg.on.ui.alert === true,
    '[7-e] 519 — 올릴 수 있으면 켜진다(166 특이성 짝이 살아 있다)',
    'judge=' + reg.on.judge + ' · display=' + reg.on.ui.disp);

  /* 9:13.3 — 세 탭 전부 시트 안 */
  const { ctx: c2, page: p2p } = await openAt(browser, 1600);
  await p2p.evaluate(INK);
  const short = await p2p.evaluate(() => {
    const sh = document.querySelector('#trw .tr-sheet').getBoundingClientRect();
    const out = [];
    const chk = (k, sels) => { setTrSub(k); renderTrain();
      sels.forEach(s => { const n = document.querySelector(s); if (!n) { out.push({ s, miss: 1 }); return; }
        const r = n.getBoundingClientRect();
        const o = Math.max(0, (r.y + r.height) - (sh.y + sh.height), sh.y - r.y);
        if (o > 0) out.push({ s, out: +o.toFixed(1) }); }); };
    chk('train', ['#trw .tr-up', '#trw .tr-up>svg', '#trw .tr-cards']);
    chk('rune', ['#trw .tr-rn>.ri', '#trw .tr-rn>.rbt', '#trw .tr-rn>.rbt .cic']);
    chk('temper', ['#trTemper .tp-hd', '#trTemper .tp-hd .pv', '#trTemper .tr-tp.k2 .tb', '#trTemper .tr-tp.k0 .tb .cic']);
    setTrSub('train'); renderTrain();
    return out;
  });
  ok(short.length === 0, '[7-f] ★ 351 — 9:13.3(1080×1600)에서 세 탭 전부 시트 밖 0건',
    short.length ? JSON.stringify(short) : '0건');
  await c2.close();

  /* ══ §R 되돌림 ══════════════════════════════════════════════════════════ */
  console.log('\n=== §R 되돌림 시험 — 무르게 풀지 않았음을 셋 다 못박는다 ===');
  {
    /* R-1 라벨 — 수리 전 «투자 n pt» 로 되돌리면 [5] 축이 무너진다 */
    const rv = await page.evaluate(() => {
      setTrSub('temper'); renderTrain();
      const b = document.querySelector('#trTemper .tr-tp.k0 .tb i');
      b.innerHTML = '투자 ' + fmt(temperCost(TEMPERS[0].k)) + ' pt';     /* 584 이전의 그 문자열 */
      return { txt: b.textContent.trim(), imgs: b.querySelectorAll('img.cic').length };
    });
    ok(/투자/.test(rv.txt) && rv.imgs === 0,
      '[R-a] ★ 옛 라벨로 되돌리면 «투자» 가 돌아오고 화폐가 0장이 된다(= [5] 가 이미 참인 것을 굳힌 게 아니다)',
      '«' + rv.txt + '»');
    const back = await page.evaluate(() => { const w = $('trTemper'); w.dataset.sig = ''; renderTrain();
      const b = document.querySelector('#trTemper .tr-tp.k0 .tb i');
      return { txt: b.textContent.trim(), imgs: b.querySelectorAll('img.cic').length }; });
    ok(/^[\d,]+$/.test(back.txt) && back.imgs === 1,
      '[R-b] 원복하면 다시 초록 — 사본이 트리를 안 더럽혔다(670 — 낱말 없는 «(아이콘) n»)',
      '«' + back.txt + '»');
  }
  {
    /* R-2 룬 그림 자리 — `.sa-e` 를 걷어내면 비가 수리 전으로 떨어진다 */
    const rv = await page.evaluate(() => {
      setTrSub('rune'); renderTrain();
      const ri = document.querySelector('#trw .tr-rn>.ri');
      ri.innerHTML = ri.textContent;                       /* 584 이전 = 맨 글자 + 액자 fs118 */
      return window.__artRatio('#trw .tr-rn>.ri');
    });
    ok(rv && rv.ratio < refRatio * 0.6,
      '[R-c] ★ 그림 자리 노드를 걷으면 비가 411 의 60% 아래로 떨어진다(수리 전 34.8%)',
      rv && `${rv.ratio} ↔ ${p2(refRatio)} (${p1(rv.ratio / refRatio * 100)}%)`);
    const back = await page.evaluate(() => { const w = $('trRunes') || $('trw');
      const d = document.querySelector('#trw .tr-runes'); if (d) d.dataset.sig = '';
      renderTrain(); return window.__artRatio('#trw .tr-rn>.ri'); });
    ok(back && near(back.ratio, refRatio, 3), '[R-d] 다시 그리면 원복된다',
      back && String(back.ratio));
  }
  {
    /* R-3 ↑ 버튼 — 수리 전 규격으로 되돌리면 «커졌다» 축이 무너진다 */
    const rv = await page.evaluate((pre) => {
      setTrSub('train'); renderTrain();
      const n = document.querySelector('#trw .tr-up');
      n.style.cssText = 'left:' + pre.x + 'px;top:' + pre.y + 'px;width:' + pre.w + 'px;height:' + pre.h + 'px';
      const r = window.__rc('#trw .tr-up', '#trw .tr-box'), pg = window.__rc('#trw .tr-prog', '#trw .tr-box');
      return { r, dc: Math.abs((r.y + r.h / 2) - (pg.y + pg.h / 2)) };
    }, PRE.up);
    ok(!(rv.r.w > PRE.up.w) && rv.dc < 1,
      '[R-e] ★ 수리 전 규격을 도로 씌우면 [3-a] 가 빨개진다(그 축이 실제로 크기를 잰다)',
      `${rv.r.w}×${rv.r.h}`);
    const back = await page.evaluate(() => { const n = document.querySelector('#trw .tr-up');
      n.style.cssText = ''; return window.__rc('#trw .tr-up', '#trw .tr-box'); });
    ok(back.w === up.up.w && back.h === up.up.h, '[R-f] 원복된다', `${back.w}×${back.h}`);
  }

  await ctx.close(); await browser.close();
  console.log('\nVERIFY584 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
