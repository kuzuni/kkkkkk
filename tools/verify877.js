/* 작업 877 게이트 — 「요소 대상 버스트(씬 A = 훈련·단련·룬 버튼)의 속도가 등속이다」의 수리 자.
 *
 *   node tools/verify877.js
 *
 * 838 이 여덟 회차에 걸쳐 «알이 어디로 가는가»(끝점)를 열었으나 «어떻게 가는가»(속도)는
 * 공용 `@keyframes fxSpark`(09·12·17·장비·코스튬 공유 · 681 이 ⏸ 보류로 닫은 자리)에 묶여
 * 못 건드렸다(838 §5-2). 877 은 **호스트 신고 갈래**(`--burst-ease` → `fxSparkE`)로 이즈아웃을 연다.
 *
 * ⚑ 무엇을 재는가 — 이 작업이 지켜야 하는 두 축이 서로 반대라 **둘을 같이** 묻는다:
 *   ⓐ **프런트로딩**(고쳐야 할 것) — 알이 수명 앞쪽에 더 많이 움직인다(20·70ms 프레임의 이동 분수).
 *   ⓑ **끝점 불변**(안 깨야 할 것) — 사거리·최종 자리는 fxSpark 와 한 값도 안 다르다(838 [A]~[D]).
 * ⚑ 자는 `travel838`(838·probe838 과 같은 부품)의 per-egg `pts` 를 쓴다 — 사본을 안 적는다(402).
 * ⚠ `travel838` 은 트리거 직전 재시드(873)라 단일 실행 대조가 정당하다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runScene, SCENES, STOPS } = require('./travel838');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };

/* 훈련 버스트의 알별 «이동 분수»(제 끝점 대비) 를 각 STOP 에서 평균낸다 —
   prof 는 [0,20,45,70,110,175,250,320]ms 여덟 자리의 [0..1] 프로파일이다. */
