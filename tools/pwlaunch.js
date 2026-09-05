/* 작업 110 — 헤드리스 게이트 공용 부트스트랩
 *
 * 두 가지를 한곳에 모은다. 게이트마다 복붙된 두 블록이 서로 어긋나면서
 * «어떤 환경에서는 도는데 어떤 환경에서는 즉사» 하는 상태가 됐다.
 *
 *   1. pw()          — playwright 모듈 해석 (`node_modules` → npx 캐시 순)
 *   2. launch(chromium, opts) — 번들 브라우저가 없으면 시스템에 깔린 것으로 폴백
 *
 * 폴백이 필요한 이유: `npm i --no-save playwright` 는 «드라이버» 만 넣고 브라우저 바이너리는
 * `npx playwright install` 을 따로 돌려야 받는다. CI·클라우드 컨테이너에는 보통 미리 깔린
 * 크로미움이 `PLAYWRIGHT_BROWSERS_PATH`(예: /opt/pw-browsers) 에 있는데, 드라이버가 기대하는
 * **빌드 번호가 다르면** 그대로는 못 찾는다 —
 *   `Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1234/...`
 * 실제로 이 저장소의 게이트가 그 이유로 전부 못 돌았다(작업 110 ①).
 *
 * 쓰는 법 (기존 게이트 2줄 치환):
 *   const { pw, launch } = require('./pwlaunch');
 *   const { chromium } = pw();
 *   ...
 *   const browser = await launch(chromium);              // = chromium.launch()
 *   const browser = await launch(chromium, { args:[…] }); // 옵션도 그대로
 *
 * 환경변수 `PW_CHROMIUM` 으로 실행 파일을 직접 지정할 수 있다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

/* ---- 1. playwright 모듈 해석 ---- */
function pw() {
  try { return require('playwright'); } catch (_) {}
  const roots = [
    path.join(os.homedir(), '.npm', '_npx'),
    path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx'),
  ].filter(Boolean);
  for (const root of roots) {
    let dirs = [];
    try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) {
      const p = path.join(root, d, 'node_modules', 'playwright');
      if (fs.existsSync(p)) return require(p);
    }
  }
  console.error('playwright 없음 — npm i --no-save playwright');
  process.exit(2);
}

/* ---- 2. 실행 파일 후보 ----
   PW_CHROMIUM → PLAYWRIGHT_BROWSERS_PATH 아래 chromium* → 관례적 시스템 경로 순.
   `/opt/pw-browsers/chromium` 처럼 심볼릭 링크인 경우도 있어 존재 검사만 한다. */
function candidates() {
  const out = [];
  if (process.env.PW_CHROMIUM) out.push(process.env.PW_CHROMIUM);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  out.push(path.join(root, 'chromium'));
  let dirs = [];
  try { dirs = fs.readdirSync(root); } catch (_) {}
  /* chromium-1194 처럼 빌드 번호가 붙은 디렉터리 — 번호가 큰 쪽(최신)부터 본다.
     headless_shell 은 화면 캡처 품질이 다르므로 full chromium 을 먼저 고른다. */
  const num = d => (String(d).match(/(\d+)$/) || [0, 0])[1] | 0;
  const pick = re => dirs.filter(d => re.test(d)).sort((a, b) => num(b) - num(a));
  for (const d of pick(/^chromium-\d+$/)) out.push(path.join(root, d, 'chrome-linux', 'chrome'));
  for (const d of pick(/^chromium_headless_shell-\d+$/)) {
    out.push(path.join(root, d, 'chrome-linux', 'chrome-headless-shell'));
  }
  out.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  return out;
}

function findExecutable() {
  for (const p of candidates()) {
    try { if (p && fs.existsSync(p)) return p; } catch (_) {}
  }
  return null;
}

