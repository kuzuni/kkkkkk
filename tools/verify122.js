/* 작업 122 회귀 게이트 — 10 소환 탭 · 13 재화 탭 카드의 «상시 연출(쥬시)».
   실행: node tools/verify122.js   → 마지막 줄이 `VERIFY122 n/n PASS` 여야 한다.

   본다:
     §1 살아 있는가 — 소환 카드 5장·재화 카드 전부에 CSS 애니메이션 ≥2개, 이름이 전부 `jz122*`.
     §2 실제로 그림이 바뀌는가 — 카드 영역을 t=0 / t=1500ms 두 시각에 찍어 **픽셀이 다른가**.
        (애니메이션은 선언만으로도 `getAnimations()` 에 잡힌다 — «움직인다» 는 캡처로만 증명된다)
     §3 **텍스트·버튼 bbox Δ0** — 지시 ③. t=0/1500/6900ms 세 시각에 라벨·버튼·수량의
        getBoundingClientRect() 가 소수점까지 같아야 한다(히트영역·가독성 불변).
        장식 뱃지 `.cp`(±4° 흔들림, 지시 ② 명시)만 예외로 뺀다.
     §4 페이지가 닫히면 정지 — `#shopw` 가 `display:none` 이면 애니메이션이 0개여야 한다.
     §5 56 절전 — `#app.sv` 에서 animation-play-state 가 전부 paused.
     §6 강도 변수 3개(`--jz-amp/--jz-per/--jz-glow`) — 0 을 주면 움직임이 사라진다(끄기 스위치).
     §7 상태 연동 — 무료 링은 `.b1:not(.lack)` 에만, 73 강제 상자 글로우는 `gmBan()` 칸에만.
     §8 스크롤 fps — 카드가 다 도는 동안 리스트를 굴려 프레임 수를 잰다(목표 ≥55fps).
     §9 콘솔 에러 0.

   ⚠ 캡처 비교는 **모든 애니메이션을 pause 하고 `currentTime` 을 세운 뒤** 찍는다.
      헤드리스 스크린샷 1장이 수백 ms 라 «기다렸다 찍기» 로는 같은 t 를 두 번 재현할 수 없다
      (LESSONS 60-⑤). 그래서 이 게이트는 시계가 아니라 타임라인을 본다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* jz122* 상시 연출만 t 로 세운다 — seek 와 읽기 사이에 무엇도 끼어들지 않게 한 태스크로.
   ⚠ **122 가 아닌 애니메이션은 seek 대상에서 뺀다**(LESSONS 60-⑤ 3번째 함정). 1회차에 이걸
   빼먹었더니 60 의 페이지 등장 팝(`jzPgIn{0%{scale:.985}}`)이 t=0 으로 되감겨 **페이지 전체가
   98.5% 로 줄어든 프레임**이 나왔고, 게이트는 그걸 «헤더 라벨 bbox 가 움직였다» 고 읽었다.
   무한 반복이면 finish() 가 던지므로 cancel(), 유한이면 finish() 로 «끝난 상태» 에 못 박는다. */
const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

async function shotAt(p, ms, clip) { await seek(p, ms); return await p.screenshot({ clip }); }

/* ── §13 (6회차 신설) «진폭 단일 기준» 측정기 ───────────────────
   5회차 채점의 U·V 공통 1순위는 «광택마다 세기가 제각각 — 소환 탭만 쥬시하고 재화 탭은 정지 화면»
   이었다(U 실측 Δ루마: 소환 헤더 +35~66 vs 재화 카드 +9~19 vs 마일리지 글로우 +10).
   그래서 «연출이 있는가» 가 아니라 **«얼마나 센가» 를 재는 게이트**를 만든다.

   재는 법: 호스트 상자를 여러 위상에서 찍어 **열(column)별 평균 루마**를 구하고,
   같은 열의 위상 간 최대−최소 중 **가장 큰 값**을 그 호스트의 «광택 피크 Δ» 로 삼는다.
   가로로 지나가는 띠는 신호가 x 축에 실리므로 열 평균이 그대로 띠의 세기가 된다.
   ⚠ 잴 때는 `--jz-amp:0` 으로 **숨쉬기·들썩·둥실을 멈춘다** — 185px 짜리 상자 아트가 4% 커지는
      것만으로도 열 평균이 광택보다 크게 흔들려 측정이 무의미해진다(광택은 `--jz-amp` 를 안 탄다). */
async function lumaOf(p, ms, clip, store) {
  await seek(p, ms);
  /* ⚠ Playwright 의 screenshot 은 Buffer 를 돌려준다(Puppeteer 의 `encoding:'base64'` 옵션이 없다).
     Node 쪽에서 base64 로 바꿔 넣어야 페이지의 <img> 가 디코딩한다. */
  const b64 = (await p.screenshot({ clip })).toString('base64');
  return await p.evaluate(async ([src, keep]) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = () => rej(new Error('PNG 디코딩 실패'));
      img.src = 'data:image/png;base64,' + src;
    });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const n = c.width * c.height, L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
    if (keep) {
      window.__jzBase = L;
      /* 그 호스트에서 **가장 넓은 평탄면**(최빈 휘도 ±12)을 기준면으로 잡아 둔다 */
      const hh = new Int32Array(256);
      for (let i = 0; i < n; i++) hh[Math.min(255, Math.round(L[i]))]++;
      let mode = 0; for (let v = 0; v < 256; v++) if (hh[v] > hh[mode]) mode = v;
      window.__jzMode = mode;
      return mode;
    }
    const B = window.__jzBase, M = window.__jzMode;
    if (!B || B.length !== n) return null;
    const sig = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(B[i] - M) > 12) continue;          /* 평탄면 밖(잉크·테두리)은 뺀다 */
      sig.push(L[i] - B[i]);
    }
    if (!sig.length) return null;
    sig.sort((x, y) => Math.abs(y) - Math.abs(x));
    /* 상위 **2%** 의 중앙값 = 띠 «고원». 5% 로 잡았더니 창이 띠의 심(호스트 면적의 3.2%)보다
       넓어져, 좁은 띠에서는 심 대신 **양옆(어두운 쪽)** 이 잡혔다(소환 전면 −24.1). */
    const k = Math.max(1, Math.round(sig.length * 0.02));
    return +sig[Math.floor(k / 2)].toFixed(1);
  }, [b64, !!store]);
}
/* 위상 8개 — 6개로는 주기 5.4s·딜레이 −3.24s 인 띠가 표본에서 «주차 구간» 에만 걸려
   심 대신 양옆이 잡혔다(소환 전면 −12.9). 표본을 늘려 앨리어싱을 줄인다. */
