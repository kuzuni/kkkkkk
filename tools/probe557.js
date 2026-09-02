#!/usr/bin/env node
/* probe557 — «끝난 작업이 표에서 «미착수» 로 읽히는데 어느 자도 안 빨개진다» 를 재현한다 (작업 557)
 *
 *   node tools/probe557.js               재현 전수(합성 재현의 자 실행 포함)
 *   node tools/probe557.js --no-gate     자 실행만 건너뛴다(빠른 실행 · [2-d] 는 «안 쟀다» 로 찍는다)
 *
 * ── 왜 재현기부터인가 (338 규칙) ────────────────────────────────────────────
 * 557 의 등재문은 «`verifyProgress.js` 에 §3 을 신설해 자산이 있는 미착수 행을 빨갛게 하라» 고 적었다.
 * 그 처방을 **따르기 전에** 잰다 — 뿌리가 정말 «자가 그 모양을 못 본다» 인지, 그리고 자를 세울 때
 * **진짜 미착수 행과 진행 중인 행을 빨갛게 만들지 않는지**(음성항)가 이 작업의 절반이다.
 *
 * ── 무엇이 §1·§2 를 통과하는가 (이 재현기의 본체) ──────────────────────────
 * 498(sess-1821-21145 워커 F)은 제품·`verify498` 45/45·`probe498` 8/8·review·UI-REFERENCE 를
 * **전부 push 하고도** PROGRESS 세 칸을 등재 상태로 남긴 채 끝났다. 그 상태에서
 *   §1 되돌림(374) — `done(498)` 커밋이 `.git/shallow` 경계 밖이라 **볼 수 없다**.
 *   §2 자기모순(388·445) — 모순의 정의가 «행에 완료 표지가 **있는데** 미착수로 연다» 이고,
 *                          이 행에는 완료 표지가 **한 글자도 없다**. 모순이 아니라 «일관되게 미착수» 다.
 * 두 자 다 «초록» 이 정답인 자리다 — 그래서 셋째 자가 필요하다. 자산은 저장소 안에 있는데
 * 표만 안 따라온 것이므로, **표가 아니라 표 ↔ 자산의 어긋남**을 보는 자여야 한다.
 *
 * ⚠ 이 재현기는 «자산이 있다» 를 **완료의 증거로 곧장 쓰지 않는다.** 지시서 [1] 은 회차마다
 * `docs/review/<ID>-*.md` 를 커밋하라고 못박으므로 **진행 중인 작업도 review 파일을 갖는다**.
 * 진행 중과 마감 누락을 가르는 것은 `docs/claims/<ID>.lock` 이다 — [4] 가 그 실측이다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'docs/PROGRESS.md';

/* ── 표 읽기 — 자(verifyProgress §2)와 **같은 모양 앵커**를 쓴다 ─────────────
 * 칸을 위치(`cols[3]`)로 세면 본문 안의 `|` 때문에 헛것을 잰다(probe388 머리말 실측: 389 행 중
 * 7칸은 268 행뿐). 그래서 위치가 아니라 모양으로 앵커한다. */
const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;
const DONE_DATED = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;
const NOT_YET = /\|\s*(?:–|—|-|미착수\.?|)\s*\|\s*(?:–|—|-|)\s*\|[^|]*\|\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전)/;
const HEAD_NOT_YET = /^\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전)/;

function tailHead(line) {
  const c = line.split('|');
  let i = c.length - 1;
  while (i > 0 && !c[i].trim()) i--;
  return i > 0 ? HEAD_NOT_YET.exec(c[i]) : null;
}
function rowsOf(text) {
  const m = new Map();
  for (const line of text.split('\n')) {
    const g = ROW.exec(line);
    if (g && !m.has(g[1])) m.set(g[1], line.replace(/\s+$/, ''));
  }
  return m;
}
/* 표가 «안 했다» 로 읽히는가 — 두 축(388 구현 칸 · 445 비고 머리말) 중 하나라도 걸리면 그렇다. */
const readsUnstarted = line => !!(NOT_YET.exec(line) || tailHead(line));

