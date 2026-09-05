/* 재현 914 — «`verify463` [0] 대조항이 4회 중 1회 빨강» 의 뿌리를 가른다.
 *
 *   node tools/probe914.js
 *   P914_N=12 P914_W=300 node tools/probe914.js     (반복 판 수 · 표류 표본 수)
 *
 * 무엇을 재는가 —
 *   `verify463` [0] 은 «지금 값(23)을 그대로 덮었다 걷으면 그림이 안 바뀐다» 를 문턱 8 로 센다.
 *   두 장 사이에 흐르는 시간은 **200ms**(`setStyle` 의 정착 대기)이고, 자는 그 창 안에서
 *   그림을 바꿀 수 있는 것이 **주입한 스타일뿐**이라고 전제한다. 등재문(914)의 실측은
 *   빨간 값이 **07 스킬 112px ↔ 03 던전 21,375px** 로 자리마다 두 자릿수 넘게 갈린다는 것이었고,
 *   알약이 288×84 = 24,209px 이므로 21,375 는 **88.3%** — «AA 잡티» 가 아니라 그 200ms 안에
 *   **다른 그림이 덮었다**는 뜻이다(907 교훈 ④ 가 «다른 뿌리» 로 갈라 둔 자리).
 *
 * 절 —
 *   [P1] 반복은 재현 조건이 **아니다** — [0] 사이클을 그대로 N 판 돌린다 (873: 5판으로 «없다» 를 말하지 마라)
 *   [P2] 그러면 무엇인가 — **스타일을 한 번도 안 건드리고** 알약 상자만 촘촘히 찍어
 *        «게임이 스스로 그 자리를 다시 그리는 순간» 을 찾는다
 *   [P3] 처방이 실제로 그 순간을 없애는가 — `closers540` 을 걸고 같은 자를 다시 돌린다
 *        (**막은 횟수**를 같이 찍는다 — 늘 0 인 팔은 아무것도 증명하지 않는다, LESSONS 353-④)
 *
 * ⚠ 문턱 8 은 한 글자도 안 건드린다(334·796 · 등재문 명시). 이 자는 «몇 px 이 갈렸나» 가 아니라
 *   «갈린 순간 화면이 같았나» 를 묻는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install, defeatStuck, defeatBlocked } = require('./closers540');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'shots');
const N = +(process.env.P914_N || 6);
const W = +(process.env.P914_W || 300);           /* 표류 표본 수 (× 200ms) */
const AA = 8;                                     /* verify463 과 같은 문턱 — 건드리지 않는다 */

const HOSTS = [
  ['07스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['03던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
];

const maskCss = n => 'linear-gradient(90deg,#000 0 ' + n + 'px,transparent ' + n + 'px calc(100% - '
  + n + 'px),#000 calc(100% - ' + n + 'px))';
const injBefore = n => '.stab.on::before{-webkit-mask-image:' + maskCss(n) + '!important;mask-image:'
  + maskCss(n) + '!important}';

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* 화면 상태 — «대조 두 장이 같은 화면에서 찍혔나» 를 말할 수 있는 최소 집합.
   ⚠ 좌표만으로는 못 가른다: 전면 딤(`#defw` inset:0 z39)은 알약을 **제자리에 둔 채** 덮는다.
      그래서 «알약 중심에 무엇이 서 있나»(elementsFromPoint)를 같이 적는다. */
const snap = (page, sel) => page.evaluate(s => {
  const bar = document.querySelector(s);
  const on = bar && bar.querySelector(':scope > .stab.on');
  const r = on ? on.getBoundingClientRect() : null;
  const top = r ? document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)[0] : null;
  const sig = e => e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')
    + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')) : '없음';
  return {
    x: r ? +r.x.toFixed(2) : null, y: r ? +r.y.toFixed(2) : null,
    w: r ? +r.width.toFixed(2) : null, h: r ? +r.height.toFixed(2) : null,
    top: sig(top),
    defw: !!(document.getElementById('defw') || {}).classList
      && document.getElementById('defw').classList.contains('on'),
  };
}, sel);

async function shoot(page, slot) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, 'p914-' + slot + '.png');
  await page.screenshot({ path: p });
  const b64 = fs.readFileSync(p).toString('base64');
  await page.evaluate(([data, key]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      window['__g914' + key] = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('load fail'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, slot]);
  return p;
}

