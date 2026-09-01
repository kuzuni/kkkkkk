/* 작업 361 되돌림 시험 — «`inkA4 --gate` 를 평균 축으로 옮긴 것이 무르게 푼 수리가 아님» 을 못박는다.
 *
 *   node tools/probe361.js
 *
 * 등재문: `node tools/inkA4.js --gate` 가 22/27 로 «영원히 빨갛다» — 글리프별 ±12% 규격이
 * 설계(«27종 **평균** 잉크를 68×85 에 정규화» · 측정표 A4 §3)와 어긋난다. 처방 ①(평균 축).
 *
 * 무르게 푼 수리와 옳은 수리를 가르는 것은 «지금 초록인가» 가 아니라 **«무엇을 흔들면 빨개지는가»** 다
 * (LESSONS 229-④ · 240-② : 손잡이가 빗나간 되돌림 시험은 «초록» 을 낸다 — 그 초록은 튼튼함이 아니다).
 * 그래서 여기서는 `--inject` 로 **잴 값을 실제로 움직이는 손잡이**(`.si3` 의 font-size·scaleX·scaleY)를
 * 흔들고, 빨개진 항목을 **이름으로** 확인한다(LESSONS 219-③ : 되돌림 시험은 의도한 항목이
 * 빨개졌는지까지 봐야 성립한다).
 *
 * 절:
 *   P0  기준선          — 5/5 PASS (제품 0줄)
 *   N1  가로 손잡이     — [2] 평균 w 만 빨강      (평균 w 를 밴드 밖 +3×tol 로 민다)
 *   N2  세로 손잡이     — [2] 평균 h 빨강         (= 글자 크기)
 *   N3  scaleY          — [2] 평균 h 빨강         (⚑ 옛 코드는 matrix 첫 성분만 읽어 **여기 눈이 멀어 있었다**)
 *   N4  font-size 0     — [1] 전제 «잉크 0 인 글리프 0종» 빨강 (아이콘이 통째로 사라진 자리)
 *   P1  밴드 절반       — 여전히 초록             (밴드가 «어디까지 초록인가» 도 같이 못박는다 — want/not 짝)
 *   R   옛 단언 재현     — 기준선에서 글리프별 ±12% 이탈이 남는다 = **초록이 될 수 없다**(부패의 재현)
 *
 * ⚑ 작업 741(2026-09-01) — **흔들 배율의 «밑» 을 상수로 적지 않는다.**
 *   옛 코드는 `const SX = 0.842, FS = 78.3` 로 «제품이 지금 어떻게 생겼나» 를 박아 두었는데,
 *   356(주인 지시)이 그 둘을 `fs 65.9 · transform 없음`(등방)으로 갈아 버려 손잡이가 **빗나갔다** —
 *   N1 이 넣던 `0.842 × 1.15 = 0.968` 은 실제로는 **3.2% 축소**라 «가로를 키웠는데 빨간 항이 없다» 가 됐다
 *   (probe361 8/15 FAIL). 730 과 같은 병·같은 처방이다: **밑은 게이트에게 물어서 그 자리에서 잰다**
 *   (`inkA4` 가 찍는 `SPEC …` 한 줄). 그래서 이 자는 «몇 배를 곱하나» 가 아니라
 *   **«평균 잉크를 밴드의 어디로 옮기나»** 로 손잡이를 적는다 — 다음 규격 변경에도 안 부패한다.
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const GATE = path.resolve(__dirname, 'inkA4.js');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 게이트를 한 번 돌려 출력·종료코드를 그대로 받는다(FAIL 이면 종료코드 1 이라 throw 를 받아 쓴다) */
function run(inject) {
  const args = [GATE, '--gate'];
  if (inject) args.push('--inject', inject);
  try {
    return { code: 0, out: execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 1 << 24 }) };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
