#!/usr/bin/env node
/* 작업 615 게이트 — «보정 보스 표본이 «격파» 로 끝나지 않는다»(κ_boss 결손)
 *
 *   node tools/verify615.js [--stages=1] [--full]
 *
 * 등재문의 처방을 그대로 항으로 옮긴다:
 *   [1] 파일·문법
 *   [2] 창의 끝 이유를 **관측**한다 — `sampleBoss` 가 «격파/사망/시간 초과» 를 갈라 적는가
 *   [3] 생존 목표가 **제품에서 온다** — 상수 사본이 제품 리터럴과 같은가(두 벌이면 조용히 갈린다)
 *   [4] 생존 펌프가 **화력 축을 안 산다** — 이것이 «몹 축 불변» 의 유일한 근거다
 *   [5] 순서 — 생존 펌프는 몹 표본 **뒤**에 돈다(앞에 두면 κ_dps 가 과충 클리핑으로 무너진다)
 *   [6] 보스 축은 **자기 유효 조건**을 갖는다 — 판정식 한 곳 · κ_boss 는 그 행만 읽는다
 *   [7] 표가 매 실행 말한다 — «격파 n/N · 자에 쓰는 행 n» 과 끝 이유 칸
 *   [R] 되돌림 시험 — 생존 펌프를 뺀 사본(`--only=base`)은 s1 에서 **사망**으로 끝난다.
 *       이 항이 없으면 이 게이트는 «펌프를 짜 놓고 안 부르는» 자도 통과시킨다.
 *
 * ⚠ [R]·[2] 는 실제로 브라우저를 띄운다(앵커 1개 ≈ 1~2분). `--full` 이면 s200 도 같이 본다
 *   (상한에서 멈추는 자리 — «생존과 화력을 동시에 만족시키는 캐릭터가 없다» 는 실측).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FULL = process.argv.includes('--full');
const argStages = (process.argv.find(a => a.startsWith('--stages=')) || '').split('=')[1];
const STAGES = argStages || (FULL ? '1,200' : '1');
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

const BOT = fs.readFileSync(path.join(ROOT, 'tools', 'bot199.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'latin1');

/* ── [1] 파일·문법 ────────────────────────────────────────────────────── */
console.log('[1] 파일·문법');
for (const f of ['tools/bot199.js', 'tools/probe615.js']) {
  const p = path.join(ROOT, f);
  ok(fs.existsSync(p), f + ' 존재');
  if (!fs.existsSync(p)) continue;
  let syn = true;
  try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); } catch (_) { syn = false; }
  ok(syn, f + ' 문법');
}
/* 615 는 자 작업이다 — 제품은 한 줄도 안 건드린다 */
ok(!BOT.includes("writeFileSync(path.join(ROOT, 'index.html'"), 'bot199 이 index.html 을 쓰지 않는다(읽기 전용 관찰자)');

/* ── [2] 창의 끝 이유 ─────────────────────────────────────────────────── */
console.log('[2] 창의 끝 이유를 관측한다(«사라졌다» 한 갈래가 아니다)');
ok(/const endBy = !seen \? 'none' : killed \? 'kill' : died \? 'death'/.test(BOT),
   '`sampleBoss` 가 none/kill/death/cap/gone 을 갈라 적는다');
ok(/player\.hp <= 0 \|\| player\.dead > 0\) died = true/.test(BOT),
   '사망은 **관측**이다(제품 상태를 프레임마다 읽는다 — 추론이 아니다)');
ok(/bossEndBy: b\.endBy/.test(BOT), '행이 `bossEndBy` 를 들고 다닌다(판정만 남기면 원인을 못 캔다)');
/* 11회차의 물리 판정은 그대로여야 한다 — 이 행이 그것을 무르게 풀면 615 가 되돌아온다 */
ok(/dmgAcc >= hp0 \* \(1 - 1e-9\)/.test(BOT), '격파 판정은 11회차의 **물리**(창 안 피해 ≥ 창 시작 체력) 그대로');

/* ── [3] 생존 목표가 제품에서 온다 ────────────────────────────────────── */
console.log('[3] 생존 목표 — 상수 사본이 제품과 같다');
const ivBot = (BOT.match(/const HIT_IV = ([\d.]+);/) || [])[1];
/* ⚠ `player.inv` 는 제품에 **두 자리**다 — 부활 무적(1.2)과 **피격 무적**(0.4). 우리가 베낀 것은
   뒤엣것이라 «접촉 피해 바로 앞 줄» 로 못박는다(앞 자리를 잡으면 이 항이 거짓으로 빨개진다). */
