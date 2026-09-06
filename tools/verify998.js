/* 작업 998 게이트 — `verify981` [D2] 가 **무엇을 재는가**
 *
 *   node tools/verify998.js
 *
 * ── 이 자가 서는 이유 ──────────────────────────────────────────────────
 * 995 가 792 [E1] 의 눈금을 «bbox 대각» 에서 **최대 변**(`bulk`)으로 옮겼는데, 같은 산수를
 * 베껴 두고 있던 자리가 하나 더 있었다: `verify981` [D2]. **그 자리는 빨갛지 않았다** —
 * 그래서 아무도 안 봤다. 초록의 이유가 «규격이 섰다» 가 아니라 **«대각이 정사각형 종을
 * +41.4% 부풀려 밴드를 넓게 보이게 한다»** 였다(같은 병 세 번째 자리 — 989 → 995 → 998).
 * ⇒ 판정은 «빨간가» 가 아니라 **«무엇을 재는가»** 로 한다. 이 자가 그 물음을 든다.
 *
 * 절:
 *   [A] 사실(재현) — 같은 17종·같은 판을 두 눈금으로 접으면 판정이 갈린다. 브라우저로 실측한다.
 *   [B] 선언 — 981 이 옛 눈금을 더는 판정에 안 쓰고, 되돌림 앵커·접는 법이 **한 벌**이다(402).
 *   [R] 되돌림 시험 — 새 [D2] 가 **무르지 않다**: 밴드 안에 있던 종이 밖으로 나가면 실제로 잡고,
 *       «내 처방이 아니라도 밖» 인 종은 안 잡는다. 부품(`bulk998`)을 합성 표로 굽는다(브라우저 없이).
 *
 * ⚠ 이 자는 **절대 밴드를 안 묻는다** — 밖 5종(shuri·stone·arrow·meteor·lance)은 792 [E1] 이
 *   배율표(`SHOT_SC`)로 닫을 몫이고(995 «다음 세션에게» 1), 여기서 두 번 물으면 981·998 이
 *   «남의 미완» 때문에 빨개진다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const B998 = require('./bulk998');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* 볼 자는 `tools/verify981.js` 다. ⚑ **인자로 다른 사본을 물릴 수 있다** — 그것이 이 자의
   되돌림 시험이다: 998 이전 꼴([D2] 가 `.own` 을 읽고 절대 밴드를 다시 묻던 판)로 되돌린 사본을
   물리면 [B1]~[B3] 가 실제로 빨개진다(`node tools/verify998.js <사본>`). */