const score = out => { const m = out.match(/VERIFYA4-INK (\d+)\/(\d+) (PASS|FAIL)/); return m ? { p: +m[1], t: +m[2], v: m[3] } : null; };
const fails = out => out.split('\n').filter(l => l.startsWith('  FAIL ')).map(l => l.slice(7).trim());
const avg = out => { const m = out.match(/평균 잉크 ([\d.]+) × ([\d.]+)/); return m ? { w: +m[1], h: +m[2] } : null; };

/* ⚑ 741 — `.si3` 실측 규격은 **게이트에게 묻는다**(상수로 적지 않는다).
   `inkA4` 가 찍는 기계용 한 줄: `SPEC fs=… sx=… sy=… mw=… mh=… refW=… refH=… refHart=… tol=…` */
const spec = out => {
  const m = out.match(/^SPEC (.+)$/m);
  if (!m) return null;
  const o = {};
  for (const kv of m[1].trim().split(/\s+/)) { const [k, v] = kv.split('='); o[k] = +v; }
  return o;
};
const f = n => (Math.round(n * 1e4) / 1e4);

console.log('작업 361 — inkA4 게이트 되돌림 시험\n');

/* ── P0 기준선 ───────────────────────────────────────────── */
const p0 = run('');
const s0 = score(p0.out), a0 = avg(p0.out), S = spec(p0.out);
console.log('── P0 기준선 ' + '─'.repeat(48));
ok(!!s0 && s0.v === 'PASS' && p0.code === 0, '기준선 PASS — ' + (s0 ? s0.p + '/' + s0.t : '점수 못 읽음') + ' · 종료코드 ' + p0.code);
ok(!!S, '게이트가 밑(SPEC)을 찍는다 — ' + (S ? 'fs ' + S.fs + 'px · scaleX ' + S.sx + ' · scaleY ' + S.sy +
  ' · 평균 ' + S.mw.toFixed(1) + '×' + S.mh.toFixed(1) + ' · 목표 ' + S.refW + '×' + S.refH + ' ±' + S.tol + '%' : '(없음 — 741 이전 자다)'));
if (!S) { console.log('\nPROBE361 ' + pass + '/' + (pass + fail) + ' FAIL (밑을 못 읽어 이후 절을 못 돈다)'); process.exit(1); }
ok(!!a0 && Math.abs(a0.w - S.refW) / S.refW <= S.tol / 100 && Math.abs(a0.h - S.refH) / S.refH <= S.tol / 100,
  '기준선 평균 잉크 ' + (a0 ? a0.w + ' × ' + a0.h : '?') + ' 가 ' + S.refW + '×' + S.refH + ' ±' + S.tol + '% 안 (설계 «평균 정규화» 가 실제로 서 있다)');
/* ⚑ 741 — 세로 목표가 «아트 bbox 85» 가 아니라 **356 파생값**이라는 것 자체를 못박는다.
   85 로 되돌리면(= 356 이관을 무르면) 이 항이 먼저 빨개진다 — 기준선 h 72.2 는 85 에서 −15% 다. */
ok(Math.abs(S.refH - S.refHart * 0.842) <= 0.05,
  '판정 세로 목표 ' + S.refH + ' = 아트 bbox ' + S.refHart + ' × 356 등방배율 .842 (85 로 되돌리면 빨강)');

/* 손잡이는 «몇 배» 가 아니라 «밴드의 어디로» 로 적는다 — 밑이 바뀌어도 같은 자리로 민다 */
const toW = frac => f(S.refW * (1 + frac) / S.mw);   // 평균 w 를 목표 대비 frac 지점으로
const toH = frac => f(S.refH * (1 + frac) / S.mh);   // 평균 h 를 목표 대비 frac 지점으로
const OUT = 3 * S.tol / 100, IN = 0.5 * S.tol / 100; // 밴드 밖 3배 지점 · 밴드 절반 지점

