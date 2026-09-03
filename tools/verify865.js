/* 작업 865 게이트 — «`lance`(천벌의 창)의 잔광 줄은 ①층이다»
 *
 *   node tools/verify865.js
 *
 * 792 가 못박은 문법: **모든 발은 ①후광 · ②본체 · ③하이라이트 세 층을 전부 갖는다.**
 * 865 는 그 문법의 **마지막 예외**를 닫은 자리다 — 창의 잔광 줄만 `halo()` **밖에서** 제 손으로
 * 깔려 세 층 어디에도 안 들었고(α .42 는 링 씨앗 문턱 .5 에도 코어 씨앗 문턱 .85 에도 못 든다),
 * 화면에는 «밑동 43×28px 의 평평한 반투명 판» 으로 남아 «창» 이 아니라 UI 조각으로 읽혔다
 * (856 3회차 비평 DB·DC 2인 독립 1순위).
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────────
 *   [C] 선언 — 잔광 줄이 `halo()` closure **안**에 있고, 그 호출이 창 갈래에 **한 번**뿐이다.
 *   [S] 형상 — 창날 본체 경로가 **한 획도 안 바뀌었다**(865 가 고친 것은 «어느 층인가» 뿐이다).
 *   [A] 픽셀 — 제품 트리에 **층 미배정 잉크가 0** 이고, ①②③ 세 층은 그대로 있다.
 *   [R] 되돌림 — 잔광을 옛 자리(`halo()` 밖)로 되돌린 사본에서 [A1] 이 **실제로** 빨개진다.
 *
 * 자와 재현기는 **같은 자**를 쓴다 — 측정·되돌림 사본은 `probe865.js` 가 내보낸 것을 그대로
 * 물어다 쓴다(같은 것을 두 벌 적으면 그것이 곧 다음 어긋남이다 · 402).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measure, mkOld, ROOT, CBAND } = require('./probe865');

const SRC = path.join(ROOT, 'index.html');
/* ⚠ 사본은 저장소 루트에(/tmp 면 상대 경로 assets/** 가 404) · pid 를 섞고(648) · 끝나면 지운다(810). */
const NEG = path.join(ROOT, '.v865-neg-' + process.pid + '.html');

/* 창 갈래를 소스에서 잘라낸다 — «머리만 붙잡고 다음 갈래까지»(792 [R] 주석의 규칙). */
const HEAD = `}else if(sh === 'lance'){`;
const TAIL = `}else if(sh === 'fire'`;
const GLOW = `ctx.strokeStyle = 'rgba(255,208,255,.42)'; ctx.lineWidth = 7;`;
/* 창날 본체 경로 — 865 는 이 여섯 점을 **한 글자도** 안 건드렸다 */
const BLADE = [`ctx.moveTo(23.4,0); ctx.lineTo(4.7,2.65); ctx.lineTo(-12.5,1.7); ctx.lineTo(-15.6,0);`,
               `ctx.lineTo(-12.5,-1.7); ctx.lineTo(4.7,-2.65);`];

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ⚠ **주석을 먼저 걷어낸다.** 865 가 이 갈래에 남긴 인계 주석이 `halo()` 를 세 번 말하므로
   글자만 세면 «호출 3회» 로 읽힌다(1회차에 실제로 그렇게 빨갰다). 자가 세는 것은 **코드**다. */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/* `halo(` 부터 짝이 맞는 `)` 까지 — 괄호를 세어 자른다(정규식으로는 중첩을 못 센다). */
function haloBlocks(seg) {
  const out = [];
  let i = 0;
  while ((i = seg.indexOf('halo(', i)) >= 0) {
    let d = 0, j = i + 4;
    for (; j < seg.length; j++) {
      const c = seg[j];
      if (c === '(') d++;
      else if (c === ')') { d--; if (d === 0) { j++; break; } }
    }
    out.push(seg.slice(i, j));
    i = j;
  }
  return out;
}

