#!/usr/bin/env node
/* 150 프로브 — «숫자 그대로» 표기가 어느 지점에서 UI 폭을 넘는지 실측한다.
   실행: node tools/probe150.js [--state normal|late|extreme]

   지시서 [3]-(가) 기계적 작업의 «요소 겹침·잘림 0건» 확인용. 채점(비평가)은 하지 않는다.
   보는 것: 숫자를 담는 요소들의 scrollWidth vs clientWidth(=넘침) · 알약/배지 bbox 대비 잉크 폭.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const MODE = (process.argv.find(a => a.startsWith('--state')) || '').split('=')[1] || 'late';

/* 진행도별 «실제로 나올 법한» 상태. late = 방치형 중후반, extreme = 상한 확인용 */
const STATES = {
  normal:  { gold: 8.5e5, dia: 12000,  relic: 3400,   stage: 120,  kills: 42000 },
  late:    { gold: 4.2e12, dia: 1.8e7, relic: 9.6e5,  stage: 2400, kills: 3.1e7 },
  extreme: { gold: 7.7e18, dia: 4.2e9, relic: 8.8e8,  stage: 9800, kills: 2.6e9 },
};

(async () => {
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const out = await p.evaluate(async st => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = st.gold; S.dia = st.dia; S.relic = st.relic;
    S.stage = st.stage; S.best = Math.max(S.best, st.stage); S.totalKills = st.kills;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    markDirty(); drawHud(); renderUI();
    await sleep(200);

    const over = [], texts = {};
    /* 넘침 판정은 «잉크가 자기 그릇보다 넓은가» 로만 한다.
       배지(`.ifq`)는 설계상 프레임 밖으로 걸터앉으므로 «부모 bbox 밖» 은 넘침이 아니다 —
       기준 그릇을 인자로 받아(배지는 프레임 `.ifr`, 그 밖은 자기 자신) 잉크 폭과 비교한다. */
    const inkW = el => {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const r = rg.getBoundingClientRect(); rg.detach && rg.detach();
      return r.width;
    };
    const look = (sel, label, boxSel) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        const t = (el.textContent || '').trim();
        if (!/\d/.test(t)) return;
        const box = boxSel ? el.closest(boxSel) : el;
        if (!box) return;
        const bw = box.getBoundingClientRect().width;
        const iw = inkW(el);
        const clip = el.scrollWidth - el.clientWidth;
        if (bw > 0 && (iw > bw + 1 || clip > 2))
          over.push({ sel: label + (i ? '#' + i : ''), t, ink: Math.round(iw), box: Math.round(bw), clip });
      });
    };
    const t = id => ((document.getElementById(id) || {}).textContent || '').trim();
    texts.goldN = t('goldN'); texts.diaN = t('diaN'); texts.cpN = t('cpN'); texts.relN = t('relN');

    look('#goldN,#diaN,#cpN,#relN', 'HUD');
    look('.pcp b', 'HUD전투력판');

    /* 화면을 훑으며 숫자 담는 요소 넘침 확인 */
    const opened = [];
    const sels = []
      .concat([].map.call(document.querySelectorAll('.tab[data-t]'), e => '.tab[data-t="' + e.dataset.t + '"]'))
      .concat([].map.call(document.querySelectorAll('.side .ibtn[data-pop]'), e => '.side .ibtn[data-pop="' + e.dataset.pop + '"]'));
    for (const sel of sels) {
      const el = document.querySelector(sel); if (!el) continue;
      try { el.click(); } catch (e) { continue; }
      await sleep(200);
      opened.push(sel);
      look('.ifq', 'ifq' + sel, '.ifr');   /* 아이템 프레임 수량 배지 — 그릇은 프레임 */
      look('.eqst>i', 'eqst' + sel);      /* 장비 화면 능력치 */
      look('.uc', 'uc' + sel);            /* 훈련 비용 */
      look('.tr-gain,.tr-cost', 'train' + sel);
      look('.qs-i .ifq', 'quest' + sel, '.qs-i');
      try { el.click(); } catch (e) {}
      await sleep(90);
    }
    /* 가방·재화정보는 ▦ 메뉴 경로 */
    try { openBag(); } catch (e) {}
    await sleep(250);
    look('#bagGrid .ifq', 'bag', '.bg53-c');
    const bag = [].map.call(document.querySelectorAll('#bagGrid .ifq'), e => e.textContent).slice(0, 8);

    return { texts, over: over.slice(0, 40), nOver: over.length, opened: opened.length, bag };
  }, STATES[MODE]);

  console.log('[150 프로브] 상태 = ' + MODE + '  ' + JSON.stringify(STATES[MODE]));
  console.log('HUD  ' + JSON.stringify(out.texts));
  console.log('가방 배지 ' + JSON.stringify(out.bag));
  console.log('오프너 ' + out.opened + '곳 · 넘침 후보 ' + out.nOver + '건');
  out.over.forEach(o => console.log('  ! ' + o.sel + '  «' + o.t + '»  잉크 ' + o.ink + ' > 그릇 ' + o.box + ' (clip ' + o.clip + ')'));
  if (errs.length) console.log('콘솔 에러 ' + errs.length + '건: ' + errs[0].slice(0, 160));
  else console.log('콘솔 에러 0');
  await br.close();
})();
