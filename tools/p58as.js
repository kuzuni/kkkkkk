/* 작업 58 37회차 — 36회차가 37회차로 넘긴 «미해결 4건» 을 한 번에 실측하는 프로브.
   비평가의 자(캡처 프레임)와 달리 이건 **페이지 안에서 rAF 마다 재는 자**다 — 두 자가
   같은 것을 가리켜야 처방을 믿을 수 있다(A1 10회차 «자가 다르면 일치해도 틀린다»).

   재는 것 (씬 A gain · 씬 B quest · 씬 C upg 각각):
     [D] HUD 알약 «팝» — `fxPunchN` 증가 시각과 알약 scale 을 rAF 마다 읽어
         «몇 번 튀었나 · 피크 배율 · 튐 사이 저점» 을 낸다. 36차 공통D(씬마다 횟수가 다르다).
     [F] 토스트 «정지» — `.fx-toast` 의 bbox 를 rAF 마다 읽어 **연속으로 변화 < 0.5px 인
         최장 구간**을 낸다. 36차 공통F(X: 잉크 bbox 474ms 불변 · Y: 화소 0.15%).
     [E] 도착 크기 — `.fx-land`/`.fx-land2` 가 붙는 순간의 코인 잉크 폭 ÷ 알약 아이콘 폭.
         36차 공통E(39~58%).
     [B] 씬 B 복도 — `.fx-fly` 중심이 `#mbox` 우변 **밖**에 있는 시간(코인별 최장 구간).
         36차 공통B. ⚠ 이 복도는 8·23·26·28회차가 «형제 행 관통·팝업 테두리 관통» 을 피하려고
         설계로 세운 것이다(FX3_OUTM 66 · FX3_XCAP 1040) — 수치를 «줄이면 되는 값» 으로 읽지 마라.

   실행: node tools/p58as.js [씬목록]     기본 gain,quest,upg */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const WANT = (process.argv[2] || 'gain,quest,upg').split(',').map(s => s.trim()).filter(Boolean);
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const DUR = { gain: 900, quest: 1800, upg: 900 };

async function open(scene) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  /* 씨앗 고정 — 36회차 [14] 의 교훈(«재현되지 않는 게이트는 게이트가 아니다»). */
  await p.addInitScript(() => {
    try { localStorage.clear(); } catch (e) {}
    let s = 20260828 >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, scene);
  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(400); }
  else if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(400); }
  else await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  /* 카운터가 두 번 연속 같고 연출 DOM 이 빌 때까지 — cap58b 와 같은 정착 규칙 */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => {
      const g = document.getElementById('goldN'), d = document.getElementById('diaN');
      return (g ? g.textContent.trim() : '') + '|' + (d ? d.textContent.trim() : '')
        + '|' + document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length;
    });
    if (st === prev && st.endsWith('|0')) break;
    prev = st; await p.waitForTimeout(80);
  }
  return { b, p };
}

