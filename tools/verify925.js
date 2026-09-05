/* 게이트 925 — 화소를 재는 자는 **한 자도 빠짐없이** 공용 부트스트랩(`pwlaunch`)을 지난다
 *
 *   node tools/verify925.js
 *
 * 무엇을 지키는가 —
 *   918 은 걷개를 907 판별기(①∧②)에 걸었고, 922 는 그 여집합(«화소를 재는가»)까지 입구를 넓혔다.
 *   그런데 두 규칙 다 **자가 `pwlaunch.launch()` 를 지난다는 전제** 위에 서 있다 — 장치는 거기 한 곳에
 *   걸려 있기 때문이다(291 정착 · 731 소실 차단기 · 907 판 결정성 깃발 · 918/922 껍데기 걷개).
 *   `probe523`·`verify77`·`verify79`·`verify80` 넷은 `require('playwright')` 를 직접 불러
 *   **규칙을 아무리 넓혀도 안 걸리는 자리**에 서 있었다(922 §8 등재 = 이 작업). 925 가 넷을 갈아 끼웠고,
 *   이 자는 그 자리가 다시 생기지 않게 «사슬을 안 지나는 자 0» 을 못박는다.
 *
 * 절 —
 *   [1] 규칙   — 목록이 아니라 판별기다. 갈래는 넷(사슬 require · 사슬 주입 · 사슬 밖 · 무관).
 *   [2] 전수   — 화소를 재는 자(922 의 census) 중 **사슬 밖 0**.
 *                (952) 그 인구의 «무관» 칸은 **적어 두기만 한 자**(문자열 표본)뿐이고, «도는 코드로 재는데
 *                브라우저를 안 띄우는 자» 는 0 이다 — 갈래는 `tools/quote952.js` 가 가른다.
 *   [3] 넷     — 925 가 갈아 끼운 넷이 실제로 사슬을 지나고, 자기 사본(모듈 해석·실행 파일 폴백)을 안 든다.
 *   [4] 자식   — `verify471` 처럼 **자식 프로세스에 절대 경로로 심는 자**는 «사슬 밖» 이 아니다(거짓 양성 0).
 *   [5] 그린 것 — 그 넷의 entry 로 판을 지으면 걷개가 실제로 심긴다(= 사슬에 붙은 장치를 받는다).
 *   [R] 되돌림 — 옛 부트스트랩 사본을 그대로 가진 자를 지어 물으면 **«사슬 밖» 으로 잡힌다**
 *                (= [2] 는 «셀 것이 없어서» 초록인 헛초록이 아니다).
 *
 * 걷개 본체는 `tools/shell918.js` · 갈래 세기는 `tools/probe922.js` 의 `census()` 를 그대로 읽는다
 * (402 «사본을 지운다» — 여기서 «화소를 재는가» 를 다시 적지 않는다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const shell918 = require('./shell918');
const { census } = require('./probe922');
const { pixelKind } = require('./quote952');      /* 952 — «적어 둔 코드» ↔ «도는 코드» */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const TOOLS = __dirname;
const URL = 'file://' + path.join(ROOT, 'index.html');
const T = f => path.join(TOOLS, f);

/* 925 가 갈아 끼운 넷 — 등재문이 이름으로 적어 둔 그 자리다 */
const SWAPPED = ['probe523.js', 'verify77.js', 'verify79.js', 'verify80.js'];

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* ---- 규칙 — 한 자의 «사슬과의 관계» 를 소스만 보고 가른다 ----
   ⚠ 갈래가 셋이 아니라 넷인 것이 이 규칙의 요점이다. `verify471` 은 `require('./pwlaunch')` 를
   안 쓰지만 **자식 프로세스에 절대 경로로 심는다** — 정적 grep 을 «require 한 줄» 로만 짜면
   그 자가 거짓 양성으로 잡힌다(등재문 ⚠). 그래서 «사슬을 말하는가» 를 먼저 묻고,
   그 다음에 «playwright 를 직접 부르는가» 를 묻는다. */
