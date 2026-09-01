'use strict';
/* ==========================================================================
   verify712 — «조용히 사라지는 절» 방지 자   (작업 712, 2026-09-01)
   --------------------------------------------------------------------------
   무엇을 지키는가
     199 21회차가 주인 결정 결3 ⓑ 를 이행하며 `OFF_MAX_H`(1회 적립 상한 6h)를 **선언째**
     걷어냈다. 696 이 그때 «즉사» 한 자들(sim168·177·249 — 정규식이 못 찾아 `process.exit(1)`)을
     거뒀는데, **같은 폐지가 만든 두 번째 병**이 남아 있었다:
       `tools/verify498.js` §6 · `tools/probe498.js` §4 는 그 상수를 **페이지 안에서**
       (`page.evaluate` 본문에서) 읽는다 ⇒ `ReferenceError` ⇒ 공용 `ev()` 가 예외를 삼키고
       `if (day)` 가 조용히 건너뛴다 ⇒ **다섯 줄이 통째로 사라진 채 자는 46/46 «PASS»** 로 끝난다.
     696 은 «빨간 죽음», 712 는 **«초록으로 읽히는 빨강»** 이다. 기계가 다르니 자도 따로 있다.

   무엇을 고쳤는가 (제품 `index.html` 0줄 — 게이트 두 파일이 전부다)
     ⓐ 축 이관 — `OFF_MAX_H * 60 * 3` → `OFF_DAY_CAP_MIN * OFF_DIA_PM`.
        ⚠ **이름만 갈면 안 됐다** — 같은 식의 두 번째 숫자 «분당 3» 도 199 2회차(48)·
        21회차(75) 이전의 사본이라, 이름만 갈았으면 오프라인 몫이 여전히 1/25 로 잡힌다.
     ⓑ 위생 — 두 자에 «이 절이 실제로 돌았는가» 한 항을 세웠다(278·319 처방).
        절이 통째로 비면 **그것 자체가 한 항의 빨강**이다.

   절
     [A] 정적 — 두 자가 폐지된 상수를 더는 안 읽고 살아 있는 두 축을 읽는다 · 제품 선언 확인
     [B] 값 — 게이트가 쓰는 식이 **제품 실지급 경로**(offlineReward → offPend.dia)와 같은 값인가.
         (손으로 적은 숫자가 또 낡는 것을 막는 자리 — 옛 식 6×60×3 은 음성항으로 같이 잰다)
     [C] 두 자가 실제로 그 절을 찍고 끝난다 — 사라졌던 다섯 줄·두 줄이 stdout 에 있다
     [D] 되돌림 시험 — 폐지된 상수를 도로 심은 사본은 **빨갛게** 끝난다(수리 전에는 초록이었다).
         이것이 «무르게 푼 수리가 아님» 을 못박는 자리다(334·348·364·368 규약).
     [E] 전수 스윕 — 저장소 도구 중 `OFF_MAX_H` 를 주석 밖에서 읽는 자 0건 + 그 스윕의 되돌림

   ⚠ 임시 사본은 전부 `.v712-*-<pid>.js`(648 — 고정 이름 사본은 병렬 실행에서 서로를 지운다).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const TOOLS = __dirname;
const ROOT = path.resolve(__dirname, '..');
const SRCF = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(SRCF, 'utf8');

const R = [];
const yes = (n, got, d) => R.push({ n: n + (d !== undefined && d !== '' ? ' — ' + d : ''), got: String(got), want: 'true', pass: got === true });
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });

const tmps = [];
function tmp(tag, body) {
  const p = path.join(TOOLS, '.v712-' + tag + '-' + process.pid + '.js');
  fs.writeFileSync(p, body);
  tmps.push(p);
  return p;
}
function run(file) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [file],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }), err: '' };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || ''), err: String(e.stderr || '') };
  }
}
/* 주석(블록·줄)을 걷어낸 본문 — «주석에 이름을 적는 것» 은 이관 기록이라 잡으면 안 된다 */
const nude = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
/* ⚑ [E] 스코프 — 주석에 더해 **문자열·정규식 리터럴까지** 걷어낸 «맨 읽기» 만 본다.
   696 이 미리 적어 둔 함정이다: 폐지를 **확인하는 음성 단언**(`!/const OFF_MAX_H/.test(src)`)
   도 그 이름을 적어야 하므로, 리터럴을 안 걷어내면 «폐지를 지키는 자» 가 곧바로 거짓 빨강이
   된다(1회차에 `verify696` 이 실제로 그렇게 잡혔다). 잡아야 할 것은 페이지 안에서 **식별자로
   읽는 것** 하나뿐이다.
   ⚠ 정규식 다발이 아니라 **한 번 훑는 스캐너**다(작업 755). 옛 꼴(교체 4연발)은
   «따옴표를 품은 정규식»(`verify385.js` 125행 `/--sx:'\s*\+/`)에서 문자열 짝을 잘못 물어
   뒤가 통째로 엉키고, 정규식 리터럴 패턴의 문자클래스 갈래가 줄을 넘어 되짚으며
   지수 폭발했다(verify385 에서 20초+ — 자가 영영 안 끝났다). 스캐너는 선형이고,
   `${…}` 보간 안은 코드로 계속 읽는다(페이지 코드를 템플릿으로 빚는 자도 잡는다).
   회귀는 `tools/probe755.js` — 이 함수의 몸통을 바꾸면 그 자를 같이 보라. */
