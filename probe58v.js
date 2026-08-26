/* 58 25회차 — 착수점 3 «초록 «획득» 플래시가 숫자 증가보다 250~530ms 먼저 끝난다.
   두 신호가 한 프레임도 안 겹친다»(24차 AR ①-4·④-5)를 고치기 «전/후» 로 잰다.
   재는 것: HUD 골드 알약에서
     (a) `jz-up-n`(초록 틴트) 이 붙어 있는 구간 [시작, 끝]
     (b) 표시 숫자(textContent)가 실제로 바뀌는 구간 [첫 변화, 마지막 변화]
     (c) 두 구간의 겹침 ms
   씬은 cap58 의 gain(전투 획득) · quest(보상 수령) 둘 다 본다. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);

  const scan = async (scene) => pg.evaluate(async (sc) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9;
    for (const e of enemies) { e.x = 1; e.y = 1; }
    parts.length = 0; nums.length = 0; shots.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
    window.step = () => {};
    await sleep(400);

    if (sc === 'quest') {
      S.gold = 820;
      fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
      const q = QUESTS.find(x => x.id === 'kill');
      S.quest.kill.base = q.get() - questGoal(q);
      openQuest('rep');
      await sleep(500);
    }
    const t0 = performance.now();
    if (sc === 'gain') {
      fxAt(fxWorld(player.x + 12, player.y - 20));
      S.gold += 128000;
    } else {
      const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
      if (!btn) return { err: '보상 받기 버튼 없음' };
      const rc = btn.getBoundingClientRect();
      const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true,
        clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 });
      btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
    }

    const tint = [], num = [];
    let prev = null;
    for (let i = 0; i < 130; i++) {
      const el = document.getElementById('goldN');
      const t = Math.round(performance.now() - t0);
      if (el) {
        if (el.classList.contains('jz-up-n')) tint.push(t);
        const txt = el.textContent;
        if (prev !== null && txt !== prev) num.push(t);
        prev = txt;
      }
      await sleep(14);
    }
    const span = a => a.length ? [a[0], a[a.length - 1]] : null;
    const T = span(tint), N = span(num);
    /* 붙어 있는 구간이 두 번이면 그 사이의 빈 구간도 알려 준다 */
    const gaps = [];
    for (let i = 1; i < tint.length; i++) if (tint[i] - tint[i - 1] > 60) gaps.push([tint[i - 1], tint[i]]);
    const ov = (T && N) ? Math.max(0, Math.min(T[1], N[1]) - Math.max(T[0], N[0])) : null;
    return { scene: sc, tint: T, tintGaps: gaps, num: N, numChanges: num.length, overlapMs: ov };
  }, scene);

  const out = [await scan('gain')];
  await pg.reload({ waitUntil: 'load' });
  await pg.waitForTimeout(1500);
  out.push(await scan('quest'));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
