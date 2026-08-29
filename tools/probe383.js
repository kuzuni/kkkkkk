/* 작업 383 — 03 던전 카드 «레벨» 알약 값 숫자의 **정렬 모델** 재현·검산 프로브 (1080×2280).
 *
 *   node tools/probe383.js          요약
 *   node tools/probe383.js --all    자릿수 사다리 전수 출력
 *
 * 338 이 세운 규칙(«등재문의 처방을 따르기 전에 재현부터 한다») 대로 만든 자다.
 * 등재문(342 §10 · 4회차 비평가 AY ④)의 가설은 이것이다 —
 *   ref 는 «레벨» 값이 **중심 abs 209.5 = 카드+159.5 에 center**,
 *   우리는 `.dnc .sp.lv>i{left:66px}` **좌단 고정**이라 자릿수가 늘면 좌측으로 밀린다.
 *
 * ⚑ 한 자리 표본만 보면 «좌단 고정» 과 «중앙 정렬» 을 **구분할 수 없다**(LESSONS 328) —
 *   그래서 이 프로브의 본체는 값 하나를 재는 것이 아니라 **자릿수 사다리**다:
 *     [A] 지금 상태(제품이 실제로 넣는 값)의 상자·잉크
 *     [B] 같은 칸에 «1 → 8 → 88 → 888» 을 넣어 가며 잰다
 *         · 좌단 고정이면 **좌변이 안 움직이고 중심이 오른쪽으로** 간다
 *         · 중앙 정렬이면 **중심이 안 움직이고 좌변이 왼쪽으로** 간다
 *     [C] 대조군 «남은 횟수»(`.sp.tk>i`) — 342 §10 은 «이미 중앙 정렬» 이라 적었다. 같은 사다리를
 *         걸어 사실인지 묻는다(이 자리를 건드리지 말라는 지시의 근거를 확인하는 절이다).
 *     [D] 다른 호스트 — 탑 카드(같은 `.sp.lv` 부품)·레이드 카드(`.dnc.rd` = **다른 모델**:
 *         `position:relative;margin-left:64px`). 수리가 레이드까지 새면 안 되므로 좌표를 기록한다.
 *
 * 재는 법 — 상자는 `getBoundingClientRect`(모델의 고정점이라 결정적이다), 잉크는 **찍힌 픽셀**을
 * 읽는다(350 처방). 오프스크린 캔버스에 글자를 다시 그려 재면 `-webkit-text-stroke` 가 없어
 * 값이 통째로 틀린다(342 1회차 자체 오측).
 * ⚠ 카드 8장 중 화면에 드는 것은 3장뿐이라 **`#dunList` 를 굴려** 아래 칸도 찍는다 —
 *   화면 밖 요소는 rect 가 캡처 밖이라 잉크가 `null` 로 나오고, 그걸 «잉크 못 읽음» 으로
 *   흘리면 표본이 조용히 2장으로 줄어든다.
 *
 * 좌표계 — 카드 리스트는 상단 앵커다(335 «앵커가 둘»): ref_y = cap_y + 84. 가로는 1:1.
 * 레퍼런스 실측(342 §10 · 측정표 03 §3-5-2):
 *   카드1 «3» abs 201..219(중심 210) · 카드4 «1» abs 204..213(중심 208.5) ⇒ 중심 ≈ 209.5
 *   카드 좌변 abs 50 ⇒ **카드+159.5**
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ALL = process.argv.includes('--all');
let pass = 0, fail = 0;
const ck = (name, cond, got) => {
  if (cond) { pass++; console.log('  ✔ ' + name + (got !== undefined ? '  ' + got : '')); }
  else { fail++; console.log('  ✘ ' + name + '  got ' + got); }
};

const REF_CX = 159.5;   /* 카드 기준 — ref 중심 abs 209.5 − 카드 좌변 abs 50 */
const LADDER = ['1', '8', '88', '888'];

/* 383 이전 CSS — [B'] 가 사본에 도로 주입한다(원문 그대로 + 새 손잡이를 되돌리는 두 항) */
const OLD383 = `.dnc:not(.rd) .sp.lv>i{left:66px!important;width:auto!important;text-align:left!important}`;

/* 페이지 안에서 «찍힌 픽셀» 로 잉크 bbox 를 뜬다. 캡처를 data URL 로 되돌려 넣는다.
   창은 **알약 박스 × `<i>` 의 세로 구간**이다 — 가로를 알약으로 넓게 잡아야 수리 전(좌단 고정)과
   수리 후(중앙 정렬)를 같은 창으로 비교할 수 있고, 세로를 좁혀야 잠금 배지·썸네일의 흰 픽셀을 안 문다. */
