/* 작업 342 — 03 던전 카드 «내부 세로 리듬» 게이트.
 *
 *   node tools/verify342.js
 *
 * 무엇을 지키나 — 342 가 레퍼런스로 데려온 세 자리다(측정표 03 §3-3 · §3-4 · §3-7-3):
 *   ⓐ 던전명   잉크 상변 카드+44 · 잉크 높이 50~51 · 잉크 하변↔알약 상변 26~27
 *   ⓑ 재화 알약 캡슐이 **글자를 감싼다**(고정 288 이 아니다) · 라벨 우측 여백 = ref
 *   ⓒ 잠금 문구 잉크 상변 카드+223 · 잉크 높이 41 · 가로 중심 카드+489
 *
 * 재는 법은 `tools/probe342.js` 와 같다 — **찍힌 픽셀**을 읽는다(350 처방).
 * 오프스크린 캔버스에 글자를 다시 그려 재면 `-webkit-text-stroke` 도 없고 베이스라인↔라인박스
 * 관계도 못 복원해 세로가 통째로 틀린다(342 1회차 자체 오측 — 카드+49 ↔ 실제 +39).
 *
 * §R 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다. 사본에 342 **이전 CSS** 를 도로 주입해
 * 세 절이 각각 빨개지는지 본다. 항이 항등식이면 여기서 안 빨개진다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const near = (n, got, want, tol) => ok(got !== null && Math.abs(got - want) <= tol,
  `${n} ${got} = ${want} (±${tol})`);

/* ── 레퍼런스 실측 (측정표 03) ─────────────────────────────────────────── */
const R = {
  nmInkTop: 44, nmInkH: 50.5, gap: 26.5,     /* §3-3 · §3-4 */
  pillX: 92, pillY: 121, pillH: 46,          /* §3-4 — 자리·높이는 불변 */
  padR: 51,                                  /* §3-4 : 알약 우변 379(카드기준) − 라벨 잉크 우변 327 */
  lkTop: 223, lkH: 41, lkCx: 489,            /* §3-7-3 */
};

/* 342 이전 CSS — §R 이 사본에 도로 주입한다(원문 그대로) */
const OLD = `
  .dnc .nm{top:40px!important;height:56px!important;line-height:56px!important;font-size:56px!important}
  .dnc .pill{padding:0!important;min-width:288px!important;width:288px!important}
  .dnc .pill>i{position:absolute!important;left:58px!important;top:8px!important;
    height:30px!important;line-height:30px!important;font-size:30px!important}
  .dnc .lk>u{top:211px!important;height:45px!important;line-height:45px!important;
    font-size:45px!important;word-spacing:normal!important}
  .dnc .lb{height:33px!important;line-height:33px!important;font-size:26px!important}
  .dnc .nm{word-spacing:3px!important}
  .dnc .sp>i{top:6px!important;height:34px!important;line-height:34px!important;font-size:41px!important}
  .dnc .sp.lv>i{left:64px!important}
  .dnc .lk>u{padding-right:1px!important}`;