/* ── N1 가로 손잡이 ──────────────────────────────────────── */
const kx1 = toW(OUT);
const n1 = run('.si3{transform:scaleX(' + f(S.sx * kx1) + ')!important}');
const f1 = fails(n1.out);
console.log('\n── N1 가로 손잡이 — 평균 w 를 +' + (OUT * 100).toFixed(0) + '% 로(scaleX ×' + kx1 + ') ' + '─'.repeat(12));
ok(score(n1.out) && score(n1.out).v === 'FAIL' && n1.code === 1, '게이트가 빨개진다 — ' + (score(n1.out) || {}).p + '/' + (score(n1.out) || {}).t);
ok(f1.some(l => l.startsWith('평균 잉크 w')), '빨간 항이 «평균 잉크 w» 다 — ' + (f1.find(l => l.startsWith('평균 잉크 w')) || '(없음)'));
ok(!f1.some(l => l.startsWith('평균 잉크 h')), '세로 항은 초록으로 남는다(축이 갈라져 있다)');

/* ── N2 세로 손잡이(글자 크기) ───────────────────────────── */
const kf2 = toH(OUT);
const n2 = run('.si3{font-size:' + f(S.fs * kf2) + 'px!important}');
const f2 = fails(n2.out);
console.log('\n── N2 세로 손잡이 — 평균 h 를 +' + (OUT * 100).toFixed(0) + '% 로(font-size ×' + kf2 + ') ' + '─'.repeat(9));
ok(score(n2.out) && score(n2.out).v === 'FAIL' && n2.code === 1, '게이트가 빨개진다 — ' + (score(n2.out) || {}).p + '/' + (score(n2.out) || {}).t);
ok(f2.some(l => l.startsWith('평균 잉크 h')), '빨간 항이 «평균 잉크 h» 다 — ' + (f2.find(l => l.startsWith('평균 잉크 h')) || '(없음)'));

/* ── N3 세로 배율 — 옛 코드가 눈이 멀어 있던 자리 ────────── */
const ky3 = toH(OUT), sy3 = f(S.sy * ky3);
const n3 = run('.si3{transform:scaleX(' + f(S.sx) + ') scaleY(' + sy3 + ')!important}');
const f3 = fails(n3.out);
console.log('\n── N3 scaleY ×' + ky3 + ' (옛 코드가 못 보던 축) ' + '─'.repeat(14));
ok(new RegExp('scaleY = ' + sy3.toFixed(3).replace('.', '\\.')).test(n3.out),
  '게이트가 scaleY 를 읽는다 — ' + sy3.toFixed(3) + ' (옛 코드는 matrix 첫 성분만 읽어 1.000 으로 봤다)');
ok(score(n3.out) && score(n3.out).v === 'FAIL' && n3.code === 1, '게이트가 빨개진다 — ' + (score(n3.out) || {}).p + '/' + (score(n3.out) || {}).t);
ok(f3.some(l => l.startsWith('평균 잉크 h')), '빨간 항이 «평균 잉크 h» 다 — ' + (f3.find(l => l.startsWith('평균 잉크 h')) || '(없음)'));

/* ── N4 아이콘이 사라진 자리 ─────────────────────────────── */
const n4 = run('.si3{font-size:0px!important}');
const f4 = fails(n4.out);
console.log('\n── N4 font-size 0 (아이콘 소멸) ' + '─'.repeat(30));
ok(score(n4.out) && score(n4.out).v === 'FAIL' && n4.code === 1, '게이트가 빨개진다 — ' + (score(n4.out) || {}).p + '/' + (score(n4.out) || {}).t);
ok(f4.some(l => l.startsWith('잉크 0 인 글리프')), '빨간 항이 [1] 전제 «잉크 0 인 글리프» 다 — ' + ((f4.find(l => l.startsWith('잉크 0')) || '(없음)').slice(0, 60) + '…'));

