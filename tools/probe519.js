#!/usr/bin/env node
/* 작업 519 — 「단련할 것이 없는데 단련 탭에 레드닷이 뜬다」 **재현**(338 규칙 — 고치기 전에 먼저 묻는다).
 *
 *   node tools/probe519.js
 *
 * 등재문은 뿌리를 둘로 적었다. 둘은 «판정» 과 «그리기» 로 층이 달라서 **하나만 고치면 안 낫는다**:
 *   ⓑ 판정식 `temperAlert()` 의 첫 항 — `TEMPER_PT_COST = 1` 이라 사실상 «단련석 1개라도 있는가».
 *      전환해 봐야 `temperUpOk` 를 만족하는 축이 하나도 없으면 누를 것이 없다.
 *   ⓓ 166 특이성 함정 — `#trw i,#trw em,#trw b,#trw u,#trw s{display:inline-block}`(ID 급 1,0,1) 이
 *      `.stab>.bdg{display:none}`(0,2,0) 을 이기면 `.alert` 와 **무관하게 상시 점등**이다.
 *      (166 ⓔ · 202 §3 · 283 · 294 에서 이미 네 번 난 계열이다.)
 *
 * 그래서 이 프로브는 «식» 과 «찍힌 픽셀» 을 따로 잰다 —
 *   [A] CSSOM 으로 `<s class="bdg">` 에 이기는 `display` 규칙이 무엇인지 직접 고른다.
 *   [B] `.alert` 를 **강제로 뗀** 상태에서 닷이 실제로 그려지는가(픽셀이 아니라 computed display + rect).
 *   [C] 상태 표 — (단련석, 포인트, 최소 비용) 조합마다 «올릴 수 있는 축» 과 현행 판정을 맞대 본다.
 *   [D] 룬·훈련 칸에는 배지 노드 자체가 없는가(300 회귀 — 룬을 되살리면 안 된다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const p = n => Math.round(n * 100) / 100;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};

    /* ── 상태를 «단련할 게 없는» 자리로 만든다: 단련석 1개 · 포인트 0 · 최소 비용 1구간 ── */
    S.tstone = 1;
    S.temper = { pts: 0, alloc: {} };
    openTrain(); setTrSub('temper'); renderRunes(); renderTrain();

    const tab = document.querySelector('#trSubs [data-trsub="temper"]');
    const bdg = tab && tab.querySelector('s.bdg');

    /* ── [A] CSSOM: `<s class="bdg">` 에 걸리는 display 규칙 전수 ──
       464 함정 ① — 평범한 CSSStyleRule 에도 빈 cssRules 가 달려 있다. `type` 으로 가른다.
       그리고 @media/@supports 안에 든 규칙은 최상위 목록에 없다 — 그룹 규칙만 내려간다. */
    const spec = sel => {           /* 대략적인 (a,b,c) — ID / 클래스·속성·의사클래스 / 타입 */
      const s = sel.trim();
      const a = (s.match(/#[\w-]+/g) || []).length;
      const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
      const c = (s.replace(/[#.][\w-]+|\[[^\]]+\]|:{1,2}[\w-]+/g, '').match(/[a-zA-Z][\w-]*/g) || []).length;
      return [a, b, c];
    };
    const cmp = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);
    const rules = [];
    const walk = list => {
      if (!list) return;
      for (const r of list) {
        if (r.type === 1 && r.selectorText) {
          if (!/(^|;|\s)display\s*:/.test(r.style.cssText || '')) continue;
          for (const sel of r.selectorText.split(',')) {
            let hit = false;
            try { hit = !!(bdg && bdg.matches(sel.trim())); } catch (e) {}
            if (hit) rules.push({ sel: sel.trim(), full: r.selectorText, disp: r.style.display, sp: spec(sel) });
          }
        } else if (r.cssRules && (r.type === 4 || r.type === 12 || r.type === 5)) {
          walk(r.cssRules);       /* @media(4) · @supports(12) · @font-face(5, 무해) */
        }
      }
    };
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      walk(rs);
    }
    /* 캐스케이드 승자 — 같은 특이성이면 «나중에 선언된 것» 이 이긴다(선언 순 = rules 순) */
    let winner = null;
    rules.forEach(r => { if (!winner || cmp(r.sp, winner.sp) >= 0) winner = r; });

    /* ── [B] `.alert` 를 강제로 뗀 상태에서도 닷이 보이는가 ──
       ⚠ 325 함정 — 등장 애니메이션(`jzDotIn` scale 0 시작)이 rect 를 0 으로 만든다. 잠깐 끄고 잰다. */
    const seen = () => {
      const prevA = bdg.style.animation;
      bdg.style.animation = 'none';
      const cs = getComputedStyle(bdg), r = bdg.getBoundingClientRect();
      const out = { display: cs.display, vis: cs.visibility, opacity: +cs.opacity,
                    w: p(r.width), h: p(r.height), area: p(r.width * r.height) };
      bdg.style.animation = prevA;
      return out;
    };
    const withAlert = (on) => { tab.classList.toggle('alert', on); return seen(); };
    const offAlert = withAlert(false);
    const onAlert  = withAlert(true);

    /* ── [B-R] 되돌림 — 519 가 놓은 «같은 급 짝» 두 줄을 실제로 걷어내고 다시 잰다.
       이것이 수리 전 트리다. 걷으면 `#trw s`(1,0,1) 가 다시 이겨 «상시 점등» 으로 돌아가야 한다. */
    const killed = [];
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (let i = rs.length - 1; i >= 0; i--) {
        const r = rs[i];
        if (r.type === 1 && /^#trw \.stab(\.alert)?\s*>\s*\.bdg$/.test((r.selectorText || '').trim())) {
          killed.push({ sh, i, text: r.cssText });
          sh.deleteRule(i);
        }
      }
    }
    const revertOff = (tab.classList.remove('alert'), seen());
    killed.reverse().forEach(k => k.sh.insertRule(k.text, k.i));
    const restoredOff = (tab.classList.remove('alert'), seen());

    /* ── [C] 상태 표 ── */
    const minCost = () => Math.min(...TEMPERS.map(t => temperCost(t.k)));
    /* 수리 전 식(519 등재문 ⓑ 가 인용한 그대로) — 표에서 «옛 판정» 칸으로 나란히 세운다 */
    const oldAlert = () => (Math.floor(S.tstone) || 0) >= TEMPER_PT_COST
                        || TEMPERS.some(t => temperUpOk(t.k));
    /* 전환까지 합쳐서 «실제로 올릴 수 있는 축이 있는가» (등재문 권장식과 같은 뜻) */
    const trulyAny = () => {
      const pts = temperPts() + Math.floor((Math.floor(S.tstone) || 0) / TEMPER_PT_COST);
      return TEMPERS.some(t => pts >= temperCost(t.k));
    };
    const table = [];
    const cases = [
      { n: '① 단련석 0 · 포인트 0',                    ts: 0,  pts: 0,  alloc: {} },
      { n: '② 단련석 1 · 포인트 0 (최소 비용 1)',       ts: 1,  pts: 0,  alloc: {} },
      { n: '③ 단련석 0 · 포인트 1 (최소 비용 1)',       ts: 0,  pts: 1,  alloc: {} },
      /* 세 축을 전부 100 레벨까지 올려 구간을 1 → 2 로 밀면 다음 1레벨이 3pt 다 */
      { n: '④ 단련석 1 · 포인트 0 · 모든 축 Lv100(비용 3)', ts: 1, pts: 0, alloc: { atk: 100, hp: 100, regen: 100 } },
      { n: '⑤ 단련석 2 · 포인트 1 · 모든 축 Lv100(비용 3)', ts: 2, pts: 1, alloc: { atk: 100, hp: 100, regen: 100 } },
      { n: '⑥ 단련석 3 · 포인트 0 · 모든 축 Lv100(비용 3)', ts: 3, pts: 0, alloc: { atk: 100, hp: 100, regen: 100 } }
    ];
    for (const c of cases) {
      S.tstone = c.ts; S.temper = { pts: c.pts, alloc: c.alloc };
      table.push({ n: c.n, ts: c.ts, pts: temperPts(), minCost: minCost(),
                   now: !!temperAlert(), old: !!oldAlert(), truly: trulyAny() });
    }

    /* ── [D] 룬·훈련 칸의 배지 노드 ── */
    const nodes = {};
    ['train', 'rune', 'temper'].forEach(k => {
      const el = document.querySelector('#trSubs [data-trsub="' + k + '"]');
      nodes[k] = el ? el.querySelectorAll('s.bdg').length : -1;
    });

    return { rules, winner, offAlert, onAlert, revertOff, restoredOff, table, nodes, hasNode: !!bdg };
  });

  console.log('\n[A] `<s class="bdg">` 에 걸리는 display 규칙 (선언 순 · 특이성)');
  m.rules.forEach(r => console.log('     (' + r.sp.join(',') + ')  ' + r.sel + '  →  display:' + r.disp));
  console.log('     ⇒ 캐스케이드 승자: (' + m.winner.sp.join(',') + ') ' + m.winner.sel
            + '  →  display:' + m.winner.disp);
  ok(m.hasNode, '단련 서브탭에 배지 노드 `s.bdg` 가 있다');
  const idRule = m.rules.find(r => /#trw/.test(r.sel));
  ok(!!idRule, '[A1] ID 급 규칙(`#trw … s`)이 이 노드에 걸린다 = 특이성 함정의 **재료가 아직 있다**',
     idRule ? idRule.sel + ' → ' + idRule.disp : '없음');
  ok(m.winner && /^#trw \.stab\.alert/.test(m.winner.sel),
     '[A2] 그 재료를 «같은 급 짝»(519)이 이긴다 — 캐스케이드 승자가 `.alert` 를 묻는 규칙이다',
     '승자 (' + m.winner.sp.join(',') + ') ' + m.winner.sel);

  console.log('\n[B] `.alert` 유무별 computed display / rect (325 함정 — 등장 애니메이션은 끄고 잰다)');
  console.log('     .alert 없음 : ' + JSON.stringify(m.offAlert));
  console.log('     .alert 있음 : ' + JSON.stringify(m.onAlert));
  ok(m.offAlert.display === 'none' && m.offAlert.area === 0,
     '[B1] `.alert` 가 없으면 닷이 **안 그려진다**(166 규약)',
     'display=' + m.offAlert.display + ' · ' + m.offAlert.w + '×' + m.offAlert.h);
  ok(m.onAlert.display !== 'none' && m.onAlert.area > 0,
     '[B2] `.alert` 가 있으면 그려진다', m.onAlert.w + '×' + m.onAlert.h);

  console.log('\n[B-R] 되돌림 — 519 의 두 줄을 걷어낸 사본(= 수리 전 트리)');
  console.log('     걷어낸 뒤(.alert 없음) : ' + JSON.stringify(m.revertOff));
  console.log('     되돌린 뒤(.alert 없음) : ' + JSON.stringify(m.restoredOff));
  ok(m.revertOff.display !== 'none' && m.revertOff.area > 0,
     '[B-R1] **가설 ⓓ 재현** — 두 줄을 걷으면 `.alert` 없이도 닷이 그려진다(상시 점등)',
     'display=' + m.revertOff.display + ' · ' + m.revertOff.w + '×' + m.revertOff.h);
  ok(m.restoredOff.display === 'none' && m.restoredOff.area === 0,
     '[B-R2] 되돌리면 다시 꺼진다(사본이 트리를 오염시키지 않았다)');

  console.log('\n[C] 상태 표 — 「옛 판정」 · 「현행 판정」 vs 「실제로 올릴 수 있는 축이 있는가」');
  console.log('     ' + ['케이스', 'tstone', 'pts', '최소비용', '옛 판정', '현행', '전환후가능'].join(' | '));
  let mismatch = 0, oldMismatch = 0;
  m.table.forEach(r => {
    if (r.now !== r.truly) mismatch++;
    const bad = r.old !== r.truly;
    if (bad) oldMismatch++;
    console.log('     ' + (bad ? '✗ ' : '  ') + [r.n, r.ts, r.pts, r.minCost,
      r.old ? '점등' : '소등', r.now ? '점등' : '소등', r.truly ? '가능' : '없음'].join(' | '));
  });
  const c2 = m.table[1];
  ok(c2.now === true && c2.truly === true,
     '[C1] 음성 대조 — 「단련석 1 · 비용 1」 은 전환하면 실제로 올릴 수 있으므로 점등이 옳다',
     '현행=' + (c2.now ? '점등' : '소등'));
  const c4 = m.table[3];
  ok(c4.old === true && c4.now === false && c4.truly === false,
     '[C2] **주인이 본 자리 재현** — 「단련석 1 · 최소 비용 3」: 옛 식 점등 → 현행 소등',
     '옛=' + (c4.old ? '점등' : '소등') + ' · 현행=' + (c4.now ? '점등' : '소등'));
  const c6 = m.table[5];
  ok(c6.now === true && c6.truly === true, '[C3] 음성 대조 — 「단련석 3 · 비용 3」 은 점등이 옳다');
  ok(mismatch === 0, '[C4] 현행 판정이 「올릴 수 있는 축 존재」와 **완전 일치**', mismatch + '건 어긋남');
  console.log('     → 옛 식이 어긋나던 칸: ' + oldMismatch + ' / ' + m.table.length
            + ' · 현행: ' + mismatch + ' / ' + m.table.length);

  console.log('\n[D] 서브탭별 배지 노드 수 (300 — 룬은 대상 아님)');
  console.log('     ' + JSON.stringify(m.nodes));
  ok(m.nodes.rune === 0, '[D1] 룬 칸에 배지 노드 없음(300 회귀 기준선)');
  ok(m.nodes.train === 0, '[D2] 훈련 칸에 배지 노드 없음');

  ok(errs.length === 0, '콘솔 에러 0건', errs.slice(0, 3).join(' / '));

  await browser.close();
  console.log('\nprobe519: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