async function measure(p, injectOld) {
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await p.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
  if (injectOld) await p.addStyleTag({ content: OLD });
  await p.waitForTimeout(800);
  const shot = (await p.screenshot()).toString('base64');
  return p.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, cv.width, cv.height).data;
    const inkBox = (el, pad, tol) => {
      if (!el) return null;
      const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
      const r0 = el.getBoundingClientRect();
      const x0 = Math.max(0, Math.floor(r0.left) - pad), x1 = Math.min(cv.width, Math.ceil(r0.right) + pad);
      const y0 = Math.max(0, Math.floor(r0.top) - pad), y1 = Math.min(cv.height, Math.ceil(r0.bottom) + pad);
      let bx0 = 1e9, bx1 = -1, by0 = 1e9, by1 = -1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * cv.width + x) * 4;
        if (Math.abs(D[i] - m[0]) <= tol && Math.abs(D[i + 1] - m[1]) <= tol && Math.abs(D[i + 2] - m[2]) <= tol) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (y < by0) by0 = y; if (y > by1) by1 = y;
        }
      }
      return bx1 < 0 ? null : { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
    };
    /* 어절 공백 — 던전명 노란 잉크를 열 프로파일로 훑어 «8px 이상 끊긴 자리» 를 센다.
       342 2회차(비평가 AS ③-2): ref 24~28 ↔ 수리 전 14~16. */
    const wordGap = (el) => {
      if (!el) return null;
      const r0 = el.getBoundingClientRect();
      const y0 = Math.floor(r0.top) - 8, y1 = Math.ceil(r0.bottom) + 8;
      const cols = [];
      for (let x = Math.floor(r0.left) - 8; x < Math.ceil(r0.right) + 8; x++) {
        let n = 0;
        for (let y = y0; y < y1; y++) {
          const i = (y * cv.width + x) * 4;
          if (D[i] >= 190 && D[i + 1] >= 190 && D[i + 1] - D[i + 2] >= 90 && Math.abs(D[i] - D[i + 1]) <= 25) n++;
        }
        cols.push(n >= 2);
      }
      const runs = []; let s2 = null;
      cols.forEach((v, i) => { if (v && s2 === null) s2 = i; if (!v && s2 !== null) { runs.push([s2, i - 1]); s2 = null; } });
      if (s2 !== null) runs.push([s2, cols.length - 1]);
      const big = runs.filter((r) => r[1] - r[0] >= 8);
      if (big.length < 2) return null;
      const m = [big[0].slice()];
      for (const r of big.slice(1)) {
        if (r[0] - m[m.length - 1][1] - 1 < 8) m[m.length - 1][1] = r[1]; else m.push(r.slice());
      }
      return m.length < 2 ? null : m[1][0] - m[0][1] - 1;
    };
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach((c, i) => {
      const cr = c.getBoundingClientRect();
      const rel = (el) => el ? { x: +(el.getBoundingClientRect().left - cr.left).toFixed(1),
        y: +(el.getBoundingClientRect().top - cr.top).toFixed(1),
        w: +el.getBoundingClientRect().width.toFixed(1),
        h: +el.getBoundingClientRect().height.toFixed(1) } : null;
      const relI = (bb) => bb ? { x: +(bb.x - cr.left).toFixed(1), y: +(bb.y - cr.top).toFixed(1), w: bb.w, h: bb.h } : null;
      const nm = c.querySelector('.nm'), pl = c.querySelector('.pill'),
        pi = pl && pl.querySelector('i'), lu = c.querySelector('.lk>u');
      out.push({ n: i + 1, locked: c.classList.contains('lkd'),
        nm: rel(nm), nmInk: relI(inkBox(nm, 8, 26)), nmGap: wordGap(nm),
        pill: rel(pl), pillInk: relI(inkBox(pi, 6, 30)),
        lkuInk: relI(inkBox(lu, 6, 20)),
        /* ⚠ 라벨 창은 **박스 안** 으로 자른다(pad 0) — 342 2회차에 박스가 33 → 38 로 커지며
           pad 6 짜리 창이 아래 알약의 «흰 숫자» 를 물어 잉크 높이가 24 대신 39 로 읽혔다. */
        lbA: relI(inkBox(c.querySelector('.lb.a'), 0, 22)),
        lbB: relI(inkBox(c.querySelector('.lb.b'), 0, 22)),
        spLv: rel(c.querySelector('.sp.lv')),
        /* 3회차 — 알약 «값» 숫자. 흰 글자라 박스 안으로 창을 자른다. */
        spLvI: relI(inkBox(c.querySelector('.sp.lv>i'), 2, 26)),
        spTkI: relI(inkBox(c.querySelector('.sp.tk>i'), 2, 26)) });
    });
    return out;
  }, shot);
}

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  const d = await measure(p, false);
  const un = d.filter((c) => !c.locked).slice(0, 2);
  const lk = d.filter((c) => c.locked && c.lkuInk && c.n <= 5);

  console.log('\n[§1 ⓐ 던전명 블록 — 잉크 상변·높이] (ref 카드+44 · h50~51)');
  for (const c of un) {
    near(`카드${c.n} 던전명 잉크 상변`, c.nmInk && +c.nmInk.y, R.nmInkTop, 2);
    near(`카드${c.n} 던전명 잉크 높이`, c.nmInk && c.nmInk.h, R.nmInkH, 2.5);
    /* 좌변은 «박스» 가 아니라 **잉크**로 묻는다 — 342 가 fs 를 올리자 잉크 오프셋이 커져
       박스를 39 → 40 으로 1px 밀어야 잉크가 ref 자리(카드+42, §3-3)에 앉았다. */
    near(`카드${c.n} 던전명 잉크 좌변`, c.nmInk && +c.nmInk.x, 42, 2);
    /* ref 24 / 26. ±5 면 2회차의 과교정(26/28)도 통과해 4회차가 사라져도 초록이다 → ±1.5. */
    near(`카드${c.n} 던전명 어절 공백`, c.nmGap, 25, 1.5);
  }

  console.log('\n[§2 ⓐ-2 타이틀 하변 ↔ 알약 상변] (ref 26~27 · 수리 전 34)');
  for (const c of un)
    near(`카드${c.n} 간격`, c.nmInk && +(c.pill.y - c.nmInk.y - c.nmInk.h).toFixed(1), R.gap, 3);

  console.log('\n[§3 ⓑ 재화 알약 — 자리는 불변, 캡슐은 글자를 감싼다]');
  for (const c of d) {
    ok(Math.abs(c.pill.x - R.pillX) <= 1 && Math.abs(c.pill.h - R.pillH) <= 1,
      `카드${c.n} 알약 좌변·높이 ${c.pill.x},${c.pill.h} = ${R.pillX},${R.pillH} (불변)`);
  }
  for (const c of un)
    near(`카드${c.n} 라벨 우측 여백`,
      +(c.pill.x + c.pill.w - c.pillInk.x - c.pillInk.w).toFixed(1), R.padR, 8);
  /* «감싼다» 는 «288 이 아니다» 가 아니라 «내용에 따라 다르다» 로 묻는다 —
     한 값만 금지하면 다른 상수를 박아도 초록이다. */
  const widths = [...new Set(d.map((c) => Math.round(c.pill.w)))];
  ok(widths.length >= 3, `알약 폭이 라벨 길이를 따라간다 — 8장에서 서로 다른 폭 ${widths.length}종 (${widths.join(',')})`);
  ok(d.every((c) => c.pill.w < 900), '알약이 카드 밖으로 안 샌다', 0);

  console.log('\n[§4 ⓒ 잠금 가이드미션 문구] (ref 카드+223 · h41 · 중심 카드+489)');
  for (const c of lk) {
    near(`카드${c.n} 문구 잉크 상변`, +c.lkuInk.y, R.lkTop, 2);
    near(`카드${c.n} 문구 잉크 높이`, c.lkuInk.h, R.lkH, 2.5);
    /* ±5 면 4회차 이전 값(490.5)도 통과한다 → ±1. ref 는 3장 전부 정확히 489.0 이다. */
    near(`카드${c.n} 문구 가로 중심`, +(+c.lkuInk.x + c.lkuInk.w / 2).toFixed(1), R.lkCx, 1);
  }

  /* 2회차 — 비평가 AR 이 찾은 «같은 병의 세 번째 자리». 측정표 03 §3-5-1:
     «레벨» 잉크 카드+136 / +248 · h24 · «남은 횟수» 카드+318 / +247 · h26 · 라벨 하변↔알약 상변 5 */
  console.log('\n[§5 하단 «레벨»·«남은 횟수» 라벨] (ref +136/+248 h24 · +318/+247 h26 · 알약까지 5)');
  for (const c of un) {
    near(`카드${c.n} «레벨» 잉크 좌변`, +c.lbA.x, 136, 2);
    near(`카드${c.n} «레벨» 잉크 상변`, +c.lbA.y, 248, 2);
    near(`카드${c.n} «레벨» 잉크 높이`, c.lbA.h, 24, 2);
    near(`카드${c.n} «남은 횟수» 잉크 좌변`, +c.lbB.x, 318, 2);
    near(`카드${c.n} «남은 횟수» 잉크 상변`, +c.lbB.y, 247, 2);
    near(`카드${c.n} «남은 횟수» 잉크 높이`, c.lbB.h, 26, 2);
    near(`카드${c.n} 라벨 하변 → 알약 상변`, +(c.spLv.y - c.lbA.y - c.lbA.h).toFixed(1), 5, 2);
  }

  /* 3회차 — 비평가 AT ②. 측정표 §3-5-2 «레벨 숫자 x201~219 · cap 28» · §3-5-3 «횟수 x402~468 w67».
     한글은 서체 탓에 폭이 −8~10% 인데 **숫자만 반대로 +7% 컸다** — 서체 몫이 아니라 크기 설정이다. */
  console.log('\n[§6 알약 «값» 숫자] (ref 레벨 좌 201·잉크상변 카드+286·cap 28 · 횟수 좌 402·폭 67)');
  for (const c of un) {
    /* ⚠ 허용 오차를 ±3 으로 두면 **옛 값(좌 149 · 높이 30)도 초록**이라 3회차가 통째로
       되돌아가도 안 빨개진다(LESSONS 328). ref 28/151 에서 우리 27/151 은 안, 옛 30/149 는
       밖이 되는 ±1.5 로 좁혔다 — §R 의 R-i 가 그 폭을 지킨다. */
    near(`카드${c.n} 레벨 숫자 잉크 좌변`, c.spLvI && +c.spLvI.x, 151, 1.5);   /* 절대 201 = 카드+151 */
    near(`카드${c.n} 레벨 숫자 잉크 상변`, c.spLvI && +c.spLvI.y, 286, 3);
    near(`카드${c.n} 레벨 숫자 잉크 높이`, c.spLvI && c.spLvI.h, 28, 1.5);
    near(`카드${c.n} 횟수 숫자 잉크 좌변`, c.spTkI && +c.spTkI.x, 352, 2);     /* 절대 402 = 카드+352 */
    near(`카드${c.n} 횟수 숫자 잉크 높이`, c.spTkI && c.spTkI.h, 28, 1.5);
  }

  /* 3회차 — 비평가 AU ④ · AT ③ 이 각자 재서 같은 값을 냈다: 캡슐 안 라벨이 위로 3px 떠 있었다.
     ref 는 상/하 여백이 8~10 으로 대칭이다. 잉크 높이는 이미 맞으므로 baseline 몫이다. */
  console.log('\n[§7 재화 알약 라벨 수직 대칭] (ref 상10 / 하9~10 · 수리 전 상5 / 하11)');
  for (const c of un) {
    const top = +c.pillInk.y - c.pill.y, bot = (c.pill.y + c.pill.h) - (+c.pillInk.y + c.pillInk.h);
    ok(Math.abs(top - bot) <= 3, `카드${c.n} 캡슐 상/하 여백 대칭 — 상 ${top.toFixed(1)} / 하 ${bot.toFixed(1)} (차 ${Math.abs(top - bot).toFixed(1)} ≤ 3)`);
    near(`카드${c.n} 캡슐 위 여백`, +top.toFixed(1), 9, 3);
  }

  console.log('\n[§8 콘솔]');
  ok(errs.length === 0, `콘솔 에러 0건 (${errs.length})`);

  /* ── §R 되돌림 시험 ────────────────────────────────────────────────── */
  console.log('\n[§R 되돌림 시험 — 342 이전 CSS 를 사본에 주입하면 세 절이 각각 빨개진다]');
  const p2 = await ctx.newPage();
  p2.on('pageerror', () => {});
  await p2.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p2.waitForTimeout(900);
  const o = await measure(p2, true);
  const ou = o.filter((c) => !c.locked).slice(0, 2);
  const olk = o.filter((c) => c.locked && c.lkuInk && c.n <= 5);
  ok(ou.some((c) => Math.abs(c.nmInk.y - R.nmInkTop) > 2),
    `R-a 옛 CSS 에서 §1 이 빨갛다 — 잉크 상변 ${ou.map((c) => c.nmInk.y).join('/')} ≠ 44`);
  ok(ou.some((c) => Math.abs(c.pill.y - c.nmInk.y - c.nmInk.h - R.gap) > 3),
    `R-b 옛 CSS 에서 §2 가 빨갛다 — 간격 ${ou.map((c) => (c.pill.y - c.nmInk.y - c.nmInk.h).toFixed(1)).join('/')} ≠ 26~27`);
  ok(ou.some((c) => Math.abs(c.pill.x + c.pill.w - c.pillInk.x - c.pillInk.w - R.padR) > 8),
    `R-c 옛 CSS 에서 §3 이 빨갛다 — 우측 여백 ${ou.map((c) => (c.pill.x + c.pill.w - c.pillInk.x - c.pillInk.w).toFixed(1)).join('/')} ≠ 51`);
  ok([...new Set(o.map((c) => Math.round(c.pill.w)))].length < 3,
    `R-d 옛 CSS 에서 «감싼다» 항이 빨갛다 — 폭 ${[...new Set(o.map((c) => Math.round(c.pill.w)))].join(',')} (고정)`);
  ok(olk.some((c) => Math.abs(c.lkuInk.y - R.lkTop) > 2 || Math.abs(c.lkuInk.h - R.lkH) > 2.5),
    `R-e 옛 CSS 에서 §4 가 빨갛다 — 상변/높이 ${olk.map((c) => c.lkuInk.y + '/' + c.lkuInk.h).join(' · ')} ≠ 223/41`);
  ok(ou.some((c) => Math.abs(c.lbA.h - 24) > 2 || Math.abs(c.lbB.h - 26) > 2),
    `R-f 옛 CSS 에서 §5 가 빨갛다 — 라벨 잉크 높이 ${ou.map((c) => c.lbA.h + '/' + c.lbB.h).join(' · ')} ≠ 24/26`);
  ok(ou.some((c) => Math.abs((c.spLv.y - c.lbA.y - c.lbA.h) - 5) > 2),
    `R-g 옛 CSS 에서 라벨↔알약 간격이 빨갛다 — ${ou.map((c) => (c.spLv.y - c.lbA.y - c.lbA.h).toFixed(1)).join('/')} ≠ 5`);
  ok(ou.some((c) => c.nmGap !== null && Math.abs(c.nmGap - 25) > 5),
    `R-h 옛 CSS 에서 어절 공백이 빨갛다 — ${ou.map((c) => c.nmGap).join('/')} ≠ 24~26`);
  ok(ou.some((c) => Math.abs(c.spLvI.h - 28) > 1.5 || Math.abs(+c.spLvI.x - 151) > 1.5),
    `R-i 옛 CSS 에서 §6 이 빨갛다 — 레벨 숫자 좌/높이 ${ou.map((c) => c.spLvI.x + '/' + c.spLvI.h).join(' · ')} ≠ 151/28`);
  ok(ou.some((c) => {
    const t = +c.pillInk.y - c.pill.y, b2 = (c.pill.y + c.pill.h) - (+c.pillInk.y + c.pillInk.h);
    return Math.abs(t - b2) > 3;
  }), `R-j 옛 CSS 에서 §7 이 빨갛다 — 캡슐 상/하 ${ou.map((c) => (+c.pillInk.y - c.pill.y).toFixed(1) + '/' + ((c.pill.y + c.pill.h) - (+c.pillInk.y + c.pillInk.h)).toFixed(1)).join(' · ')} 비대칭 아님`);

  ok(olk.some((c) => Math.abs((+c.lkuInk.x + c.lkuInk.w / 2) - R.lkCx) > 1),
    `R-k 옛 CSS 에서 잠금 문구 중심이 빨갛다 — ${olk.map((c) => (+c.lkuInk.x + c.lkuInk.w / 2).toFixed(1)).join('/')} ≠ 489`);

  console.log('\nVERIFY342 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