const V981 = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'tools', 'verify981.js');
const TOL = 0.25;              /* 792 `BULK_TOL` · 981 과 같은 값 */

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  console.log('VERIFY998 — `verify981` [D2] 의 눈금과 묻는 문장');
  const v981 = fs.readFileSync(V981, 'utf8');

  /* ── [B] 선언 — 픽셀을 재기 전에 자에게 물어 둘 수 있는 것부터 ── */
  /* ⚠ **주석은 세지 않는다** — 옛 이름은 «무엇에서 무엇으로 옮겼는가» 를 적는 자리에 남아야 한다
     (이름을 지우면 다음 워커가 995 이전 기록을 이 파일과 못 잇는다). 세는 것은 **코드**뿐이다. */
  const code981 = v981.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(!/DIAG_TOL/.test(code981),
     '[B1] 981 **코드**에 `DIAG_TOL`(옛 이름)이 한 곳도 없다 — 995 가 792 에서 `BULK_TOL` 로 옮긴 이름 ' +
     '(이름이 눈금을 말해야 다음 워커가 «무엇을 재는 여유인가» 를 안 헷갈린다 · 주석의 내력은 남긴다)');

  const d2 = (v981.match(/\[D2\] 되감기 금지[\s\S]*?\)\);/) || [''])[0];
  ok(/bulk/.test(d2) && !/\.own/.test(d2),
     '[B2] [D2] **판정 줄**이 최대 변(`bulk`)을 읽고 대각(`.own`)을 안 읽는다 ' +
     '(옛 눈금은 그 아래 (기록) 줄에만 남는다 — 지우지 않고 나란히 찍는 것이 995 규약)');

  const bandUse = (v981.match(/B998\.band\(/g) || []).length;
  const newOutUse = (v981.match(/B998\.newOut\(/g) || []).length;
  ok(bandUse === 1 && newOutUse === 1,
     '[B3] 접는 법·견주는 법을 **부품에서 가져다 쓴다** — `B998.band` ' + bandUse + '곳 · ' +
     '`B998.newOut` ' + newOutUse + '곳 (자마다 다시 적으면 그것이 989·995·998 이 세 번 고친 그 사본이다 — 402)');

  const rvDecl = (v981.match(/const REVERTS = \[/g) || []).length;
  /* «되돌린 값» 쪽으로 센다 — 앵커 문자열 자신은 [R*-0] 의 실패 메시지에도 이름으로 적혀 있어야
     사본이 낡았을 때 무엇을 찾다 실패했는지 말할 수 있다(그 이름은 사본이 아니라 안내문이다). */
  const cnt = s => v981.split(s).length - 1;
  const dup = [['ringArcs(17 + 2*pad)'], ['M_RAK = 1.95'], ["'E_A = 0'"], ['OLD_ROCK)']]
                .filter(([s]) => cnt(s) !== 1).map(([s]) => s + '×' + cnt(s));
  ok(rvDecl === 1 && dup.length === 0,
     '[B4] 되돌림 앵커가 **한 벌**이다 — `REVERTS` 선언 ' + rvDecl + '곳 · 두 벌로 적힌 앵커 ' +
     dup.length + '개' + (dup.length ? ' (' + dup.join(' · ') + ')' : '') +
     ' ([D2] 가 그 판을 다 굽기 때문에 두 벌로 적으면 «자기 자신을 견주는» 사본이 하나 더 생긴다 — 997)');

  ok(/negs\.length === REVERTS\.length/.test(v981),
     '[B5] [D2] 가 **표의 판을 다 구웠는지**를 자기 판정에 넣는다 — 한 판이라도 못 구우면 빨강 ' +
     '(사본이 적을수록 «전부에서 안» 이 헐거워진다: 0판이면 이 항은 아무것도 안 묻는 빈 물음이다)');

  /* ── [R] 되돌림 시험 — 부품을 합성 표로 굽는다(브라우저 없이 · 값은 제품 실측 꼴 그대로) ──
     ⚑ 이 절이 «무르게 푼 수리가 아니다» 를 못박는다(334). 새 [D2] 는 절대 밴드를 안 묻으므로
       그냥 두면 «아무것도 안 잡는 항» 일 수 있다 — 그렇지 않다는 것을 여기서 굽는다. */
  {
    const mk = o => { const r = {}; for (const k of Object.keys(o)) r[k] = { bulk: o[k] }; return r; };
    /* 중앙값 112 · 밴드 84~140 이 되도록 다섯 종을 세운다(제품 실측 중앙값과 같은 수). */
    const base = { a: 90, b: 100, c: 112, d: 120, e: 130 };
    const cur0 = B998.band(mk(base), TOL, 'bulk');
    ok(cur0.m === 112 && cur0.out.length === 0,
       '[R0] 합성 기준판 — 중앙값 ' + cur0.m + ' · 밴드 ' + cur0.lo + '~' + cur0.hi + ' · 밖 0종');

    /* ⓐ 내 처방이 «안에 있던 종»(e)을 밖으로 냈다 — 되돌림 판 전부에서 e 는 안이었다. */
    const negs = [base, base, base, base].map(o => B998.band(mk(o), TOL, 'bulk'));
    const curA = B998.band(mk(Object.assign({}, base, { e: 170 })), TOL, 'bulk');
    const outA = B998.newOut(curA, negs);
    ok(outA.length === 1 && outA[0] === 'e',
       '[R1] 되돌림 시험 — 밴드 **안에 있던 종을 밖으로 내면 실제로 잡는다**: 새로 밖 [' +
       outA.join('·') + '] (e 130 → 170 · 밴드 ' + curA.lo + '~' + curA.hi + ')');

    /* ⓑ 되돌림 판에서도 이미 밖이던 종(e)은 안 잡는다 — 그것은 내 처방의 몫이 아니다.
       ⚑ 이것이 실화다: `meteor` 는 `cvx` 판에서만 안(140)이고 나머지 세 판에서 밖(155)이다. */
    const negsB = [base, base, base, Object.assign({}, base, { e: 170 })]
                    .map(o => B998.band(mk(o), TOL, 'bulk'));
    const outB = B998.newOut(curA, negsB);
    ok(outB.length === 0,
       '[R2] 반대쪽 — **한 판에서라도 밖**이던 종은 안 잡는다: 새로 밖 ' + outB.length + '종 ' +
       '(안 그러면 이 자는 792 가 배율표로 닫을 [E1] 절대 밴드를 대신 지키게 된다 — 982 [C1] 의 그 자리)');

    /* ⓒ 되돌림 판이 하나도 없으면 아무것도 «잡을 수 없다» — [B5] 가 그것을 판정으로 막는다. */
    ok(B998.newOut(curA, []).length === 0,
       '[R3] 되돌림 판 0개면 판정이 **빈 물음**이 된다(새로 밖 0종) — 그래서 [D2] 가 판 수를 같이 묻는다([B5])');
  }

  /* ── [A] 사실(재현) — 같은 판을 두 눈금으로 접으면 판정이 갈린다 ── */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    const { measure } = require('./verify792');
    const r = await measure(browser, 'file://' + SRC);
    if (!r.out || r.out.__err || !r.out.rows) {
      ok(false, '[A] 측정 블록 예외 — ' + ((r.out && r.out.__err) || '결과 없음'));
    } else {
      const rows = r.out.rows;
      const bk = B998.band(rows, TOL, 'bulk');
      const dg = B998.band(rows, TOL, 'own');
      ok(bk.ids.length === 17 && dg.out.length === 0 && bk.out.length >= 1,
         '[A1] 재현 — **같은 17종·같은 판**인데 옛 눈금(대각)으로는 밖 ' + dg.out.length + '종(초록), ' +
         '최대 변으로는 밖 ' + bk.out.length + '종 [' + bk.out.join('·') + ']. ' +
         '[D2] 의 초록은 규격이 아니라 **눈금이 만든 것**이었다');

      /* 왜 갈리는가 — 대각 = 최대변 × √(1+(최소변/최대변)²) 이라 가산분이 종횡비에 통째로 달렸다. */
      const gains = bk.ids.map(i => ({ i, g: rows[i].own / rows[i].bulk }));
      gains.sort((a, b) => b.g - a.g);
      const top = gains[0], bot = gains[gains.length - 1];
      ok(top.g > 1.40 && bot.g < 1.05,
         '[A2] 그 차의 뿌리는 **종횡비**다 — 가산분 최대 ' + top.i + ' ×' + top.g.toFixed(3) +
         '(정사각 = √2) · 최소 ' + bot.i + ' ×' + bot.g.toFixed(3) + '(가느다란 조각). ' +
         '대각은 정사각형 종만 골라 부풀려 **눈이 보는 스프레드를 그 자리에서 눌러 준다**');

      ok(bk.sp > dg.sp,
         '[A3] 스프레드도 같은 말을 한다 — 대각 ' + dg.sp + '배 ↔ 최대 변 ' + bk.sp +
         '배 (대각이 더 고르게 보인다 = 그만큼 덜 잡는다)');
      console.log('       (기록) 최대 변 — ' + bk.ids.map(i => i + ':' + rows[i].bulk).join(' · '));
      console.log('       (기록) 밴드 — 최대 변 ' + bk.lo + '~' + bk.hi + '(중앙값 ' + bk.m + ') · ' +
                  '대각 ' + dg.lo + '~' + dg.hi + '(중앙값 ' + dg.m + ')');
    }
  } finally { await browser.close(); }

  console.log('\nVERIFY998 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('VERIFY998 오류 — ' + e.message); process.exit(1); });