async function run(scene) {
  const { b, p } = await open(scene);
  const out = await p.evaluate(async ({ sc, dur }) => {
    const num = (v) => Math.round(v * 10) / 10;
    const scaleOf = (el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return m.a || 1;
    };
    const pillOf = (k) => {
      const n = document.getElementById(k === 'gold' ? 'goldN' : 'diaN');
      return n ? n.closest('.cbox') : null;
    };
    const iconW = (() => {
      const pl = pillOf('gold'); if (!pl) return 0;
      const i = pl.querySelector('i>.cic') || pl.querySelector('i');
      return i ? i.getBoundingClientRect().width : 0;
    })();
    const mb = document.querySelector('#mbox, #panel, .eqp, .tr-sheet');
    const mbr = mb ? mb.getBoundingClientRect() : null;

    const samples = [];
    const punches = [];
    let n0 = (typeof fxPunchN === 'number') ? fxPunchN : 0;
    let landW = [];
    const flyOut = {};                                    /* id → 밖에 있던 최장 구간 */
    const flySeen = {};

    /* ── 트리거 ── cap58b.js 의 TRIGGERS 와 같은 경로 ── */
    const t0 = performance.now();
    if (sc === 'gain') {
      const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
      const pt = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
      fxAt(pt, 'combat');
      S.gold += 128000;
    } else if (sc === 'quest') {
      const btn = document.getElementById('qAll'); if (btn) btn.click();
    } else {
      const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
      if (c) {
        c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      }
    }

    while (performance.now() - t0 < dur) {
      await new Promise(r => requestAnimationFrame(r));
      const t = performance.now() - t0;
      /* [D] 팝 */
      const cur = (typeof fxPunchN === 'number') ? fxPunchN : 0;
      const pg = pillOf('gold'), pd = pillOf('dia');
      const sg = pg ? scaleOf(pg) : 1, sd = pd ? scaleOf(pd) : 1;
      if (cur > n0) { punches.push({ t: num(t), n: cur - n0, sg: Math.round(sg * 1000) / 1000 }); n0 = cur; }
      /* [F] 토스트 bbox */
      const ts = document.querySelector('.fx-toast');
      const tr = ts ? ts.getBoundingClientRect() : null;
      /* [E] 도착 크기 */
      document.querySelectorAll('.fx-land,.fx-land2').forEach(el => {
        const w = el.getBoundingClientRect().width;
        if (w > 0) landW.push(Math.round(w * 10) / 10);
      });
      /* [B] 복도 */
      if (mbr) {
        document.querySelectorAll('.fx-fly').forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const cx = r.x + r.width / 2;
          const id = el.__pid || (el.__pid = 'f' + (flySeen.__n = (flySeen.__n || 0) + 1));
          const outside = cx > mbr.x + mbr.width;
          const s = flyOut[id] || (flyOut[id] = { cur: 0, max: 0, last: null });
          if (outside) { s.cur += (s.last == null ? 0 : t - s.last); s.max = Math.max(s.max, s.cur); }
          else s.cur = 0;
          s.last = t;
        });
      }
      samples.push({
        t: num(t), sg: Math.round(sg * 1000) / 1000, sd: Math.round(sd * 1000) / 1000,
        tb: tr ? [num(tr.x), num(tr.y), num(tr.width), num(tr.height)] : null,
        fly: document.querySelectorAll('.fx-fly').length,
      });
    }

    /* [F] 토스트가 «변화 < 0.5px» 로 연속인 최장 구간 */
    let hold = { from: null, to: null, len: 0 }, run = null;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].tb, c = samples[i].tb;
      if (!a || !c) { run = null; continue; }
      const same = Math.abs(a[0] - c[0]) < 0.5 && Math.abs(a[1] - c[1]) < 0.5
        && Math.abs(a[2] - c[2]) < 0.5 && Math.abs(a[3] - c[3]) < 0.5;
      if (same) { if (run == null) run = samples[i - 1].t; const len = samples[i].t - run; if (len > hold.len) hold = { from: run, to: samples[i].t, len }; }
      else run = null;
    }
    const tsFirst = samples.find(s => s.tb), tsLastArr = samples.filter(s => s.tb);
    const tsLast = tsLastArr.length ? tsLastArr[tsLastArr.length - 1] : null;

    const corr = Object.values(flyOut).map(s => Math.round(s.max));
    return {
      iconW: Math.round(iconW * 10) / 10,
      punchN: punches.length, punches: punches.slice(0, 20),
      peakG: Math.max(...samples.map(s => s.sg)), minG: Math.min(...samples.map(s => s.sg)),
      peakD: Math.max(...samples.map(s => s.sd)),
      toast: tsFirst ? { from: tsFirst.t, to: tsLast.t, hold: Math.round(hold.len), holdFrom: hold.from, holdTo: hold.to } : null,
      landW: landW.length ? { n: landW.length, min: Math.min(...landW), max: Math.max(...landW) } : null,
      corrN: corr.length, corrMax: corr.length ? Math.max(...corr) : 0,
      corrMed: corr.length ? corr.sort((a, b) => a - b)[Math.floor(corr.length / 2)] : 0,
      frames: samples.length, dur: samples.length ? samples[samples.length - 1].t : 0,
    };
  }, { sc: scene, dur: DUR[scene] || 900 });
  await b.close();
  return out;
}

(async () => {
  for (const sc of WANT) {
    const r = await run(sc);
    console.log('\n== 씬 ' + sc + ' == (rAF 표본 ' + r.frames + '장 · ' + Math.round(r.dur) + 'ms)');
    console.log('[D] 알약 팝 ' + r.punchN + '회 · 골드 피크 ×' + r.peakG + ' 저점 ×' + r.minG
      + ' · 다이아 피크 ×' + r.peakD);
    if (r.punches.length) console.log('    시각(ms): ' + r.punches.map(p => p.t).join(', '));
    console.log('[F] 토스트: ' + (r.toast
      ? '노출 ' + Math.round(r.toast.from) + '~' + Math.round(r.toast.to) + 'ms · **최장 정지 '
        + r.toast.hold + 'ms**(' + Math.round(r.toast.holdFrom) + '~' + Math.round(r.toast.holdTo) + ')'
      : '없음'));
    console.log('[E] 도착 코인 폭: ' + (r.landW ? r.landW.min + '~' + r.landW.max + 'px' : '없음')
      + ' · 알약 아이콘 ' + r.iconW + 'px'
      + (r.landW && r.iconW ? ' → ' + Math.round(100 * r.landW.max / r.iconW) + '%' : ''));
    console.log('[B] 팝업 밖 복도: 코인 ' + r.corrN + '개 · 최장 ' + r.corrMax + 'ms · 중앙값 ' + r.corrMed + 'ms');
  }
})();
