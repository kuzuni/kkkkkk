/* 작업 122 — 10 소환 탭 · 13 재화 탭 «상시 연출(쥬시)» 연속 프레임 캡처 (1080×2280).
   지시서 [3]-(다): 정지 1장이 아니라 연속 프레임 6~8장을 비평가 2명에게 준다.

   ⚠ 122 는 «트리거 직후» 가 아니라 **무한 루프 상시 연출**이라 캡처 규칙이 92·114 와 다르다.
   그래도 LESSONS 60-⑤ 는 그대로다 — 헤드리스 스크린샷 1장이 수백 ms 라 «간격» 으로는
   2.4~20s 짜리 위상을 재현할 수 없다(같은 t 를 두 번 찍어도 다른 그림이 나온다).
   그래서 여기서도 **Web Animations API 로 전부 pause 하고 `currentTime` 을 손으로 세운다**:

     ① 페이지를 열고 60 등장 연출이 끝날 때까지 기다린다(등장 팝이 상시 연출 위에 겹치면 오독).
     ② **122 가 아닌 애니메이션은 seek 하지 않고 `finish()`/`cancel()` 로 못 박는다**(LESSONS 60-⑤).
        안 그러면 60 의 페이지 등장 팝(`jzPgIn{0%{scale:.985}}`)이 t=0 으로 되감겨
        **첫 프레임만 페이지 전체가 98.5% 로 줄어든** 채 납품된다 — 비평가는 그걸 «크기가 튄다» 로 읽는다.
     ③ 프레임마다 **jz122* 애니메이션의 `currentTime` 을 같은 t 로** 세운다.
        `currentTime` 은 딜레이 포함 타임라인이라 카드별 위상(-.3s/-1.4s/…)이 그대로 살아난다.
        seek 와 screenshot 사이에 게임 로직이 끼어들지 못하도록 `step` 을 죽여 둔다.
     ④ t 는 «키프레임 위» 에만 앉히지 않는다(LESSONS 60-⑤ 4번째 함정) — 극점과 사이를 섞는다.

   실행: node tools/cap122.js [회차]        (기본 r1 → docs/review/122-r1-{sum,coin}-N.png)
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const R = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/review');

/* ms — 8장. 상시 연출의 가장 짧은 주기가 0.9s(무료 링)·1.8s(스파클)이고 가장 긴 것이 20s(광선)이라
   «짧은 것의 한 바퀴 + 긴 것의 눈에 띄는 변화» 를 같이 담으려면 등간격이 답이 아니다.
   앞 4장은 0.9~1.8s 주기를 훑고(0/230/450/900), 뒤 4장은 들썩(6~9s)·광선(20s)을 잡는다. */
/* 2회차 — 1회차 stops 는 «들썩»(주기의 마지막 8%)을 **32샘플 중 0회** 잡았다.
   비평가 N 이 «들썩이 아예 없다» 고 읽은 것의 절반은 이 캡처 탓이다(LESSONS 60 «내 연출과 내 캡처를
   같은 무게로 의심해라»). 카드별 주기·딜레이(6/7/8/6.5/9s · −1.1/−3.6/−5.9/−2.4/−7.2s)로
   «몇 장이 동시에 들썩 구간에 있는가» 를 풀어 t=1600(2장) · t=10200(3장) 을 넣었다. */
/* 5회차 — 들썩 주기를 3.6~4.4s 로 줄였으므로(T ②-5) 최대 진폭 시각을 다시 풀었다:
   카드별 92% 지점 = 80 / 864 / 1096 / 2212 / 2548ms, 2장 이상 동시 = 1000~1180 · 2380~2400.
   나머지 시각은 링(0.9~1.35s) · 둥실(2.6s) · 헤더 스윕(4s) · 카드 스윕(4.6s) · 스파클(5.4s) ·
   광선(20s) 의 배수를 피해 고른다(4회차에 위상 앨리어싱으로 «연출이 없다» 는 오독을 세 번 받았다).
   광선은 20s 라 표본이 한쪽에 몰리지 않게 8300·15700·18900 을 넣는다. */
