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
 *   N1  scaleX ×1.15    — [2] 평균 w 만 빨강      (가로 손잡이)
 *   N2  font-size ×1.12 — [2] 평균 h 빨강         (세로 손잡이 = 글자 크기)
 *   N3  scaleY ×1.12    — [2] 평균 h 빨강         (⚑ 옛 코드는 matrix 첫 성분만 읽어 **여기 눈이 멀어 있었다**)
 *   N4  font-size 0     — [1] 전제 «잉크 0 인 글리프 0종» 빨강 (아이콘이 통째로 사라진 자리)
 *   P1  scaleX ×1.03    — 여전히 초록             (밴드가 «어디까지 초록인가» 도 같이 못박는다 — want/not 짝)
 *   R   옛 단언 재현     — 기준선에서 글리프별 ±12% 는 5종 이탈 = **초록이 될 수 없다**(부패의 재현)
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

/* `.si3` 실측 규격(기준선) — 흔들 배율의 밑이 된다 */
const SX = 0.842, FS = 78.3;
const f = n => (Math.round(n * 1e4) / 1e4);

console.log('작업 361 — inkA4 게이트 되돌림 시험\n');

/* ── P0 기준선 ───────────────────────────────────────────── */
const p0 = run('');
const s0 = score(p0.out), a0 = avg(p0.out);
console.log('── P0 기준선 ' + '─'.repeat(48));
ok(!!s0 && s0.v === 'PASS' && p0.code === 0, '기준선 PASS — ' + (s0 ? s0.p + '/' + s0.t : '점수 못 읽음') + ' · 종료코드 ' + p0.code);
ok(!!a0 && Math.abs(a0.w - 68) / 68 <= 0.05 && Math.abs(a0.h - 85) / 85 <= 0.05,
  '기준선 평균 잉크 ' + (a0 ? a0.w + ' × ' + a0.h : '?') + ' 가 68×85 ±5% 안 (설계 «평균 정규화» 가 실제로 서 있다)');

/* ── N1 가로 손잡이 ──────────────────────────────────────── */
const n1 = run('.si3{transform:scaleX(' + f(SX * 1.15) + ')!important}');
const f1 = fails(n1.out);
console.log('\n── N1 scaleX ×1.15 (가로 손잡이) ' + '─'.repeat(29));
ok(score(n1.out) && score(n1.out).v === 'FAIL' && n1.code === 1, '게이트가 빨개진다 — ' + (score(n1.out) || {}).p + '/' + (score(n1.out) || {}).t);
ok(f1.some(l => l.startsWith('평균 잉크 w')), '빨간 항이 «평균 잉크 w» 다 — ' + (f1.find(l => l.startsWith('평균 잉크 w')) || '(없음)'));
ok(!f1.some(l => l.startsWith('평균 잉크 h')), '세로 항은 초록으로 남는다(축이 갈라져 있다)');

/* ── N2 세로 손잡이(글자 크기) ───────────────────────────── */
const n2 = run('.si3{font-size:' + f(FS * 1.12) + 'px!important}');
const f2 = fails(n2.out);
console.log('\n── N2 font-size ×1.12 (세로 손잡이) ' + '─'.repeat(26));
ok(score(n2.out) && score(n2.out).v === 'FAIL' && n2.code === 1, '게이트가 빨개진다 — ' + (score(n2.out) || {}).p + '/' + (score(n2.out) || {}).t);
ok(f2.some(l => l.startsWith('평균 잉크 h')), '빨간 항이 «평균 잉크 h» 다 — ' + (f2.find(l => l.startsWith('평균 잉크 h')) || '(없음)'));

/* ── N3 세로 배율 — 옛 코드가 눈이 멀어 있던 자리 ────────── */
const n3 = run('.si3{transform:scaleX(' + SX + ') scaleY(1.12)!important}');
const f3 = fails(n3.out);
console.log('\n── N3 scaleY ×1.12 (옛 코드가 못 보던 축) ' + '─'.repeat(20));
ok(/scaleY = 1\.120/.test(n3.out), '게이트가 scaleY 를 읽는다(옛 코드는 matrix 첫 성분만 읽어 1.000 으로 봤다)');
ok(score(n3.out) && score(n3.out).v === 'FAIL' && n3.code === 1, '게이트가 빨개진다 — ' + (score(n3.out) || {}).p + '/' + (score(n3.out) || {}).t);
ok(f3.some(l => l.startsWith('평균 잉크 h')), '빨간 항이 «평균 잉크 h» 다 — ' + (f3.find(l => l.startsWith('평균 잉크 h')) || '(없음)'));

/* ── N4 아이콘이 사라진 자리 ─────────────────────────────── */
const n4 = run('.si3{font-size:0px!important}');
const f4 = fails(n4.out);
console.log('\n── N4 font-size 0 (아이콘 소멸) ' + '─'.repeat(30));
ok(score(n4.out) && score(n4.out).v === 'FAIL' && n4.code === 1, '게이트가 빨개진다 — ' + (score(n4.out) || {}).p + '/' + (score(n4.out) || {}).t);
ok(f4.some(l => l.startsWith('잉크 0 인 글리프')), '빨간 항이 [1] 전제 «잉크 0 인 글리프» 다 — ' + ((f4.find(l => l.startsWith('잉크 0')) || '(없음)').slice(0, 60) + '…'));

/* ── P1 밴드 안쪽은 초록(want/not 짝) ────────────────────── */
const p1 = run('.si3{transform:scaleX(' + f(SX * 1.03) + ')!important}');
console.log('\n── P1 scaleX ×1.03 (밴드 안) ' + '─'.repeat(33));
ok(score(p1.out) && score(p1.out).v === 'PASS' && p1.code === 0,
  '±5% 밴드 안에서는 초록 — ' + (score(p1.out) || {}).p + '/' + (score(p1.out) || {}).t + ' (평균 w ' + (avg(p1.out) || {}).w + ')');

/* ── R 부패 재현 — 옛 «글리프별 ±12%» 는 기준선에서 초록이 될 수 없다 ── */
console.log('\n── R 옛 단언 재현(부패의 원인) ' + '─'.repeat(31));
const om = p0.out.match(/글리프별 ±12% 이탈 (\d+)종 — ([^(]+)/);
ok(!!om && +om[1] === 5, '기준선에서도 글리프별 ±12% 이탈이 ' + (om ? om[1] : '?') + '종 = 옛 게이트라면 22/27 FAIL(영원한 빨강)');
ok(!!om && /drain/.test(om[2]) && /lance/.test(om[2]),
  '이탈이 글리프 고유 잉크비다 — ' + (om ? om[2].trim() : '?') + ' (🩸 −28.2% · 🔻 −41.8% : CSS 로 회수 불가 · A4 «아트 대기»)');

console.log('\nPROBE361 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
process.exit(fail ? 1 : 0);
