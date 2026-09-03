#!/usr/bin/env node
/* 작업 494 게이트 — «봇 플레이어» 시뮬 `tools/bot199.js`
 *
 *   node tools/verify494.js [--fast]
 *
 * 등재문의 게이트 조항을 그대로 항으로 옮긴다:
 *   [1] 파일·문법        — 도구 두 벌이 있고 문법이 성립한다
 *   [2] 예산             — **30일 1회 실행 ≤ 2분**
 *   [3] 규칙 위반 0      — 등재문 ⑦(입장권 없이 입장·재화 음수·장착 슬롯 초과·미보유 장착)
 *   [4] 보정치           — 구간 표본 ≥ 6 · 다섯 축(κ_dps·κ_hp·κ_gold·κ_boss·tFloor) 전부 유한·양수
 *   [5] 두 정책          — 부지런/대충이 **다른 결과**를 낸다(같으면 정책이 안 먹은 것이다)
 *   [6] 시드             — 같은 시드는 같은 결과(재현) · 다른 시드는 다른 결과(확률이 산다)
 *   [7] 표 스키마        — [A]~[F] 절과 «벽»·«다이아 유입» 표가 실제로 찍힌다
 *   [8] 판정 줄(18회차)  — 단일 정책도 자기 ④ 교차를 찍고, [E2] ↔ [G] 가 문자까지 같다
 *   [9] 판정 줄(20회차)  — ① 다섯 줄이 [G] 에 있고 [D] 와 문자까지 같다 · 단일 정책의 «비» 칸이
 *                          «못 잰다» 를 말한다 · [E3] 말미 축별 기울기 · §8 상설 대조 · §R9 되돌림
 *   [R] 되돌림 시험      — `--nofloor` 로 처치 간격 하한을 0 으로 두면 결과가 **더 빨라진다**.
 *                          이것이 없으면 이 게이트는 «보정치를 계산만 하고 안 쓰는» 봇도 통과시킨다.
 *
 * ⚠ 이 게이트는 브라우저를 여러 번 띄운다 — `--fast` 는 [2] 의 30일 실행을 건너뛴다(그 항만 빠진다).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FAST = process.argv.includes('--fast');
/* 857 — [2-c] 의 문턱. **절대 초가 아니라 비**다: κ 앵커 하나 ÷ 하한 보정(`calibrateFloor`) 하나.
   둘 다 «새 페이지 부팅 + BOT 주입 + 전투 시뮬» 이라 기계가 느려지면 분자·분모가 같이 커진다.
   실측(`probe857` [6] · 이 컨테이너): 앵커 s580 **6.3초** ÷ 하한 **1.1초** = **5.7배** ⇒ 여유 2.6배로 15.
   ⚠ 이 수는 «보정 총액의 예산» 이 **아니다**(총액 외삽은 probe857 [6] 이 기각했다 — 앵커 비용이
   스테이지를 따라 커져 한 개 외삽이 61.9% 모자란다). 이것은 **회귀 감시자**다:
   `calibrateOne` 이 눈에 띄게 느려지면 이 비가 오른다. 근거표는 `docs/review/857-verify494예산문턱.md` §2. */
const ANCHOR_X = 15;
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v494-'));

/* ⚑ 857 — **κ 캐시는 [2] 만의 문제가 아니었다.** 이 자는 봇을 **열 번** 부르는데(2·3·5·6·8·9·R 절),
   그 전부가 `--calib` 없이 불러 **매번 κ 표를 처음부터 세우고 있었다**(실측 앵커 19개 ≈ 320초).
   [2] 한 항만 고치면 나머지 아홉 번이 그대로 남아 자 전체가 **한 시간에 가깝다** — 지시서 [4] 가
   «push 전에 돌려라» 고 요구하는 자가 그 값이면 아무도 안 돌린다(그 자체가 856·807 이 겪은 병이다).
   ⇒ 부르는 자리마다 손으로 붙이지 말고 **입구 한 곳**에서 붙인다(402 «사본을 지운다»).
   ⚠ **일부러 캐시를 안 받는 자리가 둘 있다** — `--calstages`(보정 축 [2-c]·[2-d])와 `--calib` 을
   이미 준 자리. 그 둘은 «보정을 실제로 돌리는 것» 이 목적이므로 건드리면 그 항이 공허참이 된다. */
const calSrc = (() => {
  const dir = path.join(ROOT, 'docs', 'review');
  const c = fs.readdirSync(dir).map(f => /^199-calib-r(\d+)\.json$/.exec(f)).filter(Boolean)
              .sort((a, b) => Number(b[1]) - Number(a[1]));
  if (!c.length) return null;
  const dst = path.join(tmp, 'cal-shared.json');
  fs.copyFileSync(path.join(dir, c[0][0]), dst);      /* 원본을 실행이 덧쓰지 않게 사본으로 */
  return { name: c[0][0], path: dst };
})();

const run = (args) => {
  const md = path.join(tmp, 'r' + Math.random().toString(36).slice(2) + '.md');
  const js = md.replace(/\.md$/, '.json');
  /* `--fresh-cal` 은 이 자만의 표식이다(bot199 로 안 넘긴다) — «일부러 캐시 없이» 를 말한다 */
  const fresh = args.includes('--fresh-cal');
  const bare = args.filter(a => a !== '--fresh-cal');
  const useCal = calSrc && !fresh && !bare.some(a => /^--cal(ib|stages)=/.test(a));
  const full = useCal ? [...bare, '--calib=' + calSrc.path] : bare;
  const t0 = Date.now();
  let code = 0;
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'bot199.js'), ...full, '--out=' + md, '--json=' + js],
                     { cwd: ROOT, stdio: 'pipe', timeout: 20 * 60 * 1000 }); }
  catch (e) { code = e.status == null ? -1 : e.status; }
  const sec = (Date.now() - t0) / 1000;
  const rep = fs.existsSync(js) ? JSON.parse(fs.readFileSync(js, 'utf8')) : null;
  return { sec, code, rep, md: fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : '' };
};

/* ── [1] 파일·문법 ────────────────────────────────────────────────────── */
console.log('[1] 파일·문법');
for (const f of ['tools/bot199.js', 'tools/probe494.js']) {
  const p = path.join(ROOT, f);
  ok(fs.existsSync(p), f + ' 존재');
  if (!fs.existsSync(p)) continue;
  let syn = true;
  try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); } catch (_) { syn = false; }
  ok(syn, f + ' 문법');
}
/* «계수는 한 줄도 안 건드린다» — 이 작업은 index.html 을 안 만진다(등재문 마지막 줄) */
ok(!fs.readFileSync(path.join(ROOT, 'tools', 'bot199.js'), 'utf8').includes('writeFileSync(path.join(ROOT, \'index.html\''),
   'bot199 이 index.html 을 쓰지 않는다(읽기 전용 관찰자)');