/* bare:begin (probe755 가 이 표식 사이를 그대로 꺼내 잰다) */
const bare = t => {
  const KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete',
                      'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
  let i = 0, out = '', last = '', word = '';
  const put = s => { out += s; };
  const sig = ch => { last = ch; word = /[A-Za-z0-9_$]/.test(ch) ? word + ch : ''; };
  const regexAllowed = () => {
    if (KW.has(word)) return true;
    if (!last) return true;                       /* 파일 첫 유효 문자 */
    return !/[A-Za-z0-9_$)\]'"`]/.test(last);     /* 값 뒤의 / 는 나눗셈 */
  };
  const str = q => {                              /* '…' · "…" — 줄 안에서 닫힌다 */
    i++;
    while (i < t.length && t[i] !== q && t[i] !== '\n') { if (t[i] === '\\') i++; i++; }
    i++; put(q + q); last = q; word = '';
  };
  const re = () => {                              /* /…/flags — 줄을 못 넘는다 */
    i++;
    let cls = false;
    while (i < t.length && t[i] !== '\n') {
      const c = t[i];
      if (c === '\\') { i += 2; continue; }
      if (cls) { if (c === ']') cls = false; }
      else if (c === '[') cls = true;
      else if (c === '/') { i++; break; }
      i++;
    }
    while (i < t.length && /[dgimsuy]/.test(t[i])) i++;
    put('/RE/'); last = ')'; word = '';           /* 리터럴 = 값 — 뒤의 / 는 나눗셈 */
  };
  const code = inTmpl => {                        /* inTmpl: `${…}` 안 — 짝 안 맞은 } 에서 복귀 */
    let depth = 0;
    while (i < t.length) {
      const c = t[i], d = t[i + 1];
      if (c === '/' && d === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') {
        i += 2;
        while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) i++;
        i += 2; continue;
      }
      if (c === "'" || c === '"') { str(c); continue; }
      if (c === '`') { tmpl(); continue; }
      if (c === '/') {
        if (regexAllowed()) { re(); continue; }
        put('/'); sig('/'); i++; continue;
      }
      if (inTmpl) {
        if (c === '{') depth++;
        else if (c === '}') { if (!depth) { i++; return; } depth--; }
      }
      put(c);
      if (!/\s/.test(c)) sig(c);
      i++;
    }
  };
  const tmpl = () => {                            /* `…${코드}…` — 보간 안은 code() 로 */
    i++; put('`');
    while (i < t.length) {
      if (t[i] === '\\') { i += 2; continue; }
      if (t[i] === '`') { i++; break; }
      if (t[i] === '$' && t[i + 1] === '{') { i += 2; put('${'); code(true); put('}'); continue; }
      i++;
    }
    put('`'); last = '`'; word = '';
  };
  code(false);
  return out;
};
/* bare:end */

