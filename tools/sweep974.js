/* 작업 974 — «읽기 ↔ 찍기» 순서 전수 조사 (등재문 ⓐ)
 *
 * `probe974` §1 이 센 모집단(rect + screenshot + 화소 해독)을 **실제로 굴려서**, 자마다
 * «찍기 전에 건네준 rect 가 찍는 순간 다른 값이었는가» 를 센다. 세는 것은 `tools/geo974.js`
 * 감사자이고 이 자는 그것을 **모집단 전체에** 돌려 장부로 모을 뿐이다.
 *
 * 왜 정적으로 안 세나: 이 자들은 `geo()`·`shot()` 을 위에 정의해 두고 아래에서 부른다 —
 * **소스의 줄 순서는 호출 순서가 아니다.** 순서는 굴려야 보인다.
 *
 * 읽는 법(921 규약): «낡은 읽기 0» 은 «안전하다» 가 아니라 **«이 판에서는 안 걸렸다»** 다.
 * 걸린 자는 확실히 병이 있다(양성이 곧 증거).
 *
 * 실행: node tools/sweep974.js [--timeout 240] [--only probe814d.js,verify840.js]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep974-'));
const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const TIMEOUT = (parseInt(argOf('--timeout', '240'), 10) || 240) * 1000;
const ONLY = (argOf('--only', '') || '').split(',').filter(Boolean);

function population() {
  const dir = path.join(ROOT, 'tools');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'sweep974.js' && f !== 'probe974.js')
    .filter((f) => {
      let s = ''; try { s = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (_) { return false; }
      return /getBoundingClientRect/.test(s) && /screenshot/.test(s) && /pngjs|PNG\.sync|png913/.test(s);
    });
}

const list = ONLY.length ? ONLY : population();
console.log('=== sweep974 — «읽기 ↔ 찍기» 순서 전수 조사 · 모집단 ' + list.length + '자 ===\n');

const rows = [];
for (const f of list) {
  const out = path.join(TMP, f.replace(/\.js$/, '') + '.json');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join('tools', f)], {
    cwd: ROOT, timeout: TIMEOUT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, { PW_GEO974: out }),
  });
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  let j = null;
  try { j = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (_) {}
  const dead = r.error ? (r.error.code === 'ETIMEDOUT' ? '시간초과' : String(r.error.code || r.error.message)) : null;
  const row = { f, sec: +sec, code: r.status, dead,
                shots: j ? j.shots : null, reads: j ? j.reads : null,
                stale: j ? j.stale : null, young: j ? (j.young | 0) : null,
                detached: j ? j.detached : null,
                worst: j && j.worst ? j.worst : null, sample: (j && j.sample) || [] };
  rows.push(row);
  const mark = dead ? '⏱' : (row.young === null ? '·' : (row.young ? '⚑' : '✓'));
  console.log('  ' + mark + ' ' + f.padEnd(18) + ' ' + String(sec).padStart(3) + 's'
    + ' · 코드 ' + String(r.status === null ? '—' : r.status).padStart(2)
    + ' · 찍기 ' + String(row.shots === null ? '—' : row.shots).padStart(3)
    + ' · 읽기 ' + String(row.reads === null ? '—' : row.reads).padStart(5)
    + ' · **창 ' + String(row.young === null ? '—' : row.young).padStart(3) + '**'
    + ' (배경 ' + String(row.stale === null ? '—' : row.stale).padStart(4) + ')'
    + (row.worst ? '  최악 Δ' + row.worst.d.toFixed(1) + 'px ' + String(row.worst.tag).slice(0, 42) : '')
    + (dead ? '  (' + dead + ')' : ''));
}

const ran = rows.filter((r) => r.young !== null);
const hit = ran.filter((r) => r.young > 0);
console.log('\n[요약] 굴린 ' + rows.length + '자 · 감사 붙은 ' + ran.length + '자 · **창 나이 낡은 읽기가 잡힌 ' + hit.length + '자**');
if (hit.length) {
  console.log('  ⚑ ' + hit.map((r) => r.f + '(' + r.young + '건)').join(' · '));
  for (const r of hit) {
    console.log('\n  — ' + r.f + ' 표본');
    for (const s of r.sample.slice(0, 6))
      console.log('      Δ' + s.d.toFixed(2) + 'px  ' + s.before.slice(0, 2).map((v) => v.toFixed(1)).join('×')
        + ' → ' + s.after.slice(0, 2).map((v) => v.toFixed(1)).join('×')
        + '  나이 ' + String(s.age) + 'ms  ' + String(s.tag).slice(0, 66));
  }
}
const dead = rows.filter((r) => r.dead);
if (dead.length) console.log('\n  ⏱ 못 돌린 자 ' + dead.length + '자 — ' + dead.map((r) => r.f + '(' + r.dead + ')').join(' · '));
const silent = rows.filter((r) => !r.dead && r.stale === null);
if (silent.length) console.log('  · 감사가 안 붙은 자 ' + silent.length + '자(브라우저를 안 띄우거나 pwlaunch 를 안 쓴다) — '
  + silent.map((r) => r.f).join(' · '));

fs.writeFileSync(path.join(ROOT, 'docs', 'review', '974-순서조사.json'), JSON.stringify(rows, null, 1));
console.log('\n장부 → docs/review/974-순서조사.json');