function profileOf(sum) {
  const nF = STOPS.length;
  const acc = new Array(nF).fill(0); let cnt = 0;
  sum.per.forEach(e => {
    const p = e.pts; if (!p || p.length < nF) return;
    const x0 = p[0].cx, y0 = p[0].cy;
    const d = p.map(q => Math.hypot(q.cx - x0, q.cy - y0));
    const fin = d[nF - 1]; if (!(fin > 1)) return;
    for (let i = 0; i < nF; i++) acc[i] += d[i] / fin;
    cnt++;
  });
  return { prof: acc.map(a => a / cnt), cnt };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [S] 정적 — 신고·갈래·공용 곡선 불변 ─────────────────────────── */
  console.log('[S] 정적 — 호스트 신고 · 이즈아웃 갈래 · 공용 곡선 불변');
  const hosts = ['.tr-card>.cb', '.tr-rn>.rbt.b1', '.tr-tp>.tb'];
  hosts.forEach(h => {
    const m = code.match(new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}'));
    ok(!!m && /--burst-ease\s*:\s*1/.test(m[0]),
       'S1 ' + h + ' 가 `--burst-ease:1` 을 신고한다', m ? '있음' : '행 못 찾음');
  });
  ok(/@keyframes fxSparkE\{/.test(code), 'S2 이즈아웃 갈래 `@keyframes fxSparkE` 가 있다');
  ok(/\.fx-spark\.fx-ease\{animation-name:fxSparkE,fxSparkX\}/.test(code),
     'S3 `.fx-spark.fx-ease` 만 `fxSparkE` 로 갈린다(나머지 longhand 는 `.fx-spark` 물려받음)');
  ok(/getPropertyValue\('--burst-ease'\)/.test(code) && /easeOut/.test(code),
     'S4 JS `fxBurst` 가 `--burst-ease` 를 읽어 알에 `fx-ease` 를 붙인다');

  /* 공용 곡선은 한 값도 안 바뀐다 — 09·12·17·장비·코스튬의 근거 */
  const mk = code.match(/@keyframes fxSpark\{([\s\S]*?\})\}/);
  const shared = mk ? mk[1] : '';
  ok(/scale\(\.26\)/.test(shared) && /\.286\),calc\(var\(--dy\)\*\.286\)\)/.test(shared)
     && /\.441\),calc\(var\(--dy\)\*\.441\)\)/.test(shared) && /\.649\),calc\(var\(--dy\)\*\.649\)\)/.test(shared),
     'S5 공용 `@keyframes fxSpark` 이동 분수(.286·.441·.649)가 그대로다 — 신고 안 한 화면은 불변', mk ? '일치' : '못 찾음');
  /* fxSparkE 의 크기·알파 채널은 fxSpark 와 동일(끝점·수명 게이트 회귀 방지) */
  const mke = code.match(/@keyframes fxSparkE\{([\s\S]*?\})\}/);
  const eBody = mke ? mke[1] : '';
  const scaleOf = s => (s.match(/scale\([^)]*\)/g) || []).join(' ');
  const opOf = s => (s.match(/opacity:[^;]*/g) || []).join(' ');
  /* ⚑ 881 이관 — 이 항은 원래 «크기·알파 채널이 `fxSpark` 와 한 값도 안 다르다» 였다(877 이 연
     것은 이동 분수뿐이라는 뜻). **881 이 그 절반을 뒤집었다** — 요소 대상 알이 사는 동안 절반으로
     줄어 판독 하한 아래로 내려가는 것을 고치려고 **크기 채널을 일부러 갈랐다**(838 9회차 DJ·DK).
     자리를 비우지 않고 **둘로 가른다**(333 처방): 877 이 여전히 안 건드리는 **알파**는 «같다» 로,
     881 이 연 **크기**는 «다르다 + 공용 곡선은 그대로» 로 묻는다. 그냥 크기 항을 지웠으면
     «`fxSparkE` 가 통째로 공용 곡선과 갈라져도 초록인 게이트» 가 된다(328·330 교훈). */
  ok(!!mke && opOf(eBody) === opOf(shared),
     'S6 ★ `fxSparkE` 의 **알파 채널**이 `fxSpark` 와 한 값도 안 다르다(877 이 연 것은 이동 분수다)');
  ok(!!mke && scaleOf(eBody) !== scaleOf(shared) && scaleOf(shared) ===
     'scale(.26) scale(.55) scale(.89) scale(1) scale(.875) scale(.766) scale(.67) scale(.586) scale(.5)',
     'S6b ★ 크기 채널은 **881 이 갈랐고**(요소 대상 판독 하한) **공용 `fxSpark` 는 681 값 그대로**다 — 소유권은 `verify881`',
     scaleOf(eBody));
  /* ⚑ 881 이관 — 이 항이 재는 것은 **끝점(translate)**인데 정규식이 그 뒤의 `scale(.5)` 까지 물고
     있었다. 881 이 요소 대상 알의 끝 scale 을 .5 → .955 로 올리자(판독 하한) 이 항이 «사거리가
     깨졌다» 고 빨개졌다 — **재는 것과 적은 것이 달랐던 자리**다. 끝점만 묻도록 고치고, 크기 쪽은
     같은 절의 [S6b] 와 `verify881` [S5]·[S6] 이 각자 제 축으로 잡는다. */
  ok(/100%\{transform:translate\(var\(--dx\),var\(--dy\)\)/.test(eBody),
     'S7 `fxSparkE` 100% 끝점이 `fxSpark` 와 같다(translate = 최종 --dx/--dy) — 사거리 불변');

  /* ── [A] 측정 — 프런트로딩(고친 것) ──────────────────────────────── */
  console.log('[A] 측정 — 훈련 버스트가 이즈아웃(앞을 당긴다)');
  const cur = await runScene(SCENES[0], SRC);
  if (cur.err) { ok(false, 'A0 훈련 버스트가 났다', cur.err); return done(); }
  const { prof, cnt } = profileOf(cur);
  const f20 = prof[1], f45 = prof[2], f70 = prof[3];
  ok(cnt >= 8, 'A0 훈련 알 표본 ≥ 8', cnt + '알');
  ok(f20 >= 0.13, 'A1 20ms 에 이미 이동의 ≥ 13% — ' + (f20 * 100).toFixed(1) + '%  [등속판 9.2% · 이즈아웃 실측 16.2%]');
  ok(f70 >= 0.42, 'A2 70ms 에 이미 이동의 ≥ 42% — ' + (f70 * 100).toFixed(1) + '%  [등속판 30.5% · 이즈아웃 실측 47.1%]');
  /* 45→70ms 두 프레임이 «같은 그림» 이 아니다 — 그 창의 이동 분수 증가 */
  ok((f70 - f45) >= 0.10,
     'A3 45→70ms 창에서 이동 분수가 ≥ 10%p 는다(«같은 그림» 아님) — ' + ((f70 - f45) * 100).toFixed(1) + '%p  [등속판 10.4%p 이나 절대 이동이 작다]');
  /* 단조 감속 — 마디 속도가 안 되튄다(재가속 0). 마지막 페이드 구간(250→320)은 잔상이라 뺀다 */
  let mono = true, prevV = Infinity;
  for (let i = 1; i < STOPS.length - 1; i++) {
    const v = (prof[i] - prof[i - 1]) / (STOPS[i] - STOPS[i - 1]);
    if (v > prevV * 1.05 + 1e-4) mono = false;
    prevV = v;
  }
  ok(mono, 'A4 마디 속도가 단조 감속이다(재가속 0 · `v(t)=v₀·e^(−t/τ)`)');

  /* ── [B] 끝점 불변(안 깬 것) ─────────────────────────────────────── */
  console.log('[B] 끝점 불변 — 사거리는 838 그대로');
  ok(Math.abs(prof[STOPS.length - 1] - 1) < 1e-6, 'B1 최종 이동 분수 = 1.0(끝점이 곧 극값)');
  ok(cur.body >= 1.55, 'B2 사거리 ≥ 1.55 몸길이(838 [A1] 회귀) — ' + cur.body.toFixed(2));
  ok(cur.spill <= 0, 'B3 알 잉크가 호스트 밖으로 안 샌다(838 [B1] 회귀) — 최대 ' + cur.spill.toFixed(2) + 'px');

  /* ── [R] 되돌림 — 신고를 지우면 다시 등속에 가깝다 ───────────────── */
  console.log('[R] 되돌림 — `--burst-ease` 를 지우면 프런트로딩이 사라진다');
  const tmp = path.join(os.tmpdir(), 'v877_revert_' + process.pid + '.html');
  /* 세 호스트의 `--burst-ease:1` 만 지운 사본(다른 신고는 그대로) */
  const rev = code.replace(/--burst-ease:1;/g, '');
  fs.writeFileSync(tmp, rev);
  ok(!/--burst-ease:1/.test(rev), 'R0 되돌린 사본에 신고가 없다');
  const old = await runScene(SCENES[0], tmp);
  try { fs.unlinkSync(tmp); } catch (_) {}
  if (old.err) { ok(false, 'R1 되돌린 버스트가 났다', old.err); return done(); }
  const rp = profileOf(old).prof;
  ok(rp[3] < 0.38,
     'R1 되돌리면 70ms 이동 분수가 다시 ≤ 38% 로 내린다(등속 복귀) — ' + (rp[3] * 100).toFixed(1) + '%  [이즈아웃 ' + (f70 * 100).toFixed(1) + '%]');
  ok((f70 - rp[3]) >= 0.10,
     'R2 이즈아웃이 70ms 프레임을 등속판보다 ≥ 10%p 앞당긴다 — Δ' + ((f70 - rp[3]) * 100).toFixed(1) + '%p');

  ok(cur.errs.length === 0, 'D1 콘솔 에러 0', cur.errs.slice(0, 2).join(' | '));
  done();
})();

function done() {
  console.log('\nVERIFY877 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
}