/* ── [2] 예산 — «시뮬» 과 «보정» 은 다른 축이다 (작업 857) ───────────────
 * ⚑ 2026-09-03 까지 이 항은 30일 1시드를 **`--calib` 없이** 부르고 벽시계 전체를 120초에 댔다.
 *   그래서 빨간 것은 봇이 느려서가 아니었다 — `probe857` 실측: 캐시 없이 **328.4초** ↔
 *   같은 명령에 캐시만 주면 **4.4초**(결과는 s386·cp·벽 12개까지 **동일**). 즉 그 문턱의
 *   **98.7%가 κ 표를 새로 세우는 시간**이었고, 이 항은 «봇이 빠른가» 가 아니라
 *   «이 기계에서 κ 앵커 19개를 새로 세우는 데 얼마 걸리는가» 를 재고 있었다.
 * ⚑ **문턱(120초)은 어느 눈금의 값인가**(LESSONS 845-③) — 494 등재문·회차 기록의 «30일 ≤ 2분»
 *   은 전부 **시뮬** 수다(4회차 «10일 47초» · 6회차 «30일 1시드 20.8초»). κ 표는 9회차가
 *   «캐시가 있으면 실측을 생략한다» 고 만든 **별도 축**이다. ⇒ 문턱을 올리지 않고(등재문 ⓒ 금지)
 *   **무엇을 재는가**를 고친다 — 두 축을 갈라 각자의 자로 잰다:
 *     [2-a] 시뮬 예산   — κ 는 캐시에서 읽고 **시뮬만** ≤ 120초 (494 의 그 문턱 그대로)
 *     [2-b] 캐시 확인   — 이 실행이 정말 보정을 안 샀는가 · 캐시 표가 지금 앵커 목록과 같은가
 *                         (안 물으면 [2-a] 가 조용히 옛 자로 돌아가거나 낡은 표로 재게 된다)
 *     [2-c] 보정 예산   — 앵커 **한 개**를 캐시 없이 재고 표 전체를 외삽한다. 문턱은 절대 초가
 *                         아니라 **같은 실행에서 잰 하한 보정(`calibrateFloor`)에 대한 비**다
 *                         — 둘 다 «새 페이지 부팅 + BOT 주입 + 전투 시뮬» 이라 기계 속도가 약분된다.
 *     [2-d] 되돌림 시험 — 앵커를 둘로 늘리면 [2-c] 의 축이 실제로 커진다(안 커지면 그 자는 아무것도
 *                         안 잰다 — «캐시로 갈아서 초록» 과 «무르게 푼 자» 는 겉모습이 같다).
 *     [2-e] 전체 실측   — `V494_CALFULL=1` 일 때만(기본 실행에서 328초를 사지 않는다). 캐시 없는
 *                         30일이 «앵커당 × N + 고정비» 와 맞는가. LESSONS 237-⑥ — 옵트인으로 빼는
 *                         축에는 반드시 «대체 자» 를 같이 둔다. 여기서는 [2-c]·[2-d] 가 그것이다.
 */
console.log('[2] 예산 — 시뮬 / 보정 두 축 (857)');
let base = null;
if (FAST) {
  console.log('       (--fast — 건너뜀)');
} else {
  const { CAL_STAGES } = require(path.join(ROOT, 'tools', 'bot199.js'));
  /* κ 캐시 표본은 입구(`run`)가 이미 골라 뒀다 — 저장소의 확정 표 중 **r 번호가 가장 큰 것**.
     이름이 아니라 번호로 고르므로 199 가 다음 표를 올리면 자가 따라간다(손으로 적은 파일
     이름은 다음 회차에 부패한다 — 211·289 «자가 자기 사본을 들면 부패한다» 의 파일판). */
  ok(!!calSrc, 'κ 확정 표(docs/review/199-calib-r*.json)가 있다');
  if (calSrc) {
    const tbl = JSON.parse(fs.readFileSync(calSrc.path, 'utf8'));
    /* 낡은 표로 재면 [2-a] 가 «지금 앵커 목록» 이 아닌 것을 재게 된다 — 그것부터 묻는다 */
    ok(tbl.rows && tbl.rows.length === CAL_STAGES.length,
       `[2-b] κ 표 ${calSrc.name} 의 앵커 ${tbl.rows ? tbl.rows.length : 0}개 = CAL_STAGES ${CAL_STAGES.length}개`);

    base = run(['--days=30', '--seeds=1', '--policy=diligent']);
    ok(base.code === 0, `종료 코드 0 (실제 ${base.code})`);
    const sim = base.rep && base.rep.simSec != null ? base.rep.simSec : base.sec;
    ok(sim <= 120, `[2-a] 30일 1시드 **시뮬** ${sim.toFixed(1)}초 ≤ 120초 (벽시계 ${base.sec.toFixed(1)}초)`);
    ok(!!base.rep && /^캐시/.test(base.rep.calFrom || '') && base.rep.calAnchors === 0,
       `[2-b] 이 실행은 보정을 안 샀다 — ${base.rep ? base.rep.calFrom : '?'} · 앵커 ${base.rep ? base.rep.calAnchors : '?'}개`);

    /* [2-c] 보정 축 — 앵커 한 개(캐시 없음). 목록 한가운데를 표본으로 삼는다. */
    const mid = CAL_STAGES[Math.floor(CAL_STAGES.length / 2)];
    const one = run(['--days=1', '--seeds=1', '--policy=casual', '--calstages=' + mid]);
    ok(one.code === 0 && one.rep && one.rep.calAnchors === 1,
       `앵커 1개(s${mid}) 실측 — 종료 코드 ${one.code} · 앵커 ${one.rep ? one.rep.calAnchors : '?'}개`);
    if (one.rep && one.rep.calAnchors === 1) {
      const per = one.rep.calSecPerAnchor, floor = one.rep.calFloorSec;
      const est = per * CAL_STAGES.length + floor;
      /* 문턱은 «앵커 하나 : 하한 보정 하나» 의 비다. 기계가 두 배 느려지면 둘 다 두 배가 된다. */
      ok(floor > 0 && per / floor <= ANCHOR_X,
         `[2-c] 앵커 s${mid} ${per.toFixed(1)}초 ÷ 하한 ${floor.toFixed(1)}초 = ${(per / floor).toFixed(2)}배 ≤ ${ANCHOR_X}배`
         + ` — 표 전체 **하한** ${est.toFixed(0)}초(앵커 ${CAL_STAGES.length}개 · 실제는 이보다 크다)`);

      /* [2-d] 되돌림 시험 — 앵커를 둘로 늘리면 앵커 몫이 실제로 는다. */
      const two2 = run(['--days=1', '--seeds=1', '--policy=casual',
                        '--calstages=' + mid + ',' + CAL_STAGES[Math.floor(CAL_STAGES.length / 2) + 1]]);
      const per2 = two2.rep && two2.rep.calAnchors === 2 ? (two2.rep.calSec - two2.rep.calFloorSec) : null;
      ok(per2 != null && per2 >= 1.5 * per,
         `[2-d] 앵커 2개의 앵커 몫 ${per2 == null ? '?' : per2.toFixed(1)}초 ≥ 1.5 × 1개 몫 ${per.toFixed(1)}초`
         + ' — 이 축이 앵커 수에 실제로 반응한다');

      /* [2-e] 옵트인 — 캐시 없는 30일 전체(≈5분). 외삽이 실측과 맞는가. */
      if (process.env.V494_CALFULL === '1') {
        const raw = run(['--days=30', '--seeds=1', '--policy=diligent', '--fresh-cal']);
        ok(!!raw.rep && raw.rep.calAnchors === CAL_STAGES.length,
           `[2-e] 캐시 없는 실행이 앵커 ${raw.rep ? raw.rep.calAnchors : '?'}개를 셌다 · 전체 ${raw.rep ? raw.rep.elapsedSec.toFixed(1) : '?'}초`);
        /* «하한» 이 하한답게 서는가 — 균일 외삽이 실측을 넘으면 [2-c] 의 관찰줄이 거짓말이 된다.
           (±N% 로 묶지 않는다: probe857 [6] 이 «앵커 비용은 스테이지를 따라 커진다» 를 찍었다.) */
        ok(!!raw.rep && est < raw.rep.calSec,
           `[2-e] 균일 외삽 ${est.toFixed(0)}초 < 실측 보정 ${raw.rep ? raw.rep.calSec.toFixed(0) : '?'}초 — 외삽은 하한이다`);
        /* 그리고 시뮬 몫은 캐시 실행과 같은 자리여야 한다(보정을 사도 시뮬은 안 변한다) */
        ok(!!raw.rep && Math.abs(raw.rep.simSec - sim) <= Math.max(5, sim * 0.5),
           `[2-e] 캐시 없는 실행의 시뮬 ${raw.rep ? raw.rep.simSec.toFixed(1) : '?'}초 ≈ 캐시 실행 ${sim.toFixed(1)}초`);
      } else {
        console.log('       ([2-e] 전체 보정 실측은 `V494_CALFULL=1` 에서만 — 기본 실행은 328초를 사지 않는다.'
                    + ' 대체 자는 [2-c]·[2-d] 다)');
      }
    }
  }
}

