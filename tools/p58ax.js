/* 작업 58 — 43회차 프로브 «버스트 keep-out 이 «그림 잉크» 까지 덮는가»  (2인 공통ㄷ)
 *
 * 42차 2인 공통ㄷ: «upg 불꽃이 가격 «코인 아이콘»(43×44)을 20~35% 덮는다» —
 * 42회차의 `fxbTextHoles` 가 **텍스트 노드**만 훑어 `<img class="cic">` 가 구멍에 안 들어갔다.
 *
 * 이 프로브는 세 씬(upg · quest 행 버튼 · quest 모두받기)에서
 *   ⓐ `fxbTextHoles(target)` 가 실제로 무엇을 구멍으로 잡았는지(개수 · 그림 몇 개)
 *   ⓑ 버스트 파티클(`.fx-spark`)의 **출발점**이 대상 안 «그림 잉크» 상자와 겹치는 비율
 * 을 잰다. ⓑ 는 비평가와 같은 자다 — «아이콘 면적의 몇 %가 파티클에 덮이는가».
 *
 *   node tools/p58ax.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const SCENES = ['upg', 'quest'];

async function boot(b) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxBurst === 'function', null, { timeout: 20000 });
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
    try { QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; }); } catch (e) {}
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  return { p, errs };
}

(async () => {
  const b = await launch(chromium);
  for (const sc of SCENES) {
    const { p, errs } = await boot(b);
    if (sc === 'upg') await p.evaluate(() => openTrain());
    else await p.evaluate(() => openQuest());
    await p.waitForTimeout(500);

    const r = await p.evaluate((sc) => {
      const sel = sc === 'upg'
        ? ['#trCards [data-tr="atk"]', '#trCards .tr-card']
        : ['#qAll', '#questw .qs-b'];
      let t = null;
      for (const s of sel) { t = document.querySelector(s); if (t) break; }
      if (!t) return { err: 'target 없음 ' + sel.join(' / ') };
      const f = fxSc();
      const holes = fxbTextHoles(t);
      /* 대상 안의 «그림 잉크» 상자(프레임 px) — 비평가가 «코인 아이콘» 이라 부른 것 */
      const pics = [...t.querySelectorAll('img,svg,canvas')].map(el => {
        const bb = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), cls: el.getAttribute('class') || '',
          x: (bb.left - f.x) / f.s, y: (bb.top - f.y) / f.s, w: bb.width / f.s, h: bb.height / f.s };
      }).filter(q => q.w > 6 && q.h > 6);
      /* 구멍이 그 상자를 실제로 덮는가 */
      const covered = pics.map(q => holes.some(h =>
        h.x <= q.x + 1 && h.y <= q.y + 1 && h.x + h.w >= q.x + q.w - 1 && h.y + h.h >= q.y + q.h - 1));
      /* 파티클 출발점 — 버스트를 20회 쏘고 각 파티클의 «출발 중심» 이 그림 상자 안인지 센다.
         42회차(글자만) ↔ 43회차(글자+그림) 를 **같은 실행에서** 나란히 잰다 — 42회차 판을
         그 자리에서 되살려(`fxbTextHoles` 를 잠깐 갈아 끼운다) 개선폭이 캡처 노이즈가 아님을 못박는다. */
      const L = fxL(), half = 13;                        /* .fx-spark 26px 의 반폭 */
      const real = window.fxbTextHoles;
      const textOnly = (tt) => real(tt).filter(h => !pics.some(q =>
        h.x <= q.x + 1 && h.y <= q.y + 1 && h.x + h.w >= q.x + q.w - 1 && h.y + h.h >= q.y + q.h - 1));
      const run = () => {
        let shots = 0, inPic = 0;
        for (let i = 0; i < 20; i++) {
          L.querySelectorAll('.fx-spark').forEach(n => n.remove());
          fxBurst(t, '#FFE07A', 10);
          L.querySelectorAll('.fx-spark').forEach(n => {
            shots++;
            const cx = parseFloat(n.style.left), cy = parseFloat(n.style.top);
            for (const q of pics) {
              const ox = Math.min(cx + half, q.x + q.w) - Math.max(cx - half, q.x);
              const oy = Math.min(cy + half, q.y + q.h) - Math.max(cy - half, q.y);
              if (ox > 0 && oy > 0) { inPic++; break; }
            }
          });
        }
        L.querySelectorAll('.fx-spark').forEach(n => n.remove());
        return { shots, inPic, rate: shots ? +(100 * inPic / shots).toFixed(1) : 0 };
      };
      const after = run();
      window.fxbTextHoles = textOnly;                    /* 42회차 판 재현 */
      const before = run();
      window.fxbTextHoles = real;
      return { holes: holes.length, pics, covered, before, after,
        shots: after.shots, inPic: after.inPic, rate: after.rate };
    }, sc);

    console.log('── 씬 ' + sc + ' ' + '─'.repeat(40));
    if (r.err) { console.log('  ' + r.err); continue; }
    console.log('  keep-out 구멍 ' + r.holes + '개');
    r.pics.forEach((q, i) => console.log('  그림 ' + (i + 1) + ' <' + q.tag + ' class="' + q.cls + '"> '
      + q.w.toFixed(0) + '×' + q.h.toFixed(0) + ' @(' + q.x.toFixed(0) + ',' + q.y.toFixed(0) + ')'
      + ' → 구멍에 ' + (r.covered[i] ? '**포함**' : '누락')));
    console.log('  파티클 겹침률 — 42회차(글자만) **' + r.before.rate + '%**('
      + r.before.inPic + '/' + r.before.shots + ') → 43회차(글자+그림) **' + r.after.rate + '%**('
      + r.after.inPic + '/' + r.after.shots + ')');
    if (errs.length) console.log('  ⚠ 콘솔/페이지 에러 ' + errs.length + '건: ' + errs.slice(0, 2).join(' | '));
    await p.context().close();
  }
  await b.close();
})();
