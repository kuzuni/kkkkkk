#!/usr/bin/env node
/* 901 검증 — `scan833.py` 의 «우리» 절이 실제로 도는가 (자 부패 수리)
 *
 *   node tools/verify901.js
 *
 * 등재문의 결손: `python3 tools/scan833.py --cap … --geo …` 가 **ref 절은 정상으로 찍고**
 * 우리 절 첫 카드에서 `KeyError: 'cls'` 로 죽는다 — `cap151.js` 의 카드 덤프에 그 키가 없고
 * 저장소 안에 그 키를 만드는 자도 없었다. ⇒ 이 경로는 지금 트리에서 **한 번도 안 돌았다**.
 *
 * ⚑ 재현이 등재문에 **둘째 결손**을 하나 더 붙였다 — `cls` 를 채우면 바로 다음 줄
 *   `c['card']['x']`(크롭-로컬 카드 상자)에서 또 죽는다. 첫 키가 둘째를 가리고 있었다.
 *   형제 자 `scan833b.py` 는 그 자리를 상수 `CROP_DX,CROP_DY = 40,80` 으로 때워
 *   «크롭을 만드는 줄» 과 «크롭을 읽는 줄» 이 서로를 모른 채 굳어 있었다.
 *
 *   [A] 도구 — `cap151.js` 가 두 키를 싣고, 크롭 원점을 **한 곳에서** 계산한다.
 *   [B] 실전 — 진짜로 찍어 본다: 덤프에 `cls`·`card` 가 있고, 형이 갈리며(`ban1` 정확히 1장),
 *       크롭-로컬 상자가 **실제 PNG 크기**와 맞는다(상수를 베낀 게 아니라 실측과 맞물린다).
 *   [C] 자 — `scan833.py` 가 코드 0 으로 끝나고, 우리 절이 카드 3장을 **두 형으로** 찍고
 *       요약표가 형별 행을 낸다(= 등재문이 «한 번도 안 돌았다» 고 한 그 절이 돈다).
 *   [R] 되돌림 시험 — 키를 도로 뺀 기하는 **다시 빨개진다**. 단 옛날처럼 벌거벗은
 *       `KeyError` 역추적이 아니라 «무엇을 다시 뽑아라» 를 말하고 죽어야 한다
 *       (= 무르게 푼 수리가 아니고, 같은 사고가 또 나도 자가 스스로를 설명한다).
 *
 * ⚠ `verify833` 이 쓰는 ref 값은 885 5회차가 비침식 마스크로 갈아 끼운 것이다 —
 *   이 자는 ref 절 수치를 **한 줄도 안 건드린다**(등재문 ⚠).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CAP = path.join(ROOT, 'tools', 'cap151.js');
const SCAN = path.join(ROOT, 'tools', 'scan833.py');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const { HINT_RE } = require('./pydep937');   // 937 — «없음» 은 빨강이 아니라 «환경에 없음»(코드 2)
const run = (a, opts) => {
  const r = spawnSync(a[0], a.slice(1), { cwd: ROOT, encoding: 'utf8', timeout: 300000, ...opts });
  const out = (r.stdout || '') + (r.stderr || '');
  /* 파이썬 자가 «<모듈> 없음 — pip3 install …»(코드 2)로 답했으면 이 자의 판정이 아니다 —
     빨강으로 세면 «환경» 을 «제품 결함» 으로 적는 것이 된다(937 · 913 선례). */
  if (r.status === 2 && HINT_RE.test(out)) {
    console.error((out.split('\n').map((l) => l.trim()).find((l) => HINT_RE.test(l)) || '').trim());
    process.exit(2);
  }
  return { code: r.status, out };
};

/* ─────────────────────────── [A] 도구 ─────────────────────────── */
const CSRC = fs.readFileSync(CAP, 'utf8');
const SSRC = fs.readFileSync(SCAN, 'utf8');

ok(run(['node', '--check', CAP]).code === 0, 'A1 cap151.js 문법 성함');
ok(run(['python3', '-c', `import ast,sys;ast.parse(open(${JSON.stringify(SCAN)},encoding='utf-8').read())`]).code === 0,
   'A2 scan833.py 문법 성함');
ok(/o\.cls\s*=/.test(CSRC), 'A3 cap151.js 가 카드 덤프에 `cls` 를 싣는다');
ok(/c0\.card\s*=/.test(CSRC), 'A4 cap151.js 가 크롭-로컬 카드 상자 `card` 를 싣는다');
/* 원점을 두 번 적으면 클립과 덤프가 조용히 갈린다 — 한 곳에서 계산해 둘 다 그것을 쓴다. */
ok(/const ox = Math\.max\(0, c\.x - 40\), oy = Math\.max\(0, c\.y - 80\);/.test(CSRC)
   && (CSRC.match(/Math\.max\(0, c\.x - 40\)/g) || []).length === 1,
   'A5 크롭 원점이 **한 곳에서만** 계산된다(클립과 덤프가 같은 수를 쓴다)');
