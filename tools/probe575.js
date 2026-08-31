/* 작업 575 — 재현기: «재화 `+n` 플로트가 두 줄 겹쳐 인쇄된다».
 *
 * 등재문(518 5회차 비평가 CZ·DA 2인 공통)은 «C f3 x688..793 / y163..189 24행 안에 두 값이
 * 덧찍혀 «+54.1A» 로 읽힌다(실제는 `+4.1` 과 `+54.3A`)» 라고 적었다.
 * 338 규칙 — 처방 전에 **찍힌 좌표**로 그 창을 다시 만든다.
 *
 * 재는 것은 넷이다:
 *   [1] 한 순간에 살아 있는 `.fx-plus` 가 둘 이상인가 (그리고 몇 ms 동안인가)
 *   [2] 그 둘의 앵커(left/top)가 **같은가** — 같다면 «겹침» 은 우연이 아니라 구조다
 *   [3] 그 둘이 어느 레이어에 있는가(#fxl UI 발 · #fxlc 전투 발) — 서로를 못 보는 사이인가
 *   [4] 그 순간 알약이 무엇을 말하고 있는가(93 롤링 계단) = «값 불일치» 의 정체
 *
 * 장면은 `cap518.js` 와 같은 넷(A 소환결과 · B 일괄강화 · C 스킬시트 · D 도감)에
 * 같은 자극(`S.gold += 54321` — 발원 표시가 없는 골드)을 준다. 배경은 `S.bossFarm = true` 라
 * 전투 골드가 계속 흐른다 = 등재문 캡처와 같은 조건이다.
 *
 * 실행: node tools/probe575.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

const SCENES = [
  { id: 'A-소환결과', open: () => {
      const keys = Object.keys(BANNERS), res = [], sn = new Set();
      for (let i = 0; i < 4000 && res.length < 10; i++) { const o = summonOne(keys[i % keys.length]); if (sn.has(o.it.id)) continue; sn.add(o.it.id); res.push(o); }
      showSummonResult('weapon', 10, res, false);
    }, wait: 700 },
  { id: 'B-일괄강화결과', open: () => {
      EQUIPS.slice(0, 6).forEach(it => { S.own[it.id] = { n: 400, l: (S.own[it.id] || {}).l || 1 }; });
      const rr = levelUpAll(wpnList());
      openUpAll(rr.ups);
    }, wait: 700 },
  { id: 'C-스킬시트', open: () => {
      document.querySelector('.tab[data-t="hero"]').click();
      setTimeout(() => { const e = document.querySelector('#eqTabs [data-eqtab="sk"]'); if (e) e.click(); }, 300);
    }, wait: 900 },
  { id: 'D-도감', open: () => { document.querySelector('.side .ibtn[data-pop="coll"]').click(); }, wait: 700 },
  /* 512 가 표에 넣은 «알약 없는» 재화 넷은 도착지가 없어 **사건이 난 자리**에 뜬다 —
     한 사건이 둘을 같이 주면 두 플로터가 같은 점을 앵커로 쓴다. 같은 축의 다른 얼굴인지 잰다. */
  { id: 'E-알약없는재화둘', open: () => {}, wait: 300,
    fire: () => { S.stone += 5; S.rstone += 3; fxFlush(); } },
];

/* 페이지 안에 rAF 표본기를 심는다 — 살아 있는 `.fx-plus` 를 프레임마다 통째로 적는다.
   («겹쳤다» 는 두 노드가 **같은 순간에** 있어야 성립하므로 프레임 단위가 유일한 자다) */
