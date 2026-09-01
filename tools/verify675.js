/* 게이트 675 — 122 «z2 사본 레이어» 는 이웃 잉크를 한 픽셀도 지우지 않는다 (전수)
 *
 * 무엇을 지키는가 —
 *   122 22회차는 «검은 획이 광택에 밝아진다» 를 고치려고 **사본 레이어** 셋을 얹었다:
 *     `.shp-card .stk1/.stk2/.stk3`(소환 버튼 링) · `.shp-card .stkbar`(Lv 게이지 프레임) ·
 *     `.cn-cd>.btstk`(재화 [받기] 링). 셋 다 면·립·애니를 지우고 **검은 테두리만** 남긴 사본이고,
 *     이웃보다 **나중에** 그려지는 것이 그 설계다(그래야 광택 위로 올라간다).
 *   655 는 그 셋 중 하나(`.stkbar`)에서 **«원본에서는 알약에 가려 안 보이던 왼쪽 획» 이 사본으로
 *   복제되면서 «Lv.n» 글자 위에 그어지는 것**을 잡았고, `.clv{z-index:3}` 한 값으로 닫았다.
 *   이 자는 그 병의 **일반형**을 사본 셋 전부에서 지킨다:
 *
 *     사본이 «나중에 그려진다» 는 것은 유지하되, 그 사본이 실제로 칠하는 픽셀은
 *     **먼저 그려진 이웃의 잉크를 한 픽셀도 안 지운다.**
 *
 * ⚠ 헛초록을 막는 세 겹 —
 *   [A5] 사본마다 «먼저 그려지는 잉크 이웃» 이 실제로 **있어야** 한다. 사본을 이웃에서
 *        떼어 놓거나(«가짜 수리») 사본을 지우면 «덮임 0» 은 공짜로 참이 된다 — 그때 여기가 빨개진다.
 *   [B2] 잰 잉크 총량 하한 — «잉크 0 으로 얻은 초록» 금지(655 [B2] 와 같은 항).
 *   [R1~R3] 되돌림 시험 **세 계열 전부** — 사본이 이웃 잉크에 닿는 사본을 만들면
 *        이 자가 실제로 빨개지는지 계열마다 따로 확인한다(한 계열만 시험하면 나머지 둘은
 *        «자가 보고 있다» 는 증거가 없다).
 *
 * ⚠ 얼리기 — 122 의 광택 쓸기는 `.cfr::after`·`.cn-cd>.fr::after` 라 `*{animation:none}` 이 **안 닿는다**
 *   (LESSONS 122-③). 의사요소까지 얼리지 않으면 널 대조가 수백 픽셀로 흔들리고
 *   같은 CSS 를 쓰는 다섯 장 중 «한 장만» 빨간 유령 판정이 난다(675 1회차에 실제로 겪었다).
 *
 * 상세 재현·쌍별 표는 `tools/probe675.js`.
 *
 * 실행: node tools/verify675.js        (종료 코드 0 = PASS)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const D = 40;                       /* 픽셀 차분 문턱 — probe675·probe655 와 같은 값 */
