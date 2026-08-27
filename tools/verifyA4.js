/* A4 스킬 슬롯 — 회귀 게이트.  실행: node tools/verifyA4.js  → `VERIFYA4 n/m PASS|FAIL`
   측정표 `docs/measure/A4-스킬슬롯.md` 의 확정값을 DOM·계산스타일·글리프 잉크로 단언한다.
   126(서체)·60(쥬시)·125(아이콘) 처럼 남의 작업이 이 구간을 스치면 여기가 먼저 빨개진다.

   ⚠ 무엇을 재는 값인지 (A3-ⓔ «마스크가 다르면 다른 것을 잰다»):
     · 링 반지름은 **CSS 기하**(요소 inset·spread)이지 스크린샷 마스크가 아니다.
       스크린샷으로 재면 경계 AA 때문에 양끝이 0.5~1px 씩 깎여 나온다(scanA4b 참고).
     · 아이콘 «잉크» 는 캔버스 알파 bbox 다 — getBoundingClientRect 의 advance 박스가 아니다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let ok = 0, tot = 0;
const fails = [];
function eq(name, got, want, tol) {
  tot++;
  const pass = Math.abs(got - want) <= (tol || 0);
  if (pass) ok++; else fails.push(name + ': ' + got + ' (기대 ' + want + '±' + (tol || 0) + ')');
}
function is(name, got, want) {
  tot++;
  if (String(got) === String(want)) ok++; else fails.push(name + ': ' + got + ' (기대 ' + want + ')');
}

(async () => {
  const b = await launch(chromium);
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);

  const d = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.eqSkill = Object.keys(SK).slice(0, 3).concat([null, null, null, null, null]).slice(0, 8);
    buildSlots();
    const sl = Array.prototype.slice.call(document.querySelectorAll('#slots .slot2'));
    sl.forEach((e, i) => e.classList.toggle('ready', i === 0));
    const r = e => e.getBoundingClientRect();
    const box = document.getElementById('slots');
    const rects = sl.map(e => { const q = r(e); return { x: +q.x.toFixed(1), y: +q.y.toFixed(1), w: +q.width.toFixed(1), h: +q.height.toFixed(1) }; });
    const cs = e => getComputedStyle(e);
    const px = v => parseFloat(v) || 0;
    const cdw = sl[0].querySelector('.cdw');
    const si3 = sl[0].querySelector('.si3');
    const lk = sl[4].querySelector('.lk');
    const bdg = sl[0].querySelector('.lvv2');
    const tab = r(document.getElementById('tabbar'));

    /* 글리프 잉크 — `.si3` 의 실효 fs·서체·scaleX 로 캔버스에 그려 알파 bbox 를 잡는다 */
    const c3 = cs(si3), fs = px(c3.fontSize);
    let sx = 1; const m = (c3.transform || '').match(/matrix\(([^,]+)/); if (m) sx = parseFloat(m[1]);
    const SZ = 320, cv = document.createElement('canvas'); cv.width = SZ; cv.height = SZ;
    const g = cv.getContext('2d');
    const ink = ch => {
      g.clearRect(0, 0, SZ, SZ); g.font = fs + 'px ' + c3.fontFamily;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, SZ / 2, SZ / 2);
      const a = g.getImageData(0, 0, SZ, SZ).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (a[(y * SZ + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      return x1 < 0 ? [0, 0] : [(x1 - x0 + 1) * sx, y1 - y0 + 1];
    };
    const all = Object.keys(SK).map(k => ink(SK[k].ic));
    const avg = i => all.reduce((a, v) => a + v[i], 0) / all.length;

    return {
      n: sl.length, rects, boxRect: { x: r(box).x, w: r(box).width },
      rowBottom: rects[0].y + rects[0].h, tabTop: tab.y,
      cdwInset: px(cs(cdw).insetInlineStart || cs(cdw).left),
      cdwW: r(cdw).width,
      lockCdwW: r(sl[4].querySelector('.cdw')).width,
      lockCdwInset: px(cs(sl[4].querySelector('.cdw')).left),
      eqShadow: cs(sl[1]).boxShadow,
      eqCdwW: r(sl[1].querySelector('.cdw')).width,
      eqTop: px(cs(sl[1]).top),
      readyGlow: cs(sl[0]).boxShadow, cdwRing: cs(cdw).boxShadow,
      readyAfter: getComputedStyle(sl[0], '::after').inset || getComputedStyle(sl[0], '::after').top,
      radius: cs(sl[0]).borderRadius,
      inkW: avg(0), inkH: avg(1), fs, sx,
      lkFs: px(cs(lk).fontSize), lkTr: cs(lk).transform,
      lkDy: (function () { const m = (cs(lk).transform || '').match(/matrix\([^)]*,\s*([-\d.]+)\)$/); return m ? parseFloat(m[1]) : 999; })(),
      bdgW: r(bdg).width, bdgH: r(bdg).height,
      bdgCy: (r(bdg).y + r(bdg).height / 2) - (rects[0].y + rects[0].h / 2),
      bdgOut: (r(bdg).y + r(bdg).height) - (rects[0].y + rects[0].h),
      si3Parent: si3.parentElement.className,
      cdwOverflow: cs(cdw).overflow,
      lockCount: document.querySelectorAll('#slots .lk').length,
      readyCount: document.querySelectorAll('#slots .slot2.ready').length
    };
  });
  await b.close();

  /* ---- [1] 행 기하 (측정표 §0·§1) ---- */
  is('슬롯 개수', d.n, 8);
  eq('외곽 지름 w', d.rects[0].w, 118, 0.3);
  eq('외곽 지름 h', d.rects[0].h, 118, 0.3);
  for (let i = 1; i < 8; i++) eq('pitch ' + i + '→' + (i + 1), d.rects[i].x - d.rects[i - 1].x, 130, 0.5);
  eq('gap', d.rects[1].x - (d.rects[0].x + d.rects[0].w), 12, 0.3);
  eq('좌 여백', d.rects[0].x, 27.5, 0.8);
  eq('우 여백', 1080 - (d.rects[7].x + d.rects[7].w), 24.5, 0.8);
  eq('행 하단 → 탭바 상단', d.tabTop - d.rowBottom, 26, 1.5);
  is('정원', d.radius, '50%');

  /* ---- [2] 링 4겹 (측정표 §2) ---- */
  /* 잠금칸 = 기본 링대 (well 89.06 · 3.55 · 7.31 · 3.53 · 외곽 117.84) */
  eq('잠금칸 well 지름', d.lockCdwW, 89.3, 0.3);
  eq('잠금칸 well inset (링대 14.35)', d.lockCdwInset, 14.35, 0.2);
  /* 장착칸 = 레퍼런스가 2.2px 크게 그린다 (well 87.61 · 4.17 · 7.92 · 4.11 · 외곽 120.00).
     레이아웃 상자는 그대로 117.8 이고 커지는 1.1px 은 바깥 box-shadow 로 뻗는다 (측정표 §7-2) */
  eq('장착칸 well 지름', d.eqCdwW, 87.6, 0.3);
  /* 활성 글로우는 «정원이 아니다» — 대각선으로 어긋난 그림자 4겹의 합집합이라야 REF 의 비원형이 난다 */
  tot++; if ((d.readyGlow.match(/4\.8px/g) || []).length >= 4) ok++;
  else fails.push('활성 글로우 4겹 대각 오프셋(±4.8px) 아님: ' + d.readyGlow);
  tot++; if (/2\.09px/.test(d.readyGlow)) ok++; else fails.push('활성 글로우 spread 2.09px 아님: ' + d.readyGlow);
  tot++; if (/6\.4px/.test(d.cdwRing)) ok++; else fails.push('활성 안쪽 노란 링 6.4px: ' + d.cdwRing);

  /* ---- [3] 아이콘 잉크 (측정표 §3 — 68×85, 아트 자리 규칙) ---- */
  eq('아이콘 평균 잉크 w', +d.inkW.toFixed(1), 68, 4);
  eq('아이콘 평균 잉크 h', +d.inkH.toFixed(1), 85, 4);
  is('아이콘은 well 안쪽 자식 (링 뚫림 방지)', d.si3Parent, 'cdw');
  is('well 클립', d.cdwOverflow, 'hidden');

  /* ---- [4] 상태 3종 ---- */
  is('잠금 자물쇠 5칸', d.lockCount, 5);
  is('활성 1칸', d.readyCount, 1);
  eq('자물쇠 font-size', d.lkFs, 64, 0.5);
  tot++; if (/0\.8[,)]/.test(d.lkTr)) ok++; else fails.push('자물쇠 scaleY .8: ' + d.lkTr);
  eq('자물쇠 세로 오프셋', d.lkDy, -1.5, 0.2);
  tot++; if (/1\.15px/.test(d.eqShadow)) ok++; else fails.push('장착칸 지름 단차(외곽 확장 1.15px) 아님: ' + d.eqShadow);
  eq('장착칸 세로 오프셋 (REF 는 장착칸을 조금 낮게 앉힌다)', d.eqTop, 0.45, 0.1);

  /* ---- [5] 하단 뱃지 (측정표 §2 «펫/동료 머리 뱃지») ---- */
  /* 레퍼런스 뱃지는 정원이 아니라 «가로로 누운» 43×39 (비평가 N·P 독립 일치) */
  eq('뱃지 외곽 폭', d.bdgW, 43.5, 0.5);
  eq('뱃지 외곽 높이', d.bdgH, 40.1, 0.5);
  eq('뱃지 하단 돌출', d.bdgOut, 9.8, 0.5);
  eq('뱃지 중심 (슬롯 중심 기준)', d.bdgCy, 48.8, 0.5);
  /* 활성칸 앰버 링은 대기칸 링보다 두껍다 (REF 활성 8.22~8.40 vs 대기 7.90~8.15) */
  tot++; if (/11\.41px/.test(d.readyAfter)) ok++; else fails.push('활성 앰버 링 ::after inset 11.41px: ' + d.readyAfter);

  if (fails.length) { console.log('실패 항목:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log('VERIFYA4 ' + ok + '/' + tot + ' ' + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