const V498 = path.join(TOOLS, 'verify498.js');
const P498 = path.join(TOOLS, 'probe498.js');
const v498 = fs.readFileSync(V498, 'utf8');
const p498 = fs.readFileSync(P498, 'utf8');

(async () => {

/* ── [A] 정적 — 축이 갈렸는가 ─────────────────────────────────────── */
console.log('[A] 정적 — 폐지된 축을 안 읽고 살아 있는 축을 읽는다');
yes('[A1] 제품에 `OFF_MAX_H` 선언이 없다 (199 21회차가 선언째 걷어냈다)',
    !/const\s+OFF_MAX_H\s*=/.test(SRC));
yes('[A2] 제품에 `OFF_DAY_CAP_MIN`·`OFF_DIA_PM` 선언이 있다',
    /const\s+OFF_DAY_CAP_MIN\s*=\s*\d+/.test(SRC) && /const\s+OFF_DIA_PM\s*=\s*\d+/.test(SRC));
yes('[A3] verify498 이 `OFF_MAX_H` 를 주석 밖에서 더는 안 읽는다', !/OFF_MAX_H/.test(bare(v498)));
yes('[A4] probe498 이 `OFF_MAX_H` 를 주석 밖에서 더는 안 읽는다', !/OFF_MAX_H/.test(bare(p498)));
yes('[A5] verify498 이 살아 있는 두 축을 **둘 다** 읽는다',
    /OFF_DAY_CAP_MIN/.test(nude(v498)) && /OFF_DIA_PM/.test(nude(v498)));
yes('[A6] probe498 이 살아 있는 두 축을 **둘 다** 읽는다',
    /OFF_DAY_CAP_MIN/.test(nude(p498)) && /OFF_DIA_PM/.test(nude(p498)));
/* ⚠ 이름만 갈고 «분당 3» 을 남기는 것이 이 작업의 함정이었다 — 그 사본을 직접 금지한다 */
yes('[A7] «분당 3» 사본이 두 자 어디에도 안 남았다 (199 2회차 이전의 숫자)',
    !/60\s*\*\s*3\b/.test(nude(v498)) && !/offPerMin:\s*3\b/.test(nude(p498)));
yes('[A8] 두 자에 «절이 돌았는가» 위생 항이 있다 (278·319 처방)',
    /\[6-0\]/.test(v498) && /\[4-0\]/.test(p498));

/* ── [B] 값 — 게이트 식 ↔ 제품 실지급 경로 ───────────────────────── */
console.log('\n[B] 값 — 게이트가 쓰는 식이 제품 실지급과 같은 값인가');
const browser = await launch(chromium);
const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + SRCF);
await page.waitForFunction(() => typeof S !== 'undefined' && typeof OFF_DIA_PM !== 'undefined');
await page.waitForTimeout(500);
await page.evaluate(() => { window.step = () => {}; });
let b = null;
try {
  b = await page.evaluate(() => {
    const cap = OFF_DAY_CAP_MIN, pm = OFF_DIA_PM;
    /* 하루 예산을 통째로 쓰는 ×1 수령 — 제품의 실제 경로로 굴린다(손으로 안 더한다).
       `offlineReward` 가 sec 를 남은 예산으로 자르고 `floor(sec * OFF_DIA_PM / 60 * om)` 을 담는다. */
    Object.assign(S, DEF()); S.daily.offMin = 0;
    offlineReward(Date.now() - 1000 * 60 * 60 * 48);      /* 48h — 예산(24h)보다 길게 */
    const real = (typeof offPend !== 'undefined' && offPend) ? offPend.dia : null;
    const sec = (typeof offPend !== 'undefined' && offPend) ? offPend.sec : null;
    return { cap, pm, gate: cap * pm, real, sec, mul: offMul() };
  });
} catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); }
yes('[B0] §B 가 실제로 돌았다 (evaluate 예외 0건)', b !== null);
if (b) {
  eq('[B1] 제품이 자르는 축은 하루 예산 분(OFF_DAY_CAP_MIN)이다 — 잘린 초', b.sec, b.cap * 60);
  eq('[B2] 이용권 배율은 기본 ×1 이다 (표본에 배율이 안 섞였다)', b.mul, 1);
  eq('[B3] **게이트 식 = 제품 실지급** (OFF_DAY_CAP_MIN × OFF_DIA_PM ↔ offPend.dia)', b.gate, b.real);
  /* 음성항 — 옛 식은 실지급과 다르다. 이 항이 빨개지면 «이름만 갈아도 같은 값» 이라는 뜻이라
     [B3] 이 아무것도 안 지키는 것이 된다(348 [전제] 규약 — 자가 무엇을 잴 수 있는지부터 잰다). */
  yes('[B4] 옛 사본식 `6 × 60 × 3` 은 실지급과 **다르다** (이름만 갈면 안 되는 이유)',
      6 * 60 * 3 !== b.real, '옛 1,080 vs 실지급 ' + b.real);
  eq('[B5] 콘솔 에러 0건', errs.length, 0);
}
await browser.close();

