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
 * ⚠ 3회차부터 **다섯 자리 전부 beat = 시도 수**다(2회차까지는 «세부팝업·유물·훈련은 시도 − 1» 이었다).
 *   비평가 BO·BP 가 2회차 캡처에서 독립적으로 «누른 그 순간 카드가 반응하지 않는다 · 훈련은 첫 380ms
 *   동안 알림이 0장» 으로 잡았고, 특히 **비용 «−n» 이 첫 발에 없는 것**이 주인 원문(«돈을 쓰고 있구나»)과
 *   정면으로 어긋난다. 첫 발의 `fxUpOk`(플래시+파티클+델타)는 그대로 두고 그 위에 회당 맥박을 얹었다.
 *
 * ⚠ 게임 루프는 **돌린 채로** 잰다(349 교훈 — 루프를 세운 게이트는 실기기와 다른 것을 재고 초록이었다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
/* 540 — «치우기» 닫개 한 벌. 여기 손으로 적혀 있던 목록에는 제품에 없는 이름
   `closeDefeat` 가 섞여 있었고(index.html 0건), `typeof` 가드가 그것을 조용히 삼켜
   18 패배 화면을 치우는 팔이 한 번도 돈 적이 없다. */
const { install, missingClosers, defeatStuck, blockedLabel } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.V488_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const HOLD = Number(process.env.V488_HOLD || 2200);
/* 660 — 빈 표본이면 Infinity 가 들어오므로 `toFixed` 대신 이것을 쓴다(자가 죽지 않게) */
const n1 = v => (Number.isFinite(v) ? v.toFixed(0) : '—');
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
  await install(p, { arm: true });   /* 540 — 게임 루프를 돌리는 자다: 껍데기 걷개까지 건다 */
  const cdp = await ctx.newCDPSession(p);

  /* ── 계측기 ───────────────────────────────────────────────────────── */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
    window.__C = { pulse: [], float: [], node: [], toast: 0, cls: [], spd: [], cic: [] };
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
        /* 583 이관 — «금액» 을 뺀 자리를 무엇이 대신 말하는가: 화폐 알갱이(`.fx-fly.fx-spd`) */
        if (/\bfx-spd\b/.test(c)) {
          const im = n.querySelector && n.querySelector('img.cic');
          window.__C.spd.push(im ? im.dataset.curIc : '?');
        }
        /* ⚑ 660 이관 — 그 자리를 **다시** 이어받은 부품: 강화 버튼에서 터지는 재화 아이콘 버스트.
           583 의 `.fx-spd`(비행)는 658·660 이 폐지했고, «무엇으로 냈나» 를 이제 이 놈이 말한다. */
        if (/\bfx-cic\b/.test(c)) {
          const im = n.querySelector && n.querySelector('img.cic');
          window.__C.cic.push(im ? im.dataset.curIc : '?');
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

  const reset = () => p.evaluate(() => { window.__C = { pulse: [], float: [], node: [], toast: 0, cls: [], spd: [], cic: [] }; window.__T = 0; });
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
      toast: C.toast, toastTxt: C.toastTxt || [], tries: window.__T || 0,
      spd: C.spd.length, spdCur: [...new Set(C.spd)],
      cic: C.cic.length, cicCur: [...new Set(C.cic)]        /* 660 */
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
    window.__clear540();   /* 540 — 닫개 + 이름 없는 껍데기(#defw) */
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
  /* ⚑⚑ 660 이관 — **488 의 계약이 주인 지시로 바뀌었다.** 488 의 본체는 «시도마다 보이는 사건 ≥ 1»
     이고 그것은 **그대로 살아 있다**. 바뀐 것은 그 사건을 이루는 부품이다:
       종전 «맥박 + 플로터 두 장(«+1» 결과 · «−n» 비용)»
       지금 «맥박 + **강화 버튼에서 터지는 재화 아이콘 버스트**»(659·660 — 주인 «숫자들 뜨는 연출 없애기»)
     ⇒ 숫자 플로터를 세던 항들은 **지우지 않고 방향을 뒤집는다**(333) — «= 시도 수» → «0장» —
       그리고 그 자리를 이어받은 부품에 **양성항**을 세운다(«버스트 = 시도 수»).
       음성항만 남기면 «연출이 통째로 사라져도 초록» 인 게이트가 된다(583 [F3] 이 세운 규약 그대로다). */
  ok(B1.fOk === 0 && B1.fNo === 0,
     '[B4] ★ 660 — 성공 틱에 **숫자 플로터가 0장**이다(종전 «+1 Lv» = 시도 수)',
     '결과 ' + B1.fOk + ' · 실패 ' + B1.fNo + ' / 시도 ' + B1.tries);
  ok(B1.fPay === 0, '[B5] ★ 660 — 비용 «−n» 플로터도 **0장**이다', B1.fPay + ' / ' + B1.tries);
  /* 양성항 — 그 자리를 이어받은 부품이 **시도마다** 실제로 뜬다(«보이는 사건 ≥1» 은 488 의 본체다) */
  ok(B1.cic >= B1.tries && B1.cicCur.length === 1 && B1.cicCur[0] === 'rstone',
     '[B5b] ★ 660 — 그 자리를 «룬강화석 버스트»가 대신한다(시도마다 · 전부 rstone)',
     '아이콘 ' + B1.cic + ' [' + B1.cicCur.join(',') + '] / 시도 ' + B1.tries);
  ok(B1.node === B1.fOk + B1.fNo + B1.fPay, '[B6] 부른 만큼 실제 DOM 노드가 붙었다(FXMAX 로 떨어진 것 0)', B1.node + ' 노드');
  ok(B1.floatDrop === 0 && B1.pulseDrop === 0, '[B7] 홀드 내내 FXMAX·호스트 유실이 0건이다', 'float ' + B1.floatDrop + ' · pulse ' + B1.pulseDrop);
  ok(B1.nodeDn === B1.fPay, '[B8] 비용 플로터만 «아래로»(.dn) 진다 — 58 결제 어휘', B1.nodeDn + '/' + B1.fPay);
  ok(sumT(B1, /회 시도 · 성공/) === 1, '[B9] ★ 룬 정산 토스트는 손 뗀 뒤 «요약 한 장» 뿐이다(206 규약 유지)',
     sumT(B1, /회 시도 · 성공/) + '장 / 전체 ' + B1.toast);
  ok(B1.txts.every(t => !/[0-9]/.test(t)),
     '[B10] ★ 660 — 성공 갈래에 **숫자 문구가 한 자도 없다**(종전 «+1». 5회차의 잉크 74px 지적은 그 문구와 함께 은퇴)',
     B1.txts.join(',') || '문구 0장');

  await runeSetup(0); await p.waitForTimeout(450);
  await countTries('runeBuy'); await reset();
  await holdTouch(await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1'   /* 490 — 결제 갈래가 하나라 버튼도 하나 */), HOLD);
  const B2 = await grab();
  console.log('  · 전부 실패 — 시도 ' + B2.tries + ' · 맥박 ' + B2.hb + '/' + B2.hbx + ' · 플로터 ' + B2.node + ' · 색 ' + B2.cols.join(','));
  ok(B2.hbx === B2.tries && B2.hb === 0, '[B11] ★ 전부 실패면 흔들림(jz-hbx) 수 = 시도 수 · 성공 팝 0', B2.hbx + '/' + B2.tries + ' · hb ' + B2.hb);
  ok(B2.fNo === B2.tries && B2.fOk === 0, '[B12] ★ «실패» 플로터 수 = 시도 수', B2.fNo + '/' + B2.tries);
  ok(B2.fPay === 0,
     '[B13] ★ 660 — 실패 갈래에도 «−n» 은 **0장**이다(종전 «재화는 나갔으므로 시도 수»). 비용은 카드가 상시로 말한다',
     B2.fPay + '/' + B2.tries);
  ok(B2.txts.includes('실패'), '[B14] 실패 문구가 «실패» 다', B2.txts.join(','));
  ok(B2.cols.includes('rgb(176, 27, 46)'), '[B15] 실패 색이 빨강 #B01B2E 다(성공 초록과 갈린다)', B2.cols.join(','));
  /* ⚑ 660 — [B16](성공 초록 #2E7D14)·[B17](비용 갈색 #7A3A10)은 **그 플로터와 함께 은퇴**했다.
     색을 묻던 자리를 비우지 않고, 그 색이 말하던 것(«성공과 실패가 갈린다» · «비용이 보인다»)을
     **살아 있는 부품**에 다시 묻는다. ⚠ [B15](실패 빨강)는 «실패» 플로터가 남아 그대로 산다. */
  ok(B1.cols.every(c => c !== 'rgb(46, 125, 20)') && B1.cols.every(c => c !== 'rgb(122, 58, 16)'),
     '[B16] ★ 660 — 성공 초록·비용 갈색 플로터가 **한 장도 안 뜬다**(그 두 색이 은퇴한 자리)',
     B1.cols.join(',') || '플로터 0장');
  ok(B2.cic >= B2.tries && B2.cicCur.length === 1 && B2.cicCur[0] === 'rstone',
     '[B17] ★ 660 — 실패 갈래에도 버스트는 뜬다(619 11회차 «실패 틱에도 활동 한 줌» 규약 유지)',
     '아이콘 ' + B2.cic + ' [' + B2.cicCur.join(',') + '] / 시도 ' + B2.tries);
  ok(sumT(B2, /회 시도 · 성공/) === 1, '[B18] 전부 실패해도 정산 토스트는 요약 한 장',
     sumT(B2, /회 시도 · 성공/) + '장 / 전체 ' + B2.toast);

  /* ══ [C] 단련 투자 홀드 ═════════════════════════════════════════════ */
  console.log('[C] 단련 [투자] 홀드 — 같은 부품 · 확정 처리라 실패 갈래 없음');
  await p.evaluate(() => {
    if (window.__rate0) runeRate = window.__rate0;
    S.tstone = 1e12; openTrain(); setTrSub('temper'); renderTrain();   /* 613 — 직접 지불이라 전환 없음 */
  });
  await p.waitForTimeout(450);
  await countTries('temperUpBtn'); await reset();
  const cC = await box('#trTemper .tr-tp[data-temper] .tb');
  if (cC) await holdTouch(cC, HOLD);
  const C = await grab();
  console.log('  · 시도 ' + C.tries + ' · 맥박 ' + C.hb + '/' + C.hbx + ' · 플로터 ' + C.node + ' · 토스트 ' + C.toast);
  ok(C.tries >= 8, '[C1] 단련 홀드가 여러 번 시도한다(전제)', C.tries + '회');
  ok(C.hb === C.tries && C.hbx === 0, '[C2] ★ 맥박 수 = 시도 수 · 확정 처리라 흔들림 0', C.hb + '/' + C.tries);
  ok(C.fOk === 0 && C.fPay === 0,
     '[C3] ★ 660·659 — 단련의 «+1 Lv»·«−n(단련석)» 숫자 플로터가 **둘 다 0장**이다(659 본체)',
     C.fOk + '·' + C.fPay + ' / ' + C.tries);
  ok(C.cic >= C.tries && C.cicCur.length === 1 && C.cicCur[0] === 'tstone',
     '[C3b] ★ 660 — 그 자리를 «단련석 버스트»가 대신한다(시도마다 · 전부 tstone)',
     '아이콘 ' + C.cic + ' [' + C.cicCur.join(',') + '] / 시도 ' + C.tries);
  ok(sumT(C, /단련/) === 1, '[C4] 단련 정산 토스트는 요약 한 장', sumT(C, /단련/) + '장 / 전체 ' + C.toast);

  /* ══ [D] 08 세부 팝업 [강화] 홀드(bindUpHold) ═══════════════════════ */
  console.log('[D] 08 세부 팝업 [강화] 홀드 — 3회차부터 첫 발에도 beat');
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
  ok(D.hb === D.tries, '[D2] ★ 맥박 수 = 시도 수(3회차 — 첫 발에도 건다)', D.hb + ' / ' + D.tries);
  ok(D.fOk === D.tries, '[D3] «+1 Lv» 수 = 시도 수', D.fOk + ' / ' + D.tries);
  ok(D.fPay === D.tries && D.nodeDn === D.fPay, '[D4] «−n 조각» 수 = 시도 수 · 전부 아래로 진다', D.fPay + ' / ' + D.tries);

  /* ══ [E] 89 유물 소환 홀드(rwHold) ═════════════════════════════════ */
  /* ⚑⚑ 666 이관(2026-09-01, 주인 지시 2026-09-02 00:40 «유물소환부분도 텍스트로 존나 이펙트 하는거
     빼기. 그리고 유물소환 버튼에서 유물화폐 아이콘 파티클 이펙트 떠야함») — **[E3] 의 방향을 뒤집었다.**
     488 이 여기서 ««−n» 수 = 시도 수» 를 단언한 것은 «돈을 쓰고 있구나» 를 회당 말하라는 뜻이었는데,
     주인이 그 말을 **숫자가 아니라 그림**으로 하라고 다시 정했다(660 이 훈련·단련·룬에서 같은 값을
     걷은 것과 한 규약). 그래서 항을 **지우지 않고**(333 처방) 같은 축의 반대편으로 갈아 끼운다:
       · [E3]  «−n» 플로터 **0건**            ← 폐지된 어휘가 되살아나면 빨개진다
       · [E3b] 그 자리를 대신하는 것이 실재한다 — 아이콘 버스트가 **시도 수 이상** 떴다.
         (없으면 «666 이 통째로 사라져도 초록인 게이트» 가 된다 — 328·329 이관 교훈.)
     ⚠ 맥박 [E2] 는 한 글자도 안 바꿨다 — 회당 «보이는 사건» 의 뿌리는 그것이다. */
  console.log('[E] 89 유물 소환 홀드 — 회당 맥박 + 버튼에서 터지는 유물조각 아이콘(666 이관)');
  await p.evaluate(() => {
    try { closeModal(); closeTrain(); } catch (_) {}
    S.relic = 1e12; S.dia = 1e12;
    openRelw();
    /* 666 — 아이콘 버스트는 수명이 짧아 «끝난 뒤 세면» 이미 지워져 있다. 붙는 순간을 센다. */
    window.__E666 = 0;
    const L = document.getElementById('fxl'), ap = L.appendChild.bind(L);
    L.appendChild = nd => { const r = ap(nd);
      if (nd.nodeType === 1 && /fx-cic/.test((nd.className || '') + '')) window.__E666++; return r; };
  });
  await p.waitForTimeout(500);
  await countTries('summonRelic'); await reset();
  const cE = await box('#rwBasin');
  if (cE) await holdTouch(cE, HOLD);
  const E = await grab();
  console.log('  · 시도 ' + E.tries + ' · 맥박 ' + E.hb + ' · 결과 플로터 ' + (E.fOk + E.fNo) + ' · 비용 ' + E.fPay);
  /* ⚠ 문턱은 «잰 값» 이다(504-④) — 유물은 소환마다 `relicCost()` 가 오르는 자리라 같은 홀드에서
     4~10회 사이로 흔들린다. 5 로 조이면 살아 있는 게이트가 매번 빨개진다. */
  ok(E.tries >= 4, '[E1] 유물 홀드가 여러 번 시도한다(전제)', E.tries + '회');
  ok(E.hb === E.tries, '[E2] ★ 맥박 수 = 시도 수', E.hb + ' / ' + E.tries);
  const E666 = await p.evaluate(() => window.__E666 || 0);
  ok(E.fPay === 0, '[E3] ★ 666 — «−n» 비용 플로터 **0건**(숫자 플로터 폐지 · 비용은 `#rwCost` 알약이 상시로 말한다)',
     E.fPay + '건');
  ok(E666 >= E.tries, '[E3b] ★ 666 — 그 자리를 대신하는 아이콘 버스트가 시도 수 이상 떴다',
     E666 + '알 / 시도 ' + E.tries);
  ok(E.fOk === 0 && E.fNo === 0, '[E4] ★ 결과 문구는 안 띄운다(666 — 격자 칸의 «이름 Lv.n» 델타도 같이 폐지됐다)', (E.fOk + E.fNo) + '건');

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
  ok(F.hb === F.tries, '[F2] ★ 맥박 수 = 시도 수', F.hb + ' / ' + F.tries);
  /* ⚑ 583 이관 — 주인 지시(2026-08-31 «그 훈련할때 금액 마이너스로 되는 연출 빼기»)로 **훈련만**
     비용 «−n» 이 사라졌다(룬 [B5]·단련 [C3]·유물 [E3] 은 그대로다 — 주인이 지목한 것은 훈련이다).
     자리를 비우지 않고 **갈아 끼운다**(333 처방): 「얼마를 냈나」 대신 「무엇으로 냈나」를 묻는다.
     ⇒ 음성항(금액 0)과 양성항(골드 알갱이가 실제로 뜬다)을 **같이** 세운다 — 한쪽만이면
        «연출이 통째로 사라져도 초록» 이 된다. */
  /* ⚑ 660 이관 — 583 이 세운 «얼마를 냈나 → 무엇으로 냈나» 는 그대로이고, 그 말을 하는 부품만
     비행 알갱이(`.fx-spd`) → **버튼 버스트**(`.fx-cic`)로 바뀌었다(658 «버튼으로 가는 연출 폐지»).
     ⚠ 음성항을 **하나 늘렸다** — 비행이 0건인 것까지 물어야 «658 이 되돌아가도 초록» 이 안 된다. */
  ok(F.fPay === 0 && F.spd === 0 && F.cic >= 3 && F.cicCur.length === 1 && F.cicCur[0] === 'gold',
     '[F3] ★ 583·658·660 — 훈련은 «금액» 대신 **골드 아이콘 버스트**로 말한다(비용 플로터 0 · 비행 0 · 버스트 ≥3, 전부 gold)',
     '비용 ' + F.fPay + ' · 비행 ' + F.spd + ' · 버스트 ' + F.cic + ' [' + F.cicCur.join(',') + ']');
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
    /* ⚑ 491 4회차 — [충전]의 회당 피드백 호스트가 버튼 `.cg`(392×64) → **헤더 `.tp-hd`(998×88)** 로
       올라왔다(형제 둘과 같은 꼴). 호스트가 늘었으니 이 절이 그 자리도 같이 지켜야 한다 —
       헤더는 룬 카드와 **같은 998폭**이라 기본 진폭 1.06 이면 그릇을 11.9px 넘본다. */
    const hd = document.querySelector('#trTemper .tp-hd');
    /* 613 — [충전] 폐지로 헤더는 더 이상 피드백 호스트가 아니다. --hb-s 신고가 남아 있으면
       죽은 부품이 되살아난 것이다(getPropertyValue 는 미선언이면 빈 문자열을 준다). */
    out.hd = { decl: hd ? getComputedStyle(hd).getPropertyValue('--hb-s').trim() : '(노드 없음)',
               present: !!hd };
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
  ok(G.hd.present && G.hd.decl === '',
     '[G6] 613 — 단련 헤더는 더 이상 피드백 호스트가 아니다(--hb-s 신고 0건 — [충전]과 함께 폐지)',
     'decl=«' + G.hd.decl + '»');

  /* ══ [H] 겹침 — 회당 한 장씩 흐르는 플로터가 서로 안 뭉치는가 ══════ */
  console.log('[H] 동시 생존 플로터 — 겹친 쌍 (1회차에 15~16쌍이었다)');
  await p.evaluate(() => {
    if (window.__rate0) runeRate = window.__rate0;
    /* ⚑⚑ 660 이관 — **확률을 1 이 아니라 0 으로 고정한다.** 이 두 절([H]·[J])은 «회당 플로터
       사다리» 의 기하(칸 간격·수명·겹침)를 재는데, 주인 지시 659·660 이 **숫자 플로터**
       («+1» 결과 · «−n» 비용)를 세 탭에서 폐지했다 — 성공을 강제하면 표본이 **0장**이 되어
       [H1] 이 빨개지고 [J] 가 빈 배열에서 죽는다(1회차에 실제로 그랬다).
       ⇒ 사다리는 **없어진 것이 아니라 실패 갈래에만 남았다**(660 결1 — «실패» 는 숫자가 아니고,
         룬만 확률 판정이라 실패 틱의 유일한 회당 채널이라 살렸다). 그 살아 있는 표본으로 옮긴다.
       ⚠ 재는 것(칸 간격 · 수명 · α · 겹침 · 애니 시작 시각)은 **한 항목도 안 바뀌었다** —
         같은 부품(`hbFloat` → `.fx-plus.hb`)의 같은 기하다. 문턱도 한 칸도 안 건드렸다.
       ⚠ 줄기가 둘(결과·비용)에서 하나(«실패»)로 준다 — [H2]«겹친 쌍 0»·[J] `streamMax` 는
         줄기 수와 무관한 식이라 그대로 성립한다. */
    runeRate = () => 0;
    try { closeModal(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await p.waitForTimeout(450);
  const HTS = [700, 1400, 2200, 3000];
  /* ⚑⚑ 729 — **«순간» 이 아니라 «창» 을 본다**(574·630 선례. 제품 `index.html` 0줄).
     [H1] 은 상수 시각 4개를 «찍어» 봤는데, **첫 자리(700ms)가 사다리가 가장 얇은 창 한복판**이다:
     반복은 `TR_HOLD_DELAY` 350ms 뒤에 시작해 `TR_HOLD_IV0` **160ms** 에서 60ms 까지 가속하고
     플로터 수명은 `HB_LIFE` **310ms** 인데 여기 필터가 `opacity > 0.08` 이라, **간격이 가장 넓은 초반**에만
     «앞장이 0.08 밑으로 내려간 뒤 다음 장이 아직 안 뜬» 틈이 생긴다. 부하는 그 틈을 만들지 않고 **옮긴다** —
     CPU 6줄 부하 18회 실측에서 «동시 최대 장수» 는 **18회 전부 2** 이고 겹친 쌍은 조밀 표본 전체에서 **0** 인데,
     상수 700ms 자리만 **2/18(≈11%)** 로 1장이 잡혔다(1400·2200·3000 은 54회 전부 2장). ⇒ 제품이 아니라 «언제 보는가» 다.
     ⚠ **문턱은 한 칸도 안 건드렸다**(`n >= 2` 그대로) — `n >= 1` 로 내리면 이 항이 막는 실패 모드
       («한 장 뜨고 마는 것») 자체가 사라진다. 옮긴 것은 **시각**뿐이다.
     ⇒ 목표 시각 t 부터 «≥2장» 이 보일 때까지 `HB_SLACK` 안에서 폴링하고, 그 사이 표본을 **전부** 남긴다.
       슬랙은 실측으로 정했다 — 부하 10회 × 4자리 = 40표본에서 앞대기 **최대 77ms · 못 채운 창 0** ⇒ **250ms(3.2배)**.
     ⚑ [H2]·[H3]·[H4] 는 이제 창의 **모든** 표본을 본다 — 표본이 4개에서 수십 개로 늘어 **오히려 조여졌다**.
     ⚑ 무르게 푼 수리가 아님은 **[H1n] 되돌림 시험**이 못박는다(아래). 재현기는 `tools/probe729.js`. */
  const HB_SLACK = 250, HB_POLL = 10;
  const hbShot = () => p.evaluate(() => {
    const rs = [...document.querySelectorAll('#fxl .fx-plus.hb')]
      .filter(n => parseFloat(getComputedStyle(n).opacity) > 0.08)
      .map(n => n.getBoundingClientRect());
    let ov = 0;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) ov++;
    }
    return { n: rs.length, ov, w: rs.length ? Math.round(Math.max(...rs.map(r => r.width))) : 0 };
  });
  /* 한 홀드에서 창 4개를 재는 팔 — [H] 본절과 [H1n] 되돌림 시험이 **같은 자**를 쓰게 공용으로 둔다 */
  const hbWindows = async () => {
    const c = await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1');
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); const rows = [];
    for (const t of HTS) {
      while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 5));
      const smp = []; let wait = -1;
      while (Date.now() - t0 < t + HB_SLACK) {
        const s = await hbShot();
        smp.push(s);
        if (s.n >= 2) { wait = Date.now() - t0 - t; break; }
        await new Promise(r => setTimeout(r, HB_POLL));
      }
      rows.push({
        t, wait, smp: smp.length,
        n: Math.max(...smp.map(s => s.n), 0),
        ov: Math.max(...smp.map(s => s.ov), 0),
        w: Math.max(...smp.map(s => s.w), 0),
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
    return rows;
  };
  const hb = await hbWindows();
  hb.forEach(r => console.log('  · t=' + String(r.t).padStart(4) + 'ms · 창 표본 ' + r.smp +
    '개 · 앞대기 ' + (r.wait < 0 ? '슬랙(' + HB_SLACK + ')을 못 채움' : r.wait + 'ms') +
    ' · 동시 최대 ' + r.n + '장 · 겹친 쌍 ' + r.ov + ' · 잉크 폭 ' + r.w));
  ok(hb.every(r => r.n >= 2), '[H1] 홀드 내내 여러 장이 «흐르고» 있다(한 장 뜨고 마는 게 아니다)',
     hb.map(r => r.n).join('·') + ' · 앞대기 ' + hb.map(r => r.wait).join('·') + 'ms ≤ ' + HB_SLACK);
  ok(hb.every(r => r.ov === 0), '[H2] ★ 서로 겹친 쌍 0 — 칸 5개 × 간격 80px 이 수명 .3s 를 정확히 덮는다',
     hb.map(r => r.ov).join('·') + ' (표본 ' + hb.reduce((a, r) => a + r.smp, 0) + '개)');
  ok(hb.every(r => r.w <= HB_SLOT_W_JS), '[H3] 플로터 잉크 폭이 칸 간격(80px)보다 좁다 — 옆 칸과 안 겹치는 근거',
     hb.map(r => r.w).join('·') + ' ≤ ' + HB_SLOT_W_JS);
  ok(hb.every(r => r.n <= 10), '[H4] 동시 생존이 10장을 안 넘는다(FXMAX 120 · 눈이 읽을 수 있는 상한)',
     hb.map(r => r.n).join('·'));

  /* ⚑⚑ 729 [H1n] — **새 축(«창») 의 되돌림 시험.** 368·334 규약: 자리를 옮겼으면 «옮긴 자리가 여전히
     결함을 잡는가» 를 같은 실행에서 증명한다. `hbFloat` 를 «첫 한 장만 통과» 로 깎으면 제품이 정확히
     [H1] 이 막는 실패 모드(«한 장 뜨고 마는 것»)가 되고, 그러면 창 4개 중 적어도 하나는 슬랙을 못 채워야 한다. */
  await p.evaluate(() => {
    window.__hbF0 = window.hbFloat;
    let once = false;
    window.hbFloat = function () { if (once) return false; once = true; return window.__hbF0.apply(this, arguments); };
  });
  await p.waitForTimeout(400);
  const hbN = await hbWindows();
  await p.evaluate(() => { if (window.__hbF0) { window.hbFloat = window.__hbF0; window.__hbF0 = null; } });
  console.log('  · (되돌림) 동시 최대 ' + hbN.map(r => r.n).join('·') + '장 · 앞대기 ' + hbN.map(r => r.wait).join('·'));
  ok(hbN.some(r => r.n < 2),
     '[H1n] ★ 되돌림 시험 — «첫 한 장만» 으로 깎은 사본에서 창 규칙이 빨개진다(새 축은 무르지 않다)',
     '동시 최대 ' + hbN.map(r => r.n).join('·') + ' (수리된 자는 ' + hb.map(r => r.n).join('·') + ')');

  /* ══ [J] 애니메이션이 규격대로 끝까지 도는가 (4회차 신설) ═════════ */
  console.log('[J] 플로터 수명·α — 3회차에 «뒤 1/4 이 한 프레임도 안 나온다» 로 잡힌 자리');
  await p.evaluate(() => {
    if (window.__rate0) runeRate = window.__rate0;
    /* ⚑⚑ 660 이관 — **확률을 1 이 아니라 0 으로 고정한다.** 이 두 절([H]·[J])은 «회당 플로터
       사다리» 의 기하(칸 간격·수명·겹침)를 재는데, 주인 지시 659·660 이 **숫자 플로터**
       («+1» 결과 · «−n» 비용)를 세 탭에서 폐지했다 — 성공을 강제하면 표본이 **0장**이 되어
       [H1] 이 빨개지고 [J] 가 빈 배열에서 죽는다(1회차에 실제로 그랬다).
       ⇒ 사다리는 **없어진 것이 아니라 실패 갈래에만 남았다**(660 결1 — «실패» 는 숫자가 아니고,
         룬만 확률 판정이라 실패 틱의 유일한 회당 채널이라 살렸다). 그 살아 있는 표본으로 옮긴다.
       ⚠ 재는 것(칸 간격 · 수명 · α · 겹침 · 애니 시작 시각)은 **한 항목도 안 바뀌었다** —
         같은 부품(`hbFloat` → `.fx-plus.hb`)의 같은 기하다. 문턱도 한 칸도 안 건드렸다.
       ⚠ 줄기가 둘(결과·비용)에서 하나(«실패»)로 준다 — [H2]«겹친 쌍 0»·[J] `streamMax` 는
         줄기 수와 무관한 식이라 그대로 성립한다. */
    runeRate = () => 0;
    try { closeModal(); closeRelw(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    /* 만든 시각을 노드에 적는다.
       ⚑⚑ 709 — **시계를 둘 적는다.** 4회차가 적어 둔 것은 `performance.now()` 하나였고, 그것을
         애니메이션의 시계(`currentTime` = 타임라인 시계)와 맞대는 바람에 [J2] 가 «애니가 제때
         시작하는가» 가 아니라 **두 시계의 위상차**를 같이 쟀다(`probe709` [3] — 실측 위상차 중앙
         45.5ms · 최대 61.7 · 프레임 33.3). 러너가 바쁘면 제품이 한 줄도 안 바뀌어도 문턱 25 를 넘는다.
       ⇒ 판정은 **타임라인 시계 하나로만** 한다: `born_tl` ↔ `animation.startTime`.
         이 등식이 곧 488 4회차 처방 ⓐ 가 제품에 박아 둔 그 줄이다(index.html ~38807
         `a.startTime = document.timeline.currentTime`). ⚠ `bornTl` 은 **반올림하지 않는다** —
         새 축의 실측 폭이 0.0ms 라 반올림 잡음(±0.5)이 신호보다 크다. */
    if (!window.__hbBorn) {
      window.__hbBorn = true;
      window.__j2rev = false;                     /* 709 [J2n] 되돌림 팔 스위치 */
      const of = window.hbFloat;
      window.hbFloat = function () { const r = of.apply(this, arguments);
        const L = document.getElementById('fxl'), n = L && L.lastElementChild;
        if (n && /fx-plus/.test(n.className || '')) {
          n.dataset.born = Math.round(performance.now());          /* 옛 축 — 기록만 */
          n.dataset.bornTl = String(document.timeline.currentTime); /* 새 축 — 판정 */
          /* [J2n] — 제품의 «시작 시각 못박기» 를 벗긴 수리 전 거동(«다음 스타일 플러시에 정해지게») */
          if (window.__j2rev) { try { const a = n.getAnimations()[0]; if (a) a.startTime = null; } catch (_) {} }
        }
        return r; };
    }
  });
  await p.waitForTimeout(450);
  const { J, TAIL } = await (async () => {
    const c = await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1');
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); const rows = [];
    for (const t of [900, 1500, 2100, 2700]) {
      while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 5));
      rows.push(await p.evaluate(() => {
        const now = performance.now();
        return [...document.querySelectorAll('#fxl .fx-plus.hb')].map(n => {
          const a = n.getAnimations()[0];
          return { age: now - (+n.dataset.born || now), ct: a ? (a.currentTime || 0) : -1,
                   /* 709 — 새 축의 두 값. `stTime` 이 null 이면 «아직 시작 시각이 안 정해졌다» 는 뜻이라
                      그 자체가 결함이다(수리 전 거동) — 표본에서 빼지 말고 따로 센다. */
                   stTime: a && a.startTime != null ? a.startTime : null,
                   bornTl: +n.dataset.bornTl,
                   op: parseFloat(getComputedStyle(n).opacity), dn: /\bdn\b/.test(n.className) };
        });
      }));
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    /* ⚑ 630 — [J3] 의 자리. 홀드가 끝나 새 스폰이 멎은 «꼬리» 에서 마지막 노드들의 ct 를 죽을 때까지
       40ms 로 계속 읽는다 — 위상이 안 낀다(폴링이 죽음까지 이어져 어느 위상이든 뒤쪽 구간을 지난다). */
    const tail = [];
    for (let k = 0; k < 20; k++) {
      await p.waitForTimeout(40);
      const r2 = await p.evaluate(() => [...document.querySelectorAll('#fxl .fx-plus.hb:not(.lng)')].map(n => {
        const a = n.getAnimations()[0]; return a ? (a.currentTime || 0) : -1; }));
      tail.push(...r2);
      if (!r2.length) break;
    }
    await p.waitForTimeout(250);
    return { J: rows, TAIL: tail };
  })();
  /* ⚠ 허용 오차는 «바라는 값» 이 아니라 «잰 값» 에서 온다(504-④). 한 표본의 «나이» 와 «애니 진행» 은
     서로 다른 순간에 읽히고(둘 사이에 `getComputedStyle` 이 26번 돈다) rAF 격자(16.7ms)도 끼므로
     **최댓값은 잡음이 지배한다** — 4회차 실측에서 중앙값 3~6ms 인데 최댓값만 38ms 로 튄다.
     그래서 **중앙값**으로 판정하고 최댓값은 기록만 한다. 3회차 값(86~131ms)은 중앙값 기준으로도
     이 문턱을 훨씬 넘으므로 이 자가 무르게 풀린 것이 아니다. */
  const Jf = J.flat();
  const lag = Jf.map(r => Math.abs(r.age - r.ct)).sort((a, b) => a - b);
  /* ⚑ 660 — 빈 표본에서 **죽지 않게** 한다. 자가 크래시하면 [J1] 이 «빨강» 조차 못 내고
     그 뒤 절들이 통째로 안 돈다(1회차에 `TypeError: … reading 'toFixed'` 로 그랬다).
     판정은 안 무르게 둔다 — 표본이 없으면 [J1] 이 그것을 정확히 잡는다. */
  const lagMed = lag.length ? lag[Math.floor(lag.length / 2)] : Infinity,
        lagMax = lag.length ? lag[lag.length - 1] : Infinity;
  const opaque = Jf.filter(r => r.op >= 0.99).length, late = Jf.filter(r => r.ct > 200).length;
  const tailLate = TAIL.filter(ct => ct > 200).length;
  /* 줄기당 동시 생존 — 스냅숏마다 res(결과)/pay(비용)를 갈라 센다(.lng 도 제 줄기의 q 에 든다) */
  const streamMax = Math.max(...J.map(s => Math.max(s.filter(r => r.dn).length, s.filter(r => !r.dn).length)), 0);
  console.log('  · 표본 ' + Jf.length + ' · 나이−진행 중앙 ' + n1(lagMed) + 'ms(최대 ' + n1(lagMax) + ') · α=1 표본 ' + opaque + ' · 줄기당 최대 ' + streamMax + '장 · 꼬리 표본 ' + TAIL.length + '(>200ms ' + tailLate + ')');
  ok(Jf.length >= 8, '[J1] 표본이 충분하다(홀드 중 동시 생존 플로터)', Jf.length + '개');
  /* ⚑⚑ 709 — **[J2] 의 축을 옮겼다(뜻 유지 · 시계 통일 · 문턱은 «내린» 것이 아니라 다른 자다).**
     옛 판정 `|나이 − 진행| 중앙값 ≤ 25ms` 는 문턱에 붙어 흔들렸다(등재문: 6회 중 1회 빨강 · 중앙 27ms).
     `tools/probe709.js` 가 그 값을 세 항으로 갈랐다 — `lag = ⟨A_snap⟩ − ⟨A_birth⟩ + ⟨B⟩`:
       ⟨A⟩ = `performance.now() − document.timeline.currentTime` = «마지막 프레임이 시작된 뒤 흐른 시간».
             실측 중앙 **45.5ms · 최대 61.7**(프레임 33.3ms) — 태어남과 스냅숏이 서로 무관한 위상이라
             그 **차가 통째로 잡음**이고, 그 폭이 문턱 25 보다 크다. 부하가 걸리면 프레임이 늘어(최대 83.3)
             그대로 빨개진다 — 실제로 CPU 6줄을 걸고 돌리니 3회 중 1회 중앙 28ms 로 빨강이었다.
       ⟨B⟩ = `animation.startTime − born_tl` = 이 항이 재려던 **바로 그것**이고, 두 값이 같은 타임라인
             시계라 위상이 안 낀다. 실측 **0.0ms(24표본 전부 · 회차 간 폭 0.0)**.
     ⇒ 판정을 ⟨B⟩ 로 옮긴다. **문턱 8ms 는 «잰 값» 에서 왔다**(504-④): 정상은 0.0, 되돌린 사본은
       한 프레임(16.7~33.3ms) 또는 «startTime 미정» 이라 8 은 빈 띠 한복판이다.
     ⚠ 무르게 푼 것이 아님은 **[J2n] 되돌림 시험**이 못박는다 — 제품의 그 한 줄을 벗기면 빨개진다.
     ⚠ 문턱을 25 → 더 큰 값으로 늘리는 처방은 334 가 기각한 ② 와 같은 꼴이라 쓰지 않았다
       (늘리면 «애니가 한 프레임 늦게 시작해도 초록» 이 되어 3회차 결함을 다시 못 잡는다). */
  const Jb = Jf.filter(r => Number.isFinite(r.bornTl));
  const j2NoStart = Jb.filter(r => r.stTime == null).length;
  const j2 = Jb.filter(r => r.stTime != null).map(r => Math.abs(r.stTime - r.bornTl)).sort((a, b) => a - b);
  const j2Med = j2.length ? j2[Math.floor(j2.length / 2)] : Infinity,
        j2Max = j2.length ? j2[j2.length - 1] : Infinity;
  ok(j2NoStart === 0 && j2Med <= 8,
     '[J2] ★ 애니메이션이 «만든 그 순간» 시작한다 — 시작 시각 ↔ 만든 시각(타임라인 시계 하나로) 중앙값 ≤ 8ms',
     n1(j2Med) + 'ms · 최대 ' + n1(j2Max) + ' · 시작 시각 미정 ' + j2NoStart + '장 / ' + Jb.length +
     ' (709: 옛 축은 두 시계의 위상차를 같이 쟀다)');
  console.log('  · (기록만 · 709) 옛 축 «나이 − 진행» 중앙 ' + n1(lagMed) + 'ms(최대 ' + n1(lagMax) +
    ') — 두 시계 위상차(실측 ±한 프레임)가 섞인 값이라 판정에서 뺐다. 3회차 결함 때는 86~131ms 였다');
  /* ⚑ 630 — **[J3] 을 갈아 끼웠다(뜻 유지 · 자리 이동 · 임계 200 불변).**
     옛 [J3] 은 «홀드 중 스냅숏에 ct>200 표본이 있다» 였는데, 그 자보다 뒤에 들어온 설계가 뜻을 뒤집었다
     (LESSONS 627-③ 꼴) — 619 8회차 «줄기당 동시 생존 상한 2» 가 3장째 스폰에서 가장 오래된 것을 걷으므로,
     홀드 중 반복분의 실수명은 태어남 간격(실측 92ms)×2 ≈ 186ms 다(`probe630` [1] — fxBye 가 아니라 q.shift()).
     ct>200 은 간격이 우연히 늘어진 위상에서만 잡혀 **0~2개로 흔들렸다**(= 이 항이 플레이키였던 정체).
     페이드아웃이 설계상 «끝까지 도는» 자리는 **홀드 끝**이다 — 새 스폰이 멎으면 마지막 두 장이 온 수명을
     산다(probe630 꼬리 축 8/8 · ct 300 도달). 그 자리를 죽을 때까지 폴링하므로 위상이 안 낀다.
     ⚠ 임계를 낮춰 홀드 중 축을 살리는 처방은 334 가 기각한 ② 와 같은 꼴이라 쓰지 않았다. */
  ok(tailLate > 0, '[J3] ★ 홀드 끝에서 마지막 플로터가 수명 뒤쪽(>200ms)까지 돈다 — 페이드아웃이 실제로 보인다(630: 자리를 홀드 끝으로)', tailLate + '개 / 꼬리 표본 ' + TAIL.length);
  /* [J3b] — 옛 [J3] 을 뒤집은 설계 자체를 옆에 세운다(627-④ — 옛 결론을 죽이지 않고 가른다).
     상한이 사라지면(수명 310 ÷ 간격 92 ≈ 줄기당 4장) 이 항이 빨개져 «홀드 중 일찍 걷히는 것이 설계다» 라는
     [J3] 이동의 근거가 무너졌음을 알린다. */
  ok(streamMax <= 2 && streamMax > 0, '[J3b] ★ 홀드 중 줄기당 동시 생존 ≤ 2 — 619 8회차 상한(3장째가 뜨면 가장 오래된 것을 걷는다)이 살아 있다', '최대 ' + streamMax + '장');
  console.log('  · (기록만 · 630) 옛 축 «홀드 중 ct>200 표본» ' + late + '개 — 위상 운에 걸려 판정에서 뺐다(0~2개로 흔들리던 자리)');

  /* ⚑⚑ 709 [J2n] — **[J2] 새 축의 되돌림 시험.** 368·334 규약: 축을 옮겼으면 «옮긴 축이 여전히
     결함을 잡는가» 를 같은 자 안에서 못박는다. 제품의 한 줄(index.html ~38807
     `a.startTime = document.timeline.currentTime`)을 벗긴 수리 전 거동을 만들고 같은 축으로 잰다 —
     그러면 시작 시각이 «다음 스타일 플러시» 로 밀려 ⟨B⟩ 가 한 프레임으로 뛰거나 아예 미정이 된다.
     ⚠ 이 팔은 룬 확률이 0 으로 고정된 채라 레벨·재화를 안 건드린다(뒤 절의 상태 전제 불변). */
  const J2N = await (async () => {
    await p.evaluate(() => { window.__j2rev = true; });
    const c3 = await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1');
    if (!c3) return null;
    const st3 = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c3.x, y: c3.y }] });
    const t3 = Date.now(); const rr = [];
    for (const t of [900, 1400]) {
      while (Date.now() - t3 < t) await new Promise(r => setTimeout(r, 5));
      rr.push(...await p.evaluate(() => [...document.querySelectorAll('#fxl .fx-plus.hb')].map(n => {
        const a = n.getAnimations()[0];
        return { stTime: a && a.startTime != null ? a.startTime : null, bornTl: +n.dataset.bornTl };
      })));
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st3.catch(() => {});
    await p.evaluate(() => { window.__j2rev = false; });
    await p.waitForTimeout(400);
    const b = rr.filter(r => Number.isFinite(r.bornTl));
    const noSt = b.filter(r => r.stTime == null).length;
    const v = b.filter(r => r.stTime != null).map(r => Math.abs(r.stTime - r.bornTl)).sort((a, x) => a - x);
    return { n: b.length, noSt, med: v.length ? v[Math.floor(v.length / 2)] : Infinity };
  })();
  ok(!!J2N && J2N.n >= 4 && (J2N.noSt > 0 || J2N.med > 8),
     '[J2n] ★ 되돌림 시험 — 제품의 «시작 시각 못박기» 를 벗기면 [J2] 가 빨개진다(새 축은 무르지 않다)',
     J2N ? '표본 ' + J2N.n + ' · 시작 시각 미정 ' + J2N.noSt + '장 · 중앙 ' + n1(J2N.med) + 'ms > 8' : '표본 없음');

  /* ⚑ 574 — **[J4] 는 «표본의 α» 를 세던 자리였고, 그것이 재던 것은 설계가 아니라 «위상» 이었다.**
     옛 판정 `α=1 표본 / 전체 표본 ≥ 0.5` 는 문턱에 붙어 흔들렸다(등재문: 7회 중 2회 빨강 · 16/36 · 18/38).
     `tools/probe574.js` 로 뿌리를 갈랐다 —
       ⓐ 플로터는 **주기**(실측 69~72ms)로 태어나고 한 beat 에 두 줄기라 스냅숏당 표본이 **8~9장뿐**이다.
          한 장이 불투명 창을 드나들면 비율이 **11~17%p** 움직이는데, 문턱(50%)과 설계값(62.5%) 사이는
          **12.5%p** — 즉 «노드 한 장» 이다. 난수가 아니라 **격자와 표본 시각의 위상차**가 답을 정한다.
       ⓑ 표본에 수명이 다른 두 종류(반복분 `.hb` .3s · 한 발 `.hb.lng` 1.3s)가 섞여 든다(스로틀 아래에서는 절반).
       ⓒ 부하를 걸면(CPU ×4) 같은 트리에서 **6라운드 중 5라운드가 빨강**(36.4~50.0%)이 된다 = 등재문이 본 그림.
       ⓓ **수리 전 대조**(491 5회차 전 = `.lng` .56s/570ms 사본)에서는 같은 조건에 **6/6 빨강**(0~42.9%)이다 —
          흔들림은 491 보다 앞서고, 5회차가 수명을 늘린 것은 이 비율을 **올렸다**(등재문 예측대로).
     ⇒ 등재문 처방 ⓐ 를 골랐다: **한 노드의 수명 중 불투명 구간 비율**을 «위상을 훑어» 직접 잰다.
        애니메이션을 세우고 `currentTime` 을 0→100% 로 옮기며 α 를 읽으므로 rAF 격자·부하가 안 들어온다.
     ⚠ **문턱 0.5 는 한 칸도 안 내렸다**(등재문 금지 사항) — 재는 대상만 «표본» 에서 «수명» 으로 옮겼다.
        [J6] 되돌림 시험이 그 자리가 여전히 빨개질 수 있음을 못박고, [J7] 이 «애니 길이 = 노드 수명» 을 묶어
        (옛 자가 살아 있는 노드를 읽어서 덤으로 갖고 있던 성질) 이 자가 무르게 풀리지 않았음을 채운다. */
  console.log('  · (기록만 · 574) 옛 축 «α=1 표본 비율» ' + opaque + '/' + Jf.length +
    ' = ' + (opaque / Jf.length * 100).toFixed(1) + '% — 위상 격자에 ±12%p 흔들려 판정에서 뺐다');
  const SW = await (async () => {
    await p.evaluate(() => {
      /* 위상 훑기 — 애니를 세우고 currentTime 을 옮기며 α 를 읽는다. fxBye 가 걷어가도 다시 붙여 끝낸다. */
      /* ⚑ 630 — 셀렉터로 «지금» 다시 찾지 않고, 감지 시점에 stash 한 참조를 우선 쓴다.
         619 8회차 상한 2 가 `.lng` 를 수명(1.3s)보다 훨씬 일찍(실측 ~534ms) 걷어가므로, 훑기가 도는
         시점에 노드가 DOM 에 없어 [J5]/[J7] 이 «노드 없음» 으로 간헐 빨강이었다(75/77, 같은 630 뿌리).
         훑기는 애니메이션을 세우고 currentTime 을 손으로 옮기는 축이라, 걷힌 노드를 도로 붙여 재도
         재는 값(키프레임 봉투)은 같다 — 아래 재부착(`isConnected`) 가지가 원래 그 용도다. */
      window.__sw574 = (sel, N) => {
        const L = document.getElementById('fxl');
        const n = (window.__sw630 && window.__sw630[sel] && window.__sw630[sel].getAnimations) ? window.__sw630[sel] : document.querySelector(sel);
        if (!n) return null;
        if (!n.isConnected) L.appendChild(n);     /* 걷힌 노드는 붙여야 애니메이션이 산다(안 붙이면 getAnimations 가 빈다) */
        void n.offsetWidth;                       /* animation-name 을 갈아 끼운 직후를 위해 한 번 플러시 */
        const a = n.getAnimations()[0]; if (!a) return null;
        a.pause();
        const dur = a.effect.getComputedTiming().duration, ops = [];
        for (let i = 0; i <= N; i++) {
          if (!n.isConnected) L.appendChild(n);
          a.currentTime = dur * i / N;
          ops.push(parseFloat(getComputedStyle(n).opacity));
        }
        try { n.remove(); } catch (_) {}
        const first = ops.findIndex(o => o >= 0.99);
        let last = -1; for (let i = ops.length - 1; i >= 0; i--) if (ops[i] >= 0.99) { last = i; break; }
        return { dur, lo: first < 0 ? 0 : first / N, hi: last < 0 ? 0 : last / N,
                 frac: first < 0 ? 0 : (last - first) / N };
      };
      window.__life574 = { rep: typeof HB_LIFE !== 'undefined' ? HB_LIFE : null,
                           lone: typeof HB_LIFE_LONE !== 'undefined' ? HB_LIFE_LONE : null };
    });
    const c2 = await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1');
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c2.x, y: c2.y }] });
    /* 첫 beat 가 «한 발»(1.3s)이고 그 뒤가 반복분(.3s)이라, 둘이 같이 살아 있는 창을 기다린다.
       ⚠ 시각을 상수로 박지 않는다 — 부하가 걸리면 그 창이 늦게 열린다(574 가 스로틀에서 본 것). */
    let have = null;
    for (let i = 0; i < 20; i++) {
      await p.waitForTimeout(120);
      have = await p.evaluate(() => {
        /* 630 — 본 순간에 참조를 stash(위 __sw574 머리말). 상한 2 가 다음 beat 에 걷어가도 훑기가 잡는다. */
        const rep = document.querySelector('#fxl .fx-plus.hb:not(.lng)');
        const lone = document.querySelector('#fxl .fx-plus.hb.lng');
        window.__sw630 = window.__sw630 || {};
        if (rep) window.__sw630['#fxl .fx-plus.hb:not(.lng)'] = rep;
        if (lone) window.__sw630['#fxl .fx-plus.hb.lng'] = lone;
        return { rep: !!(rep || window.__sw630['#fxl .fx-plus.hb:not(.lng)']),
                 lone: !!(lone || window.__sw630['#fxl .fx-plus.hb.lng']) };
      });
      if (have.rep && have.lone) break;
    }
    const rep  = await p.evaluate(() => window.__sw574('#fxl .fx-plus.hb:not(.lng)', 300));
    const lone = await p.evaluate(() => window.__sw574('#fxl .fx-plus.hb.lng', 300));
    /* 되돌림 시험 — «페이드가 수명의 70% 를 먹는» 키프레임을 씌운 사본에서 같은 자가 빨개지는가 */
    const bad = await p.evaluate(() => {
      const s = document.createElement('style');
      s.textContent = '@keyframes fx574Bad{0%{opacity:1}30%{opacity:1}100%{opacity:0}}' +
                      '.fx-plus.hb.bad574{animation-name:fx574Bad !important}';
      document.head.appendChild(s);
      const n = document.querySelector('#fxl .fx-plus.hb:not(.lng)') ||
                (window.__sw630 && window.__sw630['#fxl .fx-plus.hb:not(.lng)']);   /* 630 — 걷혔으면 stash */
      if (n) { if (!n.isConnected) document.getElementById('fxl').appendChild(n); n.classList.add('bad574'); }
      const v = window.__sw574('#fxl .fx-plus.hb.bad574', 300);
      s.remove();
      return v;
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
    return { rep, lone, bad, life: await p.evaluate(() => window.__life574) };
  })();
  const fr = s => (s ? (s.frac * 100).toFixed(1) + '%' : '노드 없음');
  console.log('  · 위상 훑기 — 반복분 애니 ' + (SW.rep ? SW.rep.dur + 'ms · α=1 ' + (SW.rep.lo * 100).toFixed(1) + '~' + (SW.rep.hi * 100).toFixed(1) + '% = ' + fr(SW.rep) : '노드 없음') +
    ' · 한 발 ' + (SW.lone ? SW.lone.dur + 'ms = ' + fr(SW.lone) : '노드 없음') +
    ' · 되돌림 사본 ' + fr(SW.bad) + ' · 제거 시각 ' + SW.life.rep + '/' + SW.life.lone + 'ms');
  ok(!!SW.rep && SW.rep.frac >= 0.5,
     '[J4] ★ 불투명 구간이 수명의 절반을 넘는다 — 페이드가 수명의 반을 먹지 않는다(574: 표본 비율 대신 위상 훑기)',
     fr(SW.rep) + ' ≥ 50% · 설계 62.5%(키프레임 10~72%)');
  ok(!!SW.lone && SW.lone.frac >= 0.5,
     '[J5] ★ «한 발»(.lng 1.3s)도 같다 — 491 5회차가 늘린 수명이 페이드에 먹히지 않았다',
     fr(SW.lone) + ' ≥ 50% · 설계 64%(키프레임 8~72%)');
  ok(!!SW.bad && SW.bad.frac < 0.5,
     '[J6] ★ 되돌림 시험 — 페이드가 70% 를 먹는 키프레임을 씌운 사본에서 이 자가 빨개진다(무르지 않다)',
     fr(SW.bad) + ' < 50%');
  ok(!!SW.rep && !!SW.lone && Math.abs(SW.life.rep - SW.rep.dur) <= 60 && Math.abs(SW.life.lone - SW.lone.dur) <= 60,
     '[J7] ★ «수명» 이 애니 길이와 같은 것을 가리킨다 — CSS 길이와 JS 제거 시각이 안 어긋난다(어긋나면 다 진 뒤 남는 유령)',
     (SW.rep ? SW.life.rep + '↔' + SW.rep.dur : '-') + ' · ' + (SW.lone ? SW.life.lone + '↔' + SW.lone.dur : '-') + 'ms');

  /* ══ [I] 가림 — 두 줄기의 «봉투» 가 호스트의 정보 요소를 밟지 않는가 ═════ */
  console.log('[I] 봉투 대 정보 요소 — 1회차에 비평가 2인이 손으로 재던 것을 자로 옮긴다');
  const I = await p.evaluate(() => {
    /* 봉투 = 사다리 가로 폭 × 애니메이션 세로 이동 범위. CSS 상수와 같은 값을 여기 적어 두고
       어긋나면 빨개지게 한다(잉크 폭 69 · 상자 높이 32 · 상승 34 · 하강 28 · 칸 5개). */
    const INK = 69, BOXH = 32, UP = 24, DN = 24, SLOTS = 5;   /* 3회차 — 이동 24 로 통일 */
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
    /* 780 — 봉투는 호스트 기준 px 라, 자식 rect 를 호스트 기준으로 옮길 때 쓰는 원점 */
    const h0 = host => host.getBoundingClientRect().top;
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
      /* ⚑⚑ 780 — `.ri` 는 **아이콘 액자(아트)**라 «정보 요소» 가 아니다 — 훈련 `.ci`([I4])·단련 `.ti`([I6])
         와 **같은 규약**이고, 687 이 카드를 700 → 648 로 줄여 «바↔효과 행» 띠를 56 → 32px 로 만든 뒤
         룬의 두 줄기가 이사한 자리가 바로 그 액자다(빈 띠 전수 36·16·10·10·8·10 — 56 이 없다).
         ⚠ 예외를 «비운» 것이 아니라 **옮겼다** — 아래 `inRi` 가 «그럼 액자 안에는 드는가» 를 새로 묻고
           ([I3]), 밟는 자식 목록은 여전히 0 을 요구한다. 신고가 옛 값(248/224)으로 되돌아가면 `.rd` 가
           그 목록에 다시 뜬다(`probe780` §R 이 그 되돌림을 매 실행 재현한다). */
      const ri = host.querySelector('.ri').getBoundingClientRect();
      const inRi = en => en.y1 >= ri.top - h0(host) - 2 && en.y2 <= ri.bottom - h0(host) + 2;
      out.rune = { ok: kidsOf(host, ['ri']).filter(k => hit(e.ok, k)).map(k => k.cls),
                   pay: kidsOf(host, ['ri']).filter(k => hit(e.pay, k)).map(k => k.cls),
                   inWrap: e.ok.y2 <= wrap.height + 4 && e.pay.y2 <= wrap.height + 4,
                   inRi: inRi(e.ok) && inRi(e.pay),
                   /* 780 — 두 줄기는 좌우가 아니라 **위아래**로 갈렸다(단련 [I7] 과 같은 꼴).
                      재는 뜻은 그대로 «둘이 서로 안 만난다» 이고, 간격 문턱은 글리프 높이
                      `HB_INK_H` 34 다(619 13회차가 «룬만 두 띠가 24px» 를 결함으로 적어 둔 값). */
                   sep: Math.max(0, Math.min(e.ok.y2, e.pay.y2) - Math.max(e.ok.y1, e.pay.y1)) === 0
                        && Math.abs(parseFloat(getComputedStyle(host).getPropertyValue('--hb-y2'))
                                  - parseFloat(getComputedStyle(host).getPropertyValue('--hb-y'))) >= 34 };
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
    /* 08 세부 팝업 — 호스트가 «레벨 행» 이라 봉투를 카드(`.skd`) 자식들과 맞댄다.
       `.sk-db`(설명문)는 «홀드 중에 안 바뀌는 산문» 이라 유일하게 허용한 자리다(CSS 주석 참조). */
    try { closeTrain(); } catch (_) {}
    {
      const id = SKILLS[0].id; S.own[id] = { l: 1, n: 1e9 }; S.gold = 1e15;
      showSkillDetail(id);
      const host = document.querySelector('#mbox .sk-lv'), card = document.querySelector('#mbox .skd');
      const e = envs(host), h = card.getBoundingClientRect();
      const kids = [...card.children].map(el => { const b = el.getBoundingClientRect();
        return { cls: (el.className || '').split(/\s+/)[0], x: b.left - h.left, y: b.top - h.top, w: b.width, h: b.height }; })
        .filter(k => k.w > 4 && k.h > 4);
      /* 봉투는 호스트(`.sk-lv`) 기준이므로 카드 기준으로 옮겨서 맞댄다 */
      const lr = host.getBoundingClientRect(), dx = lr.left - h.left, dy = lr.top - h.top;
      const sh = e2 => ({ x1: e2.x1 + dx, x2: e2.x2 + dx, y1: e2.y1 + dy, y2: e2.y2 + dy });
      out.detail = { ok: kids.filter(k => hit(sh(e.ok), k)).map(k => k.cls),
                     pay: kids.filter(k => hit(sh(e.pay), k)).map(k => k.cls) };
      try { closeModal(); } catch (_) {}
    }
    /* 89 유물 그릇 — 그릇 «안» 자식과 맞댄다 */
    {
      S.relic = 1e12; openRelw();
      const host = document.getElementById('rwBasin'), e = envs(host), h = host.getBoundingClientRect();
      const kids = [...host.querySelectorAll('*')].map(el => { const b = el.getBoundingClientRect();
        return { cls: (el.className || '').split(/\s+/)[0], x: b.left - h.left, y: b.top - h.top, w: b.width, h: b.height }; })
        .filter(k => k.w > 6 && k.h > 6 && !['rw-basin', 'rw-stone', 'rw-mid'].includes(k.cls));
      out.relic = { ok: kids.filter(k => hit(e.ok, k)).map(k => k.cls),
                    pay: kids.filter(k => hit(e.pay, k)).map(k => k.cls) };
      try { closeRelw(); } catch (_) {}
    }
    openTrain(); setTrSub('temper'); S.tstone = 1e12; renderTrain();   /* 613 — 직접 지불 */
    {
      const host = document.querySelector('.tr-tp'), e = envs(host);
      /* 612 — 아이콘 104 → 178 확대로 글줄이 옛 빈 띠(중앙)로 왔다. 봉투는 훈련 카드와 같은 처방으로
         아이콘 위로 옮겨졌다 — `.ti` 는 아트라 «정보 요소» 가 아니다([I4] 의 `.ci` skip 과 같은 규약).
         대신 무르게 풀리지 않게 [I6b] 가 «두 봉투가 액자 안에 드는가» 를 같이 잰다. */
      const hR = host.getBoundingClientRect(), tiR = host.querySelector('.ti').getBoundingClientRect();
      const ti = { x1: tiR.left - hR.left, x2: tiR.right - hR.left, y1: tiR.top - hR.top, y2: tiR.bottom - hR.top };
      const inBox = ev => ev.x1 >= ti.x1 - 4 && ev.x2 <= ti.x2 + 4 && ev.y1 >= ti.y1 - 4 && ev.y2 <= ti.y2 + 4;
      out.temper = { ok: kidsOf(host, ['ti']).filter(k => hit(e.ok, k)).map(k => k.cls),
                     pay: kidsOf(host, ['ti']).filter(k => hit(e.pay, k)).map(k => k.cls),
                     inTi: inBox(e.ok) && inBox(e.pay),
                     sep: e.pay.y2 <= e.ok.y1 + 2, hostH: host.getBoundingClientRect().height };
    }
    return out;
  });
  console.log('  · 룬  결과 봉투가 밟는 자식 [' + I.rune.ok.join(',') + '] · 비용 [' + I.rune.pay.join(',') + '] · 그릇 안 ' + I.rune.inWrap + ' · 액자 안 ' + I.rune.inRi + ' · 두 줄기 분리 ' + I.rune.sep);
  console.log('  · 훈련 비용 봉투가 밟는 «정보» 자식 [' + I.train.pay.join(',') + '] · 아이콘 띠 안 ' + I.train.inCi + ' · 사다리 폭 ' + Math.round(I.train.ladder) + ' ≤ 카드 ' + Math.round(I.train.hostW));
  console.log('  · 단련 결과 봉투 [' + I.temper.ok.join(',') + '] · 비용 봉투 [' + I.temper.pay.join(',') + '] · 두 줄기 분리 ' + I.temper.sep);
  ok(I.rune.ok.length === 0 && I.rune.pay.length === 0,
     '[I1] ★ 룬 — 두 봉투가 카드 자식(진행바·효과줄·버튼)을 한 개도 안 밟는다(아이콘 .ri 는 아트 — [I4] 규약)',
     '[' + I.rune.ok.join(',') + '] / [' + I.rune.pay.join(',') + ']');
  ok(I.rune.inWrap, '[I2] 그 자리가 그릇(#trRunes 778px) 안이다 — 팝업 밖으로 안 샌다', String(I.rune.inWrap));
  /* ⚑ 780 — [I3] 은 «좌우 분리» 에서 **«둘이 서로 안 만난다»** 로 방향을 옮겼다(333 처방).
     묻는 성질은 한 칸도 안 줄었다 — 옛 항은 «x 로 갈렸는가» 하나였는데, 새 항은 «봉투 겹침 0» **과**
     «레인 간격 ≥ 글리프 34» 둘을 요구한다(단련이 이미 [I7] 로 쓰던 세로 분리 규약). 여기에 액자 안
     [I3-b] 가 붙어 «예외를 옮긴 자리» 를 못박는다 — 봉투가 아트를 벗어나면 곧바로 빨갛다. */
  ok(I.rune.sep, '[I3] 룬은 두 줄기를 위아래로 갈랐다 — 봉투 겹침 0 · 레인 간격 ≥ 34(글리프 높이)', String(I.rune.sep));
  ok(I.rune.inRi, '[I3-b] ★ 780 — 두 봉투가 아이콘 액자 `.ri` 안에 든다(밟아도 되는 유일한 자리)', String(I.rune.inRi));
  ok(I.train.pay.length === 0 && I.train.inCi,
     '[I4] ★ 훈련 — 비용 봉투가 «공격력»·«Lv» 같은 정보 자식을 안 밟고 아이콘 띠 안에 든다',
     '[' + I.train.pay.join(',') + '] · inCi ' + I.train.inCi);
  ok(I.train.ladder <= I.train.hostW + 1,
     '[I5] ★ 좁은 호스트에서 사다리가 카드 밖(=이웃 카드 위)으로 안 나간다',
     Math.round(I.train.ladder) + ' ≤ ' + Math.round(I.train.hostW));
  ok(I.temper.ok.length === 0 && I.temper.pay.length === 0,
     '[I6] ★ 단련 — 두 봉투가 «정보» 자식(축 이름·레벨·설명·버튼)을 한 개도 안 밟는다(아이콘 .ti 는 아트 — [I4] 규약)',
     '[' + I.temper.ok.join(',') + '] / [' + I.temper.pay.join(',') + ']');
  ok(I.temper.inTi, '[I6b] ★ 612 — 두 봉투가 아이콘 액자(178) 안에 든다(빈 띠가 액자로 옮겨진 것을 잠근다)', String(I.temper.inTi));
  ok(I.temper.sep, '[I7] 단련은 한 칸에 두 줄기를 위아래로 포갰다 — 둘이 서로 안 만난다', String(I.temper.sep));
  console.log('  · 세부 팝업 결과 [' + I.detail.ok.join(',') + '] · 비용 [' + I.detail.pay.join(',') + ']  |  유물 결과 [' + I.relic.ok.join(',') + '] · 비용 [' + I.relic.pay.join(',') + ']');
  ok(I.detail.ok.length === 0 && I.detail.pay.every(c => c === 'sk-db'),
     '[I8] ★ 08/50 세부 — 결과 봉투는 아무것도 안 밟고, 비용 봉투는 «설명문(.sk-db)» 하나만 밟는다',
     '[' + I.detail.ok.join(',') + '] / [' + I.detail.pay.join(',') + ']');
  ok(!I.detail.pay.some(c => ['sk-lv', 'sk-pb', 'sk-ct', 'sk-act'].includes(c)) &&
     !I.detail.ok.some(c => ['sk-lv', 'sk-pb', 'sk-ct', 'sk-act'].includes(c)),
     '[I9] ★ 그 팝업에서 «홀드 중에 바뀌는 것»(레벨·진행바·피해량 표·버튼)은 한 개도 안 밟는다',
     '[' + I.detail.ok.concat(I.detail.pay).join(',') + ']');
  ok(I.relic.ok.length === 0 && I.relic.pay.length === 0,
     '[I10] 89 유물 — 두 봉투가 그릇 안 재료 행·`.rw-cost` 를 안 밟는다',
     '[' + I.relic.ok.join(',') + '] / [' + I.relic.pay.join(',') + ']');

  /* ══ [K] 사다리 기하 — 잉크가 칸보다 좁은가 · 클램프가 칸을 미는가 (5회차 신설) ══ */
  console.log('[K] 사다리 — «잉크 폭 < 칸 간격» 과 «클램프가 칸을 안 민다»(4·5회차에 두 번 깨진 자리)');
  const K = await p.evaluate(() => {
    const SLOTS = 5, INK_FALLBACK = 69;
    const out = [];
    const meas = (name, hostSel, txts) => {
      const host = document.querySelector(hostSel); if (!host) return;
      const cs = getComputedStyle(host), r = host.getBoundingClientRect();
      const num = (k, d0) => { const v = parseFloat(cs.getPropertyValue(k)); return Number.isFinite(v) ? v : d0; };
      const n = Math.max(2, Math.round(num('--hb-slots', SLOTS)));
      const sw = Number.isFinite(num('--hb-sw', NaN)) ? num('--hb-sw', NaN)
               : Math.max(34, Math.min(80, (r.width - 70) / Math.max(1, n - 1)));
      const pad = num('--hb-pad', 26);
      /* 잉크 폭은 «상상» 하지 않고 진짜로 하나 그려서 잰다 — 문자열마다 다르다(「+1」29 ↔ 「−53」54) */
      const L = document.getElementById('fxl');
      /* 제품과 **같은 규칙**으로 눌러 넣은 뒤 잰다(150 규약 — 긴 문자열은 칸에 맞춰 fs 를 줄인다) */
      let ink = 0;
      for (const t of txts) {
        const d = document.createElement('b');
        d.className = 'fx-plus hb'; d.style.left = '-9999px'; d.textContent = t;
        L.appendChild(d);
        const maxW = Math.max(24, sw - 8);
        for (let i = 0; i < 4 && d.offsetWidth > maxW; i++) {
          const base = parseFloat(getComputedStyle(d).fontSize) || 30;
          d.style.fontSize = Math.max(16, base * maxW / d.offsetWidth).toFixed(1) + 'px';
        }
        ink = Math.max(ink, d.offsetWidth); d.remove();
      }
      if (!ink) ink = INK_FALLBACK;
      /* 끝 칸이 클램프에 걸리는가 — 두 줄기 중심을 각각 본다 */
      const worst = ['--hb-x', '--hb-x2'].map(k => {
        const cx = num(k, 0.5) * r.width, half = ink / 2;
        const end = cx + (n - 1) / 2 * sw;                    /* 바깥 칸 중심 */
        const hi = r.width - half - pad, lo = half + pad;
        return Math.max(0, end - hi, lo - (cx - (n - 1) / 2 * sw));
      });
      out.push({ name, n, sw: +sw.toFixed(1), ink, gap: +(sw - ink).toFixed(1), pad, push: +Math.max(...worst).toFixed(1) });
    };
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    meas('룬 카드', '.tr-rn', ['+1', '실패', '−1,234']);
    setTrSub('temper'); S.tstone = 1e12; renderTrain();   /* 613 — 직접 지불 */
    meas('단련 행', '.tr-tp', ['+1', '−1,234']);
    setTrSub('train'); renderTrain();
    meas('훈련 카드', '.tr-card', ['−53', '−2.12M']);
    return out;
  });
  K.forEach(k => console.log('  · ' + k.name.padEnd(8) + ' 칸 ' + k.n + '개 × ' + k.sw + 'px · 최장 잉크 ' + k.ink
    + 'px · 이웃 빈 폭 ' + k.gap + 'px · 클램프가 미는 양 ' + k.push + 'px'));
  ok(K.length === 3, '[K1] 세 호스트를 다 쟀다', K.map(k => k.name).join(','));
  ok(K.every(k => k.gap >= 8), '[K2] ★ 이웃 빈 폭 ≥ 8px — 두 알림이 한 문자열로 붙지 않는다',
     K.map(k => k.name + ' ' + k.gap).join(' · '));
  ok(K.every(k => k.push <= 0.5), '[K3] ★ 클램프가 끝 칸을 밀지 않는다 — 격자가 균일하다',
     K.map(k => k.name + ' ' + k.push).join(' · '));

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


  /* ⚑ 540 — 유령 재유입 차단(524 가 349 에서 겪은 «가끔 22~24/24» 의 씨앗) */
  const cl540 = await missingClosers(p);
  ok(cl540.length === 0,
    '★ 540 — 닫개 이름이 전부 제품에 실재한다(typeof 가드가 유령을 삼키지 않는다)',
    cl540.length ? '없는 이름 ' + cl540.join(' , ') : '전부 실재');
  ok(!(await defeatStuck(p)),
    '★ 540 — 측정이 끝난 시점에 18 패배 화면이 켜져 있지 않다(켜지면 뒤 표본이 전부 «0회» 다)',
    await blockedLabel(p));
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY488 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
