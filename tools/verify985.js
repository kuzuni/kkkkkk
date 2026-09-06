/* 작업 985 게이트 — «`measure()` 계열의 궤도각을 못박았다»
 *
 *   node tools/verify985.js            (전부)
 *   node tools/verify985.js --no-page  (§A 선언 절만 — 브라우저 없이 3초)
 *
 * ── 무엇을 못박는가 (한 줄) ───────────────────────────────────────────────
 *   발을 베끼는 자(`specs` 를 «실제로 만든 첫 발» 에서 뜨는 자)는 그 앞에서
 *   **`orbitAng` 을 제품의 선언값에 세운다.** 안 세우면 부팅 1.1초와 `putFoe()` 의
 *   «적이 나올 때까지» 루프가 각을 판마다 다른 자리에 놓고, `spiral` 은 발사각을
 *   `base = orbitAng*0.7` 로 잡으므로(index.html 26291) **같은 발이 판마다 다른 각**으로 찍힌다.
 *
 * ── 재현이 등재문을 한 칸 정정했다 (338 규칙) ────────────────────────────
 *   등재문(PROGRESS 985)은 뿌리를 «실시간 1.1초» 로 짚고 처방으로 «프레임 수로 바꾸기» 를 줬다.
 *   `tools/probe985.js` 가 네 모드를 각각 굴려 갈래를 갈랐다:
 *     · `camOx` 는 **이미 붙박이**다(−690.00 · 판 사이 폭 0.00) — `spawnStage()` 가 카메라를
 *       `camClamp(player)` 로 도로 앉히기 때문이다. 카메라는 범인이 아니었다.
 *     · 흔들린 것은 **각**이다 — 본체 화소 수는 4790~4805 로 거의 그대로인데 bbox 만
 *       85×111 · 86×112 · 87×112 로 움직였다(자리가 아니라 회전이라는 뜻이다).
 *     · 등재문의 처방(`frames`)은 **못 고친다** — 프레임 수로 바꿔도 메인 루프의 `dt` 가
 *       진짜 시계라 `orbitAng += dt*2.4` 가 그대로 흔들린다(실측 Δ폭 1px · 게다가 표본이
 *       105×97 로 통째로 옮겨간다).
 *     · 각을 세우면 4판이 **105×97 · 본체화소 4862** 로 한 화소도 안 틀린다.
 *
 * 절:
 *   [A] 선언 — 발을 베끼는 형제 자 8곳 전부에 핀 한 줄이 있고, 첫 `SKILLS` 고리 **앞**에 온다.
 *              세우는 값은 손 상수가 아니라 **제품의 선언값**(index.html `orbitAng = 0`)이다.
 *   [B] 붙박이 — 못박은 자리에서 3판을 굴려 본체 bbox·본체 화소가 판마다 **같다**.
 *   [C] 축 — 각을 다른 값으로 세우면 그림이 **실제로 달라진다**. 이것이 없으면 [B] 는
 *            «이미 참인 것» 을 굳힌 게이트다(338 이 던전 체력바에서 겪은 자리).
 *   [R] 되돌림 — 핀이 없는 세계(`probe985 --mode real`)에서는 각이 판마다 다르다.
 *
 * 종료 코드 — 0 통과 · 1 FAIL · 3 못 쟀다 (939 규약).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { once } = require('./probe985');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* 발을 «실제로 만든 첫 발» 에서 베끼는 형제 자 — `grep -l 'sa: b.sa' tools/` 가 낸 목록에서
   `putFoe()` + `for (const s of SKILLS)` 고리를 실제로 가진 것들이다(`cap710` 은 고리가 없다). */
const SIBS = ['verify792', 'probe792', 'verify710', 'probe710',
              'probe865', 'probe928', 'probe981', 'verify856'];

const PIN = 'putFoe(); orbitAng = 0;';
const RUNS = 3;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

console.log('=== VERIFY 985 — measure() 계열 궤도각 못박기 ===\n');

/* ─────────────────────────── [A] 선언 ─────────────────────────── */
const missing = [], late = [];
for (const n of SIBS) {
  const p = path.join(ROOT, 'tools', n + '.js');
  let s = '';
  try { s = fs.readFileSync(p, 'utf8'); } catch (_) { missing.push(n + '(파일 없음)'); continue; }
  const iPin = s.indexOf(PIN);
  if (iPin < 0) { missing.push(n); continue; }
  const iLoop = s.indexOf('for (const s of SKILLS) {');
  if (iLoop >= 0 && iPin > iLoop) late.push(n);
}
ok(missing.length === 0,
  '[A1] 발을 베끼는 형제 자 ' + SIBS.length + '곳 전부에 핀 한 줄이 있다 — 빠진 자 ' +
  missing.length + (missing.length ? ' (' + missing.join(' · ') + ')' : ''));
ok(late.length === 0,
  '[A2] 핀이 첫 `SKILLS` 고리 **앞**에 온다 (뒤에 있으면 이미 굴러간 각을 세우는 것이다) — 어긴 자 ' +
  late.length + (late.length ? ' (' + late.join(' · ') + ')' : ''));

