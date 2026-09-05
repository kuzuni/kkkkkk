/* 대조기 931 — «장치 없는 세상»(전) 과 «사슬을 지난 세상»(후) 의 판정을 나란히 놓는다
 *
 *   node tools/diff931.js docs/review/931/before-ACD.json docs/review/931/after-ACD.json
 *
 * 무엇을 묻나 — 자 하나의 «판정» 은 ① 종료 코드 ② 마지막 판정 줄 둘이다(`run931` 머리말).
 *   그 둘의 **집합**을 전후로 비교해 셋으로 가른다:
 *
 *     같음      전후의 판정 집합이 같다 — 사슬이 이 자의 세상을 안 바꿨다
 *     흔들림    한쪽이라도 회차 사이에서 갈린다 — **전에도 갈렸으면 사슬 탓이 아니다**(925-①)
 *     바뀜      양쪽 다 결정적인데 값이 다르다 — 이것만이 사슬에 물을 것이다
 *
 * ⚑ 925-① 이 실측으로 남긴 함정이 정확히 여기다 — «전 0 / 후 1» 은 **1회씩 잰 것이 만든 유령**이었고
 *   5회씩 재니 전후 둘 다 2/5 빨강이었다. 그래서 이 자는 «전이 이미 흔들렸는가» 를 **먼저** 묻는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const load = p => JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));

/* 옛 판(1회차 앞부분)은 `verdict` 없이 `tail` 만 갖고 있다 — 거기서 뽑는다.
   `tail` 은 마지막 세 줄을 ' | ' 로 이은 것이라 판정 줄이 그 안에 있다. */
function verdictOf(r) {
  if (r.verdict) return r.verdict;
  const parts = String(r.tail || '').split(' | ').map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) if (/\b(PASS|FAIL)\b/.test(parts[i])) return parts[i].slice(0, 90);
  return '(판정 줄 없음)';
}
const sig = rs => [...new Set(rs.map(r => String(r.code) + ' :: ' + verdictOf(r)))].sort();

const A = load(process.argv[2]);
const B = load(process.argv[3]);

/* 뒤 판이 앞 판을 덮어쓴다 — verify59 처럼 따로 다시 잰 자를 얹을 수 있게 */
for (let i = 4; i < process.argv.length; i += 2) {
  if (!process.argv[i + 1]) break;
  const a2 = load(process.argv[i]), b2 = load(process.argv[i + 1]);
  Object.assign(A.all, a2.all); Object.assign(B.all, b2.all);
  A.files = [...new Set(A.files.concat(a2.files))];
}

const files = A.files.filter(f => B.all[f]);
const same = [], shakyBefore = [], changed = [], missing = [];
for (const f of A.files) {
  if (!B.all[f] || !A.all[f]) { missing.push(f); continue; }
  const a = sig(A.all[f]), b = sig(B.all[f]);
  const detA = a.length === 1, detB = b.length === 1;
  if (a.join('|') === b.join('|')) same.push({ f, a, det: detA });
  else if (!detA || !detB) shakyBefore.push({ f, a, b, detA, detB });
  else changed.push({ f, a, b });
}

const show = (t, rows, fmt) => {
  console.log('\n' + t + ' — ' + rows.length + '자');
  for (const r of rows) console.log('  ' + fmt(r));
};

console.log('대조 931 — 전 ' + process.argv[2] + '  ↔  후 ' + process.argv[3]);
console.log('  전 ' + A.runs + '회 (par ' + A.par + ') · 후 ' + B.runs + '회 (par ' + B.par + ') · 자 ' + files.length);

show('[같음] 사슬이 세상을 안 바꿨다', same,
  r => r.f.padEnd(16) + (r.det ? '결정적  ' : '둘 다 같게 갈림  ') + r.a[0].slice(0, 62));
show('[흔들림] 한쪽이라도 회차 사이에서 갈린다 — 전에도 갈렸으면 사슬 탓이 아니다(925-①)', shakyBefore,
  r => r.f.padEnd(16) + '전 ' + r.a.length + '갈래' + (r.detA ? '(결정적)' : '') +
       ' / 후 ' + r.b.length + '갈래' + (r.detB ? '(결정적)' : '') + '\n' +
       '                  전: ' + r.a.join('\n                      ') + '\n' +
       '                  후: ' + r.b.join('\n                      '));
show('[바뀜] ★ 양쪽 다 결정적인데 값이 다르다 — 사슬에 물을 것은 이것뿐이다', changed,
  r => r.f.padEnd(16) + '\n                  전: ' + r.a[0] + '\n                  후: ' + r.b[0]);
if (missing.length) show('[없음] 한쪽에만 있는 자', missing.map(f => ({ f })), r => r.f);

console.log('\n  같음 ' + same.length + ' · 흔들림 ' + shakyBefore.length + ' · **바뀜 ' + changed.length + '** · 없음 ' + missing.length);
process.exit(changed.length ? 1 : 0);
