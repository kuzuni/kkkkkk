#!/usr/bin/env node
/* 작업 488 게이트 — «꾹 누르는 동안 회당 피드백» (2026-08-30, 저장소 주인 지시)
 *
 *   node tools/verify488.js
 *
 * 지시 ④ 가 완료 조건을 «시도마다 보이는 사건 ≥ 1» 로 못 박았으므로, 이 자는 그 등식을 **정확히**
 * 센다(«≥1» 이 아니라 «= 시도 수»). 세는 법은 둘을 맞대는 것이다:
 *   ⓐ 부품 호출 수 — `hbPulse`/`hbFloat` 를 감싸 호출·반환값을 센다(반환 false = FXMAX 로 떨어진 것)
 *   ⓑ 실제 DOM   — `#fxl` 에 붙은 `.fx-plus.hb` 노드 수 · 호스트에 붙은 `jz-hb`/`jz-hbx` 토글 수
 * 둘이 어긋나면 «불렀는데 안 보인다» 이므로 그 자체가 결함이다.
 *
 * ⚠ 첫 발은 자리마다 다르고, 그것이 **설계**다:
 *     룬·단련  — `rtHoldStart` 가 `once()` 를 먼저 부르므로 첫 발도 회당 피드백을 받는다 ⇒ beat = 시도
 *     세부팝업·유물·훈련 — 첫 발은 `fxUpOk`(플래시+파티클+델타) 한 세트가 이미 «보이는 사건» 이라
 *                          회당 맥박을 겹쳐 걸지 않는다 ⇒ beat = 시도 − 1
 *   이 자는 그 차이를 **문서화된 상수**로 단언한다(두루뭉술하게 «≥» 로 덮으면 규약이 사라진다).
 *
 * ⚠ 게임 루프는 **돌린 채로** 잰다(349 교훈 — 루프를 세운 게이트는 실기기와 다른 것을 재고 초록이었다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = process.env.V488_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const HOLD = Number(process.env.V488_HOLD || 2200);
/* 제품 상수 `HB_SLOT_W`(플로터 칸 간격)의 사본 — [H3] 이 «잉크 폭 < 칸 간격» 을 이 값으로 판정한다 */
const HB_SLOT_W_JS = 80;

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(p);

  /* ── 계측기 ───────────────────────────────────────────────────────── */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
    window.__C = { pulse: [], float: [], node: [], toast: 0, cls: [] };
    let __n = 0; const __ids = new WeakMap();
    window.__id = el => { if (!__ids.has(el)) __ids.set(el, ++__n); return __ids.get(el); };
    const oP = window.hbPulse, oF = window.hbFloat;
    window.hbPulse = function (h, okv) { const r = oP.apply(this, arguments); window.__C.pulse.push({ ok: !!okv, r: !!r }); return r; };
    window.hbFloat = function (h, txt, kind) { const r = oF.apply(this, arguments); window.__C.float.push({ txt, kind, r: !!r }); return r; };
    const L = document.getElementById('fxl');
    new MutationObserver(recs => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        const c = (n.className || '') + '';
        if (/\bfx-toast\b/.test(c)) { window.__C.toast++; window.__C.toastTxt = (window.__C.toastTxt || []); window.__C.toastTxt.push((n.textContent || '').slice(0, 40)); }
        if (/\bfx-plus\b/.test(c) && /\bhb\b/.test(c)) {
          window.__C.node.push({ dn: /\bdn\b/.test(c), col: n.style.color, txt: n.textContent });
        }
      }
    }).observe(L, { childList: true, subtree: true });
    /* 호스트 클래스 토글(jz-hb / jz-hbx) — 노드가 재렌더로 떨어져도 세지도록 **기록 시점**에 판정한다.
       ⚠ 함정 — `jzOn` 은 «remove → 리플로우 → add» 로 같은 애니메이션을 재시작한다(35184).
         그 왕복이 **한 배치 안에 두 레코드**로 들어오고, 콜백 시점의 `className` 은 둘 다 «붙은 뒤» 라
         제 눈에는 «두 번 걸린 것» 으로 보인다(1회차에 부품 호출 19 인데 이 자만 21 을 셌다).
         한 배치·한 노드·한 클래스는 **한 번의 걸림**이다 — 비트 간격은 최소 60ms 라 두 비트가
         같은 배치에 들어올 수 없으므로 이 접기는 참 사건을 지우지 않는다. */
    new MutationObserver(recs => {
      const seen = new Set();
      for (const r of recs) {
        const el = r.target, now = (el.className || '') + '', was = r.oldValue || '';
        for (const c of ['jz-hb', 'jz-hbx']) {
          const key = c + '\u0000' + (window.__id(el));
          if (seen.has(key)) continue;
          if (new RegExp('(^| )' + c + '( |$)').test(now) && !new RegExp('(^| )' + c + '( |$)').test(was)) {
            seen.add(key);
            window.__C.cls.push({ c, host: (el.className || '').split(/\s+/)[0] || el.id });
          }
        }
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
  });

  const reset = () => p.evaluate(() => { window.__C = { pulse: [], float: [], node: [], toast: 0, cls: [] }; window.__T = 0; });
  const grab = () => p.evaluate(() => {
    const C = window.__C;
    return {
      pulse: C.pulse.length, pulseOk: C.pulse.filter(x => x.ok).length, pulseNo: C.pulse.filter(x => !x.ok).length,
      pulseDrop: C.pulse.filter(x => !x.r).length,
      float: C.float.length, floatDrop: C.float.filter(x => !x.r).length,
      fOk: C.float.filter(x => x.kind === 'ok').length,
      fNo: C.float.filter(x => x.kind === 'no').length,
      fPay: C.float.filter(x => x.kind === 'pay').length,
      node: C.node.length, nodeDn: C.node.filter(x => x.dn).length,
      cols: [...new Set(C.node.map(x => x.col))],
      txts: [...new Set(C.node.map(x => x.txt))].slice(0, 6),
      hb: C.cls.filter(x => x.c === 'jz-hb').length, hbx: C.cls.filter(x => x.c === 'jz-hbx').length,
      toast: C.toast, toastTxt: C.toastTxt || [], tries: window.__T || 0
    };
  });

  /* 토스트는 «몇 장 떴나» 가 아니라 «이 홀드의 정산 한 장이 있나» 로 센다 —
     전체 개수는 다른 계통(훈련 단계 상승·가이드 미션 등)의 토스트가 같은 창에 섞여 흔들린다
     (1회차에 [R3] 이 그 이유로 2~3 을 오갔다). */
  const sumT = (g, re) => (g.toastTxt || []).filter(t => re.test(t)).length;
  const box = async sel => {
    try { await p.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 4000 }); } catch (_) {}
    const bb = await p.locator(sel).first().boundingBox({ timeout: 4000 }).catch(() => null);
    return bb && bb.width ? { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 } : null;
  };
  const holdTouch = async (c, ms) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(200);
  };
  /* 시도 수는 각 자리가 실제로 부르는 «1회» 함수를 감싸 센다 */
  const countTries = fn => p.evaluate(name => {
    if (window['__o_' + name]) window[name] = window['__o_' + name];
    const o = window[name]; window['__o_' + name] = o;
    window.__T = 0;
    window[name] = function () { const r = o.apply(this, arguments); window.__T++; return r; };
  }, fn);

  /* ══ [A] 부품이 실재하는가 ═══════════════════════════════════════════ */
  console.log('[A] 공용 부품 · CSS 규칙');
  const A = await p.evaluate(() => {
    const rules = [];
    for (const ss of document.styleSheets) {
      let rs; try { rs = ss.cssRules; } catch (_) { continue; }
      for (const r of rs) if (r.selectorText) rules.push(r.selectorText);
      for (const r of rs) if (r.type === 7 /* keyframes */) rules.push('@kf ' + r.name);
    }
    const card = document.querySelector('.tr-rn') || document.createElement('div');
    return {
      fns: ['hbBeat', 'hbPulse', 'hbFloat'].filter(f => typeof window[f] === 'function'),
      hasHb: rules.some(s => /(^|,|\s)\.jz-hb(\s|,|$)/.test(s)),
      hasHbx: rules.some(s => /\.jz-hbx/.test(s)),
      hasFloat: rules.some(s => /\.fx-plus\.hb/.test(s)),
      hasDn: rules.some(s => /\.fx-plus\.hb\.dn/.test(s)),
      kf: ['jzHb', 'jzHbx', 'fxHb', 'fxHbDn'].filter(k => rules.includes('@kf ' + k))
    };
  });
  ok(A.fns.length === 3, '[A1] 공용 부품 3개가 선언돼 있다(hbBeat·hbPulse·hbFloat)', A.fns.join(','));
  ok(A.hasHb && A.hasHbx, '[A2] 호스트 맥박 CSS 두 갈래(.jz-hb 성공 · .jz-hbx 실패)', A.hasHb + '·' + A.hasHbx);
  ok(A.hasFloat && A.hasDn, '[A3] 플로터 CSS(.fx-plus.hb)와 «아래로 지는» 비용 갈래(.dn)', A.hasFloat + '·' + A.hasDn);
  ok(A.kf.length === 4, '[A4] 키프레임 4종이 실재한다', A.kf.join(','));

  /* ══ [B] 룬 홀드 — 전부 성공 / 전부 실패 두 축 ═════════════════════ */
  const runeSetup = (rate) => p.evaluate(r => {
    ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult', 'closeRelw']
      .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
    if (!window.__rate0) window.__rate0 = runeRate;
    runeRate = () => r;
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12; S.dia = 1e12; S.gold = 1e15;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  }, rate);

  console.log('[B] 룬 [강화] 홀드 — 회당 피드백 (홀드 ' + HOLD + 'ms · 게임 루프 ON)');
  await runeSetup(1); await p.waitForTimeout(450);
  await countTries('runeBuy'); await reset();
  await holdTouch(await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1'   /* 490 — 결제 갈래가 하나라 버튼도 하나 */), HOLD);
  const B1 = await grab();
  console.log('  · 전부 성공 — pulse호출 ' + B1.pulse + ' · 시도 ' + B1.tries + ' · 맥박 ' + B1.hb + '/' + B1.hbx + ' · 플로터 ' + B1.node + ' (비용 ' + B1.nodeDn + ') · 토스트 ' + B1.toast + ' · 문구 ' + B1.txts.join(','));
  ok(B1.tries >= 8, '[B1] 홀드가 실제로 여러 번 시도한다(전제)', B1.tries + '회');
  ok(B1.hb === B1.tries, '[B2] ★ 성공 맥박(jz-hb) 수 = 시도 수', B1.hb + ' / ' + B1.tries);
  ok(B1.hbx === 0, '[B3] 전부 성공이면 실패 흔들림(jz-hbx)은 0건이다', B1.hbx + '건');
  ok(B1.fOk === B1.tries && B1.fNo === 0, '[B4] ★ 결과 플로터 «+1 Lv» 수 = 시도 수 · 실패 플로터 0', B1.fOk + '/' + B1.tries + ' · no ' + B1.fNo);
  ok(B1.fPay === B1.tries, '[B5] ★ 비용 «−n» 플로터 수 = 시도 수', B1.fPay + ' / ' + B1.tries);
  ok(B1.node === B1.fOk + B1.fNo + B1.fPay, '[B6] 부른 만큼 실제 DOM 노드가 붙었다(FXMAX 로 떨어진 것 0)', B1.node + ' 노드');
  ok(B1.floatDrop === 0 && B1.pulseDrop === 0, '[B7] 홀드 내내 FXMAX·호스트 유실이 0건이다', 'float ' + B1.floatDrop + ' · pulse ' + B1.pulseDrop);
  ok(B1.nodeDn === B1.fPay, '[B8] 비용 플로터만 «아래로»(.dn) 진다 — 58 결제 어휘', B1.nodeDn + '/' + B1.fPay);
  ok(sumT(B1, /회 시도 · 성공/) === 1, '[B9] ★ 룬 정산 토스트는 손 뗀 뒤 «요약 한 장» 뿐이다(206 규약 유지)',
     sumT(B1, /회 시도 · 성공/) + '장 / 전체 ' + B1.toast);
  ok(B1.txts.includes('+1 Lv'), '[B10] 성공 문구가 «+1 Lv» 다', B1.txts.join(','));

  await runeSetup(0); await p.waitForTimeout(450);
  await countTries('runeBuy'); await reset();
  await holdTouch(await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1'   /* 490 — 결제 갈래가 하나라 버튼도 하나 */), HOLD);
  const B2 = await grab();
  console.log('  · 전부 실패 — 시도 ' + B2.tries + ' · 맥박 ' + B2.hb + '/' + B2.hbx + ' · 플로터 ' + B2.node + ' · 색 ' + B2.cols.join(','));
  ok(B2.hbx === B2.tries && B2.hb === 0, '[B11] ★ 전부 실패면 흔들림(jz-hbx) 수 = 시도 수 · 성공 팝 0', B2.hbx + '/' + B2.tries + ' · hb ' + B2.hb);
  ok(B2.fNo === B2.tries && B2.fOk === 0, '[B12] ★ «실패» 플로터 수 = 시도 수', B2.fNo + '/' + B2.tries);
  ok(B2.fPay === B2.tries, '[B13] 실패해도 재화는 나갔으므로 «−n» 은 그대로 시도 수', B2.fPay + '/' + B2.tries);
  ok(B2.txts.includes('실패'), '[B14] 실패 문구가 «실패» 다', B2.txts.join(','));
  ok(B2.cols.includes('rgb(176, 27, 46)'), '[B15] 실패 색이 빨강 #B01B2E 다(성공 초록과 갈린다)', B2.cols.join(','));
  ok(B1.cols.includes('rgb(46, 125, 20)'), '[B16] 성공 색이 초록 #2E7D14 다', B1.cols.join(','));
  ok(B1.cols.includes('rgb(122, 58, 16)') && B2.cols.includes('rgb(122, 58, 16)'), '[B17] 비용 색은 성공·실패 무관하게 갈색 #7A3A10 하나다', B1.cols.join(','));
  ok(sumT(B2, /회 시도 · 성공/) === 1, '[B18] 전부 실패해도 정산 토스트는 요약 한 장',
     sumT(B2, /회 시도 · 성공/) + '장 / 전체 ' + B2.toast);

  /* ══ [C] 단련 투자 홀드 ═════════════════════════════════════════════ */
  console.log('[C] 단련 [투자] 홀드 — 같은 부품 · 확정 처리라 실패 갈래 없음');
  await p.evaluate(() => {
    if (window.__rate0) runeRate = window.__rate0;
    S.tstone = 1e12; openTrain(); setTrSub('temper'); renderTrain();
    try { temperCharge(1e9); } catch (_) {}
    renderTrain();
  });
  await p.waitForTimeout(450);
  await countTries('temperUpBtn'); await reset();
  const cC = await box('#trTemper .tr-tp[data-temper] .tb');
  if (cC) await holdTouch(cC, HOLD);
  const C = await grab();
  console.log('  · 시도 ' + C.tries + ' · 맥박 ' + C.hb + '/' + C.hbx + ' · 플로터 ' + C.node + ' · 토스트 ' + C.toast);
  ok(C.tries >= 8, '[C1] 단련 홀드가 여러 번 시도한다(전제)', C.tries + '회');
  ok(C.hb === C.tries && C.hbx === 0, '[C2] ★ 맥박 수 = 시도 수 · 확정 처리라 흔들림 0', C.hb + '/' + C.tries);
  ok(C.fOk === C.tries && C.fPay === C.tries, '[C3] ★ «+1 Lv» · «−n pt» 각각 시도 수', C.fOk + '·' + C.fPay + ' / ' + C.tries);
  ok(sumT(C, /단련/) === 1, '[C4] 단련 정산 토스트는 요약 한 장', sumT(C, /단련/) + '장 / 전체 ' + C.toast);

  /* ══ [D] 08 세부 팝업 [강화] 홀드(bindUpHold) ═══════════════════════ */
  console.log('[D] 08 세부 팝업 [강화] 홀드 — 첫 발은 fxUpOk 라 beat = 시도 − 1');
  await p.evaluate(() => {
    try { closeTrain(); closeModal(); } catch (_) {}
    const id = SKILLS[0].id;
    S.own[id] = { l: 1, n: 1e9 };
    showSkillDetail(id);
  });
  await p.waitForTimeout(400);
  await countTries('levelUp'); await reset();
  const cD = await box('#mLv');
  if (cD) await holdTouch(cD, HOLD);
  const D = await grab();
  console.log('  · 시도 ' + D.tries + ' · 맥박 ' + D.hb + ' · 플로터 ' + D.node + ' (비용 ' + D.nodeDn + ')');
  ok(D.tries >= 8, '[D1] 세부 팝업 홀드가 여러 번 시도한다(전제)', D.tries + '회');
  ok(D.hb === D.tries - 1, '[D2] ★ 맥박 수 = 시도 − 1 (첫 발은 fxUpOk 한 세트가 맡는다)', D.hb + ' / ' + (D.tries - 1));
  ok(D.fOk === D.tries - 1, '[D3] «+1 Lv» 수 = 시도 − 1', D.fOk + ' / ' + (D.tries - 1));
  ok(D.fPay === D.tries - 1 && D.nodeDn === D.fPay, '[D4] «−n 조각» 수 = 시도 − 1 · 전부 아래로 진다', D.fPay + ' / ' + (D.tries - 1));

  /* ══ [E] 89 유물 소환 홀드(rwHold) ═════════════════════════════════ */
  console.log('[E] 89 유물 소환 홀드 — 결과 문구는 격자 칸(fxUpOk)이 맡고 여기는 맥박 + 비용만');
  await p.evaluate(() => {
    try { closeModal(); closeTrain(); } catch (_) {}
    S.relic = 1e12; S.dia = 1e12;
    openRelw();
  });
  await p.waitForTimeout(500);
  await countTries('summonRelic'); await reset();
  const cE = await box('#rwBasin');
  if (cE) await holdTouch(cE, HOLD);
  const E = await grab();
  console.log('  · 시도 ' + E.tries + ' · 맥박 ' + E.hb + ' · 결과 플로터 ' + (E.fOk + E.fNo) + ' · 비용 ' + E.fPay);
  ok(E.tries >= 5, '[E1] 유물 홀드가 여러 번 시도한다(전제)', E.tries + '회');
  ok(E.hb === E.tries - 1, '[E2] ★ 맥박 수 = 시도 − 1', E.hb + ' / ' + (E.tries - 1));
  ok(E.fPay === E.tries - 1, '[E3] «−n» 수 = 시도 − 1', E.fPay + ' / ' + (E.tries - 1));
  ok(E.fOk === 0 && E.fNo === 0, '[E4] ★ 결과 문구는 안 띄운다 — 격자 칸의 «이름 Lv.n» 델타와 두 벌이 되면 안 된다', (E.fOk + E.fNo) + '건');

  /* ══ [F] 23 훈련 카드 홀드(64) ═════════════════════════════════════ */
  console.log('[F] 23 훈련 카드 홀드 — 64 의 «정지 시 정산» 은 그대로 두고 회당 맥박만 얹었다');
  await p.evaluate(() => {
    try { closeRelw(); } catch (_) {}
    S.gold = 1e18; openTrain(); setTrSub('train'); renderTrain();
  });
  await p.waitForTimeout(450);
  await countTries('trainBuy'); await reset();
  const cF = await box('#trCards [data-tr="atk"]');
  if (cF) await holdTouch(cF, HOLD);
  const F = await grab();
  console.log('  · 시도 ' + F.tries + ' · 맥박 ' + F.hb + ' · 플로터 ' + F.node + ' · 비용 ' + F.fPay);
  ok(F.tries >= 8, '[F1] 훈련 홀드가 여러 번 시도한다(전제)', F.tries + '회');
  ok(F.hb === F.tries - 1, '[F2] ★ 맥박 수 = 시도 − 1', F.hb + ' / ' + (F.tries - 1));
  ok(F.fPay === F.tries - 1, '[F3] 골드 «−n» 수 = 시도 − 1(HUD 알약 fxPay 는 종전 그대로 따로 돈다)', F.fPay + ' / ' + (F.tries - 1));
  ok(F.fOk === 0 && F.fNo === 0, '[F4] ★ 결과 문구는 안 띄운다 — `.cv` 상시 표기 · `fx-cvswap` · 정지 시 `fxUpOk` 델타와 세 벌이 된다', (F.fOk + F.fNo) + '건');
  ok(sumT(F, /훈련/) === 1, '[F5] 훈련 홀드에도 정산 요약 토스트가 한 장 뜬다(2회차 신설 — 세 씬 마무리 층 일치)', sumT(F, /훈련/) + '장 / 전체 ' + F.toast);

  /* ══ [G] 진폭 규약 — 큰 호스트는 1.02, 팝이 이웃을 안 침범한다 ═════ */
  console.log('[G] 맥박 진폭 — «큰 카드는 1.02» 가 실제로 이웃 밖으로 안 나가는가');
  const G = await p.evaluate(() => {
    const rd = el => { const cs = getComputedStyle(el); return parseFloat(cs.getPropertyValue('--hb-s')) || 1.06; };
    const out = {};
    const trw = document.getElementById('trw');
    openTrain(); setTrSub('rune'); renderTrain();
    const rn = document.querySelector('.tr-rn'), boxEl = document.querySelector('#trw .tr-box');
    out.rn = { s: rd(rn), w: rn.getBoundingClientRect().width, box: boxEl.getBoundingClientRect().width };
    setTrSub('temper'); renderTrain();
    const tps = [...document.querySelectorAll('.tr-tp')];
    out.tp = { s: tps[0] ? rd(tps[0]) : 0, h: tps[0] ? tps[0].getBoundingClientRect().height : 0,
               pitch: tps[1] ? tps[1].getBoundingClientRect().top - tps[0].getBoundingClientRect().top : 0 };
    setTrSub('train'); renderTrain();
    const cds = [...document.querySelectorAll('.tr-card')];
    out.cd = { s: cds[0] ? rd(cds[0]) : 0, w: cds[0] ? cds[0].getBoundingClientRect().width : 0,
               gap: cds[1] ? cds[1].getBoundingClientRect().left - cds[0].getBoundingClientRect().right : 0 };
    const lv = document.querySelector('.sk-lv');
    out.small = lv ? rd(lv) : rd(document.body);
    return out;
  });
  const grow = (w, s) => w * (s - 1) / 2;
  ok(G.rn.s === 1.02, '[G1] 룬 카드 진폭이 1.02 다', String(G.rn.s));
  ok(G.rn.w * G.rn.s <= G.rn.box, '[G2] ★ 룬 카드 팝(998×1.02)이 그릇 .tr-box 안폭을 안 넘는다',
     (G.rn.w * G.rn.s).toFixed(1) + ' ≤ ' + G.rn.box.toFixed(1));
  ok(G.tp.s === 1.02 && grow(G.tp.h, G.tp.s) * 2 < (G.tp.pitch - G.tp.h), '[G3] 단련 행 팝이 행 간 틈 안에 든다',
     '자람 ' + (grow(G.tp.h, G.tp.s) * 2).toFixed(1) + ' < 틈 ' + (G.tp.pitch - G.tp.h).toFixed(1));
  ok(G.cd.s === 1.02 && grow(G.cd.w, G.cd.s) * 2 < G.cd.gap, '[G4] 훈련 카드 팝이 이웃 카드와 안 겹친다',
     '자람 ' + (grow(G.cd.w, G.cd.s) * 2).toFixed(1) + ' < 틈 ' + G.cd.gap.toFixed(1));
  ok(Math.abs(G.small - 1.06) < 1e-6, '[G5] 작은 호스트는 지시 원문 그대로 1.06 이다', String(G.small));

  /* ══ [H] 겹침 — 회당 한 장씩 흐르는 플로터가 서로 안 뭉치는가 ══════ */
  console.log('[H] 동시 생존 플로터 — 겹친 쌍 (1회차에 15~16쌍이었다)');
  await p.evaluate(() => {
    if (window.__rate0) runeRate = window.__rate0;
    runeRate = () => 1;
    try { closeModal(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await p.waitForTimeout(450);
  const HTS = [700, 1400, 2200, 3000];
  const hb = await (async () => {
    const c = await box('#trRunes .tr-rn[data-rune="r1"] .rbt[data-pay="mat"]');
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); const rows = [];
    for (const t of HTS) {
      while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 5));
      rows.push(await p.evaluate(tt => {
        const rs = [...document.querySelectorAll('#fxl .fx-plus.hb')]
          .filter(n => parseFloat(getComputedStyle(n).opacity) > 0.08)
          .map(n => n.getBoundingClientRect());
        let ov = 0;
        for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i], b = rs[j];
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) ov++;
        }
        return { t: tt, n: rs.length, ov, w: rs.length ? Math.round(rs[0].width) : 0 };
      }, t));
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
    return rows;
  })();
  hb.forEach(r => console.log('  · t=' + String(r.t).padStart(4) + 'ms · 동시 ' + r.n + '장 · 겹친 쌍 ' + r.ov + ' · 잉크 폭 ' + r.w));
  ok(hb.every(r => r.n >= 2), '[H1] 홀드 내내 여러 장이 «흐르고» 있다(한 장 뜨고 마는 게 아니다)',
     hb.map(r => r.n).join('·'));
  ok(hb.every(r => r.ov === 0), '[H2] ★ 서로 겹친 쌍 0 — 칸 5개 × 간격 80px 이 수명 .3s 를 정확히 덮는다',
     hb.map(r => r.ov).join('·'));
  ok(hb.every(r => r.w <= HB_SLOT_W_JS), '[H3] 플로터 잉크 폭이 칸 간격(80px)보다 좁다 — 옆 칸과 안 겹치는 근거',
     hb.map(r => r.w).join('·') + ' ≤ ' + HB_SLOT_W_JS);
  ok(hb.every(r => r.n <= 10), '[H4] 동시 생존이 10장을 안 넘는다(FXMAX 120 · 눈이 읽을 수 있는 상한)',
     hb.map(r => r.n).join('·'));

  /* ══ [I] 가림 — 두 줄기의 «봉투» 가 호스트의 정보 요소를 밟지 않는가 ═════ */
  console.log('[I] 봉투 대 정보 요소 — 1회차에 비평가 2인이 손으로 재던 것을 자로 옮긴다');
  const I = await p.evaluate(() => {
    /* 봉투 = 사다리 가로 폭 × 애니메이션 세로 이동 범위. CSS 상수와 같은 값을 여기 적어 두고
       어긋나면 빨개지게 한다(잉크 폭 69 · 상자 높이 32 · 상승 34 · 하강 28 · 칸 5개). */
    const INK = 69, BOXH = 32, UP = 34, DN = 28, SLOTS = 5;
    const slotW = (w, n, dec) => Number.isFinite(dec) ? dec : Math.max(34, Math.min(80, (w - 70) / Math.max(1, n - 1)));
    const envs = (host) => {
      const cs = getComputedStyle(host), r = host.getBoundingClientRect();
      const num = (k, d0) => { const v = parseFloat(cs.getPropertyValue(k)); return Number.isFinite(v) ? v : d0; };
      const n = Math.max(2, Math.round(num('--hb-slots', SLOTS)));
      const sw = slotW(r.width, n, num('--hb-sw', NaN)), half = (n - 1) / 2 * sw + INK / 2;
      const mk = pay => {
        const lane = num(pay ? '--hb-y2' : '--hb-y', r.height * (pay ? 0.66 : 0.30));
        const cx = num(pay ? '--hb-x2' : '--hb-x', 0.5);
        return { pay, x1: r.width * cx - half, x2: r.width * cx + half,
                 y1: lane - (pay ? 0 : UP), y2: lane + BOXH + (pay ? DN : 0) };
      };
      return { r, ok: mk(false), pay: mk(true) };
    };
    const hit = (e, k) => !(e.x2 <= k.x || e.x1 >= k.x + k.w || e.y2 <= k.y || e.y1 >= k.y + k.h);
    const kidsOf = (host, skip) => [...host.children]
      .map(el => { const h = host.getBoundingClientRect(), b = el.getBoundingClientRect();
        return { cls: (el.className || '').split(/\s+/)[0], x: b.left - h.left, y: b.top - h.top, w: b.width, h: b.height }; })
      .filter(k => k.w > 4 && k.h > 4 && !skip.includes(k.cls));
    const out = {};
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    {
      const host = document.querySelector('.tr-rn'), e = envs(host);
      /* 카드 아래 띠를 쓰므로 «그릇(#trRunes) 안» 인지도 같이 본다 */
      const wrap = document.getElementById('trRunes').getBoundingClientRect();
      out.rune = { ok: kidsOf(host, []).filter(k => hit(e.ok, k)).map(k => k.cls),
                   pay: kidsOf(host, []).filter(k => hit(e.pay, k)).map(k => k.cls),
                   inWrap: e.ok.y2 <= wrap.height + 4 && e.pay.y2 <= wrap.height + 4,
                   xsplit: e.ok.x2 <= e.pay.x1 };
    }
    setTrSub('train'); renderTrain();
    {
      const host = document.querySelector('.tr-card'), e = envs(host);
      /* `.ci` 는 아이콘(아트)이라 «정보 요소» 가 아니다 — 여기만 밟는 것이 설계다 */
      out.train = { pay: kidsOf(host, ['ci']).filter(k => hit(e.pay, k)).map(k => k.cls),
                    inCi: (() => { const h = host.getBoundingClientRect(),
                      ci = host.querySelector('.ci').getBoundingClientRect();
                      return e.pay.y1 >= ci.top - h.top - 2 && e.pay.y2 <= ci.bottom - h.top + 2; })(),
                    ladder: (SLOTS - 1) * slotW(host.getBoundingClientRect().width, SLOTS, NaN) + INK,
                    hostW: host.getBoundingClientRect().width };
    }
    setTrSub('temper'); try { temperCharge(1e9); } catch (_) {} renderTrain();
    {
      const host = document.querySelector('.tr-tp'), e = envs(host);
      out.temper = { ok: kidsOf(host, []).filter(k => hit(e.ok, k)).map(k => k.cls),
                     pay: kidsOf(host, []).filter(k => hit(e.pay, k)).map(k => k.cls),
                     sep: e.pay.y2 <= e.ok.y1 + 2, hostH: host.getBoundingClientRect().height };
    }
    return out;
  });
  console.log('  · 룬  결과 봉투가 밟는 자식 [' + I.rune.ok.join(',') + '] · 비용 [' + I.rune.pay.join(',') + '] · 그릇 안 ' + I.rune.inWrap + ' · 좌우 분리 ' + I.rune.xsplit);
  console.log('  · 훈련 비용 봉투가 밟는 «정보» 자식 [' + I.train.pay.join(',') + '] · 아이콘 띠 안 ' + I.train.inCi + ' · 사다리 폭 ' + Math.round(I.train.ladder) + ' ≤ 카드 ' + Math.round(I.train.hostW));
  console.log('  · 단련 결과 봉투 [' + I.temper.ok.join(',') + '] · 비용 봉투 [' + I.temper.pay.join(',') + '] · 두 줄기 분리 ' + I.temper.sep);
  ok(I.rune.ok.length === 0 && I.rune.pay.length === 0,
     '[I1] ★ 룬 — 두 봉투가 카드 자식(진행바·효과줄·버튼)을 한 개도 안 밟는다',
     '[' + I.rune.ok.join(',') + '] / [' + I.rune.pay.join(',') + ']');
  ok(I.rune.inWrap, '[I2] 그 자리가 그릇(#trRunes 778px) 안이다 — 팝업 밖으로 안 샌다', String(I.rune.inWrap));
  ok(I.rune.xsplit, '[I3] 룬은 두 줄기를 좌우로 갈랐다 — 사다리 둘이 서로 안 겹친다', String(I.rune.xsplit));
  ok(I.train.pay.length === 0 && I.train.inCi,
     '[I4] ★ 훈련 — 비용 봉투가 «공격력»·«Lv» 같은 정보 자식을 안 밟고 아이콘 띠 안에 든다',
     '[' + I.train.pay.join(',') + '] · inCi ' + I.train.inCi);
  ok(I.train.ladder <= I.train.hostW + 1,
     '[I5] ★ 좁은 호스트에서 사다리가 카드 밖(=이웃 카드 위)으로 안 나간다',
     Math.round(I.train.ladder) + ' ≤ ' + Math.round(I.train.hostW));
  ok(I.temper.ok.length === 0 && I.temper.pay.length === 0,
     '[I6] ★ 단련 — 두 봉투가 행 자식(축 이름·레벨·설명·버튼)을 한 개도 안 밟는다',
     '[' + I.temper.ok.join(',') + '] / [' + I.temper.pay.join(',') + ']');
  ok(I.temper.sep, '[I7] 단련은 한 칸에 두 줄기를 위아래로 포갰다 — 둘이 서로 안 만난다', String(I.temper.sep));

  /* ══ [R] 되돌림 시험 — 부품을 빼면 위 등식이 전부 0 이 된다 ════════ */
  console.log('[R] 되돌림 시험 — hbBeat 를 no-op 으로 바꾼 사본에서 세 축이 0 이 되는가');
  await p.evaluate(() => {
    window.__hb0 = window.hbBeat;
    window.hbBeat = function () { return; };
    if (window.__rate0) runeRate = window.__rate0;
    try { closeModal(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await p.waitForTimeout(450);
  await countTries('runeBuy'); await reset();
  await holdTouch(await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1'   /* 490 — 결제 갈래가 하나라 버튼도 하나 */), HOLD);
  const R = await grab();
  console.log('  · (되돌림) 시도 ' + R.tries + ' · 맥박 ' + (R.hb + R.hbx) + ' · 플로터 ' + R.node + ' · 토스트 ' + R.toast);
  ok(R.tries >= 8, '[R1] 되돌린 사본에서도 홀드 자체는 그대로 돈다(수리 전 트리와 같은 조건)', R.tries + '회');
  ok(R.hb + R.hbx === 0 && R.node === 0, '[R2] ★ 부품을 빼면 회당 사건이 통째로 0 — 이 게이트는 무르지 않다',
     '맥박 ' + (R.hb + R.hbx) + ' · 플로터 ' + R.node);
  ok(sumT(R, /회 시도 · 성공/) === 1, '[R3] 그래도 요약 토스트 한 장은 종전 그대로 남는다(488 이 206 을 안 건드렸다)',
     sumT(R, /회 시도 · 성공/) + '장 / 전체 ' + R.toast);
  await p.evaluate(() => { if (window.__hb0) window.hbBeat = window.__hb0; });

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY488 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