/* ── P1 밴드 안쪽은 초록(want/not 짝) ────────────────────── */
const kx4 = toW(IN);
const p1 = run('.si3{transform:scaleX(' + f(S.sx * kx4) + ')!important}');
console.log('\n── P1 밴드 절반 지점 — 평균 w 를 +' + (IN * 100).toFixed(1) + '% 로(scaleX ×' + kx4 + ') ' + '─'.repeat(6));
ok(score(p1.out) && score(p1.out).v === 'PASS' && p1.code === 0,
  '±' + S.tol + '% 밴드 안에서는 초록 — ' + (score(p1.out) || {}).p + '/' + (score(p1.out) || {}).t + ' (평균 w ' + (avg(p1.out) || {}).w + ')');

/* ── R 부패 재현 — 옛 «글리프별 ±12%» 는 기준선에서 초록이 될 수 없다 ── */
console.log('\n── R 옛 단언 재현(부패의 원인) ' + '─'.repeat(31));
const om = p0.out.match(/글리프별 ±12% 이탈 (\d+)종 — ([^(]+)/);
const tm = p0.out.match(/스킬 표본 (\d+)종/);
/* ⚑ 741 — 이탈 «개수» 를 상수로 적지 않는다. 못박을 주장은 «5종» 이 아니라
   **«CSS 로는 초록이 될 수 없는 글리프가 남는다»** 이고, 개수는 규격이 바뀔 때마다 ±1 흔들린다
   (356 이관 뒤 실측 5 → 4 — meteor 가 +12.7% 에서 +11.8% 로 문턱을 넘어왔다). */
ok(!!om && +om[1] >= 1,
  '기준선에서도 글리프별 ±12% 이탈이 ' + (om ? om[1] : '?') + '종 = 옛 게이트라면 ' +
  (om && tm ? (+tm[1] - +om[1]) + '/' + tm[1] : '?') + ' FAIL(영원한 빨강)');
ok(!!om && /drain/.test(om[2]) && /lance/.test(om[2]),
  '이탈이 글리프 고유 잉크비다 — ' + (om ? om[2].trim() : '?') + ' (🩸 −28.2% · 🔻 −41.8% : CSS 로 회수 불가 · A4 «아트 대기»)');

/* ── R2 부패 재현(741) — «밑을 상수로 박으면 손잡이가 빗나간다» ────────────────
   옛 코드의 N1 은 `scaleX(0.842 × 1.15) = 0.9683` 을 넣었다. 356 이 `.si3` 를 등방으로 갈아
   제품의 scaleX 가 1 이 된 뒤로 그 값은 **가로를 키우는 손잡이가 아니라 3.2% 줄이는 손잡이**다.
   여기서 그 옛 값을 그대로 넣어 «w 항이 안 빨개진다» 를 확인한다 — 이 절이 초록이면
   741 이 고친 것이 «허용 오차» 가 아니라 **손잡이의 밑**이었음이 산술로 남는다. */
const OLD_SX_N1 = 0.9683;                       // = 0.842 × 1.15 (356 이전 규격의 밑)
const r2 = run('.si3{transform:scaleX(' + OLD_SX_N1 + ')!important}');
const fr2 = fails(r2.out), ar2 = avg(r2.out);
console.log('\n── R2 옛 밑(scaleX ' + OLD_SX_N1 + ' = .842×1.15) 재현 ' + '─'.repeat(17));
ok(!!ar2 && ar2.w < S.mw, '옛 손잡이는 평균 w 를 **줄인다** — ' + (ar2 ? ar2.w : '?') + ' < 기준선 ' + S.mw.toFixed(1) +
  ' (356 이 scaleX 를 폐기해 밑이 .842 → 1 이 됐다)');
ok(!fr2.some(l => l.startsWith('평균 잉크 w')), '그래서 «평균 잉크 w» 항이 안 빨개진다 = 옛 N1 은 빗나간 손잡이였다');

console.log('\nPROBE361 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
process.exit(fail ? 1 : 0);
