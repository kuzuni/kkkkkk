/* 작업 675 재현 — 122 «z2 사본 레이어» 전수: 사본이 이웃 글자 잉크를 덮는가.
 *
 * 655 는 사본 셋 중 **하나**(`.stkbar`)를 고쳤다. 병의 일반형은
 *
 *   «원본에서는 이웃에 가려 안 보이던 획» 이 사본으로 복제되면서 그 이웃 위에 그어진다
 *
 * 이고, 122 가 만든 사본은 셋이다:
 *   · `.shp-card .stk1/.stk2/.stk3` — 10 상점 «소환» 탭 카드의 버튼 검은 링 사본(z-index:2)
 *   · `.shp-card .stkbar`           — 같은 카드의 경험치 게이지 검은 프레임 사본(z-index:2 · 655 가 닫은 자리)
 *   · `.cn-cd>.btstk`               — 10 상점 «재화» 탭 카드의 [받기] 버튼 검은 링 사본(z-index:5)
 *
 * ⚠ **rect 겹침은 그 자체로 결함이 아니다**(675 등재문). 사본은 «면» 이 없고 **테두리 링만** 그리므로
 * 상자가 겹쳐도 획이 글자에 안 닿는 것이 122 의 설계다. ⇒ 판정은 반드시 **찍힌 픽셀**로 한다
 * (655 의 3장 차분을 그대로 재사용 — 자를 새로 짜지 않는다).
 *
 *   A  = 지금 화면(사본 켬 + 글자 켬)
 *   B  = 사본만 감춤(글자 켬)
 *   C0 = 사본 + 그 글자 둘 다 감춤
 *   이웃 잉크 = d(B,C0) > 40        · 지워진 잉크 = 그 픽셀에서 d(A,B) > 40 && d(A,C0) <= 40
 *
 * 절
 *   [E] 열거 — 사본마다 «자기보다 먼저 그려지는 글자 이웃» 을 페인트 키(top-child z · DOM idx)로 고른다
 *   [N] 널 대조 — 같은 상태 두 장 (drop-shadow 재래스터 잡음, 470 ⓒ)
 *   [P] 픽셀 — 쌍마다 지워진 잉크 px
 *   [K] 글리프 지도 — 빨간 쌍이 있으면 «#» 보이는 잉크 / «X» 덮인 잉크
 *
 * 실행: node tools/probe675.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const D = 40;   /* 픽셀 차분 문턱 — 655 와 같은 값 */

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

  /* 유휴 루프·상시 연출 정지(LESSONS 28-③ · 51-③ · 470 ⓒ)
     ⚑ **의사요소까지 얼려야 한다**(LESSONS 122-③) — 122 의 «광택 쓸기» 는 `.cfr::after` ·
     `.cn-cd>.fr::after` 에 걸려 있어 `*{animation:none}` 이 **안 닿는다**(`*` 는 요소만 고른다).
     1회차에 이걸 빼먹어 널 대조가 316~940픽셀로 흔들렸고, 같은 CSS 를 쓰는 다섯 장 중
     «한 장만» 빨간 유령 판정이 나왔다. */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.createElement('style');
    st.id = 'p675stop';
    st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
    try { document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); } catch (e) {}
  });
  await p.waitForTimeout(200);

  /* ── 공용: 페이지 안에 «사본 ↔ 이웃» 열거기를 심는다 ───────────────── */
  await p.evaluate(() => {
    /* 카드 안에서 노드의 페인트 키 — 카드의 «직계 자식» 까지 올라가 (z, DOM idx) 로 잰다.
       ⚠ `.b1` 등은 position:absolute + z-index:auto 라 **쌓임 맥락을 안 만든다** —
       그 자식 `u{z-index:2}` 는 카드 맥락에 z2 로 직접 참여한다. 그래서 키는
       «자기 z(auto 면 조상에서 물려받은 첫 숫자)» + «직계 자식의 DOM 순서» 두 축이다. */
    window.__p675key = (card, n) => {
      let z = null, cur = n;
      while (cur && cur !== card) {
        const cs = getComputedStyle(cur);
        if (z === null && cs.zIndex !== 'auto' && cs.position !== 'static') z = Number(cs.zIndex);
        cur = cur.parentElement;
      }
      let top = n;
      while (top.parentElement && top.parentElement !== card) top = top.parentElement;
      const idx = [...card.children].indexOf(top);
      return { z: z === null ? 0 : z, idx, top };
    };
    /* «잉크 이웃» = 자기 자식으로 공백 아닌 텍스트를 직접 가진 요소(글자·이모지) **+ 그림 노드**.
       ⚑ 글자만 물으면 470 → 655 의 «묻지 않은 축» 이 그대로 재발한다(LESSONS 655-①) —
       `img`·`canvas`·`svg` 도 사본 밑에 깔릴 수 있는 잉크다. */
    window.__p675texts = (card) => {
      const out = [], seen = new Set();
      const push = (e, txt) => { if (seen.has(e)) return; seen.add(e); out.push({ el: e, txt }); };
      for (const e of card.querySelectorAll('*')) {
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
        let t = '';
        for (const c of e.childNodes) if (c.nodeType === 3) t += c.nodeValue;
        if (t.trim()) { push(e, t.trim()); continue; }
        if (/^(img|canvas|svg)$/.test(e.tagName.toLowerCase())) push(e, '<' + e.tagName.toLowerCase() + '>');
      }
      return out;
    };
    /* 잉크 상자 — DOM Range(글리프 상자, 페인트와 무관) */
    window.__p675ink = (el) => {
      const rg = document.createRange(); rg.selectNodeContents(el);
      let b = rg.getBoundingClientRect();
      /* 그림 노드(img·canvas·svg)는 자식 텍스트가 없어 Range 가 0×0 이다 — 상자로 잰다 */
      if (b.width <= 0 || b.height <= 0) b = el.getBoundingClientRect();
      return { x1: b.left, y1: b.top, x2: b.right, y2: b.bottom };
    };
    window.__p675sel = (el) => {
      const cl = el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : '';
      return el.tagName.toLowerCase() + cl;
    };
  });

  const shot = async (clip) => (await p.screenshot({ clip })).toString('base64');

  /* 세 장 차분 — 페이지 안에서 센다 */
  const diff3 = async (a, bb, c, w, h, box, wantMap) => p.evaluate(async ({ a, b, c, w, h, box, wantMap, D }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B, C] = await Promise.all([load(a), load(b), load(c)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB, dC] = [g(A), g(B), g(C)];
    const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
    let ink = 0, killed = 0;
    const rows = [];
    for (let y = box.y1; y < box.y2; y++) {
      let s = '';
      for (let x = box.x1; x < box.x2; x++) {
        const i = (y * w + x) * 4;
        const isInk = d(dB, dC, i) > D;
        if (!isInk) { s += '.'; continue; }
        ink++;
        const k = d(dA, dB, i) > D && d(dA, dC, i) <= D;
        if (k) killed++;
        s += k ? 'X' : '#';
      }
      if (wantMap && (s.indexOf('#') >= 0 || s.indexOf('X') >= 0)) rows.push(String(y).padStart(3) + '|' + s);
    }
    return { ink, killed, rows };
  }, { a, b: bb, c, w, h, box, wantMap, D });

  /* 널 대조 — 같은 상태 두 장 */
  const nullDiff = async (a, bb, w, h, box) => p.evaluate(async ({ a, b, w, h, box, D }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB] = [g(A), g(B)];
    let n = 0, mx = 0;
    for (let y = box.y1; y < box.y2; y++) for (let x = box.x1; x < box.x2; x++) {
      const i = (y * w + x) * 4;
      const v = Math.max(Math.abs(dA[i] - dB[i]), Math.abs(dA[i + 1] - dB[i + 1]), Math.abs(dA[i + 2] - dB[i + 2]));
      if (v > D) n++; if (v > mx) mx = v;
    }
    return { n, mx };
  }, { a, b: bb, w, h, box, D });

  let totalPairs = 0, totalBad = 0, noiseMax = 0, skipped = 0, inkZero = 0;
  const bad = [];

  /* ── 화면 하나를 훑는다 ─────────────────────────────────────────── */
  async function sweep(label, cardSel, copySels) {
    console.log('');
    console.log('══ ' + label + ' ══');
    const nCards = await p.evaluate(s => document.querySelectorAll(s).length, cardSel);
    const plan = [];
    for (let ci0 = 0; ci0 < nCards; ci0++) {
      /* ⚠ 카드가 뷰포트(1080×2280) 밖에 있으면 screenshot clip 이 못 잡는다 —
         재화 탭은 19장이 y 4800 까지 간다. 카드마다 화면 가운데로 굴리고 **그 자리에서** 잰다. */
      await p.evaluate(({ cardSel, ci }) => {
        document.querySelectorAll(cardSel)[ci].scrollIntoView({ block: 'center', behavior: 'instant' });
      }, { cardSel, ci: ci0 });
      await p.waitForTimeout(160);
      const part = await p.evaluate(({ cardSel, copySels, ci }) => {
      const out = [];
      const cards = [document.querySelectorAll(cardSel)[ci]];
      cards.forEach((card) => {
        for (const cs of copySels) {
          const cp = card.querySelector(cs);
          if (!cp) continue;
          const ck = window.__p675key(card, cp);
          const cr = cp.getBoundingClientRect();
          const bw = parseFloat(getComputedStyle(cp).borderTopWidth) || 0;
          const risks = [];
          for (const { el, txt } of window.__p675texts(card)) {
            if (cp.contains(el)) continue;
            const k = window.__p675key(card, el);
            /* 사본이 «나중에» 그려지는가 = 위험 */
            const after = (k.z !== ck.z) ? (ck.z > k.z) : (ck.idx > k.idx);
            if (!after) continue;
            const ib = window.__p675ink(el);
            if (ib.x2 - ib.x1 <= 0 || ib.y2 - ib.y1 <= 0) continue;
            /* rect 겹침 — 675 등재문이 «소환 6 · 재화 19» 로 센 그 축 */
            const hitRect = !(ib.x2 <= cr.left || ib.x1 >= cr.right || ib.y2 <= cr.top || ib.y1 >= cr.bottom);
            if (!hitRect) continue;
            /* ⚠ 사본이 실제로 칠하는 곳은 **테두리 링**뿐이다 — 잉크가 구멍 «안» 이면
               122 설계상 안 닿는 것이 정답이다. 하지만 그 판정은 기하가 아니라 픽셀이 한다
               (675 등재문) — 분류만 적어 두고 **쌍은 전부 잰다**. */
            const inHole = ib.x1 >= cr.left + bw && ib.x2 <= cr.right - bw
              && ib.y1 >= cr.top + bw && ib.y2 <= cr.bottom - bw;
            /* ⚠ 표적은 **번호표**로 붙잡는다 — (선택자, 글자) 로 되찾으면 안 된다.
               한 카드 안에 `u.lab «10회 소환»` 이 **둘**(b1·b2)이라 되찾기가 엉뚱한 쪽을 집고,
               그러면 «남의 상자에서 내 글자를 감춘» 꼴이 되어 잉크 0px = 헛초록이 된다(1회차 함정). */
            const tag = 'p' + (window.__p675seq = (window.__p675seq || 0) + 1);
            el.setAttribute('data-p675i', tag);
            risks.push({ sel: window.__p675sel(el), txt: txt.slice(0, 14), ink: ib, z: k.z, idx: k.idx, inHole, tag });
          }
          out.push({ ci, cardSel, copy: cs, cz: ck.z, cidx: ck.idx, bw,
            rect: { x1: cr.left, y1: cr.top, x2: cr.right, y2: cr.bottom }, risks });
        }
      });
      return out;
      }, { cardSel, copySels, ci: ci0 });
      plan.push(...part);
      await measure(label, cardSel, part);
    }
  }

  async function measure(label, cardSel, plan) {
    for (const it of plan) {
      const head = '카드#' + (it.ci + 1) + ' ' + it.copy.padEnd(9)
        + ' z=' + it.cz + ' idx=' + String(it.cidx).padStart(2)
        + ' 테두리 ' + it.bw + 'px  rect ' + it.rect.x1.toFixed(0) + ',' + it.rect.y1.toFixed(0)
        + ' ' + (it.rect.x2 - it.rect.x1).toFixed(0) + '×' + (it.rect.y2 - it.rect.y1).toFixed(0);
      if (!it.risks.length) { console.log('  ' + head + '  → rect 가 겹치는 «먼저 그려지는 글자» 0'); continue; }
      console.log('  ' + head);
      for (const rk of it.risks) {
        totalPairs++;
        /* 상자 = 이웃 잉크 bbox ∩ 사본 rect, ±2 */
        const bx = {
          x1: Math.floor(Math.max(rk.ink.x1, it.rect.x1)) - 2,
          y1: Math.floor(Math.max(rk.ink.y1, it.rect.y1)) - 2,
          x2: Math.ceil(Math.min(rk.ink.x2, it.rect.x2)) + 2,
          y2: Math.ceil(Math.min(rk.ink.y2, it.rect.y2)) + 2
        };
        const clip = { x: bx.x1 - 4, y: bx.y1 - 4, width: (bx.x2 - bx.x1) + 8, height: (bx.y2 - bx.y1) + 8 };
        /* ⚠ 겹침이 «rect 로는 참인데 상자로는 비는» 자리가 있다(둥근 코너·1px 접점).
           그런 쌍을 조용히 0px 로 적으면 그게 헛초록이다 — 세지 말고 이름을 남긴다. */
        if (bx.x2 - bx.x1 <= 4 || bx.y2 - bx.y1 <= 4) {
          totalPairs--; skipped++;
          console.log('    ' + (rk.sel + ' «' + rk.txt + '»').padEnd(34)
            + ' (겹침 상자 ' + (bx.x2 - bx.x1 - 4) + '×' + (bx.y2 - bx.y1 - 4) + ' — 잴 것 없음)');
          continue;
        }
        const box = { x1: bx.x1 - clip.x, y1: bx.y1 - clip.y, x2: bx.x2 - clip.x, y2: bx.y2 - clip.y };

        /* ⚠ 표적을 **한 번만** 찾아 표시해 둔다 — 매번 다시 찾으면 «감춘 뒤» 에는 열거기가
           그 노드를 (visibility:hidden 이라) 안 돌려줘 **영영 안 켜진다**(1회차에 실제로 그랬다). */
        const found = await p.evaluate(t => !!document.querySelector('[data-p675i="' + t + '"]'), rk.tag);
        const setVis = async (hide) => {
          await p.evaluate(({ cardSel, ci, copy, tag, hide }) => {
            const card = document.querySelectorAll(cardSel)[ci];
            const cp = card.querySelector(copy);
            const t = document.querySelector('[data-p675i="' + tag + '"]');
            cp.style.visibility = hide.indexOf('copy') >= 0 ? 'hidden' : '';
            if (t) t.style.visibility = hide.indexOf('text') >= 0 ? 'hidden' : '';
          }, { cardSel, ci: it.ci, copy: it.copy, tag: rk.tag, hide });
          await p.waitForTimeout(90);
        };
        if (!found) { totalPairs--; skipped++; console.log('    (표적 못 찾음) ' + rk.sel + ' «' + rk.txt + '»'); continue; }

        await setVis([]);           const sA = await shot(clip);
        const sA2 = await shot(clip);   /* 널 대조 — 상태를 안 건드리고 연달아 두 장 */
        await setVis(['copy']);     const sB = await shot(clip);
        await setVis(['copy', 'text']); const sC = await shot(clip);
        await setVis([]);

        const nz = await nullDiff(sA, sA2, clip.width, clip.height, box);
        if (nz.n > noiseMax) noiseMax = nz.n;
        const r = await diff3(sA, sB, sC, clip.width, clip.height, box, false);
        const isBad = r.killed > 0;
        if (r.ink === 0) {             /* «잉크 0 으로 얻은 초록» — 655 [B2] 가 막은 그 헛초록 */
          inkZero++;
          const dbg = await p.evaluate(t => {
            const n = document.querySelector('[data-p675i="' + t + '"]');
            if (!n) return { miss: 1 };
            const cs = getComputedStyle(n), r = n.getBoundingClientRect();
            return { vis: cs.visibility, disp: cs.display, op: cs.opacity,
              rect: [+r.left.toFixed(1), +r.top.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)] };
          }, rk.tag);
          console.log('      ⚠ 잉크 0 진단 — ' + JSON.stringify(dbg) + ' clip=' + JSON.stringify(clip)
            + ' box=' + JSON.stringify(box));
        }
        if (isBad) { totalBad++; bad.push({ label, ci: it.ci, copy: it.copy, rk, clip, box, killed: r.killed, ink: r.ink }); }
        console.log('    ' + (rk.sel + ' «' + rk.txt + '»').padEnd(34)
          + (rk.inHole ? ' [구멍안]' : ' [링위 ]')
          + ' 잉크 ' + String(r.ink).padStart(5) + 'px'
          + ' · 지워짐 ' + String(r.killed).padStart(4) + 'px'
          + ' · 널 ' + String(nz.n).padStart(3)
          + '  ' + (isBad ? '★ 덮임 (' + (r.killed / Math.max(1, r.ink) * 100).toFixed(1) + '%)' : '초록'));
      }
    }
  }

  console.log('PROBE675 — 122 «z2 사본 레이어» 전수: 사본이 이웃 글자 잉크를 덮는가');
  console.log('문턱 Δ' + D + ' · 판정 = «사본을 켜면 그 잉크 픽셀이 «글자 없는 장» 쪽으로 되돌아간다»');

  let mark = 0;

  /* 소환 탭 */
  await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
  await p.waitForTimeout(400);
  await sweep('10 상점 «소환» 탭 — .shp-card', '#shopList .shp-card', ['.stkbar', '.stk1', '.stk2', '.stk3']);
  await maps(bad.slice(mark), () => '#shopList .shp-card'); mark = bad.length;

  /* 재화 탭 */
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(400);
  await sweep('10 상점 «재화» 탭 — .cn-cd', '#shopList .cn-cd', ['.btstk']);
  await maps(bad.slice(mark), () => '#shopList .cn-cd'); mark = bad.length;

  /* ── 글리프 지도 — 빨간 쌍만 ─────────────────────────────────────── */
  async function maps(list, cardSelOf) {
    if (!list.length) return;
    console.log('');
    console.log('글리프 지도 — «#» 보이는 잉크 · «X» 사본이 지운 잉크');
    for (const bd of list.slice(0, 4)) {
      /* 그 쌍을 다시 세 장 찍는다 */
      const setVis = async (hide) => {
        await p.evaluate(({ cardSel, ci, copy, tag, hide }) => {
          const card = document.querySelectorAll(cardSel)[ci];
          const cp = card.querySelector(copy);
          const t = document.querySelector('[data-p675i="' + tag + '"]');
          cp.style.visibility = hide.indexOf('copy') >= 0 ? 'hidden' : '';
          if (t) t.style.visibility = hide.indexOf('text') >= 0 ? 'hidden' : '';
        }, { cardSel: cardSelOf(bd), ci: bd.ci, copy: bd.copy, tag: bd.rk.tag, hide });
        await p.waitForTimeout(90);
      };
      const cs0 = cardSelOf(bd);
      /* ⚠ 여기서 `renderShopPage()` 를 다시 부르면 표적 번호표가 통째로 날아간다 —
         지도는 **그 스윕 직후** 같은 DOM 위에서 그린다(탭 전환 없음). */
      await p.evaluate(({ cardSel, ci }) => {
        document.querySelectorAll(cardSel)[ci].scrollIntoView({ block: 'center', behavior: 'instant' });
      }, { cardSel: cs0, ci: bd.ci });
      await p.waitForTimeout(160);
      await setVis([]);               const sA = await shot(bd.clip);
      await setVis(['copy']);         const sB = await shot(bd.clip);
      await setVis(['copy', 'text']); const sC = await shot(bd.clip);
      await setVis([]);
      const r = await diff3(sA, sB, sC, bd.clip.width, bd.clip.height, bd.box, true);
      console.log('  · ' + bd.label + ' 카드#' + (bd.ci + 1) + ' ' + bd.copy + ' ↔ ' + bd.rk.sel + ' «' + bd.rk.txt + '»');
      for (const row of r.rows) console.log('    ' + row);
    }
  }

  /* ── [R] 양성 통제 — 655 의 수리를 되돌리면 이 자가 그 병을 «다시 본다» ──────
     헛초록(«이미 참인 것을 재는 자») 을 막는 유일한 증거다(338 처방). */
  console.log('');
  console.log('══ [R] 양성 통제 — `.shp-card .clv{z-index:2}` 로 655 를 되돌린 사본 ══');
  await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'p675rev';
    st.textContent = '#shopList .shp-card .clv{z-index:2 !important}';
    document.head.appendChild(st);
  });
  await p.waitForTimeout(160);
  const beforeBad = totalBad, beforePairs = totalPairs;
  await sweep('[R] 되돌린 사본 — 소환 카드 1장', '#shopList .shp-card:nth-child(1)', ['.stkbar']);
  const revBad = totalBad - beforeBad;
  console.log('  ⇒ 되돌린 사본에서 덮인 쌍 ' + revBad + '개 / 잰 쌍 ' + (totalPairs - beforePairs)
    + (revBad ? '  ★ 자가 병을 본다(양성 통제 성립)' : '  ⚠ 양성 통제 실패 — 이 자는 병을 못 본다'));
  await maps(bad.filter(x => x.label.indexOf('[R]') === 0), () => '#shopList .shp-card:nth-child(1)');
  await p.evaluate(() => { const n = document.getElementById('p675rev'); if (n) n.remove(); });
  totalBad = beforeBad; totalPairs = beforePairs;   /* 본 스윕 집계에는 안 넣는다 */
  while (bad.length && bad[bad.length - 1].label.indexOf('[R]') === 0) bad.pop();

  console.log('');
  console.log('요약 — 검사한 쌍 ' + totalPairs + ' · 덮인 쌍 ' + totalBad
    + (totalBad ? ' (' + bad.map(x => x.copy + '↔' + x.rk.sel).join(' · ') + ')' : ' ⇒ 전부 초록'));
  console.log('널 대조 최대 ' + noiseMax + '픽셀 (「덮임」 은 두 조건을 동시에 요구하므로 이 잡음으로는 안 선다)');
  console.log('겹침 상자가 비어 안 잰 쌍 ' + skipped + ' · 잉크 0px 로 끝난 쌍 ' + inkZero
    + '  (둘 다 «헛초록» 후보라 이름으로 남긴다)');
  console.log('페이지 에러: ' + errs.length + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  process.exitCode = 0;
})();