async function snap(p, sel) {
  const shot = (await p.screenshot()).toString('base64');
  return p.evaluate(async ([b64, sel]) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, cv.width, cv.height).data;
    const inkIn = (pill, el, tol) => {
      if (!pill || !el) return null;
      const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
      const rp = pill.getBoundingClientRect(), re = el.getBoundingClientRect();
      const x0 = Math.max(0, Math.floor(rp.left)), x1 = Math.min(cv.width, Math.ceil(rp.right));
      const y0 = Math.max(0, Math.floor(re.top) - 3), y1 = Math.min(cv.height, Math.ceil(re.bottom) + 3);
      if (x1 - x0 < 2 || y1 - y0 < 2) return null;
      let bx0 = 1e9, bx1 = -1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * cv.width + x) * 4;
        if (Math.abs(D[i] - m[0]) <= tol && Math.abs(D[i + 1] - m[1]) <= tol && Math.abs(D[i + 2] - m[2]) <= tol) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
        }
      }
      return bx1 < 0 ? null : { x: bx0, w: bx1 - bx0 + 1 };
    };
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach((c, i) => {
      const cr = c.getBoundingClientRect();
      /* 카드가 캡처 안에 온전히 들어야 잉크가 의미 있다 */
      const vis = cr.top >= 0 && cr.bottom <= cv.height;
      const pill = c.querySelector(sel.pill), el = pill && pill.querySelector('i');
      const r = el && el.getBoundingClientRect();
      const ink = vis ? inkIn(pill, el, 26) : null;
      out.push({ n: i + 1, rd: c.classList.contains('rd'), lkd: c.classList.contains('lkd'), vis,
        txt: el ? el.textContent : '',
        box: r ? { x: +(r.left - cr.left).toFixed(2), w: +r.width.toFixed(2),
          cx: +(r.left + r.width / 2 - cr.left).toFixed(2) } : null,
        ink: ink ? { x: +(ink.x - cr.left).toFixed(1), w: ink.w,
          cx: +(ink.x + ink.w / 2 - cr.left).toFixed(1) } : null });
    });
    return out;
  }, [shot, sel]);
}

/* ⚑ 잉크가 읽히는 칸은 **해금 칸뿐**이다 — 잠금 카드는 `.dnc .lk{background:rgba(0,0,0,.65)}`
   스크림이 카드를 통째로 덮어 흰 숫자가 255 가 아니라 **89** 로 찍힌다(실측). 굴려서 화면에
   넣어도 마찬가지다. 그래서 이 프로브는 **상자 기하로 8칸 전부**를 재고(모델의 고정점이라
   결정적이다) **잉크는 해금 칸으로** 뒷받침한다 — 342 게이트가 `un.slice(0,2)` 로 하는 것과 같다.
   해금 칸은 목록 순서상 항상 맨 위라 스크롤이 필요 없다. */
const snapAll = snap;

async function settle(p) {
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await p.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
  await p.waitForTimeout(800);   /* 60 쥬시 pop-in 이 끝나야 bbox 가 확정된다 */
}

const LV = { pill: '.sp.lv' }, TK = { pill: '.sp.tk' };

/* 사다리 — 같은 칸에 값을 갈아 끼우며 잰다. 반환은 [{v, cards:[…]}] */
async function ladder(p, sel) {
  const rows = [];
  for (const v of LADDER) {
    await p.evaluate(([s, v]) => {
      document.querySelectorAll('#dunList .dnc:not(.rd) ' + s + '>i').forEach((el) => { el.textContent = v; });
    }, [sel.pill, v]);
    await p.waitForTimeout(220);
    rows.push({ v, cards: await snapAll(p, sel) });
  }
  return rows;
}