const ivIdx = (IDX.match(/player\.inv = ([\d.]+);\s*\r?\n\s*player\.hp -= e\.dmg/) || [])[1];
ok(ivBot != null && ivIdx != null && Number(ivBot) === Number(ivIdx),
   `피격 무적 ${ivBot} (bot199 HIT_IV) = ${ivIdx} (index.html — 접촉 피해 직전 player.inv)`);
ok(/survNeed = \(s\) => eDmg\(s\) \* ETYPE\.boss\.dmg \* stat\.defMul \* sbDef\(\) \* \(BOSS_SEC \/ HIT_IV\)/.test(BOT),
   '생존 목표 = (한 대 피해) × (BOSS_SEC / 무적) — 제품의 세 손잡이(eDmg·ETYPE.boss.dmg·defMul)를 그대로 읽는다');
ok(/survHave = \(\) => stat\.maxHp \+ stat\.regen \* BOSS_SEC/.test(BOT),
   '가진 것 = 체력 + 창 안 회복(회복을 빼면 목표가 거짓으로 높아진다)');
const overBot = (BOT.match(/const BOSS_OVER = (\d+);/) || [])[1];
const overDoc = (BOT.match(/const BOSS_OVER_DOC = (\d+);/) || [])[1];
ok(overBot != null && overBot === overDoc, `화력 과충 상한 사본이 같다 — BOT_SRC ${overBot} = 표 ${overDoc}`);

/* ── [4] 생존 펌프가 화력 축을 안 산다 ────────────────────────────────── */
console.log('[4] 생존 펌프는 화력 손잡이를 안 산다(= 몹 축 불변의 근거)');
const surv = (BOT.match(/const survOnce = \(\) => \{[\s\S]*?\n  \};/) || [''])[0];
ok(/\['hp', 'regen', 'def'\]/.test(surv), '`survOnce` 가 미는 UPG 는 hp·regen·def 뿐이다');
ok(/if \(id === 'atk'\) continue;/.test(surv), '훈련 «공격력» 은 건너뛴다(화력 축이다)');
for (const k of ['atk', 'aspd', 'crit', 'cdmg', 'pierce'])
  ok(!new RegExp(`U\\['?${k}'?\\]|'${k}'\\s*,\\s*'`).test(surv.replace(/if \(id === 'atk'\) continue;/, '')),
     `\`survOnce\` 에 화력 손잡이 \`${k}\` 가 없다`);

/* ── [5] 순서 ─────────────────────────────────────────────────────────── */
console.log('[5] 순서 — 생존 펌프는 몹 표본 뒤에 돈다');
const iMob = BOT.indexOf('const m = sampleMobs(s, sec);');
const iSurv = BOT.indexOf('const sv = pumpSurv(s, dpsNow);');
const iBoss = BOT.indexOf('const b = sampleBoss(s);');
ok(iMob > 0 && iSurv > iMob, '`sampleMobs` → `pumpSurv` 순서(뒤집으면 κ_dps 가 과충 클리핑으로 무너진다)');
ok(iBoss > iSurv, '`pumpSurv` → `sampleBoss` 순서(보스 창은 생존을 맞춘 캐릭터로 찍힌다)');
ok(/const dpsBoss = stat\.dps;/.test(BOT) && /kBoss: b\.sec > 0 \? \(b\.dmg \/ b\.sec\) \/ \(dpsBoss \|\| 1\)/.test(BOT),
   'κ_boss 의 분모가 **그 창을 찍은 캐릭터**의 화력이다(펌프 전 값을 쓰면 비가 거짓이 된다)');

/* ── [6] 보스 축의 유효 조건 ──────────────────────────────────────────── */
console.log('[6] 보스 축은 자기 유효 조건을 갖는다');
ok((BOT.match(/const bossValid = r =>/g) || []).length === 1, '판정식은 한 곳이다(표 두 벌 금지 — `calValid` 와 같은 규약)');
ok(/r\.bossKilled === true[\s\S]{0,200}r\.bossOver <= BOSS_OVER/.test(BOT),
   '유효 = 격파했다 **그리고** 과충이 상한 안이다(격파해도 한 대에 지웠으면 그 수는 클리핑이다)');
