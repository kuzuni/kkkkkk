/* 작업 928 게이트 — «`verify856` 의 측정 상자가 벽시계를 안 탄다»
 *
 *   node tools/verify928.js
 *
 * ── 무엇을 지키는가 ──────────────────────────────────────────────────────
 * 928 등재문: `verify856` [B11] 이 8회에 1회 빨갛다(`flask` 마루 덮임 **0.745** ↔ 문턱 0.75).
 * 등재문이 남긴 물음은 «덮임이 왜 실행마다 흔들리는가 — 재는 자리의 잡음인가 굽기의 잡음인가» 였고,
 * `probe928` 이 **셋째 답**을 찍었다: 굽기도 자도 아니고 **«어디서 재는가»** 다.
 *   · 자는 순수 함수다 — 한 페이지 안에서 같은 발을 5회 그려 재면 화소가 **비트 단위로 같다**.
 *   · 굽기도 아니다 — 구운 스프라이트 지문이 판을 넘어 같다.
 *   · 흔들린 것은 **측정 상자의 자리**다. 상자는 `player.x` 에 매달려 있는데(`CX = player.x + ox + 180`)
 *     855 가 못박은 것은 **적 한 쪽뿐**이었다(`foe.x = 300 - ox`). 플레이어는 `page.goto` 뒤
 *     `waitForTimeout(1100)` 동안 **제품의 제 루프**가 그때그때 다른 프레임 수로 돌려 놓는다
 *     (주사위와 무관하다 — `probe928` 무보정 4판: 952.6 / 974.3 / 965.7 / 957.0).
 *     상자가 20px 넘게 움직이면 그 자리의 **바탕**(오라 가장자리·바닥)이 바뀌고, 층 분해
 *     `al = 1 − d2/d1` 의 가장자리 화소가 뒤집혀 `flask` 덮임이 0.745~0.919 로 흔들린다.
 *
 * ⚠ **문턱을 올려서 닫지 않았다**(등재문 명시). `COVER` 0.75 는 한 글자도 안 건드렸고,
 *   고친 것은 «재는 자리를 못박는 한 줄» 이다 — 수리 뒤 `flask` 덮임은 **0.851 고정**이다
 *   (문턱까지 여유 0.101 · 수리 전 최악 0.745 는 −0.005 였다).
 *
 * 절:
 *   [1] 선언 — `verify856` 이 CX 를 재기 **전에** 플레이어를 못박고, 자리는 제품의 «집»에서 파생한다.
 *   [2] 결정성 — 못박은 자로 **프로세스를 셋** 띄우면 바탕·종별 화소 지문이 한 갈래다.
 *   [3] 되돌림 시험 — 상자를 **결정적으로 14px 밀면** 지문이 실제로 달라진다.
 *       ([2] 가 «무엇을 해도 초록» 이 아님을 못박는다 — 자연 표류는 판마다 값이 달라
 *        되돌림의 재료로 못 쓴다. 그 자체가 플레이키이기 때문이다.)
 *   [4] 진단(판정 밖) — 못박기를 끈 채 두 판을 띄워 표류 자체를 눈으로 본다.
 *
 * ⚠ 자를 새로 만들지 않는다(402) — 화소를 재는 자는 `probe928` 한 곳이고 이 파일은 그 결과만 읽는다.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V856 = path.join(ROOT, 'tools', 'verify856.js');
const PROBE = path.join(ROOT, 'tools', 'probe928.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

function probe(args) {
  const txt = execFileSync(process.execPath, [PROBE, '--n', '1', '--json'].concat(args),
                           { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = txt.trim().split('\n').filter(l => l.startsWith('{')).pop();
  return JSON.parse(line);
}

/* 한 판의 «지문 묶음» — 바탕 + 종별 a0/a2 + 본체 화소 수. 판끼리 이 문자열을 견준다. */
const sig = (r) => {
  const it = r.iter[0];
  return [it.base].concat(r.ids.map(i => i + ':' + it.sp[i].a0 + '/' + it.sp[i].a2 + '/' + it.sp[i].nb)).join('|');
};