/* ⚑ 9회차 — 정지 시각을 주기에 맞춰 다시 잡았다.
   8회차까지의 [80,620,1096,1500,2212,2548,3300,5150,8300,15700] 은 주기 4.0~7.4s 시절 격자다.
   9회차에 주기가 **3.0~3.4s 한 벌**로 좁아져 그대로 쓰면 표본이 한 주기를 여러 바퀴 건너뛰어
   «띠가 순간이동한다 / 연출이 없다» 로 읽힌다 — 1·4회차에 실제로 겪은 위상 앨리어싱이다.
   → 앞 9장을 **320ms 등간격**(≈ 심 노출창 0.32s)으로 한 주기(3.2s) 안에 채운다.
     연속 두 장 사이에 띠가 자기 심 폭만큼 나아가므로 비평가가 속도·이징·주차 구간을 직접 잴 수 있다.
   마지막 1장(t=8300)은 먼 위상 — «다른 주기에서도 같은 그림인가» 를 보는 대조군이다. */
const STOPS = [80, 400, 720, 1040, 1360, 1680, 2000, 2320, 2640, 8300];
/* ⚠ 5회차 실측 — 위 배열에서 **카드1 의 최대 진폭 시각(2212ms)** 이 빠져 있었다.
   그 결과 비평가 V 가 «전 카드 전 프레임 회전 0.0°, 코드가 아예 안 걸려 있다» 고 읽었다.
   런타임 실측은 정반대다 — t=80 카드2 **−3.00°/−6.0px**, t=1096 카드4 −3.00°/−6.0px,
   t=2548 카드3 **+3.00°/−6.0px**(부호 교차까지 의도대로). 카드 5장의 92% 지점을
   **전부** 넣어야 «있는데 못 본» 오독이 안 난다. */
/* ⚑ 18회차 — 9회차의 `[80,560,1040,1520,2000,2480]` 은 «480ms 등간격 = 한 주기» 라고 적혀 있었지만
   6 × 480 = **2880ms** 이고 이 구역에 걸린 사양 주기는 5.4s(다이아 반짝임 = 1.8s × 3) · 2.6s(마일리지)
   · 3s(뱃지) · 1.2s(버튼 펄스) · 20s(광선) 뿐 — **2.88s 짜리는 하나도 없다.**
   18회차 비평가 둘이 독립으로 산술을 짚었다:
     AM[10] «1.2s 버튼 펄스는 t mod 1200 = 80/560/1040/320/800/**80** 이라 1번과 6번 프레임의
             위상이 같다 → 6장으로 5위상만 얻는다. 5.4s 반짝임은 44%만 덮는다»
     AN[20] «6점 × 480ms → 함의 주기 2880ms. 어떤 사양 주기와도 안 맞는다»
   → **675ms × 8장 = 5400ms** 로 바꾼다. 다이아 반짝임 5.4s 를 **정확히 한 바퀴** 덮고,
     1.2s 버튼 펄스는 675 와 1200 이 서로소라 8표본이 위상 8개로 흩어진다
     (t mod 1200 = 80/755/230/905/380/1055/530/5 — 겹치는 쌍 0).
     2.6s 마일리지·3s 뱃지도 각각 2.08바퀴·1.8바퀴라 정점을 밟는다. */
const DIA_STOPS = [80, 755, 1430, 2105, 2780, 3455, 4130, 4805];
/* ⚑ 18회차 신설 — **골드 광선 20s 전용.** 두 비평가가 «어느 캡처에도 방사형/고리 구조가 없다» 고
   적었는데 둘 다 같은 단서를 달았다: AM[9] «20s 주기를 2.4s 창으로 본 것이라 회전량이 43° 뿐 —
   «없다» 와 «12%만 봤다» 를 가르려면 2.5s 간격 8장을 따로 찍어야 한다» · AN[8] «6프레임 × 480ms 는
   20s 의 12%. 설령 있어도 이 표본으로는 검증 불가능».  게이트 §21 은 광선이 실제로 도는 것을
   PASS 로 잡고 있다(섹터 최대 편차 5.63 · 반주기 뒤 섹터 변화 20.01) — 즉 **연출이 아니라 표본**의 문제다.
   2.5s × 8 = 20s 로 한 바퀴를 정확히 덮는다(칸당 45° 씩 돈다). */
