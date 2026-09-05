#!/usr/bin/env node
/* 작업 904 — 89 유물 «가격 알약» 세로 게이트.
 *
 *   node tools/verify904.js
 *
 * 904 가 옮긴 것은 **테 한 겹**이고, 그것이 «바깥 세로» 와 «속 폭» 을 같이 닫는다.
 *   [1] 선언 — `.rw-cost` height 53.3 · 테두리 2.22 · 안쪽 베벨 2.22 · radius = 높이 절반
 *   [2] 상자 — 네 프레임 전부 260×53.3 · 중심 200(수반 중심) 유지 · 프레임 무관 고정 부품
 *   [3] ★ **내용 자리는 안 줄었다** — 테 안쪽(내용 상자)이 866 판 48.8 과 Δ≤0.2px.
 *       세로를 −4.5px 줄인 것이 «아이콘 36 · 숫자 35 를 눌러서» 가 아님을 못박는다.
 *   [4] 자리 — 위 149 불변 · 하변이 수반 구획(226) 안 · 866 판보다 **위로만** 움직였다
 *   [5] 화소 — `tools/probe904.js`(ref ↔ 우리를 같은 함수로) 가 9/9 여야 한다
 *   [R] 되돌림 — 866 판(57.8 · 테 4.5 + 2.2 · radius 28.9)으로 되돌리면 [2]·[3] 이 빨개진다
 *
 * ⚠ 356 «확대는 등방» 과 부딪히지 않는다 — **가로는 한 점도 안 옮겼다**(ref Δ0.0%).
 *   줄어든 것은 테 두께이고, 그것은 «아트를 비균등으로 늘린다» 와 다른 축이다([3] 이 증인).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const FRAMES = [1600, 1920, 2280, 2600];

const W = 260.0, H = 53.3, BORDER = 2.22, BEVEL = 2.22;
/* 내용 상자(테 안쪽) 세로. ⚠ 크로미움은 border-width 를 정수로 내린다
   (2.22 → 2 · 4.5 → 4) — 그래서 53.3−4 = **49.3** · 866 판은 57.8−8 = **49.8** 이고
   둘의 차는 **0.5px(−1.0%)** 다. 바깥 상자가 4.5px 줄었는데 내용 자리는 0.5px 밖에
   안 줄었다는 것이 «줄인 것은 테다» 의 가장 짧은 증거다([3]·[R2]). */
const INNER_CONTENT = 49.3, INNER_866 = 49.8;
const TOP = 149, MID_H = 226;