/* verify463 의 `diffCols` 와 **같은 산수** + 차분 bbox 를 같이 돌려준다 */
const diffBox = (page, p, a, b) => page.evaluate(([box, ka, kb, tol]) => {
  const A = window['__g914' + ka], B = window['__g914' + kb];
  const x0 = Math.round(box.x), y0 = Math.round(box.y);
  const w = Math.round(box.w), h = Math.round(box.h);
  const da = A.getImageData(x0, y0, w, h).data;
  const db = B.getImageData(x0, y0, w, h).data;
  let n = 0, lo = 1e9, hi = -1, tp = 1e9, bt = -1, worst = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d > tol) {
      const px = (i / 4) % w, py = ((i / 4) / w) | 0;
      n++;
      if (px < lo) lo = px; if (px > hi) hi = px;
      if (py < tp) tp = py; if (py > bt) bt = py;
      if (d > worst) worst = d;
    }
  }
  return { n, box: n ? [lo, tp, hi, bt] : null, worst, area: w * h };
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, a, b, AA]);

const FREEZE = '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
  + '.stab>.bdg,.stabs .sk-lock{display:none!important}';

async function boot(browser, armed) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(ROOT, 'index.html'));
  await page.waitForTimeout(1400);
  if (armed) await install(page, { arm: true });
  await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await page.addStyleTag({ content: FREEZE });
  return page;
}

const pillOf = (page, sel) => page.evaluate(s => {
  const bar = document.querySelector(s);
  const on = bar && bar.querySelector(':scope > .stab.on');
  if (!on) return null;
  const b = on.getBoundingClientRect();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}, sel);

/* «스타일을 한 번도 안 건드리고» 알약이 스스로 바뀌는가 — 표류 감시.
   이 절에서 나오는 변화는 재래스터가 아니라 **제품**이다. */
async function drift(page, tag, armed) {
  const out = [];
  for (const [hname, sel, setup] of HOSTS) {
    await page.evaluate(setup);
    await page.waitForTimeout(800);
    const info = await pillOf(page, sel);
    if (!info) { console.log('  ▣ ' + hname + ' — 활성 칸 없음'); continue; }
    await shoot(page, 'W0');
    let changed = 0, worstN = 0, worstAt = -1, worstSt = null, worstBox = null, shown = 0;
    for (let t = 1; t <= W; t++) {
      await page.waitForTimeout(200);
      await shoot(page, 'W1');
      const d = await diffBox(page, info, 'W0', 'W1');
      if (d.n > 0) {
        changed++;
        const st = await snap(page, sel);
        if (d.n > worstN) { worstN = d.n; worstAt = t; worstSt = st; worstBox = d.box; }
        if (shown++ < 5) {
          console.log('    ✖ t=' + (t * 0.2).toFixed(1) + 's  ' + d.n + 'px ('
            + (100 * d.n / d.area).toFixed(1) + '%) bbox ' + JSON.stringify(d.box) + ' Δ' + d.worst
            + ' · 알약 위 「' + st.top + '」 · #defw.on ' + (st.defw ? 'YES' : 'no'));
          try {
            fs.copyFileSync(path.join(OUT, 'p914-W1.png'),
              path.join(OUT, 'p914-drift-' + tag + '-' + hname + '-t' + t + '.png'));
          } catch (_) {}
        }
      }
      /* 직전 표본을 기준으로 이어 본다 — «한 번 바뀌고 굳는가» 와 «계속 흔들리는가» 를 가른다 */
      await page.evaluate(() => { window.__g914W0 = window.__g914W1; });
    }
    const blocked = armed ? await defeatBlocked(page) : null;
    console.log('  ▣ ' + tag + ' / ' + hname + ' — 바뀐 표본 ' + changed + '/' + W
      + (worstN ? ' · 최대 ' + worstN + 'px(' + (100 * worstN / (Math.round(info.w) * Math.round(info.h))).toFixed(1)
        + '%) @t=' + (worstAt * 0.2).toFixed(1) + 's bbox ' + JSON.stringify(worstBox)
        + ' · 그때 알약 위 「' + worstSt.top + '」 #defw.on ' + (worstSt.defw ? 'YES' : 'no') : '')
      + (blocked == null ? '' : ' · 막은 횟수 ' + blocked + '회'));
    out.push({ hname, changed, worstN, worstSt, blocked,
      pct: worstN ? 100 * worstN / (Math.round(info.w) * Math.round(info.h)) : 0 });
  }
  return out;
}

