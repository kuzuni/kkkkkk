#!/usr/bin/env node
/* VERIFY960 — 비고 머리말 «등재문» 을 «안 했다» 로 읽는가, 그리고 **한정이 붙은 것은 안 읽는가**
 *
 * ── 무엇을 재는가 ──────────────────────────────────────────────────────────
 * 422 가 «안 했다» 어휘를 `미착수|등재만|착수 전` 셋으로 적은 뒤, 등재하는 세션들이 비고 머리말을
 * **`**등재문**`** 으로 쓰기 시작했다(실측 8행). 그 낱말이 어휘 밖이라 `verifyProgress` 의
 * §2(자기모순)·§3(마감 누락)이 그 행을 **한 건도 안 셌다** — 947 이 `done(947)` 을 이력에 두고도
 * 표가 `구현 –`·`0/5`·`**등재문.**` 인 채 남아 **다음 워커가 통째로 재선점했다**
 * (371·378·308·383·498 에 이어 여섯 번째 · 등재 960).
 *
 * ── 왜 «그냥 어휘에 더한다» 가 오답인가 (이 자의 절반은 이 항이다) ──────────────
 * 이 낱말은 뜻이 둘이고, 실측 8행이 그 둘을 깨끗이 가른다:
 *   · **맨낱말** `**등재문.**` · `**등재문** — 실측…`        = «이 행은 등재문**일 뿐**» = 안 했다
 *   · **괄호 한정** `**등재문(보존)**` · `**등재문(아래 …) · 완료**` = «본문은 보존된 등재문, 답은 딴 칸»
 *                                                            = 했다
 * 어휘에 맨 `등재문` 을 그냥 넣으면 §2 가 **896·909·915 세 완료행을 곧바로 빨갛게** 만든다(실측).
 * `verifyProgress` 는 **모든 워커의 push 게이트**라 그 순간 저장소 전체의 push 가 막힌다 —
 * 헛빨강 하나의 값이 놓친 자리 하나보다 비싸다(그 자 §3 머리말의 저울). 그래서 어휘에 넣은 것은
 * «뒤에 `(` 가 안 오는 등재문» 이고, [4]·[R2] 가 그 한정이 실재함을 못박는다.
 *
 * ── 절 ────────────────────────────────────────────────────────────────────
 *   [1] 어휘 사본 다섯이 **같은 모양**이다 (422-① — 사본을 따로 넓히면 자가 본체와 다른 것을 잰다)
 *   [2] 실물 표 인구조사 — 두 갈래가 실제로 있다(표본 하한 · 422-②)
 *   [3] 맨낱말 행은 «안 했다» 로 읽힌다
 *   [4] 괄호 한정 행은 «안 했다» 로 **안** 읽힌다  ← 헛빨강을 막는 항
 *   [5] 본체 실행 — 실물 표가 초록이고 §2·§3 절이 실제로 돌았다
 *   [6] 합성 표본 — 마감을 빠뜨린 «등재문» 행을 §3 이 두 관행 **각각**에서 지목한다
 *   [R] 되돌림 ① — 어휘에서 «등재문» 을 빼면 [6] 이 다시 조용해진다(수리가 무르지 않다)
 *   [R2] 되돌림 ② — 한정을 떼면 실물 표에서 §2 가 세 완료행으로 빨개진다(한정이 실재한다)
 *
 * 종료 코드: 0 = PASS · 1 = FAIL · 2 = 도구 오류
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'docs/PROGRESS.md';
const SRC = path.join(ROOT, REL);
const GATE = path.join(ROOT, 'tools', 'verifyProgress.js');

let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log('  ok  ' + m + (d ? '  [' + d + ']' : '')); };
const no = (m, d) => { fail++; console.log('  ✗   ' + m + (d ? '  [' + d + ']' : '')); };
const chk = (c, m, d) => (c ? ok : no)(m, d);

/* ── 이 자가 재는 모양 — **본체와 같아야 한다**(422-①) ──────────────────────── */
const VOCAB = '(미착수|등재만|착수 전|등재문(?!\\s*\\())';
const HEAD_NOT_YET = /^\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전|등재문(?!\s*\())/;
const NOT_YET = /\|\s*(?:–|—|-|미착수\.?|)\s*\|\s*(?:–|—|-|)\s*\|[^|]*\|\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전|등재문(?!\s*\())/;
const DONE_DATED = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;
const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;

