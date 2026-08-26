#!/usr/bin/env node
/* 150 기능 체크 — «눌렀을 때 무엇이 바뀌는지» 를 헤드리스로 찍는다.
   실행: node tools/func150.js

   지시서의 «기능 완성 규칙»(T2) 이 요구하는 체크 표의 근거다. 표기 작업이라 «바뀌는 것» 은
   ⓐ 실제 게임 상태(S) ⓑ 그 상태가 화면에 찍힌 문자열 두 가지다 — 둘을 같이 남긴다.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const rows = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = [];
    const hud = () => ({
      gold: (document.getElementById('goldN') || {}).textContent,
      dia: (document.getElementById('diaN') || {}).textContent,
    });
    const sync = () => { fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic; markDirty(); drawHud(); };
    /* 58/149 의 토스트는 `.fx-toast` 다(fxL() 레이어에 쌓인다). 마지막 것을 읽는다. */
    const toast = () => {
      const t = document.querySelectorAll('.fx-toast');
      return t.length ? t[t.length - 1].textContent.trim() : '';
    };
    S.gold = 4.2e12; S.dia = 1.8e7; S.relic = 9.6e5; sync();
    await sleep(150);

    /* ① 훈련 강화 — 골드를 쓴다(골드는 알파벳 단위 유지). 23 훈련 시트를 열어 카드의
       비용 라벨(`.cb i`)까지 같이 읽는다 — 그 라벨이 골드 표기의 대표 자리다. */
    {
      const g0 = S.gold, disp0 = hud().gold;
      let card = '';
      try { openTrain(); } catch (e) {}
      await sleep(350);
      const el = document.querySelector('#trCards [data-tr]');
      if (el) card = (el.querySelector('.cb i') || {}).textContent || '';
      let bought = false;
      try { bought = !!trainBuy('atk'); } catch (e) {}
      await sleep(200); sync(); await sleep(120);
      const el2 = document.querySelector('#trCards [data-tr]');
      out.push({ n: '23 훈련 — 강화(골드 소비)', act: 'trainBuy(atk) ' + (bought ? '성공' : '실패'),
        state: 'S.gold ' + g0.toExponential(3) + ' → ' + S.gold.toExponential(3),
        show: '카드 비용 «' + card + '» → «' + ((el2 && (el2.querySelector('.cb i') || {}).textContent) || '') +
              '» · HUD 골드 ' + disp0 + ' → ' + hud().gold });
      try { closeTrain(); } catch (e) {}
      await sleep(200);
    }

    /* ② 우편 전체 수령 — 골드·다이아·유물조각이 한 토스트에 같이 나온다 */
    {
      const g0 = S.gold, c0 = S.dia;
      try { document.querySelector('#mailAll, [data-mailall]').click(); } catch (e) {}
      await sleep(250);
      let tx = toast();
      if (!tx) { try { claimAllMail(); } catch (e) {} await sleep(250); tx = toast(); }
      sync(); await sleep(100);
      out.push({ n: '우편 전체 수령', act: 'claimAllMail()',
        state: 'S.gold +' + Math.round(S.gold - g0) + ' · S.dia +' + Math.round(S.dia - c0),
        show: '토스트 «' + tx + '»' });
    }

    /* ③ 재화 정보 팝업 — 재화별 보유량 표기 */
    {
      const r = {};
      for (const k of ['gold', 'dia', 'relic']) {
        try { openCurInfo(k); } catch (e) { continue; }
        await sleep(150);
        r[k] = ((document.getElementById('ciHave') || {}).textContent || '').trim();
        try { closeCurInfo(); } catch (e) {}
        await sleep(80);
      }
      out.push({ n: '33 재화 정보 팝업(아이콘 클릭)', act: 'openCurInfo(k)',
        state: 'S.gold/dia/relic 그대로', show: JSON.stringify(r) });
    }

    /* ④ 가방 칸 클릭 — 보유량 토스트 */
    {
      try { openBag(); } catch (e) {}
      await sleep(350);
      const cells = [].map.call(document.querySelectorAll('#bagGrid .bg53-c[data-bagn]'),
        c => c.dataset.bagn + '=' + (c.querySelector('.ifq') || {}).textContent);
      const dia = document.querySelector('#bagGrid .bg53-c[data-bagn="다이아"]');
      if (dia) dia.click();
      await sleep(250);
      out.push({ n: '53 가방 — 칸 배지 + 칸 클릭 토스트', act: '다이아 칸 클릭',
        state: '보유량 읽기만', show: cells.slice(0, 4).join(' · ') + ' | 토스트 «' + toast() + '»' });
      try { closeBag(); } catch (e) {}
      await sleep(150);
    }

    /* ⑤ 재화 획득 연출(58 fxPlus) — HUD 알약에 붙는 «+n» 라벨 */
    {
      const lab = k => {
        try { fxPlus(k, 1234567, false); } catch (e) { return 'ERR'; }
        const els = [].filter.call(document.querySelectorAll('*'),
          e => /^\+[\d.,]+[A-Z]{0,2}$/.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0);
        return els.length ? els[els.length - 1].textContent.trim() : '(없음)';
      };
      const g = lab('gold'), d = lab('dia');
      out.push({ n: '58 획득 연출 «+n» 라벨', act: 'fxPlus(k, 1234567)',
        state: '연출만(값 변화 없음)', show: '골드 «' + g + '» · 다이아 «' + d + '»' });
    }

    /* ⑥ 전투 데미지 숫자 */
    {
      try { dmgNum(200, 300, 8.7e6, true); } catch (e) {}
      out.push({ n: '전투 데미지 라벨', act: 'dmgNum(…, 8.7e6, crit)',
        state: '적 체력 감소 경로와 같은 표기층',
        show: '«' + (nums.length ? nums[nums.length - 1].v : '') + '»' });
    }
    return out;
  });

  console.log('| 무엇을 눌렀나 | 동작 | 게임 상태(S) | 화면 표기 |');
  console.log('|---|---|---|---|');
  rows.forEach(r => console.log('| ' + r.n + ' | ' + r.act + ' | ' + r.state + ' | ' + r.show + ' |'));
  console.log('\n콘솔 에러 ' + errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 160) : ''));
  await br.close();
})();
