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
  ok(c.rows.every(r => r.kills > 0), '표본마다 실제 처치가 있었다(대역 밖 표본 0)');
  ok(c.rows.every(r => r.bossSec > 0), '표본마다 보스전이 실제로 섰다');
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
