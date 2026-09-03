#!/usr/bin/env node
/* 작업 512 게이트 — 「보상 연출이 «받은 재화» 를 따라간다」.
 *
 *   node tools/verify512.js
 *
 * 주인 지시: «다이아 보상이면 다이아 효과, 골드면 골드효과, 유물석이면 유물석».
 * 이 자가 지키는 것 여섯(등재문 ⑴~⑹) + 색이 실제로 갈리는가(87·412 계보):
 *   [A] 표 한 벌 — `FXCUR` 키 ⊂ `CUR_ICON` 키(402 «표 두 벌» 부패 방지) · 비티켓 재화 전수 등재
 *   [B] 색 리터럴 0건 — 연출 색은 표(`FXCUR`·`FXPAL`)에서만 나온다
 *   [C] 재화별 버스트 색 = 그 재화 색(골드 자리는 금색 · 유물조각 자리는 유물 색)
 *   [D] 알약 없는 재화(강화석·룬강화석·단련석·마일리지·닫힌 바의 유물조각)도 연출이 **0건이 아니다**
 *       — 비행은 안 만들되(도착지가 없다) 버스트 + `+n` 은 뜬다
 *   [E] 쌍별 ΔE76 ≥ 12 — 87 이 50색에 쓴 통과선 10.3 보다 넓게(색이 7종이면 더 쉬워야 한다)
 *   [F] 41 재화 바(`.pcb-r`)가 열려 있으면 유물조각은 **그 바로 날아간다**(fxPill 의 41 규칙)
 *   [G] 찍힌 픽셀(412 방식) — 룰렛 수령 프레임에서 **바뀐 픽셀**을 세면 dia 색이 지배하고 금색이 0 이다
 *   [R] 되돌림 — 표의 색을 상수 크림 하나로 되돌리면 [C]·[G] 가 즉시 빨개진다
 *
 * ⚠ 배경 전투가 돌면 킬 골드가 매 프레임 들어와 모든 씬에 금색이 섞인다(probe512 1회차 사고).
 *   `window.step = () => {}` 로 전투만 멈추고 연출 루프(fxTick)는 그대로 돌린다.
 *
 * ⚑ 808 (2026-09-02) — [G]·[R] 의 «언제 찍는가» 를 고쳤다. 종전에는 `roulFinish()` 뒤
 *   **고정 110ms** 에 스크린샷 한 장을 찍었는데, 버스트가 사는 창은 390ms(스파크 수명 .38s +
 *   `fxBye`)이고 1080×2280 스크린샷은 이 러너에서 0.5s 안팎이라 **캡처가 창보다 크다** —
 *   부하에 따라 봉우리(크림 2,600~4,000)와 빈 창(430~540ms 구간, 크림 128)이 갈렸다(플레이키).
 *   이제 `__v512.holdScene()` 이 태어난 연출 노드의 제거·CSS 애니만 세워 두고 찍는다.
 *   재현·근거는 `node tools/probe808.js`(부하 옵션 포함), 기록은 `docs/review/808-verify512R1플레이키.md`.
 *
 * ⚑ 836 (2026-09-03) — 808 의 홀드가 **어느 프레임에** 서는지를 고쳤다. MutationObserver 의 손이
 *   노드가 그려지기 전에 닿아 애니가 **0%(`scale(.26) opacity:.38` = 골짜기)** 에서 굳었고,
 *   그래서 세워 놓고도 잉크가 거의 없어 [R1] 의 크림이 수십 개로 떨어져 문턱 500 을 **아래에서**
 *   스치며 다시 흔들렸다(등재문 «되돌림 102 ↔ 정상 43»). ⇒ 홀드를 `tools/fxhold512.js` 한 벌로 모으고
 *   음수 `animation-delay` 로 시계를 **봉우리(18%)** 에 맞춘 채 정지시킨다(요소마다 제 길이의 비율 —
 *   러너 절대값 0개). 문턱은 한 칸도 안 내렸다 — 대신 [G0b]·[R0b] 가 «정말 봉우리인가» 를 실측으로 못박는다.
 *   재현·지형은 `node tools/probe836.js`, 기록은 `docs/review/836-verify512R1봉우리홀드.md`.
 */
const { pw, launch } = require('./pwlaunch');
const fxhold = require('./fxhold512');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };

