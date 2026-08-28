/* 작업 72 회귀 게이트 — 03 던전 카드 우측 썸네일 슬롯.
   실행: node tools/verify72.js   → 마지막 줄이 `VERIFY72 n/n PASS` 여야 한다.
   본다: ① 카드 5장 전부 슬롯이 있고 기하가 레퍼런스 실측(카드 안쪽 우측 315×334)과 일치
        ② 슬롯이 클릭을 먹지 않는다(pointer-events:none) — 카드 진입이 살아 있어야 한다
        ③ z 순서: 썸네일이 프레임(.fr)·텍스트·잠금 딤(.lk) «아래»
        ④ 잠금 카드는 썸네일도 딤 아래로 들어간다
        ⑤ 콘솔 에러 0 */
/* 110 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 복붙돼 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린 /opt/pw-browsers,
   빌드 번호 불일치)에서 즉사한다 — 실제로 이 게이트가 그래서 못 돌았다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  /* 97 §5 가 캔버스 잉크를 읽는다 — file:// 이미지는 캔버스를 오염시켜 getImageData 가 막힌다 */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const d = await p.evaluate(() => {
    const lum = (css) => {                        /* 'rgb(r, g, b)' → 휘도 */
      const m = String(css).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      return m ? Math.round(+m[1] * .299 + +m[2] * .587 + +m[3] * .114) : null;
    };
    const cards = [...document.querySelectorAll('#dunList .dnc')];
    return cards.map((c) => {
      const cr = c.getBoundingClientRect();
      const th = c.querySelector('.th');
      if (!th) return { th: null };
      const tr = th.getBoundingClientRect();
      const kids = [...c.children].map((e) => e.className);
      const cs = getComputedStyle(th);
      const cv = th.querySelector('canvas.thcv');
      /* 72(2026-08-26) — 액자 안 그림. «자리를 잡았다» 와 «자리를 채웠다» 는 다르므로(LESSONS 72-③)
         잉크 bbox 와 평균 휘도를 실제 픽셀에서 잰다. */
      let art = null;
      if (cv) {
        const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, on = 0, L = 0;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          const i = (y * cv.width + x) * 4;
          if (im[i + 3] > 8) {
            on++; L += im[i] * .299 + im[i + 1] * .587 + im[i + 2] * .114;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
        /* ⚠ getBoundingClientRect 는 121 들썩의 `scale`(±4%)이 섞여 실제 레이아웃 크기가 아니다.
           offsetWidth/Height 로 잰다(변환 전 값). */
        const cs2 = getComputedStyle(cv);
        /* 원본 프레임의 «잉크» bbox — contain 이 늘리지 않았는지(종횡 왜곡 0) 재려면 필요하다 */
        const A = ATLAS[cv.dataset.thk], fr = A && A.f[cv._fr || cv.dataset.thf];
        let src = null;
        if (A && A.image && fr) {
          const t = document.createElement('canvas');
          t.width = fr[2]; t.height = fr[3];
          const tg = t.getContext('2d');
          tg.imageSmoothingEnabled = false;
          tg.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
          const td = tg.getImageData(0, 0, t.width, t.height).data;
          let a0 = 1e9, b0 = 1e9, a1 = -1, b1 = -1;
          for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
            if (td[(y * t.width + x) * 4 + 3] > 8) {
              if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
          }
          src = { fw: fr[2], fh: fr[3], w: a1 - a0 + 1, h: b1 - b0 + 1 };
        }
        art = { px: [cv.width, cv.height], css: [cv.offsetWidth, cv.offsetHeight],
                k: cv.dataset.thk, f: cv._fr || cv.dataset.thf, i: cv.dataset.thi,
                /* 245 — 설계값 «시작 프레임». `f` 는 «지금 그려진 프레임» 이라 시간에 흔들린다. */
                f0: cv.dataset.thf, src,
                on, ink: on ? { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null,
                lum: on ? Math.round(L / on) : null,
                bob: cs2.animationName, org: cs2.transformOrigin,
                piv: cs2.getPropertyValue('--thpiv').trim() };
      }
      return {
        id: c.dataset.dcard || '',
        th: { dx: +(tr.left - cr.left).toFixed(1), dy: +(tr.top - cr.top).toFixed(1), w: +tr.width.toFixed(1), h: +tr.height.toFixed(1) },
        pe: cs.pointerEvents,
        frm: { bw: parseFloat(cs.borderTopWidth), r: parseFloat(cs.borderTopLeftRadius),
               sh: cs.boxShadow, face: lum(cs.backgroundColor) },
        art,
        iTh: kids.indexOf('th'), iSh: kids.indexOf('sh'), iFr: kids.indexOf('fr'), iLk: kids.indexOf('lk'),
        locked: !!c.querySelector('.lk'),
        card: { w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) }
      };
    });
  });

  /* 카드별 기대 슬롯 — 레퍼런스 실측(비평가 O·P 교차 확인): 카드1 x712 rel top 36 / 카드2 x726 rel top 52.
     잠금 카드 3~6 은 개별 측정이 불가(딤)해 카드1·2 중간값(폭 305 · top 42)을 쓴다.
     ⚠ 2026-08-26(97): 작업 90 이 던전을 5장 → **6장**(골드·다이아·유물조각 4단)으로 재편하면서
     이 기대치가 5장에 멈춰 있어 게이트가 `EXP[5] undefined` 로 즉사하고 있었다(90 은 verify90 만 돌렸다).
     구성 변경이 게이트를 앞지른 것이라 카드 수만 따라 올린다 — 기하 자체는 relic 3종과 같다.
     ⚠ 2026-08-27(194): 강화석 던전(`stone`)이 7번째로 붙어 **같은 일이 또 났다.** 기하는 relic 과 같다
     (`thw 330 · tht 11`). 이번에는 개수 단언도 `EXP.length` 로 돌려 다음 던전에서 즉사하지 않게 한다.
     ⚠ 2026-08-27(203): 룬강화석 던전(`rstone`)이 8번째. 기하는 역시 relic·stone 과 같은 330/11 이라
     이 표에 같은 줄을 한 줄 더할 뿐이다 — 던전이 늘면 여기도 같이 는다.
     ⚠⚠ **2026-08-27(259, 저장소 주인 보고 «황금 동굴·수정 광산 액자만 작고 위치도 어긋난다»):
     카드 1·2 의 311×305/36 · 296×289/52 를 폐기하고 8장 전부 330×330/11 로 통일했다.**
     그 두 값은 72 1~2회차가 레퍼런스의 «흘러넘치는 일러스트» bbox 를 카드별로 옮긴 것인데,
     주인 재지시(2026-08-26)로 성격이 «액자에 담긴 그림» 으로 바뀐 뒤로는 카드마다 다를 이유가 없다.
     이제 이 표는 **전 행 동일**이므로, 한 줄만 어긋나면 그것이 곧 회귀다.
     ⚠ 레이드·아레나(`REXP`, 아래 [5])는 97 «꽉 채우기» 라 **별개**이고 311/36·296/52 그대로다. */
  const DUN_SLOT = { w: 330, h: 330, dy: 11 };
  const EXP = Array.from({ length: 8 }, () => DUN_SLOT);
  console.log('[1] 슬롯 기하 — 카드 안쪽 우측 정렬(우단 inset 7), 8장 공통 폭·상단 인셋(259)');
  ok(d.length === EXP.length, `카드 ${EXP.length}장 (실제 ${d.length})`);
  d.forEach((c, i) => {
    ok(!!c.th, `카드${i + 1} 썸네일 슬롯 존재`);
    if (!c.th) return;
    const e = EXP[i];
    ok(Math.abs(c.th.w - e.w) <= 1 && Math.abs(c.th.h - e.h) <= 1, `카드${i + 1} 슬롯 ${c.th.w}×${c.th.h} = ${e.w}×${e.h}`);
    ok(Math.abs(c.th.dx - (980 - 7 - e.w)) <= 1, `카드${i + 1} 슬롯 x offset ${c.th.dx} = ${980 - 7 - e.w} (우측 안쪽 정렬)`);
    ok(Math.abs(c.th.dy - e.dy) <= 1, `카드${i + 1} 슬롯 y offset ${c.th.dy} = ${e.dy}`);
  });
  /* 259 — 주인 지적의 본체는 «표와 맞느냐» 가 아니라 «카드끼리 같으냐» 다. 위 표를 8장 다 같이
     바꿔 버리면 표 단언은 통과하므로, 행끼리 직접 대조하는 줄을 따로 둔다(액자는 격자의 부품이다). */
  const th = d.map((c) => c.th).filter(Boolean);
  if (th.length) {
    const sp = (f) => +(Math.max(...th.map((t) => t[f])) - Math.min(...th.map((t) => t[f]))).toFixed(1);
    ok(sp('w') <= 1, `259 — 던전 8장 슬롯 «폭» 이 전부 같다 (최대차 ${sp('w')}px ≤ 1)`);
    ok(sp('h') <= 1, `259 — 던전 8장 슬롯 «높이» 가 전부 같다 (최대차 ${sp('h')}px ≤ 1)`);
    ok(sp('dx') <= 1, `259 — 던전 8장 슬롯 «좌단 x» 가 전부 같다 (최대차 ${sp('dx')}px ≤ 1)`);
    ok(sp('dy') <= 1, `259 — 던전 8장 슬롯 «상단 y» 가 전부 같다 (최대차 ${sp('dy')}px ≤ 1)`);
  }

  /* ───── 72 주인 재지시(2026-08-26) — 액자 + 실제 스프라이트 ─────
     ① 이모지 대체물 폐기 → 스프라이트 캔버스. ② 슬롯이 69 아이템 칸처럼 «액자» 로 읽힌다
     (테두리·림 두께·코너 비율은 104 공용 토큰 --if-bw 5 / --if-rim 6 / --if-rr .233).
     ③ 그림은 늘리지 않고 담는다(contain) — 종횡비 왜곡 0. ④ 카드가 전부 서로 다른 아트다. */
  const IF_BW = 5, IF_RIM = 6, IF_RR = .233, PAD = 16;
  console.log('[1-1] 액자 — 104 공용 아이템 프레임 토큰(테두리 5 · 림 6 · 코너 폭×.233)');
  d.forEach((c, i) => {
    if (!c.th) return;
    const e = EXP[i];
    ok(Math.abs(c.frm.bw - IF_BW) <= 0.5, `카드${i + 1} 검정 테두리 ${c.frm.bw}px = ${IF_BW}px (--if-bw)`);
    ok(Math.abs(c.frm.r - e.w * IF_RR) <= 1.5,
       `카드${i + 1} 코너 ${c.frm.r}px = ${(e.w * IF_RR).toFixed(1)}px (폭 ${e.w} × ${IF_RR})`);
    ok(new RegExp(`inset[^,]*\\b${IF_RIM}px`).test(c.frm.sh) || /inset/.test(c.frm.sh),
       `카드${i + 1} 안쪽 림 inset box-shadow 있음`);
    ok(c.frm.face !== null, `카드${i + 1} 액자 면 색이 있다 (휘도 ${c.frm.face})`);
  });

  console.log('[1-2] 액자 안 그림 — 실제 스프라이트 캔버스(이모지 폐기)');
  const seen = new Set();
  d.forEach((c, i) => {
    if (!c.th) return;
    const e = EXP[i], a = c.art;
    ok(!!a, `카드${i + 1} 스프라이트 캔버스 존재(이모지 아님)`);
    if (!a) return;
    /* 캔버스 픽셀 = 액자 안쪽(슬롯 − 테두리 − 림, 양변) → 배율 1 에서 1:1 이라 안 흐려진다 */
    const iw = e.w - (IF_BW + IF_RIM) * 2, ih = e.h - (IF_BW + IF_RIM) * 2;
    ok(a.px[0] === iw && a.px[1] === ih, `카드${i + 1} 캔버스 픽셀 ${a.px} = [${iw},${ih}] (액자 안쪽)`);
    ok(Math.abs(a.css[0] - iw) <= 1 && Math.abs(a.css[1] - ih) <= 1,
       `카드${i + 1} 캔버스 CSS ${a.css} = 픽셀 크기 (1:1 — 확대 보간 없음)`);
    ok(a.on > 0, `카드${i + 1} 스프라이트가 실제로 그려졌다 (${a.k}/${a.f}, 잉크 ${a.on}px)`);
    if (!a.ink || !a.src) return;
    /* contain — 사방 여백 ≥ PAD−1 (액자 안이고, 121 들썩이 아래로 15px 내려가도 안 잘린다) */
    const mL = a.ink.x0, mT = a.ink.y0, mR = a.px[0] - 1 - a.ink.x1, mB = a.px[1] - 1 - a.ink.y1;
    ok(Math.min(mL, mT, mR, mB) >= PAD - 1,
       `카드${i + 1} 사방 여백 ${[mL, mT, mR, mB]} ≥ ${PAD - 1} (액자 안, 들썩 15px 여유)`);
    /* «담았다(contain)» 를 원본과 대조해 정확히 잰다 — 배율 k 는 프레임 rect 기준이고,
       잉크는 그 안에 있으므로 기대 잉크 크기 = 원본 잉크 × k. 늘리면(=97 의 꽉 채우기) 여기서 걸린다.
       ⚠ 아틀라스 프레임은 사방에 투명 1~2px 을 갖고 있어 «잉크 = 프레임» 이 아니다 —
          그래서 여백 상한이 아니라 이 대조가 종횡 왜곡 0 의 진짜 게이트다. */
    const k = Math.min((a.px[0] - PAD * 2) / a.src.fw, (a.px[1] - PAD * 2) / a.src.fh);
    const ew = a.src.w * k, eh = a.src.h * k;
    ok(Math.abs(a.ink.w - ew) <= 2 && Math.abs(a.ink.h - eh) <= 2,
       `카드${i + 1} 종횡 왜곡 0 — 잉크 ${a.ink.w}×${a.ink.h} = 원본 ${a.src.w}×${a.src.h} × ${k.toFixed(3)} (${ew.toFixed(1)}×${eh.toFixed(1)})`);
    /* 짧은 축은 «프레임 rect» 가 액자 여백에 딱 맞는다(잉크가 아니라 — 프레임의 투명 여백만큼은 더 들어간다) */
    const slack = Math.min(a.px[0] - a.src.fw * k, a.px[1] - a.src.fh * k) / 2;
    ok(Math.abs(slack - PAD) <= 1,
       `카드${i + 1} 짧은 축이 액자를 채운다 — 프레임 여백 ${slack.toFixed(1)} = ${PAD}`);
    /* 97 [2] 는 «잉크 휘도 > 면 휘도 − 20» 이었는데, **면보다 어둡기만 안 하면 통과**라 카드1·5 가
       비율 1.00·1.11 로 «있으나 안 보이는» 상태를 통과시켰다(126 «있는데 안 보이던 줄눈» 과 같은 종류).
       비율로 바꾼다. 여기 `face` 는 `--i` 원색이고 실제 면은 그 위에 검정 22~52% 가 덮여 더 어두우므로,
       ×1.3 이면 화면에서는 ≈1.9:1 이 된다(보수적 기준). */
    ok(a.lum !== null && a.lum >= c.frm.face * 1.3,
       `카드${i + 1} 잉크 휘도 ${a.lum} ≥ 액자 면 ${c.frm.face} × 1.3 = ${(c.frm.face * 1.3).toFixed(0)} (비율 ${(a.lum / c.frm.face).toFixed(2)})`);
    ok(a.bob === 'thBob', `카드${i + 1} 들썩 애니(thBob) 붙음 (${a.bob})`);
    /* transform-origin 은 계산값이 px 로 떨어진다.
       ⚠ **121 6회차에 기준을 바꿨다: «캔버스 바닥» → «잉크 발밑».**
       이 게이트는 «캔버스는 잉크로 꽉 찬다» 를 전제로 캔버스 바닥을 요구했는데, 던전 카드는
       contain(TH_PAD) 이라 잉크 바닥이 캔버스 바닥보다 16~56px 위에 있다. 축이 발밑보다 D 아래에
       있으면 4% 스쿼시가 «제자리 압축» 이 아니라 잉크를 D×0.04 만큼 내리는 **이동**이 되고,
       121 의 들썩 진폭이 화면에서 지시값의 1.8~2.4배로 부풀었다(6회차 비평가 J ③-2 실측).
       이제 `thPlace` 가 그릴 때마다 실제 잉크 바닥을 `--thpiv` 로 내보내고 축이 그것을 쓴다.
       — «꽉 찬 캔버스» 인 경우(레이드 카드의 가로축 등)에는 두 값이 같으므로 판정이 안 느슨해진다. */
    const oy = parseFloat(a.org.split(/\s+/)[1]);
    const piv = parseFloat(a.piv);
    ok(Number.isFinite(piv) && Math.abs(oy - piv) <= 1,
       `카드${i + 1} 스쿼시 축이 «잉크 발밑» (${oy} = --thpiv ${a.piv}, 캔버스 바닥 ${a.css[1]})`);
    seen.add(a.k + '/' + a.i + '/' + a.f0);
  });
  /* ⚠ 245(2026-08-27) — 이 단언은 «지금 그려진 프레임»(`a.f` = `cv._fr`)을 비교해 **뜨고 지는 FAIL** 이었다.
     골드(dragon/fly/`f3`)와 194 강화석(dragon/fly/`f1`)은 **같은 아틀라스의 같은 애니**를 시작 프레임만
     달리해 갈라 둔 쌍이라, 8fps 아이들이 돌다 위상이 맞는 순간 «정당하게» 같은 프레임이 된다 —
     프로브 실측 **표본 120회 중 41회(34.2%)가 gold+stone → dragon/f3 충돌**(설계값 쪽은 0회).
     72 가 지키려는 것은 «카드마다 다른 그림» 이고 그것을 정하는 것은 **설계값**(아틀라스/애니/시작 프레임)
     이므로, 재는 자리를 «그려진 프레임» → «설계값» 으로 옮긴다(LESSONS 185-④ 와 같은 처방).
     ※ 아트 대기: gold·stone 은 아틀라스·애니가 같아 순환 중 실제로 같은 포즈를 지난다. 97 «없는 몬스터를
        그리지 않는다» 를 지키는 한 남는 아틀라스가 없어 CSS·게이트로는 못 푼다 — 전용 씬이 들어오면
        `DUN_UI.stone` 의 `thk/thf/thi` 세 줄만 갈아 끼운다(측정표 03 «아트 필요»). */
  ok(seen.size === d.length,
     `카드 ${d.length}장이 서로 다른 아트다 — 설계값 아틀라스/애니/시작프레임 ${seen.size}종 (${[...seen].join(' · ')})`);
  /* 같은 «아틀라스+애니» 를 쓰는 카드끼리는 시작 프레임이 반드시 갈려 있어야 한다(위 단언의 부분집합이지만,
     겹친 쌍을 이름으로 찍어 «아트 빚» 이 조용히 늘지 않게 한다). */
  const byAnim = new Map();
  d.forEach((c) => { if (!c.art) return; const k = c.art.k + '/' + c.art.i;
                     byAnim.set(k, (byAnim.get(k) || []).concat(`${c.id}:${c.art.f0}`)); });
  const dup = [...byAnim.entries()].filter(([, v]) => v.length > 1);
  console.log(`  · 아틀라스+애니 재사용 ${dup.length}쌍${dup.length ? ' — ' + dup.map(([k, v]) => `${k} = ${v.join(' vs ')}`).join(' / ') : ''} (아트 대기 등재분)`);
  dup.forEach(([k, v]) => {
    const fs = new Set(v.map((s) => s.split(':')[1]));
    ok(fs.size === v.length, `재사용 «${k}» 는 시작 프레임이 서로 다르다 (${v.join(' vs ')})`);
  });

  /* [1-3] 아이들 애니 **전 프레임**에서 안 잘린다 + **배율이 사이클 내내 하나다**(12회차 신설).
     위 [1-2] 는 «한 순간» 만 잰다. 아틀라스 애니는 프레임마다 rect 크기가 다르고
     (zombie walk 는 201×178 ~ 174×235 로 흔들린다) 한 장이 통과했다고 전부 통과가 아니다 —
     121-⑥ 이 이걸 8fps 로 돌린다.
     ⚠ 12회차 전에는 이 절이 `fitBox` 없이 다시 그려 **화면과 다른 그림을 재고 있었다**(72 8회차 경고
        «게이트가 화면과 다른 그림을 본다» 의 재발). 이제 제품과 같은 옵션으로 그린다.
     ⚠ 도는 집합은 121 의 아이들 창(`TH_IDLE`)이 있으면 창이다 — 화면에 안 나오는 프레임을 세면
        «액자를 넘는다» 가 거짓으로 뜬다. probe72k 와 같은 집합을 본다. */
  console.log('[1-3] 아이들 애니 전 프레임 — 액자 안 · 배율 불변');
  const perFrame = await p.evaluate((PAD) => {
    const out = [];
    [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')].forEach((cv, ci) => {
      const A = ATLAS[cv.dataset.thk];
      const anim = cv.dataset.thi;
      const win = (typeof TH_IDLE !== 'undefined' && TH_IDLE[cv.dataset.thk + '/' + anim]) || null;
      const list = win || (A && A.a[anim]) || [cv.dataset.thf];
      let worst = 1e9, worstFn = '', kMin = 1e9, kMax = -1, tMin = 1e9, tMax = -1;
      const keep = cv._fr;
      /* ⚠ 배율을 게이트가 **다시 계산하면 안 된다** — 그러면 «제품이 무엇으로 그렸나» 가 아니라
         «게이트가 무엇으로 그렸을까» 를 재게 되어 되돌림 시험에서도 초록으로 남는다(실제로 12회차에
         한 번 그렇게 짰다가 A/B 로 걸렸다. 279 «죽은 되돌림 시험» 과 같은 종류).
         `raidDraw(cv, pin)` 은 제품 경로 그대로이고 `thPlace` 가 `drawSpriteTo` 의 `{dx,dy,dw,dh}` 를
         돌려주므로, **화면에 실제로 그려진 크기**에서 배율을 역산한다. */
      const paint = (fn) => raidDraw(cv, fn);
      for (const fn of list) {
        const fr = A && A.f[fn];
        if (!fr) continue;
        const r = paint(fn);
        const k = (r && r.dw) ? r.dw / fr[2] : -1;
        if (k < kMin) kMin = k; if (k > kMax) kMax = k;
        const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          if (im[(y * cv.width + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) { worst = -1; worstFn = fn + '(빈 프레임)'; break; }
        const m = Math.min(x0, y0, cv.width - 1 - x1, cv.height - 1 - y1);
        if (m < worst) { worst = m; worstFn = fn; }
        if (y0 < tMin) tMin = y0; if (y0 > tMax) tMax = y0;   /* 121 축 — 잉크 top 의 p2p */
      }
      if (keep) paint(keep);
      out.push({ card: ci + 1, n: list.length, worst, worstFn, win: !!win,
                 swing: kMax > 0 ? (kMax / kMin - 1) * 100 : 0,
                 top: tMax >= 0 ? tMax - tMin : 0 });
    });
    return out;
  }, PAD);
  perFrame.forEach((f) => {
    ok(f.worst >= PAD - 1,
       `카드${f.card} 아이들 ${f.n}프레임 전부 액자 안 — 최소 여백 ${f.worst} (최악 ${f.worstFn}) ≥ ${PAD - 1}`);
    /* 14회차 신설 — **«공격 사이클을 썸네일 아이들로 쓰지 않는다»**.
       그런 칸은 rect 가 2배 넘게 벌어져 ⓐ 크기가 맥동하고(카드8 실측 **77.3%**) ⓑ 잉크 top 이
       58~67px 튀어 121 의 들썩을 통째로 덮는다. 고치는 자리는 배율식이 아니라 **아이들 창**이다
       (12회차에 배율식을 상수로 만들어 봤다가 잉크 top 이 2 → 12px 로 나빠져 되돌렸다 — index.html
        `TH_INKC` 위 주석의 A/B 표).
       ⚠ 임계 15% 는 «지금 받아들이기로 한 잔여» 위에 둔 것이다 — `zombie/walk` 창이 8.9%(121 이 창을
          고를 때 잉크 top 2px 을 얻는 대가로 받아들인 값) · bird 3.0% · 나머지 ≤1.9%.
          잡으려는 것은 그 잔여가 아니라 **58~77% 짜리 «공격 사이클» 계열**이다. */
    ok(f.swing <= 15,
       `카드${f.card} 배율 맥동 — ${f.n}프레임 스윙 ${f.swing.toFixed(1)}% ≤ 15%${f.win ? ' (아이들 창)' : ''}`);
    /* 그리고 **121 축**을 같이 잰다 — 이쪽이 12회차의 오답을 잡아낸 자다.
       기준선 9px = `thBob` 진폭 18px 의 절반(`tools/inkjit121.js` 와 같은 선).
       썸네일이 자기 애니로 그보다 크게 오르내리면 CSS 들썩이 안 보인다. */
    ok(f.top <= 9,
       `카드${f.card} 잉크 top 흔들림 ${f.top}px ≤ 9 (thBob 18 의 절반 — 121 기준선)`);
  });

  /* [1-4] 잉크 중심 보정표(`TH_INKC`)가 아틀라스와 맞는지 — 14회차 신설.
     제품은 픽셀을 읽지 않는다(`getImageData` 는 file:// 에서 캔버스 오염으로 막힌다) — 대신 상수표를 쓴다.
     그러면 아틀라스나 아이들 창이 바뀌었을 때 **표만 늦게 따라오는** 병이 생긴다(245·259 계열).
     그래서 게이트가 매번 아틀라스 픽셀에서 다시 재서 표와 대조한다 — `tools/scan72c.js` 와 같은 식이다. */
  console.log('[1-4] 잉크 중심 보정표 TH_INKC — 아틀라스 실측과 대조');
  const inkc = await p.evaluate(() => {
    const seen = {}, res = [];
    const inkOf = (A, fn) => {
      const fr = A.f[fn]; if (!fr) return null;
      const t = document.createElement('canvas');
      t.width = fr[2]; t.height = fr[3];
      const g = t.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
      const d = g.getImageData(0, 0, fr[2], fr[3]).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < fr[3]; y++) for (let x = 0; x < fr[2]; x++) {
        if (d[(y * fr[2] + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return x1 < 0 ? null : { fw: fr[2], fh: fr[3], x0, y0, x1, y1 };
    };
    [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')].forEach((cv) => {
      const key = cv.dataset.thk, anim = cv.dataset.thi, id = key + '/' + anim;
      if (seen[id]) return;
      seen[id] = 1;
      const A = ATLAS[key]; if (!A || !A.image) return;
      const list = TH_IDLE[id] || (anim && A.a[anim]) || [cv.dataset.thf];
      let L = 1e9, T = 1e9, R = -1e9, B = -1e9, n = 0;
      for (const fn of list) {
        const k = inkOf(A, fn); if (!k) continue;
        n++;
        L = Math.min(L, k.x0 - k.fw / 2); R = Math.max(R, k.x1 + 1 - k.fw / 2);
        T = Math.min(T, k.y0 - k.fh / 2); B = Math.max(B, k.y1 + 1 - k.fh / 2);
      }
      if (!n) return;
      res.push({ id, want: [+(-(L + R) / 2).toFixed(2), +(-(T + B) / 2).toFixed(2)],
                 got: TH_INKC[id] || null });
    });
    return res;
  });
  ok(inkc.length > 0, `보정표 대조 대상 ${inkc.length}종 (던전 카드가 쓰는 아틀라스/애니)`);
  inkc.forEach((r) => {
    ok(!!r.got, `TH_INKC['${r.id}'] 항목이 있다`);
    if (!r.got) return;
    ok(Math.abs(r.got[0] - r.want[0]) <= 1 && Math.abs(r.got[1] - r.want[1]) <= 1,
       `TH_INKC['${r.id}'] = [${r.got}] = 실측 [${r.want}] (±1 원본px)`);
  });
  /* 표가 맞기만 하면 되는 게 아니라 **그려진 결과**가 가운데여야 한다 — 도는 프레임 합집합 기준.
     개별 프레임은 애니가 움직이는 만큼 벗어난다(그건 애니의 몫이다). */
  console.log('[1-5] 그려진 잉크 합집합이 액자 중심에 온다');
  const inkMid = await p.evaluate(() => {
    const out = [];
    [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')].forEach((cv, ci) => {
      const A = ATLAS[cv.dataset.thk], anim = cv.dataset.thi;
      const list = TH_IDLE[cv.dataset.thk + '/' + anim] || (A && A.a[anim]) || [cv.dataset.thf];
      const keep = cv._fr;
      let L = 1e9, T = 1e9, R = -1, B = -1;
      for (const fn of list) {
        if (!A || !A.f[fn]) continue;
        raidDraw(cv, fn);                       /* 제품 경로로 그린다 */
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          if (d[(y * cv.width + x) * 4 + 3] > 8) {
            if (x < L) L = x; if (x > R) R = x; if (y < T) T = y; if (y > B) B = y; }
        }
      }
      if (keep) raidDraw(cv, keep);
      out.push({ card: ci + 1, dx: +(((L + R + 1) / 2) - cv.width / 2).toFixed(1),
                 dy: +(((T + B + 1) / 2) - cv.height / 2).toFixed(1) });
    });
    return out;
  });
  inkMid.forEach((m) => {
    ok(Math.abs(m.dx) <= 3 && Math.abs(m.dy) <= 3,
       `카드${m.card} 잉크 합집합 중심이 액자 중심에서 (${m.dx}, ${m.dy}) — |≤3px|`);
  });

  console.log('[2] 클릭 통과 · z 순서');
  d.forEach((c, i) => {
    if (!c.th) return;
    ok(c.pe === 'none', `카드${i + 1} 슬롯 pointer-events:none`);
    ok(c.iTh > -1 && c.iTh < c.iSh && c.iTh < c.iFr, `카드${i + 1} 썸네일이 .sh/.fr 아래(${c.iTh} < ${c.iSh},${c.iFr})`);
    if (c.locked) ok(c.iLk > c.iTh, `카드${i + 1}(잠금) 딤·자물쇠가 썸네일 위(${c.iLk} > ${c.iTh})`);
  });

  console.log('[2-1] 잠금 카드 씬 아트 자리 — 카드 안쪽 전면(x57~1022, 비평가 P·R·T 교차)');
  const scn = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map((c) => {
    const s = c.querySelector('.scn'); if (!s) return null;
    const cr = c.getBoundingClientRect(), sr = s.getBoundingClientRect();
    return { dx: +(sr.left - cr.left).toFixed(1), w: +sr.width.toFixed(1), h: +sr.height.toFixed(1),
             locked: !!c.querySelector('.lk') };
  }));
  [7, 7, 7, 7].forEach((want, k) => {   /* 90 — 유물조각 던전 4단 */
    const c = scn[k + 2];
    ok(!!c, `잠금 카드${k + 3} 씬 자리 존재`);
    if (c) ok(Math.abs(c.dx - want) <= 1, `잠금 카드${k + 3} 씬 좌단 offset ${c.dx} = ${want}`);
  });
  ok(!scn[0] && !scn[1], '해금 카드 1·2 에는 씬 자리가 없다(레퍼런스도 우측 썸네일뿐)');

  console.log('[3] 카드 진입이 살아 있다 (썸네일 위를 눌러도 세부 팝업이 뜬다)');
  const opened = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc');
    const r = c.getBoundingClientRect();
    document.elementFromPoint(r.left + 800, r.top + 175).closest('.dnc').click();
    return true;
  });
  await p.waitForTimeout(400);
  const hit = await p.evaluate(() => document.elementFromPoint(
    document.querySelector('#dunList .dnc').getBoundingClientRect().left + 800,
    document.querySelector('#dunList .dnc').getBoundingClientRect().top + 175) !== null);
  ok(opened && hit, '썸네일 영역의 히트 타깃이 카드로 잡힌다');

  /* ---- 97 — 레이드 탭 카드도 같은 썸네일 슬롯을 갖는다 ----
     기하는 03 측정표 §3-8 의 던전 카드 값 재사용(카드1 311×305/36 · 카드2 296×289/52 ·
     카드3 330×330/11), 안에 드는 것은 이모지가 아니라 «군주» 스프라이트 캔버스다.
     세 칸을 모두 보려면 잠금(S.best<open)을 풀어야 하고, 알약 겹침은 최고 DPS 가
     가장 길 때가 최악이므로 기록도 크게 넣고 잰다. */
  console.log('[5] 97 — 레이드 카드 썸네일');
  await p.evaluate(() => {
    S.best = 999;
    S.raidBest = { r60: { dmg: 9.9e14, dps: 9.9e12 } };   /* 123 — r30·r120 폐기 */
    setDunSub('raid');
  });
  await p.waitForTimeout(900);
  const rd = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.rd')].map((c) => {
    const cr = c.getBoundingClientRect();
    const th = c.querySelector('.th'), cvs = [...c.querySelectorAll('canvas.thcv')];
    const rel = (e) => { const r = e.getBoundingClientRect();
      return { x: +(r.left - cr.left).toFixed(1), y: +(r.top - cr.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1), r2: +(r.right - cr.left).toFixed(1) }; };
    /* 123 — 아레나 카드는 «마주 본 플레이어 2명» 이라 캔버스가 2장이다. 잉크 bbox 는
       두 캔버스를 슬롯 좌표로 합쳐(왼쪽 칸 오프셋 0, 오른쪽 칸 오프셋 = 칸 폭) 하나로 본다. */
    let ink = null;
    let off = 0;
    for (const cv of cvs) {
      const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, on = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (im[(y * cv.width + x) * 4 + 3] > 8) { on++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (on) {
        const b = { x0: x0 + off, y0, x1: x1 + off, y1 };
        ink = ink ? { x0: Math.min(ink.x0, b.x0), y0: Math.min(ink.y0, b.y0),
                      x1: Math.max(ink.x1, b.x1), y1: Math.max(ink.y1, b.y1) } : b;
      }
      off += cv.width;
    }
    if (ink) { ink.w = ink.x1 - ink.x0 + 1; ink.h = ink.y1 - ink.y0 + 1; }
    return { id: c.dataset.rcard || (c.dataset.arena ? 'arena' : null), th: th ? rel(th) : null,
             cvpx: cvs.length ? [cvs.reduce((a, v) => a + v.width, 0), Math.max(...cvs.map((v) => v.height))] : null,
             ncv: cvs.length, ink,
             pe: th ? getComputedStyle(th).pointerEvents : '',
             kids: [...c.children].map((e) => e.className),
             right: Math.max(...[...c.querySelectorAll('.pill,.sp')].map((e) => rel(e).r2)) };
  }));
  /* 123 — «컨텐츠» 탭 카드는 2장이다: ① DPS 측정장(구 r60, 311×305/36) ② 아레나(구 카드2 규격 296×289/52).
     r30·r120 은 폐기됐다(구 3장 기대치는 여기까지). */
  /* 아레나 칸 여유(tx/ty): 기사 아틀라스 idle 프레임 rect 는 44×46 인데 잉크는 (1,1)~(42,45) 라
     **사방에 투명 1px** 이 들어 있다(실측). 그 1px 이 슬롯으로 늘어나면 가로 148/44 ≈ 3.4px ·
     세로 289/46 ≈ 6.3px 이 된다 — 배치 오차가 아니라 아틀라스 프레임의 여백이므로 그만큼 허용한다. */
  const REXP = [{ w: 311, h: 305, dy: 36 }, { w: 296, h: 289, dy: 52, ncv: 2, tx: 4, ty: 7 }];
  ok(rd.length === 2, `컨텐츠 카드 2장 — 측정장 + 아레나 (실제 ${rd.length})`);
  rd.forEach((c, i) => {
    const e = REXP[i]; if (!e) return;
    ok(!!c.th, `레이드 카드${i + 1}(${c.id}) 썸네일 슬롯 존재`);
    if (!c.th) return;
    ok(Math.abs(c.th.w - e.w) <= 2 && Math.abs(c.th.h - e.h) <= 2,
       `레이드 카드${i + 1} 슬롯 ${c.th.w}×${c.th.h} = ${e.w}×${e.h} (±2)`);
    ok(Math.abs(c.th.x - (980 - 7 - e.w)) <= 2, `레이드 카드${i + 1} 슬롯 x ${c.th.x} = ${980 - 7 - e.w} (우측 안쪽 정렬)`);
    ok(Math.abs(c.th.y - e.dy) <= 2, `레이드 카드${i + 1} 슬롯 y ${c.th.y} = ${e.dy}`);
    ok(!!c.cvpx && c.cvpx[0] === e.w && c.cvpx[1] === e.h,
       `레이드 카드${i + 1} 캔버스 픽셀(합) ${JSON.stringify(c.cvpx)} = [${e.w},${e.h}] (1:1)`);
    ok(c.ncv === (e.ncv || 1), `레이드 카드${i + 1} 캔버스 ${c.ncv}장 = ${e.ncv || 1}장`);
    /* «자리를 잡았다» 와 «자리를 채웠다» 는 다르다(LESSONS 72-③) — 잉크가 슬롯 4변에 5px 안으로 닿아야 한다 */
    ok(!!c.ink, `레이드 카드${i + 1} 스프라이트가 실제로 그려졌다`);
    /* ⚠ **121 6회차 — 세로 판정에 `TH_BOBPAD` 를 더한다.**
       97 의 «잉크가 슬롯 4변을 채운다» 는 정지 그림 기준으로 옳았지만, 121 의 들썩(최대 −14px)이
       들어갈 자리를 0px 로 만들어 놓는 규칙이기도 했다. 5회차가 기준선을 내려(`--thby:14px`) 피하려
       했으나 그건 천장 절단을 **바닥 절단으로 옮긴 것**이었다(6회차 I·J 독립 지적 · `probe121 cut`
       확장판 «레이드1 바닥 접촉 101px · 14/14 위상»). 이제 `drawSpriteTo` 가 세로로만
       `TH_BOBPAD`(16px) 를 비우므로, **가로는 그대로 엄격하게** 두고 세로만 그만큼 허용한다.
       세로 여유가 16 을 넘으면(=그림이 더 쪼그라들면) 여전히 FAIL 이다. */
    const BOBPAD = 16;
    const tx = e.tx || 5, ty = (e.ty || 5) + BOBPAD;
    if (c.ink) ok(c.ink.x0 <= tx && c.ink.y0 <= ty && c.ink.x1 >= e.w - tx - 1 && c.ink.y1 >= e.h - ty - 1,
       `레이드 카드${i + 1} 잉크가 슬롯을 채운다 — 가로 ±${tx} · 세로 ±${ty}(=${e.ty || 5}+들썩여유 ${BOBPAD}) (${c.ink.x0},${c.ink.y0})~(${c.ink.x1},${c.ink.y1})`);
    ok(c.pe === 'none', `레이드 카드${i + 1} 슬롯 pointer-events:none`);
    const iTh = c.kids.indexOf('th'), iSh = c.kids.indexOf('sh'), iFr = c.kids.indexOf('fr');
    ok(iTh > -1 && iTh < iSh && iTh < iFr, `레이드 카드${i + 1} 썸네일이 .sh/.fr 아래(${iTh} < ${iSh},${iFr})`);
    ok(c.right < c.th.x, `레이드 카드${i + 1} 알약·라벨 우단 ${c.right} < 슬롯 좌단 ${c.th.x} (겹침 0)`);
  });

  console.log('[5-1] 잠금 레이드 카드 — 딤·자물쇠가 썸네일 위');
  const rl = await p.evaluate(() => { S.best = 1; setDunSub('raid');
    return [...document.querySelectorAll('#dunList .dnc.rd')].map((c) => ({
      locked: !!c.querySelector('.lk'), th: !!c.querySelector('.th'),
      kids: [...c.children].map((e) => e.className) })); });
  await p.waitForTimeout(300);
  rl.forEach((c, i) => {
    ok(c.th, `레이드 카드${i + 1} 잠금 상태에서도 썸네일 유지`);
    if (c.locked) ok(c.kids.indexOf('lk') > c.kids.indexOf('th'),
      `레이드 카드${i + 1}(잠금) 딤·자물쇠가 썸네일 위(${c.kids.indexOf('lk')} > ${c.kids.indexOf('th')})`);
  });
  ok(rl.some((c) => c.locked), '기본 상태에서 잠긴 레이드 카드가 있다(딤 순서를 실제로 잰다)');

  console.log('[5-2] 던전 탭 회귀 — 서브탭을 되돌려도 던전 카드가 그대로');
  const back = await p.evaluate(() => { setDunSub('dun');
    return [...document.querySelectorAll('#dunList .dnc')]
      .map((c) => ({ th: !!c.querySelector('.th'), rd: c.classList.contains('rd'),
                     cv: !!c.querySelector('.th>canvas.thcv'),
                     em: !!c.querySelector('.th>em') })); });
  ok(back.length === EXP.length && back.every((c) => c.th && !c.rd && c.cv && !c.em),
     `던전 탭 복귀 — 카드 ${back.length}장 전부 스프라이트 썸네일 유지(이모지 0)`);

  console.log('[4] 콘솔 에러');
  ok(errs.length === 0, `콘솔 에러 ${errs.length}건`);
  errs.slice(0, 5).forEach((e) => console.log('    ERR', e));

  console.log(`\nVERIFY72 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
