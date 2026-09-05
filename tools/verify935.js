#!/usr/bin/env node
/* 작업 935 — 89 유물 «가격 알약» 모서리 반지름 게이트.
 *
 *   node tools/verify935.js
 *
 * 935 가 옮긴 것은 **모서리 하나**다(radius 26.65 → 4.44). 866 이 이 부품에 끌어다 쓴
 * 736 «양 끝은 원» 규약이 **이 부품의 규약이 아니었다**는 것이 본체이므로, 이 자는
 * «4.44 인가» 만 묻지 않고 **«무엇이 그 값을 정하는가»** 를 같이 묻는다.
 *
 *   [1] 선언 — radius 4.44 = **테 한 겹**(검정 2.22 + 베벨 2.22) · stadium(높이 절반)이 **아니다**
 *   [2] 렌더 — 네 프레임 전부 computed radius 4.44 · **904 가 닫은 축(260×53.3 · top 149)은 불변**
 *   [3] ★ 스코프 — 89(`.rw-*`) 선언 중 «radius = 높이 절반» 인 것 **0건**
 *       (등재문이 요구한 «같은 화면의 다른 알약·버튼 전수». 래칫 — 새로 생기면 빨개진다)
 *   [4] 화소 — `tools/probe935.js`(ref ↔ 우리를 같은 함수로 · 자 둘이 만나는지까지) 가 전부 초록
 *   [R] 되돌림 — stadium 으로 되돌리면 [1]·[2] 가 빨개지고, 그린 그림에서도 모서리가 파고든다
 *
 * ⚠ 이 자는 **736 을 부정하지 않는다** — 736 은 07 스킬 슬롯의 ref 가 그렇게 생겼다는 관측이고,
 *   여기서 부정되는 것은 «그 관측이 화면을 넘어 상속된다» 는 쪽이다. 근거는 ref 화소뿐이다.
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

const K = 1080 / 486;                 /* ref px → 프레임 px (813·866·904·935 공통) */
const REF_R = 2;                      /* ref 바깥 모서리 반지름 — `probe904` [6] · `probe935` [7] */
const RADIUS = +(REF_R * K).toFixed(2);   /* = 4.44 */
const W = 260.0, H = 53.3, TOP = 149;     /* 904 가 닫은 축 — 이 회차는 한 점도 안 옮긴다 */
const STADIUM = 26.65;

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
  return { h: num(/height:([\d.]+)px/), w: num(/width:([\d.]+)px/), top: num(/top:([\d.]+)px/),
    border: num(/border:([\d.]+)px solid #000/), radius: num(/border-radius:([\d.]+)px/),
    bevel: num(/inset 0 0 0 ([\d.]+)px/) };
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
      const c = document.getElementById('rwCost');
      const cs = getComputedStyle(c);
      /* 네 모서리를 다 읽는다 — 한 귀퉁이만 고치고 넘어간 자리가 없어야 한다 */
      return { l: c.offsetLeft, t: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight,
        r: [cs.borderTopLeftRadius, cs.borderTopRightRadius,
          cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(parseFloat),
        hh: parseFloat(cs.height) };
    });
    await ctx.close();
  }
  return rows;
}

