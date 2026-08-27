/* 작업 163 — 로딩 화면 «플레이어 등장» 연출의 **시간축 실측기**.
   실행: node tools/probe163.js
   페이지를 열자마자 5ms 간격으로 #loading 의 상태(클래스·불투명도·캐릭터 x·진행바)를 폴링해
   ⓐ 아틀라스 도착 시각 ⓑ knight 도착(=달리기 시작) ⓒ 등장 종료 ⓓ 페이드 시작 ⓔ display:none 시각을 뽑는다.
   게이트(verify163)가 «800ms 전에 사라진다» 를 단언할 때 근거로 쓰는 값이 이것이다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));

  /* ★ 폴링(setTimeout 5ms)으로 재면 안 된다 — 로딩 중에는 파싱·디코드가 메인 스레드를 잡아
     타이머가 수백 ms 굶는다(1차 실측에서 1600ms 동안 표본이 22개뿐이었다. 149·161 의
     «계측이 틀리면 FAIL 로 위장하고 온다» 와 같은 함정). 클래스 전이는 **MutationObserver**
     로 «바뀐 그 순간» 을 찍고, 이동 궤적만 rAF 로 남긴다. */
  await page.addInitScript(() => {
    window.__ev = [];                                     /* {k, t} — 전이 시각(performance.now) */
    window.__tr = [];                                     /* {t, x} — 캐릭터 이동 궤적 */
    const mark = (k) => { if (!window.__ev.some(e => e.k === k)) window.__ev.push({ k, t: performance.now() }); };
    const boot = () => {
      const el = document.getElementById('loading'), cv = document.getElementById('ldHero');
      if (!el) { requestAnimationFrame(boot); return; }
      mark('loading-dom');
      const look = () => {
        const cs = getComputedStyle(el);
        if (cv && cv.classList.contains('on')) mark('hero-on');
        if (el.classList.contains('thru')) mark('boot');
        if (el.classList.contains('out')) mark('fade');
        if (cs.display === 'none') mark('gone');
      };
      new MutationObserver(look).observe(el, { attributes: true, attributeFilter: ['class'], subtree: true });
      look();
      const trace = () => {
        if (cv && cv.style.transform) {
          const m = /(-?\d+)/.exec(cv.style.transform);
          window.__tr.push({ t: Math.round(performance.now()), x: m ? +m[1] : 0,
            op: +getComputedStyle(el).opacity });
        }
        if (performance.now() < 2000) requestAnimationFrame(trace);
      };
      trace();
    };
    boot();
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const { ev, tr, k } = await page.evaluate(() => ({
    ev: window.__ev, tr: window.__tr,
    k: { LD_MIN: LD.MIN, LD_RUN: LD.RUN, LD_GRACE: LD.GRACE, LD_FADE: LD.FADE, LD_X0: LD.X0, ldRunAt: Math.round(LD.runAt()) }
  }));

  const at = (n) => { const e = ev.find(x => x.k === n); return e ? Math.round(e.t) : null; };
  console.log('상수', k);
  console.log('  #loading DOM                   :', at('loading-dom'), 'ms');
  console.log('  캐릭터 등장 시작(knight 도착)  :', at('hero-on'), 'ms  (ldRunAt', k.ldRunAt + ')');
  console.log('  게임 부팅(.thru, 아틀라스 전부):', at('boot'), 'ms');
  console.log('  페이드 시작(.out)              :', at('fade'), 'ms');
  console.log('  display:none                   :', at('gone'), 'ms   ← 게이트 기준선 800ms');
  console.log('  등장 궤적(t, x, 오버레이 불투명도):');
  tr.filter((_, i) => i % 2 === 0).slice(0, 16)
    .forEach(r => console.log('     ', String(r.t).padStart(5), String(r.x).padStart(6), r.op.toFixed(2)));
  const last = tr[tr.length - 1];
  console.log('  마지막 궤적 표본:', last);
  console.log('  콘솔 에러', errs.length, errs.slice(0, 3));
  await browser.close();
})();
