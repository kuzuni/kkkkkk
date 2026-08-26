/* 58 26회차 — 25차 2인 공통 **①-1 «숫자가 코인을 앞선다»**(AS ①-5·6·7 «크레딧 vs 실도착:
   A 최대 5/16(31%) · B 6/16(37.5%) · 카운터가 마지막 코인보다 A 126~208ms · B ≥161ms 먼저
   끝난다» · AT ①-1·④-6) 를 **고치기 전에** 재는 도구다.

   25차 리뷰가 27(당시 26)회차에 남긴 지시가 정확히 이것이다:
     «93 4회차의 «도착 계단»(fxStepTo)이 이미 그 구조인데 실측이 어긋난다 →
      **계단이 도착이 아니라 무엇에 물려 있는지부터 재라**»

   그래서 «도착» 을 **세 가지 정의**로 동시에 센다 — 어느 정의에서 어긋나는지가 답이다:
     (a) flightDone : `fxFlies` 에서 빠진 수 (= 비행 수식이 끝난 수. `verify93` 이 쓰는 정의)
     (b) gone       : DOM 에서 사라진 수 (= 눈에서 없어진 수. **비평가가 세는 정의**)
     (c) atPill     : 알약 60px 안에 들어온 수 (도착 홀드·착지 페이드 중인 것 포함)
   그리고 화면에 실제로 찍힌 카운터 숫자에서 «크레딧된 코인 수» 를 역산해 셋과 비교한다.

   사용: node probe58z.js            (씬 A = gain)
         node probe58z.js quest      (씬 B = 팝업 보상 수령) */
const { chromium } = require('playwright');
const path = require('path');

const SCENE = process.argv[2] === 'quest' ? 'quest' : 'gain';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(async (scene) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const raf = () => new Promise(r => requestAnimationFrame(() => r()));
    player.inv = 1e9; window.step = () => {};

    /* 금액 문자열 → 수. 111 의 알파벳 단위 표기(a=K · b=M …)를 되돌린다 */
    const SUFV = { '': 1, a: 1e3, b: 1e6, c: 1e9, d: 1e12, A: 1e3, B: 1e6, C: 1e9, D: 1e12, K: 1e3, M: 1e6 };
    const parse = s => {
      const m = String(s).replace(/,/g, '').match(/^([\d.]+)\s*([A-Za-z]*)$/);
      if (!m) return NaN;
      return parseFloat(m[1]) * (SUFV[m[2]] != null ? SUFV[m[2]] : 1);
    };

    let g0, gN, target, gain;
    if (scene === 'gain') {
      S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
      renderUI && renderUI();
      await sleep(200);
      g0 = 0; gain = 128;
      gN = document.querySelector('.cGold i + b') || document.querySelector('.cGold b') || document.querySelector('#goldN');
      if (!gN) { const e = document.querySelector('.cGold'); gN = e && e.lastElementChild; }
      if (!gN) return { err: '골드 숫자 요소를 못 찾았다' };
      fxAt({ x: 540, y: 1400 });
      S.gold = gain;                                  /* fxWatch 가 증가분을 보고 자동으로 쏜다 */
    } else {
      S.gold = 820; fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
      const q = QUESTS.find(x => x.id === 'kill');
      S.quest.kill.base = q.get() - questGoal(q);
      openQuest('rep');
      await sleep(500);
      const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
      if (!btn) return { err: '보상 받기 버튼 없음' };
      gN = document.querySelector('.cGold i + b') || document.querySelector('.cGold b');
      if (!gN) { const e = document.querySelector('.cGold'); gN = e && e.lastElementChild; }
      g0 = S.gold;
      const r = btn.getBoundingClientRect();
      const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
      target = null;
    }

    const t0 = performance.now();
    /* 골드 묶음의 총 개수는 첫 프레임에 확정된다 */
    let tot = 0, pill = null;
    const rows = [];
    for (let i = 0; i < 200; i++) {
      await raf();
      const flies = (typeof fxFlies !== 'undefined' ? fxFlies : []).filter(f => f.ui && f.cur === 'gold');
      if (!tot && flies.length) { tot = flies[0].batch ? flies[0].batch.cnt : flies.length; pill = flies[0].pill; }
      if (!tot) continue;
      const pr = pill && pill.getBoundingClientRect();
      const px = pr ? pr.left + 55 : 583.5, py = pr ? pr.top + pr.height / 2 : 54.5;   /* 알약 «아이콘» 중심 */
      const dom = Array.from(document.querySelectorAll('#fxl .fx-fly'))
        .filter(e => e.querySelector('img[data-cur-ic="gold"]'));
      let atPill = 0, near = 1e9;
      for (const e of dom) {
        const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = Math.hypot(cx - px, cy - py);
        if (d < 60) atPill++; else near = Math.min(near, d);
      }
      if (scene === 'gain' && g0 == null) g0 = 0;
      const shown = parse(gN.textContent);
      const total = (scene === 'gain' ? gain : (S.gold - g0));
      const credited = total > 0 ? Math.round(((shown - g0) / total) * tot) : 0;
      const flightDone = tot - flies.length;
      const gone = tot - dom.length;
      rows.push({ t: Math.round(performance.now() - t0), shown: gN.textContent.trim(), credited,
                  flightDone, gone, atPill, nearest: near === 1e9 ? null : Math.round(near) });
      if (flies.length === 0 && dom.length === 0 && rows.length > 20) break;
    }
    const out = { scene, tot, frames: rows.length };
    /* 세 정의 각각에 대해 «크레딧이 앞선 최대 개수» */
    const lead = k => Math.max(...rows.map(r => r.credited - r[k]));
    out.maxLeadOverFlightDone = lead('flightDone');
    out.maxLeadOverGone = lead('gone');
    out.maxAtPill = Math.max(...rows.map(r => r.atPill));
    const last = f => { let v = null; for (const r of rows) if (f(r)) v = r.t; return v; };
    out.tCounterFull = (rows.find(r => r.credited >= tot) || {}).t ?? null;
    out.tLastFlightDone = (rows.find(r => r.flightDone >= tot) || {}).t ?? null;
    out.tLastGone = (rows.find(r => r.gone >= tot) || {}).t ?? null;
    out.tailAfterCounter = out.tLastGone != null && out.tCounterFull != null ? out.tLastGone - out.tCounterFull : null;
    void last;
    out.rows = rows.filter((_, i) => i % 3 === 0);
    return out;
  }, SCENE), null, 1));
  await b.close();
})();
