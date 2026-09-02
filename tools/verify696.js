'use strict';
/* ==========================================================================
   verify696 — «즉사하는 게이트» 방지 자   (작업 696, 2026-09-01)
   --------------------------------------------------------------------------
   무엇을 지키는가
     199 21회차가 주인 결정 결3 ⓑ 를 이행하며 `OFF_MAX_H`(1회 적립 상한 6h)를 **선언째**
     걷어내고 자르는 축을 `OFF_DAY_CAP_MIN`(하루 예산 1,440분) 하나로 옮겼다. 그때 이관을
     받은 것은 `sim112`·`sim131` 둘뿐이었고, 같은 상수를 **정규식으로** 읽던 `sim168`·`sim177`·
     `sim249` 는 그대로 남아 **즉사**했다(`… 를 못 찾았다` + 종료 코드 1). `verify177` 은 그
     sim177 을 자식 프로세스로 부르므로 **스택 트레이스로 같이 죽었다.**
     ⇒ 이 자는 그 병을 «다음에도» 잡는다. 고친 자리 셋을 다시 재는 것이 아니라,
       **제품에서 사라진 선언을 아직 찾는 도구가 저장소에 하나라도 있으면 빨개진다.**

   절
     [A] 즉사 스윕 — `num(/const X…/)`·`pick(/const X…/)` 꼴(= 못 찾으면 process.exit(1))로
         제품 선언을 읽는 **모든** 도구의 X 가 index.html 에 실제로 있는가. 미해결 0 이어야 한다.
         ⚠ 스코프는 «즉사 꼴» 로 좁혀 뒀다 — 맨 `SRC.match(/const X/)` 는 **없어야 통과**하는
           음성 단언에도 쓰인다(예: `sim112` 가 168 이 폐기한 `TRAIN_VAL_KNEE` 의 부재를 잰다).
           그 둘을 한 자로 묶으면 «폐기를 확인하는 항» 이 곧바로 거짓 빨강이 된다.
     [B] A/B — 구 상한(6h) 사본과 현행(`OFF_DAY_CAP_MIN` — 값은 제품에서 읽는다 · 199 25회차에
         1,440분(24h) → **660분(11h)** 으로 내려갔다)의 출력을 직접 대조한다.
         이름만 갈아 끼운 것이 아니라 **뜻이 바뀐** 이관이라, 어디가 움직이고 어디가 안
         움직이는지를 자가 말한다(sim168·sim249 = 완전 동일 · sim177 = 판정 14항 전부 동일,
         표시표의 s ≥ 160 행만 이동).
     [C] 셋 다 끝까지 돈다 — 종료 코드 0 + `PASS`.
     [D] `verify177` 위생 되돌림 — 자식(sim177)이 죽어도 **스택 트레이스가 아니라 한 항의 빨강**
         으로 적힌다(653 의 반대 방향 사고 = «읽을 수 없는 빨강»).
     [E] [A] 자신의 되돌림 — 없는 상수를 가리키는 도구 사본을 심으면 [A] 가 실제로 빨개진다.

   ⚠ 임시 사본은 전부 `.v696-*-<pid>.js`(648 — 고정 이름 사본은 병렬 실행에서 서로를 지운다).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOLS = __dirname;
const ROOT  = path.resolve(__dirname, '..');
const SRC   = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const R = [];
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });

const tmps = [];
function tmp(tag, body){
  const p = path.join(TOOLS, '.v696-' + tag + '-' + process.pid + '.js');
  fs.writeFileSync(p, body);
  tmps.push(p);
  return p;
}
function run(file){
  try {
    /* stderr 를 명시적으로 파이프한다 — execFileSync 의 기본값은 «부모에게 흘려보내기» 라
       [D] 가 잡아야 할 죽음의 문장이 콘솔로 새고 `e.stderr` 는 비어 버린다. */
    return { code: 0, err: '', msg: '', out: execFileSync(process.execPath, [file],
             { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    /* err = **자식이 찍은 것** · msg = 내 wrapper 가 만든 문장(«Command failed: …»).
       둘을 섞으면 [D1] 이 자기 wrapper 의 문장을 자식 것으로 오인해 영원히 빨갛다(1회차). */
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || ''),
             err: String(e.stderr || ''), msg: String(e.message || '') };
  }
}