/* ---- 3. launch — 번들 우선, 실패하면 폴백 ----
   작업 291 — 돌려주기 전에 **입장 연출 정착 장치**를 심는다(`settle291.armBrowser`).
   여기 한 곳이라 게이트 44개를 한 줄도 안 고치고 «고정 대기 뒤 rect» 함정이 닫힌다.
   기본값은 entry 가 `verify*.js` 일 때만 — 연출 캡처 하네스(`cap*.js`)는 그대로 둔다.
   되돌림 스위치: `PW_SETTLE=0`. 자세한 근거는 `tools/settle291.js` 머리말. */
const { armBrowser } = require('./settle291');
/* 작업 731 — 같은 자리에 «조용한 소실» 차단기도 건다.
   `page.evaluate` 가 페이지 안에서 죽으면(제품 전역 폐지 = `ReferenceError`) 자마다 복붙된
   `ev()` 가 그것을 삼켜 그 절이 통째로 건너뛰어도 **종료 코드 0** 으로 끝나던 길을 닫는다.
   예외는 그대로 다시 던지므로 자의 흐름은 한 줄도 안 바뀐다 — 바뀌는 것은 «마감» 뿐이다.
   되돌림 스위치: `EVGUARD=0`(끔) · `EVGUARD=report`(적기만). 근거는 `tools/evguard731.js` 머리말. */
const evguard = require('./evguard731');

const arm = b => evguard.armBrowser(armBrowser(b));

/* 작업 907 — «판 결정성» 깃발을 한곳에서 판다.
   903 이 `verify432` 에서 뿌리를 찍었다: 한 페이지에서 스타일 태그를 갈아 끼우며 여러 판을 찍는 자는
   **부분 리라스터(타일 재사용)** 에 노출돼 같은 화면이 «±1~19 단위 두 얼굴» 을 갖는다. 처방은 깃발
   `--disable-partial-raster` 한 줄인데, 그것을 자마다 손으로 적으면 **빠져도 아무도 모른다**(903 §5).
   ⇒ 상수 하나(`DET_ARGS`)로 이름을 주고, 자는 `launch(chromium, det({ … }))` 로 부른다.
   - `det(opts)` — 기존 opts 의 args 뒤에 깃발을 «중복 없이» 붙여 돌려준다(opts 없으면 새로 만든다).
   - `PW_NOPR=1` — 이 자를 안 고치고도 깃발을 켠다(A/B 세기용 · `tools/probe907.js` 가 쓴다).
   - `PW_NOPR=0` — 자가 `det()` 로 박아 둔 깃발까지 **끈다**(되돌림 시험 · 깃발이 빠진 세상 재현).
   되돌림 스위치가 양방향인 이유는 «깃발이 실제로 축을 죽이는가» 를 같은 자로 두 번 물어야 하기 때문이다. */
const DET_ARGS = ['--disable-partial-raster'];

function det(opts) {
  const o = Object.assign({}, opts || {});
  o.args = (o.args || []).slice();
  for (const a of DET_ARGS) if (!o.args.includes(a)) o.args.push(a);
  return o;
}

/* 환경변수는 마지막에 적용된다 — 자가 무엇을 적었든 A/B 는 환경이 이긴다. */
function envArgs(opts) {
  const v = process.env.PW_NOPR;
  if (v === undefined || v === '') return opts;
  const o = Object.assign({}, opts || {});
  o.args = (o.args || []).slice();
  if (v === '0') o.args = o.args.filter(a => !DET_ARGS.includes(a));
  else for (const a of DET_ARGS) if (!o.args.includes(a)) o.args.push(a);
  return o;
}

async function launch(chromium, opts) {
  const o = envArgs(opts);
  try { return arm(await chromium.launch(o)); } catch (e) {
    const exe = findExecutable();
    if (!exe) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + exe + ' 사용');
    return arm(await chromium.launch(Object.assign({}, o, { executablePath: exe })));
  }
}

module.exports = { pw, launch, findExecutable, det, DET_ARGS };