/* ── 자산 실측 ── */
const reviewOf = id => {
  try { return fs.readdirSync(path.join(ROOT, 'docs', 'review')).filter(f => f.startsWith(id + '-') && f.endsWith('.md')); }
  catch (e) { return []; }
};
const gateOf = id => (fs.existsSync(path.join(ROOT, 'tools', 'verify' + id + '.js')) ? 'tools/verify' + id + '.js' : null);
const lockOf = id => {
  const p = path.join(ROOT, 'docs', 'claims', id + '.lock');
  if (!fs.existsSync(p)) return null;
  const m = /^(\S+)\s+(\S+)/.exec(fs.readFileSync(p, 'utf8').trim()) || [];
  const at = m[1] ? Date.parse(m[1]) : NaN;
  return { at: m[1] || '?', sid: m[2] || '?', min: isNaN(at) ? null : Math.round((Date.now() - at) / 60000) };
};
/* review 파일 자신이 «끝났다» 고 적었는가 — 회차 기록과 마감 기록을 가르는 유일한 값싼 축이다. */
const reviewSaysDone = id => reviewOf(id).some(f => DONE_DATED.test(fs.readFileSync(path.join(ROOT, 'docs', 'review', f), 'utf8')));

/* ── 합성 재현 — 완료된 행 하나를 «등재 상태» 로 되돌린 사본을 만든다 ────────
 * 실물 표를 건드리지 않는다(남의 행을 고치는 것은 이 작업의 금지 사항이다 — 등재문 ⚠).
 * 되돌리는 것은 지시서 [1] 이 말하는 **세 칸**뿐이고, 완료 표지는 행에서 통째로 걷는다 —
 * 걷지 않으면 §2 가 잡아 버려서 «§3 이 없으면 못 본다» 를 시험할 수 없다. */
function synth(text, id, opt = {}) {
  const head = opt.head || '**←(등재문) 미착수 · T2 「합성 재현」.** 이 행은 probe557/verify557 의 합성 표본이다.';
  let hit = false;
  const out = text.split('\n').map(line => {
    const g = ROW.exec(line);
    if (!g || g[1] !== id || hit) return line;
    hit = true;
    const c = line.split('|');
    let t = c.length - 1;
    while (t > 0 && !c[t].trim()) t--;
    /* keepBody — 비고 본문(완료문 포함)을 남기고 머리말만 «미착수» 로 바꾼다.
       그 모양은 §2(자기모순)의 자리다 — 두 자가 서로의 자리를 안 넘보는지 시험하는 데 쓴다. */
    c[t] = opt.keepBody ? ' ' + head + ' ' + c[t].trim() + ' ' : ' ' + head + ' ';
    /* 구현·점수·루프 칸은 비고 칸 바로 앞 세 칸이다(위치가 아니라 «비고 기준 상대 자리» 로 잡는다 —
       앞 칸에 `|` 가 있어도 뒤에서 세면 안 밀린다). */
    if (t - 3 > 0) { c[t - 3] = ' – '; c[t - 2] = ' – '; c[t - 1] = ' 0/5 '; }
    return c.join('|');
  }).join('\n');
  if (!hit) throw new Error('합성 실패 — 표에 ' + id + ' 행이 없다');
  return out;
}