/* ── [C] 두 자가 그 절을 실제로 찍는다 ───────────────────────────── */
console.log('\n[C] 사라졌던 절이 stdout 에 돌아왔는가');
const rv = run(V498), rp = run(P498);
eq('[C1] verify498 종료 코드', rv.code, 0);
yes('[C2] verify498 PASS', /VERIFY498 \d+\/\d+ PASS/.test(rv.out), (rv.out.match(/VERIFY498 \S+ \S+/) || [''])[0]);
yes('[C3] verify498 §6 위생 항이 초록', /ok\s+\[6-0\]/.test(rv.out));
eq('[C4] verify498 §6 다섯 줄이 전부 찍힌다', ['a', 'b', 'c', 'd', 'e'].filter(k => rv.out.indexOf('[6-' + k + ']') >= 0).length, 5);
yes('[C5] verify498 에 evaluate 예외 줄이 없다', !/⚠ evaluate 예외/.test(rv.out));
eq('[C6] probe498 종료 코드', rp.code, 0);
yes('[C7] probe498 PASS', /PROBE498 \d+\/\d+ PASS/.test(rp.out), (rp.out.match(/PROBE498 \S+ \S+/) || [''])[0]);
yes('[C8] probe498 §4 위생 항이 초록', /✅ \[4-0\]/.test(rp.out));
yes('[C9] probe498 §4 두 항과 오프라인 줄이 찍힌다',
    /\[4-a\]/.test(rp.out) && /\[4-b\]/.test(rp.out) && /오프라인/.test(rp.out));
yes('[C10] probe498 에 evaluate 예외 줄이 없다', !/⚠ evaluate 예외/.test(rp.out));

/* ── [D] 되돌림 시험 — 폐지된 상수를 도로 심으면 빨개진다 ─────────── */
console.log('\n[D] 되돌림 — 죽은 상수를 도로 심은 사본은 «초록» 이 아니라 «빨강» 으로 끝난다');
const vBad = v498.replace(/const offCap = OFF_DAY_CAP_MIN, offPm = OFF_DIA_PM;/,
                          'const offCap = OFF_MAX_H, offPm = 3;');
