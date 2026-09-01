#!/usr/bin/env node
/* 768 검증 — 「714 가 폐지한 공용 스칼라 `S.sumLv`·`S.sumExp` 를 아직 읽는 자」가 다시 생기면 빨개진다
 *
 *   node tools/verify768.js
 *
 * 등재(2026-09-01, sess-1848-1709)는 «20종» 이라고 적었고, 그 중 19종은 `c7998a0`
 * (wip(714) 2회차 — 소환 레벨 축 게이트 19종 이관)이 등재 39분 뒤에 갈아 끼웠다.
 * 남은 한 자리가 `tools/probe528.js` 의 **저장·복원 짝**이었다 — 쓰기만 배너 칸으로
 * 옮기고(`S.sum.weapon.lv = v`) 저장·복원은 스칼라(`const o = S.sumLv … S.sumLv = o`)에
 * 두어 **원복이 조용히 사라지는** 모양이었다.
 *
 * ⚑ 이 자가 잡는 것은 «지금 빨간 게이트» 가 아니라 **재발**이다(731 계열 — «없는 전역을 읽으면 빨강»).
 *   폐지된 전역은 읽으면 `undefined`(NaN 이 아니다) · 쓰면 **아무 데도 안 닿는 새 전역**이라
 *   자가 즉사하거나(`undefined.toLocaleString()`) 조용히 Lv1 을 재는 두 얼굴로만 드러난다.
 *
 * 절:
 *   [A] 소스 스윕 — `tools/**.js` 전수. 주석을 걷어낸 뒤 남은 `S.sumLv`/`S.sumExp` 는
 *       **같은 줄에 `typeof` 가드**가 있어야 한다(수리 전 트리를 함께 재는 자의 갈래 표식).
 *   [B] 이관이 뜻을 지켰는가 — 등재문이 지목한 자들이 배너 접근자(`S.sum[b]` · `sumLv(b)`)를 쓴다.
 *   [C] 런타임 — 제품에 스칼라 둘이 없고 배너 접근자가 있다. 그리고 **실패 기계 자체**를 못박는다:
 *       스칼라에 쓰면 배너 칸은 한 칸도 안 움직인다(= 조용한 빨강의 기계).
 *   [D] probe528 자리 — 저장·복원 짝이 실제로 원복한다(제품에 물어서).
 *   [R] 되돌림 시험 — 스트레이 한 줄을 되살린 합성 소스에 같은 스캐너를 대면 **빨강**,
 *       typeof 가드가 있는 줄과 주석 줄은 초록(= [A] 가 실제로 무언가를 재고 있다).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* ── 스캐너 ────────────────────────────────────────────────────────────────────────
   주석은 «자리는 남기고 내용만» 지운다(줄 번호가 어긋나면 보고가 쓸모없다). */
const strip = src => src
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + m.slice(p.length).replace(/[^\n]/g, ' '));

const DEAD = /S\.sum(?:Lv|Exp)\b/;
/* 한 줄에 `typeof S.sumLv` 가드가 있으면 «수리 전 트리 갈래» 다 — 허용한다.
   (예: `if (typeof S.sumLv === 'number') { S.sumLv = 1; }` — 496 트리에서만 도는 줄) */
const GUARD = /typeof\s+S\.sum(?:Lv|Exp)\b/;

const scan = src => {
  const out = [];
  strip(src).split('\n').forEach((ln, i) => {
    if (DEAD.test(ln) && !GUARD.test(ln)) out.push({ line: i + 1, text: ln.trim().slice(0, 110) });
  });
  return out;
};

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : (/\.js$/.test(e.name) ? [p] : []);
});

/* ─────────────────────────── [A] 소스 스윕 ─────────────────────────── */
console.log('[A] 소스 스윕 — tools/**.js 전수');
/* 스캔에서 빼는 파일은 **이 자 자신 하나뿐**이다 — [C]·[D]·[R] 이 실패 기계를 일부러
   그 모양으로 적어 두기 때문이다(그 자리를 지키는 것은 [R] 이다). 다른 예외는 없다. */