/* CIE-Lab ΔE76 — 412 가 쓴 자와 같은 식 */
function lab(hex) {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const X = v[0] * 0.4124 + v[1] * 0.3576 + v[2] * 0.1805;
  const Y = v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
  const Z = v[0] * 0.0193 + v[1] * 0.1192 + v[2] * 0.9505;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

(async () => {
  /* ── [A]·[B] 정적 ───────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  console.log('\n=== [A] 표 한 벌 ===');
  const fxcurBlk = (src.match(/const FXCUR = \{[\s\S]*?\n\};/) || [''])[0];
  const fxKeys = [...fxcurBlk.matchAll(/^\s{2}(\w+)\s*:?\s*\{/gm)].map(m => m[1]);
  const iconBlk = (src.match(/const CUR_ICON = \{[\s\S]*?\n\};/) || [''])[0];
  const iconKeys = [...iconBlk.matchAll(/^\s{2}(\w+)\s*:/gm)].map(m => m[1]);
  const nonTicket = iconKeys.filter(k => !/^tk/.test(k));
  ok(fxKeys.length > 0 && fxKeys.every(k => iconKeys.includes(k)),
    '[A1] FXCUR 키 ⊂ CUR_ICON 키 (402 «표 두 벌» 부패 방지)', fxKeys.join('/'));
  ok(nonTicket.every(k => fxKeys.includes(k)),
    '[A2] 티켓이 아닌 재화는 전부 FXCUR 에 있다', nonTicket.filter(k => !fxKeys.includes(k)).join('/') || '빠짐 0');
  ok(/const fxS = k =>/.test(src) && /st:'mileage'/.test(src),
    '[A3] 상태 키가 다른 재화(마일리지)는 표의 `st` 로 적고 읽는 자리는 `fxS()` 하나다');
  ok(/const fxMap = v =>/.test(src) && !/const fx(Disp|Seen|Hold|StepTo|Roll|PayT) = \{ gold:/.test(src),
    '[A4] 재화별 상태 사전은 손으로 적지 않고 표에서 만든다(fxMap)');

  console.log('\n=== [B] 색은 표에서만 ===');
  const litLines = src.split('\n').map((l, i) => ({ n: i + 1, l }))
    .filter(o => /fx(Burst|Reward)\s*\(/.test(o.l) && /#[0-9A-Fa-f]{6}/.test(o.l) && !/^\s*[*/]/.test(o.l));
  ok(litLines.length === 0, '[B1] fxBurst·fxReward 호출부에 색 리터럴 0건',
    litLines.map(o => o.n + ': ' + o.l.trim().slice(0, 50)).join(' | ') || '0건');
  ok(/setProperty\('--c', col \|\| FXPAL\.spark\)/.test(src),
    '[B2] 파티클 기본색도 표에서 나온다(FXPAL.spark)');
  ok(/const FXPAL = \{/.test(src), '[B3] 재화가 아닌 연출 색은 FXPAL 한 표에 있다');

  console.log('\n=== [E] 색이 실제로 갈리는가(쌍별 ΔE76) ===');
  const cols = {};
  [...fxcurBlk.matchAll(/^\s{2}(\w+)\s*:?\s*\{[^}]*col:'(#[0-9A-Fa-f]{6})'/gm)].forEach(m => { cols[m[1]] = m[2]; });
  const keys = Object.keys(cols);
  let worst = { d: 1e9, a: '', b: '' };
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const d = dE(cols[keys[i]], cols[keys[j]]);
    if (d < worst.d) worst = { d, a: keys[i], b: keys[j] };
  }
  ok(keys.length === fxKeys.length, '[E1] 표의 모든 재화가 색을 갖는다', keys.length + '/' + fxKeys.length);
  ok(worst.d >= 12, '[E2] 쌍별 최소 ΔE76 ≥ 12 (87 통과선 10.3 보다 넓게)',
    worst.a + '↔' + worst.b + ' = ' + worst.d.toFixed(1));

  /* ── 브라우저 ──────────────────────────────────────────────────── */
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof giveReward === 'function');
  await p.waitForTimeout(900);

  /* 씬 하네스를 페이지에 심는다 — [C]·[D]·[F]·[R] 이 같은 함수를 쓴다(자매 자 드리프트 예방 · 385).
     [G]·[R] 은 페이지를 다시 띄우고 이 함수를 다시 부른다(두 측정이 서로의 상태를 물려받지 않게). */
  const setup = async () => {
    await fxhold.install(p);          /* 836 — 홀드 한 벌(`tools/fxhold512.js`)을 페이지에 심는다 */
    await p.evaluate(() => {
    window.step = () => {};
    window.__v512 = {
      raf: () => new Promise(r => requestAnimationFrame(() => r())),
      async wait(n) { for (let i = 0; i < n; i++) await this.raf(); },
      clear() { document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove()); },
      async scene(fn) {
        this.clear(); await this.wait(3);
        if (typeof fxAt === 'function') fxAt({ x: 540, y: 1200 });
        const seen = [];
        const mo = new MutationObserver(recs => {
          for (const rec of recs) for (const n of rec.addedNodes) {
            if (n.nodeType !== 1 || !n.classList) continue;
            const c = n.className || '';
            if (/fx-(fly|spark|plus)/.test(c)) seen.push({ cls: c, col: (n.style.getPropertyValue('--c') || n.style.color || '').trim() });
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        fn();
        await this.wait(30);
        mo.disconnect();
        const g = cls => seen.filter(s => s.cls.indexOf(cls) >= 0);
        return {
          fly: g('fx-fly').length, spark: g('fx-spark').length, plus: g('fx-plus').length,
          sparkCols: [...new Set(g('fx-spark').map(s => s.col.toLowerCase()))],
          plusCols: [...new Set(g('fx-plus').map(s => s.col.toLowerCase()))]
        };
      },
      /* ⚑ 808 — «언제 찍는가» 를 자에서 뺀다(플레이키의 뿌리).
         버스트는 `.fx-spark` 수명 0.38s 뒤 `fxBye` 가 노드를 걷어 **창이 390ms** 이고,
         1080×2280 스크린샷 한 장은 이 러너에서 **0.5s 안팎**이다 — 창보다 캡처가 크다.
         그래서 «수령 +110ms 한 장» 은 러너 부하에 따라 봉우리(크림 2,600~4,000)와
         **빈 창**(스파크는 죽고 `+n` 은 아직 안 뜬 430~540ms 구간 = 크림 128) 사이를 오갔다.
         ⇒ 태어난 연출 노드를 **그 프레임에 세운다**: `el.remove`(= `fxBye` 의 손)와 CSS 애니만 멈춘다.
         색·개수·자리는 제품이 만든 그대로라 축(«되돌리면 수리 전 색이 화면에 찍힌다»)은 안 무뎌진다 —
         연출이 아예 없으면 노드가 0 이고 [G0] 이 빨개진다. 문턱(500·5배)은 한 칸도 안 내렸다(796).
         ⚑ 836 — 그 홀드가 **0%(골짜기)** 에 서 있던 것을 봉우리로 옮겼고, 구현은 자와 재현기가
            같이 읽는 `tools/fxhold512.js` 한 벌로 모았다(사본 0). 여기서는 그 한 벌을 그대로 부른다. */
      holdScene(fn) { return window.__fxhold.holdScene(fn); },
      rgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); },
      same(cssCol, hex) {   /* `rgb(a, b, c)` ↔ `#RRGGBB` */
        const m = String(cssCol).match(/(\d+)\D+(\d+)\D+(\d+)/); if (!m) return String(cssCol).toLowerCase() === hex.toLowerCase();
        const t = this.rgb(hex); return Math.abs(+m[1] - t[0]) < 3 && Math.abs(+m[2] - t[1]) < 3 && Math.abs(+m[3] - t[2]) < 3;
      }
    };
    });
  };
  await setup();

  const scene = js => p.evaluate(async (code) => {
    // eslint-disable-next-line no-new-func
    const fn = new Function(code);
    return await window.__v512.scene(fn);
  }, js);

  console.log('\n=== [C] 재화별 버스트 색 = 그 재화 색 ===');
  const C = {};
  for (const [k, give] of [
    ['gold', 'giveReward({gold:50000})'], ['dia', 'giveReward({dia:500})'],
    ['relic', 'giveReward({rel:5})'], ['stone', 'giveReward({stone:5})'],
    ['rstone', 'giveReward({rstone:5})'], ['tstone', 'giveReward({tstone:5})'],
    ['mile', 'S.mileage = (S.mileage||0) + 5']
  ]) {
    const r = await scene(give);
    C[k] = r;
    ok(r.sparkCols.some(c => c === cols[k].toLowerCase()) && r.sparkCols.length === 1,
      '[C:' + k + '] 버스트가 ' + cols[k] + ' 하나다', r.sparkCols.join('/') || '버스트 0건');
  }
  const both = await scene('giveReward({gold:10000, dia:100})');
  ok(both.sparkCols.length === 2
    && both.sparkCols.includes(cols.gold.toLowerCase()) && both.sparkCols.includes(cols.dia.toLowerCase()),
    '[C:동시] 두 재화 동시 지급은 색을 섞지 않고 묶음을 나눈다(93 규약)', both.sparkCols.join('/'));

  console.log('\n=== [D] 알약 없는 재화도 «연출 0건» 이 아니다 ===');
  ['relic', 'stone', 'rstone', 'tstone', 'mile'].forEach(k => {
    const r = C[k];
    ok(r.spark > 0 && r.plus === 1 && r.fly === 0,
      '[D:' + k + '] 비행 0(도착지 없음) · 버스트 + `+n` 1장',
      'fly ' + r.fly + ' · spark ' + r.spark + ' · +n ' + r.plus);
  });
  ok(['relic', 'stone', 'rstone', 'tstone', 'mile'].every(k => C[k].plusCols.some(c =>
    /(\d+)\D+(\d+)\D+(\d+)/.test(c))), '[D:색] `+n` 플로터도 제 재화 색이다',
    ['relic', 'stone'].map(k => k + ' ' + C[k].plusCols.join('/')).join(' · '));

  console.log('\n=== [F] 41 재화 바가 열려 있으면 유물조각은 그 바로 날아간다 ===');
  const relFly = await p.evaluate(async () => {
    openRelw();
    await window.__v512.wait(8);
    const r = await window.__v512.scene(() => giveReward({ rel: 7 }));
    const bar = document.querySelector('.pcb-r');
    const on = !!(bar && bar.getBoundingClientRect().width);
    closeRelw && closeRelw();
    return Object.assign({ barOpen: on }, r);
  });
  ok(relFly.barOpen, '[F1] 89 유물 페이지에 `.pcb-r` 바가 실제로 떠 있다');
  ok(relFly.fly > 0, '[F2] 그 상태에서 유물조각은 비행한다(도착지가 생겼다)', 'fly ' + relFly.fly);
  ok(relFly.sparkCols.every(c => c === cols.relic.toLowerCase()),
    '[F3] 그때도 색은 유물 색 그대로', relFly.sparkCols.join('/'));

  /* ── [G] 찍힌 픽셀(412 방식) — 바뀐 픽셀만 센다 ─────────────────── */
  console.log('\n=== [G] 찍힌 픽셀 — 룰렛 수령 프레임 ===');
  const pixel = async (revert) => {
    /* ⚠ 두 측정을 **같은 페이지 상태**에서 이어 하면 값이 흔들린다(1회차: 되돌림 dia 6,972 ↔ 30,068).
       룰렛 팝업의 당첨 하이라이트·비행 코인이 앞 측정의 잔재로 남아 «바뀐 픽셀» 에 섞이기 때문이다.
       측정마다 페이지를 다시 띄우고 하네스를 다시 심는다(534 «양쪽 캡처를 같은 자리에서» 규약). */
    await p.goto('file://' + SRC);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof roulFinish === 'function');
    await p.waitForTimeout(900);
    await setup();
    await p.evaluate((rv) => {
      window.__v512.clear();
      if (rv) for (const k in FXCUR) FXCUR[k].col = '#FFE9A8';   /* [R] 되돌림 — 상수 크림 한 색 */
      S.daily.spins = 30;
      openRoulette();
    }, !!revert);
    await p.waitForTimeout(500);
    const before = await p.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
    /* ⚑ 808 — 고정 «+110ms 한 장» 을 폐기하고 **연출을 세워 놓고** 찍는다(위 `holdScene` 머리말).
       세워 두면 캡처가 0.1s 가 걸리든 2s 가 걸리든 같은 프레임이라, 러너 부하가 값을 못 흔든다. */
    /* ⚑ 836 — 알의 흩어짐에 **씨를 박는다**(668 «시드 고정»). 알 바깥 띠는 배경이 비치는
       반투명 구간이라 «알 밑에 룰렛의 어느 화소가 깔리는가» 가 실행마다 달라져 [R1] 의 «정상» 쪽이
       281~610 으로 흔들렸다. 씨를 박으면 [G]·[R] 이 같은 자리·같은 배경을 보고 **색만** 다르다. */
    await p.evaluate(() => window.__fxhold.seed(0x512));
    const nodes = await p.evaluate(() => window.__v512.holdScene(() => {
      const i = ROULETTE.findIndex(x => x && x.dia);
      roulFinish(i < 0 ? 0 : i);
    }));
    const after = await p.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
    /* 350 처방 — 캡처를 페이지로 되돌려 «찍힌 픽셀» 을 읽는다 */
    const px = await p.evaluate(async ([b64a, b64b, palette, geo]) => {
      const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
      const [ia, ib] = await Promise.all([load(b64a), load(b64b)]);
      const cv = document.createElement('canvas');
      cv.width = ia.width; cv.height = ia.height;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(ia, 0, 0); const A = cx.getImageData(0, 0, cv.width, cv.height).data;
      cx.clearRect(0, 0, cv.width, cv.height);
      cx.drawImage(ib, 0, 0); const B = cx.getImageData(0, 0, cv.width, cv.height).data;
      /* ⚑ 836 (811 처방) — «버스트의 **색 띠** 안» 마스크. 두 가지를 가른다:
         ⓐ 화면 어딘가가 바뀐 것 ↔ 이 연출이 찍은 것(룰렛 당첨 하이라이트·비행 코인이 밖에서 섞인다)
         ⓑ 알의 **흰 심**(배경 그라디언트 0~26% 는 --c 와 무관하게 #FFF) ↔ 재화 색을 입는 바깥 띠.
         ⓑ 를 안 도려내면 색을 하나도 안 되돌려도 «크림» 이 수백 개 나온다(실측 648). */
      const { disks, rIn, rOut } = geo;
      const mask = new Uint8Array(cv.width * cv.height);
      let maskPx = 0;
      for (const [cxp, cyp, r] of (disks || [])) {
        const ri = r * rIn, ro = r * rOut;
        const y0 = Math.max(0, Math.floor(cyp - ro)), y1 = Math.min(cv.height - 1, Math.ceil(cyp + ro));
        const x0 = Math.max(0, Math.floor(cxp - ro)), x1 = Math.min(cv.width - 1, Math.ceil(cxp + ro));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x + 0.5 - cxp, y + 0.5 - cyp);
          if (d < ri || d > ro) continue;
          const j = y * cv.width + x;
          if (!mask[j]) { mask[j] = 1; maskPx++; }
        }
      }
      const out = {}, inBox = {}; for (const k in palette) { out[k] = 0; inBox[k] = 0; }
      let changed = 0, changedIn = 0;
      for (let i = 0; i < A.length; i += 4) {
        const dr = B[i] - A[i], dg = B[i + 1] - A[i + 1], db = B[i + 2] - A[i + 2];
        if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 40) continue;
        changed++;
        const on = mask[i >> 2] === 1;
        if (on) changedIn++;
        let best = null, bd = 60;
        for (const k in palette) {
          const t = palette[k];
          const d = Math.hypot(B[i] - t[0], B[i + 1] - t[1], B[i + 2] - t[2]);
          if (d < bd) { bd = d; best = k; }
        }
        if (best) { out[best]++; if (on) inBox[best]++; }
      }
      return { changed, hits: out, changedIn, inBox, maskPx };
    }, [
      'data:image/png;base64,' + before.toString('base64'),
      'data:image/png;base64,' + after.toString('base64'),
      Object.fromEntries(Object.entries(Object.assign({ cream: '#FFE9A8' }, cols))
        .map(([k, v]) => [k, [0, 2, 4].map(i => parseInt(v.replace('#', '').substr(i, 2), 16))])),
      { disks: nodes.disks, rIn: nodes.rIn, rOut: nodes.rOut }
    ]);
    return Object.assign(px, { nodes });
  };
  const G = await pixel(false);
  console.log('  바뀐 픽셀 ' + G.changed + ' · 팔레트 적중 ' + JSON.stringify(G.hits)
    + '\n  (버스트 색 띠 안 ' + G.maskPx + 'px) 바뀐 ' + G.changedIn + ' · 적중 ' + JSON.stringify(G.inBox)
    + '\n  세운 연출 ' + JSON.stringify(Object.assign({}, G.nodes, { disks: G.nodes.disks.length })));
  /* ⚑ 808 전제 — 홀드가 «없는 연출을 있는 것처럼» 만들지 않는다는 못.
     버스트가 사라지면 세울 것이 없어 여기가 먼저 빨개진다(자가 무르지 않다). */
  ok(G.nodes.spark > 0, '[G0] (전제) 잡은 프레임에 버스트가 실제로 서 있다', '버스트 ' + G.nodes.spark + '개');
  /* ⚑ 836 전제 — 홀드가 «세웠다» 만으로는 모자란다. 0%(`scale(.26)`)에 서면 잉크가 거의 없어
     [R1] 이 문턱을 **아래에서** 스친다(그게 836 이 잡은 결함이다). 봉우리에 섰는지를 실측으로 못박는다. */
  ok(G.nodes.scale >= 0.9, '[G0b] (전제) 세운 프레임은 버스트의 **봉우리**다 — 스케일 ≥ .9 (0% 는 .26)',
    '스케일 ' + G.nodes.scale.toFixed(3) + ' · 홀드 지점 ' + (G.nodes.peak * 100).toFixed(0) + '%');
  ok(G.hits.dia > 200, '[G1] 룰렛(전 칸 dia) 수령 프레임에 **dia 색 픽셀**이 실제로 찍힌다', 'dia ' + G.hits.dia);
  ok(G.hits.gold * 4 < G.hits.dia, '[G2] 그 프레임에 금색이 지배하지 않는다(주인이 본 «골드가 섞여 있다»)',
    'gold ' + G.hits.gold + ' vs dia ' + G.hits.dia);

  /* ── [R] 되돌림 ────────────────────────────────────────────────── */
  console.log('\n=== [R] 되돌림 시험 — 상수 한 색으로 되돌리면 빨개진다 ===');
  const R = await pixel(true);
  console.log('  (되돌림) 바뀐 픽셀 ' + R.changed + ' · 팔레트 적중 ' + JSON.stringify(R.hits)
    + '\n  (버스트 색 띠 안 ' + R.maskPx + 'px) 바뀐 ' + R.changedIn + ' · 적중 ' + JSON.stringify(R.inBox)
    + '\n  세운 연출 ' + JSON.stringify(Object.assign({}, R.nodes, { disks: R.nodes.disks.length })));
  ok(R.nodes.spark > 0, '[R0] (전제) 되돌림 프레임에도 버스트가 실제로 서 있다', '버스트 ' + R.nodes.spark + '개');
  ok(R.nodes.scale >= 0.9, '[R0b] (전제) 되돌림 프레임도 같은 **봉우리**에서 잡았다(두 값이 같은 자에서 나온다)',
    '스케일 ' + R.nodes.scale.toFixed(3) + ' ↔ 정상 ' + G.nodes.scale.toFixed(3));
  /* ⚑ 되돌림의 자는 «dia 픽셀이 준다» 가 아니라 **«수리 전 색이 화면에 있다»** 여야 한다 —
     비행 코인 아이콘 자체가 다이아 스프라이트(시안)라 dia 화소는 색을 되돌려도 남는다.
     수리 전 상수 크림(#FFE9A8)은 그 프레임 어디에도 없어야 정상이다. */
  /* ⚑ 836 — 세는 자리를 **버스트가 재화 색을 입는 띠**로 가둔다(811 처방 · 등재문 갈래 ⓐ).
     프레임 전체로 세면 룰렛 당첨 하이라이트가, 알 전체로 세면 **색과 무관한 흰 심**이 크림 옆에 떨어져
     «정상» 쪽에도 수백 개가 섞여 든다(실측 649 · 그중 648 이 알 안) — 축이 묻는 것은
     «**버스트가** 수리 전 색을 입었는가» 다. ⚠ 문턱(500 · 5배)은 808 이 정한 값 그대로다(796).
     ⚠ 이 마스크는 [R] 과 [G] 에 **같은 코드**로 걸린다 — 한쪽만 유리하게 자르지 않는다. */
  ok(R.inBox.cream > 500 && R.inBox.cream > G.inBox.cream * 5,
    '[R1] 되돌리면 «수리 전 크림» 이 버스트의 색 띠에 실제로 찍힌다 — 정상 프레임에는 거의 없다',
    '되돌림 ' + R.inBox.cream + ' ↔ 정상 ' + G.inBox.cream
    + ' (프레임 전체로 세면 ' + R.hits.cream + ' ↔ ' + G.hits.cream + ')');
  const rc = await p.evaluate(async () => {
    const r = await window.__v512.scene(() => giveReward({ dia: 500 }));
    for (const k in FXCUR) FXCUR[k].col = null;    /* 색을 아예 빼면 파티클 기본색으로 떨어진다 */
    const r2 = await window.__v512.scene(() => giveReward({ dia: 500 }));
    return { revert: r.sparkCols, none: r2.sparkCols };
  });
  ok(!rc.revert.some(c => c === cols.dia.toLowerCase()),
    '[R2] 되돌린 표에서는 dia 보상이 dia 색을 안 쓴다(자가 무르지 않다)', rc.revert.join('/'));

  ok(errs.length === 0, '콘솔 오류 0건', errs.slice(0, 3).join(' | '));
  console.log('\n' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
