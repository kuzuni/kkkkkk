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

/* ⚑ 939 — 종료 코드 사전(파이썬 쪽 짝은 `tools/pydep937.py` 의 EX_* 다).
 *   0 통과 · 1 오류/FAIL · **2 환경에 없음**(부트스트랩만) · **3 자가 못 쟀다**(측정 실패·사용법).
 *   코드 3 도 여기서 «한 줄 + 코드 3» 으로 옮긴다 — 안 옮기면 그 자를 부른 게이트가
 *   잡히지 않은 예외(스택 트레이스 + 코드 1 + 점수 줄 0)로 죽어 **다시 «없는 자»** 가 된다. */
const EX_ENV = 2;
const EX_SELF = 3;

/* 자식의 코드 2·3 을 같은 코드로 옮긴다. 그 밖의 실패는 원래대로 던진다. */
function py(args, opts) {
  try {
    return execFileSync('python3', args, opts);
  } catch (e) {
    const st = e && e.status;
    if (st === EX_ENV || st === EX_SELF) {
      /* ⚠ `execFileSync` 는 stdio 를 안 적으면 자식 stderr 를 **부모 stderr 로 흘리면서 동시에
         `e.stderr` 에 담는다**(실측). 그래서 «읽을 수 있는가» 와 «이미 화면에 나왔는가» 는 다른 물음이고,
         둘을 한 깃발로 묶으면 같은 줄이 두 번 나온다(옛 [R5] 가 그 자리를 지킨다). */
      const shown = !opts || opts.stdio === undefined;     // 자식 stderr 가 이미 부모 stderr 로 흘렀는가
      const errTxt = String(e.stderr || '');
      const s = errTxt + String(e.stdout || '');
      const readable = e.stderr != null || e.stdout != null;   // 자식의 말을 손에 쥐었는가
      const line = s.split('\n').map((l) => l.trim()).find((l) => HINT_RE.test(l));
      /* 옮겨 적을 한 줄이 **이미 화면에 나온 그 줄**이면 다시 찍지 않는다(중복 금지 · [R5]).
         자식이 stdout 에 적었으면 흘러가지 않았으므로 여기서 찍어야 한다. */
      const say = (msg) => { if (!(shown && msg && msg === lastLine(errTxt))) console.error(msg); };
      if (st === EX_ENV) {
        /* ⚑ 939 — 코드 2 인데 **환경 말투가 아닌** 자식은 «환경에 없음» 이 아니다.
           그때 상시 준비 줄(HINT)을 답으로 주면 워커는 «적힌 대로 해도 안 낫는» 자리에 선다(938-③).
           읽을 수 있는데 그 줄이 없으면 자식의 말을 그대로 옮기고 **자기 실패(3)** 로 내린다.
           ⚠ 읽을 수 없으면(순수 inherit) 판정을 못 하므로 옛 규약대로 2 를 그대로 옮긴다 —
           그 자리를 지키는 것은 이 부품이 아니라 «자가 코드 2 를 자기 실패로 안 쓴다» 는 census 다. */
        if (readable && !line) {
          say(lastLine(s) || ('자가 코드 2 로 죽었는데 «환경에 없음» 이 아니다 — ' + args.join(' ')));
          process.exit(EX_SELF);
        }
        if (!shown) console.error(line || HINT);
        process.exit(EX_ENV);
      }
      /* 코드 3 — 자가 못 쟀다. 스택 트레이스 대신 자식이 적은 «무엇이 안 됐는지» 한 줄만 옮긴다. */
      say(lastLine(s) || ('자가 못 쟀다(코드 3) — ' + args.join(' ')));
      process.exit(EX_SELF);
    }
    throw e;
  }
}

function lastLine(s) {
  return s.split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
}

/* 죽이지 않고 묻기만 한다 — 폴백을 가진 자와 `verify937` 이 쓴다. */
function available(name) {
  const boot = path.join(__dirname, 'pydep937.py');
  const code = 'import sys;sys.path.insert(0,' + JSON.stringify(path.dirname(boot)) + ');' +
               /* ⚑ 939 — 옛 판은 «없음» 을 3 으로 냈다. 3 은 이제 «자가 못 쟀다» 라 여기 쓰면
                  사전이 다시 둘을 가리킨다(이 프로브는 status===0 만 보므로 1 로 충분하다). */
               'import pydep937;raise SystemExit(0 if pydep937.available(' + JSON.stringify(name) + ') else 1)';
  try {
    execFileSync('python3', ['-c', code], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { py, available, HINT, HINT_RE, PIP, EX_ENV, EX_SELF };