const SAMPLER = () => {
  window.__p575 = [];
  const sc = () => { const r = document.getElementById('app').getBoundingClientRect();
    return { s: r.width / FRAME_W, x: r.left, y: r.top }; };
  const box = (el, f) => { const r = el.getBoundingClientRect();
    return { x1: +((r.left - f.x) / f.s).toFixed(1), y1: +((r.top - f.y) / f.s).toFixed(1),
             x2: +((r.right - f.x) / f.s).toFixed(1), y2: +((r.bottom - f.y) / f.s).toFixed(1) }; };
  const t0 = performance.now();
  const tick = () => {
    const f = sc();
    const list = [...document.querySelectorAll('.fx-plus')].map(el => Object.assign({
      txt: el.textContent,
      lay: el.parentNode && el.parentNode.id || '?',
      left: Math.round(parseFloat(el.style.left) || 0),
      top: Math.round(parseFloat(el.style.top) || 0),
      col: el.style.color,
    }, box(el, f)));
    const pill = el => { const n = document.querySelector(el); return n ? n.textContent.trim() : null; };
    window.__p575.push({ t: Math.round(performance.now() - t0), n: list.length, list,
                         gold: pill('.cGold'), dia: pill('.cDia') });
    if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/* 겹침은 **두 축이 같이** 겹쳐야 겹침이다(1회차에 세로만 재서 «다이아 알약 옆 골드» 를
   겹친 것으로 셌다 — x 는 717..764 와 889..1112 로 한 픽셀도 안 닿는다). 값은 세로 px. */
const ovl = (a, b) => {
  const ix = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  if (ix <= 0) return 0;
  return Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
};

(async () => {
  const b = await launch(chromium);
  const rows = [];
  for (const sc of SCENES) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.waitForTimeout(1100);
    await page.evaluate(() => { S.bossFarm = true; S.dia = 1e9; });
    await page.evaluate(sc.open);
    await page.waitForTimeout(sc.wait);
    await page.evaluate(SAMPLER);
    await page.evaluate(() => { document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove()); });
    await page.waitForTimeout(120);
    await page.evaluate(sc.fire || (() => { S.gold += 54321; }));  /* 발원 표시가 없는 골드 = cap518 과 같은 자극 */
    await page.waitForTimeout(4200);
    const smp = await page.evaluate(() => window.__p575);
    await ctx.close();

    /* ── 이 장면의 요약 ── */
    const multi = smp.filter(s => s.n >= 2);
    let worst = null, sameCur = 0, pairAll = 0, ovlPairs = 0, layers = new Set();
    let worstSame = null;                             /* 같은 재화끼리의 최악 겹침 */
    for (const s of multi) {
      for (let i = 0; i < s.list.length; i++) for (let j = i + 1; j < s.list.length; j++) {
        const a = s.list[i], c = s.list[j]; pairAll++;
        const o = +(ovl(a, c)).toFixed(1);
        if (o > 0) ovlPairs++;
        if (a.col === c.col) sameCur++;               /* 색 = 재화(FXCUR.col) */
        layers.add(a.lay); layers.add(c.lay);
        if (!worst || o > worst.o) worst = { o, t: s.t, a, c, gold: s.gold };
        if (a.col === c.col && (!worstSame || o > worstSame.o)) worstSame = { o, t: s.t, a, c, gold: s.gold };
      }
    }
    const anchorSame = sameCur, anchorAll = pairAll;
    const ms = multi.length ? (multi[multi.length - 1].t - multi[0].t) : 0;
    rows.push({ id: sc.id, frames: smp.length, multi: multi.length, ms, worst, worstSame, ovlPairs,
                anchorSame, anchorAll, layers: [...layers].sort().join('+'),
                texts: [...new Set(smp.flatMap(s => s.list.map(x => x.txt)))] });
  }
  await b.close();

  console.log('\n════ 재현 결과 ════');
  for (const r of rows) {
    console.log(`\n[${r.id}] 프레임 ${r.frames} · 동시생존(>=2) 프레임 ${r.multi} (${r.ms}ms) · 레이어 ${r.layers || '-'}`);
    console.log(`  플로트 문자열: ${r.texts.join(' , ') || '-'}`);
    for (const [nm, w] of [['최악', r.worst], ['같은재화', r.worstSame]]) {
      if (!w) continue;
      const { a, c, o, t, gold } = w;
      console.log(`  ${nm} 겹침 t=${t}ms — 세로 ${o}px`);
      console.log(`    (1) "${a.txt}" ${a.lay} left=${a.left} top=${a.top}  box ${a.x1}..${a.x2} / ${a.y1}..${a.y2}`);
      console.log(`    (2) "${c.txt}" ${c.lay} left=${c.left} top=${c.top}  box ${c.x1}..${c.x2} / ${c.y1}..${c.y2}`);
      console.log(`    그 순간 골드 알약 = ${gold}`);
    }
    console.log(`  겹치는 쌍 ${r.ovlPairs}/${r.anchorAll} · 그중 같은 재화 ${r.anchorSame}`);
  }

  console.log('\n════ 판정 ════');
  const anyMulti = rows.filter(r => r.multi > 0);
  const maxO = Math.max(...rows.map(r => r.worst ? r.worst.o : 0));
  const maxS = Math.max(...rows.map(r => r.worstSame ? r.worstSame.o : 0));
  /* ⚠ [2]·[3] 은 «재현이 되나» 가 아니라 «지금 어떤가» 를 묻는다 — 재현기가 수리 뒤에 영원히
     빨간 자가 되면 아무도 안 돌린다(310·333 계열). 수리 **전** 값은 여기 적어 남긴다:
       A 37.9 · B 38.5 · C 42.1 · D 40.1 · E 45.5px (같은 재화 최대 40.1 · 다른 재화 최대 45.5) */
  ok(anyMulti.length > 0, '[1] 한 순간에 .fx-plus 가 둘 이상 살아 있다 — ' + anyMulti.length + '/' + rows.length + ' 장면(구조는 그대로다)');
  ok(maxO === 0, '[2] 그런데 **겹치는 쌍이 0** 이다 — 최대 겹침 ' + maxO + 'px (수리 전 45.5px)');
  ok(maxS === 0, '[3] 같은 재화끼리도 0 이다 — 최대 ' + maxS + 'px (수리 전 40.1px)');
  ok(rows.some(r => r.layers.includes('fxl') && r.layers.includes('fxlc')),
     '[4] 두 노드가 여전히 서로 다른 레이어에 걸쳐 있다 — 층은 한 노드도 안 옮겼다(77·518)');
  ok(rows.some(r => r.texts.length >= 2), '[5] 두 값이 실제로 다르다(+54.3A 과 전투 발 소액)');
  ok(rows.every(r => r.frames > 30), '[전제] 표본기가 실제로 돌았다(장면마다 30프레임 초과)');

  console.log(`\n${pass}/${pass + fail} PASS`);
  process.exit(fail ? 1 : 0);
})();
