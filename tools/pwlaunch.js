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
/* 작업 918 — 같은 자리에 «껍데기가 측정 창을 덮는다» 걷개도 건다.
   914 가 `verify463` 에서 뿌리를 찍었다: 게임 루프를 세우지 않는 자는 자동 전투가 진 순간
   `#defw`(inset:0 · z39)에 측정 창을 통째로 덮여 «4회 중 1회 빨강» 이 된다. 907 판별기(①∧②)를
   갖춘 자 34 중 걷개를 손으로 건 자는 3 뿐이었다 — 31곳에 흩어 적으면 빠진 자리를 아무도 안 센다.
   제품 경로(`openDefeat`)는 그대로 불리고 껍데기만 칠해지기 전에 걷는다(판정 0글자).
   되돌림 스위치: `PW_SHELL918=0`(끔) · `report`(세기만). 근거는 `tools/shell918.js` 머리말. */
const shell918 = require('./shell918');
/* 작업 974 — 같은 자리에 «낡은 rect 읽기» 감사자도 건다(**기본 꺼짐** — `PW_GEO974` 로 켠다).
   화소를 재는 자가 창(`getBoundingClientRect`)을 **스크린샷보다 먼저** 읽으면, 그 사이에 DOM 이
   바뀌는 호스트(팝 `fxCvSwapS` 55% `scale(1.18)` 이 `renderUI()` 재렌더로 풀린다)에서 창이 찍힌
   화소를 안 가리킨다 — 814 13회차가 같은 프레임을 3.19:1 ↔ 5.08:1 로 읽었다. 이 감사자는
   찍기 직전에 «건네준 rect 를 다시 재서» 다른 것을 센다. 근거는 `tools/geo974.js` 머리말. */
const geo974 = require('./geo974');

const arm = b => geo974.armBrowser(shell918.armBrowser(evguard.armBrowser(armBrowser(b))));

/* 작업 907 — «판 결정성» 깃발을 한곳에서 판다.
   903 이 `verify432` 에서 뿌리를 찍었다: 한 페이지에서 스타일 태그를 갈아 끼우며 여러 판을 찍는 자는
   Chromium 의 **부분 리라스터(타일 재사용)** 에 노출돼 같은 화면이 «±1~19 단위 두 얼굴» 을 갖는다
   (`verify432` 는 그 탓에 무보정 20회 중 9회 빨갰다). 처방은 깃발 `--disable-partial-raster` 한 줄이다.

   ⚑ **왜 자마다 적지 않고 여기인가** — 903 이 처방을 `verify432` 안에 손으로 적으면서 스스로 적어 둔
   위험이 «다음에 깃발이 빠져도 조용히 흔들린다» 였다. 조건 셋(① 태그 교체 ② 화소 차분 ③ 몇 단위 문턱)을
   갖춘 게이트는 907 착수 시점에 **16개**이고 앞으로도 는다 — 16곳에 흩어 적으면 **빠진 자리를 아무도 안 센다.**
   ⇒ 291 정착 장치·731 소실 차단기와 **같은 자리**로 옮긴다.

   ⚠ **다만 «entry 가 verify 면 전부» 는 아니다.** 291·731 은 무엇을 하든 안전한 장치지만 이건 **라스터
   경로를 바꾼다** — 게이트 200여 개의 값이 부분 리라스터 아래에서 굳었을 가능성을 907 한 세션이 전수로
   반증할 수는 없다(1회씩만 돌려도 한 시간이 넘는다). ⇒ 켜는 대상을 **조건을 실제로 갖춘 자**로 좁힌다:
   `raster907.qualifies(entry)` 가 entry 파일 자신을 읽어 ①∧② 를 본다. 조건을 갖춘 게이트가 새로 생기면
   **자동으로 켜지고**(아무도 못 잊는다), 조건 밖 게이트의 세상은 **한 칸도 안 바뀐다**(907 이 실측으로
   확인한 16개 = 정확히 켜지는 집합). 캡처 하네스(`cap*.js`)는 조건을 갖춰도 안 켠다 — 연출을 한복판에서
   80~100ms 간격으로 찍는 자들이라 라스터 경로를 바꿀 이유가 없다(291 이 같은 이유로 같은 선을 그었다).

   손잡이 셋:
   - `det(opts)`   — entry 와 무관하게 깃발을 «중복 없이» 붙인다(게이트가 아닌 자가 결정성을 원할 때).
   - `PW_NOPR=1`   — entry 조건을 무시하고 켠다(A/B 세기용 · `tools/probe907.js` 가 쓴다).
   - `PW_NOPR=0`   — 자가 `det()` 로 박아 둔 깃발까지 **끈다**(되돌림 시험 — `verify907` [R] 이 이걸로
                     «깃발이 빠진 세상» 을 재현해 [2] 가 헛초록이 아님을 못박는다).
   약속을 이름으로 지키는 자는 `tools/verify907.js` 다. */
const DET_ARGS = ['--disable-partial-raster'];

function det(opts) {
  const o = Object.assign({}, opts || {});
  o.args = (o.args || []).slice();
  for (const a of DET_ARGS) if (!o.args.includes(a)) o.args.push(a);
  return o;
}

/* 깃발을 켤 것인가 — 환경변수가 entry 규칙을 이긴다(양방향). */
const raster907 = require('./raster907');

function detEnabled(ctx) {
  const env = (ctx && ctx.env) || process.env;
  const v = env.PW_NOPR;
  if (v === '0' || v === 'off') return false;
  if (v === '1' || v === 'on') return true;
  const full = String((ctx && ctx.entry) !== undefined ? ctx.entry : (process.argv[1] || ''));
  const base = full.replace(/\\/g, '/').split('/').pop();
  if (!/^verify.*\.js$/.test(base)) return false;   /* 게이트만 — cap*·probe* 는 `det()` 로 골라 쓴다 */
  return raster907.qualifies(full.includes('/') || full.includes('\\')
    ? full : require('path').join(__dirname, base));
}

/* 순수 함수 — `verify907` [1] 이 브라우저 없이 이 규칙을 묻는다. */
function resolveArgs(opts, ctx) {
  const o = Object.assign({}, opts || {});
  o.args = (o.args || []).slice();
  if (detEnabled(ctx)) { for (const a of DET_ARGS) if (!o.args.includes(a)) o.args.push(a); }
  else o.args = o.args.filter(a => !DET_ARGS.includes(a));
  return o;
}

async function launch(chromium, opts) {
  const o = resolveArgs(opts);
  try { return arm(await chromium.launch(o)); } catch (e) {
    const exe = findExecutable();
    if (!exe) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + exe + ' 사용');
    return arm(await chromium.launch(Object.assign({}, o, { executablePath: exe })));
  }
}

module.exports = { pw, launch, findExecutable, det, resolveArgs, detEnabled, DET_ARGS };