(async () => {
  const css0 = fs.readFileSync(SRC, 'utf8');
  const d = decl(css0);
  ok(!!d, '[1a] `.rw-cost` 선언을 읽었다');
  ok(d && near(d.radius, RADIUS, 0.02),
    '[1b] ★ 선언 radius ' + RADIUS + ' = ref 실측 ' + REF_R + ' ref px × ' + K.toFixed(4),
    d && d.radius + '');
  ok(d && !near(d.radius, d.h / 2, 1),
    '[1c] ★ **stadium 이 아니다** — 736 «양 끝은 원» 은 07 스킬 슬롯의 ref 관측이지 이 부품의 ' +
    '규약이 아니다(높이 절반이면 ' + (d ? (d.h / 2).toFixed(2) : '?') + ')',
    d && d.radius + ' vs ' + (d.h / 2).toFixed(2));
  ok(d && near(d.radius, d.border + d.bevel, 0.02),
    '[1d] ★ 그 값이 **테 한 겹**(검정 ' + (d ? d.border : '?') + ' + 베벨 ' + (d ? d.bevel : '?') +
    ')과 같다 — ref 도 «테 2 ref px = 모서리 2 ref px» 다. 셋이 갈리면 빨개진다',
    d && d.radius + ' vs ' + (d.border + d.bevel).toFixed(2));
  ok(d && near(d.h, H, 0.05) && near(d.w, W, 0.05) && d.top === TOP,
    '[1e] ★ 904 가 닫은 축은 **한 점도 안 옮겼다** — ' + W + '×' + H + ' · top ' + TOP,
    d && d.w + '×' + d.h + ' · top ' + d.top);

  /* ── [3] 스코프 — 89 화면 전수(등재문이 요구한 «같은 규약을 쓰는 자리 세기») ── */
  /* ⚠ 선택자는 **줄머리에 붙잡아야** 한다 — `\.rw-[^{]*\{` 로 느슨하게 잡으면 «주석이 언급한
     `.rw-panel`» 과 그 다음에 오는 **남의 블록**이 한 쌍으로 붙어 «rw-panel r38/h76» 같은
     유령이 나온다(1회차에 그랬다 — 실제 주인은 `#relw .rl-help` 라는 **원형 도움말 버튼**이다). */
  const rwDecls = [...css0.matchAll(/^[ \t]*(\.rw-[a-z0-9-][^{\n]*)\{([^}]*)\}/gm)];
  const stad = [];
  for (const m of rwDecls) {
    const body = m[2];
    const h = body.match(/height:([\d.]+)px/), r = body.match(/border-radius:([\d.]+)px/);
    if (!h || !r) continue;
    if (near(parseFloat(r[1]), parseFloat(h[1]) / 2, 0.5))
      stad.push(m[1].trim() + ' r' + r[1] + '/h' + h[1]);
  }
  ok(stad.length === 0,
    '[3] ★ 89(`.rw-*`) 선언 ' + rwDecls.length + '개 중 «radius = 높이 절반» **0건** — ' +
    '이 규약을 쓰던 자리는 `.rw-cost` 하나뿐이었고 그것이 이번에 사라졌다(래칫)',
    stad.length ? stad.join(' · ') : '0건');

  const b = await launch(chromium);
  const R = await measure(b);
  await b.close();
  const all = (f) => FRAMES.every((F) => f(R[F]));
  const at = (f) => FRAMES.map((F) => F + ':' + f(R[F])).join(' · ');

  ok(all((r) => r.r.every((v) => near(v, RADIUS, 0.05))),
    '[2a] ★ 네 프레임 × **네 모서리** 전부 computed radius ' + RADIUS,
    at((r) => r.r.map((v) => v.toFixed(2)).join('/')));
  ok(all((r) => near(r.w, W, 0.6) && near(r.hh, H, 0.6) && near(r.t, TOP, 0.6)),
    '[2b] 904 축 회귀 — 상자 ' + W + '×' + H + ' · top ' + TOP + ' 가 그대로다',
    at((r) => r.w + '×' + r.hh + '@' + r.t));

  /* ── [4] 화소 ── */
  let out = '';
  try { out = execFileSync('node', [path.join(__dirname, 'probe935.js')],
    { cwd: ROOT, encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const m4 = out.match(/PROBE935 (\d+)\/(\d+)/);
  ok(!!m4 && m4[1] === m4[2],
    '[4] ★ 찍힌 화소 — `probe935.js` 가 ref ↔ 우리를 같은 함수로 재서 전부 초록',
    m4 ? m4[0] : '점수 줄 없음');
  const rl = out.match(/\[R\][^\n]*?(\d+)px \(맞춘 r ([\d.]+)\)/);
  if (rl) console.log('     · 그 자의 되돌림 — stadium 을 씌우면 파고드는 깊이가 ' + rl[1] + 'px');
  const c7 = out.match(/ref (\d+)\/(\d+) = ([\d.]+)/);
  if (c7) console.log('     · 두 자가 만난 자리 — ref 곧은 변 ' + c7[1] + '/' + c7[2] +
    ' = ' + c7[3] + ' (`probe904` [6] 과 같은 값)');

  /* ── [R] 되돌림 — 선언을 stadium 으로 되돌리면 [1b][1c][1d] 가 빨개진다 ── */
  const REV = css0.replace(CSS_RE, (a) => a.replace('border-radius:' + RADIUS + 'px',
    'border-radius:' + STADIUM + 'px'));
  if (REV === css0) ok(false, '[R] 되돌릴 문자열을 못 찾았다(자가 늙었다)');
  else {
    const d2 = decl(REV);
    ok(d2 && !near(d2.radius, RADIUS, 0.02) && near(d2.radius, d2.h / 2, 0.05)
      && !near(d2.radius, d2.border + d2.bevel, 0.02),
      '[R1] ★ 사본을 stadium(' + STADIUM + ')으로 되돌리면 [1b]·[1c]·[1d] 가 **셋 다** 빨개진다 ' +
      '— 이 항이 초록이 아니면 위 셋이 무른 것이다', d2 && d2.radius + '');
    /* 그린 그림에서의 되돌림은 `probe935` [R] 이 매 실행 찍는다(파일을 안 건드린다) */
    ok(!!rl && parseInt(rl[1], 10) >= 6,
      '[R2] ★ **그린 그림**에서도 되돌림이 산다 — stadium 을 다시 씌우면 속 모서리가 ' +
      (rl ? rl[1] : '?') + 'px 파고든다(수리 후 0)', rl ? rl[1] + 'px' : '없음');
  }

  console.log('\nVERIFY935 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
