/* A4 — 스킬 슬롯 아이콘 «글리프 잉크 bbox» 실측기.
   실행: node tools/inkA4.js            → 전 스킬(SK) 아이콘의 현재 잉크 w×h 를 찍는다
        node tools/inkA4.js --gate      → 게이트 모드(VERIFYA4-INK 형식으로 PASS/FAIL)
        node tools/inkA4.js --gate --inject "<css>"
                                        → 잴 규격을 흔들어 넣는다(되돌림 시험 전용 · `tools/probe361.js`)

   왜 필요한가 — «아트 자리 규칙»: 이모지로 대체한 요소는 **레퍼런스 bbox 를 정확히 차지**해야
   나중에 이미지로 교체만 하면 된다. 레퍼런스 실측(측정표 §3)은 **68 × 85**.

   ⚑ 판정 목표 (작업 741, 2026-09-01 — 356 이관):
   356(주인 지시 2026-08-29 «아이콘은 원본 비율 · 비균등 scaleX 금지»)이 `.si3` 의 `scaleX(.842)` 를
   font-size 로 흡수했다(78.3 → **65.9px**, 등방). 등방으로는 «폭 68 · 높이 85» 를 **동시에** 만들 수 없어
   356 은 규칙대로 «작은 쪽» 을 골랐고 ⇒ 폭은 68 그대로(Δ0)·높이는 **85 × .842 = 71.6** 이 된다.
   그래서 **판정의 세로 목표는 71.6**(`REF_H`)이고, 레퍼런스 아트 bbox **85**(`REF_H_ART`)는
   «아트 대기» 로 표에만 남는다 — 이모지 실루엣과 ref 일러스트의 종횡비 차라 CSS 로는 못 메운다.
   `tools/verifyA4.js` [3] 이 2026-08-29 에 이미 같은 이관을 했는데(120~122행 주석) **이 자만 안 따라와서**
   기준선이 4/5 로 빨갰다(작업 741). ⚠ **`REF_W` 68 · 아트 bbox 85 는 재측정한 것이 아니다** —
   바뀐 것은 «85 의 어느 쪽을 판정에 쓰는가» 뿐이고, 71.6 은 85 에서 356 의 배율로 파생된 값이다.
   ⚠ 종횡비 항(«찌그러짐 0»)은 `verifyA4` [3] 이 소유한다 — 여기 또 세우지 않는다(자가 둘이면 둘이 어긋난다).

   ⚑ 판정 축 (작업 361, 2026-08-28 — 그 전에는 «글리프별 ±12%» 였다):
   이모지는 **글리프마다 잉크비가 다르다**(🩸 −28% · 🔻 −42%). 그래서 A4 가 못 박은 설계는
   «fs 하나로 칸마다 맞추기» 가 아니라 **«전 종 평균 잉크를 68×85 에 정규화»** 다
   (측정표 §3 «아트 필요» 행 · `.si3` 주석 · §4-2 «글리프별 side bearing 은 폰트 몫 —
   CSS 로 회수하지 마라» = 칸별 보정은 357·356 이 금지한 비균등 보정이다).
   옛 «글리프별 ±12%» 단언은 **칸마다 다른 배율을 넣지 않는 한 초록이 될 수 없는 단언**이라
   22/27 로 영원히 빨갰고, 그래서 «빨강» 이 신호를 잃었다. 판정은 설계와 같은 **평균 축**으로 하고,
   글리프별 이탈은 **보고 전용 표**로 남긴다(A4 가 «아트 대기» 로 분류해 둔 몫).
   ⚠ 허용 오차를 넓혀 초록으로 만든 것이 아니다 — 평균 축은 ±5% 로 **옛 ±12% 보다 좁고**,
     `tools/probe361.js` 의 되돌림 시험이 «fs·scaleX 를 흔들면 이 게이트가 빨개진다» 를 못박는다.

   측정 방법: 실제 `.si3` 규격 그대로 오프스크린에 글자를 그리고, 캔버스 알파로 잉크 bbox 를 잡는다.
   (DOM 의 getBoundingClientRect 는 글리프 advance 박스라 «잉크» 가 아니다 — A1 이 밟은 함정) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const GATE = process.argv.includes('--gate');
const REF_W = 68;               // 측정표 §3 (재측정 금지)
const REF_H_ART = 85;           // 측정표 §3 의 레퍼런스 아트 bbox — 보고 전용(«아트 대기»)
const REF_H = +(REF_H_ART * 0.842).toFixed(1);  // = 71.6 · 356 의 등방 배율로 파생(판정 목표)
const AVG_TOL = 5;              // 평균 축 허용 오차(%) — 설계 «평균 정규화» 의 폭
const REPORT_TOL = 12;          // 글리프별 표에만 쓰는 눈금(판정 아님 — 옛 게이트의 그 값)
const MIN_N = 24;               // 측정표 §3 이 «24종 평균» 으로 못 박은 표본 하한
const iIdx = process.argv.indexOf('--inject');
const INJECT = iIdx > -1 ? process.argv[iIdx + 1] || '' : '';

(async () => {
  const b = await launch(chromium);
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);
  /* 되돌림 시험용 규격 흔들기 — 게이트가 «잴 값을 실제로 움직이는 손잡이» 를 지나는지 본다
     (LESSONS 229-④ · 240-② : 손잡이가 빗나간 되돌림 시험은 «초록» 을 낸다) */
  if (INJECT) { await p.addStyleTag({ content: INJECT }); await p.waitForTimeout(50); }

  const rows = await p.evaluate(() => {
    /* `.si3` 의 실효 스타일을 그대로 읽어 캔버스에 재현한다 */
    const probe = document.createElement('span');
    probe.className = 'si3';
    const host = document.createElement('div');
    host.className = 'slot2';
    host.style.position = 'absolute'; host.style.left = '-9999px';
    const well = document.createElement('div'); well.className = 'cdw';
    well.appendChild(probe); host.appendChild(well); document.body.appendChild(host);
    const cs = getComputedStyle(probe);
    const fs = parseFloat(cs.fontSize);
    const fam = cs.fontFamily;
    const tr = cs.transform;                       // scale 이 걸려 있으면 여기 잡힌다
    /* ⚑ 361: 옛 코드는 matrix 의 **첫 성분(a = scaleX)만** 읽어 세로 배율에 눈이 멀어 있었다 —
       `scaleY` 로 잉크를 늘려도 h 축이 그대로였다(probe361 N3 가 이 자리를 못박는다).
       d(= scaleY) 도 같이 읽어 잰 h 에 곱한다. 지금 `.si3` 는 scaleX 만이라 sy = 1 이다. */
    let sx = 1, sy = 1;
    if (tr && tr !== 'none') {
      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) { const v = m[1].split(',').map(parseFloat); if (v.length >= 4) { sx = v[0]; sy = v[3]; } }
    }
    document.body.removeChild(host);

    const S = 300;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    const out = [];
    const ids = Object.keys(SK);
    for (const id of ids) {
      const ch = SK[id].ic;
      g.clearRect(0, 0, S, S);
      g.font = fs + 'px ' + fam;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, S / 2, S / 2);
      const d = g.getImageData(0, 0, S, S).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (d[(y * S + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { out.push({ id, ch, w: 0, h: 0 }); continue; }
      out.push({ id, ch, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return { fs, sx, sy, fam, out };
  });
  await b.close();

  const { fs, sx, sy, out } = rows;
  console.log('.si3 font-size = ' + fs + 'px · 적용 중인 scaleX = ' + sx.toFixed(3) +
    ' · scaleY = ' + sy.toFixed(3) +
    (INJECT ? '   [--inject 적용됨: ' + INJECT + ']' : ''));
  console.log('판정 목표 잉크 = ' + REF_W + ' × ' + REF_H +
    ' (측정표 §3 의 ' + REF_W + '×' + REF_H_ART + ' 에 356 등방 배율 .842 를 적용 — 세로 ' + REF_H_ART + ' 는 «아트 대기»)');
  console.log('판정 축 = **전 종 평균** ±' + AVG_TOL + '%  · 글리프별 ±' + REPORT_TOL + '% 는 보고 전용(아트 대기)\n');
  console.log('| 스킬 | 글리프 | 잉크 w×h (scaleX·scaleY 적용) | 목표 대비 w | 목표 대비 h | 표(±' + REPORT_TOL + '%) |');
  console.log('|---|---|---|---|---|---|');
  let outl = 0, tot = 0, zero = 0;
  const ws = [], hs = [], outIds = [], zeroIds = [];
  for (const r of out) {
    const w = r.w * sx, h = r.h * sy;
    ws.push(w); hs.push(h);
    const dw = (w / REF_W - 1) * 100, dh = (h / REF_H - 1) * 100;
    tot++;
    const over = Math.abs(dw) > REPORT_TOL || Math.abs(dh) > REPORT_TOL;
    if (over) { outl++; outIds.push(r.id); }
    if (!(r.w > 0 && r.h > 0)) { zero++; zeroIds.push(r.id); }
    console.log('| ' + r.id + ' | ' + r.ch + ' | ' + w.toFixed(1) + ' × ' + h.toFixed(1) +
      ' | ' + (dw >= 0 ? '+' : '') + dw.toFixed(1) + '% | ' + (dh >= 0 ? '+' : '') + dh.toFixed(1) + '%' +
      ' | ' + (over ? '이탈(글리프 잉크비)' : '·') + ' |');
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const mw = avg(ws), mh = avg(hs);
  const dW = (mw / REF_W - 1) * 100, dH = (mh / REF_H - 1) * 100;
  console.log('\n평균 잉크 ' + mw.toFixed(1) + ' × ' + mh.toFixed(1) +
    '  (목표 대비 w ' + dW.toFixed(1) + '% · h ' + dH.toFixed(1) + '%)');
  console.log('권장 scaleX = ' + (REF_W / (mw / sx)).toFixed(3) + '  · 권장 font-size = ' +
    (fs * REF_H / (mh / sy)).toFixed(1) + 'px');
  console.log('글리프별 ±' + REPORT_TOL + '% 이탈 ' + outl + '종' +
    (outl ? ' — ' + outIds.join(', ') + ' (글리프 고유 잉크비 · 아트 교체 몫 · 판정 아님)' : ''));
  /* ⚑ 741 — 기계가 읽는 줄 하나. `tools/probe361.js` 는 흔들 배율의 «밑» 을 상수로 적지 않고
     여기서 읽는다(730 처방: 자가 «제품이 지금 어떻게 생겼나» 를 박아 두면 다음 규격 변경에 부패한다).
     toFixed 로 뭉갠 표시용 값이 아니라 **원값**을 준다 — 반올림한 밑에 배율을 곱하면 밴드 가장자리에서 갈린다. */
  console.log('SPEC fs=' + fs + ' sx=' + sx + ' sy=' + sy + ' mw=' + mw + ' mh=' + mh +
    ' refW=' + REF_W + ' refH=' + REF_H + ' refHart=' + REF_H_ART + ' tol=' + AVG_TOL);
  if (GATE) {
    /* 판정은 설계와 같은 축 셋뿐이다 — ①전제(표본이 실제로 그려졌는가) ②평균 w ③평균 h */
    let pass = 0, fail = 0;
    const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
    console.log('\n── [1] 전제 — 표본 ' + '─'.repeat(44));
    ok(tot >= MIN_N, '스킬 표본 ' + tot + '종 ≥ ' + MIN_N + '종 (측정표 §3 «24종 평균»)');
    ok(zero === 0, '잉크 0 인 글리프 없음' + (zero ? ' — 실제 ' + zero + '/' + tot + '종이 안 그려졌다: ' + zeroIds.join(', ') : ' (' + tot + '종 전부 그려졌다)'));
    ok(sx > 0 && sy > 0 && fs > 0, '.si3 규격을 읽었다 (fs ' + fs + 'px · scaleX ' + sx.toFixed(3) + ' · scaleY ' + sy.toFixed(3) + ')');
    console.log('\n── [2] 축 — 평균 잉크 정규화 (설계: 측정표 §3) ' + '─'.repeat(18));
    ok(Math.abs(dW) <= AVG_TOL, '평균 잉크 w ' + mw.toFixed(1) + ' = 목표 ' + REF_W +
      ' ±' + AVG_TOL + '% (실측 ' + (dW >= 0 ? '+' : '') + dW.toFixed(1) + '%)');
    ok(Math.abs(dH) <= AVG_TOL, '평균 잉크 h ' + mh.toFixed(1) + ' = 목표 ' + REF_H +
      ' ±' + AVG_TOL + '% (실측 ' + (dH >= 0 ? '+' : '') + dH.toFixed(1) + '%)');
    console.log('\nVERIFYA4-INK ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
    process.exit(fail ? 1 : 0);
  }
})();