/* [A3] — 세우는 값이 제품의 «집» 인가. 자에 손으로 적은 상수가 아니라 선언값이어야 한다(402·936). */
let decl = null;
try {
  const m = fs.readFileSync(SRC, 'utf8').match(/orbitAng\s*=\s*(-?[\d.]+)\s*[,;]/);
  if (m) decl = +m[1];
} catch (_) {}
ok(decl === 0,
  '[A3] 세우는 값 0 이 제품의 선언값과 같다 (index.html `orbitAng = ' +
  (decl === null ? '못 읽음' : decl) + '`) — 손 상수가 아니다');

if (process.argv.includes('--no-page')) {
  console.log('\nVERIFY985 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + ' (선언 절만)');
  process.exit(fail ? 1 : 0);
}

/* ─────────────────── [B]·[C]·[R] — 실제로 굴려서 ─────────────────── */
(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const runMany = async (mode, opts) => {
    const rs = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await once(browser, mode, opts);
      if (r.err) { console.log('  (판 ' + (i + 1) + ' evaluate 예외: ' + r.err + ')'); continue; }
      rs.push(r);
    }
    return rs;
  };
  const sig = (r, id) => (r.rows[id] ? r.rows[id].bbw + '×' + r.rows[id].bbh + '/' + r.rows[id].hard : '—');

  const pinned = await runMany('orbit', { orbit: 0 });
  if (pinned.length < RUNS) {
    console.error('verify985 — 못 쟀다: 못박은 판이 ' + pinned.length + '/' + RUNS + ' 만 돌았다');
    await browser.close(); process.exit(3);
  }
  const ids = Object.keys(pinned[0].rows);
  const wob = ids.filter((id) => new Set(pinned.map((r) => sig(r, id))).size > 1);
  console.log('');
  ok(wob.length === 0,
    '[B1] 못박은 자리에서 ' + RUNS + '판 — 본체 bbox·본체화소가 판마다 같은 종 ' +
    (ids.length - wob.length) + '/' + ids.length +
    (wob.length ? ' · 흔들린 종 ' + wob.join(' · ') : '') +
    ' (spiral ' + sig(pinned[0], 'spiral') + ')');
  ok(pinned.every((r) => r.errs === 0),
    '[B2] 콘솔/페이지 오류 0건 — 판별 ' + pinned.map((r) => r.errs).join('/'));

  /* [C] 축 — 각을 옮기면 그림이 실제로 달라져야 한다. 안 달라지면 [B1] 은 «이미 참인 것» 이다. */
  const moved = await runMany('orbit', { orbit: 0.9 });
  const movedIds = moved.length
    ? ids.filter((id) => sig(moved[0], id) !== sig(pinned[0], id)) : [];
  ok(moved.length > 0 && movedIds.includes('spiral'),
    '[C1] 각을 0 → 0.9 로 옮기면 그림이 실제로 달라진다 — 달라진 종 ' + movedIds.length +
    (moved.length ? ' (spiral ' + sig(pinned[0], 'spiral') + ' → ' + sig(moved[0], 'spiral') + ')' : ''));
  ok(moved.length > 0 && new Set(moved.map((r) => sig(r, 'spiral'))).size === 1,
    '[C2] 옮긴 자리도 붙박이다 — 못박기가 «0» 이라는 값이 아니라 «세운다» 는 행위의 몫임을 못박는다');

  /* [R] 되돌림 — 핀이 없는 세계. 각(`orbitAng`)이 판마다 다르다는 것이 병의 뿌리다.
     ⚠ 여기서 «bbox 가 흔들린다» 를 문턱으로 쓰면 그 게이트는 **운에 달린다**(825 의 병) —
       세 판이 우연히 같은 각 근처에 앉으면 초록이 된다. 그래서 묻는 것은 **각 자체**다. */
  const raw = await runMany('real');
  const angs = raw.map((r) => r.castAt.orbit);
  const spread = angs.length ? Math.max(...angs) - Math.min(...angs) : 0;
  ok(raw.length === RUNS && new Set(angs.map((a) => a.toFixed(6))).size === raw.length,
    '[R1] 핀이 없으면 각이 판마다 다르다 — 서로 다른 값 ' +
    new Set(angs.map((a) => a.toFixed(6))).size + '/' + raw.length +
    ' · 폭 ' + spread.toFixed(3) + 'rad (' + angs.map((a) => a.toFixed(2)).join(' · ') + ')');
  const rawWob = raw.length ? new Set(raw.map((r) => sig(r, 'spiral'))).size : 0;
  console.log('  (기록) 핀 없는 세계의 spiral — ' + raw.map((r) => sig(r, 'spiral')).join(' · ') +
    ' · 서로 다른 표본 ' + rawWob + '/' + raw.length);

  await browser.close();
  console.log('\nVERIFY985 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('verify985 — 못 쟀다: ' + (e && e.message ? e.message : e));
  process.exit(3);
});