ok(/key === 'kBoss' \? r\.bossValid !== false : r\.valid !== false/.test(BOT),
   '`kAt` 가 κ_boss 만 `bossValid` 로 거른다 · 옛 세대 캐시는 «없으면 유효»');
ok(/row\.bossValid = bossValid\(row\);/.test(BOT), '행이 `bossValid` 를 들고 다닌다');

/* ── [7] 표가 말한다 ──────────────────────────────────────────────────── */
console.log('[7] 표가 매 실행 «격파 n/N · 자에 쓰는 행 n» 을 말한다');
ok(/격파 \$\{killedN\}행 · κ_boss 를 자에 쓰는 행 \$\{bOk\.length\}행/.test(BOT), '[A] 아래 줄이 두 수를 같이 찍는다');
ok(/창이 끝난 이유 \| 생존\(달성\/목표\)/.test(BOT), '[A] 표에 «창이 끝난 이유»·«생존(달성/목표)» 칸이 있다');
ok(/보스 축 \|/.test(BOT), '[A] 표에 «보스 축» 유효 칸이 있다');

/* ── [R] 되돌림 시험 — 실제로 굴린다 ──────────────────────────────────── */
console.log(`[R] 되돌림 시험 — probe615 --stages=${STAGES} (base ↔ surv)`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v615-'));
const js = path.join(tmp, 'p615.json');
let code = 0, out = '';
try {
  out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'probe615.js'), '--stages=' + STAGES, '--sec=20', '--json=' + js],
                     { cwd: ROOT, stdio: 'pipe', timeout: 40 * 60 * 1000 }).toString();
} catch (e) { code = e.status == null ? -1 : e.status; out = (e.stdout || '').toString(); }
ok(code === 0, `probe615 종료 코드 ${code}`);
if (fs.existsSync(js)) {
  const rows = JSON.parse(fs.readFileSync(js, 'utf8'));
  const b1 = rows.find(r => r.s === 1 && !r.surv), v1 = rows.find(r => r.s === 1 && r.surv);
  ok(b1 && b1.endBy === 'death' && !b1.killed, `s1 [base] 창이 **사망**으로 끝난다(수리 전 그림) — ${b1 && b1.endBy}`);
  ok(v1 && v1.endBy === 'kill' && v1.killed, `s1 [surv] 창이 **격파**로 끝난다(수리 후) — ${v1 && v1.endBy}`);
  ok(b1 && v1 && v1.survPump > b1.survPump, `s1 생존 ${b1 && b1.survPump.toExponential(2)} → ${v1 && v1.survPump.toExponential(2)}`);
  ok(b1 && v1 && Math.abs(b1.dps0 - v1.dps0) <= Math.abs(b1.dps0) * 1e-12 && b1.kills === v1.kills,
     `s1 몹 축 불변 — 화력 ${b1 && b1.dps0.toExponential(3)} · 60초 처치 ${b1 && b1.kills}`);
  ok(v1 && v1.over <= Number(overBot), `s1 은 순수 생존 손잡이만으로 닿는다 — 화력 과충 ×${v1 && v1.over.toExponential(2)} ≤ ${overBot}`);
  const b2 = rows.find(r => r.s === 200 && !r.surv), v2 = rows.find(r => r.s === 200 && r.surv);
  if (b2 && v2) {
    /* ⚠ 상한은 눈금 **앞**에서 보므로 거친 손잡이 한 눈금만큼 넘길 수 있다 — «상한 근처에서
       멈췄다» 를 묻지 «상한 이하» 를 묻지 않는다(후자면 이 항이 눈금 폭 때문에 흔들린다). */
    ok(v2.over > 1.0000001 && v2.over < Number(overBot) * 10, `s200 은 상한 근처에서 멈춘다 — 화력 과충 ×${v2.over.toExponential(2)} (상한 ×${overBot} · 눈금 하나 여유)`);
    ok(v2.survPump < 1, `s200 은 상한 안에서 생존 목표에 **못 닿는다** ${v2.survPump.toExponential(2)} — «두 축을 동시에 만족시키는 캐릭터가 그 구간에 없다» 는 실측(199 이관)`);
  }
} else ok(false, 'probe615 --json 산출 없음');

console.log(`\nverify615 — ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
