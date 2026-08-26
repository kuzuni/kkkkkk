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
/* 4회차 — 비평가 Q 가 «[교환] 링이 아예 없다 / 다이아 칸은 t=0 과 t=5200 이 픽셀 동일» 이라고 읽은 것은
   **캡처 시각이 주기의 배수에 걸린 것**(위상 앨리어싱)이었다: 링 0.9s 인데 0/900 을 찍었고
   다이아 4장이 전부 링의 «꺼진 꼬리»(70~100%)에 앉았다. 이제 세 가지를 같이 만족시킨다 —
     ⓐ 0.9s(링) · 2.6s(둥실) · 4.6s(카드 스윕) · 4s(헤더 스윕) 의 **배수에 겹치지 않는** 시각
     ⓑ 카드별 «들썩 최대 진폭» 시각(92% 지점: 1460 / 3500·3580 / 5620 / 6240 / 8500)을 실제로 포함
     ⓒ 20s 광선의 서로 다른 각도 */
const STOPS = [0, 260, 620, 1460, 2450, 3560, 5620, 8500, 11150, 13240];
const DIA_STOPS = [0, 260, 620, 1150, 2450, 5620];

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

async function frames(p, tag) {
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
  for (let i = 0; i < STOPS.length; i++) {
    const t = STOPS[i];
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
  for (const [i, t] of DIA_STOPS.entries()) {
    await p.evaluate(ms => window.__jzSeek(ms), t);
    const f = path.join(OUT, '122-' + R + '-dia-' + (i + 1) + '.png');
    await p.screenshot({ path: f });
    console.log('  ' + path.basename(f) + '  t=' + t + 'ms');
  }

  console.log(errs.length ? '콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | ') : '콘솔 에러 0');
  await b.close();
})();
