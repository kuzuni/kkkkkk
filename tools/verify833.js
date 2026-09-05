#!/usr/bin/env node
/* 게이트 — 작업 833 «10 이용권 카드 — 667 이 남긴 2인 일치 3건»
 *
 *   node tools/verify833.js
 *
 * 무엇을 지키는가
 *   §1 배지 종횡 — «2000% 가치» 배지 별의 **분홍 잉크**가 ref 종횡(0.94)을 따른다.
 *        ⚑ 667 10회차가 «크기 −3.6%» 로 넘긴 자리인데 뿌리는 크기가 아니라 **종횡**이었다:
 *          ref 잉크 158.84~160.90 × 169.15~171.21 (종횡 **0.9395**) ↔ 수리 전 우리 166 × 165 (1.006).
 *          잉크는 상자에서 검정 테(`.bdg>s{border:6px}`)를 뺀 값이라 **상자에게 물으면 나온다**.
 *   §2 두 줄  — 상자 높이가 178 → 184 로 커졌으므로 «2000%»·«가치» 두 줄이 **별 잉크 중심**에
 *              같이 따라 내려왔는가(5회차 규약의 부호만 반대다).
 *   §3 수량 세로 — 배너형 수량 잉크 상변이 리본 띠 하변 아래 **ref 범위(0.0~4.1)** 안이다.
 *              ⚠ **불릿형은 안 건드린다** — ref 자신이 8.3 ↔ 14.4 로 갈려 목표가 안 선다(A3-ⓑ).
 *              [3-c] 가 그 «안 건드림» 을 못박는다.
 *   §4 머리띠 — 833 이 **기각**한 자리다(제품 0줄). 헤더 밴드 세로는 이미 ref 다:
 *              위 검정 테 ref 10.15/9.00 ↔ 우리 10(=`.fr` 검정 테) · 채움 ref 96.12/102.28 ↔ 우리 96/102.
 *              «고쳐야 한다» 는 지적이 다시 오면 이 절이 먼저 대답한다.
 *   §5 프레임 — 9:19(2280)와 9:13.3(1600)에서 같은 값이다.
 *   §R 되돌림 시험 — 수리 전 값을 주입하면 **빨개진다**(§1·§3 이 공짜로 초록인 항이 아님을 못박는다).
 *
 * ref 실측은 `python3 tools/scan833.py` (분홍 잉크 bbox · 머리띠 50% 교차 모서리).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n' + t);
const p2 = n => Math.round(n * 100) / 100;

/* ── ref 실측 (scan833.py · 환산 px = ref × K, K = 2.0628) ────────────────── */
const REF = {
  /* ⚑⚑ 885 5회차 이관 — **이 두 줄은 «자가 ref 를 깎아 읽은 값» 이었다**(333 처방 · 항은 그대로 두고 값만 갈았다).
     ① `scan833.py` 는 분홍을 **색거리 마스크** `near(#F43171, 60)` 로 잡는다. ref 는 축소본이라 별 꼭짓점이
        번져서 그 마스크에 **안 걸린다** — 같은 사다리를 올리면 ref 만 계속 깎이고(tol40 169.1 → tol100 181.5)
        우리 crisp 렌더는 한 값에 서 있다. 그래서 «ref 160.9 ↔ 우리 160» 이 «맞다» 로 읽혔다.
     ② `scan885b/c` 가 쓰던 ref 창 (350,0,160) 은 배지(ref y15..102) 말고 **아래 붉은 부품**(y125..180)까지
        물어서, 그 창으로 재면 208.3×299.1 이 나오고 문턱을 올리면 144.4 로 미끄러진다 —
        885 3회차가 그 미끄러짐을 보고 «분홍 별판 = 측정 한계»([30]) 로 닫았다. **창이 문제였지 축이 아니다.**
     ⇒ 창을 배지에만 맞추고(350,0,110 / 350,300,405) **비침식 마스크**(R − max(G,B) ≥ t · R > 120)로 재면
        ref 두 카드가 **t30~t90 에서 나란히 181.5 × 181.5**(종횡 **1.000**)로 서고 부호도 안 뒤집힌다.
        같은 값을 자 셋이 따로 낸다 — ⓐ bbox 181.5 ⓑ 채운 면적비의 선형 배율 ⓒ 모양 IoU 최적 배율
        (우리 → ref 가로 ×1.15) · 그리고 측정표 §9 의 «별폭죽 뱃지 182×182» 와도 맞는다.
     자: `python3 tools/scan885d.py`(창·마스크가 주석에 박혀 있다). */
  bdgInkW: [181.5, 181.5],            // 배너형 / 불릿형 카드의 ref 배지 분홍 폭 (5회차 이관)
  bdgInkH: [181.5, 181.5],            // 〃 높이 (종횡 1.000 — 옛 0.94 는 침식된 읽기였다)
  hdbFill: { ban: 96.12, bul: 102.28 },   // 헤더 밴드 채움
  hdbTop: { ban: 10.15, bul: 9.00 },      // 밴드 위 검정 테
  qtyTopBan: [0.0, 4.1],              // 배너형 수량 잉크 상변 − 리본 띠 하변 (ref 두 줄)
};
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] === undefined
  ? NaN : (a.length % 2 ? a.slice().sort((x, y) => x - y)[(a.length - 1) / 2]
    : (a.slice().sort((x, y) => x - y)[a.length / 2 - 1] + a.slice().sort((x, y) => x - y)[a.length / 2]) / 2);

async function open(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopTab === 'function');
  await page.waitForTimeout(500);
  await page.evaluate(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(450);
  return { page, errs };
}

/* 카드마다 «상자는 DOM 에서» — 잉크는 상자에서 검정 테를 뺀 산수다(667 10회차 규약). */
const DUMP = `(() => {
  const A = document.getElementById('app').getBoundingClientRect();
  const B = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
    return { x: +(r.left - A.left).toFixed(2), y: +(r.top - A.top).toFixed(2),
             w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const num = (v) => parseFloat(v) || 0;
  return [...document.querySelectorAll('.pvc')].map((c) => {
    const cr = B(c), ban = c.classList.contains('ban1');
    const bdg = c.querySelector('.bdg'), s = bdg && bdg.querySelector('s');
    const bw = s ? num(getComputedStyle(s).borderTopWidth) : 0;
    const bb = B(bdg);
    const lines = [...bdg.querySelectorAll('i,b')].map(B);
    /* 885 3회차 — 배지 두 줄의 «가로 배율» 축. 선언이 아니라 **computed matrix** 로 낸다
       (207 함정 — 선언이 남은 채 computed 만 달라지는 얼굴은 선언을 읽으면 못 잡는다).
       matrix(a,b,c,d,e,f) 에서 rotate(θ)·scaleX(s) 는 [a,b] = s·[cosθ,sinθ] · [c,d] = [−sinθ,cosθ] 이므로
       **가로 배율 = hypot(a,b) · 세로 배율 = hypot(c,d)** 다 — 각도 θ 를 몰라도 나오고,
       각도를 바꿔도 이 자는 «배율» 만 잰다(세로가 1 이 아니면 높이를 건드린 것이다). */
    const bdgLn = [...bdg.querySelectorAll('i,b')].map((e) => {
      const cs = getComputedStyle(e);
      const m = cs.transform.match(/matrix\\(([^)]+)\\)/);
      const p = m ? m[1].split(',').map(parseFloat) : null;
      /* 885 4회차 — «회전의 중심» 을 같이 담는다. 두 줄이 **같은 페이지 점**을 중심으로 돌아야
         회전이 강체이고, 그때만 «각도» 와 «두 줄 간격» 이 서로를 안 건드리는 두 손잡이가 된다.
         org = 배지 상자 기준 원점 y (= 자기 top + transform-origin 의 y). */
      const oy = parseFloat((cs.transformOrigin.split(' ')[1] || '0'));
      return { tag: e.tagName, txt: e.textContent, tr: cs.transform, org: cs.transformOrigin,
        top: num(cs.top), orgY: num(cs.top) + oy,
        sx: p ? +Math.hypot(p[0], p[1]).toFixed(4) : null,
        sy: p ? +Math.hypot(p[2], p[3]).toFixed(4) : null,
        ls: num(cs.letterSpacing), padL: num(cs.paddingLeft),
        fs: num(cs.fontSize), lh: num(cs.lineHeight),
        stroke: num(cs.webkitTextStrokeWidth) };
    });
    const hdb = B(c.querySelector('.hdb'));
    const pil = B(c.querySelector('.pil'));
    const fr = c.querySelector('.fr');
    const rbs = ['rb1', 'rb2'].map((k) => {
      const rb = c.querySelector('.' + k); if (!rb) return null;
      const u = rb.querySelector('u');
      /* 833 7회차 — 수량 shrink-to-fit. advance 는 Range(667 [G3] 자와 같은 방법)이고
         --uq 가 걸린 뒤 값이라 **변환 뒤 advance** 다. 상자 폭은 offsetWidth(레이아웃 값). */
      const rg = document.createRange(); rg.selectNodeContents(u);
      const ur = rg.getBoundingClientRect(), A2 = document.getElementById('app').getBoundingClientRect();
      /* 833 8회차 — 리본 라벨. 원점은 «선언» 이 아니라 **computed** 로 낸다(207 함정은 선언이
         남아 있는 채로 computed 만 가운데로 가는 얼굴이라 선언을 읽으면 못 잡는다). */
      const li = rb.querySelector('i'), lcs = li ? getComputedStyle(li) : null;
      const lab = li ? { txt: li.textContent, tr: lcs.transform, org: lcs.transformOrigin,
        fs: num(lcs.fontSize), boxW: +li.getBoundingClientRect().width.toFixed(2),
        l: +(li.getBoundingClientRect().left - c.getBoundingClientRect().left).toFixed(2) } : null;
      return { rb: B(rb), u: B(u), lab, utop: num(getComputedStyle(u).top), b: B(rb.querySelector('b')),
        uTxt: u.textContent, uq: getComputedStyle(u).getPropertyValue('--uq').trim(),
        uAdv: +ur.width.toFixed(2), uBoxW: u.offsetWidth,
        uInkCx: +(ur.left + ur.width / 2 - A2.left).toFixed(2) };
    });
    const ti = c.querySelector('.pvt>i'), tcs = ti && getComputedStyle(ti);
    const stt = c.querySelector('.stt'), sti = stt && stt.querySelector('i');
    /* 833 6회차 — 배너형 카드에만 있는 라벨(.ban>i).
       ⚠ 상자 폭은 **offsetWidth**(레이아웃 값)로 잡는다 — getBoundingClientRect 는 scaleX 가 걸린
       변환 후 bbox 라 «상자가 좁아졌다» 로 읽힌다. advance 는 Range 로 재고(667 [G3] 자와 같은 방법),
       그 값은 변환 뒤 값이므로 배율로 나눠 **변환 전 advance** 를 되살린다. */
    const bi = c.querySelector('.ban>i');
    let banI = null;
    if (bi) {
      const bcs = getComputedStyle(bi);
      const rg = document.createRange(); rg.selectNodeContents(bi);
      banI = { fs: num(bcs.fontSize), lh: num(bcs.lineHeight), tr: bcs.transform,
        org: bcs.transformOrigin, left: num(bcs.left), right: num(bcs.right),
        stroke: num(bcs.webkitTextStrokeWidth), align: bcs.textAlign,
        boxW: +bi.offsetWidth.toFixed(2), advScaled: +rg.getBoundingClientRect().width.toFixed(2) };
    }
    /* 833 8회차 — 우변 물결 노치. «보이는 깊이» = 링 s 반지름 − 검정 테 두께이므로
       상자·링 둘의 실측 폭과 --ntc-d 선언을 같이 낸다(셋이 한 값에서 파생되는지 §12 가 본다). */
    const artE = c.querySelector('.art'), hdbE = c.querySelector('.hdb');
    const art = artE ? { top: num(getComputedStyle(artE).getPropertyValue('--art-t')),
      t: +(artE.getBoundingClientRect().top - c.getBoundingClientRect().top).toFixed(1),
      h: +artE.getBoundingClientRect().height.toFixed(1) } : null;
    const hdbBot = hdbE ? +(hdbE.getBoundingClientRect().bottom - c.getBoundingClientRect().top).toFixed(1) : null;
    const ntcD = num(getComputedStyle(c).getPropertyValue('--ntc-d'));
    const ntc = [...c.querySelectorAll('.ntc')].map((n) => {
      const sq = n.querySelector('s'), uq = n.querySelector('u');
      return { w: +n.getBoundingClientRect().width.toFixed(2),
        sW: +sq.getBoundingClientRect().width.toFixed(2),
        sBorder: num(getComputedStyle(sq).borderTopWidth),
        uW: +uq.getBoundingClientRect().width.toFixed(2) };
    });
    return { id: c.dataset.pv, ban, card: cr, bdg: bb, bdgBorder: bw, lines, bdgLn, hdb, pil, ntcD, ntc, art, hdbBot,
      frBorder: fr ? num(getComputedStyle(fr).borderTopWidth) : 0, rbs,
      ti: B(ti), tiFs: tcs ? num(tcs.fontSize) : null, tiLh: tcs ? num(tcs.lineHeight) : null,
      tiTr: tcs ? tcs.transform : null, tiOrg: tcs ? tcs.transformOrigin : null,
      stt: B(stt), sttI: B(sti),
      sttITop: sti ? num(getComputedStyle(sti).top) : null,
      sttITr: sti ? getComputedStyle(sti).transform : null,
      sttIFs: sti ? num(getComputedStyle(sti).fontSize) : null,
      sttILh: sti ? num(getComputedStyle(sti).lineHeight) : null,
      sttR: stt ? getComputedStyle(stt).borderTopLeftRadius : null,
      sttR2: stt ? getComputedStyle(stt).borderTopRightRadius : null, banI };
  });
})()`;

