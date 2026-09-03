/* 작업 881 게이트 — 「요소 대상 버스트 알이 «판독 하한» 아래로 줄어든다」의 수리 자.
 *
 *   node tools/verify881.js
 *
 * 838 9회차 채점 2인(DJ·DK)이 각자 다른 자로 ② 에 같은 것을 적었다 — «알이 사는 동안 절반으로
 * 줄어 후반 프레임이 판독 최소선 아래로 내려간다». 838 10회차가 이 행 안의 유일한 지렛대
 * (`--burst-fit`)를 **범위 끝까지 열어 보고 자로 기각**했다(꼬리 24% 로 하한 미달 · 빈 각 +14.7°).
 * ⇒ 881 은 크기가 아니라 **감쇠 채널**을 연다: `fxSparkE` 의 scale 여덟 칸만 갈고, 꺼짐은
 *   알파 4칸 `fxSparkX`(681 9회차)에 맡긴다.
 *
 * ⚑ 무엇을 재는가 — **셋을 같이** 묻는다(하나만 물으면 무르게 풀린다):
 *   ⓐ **하한**(고친 것) — 45~320ms 의 모든 알·모든 프레임이 발원 아이콘의 28% 이상.
 *   ⓑ **안 깬 것** — 877 이동 곡선 · 838 사거리/스필 · 681 알파 채널 · **공용 곡선(09·12·17·장비·
 *      코스튬)** 이 한 값도 안 바뀐다. 공용 곡선 쪽은 «문자열이 같다» 로 그치지 않고 **점 대상 씬을
 *      되돌림 사본과 나란히 굴려 프레임별 지름이 한 자리까지 같은지**를 잰다(선언이 아니라 결과).
 *   ⓒ **되돌림 시험** — scale 여덟 칸을 `fxSpark` 것으로 되쓰면 하한이 **다시 깨진다**.
 *
 * ⚑ 자는 `travel838`(838·873·877·probe881 이 같이 쓰는 부품)의 per-egg `pts[].w` 와 `geo.fi`
 *   (881 이 덧붙인 «발원 아이콘 정사각»)를 그대로 읽는다 — 사본을 안 적는다(402 «두 벌 금지»).
 * ⚠ **분모는 `geo.fr` 이 아니다** — 훈련의 발원 `<s>` 는 줄상자라 긴 변이 71.31 이고 그 안의
 *   `img.cic` 가 52.97 정사각(= DJ 의 «코인 Ø50»)이다. 71.31 로 나누면 봉우리조차 하한 미달로
 *   읽혀 «등재문이 봉우리는 하한 안이라고 적어 둔 것» 과 어긋난다(probe881 1회차가 그 유령을 냈다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runScene, SCENES, STOPS } = require('./travel838');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const FLOOR = 0.28;          /* DJ «발원 코인 지름의 28~32%» 의 아래쪽 */
const F0 = 2;                /* DJ 가 센 «프레임 3~8» = 45ms 이후 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 프레임별 지름비 — probe881 과 같은 산수 */
function ratios(sum) {
  const d0 = sum.geo.fi;
  const mean = i => sum.per.reduce((a, e) => a + e.pts[i].w, 0) / sum.per.length / d0;
  let below = 0, total = 0, minR = Infinity;
  for (let i = F0; i < STOPS.length; i++)
    sum.per.forEach(e => { total++; const r = e.pts[i].w / d0; if (r < minR) minR = r; if (r < FLOOR) below++; });
  const means = STOPS.map((_, i) => mean(i));
  return { d0, means, below, total, minR, peak: Math.max(...means), tail: means[STOPS.length - 1] };
}
/* 알별 «이동 분수» 프로파일 — verify877 [A] 와 같은 산수(877 회귀용) */
function profileOf(sum) {
  const nF = STOPS.length; const acc = new Array(nF).fill(0); let cnt = 0;
  sum.per.forEach(e => { const p = e.pts; if (!p || p.length < nF) return;
    const d = p.map(q => Math.hypot(q.cx - p[0].cx, q.cy - p[0].cy)); const fin = d[nF - 1];
    if (!(fin > 1)) return; for (let i = 0; i < nF; i++) acc[i] += d[i] / fin; cnt++; });
  return acc.map(a => a / cnt);
}

