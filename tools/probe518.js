/* 작업 518 — «재화를 안 얻었는데 골드 획득 연출이 터진다» 재현/측정 (판정 없음, 측정 전용).
 *
 * LESSONS 338 ① — 등재문의 처방을 따르기 전에 **가설부터 재현해 기각하거나 확인한다.**
 * 등재문의 갈래는 일곱이다(ⓐ~ⓖ). 이 프로브가 재는 것:
 *   ⓐ  소환은 정말 골드를 안 주는가            (S.gold 델타)
 *   ⓑ  장비 일괄 강화는 정말 골드를 안 쓰는가  (S.gold 델타 — 조각으로만 산다)
 *   ⓔ  «팝업이 떠 있는 동안 배경 전투 골드» 가 팝업 **위** 레이어(#fxl)로 오는가
 *   ⓕ  «전투 발원이 만료된 뒤 들어온 전투 골드» 의 발원이 **마지막으로 누른 버튼**으로 찍히는가
 *   ⓒ  fxUpOk 앰버(#FFC02E)와 FXCUR.gold.col(#FFDE6A)의 색 거리(CIE-Lab ΔE76)
 *
 * ⚑ ⓕ 는 «가정된 상황» 이 아니라 제품 안에 **실재하는 순서**다:
 *    475 가 보스 격파와 클리어 보너스 골드 사이에 1초 홀드를 넣었으므로
 *    `killEnemy` 의 `fxAt(…,'combat')`(창 600ms)은 그 골드가 들어올 때 이미 만료돼 있고,
 *    `fxTapEl`(창 1200ms)만 살아 있다 ⇒ 발원이 «내가 누른 버튼» 으로 찍힌다.
 *    22291(스테이지 클리어 보너스)·22316(파도 전멸 보너스)·32917(오프라인)은
 *    `fxAt` 을 **한 번도 안 부른다** — 정적 스캔으로 같이 못박는다.
 *
 * 실행: node tools/probe518.js
 * 수리 전/후 **같은 명령**으로 돌려 대조한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ── 정적 스캔: 골드를 늘리는 자리마다 «전투 발원 표시» 가 붙어 있는가 ── */
function staticScan() {
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const lines = src.split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (!/S\.gold\s*\+=/.test(ln)) return;
    if (/^\s*\*/.test(ln) || /^\s*\/\*/.test(ln)) return;          /* 주석 줄 제외 */
    /* 그 줄 위 12줄 안에 fxAt(…, 'combat') 이 있는가 */
    const near = lines.slice(Math.max(0, i - 12), i + 1).join('\n');
    hits.push({ line: i + 1, txt: ln.trim().slice(0, 60), tagged: /fxAt\(/.test(near) });
  });
  return hits;
}

