#!/usr/bin/env node
/* rep303 — «부하가 걸린 러너» 를 재현해 verify107 [I]ⓒ 의 간헐 FAIL 을 **결정적으로** 낸다 (작업 303)
 *
 * 등재문(303)의 실측은 게이트 45개 일괄 재실행 중에 나왔다 — 즉 **러너가 붐빌 때만** 빨갛다.
 * 바깥에서 CPU 를 태우는 것으로는 재현되지 않는다(Chromium 의 rAF 는 자기 합성 스레드가 몬다).
 * 실제로 길어져야 하는 것은 **rAF 프레임 간격(dt)** 이라, `neg236` 과 같은 방법으로
 * `index.html` 사본에 «rAF 를 잡아먹는 바쁜 루프» 한 개를 심고 그 사본에 게이트를 댄다
 * (`V107_SRC` — 살아 있는 페이지에 주입하면 거짓 초록이 난다: LESSONS 191 · 96·219).
 *
 * 왜 dt 가 판정을 뒤집는가 — 95 `dsFling` 의 마지막 한 걸음은 `sp*dt` 이고 종료 조건이
 * «감쇠 후 |sp| < DS_VMIN(0.02)» 이라 걸음 크기가 dt 에 정비례한다:
 *     dt 16.7ms → 0.02/0.95      × 16.7 = 0.35px  → 정수 반올림 0 → 옛 기준점도 초록
 *     dt 34ms   → 0.02/0.95^2.04 × 34   = 0.76px  → 정수 반올림 1 → 옛 기준점은 빨강
 * 옛 [I] 는 기준을 «dsGlide 가 1 로 적힌 마지막 프레임» 에 뒀는데, 그 프레임은 제품이
 * 마지막 걸음을 밟기 **직전** 이라 그 1px 이 «멎은 뒤 움직였다» 로 잡혔다.
 *
 * 실행:
 *   node tools/rep303.js                     현재 트리의 verify107 을 부하 사본에 대고 N회
 *   REP303_GATE=tools/.v107old.js …          다른 게이트 파일로(고치기 전 사본과 나란히 비교)
 *   REP303_N=3  REP303_MS=8                  반복 횟수 · 부하가 한 프레임에서 잡아먹는 ms
 * 마지막 줄이 `REP303 GREEN n/n` 이어야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(ROOT, `.v303-load-${process.pid}.html`);
const GATE = path.resolve(ROOT, process.env.REP303_GATE || 'tools/verify107.js');
const N = +(process.env.REP303_N || 3);
const MS = +(process.env.REP303_MS || 8);

const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* rAF 를 실제로 잡아먹는 부하 — 프레임 간격을 25 → 34ms(dsFling 의 dt 상한)로 밀어 올린다 */
const LOAD = '<script>(function(){var s=function(){var t=performance.now();' +
             'while(performance.now()-t<' + MS + '){}requestAnimationFrame(s);};' +
             'requestAnimationFrame(s);})();</script>\n</body>';
if (SRC.split('</body>').length - 1 !== 1) { console.error('</body> 가 1곳이 아니다 — 심을 자리를 못 찾았다'); process.exit(1); }
fs.writeFileSync(TMP, SRC.replace('</body>', LOAD));

let green = 0;
for (let i = 1; i <= N; i++) {
  let out;
  try {
    out = execFileSync('node', [GATE], { cwd: ROOT, encoding: 'utf8',
      env: Object.assign({}, process.env, { V107_SRC: TMP, V107_FAST: '1' }) });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const I = out.split('\n').filter(l => /\[I\]/.test(l)).map(l => l.trim());
  const bad = I.filter(l => l.startsWith('✗'));
  console.log('=== run ' + i + ' (' + path.relative(ROOT, GATE) + ' · 부하 ' + MS + 'ms/frame)');
  I.forEach(l => console.log('  ' + l));
  if (!bad.length) green++;
}
console.log('\nREP303 ' + (green === N ? 'GREEN' : 'RED') + ' ' + green + '/' + N + ' — ' + path.relative(ROOT, GATE));
try { fs.unlinkSync(TMP); } catch (_) {}
process.exit(green === N ? 0 : 1);