const text = fs.readFileSync(SRC, 'utf8');
const lines = text.split('\n');
const idxOf = id => lines.findIndex(l => { const g = ROW.exec(l); return g && g[1] === id; });

/* GFM 표 칸 나누기 — `\|` 는 구분자가 아니다(본체 `cellsOf` 와 같은 규약) */
function cellsOf(line) {
  const out = []; let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (ch === '|') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  if (out.length && !out[0].trim()) out.shift();
  if (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}
const tailOf = line => {
  const c = cellsOf(line);           /* escape 를 지켜 나눈다 — 960 [7] 이 재는 축이다 */
  let i = c.length - 1;
  while (i > 0 && !c[i].trim()) i--;
  return i > 0 ? c[i] : '';
};

console.log('VERIFY960 — 머리말 «등재문» 어휘 + 괄호 한정 구분');
console.log('');

/* ── [1] 어휘 사본 다섯 ───────────────────────────────────────────────────── */
console.log('[1] 어휘 사본 — 같은 모양을 들고 있는 자 전수 (422-① 재발 방지)');
/* ⚠ 세는 것은 **정규식 자리**뿐이다 — 주석이 어휘를 산문으로 인용하는 줄이 여럿 있고
   (본체 머리말·이 자의 머리말), 그것까지 세면 «좁은 판이 남았다» 는 헛빨강이 난다.
   정규식 자리는 어휘가 **괄호로 닫힌다**(`(…착수 전)`) — 산문 인용에는 그 괄호가 없다. */
const NARROW_RX = /\(미착수\|등재만\|착수 전\)/g;
const WIDE_RX = /\(미착수\|등재만\|착수 전\|등재문\(\?!\\s\*\\\(\)\)/g;
const COPIES = ['tools/probe388.js', 'tools/probe557.js', 'tools/probe566.js',
                'tools/verify388.js', 'tools/verify960.js', 'tools/verifyProgress.js'];
{
  let seen = 0;
  for (const rel of COPIES) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { no('[1] ' + rel + ' 이 없다'); continue; }
    const t = fs.readFileSync(p, 'utf8');
    const n = (t.match(NARROW_RX) || []).length;
    const w = (t.match(WIDE_RX) || []).length;
    chk(n === 0 && w > 0, '[1-' + rel.replace(/^tools\//, '') + '] 정규식 자리가 전부 넓은 판이다',
        '좁은 판 ' + n + '곳 · 넓은 판 ' + w + '곳');
    if (n === 0 && w > 0) seen++;
  }
  chk(seen === COPIES.length, '[1-전수] 사본 ' + COPIES.length + '개가 모두 넓은 어휘를 들고 있다',
      seen + '/' + COPIES.length);
  /* 래칫 — 어휘를 정규식으로 들고 있는 자가 그 목록 밖에 새로 생기면 여기가 짖는다.
     (사본을 따로 넓히면 자가 본체와 **다른 것을 잰다** — 422-① 이 그 사고다.) */
  const all = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => f.endsWith('.js'))
    .filter(f => {
      const t = fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8');
      return NARROW_RX.test(t) || WIDE_RX.test(t);
    }).map(f => 'tools/' + f).sort();
  chk(all.length === COPIES.length && all.every(f => COPIES.includes(f)),
      '[1-래칫] 어휘를 정규식으로 들고 있는 자는 그 ' + COPIES.length + '개뿐이다', all.join(' '));
}

/* ── [2] 실물 표 인구조사 ────────────────────────────────────────────────── */
console.log('');
console.log('[2] 실물 표 — «등재문» 머리말이 두 갈래로 갈린다 (표본은 표에게 묻는다)');
const bare = [], qual = [];
for (const l of lines) {
  const g = ROW.exec(l);
  if (!g) continue;
  const t = tailOf(l);
  const m = /^\s*(?:\*\*)?\s*(?:←\s*)?등재문/.exec(t);
  if (!m) continue;
  (/^\s*(?:\*\*)?\s*(?:←\s*)?등재문\s*\(/.test(t) ? qual : bare).push(g[1]);
}
chk(bare.length >= 3, '[2-a] 맨낱말 «등재문» 행이 실제로 있다 — 이 절이 공허하지 않다 (422-②)',
    bare.length + '건: ' + bare.join(' '));
chk(qual.length >= 1, '[2-b] 괄호 한정 «등재문(…)» 행도 실제로 있다 — [4] 가 공허하지 않다',
    qual.length + '건: ' + qual.join(' '));
chk(bare.every(id => !DONE_DATED.test(lines[idxOf(id)])),
    '[2-c] 맨낱말 행에는 완료 표지가 없다(= 정말 미착수다)', bare.join(' '));
chk(qual.every(id => DONE_DATED.test(lines[idxOf(id)])),
    '[2-d] 괄호 한정 행에는 완료 표지가 있다(= 정말 완료행이다)', qual.join(' '));

/* ── [3]·[4] 모양이 두 갈래를 실제로 가르는가 ──────────────────────────────── */
console.log('');
console.log('[3] 맨낱말 «등재문» 은 «안 했다» 로 읽힌다');
for (const id of bare) {
  chk(HEAD_NOT_YET.test(tailOf(lines[idxOf(id)])), '[3-' + id + '] 머리말 앵커가 잡는다',
      tailOf(lines[idxOf(id)]).trim().slice(0, 26));
}
console.log('');
console.log('[4] 괄호 한정 «등재문(…)» 은 «안 했다» 로 **안** 읽힌다 — 헛빨강을 막는 항');
for (const id of qual) {
  chk(!HEAD_NOT_YET.test(tailOf(lines[idxOf(id)])), '[4-' + id + '] 머리말 앵커가 그냥 지나간다',
      tailOf(lines[idxOf(id)]).trim().slice(0, 26));
}

/* ── 사본을 자에게 물리는 하네스 ──────────────────────────────────────────── */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'verify960-'));
function askGate(bodyLines, tag, gate) {
  const f = path.join(TMP, tag + '.md');
  fs.writeFileSync(f, bodyLines.join('\n'));
  const r = spawnSync('node', [gate || GATE, '--file', f, '--no-gate'], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/* ── [5] 본체 실행 — 실물 표 ──────────────────────────────────────────────── */
console.log('');
console.log('[5] 본체 실행 — 넓힌 뒤에도 실물 표가 초록이다');
const live = spawnSync('node', [GATE, '--no-gate'], { cwd: ROOT, encoding: 'utf8' });
const liveOut = (live.stdout || '') + (live.stderr || '');
chk(live.status === 0, '[5-a] 실물 표에서 종료 코드 0 — 헛빨강 0건', '종료 코드 ' + live.status);
chk(/§2 자기모순 검사/.test(liveOut) && /§3 마감 누락 검사/.test(liveOut),
    '[5-b] §2·§3 절이 실제로 돌았다 — 항이 조용히 빠지지 않았다');
chk(!/SELF-CONTRADICTION|UNCLOSED/.test(liveOut), '[5-c] 실물에 자기모순·마감 누락 0건');

/* ── [6] 합성 표본 — 마감을 빠뜨린 «등재문» 행 ────────────────────────────────
 * 표본을 리터럴로 박지 않는다(368·388 처방) — «자산이 끝났다고 말하는데 표는 등재문» 을
 * 만들 수 있는 ID 를 표·저장소에게 물어서 고른다. 조건 넷:
 *   ⓐ review 가 스스로 «완료(날짜)» 라고 적었다 (§3 의 E3 축)
 *   ⓑ `tools/verify<ID>.js` 가 **없다** — E2 축을 안 쓰므로 자를 안 돌려도 판정이 결정적이다
 *   ⓒ lock 이 없다 — 있으면 §3 이 «진행 중» 으로 제외한다
 *   ⓓ `done(<ID>)` 이 **얕은 창 밖**이다 — 창 안이면 §1 이 먼저 그 행을 대서 §3 이 입을 다문다
 *      (947 판본을 그대로 물리면 정확히 이 일이 일어난다 — 등재문의 재현 서술이 놓친 자리다) */
console.log('');
console.log('[6] 합성 표본 — 마감을 빠뜨린 «등재문» 행을 §3 이 지목한다');
const winDone = new Set();
{
  const lg = spawnSync('git', ['log', 'HEAD', '--format=%s', '--', REL], { cwd: ROOT, encoding: 'utf8' });
  for (const s of String(lg.stdout || '').split('\n')) {
    const g = /^done\(([0-9A-Z, ]+)\)/.exec(s);
    if (g) for (const raw of g[1].split(',')) if (raw.trim()) winDone.add(raw.trim());
  }
}
const reviewDir = path.join(ROOT, 'docs', 'review');
const reviewFiles = fs.existsSync(reviewDir) ? fs.readdirSync(reviewDir) : [];
function pickSample() {
  for (const l of lines) {
    const g = ROW.exec(l);
    if (!g) continue;
    const id = g[1];
    if (winDone.has(id)) continue;                                         /* ⓓ */
    if (fs.existsSync(path.join(ROOT, 'tools', 'verify' + id + '.js'))) continue;   /* ⓑ */
    if (fs.existsSync(path.join(ROOT, 'docs', 'claims', id + '.lock'))) continue;   /* ⓒ */
    const rv = reviewFiles.filter(f => f.startsWith(id + '-') && f.endsWith('.md'));
    if (!rv.length) continue;
    const says = rv.some(f => {                                            /* ⓐ */
      try { return DONE_DATED.test(fs.readFileSync(path.join(reviewDir, f), 'utf8')); } catch (e) { return false; }
    });
    if (says) return id;
  }
  return null;
}
const SAMPLE = pickSample();
const SHAPES = {
  /* 962·948 꼴 — 구현 «–» · 채점 칸에 산문 ⇒ **꼬리 머리말 축으로만** 걸린다 */
  tail: id => '| ' + id + ' | **합성 표본(960) — 마감을 빠뜨린 행** | `tools/verifyProgress.js` | – | — (등재만) | 0/5 | **등재문** — 합성 표본. |',
  /* 구현 칸 축 — 세 칸이 다 등재 상태 */
  impl: id => '| ' + id + ' | **합성 표본(960) — 마감을 빠뜨린 행** | `tools/verifyProgress.js` | – | – | 0/5 | **등재문** — 합성 표본. |',
};
const synth = {};
if (!SAMPLE) no('[6] 조건 넷을 만족하는 표본 ID 를 못 골랐다 — 자를 손봐라');
else {
  ok('[6-0] 표본을 표에게 물어 골랐다', SAMPLE);
  const i = idxOf(SAMPLE);
  for (const key of Object.keys(SHAPES)) {
    const row = SHAPES[key](SAMPLE);
    chk(!DONE_DATED.test(row), '[6-' + key + '-0] 사본 행에 완료 표지가 없다(= §3 의 몫이지 §2 의 몫이 아니다)');
    if (key === 'tail') {
      chk(!NOT_YET.test(row), '[6-tail-0b] 사본은 **구현 칸 축으로는 안 걸린다** — 꼬리 머리말 축을 격리한다');
    } else {
      chk(NOT_YET.test(row), '[6-impl-0b] 사본이 구현 칸 축의 모양이다');
    }
    const copy = lines.slice(); copy[i] = row;
    synth[key] = copy;
    const r = askGate(copy, 's' + key);
    chk(r.code === 1, '[6-' + key + '] 자가 빨갛다', '종료 코드 ' + r.code);
    chk(new RegExp('✗ ' + SAMPLE + ' — 마감 누락').test(r.out),
        '[6-' + key + '] 그 ID 를 **마감 누락**으로 지목한다(진단이 §1·§2 로 안 미끄러진다)');
  }
}

/* ── 되돌림 시험 하네스 — 본체의 어휘만 갈아 낀 사본을 만든다 ───────────────────
 * 사본은 `ROOT/tools/` 안에 있어야 한다(본체가 `path.resolve(__dirname, '..')` 로 ROOT 를 잡는다).
 * 그래서 점 이름으로 떴다가 **반드시 지운다** — 남으면 [1] 래칫이 다음 실행에서 짖는다. */
const MUT = [];
function mutant(tag, from, to) {
  const p = path.join(ROOT, 'tools', '.verify960-' + tag + '.js');
  let t = fs.readFileSync(GATE, 'utf8');
  if (!t.includes(from)) return null;
  t = t.split(from).join(to);
  fs.writeFileSync(p, t);
  MUT.push(p);
  return p;
}
function cleanup() { for (const p of MUT) { try { fs.unlinkSync(p); } catch (e) {} } }
process.on('exit', cleanup);

/* ── [R] 되돌림 ① — 어휘에서 «등재문» 을 빼면 [6] 이 다시 조용해진다 ──────────── */
console.log('');
console.log('[R] 되돌림 ① — 어휘에서 «등재문» 을 빼면 합성 표본이 다시 초록이다 (수리가 무르지 않다)');
{
  /* 좁은 어휘를 **손으로 안 적는다** — 넓은 어휘에서 이 작업이 더한 항만 떼어 파생시킨다
     (861 처방). 손으로 적으면 [1] 이 이 자를 «안 넓힌 사본» 으로 세고, 어휘가 또 바뀌면
     되돌림 시험만 옛 모양에 굳는다(422-④ 가 그 사고다). */
  const p = mutant('narrow', VOCAB, VOCAB.replace('|등재문(?!\\s*\\()', ''));
  if (!p) no('[R] 어휘 문자열을 본체에서 못 찾았다 — 모양이 바뀌었으면 이 자를 같이 고쳐라');
  else if (!SAMPLE) no('[R] 표본이 없어 못 걸었다');
  else {
    for (const key of Object.keys(synth)) {
      const r = askGate(synth[key], 'n' + key, p);
      chk(r.code === 0, '[R-' + key + '] 좁은 어휘로는 초록이다 = 빨강을 만든 것이 이 어휘다',
          '종료 코드 ' + r.code);
    }
    const r2 = spawnSync('node', [p, '--no-gate'], { cwd: ROOT, encoding: 'utf8' });
    chk(r2.status === 0, '[R-live] 좁은 어휘로도 실물 표는 초록이다(그때는 아무것도 안 세고 있었다)');
  }
}

/* ── [R2] 되돌림 ② — 괄호 한정을 떼면 실물 표가 빨개진다 ─────────────────────── */
console.log('');
console.log('[R2] 되돌림 ② — 괄호 한정을 떼면 실물 표에서 §2 가 완료행을 빨갛게 만든다 (한정이 실재한다)');
{
  const p = mutant('greedy', '등재문(?!\\s*\\()', '등재문');
  if (!p) no('[R2] 한정 문자열을 본체에서 못 찾았다');
  else {
    const r = spawnSync('node', [p, '--no-gate'], { cwd: ROOT, encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    chk(r.status === 1, '[R2-a] 한정을 떼면 실물 표가 **빨갛다** — 그냥 어휘에 더하는 수리는 오답이다',
        '종료 코드 ' + r.status);
    chk(/SELF-CONTRADICTION/.test(out), '[R2-b] 그 빨강은 §2 자기모순이다');
    const named = qual.filter(id => new RegExp('✗ ' + id + ' — 자기모순').test(out));
    chk(named.length === qual.length,
        '[R2-c] 빨개지는 행이 정확히 «괄호 한정» 행들이다 — [4] 가 막고 있는 것이 이것이다',
        named.join(' ') + ' / 기대 ' + qual.join(' '));
    chk(!bare.some(id => new RegExp('✗ ' + id + ' — 자기모순').test(out)),
        '[R2-d] 맨낱말 행은 그 사본에서도 §2 로는 안 걸린다(완료 표지가 없으니 §2 의 몫이 아니다)');
  }
}

/* ── [7] 칸 나누기 — tail 축이 escape 를 지키는가 (960 이 같이 잡은 잠복 결함) ──────
 * 445 가 `tailHead` 를 세울 때 쓴 `line.split('|')` 은 `\|` 까지 구분자로 세어 **비고 칸
 * 한복판의 조각**을 «마지막 칸» 으로 집는다. 그 조각이 어휘로 시작하면 완료행이 통째로
 * 헛빨강이 된다 — 960 자신의 행이 그랬다(비고가 `미착수\|등재만\|착수 전` 을 인용하자
 * naive 는 «착수 전` 으로 적었고…» 를 머리말로 읽었다). 566 이 축 ⓒ 에서 이미 못박은
 * 규약(«`\|` 는 구분자가 아니다»)을 tail 축만 안 지키고 있었다. */
console.log('');
console.log('[7] 칸 나누기 — tail 축이 `\\|` 를 구분자로 안 센다 (566 규약을 여기까지)');
{
  /* 옛(naive) 분할 — **일부러 남긴 대조군**이다. 구분자를 상수로 빼서 적는 것은 취향이 아니라
     [7-d] 래칫 때문이다: 옛 관용구를 그대로 적으면 이 자가 «안 고친 사본» 으로 자기를 센다. */
  const PIPE = '|';
  const naiveTail = line => {
    const c = line.split(PIPE);
    let i = c.length - 1;
    while (i > 0 && !c[i].trim()) i--;
    return i > 0 ? c[i] : '';
  };
  const split = lines.filter(l => ROW.test(l) && naiveTail(l) !== tailOf(l)).map(l => ROW.exec(l)[1]);
  chk(split.length >= 1, '[7-a] 두 분할이 서로 다른 칸을 «머리말» 로 집는 행이 실제로 있다 — 이 절이 공허하지 않다',
      split.length + '건: ' + split.join(' '));
  const wrong = split.filter(id => HEAD_NOT_YET.test(naiveTail(lines[idxOf(id)])) &&
                                   !HEAD_NOT_YET.test(tailOf(lines[idxOf(id)])));
  chk(wrong.length >= 1, '[7-b] 그중 naive 로만 «안 했다» 로 읽히는 행이 있다 = 헛빨강 자리',
      wrong.join(' '));
  chk(wrong.every(id => DONE_DATED.test(lines[idxOf(id)])),
      '[7-c] 그 행들은 완료행이다 — 즉 naive 판이면 §2 가 곧바로 빨개진다', wrong.join(' '));
  /* 되돌림 — 본체를 naive 분할로 되돌리면 실물 표가 빨개지고, 그 ID 가 [7-b] 의 것과 같다 */
  /* 되돌릴 옛 관용구도 **조립해서** 만든다 — 통째로 적으면 [7-d] 래칫이 자기를 센다(위와 같은 이유) */
  const NAIVE_IDIOM = 'const c = line.split(\'' + PIPE + '\');';
  const p = mutant('naive', 'const c = cellsOf(line);               /* `function` 선언이라 아래 정의가 끌어올려진다 */',
                   NAIVE_IDIOM);
  if (!p) no('[7-R] 본체의 tail 분할 자리를 못 찾았다 — 모양이 바뀌었으면 이 자를 같이 고쳐라');
  else {
    const r = spawnSync('node', [p, '--no-gate'], { cwd: ROOT, encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    chk(r.status === 1, '[7-R] naive 분할로 되돌리면 실물 표가 **빨갛다**', '종료 코드 ' + r.status);
    chk(wrong.every(id => new RegExp('✗ ' + id + ' — 자기모순').test(out)),
        '[7-R] 빨개지는 행이 정확히 [7-b] 가 지목한 행이다', wrong.join(' '));
  }
  /* 래칫 — 사본에도 naive tail 이 남아 있으면 안 된다(422-① · 자가 본체와 다른 것을 잰다) */
  const stray = COPIES.filter(rel => {
    const t = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return /const c = line\.split\('\|'\);/.test(t);
  });
  chk(stray.length === 0, '[7-d] 사본 어디에도 naive tail 분할이 안 남았다', stray.join(' ') || '0곳');
}

cleanup();
console.log('');
console.log('VERIFY960 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