yes('[D0] verify498 되돌림 사본을 실제로 심었다', vBad !== v498 && /OFF_MAX_H/.test(bare(vBad)));
const dv = run(tmp('v498bad', vBad));
yes('[D1] 그 사본에서 §6 이 죽는다 (evaluate 예외)', /⚠ evaluate 예외.*OFF_MAX_H/.test(dv.out));
yes('[D2] 그리고 **한 항의 빨강**으로 적힌다 (`NO [6-0]`)', /NO\s+\[6-0\]/.test(dv.out));
yes('[D3] 자가 FAIL 로 끝난다 (수리 전에는 여기서 46/46 PASS 였다)', /VERIFY498 \d+\/\d+ FAIL/.test(dv.out),
    (dv.out.match(/VERIFY498 \S+ \S+/) || [''])[0]);
eq('[D4] 종료 코드 1', dv.code, 1);
const pBad = p498.replace(/offCapMin: OFF_DAY_CAP_MIN, offPerMin: OFF_DIA_PM,/,
                          'offCapMin: OFF_MAX_H, offPerMin: 3,');
yes('[D5] probe498 되돌림 사본을 실제로 심었다', pBad !== p498 && /OFF_MAX_H/.test(bare(pBad)));
const dp = run(tmp('p498bad', pBad));
yes('[D6] 그 사본의 §4 가 «한 항의 빨강» 으로 적히고 자는 FAIL 로 끝난다',
    /❌ \[4-0\]/.test(dp.out) && /PROBE498 \d+\/\d+ FAIL/.test(dp.out),
    (dp.out.match(/PROBE498 \S+ \S+/) || [''])[0]);
eq('[D7] 종료 코드 1', dp.code, 1);

/* ── [E] 전수 스윕 ───────────────────────────────────────────────── */
console.log('\n[E] 스윕 — 폐지된 `OFF_MAX_H` 를 주석 밖에서 읽는 도구가 하나도 없다');
function sweep(extra) {
  const hit = [];
  const files = fs.readdirSync(TOOLS).filter(f => f.endsWith('.js') && !f.startsWith('.'))
    .map(f => ({ f, t: fs.readFileSync(path.join(TOOLS, f), 'utf8') }))
    .concat(extra || []);
  for (const { f, t } of files) {
    /* 자기 자신도 스코프 안이다(작업 755) — 옛 «자신만 제외» 는 옛 bare() 가
       «따옴표를 품은 정규식» 에서 무너져 1회차에 자신을 false 로 잡았기 때문인데,
       스캐너는 그 자리를 바로 읽는다(같은 꼴의 verify385 도 이제 스코프 안이다).
       스윕이 «항상 0» 인 헛자가 아님은 [E2]·[E3] 유령 표본이 못박는다. */
    if (/OFF_MAX_H/.test(bare(t))) hit.push(f);
  }
  return hit;
}
const sw = sweep();
eq('[E1] 미해결 0건', sw.length, 0, sw.join(' '));
if (sw.length) yes('[E1-a] 걸린 자들: ' + sw.join(' '), false);
const ghost = { f: 'v712-ghost(메모리 표본).js', t: 'const x = OFF' + '_MAX_H * 60 * 3;\n' };
yes('[E2] 되돌림 — 유령 사본을 끼우면 스윕이 실제로 잡는다', sweep([ghost]).indexOf(ghost.f) >= 0);
eq('[E3] 그리고 잡히는 것은 그 사본 하나뿐이다', sweep([ghost]).filter(f => f !== ghost.f).length, 0);

/* ── 집계 ────────────────────────────────────────────────────────── */
for (const p of tmps) { try { fs.existsSync(p) && fs.unlinkSync(p); } catch (e) {} }
const fail = R.filter(x => !x.pass);
console.log('');
R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + (x.pass ? '' : ' (want ' + x.want + ')')));
console.log('\nVERIFY712 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
process.exit(fail.length ? 1 : 0);

})().catch(e => { console.error('VERIFY712 즉사: ' + e.message); process.exit(1); });
