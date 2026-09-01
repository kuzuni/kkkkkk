#!/usr/bin/env node
/* 756 — «git 이력을 읽는 자» 가 **얕은 클론에서 거짓 빨강을 내지 않게** 하는 공용 부품
 *
 *   const G = require('./gitrev756');
 *   const r = G.ensure('4757c0f');            // 표본을 이 클론에 데려온다(없으면 판다)
 *   if (r.ok)      … git show 로 꺼내 쓴다
 *   else if (r.env) … ⏸ 보류(환경) — **세지 않는다**. r.why 를 그대로 찍는다
 *   else            … 빨강(진짜 없는 객체다)
 *
 * ── 왜 한 벌인가 ────────────────────────────────────────────────────────────
 * 루틴 컨테이너의 클론은 **얕다**(`git rev-parse --is-shallow-repository` = true · 55커밋 ≈ 2시간).
 * 그래서 «수리 전 사본» 을 고정 SHA 로 꺼내는 자는 **그 SHA 가 창 밖이면 죽는다** —
 * 증상이 게이트 부패와 똑같아서 다음 워커가 «내 변경이 깼나» 를 의심하며 회차를 태운다
 * (756 등재 시점 실측: `probe708` 이 그 자리에서 3/4 · 749 착수 세션도 직전까지 그렇게 읽었다).
 *
 * 756 착수 실측 — `tools/` 에서 **런타임에** 고정 SHA 를 꺼내는 자는 5개이고,
 * 그 다섯이 **서로 다른 네 가지 방식**으로 이 문제를 만나고 있었다:
 *   · `verify356` [G-c] → `probe356r23.digPre()` 로 **판다**(631 이 세운 축 — 옳다)
 *   · `probe716`        → 안 파고 **⏸ SKIP**(재현이 가능한 자리인데 보류로 버린다)
 *   · `probe539` §1     → 안 파고 **줄만 찍고 건너뜀**(세지도 않고 이유도 반쪽)
 *   · `probe708` [1]    → **그냥 빨강**(756 등재문이 재현한 그 자리)
 *   · `verifyProgress`  → 창 크기를 ⚠ 로 찍는다(이력 전수를 요구하지 않는 자라 이 부품 밖)
 * ⇒ 사다리를 **여기 한 벌**로 두고 넷이 읽는다(13회차 [R12] «자를 두 벌로 안 적는다»).
 *
 * ── 규약 두 줄(이것이 이 부품의 전부다) ─────────────────────────────────────
 * ① **판는 것이 먼저다.** 얕다고 바로 건너뛰지 마라 — `--shallow-since` → `--deepen` →
 *    `--unshallow` 사다리를 예산 안에서 올라간다(631 26회차 교훈: 깊이 상수는 그날에만 맞는다).
 * ② **못 팠을 때만 갈린다.** 클론이 **얕으면** 환경이므로 ⏸ 보류(세지 않는다) ·
 *    얕지 않은데 없으면 그 객체는 **진짜 없는 것**이므로 빨강이다.
 *    ⚠ ②의 뒷줄이 이 부품의 안전핀이다 — 이게 없으면 «건너뛰기» 가 게이트 부패를 덮는다
 *    (631 26회차 교훈 ④ «표본을 못 가져오면 여전히 빨갛다»).
 */
'use strict';
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const q = (args, cwd) => {
  const r = spawnSync('git', args, { cwd: cwd || ROOT, encoding: 'utf8' });
  return { code: r.status, out: ((r.stdout || '') + '').trim(), err: ((r.stderr || '') + '').trim() };
};

/** 이 클론이 얕은가 */
function isShallow(cwd) {
  return q(['rev-parse', '--is-shallow-repository'], cwd).out === 'true';
}

/** 그 리비전이 이 클론에 있는가 */
function have(rev, cwd) {
  return q(['cat-file', '-e', rev], cwd).code === 0;
}

/** 이력 커밋 수(찍기용) */
function depth(cwd) {
  const r = q(['rev-list', '--count', 'HEAD'], cwd);
  return r.code === 0 ? r.out : '?';
}

/* 사다리 — 날짜가 있으면 날짜부터(표본이 고정이면 안 썩는다 · 631 26회차),
   없으면 배수 깊이, 마지막 칸은 전체다. */
function ladder(since) {
  return [since ? '--shallow-since=' + since : null, '--deepen=160', '--deepen=640', '--unshallow']
    .filter(Boolean);
}

/**
 * 표본을 이 클론에 데려온다.
 * @returns {string|null} '' = 이미 있었다 · '(…)' = 이렇게 팠다(문구 꼬리표) · null = 못 팠다
 */