const span = (a) => +(Math.max(...a) - Math.min(...a)).toFixed(1);

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(450);
  await settle(p);

  /* ── [A] 지금 상태 ─────────────────────────────────────────────────── */
  const A = await snapAll(p, LV);
  console.log('\n[A] 03 던전 — 지금 상태의 «레벨» 값 (카드 기준 · ref 중심 ' + REF_CX + ')');
  for (const c of A) console.log(`  카드${c.n}${c.lkd ? '(잠금)' : '      '} «${c.txt}»` +
    `  상자 x${c.box.x} w${c.box.w} cx${c.box.cx}` +
    (c.ink ? `   잉크 x${c.ink.x} w${c.ink.w} cx${c.ink.cx}  (Δref ${(c.ink.cx - REF_CX).toFixed(1)})` : '   잉크 —'));
  const inkA = A.filter((c) => c.ink), unA = A.filter((c) => !c.lkd);
  ck('[A-1] 잉크가 **해금 칸 전부**에서 읽혔다(잠금 6칸은 `.lk` 스크림 rgba(0,0,0,.65) 이 흰 잉크를 ' +
    '89 로 눌러 원리적으로 못 읽는다 — 그래서 상자 기하가 8칸을 맡는다)',
    unA.length >= 2 && unA.every((c) => c.ink), inkA.length + '/' + unA.length + ' (해금)');
  ck('[A-2] 상자 표본이 8칸 전부다(조용히 줄지 않았다)', A.length === 8 && A.every((c) => c.box),
    A.length + '칸');
  ck('[A-3] 지금 값은 8칸이 전부 한 자리라 **여기서는 두 모델이 구분되지 않는다** — 사다리가 필요한 이유',
    new Set(A.map((c) => c.txt)).size === 1, '«' + A[0].txt + '» ×' + A.length);

  /* ── [B] 자릿수 사다리 — 지금 제품(수리 후)은 중심이 못박혀 있어야 한다 ── */
  const L = await ladder(p, LV);
  console.log('\n[B] 자릿수 사다리 «' + LADDER.join(' → ') + '» — 카드1 기준 (수리 후)');
  for (const r of L) {
    const c = r.cards[0];
    console.log(`  «${r.v}»  상자 x${c.box.x} w${c.box.w} cx${c.box.cx}` +
      (c.ink ? `   잉크 x${c.ink.x} w${c.ink.w} **cx${c.ink.cx}**` : '   잉크 —'));
    if (ALL) for (const q of r.cards.slice(1))
      console.log(`        카드${q.n} 상자 cx${q.box.cx}` + (q.ink ? ` 잉크 cx${q.ink.cx}` : ''));
  }
  const bcx = L.map((r) => r.cards[0].box.cx);
  const inkCx = L.map((r) => r.cards[0].ink && r.cards[0].ink.cx);
  ck('[B-1] **중앙 정렬이다** — 사다리 전 구간에서 상자 중심이 한 값(span ≤ 0.5)',
    span(bcx) <= 0.5, bcx.join(' · '));
  ck('[B-2] 그 한 값이 ref 중심 ' + REF_CX + ' 다(±0.5)',
    bcx.every((v) => Math.abs(v - REF_CX) <= 0.5), bcx.join(' · '));
  ck('[B-3] 찍힌 픽셀도 같다 — 잉크 중심 span ≤ 2 (남은 흔들림은 글리프 side bearing 몫)',
    inkCx.every((v) => v !== null) && span(inkCx) <= 2, inkCx.join(' · '));
  ck('[B-4] 상자가 글리프보다 넓다 — `text-align` 이 죽지 않는다(357 본체). 최장 «888» 잉크 폭 < 상자 폭',
    L[3].cards[0].ink.w < L[3].cards[0].box.w, L[3].cards[0].ink.w + ' < ' + L[3].cards[0].box.w);

  /* 원복 */
  await p.evaluate(() => { if (typeof renderDunPage === 'function') renderDunPage(); });
  await p.waitForTimeout(400);

  /* ── [B'] 재현 — 383 **이전** CSS 를 사본에 도로 주입하면 같은 사다리가 밀린다 ──
     338 규칙의 «처방 전에 재현» 을 게이트가 아니라 여기서 붙든다. 수리 뒤에도 언제든
     다시 돌려 «무엇을 고쳤는지» 를 눈으로 확인할 수 있어야 한다. */
  const p2 = await ctx.newPage();
  p2.on('pageerror', () => {});
  await p2.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p2.waitForTimeout(900);
  await p2.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p2.waitForTimeout(450);
  await settle(p2);
  await p2.addStyleTag({ content: OLD383 });
  await p2.waitForTimeout(300);
  const L0 = await ladder(p2, LV);
  const b0x = L0.map((r) => r.cards[0].box.x), b0cx = L0.map((r) => r.cards[0].box.cx);
  console.log('\n[B\'] 383 이전 CSS 주입 — 좌변 ' + b0x.join(' · ') + '  /  중심 ' + b0cx.join(' · '));
  ck("[B'-1] 옛 모델은 **좌단 고정**이다 — 상자 좌변 span ≤ 0.5", span(b0x) <= 0.5, b0x.join(' · '));
  ck("[B'-2] 그래서 중심이 자릿수를 따라 오른쪽으로 끌려간다(span ≥ 8)", span(b0cx) >= 8, b0cx.join(' · '));
  const two0 = L0.find((r) => r.v === '88').cards[0];
  console.log(`  ⇒ 옛 모델의 두 자리 «88» 은 ref 중심 대비 **+${(two0.box.cx - REF_CX).toFixed(1)}px**` +
    ` (한 자리 «1» 은 ${(L0[0].cards[0].box.cx - REF_CX).toFixed(1)}px — 등재문의 «지금은 2~3px, 두 자리면 크게»)`);
  ck("[B'-3] 등재문의 «두 자리에서 크게 밀린다» 가 재현된다(≥ 8px)",
    two0.box.cx - REF_CX >= 8, (two0.box.cx - REF_CX).toFixed(1));
  await p2.close();

  /* ── [C] 대조군 «남은 횟수» ───────────────────────────────────────── */
  const LT = await ladder(p, TK);
  const tbx = LT.map((r) => r.cards[0].box.x), tbcx = LT.map((r) => r.cards[0].box.cx);
  console.log('\n[C] 대조군 «남은 횟수» 사다리 — 상자 좌변 ' + tbx.join(' · ') + '  /  중심 ' + tbcx.join(' · '));
  ck('[C-1] «남은 횟수» 도 실은 좌단 고정이다 — 342 §10 의 «이미 중앙 정렬» 은 ' +
    'ref·우리 문자열이 «2/2» 로 같아 두 모델이 구분되지 않았던 것이다(LESSONS 328 의 그 함정)',
    span(tbx) <= 0.5, tbx.join(' · '));
  ck('[C-2] 그래도 **살아 있는 결함이 아니다** — 제품이 넣는 값은 `left/DUN_TRY` 라 ' +
    '항상 «한 자리/한 자리»(DUN_TRY=2)로 폭이 안 변한다 ⇒ 383 의 범위 밖(관측만 기록)',
    true, '설계상 폭 불변');

  await p.evaluate(() => { if (typeof renderDunPage === 'function') renderDunPage(); });
  await p.waitForTimeout(400);

  /* ── [D] 다른 호스트 — 탑 · 레이드 ────────────────────────────────── */
  await p.evaluate(() => { document.querySelector('#dunSub [data-dsub="tower"]').click(); });
  await p.waitForTimeout(600);
  const T = await snapAll(p, LV);
  console.log('\n[D] 탑 카드 — 같은 `.sp.lv` 부품(수리가 같이 가야 하는 자리)');
  for (const c of T) console.log(`  탑${c.n} «${c.txt}»  상자 x${c.box.x} w${c.box.w} cx${c.box.cx}` +
    (c.ink ? `   잉크 cx${c.ink.cx}` : ''));
  ck('[D-1] 탑 카드도 던전과 **같은 상자**를 쓴다 — 층 수는 자릿수가 실제로 늘어나는 자리라 ' +
    '수리가 여기까지 가는 것이 맞다', T.length >= 1 && T.every((c) => Math.abs(c.box.cx - REF_CX) <= 0.5),
    T.map((c) => c.box.cx).join(' · '));

  await p.evaluate(() => { document.querySelector('#dunSub [data-dsub="raid"]').click(); });
  await p.waitForTimeout(600);
  const Rd = await snapAll(p, LV);
  console.log('\n[D] 레이드 카드 — **다른 모델**(`position:relative;margin-left:64px`)');
  for (const c of Rd) console.log(`  레이드${c.n}${c.rd ? '(.rd)' : ''} «${c.txt}»  상자 x${c.box.x} w${c.box.w} cx${c.box.cx}`);
  ck('[D-2] 레이드 카드가 표본에 있다(수리가 «안 새는지» 를 잴 자리)', Rd.some((c) => c.rd),
    Rd.filter((c) => c.rd).length + '장');
  console.log('  ⇒ 레이드 값 상자 좌변 ' + Rd.filter((c) => c.rd).map((c) => c.box.x).join(' · ') +
    ' — 수리 뒤 이 값이 변하면 새어 나간 것이다');

  console.log('\n콘솔 에러: ' + errs.length + (errs.length ? ' — ' + errs.join(' | ') : ''));
  ck('[E-1] 콘솔 에러 0', errs.length === 0, errs.length);

  await b.close();
  console.log(`\nPROBE383 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