/* ── 자 실행 ── */
function runGate(rel, timeoutMs = 180000) {
  try {
    execFileSync('node', [rel], { cwd: ROOT, encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'] });
    return { state: 'pass' };
  } catch (e) {
    const out = String((e.stdout || '') + (e.stderr || ''));
    if (e.killed || e.signal) return { state: 'unrun', why: '시간 초과' };
    if (e.status === 2 || /playwright|Cannot find module|Executable doesn't exist/i.test(out)) return { state: 'unrun', why: '실행 불가(' + (e.status) + ')' };
    return { state: 'fail', why: '종료 코드 ' + e.status };
  }
}

if (require.main === module) main();

function main() {
  const noGate = process.argv.slice(2).includes('--no-gate');
  const text = fs.readFileSync(path.join(ROOT, REL), 'utf8');
  const cur = rowsOf(text);
  let bad = 0;

  console.log('probe557 — 작업 트리 · 표 행 ' + cur.size + '건' + (noGate ? ' · --no-gate' : ''));

  /* [1] 표에서 «미착수» 로 읽히는 행 전수 + 자산 실측 */
  console.log('\n[1] 표가 «미착수» 로 보여 주는 행 — 티어 스캔의 입력이다');
  const unstarted = [];
  for (const [id, line] of cur) {
    if (!readsUnstarted(line)) continue;
    const rv = reviewOf(id), gate = gateOf(id), lk = lockOf(id);
    unstarted.push({ id, rv, gate, lk, done: DONE_DATED.test(line) });
  }
  for (const u of unstarted) {
    console.log('    ' + u.id.padStart(4) + '  review ' + (u.rv.length ? u.rv.length + '건' : '없음') +
                ' · 자 ' + (u.gate || '없음') +
                ' · lock ' + (u.lk ? u.lk.sid + '(' + u.lk.min + '분 전)' : '없음') +
                (u.done ? ' · ⚠ 행에 완료 표지 있음(§2 의 몫)' : ''));
  }
  const assetNoLock = unstarted.filter(u => (u.rv.length || u.gate) && !u.lk && !u.done);
  console.log('    → 자산이 있는데 lock 이 없는 행 ' + assetNoLock.length + '건' +
              (assetNoLock.length ? ': ' + assetNoLock.map(u => u.id).join(' ') + ' (§3 후보)' : ' (지금은 §3 이 볼 자리가 비어 있다)'));

  /* [2] 합성 재현 — 끝난 498 행을 등재 상태로 되돌리면 무엇이 보이나 */
  console.log('\n[2] 합성 재현 — 마감된 498 행을 «등재 상태» 로 되돌린 사본(실물 표는 안 건드린다)');
  const ID = '498';
  const s = synth(text, ID);
  const srow = rowsOf(s).get(ID);
  const okShape = readsUnstarted(srow);
  const okNoMark = !DONE_DATED.test(srow);
  console.log('    ' + (okShape ? 'ok ' : '✗  ') + '[2-a] 사본의 ' + ID + ' 행이 «미착수» 로 읽힌다');
  console.log('    ' + (okNoMark ? 'ok ' : '✗  ') + '[2-b] 사본의 ' + ID + ' 행에 완료 표지가 **0건**이다' +
              ' — §2 는 «완료 표지 ↔ 미착수 머리말» 의 모순만 보므로 이 모양은 **구조적으로** 못 본다');
  const rv = reviewOf(ID), gate = gateOf(ID);
  const okAsset = rv.length > 0 && !!gate;
  console.log('    ' + (okAsset ? 'ok ' : '✗  ') + '[2-c] 그런데 자산은 그대로다 — review ' + rv.join(' ') + ' · 자 ' + gate);
  if (!okShape) bad++;
  if (!okNoMark) bad++;
  if (!okAsset) bad++;

  let unmeasured = null;
  if (noGate) {
    console.log('    –   [2-d] 자 실행 — 안 쟀다(--no-gate)');
    unmeasured = '[2-d] --no-gate';
  } else {
    const t0 = Date.now();
    const r = gate ? runGate(gate) : { state: 'unrun', why: '자 없음' };
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    const ok = r.state === 'pass';
    /* ⚠ «못 돌렸다» 는 «재현 실패» 가 아니다 (2026-09-02, 작업 810).
     * runGate 는 답을 셋으로 가른다 — pass · fail · **unrun**(playwright 없음 = 종료 코드 2,
     * 저장소 공용 규약). 셋째를 실패로 세면 이 재현기는 **환경이 빈 컨테이너에서 무조건 빨갛고**,
     * 그 빨강이 «자 부패» 와 같은 얼굴이라 착수한 세션이 엉뚱한 것을 뜯는다
     * (810 이 그 값 하나로 «§3 회귀 부패» 로 등재됐다 — 뿌리는 `npm i --no-save playwright` 였다).
     * ⇒ unrun 은 «안 쟀다» 로 밝히고 세지 않는다. 다만 **조용히 넘기지도 않는다** —
     *   마지막 줄이 못 잰 축의 이름과 고치는 법을 같이 찍는다. */
    if (r.state === 'unrun') {
      console.log('    –   [2-d] `' + gate + '` 실행 — 안 쟀다(' + r.why + ') · ' + sec + '초');
      console.log('        고치는 법: npm i --no-save playwright && npx playwright install chromium');
      unmeasured = '[2-d] 자 실행 불가(' + r.why + ')';
    } else {
      console.log('    ' + (ok ? 'ok ' : '✗  ') + '[2-d] `' + gate + '` 가 **초록**이다 (' + sec + '초) — ' +
                  (ok ? '끝난 일이라는 값싼 증거' : '판정 ' + r.state + ' · ' + r.why));
      if (!ok) bad++;
    }
  }
  console.log('    ⇒ «표는 미착수 · 자산은 완료» 가 성립한다. 이 어긋남을 보는 자가 §1·§2 에는 없다.');

  /* [3] 음성 대조 — 진짜 미착수 행은 자산이 0건이다 */
  console.log('\n[3] 음성 대조 — 진짜 미착수 행(자가 절대 건드리면 안 되는 자리)');
  const trueNew = unstarted.filter(u => !u.rv.length && !u.gate);
  for (const u of trueNew) console.log('    ok  ' + u.id + ' — review 0건 · 자 없음 ⇒ 자산 축으로는 아무 말도 못 한다(조용해야 옳다)');
  if (!trueNew.length) console.log('    ⚠ 지금 표에 «자산 0건 미착수» 행이 없다 — 음성항이 공허하다(422 가 잡은 모양)');

  /* [4] 진행 중 — lock 이 살아 있는 행도 review 를 갖는다(제외 근거) */
  console.log('\n[4] 진행 중인 행 — 지시서 [1] 이 «회차마다 review 를 커밋하라» 고 하므로 자산이 생긴다');
  const live = unstarted.filter(u => u.lk);
  for (const u of live) console.log('    ' + u.id + ' — lock ' + u.lk.sid + '(' + u.lk.min + '분 전) · review ' + u.rv.length + '건 · 자 ' + (u.gate || '없음') +
                                    ' ⇒ 자산이 있어도 **마감 누락이 아니다**');
  if (!live.length) console.log('    (지금은 lock 이 걸린 미착수 행이 없다)');
  console.log('    ⇒ 진행 중과 마감 누락을 가르는 것은 자산이 아니라 **lock** 이다.');

  /* [5] review 파일이 스스로 «끝났다» 고 적었는가 — 자 없는 작업(게이트 수리)의 유일한 값싼 축 */
  console.log('\n[5] review 파일의 완료 표지 — 자가 없는 작업에서 «끝났다» 를 읽는 자리');
  for (const id of [ID, '548', '546', '554']) {
    if (!reviewOf(id).length) { console.log('    ' + id + ' — review 없음'); continue; }
    console.log('    ' + id + ' — ' + (reviewSaysDone(id) ? '완료 표지 있음' : '완료 표지 없음(회차 기록 꼴)') + ' · ' + reviewOf(id).join(' '));
  }
  console.log('    ⚠ 재현 실측: 마감된 554 의 review 에도 표지가 없다 ⇒ 이 축은 **재현율이 반쪽**이다.');
  console.log('      그래서 자는 이 축으로 «초록» 을 선언하지 않고, 못 본 자리를 요약에 세어 찍어야 한다.');

  console.log('\nPROBE557 ' + (bad ? '✗ ' + bad + '건' : 'OK') + ' — 재현 ' + (bad ? '실패' : '성립')
              + (unmeasured ? '\n⚠ 안 쟀다 — ' + unmeasured + '(빨강이 아니라 «못 쟀다» 다 · 작업 810)' : ''));
  process.exit(bad ? 1 : 0);
}

module.exports = { synth, rowsOf, readsUnstarted, reviewOf, gateOf, lockOf, runGate, DONE_DATED, ROW };
