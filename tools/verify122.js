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
  const quiet = bobs.filter(f => f.v.every(c => c.ty < 0.5));
  const loud = bobs.filter(f => f.v.some(c => c.ty > 3));
  ok(quiet.length > 0, '들썩이 쉬는 시각이 있다 (' + quiet.length + '/' + bobs.length + ' 표본)');
  ok(quiet.every(f => f.v.every(c => c.rot < 0.05)),
    '쉬는 시각의 회전 = 0° (최대 ' + Math.max(0, ...quiet.flatMap(f => f.v.map(c => c.rot))).toFixed(2) + '°)');
  ok(loud.length > 0 && loud.some(f => f.v.some(c => c.rot > 2.5)),
    '들썩 구간에서는 ±3° 가 실제로 걸린다 (최대 ' + Math.max(0, ...loud.flatMap(f => f.v.map(c => c.rot))).toFixed(2) + '°)');

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
  const back = await p.evaluate(async () => {
    const e = document.querySelector('#shopList .shp-card .cart');
    const at = t => { document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = t; } catch (_) {} });
      const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(','); };
    return at(0) !== at(6900);
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
    sweep: [...document.querySelectorAll('#shopList .cn-cd:not(.done)')]
      .filter(c => getComputedStyle(c, '::after').animationName === 'jz122Sweep').length,
    all: document.querySelectorAll('#shopList .cn-cd:not(.done)').length,
    ring: [...document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad]')]
      .filter(e => e.getAnimations().some(a => a.animationName === 'jz122RingC')).length,
    ads: document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad]').length,
  }));
  ok(cons.all > 0 && cons.sweep === cons.all, '재화 카드 광택 스윕 ' + cons.sweep + '/' + cons.all);
  ok(cons.ads > 0 && cons.ring === cons.ads, '[받기] 버튼 펄스 링 ' + cons.ring + '/' + cons.ads);

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