const RAY_STOPS = [80, 2580, 5080, 7580, 10080, 12580, 15080, 17580];
/* ⚑ 17회차 신설 — **강제 상자(`gm`) 칸 전용**.
   16회차 비평가 AL 이 «73 강제 상자 칸이 26장 어느 캡처에도 없다 — 채점 불가» 라고 적었다.
   실측해 보니 «없다» 가 아니라 **잘려 있었다**: `gmBan()` 첫 미션이 `skill` 이라 강제 칸은
   소환 4번째 칸(top 1603 · h 450)인데 `#shopList` 의 바닥이 1946 이라 **아래 107px 이 잘린다**.
   글로우는 상자 «테두리 전체» 를 도는 연출이라 아래 변이 잘리면 진폭·주기를 못 잰다.
   → 그 칸이 통째로 보이도록 스크롤해서 따로 찍는다. 시각은 `jz122Gm` 의 주기 **2.8s** 를
     700ms 등간격(=1/4 주기)으로 채워 최저·상승·정점·하강이 한 장씩 잡히게 한다. */
const GM_STOPS = [80, 780, 1480, 2180];

/* 페이지 안에 «얼리기 · 세우기» 두 함수를 심는다.
   __jzFreeze() — jz122* 는 pause(무한 루프라 그대로 둔다), 그 밖은 finish()/cancel() 로 끝 상태 고정.
   __jzSeek(t)  — jz122* 만 t 로. 매번 얼리기를 다시 도는 이유는 재렌더로 새 노드가 생기면
                  그 노드의 애니메이션이 «지금부터» 다시 돌기 시작하기 때문이다. */
const INSTALL = () => {
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
};

