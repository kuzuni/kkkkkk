/* 작업 298 실동작 프로브 — 03 던전 서브탭 3칸 레드닷 «기능 체크 표»
 *
 *   실행: node tools/probe298.js   (1080x2280 · 헤드리스)
 *
 * verify166 [4b] 는 «논리»(.alert · display)만 본다. LESSONS 293-③ 의 교훈대로 여기서는
 * **같은 프로브에서 화소까지 같이** 잰다 — 배지 bbox 를 잘라 빨강(#F22E52 계열) 화소를 세서
 * «논리는 켜졌는데 무언가가 덮고 있어 사용자에겐 안 보인다» 를 갈라낸다. 그것이 이번 주인 보고
 * («왜 빨간점 없냐»)의 실제 발현형이었다 — 판정 이전에 노드가 없어 화소가 0 이었다.
 *
 * 표의 각 행은 «어떤 상태를 만들었나 → 어느 칸이 켜졌나 → 실제로 몇 화소가 붉나» 다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1100);

  const ev = fn => page.evaluate(fn);
  const KS = ['dun', 'raid', 'tower'];
  const NM = { dun: '던전', raid: '컨텐츠', tower: '탑' };

  await ev(() => { goTab('adv'); });
  await page.waitForTimeout(700);

  /* 상태를 만드는 손잡이 — verify166 [4b] 와 같은 요령(요구치를 갈아 끼운다) */
  await ev(() => {
    window.__b = { dreq: DUNGEONS.map(d => d.req), treq: TOWERS.map(t => t.req) };
    window.__off = () => {
      DUNGEONS.forEach((d, i) => { S.dunTk[d.id] = 0; d.req = window.__b.dreq[i]; });
      RAIDS.forEach(r => { S.raidBest[r.id] = { dmg: 1, dps: 1 }; });
      S.arena = { w: 1, l: 0 };
      TOWERS.forEach(t => { t.req = () => Infinity; });
      uiDirty = true; renderUI(); renderDunPage();
    };
  });

  const CASES = [
    { n: '아무것도 할 게 없다 (입장 횟수 0 · 기록 있음 · 전투력 미달)', set: () => {} },
    { n: '던전만 — 입장 횟수 3 + 요구 전투력 충족',
      set: () => { S.best = 999; DUNGEONS.forEach(d => { S.dunTk[d.id] = 3; d.req = () => 0; }); } },
    { n: '컨텐츠만 — 측정장 기록 없음(아직 한 번도 안 재봤다)',
      set: () => { S.best = 999; S.daily.raid = 3; RAIDS.forEach(r => { S.raidBest[r.id] = { dmg: 0, dps: 0 }; }); } },
    { n: '컨텐츠만 — 아레나 전적 0-0(측정장은 기록 있음)',
      set: () => { S.best = 999; S.daily.arena = 3; S.arena = { w: 0, l: 0 }; } },
    { n: '탑만 — 지금 층 요구 전투력 충족', set: () => { TOWERS.forEach(t => { t.req = () => 0; }); } },
    { n: '셋 다 — 경로 전체가 켜진다',
      set: () => { S.best = 999; S.daily.raid = 3; S.arena = { w: 0, l: 0 };
                   DUNGEONS.forEach(d => { S.dunTk[d.id] = 3; d.req = () => 0; });
                   RAIDS.forEach(r => { S.raidBest[r.id] = { dmg: 0, dps: 0 }; });
                   TOWERS.forEach(t => { t.req = () => 0; }); } },
  ];

  const rows = [];
  for (const c of CASES) {
    await ev(`(() => { window.__off(); (${c.set.toString()})(); uiDirty = true; renderUI(); renderDunPage(); })()`);
    /* ⚠ 291 계열 — **등장 애니메이션 한복판에서 자를 대면 안 된다.** 배지는 켜지는 순간
       `jzDotIn .3s`(`@keyframes{0%{scale:0}…}`, fill both)를 탄다. 그 사이에 재면
       `getBoundingClientRect()` 가 **중심점의 0×0** 으로 나오고(위치는 맞는데 크기가 0),
       그 상자로 잘라 찍으면 «켜져 있는데 0화소» 라는 가짜 결함이 나온다 — 실제로 260ms 대기로는
       6개 상태 전부가 그렇게 잡혔다. 시간을 늘려 «대개 괜찮게» 만들지 말고 **애니메이션이 끝난 것을
       확인**하고 잰다(고정 대기는 느린 기계에서 다시 깨진다). */
    await page.waitForTimeout(60);
    await page.waitForFunction(() => [...document.querySelectorAll('#dunSub .bdg')].every(e =>
      e.getAnimations().filter(a => a.animationName === 'jzDotIn')
        .every(a => a.playState === 'finished' || Number(a.currentTime || 0) >= 300)),
      null, { timeout: 5000 });
    const st = await ev(() => {
      const cell = k => document.querySelector('#dunSub [data-dsub="' + k + '"]');
      return {
        on: ['dun', 'raid', 'tower'].map(k => cell(k).classList.contains('alert')),
        box: ['dun', 'raid', 'tower'].map(k => {
          const e = cell(k).querySelector('.bdg');
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        }),
        adv: document.querySelector('.tab[data-t="adv"]').classList.contains('alert'),
        dots: document.querySelectorAll('#dunList .dnc > .dot').length,
        dunw: document.getElementById('dunw').className + '|' + dunSub,
      };
    });
    /* 화소 — 배지 bbox 를 잘라 붉은 화소를 센다(가려져 있으면 논리가 켜져도 0 이 나온다).
       ⚠ `display:none` 인 칸은 bbox 가 0×0 이다 — «노드가 없다»(-1) 와 갈라 적는다.
         전자는 정상(꺼진 것), 후자가 298 이 고친 결함이다. */
    const px = [];
    for (let i = 0; i < 3; i++) {
      const b = st.box[i];
      if (!b) { px.push(-1); continue; }
      if (b.w <= 0 || b.h <= 0) { px.push(0); continue; }
      const buf = await page.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: b.h } });
      px.push(await countRed(buf));
    }
    rows.push({ n: c.n, on: st.on, px, adv: st.adv, dots: st.dots });
    if (process.env.DBG) console.log('[dbg] ' + c.n + ' box=' + JSON.stringify(st.box) + ' dunw=' + st.dunw);
  }

  /* PNG 디코드 없이 세려면 캔버스를 쓰는 게 싸다 — 잘라 온 PNG 를 페이지에서 다시 읽는다 */
  async function countRed(buf) {
    const b64 = buf.toString('base64');
    return page.evaluate(async d => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const p = g.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], gg = p[i + 1], bb = p[i + 2];
        if (r > 150 && gg < 130 && bb < 150 && r - gg > 60 && r - bb > 40) n++;
      }
      return n;
    }, b64);
  }

  console.log('\n작업 298 — 03 던전 서브탭 레드닷 기능 체크 («논리 / 붉은 화소»)\n');
  console.log('| 상태 | 던전 | 컨텐츠 | 탑 | 탭바 «모험» | 던전 카드 dot |');
  console.log('|---|---|---|---|---|---|');
  rows.forEach(r => {
    const cell = i => (r.on[i] ? '🔴 켜짐' : '⚪ 꺼짐') + ' / '
      + (r.px[i] < 0 ? '**노드없음**' : r.px[i] + '화소');
    console.log('| ' + r.n + ' | ' + cell(0) + ' | ' + cell(1) + ' | ' + cell(2)
      + ' | ' + (r.adv ? '🔴 켜짐' : '⚪ 꺼짐') + ' | ' + r.dots + '장 |');
  });
  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.join(' ⁄ ') : ''));

  /* 판정 — 논리와 화소가 갈리는 칸이 하나라도 있으면 «사용자에겐 안 뜬다» 다 */
  let bad = 0;
  rows.forEach(r => r.on.forEach((o, i) => { if (o !== (r.px[i] > 0)) bad++; }));
  console.log('논리 ↔ 화소 불일치 ' + bad + '칸');
  console.log(bad === 0 && errs.length === 0 ? 'PROBE298 OK' : 'PROBE298 FAIL');
  await browser.close();
  process.exit(bad === 0 && errs.length === 0 ? 0 : 1);
})();
