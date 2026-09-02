'use strict';
/* ==========================================================================
   verify841 — «죽은 보상 축을 아직 함수로 부르는 자» 방지 자   (작업 841, 2026-09-02)
   --------------------------------------------------------------------------
   무엇이 깨져 있었나
     799(«22 반복 퀘스트 → 업적 퀘스트»)가 `QUESTS[]` 의 보상을 **단계 함수 `rw(s)`** 에서
     **정액 `dia` + 등차 `step`** 으로 갈았다. 제품·제품 게이트(verify799·verify156·verify322)는
     그때 같이 이관됐는데 **`tools/probe498.js` §4 한 줄만 남았다**:
       `QUESTS.reduce((n, q) => n + (q.rw(s).c || 0), 0)`  ⇒ `TypeError: q.rw is not a function`
     712 가 세운 위생 항 `[4-0]` 이 그 즉사를 «한 항의 빨강» 으로 적어 줬지만(조용한 초록은
     아니었다), 그 대가로 §4 의 표 전체(출처별 수급 줄 + [4-a]·[4-b])가 통째로 사라지고
     부모 자 `verify712` 가 [C6]~[C10] 다섯 항 빨강 = 31/36 FAIL 이었다.
     ⚑ 338 규칙 대조 — 199 25회차 변경 전 트리에서도 **같은 6/7 · 같은 예외**였다(그 회차 몫이 아니다).

   무엇을 고쳤나 (제품 `index.html` 0줄 — 고친 것은 `tools/probe498.js` §4 한 자리다)
     333 처방대로 **자리를 비우지 않았다.** 799 이후 이 축의 하루 수급을 정하는 것은
     «몇 번 받았는가» 가 아니라 **하루 플레이량**이므로(801 이 그 다섯을 «플레이 한 단위의
     단가» 로 재정박했다), 칸값 대신 ① 단가 `dia/step` ② 한 바퀴 정액 합 ③ «칸 번호를 옮겨도
     한 칸치가 같은가»(제품 함수 `questRw`·`questSteps` 로 잰다)를 읽는다.
     ③ 이 새 항 `[4-c]` 다 — 축이 옛 «칸값 = c0 + s·d» 로 되돌아가면 여기서 갈린다.

   절
     [A] 정적 — 죽은 축을 안 부르고 살아 있는 축을 읽는다 + **전수 스윕**(도구 전체)
     [B] 실행 — probe498 이 PASS 로 끝나고 §4 의 줄들이 실제로 stdout 에 있다(«자리를 비우지 마라»)
     [C] 되돌림 ① — 죽은 축을 도로 심은 **자 사본**은 [4-0] 빨강 + FAIL 로 끝난다
     [D] 되돌림 ② — 보상이 **칸 번호에 비례**하도록 되돌린 **제품 사본**에서 [4-c] 가 빨개진다
         (즉사가 아니라 «값이 갈렸다» 로 잡히는지까지 본다 — [4-0] 은 그 사본에서도 초록이다)
     ⚠ 제품 쪽 계약(`QUESTS[]` 에 `rw` 키가 없다)은 `verify799` [A] 가 이미 지킨다 — 여기서 겹쳐 적지 않는다.

   ⚠ 임시 사본은 전부 `.v841-*-<pid>.*`(648 — 고정 이름 사본은 병렬 실행에서 서로를 지운다).
   ⚠ 이 파일 자신이 스윕에 걸리지 않도록 죽은 축의 이름은 **런타임에 조립**한다(696 함정 —
     폐지를 지키는 자가 그 이름을 적어야 해서 스스로 빨개지는 자리).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOLS = __dirname;
const ROOT = path.resolve(__dirname, '..');
const P498 = path.join(TOOLS, 'probe498.js');
const p498 = fs.readFileSync(P498, 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* 죽은 축의 이름 — 리터럴로 적으면 [A5] 스윕이 이 파일을 문다 */
const DEAD = 'q.' + 'rw(';
const DEADRE = new RegExp('q\\.' + 'rw\\s*\\(');

const R = [];
const yes = (n, got, d) => R.push({ n: n + (d !== undefined && d !== '' ? ' — ' + d : ''), pass: got === true, got: String(got) });
const eq = (n, got, want) => R.push({ n, pass: String(got) === String(want), got: String(got) + ' (기대 ' + want + ')' });

