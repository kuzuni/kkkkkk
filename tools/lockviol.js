/* 선점 lock «덮어쓰기» 이력 판독기 (2026-08-28, 작업 312)
 *
 * `tools/verify290.js` [B] 와 `tools/probe312.js`(음성 검사)가 **같은 코드**를 쓴다.
 * 게이트와 그 게이트의 회귀 시험이 따로 놀면 «넓혀서 통과시킨 게이트» 를 못 잡는다.
 *
 * ── 왜 갈라 냈나 (작업 312) ─────────────────────────────────────────────
 * 예외를 **커밋 해시로** 등재하면 squash·force-push 한 번에 예외가 통째로 죽는다.
 * 실제로 2026-08-28 에 이력이 재작성되면서(`d8ac8c2...` forced update → squash `2d707b1`)
 * 등재 해시 8fcacb6·6e8a949 가 **객체째 사라졌고**, 그것을 가리키던 B2 가 영구히 빨개졌다.
 * → 예외의 열쇠를 «해시» 가 아니라 **«사건 내용»(어느 lock 에서 누가 누구를 덮었나)** 으로 바꾼다.
 *   이력이 재작성돼도 사건 내용이 남아 있는 한 예외는 그대로 맞는다.
 *
 * ⚠ B1(새 위반 0건)의 민감도는 낮추지 않는다 — 290 이 만들어진 이유가 그것이다.
 *   지문에 **양쪽 SID 를 모두** 넣으므로, 세션마다 새로 나는 SID 를 낀 새 위반은 절대 예외에 안 걸린다.
 *   그리고 **아무것도 안 맞는 예외는 아무것도 안 봐준다** — 죽은 예외가 새 위반을 가릴 길이 구조적으로 없다.
 */
const { execFileSync } = require('child_process');

/* 등재 예외 — «고칠 수 없는 과거» 만 넣는다. 새 위반을 여기 넣지 마라.
   fp(지문) = lock 파일 + 덮인 SID + 덮은 SID. at/wasAt 은 기록용(판정에 안 쓴다).
   commit 은 «원래 어디였나» 의 기록이자 B2 가 «소멸» 과 «부패» 를 가르는 근거다. */
const KNOWN = [
  {
    lock: 'docs/claims/289.lock',
    from: 'sess-0238-29441',
    to: 'sess-0239-24664',
    wasAt: '2026-08-28T02:39:36Z',
    at: '2026-08-28T02:41:08Z',
    commit: '8fcacb68824d932b6132a21652f34940d890f209',
    why: '2026-08-28 02:41 · 289 선점 경쟁에서 92초 된 남의 lock 을 덮었다(= 290 등재 사유). '
       + '덮은 쪽도 덮인 쪽도 289 를 통째로 완주했다 — 한 세션이 통으로 낭비됐다.',
  },
  {
    lock: 'docs/claims/122.lock',
    from: 'sess-0146-30228',
    to: 'sess-0200-26517',
    wasAt: '2026-08-28T02:00:00Z',   /* 실측 «3분 전» — 초 단위는 이력 재작성으로 소실 */
    at: '2026-08-28T02:03:00Z',
    commit: '6e8a94993687724dfbdd61ad7abee4b827a5208a',
    why: '2026-08-28 02:03 · 122 선점에서 3분 된 남의 lock 을 덮었다. 덮은 쪽이 14초 뒤 스스로 '
       + 'revert(d6c6da4) 해 복구했다 — 같은 결함이 40분 안에 두 번 났다는 증거라 예외로 남긴다.',
  },
];

const fp = v => v.lock + '|' + v.from + '|' + v.to;

/* origin/main 의 lock 커밋을 훑어 «덮어쓰기» 지문을 모은다.
   지문: 한 커밋이 같은 lock 파일에서 -<시각A> <SID_A> / +<시각B> <SID_B> 를 동시에 내고
   (SID_A != SID_B) 두 시각 차가 0~90분인 것. 90분 넘으면 정당한 회수, 음수면 되돌리기다. */