const PHASES = [0, 700, 1400, 2100, 2800, 3500, 4200, 4900];
/* 광택 세기 = «띠가 있을 때» 와 «띠가 없을 때» 의 루마 차를, **그 호스트에서 가장 넓은 평탄면**
   에서만 재어 상위 5% 의 중앙값을 취한 값(부호 포함). 비평가가 «평탄면 실측» 이라고 부르는 것이다.

   ⚠ 여기 오기까지 세 번 갈아엎었다. 다음 세션이 같은 함정에 빠지지 않게 남긴다:
     ① 위상끼리 비교(기준선 없음) → **표본 앨리어싱.** 재화 카드는 띠가 한 열을 스치는 시간이
        0.34s 인데 표본 간격이 0.7s 라 «띠가 없는 두 프레임» 만 비교하는 열이 생긴다(실측 10.5).
        4·5회차 비평가가 «연출이 아예 없다» 고 세 번 오독한 것과 **같은 원인**이다.
        → 기준선을 «그 띠만 `opacity:0` 으로 끈 프레임» 으로 잡아 해결.
     ② 열(column) 평균 → 띠가 `skewX(-16deg)` 라 호스트가 높을수록 한 열에서 띠가 차지하는 세로
        비율이 준다(카드 450px → x 가 146px 흐른다 = 띠 폭과 맞먹음). 헤더 26.6 / 카드 전면 7.8 로 갈렸다.
     ③ 전체 픽셀의 분위수 → **잉크 오염.** 검은 글자 외곽선·테두리 위를 흰 심이 지날 때만 잡혀
        재화 카드가 94(99.5분위는 70)로 부풀었다. 잉크 비율이 호스트마다 다르니 비교가 안 된다.
     ④ **평탄면 한정 + 상위 5% 중앙값** ← 채택. 소환 헤더 α .21 · 바탕 144 에서 23.3 이 나오고
        이는 α×(255−144)=23.3 과 **소수점까지 일치**한다 — 즉 이 값은 물리량이다.

   ⚠ 잴 때는 `--jz-amp:0` 으로 숨쉬기·들썩·둥실을 멈춘다(광택은 `--jz-amp` 를 안 탄다). */
