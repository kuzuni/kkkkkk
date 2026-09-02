#!/usr/bin/env node
/* 게이트 — 작업 509 「레드닷 «부품 모양» 통일」
 *
 *   node tools/verify509.js        → "VERIFY509 n/n PASS"
 *
 * 무엇을 지키나 — 471 은 닷의 **자리**를 닫았고 509 는 **모양**을 닫는다.
 *   [A] 그려진 모양 — 자리마다 코어 반지름 13.5 · 분홍 림 바깥 15.5 · 분홍 두께 ≥ 1.5
 *       (`probe509` 가 «찍힌 화소» 로 잰다. 선언이 아니라 그림을 묻는 항이다.)
 *   [B] 그려진 외곽 — 링 포함 Ø42 (03 §3-6 «검정 포함 41~43»). box-shadow 링이 사라지면 빨강.
 *   [C] 자리 Δ0 — 모양을 갈면서 중심이 움직이지 않았다(코너 안쪽 = 471 규약값/예외값).
 *   [D] 선언 위생 — 부품 모양은 **한 곳**(`--dot-paint`)에서 온다. 같은 값을 손으로 다시
 *       적은 자리가 0 이고, 갈아 낸 옛 꼴(`border:5px solid #000` 로 검정 링을 두르는 배지)이
 *       세 자리에 되살아나지 않았다.
 *   [R] 되돌림 시험 — 수리 전 선언(코어를 통째로 칠하고 분홍 림이 없는 `.tab .bdg`)을 되돌린
 *       **사본**을 만들어 같은 자로 재면 [A]·[B] 가 실제로 빨개진다.
 *       (334 교훈 — 무르게 푼 수리가 아님은 되돌림이 못박는다.)
 *
 * ⚠ 사본은 **저장소 루트**에 둔다(439·471 선례) — /tmp 에 두면 assets/** 가 404 다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const T = [];
const ok = (pass, name, got) => T.push({ pass: !!pass, name, got: got === undefined ? '' : String(got) });
const near = (got, want, tol) => Math.abs(got - want) <= tol;

const probe = file => {
  const env = { ...process.env };
  if (file) env.P509_FILE = file;
  const out = execFileSync(process.execPath, [path.join(__dirname, 'probe509.js'), '--json'],
    { env, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
  /* `pwlaunch` 가 «번들 브라우저 없음» 한 줄을 stdout 으로 먼저 뱉는다 — JSON 은 `[\n` 부터다 */
  return JSON.parse(out.slice(out.indexOf('[\n')));
};

/* 471 이 정한 자리(코너 안쪽) — 모양을 갈아도 중심은 한 픽셀도 안 움직인다.
 *
 * ⚑ 823(2026-09-02) — 여기 있던 **좌표 상수 표**(11/11 · 20/7 · 21/11 · 11/11)를 걷어냈다.
 *   (⚠ 이 주석에 «별 두 개 + 슬래시» 를 쓰지 마라 — 블록 주석이 그 자리에서 닫힌다. 1회차 실수다.)
 *   [C] 「HUD 사이드 `.ibtn .bdg` — 코너 안쪽 20/7」 이 43/44 로 굳어 빨갰는데, 제품이 아니라
 *   **자가 뒤처진 것**이었다: 471 7회차가 `--dot-in-x` 를 20 → **17.4** 로 옮기며 그 근거를
 *   `index.html` 1051~1058 주석에 스스로 적어 뒀다(6칸 평균 잉크가 «한 칸만» 잰 값이었다 ·
 *   세로 7 은 불변). 실측 17.39/7.02 가 그 두 줄과 소수점까지 맞는다.
 *   ⇒ 상수를 «새 상수» 로 갈아 끼우면 다음에 471 이 또 옮길 때 똑같이 헛빨강이 난다.
 *   822 가 `probe325` 에서 쓴 꼴 그대로 — **좌표를 새로 적지 않고 규약식을 묻는다**:
 *     ⓐ 앉은 자리 = 제품이 선언한 `--dot-in-x`/`--dot-in-y` (471 규약식 그대로 따라온다)
 *     ⓑ 규약 자리들은 `:root{--dot-in}` 값 그대로다 (규약이 살아 있는가)
 *     ⓒ 규약을 벗어난 자리는 **명단 그대로 둘뿐**이다 — «이 자리만 규약 예외다» 라는 뜻은
 *        값이 아니라 **명단**에 있다(333 «자리를 비우지 마라»). 값은 제품이 정하고 자는 안 굳힌다.
 *     ⓓ 그 둘의 예외가 **선언돼 있다** (드리프트로 벌어진 게 아니라 적어서 벌어진 것)
 *   [R] 에 자리 되돌림 시험이 붙어 있다 — 선언은 그대로 두고 **그린 자리만** 밀면 ⓐ 가 빨개진다
 *   (그래야 ⓐ 가 «파일에 숫자가 있나» 가 아니라 «실제로 거기 앉았나» 를 묻는 것이다 · 334 교훈). */