(async () => {
  const browser = await launch(chromium);
  const { page, errs } = await open(browser, 2280);
  const cards = await page.evaluate(DUMP);

  blk('§0 [전제] 카드가 세 장 뜬다');
  ok(cards.length === 3, '이용권 카드 3장', cards.map(c => c.id).join(' · '));
  ok(cards.filter(c => c.ban).length === 1, '배너형 1 · 불릿형 2',
    cards.map(c => c.id + (c.ban ? '(배너)' : '(불릿)')).join(' · '));

  blk('§1 배지 분홍 잉크 — ref 종횡을 따른다');
  const refW = med(REF.bdgInkW), refH = med(REF.bdgInkH), refAsp = refW / refH;
  for (const c of cards) {
    /* 잉크 = 상자 − 검정 테. 세로는 별 꼭짓점이 상자 변에 닿아 AA 1px 이 더 먹는다
       (수리 전 실측이 그 상수를 확정했다: 상자 178 → 잉크 가로 166 = 178−12 · 세로 165 = 178−13). */
    const inkW = c.bdg.w - 2 * c.bdgBorder;
    const inkH = c.bdg.h - (2 * c.bdgBorder + 1);
    /* 5회차 실측(r51 · 비침식 마스크): 잉크 181×181 · 윗변 −38.0 · 중심 +52.5 · 카드 우변에서 +25.0
       ↔ ref 181.5×181.5 · 윗변 −38.2 · 중심 +51.6~53 · 우변에서 +23.6. */
    ok(Math.abs(inkW - refW) <= 3, `[1-a] ${c.id} 배지 잉크 폭 ≈ ref ${p2(refW)}`, `${p2(inkW)}`);
    ok(Math.abs(inkH - refH) <= 3, `[1-b] ${c.id} 배지 잉크 높이 ≈ ref ${p2(refH)}`, `${p2(inkH)}`);
    ok(Math.abs(inkW / inkH - refAsp) <= 0.02,
      `[1-c] ${c.id} 배지 종횡 ≈ ref ${p2(refAsp)}`, `${p2(inkW / inkH)}`);
    /* 잉크 윗변은 **안 건드린 축**이다(수리 전에도 ref 였다) — 그대로인지 못박는다. */
    const inkTop = c.bdg.y + c.bdgBorder + 0.5 - c.card.y;
    /* ⚑ 5회차 이관 — 옛 범위(29~34)는 [1-a][1-b] 와 **같은 침식된 읽기**에서 나온 값이다.
       비침식 마스크로 재면 ref 불릿 카드의 분홍 윗변은 카드 상변(측정표 §15-3 의 328.5) 위
       **18.5 ref px = 38.2 우리px** 다. 판이 커진 만큼 위로도 자라야 이 값이 맞는다. */
    ok(inkTop >= -40.5 && inkTop <= -36,
      `[1-d] ${c.id} 배지 잉크 윗변이 카드 상변 위 36~40.5 (ref −38.2 · 5회차 이관)`, `${p2(inkTop)}`);
  }

  /* ── 885 3회차 신설 ─────────────────────────────────────────────────────────
     배지 «글자» 의 가로 배율. 2회차 채점 2인(DP·DQ)이 «배지 가로만 좁다» 에 일치했고,
     3회차가 `tools/scan885b.py`(세 번째 자)로 갈랐다 — **노랑 글자** 잉크는 임계 30~110
     다섯 단 전부 −7.6~−8.2%(부호 불변)인데 **분홍 별판**은 같은 사다리에서 ref 가
     181.5 → 144.4 로 미끄러져 **측정 한계**다. ⇒ 손잡이는 판이 아니라 글자이고,
     `font-size` 가 아니라 **가로 배율**이다(높이는 −0.9% 로 맞아 있었다 · 380 함정).
     ⚑⚑ **그리고 손잡이는 «배율» 이 아니었다** — 총폭만 보면 «글자가 좁다» 와 «글자 사이가 안 벌어졌다» 가
     안 갈린다(LESSONS 92-곁가지3). `scan885b.py --glyph` 로 윗줄 다섯 글리프를 열 덩이로 가르니:
       ref  글리프 폭 합 **130.0** · 틈 합 **24.8**(6.2 ×4) · 총 154.7
       우리 글리프 폭 합 **132.0**(+1.5% = 이미 맞다) · 틈 합 **11.0** · 총 143.0
     ⇒ 부족분 전부가 **«글자 사이»** 다(24.8 − 11.0 = 13.8 ⊃ 총폭 부족 11.7).
        `scaleX` 로 맞추면 이미 맞아 있던 글리프를 +9% 로 **틀리게** 만들면서 총폭만 맞춘다
        ⇒ 손잡이는 **`letter-spacing`** 이고, 문자열 길이가 바뀌어도 따라가므로 구조적으로도 옳다.
     수리 뒤 실측(같은 자): 총 **155.0** ↔ ref 154.7~156.8 · 글리프 합 **132~135**(무변경) · 틈 합 **20~23**.
     ⚠ 아래 [1-h] 가 «가로·세로 배율 = 1» 을 같이 묻는 것이 이 수리의 핵심이다 —
        배율이나 fs 로 갈아타면 그 항이 먼저 빨개진다(둘 다 «이미 맞는 글리프» 를 건드리는 손잡이다). */
  blk('§1-2 배지 «글자» 사이 — 885 3회차 (글리프·판은 안 건드렸다)');
  for (const c of cards) {
    const ln = c.bdgLn;
    ok(ln.length === 2, `[1-e] ${c.id} 배지 줄이 둘(«${ln.map(l => l.txt).join('» · «')}»)`, `${ln.length}`);
    ok(ln.every(l => Math.abs(l.ls - ln[0].ls) < 0.01),
      `[1-f] ${c.id} 두 줄이 **한 값**을 쓴다 (833 [13-d] — 줄마다 손으로 다른 값을 적지 마라)`,
      ln.map(l => p2(l.ls)).join(' · '));
    /* ⚑ 885 7회차 — 2.9 → **5.2**. 6회차 채점 EY 가 **낱자 피치**를 처음 쟀다(ref 33.35 ↔ 우리 31.05 = −6.9%)
       ⇒ 피치 +2.30px = 자간 +2.30. 3회차의 «틈 합 11.0 ↔ ref 24.8» 은 그 방향의 첫 절반이었다.
       ⚠ 글리프 배율은 여전히 1 이다([1-h]) — 낱자 종횡 −10% 는 서체 모양이고 지시서 [3] 이 감점에서 뺀 자리다. */
    ok(ln.every(l => Math.abs(l.ls - 5.2) <= 0.05),
      `[1-g] ${c.id} letter-spacing = 5.2 (3회차 0 → 2.9 → 7회차 5.2 = 낱자 피치 ref 33.35 에 맞춘 값)`, ln.map(l => p2(l.ls)).join(' · '));
    ok(ln.every(l => Math.abs(l.sx - 1) <= 0.005 && Math.abs(l.sy - 1) <= 0.005),
      `[1-h] ${c.id} **가로·세로 배율이 둘 다 1** — 글리프 자체는 안 건드렸다 (이미 ref 폭 +1.5% 였다)`,
      ln.map(l => `${p2(l.sx)}×${p2(l.sy)}`).join(' · '));
    ok(ln.every(l => Math.abs(l.padL - l.ls) <= 0.05),
      `[1-i] ${c.id} padding-left = letter-spacing — 마지막 글자 뒤 여백이 미는 가운데 정렬을 되갚는다`,
      ln.map(l => `${p2(l.padL)} ↔ ${p2(l.ls)}`).join(' · '));
    ok(ln[0].fs === 46 && ln[0].lh === 48 && ln[1].fs === 36 && ln[1].lh === 40,
      `[1-j] ${c.id} font-size/line-height 불변 (46/48 · 36/40 — 크기로 폭을 좇으면 380 함정)`,
      `${ln[0].fs}/${ln[0].lh} · ${ln[1].fs}/${ln[1].lh}`);
    ok(ln[0].stroke === 8 && ln[1].stroke === 7,
      `[1-k] ${c.id} 검정 획 선언 8/7 불변 — letter-spacing 은 획을 안 건드린다(833 [10-g] 의 ⑤ 대가가 여기선 0)`,
      `${ln[0].stroke} · ${ln[1].stroke}`);
    /* ⚑ 885 3회차 — **기울기의 «부호»**. ref 는 글자가 좌→우로 **내려가고**(DR +15.2~16.3° ·
       이 회차 자 +11.4~12.3° · 임계 3단 · ref 두 카드 모두) 우리는 **올라가고 있었다**(−8.6°).
       matrix(a,b,c,d) 에서 회전각 = atan2(b,a) 이므로 **b > 0 이면 ref 와 같은 방향**이다.
       ⚠ 크기(잔차 약 −3.5~4°)는 «두 줄 간격» 과 한 쌍이라 다음 회차 몫이다(제품 주석 참조) —
          이 항은 **부호만** 못박는다. 부호는 AABB 를 안 바꾸므로 닫힌 축을 건드리지 않는다. */
    /* ⚑⚑ 885 4회차 이관 — 3회차는 이 항을 «부호만» 이라고 적어 두고 **크기 10 을 ±0.5 로 못박았다.**
       4회차가 «각도를 가정하지 않는 자»(`tools/scan885c.py`)로 ref 를 직접 재서 **+14.5~15.0°**
       (문턱 5단 부호·값 유지 · ref 두 카드)를 냈으므로, 이 항은 이제 **ref 실측값**을 묻는다.
       ⚠ 방향을 뒤집은 것이 아니라 «자리 잡기 전의 임시값» 을 «잰 값» 으로 갈아 끼운 것이다(333 처방). */
    ok(ln.every(l => {
      const m = l.tr.match(/matrix\(([^)]+)\)/); if (!m) return false;
      const p = m[1].split(',').map(parseFloat);
      const d = Math.atan2(p[1], p[0]) * 180 / Math.PI;
      return p[1] > 0 && d >= 14.0 && d <= 15.5;
    }), `[1-l] ${c.id} 글자 기울기가 ref 실측 +14.5~15.0° 안 (수리 전 −10° → 3회차 +10° → 4회차 +15°)`,
      ln.map(l => l.tr).join(' · '));
    /* ⚑ 885 4회차 신설 — **강체 회전**. 두 줄이 같은 페이지 점을 중심으로 돌지 않으면
       두 줄이 서로 «어긋나며» 벌어져 |θ| 를 키울 때마다 AABB 가 깨진다(3회차가 15° 를 넣어 보고
       물러난 그 자리). 자로 잰 증거: 베이스라인 축에서 두 줄 잉크 중점의 어긋남이
       ref **−0.2~−0.5**(= 강체) ↔ 수리 전 우리 **+6.9**(= d·sinθ, 줄마다 따로 회전) 였고,
       수리 뒤 **−0.7** 로 ref 에 붙었다. 배지가 172×184 이므로 공통 원점은 상자 기준 y = 92 다. */
    ok(ln.length === 2 && Math.abs(ln[0].orgY - ln[1].orgY) <= 0.05,
      `[1-m] ${c.id} 두 줄이 **같은 점**을 중심으로 돈다 (강체 회전 — 상자 기준 원점 y 가 같다)`,
      ln.map(l => `${p2(l.top)}+${l.org} ⇒ ${p2(l.orgY)}`).join(' · '));
    /* ⚑ 5회차 이관 — 상수 92 를 **상자에서 파생**시킨다. 92 는 «172×184 의 한가운데» 라는 뜻이었는데
       상자가 바뀌자 뜻이 아니라 숫자만 남아 빨개졌다. 판이 다시 자라도 이 항은 따라온다. */
    ok(ln.every(l => Math.abs(l.orgY - c.bdg.h / 2) <= 0.6),
      `[1-n] ${c.id} 그 공통 점이 **배지 상자의 한가운데**(h/2 = ${p2(c.bdg.h / 2)}) — 블록이 배지 안에 그대로 앉는다`,
      ln.map(l => p2(l.orgY)).join(' · '));
    /* ⚑ 885 4회차 신설 — 두 줄 «수직» 거리. 강체이므로 화면 수직 거리가 곧 베이스라인 수직 거리다.
       ref 는 «빈 띠»(두 줄 잉크 사이 빈 구간) 10.6~10.7 이고, 우리 잉크 두께가 ref 보다 두꺼워
       (윗줄 +10% · 아랫줄 +19% — **895 로 등재한 남은 축**) 중심 거리로 맞추면 글자가 붙는다.
       ⇒ 과녁은 **빈 띠**이고 그때 상자 값이 48/95.75 = 중심 거리 43.75 다. */
    /* ⚑⚑ 885 7회차 — **43.75 → 38.80.** 4회차는 과녁을 «빈 띠»(10.65)로 잡았는데, 6회차 채점 2인이
       **중심 거리를 직접** 재서 둘 다 +11% 를 냈다(EX ref 38.34~38.77 ↔ 우리 42.97~43.03 · EY 38.8 ↔ 43.09).
       셋째 자로 4회차 자신의 도구(`tools/scan885c.py`)를 다시 돌리니 **ref cen 38.5 · base 35.8** 이고
       수리 후 우리가 **38.0 / 36.3**(Δ −1.2% / +1.5%) 이다 — 세 자가 같은 쪽이다.
       ⚠ «빈 띠» 논거를 버린 것이 아니라 **그 잔차의 뿌리가 895(배지 잉크 두께 +10%/+19%)** 라는 뜻이다.
       중심 거리를 ref 에 맞추면 우리 빈 띠는 잉크가 두꺼운 만큼 ref 보다 좁아진다 — 그 몫은 895 가 닫는다.
       (7회차의 회전 프로파일 자는 ref 에서도 빈 띠를 0 으로 읽어 이 축을 가르지 못했다 — 관측으로만 남긴다.) */
    ok(ln.length === 2 && Math.abs((ln[1].top + ln[1].lh / 2) - (ln[0].top + ln[0].lh / 2) - 38.8) <= 0.3,
      `[1-o] ${c.id} 두 줄 중심 거리 38.8 (4회차 43.75 — ref 직접 실측 cen 38.5 에 맞춘 값 · 잔여 빈 띠는 895)`,
      `${p2((ln[1].top + ln[1].lh / 2) - (ln[0].top + ln[0].lh / 2))}`);
  }

  blk('§2 «2000%»·«가치» 두 줄이 별 잉크 중심을 따라간다');
  for (const c of cards) {
    const top = Math.min(...c.lines.map(l => l.y));
    const bot = Math.max(...c.lines.map(l => l.y + l.h));
    const cLine = (top + bot) / 2 - c.bdg.y;                 // 상자-로컬 두 줄 중심
    const cStar = (c.bdg.h - 1) / 2 + c.bdgBorder * 0 + 0.5; // 상자-로컬 별 잉크 중심 ≈ 상자 중심
    ok(Math.abs(cLine - cStar) <= 8,
      `[2-a] ${c.id} 두 줄 중심이 별 중심에서 ±8`, `줄 ${p2(cLine)} ↔ 별 ${p2(cStar)}`);
    ok(top > c.bdg.y && bot < c.bdg.y + c.bdg.h + 6,
      `[2-b] ${c.id} 두 줄이 배지 상자 안(아래로 6 여유)`, `${p2(top)}..${p2(bot)} ⊂ ${p2(c.bdg.y)}..${p2(c.bdg.y + c.bdg.h)}`);
  }

  blk('§3 수량 세로 — 배너형만 옮겼다');
  for (const c of cards) {
    for (const r of c.rbs) {
      if (!r) continue;
      const d = r.u.y - (r.rb.y + r.rb.h);          // 상자 기준 — 잉크는 아래 [3-b] 가 본다
      ok(c.ban ? r.utop === 49 : r.utop === 58,
        `[3-a] ${c.id} 수량 top = ${c.ban ? 49 : 58}`, `${r.utop}`);
      ok(d > -40 && d < 40, `[3-b] ${c.id} 수량 상자가 리본 바로 아래`, `${p2(d)}`);
    }
  }
  const bul = cards.filter(c => !c.ban);
  ok(bul.every(c => c.rbs.every(r => r.utop === 58)),
    '[3-c] 불릿형 수량은 **안 건드렸다**(ref 가 8.3 ↔ 14.4 로 갈리는 축 · A3-ⓑ)');

  blk('§4 머리띠 — 833 이 기각한 자리(제품 0줄)');
  for (const c of cards) {
    const want = c.ban ? REF.hdbFill.ban : REF.hdbFill.bul;
    ok(Math.abs(c.hdb.h - want) <= 2.5,
      `[4-a] ${c.id} 밴드 채움 ≈ ref ${want}`, `${p2(c.hdb.h)}`);
    const top = c.hdb.y - c.card.y;
    ok(Math.abs(top - c.frBorder) < 0.6,
      `[4-b] ${c.id} 밴드 위 검정 = 카드 프레임 테 ${c.frBorder}`, `${p2(top)}`);
    const refTop = c.ban ? REF.hdbTop.ban : REF.hdbTop.bul;
    ok(Math.abs(c.frBorder - refTop) <= 1.5,
      `[4-c] ${c.id} 그 검정 테가 ref ${refTop} 안`, `${p2(c.frBorder)}`);
  }

  blk('§6 마일리지 알약 — 위로만 줄였다(아래끝 붙박이)');
  for (const c of cards) {
    ok(Math.abs(c.pil.h - 65.5) < 0.6, `[6-a] ${c.id} 알약 높이 ≈ ref 65.0~66.0`, `${p2(c.pil.h)}`);
    const bot = c.pil.y + c.pil.h - c.card.y;
    ok(Math.abs(bot - 14) < 0.6, `[6-b] ${c.id} 알약 하변 = 카드 상변 +14 (수리 전과 같다)`, `${p2(bot)}`);
    const up = c.card.y - c.pil.y;
    ok(up >= 50.5 && up <= 52.5, `[6-c] ${c.id} 카드 위로 솟는 양 51.4~52.2(ref)`, `${p2(up)}`);
  }

  blk('§7 리본2 우단 — ref 두 카드가 같은 자리(529.2)다');
  /* 자 `tools/scan833b.py` (환산 px · 리본 왼끝에서 걸어 나가 처음 «카드 몸통색» 이 되는 자리):
       ref 배너 리본2 **529.2** · ref 불릿 리본2 **529.2**(소수점까지 같다) ↔ 수리 전 520.0 / 525.0.
       리본1 은 ref 자신이 430.2 ↔ 446.7 로 갈리므로 **안 건드린다**(A3-ⓑ).
     제비꼬리가 마지막 열을 덮으므로 «보이는 우단 = 상자 우단 − 1» ⇒ 상자 530 이 곧 529. */
  for (const c of cards) {
    const r2 = c.rbs[1];
    ok(Math.abs((r2.rb.x + r2.rb.w - c.card.x) - 530) < 0.6,
      `[7-a] ${c.id} 리본2 우단 = 530 (보이는 529 ≈ ref 529.2)`,
      `${p2(r2.rb.x + r2.rb.w - c.card.x)}`);
    /* ⚑ 이관(833 9회차 · 333 처방 — 방향을 뒤집었다). 3회차는 «리본1 은 ref 도 430.2 ↔ 446.7 로
       갈리니 안 건드린다» 로 넘겼는데, **갈린다는 것은 «형마다 값이 다르다» 는 뜻**이지
       «맞춰 놓았다» 는 뜻이 아니었다 — `scan833b.py` 로 재면 불릿형은 ref 446.7 ↔ 우리 445.0(맞다)이고
       **배너형만 ref 430.2 ↔ 우리 424.0 = −6.2** 였다(8회차 채점 DF·DG 가 각자 −5.9 로 2인 일치).
       ⇒ 배너형 w1 을 430 으로(불릿형 350 은 무변경). 이제 이 항이 지키는 것은 **형마다 두 값**이다. */
    const r1 = c.rbs[0];
    ok(Math.abs((r1.rb.x + r1.rb.w - c.card.x) - (c.ban ? 430 : 350)) < 0.6,
      `[7-b] ${c.id} 리본1 우단 = ${c.ban ? '430 (ref 430.2 · 9회차 이관 · 옛 424)' : '350 (ref 446.7 · 무변경)'}`,
      `${p2(r1.rb.x + r1.rb.w - c.card.x)}`);
    /* ⚑ `--gx` 는 리본 오른끝 기준이라 w2 만 늘리면 판·수량이 같이 밀린다 —
       g2 를 같은 Δ 만큼 키워 붙박은 것을 여기서 못박는다(667 [F3]·[F4] 와 같은 값). */
    const bCx = r2.b.x + r2.b.w / 2 - c.card.x;
    ok(Math.abs(bCx - (c.ban ? 441.5 : 451.5)) < 1.5,
      `[7-c] ${c.id} 리본2 금색 판 중심 Δ0 (667 [F3]/[F4] 자리 ${c.ban ? 441.5 : 451.5})`, `${p2(bCx)}`);
    ok(Math.abs((r2.u.x + r2.u.w / 2) - (r2.b.x + r2.b.w / 2)) < 0.6,
      `[7-d] ${c.id} 수량 중심 = 판 중심 (667 [G4] 규약 유지)`,
      `${p2(r2.u.x + r2.u.w / 2 - r2.b.x - r2.b.w / 2)}`);
  }

  blk('§8 상태 탭 — 판은 그대로, 라벨만 내렸다');
  /* 자 `tools/scan833b.py` (카드 상변 기준 환산 px · 잉크 bbox):
       | | ref 배너 | ref 불릿 | 수리 전 | 수리 후 |
       | 잉크 상변 | −29.8 | −32.5 | −39.0 | **−32.0** |
       | 잉크 하변 |  −0.9 |  −3.6 |  −8.0 |  **−1.0** |
       | 잉크 중심 | −15.4 | −18.1 | −23.5 | **−16.5** |
       | 판이 솟은 양 | 54.5 | 55.2 | 56.0 | 56.0(무변경) |
     ⇒ 1회차 2인 일치 3번의 두 갈래 중 **CY(«잉크가 7.7px 위»)가 맞고 CX(«판이 3.8~5.7 높다»)는
     기각**이다(판 Δ +1.2 = +2.2%). 손잡이는 `.stt>i{top}` 하나. */
  for (const c of cards) {
    ok(c.sttITop === 16, `[8-a] ${c.id} 탭 라벨 top = 16 (수리 전 9)`, `${c.sttITop}`);
    ok(c.sttIFs === 36 && c.sttILh === 40,
      `[8-b] ${c.id} 라벨 서체 상수 불변 (36/40 — 잉크 오프셋이 이 둘에 매여 있다)`,
      `${c.sttIFs}/${c.sttILh}`);
    ok(c.sttI.y + c.sttI.h <= c.stt.y + c.stt.h + 0.6,
      `[8-c] ${c.id} 라벨 줄상자가 탭 판 안 (넘치면 잘린다)`,
      `${p2(c.sttI.y + c.sttI.h - c.stt.y)} ≤ ${p2(c.stt.h)}`);
    ok(Math.abs((c.card.y - c.stt.y) - 56) < 0.6 && Math.abs(c.stt.h - 68) < 0.6,
      `[8-d] ${c.id} 탭 판은 **안 건드렸다** (솟음 56 · 높이 68)`,
      `${p2(c.card.y - c.stt.y)} / ${p2(c.stt.h)}`);
    /* ⚑ 885 2회차 — 채점 2인(DP·DQ)이 **독립으로** «윗모서리 반경이 ref 의 2/3» 를 냈다(둘 다 신뢰 상 ·
       임계 3단 스윕 부호 불변 · r_ref 40~44 ↔ 우리 29). 그 한 값이 1회차의 «탭↔쿠폰칩 틈» 상충도 설명한다 —
       탭 최대폭 구간을 잰 자와 상단 호 구간을 잰 자가 반대 부호를 얻는다(DQ 깊이별 표). ⇒ 30 → 40.
       ⚠ 반경만 옮겼다 — 폭·솟음은 [8-d] 가 그대로 지킨다(둘 다 «자리는 맞다» 를 같이 적었다). */
    /* ⚑ 885 3회차 — 40 은 «부분 회수» 였다. 채점 2인(DR·DS)이 **원호 적합**으로 다시 독립 일치했고
       (DR ref 45.8~47.7 · DS ref 46.2~49.9 · 둘 다 임계 3~5단 부호 유지 · 둘 다 자기 추정기가
       우리 값 39.6~41.9 를 되짚어 CSS 40 과 맞는 것으로 편향을 검증했다) 두 구간이 겹치는 값이 **47** 이다.
       ⚠ 둘 다 «틈은 건드리지 마라» 를 같이 적었다 — 얕은 자리(d 18/26)의 틈 −11~17% 는 이 반경이
       옮겨온 것이고 깊은 자리(d 42/50)는 이미 ref 두 값 사이다. */
    ok(c.sttR === '47px' && c.sttR2 === '47px',
      `[8-e] ${c.id} 탭 윗모서리 반경 = 47 (ref 45.8~49.9 · 2인 일치 · 아래 두 모서리는 0)`,
      `${c.sttR} / ${c.sttR2}`);
  }
  ok(new Set(cards.map(c => c.sttITop)).size === 1,
    '[8-e] 세 카드가 한 부품 — 라벨 자리가 한 값', cards.map(c => c.sttITop).join(' / '));
  /* ⚑ 5회차 — 라벨이 **가로로만** 6.5% 눌려 있었다(비평가 **넷**이 독립으로 같은 값 ·
     전원 «높이는 맞다»). 범인은 `scaleX(.94)` 하나이고 되돌릴 배율은 산수로 1.0 이다
     (잉크 108 ÷ .94 = 114.9 ↔ ref 115.5). 실측 후 `ink151.py`: **115 × 31 ↔ ref 115.5 × 30.9**
     (−0.4% / +0.3%). ⚠ 세로(top:16)는 3회차 자리 그대로 — 그 축은 넷 다 «맞음» 이었다. */
  for (const c of cards) {
    ok(c.sttITr === 'none',
      `[8-f] ${c.id} 탭 라벨에 가로 배율이 없다 (scaleX(.94) 제거 — ref 폭 115.5 ↔ 우리 115)`,
      `${c.sttITr}`);
  }

  blk('§9 제목 글자 — em 은 세로로, scaleX 는 가로로 (원점은 **좌변**)');
  /* 자 `tools/ink151.py`(흰 채움만 = 검정 획이 안 섞인다) · `tools/scan833b.py`(잉크 bbox):
       | 흰 잉크 (환산 px) | ref | 수리 전 | 수리 후 |
       | 제목 1장 | 185.7 × 43.3 | 200 × 46 (+7.7% / +6.2%) | **184 × 44** (−0.9% / +1.6%) |
       | 제목 2장 | 278.5 × 47.5 | 307 × 49 (+10.2% / +3.2%) | **283 × 47** (+1.6% / −1.1%) |
     ⚠⚠ [9-c] 가 이 수리의 **본체**다 — `#shopw i{transform-origin:50% 50%}`(ID 1,0,1)가
     클래스 선택자(0,3,1)를 조용히 이겨서, 스코프 짝이 없으면 scaleX 가 **중앙 기준**으로 걸리고
     잉크 좌단이 74 → 78 로 밀린다(두 비평가가 «맞음» 으로 올린 자리를 이번 수리가 깨는 것이다). */
  for (const c of cards) {
    ok(c.tiFs === 54.5, `[9-a] ${c.id} 제목 font-size = 54.5 (수리 전 57)`, `${c.tiFs}`);
    ok(/matrix\(0\.96,/.test(c.tiTr), `[9-b] ${c.id} 제목 scaleX(.96)`, `${c.tiTr}`);
    ok(/^0px /.test(c.tiOrg),
      `[9-c] ${c.id} 제목 transform-origin 의 **x 가 0** — #shopw 특이성 함정을 이겼다`, `${c.tiOrg}`);
    ok(c.tiLh === 60, `[9-d] ${c.id} line-height 60 불변 (세로 중심이 여기 매여 있다)`, `${c.tiLh}`);
    ok(Math.abs((c.ti.x - c.card.x) - 78) < 0.6,
      `[9-e] ${c.id} 제목 상자 좌단 78 불변 (원점이 좌변이라 상자가 안 움직인다)`,
      `${p2(c.ti.x - c.card.x)}`);
  }

  blk('§10 배너 라벨 — 가로만 되돌렸다 (세로는 [G3] 이 막는 자리)');
  /* 자 `tools/ink151.py`(흰 채움 min>246 · 검정 획이 안 섞인다):
       | 배너 글자 (환산 px) | ref | 수리 전 | 수리 후 |
       | 잉크 w × h | 235.2 × 28.9 | 261 × 28 (**+11.0%** / −3.1%) | **235 × 28** (−0.1% / −3.1%) |
       | 잉크 중심 x (카드-로컬) | 317.7 + 50 = 367.7 | 369.0 | **369.0** (무변경) |
     ⚑ 비평가 DB [A] 도 «낱자 가로 +19% · 총 폭 +11.0% · 높이 Δ+0.1» 로 같은 축을 찍었다.
     ⚠ **세로를 안 올린 것이 이 절의 본체다** — fs 36 → 37 이면 advance 가 상자 폭(269)을 넘고,
     넘치는 순간 `text-align:center` 가 죽어 잉크가 오른쪽으로만 밀린다(667 [G3] 이 같은 사고를
     수량에서 이미 겪었다). [10-d] 가 그 여유를 매 실행 찍는다 — 높이 −3.1% 는 0.9px 이다.
     ⚠ 원점은 여기서 **중앙이 옳다**(4회차 제목과 반대다) — 라벨이 `left/right + text-align:center`
     라 잉크가 상자 중심 언저리에 앉고, 중앙 원점으로 줄여야 중심이 안 움직인다. [10-c] 가 그 뜻이고,
     제목처럼 `transform-origin:0 50%` 짝을 만들면 이 자리는 **왼쪽으로 밀린다**. */
  const banC = cards.find(c => c.ban);
  ok(!!(banC && banC.banI), '[10-0] 배너형 카드에 라벨이 있다', banC && banC.banI ? 'ok' : '없음');
  if (banC && banC.banI) {
    const B10 = banC.banI;
    const sx = (B10.tr.match(/matrix\(([-\d.]+)/) || [])[1];
    ok(/^matrix\(0\.9,/.test(B10.tr), '[10-a] 배너 라벨 scaleX(.9) (수리 전 없음)', B10.tr);
    ok(B10.fs === 36 && B10.lh === 40,
      '[10-b] 세로 축(fs 36 · line-height 40)은 **안 건드렸다**', `${B10.fs}/${B10.lh}`);
    ok(Math.abs(parseFloat(B10.org) - B10.boxW / 2) < 1.5,
      '[10-c] 원점 x = 상자 중심 (#shopw 규칙이 이기는 것이 **여기서는 옳다**)',
      `${B10.org} ↔ 상자 중심 ${p2(B10.boxW / 2)}`);
    const adv0 = B10.advScaled / parseFloat(sx || 1);
    /* ⚠⚠ 6회차가 자를 대고서야 안 것 — 이 라벨은 **이미 상자를 9.6px 넘고 있다**(advance 264.6 ↔
       상자 255 · `.ban{border:7}` 과 `box-sizing:border-box` 때문에 상자는 269 가 아니라 255 다).
       즉 `text-align:center` 는 여기서 이미 죽어 있고(넘치면 왼끝에서 시작한다 — 667 [G3] 이 수량에서
       겪은 것과 같다), 667 은 그 사실을 알고 **넘침의 절반(4.8px)을 `left` 로 미리 갚아 놨다**
       (CSS 주석 «그 4 를 빼고 적는다 ⇒ left = 2×(317.7−4.0) − 450»).
       ⇒ 여기서 물을 것은 «안 넘치는가» 가 아니라 **«넘침이 그대로인가»** 다 — fs 를 올리면 넘침이
       커지고 그만큼 잉크 중심이 오른쪽으로 밀려 667 의 보정이 어긋난다. 6회차가 세로를 안 건드린
       진짜 이유가 이것이고, [10-h] 가 그 결과(잉크 중심)를 직접 잰다. */
    /* ⚑ 이관(833 9회차 · 333 처방 — **방향을 뒤집었다. 지우지 않았다**).
       8회차 채점에서 DF·DG 가 «잉크가 노란 칸 안에서 +11.6/+11.7 오른쪽» 을 2인 일치로 냈고,
       9회차의 셋째 자(`tools/scan833c.py` · 문턱 235/246/250 불변)가 **+10.1** 로 확인했다.
       그 10.1 의 정체가 바로 이 «넘침» 이다 — 667 이 갚아 둔 «넘침의 절반» 이 ref 자리가 아니었다.
       ⇒ 9회차는 갚는 대신 **넘침을 없앴다**(상자 실폭 255 → 283 > advance 264.7).
       이제 이 항이 지키는 것은 «넘침이 그대로인가» 가 아니라 **«넘침이 0 인가»** 다 —
       fs 를 올려 다시 넘치면 `text-align:center` 가 죽어 잉크가 오른쪽으로 튄다(667 [G3] 과 같은 사고). */
    ok(adv0 <= B10.boxW,
      `[10-d] 넘침 0 — advance ≤ 상자폭 (9회차: 갚지 않고 없앴다 · 여유 ${p2(B10.boxW - adv0)}px)`,
      `${p2(adv0)} ≤ ${p2(B10.boxW)}`);
    ok(Math.abs(B10.advScaled - 235.2) <= 8,
      '[10-e] 변환 뒤 advance ≈ ref 환산 잉크 235.2 (±8 = side bearing 몫)', `${p2(B10.advScaled)}`);
    /* ⚑ 이관(833 9회차) — 넘침이 0 이 된 뒤로는 **레이아웃 잉크 중심 = 상자 중심**이고,
       배율 원점도 상자 중심이라 변환이 중심을 안 옮긴다 ⇒ 잉크 중심 = 상자 중심 한 줄로 선다.
       새 목표는 **359.5**(카드-로컬) = 노랑 칸 중심 361.5 + ref 편차 −2.1.
       ⚠ 옛 목표 367.7 은 667 8회차가 자기 자로 낸 값이고, 9회차의 화소 자는 같은 정의로
       ref·우리를 같이 재서 «칸 중심 − 잉크 중심» 을 ref −2.1 ↔ 우리(수리 전) +8.0 으로 갈랐다. */
    const boxL = 50 + 7 + B10.left, boxC = boxL + B10.boxW / 2;
    const inkC = boxC + (boxL + Math.max(adv0, B10.boxW) / 2 - boxC) * parseFloat(sx || 1);
    ok(Math.abs(inkC - 359.5) <= 1.5,
      '[10-h] 변환 뒤 잉크 중심 359.5(카드-로컬) ±1.5 — ref 는 노랑 칸 중심 −2.1 (9회차 이관 · 옛 값 367.7)',
      `${p2(inkC)}`);
    ok(B10.left === 161 && B10.right === 4 && B10.align === 'center',
      '[10-f] 상자(161/4 — 9회차가 넘침을 없앤 값)와 가운데 정렬',
      `${B10.left}/${B10.right}/${B10.align}`);
    ok(B10.stroke === 8, '[10-g] 검정 획 8px 불변 (배율은 획도 같이 누른다 — ⑤ 기록)', `${B10.stroke}`);
  }

  blk('§11 수량 shrink-to-fit — ref 는 자릿수가 늘면 글자를 줄여 «폭» 을 붙박는다');
  /* 자 셋이 독립으로 같은 것을 봤다 — 비평가 DD(«10,000» +19.6% · «16,000» +8.5%) ·
     DE(+21.2% / +9.8%) · 저장소 안의 `tools/scan667b.py`(흰 잉크):
       ref 잉크 폭(환산) 카드1 «1,500» 88.7 · «10,000» **86.6** / 카드2 «1,500» 86.6 · «16,000» **96.9**
       우리 수리 전            «1,500» 88(맞다) · «10,000» **110** · «16,000» **111**
       우리 수리 후            «1,500» 88 (무변경) · «10,000» **88** · «16,000** 88
     ⇒ 다섯 자리는 배율 1(무변경) · 여섯 자리만 등방 축소. 목표 `PV_QTY_ADV = 90` 은 ref 네 표본의
     중앙값(87.65)에 side bearing 몫을 더한 값이고, 손으로 «여섯 자리면 0.8» 을 적지 않았다 —
     `pvFitQty()` 가 **그린 뒤 재서** 넘는 만큼만 줄인다(문자열은 199 가 언제든 바꾼다).
     ⚑ **이관(833 9회차 · 333 처방) — 목표가 «한 값» 에서 «형마다 두 값» 이 됐다.**
     8회차 채점 2인 일치 2번(DF «ref 16,000 은 −12%» · DG «네 표본 부호 전부 음수, 최악 −15.9%»)을
     `scan667b.py` 로 다시 재니 **빨간 것은 불릿형 여섯 자리 하나뿐**이고 배너형 둘은 Δ−1.7~+1.4 로
     맞아 있었다(ref 88.7 / 86.6 / 86.6 / **96.9** ↔ 우리 87 / 88 / 87 / **88**).
     상한을 통째로 ref 최대(97)로 올리면 맞아 있던 배너형 «10,000» 이 +12% 틀어지므로,
     이 화면이 다섯 번 증명한 «형마다 두 값» 법칙대로 **배너 90(무변경) · 불릿 99** 로 갈랐다. */
  const QADVT = { ban: 90, bl: 99 };
  for (const c of cards) {
    const QADV = QADVT[c.ban ? 'ban' : 'bl'];
    for (const r of c.rbs) {
      if (!r) continue;
      const k = parseFloat(r.uq);
      ok(r.uAdv <= QADV + 0.6,
        `[11-a] ${c.id}(${c.ban ? '배너' : '불릿'}형) «${r.uTxt}» 변환 뒤 advance ≤ ${QADV}`, `${p2(r.uAdv)}`);
      /* ⚠ 가르는 자는 **자릿수가 아니라 advance** 다 — 「5,000」 은 네 자리인데도 97.14 로 넘고
         「750」 은 64.59 로 안 넘는다(글리프 폭이 자마다 다르다). 자릿수로 갈랐다가 이 자리에서
         빨개졌고, 그것이 «손 상수로 여섯 자리면 0.8» 이 왜 오답인지의 실물 증거다. */
      const adv0 = r.uAdv / k;
      if (adv0 <= QADV + 0.6) {
        ok(k === 1, `[11-b] ${c.id} «${r.uTxt}» 는 목표 폭 안(${p2(adv0)}) ⇒ 배율 1 = **무변경**`, r.uq);
      } else {
        ok(k < 1 && Math.abs(r.uAdv - QADV) < 0.6,
          `[11-c] ${c.id} «${r.uTxt}» 는 목표를 넘어(${p2(adv0)}) 줄었다 — 배율 ${r.uq}`, `${p2(r.uAdv)}`);
      }
      ok(r.uAdv <= r.uBoxW,
        `[11-d] ${c.id} «${r.uTxt}» 는 상자(139) 안 — 667 [G3] «넘치면 가운데 정렬이 죽는다» 유지`,
        `${p2(r.uAdv)} ≤ ${r.uBoxW}`);
      ok(Math.abs(r.uInkCx - (r.b.x + r.b.w / 2)) < 1.5,
        `[11-e] ${c.id} «${r.uTxt}» 잉크 중심 = 금색 판 중심 (667 [G4] — 등방이라 중심이 안 움직인다)`,
        `${p2(r.uInkCx - (r.b.x + r.b.w / 2))}`);
    }
  }
  /* ⚑ [11-f] 가 «손 상수가 아니다» 를 못박는다 — 문자열을 최장으로 갈아 끼우고 자를 다시 부르면
     배율이 **그 문자열에 맞게 다시** 나온다(적어 둔 수를 읽는 게 아니라 재는 것이다). */
  /* 833 9회차 — 형마다 상한이 다르므로 **두 형에서 각각** 갈아 끼워 본다(한 형만 보면
     «형별» 이 실제로 서는지 못 본다 — 그 항이 [11-g] 다). */
  const fit = await page.evaluate(() => {
    const one = (sel) => {
      const u = document.querySelector(sel), old = u.textContent;
      u.textContent = '999,999';
      pvFitQty(document.getElementById('shopList'));
      const rg = document.createRange(); rg.selectNodeContents(u);
      const out = { uq: getComputedStyle(u).getPropertyValue('--uq').trim(),
        adv: +rg.getBoundingClientRect().width.toFixed(2) };
      u.textContent = old; pvFitQty(document.getElementById('shopList'));
      return out;
    };
    return { ban: one('.pvc.ban1>.rb2>u'), bl: one('.pvc:not(.ban1)>.rb2>u') };
  });
  ok(Math.abs(fit.ban.adv - QADVT.ban) < 0.6,
    '[11-f] 배너형은 «999,999» 로 갈아도 자가 다시 재서 90 에 맞춘다 (손 상수가 아니라는 증거)',
    `배율 ${fit.ban.uq} · advance ${p2(fit.ban.adv)}`);
  ok(Math.abs(fit.bl.adv - QADVT.bl) < 0.6,
    '[11-g] 같은 문자열이 불릿형에서는 99 에 맞는다 — **상한이 형마다 두 값**이라는 증거 (9회차 신설)',
    `배율 ${fit.bl.uq} · advance ${p2(fit.bl.adv)}`);

  blk('§5 9:13.3(1600) — 카드 안 기하가 같다');
  const { page: p16, errs: e16 } = await open(browser, 1600);
  const c16 = await p16.evaluate(DUMP);
  const sig = (cs) => cs.map(c => [c.id, c.bdg.w, c.bdg.h, c.hdb.h, c.pil.h, c.pil.y - c.card.y,
    ...c.rbs.map(r => r && r.utop),
    /* 833 3회차 편입 — 리본2 우단·탭 라벨도 두 프레임에서 같아야 한다 */
    ...c.rbs.map(r => r && p2(r.rb.x + r.rb.w - c.card.x)), c.sttITop].join(',')).join('|');
  ok(sig(c16) === sig(cards), '[5-a] 두 프레임 서명 동일',
    sig(cards) === sig(c16) ? '동일' : `${sig(cards)} ↔ ${sig(c16)}`);
  ok(e16.length === 0, '[5-b] 1600 콘솔 에러 0건', String(e16.length));
  await p16.context().close();

  blk('§12 우변 노치 «깊이» — ref 자신이 형마다 두 값이다 (6회차 2인 일치 2번)');
  /* 6회차 DD «깊이 31.0 ↔ ref 33.0 = −6.1%» · DE «30 ↔ 33.0 = −9.1%». 두 사람의 마스크가
     «배경색이 아닌 최우측 화소» 로 같았고, 저장소 안의 `tools/scan667.py` 가 **같은 정의**로 잰다:
       ref 파랑(배너형) 28.9 / 30.9 / 30.9  (평균 30.2)
       ref 초록(불릿형) 33.0 / 33.0 / 33.0
       우리 수리 전     배너 30 · 불릿 **30**   ⇒ 틀린 것은 불릿형 한 형뿐이었다
       우리 수리 후     배너 30 (무변경) · 불릿 **33**
     ⚑ 7회차 주석이 이미 «ref 배너 30.9 ↔ 불릿 33.0» 을 적어 두고 **길이만** 갈랐다 —
     이 절은 그 나머지 절반(«깊이도 두 값») 이 다시 한 값으로 접히면 빨개진다. */
  const NDEP = { ban: 40, bl: 43 }, NRING = 10, NRIM = 12;
  for (const c of cards) {
    const k = c.ban ? 'ban' : 'bl', t = c.ban ? '배너' : '불릿';
    const refDep = c.ban ? 30.2 : 33.0;
    ok(Math.abs(c.ntcD - NDEP[k]) < 0.6,
      `[12-a] ${t}(${c.id}) «--ntc-d» = ${NDEP[k]}  ⇒ 보이는 깊이 ${NDEP[k] - NRING} (ref ${refDep})`,
      String(c.ntcD));
    ok(c.ntc.length > 0 && c.ntc.every(n => Math.abs(n.sW - 2 * NDEP[k]) < 1),
      `[12-b] ${t}(${c.id}) 링 «s» 실측 가로 = ${2 * NDEP[k]} (선언이 아니라 그려진 값)`,
      c.ntc.map(n => n.sW).join('/'));
    /* 짝 항 — 세 폭이 한 값에서 파생되지 않으면(손으로 따로 적으면) 여기가 빨개진다. */
    ok(c.ntc.every(n => Math.abs(n.w - (c.ntcD + NRIM)) < 1
      && Math.abs(n.uW - 2 * (c.ntcD + NRIM)) < 1 && Math.abs(n.sW - 2 * c.ntcD) < 1),
      `[12-c] ${t}(${c.id}) 상자 = d+${NRIM} · «s» = 2d · «u» = 2(d+${NRIM}) — 셋이 «--ntc-d» 파생`,
      c.ntc.map(n => `${n.w}/${n.sW}/${n.uW}`).join(' '));
    ok(c.ntc.every(n => Math.abs(n.sBorder - NRING) < 0.6),
      `[12-d] ${t}(${c.id}) 링 두께 ${NRING} 불변 — 보이는 깊이는 «반지름 − 이 두께» 다`,
      c.ntc.map(n => n.sBorder).join('/'));
  }
  const banD = cards.filter(c => c.ban).map(c => c.ntcD);
  const blD = cards.filter(c => !c.ban).map(c => c.ntcD);
  ok(banD.length > 0 && blD.length > 0 && blD.every(v => v - banD[0] > 2),
    '[12-e] 두 형의 깊이가 **다르다** — 한 값으로 접히면 빨강 (ref 30.2 ↔ 33.0 을 한 값으로 못 맞춘다)',
    `배너 ${banD.join('/')} ↔ 불릿 ${blD.join('/')}`);
  ok(blD.every((v, i) => v === blD[0]),
    '[12-f] 같은 형끼리는 한 값 — 카드2·3 이 갈리면 빨강', blD.join('/'));

  blk('§13 리본 라벨 «가로만» 넓힌다 — 높이는 이미 맞다 (비평가 넷 독립 −3.5%)');
  /* `scan833b.py riblabel()` 이 이번 회차에 신설된 자다. 문턱 (190,190,170)·(205,205,150) 에서 수렴:
       배너 리본1 ref 187.7 ↔ 수리 전 181.0(−3.6%) → 수리 후 **187.0**(−0.4%)
       배너 리본2 ref 251.7 ↔ 수리 전 243.0(−3.4%) → 수리 후 **251.0**(−0.3%)
       불릿 리본2 ref 251.7 ↔ 수리 전 243.0(−3.4%) → 수리 후 **251.0**(−0.3%)
     잉크 **높이**는 ref 26.8 ↔ 우리 27.0 으로 수리 전후 **불변**(+0.7%) — 그래서 font-size 가 아니다.
     ⚠ 불릿 리본1 은 **ref 자신의 문자열이 달라서**(ref 파랑 187.7 ↔ 초록 220.7) 비교가 안 선다 —
     리본2 는 ref 두 장이 251.7 로 같다. 이 절은 «가로만·한 배율·스코프 짝» 셋을 지킨다. */
  const LSX = 1.035;
  for (const c of cards) {
    for (const r of c.rbs) {
      if (!r || !r.lab) continue;
      const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(r.lab.tr) || [];
      const sx = parseFloat(m[1]), sy = parseFloat(m[4]);
      ok(Math.abs(sx - LSX) < 0.002 && Math.abs(sy - 1) < 0.002,
        `[13-a] ${c.id} «${r.lab.txt}» 가로만 ${LSX} 배 — 세로는 1 (높이는 이미 ref 와 +0.7%)`,
        r.lab.tr);
      /* ⚑ 이 항이 8회차에 실제로 사람을 속인 자리다 — 선언은 «0 50%» 인데 computed 는 가운데였다. */
      ok(/^0px /.test(r.lab.org),
        `[13-b] ${c.id} 원점이 **왼쪽**이다 — «#shopw i» 스코프 짝이 살아 있는가 (computed)`,
        r.lab.org);
      ok(Math.abs(r.lab.fs - 34) < 0.6,
        `[13-c] ${c.id} font-size 34 불변 — 크기를 올려 폭을 맞추면 맞아 있던 높이가 깨진다`,
        String(r.lab.fs));
    }
  }
  const sxs = cards.flatMap(c => c.rbs.filter(r => r && r.lab).map(r => r.lab.tr));
  ok(sxs.length >= 4 && sxs.every(t => t === sxs[0]),
    '[13-d] 네 리본이 **한 배율**을 쓴다 — 줄마다 손으로 다른 값을 적으면 빨강', String(sxs.length) + '줄');
  /* 라벨 왼끝은 «안 건드린 것» 이 증거다 — 가운데 원점으로 늘리면 여기가 −3.5 밀린다(8회차 실측). */
  const ls = cards.flatMap(c => c.rbs.filter(r => r && r.lab).map(r => r.lab.l));
  ok(ls.every(v => Math.abs(v - ls[0]) < 1.6),
    '[13-e] 라벨 상자 왼끝이 네 줄 같은 자리 — `.rb` 의 padding-left 가 정하는 앵커를 안 건드렸다',
    ls.map(v => v.toFixed(1)).join('/'));

  blk('§14 배너 카드 일러스트가 머리띠를 덮는 것은 «유령» 이다 — 667 6회차가 ref 로 정한 자리다');
  /* 6회차 DE [A]«카드1 아트 패널이 헤더 밴드를 덮는다 — 카드2·3 은 패널 상변이 135 인데 카드1 만 10
     ⇒ 제목 띠가 카드 폭의 55.8% 에서 끊긴다» (신뢰 중 · 1인). 근거는 «우리 카드끼리 안 맞는다» 였는데,
     이 화면은 **ref 자신이 형마다 두 값인 축이 넷**이다(피치·앵커·길이·깊이 — §12). 일러스트도 그중 하나다:
     667 6회차가 비평 AX·AY **2인 일치**로 «ref 파랑의 대응물은 가로 라운드 사각이 아니라 **45° 마름모
     글로우**이고 헤더 밴드까지 덮고 올라간다» 를 확인했고, 세로 하변을 자 셋이 겹쳐 쟀다
     (AX 369.5 · AY 367.2 · 자체 프로파일 366) ⇒ `--art-t 78 → 10` · `height 239 → 357`.
     ⇒ 이 절은 그 값을 **굳혀서** 다음 회차가 «맞은 것을 고치는» 일을 막는다(§4 와 같은 꼴). */
  for (const c of cards) {
    if (c.ban) {
      ok(Math.abs(c.art.top - 10) < 0.6 && Math.abs(c.art.h - 357) < 1,
        `[14-a] 배너(${c.id}) 일러스트 자리는 --art-t 10 · 높이 357 (667 6회차 · 2인 일치 + 자 셋)`,
        `${c.art.top} / ${c.art.h}`);
      ok(c.art.t < c.hdbBot,
        `[14-b] 그래서 배너 일러스트는 머리띠(하변 ${c.hdbBot})를 **덮는 것이 옳다** — 되돌리면 ref 세로의 60% 로 돌아간다`,
        `상변 ${c.art.t}`);
    } else {
      /* 885 1회차 이관 — 세로 두 값을 3자 실측으로 옮겼다(t 135→142 · h 303→281 · `verify667` [F5] 와 한 값). */
      ok(Math.abs(c.art.top - 142) < 0.6 && Math.abs(c.art.h - 281) < 1,
        `[14-c] 불릿(${c.id}) 일러스트 자리는 --art-t 142 · 높이 281 — 배너와 **같은 값으로 접으면 빨강**`,
        `${c.art.top} / ${c.art.h}`);
      ok(c.art.t >= c.hdbBot,
        `[14-d] 불릿 일러스트는 머리띠(하변 ${c.hdbBot}) **아래**다 — 두 형의 규칙이 서로 다르다`,
        `상변 ${c.art.t}`);
    }
  }

  blk('§15 노치 밝은 림이 카드 우변의 «검정 외곽선» 을 안 밟는다 (9회차 채점 DH 1순위)');
  /* DH «우변 외곽선이 노치마다 11~12px 씩 끊긴다(신뢰 상 · 두 프레임에서 행 목록까지 재현)» —
     ①(요소 배치)을 7 로 막은 유일한 항목이다. 1인 지적이라 338 규칙대로 재현부터 했고
     (`tools/probe833.js` — 순검정 마스크 max<25 의 «검정 없는 행» 구간), 사실이었다:
       수리 전 노치 자리 끊김 **9~10구간** ↔ 수리 후 **0구간**(남는 구간은 탭·배지가 덮는 자리로
       **ref 도 끊긴다** — 자가 장식 상자로 그 둘을 갈라 센다).
     뿌리는 밝은 림(`u`)이 타원 테라 **위·아래 꼭지에서 가로 띠**가 되어 카드 우변(= 타원 중심)의
     검정 열을 덮는 것이고, `.ntc{z-index:2}` 가 `.fr` 위라 조용히 이긴다.
     ⇒ 림만 카드 우변 10px 안쪽에서 자른다(`clip-path`). 이 절은 그 «자른 자리» 를 DOM 으로 잰다
     (화소 증거는 probe833 이 든다 — 두 자가 같은 것을 서로 다른 방법으로 본다). */
  const rim = await page.evaluate(() => {
    const c = document.querySelector('.pvc.ban1'), cb = c.getBoundingClientRect();
    const u = c.querySelector('.ntc>u'), ub = u.getBoundingClientRect();
    const cp = getComputedStyle(u).clipPath;
    /* ⚠ computed 값이 `calc(50% + 10px)` 그대로 남는다(브라우저가 안 푼다) — 두 꼴을 다 받는다.
       % 는 **상자 폭 기준**이라 여기서 푼다(50% = 상자 폭의 절반 = 카드 우변). */
    let right = null;
    const mPx = cp.match(/inset\(\s*[\d.]+px\s+([\d.]+)px/);
    const mCa = cp.match(/inset\(\s*[\d.]+px\s+calc\(\s*([\d.]+)%\s*\+\s*([\d.]+)px/);
    if (mPx) right = +mPx[1];
    else if (mCa) right = ub.width * (+mCa[1]) / 100 + (+mCa[2]);
    return { cp, right, uL: ub.left - cb.left, uW: ub.width,
      cardW: cb.width, frBorder: parseFloat(getComputedStyle(c.querySelector('.fr')).borderRightWidth) };
  });
  ok(rim.right !== null, '[15-a] 밝은 림에 clip-path 가 선언돼 있다', rim.cp);
  if (rim.right !== null) {
    /* 잘린 뒤 림의 오른쪽 끝(카드-로컬) = 림 상자 좌단 + 폭 − inset-right */
    const cut = rim.uL + rim.uW - rim.right;
    ok(cut <= rim.cardW - rim.frBorder + 0.5,
      `[15-b] 잘린 림의 오른쪽 끝이 검정 열(카드 우변 −${rim.frBorder}) 왼쪽이다 — 림은 검정 «안쪽» 부품이다`,
      `${p2(cut)} ≤ ${p2(rim.cardW - rim.frBorder)}`);
    ok(Math.abs(cut - (rim.cardW - rim.frBorder)) < 1.5,
      '[15-c] 그러면서도 검정 열에 **딱 붙는다** — 더 자르면 림과 곧은 림 사이가 벌어진다',
      `${p2(cut)} ↔ ${p2(rim.cardW - rim.frBorder)}`);
  }

  blk('§16 ★ 불릿은 «금색 별 + 거리장 링» 두 겹 폴리곤이다 — 마이터 창이 안 뻗는다 (885 7회차 · 6회차 채점 2인 일치)');
  /* ⚑ 6회차까지 이 절은 «원반 팽창 text-shadow 링» 의 선언을 지켰다. 7회차가 그 자리를 **이관한다**(333 처방) —
     6회차 채점 2인(EX·EY)이 «획 두께는 맞다»([41])로 모으고 결손을 **«별이 뾰족한 것»** 으로 갈랐기 때문이다
     (안/바깥 반지름비 ref 0.591 ↔ 우리 0.420 · 등주비 Q ref 0.4605 ↔ 우리 0.2993 · 금색 면적 −40%).
     ★ 가 **서체 글리프**인 한 r/R 은 값이 아니므로 두 겹 **폴리곤**으로 옮겼고, 링도 글리프 전용 text-shadow 에서
     **거리장 오프셋 폴리곤**(`tools/starpoly885.py` — 볼록 꼭짓점 호 · 오목 꼭짓점 교점)으로 옮겼다.
     ⚑ **지키는 것은 6회차와 같은 셋이다. 자리를 비우지 않았다:**
       ⓐ 마이터 획이 **없다** — 이제 «링이 금색에서 d 보다 멀리 안 뻗는다» 로 잰다(옛 [16-b] 의 뜻).
       ⓑ 링이 **등방**(356 규약)이고 두께가 **3.1** — 옛 [16-d]·[16-e] 의 뜻 그대로, 잣대만 폴리곤이다.
       ⓒ 표본이 **16 이상**이고 이웃 사이가 1.3px 미만 — 옛 [16-c]·[16-g].
     ⚠ 화소 과녁(«실루엣 ÷ 금색» = ref 1.176/1.231)은 여전히 `scan885e.py` 가 소유한다.
     ⚠ 별의 **형**(r/R = 0.668)은 아래 [16-h] 가 지킨다 — 7회차 채점 2인(EZ·FA)이 각자 다른 자로 낸 값이고
     둘 다 레벨 사다리 5단에서 부호가 안 뒤집혔다(6회차 EY 의 0.591 은 1인 값이라 이 회차 안에서 옮겼다). */
  const star = await page.evaluate(() => {
    const s = document.querySelector('.pvc>.pvl>.pvb>s');
    if (!s) return null;
    const cs = getComputedStyle(s);
    const num = v => parseFloat(v) || 0;
    const poly = (cp, w, h, ox, oy) => {
      const m = /polygon\(([^)]*)\)/.exec(cp || '');
      if (!m) return [];
      return m[1].split(',').map(pt => {
        const [a, b] = pt.trim().split(/\s+/);
        const f = (v, size) => (String(v).endsWith('%') ? parseFloat(v) / 100 * size : parseFloat(v));
        return { x: ox + f(a, w), y: oy + f(b, h) };
      });
    };
    const cb = getComputedStyle(s, '::before'), ca = getComputedStyle(s, '::after');
    const sw = num(cs.width), sh = num(cs.height);
    const bw = num(cb.width) || sw, bh = num(cb.height) || sh;
    const aw = num(ca.width), ah = num(ca.height);
    return {
      stroke: parseFloat(cs.webkitTextStrokeWidth) || 0,
      shadow: (cs.textShadow || 'none'),
      fs: num(cs.fontSize), txt: s.textContent.trim(),
      ring: poly(cb.clipPath, bw, bh, num(cb.left), num(cb.top)),
      gold: poly(ca.clipPath, aw, ah, num(ca.left), num(ca.top)),
      gw: aw, gh: ah, sw, sh,
      filt: (cb.filter || 'none') + '|' + (ca.filter || 'none'),
    };
  });
  ok(!!star && star.txt === '★', '[16-a] ★ 불릿 표본을 잡았다', star ? star.txt : '없음');
  if (star) {
    /* 링 점마다 «금색 별 윤곽까지의 최단 거리» — 이것이 곧 링 두께다(중심도 방향도 안 고른다). */
    const dseg = (px, py, ax, ay, bx, by) => {
      const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / L2));
      return Math.hypot(px - (ax + t * ex), py - (ay + t * ey));
    };
    const G = star.gold, R = star.ring;
    const dists = R.map(p => Math.min(...G.map((g, i) => {
      const q = G[(i + 1) % G.length];
      return dseg(p.x, p.y, g.x, g.y, q.x, q.y);
    })));
    const dmin = dists.length ? Math.min(...dists) : NaN;
    const dmax = dists.length ? Math.max(...dists) : NaN;
    ok(star.stroke < 0.01 && star.shadow === 'none' && star.fs < 0.01,
      '[16-b] 글리프가 **한 획도 안 그려진다** — text-stroke 0 · text-shadow 없음 · font-size 0 (그림은 폴리곤 두 겹뿐)',
      `${p2(star.stroke)}px · ${star.shadow} · ${p2(star.fs)}px`);
    ok(R.length >= 16 && G.length === 10,
      '[16-c] 링 표본이 **16 이상**이고 금색은 5각 별(10점) — 적으면 꼭짓점에 톱니 구멍이 생겨 «원반» 이 아니다',
      `링 ${R.length}점 · 금색 ${G.length}점`);
    ok(dists.length > 0 && dmax - dmin < 0.05,
      '[16-d] 링 두께가 **한 값** = 등방이다 (356 규약 — 별을 «확대» 하면 반지름에 비례해 두꺼워져 여기서 갈린다)',
      `${p2(dmin)} ~ ${p2(dmax)}`);
    ok(dists.length > 0 && Math.abs(dmax - 3.1) < 0.15,
      '[16-e] 링 두께 3.1 — **ref 링/변 실측 그대로다**(1.50 ref-px × K = 3.09 · 6회차 §16 승계)',
      p2(dmax));
    ok(star.filt === 'none|none',
      '[16-f] 흐림·필터 0 — 흐리면 링이 «두께» 가 아니라 «그림자» 가 되어 자가 못 잰다', star.filt);
    let arc = 0;
    for (let i = 0; i < R.length; i++) {
      const a = R[i], b = R[(i + 1) % R.length];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (seg < 2.0) arc = Math.max(arc, seg);      /* 곧은 «변» 은 빼고 «호» 구간만 본다 */
    }
    ok(arc > 0 && arc < 1.3,
      '[16-g] 이웃 호 길이 < 1.3px — 그래야 꼭짓점의 둥근 조인이 화소보다 촘촘하다', `${p2(arc)}px`);
    /* ⚑ 7회차 신설 — 별의 «형». 6회차 채점 2인이 값까지 적은 축이라 선언으로 못박는다.
       금색 폴리곤의 짝수 점은 바깥 꼭짓점 · 홀수 점은 안 꼭짓점이므로 반지름비가 곧 r/R 이다. */
    if (G.length === 10) {
      const cx = G.reduce((s2, p) => s2 + p.x, 0) / 10, cy = G.reduce((s2, p) => s2 + p.y, 0) / 10;
      const rad = G.map(p => Math.hypot(p.x - cx, p.y - cy));
      const Ro = (rad[0] + rad[2] + rad[4] + rad[6] + rad[8]) / 5;
      const ri = (rad[1] + rad[3] + rad[5] + rad[7] + rad[9]) / 5;
      ok(Math.abs(ri / Ro - 0.668) < 0.01,
        '[16-h] 안/바깥 반지름비 = **0.668** (7회차 채점 2인 EZ 0.6679 · FA 0.670 의 ref 실측 · 수리 전 글리프는 0.420·0.423 이었다)',
        p2(ri / Ro));
      ok(Math.abs(star.gw - 34.90) < 0.5 && Math.abs(star.gh - 33.20) < 0.5,
        '[16-i] 금색 상자 34.90 × 33.20 — [34]«★ bbox 는 맞다» 를 형을 바꾸면서도 지켰다 (ref 35.1 × 33.0)',
        `${p2(star.gw)} × ${p2(star.gh)}`);
    }
  }

  blk('§17 리본 크림 캡의 «크림/빨강 경계» 는 기울어 있다 (885 6회차 · 5회차 채점 2인 일치 2순위)');
  /* ⚑ 338 규칙대로 처방 전에 재현했고 **등재문(«캡 폭 −14%»)의 축을 정정했다** — 같은 자로
     ref 네 리본을 전부 재니 **중간 높이 폭은 이미 Δ0.00** 이다(ref 중 10.67 ref px × K = 22.00 ↔ 우리 22.00).
     EV 의 −14% 는 ref 를 중간보다 «위» 에서 잰 값이고(12.46 ref px = 25.7 우리px), 잔차의 전부가 기울기였다:
       ref  위 25.42 · 중 22.00 · 아래 17.53 (기울기 7.89)   ↔   수리 전 우리 21.4 / 22.0 / 21.4 (기울기 **0.00**)
       수리 후 우리 25.23 / 21.67 / 17.23 (기울기 8.00)  ⇒ 세 자리 전부 Δ ≤ 0.34
     ⇒ 손잡이는 «폭» 이 아니라 **clip 으로 아래를 깎는 것**이고, 중간 폭 22.0 을 붙박는 항등식이
     `width − clip/2 = 22.0` 이다(27.10 − 5.10 = 22.00). 이 절이 그 항등식을 지킨다 —
     둘 중 하나만 손대면 5회차까지 맞아 있던 중간 폭이 조용히 깨진다.
     ⚠ **좌단은 이 절이 안 건드린다** — 자에 따라 갈리는 자리로 896 에 등재돼 있다. */
  const caps = await page.evaluate(() => [...document.querySelectorAll('.pvc>.rb')].map((rb) => {
    const cs = getComputedStyle(rb, '::before');
    const nums = [...(cs.clipPath || '').matchAll(/(-?[\d.]+)px/g)].map(m => +m[1]);
    return { w: parseFloat(cs.width), clip: cs.clipPath || '', nums,
      cls: rb.className, left: parseFloat(cs.left) };
  }));
  ok(caps.length >= 4, '[17-a] 리본 캡 표본 4개 이상', `${caps.length}개`);
  for (const c of caps) {
    /* clip 은 polygon(0 0, 100% 0, calc(100% − Npx) 100%, 0 100%) — 유일한 px 값이 기울기다. */
    const slant = c.nums.length ? Math.max(...c.nums) : 0;
    ok(/polygon/.test(c.clip) && Math.abs(slant - 10.2) < 0.15,
      `[17-b] ${c.cls} 아래에서 깎는 폭 = 10.20 (ref 기울기 7.89 ↔ 우리 8.00 을 주는 값)`,
      `${p2(slant)} · ${c.clip.slice(0, 60)}`);
    ok(Math.abs(c.w - 27.1) < 0.15,
      `[17-c] ${c.cls} 캡 상자 폭 = 27.10`, `${p2(c.w)}px`);
    ok(Math.abs((c.w - slant / 2) - 22.0) < 0.2,
      `[17-d] ${c.cls} **중간 높이 폭 = 22.00** — ref 중 10.67 ref px × K 와 Δ0.00 인 닫힌 값 (width − clip/2)`,
      `${p2(c.w)} − ${p2(slant / 2)} = ${p2(c.w - slant / 2)}`);
  }
  const slants = caps.map(c => (c.nums.length ? Math.max(...c.nums) : 0));
  ok(slants.every(v => Math.abs(v - slants[0]) < 0.01),
    '[17-e] 네 리본이 **한 값**을 쓴다 — 줄마다 손으로 다른 기울기를 적으면 빨강',
    slants.map(p2).join('/'));
  ok(caps.every(c => Math.abs(c.left - caps[0].left) < 0.01),
    '[17-f] 좌단도 네 줄 한 값 — 이 절이 좌단을 **안 건드렸다**는 증거 (896 자 갈림 자리)',
    caps.map(c => p2(c.left)).join('/'));

  blk('§R 되돌림 시험 — 수리 전 값을 넣으면 빨개진다');
  /* ⚑ 5회차 이관 — 되돌림 표본을 **178×178** 에서 **172×184**(4회차 상자)로 갈았다.
     178×178 은 이제 종횡이 1.006 이라 새 ref(1.000)와 «같은» 쪽이라 [R2] 가 아무것도 안 잡는다 —
     이번 회차가 실제로 바꾼 것은 172×184 이므로 그것을 되돌려야 §1 이 빨개진다.
     ⚠ 크기 항([R1])은 두 표본 다 잡지만, **종횡 항([R2])은 172×184 만** 잡는다(0.936 ↔ ref 1.000). */
  await page.addStyleTag({ content:
    '.pvc>.bdg{left:824px!important;top:-38.5px!important;width:172px!important;height:184px!important}'
    + '.pvc.ban1>.rb>u{top:52px!important}'
    + '.pvc>.pil{top:-54px!important;height:68px!important}' });
  await page.waitForTimeout(120);
  const back = await page.evaluate(DUMP);
  const b0 = back[0];
  const inkW0 = b0.bdg.w - 2 * b0.bdgBorder, inkH0 = b0.bdg.h - (2 * b0.bdgBorder + 1);
  ok(Math.abs(inkW0 - refW) > 3 || Math.abs(inkH0 - refH) > 3,
    '[R1] 상자를 172×184(4회차 판)로 되돌리면 §1 이 빨개진다', `${p2(inkW0)}×${p2(inkH0)}`);
  ok(Math.abs(inkW0 / inkH0 - refAsp) > 0.02,
    '[R2] 그 상태의 종횡(0.936)은 ref 1.000 밖 — 5회차가 고친 것이 «크기» 만이 아님을 못박는다',
    `${p2(inkW0 / inkH0)}`);
  /* ⚑ 5회차 신설 [R18] — **잉크 윗변도 같이 되돌아간다**. 판이 위로도 자란 것이 [1-d] 의 몫이라
     크기만 맞추고 자리를 안 옮기는 «절반 수리» 는 이 항이 잡는다. */
  ok(Math.abs((b0.bdg.y + b0.bdgBorder + 0.5 - b0.card.y) - (-38.2)) > 2,
    '[R18] 그 상태의 잉크 윗변은 ref −38.2 밖 (4회차 판은 −32)',
    `${p2(b0.bdg.y + b0.bdgBorder + 0.5 - b0.card.y)}`);
  ok(back.find(c => c.ban).rbs[0].utop === 52,
    '[R3] 배너형 수량을 52 로 되돌리면 [3-a] 가 빨개진다', '52');
  const pb = back[0];
  ok(Math.abs(pb.pil.h - 65.5) >= 0.6 && Math.abs(pb.card.y - pb.pil.y - 51.5) >= 0.6,
    '[R4] 알약을 68/−54 로 되돌리면 §6 이 빨개진다',
    `h ${p2(pb.pil.h)} · 솟음 ${p2(pb.card.y - pb.pil.y)}`);
  ok(Math.abs(pb.pil.y + pb.pil.h - pb.card.y - 14) < 0.6,
    '[R4b] 그때도 **하변은 14 로 같다** — 이번 수리가 «아래를 안 건드렸다» 는 증거',
    `${p2(pb.pil.y + pb.pil.h - pb.card.y)}`);
  /* 3회차 두 수리의 되돌림 짝 — 둘 다 CSS 로는 못 되돌린다(리본 폭은 인라인 style 이고
     `--gx` 는 그 폭에 매여 있다) ⇒ 인라인 값을 직접 되돌려 넣는다. */
  const back3 = await page.evaluate(() => {
    document.querySelectorAll('.pvc').forEach((c) => {
      const ban = c.classList.contains('ban1');
      const r2 = c.querySelector('.rb2');
      r2.style.width = (ban ? 521 : 526) + 'px';          // 833 3회차 전
      r2.style.setProperty('--gx', (ban ? 34 : 23) + 'px');
      c.querySelector('.stt>i').style.top = '9px';
    });
    const A = document.getElementById('app').getBoundingClientRect();
    const B = e => { const r = e.getBoundingClientRect();
      return { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height }; };
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const cr = B(c), r2 = c.querySelector('.rb2');
      return { ban: c.classList.contains('ban1'),
        rbR: +(B(r2).x + B(r2).w - cr.x).toFixed(2),
        bCx: +(B(r2.querySelector('b')).x + B(r2.querySelector('b')).w / 2 - cr.x).toFixed(2),
        iTop: +getComputedStyle(c.querySelector('.stt>i')).top.replace('px', '') };
    });
  });
  ok(back3.every(c => Math.abs(c.rbR - 530) > 1),
    '[R5] 리본2 폭을 521/526 으로 되돌리면 §7 [7-a] 가 빨개진다',
    back3.map(c => c.rbR).join(' / '));
  ok(back3.every(c => Math.abs(c.bCx - (c.ban ? 441.5 : 451.5)) < 1.5),
    '[R5b] 그때도 **판 중심은 같다** — 3회차가 판을 «`--gx` 로 붙박았다» 는 증거(움직인 것은 우단뿐)',
    back3.map(c => c.bCx).join(' / '));
  ok(back3.every(c => c.iTop === 9),
    '[R6] 탭 라벨을 top:9 로 되돌리면 §8 [8-a] 가 빨개진다', back3.map(c => c.iTop).join(' / '));
  /* 885 3회차 짝 — 배지 글자 사이를 0 으로 되돌리면 §1-2 가 빨개진다.
     ⚑ «상수를 되돌렸다» 로 끝내지 않고 **advance 가 실제로 줄어드는 것**까지 본다
     (R9 와 같은 꼴 — 선언만 보는 되돌림 시험은 «값이 바뀌었다» 만 말하고 «그림이 바뀌었다» 는 못 말한다).
     줄어드는 양은 «글자 수 × 2.9» 다(윗줄 5자 = 14.5) — 배율이었다면 문자열 길이와 무관했을 자리라
     이 항 자체가 «손잡이가 letter-spacing 이다» 의 증거이기도 하다. */
  const backB = await page.evaluate(() => {
    const adv = () => [...document.querySelectorAll('.pvc')].map((c) => {
      const e = c.querySelector('.bdg>i'); const rg = document.createRange();
      rg.selectNodeContents(e);
      return { n: e.textContent.length, w: +rg.getBoundingClientRect().width.toFixed(2),
        ls: parseFloat(getComputedStyle(e).letterSpacing) || 0 };
    });
    const now = adv();
    const st = document.createElement('style');
    st.textContent = '.pvc>.bdg{--bdg-ls:0px}';                 /* 885 3회차 전 */
    document.head.appendChild(st);
    const back = adv();
    st.remove();
    return now.map((v, i) => ({ n: v.n, nowAdv: v.w, ls: back[i].ls, backAdv: back[i].w }));
  });
  ok(backB.every(b => b.ls === 0),
    '[R16] 배지 글자 사이를 0 으로 되돌리면 §1-2 [1-g] 가 빨개진다', backB.map(b => p2(b.ls)).join(' / '));
  ok(backB.every(b => Math.abs((b.nowAdv - b.backAdv) - b.n * 5.2) <= 1.0),
    '[R16b] 그때 advance 가 **글자 수 × 5.2 만큼** 줄어든다 — 그림이 바뀐다는 증거이자 «배율이 아니라 글자 사이» 라는 증거',
    backB.map(b => `${b.n}자 ${p2(b.backAdv)} → ${p2(b.nowAdv)} (Δ${p2(b.nowAdv - b.backAdv)})`).join(' / '));
  const back5 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.pvc>.stt>i{transform:scaleX(.94)}';      /* 833 5회차 전 */
    document.head.appendChild(st);
    return [...document.querySelectorAll('.pvc')]
      .map(c => getComputedStyle(c.querySelector('.stt>i')).transform);
  });
  ok(back5.every(t => t !== 'none'),
    '[R8] 탭 라벨에 scaleX(.94) 를 되돌리면 §8 [8-f] 가 빨개진다', back5.join(' / '));
  /* 6회차 짝 — 배너 라벨의 배율을 지우면 §10 [10-a]·[10-e] 가 빨개진다.
     ⚑ «상수를 지웠다» 로 끝내지 않고 **advance 가 실제로 ref 밖으로 나가는 것**까지 본다. */
  const back6 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.pvc>.ban>i{transform:none!important}';       /* 833 6회차 전 */
    document.head.appendChild(st);
    const bi = document.querySelector('.pvc.ban1>.ban>i');
    const rg = document.createRange(); rg.selectNodeContents(bi);
    return { tr: getComputedStyle(bi).transform,
      adv: +rg.getBoundingClientRect().width.toFixed(2), boxW: +bi.offsetWidth.toFixed(2) };
  });
  ok(back6.tr === 'none' && Math.abs(back6.adv - 235.2) > 8,
    '[R9] 배너 라벨 배율을 지우면 §10 이 빨개진다 (advance 가 ref 235.2 밖으로 나간다)',
    `${back6.tr} · advance ${p2(back6.adv)}`);
  const back7 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc>.rb>u').forEach((u) => {
      u.style.setProperty('--uq', '1');                              /* 833 7회차 전 */
      const rg = document.createRange(); rg.selectNodeContents(u);
      out.push({ t: u.textContent, adv: +rg.getBoundingClientRect().width.toFixed(2) });
    });
    return out;
  });
  const long7 = back7.filter(q => q.t.replace(/[^0-9]/g, '').length > 4);
  ok(long7.length >= 2 && long7.every(q => q.adv > 96),
    '[R10] 수량 배율을 1 로 되돌리면 §11 [11-a] 가 빨개진다 (여섯 자리가 다시 97~114 로 나간다)',
    long7.map(q => q.t + ' ' + p2(q.adv)).join(' / '));
  await page.evaluate(() => pvFitQty(document.getElementById('shopList')));
  /* ⚑ 이관(833 9회차) — 이 항의 뜻(«배율은 넘침을 안 바꾼다 — 변환은 레이아웃 advance 를 안 건드린다»)은
     그대로고, 값만 상자 폭을 따라 바뀐다: 8회차까지는 상자 255 라 넘침 **+9.64** 였고,
     9회차가 상자를 283 으로 연 뒤로는 **−18.4(넘침 0)** 다. 배율을 지워도 그 부호가 안 바뀌는 것이
     여전히 «6회차가 고친 것은 넓음이지 넘침이 아니다» 의 증거다. */
  ok(back6.adv / 235.2 - 1 > 0.1 && back6.adv - back6.boxW < 0,
    '[R9b] 되돌린 폭은 ref 보다 +12.5% 인데 **넘침은 그대로 0** — 배율은 넘침을 안 바꾼다 (9회차 이관 · 옛 넘침 +9.64)',
    `+${p2((back6.adv / 235.2 - 1) * 100)}% · 넘침 ${p2(back6.adv - back6.boxW)}`);
  /* ⚑ [R7] 은 «값을 되돌리면 빨개진다» 가 아니라 **«스코프 짝을 빼면 조용히 진다»** 를 못박는다 —
     이번 수리에서 실제로 사람을 속인 것이 그것이다(선언은 남아 있는데 computed 만 바뀐다). */
  const back4 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '#shopw .pvc>.pvt>i{transform-origin:50% 50%}';   /* 스코프 짝을 무력화 */
    document.head.appendChild(st);
    const A = document.getElementById('app').getBoundingClientRect();
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const i = c.querySelector('.pvt>i');
      return { org: getComputedStyle(i).transformOrigin,
        l: +(i.getBoundingClientRect().left - c.getBoundingClientRect().left).toFixed(2) };
    });
  });
  ok(back4.every(c => !/^0px /.test(c.org)),
    '[R7] 스코프 짝을 되돌리면 §9 [9-c] 가 빨개진다 (원점이 중앙으로 돌아간다)',
    back4.map(c => c.org).join(' / '));
  ok(back4.every(c => c.l > 78.5),
    '[R7b] 그때 제목 상자가 실제로 **오른쪽으로 밀린다** — [9-c] 가 지키는 것이 이 4px 이다',
    back4.map(c => c.l).join(' / '));

  /* ⚑ [R11] — 깊이를 수리 전 «한 값 40» 으로 되돌리면 §12 가 빨개지는가.
     `--ntc-d` 한 곳만 되돌려도 상자·링 셋이 **같이** 40 계열로 돌아가야 한다(파생이 진짜라는 증거).
     되돌림은 CSS 로만 하고 제품은 안 건드린다 — 원복은 그 style 태그를 지우면 끝이다. */
  const back11 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'r11';
    st.textContent = '#shopw .pvc{--ntc-d:40px !important}';
    document.head.appendChild(st);
    return [...document.querySelectorAll('.pvc')].filter(c => !c.classList.contains('ban1')).map((c) => {
      const n = c.querySelector('.ntc');
      return { d: parseFloat(getComputedStyle(c).getPropertyValue('--ntc-d')),
        w: +n.getBoundingClientRect().width.toFixed(2),
        sW: +n.querySelector('s').getBoundingClientRect().width.toFixed(2),
        uW: +n.querySelector('u').getBoundingClientRect().width.toFixed(2) };
    });
  });
  ok(back11.length > 0 && back11.every(c => Math.abs(c.sW - 80) < 1),
    '[R11] 불릿 깊이를 40 으로 되돌리면 §12 [12-b] 가 빨개진다 (보이는 깊이가 33 → 30 으로 얕아진다)',
    back11.map(c => c.sW).join('/'));
  ok(back11.every(c => Math.abs(c.w - 52) < 1 && Math.abs(c.uW - 104) < 1),
    '[R11b] 그때 상자·밝은 림도 **같이** 되돌아간다 — 세 폭이 한 값 파생이라는 증거',
    back11.map(c => `${c.w}/${c.uW}`).join(' '));
  await page.evaluate(() => { const e = document.getElementById('r11'); if (e) e.remove(); });

  /* ⚑ [R17] 885 4회차 — **이 회차가 실제로 진 함정**을 못박는다.
     `.pvc>.bdg>i{transform-origin:…}` 만 적으면 `#shopw i,#shopw b,…{transform-origin:50% 50%}`(5926행)이
     **ID 급(1,0,1)** 으로 이겨서 선언이 한 픽셀도 안 먹는다 — 4회차가 선언을 넣고 캡처를 다시 재서야
     알았다(`getComputedStyle` 이 «86px 24px» 을 돌려줬다). [R12] 와 같은 꼴이고 자리만 다르다.
     ⇒ 스코프 짝을 무력화하면 **원점이 두 줄 각자의 가운데로 돌아가고 회전이 강체가 아니게 된다.** */
  const back17 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'r17';
    st.textContent = '#shopw .pvc>.bdg>i,#shopw .pvc>.bdg>b{transform-origin:50% 50%}';
    document.head.appendChild(st);
    const out = [];
    document.querySelectorAll('.pvc>.bdg').forEach((bd) => {
      const bb = bd.getBoundingClientRect();
      const ln = [...bd.querySelectorAll('i,b')].map((e) => {
        const r = e.getBoundingClientRect();
        return { org: getComputedStyle(e).transformOrigin,
          cx: +(r.x + r.width / 2 - bb.left).toFixed(2), cy: +(r.y + r.height / 2 - bb.top).toFixed(2) };
      });
      if (ln.length === 2) out.push({ org: ln.map(l => l.org).join(' · '),
        dx: +(ln[1].cx - ln[0].cx).toFixed(2), dy: +(ln[1].cy - ln[0].cy).toFixed(2) });
    });
    return out;
  });
  ok(back17.length > 0 && back17.every(o => Math.abs(o.dx) < 1),
    '[R17] 스코프 짝을 빼면 두 줄이 **수직으로만** 쌓인다 (강체가 깨진다 — 화면 x 어긋남이 0 으로 죽는다)',
    back17.map(o => `dx ${o.dx} · dy ${o.dy}`).join(' / '));
  await page.evaluate(() => { const e = document.getElementById('r17'); if (e) e.remove(); });
  const now17 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc>.bdg').forEach((bd) => {
      const bb = bd.getBoundingClientRect();
      const ln = [...bd.querySelectorAll('i,b')].map((e) => {
        const r = e.getBoundingClientRect();
        return { cx: r.x + r.width / 2 - bb.left, cy: r.y + r.height / 2 - bb.top };
      });
      if (ln.length === 2) out.push({ dx: +(ln[1].cx - ln[0].cx).toFixed(2), dy: +(ln[1].cy - ln[0].cy).toFixed(2) });
    });
    return out;
  });
  /* 강체 예측: dx = −d·sin15 = −10.04 · dy = d·cos15 = 37.48 (d = 38.8 — 885 7회차가 43.75 에서 옮겼다). */
  ok(now17.length > 0 && now17.every(o => Math.abs(o.dx + 10.04) <= 0.4 && Math.abs(o.dy - 37.48) <= 0.4),
    '[R17b] 원복하면 두 줄 어긋남이 **강체 예측**(dx −10.04 · dy 37.48 = d 38.8 을 15° 돌린 값)과 같다',
    now17.map(o => `dx ${o.dx} · dy ${o.dy}`).join(' / '));

  /* ⚑ [R12] — 8회차가 실제로 진 그 함정을 못박는다. 값을 되돌리는 시험이 아니라
     **스코프 짝을 빼면 조용히 원점이 가운데로 간다**([R7] 과 같은 꼴 · 207 · 325). */
  const back12 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'r12';
    st.textContent = '#shopw .pvc>.rb>i{transform-origin:50% 50%}';   /* 스코프 짝 무력화 */
    document.head.appendChild(st);
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      const cb = c.getBoundingClientRect();
      ['rb1', 'rb2'].forEach((k) => {
        const i = c.querySelector('.' + k + '>i'); if (!i) return;
        const rg = document.createRange(); rg.selectNodeContents(i);
        out.push({ org: getComputedStyle(i).transformOrigin,
          inkL: +(rg.getBoundingClientRect().left - cb.left).toFixed(2) });
      });
    });
    return out;
  });
  ok(back12.length > 0 && back12.every(o => !/^0px /.test(o.org)),
    '[R12] 스코프 짝을 빼면 §13 [13-b] 가 빨개진다 (원점이 가운데로 돌아간다)',
    back12.map(o => o.org).join(' / '));
  /* 왼쪽 원점일 때 이 자리는 44.0(§13 [13-e])이고 가운데로 돌리면 39.7~40.8 로 3.2~4.3px 밀린다.
     ⚠ 문턱을 39.5 로 잡았다가 이 항이 빨개졌다 — «밀린다» 는 참인데 **얼마나** 를 틀리게 적은 것이라
     자를 고쳤다(제품이 아니다). 8회차 화소 실측의 −3.5px 와 같은 크기다. */
  ok(back12.every(o => o.inkL < 42),
    '[R12b] 그때 라벨 잉크가 실제로 **왼쪽으로 밀린다** — [13-b] 가 지키는 것이 그 3~4px 이다 (왼쪽 원점 = 44.0)',
    back12.map(o => o.inkL).join(' / '));
  await page.evaluate(() => { const e = document.getElementById('r12'); if (e) e.remove(); });

  /* ── 9회차 수리 셋의 되돌림 시험 ─────────────────────────────────────────── */
  const back13 = await page.evaluate(() => {
    const st = document.createElement('style'); st.id = 'r13';
    st.textContent = '.pvc>.ban>i{left:181px!important;right:12px!important}'; /* 833 9회차 전 */
    document.head.appendChild(st);
    const c = document.querySelector('.pvc.ban1'), cb = c.getBoundingClientRect();
    const i = c.querySelector('.ban>i');
    const rg = document.createRange(); rg.selectNodeContents(i);
    const t = rg.getBoundingClientRect();
    const sx = parseFloat((getComputedStyle(i).transform.match(/matrix\(([-\d.]+)/) || [0, 1])[1]);
    return { boxW: +i.offsetWidth.toFixed(2), adv0: +(t.width / sx).toFixed(2),
      inkC: +((t.left + t.right) / 2 - cb.left).toFixed(2) };
  });
  ok(back13.adv0 - back13.boxW > 8,
    '[R13] 상자를 181/12 로 되돌리면 [10-d] 가 빨개진다 — 넘침이 9.6px 되살아난다',
    `advance ${p2(back13.adv0)} − 상자 ${p2(back13.boxW)} = ${p2(back13.adv0 - back13.boxW)}`);
  ok(Math.abs(back13.inkC - 359.5) > 6,
    '[R13b] 그때 잉크 중심이 [10-h] 밖으로 나간다 — 넘침이 가운데 정렬을 죽여 오른쪽으로 튄다 (8회차 채점 2인 일치 1번의 그 10px)',
    `${p2(back13.inkC)} ↔ 목표 359.5`);
  await page.evaluate(() => { const e = document.getElementById('r13'); if (e) e.remove(); });

  const back14 = await page.evaluate(() => {
    const st = document.createElement('style'); st.id = 'r14';
    st.textContent = '.pvc.ban1>.rb1{width:424px!important}';               /* 833 9회차 전 */
    document.head.appendChild(st);
    const c = document.querySelector('.pvc.ban1'), cb = c.getBoundingClientRect();
    const r = c.querySelector('.rb1').getBoundingClientRect();
    return +(r.right - cb.left).toFixed(2);
  });
  ok(Math.abs(back14 - 430) > 3,
    '[R14] 배너 리본1 폭을 424 로 되돌리면 [7-b] 가 빨개진다 (우단이 ref 430.2 에서 −6.2 로 물러난다)',
    `${p2(back14)} ↔ ref 430.2`);
  await page.evaluate(() => { const e = document.getElementById('r14'); if (e) e.remove(); });

  /* ⚑ [R15] 는 «상한 99 가 없어도 되는 값이 아니다» 를 못박는다 — 불릿형 여섯 자리의 **자연** advance 가
     옛 상한 90 을 실제로 넘으므로, 90 으로 되돌리면 그 문자열이 다시 −7% 로 눌린다(ref 96.9). */
  const back15 = await page.evaluate(() => {
    const u = [...document.querySelectorAll('.pvc:not(.ban1)>.rb>u')]
      .find(x => x.textContent.replace(/[^0-9]/g, '').length > 4);
    if (!u) return null;
    const k = parseFloat(getComputedStyle(u).getPropertyValue('--uq').trim());
    const rg = document.createRange(); rg.selectNodeContents(u);
    return { t: u.textContent, k, adv: +rg.getBoundingClientRect().width.toFixed(2),
      nat: +(rg.getBoundingClientRect().width / k).toFixed(2) };
  });
  ok(!!back15 && back15.nat > 90 && Math.abs(back15.adv - 99) < 0.6,
    '[R15] 불릿형 여섯 자리는 옛 상한 90 이면 실제로 눌린다 (자연 advance > 90) — 형별 상한이 «있으나 마나» 가 아니라는 증거',
    back15 ? `«${back15.t}» 자연 ${p2(back15.nat)} → ${p2(back15.adv)}` : '표본 없음');

  blk('§Z 콘솔');
  ok(errs.length === 0, '[Z] 콘솔·페이지 에러 0건', String(errs.length));

  await browser.close();
  console.log(`\nVERIFY833 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