(async () => {
  console.log('=== VERIFY 865 — 창 잔광 줄의 층 배정 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [C]·[S] 선언 (브라우저 없이) ── */
  const h = src.indexOf(HEAD), t = src.indexOf(TAIL, h < 0 ? 0 : h);
  ok(h >= 0 && t > h, '[C0] `shotBody` 에서 `lance` 갈래를 잘라냈다 (머리 ' + (h >= 0) + ' · 꼬리 ' + (t > h) + ')');
  const seg = h >= 0 && t > h ? strip(src.slice(h, t)) : '';
  const blocks = haloBlocks(seg);

  ok(blocks.length === 1,
     '[C1] 창 갈래의 `halo()` 호출은 **한 번**뿐이다 — 실측 ' + blocks.length +
     '회 (`auraDone` 이 링을 한 장으로 묶고, 폴백 `haloSprite` 는 `sh` 로만 캐시한다)');
  ok(seg.split(GLOW).length === 2,
     '[C2] 잔광 줄(α .42 · 굵기 7)이 창 갈래에 딱 한 벌 있다 — 실측 ' + (seg.split(GLOW).length - 1) + '벌');
  ok(blocks.length === 1 && blocks[0].includes(GLOW),
     '[C3] **그 잔광 줄이 `halo()` closure 안에 있다** — 865 의 본체 (밖이면 그 종만 옛 문법으로 떨어진다)');
  ok(!!seg && seg.includes(`ctx.strokeStyle = 'rgba(255,208,255,.16)'`) &&
     blocks.length === 1 && blocks[0].includes(`rgba(255,208,255,.16)`),
     '[C4] 옛 후광 줄(α .16)도 같은 closure 안에 그대로다 — 그림을 지운 것이 아니라 자리를 옮겼다');

  ok(BLADE.every(s => seg.includes(s)),
     '[S1] 창날 본체 경로 여섯 점이 **한 글자도 안 바뀌었다** (865 가 고친 것은 «어느 층인가» 뿐)');
  ok(seg.includes('spec(() =>'),
     '[S2] ③층(날 끝 섬광)은 856 이 넣은 `spec()` 자리에 그대로다');
  ok(!/ctx\.ellipse\(/.test(seg),
     '[S3] 6회차가 버린 **타원 후광이 안 돌아왔다** — 되살리면 얼음창과 «타원 + 앞쪽 촉» 으로 다시 붙는다 (`verify710` [D1])');

  /* ── [A]·[R] 픽셀 ── */
  if (!mkOld(NEG)) {
    ok(false, '[R0] 되돌림 사본을 지었다 — 닻(창날 경로 첫 두 점)이 소스에 딱 한 번이 아니다');
  } else {
    ok(true, '[R0] 되돌림 사본을 지었다 — 잔광 줄을 `halo()` **밖**(옛 자리)에 되돌려 깐다');
    const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
    let now, old;
    try {
      now = await measure(browser, 'file://' + SRC);
      old = await measure(browser, 'file://' + NEG);
    } finally {
      await browser.close();
      try { fs.unlinkSync(NEG); } catch (e) { /* 810 */ }
    }
    const b = now && now.out, a = old && old.out;
    if (!b || b.__err || b.err || !a || a.__err || a.err) {
      ok(false, '[A0] 측정 하네스가 돌았다 — ' + JSON.stringify({ now: b, old: a }));
    } else {
      console.log('  [실측] 제품  — 잉크 ' + b.ink + ' (본체 ' + b.body + ' · 후광 ' + b.soft +
                  ' · 근백색 ' + b.near + ') · 층 미배정 ' + b.slab + ' · 본체 뒤 잉크 ' + b.tw + '×' + b.th + 'px');
      console.log('  [실측] 되돌림 — 잉크 ' + a.ink + ' (본체 ' + a.body + ' · 후광 ' + a.soft +
                  ' · 근백색 ' + a.near + ') · 층 미배정 ' + a.slab + ' · 본체 뒤 잉크 ' + a.tw + '×' + a.th + 'px\n');

      ok(b.slab === 0,
         '[A1] 제품에 **층 미배정 잉크가 0** 이다 — 실측 ' + b.slab + '화소 (본체에서 띠 ' + CBAND +
         'px 밖 · 근백색 아님 · α < .5)');
      ok(b.body > 0 && b.soft > 0 && b.near > 0,
         '[A2] 792 문법 — ①②③ 세 층이 전부 있다 (후광 ' + b.soft + ' · 본체 ' + b.body + ' · 근백색 ' + b.near + ')');
      ok(b.tw <= 20,
         '[A3] 본체 뒤로 나온 잉크가 **링 두께 안**이다 — 실측 ' + b.tw +
         'px ≤ 20 (설계 두께 3.9로컬 × 4 = 15.6기기px + 여유)');
      ok(b.fFar <= 0.03,
         '[A4] `verify792` [B8s] 의 «먼몫» 이 문턱 아래다 — 실측 ' + b.fFar +
         ' ≤ 0.03 (수리 전 0.158 · 창은 이제 «자가 링을 못 가리는 종» 이 아니다)');

      ok(a.slab >= 400,
         '[R1] 잔광을 `halo()` 밖으로 되돌리면 [A1] 이 **실제로** 빨개진다 — 되돌림 사본 층 미배정 ' +
         a.slab + '화소 ≥ 400');
      ok(a.tw >= 38,
         '[R2] 되돌리면 [A3] 도 빨개진다 — 되돌림 사본 본체 뒤 잉크 ' + a.tw + 'px ≥ 38 (등재문 43px)');
      ok(a.near > 0 && b.near > 0,
         '[R3] 되돌림은 ③층을 안 건드린다 — 근백색 되돌림 ' + a.near + ' ↔ 제품 ' + b.near +
         ' (둘 다 > 0 · 865 는 코어의 재료가 아니었다)');
      ok(now.errs.length === 0 && old.errs.length === 0,
         '[G1] 콘솔/페이지 오류 0건 (제품 ' + now.errs.length + ' · 되돌림 ' + old.errs.length + ')');
    }
  }

  console.log('\nVERIFY865 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
