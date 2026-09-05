/* 작업 913 — pngjs 공용 부트스트랩 (110 `pwlaunch.pw()` 의 짝)
 *
 * 왜 있는가 — `tools/verify878.js` 가 **1초 만에 즉사**했다(`Cannot find module 'pngjs'`).
 * 자 자신은 멀쩡했다(의존을 심으니 그 자리에서 **8/8 PASS**). 문제는 «못 도는 것» 이 아니라
 * **«못 도는 줄 아무도 모르는 것»** 이다:
 *
 *   - 날 `require('pngjs')` 는 잡히지 않은 예외로 죽어 **종료 코드 1**(= claim.js 규약의 «오류»)에
 *     스택 트레이스만 남긴다. 점수 줄(`VERIFY878 n/n`)이 **한 줄도 안 나오므로**
 *     `verifyProgress`·회귀 스윕은 이 자를 «빨강» 이 아니라 **«없는 자»** 로 지나간다(등재 913).
 *   - playwright 쪽은 이미 그 길을 닫아 뒀다 — 110 의 `pw()` 가 «playwright 없음 — …» 한 줄과
 *     **종료 코드 2**(= «환경에 없음», «오류» 와 구분되는 신호)로 답한다.
 *
 * ⇒ pngjs 도 **같은 말투로** 답하게 한다. 이 파일이 하는 일은 그것뿐이고,
 *    어떤 자의 점수·판정도 건드리지 않는다(등재 913 의 «878 의 점수·판정은 건드리지 마라»).
 *
 * 쓰는 법 (한 줄 치환):
 *   const PNG = require('./png913').PNG();          // 옛 `require('pngjs').PNG`
 *   const { PNG } = require('pngjs');  →  const PNG = require('./png913').PNG();
 *
 * ⚠ **폴백이 있는 자는 이것을 쓰지 마라.** `tools/verify747.js`(python3 PIL 로 내려감) ·
 *    `tools/verify54.js`(크로미움 canvas 로 디코드 — npm 의존성 0)는 pngjs 가 없어도 **끝까지 돈다.**
 *    여기서 `exit(2)` 를 부르면 그 폴백을 오히려 죽인다. 있는 그대로 두는 것이 맞다.
 *
 * ⚑ **왜 «의존을 심는다»(ⓐ) 이고 «의존을 없앤다»(ⓑ) 가 아닌가** — 등재문은 ⓑ 를 1순위로 적으며
 *    «pngjs 를 부르는 자가 몇인지부터 세면 답이 나온다» 고 했다. 세어 보니 **17개**다
 *    (`grep -rl pngjs tools/`). 답은 나왔지만 등재문이 기대한 방향과 **반대**다 —
 *    한 자를 canvas 로 갈아 끼우면 나머지 16이 그대로 즉사한다. ⓐ 는 17을 한 번에 살리고
 *    **자의 측정 로직은 한 줄도 안 건드린다.** 되돌리려면 이 파일을 지우고 각 자의 한 줄을
 *    `require('pngjs')` 로 되돌리면 된다(제품 `index.html` 은 애초에 0줄이다).
 *
 * ⚠⚠ **`npm i --no-save` 를 따로 두 번 부르면 앞의 것이 지워진다.**
 *    `npm i --no-save pngjs` 한 줄이 방금 깐 playwright 를 «removed 2 packages» 로 날린다
 *    (이 저장소는 `package.json` 이 없어 `node_modules` 가 매번 통째로 다시 그려진다).
 *    이미 LESSONS 에 **세 번**(⑤·⑥ 외) 적힌 사실인데 지시서 [6] «준비» 절은 playwright 만
 *    적고 있었다 — 그래서 이 교훈이 계속 다시 배워졌다. 913 이 그 줄을 고쳤다:
 *      npm i --no-save playwright pngjs
 *    항상 **한 번에** 부를 것. 약속을 이름으로 지키는 자는 `tools/verify913.js` 다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const HINT = 'pngjs 없음 — npm i --no-save playwright pngjs';

/* 해석 순서는 110 `pw()` 와 같다: node_modules → npx 캐시.
   `npm i --no-save` 가 지운 직후에도 npx 캐시에 남아 있는 경우가 있어 한 단 더 본다. */
function resolve() {
  try { return require('pngjs'); } catch (_) {}
  const roots = [
    path.join(os.homedir(), '.npm', '_npx'),
    path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx'),
  ].filter(Boolean);
  for (const root of roots) {
    let dirs = [];
    try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) {
      const p = path.join(root, d, 'node_modules', 'pngjs');
      if (fs.existsSync(p)) { try { return require(p); } catch (_) {} }
    }
  }
  return null;
}

/* 모듈째 — 없으면 «환경에 없음»(코드 2)으로 끝낸다. 스택 트레이스가 아니라 할 일을 적는다. */
function mod() {
  const m = resolve();
  if (m) return m;
  console.error(HINT);
  process.exit(2);
}

/* 자들이 실제로 쓰는 것은 `.PNG` 하나다(`PNG.sync.read`). */
function PNG() { return mod().PNG; }

/* 죽이지 않고 묻기만 한다 — 폴백을 가진 자(747·54)와 `verify913` 이 쓴다. */
function available() { return !!resolve(); }

module.exports = { PNG, mod, available, resolve, HINT };
