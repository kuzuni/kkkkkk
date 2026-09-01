#!/usr/bin/env node
/* 재현 — 작업 742: `verify471` [T] 두 항이 실행마다 갈린다.
 *
 *   node tools/probe742.js [반복수]
 *
 * 무엇을 묻나 — [T] 는 **두 자매 자**(`cap471` 의 잉크코너 ↔ `probe471c` 의 글리프 잉크)를
 * 같이 돌려 «같은 코너를 보는가»(≤1px) 와 «그림 코너가 상자 밖이 아닌가»(ix ≤ bx−1) 를 묻는다.
 * 등재문의 실측은 같은 트리에서 47/49 ↔ 49/49 로 갈렸고, 빨간 회차의 값은
 * **#1 잉크코너 146**(상자 145) · **드리프트 10.00px** 이었다. 초록 회차는 #1 이 136 이다.
 * 146 − 136 = 10.00 이라 **두 빨강은 한 사건**이다 — 자 하나가 한 칸에서 10px 다른 것을 읽는다.
 *
 * 이 자는 그 사건을 **한 브라우저 판 안에서 여러 번** 만들어 갈래를 가른다. 회차마다 같은 칸을
 * ⓐ `cap471` 규칙(닷 아닌 **자식 전부** 숨김 = 글리프+라벨 합집합) ⓑ `probe471c` 규칙(`.si` 만 숨김)
 * 두 자로 각각 재고, 그때의 ⓒ 호스트/닷 상자 · ⓓ 도는 애니 수 · ⓔ 닷 노드 동일성(재렌더 감지)을 같이 싣는다.
 *
 * ⚠ 브라우저를 다시 띄우지 않는다 — 회차 간 유일한 차이가 «시간(재렌더 타이밍)» 이 되게 한다.
 *   자를 8~10분씩 다시 돌려 4회 분포를 잡는 대신 한 판에서 20회를 본다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 2;
const N = Number(process.argv[2] || 12);
const SEL = '.side .ibtn';

const r2 = v => (v === null || v === undefined ? '—' : String(Math.round(v * 100) / 100));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  /* 두 자매 자가 공통으로 하는 것 — 전투 루프를 세운다(캔버스가 매 프레임 다르면 차분이 통째로 «잉크» 다). */
  await page.evaluate(() => { window.step = () => {}; });
  await page.evaluate(() => { document.querySelectorAll('.side .ibtn').forEach(b => b.classList.add('on')); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.querySelectorAll('.side .ibtn').forEach(b => {
      const d = b.querySelector('.bdg');
      if (d && getComputedStyle(d).display === 'none') d.style.display = 'block';
    });
  });
  await page.waitForTimeout(250);

  /* 잉크 코너 — 세 장 차분. `hideSel` 이 규칙을 가른다(cap471: 자식 전부 · probe471c: `.si` 만). */
  const inkCorner = async (idx, clip, rule) => {
    const setKids = (show) => page.evaluate(([s, i, sh, rl]) => {
      const h = document.querySelectorAll(s)[i];
      if (!h) return 0;
      const ks = rl === 'cap'
        ? [...h.children].filter(e => !e.matches('.updot,.bdg,s.dot,.dot'))
        : [...h.querySelectorAll('.si')];
      ks.forEach(e => { e.style.visibility = sh ? '' : 'hidden'; });
      return ks.length;
    }, [SEL, idx, show, rule]);
    const dot = (show) => page.evaluate(([s, i, sh]) => {
      const h = document.querySelectorAll(s)[i];
      if (!h) return;
      h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.style.visibility = sh ? '' : 'hidden'; });
    }, [SEL, idx, show]);
    const view = (show) => page.evaluate(sh => {
      const v = document.getElementById('view'); if (v) v.style.visibility = sh ? '' : 'hidden';
    }, show);
    await view(true);
    await dot(false);
    const A = await page.screenshot({ clip });
    const k = await setKids(false);
    if (!k) { await view(false); return null; }
    const B = await page.screenshot({ clip });
    await setKids(true);
    const A2 = await page.screenshot({ clip });
    await dot(true);
    await view(false);
    return page.evaluate(async ([a64, b64, a264, cl, dsf]) => {
      const load = async (s) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.getContext('2d').getImageData(0, 0, img.width, img.height);
      };
      const A = await load(a64), B = await load(b64), A2 = await load(a264);
      if (A.width !== B.width || A.height !== B.height || A2.width !== A.width) return null;
      let t = 1e9, r = -1e9, cnt = 0, rY = -1;
      for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]),
          Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3]));
        const j = Math.max(Math.abs(A.data[i] - A2.data[i]), Math.abs(A.data[i + 1] - A2.data[i + 1]),
          Math.abs(A.data[i + 2] - A2.data[i + 2]), Math.abs(A.data[i + 3] - A2.data[i + 3]));
        if (d > 60 && j <= 10) { cnt++; if (x > r) { r = x; rY = y; } if (y < t) t = y; }
      }
      /* rYpx = «우변을 만든 화소» 의 세로 자리 — 그것이 글리프 띠인지 라벨 띠인지 닷 띠인지 가른다.
         far = 호스트 상자 우변보다 오른쪽에 선 화소들의 페이지 좌표(최대 12개) — «누구의 화소인가» 를
         `elementsFromPoint` 로 물어보기 위한 표본이다. */
      const far = [];
      if (cnt) for (let y = 0; y < A.height && far.length < 12; y++) for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]),
          Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3]));
        const j = Math.max(Math.abs(A.data[i] - A2.data[i]), Math.abs(A.data[i + 1] - A2.data[i + 1]),
          Math.abs(A.data[i + 2] - A2.data[i + 2]), Math.abs(A.data[i + 3] - A2.data[i + 3]));
        if (d > 60 && j <= 10 && cl.x + (x + 1) / dsf > cl.hr) { far.push([cl.x + (x + 1) / dsf, cl.y + y / dsf]); if (far.length >= 12) break; }
      }
      return cnt ? { r: cl.x + (r + 1) / dsf, t: cl.y + t / dsf, n: cnt, rY: cl.y + rY / dsf, far } : null;
    }, [A.toString('base64'), B.toString('base64'), A2.toString('base64'), clip, DSF]);
  };

  const state = (idx) => page.evaluate(([s, i]) => {
    const h = document.querySelectorAll(s)[i];
    const d = h.querySelector('.bdg'), g = h.querySelector('.si'), l = h.querySelector('.sl');
    const hb = h.getBoundingClientRect();
    const R = e => e ? { x: +e.getBoundingClientRect().left.toFixed(2), r: +e.getBoundingClientRect().right.toFixed(2), y: +e.getBoundingClientRect().top.toFixed(2) } : null;
    if (!window.__p742) window.__p742 = new WeakSet();
    const fresh = d && !window.__p742.has(d);
    if (d) window.__p742.add(d);
    return {
      hx: +hb.left.toFixed(2), hr: +hb.right.toFixed(2), hy: +hb.top.toFixed(2),
      si: R(g), sl: R(l), bdg: R(d),
      sf: h.style.getPropertyValue('--sf').trim() || '—',
      anim: document.getAnimations().length,
      hostAnim: h.getAnimations({ subtree: true }).length,
      newDot: fresh, dotVis: d ? getComputedStyle(d).visibility : '—',
      giVis: g ? getComputedStyle(g).visibility : '—',
    };
  }, [SEL, idx]);

  /* 도는 애니가 무엇인지 이름으로 한 번 싣는다 — «누가 흔드는가» 를 추측으로 두지 않는다. */
  const anims = await page.evaluate(() => document.getAnimations().map(a => {
    const t = a.effect && a.effect.target;
    const ti = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    return (t ? t.tagName.toLowerCase() + (typeof t.className === 'string' && t.className ? '.' + t.className.trim().split(/\s+/).join('.') : '') : '?')
      + ' ' + (a.animationName || (a.effect && a.effect.getKeyframes && '(css)') || '?')
      + ' ' + (ti.iterations === Infinity ? '∞' : ti.iterations) + '×' + ti.duration;
  }));
  console.log('  도는 애니 ' + anims.length + '개 — ' + [...new Set(anims)].join(' · ') + '\n');

  const idx = Number(process.env.P742_CELL || 0);
  const g0 = await state(idx);
  const clip = {
    x: Math.max(0, Math.floor(g0.hx - 30)), y: Math.max(0, Math.floor(g0.hy - 30)),
    width: Math.ceil((g0.hr - g0.hx) + 60), height: Math.ceil(114 + 60),
    hr: g0.hr,
  };
  /* «누구의 화소인가» — 페이지 좌표를 주면 그 자리에 실제로 서 있는 노드 사슬을 이름으로 돌려준다. */
  const owner = (pts) => page.evaluate(ps => ps.map(([x, y]) =>
    x + ',' + y + ' → ' + document.elementsFromPoint(x, y).slice(0, 3)
      .map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')
        + (e.dataset && e.dataset.pop ? '[' + e.dataset.pop + ']' : '')).join(' < ')), pts);
  console.log('PROBE742 — `verify471` [T] 자매 자 드리프트 재현 (칸 #' + (idx + 1) + ' · ' + N + '회 · 한 판)\n');
  console.log('  호스트 상자 우변 ' + r2(g0.hr) + ' · `.si` ' + r2(g0.si.x) + '..' + r2(g0.si.r)
    + ' · `.sl` ' + r2(g0.sl.x) + '..' + r2(g0.sl.r) + ' · `.bdg` ' + r2(g0.bdg.x) + '..' + r2(g0.bdg.r) + '\n');
  const P = (s, w) => String(s).padEnd(w);
  console.log(P('#', 4) + P('cap 우/상', 18) + P('471c 우/상', 18) + P('드리프트', 10)
    + P('상자밖?', 9) + P('우변화소 y', 12) + P('재렌더', 8) + '도는애니(전체/호스트)');
  console.log('-'.repeat(110));
  const capR = [], pcR = [], drifts = [];
  for (let k = 0; k < N; k++) {
    /* P742_FREEZE=1 — 처방 후보 ⓐ: 재는 동안 **화면 전체**의 애니를 세운다(`probe471c` 규칙).
       cap471 은 호스트 subtree + 조상만 세우므로 «형제 칸» 은 계속 돈다. */
    if (process.env.P742_FREEZE === '1') {
      await page.evaluate(() => {
        for (let k = 0; k < 12; k++) document.getAnimations().forEach(a => {
          try { const t = a.effect.getTiming();
            if (t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.pause(); a.currentTime = t.duration || 0; }
          } catch (_) {}
        });
      });
      await page.waitForTimeout(60);
    }
    const a = await inkCorner(idx, clip, 'cap');
    const st = await state(idx);
    const b = await inkCorner(idx, clip, 'pc');
    if (a) capR.push(a.r);
    if (b) pcR.push(b.r);
    const dr = (a && b) ? Math.max(Math.abs(a.r - b.r), Math.abs(a.t - b.t)) : null;
    if (dr !== null) drifts.push(dr);
    console.log(P(k + 1, 4)
      + P(a ? r2(a.r) + ' / ' + r2(a.t) : '측정불가', 18)
      + P(b ? r2(b.r) + ' / ' + r2(b.t) : '측정불가', 18)
      + P(dr === null ? '—' : r2(dr), 10)
      + P(a ? (a.r > g0.hr - 1 ? '⚠ 밖' : '안') : '—', 9)
      + P(a ? r2(a.rY) : '—', 12)
      + P(st.newDot ? '⚠ 새 닷' : '—', 8)
      + st.anim + ' / ' + st.hostAnim);
    for (const [tag, res] of [['cap', a], ['471c', b]]) {
      if (res && res.far && res.far.length) {
        const who = await owner(res.far.slice(0, 4));
        console.log('      ⚠ ' + tag + ' 규칙이 «상자 밖» 화소를 셌다 (' + res.far.length + '개+) — ' + who.join('   |   '));
      }
    }
    await page.waitForTimeout(Number(process.env.P742_GAP || 120));
  }
  const mm = a => a.length ? { min: Math.min(...a), max: Math.max(...a) } : null;
  const C = mm(capR), Pc = mm(pcR), D = mm(drifts);
  console.log('\n요약');
  console.log('  cap471 규칙 우변  — 최소 ' + r2(C && C.min) + ' · 최대 ' + r2(C && C.max)
    + ' ⇒ 폭 ' + r2(C && (C.max - C.min)) + 'px');
  console.log('  probe471c 규칙 우변 — 최소 ' + r2(Pc && Pc.min) + ' · 최대 ' + r2(Pc && Pc.max)
    + ' ⇒ 폭 ' + r2(Pc && (Pc.max - Pc.min)) + 'px');
  console.log('  드리프트          — 최소 ' + r2(D && D.min) + ' · 최대 ' + r2(D && D.max)
    + ' (게이트 문턱 ≤1px)');
  console.log('  상자 밖 회차      — ' + capR.filter(v => v > g0.hr - 1).length + '/' + capR.length
    + ' (게이트: 0 이어야 통과 · 상자 우변 ' + r2(g0.hr) + ')');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