/* 주석을 걷어낸 본문 — 주석에 이름을 적는 것은 «이관 기록» 이라 잡으면 안 된다 */
const nude = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*$/gm, ' ');

const tmps = [];
function tmp(name, body) {
  const p = path.join(name.endsWith('.html') ? ROOT : TOOLS, '.v841-' + name.replace(/\./g, '-') + '-' + process.pid + (name.endsWith('.html') ? '.html' : '.js'));
  fs.writeFileSync(p, body);
  tmps.push(p);
  return p;
}
function run(file) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [file],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

(async () => {

/* ── [A] 정적 ───────────────────────────────────────────────────── */
console.log('[A] 정적 — 죽은 축을 안 부르고 살아 있는 축을 읽는다');
const bareP = nude(p498);
yes('[A1] probe498 이 죽은 보상 축(`' + DEAD + '`)을 주석 밖에서 더는 안 부른다',
    !DEADRE.test(bareP));
yes('[A2] probe498 §4 가 799 축을 읽는다 (`q.dia` · `q.step`)',
    /q\.dia/.test(bareP) && /q\.step/.test(bareP));
yes('[A3] probe498 §4 가 «한 칸치» 를 **제품 함수**로 잰다 (`questRw` · `questSteps` — 표를 손으로 안 옮긴다)',
    /questRw\s*\(/.test(bareP) && /questSteps\s*\(/.test(bareP));
yes('[A4] probe498 에 위생 항 `[4-0]` 과 새 항 `[4-c]` 가 둘 다 있다 (278·319·712 처방)',
    /\[4-0\]/.test(p498) && /\[4-c\]/.test(p498));
/* 표본을 되돌린다 — 이 줄이 없으면 §4 가 §5 의 상태를 오염시킨다 */
yes('[A5] probe498 §4 가 `S.quest` 를 재고 나서 **되돌린다**',
    /q22Snap/.test(bareP) && (bareP.match(/q22Snap/g) || []).length >= 2);
/* 전수 스윕 — 334 규약(같은 부패가 한 자리뿐인지 직접 센다) */
const tools = fs.readdirSync(TOOLS).filter(f => f.endsWith('.js'));
const hits = tools.filter(f => {
  const t = nude(fs.readFileSync(path.join(TOOLS, f), 'utf8'));
  return DEADRE.test(t) && /QUESTS/.test(t);
});
eq('[A6] 전수 스윕 — 도구 ' + tools.length + '개 중 죽은 축을 부르는 자', hits.join(' ') || 0, 0);
/* 음성항 — 스윕이 정말 무는지(스윕 자신의 되돌림) */
const sweepBad = tmp('sweep', 'const QUESTS=[];\nconst x = ' + DEAD + '0).c;\n');
yes('[A7] 그 스윕은 실제로 문다 — 죽은 축을 심은 사본을 같은 자로 재면 1건',
    DEADRE.test(nude(fs.readFileSync(sweepBad, 'utf8'))));

/* ── [B] 실행 ───────────────────────────────────────────────────── */
console.log('\n[B] 실행 — §4 가 돌고, 사라졌던 줄들이 stdout 에 있다');
const rp = run(P498);
eq('[B1] probe498 종료 코드', rp.code, 0);
yes('[B2] probe498 PASS', /PROBE498 \d+\/\d+ PASS/.test(rp.out), (rp.out.match(/PROBE498 \S+ \S+/) || [''])[0]);
yes('[B3] §4 위생 항이 초록 (`✅ [4-0]`)', /✅ \[4-0\]/.test(rp.out));
yes('[B4] §4 의 세 항이 전부 찍힌다 ([4-a]·[4-b]·[4-c])',
    /\[4-a\]/.test(rp.out) && /\[4-b\]/.test(rp.out) && /\[4-c\]/.test(rp.out));
yes('[B5] `[4-c]` 가 초록이다 — 한 칸치가 칸 번호와 무관한 정액', /✅ \[4-c\]/.test(rp.out));
yes('[B6] 자리를 비우지 않았다 — 단가 줄과 한 바퀴 줄이 표에 있다',
    /업적 퀘스트 —/.test(rp.out) && /단가/.test(rp.out) && /한 바퀴/.test(rp.out));
yes('[B7] 출처별 표가 되살아났다 (오프라인 줄 = 712 가 지키던 자리)', /오프라인/.test(rp.out));
yes('[B8] evaluate 예외 줄이 없다', !/⚠ evaluate 예외/.test(rp.out));

/* ── [C] 되돌림 ① — 죽은 축을 도로 심은 «자 사본» ───────────────── */
console.log('\n[C] 되돌림 ① — 죽은 축을 도로 심은 자 사본은 빨갛게 끝난다');
const bad1 = p498.replace(/const q22Per = QUESTS\.map\([^\n]*\n/,
  'const q22Per = QUESTS.map(q => ({ id: q.id, dia: ' + DEAD + '0).c, step: q.step, per: 0 }));\n');
yes('[C1] 자 사본을 실제로 심었다', bad1 !== p498 && DEADRE.test(nude(bad1)));
const rc = run(tmp('p498dead', bad1));
yes('[C2] 그 사본의 §4 가 즉사하고 «한 항의 빨강» 으로 적힌다 (`❌ [4-0]`)',
    /❌ \[4-0\]/.test(rc.out) && /⚠ evaluate 예외/.test(rc.out));
yes('[C3] 그 사본은 FAIL 로 끝난다 (수리 전 자리 = 6/7 FAIL)',
    /PROBE498 \d+\/\d+ FAIL/.test(rc.out), (rc.out.match(/PROBE498 \S+ \S+/) || [''])[0]);
eq('[C4] 종료 코드 1', rc.code, 1);

/* ── [D] 되돌림 ② — 보상이 칸 번호에 비례하는 «제품 사본» ────────── */
console.log('\n[D] 되돌림 ② — 보상을 «칸 번호 비례» 로 되돌린 제품 사본에서 [4-c] 가 빨개진다');
const OLDRW = 'const questRw    = q => q.dia * Math.max(1, questSteps(q));';
const NEWRW = 'const questRw    = q => q.dia * (S.quest[q.id].s + 1) * Math.max(1, questSteps(q));';
yes('[D1] 제품에서 살아 있는 보상식을 찾았다', HTML.indexOf(OLDRW) >= 0);
const badHtml = tmp('bad.html', HTML.replace(OLDRW, NEWRW));
const bad2 = p498.replace("path.resolve(__dirname, '..', 'index.html')",
                          JSON.stringify(badHtml));
yes('[D2] 그 사본을 겨눈 자 사본을 심었다', bad2 !== p498 && bad2.indexOf(badHtml) >= 0);
const rd = run(tmp('p498prod', bad2));
yes('[D3] 그 사본에서 `[4-c]` 가 **빨갛다** — 이 항이 헛되지 않다는 증거',
    /❌ \[4-c\]/.test(rd.out), (rd.out.match(/\[4-c\][^\n]*/) || [''])[0].slice(0, 110));
yes('[D4] 그런데 `[4-0]` 은 여전히 초록이다 — 즉사가 아니라 «값이 갈렸다» 로 잡힌다',
    /✅ \[4-0\]/.test(rd.out));
yes('[D5] 자가 FAIL 로 끝난다', /PROBE498 \d+\/\d+ FAIL/.test(rd.out), (rd.out.match(/PROBE498 \S+ \S+/) || [''])[0]);
eq('[D6] 종료 코드 1', rd.code, 1);

/* ── 결과 ───────────────────────────────────────────────────────── */
tmps.forEach(p => { try { fs.unlinkSync(p); } catch (e) {} });
let pass = 0;
R.forEach(r => { if (r.pass) pass++; console.log((r.pass ? '  ✅ ' : '  ❌ ') + r.n + (r.pass ? '' : '  → ' + r.got)); });
console.log('\nVERIFY841 ' + pass + '/' + R.length + (pass === R.length ? ' PASS' : ' FAIL'));
process.exit(pass === R.length ? 0 : 1);

})().catch(e => { tmps.forEach(p => { try { fs.unlinkSync(p); } catch (x) {} }); console.error(e); process.exit(1); });
