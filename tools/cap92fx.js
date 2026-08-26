/* 작업 92 — [읽음 전체 삭제] 연출 연속 프레임 캡처 (1080×2280).
   지시서 [3]-(다): 정지 1장이 아니라 연속 프레임 6~8장을 비평가에게 준다.

   ⚠ 1회차 교훈 — «고정 간격 waitForTimeout + screenshot» 으로는 **짧은 연출을 못 찍는다.**
   `page.screenshot()` 한 장이 100~200ms 걸려서 «+35ms 프레임» 이 실제로는 +300ms 에 찍힌다.
   그러면 비평가는 «.42s 짜리가 70ms 만에 끝났다» 고 **캡처 아티팩트를 연출 결함으로 채점**한다
   (실제로 1회차 비평가 A 가 그렇게 읽었다). 그래서 이 하네스는 **Web Animations API 로 정지·탐색**한다:
     ① 클릭 → `.ml-r.out` 의 애니메이션을 즉시 `pause()`
     ② `currentTime` 을 0·35·70·…·245ms 로 **정확히** 옮겨 가며 1장씩 찍는다
     ③ 연출 뒤 재렌더는 `setTimeout` 을 가로채 붙잡아 뒀다가 마지막에 손으로 실행한다(착지 프레임)
   → 프레임 라벨의 ms 가 **실제 애니메이션 진행 시각과 일치**한다.

   실행: node tools/cap92fx.js [접두어]     (기본 docs/review/92-fx)
   LESSONS 28-③ — 캔버스가 잉크 스캔을 오염시키므로 #view 를 숨기고 평탄한 중간톤을 깐다. */
/* 127 — 클라우드 러너에는 번들 브라우저가 없다. 게이트 공용 부트스트랩을 쓴다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const pre = process.argv[2] || 'docs/review/92-fx';
/* ms — 접힘 .30s + 스태거 0 → 관측 구간 0~320ms 를 8등분.
   림 플래시 피크를 반드시 포함시킨다 — 12회차까지 피크가 프레임 사이로 빠져 있었다.
   14회차에 커브를 «등속 + 착지» 로 바꾸면서 피크가 36 → 30ms 로 옮겨졌고,
   15회차에 플래시를 6→16px(어택 40ms)로 키우면서 피크가 **40ms**(13.33%) 가 됐다. */
/* 16회차 — α 가 300 → **210ms** 에 0 이 됐으므로(§6-19) 표본을 새 타임라인에 다시 맞춘다.
   210 을 반드시 넣어 «카드가 마지막으로 보이는 프레임» 을 잡고, 그 뒤 260·320 으로
   «카드는 없고 남는 행만 계속 올라오는» 구간과 착지를 담는다. 플래시 피크 40ms 는 그대로. */
/* ★ 18회차 — 285ms 를 넣었다. 17회차 채점에서 비평가 **둘 다** «260 → 320 두 표본만 보고»
   «68.8px/프레임 등속으로 달리다 한 프레임에 0 = 하드 스톱» 이라고 적었는데, probe92 의 10ms
   전수 표본은 240ms 이후가 0.34 → 0.13px/ms 로 **감속 착지**한다고 말한다(재가속 0.003).
   착지 구간이 표본 사이에 통째로 들어가 있어서 «안 보이니 없다» 로 읽힌 것이다.
   250·285 를 주면 착지를 직접 볼 수 있다. 스태거 50ms 를 넣었으므로 창도 320 → 370 으로 늘린다. */
/* ★ 22회차 — 표본 목록을 **인자로 받게** 했다. §7-18 이 «T=300 과 T=210 두 벌을 캡처해 비평가에게
   직접 물어라» 로 넘겼는데, 타임라인이 0.70배가 되면 같은 ms 표본은 **다른 진행률**을 찍는다
   (예: 165ms 가 T=300 에서는 55% 인데 T=210 에서는 79%). 두 벌을 «같은 진행률» 로 맞춰야
   비평가가 «어느 쪽이 나은가» 를 타이밍만 놓고 비교할 수 있다.
   `node tools/cap92fx.js <접두어> 0,28,52,84,115,147,175,200,260` 처럼 준다. */