let pass = 0, fail = 0;
const ok = (c, t, got) => { if (c) { pass++; console.log('PASS ' + t + (got ? ' — ' + got : '')); }
  else { fail++; console.log('FAIL ' + t + (got ? ' — ' + got : '')); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const CSS_RE = /\.rw-cost\{([^}]*)\}/;
function decl(css) {
  const m = css.match(CSS_RE);
  if (!m) return null;
  const s = m[1];
  const num = (re) => { const v = s.match(re); return v ? parseFloat(v[1]) : NaN; };
  return { h: num(/height:([\d.]+)px/), w: num(/width:([\d.]+)px/),
    border: num(/border:([\d.]+)px solid #000/), radius: num(/border-radius:([\d.]+)px/),
    bevel: num(/inset 0 0 0 ([\d.]+)px/), top: num(/top:([\d.]+)px/) };
}

async function measure(browser) {
  const rows = {};
  for (const F of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: F }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
    await p.evaluate(() => {
      RELICS.forEach((r) => { S.own[r.id] = { n: 0, l: 10 }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    await p.waitForTimeout(700);
    rows[F] = await p.evaluate(() => {
      const O = (s) => { const e = document.querySelector(s); if (!e) return null;
        return { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; };
      const c = document.getElementById('rwCost');
      const cs = getComputedStyle(c);
      /* 내용 상자 = 테 안쪽(클라이언트 상자) — 아이콘·숫자가 실제로 쓰는 세로 자리 */
      return { cost: O('#rwCost'), basin: O('.rw-basin'), mid: O('.rw-mid'),
        /* 내용 세로 = 계산된 height − 테두리 두 겹. ⚠ 크로미움의 computed `height` 는
           box-sizing:border-box 에서 **바깥 상자**를 돌려주고, `clientHeight` 는 정수로
           반올림돼 0.06px 차를 1px 로 부풀린다(둘 다 1회차에 밟았다) */
        content: parseFloat(cs.height) - 2 * parseFloat(cs.borderTopWidth),
        border: parseFloat(cs.borderTopWidth),
        radius: parseFloat(cs.borderTopLeftRadius),
        iw: c.querySelector('i') ? c.querySelector('i').getBoundingClientRect().height : 0 };
    });
    await ctx.close();
  }
  return rows;
}

(async () => {
  const css0 = fs.readFileSync(SRC, 'utf8');
  const d = decl(css0);
  ok(!!d, '[1a] `.rw-cost` 선언을 읽었다');
  ok(d && near(d.h, H, 0.05) && near(d.w, W, 0.05),
    '[1b] 선언 height ' + H + ' · width ' + W + ' (866 판 57.8 — ref 환산 24 ref px 가 아니라 26 을 과녁으로 삼았다)',
    d && d.w + '×' + d.h);
  ok(d && near(d.border, BORDER, 0.02) && near(d.bevel, BEVEL, 0.02),
    '[1c] ★ 테 = 검정 ' + BORDER + ' + 베벨 ' + BEVEL + ' = ' + (BORDER + BEVEL).toFixed(2) +
    ' (= ref 2 ref px · 866 의 4.5 + 2.2 = 6.7 이 아니다)',
    d && d.border + ' + ' + d.bevel);
  ok(d && near(d.radius, d.h / 2, 0.05),
    '[1d] radius 는 규약대로 «높이 절반» 을 따라간다 (높이가 바뀌면 같이 바뀐다)',
    d && d.radius + ' vs ' + (d.h / 2).toFixed(3));
  ok(d && d.top === TOP,
    '[1e] 위(top)는 안 건드렸다 — 줄어든 4.5px 은 **아래에서만** 나온다', d && d.top + '');

  const b = await launch(chromium);
  const R = await measure(b);
  const all = (f) => FRAMES.every((F) => f(R[F]));
  const at = (f) => FRAMES.map((F) => F + ':' + f(R[F])).join(' · ');

  ok(all((r) => near(r.cost.w, W, 0.6) && near(r.cost.h, H, 0.6)),
    '[2a] 네 프레임 전부 알약 상자가 ' + W + '×' + H, at((r) => r.cost.w + '×' + r.cost.h));
  ok(all((r) => near((r.cost.l + r.cost.w / 2) - (r.basin.l + r.basin.w / 2), 0, 0.6)),
    '[2b] 알약 중심 = 수반 중심 (866 [C3] 유지 — 세로만 줄였다)',
    at((r) => ((r.cost.l + r.cost.w / 2) - (r.basin.l + r.basin.w / 2)).toFixed(2)));
  ok(all((r) => near(r.content, INNER_CONTENT, 0.1)),
    '[3] ★ 내용 상자(테 안쪽) ' + INNER_CONTENT + ' — 866 판 ' + INNER_866 + ' 과 **Δ0.5px(−1.0%)**. ' +
    '바깥이 4.5px 줄었는데 내용 자리는 0.5px 만 줄었다 = «아이콘 36 · 숫자 35 를 눌러서» 가 아니다',
    at((r) => r.content.toFixed(2)));
  ok(all((r) => near(r.cost.t, TOP, 0.6) && r.cost.t + r.cost.h <= MID_H + 0.6),
    '[4a] 위 ' + TOP + ' 불변 · 하변이 수반 구획(' + MID_H + ') 안',
    at((r) => r.cost.t + '..' + (r.cost.t + r.cost.h).toFixed(1)));
  ok(all((r) => r.cost.t + r.cost.h < 206.8 - 4),
    '[4b] 하변이 866 판(206.8)보다 **위로** 왔다 — 수반 아래 여백이 ref(24.4) 쪽으로 회수된다',
    at((r) => (MID_H - (r.cost.t + r.cost.h)).toFixed(1) + ' 남음'));
  await b.close();

  /* ── [5] 화소 — 자는 `probe904.js` 가 갖는다(ref ↔ 우리를 같은 함수로) ── */
  let out = '';
  try { out = execFileSync('node', [path.join(__dirname, 'probe904.js')],
    { cwd: ROOT, encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const m = out.match(/PROBE904 (\d+)\/(\d+)/);
  ok(!!m && m[1] === m[2],
    '[5] ★ 찍힌 화소 — `probe904.js` 가 ref ↔ 우리를 같은 함수로 재서 전부 초록',
    m ? m[0] : '점수 줄 없음');
  const dh = out.match(/세로 화소 (\d+) vs ref 환산 ([\d.]+) = \*\*(-?[\d.]+)%/);
  if (dh) console.log('     · 세로 ' + dh[1] + ' vs ref 환산 ' + dh[2] + ' = ' + dh[3] + '%');

  /* ── [R] 되돌림 시험 — 866 판으로 되돌리면 [2a]·[3] 이 빨개진다 ───────────── */
  const REV = css0.replace(CSS_RE, (all_) => all_
    .replace('height:53.3px', 'height:57.8px')
    .replace('border:2.22px solid #000', 'border:4.5px solid #000')
    .replace('border-radius:26.65px', 'border-radius:28.9px')
    .replace('inset 0 0 0 2.22px', 'inset 0 0 0 2.2px'));
  if (REV === css0) ok(false, '[R] 되돌릴 문자열을 못 찾았다(자가 늙었다)');
  else {
    fs.writeFileSync(SRC, REV);
    let rr = null;
    try {
      const b2 = await launch(chromium);
      rr = await measure(b2);
      await b2.close();
    } finally { fs.writeFileSync(SRC, css0); }
    const badH = FRAMES.every((F) => !near(rr[F].cost.h, H, 0.6));
    const sameContent = FRAMES.every((F) => near(rr[F].content, INNER_866, 0.1)
      && Math.abs(rr[F].content - R[F].content) <= 0.6);
    ok(badH, '[R1] 866 판(57.8 · 테 4.5+2.2)으로 되돌리면 [2a] 가 빨개진다 (사본에서 빨개져야 한다)',
      FRAMES.map((F) => F + ':' + rr[F].cost.h).join(' · '));
    ok(sameContent,
      '[R2] ★ 그 사본에서 **바깥은 4.5px 다른데 내용 상자는 0.5px 밖에 안 다르다**(' + INNER_866 +
      ' ↔ ' + INNER_CONTENT + ') — 904 가 줄인 것이 «내용» 이 아니라 «테» 임을 되돌림이 직접 증언한다',
      FRAMES.map((F) => F + ':' + rr[F].content.toFixed(2) + '(Δ' +
        (rr[F].content - R[F].content).toFixed(2) + ')').join(' · '));
  }

  console.log('\nVERIFY904 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
