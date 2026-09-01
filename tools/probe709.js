#!/usr/bin/env node
/* 작업 709 재현자 — `tools/verify488.js` [J2] «나이와 진행의 차(중앙값) ≤ 25ms» 가 문턱에 붙어 흔들리는
 * 이유를 **분해해서** 잰다 (2026-09-01, 루틴 워커 B)
 *
 *   node tools/probe709.js            (기본 3회 반복)
 *   PROBE709_N=6 node tools/probe709.js
 *
 * ⚠ 338 규칙 — 처방 전에 재현한다. 344 규약 — «플레이키» 는 한마디가 아니라 **분포**로 말한다.
 *
 * [J2] 가 재는 값은 한 덩어리가 아니라 **세 항의 합**이다. 이 자는 그 셋을 따로 찍는다:
 *
 *     lag = age − ct
 *         = (perfNow − born_perf) − (timelineNow − animStart)
 *         = ⟨A_snap⟩ − ⟨A_birth⟩ + ⟨B⟩
 *
 *   ⟨A⟩ = performance.now() − document.timeline.currentTime
 *         = «마지막 프레임이 시작된 뒤 흐른 시간». 스크립트가 도는 동안 perf 시계는 **가는데**
 *           타임라인 시계는 **프레임에 얼어 있다** — 러너가 바빠 프레임이 길어지면 그대로 커진다.
 *           태어날 때(A_birth)와 스냅숏 때(A_snap)가 서로 무관한 위상이라 **차가 그대로 잡음**이다.
 *   ⟨B⟩ = animation.startTime − born_tl   ← **두 값이 같은 시계다**
 *         = «만든 그 순간 ↔ 애니가 시작한 시각». 이것이 [J2] 가 **재려던 것**이고,
 *           488 4회차 처방 ⓐ 가 제품에 박아 둔 그 등식이다(index.html ~38807:
 *           `a.startTime = document.timeline.currentTime`).
 *
 * 즉 [J2] 는 «애니가 제때 시작하는가»(B) 를 재려다가 **두 시계의 위상차**(A_snap − A_birth)를 같이
 * 재고 있다. 프레임 길이가 곧 문턱이 되므로, 러너가 바쁘면 제품이 한 줄도 안 바뀌어도 빨개진다.
 *
 * ⚠ **새 축이 무르지 않다는 것을 이 자가 직접 못박는다** — 제품의 그 한 줄을 되돌린 사본
 *   (`a.startTime = null` = «다음 스타일 플러시에 정해지게» 둔 수리 전 거동)에서 ⟨B⟩ 가
 *   **한 프레임으로 뛴다**. [7] 이 그것을 단언한다.
 *
 * 표본 크기도 같이 찍는다 — 스냅숏 4장 × 동시 생존 2장 ≈ **8장**이라 «중앙값» 이 8개짜리 순서통계량이다
 * (574 가 [J4] 에서 잡은 것과 같은 병 · LESSONS 574).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.P709_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const N = Number(process.env.PROBE709_N || 3);

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const n1 = v => (Number.isFinite(v) ? v.toFixed(1) : '—');
const spread = a => { const f = a.filter(Number.isFinite); return f.length ? Math.max(...f) - Math.min(...f) : NaN; };

(async () => {
  const browser = await launch(chromium);
  const runs = [];

  for (let it = 0; it < N; it++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await p.waitForTimeout(1200);
    await install(p, { arm: true });
    const cdp = await ctx.newCDPSession(p);

    /* verify488 [J] 와 **같은 자리·같은 조건**을 만든다 — 룬 강화 실패 갈래의 회당 사다리 */
    await p.evaluate(() => {
      if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
      if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
      if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
      runeRate = () => 0;
      try { closeModal(); closeRelw(); } catch (_) {}
      S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
      openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
      /* ⚑ 이 자의 핵심 — 태어난 시각을 **두 시계로 같이** 적는다.
         verify488 은 `performance.now()` 하나만 적어 두고 스냅숏에서 타임라인 시계(ct)와 맞댄다.
         ⚠ bornTl 은 **반올림하지 않는다** — 새 축의 폭이 반올림 잡음에 묻히면 안 된다. */
      window.__revert = false;
      if (!window.__p709) {
        window.__p709 = true;
        const of = window.hbFloat;
        window.hbFloat = function () {
          const r = of.apply(this, arguments);
          const L = document.getElementById('fxl'), n = L && L.lastElementChild;
          if (n && /fx-plus/.test(n.className || '')) {
            n.dataset.born = Math.round(performance.now());        /* verify488 과 동일(현행 축 재현용) */
            n.dataset.bornTl = String(document.timeline.currentTime); /* 같은 순간 · 타임라인 시계 · 무반올림 */
            /* 되돌림 팔 — 제품이 박아 둔 «시작 시각 못박기» 를 벗긴다(수리 전 거동) */
            if (window.__revert) { try { const a = n.getAnimations()[0]; if (a) a.startTime = null; } catch (_) {} }
          }
          return r;
        };
      }
      /* 프레임 주기 표본 — 홀드 중 rAF 간격을 그대로 모은다 */
      window.__fr = [];
      (function loop(prev) {
        requestAnimationFrame(t => { if (prev != null) window.__fr.push(t - prev); loop(t); });
      })(null);
    });
    await p.waitForTimeout(450);

    const btn = await (async () => {
      const sel = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';
      try { await p.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 4000 }); } catch (_) {}
      const bb = await p.locator(sel).first().boundingBox({ timeout: 4000 }).catch(() => null);
      return bb && bb.width ? { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 } : null;
    })();
    if (!btn) { console.log('  (버튼을 못 잡았다 — 이 회차는 건너뛴다)'); await ctx.close(); continue; }

    /* 한 팔 = 홀드 한 번 + 스냅숏 4장. verify488 [J] 와 같은 박자다. */
    const arm = async revert => {
      await p.evaluate(v => { window.__revert = v; }, revert);
      await p.waitForTimeout(400);
      const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: btn.x, y: btn.y }] });
      const t0 = Date.now(); const rows = [];
      for (const t of [900, 1500, 2100, 2700]) {
        while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 5));
        rows.push(await p.evaluate(() => {
          const now = performance.now(), tl = document.timeline.currentTime;
          return {
            A_snap: now - tl,
            rows: [...document.querySelectorAll('#fxl .fx-plus.hb')].map(n => {
              const a = n.getAnimations()[0];
              return {
                age: now - (+n.dataset.born || now),
                ct: a ? (a.currentTime || 0) : -1,
                stTime: a && a.startTime != null ? a.startTime : null,
                bornTl: +n.dataset.bornTl,
                A_birth: (+n.dataset.born) - (+n.dataset.bornTl),
                delay: a && a.effect ? (a.effect.getTiming().delay || 0) : null,
              };
            }),
          };
        }));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await st.catch(() => {});
      await p.waitForTimeout(400);
      const flat = rows.flatMap(s => s.rows.map(r => ({ ...r, A_snap: s.A_snap })));
      const lagOld = flat.map(r => Math.abs(r.age - r.ct));
      /* ⟨B⟩ — 만든 순간 ↔ 애니 시작 시각. 두 값이 **같은 타임라인 시계**라 위상이 안 낀다.
         startTime 이 아직 안 정해진 노드(되돌림 팔의 «다음 플러시 대기»)는 그 자체가 결함이라
         한 프레임 벌점으로 세지 말고 **판정에서 안 빼고** 별도로 센다. */
      const B = flat.filter(r => r.stTime != null && Number.isFinite(r.bornTl)).map(r => Math.abs(r.stTime - r.bornTl));
      return {
        n: flat.length, nNoStart: flat.filter(r => r.stTime == null).length,
        lagMed: med(lagOld), lagMax: Math.max(...lagOld, 0),
        Asnap: rows.map(s => s.A_snap), Abirth: flat.map(r => r.A_birth),
        Bmed: med(B), Bmax: Math.max(...B, 0),
        delays: [...new Set(flat.map(r => r.delay))],
      };
    };

    const base = await arm(false);
    const rev = await arm(true);
    const fr = await p.evaluate(() => window.__fr.slice());
    await ctx.close();

    const rec = { base, rev, frMed: med(fr), frMax: Math.max(...fr, 0), frN: fr.length };
    runs.push(rec);
    console.log('· 회차 ' + (it + 1) + ' — 표본 ' + base.n +
      ' | [J2] 현행 축 중앙 ' + n1(base.lagMed) + 'ms(최대 ' + n1(base.lagMax) + ')' +
      ' | ⟨A_snap⟩ ' + base.Asnap.map(v => n1(v)).join('/') +
      ' | ⟨A_birth⟩ 중앙 ' + n1(med(base.Abirth)) +
      ' | ⟨B⟩ 중앙 ' + n1(base.Bmed) + '(최대 ' + n1(base.Bmax) + ')' +
      ' | 프레임 중앙 ' + n1(rec.frMed) + 'ms(최대 ' + n1(rec.frMax) + ')' +
      '\n            └ 되돌림 팔 — 표본 ' + rev.n + ' | ⟨B⟩ 중앙 ' + n1(rev.Bmed) +
      '(최대 ' + n1(rev.Bmax) + ') · startTime 미정 ' + rev.nNoStart + '장 | 현행 축 중앙 ' + n1(rev.lagMed));
  }
  await browser.close();

  console.log('\n[결과] ' + runs.length + '회');
  const lagMeds = runs.map(r => r.base.lagMed), Bmeds = runs.map(r => r.base.Bmed);
  const revB = runs.map(r => r.rev.Bmed), frMeds = runs.map(r => r.frMed);
  const Aall = runs.flatMap(r => [...r.base.Asnap, ...r.base.Abirth]);
  console.log('  · [J2] 현행 축 중앙값 분포 : ' + lagMeds.map(v => n1(v)).join(' · ') + '   (문턱 25 · 폭 ' + n1(spread(lagMeds)) + ')');
  console.log('  · ⟨B⟩ 새 축 중앙값 분포   : ' + Bmeds.map(v => n1(v)).join(' · ') + '   (폭 ' + n1(spread(Bmeds)) + ')');
  console.log('  · ⟨B⟩ 되돌림 팔          : ' + revB.map(v => n1(v)).join(' · '));
  console.log('  · 프레임 주기 중앙값       : ' + frMeds.map(v => n1(v)).join(' · '));
  console.log('  · ⟨A⟩ 두 시계 위상차 전체 : 중앙 ' + n1(med(Aall)) + ' · 최대 ' + n1(Math.max(...Aall, 0)));
  console.log('  · 애니 선언 delay          : ' + [...new Set(runs.flatMap(r => r.base.delays))].join(','));

  ok(runs.length > 0, '[1] 표본을 얻었다', runs.length + '회');
  ok(runs.every(r => r.base.n >= 8), '[2] verify488 [J] 와 같은 표본 크기다(스냅숏 4 × 동시 생존 2 ≈ 8장)',
     runs.map(r => r.base.n).join('·'));
  /* ⟨A⟩ 가 0 이 아니라는 것 = «두 시계가 서로 다른 위상에 있다» 는 재현 그 자체다. */
  ok(Math.max(...Aall, 0) > 5, '[3] ★ ⟨A⟩ 두 시계 위상차가 실재한다 — perf 시계와 타임라인 시계는 같은 순간이 아니다',
     '최대 ' + n1(Math.max(...Aall, 0)) + 'ms · 프레임 ' + n1(med(frMeds)) + 'ms');
  /* ⟨B⟩ 가 0 부근이면 «애니는 만든 그 순간 시작하고 있다» = [J2] 의 빨강은 제품 결함이 아니다. */
  ok(Bmeds.every(v => Number.isFinite(v) && v <= 8),
     '[4] ★ ⟨B⟩(만든 순간 ↔ 애니 시작)는 8ms 안이다 — 애니는 «만든 그 순간» 시작하고 있다(제품 정상)',
     '중앙값 ' + Bmeds.map(v => n1(v)).join('·'));
  /* 새 축이 현행 축보다 **덜 흔들린다** — 이것이 축을 옮기는 근거다(635 선례). */
  ok(spread(Bmeds) <= spread(lagMeds) + 0.001,
     '[5] ★ 새 축 ⟨B⟩ 의 회차 간 폭이 현행 축보다 좁다 — 문턱을 안 내리고도 흔들림이 준다',
     '⟨B⟩ 폭 ' + n1(spread(Bmeds)) + ' ≤ lag 폭 ' + n1(spread(lagMeds)));
  ok([...new Set(runs.flatMap(r => r.base.delays))].every(d => d === 0),
     '[6] 애니 선언 delay 는 0 이다 — «늦게 시작» 의 선언적 근거는 없다',
     [...new Set(runs.flatMap(r => r.base.delays))].join(','));
  /* ★ 되돌림 시험 — 제품의 «시작 시각 못박기» 한 줄을 벗기면 새 축이 **반드시** 빨개져야 한다.
     안 빨개지면 새 축은 무른 자다(334 가 기각한 ② 와 같은 꼴). */
  ok(runs.every(r => Number.isFinite(r.rev.Bmed) ? r.rev.Bmed > 8 : r.rev.nNoStart > 0),
     '[7] ★ 되돌림 시험 — 제품의 «startTime 못박기» 를 벗기면 ⟨B⟩ 가 한 프레임으로 뛴다(새 축은 무르지 않다)',
     revB.map(v => n1(v)).join('·') + ' vs 문턱 8 · 프레임 ' + n1(med(frMeds)));
  /* 그리고 현행 축은 그 되돌림을 **놓칠 수도 있다** — 잡음이 신호보다 커서다(기록만) */
  console.log('  · (기록만) 되돌림 팔의 현행 축 중앙값 : ' + runs.map(r => n1(r.rev.lagMed)).join(' · ') +
              ' — 잡음(⟨A⟩ 폭 ±한 프레임)이 신호(한 프레임)와 같은 크기다');

  console.log('\nPROBE709 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
