/* 작업 540 — 하네스가 «치우는» 껍데기 한 벌 (공용)
 *
 * # 왜 파일로 뺐나
 * 게이트·프로브 9개가 각자 자기 파일에 **손으로 적은 닫개 목록**을 들고 있었고,
 * 그 아홉 벌이 서로 조금씩 달랐다(488 계열은 `closeRelw` 가 더 있고, 354 계열은
 * `closeTrain` 이 더 있다). 그중 **`closeDefeat` 는 제품에 없는 이름**이었다
 * (`index.html` 0건 — 524 가 `verify349` 에서 처음 잡았고, 540 이 나머지 여덟 자리를 걷었다).
 *
 * 목록이 `typeof window[fn] === 'function'` 가드 뒤에 있어서 **없는 이름은 조용히 삼켜진다** —
 * 그래서 «18 패배 화면을 치우는 팔» 이 아홉 자리 전부에서 **한 번도 돈 적이 없다.**
 * `#defw.on` 은 z39 · `inset:0` 이라 한 번 켜지면 클릭 말고는 끄는 경로가 없고,
 * 그 뒤 표본은 전부 «0회» 로 굳는다(`probe524` §1·§2 가 그 굳는 순간을 표로 찍는다).
 * 즉 이 유령은 «게이트가 가끔 빨개진다» 는 모양으로만 새어 나오는 **플레이키 씨앗**이었다.
 *
 * # 규약
 *  · `RESET_CLOSERS` 는 **제품에 실재하는 이름만** 담는다. 새 이름을 넣으면
 *    `verify540` [A2] 가 그 자리에서 빨개진다(유령 재유입 차단).
 *  · 이름이 **없는** 껍데기(18 패배 화면 `#defw` 가 그렇다)는 닫개로 못 끄므로
 *    `SHELL_IDS` 에 적어 **DOM 으로 직접** 끈다. 이름을 새로 만들지 않는 이유는
 *    제품 0줄이 이 작업의 조건이기 때문이다.
 *  · 목록은 **합집합 하나**다. 자마다 부분집합을 들면 «어느 자가 무엇을 안 치우는지» 를
 *    아무도 못 세고, 실제로 그래서 여덟 자리가 함께 유령을 물고 있었다.
 *    합집합이 안전한 이유는 아홉 자리가 예외 없이 «치운 뒤에 자기가 쓸 화면을 연다» 는
 *    순서를 지키기 때문이다(`clear → openTrain()/showSkillDetail()/…`).
 *
 * # 쓰는 법
 *   const { install, missingClosers, defeatStuck, defeatBlocked } = require('./closers540');
 *   await p.goto(URL); await p.waitForFunction(…);
 *   await install(p, { arm: true });     // arm = 게임 루프를 돌리는(=죽을 수 있는) 하네스
 *   …
 *   await p.evaluate(() => { window.__clear540(); … 내 화면을 연다 … });
 *
 * `arm: true` 는 `openDefeat` 의 **제품 경로는 그대로 부르고** 껍데기만 즉시 걷으며
 * **막은 횟수**를 센다(`__def540`). 늘 0 인 팔은 아무것도 증명하지 않는다(LESSONS 353-④) —
 * 게이트는 그 횟수를 함께 찍는다.
 */

/* 제품에 실재하는 닫개 — 아홉 자리가 들고 있던 목록의 합집합에서 유령을 뺀 것 */
const RESET_CLOSERS = [
  'closeDunClear',
  'closeModal',
  'closeDungeon',
  'closeSummonResult',
  'closeRelw',
  'closeTrain',
];

/* 닫개 함수가 **없는** 껍데기 — DOM 으로 직접 끈다. 여기 있던 유령이 `closeDefeat` 다. */
const SHELL_IDS = ['defw'];

/* 유령 이름 — 재유입 감시용(자·문서가 이 배열을 인용한다) */
const GHOSTS = ['closeDefeat'];

/* 페이지 안에 `window.__clear540()` 을 심는다.
   opts.arm 이면 `openDefeat` 껍데기 걷개도 같이 건다. */
async function install(page, opts) {
  await page.evaluate(o => {
    window.__CLOSERS540 = o.closers.slice();
    window.__SHELLS540 = o.shells.slice();
    window.__clear540 = function () {
      window.__CLOSERS540.forEach(fn => {
        try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {}
      });
      /* 이름이 없는 껍데기 — 여기가 유령이 삼켜지던 자리다 */
      window.__SHELLS540.forEach(id => {
        const d = document.getElementById(id);
        if (d) d.classList.remove('on');
      });
    };
    if (o.arm && !window.__armed540) {
      window.__armed540 = true;
      window.__def540 = 0;
      const _od = window.openDefeat;
      /* `openDefeat` 는 제품 주석대로 **표시 전용**(«자동 부활은 그대로 진행», 24134) —
         제품 경로는 그대로 부르고 껍데기만 걷는다. 판정을 바꾸지 않는다. */
      window.openDefeat = function () {
        window.__def540++;
        try { if (typeof _od === 'function') _od.apply(this, arguments); } catch (_) {}
        const d = document.getElementById('defw');
        if (d) d.classList.remove('on');
      };
    }
  }, { closers: RESET_CLOSERS, shells: SHELL_IDS, arm: !!(opts && opts.arm) });
}

/* 페이지에서 «실재하지 않는» 닫개 이름을 돌려준다 — 0개여야 한다 */
function missingClosers(page) {
  return page.evaluate(names => names.filter(f => typeof window[f] !== 'function'), RESET_CLOSERS);
}

/* 측정이 끝난 시점에 18 패배 화면이 켜져 있나 — 켜져 있으면 뒤 표본이 전부 «0회» 다 */
function defeatStuck(page) {
  return page.evaluate(ids => ids.some(id => {
    const d = document.getElementById(id);
    return !!d && d.classList.contains('on');
  }), SHELL_IDS);
}

/* 껍데기를 몇 번 걷었나 (arm 안 걸었으면 null) */
function defeatBlocked(page) {
  return page.evaluate(() => (window.__armed540 ? window.__def540 : null));
}

/* 게이트 출력용 꼬리표 — arm 을 안 건 자(게임 루프를 세우는 자)는 «루프 정지» 로 적는다 */
async function blockedLabel(page) {
  const n = await defeatBlocked(page);
  return n == null ? '루프 정지 — 계측 없음' : '막은 횟수 ' + n + '회';
}

module.exports = {
  RESET_CLOSERS, SHELL_IDS, GHOSTS,
  install, missingClosers, defeatStuck, defeatBlocked, blockedLabel,
};