const STOPS = (process.argv[3] || '0,40,75,120,165,210,250,285,370')
  .split(',').map((s) => Math.round(+s.trim()));

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 5통 중 **2·4번째만 수령** 해 둔다 — 목록 «중간» 이 접혀야 남는 행이 위로 당겨지는지 보인다.
     상태를 직접 넣고 재렌더한다(수령 연출과 섞이면 삭제 연출만 보는 캡처가 안 된다). */
  await p.evaluate(() => {
    S.mail[MAILS[1].id] = 1; S.mail[MAILS[3].id] = 1;
    save(); openMail();
  });
  await p.waitForTimeout(400);
  /* 60 등장 애니메이션이 항등이 될 때까지(cap69 와 같은 처방) */
  for (let i = 0; i < 60; i++) {
    const done = await p.evaluate(() => {
      const ident = (t) => t === 'none' || /^matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)$/.test(t);
      for (let e = document.querySelector('.mbox'); e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (!ident(cs.transform) || (cs.scale && cs.scale !== 'none' && cs.scale !== '1')) return false;
        if (parseFloat(cs.opacity) < 0.999) return false;
      }
      return true;
    });
    if (done) break;
    await p.waitForTimeout(50);
  }
  await p.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.getElementById('stagearea'); if (st) st.style.background = '#6A3844';
    /* LESSONS 58-2 — 게임 로직만 죽인다(`draw()`·`fxTick()` 은 계속 돌아 연출은 그대로 보인다).
       안 멈추면 유휴 전투 수입이 프레임마다 HUD 골드를 굴려서(비평가 G: «375·450 프레임의 헤더
       골드 1.9→4») 삭제 연출과 무관한 변화가 캡처에 섞이고, 비평가가 그걸 채점하려 든다. */
    if (typeof window.step === 'function') window.step = () => {};
  });
  await p.waitForTimeout(150);

  await p.screenshot({ path: path.resolve(__dirname, '..', `${pre}-pre.png`) });
  console.log(`frame pre (트리거 직전)     → ${pre}-pre.png`);

  /* 클릭 — 재렌더 setTimeout 을 가로채 붙잡고, 접힘 애니메이션을 정지시킨다.

     ⚠ 6회차 교훈 — 여기서 `el.click()` 을 쓰면 **버튼 눌림이 캡처에 안 나온다.** 60 쥬시니스의
     눌림(`jz-dn` scale .94 → `jz-up` 스프링 1.04)은 `pointerdown` 캡처 리스너에 걸려 있는데
     합성 `click()` 은 pointer 이벤트를 **하나도 안 만든다**. 그래서 6회차 비평가 L 이
     «탭 지점이 540ms 동안 완전 무반응, 채움색 픽셀 동일» 이라고 채점했다 — 실측하면 실제 입력에서는
     305 → 286.7px(−6%)로 멀쩡히 눌린다. **캡처 아티팩트를 연출 결함으로 채점당한 3번째 사례다.**
     → 진짜 마우스 입력으로 누르고, 눌림 애니메이션도 `mlOut` 과 **같은 타임라인으로 정지·탐색**한다
     (안 그러면 눌림만 실시간으로 흘러 프레임과 어긋난다). */
  await p.evaluate(() => {
    window.__held = null; window.__heldMs = [];
    window.__raw = window.setTimeout;
    window.setTimeout = function (fn, ms) {
      /* 92 삭제 재렌더(.30s + 스태거 + 20). 파티클 수명 타이머와 섞이지 않게 240~800 만.
         ★ 22회차 — 하한을 300 → **240** 으로 내렸다. T=210 변형은 재렌더가
         210 + 35 + 20 = **265ms** 라 옛 창(300~800) 밖으로 새고, 그러면 착지 프레임이
         «붙잡아 둔 재렌더» 가 아니라 실시간으로 먼저 지나가 버린다(=end 프레임이 거짓이 된다).
         붙잡은 값은 `__heldMs` 로 밖에 찍어 **무엇을 붙잡았는지 눈으로 확인**한다. */
      if (ms >= 240 && ms <= 800) { window.__heldMs.push(ms); window.__held = fn; return 0; }
      return window.__raw.apply(window, arguments);
    };
  });
  const bb = await p.evaluate(() => {
    const r = document.getElementById('mailDel').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await p.mouse.move(bb.x, bb.y);
  await p.mouse.down();
  await p.mouse.up();
  await p.evaluate(() => {
    window.setTimeout = window.__raw;
    /* ⚠ `getAnimations()` 는 **스타일 재계산이 돈 뒤에야** 새 CSS 애니메이션을 안다.
       클릭 직후 동기로 부르면 0개가 나온다(3회차에 실제로 그랬다 — 2회차에는 `fxPop` 의
       `void offsetWidth` 가 우연히 플러시를 해 주고 있었다). 강제로 레이아웃을 읽어 플러시한다. */
    void document.body.offsetHeight;
    document.querySelectorAll('.ml-r.out').forEach((r) => void getComputedStyle(r).animationName);
    /* 상자(`mlOut`)와 내용 페이드(`mlOutIn` 좌측 · `mlOutR` 우측)를 **전부 같이** 잡아
       같은 t 로 탐색한다 — 하나라도 빠지면 그 요소의 알파가 프레임과 어긋난다. */
    window.__anims = document.getAnimations()
      .filter((a) => /^(mlOut|mlOutIn|mlAcc|mlFoot|mlIco|mlBtn|mlSum|mlTtl|jzDn|jzUp)$/.test(a.animationName));
    window.__anims.forEach((a) => a.pause());
  });
  const n = await p.evaluate(() => window.__anims.length);
  console.log(`  접힘 애니메이션 ${n}개 정지 — 프레임을 정확한 ms 로 탐색한다`);
  const heldMs = await p.evaluate(() => window.__heldMs);
  /* 창 안에 걸리는 타이머는 2개다 — 토스트 수명(760ms)과 삭제 재렌더. `__held` 는 **마지막에 등록된
     것**을 쓰는데 재렌더가 항상 뒤에 등록되므로 그것이 잡힌다. 값을 찍어 두는 이유는,
     T 를 바꿨을 때 «재렌더 = MLDEL_DUR + (n−1)·stag + 20» 이 실제로 그 값인지 눈으로 확인하기 위해서다
     (T=300·스태거50 → 370 · T=210·스태거35 → 265). */
  console.log(`  붙잡은 타이머: [${heldMs.join(', ')}] ms — 마지막(${heldMs[heldMs.length - 1]})이 삭제 재렌더다`);
  if (!heldMs.length) { console.log('  ✗ 재렌더 타이머를 못 잡았다 — end 프레임을 믿지 마라.'); }
  if (!n) { console.log('  ✗ 애니메이션을 못 잡았다 — 캡처가 정지 화면이 된다. 중단.'); await b.close(); process.exit(1); }

  for (const t of STOPS) {
    const state = await p.evaluate((ms) => {
      window.__anims.forEach((a) => { a.currentTime = ms; });
      const rs = [...document.querySelectorAll('.ml-r')];
      const dx = (r) => { const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(r).transform);
        return m ? Math.round(parseFloat(m[1].split(',')[4])) : 0; };
      return { h: rs.map((r) => Math.round(r.getBoundingClientRect().height)).join('/'),
        x: rs.map(dx).join('/'), op: rs.map((r) => (+getComputedStyle(r).opacity).toFixed(2)).join('/') };
    }, t);
    await p.screenshot({ path: path.resolve(__dirname, '..', `${pre}-${t}.png`) });
    console.log(`frame +${String(t).padStart(3)}ms  h ${state.h}  x ${state.x}  a ${state.op}  → ${pre}-${t}.png`);
  }

  /* 착지 — 붙잡아 둔 재렌더를 실행한다 */
  await p.evaluate(() => { window.__anims.forEach((a) => a.finish()); if (window.__held) window.__held(); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.resolve(__dirname, '..', `${pre}-end.png`) });
  const after = await p.evaluate(() => ({
    rows: [...document.querySelectorAll('.ml-r [data-ml]')].map((x) => x.dataset.ml),
    del: MAILS.filter((m) => S.mail[m.id] === 2).map((m) => m.id),
    h: [...document.querySelectorAll('.ml-r')].map((r) => Math.round(r.getBoundingClientRect().height)).join('/')
  }));
  console.log(`frame end (재렌더 착지)     행 높이 ${after.h}  → ${pre}-end.png`);
  console.log('남은 행:', after.rows.join(','), '| 삭제됨:', after.del.join(','));
  console.log('console errors:', errs.length);
  if (errs.length) errs.slice(0, 8).forEach((e) => console.log('  ERR', e));
  await b.close();
})();
