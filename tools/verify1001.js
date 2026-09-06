/* 작업 1001 게이트 — 792 [E1] 덩치 밴드를 «접는 산수» 의 네 번째 사본(`verify982` [C1])
 *
 *   node tools/verify1001.js            (브라우저 없이 도는 절 + [R3] 만 995 를 한 판 돌린다)
 *   node tools/verify1001.js --no-r3    ([R3] 생략 — 995 가 브라우저를 켜므로 스윕에서 느릴 때)
 *
 * ── 무엇이 결손이었나 ────────────────────────────────────────────────────
 * 792 [E1] 은 «투사체 덩치가 한 밴드 안인가» 를 묻는다. 그 밴드를 **접는 법**(중앙값 ±25%)과
 * **견주는 법**(되돌림 판과 대 봐서 «내 처방이 안에 있던 종을 밖으로 냈는가»)이 자마다 인라인으로
 * 다시 적혀 있었고, 원본이 눈금을 갈 때마다 사본만 뒤처져 **«792 가 버린 자» 를 지켰다**:
 *
 *   989 — 눈금이 «본체» → «본체 + 종이 제 손으로 깐 반투명 부품» 으로 바뀌었다
 *   995 — 눈금이 «대각» → «최대 변»(`bulk`)으로 바뀌었다 (대각은 정사각형 종을 +41.4% 부풀려
 *          밴드를 인위적으로 좁힌다 — 같은 17종이 대각으로는 밖 0종, 최대 변으로는 밖 5종)
 *   998 — 그 산수를 부품 `tools/bulk998.js` 한 벌로 빼고 `verify981` [D2] 를 갈아 끼웠다
 *   1001 — **남아 있던 마지막 사본이 `verify982` [C1]** 이다. 지금은 값이 안 틀렸지만(995 가
 *          이 자리를 `bulk` 로 이관해 뒀다) 결손은 «값» 이 아니라 **«자리»** 다 — 792 가 눈금을
 *          또 갈면 982 만 옛 눈금을 지킨다. 세 번 겪은 그 자리를 네 번째로 겪지 않으려고 지운다.
 *
 * ⇒ 이 자가 지키는 것은 **«접는 법이 한 벌인가»** 하나다. 픽셀도 문턱도 안 만든다 —
 *   재는 자는 `verify792.measure` 하나, 접는 자는 `tools/bulk998.js` 하나다(402 «사본을 지운다»).
 *
 * 절:
 *   [B] 선언 — 982 [C1] 이 부품을 쓰고, 부품이 실제로 그 열쇠로 접는가. 995 [B4] 가 **옮긴 물음**을
 *              묻는가. ⚠ `verify995` 의 인라인 접기는 **사본이 아니다**(아래 [B5]).
 *   [C] 인구조사 — 이 축을 인라인으로 접는 자가 «허용 목록» 과 **정확히 같은가**(늘면 빨강).
 *   [R] 되돌림 시험 — 982 를 1001 이전 꼴로 되돌린 사본에서 [B1]·[C1] 이 **실제로** 빨개지고,
 *              995 [B4] 도 그 사본을 물리면 빨개진다(334 — 무르게 푼 수리가 아님을 못박는다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const V982 = path.join(TOOLS, 'verify982.js');
const V995 = path.join(TOOLS, 'verify995.js');
const B998 = path.join(TOOLS, 'bulk998.js');
const SELF = path.basename(__filename);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 주석은 세지 않는다 — 옛 이름·옛 산수는 «무엇에서 무엇으로 옮겼는가» 를 적는 자리에 남아야 한다
   (998 [B1] 과 같은 규약). 세는 것은 **코드**뿐이다. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* 이 축을 «인라인으로 접는» 서명 — 중앙값 밴드의 아래 끝을 제 손으로 적는 자리. */
const FOLD = /\(\s*1\s*-\s*(BULK_TOL|DIAG_TOL|tol)\s*\)/;

/* ── 되돌림 앵커 — 1001 이전(998 이전과 같은 꼴)의 인라인 [C1] ──
   ⚠ 앵커가 안 맞으면 «되돌림을 못 구웠다» 로 **빨강**이다(998 [B4] 교훈 — 사본이 낡으면
     무엇을 찾다 실패했는지 말할 수 있어야 한다). 아래 문자열은 사본이 아니라 **안내문**이다. */
const NEW_ANCHOR = `      const B998 = require('./bulk998');
      const bulkBand = (rs) => B998.band(rs, BULK_TOL, 'bulk');
      if (negOk) {
        const cur = bulkBand(out.rows);
        const nb = bulkBand(neg.out.rows);`;
