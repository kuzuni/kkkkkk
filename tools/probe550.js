#!/usr/bin/env node
/* 재현 — 작업 550 「`verify471` [F] «기각 유지 — 35 패스 탭» 1건이 빨갛다(어긋남 0.8/14.5, 허용 3)」
 *
 *   node tools/probe550.js
 *
 * 338 규칙대로 **처방 전에 재현한다.** 등재문의 갈래는 둘이었다 —
 *   ⓐ **자 문제**(상자와 그림을 서로 다른 순간에 잰다) · ⓑ **자리 이동**(428·493 이 마크업을 만졌다).
 *
 * 이 자는 `probe471` 의 환경을 그대로 세운다(세이브 주입 · `step` 무력화 · 전투 캔버스 숨김 ·
 * `transition:none`). 그래야 «자가 무엇을 보고 있었나» 를 같은 조건에서 물을 수 있다.
 *
 * 묻는 것:
 *   [1] 장면 대기 `openPass('stage'); await wait(250)` 가 끝난 **바로 그 순간** 호스트
 *       `#psBar .pt` 의 상자가 «멎은 상자» 와 같은가. (다르면 자가 움직이는 것을 잰다)
 *   [2] 그 순간 `#psw` 에 **도는 애니메이션**이 있는가 — 이름·경과/길이.
 *   [3] 두 값의 차가 [F] 의 빨간 값(어긋남 상 14.5)을 **기하로 설명**하는가 —
 *       `jzPgIn` 은 `scale:.985 → 1` 이고 축은 패널 중심이라, 패널 하단의 탭은
 *       «패널 높이 × (1−s)/2» 만큼 위로 올라가 보인다.
 *   [4] `--drain`(멎을 때까지 기다렸다 읽기)을 켜면 [1] 이 초록으로 뒤집히는가.
 *
 * ⚠ 허용치(3)는 한 칸도 안 건드린다 — 이 자는 «누가 움직였나» 만 이름으로 특정한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const N = Number(process.env.P550_N || 5);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  /* probe471 과 **같은 환경** — 다른 조건에서 재면 대조가 안 된다(385 «자매 자 드리프트»). */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });

  /* probe471 의 `settle()` — 유한 애니는 끝까지 보내고 무한 애니만 0프레임에 세운다. */
  const settle = () => page.evaluate(() => {
    document.getAnimations().forEach(a => {
      try {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        if (t && t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.finish(); }
      } catch (e) {}
    });
  });

  /* 한 판 = 장면을 열고 → 250ms 뒤 상자를 읽고 → 멎힌 뒤 다시 읽는다. */
  const round = async (drain) => {
    await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      if (document.getElementById('psw') && document.getElementById('psw').classList.contains('on')) {
        closePass(); await wait(300);
      }
      openPass('stage'); await wait(250);          /* probe471 SCENES 의 그 대기 그대로 */
    });
    if (drain) {                                    /* 처방 후보 — 멎을 때까지 반복해서 세운다 */
      for (let i = 0; i < 12; i++) {
        await settle();
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const live = await page.evaluate(() => document.getAnimations().filter(a => {
          const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          return !(t && t.iterations === Infinity) && a.playState === 'running';
        }).length);
        if (!live) break;
      }
    }
    const at250 = await page.evaluate(() => {
      const q = document.querySelector('#psBar .pt').getBoundingClientRect();
      const psw = document.getElementById('psw');
      const pq = psw.getBoundingClientRect();
      return { t: +q.top.toFixed(2), r: +q.right.toFixed(2), w: +q.width.toFixed(2), h: +q.height.toFixed(2),
        panelH: +pq.height.toFixed(1),
        anims: psw.getAnimations().map(a => (a.animationName || '?') + '@' + Math.round(a.currentTime || 0) +
          '/' + Math.round((a.effect && a.effect.getTiming().duration) || 0)) };
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 900)));   /* 확실히 멎힌다 */
    await settle();
    const rest = await page.evaluate(() => {
      const q = document.querySelector('#psBar .pt').getBoundingClientRect();
      return { t: +q.top.toFixed(2), r: +q.right.toFixed(2), w: +q.width.toFixed(2), h: +q.height.toFixed(2) };
    });
    return { at250, rest };
  };

  /* ── [1]·[2] 수리 전 — 장면 대기가 끝난 순간의 상자 ── */
  console.log('\n[1] `openPass(\'stage\'); wait(250)` 직후의 `#psBar .pt` 상자 (수리 전 = drain 없음)');
  const raw = [];
  for (let i = 0; i < N; i++) {
    const r = await round(false);
    raw.push(r);
    console.log('  ' + (i + 1) + '회  250ms: top ' + r.at250.t + ' · ' + r.at250.w + '×' + r.at250.h +
      '   멎음: top ' + r.rest.t + ' · ' + r.rest.w + '×' + r.rest.h +
      '   Δtop ' + (+(r.rest.t - r.at250.t).toFixed(2)) +
      '   anim[' + (r.at250.anims.join(',') || '없음') + ']');
  }
  const moved = raw.filter(r => Math.abs(r.rest.t - r.at250.t) > 3);
  ok(moved.length > 0, '[1] 장면 대기 직후의 상자가 «멎은 상자» 와 다르다 (자가 움직이는 것을 잰다)',
    moved.length + '/' + N + '회 · Δtop ' + raw.map(r => (+(r.rest.t - r.at250.t).toFixed(1))).join('/'));
  const withAnim = raw.filter(r => r.at250.anims.length > 0);
  ok(withAnim.length > 0, '[2] 그 순간 `#psw` 에서 `jzPgIn` 이 아직 돌고 있다',
    withAnim.length + '/' + N + '회 · ' + (withAnim[0] ? withAnim[0].at250.anims.join(',') : '—'));

  /* ── [3] 기하로 설명되는가 ── */
  const bad = moved[0] || raw[0];
  const s = bad.at250.h / bad.rest.h;                        /* 그 프레임의 실효 배율 */
  const predicted = bad.at250.panelH * (1 - s) / 2;          /* 패널 중심 축 ⇒ 하단 요소가 올라가는 양 */
  console.log('\n[3] 기하 검산 — 그 프레임 배율 ' + s.toFixed(4) + ' (jzPgIn 0% = .985) · 패널 높이 ' +
    bad.at250.panelH + ' ⇒ 하단 탭이 올라가는 양 ≈ ' + predicted.toFixed(1) + 'px · 실측 Δtop ' +
    (+(bad.rest.t - bad.at250.t).toFixed(1)) + 'px');
  ok(Math.abs(predicted - (bad.rest.t - bad.at250.t)) < 4,
    '[3] Δtop 이 «패널 중심 축 scale» 로 설명된다 (제품이 움직인 것이 아니라 자가 애니 중에 읽었다)',
    '예측 ' + predicted.toFixed(1) + ' ↔ 실측 ' + (+(bad.rest.t - bad.at250.t).toFixed(1)));
  ok(Math.abs(bad.rest.t - bad.at250.t) > 10,
    '[3] 그 크기가 [F] 의 빨간 값(어긋남 상 14.5)과 같은 자릿수다', 'Δtop ' + (+(bad.rest.t - bad.at250.t).toFixed(1)) + 'px');

  /* ── [4] 처방 후보 — 멎을 때까지 기다렸다 읽으면 ── */
  console.log('\n[4] 처방 후보(`drain`: 멎을 때까지 세우고 읽기)');
  const fixed = [];
  for (let i = 0; i < N; i++) {
    const r = await round(true);
    fixed.push(r);
    console.log('  ' + (i + 1) + '회  읽음: top ' + r.at250.t + ' · ' + r.at250.w + '×' + r.at250.h +
      '   멎음: top ' + r.rest.t + '   Δtop ' + (+(r.rest.t - r.at250.t).toFixed(2)) +
      '   anim[' + (r.at250.anims.join(',') || '없음') + ']');
  }
  ok(fixed.every(r => Math.abs(r.rest.t - r.at250.t) < 0.5),
    '[4] drain 을 켜면 «읽은 상자 = 멎은 상자» 가 N회 전부 성립한다',
    N + '/' + N + '회 · Δtop ' + fixed.map(r => (+(r.rest.t - r.at250.t).toFixed(1))).join('/'));
  ok(fixed.every(r => r.at250.anims.length === 0),
    '[4] drain 뒤에는 `#psw` 에 도는 애니메이션이 한 건도 없다',
    fixed.map(r => r.at250.anims.length).join('/') + '건');

  await browser.close();
  console.log('\nPROBE550 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