/* ── 짧은 실행 한 벌로 나머지 항을 잰다 ──────────────────────────────── */
const two = run(['--days=3', '--seeds=2', '--policy=both']);
ok(two.code === 0 && two.rep, '3일 2시드 두 정책 실행 성공');
const rep = two.rep;

/* ── [3] 규칙 위반 ────────────────────────────────────────────────────── */
console.log('[3] 규칙 위반 (등재문 ⑦)');
if (rep) {
  ok(rep.viol.length === 0, '규칙 위반 0건' + (rep.viol.length ? ' — ' + rep.viol.slice(0, 3).join(' | ') : ''));
  const runs = [].concat(...Object.values(rep.policies));
  ok(runs.every(r => (r.errs || []).length === 0), '페이지 예외 0건');
  /* 경고(경로 대체)는 «있어도 되지만 늘면 안 된다» — 지금 기준선은 0 이다.
     여기가 늘어난다는 것은 제품의 손잡이 이름이 바뀌어 봇이 그 자리를 통째로 건너뛰었다는 뜻이다. */
  ok((rep.warn || []).length === 0, '경로 대체·경고 0건' + ((rep.warn || []).length ? ' — ' + rep.warn.join(' | ') : ''));
}

/* ── [4] 보정치 ───────────────────────────────────────────────────────── */
console.log('[4] 보정치 — 표본 ≥ 6 구간 · 다섯 축 전부 유한');
if (rep && rep.cal) {
  const c = rep.cal;
  ok(c.rows.length >= 6, `구간 표본 ${c.rows.length}개 ≥ 6`);
  /* ⚑ 11회차 — 이 항의 **방향을 뒤집었다**(333 처방 — 자리를 비우지 않는다).
     옛 항은 «전 행이 대역 안»(kills > 0)을 물었는데, 11회차부터 캐시는 **일부러**
     «실패 프로브» 행(닿지 않는 앵커 · kills 0)을 같이 싣는다 — 도달 가능 화력 상한의
     좌표가 재현 경로 없이 본문에만 있던 것이 10회차 정정7 이었다.
     ⇒ 물어야 할 것은 «대역 밖 표본이 0인가» 가 아니라 **«대역 밖 표본이 자에서 빠져
     있는가»** 다. 유효로 표시된 행은 예외 없이 대역 안이어야 하고(느슨해지면 화력 미달
     표본이 κ 곡선에 섞인다), 유효 행이 하나도 없으면 그것은 자가 안 선 것이다. */
  const okRows = c.rows.filter(r => r.valid !== false);
  const badRows = c.rows.filter(r => r.valid === false);
  ok(okRows.length >= 6, `자에 쓰는(유효) 표본 ${okRows.length}개 ≥ 6`);
  ok(okRows.every(r => r.kills > 0), '유효 표본은 전부 실제 처치가 있었다(대역 밖 표본이 자에 안 섞였다)');
  /* ⚑ 199 13회차 — **무효의 이유가 둘이 됐다.** 「화력 미달」(대역 밖 · 60초 처치 0 또는
     `pump0 < 0.5`) 과 「같은 캐릭터」(직전 유효 앵커 대비 `formDps` 화력비 < 1.05 — 목표엔
     닿았으나 새 좌표가 아니라 κ 잡음만 늘리는 행). 옛 항은 «무효 = 대역 밖» 을 전제해서
     후자를 즉시 빨갛게 만들었다(13회차 실측 s580·s620·s630 3행 · kills 106~193).
     ⇒ 333 처방대로 **방향을 뒤집어 갈아 끼운다** — 그냥 지우면 «이유 없이 접힌 행» 을
     아무도 안 묻게 되므로, 물음을 «전부 대역 밖인가» 에서 **«무효 행마다 실제로 해당하는
     이유가 있는가»** 로 옮기고, 이름별 짝 항 둘로 각 이유의 실체를 따로 못박는다.
     무르게 푼 것이 아님: ⓐ 세 이유 중 어디에도 안 걸리는 무효 행은 그대로 빨갛고
     ⓑ «같은 캐릭터» 라고 이름 붙은 행이 실제로는 화력이 오른 행이면 빨갛다. */
  const PUMP_MIN = 0.5, BUILD_MIN = 1.05;
  const powerBadOf = r => !(r.kills > 0) || !(r.pump0 != null && isFinite(r.pump0) && r.pump0 >= PUMP_MIN);
  const buildBadOf = r => r.buildRat != null && r.buildRat < BUILD_MIN;
  ok(badRows.every(r => powerBadOf(r) || buildBadOf(r)),
     `무효 ${badRows.length}행은 전부 이유가 있다(화력 미달 또는 같은 캐릭터 — 이유 없이 접힌 행 0)`);
  /* ⚑ 13회차 비평 II(R10) — **이 항이 없으면 아래 짝 둘이 공허참이다.** `failBy` 가 안 실린
     캐시에서는 `filter(r => r.failBy === 'power')` 가 빈 배열이라 `.every()` 가 그냥 통과한다
     — 이빨이 있던 옛 항을 내리고 그 자리에 0행 매칭 항을 올린 꼴이었다. 이름이 **있는가**를
     먼저 묻는다: 판정 자리(`calibrateOne`)가 이유를 안 붙이면 여기서 빨개진다. */
  ok(badRows.every(r => r.failBy === 'power' || r.failBy === 'build'),
     `무효 ${badRows.length}행마다 판정 자리가 이유 이름을 붙였다(\`failBy\` — 아래 짝 항이 공허참이 되지 않게 하는 항)`);
  ok(badRows.filter(r => r.failBy === 'power').every(r => powerBadOf(r)),
     '«화력 미달» 로 이름 붙은 행은 전부 실제로 대역 밖이다(옛 항의 이빨을 이 자리로 옮겼다)');
  ok(badRows.filter(r => r.failBy === 'build').every(r => buildBadOf(r) && r.kills > 0),
     '«같은 캐릭터» 로 접힌 행은 화력비 < 1.05 이면서 표본은 대역 «안» 이다(두 이유가 안 섞였다)');
  ok(okRows.every(r => r.bossSec > 0), '유효 표본마다 보스전이 실제로 섰다');
  for (const k of ['kDps', 'kHp', 'kGold', 'kBoss', 'tFloor'])
    ok(isFinite(c[k]) && c[k] > 0, `${k} = ${Number(c[k]).toFixed(3)} — 유한·양수`);
  ok(c.tFloor > 0.05 && c.tFloor < 5, `tFloor ${c.tFloor.toFixed(3)}초 — 상식 범위(0.05~5)`);
}

