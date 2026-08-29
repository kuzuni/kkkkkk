/* 작업 342 — 03 던전 카드 «내부 세로 리듬» **재현·검산** 프로브 (1080×2280).
 *
 *   node tools/probe342.js            요약(카드1·2 = 레퍼런스와 같은 해금 2장)
 *   node tools/probe342.js --all      8장 전수
 *
 * 338 이 세운 규칙(«등재문의 처방을 따르기 전에 재현부터 한다») 대로 만든 자다.
 * `tools/scan342.py` 가 **레퍼런스와 캡처를 같은 마스크로** 재는 쪽이라면, 이쪽은
 * **제품에게 직접 묻는다**.
 *
 * ⚠ 1회차 자체 오측 — 처음엔 잉크를 «오프스크린 캔버스에 같은 폰트로 그려서» 쟀다.
 *   폭은 ±2px 로 맞았지만 **세로가 통째로 틀렸다**(카드+49 ↔ 실제 +39). 캔버스에는
 *   ⓐ `-webkit-text-stroke` 가 없고 ⓑ 베이스라인↔라인박스 상변 관계가 폰트 ascent 라
 *   `fs`·half-leading 으로는 못 복원한다. ⇒ **찍힌 픽셀을 읽는다**(350 처방):
 *   페이지를 캡처해 data URL 로 페이지에 되돌려 넣고, 요소의 실제 색으로 마스크를 만들어
 *   그 요소의 rect 창 안에서만 잉크 bbox 를 뜬다. 스캐너(ref↔cap)와 값이 맞물린다.
 *
 * 좌표계 — 카드 리스트는 **상단 앵커**다(335 «앵커가 둘»): ref_y = cap_y + 84.
 * 레퍼런스 실측(측정표 03 §3-3·§3-4 · `scan342.py`):
 *   던전명 잉크 상변 카드+44 · 잉크 높이 50~51 · 타이틀 하변↔알약 상변 26~27
 *   알약 우측 여백(알약 우변 − 라벨 잉크 우변) 50~52
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ALL = process.argv.includes('--all');
let pass = 0, fail = 0;
const ck = (name, ok, got) => {
  if (ok) { pass++; console.log('  ✔ ' + name + (got !== undefined ? '  ' + got : '')); }
  else { fail++; console.log('  ✘ ' + name + '  got ' + got); }
};

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
  /* LESSONS 30-② — 토스트·파티클이 카드 위를 지나가면 잉크 스캔이 오염된다. */
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await p.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
  await p.waitForTimeout(800);   /* 60 쥬시 pop-in 이 끝나야 bbox 가 확정된다 */

  const shot = (await p.screenshot()).toString('base64');

  const d = await p.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const PX = g.getImageData(0, 0, cv.width, cv.height).data;
    const at = (x, y) => { const i = (y * cv.width + x) * 4; return [PX[i], PX[i + 1], PX[i + 2]]; };

    /* 요소의 실제 color 로 마스크를 만든다 — 카드마다 라벨 색(var(--pt))이 다르다.
       tol 은 안티에일리어싱·딤(잠금 카드)까지 먹도록 «색 방향» 으로 준다. */
    const inkBox = (el, pad, tol) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const m = cs.color.match(/[\d.]+/g).map(Number);
      const r0 = el.getBoundingClientRect();
      const x0 = Math.max(0, Math.floor(r0.left) - pad), x1 = Math.min(cv.width, Math.ceil(r0.right) + pad);
      const y0 = Math.max(0, Math.floor(r0.top) - pad), y1 = Math.min(cv.height, Math.ceil(r0.bottom) + pad);
      let bx0 = 1e9, bx1 = -1, by0 = 1e9, by1 = -1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const c = at(x, y);
        if (Math.abs(c[0] - m[0]) <= tol && Math.abs(c[1] - m[1]) <= tol && Math.abs(c[2] - m[2]) <= tol) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (y < by0) by0 = y; if (y > by1) by1 = y;
        }
      }
      return bx1 < 0 ? null : { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1, col: cs.color };
    };

    const A = document.getElementById('app').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach((c, i) => {
      const cr = c.getBoundingClientRect();
      const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
        return { x: +(r.left - cr.left).toFixed(1), y: +(r.top - cr.top).toFixed(1),
          w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
      const relI = (bb) => bb ? { x: +(bb.x - cr.left).toFixed(1), y: +(bb.y - cr.top).toFixed(1), w: bb.w, h: bb.h } : null;
      const nm = c.querySelector('.nm'), p1 = c.querySelector('.pill'), pi = p1 && p1.querySelector('i');
      const lu = c.querySelector('.lk>u');
      out.push({
        n: i + 1, locked: c.classList.contains('lkd'),
        cardY: +(cr.top - A.top).toFixed(1),
        nmTxt: nm ? nm.textContent : null, nmFs: nm ? getComputedStyle(nm).fontSize : null,
        nm: rel(nm), nmInk: relI(inkBox(nm, 8, 26)),
        pillTxt: pi ? pi.textContent : null, pillFs: pi ? getComputedStyle(pi).fontSize : null,
        pill: rel(p1), pillI: rel(pi), pillInk: relI(inkBox(pi, 6, 30)),
        /* tol 은 좁게 — #C8C8C8 에 34 를 주면 166..234 가 다 걸려 카드 배경(회색 계열)까지 먹는다
           (1회차 자체 오측: 카드6 이 x+45..978 로 읽혔다). */
        lkuTxt: lu ? lu.textContent : null, lku: rel(lu), lkuInk: relI(inkBox(lu, 6, 20)),
        fr: rel(c.querySelector('.th')),
      });
    });
    return out;
  }, shot);

  console.log('작업 342 — 03 던전 카드 내부 «찍힌 픽셀» 잉크 (카드 좌상단 기준 · 세로 앵커 ref = cap + 84)\n');
  const list = ALL ? d : d.filter((c) => c.n <= 2);
  for (const c of list) {
    console.log('■ 카드' + c.n + (c.locked ? ' (잠금)' : '') + '  «' + c.nmTxt + '»');
    if (c.nmInk) console.log('   .nm    박스 y%s h%s fs %s | 잉크 x+%s y+%s %sx%s   (ref 잉크 x+42 y+44 h50~51)',
      c.nm.y, c.nm.h, c.nmFs, c.nmInk.x, c.nmInk.y, c.nmInk.w, c.nmInk.h);
    if (c.pillInk) console.log('   .pill  박스 x%s y%s %sx%s 우변 %s | 라벨 «%s» fs %s 잉크 x+%s y+%s %sx%s → 우측여백 %s   (ref 여백 50~52)',
      c.pill.x, c.pill.y, c.pill.w, c.pill.h, (c.pill.x + c.pill.w).toFixed(1),
      c.pillTxt, c.pillFs, c.pillInk.x, c.pillInk.y, c.pillInk.w, c.pillInk.h,
      (c.pill.x + c.pill.w - c.pillInk.x - c.pillInk.w).toFixed(1));
    if (c.nmInk && c.pill) console.log('   간격   타이틀 잉크 하변 %s → 알약 상변 %s = %s   (ref 26~27)',
      (+c.nmInk.y + c.nmInk.h).toFixed(1), c.pill.y, (c.pill.y - c.nmInk.y - c.nmInk.h).toFixed(1));
    if (c.lkuInk) console.log('   .lk>u  «%s» 잉크 x+%s..%s y+%s h%s | 액자 좌변 %s → 클리어런스 %s',
      c.lkuTxt, c.lkuInk.x, (+c.lkuInk.x + c.lkuInk.w).toFixed(1), c.lkuInk.y, c.lkuInk.h,
      c.fr ? c.fr.x : '?', c.fr ? (c.fr.x - c.lkuInk.x - c.lkuInk.w).toFixed(1) : '?');
    console.log('');
  }

  console.log('── 단언 (레퍼런스 실측 대비 · 해금 2장 = 캡처 상태가 ref 와 같은 자리) ──');
  for (const c of d.filter((x) => !x.locked).slice(0, 2)) {
    ck('카드' + c.n + ' 던전명 잉크 상변 = 카드+44 (±2)', Math.abs(c.nmInk.y - 44) <= 2, c.nmInk.y);
    ck('카드' + c.n + ' 던전명 잉크 높이 = 50~51 (±2.5)', Math.abs(c.nmInk.h - 50.5) <= 2.5, c.nmInk.h);
    const gap = c.pill.y - c.nmInk.y - c.nmInk.h;
    ck('카드' + c.n + ' 타이틀↔알약 간격 = 26~27 (±3)', Math.abs(gap - 26.5) <= 3, gap.toFixed(1));
    const padR = c.pill.x + c.pill.w - c.pillInk.x - c.pillInk.w;
    ck('카드' + c.n + ' 알약 우측 여백 = 50~52 (±10)', Math.abs(padR - 51) <= 10, padR.toFixed(1));
  }
  /* ── 잠금 카드 가이드미션 문구 (등재문 ⓒ) ───────────────────────────────
     ⚑ 등재문 ⓒ-③(«잠금 문구 우변이 액자 좌변과 3~5px» = 클리어런스가 좁다)은 **기각한다.**
     레퍼런스가 그 요구를 안 한다 — 측정표 03 §3-7-3 의 ref 잉크 우단은 카드3 **747** ·
     카드5 **754**(절대) = 카드기준 **697·704** 이고, 같은 표 §3-8 의 액자 좌변은 카드기준 643 이다.
     ⇒ ref 는 문구가 액자를 **54~61px 밟고 지나간다**(잠금 딤 위에 얹히는 글자라 그래도 읽힌다).
     좁아 보였던 것은 «문구가 ref 보다 작아서 왼쪽에 웅크리고 있던» 것이고, ⓒ-① 잉크 높이를
     ref 로 세우자 우단이 671 로 나아가 ref 쪽(697)에 가까워졌다 — 같은 수리가 닫는다.
     그래서 여기서 묻는 것은 «클리어런스» 가 아니라 **ref 실측 세 값**이다. */
  const REFLK = { top: 223, h: 41, cx: 489 };   /* 측정표 03 §3-7-3 (상대 y +223 · 잉크 41 · 중심 539 abs = 카드기준 489) */
  for (const c of d.filter((x) => x.locked && x.lkuInk && x.n <= 5)) {
    ck('카드' + c.n + ' 잠금 문구 잉크 상변 = 카드+223 (±2)', Math.abs(c.lkuInk.y - REFLK.top) <= 2, c.lkuInk.y);
    ck('카드' + c.n + ' 잠금 문구 잉크 높이 = 41 (±2.5)', Math.abs(c.lkuInk.h - REFLK.h) <= 2.5, c.lkuInk.h);
    const cx = +c.lkuInk.x + c.lkuInk.w / 2;
    ck('카드' + c.n + ' 잠금 문구 가로 중심 = 카드+489 (±5)', Math.abs(cx - REFLK.cx) <= 5, cx.toFixed(1));
    ck('카드' + c.n + ' 잠금 문구 우단이 ref 처럼 액자를 넘는다(ref −54)',
      c.fr.x - c.lkuInk.x - c.lkuInk.w < 0, (c.fr.x - c.lkuInk.x - c.lkuInk.w).toFixed(1));
  }
  ck('콘솔 런타임 에러 0건', errs.length === 0, errs.length);

  console.log('\nPROBE342 ' + pass + '/' + (pass + fail));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
