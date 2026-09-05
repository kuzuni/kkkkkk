#!/usr/bin/env node
/* 작업 949 — «자를 부르는 이름이 어긋나면 그 자는 사라진다» 를 지키는 게이트.
 *
 *   node tools/verify949.js
 *
 * ── 무엇을 지키는가 ─────────────────────────────────────────────────────────
 * 등재는 «`scan813e` 가 `S.find_base` 를 부르는데 905 가 개명했다» 한 줄이었고, 재현
 * (`node tools/probe949.js`)이 그 값을 찍었다 — 죽는 것 자체보다 **결과 줄이 한 줄도 안 남는 것**이
 * 병이다. 스윕은 그 자를 «빨강» 이 아니라 **«없는 자»** 로 지나간다(913 pngjs · 937 numpy 와 같은 얼굴).
 * 그래서 이 자는 «이름 한 줄» 이 아니라 **그 얼굴이 다시 생기지 않는가** 를 본다:
 *
 *   [A] 이름 사슬 — 저장소의 어떤 자도 `scan887` 의 **없는 이름**을 부르지 않는다(전수 인구조사).
 *       ⚑ 이 항이 이 게이트의 본체다. `scan813e` 한 줄만 박아 두면 다음 개명 때 **다른 자**가
 *         같은 얼굴로 사라진다(905 가 형제 둘은 옮기고 이 한 자를 두고 간 것이 바로 그 사고다).
 *   [B] 그 자가 실제로 답한다 — 레퍼런스에서 코드 0 · U1·U2·U3 **세 줄**이 다 나온다.
 *   [C] 값의 검산 — ref 에서 U1 = 0.900(887 옛 과녁) · U3 = 0.750(905 확정값).
 *       두 수가 같이 나오는 것이 «기각된 자 옆에 확정된 자를 놓았다»(333 처방)의 증거다.
 *   [D] 두 그림을 실제로 잰다 — 우리 캡처에서 **U1 의 부호가 뒤집힌다**(ref U3−U1 = −2행 ↔ 우리 +2행).
 *       905 ②를 이 넷째 자가 독립으로 재확인하는 자리다. U3 은 두 그림에서 같은 물체를 가리킨다.
 *   [E] 939 사전 — 못 재면 스택 트레이스가 아니라 «무엇이 안 됐는지 — 할 일» 한 줄 + **코드 3**
 *       (`scan813e` 없는 그림 · `scan813d` 인자 없음 = 등재문의 곁다리).
 *   [R] 되돌림 시험 — 수리 전 사본에서는 [A]·[B] 가 실제로 빨갛다(헛초록이 아님을 못박는다).
 *
 * ⚠ 캡처 PNG 는 커밋 금지 자산이다 — [D] 는 스스로 찍고 스스로 지운다.
 * 상세 `docs/review/949-scan813e이름부패.md`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const G = require('./gitrev756');

const ROOT = path.join(__dirname, '..');
const T = __dirname;
const PRE = '2612b48';                       // claim(949) — 수리 전 트리
const SHOT = path.join(ROOT, 'docs', 'shots', '949-89-2280.png');

let pass = 0, total = 0, held = 0;
const ok = (c, m) => { total++; if (c) { pass++; console.log('  ✓ ' + m); } else console.log('  ✗ ' + m); };
const hold = (m) => { held++; console.log('  ⏸ ' + m + ' (환경 — 세지 않는다)'); };
const lastLine = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
const py = (file, args, opts) => spawnSync('python3', [file].concat(args || []),
  Object.assign({ cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opts || {}));

console.log('=== verify949 — scan887 을 부르는 이름 사슬 · 넷째 자가 답하는가 ===\n');

/* ---------- [A] 이름 사슬 — 전수 인구조사 ---------- */
/** `scan887` 을 읽는 파이썬 자가 실제로 부르는 이름이 그 모듈에 다 있는가.
 *  주석 줄은 뺀다(문서가 옛 이름을 인용하는 것까지 위반으로 읽으면 자가 거짓말을 한다 — 939 [B] 규약). */