/* ── [5] 두 정책 ──────────────────────────────────────────────────────── */
console.log('[5] 두 정책이 다른 결과를 낸다');
if (rep && rep.policies.diligent && rep.policies.casual) {
  const d = rep.policies.diligent[0].final, c = rep.policies.casual[0].final;
  ok(d.stage > c.stage, `부지런 s${d.stage} > 대충 s${c.stage}`);
  ok(d.cp > c.cp, `부지런 전투력 ${d.cp.toExponential(2)} > 대충 ${c.cp.toExponential(2)}`);
}

/* ── [6] 시드 ─────────────────────────────────────────────────────────── */
console.log('[6] 시드 — 재현되고, 시드끼리는 갈린다');
if (rep && rep.policies.diligent && rep.policies.diligent.length >= 2) {
  const a = rep.policies.diligent[0].final, b = rep.policies.diligent[1].final;
  ok(a.stage !== b.stage || a.cp !== b.cp || a.own !== b.own,
     `시드 1·2 가 서로 다르다 (s${a.stage}/s${b.stage} · 보유 ${a.own}/${b.own})`);
}
{
  const r1 = run(['--days=2', '--seeds=1', '--policy=casual']);
  const r2 = run(['--days=2', '--seeds=1', '--policy=casual']);
  const f1 = r1.rep && r1.rep.policies.casual[0].final, f2 = r2.rep && r2.rep.policies.casual[0].final;
  ok(!!f1 && !!f2 && f1.stage === f2.stage && f1.own === f2.own,
     '같은 시드 두 번이 같은 결과' + (f1 && f2 ? ` (s${f1.stage}=s${f2.stage} · 보유 ${f1.own}=${f2.own})` : ''));
}

/* ── [7] 표 스키마 ────────────────────────────────────────────────────── */
console.log('[7] 결과 md 스키마');
if (two.md) {
  for (const sec of ['## [A] 보정치', '## [C] 날짜별', '### [B] 1일차 분 단위', '### [D] 벽',
                     '### [E] 다이아 유입/씽크', '## [F] 규칙 위반'])
    ok(two.md.includes(sec), `절 «${sec}» 이 있다`);
  ok(/\| 스테이지 \| 실전 DPS \|/.test(two.md), '[A] 표 머리글');
  ok(/\| 일 \| 스테이지 p10 \|/.test(two.md), '[C] 표 머리글(p10/p50/p90)');
  ok(/벽 개수 p10\/p50\/p90/.test(two.md), '[D] 벽 개수 요약');
  ok(/계수를 안 건드린 «현재 값» 의 사진/.test(two.md), '표가 «조정은 199 몫» 임을 스스로 밝힌다');
}

/* ── [8] 판정 줄이 표 안에 있다 (18회차 · 17-7 정정1·2·3) ─────────────────
   17회차의 ④ 교차·② 말미 한계는 [G] 안에만 있었고 [G] 는 «정책 둘» 가드 뒤라,
   `--policy=casual` 단일 실행(17-4 의 d260 · 1,612초)이 판정 줄을 통째로 못 찍었다 —
   그 회차 헤드라인 네 수가 전부 «표 밖 수기 계산» 이 됐다(비평가 3인 일치 반박).
   이 절은 그 결손을 게이트로 굳힌다. 무르게 풀지 않았음은 ⓐ 단일 정책 md 에 [G] 가
   **없는데도** 교차가 찍히는지(옛 자에서는 구조적으로 불가능) ⓑ [E2] 와 [G] 의 수가
   **문자까지 같은지**(표 두 벌이면 갈린다) 두 항이 못박는다. */