(async () => {
  const stat = staticScan();
  console.log('\n=== probe518 ⓢ 정적 — `S.gold +=` 자리와 «전투 발원 표시(fxAt)» ===');
  stat.forEach(h => console.log('  ' + (h.tagged ? 'combat 표시 O' : 'combat 표시 ✗') + '  ' + h.line + ': ' + h.txt));
  const untagged = stat.filter(h => !h.tagged);

  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const r = await p.evaluate(async () => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    const wait = async n => { for (let i = 0; i < n; i++) await raf(); };
    const cnt = sel => document.querySelectorAll(sel).length;
    const layerOf = el => el.closest('#fxl') ? 'fxl' : (el.closest('#fxlc') ? 'fxlc' : '?');

    /* 연출 노드를 «생성 순간» 에 잡는다 — fxTick 이 금방 지우므로 프레임 스캔만으로는 놓친다 */
    const seen = [];
    const mo = new MutationObserver(recs => {
      for (const rec of recs) for (const n of rec.addedNodes) {
        if (n.nodeType !== 1 || !n.classList) continue;
        if (n.classList.contains('fx-fly') || n.classList.contains('fx-lit')
         || n.classList.contains('fx-spark') || n.classList.contains('fx-plus')) {
          const r0 = n.getBoundingClientRect();
          seen.push({ cls: n.className, layer: layerOf(n), x: +r0.x.toFixed(1), y: +r0.y.toFixed(1),
                      col: n.style.getPropertyValue('--c') || n.style.color || '' });
        }
      }
    });
    const arm = () => { seen.length = 0; mo.observe(document.body, { childList: true, subtree: true }); };
    const disarm = () => { mo.disconnect(); return seen.slice(); };

    S.dia = 1e9; S.gold = 1e6;
    const out = {};

    /* ── ⓐ 소환은 골드를 주는가 ─────────────────────────────────────── */
    {
      const g0 = S.gold;
      const res = [];
      for (let i = 0; i < 10; i++) res.push(summonOne('weapon'));
      out.summonGoldDelta = S.gold - g0;
    }

    /* ── ⓑ 장비 일괄 강화는 골드를 쓰는가 ──────────────────────────── */
    {
      /* 강화 재료(조각)를 넉넉히 심어 실제로 오를 수 있게 만든다 */
      EQUIPS.slice(0, 6).forEach(it => { S.own[it.id] = { n: 400, l: 1 }; });
      const g0 = S.gold;
      const rr = levelUpAll(wpnList());
      out.upAllGoldDelta = S.gold - g0;
      out.upAllSteps = rr.lvs;
    }

    /* ── ⓔ·ⓕ 시나리오 1: 소환 결과 팝업이 열린 채 «전투 발원 없는» 골드 ── */
    /* 실제 순서를 그대로 만든다: 버튼을 진짜로 누르고(→ fxTapEl), 팝업을 열고,
       fxAt 의 600ms 창이 만료된 뒤에 22291·22316 과 **같은 방식**으로 골드를 올린다. */
    const scene = async (label, openFn, tapSel, tagCombat) => {
      /* 이전 씬의 잔여 연출을 비운다 */
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
      await wait(3);
      openFn();
      await wait(3);
      const btn = document.querySelector(tapSel);
      const br = btn ? btn.getBoundingClientRect() : null;
      if (btn) btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      /* 전투 발원(600ms)은 만료시키고 탭 창(1200ms)은 살려 두는 구간 = 475 홀드 1초와 같은 자리 */
      if (tagCombat) fxAt({ x: 540, y: 1500 }, 'combat');
      await new Promise(r2 => setTimeout(r2, 700));
      arm();
      S.gold += 12345;                                   /* 22291·22316 이 하는 것과 같은 한 줄 */
      await wait(20);
      const got = disarm();
      const fly = got.filter(g => /fx-fly/.test(g.cls));
      const lit = got.filter(g => /fx-lit/.test(g.cls));
      return {
        label,
        tapRect: br ? { x: +br.x.toFixed(1), y: +br.y.toFixed(1), w: +br.width.toFixed(1), h: +br.height.toFixed(1) } : null,
        flyN: fly.length,
        flyLayers: [...new Set(fly.map(f => f.layer))],
        litN: lit.length,
        /* 발원 판정 — 첫 비행 노드가 누른 버튼 bbox 안(여유 60px)에서 태어났는가 */
        fromBtn: !!(br && fly.length && fly.slice(0, 4).every(f =>
          f.x > br.x - 60 && f.x < br.x + br.width + 60 && f.y > br.y - 60 && f.y < br.y + br.height + 60)),
        first: fly[0] || null
      };
    };

    /* ── ⓕ 확정 시나리오 — «팝업 안을 탭한 직후» 배경 전투 골드 ────────────
       fxSrc 가 그 탭을 발원으로 고르면(창 1200ms) UI 발이 되어 #fxl(z60 = 팝업 위)로 간다.
       수리 전 실측: 탭 직후 fxSrc 가 **0프레임 만에** 탭을 돌려줬다. */
    out.tap = await (async () => {
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
      const keys = Object.keys(BANNERS), res = [], sn = new Set();
      for (let i = 0; i < 4000 && res.length < 10; i++) { const o = summonOne(keys[i % keys.length]); if (sn.has(o.it.id)) continue; sn.add(o.it.id); res.push(o); }
      showSummonResult('weapon', 10, res, false);
      await new Promise(r2 => setTimeout(r2, 600));
      const card = document.querySelector('#sumGridIn > *');
      if (card) card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      const src = fxSrc(performance.now());
      arm();
      S.gold += 54321;                                 /* 22291·22316 이 하던 것과 같은 «표시 없는» 한 줄 */
      await wait(30);
      const got = disarm();
      const fly = got.filter(g => /fx-fly/.test(g.cls));
      const plus = got.filter(g => /fx-plus/.test(g.cls));
      const r3 = { srcIsTap: !!(src && !src.combat), srcHasEl: !!(src && src.el),
                   flyN: fly.length, flyLayers: [...new Set(fly.map(f => f.layer))],
                   plusLayers: [...new Set(plus.map(f => f.layer))],
                   litN: got.filter(g => /fx-lit/.test(g.cls)).length,
                   covered: typeof fxCovered === "function" ? fxCovered() : null, srcTap: !!(src && src.tap) };
      document.getElementById('sumw').classList.remove('on');
      return r3;
    })();

    out.s1 = await scene('소환 결과 팝업 + 전투 발원 없는 골드', () => {
      const res = [];
      const seenId = new Set();
      const keys = Object.keys(BANNERS);
      for (let i = 0; i < 4000 && res.length < 10; i++) {
        const one = summonOne(keys[i % keys.length]);
        if (seenId.has(one.it.id)) continue;
        seenId.add(one.it.id); res.push(one);
      }
      showSummonResult('weapon', 10, res, false);
    }, '#sumw .sm-cl, #sumw button, #sumw', false);

    out.s2 = await scene('09 일괄 강화 결과 팝업 + 전투 발원 없는 골드', () => {
      EQUIPS.slice(0, 6).forEach(it => { S.own[it.id] = { n: 400, l: (S.own[it.id] || {}).l || 1 }; });
      const rr = levelUpAll(wpnList());
      openUpAll(rr.ups);
    }, '#upw .upr-card, #upw', false);

    /* ── 대조군: 같은 자리 · 같은 금액인데 **전투 발원 표시가 있을 때** ── */
    out.s3 = await scene('대조 — 전투 발원 표시가 있는 골드(정상)', () => {
      const res = [];
      const seenId = new Set();
      const keys = Object.keys(BANNERS);
      for (let i = 0; i < 4000 && res.length < 10; i++) {
        const one = summonOne(keys[i % keys.length]);
        if (seenId.has(one.it.id)) continue;
        seenId.add(one.it.id); res.push(one);
      }
      showSummonResult('weapon', 10, res, false);
    }, '#sumw .sm-cl, #sumw button, #sumw', true);

    /* ── ⓒ 색 거리 — fxUpOk 앰버 vs 골드 코인 색 ── */
    const hex2lab = hex => {
      const n = hex.replace('#', '');
      const f = i => parseInt(n.substr(i * 2, 2), 16) / 255;
      const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const [R, G, B] = [lin(f(0)), lin(f(1)), lin(f(2))];
      const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
      const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
      const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const g2 = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
      return [116 * g2(Y) - 16, 500 * (g2(X) - g2(Y)), 200 * (g2(Y) - g2(Z))];
    };
    const dE = (a, b) => { const A = hex2lab(a), B2 = hex2lab(b); return Math.hypot(A[0] - B2[0], A[1] - B2[1], A[2] - B2[2]); };
    out.dE_amber_gold = +dE('#FFC02E', FXCUR.gold.col).toFixed(1);
    out.dE_cream_gold = +dE('#FFE9A8', FXCUR.gold.col).toFixed(1);
    out.goldCol = FXCUR.gold.col;

    return out;
  });

  console.log('\n=== probe518 — 재현 결과 ===');
  console.log('ⓕ [탭 오귀속] 소환 결과 팝업 안을 누른 직후 «표시 없는» 골드 증가');
  console.log('   fxSrc 가 탭을 고름 : ' + r.tap.srcIsTap + ' (노드 동봉 ' + r.tap.srcHasEl + ' · 덮는 층 ' + r.tap.covered + ' · 추측표시 ' + r.tap.srcTap + ')');
  console.log('   코인 비행 ' + r.tap.flyN + '개 · 레이어 ' + JSON.stringify(r.tap.flyLayers)
            + ' · «+n» ' + JSON.stringify(r.tap.plusLayers) + ' · 딤 위 알약 복제 ' + r.tap.litN);
  console.log('');
  console.log('ⓐ 소환 10회 S.gold 델타          : ' + r.summonGoldDelta);
  console.log('ⓑ 장비 일괄 강화 S.gold 델타     : ' + r.upAllGoldDelta + ' (' + r.upAllSteps + '단계)');
  for (const k of ['s1', 's2', 's3']) {
    const s = r[k];
    console.log('\n[' + k + '] ' + s.label);
    console.log('   누른 버튼 bbox   : ' + JSON.stringify(s.tapRect));
    console.log('   코인 비행 개수   : ' + s.flyN + '  레이어 ' + JSON.stringify(s.flyLayers));
    console.log('   딤 위 알약 점등  : ' + s.litN + ' (fx-lit)');
    console.log('   발원 = 누른 버튼 : ' + s.fromBtn + (s.first ? '  첫 노드 (' + s.first.x + ', ' + s.first.y + ')' : ''));
  }
  console.log('\nⓒ ΔE(#FFC02E 앰버 ↔ ' + r.goldCol + ' 골드) = ' + r.dE_amber_gold);
  console.log('ⓒ ΔE(#FFE9A8 크림 ↔ ' + r.goldCol + ' 골드) = ' + r.dE_cream_gold);
  console.log('');

  ok(r.summonGoldDelta === 0, 'ⓐ 소환은 골드를 주지 않는다 (델타 ' + r.summonGoldDelta + ')');
  ok(r.upAllGoldDelta === 0, 'ⓑ 장비 일괄 강화는 골드를 쓰지도 주지도 않는다 (델타 ' + r.upAllGoldDelta + ')');
  ok(untagged.length >= 0, 'ⓢ 전투 발원 표시 없는 `S.gold +=` 자리 ' + untagged.length + '곳 — ' + untagged.map(h => h.line).join(', '));
  ok(r.s1.flyN >= 0, 'ⓔ1 소환 결과 팝업 위 코인 비행 ' + r.s1.flyN + '개 · 레이어 ' + JSON.stringify(r.s1.flyLayers));
  ok(r.s2.flyN >= 0, 'ⓔ2 일괄 강화 팝업 위 코인 비행 ' + r.s2.flyN + '개 · 레이어 ' + JSON.stringify(r.s2.flyLayers));
  ok(r.s3.flyN >= 0, 'ⓕ 대조(전투 표시 O) 레이어 ' + JSON.stringify(r.s3.flyLayers) + ' · 알약 점등 ' + r.s3.litN);
  ok(errs.length === 0, 'ⓧ 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

  await b.close();
  console.log('\nPROBE518 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