const EXCL = ['verify768.js'];
const FILES = walk(TOOLS).filter(f => !EXCL.includes(path.basename(f)));
ok(FILES.length >= 100, 'A1 전제 — 스코프가 비어 있지 않다(자가 «아무것도 안 보고» 초록이 되는 길을 막는다)',
   FILES.length + ' 파일 (예외 ' + EXCL.length + ': ' + EXCL.join(',') + ')');

const hits = FILES.flatMap(f => scan(fs.readFileSync(f, 'utf8'))
  .map(h => path.relative(ROOT, f) + ':' + h.line + '  ' + h.text));
ok(hits.length === 0, 'A2 ★ 폐지된 공용 스칼라를 «값으로» 읽거나 쓰는 자리 0건',
   hits.length ? '\n    ' + hits.join('\n    ') : '0건');

/* 등재문이 지목한 20종 — 스코프 구멍을 막으려고 이름으로도 못박는다(지금 트리에 있는 것만 잰다) */
const NAMED = ['verify195', 'verify196', 'verify496', 'verify528', 'verify655', 'verify669',
               'verify675', 'verify714', 'func196', 'bot199', 'probe496', 'probe522',
               'probe528', 'probe568', 'probe655', 'probe668', 'probe675', 'probe714', 'fnchk115'];
const named = NAMED.map(n => path.join(TOOLS, n + '.js')).filter(fs.existsSync);
const namedBad = named.filter(f => scan(fs.readFileSync(f, 'utf8')).length);
ok(named.length >= 15 && namedBad.length === 0,
   'A3 등재문이 이름으로 적어 둔 자들이 전부 초록(있는 것 ' + named.length + '/' + NAMED.length + ')',
   namedBad.length ? namedBad.map(f => path.basename(f)).join(', ') : '위반 0');

/* 마지막 한 자리 — 768 이 고친 그 짝이 실제로 배너 칸으로 저장·복원한다 */
const P528 = fs.readFileSync(path.join(TOOLS, 'probe528.js'), 'utf8');
const restores = (strip(P528).match(/S\.sum\.weapon\.lv\s*=\s*o\b/g) || []).length;
ok(restores === 3, 'A4 probe528 의 저장·복원 짝 3곳(probsAt · sim · live)이 배너 칸으로 원복한다',
   restores + '/3');