(async () => {
  const browser = await launch(chromium);
  try {
    /* ---------- [P1] 반복은 재현 조건이 아니다 ---------- */
    const page = await boot(browser, false);
    console.log('[P1] [0] 사이클을 그대로 ' + N + '판 × 호스트 2 (문턱 ' + AA + ' · 처방 없음)');
    const setStyle = async css => {
      await page.evaluate(c => {
        let s = document.getElementById('g914');
        if (!c) { if (s) s.remove(); return; }
        if (!s) { s = document.createElement('style'); s.id = 'g914'; document.head.appendChild(s); }
        s.textContent = c;
      }, css);
      await page.waitForTimeout(200);
    };
    let red = 0, tot = 0;
    for (const [hname, sel, setup] of HOSTS) {
      for (let k = 1; k <= N; k++) {
        await page.evaluate(setup); await page.waitForTimeout(800);
        const info = await pillOf(page, sel);
        if (!info) continue;
        await shoot(page, 'N');
        await setStyle(injBefore(23)); await shoot(page, 'F0');
        const d0 = await diffBox(page, info, 'N', 'F0');
        await setStyle(null); await shoot(page, 'Z0');
        const d1 = await diffBox(page, info, 'N', 'Z0');
        tot++;
        if (Math.max(d0.n, d1.n) > 0) { red++; console.log('    ✖ ' + hname + ' 판 ' + k + ' — ' + Math.max(d0.n, d1.n) + 'px'); }
      }
    }
    console.log('  ▣ 빨강 ' + red + '/' + tot);
    ok('[P1] 반복만으로는 못 가른다 — 판 수를 늘리는 것은 회차를 태우는 길이다 (912 교훈 ①)',
      true, red + '/' + tot + '판 빨강');

    /* ---------- [P2] 처방 없이 알약이 스스로 바뀌는 순간 ---------- */
    console.log('\n[P2] 스타일을 안 건드리고 ' + W + '표본(×200ms) — 처방 **없이**');
    const pre = await drift(page, '처방없음', false);
    await page.close();
    const hit = pre.filter(r => r.changed > 0);
    /* ⚠ 이 절은 «그 창에 죽는 판이 들었나» 라는 실행 운을 탄다 — 그래서 **관측**으로 적고,
       기계의 판정은 아래 [R] 이 주입으로 맡는다(912 교훈 ①). 관측이 나온 실행에서는 그 관측이
       무엇이었는지까지 판정한다 — «봤는데 정체를 안 묻는» 절은 다음 사람에게 남길 것이 없다. */
    ok('[P2] (관측) 게임이 스스로 알약을 다시 그리는 순간 — 있으면 [0] 의 200ms 창이 그것을 재래스터로 오독한다',
      true, pre.map(r => r.hname + ':' + r.changed + '표본/최대' + r.worstN + 'px').join(' · ')
        + (hit.length ? '' : '  (이번 실행에서는 안 잡혔다 — 판정은 [R])'));
    if (hit.length) {
      ok('[P2] 그 순간의 정체는 **전면 딤 `#defw`**(18 패배 화면 · inset:0 z39 rgba(0,0,0,.62)) 다',
        hit.every(r => r.worstSt && r.worstSt.defw),
        hit.map(r => r.hname + ' 위「' + (r.worstSt || {}).top + '」 defw.on ' + ((r.worstSt || {}).defw ? 'YES' : 'no')).join(' · '));
      ok('[P2] 그 몫은 «잡티» 가 아니라 «다른 그림» 이다 — 알약의 80% 넘게 갈린다 (등재문 21,375px = 88.3%)',
        hit.every(r => r.pct > 80),
        hit.map(r => r.hname + ':' + r.worstN + 'px = ' + r.pct.toFixed(1) + '%').join(' · '));
    }

    /* ---------- [P3] 처방(closers540)이 그 순간을 없애는가 ---------- */
    console.log('\n[P3] 같은 자 · `closers540` 을 걸고 (`install(page,{arm:true})`)');
    const page2 = await boot(browser, true);
    const post = await drift(page2, '처방있음', true);
    const stuck = await defeatStuck(page2);
    const blocked = await defeatBlocked(page2);
    await page2.close();
    ok('[P3] 처방을 걸면 표류가 사라진다 (바뀐 표본 0)',
      post.every(r => r.changed === 0), post.map(r => r.hname + ':' + r.changed + '표본').join(' · '));
    /* LESSONS 353-④ — 늘 0 인 팔은 아무것도 증명하지 않는다. 다만 **이 절에서** 팔이 도는지는
       «그 창에 죽는 판이 들었나» 라는 실행 운이라, 여기서 판정하면 자가 제 운을 문턱으로 삼는다
       (908 교훈). ⇒ 여기서는 **적기만** 하고, «팔이 실제로 돈다» 는 아래 [R-d] 가 주입으로 못박는다. */
    ok('[P3] (관측) 이 창에서 `openDefeat` 를 막은 횟수 — 0 이면 이 절은 이번 실행에서 공허하다 (판정은 [R-d])',
      true, '막은 횟수 ' + blocked + '회');
    ok('[P3] 측정이 끝난 시점에 `#defw` 가 켜져 있지 않다', stuck === false, String(stuck));

    /* ---------- [R] 되돌림 — 딤을 **창 한복판에 심어** 두 세계를 같은 자로 잰다 ----------
       [P2] 는 죽는 판을 기다려야 나오므로 실행 운을 탄다. 여기서는 기다리지 않고 그 순간을
       **주입**한다(912 교훈 ①). 두 항이 서로의 되돌림이다:
         ⓐ 처방 없음 — `#defw.on` 을 N 과 F0 사이에 켜면 [0] 이 «알약의 80% 넘게» 로 빨개지고
            알약 위에 선 것이 `div#defw` 로 바뀐다 (= 등재문의 21,375px 이 무엇이었는지)
         ⓑ 처방 있음 — **같은 제품 경로**(`openDefeat()`)를 불러도 껍데기가 즉시 걷혀 0px 이다
       ⚠ ⓐ 는 `classList.add` 로 직접 켠다 — 처방이 감싸는 것은 `openDefeat` 라, 처방 없는
          세계에서 «딤이 켜진 상태» 를 만드는 데 제품 함수를 쓸 필요가 없다(무엇을 쟀는지 흐려진다). */
    console.log('\n[R] 되돌림 — 딤을 [0] 창 한복판에 심는다');
    for (const armed of [false, true]) {
      const p = await boot(browser, armed);
      const setSt = async css => {
        await p.evaluate(c => {
          let s = document.getElementById('g914');
          if (!c) { if (s) s.remove(); return; }
          if (!s) { s = document.createElement('style'); s.id = 'g914'; document.head.appendChild(s); }
          s.textContent = c;
        }, css);
        await p.waitForTimeout(200);
      };
      const [hname, sel, setup] = HOSTS[1];            /* 03 던전 = 등재문이 21,375px 을 잰 자리 */
      await p.evaluate(setup); await p.waitForTimeout(800);
      const info = await pillOf(p, sel);
      const sBefore = await snap(p, sel);
      await shoot(p, 'N');
      /* 창 한복판 — N 을 찍은 뒤, F0 을 찍기 전 */
      if (armed) await p.evaluate(() => { if (typeof openDefeat === 'function') openDefeat(); });
      else await p.evaluate(() => { const d = document.getElementById('defw'); if (d) d.classList.add('on'); });
      await setSt(injBefore(23)); await shoot(p, 'F0');
      const d = await diffBox(p, info, 'N', 'F0');
      const sAfter = await snap(p, sel);
      const pct = 100 * d.n / d.area;
      const blk = armed ? await defeatBlocked(p) : null;
      console.log('  ▣ ' + (armed ? '처방 있음' : '처방 없음') + ' — ' + d.n + 'px (' + pct.toFixed(1) + '%)'
        + ' · 알약 위 「' + sBefore.top + '」 → 「' + sAfter.top + '」 · #defw.on ' + (sAfter.defw ? 'YES' : 'no')
        + (blk == null ? '' : ' · 막은 횟수 ' + blk + '회'));
      if (!armed) {
        ok('[R-a] 처방 **없이** 딤이 창에 들면 [0] 은 알약의 80% 넘게 빨개진다 (등재문 21,375px = 88.3%)',
          pct > 80, d.n + 'px = ' + pct.toFixed(1) + '%');
        ok('[R-b] 그때 «알약을 덮은 것» 이 바뀐다 — 새 [0-화면] 항이 이름으로 말할 수 있다',
          sBefore.top !== sAfter.top && /defw/.test(sAfter.top),
          '「' + sBefore.top + '」 → 「' + sAfter.top + '」');
      } else {
        ok('[R-c] 처방이 있으면 **같은 제품 경로**(`openDefeat()`)를 불러도 0px 이다',
          d.n === 0, d.n + 'px · 막은 횟수 ' + blk + '회');
        ok('[R-d] 그 팔이 실제로 돌았다 (0 이면 [R-c] 는 공허하다)', blk >= 1, blk + '회');
        ok('[R-e] 제품 경로는 그대로 불렸다 — 껍데기만 걷혔다 (`#defw.on` false)',
          sAfter.defw === false, '#defw.on ' + sAfter.defw);
      }
      await p.close();
    }

    console.log('\nPROBE914 ' + (fail ? fail + ' FAIL / ' : '') + pass + '/' + (pass + fail)
      + (fail ? '' : '  ALL PASS'));
    process.exitCode = fail ? 1 : 0;
  } finally { await browser.close(); }
})();