function census(dir, modSrcPath) {
  const names = spawnSync('python3', ['-c',
    'import importlib.util,sys;spec=importlib.util.spec_from_file_location("m887",' +
    JSON.stringify(modSrcPath) + ');m=importlib.util.module_from_spec(spec);' +
    'sys.path.insert(0,' + JSON.stringify(path.dirname(modSrcPath)) + ');spec.loader.exec_module(m);' +
    'print("\\n".join(sorted(dir(m))))'],
    { encoding: 'utf8',
      /* 사본을 딴 데 두고 읽을 때도 공용 부품(`pydep937`)은 `tools/` 에서 읽는다 */
      env: Object.assign({}, process.env, { PYTHONPATH: T + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') }) });
  const have = new Set((names.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean));
  const bad = [];
  if (!have.size) return { bad: null, have };
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.py'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').split('\n')
      .filter((l) => !/^\s*#/.test(l)).join('\n');
    if (!/scan887/.test(src)) continue;
    const alias = (src.match(/import\s+scan887\s+as\s+(\w+)/) || [])[1];
    const want = [];
    if (alias) for (const m of src.matchAll(new RegExp('\\b' + alias + '\\.(\\w+)', 'g'))) want.push(m[1]);
    for (const m of src.matchAll(/from\s+scan887\s+import\s+([\w, ]+)/g)) {
      for (const n of m[1].split(',')) if (n.trim()) want.push(n.trim());
    }
    for (const n of new Set(want)) if (!have.has(n)) bad.push(f + ' → scan887.' + n);
  }
  return { bad, have };
}
const cen = census(T, path.join(T, 'scan887.py'));
ok(cen.bad && cen.bad.length === 0,
   '[A1] ★ `scan887` 의 «없는 이름» 을 부르는 자리 0건 — 실측 ' +
   (cen.bad ? (cen.bad.length ? cen.bad.join(' · ') : '0건') : '모듈을 못 읽었다'));
ok(cen.have.has('find_base_u1') && cen.have.has('find_base_u3') && !cen.have.has('find_base'),
   '[A2] 905 의 개명은 그대로다 — `find_base_u1`(기각·대조용)·`find_base_u3`(약속의 자)가 있고 옛 이름은 없다(333 처방)');
const src813e = fs.readFileSync(path.join(T, 'scan813e.py'), 'utf8');
ok(/S\.find_base_u1\(/.test(src813e) && /S\.find_base_u3\(/.test(src813e),
   '[A3] ★ 넷째 자가 **둘을 다** 부른다 — 옛 자 U1 을 되살린 것이 아니라 그 옆에 U3 을 놓았다');
ok(!/\bS\.find_base\(/.test(src813e), '[A4] 옛 이름을 코드에서 부르는 자리 0건');

/* ---------- [B] 그 자가 실제로 답한다 ---------- */
const e = py(path.join(T, 'scan813e.py'));
const eOut = e.stdout || '';
ok(e.status === 0, '[B1] ★ `python3 tools/scan813e.py` 가 코드 0 으로 끝난다 — 실측 ' + e.status +
   (e.status ? ' · ' + JSON.stringify(lastLine(e.stderr).slice(0, 60)) : ''));
ok(!/Traceback/.test((e.stderr || '') + eOut), '[B2] 스택 트레이스 0건');
for (const [tag, re] of [['B3', /U1 밝은 아랫변/], ['B4', /U2 마지막 칠해진 행/], ['B5', /U3 절대 어둠/]]) {
  ok(re.test(eOut), '[' + tag + '] 결과 줄이 남는다 — ' + re.source.replace(/\\/g, '') +
     ' (스윕이 «없는 자» 로 지나가지 않는다)');
}
const js = py(path.join(T, 'scan813e.py'), ['--json']);
let J = null;
try { J = JSON.parse((js.stdout || '').slice((js.stdout || '').indexOf('{'))); } catch (_) {}
ok(J && J.ref && J.ref.u3 && J.ref.bright, '[B6] `--json` 도 U1·U3 을 같이 낸다(기계가 읽을 수 있다)');

/* ---------- [C] 값의 검산 ---------- */
if (J && J.ref) {
  ok(Math.abs(J.ref.bright.ratio - 0.900) < 0.001,
     '[C1] ★ ref 의 U1 = 0.900 — 887 이 «과녁 0.90» 이라 적어 둔 그 값이 그대로 나온다 · 실측 ' + J.ref.bright.ratio);
  ok(Math.abs(J.ref.u3.ratio - 0.750) < 0.001,
     '[C2] ★ ref 의 U3 = 0.750 — 905 확정값(위 12 : 아래 9 ref px) · 실측 ' + J.ref.u3.ratio);
  ok(J.ref.u3.up === 12 && J.ref.down === 9,
     '[C3] 그 확정값의 두 정수까지 같다 — 위 ' + J.ref.u3.up + ' : 아래 ' + J.ref.down);
  const rows = Object.values(J.ref.delta).map((v) => v.row);
  ok(new Set(rows).size > 1,
     '[C4] ★ U2(옆 대비)는 자기 문턱에서 움직인다 — 행 ' + rows.join('·') +
     ' ⇒ 이 자가 스스로 세운 규칙대로 **U2 도 약속을 못 맡는다**(그 판정을 이제 자기 입으로 찍는다)');
  ok(/U2 는 자기 손잡이에서 움직인다/.test(eOut),
     '[C5] 그 자기 판정이 사람이 읽는 줄로도 나온다');
} else {
  hold('[C] --json 을 못 읽었다');
}

/* ---------- [D] 두 그림을 실제로 잰다 — U1 의 부호가 뒤집힌다 ---------- */
let shot = false;
try {
  const { pw, launch } = require('./pwlaunch');
  const { chromium } = pw();
  const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  const code = `(async()=>{const {pw,launch}=require(${JSON.stringify(path.join(T, 'pwlaunch'))});
    const {chromium}=pw();const b=await launch(chromium);
    const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
    const p=await ctx.newPage();await p.goto(${JSON.stringify(URL)});await p.waitForTimeout(650);
    await p.evaluate("try{ openRelw() }catch(e){}");await p.waitForTimeout(460);
    await p.evaluate(()=>{const v=document.getElementById('view');if(v)v.style.visibility='hidden';});
    const el=await p.$('#app');require('fs').mkdirSync(${JSON.stringify(path.dirname(SHOT))},{recursive:true});
    await (el||p).screenshot({path:${JSON.stringify(SHOT)}});await b.close();})()`;
  const r = spawnSync(process.execPath, ['-e', code], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  shot = r.status === 0 && fs.existsSync(SHOT);
  if (!shot) hold('[D] 캡처를 못 찍었다 — ' + lastLine((r.stderr || '') + (r.stdout || '')).slice(0, 80));
  void chromium; void launch;
} catch (err) {
  hold('[D] 브라우저 환경이 없다 — ' + String(err.message || err).split('\n')[0]);
}
if (shot) {
  const d = py(path.join(T, 'scan813e.py'), ['--json', SHOT]);
  let K = null;
  try { K = JSON.parse((d.stdout || '').slice((d.stdout || '').indexOf('{'))); } catch (_) {}
  const our = K && K.caps && K.caps[0];
  if (our && our.u3 && our.bright && J && J.ref) {
    const sRef = J.ref.u3.row - J.ref.bright.row;
    const sOur = our.u3.row - our.bright.row;
    ok(sRef < 0 && sOur > 0,
       '[D1] ★ U1 은 두 그림에서 **부호가 뒤집힌다** — ref ' + sRef + '행 ↔ 우리 +' + sOur +
       '행 (905 ② 를 넷째 자가 독립으로 재확인한다 = 같은 물체를 안 가리킨다)');
    ok(Math.abs(our.u3.ratio - J.ref.u3.ratio) < 0.06,
       '[D2] ★ 그런데 **U3 으로 재면 두 그림이 같은 답**이다 — ref ' + J.ref.u3.ratio +
       ' ↔ 우리 ' + our.u3.ratio + ' (약속의 자는 두 쪽에서 같은 것을 훔친다)');
    ok(Math.abs(our.bright.ratio - J.ref.bright.ratio) > 0.1,
       '[D3] 같은 자리에서 U1 로 재면 갈린다 — ref ' + J.ref.bright.ratio + ' ↔ 우리 ' + our.bright.ratio +
       ' (기각된 자를 지우지 않고 남겨 둔 값이 이것이다)');
  } else {
    hold('[D] 캡처에서 랜드마크를 못 읽었다');
  }
  try { fs.unlinkSync(SHOT); } catch (_) {}
  ok(!fs.existsSync(SHOT), '[D4] 캡처를 지웠다 — 캡처 PNG 는 커밋 금지 자산이다(ROUTINE 서두)');
}

/* ---------- [E] 939 사전 — 못 재면 코드 3 + 한 줄 ---------- */
const SITES = [
  { py: 'scan813e.py', args: [path.join(ROOT, 'docs', 'shots', '없는그림-949.png')], tag: 'E1', what: '없는 그림' },
  { py: 'scan813d.py', args: [], tag: 'E2', what: '인자 없음(기본 캡처가 없다 — 등재문 곁다리)' },
];
for (const s of SITES) {
  const r = py(path.join(T, s.py), s.args);
  const said = lastLine(r.stderr);
  ok(r.status === 3 && said && !/Traceback/.test((r.stderr || '') + (r.stdout || '')),
     '[' + s.tag + '] ★ ' + s.py + ' — ' + s.what + ' → 코드 3 + 한 줄 · 실측 ' + r.status + ' ' +
     JSON.stringify(said.slice(0, 60)));
  ok(/—/.test(said) && !/pip3 install pillow numpy/.test(said),
     '[' + s.tag + 'b] 그 줄이 «무엇이 안 됐는지 — 할 일» 꼴이고 상시 준비 줄을 답으로 주지 않는다(938-③)');
}

/* ---------- [R] 되돌림 시험 ---------- */
const got = G.ensure(PRE);
if (!got.ok) {
  hold('[R] 수리 전 사본(' + PRE + ')을 못 가져왔다 — ' + (got.why || ''));
} else {
  const g = G.show(PRE, 'tools/scan813e.py');
  if (!g.ok) hold('[R] 수리 전 `scan813e.py` 를 못 꺼냈다');
  else {
    const sand = fs.mkdtempSync(path.join(require('os').tmpdir(), 'v949-'));
    const preFile = path.join(sand, 'scan813e.py');
    fs.writeFileSync(preFile, g.buf);
    const r1 = spawnSync('python3', [preFile], { cwd: ROOT, encoding: 'utf8',
      env: Object.assign({}, process.env, { PYTHONPATH: T + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') }) });
    const r1all = (r1.stdout || '') + (r1.stderr || '');
    ok(r1.status !== 0 && /AttributeError[\s\S]*find_base/.test(r1all),
       '[R1] ★ 수리 전 사본은 **같은 자리에서 죽는다** — 코드 ' + r1.status + ' · AttributeError(= 이 게이트가 실재를 잡는다)');
    ok(!/U3 절대 어둠/.test(r1.stdout || ''),
       '[R2] ★ 그때는 결과 줄이 **한 줄도 안 남았다** — [B3]~[B5] 가 지키는 것이 이 자리다');
    /* [A] 의 인구조사 자가 그 사본을 실제로 «위반» 으로 집는가 — 자가 헛초록이 아님 */
    const sand2 = fs.mkdtempSync(path.join(require('os').tmpdir(), 'v949c-'));
    fs.copyFileSync(path.join(T, 'scan887.py'), path.join(sand2, 'scan887.py'));
    fs.writeFileSync(path.join(sand2, 'scan813e.py'), g.buf);
    const c2 = census(sand2, path.join(sand2, 'scan887.py'));
    ok(c2.bad && c2.bad.length === 1 && /scan813e\.py → scan887\.find_base$/.test(c2.bad[0]),
       '[R3] ★ [A1] 의 인구조사가 그 사본을 실제로 집는다 — ' + JSON.stringify(c2.bad));
    try { fs.rmSync(sand, { recursive: true, force: true }); } catch (_) {}
    try { fs.rmSync(sand2, { recursive: true, force: true }); } catch (_) {}
  }
}

console.log('\nVERIFY949 ' + pass + '/' + total + (held ? ' (⏸ ' + held + ')' : '') +
            (pass === total ? ' PASS' : ' FAIL'));
process.exit(pass === total ? 0 : 1);