/* ── [A] 즉사 스윕 ────────────────────────────────────────────────── */
console.log('[A] 즉사 스윕 — «못 찾으면 exit(1)» 꼴로 제품 선언을 읽는 도구 전부');
const DIE_RE = /\b(?:num|pick)\(\s*\/(?:\^)?const\\?s?\*?\s*([A-Za-z_$][\w$]*)/g;
/* extra = [{f, t}] — 파일로 안 쓰고 넘기는 표본([E] 되돌림용).
   ⚠ 파일로 쓰면 **동시에 도는 다른 워커의 verify696 이 그 유령을 보고 빨개진다**(워커 4대).
   ⚠ `.` 로 시작하는 이름은 건너뛴다 — 남의 세션이 돌리고 있는 임시 사본(`.v553-simneg-*` 등)이다. */
function sweep(dir, extra){
  const miss = []; let n = 0;
  const files = fs.readdirSync(dir).filter(x => x.endsWith('.js') && !x.startsWith('.'))
                  .map(f => ({ f, t: fs.readFileSync(path.join(dir, f), 'utf8') }))
                  .concat(extra || []);
  for (const { f, t } of files){
    let m; DIE_RE.lastIndex = 0;
    while ((m = DIE_RE.exec(t))){
      n++;
      if (!new RegExp('const\\s+' + m[1] + '\\s*=').test(SRC)) miss.push(f + ' :: ' + m[1]);
    }
  }
  return { n, miss };
}
const sw = sweep(TOOLS);
yes('[A1] 표본이 실제로 있다 (' + sw.n + '건 — 0 이면 자가 아무것도 안 재는 것이다)', sw.n >= 40);
eq('[A2] 제품에 없는 선언을 아직 찾는 도구 ' + (sw.miss.length ? ':: ' + sw.miss.join(' / ') : ''), sw.miss.length, 0);
/* 696 이 실제로 고친 넷은 이름으로도 못박는다 — 스윕이 언젠가 좁아져도 이 셋은 남는다 */
for (const f of ['sim168.js', 'sim177.js', 'sim249.js']){
  const t = fs.readFileSync(path.join(TOOLS, f), 'utf8');
  yes('[A3] ' + f + ' 가 폐지된 `OFF_MAX_H` 를 더는 안 찾는다', !/const\s+OFF_MAX_H/.test(t.replace(/OFF_MAX_H`/g, '')));
  yes('[A4] ' + f + ' 가 살아 있는 축 `OFF_DAY_CAP_MIN` 을 읽는다', /num\(\/const OFF_DAY_CAP_MIN/.test(t));
}
yes('[A5] 제품에 `OFF_DAY_CAP_MIN` 선언이 실제로 있다', /const\s+OFF_DAY_CAP_MIN\s*=\s*\d+/.test(SRC));
yes('[A6] 제품에 `OFF_MAX_H` 선언은 없다 (199 21회차가 선언째 걷어냈다)', !/const\s+OFF_MAX_H\s*=/.test(SRC));

/* ── [B] A/B — 구 상한 6h ↔ 현행 ─────────────────────────────────── */
console.log('\n[B] A/B — 구 상한(6h) 사본과 대조: 무엇이 움직이고 무엇이 안 움직이는가');
const NEW = {}, OLD = {};
for (const name of ['sim168', 'sim177', 'sim249']){
  const src = fs.readFileSync(path.join(TOOLS, name + '.js'), 'utf8');
  const old = src.replace(/^const OFF_H = num\(\/const OFF_DAY_CAP_MIN.*$/m, 'const OFF_H = 6;');
  yes('[B0] ' + name + ' 에 구 상한 사본을 실제로 심었다', old !== src && /^const OFF_H = 6;$/m.test(old));
  NEW[name] = run(path.join(TOOLS, name + '.js'));
  OLD[name] = run(tmp('old-' + name, old));
}
const gates = s => (s.match(/^\s*(?:PASS|FAIL|⏸199) — .*$/gm) || []).join('\n');
for (const name of ['sim168', 'sim249']){
  eq('[B1] ' + name + ' — 구·신 상한 출력이 완전 동일 (유휴 가정이 두 상한 아래라 안 닿는다)',
     OLD[name].out === NEW[name].out, true);
}
/* sim177 만 유휴 가정 `hh = H_MAX·s/80` 가 s ≥ 160 에서 6h 를 넘는다 */
eq('[B2] sim177 — 판정 14항의 결과는 구·신이 완전 동일', gates(OLD.sim177.out) === gates(NEW.sim177.out), true);
const rows = s => (s.match(/^\s*(\d+) \|\s*(\d+) \|/gm) || []);
const dLines = NEW.sim177.out.split('\n').filter((l, i) => l !== OLD.sim177.out.split('\n')[i]);
yes('[B3] sim177 — 움직인 줄이 있고(뜻이 바뀐 이관이다) 전부 s ≥ 160 행이다 (' + dLines.length + '줄)',
    dLines.length > 0 && dLines.every(l => {
      const m = l.match(/^\s*(\d+) \|/);
      return m ? Number(m[1]) >= 160 : /1e\+|M=/.test(l);      /* [F] 민감도 줄은 s300 값을 인용한다 */
    }));
const lv = (s, st) => { const m = s.match(new RegExp('^\\s*' + st + ' \\|\\s*(\\d+) \\|', 'm')); return m ? Number(m[1]) : null; };
eq('[B4] sim177 s80 도달 Lv 는 구·신이 같다 (판정이 보는 구간)', lv(NEW.sim177.out, 80), lv(OLD.sim177.out, 80));
eq('[B5] sim177 s170 도달 Lv — 구 621 → 신 622', lv(OLD.sim177.out, 170) + '→' + lv(NEW.sim177.out, 170), '621→622');
eq('[B6] sim177 s300 도달 Lv — 구 1051 → 신 1063 (최대 이동 +1.14%)',
   lv(OLD.sim177.out, 300) + '→' + lv(NEW.sim177.out, 300), '1051→1063');

/* ── [C] 셋 다 끝까지 돈다 ───────────────────────────────────────── */
console.log('\n[C] 세 자가 즉사하지 않는다');
eq('[C1] sim168 종료 코드', NEW.sim168.code, 0);
yes('[C2] sim168 PASS', /SIM168 PASS/.test(NEW.sim168.out));
eq('[C3] sim177 종료 코드', NEW.sim177.code, 0);
yes('[C4] sim177 PASS', /SIM177 PASS \(\d+\/\d+\)/.test(NEW.sim177.out));
eq('[C5] sim249 종료 코드', NEW.sim249.code, 0);
yes('[C6] sim249 PASS', /SIM249 PASS \(\d+\/\d+\)/.test(NEW.sim249.out));

/* ── [D] verify177 위생 되돌림 ───────────────────────────────────── */
console.log('\n[D] verify177 — 자식이 죽어도 «읽을 수 있는 빨강» 으로 끝난다 (되돌림 시험)');
const deadSim = tmp('deadsim', 'console.error("SIM177 FAIL — (v696 되돌림 시험) 일부러 죽인 사본");\nprocess.exit(1);\n');
const v177 = fs.readFileSync(path.join(TOOLS, 'verify177.js'), 'utf8');
const v177neg = v177.replace(/'sim177\.js'/g, JSON.stringify(path.basename(deadSim)));
yes('[D0] 죽은 sim177 을 물린 verify177 사본을 심었다', v177neg !== v177);
const dr = run(tmp('v177neg', v177neg));
/* 자식(verify177 사본)이 **자기 stderr 로** 스택 트레이스를 뱉지 않는지 본다 — 수리 전에는
   `Error: Command failed … at genericNodeError …` 가 통째로 여기 찍히고 집계는 없었다. */
yes('[D1] 스택 트레이스로 즉사하지 않는다 (자식 stderr 에 `Command failed`·스택 없음)',
    !/Command failed|genericNodeError|at checkExecSyncError/.test(dr.err || ''));
yes('[D2] 자식의 죽음이 «한 항의 빨강» 으로 적힌다', /⑤ sim177 이 끝까지 돌았다 \[죽음:/.test(dr.out));
yes('[D3] 그리고 자는 집계까지 간다 (VERIFY177 n/m FAIL)', /VERIFY177 \d+\/\d+ FAIL/.test(dr.out));
/* 살아 있는 자는 반대로 그 항이 아예 없고 초록으로 끝난다 — [D1~D3] 이 «항상 참» 이 아님을 못박는다 */
const dOk = run(path.join(TOOLS, 'verify177.js'));
yes('[D4] 멀쩡한 verify177 은 그 죽음 항이 없고 PASS 로 끝난다',
    !/\[죽음:/.test(dOk.out) && /VERIFY177 \d+\/\d+ PASS/.test(dOk.out));

/* ── [E] [A] 자신의 되돌림 ──────────────────────────────────────── */
console.log('\n[E] [A] 되돌림 — 없는 상수를 가리키는 도구를 심으면 스윕이 빨개진다');
/* ⚠ 이 파일 자신도 스윕 대상이다 — 표본 문자열을 통째로 적으면 **이 자가 자기 문장에 걸려**
   [A2] 가 상시 빨개진다(1회차에 실제로 그랬다). 그래서 조각으로 짜 맞춘다. */
const GH = 'V696_GHOST' + '_CONST';
const ghost = { f: 'v696-ghost(메모리 표본).js',
  t: 'const X = num(/' + 'const ' + GH + '\\s*=\\s*(\\d+)/, "' + GH + '");\n' };
const sw2 = sweep(TOOLS, [ghost]);
yes("[E1] 그 사본이 스윕에 잡힌다", sw2.miss.some(x => x.indexOf(GH) >= 0));
eq('[E2] 그리고 잡히는 것은 그 사본 하나뿐이다 (진짜 미해결은 여전히 0)',
   sw2.miss.filter(x => x.indexOf(GH) < 0).length, 0);
eq('[E3] 그 표본을 빼면 스윕은 다시 0', sweep(TOOLS).miss.length, 0);

/* ── 집계 ────────────────────────────────────────────────────────── */
for (const p of tmps) { try { fs.existsSync(p) && fs.unlinkSync(p); } catch (e) {} }
const fail = R.filter(x => !x.pass);
console.log('');
R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + (x.pass ? '' : ' (want ' + x.want + ')')));
console.log('\nVERIFY696 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
process.exit(fail.length ? 1 : 0);