console.log('[8] 판정 줄 — 단일 정책도 자기 ④ 교차를 찍는다 · [E2] ↔ [G] 동일값');
{
  const one = run(['--days=2', '--seeds=1', '--policy=casual']);
  ok(one.code === 0 && !!one.md, '단일 정책(대충) 실행 성공');
  const om = one.md || '';
  /* ⚑ 20회차(19-10 정정5) — **이 항은 방향이 뒤집혔다(333 처방 — 자리를 비우지 않는다).**
     18회차의 «단일 정책에는 [G] 가 없다(가드 그대로)» 는 그 회차의 참말이었지만, 그 가드가
     19회차의 두 단일 실행에서 «비» 행을 통째로 지웠고 본문이 창이 다른 두 표를 손으로 나눴다.
     ⇒ 가드를 걷었으므로 이 항은 «없다» 가 아니라 **«있고, 못 재는 칸은 못 잰다고 말한다»** 를
     묻는다. 그냥 지웠으면 «[G] 가 다시 사라져도 초록인 게이트» 가 된다(328-330 교훈). */
  ok(om.includes('## [G] 판정 표(정책 1개)'), '단일 정책 md 도 [G] 판정 표를 찍는다(20회차 — 옛 «정책 둘» 가드를 걷었다)');
  ok(/### \[E2\] ④ 교차일 · ② 말미 한계 — 대충 유저/.test(om), '단일 정책 md 에 [E2] 판정 절이 있다');
  for (const nm of ['유입 장부', '소환 예산 장부'])
    ok(new RegExp('\\| \\*\\*④ 교차일\\([^|]*' + nm + '[^|]*\\*\\* \\| [^|]+ \\|').test(om),
       `단일 정책 md 가 «${nm}» 의 ④ 교차를 자기 표에 찍는다`);
  ok(/\| ② 말미 한계 수급\/일 〔유입 장부 · 창 W\d+ · 실구간 \d+일/.test(om), '단일 정책 md 가 ② 말미 한계 수급을 찍는다(④ 외삽의 기울기 · 창 이름과 실구간을 갈라 찍는다)');

  /* [E2] ↔ [G] — 같은 함수 하나를 읽는가. 정책 이름으로 [G] 의 열을 찾아 셀 문자열을 맞댄다. */
  const md = two.md || '';
  const cellOf = (line) => line.split('|').map(s => s.trim()).filter((s, i, a) => i > 0 && i < a.length - 1);
  /* 20회차 — 머리글은 **[G] 절 안에서만** 찾는다. 문서 전체에서 `/^\| 축 \|.*비 \|$/` 로
     찾으면 다른 표의 «… 대비 |» 머리글이 먼저 걸린다(20회차 1차 실행에서 실제로 걸렸고
     이 항이 0/0 = 공허 통과 직전까지 갔다 — 그때 FAIL 로 잡혔다). */
  const gSec = '## [G]' + (md.split('## [G]')[1] || '');
  const gHead = (gSec.split('\n').find(l => /^\| 축 \|/.test(l) && /비 \|$/.test(l)) || '');
  const gCols = cellOf(gHead);                                   /* [축, 부지런한 유저, 대충 유저, 비] */
  const secs = md.split('### [E2] ④ 교차일 · ② 말미 한계 — ').slice(1);
  ok(secs.length >= 2, `[E2] 절이 정책마다 있다 (${secs.length}개)`);
  let same = 0, seen = 0;
  for (const sec of secs) {
    const pname = sec.split(' (')[0].trim();                     /* «부지런한 유저» / «대충 유저» */
    const col = gCols.indexOf(pname);
    for (const led of ['유입 장부', '소환 예산 장부']) {
      const e2 = (sec.split('\n').find(l => l.startsWith('| **④ 교차일') && l.includes(led)) || '');
      const g  = (md.split('\n').find(l => l.startsWith('| **④ 교차일') && l.includes(led) && cellOf(l).length > 2) || '');
      if (!e2 || !g || col < 0) continue;
      seen++;
      if (cellOf(e2)[1] === cellOf(g)[col]) same++;
    }
  }
  ok(seen === 4 && same === seen,
     `[E2] 와 [G] 의 ④ 교차 셀이 문자까지 같다 (${same}/${seen} · 정책 2 × 장부 2 — 갈리면 표 두 벌이다)`);

  /* 정정3 — «① 을 적을 때는 널과 간격을 한 문장에». 헤드라인 한 줄이 셋을 다 데리고 다녀야 한다. */
  const h1 = (md.split('\n').find(l => l.startsWith('**① 축 — 목표 칸 적중')) || '');
  ok(/널 기준선 [\d.]+ 대비 [+\-]?[\d.]+칸/.test(h1), '① 헤드라인이 **같은 문장**에 널 기준선과의 차를 적는다(17-7 정정3)');
  ok(/벽 간격 기하평균 p50 = /.test(h1), '① 헤드라인이 같은 문장에 벽 간격을 적는다');
  /* 정정2 — 창 밖을 사다리 안/밖으로 쪼갠다(관측창 > 사다리일 때 §0 대조가 과대 계상된다). */
  ok(/창 밖 벽 p50 = \d+.*사다리 안 \d+ · 사다리 밖 \d+/.test(h1), '① 헤드라인이 창 밖 벽을 «사다리 안 / 사다리 밖» 으로 쪼갠다(17-7 정정2)');
  ok(/사다리 끝 = 172800분/.test(h1), '사다리 끝(마지막 칸 144,000분의 창 끝 = 172,800분)을 표가 스스로 말한다');
  /* 18회차 비평(WW8·XX5) — ① 은 **두 정책 다** 물어야 한다. 한 헤드라인만 보면 벽 0개 정책의
     «0/n (널 0.00 대비 +0.00칸)» 같은 미정의 자리가 게이트 밖에 남는다. */
  const h1n = md.split('\n').filter(l => l.startsWith('**① 축 — 목표 칸 적중')).length;
  ok(h1n === 2, `① 헤드라인이 정책마다 있다 (${h1n}/2 — 한쪽만 검사하지 않는다)`);
  ok(md.split('\n').filter(l => l.startsWith('**① 축')).every(l => /사다리안\+사다리밖=창밖» 검산 (\d+)\/\1\b/.test(l)),
     '① 헤드라인이 «사다리안+사다리밖=창밖» 시드별 항등을 전 시드 통과로 찍는다(p50 끼리 더하지 마라 규약)');
  /* ⚑ 18회차 정정C(비평 XX8·WW9 — 13회차 II 패턴) — **비공허 가드.** 관측창이 사다리(172,800분)
     보다 짧으면 «사다리 밖» 분기는 구조적으로 0 이라, 위 항들은 0·0 위에서도 통과한다.
     `--wallband=10`(벽을 촘촘히 만들어 창 밖 벽을 세운다) + `--ladderend`(사다리 끝을 앞으로
     당긴다) 픽스처로 **두 분기를 실제로 밟는다** — 이 항이 없으면 분해의 정확성은 한 번도
     시험되지 않는다. */
  const fx = (extra) => {
    /* days=4 — 3일 창에서는 벽이 전부 칸 창 «안» 에 들어 창 밖이 0 이라 공허하다(실측). */
    const r = run(['--days=4', '--seeds=1', '--policy=diligent', '--wallband=10', ...extra]);
    const l = (r.md || '').split('\n').find(x => x.startsWith('**① 축')) || '';
    const m = l.match(/창 밖 벽 p50 = (\d+).*사다리 안 (\d+) · 사다리 밖 (\d+)/);
    return m ? { out: +m[1], inn: +m[2], outt: +m[3], md: r.md } : null;
  };
  const fA = fx([]);                       /* 자연 사다리 끝 — 창 밖은 전부 «사다리 안» 이어야 한다 */
  const fB = fx(['--ladderend=600']);      /* 사다리 끝을 600분으로 당긴다 — 그 밖이 «사다리 밖» */
  ok(!!fA && fA.out >= 1, `픽스처 A(촘촘한 벽) 가 창 밖 벽을 실제로 세운다 — 창 밖 ${fA ? fA.out : '—'} ≥ 1 (이 항이 없으면 아래 둘이 공허참이다)`);
  ok(!!fA && fA.inn === fA.out && fA.outt === 0,
     `픽스처 A: 관측창(5,760분) < 사다리 끝(172,800분) 이라 창 밖이 전부 «사다리 안» ${fA ? fA.inn + '/' + fA.out : '—'} · 밖 0`);
  ok(!!fB && fB.outt >= 1 && fB.inn + fB.outt === fB.out,
     `픽스처 B(--ladderend=600): «사다리 밖» 분기가 실제로 밟힌다 — 안 ${fB ? fB.inn : '—'} · 밖 ${fB ? fB.outt : '—'} · 합 = 창 밖 ${fB ? fB.out : '—'}`);
  ok(!!fB && /--ladderend` — 게이트 픽스처 전용/.test(fB.md || ''), '강제 손잡이를 쓴 표는 머리에 경고를 찍는다(판정 표와 안 섞인다)');

  /* 18회차 비평(WW3·XX3·YY4) — 표에 `undefined` 가 인쇄되면 그것은 자의 결함이다. */
  for (const [nm, t] of [['두 정책', md], ['단일 정책', om]])
    ok(!/undefined/.test(t), `${nm} 표에 «undefined» 가 없다(W 민감도 행 가드 — r18 1회차에 [G] 가 2건 인쇄했다)`);
  /* 18회차 비평(YY 불일치②) — 재현줄이 정책을 찍어야 표 하나로 재현된다. */
  ok(/--policy=casual/.test(om) && /--policy=both/.test(md), '재현줄이 `--policy` 를 찍는다(단일 정책 표를 그 명령으로 되돌릴 수 있다)');
  /* 18회차 비평(XX1·YY8) — 전 시드 외삽 셀은 §0 판정에 못 쓴다고 **셀 자신이** 말해야 한다. */
  ok(/\(외삽 (\d+)\/\1 · 말미 창 W\d+ · 실구간 \d+일 구간율\) ⚠ \*\*전 시드 외삽 — §0 판정에 쓰지 마라\*\*/.test(md),
     '전 시드 외삽 셀이 «§0 판정에 쓰지 마라» 를 스스로 단다(3일 quick 의 24.7 을 판정으로 읽지 않게)');
  ok(!/② 말미 \d+일 한계 수급/.test(md) && /창 W\d+ · 실구간 \d+일/.test(md),
     '② 말미 라벨이 창 이름(W)과 **실구간**을 갈라 찍는다(옛 «말미 7일» 은 실제 2일이었다)');
}

/* ── [9] 20회차 — 판정 줄을 표가 전부 찍는다 (19-10 정정1·2·5·8) ──────────
   19회차의 세 비평가가 한 뿌리로 모은 것: «표 안에 있는 불리한 줄을 본문이 안 골랐다»
   (정정4·7·8·9) 와 «표에 없는 줄을 본문이 손으로 만들었다»(정정1·5). 자를 고치는 방향은
   하나다 — **본문이 «고를» 자리를 없앤다.** 이 절은 그 네 자리를 게이트로 굳힌다:
     ⓐ ① 판정 다섯 줄이 [G] 에 있고 **[D] 헤드라인과 문자까지 같은 수**다(표 두 벌 금지)
     ⓑ 단일 정책의 «비» 칸이 빈칸도 «-» 도 아니고 **못 잰다고 말한다**
     ⓒ [E3] 말미 축별 기울기가 정책마다 있고 그 합이 [E2] ② 줄과 대조된다
     ⓓ §8(최고 회차) 대조 줄이 판정 표 안에 상설로 있다
   무르게 풀지 않았음은 **§R9 되돌림**(픽스처로 ① 을 실제로 움직여 그 줄이 값을 따라오는지)
   이 못박는다 — 없으면 «① 이 늘 0 인 표» 도 이 절을 통과한다. */
console.log('[9] 20회차 — ① 판정 줄 · 단일 정책 «비» 칸 · [E3] 축별 기울기 · §8 상설 대조');
{
  const md = two.md || '';
  const one = run(['--days=2', '--seeds=1', '--policy=casual']);
  const om = one.md || '';
  const lineOf = (t, pre) => t.split('\n').find(l => l.startsWith(pre)) || '';
  const cellOf = (line) => line.split('|').map(s => s.trim()).filter((s, i, a) => i > 0 && i < a.length - 1);

  /* ⓐ ① 다섯 줄 — 두 정책 표에 전부 있다 */
  for (const [nm, pre] of [['적중', '| **① 목표 칸 적중'], ['창 밖 벽', '| **① 창 밖 벽'],
                           ['잉여', '| ① 잉여 벽'], ['첫 벽', '| ① 첫 벽(배정)'], ['간격', '| ① 벽 간격']])
    ok(!!lineOf(md, pre), `[G] 가 ① «${nm}» 줄을 찍는다(19-10 정정1 — ④ 의 다리를 «①» 이라 부른 자리)`);

  /* ⓐ' [D] ↔ [G] 동일값 — 헤드라인의 «적중 p50 = h/n» 과 «널 대비 ±x칸» 이 [G] 셀 안에 그대로 */
  {
    const heads = md.split('\n').filter(l => l.startsWith('**① 축 — 목표 칸 적중'));
    const g = cellOf(lineOf(md, '| **① 목표 칸 적중'));
    let same = 0;
    heads.forEach((h, i) => {
      const m = h.match(/적중 p50 = (\d+)\/(\d+)/);
      const d = h.match(/널 기준선 ([\d.]+) 대비 ([+\-]?[\d.]+)칸/);
      /* cellOf[0] 은 **행 이름**이다 — 정책 열은 1 부터다(20회차 1차 실행이 0/2 로 잡았다). */
      const cell = g[i + 1];
      if (!m || !d || !cell) return;
      if (cell.includes(`${m[1]}/${m[2]}`) && cell.includes(`널 ${d[1]} 대비 ${d[2]}칸`)) same++;
    });
    ok(heads.length === 2 && same === 2,
       `[G] ① 적중 셀이 [D] 헤드라인의 수를 **문자까지** 그대로 싣는다 (${same}/2 — 갈리면 자가 둘이다)`);

    /* ⚑ 20회차 비평 AAC(정정2) — 초판은 **다섯 줄 중 하나(적중)만** 값을 대조하고 나머지
       넷은 «줄이 있는가» 만 물었다. 첫 벽 칸이 −100% 인 채 초록이던 이유가 정확히 그것이다.
       ⇒ 나머지 넷도 [D] 헤드라인의 수와 맞댄다(창 밖·잉여·중복·첫 벽·간격). */
    /* ⚑ 20회차 — 대조는 **수로** 한다. 처음엔 문자열 포함으로 짰다가 두 항이 빨개졌는데,
       값이 아니라 **서식**이 달랐다: [D] 는 `1250분`·`3.05`(toFixed 2) · [G] 는 `1,250분`·
       `×3.053`(fmtN · toFixed 3). AAD 가 «문자 대조는 «한 자» 를 보장 못 한다» 고 한 것이
       이 자리다 — 한 자라는 보장은 코드(`JUDGE` 에 담아 재계산하지 않는다)가 지고, 게이트는
       **두 자리의 수가 같은가**를 서식과 무관하게 묻는다. 미정의는 양쪽 다 미정의여야 한다. */
    const num = (s) => { const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
    const pat = [
      ['창 밖 벽',  '| **① 창 밖 벽',  /창 밖 벽 p50 = (\d+)/,               (c) => num(c),                          0],
      ['잉여',      '| ① 잉여 벽',     /잉여 p50 = (\d+)/,                   (c) => num(c),                          0],
      ['창 안 중복', '| ① 잉여 벽',    /창 안 중복 p50 = (\d+)/,             (c) => num((c.match(/\(중복 ([\d,]+)\)/) || [])[1]), 0],
      ['첫 벽',     '| ① 첫 벽(배정)', /첫 벽\(배정\) p50 = ([\d,]+)분/,     (c) => (/미정의/.test(c) ? 0 : num(c)),  0],
      ['간격',      '| ① 벽 간격',     /벽 간격 기하평균 p50 = ([\d.]+|—)/,  (c) => (/미정의/.test(c) ? 0 : num(c.replace('×', ''))), 0.005],
    ];
    for (const [nm, pre, re, get, tol] of pat) {
      const g = cellOf(lineOf(md, pre));
      let hit = 0;
      heads.forEach((h, i) => {
        const m = h.match(re), cell = g[i + 1];
        if (!m || cell == null) return;
        const a = m[1].trim() === '—' ? 0 : num(m[1]), b = get(cell);
        if (a != null && b != null && Math.abs(a - b) <= tol) hit++;
      });
      ok(hit === 2, `[G] ① «${nm}» 셀이 [D] 헤드라인과 **같은 수**다 (${hit}/2 · 서식 무관 · 미정의는 양쪽 다 미정의)`);
    }
  }

  /* ⓐ'' 미정의는 미정의라고 적는다(13회차 JJ 규약) — 배정 벽 0개면 `firstOf` 는 0 을 돌려주고,
     그것을 목표로 나누면 «0분 / 목표 1,440분 = −100.0%» 라는 **측정치처럼 읽히는 수**가 찍힌다
     (20회차 1차 실행의 대충 열이 그랬다). 어느 표에서도 첫 벽 셀이 «0분 /» 로 시작하면 안 된다. */
  /* ⚑ 20회차 비평 AAE — 초판 정규식은 `\| ① 첫 벽[^|]*\|[^|]*0분 \/` 이라 **첫 열만** 봤다.
     벽이 0개인 쪽은 늘 둘째 열(대충)이라 그 항은 구조적으로 그 자리를 못 본다 — 20-7 이
     «죽였다» 고 적은 «0/0 공허» 가 치료약 안에서 재발한 꼴이다. ⇒ **모든 정책 열**을 본다. */
  for (const [nm, t] of [['두 정책', md], ['단일 정책', om]]) {
    const cs = t.split('\n').filter(l => l.startsWith('| ① 첫 벽')).flatMap(l => cellOf(l).slice(1, -1));
    ok(cs.length > 0 && cs.every(c => !/^0분 \//.test(c)),
       `${nm} 표의 ① «첫 벽» 칸이 벽 0개를 «0분 = −100.0%» 로 안 찍는다 — **정책 열 ${cs.length}개 전부** 검사(미정의는 미정의로)`);
  }

  /* ⓑ 단일 정책의 «비» 칸 — 빈칸·«-» 금지 */
  {
    const gs = om.split('## [G]')[1] || '';
    /* 단일 정책 [G] 는 세 칸이다 — [축 이름 | 그 정책 값 | 비]. 비 칸은 인덱스 2. */
    const rows = gs.split('\n').filter(l => /^\| /.test(l) && cellOf(l).length === 3 && !/^\|---/.test(l) && !/^\| 축 \|/.test(l));
    /* ⚑ 20회차 비평 AAC(정정4) — «빈칸도 «-» 도 아니다» 만 물으면 **다른 실행의 수**(§8 의
       1.861)가 비 칸에 앉아도 초록이다. ⇒ 모든 비 칸은 둘 중 하나여야 한다:
       «못 잰다» 이거나, **출처를 스스로 밝힌 대조 값**(«이 실행의 수가 아니다»). */
    const bad = rows.filter(l => { const c = cellOf(l)[2] || ''; return !/못 잰다|이 실행의 수가 아니다/.test(c); });
    ok(rows.length >= 10 && bad.length === 0,
       `단일 정책 [G] 의 «비» 칸이 전부 «못 잰다» 이거나 **출처를 밝힌 대조 값**이다 (행 ${rows.length} · 어긴 행 ${bad.length}건)`);
    ok(/정책 1개 — 못 잰다/.test(gs) && /다른 표끼리 나누지 마라/.test(gs),
       '그 칸이 «다른 표끼리 나누지 마라» 까지 적는다(19회차가 창이 다른 두 표를 나눈 자리)');
    ok(!!lineOf(om, '| **① 목표 칸 적중'), '단일 정책 md 도 ① 판정 줄을 찍는다');
    ok(/§0 «한 축 ≤50%»/.test(gs), '단일 정책 md 도 §0 ② «한 축 ≤50%» 를 찍는다');
  }

  /* ⓒ [E3] — 정책마다 있고, 합과 [E2] ② 줄의 어긋남을 자가 스스로 적는다 */
  {
    const n3 = md.split('\n').filter(l => l.startsWith('### [E3]')).length;
    ok(n3 === 2, `[E3] 말미 축별 기울기가 정책마다 있다 (${n3}/2)`);
    ok(md.split('\n').filter(l => l.startsWith('### [E3]')).every(l => /창 W\d+ · 실구간 \d+일/.test(l)),
       '[E3] 이 ② 와 **같은 창·같은 실구간**을 라벨에 적는다(표 두 벌 금지 — tailRate 와 한 벌)');
    ok(/축별 p50 의 합.*합계의 p50.*어긋남 [\-\d.]+%/.test(md.replace(/\n/g, ' ')),
       '[E3] 이 «축별 p50 의 합 ↔ 합계의 p50» 어긋남을 스스로 적는다(8회차 정정1 규약)');
    ok(!!lineOf(om, '### [E3]'), '단일 정책 md 도 [E3] 을 찍는다');
    /* 시드 1이면 med(합) = Σ med(축) 이라 어긋남은 정확히 0.00% 여야 한다 — 자가 자기 산수를 검산한다 */
    const gap = (om.match(/어긋남 ([\-\d.]+)%/) || [])[1];
    ok(gap != null && Math.abs(+gap) < 0.005, `시드 1 실행에서 그 어긋남이 0 이다 (${gap == null ? '—' : gap}% — 아니면 두 자가 다른 것을 재고 있다)`);
  }

  /* ⓓ §8 상설 대조 */
  /* ⚑ 20회차 비평 AAD — 초판은 `102.1`·`190.1`·`1.861` 을 **정규식으로 되받았다**. 그 수는
     `bot199.js` 에 리터럴로 박혀 있으므로 게이트가 같은 수를 다시 적으면 **§8 수의 세 번째
     사본**(문서 · 자 · 게이트)이 되고, 셋이 같이 낡는다 — 이 회차가 금한 «표 두 벌» 이다.
     ⇒ 게이트는 **줄이 있는가 · 출처를 스스로 밝히는가**만 묻는다(값의 원본은 §8 한 곳). */
  ok(/§8 대조\(8회차 = 최고 회차 · 상설\)/.test(md) && /«처음» 을 말하기 전에 이 줄과 맞대라/.test(md),
     '판정 표가 §8(최고 회차)을 상설로 곁에 둔다(«처음» 이 네 번 재발한 자리 — 19-10 정정2)');
  ok(/§8 대조/.test(om) && /이 실행의 수가 아니다/.test(om),
     '단일 정책 표의 §8 줄이 «이 실행의 수가 아니다» 를 스스로 단다(다른 실행의 수가 «비» 칸에 앉는 것을 막는다)');
  /* ⓒ' AAD — [E3] 은 **유입만** 분해한다. ④ 의 판정 장부(유입 − 소환 외 씽크)로 읽히지 않게
     씽크 줄과 «= 소환 예산 장부 말미» 를 같은 표가 짓는지 묻는다. */
  ok(/소환 외 씽크 — \*\*축별 분해 없음\*\*/.test(md) && /= 소환 예산 장부 말미/.test(md),
     '[E3] 이 «씽크는 축별 분해가 없다» 를 밝히고 판정 장부 말미를 같은 표에서 짓는다');

  /* §R9 되돌림 — ① 줄이 값을 실제로 따라오는가(늘 0 인 표는 이 절을 통과하면 안 된다) */
  const w = run(['--days=4', '--seeds=1', '--policy=diligent', '--wallband=10']);
  const wl = cellOf(lineOf(w.md || '', '| **① 창 밖 벽'));
  const wn = wl[1] ? +(wl[1].match(/^(\d+)/) || [])[1] : -1;   /* [1] = 그 정책 열(단일 정책) */
  ok(wn >= 1, `§R9 되돌림 — 벽을 촘촘히 만든 픽스처(--wallband=10)에서 [G] ① «창 밖 벽» 이 실제로 늘어난다 (${wn}건 ≥ 1 · 위 항들이 0 위의 공허참이 아니다)`);
  const wh = lineOf(w.md || '', '**① 축 — 목표 칸 적중');
  const wm = (wh.match(/창 밖 벽 p50 = (\d+)/) || [])[1];
  ok(wm != null && +wm === wn, `그 픽스처에서도 [D](${wm == null ? '—' : wm}) 와 [G](${wn}) 가 같은 수다`);
}

/* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
console.log('[R] 되돌림 — 보정치를 실제로 쓰고 있는가');
{
  const norm = run(['--days=2', '--seeds=1', '--policy=diligent']);
  const nof  = run(['--days=2', '--seeds=1', '--policy=diligent', '--nofloor']);
  const A = norm.rep && norm.rep.policies.diligent[0];
  const Bn = nof.rep && nof.rep.policies.diligent[0];
  ok(!!A && !!Bn, '두 실행 모두 표를 냈다');
  if (A && Bn) {
    ok(nof.rep.nofloor === true, '--nofloor 가 tFloor 를 0 으로 세웠다');
    /* ⚠ **끝 스테이지로 재면 안 된다.** 이틀이면 둘 다 같은 «벽» 에 걸려 멎으므로 끝값이 같다
       (실제로 s360 = s360 이 나왔다) — 하한이 누르는 것은 «벽까지 얼마나 빨리 가는가» 지
       «벽을 넘느냐» 가 아니다. 그래서 1일차 **첫 10분 행**으로 잰다. */
    const a0 = A.day1 && A.day1[0], b0 = Bn.day1 && Bn.day1[0];
    ok(!!a0 && !!b0, '1일차 분 단위 행이 있다');
    if (a0 && b0)
      ok(b0.stage > a0.stage,
         `하한을 빼면 첫 ${a0.minute}분에 더 멀리 간다: s${a0.stage} → s${b0.stage} (하한이 결과를 실제로 누른다)`);
  }
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
console.log(`\nVERIFY494 ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