/* `@keyframes <name>` 의 scale / opacity / 이동 분수 채널을 문자열로 뽑는다 */
function kf(code, name) {
  const m = code.match(new RegExp('@keyframes ' + name + '\\{([\\s\\S]*?\\})\\}'));
  if (!m) return null;
  const b = m[1];
  return { body: b,
    scale: (b.match(/scale\([^)]*\)/g) || []).join(' '),
    op: (b.match(/opacity:[^;]*/g) || []).join(' '),
    mv: (b.match(/--dx\)\*[\d.]+/g) || []).join(' ') };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [S] 정적 — 무엇이 갈렸고 무엇이 그대로인가 ────────────────── */
  console.log('[S] 정적 — 갈린 것은 `fxSparkE` 의 scale 여덟 칸뿐');
  const A = kf(code, 'fxSpark'), E = kf(code, 'fxSparkE');
  ok(!!A && !!E, 'S0 공용 `fxSpark` 와 요소 대상 `fxSparkE` 가 둘 다 있다');
  if (A && E) {
    ok(E.scale !== A.scale,
       'S1 ★ `fxSparkE` 의 **크기 채널이 `fxSpark` 와 다르다**(881 이 여는 자리 — 877 은 «한 값도 안 다르다» 였다)');
    /* 09·12·17·장비·코스튬·우편·퀘스트의 근거 — 공용 곡선은 한 글자도 안 바뀐다 */
    ok(A.scale === 'scale(.26) scale(.55) scale(.89) scale(1) scale(.875) scale(.766) scale(.67) scale(.586) scale(.5)',
       'S2 ★ 공용 `fxSpark` 의 크기 여덟 칸이 **681 값 그대로**다 — 신고 안 한 화면은 불변', A.scale);
    ok(E.op === A.op,
       'S3 ★ `fxSparkE` 의 **알파 채널은 `fxSpark` 와 한 값도 안 다르다**(꺼짐은 알파 4칸 `fxSparkX` 몫 — 681 9회차)');
    ok(E.mv === '--dx)*.151 --dx)*.327 --dx)*.450 --dx)*.623 --dx)*.798 --dx)*.913 --dx)*.970',
       'S4 ★ `fxSparkE` 의 **이동 분수가 877 값 그대로**다(881 은 속도를 안 건드렸다)', E.mv);
    ok(/100%\{transform:translate\(var\(--dx\),var\(--dy\)\)/.test(E.body),
       'S5 `fxSparkE` 100% 끝점이 최종 `--dx/--dy` 다 — 사거리 불변(838 [A]~[D])');
    const tail = (E.scale.match(/scale\(([\d.]+)\)$/) || [])[1];
    ok(parseFloat(tail) >= 0.9,
       'S6 ★ 끝 scale 이 ≥0.9 다 — «축소가 아니라 알파로 꺼진다»(DK 처방)', 'scale(' + tail + ')');
  }
  /* 세 호스트 신고가 그대로여야 이 갈래가 실제로 켜진다(877 [S1] 회귀) */
  ['.tr-card>.cb', '.tr-rn>.rbt.b1', '.tr-tp>.tb'].forEach(h => {
    const m = code.match(new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}'));
    ok(!!m && /--burst-ease\s*:\s*1/.test(m[0]), 'S7 ' + h + ' 가 `--burst-ease:1` 을 신고한다');
  });

  /* ── [A] 측정 — 하한(고친 것) ──────────────────────────────────── */
  console.log('\n[A] 측정 — 요소 대상 알이 판독 하한(발원 아이콘의 ' + (FLOOR * 100).toFixed(0) + '%) 위에 산다');
  const cur = await runScene(SCENES[0], SRC);
  if (cur.err) { ok(false, 'A0 훈련 버스트가 났다', cur.err); return done(); }
  const r = ratios(cur);
  console.log('       · 프레임별 평균 지름비: '
    + STOPS.map((t, i) => t + 'ms ' + p2(r.means[i] * 100) + '%').join(' · '));
  ok(cur.n >= 8, 'A0 훈련 알 표본 ≥8', cur.n + '알 · 발원 아이콘 Ø' + p2(r.d0) + 'px');
  ok(r.below === 0,
     'A1 ★ 45~320ms 의 **모든 알·모든 프레임**이 하한 위다 — 미달 표본 ' + r.below + '/' + r.total
     + '  [수리 전 60/60 · DJ «27개 중 22개»]', '최소 ' + p2(r.minR * 100) + '%');
  ok(r.tail / r.peak >= 0.9,
     'A2 ★ 꼬리(320ms)가 봉우리의 ≥90% 다 — «사는 동안 줄어들지 않는다»(DK «50% 축소» 의 반대)',
     '봉우리 ' + p2(r.peak * 100) + '% → 꼬리 ' + p2(r.tail * 100) + '% = ' + p2(r.tail / r.peak * 100) + '%');
  ok(r.peak >= FLOOR, 'A3 봉우리도 하한 위다(등재문 «봉우리는 이미 하한 안» 유지)', p2(r.peak * 100) + '%');
  let mono = true;
  for (let i = 4; i < STOPS.length; i++) if (r.means[i] > r.means[i - 1] + 1e-6) mono = false;
  ok(mono, 'A4 봉우리 뒤 크기가 **재확대하지 않는다**(평평하되 되튀지 않는다)');

  /* ── [B] 짝 항 — 안 깬 것 ──────────────────────────────────────── */
  console.log('\n[B] 짝 항 — 838 끝점 · 877 속도 · 공용 곡선');
  ok(cur.body >= 1.55, 'B1 사거리 ≥1.55 몸길이(838 [A1] 회귀)', p2(cur.body));
  ok(cur.spill <= 0, 'B2 알 잉크가 호스트 밖으로 안 샌다(838 [B1] 회귀)', p2(cur.spill) + 'px');
  const prof = profileOf(cur);
  ok(prof[3] >= 0.42, 'B3 70ms 에 이미 이동의 ≥42%(877 [A2] 회귀 — 이즈아웃 유지)', p2(prof[3] * 100) + '%');

  /* ⚑ **공용 곡선은 «문자열이 같다» 로 안 닫는다** — 점 대상 씬(유물 소환)은 `--burst-ease` 를
     신고하지 않아 `fxSpark` 를 탄다. 되돌림 사본과 나란히 굴려 **프레임별 지름이 한 자리까지 같은지**
     를 잰다. 이것이 09·12·17·장비·코스튬이 «한 값도 안 바뀐다» 의 결과판 증거다. */
  const tmp = path.join(os.tmpdir(), 'v881_revert_' + process.pid + '.html');
  const revScale = 'scale(.26)|scale(.55)|scale(.89)|scale(1)|scale(.875)|scale(.766)|scale(.67)|scale(.586)|scale(.5)'.split('|');
  let k = 0;
  const revBody = E ? E.body.replace(/scale\([\d.]+\)/g, () => revScale[k++]) : '';
  const rev = code.replace(E ? E.body : ' ', revBody);
  fs.writeFileSync(tmp, rev);
  ok(!!E && k === 9 && rev !== code, 'B4-0 되돌림 사본을 만들었다(scale 아홉 칸을 `fxSpark` 것으로 되씀)', k + '칸');

  const ctlNow = await runScene(SCENES[1], SRC);
  const ctlRev = await runScene(SCENES[1], tmp);
  if (ctlNow.err || ctlRev.err) ok(false, 'B4 점 대상 대조군이 났다', ctlNow.err || ctlRev.err);
  else {
    const wOf = s => STOPS.map((_, i) => s.per.reduce((a, e) => a + e.pts[i].w, 0) / s.per.length);
    const a = wOf(ctlNow), b = wOf(ctlRev);
    const dMax = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    ok(dMax < 0.01,
       'B4 ★ **공용 곡선을 타는 씬은 되돌림 사본과 지름이 한 자리까지 같다** — 09·12·17·장비·코스튬 불변의 결과 증거',
       '최대 Δ' + dMax.toFixed(4) + 'px · ' + STOPS.map((t, i) => t + 'ms Ø' + p2(a[i])).join(' · '));
  }

  /* ── [R] 되돌림 시험 — 무르게 푼 수리가 아니다 ─────────────────── */
  console.log('\n[R] 되돌림 — scale 여덟 칸을 되쓰면 하한이 다시 깨진다');
  const old = await runScene(SCENES[0], tmp);
  try { fs.unlinkSync(tmp); } catch (_) {}
  if (old.err) { ok(false, 'R0 되돌린 버스트가 났다', old.err); return done(); }
  const ro = ratios(old);
  console.log('       · 되돌린 프레임별 평균: '
    + STOPS.map((t, i) => t + 'ms ' + p2(ro.means[i] * 100) + '%').join(' · '));
  ok(ro.below > 0,
     'R1 ★ 되돌리면 **하한 미달 표본이 다시 생긴다** — [A1] 이 빨개지는 자리',
     ro.below + '/' + ro.total + ' 미달 · 최소 ' + p2(ro.minR * 100) + '%');
  ok(ro.tail / ro.peak <= 0.65,
     'R2 ★ 되돌리면 **꼬리가 봉우리의 ≤65% 로 줄어든다**(DK «50% 축소» 재현) — [A2] 가 빨개지는 자리',
     p2(ro.tail / ro.peak * 100) + '%');
  ok(Math.abs(profileOf(old)[3] - prof[3]) < 0.02,
     'R3 짝 항 — 되돌려도 **이동 분수는 그대로다**(881 이 연 것이 크기 채널 하나임을 못박는다)',
     p2(profileOf(old)[3] * 100) + '% vs ' + p2(prof[3] * 100) + '%');

  ok(cur.errs.length === 0, 'D1 콘솔 에러 0', cur.errs.slice(0, 2).join(' | '));
  done();
})();

function done() {
  console.log('\nVERIFY881 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
}