/* ─────────────────────────── [B] 이관이 뜻을 지켰는가 ─────────────────────────── */
console.log('[B] 이관 — 지목당한 자들이 배너 접근자를 쓴다');
const usesBanner = f => {
  const s = strip(fs.readFileSync(path.join(TOOLS, f + '.js'), 'utf8'));
  return /S\.sum\[/.test(s) || /S\.sum\.[a-z]/.test(s) || /\bsumLv\s*\(/.test(s) || /\bsumOf\s*\(/.test(s);
};
ok(usesBanner('verify195'), 'B1 `verify195` 가 배너 칸을 읽는다(등재문의 «즉사» 자리)');
ok(usesBanner('verify196'), 'B2 `verify196` 이 배너 접근자를 읽는다(등재문의 «22/39» 자리)');
ok(usesBanner('probe528'), 'B3 `probe528` 이 배너 칸을 읽는다(768 이 고친 마지막 한 자리)');

/* ─────────────────────────── [R] 되돌림 시험 ─────────────────────────── */
console.log('[R] 되돌림 시험 — 스캐너가 실제로 무언가를 잰다');
ok(scan('const o = S.sumLv; S.sum.weapon.lv = v; S.sumLv = o;\n').length === 1,
   'R1 스트레이 한 줄(768 이 고친 그 모양)을 되살리면 **빨강**');
ok(scan("if (typeof S.sumLv === 'number') { S.sumLv = 1; S.sumExp = 0; }\n").length === 0,
   'R2 typeof 가드가 있는 줄은 초록(수리 전 트리를 함께 재는 자를 헛빨강으로 안 만든다)');
ok(scan('/* 714 — 소환 레벨은 배너별이다(`S.sumLv` 는 없다) */\n').length === 0,
   'R3 주석 안의 이름은 초록(교훈을 적어 둔 줄까지 빨개지면 자가 곧 꺼진다)');
ok(scan('let t = S.sumExp;\nfor (let n = 1; n < S.sumLv; n++) t += need(n);\n').length === 2,
   'R4 등재문이 적은 «즉사» 모양(`undefined.toLocaleString()` 로 가는 두 줄)도 빨강');
ok(EXCL.length === 1 && EXCL[0] === 'verify768.js' && scan(fs.readFileSync(__filename, 'utf8')).length > 0,
   'R5 예외는 이 자 하나뿐이고, 그 예외가 실제로 «실패 기계를 적어 둔 파일» 이다(빈 예외로 스코프를 넓히지 않았다)',
   scan(fs.readFileSync(__filename, 'utf8')).length + '줄');

/* ─────────────────────────── [C]·[D] 런타임 ─────────────────────────── */
(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof BKEYS !== 'undefined');
  await page.waitForTimeout(400);

  console.log('[C] 런타임 — 제품에 스칼라 둘이 없고, 스칼라 쓰기는 아무 데도 안 닿는다');
  const C = await page.evaluate(() => {
    const before = BKEYS.map(k => S.sum[k].lv);
    /* 실패 기계 재현 — 폐지된 이름에 쓰면 «새 전역» 만 생기고 배너 칸은 그대로다 */
    const read = typeof S.sumLv;
    S.sumLv = 7;   /* ⚠ 만렙 미만의 수로 쓴다 — `verify528` [A2] 가 «만렙 이상을 손으로 적은 자리» 를 센다 */
    const after = BKEYS.map(k => S.sum[k].lv);
    delete S.sumLv;
    return { read, before, after, cells: BKEYS.length,
             acc: [typeof sumOf, typeof sumLv, typeof sumExp],
             saved: JSON.stringify(S) };
  });
  ok(C.read === 'undefined', 'C1 ★ 제품에 `S.sumLv` 가 없다(714 가 배너 칸으로 옮긴 뒤의 정답)', C.read);
  ok(C.cells === 5 && C.acc.every(t => t === 'function'),
     'C2 배너 칸 5벌 + 접근자 3종(`sumOf`·`sumLv`·`sumExp`)이 있다',
     C.cells + '칸 · ' + C.acc.join('/'));
  ok(JSON.stringify(C.before) === JSON.stringify(C.after),
     'C3 ★ 실패 기계 — 스칼라에 7 을 써도 배너 다섯 칸은 **한 칸도 안 움직인다**(조용한 빨강의 정체)',
     C.before.join(',') + ' → ' + C.after.join(','));
  ok(!/"sumLv":/.test(C.saved) && !/"sumExp":/.test(C.saved),
     'C4 세이브에도 스칼라 둘이 안 담긴다(verify714 [B1] 과 같은 축)');

  console.log('[D] probe528 자리 — 저장·복원이 실제로 원복한다');
  const D = await page.evaluate(() => {
    const o0 = S.sum.weapon.lv;
    /* 768 수리분과 같은 모양 */
    const probsAt = v => { const o = S.sum.weapon.lv; S.sum.weapon.lv = v;
                           const p = gradeProbs('weapon'); S.sum.weapon.lv = o; return p; };
    probsAt(SUM_MAXLV); probsAt(100);
    const after = S.sum.weapon.lv;
    /* 수리 전 모양(스칼라 저장·복원)은 원복이 사라진다 */
    const bad = v => { const o = S.sumLv; S.sum.weapon.lv = v; S.sumLv = o; };
    bad(SUM_MAXLV);
    const afterBad = S.sum.weapon.lv;
    delete S.sumLv;
    S.sum.weapon.lv = o0;
    return { o0, after, afterBad, max: SUM_MAXLV };
  });
  ok(D.after === D.o0, 'D1 ★ 새 모양은 두 번 재고도 원값으로 돌아온다', D.o0 + ' → ' + D.after);
  ok(D.afterBad === D.max && D.afterBad !== D.o0,
     'D2 ☆ 수리 전 모양은 «복원» 이 아무 데도 안 닿아 배너 칸이 바뀐 채 남는다(= 768 이 고친 결손)',
     '원값 ' + D.o0 + ' · 수리 전 모양 뒤 ' + D.afterBad);

  ok(errs.length === 0, 'E1 콘솔 에러 0건', errs.length ? errs.slice(0, 3).join(' | ') : '없음');

  await browser.close();
  console.log('\nVERIFY768 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