async function bandPeak(p, hostSel, testSel, muteSel) {
  /* `sel|N|inset` — N 번째 요소를 쓰고, 상자를 inset px 만큼 좁힌다.
     ⚠ inset 이 필요한 이유: 기준면을 «최빈 휘도» 로 잡는데, 버튼처럼 **면이 다단 그라디언트**
     이고 **테두리가 균일한 검정**이면 최빈값이 테두리로 잡힌다. 띠는 테두리 안쪽에서만 도니까
     «평탄면에서 아무 변화 없음» = 0 이 나온다([이동] 버튼에서 실제로 겪었다). */
  const clip = await p.evaluate(s => {
    const [sel, idxS, insS] = s.split('|');
    const e = document.querySelectorAll(sel)[+(idxS || 0)];
    if (!e) return null;
    const ins = +(insS || 0);
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.max(0, Math.round(r.x + ins)), y = Math.max(0, Math.round(r.y + ins));
    const w = Math.min(Math.round(r.width - 2 * ins), innerWidth - x);
    const h = Math.min(Math.round(r.height - 2 * ins), innerHeight - y);
    return (w > 4 && h > 4) ? { x, y, width: w, height: h } : null;
  }, hostSel);
  if (!clip) return null;
  await p.waitForTimeout(120);
  const css = (id, sel) => p.evaluate(([i, x]) => {
    let e = document.getElementById(i);
    if (!x) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = i; document.head.appendChild(e); }
    e.textContent = x + '{opacity:0!important}';
  }, [id, sel]);
  await css('jz122mute', muteSel || '');
  await css('jz122ref', testSel);          /* 기준선 — 이 띠만 끈다 */
  await lumaOf(p, 0, clip, true);
  await css('jz122ref', '');
  let peak = 0;
  for (const t of PHASES) {
    const v = await lumaOf(p, t, clip);
    if (v != null && Math.abs(v) > Math.abs(peak)) peak = v;
  }
  await css('jz122mute', '');
  return peak;
}
/* 6회차 목표 = 광택 전부가 «평탄면 ΔL 32» 한 벌. 마스크·skew 로 뭉개지는 폭을 감안해 ±20%. */
const AMP_LO = 26, AMP_HI = 39;
async function ampCheck(p, hosts) {
  await p.evaluate(() => document.getElementById('shopw').style.setProperty('--jz-amp', '0'));
  const out = [];
  for (const [label, hostSel, testSel, muteSel] of hosts) {
    const v = await bandPeak(p, hostSel, testSel, muteSel);
    const a = v == null ? null : Math.abs(v);
    out.push(label + ' ' + (v == null ? '없음' : v));
    ok(a != null && a >= AMP_LO && a <= AMP_HI,
      '광택 평탄면 ΔL ' + label + ' = ' + (v == null ? '측정 불가' : v)
      + ' (|' + AMP_LO + '~' + AMP_HI + '|)');
  }
  await p.evaluate(() => {
    document.getElementById('shopw').style.removeProperty('--jz-amp');
    /* ⚠ §13 은 호스트마다 `scrollIntoView` 를 한다 — 리스트를 원위치로 돌려놓지 않으면
       뒤따르는 §2 가 화면 밖으로 나간 카드를 찍어 «448B vs 448B» 로 오판한다. */
    const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
  });
  await p.waitForTimeout(200);
  console.log('    · ' + out.join(' | '));
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  /* 재화·마일리지를 넉넉히 — «부족(lack)» 상태에서는 무료 링·교환 글로우가 원래 없다 */
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });

  /* ── §1 소환 카드가 살아 있는가 ──────────────────────────────── */
  console.log('§1 소환 탭 — 카드마다 상시 애니메이션');
  const a1 = await p.evaluate(() => [...document.querySelectorAll('#shopList .shp-card')].map(c => {
    const names = c.getAnimations({ subtree: true }).map(a => a.animationName || '');
    return { n: names.length, jz: names.filter(x => /^jz122/.test(x)).length, names };
  }));
  ok(a1.length === 5, '소환 카드 5장 (' + a1.length + ')');
  a1.forEach((c, i) => ok(c.jz >= 2, '카드' + (i + 1) + ' jz122 애니메이션 ' + c.jz + '개 ≥2'));
  const kinds = await p.evaluate(() => new Set([...document.querySelectorAll('#shopList .shp-card')]
    .flatMap(c => c.getAnimations({ subtree: true }).map(a => a.animationName))).size);
  ok(kinds >= 4, '소환 카드 연출 종류 ' + kinds + '가지 ≥4 (숨쉬기·들썩·광택·입자…)');

  /* ── §7 상태 연동 — 무료 링 · 73 강제 상자 ─────────────────────
     ⚠ **이 절은 타임라인을 건드리기 전에 돈다.** Chrome 에서 CSS 애니메이션을 한 번이라도
     Web Animations API 로 만지면(pause/seek/play) 그 애니메이션은 «API 소유» 가 되어,
     규칙이 사라져도(computed animation-name:none) **취소되지 않고 계속 산다**.
     1회차에 §2·§3 의 seek 뒤에 이 검사를 뒀다가 «무료를 다 썼는데 링이 돈다» 고 오진했다. */
  console.log('§7 상태 연동 — 무료 링 · 73 강제 상자');
  const ring = await p.evaluate(() => {
    const has = e => e.getAnimations().some(a => a.animationName === 'jz122Ring');
    return [...document.querySelectorAll('#shopList .cbtn.b1')]
      .map(e => ({ lack: e.classList.contains('lack'), ring: has(e) }));
  });
  ok(ring.length === 5 && ring.every(x => x.ring === !x.lack),
    '무료 링 = `.b1:not(.lack)` 5칸 일치 (' + ring.map(x => (x.lack ? '-' : '●')).join('') + ')');
  /* 무료를 다 쓰면 링이 사라진다 — 상태를 직접 0 으로 만들고 재동기화.
     ⚠ 읽기는 **프레임을 하나 넘긴 뒤** 한다. CSS 애니메이션의 취소는 스타일 flush 가 아니라
     «애니메이션 갱신» 단계에서 처리돼서, 같은 태스크 안에서 `getAnimations()` 를 부르면
     이미 사라진 규칙의 애니메이션이 한 프레임 더 잡힌다(1회차 오진의 정체). */
  await p.evaluate(() => {
    const b = SHOP_BOXES[0].b;
    S.daily.freeSum = S.daily.freeSum || {}; S.daily.freeSum[b] = 0; syncShopSumBtns();
  });
  await p.waitForTimeout(150);
  const ringOff = await p.evaluate(() => {
    const e = document.querySelector('#shopList .shp-card:nth-child(1) .cbtn.b1');
    return { lack: e.classList.contains('lack'), ring: e.getAnimations().some(a => a.animationName === 'jz122Ring') };
  });
  ok(ringOff.lack && !ringOff.ring, '무료 소진 → 링 정지');

  /* 73 강제 상자 — 가이드가 지목한 칸에만 `.gm` 글로우 */
  const gm = await p.evaluate(() => {
    const need = gmBan();
    renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const gmi = cards.findIndex(c => c.classList.contains('gm'));
    const glow = gmi >= 0 && cards[gmi].querySelector('.cfr')
      .getAnimations().some(a => a.animationName === 'jz122Gm');
    return { need, want: need ? SHOP_BOXES.findIndex(x => x.b === need) : -1, gmi, glow, n: cards.filter(c => c.classList.contains('gm')).length };
  });
  ok(gm.gmi === gm.want, '`.gm` 칸 = gmBan() 칸 (' + gm.need + ' → idx ' + gm.gmi + ')');
  ok(gm.n <= 1, '`.gm` 은 최대 1칸 (' + gm.n + ')');
  if (gm.gmi >= 0) ok(gm.glow, '강제 상자 테두리 글로우 동작');
  else { pass++; console.log('  ✓ 지금은 강제 상자 없음 — 글로우도 없음(정상)'); }

  /* ── §10 «들썩» 은 이따금 한 번이어야 한다 (3회차 신설) ─────────
     `rotate:0` 은 무효 선언이라(<angle> 에 단위 없는 0 은 못 쓴다) 0%·100% 키프레임에서 rotate 가
     사라지고, Chrome 이 «94% 3deg ↔ 바탕값 0deg» 를 주기 내내 보간한다 — «이따금 툭» 이
     «늘 조금 기울어 서서히 도는» 것이 된다. 들썩 구간 **밖**에서 회전이 0 인지로 못 박는다. */
  console.log('§10 들썩 — 구간 밖에서는 회전 0 · 구간 안에서만 ±3°');
  const bobs = await p.evaluate(() => {
    const out = [];
    const cards = [...document.querySelectorAll('#shopList .shp-card .cart')];
    const read = t => {
      document.getAnimations().forEach(a => {
        if (!/^jz122/.test(a.animationName || '')) return;
        try { a.pause(); a.currentTime = t; } catch (_) {}
      });
      return cards.map(e => {
        const cs = getComputedStyle(e);
        /* `rotate` 는 «0deg» / «2.59deg» / «none», 그리고 **«4.9e-29deg» 같은 지수 표기**로도 온다 —
           정규식으로 자르다가 지수부 «29» 를 각도로 읽어 «29°» 라는 헛값을 봤다. parseFloat 하나면 충분하다. */
        return { rot: Math.abs(parseFloat(cs.rotate) || 0),
          ty: Math.abs(parseFloat((cs.translate || '0').split(' ')[1] || '0') || 0) };
      });
    };
    /* 카드 주기·딜레이를 «안다» 고 가정하지 않는다 — 한 바퀴(최장 7s)를 100ms 로 훑어
       «세로 이동이 0.5px 미만인 시각(=쉬는 중)» 과 «−3px 넘게 뜬 시각(=들썩 중)» 을 직접 찾는다.
       주기를 바꿀 때마다 게이트의 표본 시각을 손보지 않아도 된다. */
    for (let t = 0; t <= 7000; t += 100) out.push({ t, v: read(t) });
    return out;
  });
  /* «쉬는 중» 의 문턱은 넉넉하면 안 된다 — 들썩 주기를 줄이면 0.5px 문턱이 «들썩의 꼬리» 를
     쉬는 것으로 잘못 세어 회전 0.15° 를 물고 온다. 정지 프레임만 세도록 0.05px 로 조인다. */
  const quiet = bobs.filter(f => f.v.every(c => c.ty < 0.05));
  const loud = bobs.filter(f => f.v.some(c => c.ty > 3));
  ok(quiet.length > 0, '들썩이 쉬는 시각이 있다 (' + quiet.length + '/' + bobs.length + ' 표본)');
  ok(quiet.every(f => f.v.every(c => c.rot < 0.05)),
    '쉬는 시각의 회전 = 0° (최대 ' + Math.max(0, ...quiet.flatMap(f => f.v.map(c => c.rot))).toFixed(2) + '°)');
  ok(loud.length > 0 && loud.some(f => f.v.some(c => c.rot > 2.5)),
    '들썩 구간에서는 ±3° 가 실제로 걸린다 (최대 ' + Math.max(0, ...loud.flatMap(f => f.v.map(c => c.rot))).toFixed(2) + '°)');

  /* ── §12 스윕이 «끝까지 지나가는가» (5회차 신설) ─────────────────
     `translate` 의 %는 자기 자신(띠) 폭 기준이라, 띠 폭을 줄이면 이동거리가 같이 줄어
     **호스트를 못 빠져나가고 중간에 얼어붙는다**(5회차 실측: 헤더 우측에 밝기 +27 고정).
     띠가 지나간 뒤 «정지 구간의 그림» 이 «띠가 오기 전의 그림» 과 같아야 통과다. */
  console.log('§12 스윕이 호스트를 완전히 빠져나가는가');
  const runs = await p.evaluate(() => {
    const out = [];
    const chk = (sel, pseudo, hostW) => {
      const e = document.querySelector(sel);
      if (!e) { out.push(sel + ' 없음'); return; }
      const cs = getComputedStyle(e, pseudo);
      const bandW = parseFloat(cs.width) || 0;
      const run = (cs.getPropertyValue('--jz-run') || '').trim();
      /* `--jz-run` 이 없으면 키프레임의 기본값 440%(띠 폭 기준)가 쓰인다 — 그 값으로 계산해야
         «이동거리가 모자라다» 는 진짜 이유가 메시지에 찍힌다. */
      const runPx = run.endsWith('px') ? parseFloat(run)
        : bandW * (run.endsWith('%') ? parseFloat(run) : 440) / 100;
      const start = -1.4 * bandW;
      /* 끝 위치(띠 좌변) + 띠 폭 이 호스트 폭을 넘어야 완전히 빠져나간 것이다 */
      if (!(runPx + bandW >= hostW)) {
        out.push(sel + pseudo + ' 이동 ' + Math.round(runPx) + '+띠' + Math.round(bandW)
          + ' < 호스트 ' + Math.round(hostW) + ' (시작 ' + Math.round(start) + ')');
      }
    };
    const w = sel => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect().width : 0; };
    chk('#shopList .shp-card>.chd', '::after', w('#shopList .shp-card>.chd'));
    chk('#shopList .shp-card>.cbg>.jzp', '::after', w('#shopList .shp-card>.cbg'));
    chk('#shopList .shp-card>.cfr', '::after', w('#shopList .shp-card>.cbg'));
    return out;
  });
  ok(runs.length === 0, '소환 탭 스윕이 카드를 완전히 통과' + (runs.length ? ' — ' + runs.join(' , ') : ''));

  /* ── §13 진폭 단일 기준 — 소환 탭 (6회차 신설) ─────────────── */
  console.log('§13 광택 피크 Δ루마 한 벌 — 소환 탭');
  const SUM_HD = '#shopList .shp-card>.chd::after', SUM_BD = '#shopList .shp-card>.cbg>.jzp::after',
        SUM_FR = '#shopList .shp-card>.cfr::after';
  /* 헤더는 칸마다 배경색(`--hd`)이 달라 **가장 밝은 칸과 가장 어두운 칸**을 같이 본다 —
     `jzShineA()` 가 칸별 α 를 제대로 박고 있는지는 이 두 칸이 같은 값이어야 증명된다. */
  await ampCheck(p, [['소환 헤더1', '#shopList .shp-card>.chd|0', SUM_HD, SUM_FR],
                     ['소환 헤더4', '#shopList .shp-card>.chd|3', SUM_HD, SUM_FR],
                     ['소환 본문', '#shopList .shp-card>.cbg', SUM_BD, SUM_FR],
                     /* ⚠ 전면 광택은 **헤더 위에서 재야 한다.** 6회차에 카드 전체(`.cfr`)로 쟀더니
                        평탄면이 본문 바탕(휘도 144)으로 잡혀 34.1 «정상» 이 나왔지만, 비평가 둘은
                        헤더 바탕(휘도 98~119) 위에서 +57~82 를 읽었다 — 같은 띠가 지나는 **가장 어두운
                        면**이 그 띠의 최대 세기다. 칸별 α 가 제대로 박혔는지도 두 칸을 비교해야 보인다. */
                     /* 7회차(Y 7) — 본문도 칸마다 휘도가 다르다(99.6~165.4). 가장 밝은 칸(3)과
                        가장 어두운 칸(4)을 둘 다 봐야 `--jz-gb` 가 제대로 박혔는지 보인다. */
                     ['소환 본문3', '#shopList .shp-card>.cbg|2', SUM_BD, SUM_FR],
                     ['소환 본문4', '#shopList .shp-card>.cbg|3', SUM_BD, SUM_FR],
                     /* 전면 광택은 이제 헤더를 안 지난다(Y 2) → 본문에서 잰다 */
                     ['소환 전면(본문1)', '#shopList .shp-card>.cbg|0', SUM_FR, SUM_HD + ',' + SUM_BD],
                     ['소환 전면(본문4)', '#shopList .shp-card>.cbg|3', SUM_FR, SUM_HD + ',' + SUM_BD]]);

  /* ── §11 광택 스윕이 카드 밖으로 새지 않는가 (3회차 신설) ────────
     의사요소의 `clip-path` 는 «자기 상자» 기준이라 띠와 함께 움직인다 — 가두는 일은 부모의 몫이다.
     카드 왼쪽 바깥 띠를 두 위상에서 찍어 **픽셀이 같아야** 한다. */
  console.log('§11 스윕 누출 — 카드 바깥 배경은 불변');

  /* ── §2 실제로 그림이 바뀌는가 ───────────────────────────────── */
  console.log('§2 캡처 — t=0 vs t=1500ms 픽셀 차');
  const box = await p.evaluate(() => {
    const r = document.querySelector('#shopList .shp-card').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const s0 = await shotAt(p, 0, box), s1 = await shotAt(p, 1500, box);
  ok(!s0.equals(s1), '카드1 그림이 t=0 과 t=1500ms 에서 다르다 (' + s0.length + 'B vs ' + s1.length + 'B)');
  const s2 = await shotAt(p, 6900, box);
  ok(!s1.equals(s2) && !s0.equals(s2), '카드1 t=6900ms(들썩 구간)도 다르다');

  /* ── §3 텍스트·버튼 bbox Δ0 ─────────────────────────────────── */
  console.log('§3 텍스트·버튼 bbox 불변 (지시 ③)');
  const SEL = ['.shp-card>.chd>i', '.shp-card .cbtn', '.shp-card .cbtn>u', '.shp-card .clv', '.shp-card .cbar'];
  const rects = t => p.evaluate(sel => sel.flatMap(s => [...document.querySelectorAll('#shopList ' + s)]
    .map(e => { const r = e.getBoundingClientRect(); return [s, r.x, r.y, r.width, r.height].join(','); })), SEL);
  await seek(p, 0); const r0 = await rects();
  await seek(p, 1500); const r1 = await rects();
  await seek(p, 6900); const r2 = await rects();
  ok(r0.length > 20, '소환 탭 측정 대상 ' + r0.length + '개');
  ok(JSON.stringify(r0) === JSON.stringify(r1), 't=0 vs 1500ms bbox 동일');
  ok(JSON.stringify(r0) === JSON.stringify(r2), 't=0 vs 6900ms bbox 동일 (들썩이 카드를 안 민다)');

  /* ── §6 강도 변수 3개 ───────────────────────────────────────── */
  console.log('§6 강도 변수 --jz-amp / --jz-per / --jz-glow');
  const vars = await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('shopw'));
    return ['--jz-amp', '--jz-per', '--jz-glow'].map(k => cs.getPropertyValue(k).trim());
  });
  ok(vars.every(v => v !== ''), '세 변수 모두 #shopw 에 선언 (' + vars.join(' / ') + ')');
  await p.evaluate(() => { document.getElementById('shopw').style.setProperty('--jz-amp', '0'); });
  const z0 = await shotAt(p, 0, box), z1 = await shotAt(p, 1500, box);
  /* 진폭 0 이면 «움직임» 은 죽고 색 연출(광택·스파클)만 남는다 — 상자 아트의 위치·크기가 고정인지로 본다 */
  const artSame = await p.evaluate(async () => {
    const e = document.querySelector('#shopList .shp-card .cart');
    const at = t => { document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = t; } catch (_) {} });
      const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(','); };
    return at(0) === at(1500) && at(0) === at(6900);
  });
  ok(artSame, '--jz-amp:0 → 상자 아트가 1px 도 안 움직인다 (연출 끄기 스위치)');
  await p.evaluate(() => { document.getElementById('shopw').style.removeProperty('--jz-amp'); });
  /* 두 시각만 비교하면 «하필 같은 위상» 에 걸려 헛 FAIL 이 난다(주기를 조정할 때마다 재발).
     한 바퀴를 훑어 «서로 다른 상자» 가 하나라도 있으면 움직이는 것이다. */
  const back = await p.evaluate(async () => {
    const e = document.querySelector('#shopList .shp-card .cart');
    const at = t => { document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = t; } catch (_) {} });
      const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(','); };
    const seen = new Set();
    for (let t = 0; t <= 7000; t += 250) seen.add(at(t));
    return seen.size > 1;
  });
  ok(back, '변수를 되돌리면 다시 움직인다');

  /* ── §5 56 절전 ─────────────────────────────────────────────── */
  console.log('§5 56 절전 — 상시 연출 정지');
  const sv = await p.evaluate(() => {
    document.getElementById('app').classList.add('sv');
    const e = document.querySelector('#shopList .shp-card .cart');
    const st = getComputedStyle(e).animationPlayState;
    document.getElementById('app').classList.remove('sv');
    return st;
  });
  ok(/paused/.test(sv), '절전 중 animation-play-state = ' + sv);

  /* ── §4 페이지 닫힘 ─────────────────────────────────────────── */
  console.log('§4 페이지가 닫히면 정지');
  const closed = await p.evaluate(() => {
    closeShopPage();
    return { on: document.getElementById('shopw').classList.contains('on'),
      n: document.querySelectorAll('#shopList .shp-card').length,
      anims: document.getAnimations().filter(a => /^jz122/.test(a.animationName || '')).length };
  });
  ok(!closed.on && closed.anims === 0, '닫힌 뒤 jz122 애니메이션 ' + closed.anims + '개 (display:none = 정지)');

  /* ── §1·§2·§3 재화 탭 ───────────────────────────────────────── */
  console.log('§1~3 재화 탭 — 카드 연출 · 픽셀 차 · bbox');
  await p.evaluate(() => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  const c1 = await p.evaluate(() => {
    const cds = [...document.querySelectorAll('#shopList .cn-cd')];
    return { n: cds.length,
      alive: cds.filter(c => c.getAnimations({ subtree: true }).some(a => /^jz122/.test(a.animationName || ''))).length,
      top: document.querySelectorAll('#shopList .cn-cd.dia.top').length,
      /* 2회차 — 광선은 «몸통(.bg)» 이 아니라 «아이템 판(.pn)» 안에 있어야 보인다(1회차 실측: .bg 는 완전히 가려짐) */
      ray: !!document.querySelector('#shopList .cn-cd.dia.top>.pn>.ray'),
      mile: !!document.querySelector('#shopList .cn-ml:not(.off)') };
  });
  ok(c1.n >= 10, '재화 카드 ' + c1.n + '장');
  ok(c1.alive === c1.n, '전 카드에 상시 연출 (' + c1.alive + '/' + c1.n + ')');
  ok(c1.top === 1 && c1.ray, '가장 큰 다이아 상품 1칸에만 골드 광선 판');
  const cbox = await p.evaluate(() => {
    const r = document.querySelector('#shopList .cn-cd').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const q0 = await shotAt(p, 0, cbox), q1 = await shotAt(p, 1500, cbox);
  ok(!q0.equals(q1), '재화 카드1 그림이 t=0 과 t=1500ms 에서 다르다');
  /* 2회차 신설 — «있다» 가 아니라 «보인다» 를 잰다.
     1회차 게이트는 광선 판이 DOM 에 있는 것만 보고 통과시켰는데, 실제로는 카드 몸통이
     헤더·아이템 판·버튼에 완전히 가려 **한 픽셀도 안 보였다**(비평가 N 실측 Δ=0).
     이제 광선이 사는 영역을 20s 주기의 1/4 만큼 떨어진 두 시각에 찍어 픽셀 차를 요구한다. */
  await p.evaluate(() => {
    const c = document.querySelector('#shopList .cn-cd.dia.top');
    if (c) c.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(300);
  const rbox = await p.evaluate(() => {
    const e = document.querySelector('#shopList .cn-cd.dia.top>.pn');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  if (rbox) {
    const y0 = await shotAt(p, 0, rbox), y1 = await shotAt(p, 5200, rbox);
    ok(!y0.equals(y1), '골드 광선이 실제로 보인다 — 아이템 판 픽셀이 t=0 과 t=5200 에서 다르다');
  } else ok(false, '골드 광선 판(.cn-cd.dia.top>.pn>.ray) 을 찾지 못함');
  /* 2회차 신설 — 탭 간 규칙 일치(N ④): 재화 카드에도 헤더 스윕·버튼 링이 붙는가 */
  const cons = await p.evaluate(() => ({
    /* ⚠ 의사요소(::after)의 애니메이션은 `el.getAnimations()` 에 안 잡힌다(subtree 옵션이 필요하다).
       여기서는 computed style 로 직접 묻는 쪽이 정확하다. */
    /* 6회차 — 띠의 호스트를 카드 상자에서 **테두리 레이어 `.fr` 의 안쪽(padding box)** 으로 옮겼다
       (7-3-6 «광택이 검은 외곽선을 덮는다»). 검사 대상 선택자도 같이 옮긴다. */
    sweep: [...document.querySelectorAll('#shopList .cn-cd:not(.done)>.fr')]
      .filter(c => getComputedStyle(c, '::after').animationName === 'jz122Sweep').length,
    all: document.querySelectorAll('#shopList .cn-cd:not(.done)').length,
    ring: [...document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad]')]
      .filter(e => e.getAnimations().some(a => a.animationName === 'jz122RingC')).length,
    ads: document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad]').length,
  }));
  ok(cons.all > 0 && cons.sweep === cons.all, '재화 카드 광택 스윕 ' + cons.sweep + '/' + cons.all);
  const runs2 = await p.evaluate(() => {
    const out = [];
    const chk = (sel, pseudo, hostSel) => {
      const e = document.querySelector(sel), h = document.querySelector(hostSel || sel);
      if (!e || !h) { out.push(sel + ' 없음'); return; }
      const cs = getComputedStyle(e, pseudo);
      const bandW = parseFloat(cs.width) || 0;
      const run = (cs.getPropertyValue('--jz-run') || '').trim();
      const runPx = run.endsWith('px') ? parseFloat(run) : bandW * (parseFloat(run) || 440) / 100;
      const hostW = h.getBoundingClientRect().width;
      if (!(runPx + bandW >= hostW)) out.push(sel + pseudo + ' ' + Math.round(runPx + bandW) + ' < ' + Math.round(hostW));
    };
    chk('#shopList .cn-cd>.fr', '::after');
    chk('#shopList .cn-rb>b', '::after');
    chk('#shopList .cn-rb>.tl.l>s', '::after', '#shopList .cn-rb>b');
    chk('#shopList .cn-rb>.tl.r>s', '::after', '#shopList .cn-rb>b');
    chk('#shopList .cn-a2', '::after');
    chk('#shopList .cn-ml', '::after');
    chk('#shopList .cn-hd', '::after');
    return out;
  });
  ok(runs2.length === 0, '재화 탭 스윕(카드·리본·평생배너)이 전부 완전히 통과'
    + (runs2.length ? ' — ' + runs2.join(' , ') : ''));
  ok(cons.ads > 0 && cons.ring === cons.ads, '[받기] 버튼 펄스 링 ' + cons.ring + '/' + cons.ads);
  /* 4회차 신설 — 비평가 둘이 «화면의 이 직사각형이 13.4초 내내 range 0» 이라고 좌표까지 짚었다.
     그런 «완전 정지 구역» 이 다시 생기지 않도록, 카드가 아닌 구역도 각각 연출을 갖는지 못 박는다. */
  const zones = await p.evaluate(() => {
    const has = (sel, name, pseudo) => {
      const e = document.querySelector(sel);
      if (!e) return sel + ' 없음';
      const v = pseudo ? getComputedStyle(e, pseudo).animationName : getComputedStyle(e).animationName;
      return v && v.indexOf(name) >= 0 ? null : sel + (pseudo || '') + '=' + v;
    };
    return [
      has('#shopList .cn-bn', 'jz122Sweep', '::after'),
      has('#shopList .cn-bn>.art', 'jz122Float'),
      has('#shopList .cn-bn>.gem', 'jz122Float'),
      has('#shopList .cn-rb>b', 'jz122Sweep', '::after'),
      has('#shopList .cn-a2>em', 'jz122Float'),
      has('#shopList .cn-a2', 'jz122Sweep', '::after'),
      has('#shopList .cn-ml>em', 'jz122Float'),
      has('#shopList #cnMove', 'jz122Ring2'),
      has('#shopList .cn-ml:not(.off)>.ex', 'jz122Ring2'),
      /* 6회차(7-3-2·7-3-5) — 새로 채운 «정지 섬» 과 리본 꼬리도 같이 못 박는다 */
      has('#shopList .cn-ml', 'jz122Sweep', '::after'),
      has('#shopList .cn-hd', 'jz122Sweep', '::after'),
      has('#shopList .cn-rb>.tl.l>s', 'jz122Sweep', '::after'),
      has('#shopList .cn-rb>.tl.r>s', 'jz122Sweep', '::after'),
    ].filter(Boolean);
  });
  ok(zones.length === 0, '카드 밖 구역(배너·리본·평생배너·마일리지·이동/교환 버튼)도 전부 연출 보유'
    + (zones.length ? ' — 빠짐: ' + zones.join(' , ') : ''));

  /* ── §13 진폭 단일 기준 — 재화 탭 (6회차 신설) ─────────────── */
  console.log('§13 광택 피크 Δ루마 한 벌 — 재화 탭');
  const RB = '#shopList .cn-rb>b';
  await ampCheck(p, [['재화 카드', '#shopList .cn-cd:not(.done)', '#shopList .cn-cd>.fr::after'],
                     /* 7회차(Y 1) — 광고 카드와 다이아 카드의 헤더색이 달라 같은 α 가 1.62배로 갈렸다.
                        두 계열의 **헤더면**을 각각 잰다(카드 전체로 재면 크림판이 평탄면으로 잡힌다). */
                     ['광고카드 헤더', '#shopList .cn-cd:not(.done)>.hd', '#shopList .cn-cd>.fr::after'],
                     ['다이아카드 헤더', '#shopList .cn-cd.dia>.hd', '#shopList .cn-cd>.fr::after'],
                     ['리본1 청록', RB + '|0', RB + '::after'],
                     ['리본2 남보라', RB + '|1', RB + '::after'],
                     ['리본3 자주', RB + '|2', RB + '::after'],
                     ['평생배너', '#shopList .cn-a2', '#shopList .cn-a2::after'],
                     ['마일리지', '#shopList .cn-ml', '#shopList .cn-ml::after'],
                     ['상품 밴드', '#shopList .cn-hd', '#shopList .cn-hd::after'],
                     /* 8회차 신설 — 탭 첫 화면의 15.4% 를 차지하던 정지 배너 */
                     ['히어로 배너', '#shopList .cn-bn', '#shopList .cn-bn::after'],
                     /* 6회차 채점 — 두 버튼면이 10/10 · 6/6 프레임 픽셀 동일이었다. 띠가 버튼 위를
                        지나는지 **버튼 상자에서 직접** 잰다(패널 전체로 재면 버튼이 죽어도 통과한다). */
                     ['[교환] 버튼면', '#shopList .cn-ml>.ex|0|12', '#shopList .cn-ml::after'],
                     ['[이동] 버튼면', '#shopList .cn-mv|0|12', '#shopList .cn-mv::after']]);

  const leak = await p.evaluate(() => {
    /* 앞선 절에서 d5 칸으로 스크롤해 뒀으므로 «지금 화면 안에 온전히 있는» 칸을 골라야 한다
       (뷰포트 밖 칸의 rect 로 clip 을 만들면 screenshot 이 즉사한다). */
    const c = [...document.querySelectorAll('#shopList .cn-cd')].find(e => {
      const r = e.getBoundingClientRect();
      return r.x > 70 && r.top > 60 && r.bottom < innerHeight - 20;
    });
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x) - 58, y: Math.round(r.y) + 40, width: 52, height: Math.round(r.height) - 80 };
  });
  if (!leak) { ok(false, '스윕 누출을 잴 «화면 안 카드» 를 못 찾음'); }
  else {
  const l0 = await shotAt(p, 0, leak), l1 = await shotAt(p, 1150, leak), l2 = await shotAt(p, 2300, leak);

  ok(l0.equals(l1) && l0.equals(l2), '카드 왼쪽 바깥 52px 띠가 세 위상에서 픽셀 동일 (스윕이 안 샌다)');
  }

  const CSEL = ['.cn-cd>.hd>i', '.cn-cd>.bt', '.cn-cd>.bt>u', '.cn-cd>.qt', '.cn-ml>.ex', '.cn-ml>.ex>i'];
  const crects = () => p.evaluate(sel => sel.flatMap(s => [...document.querySelectorAll('#shopList ' + s)]
    .map(e => { const r = e.getBoundingClientRect(); return [s, r.x, r.y, r.width, r.height].join(','); })), CSEL);
  await seek(p, 0); const k0 = await crects();
  await seek(p, 1500); const k1 = await crects();
  await seek(p, 6900); const k2 = await crects();
  ok(k0.length > 20, '재화 탭 측정 대상 ' + k0.length + '개');
  const kdiff = k0.map((v, i) => (v === k1[i] && v === k2[i]) ? null
    : v + '  →  ' + k1[i] + '  /  ' + k2[i]).filter(Boolean);
  ok(kdiff.length === 0, '재화 탭 텍스트·버튼 bbox 3시각 동일' + (kdiff.length ? ' — ' + kdiff.slice(0, 3).join(' ;; ') : ''));
  ok(c1.mile, '마일리지 교환 가능 상태(글로우 대상) 존재');

  /* ── §8 스크롤 fps ────────────────────────────────────────────
     지시 ③ 은 «≥55fps» 지만 **이 러너에서는 절대값이 게이트가 될 수 없다** — 1회차 실측:
     애니메이션을 전부 끈 같은 페이지가 소환 12.6 / 재화 25.4fps 이고, 카드가 하나도 없는
     빈 화면의 rAF 조차 ~31fps 다(컨테이너 CPU 상한). 절대값으로 재면 122 와 무관하게 항상 FAIL 이다.
     그래서 **같은 실행 안에서 ON/OFF 를 번갈아 4회씩 재고 중앙값을 비교**한다 —
     122 의 연출이 스크롤 비용을 늘리지 않았는가가 실제로 물어야 할 것이다. 절대값은 기록만 남긴다. */
  console.log('§8 스크롤 fps — ON/OFF 교차 4회 중앙값 (절대값은 러너 상한에 걸려 기록만)');
  const OFFCSS = '#shopList *,#shopList *::after,#shopList *::before{animation-name:none!important}';
  const setCss = c => p.evaluate(x => {
    let s = document.getElementById('v122fps');
    if (!s) { s = document.createElement('style'); s.id = 'v122fps'; document.head.appendChild(s); }
    s.textContent = x;
  }, c);
  const scrollFps = () => p.evaluate(() => new Promise(res => {
    const lw = document.getElementById('shopList');
    let n = 0, t0 = performance.now(), dir = 1;
    const tick = () => {
      n++; lw.scrollTop += 24 * dir;
      if (lw.scrollTop <= 0 || lw.scrollTop + lw.clientHeight >= lw.scrollHeight - 1) dir = -dir;
      if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
      else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
    };
    requestAnimationFrame(tick);
  }));
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  for (const tab of ['coin', 'summon']) {
    await p.evaluate(t => { shopCat = t; setShopCatTabs(t); renderShopPage(); }, tab);
    await p.waitForTimeout(400);
    await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} }); });
    const on = [], off = [];
    for (let i = 0; i < 4; i++) {
      await setCss(''); await p.waitForTimeout(180); on.push(await scrollFps());
      await setCss(OFFCSS); await p.waitForTimeout(180); off.push(await scrollFps());
    }
    await setCss('');
    const mOn = med(on), mOff = med(off);
    console.log('   ' + (tab === 'coin' ? '재화' : '소환') + ' 탭 — ON ' + on.join('/') + ' (중앙 ' + mOn
      + ') · OFF ' + off.join('/') + ' (중앙 ' + mOff + ')');
    ok(mOn >= mOff * 0.9, (tab === 'coin' ? '재화' : '소환') + ' 탭 스크롤 비용 증가 없음 — ON '
      + mOn + 'fps ≥ OFF ' + mOff + 'fps × 0.9');
  }

  /* ── §9 콘솔 ────────────────────────────────────────────────── */
  ok(errs.length === 0, '콘솔 에러 0 (' + errs.slice(0, 2).join(' | ') + ')');

  await b.close();
  console.log('\nVERIFY122 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
