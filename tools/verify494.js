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
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v494-'));
const run = (args) => {
  const md = path.join(tmp, 'r' + Math.random().toString(36).slice(2) + '.md');
  const js = md.replace(/\.md$/, '.json');
  const t0 = Date.now();
  let code = 0;
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'bot199.js'), ...args, '--out=' + md, '--json=' + js],
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

/* ── [2] 예산 — 30일 1회 ≤ 2분 ────────────────────────────────────────── */
console.log('[2] 예산 — 30일 1회 실행 ≤ 2분');
let base = null;
if (FAST) {
  console.log('       (--fast — 건너뜀)');
} else {
  base = run(['--days=30', '--seeds=1', '--policy=diligent']);
  ok(base.code === 0, `종료 코드 0 (실제 ${base.code})`);
  ok(base.sec <= 120, `30일 1시드 ${base.sec.toFixed(1)}초 ≤ 120초`);
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
  ok(!om.includes('## [G] 정책 대조'), '단일 정책 md 에는 [G] 대조표가 없다(가드 그대로 — 이 항이 아래 항의 전제다)');
  ok(/### \[E2\] ④ 교차일 · ② 말미 한계 — 대충 유저/.test(om), '단일 정책 md 에 [E2] 판정 절이 있다');
  for (const nm of ['유입 장부', '소환 예산 장부'])
    ok(new RegExp('\\| \\*\\*④ 교차일\\([^|]*' + nm + '[^|]*\\*\\* \\| [^|]+ \\|').test(om),
       `단일 정책 md 가 «${nm}» 의 ④ 교차를 자기 표에 찍는다`);
  ok(/\| ② 말미 한계 수급\/일 〔유입 장부 · 창 W\d+ · 실구간 \d+일/.test(om), '단일 정책 md 가 ② 말미 한계 수급을 찍는다(④ 외삽의 기울기 · 창 이름과 실구간을 갈라 찍는다)');

  /* [E2] ↔ [G] — 같은 함수 하나를 읽는가. 정책 이름으로 [G] 의 열을 찾아 셀 문자열을 맞댄다. */
  const md = two.md || '';
  const cellOf = (line) => line.split('|').map(s => s.trim()).filter((s, i, a) => i > 0 && i < a.length - 1);
  const gHead = (md.split('\n').find(l => /^\| 축 \|/.test(l) && /비 \|$/.test(l)) || '');
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
