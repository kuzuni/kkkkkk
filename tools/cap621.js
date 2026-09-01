#!/usr/bin/env node
/* 작업 621 채점 캡처 — 「연속 강화 중 버튼 눌림 왕복」 연속 프레임
 * (지시서 [3]-(다) 연출 작업: 정지 1장이 아니라 **연속 프레임 6~8장**을 80~100ms 간격으로)
 *
 *   node tools/cap621.js [회차]
 *
 * 세 자리(훈련 카드 · 룬 [강화] · 단련 [단련]) ×
 *   「쉼 1장 + 홀드 실시간 10장(45ms 간격) + 한 사이클 위상 6장(c1~c6) + 뗌 1장」.
 * 크롭 상자는 **누르기 전 배치 자리**로 고정한다 — 상자가 따라 커지면 크기 변화가 안 보인다.
 * 프레임마다 그 순간의 눌림 층(computed `scale`)과 그려진 폭을 같이 적어 `-frames.json` 으로 남긴다
 * (비평가에게는 **그림만** 주고, 수치는 review 표에 쓴다).
 *
 * ⚠ PNG 는 커밋하지 않는다 — `docs/review/*.png` 는 .gitignore 가 막는다(2026-08-30 이력 정리).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
/* ⚠ 1회차 교훈 — **간격을 틱 주기와 비슷하게 잡으면 앨리어싱으로 «안 눌린다» 가 찍힌다.**
   1회차는 90ms 로 찍었는데 실측 틱 간격이 88~127ms 라 표본이 매번 같은 위상(틱 직후 = 원래 크기)에
   떨어졌다 — 비평가 CI 가 «단련은 8장 중 눌린 장이 2장뿐» 으로 읽은 것이 그것이다(rAF 자로는 같은
   구간의 눌림 듀티가 49~60%). ⇒ 간격을 **45ms** 로 내려 위상을 골고루 훑는다. */
const IV = Number(process.env.C621_IV || 45);
const N = Number(process.env.C621_N || 10);
/* 한 사이클 위상 스윕 — 홀드 루프를 멈춘 뒤 같은 부품을 한 번 돌리고 위상을 고정해 찍는다.
   «틱 하나가 어떻게 생겼는가» 는 실시간 표본으로는 운에 맡겨야 해서 따로 만든다. */
const PH = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1];

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  const made = [], meta = {};
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(450);
    const r = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = (typeof jzRestRect === 'function') ? jzRestRect(el) : el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!r) { console.log('  ↯ ' + sp.id + ' 대상 없음'); continue; }

    /* 크롭 — 배치 자리 + 여백 24px(눌림 8px 이동과 1.06 맥박이 잘리지 않게) */
    const M = 24;
    const clip = { x: Math.max(0, r.x - M), y: Math.max(0, r.y - M), width: r.w + M * 2, height: r.h + M * 2 };
    const shot = async tag => {
      const f = path.join(OUT, '621-r' + R + '-' + sp.id + '-' + tag + '.png');
      await page.screenshot({ clip, path: f, animations: 'allow' });
      made.push(path.basename(f));
      return f;
    };
    const sample = () => page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      let sc = 'none'; try { sc = getComputedStyle(el).scale; } catch (_) {}
      return { sc, w: Math.round(el.getBoundingClientRect().width * 100) / 100 };
    }, sp.sel);

    meta[sp.id] = { n: sp.n, rest: r, frames: [] };
    await shot('rest');
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(420);                 /* 첫 발·350ms 대기를 지나 «반복» 구간에서 찍는다 */
    for (let i = 0; i < N; i++) {
      const m = await sample();
      await shot('f' + String(i + 1));
      meta[sp.id].frames.push({ i: i + 1, sc: m ? m.sc : 'n/a', w: m ? m.w : 0 });
      await page.waitForTimeout(IV);
    }
    /* ── 한 사이클 위상 스윕(c1~c6) — 홀드 타이머를 멈추고 같은 부품 한 번을 위상별로 정지시켜 찍는다 ── */
    const CD = 140;
    /* ⚠⚠ 2회차 교훈 — **위상을 고정해도 노드가 갈리면 그림이 어긋난다.**
       비평가 CJ 가 2회차 룬 c3 을 «바닥에서 414px 로 되튐» 으로 읽었는데, 로그는 같은 프레임을 389 로 적었다.
       원인은 `renderTrain` 의 지연 재렌더(`rtRenderFlush`)가 정지시킨 애니메이션의 **호스트 노드를 갈아**
       스크린샷 때는 눌림이 통째로 없는 새 노드가 찍힌 것이다. ⇒ 스윕 동안에는 렌더러를 **멈춰** 둔다
       (제품은 한 줄도 안 고친다 — 캡처 하네스에서만 감싼다). */
    await page.evaluate(() => {
      if (window.__c621stub) return;
      window.__c621stub = { rt: window.renderTrain, rtl: window.renderTrainLive };
      window.renderTrain = () => {}; window.renderTrainLive = () => {};
    });
    for (let i = 0; i < PH.length; i++) {
      const m = await page.evaluate(([s, dur, frac]) => {
        const el = document.querySelector(s); if (!el) return null;
        if (window.trHold && trHold.timer) clearTimeout(trHold.timer);
        if (window.rtHold && rtHold.timer) clearTimeout(rtHold.timer);
        const an = jzPressTick(el, dur);      /* ⚠ `getAnimations()` 로 고르면 CSS 애니(jz-hb)를 집는다 */
        if (!an) return null;
        /* ⚠⚠ 길이는 **애니에게 묻는다** — 제품은 «직전 틱과의 실측 간격» 으로 스스로 정하므로
           하네스가 넘긴 dur 로 위상을 계산하면 엉뚱한 자리를 찍는다(3회차에 45%·60% 칸이 그렇게 바닥으로 찍혔다). */
        const real = an.effect.getComputedTiming().duration;
        an.pause(); an.currentTime = frac * real;
        let sc = 'none'; try { sc = getComputedStyle(el).scale; } catch (_) {}
        return { sc, w: Math.round(el.getBoundingClientRect().width * 100) / 100 };
      }, [sp.sel, CD, PH[i]]);
      await shot('c' + (i + 1));
      meta[sp.id].cycle = meta[sp.id].cycle || [];
      meta[sp.id].cycle.push({ i: i + 1, phase: PH[i], sc: m ? m.sc : 'n/a', w: m ? m.w : 0 });
    }
    /* 찍은 뒤 폭을 한 번 더 물어 «그림과 로그가 같은 노드» 임을 확인한다(어긋나면 표에 적힌다) */
    await page.evaluate(() => {
      if (!window.__c621stub) return;
      window.renderTrain = window.__c621stub.rt; window.renderTrainLive = window.__c621stub.rtl;
      window.__c621stub = null;
    });
    await page.mouse.up();
    await page.waitForTimeout(320);
    await shot('after');
  }

  fs.writeFileSync(path.join(OUT, '621-r' + R + '-frames.json'), JSON.stringify(meta, null, 1));
  console.log(made.length + '장 — ' + OUT);
  for (const k of Object.keys(meta)) {
    console.log('  ' + k + ' 실시간 ' + meta[k].frames.map(f => f.i + ':' + f.sc + '/' + f.w).join('  '));
    if (meta[k].cycle) console.log('  ' + k + ' 사이클 ' + meta[k].cycle.map(f => f.phase + ':' + f.sc + '/' + f.w).join('  '));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