(async () => {
  console.log('VERIFY928 — verify856 측정 상자의 판 결정성\n');

  /* ── [1] 선언 ── */
  const src = fs.readFileSync(V856, 'utf8');
  const iPin = src.search(/player\.x\s*=\s*WORLD\.w\s*\/\s*2\s*;\s*player\.y\s*=\s*WORLD\.h\s*\/\s*2\s*;/);
  const iCX = src.search(/const\s+CX\s*=\s*Math\.round\(player\.x\s*\+\s*ox/);
  ok(iPin >= 0, '[1a] `verify856` 이 플레이어를 못박는다 — `player.x = WORLD.w/2` ' +
                (iPin >= 0 ? '있음' : '**없음**(928 이 되돌아갔다)'));
  ok(iCX >= 0 && iPin >= 0 && iPin < iCX,
     '[1b] 못박기가 측정 상자(CX)를 재기 **전**에 온다 — 못박기 ' + iPin + ' < CX ' + iCX);
  /* 좌표를 손으로 적으면 그것이 곧 사본이다(402) — 제품이 집을 옮기면 자도 같이 옮겨야 한다. */
  ok(!/player\.x\s*=\s*\d{2,}\s*[;,]/.test(src),
     '[1c] 자리를 **손 상수로** 적지 않았다 — 제품의 집(`WORLD.w/2` · `spawnStage()` 와 같은 값)에서 판다');

  /* ── [2] 결정성 ── */
  const runs = [probe(['--pin']), probe(['--pin']), probe(['--pin'])];
  const sigs = runs.map(sig);
  const uniq = new Set(sigs);
  ok(runs.every(r => r.ids.length >= 4),
     '[2a] 표본이 실제로 잡혔다 — 종 ' + runs.map(r => r.ids.length).join('/') + ' (≥ 4)');
  ok(uniq.size === 1,
     '[2b] 프로세스 3판의 화소 지문이 한 갈래 — ' + uniq.size + '갈래(1 이라야 한다)' +
     (uniq.size === 1 ? ' · flask 본체화소 ' + runs[0].iter[0].sp.flask.nb : ''));
  const pxs = new Set(runs.map(r => r.diag.px));
  ok(pxs.size === 1 && runs[0].diag.px === runs[0].diag.px,
     '[2c] 못박은 자리가 판마다 같다 — player.x ' + Array.from(pxs).join(' / '));
  ok(runs[0].iter.length >= 1 && runs.every(r => r.diag.nspec === runs[0].diag.nspec),
     '[2d] 판마다 같은 종 수를 잰다 — ' + runs.map(r => r.diag.nspec).join('/'));

  /* ── [3] 되돌림 시험 ── */
  const sh = [probe(['--pin', '--shift', '14']), probe(['--pin', '--shift', '14'])];
  const shSig = sh.map(sig);
  ok(new Set(shSig).size === 1,
     '[3a] 민 자리도 판마다 같다 — ' + new Set(shSig).size + '갈래(밀기 자체는 결정적이라야 한다)');
  ok(shSig[0] !== sigs[0],
     '[3b] 상자를 14px 밀면 지문이 **달라진다** — 안 달라지면 [2] 는 «무엇을 해도 초록» 이다' +
     ' (flask 본체화소 ' + runs[0].iter[0].sp.flask.nb + ' → ' + sh[0].iter[0].sp.flask.nb + ')');
  ok(sh[0].diag.px === runs[0].diag.px + 14,
     '[3c] 민 거리가 그대로다 — ' + runs[0].diag.px + ' + 14 = ' + sh[0].diag.px);

  /* ── [4] 진단(판정 밖) — 못박기를 끄면 자리가 판마다 다르다 ── */
  const raw = [probe([]), probe([])];
  console.log('');
  console.log('  [진단] 못박기 없음 2판 — player.x ' + raw.map(r => r.diag.px).join(' / ') +
              ' · 측정중심 ' + raw.map(r => r.diag.CX + ',' + r.diag.CY).join(' / ') +
              (raw[0].diag.px === raw[1].diag.px ? '  (이번엔 우연히 같다)' : '  ⇒ 표류가 실재한다'));
  console.log('  [진단] 못박은 2판 — player.x ' + runs.slice(0, 2).map(r => r.diag.px).join(' / ') +
              ' · 측정중심 ' + runs.slice(0, 2).map(r => r.diag.CX + ',' + r.diag.CY).join(' / '));

  console.log('\nVERIFY928 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('VERIFY928 즉사: ' + (e && e.message || e)); process.exit(1); });