const OLD_INLINE = `      const bulkBand = (rs) => {
        const g = rs.map(r => r.bulk).sort((a, b) => a - b);
        const m = g[Math.floor((g.length - 1) / 2)];
        return { m, out: rs.filter(r => r.bulk < m * (1 - BULK_TOL) || r.bulk > m * (1 + BULK_TOL))
                           .map(r => r.i || r.sh),
                 sp: +(g[g.length - 1] / Math.max(1, g[0])).toFixed(2) };
      };
      if (negOk) {
        const cur = bulkBand(rows);
        const nRows = Object.keys(neg.out.rows).map(i => Object.assign({ i }, neg.out.rows[i]));
        const nb = bulkBand(nRows);`;

/* 허용 목록 — 이 축을 인라인으로 접어도 되는 자와 **그 이유**.
   ⚠ 이유 없이 늘리지 마라. 늘리는 순간 989 → 995 → 998 → 1001 이 네 번 고친 그 사본이 다섯 번째다. */
const ALLOW = {
  'verify792.js': '원본 — [E1] 판정(`bulkBand(\'bulk\')`)과 [E1n] «네 접는 법» 표를 여기서 만든다',
  'verify995.js': '나란히 견줌 — 그 자의 물음이 «네 접는 법을 나란히 대 보는 것» 이라 부품으로 묶으면 물음을 잃는다',
  'verify981.js': '(기록) 한 줄 — 판정은 부품(`B998.band`)이 하고, 옛 눈금(대각)은 기록으로만 찍는다(998 규약)',
  'verify989.js': '다른 축 · 옛 이름 `DIAG_TOL` — 989 자신의 «상자» 축이다(그 자의 [R2] 빨강은 1003 으로 등재)',
  'bulk998.js':   '부품 그 자신 — 여기 한 벌만 있으라고 뺀 자리다',
};

