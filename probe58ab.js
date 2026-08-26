/* 58 27회차 — 26차 2인 공통 **1번**(AU ①-1 · AV ①-2, 두 사람이 «같은 두 프레임 쌍» 을 짚었다):
   «씬 B 비행 레이어가 f11↔f12(972→1041ms, 69ms) · f13↔f14(1164→1217ms, 53ms) 두 구간에서
    스프라이트 bbox 가 화소 단위로 동일하다 — 같은 프레임에 토스트·HUD 는 갱신됐다.
    비행 ~1,180ms 중 122ms(10.3%) 사망».

   ⚠ `pxdup58` 은 이 두 쌍을 «부분 중복 페인트» 로 면제해 주지 **않았다**(경고는 gain 14↔15 ·
   quest 16↔17 뿐). 그래서 두 사람 다 ① 감점으로 셌다. 그런데 `verify93` [2b] 는 같은 씬을
   DOM 기준으로 «정지 프레임 0/348» 로 찍는다. **둘 중 하나는 틀렸다.**

   이 도구는 그 판정을 한다 — 씬 B 를 rAF 마다 훑어 비행 스프라이트의 **화면 좌표**를 찍고,
   비평가가 지목한 두 창(960~1050ms · 1155~1225ms) 안에서 프레임간 이동량을 낸다.
   여기서 움직이면 «게임은 돌았고 캡처가 앞 페인트를 재사용한 것» 이고, 그러면 고칠 곳은
   `index.html` 이 아니라 **검출기 임계**다(AV 실측 그 쌍의 연출 구역 변경 = 씬 중앙값의 12%,
   `pxdup58` 경고 임계는 5%).

   사용: node probe58ab.js */
const { chromium } = require('playwright');
const path = require('path');

const WINDOWS = [[960, 1050], [1155, 1225]];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(async (WINDOWS) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const raf = () => new Promise(r => requestAnimationFrame(() => r()));
    player.inv = 1e9; window.step = () => {};
    S.gold = 820; fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
    await sleep(500);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if (!btn) return { err: '보상 받기 버튼 없음' };
    const rc = btn.getBoundingClientRect();
    const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 });
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();

    const t0 = performance.now();
    const frames = [];
    for (let i = 0; i < 220; i++) {
      await raf();
      const t = performance.now() - t0;
      const pos = [];
      for (const e of document.querySelectorAll('#fxl .fx-fly')) {
        const r = e.getBoundingClientRect();
        pos.push({ x: +(r.left + r.width / 2).toFixed(2), y: +(r.top + r.height / 2).toFixed(2), w: +r.width.toFixed(2) });
      }
      frames.push({ t: +t.toFixed(1), n: pos.length, pos });
      if (t > 1700) break;
    }
    /* 프레임간 «같은 아이콘» 을 개수로 잇는다 — 도착으로 하나씩 빠지므로 y 정렬 후 최소 개수까지만 비교 */
    const out = { frames: frames.length, windows: [] };
    for (const [a, bb] of WINDOWS) {
      const seg = frames.filter(f => f.t >= a && f.t <= bb);
      const rows = [];
      for (let i = 1; i < seg.length; i++) {
        const p = seg[i - 1].pos.slice().sort((u, v) => u.y - v.y);
        const c = seg[i].pos.slice().sort((u, v) => u.y - v.y);
        const n = Math.min(p.length, c.length);
        let mx = 0, sum = 0;
        for (let k = 0; k < n; k++) {
          const d = Math.hypot(c[k].x - p[k].x, c[k].y - p[k].y);
          mx = Math.max(mx, d); sum += d;
        }
        rows.push({ dt: +(seg[i].t - seg[i - 1].t).toFixed(1), t: seg[i].t, n,
                    maxMove: +mx.toFixed(2), avgMove: n ? +(sum / n).toFixed(2) : 0 });
      }
      out.windows.push({ from: a, to: bb, rAFframes: seg.length,
        minMaxMove: rows.length ? Math.min(...rows.map(r => r.maxMove)) : null,
        totalTravel: +rows.reduce((s, r) => s + r.avgMove, 0).toFixed(1),
        frozenPairs: rows.filter(r => r.maxMove < 0.5).length, rows });
    }
    return out;
  }, WINDOWS), null, 1));
  await b.close();
})();