ok(/cls[^\n]*card|card[^\n]*cls/.test(SSRC.split('\n').filter((l) => /miss/.test(l)).join('\n')),
   'A6 scan833.py 가 두 키의 부재를 **먼저** 확인한다');
ok(/sys\.exit\(/.test(SSRC) && /cap151\.js/.test(SSRC),
   'A7 없을 때 «무엇을 다시 뽑아라» 를 말하고 죽는다(벌거벗은 KeyError 금지)');

/* ─────────────────────── [B] 실전 — 진짜로 찍는다 ─────────────────────── */
const DIR = path.join(ROOT, 'scratch', `.v901-${process.pid}`);
fs.mkdirSync(DIR, { recursive: true });
const REL = path.relative(ROOT, path.join(DIR, 'r.png'));
const cap = run(['node', CAP, REL, '--geo', '--crop']);
ok(cap.code === 0, 'B1 cap151.js --geo --crop 이 코드 0 으로 끝난다');

let geo = null;
try {
  const s = cap.out;
  geo = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
} catch (e) { /* geo 는 null 로 남는다 */ }
ok(!!geo && Array.isArray(geo.cards) && geo.cards.length >= 3,
   'B2 기하 덤프가 카드 3장 이상을 낸다', geo ? `cards=${geo.cards.length}` : '파싱 실패');

const cards = (geo && geo.cards) || [];
ok(cards.length > 0 && cards.every((c) => Array.isArray(c.cls) && c.cls.includes('pvc')),
   'B3 카드마다 `cls` 가 실제 클래스 목록이다');
ok(cards.length > 0 && cards.every((c) => c.card && ['x', 'y', 'w', 'h'].every((k) => typeof c.card[k] === 'number')),
   'B4 카드마다 크롭-로컬 상자 `card` 가 있다');
const ban = cards.filter((c) => c.cls && c.cls.includes('ban1'));
ok(ban.length === 1, 'B5 `ban1` 이 정확히 1장 — 형이 실제로 갈린다', `배너형 ${ban.length}장`);
/* 등재문 처방 ⓑ(«id 문자열 관례로 가른다»)를 안 고른 이유가 여기 있다:
   배너형 카드의 id 는 `ban1` 이 아니라 `noads` 라 id 로는 형을 못 읽는다. */
ok(ban.length === 1 && !/ban/.test(ban[0].id),
   'B6 형은 id 문자열로는 못 읽는다(배너형 id 가 `ban*` 이 아니다)', ban.length ? `id=${ban[0].id}` : '');

/* PNG 폭·높이는 IHDR(16..24바이트)에 있다 — 덤프의 상자가 «실제로 찍힌 그림» 과 맞물리는지 본다. */
const png = (f) => {
  const b = fs.readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
let boxOk = cards.length > 0, boxDet = '';
cards.forEach((c, i) => {
  const f = path.join(DIR, `r-c${i + 1}.png`);
  if (!fs.existsSync(f)) { boxOk = false; boxDet += `c${i + 1} 없음 `; return; }
  const d = png(f);
  const okw = Math.abs(c.crop.w - d.w) <= 1 && Math.abs(c.crop.h - d.h) <= 1;
  /* 카드가 크롭 안에 온전히 든다 — 상자가 그림 밖을 가리키면 자가 엉뚱한 화소를 읽는다. */
  const inside = c.card.x >= 0 && c.card.y >= 0
    && c.card.x + c.card.w <= d.w + 1 && c.card.y + c.card.h <= d.h + 1;
  if (!okw || !inside) { boxOk = false; boxDet += `c${i + 1}(${d.w}×${d.h} vs crop ${c.crop.w}×${c.crop.h}) `; }
});
ok(boxOk, 'B7 크롭-로컬 상자가 실제 크롭 PNG 와 맞물린다(상자가 그림 안에 온전히 든다)', boxDet);

/* ───────────────────────── [C] 자가 실제로 돈다 ───────────────────────── */
const GEO = path.join(DIR, 'r.geo.json');
fs.writeFileSync(GEO, JSON.stringify(geo, null, 1));
const sc = run(['python3', SCAN, '--cap', path.relative(ROOT, path.join(DIR, 'r')), '--geo', GEO]);
ok(sc.code === 0, 'C1 scan833.py 가 코드 0 으로 끝난다(등재문의 즉사가 사라졌다)',
   sc.code === 0 ? '' : sc.out.trim().split('\n').slice(-2).join(' / '));
ok(/== 우리/.test(sc.out), 'C2 «우리» 절이 찍힌다');
ok(!/KeyError/.test(sc.out), 'C3 KeyError 가 안 난다');
const our = sc.out.slice(sc.out.indexOf('== 우리'));
ok((our.match(/^\s*카드\d+ \[/gm) || []).length >= 3, 'C4 우리 절이 카드 3장을 전부 읽는다',
   `${(our.match(/^\s*카드\d+ \[/gm) || []).length}장`);
ok(/배너형\(파랑\)/.test(our) && /불릿형\(초록\)/.test(our),
   'C5 우리 절이 **두 형**을 다 찍는다(형 가르기가 실제로 쓰인다)');
ok(/== 요약/.test(sc.out) && (sc.out.slice(sc.out.indexOf('== 요약')).match(/^\| .*\| \*\*/gm) || []).length >= 6,
   'C6 요약표가 ref↔우리 Δ 행을 낸다',
   `${(sc.out.slice(sc.out.indexOf('== 요약')).match(/^\| .*\| \*\*/gm) || []).length}행`);
/* ref 절은 한 줄도 안 건드렸다 — 885 5회차가 갈아 끼운 값이 그대로여야 한다. */
ok(/ref 배너형\(파랑\): 열/.test(sc.out) && /ref 불릿형\(초록\): 열/.test(sc.out),
   'C7 ref 절이 그대로 돈다(수리가 ref 자를 안 건드렸다)');

/* ───────── [D] 기하를 만드는 자가 둘이다 — 두 모양 다 같은 형으로 읽힌다 ─────────
   `probe667b.js` 는 같은 `cls` 를 **문자열**(`className`)로 싣는다. 옛 `'ban1' in cls` 는
   문자열에서 **부분일치**라 이웃 클래스(`ban10`)가 생기면 조용히 참이 된다 — 낱말로 가른다. */
const asStr = JSON.parse(JSON.stringify(geo));
asStr.cards.forEach((c) => { c.cls = c.cls.join(' '); });
const F2 = path.join(DIR, 'r.geo.str.json');
fs.writeFileSync(F2, JSON.stringify(asStr, null, 1));
const sc2 = run(['python3', SCAN, '--cap', path.relative(ROOT, path.join(DIR, 'r')), '--geo', F2]);
ok(sc2.code === 0, 'D1 `cls` 가 문자열인 기하(probe667b 모양)도 코드 0 으로 돈다');
const our2 = sc2.out.slice(sc2.out.indexOf('== 우리'));
const kinds = (s) => (s.match(/카드\d+ \[[^\]]*· ([^\]]+)\]/g) || []).join('|');
ok(kinds(our2) === kinds(our) && kinds(our) !== '',
   'D2 두 모양이 카드를 **같은 형**으로 가른다', kinds(our));
ok(!/Traceback|KeyError/.test(sc2.out), 'D3 문자열 모양에서도 안 죽는다');
const near = JSON.parse(JSON.stringify(asStr));
near.cards.forEach((c) => { c.cls = c.cls.replace(/\bban1\b/, 'ban10'); });
const F3 = path.join(DIR, 'r.geo.near.json');
fs.writeFileSync(F3, JSON.stringify(near, null, 1));
const sc3 = run(['python3', SCAN, '--cap', path.relative(ROOT, path.join(DIR, 'r')), '--geo', F3]);
ok(!/배너형\(파랑\)/.test(sc3.out.slice(sc3.out.indexOf('== 우리'))),
   'D4 이웃 클래스 `ban10` 을 배너형으로 오독하지 않는다(부분일치 함정)');

/* ─────────────────── [R] 되돌림 시험 — 키를 도로 빼면 빨개진다 ─────────────────── */
const revert = (drop) => {
  const g = JSON.parse(JSON.stringify(geo));
  g.cards.forEach((c) => delete c[drop]);
  const f = path.join(DIR, `r.geo.no-${drop}.json`);
  fs.writeFileSync(f, JSON.stringify(g, null, 1));
  return run(['python3', SCAN, '--cap', path.relative(ROOT, path.join(DIR, 'r')), '--geo', f]);
};
for (const k of ['cls', 'card']) {
  const r = revert(k);
  ok(r.code !== 0, `R1-${k} \`${k}\` 를 뺀 기하는 다시 빨개진다`, `code=${r.code}`);
  ok(/cap151\.js/.test(r.out) && new RegExp(k).test(r.out),
     `R2-${k} 빨강이 «${k} 가 없다 · cap151.js 로 다시 뽑아라» 를 말한다`);
  ok(!/Traceback/.test(r.out), `R3-${k} 벌거벗은 역추적으로 죽지 않는다`);
}

try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (_) {}

console.log(`\n${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