(async () => {
  console.log('=== VERIFY 1001 — 덩치 밴드를 접는 산수의 네 번째 사본 ===\n');

  const s982 = fs.readFileSync(V982, 'utf8');
  const s995 = fs.readFileSync(V995, 'utf8');
  const sB998 = fs.readFileSync(B998, 'utf8');
  const c982 = code(s982);

  /* ── [B] 선언 ── */
  const bandUse = (c982.match(/B998\.band\(/g) || []).length;
  const newOutUse = (c982.match(/B998\.newOut\(/g) || []).length;
  const inline982 = FOLD.test(c982);
  ok(bandUse === 1 && newOutUse === 1 && !inline982,
     '[B1] 982 [C1] 이 **부품에서 가져다 쓴다** — `B998.band` ' + bandUse + '곳 · `B998.newOut` ' +
     newOutUse + '곳 · 인라인 접기 ' + (inline982 ? '남아 있다' : '0곳') +
     ' (자마다 다시 적으면 그것이 989·995·998 이 세 번 고친 그 사본이다 — 402)');

  const bandCall = (c982.match(/B998\.band\([^)]*\)/) || [''])[0];
  const c1Judge = code((s982.match(/\[C1\] 대가[\s\S]*?\)\);/) || [''])[0]);
  ok(/'bulk'/.test(bandCall) && !/\.own|\.diag/.test(c1Judge),
     '[B2] [C1] 이 **최대 변**(`bulk`)으로 접고 옛 눈금(`.own`/`.diag`)을 판정에 안 읽는다 · ' +
     '실측 `' + bandCall + '` (995 가 고른 눈금 — 대각은 정사각형 종을 +41.4% 부풀려 밴드를 좁힌다)');

  ok(/const k = key \|\| 'bulk';/.test(sB998) && /rows\[i\]\[k\]\s*<\s*lo/.test(sB998) &&
     /negs\.every\(n => n\.out\.indexOf\(i\) < 0\)/.test(sB998),
     '[B3] 부품이 **실제로** 접고 견준다 — `band` 가 받은 열쇠로 밴드를 만들고, `newOut` 이 ' +
     '«되돌림 판 **전부**에서 안» 이던 종만 센다 (이름만 부르는 껍데기면 [B1] 이 헛초록이 된다)');

  /* 995 가 «982 를 어떻게 묻는가» — 옛 인라인 앵커(소스에 `r\.bulk < m` 꼴로 적혀 있었다)를
     그대로 물으면 998 이 산수를 부품으로 뺀 순간 이 항이 «남의 정리» 때문에 빨개진다(333). */
  ok(s995.indexOf('B998.band(') >= 0 && s995.indexOf('r\\.bulk < m') < 0,
     '[B4] 995 [B4] 가 **옮긴 물음**을 묻는다 — 옛 인라인 앵커가 아니라 `B998.band(…, \'bulk\')` 를 ' +
     '묻는다 (묻는 것은 그대로 «982 도 같은 눈금을 읽는가» 이고 자리만 옮겼다 — 333)');

  ok(FOLD.test(code(s995)) && /\[E1n\]|네 접는 법|접는 법 —/.test(s995),
     '[B5] ⚠ **995 의 인라인 접기는 사본이 아니다 — 그대로 남아 있다.** 그 자의 일이 «최대변·대각· ' +
     '기하평균·잉크√ 를 **나란히** 견주는 것» 이라 부품 하나로 묶으면 그 물음 자체를 잃는다');

  /* ── [C] 인구조사 ── */
  const files = fs.readdirSync(TOOLS).filter(f => f.endsWith('.js') && f !== SELF);
  const found = files.filter(f => FOLD.test(code(fs.readFileSync(path.join(TOOLS, f), 'utf8')))).sort();
  const want = Object.keys(ALLOW).sort();
  const extra = found.filter(f => want.indexOf(f) < 0);
  const gone = want.filter(f => found.indexOf(f) < 0);
  ok(extra.length === 0 && gone.length === 0,
     '[C1] 인구조사 — 이 축을 **인라인으로 접는 자**가 허용 목록과 같다 · 실측 ' + found.length + '자 [' +
     found.join(' · ') + ']' + (extra.length ? ' · ⚠ 목록에 없는 자 ' + extra.join(' · ') : '') +
     (gone.length ? ' · ⚠ 사라진 자 ' + gone.join(' · ') : '') +
     ' (⚠ 이 자 자신은 뺀다 — 아래 [R] 이 옛 산수를 **문자열로** 들고 있고 그것은 안내문이다)');
  for (const f of want) console.log('       (기록) ' + f + ' — ' + ALLOW[f]);

  /* ── [R] 되돌림 시험 ── */
  const hasNew = s982.indexOf(NEW_ANCHOR) >= 0;
  ok(hasNew, '[R0] 되돌림 앵커가 982 에 있다 (없으면 아래 [R1]~[R3] 은 «아무것도 안 되돌린» 빈 시험이다)');

  const negSrc = hasNew ? s982.replace(NEW_ANCHOR, OLD_INLINE)
                               .replace(/const newOut = B998\.newOut\(cur, \[nb\]\);/,
                                        'const newOut = cur.out.filter(i => nb.out.indexOf(i) < 0);') : '';
  const cNeg = code(negSrc);
  ok(hasNew && FOLD.test(cNeg) && (cNeg.match(/B998\.band\(/g) || []).length === 0,
     '[R1] 되돌림 — 1001 이전 꼴로 되돌린 사본에서 [B1] 이 **빨개진다**: 인라인 접기 ' +
     (FOLD.test(cNeg) ? '남는다' : '없다') + ' · `B998.band` ' +
     (cNeg.match(/B998\.band\(/g) || []).length + '곳 (판정이 부품을 안 거친다)');

  ok(hasNew && ['verify982.js'].concat(want).sort().join(',') ===
       found.concat(FOLD.test(cNeg) ? ['verify982.js'] : []).sort().join(','),
     '[R2] 되돌림 — 그 사본을 트리에 두면 [C1] 인구조사가 ' + found.length + '자 → ' +
     (found.length + 1) + '자로 **늘어난다** (사본이 하나 더 생겼다는 것을 이 자가 말한다)');

  if (process.argv.indexOf('--no-r3') >= 0) {
    console.log('  --   [R3] 생략(--no-r3) — 995 를 한 판 돌리는 절이다');
  } else if (!hasNew) {
    ok(false, '[R3] 앵커가 없어 못 돌렸다');
  } else {
    const negF = path.join(ROOT, '.v1001-neg-982-' + process.pid + '.js');
    fs.writeFileSync(negF, negSrc, 'utf8');
    let outTxt = '', codeN = 0;
    try {
      outTxt = execFileSync('node', [V995, negF], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { codeN = e.status || 1; outTxt = (e.stdout || '') + (e.stderr || ''); }
    finally { try { fs.unlinkSync(negF); } catch (_) {} }
    const b4Fail = /FAIL\s+\[B4\]/.test(outTxt);
    ok(b4Fail && codeN !== 0,
       '[R3] 되돌림 — **995 에게 그 사본을 직접 물렸다**: 995 [B4] 가 빨개진다 (실측 ' +
       (b4Fail ? 'FAIL [B4]' : '[B4] 초록 — 물음이 아무것도 안 잡는다') + ' · 종료 코드 ' + codeN +
       ') ⇒ 옮긴 물음이 헐거워지지 않았다');
  }

  console.log('\nVERIFY1001 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('VERIFY1001 예외 — ' + (e && e.stack || e)); process.exit(1); });