async function frames(p, tag, stops) {
  const SET = stops || STOPS;
  await p.evaluate(() => {
    /* 상시 연출만 남긴다 — 전투 로직·HUD 굴림이 프레임마다 숫자를 바꾸면
       비평가가 그 차이를 «연출» 로 읽는다(LESSONS 58-2 · 92 G 지적). */
    if (typeof window.step === 'function') window.step = () => {};
    /* 2회차(M 채점 제외 항목) — 1회차 t=0 프레임에 **58 재화 획득 플라이**(전투 킬 골드 코인)가
       소환 버튼 위를 덮어 «1,000 / 3,000» 가격을 가렸다. 122 연출이 아닌데 비평을 오도한다.
       연출 레이어를 비우고, 그 뒤 남의 애니메이션은 finish()/cancel() 로 못 박는다. */
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
    window.__jzFreeze();
  });
  /* ⚑ 23회차 — **첫 프레임만 미정착이었다**(22회차 AV[7]). r22 실측: `sum-1` 의 HUD 골드 글자만
     잉크 **521px(+12.3%)** · bbox **50×25**(나머지 9장은 전부 464px · 43×24) — 얼리기 직전까지
     돌던 58 펀치(`.fx-punch2`, transform:scale)의 **마지막 합성 결과가 아직 화면에 안 올라온
     상태**로 첫 장이 찍힌다. `finish()` 는 애니메이션 상태만 끝내지, 그 결과가 **그려지는 것**은
     다음 프레임이다. 22회차 27-1 이 게이트에서 겪은 것과 **같은 병**(«재기 전에 화면이 덜 깨어
     있었다»)이고, 그때의 처방을 캡처에도 그대로 적용한다 — 얼린 뒤 **실제 페인트 두 번**을
     기다리고 한 번 더 얼린다(대기 중 새로 시작한 애니메이션까지 같이 못 박는다).
     ⚠ 이 프레임에 근거한 지적은 이 수정 전 캡처(r22 이하)에서는 받지 마라. */
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.waitForTimeout(120);
  await p.evaluate(() => window.__jzFreeze());
  for (let i = 0; i < SET.length; i++) {
    const t = SET[i];
    /* seek 와 read 를 나누지 않는다 — 한 태스크 안에서 끝낸다(LESSONS 60-⑤ 2번째 함정) */
    await p.evaluate(ms => window.__jzSeek(ms), t);
    const f = path.join(OUT, '122-' + R + '-' + tag + '-' + (i + 1) + '.png');
    await p.screenshot({ path: f });
    console.log('  ' + path.basename(f) + '  t=' + t + 'ms');
  }
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(INSTALL);

  /* 재화가 넉넉해야 «충분/부족» 두 상태가 아니라 정상 상태의 카드가 찍힌다.
     마일리지는 교환 가능선(MILE_NEED) 위로 올려 ②-4 글로우가 살아 있는 프레임을 만든다. */
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  console.log('[소환 탭]');
  await frames(p, 'sum');

  /* 재화 탭 — 같은 페이지 껍데기(#shopw) 안에서 콘텐츠만 갈아 끼운다.
     탭 전환 연출(60)이 남아 있으면 상시 연출 위에 겹치므로 한 번 재생시켜 끝낸 뒤 다시 pause 한다. */
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} });
    shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
  });
  await p.waitForTimeout(900);
  console.log('[재화 탭]');
  await frames(p, 'coin');

  /* 재화 탭 아래쪽(다이아 5칸 · 마일리지 패널)은 스크롤해야 보인다 — 2장만 따로 남긴다 */
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} });
    const rb = document.getElementById('cnDiaRb'), lw = document.getElementById('shopList');
    lw.scrollTop = lw.scrollTop + rb.getBoundingClientRect().top - lw.getBoundingClientRect().top - 40;
  });
  await p.waitForTimeout(500);
  console.log('[재화 탭 — 다이아·마일리지]');
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
    window.__jzFreeze();
  });
  /* 23회차 — `frames()` 와 같은 «페인트 두 번 기다리고 다시 얼리기»(첫 장 미정착 방지) */
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.waitForTimeout(120);
  await p.evaluate(() => window.__jzFreeze());
  for (const [i, t] of DIA_STOPS.entries()) {
    await p.evaluate(ms => window.__jzSeek(ms), t);
    const f = path.join(OUT, '122-' + R + '-dia-' + (i + 1) + '.png');
    await p.screenshot({ path: f });
    console.log('  ' + path.basename(f) + '  t=' + t + 'ms');
  }

  /* ⚑ 18회차 신설 — **골드 광선 20s 한 바퀴.** 다이아 구역 스크롤을 그대로 둔 채 2.5s 격자로 8장. */
  console.log('[재화 탭 — 골드 광선 20s 한 바퀴]');
  await frames(p, 'ray', RAY_STOPS);

  /* ⚑ 18회차 신설 — **들썩 창 버스트.**
     18회차 비평가 둘이 «30장 중 0장에 들썩이 안 잡힌다» 로 ① 을 깎았고, 둘 다 같은 산술을 썼다:
       «활성창은 주기의 마지막 8% = 3.6s→[3312,3600] … 표본 t=80~2640 은 어느 창에도 안 든다»
     ⚠ 그 산술은 **`animation-delay` 를 0 으로 가정한 것**이다. 실제 딜레이는
       −1.1 / −3.6 / −5.9 / −2.4 / −7.2s 라 창이 격자 안으로 끌려온다 — 실측하면 STOPS 안에서
       c1@2320 · c2@80 · c3@2640 · c4@1040 · c5@720 이 전부 **rot ±3.00° · dy −6px**(정확히 사양)이다.
       즉 «없다» 도 «못 봤다» 도 아니고 **한 프레임에 한 칸씩만 들썩인다**.
     그래도 지적은 정당하다 — 고립된 1프레임으로는 «움직였다» 를 읽을 수 없다(AM 은 실제로
     그 프레임의 주축각 −19.51° 를 «마스크 결손» 으로 버렸다. 나머지 프레임이 −22.3~22.7° 이니
     그 차이 2.8~3.2° 가 바로 ±3° 들썩이었는데도). → 칸1의 들썩 창을 **80ms 간격 6장**으로
     연속으로 덮어 «올라갔다 내려온다» 가 한 묶음으로 보이게 한다. */
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} });
    shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage();
    const lw = document.getElementById('shopList'); if (lw) lw.scrollTop = 0;
  });
  await p.waitForTimeout(900);
  const bobPeak = await p.evaluate(() => {
    /* 칸1 `.cart` 의 bob 트랙에서 |rotate| 최대 시각을 20ms 격자로 실측한다(선언이 아니라 결과) */
    const e = document.querySelector('#shopList>.shp-card .cart');
    if (!e) return null;
    const cs = getComputedStyle(e);
    const durs = cs.animationDuration.split(',').map(s => parseFloat(s) * 1000);
    const T = durs[1] || durs[0];
    let best = -1, bv = 0;
    for (let t = 0; t <= T; t += 20) {
      window.__jzSeek(t);
      const r = Math.abs(parseFloat(getComputedStyle(e).rotate) || 0);
      if (r > bv + 1e-6) { bv = r; best = t; }
    }
    return { t: best, rot: bv, T };
  });
  if (bobPeak && bobPeak.t >= 0) {
    const BOB = [-240, -160, -80, 0, 80, 160].map(d => Math.max(0, bobPeak.t + d));
    console.log('[소환 탭 — 칸1 들썩 창 버스트]  정점 t=' + bobPeak.t +
      'ms (|rot| ' + bobPeak.rot.toFixed(2) + '°, bob T=' + bobPeak.T + 'ms) · 80ms 간격 6장');
    await frames(p, 'bob', BOB);
  } else {
    console.log('[소환 탭 — 칸1 들썩 창 버스트] .cart 를 못 찾음 · 건너뜀');
  }

  /* 강제 상자(`gm`) 칸 — 17회차 신설. 소환 탭으로 돌아가 그 칸이 통째로 보이게 스크롤한다.
     `gmBan()` 이 null 이면(가이드를 이미 지난 세이브) 강제 칸 자체가 없으므로 건너뛴다. */
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} });
    shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage();
  });
  await p.waitForTimeout(900);
  const gmOk = await p.evaluate(() => {
    const c = document.querySelector('.shp-card.gm'), lw = document.getElementById('shopList');
    if (!c || !lw) return false;
    const cr = c.getBoundingClientRect(), lr = lw.getBoundingClientRect();
    /* 칸 아래 변이 리스트 바닥에서 24px 위에 오도록 — 글로우가 상자 «테두리 전체» 를 돈다 */
    lw.scrollTop += (cr.bottom - lr.bottom) + 24;
    return true;
  });
  if (gmOk) {
    await p.waitForTimeout(500);
    console.log('[소환 탭 — 강제 상자(gm) 칸]');
    await frames(p, 'gm', GM_STOPS);
  } else {
    console.log('[소환 탭 — 강제 상자(gm) 칸] gmBan() 이 null · 건너뜀');
  }

  /* ⚑ 19회차 — 17회차 AN[17] «[무료] 버튼이 30장 어디에도 없다 — 사양 한 줄이 통째로 미검증».
     «없다» 가 아니라 **표본에 안 들어왔다**가 맞다: 무료 링은 `.cbtn.b1:not(.lack)` 인데
     ① 게이트·자동 플레이가 무료 횟수를 소진시키면 `.lack` 이 되어 링이 꺼지고
     ② 소환 리스트가 굴러 있으면 그 버튼이 프레임 밖으로 밀린다.
     무료 횟수를 채운 상태로 1번 카드를 화면 가운데에 세우고 **링 주기(0.9s)를 4등분**해 찍는다.
     19회차에 신설한 가격 버튼 보조 링(b2·b3)도 같은 프레임에 들어온다 — 세 버튼의 위상차
     (1/3 격자)를 한 장씩 비교할 수 있는 유일한 표본이다. */
  /* ⚑ 20회차 — 이 격자가 **두 번 틀렸고 비평가 넷이 그 때문에 나란히 오독했다.**

     ⓐ **한 주기를 다 안 돈다.** [80,305,530,755] 는 span 675ms = 0.9s 주기의 **75%** 뿐이다.
        카드 사이 stride 가 2/5(−0.36s)라 칸마다 «자기 주기의 다른 토막» 이 잡히고, 그래서
        **칸별 세기 비교가 캡처 격자에 좌우된다.** 20회차 실측: 같은 링을 격리 12위상으로 재면
        칸별 Δ루마 산포 **1.63배**인데 이 4장으로 재면 **3.11배** — 칸3 은 4장 모두 저조 구간에
        걸려 6.14 로 읽힌다(격리값 13.25). 19·20회차 비평가 넷이 «칸3 링이 약하다» 를 지적한 것의
        상당 부분이 여기서 나왔다.
        → **한 주기를 «정확히» 8등분한다**(112.5ms). 균등 격자가 한 주기를 꽉 채우면 카드별
          위상 오프셋과 무관해진다 — 어느 칸을 재도 같은 8위상을 밟는다(오프셋 불변).

     ⓑ **칸5(초록)가 프레임 밖이었다.** 카드1 을 가운데 세우면 버튼 y 는 312/791/1270/1749/**2228**
        이라 다섯 번째가 잘린다. 20회차 비평가 **둘이 독립으로** «칸5 는 14장 어디에도 없다 —
        이번 회차가 고쳤다는 다섯 값 중 하나를 검증할 수 없다» 고 적었다.
        ⚠ 한 장에 다 담으려 했다가 **기하로 불가능**하다는 것을 실측으로 확인했다: 리스트의
        보이는 영역은 캔버스(2280)가 아니라 **하단 탭바에 잘려 ~1860px** 인데, [무료] 버튼 5칸의
        세로 span 은 **2014px** 다. `innerHeight` 로 «프레임 안» 을 판정하면 탭바 **뒤에** 숨은
        버튼을 «보인다» 로 세어 로그만 5칸이 된다(20회차에 실제로 그렇게 속았다).
        → **스크롤 두 자리로 나눠 찍는다**: `free`(칸1~3) + `freeb`(칸3~5). 칸3 이 두 묶음에
          겹쳐 들어가 밝기 비교의 기준칸이 된다. */
  const FREE_STOPS = [80, 192, 305, 417, 530, 642, 755, 867];
  const freeOk = await p.evaluate(() => {
    S.daily.freeSum = {};                 /* freeLeft() 는 «없는 키 → SHOP_FREE» 폴백이다 */
    renderShopPage();
    const c = document.querySelector('#shopList .shp-card');
    if (c) c.scrollIntoView({ block: 'center' });
    return [...document.querySelectorAll('#shopList .cbtn.b1')].filter(e => !e.classList.contains('lack')).length;
  });
  await p.waitForTimeout(400);
  /* ⚠ 칸5 를 프레임 안으로 넣는 보정은 **`scrollIntoView` 가 끝난 뒤** 따로 해야 한다.
     같은 evaluate 안에서 이어 하면 스크롤이 아직 정착 중이라 보정이 덮인다 —
     20회차에 그렇게 해서 «5칸» 이라고 로그를 찍고도 캡처에는 칸5 가 여전히 없었다.
     (자기 로그를 믿지 말고 «찍힌 그림» 을 확인할 것. 이 절이 그 교훈으로 만들어졌다.) */
  const freeIn = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('#shopList .cbtn.b1')];
    const last = btns[btns.length - 1];
    const lw = document.getElementById('shopList');
    if (last && lw) {
      const over = last.getBoundingClientRect().bottom - (innerHeight - 40);
      if (over > 0) lw.scrollTop += over;
    }
    /* ⚠ «프레임 안» 을 innerHeight 로 재면 **탭바 뒤에 숨은** 버튼까지 «보인다» 로 센다.
       리스트의 보이는 상자(clientRect)를 기준으로 재야 한다. */
    const lr = lw.getBoundingClientRect();
    return btns.filter(e => {
      const r = e.getBoundingClientRect();
      return r.top >= lr.top && r.bottom <= lr.bottom;
    }).length;
  });
  await p.waitForTimeout(250);
  console.log('[소환 탭 — [무료] 링이 켜진 상태] 무료 버튼 ' + freeOk + '칸 · 이 스크롤에서 프레임 안 ' + freeIn + '칸');
  if (freeOk > 0) await frames(p, 'free', FREE_STOPS);
  /* 두 번째 자리 — 리스트를 끝까지 굴려 칸3~5 를 담는다(칸5 가 여기서만 보인다) */
  if (freeOk > 0) {
    const freeIn2 = await p.evaluate(() => {
      const lw = document.getElementById('shopList');
      if (lw) lw.scrollTop = lw.scrollHeight;
      const lr = lw.getBoundingClientRect();
      return [...document.querySelectorAll('#shopList .cbtn.b1')].filter(e => {
        const r = e.getBoundingClientRect();
        return r.top >= lr.top && r.bottom <= lr.bottom;
      }).length;
    });
    await p.waitForTimeout(300);
    console.log('[소환 탭 — [무료] 링 · 리스트 바닥] 프레임 안 ' + freeIn2 + '칸 (칸5 포함)');
    await frames(p, 'freeb', FREE_STOPS);
  }

  console.log(errs.length ? '콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | ') : '콘솔 에러 0');
  await b.close();
})();
