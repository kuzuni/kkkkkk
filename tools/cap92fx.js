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
const { chromium } = require('playwright');
const path = require('path');

const pre = process.argv[2] || 'docs/review/92-fx';
/* ms — 접힘 .42s + 행 스태거 90ms → 관측 구간 0~510ms 를 8등분.
   `currentTime` 은 **딜레이 포함** 타임라인이라 스태거된 2번째 행도 같은 t 로 맞는다. */
const STOPS = [0, 75, 150, 225, 300, 375, 450, 540];

(async () => {
  const b = await chromium.launch();
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
  });
  await p.waitForTimeout(150);

  await p.screenshot({ path: path.resolve(__dirname, '..', `${pre}-pre.png`) });
  console.log(`frame pre (트리거 직전)     → ${pre}-pre.png`);

  /* 클릭 — 260ms 재렌더 setTimeout 을 가로채 붙잡고, 접힘 애니메이션을 정지시킨다 */
  await p.evaluate(() => {
    window.__held = null;
    const raw = window.setTimeout;
    window.setTimeout = function (fn, ms) {
      /* 92 삭제 재렌더(.40s + 스태거 + 20). 파티클 수명 타이머(620ms)와 섞이지 않게 400~600 만 */
      if (ms >= 400 && ms <= 800) { window.__held = fn; return 0; }
      return raw.apply(window, arguments);
    };
    document.getElementById('mailDel').click();
    window.setTimeout = raw;
    /* ⚠ `getAnimations()` 는 **스타일 재계산이 돈 뒤에야** 새 CSS 애니메이션을 안다.
       클릭 직후 동기로 부르면 0개가 나온다(3회차에 실제로 그랬다 — 2회차에는 `fxPop` 의
       `void offsetWidth` 가 우연히 플러시를 해 주고 있었다). 강제로 레이아웃을 읽어 플러시한다. */
    void document.body.offsetHeight;
    document.querySelectorAll('.ml-r.out').forEach((r) => void getComputedStyle(r).animationName);
    /* 상자(`mlOut`)와 내용 페이드(`mlOutIn`)를 **같이** 잡아 같은 t 로 탐색한다 —
       하나만 멈추면 내용 알파가 프레임과 어긋난다. */
    window.__anims = document.getAnimations()
      .filter((a) => a.animationName === 'mlOut' || a.animationName === 'mlOutIn');
    window.__anims.forEach((a) => a.pause());
  });
  const n = await p.evaluate(() => window.__anims.length);
  console.log(`  접힘 애니메이션 ${n}개 정지 — 프레임을 정확한 ms 로 탐색한다`);
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