const INK_LO = 8000;                /* 잰 잉크 총량 하한 — 실측 6.6만 (655 [B2] 와 같은 뜻) */
const SUM = { tab: 'summon', card: '#shopList .shp-card', copies: ['.stkbar', '.stk1', '.stk2', '.stk3'] };
const CN = { tab: 'coin', card: '#shopList .cn-cd', copies: ['.btstk'] };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    S.dia = 2e6; S.gold = 1e9; S.relic = 5e4;
    S.daily = S.daily || {}; S.daily.freeSum = {}; S.daily.adBuy = {};
    S.sumLv = 31; S.sumExp = 655;
    openShopPage();
  });
  await p.waitForTimeout(700);

  /* 정지 — 유휴 루프 · 캔버스 · **의사요소까지** */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.createElement('style'); st.id = 'v675stop';
    st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
    try { document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); } catch (e) {}
  });
  await p.waitForTimeout(200);

  /* 페이지 안 열거기 — probe675 와 **같은 정의**(자가 둘로 갈리면 뜻도 갈린다) */
  await p.evaluate(() => {
    window.__v675key = (card, n) => {
      let z = null, cur = n;
      while (cur && cur !== card) {
        const cs = getComputedStyle(cur);
        if (z === null && cs.zIndex !== 'auto' && cs.position !== 'static') z = Number(cs.zIndex);
        cur = cur.parentElement;
      }
      let top = n; while (top.parentElement && top.parentElement !== card) top = top.parentElement;
      return { z: z === null ? 0 : z, idx: [...card.children].indexOf(top) };
    };
    window.__v675ink = (el) => {
      const rg = document.createRange(); rg.selectNodeContents(el);
      let b = rg.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0) b = el.getBoundingClientRect();
      return { x1: b.left, y1: b.top, x2: b.right, y2: b.bottom };
    };
    /* 잉크 이웃 = 직접 텍스트를 가진 요소(글자·이모지) + 그림 노드(img·canvas·svg) */
    window.__v675neigh = (card, cp) => {
      const ck = window.__v675key(card, cp), cr = cp.getBoundingClientRect();
      const out = [];
      for (const e of card.querySelectorAll('*')) {
        if (cp.contains(e) || e.contains(cp)) continue;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
        let t = '';
        for (const c of e.childNodes) if (c.nodeType === 3) t += c.nodeValue;
        const isArt = /^(img|canvas|svg)$/.test(e.tagName.toLowerCase());
        if (!t.trim() && !isArt) continue;
        const k = window.__v675key(card, e);
        const after = (k.z !== ck.z) ? (ck.z > k.z) : (ck.idx > k.idx);
        if (!after) continue;                       /* 사본이 먼저 그려지면 덮을 수 없다 */
        const ib = window.__v675ink(e);
        if (ib.x2 - ib.x1 <= 0 || ib.y2 - ib.y1 <= 0) continue;
        if (ib.x2 <= cr.left || ib.x1 >= cr.right || ib.y2 <= cr.top || ib.y1 >= cr.bottom) continue;
        out.push(e);
      }
      return out;
    };
  });

  const shot = async clip => (await p.screenshot({ clip })).toString('base64');

  /* 사본 하나를 «켜고 / 끄고 / 이웃까지 끄고» 세 장으로 잰다 — 쌍별 상세는 probe675 몫이고
     여기서는 이웃을 **묶어** 재서 회귀에 쓸 만한 속도로 만든다(뜻은 같다). */
  async function measureCopy(cardSel, ci, copySel) {
    await p.evaluate(({ cardSel, ci }) => {
      document.querySelectorAll(cardSel)[ci].scrollIntoView({ block: 'center', behavior: 'instant' });
    }, { cardSel, ci });
    await p.waitForTimeout(150);
    const g = await p.evaluate(({ cardSel, ci, copySel }) => {
      const card = document.querySelectorAll(cardSel)[ci];
      const cp = card.querySelector(copySel);
      if (!cp) return null;
      document.querySelectorAll('[data-v675]').forEach(n => n.removeAttribute('data-v675'));
      const ns = window.__v675neigh(card, cp);
      ns.forEach(n => n.setAttribute('data-v675', '1'));
      const cr = cp.getBoundingClientRect();
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      for (const n of ns) {
        const ib = window.__v675ink(n);
        x1 = Math.min(x1, Math.max(ib.x1, cr.left)); y1 = Math.min(y1, Math.max(ib.y1, cr.top));
        x2 = Math.max(x2, Math.min(ib.x2, cr.right)); y2 = Math.max(y2, Math.min(ib.y2, cr.bottom));
      }
      cp.setAttribute('data-v675c', '1');
      return { n: ns.length, x1, y1, x2, y2 };
    }, { cardSel, ci, copySel });
    if (!g) return null;
    if (!g.n) return { n: 0, ink: 0, killed: 0, noise: 0 };

    const bx = { x1: Math.floor(g.x1) - 2, y1: Math.floor(g.y1) - 2, x2: Math.ceil(g.x2) + 2, y2: Math.ceil(g.y2) + 2 };
    const clip = { x: bx.x1 - 4, y: bx.y1 - 4, width: (bx.x2 - bx.x1) + 8, height: (bx.y2 - bx.y1) + 8 };
    const box = { x1: bx.x1 - clip.x, y1: bx.y1 - clip.y, x2: bx.x2 - clip.x, y2: bx.y2 - clip.y };
    if (clip.width <= 8 || clip.height <= 8) return { n: g.n, ink: 0, killed: 0, noise: 0 };

    const setVis = async (hideCopy, hideNeigh) => {
      await p.evaluate(({ hideCopy, hideNeigh }) => {
        const cp = document.querySelector('[data-v675c]');
        if (cp) cp.style.visibility = hideCopy ? 'hidden' : '';
        document.querySelectorAll('[data-v675]').forEach(n => { n.style.visibility = hideNeigh ? 'hidden' : ''; });
      }, { hideCopy, hideNeigh });
      await p.waitForTimeout(90);
    };
    await setVis(false, false); const A = await shot(clip);
    const A2 = await shot(clip);                       /* 널 대조 — 상태를 안 건드리고 연달아 */
    await setVis(true, false);  const B = await shot(clip);
    await setVis(true, true);   const C = await shot(clip);
    await setVis(false, false);
    await p.evaluate(() => { const c = document.querySelector('[data-v675c]'); if (c) c.removeAttribute('data-v675c'); });

    const r = await p.evaluate(async ({ a, a2, b, c, w, h, box, D }) => {
      const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
      const [A, A2, B, C] = await Promise.all([load(a), load(a2), load(b), load(c)]);
      const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
      const [dA, dA2, dB, dC] = [g(A), g(A2), g(B), g(C)];
      const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
      let ink = 0, killed = 0, noise = 0;
      for (let y = box.y1; y < box.y2; y++) for (let x = box.x1; x < box.x2; x++) {
        const i = (y * w + x) * 4;
        if (d(dA, dA2, i) > D) noise++;
        if (d(dB, dC, i) <= D) continue;
        ink++;
        if (d(dA, dB, i) > D && d(dA, dC, i) <= D) killed++;
      }
      return { ink, killed, noise };
    }, { a: A, a2: A2, b: B, c: C, w: clip.width, h: clip.height, box, D });
    return { n: g.n, ...r };
  }

  async function tab(t) {
    await p.evaluate(({ t }) => { shopCat = t; setShopCatTabs(t); renderShopPage(); }, { t });
    await p.waitForTimeout(400);
  }

  /* 화면 하나를 훑어 «사본별» 결과를 모은다 */
  async function sweep(scr) {
    await tab(scr.tab);
    const n = await p.evaluate(s => document.querySelectorAll(s).length, scr.card);
    const out = [];
    for (let ci = 0; ci < n; ci++) {
      for (const cs of scr.copies) {
        const r = await measureCopy(scr.card, ci, cs);
        if (r) out.push({ ci, copy: cs, ...r });
      }
    }
    return out;
  }

  /* 임시 사본 CSS — 되돌림 시험용(이름 고정, 646 규약대로 끝나면 반드시 걷는다) */
  const patch = async css => {
    await p.evaluate(({ css }) => {
      let e = document.getElementById('v675pat');
      if (!e) { e = document.createElement('style'); e.id = 'v675pat'; document.head.appendChild(e); }
      e.textContent = css;
    }, { css });
    await p.waitForTimeout(150);
  };

  console.log('VERIFY675 — 122 «z2 사본 레이어» 가 이웃 잉크를 덮지 않는다 (전수)');

  /* ── [A] 부품·122 규약 ───────────────────────────────────────────── */
  console.log('[A] 사본 셋이 그대로 있고 122 규약(기하 단일 출처·히트영역·면 없음)이 살아 있다');
  await tab('summon');
  const a = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const rectSame = [], noFace = [], hit = [];
    const rr = n => { const b = n.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
    cards.forEach((c, i) => {
      const pairs = [['.cbar', '.stkbar'], ['.cbtn.b1', '.stk1'], ['.cbtn.b2', '.stk2'], ['.cbtn.b3', '.stk3']];
      for (const [o, s] of pairs) {
        const A = c.querySelector(o), B = c.querySelector(s);
        if (!A || !B) { rectSame.push('칸' + (i + 1) + ' ' + s + ' 짝 없음'); continue; }
        const ra = rr(A), rb = rr(B);
        for (let k = 0; k < 4; k++) if (Math.abs(ra[k] - rb[k]) > 0.01) rectSame.push('칸' + (i + 1) + ' ' + s + '[' + k + '] Δ' + (rb[k] - ra[k]).toFixed(2));
        const cs = getComputedStyle(B);
        if (cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) noFace.push(s);
        if (cs.pointerEvents !== 'none') hit.push(s);
      }
    });
    return { cards: cards.length, rectSame, noFace, hit,
      stk: document.querySelectorAll('#shopList .shp-card .stk').length,
      bar: document.querySelectorAll('#shopList .shp-card .stkbar').length };
  });
  ok(a.cards === 5, '[A1] 소환 카드 5장 (' + a.cards + ')');
  ok(a.bar === 5 && a.stk === 20, '[A2] 사본 실재 — `.stkbar` ' + a.bar + '개 · `.stk` 계열 ' + a.stk + '개 (기대 5 · 20)');
  ok(a.rectSame.length === 0, '[A3] 사본 rect = 원본 rect (기하 단일 출처, 122 ⓒⓕ)' + (a.rectSame.length ? ' — ' + a.rectSame.slice(0, 3).join(' ;; ') : ''));
  ok(a.noFace.length === 0, '[A4a] 사본에 면 없음(테두리만)' + (a.noFace.length ? ' — ' + a.noFace.slice(0, 3).join(' ') : ''));
  ok(a.hit.length === 0, '[A4b] 사본 전부 pointer-events:none' + (a.hit.length ? ' — ' + a.hit.slice(0, 3).join(' ') : ''));

  /* ── [C] 655 가 세운 관계는 그대로 ──────────────────────────────── */
  console.log('[C] 655 의 관계 — 알약이 게이지 사본 위 · 둘은 실제로 겹친다');
  const c1 = await p.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const clv = card.querySelector('.clv'), stk = card.querySelector('.stkbar');
    const z = n => Number(getComputedStyle(n).zIndex || 0);
    const rc = clv.getBoundingClientRect(), rs = stk.getBoundingClientRect();
    return { zc: z(clv), zs: z(stk), ov: Math.min(rc.right, rs.right) - Math.max(rc.left, rs.left) };
  });
  ok(c1.zc > c1.zs, '[C1] `.clv` z=' + c1.zc + ' > `.stkbar` z=' + c1.zs + ' (655 처방)');
  ok(c1.ov >= 25, '[C2] 알약↔게이지 가로 겹침 ' + c1.ov.toFixed(1) + 'px ≥ 25 (떼어 놓는 «가짜 수리» 금지 — 측정표 10 §2 #8)');

  /* ── [B] 전수 픽셀 ──────────────────────────────────────────────── */
  console.log('[B] 전수 — 사본이 지운 이웃 잉크 (소환 5장 × 4사본 · 재화 전 칸 × 1사본)');
  const rs1 = await sweep(SUM);
  const rs2 = await sweep(CN);
  const all = [...rs1, ...rs2];
  const killedRows = all.filter(r => r.killed > 0);
  const inkSum = all.reduce((s, r) => s + r.ink, 0);
  const noiseMax = all.reduce((s, r) => Math.max(s, r.noise), 0);
  const noNeigh = all.filter(r => r.n === 0);
  console.log('     사본 ' + all.length + '개 · 이웃 쌍 ' + all.reduce((s, r) => s + r.n, 0)
    + ' · 잰 잉크 ' + inkSum + 'px · 지워짐 ' + all.reduce((s, r) => s + r.killed, 0) + 'px');
  ok(killedRows.length === 0, '[B1] 지워진 이웃 잉크 0px (' + killedRows.length + '개 사본이 덮는다'
    + (killedRows.length ? ' — ' + killedRows.slice(0, 3).map(r => r.copy + '#' + (r.ci + 1) + ' ' + r.killed + 'px').join(' ;; ') : '') + ')');
  ok(inkSum >= INK_LO, '[B2] 잰 잉크 총량 ' + inkSum + 'px ≥ ' + INK_LO + ' («잉크 0 으로 얻은 초록» 금지)');
  ok(noiseMax === 0, '[B3] 널 대조 최대 ' + noiseMax + 'px = 0 (의사요소까지 얼렸다)');
  ok(noNeigh.length <= 2, '[B4] «먼저 그려지는 잉크 이웃» 이 0 인 사본 ' + noNeigh.length + '개 ≤ 2'
    + (noNeigh.length ? ' — ' + noNeigh.slice(0, 3).map(r => r.copy + '#' + (r.ci + 1)).join(' ') : ''));

  /* [A5] — 병이 성립할 표본이 실제로 남아 있는가(세 계열 전부) */
  const fam = k => all.filter(r => (k === 'stk' ? /^\.stk[123]$/.test(r.copy) : r.copy === k)).reduce((s, r) => s + r.n, 0);
  ok(fam('.stkbar') > 0, '[A5a] `.stkbar` 아래에 먼저 그려지는 이웃 ' + fam('.stkbar') + '쌍 > 0');
  ok(fam('stk') > 0, '[A5b] `.stk1~3` 아래에 먼저 그려지는 이웃 ' + fam('stk') + '쌍 > 0');
  ok(fam('.btstk') > 0, '[A5c] `.btstk` 아래에 먼저 그려지는 이웃 ' + fam('.btstk') + '쌍 > 0');

  /* ── [R] 되돌림 시험 — 계열마다 따로 ─────────────────────────────── */
  console.log('[R] 되돌림 시험 — 사본이 이웃 잉크에 닿게 만들면 이 자가 빨개지는가 (계열별 양성 통제)');

  await tab('summon');
  await patch('#shopList .shp-card .clv{z-index:2 !important}');   /* 655 를 되돌린다 */
  const r1 = await measureCopy(SUM.card, 0, '.stkbar');
  await patch('');
  ok(r1 && r1.killed > 0, '[R1] `.clv{z-index:2}`(655 되돌림) → `.stkbar` 가 «Lv.n» 잉크 '
    + (r1 ? r1.killed : '?') + 'px 를 지운다 > 0');

  await patch('#shopList .shp-card .stk{border-width:40px !important}');
  const r2 = await measureCopy(SUM.card, 0, '.stk1');
  await patch('');
  ok(r2 && r2.killed > 0, '[R2] `.stk{border-width:40px}` → 소환 버튼 라벨 잉크 '
    + (r2 ? r2.killed : '?') + 'px 를 지운다 > 0');

  await tab('coin');
  await patch('#shopList .cn-cd>.btstk{border-width:30px !important}');
  const r3 = await measureCopy(CN.card, 0, '.btstk');
  await patch('');
  ok(r3 && r3.killed > 0, '[R3] `.btstk{border-width:30px}` → [받기] 라벨 잉크 '
    + (r3 ? r3.killed : '?') + 'px 를 지운다 > 0');

  /* ── [H] 원복 · 위생 ────────────────────────────────────────────── */
  const left = await p.evaluate(() => {
    const e = document.getElementById('v675pat');
    return { pat: e ? e.textContent.length : 0,
      hid: [...document.querySelectorAll('#shopList [style*="visibility"]')].filter(n => n.style.visibility === 'hidden').length };
  });
  ok(left.pat === 0, '[H1] 되돌림 사본 CSS 를 걷었다 (' + left.pat + '자 남음)');
  ok(left.hid === 0, '[H2] 감췄던 노드를 전부 되켰다 (' + left.hid + '개 남음)');

  await tab('summon');
  const back = await measureCopy(SUM.card, 0, '.stkbar');
  ok(back && back.killed === 0, '[H3] 원복 뒤 다시 초록 — 지워진 잉크 ' + (back ? back.killed : '?') + 'px');
  ok(errs.length === 0, '[H4] 페이지 에러 0' + (errs.length ? ' — ' + errs[0] : ''));

  console.log('');
  console.log('VERIFY675 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