function scan(root, opt) {
  opt = opt || {};
  const ref = opt.ref || 'origin/main';
  const limit = opt.limit || 400;
  const git = a => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
  const log = git(['log', '--format=%H', '-n', String(limit), ref, '--', 'docs/claims/'])
    .trim().split('\n').filter(Boolean);

  const violations = [];
  for (const h of log) {
    let d = '';
    try { d = git(['show', '--format=', '--unified=0', h, '--', 'docs/claims/']); } catch (e) { continue; }
    let cur = null;
    const files = {};
    for (const ln of d.split('\n')) {
      const f = ln.match(/^\+\+\+ b\/(docs\/claims\/\S+)/);
      if (f) { cur = f[1]; files[cur] = files[cur] || { minus: [], plus: [] }; continue; }
      /* 파일 헤더는 내용이 아니다 — `--- a/…` · `--- /dev/null` 을 «-줄» 로 읽으면
         파일 «생성» 이 덮어쓰기 모양으로 보인다(작업 312에서 실측: 6건). 지금은 시각이
         NaN 이라 뒤에서 걸러지지만, 걸러 주는 것이 우연이면 언젠가 통과한다. */
      if (/^(--- |\+\+\+ )/.test(ln)) continue;
      if (!cur) continue;
      const m = ln.match(/^-(\S+)\s+(\S+)/); if (m) files[cur].minus.push(m);
      const p = ln.match(/^\+(\S+)\s+(\S+)/); if (p) files[cur].plus.push(p);
    }
    for (const [f, v] of Object.entries(files)) {
      if (!v.minus.length || !v.plus.length) continue;          /* 생성·삭제는 덮어쓰기가 아니다 */
      const [, aAt, aSid] = v.minus[0], [, bAt, bSid] = v.plus[0];
      if (aSid === bSid) continue;                              /* 자기 heartbeat */
      const gap = (Date.parse(bAt) - Date.parse(aAt)) / 60000;
      if (!Number.isFinite(gap) || gap > 90) continue;          /* 90분 넘으면 정당한 회수 */
      /* 새 시각이 «더 이르면» 선점이 아니라 되돌리기다 — 아무도 과거 시각으로 lock 을 잡지 않는다.
         (남의 lock 을 덮은 워커가 스스로 revert 해 복구한 커밋이 여기 걸린다. d6c6da4) */
      if (gap < 0) continue;
      violations.push({ h, lock: f, from: aSid, to: bSid, wasAt: aAt, at: bAt, gap: Math.round(gap) });
    }
  }
  return { violations, scanned: log.length, saturated: log.length >= limit };
}

/* 등재 예외 하나하나가 지금 이력에서 어떤 상태인지 가른다.
     matched — 지문이 이력에 있다(건강).
     erased  — 지문도 없고 등재 커밋도 origin/main 에서 닿지 않는다
               → 이력 재작성으로 사건 자체가 지워졌다. 빨간불 사유가 아니다
                 (사건 기록은 docs/review/290-*.md 에 남아 있고, 안 맞는 예외는 아무것도 안 봐준다).
     rotten  — 지문은 없는데 등재 커밋은 **아직 닿는다**
               → 커밋이 살아 있는데 스캔이 못 봤다 = 파서·창(-n) 이 썩었다. 이건 빨간불이다. */
function classify(root, known, violations, opt) {
  const ref = (opt || {}).ref || 'origin/main';
  const seen = new Set(violations.map(fp));
  const reachable = h => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', h, ref], { cwd: root, stdio: 'ignore' });
      return true;
    } catch (e) { return false; }
  };
  return known.map(k => ({
    k,
    state: seen.has(fp(k)) ? 'matched' : (reachable(k.commit) ? 'rotten' : 'erased'),
  }));
}

module.exports = { KNOWN, fp, scan, classify };
