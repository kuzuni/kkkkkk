/* 58 29회차 — 28차 2인 공통 «플로터 구간속도 비단조»(AX ①-6 «0.274 → 0.282 → **0.055** → 0.165 px/ms,
 * 직전 대비 −80.5%» · AW ④-4 «282→45→169→187px/s») 의 **전후 비교용**.
 *
 * ⚠ **rAF 로 재면 안 된다.** 이 컨테이너의 rAF 는 31~60ms 라, 0.62s 짜리 애니메이션을 비평가 격자
 * (100ms)로 묶으면 표본이 6점뿐이고 **위상이 결과를 지배한다**(첫 시도에서 «첫 구간이 두 번째보다
 * 느리다» 는 없는 증가 구간이 나왔다 — 추적 시작과 첫 페인트가 어긋난 것이다).
 * → `Element.getAnimations()` 로 애니메이션을 **일시정지시키고 `currentTime` 을 직접 걷는다.**
 *   키프레임 곡선 자체를 재는 것이라 러너 부하와 무관하게 결정적이다.
 *
 * 판정 축은 «낙폭 크기» 가 아니라 **«속도가 도로 빨라지는 구간이 있는가»** 다. ease-out 은 꼬리에서
 * 속도가 0 으로 수렴하므로 상대 낙폭이 −80% 대까지 가는 것이 정상이고, 비평가가 «멈췄다 다시 간다»
 * 로 읽는 것은 **증가 구간**(0.055 → 0.165)이다.
 */
const path = require('path');
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, process.env.P58AF_FILE || 'index.html'));
  await pg.waitForTimeout(1500);

  const res = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    const L = document.getElementById('fxl');

    /* 애니메이션 시계를 직접 걸으며 translateY 를 읽는다 (STEP ms 간격) */
    const walk = (el, STEP) => {
      const an = el.getAnimations()[0];
      if (!an) return { err: 'getAnimations 가 비었다' };
      an.pause();
      const dur = an.effect.getTiming().duration;
      const rows = [];
      for (let t = 0; t <= dur; t += STEP) {
        an.currentTime = t;
        const m = String(getComputedStyle(el).transform).match(/matrix\(([^)]+)\)/);
        rows.push([t, m ? +(+m[1].split(',')[5]).toFixed(3) : null]);
      }
      return { dur, rows };
    };

    const out = {};

    /* ── 씬 A/B: fxPlus (재화 «+n») ── */
    L.innerHTML = '';
    S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
    fxFlies.length = 0;
    await sleep(260);
    fxAt({ x: 540, y: 1400 });
    S.gold += 128000;
    /* «+n» 은 트리거가 아니라 **첫 도착**(설계 0.50s)에 뜬다 — 뜰 때까지 기다린다(최대 1.2초) */
    await new Promise(r => {
      const t0 = performance.now();
      const iv = setInterval(() => {
        if (document.querySelector('#fxl .fx-plus') || performance.now() - t0 > 1200) { clearInterval(iv); r(); }
      }, 8);
    });
    const pl = document.querySelector('#fxl .fx-plus');
    out.plus = pl ? walk(pl, 10) : { err: '.fx-plus 가 안 떴다' };
    await sleep(1500);

    /* ── 씬 C: fxDelta (강화 델타) ── */
    L.innerHTML = '';
    await sleep(200);
    try { fxDelta(document.body, '+2.4 공격력'); } catch (e) { out.deltaErr = String(e); }
    await sleep(60);
    const dl = document.querySelector('#fxl .fx-delta');
    out.delta = dl ? walk(dl, 10) : { err: '.fx-delta 가 안 떴다' };
    return out;
  });

  /* 비평가가 쓰는 100ms 격자로 구간속도를 낸다 */
  const report = (name, o) => {
    console.log('\n== ' + name + ' ==');
    if (!o || o.err) { console.log('⚠ ' + ((o && o.err) || '표본 없음')); return; }
    const rows = o.rows.filter(r => r[1] != null);
    const at = t => { let b2 = rows[0]; for (const r of rows) { if (r[0] <= t) b2 = r; else break; } return b2; };
    const seg = [];
    for (let t = 100; t <= o.dur; t += 100) {
      const a = at(t - 100), c = at(t);
      seg.push({ 구간: (t - 100) + '~' + t + 'ms', y: c[1], v: +(Math.abs(c[1] - a[1]) / (c[0] - a[0])).toFixed(4) });
    }
    let up = 0, worst = 0;
    for (let i = 1; i < seg.length; i++) {
      const d = (seg[i].v - seg[i - 1].v) / (seg[i - 1].v || 1);
      seg[i].Δpct = +(d * 100).toFixed(1);
      if (d > 0.02) up++;
      worst = Math.min(worst, d);
    }
    console.log('길이 ' + o.dur + 'ms · y ' + rows[0][1] + ' → ' + rows[rows.length - 1][1] + 'px');
    console.log(seg.map(s => `  ${s.구간}  v=${s.v} px/ms  y=${s.y}` + (s.Δpct != null ? `  (Δ${s.Δpct}%)` : '')).join('\n'));
    console.log('  → 속도가 **도로 빨라지는** 구간: ' + up + '개' + (up === 0 ? '  ✓ 단조 감소' : '  ✗ 톱니 잔존')
      + ' · 최악 낙폭 ' + (worst * 100).toFixed(1) + '%');
  };

  report('fxPlus (재화 «+n» · 씬 A/B)', res.plus);
  if (res.deltaErr) console.log('\n⚠ fxDelta 트리거: ' + res.deltaErr);
  report('fxDelta (강화 델타 · 씬 C)', res.delta);
  await b.close();
})();