function dig(rev, opt) {
  const o = opt || {};
  const cwd = o.cwd || ROOT;
  const budgetMs = o.budgetMs === undefined ? 240000 : o.budgetMs;
  if (have(rev, cwd)) return '';
  if (!isShallow(cwd)) return null;      /* 얕지도 않은데 없다 = 파도 안 나온다 */
  const t0 = Date.now();
  const log = [];
  for (const arg of ladder(o.since)) {
    const left = budgetMs - (Date.now() - t0);
    if (left <= 1000) { log.push('(시간 예산 소진)'); break; }
    /* 마지막 칸(`--unshallow`)은 이력을 통째로 받는다 — 남은 예산이 얼마 없으면 시작도 안 한다
       (반쯤 받다 끊기면 그 시간이 통째로 버려진다). */
    if (arg === '--unshallow' && left < 30000) { log.push('--unshallow(예산 부족이라 안 함)'); break; }
    const r = spawnSync('git', ['fetch', arg, 'origin', o.branch || 'main'],
      { cwd, encoding: 'utf8', timeout: left, stdio: 'ignore' });
    log.push(arg + (r.status === 0 ? '' : '✗'));
    if (have(rev, cwd)) {
      return ' (얕은 클론이라 `git fetch ' + log.join(' → ') + '` 로 표본을 파 왔다 · '
        + ((Date.now() - t0) / 1000).toFixed(1) + 's · 이력 ' + depth(cwd) + '커밋)';
    }
  }
  return null;
}

/**
 * 규약 ①②를 한 번에 — 판아 보고, 갈린 결과를 호출부가 그대로 쓸 수 있게 돌려준다.
 * @returns {{ok:boolean, how:string, env:boolean, why:string}}
 *   ok=true  → 쓸 수 있다(how = 어떻게 가져왔는지 꼬리표, 빈 문자열이면 원래 있었다)
 *   ok=false & env=true  → **환경**이다. ⏸ 보류로 찍고 **세지 마라**(빨강 아님)
 *   ok=false & env=false → 그 객체가 **진짜 없다**. 빨강이다
 */
function ensure(rev, opt) {
  const o = opt || {};
  const cwd = o.cwd || ROOT;
  const was = isShallow(cwd);
  const how = dig(rev, o);
  if (how !== null) return { ok: true, how, env: false, why: '' };
  /* 사다리 끝 칸이 `--unshallow` 라, **판고 나서도 얕으면** 판는 일 자체가 막힌 것이다(= 환경).
     반대로 이제 안 얕은데도 없으면 전체 이력에 없는 것이니 **진짜 빨강**이다. */
  const shallow = isShallow(cwd);
  return {
    ok: false,
    how: '',
    env: shallow,
    why: shallow
      ? '얕은 클론이라 ' + rev + ' 를 못 판다(이력 ' + depth(cwd) + '커밋 · 판기 자체가 실패했다) — `git fetch '
        + ladder(o.since)[0] + ' origin ' + (o.branch || 'main') + '` 또는 `git fetch --unshallow` 뒤 다시'
      : rev + ' 가 이 저장소에 없다(' + (was ? '전체 이력까지 받아 봤는데도 없다' : '얕은 클론이 아니다')
        + ' — 지워졌거나 오타다)'
  };
}

/**
 * `git show <rev>:<file>` — ensure 를 지나고 나서만 꺼낸다.
 * @returns {{ok:boolean, buf:Buffer|null, how:string, env:boolean, why:string}}
 */
function show(rev, file, opt) {
  const o = opt || {};
  const cwd = o.cwd || ROOT;
  const e = ensure(rev, o);
  if (!e.ok) return { ok: false, buf: null, how: '', env: e.env, why: e.why };
  try {
    const buf = execFileSync('git', ['show', rev + ':' + file],
      { cwd, maxBuffer: o.maxBuffer === undefined ? (1 << 28) : o.maxBuffer });
    return { ok: true, buf, how: e.how, env: false, why: '' };
  } catch (err) {
    /* 커밋은 있는데 그 파일이 없다 = 진짜 빨강(환경이 아니다) */
    return { ok: false, buf: null, how: e.how, env: false, why: String((err && err.message) || err).split('\n')[0] };
  }
}

/** 보류 줄에 그대로 붙이는 표준 문구 — 자마다 다른 말을 쓰지 않게. */
function skipNote(r) { return '⏸ 보류(환경) — ' + r.why; }

module.exports = { ROOT, isShallow, have, depth, ladder, dig, ensure, show, skipNote };

/* 손으로 물어볼 때: `node tools/gitrev756.js <rev> [file]` */
if (require.main === module) {
  const rev = process.argv[2];
  if (!rev) { console.log('usage: node tools/gitrev756.js <rev> [file]'); process.exit(2); }
  const r = process.argv[3] ? show(rev, process.argv[3]) : ensure(rev);
  console.log(JSON.stringify({ ok: r.ok, env: r.env, how: r.how, why: r.why,
    bytes: r.buf ? r.buf.length : undefined, shallow: isShallow(), depth: depth() }, null, 2));
  process.exit(r.ok ? 0 : (r.env ? 0 : 1));
}