const EXC = ['HUD 탭바 .tab .bdg', 'HUD 사이드 .ibtn .bdg'];

(async () => {
  const rows = probe(null);
  const live = rows.filter(r => !r.missing);
  ok(live.length >= 5, '[A] 표본 — 닷 자리가 5곳 이상 잡혔다', live.length + '곳');

  live.forEach(r => {
    ok(near(r.coreR, 13.5, 0.75), '[A] ' + r.label + ' — 코어 반지름 13.5 (ref 03 §3-6 Ø24~26)', r.coreR);
    ok(near(r.rimR, 15.5, 0.75), '[A] ' + r.label + ' — 분홍 림 바깥 15.5 (ref «밝은 림 포함» Ø31~33)', r.rimR);
    ok(r.rim >= 1.5, '[A] ' + r.label + ' — 분홍 림이 **있다** (0 이면 글로벌 구형 노드로 되돌아간 것)', r.rim);
    ok(near(r.ring, 42, 1.0), '[B] ' + r.label + ' — 그려진 외곽 Ø42 (링 포함 · ref 41~43)', r.ring);
  });

  /* 한 부품인지 — 자리끼리 값이 갈리면 «통일» 이 아니다 */
  const spread = k => Math.max(...live.map(r => r[k])) - Math.min(...live.map(r => r[k]));
  ok(spread('coreR') <= 0.5, '[A] 자리끼리 코어 반지름이 같다 (통일 — 수리 전 폭 2.5)', spread('coreR'));
  ok(spread('ring') <= 0.5, '[B] 자리끼리 그려진 외곽이 같다 (수리 전 40 / 41 / 42 세 값)', spread('ring'));

  /* [C] 자리 Δ0 — 좌표 상수 0개. 위 주석의 ⓐ~ⓓ */
  const seats = live.filter(r => r.inX !== null && r.inX !== undefined);
  ok(seats.length >= 4, '[C] 표본 — 호스트 코너를 잴 수 있는 자리', seats.length + '곳');

  /* ⓐ 앉은 자리 = 제품이 선언한 규약값 */
  seats.forEach(r => {
    ok(near(r.inX, r.dotInX, 0.6) && near(r.inY, r.dotInY, 0.6),
      '[C] ' + r.label + ' — 앉은 자리가 제품 선언 그대로다 (471 규약식 «중심 = 코너 안쪽 --dot-in-x/y»)',
      r.inX + '/' + r.inY + ' ↔ 선언 ' + r.dotInX + '/' + r.dotInY);
  });

  /* ⓑ 규약이 살아 있다 — `:root{--dot-in}` 을 읽고, 예외가 아닌 자리는 그 값 그대로다 */
  const conv = seats[0] && seats[0].dotIn;
  ok(Number.isFinite(conv) && conv > 0, '[C] 규약값 `:root{--dot-in}` 이 살아 있다', conv);
  seats.filter(r => !EXC.includes(r.label)).forEach(r => {
    ok(r.dotInX === conv && r.dotInY === conv,
      '[C] ' + r.label + ' — 규약값(`--dot-in`) 그대로다 (자기 좌표를 따로 안 적는다)',
      r.dotInX + '/' + r.dotInY);
  });

  /* ⓒ 예외는 **명단 그대로 둘뿐**이다 — 값이 아니라 명단이 «이 자리만 규약 예외다» 의 뜻이다.
     새 자리가 조용히 규약을 벗어나면(또는 예외가 슬그머니 규약으로 되돌아가면) 여기가 빨개진다. */
  const off = seats.filter(r => r.dotInX !== conv || r.dotInY !== conv).map(r => r.label).sort();
  ok(off.length === EXC.length && off.join(' · ') === [...EXC].sort().join(' · '),
    '[C] 규약을 벗어난 자리는 **명단 그대로** 둘뿐이다 (`.tab .bdg` 가로 · `.ibtn .bdg` 가로·세로)',
    off.join(' · ') || '0곳');

  /* [D] 선언 위생 */
  const src = fs.readFileSync(SRC, 'utf8');
  const LIT = 'inset 0 6px 0 -2px rgba(255,117,150,.85),0 0 0 2.5px #FF7596,0 0 0 7.5px #000';
  const lit = src.split(LIT).length - 1;
  ok(lit === 1, '[D] 표준 닷 그림자 리터럴은 **한 번만** 적힌다 (`:root{--dot-paint}`)', lit + '건');
  const useVar = src.split('box-shadow:var(--dot-paint)').length - 1;
  ok(useVar >= 6, '[D] 표준 닷 자리들이 그 한 곳을 읽는다', useVar + '건');
  ok(!/\.tab \.bdg\{[^}]*border:5px solid #000/.test(src),
    '[D] `.tab .bdg` 가 검정 링을 다시 `border` 로 두르지 않는다 (옛 꼴 복귀 금지)');
  ok(!/#menub \.bdg\{[^}]*border:5px solid #000/.test(src),
    '[D] `#menub .bdg` 가 검정 링을 다시 `border` 로 두르지 않는다');
  ok(!/\.ibtn \.bdg\{[^}]*border:calc\([^)]*\) solid #000/.test(src),
    '[D] `.ibtn .bdg` 가 검정 링을 다시 `border` 로 두르지 않는다');
  /* ⚑ 음성항 — 위 세 항은 «옛 꼴이 없다» 만 물으므로, 새 꼴이 실제로 있는지도 같이 묻는다
     (셋 다 지워 버려도 초록인 게이트가 되는 것을 막는다 — 328 교훈) */
  ok(/\.tab \.bdg\{[^}]*--dot-r:13\.5px/.test(src) && /#menub \.bdg\{[^}]*--dot-r:13\.5px/.test(src),
    '[D] 두 자리가 표준 반지름 13.5 을 들고 있다 (상자 축과 `--dot-r` 이 짝이라 중심이 안 움직인다)');
  ok(/\.ibtn \.bdg\{[^}]*--dot-r:calc\(var\(--ih,82px\)\*\.16463\)/.test(src),
    '[D] `.ibtn .bdg` 는 `--ih` 비례를 유지한 채 표준 비율을 쓴다 (ih 82 → 13.5)');
  /* ⓓ(823) — [C]ⓒ 의 예외 둘이 «드리프트로 벌어진 것» 이 아니라 **적어서** 벌어진 것인지.
     값은 안 굳힌다(그 값은 471 이 정하고 [C]ⓐ 가 그림과 대조한다) — 선언의 **존재**만 묻는다. */
  ok(/\.tab \.bdg\{[^}]*--dot-in-x:/.test(src),
    '[D] `.tab .bdg` 의 가로 예외가 **선언돼** 있다 (= 자기 바깥 반지름 · A1 §6 «칸 오른쪽 −21»)');
  ok(/\.ibtn \.bdg\{[^}]*--dot-in-x:/.test(src) && /\.ibtn \.bdg\{[^}]*--dot-in-y:/.test(src),
    '[D] `.ibtn .bdg` 의 가로·세로 예외가 **선언돼** 있다 (471 7회차 — 6칸 글리프 잉크 보정)');
  ok(/:root\{--dot-in:[\d.]+px\}/.test(src),
    '[D] 규약값이 `:root{--dot-in}` 한 곳에서 온다 (자리마다 손으로 다시 적지 않는다)');

  /* [R] 되돌림 — 수리 전 `.tab .bdg` 선언으로 되돌린 사본 */
  const CUR = /(\.tab \.bdg\{position:absolute;--dot-r:13\.5px;--dot-in-x:21px;width:27px;height:27px;border-radius:50%;\n\s*background:#F22E52;box-shadow:var\(--dot-paint\);display:none;z-index:3\})/;
  const OLD = '.tab .bdg{position:absolute;--dot-r:20.5px;--dot-in-x:20.5px;width:41px;height:41px;border-radius:50%;\n'
    + '    background:radial-gradient(circle at 50% 20%,#ff7891 0 2.5px,#f22e52 6px);\n'
    + '    border:5px solid #000;display:none;z-index:3}';
  /* 823 — 같은 사본에 **자리 되돌림**도 얹는다(브라우저를 한 번 더 안 띄운다).
     선언(`--dot-in-x:17.4px`)은 **그대로 두고** 그려지는 자리만 코너로 민다 ⇒ [C]ⓐ 가 빨개져야
     한다. 이것이 ⓐ 가 «파일에 숫자가 있나» 가 아니라 «실제로 거기 앉았나» 를 묻는다는 증거다.
     ⚠ 선언 자체를 20 으로 되돌리는 시험은 **뜻이 없다** — 규약식이라 그림도 같이 20 으로 따라가
        ⓐ 는 그대로 초록이다(그것이 823 이 상수를 걷어낸 이유다). 그래서 «선언 ↔ 그림» 을 가른다. */
  const SEATBUST = '<style>.ibtn .bdg{right:0px !important;top:0px !important}</style>\n</body>';
  ok(CUR.test(src), '[R] 되돌림 시험이 겨눌 자리를 찾았다 (`.tab .bdg` 현행 선언)');
  ok(src.includes('</body>'), '[R] 자리 되돌림을 얹을 자리를 찾았다 (`</body>`)');
  if (CUR.test(src)) {
    const tmp = path.join(ROOT, `__v509_revert-${process.pid}.html`);
    fs.writeFileSync(tmp, src.replace(CUR, OLD).replace('</body>', SEATBUST));
    let rev = [];
    try { rev = probe(tmp); } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
    const t = rev.find(r => r.label === 'HUD 탭바 .tab .bdg');
    ok(!!t, '[R] 되돌린 사본에서 그 자리를 다시 쟀다');
    if (t) {
      ok(t.rim < 1.0, '[R] 되돌리면 분홍 림이 **사라진다** ([A] 가 실제로 빨개진다)', t.rim);
      ok(t.coreR > 14.5, '[R] 되돌리면 코어가 커진다 (표준 13.5 → 구형 15~16)', t.coreR);
      /* ⚠ 옛 꼴의 **외곽**은 41 이라 [B](42 ±1)로는 안 걸린다 — 옛 꼴이 틀린 것은 «외곽» 이
         아니라 «그 41 안을 어떻게 나눴는가» 였다(코어가 림 자리까지 먹었다). 그러니 여기서
         [B] 를 억지로 빨갛게 만들지 말고, 실제로 갈리는 축을 적는다: 코어 상자가 27 이 아니다
         (= `verifyA1` 의 «코어 상자 ⌀27» 이 빨개진다). */
      ok(!near(t.box, 27, 0.6), '[R] 되돌리면 코어 상자가 27 이 아니다 (`verifyA1` «코어 상자 ⌀27» 이 빨개진다)', t.box);
    }
    /* 823 — 자리 되돌림: 선언은 그대로인데 그림만 밀었다 ⇒ [C]ⓐ 의 술어가 거짓이어야 한다 */
    const s = rev.find(r => r.label === 'HUD 사이드 .ibtn .bdg');
    ok(!!s, '[R] 자리 되돌림 사본에서 `.ibtn .bdg` 를 다시 쟀다');
    if (s) {
      const l = live.find(r => r.label === 'HUD 사이드 .ibtn .bdg');
      ok(!!l && s.dotInX === l.dotInX && s.dotInY === l.dotInY,
        '[R] 자리 되돌림이 **선언은 안 건드렸다** (규약값이 현행 트리와 같다 — 상수 없이 대조)',
        s.dotInX + '/' + s.dotInY + ' ↔ 현행 ' + (l ? l.dotInX + '/' + l.dotInY : '없음'));
      ok(!(near(s.inX, s.dotInX, 0.6) && near(s.inY, s.dotInY, 0.6)),
        '[R] 그림만 밀면 [C]ⓐ 가 **빨개진다** (ⓐ 가 «선언» 이 아니라 «앉은 자리» 를 묻는다)',
        s.inX + '/' + s.inY + ' ↔ 선언 ' + s.dotInX + '/' + s.dotInY);
    }
    /* 시험이 상태를 안 남긴다 */
    ok(!fs.existsSync(tmp), '[R] 되돌림 사본을 지웠다 (시험이 트리에 상태를 안 남긴다)');
  }

  const pass = T.filter(t => t.pass).length;
  T.forEach(t => console.log('  ' + (t.pass ? 'ok  ' : 'FAIL') + ' ' + t.name + (t.got ? ' — ' + t.got : '')));
  console.log('\nVERIFY509 ' + pass + '/' + T.length + (pass === T.length ? ' PASS' : ' FAIL'));
  process.exit(pass === T.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
