/* 작업 122 — 18회차 «진실표 II». 17회차 `probe122tru.js` 가 소환 상자(`.cart`)에 대해 한 것을
   **비평가 AN 이 «없다» 고 읽은 나머지 세 자리**에 그대로 한다.

   ⚑ 왜 — 18회차 비평가 AN 이 화소로 이렇게 쟀다:
     AN[7]  «보너스 뱃지 흔들림 ±4° 가 없다. bbox 높이가 6프레임 전부 40~41px 고정 →
             폭 111px 알약이 4° 돌면 40·cos4° + 111·sin4° ≈ 48px 이어야 한다 → 실측 ≤±0.7°»
     AN[4]  «숨쉬기가 정점 체류 없는 순수 사인파. ≥피크90% 체류 20~21%»
             (⚠ AN 은 브리핑의 «정점 44~56% 체류» 를 «체류가 주기의 44~56%» 로 읽었다.
              키프레임의 뜻은 «44%~56% 구간에서 정점» = **체류 12%** 다. 브리핑 문구 결함 —
              그래도 «12% 평지 + ease-in-out 양 옆» 이면 ≥90% 체류는 사인파의 20.5% 보다 커야 한다.
              20~21% 가 나왔다는 것은 **평지가 안 걸렸다**는 뜻이므로 재는 값 자체는 유효하다.)
     AN[6]  «목걸이 카드(C3) 버튼 3개가 통째로 광택 경로 밖 — 화소 76~97% 가 한 주기 내내 변화 0»

   화소 자는 «보이는 결과» 를 재고 이 표는 «브라우저가 실제로 계산한 값» 을 잰다.
   둘이 어긋나면 어긋나는 지점이 결함이다 — 17회차가 잉크↔상자에서 쓴 방법 그대로다.

   실행: node tools/probe122r18.js
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const STOPS = [80, 400, 720, 1040, 1360, 1680, 2000, 2320, 2640, 8300];   /* cap122 STOPS */
const DIA_STOPS = [80, 560, 1040, 1520, 2000, 2480];                      /* cap122 DIA_STOPS */

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* cap122.js 와 **같은** 얼리기·세우기 (LESSONS 60-⑤) */
  await p.evaluate(() => {
    window.__jzFreeze = () => {
      document.getAnimations().forEach(a => {
        const jz = /^jz122/.test(a.animationName || '');
        try {
          if (jz) a.pause();
          else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
          else a.finish();
        } catch (_) { try { a.cancel(); } catch (__) {} }
      });
    };
    window.__jzSeek = t => {
      window.__jzFreeze();
      document.getAnimations().forEach(a => {
        if (!/^jz122/.test(a.animationName || '')) return;
        try { a.pause(); a.currentTime = t; } catch (_) {}
      });
    };
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });

  /* ── A. 보너스 뱃지 흔들림 — AN[7] ────────────────────────────────── */
  console.log('\n§A 보너스 뱃지(.cn-cd>.cp) 흔들림 — computed rotate vs 렌더 bbox 높이');
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(250);

  const badge = [];
  for (const t of DIA_STOPS) {
    await p.evaluate(ms => window.__jzSeek(ms), t);
    const row = await p.evaluate(() => [...document.querySelectorAll('.cn-cd>.cp')].map(e => {
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return { rot: cs.rotate, tf: cs.transform, dsp: cs.display,
        w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        anim: cs.animationName, del: cs.animationDelay };
    }));
    badge.push({ t, row });
  }
  if (!badge[0].row.length) { console.log('  (뱃지 칸이 렌더되지 않았다 — 상태 주입 확인 필요)'); }
  else {
    for (let i = 0; i < badge[0].row.length; i++) {
      const hs = badge.map(f => f.row[i].h), rs = badge.map(f => f.row[i].rot);
      const hMin = Math.min(...hs), hMax = Math.max(...hs);
      console.log('   뱃지' + (i + 1) + '  display=' + badge[0].row[i].dsp +
        ' anim=' + badge[0].row[i].anim + ' delay=' + badge[0].row[i].del);
      console.log('     rotate  ' + rs.join(' | '));
      console.log('     bbox h  ' + hs.join(' | ') + '   (w ' + badge[0].row[i].w + ')');
      console.log('     Δh = ' + (hMax - hMin).toFixed(2) + 'px');
    }
    /* 사양: ±4° · 폭 w 인 알약의 bbox 높이는 h·cosθ + w·sinθ.
       회전이 실제로 걸렸다면 표본이 주기의 80% 를 덮으므로 Δh 가 최소 4px 은 나와야 한다. */
    const dh = Math.max(...badge[0].row.map((_, i) => {
      const hs = badge.map(f => f.row[i].h); return Math.max(...hs) - Math.min(...hs);
    }));
    ok(dh >= 4, 'A1 뱃지 회전이 렌더 bbox 를 실제로 키운다 — 최대 Δh = ' + dh.toFixed(2) + 'px (>=4)');
    const rotVaries = badge[0].row.some((_, i) => new Set(badge.map(f => f.row[i].rot)).size >= 4);
    ok(rotVaries, 'A2 computed rotate 가 표본마다 다르다(애니메이션이 실제로 돈다)');
  }

  /* ── B. 숨쉬기 정점 «체류» — AN[4] ────────────────────────────────── */
  console.log('\n§B 상자 숨쉬기 정점 체류 — 한 주기를 40등분해 computed scale 을 읽는다');
  await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
  await p.waitForTimeout(250);

  const per = await p.evaluate(() => {
    const e = document.querySelector('.shp-card .cart');
    return e ? getComputedStyle(e).animationDuration : '';
  });
  console.log('   .cart animation-duration = ' + per);
  const T = parseFloat(per) * 1000 || 2800;

  const sc = [];
  for (let k = 0; k < 40; k++) {
    const t = Math.round(T * k / 40);
    await p.evaluate(ms => window.__jzSeek(ms), t);
    const v = await p.evaluate(() => {
      const e = document.querySelector('.shp-card .cart');
      const cs = getComputedStyle(e);
      return { s: cs.scale, r: cs.rotate, tr: cs.translate };
    });
    const n = parseFloat(v.s) || 1;
    sc.push({ t, s: n, r: v.r, tr: v.tr });
  }
  const sMin = Math.min(...sc.map(o => o.s)), sMax = Math.max(...sc.map(o => o.s));
  const amp = sMax - sMin;
  const dwell = sc.filter(o => o.s >= sMin + amp * 0.9).length / sc.length;
  console.log('   scale ' + sMin.toFixed(4) + ' ~ ' + sMax.toFixed(4) + '  (진폭 ' + amp.toFixed(4) + ')');
  console.log('   ≥피크90% 체류 = ' + (dwell * 100).toFixed(1) + '%   (순수 사인파 = 20.5%)');
  console.log('   표본: ' + sc.filter((_, i) => i % 4 === 0).map(o => o.t + 'ms:' + o.s.toFixed(4)).join(' '));
  ok(amp >= 0.035 && amp <= 0.045, 'B1 숨쉬기 진폭 4% — 실측 ' + (amp * 100).toFixed(2) + '%');
  ok(dwell >= 0.28, 'B2 정점 «평지»(키프레임 44~56%)가 실제로 걸린다 — ≥피크90% 체류 ' +
    (dwell * 100).toFixed(1) + '% (>=28% · 사인파 20.5%)');

  /* ── C. 소환 카드 버튼 — AN[6] «C3 세 버튼이 죽은 섬» ──────────────── */
  console.log('\n§C 소환 카드 버튼에 붙은 연출 — 카드별로 같은 규칙 한 벌인가');
  const btn = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#shopList>.shp-card').forEach((c, ci) => {
      c.querySelectorAll('.cbtn').forEach(b => {
        const cs = getComputedStyle(b);
        const bef = getComputedStyle(b, '::before').animationName;
        const aft = getComputedStyle(b, '::after').animationName;
        out.push({ card: ci + 1, txt: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16),
          cls: b.className, anim: cs.animationName, bef, aft });
      });
    });
    return out;
  });
  btn.forEach(o => console.log('   C' + o.card + '  "' + o.txt + '"  cls=' + o.cls +
    '  anim=' + o.anim + '  ::before=' + o.bef + '  ::after=' + o.aft));
  const byCard = {};
  btn.forEach(o => { (byCard[o.card] = byCard[o.card] || []).push(o); });
  const liveOf = c => (byCard[c] || []).filter(o =>
    /jz122/.test(o.anim) || /jz122/.test(o.bef) || /jz122/.test(o.aft)).length;
  Object.keys(byCard).forEach(c =>
    console.log('   C' + c + ' 버튼 ' + byCard[c].length + '개 중 연출 붙은 것 ' + liveOf(c) + '개'));
  const cards = Object.keys(byCard);
  const allLive = cards.every(c => liveOf(c) === byCard[c].length);
  ok(allLive, 'C1 모든 소환 카드의 모든 버튼에 상시 연출이 붙어 있다 — ' +
    cards.map(c => 'C' + c + ' ' + liveOf(c) + '/' + byCard[c].length).join(' · '));

  /* ── D. 헤더 띠가 제목 글자 위인가 아래인가 — AN[11] ──────────────── */
  console.log('\n§D 헤더 띠 · 본문 광택의 쌓임 순서 (글자보다 위면 잉크를 깎는다)');
  const z = await p.evaluate(() => {
    const c = document.querySelector('#shopList>.shp-card');
    if (!c) return null;
    const g = (sel, pe) => { const e = c.querySelector(sel); return e ? getComputedStyle(e, pe) : null; };
    const pick = cs => cs ? { z: cs.zIndex, pos: cs.position, mix: cs.mixBlendMode } : null;
    return {
      hdBefore: pick(g('.chd', '::before')), hdAfter: pick(g('.chd', '::after')),
      hdText: pick(g('.chd>b') || g('.chd>span') || g('.chd')),
      frAfter: pick(g('.cfr', '::after'))
    };
  });
  console.log('   ' + JSON.stringify(z));

  console.log('\n  ' + (errs.length ? '✗' : '✓') + ' 콘솔 에러 ' + errs.length + ' ' + errs.slice(0, 2).join(' | '));
  if (errs.length) fail++; else pass++;

  await b.close();
  console.log('\nPROBE122R18 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
