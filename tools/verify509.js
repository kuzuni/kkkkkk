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

/* 471 이 정한 자리(코너 안쪽) — 모양을 갈아도 이 값은 한 픽셀도 안 움직인다.
   `.tab .bdg` 만 20.5 → 21 인데, 그 값은 상수가 아니라 «자기 **바깥** 반지름» 이라는 식이고
   외곽이 41 → 42 가 되면 따라오는 값이다(A1 §6 레퍼런스 못 «칸 오른쪽 −21» 과 같은 값). */
const SEAT = {
  'HUD ▦ 메뉴 #menub .bdg': [11, 11],
  'HUD 사이드 .ibtn .bdg': [20, 7],
  'HUD 탭바 .tab .bdg': [21, 11],
  '22 [모두 받기] #qAll>.updot': [11, 11],
};

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

  /* [C] 자리 Δ0 */
  Object.keys(SEAT).forEach(k => {
    const r = live.find(x => x.label === k);
    if (!r) { ok(false, '[C] ' + k + ' — 자리가 잡혔다', '없음'); return; }
    ok(near(r.inX, SEAT[k][0], 0.6) && near(r.inY, SEAT[k][1], 0.6),
      '[C] ' + k + ' — 코너 안쪽 ' + SEAT[k].join('/') + ' (471 규약·예외 그대로)', r.inX + '/' + r.inY);
  });

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

  /* [R] 되돌림 — 수리 전 `.tab .bdg` 선언으로 되돌린 사본 */
  const CUR = /(\.tab \.bdg\{position:absolute;--dot-r:13\.5px;--dot-in-x:21px;width:27px;height:27px;border-radius:50%;\n\s*background:#F22E52;box-shadow:var\(--dot-paint\);display:none;z-index:3\})/;
  const OLD = '.tab .bdg{position:absolute;--dot-r:20.5px;--dot-in-x:20.5px;width:41px;height:41px;border-radius:50%;\n'
    + '    background:radial-gradient(circle at 50% 20%,#ff7891 0 2.5px,#f22e52 6px);\n'
    + '    border:5px solid #000;display:none;z-index:3}';
  ok(CUR.test(src), '[R] 되돌림 시험이 겨눌 자리를 찾았다 (`.tab .bdg` 현행 선언)');
  if (CUR.test(src)) {
    const tmp = path.join(ROOT, '__v509_revert.html');
    fs.writeFileSync(tmp, src.replace(CUR, OLD));
    let rev = [];
    try { rev = probe(tmp); } finally { fs.unlinkSync(tmp); }
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
    /* 시험이 상태를 안 남긴다 */
    ok(!fs.existsSync(tmp), '[R] 되돌림 사본을 지웠다 (시험이 트리에 상태를 안 남긴다)');
  }

  const pass = T.filter(t => t.pass).length;
  T.forEach(t => console.log('  ' + (t.pass ? 'ok  ' : 'FAIL') + ' ' + t.name + (t.got ? ' — ' + t.got : '')));
  console.log('\nVERIFY509 ' + pass + '/' + T.length + (pass === T.length ? ' PASS' : ' FAIL'));
  process.exit(pass === T.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