const RE_CHAIN_REQ = /require\((['"])\.[\\/]pwlaunch\1\)/;
const RE_PWLAUNCH = /pwlaunch/;
const RE_DIRECT = /require\((['"])playwright\1\)/;

function classify(src) {
  if (RE_CHAIN_REQ.test(src)) return 'chain';
  if (RE_PWLAUNCH.test(src)) return 'inject';     /* 자식 프로세스에 심는 자 — 사슬 안이다 */
  if (RE_DIRECT.test(src)) return 'bypass';       /* 사슬 밖 — 925 가 없앤 자리 */
  return 'none';                                  /* 브라우저를 안 띄우는 자 */
}
const classifyFile = p => classify(fs.readFileSync(p, 'utf8'));

module.exports = { classify, classifyFile, SWAPPED };

if (require.main !== module) return;

/* 지어낸 자 — 규칙은 «내용» 으로 판정하므로 실물 없이도 물을 수 있다(922 [1] 과 같은 꼴).
   ⚠ 저장소가 아니라 os 임시 자리에 짓는다 — census 도 추적 규칙도 이 파일을 안 본다. */
const made = [];
const mk = (n, src) => {
  const p = path.join(os.tmpdir(), 'verify925-' + n + '-' + process.pid + '.js');
  fs.writeFileSync(p, src); made.push(p); return p;
};
/* 925 이전의 그 부트스트랩 사본 — 넷이 똑같이 들고 있던 것(주석까지 같은 꼴은 필요 없다) */
const OLD_BOOTSTRAP =
  'const { chromium } = (() => {\n' +
  "  try { return require('playwright'); } catch (_) {}\n" +
  '})();\n' +
  'const b = await chromium.launch({ args });\n' +
  'const png = await page.screenshot({ clip: box });\n';

(async () => {
  const c = census();
  const px = [...c.hit, ...c.px, ...c.pxManual, ...c.pxSelf];   /* 화소를 재는 자 전부 */

  /* ---------------- [1] 규칙 ---------------- */
  console.log('\n[1] 규칙 — 갈래는 넷이다(사슬 require · 사슬 주입 · 사슬 밖 · 무관)');
  const A = mk('chain', "const { pw, launch } = require('./pwlaunch');\n");
  const B = mk('inject', 'const s = JSON.stringify(path.join(__dirname, "pwlaunch"));\n');
  const C = mk('bypass', OLD_BOOTSTRAP);
  const D = mk('none', 'const fs = require("fs");\n');
  ok('[1a] 사슬을 require 하면 «사슬»', classifyFile(A) === 'chain');
  ok('[1b] 자식에 심는 자도 «사슬» (거짓 양성 0)', classifyFile(B) === 'inject');
  ok('[1c] playwright 를 직접 부르고 사슬을 한 번도 안 말하면 «사슬 밖»', classifyFile(C) === 'bypass');
  ok('[1d] 브라우저를 안 띄우는 자는 «무관»', classifyFile(D) === 'none');
  ok('[1e] 손으로 적은 이름 배열이 판정에 안 쓰인다 — 목록이 아니라 규칙이다',
    classify(OLD_BOOTSTRAP.replace('playwright', 'playwright')) === 'bypass'
    && classify("require('./pwlaunch')") === 'chain');

  /* ---------------- [2] 전수 ---------------- */
  console.log('\n[2] 전수 — 화소를 재는 자 중 «사슬 밖» 0');
  const bad = px.filter(f => classifyFile(T(f)) === 'bypass');
  const byKind = k => px.filter(f => classifyFile(T(f)) === k).length;
  console.log('  화소를 재는 자 ' + px.length + ' = 사슬 ' + byKind('chain')
    + ' + 자식에 심는 자 ' + byKind('inject') + ' + 사슬 밖 ' + bad.length + ' + 무관 ' + byKind('none'));
  ok('[2a] 화소를 재는 자가 922 등재문의 규모다 (306 ± 자 증감)', px.length >= 300, px.length + '개');
  ok('[2b] 그중 «사슬 밖» 이 한 자도 없다', bad.length === 0, bad.join(' ') || '어긋남 0');
  ok('[2c] 갈래의 합이 전체다 (한 자가 두 칸에 안 들어간다)',
    byKind('chain') + byKind('inject') + bad.length + byKind('none') === px.length);
  /* 작업 952 — «무관» 을 두 갈래로 가른다.
     세는 쪽(`shell918.RE_PX`)은 **주석만 벗긴 소스**에 정규식을 대므로 «문자열 표본으로 적어 둔 화소 코드» 도
     인구에 든다(걷개를 켜는 자리에서는 넉넉한 쪽이 안전하다 — 안 재는 자에 켜져도 무해). 그런데 여기서는
     그 넉넉함이 곧 오탐이었다: `verify936` 은 판별기에 먹이는 인공 표본 `BASE` 안에 `getImageData` 를
     들고 있을 뿐 브라우저를 한 번도 안 띄운다 ⇒ 사슬을 지나라고 요구할 대상 자체가 없다.
     ⚠ **문턱을 무르게 푼 것이 아니다** — 의무는 «도는 코드로 재는 자»(`pixelKind === 'code'`) 에 그대로 남고,
        [2g] 가 «적어 두기만 한 자» 를 이름까지 찍어 눈에 보이게 둔다. 되돌림은 `verify952` §R. */
  const kindOf = f => pixelKind(fs.readFileSync(T(f), 'utf8'));
  const leak = px.filter(f => classifyFile(T(f)) === 'none' && kindOf(f) === 'code');
  const quoted = px.filter(f => classifyFile(T(f)) === 'none' && kindOf(f) === 'quote');
  ok('[2d] «무관» 으로 새는 자가 없다 — **도는 코드로** 화소를 재면 브라우저를 띄운다',
    leak.length === 0, leak.join(' ') || '0개');
  ok('[2g] «무관» 인 자는 한 자도 빠짐없이 «적어 두기만 한 자» 다 (952 — 인구는 그대로, 갈래만 갈랐다)',
    quoted.length === byKind('none'),
    quoted.join(' ') || '0개');
  ok('[2h] 그 가름이 «무엇을 해도 quote» 가 아니다 — 도는 코드는 code 로 잡힌다',
    pixelKind('await page.evaluate(() => ctx.getImageData(0, 0, 1, 1));') === 'code'
    && pixelKind("const S = ['ctx.getImageData(0,0,1,1)'].join('');") === 'quote');

  /* 작업 931 — 여집합까지 넓힌다.
     925 의 [2] 는 «화소를 재는 자» 만 센다. 그 여집합 44 는 화소를 안 재서 918/922 걷개도 907 깃발도
     안 걸리지만 **291 정착·731 소실 차단기는 화소와 무관한 장치**라, 사슬 밖에 서 있으면 그 둘을 못 받는다.
     931 이 그 44 를 «어느 장치가 실제로 뜻을 갖는가» 로 갈라 갈래별로 들이고 있다(`probe931`).
     ⚠ **늦은 require 여야 한다** — `probe931` 이 이 파일의 `classifyFile` 을 쓰므로 맨 위에서 부르면
       순환이 되어 `module.exports` 가 아직 안 붙은 사본을 집는다. 이 자리는 exports 뒤라 안전하다. */
  const { census: census931 } = require('./probe931');
  const rest931 = census931();
  /* 931 1회차 A·C·D → **2회차에 B·E 까지** 들였다. 갈래가 다섯뿐이므로 이 목록은 이제
     «여집합 44 가 통째로 사슬 안» 과 같은 말이고, 새 자가 사슬 밖에 서면 여기가 곧바로 빨개진다. */
  const done931 = ['A', 'B', 'C', 'D', 'E'];
  const left = rest931.filter(r => done931.includes(r.branch));
  console.log('  931 여집합 — 남은 사슬 밖 ' + rest931.length + ' (갈래 ' +
    [...new Set(rest931.map(r => r.branch))].sort().join('·') + ')');
  ok('[2e] 931 이 들인 갈래(A~E 전부)에 «사슬 밖» 이 한 자도 없다 — 여집합도 같은 규칙으로 센다',
    left.length === 0, left.map(r => r.file).join(' ') || '어긋남 0');
  ok('[2f] 여집합에 918/922 걷개·907 깃발이 걸리는 자는 0 — 그래서 이 둘은 «화소를 재는 자» 문제였다',
    rest931.every(r => !r.d918 && !r.d907));

  /* ---------------- [3] 925 가 갈아 끼운 넷 ---------------- */
  console.log('\n[3] 넷 — 등재문이 이름으로 적어 둔 그 자리');
  for (const f of SWAPPED) {
    const src = fs.readFileSync(T(f), 'utf8');
    ok('[3-' + f + '] 사슬을 지난다', classify(src) === 'chain' && /\blaunch\(chromium/.test(src));
    ok('[3-' + f + '] 자기 사본이 없다 (모듈 해석 IIFE · 실행 파일 폴백 · 직접 launch)',
      !/chromium\.launch\(/.test(src) && !/PW_CHROMIUM/.test(src)
      && !/node_modules', 'playwright'/.test(src));
    ok('[3-' + f + '] 걷개가 켜지는 자다 (922 규칙을 실제로 만족)', shell918.qualifies(T(f)));
  }

  /* ---------------- [4] 자식 프로세스 갈래 ---------------- */
  console.log('\n[4] 자식 — 절대 경로로 심는 자는 «사슬 밖» 이 아니다');
  const v471 = fs.readFileSync(T('verify471.js'), 'utf8');
  ok('[4a] `verify471` 은 사슬을 require 하지 않는다 (정적 grep 이 거짓 양성을 낼 자리)',
    !RE_CHAIN_REQ.test(v471));
  ok('[4b] 그래도 «사슬» 로 세어진다 — 자식에 절대 경로로 심기 때문',
    classify(v471) === 'inject' && /pwlaunch/.test(v471));

  /* ---------------- 브라우저 절 ---------------- */
  const browser = await launch(chromium);
  try {
    console.log('\n[5] 그린 것 — 넷의 entry 로 지은 판에 걷개가 심긴다');
    const entry = T('verify80.js');
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    delete page.__shell918;
    await shell918.arm(page, { env: {}, entry });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto(URL);
    await page.waitForTimeout(1400);
    ok('[5a] 걷개가 심겼다 (entry = verify80.js)', !!page.shell918);
    await page.evaluate(() => { openDefeat(); });
    await page.waitForTimeout(150);
    const st = await page.shell918();
    ok('[5b] 제품이 켠 껍데기를 봤다 — 본 횟수 ≥ 1', st.seen >= 1, '본 횟수 ' + st.seen);
    ok('[5c] 그 자리에서 걷었다 — 막은 횟수 ≥ 1', st.swept >= 1, '막은 횟수 ' + st.swept);
    ok('[5d] `#defw.on` 이 남아 있지 않다 — 화소를 재는 자가 딤 아래에서 안 잰다',
      (await page.evaluate(() => {
        const d = document.getElementById('defw'); return !!d && d.classList.contains('on');
      })) === false);
    await page.close();

    console.log('\n[R] 되돌림 — 옛 부트스트랩을 그대로 가진 자를 지어 물으면 «사슬 밖» 으로 잡힌다');
    ok('[R1] 지어낸 옛 사본은 «사슬 밖» 이다 (= [2b] 는 헛초록이 아니다)',
      classifyFile(C) === 'bypass');
    ok('[R2] 그 자에 사슬 한 줄을 넣으면 곧바로 «사슬» 이 된다 — 처방은 한 줄이다',
      classify("const { pw, launch } = require('./pwlaunch');\n" + OLD_BOOTSTRAP) === 'chain');
    ok('[R3] 걷개는 사슬을 지나야 심긴다 — 사슬 밖 자에는 심길 자리가 없다',
      !/shell918|settle291|evguard731/.test(OLD_BOOTSTRAP));
  } finally {
    await browser.close();
    made.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
  }

  console.log('\nVERIFY925 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
