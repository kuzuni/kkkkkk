/* 작업 937 — 파이썬 자를 부르는 **노드 쪽** 짝 (`tools/pydep937.py` 의 반대편)
 *
 * 왜 파이썬 파일만 고쳐서는 안 되는가 — 등재된 해악은 «자가 못 돈다» 가 아니라
 * **«못 도는 줄 아무도 모른다»** 다. 파이썬 자가 «numpy 없음 …» 한 줄 + 코드 2 로 곱게 죽어도,
 * 그 자를 `execFileSync('python3', …)` 로 부른 **노드 게이트**는 여전히
 * 잡히지 않은 예외로 죽는다 — **스택 트레이스 + 종료 코드 1 + 점수 줄 0** 이다.
 * 그러면 스윕은 그 게이트를 그대로 «없는 자» 로 지나간다(= 고친 게 없다).
 *
 * ⇒ 이 부품은 **한 가지만** 한다: 자식이 코드 **2**(«환경에 없음»)로 죽으면
 *    그 한 줄을 그대로 옮겨 적고 **나도 코드 2 로** 끝낸다. 코드 2 가 아닌 실패는
 *    **손대지 않고 그대로 던진다** — 진짜 오류를 «환경 탓» 으로 삼키면 913 의 반대 사고가 난다.
 *
 * 쓰는 법 (한 줄 치환):
 *   const { execFileSync } = require('child_process');
 *   execFileSync('python3', args, opts)   →   require('./pydep937').py(args, opts)
 *
 * 어떤 자의 점수·판정도 건드리지 않는다(913 의 «878 의 점수는 913 의 몫이 아니다» 그대로).
 * 약속을 이름으로 지키는 자는 `tools/verify937.js` 다.
 */
const path = require('path');
const { execFileSync } = require('child_process');

const PIP = 'pip3 install pillow numpy';
const HINT = '파이썬 의존 없음 — ' + PIP;
/* 파이썬 쪽이 내는 말투 — «<모듈> 없음 — pip3 install …» */
const HINT_RE = /없음 — pip3 install/;

/* 자식의 코드 2 를 내 코드 2 로 옮긴다. 그 밖의 실패는 원래대로 던진다. */
function py(args, opts) {
  try {
    return execFileSync('python3', args, opts);
  } catch (e) {
    if (e && e.status === 2) {
      /* ⚠ `execFileSync` 는 stdio 를 안 적으면 **자식 stderr 를 부모 stderr 로 그대로 흘린다** —
         그 자리에서 다시 찍으면 같은 줄이 두 번 나온다. 안 흘렀을 때만(호출부가 stdio 를 적었을 때) 옮긴다. */
      const passedThrough = !opts || opts.stdio === undefined;
      if (!passedThrough) {
        const s = String((e.stderr || '') + (e.stdout || ''));
        const line = s.split('\n').map((l) => l.trim()).find((l) => HINT_RE.test(l));
        console.error(line || HINT);
      }
      process.exit(2);
    }
    throw e;
  }
}

/* 죽이지 않고 묻기만 한다 — 폴백을 가진 자와 `verify937` 이 쓴다. */
function available(name) {
  const boot = path.join(__dirname, 'pydep937.py');
  const code = 'import sys;sys.path.insert(0,' + JSON.stringify(path.dirname(boot)) + ');' +
               'import pydep937;raise SystemExit(0 if pydep937.available(' + JSON.stringify(name) + ') else 3)';
  try {
    execFileSync('python3', ['-c', code], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { py, available, HINT, HINT_RE, PIP };
